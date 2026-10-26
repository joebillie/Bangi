export const emerald = {
  background: "#0B2823",
  surface: "#133B32",
  header: "#10352D",
  headerText: "#F5F0E4",
  accent: "#CCAF71",
  secondaryAccent: "#8FB9A5",
  prayerCard: "#153A32",
  selectedCard: "#285344",
  unselectedCard: "#12362E",
  text: "#F5F0E4",
  secondaryText: "#B1C9BF",
  heading: "#FAF4E5",
  body: "#E2EAE3",
  icon: "#CCAF71",
  button: "#CCAF71",
  buttonText: "#102D25",
  border: "#33564A",
  activeNav: "#E3C78C",
  inactiveNav: "#9BB4A9",
  notification: "#E4BC70",
  compassDial: "#355D4F",
  qibla: "#E5C17A",
  countdown: "#FAE5B1",
  decoration: "#9B824C",
};
export type Palette = typeof emerald;
export const sand: Palette = {
  ...emerald,
  background: "#F7F4EB",
  surface: "#FFFFFF",
  header: "#E6E9DC",
  headerText: "#284536",
  accent: "#526D50",
  secondaryAccent: "#987A46",
  prayerCard: "#EEEEE3",
  selectedCard: "#DEE7D6",
  unselectedCard: "#FFFFFF",
  text: "#263D30",
  secondaryText: "#546453",
  heading: "#263D30",
  body: "#354B3C",
  icon: "#526D50",
  button: "#3F624C",
  buttonText: "#FFFFFF",
  border: "#CED5C5",
  activeNav: "#35563F",
  inactiveNav: "#657461",
  notification: "#775916",
  compassDial: "#9DAE96",
  qibla: "#8A6422",
  countdown: "#35563F",
  decoration: "#A1936B",
};
export const midnight: Palette = {
  ...emerald,
  background: "#101827",
  surface: "#1E2C42",
  header: "#19263B",
  accent: "#CB916B",
  button: "#CB916B",
  selectedCard: "#314159",
  unselectedCard: "#1B293C",
  prayerCard: "#213047",
  buttonText: "#172135",
  border: "#405069",
  qibla: "#E9AA7F",
  decoration: "#956D54",
};
export const presets = { Emerald: emerald, Sand: sand, Midnight: midnight };
export const validColor = (v: unknown): v is string =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
export const textScale = { Small: 0.9, Medium: 1, Large: 1.2 };
export function contrast(a: string, b: string) {
  const lum = (s: string) => {
    const c = s
      .slice(1)
      .match(/../g)!
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export const typography = {
  caption: 12,
  label: 13,
  body: 16,
  subheading: 20,
  heading: 34,
  countdown: 44,
};
