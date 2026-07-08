import type { ModelConfigEntity } from "../../../db/entities";
import { generationRepository } from "../../../db/repositories/generationRepository";
import { modelLoadEstimateRepository } from "../../../db/repositories/modelLoadEstimateRepository";
import { isModelUsable, modelConfigRepository } from "../../../db/repositories/modelConfigRepository";
import { isBrowserOffline, providerConnectivityError, sanitizeProviderError } from "../providers/sanitize";
import { getProviderForModel } from "../providers/registry";
import type { ImageGenerationInput, NormalizedGenerationOutput } from "../providers/types";

export async function generateImages(chatId: string, modelConfigId: string, input: ImageGenerationInput): Promise<void> {
  const model = await modelConfigRepository.get(modelConfigId);
  if (!model || !isModelUsable(model, "image")) {
    throw new Error("Es ist kein vollständig konfiguriertes Bildmodell aktiv.");
  }

  const instructions = input.instructions?.trim();
  const parameters = { imageCount: input.imageCount, aspectRatio: input.aspectRatio, references: input.referenceSnapshots ?? summarizeReferences(input), ...(instructions ? { imageInstructions: instructions } : {}), ...(input.parameters ?? {}) };
  const { requestId } = await generationRepository.createPendingImageGeneration({
    chatId,
    modelConfigId: model.id,
    type: "image",
    prompt: input.prompt,
    parameters
  });

  try {
    const { output, durationSeconds } = await requestImages(model, input);

    await generationRepository.completeImageGenerationSuccess({
      requestId,
      chatId,
      modelConfigId: model.id,
      type: "image",
      prompt: input.prompt,
      parameters,
      images: output.images,
      rawMetadata: output.rawMetadata
    });
    await modelLoadEstimateRepository.recordSuccessfulDuration(model.provider, model.modelName, durationSeconds);
  } catch (error) {
    await generationRepository.completeImageGenerationFailure({ requestId, error: sanitizeProviderError(error) });
    throw error;
  }
}

async function requestImages(model: ModelConfigEntity, input: ImageGenerationInput): Promise<{ output: NormalizedGenerationOutput; durationSeconds: number }> {
  try {
    if (isBrowserOffline()) throw new Error(providerConnectivityError);

    const provider = getProviderForModel(model);
    const startedAtMs = Date.now();
    const output = await provider.generateImage(model, input);
    const durationSeconds = (Date.now() - startedAtMs) / 1000;
    return { output, durationSeconds };
  } catch (error) {
    throw new Error(sanitizeProviderError(error));
  }
}


function summarizeReferences(input: ImageGenerationInput) {
  return { count: input.references?.length ?? 0 };
}
