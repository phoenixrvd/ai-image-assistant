import { db } from "../database";
import type { MessageEntity, MessageRole } from "../entities";
import { createId, nowIso } from "../id";

export const messageRepository = {
  async listByChat(chatId: string): Promise<MessageEntity[]> {
    return db.messages.where("chatId").equals(chatId).sortBy("createdAt");
  },

  async create(chatId: string, role: MessageRole, content: string): Promise<MessageEntity> {
    const now = nowIso();
    const message = { id: createId("msg"), chatId, role, content, createdAt: now, updatedAt: now };
    await db.transaction("rw", db.messages, db.chats, async () => {
      await db.messages.add(message);
      await db.chats.update(chatId, { lastMessageAt: now, updatedAt: now });
    });
    return message;
  },

  async deleteWithImages(id: string): Promise<void> {
    await db.transaction("rw", db.messages, db.images, db.chats, db.generationRequests, db.generationResults, async () => {
      const message = await db.messages.get(id);
      if (!message) return;

      const requestIds = new Set((await db.generationRequests.where("messageId").equals(id).primaryKeys()).map(String));
      if (message.requestId) requestIds.add(message.requestId);

      await db.images.where("messageId").equals(id).delete();
      await db.generationResults.where("messageId").equals(id).delete();
      await db.generationRequests.where("messageId").equals(id).delete();

      await Promise.all(
        [...requestIds].map(async (requestId) => {
          await db.images.where("requestId").equals(requestId).delete();
          await db.generationResults.where("requestId").equals(requestId).delete();
          await db.generationRequests.delete(requestId);
        })
      );

      await db.messages.delete(id);

      const remainingMessages = await db.messages.where("chatId").equals(message.chatId).sortBy("createdAt");
      const lastMessage = remainingMessages.at(-1);
      await db.chats.update(message.chatId, { lastMessageAt: lastMessage?.createdAt, updatedAt: nowIso() });
    });
  }
};
