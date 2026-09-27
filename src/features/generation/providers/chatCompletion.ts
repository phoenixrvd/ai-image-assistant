import type { TextModel } from "../models/types";
import type { TextGenerationInput } from "./types";
import { blobToDataUrl } from "../../images/imageEncoding";
import { fetchProvider, responseToSafeError } from "./sanitize";
import i18n from "../../../i18n/i18n";

export async function requestChatCompletion(model: TextModel, transport: { url: string; authorization: string }, input: TextGenerationInput): Promise<string> {
  const userContent = input.image ? [
    { type: "text", text: input.prompt },
    { type: "image_url", image_url: { url: await blobToDataUrl(input.image.blob, i18n.t("errors.fileRead")), detail: "low" } },
  ] : input.prompt;
  const response = await fetchProvider(transport.url, {
    method: "POST", headers: { Authorization: transport.authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ model: model.providerModelName, messages: [
      { role: "system", content: input.system }, { role: "user", content: userContent },
    ], temperature: 0.2, ...(model.defaultParameters ?? {}), ...(input.parameters ?? {}) }),
  });
  if (!response.ok) throw new Error(await responseToSafeError(response));
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(i18n.t("errors.providerNoText"));
  return text;
}
