import { useEffect, useState } from "react";
import { Button, Card, Txt } from "./ui";
import { useApp } from "./store";
import {
  backgroundPushEnabled,
  loadBackgroundPushConfig,
  backgroundPushStatus,
  enableBackgroundPush,
  disableBackgroundPush,
  testBackgroundPush,
} from "./background-push";
export function BackgroundPushCard() {
  const { settings: s } = useApp();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    void loadBackgroundPushConfig()
      .then(() => setAvailable(true))
      .catch((e) => setMessage(e.message));
    const active = backgroundPushEnabled();
    setEnabled(active);
    if (active)
      void backgroundPushStatus()
        .then((v) =>
          setMessage(
            v.subscribed
              ? `Server schedule prepared through ${new Date(v.scheduledUntil).toLocaleString()}. The server replenishes it automatically.`
              : "No server registration found. Enable background reminders again.",
          ),
        )
        .catch((e) => setMessage(e.message));
  }, []);
  const work = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      setEnabled(backgroundPushEnabled());
      setMessage(success);
    } catch (e) {
      setEnabled(backgroundPushEnabled());
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Txt size={23}>Background notifications</Txt>
      <Txt>
        Receive prayer reminders when Bangi is closed using Web Push. On iPhone,
        install from Safari → Add to Home Screen and allow notifications inside
        the installed app (iOS 16.4+).
      </Txt>
      <Txt>
        Enabling this stores an anonymous installation ID, push subscription,
        selected prayer location, calculation/source and reminder preferences on
        Bangi’s notification server. Themes and location history stay on this
        device. Internet access is required for delivery.
      </Txt>
      <Txt size={13}>
        Notifications are best effort: iOS Focus settings, connectivity,
        provider limits and a paused backend can delay or stop them. iPhone
        controls sound and does not support custom adhan audio through Web Push.
      </Txt>
      {enabled ? (
        <>
          <Button
            label="Send a test notification"
            disabled={busy}
            onPress={() =>
              void work(
                testBackgroundPush,
                "Test accepted by the push provider. Check your device; provider acceptance does not guarantee display.",
              )
            }
          />
          <Button
            secondary
            label="Disable background notifications"
            disabled={busy}
            onPress={() =>
              void work(
                disableBackgroundPush,
                "Background notification registration removed from this installation.",
              )
            }
          />
        </>
      ) : (
        <Button
          label={busy ? "Connecting…" : "Enable background notifications"}
          disabled={busy || !available || !s.notifications || !s.location}
          onPress={() =>
            void work(
              () => enableBackgroundPush(s),
              "Background reminders connected. Use Send a test notification to verify this device.",
            )
          }
        />
      )}
      <Txt size={13}>
        Changing settings synchronizes the server when connected. If you change
        them offline, the previous server schedule can remain active until
        synchronization succeeds. Disabling the global reminder switch also
        attempts to remove the background subscription.
      </Txt>
      {!!message && <Txt accessibilityLiveRegion="polite">{message}</Txt>}
    </Card>
  );
}
