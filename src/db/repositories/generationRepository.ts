import { db } from "../database";
import type { GenerationRequestEntity, GenerationResultEntity, JsonValue } from "../entities";
import type { ReferenceInput, StoredReference } from "../../features/generation/types";
import { createId, nowIso } from "../id";

export const generationRepository = {
  async createPendingImageGeneration(input: {
    chatId: string;
    modelId: string;
    prompt: string;
    parameters: Record<string, JsonValue>;
    referenceInputs: ReferenceInput[];
  }): Promise<string> {
    const now = nowIso();
    const requestId = createId("req");
    await db.transaction("rw", db.chats, db.generationRequests, async () => {
      if (!(await db.chats.get(input.chatId))) throw new DOMException("Chat removed", "AbortError");
      await db.generationRequests.add({
        ...input, id: requestId, type: "image", snapshotVersion: 2,
        status: "pending", createdAt: now, updatedAt: now,
      });
    });
    return requestId;
  },

  async markImageGenerationRunning(requestId: string, preparedReferences: StoredReference[]): Promise<void> {
    await db.transaction("rw", db.generationRequests, async () => {
      const request = await db.generationRequests.get(requestId);
      if (request?.status !== "pending") throw new DOMException("Request no longer pending", "AbortError");
      await db.generationRequests.update(requestId, {
        status: "running", preparedReferences, updatedAt: nowIso(),
      });
    });
  },

  async completeImageGenerationSuccess(input: {
    requestId: string;
    rawMetadata?: Record<string, JsonValue>;
    images: Array<{ blob: Blob; mimeType?: string }>;
    signal: AbortSignal;
  }): Promise<void> {
    await db.transaction("rw", db.messages, db.chats, db.generationRequests, db.generationResults, db.images, async (transaction) => {
      input.signal.throwIfAborted();
      const abort = () => transaction.abort();
      input.signal.addEventListener("abort", abort, { once: true });
      transaction.on("complete", () => input.signal.removeEventListener("abort", abort));
      transaction.on("abort", () => input.signal.removeEventListener("abort", abort));
      const request = await db.generationRequests.get(input.requestId);
      if (!request || request.status !== "running" || !(await db.chats.get(request.chatId)))
        throw new DOMException("Request no longer running", "AbortError");
      await persistResult(request, input.images, input.rawMetadata);
      input.signal.throwIfAborted();
    });
  },

  async finishUnsuccessfulGeneration(requestId: string, status: "failed" | "cancelled", error?: string): Promise<void> {
    await db.transaction("rw", db.generationRequests, async () => {
      const request = await db.generationRequests.get(requestId);
      if (request?.status !== "pending" && request?.status !== "running") return;
      await db.generationRequests.update(requestId, { status, error, updatedAt: nowIso() });
    });
  },

  async listResultsByChat(chatId: string): Promise<GenerationResultEntity[]> {
    return db.generationResults.where("chatId").equals(chatId).sortBy("createdAt");
  },

  async listRequestsByChat(chatId: string): Promise<GenerationRequestEntity[]> {
    return db.generationRequests.where("chatId").equals(chatId).sortBy("createdAt");
  },
};

async function persistResult(
  request: GenerationRequestEntity,
  images: Array<{ blob: Blob; mimeType?: string }>,
  rawMetadata?: Record<string, JsonValue>,
) {
  const now = nowIso();
  const messageId = createId("msg");
  const resultId = createId("res");
  const imageIds = images.map(() => createId("img"));
  const { chatId, modelId, prompt, type } = request;
  await db.messages.add({ id: messageId, chatId, role: "user", content: prompt, requestId: request.id, createdAt: now, updatedAt: now });
  await db.generationRequests.update(request.id, { messageId, status: "succeeded", updatedAt: now });
  await db.generationResults.add({ id: resultId, requestId: request.id, chatId, messageId, type, imageIds, rawMetadata, createdAt: now, updatedAt: now });
  await db.images.bulkAdd(images.map((image, index) => ({
    id: imageIds[index], chatId, messageId, requestId: request.id, resultId,
    blob: image.blob, mimeType: image.mimeType, sizeBytes: image.blob.size,
    prompt, modelId, parameters: request.parameters, createdAt: now, updatedAt: now,
  })));
  await db.chats.update(chatId, { lastMessageAt: now, updatedAt: now });
}
