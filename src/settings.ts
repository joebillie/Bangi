import { Calculation, Place, prayers, Prayer } from "./prayer";
import { emerald, sand, Palette, validColor } from "./theme";
export type Reminder = {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
  offsets: number[];
};
export type Settings = {
  location: Place | null;
  home: Place | null;
  recent: Place[];
  locationMode: "manual" | "automatic";
  calculation: Calculation;
  notifications: boolean;
  reminders: Record<Prayer, Reminder>;
  mode: "light" | "dark" | "system";
  light: Palette;
  dark: Palette;
  savedThemes: Record<string, { light: Palette; dark: Palette }>;
  textSize: "Small" | "Medium" | "Large";
  arabic: boolean;
  language: "en" | "ar";
  calendar: "both" | "gregorian" | "hijri";
  layout: "compact" | "cards";
};
export const defaults: Settings = {
  location: null,
  home: null,
  recent: [],
  locationMode: "manual",
  calculation: {
    method: "MuslimWorldLeague",
    hanafi: false,
    highLatitude: "angle",
    adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    namaadhuAdjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  },
  notifications: false,
  reminders: Object.fromEntries(
    prayers.map((p) => [
      p,
      { enabled: true, sound: true, vibrate: true, offsets: [0] },
    ]),
  ) as Record<Prayer, Reminder>,
  mode: "system",
  light: sand,
  dark: emerald,
  savedThemes: {},
  textSize: "Medium",
  arabic: true,
  language: "en",
  calendar: "both",
  layout: "cards",
};
export function parsePalette(input: unknown): Palette {
  if (!input || typeof input !== "object")
    throw Error("A palette must be an object.");
  const out = { ...emerald };
  for (const key of Object.keys(emerald) as (keyof Palette)[]) {
    const value = (input as Record<string, unknown>)[key];
    if (!validColor(value))
      throw Error(`Invalid color for ${key}. Use #RRGGBB.`);
    out[key] = value;
  }
  return out;
}
export function validPlace(p: unknown): p is Place {
  const v = p as Place;
  return (
    !!v &&
    typeof v.name === "string" &&
    typeof v.region === "string" &&
    typeof v.country === "string" &&
    Number.isFinite(v.latitude) &&
    Math.abs(v.latitude) <= 90 &&
    Number.isFinite(v.longitude) &&
    Math.abs(v.longitude) <= 180 &&
    typeof v.timezone === "string" &&
    !!safeZone(v.timezone)
  );
}
function safeZone(zone: string) {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
  } catch {
    return false;
  }
}
export function restore(raw: string | null): Settings {
  if (!raw) return JSON.parse(JSON.stringify(defaults)) as Settings;
  const v = JSON.parse(raw);
  if (!v || typeof v !== "object") throw Error("Invalid stored settings");
  const out = {
    ...defaults,
    ...v,
    calculation: {
      ...defaults.calculation,
      ...v.calculation,
      namaadhuAdjustments: {
        ...defaults.calculation.namaadhuAdjustments,
        ...v.calculation?.namaadhuAdjustments,
      },
      adjustments: {
        ...defaults.calculation.adjustments,
        ...v.calculation?.adjustments,
      },
    },
    reminders: { ...defaults.reminders, ...v.reminders },
  } as Settings;
  out.light = parsePalette(out.light);
  out.dark = parsePalette(out.dark);
  if (out.location && !validPlace(out.location)) out.location = null;
  if (out.home && !validPlace(out.home)) out.home = null;
  out.recent = Array.isArray(out.recent)
    ? out.recent.filter(validPlace).slice(0, 8)
    : [];
  if (
    ![
      "MuslimWorldLeague",
      "UmmAlQura",
      "Egyptian",
      "Karachi",
      "NorthAmerica",
      "NamaadhuVaguthu",
    ].includes(out.calculation.method)
  )
    out.calculation.method = defaults.calculation.method;
  if (!["middle", "seventh", "angle"].includes(out.calculation.highLatitude))
    out.calculation.highLatitude = "angle";
  for (const p of prayers) {
    const r = out.reminders[p];
    out.reminders[p] = {
      enabled: !!r?.enabled,
      sound: !!r?.sound,
      vibrate: !!r?.vibrate,
      offsets: Array.isArray(r?.offsets)
        ? [
            ...new Set(
              r.offsets.filter(
                (n: number) => Number.isInteger(n) && n >= 0 && n <= 180,
              ),
            ),
          ].slice(0, 4)
        : [0],
    };
    if (
      out.calculation.namaadhuAdjustments &&
      (!Number.isInteger(out.calculation.namaadhuAdjustments[p]) ||
        Math.abs(out.calculation.namaadhuAdjustments[p]) > 120)
    )
      out.calculation.namaadhuAdjustments[p] = 0;
    if (
      !Number.isFinite(out.calculation.adjustments[p]) ||
      Math.abs(out.calculation.adjustments[p]) > 120
    )
      out.calculation.adjustments[p] = 0;
  }
  if (!["Small", "Medium", "Large"].includes(out.textSize))
    out.textSize = "Medium";
  if (!["light", "dark", "system"].includes(out.mode)) out.mode = "system";
  if (!["en", "ar"].includes(out.language)) out.language = "en";
  if (!["both", "gregorian", "hijri"].includes(out.calendar))
    out.calendar = "both";
  if (!["compact", "cards"].includes(out.layout)) out.layout = "cards";
  if (!["manual", "automatic"].includes(out.locationMode))
    out.locationMode = "manual";
  out.notifications = out.notifications === true;
  out.calculation.hanafi = out.calculation.hanafi === true;
  const saved: Settings["savedThemes"] = {};
  if (out.savedThemes && typeof out.savedThemes === "object")
    for (const [name, theme] of Object.entries(out.savedThemes)) {
      try {
        saved[name] = {
          light: parsePalette(theme.light),
          dark: parsePalette(theme.dark),
        };
      } catch {
        /* Ignore invalid saved palettes. */
      }
    }
  out.savedThemes = saved;
  return out;
}
