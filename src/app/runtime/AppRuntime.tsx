import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQueries } from "../../features/settings/queries";
import { useGenerationActivity } from "../../features/generation/runtime/useGeneration";

export function AppRuntime() {
  const theme = useQuery(settingsQueries.theme).data ?? "system";
  const active = useGenerationActivity();
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.bsTheme = resolved;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if (!active || !("wakeLock" in navigator) || !window.isSecureContext) return;
    let disposed = false;
    let acquiring = false;
    let lock: WakeLockSentinel | undefined;
    const acquire = async () => {
      if (disposed || acquiring || (lock && !lock.released) || document.visibilityState !== "visible") return;
      acquiring = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed) await next.release();
        else lock = next;
      } catch {
        // Best effort: request processing works without a wake lock.
      } finally { acquiring = false; }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      if (lock && !lock.released) void lock.release().catch(() => { /* Already released by the browser. */ });
    };
  }, [active]);
  return null;
}
