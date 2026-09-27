import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Image as ImageIcon, Upload } from "lucide-react";
import type { ImageEntity } from "../../../db/entities";
import {
  getSelectableModelLabel,
  modelRequiresReferenceImages,
  modelSupportsReferenceImages,
} from "../../generation/models/registry";
import type { StaticModel } from "../../generation/models/types";
import type { UploadedReference } from "../../generation/types";

const aspectRatios = [
  { id: "square", label: "1:1" },
  { id: "portrait", label: "9:16" },
  { id: "landscape", label: "16:9" },
];

export function ConfigPanel(props: {
  open: boolean;
  activeChatId?: string;
  title: string;
  imageInstructions: string;
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
  const { t } = useTranslation();
  const referencesEnabled = modelSupportsReferenceImages(props.activeModel);
  const referencesRequired = modelRequiresReferenceImages(props.activeModel);

  return (
    <aside className={`config-panel ${props.open ? "open" : ""}`}>
      <div className="panel-section">
        <div className="form-floating">
          <input
            className="form-control"
            id="chat-title"
            value={props.title}
            placeholder={t("config.chatName")}
            disabled={!props.activeChatId}
            onChange={(event) => {
              const nextTitle = event.target.value;
              props.onRenameChat(nextTitle);
            }}
          />
          <label htmlFor="chat-title">{t("config.chatName")}</label>
        </div>
      </div>
      <div className="panel-section">
        <div className="form-floating">
          <textarea
            className="form-control"
            id="image-instructions"
            value={props.imageInstructions}
            disabled={!props.activeChatId}
            rows={5}
            placeholder={t("config.stylePlaceholder")}
            onChange={(event) => {
              const nextInstructions = event.target.value;
              props.onSaveImageInstructions(nextInstructions);
            }}
          />
          <label htmlFor="image-instructions">{t("config.styleRules")}</label>
        </div>
      </div>
      {referencesEnabled && (
        <PromptOptions
          pinnedImages={props.pinnedImages}
          referencesRequired={referencesRequired}
          uploadedReferences={props.uploadedReferences}
          onRemovePinnedReference={props.onRemovePinnedReference}
          onUploadReferences={props.onUploadReferences}
          onRemoveUploadedReference={props.onRemoveUploadedReference}
        />
      )}
      <div className="panel-section">
        <div className="form-floating">
          <select
            className="form-select"
            id="active-image-model"
            value={props.activeModel?.id ?? ""}
            disabled={props.imageModels.length === 0}
            onChange={(event) => props.onActiveModel(event.target.value)}
          >
            {props.imageModels.length === 0 ? (
              <option value="">{t("config.noActiveModel")}</option>
            ) : null}
            {props.imageModels.map((model) => (
              <option key={model.id} value={model.id}>
                {getSelectableModelLabel(model, {
                  createOnly: t("config.createOnly"),
                  editOnly: t("config.editOnly"),
                })}
              </option>
            ))}
          </select>
          <label htmlFor="active-image-model">{t("config.activeModel")}</label>
        </div>
      </div>
      <div className="panel-section">
        <div className="form-floating">
          <select
            className="form-select"
            id="image-count"
            value={props.imageCount}
            onChange={(event) => props.onImageCount(Number(event.target.value))}
          >
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <label htmlFor="image-count">{t("config.imageCount")}</label>
        </div>
      </div>
      <div className="panel-section">
        <div
          className="btn-group w-100"
          role="group"
          aria-label={t("config.imageFormat")}
        >
          {aspectRatios.map((ratio) => (
            <Fragment key={ratio.id}>
              <input
                type="radio"
                className="btn-check"
                name="ratio"
                id={`ratio-${ratio.id}`}
                autoComplete="off"
                checked={ratio.id === props.aspectRatio}
                onChange={() => props.onAspectRatio(ratio.id)}
              />
              <label
                className="btn btn-outline-secondary"
                htmlFor={`ratio-${ratio.id}`}
              >
                {ratio.label}
              </label>
            </Fragment>
          ))}
        </div>
      </div>
    </aside>
  );
}

function PromptOptions(props: {
  pinnedImages: ImageEntity[];
  referencesRequired: boolean;
  uploadedReferences: UploadedReference[];
  onRemovePinnedReference: (imageId: string) => void;
  onUploadReferences: (files: File[]) => void;
  onRemoveUploadedReference: (id: string) => void;
}) {
  const { t } = useTranslation();
  const canUpload =
    props.pinnedImages.length + props.uploadedReferences.length < 3;
  const referenceCount =
    props.pinnedImages.length + props.uploadedReferences.length;
  const handleReferenceSelection = (
    files: FileList | null,
    input: HTMLInputElement,
  ) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    const remainingSlots = Math.max(
      0,
      3 - (props.pinnedImages.length + props.uploadedReferences.length),
    );
    if (remainingSlots === 0) {
      window.alert(t("config.maxReferences"));
      input.value = "";
      return;
    }
    props.onUploadReferences(selectedFiles.slice(0, remainingSlots));
    if (selectedFiles.length > remainingSlots)
      window.alert(t("config.firstReferences"));
    input.value = "";
  };
  return (
    <div className="prompt-options">
      <div className="reference-strip">
        {props.pinnedImages.map((image) => (
          <ReferenceThumb
            key={image.id}
            blob={image.blob}
            onClick={() => {
              if (window.confirm(t("config.removePinned")))
                props.onRemovePinnedReference(image.id);
            }}
          />
        ))}
        {props.uploadedReferences.map((entry) => (
          <ReferenceThumb
            key={entry.id}
            dataUrl={entry.dataUrl}
            onClick={() => {
              if (window.confirm(t("config.removeUploaded")))
                props.onRemoveUploadedReference(entry.id);
            }}
          />
        ))}
        <div
          className={
            canUpload
              ? "btn-group upload-reference-group"
              : "btn-group upload-reference-group disabled"
          }
          role="group"
          aria-label={t("config.addReference")}
        >
          <label
            className="btn upload-reference-button"
            title={t("config.uploadImage")}
          >
            <Upload size={16} />
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={!canUpload}
              onChange={(event) => {
                handleReferenceSelection(
                  event.target.files,
                  event.currentTarget,
                );
              }}
            />
          </label>
          <label
            className="btn upload-reference-button"
            title={t("config.openCamera")}
          >
            <Camera size={16} />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={!canUpload}
              onChange={(event) => {
                handleReferenceSelection(
                  event.target.files,
                  event.currentTarget,
                );
              }}
            />
          </label>
        </div>
      </div>
      {props.referencesRequired && referenceCount === 0 && (
        <small className="reference-warning">{t("config.required")}</small>
      )}
    </div>
  );
}

function ReferenceThumb(props: {
  onClick: () => void;
  blob?: Blob;
  dataUrl?: string;
}) {
  const { t } = useTranslation();
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
    <button
      type="button"
      className="reference-thumb active"
      onClick={props.onClick}
      aria-pressed={true}
    >
      {url ? (
        <img src={url} alt={t("config.referenceImage")} />
      ) : (
        <div className="reference-thumb-fallback">
          <ImageIcon size={14} />
        </div>
      )}
    </button>
  );
}
