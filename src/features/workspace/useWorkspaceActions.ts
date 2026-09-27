import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { GenerationRequestEntity, ImageEntity, MessageEntity } from "../../db/entities";
import { imageRepository } from "../../db/repositories/imageRepository";
import { messageRepository } from "../../db/repositories/messageRepository";
import { createClientId } from "../../db/id";
import type { ChatDraftStore } from "../chats/draftStore";
import { useChatMutations } from "../chats/mutations";
import { chatQueries, refreshChatData } from "../chats/queries";
import { getHistoricalChatSettings, readRequestReferences } from "../generation/history";
import { modelSupportsReferenceImages } from "../generation/models/registry";
import type { StaticModel } from "../generation/models/types";
import { startImageGeneration } from "../generation/services/generationService";
import { generationCoordinator } from "../generation/services/generationCoordinator";
import { normalizeLanguage } from "../../i18n/language";
import { blobToDataUrl } from "../images/imageEncoding";
import { settingsQueries } from "../settings/queries";

export function useWorkspaceActions(store: ChatDraftStore, models: StaticModel[]) {
  const client = useQueryClient();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const chats = useChatMutations();
  const pendingSubmission = useRef<AbortController | undefined>(undefined);
  const edit = useMutation({ mutationFn: async (operation: () => Promise<void>) => operation() });
  const generate = useMutation({
    mutationFn: async ({ model, pinned }: { model: StaticModel; pinned: ImageEntity[] }) => {
      const preparation = new AbortController();
      pendingSubmission.current = preparation;
      const draft = store.getSnapshot().data!;
      // Capture before flushing; edits while the write is pending belong to the next submission.
      const input = {
        chatId: store.chatId, modelId: model.id, prompt: draft.promptDraft, instructions: draft.imageInstructions,
        imageCount: draft.imageCount, aspectRatio: draft.aspectRatio, language: normalizeLanguage(i18n.language) ?? "en" as const,
        references: modelSupportsReferenceImages(model) ? [
          ...pinned.map((image) => ({ type: "pinned" as const, imageId: image.id, blob: image.blob })),
          ...draft.uploadedReferences.map(({ name, dataUrl }) => ({ type: "uploaded" as const, name, dataUrl })),
        ] : [],
      };
      await store.flush();
      if (preparation.signal.aborted) return;
      const { aftercare } = await startImageGeneration(input);
      await refreshChatData(client, store.chatId);
      void aftercare.then(() => Promise.all([client.invalidateQueries(chatQueries.list), client.invalidateQueries(settingsQueries.estimates)]))
        .catch((error) => console.error("Refreshing generation aftercare failed.", error));
    },
  });

  function repeat(request: GenerationRequestEntity) {
    const historical = getHistoricalChatSettings(request);
    const references = readRequestReferences(request);
    const model = models.find((entry) => entry.id === historical.activeImageModelId);
    store.update({
      promptDraft: historical.promptDraft,
      ...(model ? { activeImageModelId: model.id } : {}),
      ...(historical.imageCount ? { imageCount: historical.imageCount } : {}),
      ...(historical.aspectRatio ? { aspectRatio: historical.aspectRatio } : {}),
      ...(references ? { referenceMode: "restored", uploadedReferences: references.map((reference, index) => ({
        id: createClientId(), name: reference.type === "uploaded" ? reference.name : `${t("config.referenceImage")} ${index + 1}`, dataUrl: reference.dataUrl,
      })) } : {}),
    });
  }

  return {
    error: edit.error ?? generate.error ?? chats.derive.error,
    dismiss() { edit.reset(); generate.reset(); chats.derive.reset(); },
    generating: generate.isPending,
    cancel() { pendingSubmission.current?.abort(); generationCoordinator.cancel(store.chatId); },
    deriving: chats.derive.isPending,
    submit: (model: StaticModel, pinned: ImageEntity[]) => generate.mutate({ model, pinned }),
    repeat,
    removeMessage(messageId: string) {
      if (!window.confirm(t("dialogs.deleteMessage"))) return;
      edit.mutate(async () => { await messageRepository.deleteWithImages(messageId); await refreshChatData(client, store.chatId); });
    },
    pin(image: ImageEntity, pinnedCount: number) {
      if (!image.pinned && pinnedCount >= 3) { window.alert(t("workspace.maxPinned")); return; }
      store.update({ referenceMode: "default" });
      edit.mutate(async () => { await imageRepository.togglePinned(image.id, !image.pinned); await client.invalidateQueries(chatQueries.images(store.chatId)); });
    },
    upload(files: File[]) {
      edit.mutate(async () => {
        const uploaded = await Promise.all(files.map(async (file) => ({ id: createClientId(), name: file.name, dataUrl: await blobToDataUrl(file, t("errors.fileRead")) })));
        const current = store.getSnapshot().data!;
        store.update({ uploadedReferences: [...current.uploadedReferences, ...uploaded].slice(0, 3) });
        await store.flush();
      });
    },
    derive(image: ImageEntity, requests: GenerationRequestEntity[], messages: MessageEntity[]) {
      edit.mutate(async () => {
        const request = requests.find((entry) => entry.id === image.requestId);
        const message = messages.find((entry) => entry.id === image.messageId);
        if (!request || !message) throw new Error(t("dialogs.historicalSettings"));
        const chat = await chats.derive.mutateAsync({ title: t("navigation.newSession"), request, image, message });
        // A late completion must not navigate away from another chat.
        if (window.location.hash.startsWith(`#/chats/${store.chatId}`)) navigate(`/chats/${chat.id}`);
      });
    },
    configure(path: string) { edit.mutate(async () => { await store.flush(); navigate(path); }); },
  };
}
