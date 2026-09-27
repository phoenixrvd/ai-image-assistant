import { useEffect, useState, type CSSProperties } from "react";
import type { GenerationJob } from "../services/generationCoordinator";
import { Send, Square } from "lucide-react";

export function SendProgressButton(props: {
  job?: GenerationJob;
  loading: boolean;
  disabled: boolean;
  ariaLabel: string;
  onCancel: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  const job = props.job;
  useEffect(() => {
    if (job?.phase !== "running") return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [job?.phase, job?.startedAt]);
  const progress =
    job?.phase === "succeeded"
      ? 100
      : job?.phase === "running" && job.startedAt && job.estimatedSeconds
        ? Math.min(
            95,
            (Math.max(0, now - job.startedAt) / (job.estimatedSeconds * 1000)) *
              100,
          )
        : 0;
  const style = { "--progress": `${progress}%` } as CSSProperties;

  return (
    <button
      type={props.loading ? "button" : "submit"}
      className={props.loading ? "send-button is-loading" : "send-button"}
      style={style}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      onClick={props.loading ? props.onCancel : undefined}
    >
      <span className="send-button__ring" aria-hidden="true" />
      {props.loading && (
        <svg
          className="send-button__glint"
          viewBox="0 0 72 72"
          aria-hidden="true"
        >
          <circle
            className="send-button__glint-circle"
            cx="36"
            cy="36"
            r="33.5"
          />
        </svg>
      )}
      <span className="send-button__inner" aria-hidden="true" />
      {props.loading ? (
        <Square
          size={15}
          fill="currentColor"
          aria-hidden="true"
          className="send-button__icon"
        />
      ) : (
        <Send size={18} aria-hidden="true" className="send-button__icon" />
      )}
    </button>
  );
}
