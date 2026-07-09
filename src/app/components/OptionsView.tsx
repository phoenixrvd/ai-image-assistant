import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import type { ProviderConfigEntity, ThemeMode } from "../../db/entities";
import { appOptionsRepository } from "../../db/repositories/appOptionsRepository";
import { modelLoadEstimateRepository } from "../../db/repositories/modelLoadEstimateRepository";
import { isProviderUsable, providerConfigRepository } from "../../db/repositories/providerConfigRepository";
import { getProviderDefinition, listModels, listModelsByProvider, providerDefinitions } from "../../features/generation/models/registry";
import type { ProviderId, StaticModel } from "../../features/generation/models/types";
import { appMetadata } from "../metadata";

export function OptionsView(props: { providerConfigs: ProviderConfigEntity[]; theme: ThemeMode }) {
  const queryClient = useQueryClient();
  const saveProviderMutation = useMutation({
    mutationFn: (provider: ProviderConfigEntity) => providerConfigRepository.save(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["providerConfigs"] })
  });

  async function setTheme(theme: ThemeMode) {
    await appOptionsRepository.set("theme", theme);
    await queryClient.invalidateQueries({ queryKey: ["theme"] });
  }

  const modelEstimateQuery = useQuery({
    queryKey: ["modelLoadEstimates"],
    queryFn: async () => {
      const imageModels = listModels().filter((model) => model.type === "image" || model.type === "image-edit");
      const entries = await Promise.all(
        imageModels.map(async (model) => {
          const seconds = await modelLoadEstimateRepository.getEstimatedSeconds(model.providerId, model.providerModelName);
          return [estimateKey(model), seconds] as const;
        })
      );
      return Object.fromEntries(entries);
    }
  });

  return (
    <section className="options-view container-xxl py-3">
      <section className="options-section" aria-labelledby="providers-heading">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <h2 id="providers-heading" className="h5 mb-0">
            Provider
          </h2>
        </div>
        {providerDefinitions.map((definition) => {
          const provider = props.providerConfigs.find((entry) => entry.id === definition.id) ?? createProviderFallback(definition.id);
          return <ProviderForm key={definition.id} provider={provider} estimates={modelEstimateQuery.data} onSave={(next) => saveProviderMutation.mutate(next)} />;
        })}
      </section>
      <section className="options-section" aria-labelledby="general-heading">
        <h2 id="general-heading" className="h5 mb-0">
          Allgemein
        </h2>
        <div className="general-options">
          <div className="btn-group w-100" role="group" aria-label="Theme">
            {[
              { id: "light", label: "Light", icon: <Sun size={17} /> },
              { id: "dark", label: "Dark", icon: <Moon size={17} /> },
              { id: "system", label: "System" }
            ].map((theme) => (
              <Fragment key={theme.id}>
                <input type="radio" className="btn-check" name="theme" id={`theme-${theme.id}`} autoComplete="off" checked={props.theme === theme.id} onChange={() => setTheme(theme.id as ThemeMode)} />
                <label className="btn btn-outline-secondary" htmlFor={`theme-${theme.id}`}>
                  {theme.icon} {theme.label}
                </label>
              </Fragment>
            ))}
          </div>
          <div className="settings-meta">
            <span>Version {appMetadata.version}</span>
            <span>Build {appMetadata.buildTime}</span>
            <span>DB Schema {appMetadata.dbSchemaVersion}</span>
            <span>Commit {appMetadata.gitCommit}</span>
          </div>
        </div>
      </section>
    </section>
  );
}

function ProviderForm(props: { provider: ProviderConfigEntity; estimates?: Record<string, number>; onSave: (provider: ProviderConfigEntity) => void }) {
  const [provider, setProvider] = useState(props.provider);
  const [validated, setValidated] = useState(false);
  const usable = isProviderUsable(provider);
  const definition = getProviderDefinition(provider.id);
  const activeModels = usable ? listModelsByProvider(provider.id as ProviderId).sort((left, right) => left.name.localeCompare(right.name, "de", { sensitivity: "base" })) : [];
  const shouldShowSavedErrors = !validated && provider.enabled !== false;

  useEffect(() => setProvider(props.provider), [props.provider]);

  function submitProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidated(true);
    if (!event.currentTarget.checkValidity()) return;
    props.onSave(provider);
  }

  return (
    <form className={validated ? "model-form was-validated" : "model-form"} noValidate onSubmit={submitProvider}>
      <h3 className="h6 mb-0">{definition?.label ?? provider.id}</h3>
      <div className="form-floating">
        <input id={`provider-url-${provider.id}`} className={fieldClass(!provider.baseUrl.trim(), shouldShowSavedErrors, "form-control")} value={provider.baseUrl} placeholder={definition?.defaultBaseUrl ?? "https://api.example.com"} required onChange={(event) => setProvider({ ...provider, baseUrl: event.target.value })} />
        <label htmlFor={`provider-url-${provider.id}`}>Base URL</label>
        <div className="invalid-feedback">Bitte eine Base URL eingeben.</div>
      </div>
      <div className="form-floating">
        <input id={`provider-key-${provider.id}`} className={fieldClass(!provider.apiKey?.trim(), shouldShowSavedErrors, "form-control")} value={provider.apiKey ?? ""} type="password" placeholder="API-Key" required onChange={(event) => setProvider({ ...provider, apiKey: event.target.value })} />
        <label htmlFor={`provider-key-${provider.id}`}>API-Key</label>
        <div className="invalid-feedback">Bitte einen API-Key eingeben.</div>
      </div>
      <label className="form-check d-inline-flex align-items-center gap-2">
        <input className="form-check-input" type="checkbox" checked={provider.enabled !== false} onChange={(event) => setProvider({ ...provider, enabled: event.target.checked })} /> <span className="form-check-label">Aktiviert</span>
      </label>
      <div className="small text-secondary">
        <div>Aktive Modelle</div>
        {activeModels.length > 0 ? (
          <ul className="mb-0 ps-3">
            {activeModels.map((model) => (
              <li key={model.id}>{formatModelName(model, props.estimates)}</li>
            ))}
          </ul>
        ) : (
          <span>keine</span>
        )}
      </div>
      <div className="d-flex align-items-center justify-content-between gap-3">
        <span className={usable ? "model-status model-status--usable" : "model-status model-status--incomplete"}>
          <span className="model-status__dot" aria-hidden="true" />
          <span>{usable ? "verwendbar" : provider.enabled === false ? "inaktiv" : "unvollständig"}</span>
        </span>
        <button className="btn btn-primary" type="submit">
          Speichern
        </button>
      </div>
    </form>
  );
}

function createProviderFallback(providerId: ProviderId): ProviderConfigEntity {
  const now = new Date().toISOString();
  const definition = getProviderDefinition(providerId);
  return { id: providerId, baseUrl: definition?.defaultBaseUrl ?? "", enabled: true, createdAt: now, updatedAt: now };
}

function fieldClass(invalid: boolean, showInvalid: boolean, baseClass: string): string {
  return invalid && showInvalid ? `${baseClass} is-invalid` : baseClass;
}

function formatModelName(model: StaticModel, estimates?: Record<string, number>): string {
  if (model.type === "text") return model.name;
  const seconds = estimates?.[estimateKey(model)] ?? 30;
  return `${model.name} (~${Math.round(seconds)} sec.)`;
}

function estimateKey(model: Pick<StaticModel, "providerId" | "providerModelName">): string {
  return `${model.providerId}::${model.providerModelName}`;
}
