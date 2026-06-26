#!/usr/bin/env bash

set -euo pipefail

PACKAGE_FILE="package.json"
LOCK_FILE="package-lock.json"

if git diff --cached --name-only -- "$PACKAGE_FILE" | grep -q "^$PACKAGE_FILE$"; then
  if ! git diff --cached --name-only -- "$LOCK_FILE" | grep -q "^$LOCK_FILE$"; then
    echo "Error: $PACKAGE_FILE is staged but $LOCK_FILE is not staged."
    echo "Run 'npm install' (or 'npm install --package-lock-only') and stage both files."
    exit 1
  fi
fi
