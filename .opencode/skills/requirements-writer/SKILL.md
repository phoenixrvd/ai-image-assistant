---
name: requirements-writer
description: 'Creates or updates requirements. Use when the user says "doc-requirements-writer: <topic>", "requirements: <topic>", or "requirement: <topic>".'
---

## Rules (BLOCKER)

- Do not invent facts; use only the input.
- Requirements describe WHAT, not HOW.
- Each requirement covers exactly one fact.
- No duplicates and no partial repetition.
- One source equals one truth.
- Write all text in English.
- Use only these requirement states: `draft`, `defined`, `implemented`, `removed`, `rejected`.
- Do not run shell commands.

## Template

Use [TEMPLATE.md](TEMPLATE.md) and preserve its structure strictly; missing sections = "None".
