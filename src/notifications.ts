import { assetUrl } from "./urls";
import { Settings } from "./settings";
import { planReminders, PlannedReminder } from "./reminders";
let timer: ReturnType<typeof setInterval> | undefined;
let audio: AudioContext | undefined;
const FIRED = "bangi:delivered:v1";
function audioContext() {
  if (typeof window === "undefined") return undefined;
  const Constructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Constructor) return undefined;
  return audio || (audio = new Constructor());
}
/** Called from the enable gesture: audio requires user activation in Safari. */
export async function notificationPermission() {
  try {
    await audioContext()?.resume();
  } catch {
    /* Visual reminders still work. */
  }
}
export async function requestBrowserPermission() {
  if (!window.isSecureContext)
    throw Error(
      "Browser alerts need HTTPS. In-app reminders remain available.",
    );
  if (!("Notification" in window))
    throw Error(
      "This browser does not support system alerts. Use in-app reminders or calendar export. On iPhone, try the Home Screen app.",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw Error(
      "Browser alerts are not allowed. In-app reminders and calendar export remain available.",
    );
}
async function deliver(item: PlannedReminder) {
  const title = `${item.prayer[0].toUpperCase() + item.prayer.slice(1)} · ${item.time}`;
  window.dispatchEvent(
    new CustomEvent("bangi:reminder", {
      detail: `${title} — A moment to pause, reflect, and pray.`,
    }),
  );
  if (item.sound) {
    try {
      const context = audioContext();
      if (context?.state === "running") {
        const oscillator = context.createOscillator(),
          gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = 528;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          context.currentTime + 1.2,
        );
        oscillator.start();
        oscillator.stop(context.currentTime + 1.2);
      }
    } catch {
      /* Audio may be disabled by the browser. */
    }
  }
  if (item.vibrate && "vibrate" in navigator)
    navigator.vibrate([200, 100, 200]);
  if ("Notification" in window && Notification.permission === "granted") {
    const options = {
      body: "A moment to pause, reflect, and pray.",
      tag: item.id,
      icon: assetUrl("icon-192.png"),
      silent: !item.sound,
    };
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration?.active)
        await registration.showNotification(title, options);
      else new Notification(title, options);
    } catch {
      /* Some Safari versions require Web Push; the in-app banner is still delivered. */
    }
  }
}
export function dueReminders(
  queue: PlannedReminder[],
  now: Date,
  delivered: Set<string>,
) {
  return queue.filter(
    (item) =>
      +item.date <= +now &&
      +now - +item.date <= 120000 &&
      !delivered.has(item.id),
  );
}
export async function syncNotifications(settings: Settings) {
  if (timer) clearInterval(timer);
  timer = undefined;
  if (
    !settings.notifications ||
    !settings.location ||
    typeof window === "undefined"
  )
    return;
  let queue = planReminders(settings);
  const fired = new Set<string>();
  try {
    for (const id of JSON.parse(localStorage.getItem(FIRED) || "[]"))
      if (typeof id === "string") fired.add(id);
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  const poll = async () => {
    if (document.visibilityState === "hidden") return;
    const execute = async () => {
      try {
        for (const id of JSON.parse(localStorage.getItem(FIRED) || "[]"))
          fired.add(id);
      } catch {}
      for (const item of dueReminders(queue, new Date(), fired)) {
        fired.add(item.id);
        try {
          localStorage.setItem(FIRED, JSON.stringify([...fired].slice(-300)));
        } catch {}
        await deliver(item);
      }
      const now = new Date();
      if (!queue.some((item) => item.date > now))
        queue = planReminders(settings, now);
    };
    if (navigator.locks)
      await navigator.locks.request(
        "bangi-reminder-delivery",
        { ifAvailable: true },
        (lock) => (lock ? execute() : Promise.resolve()),
      );
    else await execute();
  };
  timer = setInterval(() => {
    void poll().catch(() => {});
  }, 15000);
}
