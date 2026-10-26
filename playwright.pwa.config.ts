import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "pwa.spec.ts",
  use: {
    ...base.use,
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "allow",
  },
  webServer: {
    command: "npm run serve",
    url:
      "http://127.0.0.1:4173" + (process.env.EXPO_PUBLIC_BASE_PATH || "") + "/",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
