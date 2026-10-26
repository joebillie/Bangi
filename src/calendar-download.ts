import { Settings } from "./settings";
import { calendarExport } from "./calendar";
export function downloadCalendar(s: Settings) {
  const blob = new Blob([calendarExport(s)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bangi-prayer-times.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
