---
state: accepted
---

# ADR-012: Localization and Language Settings

## Status

accepted

## Context

The application has user-facing text in UI components and services. It must support German and English, detect the browser language on first launch, and allow a persistent manual choice without a backend.

## Decision

- Use `i18next` with `react-i18next` as the localization standard.
- Bundle German and English resources with the application instead of loading remote locale files.
- Initialize i18n before the first React render.
- Resolve language in this order: valid persisted app option, first supported browser language, English fallback.
- Store the language as the `language` key in the existing Dexie `appOptions` store; no schema migration is required.
- Keep the active language in the i18n singleton and expose it to React through `react-i18next`.
- Keep user data and provider/model identifiers unchanged during language changes.

## Rationale

- A bundled client-side solution remains compatible with offline operation and static GitHub Pages deployment.
- `i18next` provides established React integration, interpolation, and a shared translation API for UI and services.
- The generic app-options store already persists global preferences without altering the IndexedDB schema.

## Alternatives

### Alternative 1

- Implement a custom React context and translation lookup.
- Rejected because pluralization, interpolation, and service access would require application-specific infrastructure.

### Alternative 2

- Load translation resources from a server at runtime.
- Rejected because the application has no backend and language resources must be available offline.

## Consequences

- positive: The application remains fully offline-capable and compatible with static GitHub Pages deployment.
- positive: UI components and services use shared translation keys instead of hardcoded app-owned text.
- positive: The existing generic app-options store persists the new setting without a schema migration.
- negative: Every new app-owned UI string requires entries in both language resources.
- negative: Static HTML and manifest metadata remain build-time values; only runtime `<html lang>` changes with the selected language.
- open: Localized manifest metadata can be considered separately if installation metadata must follow the active language.

## Assumptions

- Browser language APIs are available in supported browsers.
- English remains the product fallback language for unsupported locales.

## Open Questions

- None

## References

- AIIA-004: Frontend-only Provider and Model Configuration
- AIIA-005: PWA Versioning and Build Stability
- AIIA-007: Localization and Language Settings
