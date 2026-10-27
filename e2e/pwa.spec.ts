import { test, expect } from "@playwright/test";
const base = process.env.EXPO_PUBLIC_BASE_PATH || "";
test("install manifest, service worker and offline restart with persistent settings", async ({
  page,
  context,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-27T00:00:00Z"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    base + "/apple-touch-icon.png",
  );
  const manifest = await (
    await page.request.get(base + "/manifest.webmanifest")
  ).json();
  expect(manifest.display).toBe("standalone");
  expect(
    manifest.icons.some((i: { sizes: string }) => i.sizes === "192x192"),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Choose your location", exact: true })
    .click();
  await page
    .getByRole("button", { name: "London, United Kingdom", exact: true })
    .click();
  await expect(page.getByText("London", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("London", { exact: true })).toBeVisible();
  await expect(page.getByText(/Offline · Prayer calculations/)).toBeVisible();
  await page.goto(base + "/qibla");
  await expect(page.getByText("119.0°", { exact: true })).toBeVisible();
  await page.goto(base + "/calculation");
  await page
    .getByRole("button", {
      name: "Namaadhu Vaguthu (Maldives timetable)",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Use Malé · Malé City (T10)", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View prayer times", exact: true })
    .click();
  await expect(page.getByText("04:36", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Malé", { exact: true })).toBeVisible();
  await expect(page.getByText("04:36", { exact: true })).toBeVisible();
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
