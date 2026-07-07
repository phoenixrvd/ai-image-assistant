import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Download, Image as ImageIcon, Pin, RotateCcw, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import type { GenerationRequestEntity, ImageEntity } from "../../db/entities";
import { formatMessageDate } from "../appHelpers";

const examplePrompts = [
  "Ein cineastisches Portrait einer Astronautin in einem Gewächshaus auf dem Mars, natürliches Licht, 35mm Filmlook.",
  "Produktfoto einer minimalistischen Keramiklampe auf warmem Travertin, weiche Schatten, Editorial-Stil.",
  "Isometrische Illustration einer kleinen Küstenstadt bei Sonnenuntergang, klare Formen, detailreich.",
  "Surreale Waldlichtung mit schwebenden Glasfischen, volumetrischer Nebel, ruhige Farbpalette."
];

export function WorkspaceView(props: {
  prompt: string;
  setPrompt: (value: string) => void;
  canGenerate: boolean;
  isGenerating: boolean;
  error?: string;
  connectivityNotice?: string;
  messages: Array<{ id: string; content: string; requestId?: string; createdAt: string }>;
  images: ImageEntity[];
  generationRequests: GenerationRequestEntity[];
  overlayImageId?: string;
  onGenerate: () => void;
  onOpenConfig: () => void;
  onDeleteMessage: (messageId: string) => void;
  onRepeatPrompt: (request: GenerationRequestEntity) => void;
  onTogglePinned: (image: ImageEntity) => void;
  onOverlay: (id: string | undefined) => void;
}) {
  const streamEndRef = useRef<HTMLDivElement>(null);
  const promptEditorRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!props.messages.length && !props.images.length) return;
    streamEndRef.current?.scrollIntoView({ block: "end" });
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [props.messages.length, props.images.length]);

  useLayoutEffect(() => {
    const editor = promptEditorRef.current;
    if (!editor || editor.textContent === props.prompt) return;
    editor.textContent = props.prompt;
  }, [props.prompt]);

  function handleSubmit() {
    if (!props.canGenerate || props.isGenerating) return;
    props.onGenerate();
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
    event.preventDefault();
    if (!props.canGenerate || props.isGenerating) return;
    event.currentTarget.closest("form")?.requestSubmit();
  }

  function handlePromptPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  }

  const imagesByMessageId = useMemo(() => {
    const byMessage = new Map<string, ImageEntity[]>();
    const withoutMessage: ImageEntity[] = [];
    for (const image of props.images) {
      if (!image.messageId) {
        withoutMessage.push(image);
        continue;
      }
      const list = byMessage.get(image.messageId) ?? [];
      list.push(image);
      byMessage.set(image.messageId, list);
    }
    return { byMessage, withoutMessage };
  }, [props.images]);

  const requestsById = useMemo(() => new Map(props.generationRequests.map((request) => [request.id, request])), [props.generationRequests]);
  const showWelcome = props.messages.length === 0 && props.images.length === 0;

  return (
    <section className="workspace-body container-xxl">
      <div className="result-stream">
        {showWelcome && (
          <section className="welcome-card" aria-label="Beispiel-Prompts">
            <p>Beschreibe dein Bild frei oder übernimm eines der Beispiele in das Prompt-Feld.</p>
            <div className="example-prompts" aria-label="Beispiel-Prompts">
              {examplePrompts.map((example) => (
                <pre key={example} role="button" tabIndex={0} onClick={() => props.setPrompt(example)} onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  props.setPrompt(example);
                }}>
                  {example}
                </pre>
              ))}
            </div>
          </section>
        )}
        {props.messages.map((message) => {
          const request = message.requestId ? requestsById.get(message.requestId) : undefined;
          return (
            <article key={message.id} className="prompt-card">
              <p>{message.content}</p>
              {!!imagesByMessageId.byMessage.get(message.id)?.length && (
                <div className="image-grid">
                  {(imagesByMessageId.byMessage.get(message.id) ?? []).map((image) => (
                    <ImageCard key={image.id} image={image} overlayActive={props.overlayImageId === image.id} onTogglePinned={props.onTogglePinned} onOverlay={props.onOverlay} />
                  ))}
                </div>
              )}
              <div className="message-meta">
                <button type="button" className="message-delete" aria-label="Nachricht löschen" onClick={() => props.onDeleteMessage(message.id)}>
                  <Trash2 size={12} aria-hidden="true" />
                </button>
                {request && (
                  <button type="button" className="prompt-repeat" aria-label="Prompt wiederholen" onClick={() => props.onRepeatPrompt(request)}>
                    <RotateCcw size={12} aria-hidden="true" />
                  </button>
                )}
                <small className="message-time">{formatMessageDate(message.createdAt)}</small>
              </div>
            </article>
          );
        })}
        {!!imagesByMessageId.withoutMessage.length && (
          <article className="prompt-card">
            <div className="image-grid">
              {imagesByMessageId.withoutMessage.map((image) => (
                <ImageCard key={image.id} image={image} overlayActive={props.overlayImageId === image.id} onTogglePinned={props.onTogglePinned} onOverlay={props.onOverlay} />
              ))}
            </div>
          </article>
        )}
        <div ref={streamEndRef} aria-hidden="true" />
      </div>
      {props.error && <p className="alert alert-danger mb-0">{props.error}</p>}
      {props.connectivityNotice && <p className="alert alert-warning mb-0">{props.connectivityNotice}</p>}
      <form
        className="prompt-bar"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className={props.isGenerating ? "prompt-input-shell is-generating" : "prompt-input-shell"}>
          <div
            ref={promptEditorRef}
            className="prompt-editable"
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-label="..."
            data-placeholder="..."
            onInput={(event) => props.setPrompt(event.currentTarget.textContent ?? "")}
            onKeyDown={handlePromptKeyDown}
            onPaste={handlePromptPaste}
          />
          <div className="prompt-controls">
            <button className="prompt-config" type="button" aria-label="Chat-Optionen öffnen" onClick={props.onOpenConfig}>
              <SlidersHorizontal size={18} aria-hidden="true" />
            </button>
            <button className="btn btn-primary prompt-submit" type="submit" aria-label="Generieren" disabled={!props.canGenerate || props.isGenerating}>
              <Send size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function ImageCard(props: { image: ImageEntity; overlayActive: boolean; onTogglePinned: (image: ImageEntity) => void; onOverlay: (id: string | undefined) => void }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    const objectUrl = URL.createObjectURL(props.image.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [props.image.blob]);

  function download() {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = getDownloadFilename(props.image);
    link.click();
  }

  return (
    <figure id={`image-${props.image.id}`} className={props.overlayActive ? "image-card overlay embedded" : "image-card embedded"}>
      <button type="button" className="image-preview-button" aria-label="Bild als Overlay öffnen" onClick={() => props.onOverlay(props.image.id)}>
        {url ? (
          <img src={url} alt={props.image.prompt ?? "Generiertes Bild"} />
        ) : (
          <span className="image-placeholder">
            <ImageIcon />
          </span>
        )}
      </button>
      <div className="image-actions">
        <button type="button" className="image-action" aria-label="Bild herunterladen" onClick={download}>
          <Download size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={props.image.pinned ? "image-action active" : "image-action"}
          aria-pressed={Boolean(props.image.pinned)}
          aria-label={props.image.pinned ? "Bild nicht mehr pinnen" : "Bild pinnen"}
          onClick={() => props.onTogglePinned(props.image)}
        >
          <Pin size={17} aria-hidden="true" />
        </button>
      </div>
    </figure>
  );
}

function getDownloadFilename(image: ImageEntity): string {
  return `aiia-${image.chatId.slice(0, 2)}-${formatDownloadTimestamp(image.createdAt)}.${getImageExtension(image)}`;
}

function formatDownloadTimestamp(value: string): string {
  const timestamp = value.replace(/\D/g, "").slice(0, 14);
  if (timestamp.length === 14) return `${timestamp.slice(0, 8)}-${timestamp.slice(8)}`;

  const fallbackTimestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `${fallbackTimestamp.slice(0, 8)}-${fallbackTimestamp.slice(8)}`;
}

function getImageExtension(image: ImageEntity): string {
  const mimeType = image.mimeType ?? image.blob.type;
  const subtype = mimeType.split("/")[1]?.split(";")[0]?.toLowerCase();

  if (subtype === "svg+xml") return "svg";
  return subtype || "png";
}
