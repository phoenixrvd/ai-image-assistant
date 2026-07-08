import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Moon, Plus, Sun, Trash2 } from "lucide-react";
import type { ModelConfigEntity, ThemeMode } from "../../db/entities";
import { appOptionsRepository } from "../../db/repositories/appOptionsRepository";
import { isModelUsable, modelConfigRepository, modelSupportsReferenceImages } from "../../db/repositories/modelConfigRepository";
import { listProviderOptions } from "../../features/generation/providers/registry";
import { appMetadata } from "../metadata";

export function OptionsView(props: { models: ModelConfigEntity[]; theme: ThemeMode }) {
  const queryClient = useQueryClient();
  const addModelMutation = useMutation({
    mutationFn: () => modelConfigRepository.createDraft(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] })
  });
  const saveModelMutation = useMutation({
    mutationFn: (model: ModelConfigEntity) => modelConfigRepository.save(model),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] })
  });
  const deleteModelMutation = useMutation({
    mutationFn: (id: string) => modelConfigRepository.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] })
  });

  async function setTheme(theme: ThemeMode) {
    await appOptionsRepository.set("theme", theme);
    await queryClient.invalidateQueries({ queryKey: ["theme"] });
  }

  return (
    <section className="options-view container-xxl py-3">
      <section className="options-section" aria-labelledby="models-heading">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <h2 id="models-heading" className="h5 mb-0">
            Models
          </h2>
          <button className="btn btn-outline-secondary" aria-label="Modell hinzufügen" onClick={() => addModelMutation.mutate()}>
            <Plus size={18} />
          </button>
        </div>
        {props.models.map((model) => (
          <ModelForm key={model.id} model={model} onDelete={(id) => deleteModelMutation.mutate(id)} onSave={(next) => saveModelMutation.mutate(next)} />
        ))}
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

function ModelForm(props: { model: ModelConfigEntity; onDelete: (id: string) => void; onSave: (model: ModelConfigEntity) => void }) {
  const [model, setModel] = useState(props.model);
  const [validated, setValidated] = useState(false);
  const usable = isModelUsable(model, model.type);
  const shouldShowSavedErrors = !validated && model.enabled !== false;

  useEffect(() => setModel(props.model), [props.model]);

  function submitModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidated(true);
    if (!event.currentTarget.checkValidity()) return;
    props.onSave(model);
  }

  return (
    <form className={validated ? "model-form was-validated" : "model-form"} noValidate onSubmit={submitModel}>
      <div className="form-floating">
        <input id={`model-display-${model.id}`} className={fieldClass(!model.displayName.trim(), shouldShowSavedErrors, "form-control")} value={model.displayName} placeholder="Anzeigename" required onChange={(event) => setModel({ ...model, displayName: event.target.value })} />
        <label htmlFor={`model-display-${model.id}`}>Anzeigename</label>
        <div className="invalid-feedback">Bitte einen Anzeigenamen eingeben.</div>
      </div>
      <div className="form-floating">
        <select
          id={`model-type-${model.id}`}
          className="form-select"
          value={model.type}
          required
          onChange={(event) => {
            const type = event.target.value as ModelConfigEntity["type"];
            setModel({ ...model, type, supportsReferenceImages: type === "image" ? modelSupportsReferenceImages(model) : false });
          }}
        >
          <option value="image">Bildmodell</option>
          <option value="chat">Textmodell</option>
        </select>
        <label htmlFor={`model-type-${model.id}`}>Modelltyp</label>
        <div className="invalid-feedback">Bitte einen Modelltyp wählen.</div>
      </div>
      <div className="form-floating">
        <select id={`model-provider-${model.id}`} className={fieldClass(!model.provider.trim(), shouldShowSavedErrors, "form-select")} value={model.provider === "grok" ? "xai" : model.provider} required onChange={(event) => setModel({ ...model, provider: event.target.value })}>
          <option value="" disabled>
            Provider wählen
          </option>
          {listProviderOptions().map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.label}
            </option>
          ))}
        </select>
        <label htmlFor={`model-provider-${model.id}`}>Provider</label>
        <div className="invalid-feedback">Bitte einen Provider wählen.</div>
      </div>
      <div className="form-floating">
        <input id={`model-url-${model.id}`} className={fieldClass(!model.baseUrl.trim(), shouldShowSavedErrors, "form-control")} value={model.baseUrl} placeholder="https://api.x.ai/v1" required onChange={(event) => setModel({ ...model, baseUrl: event.target.value })} />
        <label htmlFor={`model-url-${model.id}`}>Base URL</label>
        <div className="invalid-feedback">Bitte eine Base URL eingeben.</div>
      </div>
      <div className="form-floating">
        <input id={`model-key-${model.id}`} className={fieldClass(!model.apiKey?.trim(), shouldShowSavedErrors, "form-control")} value={model.apiKey ?? ""} type="password" placeholder="API-Key" required onChange={(event) => setModel({ ...model, apiKey: event.target.value })} />
        <label htmlFor={`model-key-${model.id}`}>API-Key</label>
        <div className="invalid-feedback">Bitte einen API-Key eingeben.</div>
      </div>
      <div className="form-floating">
        <input id={`model-name-${model.id}`} className={fieldClass(!model.modelName.trim(), shouldShowSavedErrors, "form-control")} value={model.modelName} placeholder="grok-2-image" required onChange={(event) => setModel({ ...model, modelName: event.target.value })} />
        <label htmlFor={`model-name-${model.id}`}>Modellname</label>
        <div className="invalid-feedback">Bitte einen Modellnamen eingeben.</div>
      </div>
      {model.type === "image" && (
        <div className="form-floating">
          <input id={`model-quality-${model.id}`} className="form-control" value={String(model.defaultParameters?.quality ?? "")} placeholder="low" onChange={(event) => setModel(setModelQuality(model, event.target.value))} />
          <label htmlFor={`model-quality-${model.id}`}>Quality</label>
        </div>
      )}
      <label className="form-check d-inline-flex align-items-center gap-2">
        <input className="form-check-input" type="checkbox" checked={model.enabled !== false} onChange={(event) => setModel({ ...model, enabled: event.target.checked })} /> <span className="form-check-label">Aktiviert</span>
      </label>
      {model.type === "image" && (
        <label className="form-check d-inline-flex align-items-center gap-2">
          <input className="form-check-input" type="checkbox" checked={modelSupportsReferenceImages(model)} onChange={(event) => setModel({ ...model, supportsReferenceImages: event.target.checked })} /> <span className="form-check-label">Unterstützt Referenzbilder</span>
        </label>
      )}
      <div className="d-flex align-items-center justify-content-between gap-3">
        <span className={usable ? "model-status model-status--usable" : "model-status model-status--incomplete"}>
          <span className="model-status__dot" aria-hidden="true" />
          <span>{usable ? "verwendbar" : "unvollständig"}</span>
        </span>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-danger" type="button" aria-label="Modell löschen" onClick={() => props.onDelete(model.id)}>
            <Trash2 size={17} />
          </button>
          <button className="btn btn-primary" type="submit">
            Speichern
          </button>
        </div>
      </div>
    </form>
  );
}

function fieldClass(invalid: boolean, showInvalid: boolean, baseClass: string): string {
  return invalid && showInvalid ? `${baseClass} is-invalid` : baseClass;
}

function setModelQuality(model: ModelConfigEntity, quality: string): ModelConfigEntity {
  const defaultParameters = { ...(model.defaultParameters ?? {}) };
  const trimmedQuality = quality.trim();

  if (trimmedQuality) {
    defaultParameters.quality = trimmedQuality;
  } else {
    delete defaultParameters.quality;
  }

  return {
    ...model,
    defaultParameters: Object.keys(defaultParameters).length ? defaultParameters : undefined
  };
}
