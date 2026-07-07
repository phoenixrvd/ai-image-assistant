---
state: accepted
---

# ADR-003: Local Persistence with IndexedDB and Dexie

## Status
accepted

## Context
The application must persist chats, messages, images, models, and app settings without a backend. Browser storage such as LocalStorage is not suitable enough for structured data and binary data.

## Decision
Persistent data is stored locally in IndexedDB. Access to IndexedDB is encapsulated through Dexie.

## Consequences
- The app remains locally usable as long as the browser retains the data.
- Repositories and schema versioning are implemented through Dexie.
- Data is initially bound to the browser and device; synchronization or server-side persistence requires a future architecture decision.
