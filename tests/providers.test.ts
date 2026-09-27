import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchProvider, sanitizeProviderError } from "../src/features/generation/providers/sanitize";
import { OpenAiCompatibleProvider } from "../src/features/generation/providers/openAiCompatibleProvider";
import { FalAiProvider } from "../src/features/generation/providers/falAiProvider";
import i18n from "../src/i18n/i18n";
import { resources } from "../src/i18n/locales";

beforeEach(async () => { await i18n.init({ resources, lng: "en" }); });
afterEach(() => vi.unstubAllGlobals());

it("preserves technical TypeErrors outside transport", () => {
  expect(sanitizeProviderError(new TypeError("Programming bug"))).toBe("Programming bug");
});

it("classifies fetch failures with their original cause", async () => {
  const original = new TypeError("Failed to fetch");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(original));
  await expect(fetchProvider("https://example.test")).rejects.toMatchObject({ message: i18n.t("errors.connectivity"), cause: original });
});

it("preserves cancellation errors", async () => {
  const controller = new AbortController(); controller.abort();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(controller.signal.reason));
  await expect(fetchProvider("https://example.test", { signal: controller.signal })).rejects.toBe(controller.signal.reason);
});

it.each([new OpenAiCompatibleProvider(), new FalAiProvider()])("rejects failed result-image HTTP responses ($id)", async (provider) => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(provider.id === "openai" ? { data: [{ url: "https://example.test/image" }] } : { images: [{ url: "https://example.test/image" }] }))
    .mockResolvedValueOnce(new Response("Image unavailable", { status: 503 }));
  vi.stubGlobal("fetch", fetch);
  await expect(provider.generateImage({ kind: "create", providerModelName: "test" }, { id: provider.id, baseUrl: "https://example.test", apiKey: "test", createdAt: "", updatedAt: "" }, { prompt: "test", imageCount: 1, aspectRatio: "portrait" }))
    .rejects.toThrow("503");
});
