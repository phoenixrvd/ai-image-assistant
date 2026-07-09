import type { JsonValue, ProviderConfigEntity } from "../../../db/entities";
import type { StaticModel } from "../models/types";
import { buildImagePrompt, OpenAiCompatibleProvider } from "./openAiCompatibleProvider";
import { responseToSafeError } from "./sanitize";
import type { ImageGenerationInput } from "./types";

export class GrokProvider extends OpenAiCompatibleProvider {
  id = "xai";
  label = "xAI / Grok";

  async generateImage(model: StaticModel, providerConfig: ProviderConfigEntity, input: ImageGenerationInput) {
    if (!input.references?.length) return super.generateImage(model, providerConfig, input);

    const defaultParameters = normalizeXaiParameters(model.defaultParameters ?? {});
    const body = {
      ...stripReservedXaiParameters(defaultParameters),
      ...stripReservedXaiParameters(input.parameters ?? {}),
      model: model.providerModelName || "grok-imagine-image",
      prompt: buildImagePrompt(input),
      n: input.imageCount,
      aspect_ratio: mapAspectRatioToXai(input.aspectRatio),
      ...(input.references.length === 1 ? { image: { url: input.references[0], type: "image_url" } } : { images: input.references.map((reference) => ({ url: reference, type: "image_url" })) }),
      response_format: "b64_json"
    };

    const response = await fetch(`${providerConfig.baseUrl.replace(/\/$/, "")}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(await responseToSafeError(response));
    }

    return this.normalize(await response.json());
  }

  protected buildBody(model: StaticModel, input: ImageGenerationInput): Record<string, JsonValue> {
    const defaultParameters = normalizeXaiParameters(model.defaultParameters ?? {});
    return {
      ...stripReservedXaiParameters(defaultParameters),
      ...stripReservedXaiParameters(input.parameters ?? {}),
      model: model.providerModelName || "grok-2-image",
      prompt: buildImagePrompt(input),
      n: input.imageCount,
      aspect_ratio: mapAspectRatioToXai(input.aspectRatio),
      response_format: "b64_json"
    };
  }
}

function normalizeXaiParameters(parameters: Record<string, JsonValue>): Record<string, JsonValue> {
  if (parameters.quality === "standard") return { ...parameters, quality: "medium" };
  if (parameters.quality === "quality") return { ...parameters, quality: "high" };
  return parameters;
}

function stripReservedXaiParameters(parameters: Record<string, JsonValue>): Record<string, JsonValue> {
  const entries = Object.entries(parameters).filter(([key]) => !reservedXaiImageKeys.has(key));
  return Object.fromEntries(entries);
}

const reservedXaiImageKeys = new Set(["model", "prompt", "n", "aspect_ratio", "image", "images", "response_format"]);

function mapAspectRatioToXai(aspectRatio: string): string {
  if (aspectRatio === "portrait") return "9:16";
  if (aspectRatio === "landscape") return "16:9";
  return "1:1";
}
