import { strict as assert } from "node:assert";
import { Verdenslager, metadata } from "../verdener.js";
import { UendeligtRum } from "../uendelig-rum.js";
import { MIDT } from "../../spil/broekraft/uendelig.js";
import { ID } from "../../spil/broekraft/blokke.js";

// TNT står ved kanten af den sete søjle. Kun naboens første læsning fejler.
async function prøve(handling) {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-tnt-fejl-" }), lager = new Verdenslager(rod);
  const meta = metadata({ navn: "TNT ved kanten", type: "uendelig", frø: 12345 });
  await lager.gem(meta, null);
  const { data } = await lager.indlæs(meta.id), cx = MIDT / 16, cz = MIDT / 16;
  await data.indlæs(cx, cz);
  const rum = new UendeligtRum(meta, data), x = MIDT + 15, y = 19, z = MIDT + 8;
  const mål = [x - 1, y - 1, z], oprindelig = rum.hent(...mål), beskeder = [], fejl = [];
  assert.notEqual(oprindelig, 0);               // hullet skal ændre den oprindelige jord og derfor også gemmes
  const socket = { readyState: 1, bufferedAmount: 0,
    send(besked) { if (typeof besked === "string") beskeder.push(JSON.parse(besked)); },
    close() { this.readyState = 3; },
  };
  const spiller = { id: "barn", figur: "ko", version: "0.2.0", rum, socket,
    x: x + 0.5, y: y + 3, z: z + 0.5, yaw: 0, pitch: 0, r: 1, klumper: new Set([`${cx},${cz}`]) };
  rum.spillere.set(spiller.id, spiller);
  rum.sæt(...mål, ID.Planker); rum.sæt(x, y, z, ID.TNT);
  const indlæs = data.indlæs.bind(data), consoleError = console.error;
  let svigter = true, læsefejl = 0;
  data.indlæs = (nx, nz) => {
    if (svigter && nx === cx + 1 && nz === cz) {
      læsefejl++;
      return Promise.reject(new Error("Prøvens lagersvigt"));
    }
    return indlæs(nx, nz);
  };
  console.error = (...dele) => fejl.push(dele.join(" "));
  let genlæst;
  const genstart = async () => {
    await lager.gem(meta, data); await data.luk();
    genlæst = (await new Verdenslager(rod).indlæs(meta.id)).data;
    const bytes = await genlæst.indlæs(cx, cz), indeks = (mål[0] % 16) + (mål[2] % 16) * 16 + mål[1] * 256;
    assert.equal(bytes[indeks], 0);              // også efter genstart ligger det nye hul i den rigtige søjle
  };
  try {
    await handling({ rum, data, x, y, z, mål, beskeder, fejl, læsefejl: () => læsefejl,
      reparer() { svigter = false; }, genstart });
  } finally {
    svigter = false; data.indlæs = indlæs;
    try { await rum.afslut(); await data.luk(); await genlæst?.luk(); }
    finally { console.error = consoleError; await Deno.remove(rod, { recursive: true }); }
  }
}

Deno.test("Uendelig TNT: tick viser læsefejl og beholder lunten, indtil naboen kan læses", async () => {
  await prøve(async ({ rum, data, x, y, z, mål, beskeder, fejl, læsefejl, reparer, genstart }) => {
    rum.tænd(x, y, z, 0.01);
    assert.equal(rum.hent(x, y, z), 0);
    rum.tick(0.05);                            // tick kan ikke vente på disk/worker
    await assert.rejects(rum.vent(), /Prøvens lagersvigt/);
    await rum.beskærer;
    assert.equal(læsefejl(), 1); assert.equal(data.hentSøjle(MIDT / 16 + 1, MIDT / 16), undefined);
    assert.equal(rum.lunter.length, 1); assert.equal(rum.lunter[0].x, x + 0.5); assert.equal(rum.lunter[0].z, z + 0.5);
    assert.equal(rum.lunter[0].lunte, 2); assert.equal(rum.hent(...mål), ID.Planker);
    assert.ok(fejl.some(tekst => tekst.includes("TNT venter på landet: Prøvens lagersvigt")));
    assert.ok(beskeder.some(b => b.t === "fejl" && b.besked.includes("Prøvens lagersvigt")));
    reparer(); await rum.afslut();
    assert.equal(rum.lunter.length, 0); assert.equal(rum.hent(...mål), 0);
    assert.equal(rum.beskyttede.size, 0); assert.equal(rum.opgaver.size, 0);
    await genstart();
  });
});

Deno.test("Uendelig TNT: mislykket afslut afvises uden tab af lunten og kan prøves igen", async () => {
  await prøve(async ({ rum, x, y, z, mål, fejl, reparer, genstart }) => {
    rum.tænd(x, y, z);
    await assert.rejects(rum.afslut(), /Prøvens lagersvigt/);
    assert.equal(rum.lunter.length, 1); assert.equal(rum.hent(...mål), ID.Planker);
    assert.equal(fejl.length, 1); assert.equal(rum.beskyttede.size, 0);
    reparer(); await rum.afslut();
    assert.equal(rum.lunter.length, 0); assert.equal(rum.hent(...mål), 0);
    await genstart();
  });
});
