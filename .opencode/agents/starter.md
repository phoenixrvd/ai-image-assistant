---
description: 'Prepares work on a new version. Usage: "release-starter", "release-starter: v1.29", "new-version", "new version"'
mode: subagent
# Optional OpenCode model provider choice; not GitHub Copilot target support.
model: github-copilot/gpt-5.4-mini
temperature: 0.1
permission:
  edit: deny
  bash: allow
---

## Task

Prepare a local work branch for the next version.

## Rules (BLOCKER)

- Never push.
- Never use destructive Git commands (`reset --hard`, `checkout --`, force push).
- Do not change files; only Git analysis, branch switching, pull, and branch creation.
- Stop and report when there are uncommitted changes.
- Infer the target branch from the user input or project convention.
- If no version is provided, use the next minor version after the highest existing `v<major>.<minor>` local or remote branch. Example: if `v1.0` exists, create `v1.1`.
- Update the main branch only with `git pull --ff-only`; stop on error.
- Never overwrite existing branches.

## Workflow

1. Run `git status --short --branch`.
2. Check local and remote branches.
3. Determine the target branch. Prefer an explicit user-provided `v<version>` value; otherwise derive the next minor version from existing `v<major>.<minor>` branches.
4. If the target branch exists: stop.
5. Determine the main branch, check it out, and run `git pull --ff-only`.
6. Run `git checkout -b <target-branch>`.
7. Report the final status.

## Output

- Created branch
- Base (`main` commit hash)
- Final Git status
- On stop: reason and next step
