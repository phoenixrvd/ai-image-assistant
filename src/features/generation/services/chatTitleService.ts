import { chatRepository } from "../../../db/repositories/chatRepository";
import { isProviderUsable, providerConfigRepository } from "../../../db/repositories/providerConfigRepository";
import { getModel, modelSupportsImageInput } from "../models/registry";
import { getProviderForModel } from "../providers/registry";
import type { NormalizedImageOutput } from "../providers/types";

const titleSystemPrompt = `Du erzeugst kurze Titel für Bildgenerierungs-Chats anhand des gezeigten Bildes.
Beschreibe das zentrale sichtbare Motiv als kompakten Titel.
Antworte nur mit dem Titel.
Keine Anführungszeichen.
Keine Einleitung.
Kein Satzzeichen am Ende.
Maximal 5 Wörter.
Sprache: Deutsch.`;

export async function generateChatTitle(chatId: string, modelId: string, image: NormalizedImageOutput): Promise<void> {
  const model = getModel(modelId);
  const providerConfig = model ? await providerConfigRepository.get(model.providerId) : undefined;
  if (!model || model.type !== "text" || !modelSupportsImageInput(model) || !providerConfig || !isProviderUsable(providerConfig)) return;

  const provider = getProviderForModel(model);
  const rawTitle = await provider.generateText(model, providerConfig, {
    system: titleSystemPrompt,
    prompt: "Erzeuge einen kurzen Titel für dieses Bild.",
    image
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
