---
name: code-refactor
description: 'Refactoring guidance. Use ONLY for: "code-refactor:", "refactor:", "refactoring:", "revise:", "improve:"'
---

# Code Refactor

## Rules (BLOCKER)

- Preserve behavior and public interfaces.
- Do not add features or unnecessary abstractions.
- No constructors with keyword-only `*` pattern.
- No store or service passing through constructor parameters.
- Readability must not get worse.
- Follow project instructions and change only the requested scope.
- Choose the smallest readable change.
- If the result or impact is uncertain, stop and explain why.
- Do not run shell commands.

## Workflow

1. Read the relevant files and project instructions.
2. Apply the smallest safe refactor.
3. Review the changed content for behavior changes and scope creep.
4. Report changed files, static validation performed, and validation limitations.
