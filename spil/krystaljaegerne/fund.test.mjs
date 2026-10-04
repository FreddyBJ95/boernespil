import test from "node:test";
import assert from "node:assert/strict";
import {
  fremskridt,
  givEliksirer,
  læsRejse,
  nyRejse,
  OPGAVER,
} from "./eventyr.js";
import { indsamlFund, medOpgavebelønning, seglFund } from "./fund.js";

const antal = (fund, type) =>
  fund.genstande.find((g) => g.type === type)?.antal ?? 0;
const kopi = (s) => JSON.parse(JSON.stringify(s));

test("Krystallen giver den eksisterende balance og beskriver lys uden en ny vedvarende taske", () => {
  const s = nyRejse(12), før = kopi(s);
  s.mana = 50;
  const fund = indsamlFund(s, { id: "ø-k-1", type: "krystal" });
  assert.equal(s.mønter - før.mønter, 3);
  assert.equal(s.mana, 66);
  assert.equal(s.xp, før.xp);
  assert.equal(s.eliksirer, før.eliksirer);
  assert.deepEqual(s.hentet, ["ø-k-1"]);
  assert.deepEqual(fund.genstande, [
    { type: "krystal", navn: "Lyskrystal", antal: 1 },
    { type: "kobber", navn: "Kobber", antal: 3 },
    { type: "energi", navn: "Energi", antal: 16 },
  ]);
  assert.deepEqual(Object.keys(s), Object.keys(før));
});

test("Energi-rækken viser kun det faktiske tilskud, også tæt på 100 og ved brøkdele", () => {
  for (const mana of [0, 84, 95.5, 100]) {
    const s = nyRejse(12);
    s.mana = mana;
    const fund = indsamlFund(s, { id: "lys", type: "krystal" });
    assert.equal(s.mana, Math.min(100, mana + 16));
    assert.equal(antal(fund, "energi"), s.mana - mana);
    assert.ok(
      fund.genstande.every((g) => Number.isFinite(g.antal) && g.antal > 0),
    );
    if (mana === 100) {
      assert.ok(!fund.genstande.some((g) => g.type === "energi"));
    }
  }
});

test("Kisten giver +18 kobber og +15 erfaring, og kun den eliksir der faktisk kan gemmes", () => {
  for (const eliksirer of [0, 98, 99]) {
    const s = nyRejse(12);
    s.eliksirer = eliksirer;
    const fund = indsamlFund(s, { id: "skat", type: "kiste" });
    assert.equal(s.mønter, 18);
    assert.equal(s.xp, 15);
    assert.equal(s.eliksirer, Math.min(99, eliksirer + 1));
    assert.equal(antal(fund, "eliksir"), s.eliksirer - eliksirer);
    assert.equal(antal(fund, "kobber"), 18);
    assert.equal(antal(fund, "erfaring"), 15);
    assert.ok(
      !fund.genstande.some((g) =>
        ["krystal", "energi", "segl"].includes(g.type)
      ),
    );
    assert.ok(fund.genstande.every((g) => g.antal > 0));
  }
});

test("Samme id kan aldrig give belønning igen, heller ikke gennem en gammel reference eller anden type", () => {
  const s = nyRejse(12), t = { id: "fund-1", type: "kiste" };
  assert.ok(indsamlFund(s, t));
  const før = kopi(s);
  assert.equal(indsamlFund(s, t), null);
  assert.equal(indsamlFund(s, { ...t, type: "krystal" }), null);
  assert.deepEqual(s, før);
  assert.deepEqual(t, { id: "fund-1", type: "kiste" });
});

test("En v1-gemning beholder indsamlede ids og afviser genåbnede krystaller og kister", () => {
  const s = nyRejse(123);
  const gammel = kopi(s);
  delete gammel.træning;
  const rejse = læsRejse(JSON.stringify(gammel));
  assert.ok(rejse);
  for (
    const t of [{ id: "ø-lys", type: "krystal" }, {
      id: "ø-skat",
      type: "kiste",
    }]
  ) {
    assert.ok(indsamlFund(rejse, t));
  }
  const genåbnet = læsRejse(JSON.stringify(rejse));
  assert.ok(genåbnet);
  const før = kopi(genåbnet);
  assert.equal(indsamlFund(genåbnet, { id: "ø-lys", type: "krystal" }), null);
  assert.equal(indsamlFund(genåbnet, { id: "ø-skat", type: "kiste" }), null);
  assert.deepEqual(genåbnet, før);
});

test("Ugyldige fund og tal afvises før nogen del af tilstanden ændres", () => {
  for (
    const t of [
      null,
      {},
      { id: "x", type: "fjende" },
      { id: 2, type: "kiste" },
      { id: "", type: "krystal" },
      { id: "  ", type: "kiste" },
      { id: "x".repeat(91), type: "kiste" },
    ]
  ) {
    const s = nyRejse(12), før = kopi(s);
    assert.equal(indsamlFund(s, t), null);
    assert.deepEqual(s, før);
  }
  assert.equal(indsamlFund(null, { id: "x", type: "kiste" }), null);
  for (
    const [type, felt, værdi] of [
      ["kiste", "xp", NaN],
      ["kiste", "eliksirer", 100],
      ["kiste", "eliksirer", 2.5],
      ["krystal", "mana", Infinity],
      ["krystal", "mana", 101],
      ["krystal", "mønter", -1],
      ["kiste", "hentet", null],
    ]
  ) {
    const s = nyRejse(12);
    s[felt] = værdi;
    const før = structuredClone(s);
    assert.equal(indsamlFund(s, { id: "x", type }), null);
    assert.deepEqual(s, før);
  }
});

test("Alle tre segl viser den allerede givne bossbelønning og faktisk plads til eliksirer", () => {
  const navne = new Set();
  for (let grotte = 0; grotte < 3; grotte++) {
    for (const eliksirer of [97, 98, 99]) {
      const s = nyRejse(12);
      s.eliksirer = eliksirer;
      const givet = givEliksirer(s, 2),
        før = kopi(s),
        fund = seglFund(grotte, givet);
      assert.deepEqual(
        s,
        før,
        "Beskrivelsen må ikke give bossbelønningen endnu en gang",
      );
      assert.equal(antal(fund, "segl"), 1);
      assert.equal(antal(fund, "kobber"), 30);
      assert.equal(antal(fund, "erfaring"), 45);
      assert.equal(antal(fund, "eliksir"), givet);
      assert.ok(fund.genstande.every((g) => g.antal > 0));
      navne.add(fund.genstande.find((g) => g.type === "segl").navn);
    }
  }
  assert.equal(navne.size, 3);
  for (const id of [-1, 3, null, "0", NaN]) assert.equal(seglFund(id, 2), null);
  for (const n of [-1, 99, NaN, Infinity, "2", 1.5]) {
    assert.equal(antal(seglFund(0, n), "eliksir"), 0);
  }
});

test("Opgavens belønning kopieres uden at ændre originalen og uden falsk nulbelønning", () => {
  const original = seglFund(0, 0), før = kopi(original);
  const uden = medOpgavebelønning(original, null);
  assert.deepEqual(uden, original);
  assert.notStrictEqual(uden, original);
  assert.notStrictEqual(uden.genstande, original.genstande);
  assert.notStrictEqual(uden.genstande[0], original.genstande[0]);
  const ugyldig = medOpgavebelønning(original, {
    navn: "Ugyldig",
    mønter: NaN,
    xp: -4,
  });
  assert.deepEqual(ugyldig, original);
  assert.deepEqual(original, før);
  assert.equal(medOpgavebelønning(null, OPGAVER[0]), null);
});

test("En kiste der fuldfører opgaven viser summen af den faktiske kiste- og opgavebelønning", () => {
  const s = nyRejse(12);
  s.opgaver.kiste = 2;
  const fund = indsamlFund(s, { id: "sidste-kiste", type: "kiste" });
  const færdig = fremskridt(s, "kiste", 1),
    vist = medOpgavebelønning(fund, færdig);
  assert.equal(antal(vist, "kobber"), s.mønter);
  assert.equal(antal(vist, "erfaring"), s.xp);
  assert.equal(antal(fund, "kobber"), 18);
  assert.equal(antal(fund, "erfaring"), 15);
  assert.equal(vist.genstande.filter((g) => g.type === "kobber").length, 1);
  assert.match(vist.note, /Opgave klaret: De glemte kort/);
  assert.match(vist.note, /liv og din energi/);
});

test("Opgaveheling beskrives som genopfyldning, mens krystallens energirække stadig viser +16", () => {
  const s = nyRejse(12);
  Object.assign(s, { mana: 30, hp: 10, opgaver: { krystal: 7 } });
  const fund = indsamlFund(s, { id: "sidste-lys", type: "krystal" });
  const færdig = fremskridt(s, "krystal", 1),
    vist = medOpgavebelønning(fund, færdig);
  assert.equal(s.mana, 100);
  assert.ok(s.hp > 10);
  assert.equal(antal(vist, "energi"), 16);
  assert.equal(antal(vist, "kobber"), s.mønter);
  assert.equal(antal(vist, "erfaring"), s.xp);
  assert.match(vist.note, /genopfyldte dit liv og din energi/);
});

test("En stenvogterboss kan vise to faktisk fuldførte opgaver uden at tabe en belønning eller note", () => {
  const s = nyRejse(12);
  s.opgaver.vogter = 3;
  const vogter = fremskridt(s, "vogter", 1), boss = fremskridt(s, "boss2", 1);
  const base = seglFund(2, 1), før = kopi(base);
  const vist = medOpgavebelønning(medOpgavebelønning(base, vogter), boss);
  assert.equal(antal(vist, "kobber"), 30 + vogter.mønter + boss.mønter);
  assert.equal(antal(vist, "erfaring"), 45 + vogter.xp + boss.xp);
  assert.equal(antal(vist, "eliksir"), 1);
  assert.equal(vist.genstande.filter((g) => g.type === "kobber").length, 1);
  assert.match(vist.note, /Ruinerne vågner/);
  assert.ok(vist.note.includes(boss.navn));
  assert.deepEqual(base, før);
});
