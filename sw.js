// ===== Service Worker — gør spillene installerbare og tilgængelige offline =====
// Bump dette tal når der ændres filer, så de gamle bliver hentet på ny.
const CACHE = "boernespil-v52";

const SPIL = ["balloner", "byg-burger", "vask", "slange", "tegne", "piano", "fisk", "broekraft", "rulle-rasmus", "burgerloeb"];

// Spil der består af flere filer end index.html
const EKSTRA = [
  "tilslut/", "tilslut/index.html", "tilslut/tilslut.css", "tilslut/tilslut.js", "tilslut/adresse.js", "tilslut/vendor/jsQR.js",
  ...["three.js", "spil.js", "fisk.js", "staenger.js", "verden.js", "lyd.js"].map(f => `spil/fisk/${f}`),
  ...["three.js", "spil.js", "verden.js", "slange.js", "mad.js", "lyd.js"].map(f => `spil/slange/${f}`),
  ...["three.js", "spil.js", "baner.js", "bane.js", "temaer.js", "verden.js", "ting.js", "blob.js", "partikler.js", "teksturer.js", "lyd.js"].map(f => `spil/rulle-rasmus/${f}`),
  ...["three.js", "spil.js", "figurer.js", "kaemper.js", "bane.js", "lyd.js"].map(f => `spil/burgerloeb/${f}`),
  ...["three.js", "spil.js", "blokke.js", "dyr.js", "verden.js", "verdener.js", "lyd.js", "net.js", "figurer.js", "simulering.js", "vaerktoej.js", "stemmer.js", "stemmesignal.js", "stemmeeffekt.js", "skyd.js", "kampvogn.js", "fyrvaerkeri.js", "brand.js", "atom.js", "tornado.js", "biler.js", "nytaar.js", "uendelig.js", "dagnat.js", "kort.js", "tog.js", "eventyr.js", "sten.js", "smaadyr.js"].map(f => `spil/broekraft/${f}`),
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",   // 3D-motoren (se spil/fisk/three.js)
];

const FILER = [
  "./",
  "index.html",
  "style.css",
  "effekter.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  // billederne fra spillene på forsiden
  ...["fyrvaerkeri", "tornado", "nuke", "brandby", "dino", "hav", "slik", "sky", "pirat", "droner", "pariserhjul",
    "underverden", "graesoe", "skydebane", "nytaar", "fisk", "svampesky", "rasmus", "slange", "burgerloeb"].map(n => `billeder/${n}.jpg`),
  ...SPIL.flatMap(s => [`spil/${s}/`, `spil/${s}/index.html`]),
  ...EKSTRA
];

// Gem alt ved installation
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // ignorér enkeltfiler der evt. fejler, så install ikke knækker
      // (cache: "reload" = hent altid den nye fil fra nettet, ikke en gammel kopi fra browserens egen cache)
      .then(c => Promise.allSettled(FILER.map(f => c.add(new Request(f, { cache: "reload" })))))
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
