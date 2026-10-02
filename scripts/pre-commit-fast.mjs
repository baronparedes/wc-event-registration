#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync } from 'fs';

function getChangedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    });
    const unstaged = execSync('git diff --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    });
    const untracked = execSync('git ls-files --others --exclude-standard', {
      encoding: 'utf8',
    });

    const allFiles = new Set(
      [...staged.split('\n'), ...unstaged.split('\n'), ...untracked.split('\n')]
        .map((f) => f.trim())
        .filter((f) => Boolean(f) && existsSync(f)),
    );

    return Array.from(allFiles);
  } catch {
    return [];
  }
}

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log('ℹ️  No staged or changed files to check.');
  process.exit(0);
}

console.log(
  `🚀 Running fast pre-commit checks on ${changedFiles.length} staged/changed file(s)...\n`,
);

const formattableExtensions = /\.(ts|tsx|js|jsx|mjs|json|css|md|sql)$/;
const targetFormattable = changedFiles.filter((f) => formattableExtensions.test(f));

const lintableExtensions = /\.(ts|tsx|js|jsx|mjs)$/;
const targetLintable = changedFiles.filter(
  (f) => lintableExtensions.test(f) && !f.startsWith('supabase/functions/'),
);

const targetReactFiles = changedFiles.filter((f) => f.startsWith('src/') && /\.(ts|tsx)$/.test(f));

const targetEdgeFiles = changedFiles.filter((f) => f.startsWith('supabase/functions/'));

function runTask(label, cmd) {
  process.stdout.write(`⏳ ${label}... `);
  const startTime = Date.now();

  try {
    execSync(cmd, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r✅ ${label} (${duration}s)\n`);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r❌ ${label} failed (${duration}s)\n\n`);

    if (error.stdout) {
      console.error(error.stdout.toString().trim());
    }
    if (error.stderr) {
      console.error(error.stderr.toString().trim());
    }

    process.exit(error.status || 1);
  }
}

// 1. Prettier check on changed files
if (targetFormattable.length > 0) {
  const fileArgs = targetFormattable.map((f) => JSON.stringify(f)).join(' ');
  runTask('Formatting (changed files)', `npx prettier --check ${fileArgs}`);
}

// 2. ESLint on changed files
if (targetLintable.length > 0) {
  const fileArgs = targetLintable.map((f) => JSON.stringify(f)).join(' ');
  runTask('Linting (changed files)', `npx eslint ${fileArgs}`);
}

// 3. TypeScript project check and production build
runTask('TypeScript & Vite build', 'npm run build:agent');

// 4. Run related Vitest tests for modified React/TS files
if (targetReactFiles.length > 0) {
  const fileArgs = targetReactFiles.map((f) => JSON.stringify(f)).join(' ');
  runTask('Related Vitest Tests', `npx vitest related ${fileArgs} --run --reporter=agent`);
}

// 5. Run Edge Functions check if any edge function files changed
if (targetEdgeFiles.length > 0) {
  runTask(
    'Edge Functions check & test',
    'cd supabase/functions && deno lint && deno check --config deno.json **/*.ts && deno test -A',
  );
}

console.log('\n🎉 Fast pre-commit checks passed!\n');
