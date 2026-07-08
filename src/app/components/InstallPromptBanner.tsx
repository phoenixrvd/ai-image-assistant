import { useEffect, useState } from "react";

const installPromptHandledKey = "pwaInstallPromptHandled";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPromptBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    if (isAppInstalled() || window.localStorage.getItem(installPromptHandledKey) === "true") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };
    const handleAppInstalled = () => {
      window.localStorage.setItem(installPromptHandledKey, "true");
      setShowInstallPrompt(false);
      setInstallPrompt(undefined);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    window.localStorage.setItem(installPromptHandledKey, "true");
    setShowInstallPrompt(false);
    setInstallPrompt(undefined);
  }

  function dismissInstallPrompt() {
    window.localStorage.setItem(installPromptHandledKey, "true");
    setShowInstallPrompt(false);
  }

  if (!showInstallPrompt || !installPrompt) return null;

  return (
    <section className="install-prompt container-xxl" aria-label="App installieren">
      <div className="install-prompt-card">
        <div>
          <strong>AI Image Assistant installieren</strong>
          <p>Nutze die App wie eine eigene Anwendung mit Icon auf deinem Gerät.</p>
        </div>
        <div className="install-prompt-actions d-flex flex-shrink-0 gap-2">
          <button className="btn btn-primary" type="button" onClick={() => void installApp()}>
            Installieren
          </button>
          <button className="btn btn-outline-secondary" type="button" onClick={dismissInstallPrompt}>
            Später
          </button>
        </div>
      </div>
    </section>
  );
}

function isAppInstalled() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}
