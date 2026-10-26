import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
  Qibla,
} from "adhan";
import { DateTime } from "luxon";
export const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type Prayer = (typeof prayers)[number];
export const arabic: Record<Prayer, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};
export const methods = [
  "MuslimWorldLeague",
  "UmmAlQura",
  "Egyptian",
  "Karachi",
  "NorthAmerica",
] as const;
export type Method = (typeof methods)[number];
export type Place = {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};
export type Calculation = {
  method: Method;
  hanafi: boolean;
  highLatitude: "middle" | "seventh" | "angle";
  adjustments: Record<Prayer, number>;
};
export function schedule(place: Place, day: string, settings: Calculation) {
  const p = CalculationMethod[settings.method]();
  p.madhab = settings.hanafi ? Madhab.Hanafi : Madhab.Shafi;
  p.highLatitudeRule = {
    middle: HighLatitudeRule.MiddleOfTheNight,
    seventh: HighLatitudeRule.SeventhOfTheNight,
    angle: HighLatitudeRule.TwilightAngle,
  }[settings.highLatitude];
  Object.assign(p.adjustments, settings.adjustments);
  const [y, m, d] = day.split("-").map(Number);
  const calculate = (shift = 0) =>
    new PrayerTimes(
      new Coordinates(place.latitude, place.longitude),
      new Date(y, m - 1, d + shift, 12),
      p,
    );
  let result = calculate();
  // Civil time zones may cross the astronomical date line (e.g. Kiritimati,
  // Apia). Anchor solar noon to the requested civil date, not longitude alone.
  const noonDay = DateTime.fromJSDate(result.dhuhr)
    .setZone(place.timezone)
    .toISODate();
  if (noonDay && noonDay !== day) {
    const shift = DateTime.fromISO(day, { zone: "UTC" }).diff(
      DateTime.fromISO(noonDay, { zone: "UTC" }),
      "days",
    ).days;
    result = calculate(shift);
  }
  return [...prayers, "sunrise" as const]
    .map((name) => ({ name, time: result[name] }))
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}
export function localDay(place: Place, now = new Date()) {
  return DateTime.fromJSDate(now).setZone(place.timezone).toISODate()!;
}
export function nextPrayer(
  place: Place,
  settings: Calculation,
  now = new Date(),
) {
  const day = localDay(place, now);
  return [day, DateTime.fromISO(day).plus({ days: 1 }).toISODate()!]
    .flatMap((d) => schedule(place, d, settings))
    .find((p) => p.name !== "sunrise" && p.time > now);
}
export const bearing = (place: Place) =>
  Qibla(new Coordinates(place.latitude, place.longitude));
export const relativeBearing = (target: number, heading: number) =>
  ((target - heading + 540) % 360) - 180;
export const formatTime = (date: Date, zone: string) =>
  DateTime.fromJSDate(date).setZone(zone).toFormat("HH:mm");
