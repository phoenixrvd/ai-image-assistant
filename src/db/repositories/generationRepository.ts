import { db } from "../database";
import type { GenerationRequestEntity, GenerationResultEntity, JsonValue, ModelType } from "../entities";
import { createId, nowIso } from "../id";

type GeneratedImageInput = {
  blob: Blob;
  mimeType?: string;
};

export const generationRepository = {
  async createSucceededImageGeneration(input: {
    chatId: string;
    modelConfigId: string;
    type: ModelType;
    prompt: string;
    parameters?: Record<string, JsonValue>;
    rawMetadata?: Record<string, JsonValue>;
    images: GeneratedImageInput[];
  }): Promise<void> {
    const now = nowIso();
    const messageId = createId("msg");
    const requestId = createId("req");
    const resultId = createId("res");
    const imageIds = input.images.map(() => createId("img"));

    await db.transaction("rw", db.messages, db.chats, db.generationRequests, db.generationResults, db.images, async () => {
      await db.messages.add({ id: messageId, chatId: input.chatId, role: "user", content: input.prompt, requestId, createdAt: now, updatedAt: now });
      await db.generationRequests.add({
        id: requestId,
        chatId: input.chatId,
        messageId,
        modelConfigId: input.modelConfigId,
        type: input.type,
        prompt: input.prompt,
        parameters: input.parameters,
        status: "succeeded",
        createdAt: now,
        updatedAt: now
      });
      await db.generationResults.add({ id: resultId, requestId, chatId: input.chatId, messageId, type: input.type, imageIds, rawMetadata: input.rawMetadata, createdAt: now, updatedAt: now });
      await db.images.bulkAdd(
        input.images.map((image, index) => ({
          id: imageIds[index],
          chatId: input.chatId,
          messageId,
          requestId,
          resultId,
          blob: image.blob,
          mimeType: image.mimeType,
          sizeBytes: image.blob.size,
          prompt: input.prompt,
          modelConfigId: input.modelConfigId,
          parameters: input.parameters,
          createdAt: now,
          updatedAt: now
        }))
      );
      await db.chats.update(input.chatId, { lastMessageAt: now, updatedAt: now });
    });
  },

  async listResultsByChat(chatId: string): Promise<GenerationResultEntity[]> {
    return db.generationResults.where("chatId").equals(chatId).sortBy("createdAt");
  },

  async listRequestsByChat(chatId: string): Promise<GenerationRequestEntity[]> {
    return db.generationRequests.where("chatId").equals(chatId).sortBy("createdAt");
  }
};
