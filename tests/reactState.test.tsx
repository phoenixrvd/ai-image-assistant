// @vitest-environment jsdom
import React, { StrictMode, type PropsWithChildren } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../src/db/database";
import { chatRepository } from "../src/db/repositories/chatRepository";
import { providerConfigRepository } from "../src/db/repositories/providerConfigRepository";
import { useChatDraft } from "../src/features/chats/useChatDraft";
import { flushChatDrafts } from "../src/features/chats/draftStore";
import { useSettingsMutation } from "../src/features/settings/mutations";
import { settingsQueries } from "../src/features/settings/queries";
import { generationCoordinator } from "../src/features/generation/services/generationCoordinator";
import { useGeneration } from "../src/features/generation/runtime/useGeneration";

let client: QueryClient;
function Wrapper({ children }: PropsWithChildren) {
  return <StrictMode><QueryClientProvider client={client}>{children}</QueryClientProvider></StrictMode>;
}
beforeEach(async () => {
  await db.delete(); await db.open();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(async () => {
  cleanup(); await flushChatDrafts(); client.clear(); await db.delete();
});

it("preserves chat-keyed drafts through StrictMode, unmount, and fast chat switching", async () => {
  const a = await chatRepository.create("A"); const b = await chatRepository.create("B");
  const hook = renderHook(({ chatId }) => useChatDraft(chatId), { initialProps: { chatId: a.id }, wrapper: Wrapper });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  act(() => hook.result.current.store.update({ promptDraft: "A unsaved" }));
  hook.rerender({ chatId: b.id });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  expect(hook.result.current.data?.promptDraft).toBe("");
  act(() => hook.result.current.store.update({ promptDraft: "B unsaved" }));
  hook.rerender({ chatId: a.id });
  await waitFor(() => expect(hook.result.current.data?.promptDraft).toBe("A unsaved"));
  expect((await chatRepository.readSettings(b.id)).promptDraft).toBe("B unsaved");
});

it("does not roll an older failed settings write over a newer successful change", async () => {
  const provider = (await providerConfigRepository.get("openai"))!;
  client.setQueryData(settingsQueries.providers.queryKey, [provider]);
  const save = providerConfigRepository.save.bind(providerConfigRepository);
  let rejectFirst!: (error: Error) => void;
  const first = new Promise<never>((_, reject) => { rejectFirst = reject; });
  vi.spyOn(providerConfigRepository, "save").mockImplementationOnce(() => first).mockImplementation(save);
  const hook = renderHook(() => useSettingsMutation(), { wrapper: Wrapper });
  act(() => {
    hook.result.current.mutate({ kind: "provider", value: { ...provider, baseUrl: "https://older.test" } });
    hook.result.current.mutate({ kind: "provider", value: { ...provider, baseUrl: "https://newer.test" } });
  });
  await waitFor(() => expect(client.getQueryData(settingsQueries.providers.queryKey)?.[0].baseUrl).toBe("https://newer.test"));
  await act(async () => { rejectFirst(new Error("write failed")); });
  await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
  expect((await providerConfigRepository.get("openai"))?.baseUrl).toBe("https://newer.test");
  expect(client.getQueryData(settingsQueries.providers.queryKey)?.[0].baseUrl).toBe("https://newer.test");
});

it("notifies React with immutable runtime snapshots and keeps unrelated chat snapshots stable", async () => {
  const hook = renderHook(() => useGeneration("runtime-A"), { wrapper: Wrapper });
  let complete!: () => void;
  const wait = new Promise<void>((resolve) => { complete = resolve; });
  let running!: ReturnType<typeof generationCoordinator.start>;
  await act(async () => {
    running = generationCoordinator.start("runtime-A", async ({ setRunning }) => { setRunning(30); await wait; });
  });
  const before = hook.result.current;
  expect(before?.phase).toBe("running");
  await act(async () => { await generationCoordinator.start("runtime-B", async () => {}); });
  expect(hook.result.current).toBe(before);
  await act(async () => { complete(); await running; });
  expect(before?.phase).toBe("running");
  expect(hook.result.current?.phase).toBe("succeeded");
  act(() => { generationCoordinator.dismiss("runtime-A"); generationCoordinator.dismiss("runtime-B"); });
});
