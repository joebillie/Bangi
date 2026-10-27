# Bangi background notifications — Supabase Free

This adds Web Push while the Home Screen app is closed. GitHub Pages still serves the website; Supabase runs a private queue and a scheduled Edge Function. The code is prepared, but **the backend is not deployed or connected until a project is authorized and `public/push-config.json` is enabled by successful setup**.

## One-time account step

1. Create a dedicated **Free** Supabase project at https://supabase.com/dashboard. Use a Free organization; this script never changes billing plans or creates paid resources.
2. Supply the public project URL/ref. It is not a secret and may be shared in chat.
3. Create a deployment access token at https://supabase.com/dashboard/account/tokens. Add its value to **`SUPABASE_ACCESS_TOKEN` in secure environment settings**, then save/publish the environment changes. Never paste it into chat, source files, or GitHub comments. The saved requirement routes it only to `api.supabase.com`.

After that the agent can apply the migration, enable anonymous installation authentication, generate and install VAPID keys, deploy the function, install the minute scheduler, connect the website, and verify a test push. A Supabase coding connector is not required; setup uses the official Management API. Grant only the project-management permissions needed by your account and revoke the deployment token afterwards if desired.

```sh
npm ci
npm run check:backend
npm run build:backend
# Node 24+; uses the configured HTTPS credential proxy in this environment:
npm run deploy:backend -- YOUR_PUBLIC_PROJECT_REF
```

The setup script uses official Management API routes for auth configuration, database migrations, function secrets, and multipart function deployment. It preserves existing private VAPID keys on subsequent deployments, stores the scheduler secret in Supabase Vault, and never prints secrets. The hosted function uses Supabase's injected service-role environment variable; that key never reaches the website. The only generated website configuration is a public HTTPS function endpoint. Project network access must allow that exact `<ref>.supabase.co` hostname for cloud-side health/device checks.

After health verification writes `public/push-config.json`, run the website tests/build and deploy it through the existing Pages workflow. Backend deployment does not itself publish the frontend. Do not enable the configuration manually before a healthy backend exists.

## How it works

- A user explicitly enables background notifications inside the installed PWA. iPhone requires iOS 16.4+, Home Screen installation, permission, and internet access.
- Supabase anonymous Auth creates a private installation identity without an email/password form. Hosted Auth rate-limits anonymous creation to five per hour per IP in this setup. This is an anonymous backend identity, not a claim that no backend data exists.
- Every subscription operation validates the installation's access token through Supabase Auth. A client cannot specify somebody else's user ID. Public configuration exposes only the intended public VAPID/publishable keys.
- The endpoint stores a push subscription and the minimum prayer preferences: selected prayer location, calculation/source, adjustments and per-prayer reminders. Themes, home/recent locations, and compass GPS are not uploaded. The UI explains this before enrollment.
- The server uses the **same prayer/source planner** as the app, including the verified Namaadhu Vaguthu snapshot. It prepares up to 60 future reminders and refills them before coverage runs out, even when the app remains closed. No settings are read from a closed phone. When travelling in automatic-location mode, open Bangi to refresh and synchronize your new location; the backend uses the last selected location until then.
- `pg_cron` calls `/dispatch` every minute using an independent 256-bit secret in Vault. Browser JWTs cannot call the scheduler. SQL functions are executable only by `service_role`; tables have RLS enabled and no anon/authenticated direct grants.
- Transactional queue replacement removes stale unsent reminders. Claims use row locks and `SKIP LOCKED`, a short lease, a generation check, and bounded retries. Already-sent IDs are preserved across edits. Expired push endpoints (404/410) are removed. Missed reminders older than two minutes are skipped rather than replayed in a burst.
- A delivery is best effort/at least once around network failure windows: if the push provider accepts a request but the acknowledgement is lost, a retry can happen. Stable notification tags replace duplicates on supporting devices. No distributed system here guarantees exactly-once display.
- The service worker always presents a visible notification for valid push events; malformed payloads get a safe default. Clicks open/focus this app, not a URL supplied by a push payload.
- Disabling background reminders deletes the server registration and unsubscribes the browser. If offline cancellation fails, a pending deletion is retried on resume/reconnection; an error warns that the previous server schedule may remain active meanwhile. Removing website data can also remove the local installation session; expired endpoints are cleaned up on delivery failure.

## Free-plan budget and limits

Supabase's official documentation lists 500,000 Edge Function invocations/month, 500 MB database size, and two Free projects. One minute scheduler is about 43,200–44,640 calls/month before registrations, tests, retries or other project traffic. This is intended as a small personal deployment, **not unlimited public hosting**.

The default cap is **25 installations**, 25 due jobs per dispatch, five parallel provider sends, and five schedule refills per dispatch. Historical jobs are pruned after seven days. Raise limits only after real runtime/load measurements and quota review; Supabase Edge Functions currently have a 2-second CPU limit and a 150-second free wall-clock limit. Public deployments should add CAPTCHA/stronger enrollment controls through Supabase Auth before increasing anonymous enrollment volume.

Free projects can pause or hit quotas; there is no uptime or exact-delivery guarantee. If the project pauses, the scheduled function stops and background reminders stop. Monitor Supabase project status, `cron.job_run_details` and `net._http_response`. Normal useful scheduled work is not a promise that the provider will never pause a Free project. The script does not upgrade plans or add payment methods.

iOS Focus, sound settings, connectivity, and the push service can delay or suppress display. Notification sounds are system-controlled; a full custom adhan is not reliably available through iPhone Web Push. A minute scheduler has minute-level granularity, not exact-alarm semantics. Calendar export and foreground reminders remain independent fallbacks.

## Validation

`npm test` exercises the HTTP handler and actual PostgreSQL functions through PGlite: authentication, endpoint/key validation, origin/scheduler separation, provider expiry/retry, stale generations, transactional replacement, duplicate claims, SQL access grants and per-installation test throttling. Other tests cover prayer/source/time-zone correctness. `npm run check:backend` checks the function adapter and `npm run build:backend` creates the deployable ESM bundle with pinned Deno npm imports.

These are local tests, not evidence of a running Supabase cron or an iPhone lock-screen delivery. After deployment: enable push on the installed iPhone, send a test, close the app, schedule a real near-term reminder, verify delivery, change preferences and confirm the old reminder is removed. Check revocation, cancellation while offline, expired subscriptions, and project-pause failure behavior. The current lack of a connected project/token blocks those cloud/device checks.

Official references checked for this implementation:

- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/reference/api/introduction
