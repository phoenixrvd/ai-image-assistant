import Dexie from "dexie";
import { afterEach, expect, it } from "vitest";
import { db, DB_SCHEMA_VERSION } from "../src/db/database";
import { chatRepository } from "../src/db/repositories/chatRepository";
import { readRequestReferences } from "../src/features/generation/history";

afterEach(async () => { await db.delete(); });

it("upgrades version 12 while preserving historical snapshots and binary chat content", async () => {
  await db.delete();
  const old = new Dexie(db.name);
  old.version(12).stores({
    chats: "id, updatedAt, lastMessageAt, pinned, archived",
    messages: "id, chatId, requestId, createdAt",
    images: "id, chatId, messageId, requestId, resultId, modelId, pinned, createdAt",
    providerConfigs: "id, enabled, updatedAt", modelLoadEstimates: "id, provider, modelName, updatedAt",
    appOptions: "key, updatedAt", generationRequests: "id, chatId, messageId, modelId, type, status, createdAt",
    generationResults: "id, requestId, chatId, messageId, type, createdAt",
  });
  await old.open();
  const historical = { id: "request", chatId: "chat", modelId: "fal-grok-imagine-edit", type: "image", prompt: "Historical", status: "failed", createdAt: "old", updatedAt: "old",
    parameters: { references: [{ type: "uploaded", name: "original", dataUrl: "data:image/png;base64,YQ==" }], imageInstructions: "Original rules" } };
  await old.table("generationRequests").add(historical);
  await old.table("chats").add({ id: "chat", title: "Original", createdAt: "old", updatedAt: "old", metadata: { chatSettings: { promptDraft: "Draft" } } });
  await old.table("images").add({ id: "image", chatId: "chat", blob: new Blob(["binary"], { type: "image/png" }), createdAt: "old", updatedAt: "old" });
  old.close(); await db.open();
  expect(db.verno).toBe(DB_SCHEMA_VERSION);
  const migrated = (await db.generationRequests.get("request"))!;
  expect(migrated).toEqual({ ...historical, snapshotVersion: 1 });
  expect(readRequestReferences(migrated)?.[0]).toMatchObject({ name: "original" });
  expect((await chatRepository.readSettings("chat")).promptDraft).toBe("Draft");
  expect(await (await db.images.get("image"))?.blob.text()).toBe("binary");
});

it("copies chat content independently and rolls back partial copies on failure", async () => {
  await db.open();
  const original = await chatRepository.create("Original");
  const image = { blob: new Blob(["image"], { type: "image/png" }), mimeType: "image/png" };
  const message = { role: "user" as const, content: "source" };
  const derived = await chatRepository.createFromImage("Derived", { promptDraft: "inherited" }, message, image);
  await chatRepository.deleteWithChildren(original.id);
  const [copied] = await db.images.where("chatId").equals(derived.id).toArray();
  expect(await copied.blob.text()).toBe("image");
  expect(copied.requestId).toBeUndefined();
  const fail = () => { throw new Error("quota"); };
  db.images.hook("creating", fail);
  try { await expect(chatRepository.createFromImage("Failed copy", {}, message, image)).rejects.toThrow("quota"); }
  finally { db.images.hook("creating").unsubscribe(fail); }
  expect((await db.chats.toArray()).map((chat) => chat.title)).toEqual(["Derived"]);
  expect(await db.messages.count()).toBe(1);
  expect(await db.images.count()).toBe(1);
});
