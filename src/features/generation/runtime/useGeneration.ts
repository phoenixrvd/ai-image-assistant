import { useSyncExternalStore } from "react";
import {
  generationCoordinator,
  type GenerationJob,
} from "../services/generationCoordinator";

export function useGeneration(chatId: string) {
  return useSyncExternalStore(generationCoordinator.subscribe, () =>
    generationCoordinator.get(chatId),
  );
}

export function useGenerationActivity() {
  return useSyncExternalStore(
    generationCoordinator.subscribe,
    generationCoordinator.hasActiveJobs,
  );
}

export function isGenerationActive(job?: GenerationJob) {
  return (
    job?.phase === "preparing" ||
    job?.phase === "running" ||
    job?.phase === "cancelling"
  );
}
