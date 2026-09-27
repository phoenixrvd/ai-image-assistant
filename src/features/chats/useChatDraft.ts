import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getChatDraft, releaseChatDraft } from "./draftStore";
import { chatQueries } from "./queries";

export function useChatDraft(chatId: string) {
  const client = useQueryClient();
  const store = useMemo(() => getChatDraft(chatId), [chatId]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    if (snapshot.savedRevision !== undefined) void client.invalidateQueries(chatQueries.list);
  }, [snapshot.savedRevision, client]);
  useEffect(() => {
    void store.load();
    return () => {
      void releaseChatDraft(chatId).then(() => client.invalidateQueries(chatQueries.list))
        .catch(() => { /* Failed drafts remain available for retry on return. */ });
    };
  }, [chatId, client, store]);
  return { ...snapshot, store };
}
