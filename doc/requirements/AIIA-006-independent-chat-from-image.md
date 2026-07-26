---
state: implemented
---

# AIIA-006: Independent Chat from Image

## Context
Users need to continue work from the generation settings of a selected image without coupling the new work to the source chat's history or image records.

## Assumptions
- The selected image has an available historical generation request.
- The historical request contains the effective prompt, model ID, and generation parameters.

## Open Questions
- None

## Requirements

### Create an independent chat from a selected image
**Type:** Functional  
**Description:** The system must create a new chat from an individual generated image and its historical generation request.  
**Acceptance Criteria:**
- The new chat has a new chat ID and the initial title `Neue Sitzung`.
- The first message in the new chat is an independent copy of the selected image's source message, including its role, content, and metadata.
- The copied message has a new message ID and chat ID and does not retain the source request ID.
- The selected image is copied as the result image of the copied first message, with a new image ID, chat ID, and message ID.
- No other messages, images, generation requests, or generation results are copied.
- The new chat restores the selected image's historical prompt as its prompt draft.
- The new chat restores the historical model ID, image count, aspect ratio, and `Stil & Regeln` instructions.
- The new chat starts without uploaded or pinned reference images; the copied image remains a displayed message result, not a reference.
- Changes made after creation in either chat do not affect the other chat.

### Copy the selected message image independently
**Type:** Constraint  
**Description:** The system must copy the selected image content as an independent message result without retaining a source image relationship.  
**Acceptance Criteria:**
- The derived chat has no uploaded reference for the selected image.
- The copied image stores no source image ID, message ID, request ID, or result ID relationship.
- Deleting the source message or source chat does not remove or invalidate the copied image.
- The copied image has its own chat and message ownership and is removed when the derived chat is deleted.
- Creating the chat duplicates image content and increases browser storage use by approximately the selected image size.
- A failed persistence operation does not create a partial chat.
