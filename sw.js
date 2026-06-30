// ===== Service Worker — gør spillene installerbare og tilgængelige offline =====
// Bump dette tal når der ændres filer, så de gamle bliver hentet på ny.
const CACHE = "boernespil-v3";

const SPIL = [
  "tryk-paa-dyret", "slange", "tegne", "balloner", "find-par", "fang",
  "muldvarp", "tael", "simon", "piano", "undvig", "puslespil"
];

const FILER = [
  "./",
  "index.html",
  "style.css",
  "effekter.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  ...SPIL.flatMap(s => [`spil/${s}/`, `spil/${s}/index.html`])
];

// Gem alt ved installation
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // ignorér enkeltfiler der evt. fejler, så install ikke knækker
      .then(c => Promise.allSettled(FILER.map(f => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

// Ryd gamle cacher
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(navne => Promise.all(navne.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Cache-først: vis fra cache, ellers hent fra nettet (og gem)
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(svar => {
      if (svar) return svar;
      return fetch(e.request).then(net => {
        const kopi = net.clone();
        caches.open(CACHE).then(c => c.put(e.request, kopi)).catch(() => {});
        return net;
      }).catch(() => caches.match("index.html"));   // offline-fallback
    })
  );
});
