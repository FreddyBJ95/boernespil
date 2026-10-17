import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { opretSimulering } from "./simulering.js";

const del = (id, p, ændringer = {}) => ({ id, p, halv: [0.5, 0.5, 0.5], materiale: "beton", styrke: 0.1, masse: 1, fundament: false, ...ændringer });
const blok = { navn: "Testblok", dele: [del("blok", [0, 0.5, 0], { fundament: true })], baand: [] };
const celle = { navn: "Energicelle", dele: [del("celle", [0, 0.5, 0], { materiale: "metal", styrke: 0.2, fundament: true })], baand: [] };
const opskrifter = ændringer => ({ bil: blok, hus: blok, taarn: blok, celle, ...ændringer });
const frem = (sim, sekunder) => { for (let i = 0; i < Math.round(sekunder * 60); i++) sim.tick(1 / 60); };
const objektDele = (sim, id) => sim.hentDele().filter(d => d.objekt === id);

test("den virkelige Rapier-motor skifter fra opstilling til fysisk fald", async t => {
  const sim = await opretSimulering(opskrifter()); t.after(() => sim.frigiv());
  sim.placér({ id: "klods", type: "hus", x: 0, z: 0, y: 5 });
  assert.equal(objektDele(sim, "klods")[0].aktiv, false);
  sim.udloes({ x: 0, y: 5.1, z: 0, styrke: 3 });
  assert.equal(objektDele(sim, "klods")[0].aktiv, true);
  frem(sim, 5);
  const efter = objektDele(sim, "klods")[0];
  assert.ok(efter.p[1] < 1, `klodsen ligger på jorden: ${efter.p}`);
  assert.ok(sim.hentHaendelser().some(h => h.type === "kontakt"));
});

test("en intakt alternativ støtte holder taget; sidste tabte støtte frigiver det", async t => {
  const hus = { navn: "To støtter", dele: [del("venstre", [-4, 0.5, 0], { fundament: true }),
    del("højre", [4, 0.5, 0], { fundament: true }), del("tag", [0, 12, 0])], baand: [["venstre", "tag"], ["højre", "tag"]] };
  const sim = await opretSimulering(opskrifter({ hus })); t.after(() => sim.frigiv());
  sim.placér({ id: "hus", type: "hus", x: 0, z: 0 });
  sim.udloes({ x: -4, y: 0.5, z: 0, styrke: 3 });
  let tag = objektDele(sim, "hus").find(d => d.del === "tag");
  assert.equal(tag.skade, 0); assert.equal(tag.aktiv, false);
  sim.udloes({ x: 4, y: 0.5, z: 0, styrke: 3 });
  tag = objektDele(sim, "hus").find(d => d.del === "tag");
  assert.equal(tag.skade, 0); assert.equal(tag.aktiv, true);
  frem(sim, 1);
  assert.ok(objektDele(sim, "hus").find(d => d.del === "tag").p[1] < 10);
});

test("en løs sammenhængende tårnsektion falder som ét legeme før næste brud", async t => {
  const taarn = { navn: "Sammenhængende", dele: [del("fod", [0, 0.5, 0], { fundament: true }), del("top1", [0, 10.5, 0]),
    del("top2", [0, 11.5, 0])], baand: [["fod", "top1"], ["top1", "top2"]] };
  const sim = await opretSimulering(opskrifter({ taarn })); t.after(() => sim.frigiv());
  sim.placér({ id: "taarn", type: "taarn", x: 0, z: 0 });
  sim.udloes({ x: 0, y: 0.5, z: 0, styrke: 3 }); frem(sim, 0.5);
  const [a, b] = objektDele(sim, "taarn").filter(d => d.del.startsWith("top"));
  assert.ok(a.aktiv && b.aktiv);
  assert.ok(Math.abs(Math.hypot(...a.p.map((v, i) => v - b.p[i])) - 1) < 1e-4);
  assert.ok(a.p[1] < 10);
});

test("start aktiverer kun første celle; nære celler danner en endelig kæde", async t => {
  const sim = await opretSimulering(opskrifter(), { frø: 42 }); t.after(() => sim.frigiv());
  sim.placér({ id: "a", type: "celle", x: 0, z: 0, forsinkelse: 0.2 });
  sim.placér({ id: "b", type: "celle", x: 5, z: 0, forsinkelse: 0.6 });
  sim.placér({ id: "c", type: "celle", x: 10, z: 0, forsinkelse: 0.2 });
  sim.placér({ id: "langt-vaek", type: "celle", x: 32, z: 0 });
  sim.start(); assert.equal(sim.hentStatus().planlagte, 1);
  frem(sim, 0.1); assert.equal(sim.hentStatus().pulser, 0);
  frem(sim, 0.2); assert.equal(sim.hentStatus().pulser, 1);
  frem(sim, 5);
  const pulser = sim.hentHaendelser().filter(h => h.type === "puls");
  assert.deepEqual(pulser.map(p => p.objekt), ["a", "b", "c"]);
  assert.deepEqual(pulser.map(p => p.kaede), [1, 2, 3]);
  assert.equal(sim.hentResultater().find(o => o.id === "langt-vaek").brugt, false);
  assert.equal(sim.udloes({ x: 0, y: 0.5, z: 0, id: "a" }), false);
  assert.equal(sim.hentStatus().pulser, 3);
});

test("en fysisk faldende del kan udløse en celle uden for den første puls", async t => {
  const tung = { navn: "Tung blok", dele: [del("blok", [0, 0.5, 0], { fundament: true, styrke: 0, masse: 8, halv: [0.65, 0.5, 0.65] })], baand: [] };
  const sim = await opretSimulering(opskrifter({ taarn: tung })); t.after(() => sim.frigiv());
  sim.placér({ id: "falder", type: "taarn", x: 0, y: 8, z: 0 });
  sim.placér({ id: "reaktiv", type: "celle", x: 0, z: 0 });
  sim.udloes({ x: 0, y: 8.1, z: 0, styrke: 1 });
  assert.equal(sim.hentResultater().find(o => o.id === "reaktiv").skade, 0);
  assert.equal(sim.hentStatus().planlagte, 0);
  frem(sim, 5);
  const hændelser = sim.hentHaendelser();
  const kontakt = hændelser.findIndex(h => h.type === "kontakt");
  const sekundær = hændelser.findIndex(h => h.type === "puls" && h.objekt === "reaktiv");
  assert.ok(kontakt >= 0 && sekundær > kontakt);
  assert.equal(sim.hentStatus().pulser, 2);
});

test("intakte konstruktioner skades ikke af tid og egen vægt", async t => {
  const sim = await opretSimulering(opskrifter()); t.after(() => sim.frigiv());
  sim.placér({ id: "intakt", type: "hus", x: 0, z: 0 });
  sim.udloes({ x: 35, y: 0.5, z: 35, styrke: 1 }); frem(sim, 8);
  const resultat = sim.hentResultater()[0];
  assert.equal(resultat.skade, 0); assert.equal(resultat.brud, 0);
  assert.equal(objektDele(sim, "intakt")[0].aktiv, false);
});

test("hævede objekter holdes under bygning, men falder ved Start uden at blive ramt af pulsen", async t => {
  const sektion = { navn: "Hel sektion", dele: [del("fod", [0, 0.5, 0], { fundament: true }), del("top", [0, 1.5, 0])], baand: [["fod", "top"]] };
  const sim = await opretSimulering(opskrifter({ bil: sektion, hus: sektion, taarn: sektion })); t.after(() => sim.frigiv());
  const gemt = ["bil", "hus", "taarn"].map((type, i) => sim.placér({ id: type, type, x: (i - 1) * 10, y: 6, z: 0 }));
  gemt.push(sim.placér({ id: "fjern-celle", type: "celle", x: 30, z: 0, styrke: 1 }));
  const før = sim.hentDele();
  frem(sim, 1);
  assert.deepEqual(sim.hentDele(), før, "opstillingen flytter sig ikke, før spilleren starter");
  sim.start();
  for (const type of ["bil", "hus", "taarn"]) assert.ok(objektDele(sim, type).every(d => d.aktiv));
  frem(sim, 0.5);
  for (const type of ["bil", "hus", "taarn"]) {
    const dele = objektDele(sim, type);
    assert.ok(dele[0].p[1] < 6, `${type}: tyngdekraften virker uden en nærliggende puls`);
    assert.ok(Math.abs(Math.hypot(...dele[0].p.map((v, i) => v - dele[1].p[i])) - 1) < 1e-4, `${type}: forbliver sammenhængende under frit fald`);
    assert.equal(sim.hentResultater().find(o => o.id === type).skade, 0, "faldet er ikke skabt af pulsskade");
  }
  frem(sim, 2);
  const hændelser = sim.hentHaendelser();
  for (const type of ["bil", "hus", "taarn"]) assert.ok(hændelser.some(h => h.type === "kontakt" && h.objekt === type), `${type}: rammer fysisk jorden`);
  sim.ryd();
  for (const spec of gemt) sim.placér(spec);
  assert.deepEqual(sim.hentDele(), før, "nulstilling bruger stadig den gemte højde");
});

test("pause og genoptagelse genstarter hverken et fald eller en celleplan", async t => {
  const a = await opretSimulering(opskrifter()), b = await opretSimulering(opskrifter());
  t.after(() => { a.frigiv(); b.frigiv(); });
  for (const sim of [a, b]) {
    sim.placér({ id: "loeftet", type: "hus", x: 0, y: 6, z: 0 });
    sim.placér({ id: "sen-celle", type: "celle", x: 30, z: 0, forsinkelse: 10 });
    sim.start();
  }
  frem(a, 0.5); a.stop();
  const pauset = a.hentDele(); frem(a, 2); assert.deepEqual(a.hentDele(), pauset);
  a.start(); frem(a, 0.25); frem(b, 0.75);
  assert.deepEqual(a.hentDele(), b.hentDele(), "hastighed og pose svarer til et ubrudt fald");
  assert.equal(a.hentStatus().planlagte, 1); assert.equal(a.hentStatus().pulser, 0);
});

test("en hævet første celle udløser sin forsinkede puls ved sin aktuelle faldende position", async t => {
  const sim = await opretSimulering(opskrifter()); t.after(() => sim.frigiv());
  sim.placér({ id: "falder", type: "celle", x: 0, y: 6, z: 0, forsinkelse: 0.4 });
  sim.start(); frem(sim, 0.5);
  const pulser = sim.hentHaendelser().filter(h => h.type === "puls");
  assert.equal(pulser.length, 1); assert.equal(pulser[0].objekt, "falder");
  assert.ok(pulser[0].position[1] < 6 && pulser[0].position[1] > 5, "pulsen følger cellen, ikke den oprindelige byggeposition");
});

test("rotation og nulstilling bevarer modellerne, og tilfældig variation kan gentages", async t => {
  const asymmetrisk = { navn: "Asymmetrisk", dele: [del("vinge", [2, 1, 0], { fundament: true })], baand: [] };
  const sim = await opretSimulering(opskrifter({ bil: asymmetrisk }), { frø: 99 }); t.after(() => sim.frigiv());
  const forsøg = () => {
    sim.placér({ id: "bil", type: "bil", x: 0, z: 0, vinkel: Math.PI / 2 });
    const første = objektDele(sim, "bil")[0];
    assert.ok(Math.abs(første.p[0]) < 1e-5); assert.ok(Math.abs(første.p[2] + 2) < 1e-5);
    sim.udloes({ x: 0, y: 1, z: -2, styrke: 3 }); frem(sim, 0.5);
    return sim.hentDele();
  };
  const første = forsøg(); sim.ryd();
  assert.equal(sim.hentStatus().dele, 0); assert.equal(sim.hentStatus().pulser, 0);
  const andet = forsøg();
  for (let i = 0; i < første.length; i++) for (let k = 0; k < 3; k++) assert.ok(Math.abs(første[i].p[k] - andet[i].p[k]) < 1e-4);
});

test("pause, forsinkelse og en sen renderframe giver ingen tidsspiral", async t => {
  const sim = await opretSimulering(opskrifter()); t.after(() => sim.frigiv());
  assert.throws(() => sim.start(), /energicelle/);
  sim.placér({ id: "celle", type: "celle", x: 0, z: 0, forsinkelse: 1 });
  sim.start(); sim.tick(100); assert.ok(sim.hentStatus().tid <= 0.051);
  sim.stop(); const tid = sim.hentStatus().tid; sim.tick(1); assert.equal(sim.hentStatus().tid, tid);
  sim.start(); frem(sim, 0.5); assert.equal(sim.hentStatus().pulser, 0);
  frem(sim, 0.6); assert.equal(sim.hentStatus().pulser, 1);
  assert.throws(() => sim.tick(NaN)); assert.throws(() => sim.tick(-1));
  assert.throws(() => sim.placér({ id: "ny", type: "hus" }), /Nulstil/);
  assert.throws(() => sim.fjern("celle"), /Nulstil/);
});

test("kapacitetsfejl ændrer ikke den eksisterende bane", async t => {
  const mange = { navn: "Mange dele", dele: Array.from({ length: 100 }, (_, i) => del(`d${i}`, [(i % 10) * 2, 0.5, Math.floor(i / 10) * 2], { fundament: true })), baand: [] };
  const sim = await opretSimulering(opskrifter({ hus: mange })); t.after(() => sim.frigiv());
  for (let i = 0; i < 4; i++) sim.placér({ id: `hus${i}`, type: "hus", x: 0, z: 0 });
  const før = sim.hentStatus();
  assert.throws(() => sim.placér({ id: "for-stor", type: "hus", x: 0, z: 0 }), /fysiske dele/);
  assert.deepEqual(sim.hentStatus(), før);
  assert.equal(sim.fjern("hus0"), true); assert.equal(sim.fjern("findes-ikke"), false);
  sim.placér({ id: "ny", type: "hus", x: 0, z: 0 });
  assert.equal(sim.hentStatus().dele, 400);
});

test("defekte opskrifter og pulser kan ikke give NaN i en verden", async t => {
  await assert.rejects(opretSimulering(opskrifter({ hus: { navn: "Forkert", dele: [del("x", [0, 0, 0], { materiale: "toString" })], baand: [] } })), /ugyldige/);
  await assert.rejects(opretSimulering(opskrifter({ hus: { ...blok, baand: [["blok", "ukendt"]] } })), /Forbindelserne/);
  const sim = await opretSimulering(opskrifter()); t.after(() => sim.frigiv());
  for (const puls of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }, { x: 0, z: 0, styrke: 0 }, { x: 0, z: 0, kaede: 20 }]) assert.throws(() => sim.udloes(puls));
  assert.equal(sim.hentStatus().pulser, 0);
});

test("de originale bil-, hus- og tårnmodeller kan ødelægges uden ugyldige poser", async t => {
  const data = JSON.parse(await readFile(new URL("./modeller/opskrifter.json", import.meta.url), "utf8"));
  const sim = await opretSimulering(data, { kvalitet: "let", frø: 7 }); t.after(() => sim.frigiv());
  sim.placér({ id: "taarn", type: "taarn", x: 0, z: 0 });
  sim.placér({ id: "hus", type: "hus", x: 12, z: 0 });
  sim.placér({ id: "bil", type: "bil", x: -6, z: 0 });
  sim.udloes({ x: 2, y: 0.6, z: 0, styrke: 5 }); frem(sim, 8);
  for (const d of sim.hentDele()) {
    assert.ok([...d.p, ...d.q, d.skade].every(Number.isFinite));
    assert.ok(d.skade >= 0 && d.skade <= 1);
  }
  assert.ok(sim.hentResultater().find(o => o.id === "taarn").skade > 0.5);
  assert.ok(Math.max(...objektDele(sim, "taarn").map(d => d.p[1])) < 6);
  assert.ok(sim.hentHaendelser().length <= 240);
});

test("gentagne forsøg frigør fysik og hendelser; lukning er sikker to gange", async () => {
  const sim = await opretSimulering(opskrifter());
  for (let i = 0; i < 30; i++) {
    sim.placér({ id: "celle", type: "celle", x: 0, z: 0 }); sim.start(); frem(sim, 0.1);
    sim.ryd();
    assert.equal(sim.hentStatus().dele, 0); assert.equal(sim.hentHaendelser().length, 0);
  }
  sim.frigiv(); sim.frigiv();
  assert.throws(() => sim.tick(0.1), /lukket/);
  assert.throws(() => sim.hentDele(), /lukket/);
});
