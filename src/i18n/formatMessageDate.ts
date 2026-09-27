import type { AppLanguage } from "./types";

export function formatMessageDate(
  value: string,
  language: AppLanguage = "en",
): string {
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
