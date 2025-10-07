Safe history rewrite plan (purge secrets and dev artifacts)

Overview
- Goal: purge previously committed secrets and heavy dev artifacts from the full Git history while preserving current HEAD.
- Tools: git-filter-repo (preferred) or BFG Repo-Cleaner (fallback).
- This guide does NOT run any rewrite automatically; follow steps explicitly.

Prep
- Ensure you have a clean working tree and a backup:
  - `git fetch --all --tags`
  - `git status` should be clean
  - Optionally create a backup clone or branch

Install filter-repo
- macOS/Linux: `pipx install git-filter-repo` or `python3 -m pip install --user git-filter-repo`
- Verify: `git filter-repo --help`

Targets to purge
- Secrets/agents: `.code/`, `modelcontext.json`
- Dev artifacts/logs: `dev-logs/`, `apps/player/dev-dist/`, `apps/*/.vite/`
- Node modules (in case ever tracked): `**/node_modules/`
- Build outputs (in case ever tracked): `**/dist/`, `**/build/`, `**/.next/`

Command (git-filter-repo)
- From repo root:

```
git filter-repo \
  --invert-paths \
  --force \
  --path .code \
  --path modelcontext.json \
  --path dev-logs \
  --path apps/player/dev-dist \
  --path-glob "apps/*/.vite" \
  --path-glob "**/node_modules" \
  --path-glob "**/dist" \
  --path-glob "**/build" \
  --path-glob "**/.next"
```

Notes
- `--invert-paths` removes the listed paths from all history.
- If you need to remove specific files inside commits (e.g., leaked tokens), add more `--path` lines.

Post-rewrite steps
1) Verify locally:
   - `git log --stat -- .code modelcontext.json` should show no results
   - Build and run tests locally
2) Force push (this rewrites remote history):
   - `git push --force --tags origin master`
   - Notify collaborators to re-clone or `git fetch --all && git reset --hard origin/master`
3) In GitHub, invalidate cached archives (optional) and rotate any exposed secrets.

Fallback: BFG
- Install Java: then `brew install bfg` or download jar.
- Example:
  - `java -jar bfg.jar --delete-folders .code --delete-files modelcontext.json --no-blob-protection .`
  - `git reflog expire --expire=now --all && git gc --prune=now --aggressive`
  - Force push as above.

