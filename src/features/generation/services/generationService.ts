import { generationRepository } from "../../../db/repositories/generationRepository";
import type { ModelConfigEntity } from "../../../db/entities";
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
  const output = await requestImages(model, input);

  await generationRepository.createSucceededImageGeneration({
    chatId,
    modelConfigId: model.id,
    type: "image",
    prompt: input.prompt,
    parameters,
    images: output.images,
    rawMetadata: output.rawMetadata
  });
}

async function requestImages(model: ModelConfigEntity, input: ImageGenerationInput): Promise<NormalizedGenerationOutput> {
  try {
    if (isBrowserOffline()) throw new Error(providerConnectivityError);

    const provider = getProviderForModel(model);
    return await provider.generateImage(model, input);
  } catch (error) {
    throw new Error(sanitizeProviderError(error));
  }
}

function summarizeReferences(input: ImageGenerationInput) {
  return { count: input.references?.length ?? 0 };
}
