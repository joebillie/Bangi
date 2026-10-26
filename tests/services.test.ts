import { test } from "node:test";
import assert from "node:assert/strict";
import {
  startHeadingSession,
  smoothHeading,
  HeadingReading,
} from "../src/heading-session";
import { PreferencesRepository, SETTINGS_KEY } from "../src/persistence";
import { defaults } from "../src/settings";
import { findOfflineCities } from "../src/cities";
const tick = () => new Promise((r) => setImmediate(r));
test("sensor session delivers headings and ignores readings after cleanup", async () => {
  let callback: (v: HeadingReading) => void = () => {};
  let removed = 0;
  const readings: number[] = [];
  const stop = startHeadingSession(
    {
      available: async () => true,
      permission: async () => true,
      watch: async (cb) => {
        callback = cb;
        return { remove: () => removed++ };
      },
    },
    (v) => readings.push(v.trueHeading),
    () => assert.fail("unexpected error"),
  );
  await tick();
  callback({ trueHeading: 5, accuracy: 3 });
  stop();
  callback({ trueHeading: 10, accuracy: 3 });
  assert.deepEqual(readings, [5]);
  assert.equal(removed, 1);
  assert.equal(smoothHeading(355, 5), 357.5);
});
test("sensor registration finishing after disposal is removed", async () => {
  let resolve!: (value: { remove: () => void }) => void;
  let removed = 0;
  const stop = startHeadingSession(
    {
      available: async () => true,
      permission: async () => true,
      watch: () =>
        new Promise((r) => {
          resolve = r;
        }),
    },
    () => {},
    () => {},
  );
  await tick();
  stop();
  resolve({ remove: () => removed++ });
  await tick();
  assert.equal(removed, 1);
});
test("denied permissions and missing sensors produce useful fallbacks", async () => {
  for (const sensor of [true, false]) {
    let error = "";
    let watched = false;
    const stop = startHeadingSession(
      {
        available: async () => sensor,
        permission: async () => false,
        watch: async () => {
          watched = true;
          return { remove() {} };
        },
      },
      () => {},
      (e) => (error = e),
    );
    await tick();
    assert.match(error, sensor ? /denied/ : /magnetometer/);
    assert.equal(watched, false);
    stop();
  }
});
test("settings repository serializes writes and restores all preferences", async () => {
  const memory = new Map<string, string>();
  const repo = new PreferencesRepository({
    getItem: async (k) => memory.get(k) || null,
    setItem: async (k, v) => {
      memory.set(k, v);
    },
  });
  const first = { ...defaults, textSize: "Small" as const };
  const second = { ...defaults, textSize: "Large" as const };
  await Promise.all([repo.save(first), repo.save(second)]);
  assert.equal((await repo.load()).textSize, "Large");
  assert.ok(memory.has(SETTINGS_KEY));
});
test("storage failure is surfaced and subsequent saves recover", async () => {
  let fail = true;
  let value: string | null = null;
  const repo = new PreferencesRepository({
    getItem: async () => value,
    setItem: async (_k, v) => {
      if (fail) throw Error("disk full");
      value = v;
    },
  });
  await assert.rejects(() => repo.save(defaults), /disk full/);
  fail = false;
  await repo.save(defaults);
  assert.deepEqual(await repo.load(), defaults);
});
test("offline city search supports country and region queries", () => {
  assert.equal(findOfflineCities("Japan")[0].name, "Tokyo");
  assert.equal(
    findOfflineCities("New York United States")[0].timezone,
    "America/New_York",
  );
});

test("browser headings require an absolute reference and apply magnetic declination", async () => {
  const { browserHeading } = await import("../src/browser-heading");
  const flat = { alpha: 355, beta: 0, gamma: 0, absolute: true };
  assert.equal(browserHeading(flat, 10)!.heading, 15);
  assert.equal(browserHeading({ ...flat, absolute: false }, 10), null);
  assert.equal(browserHeading({ ...flat, beta: 80 }, 10), null);
  assert.deepEqual(
    browserHeading(
      { ...flat, webkitCompassHeading: 355, webkitCompassAccuracy: 5 },
      10,
    ),
    { heading: 5, reliable: true },
  );
});
test("calendar exports actual absolute times and independent prayer alarms", async () => {
  const { calendarExport } = await import("../src/calendar");
  const s = structuredClone({
    ...defaults,
    location: findOfflineCities("London")[0],
  });
  s.reminders.fajr.offsets = [0, 10];
  s.reminders.isha.enabled = false;
  const text = calendarExport(s, new Date("2026-03-20T00:00:00Z"), 1);
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 5);
  assert.match(text, /TRIGGER:-PT10M/);
  assert.match(text, /DTSTART:\d{8}T\d{6}Z/);
  const isha = text
    .split("BEGIN:VEVENT")
    .find((v) => v.includes("SUMMARY:Isha"))!;
  assert.ok(!isha.includes("VALARM"));
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
  assert.throws(() => calendarExport(defaults), /Select a location/);
});
test("foreground reminder window skips stale or already delivered alerts", async () => {
  const { dueReminders } = await import("../src/notifications");
  const now = new Date("2026-01-01T12:00:00Z");
  const item = {
    id: "a",
    prayer: "fajr" as const,
    date: new Date(+now - 60000),
    time: "12:00",
    sound: true,
    vibrate: false,
  };
  assert.equal(dueReminders([item], now, new Set()).length, 1);
  assert.equal(dueReminders([item], now, new Set(["a"])).length, 0);
  assert.equal(
    dueReminders([{ ...item, date: new Date(+now - 180000) }], now, new Set())
      .length,
    0,
  );
});
