---
state: accepted
---

# ADR-006: Direct Request Processing without a Job System

## Status
accepted

## Context
In the first version, image generation can be triggered directly from the browser against the active provider. There is no backend that could manage, retry, or stream jobs.

## Decision
Provider requests are processed directly from the frontend in version 1. Queueing, streaming, server-side jobs, and background-worker orchestration are not introduced.

## Consequences
- The generation flow remains simple and easy to understand.
- Long provider runtimes directly affect the active user interaction.
- Retry strategies, job persistence, parallel batch processing, or streaming require a separate future architecture decision.
- The frontend may use best-effort client capabilities (for example Screen Wake Lock) to reduce interruption risk during active requests, without introducing a job system.

## Clarification
The application may coordinate active direct requests in an in-memory map keyed by chat ID. This is navigation state, not a persisted job system: requests continue when switching chats in the same tab, one request is allowed per chat, and different chats may run concurrently. No worker, queue, server job, cross-tab coordination, or resume-after-reload behavior is introduced. Closing or reloading the tab aborts all active requests.
