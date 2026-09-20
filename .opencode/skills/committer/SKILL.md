---
name: committer
description: 'Creates local Git commits. Use when the user says "release-committer:", "commit:", "create commit", or "commit changes".'
---

## Task

Create local Git commits when explicitly requested.

## Rules

- Never push.
- Never edit files.
- Never use destructive Git commands.
- Never commit secrets.
- Commit messages must be English.
- Use: `<type>: <description>`
- Allowed types: `feature`, `fix`, `refactor`, `add`
- Split unrelated changes into separate commits.
- Create multiple commits when changes have different purposes.

## Workflow

1. Inspect Git status and diffs.
2. Stop if there are no changes.
3. Group changes by purpose.
4. For each group:
   - stage only relevant files
   - create one commit
5. Report commit subjects, hashes, and remaining Git status.
