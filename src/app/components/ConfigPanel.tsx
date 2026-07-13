import { Fragment, useEffect, useState } from "react";
import { Camera, Image as ImageIcon, Upload } from "lucide-react";
import type { ChatEntity, ImageEntity } from "../../db/entities";
import { getModelLabel, modelRequiresReferenceImages, modelSupportsReferenceImages } from "../../features/generation/models/registry";
import type { StaticModel } from "../../features/generation/models/types";
import type { UploadedReference } from "../appHelpers";

const aspectRatios = [
  { id: "square", label: "1:1" },
  { id: "portrait", label: "9:16" },
  { id: "landscape", label: "16:9" }
];

export function ConfigPanel(props: {
  open: boolean;
  activeChatId?: string;
  activeChat?: ChatEntity;
  activeModel?: StaticModel;
  imageModels: StaticModel[];
  imageCount: number;
  aspectRatio: string;
  onClose: () => void;
  onActiveModel: (modelId: string) => void;
  onImageCount: (value: number) => void;
  onAspectRatio: (value: string) => void;
  pinnedImages: ImageEntity[];
  uploadedReferences: UploadedReference[];
  onRemovePinnedReference: (imageId: string) => void;
  onUploadReferences: (files: File[]) => void;
  onRemoveUploadedReference: (id: string) => void;
  onRenameChat: (title: string) => void;
  onSaveImageInstructions: (instructions: string) => void;
}) {
  const storedImageInstructions = readImageInstructions(props.activeChat);
  const [title, setTitle] = useState(props.activeChat?.title ?? "");
  const [imageInstructions, setImageInstructions] = useState(storedImageInstructions);
  const referencesEnabled = modelSupportsReferenceImages(props.activeModel);
  const referencesRequired = modelRequiresReferenceImages(props.activeModel);

  useEffect(() => setTitle(props.activeChat?.title ?? ""), [props.activeChat?.title]);
  useEffect(() => setImageInstructions(storedImageInstructions), [props.activeChat?.id, storedImageInstructions]);

  return (
    <aside className={`config-panel ${props.open ? "open" : ""}`}>
      <div className="panel-section">
        <div className="form-floating">
          <input
            className="form-control"
            id="chat-title"
            value={title}
            placeholder="Chatname"
            disabled={!props.activeChatId}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              if (nextTitle.trim()) props.onRenameChat(nextTitle.trim());
            }}
          />
          <label htmlFor="chat-title">Chatname</label>
        </div>
      </div>
      <div className="panel-section">
        <div className="form-floating">
          <textarea
            className="form-control"
            id="image-instructions"
            value={imageInstructions}
            disabled={!props.activeChatId}
            rows={5}
            placeholder="z. B. analoger Filmlook, reduzierte Farben, keine Schrift im Bild"
            onChange={(event) => {
              const nextInstructions = event.target.value;
              setImageInstructions(nextInstructions);
              props.onSaveImageInstructions(nextInstructions);
            }}
          />
          <label htmlFor="image-instructions">Stil &amp; Regeln</label>
        </div>
      </div>
      <PromptOptions
        pinnedImages={props.pinnedImages}
        referencesEnabled={referencesEnabled}
        referencesRequired={referencesRequired}
        uploadedReferences={props.uploadedReferences}
        onRemovePinnedReference={props.onRemovePinnedReference}
        onUploadReferences={props.onUploadReferences}
        onRemoveUploadedReference={props.onRemoveUploadedReference}
      />
      <div className="panel-section">
        <div className="form-floating">
          <select className="form-select" id="active-image-model" value={props.activeModel?.id ?? ""} disabled={props.imageModels.length === 0} onChange={(event) => props.onActiveModel(event.target.value)}>
            {props.imageModels.length === 0 ? <option value="">Kein aktives Bildmodell</option> : null}
            {props.imageModels.map((model) => (
              <option key={model.id} value={model.id}>
                {getModelLabel(model)}
              </option>
            ))}
          </select>
          <label htmlFor="active-image-model">Aktives Modell</label>
        </div>
      </div>
      <div className="panel-section">
        <div className="form-floating">
          <select className="form-select" id="image-count" value={props.imageCount} onChange={(event) => props.onImageCount(Number(event.target.value))}>
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <label htmlFor="image-count">Bilderanzahl</label>
        </div>
      </div>
      <div className="panel-section">
        <div className="btn-group w-100" role="group" aria-label="Bildformat">
          {aspectRatios.map((ratio) => (
            <Fragment key={ratio.id}>
              <input type="radio" className="btn-check" name="ratio" id={`ratio-${ratio.id}`} autoComplete="off" checked={ratio.id === props.aspectRatio} onChange={() => props.onAspectRatio(ratio.id)} />
              <label className="btn btn-outline-secondary" htmlFor={`ratio-${ratio.id}`}>
                {ratio.label}
              </label>
            </Fragment>
          ))}
        </div>
      </div>
    </aside>
  );
}

function readImageInstructions(chat?: ChatEntity): string {
  const value = chat?.metadata?.imageInstructions;
  return typeof value === "string" ? value : "";
}

function PromptOptions(props: {
  pinnedImages: ImageEntity[];
  referencesEnabled: boolean;
  referencesRequired: boolean;
  uploadedReferences: UploadedReference[];
  onRemovePinnedReference: (imageId: string) => void;
  onUploadReferences: (files: File[]) => void;
  onRemoveUploadedReference: (id: string) => void;
}) {
  const canUpload = props.referencesEnabled && props.pinnedImages.length + props.uploadedReferences.length < 3;
  const referenceCount = props.pinnedImages.length + props.uploadedReferences.length;
  const handleReferenceSelection = (files: FileList | null, input: HTMLInputElement) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    const remainingSlots = Math.max(0, 3 - (props.pinnedImages.length + props.uploadedReferences.length));
    if (remainingSlots === 0) {
      window.alert("Maximal 3 Referenzbilder erlaubt.");
      input.value = "";
      return;
    }
    props.onUploadReferences(selectedFiles.slice(0, remainingSlots));
    if (selectedFiles.length > remainingSlots) window.alert("Nur die ersten 3 Referenzen wurden übernommen.");
    input.value = "";
  };
  return (
    <div className="prompt-options">
        <div className={props.referencesEnabled ? "reference-strip" : "reference-strip unsupported"}>
        {props.pinnedImages.map((image) => (
          <ReferenceThumb
            key={image.id}
            active={props.referencesEnabled}
            blob={image.blob}
            onClick={() => {
              if (window.confirm("Dieses angepinnte Referenzbild entfernen?")) props.onRemovePinnedReference(image.id);
            }}
          />
        ))}
        {props.uploadedReferences.map((entry) => (
          <ReferenceThumb
            key={entry.id}
            active={props.referencesEnabled}
            dataUrl={entry.dataUrl}
            onClick={() => {
              if (window.confirm("Dieses hochgeladene Referenzbild entfernen?")) props.onRemoveUploadedReference(entry.id);
            }}
          />
        ))}
        <div className={canUpload ? "btn-group upload-reference-group" : "btn-group upload-reference-group disabled"} role="group" aria-label="Referenzbild hinzufügen">
          <label className="btn upload-reference-button" title="Bild hochladen">
            <Upload size={16} />
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={!canUpload}
              onChange={(event) => {
                handleReferenceSelection(event.target.files, event.currentTarget);
              }}
            />
          </label>
          <label className="btn upload-reference-button" title="Kamera öffnen">
            <Camera size={16} />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={!canUpload}
              onChange={(event) => {
                handleReferenceSelection(event.target.files, event.currentTarget);
              }}
            />
          </label>
        </div>
      </div>
      {!props.referencesEnabled && <small className="reference-warning">Das aktive Modell unterstützt keine Referenzbilder.</small>}
      {props.referencesEnabled && props.referencesRequired && referenceCount === 0 && <small className="reference-warning">Mindestens ein Referenzbild auswählen.</small>}
    </div>
  );
}

function ReferenceThumb(props: { active: boolean; onClick: () => void; blob?: Blob; dataUrl?: string }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (props.dataUrl) {
      setUrl(props.dataUrl);
      return;
    }
    if (!props.blob) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(props.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [props.blob, props.dataUrl]);

  return (
    <button type="button" className={props.active ? "reference-thumb active" : "reference-thumb"} onClick={props.onClick} aria-pressed={props.active}>
      {url ? (
        <img src={url} alt="Referenzbild" />
      ) : (
        <div className="reference-thumb-fallback">
          <ImageIcon size={14} />
        </div>
      )}
    </button>
  );
}
