---
state: implemented
---

# AIIA-001: Product Focus and Scope

## Context
This requirement defines the intended product scope for a focused AI image generation application.

## Assumptions
- None

## Open Questions
- None

## Requirements

### Focus on image generation
**Type:** Constraint  
**Description:** The system must position AI image generation as the primary use case.  
**Acceptance Criteria:**
- The documented main flow starts from entering a prompt and generating images.
- The documented core flow remains centered on generated image output.

### Exclude a general-purpose chat product scope
**Type:** Constraint  
**Description:** The system must not be defined as a general ChatGPT-style or LLM-style chat application.  
**Acceptance Criteria:**
- The documented scope excludes a general-purpose chat assistant.
- Session or chat structures are documented only as support for image generation context.

### Cover the focused image workflow
**Type:** Functional  
**Description:** The system must support prompt entry, image generation, variant creation, result management, and reuse of prompts or images.  
**Acceptance Criteria:**
- The documented workflow includes prompt entry and image generation.
- The documented workflow includes variant creation, result management, and reuse.

### Separate advanced configuration from the core flow
**Type:** Constraint  
**Description:** The system must keep advanced settings available without letting them dominate the core workflow.  
**Acceptance Criteria:**
- Advanced settings are documented as optional.
- A user can understand the main workflow without first understanding advanced settings.

### Support the planned provider scope
**Type:** Constraint  
**Description:** The MVP must target an OpenAI-compatible image-generation API and Grok as the initial built-in provider integrations. Other providers are not part of the initial built-in provider scope.  
**Acceptance Criteria:**
- The documented MVP provider scope includes an OpenAI-compatible image-generation API.
- The documented MVP provider scope includes Grok.
- Additional built-in provider integrations are outside the initial product scope.
- OpenRouter is not treated as a separate built-in MVP provider.
- Custom provider endpoints may still be configured locally when they are compatible with the app's provider configuration model.
- OpenRouter or similar services may be used only through custom or OpenAI-compatible endpoint configuration when technically compatible.

### Stay understandable without deep technical knowledge
**Type:** Non-functional  
**Description:** The system must remain understandable for users without deep model or API knowledge.  
**Acceptance Criteria:**
- The documented target usage does not require technical expertise.
- Technical parameters are not required to complete the core workflow.

### Avoid an expert-only configuration product style
**Type:** Constraint  
**Description:** The system must not become a maximally configurable expert tool.  
**Acceptance Criteria:**
- The documented scope excludes an expert-only configuration focus.
- The documented UI principles exclude a permanently overloaded parameter surface.

### Exclude edit mode for the current scope
**Type:** Constraint  
**Description:** The current product scope must not include an edit mode. Image work is limited to creating images with references.  
**Acceptance Criteria:**
- The documented scope excludes image edit mode.
- The documented image workflow allows creating images with references.
