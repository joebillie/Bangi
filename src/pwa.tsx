import { assetUrl } from "./urls";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Button, Card, Txt } from "./ui";
export function PwaStatus() {
  const [offline, setOffline] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const refresh = () => {
      setOffline(!navigator.onLine);
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    };
    refresh();
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("appinstalled", refresh);
    if (
      "serviceWorker" in navigator &&
      window.isSecureContext &&
      process.env.NODE_ENV === "production"
    )
      navigator.serviceWorker.register(assetUrl("sw.js")).catch(() => {});
    void navigator.storage?.persist?.().catch(() => {});
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("appinstalled", refresh);
    };
  }, []);
  if (Platform.OS !== "web") return null;
  return (
    <>
      {offline && (
        <Card>
          <Txt>
            Offline · Prayer calculations and saved settings are available. City
            search needs a connection.
          </Txt>
        </Card>
      )}
      {!installed && !dismissed && (
        <Card>
          <Txt size={20}>Keep Bangi close</Txt>
          <Txt>
            {ios
              ? "In Safari, tap Share, then Add to Home Screen. Keep “Open as Web App” enabled when offered. Bangi will open as its own app."
              : "Install Bangi from your browser’s menu, or on iPhone open it in Safari and choose Share → Add to Home Screen."}
          </Txt>
          <Button
            secondary
            label="Installation & permissions help"
            onPress={() => router.push("/install")}
          />
          <Button secondary label="Got it" onPress={() => setDismissed(true)} />
        </Card>
      )}
    </>
  );
}
