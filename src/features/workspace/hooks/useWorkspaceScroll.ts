import { useLayoutEffect, useRef, type RefObject } from "react";

type Metrics = {
  sessionId: string;
  firstContentId: string;
  contentCount: number;
  scrollHeight: number;
  scrollTop: number;
};

export function useWorkspaceScroll(params: {
  sessionId: string;
  firstContentId: string;
  contentCount: number;
  contentReady: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  latestMessageAnchorRef: RefObject<HTMLElement | null>;
}) {
  const initialized = useRef<string | undefined>(undefined);
  const following = useRef(true);
  const metrics = useRef<Metrics | undefined>(undefined);
  useLayoutEffect(() => {
    initialized.current = undefined;
    following.current = true;
    metrics.current = undefined;
  }, [params.sessionId]);
  function remember() {
    const element = params.scrollRef.current;
    if (!element) return;
    metrics.current = {
      sessionId: params.sessionId,
      firstContentId: params.firstContentId,
      contentCount: params.contentCount,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    };
  }
  useLayoutEffect(() => {
    const element = params.scrollRef.current;
    if (!element || !params.contentReady) return;
    const previous = metrics.current;
    if (initialized.current !== params.sessionId) {
      scrollToLatestMessage(element, params.latestMessageAnchorRef.current);
      initialized.current = params.sessionId;
      following.current = true;
    } else if (
      previous &&
      previous.sessionId === params.sessionId &&
      previous.firstContentId !== params.firstContentId &&
      params.contentCount > previous.contentCount
    ) {
      element.scrollTop =
        element.scrollHeight - previous.scrollHeight + previous.scrollTop;
    } else if (following.current)
      scrollToLatestMessage(element, params.latestMessageAnchorRef.current);
    remember();
  }, [
    params.sessionId,
    params.firstContentId,
    params.contentCount,
    params.contentReady,
    params.scrollRef,
  ]);
  return {
    handleScroll() {
      const element = params.scrollRef.current;
      if (element)
        following.current =
          Math.abs(
            element.scrollTop -
              latestScrollTop(element, params.latestMessageAnchorRef.current),
          ) < 80;
    },
    alignToTargetIfFollowing() {
      const element = params.scrollRef.current;
      if (element && following.current)
        scrollToLatestMessage(element, params.latestMessageAnchorRef.current);
      remember();
    },
  };
}

function latestScrollTop(stream: HTMLElement, anchor: HTMLElement | null) {
  if (!anchor) return stream.scrollHeight - stream.clientHeight;
  const top =
    anchor.getBoundingClientRect().top -
    stream.getBoundingClientRect().top +
    stream.scrollTop;
  return (
    top -
    stream.clientHeight +
    (Number.parseFloat(getComputedStyle(stream).scrollPaddingBottom) || 0) +
    12
  );
}

export function scrollToLatestMessage(
  stream: HTMLElement,
  anchor: HTMLElement | null,
  behavior?: ScrollBehavior,
) {
  const top = latestScrollTop(stream, anchor);
  if (behavior) stream.scrollTo({ top, behavior });
  else stream.scrollTop = top;
}

export function scrollToImage(stream: HTMLElement, image: HTMLElement) {
  const top =
    image.getBoundingClientRect().top -
    stream.getBoundingClientRect().top +
    stream.scrollTop;
  const padding =
    Number.parseFloat(getComputedStyle(stream).scrollPaddingTop) || 0;
  stream.scrollTo({ top: Math.max(0, top - padding - 12), behavior: "smooth" });
}
