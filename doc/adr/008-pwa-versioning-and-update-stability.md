---
state: accepted
---

# ADR-008: PWA Versioning and Update Stability

## Status
accepted

## Context
The application is delivered as a Progressive Web App from the first implementation iteration and published on GitHub Pages. The app should be installable by users. PWA delivery introduces client-side update risks: stale service workers, stale caches, outdated manifests, static-hosting base paths, and locally persisted IndexedDB data that must remain compatible across app updates.

## Decision
The PWA architecture separates product versioning, build revisioning, cache revisioning, and IndexedDB schema versioning. The app version is sourced from `package.json`, build metadata is injected during the build, production assets remain content-hashed, service worker caches are revisioned and cleaned on updates, and Dexie schema versions are managed independently from the app version. PWA metadata cache-busting uses the build revision instead of the product version. The production app is deployed as static files on GitHub Pages.

## Rationale
- Product releases, static assets, service worker caches, and local database schemas change for different reasons and must not share a single version counter.
- Users must reliably receive updated app code after deployment without losing local chats, settings, model configuration, or generated images.
- Static GitHub Pages hosting fits the frontend-only architecture and keeps deployment free of custom server runtime requirements.
- A normal browser reload is the update boundary; the app does not need an in-app update prompt.

## Alternatives
### Alternative 1
- Rely only on browser cache behavior and Vite asset hashing without explicit service worker update handling.

### Alternative 2
- Couple IndexedDB schema versions directly to the app version.

## Consequences
- The build must provide app version and build time automatically.
- The options UI must expose technical version information such as app version, build time, and DB version.
- Service worker configuration must use revisioned assets or versioned caches and remove stale caches after updates.
- The app must serve the current deployed version after a normal browser reload.
- Routing, asset paths, manifest paths, and service worker scope must be compatible with GitHub Pages static hosting.
- IndexedDB migrations must preserve local user data across app updates.

## Assumptions
- The application will be distributed as an installable PWA from the first runnable implementation.
- The application will be published on GitHub Pages.
- Local user data is valuable and must not be discarded during normal updates.

## Open Questions
- None

## References
- AIIA-005: PWA Versioning and Build Stability
