#!/usr/bin/env node
import { execSync } from 'child_process';

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    });
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  console.log('ℹ️  No staged files to check.');
  process.exit(0);
}

console.log(`🚀 Running fast pre-commit checks on ${stagedFiles.length} staged file(s)...\n`);

const formattableExtensions = /\.(ts|tsx|js|jsx|mjs|json|css|md|sql)$/;
const stagedFormattable = stagedFiles.filter((f) => formattableExtensions.test(f));

const lintableExtensions = /\.(ts|tsx|js|jsx|mjs)$/;
const stagedLintable = stagedFiles.filter(
  (f) => lintableExtensions.test(f) && !f.startsWith('supabase/functions/'),
);

const stagedReactFiles = stagedFiles.filter((f) => f.startsWith('src/') && /\.(ts|tsx)$/.test(f));

const stagedEdgeFiles = stagedFiles.filter((f) => f.startsWith('supabase/functions/'));

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

// 1. Prettier check on staged files
if (stagedFormattable.length > 0) {
  const fileArgs = stagedFormattable.map((f) => JSON.stringify(f)).join(' ');
  runTask('Formatting (staged files)', `npx prettier --check ${fileArgs}`);
}

// 2. ESLint on staged files
if (stagedLintable.length > 0) {
  const fileArgs = stagedLintable.map((f) => JSON.stringify(f)).join(' ');
  runTask('Linting (staged files)', `npx eslint ${fileArgs}`);
}

// 3. Fast TypeScript type-check across project
runTask('TypeScript typecheck', 'npx tsc --noEmit');

// 4. Run related Vitest tests for modified React/TS files
if (stagedReactFiles.length > 0) {
  const fileArgs = stagedReactFiles.map((f) => JSON.stringify(f)).join(' ');
  runTask('Related Vitest Tests', `npx vitest related ${fileArgs} --run --reporter=agent`);
}

// 5. Run Edge Functions check if any edge function files changed
if (stagedEdgeFiles.length > 0) {
  runTask(
    'Edge Functions check & test',
    'cd supabase/functions && deno lint && deno check --config deno.json **/*.ts && deno test -A',
  );
}

console.log('\n🎉 Fast pre-commit checks passed!\n');
