import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageEntity } from "../../db/entities";

const swipeThreshold = 45;

export function ImageOverlay(props: { image: ImageEntity; canNavigate: boolean; onClose: () => void; onPrevious: () => void; onNext: () => void }) {
  const [url, setUrl] = useState<string>();
  const currentUrlRef = useRef<string | undefined>(undefined);
  const pointerStartRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const swipedRef = useRef(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(props.image.blob);
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);

    currentUrlRef.current = objectUrl;
    setUrl(objectUrl);
  }, [props.image.blob]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
      if (!props.canNavigate) return;
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [props.canNavigate, props.onClose, props.onNext, props.onPrevious]);

  function showPreviousImage() {
    props.onPrevious();
  }

  function showNextImage() {
    props.onNext();
  }

  function handlePointerDown(event: PointerEvent<HTMLImageElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    swipedRef.current = false;
  }

  function handlePointerUp(event: PointerEvent<HTMLImageElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = undefined;
    if (!start || !props.canNavigate) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) return;

    swipedRef.current = true;
    if (deltaX > 0) showPreviousImage();
    else showNextImage();
  }

  function handlePreviewClick(event: MouseEvent<HTMLImageElement>) {
    event.stopPropagation();
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    props.onClose();
  }

  if (!url) return null;

  return (
    <div className="image-overlay" role="dialog" aria-modal="true" aria-label="Bildvorschau" onClick={props.onClose}>
      <div className="image-overlay-blur" style={{ backgroundImage: `url(${url})` }} />
      {props.canNavigate && (
        <button
          type="button"
          className="image-overlay-nav previous"
          aria-label="Vorheriges Bild"
          onClick={(event) => {
            event.stopPropagation();
            showPreviousImage();
          }}
        >
          <ChevronLeft size={34} aria-hidden="true" />
        </button>
      )}
      <div className="image-overlay-stage">
        <img
          className="image-overlay-preview image-overlay-preview-current"
          src={url}
          alt={props.image.prompt ?? "Bildvorschau"}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={handlePreviewClick}
        />
      </div>
      {props.canNavigate && (
        <button
          type="button"
          className="image-overlay-nav next"
          aria-label="Nächstes Bild"
          onClick={(event) => {
            event.stopPropagation();
            showNextImage();
          }}
        >
          <ChevronRight size={34} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
