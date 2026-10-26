import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, useColorScheme } from "react-native";
import { defaults, Settings } from "./settings";
import { syncNotifications } from "./notifications";
import { refreshAutomaticLocation } from "./location";
import { Palette, textScale } from "./theme";
import { PreferencesRepository } from "./persistence";
const preferences = new PreferencesRepository(AsyncStorage);
type Context = {
  settings: Settings;
  update: (f: (s: Settings) => Settings) => void;
  palette: Palette;
  scale: number;
  ready: boolean;
  notice: string;
  setNotice: (s: string) => void;
  error: string;
  setError: (s: string) => void;
};
const Store = createContext<Context>(null!);
export function Provider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const scheme = useColorScheme();
  const latest = useRef(settings);
  latest.current = settings;
  const refreshing = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onReminder = (event: Event) =>
      setNotice((event as CustomEvent<string>).detail);
    window.addEventListener("bangi:reminder", onReminder);
    return () => window.removeEventListener("bangi:reminder", onReminder);
  }, []);
  useEffect(() => {
    preferences
      .load()
      .then(setSettings)
      .catch(() =>
        setError(
          "Saved settings could not be restored. Defaults are shown; your stored data has not been overwritten.",
        ),
      )
      .finally(() => setReady(true));
  }, []);
  const update = useCallback((f: (s: Settings) => Settings) => {
    const next = f(latest.current);
    latest.current = next;
    setSettings(next);
    void preferences
      .save(next)
      .catch(() =>
        setError(
          "Settings could not be saved. Check device storage and try again.",
        ),
      );
  }, []);
  useEffect(() => {
    if (!ready) return;
    const sync = () =>
      syncNotifications(latest.current).catch((e) => setError(e.message));
    void sync();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    const interval = setInterval(sync, 3600000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [
    ready,
    settings.location,
    settings.calculation,
    settings.notifications,
    settings.reminders,
  ]);
  useEffect(() => {
    if (!ready) return;
    const refresh = async () => {
      if (latest.current.locationMode !== "automatic" || refreshing.current)
        return;
      refreshing.current = true;
      try {
        const location = await refreshAutomaticLocation();
        if (location && latest.current.locationMode === "automatic")
          update((v) => ({ ...v, location }));
        else if (!location)
          setError(
            "Automatic location permission is unavailable. Showing your last selected location; choose a city or restore permission.",
          );
      } catch {
        setError(
          "Current location could not be refreshed. Showing the last selected location; prayer calculations still work offline.",
        );
      } finally {
        refreshing.current = false;
      }
    };
    void refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [ready, settings.locationMode, update]);
  const dark =
    settings.mode === "dark" ||
    (settings.mode === "system" && scheme === "dark");
  return (
    <Store.Provider
      value={{
        settings,
        update,
        palette: dark ? settings.dark : settings.light,
        scale: textScale[settings.textSize],
        ready,
        notice,
        setNotice,
        error,
        setError,
      }}
    >
      {children}
    </Store.Provider>
  );
}
export const useApp = () => useContext(Store);
