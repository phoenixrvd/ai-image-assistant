---
state: accepted
---

# ADR-007: Local Storage of Image and Model Data

## Status
accepted

## Context
The application should make generated images and model configurations permanently available without a backend. Images must remain discoverable together with their generation context. Model access must be locally configurable so the frontend-only architecture remains functional.

## Decision
Generated images are stored as blobs in IndexedDB. Image metadata and model configurations are also persisted locally. A separate thumbnail system is not introduced in version 1.

## Consequences
- Images, prompts, model references, and provider references remain locally available together.
- API keys and model configurations are stored in the browser and must be treated as local user data.
- Local storage of image binary data increases browser storage usage.
- Thumbnail generation, external asset storage, or server-side key management remain future architecture topics.
