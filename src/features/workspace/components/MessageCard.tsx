import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react";
import type { GenerationRequestEntity } from "../../../db/entities";
import { getModel, getModelLabel } from "../../generation/models/registry";
import { formatMessageDate } from "../../../i18n/formatMessageDate";

export type MessageView = {
  id: string;
  content: string;
  requestId?: string;
  createdAt: string;
};

export function MessageCard(props: {
  message: MessageView;
  request?: GenerationRequestEntity;
  children: ReactNode;
  onDelete: (id: string) => void;
  onRepeat: (request: GenerationRequestEntity) => void;
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const model = props.request ? getModel(props.request.modelId) : undefined;
  return (
    <article className="prompt-card">
      {props.children}
      <button
        type="button"
        className={`message-prompt${expanded ? "" : " collapsed"}`}
        aria-expanded={expanded}
        onClick={() => setExpanded(true)}
      >
        {props.message.content}
      </button>
      <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
        <small className="message-meta">
          {formatMessageDate(
            props.message.createdAt,
            i18n.language === "de" ? "de" : "en",
          )}
          {props.request && (
            <span>
              {" "}
              · {model ? getModelLabel(model) : props.request.modelId}
            </span>
          )}
        </small>
        <div className="d-inline-flex align-items-center gap-2 ms-auto">
          <button
            type="button"
            className="message-delete"
            aria-label={t("workspace.deleteMessage")}
            onClick={() => props.onDelete(props.message.id)}
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
          {props.request && (
            <button
              type="button"
              className="prompt-repeat"
              aria-label={t("workspace.promptAgain")}
              onClick={() => props.onRepeat(props.request!)}
            >
              <RotateCcw size={12} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
