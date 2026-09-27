import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { appOptionsRepository } from "../../db/repositories/appOptionsRepository";
import { providerConfigRepository } from "../../db/repositories/providerConfigRepository";
import { modelLoadEstimateRepository } from "../../db/repositories/modelLoadEstimateRepository";
import { listModels, listUsableModels, modelSupportsImageInput, selectDefaultImageModel } from "../generation/models/registry";

export const settingsQueries = {
  providers: queryOptions({ queryKey: ["providerConfigs"], queryFn: providerConfigRepository.list }),
  disabledModels: queryOptions({ queryKey: ["disabledModelIds"], queryFn: () => appOptionsRepository.getDisabledModelIds() }),
  defaultModel: queryOptions({ queryKey: ["defaultImageModelId"], queryFn: async () => (await appOptionsRepository.getDefaultImageModelId()) ?? null }),
  theme: queryOptions({ queryKey: ["theme"], queryFn: () => appOptionsRepository.getTheme() }),
  estimates: queryOptions({ queryKey: ["modelLoadEstimates"], queryFn: async () => {
    const entries = await Promise.all(listModels().flatMap((model) => model.type === "text" ? [] :
      Object.values(model.routes).map(async (route) => [
        `${model.providerId}::${route.providerModelName}`,
        await modelLoadEstimateRepository.getEstimatedSeconds(model.providerId, route.providerModelName),
      ] as const)));
    return Object.fromEntries(entries);
  } }),
};

export function useModelConfiguration() {
  const providers = useQuery(settingsQueries.providers);
  const disabled = useQuery(settingsQueries.disabledModels);
  const defaultModel = useQuery(settingsQueries.defaultModel);
  const imageModels = useMemo(() => listUsableModels(["image", "image-edit"], providers.data ?? [], disabled.data ?? []), [providers.data, disabled.data]);
  const titleModel = useMemo(() => listUsableModels(["text"], providers.data ?? [], disabled.data ?? []).find(modelSupportsImageInput), [providers.data, disabled.data]);
  return {
    providerConfigs: providers.data ?? [], disabledModelIds: disabled.data ?? [], imageModels,
    defaultModel: selectDefaultImageModel(imageModels, defaultModel.data),
    ready: providers.isSuccess && disabled.isSuccess && defaultModel.isSuccess,
    error: providers.error ?? disabled.error ?? defaultModel.error,
    usable: imageModels.length > 0 && Boolean(titleModel),
  };
}
