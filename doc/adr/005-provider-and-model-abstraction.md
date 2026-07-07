---
state: accepted
---

# ADR-005: Provider and Model Abstraction

## Status
accepted

## Context
The application should support image generation through different providers. The MVP includes an OpenAI-compatible image-generation API and Grok as built-in provider integrations. Custom endpoints remain configurable when they are compatible with the provider configuration model. Providers differ in APIs and configuration details, but should be usable consistently by the application logic.

## Decision
Providers are encapsulated behind a shared provider contract. Models are represented as configurable units with a type; in the first version, `chat` and `image` are the supported model types, with image generation as the primary use case.

## Consequences
- New providers can be added without making UI or use-case code provider-specific.
- Provider-specific behavior must be mapped to the shared contract inside the Provider Layer.
- OpenRouter and similar services are not initial built-in providers unless they are used through custom or OpenAI-compatible endpoint configuration.
- Additional model types or strongly divergent provider capabilities require an extension of the shared contract.
