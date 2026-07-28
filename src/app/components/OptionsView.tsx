import { Fragment } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import type { ProviderConfigEntity, ThemeMode } from "../../db/entities";
import { appOptionsRepository } from "../../db/repositories/appOptionsRepository";
import { modelLoadEstimateRepository } from "../../db/repositories/modelLoadEstimateRepository";
import { providerConfigRepository } from "../../db/repositories/providerConfigRepository";
import {
  getModelLabel,
  getProviderDefinition,
  canDisableModel,
  canDisableProvider,
  hasRequiredEnabledModels,
  isModelEnabled,
  listModels,
  listModelsByProvider,
  listUsableModels,
  providerDefinitions,
} from "../../features/generation/models/registry";
import type {
  ProviderId,
  StaticModel,
} from "../../features/generation/models/types";
import { getModelPriceLabel } from "../../features/generation/models/pricing";
import { appMetadata } from "../metadata";
import { changeAppLanguage } from "../../i18n/i18n";
import type { AppLanguage } from "../../i18n/types";

export function OptionsView(props: {
  providerConfigs: ProviderConfigEntity[];
  disabledModelIds: string[];
  theme: ThemeMode;
  defaultImageModelId?: string;
  onDefaultImageModel: (modelId: string) => void;
  onDisabledModelIds: (modelIds: string[]) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const saveProviderMutation = useMutation({
    mutationFn: (provider: ProviderConfigEntity) =>
      providerConfigRepository.save(provider),
    scope: { id: "provider-config" },
    onMutate: (provider) => {
      queryClient.setQueryData<ProviderConfigEntity[]>(
        ["providerConfigs"],
        (current = []) =>
          current.map((entry) => (entry.id === provider.id ? provider : entry)),
      );
    },
    onError: () =>
      queryClient.invalidateQueries({ queryKey: ["providerConfigs"] }),
  });

  async function setTheme(theme: ThemeMode) {
    await appOptionsRepository.set("theme", theme);
    await queryClient.invalidateQueries({ queryKey: ["theme"] });
  }

  async function setLanguage(language: AppLanguage) {
    await changeAppLanguage(language);
  }

  const usableImageModels = listUsableModels(
    ["image", "image-edit"],
    props.providerConfigs,
    props.disabledModelIds,
  );

  const modelEstimateQuery = useQuery({
    queryKey: ["modelLoadEstimates"],
    queryFn: async () => {
      const imageModels = listModels().filter(
        (model) => model.type === "image" || model.type === "image-edit",
      );
      const entries = await Promise.all(
        imageModels.map(async (model) => {
          const seconds = await modelLoadEstimateRepository.getEstimatedSeconds(
            model.providerId,
            model.providerModelName,
          );
          return [estimateKey(model), seconds] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  return (
    <section className="options-view container-xxl py-3">
      <section className="options-section" aria-labelledby="providers-heading">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <h2 id="providers-heading" className="h5 mb-0">
            {t("options.provider")}
          </h2>
        </div>
        {providerDefinitions.map((definition) => {
          const provider =
            props.providerConfigs.find((entry) => entry.id === definition.id) ??
            createProviderFallback(definition.id);
          return (
            <ProviderForm
              key={definition.id}
              provider={provider}
              providerConfigs={props.providerConfigs}
              disabledModelIds={props.disabledModelIds}
              estimates={modelEstimateQuery.data}
              onChange={(next) => saveProviderMutation.mutate(next)}
              onDisabledModelIds={props.onDisabledModelIds}
            />
          );
        })}
      </section>
      <section className="options-section" aria-labelledby="general-heading">
        <h2 id="general-heading" className="h5 mb-0">
          {t("options.general")}
        </h2>
        <div className="general-options">
          <div className="form-floating">
            <select
              className="form-select"
              id="default-image-model"
              value={props.defaultImageModelId ?? ""}
              disabled={usableImageModels.length === 0}
              onChange={(event) =>
                props.onDefaultImageModel(event.target.value)
              }
            >
              {usableImageModels.length === 0 ? (
                <option value="">{t("options.noImageModel")}</option>
              ) : null}
              {usableImageModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {getModelLabel(model)}
                </option>
              ))}
            </select>
            <label htmlFor="default-image-model">
              {t("options.defaultImageModel")}
            </label>
          </div>
          <div
            className="btn-group w-100"
            role="group"
            aria-label={t("options.theme")}
          >
            {[
              {
                id: "light",
                label: t("options.light"),
                icon: <Sun size={17} />,
              },
              {
                id: "dark",
                label: t("options.dark"),
                icon: <Moon size={17} />,
              },
              { id: "system", label: t("options.system") },
            ].map((theme) => (
              <Fragment key={theme.id}>
                <input
                  type="radio"
                  className="btn-check"
                  name="theme"
                  id={`theme-${theme.id}`}
                  autoComplete="off"
                  checked={props.theme === theme.id}
                  onChange={() => setTheme(theme.id as ThemeMode)}
                />
                <label
                  className="btn btn-outline-secondary"
                  htmlFor={`theme-${theme.id}`}
                >
                  {theme.icon} {theme.label}
                </label>
              </Fragment>
            ))}
          </div>
          <div className="form-floating">
            <select
              className="form-select"
              id="language"
              value={i18n.language}
              onChange={(event) =>
                void setLanguage(event.target.value as AppLanguage)
              }
            >
              <option value="de">{t("options.german")}</option>
              <option value="en">{t("options.english")}</option>
            </select>
            <label htmlFor="language">{t("options.language")}</label>
          </div>
          <div className="settings-meta">
            <span>
              {t("options.version")} {appMetadata.version}
            </span>
            <span>
              {t("options.build")} {appMetadata.buildTime}
            </span>
            <span>
              {t("options.schema")} {appMetadata.dbSchemaVersion}
            </span>
            <span>
              {t("options.commit")} {appMetadata.gitCommit}
            </span>
          </div>
        </div>
      </section>
    </section>
  );
}

function ProviderForm(props: {
  provider: ProviderConfigEntity;
  providerConfigs: ProviderConfigEntity[];
  disabledModelIds: string[];
  estimates?: Record<string, number>;
  onChange: (provider: ProviderConfigEntity) => void;
  onDisabledModelIds: (modelIds: string[]) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const provider = props.provider;
  const definition = getProviderDefinition(provider.id);
  const models = listModelsByProvider(provider.id as ProviderId).sort(
    (left, right) =>
      left.name.localeCompare(right.name, i18n.language, {
        sensitivity: "base",
      }),
  );
  const disableProviderBlocked =
    provider.enabled !== false &&
    !canDisableProvider(
      provider.id,
      props.providerConfigs,
      props.disabledModelIds,
    );
  const saveDisabledModelsMutation = useMutation({
    mutationFn: props.onDisabledModelIds,
  });

  function updateProvider(next: ProviderConfigEntity) {
    if (
      next.enabled === false &&
      !hasRequiredEnabledModels(
        props.providerConfigs.map((entry) =>
          entry.id === provider.id ? next : entry,
        ),
        props.disabledModelIds,
      )
    )
      return;
    props.onChange(next);
  }

  return (
    <section className="model-form">
      <h3 className="h6 mb-0">
        <label className="d-inline-flex align-items-center gap-2">
          <input
            className="form-check-input m-0"
            type="checkbox"
            checked={provider.enabled !== false}
            disabled={disableProviderBlocked}
            onChange={(event) =>
              updateProvider({ ...provider, enabled: event.target.checked })
            }
          />
          <span>{definition?.label ?? provider.id}</span>
        </label>
      </h3>
      {provider.enabled !== false ? (
        <>
          <div className="form-floating">
            <input
              id={`provider-url-${provider.id}`}
              className="form-control"
              value={provider.baseUrl}
              placeholder={
                definition?.defaultBaseUrl ?? "https://api.example.com"
              }
              onChange={(event) =>
                updateProvider({ ...provider, baseUrl: event.target.value })
              }
            />
            <label htmlFor={`provider-url-${provider.id}`}>
              {t("options.baseUrl")}
            </label>
          </div>
          <div className="form-floating">
            <input
              id={`provider-key-${provider.id}`}
              className="form-control"
              value={provider.apiKey ?? ""}
              type="password"
              placeholder="API-Key"
              onChange={(event) =>
                updateProvider({ ...provider, apiKey: event.target.value })
              }
            />
            <label htmlFor={`provider-key-${provider.id}`}>
              {t("options.apiKey")}
            </label>
          </div>
          {disableProviderBlocked ? (
            <div className="form-text">{t("options.providerRequired")}</div>
          ) : null}
          <div className="model-options">
            <div className="small text-secondary">{t("options.models")}</div>
            {models.map((model) => {
              const enabled = isModelEnabled(model, props.disabledModelIds);
              const priceLabel = getModelPriceLabel(
                model.id,
                i18n.language === "de" ? "de" : "en",
              );
              const disableModelBlocked =
                enabled &&
                !canDisableModel(
                  model.id,
                  props.providerConfigs,
                  props.disabledModelIds,
                );
              return (
                <label
                  className="form-check d-flex align-items-center gap-2"
                  key={model.id}
                >
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={enabled}
                    disabled={disableModelBlocked}
                    onChange={(event) => {
                      const disabledModelIds = event.target.checked
                        ? props.disabledModelIds.filter((id) => id !== model.id)
                        : [...props.disabledModelIds, model.id];
                      saveDisabledModelsMutation.mutate(disabledModelIds);
                    }}
                  />
                  <span className="form-check-label model-option-label">
                    <span>{formatModelName(model, t, props.estimates)}</span>
                    {priceLabel ? (
                      <small className="model-option-price">{priceLabel}</small>
                    ) : null}
                  </span>
                </label>
              );
            })}
            {models.some(
              (model) =>
                isModelEnabled(model, props.disabledModelIds) &&
                !canDisableModel(
                  model.id,
                  props.providerConfigs,
                  props.disabledModelIds,
                ),
            ) ? (
              <div className="form-text">{t("options.modelRequired")}</div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function createProviderFallback(providerId: ProviderId): ProviderConfigEntity {
  const now = new Date().toISOString();
  const definition = getProviderDefinition(providerId);
  return {
    id: providerId,
    baseUrl: definition?.defaultBaseUrl ?? "",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

function formatModelName(
  model: StaticModel,
  t: ReturnType<typeof useTranslation>["t"],
  estimates?: Record<string, number>,
): string {
  if (model.type === "text") return `${model.name} (${t("options.text")})`;
  const seconds = estimates?.[estimateKey(model)] ?? 30;
  return t("options.estimate", {
    name: model.name,
    seconds: Math.round(seconds),
  });
}

function estimateKey(
  model: Pick<StaticModel, "providerId" | "providerModelName">,
): string {
  return `${model.providerId}::${model.providerModelName}`;
}
