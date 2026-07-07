import { db } from "../database";
import type { ImageEntity, JsonValue } from "../entities";
import { createId, nowIso } from "../id";

export interface CreateImageInput {
  chatId: string;
  messageId?: string;
  requestId?: string;
  resultId?: string;
  blob: Blob;
  mimeType?: string;
  prompt?: string;
  modelConfigId?: string;
  pinned?: boolean;
  parameters?: Record<string, JsonValue>;
}

export const imageRepository = {
  async listByChat(chatId: string): Promise<ImageEntity[]> {
    const images = await db.images.where("chatId").equals(chatId).toArray();
    return images.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async create(input: CreateImageInput): Promise<ImageEntity> {
    const now = nowIso();
    const image = {
      id: createId("img"),
      sizeBytes: input.blob.size,
      createdAt: now,
      updatedAt: now,
      ...input
    };
    await db.images.add(image);
    return image;
  },

  async togglePinned(id: string, pinned: boolean): Promise<void> {
    await db.images.update(id, { pinned, updatedAt: nowIso() });
  }
};
