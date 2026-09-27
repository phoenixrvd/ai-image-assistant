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
**Description:** Users must be able to configure fixed API providers directly in the GUI. Models are statically implemented in the application; users can only activate or deactivate them.  
**Acceptance Criteria:**

- The GUI provides inputs for provider settings.
- The GUI provides inputs for API URL, API key, and active/inactive status per fixed provider.
- The GUI does not provide inputs for model names, model types, default parameters, or model capabilities.
- Each selectable static model has one activation checkbox; all its supported routes are enabled together. New models are active by default.
- A static image model defines its provider and at least one create or edit route, including model identifier and default parameters.
- An edit route enables reference images. An image model without a create route requires reference images.
- Text models retain their image-input capability.

### Local configuration persistence

**Type:** Constraint  
**Description:** Provider configuration must be stored locally in browser storage, for example in IndexedDB via Dexie.  
**Acceptance Criteria:**

- Stored provider data remains available after reloading the application.
- Provider URL, API key, and active/inactive status are persisted locally immediately after each change.
- The documentation treats IndexedDB and Dexie as local MVP constraints, not as a general backend architecture.

### Derive active models from provider configuration and static definitions

**Type:** Functional  
**Description:** A model must be considered usable only when its activation checkbox and fixed provider are active and the provider has the required stored configuration values.  
**Acceptance Criteria:**

- Models whose provider has a URL, API key, active status, and individual activation are treated as usable.
- Models whose provider is inactive or missing URL or credential values are not offered for generation.
- Individually deactivated models are not offered for generation.
- Model names and capabilities are read from static model definitions, not from local storage.
- Activation of an image model controls both declared routes.

### Require image and image-capable text model configuration

**Type:** Functional  
**Description:** The system must require at least one usable image model and one usable text or chat-completion model with image-input capability before the core workflow can be used.  
**Acceptance Criteria:**

- If the minimum usable model configuration is missing, the global options area opens automatically.
- The minimum usable model configuration requires at least one usable image model.
- The minimum usable model configuration requires at least one usable text or chat-completion model with image-input capability.
- Image models are used for image generation.
- Image-capable text or chat-completion models analyze the first successfully generated image for automatic chat naming.
- Text or chat-completion models without image-input capability do not satisfy the minimum model configuration.
- Incomplete or inactive models are not counted toward the minimum usable model configuration.
- At least one image model and one image-capable text model must remain active across all providers.
- A provider cannot be deactivated when it would remove the last required activated image or image-capable text model.

### Provide one image-capable text model per provider

**Type:** Functional  
**Description:** Each fixed provider must provide one static image-capable text model so that automatic chat naming works when only that provider is configured.  
**Acceptance Criteria:**

- OpenAI provides `gpt-4o-mini` as its image-capable text model.
- fal.ai provides `openai/gpt-4o-mini` through its OpenRouter endpoint as its image-capable text model.
- OpenRouter provides `bytedance-seed/seed-2.0-mini` as its image-capable text model.
- A usable configuration of any one fixed provider supplies both image generation and automatic chat naming without requiring credentials for another provider.
- Automatic chat naming uses the first usable image-capable text model returned by the static model registry.
- Automatic chat naming does not request or enable reasoning.
- Failure of automatic chat naming does not invalidate an otherwise successful image generation.

### Provide an options area for global settings

**Type:** Functional  
**Description:** The system must provide an options area for global settings and provider configuration.  
**Acceptance Criteria:**

- The options area includes fixed provider settings.
- The options area includes an API URL per provider.
- The options area includes an API key per provider.
- The options area includes the active/inactive status per provider.
- The options area shows all static models per provider as a name-sorted checkbox list.
- A model with create and edit routes appears once in the provider's model list.
- Changes to provider configuration, model activation, default image model, theme, and language are persisted immediately without a save action.
- The options area includes the theme switch for dark and light mode.
- The options area includes a language selection for German and English.
- Changing the language applies immediately to app-owned UI text and accessibility labels.
- The selected language is persisted locally as a global app setting.

### Set a default image model

**Type:** Functional  
**Description:** Users can set a global default image model in the options area.  
**Acceptance Criteria:**

- The default is `OpenRouter: Grok Imagine 2.0`, with create and edit routes.
- New chats preselect the default model.
- If the default model is not usable, the first usable image model is selected.
- Image-derived chats select the model corresponding to the image's historical model ID, not the global default. The historical request retains its original model ID.

### Show static model pricing

**Type:** Functional  
**Description:** The provider options must show a concise pricing reference for each static model without requesting pricing data at runtime.  
**Acceptance Criteria:**

- Each priced model shows its pricing reference on a second line below its name and estimated duration.
- A model shows one pricing reference. Different create/edit prices or reference surcharges are distinguished in that reference.
- The pricing reference includes the billing unit, for example per image, megapixel, or one million tokens.
- Pricing references are stored in one static file with an official source URL for each priced route or surcharge and the price-check date.
- Price variants reflect the effective default quality, resolution, and other pricing-relevant parameters sent by the provider adapter.
- A range or starting price is shown when aspect ratio, input images, or other variable request parameters prevent an exact price.
- Per-reference surcharges require an official source. Megapixel and token charges retain their billing units.
- Pricing references are available in German and English and change with the selected application language.
- A missing price entry does not make a model unusable and does not render an empty pricing line.
- The application does not fetch provider pricing pages at runtime.

### Fixed providers without dynamic creation

**Type:** Functional  
**Description:** The MVP uses fixed built-in providers. Users cannot dynamically create providers or models.  
**Acceptance Criteria:**

- The application ships with fixed providers for OpenAI, fal.ai, and OpenRouter.
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
- New selectable models require a static definition. A new route of an existing model does not create another dropdown entry.
- Local provider configuration and persisted model activation preferences remain the source of truth for whether a provider's static models are usable.
- Existing default and chat model selections map to the combined model. Historical image and request model IDs remain unchanged.
- On migration, the combined model is disabled only when both former variants were disabled. Otherwise, both supported routes are enabled.

### Route image generation by reference availability

**Type:** Functional

**Description:** Image models route requests according to the presence of reference images.
**Acceptance Criteria:**

- A model supports `Create only`, `Edit only`, or both. Both routes may use the same or different provider model identifiers.
- Requests without references use the create route; requests with references use the edit route.
- `Create only` hides reference controls and the unsupported-reference notice. Saved references are neither deleted nor sent.
- `Edit only` remains selectable without references. Submission without references shows the existing required-reference error before the provider request.
- The model dropdown shows localized `(Create only)` or `(Edit only)` suffixes for single-route models. Dual-route models have no suffix.
- New generation requests record the effective route.

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
