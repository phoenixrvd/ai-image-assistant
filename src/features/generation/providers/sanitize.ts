import i18n from "../../../i18n/i18n";

export const providerConnectivityError = () => i18n.t("errors.connectivity");

export function sanitizeProviderError(error: unknown): string {
  if (isBrowserOffline()) return providerConnectivityError();
  if (error instanceof TypeError) return providerConnectivityError();

  if (error instanceof Error) {
    return error.message.replace(
      /Bearer\s+[A-Za-z0-9._~+\-/]+=*/g,
      "Bearer [redacted]",
    );
  }
  return i18n.t("errors.generationFailed");
}

export async function responseToSafeError(response: Response): Promise<string> {
  const text = await response.text();
  const shortText = text
    .slice(0, 500)
    .replace(/Bearer\s+[A-Za-z0-9._~+\-/]+=*/g, "Bearer [redacted]");
  return `${i18n.t("errors.providerError")} ${response.status}: ${shortText || response.statusText}`;
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
