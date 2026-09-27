import type {
  JsonValue,
  ModelType,
  ProviderConfigEntity,
} from "../../../db/entities";
import type { SelectedImageRoute, TextModel } from "../models/types";
import { buildImagePrompt } from "./imagePrompt";
import { requestChatCompletion } from "./chatCompletion";
import { base64ToBlob } from "../../images/imageEncoding";
import { fetchProvider, responseToSafeError } from "./sanitize";
import type { ImageGenerationInput, NormalizedGenerationOutput, ProviderAdapter, TextGenerationInput } from "./types";
import i18n from "../../../i18n/i18n";

interface OpenRouterImageResponse {
  created?: number;
  data?: Array<{ b64_json?: string; media_type?: string }>;
}

export class OpenRouterProvider implements ProviderAdapter {
  id = "openrouter";
  label = "OpenRouter";

  generateText(model: TextModel, providerConfig: ProviderConfigEntity, input: TextGenerationInput): Promise<string> {
    return requestChatCompletion(model, {
      url: `${providerConfig.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
    }, input);
  }

  supportsModelType(type: ModelType): boolean {
    return type === "image" || type === "image-edit" || type === "text";
  }

  async generateImage(
    route: SelectedImageRoute,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    const maxImages = route.maxImagesPerRequest ?? 1;
    const images: NormalizedGenerationOutput["images"] = [];
    let rawMetadata: NormalizedGenerationOutput["rawMetadata"];
    for (
      let remaining = input.imageCount;
      remaining > 0;
      remaining -= maxImages
    ) {
      const output = await this.requestImageBatch(
        route,
        providerConfig,
        { ...input, imageCount: Math.min(remaining, maxImages) },
        signal,
      );
      images.push(...output.images);
      rawMetadata = output.rawMetadata;
    }
    return { images, rawMetadata };
  }

  private async requestImageBatch(
    route: SelectedImageRoute,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    const response = await fetchProvider(
      `${providerConfig.baseUrl.replace(/\/+$/, "")}/images`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: route.providerModelName,
          prompt: buildImagePrompt(input),
          n: input.imageCount,
          aspect_ratio: mapAspectRatio(input.aspectRatio),
          ...(route.defaultParameters ?? {}),
          ...stripReservedImageParameters(input.parameters),
          ...(route.kind === "edit" && input.references?.length
            ? {
                input_references: input.references.map((url) => ({
                  type: "image_url",
                  image_url: { url },
                })),
              }
            : {}),
        }),
        signal,
      },
    );

    if (!response.ok) throw new Error(await responseToSafeError(response));

    const payload = (await response.json()) as OpenRouterImageResponse;
    const images = (payload.data ?? []).flatMap((item) => {
      if (!item.b64_json) return [];
      return [
        {
          blob: base64ToBlob(item.b64_json, item.media_type),
          mimeType: item.media_type,
        },
      ];
    });
    if (images.length === 0) throw new Error(i18n.t("errors.providerNoImage"));
    return { images, rawMetadata: { created: payload.created ?? null } };
  }
}

function stripReservedImageParameters(
  parameters?: Record<string, JsonValue>,
): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(parameters ?? {}).filter(
      ([key]) => key !== "input_references" && key !== "model" && key !== "n",
    ),
  );
}

function mapAspectRatio(aspectRatio: string): string {
  if (aspectRatio === "portrait") return "9:16";
  if (aspectRatio === "landscape") return "16:9";
  return "1:1";
}
