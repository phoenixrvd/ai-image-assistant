export function blobToDataUrl(blob: Blob, fileReadError: string, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    const cleanup = () => signal?.removeEventListener("abort", abort);
    reader.onload = () => {
      cleanup();
      if (signal?.aborted) reject(signal.reason);
      else if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(fileReadError));
    };
    reader.onerror = () => { cleanup(); reject(reader.error ?? new Error(fileReadError)); };
    reader.onabort = () => { cleanup(); reject(signal?.reason ?? new DOMException("Aborted", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, mimeType = "image/png"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return new Blob([dataUrl], { type: "text/plain" });
  const mimeType = match[1] || "image/png";
  return match[2] ? base64ToBlob(match[3], mimeType) : new Blob([decodeURIComponent(match[3])], { type: mimeType });
}
