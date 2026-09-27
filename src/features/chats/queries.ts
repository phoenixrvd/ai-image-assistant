import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { chatRepository } from "../../db/repositories/chatRepository";
import { imageRepository } from "../../db/repositories/imageRepository";
import { messageRepository } from "../../db/repositories/messageRepository";
import { generationRepository } from "../../db/repositories/generationRepository";

export const chatQueries = {
  list: queryOptions({ queryKey: ["chats"], queryFn: chatRepository.list }),
  messages: (chatId: string) =>
    queryOptions({
      queryKey: ["messages", chatId],
      queryFn: () => messageRepository.listByChat(chatId),
    }),
  images: (chatId: string) =>
    queryOptions({
      queryKey: ["images", chatId],
      queryFn: () => imageRepository.listByChat(chatId),
    }),
  requests: (chatId: string) =>
    queryOptions({
      queryKey: ["generationRequests", chatId],
      queryFn: () => generationRepository.listRequestsByChat(chatId),
    }),
};

export async function refreshChatData(client: QueryClient, chatId: string) {
  await Promise.all([
    client.invalidateQueries(chatQueries.list),
    client.invalidateQueries(chatQueries.messages(chatId)),
    client.invalidateQueries(chatQueries.images(chatId)),
    client.invalidateQueries(chatQueries.requests(chatId)),
  ]);
}
