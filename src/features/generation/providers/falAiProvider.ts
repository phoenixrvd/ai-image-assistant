import type { JsonValue, ModelConfigEntity, ModelType } from "../../../db/entities";
import type { ImageGenerationInput, NormalizedGenerationOutput, ProviderAdapter, TextGenerationInput } from "./types";
import { buildImagePrompt } from "./openAiCompatibleProvider";
import { responseToSafeError } from "./sanitize";

interface FalAiFile {
  url?: string;
}

interface FalAiImageResponse {
  images?: FalAiFile[];
  seed?: number;
}

export class FalAiProvider implements ProviderAdapter {
  id = "fal-ai";
  label = "fal.ai";

  supportsModelType(type: ModelType): boolean {
    return type === "image";
  }

  async generateImage(model: ModelConfigEntity, input: ImageGenerationInput): Promise<NormalizedGenerationOutput> {
    const references = input.references ?? [];
    if (references.length === 0 && model.modelName.toLowerCase().includes("/edit")) {
      throw new Error("fal.ai Edit benötigt ein Referenzbild.");
    }

    const mergedParameters = mergeParameters(model.defaultParameters, input.parameters);
    const response = await fetch(buildFalEndpointUrl(model), {
      method: "POST",
      headers: {
        Authorization: `Key ${model.apiKey ?? ""}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...stripReservedFalInputParameters(mergedParameters),
        prompt: buildImagePrompt(input),
        ...(references.length > 0 ? { image_urls: references } : {}),
        image_size: mapAspectRatioToFalImageSize(input.aspectRatio),
        num_images: input.imageCount,
        max_images: input.imageCount,
        enable_safety_checker: readBooleanParameter(mergedParameters.enable_safety_checker, false),
        sync_mode: readBooleanParameter(mergedParameters.sync_mode, true)
      })
    });

    if (!response.ok) {
      throw new Error(await responseToSafeError(response));
    }

    const payload = (await response.json()) as FalAiImageResponse;
    const images = await Promise.all((payload.images ?? []).map((entry) => falImageToBlob(entry)));
    if (images.length === 0) throw new Error("Provider-Antwort enthält kein Bild.");
    return { images, rawMetadata: { seed: payload.seed ?? null } };
  }

  async generateText(_model: ModelConfigEntity, _input: TextGenerationInput): Promise<string> {
    throw new Error("fal.ai unterstützt in dieser App keine Textmodelle.");
  }
}

function buildFalEndpointUrl(model: ModelConfigEntity): string {
  const modelName = model.modelName.trim().replace(/^\/+/, "");
  if (!modelName) return "https://fal.run";
  if (modelName.startsWith("http://") || modelName.startsWith("https://")) return modelName;

  const configuredBaseUrl = model.baseUrl.trim().replace(/\/+$/, "");
  const baseUrl = configuredBaseUrl || "https://fal.run";
  return `${baseUrl}/${modelName}`;
}

function mergeParameters(
  defaults?: Record<string, JsonValue>,
  overrides?: Record<string, JsonValue>
): Record<string, JsonValue> {
  return { ...(defaults ?? {}), ...(overrides ?? {}) };
}

function stripReservedFalInputParameters(parameters: Record<string, JsonValue>): Record<string, JsonValue> {
  const entries = Object.entries(parameters).filter(([key]) => !reservedFalInputKeys.has(key));
  return Object.fromEntries(entries);
}

const reservedFalInputKeys = new Set(["prompt", "image_urls", "image_size", "num_images", "max_images", "enable_safety_checker", "sync_mode"]);

function mapAspectRatioToFalImageSize(aspectRatio: string): string {
  if (aspectRatio === "portrait") return "portrait_16_9";
  if (aspectRatio === "landscape") return "landscape_16_9";
  return "square";
}

function readBooleanParameter(value: JsonValue | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

async function falImageToBlob(entry: FalAiFile) {
  const url = entry.url?.trim();
  if (!url) throw new Error("Provider-Antwort enthält kein Bild.");
  if (url.startsWith("data:")) {
    const blob = dataUrlToBlob(url);
    return { blob, mimeType: blob.type || "image/png" };
  }

  const response = await fetch(url);
  const blob = await response.blob();
  return { blob, mimeType: blob.type || "image/png" };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return new Blob([dataUrl], { type: "text/plain" });
  const mimeType = match[1] || "image/png";
  const data = match[3];
  if (match[2]) return base64ToBlob(data, mimeType);
  return new Blob([decodeURIComponent(data)], { type: mimeType });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}
