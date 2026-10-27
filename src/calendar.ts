import { DateTime } from "luxon";
import { Settings } from "./settings";
import { namaadhuUnavailable } from "./maldives";
import { localDay, schedule, methodDetail } from "./prayer";
const escape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
const stamp = (date: Date) =>
  DateTime.fromJSDate(date).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
export function calendarExport(s: Settings, now = new Date(), days = 30) {
  if (!s.location)
    throw Error("Select a location before exporting prayer times.");
  if (namaadhuUnavailable(s.location, s.calculation))
    throw Error(
      "Choose a Namaadhu Vaguthu island in calculation settings before exporting.",
    );
  const place = s.location;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bangi//Prayer Companion//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape("Bangi · " + place.name)}`,
  ];
  for (let i = 0; i < days; i++) {
    const day = DateTime.fromISO(localDay(place, now))
      .plus({ days: i })
      .toISODate()!;
    for (const p of schedule(place, day, s.calculation)) {
      if (p.name === "sunrise" || !Number.isFinite(+p.time) || p.time <= now)
        continue;
      const title = p.name[0].toUpperCase() + p.name.slice(1);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${day}-${p.name}-${place.latitude}-${place.longitude}@bangi.local`,
        `DTSTAMP:${stamp(now)}`,
        `DTSTART:${stamp(p.time)}`,
        `DTEND:${stamp(new Date(+p.time + 15 * 60000))}`,
        `SUMMARY:${title}`,
        `LOCATION:${escape([place.name, place.region, place.country].filter(Boolean).join(", "))}`,
        `DESCRIPTION:${escape("Prayer time source: " + methodDetail(s.calculation) + ". Imported calendar reminders do not update automatically when Bangi settings change.")}`,
      );
      const reminder = s.reminders[p.name];
      if (reminder.enabled)
        for (const offset of reminder.offsets)
          lines.push(
            "BEGIN:VALARM",
            `TRIGGER:${offset === 0 ? "PT0M" : `-PT${offset}M`}`,
            "ACTION:DISPLAY",
            `DESCRIPTION:${escape(title + " · Time for prayer")}`,
            "END:VALARM",
          );
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return (
    lines
      .map((line) => {
        const chars = Array.from(line);
        const chunks: string[] = [];
        let chunk = "",
          length = 0;
        for (const char of chars) {
          const bytes = new TextEncoder().encode(char).length;
          if (length + bytes > 73) {
            chunks.push(chunk);
            chunk = " ";
            length = 1;
          }
          chunk += char;
          length += bytes;
        }
        chunks.push(chunk);
        return chunks.join("\r\n");
      })
      .join("\r\n") + "\r\n"
  );
}
