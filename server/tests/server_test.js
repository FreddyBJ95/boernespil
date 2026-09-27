import { strict as assert } from "node:assert";
import { join } from "node:path";
import { BroekraftServer, lokal, privat } from "../main.js";
import { Verdenslager, metadata } from "../verdener.js";
import { forbind } from "../../spil/broekraft/net.js";

const vent = ms => new Promise(r => setTimeout(r, ms));
function hændelse(f, type, vælg = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { f.removeEventListener(type, lyt); reject(new Error(`Mangler ${type}`)); }, 5000);
    const lyt = e => { if (!vælg(e.detail)) return; clearTimeout(timer); f.removeEventListener(type, lyt); resolve(e.detail); };
    f.addEventListener(type, lyt);
  });
}

async function opsæt() {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-test-" }), lager = new Verdenslager(rod);
  const meta = metadata({ navn: "Familiens verden", type: "græsø", bredde: 128, maksSpillere: 2 });
  const data = new Uint8Array(128 * 128 * 64); data.fill(26, 0, 128 * 128);
  await lager.gem(meta, data);
  const app = new BroekraftServer({ lager }); await app.init(); await app.start(meta.id);
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
    for (const valg of [{ bredde: 64 }, { maksSpillere: 9 }, { maksSpillere: 0 }, { frø: -1 }, { type: "ukendt" }]) assert.throws(() => metadata({ ...m, ...valg }));
    assert.throws(() => lager.mappe("../../andre-filer"));
    assert.equal(lokal("::1"), true); assert.equal(lokal("192.168.1.1"), false);
    for (const ip of ["10.0.0.1", "172.16.0.1", "192.168.0.1"]) assert.equal(privat(ip), true);
    for (const ip of ["8.8.8.8", "172.32.0.1", "192.168.999.1"]) assert.equal(privat(ip), false);
  } finally { await Deno.remove(rod, { recursive: true }); }
});
