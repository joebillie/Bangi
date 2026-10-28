import { prayerLabel, type Language } from "../src/i18n";
import { defaults, validPlace, type Settings } from "../src/settings";
import { methods, prayers } from "../src/prayer";
import { planReminders } from "../src/reminders";
export type Preferences = Pick<
  Settings,
  "location" | "calculation" | "reminders"
> & { language?: Language };
export type Subscription = {
  endpoint: string;
  keys: { auth: string; p256dh: string };
  expirationTime?: number | null;
};
export type Job = {
  id: string;
  user_id: string;
  revision: string;
  due_at: string;
  title: string;
  body: string;
  sound: boolean;
  vibrate: boolean;
};
export type Stored = {
  user_id: string;
  revision: string;
  subscription: Subscription;
  preferences: Preferences;
  scheduled_until: string;
};
export interface Repository {
  save(
    user: string,
    subscription: Subscription,
    prefs: Preferences,
    jobs: Omit<Job, "user_id" | "revision">[],
    until: string,
  ): Promise<void>;
  remove(user: string): Promise<void>;
  get(user: string): Promise<Stored | null>;
  refillCandidates(before: string): Promise<Stored[]>;
  refill(
    record: Stored,
    jobs: Omit<Job, "user_id" | "revision">[],
    until: string,
  ): Promise<void>;
  claim(now: string): Promise<Job[]>;
  finish(job: Job, status: "sent" | "pending" | "skipped"): Promise<void>;
  allowTest(user: string): Promise<boolean>;
}
export type PushPayload = {
  title: string;
  body: string;
  tag: string;
  silent: boolean;
  vibrate?: number[];
};
export type Dependencies = {
  repo: Repository;
  authenticate: (token: string) => Promise<string | null>;
  send: (
    subscription: Subscription,
    payload: PushPayload,
    ttl: number,
  ) => Promise<void>;
  now: () => Date;
  cronSecret: string;
  publicKey: string;
  projectUrl: string;
  publishableKey: string;
  origin: string;
};
class Problem extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function validateSubscription(value: unknown): Subscription {
  const s = value as Subscription;
  try {
    const u = new URL(s.endpoint);
    const allowed =
      u.hostname === "web.push.apple.com" ||
      u.hostname.endsWith(".push.apple.com") ||
      u.hostname === "fcm.googleapis.com" ||
      u.hostname === "updates.push.services.mozilla.com" ||
      u.hostname.endsWith(".push.services.mozilla.com") ||
      u.hostname.endsWith(".notify.windows.com");
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      (u.port && u.port !== "443") ||
      !allowed ||
      s.endpoint.length > 4096
    )
      throw Error();
    const decode = (v: string) =>
      Uint8Array.from(atob(v.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
        c.charCodeAt(0),
      );
    if (
      !/^[A-Za-z0-9_-]+$/.test(s.keys.auth) ||
      !/^[A-Za-z0-9_-]+$/.test(s.keys.p256dh) ||
      decode(s.keys.auth).length !== 16 ||
      decode(s.keys.p256dh).length !== 65 ||
      decode(s.keys.p256dh)[0] !== 4
    )
      throw Error();
    return {
      endpoint: s.endpoint,
      keys: { auth: s.keys.auth, p256dh: s.keys.p256dh },
      expirationTime: s.expirationTime ?? null,
    };
  } catch {
    throw new Problem(400, "Invalid or unsupported browser push subscription.");
  }
}
export function validatePreferences(value: unknown): Preferences {
  const p = value as Preferences;
  if (
    !p ||
    !validPlace(p.location) ||
    !methods.includes(p.calculation?.method) ||
    typeof p.calculation.hanafi !== "boolean" ||
    !["middle", "seventh", "angle"].includes(p.calculation.highLatitude)
  )
    throw new Problem(
      400,
      "Select a valid prayer location and calculation method.",
    );
  for (const prayer of prayers) {
    for (const corrections of [
      p.calculation.adjustments,
      p.calculation.namaadhuAdjustments,
    ])
      if (
        corrections &&
        (!Number.isInteger(corrections[prayer]) ||
          Math.abs(corrections[prayer]) > 120)
      )
        throw new Problem(400, "Invalid prayer adjustment.");
    const r = p.reminders?.[prayer];
    if (
      !r ||
      typeof r.enabled !== "boolean" ||
      typeof r.sound !== "boolean" ||
      typeof r.vibrate !== "boolean" ||
      !Array.isArray(r.offsets) ||
      r.offsets.length > 4 ||
      r.offsets.some((n) => !Number.isInteger(n) || n < 0 || n > 180)
    )
      throw new Problem(400, "Invalid per-prayer reminder preferences.");
  }
  if (!p.calculation.adjustments)
    throw new Problem(400, "Prayer adjustments are missing.");
  return JSON.parse(
    JSON.stringify({
      location: p.location,
      calculation: p.calculation,
      reminders: p.reminders,
      language: ["en", "ar", "ms"].includes(p.language || "")
        ? p.language
        : "en",
    }),
  );
}
export function makeJobs(prefs: Preferences, now: Date) {
  const planned = planReminders(
    { ...defaults, ...prefs, notifications: true },
    now,
  );
  return {
    jobs: planned.map((item) => ({
      id: item.id,
      due_at: item.date.toISOString(),
      title: `${prayerLabel(item.prayer, prefs.language || "en")} · ${item.time}`,
      body:
        prefs.language === "ms"
          ? "Luangkan sejenak untuk berhenti, merenung dan bersolat."
          : prefs.language === "ar"
            ? "لحظة للتوقف والتأمل والصلاة."
            : "A moment to pause, reflect, and pray.",
      sound: item.sound,
      vibrate: item.vibrate,
    })),
    until: (
      planned.at(-1)?.date || new Date(+now + 8 * 86400000)
    ).toISOString(),
  };
}
async function secretEquals(a: string, b: string) {
  const digest = async (v: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    );
  const x = await digest(a),
    y = await digest(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0 && b.length >= 32;
}
async function limitedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Problem(400, "JSON body required.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 32768) {
      await reader.cancel();
      throw new Problem(413, "Request too large.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(all));
  } catch {
    throw new Problem(400, "Invalid JSON.");
  }
}
export function createHandler(d: Dependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": d.origin,
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      Vary: "Origin",
    };
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers });
    try {
      if (origin && origin !== d.origin)
        throw new Problem(403, "Origin not allowed.");
      if (request.method === "OPTIONS")
        return new Response(null, { status: 204, headers });
      const action = new URL(request.url).pathname
        .split("/")
        .filter(Boolean)
        .at(-1);
      if (action === "health" && request.method === "GET")
        return json(200, { ready: true });
      if (action === "config" && request.method === "GET")
        return json(200, {
          publicKey: d.publicKey,
          projectUrl: d.projectUrl,
          publishableKey: d.publishableKey,
        });
      if (action === "dispatch" && request.method === "POST") {
        if (
          !(await secretEquals(
            request.headers.get("x-bangi-cron-secret") || "",
            d.cronSecret,
          ))
        )
          throw new Problem(401, "Unauthorized scheduler.");
        const now = d.now();
        let refreshed = 0,
          sent = 0,
          failed = 0;
        for (const record of await d.repo.refillCandidates(
          new Date(+now + 2 * 86400000).toISOString(),
        )) {
          const next = makeJobs(record.preferences, now);
          await d.repo.refill(record, next.jobs, next.until);
          refreshed++;
        }
        const jobs = await d.repo.claim(now.toISOString());
        const sendOne = async (job: Job) => {
          const record = await d.repo.get(job.user_id);
          if (
            !record ||
            record.revision !== job.revision ||
            +d.now() - new Date(job.due_at).getTime() > 120000
          ) {
            await d.repo.finish(job, "skipped");
            return;
          }
          try {
            await d.send(
              record.subscription,
              {
                title: job.title,
                body: job.body,
                tag: job.id,
                silent: !job.sound,
                ...(job.vibrate ? { vibrate: [200, 100, 200] } : {}),
              },
              Math.max(
                1,
                Math.min(
                  60,
                  Math.ceil(
                    (new Date(job.due_at).getTime() + 120000 - +d.now()) / 1000,
                  ),
                ),
              ),
            );
            await d.repo.finish(job, "sent");
            sent++;
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410)
              await d.repo.remove(job.user_id);
            else await d.repo.finish(job, "pending");
            failed++;
          }
        };
        for (let i = 0; i < jobs.length; i += 5)
          await Promise.all(jobs.slice(i, i + 5).map(sendOne));
        return json(200, { refreshed, sent, failed });
      }
      const bearer = request.headers
        .get("authorization")
        ?.match(/^Bearer (.+)$/)?.[1];
      const user = bearer ? await d.authenticate(bearer) : null;
      if (!user)
        throw new Problem(
          401,
          "Sign in to this installation before configuring push.",
        );
      if (action === "subscription" && request.method === "GET") {
        const record = await d.repo.get(user);
        return json(200, {
          subscribed: !!record,
          scheduledUntil: record?.scheduled_until || null,
        });
      }
      if (action === "subscription" && request.method === "DELETE") {
        await d.repo.remove(user);
        return json(200, { subscribed: false });
      }
      if (action === "subscription" && request.method === "POST") {
        if (Number(request.headers.get("content-length") || 0) > 32768)
          throw new Problem(413, "Request too large.");
        const body = await limitedJson(request);
        const subscription = validateSubscription(body.subscription),
          preferences = validatePreferences(body.preferences);
        try {
          const key = Uint8Array.from(
            atob(
              subscription.keys.p256dh
                .replaceAll("-", "+")
                .replaceAll("_", "/"),
            ),
            (c) => c.charCodeAt(0),
          );
          await crypto.subtle.importKey(
            "raw",
            key,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            [],
          );
        } catch {
          throw new Problem(400, "Invalid browser encryption key.");
        }
        if (
          subscription.expirationTime &&
          subscription.expirationTime <= +d.now()
        )
          throw new Problem(400, "Push subscription has expired.");
        const next = makeJobs(preferences, d.now());
        await d.repo.save(
          user,
          subscription,
          preferences,
          next.jobs,
          next.until,
        );
        return json(200, {
          subscribed: true,
          scheduledUntil: next.until,
          queued: next.jobs.length,
        });
      }
      if (action === "test" && request.method === "POST") {
        const record = await d.repo.get(user);
        if (!record)
          throw new Problem(409, "Enable background notifications first.");
        if (!(await d.repo.allowTest(user)))
          throw new Problem(
            429,
            "Wait one minute before sending another test.",
          );
        await d.send(
          record.subscription,
          {
            title: "Bangi notifications are connected",
            body: "Prayer reminders can now arrive while Bangi is closed. Delivery still depends on your device and connection.",
            tag: "bangi:test",
            silent: false,
          },
          60,
        );
        return json(200, { sent: true });
      }
      throw new Problem(404, "Unknown notification operation.");
    } catch (error) {
      return error instanceof Problem
        ? json(error.status, { error: error.message })
        : json(503, {
            error:
              "The notification service is unavailable. Your last server schedule may still be active; retry when connected.",
          });
    }
  };
}
