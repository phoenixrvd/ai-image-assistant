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

### Local provider configuration with static models
**Type:** Functional  
**Description:** Users must be able to configure fixed API providers directly in the GUI. Models are statically implemented in the application and are not user-configurable.  
**Acceptance Criteria:**
- The GUI provides inputs for provider settings.
- The GUI provides inputs for API URL, API key, and active/inactive status per fixed provider.
- The GUI does not provide inputs for model names, model types, default parameters, or model capabilities.
- Static model definitions in the implementation provide model names, types, provider mapping, default parameters, and reference-image capability.

### Local configuration persistence
**Type:** Constraint  
**Description:** Provider configuration must be stored locally in browser storage, for example in IndexedDB via Dexie.  
**Acceptance Criteria:**
- Stored provider data remains available after reloading the application.
- Provider URL, API key, and active/inactive status can be edited locally and saved again.
- The documentation treats IndexedDB and Dexie as local MVP constraints, not as a general backend architecture.

### Derive active models from provider configuration and static definitions
**Type:** Functional  
**Description:** A model must be considered active only when its fixed provider is active and has the required stored configuration values.  
**Acceptance Criteria:**
- Models whose provider has a URL, API key, and active status are treated as active.
- Models whose provider is inactive or missing URL or credential values are not offered for generation.
- Model names and capabilities are read from static model definitions, not from local storage.

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
**Description:** The system must provide an options area for global settings and provider configuration.  
**Acceptance Criteria:**
- The options area includes fixed provider settings.
- The options area includes an API URL per provider.
- The options area includes an API key per provider.
- The options area includes the active/inactive status per provider.
- The options area shows the active static models per provider as a simple name-sorted list.
- The options area includes the theme switch for dark and light mode.

### Set a default image model
**Type:** Functional  
**Description:** Users can set a global default image model in the options area.  
**Acceptance Criteria:**
- The default is `fal.ai: Grok Imagine Edit`.
- New chats preselect the default model.
- If the default model is not usable, the first usable image model is selected.

### Fixed providers without dynamic creation
**Type:** Functional  
**Description:** The MVP uses fixed built-in providers. Users cannot dynamically create providers or models.  
**Acceptance Criteria:**
- The application ships with fixed providers for xAI/Grok, OpenAI, and fal.ai.
- The GUI does not offer creation or deletion of providers.
- The GUI does not offer creation or deletion of models.
- Users can enter custom API URLs for the fixed providers.
- Free-form provider adapter plugins are outside the MVP scope.

### Support static provider models without local model configuration
**Type:** Functional  
**Description:** Built-in provider adapters must support the statically implemented provider models without requiring local model configuration.  
**Acceptance Criteria:**
- A built-in provider adapter can be reused by multiple static model classes when the API contract is compatible.
- Users select from active static models in the model dropdown.
- Adding a new provider model variant requires adding a static model implementation.
- Local provider configuration remains the source of truth for whether a provider's static models are usable.

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
- Local provider configuration remains a functional app configuration.
- A later backend or proxy mode does not require a fundamental redefinition of the UI flow.
