import type {
  JsonValue,
  ModelType,
  ProviderConfigEntity,
} from "../../../db/entities";
import type { SelectedImageRoute, TextModel } from "../models/types";
import type { ImageGenerationInput, NormalizedGenerationOutput, ProviderAdapter, TextGenerationInput } from "./types";
import { buildImagePrompt } from "./imagePrompt";
import { requestChatCompletion } from "./chatCompletion";
import { dataUrlToBlob } from "../../images/imageEncoding";
import { fetchProvider, responseToSafeError } from "./sanitize";
import i18n from "../../../i18n/i18n";

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
    return type === "image" || type === "image-edit" || type === "text";
  }

  async generateImage(
    route: SelectedImageRoute,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    const references = route.kind === "edit" ? (input.references ?? []) : [];
    const mergedParameters = mergeParameters(
      route.defaultParameters,
      input.parameters,
    );
    const body: Record<string, JsonValue> = {
      ...stripReservedFalInputParameters(mergedParameters),
      prompt: buildImagePrompt(input),
      ...(references.length > 0 ? { image_urls: references } : {}),
      num_images: input.imageCount,
      sync_mode: readBooleanParameter(mergedParameters.sync_mode, true),
    };

    if (usesFalAspectRatioParameter(mergedParameters)) {
      body.aspect_ratio = readFalAspectRatio(
        mergedParameters,
        input.aspectRatio,
      );
    } else {
      body.image_size = readFalImageSize(mergedParameters, input.aspectRatio);
    }

    if (hasFalParameter(mergedParameters, "enable_safety_checker")) {
      body.enable_safety_checker = false;
    }

    const response = await fetchFalModelApi(
      buildFalEndpointUrl(route, providerConfig),
      {
        method: "POST",
        headers: {
          Authorization: `Key ${providerConfig.apiKey ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(await responseToSafeError(response));
    }

    const payload = (await response.json()) as FalAiImageResponse;
    const images = await Promise.all(
      (payload.images ?? []).map((entry) => falImageToBlob(entry, signal)),
    );
    if (images.length === 0) throw new Error(i18n.t("errors.providerNoImage"));
    return { images, rawMetadata: { seed: payload.seed ?? null } };
  }

  generateText(model: TextModel, providerConfig: ProviderConfigEntity, input: TextGenerationInput): Promise<string> {
    const baseUrl = providerConfig.baseUrl.trim().replace(/\/+$/, "");
    return requestChatCompletion(model, {
      url: `${baseUrl}/openrouter/router/openai/v1/chat/completions`,
      authorization: `Key ${providerConfig.apiKey ?? ""}`,
    }, input);
  }
}

function fetchFalModelApi(url: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Fal-Store-IO", "0");
  return fetchProvider(url, { ...init, headers });
}

function buildFalEndpointUrl(
  route: SelectedImageRoute,
  providerConfig: ProviderConfigEntity,
): string {
  const modelName = route.providerModelName.trim().replace(/^\/+/, "");
  if (!modelName) return "https://fal.run";
  if (modelName.startsWith("http://") || modelName.startsWith("https://"))
    return modelName;

  const configuredBaseUrl = providerConfig.baseUrl.trim().replace(/\/+$/, "");
  const baseUrl = configuredBaseUrl || "https://fal.run";
  return `${baseUrl}/${modelName}`;
}

function mergeParameters(
  defaults?: Record<string, JsonValue>,
  overrides?: Record<string, JsonValue>,
): Record<string, JsonValue> {
  return { ...(defaults ?? {}), ...(overrides ?? {}) };
}

function stripReservedFalInputParameters(
  parameters: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const entries = Object.entries(parameters).filter(
    ([key]) => !reservedFalInputKeys.has(key),
  );
  return Object.fromEntries(entries);
}

const reservedFalInputKeys = new Set([
  "prompt",
  "image_urls",
  "image_size",
  "image_size_by_aspect",
  "aspect_ratio",
  "aspect_ratio_by_aspect",
  "num_images",
  "max_images",
  "enable_safety_checker",
  "sync_mode",
]);

function usesFalAspectRatioParameter(
  parameters: Record<string, JsonValue>,
): boolean {
  return hasFalParameter(parameters, "aspect_ratio_by_aspect");
}

function hasFalParameter(
  parameters: Record<string, JsonValue>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(parameters, key);
}

function readFalAspectRatio(
  parameters: Record<string, JsonValue>,
  aspectRatio: string,
): JsonValue {
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

function readFalImageSize(
  parameters: Record<string, JsonValue>,
  aspectRatio: string,
): JsonValue {
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

function readBooleanParameter(
  value: JsonValue | undefined,
  fallback: boolean,
): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

async function falImageToBlob(entry: FalAiFile, signal?: AbortSignal) {
  const url = entry.url?.trim();
  if (!url) throw new Error(i18n.t("errors.providerNoImage"));
  if (url.startsWith("data:")) {
    const blob = dataUrlToBlob(url);
    return { blob, mimeType: blob.type || "image/png" };
  }

  const response = await fetchProvider(url, { signal });
  if (!response.ok) throw new Error(await responseToSafeError(response));
  const blob = await response.blob();
  return { blob, mimeType: blob.type || "image/png" };
}
