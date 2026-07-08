import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent, MouseEvent, RefObject } from "react";
import { Download, Eraser, Image as ImageIcon, Pin, RotateCcw, Send, SlidersHorizontal, Trash2 } from "lucide-react";
import type { GenerationRequestEntity, ImageEntity } from "../../db/entities";
import { formatMessageDate } from "../appHelpers";

const examplePrompts = [
  "Ein cineastisches Portrait einer Astronautin in einem Gewächshaus auf dem Mars, natürliches Licht, 35mm Filmlook.",
  "Produktfoto einer minimalistischen Keramiklampe auf warmem Travertin, weiche Schatten, Editorial-Stil.",
  "Isometrische Illustration einer kleinen Küstenstadt bei Sonnenuntergang, klare Formen, detailreich.",
  "Surreale Waldlichtung mit schwebenden Glasfischen, volumetrischer Nebel, ruhige Farbpalette."
];

const scrollBottomThreshold = 80;
const scrollTargetGap = 12;

type ScrollMetrics = {
  sessionId: string;
  firstContentId: string;
  contentCount: number;
  scrollHeight: number;
  scrollTop: number;
};

type MessageView = { id: string; content: string; requestId?: string; createdAt: string };

export function WorkspaceView(props: {
  sessionId?: string;
  contentReady: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  canGenerate: boolean;
  isGenerating: boolean;
  error?: string;
  connectivityNotice?: string;
  messages: MessageView[];
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
  const resultStreamRef = useRef<HTMLDivElement>(null);
  const latestMessageAnchorRef = useRef<HTMLSpanElement | null>(null);
  const bottomOverlayRef = useRef<HTMLDivElement>(null);
  const promptEditorRef = useRef<HTMLDivElement>(null);
  const contentCount = props.messages.length + props.images.length;
  const firstContentId = getFirstContentId(props.messages, props.images);
  const scrollState = useWorkspaceScroll({
    contentCount,
    contentReady: props.contentReady,
    firstContentId,
    latestMessageAnchorRef,
    scrollRef: resultStreamRef,
    sessionId: props.sessionId ?? "workspace"
  });

  useOverlayHeight(bottomOverlayRef, "--workspace-bottom-overlay-height");

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

  function clearPromptWithConfirmation(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();
    if (!props.prompt.trim()) return;
    const confirmed = window.confirm("Prompt-Eingabe wirklich löschen?");
    if (!confirmed) return;
    props.setPrompt("");
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
  const showWelcome = props.contentReady && props.messages.length === 0;

  function handleResultContentLoaded() {
    scrollState.alignToTargetIfFollowing();
  }

  return (
    <section className="workspace-body">
      <div ref={resultStreamRef} className="result-stream" onScroll={scrollState.handleScroll}>
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
        {props.messages.map((message, index) => {
          const request = message.requestId ? requestsById.get(message.requestId) : undefined;
          const isLatestMessage = index === props.messages.length - 1;
          return (
            <article key={message.id} className="prompt-card">
              <p>{message.content}</p>
              <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
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
              {isLatestMessage && <span ref={latestMessageAnchorRef} className="message-scroll-anchor" aria-hidden="true" />}
              {!!imagesByMessageId.byMessage.get(message.id)?.length && (
                <div className="image-grid">
                  {(imagesByMessageId.byMessage.get(message.id) ?? []).map((image) => (
                    <ImageCard key={image.id} image={image} overlayActive={props.overlayImageId === image.id} onContentLoaded={handleResultContentLoaded} onTogglePinned={props.onTogglePinned} onOverlay={props.onOverlay} />
                  ))}
                </div>
              )}
            </article>
          );
        })}
        {!!imagesByMessageId.withoutMessage.length && (
          <article className="prompt-card">
            <div className="image-grid">
              {imagesByMessageId.withoutMessage.map((image) => (
                <ImageCard key={image.id} image={image} overlayActive={props.overlayImageId === image.id} onContentLoaded={handleResultContentLoaded} onTogglePinned={props.onTogglePinned} onOverlay={props.onOverlay} />
              ))}
            </div>
          </article>
        )}
      </div>
      <div ref={bottomOverlayRef} className="workspace-bottom-overlay">
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
              <div className="d-inline-flex align-items-center gap-1">
                <button className="prompt-config" type="button" aria-label="Chat-Optionen öffnen" onClick={props.onOpenConfig}>
                  <SlidersHorizontal size={18} aria-hidden="true" />
                </button>
                <button className="prompt-clear" type="button" aria-label="Prompt-Eingabe löschen" onClick={clearPromptWithConfirmation}>
                  <Eraser size={18} aria-hidden="true" />
                </button>
              </div>
              <button className="btn btn-primary prompt-submit" type="submit" aria-label="Generieren" disabled={!props.canGenerate || props.isGenerating}>
                <Send size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

function getFirstContentId(messages: MessageView[], images: ImageEntity[]) {
  return messages[0]?.id ?? images[0]?.id ?? "empty";
}

function isNearBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < scrollBottomThreshold;
}

function isNearScrollTarget(scrollElement: HTMLElement, latestMessage: HTMLElement | null) {
  if (!latestMessage) return isNearBottom(scrollElement);
  return Math.abs(scrollElement.scrollTop - getLatestMessageScrollTop(scrollElement, latestMessage)) < scrollBottomThreshold;
}

function useOverlayHeight(ref: RefObject<HTMLElement | null>, cssVariable: string) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateHeight = () => {
      element.parentElement?.style.setProperty(cssVariable, `${element.offsetHeight}px`);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cssVariable, ref]);
}

function useWorkspaceScroll(params: {
  contentCount: number;
  contentReady: boolean;
  firstContentId: string;
  latestMessageAnchorRef: RefObject<HTMLElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  sessionId: string;
}) {
  const initialScrolledSessionRef = useRef<string | undefined>(undefined);
  const followingTargetRef = useRef(true);
  const previousMetricsRef = useRef<ScrollMetrics | undefined>(undefined);

  useLayoutEffect(() => {
    initialScrolledSessionRef.current = undefined;
    followingTargetRef.current = true;
    previousMetricsRef.current = undefined;
  }, [params.sessionId]);

  useLayoutEffect(() => {
    const element = params.scrollRef.current;
    if (!element || !params.contentReady) return;

    const previous = previousMetricsRef.current;
    const shouldInitialScroll = initialScrolledSessionRef.current !== params.sessionId;
    const olderContentPrepended = Boolean(
      previous &&
        previous.sessionId === params.sessionId &&
        previous.firstContentId !== params.firstContentId &&
        params.contentCount > previous.contentCount
    );

    if (shouldInitialScroll) {
      scrollToLatestMessage(element, params.latestMessageAnchorRef.current);
      initialScrolledSessionRef.current = params.sessionId;
      followingTargetRef.current = true;
    } else if (olderContentPrepended && previous) {
      element.scrollTop = element.scrollHeight - previous.scrollHeight + previous.scrollTop;
    } else if (followingTargetRef.current) {
      scrollToLatestMessage(element, params.latestMessageAnchorRef.current);
    }

    remember(false);
  }, [params.contentCount, params.contentReady, params.firstContentId, params.scrollRef, params.sessionId]);

  function handleScroll() {
    const element = params.scrollRef.current;
    if (!element) return;
    followingTargetRef.current = isNearScrollTarget(element, params.latestMessageAnchorRef.current);
  }

  function isAtBottom() {
    const element = params.scrollRef.current;
    return element ? isNearScrollTarget(element, params.latestMessageAnchorRef.current) : followingTargetRef.current;
  }

  function remember(updateFollowing = true) {
    const element = params.scrollRef.current;
    if (!element) return;
    previousMetricsRef.current = {
      sessionId: params.sessionId,
      firstContentId: params.firstContentId,
      contentCount: params.contentCount,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop
    };
    if (updateFollowing) followingTargetRef.current = isNearScrollTarget(element, params.latestMessageAnchorRef.current);
  }

  function alignToTargetIfFollowing() {
    const element = params.scrollRef.current;
    if (!element) return;
    if (followingTargetRef.current) scrollToLatestMessage(element, params.latestMessageAnchorRef.current);
    remember(false);
  }

  return { alignToTargetIfFollowing, handleScroll, isNearBottom: isAtBottom, remember };
}

function scrollToLatestMessage(scrollElement: HTMLElement, latestMessage: HTMLElement | null) {
  if (!latestMessage) {
    scrollElement.scrollTop = scrollElement.scrollHeight;
    return;
  }

  scrollElement.scrollTop = getLatestMessageScrollTop(scrollElement, latestMessage);
}

function getLatestMessageScrollTop(scrollElement: HTMLElement, latestMessage: HTMLElement) {
  const messageTop = latestMessage.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop;
  return messageTop - scrollElement.clientHeight + getScrollPaddingBottom(scrollElement) + scrollTargetGap;
}

function getScrollPaddingBottom(element: HTMLElement) {
  return Number.parseFloat(getComputedStyle(element).scrollPaddingBottom) || 0;
}

function ImageCard(props: { image: ImageEntity; overlayActive: boolean; onContentLoaded: () => void; onTogglePinned: (image: ImageEntity) => void; onOverlay: (id: string | undefined) => void }) {
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
          <img src={url} alt={props.image.prompt ?? "Generiertes Bild"} onLoad={props.onContentLoaded} />
        ) : (
          <span className="image-placeholder">
            <ImageIcon />
          </span>
        )}
      </button>
      <div className="d-flex justify-content-start gap-3">
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
