import { Screen, Card, Txt } from "../src/ui";
export default function Install() {
  return (
    <Screen title="Bangi, on your Home Screen">
      <Card>
        <Txt size={23}>Install on iPhone or iPad</Txt>
        <Txt>1. Open Bangi’s HTTPS address in Safari.</Txt>
        <Txt>2. Tap Share, then Add to Home Screen.</Txt>
        <Txt>
          3. Keep “Open as Web App” enabled if Safari offers it, then tap Add.
        </Txt>
        <Txt>
          4. Open the Bangi icon and choose your location. Let the first page
          load online before relying on offline access.
        </Txt>
      </Card>
      <Card>
        <Txt size={23}>Your preferences stay here</Txt>
        <Txt>
          The installed app stores settings on this device. Safari and the Home
          Screen app can use separate storage depending on iOS version; choose
          your location and theme again in the installed app if needed. Removing
          the app or clearing website data can erase preferences. Private
          browsing and low storage can prevent saving or cause offline data
          eviction.
        </Txt>
      </Card>
      <Card>
        <Txt size={23}>Permissions</Txt>
        <Txt>
          For current location, allow location access when asked. For Qibla, tap
          Start live compass, allow motion/orientation and location, and hold
          your phone flat in portrait. Denied permissions can be changed in iOS
          Settings → Apps → Safari (or Safari’s website settings); labels vary
          by iOS version.
        </Txt>
        <Txt>
          Prayer calculations and manual cities do not need GPS. Browser alerts
          require HTTPS and browser support; iOS may require installing to the
          Home Screen. In-app reminders work only while Bangi is visible. Use
          calendar export for alerts managed outside Bangi.
        </Txt>
      </Card>
      <Card>
        <Txt size={23}>Other browsers</Txt>
        <Txt>
          On Android, use Chrome’s Install app / Add to Home Screen menu. On
          desktop, use your browser’s install button when available or bookmark
          Bangi. The core prayer schedule and customization work without
          installing.
        </Txt>
      </Card>
    </Screen>
  );
}
