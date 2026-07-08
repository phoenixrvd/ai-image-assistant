import type { CSSProperties } from "react";
import { Send } from "lucide-react";

export function SendProgressButton(props: { progressPercent: number; loading: boolean; disabled: boolean; ariaLabel: string }) {
  const style = { "--progress": `${Math.max(0, Math.min(100, props.progressPercent))}%` } as CSSProperties;

  return (
    <button
      type="submit"
      className={props.loading ? "send-button is-loading" : "send-button"}
      style={style}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
    >
      <span className="send-button__ring" aria-hidden="true" />
      {props.loading && (
        <svg className="send-button__glint" viewBox="0 0 72 72" aria-hidden="true">
          <circle className="send-button__glint-circle" cx="36" cy="36" r="33.5" />
        </svg>
      )}
      <span className="send-button__inner" aria-hidden="true" />
      <Send size={18} aria-hidden="true" className="send-button__icon" />
    </button>
  );
}
