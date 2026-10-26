import { useState } from "react";
import { useApp } from "../src/store";
import { methods, prayers, Prayer } from "../src/prayer";
import { Button, Card, Choices, Field, Screen, Toggle, Txt } from "../src/ui";
function Adjustment({ prayer }: { prayer: Prayer }) {
  const { settings: s, update } = useApp();
  const [value, setValue] = useState(String(s.calculation.adjustments[prayer]));
  const n = Number(value);
  const valid =
    value.trim() !== "" && Number.isInteger(n) && Math.abs(n) <= 120;
  return (
    <Card>
      <Field
        label={`${prayer} adjustment · minutes (−120 to 120)`}
        keyboardType="numeric"
        value={value}
        onChange={setValue}
      />
      <Button
        label="Apply adjustment"
        disabled={!valid}
        onPress={() =>
          update((v) => ({
            ...v,
            calculation: {
              ...v.calculation,
              adjustments: { ...v.calculation.adjustments, [prayer]: n },
            },
          }))
        }
      />
    </Card>
  );
}
export default function Calculation() {
  const { settings: s, update } = useApp();
  return (
    <Screen title="A considered calculation">
      <Txt>
        Methods differ by institution. Choose the convention recommended by your
        local mosque; the app never infers a universal method from your country.
      </Txt>
      <Card>
        <Txt>Calculation method</Txt>
        <Choices
          values={methods}
          value={s.calculation.method}
          onChange={(method) =>
            update((v) => ({ ...v, calculation: { ...v.calculation, method } }))
          }
        />
        <Txt size={12}>
          NorthAmerica = ISNA. UmmAlQura uses the library’s fixed Isha interval;
          consult your mosque for Ramadan adjustments.
        </Txt>
        <Toggle
          label="Hanafi Asr (double shadow)"
          value={s.calculation.hanafi}
          onChange={(hanafi) =>
            update((v) => ({ ...v, calculation: { ...v.calculation, hanafi } }))
          }
        />
        <Txt>High-latitude rule</Txt>
        <Choices
          values={["middle", "seventh", "angle"]}
          value={s.calculation.highLatitude}
          onChange={(highLatitude) =>
            update((v) => ({
              ...v,
              calculation: { ...v.calculation, highLatitude },
            }))
          }
        />
        <Txt size={12}>
          Middle of night · Seventh of night · Twilight angle. At polar extremes
          some times may remain unavailable; follow local scholarly guidance.
        </Txt>
      </Card>
      {prayers.map((p) => (
        <Adjustment key={p} prayer={p} />
      ))}
    </Screen>
  );
}
