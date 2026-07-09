import { generationRepository } from "../../../db/repositories/generationRepository";
import { modelLoadEstimateRepository } from "../../../db/repositories/modelLoadEstimateRepository";
import { isProviderUsable, providerConfigRepository } from "../../../db/repositories/providerConfigRepository";
import { getModel } from "../models/registry";
import type { StaticModel } from "../models/types";
import { isBrowserOffline, providerConnectivityError, sanitizeProviderError } from "../providers/sanitize";
import { getProviderForModel } from "../providers/registry";
import type { ImageGenerationInput, NormalizedGenerationOutput } from "../providers/types";

export async function generateImages(chatId: string, modelId: string, input: ImageGenerationInput): Promise<void> {
  const model = getModel(modelId);
  const providerConfig = model ? await providerConfigRepository.get(model.providerId) : undefined;
  if (!model || !providerConfig || !isProviderUsable(providerConfig) || !["image", "image-edit"].includes(model.type)) throw new Error("Es ist kein verwendbares Bildmodell aktiv.");
  if (model.requiresReferenceImages && !input.references?.length) throw new Error("Dieses Modell benötigt mindestens ein Referenzbild.");

  const instructions = input.instructions?.trim();
  const parameters = { imageCount: input.imageCount, aspectRatio: input.aspectRatio, references: input.referenceSnapshots ?? summarizeReferences(input), ...(instructions ? { imageInstructions: instructions } : {}), ...(input.parameters ?? {}) };
  const { requestId } = await generationRepository.createPendingImageGeneration({
    chatId,
    modelId: model.id,
    type: "image",
    prompt: input.prompt,
    parameters
  });

  try {
    const { output, durationSeconds } = await requestImages(model, providerConfig, input);

    await generationRepository.completeImageGenerationSuccess({
      requestId,
      chatId,
      modelId: model.id,
      type: "image",
      prompt: input.prompt,
      parameters,
      images: output.images,
      rawMetadata: output.rawMetadata
    });
    await modelLoadEstimateRepository.recordSuccessfulDuration(model.providerId, model.providerModelName, durationSeconds);
  } catch (error) {
    await generationRepository.completeImageGenerationFailure({ requestId, error: sanitizeProviderError(error) });
    throw error;
  }
}

async function requestImages(model: StaticModel, providerConfig: NonNullable<Awaited<ReturnType<typeof providerConfigRepository.get>>>, input: ImageGenerationInput): Promise<{ output: NormalizedGenerationOutput; durationSeconds: number }> {
  try {
    if (isBrowserOffline()) throw new Error(providerConnectivityError);

    const provider = getProviderForModel(model);
    const startedAtMs = Date.now();
    const output = await provider.generateImage(model, providerConfig, input);
    const normalizedOutput = { ...output, images: await normalizeOutputImageSizes(output.images) };
    const durationSeconds = (Date.now() - startedAtMs) / 1000;
    return { output: normalizedOutput, durationSeconds };
  } catch (error) {
    throw new Error(sanitizeProviderError(error));
  }
}


function summarizeReferences(input: ImageGenerationInput) {
  return { count: input.references?.length ?? 0 };
}

async function normalizeOutputImageSizes(
  images: NormalizedGenerationOutput["images"]
): Promise<NormalizedGenerationOutput["images"]> {
  return Promise.all(images.map(async (image) => ({ ...image, blob: await scaleBlobToMaxLongEdge(image.blob, image.mimeType, 1280) })));
}

async function scaleBlobToMaxLongEdge(blob: Blob, mimeType: string | undefined, maxLongEdge: number): Promise<Blob> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob);
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(maxLongEdge / longEdge, 1);
    if (scale >= 1) return blob;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return blob;
    context.drawImage(bitmap, 0, 0, width, height);

    const outputType = selectOutputMimeType(mimeType);
    const converted = await canvasToBlob(canvas, outputType);
    return converted ?? blob;
  } catch {
    return blob;
  } finally {
    bitmap?.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), mimeType, mimeType === "image/jpeg" ? 0.92 : undefined);
  });
}

function selectOutputMimeType(mimeType?: string): string {
  if (mimeType === "image/png" || mimeType === "image/webp") return mimeType;
  return "image/jpeg";
}
