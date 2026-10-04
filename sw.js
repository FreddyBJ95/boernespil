// ===== Service Worker — gør spillene installerbare og tilgængelige offline =====
// Bump dette tal når der ændres filer, så de gamle bliver hentet på ny.
const CACHE = "boernespil-v71";

const SPIL = ["balloner", "byg-burger", "enhjoerning", "vask", "slange", "tegne", "piano", "fisk", "broekraft", "rulle-rasmus", "burgerloeb"];
const VOKSENSPIL = ["det-sidste-lys", "skrotstorm", "krystaljaegerne"];

// Spil der består af flere filer end index.html
const EKSTRA = [
  "tilslut/", "tilslut/index.html", "tilslut/tilslut.css", "tilslut/tilslut.js", "tilslut/adresse.js", "tilslut/vendor/jsQR.js",
  ...["three.module.js", "GLTFLoader.js", "BufferGeometryUtils.js", "start.js", "pynt.js", "LICENSE-three.txt"].map(f => `spil/3d-faelles/${f}`),
  ...["style.css", "komfort.css", "spil.js", "styring.js", "verden.js", "logik.js", "lyd.js", "oe.glb", "maage.glb", "forside.jpg"].map(f => `spil/det-sidste-lys/${f}`),
  ...["style.css", "spil.js", "styring.js", "missioner.js", "verden-data.js", "fysik.js", "fremgang.js", "lyd.js", "gps.js", "indstillinger.js", "brugerflade.js", "liv.js", "forside.jpg", "ikon.svg",
    "modeller/oerken.glb", "modeller/rotten.glb", "modeller/buggy.glb", "modeller/truck.glb"].map(f => `spil/skrotstorm/${f}`),
  ...["style.css", "spil.js", "styring.js", "verden.js", "eventyr.js", "projektiler.js", "navigation.js", "kort.js", "lagring.js", "kamp.js", "kampfigur.js", "kampstatus.js", "øveplads.js", "fund.js", "fundfigur.js", "fundkort.js", "forside.jpg", "modeller/eventyr.glb", "modeller/detaljer.glb", "modeller/kamp.glb", "modeller/fund.glb"].map(f => `spil/krystaljaegerne/${f}`),
  ...["three.js", "spil.js", "fisk.js", "staenger.js", "verden.js", "lyd.js", "modeller.js"].map(f => `spil/fisk/${f}`),
  ...["soe", "hav", "grej"].map(f => `spil/fisk/modeller/${f}.glb`),
  ...["three.js", "spil.js", "verden.js", "slange.js", "mad.js", "lyd.js", "modeller.js"].map(f => `spil/slange/${f}`),
  ...["hoved", "mad", "hatte", "pynt"].map(f => `spil/slange/modeller/${f}.glb`),
  ...["three.js", "spil.js", "baner.js", "bane.js", "temaer.js", "verden.js", "ting.js", "blob.js", "partikler.js", "teksturer.js", "lyd.js", "modeller.js"].map(f => `spil/rulle-rasmus/${f}`),
  "spil/rulle-rasmus/modeller/rasmus.glb",                              // pynt, frugt og puder fra Blender
  ...["three.js", "spil.js", "figurer.js", "kaemper.js", "bane.js", "lyd.js"].map(f => `spil/burgerloeb/${f}`),
  ...["lag", "loeber", "mand", "dino", "monster"].map(f => `spil/burgerloeb/modeller/${f}.glb`),   // modellerne fra Blender
  "spil/glb.js",                                                        // læser modellerne fra Blender
  ...["three.js", "spil.js", "blokke.js", "dyr.js", "verden.js", "verdener.js", "lyd.js", "net.js", "figurer.js", "simulering.js", "vaerktoej.js", "stemmer.js", "stemmesignal.js", "stemmeeffekt.js", "skyd.js", "kampvogn.js", "fyrvaerkeri.js", "brand.js", "atom.js", "tornado.js", "biler.js", "nytaar.js", "uendelig.js", "dagnat.js", "kort.js", "tog.js", "eventyr.js", "sten.js", "smaadyr.js", "enhjoerninger.js"].map(f => `spil/broekraft/${f}`),
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",   // 3D-motoren (se spil/fisk/three.js)
];

const FILER = [
  "./",
  "index.html",
  "style.css",
  "effekter.js",
  "manifest.json",
  "spil/laas.js",                               // låsen til voksenspillene
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "favicon.png",
  // Spilkassens logo og maskotter
  ...["ordmaerke", "kasseven-vinker", "kasseven-taenker"].map(n => `billeder/spilkassen/${n}.webp`),
  // billederne fra spillene på forsiden
  ...["fyrvaerkeri", "tornado", "nuke", "brandby", "dino", "hav", "slik", "sky", "pirat", "droner", "pariserhjul",
    "underverden", "graesoe", "skydebane", "nytaar", "fisk", "svampesky", "rasmus", "slange", "burgerloeb"].map(n => `billeder/${n}.jpg`),
  ...SPIL.flatMap(s => [`spil/${s}/`, `spil/${s}/index.html`]),
  ...VOKSENSPIL.flatMap(s => [`spil/${s}/`, `spil/${s}/index.html`]),
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

// Ryd kun Spilkassens gamle cacher; andre projekter på samme origin beholder deres offline-filer.
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(navne => Promise.all(navne.filter(n => n.startsWith("boernespil-v") && n !== CACHE).map(n => caches.delete(n))))
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
        // En kort serverfejl må ikke få Prøv igen til at vise den samme gemte fejl.
        if (net.ok) {
          const kopi = net.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopi)).catch(() => {});
        }
        return net;
      }).catch(() => caches.match("index.html"));   // offline-fallback
    })
  );
});
