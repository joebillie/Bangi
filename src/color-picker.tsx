import { useState } from "react";
import { Pressable, View } from "react-native";
import { useApp } from "./store";
import { Txt } from "./ui";
import { validColor } from "./theme";
export function rgbHex(values: number[]) {
  return (
    "#" +
    values
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { palette: p } = useApp();
  const [width, setWidth] = useState(240);
  if (!validColor(value)) return null;
  const channels = value
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16));
  return (
    <View style={{ gap: 10 }}>
      {["Red", "Green", "Blue"].map((name, i) => (
        <View key={name} style={{ gap: 4 }}>
          <Txt size={12}>
            {name} · {channels[i]}
          </Txt>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={`${name} color channel`}
            accessibilityValue={{ min: 0, max: 255, now: channels[i] }}
            accessibilityActions={[
              { name: "increment" },
              { name: "decrement" },
            ]}
            onAccessibilityAction={(e) => {
              const next = [...channels];
              next[i] =
                channels[i] +
                (e.nativeEvent.actionName === "increment" ? 5 : -5);
              onChange(rgbHex(next));
            }}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onPress={(e) => {
              const next = [...channels];
              next[i] = Math.round((e.nativeEvent.locationX / width) * 255);
              onChange(rgbHex(next));
            }}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <View
              style={{
                flexDirection: "row",
                height: 24,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {Array.from({ length: 32 }, (_, n) => {
                const c = [...channels];
                c[i] = (n / 31) * 255;
                return (
                  <View
                    key={n}
                    style={{ flex: 1, backgroundColor: rgbHex(c) }}
                  />
                );
              })}
            </View>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: `${(channels[i] / 255) * 96}%`,
                width: 10,
                height: 34,
                borderWidth: 2,
                borderColor: p.text,
                borderRadius: 4,
                backgroundColor: value,
              }}
            />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
