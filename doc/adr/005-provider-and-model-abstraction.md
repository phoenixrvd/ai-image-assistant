---
state: accepted
---

# ADR-005: Provider and Model Abstraction

## Status
accepted

## Context
The application should support image generation through different providers. The MVP includes OpenAI, Grok, and fal.ai as fixed built-in provider integrations. Provider URL, API key, and active/inactive status remain locally configurable. Model names, model types, default parameters, and model capabilities are static implementation details because adding a model often requires provider-specific adapter behavior.

## Decision
Providers are encapsulated behind a shared provider contract. Providers cannot be dynamically created in the GUI. Local persistence stores `ProviderConfig` records for the fixed providers only.

Models are represented as static model classes in the implementation. Model classes define provider mapping, provider model name, model type, default parameters, and capabilities such as reference-image support. The supported model types are `text`, `image`, and `image-edit`.

## Consequences
- New providers can be added without making UI or use-case code provider-specific.
- Provider-specific behavior must be mapped to the shared contract inside the Provider Layer.
- New model variants require a static model implementation instead of a local database entry.
- OpenRouter and similar services are not initial built-in providers.
- Additional model types or strongly divergent provider capabilities require an extension of the shared contract.
