import { chatRepository } from "../../../db/repositories/chatRepository";
import {
  isProviderUsable,
  providerConfigRepository,
} from "../../../db/repositories/providerConfigRepository";
import { getModel, modelSupportsImageInput } from "../models/registry";
import { getProviderForModel } from "../providers/registry";
import type { NormalizedImageOutput } from "../providers/types";
import i18n from "../../../i18n/i18n";
import type { AppLanguage } from "../../../i18n/types";

function getTitleSystemPrompt(language: AppLanguage) {
  return `Create short titles for image generation chats based on the shown image.
Describe the central visible subject as a compact title.
Answer with the title only.
No quotation marks.
No introduction.
No punctuation at the end.
Maximum 5 words.
Language: ${i18n.t("chat.titleLanguage", { lng: language })}.`;
}

export async function generateChatTitle(
  chatId: string,
  modelId: string,
  image: NormalizedImageOutput,
  language: AppLanguage,
): Promise<void> {
  const model = getModel(modelId);
  const providerConfig = model
    ? await providerConfigRepository.get(model.providerId)
    : undefined;
  if (
    !model ||
    model.type !== "text" ||
    !modelSupportsImageInput(model) ||
    !providerConfig ||
    !isProviderUsable(providerConfig)
  )
    return;

  const provider = getProviderForModel(model);
  const rawTitle = await provider.generateText(model, providerConfig, {
    system: getTitleSystemPrompt(language),
    prompt: i18n.t("chat.titlePrompt", { lng: language }),
    image,
  });
  const title = normalizeTitle(rawTitle);
  if (!title) return;
  await chatRepository.updateGeneratedTitle(chatId, title);
}

function normalizeTitle(value: string): string {
  return value
    .replace(/["'`]/g, "")
    .replace(/[.!?:;,]+$/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");
}
