import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import geomagnetism from "geomagnetism";
import { browserHeading, BrowserReading } from "./browser-heading";
import { smoothHeading, startHeadingSession } from "./heading-session";
type SafariOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<string>;
};
export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [reliable, setReliable] = useState(false);
  const [message, setMessage] = useState(
    "Tap Start live compass, allow motion and location, then hold your phone flat in portrait.",
  );
  const [session, setSession] = useState<{
    declination: number;
    id: number;
  } | null>(null);
  const start = async () => {
    setHeading(null);
    setReliable(false);
    setMessage("Checking compass access…");
    try {
      if (!window.isSecureContext)
        throw Error(
          "The live compass needs HTTPS. The calculated geographic bearing is available below.",
        );
      if (typeof DeviceOrientationEvent === "undefined")
        throw Error(
          "This browser has no compass access. Use the geographic bearing below.",
        );
      const orientation = DeviceOrientationEvent as SafariOrientation;
      // Safari requires this request directly inside the button gesture, before any other await.
      if (
        orientation.requestPermission &&
        (await orientation.requestPermission(true)) !== "granted"
      )
        throw Error(
          "Motion permission was denied. Enable Motion & Orientation Access in Safari or use the geographic bearing.",
        );
      if (!navigator.geolocation)
        throw Error(
          "Location is unavailable. True-north correction needs your physical coordinates.",
        );
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000,
          }),
      );
      const declination = geomagnetism
        .model(new Date())
        .point([position.coords.latitude, position.coords.longitude]).decl;
      setSession({ declination, id: Date.now() });
      setMessage(
        "Hold your phone flat in portrait and slowly turn. Your GPS is used locally to correct magnetic north; your selected prayer city stays unchanged.",
      );
    } catch (error) {
      setSession(null);
      setMessage(
        typeof error === "object" && error !== null && "code" in error
          ? Number(error.code) === 1
            ? "Location permission denied. Use the geographic bearing below."
            : Number(error.code) === 3
              ? "Location request timed out. Use the geographic bearing below."
              : "Location could not be determined. Use the geographic bearing below."
          : error instanceof Error
            ? error.message
            : "Compass permission or location was unavailable. Use the geographic bearing below.",
      );
    }
  };
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let readingCallback: (value: {
        trueHeading: number;
        accuracy: number;
      }) => void = () => {};
      const onOrientation = (event: DeviceOrientationEvent) => {
        const angle =
          screen.orientation?.angle ||
          (window as Window & { orientation?: number }).orientation ||
          0;
        if (Math.abs(angle) % 180 === 90) {
          setHeading(null);
          setReliable(false);
          setMessage("Rotate your phone to portrait and hold it flat.");
          return;
        }
        const reading = browserHeading(
          event as DeviceOrientationEvent & BrowserReading,
          session.declination,
        );
        if (!reading) {
          setHeading(null);
          setReliable(false);
          setMessage(
            "Hold your phone flat. An absolute compass reading is required; relative orientation alone cannot find north.",
          );
          return;
        }
        readingCallback({
          trueHeading: reading.heading,
          accuracy: reading.reliable ? 3 : 1,
        });
      };
      return startHeadingSession(
        {
          available: async () => true,
          permission: async () => true,
          watch: async (callback) => {
            readingCallback = callback;
            window.addEventListener("deviceorientation", onOrientation);
            window.addEventListener(
              "deviceorientationabsolute",
              onOrientation as EventListener,
            );
            return {
              remove() {
                window.removeEventListener("deviceorientation", onOrientation);
                window.removeEventListener(
                  "deviceorientationabsolute",
                  onOrientation as EventListener,
                );
              },
            };
          },
        },
        (value) => {
          setHeading((previous) => smoothHeading(previous, value.trueHeading));
          setReliable(value.accuracy >= 3);
          setMessage(
            value.accuracy >= 3
              ? "True-north estimate · Keep away from magnets and metal."
              : "Heading accuracy is uncertain. Calibrate with a figure eight, keep the phone flat, and compare with an independent compass.",
          );
        },
        setMessage,
      );
    }, [session]),
  );
  return {
    heading,
    reliable,
    message,
    start: () => {
      void start();
    },
  };
}
