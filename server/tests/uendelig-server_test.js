import { strict as assert } from "node:assert";
import { BroekraftServer } from "../main.js";
import { Verdenslager, metadata } from "../verdener.js";
import { forbind } from "../../spil/broekraft/net.js";
import { MIDT } from "../../spil/broekraft/uendelig.js";
import { ID } from "../../spil/broekraft/blokke.js";

// Den rigtige WebSocket-forbindelse afprøver velkomst, klumper og gemning sammen.
function hændelse(f, type, vælg = () => true) {
  return new Promise((resolve, reject) => {
    const lyt = e => {
      if (!vælg(e.detail)) return;
      clearTimeout(timer); f.removeEventListener(type, lyt); resolve(e.detail);
    };
    const timer = setTimeout(() => { f.removeEventListener(type, lyt); reject(new Error(`Mangler ${type}`)); }, 10000);
    f.addEventListener(type, lyt);
  });
}

Deno.test("Uendelig HTTP/WS: opret uden fuld fil, to spillere, fjern klump og genstart", async () => {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-uendelig-ws-" });
  const lager = new Verdenslager(rod), app = new BroekraftServer({ lager }); await app.init();
  const http = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req, info) => app.håndter(req, info));
  const base = `http://127.0.0.1:${http.addr.port}`, klienter = [];
  app.kørTimere();
  try {
    const oprettet = await fetch(base + "/api/opret", {
      method: "POST", headers: { origin: base, "x-broekraft-token": app.token },
      body: JSON.stringify({ navn: "Langt ude", type: "uendelig", frø: 12345, maksSpillere: 2 }),
    });
    assert.equal(oprettet.status, 202);
    const { id } = await oprettet.json(); await app.job.get(id).færdig;
    assert.equal(app.job.get(id).status, "færdig");
    assert.equal(app.liste()[0].uendelig, true);
    assert.equal(app.rum.get(id).data.søjler.size, 0);
    await assert.rejects(Deno.stat(lager.mappe(id) + "/data.bin.gz"), Deno.errors.NotFound);
    const status = await (await fetch(base + "/api/status")).json();
    assert.equal(status.verdener[0].uendelig, true); assert.equal(status.version, "0.5.0");
    const valg = await fetch(base + "/kontrol/verdensvalg.js"); assert.equal(valg.status, 200); await valg.text();
    const url = base.replace("http", "ws") + "/ws";
    for (const figur of ["gris", "ko"]) {
      const f = await forbind(url, { figur }); klienter.push(f); f.udsyn(1);
      const hjemme = hændelse(f, "klump", k => k.cx === 2048 && k.cz === 2048);
      const velkomst = await f.vælg(id);
      assert.equal(velkomst.verden.uendelig, true); assert.equal(velkomst.verden.bredde, 65536);
      const mig = velkomst.spillere.find(p => p.id === velkomst.dig);
      assert.equal(mig.x, MIDT + 0.5); assert.equal(mig.z, MIDT + 0.5); assert.ok(mig.y > 18);
      await hjemme;
    }
    const [a, b] = klienter, x = MIDT + 3000, y = 40, z = MIDT, cx = x >> 4;
    for (const f of klienter) {
      const fjern = hændelse(f, "klump", k => k.cx === cx && k.cz === 2048);
      f.send({ t: "pos", x: x + 0.5, y: 60, z: z + 0.5, yaw: 0, pitch: 0 }); await fjern;
    }
    const bygget = hændelse(b, "blok", e => e.x === x && e.y === y && e.id === ID.Glas);
    a.sæt(x, y, z, ID.Glas); await bygget;
    for (const f of klienter) f.luk();
    await app.stop(id); await app.start(id);
    const f = await forbind(url); klienter.push(f); f.udsyn(1); await f.vælg(id);
    const gendannet = hændelse(f, "klump", k => k.cx === cx && k.cz === 2048);
    f.send({ t: "pos", x: x + 0.5, y: 60, z: z + 0.5, yaw: 0, pitch: 0 });
    const klump = await gendannet;
    assert.equal(klump.data[(x & 15) + y * 256], ID.Glas);
    assert.equal(app.rum.get(id).hent(x, y, z), ID.Glas);
  } finally {
    for (const f of klienter) f.luk();
    await app.luk(); await http.shutdown(); await Deno.remove(rod, { recursive: true });
  }
});

Deno.test("Uendelig: 0.1.0-klient beholder sin gamle verden og tilbydes kun endeligt land", async () => {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-gammel-ws-" }), lager = new Verdenslager(rod);
  const gammelVerden = metadata({ navn: "Den gamle ø", type: "græsø", bredde: 128 });
  const uendelig = metadata({ navn: "Årstiderne", type: "uendelig", frø: 1 });
  await lager.gem(gammelVerden, new Uint8Array(128 * 128 * 64)); await lager.gemMeta(uendelig);
  const app = new BroekraftServer({ lager }); await app.init();
  const http = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req, info) => app.håndter(req, info));
  let f;
  try {
    f = await forbind(`ws://127.0.0.1:${http.addr.port}/ws`, { version: "0.1.0" });
    assert.deepEqual((await f.verdener()).map(v => v.id), [gammelVerden.id]);
    const velkomst = await f.vælg(gammelVerden.id); assert.equal(velkomst.verden.uendelig, false);
    await assert.rejects(f.vælg(uendelig.id), /Genindlæs/);
    assert.equal(app.rum.get(gammelVerden.id).spillere.size, 1);
    assert.equal(app.rum.get(uendelig.id).spillere.size, 0);
    const r = app.rum.get(gammelVerden.id), s = [...r.spillere.values()][0];
    const bygget = hændelse(f, "blok", b => b.id === ID.Glas);
    f.sæt(Math.floor(s.x) + 2, 40, Math.floor(s.z), ID.Glas); await bygget;
  } finally { f?.luk(); await app.luk(); await http.shutdown(); await Deno.remove(rod, { recursive: true }); }
});
