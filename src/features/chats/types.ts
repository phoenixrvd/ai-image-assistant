export type ChatAspectRatio = "square" | "portrait" | "landscape";

export type ChatUploadedReference = { name: string; dataUrl: string };

export type ChatSettings = {
  promptDraft?: string;
  activeImageModelId?: string;
  imageCount?: number;
  aspectRatio?: ChatAspectRatio;
  imageInstructions?: string;
  uploadedReferences?: ChatUploadedReference[];
};

export function isValidImageCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 4
  );
}

export function isValidAspectRatio(value: unknown): value is ChatAspectRatio {
  return value === "square" || value === "portrait" || value === "landscape";
}
