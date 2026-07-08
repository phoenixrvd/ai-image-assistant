/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BUILD_TIME?: string;
  readonly VITE_BUILD_REVISION?: string;
  readonly VITE_GIT_COMMIT?: string;
  readonly VITE_XAI_API_KEY?: string;
  readonly VITE_GROK_API_KEY?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_FAL_AI_KEY?: string;
}
