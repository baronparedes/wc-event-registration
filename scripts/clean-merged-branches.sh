#!/usr/bin/env bash

# Clean up merged local git branches (including squash-merged and gone upstream branches)
# Usage: ./scripts/clean-merged-branches.sh [options]
#   -n, --dry-run     Preview branches to be deleted without deleting
#   -y, --force       Delete branches without interactive confirmation
#   -f, --fetch       Run 'git fetch --prune' before evaluating branches
#   -b, --base <name> Base branch to evaluate against (default: main or master)
#   -h, --help        Show this help message

set -euo pipefail

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

DRY_RUN=false
FORCE=false
DO_FETCH=false
BASE_BRANCH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -y|--force)
      FORCE=true
      shift
      ;;
    -f|--fetch)
      DO_FETCH=true
      shift
      ;;
    -b|--base)
      if [[ -n "${2:-}" ]]; then
        BASE_BRANCH="$2"
        shift 2
      else
        echo -e "${RED}Error: --base requires a branch name argument.${NC}" >&2
        exit 1
      fi
      ;;
    -h|--help)
      echo "Usage: $(basename "$0") [options]"
      echo ""
      echo "Options:"
      echo "  -n, --dry-run     Preview branches to be deleted without actually deleting"
      echo "  -y, --force       Delete candidate branches without interactive prompt"
      echo "  -f, --fetch       Run 'git fetch --prune' first to update remote tracking branches"
      echo "  -b, --base <name> Specify base branch (default: auto-detected main or master)"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}" >&2
      echo "Run with --help for available options." >&2
      exit 1
      ;;
  esac
done

# Ensure we are in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${RED}Error: Not inside a git repository.${NC}" >&2
  exit 1
fi

# Determine default base branch if not provided
if [[ -z "$BASE_BRANCH" ]]; then
  if git show-ref --verify --quiet refs/heads/main; then
    BASE_BRANCH="main"
  elif git show-ref --verify --quiet refs/heads/master; then
    BASE_BRANCH="master"
  else
    # Fallback to remote HEAD or current branch
    DEFAULT_REMOTE_HEAD=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || true)
    if [[ -n "$DEFAULT_REMOTE_HEAD" ]]; then
      BASE_BRANCH="$DEFAULT_REMOTE_HEAD"
    else
      BASE_BRANCH=$(git branch --show-current)
    fi
  fi
fi

# Validate base branch exists locally
if ! git show-ref --verify --quiet "refs/heads/$BASE_BRANCH"; then
  echo -e "${RED}Error: Base branch '$BASE_BRANCH' does not exist locally.${NC}" >&2
  exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)

# Optional fetch and prune
if [[ "$DO_FETCH" = true ]]; then
  echo -e "${CYAN}Fetching and pruning remote tracking branches...${NC}"
  git fetch --prune || echo -e "${YELLOW}Warning: git fetch failed (offline or remote unreachable). Continuing with local state...${NC}"
fi

echo -e "${BOLD}Target base branch:${NC} ${CYAN}$BASE_BRANCH${NC}"
echo -e "${BOLD}Current active branch:${NC} ${CYAN}$CURRENT_BRANCH${NC}"
echo ""

# Protected branch names (never delete these)
PROTECTED_BRANCHES=("$BASE_BRANCH" "$CURRENT_BRANCH" "main" "master" "develop" "dev")

is_protected() {
  local target="$1"
  for protected in "${PROTECTED_BRANCHES[@]}"; do
    if [[ "$target" == "$protected" ]]; then
      return 0
    fi
  done
  return 1
}

# Candidate branches and reasons
declare -a CANDIDATE_BRANCHES=()
declare -a CANDIDATE_REASONS=()

echo -e "${CYAN}Scanning local branches...${NC}"

# 1. Check all local branches
ALL_LOCAL_BRANCHES=$(git for-each-ref --format='%(refname:short)' refs/heads/)

for branch in $ALL_LOCAL_BRANCHES; do
  if is_protected "$branch"; then
    continue
  fi

  REASON=""

  # A. Check standard git merge
  if git merge-base --is-ancestor "$branch" "$BASE_BRANCH" 2>/dev/null; then
    REASON="merged"
  fi

  # B. Check if squash-merged into BASE_BRANCH
  if [[ -z "$REASON" ]]; then
    MERGE_BASE=$(git merge-base "$BASE_BRANCH" "$branch" 2>/dev/null || true)
    if [[ -n "$MERGE_BASE" ]]; then
      TREE=$(git rev-parse "$branch^{tree}" 2>/dev/null || true)
      if [[ -n "$TREE" ]]; then
        DANGLING_COMMIT=$(git commit-tree "$TREE" -p "$MERGE_BASE" -m "temp_squash_check" 2>/dev/null || true)
        if [[ -n "$DANGLING_COMMIT" ]]; then
          CHERRY_RESULT=$(git cherry "$BASE_BRANCH" "$DANGLING_COMMIT" 2>/dev/null || true)
          if [[ "$CHERRY_RESULT" == -* ]]; then
            REASON="squashed"
          fi
        fi
      fi
    fi
  fi

  # C. Check if remote tracking branch is [gone]
  if [[ -z "$REASON" ]]; then
    UPSTREAM_TRACK=$(git for-each-ref --format='%(upstream:track)' "refs/heads/$branch" 2>/dev/null || true)
    if [[ "$UPSTREAM_TRACK" == "[gone]" ]]; then
      REASON="gone"
    fi
  fi

  if [[ -n "$REASON" ]]; then
    CANDIDATE_BRANCHES+=("$branch")
    CANDIDATE_REASONS+=("$REASON")
  fi
done

TOTAL_CANDIDATES=${#CANDIDATE_BRANCHES[@]}

if [[ $TOTAL_CANDIDATES -eq 0 ]]; then
  echo -e "${GREEN}No merged or obsolete local branches found. Local repository is clean!${NC}"
  exit 0
fi

echo -e "${BOLD}Found $TOTAL_CANDIDATES branch(es) eligible for deletion:${NC}"
echo ""

for i in "${!CANDIDATE_BRANCHES[@]}"; do
  branch="${CANDIDATE_BRANCHES[$i]}"
  reason="${CANDIDATE_REASONS[$i]}"
  case "$reason" in
    merged)
      LABEL="${GREEN}[merged]  ${NC}"
      ;;
    squashed)
      LABEL="${CYAN}[squashed]${NC}"
      ;;
    gone)
      LABEL="${YELLOW}[gone]    ${NC}"
      ;;
    *)
      LABEL="[unknown] "
      ;;
  esac
  echo -e "  $LABEL $branch"
done

echo ""

if [[ "$DRY_RUN" = true ]]; then
  echo -e "${YELLOW}Dry-run mode enabled. No branches were deleted.${NC}"
  exit 0
fi

# Confirmation prompt if not forced
if [[ "$FORCE" = false ]]; then
  # If running in interactive tty, read from /dev/tty; otherwise read standard input
  if [[ -t 0 ]]; then
    read -r -p "Do you want to delete these $TOTAL_CANDIDATES branch(es)? [y/N] " CONFIRMATION || CONFIRMATION="n"
  elif [[ -e /dev/tty ]]; then
    read -r -p "Do you want to delete these $TOTAL_CANDIDATES branch(es)? [y/N] " CONFIRMATION < /dev/tty || CONFIRMATION="n"
  else
    echo -e "${RED}Error: Standard input is not a TTY. Use --force to proceed in non-interactive environments.${NC}" >&2
    exit 1
  fi

  if [[ ! "$CONFIRMATION" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operation aborted. No branches were deleted.${NC}"
    exit 0
  fi
fi

echo ""
echo -e "${BOLD}Deleting branches...${NC}"
DELETED_COUNT=0
FAILED_COUNT=0

for i in "${!CANDIDATE_BRANCHES[@]}"; do
  branch="${CANDIDATE_BRANCHES[$i]}"
  reason="${CANDIDATE_REASONS[$i]}"

  # Use git branch -D for squashed or gone branches, -d for standard merged
  DELETE_FLAG="-d"
  if [[ "$reason" == "squashed" || "$reason" == "gone" ]]; then
    DELETE_FLAG="-D"
  fi

  if git branch "$DELETE_FLAG" "$branch" >/dev/null 2>&1; then
    echo -e "  ${GREEN}Deleted${NC} $branch"
    ((DELETED_COUNT++)) || true
  else
    # Fallback to force delete if -d failed
    if git branch -D "$branch" >/dev/null 2>&1; then
      echo -e "  ${GREEN}Force deleted${NC} $branch"
      ((DELETED_COUNT++)) || true
    else
      echo -e "  ${RED}Failed to delete${NC} $branch"
      ((FAILED_COUNT++)) || true
    fi
  fi
done

echo ""
if [[ $FAILED_COUNT -eq 0 ]]; then
  echo -e "${GREEN}Successfully deleted $DELETED_COUNT branch(es).${NC}"
else
  echo -e "${YELLOW}Deleted $DELETED_COUNT branch(es), $FAILED_COUNT failed.${NC}"
fi
