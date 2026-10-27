import { useState } from "react";
import { router } from "expo-router";
import { useApp } from "../../src/store";
import {
  Button,
  Card,
  Choices,
  Field,
  Screen,
  Toggle,
  Txt,
} from "../../src/ui";
export default function Settings() {
  const { settings: s, update } = useApp();
  const [query, setQuery] = useState("");
  const items = [
    ["Location & region", "/location"],
    ["Prayer calculation", "/calculation"],
    ["Prayer reminders", "/reminders"],
    ["Appearance, colors & typography", "/appearance"],
  ] as const;
  return (
    <Screen title="A space that feels like you">
      <Field label="Search settings" value={query} onChange={setQuery} />
      {items
        .filter(([title]) => title.toLowerCase().includes(query.toLowerCase()))
        .map(([label, path]) => (
          <Button
            key={path}
            label={`${label}  ↗`}
            secondary
            onPress={() => router.push(path)}
          />
        ))}
      <Card>
        <Txt size={22}>Language & calendar</Txt>
        <Toggle
          label="Show Arabic prayer names"
          value={s.arabic}
          onChange={(arabic) => update((v) => ({ ...v, arabic }))}
        />
        <Txt>Interface language</Txt>
        <Choices
          values={["en", "ar"]}
          value={s.language}
          onChange={(language) => update((v) => ({ ...v, language }))}
        />
        <Txt>Calendar display</Txt>
        <Choices
          values={["both", "gregorian", "hijri"]}
          value={s.calendar}
          onChange={(calendar) => update((v) => ({ ...v, calendar }))}
        />
        <Txt size={12}>
          Hijri dates use the device’s Islamic calendar implementation and can
          differ from local moon sighting.
        </Txt>
      </Card>
      <Card>
        <Txt size={22}>About Bangi</Txt>
        <Txt>
          Prayer times use Adhan’s astronomical calculations on your device.
          Location search uses Open-Meteo and GeoNames. Automatic location uses
          your browser’s geolocation service; coordinates stay on this device.
          Core features work locally. Optional background notifications use an
          anonymous server installation and store only the prayer location,
          calculation/source, reminder settings and push subscription after you
          opt in.
        </Txt>
        <Txt>
          Install from Safari with Share → Add to Home Screen. Prayer times and
          preferences work offline after the first load. Live compass access
          depends on Safari permissions. Foreground reminders work while Bangi
          is open. Optional background notifications need a connected backend;
          calendar export remains available.
        </Txt>
        <Button
          label="Browser permissions & installation help"
          secondary
          onPress={() => router.push("/install")}
        />
        <Txt size={12}>Bangi 1.0 · Made for a quieter daily rhythm</Txt>
      </Card>
    </Screen>
  );
}
