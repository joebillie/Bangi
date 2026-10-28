import { test } from "node:test";
import assert from "node:assert/strict";
import { translate, prayerLabel, dateLocale } from "../src/i18n";
import { defaults, restore } from "../src/settings";
import { makeJobs } from "../backend/core";
import { islandPlace } from "../src/maldives";
test("Malay settings restore and text preserve English and Arabic options", () => {
  assert.equal(
    restore(JSON.stringify({ ...defaults, language: "ms" })).language,
    "ms",
  );
  assert.equal(translate("Prayer Times", "ms"), "Waktu Solat");
  assert.equal(
    translate("Turn 42° clockwise", "ms"),
    "Pusing 42° mengikut arah jam",
  );
  assert.equal(
    translate("Device heading: 120° true north", "ms"),
    "Arah peranti: 120° dari utara sebenar",
  );
  assert.equal(prayerLabel("sunrise", "ms"), "Syuruk");
  assert.equal(prayerLabel("sunrise", "ar"), "الشروق");
  assert.equal(prayerLabel("fajr", "en"), "Fajr");
  assert.equal(dateLocale("ms"), "ms-MY");
  assert.equal(
    translate("An unknown proper name", "ms"),
    "An unknown proper name",
  );
});
test("Malay background reminders use Malay prayer names and message", () => {
  const result = makeJobs(
    {
      location: islandPlace(415),
      calculation: defaults.calculation,
      reminders: defaults.reminders,
      language: "ms",
    },
    new Date("2026-10-27T00:00:00Z"),
  );
  assert.ok(result.jobs.length > 0);
  assert.match(result.jobs[0].body, /bersolat/);
  assert.match(
    result.jobs.find((j) => j.id.includes(":fajr:"))!.title,
    /Subuh/,
  );
});
