import { strict as assert } from "node:assert";
import { Verdenslager, metadata } from "../verdener.js";
import { UendeligtRum } from "../uendelig-rum.js";
import { Rum } from "../rum.js";
import { BroekraftServer } from "../main.js";
import { ID } from "../../spil/broekraft/blokke.js";
import { MIDT } from "../../spil/broekraft/uendelig.js";

async function medRum(handling) {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-uendelig-rum-" });
  const lager = new Verdenslager(rod), meta = metadata({ navn: "Kanttest", type: "uendelig", frø: 123 });
  let rum, data;
  try {
    await lager.gemMeta(meta);
    ({ data } = await lager.indlæs(meta.id));
    rum = new UendeligtRum(meta, data);
    await handling(rum, data, lager);
  } finally {
    if (rum) rum.lunter.length = 0;
    await rum?.afslut(); await data?.luk();
    await Deno.remove(rod, { recursive: true });
  }
}

// En platform højt over terrænet gør retningen uafhængig af landets bakker.
function platform(rum, fra, til, y, z) {
  for (let x = fra; x <= til; x++) for (let zz = z - 7; zz <= z + 7; zz++) {
    rum.sæt(x, y - 1, zz, ID.Sten); rum.sæt(x, y, zz, 0); rum.sæt(x, y + 1, zz, 0);
  }
}

Deno.test("Uendeligt rum: vand ved en uindlæst kant bevares og fortsætter ved indlæsning", async () => {
  await medRum(async (rum, data) => {
    const cx = MIDT / 16 + 200, cz = MIDT / 16 + 100, x = cx * 16 + 15, z = cz * 16 + 8, y = 55;
    await data.indlæs(cx, cz);
    platform(rum, cx * 16, x, y, z);
    rum.sæt(x - 1, y, z, 43); // vandkilde
    rum.sæt(x, y, z, 44);     // strømmen når kanten, men må ikke tørre ud
    for (let i = 0; i < 10; i++) rum.sim.tick(0.2);
    assert.equal(data.hentSøjle(cx + 1, cz), undefined);
    assert.equal(rum.hent(x, y, z), 44);
    await data.indlæs(cx + 1, cz);
    platform(rum, x + 1, x + 3, y, z);
    for (let i = 0; i < 20; i++) rum.sim.tick(0.2);
    assert.ok(rum.hent(x + 1, y, z) >= 44 && rum.hent(x + 1, y, z) <= 50);
    assert.equal(rum.hent(x, y, z), 44);
  });
});

Deno.test("Uendeligt rum: TNT finder en gemt naboblok, selv når nabosøjlen er glemt", async () => {
  await medRum(async (rum, data) => {
    const cx = MIDT / 16 + 210, cz = MIDT / 16 + 110, x = cx * 16 + 15, z = cz * 16 + 8, y = 55, bum = [];
    rum.alle = b => { if (b.t === "bum") bum.push(b); };
    await data.indlæs(cx, cz); await data.indlæs(cx + 1, cz);
    platform(rum, x, x + 1, y, z);
    rum.sæt(x, y, z, ID.TNT); rum.sæt(x + 1, y, z, ID.TNT);
    data.maksLager = 0;
    await data.beskær(new Set([`${cx},${cz}`]));
    assert.equal(data.hentSøjle(cx + 1, cz), undefined);
    rum.tænd(x, y, z, 0.05);
    rum.tick(0.05); await rum.vent(); await rum.beskærer;
    assert.equal(rum.lunter.length, 1);
    assert.equal(rum.hent(x + 1, y, z), 0);
    for (let i = 0; i < 20; i++) { rum.tick(0.05); await rum.vent(); await rum.beskærer; }
    assert.equal(rum.lunter.length, 0); assert.equal(bum.length, 2);
    await data.indlæs(cx + 1, cz);
    assert.equal(rum.hent(x + 1, 0, z), ID.Bundsten);
  });
});

function spiller() {
  return { id: "barn", figur: "gris", version: "0.2.0", r: 1,
    socket: { readyState: 1, bufferedAmount: 0, send() {}, close() { this.readyState = 3; } } };
}

Deno.test("Uendeligt rum: hjemmets øverste byggeblok giver startplads i højde 64", async () => {
  await medRum(async (rum, data) => {
    await data.indlæs(MIDT / 16, MIDT / 16);
    rum.sæt(MIDT, 63, MIDT, ID.Glas);
    const barn = { ...spiller(), socket: socket() };
    assert.equal(await rum.ind(barn), true);
    await rum.vent();
    const velkomst = barn.socket.beskeder.find(b => b.t === "velkommen"), mig = velkomst.spillere.find(s => s.id === velkomst.dig);
    assert.equal(mig.x, MIDT + 0.5); assert.equal(mig.z, MIDT + 0.5);
    assert.equal(mig.y, 64); assert.equal(barn.y, 64);
  });
});

Deno.test("Uendeligt rum: 2000 blokkes gåtur glemmer land og holder et begrænset lager", async () => {
  await medRum(async (rum, data) => {
    data.maksLager = 4; data.glemEfter = Infinity;
    const barn = spiller(); assert.equal(await rum.ind(barn), true);
    await rum.vent();
    let højeste = data.søjler.size, fald = 0;
    for (let skridt = 0; skridt <= 125; skridt++) {
      await rum.besked(barn, { t: "pos", x: MIDT + skridt * 16 + 0.5, y: 60, z: MIDT + 0.5, yaw: 0, pitch: 0 }, 1000 + skridt * 100);
      while (barn.klumper.size < 5 || !barn.klumper.has(`${MIDT / 16 + skridt},${MIDT / 16}`)) {
        rum.strøm(barn); await rum.vent();
      }
      const før = data.søjler.size;
      højeste = Math.max(højeste, før);
      await rum.beskær();
      if (data.søjler.size < før) fald++;
      assert.ok(data.søjler.size <= 9, `lager voksede til ${data.søjler.size} søjler`);
    }
    assert.equal(barn.x, MIDT + 2000.5);
    assert.ok(højeste <= 13, `for mange søjler før beskæring: ${højeste}`);
    assert.ok(fald > 0); assert.equal(data.hentSøjle(MIDT / 16, MIDT / 16), undefined);
  });
});

function socket() {
  return { readyState: 1, bufferedAmount: 0, beskeder: [],
    send(data) { if (typeof data === "string") this.beskeder.push(JSON.parse(data)); },
    close() { this.readyState = 3; this.onclose?.(); },
    lever(besked) { this.onmessage({ data: JSON.stringify(besked) }); },
  };
}

function gammeltRum(navn) {
  return new Rum(metadata({ navn, type: "græsø", bredde: 128, frø: 123 }), new Uint8Array(128 * 128 * 64));
}

Deno.test("Uendeligt rum: samtidige valg af sidste plads bevarer taberens gamle rum", async () => {
  await medRum(async (rum, data, lager) => {
    rum.meta.maksSpillere = 1;
    const app = new BroekraftServer({ lager }), gamle = [gammeltRum("Ø A"), gammeltRum("Ø B")], sockets = [socket(), socket()];
    app.rum.set(rum.meta.id, rum);
    app.metadata = new Map([[rum.meta.id, rum.meta]]);
    for (const r of gamle) { app.rum.set(r.meta.id, r); app.metadata.set(r.meta.id, r.meta); }
    try {
      for (let i = 0; i < sockets.length; i++) {
        app.tilslut(sockets[i]);
        sockets[i].lever({ t: "hej", figur: "gris", version: "0.2.0" });
        sockets[i].lever({ t: "vælg", verden: gamle[i].meta.id });
      }
      await Promise.all([...app.spillere].map(s => s.kø));
      assert.equal(gamle[0].spillere.size, 1); assert.equal(gamle[1].spillere.size, 1);
      assert.equal(data.søjler.size, 0);
      for (const s of sockets) s.lever({ t: "vælg", verden: rum.meta.id });
      await Promise.all([...app.spillere].map(s => s.kø));
      assert.equal(rum.spillere.size, 1);
      const taber = sockets.findIndex(s => s.beskeder.some(b => b.t === "fuld"));
      assert.ok(taber >= 0);
      const peer = [...app.spillere].find(s => s.socket === sockets[taber]);
      assert.equal(peer.rum, gamle[taber]); assert.equal(gamle[taber].spillere.size, 1);
      assert.equal([...app.rum.values()].reduce((sum, r) => sum + r.spillere.size, 0), 2);
    } finally { await app.luk(); }
  });
});

Deno.test("Uendeligt rum: ugyldigt eller stoppet verdensvalg bevarer den gamle tilslutning", async () => {
  await medRum(async (rum, data) => {
    const gammel = gammeltRum("Den gamle ø"), barn = { id: "barn", figur: "gris", socket: socket() };
    gammel.ind(barn);
    try {
      assert.equal(await rum.ind(barn, () => false), false);
      assert.equal(barn.rum, gammel); assert.equal(gammel.spillere.size, 1);
      // Hold indlæsningen tilbage, mens den voksne stopper det nye rum.
      let begyndt, frigiv;
      const venter = new Promise(resolve => { begyndt = resolve; }), indlæs = data.indlæs.bind(data);
      data.indlæs = (cx, cz) => { begyndt(); return new Promise(resolve => { frigiv = () => indlæs(cx, cz).then(resolve); }); };
      const valg = rum.ind(barn);
      await venter;
      const stop = rum.afslut();
      frigiv();
      assert.equal(await valg, false); await stop;
      assert.equal(barn.rum, gammel); assert.equal(gammel.spillere.size, 1);
      assert.equal(barn.socket.readyState, 1);
      data.indlæs = indlæs;
    } finally { gammel.afslut(); }
  });
});
