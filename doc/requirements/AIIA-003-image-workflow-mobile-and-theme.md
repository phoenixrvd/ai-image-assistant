---
state: implemented
---

# AIIA-003: Image Workflow, Mobile Behavior, and Theme

## Context
This requirement defines image presentation, per-image actions, prompt variation behavior, mobile-first usage, and theme support.

## Assumptions
- None

## Open Questions
- None

## Requirements

### Show generated images as the primary output
**Type:** Non-functional  
**Description:** The system must present generated images as the primary visible output of the workflow.  
**Acceptance Criteria:**
- Generated images are documented as clearly visible in the main workspace.
- Supporting controls do not replace the visual focus on generated images.

### Support comparison of multiple generated images
**Type:** Functional  
**Description:** The system must present multiple generated images in a way that supports comparison.  
**Acceptance Criteria:**
- Multiple generated images can appear within the same session context.
- The documented image presentation requires good comparability between results.

### Attach actions directly to each image
**Type:** Functional  
**Description:** The system must place image actions directly on or below the related image.  
**Acceptance Criteria:**
- Image actions are documented per image instead of as global controls.
- A user does not need to search another UI area for actions on a selected image.

### Provide direct download for each image
**Type:** Functional  
**Description:** The system must provide a direct download action for each generated image.  
**Acceptance Criteria:**
- Each generated image includes a download action.
- The documented download action allows direct saving of the selected image.
- Downloaded image filenames are normalized as `aiia-<chat-prefix>-YYYYMMDD-HHMMSS.ext`.
- Downloaded image filenames always start with the static prefix `aiia-`.
- The chat prefix consists of the first two characters of the chat ID.
- The original image file extension is preserved as `ext`.

### Provide pin for each image
**Type:** Functional  
**Description:** The system must provide a pin action for each generated image.  
**Acceptance Criteria:**
- Each generated image includes a pin action.
- The documented pin action marks or highlights the selected image for later use.

### Provide overlay for each image
**Type:** Functional  
**Description:** The system must provide an overlay action for each generated image and allow browsing generated images inside the overlay.  
**Acceptance Criteria:**
- Each generated image includes an overlay action.
- The documented overlay action uses the selected image as a visual reference or comparison layer.
- When multiple images are available in the current chat, the overlay allows switching to the previous or next image.
- The overlay provides left and right navigation arrows without changing the embedded chat image layout.
- The overlay navigation arrows are visually reduced, borderless, and appear over the image preview area.
- Switching the overlay image also switches the blurred background to the active image.
- The overlay supports sliding or swiping between images on touch-capable screens.
- The overlay allows pinch-to-zoom only on the displayed image on touch-capable screens; the rest of the application must not become zoomable for this feature.

### Keep image actions compact and understandable
**Type:** Non-functional  
**Description:** The system must keep image actions compact and understandable through clear icons or short labels.  
**Acceptance Criteria:**
- The documented image actions may use icons.
- The documented image actions remain understandable when icons are used.

### Support fast prompt variation
**Type:** Functional  
**Description:** The system must support creating a new attempt by adjusting an existing prompt.  
**Acceptance Criteria:**
- The documented workflow supports quick variants from the current prompt.
- The documented workflow does not require rewriting the prompt from scratch for each attempt.

### Keep prompt history traceable within a session
**Type:** Functional  
**Description:** The system must keep the prompt history of the current session traceable.  
**Acceptance Criteria:**
- The documented session flow includes traceable prompt history.
- A user can follow earlier prompt attempts within the same session.

### Repeat an earlier prompt from current session history
**Type:** Functional  
**Description:** The system must allow a user to bring an earlier prompt from the current session history back into the prompt input without retyping it, so it can be started again unchanged.  
**Acceptance Criteria:**
- A user can select any earlier prompt from the current session history and bring it back into the prompt input.
- The repeated prompt can be brought back into the prompt input without manual re-entry.
- The user can start the repeated prompt again unchanged from the prompt input.
- When the repeated prompt is submitted, it appears as a new attempt in the current session history.

### Delete a message from current session history
**Type:** Functional  
**Description:** The system must allow a user to delete a message from the current session history.  
**Acceptance Criteria:**
- Each message in the current session history includes a delete action.
- The delete action is placed before the prompt-repeat action in the message controls.
- The system asks for confirmation before deleting the message.
- The documented confirmation allows the user to cancel deletion.
- When the message is deleted, all images belonging to that message are deleted as well.
- Related generation records for the deleted message are removed from local persistence.

### Support chat-specific style and rule instructions
**Type:** Functional  
**Description:** The system must allow users to define style and rule instructions for the current chat that are applied to image generation prompts in that chat.  
**Acceptance Criteria:**
- A user can enter chat-specific image instructions labeled "Stil & Regeln".
- The instructions are stored with the current chat and remain available after reload.
- The instructions are applied to image generation requests in that chat.
- The visible user prompt remains editable separately from the chat-specific instructions.
- Repeating an earlier prompt uses the current chat-specific instructions.
- Automatic chat title generation is not affected by the image instructions.

### Design for mobile first
**Type:** Constraint  
**Description:** The system must prioritize small-screen usability for the image generation workflow.  
**Acceptance Criteria:**
- Prompt entry, image results, and per-image actions are documented for small-screen use.
- The documented concept excludes a desktop-only image workflow that is only scaled down.

### Keep the core generation path quickly reachable on mobile
**Type:** Non-functional  
**Description:** On mobile, the path from prompt entry to image generation must stay quickly reachable.  
**Acceptance Criteria:**
- The documented mobile flow keeps prompt entry quickly accessible.
- Permanently visible side areas do not block the main generation path.

### Keep image actions reachable on mobile
**Type:** Non-functional  
**Description:** On mobile, image actions must remain reachable without pushing images out of focus.  
**Acceptance Criteria:**
- Image actions remain available on small screens.
- The documented mobile UI avoids crowding out images with too many persistent controls.

### Support light and dark themes
**Type:** Functional  
**Description:** The system must support both light and dark themes.  
**Acceptance Criteria:**
- The documented theme behavior includes a light theme.
- The documented theme behavior includes a dark theme.
