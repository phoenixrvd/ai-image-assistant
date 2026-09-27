import type { NormalizedImageOutput } from "../generation/providers/types";

export async function normalizeImages(images: NormalizedImageOutput[], signal: AbortSignal): Promise<NormalizedImageOutput[]> {
  return Promise.all(images.map(async (image) => {
    signal.throwIfAborted();
    const blob = await scaleImage(image.blob, image.mimeType);
    signal.throwIfAborted();
    return { blob, mimeType: blob.type || image.mimeType };
  }));
}

async function scaleImage(blob: Blob, mimeType?: string): Promise<Blob> {
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(blob);
    const scale = Math.min(1280 / Math.max(bitmap.width, bitmap.height), 1);
    if (scale >= 1) return blob;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return blob;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const outputType = mimeType === "image/png" || mimeType === "image/webp" ? mimeType : "image/jpeg";
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((converted) => resolve(converted ?? blob), outputType, outputType === "image/jpeg" ? 0.92 : undefined);
    });
  } catch {
    // Resizing is best-effort: preserve the original image when decoding or
    // canvas conversion is unsupported by the browser.
    return blob;
  } finally {
    bitmap?.close();
  }
}
