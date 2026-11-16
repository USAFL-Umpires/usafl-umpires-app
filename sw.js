// Retired. The Nationals 2026 app (and its offline worker) moved to /nationals/.
// Browsers that visited before the move still have the old worker registered for the whole site,
// and it would keep showing them the old app here. This replacement clears that worker's caches,
// unregisters itself and reloads any open page, so the hub loads normally. Keep this file in place.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("usafl-umps-")).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url).catch(() => {})))
  );
});
