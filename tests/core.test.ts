import { test } from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import {
  bearing,
  formatTime,
  localDay,
  nextPrayer,
  relativeBearing,
  schedule,
  Place,
} from "../src/prayer";
import { defaults, parsePalette, restore } from "../src/settings";
import { contrast, emerald, sand, textScale, validColor } from "../src/theme";
import { planReminders, reconcile } from "../src/reminders";
const london: Place = {
  name: "London",
  region: "England",
  country: "UK",
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: "Europe/London",
};
const ny: Place = {
  name: "New York",
  region: "NY",
  country: "USA",
  latitude: 40.7128,
  longitude: -74.006,
  timezone: "America/New_York",
};
const tokyo: Place = {
  name: "Tokyo",
  region: "Tokyo",
  country: "Japan",
  latitude: 35.6762,
  longitude: 139.6503,
  timezone: "Asia/Tokyo",
};
const calc = defaults.calculation;
test("London reference schedule is plausible and ordered", () => {
  const t = schedule(london, "2026-03-20", calc);
  assert.equal(t.length, 6);
  assert.deepEqual(
    t.map((p) => p.name),
    ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"],
  );
  const noon = t.find((p) => p.name === "dhuhr")!;
  assert.ok(
    Math.abs(
      DateTime.fromJSDate(noon.time).setZone(london.timezone).hour - 12,
    ) <= 1,
  );
  assert.ok(
    Math.abs(+t[1].time - +new Date("2026-03-20T06:04:00Z")) < 10 * 60000,
  );
});
test("switching country changes prayer times and Qibla", () => {
  assert.notDeepEqual(
    schedule(ny, "2026-05-01", calc),
    schedule(tokyo, "2026-05-01", calc),
  );
  assert.ok(Math.abs(bearing(ny) - 58.48) < 0.2);
  assert.ok(Math.abs(bearing(london) - 118.99) < 0.2);
  assert.ok(Math.abs(bearing(tokyo) - 293) < 2);
});
test("dates follow destination, not host timezone", () => {
  const now = new Date("2026-01-01T01:00:00Z");
  assert.equal(localDay(ny, now), "2025-12-31");
  assert.equal(localDay(tokyo, now), "2026-01-01");
  assert.equal(formatTime(now, ny.timezone), "20:00");
});
test("DST changes local clock while astronomical UTC noon stays stable", () => {
  const before = schedule(ny, "2026-03-07", calc).find(
    (p) => p.name === "dhuhr",
  )!.time;
  const after = schedule(ny, "2026-03-08", calc).find(
    (p) => p.name === "dhuhr",
  )!.time;
  assert.equal(
    DateTime.fromJSDate(after).setZone(ny.timezone).offset -
      DateTime.fromJSDate(before).setZone(ny.timezone).offset,
    60,
  );
  assert.ok(Math.abs((+after - +before) / 60000 - 1440) < 3);
});
test("next prayer crosses midnight to next Fajr", () => {
  const now = DateTime.fromISO("2026-05-01T23:59", {
    zone: tokyo.timezone,
  }).toJSDate();
  const next = nextPrayer(tokyo, calc, now)!;
  assert.equal(next.name, "fajr");
  assert.equal(localDay(tokyo, next.time), "2026-05-02");
});
test("Hanafi Asr is later, and adjustments apply per prayer", () => {
  const standard = schedule(ny, "2026-05-01", calc);
  const hanafi = schedule(ny, "2026-05-01", { ...calc, hanafi: true });
  assert.ok(
    hanafi.find((p) => p.name === "asr")!.time >
      standard.find((p) => p.name === "asr")!.time,
  );
  const adjusted = schedule(ny, "2026-05-01", {
    ...calc,
    adjustments: { ...calc.adjustments, fajr: 7 },
  });
  assert.equal(+adjusted[0].time - +standard[0].time, 420000);
});
test("heading conversion takes shortest path across north", () => {
  assert.equal(relativeBearing(5, 355), 10);
  assert.equal(relativeBearing(355, 5), -10);
  assert.equal(relativeBearing(180, 180), 0);
});
test("reminders honor per-prayer offset, sound and disable state", () => {
  const s = structuredClone({ ...defaults, location: ny, notifications: true });
  s.reminders.fajr.offsets = [0, 10, 10];
  s.reminders.fajr.sound = false;
  s.reminders.isha.enabled = false;
  const plan = planReminders(s, new Date("2026-05-01T00:00Z"));
  assert.ok(plan.length <= 60 && plan.length > 0);
  assert.equal(new Set(plan.map((p) => p.id)).size, plan.length);
  assert.ok(!plan.some((p) => p.prayer === "isha"));
  const fajr = plan.filter((p) => p.prayer === "fajr");
  assert.equal(+fajr[1].date - +fajr[0].date, 600000);
  assert.ok(fajr.every((p) => !p.sound));
  assert.deepEqual(planReminders({ ...s, notifications: false }), []);
});
test("rescheduling cancels stale notifications before new batch", async () => {
  const calls: string[] = [];
  await reconcile(
    { ...defaults, location: ny, notifications: true },
    {
      cancel: async () => {
        calls.push("cancel");
      },
      schedule: async (p) => {
        calls.push(p.id);
      },
    },
    new Date("2026-05-01T00:00Z"),
  );
  assert.equal(calls[0], "cancel");
  assert.ok(calls.length > 1);
});
test("settings and theme round trip, invalid values rejected", () => {
  const s = structuredClone({
    ...defaults,
    location: tokyo,
    home: ny,
    textSize: "Large" as const,
  });
  s.dark.accent = "#123ABC";
  s.savedThemes.personal = { light: s.light, dark: s.dark };
  const restored = restore(JSON.stringify(s));
  assert.deepEqual(restored, s);
  assert.equal(validColor("#abcd"), false);
  assert.equal(validColor("#00ffaa"), true);
  assert.throws(() => parsePalette({ ...emerald, text: "red" }));
  assert.throws(() => restore("{"));
  assert.equal(restore(null).location, null);
});
test("light/dark defaults readable and text scaling ordered", () => {
  assert.ok(contrast(emerald.text, emerald.background) > 7);
  assert.ok(contrast(sand.text, sand.background) > 7);
  assert.ok(
    textScale.Small < textScale.Medium && textScale.Medium < textScale.Large,
  );
  assert.notEqual(sand.background, emerald.background);
});

test("high latitude rules and recognized methods return finite prayer times", () => {
  for (const method of [
    "MuslimWorldLeague",
    "UmmAlQura",
    "Egyptian",
    "Karachi",
    "NorthAmerica",
  ] as const)
    for (const highLatitude of ["angle", "middle", "seventh"] as const) {
      const times = schedule(london, "2026-06-21", {
        ...calc,
        method,
        highLatitude,
      });
      assert.ok(times.every((t) => Number.isFinite(+t.time)));
    }
});
test("corrupt saved preferences are sanitized without accepting invalid coordinates", () => {
  const s = restore(
    JSON.stringify({
      location: { ...tokyo, latitude: 999 },
      savedThemes: { bad: { light: {} } },
      mode: "bogus",
      textSize: "Huge",
      language: "xx",
      calendar: "xx",
      reminders: {
        fajr: { enabled: true, sound: false, offsets: [-1, 5, 5, 500] },
      },
    }),
  );
  assert.equal(s.location, null);
  assert.deepEqual(s.savedThemes, {});
  assert.equal(s.mode, "system");
  assert.equal(s.language, "en");
  assert.deepEqual(s.reminders.fajr.offsets, [5]);
});
test("failed reminder batch removes its partial schedule", async () => {
  const calls: string[] = [];
  await assert.rejects(() =>
    reconcile(
      { ...defaults, location: ny, notifications: true },
      {
        cancel: async () => {
          calls.push("cancel");
        },
        schedule: async () => {
          calls.push("schedule");
          throw Error("OS scheduling failed");
        },
      },
      new Date("2026-05-01T00:00Z"),
    ),
  );
  assert.deepEqual(calls, ["cancel", "schedule", "cancel"]);
});

test("international date-line cities keep prayers on the chosen civil date", () => {
  const places: Place[] = [
    {
      name: "Kiritimati",
      region: "Line Islands",
      country: "Kiribati",
      latitude: 1.8721,
      longitude: -157.4278,
      timezone: "Pacific/Kiritimati",
    },
    {
      name: "Apia",
      region: "Upolu",
      country: "Samoa",
      latitude: -13.8333,
      longitude: -171.75,
      timezone: "Pacific/Apia",
    },
    {
      name: "Auckland",
      region: "Auckland",
      country: "New Zealand",
      latitude: -36.8485,
      longitude: 174.7633,
      timezone: "Pacific/Auckland",
    },
  ];
  for (const place of places) {
    const entries = schedule(place, "2026-01-01", calc);
    for (const p of entries)
      assert.equal(
        localDay(place, p.time),
        "2026-01-01",
        `${place.name} ${p.name}`,
      );
    assert.ok(
      Number(
        formatTime(
          entries.find((p) => p.name === "dhuhr")!.time,
          place.timezone,
        ).slice(0, 2),
      ) >= 11,
    );
  }
});
