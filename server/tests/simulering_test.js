import { strict as assert } from "node:assert";
import { Simulering } from "../../spil/broekraft/simulering.js";

function verden(valg = {}) {
  const data = new Uint8Array(24 * 24 * 16), tændte = [], lyde = [];
  const i = (x, y, z) => x + z * 24 + y * 576;
  const inde = (x, y, z) => x >= 0 && x < 24 && z >= 0 && z < 24 && y >= 0 && y < 16;
  const hent = (x, y, z) => inde(x, y, z) ? data[i(x, y, z)] : 26;
  const sæt = (x, y, z, id) => { data[i(x, y, z)] = id; };
  const sim = new Simulering({ hent, sæt, inde, højde: 16, tilfældig: () => 0.01, tændTNT: (...p) => tændte.push(p), lyd: (...p) => lyde.push(p), ...valg });
  for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) sæt(x, 0, z, 26);
  return { data, hent, sim, tændte, lyde, sæt(x, y, z, id) { sæt(x, y, z, id); sim.blokÆndret(x, y, z); }, kør(tid) { for (let t = 0; t < tid; t += 0.05) sim.tick(0.05); } };
}

Deno.test("Vand løber ned først og ud på gulvet", () => {
  const v = verden(); v.sæt(12, 5, 12, 43); v.kør(5);
  assert.equal(v.hent(12, 1, 12), 44);
  assert.ok(v.hent(13, 1, 12) >= 44);
  assert.equal(v.hent(13, 5, 12), 0);
});

Deno.test("Vand trækker sig tilbage, når kilden fjernes", () => {
  const v = verden(); v.sæt(12, 4, 12, 43); v.kør(5); v.sæt(12, 4, 12, 0); v.kør(15);
  assert.equal(v.data.filter(id => id >= 43 && id <= 50).length, 0);
});

Deno.test("Vand vælger nærmeste hul i underlaget", () => {
  const v = verden();
  for (let x = 2; x < 22; x++) for (let z = 2; z < 22; z++) v.sæt(x, 1, z, 3);
  v.sæt(14, 1, 12, 0); v.sæt(12, 2, 12, 43); v.kør(0.1);
  assert.equal(v.hent(13, 2, 12), 44);
  assert.equal(v.hent(11, 2, 12), 0);
});

Deno.test("Lava har kortere rækkevidde og flyder langsommere", () => {
  const v = verden({ ildBreder: false }); v.sæt(12, 1, 12, 51); v.kør(0.3);
  assert.equal(v.hent(14, 1, 12), 0); v.kør(4);
  assert.equal(v.hent(15, 1, 12), 54); assert.equal(v.hent(16, 1, 12), 0);
});

Deno.test("Lava-kilde og vand giver obsidian; flydende lava giver sten", () => {
  const v = verden(); v.sæt(10, 1, 10, 51); v.sæt(11, 1, 10, 43); v.kør(1);
  assert.equal(v.hent(10, 1, 10), 56); assert.ok(v.lyde.some(l => l[0] === "tss"));
  const f = verden(); f.sæt(10, 1, 10, 52); f.sæt(11, 1, 10, 43); f.kør(1);
  assert.equal(f.hent(10, 1, 10), 3);
  const ned = verden(); ned.sæt(10, 1, 10, 51); ned.sæt(10, 2, 10, 43); ned.kør(1);
  assert.equal(ned.hent(10, 1, 10), 3);
});

Deno.test("Ild brænder videre gennem en lille skov", () => {
  const v = verden();
  for (let x = 7; x <= 13; x += 2) {
    v.sæt(x, 1, 12, 5); v.sæt(x, 2, 12, 5);
    for (let dx = -1; dx <= 1; dx++) v.sæt(x + dx, 3, 12, 6);
  }
  v.sæt(6, 1, 12, 55); v.kør(30);
  assert.equal(v.data.filter(id => id === 5 || id === 6).length, 0);
});

Deno.test("Ild går ud uden brændstof, og vand slukker straks", () => {
  const v = verden(); v.sæt(12, 1, 12, 55); v.kør(4); assert.equal(v.hent(12, 1, 12), 0);
  v.sæt(12, 1, 12, 55); v.sæt(11, 1, 12, 5); v.sæt(13, 1, 12, 43); v.kør(0.3);
  assert.notEqual(v.hent(12, 1, 12), 55); assert.equal(v.hent(11, 1, 12), 5);
});

Deno.test("IldBreder=false stopper ny ild og skåner fjerne træer", () => {
  const v = verden({ ildBreder: false }); v.sæt(12, 1, 12, 55); v.sæt(13, 1, 12, 5); v.sæt(14, 1, 12, 5); v.kør(12);
  assert.equal(v.hent(13, 1, 12), 0); assert.equal(v.hent(14, 1, 12), 5);
  assert.equal(v.data.filter(id => id === 55).length, 0);
  v.sæt(10, 1, 10, 51); v.sæt(11, 2, 10, 5); v.kør(5);
  assert.equal(v.hent(11, 2, 10), 5); assert.equal(v.data.filter(id => id === 55).length, 0);
});

Deno.test("Lava og ild tænder TNT", () => {
  for (const id of [51, 55]) {
    const v = verden(); v.sæt(12, 1, 12, id); v.sæt(13, 1, 12, 42); v.kør(1);
    assert.ok(v.tændte.some(p => p.join() === "13,1,12"));
  }
});

Deno.test("Inaktiv verden kræver ingen blokopslag", () => {
  let opslag = 0;
  const sim = new Simulering({ hent() { opslag++; return 0; }, sæt() {}, inde: () => true, højde: 64 });
  for (let i = 0; i < 100; i++) sim.tick(0.05);
  assert.equal(opslag, 0);
});

Deno.test("Samme simulation ved 60 billeder/s og 20 server-ticks/s", () => {
  const a = verden(), b = verden();
  for (const v of [a, b]) { v.sæt(8, 4, 8, 43); v.sæt(16, 1, 16, 51); v.sæt(12, 1, 12, 55); v.sæt(13, 1, 12, 5); }
  for (let i = 0; i < 300; i++) a.sim.tick(1 / 60);
  for (let i = 0; i < 100; i++) b.sim.tick(1 / 20);
  assert.deepEqual(a.data, b.data);
});

Deno.test("Slukket ild efterlader ikke en gammel brændetid", () => {
  const v = verden({ ildBreder: false }); v.sæt(12, 1, 12, 55); v.sæt(13, 1, 12, 5); v.kør(1);
  v.sæt(12, 1, 12, 0); v.kør(5); v.sæt(12, 1, 12, 55); v.kør(1);
  assert.equal(v.hent(13, 1, 12), 5); v.kør(2); assert.equal(v.hent(13, 1, 12), 0);
});
