import test from "node:test";
import assert from "node:assert/strict";
import { VÅBEN } from "./eventyr.js";
import { angribVarighed, opdatérAngreb, startAngreb, vælgSlag } from "./kamp.js";

const snapshot = () => ({ x: 2, z: -4, dx: .6, dz: .8, skade: 31, art: "slim", udstyr: 2, niveau: 4 });
const tidspunkter = { sværd: .35, bue: .55, magi: .4 };

test("Kampforløbet bevarer alle tre eksisterende våbenpauser og startværdier", () => {
  for (const type of Object.keys(VÅBEN)) {
    const angreb = startAngreb(type, snapshot());
    assert.equal(angribVarighed(type), VÅBEN[type].pause);
    assert.equal(angreb.varighed, VÅBEN[type].pause);
    assert.equal(angreb.type, type);
    assert.equal(angreb.tid, 0);
    assert.equal(angreb.fremskridt, 0);
    assert.equal(angreb.slået, false);
  }
});

for (const [type, del] of Object.entries(tidspunkter)) {
  test(`${type}: slag eller frigivelse udløses ved ${del} af våbnets pause og kun én gang`, () => {
    const start = startAngreb(type, snapshot()), grænse = start.varighed * del;
    const før = opdatérAngreb(start, grænse - .000001);
    assert.equal(før.udløs, false);
    assert.equal(før.færdig, false);
    assert.equal(før.angreb.slået, false);
    const præcis = opdatérAngreb(start, grænse);
    assert.equal(præcis.udløs, true);
    assert.equal(præcis.angreb.fremskridt, del);
    assert.equal(præcis.færdig, false);
    const krydset = opdatérAngreb(før.angreb, .000002);
    assert.equal(krydset.udløs, true);
    assert.equal(krydset.angreb.slået, true);
    const efter = opdatérAngreb(krydset.angreb, .001);
    assert.equal(efter.udløs, false);
    const slut = opdatérAngreb(efter.angreb, start.varighed);
    assert.equal(slut.udløs, false);
    assert.equal(slut.færdig, true);
    assert.equal(slut.angreb.fremskridt, 1);
  });

  test(`${type}: et langsomt billede over både frigivelse og afslutning afleverer stadig slaget`, () => {
    const start = startAngreb(type, snapshot()), trin = opdatérAngreb(start, 20);
    assert.equal(trin.udløs, true);
    assert.equal(trin.færdig, true);
    assert.equal(trin.angreb.slået, true);
    assert.equal(trin.angreb.tid, start.varighed);
    assert.equal(trin.angreb.fremskridt, 1);
    assert.equal(trin.angreb.x, 2);
    const igen = opdatérAngreb(trin.angreb, 20);
    assert.equal(igen.udløs, false);
    assert.equal(igen.færdig, true);
    assert.strictEqual(igen.angreb, trin.angreb);
  });
}

test("Ugyldig eller ikke-positiv billedtid flytter ikke et angreb eller udløser kamp", () => {
  const angreb = startAngreb("magi", snapshot());
  for (const dt of [0, -1, NaN, Infinity, -Infinity, undefined, null, ".5"]) {
    const trin = opdatérAngreb(angreb, dt);
    assert.strictEqual(trin.angreb, angreb);
    assert.equal(trin.udløs, false);
    assert.equal(trin.færdig, false);
  }
});

test("Normal billedtid gennem hele forløbet giver ét event ved både 30 og 120 billeder/s", () => {
  for (const type of Object.keys(VÅBEN)) {
    for (const hz of [30, 120]) {
      let angreb = startAngreb(type, snapshot()), antal = 0, færdig = false;
      for (let i = 0; i < hz * 2 && !færdig; i++) {
        const trin = opdatérAngreb(angreb, 1 / hz);
        antal += Number(trin.udløs);
        færdig = trin.færdig;
        angreb = trin.angreb;
      }
      assert.equal(antal, 1, `${type}/${hz}: præcis ét slag`);
      assert.equal(færdig, true);
      assert.equal(angreb.fremskridt, 1);
    }
  }
});

test("Bevægelse og senere opgraderinger ændrer ikke angrebets oprindelige snapshots", () => {
  const data = snapshot(), før = { ...data }, start = startAngreb("bue", data);
  Object.assign(data, { x: 90, z: 10, dx: -1, dz: 0, skade: 99, art: "krystaldyr", udstyr: 3, niveau: 8 });
  const trin = opdatérAngreb(start, .5);
  for (const [navn, værdi] of Object.entries(før)) {
    assert.equal(start[navn], værdi, navn);
    assert.equal(trin.angreb[navn], værdi, navn);
  }
  assert.equal(start.tid, 0, "Opdatering må ikke ændre det forrige trin");
  assert.equal(start.slået, false);
  assert.notStrictEqual(trin.angreb, start);
  assert.throws(() => { start.x = 500; }, TypeError);
  assert.throws(() => { trin.angreb.udstyr = 3; }, TypeError);
});

test("Sværdets sammenhængende kombination skifter 1/2, mens en ny serie starter i 1", () => {
  const et = startAngreb("sværd", snapshot());
  const to = startAngreb("sværd", snapshot(), opdatérAngreb(et, et.varighed).angreb);
  const tre = startAngreb("sværd", snapshot(), to);
  assert.deepEqual([et.slag, to.slag, tre.slag], [1, 2, 1]);
  assert.equal(vælgSlag(1), 2);
  assert.equal(vælgSlag(2), 1);
  assert.equal(startAngreb("sværd", snapshot(), 1).slag, 2);
  assert.equal(startAngreb("sværd", snapshot(), startAngreb("bue", snapshot())).slag, 1);
  assert.equal(startAngreb("sværd", snapshot(), null).slag, 1);
  assert.equal(startAngreb("magi", snapshot(), et).slag, 1);
});

test("To samtidige kampforløb kan opdateres uden at dele fremgang eller frigivelse", () => {
  const a = startAngreb("sværd", snapshot()), b = startAngreb("sværd", snapshot());
  const slagA = opdatérAngreb(a, 1);
  assert.equal(slagA.udløs, true);
  assert.equal(b.tid, 0);
  assert.equal(b.slået, false);
  assert.equal(opdatérAngreb(b, .01).udløs, false);
});

test("Null og ukendte våben starter ingen kamp; ugyldige tal giver endelige sikre snapshots", () => {
  assert.equal(angribVarighed("ukendt"), 0);
  assert.equal(startAngreb("ukendt", snapshot()), null);
  assert.equal(startAngreb("constructor", snapshot()), null);
  assert.deepEqual(opdatérAngreb(null, 1), { angreb: null, udløs: false, færdig: true });
  const angreb = startAngreb("magi", { x: NaN, z: Infinity, dx: NaN, dz: Infinity, skade: NaN, udstyr: -1, niveau: 0 });
  for (const navn of ["x", "z", "dx", "dz", "skade", "udstyr", "niveau"]) assert.ok(Number.isFinite(angreb[navn]), navn);
  assert.equal(angreb.skade, VÅBEN.magi.skade);
  assert.equal(angreb.udstyr, 0);
  assert.equal(angreb.niveau, 1);
});
