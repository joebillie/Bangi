# Maldives timetable snapshot

`maldives-timetable.json` stores factual prayer-time and island-coordinate data for the Namaadhu Vaguthu source. It contains 202 islands and 42 bands × 366 month/day entries. Entry order is Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha; values are local minutes since midnight. Add the island's `offset` before displaying times in `Indian/Maldives` (UTC+5).

Data was imported from the public [itsMaadh/maldives-prayer-times](https://github.com/itsMaadh/maldives-prayer-times) SQL dataset, then checked directly against [Namaadhu Vaguthu](https://namaadhuvaguthu.com/en). No website application code or third-party SQL code is executed or bundled. The data metadata records the input SHA-256 and import date. The original Namaadhu Vaguthu website credits **dash8x**.

The checks in `tests/fixtures/namaadhu-vaguthu.json` contain 47 published daily timetables: one island for every band, additional positive/negative island offsets, January/July seasonal dates, and leap day. All six clock values matched exactly on 27 October 2026. These checks cover representative island/date combinations; they are not a claim that every future website revision is automatically synchronized.

The SQL dataset uses dummy leap year `0004`; the app maps month/day through leap year 2000. It does **not** treat these as year-4 timestamps or use the current year's ordinal, which would shift all dates after February in non-leap years.

To update, download the public SQL dataset through HTTPS, inspect its provenance and diff, run `python3 scripts/import-maldives-timetable.py /path/to/maldives_prayer_times.sql`, then `python3 scripts/verify-maldives-source.py` with source-network access. The verifier uses curl with normal TLS verification, two concurrent requests, and short spacing. Review the generated data/fixtures, run tests, and redeploy. Re-running verification is a manual maintenance operation, not a request made by every app user.

This is a bundled snapshot of a recurring timetable. It works offline, does not send a user's location to the provider, and does not claim live synchronization or official endorsement. Exact islands must be selected; unsupported locations produce an explicit empty state rather than a guessed island or a different method. Asr/high-latitude calculation controls are not applied to published values. Source-specific manual adjustments are stored independently and default to zero.
