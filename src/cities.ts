import { Place } from "./prayer";
// Small offline starter catalog; worldwide online search and coordinate entry remain available.
export const offlineCities: Place[] = [
  {
    name: "Addis Ababa",
    region: "Addis Ababa",
    country: "Ethiopia",
    latitude: 9.03,
    longitude: 38.74,
    timezone: "Africa/Addis_Ababa",
  },
  {
    name: "Makkah",
    region: "Makkah",
    country: "Saudi Arabia",
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: "Asia/Riyadh",
  },
  {
    name: "Madinah",
    region: "Al Madinah",
    country: "Saudi Arabia",
    latitude: 24.4672,
    longitude: 39.6111,
    timezone: "Asia/Riyadh",
  },
  {
    name: "London",
    region: "England",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
  },
  {
    name: "New York",
    region: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
  },
  {
    name: "Istanbul",
    region: "Istanbul",
    country: "Türkiye",
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: "Europe/Istanbul",
  },
  {
    name: "Jakarta",
    region: "Jakarta",
    country: "Indonesia",
    latitude: -6.2088,
    longitude: 106.8456,
    timezone: "Asia/Jakarta",
  },
  {
    name: "Karachi",
    region: "Sindh",
    country: "Pakistan",
    latitude: 24.8607,
    longitude: 67.0011,
    timezone: "Asia/Karachi",
  },
  {
    name: "Cairo",
    region: "Cairo",
    country: "Egypt",
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: "Africa/Cairo",
  },
  {
    name: "Kuala Lumpur",
    region: "Kuala Lumpur",
    country: "Malaysia",
    latitude: 3.139,
    longitude: 101.6869,
    timezone: "Asia/Kuala_Lumpur",
  },
  {
    name: "Tokyo",
    region: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  },
  {
    name: "Sydney",
    region: "New South Wales",
    country: "Australia",
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: "Australia/Sydney",
  },
  {
    name: "Yekaterinburg",
    region: "Sverdlovsk Oblast",
    country: "Russia",
    latitude: 56.8389,
    longitude: 60.6057,
    timezone: "Asia/Yekaterinburg",
  },
];
export function findOfflineCities(query: string) {
  const tokens = query.toLocaleLowerCase().split(/[ ,]+/).filter(Boolean);
  return offlineCities.filter((p) =>
    tokens.every((t) =>
      `${p.name} ${p.region} ${p.country}`.toLocaleLowerCase().includes(t),
    ),
  );
}
