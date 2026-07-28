import type {
  JsonValue,
  ModelType,
  ProviderConfigEntity,
} from "../../../db/entities";
import type { StaticModel } from "../models/types";
import type {
  ImageGenerationInput,
  NormalizedGenerationOutput,
  ProviderAdapter,
  TextGenerationInput,
} from "./types";
import { responseToSafeError } from "./sanitize";
import i18n from "../../../i18n/i18n";

interface ProviderImageItem {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

interface ProviderImageResponse {
  data?: ProviderImageItem[];
  created?: number;
}

interface ProviderChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export class OpenAiCompatibleProvider implements ProviderAdapter {
  id = "openai";
  label = "OpenAI";

  supportsModelType(type: ModelType): boolean {
    return type === "image" || type === "image-edit" || type === "text";
  }

  async generateImage(
    model: StaticModel,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    if (input.references?.length) {
      return this.generateImageEdit(model, providerConfig, input, signal);
    }

    const response = await fetch(
      `${providerConfig.baseUrl.replace(/\/$/, "")}/images/generations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.buildBody(model, input)),
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
    model: StaticModel,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput> {
    const body = new FormData();
    body.append("model", model.providerModelName);
    body.append("prompt", buildImagePrompt(input));
    body.append("n", String(input.imageCount));
    body.append("size", mapAspectRatioToSize(input.aspectRatio));
    appendFormParameters(body, model.defaultParameters ?? {});
    appendFormParameters(body, input.parameters ?? {});

    for (const [index, reference] of (input.references ?? []).entries()) {
      const blob = dataUrlToBlob(reference);
      body.append(
        "image",
        blob,
        `reference-${index}.${mimeTypeToExtension(blob.type)}`,
      );
    }

    const response = await fetch(
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
    model: StaticModel,
    input: ImageGenerationInput,
  ): Record<string, JsonValue> {
    return {
      model: model.providerModelName,
      prompt: buildImagePrompt(input),
      n: input.imageCount,
      size: mapAspectRatioToSize(input.aspectRatio),
      ...(model.defaultParameters ?? {}),
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
    model: StaticModel,
    providerConfig: ProviderConfigEntity,
    input: TextGenerationInput,
  ): Promise<string> {
    const userContent = input.image
      ? [
          { type: "text", text: input.prompt },
          {
            type: "image_url",
            image_url: {
              url: await blobToDataUrl(input.image.blob),
              detail: "low",
            },
          },
        ]
      : input.prompt;
    const response = await fetch(
      this.buildChatCompletionsUrl(providerConfig),
      {
        method: "POST",
        headers: {
          Authorization: this.buildTextAuthorization(providerConfig),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.providerModelName,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: userContent },
          ],
          temperature: 0.2,
          ...(model.defaultParameters ?? {}),
          ...(input.parameters ?? {}),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(await responseToSafeError(response));
    }

    const payload = (await response.json()) as ProviderChatResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(i18n.t("errors.providerNoText"));
    return text;
  }

  protected buildChatCompletionsUrl(
    providerConfig: ProviderConfigEntity,
  ): string {
    return `${providerConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  protected buildTextAuthorization(
    providerConfig: ProviderConfigEntity,
  ): string {
    return `Bearer ${providerConfig.apiKey ?? ""}`;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error(i18n.t("errors.fileRead"))),
    );
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error(i18n.t("errors.fileRead"))),
    );
    reader.readAsDataURL(blob);
  });
}

export function buildImagePrompt(input: ImageGenerationInput): string {
  const instructions = input.instructions?.trim();
  const prompt = input.prompt.trim();
  if (!instructions) return prompt;
  return `${i18n.t("config.styleRules")}:\n${instructions}\n\nPrompt:\n${prompt}`;
}

async function imageItemToBlob(item: ProviderImageItem, signal?: AbortSignal) {
  if (item.b64_json) {
    return {
      blob: base64ToBlob(item.b64_json, "image/png"),
      mimeType: "image/png",
    };
  }
  if (item.url) {
    const response = await fetch(item.url, { signal });
    const blob = await response.blob();
    return { blob, mimeType: blob.type || "image/png" };
  }
  throw new Error(i18n.t("errors.providerNoImage"));
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return new Blob([dataUrl], { type: "text/plain" });
  const mimeType = match[1] || "image/png";
  const data = match[3];
  if (match[2]) return base64ToBlob(data, mimeType);
  return new Blob([decodeURIComponent(data)], { type: mimeType });
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
