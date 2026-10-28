import type { Settings } from "./settings";
import { assetUrl } from "./urls";
import type { SupabaseClient } from "@supabase/supabase-js";
type Config = {
  endpoint: string;
  publicKey: string;
  projectUrl: string;
  publishableKey: string;
};
let client: SupabaseClient | undefined, config: Config | undefined;
let serial = Promise.resolve();
const ENABLED = "bangi:background-push:v1";
const PENDING_DELETE = "bangi:background-push-delete:v1";
let latestSettings: Settings | undefined;
export const backgroundPushEnabled = () => {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage.getItem(ENABLED) === "true"
    );
  } catch {
    return false;
  }
};
export const loadBackgroundPushConfig = () => configuration();
async function configuration() {
  if (config) return config;
  const response = await fetch(assetUrl("push-config.json"), {
    cache: "no-store",
  });
  const value = await response.json();
  if (!value.enabled || !value.endpoint)
    throw Error("Background notifications are not connected to a backend yet.");
  const url = new URL(value.endpoint);
  if (
    url.protocol !== "https:" ||
    !(
      (url.hostname.endsWith(".supabase.co") &&
        url.pathname === "/functions/v1/prayer-push") ||
      (url.hostname.endsWith(".workers.dev") && url.pathname === "/prayer-push")
    )
  )
    throw Error("Invalid background notification service configuration.");
  const details = await fetch(url + "/config", { cache: "no-store" });
  if (!details.ok)
    throw Error(
      "The notification backend is unavailable. It may be paused; foreground reminders still work.",
    );
  config = { endpoint: url.toString(), ...(await details.json()) };
  return config!;
}
async function connection() {
  const c = await configuration();
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(c.projectUrl, c.publishableKey, {
      auth: {
        storageKey: "bangi:push-auth:v1",
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return { c, client };
}
async function session() {
  const c = await configuration();
  if (new URL(c.endpoint).hostname.endsWith(".workers.dev")) {
    const key = "bangi:cloudflare-installation:v1";
    let token = localStorage.getItem(key);
    if (!token) {
      token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      localStorage.setItem(key, token);
    }
    return { c, token };
  }
  const { client } = await connection();
  let {
    data: { session },
    error,
  } = await client.auth.getSession();
  if (error)
    throw Error("Could not restore this installation’s notification session.");
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error || !result.data.session)
      throw Error(
        "Notification registration is unavailable. Please retry later.",
      );
    session = result.data.session;
  }
  return { c, token: session.access_token };
}
async function api(action: string, method = "GET", body?: unknown) {
  const { c, token } = await session();
  let response: Response;
  try {
    response = await fetch(c.endpoint + "/" + action, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Error(
      "Could not reach the notification server. The previous schedule may remain active until synchronization succeeds.",
    );
  }
  const value = await response.json();
  if (!response.ok)
    throw Error(
      value.error ||
        "Notification settings could not be synchronized. The previous server schedule may remain active.",
    );
  return value;
}
const preferences = (s: Settings) => ({
  location: s.location,
  calculation: s.calculation,
  reminders: s.reminders,
  language: s.language,
});
function decode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
}
export async function enableBackgroundPush(s: Settings) {
  try {
    localStorage.setItem("bangi:storage-check", "1");
    localStorage.removeItem("bangi:storage-check");
  } catch {
    throw Error(
      "Persistent storage is required for background notifications. Exit private browsing and try again.",
    );
  }
  if (!s.location || !s.notifications)
    throw Error("Select a location and enable prayer reminders first.");
  if (
    !window.isSecureContext ||
    !("PushManager" in window) ||
    !("serviceWorker" in navigator) ||
    !("Notification" in window)
  )
    throw Error(
      "Use the installed Home Screen app on iOS 16.4+ or a browser with Web Push support.",
    );
  if (
    Notification.permission !== "granted" &&
    (await Notification.requestPermission()) !== "granted"
  )
    throw Error(
      "Allow notifications in this Home Screen app to receive background reminders.",
    );
  const c = await configuration();
  if (localStorage.getItem(PENDING_DELETE) === "true") await disableNow();
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            Error(
              "Offline app setup is not ready. Reload Bangi online, then try again.",
            ),
          ),
        12000,
      ),
    ),
  ]);
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription)
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decode(c.publicKey),
    });
  try {
    const result = await api("subscription", "POST", {
      subscription: subscription.toJSON(),
      preferences: preferences(s),
    });
    if (latestSettings && !latestSettings.notifications) {
      await api("subscription", "DELETE");
      await subscription.unsubscribe();
      throw Error(
        "Prayer reminders were disabled before background setup completed.",
      );
    }
    localStorage.setItem(ENABLED, "true");
    return result;
  } catch (error) {
    if (!backgroundPushEnabled())
      await subscription.unsubscribe().catch(() => {});
    throw error;
  }
}
async function disableNow() {
  localStorage.removeItem(ENABLED);
  localStorage.setItem(PENDING_DELETE, "true");
  let error: unknown;
  try {
    await api("subscription", "DELETE");
    localStorage.removeItem(PENDING_DELETE);
  } catch (e) {
    error = e;
  }
  const registration = await navigator.serviceWorker?.getRegistration();
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
  if (error) throw error;
}
export function syncBackgroundPush(s: Settings) {
  latestSettings = s;
  const work = async () => {
    if (localStorage.getItem(PENDING_DELETE) === "true") {
      await disableNow();
      return;
    }
    if (!backgroundPushEnabled()) return;
    if (!s.notifications) {
      await disableNow();
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) {
      localStorage.removeItem(ENABLED);
      throw Error(
        "Background notification subscription expired. Enable it again in Prayer reminders.",
      );
    }
    await api("subscription", "POST", {
      subscription: subscription.toJSON(),
      preferences: preferences(s),
    });
  };
  const result = serial.then(work, work);
  serial = result.catch(() => {});
  return result;
}
export const testBackgroundPush = () => api("test", "POST");
export const backgroundPushStatus = () => api("subscription");

export function disableBackgroundPush() {
  localStorage.removeItem(ENABLED);
  const result = serial.then(disableNow, disableNow);
  serial = result.catch(() => {});
  return result;
}
