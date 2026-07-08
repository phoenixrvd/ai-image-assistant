---
state: implemented
---

# AIIA-005: PWA Versioning and Build Stability

## Context
The project is delivered as a Progressive Web App from the first implementation iteration and published on GitHub Pages through the configured custom domain. The app should be installable by users. New deployments must reliably reach users after a normal reload without leaving old JavaScript, CSS, manifest, or service worker files active indefinitely. At the same time, local user data such as chats, model configuration, settings, and generated images must survive app updates.

## Assumptions
- The app is built with Vite.
- The app is deployed as static files to GitHub Pages.
- The production deployment is served from the custom domain root path `/`, not from a repository subpath.
- The app uses IndexedDB through Dexie for local persistence.
- The first runnable implementation includes PWA support, including manifest, service worker or PWA build plugin, and installability.

## Open Questions
- None

## Requirements

### Support an installable app experience
**Type:** Constraint  
**Description:** Users must be able to use the Progressive Web App as an installable application on supported devices.  
**Acceptance Criteria:**
- The application can be installed on supported devices.
- The installed application launches directly into the workspace experience.
- The installed application uses the product name, app icon, and visual identity of the application.
- The installed application requests portrait orientation to avoid landscape mode in the PWA experience.
- The installable app experience is part of the MVP delivery scope.

### Define offline and limited-connectivity behavior
**Type:** Functional  
**Description:** The application must provide predictable behavior when users are offline or have limited connectivity.  
**Acceptance Criteria:**
- Existing local-first content remains accessible.
- Provider-dependent capabilities clearly indicate when network connectivity is required.
- The application does not imply that image generation works offline.

### Support GitHub Pages deployment
**Type:** Constraint  
**Description:** The production build must support deployment to GitHub Pages.  
**Acceptance Criteria:**
- The production build can be served from GitHub Pages.
- Asset paths and routing work correctly when deployed from the custom domain root path `/`.
- PWA manifest and service worker registration work correctly in the GitHub Pages deployment context.
- The Vite production base path remains `/` for the custom-domain deployment.

### Maintain a central app version
**Type:** Constraint  
**Description:** The system must use the `version` field in `package.json` as the central product version and follow SemVer (`MAJOR.MINOR.PATCH`).  
**Acceptance Criteria:**
- The app version is read from `package.json` during the build.
- The version is not duplicated as a manually maintained source constant.
- Version numbers follow SemVer, for example `0.5.0` or `1.0.0`.

### Inject build metadata automatically
**Type:** Constraint  
**Description:** The production build must inject app version and build time into the Vite environment.  
**Acceptance Criteria:**
- The build provides `VITE_APP_VERSION` from `package.json`.
- The build provides `VITE_BUILD_TIME` from the current build timestamp.
- The production build is executable without manual source-code edits.
- If cross-platform builds are required, a small Node build script is used instead of shell-specific syntax.

### Provide central app metadata
**Type:** Constraint  
**Description:** The source code must expose build metadata through a central app metadata module.  
**Acceptance Criteria:**
- The app has a central metadata module for app version and build time.
- The module reads `import.meta.env.VITE_APP_VERSION`.
- The module reads `import.meta.env.VITE_BUILD_TIME`.
- Local development fallbacks such as `dev` or `local` are allowed.

### Show technical version information in options
**Type:** Functional  
**Description:** The options area must show technical information about the currently running installation.  
**Acceptance Criteria:**
- The options area shows the app version.
- The options area shows the build time.
- The options area shows the Dexie database schema version.
- PWA status and update status may be shown optionally.

### Publish through GitHub Pages
**Type:** Constraint  
**Description:** The production app must be publishable as a static PWA on GitHub Pages.  
**Acceptance Criteria:**
- The production build emits static files suitable for GitHub Pages hosting.
- Routing, asset paths, manifest paths, and service worker scope work under the custom domain root path `/`.
- The deployment does not require a custom application server.
- Client-side routing is compatible with GitHub Pages static hosting constraints.
- The app is published by GitHub Actions from the `main` branch.
- The GitHub Pages deployment uses the custom domain configured in GitHub Pages settings and DNS.

### Keep asset hashing enabled
**Type:** Constraint  
**Description:** Production builds must use content-hashed JavaScript and CSS asset filenames.  
**Acceptance Criteria:**
- Production JavaScript and CSS assets include hashes in their filenames.
- Stable production asset names such as `/assets/app.js` or `/assets/style.css` are not used.
- Vite asset hashing is not disabled.

### Version service worker caches
**Type:** Constraint  
**Description:** Service worker caches must be tied to the app version or build revision so new deployments are detectable.  
**Acceptance Criteria:**
- The service worker or PWA plugin uses versioned or revisioned caches.
- Old caches are removed after activating a new service worker.
- Manual cache lists without revisions are avoided.
- If Workbox or `vite-plugin-pwa` is used, generated asset revisioning is used.

### Apply updates on reload
**Type:** Constraint  
**Description:** When a new app version is deployed, the updated application must become active after a normal browser reload. The app does not need an in-app update prompt.  
**Acceptance Criteria:**
- Reloading the app after a deployment fetches the current application shell and assets.
- The service worker must not keep serving stale assets indefinitely after reload.
- The app does not require an in-app "new version available" message.
- The app does not need a manual "check for updates" action.

### Keep manifest and icons updateable
**Type:** Constraint  
**Description:** The web app manifest and related PWA assets must be updated reliably after deployments.  
**Acceptance Criteria:**
- The manifest is correctly included in the production build.
- Changes to manifest, icons, app name, or theme color reach users after deployment.
- The manifest is revisioned by the PWA build process or included with an explicit version marker.

### Separate app version from database version
**Type:** Constraint  
**Description:** The IndexedDB schema version must be managed independently from the product app version.  
**Acceptance Criteria:**
- App version and DB schema version are treated as separate concepts.
- Dexie `db.version(n)` changes only when the IndexedDB schema changes.
- The visible technical info can show both app version and DB version.

### Preserve local-first user content
**Type:** Constraint  
**Description:** Local-first user content must remain durable during normal usage and application updates.  
**Acceptance Criteria:**
- Chats remain available.
- Settings remain available.
- Model configurations remain available.
- Stored images and image information remain available.
- Application updates do not silently remove local-first user content.

### Define production build acceptance criteria
**Type:** Non-functional  
**Description:** A production build is only considered correct when versioning, cache invalidation, update behavior, and local data compatibility are covered.  
**Acceptance Criteria:**
- The app version is taken from `package.json`.
- The build time is generated automatically.
- The version is visible in the UI.
- JavaScript and CSS files are emitted with hashed filenames.
- The service worker detects new versions.
- Old caches are cleaned after updates.
- The current app version becomes active after a normal browser reload.
- The app is deployable to GitHub Pages as static files.
- IndexedDB data remains available after updates.
- Dexie schema changes are versioned.
- Manifest and icons update reliably.
- The production build is reproducible and does not require manual source-code changes.
