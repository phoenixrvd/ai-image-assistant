---
state: accepted
---

# ADR-009: GitHub Pages Static Deployment

## Status
accepted

## Context
The application is frontend-only and does not require a custom backend for the first version. The production build must be publishable as static files while still supporting PWA assets, client-side routing, and local browser persistence.

## Decision
The application will be published on GitHub Pages as a static PWA through the configured custom domain. The build and runtime architecture must work without a custom application server.

## Rationale
- GitHub Pages matches the frontend-only architecture and avoids backend operations for the MVP.
- Static hosting is sufficient because provider requests are executed from the browser and local data is stored in IndexedDB.
- Publishing through GitHub Pages keeps deployment simple while still allowing hashed assets, manifest files, and a service worker.
- Using a custom domain lets the production app run from the root path `/` instead of a repository subpath.

## Alternatives
### Alternative 1
- Deploy to a custom server or managed hosting platform with server-side runtime support.

### Alternative 2
- Add a backend or proxy only to support deployment.

## Consequences
- The app must be compatible with GitHub Pages static file serving from the custom domain root path `/`.
- Client-side routing must handle GitHub Pages static hosting constraints.
- Manifest, icons, asset URLs, and service worker scope must be configured for root deployment.
- Vite `base` remains `/` for the production deployment.
- Server-side routing, API endpoints, and server-side environment secrets are not available in the deployment target.

## Assumptions
- GitHub Pages remains the target hosting platform for the first production delivery.
- The production domain is configured in GitHub Pages settings and DNS, not in source files.

## Open Questions
- None

## References
- AIIA-005: PWA Versioning and Build Stability
