import { strict as assert } from "node:assert";
import { Rum } from "../rum.js";
import { UendeligtRum } from "../uendelig-rum.js";
import { Verdenslager, metadata } from "../verdener.js";
import { ID } from "../../spil/broekraft/blokke.js";
import { MIDT } from "../../spil/broekraft/uendelig.js";

function spiller(rum, id = "barn", x = 64.5, y = 25.5, z = 64.5) {
  const beskeder = [], barn = { id, version: "0.2.0", figur: "gris", rum, x, y, z, yaw: 0, pitch: 0, r: 1,
    klumper: new Set([`${Math.floor(x / 16)},${Math.floor(z / 16)}`]), socket: { readyState: 1, bufferedAmount: 0,
      send(data) { if (typeof data === "string") beskeder.push(JSON.parse(data)); }, close() { this.readyState = 3; } }, beskeder };
  rum.spillere.set(id, barn);
  return barn;
}

function endeligtRum() {
  return new Rum(metadata({ navn: "Store brag", type: "skydebane", bredde: 128 }), new Uint8Array(128 * 128 * 64));
}

// De valgte prøvesten ligger sikkert inden for radius, væk fra den tilfældige yderkant.
Deno.test("Store brag: almindelig 3,3, mini 5, atom 9 og kæmpe 13 bruger serverens radius", () => {
  for (const [slags, r] of [[undefined, 3.3], ["mini", 5], ["atom", 9], ["kæmpe", 13]]) {
    const rum = endeligtRum(), barn = spiller(rum);
    for (const afstand of [2, 4, 8, 12, 14]) rum.sæt(64 + afstand, 25, 64, ID.Sten);
    rum.besked(barn, { t: "brag", x: 64.5, y: 25.5, z: 64.5, ...(slags ? { slags } : {}), radius: 100 }, 1000);
    for (const afstand of [2, 4, 8, 12, 14]) assert.equal(rum.hent(64 + afstand, 25, 64), afstand < r ? 0 : ID.Sten);
    assert.deepEqual(barn.beskeder.find(b => b.t === "bum"), { t: "bum", x: 64.5, y: 25.5, z: 64.5, ...(slags ? { slags } : {}) });
  }
});

Deno.test("Store brag: ukendt slags afvises; gamle klienters almindelige brag virker stadig", () => {
  const rum = endeligtRum(), barn = spiller(rum); barn.version = "0.1.0";
  rum.sæt(66, 25, 64, ID.Sten);
  for (const slags of ["ukendt", "toString", null, ["atom"], {}, 9]) {
    rum.besked(barn, { t: "brag", x: 64.5, y: 25.5, z: 64.5, slags }, 1000);
  }
  assert.equal(rum.hent(66, 25, 64), ID.Sten);
  assert.equal(barn.beskeder.filter(b => b.t === "bum").length, 0);
  rum.besked(barn, { t: "brag", x: 64.5, y: 25.5, z: 64.5 }, 1000);
  assert.equal(rum.hent(66, 25, 64), 0);
});

// Et højt brag efterlader jorden: mønstret skal ramme den øverste blok, ikke en fast y-værdi.
Deno.test("Atomkrater: øverste jord får slim/aske; væsker og uknuselige blokke bevares", () => {
  const oprindelig = Math.random;
  try {
    Math.random = () => 0.1;
    const rum = endeligtRum(), barn = spiller(rum, "barn", 64.5, 18.5, 64.5);
    rum.sæt(64, 5, 64, ID.Sten); rum.sæt(64, 4, 64, ID.Planker);
    rum.sæt(70, 6, 64, ID.Sten); rum.sæt(73, 5, 64, ID.Sten);
    rum.sæt(65, 5, 64, ID.Vand); rum.sæt(66, 5, 64, ID.Bundsten);
    rum.sæt(64, 18, 65, ID.Vand); rum.sæt(64, 18, 66, ID.Bundsten);
    rum.besked(barn, { t: "brag", x: 64.5, y: 18.5, z: 64.5, slags: "atom" }, 1000);
    assert.equal(rum.hent(64, 5, 64), ID.Atomslim); assert.equal(rum.hent(64, 4, 64), ID.Planker);
    assert.equal(rum.hent(70, 6, 64), ID.Aske); assert.equal(rum.hent(73, 5, 64), ID.Sten);
    assert.equal(rum.hent(65, 5, 64), ID.Vand); assert.equal(rum.hent(66, 5, 64), ID.Bundsten);
    assert.equal(rum.hent(64, 18, 65), ID.Vand); assert.equal(rum.hent(64, 18, 66), ID.Bundsten);
    const mini = endeligtRum(), lille = spiller(mini, "lille", 64.5, 18.5, 64.5);
    mini.sæt(64, 5, 64, ID.Sten);
    mini.besked(lille, { t: "brag", x: 64.5, y: 18.5, z: 64.5, slags: "mini" }, 1000);
    assert.equal(mini.hent(64, 5, 64), ID.Sten); // mini får ingen fælles kraterjord
  } finally { Math.random = oprindelig; }
});

Deno.test("Atomkrater: ild kommer kun over fri jord, og høje søjler over træfpunktet skånes", () => {
  const oprindelig = Math.random;
  try {
    Math.random = () => 0.98;
    const rum = endeligtRum();
    rum.sæt(64, 5, 64, ID.Sten); rum.sæt(65, 40, 64, ID.Sten);
    rum.atomKrater(64.5, 18.5, 64.5, 9);
    assert.equal(rum.hent(64, 5, 64), ID.Sten); assert.equal(rum.hent(64, 6, 64), ID.Ild);
    assert.equal(rum.hent(65, 40, 64), ID.Sten); assert.equal(rum.hent(65, 41, 64), 0);
    rum.sæt(64, 63, 64, ID.Sten); rum.atomKrater(64.5, 80, 64.5, 9);
    assert.equal(rum.hent(64, 63, 64), ID.Sten);
  } finally { Math.random = oprindelig; }
});

Deno.test("Atomkrater: fast jord under vand, planter og portaler følger tabletternes topY", () => {
  const oprindelig = Math.random;
  try {
    const rum = endeligtRum(), lag = [ID.Vand, ID["Rød blomst"], ID.Portal];
    for (let i = 0; i < lag.length; i++) {
      rum.sæt(64 + i, 5, 64, ID.Sten); rum.sæt(64 + i, 6, 64, lag[i]);
    }
    Math.random = () => 0.1;
    rum.atomKrater(64.5, 18.5, 64.5, 9);
    for (let i = 0; i < lag.length; i++) {
      assert.equal(rum.hent(64 + i, 5, 64), ID.Atomslim);
      assert.equal(rum.hent(64 + i, 6, 64), lag[i]);
    }
    Math.random = () => 0.98;
    rum.atomKrater(64.5, 18.5, 64.5, 9);
    for (let i = 0; i < lag.length; i++) assert.equal(rum.hent(64 + i, 6, 64), lag[i]);
  } finally { Math.random = oprindelig; }
});

Deno.test("Store brag: én hvert andet sekund pr. spiller og højst to ventende sprængninger pr. rum", async () => {
  const rum = endeligtRum(), børn = ["a", "b", "c"].map(id => spiller(rum, id));
  const frigiv = [], accepteret = [];
  rum.eksploder = (...sted) => { accepteret.push(sted); return new Promise(resolve => { frigiv.push(resolve); }); };
  const brag = { t: "brag", x: 64.5, y: 25.5, z: 64.5, slags: "atom" };
  const a = rum.besked(børn[0], brag, 1000), b = rum.besked(børn[1], brag, 1000);
  assert.equal(rum.storeBrag, 2);
  rum.besked(børn[2], brag, 1000); assert.equal(accepteret.length, 2);
  frigiv.shift()(); await a; assert.equal(rum.storeBrag, 1);
  rum.besked(børn[0], { ...brag, slags: "kæmpe" }, 2999); assert.equal(accepteret.length, 2);
  const ny = rum.besked(børn[0], { ...brag, slags: "kæmpe" }, 3000);
  assert.equal(accepteret.length, 3); assert.equal(rum.storeBrag, 2);
  while (frigiv.length) frigiv.shift()(); await Promise.all([b, ny]); assert.equal(rum.storeBrag, 0);
});

async function medUendeligtRum(handling) {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-store-brag-" }), lager = new Verdenslager(rod);
  const meta = metadata({ navn: "Store brag ved kanten", type: "uendelig", frø: 12345 });
  let rum, data;
  try {
    await lager.gemMeta(meta); ({ data } = await lager.indlæs(meta.id)); rum = new UendeligtRum(meta, data);
    await handling(rum, data, lager);
  } finally {
    await rum?.afslut(); await data?.luk(); await Deno.remove(rod, { recursive: true });
  }
}

Deno.test("Uendeligt kæmpebrag: indlæser og gemmer blokke tolv blokke væk i en glemt nabosøjle", async () => {
  await medUendeligtRum(async (rum, data, lager) => {
    const cx = MIDT / 16, cz = MIDT / 16, x = MIDT + 15.5, y = 55.5, z = MIDT + 8.5;
    await data.indlæs(cx, cz); await data.indlæs(cx + 1, cz);
    rum.sæt(Math.floor(x) + 12, 55, Math.floor(z), ID.Sten); rum.sæt(Math.floor(x) + 14, 55, Math.floor(z), ID.Sten);
    data.maksLager = 0; await data.beskær(new Set([`${cx},${cz}`]));
    assert.equal(data.hentSøjle(cx + 1, cz), undefined);
    const barn = spiller(rum, "barn", x, y + 2, z);
    await rum.besked(barn, { t: "brag", x, y, z, slags: "kæmpe" }, 1000);
    assert.equal(rum.hent(Math.floor(x) + 12, 55, Math.floor(z)), 0);
    assert.equal(rum.hent(Math.floor(x) + 14, 55, Math.floor(z)), ID.Sten);
    assert.equal(barn.beskeder.find(b => b.t === "bum").slags, "kæmpe");
    assert.equal(rum.beskyttede.size, 0); assert.equal(rum.storeBrag, 0); assert.equal(rum.ventendeBrag, 0);
    await lager.gem(rum.meta, data); await data.beskær(new Set()); await data.indlæs(cx + 1, cz);
    assert.equal(rum.hent(Math.floor(x) + 12, 55, Math.floor(z)), 0);
  });
});

Deno.test("Uendeligt atombrag: læsefejl beholder radius/sted, slipper pladser og kan afsluttes efter reparation", async () => {
  await medUendeligtRum(async (rum, data) => {
    const cx = MIDT / 16, cz = MIDT / 16, x = MIDT + 15.5, y = 55.5, z = MIDT + 8.5;
    await data.indlæs(cx, cz); await data.indlæs(cx + 1, cz);
    rum.sæt(Math.floor(x), 55, Math.floor(z), ID.Planker);
    rum.sæt(Math.floor(x) + 8, 55, Math.floor(z), ID.Sten);
    data.maksLager = 0; await data.beskær(new Set([`${cx},${cz}`]));
    const barn = spiller(rum, "barn", x, y + 2, z), indlæs = data.indlæs.bind(data), fejl = console.error;
    let svigter = true;
    data.indlæs = (nx, nz) => svigter && nx === cx + 1 && nz === cz ? Promise.reject(new Error("Prøvens atomfejl")) : indlæs(nx, nz);
    console.error = () => {};
    try {
      await assert.rejects(rum.besked(barn, { t: "brag", x, y, z, slags: "atom" }, 1000), /Prøvens atomfejl/);
      assert.equal(rum.hent(Math.floor(x), 55, Math.floor(z)), ID.Planker);
      assert.equal(barn.beskeder.filter(b => b.t === "bum").length, 0);
      assert.equal(rum.lunter.length, 1); assert.equal(rum.lunter[0].slags, "atom");
      assert.equal(rum.lunter[0].x, x); assert.equal(rum.lunter[0].y + 0.5, y);
      assert.equal(rum.storeBrag, 0); assert.equal(rum.ventendeBrag, 0); assert.equal(rum.beskyttede.size, 0);
      await assert.rejects(rum.afslut(), /Prøvens atomfejl/);
      assert.equal(rum.lunter.length, 1); assert.equal(rum.lunter[0].slags, "atom");
      svigter = false; await rum.afslut();
      await data.indlæs(cx + 1, cz);
      assert.equal(rum.lunter.length, 0); assert.equal(rum.hent(Math.floor(x) + 8, 55, Math.floor(z)), 0);
      assert.equal(barn.beskeder.filter(b => b.t === "bum").length, 0); // spilleren er sendt ud før stop
    } finally { svigter = false; data.indlæs = indlæs; console.error = fejl; }
  });
});

Deno.test("Uendeligt atombrag: søjler forbliver beskyttet, indtil alle læsninger er færdige trods en fejl", async () => {
  await medUendeligtRum(async (rum, data) => {
    const cx = MIDT / 16, cz = MIDT / 16, x = MIDT + 15.5, y = 55.5, z = MIDT + 8.5;
    await data.indlæs(cx, cz); data.maksLager = 0;
    const barn = spiller(rum, "barn", x, y + 2, z), indlæs = data.indlæs.bind(data), fejl = console.error;
    let frigiv, begyndt;
    const venter = new Promise(resolve => { begyndt = resolve; });
    data.indlæs = (nx, nz) => {
      if (nx === cx + 1 && nz === cz) return Promise.reject(new Error("Én søjle fejler"));
      if (nx === cx && nz === cz) { begyndt(); return new Promise(resolve => { frigiv = () => indlæs(nx, nz).then(resolve); }); }
      return indlæs(nx, nz);
    };
    console.error = () => {};
    try {
      const opgave = rum.besked(barn, { t: "brag", x, y, z, slags: "atom" }, 1000);
      opgave.catch(() => {}); await venter; await Promise.resolve();
      assert.ok(rum.beskyttede.size >= 4); assert.equal(rum.storeBrag, 1);
      await rum.beskær(); assert.ok(data.hentSøjle(cx, cz));
      const slip = frigiv; frigiv = null; slip(); await assert.rejects(opgave, /Én søjle fejler/);
      assert.equal(rum.beskyttede.size, 0); assert.equal(rum.storeBrag, 0);
    } finally { data.indlæs = indlæs; frigiv?.(); console.error = fejl; }
  });
});
