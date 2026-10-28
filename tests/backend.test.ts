import { createECDH } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  createHandler,
  makeJobs,
  validateSubscription,
  validatePreferences,
  type Repository,
  type Dependencies,
  type Stored,
  type Job,
} from "../backend/core";
import { defaults } from "../src/settings";
import { islandPlace } from "../src/maldives";
const user = "11111111-1111-4111-8111-111111111111";
const prefs = {
  location: islandPlace(415),
  calculation: { ...defaults.calculation, method: "NamaadhuVaguthu" as const },
  reminders: defaults.reminders,
};
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const subscription = {
  endpoint: "https://web.push.apple.com/example",
  keys: {
    auth: b64(new Uint8Array(16)),
    p256dh: b64(createECDH("prime256v1").generateKeys()),
  },
};
function harness() {
  let stored: Stored | null = null;
  let queued: Job[] = [];
  let sent = 0;
  let finished: string[] = [];
  const repo: Repository = {
    save: async (id, sub, preferences, jobs, until) => {
      stored = {
        user_id: id,
        revision: "revision",
        subscription: sub,
        preferences,
        scheduled_until: until,
      };
      queued = jobs.map((j) => ({ ...j, user_id: id, revision: "revision" }));
    },
    remove: async () => {
      stored = null;
      queued = [];
    },
    get: async () => stored,
    refillCandidates: async () => [],
    refill: async () => {},
    claim: async () => queued.filter((j) => new Date(j.due_at) <= now),
    finish: async (_job, status) => {
      finished.push(status);
    },
    allowTest: async () => true,
  };
  const now = new Date("2026-10-26T23:35:00Z");
  const d: Dependencies = {
    repo,
    now: () => now,
    authenticate: async (token) => (token === "valid" ? user : null),
    send: async () => {
      sent++;
    },
    cronSecret: "c".repeat(40),
    publicKey: "public-key",
    projectUrl: "https://project.supabase.co",
    publishableKey: "public-anon-key",
    origin: "https://joebillie.github.io",
  };
  return {
    d,
    get stored() {
      return stored;
    },
    set stored(value) {
      stored = value;
    },
    get queued() {
      return queued;
    },
    get sent() {
      return sent;
    },
    finished,
  };
}
const req = (
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) =>
  new Request("https://project.supabase.co/functions/v1/prayer-push/" + path, {
    method,
    headers: { Authorization: "Bearer valid", ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
test("push registration validates endpoint and key material to prevent SSRF", () => {
  assert.equal(
    validateSubscription(subscription).endpoint,
    subscription.endpoint,
  );
  for (const endpoint of [
    "http://web.push.apple.com/a",
    "https://127.0.0.1/a",
    "https://web.push.apple.com.attacker.example/a",
    "https://user:pass@web.push.apple.com/a",
  ])
    assert.throws(() => validateSubscription({ ...subscription, endpoint }));
  assert.throws(() =>
    validateSubscription({
      ...subscription,
      keys: { auth: "bad", p256dh: "bad" },
    }),
  );
});
test("backend schedules exactly the same source and reminder offsets as the app", () => {
  const now = new Date("2026-10-26T23:00:00Z");
  const next = makeJobs(prefs, now);
  assert.equal(next.jobs[0].title, "Fajr · 04:36");
  assert.equal(next.jobs[0].due_at, "2026-10-26T23:36:00.000Z");
  assert.ok(next.jobs.length <= 60);
  assert.throws(() =>
    validatePreferences({
      ...prefs,
      calculation: {
        ...prefs.calculation,
        adjustments: { ...prefs.calculation.adjustments, fajr: 999 },
      },
    }),
  );
});
test("only authenticated installation JWTs can register and delete subscriptions", async () => {
  const h = harness(),
    handler = createHandler(h.d);
  assert.equal(
    (
      await handler(
        req(
          "subscription",
          "POST",
          { subscription, preferences: prefs },
          { Authorization: "Bearer forged" },
        ),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handler(
        req("subscription", "POST", { subscription, preferences: prefs }),
      )
    ).status,
    200,
  );
  assert.equal(h.stored?.user_id, user);
  assert.equal((await handler(req("subscription", "DELETE"))).status, 200);
  assert.equal(h.stored, null);
});
test("browser origin restriction and scheduler secret are independent of user JWT", async () => {
  const h = harness(),
    handler = createHandler(h.d);
  assert.equal(
    (
      await handler(
        req("subscription", "GET", undefined, {
          Origin: "https://attacker.example",
        }),
      )
    ).status,
    403,
  );
  assert.equal((await handler(req("dispatch", "POST"))).status, 401);
  assert.equal(
    (
      await handler(
        req("dispatch", "POST", undefined, { "x-bangi-cron-secret": "wrong" }),
      )
    ).status,
    401,
  );
  assert.equal((await handler(req("config"))).status, 200);
});
test("revoked provider subscriptions are removed", async () => {
  const h = harness(),
    handler = createHandler(h.d);
  await handler(
    req("subscription", "POST", { subscription, preferences: prefs }),
  );
  h.d.now().setTime(Date.parse("2026-10-26T23:36:00Z"));
  h.d.send = async () => {
    throw { statusCode: 410 };
  };
  const result = await handler(
    req("dispatch", "POST", undefined, {
      "x-bangi-cron-secret": h.d.cronSecret,
    }),
  );
  assert.equal(result.status, 200);
  assert.equal(h.stored, null);
});
test("provider failures retry without reporting a successful send", async () => {
  const h = harness(),
    handler = createHandler(h.d);
  await handler(
    req("subscription", "POST", { subscription, preferences: prefs }),
  );
  h.d.now().setTime(Date.parse("2026-10-26T23:36:00Z"));
  h.d.send = async () => {
    throw { statusCode: 503 };
  };
  const response = await handler(
    req("dispatch", "POST", undefined, {
      "x-bangi-cron-secret": h.d.cronSecret,
    }),
  );
  assert.equal((await response.json()).failed, 1);
  assert.deepEqual(h.finished, ["pending"]);
});
test("a stale claimed generation is skipped before push delivery", async () => {
  const h = harness(),
    handler = createHandler(h.d);
  await handler(
    req("subscription", "POST", { subscription, preferences: prefs }),
  );
  h.d.now().setTime(Date.parse("2026-10-26T23:36:00Z"));
  h.stored = { ...h.stored!, revision: "new-preferences" };
  await handler(
    req("dispatch", "POST", undefined, {
      "x-bangi-cron-secret": h.d.cronSecret,
    }),
  );
  assert.equal(h.sent, 0);
  assert.deepEqual(h.finished, ["skipped"]);
});
test("authenticated oversized bodies are rejected before storage", async () => {
  const h = harness(),
    handler = createHandler(h.d);
  const response = await handler(
    new Request(
      "https://project.supabase.co/functions/v1/prayer-push/subscription",
      {
        method: "POST",
        headers: { Authorization: "Bearer valid" },
        body: "a".repeat(32769),
      },
    ),
  );
  assert.equal(response.status, 413);
  assert.equal(h.stored, null);
});
test("private PostgreSQL queue replaces pending jobs atomically, claims once and preserves sent IDs", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls;",
    );
    await db.exec(
      await readFile("supabase/migrations/202610270001_bangi_push.sql", "utf8"),
    );
    await db.query("insert into auth.users(id) values($1)", [user]);
    const now = "2026-10-26T23:36:00Z";
    const first = {
      id: "bangi:2026-10-27:fajr:0",
      due_at: now,
      title: "Fajr",
      body: "Prayer time",
      sound: true,
      vibrate: false,
    };
    const save = async (jobs: unknown[]) =>
      db.query("select public.bangi_push_save($1,$2,$3,$4,$5)", [
        user,
        JSON.stringify(subscription),
        JSON.stringify(prefs),
        JSON.stringify(jobs),
        "2026-11-01T00:00Z",
      ]);
    await save([first]);
    const before = await db.query<{ revision: string }>(
      "select revision from public.bangi_push_subscriptions",
    );
    await assert.rejects(() => save([{ ...first, due_at: "not-a-timestamp" }]));
    assert.equal(
      (
        await db.query<{ revision: string }>(
          "select revision from public.bangi_push_subscriptions",
        )
      ).rows[0].revision,
      before.rows[0].revision,
    );
    assert.equal(
      (await db.query("select * from public.bangi_push_jobs")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select public.bangi_push_test_allowed($1) as allowed",
          [user],
        )
      ).rows[0].allowed,
      true,
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select public.bangi_push_test_allowed($1) as allowed",
          [user],
        )
      ).rows[0].allowed,
      false,
    );
    const one = await db.query("select * from public.bangi_push_claim($1)", [
      now,
    ]);
    assert.equal(one.rows.length, 1);
    assert.equal(
      (await db.query("select * from public.bangi_push_claim($1)", [now])).rows
        .length,
      0,
    );
    await db.query("update public.bangi_push_jobs set status='sent'");
    await save([
      first,
      { ...first, id: "next", due_at: "2026-10-27T06:54:00Z" },
    ]);
    const rows = await db.query<{ id: string; status: string }>(
      "select id,status from public.bangi_push_jobs order by id",
    );
    assert.equal(rows.rows.find((r) => r.id === first.id)?.status, "sent");
    assert.equal(rows.rows.find((r) => r.id === "next")?.status, "pending");
    const privileges = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('authenticated','public.bangi_push_claim(timestamptz)','execute') as allowed",
    );
    assert.equal(privileges.rows[0].allowed, false);
    await db.query(
      "delete from public.bangi_push_subscriptions where user_id=$1",
      [user],
    );
    assert.equal(
      (await db.query("select * from public.bangi_push_jobs")).rows.length,
      0,
    );
    await db.exec(
      "insert into auth.users(id) select gen_random_uuid() from generate_series(1,25); insert into public.bangi_push_subscriptions(user_id,subscription,preferences,scheduled_until) select id,'{}'::jsonb,'{}'::jsonb,now() from auth.users where id<>'11111111-1111-4111-8111-111111111111';",
    );
    await assert.rejects(() => save([]), /Installation limit reached/);
    assert.equal(
      (await db.query("select * from public.bangi_push_subscriptions")).rows
        .length,
      25,
    );
  } finally {
    await db.close();
  }
});
