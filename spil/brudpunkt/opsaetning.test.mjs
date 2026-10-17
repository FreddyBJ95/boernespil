import test from "node:test";
import assert from "node:assert/strict";
import { GRAENSER, normaliserObjekt, pakOpstilling, læsOpstilling, validerOpstilling } from "./opsaetning.js";

test("opstillinger gemmer kun de tilladte felter og læses igen", () => {
  const data = [{ id: "min-bil", type: "bil", x: 2, z: -3, nogetHemmeligt: "gemmes ikke" },
    { id: "energi", type: "celle", x: 4, y: 2, z: 1, styrke: 5, forsinkelse: 1.5, vinkel: Math.PI / 4 }];
  const pakket = pakOpstilling(data);
  assert.ok(!pakket.includes("nogetHemmeligt"));
  assert.deepEqual(læsOpstilling(pakket), data.map(normaliserObjekt));
});

test("ugyldige tal, typer og navne kommer ikke ind i fysikken", () => {
  const spec = { id: "test", type: "hus", x: 0, z: 0 };
  for (const forkert of [null, [], { ...spec, type: "prototype" }, { ...spec, id: "../hemmelig" },
    { ...spec, id: "" }, { ...spec, x: NaN }, { ...spec, x: Infinity }, { ...spec, y: -1 },
    { ...spec, x: 100 }, { ...spec, styrke: "3" }, { ...spec, styrke: 0 }, { ...spec, styrke: 6 },
    { ...spec, forsinkelse: -1 }, { ...spec, vinkel: 10000 }]) {
    assert.throws(() => normaliserObjekt(forkert));
  }
});

test("duplikerede navne, for mange objekter og for mange energiceller afvises", () => {
  assert.throws(() => validerOpstilling([{ id: "a", type: "bil" }, { id: "a", type: "hus" }]), /samme navn/);
  assert.throws(() => validerOpstilling(Array.from({ length: GRAENSER.objekter + 1 }, (_, i) => ({ id: `o${i}`, type: "bil" }))), /plads/);
  assert.throws(() => validerOpstilling(Array.from({ length: GRAENSER.celler + 1 }, (_, i) => ({ id: `o${i}`, type: "celle" }))), /energiceller/);
});

test("en defekt gemt fil erstatter ikke en opstilling med tilfældige standarder", () => {
  for (const tekst of ["", "{", "null", "[]", '{"version":2,"objekter":[]}', '{"version":1,"objekter":{}}', "x".repeat(20001)]) {
    assert.throws(() => læsOpstilling(tekst));
  }
  assert.deepEqual(læsOpstilling('{"version":1,"objekter":[]}'), []);
});
