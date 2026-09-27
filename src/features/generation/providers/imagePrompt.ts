import type { ImageGenerationInput } from "./types";
import i18n from "../../../i18n/i18n";

export function buildImagePrompt(input: ImageGenerationInput): string {
  const instructions = input.instructions?.trim();
  const prompt = input.prompt.trim();
  return instructions
    ? `${i18n.t("config.styleRules")}:\n${instructions}\n\nPrompt:\n${prompt}`
    : prompt;
}
