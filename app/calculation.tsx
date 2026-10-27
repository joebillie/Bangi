import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useApp } from "../src/store";
import { methods, prayers, Prayer, methodLabel } from "../src/prayer";
import {
  findNamaadhuIslands,
  islandPlace,
  selectedIsland,
} from "../src/maldives";
import { Button, Card, Choices, Field, Screen, Toggle, Txt } from "../src/ui";
function Adjustment({ prayer }: { prayer: Prayer }) {
  const { settings: s, update } = useApp();
  const group =
    s.calculation.method === "NamaadhuVaguthu"
      ? "namaadhuAdjustments"
      : "adjustments";
  const [value, setValue] = useState(
    String(s.calculation[group]?.[prayer] || 0),
  );
  const stored = s.calculation[group]?.[prayer] || 0;
  useEffect(() => setValue(String(stored)), [stored]);
  const n = Number(value);
  const valid =
    value.trim() !== "" && Number.isInteger(n) && Math.abs(n) <= 120;
  return (
    <Card>
      <Field
        label={`${prayer} adjustment · minutes (−120 to 120)`}
        keyboardType="numeric"
        value={value}
        onChange={setValue}
      />
      <Button
        label="Apply adjustment"
        disabled={!valid}
        onPress={() =>
          update((v) => ({
            ...v,
            calculation: {
              ...v.calculation,
              [group]: { ...v.calculation[group], [prayer]: n },
            },
          }))
        }
      />
    </Card>
  );
}
function TimetableIsland() {
  const { settings: s, update } = useApp();
  const [query, setQuery] = useState("");
  const matches = findNamaadhuIslands(query).sort(
    (a, b) => Number(b.id === 415) - Number(a.id === 415),
  );
  const active = s.location && selectedIsland(s.location);
  const select = (id: number) => {
    const location = islandPlace(id);
    update((v) => ({
      ...v,
      location,
      locationMode: "manual",
      calculation: { ...v.calculation, method: "NamaadhuVaguthu" },
      recent: [
        location,
        ...v.recent.filter((p) => p.namaadhuIslandId !== id),
      ].slice(0, 8),
    }));
  };
  return (
    <Card>
      <Txt size={22}>Maldives timetable island</Txt>
      <Txt>
        Choose the exact island. This source contains 202 islands, with a stored
        timetable for every month/day including leap day. Times are shown in
        Maldives time (UTC+5) and work offline.
      </Txt>
      {active && (
        <Txt>
          Active timetable: {s.location!.name} · {s.location!.region}
        </Txt>
      )}
      <Field
        label="Search timetable islands or atolls"
        value={query}
        onChange={setQuery}
      />
      <Txt size={12}>
        {matches.length} matching islands
        {matches.length > 30
          ? " · Showing the first 30; search to narrow the list."
          : ""}
      </Txt>
      {matches.slice(0, 30).map((i) => {
        const place = islandPlace(i.id);
        return (
          <Button
            key={i.id}
            label={`Use ${place.name} · ${place.region}${i.registration ? ` (${i.registration})` : ""}`}
            secondary={active?.id !== i.id}
            onPress={() => select(i.id)}
          />
        );
      })}
      <Txt size={13}>
        No island selected means no timetable times or reminders. Switching to a
        city outside this catalog will not silently substitute another source.
        Select a different calculation method for other countries.
      </Txt>
      {active && (
        <Button
          label="View prayer times"
          onPress={() => router.dismissTo("/(tabs)")}
        />
      )}
    </Card>
  );
}
export default function Calculation() {
  const { settings: s, update } = useApp();
  const timetable = s.calculation.method === "NamaadhuVaguthu";
  return (
    <Screen title="A considered calculation">
      <Txt>
        Choose an astronomical method or a published local timetable. For
        Maldives times matching namaadhuvaguthu.com, select Namaadhu Vaguthu and
        choose your island.
      </Txt>
      <Card>
        <Txt>Calculation method / timetable source</Txt>
        {methods.map((method) => (
          <Button
            key={method}
            label={methodLabel(method)}
            secondary={method !== s.calculation.method}
            onPress={() =>
              update((v) => ({
                ...v,
                calculation: { ...v.calculation, method },
              }))
            }
          />
        ))}
        {!timetable && (
          <>
            <Txt size={12}>
              NorthAmerica = ISNA. UmmAlQura uses the library’s fixed Isha
              interval; consult your mosque for Ramadan adjustments.
            </Txt>
            <Toggle
              label="Hanafi Asr (double shadow)"
              value={s.calculation.hanafi}
              onChange={(hanafi) =>
                update((v) => ({
                  ...v,
                  calculation: { ...v.calculation, hanafi },
                }))
              }
            />
            <Txt>High-latitude rule</Txt>
            <Choices
              values={["middle", "seventh", "angle"]}
              value={s.calculation.highLatitude}
              onChange={(highLatitude) =>
                update((v) => ({
                  ...v,
                  calculation: { ...v.calculation, highLatitude },
                }))
              }
            />
            <Txt size={12}>
              Middle of night · Seventh of night · Twilight angle. At polar
              extremes some times may remain unavailable; follow local scholarly
              guidance.
            </Txt>
          </>
        )}
      </Card>
      {timetable && (
        <>
          <TimetableIsland />
          <Card>
            <Txt>
              The published timetable supplies Asr and all other times directly.
              Astronomical Asr and high-latitude controls do not apply.
              Source-specific manual adjustments are separate from your other
              methods and start at zero.
            </Txt>
            <Txt size={12}>
              Snapshot imported and verified against Namaadhu Vaguthu on 27
              October 2026. It is a recurring month/day table, not a live feed
              or a guarantee of future revisions.
            </Txt>
            <Button
              secondary
              label="Reset timetable adjustments to zero"
              onPress={() =>
                update((v) => ({
                  ...v,
                  calculation: {
                    ...v.calculation,
                    namaadhuAdjustments: {
                      fajr: 0,
                      dhuhr: 0,
                      asr: 0,
                      maghrib: 0,
                      isha: 0,
                    },
                  },
                }))
              }
            />
          </Card>
        </>
      )}
      {prayers.map((p) => (
        <Adjustment key={`${s.calculation.method}:${p}`} prayer={p} />
      ))}
    </Screen>
  );
}
