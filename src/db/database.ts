import Dexie, { type Table } from "dexie";
import type {
  AppOptionEntity,
  ChatEntity,
  GenerationRequestEntity,
  GenerationResultEntity,
  ImageEntity,
  MessageEntity,
  ModelLoadEstimateEntity,
  ProviderConfigEntity,
} from "./entities";

export const DB_SCHEMA_VERSION = 11;

type LegacyModelConfigEntity = {
  id: string;
  provider: string;
  baseUrl: string;
  apiKey?: string;
  enabled?: boolean;
  updatedAt?: string;
};

const LEGACY_MODEL_CONFIG_STORE = {
  chats: "id, updatedAt, lastMessageAt, pinned, archived",
  messages: "id, chatId, requestId, createdAt",
  images:
    "id, chatId, messageId, requestId, resultId, modelConfigId, pinned, createdAt",
  modelConfigs: "id, type, enabled, provider, updatedAt",
  modelLoadEstimates: "id, provider, modelName, updatedAt",
  appOptions: "key, updatedAt",
  generationRequests:
    "id, chatId, messageId, modelConfigId, type, status, createdAt",
  generationResults: "id, requestId, chatId, messageId, type, createdAt",
};

const PROVIDER_CONFIG_TRANSITION_STORE = {
  ...LEGACY_MODEL_CONFIG_STORE,
  providerConfigs: "id, enabled, updatedAt",
};

const PROVIDER_CONFIG_STORE = {
  chats: "id, updatedAt, lastMessageAt, pinned, archived",
  messages: "id, chatId, requestId, createdAt",
  images:
    "id, chatId, messageId, requestId, resultId, modelId, pinned, createdAt",
  providerConfigs: "id, enabled, updatedAt",
  modelLoadEstimates: "id, provider, modelName, updatedAt",
  appOptions: "key, updatedAt",
  generationRequests: "id, chatId, messageId, modelId, type, status, createdAt",
  generationResults: "id, requestId, chatId, messageId, type, createdAt",
};

const defaultProviderConfigs: Array<
  Omit<ProviderConfigEntity, "createdAt" | "updatedAt">
> = [
  { id: "openai", baseUrl: "https://api.openai.com/v1", enabled: true },
  { id: "fal-ai", baseUrl: "https://fal.run", enabled: true },
  { id: "openrouter", baseUrl: "https://openrouter.ai/api/v1", enabled: true },
];

class AiImageDatabase extends Dexie {
  chats!: Table<ChatEntity, string>;
  messages!: Table<MessageEntity, string>;
  images!: Table<ImageEntity, string>;
  providerConfigs!: Table<ProviderConfigEntity, string>;
  appOptions!: Table<AppOptionEntity, string>;
  modelLoadEstimates!: Table<ModelLoadEstimateEntity, string>;
  generationRequests!: Table<GenerationRequestEntity, string>;
  generationResults!: Table<GenerationResultEntity, string>;

  constructor() {
    super("ai-image-assistant");
    this.version(1).stores(LEGACY_MODEL_CONFIG_STORE);
    this.version(2).stores(LEGACY_MODEL_CONFIG_STORE);
    this.version(7).stores(LEGACY_MODEL_CONFIG_STORE);
    this.version(8)
      .stores(PROVIDER_CONFIG_TRANSITION_STORE)
      .upgrade(async (transaction) => {
        await migrateModelConfigsToProviderConfigs(
          transaction.table("modelConfigs"),
          transaction.table("providerConfigs"),
        );
      });
    this.version(10)
      .stores(PROVIDER_CONFIG_STORE)
      .upgrade(async (transaction) => {
        await migrateStoredModelIds(transaction.table("images"));
        await migrateStoredModelIds(transaction.table("generationRequests"));
        await seedDefaultProviderConfigs(transaction.table("providerConfigs"));
      });
    this.version(DB_SCHEMA_VERSION)
      .stores(PROVIDER_CONFIG_STORE)
      .upgrade(async (transaction) => {
        await migrateRemovedXaiIntegration(
          transaction.table("providerConfigs"),
          transaction.table("appOptions"),
        );
      });
    this.on("populate", async (transaction) => {
      await seedDefaultProviderConfigs(transaction.table("providerConfigs"));
    });
  }
}

export const db = new AiImageDatabase();

async function seedDefaultProviderConfigs(
  providerConfigs: Table<ProviderConfigEntity, string>,
): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(
    defaultProviderConfigs.map(async (provider) => {
      const existing = await providerConfigs.get(provider.id);
      if (existing) return;
      await providerConfigs.add({
        ...provider,
        createdAt: now,
        updatedAt: now,
      });
    }),
  );
}

async function migrateModelConfigsToProviderConfigs(
  modelConfigs: Table<LegacyModelConfigEntity, string>,
  providerConfigs: Table<ProviderConfigEntity, string>,
): Promise<void> {
  const legacyModels = await modelConfigs.toArray();
  const now = new Date().toISOString();
  await Promise.all(
    defaultProviderConfigs.map(async (provider) => {
      const legacy = selectLegacyProviderConfig(legacyModels, provider.id);
      await providerConfigs.put({
        id: provider.id,
        baseUrl: legacy?.baseUrl?.trim() || provider.baseUrl,
        apiKey: legacy?.apiKey,
        enabled: legacy?.enabled ?? provider.enabled,
        createdAt: now,
        updatedAt: now,
      });
    }),
  );
}

function selectLegacyProviderConfig(
  models: LegacyModelConfigEntity[],
  providerId: string,
): LegacyModelConfigEntity | undefined {
  const aliases =
    providerId === "openai" ? ["openai-compatible"] : [providerId];
  return models
    .filter((model) => aliases.includes(model.provider))
    .sort((left, right) => scoreLegacyModel(right) - scoreLegacyModel(left))[0];
}

function scoreLegacyModel(model: LegacyModelConfigEntity): number {
  return (
    (model.apiKey?.trim() ? 4 : 0) +
    (model.enabled !== false ? 2 : 0) +
    (model.baseUrl?.trim() ? 1 : 0)
  );
}

async function migrateStoredModelIds(
  table: Table<Record<string, unknown>, string>,
): Promise<void> {
  const rows = await table.toArray();
  await Promise.all(
    rows.map(async (row) => {
      if (typeof row.modelConfigId !== "string" || typeof row.id !== "string")
        return;
      const next: Record<string, unknown> = {
        ...row,
        modelId: row.modelConfigId,
      };
      delete next.modelConfigId;
      await table.put(next);
    }),
  );
}

const removedXaiModelIds = new Set([
  "grok-imagine-image",
  "grok-imagine-image-quality",
  "xai-grok-text",
]);

const replacementImageModelIds: Record<string, string> = {
  "grok-imagine-image": "openrouter-grok-imagine-image",
  "grok-imagine-image-quality": "openrouter-grok-imagine-edit",
  "xai-grok-text": "openrouter-grok-imagine-edit",
};

async function migrateRemovedXaiIntegration(
  providerConfigs: Table<ProviderConfigEntity, string>,
  appOptions: Table<AppOptionEntity, string>,
): Promise<void> {
  await providerConfigs.delete("xai");

  const disabledModels = await appOptions.get("disabledModelIds");
  if (disabledModels && Array.isArray(disabledModels.value)) {
    const next = disabledModels.value.filter(
      (id): id is string =>
        typeof id === "string" && !removedXaiModelIds.has(id),
    );
    if (next.length !== disabledModels.value.length) {
      await appOptions.put({
        ...disabledModels,
        value: next,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const defaultModel = await appOptions.get("defaultImageModelId");
  if (defaultModel && typeof defaultModel.value === "string") {
    const replacement = replacementImageModelIds[defaultModel.value];
    if (replacement) {
      await appOptions.put({
        ...defaultModel,
        value: replacement,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
