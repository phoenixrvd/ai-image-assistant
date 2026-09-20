import type { JsonValue, ModelType, ProviderConfigEntity } from "../../../db/entities";
import type { StaticModel } from "../models/types";
import { buildImagePrompt, OpenAiCompatibleProvider } from "./openAiCompatibleProvider";
import { responseToSafeError } from "./sanitize";
import type { ImageGenerationInput, NormalizedGenerationOutput } from "./types";
import i18n from "../../../i18n/i18n";

interface OpenRouterImageResponse {
  created?: number;
  data?: Array<{ b64_json?: string; media_type?: string }>;
}

export class OpenRouterProvider extends OpenAiCompatibleProvider {
  id = "openrouter";
  label = "OpenRouter";

  supportsModelType(type: ModelType): boolean {
    return type === "image" || type === "image-edit" || type === "text";
  }

  async generateImage(
    model: StaticModel,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    const response = await fetch(`${providerConfig.baseUrl.replace(/\/+$/, "")}/images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.providerModelName,
        prompt: buildImagePrompt(input),
        n: input.imageCount,
        aspect_ratio: mapAspectRatio(input.aspectRatio),
        ...(model.supportsReferenceImages && input.references?.length
          ? {
              input_references: input.references.map((url) => ({
                type: "image_url",
                image_url: { url },
              })),
            }
          : {}),
        ...(model.defaultParameters ?? {}),
        ...(input.parameters ?? {}),
      }),
      signal,
    });

    if (!response.ok) throw new Error(await responseToSafeError(response));

    const payload = (await response.json()) as OpenRouterImageResponse;
    const images = (payload.data ?? []).flatMap((item) => {
      if (!item.b64_json) return [];
      return [{ blob: base64ToBlob(item.b64_json, item.media_type), mimeType: item.media_type }];
    });
    if (images.length === 0) throw new Error(i18n.t("errors.providerNoImage"));
    return { images, rawMetadata: { created: payload.created ?? null } };
  }
}

function mapAspectRatio(aspectRatio: string): string {
  if (aspectRatio === "portrait") return "9:16";
  if (aspectRatio === "landscape") return "16:9";
  return "1:1";
}

function base64ToBlob(base64: string, mimeType = "image/png"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}
