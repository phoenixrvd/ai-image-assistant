import { chatRepository, parseChatSettings } from "../../db/repositories/chatRepository";
import type { ChatSettings } from "./types";
import type { UploadedReference } from "../generation/types";
import { createClientId } from "../../db/id";

export type ChatDraft = Omit<Required<ChatSettings>, "activeImageModelId" | "uploadedReferences"> & {
  title: string;
  activeImageModelId?: string;
  uploadedReferences: UploadedReference[];
  referenceMode: "default" | "restored";
};
type DraftSnapshot = { data?: ChatDraft; error?: Error; ready: boolean; savedRevision?: number };
type DraftPatch = Partial<ChatDraft>;

// One editable draft and write queue per chat. Queries remain the owner of
// persisted history; they never rehydrate a dirty editor on refetch.
export class ChatDraftStore {
  private snapshot: DraftSnapshot = { ready: false };
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private pending: DraftPatch = {};
  private writing?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private revision = 0;
  private titleEdited = false;

  constructor(readonly chatId: string) {}

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  isObserved() { return this.listeners.size > 0; }

  load() {
    if (this.snapshot.ready) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = this.hydrate().finally(() => { this.loading = undefined; });
    return this.loading;
  }

  private async hydrate() {
    try {
      const chat = await chatRepository.get(this.chatId);
      if (!chat) throw new Error("Chat not found");
      const settings = parseChatSettings(chat);
      this.publish({ ready: true, data: {
        title: chat.title, promptDraft: settings.promptDraft ?? "",
        activeImageModelId: settings.activeImageModelId, imageCount: settings.imageCount ?? 1,
        aspectRatio: settings.aspectRatio ?? "portrait", imageInstructions: settings.imageInstructions ?? "",
        uploadedReferences: (settings.uploadedReferences ?? []).map((reference) => ({ ...reference, id: createClientId() })),
        referenceMode: "default",
      } });
    } catch (error) { this.publish({ ready: false, error: asError(error) }); }
  }

  update(patch: DraftPatch) {
    if (!this.snapshot.data) return;
    this.revision += 1;
    if (patch.title !== undefined) this.titleEdited = true;
    this.pending = { ...this.pending, ...patch };
    this.publish({ ...this.snapshot, data: { ...this.snapshot.data, ...patch } });
    clearTimeout(this.timer);
    if (Object.keys(patch).every((key) => key === "promptDraft"))
      this.timer = setTimeout(() => { void this.flush().catch(() => { /* Error is exposed in the draft snapshot. */ }); }, 300);
    else void this.flush().catch(() => { /* Error is exposed in the draft snapshot. */ });
  }

  syncGeneratedTitle(title: string) {
    if (!this.snapshot.data || this.titleEdited || this.snapshot.data.title === title) return;
    this.publish({ ...this.snapshot, data: { ...this.snapshot.data, title } });
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.writing) await this.writing;
    if (!Object.keys(this.pending).length) return;
    const patch = this.pending;
    const revision = this.revision;
    this.pending = {};
    this.writing = this.persist(patch).then(() => {
      this.publish({ ...this.snapshot, savedRevision: revision, error: revision === this.revision ? undefined : this.snapshot.error });
    }).catch((error) => {
      this.pending = { ...patch, ...this.pending };
      this.publish({ ...this.snapshot, error: asError(error) });
      throw error;
    });
    try { await this.writing; } finally { this.writing = undefined; }
    if (Object.keys(this.pending).length) await this.flush();
  }

  private async persist(patch: DraftPatch) {
    const { title, referenceMode: _mode, uploadedReferences, ...fields } = patch;
    const settings: ChatSettings = fields;
    if (uploadedReferences) settings.uploadedReferences = uploadedReferences.map(({ name, dataUrl }) => ({ name, dataUrl }));
    if (Object.keys(settings).length) await chatRepository.updateSettings(this.chatId, settings);
    if (title?.trim()) await chatRepository.updateTitle(this.chatId, title.trim());
  }

  private publish(snapshot: DraftSnapshot) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

const drafts = new Map<string, ChatDraftStore>();

export function getChatDraft(chatId: string) {
  let store = drafts.get(chatId);
  if (!store) { store = new ChatDraftStore(chatId); drafts.set(chatId, store); }
  return store;
}

export async function flushChatDrafts() {
  await Promise.all([...drafts.values()].map((draft) => draft.flush()));
}

export async function releaseChatDraft(chatId: string) {
  const store = drafts.get(chatId);
  if (!store) return;
  await store.flush();
  if (drafts.get(chatId) === store && !store.isObserved()) drafts.delete(chatId);
}
