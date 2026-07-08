import { db } from "../database";
import type { GenerationRequestEntity, GenerationResultEntity, JsonValue, ModelType } from "../entities";
import { createId, nowIso } from "../id";

type GeneratedImageInput = {
  blob: Blob;
  mimeType?: string;
};

export const generationRepository = {
  async createPendingImageGeneration(input: {
    chatId: string;
    modelConfigId: string;
    type: ModelType;
    prompt: string;
    parameters?: Record<string, JsonValue>;
  }): Promise<{ requestId: string }> {
    const now = nowIso();
    const requestId = createId("req");
    await db.generationRequests.add({
      id: requestId,
      chatId: input.chatId,
      modelConfigId: input.modelConfigId,
      type: input.type,
      prompt: input.prompt,
      parameters: input.parameters,
      status: "pending",
      createdAt: now,
      updatedAt: now
    });
    return { requestId };
  },

  async completeImageGenerationSuccess(input: {
    requestId: string;
    chatId: string;
    modelConfigId: string;
    prompt: string;
    type: ModelType;
    parameters?: Record<string, JsonValue>;
    rawMetadata?: Record<string, JsonValue>;
    images: GeneratedImageInput[];
  }): Promise<void> {
    const now = nowIso();
    const messageId = createId("msg");
    const resultId = createId("res");
    const imageIds = input.images.map(() => createId("img"));

    await db.transaction("rw", db.messages, db.chats, db.generationRequests, db.generationResults, db.images, async () => {
      await db.messages.add({ id: messageId, chatId: input.chatId, role: "user", content: input.prompt, requestId: input.requestId, createdAt: now, updatedAt: now });
      await db.generationRequests.update(input.requestId, {
        messageId,
        chatId: input.chatId,
        modelConfigId: input.modelConfigId,
        type: input.type,
        prompt: input.prompt,
        parameters: input.parameters,
        status: "succeeded",
        updatedAt: now
      });
      await db.generationResults.add({ id: resultId, requestId: input.requestId, chatId: input.chatId, messageId, type: input.type, imageIds, rawMetadata: input.rawMetadata, createdAt: now, updatedAt: now });
      await db.images.bulkAdd(
        input.images.map((image, index) => ({
          id: imageIds[index],
          chatId: input.chatId,
          messageId,
          requestId: input.requestId,
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

  async completeImageGenerationFailure(input: { requestId: string; error: string }): Promise<void> {
    await db.generationRequests.update(input.requestId, { status: "failed", error: input.error, updatedAt: nowIso() });
  },

  async listResultsByChat(chatId: string): Promise<GenerationResultEntity[]> {
    return db.generationResults.where("chatId").equals(chatId).sortBy("createdAt");
  },

  async listRequestsByChat(chatId: string): Promise<GenerationRequestEntity[]> {
    return db.generationRequests.where("chatId").equals(chatId).sortBy("createdAt");
  }
};
