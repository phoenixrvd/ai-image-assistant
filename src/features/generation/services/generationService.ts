import { generationRepository } from "../../../db/repositories/generationRepository";
import { appOptionsRepository } from "../../../db/repositories/appOptionsRepository";
import { chatRepository } from "../../../db/repositories/chatRepository";
import { imageRepository } from "../../../db/repositories/imageRepository";
import { modelLoadEstimateRepository } from "../../../db/repositories/modelLoadEstimateRepository";
import {
  isProviderUsable,
  providerConfigRepository,
} from "../../../db/repositories/providerConfigRepository";
import {
  getModel,
  isModelEnabled,
  listUsableModels,
  modelSupportsImageInput,
  selectImageRoute,
  selectableModelId,
} from "../models/registry";
import {
  isBrowserOffline,
  providerConnectivityError,
  sanitizeProviderError,
} from "../providers/sanitize";
import { getProviderForModel } from "../providers/registry";
import type { NormalizedImageOutput } from "../providers/types";
import type { GenerationSubmission, StoredReference } from "../types";
import { isValidAspectRatio, isValidImageCount } from "../../chats/types";
import { blobToDataUrl } from "../../images/imageEncoding";
import { normalizeImages } from "../../images/normalizeImages";
import { generationCoordinator } from "./generationCoordinator";
import { generateChatTitle } from "./chatTitleService";
import i18n from "../../../i18n/i18n";

export async function startImageGeneration(submission: GenerationSubmission) {
  // Copy synchronously before any await; later UI changes cannot alter this run.
  const input = {
    ...submission,
    prompt: submission.prompt.trim(),
    references: submission.references
      .slice(0, 3)
      .map((reference) => ({ ...reference })),
  };
  let completed: CompletedGeneration | undefined;
  const outcome = await generationCoordinator.start(
    input.chatId,
    async ({ signal, setRunning }) => {
      const resolved = await resolveSubmission(input);
      signal.throwIfAborted();
      completed = await executeGeneration(input, resolved, signal, setRunning);
    },
  );
  return {
    outcome,
    aftercare: completed
      ? finishAftercare(input, completed)
      : Promise.resolve(),
  };
}

async function resolveSubmission(input: GenerationSubmission) {
  const model = getModel(input.modelId);
  const disabled = await appOptionsRepository.getDisabledModelIds();
  const config = model
    ? await providerConfigRepository.get(model.providerId)
    : undefined;
  if (
    !model ||
    model.type === "text" ||
    selectableModelId(input.modelId) !== input.modelId ||
    !isModelEnabled(model, disabled) ||
    !config ||
    !isProviderUsable(config)
  )
    throw new Error(i18n.t("errors.activeModel"));
  if (
    !input.prompt ||
    !isValidImageCount(input.imageCount) ||
    !isValidAspectRatio(input.aspectRatio)
  )
    throw new Error(i18n.t("errors.invalidGenerationInput"));
  const references = model.routes.edit ? input.references : [];
  if (!model.routes.create && !references.length)
    throw new Error(i18n.t("errors.referenceRequired"));
  if (isBrowserOffline()) throw new Error(providerConnectivityError());
  return {
    model,
    config,
    references,
    route: selectImageRoute(model, references.length > 0),
  };
}

type ResolvedSubmission = Awaited<ReturnType<typeof resolveSubmission>>;
type CompletedGeneration = {
  firstImage: NormalizedImageOutput;
  providerId: string;
  providerModelName: string;
  durationSeconds: number;
  titleModelId?: string;
};

async function executeGeneration(
  input: GenerationSubmission,
  resolved: ResolvedSubmission,
  signal: AbortSignal,
  setRunning: (seconds: number) => void,
): Promise<CompletedGeneration> {
  const { model, route, references } = resolved;
  const requestId = await generationRepository.createPendingImageGeneration({
    chatId: input.chatId,
    modelId: model.id,
    prompt: input.prompt,
    referenceInputs: references,
    parameters: {
      imageCount: input.imageCount,
      aspectRatio: input.aspectRatio,
      imageInstructions: input.instructions.trim(),
      references: { count: references.length },
      route: { kind: route.kind, providerModelName: route.providerModelName },
    },
  });
  try {
    const prepared = await prepareRequest(input, resolved, signal);
    signal.throwIfAborted();
    await generationRepository.markImageGenerationRunning(
      requestId,
      prepared.references,
    );
    signal.throwIfAborted();
    setRunning(prepared.estimatedSeconds);
    const result = await requestImages(
      input,
      resolved,
      prepared.references,
      signal,
    );
    await generationRepository.completeImageGenerationSuccess({
      requestId,
      ...result.output,
      signal,
    });
    return {
      firstImage: result.output.images[0],
      providerId: model.providerId,
      providerModelName: route.providerModelName,
      durationSeconds: result.durationSeconds,
      titleModelId: prepared.titleModelId,
    };
  } catch (error) {
    await recordFailure(requestId, error, signal);
    throw error;
  }
}

async function prepareRequest(
  input: GenerationSubmission,
  resolved: ResolvedSubmission,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const references: StoredReference[] = await Promise.all(
    resolved.references.map(async (reference) =>
      reference.type === "pinned"
        ? {
            type: "pinned" as const,
            imageId: reference.imageId,
            dataUrl: await blobToDataUrl(
              reference.blob,
              i18n.t("errors.fileRead"),
              signal,
            ),
          }
        : { ...reference },
    ),
  );
  const estimatedSeconds =
    await modelLoadEstimateRepository.getEstimatedSeconds(
      resolved.model.providerId,
      resolved.route.providerModelName,
    );
  const chat = await chatRepository.get(input.chatId);
  const images = await imageRepository.listByChat(input.chatId);
  let titleModelId: string | undefined;
  if (
    chat &&
    !chat.titleEdited &&
    !chat.titleGeneratedAt &&
    images.length === 0
  ) {
    const configs = await providerConfigRepository.list();
    const disabled = await appOptionsRepository.getDisabledModelIds();
    titleModelId = listUsableModels(["text"], configs, disabled).find(
      modelSupportsImageInput,
    )?.id;
  }
  return { references, estimatedSeconds, titleModelId };
}

async function requestImages(
  input: GenerationSubmission,
  resolved: ResolvedSubmission,
  references: StoredReference[],
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  if (isBrowserOffline()) throw new Error(providerConnectivityError());
  const startedAt = Date.now();
  const provider = getProviderForModel(resolved.model);
  const output = await provider.generateImage(
    resolved.route,
    resolved.config,
    {
      prompt: input.prompt,
      instructions: input.instructions,
      imageCount: input.imageCount,
      aspectRatio: input.aspectRatio,
      references: references.map((reference) => reference.dataUrl),
    },
    signal,
  );
  const images = await normalizeImages(output.images, signal);
  if (!images.length) throw new Error(i18n.t("errors.providerNoImage"));
  return {
    output: { ...output, images },
    durationSeconds: (Date.now() - startedAt) / 1000,
  };
}

async function recordFailure(
  requestId: string,
  error: unknown,
  signal: AbortSignal,
) {
  const cancelled =
    signal.aborted ||
    (error instanceof DOMException && error.name === "AbortError");
  try {
    await generationRepository.finishUnsuccessfulGeneration(
      requestId,
      cancelled ? "cancelled" : "failed",
      cancelled ? undefined : sanitizeProviderError(error),
    );
  } catch (persistenceError) {
    // Keep the original generation failure as the primary error.
    console.error("Recording generation failure failed.", persistenceError);
  }
}

async function finishAftercare(
  input: GenerationSubmission,
  result: CompletedGeneration,
) {
  const tasks = [
    modelLoadEstimateRepository.recordSuccessfulDuration(
      result.providerId,
      result.providerModelName,
      result.durationSeconds,
    ),
  ];
  if (result.titleModelId)
    tasks.push(
      generateChatTitle(
        input.chatId,
        result.titleModelId,
        result.firstImage,
        input.language,
      ),
    );
  const outcomes = await Promise.allSettled(tasks);
  for (const outcome of outcomes) {
    if (outcome.status === "rejected")
      console.error(
        "Generation aftercare failed; stored images remain successful.",
        outcome.reason,
      );
  }
}
