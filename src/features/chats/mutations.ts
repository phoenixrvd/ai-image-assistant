import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatRepository } from "../../db/repositories/chatRepository";
import { generationCoordinator } from "../generation/services/generationCoordinator";
import { flushChatDrafts, releaseChatDraft } from "./draftStore";
import { chatQueries, refreshChatData } from "./queries";
import { getHistoricalChatSettings } from "../generation/history";
import type { GenerationRequestEntity, ImageEntity, MessageEntity } from "../../db/entities";

export function useChatMutations() {
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: async ({ title, modelId }: { title: string; modelId?: string }) => {
      await flushChatDrafts();
      return chatRepository.create(title, modelId);
    },
    onSuccess: () => client.invalidateQueries(chatQueries.list),
  });
  const remove = useMutation({
    mutationFn: async (chatId: string) => {
      await releaseChatDraft(chatId);
      await generationCoordinator.cancelAndWait(chatId);
      await chatRepository.deleteWithChildren(chatId);
    },
    onSuccess: (_, chatId) => refreshChatData(client, chatId),
  });
  const derive = useMutation({
    mutationFn: async (input: { title: string; request: GenerationRequestEntity; message: MessageEntity; image: ImageEntity }) => {
      await flushChatDrafts();
      return chatRepository.createFromImage(input.title, getHistoricalChatSettings(input.request), input.message, input.image);
    },
    onSuccess: () => client.invalidateQueries(chatQueries.list),
  });
  return { create, remove, derive };
}
