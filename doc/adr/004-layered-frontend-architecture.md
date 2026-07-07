---
state: accepted
---

# ADR-004: Layered Frontend Architecture

## Status
accepted

## Context
Even without a backend, the application contains multiple responsibilities: presentation, application logic, provider integration, and persistence. Without clear boundaries, UI components would know about provider and storage logic.

## Decision
The frontend is separated into UI Layer, Application Layer, Provider Layer, and Persistence Layer.

## Consequences
- UI components remain limited to presentation and user interaction.
- Use cases such as chat creation, image generation, model management, and settings live in the Application Layer.
- Provider-specific communication and persistence access remain replaceable and decoupled from the UI.
- The structure creates some additional organizational overhead, but reduces coupling between domain logic, provider code, and the interface.
