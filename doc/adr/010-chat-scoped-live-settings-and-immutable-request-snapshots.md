---
state: accepted
---

# ADR-010: Chat-Scoped Live Settings and Immutable Request Snapshots

## Status
accepted

## Context
The application is session-oriented and stores data locally in IndexedDB. Users switch between chats and expect each chat to preserve its own working context without conflicts.

Global or cross-chat UI state can leak between chats. Failed generation attempts also need technical traceability without polluting visible chat history.

## Decision
- Store mutable live settings per chat in `chat.metadata.chatSettings`.
- Persist per-chat live settings for prompt draft, active image model, image count, aspect ratio, style/rules instructions, and uploaded reference images.
- Persist an immutable generation request snapshot immediately at submit time, before the provider call.
- Persist failed attempts as technical failed requests, without creating visible chat messages, generation results, or images.
- Define chat recency as `lastChanged = lastMessageAt ?? updatedAt` for list ordering and default chat opening.

## Consequences
- positive: Chat switching is conflict-free because live state is scoped to the active chat.
- positive: Generation attempts are traceable through immutable request snapshots, including failures.
- positive: Failed attempts do not clutter visible chat history.
- negative: Additional repository and state synchronization logic is required.
