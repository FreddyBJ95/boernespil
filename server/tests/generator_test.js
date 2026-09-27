import { strict as assert } from "node:assert";
import { Verden } from "../../spil/broekraft/verden.js";
import { VERDENER } from "../../spil/broekraft/verdener.js";
import { BLOKKE, ID } from "../../spil/broekraft/blokke.js";
import { generer } from "../generator.js";

// SHA-256 fra de uændrede opskrifter i commit 73007dab7e26730d3b778ca8254c8a7e1f8e3d01.
const OPRINDELIGE = {
  græsø: "03ce1f8ecc11ffc7ad072f777341e8ab198da0fdeacbb91b6331eebbebd50bc3",
  zombie: "72318d222b0cdae27805d71061d6b75080dd6c1920e6b5883fd7339d8f9ced1b",
  svampe: "24ef66bb790338221f23fad995830325e05813899c44020d07c5f75e2e16d416",
  maane: "cfc70ea1f434152ac6693571b3633928f351f02bd1f2beca44c381b176a05996",
};
for (const type of VERDENER) Deno.test(`Generator: ${type.id} er byte-identisk ved frø 12345`, async () => {
  const gammel = new Verden(12345, null, null, null);
  gammel.generer(type.generer);
  const ny = generer({ type: type.id, frø: 12345, bredde: 64, højde: 32, dybde: 64 });
  assert.deepEqual(ny, gammel.data);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", ny)), n => n.toString(16).padStart(2, "0")).join("");
  assert.equal(hash, OPRINDELIGE[type.id]);
});

Deno.test("Alle fire typer og størrelser kan genereres med fremgang", () => {
  for (const type of VERDENER) for (const bredde of [128, 256, 512, 1024]) {
    const fremgang = [];
    const data = generer({ type: type.id, frø: 12345, bredde, højde: 64, dybde: bredde }, p => fremgang.push(p));
    assert.equal(data.length, bredde * bredde * 64);
    assert.equal(data[0], ID.Bundsten);
    assert.equal(fremgang.at(-1), 100);
    assert.ok(fremgang.length >= bredde / 16);
  }
});

Deno.test("Nye blokke bevarer gamle id'er og simuleringens tabel", () => {
  assert.equal(ID.TNT, 42); assert.equal(ID.Bundsten, 26);
  assert.equal(ID.Vand, 43); assert.equal(ID.Lava, 51); assert.equal(ID.Ild, 55); assert.equal(ID.Obsidian, 56);
  for (let i = 43; i <= 55; i++) assert.equal(BLOKKE[i].skjult, true);   // hældes ud med spande/tænder
  assert.ok(!BLOKKE[56].skjult);                                          // obsidian kan man bygge med
  for (const [i, navn] of [[3, "Sten"], [5, "Træstamme"], [6, "Blade"], [7, "Planker"], [22, "Kage"], [23, "Græskar"], [24, "Rød blomst"], [25, "Gul blomst"], [29, "Død stamme"], [31, "Spindelvæv"], [35, "Svampestok"], [36, "Lille svamp"]]) assert.equal(BLOKKE[i].navn, navn);
  for (let i = 10; i <= 17; i++) assert.ok(BLOKKE[i].navn.endsWith("uld"));
});
