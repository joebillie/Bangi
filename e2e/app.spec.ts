import { test, expect } from "@playwright/test";
test("offline city selection, dashboard, Qibla, appearance and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    Object.defineProperty(window, "DeviceOrientationEvent", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Choose your location", exact: true })
    .click();
  await page
    .getByRole("button", { name: "London, United Kingdom", exact: true })
    .click();
  await expect(
    page.getByText("Assalamu alaikum", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("London", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Sunrise · not an obligatory prayer/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open Qibla ↗", exact: true }).click();
  await expect(page.getByText("119.0°", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Start live compass", exact: true })
    .click();
  await expect(
    page.getByText(
      "This browser has no compass access. Use the geographic bearing below.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await page.goto("/appearance");
  await page.getByRole("button", { name: "dark", exact: true }).first().click();
  await page.getByRole("button", { name: "Large", exact: true }).click();
  await page
    .getByRole("button", { name: "Save both palettes", exact: true })
    .click();
  await expect(
    page.getByText("Custom theme saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Load My peaceful palette", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("London", { exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/bangi-home.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("country switching, calculation editing, theme validation and large RTL layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Choose your location", exact: true })
    .click();
  await page.getByRole("button", { name: "Tokyo, Japan", exact: true }).click();
  await expect(page.getByText(/Asia\/Tokyo/)).toBeVisible();
  await page.goto("/calculation");
  await page.getByRole("button", { name: "Karachi", exact: true }).click();
  await page
    .getByRole("switch", { name: "Hanafi Asr (double shadow)", exact: true })
    .click();
  await page.goto("/");
  await expect(page.getByText(/Karachi · Hanafi Asr/)).toBeVisible();
  await page.goto("/location");
  await page
    .getByRole("button", { name: "Save active city as home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New York, United States", exact: true })
    .click();
  await expect(page.getByText(/America\/New_York/)).toBeVisible();
  await page.goto("/location");
  await page
    .getByRole("button", { name: "Use home · Tokyo", exact: true })
    .click();
  await expect(page.getByText("Tokyo", { exact: true })).toBeVisible();
  await page.goto("/appearance");
  await page.getByRole("button", { name: "Large", exact: true }).click();
  await page
    .getByRole("textbox", { name: "background hex color", exact: true })
    .fill("invalid");
  await expect(
    page.getByText("Enter a full six-digit color, such as #CCAF71.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "background hex color", exact: true })
    .fill("#f1f2f3");
  await page
    .getByRole("button", { name: "Export both palettes to JSON", exact: true })
    .click();
  const exported = JSON.parse(
    await page
      .getByRole("textbox", {
        name: "Theme JSON · copy to export, paste to import",
        exact: true,
      })
      .inputValue(),
  );
  expect(exported.light.background).toBe("#f1f2f3");
  await page.goto("/settings");
  await page.getByRole("button", { name: "ar", exact: true }).click();
  await expect(page.getByText("اللغة والتقويم", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: "/tmp/bangi-tablet-rtl.png" });
  expect(errors).toEqual([]);
});

test("Namaadhu Vaguthu island source survives restart and refuses unsupported countries", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-27T00:00:00Z"));
  await page.goto("/calculation");
  await page
    .getByRole("button", {
      name: "Namaadhu Vaguthu (Maldives timetable)",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Maldives timetable island", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Hanafi Asr (double shadow)" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use Malé · Malé City (T10)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View prayer times", exact: true })
    .click();
  await expect(page.getByText("Malé", { exact: true })).toBeVisible();
  for (const time of ["04:36", "05:49", "11:54", "15:11", "17:52", "19:04"])
    await expect(page.getByText(time, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Malé", { exact: true })).toBeVisible();
  await page.goto("/reminders");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export 30 days to calendar", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("bangi-prayer-times.ics");
  await page.goto("/location");
  await page
    .getByRole("button", { name: "London, United Kingdom", exact: true })
    .click();
  await expect(
    page.getByText(/This source does not cover other countries/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose timetable island", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("04:36", { exact: true })).toHaveCount(0);
});

test("background push stays disconnected without a deployed service and sends no prayer data", async ({
  page,
}) => {
  const cloudRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes(".supabase.co"))
      cloudRequests.push(request.url());
  });
  await page.goto("/reminders");
  await expect(
    page.getByText(
      "Background notifications are not connected to a backend yet.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Enable background notifications",
      exact: true,
    }),
  ).toBeDisabled();
  expect(cloudRequests).toEqual([]);
});
