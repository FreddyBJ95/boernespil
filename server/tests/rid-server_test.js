import { strict as assert } from "node:assert";
import { Rum } from "../rum.js";
import { UendeligtRum } from "../uendelig-rum.js";
import { Verdenslager, metadata } from "../verdener.js";
import { BroekraftServer } from "../main.js";
import { forbind } from "../../spil/broekraft/net.js";

// De sendte JSON-beskeder læses, som de ville blive modtaget af en anden tablet.
function spiller(id, version = "0.2.0") {
  const beskeder = [];
  return { id, figur: "gris", version, r: 1, beskeder, socket: {
    readyState: 1, bufferedAmount: 0,
    send(b) { if (typeof b === "string") beskeder.push(JSON.parse(b)); },
    close() {},
  } };
}
const pos = (s, rid) => ({ t: "pos", x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch, rid });
const info = (besked, id) => (besked.liste || besked.spillere).find(s => s.id === id);

// Også den uendelige verdens indlæsning og nedlukning indgår i prøven.
async function medRum(type, handling) {
  if (type !== "uendelig") {
    const meta = metadata({ navn: "Rid", type, bredde: 128, maksSpillere: 4, frø: 123 });
    const data = new Uint8Array(128 * 128 * 64); data.fill(26, 0, 128 * 128);
    const rum = new Rum(meta, data);
    try { await handling(rum); } finally { rum.afslut(); }
    return;
  }
  const rod = await Deno.makeTempDir({ prefix: "broekraft-rid-" }), lager = new Verdenslager(rod);
  let rum, data;
  try {
    const meta = metadata({ navn: "Rid uden kanter", type, maksSpillere: 4, frø: 123 });
    await lager.gemMeta(meta); ({ data } = await lager.indlæs(meta.id));
    rum = new UendeligtRum(meta, data);
    await handling(rum);
  } finally {
    await rum?.afslut(); await data?.luk(); await Deno.remove(rod, { recursive: true });
  }
}

for (const type of ["enhjorning", "uendelig"]) {
  Deno.test(`Rid (${type}): spillerliste og ny velkomst deler ridedyr, og verdensskift rydder det`, async () => {
    await medRum(type, async rum => {
      const a = spiller("a"), b = spiller("b"); await rum.ind(a); await rum.ind(b);
      await rum.besked(a, pos(a, "pegasus"), 1000);
      rum.tick(0.1, 1000);
      assert.equal(info(b.beskeder.at(-1), a.id).rid, "pegasus");
      assert.ok(!Object.hasOwn(info(b.beskeder.at(-1), b.id), "rid"));
      const ny = spiller("ny"); await rum.ind(ny);
      assert.equal(info(ny.beskeder.find(b => b.t === "velkommen"), a.id).rid, "pegasus");
      await rum.ind(a);
      assert.equal(a.rid, null);
      assert.ok(!Object.hasOwn(info(a.beskeder.at(-1), a.id), "rid"));
    });
  });

  Deno.test(`Rid (${type}): hurtige sadelskift ændrer ikke position eller 10/s-udsendelsen`, async () => {
    await medRum(type, async rum => {
      const a = spiller("a"), b = spiller("b"); await rum.ind(a); await rum.ind(b);
      await rum.besked(a, pos(a, "ko"), 1000);
      const før = rum.spillerInfo(a), klumper = [...a.klumper];
      a.beskeder.length = 0; b.beskeder.length = 0;
      const hurtig = { ...pos(a, "pegasus"), x: a.x + 30, y: 80, yaw: 1, pitch: 0.5 };
      await rum.besked(a, hurtig, 1001);
      assert.equal(a.rid, "pegasus");
      for (const nøgle of ["x", "y", "z", "yaw", "pitch"]) assert.equal(a[nøgle], før[nøgle]);
      assert.equal(a.sidstePos, 1000); assert.equal(a.r, 1); assert.deepEqual([...a.klumper], klumper);
      assert.equal(b.beskeder.filter(b => b.t === "pos").length, 0);
      rum.tick(0.05, 1050);
      assert.equal(b.beskeder.filter(b => b.t === "pos").length, 0);
      rum.tick(0.05, 1100);
      const liste = b.beskeder.filter(b => b.t === "pos");
      assert.equal(liste.length, 1); assert.equal(info(liste[0], a.id).rid, "pegasus");
      assert.equal(info(liste[0], a.id).x, før.x);
      await rum.besked(a, hurtig, 1100);
      assert.equal(a.x, hurtig.x); assert.equal(a.y, 80); assert.equal(a.sidstePos, 1100);
    });
  });

  Deno.test(`Rid (${type}): manglende og ugyldige værdier rydder, ugyldige koordinater gør intet`, async () => {
    await medRum(type, async rum => {
      const a = spiller("a"), b = spiller("b"); await rum.ind(a); await rum.ind(b);
      for (const rid of ["ko", "a".repeat(24), "ukendtdyr"]) {
        await rum.besked(a, pos(a, rid), 1000); assert.equal(a.rid, rid);
      }
      for (const rid of [undefined, null, 7, true, {}, ["ko"], "", "a", "a".repeat(25), "Pegasus", "rosa-enhjorning", "æø", "ko\n", "ko\r", "ko\u2028", "ko\u2029"]) {
        await rum.besked(a, pos(a, "ko"), 1000);
        const besked = pos(a, rid); if (rid === undefined) delete besked.rid;
        await rum.besked(a, besked, 1001);
        assert.equal(a.rid, null);
        assert.ok(!Object.hasOwn(rum.spillerInfo(a), "rid"));
        rum.tick(0.1, 1001);
        assert.ok(!Object.hasOwn(info(b.beskeder.at(-1), a.id), "rid"));
      }
      await rum.besked(a, pos(a, "ko"), 1200);
      const før = rum.spillerInfo(a);
      for (const fejl of [{ x: NaN }, { x: -1 }, { x: rum.meta.bredde }, { z: Infinity },
        { z: -1 }, { z: rum.meta.dybde }, { y: -1 }, { y: rum.meta.højde + 65 },
        { yaw: 1e6 + 1 }, { pitch: Math.PI + 0.1 }, { pitch: undefined }]) {
        await rum.besked(a, { ...pos(a, "pegasus"), ...fejl }, 1300);
        assert.deepEqual(rum.spillerInfo(a), før); assert.equal(a.sidstePos, 1200);
      }
    });
  });
}

// En rigtig 0.1.0-forbindelse kan stadig bygge og bevæge sig uden det nye felt.
Deno.test("Rid HTTP/WS: gamle klienter uden rid virker og modtager de nye spillerfelter", async () => {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-rid-gammel-" }), lager = new Verdenslager(rod);
  const meta = metadata({ navn: "Gammel tablet", type: "enhjorning", bredde: 128 });
  await lager.gem(meta, new Uint8Array(128 * 128 * 64));
  const app = new BroekraftServer({ lager }); await app.init(); await app.start(meta.id);
  const http = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req, addr) => app.håndter(req, addr));
  const klienter = [];
  app.kørTimere();
  try {
    const url = `ws://127.0.0.1:${http.addr.port}/ws`;
    const a = await forbind(url), gammel = await forbind(url, { version: "0.1.0" }); klienter.push(a, gammel);
    await a.vælg(meta.id); await gammel.vælg(meta.id);
    const delt = hændelse(gammel, "pos", b => b.liste.some(s => s.id === a.info.dig && s.rid === "pegasus"));
    a.send({ t: "pos", x: 64, y: 20, z: 64, yaw: 0, pitch: 0, rid: "pegasus" });
    await delt;
    const flyttet = hændelse(a, "pos", b => b.liste.some(s => s.id === gammel.info.dig && s.x === 70));
    gammel.send({ t: "pos", x: 70, y: 20, z: 64, yaw: 0, pitch: 0 });
    assert.ok(!Object.hasOwn(info(await flyttet, gammel.info.dig), "rid"));
    const blok = hændelse(a, "blok", b => b.x === 66 && b.y === 10 && b.id === 7);
    gammel.sæt(66, 10, 64, 7); await blok;
  } finally {
    for (const f of klienter) f.luk();
    await app.luk(); await http.shutdown(); await Deno.remove(rod, { recursive: true });
  }
});

function hændelse(f, type, vælg) {
  return new Promise((resolve, reject) => {
    const lyt = e => {
      if (!vælg(e.detail)) return;
      clearTimeout(timer); f.removeEventListener(type, lyt); resolve(e.detail);
    };
    const timer = setTimeout(() => { f.removeEventListener(type, lyt); reject(new Error(`Mangler ${type}`)); }, 5000);
    f.addEventListener(type, lyt);
  });
}
