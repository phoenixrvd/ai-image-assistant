import { FalAiProvider } from "./falAiProvider";
import { GrokProvider } from "./grokProvider";
import { OpenAiCompatibleProvider } from "./openAiCompatibleProvider";
import type { ProviderAdapter } from "./types";
import type { StaticModel } from "../models/types";
import i18n from "../../../i18n/i18n";

const providers: ProviderAdapter[] = [
  new GrokProvider(),
  new OpenAiCompatibleProvider(),
  new FalAiProvider(),
];

export function getProviderForModel(model: StaticModel): ProviderAdapter {
  const provider = providers.find((entry) => entry.id === model.providerId);
  if (!provider) throw new Error(i18n.t("errors.providerUnavailable"));
  return provider;
}
