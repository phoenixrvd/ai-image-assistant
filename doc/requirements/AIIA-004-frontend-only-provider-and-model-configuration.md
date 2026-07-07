---
state: implemented
---

# AIIA-004: Frontend-only Provider and Model Configuration

## Context
This requirement defines the MVP scope for a frontend-only application with locally configurable API providers and models.

## Assumptions
- The MVP runs without a backend.
- API requests are executed directly from the frontend in the MVP.

## Open Questions
- None

## Requirements

### Frontend-only MVP
**Type:** Constraint  
**Description:** The system must be implementable as a frontend-only application for the MVP. A backend is not required for the MVP.  
**Acceptance Criteria:**
- The documented MVP does not require a backend.
- Image generation can be triggered in the MVP without a server-side application.

### Local provider and model configuration
**Type:** Functional  
**Description:** Users must be able to configure API providers, API URLs, API keys, and model names directly in the GUI.  
**Acceptance Criteria:**
- The GUI provides inputs for provider or model settings.
- The GUI provides inputs for API URL, API key, and model name.
- Model configuration is part of the local app data and is not hardcoded.

### Local configuration persistence
**Type:** Constraint  
**Description:** Provider and model configuration must be stored locally in browser storage, for example in IndexedDB via Dexie.  
**Acceptance Criteria:**
- Stored provider and model data remains available after reloading the application.
- The configuration can be edited locally and saved again.
- The documentation treats IndexedDB and Dexie as local MVP constraints, not as a general backend architecture.

### Derive active models from configuration
**Type:** Functional  
**Description:** A model must be considered active only when its stored configuration contains the required values for generation.  
**Acceptance Criteria:**
- Models with a usable provider, API URL, model name, and required credentials are treated as active.
- Models missing required provider, URL, model name, or credential values are not offered for generation or are shown as inactive.
- The activity status is derived from the stored configuration and is not hardcoded separately.

### Require image and text model configuration
**Type:** Functional  
**Description:** The system must require at least one usable image model and one usable text or chat-completion model before the core workflow can be used.  
**Acceptance Criteria:**
- If the minimum usable model configuration is missing, the global options area opens automatically.
- The minimum usable model configuration requires at least one usable image model.
- The minimum usable model configuration requires at least one usable text or chat-completion model.
- Image models are used for image generation.
- Text or chat-completion models are used for automatic chat naming.
- Incomplete or inactive models are not counted toward the minimum usable model configuration.

### Provide an options area for global settings
**Type:** Functional  
**Description:** The system must provide an options area for global settings and model configuration.  
**Acceptance Criteria:**
- The options area includes provider or model settings.
- The options area includes an API URL per provider or model.
- The options area includes an API key per provider or model.
- The options area includes the model name and derived activity status.
- The options area includes the theme switch for dark and light mode.

### Add models dynamically
**Type:** Functional  
**Description:** In the "Models" area, users must be able to add a new model through a "+" button.  
**Acceptance Criteria:**
- The "Models" area includes a "+" button.
- Clicking "+" shows input fields for an additional model.
- The new fields are directly editable.
- After saving, the new model is persisted locally.

### Support custom compatible endpoints
**Type:** Functional  
**Description:** Users must be able to flexibly enter custom API URLs and model names for supported provider adapters, including OpenAI-compatible local endpoints or external APIs.  
**Acceptance Criteria:**
- API URL and model values are not sourced exclusively from fixed built-in lists.
- Users can enter custom API URLs.
- Users can enter custom model names.
- Free-form provider adapter plugins are outside the MVP scope.

### Execute direct generation requests in the MVP
**Type:** Constraint  
**Description:** For the MVP, generation uses direct frontend request/response calls instead of backend job processing.  
**Acceptance Criteria:**
- The MVP workflow does not require asynchronous backend job processing.
- The user can start image generation directly from the frontend application.

### Handle missing internet connectivity
**Type:** Functional  
**Description:** The system must detect missing internet connectivity before provider API calls and clearly indicate that image generation requires connectivity.  
**Acceptance Criteria:**
- If the browser is offline, image generation does not attempt the provider request.
- If the browser is offline, the workspace shows a clear user-facing connectivity notice.
- The offline notice does not expose credentials.
- Unreachable provider APIs and network-level fetch failures during attempted provider requests are normalized to a user-facing connectivity error.
- HTTP provider responses with status codes still show the existing provider error behavior.

### Encapsulate provider integration
**Type:** Constraint  
**Description:** Provider integration must be encapsulated so that a backend or proxy can optionally be added later without fundamentally rebuilding the UI or local data structure.  
**Acceptance Criteria:**
- UI requirements remain independent of whether requests are executed directly or later through a backend or proxy.
- Local model configuration remains a functional app configuration.
- A later backend or proxy mode does not require a fundamental redefinition of the UI flow.
