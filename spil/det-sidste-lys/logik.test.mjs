import assert from "node:assert/strict";
import { aktivOpgave, fuldfør, gem, læsGemning, nyTilstand, OPGAVER, rigtigtSvar, samlRav, validerGemning, findStednote, gemGåde, nyeIndstillinger, nytEventyr, validerIndstillinger, sikkerGemmetilstand } from "./logik.js";

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

// Alle gemninger fra den første udgivelse kan fortsætte med sikre komfortstandarder.
const gammel = { ...t };
for (const felt of ["indstillinger", "gåder", "vink", "vejledning", "fund"]) delete gammel[felt];
const opdateret = validerGemning(gammel);
assert.deepEqual(opdateret.færdige, t.færdige);
assert.deepEqual(opdateret.indstillinger, nyeIndstillinger());
assert.deepEqual(opdateret.gåder, {});
assert.deepEqual(validerIndstillinger({ følsomhed: Infinity, tekst: 500, kvalitet: "ultra", styring: "ukendt", rolig: "ja" }), nyeIndstillinger());
const komfort = { følsomhed: .6, tekst: 1.4, kvalitet: "let", styring: "pile", rolig: true };
assert.deepEqual(validerIndstillinger(komfort), komfort);
let gemtGåde = gemGåde({ ...t, indstillinger: komfort, lyd: false }, "tide", ["Faldende", "II", "Vest"]);
assert.equal(gemGåde(gemtGåde, "tide", ["hack", "II", "Vest"]), gemtGåde);
const læstGåde = validerGemning(gemtGåde);
assert.deepEqual(læstGåde.gåder.tide, ["Faldende", "II", "Vest"]);
læstGåde.gåder.tide[0] = "Stigende";
assert.equal(gemtGåde.gåder.tide[0], "Faldende", "Et genoptaget gådehjul deler ikke arrays med save");
assert.deepEqual(validerGemning({ ...t, gåder: { spejle: [Infinity, 0, 0] } }).gåder, {});
gemtGåde = findStednote(gemtGåde, "have");
assert.equal(findStednote(gemtGåde, "have"), gemtGåde, "En stednote kan ikke dobbelttælles");
assert.equal(findStednote(gemtGåde, "ukendt"), gemtGåde);
assert.deepEqual(gemtGåde.færdige, t.færdige, "Valgfrie fund påvirker ikke de otte kapitler");
const nyRejse = nytEventyr(gemtGåde);
assert.deepEqual(nyRejse.færdige, []);
assert.deepEqual(nyRejse.fund, []);
assert.deepEqual(nyRejse.indstillinger, komfort, "Genstart bevarer de valgte adgangsindstillinger");
assert.equal(nyRejse.lyd, false);
console.log("Gamle gemninger, komfortvalg, gemte gåder og valgfrie stednoter består.");

// Pagehide på et fyrgalleri kan efterfølges af pageshow fra samme levende bfcache-side.
const påGalleri = { ...nyTilstand(), position: Object.freeze({ x: 38, z: -39.8 }) };
const originalPosition = påGalleri.position;
assert.ok(gem(sikkerGemmetilstand(påGalleri, true), lager));
assert.deepEqual(læsGemning(lager).position, { x: 32, z: -35 }, "Fortsæt fra en ny indlæsning lander ved foden");
assert.equal(påGalleri.position, originalPosition, "Pagehide erstatter ikke bfcache-spillerens levende position");
assert.ok(Math.hypot(påGalleri.position.x-38, påGalleri.position.z+44) > 3.5);
assert.ok(Math.hypot(påGalleri.position.x-38, påGalleri.position.z+44) < 4.7);
assert.equal(sikkerGemmetilstand(påGalleri, false), påGalleri, "Almindelig save bevarer terrænpositionen");
console.log("Galleri-save er sikkert ved genindlæsning og bevarer gangrummet ved browsertilbage.");
