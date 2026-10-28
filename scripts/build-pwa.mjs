import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = path.resolve("dist");
const base = (process.env.EXPO_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const manifestPath = path.join(root, "manifest.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.id = manifest.start_url = manifest.scope = base + "/";
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: base + icon.src,
}));
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
fs.writeFileSync(path.join(root, ".nojekyll"), "");
// A project-site deep link can fall back to the SPA through GitHub Pages' 404 page.
fs.copyFileSync(path.join(root, "index.html"), path.join(root, "404.html"));
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : [path.join(dir, e.name)],
    );
}
const assets = files(root).filter(
  (f) =>
    !f.endsWith(".map") &&
    !f.endsWith("/sw.js") &&
    !f.endsWith("/metadata.json"),
);
const version = crypto.createHash("sha256");
for (const file of assets) {
  version.update(file.slice(root.length));
  version.update(fs.readFileSync(file));
}
const urls = assets.map(
  (file) => base + file.slice(root.length).replaceAll(path.sep, "/"),
);
urls.push(base + "/");
const sw = `const CACHE='bangi-${version.digest("hex").slice(0, 16)}';
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bangi-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname===${JSON.stringify(base + "/push-config.json")}){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request)));return;}
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match(${JSON.stringify(base + "/index.html")})));return;}
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
self.addEventListener('push',event=>{let value={};try{value=event.data?.json()||{};}catch{}const title=typeof value.title==='string'?value.title.slice(0,120):'Bangi prayer reminder';const body=typeof value.body==='string'?value.body.slice(0,500):'Open Bangi to check your prayer times.';event.waitUntil(self.registration.showNotification(title,{body,icon:${JSON.stringify(base + "/icon-192.png")},tag:typeof value.tag==='string'?value.tag.slice(0,180):'bangi:prayer',silent:value.silent===true,...(Array.isArray(value.vibrate)?{vibrate:value.vibrate.filter(n=>Number.isInteger(n)&&n>=0&&n<=1000).slice(0,8)}:{})}));});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const client=list.find(c=>new URL(c.url).origin===self.location.origin&&new URL(c.url).pathname.startsWith(${JSON.stringify(base + "/")}));return client?client.focus():self.clients.openWindow(${JSON.stringify(base + "/")});}));});
`;
fs.writeFileSync(path.join(root, "sw.js"), sw);
console.log(`PWA shell generated: ${urls.length} offline resources.`);
