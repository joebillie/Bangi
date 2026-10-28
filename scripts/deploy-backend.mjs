// Node 24+ with --use-env-proxy honors the cloud HTTPS credential proxy.
// Never prints or writes service credentials, private VAPID keys or cron secrets.
import fs from "node:fs";
import crypto from "node:crypto";
import webPush from "web-push";
const ref = (process.argv[2] || process.env.BANGI_SUPABASE_PROJECT_REF || "")
  .replace(/^https:\/\//, "")
  .replace(/\.supabase\.co\/?$/, "");
if (!/^[a-z]{20}$/.test(ref))
  throw Error(
    "Supply your public Supabase project ref or URL: npm run deploy:backend -- <project-ref>",
  );
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token)
  throw Error(
    "Add SUPABASE_ACCESS_TOKEN securely in environment settings; never paste it into chat.",
  );
if (!fs.existsSync("backend-dist/index.js"))
  throw Error("Run npm run build:backend first.");
const appUrl = new URL(
  process.env.BANGI_APP_URL || "https://joebillie.github.io/Bangi/",
);
if (appUrl.protocol !== "https:")
  throw Error("The installed app must use HTTPS.");
const api = async (path, method = "GET", body) => {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body instanceof FormData
          ? {}
          : body
            ? { "Content-Type": "application/json" }
            : {}),
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    },
  );
  if (!response.ok)
    throw Error(
      `Supabase ${method} ${path.split("?")[0]} returned HTTP ${response.status}. Check project authorization; no credentials have been printed.`,
    );
  return response.status === 204 ? null : response.json();
};
const sql = (query, parameters) =>
  api("/database/query", "POST", {
    query,
    ...(parameters ? { parameters } : {}),
  });
const project = await api("");
if (project.status && project.status !== "ACTIVE_HEALTHY")
  throw Error(
    "The selected project is not active and healthy. Resume it in Supabase before deploying.",
  );
await api("/config/auth", "PATCH", {
  external_anonymous_users_enabled: true,
  rate_limit_anonymous_users: 5,
});
await sql(
  fs.readFileSync("supabase/migrations/202610270001_bangi_push.sql", "utf8"),
);
await sql(
  "create extension if not exists pg_cron; create extension if not exists pg_net with schema extensions; create extension if not exists supabase_vault;",
);
const names = new Set((await api("/secrets")).map((item) => item.name));
const secrets = [
  { name: "BANGI_APP_ORIGIN", value: appUrl.origin },
  { name: "BANGI_VAPID_SUBJECT", value: appUrl.toString() },
];
if (
  names.has("BANGI_VAPID_PUBLIC_KEY") !== names.has("BANGI_VAPID_PRIVATE_KEY")
)
  throw Error(
    "Incomplete existing VAPID configuration. Refusing to rotate keys and invalidate installed subscriptions.",
  );
if (!names.has("BANGI_VAPID_PUBLIC_KEY")) {
  const keys = webPush.generateVAPIDKeys();
  secrets.push(
    { name: "BANGI_VAPID_PUBLIC_KEY", value: keys.publicKey },
    { name: "BANGI_VAPID_PRIVATE_KEY", value: keys.privateKey },
  );
}
const vault = await sql(
  "select exists(select 1 from vault.secrets where name='bangi_push_cron_secret') as present",
);
if (!names.has("BANGI_CRON_SECRET") || !vault[0]?.present) {
  const cronSecret = crypto.randomBytes(32).toString("base64url");
  secrets.push({ name: "BANGI_CRON_SECRET", value: cronSecret });
  if (vault[0]?.present)
    await sql(
      "select vault.update_secret(id,$1) from vault.secrets where name='bangi_push_cron_secret'",
      [cronSecret],
    );
  else
    await sql("select vault.create_secret($1,'bangi_push_cron_secret')", [
      cronSecret,
    ]);
}
await api("/secrets", "POST", secrets);
const form = new FormData();
form.append(
  "metadata",
  JSON.stringify({
    entrypoint_path: "index.js",
    verify_jwt: false,
    name: "Bangi prayer notifications",
  }),
);
form.append(
  "file",
  new Blob([fs.readFileSync("backend-dist/index.js")], {
    type: "text/javascript",
  }),
  "index.js",
);
await api("/functions/deploy?slug=prayer-push", "POST", form);
const endpoint = `https://${ref}.supabase.co/functions/v1/prayer-push`;
await sql("update public.bangi_push_subscriptions set scheduled_until=now()");
const urlVault = await sql(
  "select exists(select 1 from vault.secrets where name='bangi_push_dispatch_url') as present",
);
if (urlVault[0]?.present)
  await sql(
    "select vault.update_secret(id,$1) from vault.secrets where name='bangi_push_dispatch_url'",
    [endpoint + "/dispatch"],
  );
else
  await sql("select vault.create_secret($1,'bangi_push_dispatch_url')", [
    endpoint + "/dispatch",
  ]);
await sql(`select cron.unschedule(jobid) from cron.job where jobname='bangi-push-every-minute';
select cron.schedule('bangi-push-every-minute','* * * * *',$job$
 select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='bangi_push_dispatch_url'),
 headers:=jsonb_build_object('Content-Type','application/json','x-bangi-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='bangi_push_cron_secret')),
 body:='{}'::jsonb,timeout_milliseconds:=10000);
$job$);`);
const health = await fetch(endpoint + "/health");
if (!health.ok || (await health.json()).ready !== true)
  throw Error(
    "Backend deployment completed but health verification failed. The website has not been connected. Check project network access and function status.",
  );
fs.writeFileSync(
  "public/push-config.json",
  JSON.stringify({ enabled: true, endpoint }) + "\n",
);
console.log(
  "Backend deployed and health checked. Public endpoint configuration written to public/push-config.json.",
);
console.log(
  "Next: run the web checks/build and publish the website. Verify a real push on the installed iPhone.",
);
