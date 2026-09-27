import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Image as ImageIcon, MessageCircle, Pin } from "lucide-react";
import type { ImageEntity } from "../../../db/entities";
import { useObjectUrl } from "../useObjectUrl";

export function ImageCard(props: {
  image: ImageEntity;
  overlayActive: boolean;
  onContentLoaded: () => void;
  onCreateChatFromImage?: (image: ImageEntity) => void;
  isCreatingChatFromImage: boolean;
  onTogglePinned: (image: ImageEntity) => void;
  onOverlay: (id: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const url = useObjectUrl(props.image.blob);
  const [isLoaded, setIsLoaded] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setIsLoaded(false);
    setNarrow(false);
  }, [props.image.blob]);
  useLayoutEffect(() => {
    const image = imageRef.current;
    const preview = image?.parentElement;
    if (!image || !preview) return;
    const update = () => setNarrow(image.clientWidth < preview.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(image);
    observer.observe(preview);
    update();
    return () => observer.disconnect();
  }, [url]);

  function download() {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = getDownloadFilename(props.image);
    link.click();
  }

  return (
    <figure
      id={`image-${props.image.id}`}
      className={`image-card embedded${props.overlayActive ? " overlay" : ""}${narrow ? " narrower-than-preview" : ""}`}
    >
      <button
        type="button"
        className="image-preview-button"
        aria-label={t("workspace.openImage")}
        onClick={() => props.onOverlay(props.image.id)}
      >
        {url ? (
          <>
            <span
              className="image-preview-backdrop"
              aria-hidden="true"
              style={{ backgroundImage: isLoaded ? `url(${url})` : undefined }}
            />
            <img
              ref={imageRef}
              src={url}
              alt={props.image.prompt ?? t("workspace.generatedImage")}
              width={props.image.width}
              height={props.image.height}
              loading="lazy"
              decoding="async"
              onLoad={() => {
                setIsLoaded(true);
                props.onContentLoaded();
              }}
            />
          </>
        ) : (
          <span className="image-placeholder">
            <ImageIcon />
          </span>
        )}
      </button>
      <div className="image-actions d-flex justify-content-start gap-3">
        <button
          type="button"
          className="image-action"
          aria-label={t("workspace.downloadImage")}
          onClick={download}
        >
          <Download size={17} aria-hidden="true" />
        </button>
        {props.onCreateChatFromImage && (
          <button
            type="button"
            className="image-action"
            aria-label={t("workspace.newChatFromImage")}
            disabled={props.isCreatingChatFromImage}
            onClick={() => props.onCreateChatFromImage?.(props.image)}
          >
            <MessageCircle size={17} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={
            props.image.pinned ? "image-action active" : "image-action"
          }
          aria-pressed={Boolean(props.image.pinned)}
          aria-label={t(
            props.image.pinned ? "workspace.unpinImage" : "workspace.pinImage",
          )}
          onClick={() => props.onTogglePinned(props.image)}
        >
          <Pin size={17} aria-hidden="true" />
        </button>
      </div>
    </figure>
  );
}

function getDownloadFilename(image: ImageEntity) {
  const digits = image.createdAt.replace(/\D/g, "").slice(0, 14);
  const timestamp =
    digits.length === 14
      ? digits
      : new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const subtype = (image.mimeType ?? image.blob.type)
    .split("/")[1]
    ?.split(";")[0]
    ?.toLowerCase();
  return `aiia-${image.chatId.slice(0, 2)}-${timestamp.slice(0, 8)}-${timestamp.slice(8)}.${subtype === "svg+xml" ? "svg" : subtype || "png"}`;
}
