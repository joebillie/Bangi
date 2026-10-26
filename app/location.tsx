import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { useApp } from "../src/store";
import tzlookup from "tz-lookup";
import { findOfflineCities } from "../src/cities";
import { Place } from "../src/prayer";
import { currentLocation, searchCities } from "../src/location";
import { Button, Card, Field, Screen, Txt } from "../src/ui";
export default function Location() {
  const { settings: s, update } = useApp();
  const [manual, setManual] = useState(false);
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    const controller = new AbortController();
    if (query.trim().length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const timer = setTimeout(() => {
      searchCities(query, controller.signal)
        .then((v) => {
          if (id === request.current) {
            setResults(v);
            setError(
              v.length
                ? ""
                : "No matching cities. Try a nearby city or a different spelling.",
            );
          }
        })
        .catch((e) => {
          if (e.name !== "AbortError" && id === request.current)
            setError(e.message);
        })
        .finally(() => {
          if (id === request.current) setBusy(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const select = (location: Place, mode: "manual" | "automatic" = "manual") => {
    update((v) => ({
      ...v,
      location,
      locationMode: mode,
      recent: [
        location,
        ...v.recent.filter(
          (p) =>
            p.latitude !== location.latitude ||
            p.longitude !== location.longitude,
        ),
      ].slice(0, 8),
    }));
    router.dismissTo("/(tabs)");
  };
  const detect = async () => {
    setBusy(true);
    setError("");
    try {
      select(await currentLocation(), "automatic");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title="Where do you pray?">
      <Txt>
        Choose a fixed city or refresh your current location. Calculation method
        stays under your control when changing countries.
      </Txt>
      {s.location && (
        <Card>
          <Txt>
            Active: {s.location.name}, {s.location.country}
          </Txt>
          <Txt>
            {s.location.timezone} · {s.locationMode}
          </Txt>
          <Button
            label="Save active city as home"
            onPress={() => update((v) => ({ ...v, home: v.location }))}
          />
        </Card>
      )}
      <Button
        label={busy ? "Locating / searching…" : "Use current location"}
        disabled={busy}
        onPress={() => void detect()}
      />
      {s.home && (
        <Button
          label={`Use home · ${s.home.name}`}
          secondary
          onPress={() => select(s.home!)}
        />
      )}
      <Field
        label="Search worldwide · city, region or country"
        value={query}
        onChange={setQuery}
      />
      <Txt size={12}>
        Online city search is provided by Open-Meteo / GeoNames. Your search
        text is sent to that service; GPS coordinates are not sent by this
        search. Selected locations work offline.
      </Txt>
      {!!error && <Txt>{error}</Txt>}
      {results.map((p, i) => (
        <Card key={`${p.latitude}:${p.longitude}:${i}`}>
          <Txt size={20}>{p.name}</Txt>
          <Txt>
            {[p.region, p.country].filter(Boolean).join(", ")} · {p.timezone}
          </Txt>
          <Button label={`Select ${p.name}`} onPress={() => select(p)} />
        </Card>
      ))}
      <Txt size={22}>Offline city catalog</Txt>
      {findOfflineCities(query).map((p) => (
        <Button
          key={p.name}
          secondary
          label={`${p.name}, ${p.country}`}
          onPress={() => select(p)}
        />
      ))}
      <Button
        label={
          manual ? "Hide coordinate entry" : "Enter a location by coordinates"
        }
        secondary
        onPress={() => setManual((v) => !v)}
      />
      {manual && (
        <Card>
          <Field
            label="City or location name"
            value={city}
            onChange={setCity}
          />
          <Field label="Region" value={region} onChange={setRegion} />
          <Field label="Country" value={country} onChange={setCountry} />
          <Field label="Latitude (−90 to 90)" value={lat} onChange={setLat} />
          <Field
            label="Longitude (−180 to 180)"
            value={lon}
            onChange={setLon}
          />
          <Button
            label="Use coordinates"
            disabled={
              !city.trim() ||
              !country.trim() ||
              !lat.trim() ||
              !lon.trim() ||
              !Number.isFinite(Number(lat)) ||
              !Number.isFinite(Number(lon)) ||
              Math.abs(Number(lat)) > 90 ||
              Math.abs(Number(lon)) > 180
            }
            onPress={() => {
              try {
                select({
                  name: city.trim(),
                  region: region.trim(),
                  country: country.trim(),
                  latitude: Number(lat),
                  longitude: Number(lon),
                  timezone: tzlookup(Number(lat), Number(lon)),
                });
              } catch {
                setError(
                  "These coordinates could not be resolved. Check them and try again.",
                );
              }
            }}
          />
          <Txt size={12}>
            Time zone is resolved offline from coordinates using tz-lookup.
            Verify the displayed zone near territorial borders.
          </Txt>
        </Card>
      )}
      {s.recent.length > 0 && <Txt size={22}>Recent places</Txt>}
      {s.recent.map((p, i) => (
        <Button
          key={i}
          secondary
          label={`${p.name} · ${p.country}`}
          onPress={() => select(p)}
        />
      ))}
    </Screen>
  );
}
