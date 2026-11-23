// ===== Service Worker — gør spillene installerbare og tilgængelige offline =====
// Bump dette tal når der ændres filer. Tabletten henter så kun de filer, der faktisk er ændret (se fyldCache).
const CACHE = "boernespil-v91";

// Listen over alle filer på GitHub med git's fingeraftryk — så kan vi se, hvilke filer der er ændret.
const GIT_FILER = "https://api.github.com/repos/FreddyBJ95/boernespil/git/trees/main?recursive=1";

const SPIL = ["balloner", "byg-burger", "enhjoerning", "vask", "slange", "tegne", "piano", "fisk", "broekraft", "rulle-rasmus", "burgerloeb", "nedrivning", "brudpunkt", "kuglebanen", "skrot-og-brag", "vaabensimulator", "karrusel"];
const VOKSENSPIL = ["det-sidste-lys", "skrotstorm", "krystaljaegerne"];

// Spil der består af flere filer end index.html
const EKSTRA = [
  // Skrot & Brag bruger Nedrivningsfirmaets fysik, fotos, modeller og lyde (de ligger længere nede)
  ...["stil.css", "spil.mjs", "baner.mjs", "bil.mjs", "bilmodel.mjs", "motorlyd.mjs", "ikoner.mjs", "forside.jpg",
    ...["skur", "murstenshus", "lagerhal", "vandtaarn", "betonblok", "skorsten"].map(n => `baner/${n}.jpg`)].map(f => `spil/skrot-og-brag/${f}`),
  "tilslut/", "tilslut/index.html", "tilslut/tilslut.css", "tilslut/tilslut.js", "tilslut/adresse.js", "tilslut/vendor/jsQR.js",
  ...["three.module.js", "GLTFLoader.js", "BufferGeometryUtils.js", "start.js", "pynt.js", "LICENSE-three.txt"].map(f => `spil/3d-faelles/${f}`),
  ...["style.css", "komfort.css", "spil.js", "styring.js", "verden.js", "logik.js", "lyd.js", "oe.glb", "maage.glb", "forside.jpg"].map(f => `spil/det-sidste-lys/${f}`),
  ...["style.css", "spil.js", "styring.js", "missioner.js", "verden-data.js", "fysik.js", "fremgang.js", "lyd.js", "gps.js", "indstillinger.js", "brugerflade.js", "liv.js", "forside.jpg", "ikon.svg",
    "modeller/oerken.glb", "modeller/rotten.glb", "modeller/buggy.glb", "modeller/truck.glb"].map(f => `spil/skrotstorm/${f}`),
  ...["style.css", "spil.js", "styring.js", "verden.js", "eventyr.js", "projektiler.js", "navigation.js", "kort.js", "lagring.js", "kamp.js", "kampfigur.js", "kampstatus.js", "øveplads.js", "fund.js", "fundfigur.js", "fundkort.js", "forside.jpg", "modeller/eventyr.glb", "modeller/detaljer.glb", "modeller/kamp.glb", "modeller/fund.glb"].map(f => `spil/krystaljaegerne/${f}`),
  // Nedrivningsfirmaet: koden, fysikken (Rapier), modellerne, murstenene og de optagede lyde
  ...["style.css", "spil.js", "fysik.js", "materialer.js", "dele.js", "ruder.js", "effekter.js", "efterbehandling.js", "lyd.js", "sprængstof.js", "verden.js", "styring.js", "baner.js", "bygninger.js", "enhed.js", "terraen.js", "lunte.js", "forside.jpg",
    "rapier/rapier.js", "teksturer/mursten.json", "teksturer/mursten_farve.webp", "teksturer/mursten_normal.webp", "teksturer/mursten_arm.webp",
    ...["tonde", "gasflaske", "gastank", "tntkasse", "skurvogn", "gravko"].map(n => `modeller/${n}.glb`),
    ...["tnt", "bjerg", "mine", "minesprengning", "dynamit", "knald", "fjern", "stor", "kontrolleret", "styrt_kort", "styrt", "traehus", "nedrivning", "brokker_stor", "brokker",
      "stenskred", "beton", "slag", "glas_fald", "glas", "glas2", "metal_fald", "metal", "trae_knaek", "ild", "gas", "horn",
      "plask", "raket", "floejt", "fyrvaerkeri", "lavine", "sneskred", "jordskred", "gnist"].map(n => `lyde/${n}.mp3`)].map(f => `spil/nedrivning/${f}`),
  ...["teksturer.json", ...["beton", "sand", "planker", "panel", "metal", "blik", "puds", "klippe", "sne"].flatMap(n => ["farve", "normal", "arm"].map(k => `${n}_${k}.webp`))].map(f => `spil/sigtekorn/teksturer/${f}`),
  ...["style.css", "spil.js", "kamera.js", "effekter.js", "lyd.js", "simulering.js", "opsaetning.js", "forside.jpg",
    "modeller/brudpunkt.glb", "modeller/opskrifter.json", "rapier/rapier.mjs", "rapier/LICENSE-RAPIER.txt", "rapier/PROVENIENS.txt"].map(f => `spil/brudpunkt/${f}`),
  ...["beton", "bjerg", "brokker", "brokker_stor", "dynamit", "fjern", "gas", "glas", "glas2", "glas_fald", "horn", "ild", "knald",
    "kontrolleret", "metal", "metal_fald", "mine", "minesprengning", "nedrivning", "slag", "stenskred", "stor", "styrt", "styrt_kort", "tnt", "trae_knaek", "traehus"]
    .map(f => `spil/brudpunkt/lyde/${f}.mp3`),
  ...["three.js", "spil.js", "fisk.js", "staenger.js", "verden.js", "lyd.js", "modeller.js"].map(f => `spil/fisk/${f}`),
  ...["soe", "hav", "grej"].map(f => `spil/fisk/modeller/${f}.glb`),
  ...["three.js", "spil.js", "verden.js", "slange.js", "mad.js", "lyd.js", "modeller.js"].map(f => `spil/slange/${f}`),
  ...["hoved", "mad", "hatte", "pynt"].map(f => `spil/slange/modeller/${f}.glb`),
  ...["three.js", "spil.js", "baner.js", "bane.js", "temaer.js", "verden.js", "ting.js", "blob.js", "partikler.js", "teksturer.js", "lyd.js", "modeller.js"].map(f => `spil/rulle-rasmus/${f}`),
  "spil/rulle-rasmus/modeller/rasmus.glb",                              // pynt, frugt og puder fra Blender
  ...["three.js", "spil.js", "figurer.js", "kaemper.js", "bane.js", "lyd.js"].map(f => `spil/burgerloeb/${f}`),
  ...["three.js", "style.css", "spil.js", "fysik.js", "styring.js", "baner.js", "bygger.js", "former.js", "pynt.js", "figurer.js", "jungle.js", "vaerelse.js", "slik.js", "lyd.js"].map(f => `spil/kuglebanen/${f}`),
  ...["lag", "loeber", "mand", "dino", "monster"].map(f => `spil/burgerloeb/modeller/${f}.glb`),   // modellerne fra Blender
  "spil/glb.js",                                                        // læser modellerne fra Blender
  ...["karrusel.css", "karrusel.js"].map(f => `spil/karrusel/${f}`),   // Spilkarrusellen: alle spillene på skift
  ...["three.js", "spil.js", "blokke.js", "dyr.js", "verden.js", "verdener.js", "lyd.js", "net.js", "figurer.js", "simulering.js", "vaerktoej.js", "stemmer.js", "stemmesignal.js", "stemmeeffekt.js", "skyd.js", "kampvogn.js", "fyrvaerkeri.js", "brand.js", "atom.js", "tornado.js", "biler.js", "nytaar.js", "uendelig.js", "dagnat.js", "kort.js", "tog.js", "eventyr.js", "sten.js", "smaadyr.js", "enhjoerninger.js", "morellgaarden.js", "morellgaarden-kort.js", "rigtige-steder.js", "heroeya.js", "heroeya-kort.js"].map(f => `spil/broekraft/${f}`),
  "spil/broekraft/faelles.js",                                          // de andres dyr og biler, når man spiller sammen
  // Våbensimulator: alt tegnes og lyder med kode (glas, plask og ild låner Nedrivningsfirmaets optagelser ovenfor)
  ...["stil.css", "spil.js", "teksturer.js", "former.js", "materialer.js", "vaaben.js", "svaerd.js", "efterbehandling.js", "partikler.js", "effekter.js",
    "bane.js", "maal.js", "lyd.js", "forside.jpg"].map(f => `spil/vaabensimulator/${f}`),
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
    "underverden", "graesoe", "skydebane", "nytaar", "fisk", "svampesky", "rasmus", "slange", "burgerloeb", "kuglebanen"].map(n => `billeder/${n}.jpg`),
  ...SPIL.flatMap(s => [`spil/${s}/`, `spil/${s}/index.html`]),
  ...VOKSENSPIL.flatMap(s => [`spil/${s}/`, `spil/${s}/index.html`]),
  ...EKSTRA
];

// ---------- Hent kun det, der er ændret ----------
// Hver fil på GitHub har et fingeraftryk (git's SHA-1). Har vi allerede en kopi med samme fingeraftryk,
// genbruges den. Så henter en opdatering måske 200 kB i stedet for alle ~60 MB, og den når at blive færdig,
// selv om barnet lukker appen kort efter.

// Hvilken fil i git en adresse svarer til: "./" og "spil/x/" er index.html. Adresser uden for sitet: null.
function gitSti(fil) {
  if (/^https?:/.test(fil)) return null;
  const sti = fil.replace(/^\.\//, "");
  return (sti === "" || sti.endsWith("/") ? sti + "index.html" : sti).normalize("NFC");
}

// Git's fingeraftryk af en fil: SHA-1 af "blob <længde>\0" efterfulgt af indholdet
async function fingeraftryk(svar) {
  const data = new Uint8Array(await svar.clone().arrayBuffer());
  const hoved = new TextEncoder().encode(`blob ${data.length}\0`), alt = new Uint8Array(hoved.length + data.length);
  alt.set(hoved); alt.set(data, hoved.length);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-1", alt))].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Fingeraftrykkene på GitHub lige nu, som sti → aftryk. null uden net, eller hvis GitHub ikke svarer.
async function hentGitAftryk() {
  try {
    const svar = await fetch(GIT_FILER, { cache: "no-store" });
    if (!svar.ok) return null;
    const { tree } = await svar.json();
    return new Map(tree.filter(t => t.type === "blob").map(t => [t.path.normalize("NFC"), t.sha]));
  } catch (_) { return null; }
}

// Fortæl de åbne sider, hvor langt vi er (Opdater-knappen på forsiden viser det som en ring)
function meldFremgang(ialt) {
  let sidst = 0;
  return færdig => {
    if (færdig < ialt && Date.now() - sidst < 200) return;
    sidst = Date.now();
    self.clients.matchAll({ includeUncontrolled: true, type: "window" })
      .then(sider => sider.forEach(s => s.postMessage({ t: "opdatering", færdig, ialt }))).catch(() => {});
  };
}

// Kør opgave(fil) for alle filerne, højst `samtidig` ad gangen
async function iKø(liste, samtidig, opgave) {
  let i = 0;
  const arbejd = async () => { while (i < liste.length) { const fil = liste[i++]; try { await opgave(fil); } catch (_) {} } };
  await Promise.all(Array.from({ length: samtidig }, arbejd));
}

// Fyld cachen `nyNavn` med alle FILER. Uændrede filer kopieres fra `gammelNavn` (kan være den samme cache).
// Kan en fil ikke hentes (intet net), beholdes den gamle kopi, så spillet stadig virker offline.
// Giver antallet af filer, der blev hentet på ny.
async function fyldCache(nyNavn, gammelNavn, git) {
  const ny = await caches.open(nyNavn), gammel = gammelNavn && await caches.open(gammelNavn), samme = nyNavn === gammelNavn;
  const fremgang = meldFremgang(FILER.length);
  let færdig = 0, hentet = 0;
  await iKø(FILER, 6, async fil => {
    const sti = gitSti(fil), ønsket = sti && git?.get(sti), gemt = gammel && await gammel.match(fil);
    // three.js fra CDN'et er en fast udgave og ændrer sig aldrig; andre filer genbruges kun med samme fingeraftryk
    const uændret = gemt && (sti === null || (ønsket && await fingeraftryk(gemt) === ønsket));
    if (uændret) { if (!samme) await ny.put(fil, gemt); }
    else {
      try {
        // cache: "reload" = hent altid den nye fil fra nettet, ikke en gammel kopi fra browserens egen cache
        const svar = await fetch(new Request(fil, { cache: "reload" }));
        if (!svar.ok) throw new Error(svar.status);
        await ny.put(fil, svar); hentet++;
      } catch (_) { if (gemt && !samme) await ny.put(fil, gemt); }
    }
    fremgang(++færdig);
  });
  return hentet;
}

// Den nyeste af Spilkassens tidligere cacher (eller null første gang)
async function forrigeCache() {
  const nr = navn => parseInt(navn.slice("boernespil-v".length), 10) || 0;
  const navne = (await caches.keys()).filter(n => n.startsWith("boernespil-v") && n !== CACHE).sort((a, b) => nr(b) - nr(a));
  return navne[0] || null;
}

// Gem alt ved installation — men hent kun det, der er ændret siden sidste udgave
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const gammel = (await forrigeCache()) || ((await caches.has(CACHE)) ? CACHE : null);
    await fyldCache(CACHE, gammel, await hentGitAftryk());
    await self.skipWaiting();
  })());
});

// Beskeder fra forsiden: hvilken udgave kører vi, og "opfrisk" (Opdater-knappen, når der ikke er en ny udgave —
// fx hvis nogen har glemt at tælle CACHE op: så hentes de filer, der er ændret på GitHub, alligevel).
self.addEventListener("message", e => {
  const svar = e.ports[0];
  if (e.data?.t === "version") svar?.postMessage({ version: CACHE });
  if (e.data?.t === "opfrisk") {
    const arbejde = hentGitAftryk().then(git => fyldCache(CACHE, CACHE, git))
      .then(hentet => svar?.postMessage({ hentet }), () => svar?.postMessage({ fejl: true }));
    e.waitUntil?.(arbejde);
  }
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
