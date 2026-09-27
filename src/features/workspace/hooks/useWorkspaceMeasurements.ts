import { useLayoutEffect, type RefObject } from "react";

export function useWorkspaceMeasurements(
  streamRef: RefObject<HTMLDivElement | null>,
  overlayRef: RefObject<HTMLDivElement | null>,
  contentCount: number,
) {
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const stream = streamRef.current;
    if (!overlay || !stream) return;
    const measure = () => {
      overlay.parentElement?.style.setProperty(
        "--workspace-bottom-overlay-height",
        `${overlay.offsetHeight}px`,
      );
      overlay.style.setProperty(
        "--workspace-scrollbar-width",
        `${stream.offsetWidth - stream.clientWidth}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(overlay);
    observer.observe(stream);
    for (const child of stream.children) observer.observe(child);
    measure();
    return () => observer.disconnect();
  }, [streamRef, overlayRef, contentCount]);
}
