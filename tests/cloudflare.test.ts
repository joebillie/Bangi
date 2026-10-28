import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { repository } from "../cloudflare/index";
import { defaults } from "../src/settings";
import { islandPlace } from "../src/maldives";
import { makeJobs } from "../backend/core";
function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("cloudflare/schema.sql", "utf8"));
  function prepare(sql: string) {
    let params: unknown[] = [];
    return {
      bind(...values: unknown[]) {
        params = values;
        return this;
      },
      async run() {
        return sqlite.prepare(sql).run(...(params as never[]));
      },
      async first<T>() {
        return (sqlite.prepare(sql).get(...(params as never[])) as T) || null;
      },
      async all<T>() {
        return {
          results: sqlite.prepare(sql).all(...(params as never[])) as T[],
        };
      },
    };
  }
  const db = {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      sqlite.exec("BEGIN");
      try {
        for (const s of statements) await s.run();
        sqlite.exec("COMMIT");
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { repo: repository(db), sqlite };
}
const prefs = {
  location: islandPlace(415),
  calculation: defaults.calculation,
  reminders: defaults.reminders,
};
const subscription = {
  endpoint: "https://web.push.apple.com/example",
  keys: { auth: "sample", p256dh: "sample" },
};
test("Cloudflare SQLite persists, atomically claims, reschedules and deletes reminder jobs", async () => {
  const { repo, sqlite } = setup();
  const now = new Date();
  const next = makeJobs(prefs, now);
  const job = { ...next.jobs[0], id: "due", due_at: now.toISOString() };
  await repo.save("user", subscription, prefs, [job], next.until);
  assert.deepEqual((await repo.get("user"))?.preferences, prefs);
  const claimed = await repo.claim(now.toISOString());
  assert.equal(claimed.length, 1);
  assert.equal((await repo.claim(now.toISOString())).length, 0);
  await repo.finish(claimed[0], "sent");
  await repo.save("user", subscription, prefs, [job], next.until);
  assert.equal((await repo.claim(now.toISOString())).length, 0);
  assert.equal(await repo.allowTest("user"), true);
  assert.equal(await repo.allowTest("user"), false);
  await repo.remove("user");
  assert.equal(await repo.get("user"), null);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM jobs").get()?.n, 0);
  sqlite.close();
});
test("Cloudflare caps installations and skips late reminders", async () => {
  const { repo, sqlite } = setup();
  const now = new Date();
  const next = makeJobs(prefs, now);
  for (let i = 0; i < 25; i++)
    await repo.save("user" + i, subscription, prefs, [], next.until);
  await assert.rejects(() =>
    repo.save("extra", subscription, prefs, [], next.until),
  );
  await repo.save(
    "user0",
    subscription,
    prefs,
    [{ ...next.jobs[0], due_at: new Date(+now - 180000).toISOString() }],
    next.until,
  );
  assert.equal((await repo.claim(now.toISOString())).length, 0);
  sqlite.close();
});
