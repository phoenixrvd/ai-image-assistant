# Release Commit Format

```text
v<version>: <concise release summary>

<short section title>

- <release note item>
- <release note item>
```

## Rules

- The subject must summarize the release outcome, not only repeat the version.
- The body must contain a short summary and grouped release notes when inferable.
- Include grouped release notes only when clearly inferable.
- Group notes by user-relevant themes such as workflow, docs, skills, CI, runtime, or UI.
- Use concise, action-oriented bullets in present tense.
- Do not insert blank lines between bullet items in the same list.
- If no meaningful release notes are inferable, stop and ask for the release summary instead of creating a vague commit body.

## Example

```text
v1.2: improve setup flow and release safeguards

Setup and workflow

- simplify initial configuration steps
- document the expected release checks

Safety and maintenance

- tighten release guardrails
- refresh supporting documentation
```
