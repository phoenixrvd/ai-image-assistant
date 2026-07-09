import { db } from "../database";
import type { ProviderConfigEntity } from "../entities";
import { nowIso } from "../id";
import { providerDefinitions } from "../../features/generation/models/registry";

export function isProviderUsable(provider: ProviderConfigEntity): boolean {
  return Boolean(provider.enabled !== false && provider.baseUrl.trim() && provider.apiKey?.trim());
}

export const providerConfigRepository = {
  async list(): Promise<ProviderConfigEntity[]> {
    await seedMissingProviderConfigs();
    const providers = await db.providerConfigs.toArray();
    const withDevApiKeys = await applyDevApiKeys(providers);
    return providerDefinitions.map((definition) => normalizeProviderConfig(withDevApiKeys.find((provider) => provider.id === definition.id), definition.id));
  },

  async get(id: string): Promise<ProviderConfigEntity | undefined> {
    const provider = await db.providerConfigs.get(id);
    return provider ? normalizeProviderConfig(provider, id) : undefined;
  },

  async save(provider: ProviderConfigEntity): Promise<ProviderConfigEntity> {
    const saved = { ...provider, updatedAt: nowIso() };
    await db.providerConfigs.put(saved);
    return saved;
  }
};

async function seedMissingProviderConfigs(): Promise<void> {
  const now = nowIso();
  await Promise.all(
    providerDefinitions.map(async (definition) => {
      const existing = await db.providerConfigs.get(definition.id);
      if (existing) return;
      await db.providerConfigs.add({ id: definition.id, baseUrl: definition.defaultBaseUrl, enabled: true, createdAt: now, updatedAt: now });
    })
  );
}

function normalizeProviderConfig(provider: ProviderConfigEntity | undefined, id: string): ProviderConfigEntity {
  const definition = providerDefinitions.find((entry) => entry.id === id);
  const now = nowIso();
  return provider ?? { id, baseUrl: definition?.defaultBaseUrl ?? "", enabled: true, createdAt: now, updatedAt: now };
}

async function applyDevApiKeys(providers: ProviderConfigEntity[]): Promise<ProviderConfigEntity[]> {
  if (!import.meta.env.DEV) return providers;

  const now = nowIso();
  return Promise.all(
    providers.map(async (provider) => {
      if (provider.apiKey?.trim()) return provider;
      const apiKey = getDevApiKey(provider.id);
      if (!apiKey) return provider;
      const updatedProvider = { ...provider, apiKey, updatedAt: now };
      await db.providerConfigs.put(updatedProvider);
      return updatedProvider;
    })
  );
}

function getDevApiKey(providerId: string): string | undefined {
  if (providerId === "xai") return firstEnvValue(import.meta.env.VITE_XAI_API_KEY, import.meta.env.VITE_GROK_API_KEY);
  if (providerId === "openai") return firstEnvValue(import.meta.env.VITE_OPENAI_API_KEY);
  if (providerId === "fal-ai") return firstEnvValue(import.meta.env.VITE_FAL_AI_KEY);
  return undefined;
}

function firstEnvValue(...values: Array<string | undefined>): string | undefined {
  return values.map((value) => value?.trim()).find(Boolean);
}
