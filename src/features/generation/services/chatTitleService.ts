import { chatRepository } from "../../../db/repositories/chatRepository";
import { isModelUsable, modelConfigRepository } from "../../../db/repositories/modelConfigRepository";
import { getProviderForModel } from "../providers/registry";

const titleSystemPrompt = `Du erzeugst kurze Titel für Bildgenerierungs-Chats.
Antworte nur mit dem Titel.
Keine Anführungszeichen.
Keine Einleitung.
Kein Satzzeichen am Ende.
Maximal 5 Wörter.
Sprache: Deutsch, außer der Prompt ist offensichtlich anderssprachig.`;

export async function generateChatTitle(chatId: string, modelConfigId: string, prompt: string): Promise<void> {
  const model = await modelConfigRepository.get(modelConfigId);
  if (!model || !isModelUsable(model, "chat")) return;

  const provider = getProviderForModel(model);
  const rawTitle = await provider.generateText(model, {
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
