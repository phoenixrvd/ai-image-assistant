import type { JsonValue, ModelType } from "../../../db/entities";

export type ProviderId = "xai" | "openai" | "fal-ai";

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
}

export interface StaticModel {
  id: string;
  providerId: ProviderId;
  name: string;
  type: ModelType;
  providerModelName: string;
  supportsReferenceImages: boolean;
  requiresReferenceImages?: boolean;
  defaultParameters?: Record<string, JsonValue>;
}
