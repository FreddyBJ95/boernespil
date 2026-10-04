import { strict as assert } from "node:assert";
import { join } from "node:path";
import { BroekraftServer, lokal, privat } from "../main.js";
import { Verdenslager, metadata } from "../verdener.js";
import { forbind } from "../../spil/broekraft/net.js";
import { prøvOffentligeFiler, prøvPrivateFiler } from "./offentlige-filer.js";

const vent = ms => new Promise(r => setTimeout(r, ms));
function hændelse(f, type, vælg = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { f.removeEventListener(type, lyt); reject(new Error(`Mangler ${type}`)); }, 5000);
    const lyt = e => { if (!vælg(e.detail)) return; clearTimeout(timer); f.removeEventListener(type, lyt); resolve(e.detail); };
    f.addEventListener(type, lyt);
  });
}

async function opsæt({ netværkstjek } = {}) {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-test-" }), lager = new Verdenslager(rod);
  const meta = metadata({ navn: "Familiens verden", type: "græsø", bredde: 128, maksSpillere: 2 });
  const data = new Uint8Array(128 * 128 * 64); data.fill(26, 0, 128 * 128);
  await lager.gem(meta, data);
  const app = new BroekraftServer({ lager, netværkstjek }); await app.init(); await app.start(meta.id);
  const http = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req, info) => app.håndter(req, info));
  app.port = http.addr.port; app.kørTimere();
  const base = `http://127.0.0.1:${http.addr.port}`;
  return { app, lager, meta, base, async luk() { await app.luk(); await http.shutdown(); await Deno.remove(rod, { recursive: true }); } };
}

Deno.test("HTTP/WS: to klienter, blokke, positioner, fuld, genforbindelse og genstart", async () => {
  const v = await opsæt(), klienter = [];
  try {
    const url = v.base.replace("http", "ws") + "/ws";
    for (const figur of ["gris", "ko", "and"]) klienter.push(await forbind(url, { figur }));
    const [a, b, c] = klienter;
    assert.equal((await a.verdener()).length, 1);
    const ak = hændelse(a, "klump"), bk = hændelse(b, "klump");
    await a.vælg(v.meta.id); await b.vælg(v.meta.id); await Promise.all([ak, bk]);
    await assert.rejects(c.vælg(v.meta.id), /fuld/);
    const blok = hændelse(b, "blok", e => e.x === 66 && e.id === 7);
    a.sæt(66, 10, 64, 7); await blok;
    const pos = hændelse(b, "pos", e => e.liste.some(s => s.x === 70));
    a.pos(70, 20, 64, 0.5, 0); await pos;
    const ny = hændelse(a, "velkommen"), nyKlump = hændelse(a, "klump");
    a.socket.close(); await ny; await nyKlump;
    assert.equal(v.app.rum.get(v.meta.id).spillere.size, 2);
    const f = hændelse(b, "blok", e => e.x === 67 && e.id === 3);
    a.sæt(67, 10, 64, 3); await f;
    for (const k of klienter) k.luk(); await vent(30);
    await v.app.stop(v.meta.id); await v.app.start(v.meta.id);
    assert.equal(v.app.rum.get(v.meta.id).hent(66, 10, 64), 7);
    assert.equal(v.app.rum.get(v.meta.id).hent(67, 10, 64), 3);
  } finally { for (const k of klienter) k.luk(); await vent(30); await v.luk(); }
});

Deno.test("Kontrolpanel: lokal adgang, origin, token, statiske filer og dobbelt sletning", async () => {
  const v = await opsæt();
  const req = (sti, ip = "127.0.0.1", init = {}) => v.app.håndter(new Request(v.base + sti, init), { remoteAddr: { hostname: ip } });
  try {
    for (const sti of ["/kontrol", "/kontrol/kontrol.js", "/api/status"]) assert.equal((await req(sti, "192.168.1.4")).status, 403);
    assert.equal((await req("/", "8.8.8.8")).status, 403);
    const rebinding = await v.app.håndter(new Request("http://fremmed.dk/api/status"), { remoteAddr: { hostname: "127.0.0.1" } });
    assert.equal(rebinding.status, 403);
    const status = await (await req("/api/status")).json(); assert.equal(status.token, v.app.token);
    assert.equal((await req("/api/stop", "127.0.0.1", { method: "POST", body: JSON.stringify({ id: v.meta.id }) })).status, 403);
    for (const sti of ["/.git/config", "/server/main.js", "/spil/../AGENTS.md", "/spil/%5c..%5cserver/main.js"]) assert.equal((await req(sti)).status, 404);
    for (const sti of ["/", "/kontrol", "/kontrol/qrcode.js", "/spil/broekraft/", "/spil/broekraft/net.js", "/test-klient.html", "/tilslut/", "/tilslut/tilslut.js", "/tilslut/tilslut.css", "/tilslut/adresse.js", "/tilslut/vendor/jsQR.js"]) assert.equal((await req(sti)).status, 200);
    const post = (sti, body) => req(sti, "127.0.0.1", { method: "POST", headers: { origin: v.base, "x-broekraft-token": status.token }, body: JSON.stringify(body) });
    assert.equal((await post("/api/slet", { id: v.meta.id, bekræft: v.meta.id })).status, 400);
    const backup = await (await post("/api/backup", { id: v.meta.id })).json(); assert.ok((await Deno.stat(join(backup.mappe, "data.bin.gz"))).isFile);
    assert.equal((await post("/api/slet", { id: v.meta.id, bekræft: v.meta.id, bekræftIgen: "SLET" })).status, 200);
    assert.equal((await v.lager.liste()).length, 0);
    assert.ok((await Deno.stat(join(backup.mappe, "meta.json"))).isFile);
  } finally { await v.luk(); }
});

// En tablet må hente alle nye billedtyper uden at få adgang til serverens filer.
Deno.test("HTTP: Spilkassens billeder, appikoner og Sigtekorns modeller virker med GET og HEAD", async () => {
  const v = await opsæt();
  const hent = (sti, init) => v.app.håndter(new Request(v.base + sti, init), { remoteAddr: { hostname: "192.168.1.4" } });
  try {
    await prøvOffentligeFiler(hent, sti => Deno.readFile(new URL("../../" + sti.slice(1), import.meta.url)));
    await prøvPrivateFiler(hent);
    const post = await hent("/billeder/spilkassen/ordmaerke.webp", { method: "POST" }); await post.text();
    assert.equal(post.status, 405, "Billedfiler skal kun kunne læses");
  } finally { await v.luk(); }
});

// Den rigtige HTTP-transport må ikke omskrive HEAD-filens størrelse til nul.
Deno.test("HTTP på nettet: HEAD bevarer GET-filens byteantal uden at sende en krop", async () => {
  const v = await opsæt();
  const filer = [
    ["/spil/skrotstorm/spil.js", "spil/skrotstorm/spil.js", "text/javascript; charset=utf-8"],
    ["/spil/skrotstorm/modeller/oerken.glb", "spil/skrotstorm/modeller/oerken.glb", "model/gltf-binary"],
    ["/spil/sigtekorn/modeller/lys_fjeldbyen.bin", "spil/sigtekorn/modeller/lys_fjeldbyen.bin", "application/octet-stream"],
    ["/spil/sigtekorn/modeller/lys_fjeldbyen.webp", "spil/sigtekorn/modeller/lys_fjeldbyen.webp", "image/webp"],
    ["/index.html", "index.html", "text/html; charset=utf-8"],
    ["/", "server/sammen/index.html", "text/html; charset=utf-8"],
    ["/kontrol", "server/kontrol/index.html", "text/html; charset=utf-8"],
    ["/kontrol/kontrol.js", "server/kontrol/kontrol.js", "text/javascript; charset=utf-8"],
  ];
  try {
    for (const [sti, fil, mime] of filer) {
      // Identisk, ukomprimeret repræsentation: fetch må ikke skjule gzip-længden.
      const headers = { "accept-encoding": "identity" };
      const get = await fetch(v.base + sti, { headers });
      const data = new Uint8Array(await get.arrayBuffer());
      const head = await fetch(v.base + sti, { method: "HEAD", headers });
      const tom = await head.arrayBuffer();
      assert.equal(get.status, 200, `${sti}: rigtig GET`);
      assert.equal(head.status, 200, `${sti}: rigtig HEAD`);
      assert.deepEqual(data, await Deno.readFile(new URL("../../" + fil, import.meta.url)), `${sti}: GET leverer hele kildefilen`);
      assert.ok(data.byteLength > 0, `${sti}: filen er ikke tom`);
      assert.equal(get.headers.get("content-encoding"), null, `${sti}: GET er ukomprimeret`);
      assert.equal(head.headers.get("content-encoding"), null, `${sti}: HEAD beskriver samme repræsentation`);
      assert.equal(get.headers.get("content-length"), String(data.byteLength), `${sti}: GET-længde svarer til de modtagne bytes`);
      assert.equal(head.headers.get("content-length"), String(data.byteLength), `${sti}: HEAD-længde svarer til GET, også over Deno.serve`);
      assert.equal(tom.byteLength, 0, `${sti}: HEAD sender ingen filkrop`);
      for (const [navn, værdi] of [["content-type", mime], ["x-content-type-options", "nosniff"], ["cache-control", "no-store"]]) {
        assert.equal(get.headers.get(navn), værdi, `${sti}: GET ${navn}`);
        assert.equal(head.headers.get(navn), get.headers.get(navn), `${sti}: HEAD bevarer ${navn}`);
      }
    }
  } finally { await v.luk(); }
});

Deno.test("Verdener, der kører, starter selv igen efter en genstart — stoppede forbliver stoppet", async () => {
  const v = await opsæt();
  const req = (sti, init = {}) => v.app.håndter(new Request(v.base + sti, init), { remoteAddr: { hostname: "127.0.0.1" } });
  try {
    const { token } = await (await req("/api/status")).json();
    const post = (sti, body) => req(sti, { method: "POST", headers: { origin: v.base, "x-broekraft-token": token }, body: JSON.stringify(body) });
    const genstart = async () => { const ny = new BroekraftServer({ lager: v.lager }); await ny.init(); const kører = ny.rum.has(v.meta.id); await ny.luk(); return kører; };
    assert.equal(await genstart(), true);                          // ingen besked endnu: starter af sig selv
    assert.equal((await post("/api/stop", { id: v.meta.id })).status, 200);
    assert.equal(await genstart(), false);                         // stoppet af en voksen: bliver stoppet
    assert.equal((await post("/api/start", { id: v.meta.id })).status, 200);
    assert.equal(await genstart(), true);
  } finally { await v.luk(); }
});

Deno.test("Generering i worker viser fremgang og gemmer en spillbar verden", async () => {
  const v = await opsæt();
  try {
    const id = v.app.opret({ navn: "Månen", type: "maane", bredde: 128, maksSpillere: 8, ildBreder: false });
    await v.app.job.get(id).færdig;
    assert.equal(v.app.job.get(id).status, "færdig");
    assert.equal(v.app.job.get(id).procent, 100);
    assert.equal(v.app.rum.get(id).meta.maksSpillere, 8);
    assert.equal((await v.lager.indlæs(id)).meta.ildBreder, false);
  } finally { await v.luk(); }
});

Deno.test("Gemninger står i kø, snapshot bevares, og ugyldige metadata afvises", async () => {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-lager-" });
  try {
    const lager = new Verdenslager(rod), m = metadata({ navn: "Test", type: "græsø", bredde: 128 });
    const data = new Uint8Array(128 * 128 * 64); data[10] = 7;
    const gem = lager.gem(m, data); data[10] = 3; await gem;
    assert.equal((await lager.indlæs(m.id)).data[10], 7);
    const a = lager.gem(m, data); data[10] = 5; const b = lager.gem(m, data); await Promise.all([a, b]);
    assert.equal((await lager.indlæs(m.id)).data[10], 5);
    const { BLOKKE } = await import("../../spil/broekraft/blokke.js");        // nyeste blok (fx Sne) kan gemmes og hentes
    data[11] = BLOKKE.length - 1; await lager.gem(m, data);
    assert.equal((await lager.indlæs(m.id)).data[11], BLOKKE.length - 1);
    data[11] = BLOKKE.length; await lager.gem(m, data);
    await assert.rejects(() => lager.indlæs(m.id), /beskadiget/);
    data[11] = 0; await lager.gem(m, data);
    for (const valg of [{ bredde: 64 }, { maksSpillere: 9 }, { maksSpillere: 0 }, { frø: -1 }, { type: "ukendt" }]) assert.throws(() => metadata({ ...m, ...valg }));
    assert.throws(() => lager.mappe("../../andre-filer"));
    assert.equal(lokal("::1"), true); assert.equal(lokal("192.168.1.1"), false);
    for (const ip of ["10.0.0.1", "172.16.0.1", "192.168.0.1"]) assert.equal(privat(ip), true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "192.168.999.1"]) assert.equal(privat(ip), false);
  } finally { await Deno.remove(rod, { recursive: true }); }
});

Deno.test("Stemmer: voksenkontakt gemmes og virker straks; 0.1.0 spiller stadig", async () => {
  const v = await opsæt(), klienter = [];
  try {
    const url = v.base.replace("http", "ws") + "/ws";
    const a = await forbind(url, { figur: "gris" }); klienter.push(a);
    const gammel = await forbind(url, { figur: "ko", version: "0.1.0" }); klienter.push(gammel);
    assert.equal((await a.vælg(v.meta.id)).verden.stemmer, false);
    await gammel.vælg(v.meta.id);
    const gamleSignaler = []; gammel.addEventListener("stemmer", e => gamleSignaler.push(e.detail));
    const post = async til => {
      const svar = await fetch(v.base + "/api/stemmer", { method: "POST", headers: { origin: v.base, "x-broekraft-token": v.app.token }, body: JSON.stringify({ id: v.meta.id, til }) });
      await svar.text(); return svar.status;
    };
    for (const til of [true, false, true]) {
      const skift = hændelse(a, "stemmer");
      assert.equal(await post(til), 200); assert.deepEqual(await skift, { til });
      assert.equal(a.info.verden.stemmer, til);
      assert.equal((await v.lager.indlæs(v.meta.id)).meta.stemmer, til);
    }
    assert.equal(await post("ja"), 400);
    const blok = hændelse(a, "blok", b => b.x === 66);
    gammel.sæt(66, 10, 64, 7); await blok;
    assert.deepEqual(gamleSignaler, []);
    for (const k of klienter) k.luk(); await vent(30);
    await v.app.stop(v.meta.id);
    assert.equal(await post(false), 200);
    await v.app.start(v.meta.id);
    assert.equal(v.app.rum.get(v.meta.id).meta.stemmer, false);
    assert.equal(v.app.rum.get(v.meta.id).hent(66, 10, 64), 7);
  } finally { for (const k of klienter) k.luk(); await vent(30); await v.luk(); }
});

Deno.test("HTTP: netværksdiagnose er kun lokal og skelner mellem server og anden enhed", async () => {
  const v = await opsæt({ netværkstjek: { hent: async () => ({ status: "klar", profiler: [{ profil: "Public", adresser: ["192.168.1.2"] }] }) } });
  const req = (sti, ip) => v.app.håndter(new Request(v.base + sti), { remoteAddr: { hostname: ip } });
  try {
    let status = await (await req("/api/status", "127.0.0.1")).json();
    assert.equal(status.netværk.profiler[0].profil, "Public"); assert.equal(status.tabletSet, false);
    assert.equal((await req("/api/status", "192.168.1.3")).status, 403);
    const lokalSide = await req("/certifikat", "127.0.0.1"); await lokalSide.text();
    assert.equal(v.app.tabletSet, false);
    const tablet = await req("/verdensliste", "192.168.1.3"); await tablet.text();
    status = await (await req("/api/status", "127.0.0.1")).json(); assert.equal(status.tabletSet, true);
  } finally { await v.luk(); }
});

Deno.test("WS: fælles brag gemmes, raketter og kasser deles kun i samme verden", async () => {
  const v = await opsæt(), klienter = [];
  try {
    const anden = metadata({ navn: "Andet rum", type: "fyrvaerkeri", bredde: 128 });
    await v.lager.gem(anden, new Uint8Array(128 * 128 * 64)); await v.app.start(anden.id);
    for (const figur of ["gris", "ko", "and"]) klienter.push(await forbind(v.base.replace("http", "ws") + "/ws", { figur }));
    const [a, b, c] = klienter;
    await a.vælg(v.meta.id); await b.vælg(v.meta.id); await c.vælg(anden.id);
    const fremmede = []; for (const type of ["bum", "fyrværkeri"]) c.addEventListener(type, e => fremmede.push(e.detail));
    let blok = hændelse(b, "blok", e => e.x === 66 && e.id === 7);
    a.sæt(66, 2, 64, 7); await blok;
    const bragA = hændelse(a, "bum"), bragB = hændelse(b, "bum");
    blok = hændelse(b, "blok", e => e.x === 66 && e.id === 0);
    a.brag(66.5, 2.5, 64.5); await blok; assert.deepEqual(await bragA, await bragB);
    let raketA = hændelse(a, "fyrværkeri"), raketB = hændelse(b, "fyrværkeri");
    a.fyrværkeri(65, 3, 64, "ring"); assert.deepEqual(await raketA, await raketB);
    blok = hændelse(b, "blok", e => e.x === 67 && e.id === 61);
    a.sæt(67, 2, 64, 61); await blok;
    raketA = hændelse(a, "fyrværkeri"); raketB = hændelse(b, "fyrværkeri");
    a.tændFyrkasse(67, 2, 64); assert.deepEqual(await raketA, await raketB);
    assert.equal(v.app.rum.get(v.meta.id).hent(67, 2, 64), 0);
    await c.verdener(); assert.deepEqual(fremmede, []);
    for (const k of klienter) k.luk(); await vent(30);
    await v.app.stop(v.meta.id); await v.app.start(v.meta.id);
    assert.equal(v.app.rum.get(v.meta.id).hent(66, 2, 64), 0);
    assert.equal(v.app.rum.get(v.meta.id).hent(67, 2, 64), 0);
  } finally { for (const k of klienter) k.luk(); await vent(30); await v.luk(); }
});
