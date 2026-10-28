// Credentials are read only from the secure environment, never written to files.
import fs from "node:fs";
import crypto from "node:crypto";
import webPush from "web-push";
const account = process.env.CLOUDFLARE_ACCOUNT_ID,
  token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token)
  throw Error(
    "Configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN securely.",
  );
const root = "https://api.cloudflare.com/client/v4/accounts/" + account;
async function api(path, method = "GET", body) {
  const headers = { Authorization: "Bearer " + token };
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const response = await fetch(root + path, { method, headers, body });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw Error(
      `Cloudflare ${method} ${path}: HTTP ${response.status}; errors ${(result.errors || []).map((e) => String(e.code) + ": " + e.message).join("; ")}`,
    );
  return result.result;
}
let subdomain;
try {
  subdomain = (await api("/workers/subdomain")).subdomain;
} catch {
  subdomain = (
    await api("/workers/subdomain", "PUT", {
      subdomain: "bangi-" + account.slice(0, 8),
    })
  ).subdomain;
}
if (!subdomain)
  throw Error(
    "Open Workers & Pages in Cloudflare to initialize your workers.dev address.",
  );
const name = "bangi-prayer-push";
let db = (await api("/d1/database")).find(
  (d) => d.name === "bangi-notifications",
);
if (!db)
  db = await api("/d1/database", "POST", { name: "bangi-notifications" });
await api("/d1/database/" + db.uuid + "/query", "POST", {
  sql: fs.readFileSync("cloudflare/schema.sql", "utf8"),
});
let existing = [];
try {
  existing = await api("/workers/scripts/" + name + "/secrets");
} catch {
  /* First deployment. */
}
const secretNames = existing.map((s) => s.name);
const hasKeys = secretNames.includes("VAPID_PRIVATE_KEY");
if (hasKeys !== secretNames.includes("VAPID_PUBLIC_KEY"))
  throw Error(
    "Incomplete VAPID secret pair; restore both keys before deployment.",
  );
const bindings = [
  { type: "d1", name: "DB", id: db.uuid },
  {
    type: "plain_text",
    name: "APP_ORIGIN",
    text: "https://joebillie.github.io",
  },
  ...existing.map((s) => ({ type: "secret_text", name: s.name })),
];
if (!hasKeys) {
  const keys = webPush.generateVAPIDKeys();
  bindings.push(
    { type: "secret_text", name: "VAPID_PUBLIC_KEY", text: keys.publicKey },
    { type: "secret_text", name: "VAPID_PRIVATE_KEY", text: keys.privateKey },
  );
}
if (!secretNames.includes("CRON_SECRET"))
  bindings.push({
    type: "secret_text",
    name: "CRON_SECRET",
    text: crypto.randomBytes(32).toString("hex"),
  });
const form = new FormData();
form.set(
  "metadata",
  new Blob(
    [
      JSON.stringify({
        main_module: "worker.js",
        compatibility_date: "2026-10-01",
        compatibility_flags: ["nodejs_compat"],
        bindings,
      }),
    ],
    { type: "application/json" },
  ),
);
form.set(
  "worker.js",
  new Blob([fs.readFileSync("backend-dist/cloudflare.js")], {
    type: "application/javascript+module",
  }),
  "worker.js",
);
await api("/workers/scripts/" + name, "PUT", form);
await api("/workers/scripts/" + name + "/subdomain", "POST", {
  enabled: true,
  previews_enabled: false,
});
await api("/workers/scripts/" + name + "/schedules", "PUT", [
  { cron: "* * * * *" },
]);
const endpoint =
  "https://" + name + "." + subdomain + ".workers.dev/prayer-push";
// Public endpoint only. No credentials or private signing keys are written.
fs.writeFileSync(
  "public/push-config.json",
  JSON.stringify({ enabled: true, endpoint }) + "\n",
);
console.log("Cloudflare deployed: " + endpoint);
console.log(
  "Database and one-minute scheduler configured. Verify health before publishing the website.",
);
