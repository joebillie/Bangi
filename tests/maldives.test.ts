import { test } from "node:test";
import assert from "node:assert/strict";
import fixtures from "./fixtures/namaadhu-vaguthu.json";
import { defaults, restore } from "../src/settings";
import { formatTime, localDay, nextPrayer, schedule } from "../src/prayer";
import {
  findNamaadhuIslands,
  islandPlace,
  namaadhuIslands,
  namaadhuOrder,
} from "../src/maldives";
import { planReminders } from "../src/reminders";
import { calendarExport } from "../src/calendar";
const calculation = {
  ...defaults.calculation,
  method: "NamaadhuVaguthu" as const,
};
for (const reference of fixtures.checks)
  test(`Namaadhu source match · island ${reference.islandId} · ${reference.date}`, () => {
    const place = islandPlace(reference.islandId);
    const entries = schedule(place, reference.date, calculation);
    assert.equal(entries.length, 6);
    assert.deepEqual(
      namaadhuOrder.map((name) =>
        formatTime(entries.find((e) => e.name === name)!.time, place.timezone),
      ),
      reference.times,
    );
  });
test("Namaadhu source preserves island identity and source selection across restart", () => {
  const place = islandPlace(415);
  const restored = restore(
    JSON.stringify({ ...defaults, location: place, home: place, calculation }),
  );
  assert.equal(restored.calculation.method, "NamaadhuVaguthu");
  assert.equal(restored.location?.namaadhuIslandId, 415);
  assert.deepEqual(
    schedule(restored.location!, "2026-10-27", restored.calculation),
    schedule(place, "2026-10-27", calculation),
  );
});
test("source has 202 islands with valid timezone, Qibla coordinates and leap-day schedules", () => {
  assert.equal(namaadhuIslands.length, 202);
  for (const island of namaadhuIslands) {
    const place = islandPlace(island.id);
    assert.ok(
      Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180,
    );
    assert.equal(place.timezone, "Indian/Maldives");
    assert.equal(schedule(place, "2024-02-29", calculation).length, 6);
  }
  assert.ok(findNamaadhuIslands("Malé").some((i) => i.id === 415));
  assert.ok(
    findNamaadhuIslands("GDh").every((i) => i.registration?.startsWith("Q")),
  );
});
test("source uses recurring month/day values without shifting after leap day", () => {
  const place = islandPlace(415);
  for (const day of ["01-01", "02-28", "03-01", "10-27", "12-31"]) {
    const a = schedule(place, "2024-" + day, calculation).map((p) =>
      formatTime(p.time, place.timezone),
    );
    const b = schedule(place, "2027-" + day, calculation).map((p) =>
      formatTime(p.time, place.timezone),
    );
    assert.deepEqual(a, b);
  }
});
test("source-specific corrections do not inherit astronomical settings", () => {
  const place = islandPlace(415);
  const original = schedule(place, "2026-10-27", calculation);
  const other = schedule(place, "2026-10-27", {
    ...calculation,
    hanafi: true,
    highLatitude: "middle",
    adjustments: { fajr: 60, dhuhr: 60, asr: 60, maghrib: 60, isha: 60 },
  });
  assert.deepEqual(other, original);
  const adjusted = schedule(place, "2026-10-27", {
    ...calculation,
    namaadhuAdjustments: { fajr: 7, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  });
  assert.equal(
    +adjusted.find((p) => p.name === "fajr")!.time -
      +original.find((p) => p.name === "fajr")!.time,
    7 * 60000,
  );
  assert.equal(
    +adjusted.find((p) => p.name === "sunrise")!.time,
    +original.find((p) => p.name === "sunrise")!.time,
  );
});
test("source never silently substitutes a nearby island or another country", () => {
  const invalid = {
    ...islandPlace(415),
    latitude: 51.5,
    longitude: -0.1,
    timezone: "Europe/London",
    name: "London",
    country: "UK",
  };
  assert.deepEqual(schedule(invalid, "2026-10-27", calculation), []);
  assert.deepEqual(
    schedule(
      { ...islandPlace(415), namaadhuIslandId: undefined },
      "2026-10-27",
      calculation,
    ),
    [],
  );
  const settings = {
    ...defaults,
    location: invalid,
    calculation,
    notifications: true,
  };
  assert.deepEqual(planReminders(settings), []);
  assert.throws(
    () => calendarExport(settings),
    /Choose a Namaadhu Vaguthu island/,
  );
});
test("Maldives midnight, countdown, reminders and calendar use the selected timetable", () => {
  const place = islandPlace(415);
  const now = new Date("2026-10-26T23:00:00Z");
  assert.equal(localDay(place, now), "2026-10-27");
  const next = nextPrayer(place, calculation, now)!;
  assert.equal(next.name, "fajr");
  assert.equal(next.time.toISOString(), "2026-10-26T23:36:00.000Z");
  const settings = {
    ...defaults,
    location: place,
    calculation,
    notifications: true,
  };
  const plan = planReminders(settings, now);
  assert.equal(plan[0].prayer, "fajr");
  assert.equal(plan[0].time, "04:36");
  assert.equal(plan[0].date.toISOString(), next.time.toISOString());
  const calendar = calendarExport(settings, now, 1);
  assert.match(calendar, /DTSTART:20261026T233600Z/);
  assert.match(calendar, /Namaadhu Vaguthu/);
});
