import { View } from "react-native";
import Svg, { Circle, Line, Text as SvgText, Path } from "react-native-svg";
import { router } from "expo-router";
import { useApp } from "../../src/store";
import { bearing, relativeBearing } from "../../src/prayer";
import { translate } from "../../src/i18n";
import { useHeading } from "../../src/compass";
import { Button, Card, Screen, Txt } from "../../src/ui";
export default function Qibla() {
  const { settings: s, palette: p } = useApp();
  const { heading, message, reliable, start } = useHeading();
  const ar = s.language === "ar";
  const t = (text: string) => translate(text, s.language);
  const b = s.location ? bearing(s.location) : 0;
  const angle = heading === null ? b : relativeBearing(b, heading);
  const near = heading !== null && Math.abs(angle) < 5;
  const aligned = reliable && near;
  return (
    <Screen title="Turn toward Makkah" kicker="QIBLA · FIND YOUR STILLNESS">
      {!s.location ? (
        <Button
          label="Select a location"
          onPress={() => router.push("/location")}
        />
      ) : (
        <>
          <Txt color={p.secondaryText}>
            {s.location.name} ·{" "}
            {s.locationMode === "manual"
              ? t("Fixed location")
              : t("Current location")}
          </Txt>
          <View
            accessible
            accessibilityLabel={
              ar
                ? `اتجاه القبلة ${b.toFixed(1)} درجة من الشمال الحقيقي. ${heading === null ? "اتجاه الجهاز غير متاح" : `اتجاه الجهاز ${heading.toFixed(0)} درجة. ${aligned ? "أنت باتجاه القبلة" : ""}`}`
                : `Qibla ${b.toFixed(1)} degrees from true north. ${heading === null ? "Device heading unavailable" : `Device heading ${heading.toFixed(0)} degrees. ${aligned ? "Aligned with Qibla" : ""}`}`
            }
            style={{ alignItems: "center" }}
          >
            <Svg width="100%" height={330} viewBox="0 0 320 330">
              <Circle
                cx="160"
                cy="165"
                r="140"
                fill={p.surface}
                stroke={p.compassDial}
                strokeWidth="2"
              />
              <Circle cx="160" cy="165" r="115" stroke={p.border} fill="none" />
              {Array.from({ length: 72 }, (_, i) => (
                <Line
                  key={i}
                  x1="160"
                  y1="30"
                  x2="160"
                  y2={i % 6 === 0 ? "44" : "36"}
                  stroke={p.compassDial}
                  strokeWidth={i % 6 === 0 ? 2 : 1}
                  transform={`rotate(${i * 5 - (heading || 0)} 160 165)`}
                />
              ))}
              {(ar ? ["شمال", "شرق", "جنوب", "غرب"] : ["N", "E", "S", "W"]).map(
                (v, i) => (
                  <SvgText
                    key={v}
                    x={
                      160 +
                      99 * Math.sin(((i * 90 - (heading || 0)) * Math.PI) / 180)
                    }
                    y={
                      171 -
                      99 * Math.cos(((i * 90 - (heading || 0)) * Math.PI) / 180)
                    }
                    fill={p.secondaryText}
                    textAnchor="middle"
                    fontSize="17"
                  >
                    {v}
                  </SvgText>
                ),
              )}
              <Path
                d="M160 67 L177 177 L160 163 L143 177 Z"
                fill={p.qibla}
                transform={`rotate(${angle} 160 165)`}
              />
              <Circle cx="160" cy="165" r="7" fill={p.accent} />
            </Svg>
          </View>
          <Card selected={near}>
            <Txt size={32} color={p.qibla}>
              {b.toFixed(1)}°
            </Txt>
            <Txt size={20}>
              {near
                ? aligned
                  ? "✓ You are facing the Qibla"
                  : "≈ Near Qibla · accuracy unverified"
                : heading === null
                  ? "Bearing from true north"
                  : ar
                    ? `استدر ${Math.abs(angle).toFixed(0)}° ${angle >= 0 ? "مع عقارب الساعة" : "عكس عقارب الساعة"}`
                    : `Turn ${Math.abs(angle).toFixed(0)}° ${angle >= 0 ? "clockwise" : "counterclockwise"}`}
            </Txt>
            <Txt color={p.secondaryText}>
              {heading === null
                ? "North is shown at the top in this fallback view. Align north using a reliable external compass."
                : ar
                  ? `اتجاه الجهاز: ${heading.toFixed(0)}° من الشمال الحقيقي`
                  : `Device heading: ${heading.toFixed(0)}° true north`}
            </Txt>
            <Button label="Start live compass" onPress={start} />
            <Txt>{message}</Txt>
          </Card>
          <Txt size={13} color={p.secondaryText}>
            Alignment is approximate even with calibrated sensors. Nearby
            magnets, cases, cars, and electronics can distort sensors. This view
            is designed for a flat phone in portrait orientation. For a fixed
            home city while travelling, this bearing belongs to that city, not
            your physical position.
          </Txt>
        </>
      )}
    </Screen>
  );
}
