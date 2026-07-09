import { chatRepository } from "../../../db/repositories/chatRepository";
import { isProviderUsable, providerConfigRepository } from "../../../db/repositories/providerConfigRepository";
import { getModel } from "../models/registry";
import { getProviderForModel } from "../providers/registry";

const titleSystemPrompt = `Du erzeugst kurze Titel für Bildgenerierungs-Chats.
Antworte nur mit dem Titel.
Keine Anführungszeichen.
Keine Einleitung.
Kein Satzzeichen am Ende.
Maximal 5 Wörter.
Sprache: Deutsch, außer der Prompt ist offensichtlich anderssprachig.`;

export async function generateChatTitle(chatId: string, modelId: string, prompt: string): Promise<void> {
  const model = getModel(modelId);
  const providerConfig = model ? await providerConfigRepository.get(model.providerId) : undefined;
  if (!model || model.type !== "text" || !providerConfig || !isProviderUsable(providerConfig)) return;

  const provider = getProviderForModel(model);
  const rawTitle = await provider.generateText(model, providerConfig, {
    system: titleSystemPrompt,
    prompt: `Erzeuge einen kurzen Titel für diesen Bildprompt:\n${prompt}`
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
