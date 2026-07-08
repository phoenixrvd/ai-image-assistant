import { db } from "../database";
import type { ModelConfigEntity, ModelType } from "../entities";
import { createId, nowIso } from "../id";

export function isModelUsable(model: ModelConfigEntity, type?: ModelType): boolean {
  const hasRequiredValues = Boolean(model.provider.trim() && model.baseUrl.trim() && model.modelName.trim() && model.apiKey?.trim());
  return hasRequiredValues && model.enabled !== false && (!type || model.type === type);
}

export function modelSupportsReferenceImages(model?: ModelConfigEntity): boolean {
  if (!model || model.type !== "image") return false;
  return model.supportsReferenceImages === true || String(model.supportsReferenceImages).toLowerCase() === "true";
}

export const modelConfigRepository = {
  async list(): Promise<ModelConfigEntity[]> {
    const models = await db.modelConfigs.toArray();
    const modelsWithDevApiKeys = await applyDevApiKeys(models);
    return modelsWithDevApiKeys.map(normalizeModelConfig).sort((left, right) => left.displayName.localeCompare(right.displayName, "de", { sensitivity: "base" }));
  },

  async listUsable(type: ModelType): Promise<ModelConfigEntity[]> {
    const models = await this.list();
    return models.filter((model) => isModelUsable(model, type));
  },

  async get(id: string): Promise<ModelConfigEntity | undefined> {
    const model = await db.modelConfigs.get(id);
    return model ? normalizeModelConfig(model) : undefined;
  },

  async createDraft(): Promise<ModelConfigEntity> {
    const now = nowIso();
    const model = {
      id: createId("model"),
      displayName: "",
      provider: "",
      type: "image" as const,
      baseUrl: "",
      modelName: "",
      enabled: false,
      supportsReferenceImages: true,
      createdAt: now,
      updatedAt: now
    };
    await db.modelConfigs.add(model);
    return model;
  },

  async save(model: ModelConfigEntity): Promise<ModelConfigEntity> {
    const saved = { ...normalizeModelConfig(model), updatedAt: nowIso() };
    await db.modelConfigs.put(saved);
    return saved;
  },

  async delete(id: string): Promise<void> {
    await db.modelConfigs.delete(id);
  }
};

function normalizeModelConfig(model: ModelConfigEntity): ModelConfigEntity {
  return {
    ...model,
    supportsReferenceImages: modelSupportsReferenceImages(model)
  };
}

async function applyDevApiKeys(models: ModelConfigEntity[]): Promise<ModelConfigEntity[]> {
  if (!import.meta.env.DEV) return models;

  const now = nowIso();
  const updatedModels = await Promise.all(
    models.map(async (model) => {
      if (model.apiKey?.trim()) return model;

      const apiKey = getDevApiKey(model);
      if (!apiKey) return model;

      const updatedModel = { ...model, apiKey, updatedAt: now };
      await db.modelConfigs.put(updatedModel);
      return updatedModel;
    })
  );

  return updatedModels;
}

function getDevApiKey(model: ModelConfigEntity): string | undefined {
  if (model.provider === "xai" || model.provider === "grok") {
    return firstEnvValue(import.meta.env.VITE_XAI_API_KEY, import.meta.env.VITE_GROK_API_KEY);
  }

  if (model.provider === "openai-compatible" && isOpenAiBaseUrl(model.baseUrl)) {
    return firstEnvValue(import.meta.env.VITE_OPENAI_API_KEY);
  }

  if (model.provider === "fal-ai") {
    return firstEnvValue(import.meta.env.VITE_FAL_AI_KEY);
  }

  return undefined;
}

function isOpenAiBaseUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname === "api.openai.com";
  } catch {
    return false;
  }
}

function firstEnvValue(...values: Array<string | undefined>): string | undefined {
  return values.map((value) => value?.trim()).find(Boolean);
}
