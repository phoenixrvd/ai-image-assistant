---
state: accepted
---

# ADR-001: Frontend-only Architecture

## Status
accepted

## Context
The application is a lightweight web app for image generation. The first version does not require central user management, server-side billing, team features, provider proxies, or shared server-side data.

## Decision
The first version will be implemented without a dedicated backend. The application runs entirely in the browser and communicates directly with the configured providers.

## Consequences
- The initial architecture remains simple and usable without server operations.
- API keys and provider configuration are stored locally in the browser.
- Features such as central key management, multi-device sync, server-side jobs, or team management require a future architecture decision.
