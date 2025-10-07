#!/usr/bin/env bash
set -euo pipefail

echo "== Bingo Repo History Purge (dry-run by default) =="

if ! command -v git &>/dev/null; then
  echo "git not found" >&2; exit 1
fi

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "Run from inside the repo" >&2; exit 1
fi

if ! command -v git &>/dev/null; then
  echo "git not found" >&2; exit 1
fi

if ! git filter-repo --help &>/dev/null; then
  echo "git-filter-repo not installed. Install with:"
  echo "  pipx install git-filter-repo" 
  echo "  # or: python3 -m pip install --user git-filter-repo"
  exit 1
fi

DRY_RUN=${DRY_RUN:-1}

echo "Dry-run mode: $DRY_RUN (set DRY_RUN=0 to execute)"

CMD=(git filter-repo --invert-paths --force \
  --path .code \
  --path modelcontext.json \
  --path dev-logs \
  --path apps/player/dev-dist \
  --path-glob "apps/*/.vite" \
  --path-glob "**/node_modules" \
  --path-glob "**/dist" \
  --path-glob "**/build" \
  --path-glob "**/.next")

echo "Planned command:" 
printf ' %q' "${CMD[@]}"; echo

if [[ "$DRY_RUN" == "0" ]]; then
  "${CMD[@]}"
  echo "Rewrite complete. Review results, then force push:"
  echo "  git push --force --tags origin master"
else
  echo "Dry-run complete. Export DRY_RUN=0 to run the rewrite."
fi

