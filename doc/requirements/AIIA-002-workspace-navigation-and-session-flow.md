---
state: implemented
---

# AIIA-002: Workspace, Navigation, and Session Flow

## Context
This requirement defines the functional UI zones and the session-oriented flow around prompt entry and configuration.

## Assumptions
- None

## Open Questions
- None

## Requirements

### Organize the interface into three functional zones
**Type:** Constraint  
**Description:** The system must organize the interface into navigation, main workspace, and configuration zones.  
**Acceptance Criteria:**
- The documented UI defines a left navigation zone.
- The documented UI defines a center workspace zone and a right configuration zone.

### Adapt functional zones for mobile visibility
**Type:** Non-functional  
**Description:** The system must treat the three zones as functional areas that can be shown or hidden on mobile.  
**Acceptance Criteria:**
- The documented zones are not described as permanently fixed desktop panels.
- The documented zones can be shown or hidden to fit small screens.

### Use the navigation zone for history and session access
**Type:** Functional  
**Description:** The system must use the navigation zone for existing sessions, history access, and starting new sessions.  
**Acceptance Criteria:**
- The navigation zone includes access to existing sessions or image histories.
- The navigation zone includes an action to start a new session.
- Repeating an earlier prompt from current session history is specified in [AIIA-003](./AIIA-003-image-workflow-mobile-and-theme.md#repeat-an-earlier-prompt-from-current-session-history).

### Keep the session list visually reduced
**Type:** Constraint  
**Description:** The system must keep the session list focused on session access and must not show detailed generation metadata. Compact time information is allowed when it represents the last activity or last message time.  
**Acceptance Criteria:**
- The documented session list does not include detailed generation metadata such as provider, model, image count, status, tags, or prompt details.
- Compact time information such as `14:32`, `Gestern`, or `2 Tage` may be shown when it represents the last activity or last message time.
- The navigation area remains visually reduced and focused on session access.

### Automatically name sessions from the first prompt
**Type:** Functional  
**Description:** The system must automatically generate a compact session title from the first submitted prompt by using the configured text or chat-completion model.  
**Acceptance Criteria:**
- A newly created session may start with a temporary default title.
- After the first prompt is submitted in a session, the system starts automatic title generation asynchronously.
- Automatic title generation does not block image generation or the rest of the prompt submission flow.
- The generated title contains at most five words.
- The generated title is stored as the session title and shown in the navigation.
- Automatic title generation runs only for the first prompt in a session.
- If automatic title generation fails, the session remains usable with its existing title.

### Allow manual session renaming
**Type:** Functional  
**Description:** Users must be able to manually rename a session.  
**Acceptance Criteria:**
- The UI provides a rename action for the current session.
- The manually entered title is persisted locally.
- A manually renamed session title is not overwritten by automatic title generation.

### Place the new-session action at the bottom of navigation
**Type:** Functional  
**Description:** The system must place the new-session action at the bottom of the navigation zone on every screen size.  
**Acceptance Criteria:**
- The documented navigation layout places the new-session action at the bottom.
- The new-session action is described inside the navigation zone.
- The new-session action remains at the bottom on every screen size.

### Open the new session directly and close navigation after creation
**Type:** Functional  
**Description:** Starting a new session from navigation opens that session and closes navigation.  
**Acceptance Criteria:**
- Activating the new-session action creates a new session, opens it, and closes navigation.

### Allow the navigation zone to collapse
**Type:** Non-functional  
**Description:** The system must allow the navigation zone to collapse when the user needs more workspace. On mobile-sized screens, users must be able to open and hide the navigation zone with horizontal swipe gestures.  
**Acceptance Criteria:**
- The documented navigation zone is collapsible.
- The documented mobile behavior does not keep the navigation zone permanently visible.
- On mobile-sized screens, a right swipe starting at the left screen edge opens the session navigation.
- On mobile-sized screens, a left swipe hides the open session navigation from anywhere on the screen.
- Navigation swipe gestures do not interfere with vertical scrolling.

### Keep navigation free of image-configuration controls
**Type:** Constraint  
**Description:** The system must keep the navigation zone focused on navigation instead of image configuration.  
**Acceptance Criteria:**
- Image-configuration controls are documented outside the navigation zone.
- The documented navigation zone excludes an additional settings area for generation options.

### Provide options access below the new-session action
**Type:** Functional  
**Description:** The system must provide access to the global options area through a compact link or button at the bottom of the navigation zone, directly after the new-session action.  
**Acceptance Criteria:**
- The options access is documented in the left navigation area.
- The options access appears directly after the new-session action.
- The options access leads to global settings and model configuration.
- Theme selection is documented as part of the global options area, not as a separate navigation control.

### Center the main workspace on prompt and results
**Type:** Constraint  
**Description:** The system must keep the main workspace focused on prompt entry, generated images, and the current session flow.  
**Acceptance Criteria:**
- The documented main workspace includes prompt entry.
- The documented main workspace includes generated image results and current session context.

### Preserve the submitted prompt in the input field
**Type:** Functional  
**Description:** The system must keep the submitted prompt in the input field after generation starts.  
**Acceptance Criteria:**
- The prompt remains visible after submission.
- A user can adjust the existing prompt for a follow-up attempt.

### Allow compact configuration access from the prompt area
**Type:** Constraint  
**Description:** The system may place compact configuration access in the prompt area when it keeps the core prompt and generation flow quickly reachable.  
**Acceptance Criteria:**
- Configuration access remains visually compact and uses an options-oriented icon.
- The prompt input remains focused on prompt entry and generation.

### Provide prompt cleanup next to configuration access
**Type:** Functional  
**Description:** The system must provide a compact prompt-cleanup action directly next to the prompt-area configuration icon so users can clear the current prompt quickly.  
**Acceptance Criteria:**
- A compact cleanup icon is placed directly next to the prompt-area configuration icon.
- Activating the cleanup action shows a confirmation dialog before clearing the prompt input.
- Confirming the dialog clears only the current prompt input content.
- Canceling the dialog keeps the current prompt input content unchanged.
- The cleanup action does not delete session history, messages, or generated images.

### Reduce visible clutter in the main workspace
**Type:** Non-functional  
**Description:** The system must avoid unnecessary headings, comments, and explanatory UI text in the main workspace.  
**Acceptance Criteria:**
- The documented workspace excludes unnecessary headings or comments.
- The documented prompt area is described as visually reduced.

### Provide a separate configuration zone
**Type:** Functional  
**Description:** The system must provide a separate configuration zone. On desktop-sized screens, this zone may be permanently visible on the right side. On smaller screens, it must be opened through a compact workspace or prompt-area control and must not permanently block the main workspace.  
**Acceptance Criteria:**
- The configuration zone is documented as separate from the main workspace.
- On desktop-sized screens, the configuration zone may be visible as a right-side panel.
- On smaller screens, the configuration zone is opened through a compact workspace or prompt-area control.
- On smaller screens, the configuration zone can be hidden again so the main workspace remains quickly reachable.

### Use an options-oriented icon for configuration access
**Type:** Functional  
**Description:** The system must use an options-oriented icon instead of a plus icon for configuration access.  
**Acceptance Criteria:**
- The documented configuration access excludes a plus icon.
- The documented configuration access uses an icon that communicates options or controls.

### Place generation options in the configuration zone
**Type:** Functional  
**Description:** The system must place active provider selection, active model selection, and generation options in the configuration zone.  
**Acceptance Criteria:**
- Active provider or model selection is documented in the configuration zone.
- Generation options are documented in the configuration zone.
- Chat-specific image instructions such as style and rules may be edited in the configuration zone.
- API URLs, API keys, and model management are documented as global options, not as generation controls.

### Offer image count selection as a dropdown
**Type:** Functional  
**Description:** The system must allow the user to select the number of generated images through a dropdown.  
**Acceptance Criteria:**
- Image count selection is documented in the configuration zone.
- The image count control is documented as a dropdown.

### Offer aspect ratio selection with labels
**Type:** Functional  
**Description:** The system must allow the user to select image format or aspect ratio with labels and compact format hints. Icons may be used optionally.  
**Acceptance Criteria:**
- Image format or aspect ratio selection is documented in the configuration zone.
- The selection is documented with labels and compact format hints.
- Icons may be used optionally but are not required.

### Keep deletion in the configuration zone
**Type:** Functional  
**Description:** The system must place deletion of the current session in the configuration zone.  
**Acceptance Criteria:**
- The delete action for the current session is documented in the configuration zone.
- The delete action is documented outside the navigation and prompt input areas.

### Confirm session deletion before execution
**Type:** Functional  
**Description:** The system must require confirmation before deleting a session.  
**Acceptance Criteria:**
- A delete confirmation is documented before session deletion completes.
- The documented confirmation allows the user to cancel deletion.

### Use a compact control to hide the session area
**Type:** Functional  
**Description:** The system must hide the session area through a compact left-arrow icon control and mobile swipe gesture instead of a persistent text button or an `X` close button.  
**Acceptance Criteria:**
- The documented hide control is a left-arrow icon or another compact directional control.
- The documented UI excludes a permanently visible text button for hiding sessions.
- The documented UI excludes an `X` close button for hiding the session area.
- Icon buttons for showing or hiding the session area are visually round and compact.
