---
name: doc-adr-write
description: 'Architecture Decision Record guidance. Use ONLY for: "doc-adr-write: <title>", "adr: <title>", or "architecture decision: <title>".'
---

# ADR Write

## Rules (BLOCKER)

- Exactly ONE decision per ADR.
- Use only facts from the user and available project context.
- Record missing decisions as open questions instead of inventing them.
- Change ADR documentation only; do not change code.
- Do not run shell commands.
- Write ADRs to `docs/adrs/`.
- Follow the project's existing ADR scheme: name files `<number>-<kebab-case-title>.md` with the next available zero-padded number and head each ADR with `# ADR-<number>: <Title>`.
- If the project has no established ADR scheme, ask the user before creating one.

## Template

Use an unambiguous ADR template found in the project. Otherwise use [TEMPLATE.md](TEMPLATE.md). Missing sections = "None".
