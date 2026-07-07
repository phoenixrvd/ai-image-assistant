import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function readGitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const buildRevision = readGitCommit();

const lines = [
  `VITE_APP_VERSION=${packageJson.version}`,
  `VITE_BUILD_TIME=${new Date().toISOString()}`,
  `VITE_BUILD_REVISION=${buildRevision}`,
  `VITE_GIT_COMMIT=${buildRevision}`,
  ""
];

writeFileSync(new URL("../.env.production.local", import.meta.url), lines.join("\n"));
