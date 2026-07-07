import { db } from "../database";
import type { ChatEntity } from "../entities";
import { createId, nowIso } from "../id";

export const chatRepository = {
  async list(): Promise<ChatEntity[]> {
    const chats = await db.chats.orderBy("updatedAt").reverse().toArray();
    return chats.filter((chat) => !chat.archived);
  },

  async get(id: string): Promise<ChatEntity | undefined> {
    return db.chats.get(id);
  },

  async create(title = "Neue Sitzung"): Promise<ChatEntity> {
    const now = nowIso();
    const chat = { id: createId("chat"), title, createdAt: now, updatedAt: now };
    await db.chats.add(chat);
    return chat;
  },

  async updateTitle(id: string, title: string): Promise<void> {
    await db.chats.update(id, { title, titleEdited: true, updatedAt: nowIso() });
  },

  async updateImageInstructions(id: string, imageInstructions: string): Promise<void> {
    await db.transaction("rw", db.chats, async () => {
      const chat = await db.chats.get(id);
      if (!chat) return;
      const metadata = { ...(chat.metadata ?? {}) };
      if (imageInstructions.trim()) {
        metadata.imageInstructions = imageInstructions;
      } else {
        delete metadata.imageInstructions;
      }
      await db.chats.update(id, { metadata, updatedAt: nowIso() });
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
