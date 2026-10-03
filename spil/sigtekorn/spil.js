// ===== Sigtekorn: et 3D-skydespil til de voksne, i stil med Counter-Strike =====
// Holdkamp mod bots i ørkenbyen Støvbyen. Fysikken kører med fast tick (128 i sekundet), så bevægelser
// og skud føles ens hver gang — og man kan blive god til det: stå stille, når du skyder, modstyr,
// træk musen imod rekylen, og sigt efter hovedet.
//  bevaegelse.js  bevægelsen (Source-fysik)     vaaben.js  våbnene, spredning og rekyl
//  bane.js        Støvbyen og vej-nettet          bots.js    botterne
//  haand.js       våbnet i hånden                 effekter.js skudhuller, støv og lysspor
//  lyd.js         lydene                           hud.js     skærmen og statistikken     ../laas.js  koden
//  lys.js         lyset, der er bagt i Blender     teksturer.js  fotos og tegnede teksturer
//  leddeloes.js   de leddeløse soldater          dele.js     hoveder, arme og ben, der flyver af
//  katalog.js     alle våben, knive, granater og baner          udrustning.js  menuen, hvor man vælger dem
//  projektiler.js raketter, pile og granater

import * as THREE from "./three.js";
import { lås } from "../laas.js";
import { lavTeksturer } from "./teksturer.js";
import { Kasseverden } from "./verden.js";
import { lavBane, START } from "./bane.js";
import { hentLys, himmelMiljø } from "./lys.js";
import { deleTrin, deleTegn, ryddDele } from "./dele.js";
import { nyAktør, bevæg, øjeHøjde, TICK, U } from "./bevaegelse.js";
import { VÅBEN, nytVåben, aftrækker, efterSkud, opdaterVåben, skudRetning, synligRekyl, retningsvektor, genlad, unøjagtighed, skade } from "./vaaben.js";
import { SJÆLDEN } from "./katalog.js";
import { lavUdrustning, retUdrustning } from "./udrustning.js";
import { Projektiler } from "./projektiler.js";
import { Hånd } from "./haand.js";
import { Effekter } from "./effekter.js";
import { Bot, SVÆRHED, NAVNE, træfKrop, vinkel, hentSoldat } from "./bots.js";
import { Figur, harLeddeløs } from "./leddeloes.js";
import * as Lyd from "./lyd.js";
import { Hud, læsStatistik, gemStatistik, statistikTekst } from "./hud.js";

const $ = id => document.getElementById(id);
const G = Math.PI / 180;
const HOLD = { ræve: "Ørkenrævene", slanger: "Sandslangerne" };
const MÅL = 50, KAMPTID = 600;                                    // første hold til 50 drab — eller den, der fører efter 10 minutter

// ---------- Kun til computer, og kun med koden ----------
if (!matchMedia("(pointer: fine)").matches) { $("kunPc").classList.remove("skjult"); throw new Error("Sigtekorn kræver mus og tastatur"); }
await lås($("lås"));

// ---------- Indstillinger (gemmes på computeren) ----------
const INDST = "sigtekorn-indstillinger";
const ind = Object.assign({ sværhed: "normal", hold: 5, følsomhed: 2.0, synsfelt: 90, lydstyrke: 0.8, fart: false, fuldskærm: true, egneLemmer: true },
  (() => { try { return JSON.parse(localStorage.getItem(INDST) || "{}"); } catch (_) { return {}; } })());
if (ind.primær && !ind.udrustning) ind.udrustning = { primær: ind.primær === "gevær" ? "storm" : ind.primær };   // fra før udrustningen
delete ind.primær;
ind.udrustning = retUdrustning(ind.udrustning);
const gemIndst = () => { try { localStorage.setItem(INDST, JSON.stringify(ind)); } catch (_) {} };
Lyd.sætLydstyrke(ind.lydstyrke);

// ---------- 3D: renderer, lys, himmel ----------
const lærred = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas: lærred, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8c6a4, 80, 230);
const kamera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.03, 700);
kamera.rotation.order = "YXZ";
const solRet = new THREE.Vector3(0.55, 0.78, 0.3).normalize();
const sol = new THREE.DirectionalLight(0xfff0d8, 3.1);
sol.position.copy(solRet).multiplyScalar(120); sol.target.position.set(0, 0, 0);
sol.castShadow = true; sol.shadow.mapSize.set(4096, 4096);
Object.assign(sol.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 280 });
sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.035;
scene.add(sol, sol.target);
const himmelLys = new THREE.HemisphereLight(0xd8e4f2, 0xb8905e, 1.15);   // bruges kun, hvis lyset fra Blender mangler
scene.add(himmelLys);
// himlen: en stor kugle med blå top, lys horisont og en sol
const himmel = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x3a78c8) }, midt: { value: new THREE.Color(0x8fbce8) }, bund: { value: new THREE.Color(0xf0dcbc) }, sol: { value: solRet } },
  vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 top; uniform vec3 midt; uniform vec3 bund; uniform vec3 sol; varying vec3 vP;
    void main(){ float h = clamp(vP.y, -0.2, 1.0); vec3 c = mix(bund, midt, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.22, 0.9, h));
      float s = max(dot(normalize(vP), sol), 0.0); c += vec3(1.0, 0.92, 0.75) * pow(s, 900.0) * 6.0 + vec3(1.0, 0.85, 0.6) * pow(s, 10.0) * 0.22;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
himmel.renderOrder = -1; scene.add(himmel);

// ---------- Banen, effekterne, hånden og skærmen ----------
const t = await lavTeksturer();
const verden = new Kasseverden();
const bane = lavBane(scene, verden, t);
if (await hentLys(bane.masker)) {                                 // lyset fra Blender: himlen og det tilbagekastede lys
  scene.remove(himmelLys);
  scene.environment = himmelMiljø(renderer, himmel);
  scene.add(new THREE.AmbientLight(0xe6dccb, 0.2));               // lidt lys overalt, så selv de mørkeste kroge ikke er helt sorte
}
await hentSoldat();                                               // de leddeløse soldater fra Blender (ellers klodssoldaten)
const effekter = new Effekter(scene, t);
const hånd = new Hånd(t);
hånd.lavMiljø(renderer);
const hud = new Hud();
let stat = læsStatistik();
const projektiler = new Projektiler({
  scene, verden, effekter, lyd: Lyd, kampfolk: () => kampfolk, nu: () => tid,
  træf: (k, o, r, maks) => træfKæmper(k, o, r, maks),
  kugle: (skytte, offer, h, v, afstand, r) => træfOffer(skytte, offer, h.del, h.lem, v, afstand, r, null),
  skad: (offer, s, skytte, skud, navn, hoved) => skadFra(offer, s, skytte, skud, navn, hoved),
  blænd: pos => blænd(pos),
  ryst: (pos, styrke) => { const d = pos.distanceTo(kamera.position); if (d < 25) slag = Math.min(1.4, slag + styrke * (1 - d / 25)); },
}, t);

// ---------- Spilleren ----------
// Spilleren er også leddeløs: en usynlig figur følger med, så botterne kan skyde dine arme, ben og hoved af
const spillerFig = harLeddeløs() ? new Figur("ræve") : null;
if (spillerFig) { spillerFig.model.visible = false; scene.add(spillerFig.model); }
const egneLemmer = () => spillerFig && ind.egneLemmer;
const spiller = { navn: "Dig", hold: "ræve", erSpiller: true, liv: 100, panser: 100, død: false, drab: 0, dødsfald: 0, hoveder: 0, a: nyAktør(0, 0.01, 47) };
let våbenSæt = {}, aktivt = "storm", forrige = "pistol", dødTid = 0, beskyttet = 0, stime = 0, trinVej = 0, slag = 0, slagYaw = 0;
// Udrustningen: plads 1 hovedvåben, 2 pistol, 3 nærkamp og 4 granaterne
function udrust() {
  const u = ind.udrustning;
  våbenSæt = {};
  for (const id of [u.primær, u.sekundær, u.kniv, ...u.granater.map(g => `granat_${g}`), "ingen"]) våbenSæt[id] = nytVåben(id);
  aktivt = u.primær; forrige = u.sekundær;
  hånd.forbered(Object.keys(våbenSæt));
  hånd.vis(aktivt, VÅBEN[aktivt].træk);
}
const vb = () => våbenSæt[aktivt];
// Start (eller start igen) det sted i Ørkenrævenes start, der er længst fra fjenderne
function genopstå() {
  let bedst = START.ræve[0], bd = -1;
  for (const [x, z] of START.ræve) {
    const d = Math.min(...bots.filter(b => b.hold !== spiller.hold && !b.død).map(b => Math.hypot(b.a.pos.x - x, b.a.pos.z - z)), 999);
    if (d > bd) { bd = d; bedst = [x, z]; }
  }
  spiller.a = nyAktør(bedst[0], 0.01, bedst[1], 0);
  spiller.liv = 100; spiller.panser = 100; spiller.død = false; beskyttet = 1.5;
  spillerFig?.nulstil();
  udrust(); hud.død(""); hud.kikkert(false);
}

// ---------- Botterne ----------
let sidsteDelLyd = -1;
let bots = [], kampfolk = [], point = { ræve: 0, slanger: 0 }, tid = 0, kampSlut = KAMPTID, iGang = false, pause = true;
const botSpil = {
  scene, verden, knuder: bane.knuder, kampfolk: () => kampfolk, nu: () => tid, sværhed: () => SVÆRHED[ind.sværhed],
  skyd: (bot, o, ret, v) => skyd(bot, o, ret, v),
  røgBlokerer: (a, b) => projektiler.røgBlokerer(a, b),
  kast: (bot, type, o, fart) => projektiler.granat(type, bot, o, fart),  // botterne kaster også granater
  delLyd: (pos, fart) => {                                         // en løs del rammer jorden (ikke for mange lyde på én gang)
    if (fart < 1.2 || tid - sidsteDelLyd < 0.04 || pos.distanceTo(kamera.position) > 40) return;
    sidsteDelLyd = tid; Lyd.dunk(pos, Math.min(1, fart / 6));
  },
  trin: bot => {                                                   // en bot løber: man kan høre den — og det kan de andre botter også
    if (bot.a.pos.distanceTo(spiller.a.pos) < 30) Lyd.trin(bot.a.pos, 1.2);
    for (const b of bots) if (b !== bot && b.a.pos.distanceTo(bot.a.pos) < 14) b.hør(bot.a.pos, bot);
  },
};
// Små grønne pile over ens holdkammerater, så man ikke skyder efter dem
const pilTekstur = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#7dff6a"; g.strokeStyle = "#0a2a0a"; g.lineWidth = 4; g.beginPath(); g.moveTo(10, 14); g.lineTo(54, 14); g.lineTo(32, 50); g.closePath(); g.fill(); g.stroke(); return new THREE.CanvasTexture(c); })();
function lavBots() {
  for (const b of bots) scene.remove(b.model);
  ryddDele(); effekter.ryd(); projektiler.ryd();
  const navne = [...NAVNE].sort(() => Math.random() - 0.5);
  bots = [];
  for (let i = 0; i < ind.hold - 1; i++) bots.push(new Bot(botSpil, "ræve", navne.pop()));
  for (let i = 0; i < ind.hold; i++) bots.push(new Bot(botSpil, "slanger", navne.pop()));
  for (const b of bots) if (b.hold === spiller.hold) {
    const pil = new THREE.Sprite(new THREE.SpriteMaterial({ map: pilTekstur, depthTest: false, transparent: true })); pil.scale.setScalar(0.32); pil.position.y = 2.25; pil.renderOrder = 5;
    b.model.add(pil);
  }
  kampfolk = [spiller, ...bots];
}

// ---------- Skud (fælles for spilleren og botterne) ----------
const KRAFT = { gevær: 4.2, mp: 3.2, hagl: 2.4, snig: 8, tung: 4.5, special: 5, pistol: 3, kniv: 2 };   // hvor hårdt et skud skubber (m/s)
const tmpR = new THREE.Vector3(), tmpS = new THREE.Vector3(), tmpM = new THREE.Vector3();
// Rammer strålen en kæmper? (botterne og spilleren rammes på de enkelte dele)
function træfKæmper(k, o, r, maks) {
  if (!k.erSpiller) return k.træf(o, r, maks);
  return egneLemmer() && !spiller.død ? spillerFig.træf(o, r, maks) : træfKrop(k.a, o, r, maks);
}
// Et skud med et våben: en kugle — eller mange hagl, en raket eller en pil
function skyd(skytte, o, ret, v) {
  const d = v.d;
  if (d.projektil) {
    const r = retningsvektor(ret.yaw, ret.pitch, new THREE.Vector3());
    d.projektil === "raket" ? projektiler.raket(skytte, o, r, v) : projektiler.pil(skytte, o, r, v);
  } else {
    let ramte = null;
    for (let i = 0; i < (d.hagl || 1); i++) {
      let rt = ret;
      if (d.hagl) { const vv = Math.random() * Math.PI * 2, a = Math.sqrt(Math.random()) * d.haglSpred; rt = { yaw: ret.yaw + Math.cos(vv) * a, pitch: ret.pitch + Math.sin(vv) * a }; }
      const h = kugle(skytte, o, rt, v, i === 0 || Math.random() < 0.3);
      if (h && (!ramte || h.dræbt || h.hoved)) ramte = h;
    }
    if (ramte && skytte === spiller) { hud.ramt(ramte.hoved, ramte.dræbt); Lyd.ramt(ramte.hoved); stat.træf++; }
  }
  if (skytte !== spiller) Lyd.skud(d, o);
  const hørt = d.lydløs ? 9 : 45;                                  // botterne hører skuddet (lydpotten: kun tæt på)
  for (const b of bots) if (b !== skytte && b.a.pos.distanceTo(o) < hørt) b.hør(o, skytte);
}
// Én kugle (eller ét hagl): hvad rammer den først — en mur eller en kæmper?
function kugle(skytte, o, ret, v, spor) {
  const r = retningsvektor(ret.yaw, ret.pitch, tmpR.clone());
  const væg = verden.stråle(o, r, 300);
  let maks = væg ? væg.t : 300, ramt = null;
  for (const k of kampfolk) {
    if (k === skytte || k.død || k.hold === skytte.hold) continue;
    const h = træfKæmper(k, o, r, maks);
    if (h) { maks = h.t; ramt = { k, del: h.del, lem: h.lem }; }
  }
  const slut = tmpS.copy(o).addScaledVector(r, maks).clone();
  // lysspor fra mundingen (spilleren: fra våbnet i hånden)
  if (spor) {
    if (skytte === spiller) { if (Math.random() < 0.6) effekter.sporFra(hånd.munding(kamera, tmpM), slut); }
    else effekter.sporFra(o.clone().addScaledVector(r, 0.7).add(new THREE.Vector3(0, -0.15, 0)), slut);
  }
  if (ramt) return { hoved: ramt.del === "hoved", dræbt: træfOffer(skytte, ramt.k, ramt.del, ramt.lem, v, maks, r, slut) };
  if (væg) {
    effekter.hul(slut, væg.normal); effekter.nedslag(slut, væg.normal, væg.kasse.mat, v.d.hagl ? 0.4 : 1);
    if (skytte !== spiller && slut.distanceTo(kamera.position) < 3) Lyd.nærSkud(slut);
  }
  return null;
}
// En kugle eller pil rammer en kæmper: skade, blod — og måske flyver en arm, et ben eller hovedet af
function træfOffer(skytte, offer, del, lem, v, afstand, r, punkt) {
  const s = skade(v, del, offer, afstand), hoved = del === "hoved";
  if (punkt) effekter.blod(punkt, r, verden, hoved ? 1.4 : 1);
  const skud = { r: r.clone(), del, lem, kraft: (KRAFT[v.d.klasse] || 3) * (hoved ? 1.25 : 1) };
  const dræbt = offer === spiller ? spillerRamt(s, skytte, skud) : offer.ramt(s, skytte, skud);
  if (dræbt) drab(skytte, offer, v, hoved);
  return dræbt;
}
// Skade fra en eksplosion (eller andet uden kugle)
function skadFra(offer, s, skytte, skud, navn, hoved = false) {
  if (offer.død) return false;
  const dræbt = offer === spiller ? spillerRamt(s, skytte, skud) : offer.ramt(s, skytte, skud);
  if (skytte === spiller && offer !== spiller) { hud.ramt(hoved, dræbt); Lyd.ramt(hoved); }
  if (dræbt) drab(skytte, offer, { d: { navn } }, hoved);
  return dræbt;
}
// Spilleren blev ramt
function spillerRamt(s, fra, skud = null) {
  if (beskyttet > 0 || spiller.død) return false;
  spiller.liv -= s.liv; spiller.panser = Math.max(0, spiller.panser - s.panser);
  if (egneLemmer() && skud?.lem === "hoved" && !skud.kniv) spiller.liv = 0;               // skudt i hovedet: hovedet flyver af
  else if (egneLemmer() && skud?.lem && skud.lem !== "hoved" && spiller.liv > 0) spillerMister(skud.lem, skud);
  hud.skadeFra(vinkel(Math.atan2(-(fra.a.pos.x - spiller.a.pos.x), -(fra.a.pos.z - spiller.a.pos.z)) - spiller.a.yaw));
  Lyd.såret(); slag = Math.min(1, slag + 0.5); slagYaw = (Math.random() - 0.5) * 0.02;
  if (spiller.liv > 0) return false;
  spiller.død = true; spiller.dødsfald++; dødTid = tid; stime = 0; stat.død++;
  if (egneLemmer()) spillerFig.falder(skud, scene, verden, new THREE.Vector3(spiller.a.vel.x, 0, spiller.a.vel.z), botSpil.delLyd);   // du falder fra hinanden
  hud.død(`Du blev ramt af <b class="${fra.hold}">${fra.navn}</b> · tilbage om 3`); hud.kikkert(false);
  return true;
}
// Spilleren mister en arm (så kun pistol, kniv og granater — uden arme ingenting) eller et ben (så kravler man)
function spillerMister(lem, skud) {
  spillerFig.skydAf(lem, skud, scene, verden, new THREE.Vector3(spiller.a.vel.x, 0, spiller.a.vel.z), botSpil.delLyd);
  if (lem.startsWith("ben")) { spiller.a.kravl = true; hud.besked("Du mistede et ben — nu må du kravle!", 2200); return; }
  if (!spillerFig.harArm()) { hud.besked("Ingen arme tilbage…", 2200); skiftVåben("ingen"); return; }
  hud.besked("Du mistede en arm — kun pistol, kniv og granater nu", 2200);
  if (!kanBruge(aktivt)) skiftVåben(ind.udrustning.sekundær);
}
// Kan spilleren holde dette våben? (tohåndsvåben kræver begge arme)
function kanBruge(id) {
  if (!egneLemmer() || id === "ingen") return true;
  if (!spillerFig.harArm()) return false;
  return ["pistol", "kniv", "granat"].includes(VÅBEN[id]?.klasse) || (!spillerFig.mangler.armR && !spillerFig.mangler.armL);
}
// Nogen blev dræbt: point, drabslisten og statistikken
function drab(drabsmand, offer, v, hoved) {
  if (drabsmand === offer) { hud.drabLinje(drabsmand, offer, v.d.navn, false, offer === spiller); return; }   // sin egen raket eller granat
  drabsmand.drab++; if (hoved) drabsmand.hoveder++;
  point[drabsmand.hold]++;
  hud.drabLinje(drabsmand, offer, v.d.navn, hoved, drabsmand === spiller || offer === spiller);
  if (drabsmand === spiller) {
    stat.drab++; if (hoved) stat.hoved++; stime++; stat.bedsteStime = Math.max(stat.bedsteStime, stime);
    if (stime >= 3 && stime % 1 === 0) hud.besked(stime >= 5 ? `🔥 ${stime} i træk!` : `${stime} i træk`, 1500);
  }
  if (point[drabsmand.hold] >= MÅL) slutKamp();
}

// ---------- Kniven: et hug (venstre klik) eller et stik (højre klik) lige foran ----------
function knivHug(stik) {
  const v = vb();
  v.klar = stik ? 1.0 : v.d.kadence;
  const o = kamera.position.clone(), r = retningsvektor(spiller.a.yaw, spiller.a.pitch, new THREE.Vector3());
  let bedst = null;
  for (const k of kampfolk) {
    if (k === spiller || k.død || k.hold === spiller.hold) continue;
    const h = k.træf(o, r, v.d.rækkevidde);
    if (h && (!bedst || h.t < bedst.t)) bedst = { k, ...h };
  }
  hånd.skud(); Lyd.kniv();
  if (!bedst) { const væg = verden.stråle(o, r, v.d.rækkevidde); if (væg) effekter.nedslag(o.clone().addScaledVector(r, væg.t), væg.normal, væg.kasse.mat, 0.5); return; }
  const s = skade(v, bedst.del, bedst.k, bedst.t, stik);
  hud.ramt(false, false); Lyd.ramt(false);
  effekter.blod(o.clone().addScaledVector(r, bedst.t), r, verden, 0.8);
  if (bedst.k.ramt(s, spiller, { r, del: bedst.del, lem: bedst.lem, kniv: true, kraft: KRAFT.kniv * (v.id === "hakke" ? 2 : 1) })) { hud.ramt(false, true); drab(spiller, bedst.k, v, false); }
}

// ---------- Input: tastatur og mus ----------
const taster = new Set();
let skydHoldt = false, skydLåst = false, hjulHop = 0, musX = 0, musY = 0;
addEventListener("keydown", e => {
  if (!iGang || pause) return;
  if (["Tab", "Space"].includes(e.code) || e.ctrlKey) e.preventDefault();   // Ctrl er duk: ingen Ctrl+S, Ctrl+D osv. midt i kampen
  if (e.repeat) return;
  taster.add(e.code);
  if (e.code === "KeyR" && !spiller.død) { const v = vb(); if (genlad(v)) { hånd.genladStart(v.d.genlad); Lyd.genlad(v.d.genlad); hud.kikkert(false); } }
  const u = ind.udrustning;
  let ny = { Digit1: u.primær, Digit2: u.sekundær, Digit3: u.kniv }[e.code] || (e.code === "KeyQ" ? forrige : null);
  if (e.code === "Digit4") ny = næsteGranat();
  if (ny && ny !== aktivt && våbenSæt[ny] && !spiller.død && kanBruge(ny)) skiftVåben(ny);
});
addEventListener("keyup", e => taster.delete(e.code));
// Plads 4: den næste granat, der er nogen tilbage af (tryk igen for den anden slags)
function næsteGranat() {
  const g = ind.udrustning.granater.map(x => `granat_${x}`).filter(id => våbenSæt[id]?.skud > 0);
  if (!g.length) return null;
  return g[(g.indexOf(aktivt) + 1) % g.length];
}
function skiftVåben(id) {
  const gammel = vb(); gammel.kikkert = 0; gammel.genlader = 0;
  forrige = aktivt; aktivt = id;
  const v = vb(); v.klar = Math.max(v.klar, v.d.træk);
  hånd.vis(id, v.d.træk); hud.kikkert(false);
}
lærred.addEventListener("mousedown", e => {
  if (!iGang || pause || spiller.død || document.pointerLockElement !== lærred) return;   // kun når musen er fanget af spillet
  if (e.button === 0) skydHoldt = true;
  if (e.button === 2) {
    const v = vb();
    if (v.d.zoom && v.genlader <= 0) { v.kikkert = (Math.abs(v.kikkert) + 1) % (v.d.zoom.length + 1); Lyd.bip(1400); }
    else if (v.d.nærkamp && v.klar <= 0) knivHug(true);
    else if (v.d.granat) kastGranat(true);
  }
});
addEventListener("mouseup", e => { if (e.button === 0) skydHoldt = false; });
addEventListener("contextmenu", e => e.preventDefault());
addEventListener("wheel", () => { if (iGang && !pause) hjulHop = 3; }, { passive: true });
addEventListener("mousemove", e => {
  if (document.pointerLockElement !== lærred || pause) return;
  const v = vb(), zoom = v?.kikkert > 0 ? v.d.zoom[v.kikkert - 1] / grundFov() : 1;   // med kikkert drejer man langsommere (som i CS)
  const k = ind.følsomhed * 0.022 * G * zoom;
  spiller.a.yaw -= e.movementX * k;
  spiller.a.pitch = Math.max(-89 * G, Math.min(89 * G, spiller.a.pitch - e.movementY * k));
  musX += e.movementX; musY += e.movementY;
});
// Synsfeltet: vandret ved 4:3 (som i CS) → lodret til kameraet
const grundFov = () => 2 * Math.atan(Math.tan(ind.synsfelt * G / 2) * 3 / 4) / G;

// ---------- Ét tick (128 i sekundet) ----------
function tick(dt) {
  tid += dt; kampSlut -= dt;
  beskyttet = Math.max(0, beskyttet - dt);
  if (!spiller.død) {
    const v = vb();
    opdaterVåben(v, dt);
    const maks = (v.kikkert > 0 && v.d.kikkertFart) || v.d.fart;
    const frem = (taster.has("KeyW") ? 1 : 0) - (taster.has("KeyS") ? 1 : 0), side = (taster.has("KeyD") ? 1 : 0) - (taster.has("KeyA") ? 1 : 0);
    const gå = taster.has("ShiftLeft") || taster.has("ShiftRight"), duk = taster.has("KeyC") || taster.has("ControlLeft") || taster.has("ControlRight");
    const hop = taster.has("Space") || hjulHop > 0; if (hjulHop > 0) hjulHop--;
    const før = spiller.a.pos.clone();
    bevæg(spiller.a, { frem, side, hop, gå, duk }, dt, verden, maks);
    // fodtrin (kun når man løber — gå og duk er lydløst), og botterne kan høre dem
    const fart = Math.hypot(spiller.a.vel.x, spiller.a.vel.z);
    if (spiller.a.jord && !gå && !duk && fart > maks * 0.55) {
      trinVej += før.distanceTo(spiller.a.pos);
      if (trinVej > 1.9) { trinVej = 0; Lyd.trin(null, 0.55); for (const b of bots) if (b.a.pos.distanceTo(spiller.a.pos) < 16) b.hør(spiller.a.pos, spiller); }
    }
    if (spiller.a.landet) { spiller.a.landet = 0; Lyd.landing(); hånd.land = 1; }
    // skyd: aftrækkeren (automat, ét skud pr. klik, salver og minigunnens opspin står i vaaben.js)
    if (v.d.klasse === "ingen") { /* ingen arme: intet at skyde med */ }
    else if (v.d.nærkamp) { if (skydHoldt && v.klar <= 0) knivHug(false); }
    else if (v.d.granat) { if (skydHoldt && !skydLåst) { skydLåst = true; kastGranat(false); } }
    else {
      if (skydHoldt && v.skud <= 0 && v.genlader <= 0 && v.kø === 0 && !skydLåst) {     // tomt: et klik, og så genlad
        Lyd.klik(); skydLåst = true; if (genlad(v)) { hånd.genladStart(v.d.genlad); Lyd.genlad(v.d.genlad); }
      }
      if (aftrækker(v, skydHoldt, dt)) spillerSkyder();
    }
    if (!skydHoldt) skydLåst = false;
  } else if (tid - dødTid > 3) genopstå();
  else { const s = 3 - (tid - dødTid); hud.død(hud.el.død.innerHTML.replace(/tilbage om \d/, `tilbage om ${Math.ceil(s)}`)); }
  for (const b of bots) {
    b.tick(dt);
    if (b.død && tid - b.dødTid > 3) b.spawn();
  }
  deleTrin(dt);                                                    // hoveder, arme og ben, der er skudt af, falder og bliver liggende
  projektiler.trin(dt);
  if (kampSlut <= 0) slutKamp();
}
function spillerSkyder() {
  const v = vb();
  const ret = skudRetning(v, spiller.a, spiller.a.yaw, spiller.a.pitch);
  efterSkud(v);
  skyd(spiller, kamera.position.clone(), ret, v);
  hånd.skud(v.d); Lyd.skud(v.d); stat.skud++;
  if (!v.d.lydløs && !v.d.projektil) effekter.mundingslys(hånd.munding(kamera, tmpM));
  if (v.d.zoom && v.d.kadence > 0.8) { slag = Math.min(1, slag + 0.35); hud.kikkert(false); }
  if (v.d.klasse === "hagl" || v.d.projektil === "raket") slag = Math.min(1, slag + 0.3);
}
// Kast en granat: langt (venstre klik) eller kort (højre klik). Er der ikke flere, skiftes der tilbage
function kastGranat(kort) {
  const v = vb();
  if (v.skud <= 0 || v.klar > 0) return;
  v.skud--; v.klar = v.d.kadence;
  const r = retningsvektor(spiller.a.yaw, spiller.a.pitch, new THREE.Vector3());
  const o = kamera.position.clone().addScaledVector(r, 0.35).add(new THREE.Vector3(0, -0.12, 0));
  const fart = r.clone().multiplyScalar(kort ? 7 : 16).add(new THREE.Vector3(spiller.a.vel.x * 0.6, (kort ? 2.5 : 2.0) + Math.max(0, spiller.a.vel.y) * 0.5, spiller.a.vel.z * 0.6));
  projektiler.granat(v.d.granat, spiller, o, fart); Lyd.kast(); hånd.skud(v.d);
  if (v.skud <= 0) setTimeout(() => { if (vb() === v) skiftVåben(næsteGranat() || (forrige.startsWith("granat_") ? ind.udrustning.primær : forrige)); }, 250);
}
// En blændgranat springer: dem, der kigger på den, bliver blændet (også spilleren)
function blænd(pos) {
  const V = THREE.Vector3;
  if (!spiller.død) {
    const r = pos.clone().sub(kamera.position), d = r.length(); r.divideScalar(d);
    if (d < 40 && !verden.stråle(kamera.position, r, d - 0.1)) {
      const vend = Math.max(0, (r.dot(kamera.getWorldDirection(new V())) + 0.35) / 1.35), styrke = Math.min(1, vend * 1.2) * (1 - d / 40);
      if (styrke > 0.05) { hud.blænd(styrke); Lyd.ringen(styrke); }
    }
  }
  for (const b of bots) {
    if (b.død) continue;
    const øje = b.øje(), r = pos.clone().sub(øje), d = r.length(); r.divideScalar(d);
    if (d > 40 || verden.stråle(øje, r, d - 0.1)) continue;
    const vend = (r.x * -Math.sin(b.a.yaw) + r.z * -Math.cos(b.a.yaw) + 0.35) / 1.35;
    const tid_ = (0.5 + 3.2 * Math.max(0, vend)) * (1 - d / 40);
    if (tid_ > 0.3) { b.blindTil = tid + tid_; b.mål = null; }
  }
}

// ---------- Hvert billede: kamera, hånd, botter og skærm ----------
let sidst = performance.now(), akk = 0, trinOp = 0;
const op = new THREE.Vector3(0, 1, 0), frem = new THREE.Vector3();
function billede(nu) {
  requestAnimationFrame(billede);
  const dt = Math.min(0.1, (nu - sidst) / 1000); sidst = nu;
  if (iGang && !pause) { akk += dt; let n = 0; while (akk >= TICK && n++ < 30) { tick(TICK); akk -= TICK; } }
  const alfa = akk / TICK, a = spiller.a;
  // kameraet: mellem de to sidste tick (blødt) — og trin op glider i stedet for at hoppe
  if (a.trådOp) { trinOp += a.trådOp; a.trådOp = 0; }
  trinOp *= Math.exp(-dt * 14);
  const p = tmpS.lerpVectors(a.forrige, a.pos, Math.min(1, alfa));
  const dødFald = spiller.død ? Math.min(1, (tid - dødTid) * 2) : 0;
  kamera.position.set(p.x, p.y + øjeHøjde(a) - trinOp - dødFald * 1.2, p.z);
  const v = vb(), [rp, ry] = v ? synligRekyl(v) : [0, 0];
  slag *= Math.exp(-dt * 8);
  kamera.rotation.set(a.pitch + rp + slag * 0.05, a.yaw + ry + slagYaw * slag, dødFald * 0.6);
  const zoomet = v && v.kikkert > 0 && !spiller.død, kikkert = zoomet && v.d.sigte !== "sigte";   // "sigte": man kigger ned over våbnet (ingen kikkert)
  const fov = zoomet ? v.d.zoom[v.kikkert - 1] : grundFov();
  if (Math.abs(kamera.fov - fov) > 0.01) { kamera.fov = fov; kamera.updateProjectionMatrix(); }
  himmel.position.copy(kamera.position);
  // botterne, hånden og effekterne
  for (const b of bots) b.tegn(Math.min(1, alfa), dt);
  deleTegn(); projektiler.tegn(dt);
  if (spillerFig && !spiller.død) {                                // den usynlige figur følger spilleren (til at blive ramt)
    spillerFig.model.position.set(p.x, p.y, p.z); spillerFig.model.rotation.y = a.yaw;
    const c = Math.cos(a.yaw), sn = Math.sin(a.yaw);
    spillerFig.poser({ fart: Math.hypot(a.vel.x, a.vel.z), vx: c * a.vel.x - sn * a.vel.z, vz: sn * a.vel.x + c * a.vel.z, duk: a.duk, pitch: a.pitch, kravl: !!a.kravl, våben: aktivt, dt });
  }
  const fart = Math.hypot(a.vel.x, a.vel.z);
  hånd.opdater(dt, { fart: v ? fart / v.d.fart : 0, jord: a.jord, musX, musY, duk: a.duk, skjul: kikkert || spiller.død, sigte: zoomet && !kikkert, landet: false });
  musX = musY = 0;
  effekter.opdater(dt); hud.opdater(dt);
  // skærmen
  if (iGang && v) {
    hud.liv(spiller.liv, spiller.panser); hud.ammo(v);
    hud.stilling(point.ræve, point.slanger, kampSlut);
    hud.sigte(unøjagtighed(v, a) + (v.d.spredning || 0), kamera.fov * G, innerHeight, !spiller.død && !kikkert && !(v.d.zoom && !kikkert));
    hud.kikkert(kikkert); hud.fart(ind.fart ? fart : null);
    hud.granater(ind.udrustning.granater.map(g => ({ ikon: VÅBEN[`granat_${g}`].ikon, antal: våbenSæt[`granat_${g}`]?.skud ?? 0, aktiv: aktivt === `granat_${g}` })));
    hud.tavle(taster.has("Tab"), kampfolk, HOLD);
  }
  kamera.getWorldDirection(frem); Lyd.lytter(kamera.position, frem, op);
  renderer.clear(); renderer.render(scene, kamera);
  if (!kikkert && !spiller.død && iGang) { renderer.clearDepth(); renderer.render(hånd.scene, hånd.kamera); }
}
function tilpas() {
  renderer.setSize(innerWidth, innerHeight, false);
  kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix(); hånd.tilpas(kamera.aspect);
}
addEventListener("resize", tilpas); tilpas();

// ---------- Kampen: start, pause og slut ----------
function startKamp() {
  point = { ræve: 0, slanger: 0 }; tid = 0; kampSlut = KAMPTID; spiller.drab = spiller.dødsfald = spiller.hoveder = 0; stime = 0;
  lavBots(); genopstå(); for (const b of bots) b.spawn();
  iGang = true; stat.kampe++; gemStatistik(stat);
  $("hud").classList.remove("skjult"); $("fortsæt").classList.remove("skjult"); $("start").textContent = "↻ Ny kamp";
  hud.besked("Holdkamp! Første hold til 50 drab", 2600);
}
function slutKamp() {
  if (!iGang) return;
  iGang = false; pause = true;
  const vandt = point.ræve > point.slanger, uafgjort = point.ræve === point.slanger;
  if (vandt) stat.sejre++;
  gemStatistik(stat);
  document.exitPointerLock?.();
  $("slutOverskrift").textContent = uafgjort ? "Uafgjort!" : vandt ? "🏆 Ørkenrævene vandt!" : "Sandslangerne vandt";
  $("slutTekst").innerHTML = `${point.ræve} – ${point.slanger}<br>Du: ${spiller.drab} drab, ${spiller.dødsfald} gange død, ${spiller.drab ? Math.round(100 * spiller.hoveder / spiller.drab) : 0} % hovedskud`;
  $("slut").classList.remove("skjult"); $("hud").classList.add("skjult"); $("menu").classList.add("skjult");
}
// Fang musen — med rå bevægelse (uden Windows’ museacceleration), hvis browseren kan, så sigtet er præcist
function lås_mus() {
  Lyd.start();
  // fuld skærm, og browseren må ikke bruge tasterne selv (ellers lukker Ctrl+W fanen, når man dukker og går frem)
  if (ind.fuldskærm && !document.fullscreenElement) document.documentElement.requestFullscreen?.({ navigationUI: "hide" })
    .then(() => navigator.keyboard?.lock?.(["ControlLeft", "ControlRight", "KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyR", "KeyC", "Space", "Tab", "Digit1", "Digit2", "Digit3"]))
    .catch(() => {});
  const fejl = () => hud.besked("Musen kunne ikke fanges — åbn spillet i Chrome eller Edge", 4000);
  const igen = () => { try { lærred.requestPointerLock()?.catch?.(fejl); } catch (_) { fejl(); } };
  try { lærred.requestPointerLock({ unadjustedMovement: true })?.catch?.(igen); } catch (_) { igen(); }
}
document.addEventListener("pointerlockchange", () => {
  const låst = document.pointerLockElement === lærred;
  if (låst) { pause = false; sidst = performance.now(); akk = 0; $("menu").classList.add("skjult"); $("klik").classList.add("skjult"); }
  else if (iGang) { pause = true; skydHoldt = false; taster.clear(); visMenu(); }
});
// Lukker man fanen midt i en kamp (fx Ctrl+W uden fuld skærm), spørger browseren først
addEventListener("beforeunload", e => { if (iGang) { e.preventDefault(); e.returnValue = ""; } });
$("start").addEventListener("click", () => { gemIndst(); $("slut").classList.add("skjult"); startKamp(); lås_mus(); });
$("fortsæt").addEventListener("click", () => { gemIndst(); lås_mus(); });
$("igen").addEventListener("click", () => { $("slut").classList.add("skjult"); startKamp(); lås_mus(); });
$("tilMenu").addEventListener("click", () => { $("slut").classList.add("skjult"); $("fortsæt").classList.add("skjult"); $("start").textContent = "▶ Start kamp"; visMenu(); });
$("klik").addEventListener("click", lås_mus);

// ---------- Menuen ----------
function knapper(id, valg, nøgle, efter) {
  const rod = $(id); rod.innerHTML = "";
  for (const [værdi, tekst] of valg) {
    const b = document.createElement("button"); b.textContent = tekst; b.classList.toggle("valgt", ind[nøgle] === værdi);
    b.addEventListener("click", () => { ind[nøgle] = værdi; gemIndst(); [...rod.children].forEach(c => c.classList.toggle("valgt", c === b)); efter?.(); Lyd.bip(); });
    rod.appendChild(b);
  }
}
function skyder(id, nøgle, vis) {
  const s = $(id), o = $(id + "Tal");
  s.value = ind[nøgle]; o.textContent = vis(ind[nøgle]);
  s.addEventListener("input", () => { ind[nøgle] = +s.value; o.textContent = vis(ind[nøgle]); if (nøgle === "lydstyrke") Lyd.sætLydstyrke(ind.lydstyrke); gemIndst(); });
}
knapper("valgSværhed", Object.entries(SVÆRHED).map(([k, v]) => [k, v.navn]), "sværhed");
knapper("valgHold", [1, 2, 3, 4, 5].map(n => [n, `${n} mod ${n}`]), "hold");
lavUdrustning($("udrustning"), $("vælger"), ind, gemIndst, () => Lyd.bip());
knapper("valgFart", [[false, "Nej"], [true, "Ja (u/s)"]], "fart");
knapper("valgFuld", [[true, "Ja"], [false, "Nej"]], "fuldskærm");
knapper("valgLemmer", [[true, "Ja"], [false, "Nej"]], "egneLemmer");
skyder("følsomhed", "følsomhed", v => v.toFixed(2));
skyder("synsfelt", "synsfelt", v => `${v}°`);
skyder("lydstyrke", "lydstyrke", v => `${Math.round(v * 100)} %`);
function visMenu() { $("statLinje").textContent = statistikTekst(stat); $("menu").classList.remove("skjult"); }
visMenu();
// før kampen: kameraet kigger ud over midten af byen
spiller.a = nyAktør(0, 6, 30, 0); spiller.a.pitch = -0.12;
requestAnimationFrame(billede);
if (location.search.includes("debug")) window.sk = { spiller, get bots() { return bots; }, verden, bane, kamera, ind, tick, skyd, startKamp, taster, hånd, scene, himmelLys, renderer,
  get vb() { return vb(); }, get point() { return point; }, kør() { pause = false; $("menu").classList.add("skjult"); }, stop() { pause = true; }, udrust, kast: kastGranat, vælg: id => skiftVåben(id), effekter, hud, spillerFig, get aktivt() { return aktivt; }, get projektiler() { return projektiler; },
  steg(n) { for (let i = 0; i < n; i++) tick(TICK); }, skydNu() { skydHoldt = true; spillerSkyder(); skydHoldt = false; skydLåst = false; } };
