import { strict as assert } from "node:assert";
import { pakKlump, læsBesked } from "../protokol.js";
import { udpakKlump } from "../../spil/broekraft/net.js";
import { Rum } from "../rum.js";
import { metadata } from "../verdener.js";

export function testRum(maks = 2) {
  const meta = metadata({ navn: "Test", type: "græsø", bredde: 128, maksSpillere: maks });
  const data = new Uint8Array(128 * 128 * 64); data.fill(26, 0, 128 * 128);
  return new Rum(meta, data);
}
export function spiller(id) {
  const beskeder = [];
  return { id, figur: "gris", beskeder, socket: { readyState: 1, bufferedAmount: 0, send(b) { beskeder.push(typeof b === "string" ? JSON.parse(b) : b); }, close() {} } };
}

Deno.test("RLE: rundtur, 255-grænse og ødelagte pakker", () => {
  const data = new Uint8Array(256 * 64); data.fill(3, 260, 1000); data[1000] = 56;
  const pakket = pakKlump(data, 2, 3, 64), klump = udpakKlump(pakket.buffer);
  assert.deepEqual(klump.data, data); assert.equal(klump.cx, 2); assert.equal(klump.cz, 3);
  assert.throws(() => udpakKlump(pakket.slice(0, -1).buffer));
  const fejl = pakket.slice(); fejl[11] = 0; assert.throws(() => udpakKlump(fejl.buffer));
  assert.throws(() => læsBesked(JSON.stringify({ t: "hej", a: "ø".repeat(3000) })));
  assert.throws(() => læsBesked(new Uint8Array(8)));
});

Deno.test("To spillere deler blokke; nummer maks+1 får fuld", () => {
  const r = testRum(), a = spiller("a"), b = spiller("b"), c = spiller("c");
  assert.equal(r.ind(a), true); assert.equal(r.ind(b), true); assert.equal(r.ind(c), false);
  assert.equal(c.beskeder.at(-1).t, "fuld");
  r.besked(a, { t: "sæt", x: 66, y: 10, z: 64, id: 7 });
  assert.equal(r.hent(66, 10, 64), 7);
  assert.ok(b.beskeder.some(b => b.t === "blok" && b.id === 7));
  r.besked(a, { t: "pos", x: 70, y: 20, z: 65, yaw: 1, pitch: 0 }, 1000); r.tick(0.1);
  assert.ok(b.beskeder.some(b => b.t === "pos" && b.liste.some(p => p.id === "a" && p.x === 70)));
});

Deno.test("Koordinater, Bundsten, overlap, id og hastighed kontrolleres", () => {
  const r = testRum(), a = spiller("a"); r.ind(a);
  for (const b of [{ x: -1, y: 4, z: 4, id: 7 }, { x: 4.5, y: 4, z: 4, id: 7 }, { x: 4, y: 0, z: 4, id: 0 }, { x: 4, y: 4, z: 4, id: 26 }, { x: 4, y: 4, z: 4, id: 200 }, { x: 64, y: 1, z: 64, id: 7 }]) r.besked(a, { t: "sæt", ...b }, 0);
  assert.equal(r.revision, 0);
  for (let i = 0; i < 25; i++) r.besked(a, { t: "sæt", x: i, y: 10, z: 4, id: 7 }, 2000);
  assert.equal(r.revision, 20);
  r.besked(a, { t: "pos", x: NaN, y: 2, z: 2, yaw: 0, pitch: 0 }, 1000); assert.equal(a.x, 64.5);
  r.besked(a, { t: "emoji", e: "vilkårlig tekst" }, 1000); assert.ok(!a.beskeder.some(b => b.t === "emoji"));
});

Deno.test("Klumpfiltrering, glem og radius højst otte", () => {
  const r = testRum(), a = spiller("a"); r.ind(a);
  a.beskeder.length = 0; r.sæt(0, 10, 0, 7); assert.ok(!a.beskeder.some(b => b.t === "blok"));
  r.besked(a, { t: "udsyn", r: 100 }); assert.equal(a.r, 8);
  r.besked(a, { t: "udsyn", r: 1 }); r.besked(a, { t: "pos", x: 1, y: 2, z: 1, yaw: 0, pitch: 0 }); r.strøm(a);
  assert.ok(a.beskeder.some(b => b.t === "glem"));
  assert.ok(a.klumper.has("0,0"));
});

Deno.test("TNT-lunte, kædereaktion og Bundsten", () => {
  const r = testRum(), a = spiller("a"); r.ind(a);
  r.sæt(65, 1, 64, 42); r.sæt(66, 1, 64, 42); r.sæt(65, 2, 64, 7);
  r.tænd(65, 1, 64); assert.equal(r.lunter.length, 1);
  for (let i = 0; i < 40; i++) r.tick(0.05);
  assert.ok(!a.beskeder.some(b => b.t === "bum"));
  for (let i = 0; i < 30; i++) r.tick(0.05);
  assert.equal(a.beskeder.filter(b => b.t === "bum").length, 2);
  assert.equal(r.hent(65, 2, 64), 0); assert.equal(r.hent(65, 0, 64), 26);
});

Deno.test("Serverens simulering sender flydende vand som blokændringer", () => {
  const r = testRum(), a = spiller("a"), b = spiller("b"); r.ind(a); r.ind(b);
  r.besked(a, { t: "sæt", x: 66, y: 10, z: 64, id: 43 });
  for (let i = 0; i < 10; i++) r.tick(0.05);
  assert.ok(b.beskeder.some(b => b.t === "blok" && b.x === 66 && b.y === 9 && b.id === 44));
});
