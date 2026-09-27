import type { ProviderConfigEntity, ModelType } from "../../../db/entities";
import type { ImageModel, ProviderId, SelectedImageRoute, StaticModel } from "./types";
import { defaultImageModelId, historicalEditModels, models, providerDefinitions } from "./catalogue";

export function selectableModelId(id: string): string {
  return historicalEditModels[id]?.currentId ?? id;
}

export function listModels(): StaticModel[] {
  return [...models].sort((left, right) => left.providerId.localeCompare(right.providerId, "de", { sensitivity: "base" }) || left.name.localeCompare(right.name, "de", { sensitivity: "base" }));
}

export function listModelsByProvider(providerId: ProviderId): StaticModel[] {
  return listModels().filter((model) => model.providerId === providerId);
}

export function getModel(id: string): StaticModel | undefined {
  const model = models.find((entry) => entry.id === selectableModelId(id));
  const historical = historicalEditModels[id];
  return historical && model ? { ...model, id, name: historical.name } : model;
}

export function listUsableModels(types: ModelType[], providers: ProviderConfigEntity[], disabled: string[] = []): StaticModel[] {
  return listModels().filter((model) => types.includes(model.type) && isModelUsable(model, providers, disabled));
}

export function selectDefaultImageModel(available: StaticModel[], selectedId?: string | null): StaticModel | undefined {
  return available.find((model) => model.id === (selectedId || defaultImageModelId)) ?? available[0];
}

export function isModelEnabled(model: StaticModel, disabled: string[] = []): boolean {
  return !disabled.includes(model.id);
}

export function isModelEffectivelyEnabled(model: StaticModel, providers: ProviderConfigEntity[], disabled: string[] = []): boolean {
  const provider = providers.find((entry) => entry.id === model.providerId);
  return Boolean(provider && provider.enabled !== false && isModelEnabled(model, disabled));
}

export function isModelUsable(model: StaticModel, providers: ProviderConfigEntity[], disabled: string[] = []): boolean {
  const provider = providers.find((entry) => entry.id === model.providerId);
  return Boolean(provider?.baseUrl.trim() && provider.apiKey?.trim() && isModelEffectivelyEnabled(model, providers, disabled));
}

export function hasRequiredEnabledModels(providers: ProviderConfigEntity[], disabled: string[] = []): boolean {
  const enabled = listModels().filter((model) => isModelEffectivelyEnabled(model, providers, disabled));
  return enabled.some((model) => model.type !== "text") && enabled.some(modelSupportsImageInput);
}

export function canDisableModel(id: string, providers: ProviderConfigEntity[], disabled: string[] = []): boolean {
  return disabled.includes(id) || hasRequiredEnabledModels(providers, [...disabled, id]);
}

export function canDisableProvider(id: string, providers: ProviderConfigEntity[], disabled: string[] = []): boolean {
  const provider = providers.find((entry) => entry.id === id);
  return !provider || provider.enabled === false || hasRequiredEnabledModels(providers.map((entry) => entry.id === id ? { ...entry, enabled: false } : entry), disabled);
}

export function modelSupportsReferenceImages(model?: StaticModel): boolean {
  return model?.type !== "text" && Boolean(model?.routes.edit);
}

export function modelSupportsImageInput(model?: StaticModel): boolean {
  return model?.type === "text" && model.supportsImageInput === true;
}

export function modelRequiresReferenceImages(model?: StaticModel): boolean {
  return model?.type !== "text" && Boolean(model?.routes.edit && !model.routes.create);
}

export function selectImageRoute(model: ImageModel, hasReferences: boolean): SelectedImageRoute {
  const kind = hasReferences ? "edit" : "create";
  const route = model.routes[kind];
  if (!route) throw new Error(`Missing ${kind} route for ${model.id}`);
  return { kind, ...route };
}

export function getProviderDefinition(id: string) {
  return providerDefinitions.find((provider) => provider.id === id);
}

export function getModelLabel(model: StaticModel): string {
  return `${getProviderDefinition(model.providerId)?.label ?? model.providerId}: ${model.name}`;
}

export function getSelectableModelLabel(model: StaticModel, suffixes: { createOnly: string; editOnly: string }): string {
  const label = getModelLabel(model);
  if (model.type === "text" || (model.routes.create && model.routes.edit)) return label;
  return `${label} (${model.routes.create ? suffixes.createOnly : suffixes.editOnly})`;
}
