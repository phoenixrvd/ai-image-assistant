import { useLayoutEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type {
  GenerationRequestEntity,
  ImageEntity,
} from "../../../db/entities";
import { ImageCard } from "../../images/components/ImageCard";
import { MessageCard, type MessageView } from "./MessageCard";
import { PromptComposer, type PromptComposerProps } from "./PromptComposer";
import {
  useWorkspaceScroll,
  scrollToImage,
  scrollToLatestMessage,
} from "../hooks/useWorkspaceScroll";
import { useWorkspaceMeasurements } from "../hooks/useWorkspaceMeasurements";

export function WorkspaceView(
  props: PromptComposerProps & {
    sessionId: string;
    contentReady: boolean;
    error?: string;
    onDismissError: () => void;
    connectivityNotice?: string;
    messages: MessageView[];
    images: ImageEntity[];
    generationRequests: GenerationRequestEntity[];
    overlayImageId?: string;
    focusedImageId?: string;
    scrollToEndRequest: number;
    onDeleteMessage: (messageId: string) => void;
    onRepeatPrompt: (request: GenerationRequestEntity) => void;
    isCreatingChatFromImage: boolean;
    onCreateChatFromImage: (image: ImageEntity) => void;
    onTogglePinned: (image: ImageEntity) => void;
    onOverlay: (id: string | undefined) => void;
  },
) {
  const { t } = useTranslation();
  const stream = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const count = props.messages.length + props.images.length;
  const scroll = useWorkspaceScroll({
    sessionId: props.sessionId,
    contentReady: props.contentReady,
    contentCount: count,
    firstContentId: props.messages[0]?.id ?? props.images[0]?.id ?? "empty",
    scrollRef: stream,
    latestMessageAnchorRef: anchor,
  });
  useWorkspaceMeasurements(stream, overlay, count);
  useLayoutEffect(() => {
    const image = props.focusedImageId
      ? document.getElementById(`image-${props.focusedImageId}`)
      : undefined;
    if (stream.current && image) scrollToImage(stream.current, image);
  }, [props.focusedImageId]);
  useLayoutEffect(() => {
    if (stream.current && props.scrollToEndRequest)
      scrollToLatestMessage(stream.current, anchor.current, "smooth");
  }, [props.scrollToEndRequest]);
  const imagesByMessage = useMemo(() => {
    const groups = new Map<string | undefined, ImageEntity[]>();
    for (const image of props.images)
      groups.set(image.messageId, [
        ...(groups.get(image.messageId) ?? []),
        image,
      ]);
    return groups;
  }, [props.images]);
  const requests = useMemo(
    () =>
      new Map(props.generationRequests.map((request) => [request.id, request])),
    [props.generationRequests],
  );

  function imageGrid(images: ImageEntity[]) {
    return (
      images.length > 0 && (
        <div className="image-grid">
          {images.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              overlayActive={props.overlayImageId === image.id}
              onContentLoaded={scroll.alignToTargetIfFollowing}
              onCreateChatFromImage={
                image.requestId && requests.has(image.requestId)
                  ? props.onCreateChatFromImage
                  : undefined
              }
              isCreatingChatFromImage={props.isCreatingChatFromImage}
              onTogglePinned={props.onTogglePinned}
              onOverlay={props.onOverlay}
            />
          ))}
        </div>
      )
    );
  }

  return (
    <section className="workspace-body">
      <div
        ref={stream}
        className="result-stream"
        onScroll={scroll.handleScroll}
      >
        {props.contentReady && props.messages.length === 0 && (
          <section
            className="welcome-card"
            aria-label={t("workspace.examplesLabel")}
          >
            <p>{t("workspace.welcome")}</p>
            <div
              className="example-prompts"
              aria-label={t("workspace.examplesLabel")}
            >
              {[
                t("workspace.example1"),
                t("workspace.example2"),
                t("workspace.example3"),
                t("workspace.example4"),
              ].map((example) => (
                <pre
                  key={example}
                  role="button"
                  tabIndex={0}
                  onClick={() => props.setPrompt(example)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      props.setPrompt(example);
                    }
                  }}
                >
                  {example}
                </pre>
              ))}
            </div>
          </section>
        )}
        {props.messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            request={
              message.requestId ? requests.get(message.requestId) : undefined
            }
            onDelete={props.onDeleteMessage}
            onRepeat={props.onRepeatPrompt}
          >
            {imageGrid(imagesByMessage.get(message.id) ?? [])}
          </MessageCard>
        ))}
        {!!imagesByMessage.get(undefined)?.length && (
          <article className="prompt-card">
            {imageGrid(imagesByMessage.get(undefined)!)}
          </article>
        )}
        <span
          ref={anchor}
          className="message-scroll-anchor"
          aria-hidden="true"
        />
      </div>
      <div ref={overlay} className="workspace-bottom-overlay">
        {props.error && (
          <p className="alert alert-danger error-alert mb-0" role="alert">
            <span>{props.error}</span>
            <button
              type="button"
              className="btn-close error-dismiss"
              aria-label={t("workspace.closeError")}
              onClick={props.onDismissError}
            />
          </p>
        )}
        {props.connectivityNotice && (
          <p className="alert alert-warning mb-0">{props.connectivityNotice}</p>
        )}
        <PromptComposer {...props} />
      </div>
    </section>
  );
}
