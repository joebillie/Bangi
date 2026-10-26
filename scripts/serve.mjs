import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist");
const base = (process.env.EXPO_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
  ".ttf": "font/ttf",
};
http
  .createServer((req, res) => {
    let file;
    try {
      let name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (base) {
        if (name !== base && !name.startsWith(base + "/")) {
          res.writeHead(404).end();
          return;
        }
        name = name.slice(base.length) || "/";
      }
      file = path.resolve(root, "." + name);
      if (!file.startsWith(root + path.sep) && file !== root) {
        res.writeHead(403).end();
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        if (path.extname(name)) {
          res.writeHead(404).end();
          return;
        }
        file = path.join(root, "index.html");
      }
      res.setHeader(
        "Content-Type",
        mime[path.extname(file)] || "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        file.endsWith("sw.js") || file.endsWith("index.html")
          ? "no-cache"
          : "public, max-age=3600",
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(400).end();
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Bangi production server listening on port ${port}`),
  );
