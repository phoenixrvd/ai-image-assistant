import type { QueryClient } from "@tanstack/react-query";
import type { NavigateFunction } from "react-router-dom";
import type { ImageEntity, ThemeMode } from "../db/entities";

export type UploadedReference = { id: string; name: string; dataUrl: string };
export type StoredReference = { type: "pinned"; imageId: string; dataUrl: string } | { type: "uploaded"; name: string; dataUrl: string };

export function applyTheme(theme: ThemeMode) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const resolvedTheme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
  document.documentElement.dataset.bsTheme = resolvedTheme;
  document.documentElement.dataset.theme = resolvedTheme;
}

export function readChatNavOpenState(): boolean {
  const saved = window.localStorage.getItem("chatNavOpen");
  if (saved === null) return true;
  return saved === "true";
}

export function closePanels(navigate: NavigateFunction, activeChatId?: string) {
  navigate(activeChatId ? `/chats/${activeChatId}` : "/");
}

export async function refreshChatData(queryClient: QueryClient, chatId?: string) {
  await queryClient.invalidateQueries({ queryKey: ["chats"] });
  await queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
  await queryClient.invalidateQueries({ queryKey: ["images", chatId] });
  await queryClient.invalidateQueries({ queryKey: ["generationRequests", chatId] });
}

export function formatMessageDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export async function resolveReferences(pinnedImages: ImageEntity[], uploadedReferences: UploadedReference[]): Promise<string[]> {
  const snapshots = await createReferenceSnapshots(pinnedImages, uploadedReferences);
  return snapshots.map((reference) => reference.dataUrl);
}

export async function createReferenceSnapshots(pinnedImages: ImageEntity[], uploadedReferences: UploadedReference[]): Promise<StoredReference[]> {
  const pinned = await Promise.all(pinnedImages.slice(0, 3).map(async (image) => ({ type: "pinned" as const, imageId: image.id, dataUrl: await blobToDataUrl(image.blob) })));
  const remainingSlots = Math.max(0, 3 - pinned.length);
  const uploaded = uploadedReferences.slice(0, remainingSlots).map((entry) => ({ type: "uploaded" as const, name: entry.name, dataUrl: entry.dataUrl }));
  return [...pinned, ...uploaded];
}

export function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(blob);
  });
}
