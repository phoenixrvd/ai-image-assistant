import type {
  JsonValue,
  ModelType,
  ProviderConfigEntity,
} from "../../../db/entities";
import type { SelectedImageRoute, TextModel } from "../models/types";

export interface ImageGenerationInput {
  prompt: string;
  instructions?: string;
  imageCount: number;
  aspectRatio: string;
  references?: string[];
  parameters?: Record<string, JsonValue>;
}

export interface TextGenerationInput {
  system: string;
  prompt: string;
  image?: NormalizedImageOutput;
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
  generateImage(
    route: SelectedImageRoute,
    providerConfig: ProviderConfigEntity,
    input: ImageGenerationInput,
    signal?: AbortSignal,
  ): Promise<NormalizedGenerationOutput>;
  generateText(
    model: TextModel,
    providerConfig: ProviderConfigEntity,
    input: TextGenerationInput,
  ): Promise<string>;
}
