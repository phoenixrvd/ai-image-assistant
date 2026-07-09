import type { ProviderConfigEntity, ModelType } from "../../../db/entities";
import type { ProviderDefinition, ProviderId, StaticModel } from "./types";

export const providerDefinitions: ProviderDefinition[] = [
  { id: "xai", label: "xAI / Grok", defaultBaseUrl: "https://api.x.ai/v1" },
  { id: "openai", label: "OpenAI", defaultBaseUrl: "https://api.openai.com/v1" },
  { id: "fal-ai", label: "fal.ai", defaultBaseUrl: "https://fal.run" }
];

class GrokImagineImage implements StaticModel {
  id = "grok-imagine-image";
  providerId = "xai" as const;
  name = "Imagine Image";
  type = "image" as const;
  providerModelName = "grok-imagine-image";
  supportsReferenceImages = false;
  defaultParameters = { quality: "low" };
}

class GrokImagineImageQuality implements StaticModel {
  id = "grok-imagine-image-quality";
  providerId = "xai" as const;
  name = "Imagine Image Quality";
  type = "image-edit" as const;
  providerModelName = "grok-imagine-image-quality";
  supportsReferenceImages = true;
  defaultParameters = { quality: "low" };
}

class OpenAiImage15 implements StaticModel {
  id = "openai-image-1-5";
  providerId = "openai" as const;
  name = "Image 1.5";
  type = "image-edit" as const;
  providerModelName = "gpt-image-1.5";
  supportsReferenceImages = true;
  defaultParameters = { quality: "low" };
}

class OpenAiSmallText implements StaticModel {
  id = "openai-small-text";
  providerId = "openai" as const;
  name = "Small Text";
  type = "text" as const;
  providerModelName = "gpt-4.1-nano";
  supportsReferenceImages = false;
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
    include_max_images: true,
    sync_mode: true,
    image_size_by_aspect: {
      square: { width: 1920, height: 1920 },
      portrait: { width: 1440, height: 2560 },
      landscape: { width: 2560, height: 1440 }
    }
  };
}

class FalFlux2Flex implements StaticModel {
  id = "fal-flux-2-flex";
  providerId = "fal-ai" as const;
  name = "FLUX.2 Flex";
  type = "image-edit" as const;
  providerModelName = "fal-ai/flux-2-flex/edit";
  supportsReferenceImages = true;
  requiresReferenceImages = true;
  defaultParameters = {
    enable_safety_checker: false,
    safety_tolerance: "2",
    num_inference_steps: 36,
    sync_mode: true,
    output_format: "jpeg",
    image_size_by_aspect: {
      square: "auto",
      portrait: "auto",
      landscape: "auto"
    }
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
      landscape: { width: 1280, height: 720 }
    }
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
      square: "auto",
      portrait: "auto",
      landscape: "auto"
    }
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
      landscape: "16:9"
    }
  };
}

const models: StaticModel[] = [
  new GrokImagineImage(),
  new GrokImagineImageQuality(),
  new OpenAiImage15(),
  new OpenAiSmallText(),
  new FalSeedreamV5LiteEdit(),
  new FalFlux2Flex(),
  new FalFlux2Klein9bEdit(),
  new FalGrokImagineImage(),
  new FalGrokImagineEdit()
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

export function listUsableModels(types: ModelType[], providerConfigs: ProviderConfigEntity[]): StaticModel[] {
  return listModels().filter((model) => types.includes(model.type) && isModelUsable(model, providerConfigs));
}

export function isModelUsable(model: StaticModel, providerConfigs: ProviderConfigEntity[]): boolean {
  const provider = providerConfigs.find((config) => config.id === model.providerId);
  return Boolean(provider && provider.enabled !== false && provider.baseUrl.trim() && provider.apiKey?.trim());
}

export function modelSupportsReferenceImages(model?: StaticModel): boolean {
  return model?.supportsReferenceImages === true;
}

export function modelRequiresReferenceImages(model?: StaticModel): boolean {
  return model?.requiresReferenceImages === true;
}

export function getProviderDefinition(providerId: string): ProviderDefinition | undefined {
  return providerDefinitions.find((provider) => provider.id === providerId);
}

export function getModelLabel(model: StaticModel): string {
  const provider = getProviderDefinition(model.providerId);
  return `${provider?.label ?? model.providerId}: ${model.name}`;
}

function sortByProviderAndName(left: StaticModel, right: StaticModel): number {
  const provider = left.providerId.localeCompare(right.providerId, "de", { sensitivity: "base" });
  if (provider !== 0) return provider;
  return left.name.localeCompare(right.name, "de", { sensitivity: "base" });
}
