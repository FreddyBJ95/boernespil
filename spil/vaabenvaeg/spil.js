// ===== Våbenvæggen =====
// Et våben ses fra siden på et værkstedsbord. Hold fingeren nede for at skyde: mundingsild, røg, rekyl
// og hylstre, der flyver ud og klirrer på bordet. Når magasinet er tomt, skiftes det af sig selv.
// Lysværdet tændes med første tryk og svinges med de næste; ladeknappen giver det en ny farve.
// Alt tegnes på ét 2D-lærred (ingen 3D), så spillet bruger meget lidt hukommelse.

import * as lyd from "./lyd.js";
import * as fx from "./effekter.js";
import { VÅBEN } from "./vaaben.js";
import { LASER_MÅL, lavLaserBillede, lavCelle, tegnCelle, tegnLaserLys, CELLE_PLADS } from "./scifi.js";
import { SVÆRD_MÅL, SVÆRD_FARVER, lavSkaft, tegnKlinge } from "./svaerd.js";

const $ = id => document.getElementById(id);
const lærred = $("scene"), ctx = lærred.getContext("2d", { alpha: false });
const tilfældig = (a, b) => a + Math.random() * (b - a);
const klem = (x, a, b) => Math.max(a, Math.min(b, x));
const blødUd = t => 1 - (1 - t) ** 3;

let W = 0, H = 0, dpr = 1, tid = 0, sidst = 0;
let bordBag = 0, bordY = 0;          // bordpladens bagkant og forkant (hylstrene lander imellem)
let valgt = null;                    // det valgte våbens tilstand
let fingre = 0;                      // hvor mange fingre der trykker
let ryst = 0;                        // skærmrystelse 0..1
let slag = 0;                        // kameraet "hopper" ind mod våbnet ved de store sci-fi-skud
const tilstande = new Map();
const planlagt = [];                 // små ting, der skal ske om lidt (hylsteret flyver ud lige efter skuddet)

// ---------- Billeder ----------
function hentBillede(src) { return new Promise((ok, fejl) => { const b = new Image(); b.onload = () => ok(b); b.onerror = fejl; b.src = src; }); }
let laserBillede = null, celleBillede = null, brugtCelle = null, hylsterBillede = null, ledBillede = null, skaftBillede = null;
// Et fotovåbens billeder hentes først, når det vælges, og slippes igen, når man skifter (sparer hukommelse)
async function hentVåben(v) {
  if (v.billede && !v.billedeEl) v.billedeEl = await hentBillede(v.billede);
  if (v.magasin?.billede && !v.magFoto) v.magFoto = await hentBillede(v.magasin.billede);
}
function slipVåben(v) { if (v.type === "foto") { v.billedeEl = null; v.magFoto = null; v.magBillede = null; } }
// Omrids (slæde, magasin …) laves om til en Path2D én gang og gemmes
const stier = new WeakMap();
function sti(form) {
  let p = stier.get(form);
  if (!p) { p = new Path2D(); form.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); stier.set(form, p); }
  return p;
}

// ---------- Hvert våbens tilstand (alt der bevæger sig) ----------
function nyTilstand(v) {
  return {
    v, patroner: v.patroner, næste: 0, skudNr: 0, sidsteSkud: -9,
    bolt: 0, boltT: 9, dæksel: false,            // bundstykket (0 = fremme, 1 = tilbage) og støvdækslet
    rx: 0, rvx: 0, ra: 0, rva: 0,                // rekyl: skub bagud og løft af mundingen (med fart)
    lad: null, magInde: true, magDY: 0, magV: 0, // ladning: magasinet (eller cellen), hvor langt nede det er og dets fart
    spænd: 0,                                    // ladegrebet (MP5): 0 = fremme, 1 = trukket tilbage
    dæmper: false, dæmperT: 0,                   // lyddæmperen: på eller af, og hvor langt den er skruet på (0..1)
    klo: 0, pumpe: 0, pumpeT: 9, kugleT: 1, boble: 0,   // sci-fi: kløerne, pumpen, energikuglen og boblerne
    puls: 0, bølge: 0, varme: 0, niveau: 1,      // lasergeværet: lys efter skud, opladning, varme, energi
    tændt: false, tænd: 0, farveNr: 0, sving: null, spor: [], ram: null,   // lysværdet: klingen, farven, svinget og sporet
    plads: null,
  };
}

// ---------- Skærmens størrelse og hvor tingene står ----------
function tilpas() {
  W = innerWidth; H = innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2.4e6 / (W * H)));   // højst ~2,4 mio. pixels
  lærred.width = Math.round(W * dpr); lærred.height = Math.round(H * dpr);
  const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar")) || 122;
  bordY = H - bar - klem(H * 0.07, 12, 60);
  bordBag = bordY - klem(H * 0.1, 34, 92);
  for (const s of tilstande.values()) s.plads = null;
  fx.rydLuften();
  if (valgt) forbered(valgt);
  fx.nytBord(W, H, dpr, bordBag - 80, 3600 * (valgt?.plads?.pxMm || 1));
  lavBaggrund();
}
// Våbnet skaleres, så det fylder det meste af bredden og står over bordet
// medDæmper: så stort, at der også er plads til lyddæmperen ud for mundingen
function placer(v, medDæmper = false) {
  const top = H < 500 ? 58 : 84, bund = bordBag - 14;
  const ekstra = medDæmper ? v.lyddæmper.l / v.mmPrEnhed : 0;
  const sk = Math.min(W * (W > H ? 0.8 : 0.9) / v.b, W * 0.92 / (v.b + ekstra), (bund - top) * 0.92 / v.h);
  const x0 = Math.min((W - v.b * sk) / 2 - W * 0.025, W - W * 0.04 - (v.b + ekstra) * sk);
  let y0 = bund - v.h * sk - (bund - top - v.h * sk) * 0.45;
  // Lysværdet skal kunne nå bordet, når det hugger: grebet flyttes ned, hvis bordet er for langt væk
  if (v.type === "sværd") {
    const L = (v.munding[0] + SVÆRD_MÅL.klinge - v.greb[0]) * sk, yRam = bordBag + (bordY - bordBag) * 0.5;
    y0 = klem(y0 + v.greb[1] * sk, yRam - L * 0.6, yRam - L * 0.3) - v.greb[1] * sk;
  }
  return { sk, x0, y0, px: x0 + v.greb[0] * sk, py: y0 + v.greb[1] * sk, pxMm: sk / v.mmPrEnhed };
}
// Når lyddæmperen skrues på, zoomer billedet glidende ud, så der er plads til den
function blandPlads(s) {
  if (!s.pladsMed) return;
  const t = blødUd(s.dæmperT), a = s.pladsUden, b = s.pladsMed, p = s.plads;
  for (const k of ["sk", "x0", "y0", "px", "py", "pxMm"]) p[k] = a[k] + (b[k] - a[k]) * t;
}
// Billeder, der afhænger af størrelsen, tegnes én gang her
function forbered(s) {
  s.pladsUden = placer(s.v);
  s.pladsMed = s.v.lyddæmper ? placer(s.v, true) : null;
  s.plads = { ...s.pladsUden }; blandPlads(s);
  const p = s.pladsUden;
  if (s.v.type === "laser") {
    laserBillede = lavLaserBillede(p.sk * dpr);
    celleBillede = lavCelle(p.sk * dpr);
    brugtCelle = document.createElement("canvas"); brugtCelle.width = celleBillede.width; brugtCelle.height = celleBillede.height;
    const g = brugtCelle.getContext("2d"); g.scale(p.sk * dpr, p.sk * dpr); g.translate(CELLE_PLADS.b / 2, 0); tegnCelle(g, celleBillede, 0.1, 0.5);
  }
  if (s.v.hylster) {
    hylsterBillede = s.v.hylster === "energi" ? fx.lavEnergiPatron(p.pxMm * dpr * 1.35) : fx.lavHylster(s.v.hylster, p.pxMm * dpr * 1.35);
    hylsterBillede.pxMm = p.pxMm;
  }
  if (s.v.led) ledBillede = fx.lavLed(p.pxMm * dpr * 1.35);
  if (s.v.type === "sværd") skaftBillede = lavSkaft(p.sk * dpr);
  if (s.v.magasin && s.v.billedeEl) lavMagasin(s.v, p);
  fx.nytBord(W, H, dpr, bordBag - 80, 3600 * p.pxMm);
}

// ---------- Fra våbnets egne koordinater til skærmen (med rekylen) ----------
function sætVåben(s) {
  const p = s.plads, v = s.v;
  ctx.translate(p.px, p.py); ctx.rotate(-s.ra); ctx.translate(-s.rx, 0); ctx.scale(p.sk, p.sk); ctx.translate(-v.greb[0], -v.greb[1]);
}
function tilSkærm(s, u, w, ra = s.ra) {
  const p = s.plads, v = s.v, c = Math.cos(-ra), sn = Math.sin(-ra);
  const dx = (u - v.greb[0]) * p.sk - s.rx, dy = (w - v.greb[1]) * p.sk;
  return [p.px + dx * c - dy * sn, p.py + dx * sn + dy * c];
}
const panorering = x => klem(x / W * 1.4 - 0.7, -0.8, 0.8);
const harDæmper = s => s.v.lyddæmper && s.dæmper && s.dæmperT >= 1;
function mundingen(s) {
  const v = s.v, l = harDæmper(s) ? v.lyddæmper.l / v.mmPrEnhed : 0;
  return tilSkærm(s, v.munding[0] + l, v.munding[1]);
}

// ---------- Skud ----------
function prøvSkud(s) {
  if (s.v.type === "sværd") { svingSværd(s); return; }
  if (s.lad || tid < s.næste) return;
  if (s.patroner <= 0) { lyd.tørKlik(); startLadning(s); s.næste = tid + 0.3; return; }
  skyd(s);
}
function skyd(s) {
  const v = s.v, p = s.plads;
  s.patroner--; s.skudNr++; s.næste = tid + 1 / v.kadence; s.sidsteSkud = tid;
  // Rekyl: våbnet skubbes bagud og mundingen løfter sig (mere jo længere man holder)
  const størrelse = p.sk * v.b / 1000;
  s.rvx += v.rekyl.skub * størrelse * tilfældig(0.85, 1.15);
  s.rva += v.rekyl.løft * tilfældig(0.75, 1.25);
  ryst = Math.min(v.skud ? 2.6 : 1, ryst + v.ryst);
  if (v.type === "laser") skydLaser(s); else if (v.skud) skydEnergi(s); else skydKrudt(s);
  if (s.patroner === 0) planlæg(0.45, () => startLadning(s));
}
// Et almindeligt skud: ild, lys, røg, gnister, sporlys, bundstykket og et hylster
function skydKrudt(s) {
  const v = s.v, p = s.plads, [mx, my] = mundingen(s), vinkel = -s.ra;
  const længde = p.sk * v.b;
  s.boltT = 0; s.dæksel = true;
  planlæg(0.022, () => udkast(s));
  // Med lyddæmper: kun et lille glimt, lidt røg og et dumpt "pfft"
  if (harDæmper(s)) {
    fx.mundingsild(mx, my, vinkel, v.glimt * p.pxMm / 300 * 0.2);
    fx.lysglimt(mx, my, længde * 0.15, "255,190,120", 0.4, 0.05);
    fx.røgsky(mx + 4, my, 16 * p.pxMm, 70 * p.pxMm, -10);
    lyd.skud(v.lyd, panorering(mx), true);
    return;
  }
  fx.mundingsild(mx, my, vinkel, v.glimt * p.pxMm / 300);
  fx.lysglimt(mx, my, længde * 0.6, "255,170,80", 1, 0.08);
  fx.lysglimt(mx, my, længde * 0.2, "255,230,180", 1, 0.05);
  fx.røgsky(mx + 8, my, 22 * p.pxMm, 160 * p.pxMm, -10);
  if (Math.random() < 0.6) fx.røgsky(mx + 30 * p.pxMm, my - 4, 30 * p.pxMm, 260 * p.pxMm, -20);
  fx.gnistregn(mx, my, vinkel, 4, 1600 * p.pxMm);
  if (v.sporlys && s.skudNr % v.sporlys === 0) fx.sporkugle(mx, my, vinkel + tilfældig(-0.01, 0.01), 5200);
  lyd.skud(v.lyd, panorering(mx));
}
// Hylsteret flyver op og bagud ud af patronudkastet og lander et sted på bordet
function udkast(s) {
  const v = s.v, p = s.plads, k = p.pxMm, [ux, uy] = tilSkærm(s, v.udkast[0], v.udkast[1]);
  const gulv = tilfældig(bordBag + 6, bordY - 4), dybde = (gulv - bordBag) / (bordY - bordBag), skæv = tilfældig(-0.35, 0.35);
  const zoom = k / hylsterBillede.pxMm;   // lyddæmperen kan have zoomet lidt ud
  // Maskingeværet smider hylstrene nedad; de andre smider dem op og bagud
  const [vx, vy] = v.udkastNed ? [tilfældig(-160, 160), tilfældig(80, 320)] : [tilfældig(-480, 200), tilfældig(-1350, -950)];
  fx.smid({
    billede: hylsterBillede.billede, b: hylsterBillede.b / (dpr * 1.35) * zoom, h: hylsterBillede.h / (dpr * 1.35) * zoom,
    x: ux, y: uy, vx: vx * k, vy: vy * k,
    a: tilfældig(-0.4, 0.4), va: tilfældig(-28, 28), s: 0.85, ds: 0.5, sMaks: 1 + dybde * 0.35, gulv,
    lyd: { "50ae": "stor", energi: "energi" }[v.hylster] || "messing", glød: v.hylster === "energi" ? "255,140,40" : null,
    flad: [skæv, skæv + Math.PI],   // hylstre ligger lidt på skrå, som om de peger ind mod bordet
  });
  // Bæltelænkerne fra maskingeværet falder ned ved siden af hylstrene
  if (v.led) {
    const [lx, ly] = tilSkærm(s, v.led[0], v.led[1]);
    fx.smid({ billede: ledBillede.billede, b: ledBillede.b / (dpr * 1.35) * zoom, h: ledBillede.h / (dpr * 1.35) * zoom, x: lx, y: ly,
      vx: tilfældig(-120, 120) * k, vy: tilfældig(60, 260) * k, a: tilfældig(-1, 1), va: tilfældig(-20, 20), s: 0.9, ds: 0.4, sMaks: 1 + dybde * 0.35,
      gulv: tilfældig(bordBag + 6, bordY - 4), lyd: "led", flad: [0, Math.PI] });
  }
  fx.røgsky(ux, uy - 4, 12 * k, -40 * k, -30);
  fx.lysglimt(ux, uy, 60 * k, "255,160,70", 0.5, 0.05);
}
// Sci-fi-våbnene: energikugler, strålringe, energihagl og slim — og lyset i våbnet blinker
function skydEnergi(s) {
  const v = s.v, p = s.plads, e = v.skud, sk = p.sk, vinkel = -s.ra, [mx, my] = mundingen(s);
  const cos = Math.cos(vinkel), sin = Math.sin(vinkel), stor = sk * v.b;   // stor = våbnets længde på skærmen
  s.puls = 1; s.klo = 1;
  if (e.slags === "kugle") {
    s.kugleT = 0;
    fx.energikugle({ x: mx, y: my, vx: cos * W * 1.3, vy: sin * W * 1.3, r: e.størrelse * sk * 0.9, farve: e.farve, knitter: true, nedslag: true });
    fx.skærmblink(e.farve, 0.7, 0.4, true); slag = 1;
    for (let i = 0; i < 3; i++) fx.ring(mx, my, vinkel, e.størrelse * sk * (1.2 + i * 0.7), e.farve, W * 0.25 * i, 0.22 + i * 0.08);
    fx.lysglimt(mx, my, stor * 1.3, e.farve, 1, 0.3);
    fx.lysglimt(mx - stor * 0.3, bordBag + 20, stor * 0.9, e.farve, 0.8, 0.3);
    fx.lysglimt(mx, my, stor * 0.35, "255,255,255", 1, 0.08);
    fx.lynild(mx, my, vinkel, stor * 0.32, e.farve, 7, 1.6, 0.16);
    fx.gnistregn(mx, my, vinkel, 45, 1600 * sk, e.farve);
    fx.gnistregn(mx, my, vinkel + Math.PI, 12, 700 * sk, e.farve);
    fx.skærmblink(e.farve, 0.42, 0.3);
  } else if (e.slags === "ringe") {
    for (let i = 0; i < 6; i++) fx.ring(mx, my, vinkel, e.størrelse * sk * (0.8 + i * 0.28), e.farve, W * (1.3 - i * 0.14), 0.6);
    fx.laserstråle(mx, my, vinkel, 22 * sk, e.farve);
    fx.laserstråle(mx, my, vinkel, 8 * sk, "255,255,255");
    fx.lysglimt(mx, my, stor * 0.7, e.farve, 1, 0.16);
    fx.lynild(mx, my, vinkel, stor * 0.18, e.farve, 4, 1.4, 0.1);
    const [ax, ay] = tilSkærm(s, v.antenne[0], v.antenne[1]);
    fx.gnistregn(ax, ay, -Math.PI / 2, 10, 700 * sk, e.farve); fx.lysglimt(ax, ay, 140 * sk, e.farve, 1, 0.2);
    fx.lynild(ax, ay, -Math.PI / 2, stor * 0.12, e.farve, 3, 1.3, 0.12);
    fx.skærmblink(e.farve, 0.22, 0.14); fx.skærmblink(e.farve, 0.4, 0.2, true); slag = 0.45;
    const fremme = mx, y0 = my;
    planlæg(Math.max(0.03, (W - fremme) / (W * 1.3)), () => { if (valgt?.v === v) nedslag(W - 4, y0, e.farve, e.størrelse * sk, "retro", 0.6); });
  } else if (e.slags === "hagl") {
    for (const m of [v.munding, v.munding2]) {
      const [x, y] = tilSkærm(s, m[0], m[1]);
      fx.mundingsild(x, y, vinkel, v.glimt * p.pxMm / 300); fx.mundingsild(x, y, vinkel, v.glimt * p.pxMm / 300 * 0.7);
      for (let i = 0; i < e.antal; i++) fx.sporkugle(x, y, vinkel + tilfældig(-0.1, 0.1), tilfældig(2600, 4800), e.farve, 6);
      fx.røgsky(x + 10, y, 40 * sk, 300 * sk, -20); fx.røgsky(x + 30, y, 55 * sk, 420 * sk, -30);
    }
    fx.ring(mx, my, vinkel, stor * 0.25, e.farve, W * 0.4, 0.3);
    fx.lysglimt(mx, my, stor * 1.4, "255,150,60", 1, 0.2);
    fx.lysglimt(mx, my, stor * 0.4, "255,255,230", 1, 0.07);
    fx.gnistregn(mx, my, vinkel, 28, 2200 * sk, e.farve);
    fx.lynild(mx, my, vinkel, stor * 0.15, e.farve, 4, 1, 0.08);
    fx.skærmblink("255,140,40", 0.45, 0.18); fx.skærmblink("255,90,20", 0.6, 0.35, true); slag = 1.2;
    fx.lysglimt(mx - stor * 0.4, bordBag + 20, stor * 0.9, "255,140,60", 0.8, 0.25);   // lyset kastes på bordet
    planlæg(0.08, () => { if (valgt?.v === v) lyd.nedslag("hagl", 0.6, 0.85); });
    planlæg(0.16, () => pump(s));
  } else if (e.slags === "slim") {
    // Slimklatten flyver i en bue og skal helst lande på den del af bordet, man kan se
    const g = H * 2.2;
    for (let n = 0; n < 3; n++) {
      const gulv = tilfældig(bordBag + 6, bordY - 4), vy = sin * W * 0.3 - H * tilfældig(0.3, 0.8);
      const flyvetid = (-vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, gulv - my))) / g;
      const vx = Math.max(W * 0.04, (W - 30 - mx) / flyvetid) * tilfældig(0.3, 1);
      fx.energikugle({ x: mx, y: my, vx, vy, r: e.størrelse * sk * (n ? tilfældig(0.4, 0.7) : tilfældig(1, 1.5)), farve: e.farve, tyngde: g, gulv });
    }
    fx.gnistregn(mx, my, vinkel, 14, 700 * sk, e.farve);
    fx.lysglimt(mx, my, stor * 0.6, e.farve, 1, 0.14);
    fx.ring(mx, my, vinkel, e.størrelse * sk * 2, e.farve, 0, 0.2);
    fx.skærmblink(e.farve, 0.16, 0.12); fx.skærmblink(e.farve, 0.3, 0.18, true); slag = 0.35;
  }
  lyd.energi(e.lyd, panorering(mx));
}
// Et sci-fi-skud rammer væggen ude til højre: en eksplosion af lys, lyn, gnister og røg
function nedslag(x, y, farve, r, lydSlags = "plasma", styrke = 1) {
  const k = valgt?.plads?.sk || 0.5;
  fx.lysglimt(x, y, W * 0.7 * styrke, farve, 1, 0.35);
  fx.lysglimt(x, y, 160 * k * styrke, "255,255,255", 1, 0.1);
  for (let i = 0; i < 3; i++) fx.ring(x, y, Math.PI, r * (1.5 + i), farve, 0, 0.3 + i * 0.1);
  fx.lynild(x, y, Math.PI, W * 0.22 * styrke, farve, Math.round(9 * styrke), 1.3, 0.2);
  fx.gnistregn(x, y, Math.PI, Math.round(50 * styrke), 1700 * k, farve);
  for (let i = 0; i < 4 * styrke; i++) fx.røgsky(x - tilfældig(0, 60), y + tilfældig(-40, 40), 70 * k, -tilfældig(40, 160), -tilfældig(20, 70));
  fx.skærmblink(farve, 0.35 * styrke, 0.3); fx.skærmblink(farve, 0.6 * styrke, 0.45, true);
  slag = Math.max(slag, 0.7 * styrke); ryst = Math.min(2.6, ryst + 1.2 * styrke);
  lyd.nedslag(lydSlags, styrke, 0.85);
}
// Haglgeværets pumpe: tilbage (det tomme hylster flyver ud) og frem igen. Efter ladning er der intet hylster.
function pump(s, hylster = true) {
  s.pumpeT = 0; lyd.mekanik("pumpeTilbage");
  if (hylster) planlæg(0.1, () => udkast(s));
  planlæg(0.16, () => lyd.mekanik("pumpeFrem"));
}
// Lasergeværet: en stråle, en lysring og et blåt glimt — ingen hylstre, men det bliver varmt
function skydLaser(s) {
  const v = s.v, p = s.plads, [mx, my] = mundingen(s), vinkel = -s.ra, k = p.pxMm;
  fx.laserstråle(mx - 6 * k, my, vinkel, 9 * k, "70,215,255");
  fx.ring(mx, my, vinkel, 36 * k, "140,235,255");
  fx.lysglimt(mx, my, p.sk * v.b * 0.55, "70,190,255", 1, 0.12);
  fx.gnistregn(mx, my, vinkel, 6, 1300 * k, "140,230,255");
  s.puls = 1; s.varme = Math.min(1, s.varme + 0.055);
  s.niveau = s.patroner / v.patroner;
  lyd.laser(panorering(mx));
}

// ---------- Lysværdet ----------
// Første tryk tænder klingen. Derefter svinger hvert tryk sværdet: to hug ned i bordet (gnister, røg og et
// brændemærke) og så et sving op. Holder man fingeren nede, bliver det ved. Ladeknappen giver en ny farve.
const sværdFarve = s => SVÆRD_FARVER[s.farveNr % SVÆRD_FARVER.length];
const spidsen = (s, ra = s.ra) => tilSkærm(s, s.v.munding[0] + SVÆRD_MÅL.klinge, s.v.munding[1], ra);
function svingSværd(s) {
  if (tid < s.næste) return;
  if (!s.tændt) { tændSværd(s); s.næste = tid + 0.4; return; }
  if (s.tænd < 1) return;
  const op = s.skudNr % 3 === 2; s.skudNr++;
  s.sving = { t: 0, op, fra: s.ra, ramt: false, mål: nedVinkel(s, tilfældig(0.3, 0.75)) };
  s.næste = tid + 1 / s.v.kadence;
  lyd.sværdSus(panorering(spidsen(s)[0]), op ? 1 : 0.8);
}
// Hvor højt sværdet kan løftes, og hvor langt det skal ned for at ramme bordet (dybde 0 = bagkanten, 1 = forkanten)
function opVinkel(s) {
  const p = s.plads, L = (s.v.munding[0] + SVÆRD_MÅL.klinge - s.v.greb[0]) * p.sk;
  return klem(Math.asin(klem((p.py - 24) / L, 0, 1)) + 0.25, 0.45, 0.9);
}
function nedVinkel(s, dybde) {
  const p = s.plads, L = (s.v.munding[0] + SVÆRD_MÅL.klinge - s.v.greb[0]) * p.sk;
  const d = (bordBag + (bordY - bordBag) * dybde - p.py) / L;
  return d < 0.97 ? { vinkel: -Math.asin(Math.max(0.05, d)), rammer: true } : { vinkel: -1.2, rammer: false };
}
function tændSværd(s) {
  const v = s.v, k = s.plads.pxMm, farve = sværdFarve(s), [x, y] = tilSkærm(s, v.munding[0], v.munding[1]);
  s.tændt = true;
  fx.lysglimt(x, y, 300 * k, farve, 1, 0.3);
  fx.gnistregn(x, y, -s.ra, 16, 1500 * k, farve);
  fx.lynild(x, y, -s.ra, 260 * k, farve, 4, 0.5, 0.14);
  fx.skærmblink(farve, 0.25, 0.25, true);
  ryst = Math.min(1, ryst + 0.3);
  lyd.sværdTænd(panorering(x)); lyd.sværdBrum(true);
}
function slukSværd(s) {
  if (!s.tændt) return;
  s.tændt = false; s.sving = null;
  lyd.sværdSluk(panorering(tilSkærm(s, s.v.munding[0], 0)[0])); lyd.sværdBrum(false);
}
// Ny farve: klingen slukkes og tændes igen i den næste farve
function skiftFarve(s) {
  if (tid < s.næste) return;
  s.næste = tid + 0.8;
  const ny = () => { s.farveNr++; opdaterLadKnap(s); if (valgt === s) tændSværd(s); };
  if (s.tændt) { slukSværd(s); planlæg(0.4, ny); } else ny();
}
// Klingen rammer bordet: et brændemærke, gnister til alle sider, røg, lys og et ordentligt brag
function sværdRammer(s) {
  const k = s.plads.pxMm, farve = sværdFarve(s), [x, y] = spidsen(s);
  s.ram = [x, y];
  fx.brændemærke(x, y, 75 * k);
  fx.gnistregn(x, y, -Math.PI / 2 - 0.75, 24, 1600 * k, "255,205,120");
  fx.gnistregn(x, y, -Math.PI / 2 + 0.75, 24, 1600 * k, "255,165,70");
  fx.gnistregn(x, y, -Math.PI / 2, 18, 1300 * k, farve);
  fx.lysglimt(x, y, 260 * k, farve, 1, 0.25);
  fx.lysglimt(x, y, 110 * k, "255,140,40", 1, 1.5);   // træet gløder og køler langsomt af
  fx.lynild(x, y, -Math.PI / 2, 150 * k, farve, 4, 1.4, 0.1);
  fx.røgsky(x, y - 6, 30 * k, tilfældig(-20, 20), -70 * k);
  fx.skærmblink(farve, 0.3, 0.16, true);
  fx.skærmblink("255,255,255", 0.12, 0.06);
  ryst = Math.min(2, ryst + 0.7); slag = Math.max(slag, 0.5);
  lyd.sværdSlag(panorering(x));
}
// Mens klingen brænder i bordet, syder det med gnister og røg
function syder(s, dt) {
  const [x, y] = s.ram, k = s.plads.pxMm;
  if (Math.random() < dt * 45) fx.gnistregn(x, y, -Math.PI / 2 + tilfældig(-0.9, 0.9), 3, 1100 * k, Math.random() < 0.5 ? "255,190,100" : sværdFarve(s));
  if (Math.random() < dt * 10) fx.røgsky(x, y - 4, 20 * k, tilfældig(-15, 15), -50 * k);
}
// Hvert billede: klingen kommer frem eller trækker sig ind, sværdet følger svinget, og brummen følger farten
function opdaterSværd(s, dt) {
  s.tænd = klem(s.tænd + (s.tændt ? dt / 0.22 : -dt / 0.3), 0, 1);
  const hvile = 0.06 + 0.025 * Math.sin(tid * 1.7), før = s.ra, sv = s.sving;
  if (!sv) s.ra += (hvile - s.ra) * Math.min(1, dt * 10);
  else {
    sv.t += dt;
    const op = opVinkel(s), ned = sv.mål.vinkel;
    const gå = (fra, til, a, b, kurve) => fra + (til - fra) * kurve(klem((sv.t - a) / (b - a), 0, 1));
    if (!sv.op) {
      // Hug: løft lidt, slå ned i bordet, bliv der et øjeblik, og løft så sværdet tilbage
      if (sv.t < 0.1) s.ra = gå(sv.fra, op * 0.85, 0, 0.1, blødUd);
      else if (sv.t < 0.2) s.ra = gå(op * 0.85, ned, 0.1, 0.2, u => u * u);
      else if (sv.t < 0.34) {
        if (!sv.ramt) { sv.ramt = true; s.ra = ned; if (sv.mål.rammer) sværdRammer(s); }
        s.ra = ned + Math.sin(sv.t * 95) * 0.006;
        if (sv.mål.rammer) syder(s, dt);
      } else if (sv.t < 0.62) s.ra = gå(ned, hvile, 0.34, 0.62, blødUd);
      else s.sving = null;
    } else {
      // Sving op: dyk lidt ned, svip op over hovedet, og kom tilbage
      const lav = ned * 0.4;
      if (sv.t < 0.08) s.ra = gå(sv.fra, lav, 0, 0.08, blødUd);
      else if (sv.t < 0.2) s.ra = gå(lav, op, 0.08, 0.2, blødUd);
      else if (sv.t < 0.26) {
        if (!sv.ramt) { sv.ramt = true; const [x, y] = spidsen(s); fx.gnistregn(x, y, -Math.PI / 2 - s.ra, 10, 900 * s.plads.pxMm, sværdFarve(s)); }
        s.ra = op;
      } else if (sv.t < 0.56) s.ra = gå(op, hvile, 0.26, 0.56, blødUd);
      else s.sving = null;
    }
  }
  s.rva = 0;
  const fart = Math.abs(s.ra - før) / Math.max(dt, 1e-3);
  lyd.sværdFart(s.tænd > 0.5 ? fart / 9 : 0);
  s.spor.push(s.ra); if (s.spor.length > 7) s.spor.shift();
}

// ---------- Ladning: magasinet glider ud og falder, et nyt glider ind ----------
function startLadning(s) {
  if (s.lad || s.patroner === s.v.patroner) return;
  s.lad = { t: 0, trin: 0 };
}
function opdaterLadning(s, dt) {
  const L = s.lad; if (!L) return;
  L.t += dt;
  const v = s.v, laser = v.type === "laser";
  if (!laser && !v.magasin) { opdaterOpladning(s); return; }
  const ud = laser ? 480 : v.magasin.ud;
  const t0 = v.spænder ? 0.25 : 0;   // MP5: ladegrebet trækkes tilbage og låses, før magasinet skiftes
  if (v.spænder && L.t < t0) {
    if (!L.spændt) { L.spændt = true; lyd.mekanik("spænd"); }
    s.spænd = Math.min(1, L.t / 0.15); return;
  }
  if (L.trin === 0) {
    L.trin = 1; s.magV = 0;
    if (laser) slipMagasin(s); else lyd.mekanik("magUd");
  }
  // Magasinet glider ud af brønden (bag våbnet) og bliver så til en ting, der falder ned på bordet
  if (L.trin === 1 && s.magInde && !laser) {
    s.magV += ud * 60 * dt; s.magDY += s.magV * dt;
    if (s.magDY >= ud) slipMagasin(s);
  }
  if (L.trin === 1 && L.t > t0 + 0.55) { L.trin = 2; s.magInde = true; s.magDY = ud; if (laser) s.niveau = 0; }
  if (L.trin === 2) {
    const k = Math.min(1, (L.t - t0 - 0.55) / 0.3);
    s.magDY = ud * (1 - blødUd(k));
    if (k >= 1) { L.trin = 3; lyd.mekanik(laser ? "celleInd" : "magInd"); s.rva -= 0.25; if (laser) lyd.opladning(0.6); }
  }
  if (laser && L.trin === 3) s.niveau = klem((L.t - 0.8) / 0.65, 0, 1);
  if (L.trin === 3 && L.t > t0 + (laser ? 1.5 : 1.05)) {
    L.trin = 4; s.patroner = v.patroner; s.niveau = 1;
    // Slæden eller bundstykket smækker frem — eller ladegrebet slås ned (MP5)
    if (!laser && s.bolt > 0.5) { lyd.mekanik(v.slæde ? "slædeFrem" : "boltFrem"); s.boltT = cyklus(v) * 0.4; s.rvx += 60; }
    if (v.spænder) { lyd.mekanik("slædeFrem"); s.rvx += 80; s.rva -= 0.2; }
    s.lad = null; s.næste = tid + 0.05;
  }
}
// Sci-fi-våben uden magasin lader op (lyset vokser frem igen) — haglgeværet får patronerne trykket i én ad gangen
function opdaterOpladning(s) {
  const L = s.lad, v = s.v;
  if (v.skal) {
    if (L.næste === undefined) { L.næste = 0.25; s.patroner = Math.max(0, s.patroner); }
    if (L.t >= L.næste && s.patroner < v.patroner) { s.patroner++; lyd.mekanik("skal"); L.næste += 0.22; s.rva -= 0.06; }
    if (s.patroner >= v.patroner && L.t >= L.næste) { s.lad = null; pump(s, false); s.næste = tid + 0.35; }
    return;
  }
  if (!L.lyd) { L.lyd = true; lyd.opladning(v.opladning * 0.8); }
  s.niveau = klem(L.t / v.opladning, 0, 1);
  if (L.t >= v.opladning) { s.patroner = v.patroner; s.niveau = 1; s.lad = null; s.næste = tid + 0.05; }
}
// Det tomme magasin (eller den brugte energicelle) falder ned på bordet
function slipMagasin(s) {
  const v = s.v, p = s.plads, laser = v.type === "laser";
  if (laser) lyd.mekanik("celleUd");
  s.magInde = false;
  let billede, b, h, cx, cy, a = -s.ra, vx = tilfældig(-90, -20) * p.pxMm, vy = laser ? 120 : 40;
  if (laser) {
    billede = brugtCelle; b = CELLE_PLADS.b * p.sk; h = CELLE_PLADS.h * p.sk; a += CELLE_PLADS.vinkel;
    [cx, cy] = tilSkærm(s, CELLE_PLADS.x - Math.sin(CELLE_PLADS.vinkel) * CELLE_PLADS.h / 2, CELLE_PLADS.y + Math.cos(CELLE_PLADS.vinkel) * CELLE_PLADS.h / 2);
  } else {
    const m = v.magasin, [ox, oy] = magRetning(m, s.magDY);
    billede = v.magBillede; b = m.b * p.sk; h = m.h * p.sk;
    [cx, cy] = tilSkærm(s, m.x + m.b / 2 + ox, m.y + m.h / 2 + oy);
    vx += -Math.sin(m.vinkel) * s.magV * p.sk; vy = Math.cos(m.vinkel) * s.magV * p.sk;
  }
  fx.smid({ billede, b, h, x: cx, y: cy, vx, vy, a, va: tilfældig(-1.5, 1.5),
    flad: [Math.PI / 2, -Math.PI / 2], gulv: tilfældig(bordBag + 20, bordY - 8), lyd: laser ? "celle" : "magasin", glød: laser ? "60,200,255" : null });
}
// Magasinet glider langs grebet: vinkel 0 = lodret ned, positiv = bunden går bagud
const magRetning = (m, d) => [-Math.sin(m.vinkel || 0) * d, Math.cos(m.vinkel || 0) * d];
function planlæg(om, f) { planlagt.push({ t: tid + om, f }); }
const cyklus = v => v.cyklus || Math.min(0.075, 0.85 / v.kadence);

// ---------- Hvert billede: bevægelse ----------
function opdater(dt) {
  const s = valgt;
  for (let i = planlagt.length - 1; i >= 0; i--) if (tid >= planlagt[i].t) { const f = planlagt[i].f; planlagt.splice(i, 1); f(); }
  if (fingre > 0 && s.v.auto) prøvSkud(s);
  // Rekylen er en fjeder, der trækker våbnet tilbage på plads (i små skridt, så den er stabil)
  const sværd = s.v.type === "sværd";   // lysværdet styrer selv sin vinkel (opdaterSværd)
  for (let n = 0; n < 2; n++) {
    const h = dt / 2;
    s.rvx += (-520 * s.rx - 30 * s.rvx) * h; s.rx += s.rvx * h;
    if (!sværd) { s.rva += (-420 * s.ra - 26 * s.rva) * h; s.ra += s.rva * h; }
  }
  // Bundstykket: smækker tilbage og frem ved hvert skud — og bliver tilbage, når magasinet er tomt
  s.boltT += dt;
  const t = s.boltT / cyklus(s.v);
  s.bolt = t < 0.4 ? t / 0.4 : s.patroner === 0 ? 1 : Math.max(0, 1 - (t - 0.4) / 0.6);
  // Lasergeværet: lyset falmer, varmen forsvinder langsomt, og en lysbølge løber frem mod næste skud
  s.puls *= Math.exp(-dt * 9);
  s.varme = Math.max(0, s.varme - dt * 0.22);
  s.bølge = fingre > 0 && !s.lad ? klem((tid - s.sidsteSkud) * s.v.kadence, 0, 1) : 0;
  if (s.v.type === "laser" && s.varme > 0.55 && Math.random() < dt * 14 * s.varme) damp(s);
  ryst *= Math.exp(-dt * 10);
  slag *= Math.exp(-dt * 11);
  if (!s.lad && s.spænd > 0) s.spænd = Math.max(0, s.spænd - dt * 16);
  // Sci-fi: kløerne lukker sig igen, pumpen glider, energikuglen vokser frem, boblerne stiger
  s.klo = Math.max(0, s.klo - dt * 4.5);
  s.pumpeT += dt;
  s.pumpe = s.pumpeT < 0.1 ? s.pumpeT / 0.1 : s.pumpeT < 0.16 ? 1 : Math.max(0, 1 - (s.pumpeT - 0.16) / 0.1);
  if (s.v.kugle) s.kugleT = s.lad ? Math.min(s.kugleT, s.niveau) : s.patroner > 0 ? Math.min(1, s.kugleT + dt / 0.5) : 0;
  s.boble += dt * (30 + 260 * s.puls);
  knitren(s, dt);
  // Lyddæmperen skrues på eller af
  s.dæmperT = klem(s.dæmperT + (s.dæmper ? dt : -dt) / 0.45, 0, 1);
  blandPlads(s);
  opdaterLadning(s, dt);
  if (sværd) opdaterSværd(s, dt);
  fx.opdater(dt);
}
// Små lyn, der knitrer om gravitonkanonens energikugle og strålepistolens antenne, mens de venter
function knitren(s, dt) {
  const v = s.v; if (!v.skud || s.lad) return;
  const k = s.plads.sk;
  if (v.kugle && s.kugleT > 0.9 && Math.random() < dt * 5) {
    const [x, y] = tilSkærm(s, v.kugle.x, v.kugle.y);
    fx.lynild(x, y, Math.random() * 6.3, v.kugle.r * k * 1.5, v.skud.farve, 1, 0.3, 0.08);
  }
  if (v.antenne && Math.random() < dt * 2) {
    const [x, y] = tilSkærm(s, v.antenne[0], v.antenne[1]);
    fx.lynild(x, y, -Math.PI / 2, 60 * k, v.skud.farve, 1, 0.8, 0.07);
  }
}
// Varm damp fra lasergeværets ventiler
function damp(s) {
  const k = s.plads.pxMm, [x, y] = tilSkærm(s, tilfældig(690, 890), 130);
  fx.røgsky(x, y, 14 * k, tilfældig(-20, 40), -90 * k);
}

// ---------- Hvert billede: tegning ----------
let væg = null, spot = null, bordflade = null, bordfront = null;
function lavBaggrund() {
  væg = ctx.createLinearGradient(0, 0, 0, bordBag);
  væg.addColorStop(0, "#1e2433"); væg.addColorStop(1, "#11141c");
  spot = ctx.createRadialGradient(W / 2, -H * 0.15, 0, W / 2, -H * 0.15, Math.max(W, H) * 0.95);
  spot.addColorStop(0, "rgba(255,236,210,0.17)"); spot.addColorStop(0.5, "rgba(255,236,210,0.05)"); spot.addColorStop(1, "rgba(255,236,210,0)");
  bordflade = ctx.createLinearGradient(0, bordBag, 0, bordY);
  bordflade.addColorStop(0, "#3b2a1d"); bordflade.addColorStop(1, "#6a4a31");
  bordfront = ctx.createLinearGradient(0, bordY, 0, H);
  bordfront.addColorStop(0, "#3a281b"); bordfront.addColorStop(1, "#140d08");
}
function tegnBaggrund() {
  // Væggen: mørke vandrette paneler og en lampe ovenover
  ctx.fillStyle = væg; ctx.fillRect(-30, -30, W + 60, bordBag + 30);
  for (let y = 40; y < bordBag; y += 54) {
    ctx.fillStyle = "rgba(0,0,0,0.32)"; ctx.fillRect(-30, y, W + 60, 3);
    ctx.fillStyle = "rgba(255,255,255,0.035)"; ctx.fillRect(-30, y + 3, W + 60, 1);
  }
  ctx.fillStyle = spot; ctx.fillRect(-30, -30, W + 60, bordBag + 30);
  // Bordet: en træplade set lidt oppefra, med årer og en lys forkant
  ctx.fillStyle = bordflade; ctx.fillRect(-30, bordBag, W + 60, bordY - bordBag);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let i = 1; i < 6; i++) ctx.fillRect(-30, bordBag + (bordY - bordBag) * (i / 6) ** 1.3, W + 60, 1);
  ctx.fillStyle = "rgba(255,210,160,0.35)"; ctx.fillRect(-30, bordY, W + 60, 2);
  ctx.fillStyle = bordfront; ctx.fillRect(-30, bordY + 2, W + 60, H - bordY + 30);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-30, bordBag, W + 60, 2);
}
// Våbnets skygge på bordet
function tegnSkygge(s) {
  const p = s.plads, cx = p.x0 + s.v.b * p.sk * 0.5, cy = bordBag + (bordY - bordBag) * 0.3, rx = s.v.b * p.sk * 0.46, ry = (bordY - bordBag) * 0.35;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(rx / ry, 1);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(-ry, -ry, ry * 2, ry * 2); ctx.restore();
}
function tegnVåben(s) {
  if (s.v.type === "sværd") tegnSværdLys(s);
  ctx.save(); sætVåben(s);
  if (s.v.type === "laser") tegnLaser(s); else if (s.v.type === "sværd") tegnSværd(s); else tegnFoto(s);
  ctx.restore();
}
// Lysværdet: skaftet og klingen (i sværdets egne koordinater)
function tegnSværd(s) {
  const v = s.v, L = SVÆRD_MÅL.klinge * blødUd(s.tænd);
  ctx.drawImage(skaftBillede, 0, 0, SVÆRD_MÅL.skaft, SVÆRD_MÅL.h);
  if (L > 1) tegnKlinge(ctx, v.munding[0], v.munding[1], L, sværdFarve(s), 1 + 0.035 * Math.sin(tid * 53) + tilfældig(-0.02, 0.02));
}
// Lyset fra klingen på væggen og bordet, og et lysende spor, når sværdet svinges (på skærmen, bag sværdet)
function tegnSværdLys(s) {
  if (s.tænd <= 0.01) return;
  const v = s.v, farve = sværdFarve(s), L = SVÆRD_MÅL.klinge * blødUd(s.tænd), a = s.tænd * tilfældig(0.9, 1);
  const [mx, my] = tilSkærm(s, v.munding[0] + L / 2, v.munding[1]);
  ctx.globalCompositeOperation = "lighter";
  const R = Math.max(W, H) * 0.6, g = ctx.createRadialGradient(mx, my, 0, mx, my, R);
  g.addColorStop(0, `rgba(${farve},${0.22 * a})`); g.addColorStop(0.4, `rgba(${farve},${0.07 * a})`); g.addColorStop(1, `rgba(${farve},0)`);
  ctx.fillStyle = g; ctx.fillRect(mx - R, my - R, R * 2, R * 2);
  // Et aflangt skær på bordpladen under klingen
  const by = bordBag + (bordY - bordBag) * 0.45, rb = L * s.plads.sk * 0.6;
  ctx.save(); ctx.translate(mx, by); ctx.scale(1, 0.16);
  const gb = ctx.createRadialGradient(0, 0, 0, 0, 0, rb);
  gb.addColorStop(0, `rgba(${farve},${0.4 * a})`); gb.addColorStop(1, `rgba(${farve},0)`);
  ctx.fillStyle = gb; ctx.fillRect(-rb, -rb, rb * 2, rb * 2); ctx.restore();
  // Sporet: en vifte af lys mellem klingens sidste stillinger (kun når den bevæger sig hurtigt)
  for (let i = 1; i < s.spor.length; i++) {
    const a0 = s.spor[i - 1], a1 = s.spor[i], d = Math.abs(a1 - a0);
    if (d < 0.01) continue;
    const styrke = Math.min(1, d * 7) * 0.55 * i / s.spor.length, u0 = v.munding[0] + 80, u1 = v.munding[0] + L;
    const p1 = tilSkærm(s, u0, v.munding[1], a0), p2 = tilSkærm(s, u1, v.munding[1], a0), p3 = tilSkærm(s, u1, v.munding[1], a1), p4 = tilSkærm(s, u0, v.munding[1], a1);
    const gs = ctx.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
    gs.addColorStop(0, `rgba(${farve},0)`); gs.addColorStop(1, `rgba(${farve},${styrke})`);
    ctx.fillStyle = gs; ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.lineTo(...p4); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}
// Fotovåben: magasinet (bagved, så det glider op i brønden), selve fotoet og patronudkastet ovenpå.
// Når slæden, ladegrebet eller magasinet er flyttet, tegnes fotoet i stykker: først det indvendige
// (løb og fjeder), så rammen uden de løse dele og til sidst de løse dele, hver på sin nye plads.
function tegnFoto(s) {
  const v = s.v, foto = v.billedeEl, m = v.magasin || {};
  const flyt = [];   // [omrids, flyt vandret, drejning, drejepunkt]
  if (v.slæde && s.bolt > 0.003) flyt.push([v.slæde.form, -s.bolt * v.slæde.vandring]);
  if (v.spænder && s.spænd > 0.003) flyt.push([v.spænder.form, -s.spænd * v.spænder.vandring]);
  if (v.pumpe && s.pumpe > 0.003) flyt.push([v.pumpe.form, -s.pumpe * v.pumpe.vandring]);
  if (v.kløer && s.klo > 0.003) for (const k of v.kløer) flyt.push([k.form, 0, k.drej * blødUd(s.klo), k.om]);
  const kugleLille = v.kugle && s.kugleT < 0.999;
  const magLøs = m.form && !(s.magInde && s.magDY < 0.5);
  if (s.magInde && v.magBillede && (m.billede || magLøs)) {
    const [ox, oy] = magRetning(m, s.magDY);
    ctx.drawImage(v.magBillede, m.x + ox, m.y + oy, m.b, m.h);
  }
  if (!flyt.length && !magLøs && !kugleLille) ctx.drawImage(foto, 0, 0, v.b, v.h);
  else {
    tegnIndre(s);
    const ramme = new Path2D(); ramme.rect(-400, -400, v.b + 800, v.h + 800);
    for (const [form] of flyt) ramme.addPath(sti(form));
    if (magLøs) ramme.addPath(sti(m.form));
    if (kugleLille) ramme.addPath(kugleSti(v));
    ctx.save(); ctx.clip(ramme, "evenodd"); ctx.drawImage(foto, 0, 0, v.b, v.h); ctx.restore();
    for (const [form, dx, drej, om] of flyt) {
      ctx.save();
      if (drej) { ctx.translate(om[0], om[1]); ctx.rotate(drej); ctx.translate(-om[0], -om[1]); } else ctx.translate(dx, 0);
      ctx.clip(sti(form)); ctx.drawImage(foto, 0, 0, v.b, v.h); ctx.restore();
    }
    // Energikuglen vokser frem igen mellem kløerne
    if (kugleLille && s.kugleT > 0.01) {
      const { x, y } = v.kugle, t = blødUd(s.kugleT);
      ctx.save(); ctx.translate(x, y); ctx.scale(t, t); ctx.translate(-x, -y);
      ctx.clip(kugleSti(v)); ctx.drawImage(foto, 0, 0, v.b, v.h); ctx.restore();
    }
  }
  if (v.bobler) tegnBobler(s);
  if (v.lys) tegnLys(s);
  if (v.port && s.dæksel) tegnPort(s);
  if (v.lyddæmper && s.dæmperT > 0) tegnDæmper(s);
}
function kugleSti(v) {
  if (!v.kugleSti) { const { x, y, r } = v.kugle; v.kugleSti = new Path2D(); v.kugleSti.arc(x, y, r, 0, Math.PI * 2); }
  return v.kugleSti;
}
// Det selvlysende: hvert sted gløder svagt og blinker op ved skuddet (strålepistolens ringe én efter én)
function tegnLys(s) {
  const v = s.v, farve = v.skud.farve, fyld = s.lad ? (v.skal ? 1 : s.niveau) : s.patroner > 0 ? 1 : 0.15;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  v.lys.forEach(([x, y, rx, ry, bølge], i) => {
    let a = (0.3 + 0.1 * Math.sin(tid * 3.2 + i * 1.7)) * (0.25 + 0.75 * fyld), blus;
    if (bølge) { const d = tid - s.sidsteSkud - bølge * 0.05; blus = Math.exp(-((d / 0.07) ** 2)); } else blus = s.puls;
    a += 1.3 * blus;
    // Ved skuddet bliver gløden både stærkere og større (den "blusser op")
    const k = 1 + blus * 1.1, g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(255,255,255,${Math.min(1, a * 0.5)})`); g.addColorStop(0.18, `rgba(${farve},${Math.min(1, a)})`);
    g.addColorStop(0.5, `rgba(${farve},${Math.min(1, a) * 0.4})`); g.addColorStop(1, `rgba(${farve},0)`);
    ctx.save(); ctx.translate(x, y); ctx.scale(rx * k, ry * k); ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  });
  if (v.kugle && s.kugleT > 0.05) {
    const { x, y, r } = v.kugle, a = (0.5 + 0.15 * Math.sin(tid * 5)) * s.kugleT, g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, `rgba(${farve},${a})`); g.addColorStop(1, `rgba(${farve},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  }
  ctx.restore();
}
// Bobler, der stiger op i glastankene (hurtigere lige efter et skud)
function tegnBobler(s) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(190,255,170,0.45)";
  for (const [x0, y0, x1, y1] of s.v.bobler) {
    const w = x1 - x0, h = y1 - y0;
    for (let i = 0; i < 14; i++) {
      const bx = x0 + ((i * 0.618 + 0.1) % 1) * w + Math.sin(s.boble * 0.05 + i) * 3, by = y1 - ((s.boble * (0.6 + (i % 3) * 0.3) + i * 37) % h);
      ctx.beginPath(); ctx.arc(bx, by, 2.5 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
// En rund stålstang set fra siden (løb, førerstang): mørk forneden, et lyst skær foroven
function stålrør(x0, x1, y, d, lys = 1) {
  const g = ctx.createLinearGradient(0, y - d / 2, 0, y + d / 2);
  g.addColorStop(0, "#17181b"); g.addColorStop(0.22, lys > 0.5 ? "#9a9fa6" : "#5d6168"); g.addColorStop(0.45, "#3c3f44"); g.addColorStop(1, "#08090a");
  ctx.fillStyle = g; ctx.fillRect(x0, y - d / 2, x1 - x0, d);
}
// Det man ser, når slæden er tilbage: den næste patron, løbet og rekylfjederen (der trykkes sammen)
function tegnIndre(s) {
  const v = s.v, o = v.slæde ? s.bolt * v.slæde.vandring : 0;
  if (v.kammer && s.patroner > 0 && s.magInde && s.magDY < 0.5 && s.bolt > 0.3) tegnPatron(v, v.kammer[0], v.kammer[1]);
  for (const d of v.indre || []) {
    if (d.løb) {
      const [x0, x1, y, t] = d.løb;
      stålrør(x0, x1, y, t);
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x1 - t * 0.12, y - t / 2, t * 0.12, t);   // mundingens kant
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x0, y - t / 2, t * 0.1, t);                // kammerets kant
    }
    if (d.fjeder) {
      const [x0, x1, y, t] = d.fjeder, slut = Math.max(x0 + t, x1 - o), n = 16, trin = (slut - x0) / n;
      stålrør(x0, x1, y, t * 0.38, 0);
      ctx.strokeStyle = "#8a8f96"; ctx.lineWidth = t * 0.16; ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = x0 + i * trin; ctx.moveTo(x, y + t / 2); ctx.lineTo(x + trin * 0.6, y - t / 2); }
      ctx.stroke();
    }
  }
  for (const del of [v.spænder, v.pumpe]) if (del?.rør) { const [x0, x1, y, t] = del.rør; stålrør(x0, x1, y, t, 0); }
}
// En patron set fra siden: messinghylster og en kobberkugle forrest
function tegnPatron(v, x, y) {
  const M = fx.hylsterMål(v.hylster), e = 1 / v.mmPrEnhed, l = M.l * e, d = M.d * e, kugle = M.d * 1.05 * e;
  if (hylsterBillede) ctx.drawImage(hylsterBillede.billede, x, y - d / 2, l, d);
  const g = ctx.createLinearGradient(0, y - d / 2, 0, y + d / 2);
  g.addColorStop(0, "#f3b48a"); g.addColorStop(0.35, "#b8653a"); g.addColorStop(1, "#4a2210");
  ctx.fillStyle = g; ctx.beginPath();
  const h = M.hals * e / 2;
  ctx.moveTo(x + l - 1, y - h); ctx.quadraticCurveTo(x + l + kugle * 0.75, y - h, x + l + kugle, y); ctx.quadraticCurveTo(x + l + kugle * 0.75, y + h, x + l - 1, y + h);
  ctx.closePath(); ctx.fill();
}
// Lyddæmperen: en mat sort cylinder, der skrues på mundingen (glider ind fra højre)
function tegnDæmper(s) {
  const v = s.v, e = 1 / v.mmPrEnhed, L = v.lyddæmper.l * e, D = v.lyddæmper.d * e, T = blødUd(s.dæmperT);
  const x = v.munding[0] - 3 + (1 - T) * L * 0.7, y = v.munding[1];
  ctx.save(); ctx.globalAlpha = T;
  const g = ctx.createLinearGradient(0, y - D / 2, 0, y + D / 2);
  g.addColorStop(0, "#0d0e10"); g.addColorStop(0.2, "#5d6168"); g.addColorStop(0.32, "#34373c"); g.addColorStop(0.75, "#16171a"); g.addColorStop(1, "#060607");
  // Gevindstykket bagerst er lidt smallere, med riller
  ctx.fillStyle = g; ctx.fillRect(x, y - D * 0.36, L * 0.1, D * 0.72);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let i = 1; i < 5; i++) ctx.fillRect(x + L * 0.02 * i, y - D * 0.36, Math.max(1, L * 0.005), D * 0.72);
  // Selve røret med afrundede ender og to tynde ringe
  const rx = x + L * 0.09, rb = L * 0.91, r = D * 0.18;
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(rx, y - D / 2); ctx.arcTo(rx + rb, y - D / 2, rx + rb, y + D / 2, r);
  ctx.arcTo(rx + rb, y + D / 2, rx, y + D / 2, r); ctx.lineTo(rx, y + D / 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x + L * 0.2, y - D / 2, Math.max(1, L * 0.008), D); ctx.fillRect(x + L * 0.88, y - D / 2, Math.max(1, L * 0.008), D);
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(x + L * 0.1, y - D * 0.32, L * 0.88, D * 0.08);
  ctx.restore();
}
// Magasinet som eget billede: fotoets bundplade (eller hele magasinet) og den skjulte krop, der sidder inde i grebet
function lavMagasin(v, p) {
  const m = v.magasin;
  if (m.billede) { v.magBillede = v.magFoto; m.b = v.magFoto.naturalWidth; m.h = v.magFoto.naturalHeight; return; }
  const pkt = [...m.form];
  if (m.krop) {
    const { x, y, b, l } = m.krop, a = m.vinkel, op = [Math.sin(a), -Math.cos(a)], tvær = [Math.cos(a), Math.sin(a)];
    for (const [u, n] of [[0, -0.5], [0, 0.5], [l, -0.5], [l, 0.5]]) pkt.push([x + op[0] * u + tvær[0] * n * b, y + op[1] * u + tvær[1] * n * b]);
  }
  const xs = pkt.map(q => q[0]), ys = pkt.map(q => q[1]);
  m.x = Math.floor(Math.min(...xs)) - 2; m.y = Math.floor(Math.min(...ys)) - 2;
  m.b = Math.ceil(Math.max(...xs)) + 2 - m.x; m.h = Math.ceil(Math.max(...ys)) + 2 - m.y;
  const q = Math.min(1, p.sk * dpr * 1.15), c = document.createElement("canvas");
  c.width = Math.ceil(m.b * q); c.height = Math.ceil(m.h * q);
  const g = c.getContext("2d"); g.scale(q, q); g.translate(-m.x, -m.y);
  if (m.krop) tegnMagasinKrop(g, m);
  g.save(); g.clip(sti(m.form)); g.drawImage(v.billedeEl, 0, 0, v.b, v.h); g.restore();
  v.magBillede = c;
}
// Pistolmagasinets krop: sort plast (Glock) eller blånet stål, med huller til at tælle patronerne
function tegnMagasinKrop(g, m) {
  const { x, y, b, l, farve } = m.krop;
  g.save(); g.translate(x, y); g.rotate(m.vinkel);
  const lg = g.createLinearGradient(-b / 2, 0, b / 2, 0);
  const f = farve === "plast" ? ["#0b0b0c", "#2c2d30", "#18191b", "#060607"] : ["#1a1c20", "#727780", "#3a3d43", "#0e0f11"];
  lg.addColorStop(0, f[0]); lg.addColorStop(0.3, f[1]); lg.addColorStop(0.62, f[2]); lg.addColorStop(1, f[3]);
  g.fillStyle = lg; g.fillRect(-b / 2, -l, b, l + 6);
  g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(-b / 2, -l, b, 4);                       // læberne foroven
  g.fillStyle = "rgba(0,0,0,0.75)";
  for (let i = 1; i < 7; i++) { g.beginPath(); g.arc(-b * 0.28, -l + i * l / 7.5, b * 0.045, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
// Patronudkastet: støvdækslet er sprunget op, og man ser bundstykket smække frem og tilbage
function tegnPort(s) {
  const v = s.v, { x, y, b, h, dæksel: [dx, dy, db, dh], hængsel } = v.port;
  // Støvdækslet er klappet ned om hængslet (fotoets eget dæksel, spejlet) og hænger under åbningen
  ctx.save(); ctx.translate(0, hængsel + dh); ctx.scale(1, -1);
  ctx.drawImage(v.billedeEl, dx, dy, db, dh, dx, 0, db, dh);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(dx, 0, db, dh);
  ctx.restore();
  // Selve åbningen: mørk, med skygge foroven og en lys kant forneden
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, b, h); ctx.clip();
  ctx.fillStyle = "#090909"; ctx.fillRect(x, y, b, h);
  // Den næste patron i magasinet ses, når bundstykket er tilbage (messing med en kobberkugle forrest)
  if (s.bolt > 0.25 && s.patroner > 0 && s.magInde && s.magDY < 5) {
    const py = y + h - 12, g = ctx.createLinearGradient(0, py, 0, py + 20);
    g.addColorStop(0, "#fae29a"); g.addColorStop(0.35, "#c99439"); g.addColorStop(1, "#5c3e10");
    ctx.fillStyle = g; ctx.fillRect(x + b * 0.18, py, b * 0.5, 20);
    const k = ctx.createLinearGradient(0, py, 0, py + 20);
    k.addColorStop(0, "#f3b48a"); k.addColorStop(0.4, "#b8653a"); k.addColorStop(1, "#4a2210");
    ctx.fillStyle = k; ctx.beginPath(); ctx.moveTo(x + b * 0.68, py); ctx.lineTo(x + b * 0.8, py + 3); ctx.lineTo(x + b * 0.9, py + 10); ctx.lineTo(x + b * 0.68, py + 20); ctx.fill();
  }
  // Bundstykket: en rund stålcylinder (lys stribe foroven) med bundstykkehovedet forrest
  const bx = x - s.bolt * b * 0.82, by = y + 3, bh = h - 5;
  const g = ctx.createLinearGradient(0, by, 0, by + bh);
  g.addColorStop(0, "#55585d"); g.addColorStop(0.22, "#c7cace"); g.addColorStop(0.45, "#80848a"); g.addColorStop(1, "#26282b");
  ctx.fillStyle = g; ctx.fillRect(bx, by, b - 16, bh);
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(bx + 10, by + bh * 0.62, b * 0.55, 3);       // rille
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx + b - 18, by, 3, bh);                       // samling til hovedet
  ctx.fillStyle = g; ctx.fillRect(bx + b - 15, by + 4, 15, bh - 8);                             // bundstykkehovedet
  ctx.fillStyle = "#1c1d1f"; ctx.fillRect(bx + b - 8, by + 4, 4, 6);                              // udtrækkerkloen
  // Skygge foroven i åbningen
  const sk = ctx.createLinearGradient(0, y, 0, y + 9);
  sk.addColorStop(0, "rgba(0,0,0,0.85)"); sk.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sk; ctx.fillRect(x, y, b, 9);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 2, y + h + 0.5); ctx.lineTo(x + b - 2, y + h + 0.5); ctx.stroke();
}
// Lasergeværet: energicellen (under rammen), det faste billede og alt det, der lyser
function tegnLaser(s) {
  if (s.magInde) {
    ctx.save(); ctx.translate(CELLE_PLADS.x, CELLE_PLADS.y + s.magDY); ctx.rotate(CELLE_PLADS.vinkel);
    tegnCelle(ctx, celleBillede, s.niveau); ctx.restore();
  }
  ctx.drawImage(laserBillede, 0, 0, LASER_MÅL.b, LASER_MÅL.h);
  tegnLaserLys(ctx, { puls: s.puls, bølge: s.bølge, varme: s.varme, tal: s.patroner, niveau: s.niveau, tid });
}
function tegn() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rx = (Math.random() - 0.5) * 9 * ryst, ry = (Math.random() - 0.5) * 9 * ryst;
  ctx.translate(rx, ry);
  if (slag > 0.002) { const z = 1 + 0.05 * slag; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); }
  tegnBaggrund();
  tegnSkygge(valgt);
  fx.tegnBord(ctx);
  tegnVåben(valgt);
  fx.tegnForan(ctx, W);
}

// ---------- Løkken ----------
function trin(nu) {
  const dt = Math.min(0.05, (nu - sidst) / 1000 || 0); sidst = nu; tid += dt;
  if (valgt) { opdater(dt); tegn(); }
  requestAnimationFrame(trin);
}

// ---------- Vælg våben ----------
// Fotoet hentes, når våbnet vælges; det forrige våbens billeder slippes, så kun ét ligger i hukommelsen
let ønsket = null;
async function vælg(id) {
  const v = VÅBEN.find(w => w.id === id);
  ønsket = id;
  document.querySelectorAll(".våben-knap").forEach(k => k.classList.toggle("valgt", k.dataset.id === id));
  if (v.type === "foto" && !v.billedeEl) {
    try { await hentVåben(v); } catch { return; }
    if (ønsket !== id) return;
  }
  if (valgt && valgt.v !== v) { slipVåben(valgt.v); if (valgt.v.type === "sværd") lyd.sværdBrum(false); }
  let s = tilstande.get(id);
  if (!s) { s = nyTilstand(v); tilstande.set(id, s); }
  valgt = s; planlagt.length = 0; s.magV = 0;
  if (s.lad && s.lad.trin === 1 && s.magInde) { s.magInde = false; }   // et magasin, der var på vej ud, er faldet
  forbered(s);
  const dk = $("dæmperKnap");
  dk.hidden = !v.lyddæmper; dk.setAttribute("aria-pressed", String(!!s.dæmper));
  if (v.type === "sværd" && s.tændt) lyd.sværdBrum(true);
  opdaterLadKnap(s);
}
// For lysværdet skifter ladeknappen farve på klingen — og får selv klingens farve
function opdaterLadKnap(s) {
  const k = $("ladKnap"), sværd = s.v.type === "sværd";
  k.setAttribute("aria-label", sværd ? "Skift farve" : "Skift magasin");
  k.style.color = sværd ? `rgb(${sværdFarve(s)})` : "";
}
// Små billeder af våbnene til knapperne nederst
function lavIkon(v) {
  const B = 264, Hh = 192, c = document.createElement("canvas"); c.width = B; c.height = Hh;
  const g = c.getContext("2d");
  const bg = g.createRadialGradient(B / 2, Hh * 0.45, 10, B / 2, Hh * 0.45, B * 0.7);
  bg.addColorStop(0, "#c3c9dc"); bg.addColorStop(0.55, "#7f87a6"); bg.addColorStop(1, "#2c2a44");
  g.fillStyle = bg; g.fillRect(0, 0, B, Hh);
  if (v.type === "sværd") {
    // Lysværdet står på skrå over en mørk baggrund, så klingen lyser
    const mørk = g.createRadialGradient(B / 2, Hh * 0.45, 10, B / 2, Hh * 0.45, B * 0.7);
    mørk.addColorStop(0, "#3a4566"); mørk.addColorStop(1, "#0e111a");
    g.fillStyle = mørk; g.fillRect(0, 0, B, Hh);
    const k = 290 / v.b;
    g.translate(B / 2, Hh * 0.44); g.rotate(-0.42); g.scale(k, k); g.translate(-v.b / 2, -v.h / 2);
    g.drawImage(lavSkaft(k * 2), 0, 0, SVÆRD_MÅL.skaft, SVÆRD_MÅL.h);
    tegnKlinge(g, v.munding[0], v.munding[1], SVÆRD_MÅL.klinge - 30, SVÆRD_FARVER[0], 1.3);
    return c.toDataURL("image/jpeg", 0.88);
  }
  const sk = Math.min(B * 0.9 / v.b, Hh * 0.7 / v.h);
  g.translate((B - v.b * sk) / 2, (Hh * 0.86 - v.h * sk) / 2); g.scale(sk, sk);
  if (v.type === "laser") {
    const k = sk;
    g.save(); g.translate(CELLE_PLADS.x, CELLE_PLADS.y); g.rotate(CELLE_PLADS.vinkel); tegnCelle(g, lavCelle(k * 2), 1); g.restore();
    g.drawImage(lavLaserBillede(k * 2), 0, 0, LASER_MÅL.b, LASER_MÅL.h);
    tegnLaserLys(g, { puls: 0.2, bølge: 0, varme: 0, tal: v.patroner, niveau: 1, tid: 0 });
  } else {
    if (v.magFoto) g.drawImage(v.magFoto, v.magasin.x, v.magasin.y);
    g.drawImage(v.billedeEl, 0, 0, v.b, v.h);
  }
  return c.toDataURL("image/jpeg", 0.88);
}
// Knapperne laves med det samme; deres små billeder tegnes bagefter, ét våben ad gangen
async function lavKnapper() {
  const bar = $("våbenbar"), ikoner = [];
  for (const v of VÅBEN) {
    const k = document.createElement("button");
    k.className = "våben-knap"; k.type = "button"; k.dataset.id = v.id; k.setAttribute("aria-label", v.navn);
    const img = document.createElement("img"); img.alt = "";
    const navn = document.createElement("span"); navn.textContent = v.navn;
    k.append(img, navn);
    k.addEventListener("click", () => { lyd.start(); if (ønsket !== v.id) vælg(v.id); });
    bar.append(k); ikoner.push([v, img]);
  }
  for (const [v, img] of ikoner) {
    const lånt = v.type === "foto" && !v.billedeEl;
    try { if (lånt) await hentVåben(v); img.src = lavIkon(v); } catch { /* billedet kunne ikke hentes — knappen virker stadig */ }
    if (lånt && ønsket !== v.id) slipVåben(v);
  }
}

// ---------- Fingre og knapper ----------
function skjulTip() { $("tip").classList.remove("vis"); }
// Hver finger huskes for sig, så det kun er den finger, der løftes, der holder op med at skyde
const nede = new Set();
lærred.addEventListener("pointerdown", e => {
  e.preventDefault(); lyd.start(); skjulTip();
  nede.add(e.pointerId); fingre = nede.size;
  if (valgt) prøvSkud(valgt);
});
const slip = e => { nede.delete(e.pointerId); fingre = nede.size; };
window.addEventListener("pointerup", slip);
window.addEventListener("pointercancel", slip);
lærred.addEventListener("contextmenu", e => e.preventDefault());
// Når appen lægges væk, holder lysværdet op med at brumme (og begynder igen, når den kommer frem)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { nede.clear(); fingre = 0; }
  if (valgt?.v.type === "sværd" && valgt.tændt) lyd.sværdBrum(!document.hidden);
});
$("ladKnap").addEventListener("click", () => {
  lyd.start(); if (!valgt) return;
  if (valgt.v.type === "sværd") skiftFarve(valgt); else startLadning(valgt);
});
$("dæmperKnap").addEventListener("click", () => {
  lyd.start(); const s = valgt; if (!s?.v.lyddæmper) return;
  s.dæmper = !s.dæmper; lyd.mekanik(s.dæmper ? "dæmperPå" : "dæmperAf");
  $("dæmperKnap").setAttribute("aria-pressed", String(s.dæmper));
});
$("lyd").addEventListener("click", () => {
  lyd.sætLyd(!lyd.lydErTændt()); $("lyd").textContent = lyd.lydErTændt() ? "🔊" : "🔇";
  $("lyd").setAttribute("aria-pressed", String(lyd.lydErTændt()));
});
fx.sætVedLanding((slags, styrke, x) => lyd.lander(slags, styrke, panorering(x)));
fx.sætVedNedslag((x, y, farve, r) => nedslag(x, y, farve, r));
window.addEventListener("resize", tilpas);

// ---------- Start ----------
async function start() {
  await hentVåben(VÅBEN[0]);
  tilpas();
  await vælg(VÅBEN[0].id);
  $("henter").hidden = true;
  setTimeout(() => { if (fingre === 0) $("tip").classList.add("vis"); }, 900);
  requestAnimationFrame(t => { sidst = t; requestAnimationFrame(trin); });
  if (new URLSearchParams(location.search).has("prøve")) window.spil = { tilstande, get valgt() { return valgt; }, vælg, skyd, prøvSkud, skiftFarve, startLadning, fx, tilSkærm, placer, trin1: dt => { tid += dt; opdater(dt); tegn(); } };
  lavKnapper();
}
start();
