import assert from "node:assert/strict";
import { egenskaber, kør, nyBil } from "./fysik.js";
import { afslutMission, nyFremgang, opgrader, valider } from "./fremgang.js";
import { DELE, gulv, KOLLISIONER, MISSIONER, terrænHøjde } from "./verden-data.js";
import { næsteMål, opdaterOpgave } from "./missioner.js";

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
opdaterOpgave(rejse, { ...på(næsteMål(rejse)), påJord: false, fart: 25 }, løbende, 1);
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
