import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../src/db/database";
import { chatRepository } from "../src/db/repositories/chatRepository";
import { generationRepository } from "../src/db/repositories/generationRepository";
import { modelLoadEstimateRepository } from "../src/db/repositories/modelLoadEstimateRepository";
import { startImageGeneration } from "../src/features/generation/services/generationService";
import { generationCoordinator } from "../src/features/generation/services/generationCoordinator";
import * as providers from "../src/features/generation/providers/registry";
import * as encoding from "../src/features/images/imageEncoding";
import type { GenerationSubmission } from "../src/features/generation/types";
import type { NormalizedGenerationOutput } from "../src/features/generation/providers/types";
import i18n from "../src/i18n/i18n";
import { resources } from "../src/i18n/locales";

const image = {
  blob: new Blob(["image"], { type: "image/png" }),
  mimeType: "image/png",
};
const generateImage =
  vi.fn<(...args: unknown[]) => Promise<NormalizedGenerationOutput>>();
let input: GenerationSubmission;

beforeEach(async () => {
  await db.delete();
  await db.open();
  await i18n.init({ resources, lng: "en", fallbackLng: "en" });
  await db.providerConfigs.update("openai", { apiKey: "test", enabled: true });
  await db.providerConfigs.update("fal-ai", { apiKey: "test", enabled: true });
  const chat = await chatRepository.create("Test");
  await chatRepository.updateTitle(chat.id, "Manual title");
  input = {
    chatId: chat.id,
    modelId: "openai-image-1-5",
    prompt: "A bird",
    instructions: "Current rules",
    imageCount: 1,
    aspectRatio: "portrait",
    references: [],
    language: "en",
  };
  generateImage.mockReset().mockResolvedValue({ images: [image] });
  vi.spyOn(providers, "getProviderForModel").mockReturnValue({
    id: "test",
    label: "Test",
    supportsModelType: () => true,
    generateImage,
    generateText: vi.fn(),
  });
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
  );
});

afterEach(async () => {
  generationCoordinator.dismiss(input.chatId);
  vi.unstubAllGlobals();
  await db.delete();
});

describe("generation commit boundary", () => {
  it("keeps success when optional duration persistence fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(
      modelLoadEstimateRepository,
      "recordSuccessfulDuration",
    ).mockRejectedValue(new Error("quota"));
    const result = await startImageGeneration(input);
    await result.aftercare;
    expect(result.outcome).toBe("succeeded");
    const [request] = await db.generationRequests.toArray();
    expect(request.status).toBe("succeeded");
    expect(await db.images.count()).toBe(1);
    expect(await db.messages.count()).toBe(1);
    await generationRepository.finishUnsuccessfulGeneration(
      request.id,
      "failed",
      "late failure",
    );
    await generationRepository.finishUnsuccessfulGeneration(
      request.id,
      "cancelled",
    );
    expect((await db.generationRequests.get(request.id))?.status).toBe(
      "succeeded",
    );
  });

  it("stores failed preparation against the immutable accepted input", async () => {
    input.references = [
      { type: "pinned", imageId: "source", blob: image.blob },
    ];
    vi.spyOn(encoding, "blobToDataUrl").mockRejectedValue(
      new Error("Cannot encode"),
    );
    const result = await startImageGeneration(input);
    expect(result.outcome).toBe("failed");
    const [request] = await db.generationRequests.toArray();
    expect(request).toMatchObject({
      status: "failed",
      snapshotVersion: 2,
      prompt: "A bird",
      referenceInputs: [{ type: "pinned", imageId: "source" }],
    });
    expect(await request.referenceInputs?.[0].type).toBe("pinned");
    expect(generateImage).not.toHaveBeenCalled();
    expect(await db.messages.count()).toBe(0);
  });

  it("validates Edit-only before route selection and before accepting a request", async () => {
    input.modelId = "fal-seedream-v5-lite-edit";
    expect((await startImageGeneration(input)).outcome).toBe("failed");
    expect(generationCoordinator.get(input.chatId)?.error).toBe(
      i18n.t("errors.referenceRequired"),
    );
    expect(await db.generationRequests.count()).toBe(0);
    expect(generateImage).not.toHaveBeenCalled();
  });

  it("captures the submission before callers mutate it and records its edit route once", async () => {
    input.references = [
      {
        type: "uploaded",
        name: "reference",
        dataUrl: "data:image/png;base64,YQ==",
      },
    ];
    const running = startImageGeneration(input);
    input.prompt = "changed";
    input.references[0] = {
      type: "uploaded",
      name: "changed",
      dataUrl: "changed",
    };
    const result = await running;
    await result.aftercare;
    const [request] = await db.generationRequests.toArray();
    expect(request.prompt).toBe("A bird");
    expect(request.parameters?.route).toMatchObject({ kind: "edit" });
    expect(request.preparedReferences?.[0]).toMatchObject({
      name: "reference",
    });
    expect(generateImage.mock.calls[0][0]).toMatchObject({ kind: "edit" });
    expect(generateImage.mock.calls[0][2]).toMatchObject({
      prompt: "A bird",
      instructions: "Current rules",
    });
  });

  it("cancels during provider IO without visible output, then permits retry", async () => {
    generateImage.mockImplementationOnce(
      async (...args) =>
        new Promise((_, reject) => {
          const signal = args[3] as AbortSignal;
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const running = startImageGeneration(input);
    await vi.waitFor(() => expect(generateImage).toHaveBeenCalled());
    await generationCoordinator.cancelAndWait(input.chatId);
    expect((await running).outcome).toBe("cancelled");
    expect((await db.generationRequests.toArray())[0].status).toBe("cancelled");
    expect(await db.images.count()).toBe(0);
    // The cancellation cleanup must finish before a new start is accepted.
    await vi.waitFor(() =>
      expect(generationCoordinator.get(input.chatId)).toBeUndefined(),
    );
    const retry = await startImageGeneration(input);
    await retry.aftercare;
    expect(retry.outcome).toBe("succeeded");
    expect(await db.images.count()).toBe(1);
  });

  it("rolls back the whole success transaction when aborted during image insertion", async () => {
    const abortAtInsertion = () => {
      generationCoordinator.cancel(input.chatId);
    };
    db.images.hook("creating", abortAtInsertion);
    try {
      const result = await startImageGeneration(input);
      expect(result.outcome).toBe("cancelled");
      expect(await db.images.count()).toBe(0);
      expect(await db.messages.count()).toBe(0);
      expect(await db.generationResults.count()).toBe(0);
      expect((await db.generationRequests.toArray())[0].status).toBe(
        "cancelled",
      );
    } finally {
      db.images.hook("creating").unsubscribe(abortAtInsertion);
    }
  });

  it("ignores cancellation after commit and never downgrades saved output", async () => {
    const complete =
      generationRepository.completeImageGenerationSuccess.bind(
        generationRepository,
      );
    vi.spyOn(
      generationRepository,
      "completeImageGenerationSuccess",
    ).mockImplementation(async (args) => {
      await complete(args);
      generationCoordinator.cancel(input.chatId);
    });
    const result = await startImageGeneration(input);
    await result.aftercare;
    expect(result.outcome).toBe("succeeded");
    expect((await db.generationRequests.toArray())[0].status).toBe("succeeded");
  });

  it("keeps different chat generations independent while deleting one", async () => {
    const second = await chatRepository.create("Second");
    await chatRepository.updateTitle(second.id, "Second manual");
    generateImage.mockImplementationOnce(
      async (...args) =>
        new Promise((_, reject) => {
          const signal = args[3] as AbortSignal;
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const firstRun = startImageGeneration(input);
    await vi.waitFor(() => expect(generateImage).toHaveBeenCalledTimes(1));
    const secondRun = await startImageGeneration({
      ...input,
      chatId: second.id,
    });
    await secondRun.aftercare;
    await generationCoordinator.cancelAndWait(input.chatId);
    await chatRepository.deleteWithChildren(input.chatId);
    expect((await firstRun).outcome).toBe("cancelled");
    expect(secondRun.outcome).toBe("succeeded");
    expect((await db.images.toArray()).map((entry) => entry.chatId)).toEqual([
      second.id,
    ]);
    generationCoordinator.dismiss(second.id);
  });
});
