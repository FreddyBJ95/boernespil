// ===== Sigtekorn: et 3D-skydespil til de voksne, i stil med Counter-Strike =====
// Holdkamp, våbenræs og træning mod bots på tre baner: Støvbyen, Havnen og Fjeldbyen. Fysikken kører med fast tick (128 i sekundet), så bevægelser
// og skud føles ens hver gang — og man kan blive god til det: stå stille, når du skyder, modstyr,
// træk musen imod rekylen, og sigt efter hovedet.
//  bevaegelse.js  bevægelsen (Source-fysik)     vaaben.js  våbnene, spredning og rekyl
//  bane.js        byggeklodserne og vej-nettet    bots.js    botterne        baner/  de enkelte baner
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
import { lavBane, fotoBrug } from "./bane.js";
import { hentLys, himmelMiljø } from "./lys.js";
import { deleTrin, deleTegn, ryddDele, deleSynlige } from "./dele.js";
import { nyAktør, bevæg, øjeHøjde, TICK, U } from "./bevaegelse.js";
import { VÅBEN, nytVåben, aftrækker, efterSkud, opdaterVåben, skudRetning, synligRekyl, retningsvektor, genlad, unøjagtighed, skade } from "./vaaben.js";
import { SJÆLDEN } from "./katalog.js";
import { lavUdrustning, retUdrustning } from "./udrustning.js";
import { Projektiler } from "./projektiler.js";
import { Hånd } from "./haand.js";
import { Effekter } from "./effekter.js";
import { Bot, SVÆRHED, NAVNE, træfKrop, vinkel, hentSoldat, botVåben, botKanBruge } from "./bots.js";
import { Figur, harLeddeløs, holdFarve } from "./leddeloes.js";
import { Bombe, visMærker } from "./bombe.js";
import { Killcam } from "./killcam.js";
import { lavVejr } from "./vejr.js";
import { Zombier, MAKS_SAMTIDIG } from "./zombier.js";
import { Køretøjer } from "./koeretoejer.js";
import { Byggeri, DELE, PRIS } from "./byggeri.js";
import { BattleRoyale, sjældenFarve } from "./br.js";
import { Online, Fjern, kanOnline } from "./online.js";
import { køb, drabPenge, giv as givPenge, tegnKøbsmenu, GRUPPER, nytUdstyr } from "./penge.js";
import * as Lyd from "./lyd.js";
import { Profil, UDFORDRINGER } from "./profil.js";
import { SKINS, skinBillede } from "./skins.js";
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
const ind = Object.assign({ sværhed: "normal", hold: 5, følsomhed: 2.0, synsfelt: 90, lydstyrke: 0.8, fart: false, fuldskærm: true, egneLemmer: true, killcam: true, byg: true, vejr: "dag", spiltype: "hold", side: "ræve", skFarve: "#5dff6a" },
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
// himlen: en stor kugle med blå top, lys horisont og en sol (retningen regnes ud for hver pixel, så der ikke ses kanter)
const himmel = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x3a78c8) }, midt: { value: new THREE.Color(0x8fbce8) }, bund: { value: new THREE.Color(0xf0dcbc) }, sol: { value: solRet }, glod: { value: 1 } },   // (navnene i shaderen skal være uden æ, ø og å)
  vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 top; uniform vec3 midt; uniform vec3 bund; uniform vec3 sol; uniform float glod; varying vec3 vP;
    void main(){ vec3 d = normalize(vP); float h = clamp(d.y, -0.2, 1.0); vec3 c = mix(bund, midt, smoothstep(0.0, 0.22, h)); c = mix(c, top, smoothstep(0.22, 0.9, h));
      float s = max(dot(d, sol), 0.0); c += (vec3(1.0, 0.92, 0.75) * pow(s, 900.0) * 6.0 + vec3(1.0, 0.85, 0.6) * pow(s, 10.0) * 0.22) * glod;
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
himmel.renderOrder = -1; scene.add(himmel);

// ---------- Banen, effekterne, hånden og skærmen ----------
const t = await lavTeksturer(fotoBrug(ind.udrustning.bane));         // kun de fotos, banen bruger
const verden = new Kasseverden();
const bane = lavBane(scene, verden, t, ind.udrustning.bane, ind.vejr);   // banen, man har valgt i udrustningen — og vejret
const vejrNavn = { nat: " om natten", storm: { sand: " i sandstorm", regn: " i regnvejr", sne: " i snestorm" }[bane.storm] }[ind.vejr] || "";
document.querySelector(".menu-kort h1 small").textContent = `${bane.navn}${vejrNavn} · Ørkenrævene mod Sandslangerne · ${ind.spiltype === "online" ? "online mod familien" : "mod bots"}`;
if (bane.vejr) {                                                  // banens vejr: tågen, solen og himlens farver
  const v = bane.vejr;
  if (v.tåge) { scene.fog.color.set(v.tåge[0]); scene.fog.near = v.tåge[1]; scene.fog.far = v.tåge[2]; }
  if (v.sol) { solRet.set(...v.sol).normalize(); sol.position.copy(solRet).multiplyScalar(120); }
  if (v.solFarve) sol.color.set(v.solFarve);
  if (v.solStyrke) sol.intensity = v.solStyrke;
  if (v.himmel) ["top", "midt", "bund"].forEach((k, i) => himmel.material.uniforms[k].value.set(v.himmel[i]));
}
let omgivelse = null;
const bagtLys = await hentLys(bane.masker, bane.id, ind.vejr === "nat");     // lyset fra Blender: himlen og det tilbagekastede lys (om natten: natlyset)
if (bagtLys) {
  scene.remove(himmelLys);
  omgivelse = new THREE.AmbientLight(0xe6dccb, 0.2); scene.add(omgivelse);   // lidt lys overalt, så selv de mørkeste kroge ikke er helt sorte
} else if (ind.vejr === "nat") himmelLys.intensity = 0.12;
// vejret (vejr.js): nat eller storm ændrer tågen, himlen, solen og lyset — og giver lommelygter, regn, sne eller sand
const vejr = lavVejr(ind.vejr, bane.storm, { scene, sol, solRet, himmel, omgivelse, masker: bane.masker });
Lyd.vejrLyd(vejr.lyd); vejr.torden = d => Lyd.torden(d);
let lygteTændt = true;                                             // din lommelygte om natten (tast F)
if (bagtLys) scene.environment = himmelMiljø(renderer, himmel);
await hentSoldat();                                               // de leddeløse soldater fra Blender (ellers klodssoldaten)
const effekter = new Effekter(scene, t);
const hånd = new Hånd(t);
hånd.lysStyrke(vejr.håndLys);                                      // (våbnet i hånden er mørkere om natten og i storm)
hånd.lavMiljø(renderer);
// Killcammens egen hånd: drabsmandens våben (med hans skin), set gennem hans øjne
const killHånd = new Hånd(t);
killHånd.lysStyrke(vejr.håndLys); killHånd.lavMiljø(renderer);
const hud = new Hud();
let stat = læsStatistik();
const profil = new Profil();                                       // XP, niveau, rang, udfordringer og skins (profil.js)
const projektiler = new Projektiler({
  scene, verden, effekter, lyd: Lyd, kampfolk: () => kampfolk, nu: () => tid,
  træf: (k, o, r, maks) => træfKæmper(k, o, r, maks),
  kugle: (skytte, offer, h, v, afstand, r) => træfOffer(skytte, offer, h.del, h.lem, v, afstand, r, null),
  skad: (offer, s, skytte, skud, navn, hoved) => skadFra(offer, s, skytte, skud, navn, hoved),
  blænd: pos => blænd(pos),
  ryst: (pos, styrke) => { const d = pos.distanceTo(kamera.position); if (d < 25) slag = Math.min(1.4, slag + styrke * (1 - d / 25)); },
  byggeri: () => byggeri,
}, t);

// ---------- Spilleren ----------
// Spilleren er også leddeløs: en usynlig figur følger med, så botterne kan skyde dine arme, ben og hoved af
let spillerFig = null;
function lavSpillerFig(hold) {                                     // (den usynlige figur får holdets farver, når man falder fra hinanden)
  if (!harLeddeløs()) return;
  if (spillerFig) scene.remove(spillerFig.model);
  spillerFig = new Figur(hold); spillerFig.model.visible = false; scene.add(spillerFig.model);
}
lavSpillerFig(ind.side);
const egneLemmer = () => spillerFig && ind.egneLemmer;
const spiller = { navn: "Dig", hold: ind.side, erSpiller: true, liv: 100, panser: 100, død: false, drab: 0, dødsfald: 0, hoveder: 0, a: nyAktør(0, 0.01, 47) };
let dræber = null, dødSyn = { yaw: 0, pitch: 0 };                    // hvem dræbte dig (kameraet drejer hen mod dem)
let våbenSæt = {}, aktivt = "storm", forrige = "pistol", dødTid = 0, beskyttet = 0, stime = 0, trinVej = 0, slag = 0, slagYaw = 0;
// ---------- Våbenræs: hvert drab giver det næste våben i rækken — den første, der dræber med kniven, vinder ----------
const RÆKKE = ["raket", "minigun", "lmg", "storm", "taktisk", "salve", "kamp", "mp", "sprøjte", "pump", "hagl", "spejder", "snig", "armbrøst", "revolver", "pistol", "kniv"];
const ræs = () => ind.spiltype === "ræs";
const ræsVåben = k => RÆKKE[Math.min(k.niveau || 0, RÆKKE.length - 1)];
let vinder = null;
// ---------- Træning: skyd 30 mål så hurtigt som muligt. Målene står (eller bevæger sig, alt efter sværheden) rundt om dig ----------
const TRÆNING = 30;
const træning = () => ind.spiltype === "træning";
const bombeSpil = () => ind.spiltype === "bombe";                  // bombe: runder som i CS (se bombe.js)
const zombieSpil = () => ind.spiltype === "zombier";               // zombier: overlev bølger sammen med botterne (se zombier.js)
const brSpil = () => ind.spiltype === "br";                        // battle royale: alle mod alle, stormen og kisterne (se br.js)
const medUdstyr = () => bombeSpil() || brSpil();                   // (våbnene er dem, man har købt eller fundet)
const onlineSpil = () => ind.spiltype === "online";                // online: holdkamp mod familien over familiens server (se online.js)
let følgNr = 0;                                                    // død i en bomberunde: hvilken holdkammerat man ser med hos
let træningTal = { skud: 0, træf: 0 };                                // træningens skud og træffere (tæller ikke med i statistikken)
// Plads 1, 2 og 3 (tasterne): i våbenræs er det rækkens våben, en pistol og kniven
const plads = n => ræs() ? [ræsVåben(spiller), "pistol", "kniv"][n - 1]
  : medUdstyr() ? [spiller.udstyr?.primær, spiller.udstyr?.sekundær, ind.udrustning.kniv][n - 1]
  : [ind.udrustning.primær, ind.udrustning.sekundær, ind.udrustning.kniv][n - 1];
// Granaterne, man har (i Bombe dem, man har købt)
const mineGranater = () => medUdstyr() ? (spiller.udstyr?.granater || []) : ind.udrustning.granater;
// Udrustningen: plads 1 hovedvåben, 2 pistol, 3 nærkamp og 4 granaterne (i våbenræs: rækkens våben, pistol og kniv — til sidst kun kniven)
function udrust() {
  const u = ind.udrustning, sidst = ræs() && ræsVåben(spiller) === "kniv";
  const k = spiller.udstyr || nytUdstyr();                          // (i Bombe: det, man har købt)
  const ids = medUdstyr() ? [k.primær, k.sekundær, u.kniv, ...k.granater.map(g => `granat_${g}`), "ingen"].filter(Boolean)
    : !ræs() ? [u.primær, u.sekundær, u.kniv, ...u.granater.map(g => `granat_${g}`), "ingen"] : sidst ? ["kniv", "ingen"] : [ræsVåben(spiller), "pistol", "kniv", "ingen"];
  våbenSæt = {};
  for (const id of ids) våbenSæt[id] = nytVåben(id);
  aktivt = ids[0]; forrige = ids[1];
  hånd.forbered(Object.keys(våbenSæt));
  hånd.vis(aktivt, VÅBEN[aktivt].træk);
  if (!kanBruge(aktivt)) skiftVåben(våbenSæt.pistol ? "pistol" : "kniv");          // (uden en arm: kun det, man kan holde med én hånd)
}
const vb = () => våbenSæt[aktivt];
// Start (eller start igen) det sted i Ørkenrævenes start, der er længst fra fjenderne
function genopstå() {
  let bedst = bane.start[spiller.hold][0], bd = -1;
  for (const [x, z] of bane.start[spiller.hold]) {
    const d = Math.min(...bots.filter(b => b.hold !== spiller.hold && !b.død).map(b => Math.hypot(b.a.pos.x - x, b.a.pos.z - z)), 999);
    if (d > bd) { bd = d; bedst = [x, z]; }
  }
  spiller.a = nyAktør(bedst[0], 0.01, bedst[1], 0);
  spiller.liv = 100; spiller.panser = bombeSpil() ? spiller.udstyr?.panser ?? 0 : 100; spiller.død = false; beskyttet = 1.5;
  spillerFig?.nulstil();
  if (køretøjer.kører) { køretøjer.stigUd(); Lyd.motorLyd(null); }
  byggeri.aktiv = false;
  killcam.stop(); killcamVent = null; deleSynlige(true); hud.killcam(null);
  udrust(); hud.død(""); hud.kikkert(false);
}

// ---------- Botterne ----------
let sidsteDelLyd = -1;
let bots = [], kampfolk = [], point = { ræve: 0, slanger: 0 }, tid = 0, kampSlut = KAMPTID, iGang = false, pause = true;
const botSpil = {
  scene, verden, bane, knuder: bane.knuder, kampfolk: () => kampfolk, nu: () => tid, sværhed: () => SVÆRHED[ind.sværhed],
  skyd: (bot, o, ret, v) => skyd(bot, o, ret, v),
  røgBlokerer: (a, b) => projektiler.røgBlokerer(a, b),
  kast: (bot, type, o, fart) => projektiler.granat(type, bot, o, fart),  // botterne kaster også granater
  ræsVåben: bot => ræs() ? ræsVåben(bot) : null,                     // våbenræs: botten får rækkens våben
  træning: () => træning(),                                       // træning: botterne er mål, der ikke skyder
  get byggeri() { return byggeri; },                              // (vægge, der står i vejen, skyder eller hugger de i stykker)
  efterSpawn: bot => { if (brSpil() && !bot.zombie) { bot.våben = nytVåben(bot.sekundær); bot.granater = []; bot.panser = 0; br.iLuften(bot, holdFarve(bot.hold)); } },
  svæv: (bot, dt) => br.svæv(bot, null, dt),                      // (battle royale: på vej ned i glideflyet)
  sendTræf: (f, s, skud) => online.send({ k: "træf", liv: Math.round(s.liv), panser: Math.round(s.panser || 0), del: skud?.del || "krop", lem: skud?.lem || null,   // (online: til den, der blev ramt)
    kniv: !!skud?.kniv, kraft: skud?.kraft || 3, r: skud?.r ? til3(skud.r) : null, våben: skud?.navn || vb()?.d.navn || "" }, f.id),
  synsvidde: () => vejr.synsvidde,                                // (kortere om natten og i storm)
  spawnSted: bot => træning() ? målSted(bot) : bot.zombie ? zombier.sted() : brSpil() ? br.himmelSted() : null,
  zombie: () => ({ liv: zombier.liv, skade: zombier.skade }), zombieFart: () => zombier.fart,
  zombieLyd: pos => { if (pos.distanceTo(kamera.position) < 30) Lyd.zombie(pos); },
  særPost: bot => zombieSpil() && !bot.zombie ? nærSpilleren() : brSpil() ? br.sikkerSted(bot) : null,   // holdkammeraterne holder sig tæt på dig (battle royale: inde i cirklen)
  delLyd: (pos, fart) => {                                         // en løs del rammer jorden (ikke for mange lyde på én gang)
    if (fart < 1.2 || tid - sidsteDelLyd < 0.04 || pos.distanceTo(kamera.position) > 40) return;
    sidsteDelLyd = tid; Lyd.dunk(pos, Math.min(1, fart / 6));
  },
  trin: bot => {                                                   // en bot løber: man kan høre den — og det kan de andre botter også
    if (bot.a.pos.distanceTo(spiller.a.pos) < 30) Lyd.trin(bot.a.pos, 1.2);
    for (const b of bots) if (b !== bot && b.a.pos.distanceTo(bot.a.pos) < 14) b.hør(bot.a.pos, bot);
  },
};
// Bomberunderne: runderne, bomben, pladserne A og B (bombe.js)
const bombe = new Bombe({
  scene, bane, verden, kampfolk: () => kampfolk, spiller, hud, lyd: Lyd,
  eksplosion: (pos, skytte) => { projektiler.eksplosion(pos, skytte, "Bomben", 700, 22); effekter.eksplosion(pos.clone().add(new THREE.Vector3(1.5, 0.5, 0))); effekter.eksplosion(pos.clone().add(new THREE.Vector3(-1, 1.2, 1))); },
  nyRunde: () => { ryddDele(); effekter.ryd(); projektiler.ryd(); genopstå(); for (const b of bots) b.spawn(); følgNr = 0; },
  slut: runder => { point = { ...runder }; slutKamp(); },
  spillerGranater: () => mineGranater().filter(g => våbenSæt[`granat_${g}`]?.skud > 0),
  hændelse: (navn, d) => {                                          // XP for runder, og for at lægge eller desarmere bomben selv
    if (navn === "runde" && d.hold === spiller.hold) belønning(250, ["bombe", 1]);
    if ((navn === "lagt" || navn === "desarmeret") && d.hvem === spiller) belønning(200, ["desarmer", 1]);
  },
});
// Killcam: de sidste sekunder, før du døde, set fra den, der dræbte dig (killcam.js)
const killcam = new Killcam({ scene, kampfolk: () => kampfolk, spiller, effekter, øjeHøjde, aktivt: () => aktivt,
  dræberSkud: (id, til) => {                                       // drabsmanden skyder i afspilningen: hans våben sparker, og sporet går fra mundingen
    if (!VÅBEN[id] || killHånd.aktiv !== id) return effekter.sporFra(kamera.position.clone().add(new THREE.Vector3(0, -0.15, 0)), til);
    killHånd.skud(VÅBEN[id]); if (!VÅBEN[id].nærkamp && !VÅBEN[id].projektil) effekter.sporFra(killHånd.munding(kamera, new THREE.Vector3()), til);
  } });
let killcamVent = null;                                            // hvornår afspilningen skal starte (lidt efter, man døde)
const genopståTid = () => ind.killcam && !træning() ? 6 : 3;       // med killcam venter man lidt længere
// Zombierne: bølgerne (zombier.js). Mellem bølgerne kommer alle døde tilbage, og alle får fyldt patronerne op
const zombier = new Zombier({
  kampfolk: () => kampfolk, knuder: bane.knuder, hud, lyd: Lyd,
  nyBølge: () => {
    if (spiller.død) genopstå(); else for (const v of Object.values(våbenSæt)) v.reserve = v.d.reserve ?? 0;
    for (const b of bots) if (!b.zombie && b.død) b.spawn();
  },
  slut: bølger => { zombieResultat = bølger; slutKamp(); },
  xp: bølge => belønning(100 * bølge, bølge >= 10 && ["zombier", 1]),
});
let zombieResultat = 0;
// Køretøjerne på banen (koeretoejer.js): E for at stige ind og ud. Kører man stærkt ind i nogen, vælter de
const køretøjer = new Køretøjer({
  scene, verden, liste: bane.køretøjer, kampfolk: () => kampfolk, spiller,
  ramVæltet: (f, v) => skadFra(f, { liv: 400, panser: 0 }, spiller, { r: new THREE.Vector3(-Math.sin(v.yaw), 0.4, -Math.cos(v.yaw)), del: "krop", lem: null, kraft: 12 }, v.type === "snescooter" ? "Snescooter" : "Gaffeltruck"),
});
const førerPlads = new THREE.Vector3();
// Byggeriet (byggeri.js): G for at bygge vægge, gulve og trapper af træ — ikke i Bombe og træningen
const byggeri = new Byggeri({ scene, verden, kampfolk: () => kampfolk, effekter, lyd: Lyd });
const bygTil = () => ind.byg && !bombeSpil() && !træning();
const BYG_START = 300, BYG_DRAB = 30, BYG_MAKS = 999;
const givTræ = n => { byggeri.træ = Math.min(BYG_MAKS, byggeri.træ + n); };
// Battle royale (br.js): stormen, kisterne og glideflyene — stormen "skyder" som en kæmper, så den står i drabslisten
const STORM = { navn: "Stormen", hold: "storm", storm: true, drab: 0, hoveder: 0, død: false, a: { pos: new THREE.Vector3() } };
let brPlads = 0;
const br = new BattleRoyale({
  scene, verden, bane, kampfolk: () => kampfolk, hånd, effekter, lyd: Lyd,
  skad: (f, n) => { STORM.a.pos.set(br.midt.x, 0, br.midt.y); skadFra(f, { liv: n, panser: 0 }, STORM, null, "Stormen"); },
  kisteFund: (f, fund) => kisteFund(f, fund),
  slut: vinder => { if (vinder === spiller) { hud.besked("🏆 Sejr! Du er den sidste tilbage", 2400); setTimeout(() => slutBR(true), 2200); } },
});
const RANG = ["almindelig", "usædvanlig", "sjælden", "episk", "legendarisk"], rang = d => RANG.indexOf(d?.sjælden);
// En kiste er åbnet: våbnet (og måske en granat, en vest og træ) til den, der åbnede den
function kisteFund(f, fund) {
  if (f !== spiller) {                                               // en bot: tager våbnet, hvis det er bedre end det, den har
    const nu = f.våben?.d;
    if (!nu || nu.klasse === "pistol" || rang(VÅBEN[fund.våben]) > rang(nu)) f.fåVåben(botKanBruge(fund.våben) ? fund.våben : botVåben());
    if (fund.vest) f.panser = Math.min(100, f.panser + 50);
    if (fund.granat) f.granater = [fund.granat];
    return;
  }
  const u = spiller.udstyr, d = VÅBEN[fund.våben];
  u[d.klasse === "pistol" ? "sekundær" : "primær"] = fund.våben;
  if (fund.granat && !u.granater.includes(fund.granat)) u.granater = [...u.granater, fund.granat].slice(-2);
  if (fund.vest) spiller.panser = Math.min(100, spiller.panser + 50);
  if (bygTil()) givTræ(fund.træ);
  udrust(); if (våbenSæt[fund.våben] && aktivt !== fund.våben) skiftVåben(fund.våben);
  hud.besked(`📦 ${d.navn} (${SJÆLDEN[d.sjælden]?.navn || ""})${fund.granat ? " + " + VÅBEN[`granat_${fund.granat}`].ikon : ""}${fund.vest ? " + 🛡 vest" : ""}${bygTil() ? ` + 🌲 ${fund.træ}` : ""}`, 3000, sjældenFarve(fund.våben));
}
// Battle royale: spilleren starter højt oppe i et glidefly med kun kniven
function brStart() {
  const [x, z] = br.himmelSted();
  spiller.a = nyAktør(x, 0.01, z, Math.random() * Math.PI * 2);
  spiller.liv = 100; spiller.panser = 0; spiller.død = false; beskyttet = 0; brPlads = 0;
  spillerFig?.nulstil(); killcam.stop(); killcamVent = null; deleSynlige(true); hud.killcam(null);
  spiller.udstyr = { primær: null, sekundær: null, granater: [], panser: 0 };
  udrust(); hud.død(""); hud.kikkert(false);
  br.iLuften(spiller);
  if (bygTil()) byggeri.træ = 100;
  hud.besked("🪂 Glid ned — find en kiste og åbn den med E. Bliv inde i cirklen!", 4000);
}
// ---------- Online mod familien (online.js): de andre spillere er "fjerne" botter uden hjerne ----------
const ONLINE = "sigtekorn-online", ONLINE_IGEN = "sigtekorn-online-igen";
const online = new Online({
  lavFjern: (id, navn, hold) => { if (!onlineSpil()) return null; const f = new Fjern(botSpil, id, navn, hold); bots.push(f); kampfolk = [spiller, ...bots]; return f; },
  fjernet: f => { scene.remove(f.model); bots = bots.filter(b => b !== f); kampfolk = [spiller, ...bots]; },
  modtag: (f, d) => onlineBesked(f, d),
  status: tekst => { $("onlineStatus").textContent = tekst; },
  rumTilstand: data => { if (data?.bane && data.bane !== bane.id && onlineSpil()) skiftOnlineBane(data.bane); },
  minTilstand: () => ({ bane: bane.id }),
});
const til3 = v => [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100];
// Ens egen tilstand til de andre (cirka 20 gange i sekundet)
function minOnlineTilstand() {
  const a = spiller.a, r = n => Math.round(n * 100) / 100;
  return { k: "tilstand", p: til3(a.pos), v: til3(a.vel), yaw: r(a.yaw), pitch: r(a.pitch), duk: r(a.duk), kravl: !!a.kravl, jord: !!a.jord,
    våben: aktivt, hold: spiller.hold, liv: Math.max(0, Math.round(spiller.liv)), panser: Math.round(spiller.panser), død: spiller.død, skin: profil.skin };
}
// Værten spiller på en anden bane: skift til den (siden hentes igen og forbinder af sig selv)
function skiftOnlineBane(id) {
  ind.udrustning.bane = id; gemIndst();
  try { sessionStorage.setItem(ONLINE_IGEN, JSON.stringify(online.ønsket)); } catch (_) {}
  online.luk(); planlagtGenstart = true; location.reload();
}
// En besked fra en anden spiller: et skud (spor og lyd), en granat, et træf på dig — eller et drab
function onlineBesked(f, d) {
  const V = a => new THREE.Vector3(a[0], a[1], a[2]);
  if (d.k === "skud" && d.o && d.r) {
    const v = nytVåben(d.v), o = V(d.o), r = retningsvektor(d.r[0], d.r[1], new THREE.Vector3());
    if (v.d.projektil) v.d.projektil === "raket" ? projektiler.raket(f, o, r, v) : projektiler.pil(f, o, r, v);
    else {
      const væg = verden.stråle(o, r, 200), slut = o.clone().addScaledVector(r, væg ? væg.t : 200);
      effekter.sporFra(o.clone().addScaledVector(r, 0.7).add(new THREE.Vector3(0, -0.15, 0)), slut);
      if (væg) effekter.nedslag(slut, væg.normal, væg.kasse.mat, v.d.hagl ? 0.4 : 1);
    }
    Lyd.skud(v.d, o); f.fig?.skyd();
  } else if (d.k === "granat" && d.o && d.fart) projektiler.granat(d.type, f, V(d.o), V(d.fart));
  else if (d.k === "træf" && !spiller.død) {                          // du blev ramt af den andens skud
    const skud = { r: d.r ? V(d.r) : new THREE.Vector3(0, 0, 1), del: d.del || "krop", lem: d.lem || null, kraft: d.kraft || 3, kniv: !!d.kniv, navn: d.våben || "" };
    if (spillerRamt({ liv: +d.liv || 0, panser: +d.panser || 0 }, f, skud)) drab(f, spiller, { d: { navn: d.våben || "" } }, d.del === "hoved");
  } else if (d.k === "død") {                                         // en anden døde: hvem, og med hvad
    const dræber = d.af === online.dig ? spiller : online.fjerne.get(d.af) || f;
    f.dø({ r: d.r ? V(d.r) : new THREE.Vector3(0, 0, 1), del: d.hoved ? "hoved" : "krop", lem: d.lem || null, kraft: 4 });
    drab(dræber, f, { d: { navn: d.våben || "" } }, !!d.hoved);
  }
}
// Siden hentes igen (fx ved et baneskifte): værten tager rummet med til den nye bane — og man forbinder selv igen bagefter
function førGenstart() {
  if (!online.forbundet || !onlineSpil()) return;
  if (online.erVært && ind.udrustning.bane !== bane.id) online.sætTilstand({ bane: ind.udrustning.bane });
  try { sessionStorage.setItem(ONLINE_IGEN, JSON.stringify(online.ønsket)); } catch (_) {}
}
let planlagtGenstart = false;
const genstart = () => { førGenstart(); planlagtGenstart = true; setTimeout(() => location.reload(), 120); };   // (lidt tid til, at beskeden når ud)
addEventListener("pagehide", førGenstart);                         // (også når man selv trykker F5)
// Forbind (med navnet og rummet fra menuen)
async function forbindOnline() {
  if (!kanOnline()) { $("onlineStatus").textContent = "Åbn Sigtekorn fra familiens server for at spille online."; return false; }
  const navn = $("onlineNavn").value.trim() || "Spiller", rum = ($("onlineRum").value.trim() || "familie").toLowerCase();
  try { localStorage.setItem(ONLINE, JSON.stringify({ navn, rum })); } catch (_) {}
  try { await online.forbind(navn, rum); return true; }
  catch (e) { $("onlineStatus").textContent = `Kunne ikke forbinde: ${e.message}`; return false; }
}
// Byggetilstand til og fra: våbnet væk (og frem igen)
function skiftByg(på) {
  if (byggeri.aktiv === på) return;
  byggeri.aktiv = på; byggeri.slip(); hud.kikkert(false);
  const v = vb(); if (v) v.kikkert = 0;
  if (!på && !spiller.død) hånd.vis(aktivt, 0.25);
  Lyd.klik();
}
// På en bombeplads i Bombe er E til bomben (at lægge eller desarmere den) — ikke til køretøjerne
const påBombeplads = () => bombeSpil() && Object.values(bane.steder).some(([x, z, r]) => Math.hypot(spiller.a.pos.x - x, spiller.a.pos.z - z) < r + 1);
// Stig ind i eller ud af det nærmeste køretøj
function køretøjE() {
  if (køretøjer.kører) {
    const ud = køretøjer.stigUd(); spiller.a.pos.copy(ud); spiller.a.forrige.copy(ud); spiller.a.vel.set(0, 0, 0);
    Lyd.motorLyd(null); hånd.vis(aktivt, 0.3);
  } else {
    const v = køretøjer.nærmeste(spiller.a.pos);
    if (v) { køretøjer.stigInd(v); spiller.a.kravl = false; hud.kikkert(false); skiftByg(false); }
  }
}
// En post tæt på spilleren (til holdkammeraterne i zombie-spillet)
function nærSpilleren() {
  const p = spiller.a.pos, nær = bane.poster.filter(q => Math.hypot(q[0] - p.x, q[1] - p.z) < 16);
  return nær.length ? nær[Math.floor(Math.random() * nær.length)] : [p.x + (Math.random() - 0.5) * 6, p.z + (Math.random() - 0.5) * 6, p.x, p.z];
}
// Små grønne pile over ens holdkammerater, så man ikke skyder efter dem
const pilTekstur = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#7dff6a"; g.strokeStyle = "#0a2a0a"; g.lineWidth = 4; g.beginPath(); g.moveTo(10, 14); g.lineTo(54, 14); g.lineTo(32, 50); g.closePath(); g.fill(); g.stroke(); return new THREE.CanvasTexture(c); })();
function lavBots() {
  const fjerne = bots.filter(b => b.fjern);                          // (de andre spillere online bliver, hvor de er)
  for (const b of bots) scene.remove(b.model);
  killcam.ryd();
  ryddDele(); effekter.ryd(); projektiler.ryd();
  const navne = [...NAVNE].sort(() => Math.random() - 0.5);
  bots = [];
  if (onlineSpil()) { bots = fjerne; for (const f of fjerne) scene.add(f.model); }   // online: kun de andre spillere — ingen botter
  else if (træning()) for (let i = 0; i < 3; i++) bots.push(new Bot(botSpil, "slanger", navne.pop()));   // tre mål ad gangen
  else if (zombieSpil()) {                                          // holdkammeraterne — og zombierne, der venter på at komme frem
    for (let i = 0; i < ind.hold - 1; i++) bots.push(new Bot(botSpil, spiller.hold, navne.pop()));
    for (let i = 0; i < MAKS_SAMTIDIG; i++) { const z = new Bot(botSpil, "zombier", "Zombie"); z.død = true; z.dødTid = -99; z.model.visible = false; bots.push(z); }
  }
  else if (brSpil()) for (let i = 1; i <= ind.hold * 2 + 1; i++) bots.push(new Bot(botSpil, `br${i}`, navne.pop() || `Soldat ${i}`));   // alle mod alle
  else {
    const andet = spiller.hold === "ræve" ? "slanger" : "ræve";       // holdkammeraterne og fjenderne
    for (let i = 0; i < ind.hold - 1; i++) bots.push(new Bot(botSpil, spiller.hold, navne.pop()));
    for (let i = 0; i < ind.hold; i++) bots.push(new Bot(botSpil, andet, navne.pop()));
  }
  const skins = Object.keys(SKINS).filter(id => id !== "standard");
  for (const b of bots) if (b.fig && !b.fjern) b.fig.skin = !b.zombie && Math.random() < 0.35 ? skins[Math.floor(Math.random() * skins.length)] : "standard";   // nogle botter har et skin
  for (const b of bots) if (b.hold === spiller.hold && !b.fjern) {
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
  if (d.nærkamp) return botHug(skytte, o, ret, v);                 // (kun botterne "skyder" med kniven — spilleren bruger knivHug)
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
    if (ramte && skytte === spiller) { hud.ramt(ramte.hoved, ramte.dræbt); Lyd.ramt(ramte.hoved); (træning() ? træningTal : stat).træf++; }
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
    const fra = o.clone().addScaledVector(r, 0.7).add(new THREE.Vector3(0, -0.15, 0));
    if (skytte === spiller) { if (Math.random() < 0.6) effekter.sporFra(hånd.munding(kamera, tmpM), slut); }
    else effekter.sporFra(fra, slut);
    killcam.spor(fra, slut, tid, skytte);                          // (så det også kan ses i killcam)
  }
  if (ramt) return { hoved: ramt.del === "hoved", dræbt: træfOffer(skytte, ramt.k, ramt.del, ramt.lem, v, maks, r, slut) };
  if (væg) {
    if (!væg.kasse.ingenHul) effekter.hul(slut, væg.normal);
    if (væg.kasse.byg) byggeri.skad(væg.kasse.byg, v.d.skade);       // (en bygget del tager skade)
    effekter.nedslag(slut, væg.normal, væg.kasse.mat, v.d.hagl ? 0.4 : 1);
    if (skytte !== spiller && slut.distanceTo(kamera.position) < 3) Lyd.nærSkud(slut);
  }
  return null;
}
// En kugle eller pil rammer en kæmper: skade, blod — og måske flyver en arm, et ben eller hovedet af
function træfOffer(skytte, offer, del, lem, v, afstand, r, punkt) {
  if (skytte?.fjern) return false;                                  // (online: en anden spillers skud gør kun skade over nettet)
  const s = skade(v, del, offer, afstand), hoved = del === "hoved";
  if (punkt) effekter.blod(punkt, r, verden, hoved ? 1.4 : 1);
  const skud = { r: r.clone(), del, lem, kraft: (KRAFT[v.d.klasse] || 3) * (hoved ? 1.25 : 1), navn: v.d.navn };
  const dræbt = offer === spiller ? spillerRamt(s, skytte, skud) : offer.ramt(s, skytte, skud);
  if (dræbt) drab(skytte, offer, v, hoved);
  return dræbt;
}
// Skade fra en eksplosion (eller andet uden kugle)
function skadFra(offer, s, skytte, skud, navn, hoved = false) {
  if (offer.død || skytte?.fjern) return false;                     // (online: en anden spillers granat gør kun skade over nettet)
  if (skud && !skud.navn) skud.navn = navn;
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
  if (køretøjer.kører) { spiller.a.pos.copy(køretøjer.stigUd()); spiller.a.forrige.copy(spiller.a.pos); Lyd.motorLyd(null); }   // (man falder ud af køretøjet)
  spiller.død = true; spiller.dødsfald++; dødTid = tid; stime = 0; stat.død++; byggeri.aktiv = false;
  if (brSpil()) { brPlads = br.tilbage() + 1; br.landet(spiller); }   // (battle royale: din placering)
  if (onlineSpil()) online.send({ k: "død", af: fra?.fjern ? fra.id : null, våben: skud?.navn || "", hoved: skud?.del === "hoved", lem: skud?.lem || null, r: skud?.r ? til3(skud.r) : null });   // (online: alle får det at vide)
  if (egneLemmer()) spillerFig.falder(skud, scene, verden, new THREE.Vector3(spiller.a.vel.x, 0, spiller.a.vel.z), botSpil.delLyd);   // du falder fra hinanden
  dræber = fra !== spiller && !fra.storm ? fra : null; dødSyn = { yaw: spiller.a.yaw, pitch: spiller.a.pitch };
  killcamVent = ind.killcam && dræber && !træning() ? tid + 1.2 : null;
  const med = fra.våben?.d ? ` med ${fra.våben.d.navn}` : "", rest = fra !== spiller && fra.liv > 0 ? ` · ${Math.ceil(fra.liv)} liv tilbage` : "";
  const efter = brSpil() ? `du blev nr. ${brPlads}` : bombeSpil() ? "du ser med til næste runde (klik: en anden)" : zombieSpil() ? "du kommer tilbage i næste bølge (klik: se med hos en anden)" : `tilbage om ${genopståTid()}`;
  hud.død(`${fra === spiller ? "Du ramte dig selv" : `Du blev ramt af <b class="${fra.hold}">${fra.navn}</b>${med}${rest}`} · ${efter}`); hud.kikkert(false);
  return true;
}
// Spilleren mister en arm (så kun pistol, kniv og granater — uden arme ingenting) eller et ben (så kravler man)
function spillerMister(lem, skud) {
  spillerFig.skydAf(lem, skud, scene, verden, new THREE.Vector3(spiller.a.vel.x, 0, spiller.a.vel.z), botSpil.delLyd);
  if (lem.startsWith("ben")) { spiller.a.kravl = true; hud.besked("Du mistede et ben — nu må du kravle!", 2200); return; }
  if (!spillerFig.harArm()) { hud.besked("Ingen arme tilbage…", 2200); skiftVåben("ingen"); return; }
  hud.besked("Du mistede en arm — kun pistol, kniv og granater nu", 2200);
  if (!kanBruge(aktivt)) skiftVåben(plads(2) in våbenSæt ? plads(2) : "kniv");
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
  if (drabsmand.hold in point) point[drabsmand.hold]++;
  hud.drabLinje(drabsmand, offer, v.d.navn, hoved, drabsmand === spiller || offer === spiller);
  if (drabsmand === spiller && bygTil()) givTræ(BYG_DRAB);          // træ for hvert drab
  if (drabsmand === spiller && !træning()) {                         // (træningen tæller ikke med i statistikken)
    stat.drab++; if (hoved) stat.hoved++; stime++; stat.bedsteStime = Math.max(stat.bedsteStime, stime);
    if (stime >= 3 && stime % 1 === 0) hud.besked(stime >= 5 ? `🔥 ${stime} i træk!` : `${stime} i træk`, 1500);
    const snig = v.d?.klasse === "snig" || v.id === "jagt";
    belønning(hoved ? 150 : 100, hoved && ["hoveder", 1], v.d?.nærkamp && ["kniv", 1], snig && ["snig", 1], stime === 5 && ["stime", 1]);
  }
  if (bombeSpil()) { givPenge(drabsmand, drabPenge(v.d)); if (drabsmand === spiller) hud.penge(drabPenge(v.d)); }   // penge for drabet
  if (ræs()) ræsDrab(drabsmand, offer, v);
  else if (træning()) { if (point.ræve >= TRÆNING) slutKamp(); }        // træning: efter 30 mål er det slut
  else if (bombeSpil() || zombieSpil() || brSpil() || onlineSpil()) { /* runderne (bombe.js), bølgerne (zombier.js) eller den sidste tilbage (br.js) afgør det */ }
  else if (point[drabsmand.hold] >= MÅL) slutKamp();
}
// XP og udfordringer: et lille "+100 XP" ved sigtekornet — og en besked, når man stiger et niveau eller klarer en udfordring
function belønning(xp, ...udfordringer) {
  const klaret = [];
  if (xp) {
    hud.xp(xp);
    const r = profil.giv(xp); klaret.push(...r.klaret);
    if (r.op) hud.besked(`⭐ Niveau ${r.op.niveau} — ${r.op.rang}`, 2600);
  }
  for (const u of udfordringer) if (u) klaret.push(...profil.tæl(u[0], u[1]));
  for (const u of klaret) setTimeout(() => hud.besked(`🏆 ${u.navn} klaret — nyt skin: ${SKINS[u.skin].navn}`, 3200), 1200);
}
// Våbenræs: drabsmanden får det næste våben (og den, der bliver stukket med en kniv, går et våben tilbage).
// Stillingen er det bedste våben på hvert hold
function ræsDrab(drabsmand, offer, v) {
  if (v.d?.nærkamp && (offer.niveau || 0) > 0) { offer.niveau--; if (offer === spiller) hud.besked("Du blev stukket — et våben tilbage", 1800); }
  drabsmand.niveau = (drabsmand.niveau || 0) + 1;
  for (const h of ["ræve", "slanger"]) point[h] = Math.max(0, ...kampfolk.filter(k => k.hold === h).map(k => k.niveau || 0));
  if (drabsmand.niveau >= RÆKKE.length) { vinder = drabsmand; slutKamp(); return; }
  const ny = ræsVåben(drabsmand);
  if (drabsmand === spiller) { udrust(); hud.besked(`${VÅBEN[ny].navn} · ${drabsmand.niveau + 1} af ${RÆKKE.length}${ny === "kniv" ? " — vind med kniven!" : ""}`, 1800); }
  else drabsmand.giv(ny);
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
  if (!bedst) {
    const væg = verden.stråle(o, r, v.d.rækkevidde); if (!væg) return;
    effekter.nedslag(o.clone().addScaledVector(r, væg.t), væg.normal, væg.kasse.mat, 0.5);
    if (væg.kasse.byg) byggeri.skad(væg.kasse.byg, v.d.skade * 1.5);  // hug en bygget del i stykker
    else if (bygTil()) givTræ(v.id === "hakke" ? 12 : 6);            // eller høst træ (som med hakken i Fortnite)
    return;
  }
  const s = skade(v, bedst.del, bedst.k, bedst.t, stik);
  hud.ramt(false, false); Lyd.ramt(false);
  effekter.blod(o.clone().addScaledVector(r, bedst.t), r, verden, 0.8);
  if (bedst.k.ramt(s, spiller, { r, del: bedst.del, lem: bedst.lem, kniv: true, kraft: KRAFT.kniv * (v.id === "hakke" ? 2 : 1) })) { hud.ramt(false, true); drab(spiller, bedst.k, v, false); }
}

// Træning: et nyt sted til et mål — 8 til 35 meter væk, hvor spilleren kan se det, og ikke oven i de andre mål
function målSted(bot) {
  const øje = new THREE.Vector3(spiller.a.pos.x, spiller.a.pos.y + 1.6, spiller.a.pos.z), knuder = bane.knuder;
  let reserve = null;
  for (let i = 0; i < 80; i++) {
    const k = knuder[Math.floor(Math.random() * knuder.length)], d = Math.hypot(k.x - øje.x, k.z - øje.z);
    if (d < 8 || d > 35 || bots.some(b => b !== bot && !b.død && Math.hypot(b.a.pos.x - k.x, b.a.pos.z - k.z) < 3)) continue;
    reserve ??= [k.x, k.z];
    const mål = new THREE.Vector3(k.x, k.y + 1.3, k.z), r = mål.clone().sub(øje), l = r.length();
    if (!verden.stråle(øje, r.divideScalar(l), l)) return [k.x, k.z];
  }
  return reserve;
}
// En bot hugger med kniven: den nærmeste fjende lige foran, inden for klingens rækkevidde
function botHug(bot, o, ret, v) {
  const r = retningsvektor(ret.yaw, ret.pitch, new THREE.Vector3());
  let bedst = null;
  for (const k of kampfolk) {
    if (k === bot || k.død || k.hold === bot.hold) continue;
    const h = træfKæmper(k, o, r, v.d.rækkevidde + 0.3);
    if (h && (!bedst || h.t < bedst.t)) bedst = { k, ...h };
  }
  if (o.distanceTo(kamera.position) < 8) Lyd.kniv();
  if (!bedst) { if (bot.blokeret && byggeri.afstand(bot.blokeret, bot.a.pos) < v.d.rækkevidde + 0.6) byggeri.skad(bot.blokeret, v.d.skade); return; }   // (en bygget væg i vejen)
  const s = skade(v, bedst.del, bedst.k, bedst.t, false), skud = { r, del: bedst.del, lem: bedst.lem, kniv: true, kraft: KRAFT.kniv };
  effekter.blod(o.clone().addScaledVector(r, bedst.t), r, verden, 0.8);
  if (bedst.k === spiller ? spillerRamt(s, bot, skud) : bedst.k.ramt(s, bot, skud)) drab(bot, bedst.k, v, false);
}

// ---------- Input: tastatur og mus ----------
const taster = new Set();
let skydHoldt = false, skydLåst = false, hjulHop = 0, musX = 0, musY = 0;
addEventListener("keydown", e => {
  if (!iGang || pause) return;
  if (["Tab", "Space"].includes(e.code) || e.ctrlKey) e.preventDefault();   // Ctrl er duk: ingen Ctrl+S, Ctrl+D osv. midt i kampen
  if (e.repeat) return;
  taster.add(e.code);
  if (e.code === "KeyF" && vejr.nat) { lygteTændt = !lygteTændt; Lyd.klik(); }
  if (e.code === "KeyE" && brSpil() && !spiller.død && !spiller.a.svæver) { const k = br.kisteNær(spiller.a.pos); if (k) { br.åbn(k, spiller); return; } }
  if (e.code === "KeyG" && bygTil() && !spiller.død && !køretøjer.kører && !spiller.a.svæver) { skiftByg(!byggeri.aktiv); return; }
  if (byggeri.aktiv && /^Digit[123]$/.test(e.code)) { byggeri.valgt = DELE[+e.code.slice(5) - 1]; byggeri.slip(); Lyd.klik(); return; }
  if (byggeri.aktiv && (e.code === "Digit4" || e.code === "KeyQ")) skiftByg(false);
  if (e.code === "KeyE" && !spiller.død && !spiller.a.svæver && (køretøjer.kører || (køretøjer.nærmeste(spiller.a.pos) && !påBombeplads()))) { køretøjE(); return; }
  if (e.code === "KeyB" && bombeSpil() && !spiller.død) { visKøb(købGruppe === undefined ? null : undefined); return; }
  if (købGruppe !== undefined && /^Digit\d$/.test(e.code)) { vælgKøb(+e.code.slice(5)); return; }   // (købsmenuen er åben)
  if (e.code === "KeyR" && !spiller.død) { const v = vb(); if (genlad(v)) { hånd.genladStart(v.d.genlad); Lyd.genlad(v.d.genlad); hud.kikkert(false); } }
  const u = ind.udrustning;
  let ny = { Digit1: plads(1), Digit2: plads(2), Digit3: plads(3) }[e.code] || (e.code === "KeyQ" ? forrige : null);
  if (e.code === "Digit4") ny = næsteGranat();
  if (ny && ny !== aktivt && våbenSæt[ny] && !spiller.død && kanBruge(ny)) skiftVåben(ny);
});
addEventListener("keyup", e => taster.delete(e.code));
// ---------- Købsmenuen i Bombe (penge.js): B åbner og lukker, et tal vælger en gruppe og så en ting ----------
let købGruppe;                                                     // undefined = lukket, null = grupperne, ellers den åbne gruppe
function visKøb(gruppe) {
  if (gruppe !== undefined && !bombe.kanKøbe) { hud.besked("Der kan kun købes i starten af runden", 1500); gruppe = undefined; }
  købGruppe = gruppe;
  $("købsmenu").classList.toggle("skjult", gruppe === undefined);
  if (gruppe !== undefined) tegnKøbsmenu($("købsmenu"), spiller, gruppe);
}
function vælgKøb(n) {
  if (købGruppe === null) { if (n >= 1 && n <= GRUPPER.length) visKøb(n - 1); return; }
  if (n === 0) return visKøb(null);
  const id = GRUPPER[købGruppe].ting[n - 1];
  if (!id || !bombe.kanKøbe) return;
  if (!køb(spiller, id)) { Lyd.klik(); return; }
  Lyd.bip(1200);
  if (id === "vest") spiller.panser = 100;
  else { const før = aktivt; udrust(); const ny = spiller.udstyr.primær === id || spiller.udstyr.sekundær === id ? id : før; if (våbenSæt[ny] && ny !== aktivt) skiftVåben(ny); }
  tegnKøbsmenu($("købsmenu"), spiller, købGruppe);
}
// Plads 4: den næste granat, der er nogen tilbage af (tryk igen for den anden slags)
function næsteGranat() {
  const g = mineGranater().map(x => `granat_${x}`).filter(id => våbenSæt[id]?.skud > 0);
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
  if (iGang && !pause && spiller.død && (bombeSpil() || zombieSpil()) && e.button === 0) { følgNr++; return; }   // død i en bomberunde: se med hos en anden
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
    const før = spiller.a.pos.clone(), frys = bombeSpil() && bombe.fryser;   // (i starten af en bomberunde står alle stille)
    if (spiller.a.svæver) br.svæv(spiller, { frem: frys ? 0 : frem, side }, dt);   // i glideflyet (battle royale)
    else if (køretøjer.kører) {                                    // i et køretøj: W/S er gas og bremse, A/D styrer — og man sidder i førersædet
      const drejet = køretøjer.kører.yaw; køretøjer.tick(dt, frys ? 0 : frem, side);
      spiller.a.yaw += køretøjer.kører.yaw - drejet;                // (man kigger med rundt, når køretøjet drejer)
      const p = køretøjer.førerPos(førerPlads), t = køretøjer.kører.t;
      spiller.a.forrige.copy(spiller.a.pos); spiller.a.pos.set(p.x, p.y + t.øje - øjeHøjde({ duk: 0, kravl: false }), p.z);
      spiller.a.vel.set(-Math.sin(køretøjer.kører.yaw) * køretøjer.kører.fart, 0, -Math.cos(køretøjer.kører.yaw) * køretøjer.kører.fart); spiller.a.duk = 0; spiller.a.jord = true;
    } else bevæg(spiller.a, frys ? { frem: 0, side: 0, hop: false, gå, duk } : { frem, side, hop, gå, duk }, dt, verden, maks);
    // fodtrin (kun når man løber — gå og duk er lydløst), og botterne kan høre dem
    const fart = Math.hypot(spiller.a.vel.x, spiller.a.vel.z);
    if (køretøjer.kører && fart > 1) {                             // motoren kan høres langt væk
      trinVej += før.distanceTo(spiller.a.pos);
      if (trinVej > 4) { trinVej = 0; for (const b of bots) if (b.a.pos.distanceTo(spiller.a.pos) < 30) b.hør(spiller.a.pos, spiller); }
    } else if (spiller.a.jord && !gå && !duk && fart > maks * 0.55 && !køretøjer.kører) {
      trinVej += før.distanceTo(spiller.a.pos);
      if (trinVej > 1.9) { trinVej = 0; Lyd.trin(null, 0.55); for (const b of bots) if (b.a.pos.distanceTo(spiller.a.pos) < 16) b.hør(spiller.a.pos, spiller); }
    }
    if (spiller.a.landet) { spiller.a.landet = 0; Lyd.landing(); hånd.land = 1; }
    // skyd: aftrækkeren (automat, ét skud pr. klik, salver og minigunnens opspin står i vaaben.js)
    if (byggeri.aktiv) { if (skydHoldt && !frys) byggeri.prøvByg(spiller.a, tid); else byggeri.slip(); }   // byggetilstand: venstre klik bygger
    else if (v.d.klasse === "ingen" || frys || køretøjer.kører || spiller.a.svæver) { /* ingen arme, frysetid, i et køretøj eller i luften: intet at skyde med */ }
    else if (v.d.nærkamp) { if (skydHoldt && v.klar <= 0) knivHug(false); }
    else if (v.d.granat) { if (skydHoldt && !skydLåst) { skydLåst = true; kastGranat(false); } }
    else {
      if (skydHoldt && v.skud <= 0 && v.genlader <= 0 && v.kø === 0 && !skydLåst) {     // tomt: et klik, og så genlad
        Lyd.klik(); skydLåst = true; if (genlad(v)) { hånd.genladStart(v.d.genlad); Lyd.genlad(v.d.genlad); }
      }
      if (aftrækker(v, skydHoldt, dt)) spillerSkyder();
    }
    if (!skydHoldt) skydLåst = false;
  } else if (brSpil()) { if (tid - dødTid > genopståTid()) slutBR(false); }   // battle royale: ingen genopstand
  else if (!bombeSpil() && !zombieSpil() && tid - dødTid > genopståTid()) genopstå();
  else { const s = genopståTid() - (tid - dødTid); hud.død(hud.el.død.innerHTML.replace(/tilbage om \d/, `tilbage om ${Math.ceil(s)}`)); }
  for (const b of bots) {
    if (!(bombeSpil() && bombe.fryser)) b.tick(dt);
    if (zombieSpil()) { if (b.zombie && b.død && tid - b.dødTid > 1.5 && zombier.måKomme()) b.spawn(); }   // zombierne kommer frem, så længe bølgen varer
    else if (b.død && !b.fjern && !bombeSpil() && !brSpil() && tid - b.dødTid > (træning() ? 0.6 : 3) && !(træning() && point.ræve + bots.filter(x => !x.død).length >= TRÆNING)) b.spawn();
  }
  deleTrin(dt);                                                    // hoveder, arme og ben, der er skudt af, falder og bliver liggende
  projektiler.trin(dt);
  if (bombeSpil() && iGang) bombe.tick(dt, taster.has("KeyE") && !spiller.død);
  if (zombieSpil() && iGang) zombier.tick(dt);
  if (brSpil() && iGang) br.tick(dt);
  if (onlineSpil() && iGang) online.tick(dt, minOnlineTilstand);     // (ens egen tilstand til de andre)
  killcam.optag(tid);
  if (kampSlut <= 0 && !træning() && !bombeSpil() && !zombieSpil() && !brSpil() && !onlineSpil()) slutKamp();
}
function spillerSkyder() {
  const v = vb();
  const ret = skudRetning(v, spiller.a, spiller.a.yaw, spiller.a.pitch);
  efterSkud(v);
  skyd(spiller, kamera.position.clone(), ret, v);
  if (onlineSpil()) online.skud({ k: "skud", o: til3(kamera.position), r: [ret.yaw, ret.pitch], v: v.id }, tid);   // (de andre ser sporet)
  hånd.skud(v.d); Lyd.skud(v.d); (træning() ? træningTal : stat).skud++;
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
  if (onlineSpil()) online.send({ k: "granat", type: v.d.granat, o: til3(o), fart: til3(fart) });
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
  tegnBillede(nu);
}
function tegnBillede(nu) {
  const dt = Math.max(0, Math.min(0.1, (nu - sidst) / 1000)); sidst = nu;   // (aldrig baglæns, og højst 0,1 s ad gangen)
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
  if (spiller.død && dræber) {                                     // død: kameraet drejer langsomt hen mod den, der dræbte dig
    const dx = dræber.a.pos.x - kamera.position.x, dz = dræber.a.pos.z - kamera.position.z, dy = dræber.a.pos.y + 1.5 - kamera.position.y;
    const k = Math.min(1, dt * 3);
    dødSyn.yaw += vinkel(Math.atan2(-dx, -dz) - dødSyn.yaw) * k; dødSyn.pitch += (Math.atan2(dy, Math.hypot(dx, dz)) - dødSyn.pitch) * k;
    kamera.rotation.set(dødSyn.pitch, dødSyn.yaw, dødFald * 0.25);
  } else kamera.rotation.set(a.pitch + rp + slag * 0.05, a.yaw + ry + slagYaw * slag, dødFald * 0.6);
  if (killcamVent !== null && tid >= killcamVent) {                // killcam: start afspilningen
    killcamVent = null;
    if (killcam.start(dræber, dødTid)) deleSynlige(false);
  }
  if (killcam.aktiv && !killcam.tegn(dt, kamera)) deleSynlige(true);  // (kameraet sidder i drabsmandens øjne)
  const killVåben = killcam.aktiv && !killcam.aktiv.dræber.zombie ? killcam.aktiv.våben : null;
  if (killVåben) {                                                 // drabsmandens våben i hånden (med hans skin)
    if (killHånd.aktiv !== killVåben) { killHånd.vis(killVåben, 0.01); killHånd.træk = 0; }
    const skin = killcam.aktiv.dræber.fig?.skin || "standard"; if (killHånd.skin !== skin) killHånd.sætSkin(skin);
    killHånd.opdater(dt, { fart: (killcam.aktiv.fart || 0) / 6, jord: true, musX: 0, musY: 0, duk: 0, skjul: false, sigte: false, landet: false });
  }
  hud.killcam(killcam.info);
  const venner = spiller.død && (bombeSpil() || zombieSpil()) && !killcam.aktiv && killcamVent === null && tid - dødTid > 2.2 ? bots.filter(b => b.hold === spiller.hold && !b.død) : [];
  if (venner.length) {                                             // død i en bomberunde: kameraet følger en holdkammerat bagfra
    const ven = venner[følgNr % venner.length], yaw = ven.a.yaw;
    kamera.position.set(ven.a.pos.x + Math.sin(yaw) * 2.6, ven.a.pos.y + 2.2, ven.a.pos.z + Math.cos(yaw) * 2.6);
    kamera.lookAt(ven.a.pos.x - Math.sin(yaw) * 3, ven.a.pos.y + 1.3, ven.a.pos.z - Math.cos(yaw) * 3);
  }
  const zoomet = v && v.kikkert > 0 && !spiller.død, kikkert = zoomet && v.d.sigte !== "sigte";   // "sigte": man kigger ned over våbnet (ingen kikkert)
  const fov = zoomet ? v.d.zoom[v.kikkert - 1] : grundFov();
  if (Math.abs(kamera.fov - fov) > 0.01) { kamera.fov = fov; kamera.updateProjectionMatrix(); }
  himmel.position.copy(kamera.position);
  bane.opdater?.(dt, kamera.position);                            // fx sneen, der falder
  vejr.opdater(dt, kamera, kampfolk, lygteTændt && !spiller.død);  // regn, sne eller sand — og lommelygterne om natten
  bombe.tegn(tid);                                                 // bombens lampe blinker
  køretøjer.tegn();
  byggeri.tegn(dt, !spiller.død && iGang ? spiller.a : null);     // det, der vokser frem, og hvor den næste del kommer
  br.tegn(dt, tid, spiller);                                       // stormvæggen, kisterne og glideflyet
  hud.byg(bygTil() && iGang && !spiller.død, byggeri.aktiv, byggeri.valgt, byggeri.træ, PRIS);
  if (køretøjer.kører) Lyd.motorLyd(køretøjer.kører.fart, køretøjer.kører.type === "snescooter" ? 1.3 : 0.8);
  const nær = !spiller.død && !køretøjer.kører && !påBombeplads() && !spiller.a.svæver && køretøjer.nærmeste(spiller.a.pos);
  const kiste = brSpil() && !spiller.død && !køretøjer.kører && !spiller.a.svæver && br.kisteNær(spiller.a.pos);
  hud.køreHjælp(spiller.a.svæver && !spiller.død ? "🪂 W: hurtigere frem og ned · S: bremse · musen styrer" : kiste ? "E: åbn kisten" : køretøjer.kører ? `E: stig ud · W/S: gas og bremse · A/D: styr · ${Math.round(Math.abs(køretøjer.kører.fart) * 3.6)} km/t`
    : nær ? `E: stig ind i ${nær.type === "snescooter" ? "snescooteren" : "gaffeltrucken"}` : "");
  // botterne, hånden og effekterne
  for (const b of bots) b.tegn(Math.min(1, alfa), dt);
  deleTegn(); projektiler.tegn(dt);
  if (spillerFig && !spiller.død) {                                // den usynlige figur følger spilleren (til at blive ramt)
    spillerFig.model.position.set(p.x, p.y, p.z); spillerFig.model.rotation.y = a.yaw;
    const c = Math.cos(a.yaw), sn = Math.sin(a.yaw);
    spillerFig.poser({ fart: Math.hypot(a.vel.x, a.vel.z), vx: c * a.vel.x - sn * a.vel.z, vz: sn * a.vel.x + c * a.vel.z, duk: a.duk, pitch: a.pitch, kravl: !!a.kravl, våben: aktivt, dt });
  }
  const fart = Math.hypot(a.vel.x, a.vel.z);
  hånd.opdater(dt, { fart: v ? fart / v.d.fart : 0, jord: a.jord, musX, musY, duk: a.duk, skjul: kikkert || spiller.død || !!køretøjer.kører || byggeri.aktiv || !!spiller.a.svæver, sigte: zoomet && !kikkert, spin: v?.d.opspin ? v.spin / v.d.opspin : 0, landet: false });
  musX = musY = 0;
  effekter.opdater(dt); hud.opdater(dt);
  // skærmen
  if (iGang && v) {
    hud.liv(spiller.liv, spiller.panser); hud.ammo(v, ræs() ? `${(spiller.niveau || 0) + 1}/${RÆKKE.length}` : "");
    if (træning()) hud.stilling(point.ræve, TRÆNING, tid);
    else if (zombieSpil()) { const z = zombier.status(); hud.stilling(z.bølge, z.tilbage, tid); }
    else if (bombeSpil()) {
      const st = bombe.status(); hud.stilling(st.ræve, st.slanger, st.ur); hud.bombe(st, spiller);
      if (købGruppe !== undefined && (!bombe.kanKøbe || spiller.død)) visKøb(undefined);
    }
    else if (onlineSpil()) hud.stilling(point.ræve, point.slanger, tid);   // (online: ingen slut — uret tæller op)
    else if (brSpil()) { const st = br.stormTekst(); hud.stilling(`👤 ${br.tilbage()}`, `☠ ${spiller.drab}`, st.sek); }
    else hud.stilling(point.ræve, point.slanger, kampSlut);
    if (brSpil()) { hud.storm(br.stormTekst().tekst, !spiller.død && br.iStormen(spiller.a.pos)); br.tegnKort($("kort"), spiller.a); } else hud.storm(null, false);
    hud.pengeTal(bombeSpil() ? spiller.penge : null, bombeSpil() && bombe.kanKøbe && !spiller.død);
    // sigtekornet: væk når man sigter, og altid væk på snigskytterne (som i CS) — rødpunktet, når man kigger gennem et rødpunktsigte
    hud.sigte(unøjagtighed(v, a) + (v.d.spredning || 0), kamera.fov * G, innerHeight, !spiller.død && !zoomet && !(v.d.zoom && v.d.sigte !== "sigte"));
    hud.prik(zoomet && !kikkert && v.d.prik && hånd.sigte > 0.85);
    hud.kikkert(kikkert); hud.fart(ind.fart ? fart : null);
    // granaterne (ingen i våbenræs og træning)
    hud.granater(ræs() || træning() ? [] : mineGranater().map(g => ({ ikon: VÅBEN[`granat_${g}`].ikon, antal: våbenSæt[`granat_${g}`]?.skud ?? 0, aktiv: aktivt === `granat_${g}` })));
    hud.tavle(taster.has("Tab"), kampfolk, HOLD, brSpil());
  }
  kamera.getWorldDirection(frem); Lyd.lytter(kamera.position, frem, op);
  renderer.clear(); renderer.render(scene, kamera);
  if (!kikkert && !spiller.død && iGang) { renderer.clearDepth(); renderer.render(hånd.scene, hånd.kamera); }
  else if (killVåben) { renderer.clearDepth(); renderer.render(killHånd.scene, killHånd.kamera); }
}
function tilpas() {
  renderer.setSize(innerWidth, innerHeight, false);
  kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix(); hånd.tilpas(kamera.aspect); killHånd.tilpas(kamera.aspect);
}
addEventListener("resize", tilpas); tilpas();

// ---------- Kampen: start, pause og slut ----------
function startKamp() {
  point = { ræve: 0, slanger: 0 }; tid = 0; kampSlut = KAMPTID; spiller.drab = spiller.dødsfald = spiller.hoveder = 0; stime = 0;
  spiller.niveau = 0; vinder = null; træningTal = { skud: 0, træf: 0 }; profil.kampXp = 0;
  br.ryd();
  const hold = træning() ? "ræve" : brSpil() ? "br0" : ind.side;     // det hold, man har valgt i menuen (battle royale: sit eget)
  if (hold !== spiller.hold) { spiller.hold = hold; lavSpillerFig(hold); }
  byggeri.ryd(); byggeri.træ = bygTil() ? BYG_START : 0;          // (alt det byggede fra sidste kamp forsvinder)
  lavBots(); botSpil.bombe = bombeSpil() ? bombe : null; visMærker(bombe, bombeSpil()); visKøb(undefined);
  if (bombeSpil()) bombe.startKamp();
  else if (zombieSpil()) { bombe.stop(); genopstå(); for (const b of bots) if (!b.zombie) b.spawn(); zombier.startKamp(); }
  else if (brSpil()) { bombe.stop(); br.start(); brStart(); }
  else if (onlineSpil()) { bombe.stop(); genopstå(); hud.besked(`🌐 Online holdkamp i rummet "${online.ønsket?.rum || ""}"`, 3000); }
  else { bombe.stop(); genopstå(); for (const b of bots) b.spawn(); }
  iGang = true; if (!træning()) stat.kampe++; gemStatistik(stat);
  $("hud").classList.remove("skjult"); $("fortsæt").classList.remove("skjult"); $("start").textContent = "↻ Ny kamp";
  if (!bombeSpil() && !zombieSpil() && !brSpil() && !onlineSpil()) hud.besked(ræs() ? `Våbenræs! Hvert drab giver dig et nyt våben — ${RÆKKE.length - 1} drab, og så vinder du med kniven`
    : træning() ? `Træning! Skyd ${TRÆNING} mål så hurtigt du kan` + (ind.sværhed === "let" ? "" : " — de bevæger sig") : "Holdkamp! Første hold til 50 drab", 3000);   // (bomben har sin egen besked)
}
function slutKamp() {
  if (!iGang) return;
  iGang = false; pause = true;
  if (træning()) return slutTræning();
  if (zombieSpil()) return slutZombier();
  const bedst = point.ræve > point.slanger ? "ræve" : "slanger";
  const vandt = vinder ? vinder.hold === spiller.hold : bedst === spiller.hold, uafgjort = !vinder && point.ræve === point.slanger;
  if (vandt) stat.sejre++;
  gemStatistik(stat);
  belønning(vandt ? 600 : 200, vandt && ["sejre", 1], vinder === spiller && ["ræs", 1]);
  document.exitPointerLock?.();
  $("slutOverskrift").textContent = vinder ? (vinder === spiller ? "🏆 Du vandt våbenræset!" : `${vinder.navn} vandt våbenræset`)
    : uafgjort ? "Uafgjort!" : `${vandt ? "🏆 " : ""}${bedst === "ræve" ? "Ørkenrævene" : "Sandslangerne"} vandt!`;
  $("slutTekst").innerHTML = `${point.ræve} – ${point.slanger}<br>Du: ${spiller.drab} drab, ${spiller.dødsfald} gange død, ${spiller.drab ? Math.round(100 * spiller.hoveder / spiller.drab) : 0} % hovedskud` + xpLinje();
  $("slut").classList.remove("skjult"); $("hud").classList.add("skjult"); $("menu").classList.add("skjult");
}
// Zombierne har vundet: hvor mange bølger I klarede (og en rekord)
function slutZombier() {
  pause = true;
  stat.zombier = Math.max(stat.zombier || 0, zombieResultat); gemStatistik(stat);
  document.exitPointerLock?.();
  $("slutOverskrift").textContent = "🧟 Zombierne fik jer";
  $("slutTekst").innerHTML = `I klarede ${zombieResultat} ${zombieResultat === 1 ? "bølge" : "bølger"} · rekord: ${stat.zombier}<br>Du: ${spiller.drab} zombier` + xpLinje();
  $("slut").classList.remove("skjult"); $("hud").classList.add("skjult"); $("menu").classList.add("skjult");
}
// Battle royale er slut: din placering (nr. 1 er en sejr)
function slutBR(vandt) {
  if (!iGang) return;
  iGang = false; pause = true;
  const plads = vandt ? 1 : brPlads || bots.length + 1, alle = bots.length + 1;
  if (vandt) stat.sejre++;
  stat.royale = Math.min(stat.royale || 99, plads); gemStatistik(stat);
  belønning(vandt ? 1000 : plads <= 3 ? 400 : 150, vandt && ["royale", 1], vandt && ["sejre", 1]);
  document.exitPointerLock?.();
  $("slutOverskrift").textContent = vandt ? "🏆 Sejr! Du er den sidste tilbage" : `Du blev nr. ${plads} af ${alle}`;
  $("slutTekst").innerHTML = `Du: ${spiller.drab} drab, ${spiller.drab ? Math.round(100 * spiller.hoveder / spiller.drab) : 0} % hovedskud<br>Bedste placering: nr. ${stat.royale}` + xpLinje();
  $("slut").classList.remove("skjult"); $("hud").classList.add("skjult"); $("menu").classList.add("skjult");
}
// Træningen er slut: tiden, træfferne og hovedskuddene — og en rekord for hver sværhed
function slutTræning() {
  pause = true;
  const { skud, træf } = træningTal;
  stat.træning ??= {};
  const før = stat.træning[ind.sværhed], rekord = point.ræve >= TRÆNING && (!før || tid < før);
  if (rekord) stat.træning[ind.sværhed] = tid;
  gemStatistik(stat);
  if (point.ræve >= TRÆNING) belønning(200, tid < 30 && ["træning", 1]);
  document.exitPointerLock?.();
  $("slutOverskrift").textContent = point.ræve < TRÆNING ? "Træningen blev stoppet" : rekord ? "🏆 Ny rekord!" : "Træning færdig";
  $("slutTekst").innerHTML = `${tid.toFixed(1).replace(".", ",")} sekunder · ${(tid / Math.max(1, point.ræve)).toFixed(2).replace(".", ",")} s pr. mål<br>` +
    `${skud ? Math.round(100 * træf / skud) : 0} % træffere · ${point.ræve ? Math.round(100 * spiller.hoveder / point.ræve) : 0} % hovedskud` +
    (før && !rekord ? `<br>Din rekord: ${før.toFixed(1).replace(".", ",")} sekunder` : "") + xpLinje();
  $("slut").classList.remove("skjult"); $("hud").classList.add("skjult"); $("menu").classList.add("skjult");
}
// Fang musen — med rå bevægelse (uden Windows’ museacceleration), hvis browseren kan, så sigtet er præcist
function lås_mus() {
  Lyd.start();
  // fuld skærm, og browseren må ikke bruge tasterne selv (ellers lukker Ctrl+W fanen, når man dukker og går frem)
  if (ind.fuldskærm && !document.fullscreenElement) document.documentElement.requestFullscreen?.({ navigationUI: "hide" })
    .then(() => navigator.keyboard?.lock?.(["ControlLeft", "ControlRight", "KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyR", "KeyC", "KeyE", "KeyB", "KeyF", "Space", "Tab", "Digit1", "Digit2", "Digit3"]))
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
addEventListener("beforeunload", e => { if (iGang && !planlagtGenstart) { e.preventDefault(); e.returnValue = ""; } });   // (ikke når banen skiftes med vilje)
$("start").addEventListener("click", async () => {
  gemIndst(); $("slut").classList.add("skjult");
  if (onlineSpil() && !online.forbundet && !await forbindOnline()) return;   // online: forbind først
  if (!onlineSpil() && online.ønsket) online.luk();
  startKamp(); lås_mus();
});
$("fortsæt").addEventListener("click", () => { gemIndst(); lås_mus(); });
$("igen").addEventListener("click", () => { $("slut").classList.add("skjult"); startKamp(); lås_mus(); });
$("tilMenu").addEventListener("click", () => { $("slut").classList.add("skjult"); $("fortsæt").classList.add("skjult"); $("start").textContent = "▶ Start kamp"; visMenu(); });
$("klik").addEventListener("click", lås_mus);
hånd.sætSkin(profil.skin); tegnProfil();
$("start").disabled = false; $("start").textContent = "▶ Start kamp";      // banen og modellerne er hentet: klar
// ---------- Menuen ----------
// Online-rækken i menuen: navn og rum (kun når "Online" er valgt)
function visOnline() {
  for (const el of document.querySelectorAll(".kunOnline")) el.classList.toggle("skjult", !onlineSpil());
  if (!kanOnline()) $("onlineStatus").textContent = "Åbn Sigtekorn fra familiens server (fx https://192.168.0.26:8443/spil/sigtekorn/) for at spille online.";
}
{
  const gemt = (() => { try { return JSON.parse(localStorage.getItem(ONLINE) || "{}"); } catch (_) { return {}; } })();
  $("onlineNavn").value = gemt.navn || ""; $("onlineRum").value = gemt.rum || "familie";
  $("onlineForbind").addEventListener("click", () => { forbindOnline(); });
  visOnline();
  let igen = null; try { igen = JSON.parse(sessionStorage.getItem(ONLINE_IGEN) || "null"); sessionStorage.removeItem(ONLINE_IGEN); } catch (_) {}
  if (igen && onlineSpil()) { $("onlineNavn").value = igen.navn; $("onlineRum").value = igen.rum; forbindOnline(); }   // (efter et baneskifte)
}
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
knapper("valgSpil", [["hold", "Holdkamp"], ["bombe", "Bombe"], ["ræs", "Våbenræs"], ["zombier", "🧟 Zombier"], ["br", "🪂 Battle royale"], ["online", "🌐 Online"], ["træning", "Træning"]], "spiltype", visOnline);
knapper("valgSide", [["ræve", "🦊 Ørkenrævene"], ["slanger", "🐍 Sandslangerne"]], "side");
// sigtekornets farve (som i CS kan man vælge den, man bedst kan se)
const sætSkFarve = () => document.documentElement.style.setProperty("--sk", ind.skFarve);
const SK_FARVER = [["#5dff6a", "Grøn"], ["#ffe640", "Gul"], ["#40e8ff", "Cyan"], ["#ff4fd8", "Lyserød"], ["#ffffff", "Hvid"]];
knapper("valgSkFarve", SK_FARVER, "skFarve", sætSkFarve);
[...$("valgSkFarve").children].forEach((b, i) => { b.style.boxShadow = `inset 0 -4px 0 ${SK_FARVER[i][0]}`; });   // en streg i farven
sætSkFarve();
lavUdrustning($("udrustning"), $("vælger"), ind, gemIndst, () => Lyd.bip(), genstart);
knapper("valgFart", [[false, "Nej"], [true, "Ja (u/s)"]], "fart");
knapper("valgFuld", [[true, "Ja"], [false, "Nej"]], "fuldskærm");
knapper("valgLemmer", [[true, "Ja"], [false, "Nej"]], "egneLemmer");
knapper("valgKillcam", [[true, "Ja"], [false, "Nej"]], "killcam");
knapper("valgByg", [[true, "Ja (G)"], [false, "Nej"]], "byg");
knapper("valgVejr", [["dag", "☀️ Dag"], ["nat", "🌙 Nat"], ["storm", { sand: "🌪️ Sandstorm", regn: "🌧️ Regn og torden", sne: "❄️ Snestorm" }[bane.storm]]], "vejr", genstart);
skyder("følsomhed", "følsomhed", v => v.toFixed(2));
skyder("synsfelt", "synsfelt", v => `${v}°`);
skyder("lydstyrke", "lydstyrke", v => `${Math.round(v * 100)} %`);
function visMenu() { $("statLinje").textContent = statistikTekst(stat); tegnProfil(); $("menu").classList.remove("skjult"); }
// XP i den kamp, man lige har spillet — og niveauet
const xpLinje = () => { const n = profil.niveau; return `<br><span class="xpLinje">+${profil.kampXp} XP · niveau ${n.niveau} · ${n.rang}</span>`; };
// Profilen øverst i menuen: niveau, rang og hvor langt der er til næste niveau
function tegnProfil() {
  const n = profil.niveau;
  $("profil").innerHTML = `<span class="rang">⭐ Niveau ${n.niveau} · <b>${n.rang}</b></span><i class="xpBjælke"><b style="width:${Math.round(100 * n.rest / n.krav)}%"></b></i>
    <span class="xpTal">${n.rest} / ${n.krav} XP</span><button class="stor anden" id="visUdfordringer">🏆 Udfordringer og skins</button>`;
  $("visUdfordringer").addEventListener("click", visUdfordringer);
}
// Udfordringerne (med fremskridt) og skinsene — de skins, man har låst op, kan man vælge til sine våben
function visUdfordringer() {
  const v = $("vælger"), låst = profil.skins;
  v.innerHTML = `<div class="vælger-kort"><h2>Udfordringer</h2><div class="udfordringer">${UDFORDRINGER.map(u => {
    const n = Math.min(u.mål, profil.tal[u.id] || 0);
    return `<div class="udfordring${n >= u.mål ? " klaret" : ""}"><b>${n >= u.mål ? "✅" : "🔒"} ${u.navn}</b><span>${u.tekst}</span><i><b style="width:${Math.round(100 * n / u.mål)}%"></b></i><small>${n} / ${u.mål} · skin: ${SKINS[u.skin].navn}</small></div>`;
  }).join("")}</div><h2>Skins på dine våben</h2><div class="skins">${Object.entries(SKINS).map(([id, s]) =>
    `<button class="skin${profil.skin === id ? " valgt" : ""}${låst.includes(id) ? "" : " låst"}" data-skin="${id}" style="--s:${SJÆLDEN[s.sjælden]?.farve || "#888"}">
      ${s.mønster ? `<img src="${skinBillede(id)}" alt="">` : "<span class='ingen'>—</span>"}<b>${låst.includes(id) ? "" : "🔒 "}${s.navn}</b></button>`).join("")}</div>
    <button class="stor anden luk">Tilbage</button></div>`;
  v.classList.remove("skjult");
  v.querySelectorAll(".skin").forEach(k => k.addEventListener("click", () => {
    if (!låst.includes(k.dataset.skin)) return;
    profil.skin = k.dataset.skin; profil.gem(); hånd.sætSkin(profil.skin); Lyd.bip(); visUdfordringer();
  }));
  v.querySelector(".luk").addEventListener("click", () => v.classList.add("skjult"));
}
visMenu();
// før kampen: kameraet kigger ud over midten af byen
spiller.a = nyAktør(0, 6, 30, 0); spiller.a.pitch = -0.12;
requestAnimationFrame(billede);
if (location.search.includes("debug")) window.sk = { spiller, get bots() { return bots; }, verden, bane, kamera, ind, tick, skyd, startKamp, taster, hånd, scene, himmelLys, renderer,
  get vb() { return vb(); }, get point() { return point; }, kør() { pause = false; $("menu").classList.add("skjult"); }, stop() { pause = true; }, udrust, kast: kastGranat, vælg: id => skiftVåben(id), effekter, hud, spillerFig, get aktivt() { return aktivt; }, get projektiler() { return projektiler; },
  steg(n) { for (let i = 0; i < n; i++) tick(TICK); }, tegn: nu => tegnBillede(nu), bombe, killcam, køretøjer, køretøjE, byggeri, br, online, genstart, skiftByg: på => skiftByg(på), skydNu() { skydHoldt = true; spillerSkyder(); skydHoldt = false; skydLåst = false; } };
