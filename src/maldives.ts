import { DateTime } from "luxon";
import data from "./data/maldives-timetable.json";
import type { Place, Prayer, Calculation } from "./prayer";
export const namaadhuIslands = data.islands;
export const namaadhuSourceUrl = "https://namaadhuvaguthu.com/en";
export const namaadhuOrder = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;
const regions: Record<string, string> = {
  A: "HA",
  B: "HDh",
  C: "Sh",
  D: "N",
  E: "R",
  F: "B",
  G: "Lh",
  H: "K",
  I: "ADh",
  J: "V",
  K: "M",
  L: "F",
  M: "Dh",
  N: "Th",
  O: "L",
  P: "GA",
  Q: "GDh",
  R: "Gn",
  S: "Addu City",
  T: "Malé City",
  U: "AA",
};
export function islandPlace(id: number): Place {
  const island = namaadhuIslands.find((i) => i.id === id);
  if (!island) throw Error("This island is not in the bundled timetable.");
  return {
    name: island.id === 415 ? "Malé" : island.name,
    region: regions[island.registration?.[0] || ""] || "Maldives",
    country: "Maldives",
    latitude: island.latitude,
    longitude: island.longitude,
    timezone: "Indian/Maldives",
    namaadhuIslandId: id,
  };
}
export function selectedIsland(place: Place) {
  if (
    place.timezone !== "Indian/Maldives" ||
    place.namaadhuIslandId === undefined
  )
    return undefined;
  return namaadhuIslands.find(
    (i) =>
      i.id === place.namaadhuIslandId &&
      Math.abs(place.latitude - i.latitude) < 0.00001 &&
      Math.abs(place.longitude - i.longitude) < 0.00001,
  );
}
export function namaadhuSchedule(
  place: Place,
  day: string,
  settings: Calculation,
) {
  const island = selectedIsland(place);
  if (!island) return [];
  const date = DateTime.fromISO(day, { zone: "Indian/Maldives" });
  if (!date.isValid) return [];
  const index =
    DateTime.fromISO(`2000-${day.slice(5)}`, { zone: "UTC" }).ordinal - 1;
  const row = (data.bands as Record<string, number[][]>)[String(island.band)]?.[
    index
  ];
  if (!row) return [];
  return namaadhuOrder
    .map((name, index) => ({
      name,
      time: date
        .startOf("day")
        .plus({
          minutes:
            row[index] +
            island.offset +
            (name === "sunrise"
              ? 0
              : settings.namaadhuAdjustments?.[name as Prayer] || 0),
        })
        .toJSDate(),
    }))
    .sort((a, b) => +a.time - +b.time);
}
export function findNamaadhuIslands(query: string) {
  const q = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f']/g, "")
    .trim();
  return namaadhuIslands.filter((i) =>
    `${i.name} ${regions[i.registration?.[0] || ""] || ""} ${i.registration || ""}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f']/g, "")
      .includes(q),
  );
}
export function namaadhuUnavailable(
  place: Place | null,
  settings: Calculation,
) {
  return (
    settings.method === "NamaadhuVaguthu" && (!place || !selectedIsland(place))
  );
}
