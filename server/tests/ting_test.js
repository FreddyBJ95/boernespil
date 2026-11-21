import { strict as assert } from "node:assert";
import { sendTing, rensTing, sendPuf, sendAlleTing, MAKS_TING } from "../ting.js";
import { Rum } from "../rum.js";
import { UendeligtRum } from "../uendelig-rum.js";
import { metadata } from "../verdener.js";
import { forbind } from "../../spil/broekraft/net.js";

// En spiller med en falsk socket, der husker JSON-beskeder (binære klumper springes over)
function spiller(id, version = "0.2.0") {
  const beskeder = [];
  return { id, version, figur: "gris", x: 64, y: 20, z: 64, r: 1, beskeder,
    socket: { readyState: 1, bufferedAmount: 0, close() {}, send(data) { if (typeof data === "string") beskeder.push(JSON.parse(data)); } } };
}
function opsæt() {
  const rum = { meta: { bredde: 256, dybde: 256, højde: 64 }, spillere: new Map() };
  const a = spiller("a"), b = spiller("b"), gammel = spiller("gammel", "0.1.0");
  for (const s of [a, b, gammel]) { s.rum = rum; rum.spillere.set(s.id, s); }
  return { rum, a, b, gammel };
}
const zombie = { n: 1, s: "dyr", id: "zombie", x: 66.5, y: 20, z: 63.25, yaw: 1.5 };
const brandbil = { n: 2, s: "bil", id: "brandbil", x: 70, y: 20, z: 60, yaw: -3, k: "v0", lys: true };

Deno.test("Ting: listen når kun de andre nye klienter i samme rum, med serverens fra", () => {
  const { rum, a, b, gammel } = opsæt(), andet = opsæt();
  assert.equal(sendTing(rum, a, { t: "ting", fra: "falsk", liste: [zombie, brandbil] }, 1000), true);
  assert.deepEqual(b.beskeder.at(-1), { t: "ting", fra: "a", liste: [zombie, brandbil] });
  assert.equal(a.beskeder.length, 0); assert.equal(gammel.beskeder.length, 0); assert.equal(andet.b.beskeder.length, 0);
  assert.deepEqual(a.ting, [zombie, brandbil]);                       // huskes til nye spillere
  assert.equal(sendTing(rum, gammel, { t: "ting", liste: [zombie] }, 1000), false);
  assert.equal(sendTing(rum, { ...a }, { t: "ting", liste: [zombie] }, 1000), false);   // ikke den rigtige spiller i rummet
  assert.equal(sendTing(rum, a, { t: "ting", liste: [] }, 1100), true);                 // en tom liste rydder
  assert.deepEqual(b.beskeder.at(-1).liste, []);
});

Deno.test("Ting: ugyldige ting springes over, ekstra felter fjernes, og listen har et loft", () => {
  const { rum, a } = opsæt();
  const ugyldige = [
    null, 7, { ...zombie, n: -1 }, { ...zombie, n: 1.5 }, { ...zombie, n: 70000 }, { ...zombie, s: "kampvogn" }, { ...zombie, id: "Zombie" },
    { ...zombie, id: "z" }, { ...zombie, id: 3 }, { ...zombie, x: NaN }, { ...zombie, y: Infinity }, { ...zombie, x: -1 }, { ...zombie, z: 256 },
    { ...zombie, y: 200 }, { ...zombie, yaw: "1" }, { ...zombie, yaw: 2e6 }, { ...zombie, x: 64 + 300 }, { ...zombie, k: "v1" },
    { ...brandbil, k: "V1" }, { ...brandbil, k: "x".repeat(65) }, { ...brandbil, k: 3 }, { ...brandbil, lys: "ja" },
  ];
  for (const t of ugyldige) assert.deepEqual(rensTing(rum, a, { t: "ting", liste: [t] }), [], JSON.stringify(t));
  assert.deepEqual(rensTing(rum, a, { t: "ting", liste: [{ ...zombie, farve: "rød", fra: "b", k: undefined }] }), [zombie]);
  const { lys: _, ...slukket } = brandbil;
  assert.deepEqual(rensTing(rum, a, { t: "ting", liste: [{ ...brandbil, lys: false }] }), [slukket]);   // slukket sirene sendes ikke
  assert.deepEqual(rensTing(rum, a, { t: "ting", liste: [zombie, { ...zombie, x: 70 }] }), [zombie]);   // samme nummer to gange
  assert.equal(rensTing(rum, a, { t: "ting", liste: Array.from({ length: MAKS_TING + 1 }, (_, n) => ({ ...zombie, n })) }), null);
  for (const b of [null, {}, { t: "effekt", liste: [] }, { t: "ting" }, { t: "ting", liste: "x" }]) assert.equal(rensTing(rum, a, b), null);
});

Deno.test("Ting: højst seks lister i et rullende sekund pr. spiller", () => {
  const { rum, a, b } = opsæt();
  for (let i = 0; i < 6; i++) assert.equal(sendTing(rum, a, { t: "ting", liste: [zombie] }, 1000 + i), true);
  assert.equal(sendTing(rum, a, { t: "ting", liste: [zombie] }, 1500), false);
  assert.equal(sendTing(rum, a, { t: "ting", liste: [zombie] }, 2001), true);
  assert.equal(b.beskeder.length, 7);
});

Deno.test("Ting: en ny spiller i et rigtigt rum får de andres ting lige efter velkommen", async () => {
  const rum = new Rum(metadata({ navn: "Ting", type: "brandby", bredde: 128 }), new Uint8Array(128 * 128 * 64));
  const a = spiller("a"), b = spiller("b"), gammel = spiller("gammel", "0.1.0");
  assert.equal(await rum.ind(a, () => true), true);
  a.x = 64; a.z = 64;
  rum.besked(a, { t: "ting", liste: [zombie, brandbil] }, 1000);
  assert.equal(await rum.ind(b, () => true), true);
  const i = b.beskeder.findIndex(m => m.t === "velkommen");
  assert.ok(i >= 0);
  assert.deepEqual(b.beskeder.slice(i + 1).find(m => m.t === "ting"), { t: "ting", fra: "a", liste: [zombie, brandbil] });
  await rum.ind(gammel, () => true);
  assert.equal(gammel.beskeder.some(m => m.t === "ting"), false);
  rum.ud(a);                                                          // de andre får "ud" og fjerner hans ting
  assert.deepEqual(b.beskeder.at(-1), { t: "ud", id: "a" });
  assert.equal(await rum.ind(a, () => true), true);                   // ny tilslutning: listen starter forfra
  assert.deepEqual(a.ting, []);
});

Deno.test("Ting: det uendelige rum sender listen videre uden at hente land", async () => {
  const meta = metadata({ navn: "Ting uden kanter", type: "uendelig", frø: 123 });
  const rum = new UendeligtRum(meta, { length: 0, hentSøjle() { throw new Error("Ting må ikke hente blokke"); } });
  const a = spiller("a"), b = spiller("b");
  a.x = b.x = rum.meta.bredde / 2; a.z = b.z = rum.meta.dybde / 2;
  for (const s of [a, b]) { s.rum = rum; rum.spillere.set(s.id, s); }
  const t = { ...zombie, x: a.x + 2, z: a.z };
  await rum.besked(a, { t: "ting", liste: [t] }, 1000);
  assert.deepEqual(b.beskeder, [{ t: "ting", fra: "a", liste: [t] }]);
});

Deno.test("Puf: tryk på en andens dyr når kun ejeren, og kun hvis han har dyret", () => {
  const { rum, a, b, gammel } = opsæt();
  sendTing(rum, a, { t: "ting", liste: [zombie, brandbil] }, 1000);
  b.beskeder.length = 0;
  assert.equal(sendPuf(rum, b, { t: "puf", til: "a", n: 1 }, 1000), true);
  assert.deepEqual(a.beskeder.at(-1), { t: "puf", fra: "b", n: 1 });
  assert.equal(sendPuf(rum, b, { t: "puf", til: "a", n: 2 }, 1000), false);        // en bil kan ikke pufes
  assert.equal(sendPuf(rum, b, { t: "puf", til: "a", n: 9 }, 1000), false);        // ukendt dyr
  assert.equal(sendPuf(rum, a, { t: "puf", til: "a", n: 1 }, 1000), false);        // ikke sig selv
  assert.equal(sendPuf(rum, gammel, { t: "puf", til: "a", n: 1 }, 1000), false);
  assert.equal(sendPuf(rum, b, { t: "puf", til: "ukendt", n: 1 }, 1000), false);
  for (const ugyldig of [null, {}, { til: "a", n: "1" }, { til: 3, n: 1 }]) assert.equal(sendPuf(rum, b, ugyldig, 1000), false);
  for (let i = 0; i < 3; i++) sendPuf(rum, b, { t: "puf", til: "a", n: 1 }, 1001 + i);
  assert.equal(sendPuf(rum, b, { t: "puf", til: "a", n: 1 }, 1100), false);        // højst fire pr. sekund
  assert.equal(b.beskeder.length, 0);
});

Deno.test("Ting: sendAlleTing springer spillere uden ting og 0.1.0-klienter over", () => {
  const { rum, a, b, gammel } = opsæt();
  a.ting = [zombie]; b.ting = [];
  sendAlleTing(rum, gammel); sendAlleTing(rum, b);
  assert.equal(gammel.beskeder.length, 0);
  assert.deepEqual(b.beskeder, [{ t: "ting", fra: "a", liste: [zombie] }]);
});

// Browserens socket efterlignes, så API'et prøves gennem den rigtige serialisering og hændelse.
class TestSocket {
  constructor() { TestSocket.sidste = this; this.sendt = []; setTimeout(() => { this.readyState = 1; this.onopen(); }, 0); }
  send(data) { this.sendt.push(JSON.parse(data)); }
  close() { this.readyState = 3; this.onclose?.(); }
}

Deno.test("Ting net: klar/version styrer afsendelse, og indgående ting og puf bliver hændelser", async () => {
  const oprindelig = globalThis.WebSocket;
  globalThis.WebSocket = TestSocket;
  let net;
  try {
    for (const version of ["0.1.0", "0.2.0"]) {
      net = await forbind("ws://127.0.0.1/ws", { version });
      const socket = TestSocket.sidste;
      socket.sendt.length = 0;
      net.ting([zombie]); net.puf("a", 1);
      assert.equal(socket.sendt.length, 0);
      net.klar = true;
      net.ting([zombie]); net.puf("a", 1);
      assert.deepEqual(socket.sendt, version === "0.2.0" ? [{ t: "ting", liste: [zombie] }, { t: "puf", til: "a", n: 1 }] : []);
      let ting, puf;
      net.addEventListener("ting", e => { ting = e.detail; });
      net.addEventListener("puf", e => { puf = e.detail; });
      socket.onmessage({ data: JSON.stringify({ t: "ting", fra: "b", liste: [brandbil] }) });
      socket.onmessage({ data: JSON.stringify({ t: "puf", fra: "b", n: 1 }) });
      assert.deepEqual(ting, { fra: "b", liste: [brandbil] });
      assert.deepEqual(puf, { fra: "b", n: 1 });
      net.luk();
    }
  } finally { net?.luk(); globalThis.WebSocket = oprindelig; }
});
