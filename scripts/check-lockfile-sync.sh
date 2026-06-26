#!/usr/bin/env bash

set -euo pipefail

PACKAGE_FILE="package.json"
LOCK_FILE="package-lock.json"

dependency_fields_changed() {
  node <<'NODE'
const { execSync } = require('node:child_process')

const trackedKeys = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'bundleDependencies',
  'bundledDependencies',
  'overrides',
]

function readJsonFromGit(spec) {
  try {
    const content = execSync(`git show ${spec}`, { encoding: 'utf8' })
    return JSON.parse(content)
  } catch {
    return null
  }
}

function stable(value) {
  return JSON.stringify(value ?? null)
}

const stagedPkg = readJsonFromGit(':package.json')
const headPkg = readJsonFromGit('HEAD:package.json')

if (!stagedPkg) {
  process.stdout.write('changed')
  process.exit(0)
}

const changed = trackedKeys.some((key) => stable(headPkg?.[key]) !== stable(stagedPkg?.[key]))
process.stdout.write(changed ? 'changed' : 'unchanged')
NODE
}

if git diff --cached --name-only -- "$PACKAGE_FILE" | grep -q "^$PACKAGE_FILE$"; then
  if ! git diff --cached --name-only -- "$LOCK_FILE" | grep -q "^$LOCK_FILE$"; then
    if [[ "$(dependency_fields_changed)" == "changed" ]]; then
      echo "Error: dependency fields in $PACKAGE_FILE changed, but $LOCK_FILE is not staged."
      echo "Run 'npm install' (or 'npm install --package-lock-only') and stage both files."
      exit 1
    fi
  fi
fi
