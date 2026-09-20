import type { ProviderConfigEntity, ModelType } from "../../../db/entities";
import type { ProviderDefinition, ProviderId, StaticModel } from "./types";

export const defaultImageModelId = "openrouter-grok-imagine-edit";

export const providerDefinitions: ProviderDefinition[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  { id: "fal-ai", label: "fal.ai", defaultBaseUrl: "https://fal.run" },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
  },
];

class OpenAiImage15 implements StaticModel {
  id = "openai-image-1-5";
  providerId = "openai" as const;
  name = "Image 1.5";
  type = "image-edit" as const;
  providerModelName = "gpt-image-1.5";
  supportsReferenceImages = true;
  defaultParameters = { quality: "low" };
}

class OpenAiGpt4oMini implements StaticModel {
  id = "openai-gpt-4o-mini";
  providerId = "openai" as const;
  name = "GPT-4o mini";
  type = "text" as const;
  providerModelName = "gpt-4o-mini";
  supportsReferenceImages = false;
  supportsImageInput = true;
}

class FalOpenAiGpt4oMini implements StaticModel {
  id = "fal-openai-gpt-4o-mini";
  providerId = "fal-ai" as const;
  name = "OpenAI GPT-4o mini";
  type = "text" as const;
  providerModelName = "openai/gpt-4o-mini";
  supportsReferenceImages = false;
  supportsImageInput = true;
}

class FalSeedreamV5LiteEdit implements StaticModel {
  id = "fal-seedream-v5-lite-edit";
  providerId = "fal-ai" as const;
  name = "Seedream V5 Lite Edit";
  type = "image-edit" as const;
  providerModelName = "fal-ai/bytedance/seedream/v5/lite/edit";
  supportsReferenceImages = true;
  requiresReferenceImages = true;
  defaultParameters = {
    enable_safety_checker: false,
    sync_mode: true,
    image_size_by_aspect: {
      square: { width: 1920, height: 1920 },
      portrait: { width: 1440, height: 2560 },
      landscape: { width: 2560, height: 1440 },
    },
  };
}

class FalFlux2Flex implements StaticModel {
  id = "fal-flux-2-flex";
  providerId = "fal-ai" as const;
  name = "FLUX.2 Flex Edit";
  type = "image-edit" as const;
  providerModelName = "fal-ai/flux-2-flex/edit";
  supportsReferenceImages = true;
  requiresReferenceImages = true;
  defaultParameters = {
    enable_safety_checker: false,
    safety_tolerance: "5",
    num_inference_steps: 36,
    sync_mode: true,
    output_format: "jpeg",
    image_size_by_aspect: {
      square: "auto",
      portrait: "auto",
      landscape: "auto",
    },
  };
}

class FalFlux2Klein9bEdit implements StaticModel {
  id = "fal-flux-2-klein-9b-edit";
  providerId = "fal-ai" as const;
  name = "FLUX.2 Klein 9B Edit";
  type = "image-edit" as const;
  providerModelName = "fal-ai/flux-2/klein/9b/edit";
  supportsReferenceImages = true;
  requiresReferenceImages = true;
  defaultParameters = {
    enable_safety_checker: false,
    num_inference_steps: 8,
    sync_mode: true,
    output_format: "jpeg",
    image_size_by_aspect: {
      square: { width: 1280, height: 1280 },
      portrait: { width: 720, height: 1280 },
      landscape: { width: 1280, height: 720 },
    },
  };
}

class FalNanoBananaLiteEdit implements StaticModel {
  id = "fal-nano-banana-lite-edit";
  providerId = "fal-ai" as const;
  name = "Nano Banana Lite Edit";
  type = "image-edit" as const;
  providerModelName = "google/nano-banana-lite/edit";
  supportsReferenceImages = true;
  defaultParameters = {
    sync_mode: true,
    output_format: "png",
    safety_tolerance: "6",
    limit_generations: true,
    aspect_ratio_by_aspect: {
      square: "1:1",
      portrait: "9:16",
      landscape: "16:9",
    },
  };
}

class FalNanoBanana implements StaticModel {
  id = "fal-nano-banana";
  providerId = "fal-ai" as const;
  name = "Nano Banana";
  type = "image" as const;
  providerModelName = "fal-ai/nano-banana";
  supportsReferenceImages = false;
  defaultParameters = {
    sync_mode: true,
    output_format: "png",
    safety_tolerance: "6",
    limit_generations: true,
    aspect_ratio_by_aspect: {
      square: "1:1",
      portrait: "9:16",
      landscape: "16:9",
    },
  };
}

class FalNanoBanana2 implements StaticModel {
  id = "fal-nano-banana-2";
  providerId = "fal-ai" as const;
  name = "Nano Banana 2";
  type = "image" as const;
  providerModelName = "fal-ai/nano-banana-2";
  supportsReferenceImages = false;
  defaultParameters = {
    resolution: "0.5K",
    sync_mode: true,
    output_format: "png",
    safety_tolerance: "6",
    limit_generations: true,
    aspect_ratio_by_aspect: {
      square: "1:1",
      portrait: "9:16",
      landscape: "16:9",
    },
  };
}

class FalNanoBanana2Edit implements StaticModel {
  id = "fal-nano-banana-2-edit";
  providerId = "fal-ai" as const;
  name = "Nano Banana 2 Edit";
  type = "image-edit" as const;
  providerModelName = "fal-ai/nano-banana-2/edit";
  supportsReferenceImages = true;
  requiresReferenceImages = true;
  defaultParameters = {
    resolution: "0.5K",
    sync_mode: true,
    output_format: "png",
    safety_tolerance: "6",
    limit_generations: true,
    aspect_ratio_by_aspect: {
      square: "1:1",
      portrait: "9:16",
      landscape: "16:9",
    },
  };
}

class FalGrokImagineEdit implements StaticModel {
  id = "fal-grok-imagine-edit";
  providerId = "fal-ai" as const;
  name = "Grok Imagine Edit";
  type = "image-edit" as const;
  providerModelName = "xai/grok-imagine-image/edit";
  supportsReferenceImages = true;
  requiresReferenceImages = true;
  defaultParameters = {
    resolution: "1k",
    sync_mode: true,
    output_format: "jpeg",
    aspect_ratio_by_aspect: {
      square: "1:1",
      portrait: "9:16",
      landscape: "16:9",
    },
  };
}

class FalGrokImagineImage implements StaticModel {
  id = "fal-grok-imagine-image";
  providerId = "fal-ai" as const;
  name = "Grok Imagine";
  type = "image" as const;
  providerModelName = "xai/grok-imagine-image";
  supportsReferenceImages = false;
  defaultParameters = {
    resolution: "1k",
    sync_mode: true,
    output_format: "jpeg",
    aspect_ratio_by_aspect: {
      square: "1:1",
      portrait: "9:16",
      landscape: "16:9",
    },
  };
}

class FalOpenAiGptImage2Edit implements StaticModel {
  id = "fal-openai-gpt-image-2-edit";
  providerId = "fal-ai" as const;
  name = "OpenAI GPT Image 2 Edit";
  type = "image-edit" as const;
  providerModelName = "openai/gpt-image-2/edit";
  supportsReferenceImages = true;
  requiresReferenceImages = true;
  defaultParameters = {
    quality: "low",
    sync_mode: false,
    output_format: "webp",
    image_size_by_aspect: {
      square: "auto",
      portrait: "auto",
      landscape: "auto",
    },
  };
}

const openRouterFalModels: StaticModel[] = [
  {
    id: "openrouter-openai-gpt-4o-mini",
    providerId: "openrouter",
    name: "OpenAI GPT-4o mini",
    type: "text",
    providerModelName: "openai/gpt-4o-mini",
    supportsReferenceImages: false,
    supportsImageInput: true,
  },
  {
    id: "openrouter-seedream-v5-lite",
    providerId: "openrouter",
    name: "Seedream 5.0 Lite",
    type: "image-edit",
    providerModelName: "bytedance-seed/seedream-5-0-lite",
    supportsReferenceImages: true,
    defaultParameters: { resolution: "2K" },
  },
  {
    id: "openrouter-seedream-v5-pro",
    providerId: "openrouter",
    name: "Seedream 5.0 Pro",
    type: "image-edit",
    providerModelName: "bytedance-seed/seedream-5-0-pro",
    supportsReferenceImages: true,
    defaultParameters: { resolution: "1K" },
  },
  {
    id: "openrouter-flux-2-flex",
    providerId: "openrouter",
    name: "FLUX.2 Flex Edit",
    type: "image-edit",
    providerModelName: "black-forest-labs/flux.2-flex",
    supportsReferenceImages: true,
    defaultParameters: { output_format: "jpeg" },
  },
  {
    id: "openrouter-flux-2-klein-4b",
    providerId: "openrouter",
    name: "FLUX.2 Klein 4B Edit",
    type: "image-edit",
    providerModelName: "black-forest-labs/flux.2-klein-4b",
    supportsReferenceImages: true,
    defaultParameters: { output_format: "jpeg" },
  },
  {
    id: "openrouter-nano-banana-lite",
    providerId: "openrouter",
    name: "Nano Banana 2 Lite Edit",
    type: "image-edit",
    providerModelName: "google/gemini-3.1-flash-lite-image",
    supportsReferenceImages: true,
    defaultParameters: { resolution: "1K" },
  },
  {
    id: "openrouter-nano-banana",
    providerId: "openrouter",
    name: "Nano Banana",
    type: "image",
    providerModelName: "google/gemini-2.5-flash-image",
    supportsReferenceImages: false,
  },
  {
    id: "openrouter-nano-banana-2",
    providerId: "openrouter",
    name: "Nano Banana 2",
    type: "image",
    providerModelName: "google/gemini-3.1-flash-image",
    supportsReferenceImages: false,
    defaultParameters: { resolution: "1K" },
  },
  {
    id: "openrouter-nano-banana-2-edit",
    providerId: "openrouter",
    name: "Nano Banana 2 Edit",
    type: "image-edit",
    providerModelName: "google/gemini-3.1-flash-image",
    supportsReferenceImages: true,
    defaultParameters: { resolution: "1K" },
  },
  {
    id: "openrouter-grok-imagine-image",
    providerId: "openrouter",
    name: "Grok Imagine",
    type: "image",
    providerModelName: "x-ai/grok-imagine-image-quality",
    supportsReferenceImages: false,
    defaultParameters: { resolution: "1K" },
  },
  {
    id: "openrouter-grok-imagine-edit",
    providerId: "openrouter",
    name: "Grok Imagine Edit",
    type: "image-edit",
    providerModelName: "x-ai/grok-imagine-image-quality",
    supportsReferenceImages: true,
    defaultParameters: { resolution: "1K" },
  },
  {
    id: "openrouter-openai-gpt-image-2-edit",
    providerId: "openrouter",
    name: "OpenAI GPT Image 2 Edit",
    type: "image-edit",
    providerModelName: "openai/gpt-image-2",
    supportsReferenceImages: true,
    defaultParameters: { quality: "low" },
  },
];

const models: StaticModel[] = [
  new OpenAiImage15(),
  new OpenAiGpt4oMini(),
  new FalOpenAiGpt4oMini(),
  new FalSeedreamV5LiteEdit(),
  new FalFlux2Flex(),
  new FalFlux2Klein9bEdit(),
  new FalNanoBanana(),
  new FalNanoBananaLiteEdit(),
  new FalNanoBanana2(),
  new FalNanoBanana2Edit(),
  new FalGrokImagineImage(),
  new FalGrokImagineEdit(),
  new FalOpenAiGptImage2Edit(),
  ...openRouterFalModels,
];

export function listModels(): StaticModel[] {
  return [...models].sort(sortByProviderAndName);
}

export function listModelsByProvider(providerId: ProviderId): StaticModel[] {
  return listModels().filter((model) => model.providerId === providerId);
}

export function getModel(id: string): StaticModel | undefined {
  return models.find((model) => model.id === id);
}

export function listUsableModels(
  types: ModelType[],
  providerConfigs: ProviderConfigEntity[],
  disabledModelIds: string[] = [],
): StaticModel[] {
  return listModels().filter(
    (model) =>
      types.includes(model.type) &&
      isModelUsable(model, providerConfigs, disabledModelIds),
  );
}

export function selectDefaultImageModel(
  models: StaticModel[],
  selectedModelId?: string | null,
): StaticModel | undefined {
  if (selectedModelId)
    return models.find((model) => model.id === selectedModelId) ?? models[0];
  return models.find((model) => model.id === defaultImageModelId) ?? models[0];
}

export function isModelEnabled(
  model: StaticModel,
  disabledModelIds: string[] = [],
): boolean {
  return !disabledModelIds.includes(model.id);
}

export function isModelEffectivelyEnabled(
  model: StaticModel,
  providerConfigs: ProviderConfigEntity[],
  disabledModelIds: string[] = [],
): boolean {
  const provider = providerConfigs.find(
    (config) => config.id === model.providerId,
  );
  return Boolean(
    provider &&
    provider.enabled !== false &&
    isModelEnabled(model, disabledModelIds),
  );
}

export function isModelUsable(
  model: StaticModel,
  providerConfigs: ProviderConfigEntity[],
  disabledModelIds: string[] = [],
): boolean {
  const provider = providerConfigs.find(
    (config) => config.id === model.providerId,
  );
  return Boolean(
    provider &&
    provider.baseUrl.trim() &&
    provider.apiKey?.trim() &&
    isModelEffectivelyEnabled(model, providerConfigs, disabledModelIds),
  );
}

export function hasRequiredEnabledModels(
  providerConfigs: ProviderConfigEntity[],
  disabledModelIds: string[] = [],
): boolean {
  const enabledModels = listModels().filter((model) =>
    isModelEffectivelyEnabled(model, providerConfigs, disabledModelIds),
  );
  return (
    enabledModels.some(
      (model) => model.type === "image" || model.type === "image-edit",
    ) &&
    enabledModels.some(
      (model) => model.type === "text" && modelSupportsImageInput(model),
    )
  );
}

export function canDisableModel(
  modelId: string,
  providerConfigs: ProviderConfigEntity[],
  disabledModelIds: string[] = [],
): boolean {
  if (disabledModelIds.includes(modelId)) return true;
  return hasRequiredEnabledModels(providerConfigs, [
    ...disabledModelIds,
    modelId,
  ]);
}

export function canDisableProvider(
  providerId: string,
  providerConfigs: ProviderConfigEntity[],
  disabledModelIds: string[] = [],
): boolean {
  const provider = providerConfigs.find((entry) => entry.id === providerId);
  if (!provider || provider.enabled === false) return true;
  return hasRequiredEnabledModels(
    providerConfigs.map((entry) =>
      entry.id === providerId ? { ...entry, enabled: false } : entry,
    ),
    disabledModelIds,
  );
}

export function modelSupportsReferenceImages(model?: StaticModel): boolean {
  return model?.supportsReferenceImages === true;
}

export function modelSupportsImageInput(model?: StaticModel): boolean {
  return model?.supportsImageInput === true;
}

export function modelRequiresReferenceImages(model?: StaticModel): boolean {
  return model?.requiresReferenceImages === true;
}

export function getProviderDefinition(
  providerId: string,
): ProviderDefinition | undefined {
  return providerDefinitions.find((provider) => provider.id === providerId);
}

export function getModelLabel(model: StaticModel): string {
  const provider = getProviderDefinition(model.providerId);
  return `${provider?.label ?? model.providerId}: ${model.name}`;
}

function sortByProviderAndName(left: StaticModel, right: StaticModel): number {
  const provider = left.providerId.localeCompare(right.providerId, "de", {
    sensitivity: "base",
  });
  if (provider !== 0) return provider;
  return left.name.localeCompare(right.name, "de", { sensitivity: "base" });
}
