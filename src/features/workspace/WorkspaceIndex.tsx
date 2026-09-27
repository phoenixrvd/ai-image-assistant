import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { chatQueries } from "../chats/queries";
import { useModelConfiguration } from "../settings/queries";
import { chatRepository } from "../../db/repositories/chatRepository";

// Deduplicate the initial creation across StrictMode effect lifetimes.
let opening: ReturnType<typeof chatRepository.create> | undefined;

export function WorkspaceIndex() {
  const chats = useQuery(chatQueries.list);
  const models = useModelConfiguration();
  const client = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<Error>();
  useEffect(() => {
    if (!chats.isSuccess || !models.ready) return;
    if (!models.usable) { navigate("/options", { replace: true }); return; }
    if (chats.data[0]) { navigate(`/chats/${chats.data[0].id}`, { replace: true }); return; }
    let active = true;
    opening ??= chatRepository.create(t("navigation.newSession"), models.defaultModel?.id).finally(() => { opening = undefined; });
    void opening.then(async (chat) => {
      await client.invalidateQueries(chatQueries.list);
      if (active) navigate(`/chats/${chat.id}`, { replace: true });
    }).catch((failure) => { if (active) setError(failure); });
    return () => { active = false; };
  }, [chats.isSuccess, chats.data, models.ready, models.usable, models.defaultModel?.id, navigate, client, t]);
  const failure = error ?? chats.error ?? models.error;
  return failure ? <p className="alert alert-danger" role="alert">{failure.message}</p> : <p role="status">{t("common.loading")}</p>;
}
