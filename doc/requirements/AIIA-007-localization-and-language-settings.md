---
state: implemented
---

# AIIA-007: Localization and Language Settings

## Context

The application is a static, frontend-only PWA and currently supports German and English users. Interface language must be selected without a backend, while locally stored user content remains unchanged.

## Assumptions

- Browser language information is available through `navigator.languages` or `navigator.language`.
- The existing IndexedDB `appOptions` store is available for global settings.
- English is the fallback language for unsupported browser languages.

## Open Questions

- None

## Requirements

### Detect and persist the initial language

**Type:** Functional  
**Description:** The system must determine the language for a new installation from the browser and persist the resulting global preference locally.  
**Acceptance Criteria:**

- The supported language identifiers are `de` and `en`.
- Without a stored language, `navigator.languages` is checked in order and then `navigator.language`.
- Regional tags are normalized, for example `de-AT` to `de` and `en-US` to `en`.
- When no supported browser language is found, the system uses `en`.
- The resolved language is stored in IndexedDB app options.

### Allow a manual global language selection

**Type:** Functional  
**Description:** The system must let users select German or English in the global options area.  
**Acceptance Criteria:**

- The options area offers `Deutsch` and `English`.
- A stored language selection takes precedence over browser language detection.
- A language change applies without reloading the page.
- The selection remains available after reload, PWA restart, and application updates.
- Language is global and not a chat-scoped setting.

### Localize app-owned interface content

**Type:** Functional  
**Description:** The system must render app-owned interface content in the active language.  
**Acceptance Criteria:**

- Visible UI text, dialogs, accessibility labels, placeholders, app-owned errors, date formatting, example prompts, and new-chat titles use the active language.
- The document `lang` attribute is updated to the active language.
- Automatic chat titles use the language active when title generation starts.
- Both language resources are bundled with the static application and remain available offline.
- Missing translation keys fall back to English.

### Preserve local user content

**Type:** Constraint  
**Description:** Changing the interface language must not modify persisted user and provider content.  
**Acceptance Criteria:**

- User prompts, manually edited chat titles, stored instructions, provider names, and model names are not translated or overwritten.
- Historical error snapshots remain unchanged.
- Existing user content remains unchanged after a language change.

**References:** ADR-012: Localization and Language Settings
