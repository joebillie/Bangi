import webPush from "web-push";
import {
  createHandler,
  type Repository,
  type Stored,
  type Job,
} from "../backend/core";
interface Statement {
  bind(...values: unknown[]): Statement;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}
interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}
interface Env {
  DB: Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  CRON_SECRET: string;
  APP_ORIGIN: string;
}
function repository(db: Database): Repository {
  const q = (sql: string, ...values: unknown[]) =>
    db.prepare(sql).bind(...values);
  const parse = (r: Stored | null): Stored | null =>
    r
      ? {
          ...r,
          subscription: JSON.parse(r.subscription as unknown as string),
          preferences: JSON.parse(r.preferences as unknown as string),
        }
      : null;
  const insert = (
    user: string,
    revision: string,
    jobs: Omit<Job, "user_id" | "revision">[],
  ) =>
    jobs.map((j) =>
      q(
        `INSERT OR IGNORE INTO jobs(user_id,id,revision,due_at,title,body,sound,vibrate)
  SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM subscriptions WHERE user_id=? AND revision=?)`,
        user,
        j.id,
        revision,
        j.due_at,
        j.title,
        j.body,
        +j.sound,
        +j.vibrate,
        user,
        revision,
      ),
    );
  return {
    async save(user, subscription, preferences, jobs, until) {
      const revision = crypto.randomUUID();
      await db.batch([
        q(
          `INSERT INTO subscriptions(user_id,revision,subscription,preferences,scheduled_until)
     SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM subscriptions)<25 OR EXISTS(SELECT 1 FROM subscriptions WHERE user_id=?)
     ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,subscription=excluded.subscription,
     preferences=excluded.preferences,scheduled_until=excluded.scheduled_until`,
          user,
          revision,
          JSON.stringify(subscription),
          JSON.stringify(preferences),
          until,
          user,
        ),
        q("DELETE FROM jobs WHERE user_id=? AND status!='sent'", user),
        ...insert(user, revision, jobs),
      ]);
      if (
        !(await q(
          "SELECT user_id FROM subscriptions WHERE user_id=?",
          user,
        ).first())
      )
        throw Error("Installation limit reached");
    },
    async get(user) {
      return parse(
        await q(
          "SELECT * FROM subscriptions WHERE user_id=?",
          user,
        ).first<Stored>(),
      );
    },
    async remove(user) {
      await db.batch([
        q("DELETE FROM jobs WHERE user_id=?", user),
        q("DELETE FROM subscriptions WHERE user_id=?", user),
      ]);
    },
    async refillCandidates(before) {
      return (
        await q(
          "SELECT * FROM subscriptions WHERE scheduled_until<? LIMIT 5",
          before,
        ).all<Stored>()
      ).results.map((r) => parse(r)!);
    },
    async refill(record, jobs, until) {
      await db.batch([
        q(
          "DELETE FROM jobs WHERE user_id=? AND revision=? AND status IN ('pending','skipped')",
          record.user_id,
          record.revision,
        ),
        q(
          "UPDATE subscriptions SET scheduled_until=? WHERE user_id=? AND revision=?",
          until,
          record.user_id,
          record.revision,
        ),
        ...insert(record.user_id, record.revision, jobs),
      ]);
    },
    async claim(now) {
      await db.batch([
        q(
          "DELETE FROM jobs WHERE due_at<?",
          new Date(+new Date(now) - 7 * 86400000).toISOString(),
        ),
        q(
          "UPDATE jobs SET status='pending' WHERE status='sending' AND lease<?",
          new Date(+new Date(now) - 90000).toISOString(),
        ),
        q(
          "UPDATE jobs SET status='skipped' WHERE status='pending' AND due_at<?",
          new Date(+new Date(now) - 120000).toISOString(),
        ),
      ]);
      return (
        await q(
          `UPDATE jobs SET status='sending',lease=? WHERE (user_id,id) IN
    (SELECT user_id,id FROM jobs WHERE status='pending' AND due_at<=? ORDER BY due_at LIMIT 25) RETURNING *`,
          now,
          now,
        ).all<Job>()
      ).results;
    },
    async finish(job, status) {
      await q(
        "UPDATE jobs SET status=? WHERE user_id=? AND id=? AND revision=?",
        status,
        job.user_id,
        job.id,
        job.revision,
      ).run();
    },
    async allowTest(user) {
      return !!(await q(
        "UPDATE subscriptions SET last_test=? WHERE user_id=? AND (last_test IS NULL OR last_test<?) RETURNING user_id",
        new Date().toISOString(),
        user,
        new Date(Date.now() - 60000).toISOString(),
      ).first());
    },
  };
}
export { repository };
function handler(env: Env) {
  return createHandler({
    repo: repository(env.DB),
    now: () => new Date(),
    cronSecret: env.CRON_SECRET,
    publicKey: env.VAPID_PUBLIC_KEY,
    projectUrl: "",
    publishableKey: "",
    origin: env.APP_ORIGIN,
    authenticate: async (token) => {
      if (!/^[a-f0-9]{64}$/.test(token)) return null;
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token),
      );
      return Array.from(new Uint8Array(hash), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    },
    send: async (subscription, payload, ttl) => {
      const details = webPush.generateRequestDetails(
        subscription,
        JSON.stringify(payload),
        {
          TTL: ttl,
          urgency: "high",
          vapidDetails: {
            subject: "https://joebillie.github.io/Bangi/",
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY,
          },
        },
      );
      const response = await fetch(details.endpoint, {
        method: "POST",
        headers: details.headers,
        body: new Uint8Array(details.body!),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw Object.assign(Error("Push provider rejected delivery"), {
          statusCode: response.status,
        });
    },
  });
}
export default {
  fetch(request: Request, env: Env) {
    return handler(env)(request);
  },
  async scheduled(_event: unknown, env: Env) {
    const result = await handler(env)(
      new Request("https://internal/dispatch", {
        method: "POST",
        headers: { "x-bangi-cron-secret": env.CRON_SECRET },
      }),
    );
    if (!result.ok) throw Error("Prayer notification dispatch failed");
  },
};
