import type {
  JsonValue,
  ModelType,
  ProviderConfigEntity,
} from "../../../db/entities";
import type { SelectedImageRoute, TextModel } from "../models/types";
import type {
  ImageGenerationInput,
  NormalizedGenerationOutput,
  ProviderAdapter,
  TextGenerationInput,
} from "./types";
import { fetchProvider, responseToSafeError } from "./sanitize";
import i18n from "../../../i18n/i18n";
import { base64ToBlob, dataUrlToBlob } from "../../images/imageEncoding";
import { requestChatCompletion } from "./chatCompletion";
import { buildImagePrompt } from "./imagePrompt";

interface ProviderImageItem {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

interface ProviderImageResponse {
  data?: ProviderImageItem[];
  created?: number;
}

export class OpenAiCompatibleProvider implements ProviderAdapter {
  id = "openai";
  label = "OpenAI";

  supportsModelType(type: ModelType): boolean {
    return type === "image" || type === "image-edit" || type === "text";
  }

  async generateImage(
    route: SelectedImageRoute,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    if (route.kind === "edit") {
      return this.generateImageEdit(route, providerConfig, input, signal);
    }

    const response = await fetchProvider(
      `${providerConfig.baseUrl.replace(/\/$/, "")}/images/generations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.buildBody(route, input)),
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(await responseToSafeError(response));
    }

    const payload = (await response.json()) as ProviderImageResponse;
    return this.normalize(payload, signal);
  }

  protected async generateImageEdit(
    route: SelectedImageRoute,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    const body = new FormData();
    body.append("model", route.providerModelName);
    body.append("prompt", buildImagePrompt(input));
    body.append("n", String(input.imageCount));
    body.append("size", mapAspectRatioToSize(input.aspectRatio));
    appendFormParameters(body, route.defaultParameters ?? {});
    appendFormParameters(body, input.parameters ?? {});

    for (const [index, reference] of (input.references ?? []).entries()) {
      const blob = dataUrlToBlob(reference);
      body.append(
        "image",
        blob,
        `reference-${index}.${mimeTypeToExtension(blob.type)}`,
      );
    }

    const response = await fetchProvider(
      `${providerConfig.baseUrl.replace(/\/$/, "")}/images/edits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
        },
        body,
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(await responseToSafeError(response));
    }

    const payload = (await response.json()) as ProviderImageResponse;
    return this.normalize(payload, signal);
  }

  protected buildBody(
    route: SelectedImageRoute,
    input: ImageGenerationInput,
  ): Record<string, JsonValue> {
    return {
      model: route.providerModelName,
      prompt: buildImagePrompt(input),
      n: input.imageCount,
      size: mapAspectRatioToSize(input.aspectRatio),
      ...(route.defaultParameters ?? {}),
      ...(input.parameters ?? {}),
    };
  }

  protected async normalize(
    payload: ProviderImageResponse,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    const images = await Promise.all(
      (payload.data ?? []).map((item) => imageItemToBlob(item, signal)),
    );
    return { images, rawMetadata: { created: payload.created ?? null } };
  }

  async generateText(
    model: TextModel,
    providerConfig: ProviderConfigEntity,
    input: TextGenerationInput,
  ): Promise<string> {
    return requestChatCompletion(model, {
      url: `${providerConfig.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
    }, input);
  }
}

async function imageItemToBlob(item: ProviderImageItem, signal?: AbortSignal) {
  if (item.b64_json) {
    return {
      blob: base64ToBlob(item.b64_json, "image/png"),
      mimeType: "image/png",
    };
  }
  if (item.url) {
    const response = await fetchProvider(item.url, { signal });
    if (!response.ok) throw new Error(await responseToSafeError(response));
    const blob = await response.blob();
    return { blob, mimeType: blob.type || "image/png" };
  }
  throw new Error(i18n.t("errors.providerNoImage"));
}

function appendFormParameters(
  body: FormData,
  parameters: Record<string, JsonValue>,
) {
  for (const [key, value] of Object.entries(parameters)) {
    if (value === null || value === undefined) continue;
    body.append(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  }
}

function mimeTypeToExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function mapAspectRatioToSize(aspectRatio: string): string {
  if (aspectRatio === "portrait") return "1024x1536";
  if (aspectRatio === "landscape") return "1536x1024";
  return "1024x1024";
}
