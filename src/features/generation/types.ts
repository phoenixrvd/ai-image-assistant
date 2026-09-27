import type { ChatAspectRatio } from "../chats/types";
import type { AppLanguage } from "../../i18n/types";

export type UploadedReference = { id: string; name: string; dataUrl: string };

export type StoredReference =
  | { type: "pinned"; imageId: string; dataUrl: string }
  | { type: "uploaded"; name: string; dataUrl: string };

// Blob inputs belong to the immutable submission; encoded references are a
// separate preparation result, never a mutation of the original submission.
export type ReferenceInput =
  | { type: "pinned"; imageId: string; blob: Blob }
  | { type: "uploaded"; name: string; dataUrl: string };

export type GenerationSubmission = {
  chatId: string;
  modelId: string;
  prompt: string;
  instructions: string;
  imageCount: number;
  aspectRatio: ChatAspectRatio;
  references: ReferenceInput[];
  language: AppLanguage;
};
