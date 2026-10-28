import { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { DateTime } from "luxon";
import { SourceNotice } from "./source-notice";
import { PwaStatus } from "./pwa";
import { Icon } from "./icon";
import { useApp } from "./store";
import {
  arabic,
  formatTime,
  localDay,
  nextPrayer,
  schedule,
  methodDetail,
} from "./prayer";
import { Button, Card, Choices, Row, Screen, Txt } from "./ui";
export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
function Ornament() {
  const { palette: p } = useApp();
  return (
    <Svg
      width="100%"
      height={70}
      viewBox="0 0 600 70"
      accessibilityElementsHidden
    >
      {Array.from({ length: 13 }, (_, i) => (
        <Path
          key={i}
          d={`M ${i * 50} 35 l 25 -25 l 25 25 l -25 25 Z M ${i * 50 + 12} 35 l 13 -13 l 13 13 l -13 13 Z`}
          stroke={p.decoration}
          strokeWidth=".8"
          fill="none"
        />
      ))}
    </Svg>
  );
}
export function Dashboard() {
  const { settings: s, update, palette: p } = useApp();
  const now = useClock();
  const place = s.location;
  if (!place)
    return (
      <Screen title="Welcome to Bangi">
        <Ornament />
        <PwaStatus />
        <SourceNotice onlyUnavailable />
        <Card>
          <Txt size={23} color={p.heading}>
            Your day, guided by prayer.
          </Txt>
          <Txt>
            Choose your city or use your current location. Prayer times are
            calculated privately on your device and remain available offline.
          </Txt>
          <Button
            label="Choose your location"
            onPress={() => router.push("/location")}
          />
        </Card>
      </Screen>
    );
  const day = localDay(place, now);
  const times = schedule(place, day, s.calculation);
  const next = nextPrayer(place, s.calculation, now);
  const seconds = next
    ? Math.max(0, Math.floor((+next.time - +now) / 1000))
    : 0;
  const countdown = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  const current = times
    .filter((t) => t.name !== "sunrise" && t.time <= now)
    .at(-1)?.name;
  const hijri = new Intl.DateTimeFormat(
    s.language === "ar" ? "ar-SA-u-ca-islamic" : "en-GB-u-ca-islamic",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: place.timezone,
    },
  ).format(now);
  return (
    <Screen title="Assalamu alaikum">
      <PwaStatus />
      <SourceNotice onlyUnavailable />
      <Row>
        <View style={{ flex: 1 }}>
          <Txt size={20} color={p.heading}>
            {place.name}
          </Txt>
          <Txt size={13} color={p.secondaryText}>
            {[place.region, place.country].filter(Boolean).join(", ")}
          </Txt>
        </View>
        <Button
          label="Change location"
          secondary
          onPress={() => router.push("/location")}
        />
      </Row>
      <View
        style={{
          backgroundColor: p.header,
          borderRadius: 28,
          padding: 22,
          gap: 12,
          overflow: "hidden",
        }}
      >
        <Ornament />
        <Txt color={p.headerText}>
          {s.calendar !== "hijri" &&
            DateTime.fromJSDate(now)
              .setZone(place.timezone)
              .toFormat("cccc, d LLLL yyyy")}
          {s.calendar === "both" ? " · " : ""}
          {s.calendar !== "gregorian" && hijri}
        </Txt>
        <Txt color={p.headerText} size={16}>
          {formatTime(now, place.timezone)} · {place.timezone}
        </Txt>
        <Txt color={p.accent} size={13}>
          NEXT PRAYER · {next?.name.toUpperCase() || "UNAVAILABLE"}
        </Txt>
        <Txt
          size={44}
          color={p.countdown}
          style={{ fontVariant: ["tabular-nums"], fontWeight: "300" }}
        >
          {next ? countdown : "—"}
        </Txt>
        <Txt color={p.headerText}>
          {next
            ? `${next.name[0].toUpperCase() + next.name.slice(1)} at ${formatTime(next.time, place.timezone)}`
            : s.calculation.method === "NamaadhuVaguthu"
              ? "Choose a supported timetable island in calculation settings."
              : "Try another high-latitude rule; the sun may not cross the required angle."}
        </Txt>
      </View>
      <Row>
        <Txt size={22} color={p.heading}>
          Today’s rhythm
        </Txt>
        <Choices
          values={["compact", "cards"]}
          value={s.layout}
          onChange={(layout) => update((v) => ({ ...v, layout }))}
        />
      </Row>
      <PrayerSchedule
        times={times}
        timezone={place.timezone}
        nextName={next?.name}
        current={current}
      />
      <Card>
        <Row>
          <Icon name="qibla" />
          <Txt size={18} color={p.heading}>
            Find your direction
          </Txt>
          <Button label="Open Qibla ↗" onPress={() => router.push("/qibla")} />
        </Row>
        <Txt size={13} color={p.secondaryAccent}>
          {methodDetail(s.calculation)} ·{" "}
          {s.calculation.method === "NamaadhuVaguthu"
            ? "Stored timetable"
            : "Calculated offline with Adhan"}
        </Txt>
        <Button
          label="Calculation settings"
          secondary
          onPress={() => router.push("/calculation")}
        />
      </Card>
      <Button
        label="Personalize Bangi"
        secondary
        onPress={() => router.push("/settings")}
      />
      <Txt size={12} color={p.secondaryText} style={{ textAlign: "center" }}>
        Created by Joebillie
      </Txt>
    </Screen>
  );
}

export function PrayerSchedule({
  times,
  timezone,
  nextName,
  current,
}: {
  times: ReturnType<typeof schedule>;
  timezone: string;
  nextName?: string;
  current?: string;
}) {
  const { settings: s, palette: p } = useApp();
  return (
    <>
      {times.map((t) => (
        <View
          key={t.name}
          style={{
            backgroundColor:
              t.name === nextName
                ? p.selectedCard
                : t.name === "sunrise"
                  ? p.prayerCard
                  : p.unselectedCard,
            borderRadius: s.layout === "cards" ? 20 : 10,
            padding: s.layout === "cards" ? 20 : 12,
            borderWidth: 1,
            borderColor: p.border,
          }}
        >
          <Row>
            <View>
              <Txt
                color={p.text}
                size={19}
                style={{ textTransform: "capitalize" }}
              >
                {t.name}
                {s.arabic || s.language === "ar" ? `  ${arabic[t.name]}` : ""}
              </Txt>
              <Txt size={12} color={p.secondaryText}>
                {t.name === "sunrise"
                  ? "Sunrise · not an obligatory prayer"
                  : t.name === nextName
                    ? "Up next"
                    : t.name === current
                      ? "Current prayer"
                      : "Obligatory prayer"}
                {t.name !== "sunrise" &&
                s.notifications &&
                s.reminders[t.name].enabled
                  ? " · Reminder on"
                  : ""}
              </Txt>
            </View>
            <Txt
              size={25}
              color={t.name === nextName ? p.countdown : p.text}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {Number.isFinite(+t.time)
                ? formatTime(t.time, timezone)
                : "Unavailable"}
            </Txt>
          </Row>
        </View>
      ))}
    </>
  );
}
