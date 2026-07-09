import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageEntity } from "../../db/entities";

const swipeThreshold = 45;
const maxZoomScale = 4;
const minZoomScale = 1;

type TouchPoint = { x: number; y: number };
type PinchState = { startDistance: number; startScale: number };
type TouchLike = { clientX: number; clientY: number };

export function ImageOverlay(props: { image: ImageEntity; canNavigate: boolean; onClose: () => void; onPrevious: () => void; onNext: () => void }) {
  const [url, setUrl] = useState<string>();
  const [zoomScale, setZoomScale] = useState(minZoomScale);
  const currentUrlRef = useRef<string | undefined>(undefined);
  const touchStartRef = useRef<TouchPoint | undefined>(undefined);
  const pinchStateRef = useRef<PinchState | undefined>(undefined);
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
    resetZoom();
  }, [props.image.id]);

  function resetZoom() {
    touchStartRef.current = undefined;
    pinchStateRef.current = undefined;
    swipedRef.current = false;
    setZoomScale(minZoomScale);
  }

  function closeOverlay() {
    resetZoom();
    props.onClose();
  }

  function clampZoom(value: number) {
    return Math.max(minZoomScale, Math.min(maxZoomScale, value));
  }

  function readDistance(first: TouchLike, second: TouchLike) {
    const deltaX = second.clientX - first.clientX;
    const deltaY = second.clientY - first.clientY;
    return Math.hypot(deltaX, deltaY);
  }

  function readTouchPoint(event: TouchEvent<HTMLImageElement>) {
    const touch = event.changedTouches[0];
    if (!touch) return undefined;
    return { x: touch.clientX, y: touch.clientY };
  }

  function showPreviousImage() {
    resetZoom();
    props.onPrevious();
  }

  function showNextImage() {
    resetZoom();
    props.onNext();
  }

  function handleTouchStart(event: TouchEvent<HTMLImageElement>) {
    if (event.touches.length === 2) {
      const [first, second] = [event.touches[0], event.touches[1]];
      pinchStateRef.current = {
        startDistance: readDistance(first, second),
        startScale: zoomScale
      };
      touchStartRef.current = undefined;
      swipedRef.current = false;
      return;
    }

    if (event.touches.length !== 1 || zoomScale > minZoomScale || !props.canNavigate) {
      touchStartRef.current = undefined;
      return;
    }

    touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    swipedRef.current = false;
  }

  function handleTouchMove(event: TouchEvent<HTMLImageElement>) {
    const pinchState = pinchStateRef.current;
    if (!pinchState || event.touches.length !== 2) return;

    if (event.cancelable) event.preventDefault();
    const [first, second] = [event.touches[0], event.touches[1]];
    const currentDistance = readDistance(first, second);
    if (pinchState.startDistance <= 0) return;

    const nextScale = clampZoom((currentDistance / pinchState.startDistance) * pinchState.startScale);
    setZoomScale(nextScale);
  }

  function handleTouchEnd(event: TouchEvent<HTMLImageElement>) {
    if (event.touches.length < 2) pinchStateRef.current = undefined;
    if (zoomScale > minZoomScale || !props.canNavigate) return;

    const start = touchStartRef.current;
    touchStartRef.current = undefined;
    if (!start) return;

    const end = readTouchPoint(event);
    if (!end) return;

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) < Math.abs(deltaY)) return;

    swipedRef.current = true;
    if (deltaX > 0) showPreviousImage();
    else showNextImage();
  }

  function handleTouchCancel() {
    touchStartRef.current = undefined;
    pinchStateRef.current = undefined;
  }

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOverlay();
      if (!props.canNavigate) return;
      if (event.key === "ArrowLeft") showPreviousImage();
      if (event.key === "ArrowRight") showNextImage();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [props.canNavigate, props.onNext, props.onPrevious]);

  function handlePreviewClick(event: MouseEvent<HTMLImageElement>) {
    event.stopPropagation();
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    closeOverlay();
  }

  if (!url) return null;

  return (
    <div className="image-overlay" role="dialog" aria-modal="true" aria-label="Bildvorschau" onClick={closeOverlay}>
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
          style={{ transform: `scale(${zoomScale})` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
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
