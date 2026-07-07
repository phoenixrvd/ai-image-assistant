import { generationRepository } from "../../../db/repositories/generationRepository";
import { imageRepository } from "../../../db/repositories/imageRepository";
import { messageRepository } from "../../../db/repositories/messageRepository";
import { isModelUsable, modelConfigRepository } from "../../../db/repositories/modelConfigRepository";
import { isBrowserOffline, providerConnectivityError, sanitizeProviderError } from "../providers/sanitize";
import { getProviderForModel } from "../providers/registry";
import type { ImageGenerationInput } from "../providers/types";

export async function generateImages(chatId: string, modelConfigId: string, input: ImageGenerationInput): Promise<void> {
  const model = await modelConfigRepository.get(modelConfigId);
  if (!model || !isModelUsable(model, "image")) {
    throw new Error("Es ist kein vollständig konfiguriertes Bildmodell aktiv.");
  }

  const instructions = input.instructions?.trim();
  const message = await messageRepository.create(chatId, "user", input.prompt);
  const request = await generationRepository.createRequest({
    chatId,
    messageId: message.id,
    modelConfigId: model.id,
    type: "image",
    prompt: input.prompt,
    parameters: { imageCount: input.imageCount, aspectRatio: input.aspectRatio, references: input.referenceSnapshots ?? summarizeReferences(input), ...(instructions ? { imageInstructions: instructions } : {}), ...(input.parameters ?? {}) }
  });
  await messageRepository.attachRequest(message.id, request.id);

  try {
    await generationRepository.setRunning(request.id);
    if (isBrowserOffline()) throw new Error(providerConnectivityError);

    const provider = getProviderForModel(model);
    const output = await provider.generateImage(model, input);
    const result = await generationRepository.createResult({
      requestId: request.id,
      chatId,
      messageId: message.id,
      type: "image",
      rawMetadata: output.rawMetadata
    });
    const images = await Promise.all(
      output.images.map((image) =>
        imageRepository.create({
          chatId,
          messageId: message.id,
          requestId: request.id,
          resultId: result.id,
          blob: image.blob,
          mimeType: image.mimeType,
          prompt: input.prompt,
          modelConfigId: model.id,
          parameters: { imageCount: input.imageCount, aspectRatio: input.aspectRatio, references: input.referenceSnapshots ?? summarizeReferences(input), ...(instructions ? { imageInstructions: instructions } : {}) }
        })
      )
    );
    await generationRepository.setResultImages(result.id, images.map((image) => image.id));
    await generationRepository.setSucceeded(request.id);
  } catch (error) {
    const safeError = sanitizeProviderError(error);
    await generationRepository.setFailed(request.id, safeError);
    throw new Error(safeError);
  }
}

function summarizeReferences(input: ImageGenerationInput) {
  return { count: input.references?.length ?? 0 };
}
