---
state: accepted
---

# ADR-011: Standalone Chat Ownership

## Status
accepted

## Context
Chats can be created from existing content and are deleted independently. Shared ownership of persisted chat content would couple their lifecycles and make cleanup unsafe.

## Decision
- Treat each chat as a standalone ownership boundary.
- Persist all content required by a chat under that chat's own identity.
- Do not rely on records owned by another chat for display, generation, or cleanup.
- When content is transferred between chats, create independently owned records instead of shared lifecycle dependencies.

## Consequences
- positive: Chats can be displayed, changed, and deleted independently.
- positive: Cleanup does not require cross-chat reference counting or ownership checks.
- negative: Independently owned content can duplicate data and increase local storage use.

## References
- ADR-003: Local Persistence with IndexedDB and Dexie
- ADR-007: Local Storage of Image and Model Data
- ADR-010: Chat-Scoped Live Settings and Immutable Request Snapshots
