#!/usr/bin/env node
import { execSync } from 'child_process';

const stripAnsi = (str) => (str ? str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') : '');

const steps = [
  {
    name: 'Formatting (prettier)',
    cmd: 'npm run format:check',
  },
  {
    name: 'Linting (eslint)',
    cmd: 'npm run lint',
  },
  {
    name: 'TypeScript & App Build',
    cmd: 'npm run build:agent',
  },
  {
    name: 'React Unit Tests & Coverage',
    cmd: 'npm run test:coverage -- --reporter=agent',
  },
  {
    name: 'Edge Functions (lint, check, test & coverage)',
    cmd: 'npm run ci:edge 2>&1',
  },
];

function runStep(index, total, step) {
  const label = `[${index + 1}/${total}] ${step.name}`;
  process.stdout.write(`⏳ ${label}... `);
  const startTime = Date.now();

  try {
    const output = execSync(step.cmd, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r✅ ${label} (${duration}s)\n`);

    // Print React coverage summary if present
    if (output && output.includes('Coverage summary')) {
      const match = output.match(/={3,}\s*Coverage summary\s*={3,}[\s\S]*?={3,}/);
      if (match) {
        console.log(`\n${match[0].trim()}\n`);
      }
    }

    // Print Edge Functions summary if present
    if (output && (output.includes('coverage-edge') || output.includes('All files'))) {
      const cleanOutput = stripAnsi(output);
      const lines = cleanOutput.split(/\r?\n/);
      const testResultLine = lines.find(
        (l) => l.includes('passed') && l.includes('failed') && l.includes('ok'),
      );
      const allFilesLine = lines.find((l) => l.trim().startsWith('| All files'));
      const headerLine = lines.find((l) => l.trim().startsWith('| File') && l.includes('Line %'));

      if (testResultLine || allFilesLine) {
        console.log('\n========================= Edge Functions Summary =========================');
        if (testResultLine) {
          console.log(`Tests:    ${testResultLine.trim()}`);
        }
        if (headerLine && allFilesLine) {
          console.log(`\n${headerLine.trim()}`);
          console.log(
            '| ---------------------------------------------------- | -------- | ---------- | ------ |',
          );
          console.log(`${allFilesLine.trim()}`);
        } else if (allFilesLine) {
          console.log(`Coverage: ${allFilesLine.trim()}`);
        }
        console.log('==========================================================================\n');
      }

      if (allFilesLine) {
        const parts = allFilesLine
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean);
        const branchPct = parseFloat(parts[1]);
        const linePct = parseFloat(parts[3]);
        const EDGE_THRESHOLD = 80.0;
        if (!Number.isNaN(branchPct) && !Number.isNaN(linePct)) {
          if (branchPct < EDGE_THRESHOLD || linePct < EDGE_THRESHOLD) {
            console.error(
              `❌ Edge Functions coverage is below ${EDGE_THRESHOLD}% threshold (Branch: ${branchPct}%, Line: ${linePct}%)\n`,
            );
            process.exit(1);
          }
        }
      }
    }
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

console.log('🚀 Running CI Gate Checks...\n');

steps.forEach((step, idx) => {
  runStep(idx, steps.length, step);
});

console.log('🎉 CI Gate passed successfully!\n');
