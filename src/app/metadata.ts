import { DB_SCHEMA_VERSION } from "../db/database";

export const appMetadata = {
  version: import.meta.env.VITE_APP_VERSION ?? "dev",
  buildTime: import.meta.env.VITE_BUILD_TIME ?? "local",
  gitCommit: import.meta.env.VITE_GIT_COMMIT ?? "unknown",
  dbSchemaVersion: DB_SCHEMA_VERSION
};
