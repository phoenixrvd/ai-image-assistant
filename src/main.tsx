import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app/App";
import { queryClient } from "./app/queryClient";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

let reloadingForServiceWorker = false;
let updateServiceWorker: ReturnType<typeof registerSW> | undefined;

updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateServiceWorker?.(true);
  },
  onNeedReload() {
    if (reloadingForServiceWorker) {
      return;
    }

    reloadingForServiceWorker = true;
    window.location.reload();
  },
  onRegisteredSW(_swScriptUrl, registration) {
    void registration?.update();
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
