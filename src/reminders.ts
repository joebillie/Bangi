import { DateTime } from "luxon";
import { Settings } from "./settings";
import { formatTime, localDay, Prayer, schedule } from "./prayer";
export type PlannedReminder = {
  id: string;
  prayer: Prayer;
  date: Date;
  time: string;
  sound: boolean;
  vibrate: boolean;
};
export function planReminders(
  s: Settings,
  now = new Date(),
): PlannedReminder[] {
  if (!s.notifications || !s.location) return [];
  const place = s.location;
  const result: PlannedReminder[] = [];
  for (let i = 0; i < 8; i++) {
    const day = DateTime.fromISO(localDay(place, now))
      .plus({ days: i })
      .toISODate()!;
    for (const entry of schedule(place, day, s.calculation)) {
      if (entry.name === "sunrise" || !Number.isFinite(entry.time.getTime()))
        continue;
      const r = s.reminders[entry.name];
      if (!r.enabled) continue;
      for (const offset of [...new Set(r.offsets)]) {
        const date = new Date(entry.time.getTime() - offset * 60000);
        if (date > now)
          result.push({
            id: `bangi:${day}:${entry.name}:${offset}`,
            prayer: entry.name,
            date,
            time: formatTime(entry.time, place.timezone),
            sound: r.sound,
            vibrate: r.vibrate,
          });
      }
    }
  }
  return result.sort((a, b) => +a.date - +b.date).slice(0, 60);
}
export interface ReminderAdapter {
  cancel(): Promise<void>;
  schedule(item: PlannedReminder): Promise<void>;
}
export async function reconcile(
  s: Settings,
  adapter: ReminderAdapter,
  now = new Date(),
) {
  await adapter.cancel();
  try {
    for (const item of planReminders(s, now)) await adapter.schedule(item);
  } catch (error) {
    await adapter.cancel();
    throw error;
  }
}
