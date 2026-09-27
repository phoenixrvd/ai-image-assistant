import type {
  ImageModel,
  ProviderDefinition,
  ProviderId,
  StaticModel,
  TextModel,
} from "./types";

export const defaultImageModelId = "openrouter-grok-imagine-image";

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

class OpenAiImage15 implements ImageModel {
  id = "openai-image-1-5";
  providerId = "openai" as const;
  name = "Image 1.5";
  type = "image-edit" as const;
  routes = {
    create: {
      providerModelName: "gpt-image-1.5",
      defaultParameters: { quality: "low" },
    },
    edit: {
      providerModelName: "gpt-image-1.5",
      defaultParameters: { quality: "low" },
    },
  };
}

class OpenAiGpt4oMini implements TextModel {
  id = "openai-gpt-4o-mini";
  providerId = "openai" as const;
  name = "GPT-4o mini";
  type = "text" as const;
  providerModelName = "gpt-4o-mini";
  supportsImageInput = true;
}

class FalOpenAiGpt4oMini implements TextModel {
  id = "fal-openai-gpt-4o-mini";
  providerId = "fal-ai" as const;
  name = "OpenAI GPT-4o mini";
  type = "text" as const;
  providerModelName = "openai/gpt-4o-mini";
  supportsImageInput = true;
}

class FalSeedreamV5LiteEdit implements ImageModel {
  id = "fal-seedream-v5-lite-edit";
  providerId = "fal-ai" as const;
  name = "Seedream V5 Lite Edit";
  type = "image-edit" as const;
  routes = {
    edit: {
      providerModelName: "fal-ai/bytedance/seedream/v5/lite/edit",
      defaultParameters: {
        enable_safety_checker: false,
        sync_mode: true,
        image_size_by_aspect: {
          square: { width: 1920, height: 1920 },
          portrait: { width: 1440, height: 2560 },
          landscape: { width: 2560, height: 1440 },
        },
      },
    },
  };
}

class FalFlux2Flex implements ImageModel {
  id = "fal-flux-2-flex";
  providerId = "fal-ai" as const;
  name = "FLUX.2 Flex Edit";
  type = "image-edit" as const;
  routes = {
    edit: {
      providerModelName: "fal-ai/flux-2-flex/edit",
      defaultParameters: {
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
      },
    },
  };
}

class FalFlux2Klein9bEdit implements ImageModel {
  id = "fal-flux-2-klein-9b-edit";
  providerId = "fal-ai" as const;
  name = "FLUX.2 Klein 9B Edit";
  type = "image-edit" as const;
  routes = {
    edit: {
      providerModelName: "fal-ai/flux-2/klein/9b/edit",
      defaultParameters: {
        enable_safety_checker: false,
        num_inference_steps: 8,
        sync_mode: true,
        output_format: "jpeg",
        image_size_by_aspect: {
          square: { width: 1280, height: 1280 },
          portrait: { width: 720, height: 1280 },
          landscape: { width: 1280, height: 720 },
        },
      },
    },
  };
}

class FalNanoBananaLiteEdit implements ImageModel {
  id = "fal-nano-banana-lite-edit";
  providerId = "fal-ai" as const;
  name = "Nano Banana Lite Edit";
  type = "image-edit" as const;
  routes = {
    create: {
      providerModelName: "google/nano-banana-lite/edit",
      defaultParameters: {
        sync_mode: true,
        output_format: "png",
        safety_tolerance: "6",
        limit_generations: true,
        aspect_ratio_by_aspect: {
          square: "1:1",
          portrait: "9:16",
          landscape: "16:9",
        },
      },
    },
    edit: {
      providerModelName: "google/nano-banana-lite/edit",
      defaultParameters: {
        sync_mode: true,
        output_format: "png",
        safety_tolerance: "6",
        limit_generations: true,
        aspect_ratio_by_aspect: {
          square: "1:1",
          portrait: "9:16",
          landscape: "16:9",
        },
      },
    },
  };
}

class FalNanoBanana implements ImageModel {
  id = "fal-nano-banana";
  providerId = "fal-ai" as const;
  name = "Nano Banana";
  type = "image" as const;
  routes = {
    create: {
      providerModelName: "fal-ai/nano-banana",
      defaultParameters: {
        sync_mode: true,
        output_format: "png",
        safety_tolerance: "6",
        limit_generations: true,
        aspect_ratio_by_aspect: {
          square: "1:1",
          portrait: "9:16",
          landscape: "16:9",
        },
      },
    },
  };
}

class FalNanoBanana2 implements ImageModel {
  id = "fal-nano-banana-2";
  providerId = "fal-ai" as const;
  name = "Nano Banana 2";
  type = "image" as const;
  routes = {
    create: {
      providerModelName: "fal-ai/nano-banana-2",
      defaultParameters: {
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
      },
    },
    edit: {
      providerModelName: "fal-ai/nano-banana-2/edit",
      defaultParameters: {
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
      },
    },
  };
}

class FalGrokImagineImage implements ImageModel {
  id = "fal-grok-imagine-image";
  providerId = "fal-ai" as const;
  name = "Grok Imagine";
  type = "image" as const;
  routes = {
    create: {
      providerModelName: "xai/grok-imagine-image",
      defaultParameters: {
        resolution: "1k",
        sync_mode: true,
        output_format: "jpeg",
        aspect_ratio_by_aspect: {
          square: "1:1",
          portrait: "9:16",
          landscape: "16:9",
        },
      },
    },
    edit: {
      providerModelName: "xai/grok-imagine-image/edit",
      defaultParameters: {
        resolution: "1k",
        sync_mode: true,
        output_format: "jpeg",
        aspect_ratio_by_aspect: {
          square: "1:1",
          portrait: "9:16",
          landscape: "16:9",
        },
      },
    },
  };
}

class FalOpenAiGptImage2Edit implements ImageModel {
  id = "fal-openai-gpt-image-2-edit";
  providerId = "fal-ai" as const;
  name = "OpenAI GPT Image 2 Edit";
  type = "image-edit" as const;
  routes = {
    edit: {
      providerModelName: "openai/gpt-image-2/edit",
      defaultParameters: {
        quality: "low",
        sync_mode: false,
        output_format: "webp",
        image_size_by_aspect: {
          square: "auto",
          portrait: "auto",
          landscape: "auto",
        },
      },
    },
  };
}

const openRouterFalModels: StaticModel[] = [
  {
    id: "openrouter-seed-2-0-mini",
    providerId: "openrouter",
    name: "Seed 2.0 Mini",
    type: "text",
    providerModelName: "bytedance-seed/seed-2.0-mini",
    supportsImageInput: true,
  },
  {
    id: "openrouter-seedream-v5-lite",
    providerId: "openrouter",
    name: "Seedream 5.0 Lite",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "bytedance-seed/seedream-5-0-lite",
        defaultParameters: { resolution: "2K" },
        maxImagesPerRequest: 4,
      },
      edit: {
        providerModelName: "bytedance-seed/seedream-5-0-lite",
        defaultParameters: { resolution: "2K" },
        maxImagesPerRequest: 4,
      },
    },
  },
  {
    id: "openrouter-seedream-v5-pro",
    providerId: "openrouter",
    name: "Seedream 5.0 Pro",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "bytedance-seed/seedream-5-0-pro",
        defaultParameters: { resolution: "1K" },
      },
      edit: {
        providerModelName: "bytedance-seed/seedream-5-0-pro",
        defaultParameters: { resolution: "1K" },
      },
    },
  },
  {
    id: "openrouter-flux-2-flex",
    providerId: "openrouter",
    name: "FLUX.2 Max Edit",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "black-forest-labs/flux.2-max",
        defaultParameters: { output_format: "jpeg" },
      },
      edit: {
        providerModelName: "black-forest-labs/flux.2-max",
        defaultParameters: { output_format: "jpeg" },
      },
    },
  },
  {
    id: "openrouter-flux-2-klein-4b",
    providerId: "openrouter",
    name: "FLUX.2 Klein 4B Edit",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "black-forest-labs/flux.2-klein-4b",
        defaultParameters: { output_format: "jpeg" },
      },
      edit: {
        providerModelName: "black-forest-labs/flux.2-klein-4b",
        defaultParameters: { output_format: "jpeg" },
      },
    },
  },
  {
    id: "openrouter-nano-banana-lite",
    providerId: "openrouter",
    name: "Nano Banana 2 Lite Edit",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "google/gemini-3.1-flash-lite-image",
        defaultParameters: { resolution: "1K" },
      },
      edit: {
        providerModelName: "google/gemini-3.1-flash-lite-image",
        defaultParameters: { resolution: "1K" },
      },
    },
  },
  {
    id: "openrouter-nano-banana-2",
    providerId: "openrouter",
    name: "Nano Banana 2",
    type: "image",
    routes: {
      create: {
        providerModelName: "google/gemini-3.1-flash-image",
        defaultParameters: { resolution: "1K" },
      },
      edit: {
        providerModelName: "google/gemini-3.1-flash-image",
        defaultParameters: { resolution: "1K" },
      },
    },
  },
  {
    id: "openrouter-grok-imagine-image",
    providerId: "openrouter",
    name: "Grok Imagine 2.0",
    type: "image",
    routes: {
      create: {
        providerModelName: "x-ai/grok-imagine-image-2.0",
        defaultParameters: { resolution: "1K", quality: "low" },
      },
      edit: {
        providerModelName: "x-ai/grok-imagine-image-2.0",
        defaultParameters: { resolution: "1K", quality: "low" },
      },
    },
  },
  {
    id: "openrouter-openai-gpt-image-2-edit",
    providerId: "openrouter",
    name: "OpenAI GPT Image 2.5 Flare Edit",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "openai/gpt-image-2.5-flare",
        defaultParameters: { quality: "low" },
        maxImagesPerRequest: 10,
      },
      edit: {
        providerModelName: "openai/gpt-image-2.5-flare",
        defaultParameters: { quality: "low" },
        maxImagesPerRequest: 10,
      },
    },
  },
  {
    id: "openrouter-recraft-v4-1-flash",
    providerId: "openrouter",
    name: "Recraft V4.1 Flash",
    type: "image",
    routes: {
      create: {
        providerModelName: "recraft/recraft-v4.1-flash",
        maxImagesPerRequest: 6,
      },
    },
  },
  {
    id: "openrouter-ming-image-design",
    providerId: "openrouter",
    name: "Ming Image Design",
    type: "image",
    routes: {
      create: {
        providerModelName: "inclusionai/ming-image-0.1-design",
        defaultParameters: { output_format: "png" },
        omitAspectRatio: true,
      },
    },
  },
  {
    id: "openrouter-ming-image-design-layer",
    providerId: "openrouter",
    name: "Ming Image Design Layer",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "inclusionai/ming-image-0.1-design-layer",
        defaultParameters: { output_format: "png" },
        omitAspectRatio: true,
      },
      edit: {
        providerModelName: "inclusionai/ming-image-0.1-design-layer",
        defaultParameters: { output_format: "png" },
        omitAspectRatio: true,
      },
    },
  },
  {
    id: "openrouter-qwen-image-3",
    providerId: "openrouter",
    name: "Qwen Image 3",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "qwen/qwen-image-3",
        defaultParameters: { resolution: "1K" },
        maxImagesPerRequest: 6,
      },
      edit: {
        providerModelName: "qwen/qwen-image-3",
        defaultParameters: { resolution: "1K" },
        maxImagesPerRequest: 6,
      },
    },
  },
  {
    id: "openrouter-riverflow-v2-5-fast",
    providerId: "openrouter",
    name: "Riverflow V2.5 Fast",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "sourceful/riverflow-v2.5-fast",
        defaultParameters: { resolution: "1K" },
      },
      edit: {
        providerModelName: "sourceful/riverflow-v2.5-fast",
        defaultParameters: { resolution: "1K" },
      },
    },
  },
  {
    id: "openrouter-mai-image-2-6-flash",
    providerId: "openrouter",
    name: "MAI Image 2.6 Flash",
    type: "image-edit",
    routes: {
      create: { providerModelName: "microsoft/mai-image-2.6-flash" },
      edit: { providerModelName: "microsoft/mai-image-2.6-flash" },
    },
  },
  {
    id: "openrouter-flux-2-pro",
    providerId: "openrouter",
    name: "FLUX.2 Pro Edit",
    type: "image-edit",
    routes: {
      create: {
        providerModelName: "black-forest-labs/flux.2-pro",
        defaultParameters: { output_format: "jpeg" },
      },
      edit: {
        providerModelName: "black-forest-labs/flux.2-pro",
        defaultParameters: { output_format: "jpeg" },
      },
    },
  },
];

export const models: StaticModel[] = [
  new OpenAiImage15(),
  new OpenAiGpt4oMini(),
  new FalOpenAiGpt4oMini(),
  new FalSeedreamV5LiteEdit(),
  new FalFlux2Flex(),
  new FalFlux2Klein9bEdit(),
  new FalNanoBanana(),
  new FalNanoBananaLiteEdit(),
  new FalNanoBanana2(),
  new FalGrokImagineImage(),
  new FalOpenAiGptImage2Edit(),
  ...openRouterFalModels,
];

export const historicalEditModels: Record<
  string,
  { currentId: string; name: string }
> = {
  "fal-nano-banana-2-edit": {
    currentId: "fal-nano-banana-2",
    name: "Nano Banana 2 Edit",
  },
  "fal-grok-imagine-edit": {
    currentId: "fal-grok-imagine-image",
    name: "Grok Imagine Edit",
  },
  "openrouter-nano-banana-2-edit": {
    currentId: "openrouter-nano-banana-2",
    name: "Nano Banana 2 Edit",
  },
  "openrouter-nano-banana": {
    currentId: "openrouter-nano-banana-lite",
    name: "Nano Banana",
  },
  "openrouter-grok-imagine-edit": {
    currentId: "openrouter-grok-imagine-image",
    name: "Grok Imagine Edit",
  },
};
