import type { AppLanguage } from "./types";

export function normalizeLanguage(value: unknown): AppLanguage | undefined {
  if (typeof value !== "string") return undefined;
  const language = value.toLowerCase().split("-")[0].split("_")[0];
  return language === "de" || language === "en" ? language : undefined;
}

export function detectBrowserLanguage(): AppLanguage {
  const languages =
    typeof navigator === "undefined"
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language];
  return (
    languages
      .map(normalizeLanguage)
      .find((language): language is AppLanguage => Boolean(language)) ?? "en"
  );
}
