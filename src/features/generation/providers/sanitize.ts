export const providerConnectivityError = "Die API ist nicht erreichbar. Bitte Internetverbindung prüfen.";

export function sanitizeProviderError(error: unknown): string {
  if (isBrowserOffline()) return providerConnectivityError;
  if (error instanceof TypeError) return providerConnectivityError;

  if (error instanceof Error) {
    return error.message.replace(/Bearer\s+[A-Za-z0-9._~+\-/]+=*/g, "Bearer [redacted]");
  }
  return "Die Generierung ist fehlgeschlagen.";
}

export async function responseToSafeError(response: Response): Promise<string> {
  const text = await response.text();
  const shortText = text.slice(0, 500).replace(/Bearer\s+[A-Za-z0-9._~+\-/]+=*/g, "Bearer [redacted]");
  return `Provider-Fehler ${response.status}: ${shortText || response.statusText}`;
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
