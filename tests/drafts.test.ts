import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../src/db/database";
import { chatRepository } from "../src/db/repositories/chatRepository";
import { ChatDraftStore } from "../src/features/chats/draftStore";

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(async () => {
  await db.delete();
});

it("flushes distinct chat drafts before debounce without leaking data", async () => {
  const a = new ChatDraftStore((await chatRepository.create("A")).id);
  const b = new ChatDraftStore((await chatRepository.create("B")).id);
  await Promise.all([a.load(), b.load()]);
  a.update({ promptDraft: "A draft" });
  b.update({ promptDraft: "B draft" });
  await Promise.all([a.flush(), b.flush()]);
  expect((await chatRepository.readSettings(a.chatId)).promptDraft).toBe(
    "A draft",
  );
  expect((await chatRepository.readSettings(b.chatId)).promptDraft).toBe(
    "B draft",
  );
});

it("does not rehydrate an edited draft after a model/settings refetch", async () => {
  const store = new ChatDraftStore((await chatRepository.create("A")).id);
  await store.load();
  store.update({ promptDraft: "unsaved" });
  await store.load();
  expect(store.getSnapshot().data?.promptDraft).toBe("unsaved");
  await store.flush();
});

it("serializes older and newer writes and persists the latest value", async () => {
  const store = new ChatDraftStore((await chatRepository.create("A")).id);
  await store.load();
  const write = chatRepository.updateSettings.bind(chatRepository);
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(chatRepository, "updateSettings").mockImplementationOnce(
    async (id, patch) => {
      await barrier;
      await write(id, patch);
    },
  );
  store.update({ promptDraft: "old" });
  const first = store.flush();
  store.update({ promptDraft: "new" });
  const second = store.flush();
  release();
  await Promise.all([first, second]);
  expect((await chatRepository.readSettings(store.chatId)).promptDraft).toBe(
    "new",
  );
  expect(store.getSnapshot().data?.promptDraft).toBe("new");
});

it("retains newer edits and exposes a failed write for retry", async () => {
  const store = new ChatDraftStore((await chatRepository.create("A")).id);
  await store.load();
  vi.spyOn(chatRepository, "updateSettings").mockRejectedValueOnce(
    new Error("quota"),
  );
  store.update({ promptDraft: "keep me" });
  await expect(store.flush()).rejects.toThrow("quota");
  expect(store.getSnapshot().error?.message).toBe("quota");
  expect(store.getSnapshot().data?.promptDraft).toBe("keep me");
  store.update({ promptDraft: "latest" });
  await store.flush();
  expect((await chatRepository.readSettings(store.chatId)).promptDraft).toBe(
    "latest",
  );
  expect(store.getSnapshot().error).toBeUndefined();
});

it("updates automatic titles without overriding manual title edits", async () => {
  const store = new ChatDraftStore((await chatRepository.create("A")).id);
  await store.load();
  store.syncGeneratedTitle("Generated");
  expect(store.getSnapshot().data?.title).toBe("Generated");
  store.update({ title: "Manual" });
  store.syncGeneratedTitle("Late generated");
  expect(store.getSnapshot().data?.title).toBe("Manual");
  await store.flush();
});
