import { useState } from "react";
import type { ImageEntity } from "../../db/entities";

export function useImageNavigation(images: ImageEntity[]) {
  const [overlayId, setOverlayId] = useState<string>();
  const [pinnedId, setPinnedId] = useState<string>();
  const [endRequest, setEndRequest] = useState(0);
  const pinned = images.filter((image) => image.pinned);
  const overlay = images.find((image) => image.id === overlayId);
  return {
    overlay,
    pinned,
    endRequest,
    focusedId: overlay?.id ?? pinnedId,
    setOverlayId,
    adjacent(direction: -1 | 1) {
      if (!overlay || images.length < 2) return;
      const index = images.findIndex((image) => image.id === overlay.id);
      setOverlayId(
        images[(index + direction + images.length) % images.length].id,
      );
    },
    nextPinned() {
      if (!pinned.length) return;
      const index = pinned.findIndex(
        (image) => image.id === (overlay?.id ?? pinnedId),
      );
      if (index === pinned.length - 1) {
        setPinnedId(undefined);
        setEndRequest((value) => value + 1);
      } else setPinnedId(pinned[(index + 1) % pinned.length].id);
    },
  };
}
