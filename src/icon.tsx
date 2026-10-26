import Svg, { Path, Circle } from "react-native-svg";
import { useApp } from "./store";
export function Icon({
  name,
  color,
  size = 24,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const { palette: p } = useApp();
  const c = color || p.icon;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
    >
      {name === "home" ? (
        <Path d="M3 11 L12 3 L21 11 M5 10 V21 H10 V15 H14 V21 H19 V10" />
      ) : name === "times" ? (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M12 6 V12 L16 14" />
        </>
      ) : name === "qibla" ? (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="M16 8 L14 14 L8 16 L10 10 Z" />
        </>
      ) : (
        <>
          <Path d="M4 6 H20 M4 12 H20 M4 18 H20" />
          <Circle cx="8" cy="6" r="2" fill={p.surface} />
          <Circle cx="16" cy="12" r="2" fill={p.surface} />
          <Circle cx="10" cy="18" r="2" fill={p.surface} />
        </>
      )}
    </Svg>
  );
}
