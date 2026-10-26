import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name || "Bangi",
  slug: config.slug || "bangi",
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_PUBLIC_BASE_PATH || "",
  },
});
