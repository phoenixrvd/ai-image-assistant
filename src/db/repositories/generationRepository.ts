import { db } from "../database";
import type { GenerationRequestEntity, GenerationResultEntity, JsonValue, ModelType } from "../entities";
import { createId, nowIso } from "../id";

export const generationRepository = {
  async createRequest(input: {
    chatId: string;
    messageId?: string;
    modelConfigId: string;
    type: ModelType;
    prompt: string;
    parameters?: Record<string, JsonValue>;
  }): Promise<GenerationRequestEntity> {
    const now = nowIso();
    const request = { id: createId("req"), status: "pending" as const, createdAt: now, updatedAt: now, ...input };
    await db.generationRequests.add(request);
    return request;
  },

  async setRunning(id: string): Promise<void> {
    await db.generationRequests.update(id, { status: "running", updatedAt: nowIso() });
  },

  async setFailed(id: string, error: string): Promise<void> {
    await db.generationRequests.update(id, { status: "failed", error, updatedAt: nowIso() });
  },

  async setSucceeded(id: string): Promise<void> {
    await db.generationRequests.update(id, { status: "succeeded", updatedAt: nowIso() });
  },

  async createResult(input: Omit<GenerationResultEntity, "id" | "createdAt" | "updatedAt">): Promise<GenerationResultEntity> {
    const now = nowIso();
    const result = { id: createId("res"), createdAt: now, updatedAt: now, ...input };
    await db.generationResults.add(result);
    return result;
  },

  async setResultImages(id: string, imageIds: string[]): Promise<void> {
    await db.generationResults.update(id, { imageIds, updatedAt: nowIso() });
  },

  async listResultsByChat(chatId: string): Promise<GenerationResultEntity[]> {
    return db.generationResults.where("chatId").equals(chatId).sortBy("createdAt");
  },

  async listRequestsByChat(chatId: string): Promise<GenerationRequestEntity[]> {
    return db.generationRequests.where("chatId").equals(chatId).sortBy("createdAt");
  }
};
