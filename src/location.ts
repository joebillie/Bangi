import tzlookup from "tz-lookup";
import { Place } from "./prayer";
import { validPlace } from "./settings";
export async function currentLocation(): Promise<Place> {
  if (!window.isSecureContext)
    throw Error(
      "Current location needs HTTPS. You can choose a city manually.",
    );
  if (!navigator.geolocation)
    throw Error(
      "This browser does not support location. Choose a city manually.",
    );
  const p = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000,
    }),
  ).catch((e: GeolocationPositionError) => {
    throw Error(
      e.code === 1
        ? "Location access was denied. Choose a city manually or change Safari’s website permissions."
        : "Your location could not be resolved. Try again outdoors or choose a city manually.",
    );
  });
  const { latitude, longitude } = p.coords;
  return {
    name: "Current location",
    region: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
    country: "",
    latitude,
    longitude,
    timezone: tzlookup(latitude, longitude),
  };
}
export async function refreshAutomaticLocation(): Promise<Place | null> {
  if (!navigator.permissions) return null;
  try {
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });
    if (permission.state !== "granted") return null;
    return currentLocation();
  } catch {
    return null;
  }
}
export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  if (query.trim().length < 2) return [];
  const [name, ...filters] = query.split(",").map((v) => v.trim());
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=100&language=en&format=json`,
      { signal: controller.signal },
    );
    if (!response.ok)
      throw Error(
        "City search is unavailable. Use the offline catalog or enter coordinates.",
      );
    const data = await response.json();
    return (Array.isArray(data.results) ? data.results : [])
      .map((r: any) => ({
        name: r.name,
        region: r.admin1 || "",
        country: r.country || "",
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone || tzlookup(r.latitude, r.longitude),
      }))
      .filter(validPlace)
      .filter((p: Place) =>
        filters.every((f) =>
          `${p.region} ${p.country}`.toLowerCase().includes(f.toLowerCase()),
        ),
      );
  } catch (e) {
    if (controller.signal.aborted && !signal?.aborted)
      throw Error(
        "City search timed out. Try the offline catalog or enter coordinates.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
