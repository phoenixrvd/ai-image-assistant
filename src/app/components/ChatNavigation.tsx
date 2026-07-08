import { ArrowLeft, Menu, Plus, Settings } from "lucide-react";
import type { ChatEntity } from "../../db/entities";
import { formatMessageDate } from "../appHelpers";

export function ChatNavigation(props: {
  chats: ChatEntity[];
  activeChatId?: string;
  open: boolean;
  showCloseControl?: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onOptions: () => void;
}) {
  const showCloseControl = props.open || props.showCloseControl;

  return (
    <aside className={`chat-nav ${props.open ? "open" : "closed"}`}>
      <div className="nav-header">
        <strong>Image Assistant</strong>
        <button
          className="btn btn-outline-secondary icon-button nav-toggle"
          aria-label={showCloseControl ? "Navigation einklappen" : "Navigation ausklappen"}
          onClick={props.onToggle}
        >
          {showCloseControl ? <ArrowLeft size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <div className="chat-list">
        {props.chats.map((chat) => (
          <button key={chat.id} className={chat.id === props.activeChatId ? "chat-item active" : "chat-item"} onClick={() => props.onSelect(chat.id)}>
            <span>{chat.title}</span>
            <small className="message-time">{formatMessageDate(chat.lastMessageAt ?? chat.updatedAt)}</small>
          </button>
        ))}
      </div>
      <div className="nav-actions d-grid gap-2 mt-auto">
        <button className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2" onClick={props.onCreate}>
          <Plus size={18} /> Neue Sitzung
        </button>
        <button className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-2" onClick={props.onOptions}>
          <Settings size={18} /> Optionen
        </button>
      </div>
    </aside>
  );
}
