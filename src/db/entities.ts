export type EntityId = string;
export type ModelType = "chat" | "image";
export type MessageRole = "user" | "assistant" | "system";
export type GenerationStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";
export type ThemeMode = "light" | "dark" | "system";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface TimestampedEntity {
  createdAt: string;
  updatedAt: string;
}

export interface ChatEntity extends TimestampedEntity {
  id: EntityId;
  title: string;
  titleEdited?: boolean;
  titleGeneratedAt?: string;
  pinned?: boolean;
  archived?: boolean;
  lastMessageAt?: string;
  metadata?: Record<string, JsonValue>;
}

export interface MessageEntity extends TimestampedEntity {
  id: EntityId;
  chatId: EntityId;
  role: MessageRole;
  content: string;
  requestId?: EntityId;
  metadata?: Record<string, JsonValue>;
}

export interface ImageEntity extends TimestampedEntity {
  id: EntityId;
  chatId: EntityId;
  messageId?: EntityId;
  requestId?: EntityId;
  resultId?: EntityId;
  blob: Blob;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  prompt?: string;
  modelConfigId?: EntityId;
  parameters?: Record<string, JsonValue>;
  pinned?: boolean;
}

export interface ModelConfigEntity extends TimestampedEntity {
  id: EntityId;
  displayName: string;
  provider: string;
  type: ModelType;
  baseUrl: string;
  apiKey?: string;
  modelName: string;
  enabled?: boolean;
  supportsReferenceImages?: boolean;
  defaultParameters?: Record<string, JsonValue>;
}

export interface AppOptionEntity {
  key: string;
  value: JsonValue;
  updatedAt: string;
}

export interface GenerationRequestEntity extends TimestampedEntity {
  id: EntityId;
  chatId: EntityId;
  messageId?: EntityId;
  modelConfigId: EntityId;
  type: ModelType;
  prompt: string;
  parameters?: Record<string, JsonValue>;
  status: GenerationStatus;
  error?: string;
}

export interface GenerationResultEntity extends TimestampedEntity {
  id: EntityId;
  requestId: EntityId;
  chatId: EntityId;
  messageId?: EntityId;
  type: ModelType;
  text?: string;
  imageIds?: EntityId[];
  rawMetadata?: Record<string, JsonValue>;
}
