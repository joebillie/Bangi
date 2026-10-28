import { build } from "esbuild";
await build({
  entryPoints: ["supabase/functions/prayer-push/index.ts"],
  outfile: "backend-dist/index.js",
  bundle: true,
  platform: "neutral",
  target: "es2022",
  format: "esm",
  minify: true,
  plugins: [
    {
      name: "deno-npm",
      setup(b) {
        b.onResolve(
          { filter: /^(@supabase\/supabase-js|web-push)$/ },
          (args) => ({
            path: `npm:${args.path}@${args.path === "web-push" ? "3.6.7" : "2.118.0"}`,
            external: true,
          }),
        );
      },
    },
  ],
});
console.log("Built Supabase Edge Function bundle in backend-dist/index.js");
