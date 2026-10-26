import { useState } from "react";
import { DateTime } from "luxon";
import { router } from "expo-router";
import { useApp } from "../../src/store";
import { localDay, schedule } from "../../src/prayer";
import { PrayerSchedule, useClock } from "../../src/dashboard";
import { Button, Card, Choices, Row, Screen, Txt } from "../../src/ui";
export default function Times() {
  const { settings: s, update, palette: p } = useApp();
  const [offset, setOffset] = useState(0);
  const now = useClock();
  const place = s.location;
  if (!place)
    return (
      <Screen title="Prayer times">
        <Txt>Choose a city to calculate your prayer schedule.</Txt>
        <Button
          label="Choose your location"
          onPress={() => router.push("/location")}
        />
      </Screen>
    );
  const day = DateTime.fromISO(localDay(place, now))
    .plus({ days: offset })
    .toISODate()!;
  const entries = schedule(place, day, s.calculation);
  return (
    <Screen title="Prayer times">
      <Card>
        <Txt size={23} color={p.heading}>
          {place.name}, {place.country}
        </Txt>
        <Txt>
          {DateTime.fromISO(day)
            .setLocale(s.language)
            .toFormat("cccc, d LLLL yyyy")}
        </Txt>
        <Txt size={13} color={p.secondaryText}>
          {place.timezone} · {s.calculation.method} ·{" "}
          {s.calculation.hanafi ? "Hanafi" : "Standard"} Asr
        </Txt>
        <Row>
          <Button
            label="Previous day"
            secondary
            disabled={offset <= -365}
            onPress={() => setOffset((v) => v - 1)}
          />
          <Button
            label="Next day"
            secondary
            disabled={offset >= 365}
            onPress={() => setOffset((v) => v + 1)}
          />
        </Row>
        <Button label="Today" onPress={() => setOffset(0)} />
      </Card>
      <Choices
        values={["compact", "cards"]}
        value={s.layout}
        onChange={(layout) => update((v) => ({ ...v, layout }))}
      />
      <PrayerSchedule
        times={entries}
        timezone={place.timezone}
        nextName={
          offset === 0
            ? entries.find((t) => t.name !== "sunrise" && t.time > now)?.name
            : undefined
        }
      />
      <Button
        label="Calculation settings"
        secondary
        onPress={() => router.push("/calculation")}
      />
      <Txt size={12}>
        Times are calculated offline for this date. Browsing a different date
        does not change your reminder schedule.
      </Txt>
    </Screen>
  );
}
