import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Eraser, Pin, SlidersHorizontal } from "lucide-react";
import { SendProgressButton } from "../../generation/components/SendProgressButton";
import type { GenerationJob } from "../../generation/services/generationCoordinator";

export type PromptComposerProps = {
  prompt: string; setPrompt: (value: string) => void; canGenerate: boolean; isGenerating: boolean;
  generationJob?: GenerationJob; pinnedImageCount: number;
  onGenerate: () => void; onCancel: () => void; onOpenConfig: () => void; onShowNextPinnedImage: () => void;
};

export function PromptComposer(props: PromptComposerProps) {
  const { t } = useTranslation();
  const editor = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (editor.current && editor.current.textContent !== props.prompt) editor.current.textContent = props.prompt;
  }, [props.prompt]);
  return <form className="prompt-bar" onSubmit={(event) => {
    event.preventDefault();
    if (props.isGenerating) props.onCancel();
    else if (props.canGenerate) props.onGenerate();
  }}>
    <div className="prompt-input-shell">
      <div ref={editor} className="prompt-editable" contentEditable role="textbox" aria-multiline="true"
        aria-label={t("workspace.promptPlaceholder")} data-placeholder={t("workspace.promptPlaceholder")}
        onInput={(event) => props.setPrompt(event.currentTarget.textContent ?? "")}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || !(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
          event.preventDefault();
          if (props.canGenerate && !props.isGenerating) event.currentTarget.closest("form")?.requestSubmit();
        }}
        onPaste={(event) => { event.preventDefault(); document.execCommand("insertText", false, event.clipboardData.getData("text/plain")); }} />
      <div className="prompt-controls">
        <div className="d-inline-flex align-items-center gap-1">
          <button className="prompt-config" type="button" aria-label={t("workspace.openChatOptions")} onClick={props.onOpenConfig}><SlidersHorizontal size={18} aria-hidden="true" /></button>
          <button className="prompt-clear" type="button" aria-label={t("workspace.clearPrompt")} onClick={(event) => {
            event.currentTarget.blur();
            if (props.prompt.trim() && window.confirm(t("workspace.deletePrompt"))) props.setPrompt("");
          }}><Eraser size={18} aria-hidden="true" /></button>
          <button className="prompt-pinned-images" type="button" disabled={props.pinnedImageCount === 0} aria-label={t("workspace.nextPinned", { count: props.pinnedImageCount })} onClick={props.onShowNextPinnedImage}>
            <Pin size={18} aria-hidden="true" />{props.pinnedImageCount > 0 && <sup>{props.pinnedImageCount}</sup>}
          </button>
        </div>
        <SendProgressButton job={props.generationJob} loading={props.isGenerating} disabled={!props.canGenerate && !props.isGenerating}
          ariaLabel={t(props.isGenerating ? "workspace.cancelGeneration" : "workspace.generate")} onCancel={props.onCancel} />
      </div>
    </div>
  </form>;
}
