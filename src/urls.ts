export const basePath = (process.env.EXPO_PUBLIC_BASE_PATH || "").replace(
  /\/$/,
  "",
);
export const assetUrl = (path: string) =>
  `${basePath}/${path.replace(/^\//, "")}`;
