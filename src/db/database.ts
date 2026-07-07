import Dexie, { type Table } from "dexie";
import type {
  AppOptionEntity,
  ChatEntity,
  GenerationRequestEntity,
  GenerationResultEntity,
  ImageEntity,
  MessageEntity,
  ModelConfigEntity
} from "./entities";

export const DB_SCHEMA_VERSION = 5;

const DEFAULT_IMAGE_MODEL_IDS = ["grok-imagine-image", "grok-imagine-image-quality", "openai-image-1-5"];

const MODEL_CONFIG_STORE = {
  chats: "id, updatedAt, lastMessageAt, pinned, archived",
  messages: "id, chatId, requestId, createdAt",
  images: "id, chatId, messageId, requestId, resultId, modelConfigId, pinned, createdAt",
  modelConfigs: "id, type, enabled, provider, updatedAt",
  appOptions: "key, updatedAt",
  generationRequests: "id, chatId, messageId, modelConfigId, type, status, createdAt",
  generationResults: "id, requestId, chatId, messageId, type, createdAt"
};

const defaultModelConfigs = [
  {
    id: "grok-imagine-image",
    displayName: "Grok Imagine Image",
    provider: "xai",
    type: "image" as const,
    baseUrl: "https://api.x.ai/v1",
    modelName: "grok-imagine-image",
    enabled: true,
    supportsReferenceImages: false,
    defaultParameters: { quality: "low" }
  },
  {
    id: "grok-imagine-image-quality",
    displayName: "Grok Imagine Image Quality",
    provider: "xai",
    type: "image" as const,
    baseUrl: "https://api.x.ai/v1",
    modelName: "grok-imagine-image-quality",
    enabled: true,
    supportsReferenceImages: true,
    defaultParameters: { quality: "low" }
  },
  {
    id: "openai-image-1-5",
    displayName: "OpenAI Image 1.5",
    provider: "openai-compatible",
    type: "image" as const,
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-image-1.5",
    enabled: true,
    supportsReferenceImages: true,
    defaultParameters: { quality: "low" }
  },
  {
    id: "openai-small-text",
    displayName: "OpenAI Small Text",
    provider: "openai-compatible",
    type: "chat" as const,
    baseUrl: "https://api.openai.com/v1",
    modelName: "gpt-4.1-nano",
    enabled: true
  }
];

class AiImageDatabase extends Dexie {
  chats!: Table<ChatEntity, string>;
  messages!: Table<MessageEntity, string>;
  images!: Table<ImageEntity, string>;
  modelConfigs!: Table<ModelConfigEntity, string>;
  appOptions!: Table<AppOptionEntity, string>;
  generationRequests!: Table<GenerationRequestEntity, string>;
  generationResults!: Table<GenerationResultEntity, string>;

  constructor() {
    super("ai-image-assistant");
    this.version(1).stores(MODEL_CONFIG_STORE);
    this.version(2).stores(MODEL_CONFIG_STORE).upgrade(async (transaction) => {
      await seedDefaultModelConfigs(transaction.table("modelConfigs"));
    });
    this.version(DB_SCHEMA_VERSION).stores(MODEL_CONFIG_STORE).upgrade(async (transaction) => {
      const modelConfigs = transaction.table<ModelConfigEntity, string>("modelConfigs");
      await seedDefaultModelConfigs(modelConfigs);
      await updateXaiDefaultModelNames(modelConfigs);
      await migrateReferenceImageSupport(modelConfigs);
      await migrateDefaultImageQualityToLow(modelConfigs);
    });
    this.on("populate", async (transaction) => {
      await seedDefaultModelConfigs(transaction.table("modelConfigs"));
    });
  }
}

async function updateXaiDefaultModelNames(modelConfigs: Table<ModelConfigEntity, string>): Promise<void> {
  await modelConfigs.update("grok-imagine-image", {
    modelName: "grok-imagine-image",
    supportsReferenceImages: false,
    defaultParameters: { quality: "low" },
    updatedAt: new Date().toISOString()
  });
  await modelConfigs.update("grok-imagine-image-quality", {
    modelName: "grok-imagine-image-quality",
    supportsReferenceImages: true,
    defaultParameters: { quality: "low" },
    updatedAt: new Date().toISOString()
  });
}

async function migrateDefaultImageQualityToLow(modelConfigs: Table<ModelConfigEntity, string>): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(
    DEFAULT_IMAGE_MODEL_IDS.map(async (id) => {
      const model = await modelConfigs.get(id);
      if (!model) return;
      await modelConfigs.update(id, {
        defaultParameters: { ...(model.defaultParameters ?? {}), quality: "low" },
        updatedAt: now
      });
    })
  );
}

async function migrateReferenceImageSupport(modelConfigs: Table<ModelConfigEntity, string>): Promise<void> {
  const now = new Date().toISOString();
  const models = await modelConfigs.toArray();
  await Promise.all(
    models
      .filter((model) => model.type === "image")
      .map((model) =>
        modelConfigs.update(model.id, {
          supportsReferenceImages: model.id !== "grok-imagine-image",
          updatedAt: now
        })
      )
  );
}

export const db = new AiImageDatabase();

async function seedDefaultModelConfigs(modelConfigs: Table<ModelConfigEntity, string>): Promise<void> {
  const now = new Date().toISOString();
  await Promise.all(
    defaultModelConfigs.map(async (model) => {
      const existing = await modelConfigs.get(model.id);
      if (existing) return;
      await modelConfigs.add({ ...model, createdAt: now, updatedAt: now });
    })
  );
}
