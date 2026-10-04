import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { maxLiv, niveau, nyRejse, skade, sværdRammer, VÅBEN } from "./eventyr.js";
import { friLinje, vælgMål } from "./navigation.js";
import { opdatérFlyvere } from "./projektiler.js";
import { opdatérAngreb, startAngreb } from "./kamp.js";

// Afprøv de faktiske spilfunktioner uden at indlæse voksenlås, browser eller gemninger.
const kilde = readFileSync(new URL("./spil.js", import.meta.url), "utf8");
const navne = ["angrib", "kampTrin", "kampstatus", "afbrydAngreb", "udløsAngreb", "skiftVåben",
  "skiftVerden", "ramHelt", "sendSkud", "opdatérSkud", "opdatér", "loop"];
const funktioner = navne.map((navn) => {
  const match = kilde.match(new RegExp(`^function ${navn}\\([\\s\\S]*?\\)\\s*\\{[\\s\\S]*?^\\}\\r?$`, "m"));
  assert.ok(match, `Den rigtige spilfunktion ${navn} skal findes`);
  return match[0];
}).join("\n");

function punkt(x = 0, y = 0, z = 0) {
  return { x, y, z,
    set(x, y, z) { Object.assign(this, { x, y, z }); return this; },
    lerp(p, del) { this.x += (p.x - this.x) * del; this.y += (p.y - this.y) * del; this.z += (p.z - this.z) * del; },
  };
}

function figur() {
  return { position: punkt(), rotation: punkt(), visible: true,
    scale: { setScalar() {} }, material: { opacity: 1 }, add() {},
  };
}

function fjende(x, z, art = "slim") {
  const obj = figur();
  obj.position.set(x, 0, z);
  return { obj, art, hp: 10000, boss: false, stun: 0 };
}

// Kun tegning og sideeffekter erstattes; timing, skade, målvalg og projektilkollision er ægte.
function prøvSpil(våben = "sværd") {
  const hændelser = [], ramt = [], felter = new Map();
  const $ = (id) => {
    if (!felter.has(id)) felter.set(id, { value: 0, style: {}, classList: { remove() {}, add() {} } });
    return felter.get(id);
  };
  const tomVerden = () => ({ rod: figur(), fjender: [], ting: [], steder: [] });
  const scene = { add() {}, background: { set() {} }, fog: { color: { copy() {} } } };
  const s = { ...nyRejse(123), x: 0, z: 0, våben, vejledning: 4 };
  const c = {
    VÅBEN, maxLiv, niveau, skade, sværdRammer, friLinje, vælgMål, opdatérFlyvere, startAngreb, opdatérAngreb,
    s, scene, $,
    kører: true, paused: false, touch: false, tid: 0, angreb: null, sidsteSværd: null,
    angrebspause: 0, venpause: 100, helbredstid: 0, angrebHold: null, sidstEnergiTip: -10,
    yaw: 0, sidst: 0, sidsteTegning: 0, hudtid: 0, gemtid: 0, beskedtid: 0,
    egetSpor: null, ruteNøgle: "", målFjende: null, angrebMål: null, sigte: null,
    modeller: {}, verden: tomVerden(), mira: null, GROTTENAVNE: ["Mosgrotten"],
    helt: figur(), ven: figur(), glød: figur(), kamMål: punkt(), sporring: figur(),
    fjender: [], ting: [], skud: [], effekter: [], flyvetekster: [], øveskiver: [], skilte: [],
    taster: new Set(), joystick: { x: 0, y: 0 },
    retning: { x: 0, y: -1,
      set(x, y) { Object.assign(this, { x, y }); return this; },
      normalize() { const d = Math.hypot(this.x, this.y) || 1; this.x /= d; this.y /= d; return this; },
    },
    document: { hidden: false, querySelectorAll: () => [] },
    requestAnimationFrame() {}, renderer: { render() {} }, kamera: {}, kameraTrin() {},
    frit: () => true, bygØ: tomVerden, bygGrotte: tomVerden, danGrotte() {}, bygØveplads() {},
    kopi: () => figur(), ring: () => figur(), boldGeo: {}, farver: {},
    THREE: { Vector3: punkt, Mesh: figur, MeshBasicMaterial: function () {} },
    gem() {}, hud() {}, fjern() {}, blink() {}, tone() {}, besked() {}, ramSkive() {}, lukDialog() {},
    nærFjende: () => null, opdatérFjender() {},
    dialog() { c.paused = true; },
    ramFjende(f, antal) { ramt.push({ f, antal }); f.hp -= antal; },
    opdatérKampstatus(data) { hændelser.push({ type: "status", ...data }); },
    fundfigur: { ryd() {}, opdatér() {} },
    fundkort: { skjul() {}, opdatér() {} },
    roligeFund: () => false,
    kampfigur: {
      pose(data) { hændelser.push({ type: "pose", x: c.helt.position.x, z: c.helt.position.z, ...data }); },
      munding({ x, z }) {
        hændelser.push({ type: "munding" });
        return { x: c.helt.position.x + x * .8, y: 1.2, z: c.helt.position.z + z * .8 };
      },
      nulstil() { hændelser.push({ type: "nulstil" }); },
      skiftVåben(v) { hændelser.push({ type: "våben", v }); },
    },
  };
  vm.createContext(c);
  new vm.Script(funktioner, { filename: "spil.js — isolerede kampfunktioner" }).runInContext(c);
  return { c, hændelser, ramt };
}

for (const [våben, del] of [["sværd", .35], ["bue", .55], ["magi", .4]]) {
  test(`${våben}: spilkoblingen udløser først i slagfasen og kun én gang`, () => {
    const { c, hændelser, ramt } = prøvSpil(våben);
    c.fjender.push(fjende(0, -2));
    c.angrib();
    const varighed = VÅBEN[våben].pause;
    const antal = () => våben === "sværd" ? ramt.length : c.skud.length;
    assert.equal(antal(), 0, "Trykket må ikke give skade eller et projektil");
    c.kampTrin(varighed * del - .000001, 0);
    assert.equal(antal(), 0);
    c.kampTrin(.000002, 0);
    assert.equal(antal(), 1);
    assert.ok(hændelser.filter((h) => h.type === "pose").at(-1).fremskridt >= del);
    c.kampTrin(varighed * 2, 0);
    assert.equal(antal(), 1);
    assert.equal(c.angreb, null);
    c.kampTrin(varighed, 0);
    assert.equal(antal(), 1);
  });
}

test("Billedtid over både frigivelse og afslutning giver ét projektil fra den nye pose", () => {
  const { c, hændelser } = prøvSpil("bue");
  c.angrib();
  c.kampTrin(4, 0);
  assert.equal(c.skud.length, 1);
  assert.equal(c.angreb, null);
  const i = hændelser.findIndex((h) => h.type === "munding");
  assert.equal(hændelser[i - 1].type, "pose");
  assert.equal(hændelser[i - 1].fremskridt, .55);
  assert.equal(hændelser[i + 1].type, "pose");
  assert.equal(hændelser[i + 1].fremskridt, 1);
});

test("Bevægelse sker før pose og frigivelse, mens retningen fastholdes under angrebet", () => {
  const { c, hændelser } = prøvSpil("bue");
  c.angrib();
  const oprindeligt = c.angreb;
  c.taster.add("d");
  c.opdatér(.4);
  assert.equal(c.s.x, 2.08);
  assert.equal(c.helt.position.x, c.s.x);
  assert.equal(c.skud.length, 1);
  assert.equal(c.skud[0].obj.position.x, c.s.x);
  assert.equal(c.skud[0].dz, -26);
  assert.equal(c.retning.x, 0);
  assert.equal(c.retning.y, -1);
  assert.equal(oprindeligt.x, 0);
  const i = hændelser.findIndex((h) => h.type === "munding");
  assert.equal(hændelser[i - 1].x, c.s.x);
  assert.equal(hændelser[i - 1].type, "pose");
});

test("Sværdet rammer fra den aktuelle position og bruger udstyr og niveau fra trykket", () => {
  const { c, ramt } = prøvSpil();
  Object.assign(c.s, { udstyr: 1, xp: 90 });
  const forventet = skade(c.s, "slim");
  c.angrib();
  Object.assign(c.s, { x: 6, udstyr: 3, xp: 810 });
  const gammel = fjende(0, -2), ny = fjende(6, -2);
  c.fjender.push(gammel, ny);
  c.kampTrin(.2, 0);
  assert.equal(ramt.length, 1);
  assert.strictEqual(ramt[0].f, ny);
  assert.equal(ramt[0].antal, forventet);
  assert.equal(gammel.hp, 10000);
});

test("Sværdet rammer ikke gennem en væg, bag figuren eller uden for rækkevidde", () => {
  const { c, ramt } = prøvSpil();
  c.s.valg.autosigte = false;
  c.frit = (_, x, z) => !(x > .2 && z < -.4);
  c.fjender.push(fjende(1, -2), fjende(0, 2), fjende(0, -3.1), fjende(0, -2));
  c.angrib();
  c.kampTrin(.2, 0);
  assert.equal(ramt.length, 1);
  assert.strictEqual(ramt[0].f, c.fjender[3]);
});

test("Frigivelse kontrollerer hele vejen fra nuværende position til en ellers fri munding", () => {
  const { c } = prøvSpil("bue");
  c.angrib();
  c.s.x = 10;
  c.kampfigur.munding = () => ({ x: 12, y: 1.2, z: 0 });
  c.frit = (_, x) => x < 10.8 || x > 11.2;
  c.kampTrin(.4, 0);
  assert.equal(c.skud.length, 0, "Et frit slutpunkt må ikke slippe pilen gennem væggen");
  c.kampTrin(1, 0);
  assert.equal(c.skud.length, 0, "Det afviste skud må ikke prøves igen efter frigivelsen");
});

for (const våben of ["bue", "magi"]) {
  test(`${våben}: flyvende skud beholder niveau og udstyr trods våbenskift og opgradering`, () => {
    const { c, ramt } = prøvSpil(våben);
    Object.assign(c.s, { udstyr: 1, xp: 90 });
    const art = våben === "magi" ? "stenvogter" : "krystaldyr", forventet = skade(c.s, art);
    c.angrib();
    Object.assign(c.s, { udstyr: 3, xp: 810 });
    c.kampTrin(VÅBEN[våben].pause * .6, 0);
    assert.equal(c.skud.length, 1);
    assert.equal(c.skud[0].udstyr, 1);
    assert.equal(c.skud[0].niveau, 2);
    c.skiftVåben("sværd");
    const p = c.skud[0], mål = fjende(p.obj.position.x, p.obj.position.z - .1, art);
    c.fjender.push(mål);
    c.opdatérSkud(.001);
    assert.equal(ramt.length, 1);
    assert.equal(ramt[0].antal, forventet);
    assert.equal(c.skud.length, 0);
  });
}

test("Våbenskift før frigivelse afbryder angreb og kombination uden at forkorte pausen", () => {
  const { c, hændelser } = prøvSpil("magi");
  c.angrib();
  c.kampTrin(.1, 0);
  c.skiftVåben("bue");
  assert.equal(c.angreb, null);
  assert.equal(c.angrebMål, null);
  assert.equal(c.sidsteSværd, null);
  assert.equal(c.angrebspause, VÅBEN.magi.pause);
  c.kampTrin(2, 0);
  assert.equal(c.skud.length, 0);
  assert.ok(hændelser.some((h) => h.type === "nulstil"));
});

test("Rejse fjerner både påbegyndt angreb, kombination og projektiler fra den gamle verden", () => {
  const { c } = prøvSpil("bue");
  c.sendSkud(0, 0, 0, -1, "bue", 15);
  c.angrib();
  c.angrebMål = fjende(0, -5);
  c.sidsteSværd = { slag: 2, start: 0 };
  c.skiftVerden();
  assert.equal(c.angreb, null);
  assert.equal(c.angrebMål, null);
  assert.equal(c.sidsteSværd, null);
  assert.equal(c.angrebspause, 0);
  c.kampTrin(2, 0);
  assert.equal(c.skud.length, 0);
});

test("Død følger det rigtige verdensskift og kan ikke frigive det tidligere angreb", () => {
  const { c } = prøvSpil("magi");
  c.s.grotte = { frø: 123, id: 0, dybde: 2 };
  c.s.hp = 1;
  c.angrib();
  c.angrebMål = fjende(0, -5);
  c.ramHelt(2);
  assert.equal(c.angreb, null);
  assert.equal(c.angrebMål, null);
  assert.equal(c.s.grotte, null);
  assert.equal(c.s.x, 0);
  assert.equal(c.s.z, 5);
  assert.equal(c.paused, true);
  c.kampTrin(2, 0);
  assert.equal(c.skud.length, 0);
});

test("Den rigtige frameloop fryser et påbegyndt angreb under pause og genoptager samme fase", () => {
  const { c } = prøvSpil("bue");
  c.angrib();
  c.kampTrin(.1, 0);
  const før = c.angreb;
  c.paused = true;
  for (let nu = 50; nu <= 1000; nu += 50) c.loop(nu);
  assert.strictEqual(c.angreb, før);
  assert.equal(c.skud.length, 0);
  c.paused = false;
  c.loop(1020);
  assert.ok(Math.abs(c.angreb.tid - .12) < 1e-10);
  assert.equal(c.skud.length, 0);
});

test("Holdt sværdangreb veksler sammenhængende mellem slag 1 og 2 uden at annullere sig selv", () => {
  const { c, hændelser, ramt } = prøvSpil();
  c.fjender.push(fjende(0, -2));
  c.taster.add(" ");
  for (let i = 0; i < 48; i++) c.opdatér(.05);
  const starter = hændelser.filter((h) => h.type === "pose" && h.fremskridt === 0);
  assert.deepEqual(starter.map((h) => h.slag), [1, 2, 1, 2]);
  assert.equal(ramt.length, 4);
});

test("Autosigte følger samme bevægelige mål under tilløbet og sigter fra den faktiske munding", () => {
  const { c } = prøvSpil("bue");
  c.touch = true;
  const mål = fjende(0, -9);
  c.fjender.push(mål);
  c.angrib();
  const vedTrykket = c.angreb;
  c.s.x = 3;
  c.helt.position.x = 3;
  mål.obj.position.set(6, 0, -7);
  c.kampfigur.munding = () => ({ x: 3.35, y: 1.2, z: -.6 });
  c.kampTrin(.1, 1);
  const d = Math.hypot(3, -7);
  assert.ok(Math.abs(c.angreb.dx - 3 / d) < 1e-10);
  assert.ok(Math.abs(c.angreb.dz + 7 / d) < 1e-10);
  assert.equal(vedTrykket.dx, 0);
  assert.equal(vedTrykket.dz, -1);
  assert.equal(vedTrykket.x, 0);
  c.kampTrin(.3, 1);
  const p = c.skud[0], px = mål.obj.position.x - p.obj.position.x, pz = mål.obj.position.z - p.obj.position.z;
  assert.ok(Math.abs(p.dx * pz - p.dz * px) < 1e-10, "Pilens retning går gennem målet fra pilens udgangspunkt");
  const dx = p.dx, dz = p.dz;
  mål.obj.position.set(-4, 0, -5);
  c.kampTrin(.1, 1);
  assert.equal(c.skud[0].dx, dx);
  assert.equal(c.skud[0].dz, dz);
});

test("Et sigtepunkt præcis under helten bevarer en brugbar retning", () => {
  const { c } = prøvSpil("bue");
  c.s.valg.autosigte = false;
  c.sigte = { x: 0, z: 0 };
  c.retning.set(0, 0);
  c.angrib();
  assert.equal(c.angreb.dx, 0);
  assert.equal(c.angreb.dz, -1);
  c.kampTrin(.4, 0);
  assert.equal(c.skud[0].dx, 0);
  assert.equal(c.skud[0].dz, -26);
});

test("Magikuglen fra en høj stav når mål på flere afstande inden levetiden og falder mod målets højde", () => {
  for (const afstand of [3, 8, 17.5]) {
    const { c, ramt } = prøvSpil("magi");
    c.touch = true;
    const mål = fjende(0, -afstand, "stenvogter");
    c.fjender.push(mål);
    c.kampfigur.munding = () => ({ x: .3, y: 2.3, z: -.5 });
    c.angrib();
    c.kampTrin(.4, 0);
    assert.equal(c.skud.length, 1);
    const p = c.skud[0], d = Math.hypot(.3, afstand - .5);
    assert.equal(p.obj.position.y, 2.3);
    assert.ok(p.dy < 0);
    assert.ok(Math.abs(p.dy / 14 - (1.1 - 2.3) / Math.max(3, d)) < 1e-10);
    let levetid = 0;
    while (c.skud.length && levetid < 2) {
      c.opdatérSkud(1 / 120);
      levetid += 1 / 120;
    }
    assert.equal(ramt.length, 1, `Målet ${afstand} meter væk rammes inden kuglen udløber`);
    assert.ok(levetid < 1.6);
    assert.ok(p.obj.position.y >= 1.1 && p.obj.position.y < 1.6);
    assert.equal(c.skud.length, 0);
  }
});

test("Magi betaler energi én gang ved starten, og for lidt energi kan ikke efterlade et skjult skud", () => {
  const { c } = prøvSpil("magi");
  c.angrib();
  assert.equal(c.s.mana, 86);
  for (let i = 0; i < 5; i++) c.angrib();
  assert.equal(c.s.mana, 86);
  c.afbrydAngreb();
  c.angrebspause = 0;
  c.s.mana = 13;
  c.angrib();
  assert.equal(c.angreb, null);
  assert.equal(c.s.mana, 13);
  c.kampTrin(2, 0);
  assert.equal(c.skud.length, 0);
});
