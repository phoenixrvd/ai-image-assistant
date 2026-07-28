import type { AppLanguage } from "../../../i18n/types";
import pricingData from "./pricing.json";

interface ModelPricing {
  label: Record<AppLanguage, string>;
  basis?: string;
  sourceUrl: string;
  checkedAt: string;
}

const modelPricing = pricingData as Record<string, ModelPricing>;

export function getModelPriceLabel(
  modelId: string,
  language: AppLanguage,
): string | undefined {
  return modelPricing[modelId]?.label[language];
}
