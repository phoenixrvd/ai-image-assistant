import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appVersion = env.VITE_APP_VERSION ?? "dev";
  const buildRevision = env.VITE_BUILD_REVISION ?? env.VITE_GIT_COMMIT ?? appVersion;

  return {
    base: "/",
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,json}"],
          navigateFallback: "/index.html",
        },
        manifest: {
          id: "/",
          name: "AI Image Assistant",
          short_name: "AIIA",
          description: "Mobile-first PWA für KI-Bildgenerierung.",
          lang: "de",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#111827",
          theme_color: "#111827",
          icons: [
              {
              src: "pwa.svg?v=" + buildRevision,
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable"
            },
            {
              src: "pwa-192x192.png?v=" + buildRevision,
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "pwa-512x512.png?v=" + buildRevision,
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "maskable-192x192.png?v=" + buildRevision,
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable"
            },
            {
              src: "maskable-512x512.png?v=" + buildRevision,
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        }
      }),
      versionPwaManifestLink(buildRevision)
    ]
  };
});

function versionPwaManifestLink(buildRevision: string) {
  let root = process.cwd();
  let outDir = "dist";

  return {
    name: "version-pwa-manifest-link",
    configResolved(config: { root: string; build: { outDir: string } }) {
      root = config.root;
      outDir = config.build.outDir;
    },
    closeBundle() {
      const indexPath = resolve(root, outDir, "index.html");
      const html = readFileSync(indexPath, "utf8");
      const updated = html.replace(/<link rel="manifest" href="([^"]*manifest\.webmanifest)">/, `<link rel="manifest" href="$1?v=${buildRevision}">`);
      writeFileSync(indexPath, updated);
    }
  };
}
