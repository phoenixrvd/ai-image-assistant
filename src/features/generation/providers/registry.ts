import type { ModelConfigEntity } from "../../../db/entities";
import { FalAiProvider } from "./falAiProvider";
import { GrokProvider } from "./grokProvider";
import { OpenAiCompatibleProvider } from "./openAiCompatibleProvider";
import type { ProviderAdapter } from "./types";

const providers: ProviderAdapter[] = [new GrokProvider(), new OpenAiCompatibleProvider(), new FalAiProvider()];

export function getProviderForModel(model: ModelConfigEntity): ProviderAdapter {
  if (model.provider === "grok") return providers[0];
  return providers.find((provider) => provider.id === model.provider) ?? new OpenAiCompatibleProvider();
}

export function listProviderOptions(): Array<{ id: string; label: string }> {
  return providers.map((provider) => ({ id: provider.id, label: provider.label }));
}
