---
state: accepted
---

# ADR-005: Provider and Model Abstraction

## Status

accepted

## Context

The application should support image generation through different providers. The MVP includes OpenAI, Grok, and fal.ai as fixed built-in provider integrations. Provider URL, API key, and active/inactive status remain locally configurable. Model names, model types, default parameters, and model capabilities are static implementation details because adding a model often requires provider-specific adapter behavior. Users may activate or deactivate individual static models.

## Decision

Providers are encapsulated behind a shared provider contract. Providers cannot be dynamically created in the GUI. Local persistence stores `ProviderConfig` records for the fixed providers only.

Models are represented as static model classes in the implementation. Model classes define provider mapping, provider model name, model type, default parameters, and capabilities such as reference-image support or image input for text models. The supported model types remain `text`, `image`, and `image-edit`; image understanding is represented as a capability of a text model because the model still produces text output. Local persistence stores only a `disabledModelIds` preference, so missing entries and newly added static models are activated by default.

## Consequences

- New providers can be added without making UI or use-case code provider-specific.
- Provider-specific behavior must be mapped to the shared contract inside the Provider Layer.
- New model variants require a static model implementation instead of a local database entry.
- Model activation is persisted separately from static model definitions; historical model references remain valid when a model is deactivated.
- At least one image model and one image-capable text model must remain activated across providers, so the final required model or its provider cannot be deactivated.
- OpenRouter and similar services are not initial built-in providers.
- Additional model types or strongly divergent provider capabilities require an extension of the shared contract.
- Multimodal text requests may include image input when the static model declares support and its provider adapter implements the shared image-input contract.
