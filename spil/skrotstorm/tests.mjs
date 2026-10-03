import assert from "node:assert/strict";
import { readFileSync } from 'node:fs';
import { egenskaber, kør, nyBil } from "./fysik.js";
import { afslutMission, nyFremgang, opgrader, valider, gem } from "./fremgang.js";
import { planlægRute, redningspunkt, rutemarkører, næsteVejpunkt } from './gps.js';
import { validerValg, STANDARD, gemValg, hentValg } from './indstillinger.js';
import { DELE, gulv, KOLLISIONER, MISSIONER, terrænHøjde } from "./verden-data.js";
import { næsteMål, opdaterOpgave } from "./missioner.js";
import { lyd } from "./lyd.js";

const input = { gas: 1, drej: 0, bremse: false, nitro: false };
function simulér(bil, fremgang, sekunder, styr = input) {
  for (let i = 0; i < sekunder * 60; i++) kør(bil, styr, fremgang, 1 / 60);
  return bil;
}

// En dårlig gemmefil må aldrig give penge, ukendte biler eller ugyldige niveauer.
assert.deepEqual(valider({ ...nyFremgang(), skrot: -1 }), nyFremgang());
assert.deepEqual(valider({ ...nyFremgang(), motor: 200 }), nyFremgang());
assert.deepEqual(valider({ ...nyFremgang(), bil: "ukendt" }), nyFremgang());
assert.deepEqual(valider({ ...nyFremgang(), dele: [0, 0, 1, -4, "2", 90] }).dele, [0, 1]);
assert.equal(valider({ ...nyFremgang(), mission: 2, port: 4, løbStart: true }).port, 0);

// En dyr forbedring kan kun købes én gang pr. niveau, og saldoen falder korrekt.
const økonomi = { ...nyFremgang(), skrot: 35 };
assert.equal(opgrader(økonomi, "motor"), true);
assert.equal(økonomi.motor, 1);
assert.equal(økonomi.skrot, 0);
assert.equal(opgrader(økonomi, "motor"), false);
assert.equal(opgrader(økonomi, "mangler"), false);
const opgraderet = { ...nyFremgang(), motor: 3, hjul: 3, nitro: 3 };
assert.ok(egenskaber(opgraderet).topfart > egenskaber(nyFremgang()).topfart);
assert.ok(egenskaber(opgraderet).nitroTid > egenskaber(nyFremgang()).nitroTid);

// Køreegenskaber må faktisk ændre farten, ikke kun teksten i garagen.
const lige = () => ({ ...nyBil(), x: -325, z: -125, vinkel: Math.PI, y: .8 });
const langsom = simulér(lige(), nyFremgang(), 5);
const hurtig = simulér(lige(), opgraderet, 5);
assert.ok(hurtig.afstand > langsom.afstand * 1.1, "Motoren skal mærkbart øge tilbagelagt afstand");
const boostet = simulér(lige(), nyFremgang(), 2, { ...input, nitro: true });
assert.ok(boostet.afstand > simulér(lige(), nyFremgang(), 2).afstand * 1.2, "Nitro skal give reel ekstra acceleration");
assert.ok(boostet.nitro < .3, "Boost skal bruge nitrobeholderen");
const sand = () => ({ ...nyBil(), x: -395, z: 40, vinkel: 0, y: .8 });
assert.ok(
  simulér(sand(), { ...nyFremgang(), hjul: 3 }, 5).afstand > simulér(sand(), nyFremgang(), 5).afstand,
  "Terrænhjul skal give mere fart i sand",
);

// Et solidt hus skubber bilen fri, og den høje bjergvej har korrekt højde.
const hus = KOLLISIONER[1], sammenstød = { ...nyBil(), x: hus.x, z: hus.z, y: .8, fart: 20 };
kør(sammenstød, { ...input, gas: 0 }, nyFremgang(), 1 / 60);
assert.ok(Math.hypot(sammenstød.x - hus.x, sammenstød.z - hus.z) >= hus.r + 2);
assert.equal(gulv(330, 45).y, 72);
const rækværk = { ...nyBil(), x: 330, z: 45, y: 72.8, fart: 20, vinkel: -Math.PI / 2 };
simulér(rækværk, nyFremgang(), 1);
assert.ok(rækværk.y > 60, "Rækværket skal beholde bilen på den høje vej");

// En bil under broen bliver i dalen; en bil på dækket bliver på dækket.
const underBro = { ...nyBil(), x: 100, z: 130, y: .8, påJord: true, fart: 0 };
kør(underBro, { ...input, gas: 0 }, nyFremgang(), 1 / 60);
assert.ok(Math.abs(underBro.y - (terrænHøjde(100, 130) + .8)) < .001, "Brodækket må ikke løfte bilen op nedefra");
assert.equal(gulv(100, 130, underBro.y).vej, false, "Under broen er underlaget sand");
const påBro = { ...nyBil(), x: 100, z: 130, y: gulv(100, 130).y + .8, påJord: true, fart: 0 };
const broHøjde = påBro.y;
simulér(påBro, nyFremgang(), 2, { ...input, gas: 0 });
assert.ok(Math.abs(påBro.y - broHøjde) < .001, "Bilen skal stadig kunne stå på broens øvre dæk");

// Testføreren ændrer kun retning og gas: al position og højde flyttes af fysikken.
function følgVej(bil, punkter) {
  for (const [x, y, z] of punkter) {
    let trin = 0;
    while (Math.hypot(bil.x - x, bil.z - z) > 1.5 && trin++ < 1800) {
      bil.vinkel = Math.atan2(x - bil.x, z - bil.z);
      kør(bil, { ...input, gas: bil.fart < 12 ? 1 : 0 }, nyFremgang(), 1 / 60);
    }
    assert.ok(trin < 1800, "Et vejpunkt skal kunne nås fysisk");
    assert.ok(Math.abs(bil.y - y - .8) < 1, "Opkørslen skal løfte bilen gradvist til vejens højde");
  }
}
const opkørsel = { ...nyBil(), x: -30, z: 75, y: .8, fart: 0 };
følgVej(opkørsel, [[80, 12, 100], [160, 27, 220]]);
assert.ok(opkørsel.y > 27, "Broens opkørsel skal stadig føre til det høje dæk");
const bjergtur = { ...nyBil(), x: 95, z: -240, y: 5.8, fart: 0 };
følgVej(bjergtur, [[215, 30, -175], [300, 57, -85], [330, 72, 45]]);
assert.ok(bjergtur.y > 72, "Den sammenhængende bjergvej skal stadig kunne bestiges");
const bjergmission = { ...nyFremgang(), mission: 3 };
opdaterOpgave(bjergmission, bjergtur, { hopKlar: false }, 1 / 60);
assert.equal(bjergmission.mission, 4, "Den fysisk gennemførte bjergtur skal klare tårnopgaven");
const slutmission = { ...nyFremgang(), mission: 7 };
assert.equal(
  opdaterOpgave(slutmission, bjergtur, { hopKlar: false }, 1 / 60)[0].slut,
  true,
  "Samme kørbare opkørsel skal også kunne klare slutleveringen",
);

// Rampen skal give en ægte flyvetur og en sikker landing på jorden.
const hop = { ...nyBil(), x: 43, z: -29, vinkel: Math.PI / 2, fart: 27, y: .8 };
const hopmission = { ...nyFremgang(), mission: 4 }, hopforløb = { hopKlar: false };
let luft = 0, højde = 0;
for (let i = 0; i < 300; i++) {
  kør(hop, input, nyFremgang(), 1 / 60);
  if (!hop.påJord) luft++;
  højde = Math.max(højde, hop.y);
  opdaterOpgave(hopmission, hop, hopforløb, 1 / 60);
}
assert.ok(luft > 33, "Rampen skal give over 0,55 sekunders flyvning");
assert.ok(højde > 6.8, "Bilen skal fortsætte opad efter rampens kant");
assert.ok(hop.påJord, "Bilen skal lande igen");
assert.equal(hopmission.mission, 5, "Det fysiske hop og landingen skal faktisk klare stuntopgaven");

// Bremsen stopper, styring drejer, og otte missioner har en endelig belønning.
const brems = { ...nyBil(), x: -325, z: -100, fart: 20, vinkel: Math.PI };
simulér(brems, nyFremgang(), 2, { ...input, gas: 0, bremse: true });
assert.ok(Math.abs(brems.fart) < 1);
const sving = simulér(lige(), nyFremgang(), 1, { ...input, drej: 1 });
assert.ok(sving.vinkel > Math.PI);
const kampagne = nyFremgang();
for (let i = 0; i < MISSIONER.length; i++) assert.ok(afslutMission(kampagne));
assert.equal(kampagne.mission, 8);
assert.equal(kampagne.sejre, 1);
assert.equal(kampagne.skrot, MISSIONER.reduce((n, m) => n + m.belønning, 0));
assert.equal(afslutMission(kampagne), null);

// Afprøv hele kampagnens målregler: afstand/højde, timer, korrekte porte og stunt.
const rejse = nyFremgang(), løbende = { hopKlar: false };
const på = (mål) => ({ ...nyBil(), x: mål.x, z: mål.z, y: (mål.y || 0) + .8 });
opdaterOpgave(rejse, nyBil(), løbende, 1 / 60);
assert.equal(rejse.mission, 0, "Ingen opgave må klares fra den fjerne garage");
for (const del of DELE) opdaterOpgave(rejse, på(del), løbende, 1 / 60);
assert.equal(rejse.mission, 1);
assert.equal(rejse.skrot, 65);
opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1 / 60);
assert.equal(rejse.mission, 2);
opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1 / 60);
assert.equal(rejse.port, 1);
opdaterOpgave(rejse, nyBil(), løbende, 101);
assert.equal(rejse.port, 0);
assert.equal(rejse.løbStart, false);
for (let i = 0; i < 5; i++) opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1);
assert.equal(rejse.mission, 3);
const underTårnet = { ...på(næsteMål(rejse)), y: .8 };
opdaterOpgave(rejse, underTårnet, løbende, 1);
assert.equal(rejse.mission, 3, "Tårnet kan ikke besøges under broens højde");
opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1);
assert.equal(rejse.mission, 4);
opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1);
assert.equal(rejse.mission, 4, "Bare at besøge rampen er ikke et stunt");
opdaterOpgave(rejse, { ...på(næsteMål(rejse)), x: 95, y: 7.4, vinkel: Math.PI / 2, påJord: false, fart: 25 }, løbende, 1);
opdaterOpgave(rejse, { ...på(næsteMål(rejse)), senesteHop: .8 }, løbende, 1);
assert.equal(rejse.mission, 5);
opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1);
assert.equal(rejse.mission, 6);
for (let i = 0; i < 3; i++) opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1);
assert.equal(rejse.mission, 7);
assert.equal(opdaterOpgave(rejse, på(næsteMål(rejse)), løbende, 1)[0].slut, true);
assert.equal(rejse.mission, 8);
assert.equal(rejse.sejre, 1);
console.log(
  "Skrotstorm: validering, økonomi, motor/hjul/nitro, kollision, underbro/brodæk/fysisk opkørsel, bjergvej, hop/landing og alle 8 missioners målregler bestået.",
);

// GPS vælger opkørsel og bevarer niveauet, både ved rutevalg og redning.
const underbroGps = { ...nyBil(), x: 100, z: 130, y: .8 };
const overbroGps = { ...underbroGps, y: 16.55 };
const top = { x: 330, y: 72, z: 45 };
const lavRute = planlægRute(underbroGps, top), højRute = planlægRute(overbroGps, top);
assert.equal(lavRute.niveau, 0);
assert.ok(lavRute.punkter.slice(0, 3).every(p => p.y < 3), 'GPS under broen skal først finde en lav vej');
assert.ok(lavRute.punkter.some(p => p.x === -30 && p.z === 75), 'Bjergmålet skal nås gennem broens fysiske opkørsel');
assert.ok(Math.abs(højRute.niveau - 15.75) < .01);
assert.ok(højRute.længde < lavRute.længde);
assert.equal(redningspunkt(underbroGps).y, 0);
assert.ok(Math.abs(redningspunkt(overbroGps).y - 15.75) < .01);
assert.ok(rutemarkører(lavRute).length <= 35);
assert.ok(rutemarkører(højRute).every(p => Number.isFinite(p.x + p.y + p.z)));
assert.ok(Number.isFinite(næsteVejpunkt(lavRute, underbroGps).vinkel));
for (const mission of MISSIONER) {
  const r = planlægRute(nyBil(), mission.mål);
  assert.ok(Number.isFinite(r.længde) && r.længde > 0, mission.navn);
  assert.ok(r.punkter.length >= 2, mission.navn);
}

// Valg og bilposition er valgfrie tillæg til v1. Gamle skrotbiler mister intet.
const gammel = { ...nyFremgang(), mission: 3, skrot: 175, motor: 2, hjul: 1, bil: 'buggy' };
assert.deepEqual(valider(gammel), gammel);
const lavGem = valider({ ...gammel, position: { x: 100, y: .8, z: 130, vinkel: 1 } });
assert.ok(lavGem.position.y < 1);
const højGem = valider({ ...gammel, position: { x: 100, y: 16.55, z: 130, vinkel: 1 } });
assert.ok(højGem.position.y > 16);
const dårligPosition = valider({ ...gammel, position: { x: NaN, y: 1, z: 1, vinkel: 0 } });
assert.equal(dårligPosition.position, undefined); assert.equal(dårligPosition.skrot, 175);
assert.deepEqual(validerValg({ kamera: 'forkert', grafik: 'ultra', styring: 'teleport', følsomhed: Infinity, lydstyrke: -1 }), { ...STANDARD });
assert.equal(validerValg({ kamera: 'udsigt', styring: 'rat', lydstyrke: 0, gps: false }).lydstyrke, 0);

// Lageret skriver kun ved ændringer, og fejl rapporteres uden at stoppe spillet.
const tidligereLager = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const lager = new Map(); let skrivninger = 0;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: n => lager.get(n) || null,
  setItem: (n, v) => { lager.set(n, v); skrivninger++; },
} });
assert.equal(gem(gammel), true); assert.equal(gem(gammel), true);
assert.equal(skrivninger, 1);
gemValg({ ...STANDARD }); gemValg({ ...STANDARD }); assert.equal(skrivninger, 2);
assert.deepEqual(hentValg(), { ...STANDARD });
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { throw Error('lukket'); }, setItem() { throw Error('lukket'); } } });
assert.equal(gem(gammel), false); assert.deepEqual(hentValg(), { ...STANDARD });
if (tidligereLager) Object.defineProperty(globalThis, 'localStorage', tidligereLager); else delete globalThis.localStorage;
console.log('Skrotstorm: GPS/niveausikker redning, alle 8 mål, v1-migrering, kameravalg/touch/grafik, ændringsgemning og lagerfejl bestået.');


// En testfører følger hele GPS-kampagnen med gas/retning; alle x/y/z flyttes af fysikken.
const køretur = nyBil(), køreFremgang = nyFremgang(), køreLøb = { hopKlar: false };
function kørGpsTil(mål) {
  const r = planlægRute(køretur, mål);
  for (const p of r.punkter.slice(1)) {
    let trin = 0;
    while (Math.hypot(køretur.x - p.x, køretur.z - p.z) > 3 && trin++ < 6000) {
      køretur.vinkel = Math.atan2(p.x - køretur.x, p.z - køretur.z);
      kør(køretur, { gas: køretur.fart < 12 ? 1 : 0, drej: 0, bremse: false, nitro: false }, køreFremgang, 1 / 60);
      opdaterOpgave(køreFremgang, køretur, køreLøb, 1 / 60);
    }
    assert.ok(trin < 6000, 'GPS-vejpunktet er kørbart: ' + JSON.stringify(p));
  }
}
for (let mission = 0; mission < 8; mission++) {
  let forsøg = 0;
  while (køreFremgang.mission === mission && forsøg++ < 10) {
    if (mission === 4) {
      kørGpsTil({ x: 28, y: 0, z: -29 });
      køretur.vinkel = Math.PI / 2;
      for (let i = 0; i < 420 && køreFremgang.mission === 4; i++) {
        kør(køretur, { gas: 1, drej: 0, bremse: false, nitro: true }, køreFremgang, 1 / 60);
        opdaterOpgave(køreFremgang, køretur, køreLøb, 1 / 60);
      }
    } else kørGpsTil(næsteMål(køreFremgang));
  }
  assert.equal(køreFremgang.mission, mission + 1, 'Den fysiske GPS-kørsel klarer opgave ' + (mission + 1));
}
assert.equal(køreFremgang.skrot, 860);
assert.equal(køreFremgang.sejre, 1);
console.log('Skrotstorm: alle 8 GPS-missioner er gennemkørt fysisk inklusive ræs, bro, bjerg, hop og slutlevering.');


import * as THREE from '../3d-faelles/three.module.js';
import { skabLiv } from './liv.js';

// Depotbilen bevæger sig kun under spil, venter på spilleren og skubber blødt fri.
const depotScene = new THREE.Scene(), depotLiv = skabLiv(THREE, depotScene, new THREE.Group());
const depotModel = depotScene.children[0], depotStart = depotModel.position.clone();
const fjernBil = { ...nyBil(), x: 400, z: 350 };
depotLiv.opdater(2, fjernBil, false);
assert.ok(depotModel.position.distanceTo(depotStart) < .001, 'Pause stopper depotbilen');
depotLiv.opdater(2, fjernBil, true);
depotLiv.opdater(0, fjernBil, true);
assert.ok(depotModel.position.distanceTo(depotStart) > 10, 'Industribyens depotbil kører faktisk');
const nærDepot = { ...nyBil(), x: depotModel.position.x + 5, y: depotModel.position.y + .8, z: depotModel.position.z };
const førVent = depotModel.position.clone();
depotLiv.opdater(2, nærDepot, true); depotLiv.opdater(0, nærDepot, true);
assert.equal(depotLiv.venter, true);
assert.ok(depotModel.position.distanceTo(førVent) < .001, 'Depotbilen giver plads til spilleren');
const kontaktDepot = { ...nærDepot, x: depotModel.position.x, z: depotModel.position.z, fart: 10 };
depotLiv.opdater(0, kontaktDepot, true);
assert.ok(Math.hypot(kontaktDepot.x - depotModel.position.x, kontaktDepot.z - depotModel.position.z) >= 3.3);
assert.ok(kontaktDepot.fart < 10);
console.log('Skrotstorm: depotbilens pause, bevægelse, venten og sikre kontakt bestået.');


// Flere omgange i depotbyen må hverken hoppe visuelt ved knuder eller ramme bygningszoner.
let sidsteDepot = depotModel.position.clone();
for (let i = 0; i < 24000; i++) {
  depotLiv.opdater(1 / 60, fjernBil, true);
  const p = depotModel.position;
  assert.ok(Number.isFinite(p.x + p.y + p.z + depotModel.rotation.y));
  assert.ok(p.distanceTo(sidsteDepot) < .7, 'Depotbilens vejknuder skal være bløde');
  for (const k of KOLLISIONER) if (k.y === 0) assert.ok(Math.hypot(p.x - k.x, p.z - k.z) > k.r + 2, 'Depotbilen kører uden om bygninger');
  sidsteDepot.copy(p);
}
console.log('Skrotstorm: 400 sekunders depotkørsel er uden ugyldige tal, bygningskontakt eller spring ved vejknuder.');


import { styring } from './styring.js';

// Browserens inputflade simuleres med de samme pointer-/tastaturhændelser som i Safari.
const tidligereVindue = Object.getOwnPropertyDescriptor(globalThis, 'window');
const tidligereDokument = Object.getOwnPropertyDescriptor(globalThis, 'document');
function inputFlade(navn) {
  const hændelser = new Map(), klasser = new Set();
  return {
    dataset: { styr: navn }, style: {},
    classList: { add: n => klasser.add(n), remove: n => klasser.delete(n) },
    addEventListener(type, fn) { if (!hændelser.has(type)) hændelser.set(type, []); hændelser.get(type).push(fn); },
    setPointerCapture() {}, focus() {},
    getBoundingClientRect: () => ({ left: 0, width: 126 }),
    send(type, data = {}) { for (const fn of hændelser.get(type) || []) fn({ preventDefault() {}, ...data }); },
  };
}
const tastaturFlade = inputFlade(), gasFlade = inputFlade('gas'), pilFlade = inputFlade('venstre');
const ratFlade = inputFlade(), ratSkive = inputFlade();
Object.defineProperty(globalThis, 'window', { configurable: true, value: tastaturFlade });
Object.defineProperty(globalThis, 'document', { configurable: true, value: {
  querySelectorAll: () => [gasFlade, pilFlade],
  getElementById: id => id === 'touch-rat' ? ratFlade : ratSkive,
  activeElement: { closest: () => null },
} });
const prøveStyring = styring(); prøveStyring.sætAktiv(true);
gasFlade.send('pointerdown', { pointerId: 1 }); pilFlade.send('pointerdown', { pointerId: 2 });
assert.equal(prøveStyring.hent().gas, 1); assert.equal(prøveStyring.hent().drej, -1);
pilFlade.send('pointerup', { pointerId: 2 });
assert.equal(prøveStyring.hent().gas, 1); assert.equal(prøveStyring.hent().drej, 0);
gasFlade.send('pointercancel', { pointerId: 1 }); assert.equal(prøveStyring.hent().gas, 0);
ratFlade.send('pointerdown', { pointerId: 3, clientX: 63 }); ratFlade.send('pointermove', { pointerId: 3, clientX: 100 });
gasFlade.send('pointerdown', { pointerId: 4 });
assert.ok(prøveStyring.hent().drej > .7); assert.equal(prøveStyring.hent().gas, 1);
prøveStyring.sætAktiv(false);
assert.equal(prøveStyring.hent().gas, 0); assert.equal(prøveStyring.hent().drej, 0);
ratFlade.send('pointermove', { pointerId: 3, clientX: 0 });
tastaturFlade.send('keydown', { key: 'W', repeat: true });
prøveStyring.sætAktiv(true);
tastaturFlade.send('keydown', { key: 'W', repeat: true });
assert.equal(prøveStyring.hent().gas, 0, 'En tast holdt under pause må ikke starte bilen');
tastaturFlade.send('keydown', { key: 'W', repeat: false }); assert.equal(prøveStyring.hent().gas, 1);
tastaturFlade.send('keyup', { key: 'W' }); assert.equal(prøveStyring.hent().gas, 0);
tastaturFlade.send('keydown', { key: 'Shift', repeat: false }); assert.equal(prøveStyring.hent().nitro, true);
tastaturFlade.send('blur'); assert.equal(prøveStyring.hent().nitro, false);
document.activeElement.closest = () => ({});
tastaturFlade.send('keydown', { key: 'Tab', repeat: false });
tastaturFlade.send('keydown', { key: ' ', repeat: false });
assert.equal(prøveStyring.hent().bremse, false, 'Space skal aktivere en Tab-fokuseret UI-knap');
tastaturFlade.send('pointerdown');
tastaturFlade.send('keydown', { key: ' ', repeat: false });
assert.equal(prøveStyring.hent().bremse, true, 'Space er håndbremse efter normal mouse/touch-kørsel');
tastaturFlade.send('keyup', { key: ' ' });
if (tidligereVindue) Object.defineProperty(globalThis, 'window', tidligereVindue); else delete globalThis.window;
if (tidligereDokument) Object.defineProperty(globalThis, 'document', tidligereDokument); else delete globalThis.document;
console.log('Skrotstorm: multitouch/rat, pointercancel, pause-rydning, holdte taster, Shift og blur bestået.');


// Motoren prøves isoleret på et lige vejstykke. Hastighedstilstanden bevares; positionen holdes i samme underlag.
for (const model of ['rotten', 'buggy', 'truck']) {
  for (let motor = 0; motor <= 3; motor++) {
    const f = { ...nyFremgang(), bil: model, motor }, b = { ...nyBil(), x: -340, z: 30, vinkel: Math.PI };
    for (let i = 0; i < 2700; i++) {
      b.x = -340; b.z = 30;
      kør(b, { gas: 1, drej: 0, bremse: false, nitro: false }, f, 1 / 60);
    }
    assert.ok(Math.abs(b.fart - egenskaber(f).topfart) < .05, model + ' motor' + motor + ': garagens fart er opnåelig');
  }
}
console.log('Skrotstorm: alle tre biler når garagens farttal på hvert af de fire motorniveauer.');


// Forkert retning og et for kort hop forklares én gang efter landing og giver ingen belønning.
const stuntFejl = { ...nyFremgang(), mission: 4 }, stuntTilstand = { hopKlar: false };
const stuntLuft = { ...nyBil(), x: 95, z: -29, y: 7.4, påJord: false, fart: 25, vinkel: -Math.PI / 2 };
opdaterOpgave(stuntFejl, stuntLuft, stuntTilstand, 1 / 60);
const stuntLand = { ...stuntLuft, påJord: true, y: .8, senesteHop: .8 };
assert.equal(opdaterOpgave(stuntFejl, stuntLand, stuntTilstand, 1 / 60)[0].type, 'hop');
assert.equal(stuntFejl.mission, 4);
assert.equal(opdaterOpgave(stuntFejl, stuntLand, stuntTilstand, 1 / 60).length, 0);
stuntLuft.vinkel = Math.PI / 2;
opdaterOpgave(stuntFejl, stuntLuft, stuntTilstand, 1 / 60);
stuntLand.senesteHop = .35;
assert.equal(opdaterOpgave(stuntFejl, stuntLand, stuntTilstand, 1 / 60)[0].type, 'hop');
assert.equal(stuntFejl.skrot, 0);
assert.equal(stuntTilstand.rampeTilgang, false);

// Hver karrosserivariant kan gennemføre samme GPS-kampagne, også med alle opgraderinger.
for (const [model, forbedring] of [['buggy',0],['truck',0],['rotten',3],['buggy',3],['truck',3]]) {
  Object.assign(køretur, nyBil());
  Object.assign(køreFremgang, nyFremgang(), { bil: model, motor: forbedring, hjul: forbedring, nitro: forbedring });
  Object.assign(køreLøb, { hopKlar: false, rampeForsøg: false, rampeTilgang: false });
  for (let mission = 0; mission < 8; mission++) {
    let forsøg = 0;
    while (køreFremgang.mission === mission && forsøg++ < 10) {
      if (mission === 4) {
        kørGpsTil({ x: 28, y: 0, z: -29 });
        køretur.vinkel = Math.PI / 2;
        for (let i = 0; i < 420 && køreFremgang.mission === 4; i++) {
          kør(køretur, { gas: 1, drej: 0, bremse: false, nitro: true }, køreFremgang, 1 / 60);
          opdaterOpgave(køreFremgang, køretur, køreLøb, 1 / 60);
        }
      } else kørGpsTil(næsteMål(køreFremgang));
    }
    assert.equal(køreFremgang.mission, mission + 1, model + ' niveau' + forbedring + ' kan klare opgave' + (mission + 1));
  }
  assert.equal(køreFremgang.skrot, 860);
}
console.log('Skrotstorm: stunt-råd gives én gang; alle tre biler klarer otte fysiske GPS-missioner før og efter fuld opgradering.');

// Den rigtige framefunktion afprøves under pause uden renderer, adgang eller en spilverden.
const rammeKilde = readFileSync(new URL('./spil.js', import.meta.url), 'utf8');
const rammeBlok = rammeKilde.slice(rammeKilde.indexOf('function ramme(nu)'), rammeKilde.indexOf('\nrequestAnimationFrame(ramme);'));
const tegninger = [], dokument = { hidden: false };
const opretFrameprøve = new Function('document', 'requestAnimationFrame', 'renderer', `
  let før = 0, sidsteTegning = 0, tid = 0, pauset = true, startet = true, beskedTid = 0;
  const bil = { fart: 0 }, rotorer = [], delmodeller = [], målring = { rotation: {}, position: {} }, lyde = { opdater() {} }, scene = {}, kamera = {};
  ${rammeBlok}
  return { ramme, tid: () => før };
`);
const frameprøve = opretFrameprøve(dokument, () => {}, { render: () => tegninger.push(1) });
let frameTid = 0;
for (let i = 0; i < 60; i++) { frameTid += 1000 / 60; frameprøve.ramme(frameTid); }
assert.ok(tegninger.length <= 20 && tegninger.length >= 10);
const førSkjult = tegninger.length;
dokument.hidden = true;
for (let i = 0; i < 180; i++) { frameTid += 1000 / 60; frameprøve.ramme(frameTid); }
assert.equal(tegninger.length, førSkjult);
assert.equal(frameprøve.tid(), frameTid);
dokument.hidden = false; frameTid += 1000 / 60; frameprøve.ramme(frameTid);
assert.equal(tegninger.length, førSkjult + 1);
console.log('Skrotstorm: pause højst 20 Hz, skjult fane uden render og frisk frame-tid bestået.');

// Det faktiske lydmodul prøves med et isoleret API, aldrig med browserens lager eller voksenlås.
function lydmiljø(fejl = null, lukFejl = 'async') {
  const valg = { fejl }, spor = { kontekster: 0, lukninger: 0, resume: 0, gains: [], toner: [] };
  const prøv = navn => { if (valg.fejl === navn) throw Error('Valgfri lydfejl: ' + navn); };
  const parameter = () => ({ value: 0,
    setTargetAtTime(v) { prøv('parameter'); this.value = v; },
    setValueAtTime(v) { prøv('parameter'); this.value = v; },
    linearRampToValueAtTime() { prøv('parameter'); }, exponentialRampToValueAtTime() { prøv('parameter'); },
  });
  const knude = () => ({ connect() { prøv('connect'); }, start() { prøv('start'); }, stop() {} });
  class Audio {
    constructor() {
      prøv('constructor'); spor.kontekster++;
      this.sampleRate = 16; this.currentTime = 0; this.destination = {};
    }
    createOscillator() {
      prøv('createOscillator'); const o = { ...knude(), frequency: parameter() }; spor.toner.push(o); return o;
    }
    createGain() {
      prøv('createGain'); const g = { ...knude(), gain: parameter() }; spor.gains.push(g); return g;
    }
    createBuffer(c, n) {
      prøv('createBuffer'); return { getChannelData() { prøv('getChannelData'); return new Float32Array(n); } };
    }
    createBufferSource() { prøv('createBufferSource'); return knude(); }
    resume() {
      spor.resume++; prøv('resumeSynkront');
      return valg.fejl === 'resumeAsync' ? Promise.reject(Error('Afvist genoptagelse')) : Promise.resolve();
    }
    close() {
      spor.lukninger++;
      if (lukFejl === 'sync') throw Error('Afvist lukning');
      return Promise.reject(Error('Afvist lukning'));
    }
  }
  return { Audio, valg, spor };
}
const lydVindue = Object.getOwnPropertyDescriptor(globalThis, 'window');
const lydLager = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const afvisninger = [], fangAfvisning = fejl => afvisninger.push(fejl);
process.on('unhandledRejection', fangAfvisning);
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem() {} } });
  Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: {} });
  assert.equal(lyd().start(), false, 'WebAudio kan mangle, uden at Start kaster');
  for (const [i, fejl] of ['constructor','createOscillator','createGain','connect','start','createBuffer','getChannelData','createBufferSource'].entries()) {
    const m = lydmiljø(fejl, i % 2 ? 'sync' : 'async');
    globalThis.window = { AudioContext: m.Audio };
    const lyde = lyd();
    assert.equal(lyde.start(), false, fejl + ' er valgfri');
    assert.equal(m.spor.lukninger, fejl === 'constructor' ? 0 : 1, 'en halv graf forsøges lukket');
    assert.doesNotThrow(() => { lyde.opdater(20, true); lyde.klang(); });
    m.valg.fejl = null;
    assert.equal(lyde.start(), true, 'et nyt tryk kan bygge en hel graf');
    assert.equal(m.spor.kontekster, fejl === 'constructor' ? 1 : 2, 'en halv graf bliver ikke genbrugt');
    assert.equal(m.spor.resume, 1);
  }
  for (const fejl of ['resumeSynkront','resumeAsync']) {
    const m = lydmiljø(fejl);
    globalThis.window = { webkitAudioContext: m.Audio };
    const lyde = lyd();
    assert.doesNotThrow(() => lyde.start());
    await new Promise(resolve => setImmediate(resolve));
    m.valg.fejl = null;
    assert.equal(lyde.start(), true);
    assert.equal(m.spor.kontekster, 1, 'en hel graf kan genoptages uden at oprette lyd igen');
    assert.equal(m.spor.resume, 2);
    lyde.opdater(20, true);
    assert.ok(m.spor.gains[0].gain.value > 0);
    lyde.opdater(20, false);
    assert.ok(m.spor.gains.every(g => g.gain.value === 0), 'pause stopper motor og vind');
    lyde.volumen(0); lyde.opdater(20, true); lyde.klang();
    assert.ok(m.spor.gains.every(g => g.gain.value === 0), 'nul lydstyrke er stille');
    assert.equal(m.spor.toner.length, 1, 'nul lydstyrke giver ingen klang');
    lyde.volumen(.65); assert.equal(lyde.skift(), true); lyde.opdater(20, true); lyde.klang();
    assert.ok(m.spor.gains.every(g => g.gain.value === 0), 'mute er stille');
    assert.equal(m.spor.toner.length, 1);
    lyde.skift(); m.valg.fejl = 'parameter';
    assert.doesNotThrow(() => { lyde.opdater(20, true); lyde.klang(); }, 'enheden kan afvise senere lyd uden at stoppe spillet');
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(afvisninger, [], 'hverken resume eller halvgrafens lukning giver ufangede promisefejl');
} finally {
  process.off('unhandledRejection', fangAfvisning);
  if (lydVindue) Object.defineProperty(globalThis, 'window', lydVindue); else delete globalThis.window;
  if (lydLager) Object.defineProperty(globalThis, 'localStorage', lydLager); else delete globalThis.localStorage;
}
console.log('Skrotstorm: valgfri lyd, halv graf, synkront/async resume, Safari-fallback, pause og mute bestået.');
