import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import { ColorPicker } from "../src/color-picker";
import { useApp } from "../src/store";
import { Palette, presets, validColor, contrast } from "../src/theme";
import { parsePalette } from "../src/settings";
import { Button, Card, Choices, Field, Row, Screen, Txt } from "../src/ui";
function ColorEditor({
  name,
  value,
  onSave,
}: {
  name: keyof Palette;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <View style={{ gap: 8 }}>
      <Row>
        <Txt>{name.replace(/([A-Z])/g, " $1")}</Txt>
        <View
          accessibilityLabel={`Color ${value}`}
          style={{
            backgroundColor: value,
            width: 30,
            height: 30,
            borderRadius: 10,
          }}
        />
      </Row>
      <Field
        label={`${name} hex color`}
        value={draft}
        onChange={(v) => {
          setDraft(v);
          if (validColor(v)) onSave(v);
        }}
      />
      {!validColor(draft) && (
        <Txt size={12}>Enter a full six-digit color, such as #CCAF71.</Txt>
      )}
      <ColorPicker
        value={value}
        onChange={(v) => {
          setDraft(v);
          onSave(v);
        }}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {[
          "#0B2823",
          "#133B32",
          "#CCAF71",
          "#F5F0E4",
          "#526D50",
          "#101827",
          "#CB916B",
          "#FFFFFF",
          "#263D30",
          "#D6A5B5",
          "#385C9B",
          "#743C57",
        ].map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`Set ${name} to ${c}`}
            onPress={() => {
              setDraft(c);
              onSave(c);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: c,
              borderWidth: 2,
              borderColor: value === c ? value : c,
            }}
          />
        ))}
      </View>
    </View>
  );
}
export default function Appearance() {
  const { settings: s, update, palette: p } = useApp();
  const [editing, setEditing] = useState<"light" | "dark">("light");
  const [name, setName] = useState("My peaceful palette");
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const [element, setElement] = useState<keyof Palette>("background");
  const palette = s[editing];
  const saveColor = (key: keyof Palette, value: string) =>
    update((v) => ({ ...v, [editing]: { ...v[editing], [key]: value } }));
  const reset = () => {
    const action = () =>
      update((v) => ({
        ...v,
        [editing]: editing === "light" ? presets.Sand : presets.Emerald,
      }));
    if (Platform.OS === "web") {
      if (window.confirm("Reset this palette to its default colors?")) action();
    } else
      Alert.alert("Reset palette?", "Your saved custom themes will be kept.", [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: action },
      ]);
  };
  const pairs: [keyof Palette, keyof Palette][] = [
    ["text", "background"],
    ["body", "surface"],
    ["secondaryText", "background"],
    ["heading", "background"],
    ["buttonText", "button"],
    ["headerText", "header"],
    ["text", "selectedCard"],
    ["text", "unselectedCard"],
    ["countdown", "header"],
  ];
  const warnings = pairs.filter(
    ([a, b]) => contrast(palette[a], palette[b]) < 4.5,
  );
  return (
    <Screen title="Make it yours">
      <Card>
        <Txt>Appearance</Txt>
        <Choices
          values={["light", "dark", "system"]}
          value={s.mode}
          onChange={(mode) => update((v) => ({ ...v, mode }))}
        />
        <Txt>Text size</Txt>
        <Choices
          values={["Small", "Medium", "Large"]}
          value={s.textSize}
          onChange={(textSize) => update((v) => ({ ...v, textSize }))}
        />
      </Card>
      <Card>
        <Txt size={22}>Curated beginnings</Txt>
        {Object.entries(presets).map(([title, colors]) => (
          <Button
            key={title}
            secondary
            label={`Apply ${title} to ${editing}`}
            onPress={() => update((v) => ({ ...v, [editing]: { ...colors } }))}
          />
        ))}
      </Card>
      <Choices
        values={["light", "dark"]}
        value={editing}
        onChange={setEditing}
      />
      <Txt>
        Editing the {editing} palette. Change appearance above to see it
        throughout the app.
      </Txt>
      <View
        style={{
          backgroundColor: palette.background,
          padding: 20,
          borderRadius: 20,
          borderColor: palette.border,
          borderWidth: 1,
          gap: 12,
        }}
      >
        <Txt color={palette.heading} size={24}>
          A moment of peace
        </Txt>
        <Txt color={palette.body}>Your live palette preview</Txt>
        <View
          style={{
            backgroundColor: palette.selectedCard,
            padding: 18,
            borderRadius: 12,
          }}
        >
          <Txt color={palette.text}>Maghrib · selected prayer</Txt>
        </View>
        <Txt color={palette.secondaryText}>
          Secondary text and delicate details
        </Txt>
      </View>
      {warnings.length > 0 && (
        <Card>
          <Txt color={p.notification}>
            Contrast warning:{" "}
            {warnings.map(([a, b]) => `${a} on ${b}`).join(", ")}. Aim for at
            least 4.5:1 for readable text.
          </Txt>
        </Card>
      )}
      <Card>
        <Txt size={22}>Choose an interface element</Txt>
        <Choices
          values={Object.keys(palette) as (keyof Palette)[]}
          value={element}
          onChange={setElement}
        />
        <ColorEditor
          key={`${editing}:${element}`}
          name={element}
          value={palette[element]}
          onSave={(value) => saveColor(element, value)}
        />
      </Card>
      <Card>
        <Field
          label="Save a custom theme name"
          value={name}
          onChange={setName}
        />
        <Button
          label="Save both palettes"
          disabled={!name.trim()}
          onPress={() => {
            update((v) => ({
              ...v,
              savedThemes: {
                ...v.savedThemes,
                [name.trim()]: { light: { ...v.light }, dark: { ...v.dark } },
              },
            }));
            setMessage("Custom theme saved.");
          }}
        />
        {Object.entries(s.savedThemes).map(([title, theme]) => (
          <Button
            key={title}
            label={`Load ${title}`}
            secondary
            onPress={() =>
              update((v) => ({
                ...v,
                light: { ...theme.light },
                dark: { ...theme.dark },
              }))
            }
          />
        ))}
      </Card>
      <Card>
        <Field
          label="Theme JSON · copy to export, paste to import"
          value={json}
          onChange={setJson}
          multiline
        />
        <Button
          label="Export both palettes to JSON"
          onPress={() =>
            setJson(
              JSON.stringify(
                { version: 1, light: s.light, dark: s.dark },
                null,
                2,
              ),
            )
          }
        />
        <Button
          label="Validate and import JSON"
          secondary
          onPress={() => {
            try {
              const data = JSON.parse(json);
              if (data.version !== 1) throw Error("Unsupported theme version.");
              const light = parsePalette(data.light),
                dark = parsePalette(data.dark);
              update((v) => ({ ...v, light, dark }));
              setMessage("Theme imported.");
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        />
        {!!message && <Txt>{message}</Txt>}
      </Card>
      <Button label={`Reset ${editing} palette`} secondary onPress={reset} />
    </Screen>
  );
}
