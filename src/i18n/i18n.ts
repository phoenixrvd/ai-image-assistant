import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { appOptionsRepository } from "../db/repositories/appOptionsRepository";
import { detectBrowserLanguage } from "./language";
import { resources } from "./locales";
import type { AppLanguage } from "./types";

export async function initializeI18n(): Promise<AppLanguage> {
  const storedLanguage = await appOptionsRepository
    .getLanguage()
    .catch(() => undefined);
  const language = storedLanguage ?? detectBrowserLanguage();
  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
  document.documentElement.lang = language;
  if (!storedLanguage)
    await appOptionsRepository.set("language", language).catch(() => undefined);
  return language;
}

export async function changeAppLanguage(language: AppLanguage) {
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
  await appOptionsRepository.set("language", language).catch(() => undefined);
}

export default i18n;
