import { build } from "esbuild";
await build({
  entryPoints: ["cloudflare/index.ts"],
  outfile: "backend-dist/cloudflare.js",
  bundle: true,
  platform: "node",
  target: "es2022",
  format: "esm",
  minify: true,
  external: ["node:*"],
  banner: {
    js: "import {createRequire} from 'node:module'; const require=createRequire('file:///worker.js');",
  },
});
console.log("Cloudflare Worker built.");
