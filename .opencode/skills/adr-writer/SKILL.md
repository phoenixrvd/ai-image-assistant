---
name: adr-writer
description: 'Creates Architecture Decision Records. Use when the user says "doc-adr-writer: <title>", "adr: <title>", or "architecture decision: <title>".'
---

## Rules (BLOCKER)

- Exactly ONE decision per ADR.
- No decision means open question.
- Do not invent facts.
- No code changes.
- Do not run shell commands.

## Template

Use [TEMPLATE.md](TEMPLATE.md). Otherwise: context, decision, consequences, open questions; missing sections = "None".
