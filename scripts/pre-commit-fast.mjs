#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
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

function runTaskAsync(label, command, args) {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: 'true' },
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      resolve({ label, duration: ((Date.now() - startTime) / 1000).toFixed(1), error, stdout, stderr });
    });
    child.on('close', (status) => {
      resolve({
        label,
        duration: ((Date.now() - startTime) / 1000).toFixed(1),
        status: status ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

async function runTasksInParallel(tasks) {
  for (const { label } of tasks) {
    process.stdout.write(`⏳ ${label}... started\n`);
  }

  const results = await Promise.all(
    tasks.map(({ label, command, args }) => runTaskAsync(label, command, args)),
  );

  for (const result of results) {
    const failed = result.error || result.status !== 0;
    process.stdout.write(
      `${failed ? '❌' : '✅'} ${result.label}${failed ? ' failed' : ''} (${result.duration}s)\n`,
    );
    if (failed) {
      if (result.stdout?.trim()) console.error(result.stdout.trim());
      if (result.stderr?.trim()) console.error(result.stderr.trim());
      if (result.error) console.error(result.error.message);
    }
  }

  return results.every((result) => !result.error && result.status === 0);
}

// Run independent fast checks concurrently.
const parallelTasks = [];

// 1. Prettier check on changed files
if (targetFormattable.length > 0) {
  parallelTasks.push({
    label: 'Formatting (changed files)',
    command: 'npx',
    args: ['prettier', '--check', ...targetFormattable],
  });
}

// 2. ESLint on changed files
if (targetLintable.length > 0) {
  parallelTasks.push({
    label: 'Linting (changed files)',
    command: 'npx',
    args: ['eslint', ...targetLintable],
  });
}

// 3. TypeScript project check and production build
parallelTasks.push({
  label: 'TypeScript & Vite build',
  command: 'npm',
  args: ['run', 'build:agent'],
});

if (!(await runTasksInParallel(parallelTasks))) {
  process.exit(1);
}

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
