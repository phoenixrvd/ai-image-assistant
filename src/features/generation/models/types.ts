import type { JsonValue, ModelType } from "../../../db/entities";

export type ProviderId = "openai" | "fal-ai" | "openrouter";

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
}

interface ModelBase {
  id: string;
  providerId: ProviderId;
  name: string;
  type: ModelType;
}

export interface ModelRoute {
  providerModelName: string;
  defaultParameters?: Record<string, JsonValue>;
  maxImagesPerRequest?: number;
}

export type SelectedImageRoute = ModelRoute & { kind: "create" | "edit" };

export interface TextModel extends ModelBase {
  type: "text";
  providerModelName: string;
  supportsImageInput?: boolean;
  defaultParameters?: Record<string, JsonValue>;
}

export interface ImageModel extends ModelBase {
  type: "image" | "image-edit";
  routes:
    | { create: ModelRoute; edit?: ModelRoute }
    | { create?: ModelRoute; edit: ModelRoute };
}

export type StaticModel = TextModel | ImageModel;
