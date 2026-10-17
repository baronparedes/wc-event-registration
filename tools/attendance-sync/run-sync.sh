#!/usr/bin/env bash
set -e

# Change to the directory of this script
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please install Node.js (v22 or higher) from https://nodejs.org"
    exit 1
fi

echo "Starting Word Community Attendance Sync..."
node cli.js "$@"
