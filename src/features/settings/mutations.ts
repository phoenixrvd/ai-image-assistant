import { useMutation, useQueryClient } from "@tanstack/react-query";
import { appOptionsRepository } from "../../db/repositories/appOptionsRepository";
import { chatRepository } from "../../db/repositories/chatRepository";
import { providerConfigRepository } from "../../db/repositories/providerConfigRepository";
import type { ProviderConfigEntity, ThemeMode } from "../../db/entities";
import { settingsQueries } from "./queries";
import { changeAppLanguage } from "../../i18n/i18n";
import type { AppLanguage } from "../../i18n/types";

type SettingsChange =
  | { kind: "provider"; value: ProviderConfigEntity }
  | { kind: "disabledModels"; value: string[] }
  | { kind: "defaultModel"; value: string; previous?: string }
  | { kind: "theme"; value: ThemeMode }
  | { kind: "language"; value: AppLanguage };

export function useSettingsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["saveSettings"],
    scope: { id: "settings" },
    mutationFn: async (change: SettingsChange) => {
      switch (change.kind) {
        case "provider":
          await providerConfigRepository.save(change.value);
          break;
        case "disabledModels":
          await appOptionsRepository.setDisabledModelIds(change.value);
          break;
        case "defaultModel":
          if (change.previous)
            await chatRepository.initializeMissingImageModels(change.previous);
          await appOptionsRepository.set("defaultImageModelId", change.value);
          break;
        case "theme":
          await appOptionsRepository.set("theme", change.value);
          break;
        case "language":
          await changeAppLanguage(change.value);
          break;
      }
    },
    onMutate: async (change) => {
      await Promise.all(
        [
          settingsQueries.providers,
          settingsQueries.disabledModels,
          settingsQueries.defaultModel,
          settingsQueries.theme,
        ].map((query) => client.cancelQueries({ queryKey: query.queryKey })),
      );
      if (change.kind === "provider")
        client.setQueryData(
          settingsQueries.providers.queryKey,
          (current = []) =>
            current.map((entry) =>
              entry.id === change.value.id ? change.value : entry,
            ),
        );
      if (change.kind === "disabledModels")
        client.setQueryData(
          settingsQueries.disabledModels.queryKey,
          change.value,
        );
      if (change.kind === "defaultModel")
        client.setQueryData(
          settingsQueries.defaultModel.queryKey,
          change.value,
        );
      if (change.kind === "theme")
        client.setQueryData(settingsQueries.theme.queryKey, change.value);
    },
    onSettled: async () => {
      // Reconcile only when the serialized queue drains, never roll an older
      // mutation back over a more recent optimistic edit.
      if (client.isMutating({ mutationKey: ["saveSettings"] }) !== 1) return;
      await Promise.all(
        [
          settingsQueries.providers,
          settingsQueries.disabledModels,
          settingsQueries.defaultModel,
          settingsQueries.theme,
        ].map((query) =>
          client.invalidateQueries({ queryKey: query.queryKey }),
        ),
      );
    },
  });
}
