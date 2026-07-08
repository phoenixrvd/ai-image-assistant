import { db } from "../database";
import type { ModelLoadEstimateEntity } from "../entities";
import { nowIso } from "../id";

const defaultEstimateSeconds = 30;

export const modelLoadEstimateRepository = {
  async getEstimatedSeconds(provider: string, modelName: string): Promise<number> {
    const estimate = await db.modelLoadEstimates.get(buildId(provider, modelName));
    return estimate?.seconds ?? defaultEstimateSeconds;
  },

  async recordSuccessfulDuration(provider: string, modelName: string, actualSeconds: number): Promise<void> {
    const id = buildId(provider, modelName);
    const now = nowIso();
    await db.transaction("rw", db.modelLoadEstimates, async () => {
      const existing = await db.modelLoadEstimates.get(id);
      const seconds = existing ? (existing.seconds + actualSeconds) / 2 : actualSeconds;
      const estimate = buildEstimate(id, provider, modelName, seconds, now);
      if (existing) {
        await db.modelLoadEstimates.update(id, estimate);
      } else {
        await db.modelLoadEstimates.add(estimate);
      }
    });
  }
};

function buildId(provider: string, modelName: string): string {
  return `${provider}::${modelName}`;
}

function buildEstimate(id: string, provider: string, modelName: string, seconds: number, now: string): ModelLoadEstimateEntity {
  return { id, provider, modelName, seconds, createdAt: now, updatedAt: now };
}
