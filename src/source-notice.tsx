import { Linking } from "react-native";
import { router } from "expo-router";
import { DateTime } from "luxon";
import { useApp } from "./store";
import { namaadhuUnavailable, namaadhuSourceUrl } from "./maldives";
import { Button, Card, Txt } from "./ui";
export function SourceNotice() {
  const { settings: s } = useApp();
  if (s.calculation.method !== "NamaadhuVaguthu") return null;
  const unavailable = namaadhuUnavailable(s.location, s.calculation);
  return (
    <Card>
      <Txt size={20}>Namaadhu Vaguthu</Txt>
      <Txt>
        {unavailable
          ? "Choose an island from the Maldives timetable in calculation settings. This source does not cover other countries; no substitute calculation will be shown."
          : "Published Maldives island timetable · Available offline. Check your selected island against the source; this is a stored timetable snapshot, not a live feed."}
      </Txt>
      {unavailable && (
        <Button
          label="Choose timetable island"
          onPress={() => router.push("/calculation")}
        />
      )}
      <Button
        label="Open original timetable"
        secondary
        onPress={() =>
          void Linking.openURL(
            s.location?.namaadhuIslandId
              ? `${namaadhuSourceUrl}/prayertimes/${s.location.namaadhuIslandId}/${DateTime.now().setZone("Indian/Maldives").toFormat("yyyy/MM/dd")}`
              : namaadhuSourceUrl,
          )
        }
      />
    </Card>
  );
}
