import type { JsonValue, ModelConfigEntity, ModelType } from "../../../db/entities";
import type { StoredReference } from "../../../app/appHelpers";

export interface ImageGenerationInput {
  prompt: string;
  instructions?: string;
  imageCount: number;
  aspectRatio: string;
  references?: string[];
  referenceSnapshots?: StoredReference[];
  parameters?: Record<string, JsonValue>;
}

export interface TextGenerationInput {
  system: string;
  prompt: string;
  parameters?: Record<string, JsonValue>;
}

export interface NormalizedImageOutput {
  blob: Blob;
  mimeType?: string;
}

export interface NormalizedGenerationOutput {
  text?: string;
  images: NormalizedImageOutput[];
  rawMetadata?: Record<string, JsonValue>;
}

export interface ProviderAdapter {
  id: string;
  label: string;
  supportsModelType(type: ModelType): boolean;
  generateImage(model: ModelConfigEntity, input: ImageGenerationInput): Promise<NormalizedGenerationOutput>;
  generateText(model: ModelConfigEntity, input: TextGenerationInput): Promise<string>;
}
