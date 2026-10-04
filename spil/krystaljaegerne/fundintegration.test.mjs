import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  fremskridt,
  givEliksirer,
  GROTTENAVNE,
  læsRejse,
  maxLiv,
  niveau,
  nyRejse,
  OPGAVER,
} from "./eventyr.js";
import { indsamlFund, medOpgavebelønning, seglFund } from "./fund.js";

// Læs kun de faktiske funktioner. Ingen browser, voksenlås eller eksisterende gemninger indlæses.
const kilde = readFileSync(new URL("./spil.js", import.meta.url), "utf8");
const navne = [
  "brug",
  "opgave",
  "ramFjende",
  "visFund",
  "roligeFund",
  "skiftVerden",
  "forladGrotte",
  "ramHelt",
  "start",
  "bekræftNy",
  "dialog",
  "lukDialog",
  "opdatér",
  "loop",
];
const funktioner = navne.map((navn) => {
  const match = kilde.match(
    new RegExp(
      `^function ${navn}\\([\\s\\S]*?\\)\\s*\\{[\\s\\S]*?^\\}\\r?$`,
      "m",
    ),
  );
  assert.ok(match, `Den rigtige spilfunktion ${navn} skal findes`);
  return match[0];
}).join("\n");

function punkt(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
    set(x, y, z) {
      Object.assign(this, { x, y, z });
      return this;
    },
    lerp(p, del) {
      this.x += (p.x - this.x) * del;
      this.y += (p.y - this.y) * del;
      this.z += (p.z - this.z) * del;
    },
  };
}

function model() {
  return {
    position: punkt(),
    rotation: punkt(),
    material: { opacity: 1 },
    scale: { set() {}, setScalar() {} },
    add() {},
  };
}

function prøve() {
  const visninger = [],
    fjernet = [],
    gemninger = [],
    data = { ting: [] },
    felter = new Map();
  let c;
  function felt() {
    const klasser = new Set(["skjult"]);
    const f = {
      style: {},
      children: [],
      isConnected: true,
      scrollTop: 0,
      classList: {
        add: (n) => klasser.add(n),
        remove: (n) => klasser.delete(n),
        contains: (n) => klasser.has(n),
      },
      replaceChildren() {
        this.children = [];
      },
      append(b) {
        this.children.push(b);
      },
      querySelector() {
        return this;
      },
      focus() {
        c.document.activeElement = this;
      },
    };
    return f;
  }
  const $ = (id) => {
    if (!felter.has(id)) felter.set(id, felt());
    return felter.get(id);
  };
  const nyVerden = () => ({
    rod: model(),
    ting: data.ting,
    fjender: [],
    steder: [],
  });
  const fundfigur = {
    vist: null,
    tid: 0,
    ryddet: 0,
    vis(fund, valg) {
      this.vist = { fund, valg };
      visninger.push(this.vist);
    },
    opdatér(dt, valg) {
      this.tid += dt;
      this.valg = valg;
    },
    ryd() {
      this.vist = null;
      this.ryddet++;
    },
  };
  const fundkort = {
    vist: null,
    tid: 0,
    skjult: 0,
    vis(fund, valg) {
      this.vist = { fund, valg };
    },
    opdatér(dt, valg) {
      this.tid += dt;
      this.valg = valg;
    },
    skjul() {
      this.vist = null;
      this.skjult++;
    },
  };
  c = {
    s: nyRejse(123),
    $,
    fundfigur,
    fundkort,
    mindreBevægelse: { matches: false },
    fremskridt,
    givEliksirer,
    GROTTENAVNE,
    maxLiv,
    niveau,
    nyRejse,
    indsamlFund,
    medOpgavebelønning,
    seglFund,
    kører: true,
    paused: false,
    nær: null,
    guideStart: null,
    fokusTilbage: null,
    tid: 0,
    sidst: 0,
    sidsteTegning: 0,
    hudtid: 0,
    gemtid: 0,
    beskedtid: 0,
    angreb: null,
    angrebspause: 0,
    angrebHold: null,
    dragId: null,
    joystickId: null,
    venpause: 100,
    helbredstid: 0,
    yaw: 0,
    egetSpor: null,
    ruteNøgle: "",
    målFjende: null,
    taster: new Set(),
    joystick: { x: 0, y: 0 },
    retning: {
      x: 0,
      y: -1,
      set() {
        return this;
      },
      normalize() {},
    },
    helt: model(),
    ven: model(),
    glød: model(),
    sporring: model(),
    kamMål: punkt(),
    verden: nyVerden(),
    mira: null,
    modeller: {},
    scene: {
      add() {},
      background: { set() {} },
      fog: { color: { copy() {} } },
    },
    fjender: [],
    ting: [],
    skud: [],
    effekter: [],
    flyvetekster: [],
    øveskiver: [],
    skilte: [],
    STEDER: [{ x: 0, z: 0 }, { x: -25, z: 19 }, { x: 30, z: -23 }, {
      x: -24,
      z: -30,
    }],
    document: { activeElement: null, hidden: false, createElement: felt },
    requestAnimationFrame() {},
    renderer: { render() {} },
    kamera: {},
    kameraTrin() {},
    THREE: { Vector3: punkt },
    frit: () => true,
    nærFjende: () => null,
    bygØ: nyVerden,
    bygGrotte: nyVerden,
    danGrotte() {},
    bygØveplads() {},
    nyFjende() {},
    kopi: () => model(),
    label: () => model(),
    afbrydAngreb() {
      c.angreb = null;
    },
    skiftVåben() {},
    kampTrin() {},
    angrib() {},
    sendSkud() {},
    opdatérFjender() {},
    opdatérSkud() {},
    hud() {},
    blink() {},
    tone() {},
    besked() {},
    flyvetekst() {},
    gem() {
      gemninger.push(JSON.parse(JSON.stringify(c.s)));
    },
    fjern(obj) {
      fjernet.push(obj);
    },
  };
  vm.createContext(c);
  new vm.Script(funktioner, { filename: "spil.js — isolerede fundfunktioner" })
    .runInContext(c);
  return { c, visninger, fjernet, gemninger, data };
}

const genstandAntal = (fund, type) =>
  fund.genstande.find((g) => g.type === type)?.antal ?? 0;
const nytFund = (type, id = "skat-1") => ({
  id,
  type,
  x: 1,
  z: 5,
  obj: model(),
});

for (const type of ["krystal", "kiste"]) {
  test(`${type}: faktisk Brug gemmer fundet én gang, afleverer samme belønning til kort/model og rydder nær`, () => {
    const { c, visninger, fjernet, gemninger } = prøve();
    const t = nytFund(type), anden = nytFund("kiste", "anden");
    c.ting.push(t, anden);
    c.nær = t;
    c.s.mana = 80;
    c.brug();
    assert.deepEqual(c.s.hentet, [t.id]);
    assert.equal(c.s.opgaver[type], 1);
    assert.equal(c.nær, null);
    assert.equal(c.ting.length, 1);
    assert.strictEqual(c.ting[0], anden);
    assert.equal(visninger.length, 1);
    assert.strictEqual(c.fundfigur.vist.fund, c.fundkort.vist.fund);
    assert.strictEqual(
      c.fundfigur.vist.valg.kiste,
      type === "kiste" ? t.obj : null,
    );
    assert.equal(fjernet.includes(t.obj), type === "krystal");
    assert.equal(c.paused, false, "Fundet standser ikke spilleren");
    assert.ok(gemninger.some((s) => s.hentet.includes(t.id)));
    assert.ok(læsRejse(gemninger.at(-1)));
    const før = JSON.stringify(c.s);
    c.nær = t;
    c.brug();
    assert.equal(JSON.stringify(c.s), før);
    assert.equal(visninger.length, 1);
    assert.equal(
      c.ting.length,
      1,
      "En gammel nær-reference må ikke splice(-1) og fjerne næste skat",
    );
    assert.strictEqual(c.ting[0], anden);
  });
}

for (const type of ["krystal", "kiste"]) {
  test(`${type}: faktisk opgavefuldførelse vises med hele kobber-/erfaringsgevinsten`, () => {
    const { c } = prøve();
    const t = nytFund(type), opgave = OPGAVER.find((o) => o.id === type);
    c.s.opgaver[type] = opgave.mål - 1;
    c.s.hp = 10;
    c.s.mana = 30;
    c.ting.push(t);
    c.nær = t;
    c.brug();
    const fund = c.fundkort.vist.fund;
    assert.equal(genstandAntal(fund, "kobber"), c.s.mønter);
    assert.equal(genstandAntal(fund, "erfaring"), c.s.xp);
    assert.equal(c.s.opgaver[type], opgave.mål);
    assert.ok(fund.note.includes(opgave.navn));
    assert.equal(c.s.mana, 100);
    if (type === "krystal") assert.equal(genstandAntal(fund, "energi"), 16);
  });
}

test("En faktisk åbnet kiste ved 99 eliksirer viser hverken en falsk eliksir eller krystal", () => {
  const { c } = prøve();
  c.s.eliksirer = 99;
  const t = nytFund("kiste");
  c.ting.push(t);
  c.nær = t;
  c.brug();
  const fund = c.fundkort.vist.fund;
  assert.equal(c.s.eliksirer, 99);
  assert.ok(
    !fund.genstande.some((g) => ["eliksir", "krystal"].includes(g.type)),
  );
  assert.equal(c.s.mønter, 18);
  assert.equal(c.s.xp, 15);
});

test("Faktisk bossejr giver seglet og begge samtidige opgavebelønninger én gang", () => {
  const { c, visninger, gemninger } = prøve();
  c.s.opgaver.vogter = 3;
  c.s.eliksirer = 98;
  const f = {
    id: "boss-2",
    hp: 1,
    boss: true,
    grotte: 2,
    art: "stenvogter",
    obj: model(),
  };
  f.obj.position.set(8, 0, 12);
  c.fjender.push(f);
  c.ramFjende(f, 10);
  const fund = c.fundkort.vist.fund;
  assert.equal(c.s.opgaver.vogter, 4);
  assert.equal(c.s.opgaver.boss2, 1);
  assert.deepEqual(c.s.beroliget, [f.id]);
  assert.equal(genstandAntal(fund, "kobber"), c.s.mønter);
  assert.equal(genstandAntal(fund, "erfaring"), c.s.xp);
  assert.equal(genstandAntal(fund, "eliksir"), 1);
  assert.equal(genstandAntal(fund, "segl"), 1);
  assert.equal(c.s.eliksirer, 99);
  assert.ok(fund.note.includes(OPGAVER.find((o) => o.id === "vogter").navn));
  assert.ok(fund.note.includes(OPGAVER.find((o) => o.id === "boss2").navn));
  assert.ok(c.verden.steder.some((t) => t.id === "bossudgang"));
  assert.ok(læsRejse(gemninger.at(-1)));
  const før = JSON.stringify(c.s);
  c.ramFjende(f, 10);
  assert.equal(JSON.stringify(c.s), før);
  assert.equal(visninger.length, 1);
});

test("Rolig indstilling eller systemets reducerede bevægelse sendes ens til begge fundvisninger", () => {
  const { c } = prøve();
  for (
    const [indstilling, system] of [[false, false], [true, false], [
      false,
      true,
    ]]
  ) {
    c.s.valg.roligeEffekter = indstilling;
    c.mindreBevægelse.matches = system;
    c.visFund(seglFund(0, 0), { x: 1, z: 2 });
    assert.equal(c.fundfigur.vist.valg.rolig, indstilling || system);
    assert.equal(c.fundkort.vist.valg.rolig, indstilling || system);
  }
});

test("Pause fryser begge fundforløb, rydder holdt input og genoptager dem fra samme tid", () => {
  const { c } = prøve();
  c.visFund(seglFund(0, 0), { x: 1, z: 2 });
  c.loop(20);
  const kortTid = c.fundkort.tid, modelTid = c.fundfigur.tid;
  c.taster.add("w");
  c.angrebHold = 4;
  c.joystick.x = 1;
  c.dialog("Pause", "", [["Tilbage", c.lukDialog]]);
  assert.equal(c.paused, true);
  assert.equal(c.taster.size, 0);
  assert.equal(c.angrebHold, null);
  assert.equal(c.joystick.x, 0);
  assert.ok(c.$("fundkort").classList.contains("fund-pause"));
  for (let nu = 40; nu <= 1000; nu += 20) c.loop(nu);
  assert.equal(c.fundkort.tid, kortTid);
  assert.equal(c.fundfigur.tid, modelTid);
  c.lukDialog();
  c.loop(1020);
  assert.ok(Math.abs(c.fundkort.tid - kortTid - .02) < 1e-10);
  assert.ok(Math.abs(c.fundfigur.tid - modelTid - .02) < 1e-10);
  assert.ok(!c.$("fundkort").classList.contains("fund-pause"));
});

test("Områdeskift rydder aktive fund og nær-reference og genskaber kun endnu ikke hentede skatte", () => {
  const { c, data } = prøve();
  const samlet = nytFund("kiste", "samlet"), ny = nytFund("krystal", "ny");
  c.s.hentet.push(samlet.id);
  data.ting = [samlet, ny];
  c.nær = samlet;
  c.visFund(seglFund(0, 0), { x: 1, z: 2 });
  c.skiftVerden();
  assert.equal(c.nær, null);
  assert.equal(c.fundkort.vist, null);
  assert.equal(c.fundfigur.vist, null);
  assert.equal(c.ting.length, 1);
  assert.equal(c.ting[0].id, ny.id);
  assert.deepEqual(c.s.hentet, [samlet.id]);
});

test("Faktisk udgang fra grotten rydder fundvisningen uden at miste den indsamlede skat", () => {
  const { c } = prøve();
  c.s.grotte = { id: 0, frø: 123, dybde: 2 };
  c.s.hentet.push("grotte-skat");
  c.visFund(seglFund(0, 2), { x: 1, z: 2 });
  c.forladGrotte();
  assert.equal(c.s.grotte, null);
  assert.equal(c.fundfigur.vist, null);
  assert.equal(c.fundkort.vist, null);
  assert.deepEqual(c.s.hentet, ["grotte-skat"]);
});

test("Død rydder fundforløbene før hjemrejse-dialogen og bevarer ids til genindlæsning", () => {
  const { c, gemninger } = prøve();
  c.s.hentet.push("allerede-fundet");
  c.s.hp = 1;
  c.visFund(seglFund(0, 0), { x: 1, z: 2 });
  c.ramHelt(2);
  assert.equal(c.fundfigur.vist, null);
  assert.equal(c.fundkort.vist, null);
  assert.equal(c.paused, true);
  assert.equal(c.nær, null);
  assert.deepEqual(læsRejse(gemninger.at(-1)).hentet, ["allerede-fundet"]);
});

test("Bekræftet ny rejse rydder det gamle fundkort, modeller og indsamlede ids", () => {
  const { c } = prøve();
  c.s.hentet.push("gammelt-fund");
  c.visFund(seglFund(0, 0), { x: 1, z: 2 });
  c.bekræftNy();
  c.$("dialogknapper").children[0].onclick();
  assert.deepEqual(c.s.hentet, []);
  assert.equal(c.fundfigur.vist, null);
  assert.equal(c.fundkort.vist, null);
  assert.equal(c.nær, null);
  assert.equal(c.paused, false);
  assert.equal(c.kører, true);
});
