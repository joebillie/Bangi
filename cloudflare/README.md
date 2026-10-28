# Cloudflare prayer notifications

Bangi's deployed backend uses a Cloudflare Worker, D1 SQLite and a one-minute Cron Trigger. GitHub Pages continues to serve the PWA. No custom domain is required.

## Deploy

Set `CLOUDFLARE_API_TOKEN` in secure environment/network-secret settings, restricted to `api.cloudflare.com`. Set `CLOUDFLARE_ACCOUNT_ID` separately. The token requires Workers Scripts Edit, D1 Edit and Account Settings Read for the target account. Never commit either a token or private signing material.

```
npm ci
npm run build:cloudflare
npm run deploy:cloudflare
```

Deployment creates/reuses `bangi-notifications` and `bangi-prayer-push`, provisions an account workers.dev subdomain if necessary, applies the idempotent schema, and configures the minute scheduler. It generates VAPID keys in memory and stores them and the scheduler secret only as encrypted Worker secrets. Redeployments preserve those secrets so existing browser subscriptions continue to work. The generated `public/push-config.json` contains only the public endpoint. Verify `/prayer-push/health` and `/prayer-push/config` before publishing the web build.

## Installation and privacy

On iPhone iOS 16.4+, open the website in Safari, Share → Add to Home Screen, then open the icon. In Prayer reminders enable global reminders and then background notifications. Grant permission and select Send a test notification. Close the app and check a scheduled reminder on a physical device.

Each opted-in installation generates a random 256-bit bearer credential stored only in browser localStorage; the server stores its SHA-256 digest as the installation identifier. No login is required. Never share the credential or subscription endpoint. Clearing website data loses that identity; disabling reminders before clearing data removes the server record. Only selected coordinates/location, prayer calculation settings, reminder preferences and push subscription are sent after opt-in. Themes and location history remain local. All installations share a deployment budget of 25 registrations; this is a small personal deployment rather than a public service with abuse protection. CORS restricts browser access, but does not prevent non-browser clients from registering; add Turnstile/rate limiting before expanding access.

The backend calculates the same prayer times as the app, queues at most 60 reminders per installation, replenishes the schedule and skips alerts more than two minutes late. A database claim prevents concurrent cron invocations from claiming the same pending job. Network acknowledgement failures can still cause retries; notification tags group duplicates. Settings synchronize on launch, resume and while online. Travel follows the last synced selected location until the app is reopened. Internet is required. Minute cron timing, free-plan CPU/request/database quotas, OS Focus/battery policies and push providers can delay or prevent delivery. Monitor Cloudflare logs and usage; no billing plan is upgraded by these scripts. Free-plan CPU limits may constrain schedule recalculation. iOS provides its own notification sound and does not support custom adhan audio or browser vibration.

## Validation

`npm test` includes SQLite-backed save/claim/reschedule/expiry/budget/deletion tests plus shared source, prayer and reminder tests. `npm run typecheck`, `npm run lint`, `npm run build:cloudflare`, `npm run build` and `npm run test:worker` verify code and generated service-worker behavior. A physical iPhone is required to verify permission prompts, app icon, sound, closed-app display and timely delivery. Deployment alone does not prove delivery.

For investigation, inspect Worker logs, Cron Triggers and D1 tables in the dashboard. Do not paste subscription endpoints, authorization headers, VAPID private keys or Cloudflare tokens into logs or issue reports. Revoke the temporary deployment token after setup; Worker secrets remain active independently.
