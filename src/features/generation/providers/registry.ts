import { FalAiProvider } from "./falAiProvider";
import { OpenAiCompatibleProvider } from "./openAiCompatibleProvider";
import { OpenRouterProvider } from "./openRouterProvider";
import type { ProviderAdapter } from "./types";
import type { StaticModel } from "../models/types";
import i18n from "../../../i18n/i18n";

const providers: ProviderAdapter[] = [
  new OpenAiCompatibleProvider(),
  new FalAiProvider(),
  new OpenRouterProvider(),
];

export function getProviderForModel(model: StaticModel): ProviderAdapter {
  const provider = providers.find((entry) => entry.id === model.providerId);
  if (!provider) throw new Error(i18n.t("errors.providerUnavailable"));
  return provider;
}
