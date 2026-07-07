---
state: accepted
---

# ADR-002: Frontend Technology Stack

## Status
accepted

## Context
The application needs a component-based UI, type-safe domain and provider interfaces, and a lightweight development and build process for a browser-only app.

## Decision
The frontend core consists of React, Vite, and TypeScript. React Router, TanStack Query, and Dexie are used as supporting infrastructure for routing, asynchronous state, and local persistence.

## Consequences
- The architecture is oriented toward a React-based single-page frontend.
- TypeScript becomes the required basis for provider, model, persistence, and service contracts.
- Alternative frontend frameworks or a server-rendered architecture are not part of the first version.
