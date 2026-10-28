// Public integration checks use a disposable installation and never send a push.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes, createECDH } from "node:crypto";
const config = JSON.parse(fs.readFileSync("public/push-config.json", "utf8"));
if (!config.enabled || !config.endpoint.includes(".workers.dev/"))
  process.exit(0);
const token = randomBytes(32).toString("hex");
async function request(action, method = "GET", body, auth = true) {
  const r = await fetch(config.endpoint + "/" + action, {
    method,
    headers: {
      Origin: "https://joebillie.github.io",
      ...(auth ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, value: await r.json() };
}
assert.equal((await request("health")).value.ready, true);
const publicConfig = await request("config");
assert.equal(publicConfig.status, 200);
assert.ok(publicConfig.value.publicKey.length > 80);
assert.equal(
  (await request("subscription", "GET", undefined, false)).status,
  401,
);
assert.equal((await request("dispatch", "POST")).status, 401);
const preferences = {
  location: {
    id: "test",
    name: "Malé",
    country: "Maldives",
    region: "Malé",
    latitude: 4.1755,
    longitude: 73.5093,
    timezone: "Indian/Maldives",
  },
  calculation: {
    method: "MuslimWorldLeague",
    hanafi: false,
    highLatitude: "middle",
    adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  },
  reminders: Object.fromEntries(
    ["fajr", "dhuhr", "asr", "maghrib", "isha"].map((p) => [
      p,
      { enabled: false, sound: false, vibrate: false, offsets: [0] },
    ]),
  ),
};
const subscription = {
  endpoint: "https://web.push.apple.com/bangi-verification-no-delivery",
  keys: {
    auth: randomBytes(16).toString("base64url"),
    p256dh: createECDH("prime256v1").generateKeys().toString("base64url"),
  },
};
try {
  const saved = await request("subscription", "POST", {
    subscription,
    preferences,
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.value));
  assert.equal(saved.value.queued, 0);
  assert.equal((await request("subscription")).value.subscribed, true);
  console.log(
    "Hosted Cloudflare health, public config, authentication and D1 registration checks passed.",
  );
} finally {
  assert.equal((await request("subscription", "DELETE")).status, 200);
  assert.equal((await request("subscription")).value.subscribed, false);
}
