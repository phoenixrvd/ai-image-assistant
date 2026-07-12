import type { JsonValue, ModelType, ProviderConfigEntity } from "../../../db/entities";
import type { StaticModel } from "../models/types";
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
    return type === "image" || type === "image-edit";
  }

  async generateImage(model: StaticModel, providerConfig: ProviderConfigEntity, input: ImageGenerationInput): Promise<NormalizedGenerationOutput> {
    const references = model.supportsReferenceImages ? (input.references ?? []) : [];
    const mergedParameters = mergeParameters(model.defaultParameters, input.parameters);
    const body: Record<string, JsonValue> = {
      ...stripReservedFalInputParameters(mergedParameters),
      prompt: buildImagePrompt(input),
      ...(references.length > 0 ? { image_urls: references } : {}),
      num_images: input.imageCount,
      sync_mode: readBooleanParameter(mergedParameters.sync_mode, true)
    };

    if (usesFalAspectRatioParameter(mergedParameters)) {
      body.aspect_ratio = readFalAspectRatio(mergedParameters, input.aspectRatio);
    } else {
      body.image_size = readFalImageSize(mergedParameters, input.aspectRatio);
    }

    if (hasFalParameter(mergedParameters, "enable_safety_checker")) {
      body.enable_safety_checker = false;
    }

    const response = await fetchFalModelApi(buildFalEndpointUrl(model, providerConfig), {
      method: "POST",
      headers: {
        Authorization: `Key ${providerConfig.apiKey ?? ""}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(await responseToSafeError(response));
    }

    const payload = (await response.json()) as FalAiImageResponse;
    const images = await Promise.all((payload.images ?? []).map((entry) => falImageToBlob(entry)));
    if (images.length === 0) throw new Error("Provider-Antwort enthält kein Bild.");
    return { images, rawMetadata: { seed: payload.seed ?? null } };
  }

  async generateText(_model: StaticModel, _providerConfig: ProviderConfigEntity, _input: TextGenerationInput): Promise<string> {
    throw new Error("fal.ai unterstützt in dieser App keine Textmodelle.");
  }
}

function fetchFalModelApi(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Fal-Store-IO", "0");
  return fetch(url, { ...init, headers });
}

function buildFalEndpointUrl(model: StaticModel, providerConfig: ProviderConfigEntity): string {
  const modelName = model.providerModelName.trim().replace(/^\/+/, "");
  if (!modelName) return "https://fal.run";
  if (modelName.startsWith("http://") || modelName.startsWith("https://")) return modelName;

  const configuredBaseUrl = providerConfig.baseUrl.trim().replace(/\/+$/, "");
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

const reservedFalInputKeys = new Set(["prompt", "image_urls", "image_size", "image_size_by_aspect", "aspect_ratio", "aspect_ratio_by_aspect", "num_images", "max_images", "enable_safety_checker", "sync_mode"]);

function usesFalAspectRatioParameter(parameters: Record<string, JsonValue>): boolean {
  return hasFalParameter(parameters, "aspect_ratio_by_aspect");
}

function hasFalParameter(parameters: Record<string, JsonValue>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(parameters, key);
}

function readFalAspectRatio(parameters: Record<string, JsonValue>, aspectRatio: string): JsonValue {
  const byAspect = parameters.aspect_ratio_by_aspect;
  if (byAspect && typeof byAspect === "object" && !Array.isArray(byAspect)) {
    const value = byAspect[aspectRatio];
    if (value) return value;
  }
  return mapAspectRatioToFalAspectRatio(aspectRatio);
}

function mapAspectRatioToFalAspectRatio(aspectRatio: string): string {
  if (aspectRatio === "portrait") return "9:16";
  if (aspectRatio === "landscape") return "16:9";
  return "1:1";
}

function readFalImageSize(parameters: Record<string, JsonValue>, aspectRatio: string): JsonValue {
  const byAspect = parameters.image_size_by_aspect;
  if (byAspect && typeof byAspect === "object" && !Array.isArray(byAspect)) {
    const value = byAspect[aspectRatio];
    if (value) return value;
  }
  return mapAspectRatioToFalImageSize(aspectRatio);
}

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
