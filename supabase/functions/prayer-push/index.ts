import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";
import {
  createHandler,
  type Repository,
  type Stored,
  type Job,
} from "../../../backend/core";
const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw Error(`Missing ${name}`);
  return value;
};
const admin = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
async function result<T>(
  query: PromiseLike<{ data: T; error: unknown }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) throw Error("Notification database operation failed.");
  return data;
}
const repo: Repository = {
  save: async (user, subscription, preferences, jobs, until) => {
    await result(
      admin.rpc("bangi_push_save", {
        p_user: user,
        p_subscription: subscription,
        p_preferences: preferences,
        p_jobs: jobs,
        p_until: until,
      }),
    );
  },
  remove: async (user) => {
    await result(
      admin.from("bangi_push_subscriptions").delete().eq("user_id", user),
    );
  },
  get: async (user) =>
    (await result(
      admin
        .from("bangi_push_subscriptions")
        .select("*")
        .eq("user_id", user)
        .maybeSingle(),
    )) as Stored | null,
  refillCandidates: async (before) =>
    (await result(
      admin
        .from("bangi_push_subscriptions")
        .select("*")
        .lt("scheduled_until", before)
        .order("scheduled_until")
        .limit(5),
    )) as Stored[],
  refill: async (record, jobs, until) => {
    await result(
      admin.rpc("bangi_push_refill", {
        p_user: record.user_id,
        p_revision: record.revision,
        p_jobs: jobs,
        p_until: until,
      }),
    );
  },
  claim: async (now) =>
    (await result(admin.rpc("bangi_push_claim", { p_now: now }))) as Job[],
  finish: async (job, status) => {
    await result(
      admin
        .from("bangi_push_jobs")
        .update({ status, locked_at: null })
        .eq("user_id", job.user_id)
        .eq("id", job.id)
        .eq("revision", job.revision),
    );
  },
  allowTest: async (user) =>
    Boolean(
      await result(admin.rpc("bangi_push_test_allowed", { p_user: user })),
    ),
};
webPush.setVapidDetails(
  required("BANGI_VAPID_SUBJECT"),
  required("BANGI_VAPID_PUBLIC_KEY"),
  required("BANGI_VAPID_PRIVATE_KEY"),
);
Deno.serve(
  createHandler({
    repo,
    now: () => new Date(),
    cronSecret: required("BANGI_CRON_SECRET"),
    publicKey: required("BANGI_VAPID_PUBLIC_KEY"),
    projectUrl: required("SUPABASE_URL"),
    publishableKey: required("SUPABASE_ANON_KEY"),
    origin: required("BANGI_APP_ORIGIN"),
    authenticate: async (token) => {
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : data.user?.id || null;
    },
    send: async (subscription, payload, ttl) => {
      await webPush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: ttl,
        urgency: "high",
        timeout: 10000,
      });
    },
  }),
);
