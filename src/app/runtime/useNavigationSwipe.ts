import { useRef, useState, type MouseEvent, type PointerEvent, type TouchEvent } from "react";

export function useNavigationSwipe(open: boolean, changeOpen: (open: boolean) => void) {
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; dragging: boolean } | undefined>(undefined);
  const suppressClick = useRef(false);

  function begin(x: number, y: number, target: EventTarget) {
    if (!matchMedia("(max-width: 859.98px)").matches || document.querySelector(".image-overlay")) return false;
    if (target instanceof Element && target.closest('a, button, input, textarea, select, [contenteditable="true"]')) return false;
    if (!open && x > 96) return false;
    start.current = { x, y, dragging: false };
    return true;
  }

  function reset(shell: HTMLElement) {
    start.current = undefined;
    setDragging(false);
    shell.classList.remove("nav-dragging");
    shell.style.removeProperty("--chat-nav-drag-x");
    shell.style.removeProperty("--chat-nav-backdrop-progress");
  }

  function move(x: number, y: number, event: PointerEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) {
    const origin = start.current;
    if (!origin) return;
    const deltaX = x - origin.x;
    if (!origin.dragging && Math.abs(deltaX) < 10) return;
    if (!origin.dragging && Math.abs(deltaX) < Math.abs(y - origin.y)) { reset(event.currentTarget); return; }
    if (event.cancelable) event.preventDefault();
    origin.dragging = true;
    suppressClick.current = true;
    const max = Math.min(window.innerWidth * 0.86, 320) * 1.04;
    const offset = open ? Math.min(Math.max(deltaX, -max), 0) : Math.max(Math.min(deltaX, max), 0);
    setDragging(true);
    event.currentTarget.classList.add("nav-dragging");
    event.currentTarget.style.setProperty("--chat-nav-drag-x", `${offset}px`);
    event.currentTarget.style.setProperty("--chat-nav-backdrop-progress", String(open ? 1 - Math.abs(offset) / max : offset / max));
  }

  function finish(x: number, y: number, shell: HTMLElement) {
    const origin = start.current;
    if (origin) {
      const dx = x - origin.x;
      if (Math.abs(dx) >= 60 && Math.abs(dx) >= Math.abs(y - origin.y)) changeOpen(dx > 0);
    }
    reset(shell);
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }

  // Touch events own touch gestures; pointer capture is reserved for pen/mouse.
  // This avoids processing the same mobile gesture through both paths.
  return { dragging, handlers: {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
      if (begin(event.clientX, event.clientY, event.target)) event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType !== "touch") move(event.clientX, event.clientY, event);
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType === "touch") return;
      finish(event.clientX, event.clientY, event.currentTarget);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel(event: PointerEvent<HTMLDivElement>) { reset(event.currentTarget); suppressClick.current = false; },
    onTouchStart(event: TouchEvent<HTMLDivElement>) {
      if (event.touches.length === 1) begin(event.touches[0].clientX, event.touches[0].clientY, event.target);
      else reset(event.currentTarget);
    },
    onTouchMove(event: TouchEvent<HTMLDivElement>) {
      if (event.touches.length === 1) move(event.touches[0].clientX, event.touches[0].clientY, event);
    },
    onTouchEnd(event: TouchEvent<HTMLDivElement>) {
      if (event.changedTouches.length) finish(event.changedTouches[0].clientX, event.changedTouches[0].clientY, event.currentTarget);
    },
    onTouchCancel(event: TouchEvent<HTMLDivElement>) { reset(event.currentTarget); suppressClick.current = false; },
    onClickCapture(event: MouseEvent<HTMLDivElement>) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault(); event.stopPropagation();
    },
  } };
}
