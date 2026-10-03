import assert from "node:assert/strict";
import { aktivOpgave, fuldfør, gem, læsGemning, nyTilstand, OPGAVER, rigtigtSvar, samlRav, validerGemning } from "./logik.js";

// Spillets fulde forløb kontrolleres sammen med de vigtige nat- og genstandsregler.
let t = nyTilstand();
assert.equal(aktivOpgave(t).id, "brev");
assert.equal(fuldfør(t, "lys"), t, "Slutningen kan ikke springes til");
t = fuldfør(t, "brev");
t = fuldfør(t, "nøgle");
assert.equal(samlRav(t, -1), t);
t = samlRav(t, 0);
assert.equal(samlRav(t, 0), t, "Samme rav må kun samles én gang");
t = samlRav(t, 1);
assert.equal(fuldfør(t, "harpiks"), t, "Alle tre træer er nødvendige");
t = samlRav(t, 2);
assert.equal(aktivOpgave(t).id, "linse");
t = fuldfør(t, "linse");
t = fuldfør(t, "strøm");
assert.equal(fuldfør(t, "spor"), t, "Skjulte spor kræver nat");
t = { ...t, nat: true, retning: 1 };
assert.equal(fuldfør(t, "spor"), t, "Fyret skal pege mod ruinen i vest");
t = { ...t, retning: 3 };
t = fuldfør(t, "spor");
assert.equal(fuldfør({ ...t, nat: false }, "prisme").færdige.length, 6);
t = fuldfør(t, "prisme");
t = fuldfør(t, "lys");
assert.equal(aktivOpgave(t), null);
assert.deepEqual(t.færdige, OPGAVER.map((opgave) => opgave.id));
assert.equal(rigtigtSvar("tide", ["Faldende", "III", "Vest"]), true);
assert.equal(rigtigtSvar("tide", ["Stigende", "III", "Vest"]), false);
assert.equal(rigtigtSvar("spejle", [1, 3, 2]), true);
assert.equal(rigtigtSvar("spejle", [1, 3]), false);

// En ægte pause/fortsæt-gemning bevarer fremgangen uden at dele arrays.
const lager = {
  indhold: "",
  setItem(_, tekst) {
    this.indhold = tekst;
  },
  getItem() {
    return this.indhold;
  },
};
assert.equal(gem(t, lager), true);
const kopi = læsGemning(lager);
assert.deepEqual(kopi.færdige, t.færdige);
kopi.færdige.pop();
assert.equal(t.færdige.length, 8);
assert.equal(validerGemning({ ...t, færdige: ["lys"] }), null);
assert.equal(validerGemning({ ...t, rav: [0, 0, 2] }), null);
assert.equal(validerGemning({ ...t, rav: [0] }), null);
assert.equal(validerGemning({ ...t, version: 400 }), null);
assert.deepEqual(validerGemning({ ...t, position: { x: Infinity, z: 4 } }).position, nyTilstand().position);
assert.equal(
  læsGemning({
    getItem() {
      return "{ødelagt";
    },
  }),
  null,
);
assert.equal(
  gem(t, {
    setItem() {
      throw new Error("Privat Safari");
    },
  }),
  false,
);
console.log("Det Sidste Lys: fuldt forløb, gåder, natregler og gemningsvalidering bestået.");
