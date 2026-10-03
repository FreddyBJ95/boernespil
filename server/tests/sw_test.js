import { strict as assert } from "node:assert";
import { runInNewContext } from "node:vm";

const kode = await Deno.readTextFile(new URL("../../sw.js", import.meta.url));

// Den faktiske worker kører med et lille lager og styrede netværkssvar, uden browser eller ægte filer.
function miljø(svar = [], navne = []) {
  const hændelser = new Map(), cacher = new Map(navne.map((n) => [n, new Map()])), slettede = [];
  let netkald = 0, offline = false, claimed = false;
  const nøgle = (r) => typeof r === "string" ? r : r.url;
  const ramme = {
    Request,
    self: {
      addEventListener(navn, handling) {
        hændelser.set(navn, handling);
      },
      clients: {
        claim() {
          claimed = true;
        },
      },
    },
    caches: {
      async match(request) {
        for (const cache of cacher.values()) {
          const gemt = cache.get(nøgle(request));
          if (gemt) return gemt.clone();
        }
      },
      async open(navn) {
        if (!cacher.has(navn)) cacher.set(navn, new Map());
        return {
          async put(request, respons) {
            cacher.get(navn).set(nøgle(request), respons.clone());
          },
        };
      },
      async keys() {
        return [...cacher.keys()];
      },
      async delete(navn) {
        slettede.push(navn);
        return cacher.delete(navn);
      },
    },
    async fetch() {
      netkald++;
      if (offline || !svar.length) throw new TypeError("Netværket er afbrudt");
      return svar.shift();
    },
  };
  runInNewContext(kode + "\n;globalThis.aktuelCache = CACHE;", ramme);
  return {
    cacher,
    slettede,
    aktuelCache: ramme.aktuelCache,
    get netkald() {
      return netkald;
    },
    get claimed() {
      return claimed;
    },
    gåOffline() {
      offline = true;
    },
    async hent(url) {
      let respons;
      hændelser.get("fetch")({
        request: new Request(url),
        respondWith(p) {
          respons = p;
        },
      });
      const resultat = await respons;
      // Workerens asynkrone cacheåbning får lov at afslutte inden den næste forespørgsel.
      await Promise.resolve();
      return resultat;
    },
    async aktivér() {
      let arbejde;
      hændelser.get("activate")({
        waitUntil(p) {
          arbejde = p;
        },
      });
      await arbejde;
    },
  };
}

for (const status of [503, 404]) {
  Deno.test(`Offline: HTTP ${status} gemmes ikke, og Prøv igen henter en ny succes`, async () => {
    const url = "https://eksempel.dk/boernespil/spil/krystaljaegerne/modeller/detaljer.glb";
    const m = miljø([
      new Response("Midlertidig fejl", { status }),
      new Response("De rigtige modelbytes", { status: 200 }),
    ]);
    assert.equal((await m.hent(url)).status, status);
    assert.equal(m.cacher.size, 0, "Fejlsvaret skal ikke gemmes i nogen cache");
    const retry = await m.hent(url);
    assert.equal(retry.status, 200);
    assert.equal(await retry.text(), "De rigtige modelbytes");
    assert.equal(m.netkald, 2);
    m.gåOffline();
    const efter = await m.hent(url);
    assert.equal(efter.status, 200);
    assert.equal(await efter.text(), "De rigtige modelbytes");
    assert.equal(m.netkald, 2, "Den vellykkede retry findes nu i offline-lageret");
  });
}

Deno.test("Offline: succes bruges fortsat fra cache på familieserver og under GitHub-projektsti", async () => {
  for (const base of ["http://192.168.1.23:8080/", "https://eksempel.dk/boernespil/"]) {
    const url = new URL("spil/3d-faelles/start.js", base).href;
    const m = miljø([new Response("Spillets startkode", { status: 200 })]);
    assert.equal(await (await m.hent(url)).text(), "Spillets startkode");
    m.gåOffline();
    assert.equal(await (await m.hent(url)).text(), "Spillets startkode");
    assert.equal(m.netkald, 1);
    assert.ok([...m.cacher.values()].some((c) => c.has(url)), "Den fulde projekt-URL er cache-nøglen");
  }
});

Deno.test("Offline: aktivering fjerner kun gamle boernespil-versioner og bevarer andres cacher", async () => {
  const m = miljø([], [
    "boernespil-v0",
    "boernespil-v1",
    "andet-projekt-v1",
    "workbox-precache-v2",
  ]);
  m.cacher.set(m.aktuelCache, new Map());
  await m.aktivér();
  assert.deepEqual(m.slettede, ["boernespil-v0", "boernespil-v1"]);
  assert.deepEqual([...m.cacher.keys()], ["andet-projekt-v1", "workbox-precache-v2", m.aktuelCache]);
  assert.equal(m.claimed, true);
});
