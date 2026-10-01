import { strict as assert } from "node:assert";
import { sendEffekt, rensEffekt } from "../effekt.js";
import { Rum } from "../rum.js";
import { UendeligtRum } from "../uendelig-rum.js";
import { metadata } from "../verdener.js";
import { ID } from "../../spil/broekraft/blokke.js";
import { forbind } from "../../spil/broekraft/net.js";

function spiller(id, version = "0.2.0") {
  const beskeder = [];
  return { id, version, x: 64, y: 20, z: 64, beskeder,
    socket: { readyState: 1, bufferedAmount: 0, close() {}, send(data) { beskeder.push(JSON.parse(data)); } } };
}

function opsæt() {
  const rum = { meta: { bredde: 256, dybde: 256, højde: 64 }, spillere: new Map() };
  const a = spiller("a"), b = spiller("b"), gammel = spiller("gammel", "0.1.0");
  for (const s of [a, b, gammel]) { s.rum = rum; rum.spillere.set(s.id, s); }
  return { rum, a, b, gammel };
}

const effekter = [
  { t: "effekt", slags: "skud", type: "gevær", x: 64, y: 20, z: 64, vx: 1, vy: 0, vz: 0 },
  { t: "effekt", slags: "missil", x: 64, z: 64, bund: 18, top: 24, mx: 110.4, mz: 125.8, forsinkelse: 0.45 },
  { t: "effekt", slags: "svampesky", x: 70, y: 20, z: 70, str: "atom" },
  { t: "effekt", slags: "lunte", x: 64, y: 20, z: 64, id: ID.Atombombe, lunte: 2.2 },
  { t: "effekt", slags: "droner", x: 64, y: 20, z: 64 },
];

Deno.test("Effekt: alle fem slags når kun andre nye klienter i samme rum med godkendte felter", () => {
  const { rum, a, b, gammel } = opsæt(), andet = opsæt();
  for (const e of effekter) {
    assert.equal(sendEffekt(rum, a, { ...e, fra: "falsk", til: andet.a.id, radius: 200, data: { t: "brag" } }, 1000), true);
    assert.deepEqual(b.beskeder.at(-1), { ...e, fra: a.id });
  }
  assert.equal(a.beskeder.length, 0); assert.equal(gammel.beskeder.length, 0);
  assert.equal(andet.b.beskeder.length, 0);
  assert.equal(sendEffekt(rum, gammel, effekter[4], 1000), false);
  assert.equal(sendEffekt(rum, { ...a }, effekter[4], 1000), false);
  rum.spillere.delete(a.id);
  assert.equal(sendEffekt(rum, a, effekter[4], 1000), false);
  assert.equal(b.beskeder.length, effekter.length);
});

Deno.test("Effekt: alle tal skal findes og være endelige, og slags/type/størrelse er faste", () => {
  const { rum, a, b } = opsæt();
  for (const e of effekter) {
    for (const k of Object.keys(e).filter(k => typeof e[k] === "number")) {
      for (const ugyldig of [NaN, Infinity, -Infinity, "1", undefined]) {
        assert.equal(sendEffekt(rum, a, { ...e, [k]: ugyldig }, 1000), false, `${e.slags}.${k}`);
      }
    }
  }
  for (const e of [null, {}, { t: "brag", slags: "droner", x: 64, y: 20, z: 64 },
    { ...effekter[0], type: "skum" }, { ...effekter[2], str: "stor" },
    { ...effekter[4], slags: "constructor" }, { ...effekter[4], slags: "__proto__" },
    { ...effekter[4], slags: { toString: true, valueOf: true } }, { ...effekter[4], slags: [] }]) {
    assert.equal(sendEffekt(rum, a, e, 1000), false);
  }
  assert.equal(b.beskeder.length, 0);
});

Deno.test("Effekt: afstand, verdensgrænser og retning afvises før kvoterne bruges", () => {
  const { rum, a, b } = opsæt();
  const ugyldige = [
    { ...effekter[0], x: 72.01 }, { ...effekter[0], vx: 1.51 }, { ...effekter[0], vx: 1.1, vy: 1.1 },
    { ...effekter[1], x: 161 }, { ...effekter[1], x: 64.1 }, { ...effekter[1], bund: -1 },
    { ...effekter[1], top: 17 }, { ...effekter[1], top: 64 }, { ...effekter[1], top: 43 },
    { ...effekter[1], mx: -0.1 }, { ...effekter[1], mz: 256 },
    { ...effekter[1], forsinkelse: -0.1 }, { ...effekter[1], forsinkelse: 5.1 },
    { ...effekter[2], x: 192.1, z: 64 }, { ...effekter[3], x: 76.1 },
    { ...effekter[3], y: 20.1 }, { ...effekter[3], id: ID.Sten }, { ...effekter[3], id: 255 },
    { ...effekter[3], id: 1.5 }, { ...effekter[3], lunte: 0.19 }, { ...effekter[3], lunte: 6.01 },
    { ...effekter[4], y: 32.01 },
  ];
  for (const e of effekter.filter(e => e.slags !== "missil")) {
    ugyldige.push({ ...e, x: -1 }, { ...e, z: 256 }, { ...e, y: -1 }, { ...e, y: 129 });
  }
  for (const e of ugyldige) assert.equal(sendEffekt(rum, a, e, 1000), false, JSON.stringify(e));
  assert.equal(b.beskeder.length, 0);
  assert.equal(sendEffekt(rum, a, { ...effekter[0], x: 72, vx: 1.5 }, 1000), true);
  for (const id of [ID.TNT, ID.Atombombe, ID.Atomtønde, ID.Kæmpebombe]) {
    assert.equal(sendEffekt(rum, a, { ...effekter[3], id, lunte: id === ID.TNT ? 0.2 : 6 }, 1000), true);
  }
  assert.equal(b.beskeder.length, 5);
});

Deno.test("Effekt: højst 1024 UTF-8 bytes, selv når store ekstra felter ellers bliver renset væk", () => {
  const { rum, a } = opsæt(), e = { ...effekter[4], ekstra: "" };
  const længde = new TextEncoder().encode(JSON.stringify(e)).length;
  e.ekstra = "a".repeat(1024 - længde);
  assert.ok(rensEffekt(rum, a, e));
  assert.equal(rensEffekt(rum, a, { ...e, ekstra: e.ekstra + "a" }), null);
  assert.equal(rensEffekt(rum, a, { ...e, ekstra: "æ".repeat(512) }), null);
});

Deno.test("Effekt: spillerens otte og rummets fyrre gælder i et rullende sekund", () => {
  const { rum, a, b } = opsæt(), e = effekter[4];
  for (let i = 0; i < 8; i++) assert.equal(sendEffekt(rum, a, e, 1000), true);
  assert.equal(sendEffekt(rum, a, e, 1999), false);
  assert.equal(sendEffekt(rum, a, e, 2000), true);
  assert.equal(b.beskeder.length, 9);

  const fælles = opsæt();
  for (let i = 0; i < 6; i++) {
    const s = spiller(`spiller${i}`); fælles.rum.spillere.set(s.id, s);
    for (let j = 0; j < 8; j++) assert.equal(sendEffekt(fælles.rum, s, e, 1000), i < 5);
    if (i === 5) {
      assert.equal(s.effektTider.length, 0); // afvist rumkvote tager ikke spillerens plads
      assert.equal(sendEffekt(fælles.rum, s, e, 2000), true);
    }
  }
  assert.equal(fælles.b.beskeder.length, 41);
});

Deno.test("Effekt: rigtige endelige og uendelige rum deler beskeden uden at ændre eller hente blokke", async () => {
  const endeligt = new Rum(metadata({ navn: "Effekter", type: "skydebane", bredde: 128 }), new Uint8Array(128 * 128 * 64));
  const meta = metadata({ navn: "Effekter uden kanter", type: "uendelig", frø: 123 });
  const uendeligt = new UendeligtRum(meta, { length: 0, hentSøjle() { throw new Error("En effekt må ikke hente blokke"); } });
  for (const rum of [endeligt, uendeligt]) {
    const a = spiller("a"), b = spiller("b");
    a.x = b.x = rum.meta.bredde / 2; a.z = b.z = rum.meta.dybde / 2;
    for (const s of [a, b]) { s.rum = rum; rum.spillere.set(s.id, s); }
    await rum.besked(a, { t: "effekt", slags: "droner", x: a.x, y: a.y, z: a.z }, 1000);
    assert.equal(b.beskeder.length, 1); assert.equal(a.beskeder.length, 0);
    assert.equal(b.beskeder[0].fra, "a"); assert.equal(rum.revision, 0);
  }
});

// Browserens socket efterlignes, så API'et prøves gennem den rigtige serialisering og hændelse.
class TestSocket {
  constructor() { TestSocket.sidste = this; this.sendt = []; setTimeout(() => { this.readyState = 1; this.onopen(); }, 0); }
  send(data) { this.sendt.push(JSON.parse(data)); }
  close() { this.readyState = 3; this.onclose?.(); }
}

Deno.test("Effekt net: klar/version styrer deling, slags styrer brag, og indgående effekt bliver en hændelse", async () => {
  const oprindelig = globalThis.WebSocket;
  globalThis.WebSocket = TestSocket;
  let net;
  try {
    for (const version of ["0.1.0", "0.2.0"]) {
      net = await forbind("ws://127.0.0.1/ws", { version });
      const socket = TestSocket.sidste;
      socket.sendt.length = 0;
      net.effekt("droner", { x: 64, y: 20, z: 64 });
      assert.equal(socket.sendt.length, 0);
      net.klar = true;
      net.effekt("droner", { x: 64, y: 20, z: 64, t: "brag", slags: "forkert" });
      assert.equal(socket.sendt.length, version === "0.2.0" ? 1 : 0);
      if (version === "0.2.0") assert.deepEqual(socket.sendt[0], effekter[4]);
      net.brag(64, 20, 64, "atom"); net.brag(64, 20, 64);
      assert.deepEqual(socket.sendt.at(-2), { t: "brag", x: 64, y: 20, z: 64, slags: "atom" });
      assert.deepEqual(socket.sendt.at(-1), { t: "brag", x: 64, y: 20, z: 64 });
      let vist;
      net.addEventListener("effekt", e => { vist = e.detail; });
      socket.onmessage({ data: JSON.stringify({ ...effekter[4], fra: "andet-barn" }) });
      assert.deepEqual(vist, { slags: "droner", x: 64, y: 20, z: 64, fra: "andet-barn" });
      net.luk();
    }
  } finally { net?.luk(); globalThis.WebSocket = oprindelig; }
});
