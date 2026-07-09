import { FalAiProvider } from "./falAiProvider";
import { GrokProvider } from "./grokProvider";
import { OpenAiCompatibleProvider } from "./openAiCompatibleProvider";
import type { ProviderAdapter } from "./types";
import type { StaticModel } from "../models/types";

const providers: ProviderAdapter[] = [new GrokProvider(), new OpenAiCompatibleProvider(), new FalAiProvider()];

export function getProviderForModel(model: StaticModel): ProviderAdapter {
  const provider = providers.find((entry) => entry.id === model.providerId);
  if (!provider) throw new Error("Für dieses Modell ist kein Provider implementiert.");
  return provider;
}
