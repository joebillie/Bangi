import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/pwa.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:8081",
    viewport: { width: 390, height: 844 },
    launchOptions: {
      executablePath:
        process.env.BANGI_CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command:
      "EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 CI=1 npx expo start --web --port 8081",
    url: "http://127.0.0.1:8081",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
