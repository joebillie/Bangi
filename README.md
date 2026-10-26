# Bangi — an installable prayer web app

Bangi is a responsive, offline-first **PWA** for iPhone, iPad, Android browsers, and desktop. On iPhone, add it to the Home Screen from Safari: it gets its own icon and opens as an app without browser controls. No App Store account, backend, API key, or user account is required.

## Use it on iPhone

1. Host the production build at an **HTTPS** address.
2. Open that address in **Safari**.
3. Tap **Share → Add to Home Screen**. Leave **Open as Web App** enabled if offered.
4. Launch the Bangi icon, choose a location, and let it load once online before using it offline.

Safari and Home Screen apps can have separate storage depending on iOS version. Select your location and appearance again in the installed app if needed. Clearing website data or deleting the Home Screen app can remove settings. iOS may evict offline data under storage pressure; offline retention cannot be guaranteed indefinitely. Private browsing may prevent persistence.

## Develop and build

Use Node 22 LTS (22.13+) or Node 24 and npm:

```sh
npm ci
npm start             # Expo Web development server
npm run build         # Static website + offline service worker in dist/
npm run serve         # Production build locally, port 4173
```

Deploy **`dist/`** to an HTTPS static host. For root-level hosting leave `EXPO_PUBLIC_BASE_PATH` unset; GitHub Pages project hosting is configured separately below. Serve `sw.js` with JavaScript MIME type and `Cache-Control: no-cache`; serve `manifest.webmanifest` as `application/manifest+json`. Navigation routes need their exported HTML files or a fallback to `index.html`. An example Netlify configuration is included; other static hosts work too. `npm run serve` is a local validation server, not a public TLS/reverse-proxy deployment.

Development intentionally does **not** register the service worker, so cached assets cannot hide code changes. Test offline behavior with `npm run build` followed by `npm run serve`. New PWA versions activate after old pages close; reopen Bangi online to get updates. Settings live outside the service-worker cache and survive cache version changes.

The cloud machine needs a writable npm cache: `npm --cache /tmp/bangi-npm ci`. Use `EXPO_NO_TELEMETRY=1` for Expo commands here. On ordinary developer machines these overrides are unnecessary. No environment secrets are required; optional `PORT` changes the local production-server port, and `BANGI_CHROMIUM_PATH` overrides the test browser executable.

## What works

- Live local clock, destination-local Gregorian/Hijri dates, five obligatory prayers, separately labelled sunrise, and a live next-prayer countdown.
- Today's dashboard and a separate date-browsing schedule, compact/card layouts, home versus current location, recent places, and immediate updates when switching countries.
- Offline Adhan calculations: Muslim World League, Umm al-Qura, Egyptian, Karachi and ISNA; standard/Hanafi Asr; three high-latitude rules; individual adjustments from −120 to +120 minutes.
- Worldwide city search, an offline starter catalog searchable by country/region, and manual coordinate entry with offline IANA time-zone lookup. For online disambiguation use `City, Country` or `City, Region`.
- Browser geolocation with permission, timeout and failure states. Automatic mode refreshes on launch/resume when permission is already granted. Coordinates are used locally and displayed when a city name is unavailable; GPS coordinates are not sent to a reverse-geocoding server.
- Qibla bearing from the **selected** location, plus a real sensor-driven browser compass on supported phones. Motion access is requested from a tap, as Safari requires. The phone's physical coordinates correct magnetic heading toward true north with the local NOAA WMM model; this never changes your selected prayer city. Unsupported/denied sensors retain a labelled geographic bearing view.
- Independent per-prayer enablement, sound, vibration where supported, and up to four reminders at/0–180 minutes before prayer. Open-app reminders display a banner; optional system browser alerts are requested separately. A gentle generated tone needs audio enabled through a tap.
- Calendar export for the next 30 days, with independent per-prayer alarm offsets for compatible calendar apps.
- Light, dark and system appearance; Emerald & gold, Sand & sage, Midnight & copper presets; **25 independently editable semantic colors**, RGB picker, hex input, live preview, contrast warnings, separate light/dark palettes, saved custom themes, and JSON import/export.
- Three text sizes plus system scaling, screen-reader labels, scalable layouts and RTL content direction. Arabic prayer names and core navigation translations are included; some technical descriptions retain English fallback and need translation review before a fully Arabic release.
- Locally persisted preferences and location records; an install manifest, Apple touch icon, standalone metadata, and a versioned offline app shell.

## Prayer calculation details

Source: [Adhan 4.4.6](https://github.com/batoulapps/adhan-js). Luxon/IANA zones determine the selected city's civil date; calculated times are absolute instants across DST. Civil/astronomical date-line differences are handled for places such as Apia and Kiritimati. Your calculation convention remains unchanged when switching countries: there is no universally correct method per country.

Compare calculated times with your local mosque. Umm al-Qura's fixed Isha interval may require Ramadan adjustments. During polar day/night, some times may remain unavailable despite high-latitude rules; those times are labelled and excluded from reminders. Hijri dates use the browser's Islamic calendar implementation and can differ from local moon sighting.

## Honest browser limits

**A Home Screen PWA cannot reliably schedule local notifications while closed.** Bangi does not claim otherwise. In-app reminders require the page to remain visible. Safari can suspend timers when the screen locks or the app is backgrounded; reminders more than two minutes late are skipped rather than delivered in a burst. The queue refreshes on settings changes, resume and while running. A local delivered-ID history, and Web Locks where available, reduce duplicates across tabs.

Optional system alerts require HTTPS, browser permission and platform support. iPhone Web Push generally requires a Home Screen installation and iOS 16.4+, but scheduled push while the app is closed also requires a push backend, which this project intentionally does not have. `showNotification` is attempted only when permitted; the in-app banner remains the fallback. Sound is unlocked by the enable gesture and can still be suppressed by Safari or device settings. iPhone does not support browser vibration. Focus modes and system settings always control presentation.

For reminders managed outside Bangi, export the `.ics` file and import it into a calendar that supports event alarms. Calendar software may ignore imported alarms or control them differently. On iPhone, use the downloaded file's share/open options with a compatible calendar app; if Apple Calendar does not offer direct import, import on a Mac/desktop calendar and sync it to the phone. Calendar entries do not update when Bangi settings change. Delete the previous imported calendar/events before importing a replacement; importing repeatedly can duplicate events. Sound/vibration are controlled by the calendar app, not by `.ics`.

Compass heading requires a supported **absolute** orientation source. Relative alpha is not treated as north. Hold the phone flat in portrait; landscape/tilted readings are rejected with guidance. Browser accuracy is uncertain, so alignment is approximate. Magnets, cars and electronics distort readings. If physical location or the WMM date range is unavailable, the app retains the geographic bearing instead of silently substituting magnetic north. The bundled WMM-2025 model covers 2025–2030. When following a fixed home city while travelling, the displayed Qibla bearing belongs to that selected city.

## Privacy and networking

Calculations, coordinate-to-time-zone lookup (`tz-lookup`), magnetic declination (`geomagnetism`) and settings stay on device. Browser geolocation is provided by the OS/browser; no coordinates are sent by Bangi to a geocoder. Online city search sends only search text to `geocoding-api.open-meteo.com` (Open-Meteo / GeoNames). No analytics, account, push subscription or backend is used.

The cloud environment initially denied Open-Meteo access. Its hostname was added to the saved network draft; review/save the environment settings and publish to activate it. Saving a draft does not prove live connectivity. Offline city and coordinate entry work independently. A public website user's connectivity is determined by that user's browser/network, separately from the cloud build environment.

## Structure

```text
app/(tabs)/          Home, date-browsing schedule, Qibla, settings
app/location.tsx    Current/home/recent places, search and coordinates
app/calculation.tsx Calculation conventions and per-prayer adjustments
app/reminders.tsx   Open-app reminders, optional alerts and calendar export
app/appearance.tsx  Palettes, visual/hex color editors and theme JSON
app/install.tsx    iPhone installation, storage and permission guidance
app/+html.tsx      PWA/Apple metadata and document shell
src/prayer.ts      Local prayer dates, astronomical calculation and Qibla
src/location.ts    Browser geolocation and online search adapters
src/browser-heading.ts Absolute heading validation and declination correction
src/compass.ts     Safari permission gesture, sensor events, focus cleanup
src/notifications.ts Foreground timers, banners, audio and browser alerts
src/reminders.ts   Pure reminder planner
src/calendar.ts    Calendar events with UTC instants and per-prayer alarms
src/persistence.ts Injectable serialized storage
src/settings.ts    Typed preferences and validation
src/theme.ts       Color/typography tokens and contrast checks
src/ui.tsx         Shared scalable components
src/pwa.tsx        Installation/offline status and worker registration
public/            Manifest and install icons
scripts/build-pwa.mjs Versioned precache generation after Expo export
```

React/TypeScript with Expo Router and React Native Web provide the responsive UI. The target is a **website/PWA**; Xcode, Android Studio, native builds and App Store publishing are not needed. Original icon artwork is included; `scripts/generate-icon.py` can regenerate the master with Python/Pillow (not a build dependency).

## Verification

```sh
npm test            # 24 actual logic/service cases, not just file-load checks
npm run typecheck
npm run lint
npm run test:e2e    # Interactive browser workflows, dev server
npm run build
npm run test:pwa    # Production manifest, worker and offline reload test
```

Browser tests use system Chromium when available. Otherwise install Playwright Chromium with `npx playwright install chromium`; `BANGI_CHROMIUM_PATH` can select an executable. The PWA suite requires a current `dist/` build. Network sandbox restrictions may require allowing localhost server execution for browser tests.

Logic tests cover reference prayer times, multiple methods/countries, high latitudes, DST, midnight/date-line rollover, Asr, adjustments, bearing wrapping, absolute versus relative browser heading, magnetic correction, sensor ownership, reminder offsets/preferences/cancellation, stale notification suppression, calendar alarms, persistence/failure recovery, theme validation/contrast/scaling and offline country search.

The browser suites check offline city selection, home switching, calculation controls, Qibla fallback, theme validation, persistence, RTL/large layouts, install metadata, service-worker installation and a full offline restart. Chromium tests are not a substitute for Safari hardware testing.

Before a public release, verify on a real iPhone: Add to Home Screen and standalone launch; offline relaunch; storage after restart; denied/revoked location and motion permissions; physical compass rotation/calibration; foreground audio and reminder behavior; calendar import; VoiceOver and large Dynamic Type. Verify external geocoding from the final HTTPS host. Full Arabic translation and linguistic review remain a separate release task.

## GitHub Pages deployment

`.github/workflows/deploy.yml` builds, validates and publishes on pushes to `main`. It uses the repository's GitHub token (no application API keys). For GitHub Pages project hosting, it sets `EXPO_PUBLIC_BASE_PATH=/Bangi`, which scopes navigation, assets, the manifest and offline cache to that path. On other root-level hosts leave the variable unset.

Enable Pages once in the repository's **Settings → Pages → Source: GitHub Actions**, then rerun **Deploy Bangi web app**. Repository/organization policy or private-repository plan restrictions can prevent Pages hosting. A workflow file or successful push alone does not establish that the site is live; verify the deployment and HTTPS address before installing it on iPhone.
