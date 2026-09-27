import type { GenerationRequestEntity, JsonValue } from "../../db/entities";
import { isValidAspectRatio, isValidImageCount } from "../chats/types";
import { selectableModelId } from "./models/registry";
import type { StoredReference } from "./types";

export function getHistoricalChatSettings(request: GenerationRequestEntity) {
  const parameters = request.parameters ?? {};
  return {
    promptDraft: request.prompt,
    activeImageModelId: selectableModelId(request.modelId),
    imageCount: isValidImageCount(parameters.imageCount)
      ? parameters.imageCount
      : undefined,
    aspectRatio: isValidAspectRatio(parameters.aspectRatio)
      ? parameters.aspectRatio
      : undefined,
    imageInstructions:
      typeof parameters.imageInstructions === "string"
        ? parameters.imageInstructions
        : undefined,
  };
}

export function readRequestReferences(
  request: GenerationRequestEntity,
): StoredReference[] | undefined {
  if (request.preparedReferences) return request.preparedReferences;
  const value = request.parameters?.references;
  if (Array.isArray(value)) return value.filter(isStoredReference).slice(0, 3);
  if (value && typeof value === "object" && value.count === 0) return [];
  return undefined;
}

function isStoredReference(value: JsonValue): value is StoredReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.dataUrl !== "string") return false;
  return (
    (value.type === "pinned" && typeof value.imageId === "string") ||
    (value.type === "uploaded" && typeof value.name === "string")
  );
}
