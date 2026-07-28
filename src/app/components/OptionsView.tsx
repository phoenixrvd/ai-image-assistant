import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import type { ProviderConfigEntity, ThemeMode } from "../../db/entities";
import { appOptionsRepository } from "../../db/repositories/appOptionsRepository";
import { modelLoadEstimateRepository } from "../../db/repositories/modelLoadEstimateRepository";
import {
  isProviderUsable,
  providerConfigRepository,
} from "../../db/repositories/providerConfigRepository";
import {
  getModelLabel,
  getProviderDefinition,
  listModels,
  listModelsByProvider,
  listUsableModels,
  providerDefinitions,
} from "../../features/generation/models/registry";
import type {
  ProviderId,
  StaticModel,
} from "../../features/generation/models/types";
import { appMetadata } from "../metadata";
import { changeAppLanguage } from "../../i18n/i18n";
import type { AppLanguage } from "../../i18n/types";

export function OptionsView(props: {
  providerConfigs: ProviderConfigEntity[];
  theme: ThemeMode;
  defaultImageModelId?: string;
  onDefaultImageModel: (modelId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const saveProviderMutation = useMutation({
    mutationFn: (provider: ProviderConfigEntity) =>
      providerConfigRepository.save(provider),
    onSuccess: () =>
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
              estimates={modelEstimateQuery.data}
              onSave={(next) => saveProviderMutation.mutate(next)}
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
  estimates?: Record<string, number>;
  onSave: (provider: ProviderConfigEntity) => void;
}) {
  const { t, i18n } = useTranslation();
  const [provider, setProvider] = useState(props.provider);
  const [validated, setValidated] = useState(false);
  const usable = isProviderUsable(provider);
  const definition = getProviderDefinition(provider.id);
  const activeModels = usable
    ? listModelsByProvider(provider.id as ProviderId).sort((left, right) =>
        left.name.localeCompare(right.name, i18n.language, {
          sensitivity: "base",
        }),
      )
    : [];
  const shouldShowSavedErrors = !validated && provider.enabled !== false;

  useEffect(() => setProvider(props.provider), [props.provider]);

  function submitProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidated(true);
    if (!event.currentTarget.checkValidity()) return;
    props.onSave(provider);
  }

  return (
    <form
      className={validated ? "model-form was-validated" : "model-form"}
      noValidate
      onSubmit={submitProvider}
    >
      <h3 className="h6 mb-0">{definition?.label ?? provider.id}</h3>
      <div className="form-floating">
        <input
          id={`provider-url-${provider.id}`}
          className={fieldClass(
            !provider.baseUrl.trim(),
            shouldShowSavedErrors,
            "form-control",
          )}
          value={provider.baseUrl}
          placeholder={definition?.defaultBaseUrl ?? "https://api.example.com"}
          required
          onChange={(event) =>
            setProvider({ ...provider, baseUrl: event.target.value })
          }
        />
        <label htmlFor={`provider-url-${provider.id}`}>
          {t("options.baseUrl")}
        </label>
        <div className="invalid-feedback">{t("options.requiredBaseUrl")}</div>
      </div>
      <div className="form-floating">
        <input
          id={`provider-key-${provider.id}`}
          className={fieldClass(
            !provider.apiKey?.trim(),
            shouldShowSavedErrors,
            "form-control",
          )}
          value={provider.apiKey ?? ""}
          type="password"
          placeholder="API-Key"
          required
          onChange={(event) =>
            setProvider({ ...provider, apiKey: event.target.value })
          }
        />
        <label htmlFor={`provider-key-${provider.id}`}>
          {t("options.apiKey")}
        </label>
        <div className="invalid-feedback">{t("options.requiredApiKey")}</div>
      </div>
      <label className="form-check d-inline-flex align-items-center gap-2">
        <input
          className="form-check-input"
          type="checkbox"
          checked={provider.enabled !== false}
          onChange={(event) =>
            setProvider({ ...provider, enabled: event.target.checked })
          }
        />{" "}
        <span className="form-check-label">{t("options.enabled")}</span>
      </label>
      <div className="small text-secondary">
        <div>{t("options.activeModels")}</div>
        {activeModels.length > 0 ? (
          <ul className="mb-0 ps-3">
            {activeModels.map((model) => (
              <li key={model.id}>
                {formatModelName(model, t, props.estimates)}
              </li>
            ))}
          </ul>
        ) : (
          <span>{t("common.none")}</span>
        )}
      </div>
      <div className="d-flex align-items-center justify-content-between gap-3">
        <span
          className={
            usable
              ? "model-status model-status--usable"
              : "model-status model-status--incomplete"
          }
        >
          <span className="model-status__dot" aria-hidden="true" />
          <span>
            {usable
              ? t("options.usable")
              : provider.enabled === false
                ? t("options.inactive")
                : t("options.incomplete")}
          </span>
        </span>
        <button className="btn btn-primary" type="submit">
          {t("common.save")}
        </button>
      </div>
    </form>
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

function fieldClass(
  invalid: boolean,
  showInvalid: boolean,
  baseClass: string,
): string {
  return invalid && showInvalid ? `${baseClass} is-invalid` : baseClass;
}

function formatModelName(
  model: StaticModel,
  t: ReturnType<typeof useTranslation>["t"],
  estimates?: Record<string, number>,
): string {
  if (model.type === "text") return model.name;
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
