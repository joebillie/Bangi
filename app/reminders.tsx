import { Platform } from "react-native";
import { downloadCalendar } from "../src/calendar-download";
import { BackgroundPushCard } from "../src/background-push-card";
import { useState } from "react";
import { useApp } from "../src/store";
import { prayers, Prayer } from "../src/prayer";
import {
  notificationPermission,
  requestBrowserPermission,
} from "../src/notifications";
import { Button, Card, Choices, Field, Screen, Toggle, Txt } from "../src/ui";
function PrayerReminder({ prayer }: { prayer: Prayer }) {
  const { settings: s, update } = useApp();
  const r = s.reminders[prayer];
  const [custom, setCustom] = useState("");
  const change = (patch: Partial<typeof r>) =>
    update((v) => ({
      ...v,
      reminders: {
        ...v.reminders,
        [prayer]: { ...v.reminders[prayer], ...patch },
      },
    }));
  const n = Number(custom);
  return (
    <Card>
      <Txt size={23} style={{ textTransform: "capitalize" }}>
        {prayer}
      </Txt>
      <Toggle
        label={`${prayer} reminders enabled`}
        value={r.enabled}
        onChange={(enabled) => change({ enabled })}
      />
      <Toggle
        label="Play reminder sound"
        value={r.sound}
        onChange={(sound) => change({ sound })}
      />
      <Toggle
        label="Vibrate where supported"
        value={r.vibrate}
        onChange={(vibrate) => change({ vibrate })}
      />
      <Txt>Choose up to four reminder times</Txt>
      <Choices
        values={["0", "5", "10", "15", "20", "30", "45", "60"]}
        value=""
        onChange={(v) => {
          const offset = Number(v);
          change({
            offsets: r.offsets.includes(offset)
              ? r.offsets.filter((n) => n !== offset)
              : [...r.offsets, offset].slice(-4),
          });
        }}
      />
      <Txt>
        Active:{" "}
        {r.offsets.length
          ? r.offsets
              .map((n) => (n === 0 ? "At prayer time" : `${n} minutes before`))
              .join(" · ")
          : "No reminders selected"}
      </Txt>
      <Field
        label="Custom minutes before (0–180)"
        keyboardType="numeric"
        value={custom}
        onChange={setCustom}
      />
      <Button
        label="Add custom reminder"
        disabled={!custom || !Number.isInteger(n) || n < 0 || n > 180}
        onPress={() => {
          change({ offsets: [...new Set([...r.offsets, n])].slice(-4) });
          setCustom("");
        }}
      />
      <Button
        label="Clear selected reminders"
        secondary
        onPress={() => change({ offsets: [] })}
      />
    </Card>
  );
}
export default function Reminders() {
  const { settings: s, update, setError } = useApp();
  const enable = async (value: boolean) => {
    if (!value) {
      update((v) => ({ ...v, notifications: false }));
      return;
    }
    try {
      if (!s.location)
        throw Error("Select a location before enabling prayer reminders.");
      await notificationPermission();
      update((v) => ({ ...v, notifications: true }));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Screen title="A gentle invitation">
      <Card>
        <Txt>
          Enable gentle prayer reminders while Bangi is open. Connect background
          notifications below to receive Web Push when the app is closed.
        </Txt>
        <Toggle
          label="Enable prayer notifications"
          value={s.notifications}
          onChange={(v) => void enable(v)}
        />
        <Txt size={13}>
          Silent reminders still appear in Bangi. Browser sound needs a tap to
          enable audio and can be suppressed by device settings. iPhone browsers
          do not support vibration. In-app reminders require Bangi to stay open
          and visible; a Home Screen icon does not enable background scheduling.
        </Txt>
        {Platform.OS === "web" && (
          <Button
            label="Allow browser alerts (optional)"
            secondary
            onPress={() =>
              void requestBrowserPermission().catch((e) => setError(e.message))
            }
          />
        )}
      </Card>
      <BackgroundPushCard />
      {prayers.map((p) => (
        <PrayerReminder key={p} prayer={p} />
      ))}
      <Card>
        <Txt size={22}>Reminders outside Bangi</Txt>
        <Txt>
          Export the next 30 days to a calendar that supports imported event
          alerts. Your chosen per-prayer offsets are included. The calendar app
          controls delivery, sound and vibration. Imported events do not update
          when you change Bangi settings; remove the old calendar/events before
          importing a replacement.
        </Txt>
        <Button
          label="Export 30 days to calendar"
          disabled={!s.location}
          onPress={() => {
            try {
              downloadCalendar(s);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </Card>
      <Txt size={13}>
        Foreground reminders need Bangi to remain visible. Background
        notifications require a connected, running backend and internet access.
        Calendar export remains available independently of the backend.
      </Txt>
    </Screen>
  );
}
