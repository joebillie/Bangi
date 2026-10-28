import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync("dist/sw.js", "utf8");
const root = JSON.parse(
  fs.readFileSync("dist/manifest.webmanifest", "utf8"),
).scope;
function worker() {
  const handlers = new Map(),
    shown = [],
    opened = [];
  const self = {
    location: { origin: "https://example.com" },
    registration: {
      showNotification: async (title, options) =>
        shown.push({ title, options }),
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url) => opened.push(url),
    },
    addEventListener: (name, fn) => handlers.set(name, fn),
  };
  vm.runInNewContext(source, { self, URL, caches: {} });
  const fire = async (name, extra) => {
    const pending = [];
    handlers.get(name)({
      ...extra,
      waitUntil: (promise) => pending.push(promise),
    });
    await Promise.all(pending);
  };
  return { fire, shown, opened };
}
test("push receiver presents the prayer name, stable tag and silent preference", async () => {
  const w = worker();
  await w.fire("push", {
    data: {
      json: () => ({
        title: "Fajr · 04:36",
        body: "Time for prayer",
        tag: "bangi:fajr",
        silent: true,
        vibrate: [200, 100, 200],
      }),
    },
  });
  assert.equal(w.shown.length, 1);
  assert.equal(w.shown[0].title, "Fajr · 04:36");
  assert.equal(w.shown[0].options.tag, "bangi:fajr");
  assert.equal(w.shown[0].options.silent, true);
  assert.equal(w.shown[0].options.icon, root + "icon-192.png");
});
test("malformed push payloads still show a safe visible notification", async () => {
  const w = worker();
  await w.fire("push", {
    data: {
      json: () => {
        throw Error("Invalid payload");
      },
    },
  });
  assert.equal(w.shown[0].title, "Bangi prayer reminder");
  assert.equal(
    w.shown[0].options.body,
    "Open Bangi to check your prayer times.",
  );
});
test("notification clicks cannot redirect to a payload-supplied site", async () => {
  const w = worker();
  await w.fire("push", {
    data: {
      json: () => ({
        title: "x".repeat(500),
        url: "https://attacker.example/",
      }),
    },
  });
  assert.equal(w.shown[0].title.length, 120);
  let closed = false;
  await w.fire("notificationclick", {
    notification: {
      close: () => {
        closed = true;
      },
      data: { url: "https://attacker.example/" },
    },
  });
  assert.equal(closed, true);
  assert.deepEqual(w.opened, [root]);
});
