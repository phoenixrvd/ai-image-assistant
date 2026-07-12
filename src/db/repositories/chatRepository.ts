import { db } from "../database";
import type { ChatEntity } from "../entities";
import { createId, nowIso } from "../id";

export type ChatAspectRatio = "square" | "portrait" | "landscape";

export type ChatUploadedReference = {
  name: string;
  dataUrl: string;
};

export type ChatSettings = {
  promptDraft?: string;
  activeImageModelId?: string;
  imageCount?: number;
  aspectRatio?: ChatAspectRatio;
  imageInstructions?: string;
  uploadedReferences?: ChatUploadedReference[];
};

const maxUploadedReferences = 3;

export const chatRepository = {
  async list(): Promise<ChatEntity[]> {
    const chats = await db.chats.toArray();
    return chats
      .filter((chat) => !chat.archived)
      .sort((left, right) => getLastChangedAt(right).localeCompare(getLastChangedAt(left)));
  },

  async get(id: string): Promise<ChatEntity | undefined> {
    return db.chats.get(id);
  },

  async create(title = "Neue Sitzung", activeImageModelId?: string): Promise<ChatEntity> {
    const now = nowIso();
    const metadata = activeImageModelId ? { chatSettings: { activeImageModelId } } : undefined;
    const chat = { id: createId("chat"), title, metadata, createdAt: now, updatedAt: now };
    await db.chats.add(chat);
    return chat;
  },

  async updateTitle(id: string, title: string): Promise<void> {
    await db.chats.update(id, { title, titleEdited: true, updatedAt: nowIso() });
  },

  async updateImageInstructions(id: string, imageInstructions: string): Promise<void> {
    await this.updateSettings(id, { imageInstructions });
  },

  async initializeMissingImageModels(activeImageModelId: string): Promise<void> {
    const chats = await db.chats.toArray();
    await Promise.all(
      chats
        .filter((chat) => !parseChatSettings(chat).activeImageModelId)
        .map((chat) => this.updateSettings(chat.id, { activeImageModelId }))
    );
  },

  async readSettings(id: string): Promise<ChatSettings> {
    const chat = await db.chats.get(id);
    if (!chat) return {};
    return parseChatSettings(chat);
  },

  async updateSettings(id: string, patch: Partial<ChatSettings>): Promise<void> {
    await db.transaction("rw", db.chats, async () => {
      const chat = await db.chats.get(id);
      if (!chat) return;
      const existing = parseChatSettings(chat);
      const next = sanitizeChatSettings({ ...existing, ...patch });
      const metadata = { ...(chat.metadata ?? {}) } as Record<string, unknown>;

      if (next.imageInstructions?.trim()) {
        metadata.imageInstructions = next.imageInstructions;
      } else {
        delete metadata.imageInstructions;
      }
      metadata.chatSettings = next as unknown as Record<string, unknown>;

      await db.chats.update(id, {
        metadata: metadata as ChatEntity["metadata"],
        updatedAt: nowIso()
      });
    });
  },

  async updateGeneratedTitle(id: string, title: string): Promise<void> {
    await db.transaction("rw", db.chats, async () => {
      const chat = await db.chats.get(id);
      if (!chat || chat.titleEdited) return;
      const now = nowIso();
      await db.chats.update(id, { title, titleGeneratedAt: now, updatedAt: now });
    });
  },

  async deleteWithChildren(id: string): Promise<void> {
    await db.transaction("rw", db.chats, db.messages, db.images, db.generationRequests, db.generationResults, async () => {
      await db.messages.where("chatId").equals(id).delete();
      await db.images.where("chatId").equals(id).delete();
      await db.generationRequests.where("chatId").equals(id).delete();
      await db.generationResults.where("chatId").equals(id).delete();
      await db.chats.delete(id);
    });
  }
};

export function getLastChangedAt(chat: ChatEntity): string {
  return chat.lastMessageAt ?? chat.updatedAt;
}

function parseChatSettings(chat: ChatEntity): ChatSettings {
  const metadata = chat.metadata ?? {};
  const rawSettings = metadata.chatSettings;
  const settings = rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings) ? (rawSettings as Record<string, unknown>) : {};

  return sanitizeChatSettings({
    promptDraft: readString(settings.promptDraft),
    activeImageModelId: readString(settings.activeImageModelId),
    imageCount: readImageCount(settings.imageCount),
    aspectRatio: readAspectRatio(settings.aspectRatio),
    imageInstructions: readString(settings.imageInstructions) ?? readString(metadata.imageInstructions),
    uploadedReferences: readUploadedReferences(settings.uploadedReferences)
  });
}

function sanitizeChatSettings(settings: ChatSettings): ChatSettings {
  return {
    promptDraft: settings.promptDraft ?? "",
    activeImageModelId: settings.activeImageModelId,
    imageCount: settings.imageCount,
    aspectRatio: settings.aspectRatio,
    imageInstructions: settings.imageInstructions ?? "",
    uploadedReferences: (settings.uploadedReferences ?? []).slice(0, maxUploadedReferences)
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readImageCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 4 ? value : undefined;
}

function readAspectRatio(value: unknown): ChatAspectRatio | undefined {
  return value === "square" || value === "portrait" || value === "landscape" ? value : undefined;
}

function readUploadedReferences(value: unknown): ChatUploadedReference[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return undefined;
      const reference = entry as Record<string, unknown>;
      const name = readString(reference.name);
      const dataUrl = readString(reference.dataUrl);
      if (!name || !dataUrl) return undefined;
      return { name, dataUrl };
    })
    .filter((entry): entry is ChatUploadedReference => Boolean(entry))
    .slice(0, maxUploadedReferences);
}
