// ===== Broekraft — byg og udforsk i 3D, lavet til de mindste =====
// Styring som Minecraft på tablet: pilene går, træk med fingeren for at kigge rundt,
// tryk = sæt en blok, 🔨 hammer = tryk for at fjerne en blok (eller hold fingeren på blokken),
// hop-knap (dobbelttryk = flyv). På computer: WASD/pile, mellemrum = hop (to gange = flyv),
// shift = ned, 1–9 = vælg blok, 0/Q = hammer, E = inventar.
// 🧨 TNT: sæt den, og slå på den med hammeren — så sprænger den efter et par sekunder.
// Blokkene står i blokke.js, dyrene i dyr.js og verdenerne i verdener.js — tilføj flere dér.
// 👥 Spil sammen: åbnes siden fra familiens Broekraft Server med ?server=1&verden=<id>, hentes verdenen
// stykke for stykke fra serveren (net.js), og de andre børn vises som dyr (figurer.js).

import * as THREE from "./three.js";
import { BLOKKE, ID, lavAtlas } from "./blokke.js";
import { Verden, BX, BY, BZ, HAV, rng } from "./verden.js";
import { DYR, Dyr, ægIkon } from "./dyr.js";
import { VERDENER } from "./verdener.js";
import * as Lyd from "./lyd.js";
import { forbind } from "./net.js";
import { Figur, FIGURER, figurIkon } from "./figurer.js";
import { Simulering } from "./simulering.js";
import { VÆRKTØJ, værktøjIkon, værktøjModel, opdaterVærktøj } from "./vaerktoej.js";
import { forbindStemmer } from "./stemmer.js";
import { Stemmegraf, STEMMER, stemmeAf } from "./stemmeeffekt.js";
import { Skydning } from "./skyd.js";
import { Fyrværkeri } from "./fyrvaerkeri.js";
import { Brandvæsen } from "./brand.js";

const E = window.Effekter, $ = id => document.getElementById(id);
const RÆKKE = 7, HAKTID = 0.4;                                  // hvor langt man når, og hvor længe en blok tager at hakke
const B = 0.3, HØJ = 1.7, ØJE = 1.55, HOP = 8.6, GÅ = 4.3, FLYV = 9;

// ---------- Hvilken verden spiller vi i? ----------
const læs = (k, std) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? std; } catch (_) { return std; } };
const skriv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
// Spil sammen? Så spørger vi serveren, hvilken slags verden det er, før 3D-scenen bygges.
const PARAM = new URLSearchParams(location.search);
const ONLINE = PARAM.get("server") === "1";
const ONLINE_ID = PARAM.get("verden") || "";
let onlineInfo = null;
if (ONLINE) {
  document.body.classList.add("online");
  try { onlineInfo = (await (await fetch("/verdensliste", { cache: "no-store" })).json()).find(v => v.id === ONLINE_ID) || null; } catch (_) {}
}
const cfg = (ONLINE ? VERDENER.find(v => v.id === onlineInfo?.type) : VERDENER.find(v => v.id === læs("broekraft-verden", "græsø"))) || VERDENER[0];
const MÅL = ONLINE ? { BX: onlineInfo?.bredde || 128, BY: 64, BZ: onlineInfo?.dybde || 128, online: true }
  : cfg.størrelse ? { BX: cfg.størrelse[0], BY: cfg.størrelse[1], BZ: cfg.størrelse[2] } : {};      // alene: nogle verdener er større
const VX = MÅL.BX || BX, VZ = MÅL.BZ || BZ;
// Hvor langt man kan se, når man spiller sammen (store verdener)
const UDSYN = [{ navn: "Kort", r: 3, tåge: [18, 44] }, { navn: "Mellem", r: 5, tåge: [30, 74] }, { navn: "Langt", r: 7, tåge: [45, 106] }];
let udsynNr = Math.max(0, Math.min(2, læs("broekraft-udsyn", 1) | 0));
let hentet = læs("broekraft-hentet", ["græsø"]);
if (!Array.isArray(hentet)) hentet = [];
if (!hentet.includes("græsø")) hentet.push("græsø");
const TYNGDE = cfg.tyngde || 28;
Lyd.sætStemning(cfg.stemning);

// ---------- Gemt verden (kun på denne enhed — hver verden for sig) ----------
const GEM = ONLINE ? `broekraft-online-${ONLINE_ID}` : cfg.id === "græsø" ? "broekraft-v1" : `broekraft-v1-${cfg.id}${cfg.størrelse ? "-" + cfg.størrelse[0] : ""}`;
const tilTing = n => (n.startsWith("æg:") ? { æg: n.slice(3) } : n.startsWith("v:") ? { v: n.slice(2) } : { blok: ID[n] });
const STANDARD = cfg.hotbar.map(tilTing);
let gemt = læs(GEM, null);
if (!gemt || !Number.isFinite(gemt.frø)) gemt = { frø: (Math.random() * 2 ** 31) | 0, ændringer: {}, musik: læs("broekraft-musik", true), tnt: true, væske: true };
const gyldig = s => s && (s.v ? !!VÆRKTØJ[s.v] : s.æg ? s.æg === "?" || DYR.some(d => d.id === s.æg) : BLOKKE[s.blok] && !BLOKKE[s.blok].skjult);
if (!Array.isArray(gemt.hotbar) || gemt.hotbar.length !== 9 || !gemt.hotbar.every(gyldig)) gemt.hotbar = STANDARD.map(s => ({ ...s }));
if (!(gemt.valgt >= -1 && gemt.valgt < 9)) gemt.valgt = 0;
if (gemt.musik === undefined) gemt.musik = true;
if (!gemt.tnt && !gemt.hotbar.some(s => s.blok === ID.TNT)) gemt.hotbar[7] = { blok: ID.TNT };   // nyt: TNT!
const nyTNT = !gemt.tnt;
gemt.tnt = true;
if (!gemt.væske) {                                                // nyt: vandspand og tænder!
  if (!gemt.hotbar.some(s => s.v === "vand")) gemt.hotbar[5] = { v: "vand" };
  if (!gemt.hotbar.some(s => s.v === "tænder")) gemt.hotbar[6] = { v: "tænder" };
}
const nyVæske = !gemt.væske;
gemt.væske = true;

// ---------- 3D-scene: himmel, lys, sol, stjerner, hav og skyer efter verdenens farver ----------
const renderer = new THREE.WebGLRenderer({ canvas: $("scene"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const HORISONT = new THREE.Color(cfg.himmel[1]);
scene.background = HORISONT;
scene.fog = new THREE.Fog(HORISONT, cfg.tåge[0], cfg.tåge[1]);
if (ONLINE) [scene.fog.near, scene.fog.far] = UDSYN[udsynNr].tåge;
const kamera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
kamera.rotation.order = "YXZ";
scene.add(kamera);
scene.add(new THREE.HemisphereLight(cfg.lys[0], cfg.lys[1], cfg.lys[2]));
const sollys = new THREE.DirectionalLight("#ffffff", cfg.lys[3]);
sollys.position.set(0.5, 1, 0.3);
scene.add(sollys);

const himmelGeo = new THREE.SphereGeometry(300, 24, 12), hp = himmelGeo.attributes.position, hf = [];
{
  const top = new THREE.Color(cfg.himmel[0]), c = new THREE.Color();
  for (let i = 0; i < hp.count; i++) { c.copy(HORISONT).lerp(top, Math.pow(Math.max(0, hp.getY(i) / 300), 0.6)); hf.push(c.r, c.g, c.b); }
}
himmelGeo.setAttribute("color", new THREE.Float32BufferAttribute(hf, 3));
const himmel = new THREE.Mesh(himmelGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
himmel.renderOrder = -1;
scene.add(himmel);

const følgerKamera = [];                                         // ting på himlen der flytter med kameraet
function påHimlen(mesh, retning, afstand) { mesh.userData.retning = retning.normalize(); mesh.userData.afstand = afstand; følgerKamera.push(mesh); scene.add(mesh); }
if (cfg.sol) {
  const str = cfg.solStr || 36;
  påHimlen(new THREE.Mesh(new THREE.PlaneGeometry(str, str), new THREE.MeshBasicMaterial({ color: cfg.sol, fog: false })), new THREE.Vector3(0.4, 0.55, -0.7), 250);
}
if (cfg.jordklode) {                                           // Jorden set fra månen — i pixels, selvfølgelig
  const c = document.createElement("canvas"); c.width = c.height = 16;
  const g = c.getContext("2d");
  g.fillStyle = "#2a6fd6"; g.fillRect(0, 0, 16, 16);
  g.fillStyle = "#4cb748"; for (const [x, y, w, h] of [[3, 3, 4, 3], [2, 6, 3, 3], [9, 2, 3, 2], [10, 8, 4, 4], [6, 11, 3, 2]]) g.fillRect(x, y, w, h);
  g.fillStyle = "#ffffff"; for (const [x, y, w] of [[5, 1, 4], [1, 10, 3], [11, 13, 3], [7, 7, 2]]) g.fillRect(x, y, w, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  påHimlen(new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshBasicMaterial({ map: t, fog: false })), new THREE.Vector3(-0.6, 0.35, -0.75), 240);
}
// Sne, der falder stille omkring barnet (sne: true) — eller gløder, der stiger op, slik der drysser, eller bobler
const SNEARTER = {
  sne: { farver: ["#ffffff"], fart: 1.2, str: 0.16, antal: 1400 },
  gløder: { farver: ["#ff8c1a", "#ffd23f", "#ff4d2e", "#ffb020"], fart: -0.7, str: 0.12, antal: 700, glød: true },
};
let sne = null;
if (cfg.sne) {
  const art = SNEARTER[cfg.sne === true ? "sne" : cfg.sne] || SNEARTER.sne;
  const N = art.antal, pos = new Float32Array(N * 3), fart = new Float32Array(N), farve = new Float32Array(N * 3), c3 = new THREE.Color();
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 60; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    fart[i] = art.fart * (1 + Math.random());
    c3.set(art.farver[i % art.farver.length]); farve.set([c3.r, c3.g, c3.b], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(farve, 3));
  const c = document.createElement("canvas"); c.width = c.height = 16;
  const k = c.getContext("2d"), grad = k.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(1, "rgba(255,255,255,0)"); k.fillStyle = grad; k.fillRect(0, 0, 16, 16);
  sne = new THREE.Points(g, new THREE.PointsMaterial({ size: art.str, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.9,
    blending: art.glød ? THREE.AdditiveBlending : THREE.NormalBlending }));
  sne.frustumCulled = false; sne.userData.fart = fart;
  scene.add(sne);
}
function opdaterSne(dt, t) {
  if (!sne) return;
  const p = sne.geometry.attributes.position.array, f = sne.userData.fart, k = kamera.position;
  for (let i = 0; i < f.length; i++) {
    const j = i * 3;
    p[j] += Math.sin(t * 0.8 + i) * 0.3 * dt; p[j + 1] -= f[i] * dt; p[j + 2] += Math.cos(t * 0.6 + i * 1.7) * 0.3 * dt;
    // hold flagerne i en kasse omkring kameraet
    if (p[j + 1] < k.y - 12) p[j + 1] += 30; if (p[j + 1] > k.y + 18) p[j + 1] -= 30;
    if (p[j] < k.x - 30) p[j] += 60; if (p[j] > k.x + 30) p[j] -= 60;
    if (p[j + 2] < k.z - 30) p[j + 2] += 60; if (p[j + 2] > k.z + 30) p[j + 2] -= 60;
  }
  sne.geometry.attributes.position.needsUpdate = true;
}
// Nordlys: grønne og lilla bånd, der bølger langsomt på himlen (verdener med nordlys: true)
const nordlys = [];
if (cfg.nordlys) {
  const c = document.createElement("canvas"); c.width = 4; c.height = 64;
  const k = c.getContext("2d"), grad = k.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0, "rgba(90,255,170,0)"); grad.addColorStop(0.15, "rgba(90,255,170,0.9)"); grad.addColorStop(0.5, "rgba(60,220,160,0.45)"); grad.addColorStop(1, "rgba(160,90,255,0)");
  k.fillStyle = grad; k.fillRect(0, 0, 4, 64);
  const tekstur = new THREE.CanvasTexture(c);
  for (const [dx, y, dz, fase] of [[-60, 70, -170, 0], [40, 85, -190, 2], [120, 75, -120, 4]]) {
    const geo = new THREE.PlaneGeometry(220, 55, 48, 1);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tekstur, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.userData = { dx, y, dz, fase, grund: Float32Array.from(geo.attributes.position.array) };
    m.renderOrder = -1;
    scene.add(m); nordlys.push(m);
  }
}
function opdaterNordlys(t) {
  for (const m of nordlys) {
    const { dx, y, dz, fase, grund } = m.userData, p = m.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) p[i + 2] = grund[i + 2] + Math.sin(grund[i] * 0.03 + t * 0.35 + fase) * 22 + Math.sin(grund[i] * 0.011 + t * 0.2) * 12;
    m.geometry.attributes.position.needsUpdate = true;
    m.position.set(kamera.position.x + dx, kamera.position.y + y, kamera.position.z + dz);
    m.material.opacity = 0.45 + Math.sin(t * 0.5 + fase) * 0.15;
  }
}
let stjerner = null;
if (cfg.stjerner) {
  const pos = [], R = rng(7);
  for (let i = 0; i < 900; i++) {
    const y = R() * 1.1 - 0.1, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = R() * Math.PI * 2;
    pos.push(Math.cos(a) * rr * 250, y * 250, Math.sin(a) * rr * 250);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  stjerner = new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffffff", size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
  stjerner.renderOrder = -1;
  scene.add(stjerner);
}
if (cfg.hav) {
  const str = Math.max(900, Math.max(VX, VZ) * 3);
  const hav = new THREE.Mesh(new THREE.PlaneGeometry(str, str).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: cfg.hav }));
  hav.position.set(VX / 2, HAV, VZ / 2);
  scene.add(hav);
}
const skyer = [];
if (cfg.skyer) {
  const skyR = rng(gemt.frø + 7), skyMat = new THREE.MeshBasicMaterial({ color: cfg.skyer, transparent: true, opacity: 0.85, fog: false });
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(6 + skyR() * 14, 1.5, 4 + skyR() * 10), skyMat);
    s.position.set(VX / 2 - 92 + skyR() * 184, 44 + skyR() * 4, VZ / 2 - 92 + skyR() * 184);
    scene.add(s); skyer.push(s);
  }
}

// ---------- Verdenen ----------
const atlas = lavAtlas();
const blokMat = new THREE.MeshBasicMaterial({ map: atlas.tekstur, vertexColors: true, alphaTest: 0.5 });
const animMat = {                                               // vand er gennemsigtigt, lava gløder, ild blafrer
  vand: new THREE.MeshBasicMaterial({ map: atlas.anim.vand, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide }),
  lava: new THREE.MeshBasicMaterial({ map: atlas.anim.lava, vertexColors: true }),
  ild: new THREE.MeshBasicMaterial({ map: atlas.anim.ild, alphaTest: 0.4, side: THREE.DoubleSide }),
  portal: new THREE.MeshBasicMaterial({ map: atlas.anim.portal, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }),
};
const verden = new Verden(gemt.frø, atlas, blokMat, scene, MÅL);
verden.animMat = animMat;
verden.tyngde = TYNGDE;
if (!ONLINE) {                                    // alene: lav øen her. Sammen: serveren sender verdenen
  verden.generer(cfg.generer);
  verden.anvend(gemt.ændringer);
  verden.bygOmkring(gemt.spiller?.[0] ?? VX / 2, gemt.spiller?.[2] ?? VZ / 2);   // tæt på først, resten lidt efter lidt
}

// ---------- Vand og lava flyder, ild breder sig (alene: her på tabletten — sammen: på serveren) ----------
const sim = ONLINE ? null : new Simulering({
  hent: (x, y, z) => verden.hent(x, y, z), sæt: (x, y, z, id) => verden.sæt(x, y, z, id), inde: (x, y, z) => verden.inde(x, y, z),
  højde: verden.BY, ildBreder: gemt.ildBreder !== false,
  tændTNT: (x, y, z) => tændTNT(x, y, z), lyd: (navn, x, y, z) => simLyd(navn, x, y, z),
});
if (sim) {
  verden.vedÆndring = (x, y, z) => { sim.blokÆndret(x, y, z); portalTjek(x, y, z); gemSnart(); };
  const lag = verden.BX * verden.BZ;                              // væk gemt vand, lava og ild én gang
  for (let i = 0; i < verden.data.length; i++) {
    if (verden.data[i] >= ID.Vand && verden.data[i] <= ID.Ild) sim.blokÆndret(i % verden.BX, Math.floor(i / lag), Math.floor((i % lag) / verden.BX));
  }
}

// ---------- Spilleren ----------
const sp = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0.6, pitch: -0.25, jord: false, flyver: false };
let ventPåJord = false;                          // online: jorden under en er ikke hentet endnu
function startSted() {
  const x = Math.floor(verden.BX / 2), z = Math.floor(verden.BZ / 2);
  sp.vel.set(0, 0, 0);
  if (!verden.hentet(x, z)) { sp.pos.set(x + 0.5, verden.BY, z + 0.5); ventPåJord = true; return; }
  sp.pos.set(x + 0.5, verden.topY(x, z) + 1, z + 0.5);
}
if (!ONLINE && Array.isArray(gemt.spiller) && gemt.spiller.every(Number.isFinite)) {
  const [x, y, z, yaw, pitch, fly] = gemt.spiller;
  sp.pos.set(x, y, z); sp.yaw = yaw; sp.pitch = pitch; sp.flyver = !!fly;
} else startSted();
if (!ONLINE) while (verden.kolliderer(sp.pos, B, HØJ) && sp.pos.y < verden.BY + 2) sp.pos.y += 1;
document.body.classList.toggle("flyver", sp.flyver);

function gem() {
  try {
    if (ONLINE) {                                  // verdenen gemmes på computeren — her kun hotbaren
      localStorage.setItem(GEM, JSON.stringify({ frø: gemt.frø, hotbar: gemt.hotbar, valgt: gemt.valgt, musik: gemt.musik, tnt: true, væske: true }));
      return;
    }
    gemt.ændringer = Object.fromEntries(verden.ændringer);
    gemt.spiller = [sp.pos.x, sp.pos.y, sp.pos.z, sp.yaw, sp.pitch, sp.flyver ? 1 : 0];
    localStorage.setItem(GEM, JSON.stringify(gemt));
  } catch (_) {}
}
let gemTimer = 0;
const gemSnart = () => { if (!gemTimer) gemTimer = setTimeout(() => { gemTimer = 0; gem(); }, 1500); };   // højst hvert 1,5 sekund
document.addEventListener("visibilitychange", () => { if (document.hidden) gem(); });
window.addEventListener("pagehide", gem);

// ---------- Dyr ----------
const dyr = [];
const dyrDef = id => DYR.find(d => d.id === id) || DYR[0];
function nytDyr(def, x, y, z) {
  const d = new Dyr(def, verden, scene);
  d.pos.set(x, y, z);
  while (verden.kolliderer(d.pos, d.b, d.h) && d.pos.y < verden.BY) d.pos.y += 1;
  dyr.push(d);
  while (dyr.length > 30) dyr.shift().fjern();
  return d;
}
function lavStartDyr(cx, cz) {                  // dyrene bor lokalt på hver tablet
  const R = rng(gemt.frø + 99);
  for (let i = 0; i < cfg.antal; i++) {
    const x = Math.floor(cx + (R() - 0.5) * 26), z = Math.floor(cz + (R() - 0.5) * 26);
    if (!verden.hentet(x, z) || !verden.inde(x, 0, z)) continue;
    const def = dyrDef(cfg.dyr[i % cfg.dyr.length]);
    if (def.evne === "jæger") continue;                            // turbo-dinoerne kommer først senere — og langt væk
    nytDyr(def, x + 0.5, verden.topY(x, z) + 1, z + 0.5);
  }
}
if (!ONLINE) lavStartDyr(VX / 2, VZ / 2);
let genfødTid = 6;
function genfød(dt) {                                            // nye zombier og spøgelser dukker op langt væk
  if (!cfg.genfød || (genfødTid -= dt) > 0) return;
  genfødTid = 5;
  if (dyr.filter(d => cfg.dyr.includes(d.def.id)).length >= cfg.antal) return;
  for (let f = 0; f < 12; f++) {
    const x = ONLINE ? Math.floor(sp.pos.x + (Math.random() - 0.5) * 50) : 2 + Math.floor(Math.random() * (verden.BX - 4));
    const z = ONLINE ? Math.floor(sp.pos.z + (Math.random() - 0.5) * 50) : 2 + Math.floor(Math.random() * (verden.BZ - 4));
    let def = dyrDef(cfg.dyr[Math.floor(Math.random() * cfg.dyr.length)]);
    if (def.evne === "jæger" && dyr.filter(d => d.def.evne === "jæger").length >= 3) def = dyrDef(cfg.dyr[0]);   // højst tre dinoer ad gangen
    if (Math.hypot(x - sp.pos.x, z - sp.pos.z) < (def.evne === "jæger" ? 30 : 10) || !verden.inde(x, 0, z) || !verden.hentet(x, z)) continue;
    nytDyr(def, x + 0.5, verden.topY(x, z) + 1, z + 0.5);
    return;
  }
}

// ---------- Hånden: den valgte blok, et dyre-æg eller hammeren ----------
const hånd = new THREE.Group();
kamera.add(hånd);
let håndModel = null, håndFlamme = null, sving = 0;
const valgtTing = () => (gemt.valgt < 0 ? { hammer: true } : gemt.hotbar[gemt.valgt]);
const ægFarver = s => (s.æg === "?" ? ["#ffffff", "#ff7eb6"] : dyrDef(s.æg).æg);
function opdaterHånd() {
  if (håndModel) { hånd.remove(håndModel); håndModel.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } }); }
  const s = valgtTing();
  håndFlamme = null;
  if (s.v) {
    ({ model: håndModel, flamme: håndFlamme } = værktøjModel(s.v));
  } else if (s.hammer) {
    håndModel = new THREE.Group();
    const skaft = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), new THREE.MeshLambertMaterial({ color: "#8a5a2b" }));
    const hoved = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.3), new THREE.MeshLambertMaterial({ color: "#9aa3ad" }));
    const flade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.34), new THREE.MeshLambertMaterial({ color: "#c8d0d8" }));
    hoved.position.y = 0.5; flade.position.set(0.33, 0.5, 0);
    håndModel.add(skaft, hoved, flade);
    håndModel.rotation.set(0.2, 0.3, 0.5);
  } else if (s.æg) {
    const [a, b] = ægFarver(s);
    håndModel = new THREE.Group();
    const æg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshLambertMaterial({ color: a }));
    æg.scale.set(0.75, 1, 0.75);
    håndModel.add(æg);
    for (const [x, y, z] of [[0.33, 0.2, 0.1], [-0.2, -0.1, 0.3], [0.1, -0.3, 0.3], [-0.3, 0.25, -0.1], [0.2, 0, -0.3]]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshLambertMaterial({ color: b }));
      p.position.set(x, y, z); p.renderOrder = 11; håndModel.add(p);
    }
    håndModel.rotation.set(0.15, 0.75, 0);
  } else {
    håndModel = atlas.blokMesh(s.blok);
    håndModel.rotation.set(0.15, 0.75, 0);
  }
  håndModel.scale.setScalar(0.22);
  // hånden tegnes oven på alt andet — også oven på vandet, når man svømmer
  håndModel.traverse(c => { if (c.material) { c.material.depthTest = false; c.material.fog = false; c.material.transparent = true; } if (!c.renderOrder) c.renderOrder = 10; });
  hånd.add(håndModel);
}

// ---------- Hak-markering og småstykker ----------
const markør = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), new THREE.LineBasicMaterial({ color: "#000000", transparent: true, opacity: 0.6 }));
const revne = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0, depthWrite: false }));
markør.visible = revne.visible = false;
scene.add(markør, revne);

const STYK = 700, stykMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial(), STYK);
stykMesh.frustumCulled = false;
scene.add(stykMesh);
const styk = Array.from({ length: STYK }, () => ({ liv: 0 }));
let stykNr = 0, nyeFarver = false;
const dummy = new THREE.Object3D(), tmp = new THREE.Vector3();
// Et lille stykke der flyver: g = tyngde (negativ = stiger op som røg), str = størrelse
function partikel(x, y, z, farve, vx, vy, vz, liv, g = 1, str = 1) {
  const n = stykNr; stykNr = (stykNr + 1) % STYK;
  Object.assign(styk[n], { x, y, z, vx, vy, vz, liv, g, str });
  stykMesh.setColorAt(n, farve);
  nyeFarver = true;
}
function stykker(x, y, z, farve, antal = 16, fart = 4) {
  for (let i = 0; i < antal; i++) {
    partikel(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6,
      farve.clone().multiplyScalar(0.8 + Math.random() * 0.4),
      (Math.random() - 0.5) * fart, 1 + Math.random() * fart, (Math.random() - 0.5) * fart, 0.6 + Math.random() * 0.4);
  }
}
function opdaterStykker(dt) {
  if (nyeFarver) { stykMesh.instanceColor.needsUpdate = true; nyeFarver = false; }
  for (let i = 0; i < STYK; i++) {
    const s = styk[i];
    if (s.liv > 0) {
      s.liv -= dt; s.vy -= 20 * s.g * (TYNGDE / 28) * dt;
      s.x += s.vx * dt; s.z += s.vz * dt;
      const ny = s.y + s.vy * dt;
      if (s.g > 0 && verden.erFast(Math.floor(s.x), Math.floor(ny), Math.floor(s.z))) { s.vy = 0; s.vx *= 0.8; s.vz *= 0.8; } else s.y = ny;
    }
    dummy.position.set(s.x || 0, s.y || 0, s.z || 0);
    dummy.scale.setScalar(s.liv > 0 ? Math.min(1, s.liv * 3) * s.str : 0);
    dummy.updateMatrix();
    stykMesh.setMatrixAt(i, dummy.matrix);
  }
  stykMesh.instanceMatrix.needsUpdate = true;
}

// ---------- Byg, fjern og dyr ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function stråleFra(x, y, medVæske = false) {
  ndc.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, kamera);
  return verden.stråle(ray.ray.origin, ray.ray.direction, RÆKKE, medVæske);
}
function tilSkærm(p, dy = 0) {
  const v = tmp.set(p.x, p.y + dy, p.z).project(kamera);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
}
const overlap = (x, y, z, p, b, h) => x + 1 > p.x - b && x < p.x + b && y + 1 > p.y && y < p.y + h && z + 1 > p.z - b && z < p.z + b;

function tryk(x, y) {
  const valgt = valgtTing(), værk = valgt.v && VÆRKTØJ[valgt.v];
  const hit = stråleFra(x, y, !!valgt.hammer);
  if (skyd.kører) { skyd.kanon(ray.ray.direction.clone()); return; }       // i kampvognen skyder kanonen
  const kv = skyd.kampvognVed(ray.ray, RÆKKE + 4);                           // tryk på en grøn kampvogn = stig ind
  if (kv && (!hit || kv.afst < hit.t)) {
    skyd.stigInd(kv.kv); Lyd.vælg();
    besked("Du sidder i kampvognen! Kør med joysticket, og tryk for at skyde 🎯", 4000);
    return;
  }
  if (værk?.våben) { if (skyd.skydMod(værk.våben, kamera.position, ray.ray.direction)) sving = 1; return; }
  if (værk?.slange) { sprøjt(); return; }
  if (værk?.fyrværkeri) { fyrTryk(valgt.v, hit); return; }
  let bedst = null;
  for (const d of dyr) {
    const h = ray.intersectObject(d.model, true)[0];
    if (h && h.distance < RÆKKE && (!bedst || h.distance < bedst.afst)) bedst = { d, afst: h.distance };
  }
  if (bedst && (!hit || bedst.afst < hit.t)) {
    if (bedst.d.def.klap === "puf") { puf(bedst.d); return; }
    bedst.d.klap();
    const p = tilSkærm(bedst.d.pos, bedst.d.h + 0.3);
    E.tekstPop(p.x, p.y, "❤️", { s: 50 });
    return;
  }
  if (!hit) return;
  if (valgtTing().hammer) {                                      // hammeren fjerner blokken med det samme
    if (BLOKKE[hit.id].fyrværkeri) { tændFyrkasse(hit); return; }        // fyrværkeri-kassen går i gang
    if (BLOKKE[hit.id].kanon) { affyrKanon(hit); return; }               // bum — kanonkuglen flyver
    if (BLOKKE[hit.id].tnt) {                                     // … men TNT bliver tændt!
      if (ONLINE) { net?.tænd(hit.x, hit.y, hit.z); tændTNT(hit.x, hit.y, hit.z, 2.2, true); } else tændTNT(hit.x, hit.y, hit.z);
      sving = 1; return;
    }
    if (!BLOKKE[hit.id].uknuselig) { knus(hit, true); sving = 1; }
    return;
  }
  if (valgtTing().v) { brugVærktøj(valgtTing().v, hit); return; }
  sætBlok(hit);
}

function puf(d) {                                                // zombier og spøgelser bliver til konfetti og en blomst
  const p = tilSkærm(d.pos, d.h * 0.6);
  E.konfetti(p.x, p.y, { antal: 40 });
  Lyd.puf();
  const x = Math.floor(d.pos.x), y = Math.floor(d.pos.y + 0.05), z = Math.floor(d.pos.z);
  if (verden.hent(x, y, z) === 0 && verden.fast[verden.hent(x, y - 1, z)]) {
    const blomst = Math.random() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"];
    if (ONLINE) net?.sæt(x, y, z, blomst); else { verden.sæt(x, y, z, blomst); gemSnart(); }
  }
  d.fjern();
  dyr.splice(dyr.indexOf(d), 1);
}

function sætBlok(hit) {
  const s = valgtTing();
  let tx = hit.x + hit.n[0], ty = hit.y + hit.n[1], tz = hit.z + hit.n[2];
  if (BLOKKE[hit.id].kryds) { tx = hit.x; ty = hit.y; tz = hit.z; }            // tryk på en blomst = byt den ud
  if (s.æg) { lavDyr(s, tx, ty, tz); return; }
  if (!verden.inde(tx, ty, tz)) return;
  const der = verden.hent(tx, ty, tz);
  if (der && !BLOKKE[der].kryds && !BLOKKE[der].væske) return;                 // man kan bygge ned i vand
  const b = BLOKKE[s.blok];
  if (b.kryds && !verden.fast[verden.hent(tx, ty - 1, tz)]) return;             // blomster skal stå på noget
  if (!b.kryds && (overlap(tx, ty, tz, sp.pos, B, HØJ) || dyr.some(d => overlap(tx, ty, tz, d.pos, d.b, d.h)))) return;
  if (ONLINE) net?.sæt(tx, ty, tz, s.blok);                                        // serveren bestemmer
  else verden.sæt(tx, ty, tz, s.blok);
  Lyd.sæt(b.lyd);
  if (b.tnt && !tntTip) { tntTip = true; besked("Slå på TNT med 🔨 hammeren! 💥", 3500); }
  sving = 1;
  gemSnart();
}

function lavDyr(s, x, y, z) {
  if (x < 0 || x >= verden.BX || z < 0 || z >= verden.BZ || y >= verden.BY) return;
  const def = s.æg === "?" ? DYR[Math.floor(Math.random() * DYR.length)] : dyrDef(s.æg);
  const d = nytDyr(def, x + 0.5, y + 0.01, z + 0.5);
  d.klapTid = 0.5;
  Lyd.æg(); sving = 1;
  setTimeout(() => Lyd.dyrLyd(def.lyd), 350);
  const p = tilSkærm(d.pos, 0.5);
  E.konfetti(p.x, p.y, { antal: 24 });
  E.tekstPop(p.x, p.y - 40, def.navn, { s: 30 });
}

function knus(hit, hammer = false) {
  const over = verden.hent(hit.x, hit.y + 1, hit.z);
  if (ONLINE) {
    net?.sæt(hit.x, hit.y, hit.z, 0);
    if (over && BLOKKE[over].kryds) net?.sæt(hit.x, hit.y + 1, hit.z, 0);
  } else {
    verden.sæt(hit.x, hit.y, hit.z, 0);
    if (over && BLOKKE[over].kryds) verden.sæt(hit.x, hit.y + 1, hit.z, 0);        // blomsten ovenpå ryger med
  }
  const b = BLOKKE[hit.id];
  if (b.skat) skatFundet(hit);                                   // en skattekiste springer op!
  if (b.væske || b.ild) {
    stænk(hit.x + 0.5, hit.y + 0.7, hit.z + 0.5, atlas.farve(hit.id));
    if (b.væske) Lyd.plask(); else Lyd.knitre();
  } else {
    stykker(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, atlas.farve(hit.id));
    if (hammer) Lyd.bank(b.lyd); else Lyd.knus(b.lyd);
  }
  gemSnart();
}

// ---------- Vand, lava og ild ----------
const VANDFARVE = new THREE.Color("#8fc4ff"), DAMP = new THREE.Color("#f2f2f2");
// Spandene hælder vand eller lava ud · tænderen sætter ild (eller tænder TNT)
function brugVærktøj(v, hit) {
  const b = BLOKKE[hit.id];
  if (v === "tænder" && b.fyrværkeri) { tændFyrkasse(hit); return; }
  if (v === "tænder" && b.kanon) { affyrKanon(hit); return; }
  if (v === "tænder" && b.tnt) {
    if (ONLINE) { net?.tænd(hit.x, hit.y, hit.z); tændTNT(hit.x, hit.y, hit.z, 2.2, true); } else tændTNT(hit.x, hit.y, hit.z);
    sving = 1; return;
  }
  let tx = hit.x + hit.n[0], ty = hit.y + hit.n[1], tz = hit.z + hit.n[2];
  if (b.kryds) { tx = hit.x; ty = hit.y; tz = hit.z; }                         // en blomst eller ild bliver skiftet ud
  if (!verden.inde(tx, ty, tz)) return;
  if (v === "tænder" && tændPortal(tx, ty, tz)) return;                       // inde i en ramme af obsidian: portal!
  const der = verden.hent(tx, ty, tz), ny = v === "tænder" ? ID.Ild : VÆRKTØJ[v].blok;
  if (der === ny || (der && !BLOKKE[der].kryds && !BLOKKE[der].væske)) return;
  if (v === "tænder" && verden.væske[der]) return;                             // ild kan ikke brænde i vand og lava
  if (v !== "vand" && overlap(tx, ty, tz, sp.pos, B, HØJ)) return;            // ingen ild eller lava oven på sig selv
  if (ONLINE) net?.sæt(tx, ty, tz, ny); else verden.sæt(tx, ty, tz, ny);
  sving = 1;
  if (v === "tænder") { Lyd.tændIld(); stænk(tx + 0.5, ty + 0.3, tz + 0.5, ILD[1], 10); }
  else { Lyd.plask(); stænk(tx + 0.5, ty + 0.9, tz + 0.5, v === "vand" ? VANDFARVE : ILD[2], 12); }
  gemSnart();
}
// ---------- Piratøen: skattekister fulde af guld, og kanoner der skyder kanonkugler ud over vandet ----------
const GULDMØNT = ["#ffd23f", "#f5c542", "#fff3b0"].map(f => new THREE.Color(f));
function skatFundet({ x, y, z }) {
  for (let i = 0; i < 40; i++) partikel(x + 0.5, y + 0.6, z + 0.5, GULDMØNT[i % 3], (Math.random() - 0.5) * 5, 5 + Math.random() * 5,
    (Math.random() - 0.5) * 5, 1.4 + Math.random() * 0.6, 1, 1.3);
  Lyd.skat(); nyePoint(3);
  const p = tilSkærm({ x: x + 0.5, y: y + 1, z: z + 0.5 }); E.konfetti(p.x, p.y, { antal: 40 });
  besked("💰 Du fandt en skat!", 3000);
}
const kugleGeo = new THREE.SphereGeometry(0.22, 10, 8), kugleMat = new THREE.MeshLambertMaterial({ color: "#26262a" });
const kugler = [];
function affyrKanon({ x, y, z }) {
  const r = new THREE.Vector3(); kamera.getWorldDirection(r); r.y = 0; r.normalize();
  const m = new THREE.Mesh(kugleGeo, kugleMat);
  m.position.set(x + 0.5 + r.x * 0.9, y + 0.8, z + 0.5 + r.z * 0.9);
  scene.add(m);
  kugler.push({ m, v: new THREE.Vector3(r.x * 15, 7, r.z * 15), liv: 6 });
  Lyd.kanonSkud(); sving = 1; rystelse = Math.max(rystelse, 0.25);
  for (let i = 0; i < 14; i++) partikel(m.position.x, m.position.y, m.position.z, RØG, r.x * 2 + (Math.random() - 0.5) * 2, 1 + Math.random(), r.z * 2 + (Math.random() - 0.5) * 2, 1.2, -0.1, 2.6);
}
function opdaterKugler(dt) {
  for (const k of [...kugler]) {
    k.v.y -= TYNGDE * 0.6 * dt; k.m.position.addScaledVector(k.v, dt); k.liv -= dt;
    const p = k.m.position, x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z);
    const iVand = (cfg.hav && p.y < HAV) || verden.væske[verden.hent(x, y, z)] === "vand";
    if (!iVand && !verden.erFast(x, y, z) && k.liv > 0) continue;
    const afst = Math.hypot(p.x - sp.pos.x, p.z - sp.pos.z);
    if (iVand) { stænk(p.x, Math.max(p.y, HAV), p.z, VANDFARVE, 26); Lyd.plask(afst); }
    else { stykker(p.x, p.y, p.z, RØG, 12, 5); Lyd.fyrBrag(afst); }
    scene.remove(k.m); kugler.splice(kugler.indexOf(k), 1);
  }
}

// ---------- Brandslangen: en stråle vand, der slukker ild, gør lava til sten og får dyrene til at hoppe ----------
const SPRØJT = new THREE.Color("#e6f4ff");
let sprøjtLyd = 0, tssLyd = 0;
function sprøjt() {
  sving = Math.max(sving, 0.35);
  const r = new THREE.Vector3(); kamera.getWorldDirection(r);
  const fra = kamera.position.clone().addScaledVector(r, 0.7); fra.y -= 0.3;
  for (let i = 0; i < 16; i++) {
    const f = 11 + Math.random() * 4;
    partikel(fra.x, fra.y, fra.z, i % 3 ? VANDFARVE : SPRØJT, r.x * f + (Math.random() - 0.5) * 1.6, r.y * f + 1.5 + (Math.random() - 0.5) * 1.6,
      r.z * f + (Math.random() - 0.5) * 1.6, 0.55 + Math.random() * 0.35, 1.1, 0.65);
  }
  if (tid - sprøjtLyd > 0.2) { sprøjtLyd = tid; Lyd.sprøjt(); }
  let damp = false;
  const set = new Set();
  for (let t = 0.8; t <= 10; t += 0.5) {                          // gå hen ad strålen og se, hvad den rammer
    const px = fra.x + r.x * t, py = fra.y + r.y * t - 0.012 * t * t, pz = fra.z + r.z * t;
    let ramt = false;
    for (const [ox, oy, oz] of [[0, 0, 0], [0.7, 0, 0], [-0.7, 0, 0], [0, 0.7, 0], [0, -0.7, 0], [0, 0, 0.7], [0, 0, -0.7]]) {
      const x = Math.floor(px + ox), y = Math.floor(py + oy), z = Math.floor(pz + oz), k = `${x},${y},${z}`;
      if (set.has(k)) continue;
      set.add(k);
      const id = verden.hent(x, y, z);
      if (id === ID.Ild) { sætHer(x, y, z, 0); brand?.sprøjtet(x, y, z); dampSky(x, y, z); damp = true; }
      else if (id === ID.Lava) { sætHer(x, y, z, ID.Obsidian); dampSky(x, y, z); damp = true; }
      else if (verden.væske[id] === "lava") { sætHer(x, y, z, ID.Sten); dampSky(x, y, z); damp = true; }
      if (!ox && !oy && !oz && verden.fast[id]) ramt = true;
    }
    if (ramt) break;
  }
  if (damp && tid - tssLyd > 0.35) { tssLyd = tid; Lyd.tss(); }
  for (const d of dyr) {                                          // dyrene bliver våde og hopper
    tmp.copy(d.pos).sub(fra);
    const t = tmp.dot(r);
    if (t > 0.5 && t < 9 && tmp.addScaledVector(r, -t).length() < 1.3 && !(d.vådT > tid)) { d.vådT = tid + 1; d.klap(); }
  }
}
function dampSky(x, y, z) {
  for (let i = 0; i < 6; i++) partikel(x + Math.random(), y + 0.5, z + Math.random(), DAMP, Math.random() - 0.5, 1.5 + Math.random(), Math.random() - 0.5, 1.1, -0.08, 2.2);
}
// Dråber eller gnister der springer op
function stænk(x, y, z, farve, antal = 10) {
  for (let i = 0; i < antal; i++) partikel(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6, farve,
    (Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3, 0.5 + Math.random() * 0.3, 0.8, 0.8);
}
// Lyde fra simuleringen (og fra serveren, når man spiller sammen)
let knitreTid = 0;
function simLyd(navn, x, y, z) {
  const afst = Math.hypot(sp.pos.x - x - 0.5, sp.pos.y - y, sp.pos.z - z - 0.5);
  if (navn === "tss") {                                                         // lava + vand = sten og damp
    Lyd.tss(afst);
    for (let i = 0; i < 8; i++) partikel(x + Math.random(), y + 1, z + Math.random(), DAMP, Math.random() - 0.5, 1.5 + Math.random(), Math.random() - 0.5, 1.2, -0.08, 2.4);
  } else if (navn === "knitre" && tid - knitreTid > 0.3) { knitreTid = tid; Lyd.knitre(afst); }
}
// Gnister og røg fra ilden og bobler der springer op af lavaen — kun tæt på spilleren
let glødT = 0;
function opdaterGløder(dt) {
  if ((glødT -= dt) > 0) return;
  glødT = 0.05;
  const px = sp.pos.x, pz = sp.pos.z;
  for (const [nøgle, g] of verden.gløder) {
    const [cx, , cz] = nøgle.split(",").map(Number);
    if (Math.abs(cx * 16 + 8 - px) > 40 || Math.abs(cz * 16 + 8 - pz) > 40) continue;
    if (g.ild.length && Math.random() < 0.6) {
      const [x, y, z] = g.ild[Math.floor(Math.random() * g.ild.length)];
      partikel(x + Math.random(), y + 0.8, z + Math.random(), ILD[Math.floor(Math.random() * 3)], (Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.6, 0.6, -0.05, 0.7);
      if (Math.random() < 0.25) partikel(x + 0.5, y + 1.2, z + 0.5, RØG, (Math.random() - 0.5) * 0.4, 1, (Math.random() - 0.5) * 0.4, 1.5, -0.06, 2.2);
      if (Math.random() < 0.04) simLyd("knitre", x, y, z);
    }
    if (g.portal?.length && Math.random() < 0.5) {
      const [x, y, z] = g.portal[Math.floor(Math.random() * g.portal.length)];
      partikel(x + Math.random(), y + Math.random(), z + Math.random(), PORTALLILLA[Math.floor(Math.random() * PORTALLILLA.length)],
        (Math.random() - 0.5) * 0.8, 0.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8, 1.1, -0.08, 0.7);
      if (Math.random() < 0.02) Lyd.portalSummen(Math.hypot(x - px, z - pz));
    }
    if (g.lava.length && Math.random() < 0.15) {
      const [x, y, z] = g.lava[Math.floor(Math.random() * g.lava.length)];
      for (let i = 0; i < 3; i++) partikel(x + 0.3 + Math.random() * 0.4, y + 0.9, z + 0.3 + Math.random() * 0.4, ILD[i + 1], (Math.random() - 0.5) * 1.5, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5, 0.7, 0.7, 0.8);
      if (Math.random() < 0.3) Lyd.blub(Math.hypot(x - px, z - pz));
    }
  }
}
// Lava og ild: man hopper blødt op og baglæns ud af det og kommer ikke til skade
let varmeTid = 0;
function tjekVarme(fod, krop, dt) {
  varmeTid -= dt;
  const hed = id => verden.væske[id] === "lava" || !!BLOKKE[id]?.ild;
  const iLavahav = cfg.lavahav && !sp.flyver && sp.pos.y < HAV + 0.3;          // havet i Underverdenen er lava
  if (varmeTid > 0 || !(hed(fod) || hed(krop) || iLavahav)) return;
  varmeTid = 0.9;
  sp.vel.set(Math.sin(sp.yaw) * 5, 10, Math.cos(sp.yaw) * 5);
  sp.jord = false;
  Lyd.av();
  for (let i = 0; i < 12; i++) partikel(sp.pos.x, sp.pos.y + 0.3, sp.pos.z, ILD[i % ILD.length], (Math.random() - 0.5) * 3, 2 + Math.random() * 3, (Math.random() - 0.5) * 3, 0.5, -0.1, 1.4);
}
// De levende teksturer: vandet glider, lavaen gløder, ilden blafrer
function animerVæsker() {
  atlas.anim.vand.offset.set(tid * 0.07, tid * 0.18);
  atlas.anim.lava.offset.set(tid * 0.03, tid * 0.06);
  atlas.anim.ild.offset.y = (Math.floor(tid * 9) % atlas.anim.rammer) / atlas.anim.rammer;
  animMat.lava.color.setScalar(0.9 + Math.sin(tid * 2.2) * 0.1);
  atlas.anim.portal.offset.set(tid * 0.15, (Math.floor(tid * 8) % atlas.anim.portalRammer) / atlas.anim.portalRammer);
  animMat.portal.opacity = 0.78 + Math.sin(tid * 3) * 0.08;
}

// ---------- Portalen: byg en ramme af obsidian, tænd den med 🔥 — og gå ind i den ----------
// Hullet i rammen fyldes med lilla portal. Står man i den lidt, kan man vælge en anden verden,
// og man kommer ud af en portal dér (der bygges en, hvis der ikke er nogen). Går rammen i stykker, slukker portalen.
const PORTAL_MAKS = 120, REJSETID = 1.5;
const PORTALLILLA = ["#b36bff", "#d9a8ff", "#7a2fd6", "#f4e4ff"].map(f => new THREE.Color(f));
const NABO6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// Sammen: portalens blokke sendes lidt ad gangen, for serveren tager højst 20 blokke i sekundet fra hver
const netKø = [];
let netKøT = 0;
const sætHer = (x, y, z, id) => {
  if (!ONLINE) { verden.sæt(x, y, z, id); return; }
  if (!netKø.some(k => k[0] === x && k[1] === y && k[2] === z && k[3] === id)) netKø.push([x, y, z, id]);
};
function sendKø(dt) {
  netKøT = Math.max(0, netKøT - dt);
  if (!netKø.length || !net || netKøT > 0) return;
  net.sæt(...netKø.shift()); netKøT = 0.08;
}
let portalTid = 0, portalVent = true, ankomstSlør = 0, portalTip = false, brydes = false;

// Find det lukkede hul i en ramme omkring (x, y, z) — på langs af x eller af z.
// Siderne og toppen skal være obsidian; bunden må være alt, man kan stå på (så er det lettere for de små).
function findPortalHul(x, y, z) {
  const tom = id => id === 0 || id === ID.Ild;
  if (!tom(verden.hent(x, y, z))) return null;
  for (const langsX of [true, false]) {
    const hul = new Map([[`${x},${y},${z}`, [x, y, z]]]), kø = [[x, y, z]];
    let ok = true;
    while (ok && kø.length) {
      const [a, b, c] = kø.pop();
      for (const [dh, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = langsX ? [a + dh, b + dy, c] : [a, b + dy, c + dh], k = p.join(",");
        if (hul.has(k)) continue;
        if (!verden.inde(...p)) { ok = false; break; }
        const id = verden.hent(...p);
        if (tom(id)) { hul.set(k, p); kø.push(p); if (hul.size > PORTAL_MAKS) { ok = false; break; } }
        else if (id !== ID.Obsidian && !(dy === -1 && verden.fast[id])) { ok = false; break; }
      }
    }
    const højNok = [...hul.values()].some(([a, b, c]) => hul.has(`${a},${b + 1},${c}`));   // mindst to blokke højt
    if (ok && højNok) return [...hul.values()];
  }
  return null;
}
function tændPortal(x, y, z) {
  const hul = findPortalHul(x, y, z);
  if (!hul) return false;
  for (const [a, b, c] of hul) sætHer(a, b, c, ID.Portal);
  Lyd.portalTænd(); sving = 1;
  for (const [a, b, c] of hul) for (let i = 0; i < 5; i++) partikel(a + Math.random(), b + Math.random(), c + Math.random(), PORTALLILLA[i % PORTALLILLA.length],
    (Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3, 0.9 + Math.random() * 0.5, -0.1, 1.1);
  if (!portalTip) { portalTip = true; besked("🌀 Portalen er åben! Gå ind i den for at rejse til en anden verden", 4500); }
  gemSnart();
  return true;
}

// Når en blok ved siden af en portal forsvinder, tjekkes det, om rammen stadig er hel
function portalTjek(x, y, z) {
  const id = verden.hent(x, y, z);
  if (brydes || verden.fast[id] || verden.portal[id]) return;
  for (const [dx, dy, dz] of NABO6) {
    if (!verden.portal[verden.hent(x + dx, y + dy, z + dz)]) continue;
    const område = portalOmråde(x + dx, y + dy, z + dz);
    if (!portalHel(område)) brydPortal(område);
  }
}
function portalOmråde(x, y, z) {                              // alle portal-blokke, der hænger sammen
  const set = new Map([[`${x},${y},${z}`, [x, y, z]]]), kø = [[x, y, z]];
  while (kø.length && set.size < 400) {
    const [a, b, c] = kø.pop();
    for (const [dx, dy, dz] of NABO6) {
      const p = [a + dx, b + dy, c + dz], k = p.join(",");
      if (!set.has(k) && verden.portal[verden.hent(...p)]) { set.set(k, p); kø.push(p); }
    }
  }
  return [...set.values()];
}
function portalHel(område) {
  const i = new Set(område.map(p => p.join(","))), xs = new Set(område.map(p => p[0])), zs = new Set(område.map(p => p[2]));
  const kant = (a, b, c) => i.has(`${a},${b},${c}`) || verden.erFast(a, b, c);
  const prøv = langsX => område.every(([x, y, z]) => kant(x, y + 1, z) && kant(x, y - 1, z) && (langsX ? kant(x - 1, y, z) && kant(x + 1, y, z) : kant(x, y, z - 1) && kant(x, y, z + 1)));
  return (zs.size === 1 && prøv(true)) || (xs.size === 1 && prøv(false));
}
function brydPortal(område) {
  brydes = true;
  for (const [x, y, z] of område) {
    sætHer(x, y, z, 0);
    for (let k = 0; k < 3; k++) partikel(x + Math.random(), y + Math.random(), z + Math.random(), PORTALLILLA[k], (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 0.7, 0.3, 0.9);
  }
  brydes = false;
  Lyd.knus("glas");
}

// Står man i portalen, bliver skærmen lilla — og så kan man vælge, hvor man vil hen
function portalCelle() {
  const x = Math.floor(sp.pos.x), z = Math.floor(sp.pos.z);
  for (const dy of [0.1, 0.9, 1.5]) { const y = Math.floor(sp.pos.y + dy); if (verden.portal[verden.hent(x, y, z)]) return { x, y, z }; }
  return null;
}
function opdaterPortal(dt) {
  if (!portalCelle()) { portalVent = false; portalTid = Math.max(0, portalTid - dt * 2); }
  else if (!portalVent) {
    if (portalTid === 0) Lyd.portalRejse();
    portalTid += dt;
    if (portalTid >= REJSETID) { portalTid = 0; portalVent = true; visPortalValg(); }
  }
}
const portalSlør = $("portalSlør");
function tegnPortalSlør(dt) {
  ankomstSlør = Math.max(0, ankomstSlør - dt * 0.7);
  const s = Math.max(portalTid / REJSETID, ankomstSlør);
  portalSlør.style.opacity = s.toFixed(3);
  portalSlør.classList.toggle("aktiv", s > 0.01);
}
async function visPortalValg() {
  const grid = $("portalGrid");
  grid.replaceChildren();
  $("portalTom").classList.add("skjult");
  vis("portalValg");
  if (!ONLINE) {                                               // alene: alle de andre verdener
    for (const v of VERDENER) if (v.id !== cfg.id) grid.appendChild(verdenKort(v, v.navn, v.tekst, "🌀 Rejs", () => portalTil(v)));
    return;
  }
  let liste = [];                                              // sammen: de andre verdener, der kører på computeren
  try { liste = await (await fetch("/verdensliste", { cache: "no-store" })).json(); } catch (_) {}
  for (const w of liste) {
    if (w.id === ONLINE_ID) continue;
    const v = VERDENER.find(x => x.id === w.type) || VERDENER[0], fuld = w.spillere >= w.maks;
    grid.appendChild(verdenKort(v, w.navn, `${v.ikon} ${v.navn} · ${w.spillere}/${w.maks} spillere`, fuld ? "😕 Fuld" : "🌀 Rejs", fuld ? null : () => portalTil(w)));
  }
  if (!grid.children.length) $("portalTom").classList.remove("skjult");
}
function portalTil(v) {
  Lyd.klar(); Lyd.portalTænd();
  luk("portalValg");
  pause = true; ankomstSlør = 1.4;                            // skærmen bliver helt lilla, mens vi rejser
  try { sessionStorage.setItem("broekraft-portal", "1"); sessionStorage.setItem("broekraft-start", "1"); } catch (_) {}
  setTimeout(() => {
    if (ONLINE) { stopTale(); net?.luk(); PARAM.set("verden", v.id); location.search = PARAM.toString(); return; }
    if (!hentet.includes(v.id)) { hentet.push(v.id); skriv("broekraft-hentet", hentet); }
    skiftTil(v);
  }, 900);
}

// Man kommer frem i den nye verden: find den nærmeste portal — eller byg en — og stil barnet i den
let portalKom = false;
try { portalKom = sessionStorage.getItem("broekraft-portal") === "1"; sessionStorage.removeItem("broekraft-portal"); } catch (_) {}
function ankomVedPortal() {
  const r = ONLINE ? 16 : Infinity, px = Math.floor(sp.pos.x), pz = Math.floor(sp.pos.z);
  let bedst = null;
  for (let x = Math.max(0, px - r); x < Math.min(verden.BX, px + r + 1); x++) for (let z = Math.max(0, pz - r); z < Math.min(verden.BZ, pz + r + 1); z++) {
    for (let y = 1; y < verden.BY; y++) {
      if (!verden.portal[verden.hent(x, y, z)] || verden.portal[verden.hent(x, y - 1, z)]) continue;   // kun de nederste
      const afst = Math.hypot(x - px, z - pz);
      if (!bedst || afst < bedst.afst) bedst = { x, y, z, afst };
    }
  }
  if (!bedst) bedst = bygPortal(px, pz);
  const langt = Math.hypot(bedst.x - sp.pos.x, bedst.z - sp.pos.z) > 24;
  stilForanPortal(bedst, verden.portalLangsX(bedst.x, bedst.y, bedst.z) || bedst.langsX);
  if (sp.flyver) skiftFlyv();
  if (langt && !ONLINE) verden.bygOmkring(sp.pos.x, sp.pos.z);
  portalVent = true; ankomstSlør = 1.2;
  Lyd.portalAnkomst();
  for (let i = 0; i < 40; i++) partikel(sp.pos.x, sp.pos.y + 1, sp.pos.z, PORTALLILLA[i % PORTALLILLA.length],
    (Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6, 0.8 + Math.random() * 0.6, 0.2, 1.2);
  setTimeout(() => besked("🌀 Du kom gennem portalen! Gå ind i den igen for at rejse videre", 4000), 2600);
}
// Stil barnet lige foran portalen og kig på den — så kan man se, hvor man kom fra
function stilForanPortal({ x, y, z }, langsX) {
  sp.vel.set(0, 0, 0);
  for (const afst of [2, 1]) for (const side of [-1, 1]) {
    const p = tmp.set(x + 0.5 + (langsX ? 0 : side * afst), y, z + 0.5 + (langsX ? side * afst : 0));
    if (verden.kolliderer(p, B, HØJ)) continue;
    sp.pos.copy(p);
    sp.yaw = langsX ? (side < 0 ? Math.PI : 0) : (side < 0 ? -Math.PI / 2 : Math.PI / 2);
    sp.pitch = -0.1;
    return;
  }
  sp.pos.set(x + 0.5, y, z + 0.5); sp.yaw = langsX ? 0 : Math.PI / 2;                   // ellers: midt i portalen
}
// En ramme på 4 × 5 obsidian med portal i midten, på jorden der hvor man står
function bygPortal(px, pz) {
  const x0 = Math.max(2, Math.min(verden.BX - 6, px - 1)), z = Math.max(2, Math.min(verden.BZ - 3, pz));
  let y0 = 1;
  for (let dx = 0; dx < 4; dx++) y0 = Math.max(y0, verden.topY(x0 + dx, z));
  y0 = Math.min(y0, verden.BY - 7);
  const hul = [];
  for (let dx = 0; dx < 4; dx++) {
    for (let y = y0 - 1; y > 0 && !verden.fast[verden.hent(x0 + dx, y, z)]; y--) sætHer(x0 + dx, y, z, ID.Sten);     // fyld hullet under rammen
    for (let dy = 0; dy <= 4; dy++) {
      if (dx === 0 || dx === 3 || dy === 0 || dy === 4) sætHer(x0 + dx, y0 + dy, z, ID.Obsidian); else hul.push([x0 + dx, y0 + dy, z]);
    }
    for (const dz of [-1, 1]) for (let dy = 1; dy <= 3; dy++) if (verden.fast[verden.hent(x0 + dx, y0 + dy, z + dz)]) sætHer(x0 + dx, y0 + dy, z + dz, 0);   // plads foran og bagved
  }
  for (const [x, y, z2] of hul) sætHer(x, y, z2, ID.Portal);   // portalen tændes til sidst, når hele rammen står
  gemSnart();
  return { x: x0 + 1, y: y0 + 1, z, langsX: true };
}

// ---------- TNT ----------
const tændte = [];
let rystelse = 0, tntTip = false;
const RØG = new THREE.Color("#8f8f8f"), ILD = ["#fff3a0", "#ffd23f", "#ff8c1a", "#ff4d2e"].map(f => new THREE.Color(f));
function tændTNT(x, y, z, lunte = 2.2, kunVis = false) {
  if (!kunVis) verden.sæt(x, y, z, 0);
  if (tændte.length >= 40) return;
  const g = new THREE.Group();
  g.add(atlas.blokMesh(ID.TNT));
  const hvid = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }));
  g.add(hvid);
  scene.add(g);
  tændte.push({ g, hvid, pos: new THREE.Vector3(x + 0.5, y, z + 0.5), vel: new THREE.Vector3(0, lunte < 1 ? 3 : 2, 0), tid: 0, lunte, røgT: 0, kunVis });
  Lyd.tænd();
  if (!kunVis) gemSnart();
}
function opdaterTNT(dt) {
  for (let i = tændte.length - 1; i >= 0; i--) {
    const t = tændte[i];
    t.tid += dt;
    t.vel.y = Math.max(-30, t.vel.y - TYNGDE * dt);
    const r = verden.bevæg(t.pos, tmp.copy(t.vel).multiplyScalar(dt), 0.49, 0.98);
    if (r.jord) { t.vel.set(0, 0, 0); }
    const rest = t.lunte - t.tid;
    t.hvid.material.opacity = Math.sin(t.tid * (8 + (t.tid / t.lunte) * 30)) > 0.2 ? 0.75 : 0;   // blinker hurtigere og hurtigere
    t.g.scale.setScalar(rest < 0.3 ? 1 + (0.3 - rest) * 0.7 : 1);
    t.g.position.set(t.pos.x, t.pos.y + 0.5, t.pos.z);
    t.røgT -= dt;
    if (t.røgT <= 0) {                                         // lunten ryger og hvæser
      t.røgT = 0.08;
      partikel(t.pos.x, t.pos.y + 1.05, t.pos.z, RØG, (Math.random() - 0.5) * 0.5, 1.2, (Math.random() - 0.5) * 0.5, 0.9, -0.12, 1.6);
      if (i < 2) Lyd.lunte();
    }
    if (rest <= 0) {
      tændte.splice(i, 1);
      scene.remove(t.g);
      t.g.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } });
      if (!t.kunVis) eksploder(t.pos.x, t.pos.y + 0.5, t.pos.z);
    }
  }
}
function eksploder(cx, cy, cz) {
  const R = 3.3;
  for (let x = Math.floor(cx - R); x <= cx + R; x++) for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let z = Math.floor(cz - R); z <= cz + R; z++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz);
    if (d > R || (d > R - 0.9 && Math.random() < 0.5)) continue;
    const id = verden.inde(x, y, z) ? verden.hent(x, y, z) : 0;
    if (!id || BLOKKE[id].uknuselig) continue;
    if (BLOKKE[id].tnt) { tændTNT(x, y, z, 0.25 + Math.random() * 0.5); continue; }   // kædereaktion!
    verden.sæt(x, y, z, 0);
    if (Math.random() < 0.4) {
      const f = atlas.farve(id), a = Math.max(0.3, d);
      for (let k = 0; k < 3; k++) partikel(x + 0.5, y + 0.5, z + 0.5, f.clone().multiplyScalar(0.8 + Math.random() * 0.4),
        (x + 0.5 - cx) / a * 7 + (Math.random() - 0.5) * 3, 3 + Math.random() * 6, (z + 0.5 - cz) / a * 7 + (Math.random() - 0.5) * 3, 0.9 + Math.random() * 0.6);
    }
  }
  for (let i = 0; i < 45; i++) {                                // ild
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 7);
    partikel(cx, cy, cz, ILD[i % ILD.length], v.x, v.y, v.z, 0.4 + Math.random() * 0.5, -0.1, 2.2);
  }
  for (let i = 0; i < 25; i++) {                                // røg
    partikel(cx + (Math.random() - 0.5) * 3, cy + (Math.random() - 0.5) * 2, cz + (Math.random() - 0.5) * 3, RØG,
      (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2, 1.2 + Math.random() * 0.8, -0.1, 3.5);
  }
  verden.opdater(40);                                           // vis hullet med det samme
  bragEffekt(cx, cy, cz);
  gemSnart();
}
// Ild, røg, skub, rystelser og lyd — bruges både alene og når serveren sender "bum"
function bragEffekt(cx, cy, cz) {
  const R = 3.3;
  if (ONLINE) {
    for (let i = 0; i < 45; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 7);
      partikel(cx, cy, cz, ILD[i % ILD.length], v.x, v.y, v.z, 0.4 + Math.random() * 0.5, -0.1, 2.2);
    }
    for (let i = 0; i < 25; i++) partikel(cx + (Math.random() - 0.5) * 3, cy + (Math.random() - 0.5) * 2, cz + (Math.random() - 0.5) * 3, RØG,
      (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2, 1.2 + Math.random() * 0.8, -0.1, 3.5);
  }
  // dyr bliver blæst væk (zombier og spøgelser siger puf), og man selv får et skub
  for (const d of [...dyr]) {
    const dx = d.pos.x - cx, dz = d.pos.z - cz, a = Math.max(0.5, Math.hypot(dx, d.pos.y - cy, dz));
    if (a > R + 3) continue;
    if (d.def.klap === "puf") { puf(d); continue; }
    const k = (R + 3 - a) * 2.5;
    d.skub.set(dx / a * k, 0, dz / a * k);
    d.vel.y = 6 + k;
    d.klapTid = 0.5;
  }
  const px = sp.pos.x - cx, py = sp.pos.y + 0.9 - cy, pz = sp.pos.z - cz, afst = Math.max(0.5, Math.hypot(px, py, pz));
  if (afst < R + 4) {
    const k = (R + 4 - afst) * 2;
    sp.vel.x += px / afst * k; sp.vel.z += pz / afst * k;
    sp.vel.y = Math.max(sp.vel.y, 4 + k * 0.6);
    sp.jord = false;
  }
  rystelse = Math.min(1.2, rystelse + Math.max(0, 1 - afst / 30));
  Lyd.bum(afst);
  if (afst < 30) E.flash("#fff1b8");
}

// ---------- Skydning og fyrværkeri (skyd.js, kampvogn.js og fyrvaerkeri.js) ----------
const skyd = new Skydning({
  scene, verden, kamera, sp, dyr, partikel, eksploder, bragEffekt, puf, lyd: Lyd, net: () => net, online: ONLINE,
  sæt: (x, y, z, id) => { verden.sæt(x, y, z, id); gemSnart(); }, point: n => nyePoint(n), klat: f => klat(f),
  tyngde: TYNGDE, bane: !!cfg.skyd, start: [VX / 2, VZ / 2],
});
const fyr = new Fyrværkeri(scene, kamera, { lyd: { fløjt: Lyd.fløjt, brag: Lyd.fyrBrag, knitre: Lyd.fyrKnitre }, blink: himmelBlink });

// Point på Skydebanen: ⭐ oppe i midten — og en lille fest for hver 25
let point = gemt.point | 0;
function nyePoint(n) {
  if (!cfg.skyd && !cfg.point) return;
  const før = point;
  point += n; gemt.point = point;
  const el = $("point");
  el.textContent = `⭐ ${point}`;
  el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
  if (Math.floor(før / 25) < Math.floor(point / 25)) { E.fanfare?.(); E.konfetti(window.innerWidth / 2, 70, { antal: 70 }); }
  else Lyd.point();
  gemSnart();
}
$("point").textContent = `⭐ ${point}`;
document.body.classList.toggle("skydebane", !!cfg.skyd);
document.body.classList.toggle("med-point", !!(cfg.skyd || cfg.point));
$("udKnap").addEventListener("pointerdown", e => { e.preventDefault(); Lyd.klar(); Lyd.klik(); skyd.stigUd(); });

// En blød skumkugle rammer: en farveklat på skærmen, der falmer væk
function klat(farve) {
  const k = document.createElement("div"), n = 9, pkt = [];
  for (let i = 0; i < n; i++) { const v = i / n * Math.PI * 2, r = 30 + Math.random() * 16; pkt.push([50 + Math.cos(v) * r, 50 + Math.sin(v) * r]); }
  let d = `M${(pkt[0][0] + pkt[n - 1][0]) / 2},${(pkt[0][1] + pkt[n - 1][1]) / 2}`;
  for (let i = 0; i < n; i++) { const a = pkt[i], b = pkt[(i + 1) % n]; d += ` Q${a[0]},${a[1]} ${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2}`; }
  const dråber = Array.from({ length: 4 }, () => `<circle cx="${10 + Math.random() * 80}" cy="${10 + Math.random() * 80}" r="${3 + Math.random() * 5}"/>`).join("");
  k.className = "klat";
  k.style.left = 15 + Math.random() * 70 + "%"; k.style.top = 15 + Math.random() * 60 + "%";
  k.innerHTML = `<svg viewBox="0 0 100 100" fill="${farve}"><path d="${d}Z"/>${dråber}</svg>`;
  $("klatter").appendChild(k);
  setTimeout(() => k.remove(), 2700);
}

// Fyrværkeri lyser himlen op et øjeblik
function himmelBlink(farve, styrke) {
  const el = $("himmelBlink");
  el.style.transition = "none";
  el.style.background = `radial-gradient(ellipse at 50% 20%, rgba(${farve.r * 255 | 0},${farve.g * 255 | 0},${farve.b * 255 | 0},${0.28 * styrke}), transparent 70%)`;
  el.style.opacity = "1";
  requestAnimationFrame(() => { el.style.transition = "opacity .9s ease-out"; el.style.opacity = "0"; });
}

// Raket: sendes op fra det sted, man peger på — eller lige foran en
function fyrTryk(v, hit) {
  sving = 1;
  if (v === "stjernekaster") { stjernedrys(18, 5); Lyd.gnistre(); return; }
  if (v === "konfetti") { konfettiSkud(); return; }
  if (v === "romerlys" || v === "lygte") {                        // fra hånden, lige foran barnet
    const x = sp.pos.x - Math.sin(sp.yaw) * 1.2, z = sp.pos.z - Math.cos(sp.yaw) * 1.2, y = sp.pos.y + 1.5;
    if (ONLINE) net?.fyrværkeri(x, y, z, v); else fyr.raket(x, y, z, { mønster: v });
    return;
  }
  let x, y, z;
  if (hit && hit.n[1] === 1) { x = hit.x + 0.5; y = hit.y + 1; z = hit.z + 0.5; }
  else { x = sp.pos.x - Math.sin(sp.yaw) * 2.5; z = sp.pos.z - Math.cos(sp.yaw) * 2.5; y = verden.topY(Math.floor(x), Math.floor(z)) + 1; }
  if (ONLINE) net?.fyrværkeri(x, y, z);                           // sammen: serveren sender raketten til alle
  else fyr.raket(x, y, z);
}
// Fyrværkeri-kassen tændes og skyder en hel serie raketter op
// (show-kassen giver et langt show med finale, fontænen sprøjter gnister op fra jorden)
function tændFyrkasse({ x, y, z }) {
  const slags = BLOKKE[verden.hent(x, y, z)]?.fyrværkeri;
  if (ONLINE) net?.tændFyrkasse(x, y, z);                         // sammen: serveren fyrer serien af for alle
  else {
    verden.sæt(x, y, z, 0);
    if (slags === "fontæne") fyr.fontæne(x, y, z); else fyr.tændKasse(x, y, z, 12, slags === "show");
  }
  Lyd.tænd(); sving = 1;
  gemSnart();
}
// Konfettikanonen sprøjter en sky af konfetti frem foran barnet
const KONFETTI = ["#ff3b5c", "#ffd23f", "#4cd964", "#3aa8ff", "#c86bff", "#ff8c1a", "#ffffff", "#ff6fd0"].map(f => new THREE.Color(f));
function konfettiSkud() {
  const r = new THREE.Vector3(); kamera.getWorldDirection(r);
  const fra = kamera.position.clone().addScaledVector(r, 0.9);
  for (let i = 0; i < 55; i++) partikel(fra.x, fra.y - 0.2, fra.z, KONFETTI[i % KONFETTI.length],
    r.x * 9 + (Math.random() - 0.5) * 5, r.y * 9 + 2 + Math.random() * 4, r.z * 9 + (Math.random() - 0.5) * 5, 1.4 + Math.random(), 0.3, 0.7);
  Lyd.puf();
}
// Gnister fra stjernekasteren i hånden
const spids = new THREE.Vector3(), GNIST = ["#fff3a0", "#ffd23f", "#ffffff", "#ffb347"].map(f => new THREE.Color(f));
let gnistLyd = 0;
function stjernedrys(n, fart) {
  if (!håndFlamme) return;
  håndFlamme.getWorldPosition(spids);
  for (let i = 0; i < n; i++) partikel(spids.x, spids.y, spids.z, GNIST[i % GNIST.length], (Math.random() - 0.5) * fart, (Math.random() - 0.3) * fart, (Math.random() - 0.5) * fart, 0.25 + Math.random() * 0.3, 0.3, 0.3);
}

// ---------- Styring ----------
const tast = { frem: 0, tilbage: 0, venstre: 0, hoejre: 0, op: 0, ned: 0, hop: 0 };
let iGang = false, pause = false, sidsteHop = 0;

function hopTryk() {
  const nu = performance.now();
  if (nu - sidsteHop < 320) { sidsteHop = 0; skiftFlyv(); return; }       // dobbelttryk = flyv
  sidsteHop = nu;
  if (!sp.flyver && sp.jord) { sp.vel.y = HOP; Lyd.hop(); }
}
function skiftFlyv() {
  if (skyd.kører) return;
  sp.flyver = !sp.flyver;
  if (sp.flyver) sp.vel.y = 4;
  Lyd.flyv(sp.flyver);
  document.body.classList.toggle("flyver", sp.flyver);
  besked(sp.flyver ? "Du flyver! 🕊️" : "Du går igen");
}

const TASTER = { KeyW: "frem", ArrowUp: "frem", KeyS: "tilbage", ArrowDown: "tilbage", KeyA: "venstre", ArrowLeft: "venstre", KeyD: "hoejre", ArrowRight: "hoejre", ShiftLeft: "ned", ShiftRight: "ned" };
window.addEventListener("keydown", e => {
  if (!iGang || pause) return;
  if (TASTER[e.code]) { tast[TASTER[e.code]] = 1; e.preventDefault(); }
  if (e.code === "Space") { e.preventDefault(); if (!e.repeat) hopTryk(); tast.hop = 1; }
  if (e.code === "KeyF" && !e.repeat) skiftFlyv();
  if (e.code === "KeyE" && !e.repeat) visInventar();
  if (e.code === "KeyQ" || e.code === "Digit0") vælgSlot(-1);
  if (/^Digit[1-9]$/.test(e.code)) vælgSlot(+e.code.slice(5) - 1);
});
window.addEventListener("keyup", e => { if (TASTER[e.code]) tast[TASTER[e.code]] = 0; if (e.code === "Space") tast.hop = 0; });
window.addEventListener("blur", () => { for (const k in tast) tast[k] = 0; });

// Knapper på skærmen (pile, hop, ned, flyv)
// Joysticket: træk knappen, og man går i den retning (jo længere ud, jo hurtigere). Også i kampvognen.
const joy = $("joystick"), knop = $("knop");
let joyId = null;
function joyFlyt(e) {
  const r = joy.getBoundingClientRect(), maks = r.width / 2 - 12;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const l = Math.hypot(dx, dy);
  if (l > maks) { dx *= maks / l; dy *= maks / l; }
  knop.style.transform = `translate(${dx}px, ${dy}px)`;
  let x = dx / maks, y = dy / maks;
  if (Math.hypot(x, y) < 0.18) x = y = 0;                        // lidt dødt i midten, så man kan stå stille
  tast.hoejre = Math.max(0, x); tast.venstre = Math.max(0, -x); tast.frem = Math.max(0, -y); tast.tilbage = Math.max(0, y);
}
function joySlip() {
  joyId = null; joy.classList.remove("aktiv"); knop.style.transform = "";
  tast.frem = tast.tilbage = tast.venstre = tast.hoejre = 0;
}
joy.addEventListener("pointerdown", e => {
  e.preventDefault(); Lyd.klar();
  joyId = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (_) {}
  joy.classList.add("aktiv"); joyFlyt(e);
});
joy.addEventListener("pointermove", e => { if (e.pointerId === joyId) joyFlyt(e); });
for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) joy.addEventListener(n, e => { if (e.pointerId === joyId) joySlip(); });

document.querySelectorAll("[data-tast]").forEach(k => {
  const t = k.dataset.tast;
  const op = () => { tast[t] = 0; k.classList.remove("aktiv"); };
  k.addEventListener("pointerdown", e => {
    e.preventDefault(); Lyd.klar();
    try { k.setPointerCapture(e.pointerId); } catch (_) {}
    tast[t] = 1; k.classList.add("aktiv");
    if (t === "hop") hopTryk();
  });
  k.addEventListener("pointerup", op);
  k.addEventListener("pointercancel", op);
  k.addEventListener("lostpointercapture", op);
});
$("flyKnap").addEventListener("pointerdown", e => { e.preventDefault(); Lyd.klar(); skiftFlyv(); });

// Fingre på selve verdenen: træk = kig, tryk = byg (eller fjern med hammeren), hold = hak
const cv = $("scene"), fingre = new Map();
const FØL = { touch: 0.0065, pen: 0.0065, mouse: 0.0045 };
cv.addEventListener("pointerdown", e => {
  if (!iGang || pause) return;
  Lyd.klar();
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  const f = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), flyttet: false, hakker: false, hak: 0, mål: null, type: e.pointerType, knap: e.button, lydT: 0 };
  fingre.set(e.pointerId, f);
  if (e.button === 2) { f.flyttet = true; tryk(e.clientX, e.clientY); }          // højreklik = byg
});
cv.addEventListener("pointermove", e => {
  const f = fingre.get(e.pointerId);
  if (!f) return;
  const dx = e.clientX - f.x, dy = e.clientY - f.y;
  f.x = e.clientX; f.y = e.clientY;
  if (!f.flyttet && !f.hakker && Math.hypot(f.x - f.sx, f.y - f.sy) > 10) f.flyttet = true;
  if (f.flyttet && !f.hakker) {
    const k = FØL[f.type] || 0.005;
    sp.yaw -= dx * k;
    sp.pitch = Math.max(-1.55, Math.min(1.55, sp.pitch - dy * k));
  }
});
const slip = e => {
  const f = fingre.get(e.pointerId);
  if (!f) return;
  fingre.delete(e.pointerId);
  if (!f.flyttet && !f.hakker && f.knap === 0 && performance.now() - f.t < 350) tryk(f.sx, f.sy);
};
cv.addEventListener("pointerup", slip);
cv.addEventListener("pointercancel", slip);
cv.addEventListener("contextmenu", e => e.preventDefault());
cv.addEventListener("wheel", e => { e.preventDefault(); if (iGang) vælgSlot((gemt.valgt + (e.deltaY > 0 ? 2 : 10)) % 10 - 1); }, { passive: false });

function opdaterHak(dt) {
  let f = null;
  for (const g of fingre.values()) {
    if (!g.flyttet && !g.hakker && g.knap === 0 && performance.now() - g.t > 300) g.hakker = true;
    if (g.hakker) f = g;
  }
  const værk = valgtTing().v && VÆRKTØJ[valgtTing().v];
  if (f && (værk?.hold || skyd.kører)) {
    markør.visible = revne.visible = false;
    if ((f.skudT = (f.skudT ?? 0) - dt) <= 0) { f.skudT = skyd.kører ? 0.9 : værk.hold; tryk(f.x, f.y); }
    return;
  }
  const hit = f && stråleFra(f.x, f.y);
  if (!hit || BLOKKE[hit.id].uknuselig) { markør.visible = revne.visible = false; if (f) f.mål = null; return; }
  const nøgle = `${hit.x},${hit.y},${hit.z}`;
  if (f.mål !== nøgle) { f.mål = nøgle; f.hak = 0; }
  f.hak += dt / (BLOKKE[hit.id].kryds ? 0.08 : HAKTID);
  f.lydT -= dt;
  if (f.lydT <= 0) { Lyd.hak(BLOKKE[hit.id].lyd); f.lydT = 0.12; sving = Math.max(sving, 0.6); }
  markør.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  revne.position.copy(markør.position);
  revne.scale.setScalar(1 + Math.sin(tid * 50) * 0.012 * f.hak);
  revne.material.opacity = Math.min(0.55, f.hak * 0.55);
  markør.visible = revne.visible = true;
  if (f.hak >= 1) { knus(hit); f.hak = 0; f.mål = null; }
}

// ---------- Spillerens bevægelse ----------
let gangFase = 0, svømmer = false;
let venteBesked = 0;
function opdaterSpiller(dt) {
  if (ONLINE) {                                     // stå stille, til jorden under en er hentet
    const x = Math.floor(sp.pos.x), z = Math.floor(sp.pos.z);
    if (!verden.hentet(x, z)) { if ((venteBesked -= dt) <= 0) { besked("Henter verden… 🌍", 1500); venteBesked = 1.6; } return; }
    if (ventPåJord) { ventPåJord = false; sp.pos.y = verden.topY(x, z) + 1; sp.vel.set(0, 0, 0); }
    if (portalKom && [[-18, -18], [18, -18], [-18, 18], [18, 18]].every(([dx, dz]) => verden.hentet(Math.max(0, Math.min(verden.BX - 1, x + dx)), Math.max(0, Math.min(verden.BZ - 1, z + dz))))) {
      portalKom = false; ankomVedPortal();
    }
  }
  const frem = tast.frem - tast.tilbage, side = tast.hoejre - tast.venstre;
  const fx = -Math.sin(sp.yaw), fz = -Math.cos(sp.yaw), rx = Math.cos(sp.yaw), rz = -Math.sin(sp.yaw);
  let mx = fx * frem + rx * side, mz = fz * frem + rz * side;
  const l = Math.hypot(mx, mz);
  if (l > 1) { mx /= l; mz /= l; }
  const fod = verden.hent(Math.floor(sp.pos.x), Math.floor(sp.pos.y + 0.1), Math.floor(sp.pos.z));
  const krop = verden.hent(Math.floor(sp.pos.x), Math.floor(sp.pos.y + 0.9), Math.floor(sp.pos.z));
  const iVand = !sp.flyver && (verden.væske[fod] === "vand" || verden.væske[krop] === "vand");
  if (iVand !== svømmer) {                                                     // plask!
    svømmer = iVand;
    document.body.classList.toggle("svømmer", iVand);
    if (iVand && sp.vel.y < -4) { Lyd.plask(); stænk(sp.pos.x, sp.pos.y + 0.9, sp.pos.z, VANDFARVE, 16); }
  }
  const underFod = verden.hent(Math.floor(sp.pos.x), Math.floor(sp.pos.y - 0.1), Math.floor(sp.pos.z));
  const glat = sp.jord && !sp.flyver && BLOKKE[underFod]?.glat;                  // på is glider man
  const fart = sp.flyver ? FLYV : iVand ? GÅ * 0.65 : glat ? GÅ * 1.5 : GÅ, greb = glat ? 0.9 : sp.jord || sp.flyver || iVand ? 12 : 3;
  sp.vel.x += (mx * fart - sp.vel.x) * Math.min(1, dt * greb);
  sp.vel.z += (mz * fart - sp.vel.z) * Math.min(1, dt * greb);
  const pc = portalVent ? null : portalCelle();
  if (pc) {                                                                    // portalen holder en blødt fast i midten
    if (verden.portalLangsX(pc.x, pc.y, pc.z)) { sp.vel.z = (pc.z + 0.5 - sp.pos.z) * 5; sp.vel.x *= 0.3; }
    else { sp.vel.x = (pc.x + 0.5 - sp.pos.x) * 5; sp.vel.z *= 0.3; }
  }
  if (sp.flyver) {
    const op = (tast.hop || tast.op ? 1 : 0) - (tast.ned ? 1 : 0);
    sp.vel.y += (op * 7 - sp.vel.y) * Math.min(1, dt * 8);
  } else if (iVand) {                                                          // man flyder op · ⬇ dykker · ⬆ svømmer op
    const mål = tast.ned ? -3 : tast.hop || tast.op ? 3.5 : 1.2;
    sp.vel.y += (mål - sp.vel.y) * Math.min(1, dt * 3);
  } else {
    if (tast.hop && sp.jord) { sp.vel.y = HOP; Lyd.hop(); }
    sp.vel.y = Math.max(-40, sp.vel.y - TYNGDE * dt);
  }
  const fald = sp.vel.y;
  const r = verden.bevæg(sp.pos, tmp.copy(sp.vel).multiplyScalar(dt), B, HØJ);
  const trampolin = r.jord && !sp.flyver && verden.hopperUnder(sp.pos, B);
  if (r.jord) {
    if (fald < -13 && !trampolin) Lyd.land();
    sp.vel.y = 0;
    if (sp.flyver && fald < -0.5) skiftFlyv();                                  // lander man, så går man igen
  }
  if (r.loft) sp.vel.y = Math.min(0, sp.vel.y);
  sp.jord = r.jord;
  if (trampolin) { sp.vel.y = Math.min(17, Math.max(11, -fald)); sp.jord = false; Lyd.boing(); }   // boing!
  if (r.væg && sp.jord && l > 0.1) {                                            // hop selv op ad ét trin
    tmp.copy(sp.pos); tmp.y += 1.05; tmp.x += mx * 0.35; tmp.z += mz * 0.35;
    if (!verden.kolliderer(tmp, B, HØJ)) sp.vel.y = Math.max(HOP * 0.92, Math.sqrt(2 * TYNGDE * 1.3));
  }
  if (r.væg && iVand && l > 0.1) sp.vel.y = Math.max(sp.vel.y, 5.5);          // kravl op ad kanten
  tjekVarme(fod, krop, dt);
  const vandret = Math.hypot(sp.vel.x, sp.vel.z);
  if (sp.jord && vandret > 0.5) {
    const før = Math.floor(gangFase * 2);
    gangFase += vandret * dt * 0.5;
    if (Math.floor(gangFase * 2) !== før) {
      const under = verden.hent(Math.floor(sp.pos.x), Math.floor(sp.pos.y - 0.1), Math.floor(sp.pos.z));
      Lyd.skridt(BLOKKE[under]?.lyd);
    }
  }
  if (sp.pos.y < -10) startSted();
  opdaterPortal(dt);
}

// ---------- Hotbar, inventar og menu ----------
const ikonFor = s => (s.v ? værktøjIkon(s.v) : s.æg ? ægIkon(ægFarver(s)) : atlas.ikon(s.blok));
const navnFor = s => (s.hammer ? "Hammer" : s.v ? VÆRKTØJ[s.v].navn : s.æg ? (s.æg === "?" ? "Overraskelses-æg" : `${dyrDef(s.æg).navn}-æg`) : BLOKKE[s.blok].navn);

function tegnHotbar() {
  const hb = $("hotbar");
  hb.innerHTML = "";
  const hammer = document.createElement("button");
  hammer.className = "slot hammer" + (gemt.valgt < 0 ? " valgt" : "");
  hammer.dataset.i = -1; hammer.textContent = "🔨"; hammer.setAttribute("aria-label", "Hammer");
  hammer.addEventListener("pointerdown", e => { e.preventDefault(); Lyd.klar(); vælgSlot(-1); });
  hb.appendChild(hammer);
  gemt.hotbar.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "slot" + (i === gemt.valgt ? " valgt" : "");
    b.dataset.i = i;
    b.setAttribute("aria-label", navnFor(s));
    const img = new Image(); img.src = ikonFor(s); img.alt = "";
    b.appendChild(img);
    b.addEventListener("pointerdown", e => { e.preventDefault(); Lyd.klar(); vælgSlot(i); });
    hb.appendChild(b);
  });
  const mere = document.createElement("button");
  mere.className = "slot mere"; mere.textContent = "⋯"; mere.setAttribute("aria-label", "Flere blokke");
  mere.addEventListener("click", () => { Lyd.klar(); visInventar(); });
  hb.appendChild(mere);
}
let navnTimer = 0;
function vælgSlot(i) {
  if (i === gemt.valgt) return;
  gemt.valgt = i;
  document.querySelectorAll("#hotbar .slot[data-i]").forEach(b => b.classList.toggle("valgt", +b.dataset.i === i));
  opdaterHånd();
  Lyd.vælg();
  const n = $("tingNavn");
  n.textContent = navnFor(valgtTing()); n.classList.add("vis");
  clearTimeout(navnTimer); navnTimer = setTimeout(() => n.classList.remove("vis"), 1400);
  gemSnart();
}

function vis(id) { $(id).classList.remove("skjult"); pause = true; joySlip(); for (const k in tast) tast[k] = 0; fingre.clear(); }
function luk(id) { $(id).classList.add("skjult"); pause = !!document.querySelector(".overlay:not(.skjult)"); }
document.querySelectorAll("[data-luk]").forEach(b => b.addEventListener("click", () => { Lyd.klik(); luk(b.dataset.luk); }));

function visInventar() {
  const grid = $("invGrid");
  grid.innerHTML = "";
  const ting = [
    ...Object.keys(VÆRKTØJ).map(v => ({ v })),
    ...BLOKKE.map((b, id) => (b && !b.skjult ? { blok: id } : null)).filter(Boolean),
    { æg: "?" }, ...DYR.map(d => ({ æg: d.id })),
  ];
  for (const s of ting) {
    const b = document.createElement("button");
    b.className = "inv-ting";
    const img = new Image(); img.src = ikonFor(s); img.alt = "";
    const t = document.createElement("span"); t.textContent = navnFor(s);
    b.append(img, t);
    b.addEventListener("click", () => {
      const plads = gemt.valgt < 0 ? 0 : gemt.valgt;
      gemt.hotbar[plads] = { ...s }; gemt.valgt = plads;
      tegnHotbar(); opdaterHånd(); Lyd.vælg(); gemSnart();
      luk("inventar");
    });
    grid.appendChild(b);
  }
  vis("inventar");
}

// Verdener man kan "hente" og skifte imellem
function visVerdener() {
  const grid = $("verdenGrid");
  grid.innerHTML = "";
  for (const v of VERDENER) {
    const kort = verdenKort(v, v.navn, v.tekst, v.id === cfg.id ? "▶ Du er her" : hentet.includes(v.id) ? "▶ Spil" : "⬇ Hent", () => vælgVerden(v));
    if (v.id === cfg.id) kort.classList.add("her");
    grid.appendChild(kort);
  }
  vis("verdener");
}
// Ét kort med verdenens farver, ikon, et par af dens blokke, navn, tekst og en knap
function verdenKort(v, navnTekst, tekstTekst, knapTekst, vedTryk) {
  const kort = document.createElement("div");
  kort.className = "verden-kort";
  kort.style.background = `linear-gradient(165deg, ${v.himmel[0]}, ${v.himmel[1]})`;
  const top = document.createElement("div"); top.className = "verden-top";
  const ikon = document.createElement("span"); ikon.className = "verden-ikon"; ikon.textContent = v.ikon;
  top.appendChild(ikon);
  for (const n of v.vis) { const img = new Image(); img.src = atlas.ikon(ID[n]); img.alt = ""; top.appendChild(img); }
  const navn = document.createElement("div"); navn.className = "verden-navn"; navn.textContent = navnTekst;
  const tekst = document.createElement("div"); tekst.className = "verden-tekst"; tekst.textContent = tekstTekst;
  const knap = document.createElement("button"); knap.className = "mc";
  knap.textContent = knapTekst; knap.disabled = !vedTryk;
  if (vedTryk) knap.addEventListener("click", vedTryk);
  kort.append(top, navn, tekst, knap);
  return kort;
}
function vælgVerden(v) {
  Lyd.klar(); Lyd.klik();
  if (v.id === cfg.id) { luk("verdener"); if (!iGang) startSpil(); return; }
  if (hentet.includes(v.id)) { skiftTil(v); return; }
  // "Download" — en lille statuslinje mens verdenen bliver gjort klar
  vis("henter");
  $("henterNavn").textContent = `Henter ${v.navn} ${v.ikon}`;
  const fyld = $("henterFyld"), tekst = $("henterTekst");
  let p = 0;
  (function trin() {
    p = Math.min(100, p + 4 + Math.random() * 9);
    fyld.style.width = p + "%";
    tekst.textContent = `${v.hent[Math.min(v.hent.length - 1, Math.floor(p / 100 * v.hent.length))]}  ${Math.round(p)}%`;
    Lyd.klik();
    if (p < 100) { setTimeout(trin, 90 + Math.random() * 90); return; }
    hentet.push(v.id); skriv("broekraft-hentet", hentet);
    Lyd.æg(); tekst.textContent = "Færdig! ✓";
    setTimeout(() => skiftTil(v), 700);
  })();
}
function skiftTil(v) {
  gem();
  skriv("broekraft-verden", v.id);
  try { sessionStorage.setItem("broekraft-start", "1"); } catch (_) {}
  location.reload();
}

$("verdenKnap").addEventListener("click", () => { Lyd.klar(); Lyd.klik(); visVerdener(); });
$("skiftVerden").addEventListener("click", () => { Lyd.klik(); luk("menu"); visVerdener(); });
$("menuKnap").addEventListener("click", () => { Lyd.klik(); $("musikKnap").textContent = musikTekst(); nyTryk = 0; $("nyVerden").textContent = "🔄 Start forfra"; vis("menu"); });
const ildTekst = () => (gemt.ildBreder !== false ? "🔥 Ild breder sig: TIL" : "🔥 Ild breder sig: FRA");
$("menuKnap").addEventListener("click", () => { $("ildKnap").textContent = ildTekst(); });
$("ildKnap").addEventListener("click", () => {
  gemt.ildBreder = gemt.ildBreder === false;
  if (sim) sim.ildBreder = gemt.ildBreder;
  Lyd.klik(); $("ildKnap").textContent = ildTekst(); gemSnart();
});
// Baggrundsmusik: tryk for at skifte mellem stille, hardstyle, rock, 8-bit og fra (gælder alle verdener)
let musikStil = læs("broekraft-musikstil", læs("broekraft-musik", true) === false ? "fra" : "stille");
const musikTekst = () => `🎵 Musik: ${(Lyd.MUSIKSTILE.find(m => m.id === musikStil) || Lyd.MUSIKSTILE[0]).navn}`;
$("musikKnap").addEventListener("click", () => {
  const i = Lyd.MUSIKSTILE.findIndex(m => m.id === musikStil);
  musikStil = Lyd.MUSIKSTILE[(i + 1) % Lyd.MUSIKSTILE.length].id;
  skriv("broekraft-musikstil", musikStil); gemt.musik = musikStil !== "fra"; gemSnart();
  Lyd.klar(); Lyd.sætMusikStil(musikStil); Lyd.klik();
  $("musikKnap").textContent = musikTekst();
});
$("musikKnap").textContent = musikTekst();
$("hjemStart").addEventListener("click", () => { Lyd.klik(); skyd.stigUd(); startSted(); if (sp.flyver) skiftFlyv(); luk("menu"); gemSnart(); });
$("udsynKnap").textContent = `👀 Udsyn: ${UDSYN[udsynNr].navn}`;
$("udsynKnap").addEventListener("click", () => {                  // hvor langt kan man se (online)
  udsynNr = (udsynNr + 1) % UDSYN.length; skriv("broekraft-udsyn", udsynNr); Lyd.klik();
  [scene.fog.near, scene.fog.far] = UDSYN[udsynNr].tåge;
  net?.udsyn(UDSYN[udsynNr].r);
  $("udsynKnap").textContent = `👀 Udsyn: ${UDSYN[udsynNr].navn}`;
});
$("forladKnap").addEventListener("click", () => { Lyd.klik(); stopTale(); net?.luk(); location.href = "/"; });
let nyTryk = 0;
$("nyVerden").addEventListener("click", () => {
  Lyd.klik();
  if (Date.now() - nyTryk > 4000) { nyTryk = Date.now(); $("nyVerden").textContent = "Er du sikker? Tryk igen 🔄"; return; }
  clearTimeout(gemTimer);
  gemt = { frø: (Math.random() * 2 ** 31) | 0, ændringer: {}, hotbar: gemt.hotbar, valgt: gemt.valgt, musik: gemt.musik };
  try { localStorage.setItem(GEM, JSON.stringify(gemt)); sessionStorage.setItem("broekraft-start", "1"); } catch (_) {}
  window.removeEventListener("pagehide", gem);
  location.reload();
});

let beskedTimer = 0;
function besked(tekst, ms = 2200) {
  const b = $("besked");
  b.textContent = tekst; b.classList.add("vis");
  clearTimeout(beskedTimer); beskedTimer = setTimeout(() => b.classList.remove("vis"), ms);
}

// ---------- Tegn hver frame ----------
// Mål selve billedfladen (ikke vinduet), så billedet aldrig bliver strakt — heller ikke når telefonen vendes
function størrelse() {
  const el = renderer.domElement, w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.fov = w / h < 1 ? 80 : 70;
  kamera.updateProjectionMatrix();
}
window.Effekter.vedStørrelse(størrelse);
størrelse();

// ---------- Brandmandsbyen: huse, der af og til brænder (kun alene — sammen styrer serveren ilden) ----------
const RØGMØRK = new THREE.Color("#4a4a4e");
const brand = cfg.brand && !ONLINE ? new Brandvæsen(verden, {
  sæt: (x, y, z, id) => verden.sæt(x, y, z, id),
  røg: (x, y, z) => partikel(x + (Math.random() - 0.5) * 0.8, y, z + (Math.random() - 0.5) * 0.8, RØGMØRK,
    (Math.random() - 0.5) * 0.6, 2.4 + Math.random(), (Math.random() - 0.5) * 0.6, 3.6, -0.1, 6),
  besked, alarm: () => Lyd.sirene(),
  reddet: (x, y, z) => {
    nyePoint(5); Lyd.reddet(); besked("🚒 Du reddede huset! ⭐", 3500);
    const p = tilSkærm({ x, y, z }); E.konfetti(p.x, p.y, { antal: 50 });
  },
}) : null;

let tid = 0, sidst = performance.now(), fejlVist = false;
renderer.setAnimationLoop(nu => {
  try { tegnFrame(nu); } catch (fejl) { if (!fejlVist) { fejlVist = true; console.error(fejl); } }   // spillet kører videre selv hvis noget går galt
});
function tegnFrame(nu) {
  const dt = Math.max(0, Math.min(0.05, (nu - sidst) / 1000));
  sidst = nu; tid += dt;
  if (iGang && !pause) {
    if (skyd.kører) { skyd.styr(tast, sp.yaw, dt); sp.pitch = Math.max(-1.1, Math.min(0.45, sp.pitch)); } else opdaterSpiller(dt);
    opdaterHak(dt); genfød(dt); opdaterTNT(dt); sim?.tick(dt); opdaterGløder(dt);
    skyd.opdater(dt); fyr.opdater(dt); brand?.opdater(dt, sp.pos); opdaterKugler(dt);
    if (valgtTing().v === "stjernekaster" && !skyd.kører) {
      stjernedrys(3, 1.6);
      if ((gnistLyd -= dt) <= 0) { gnistLyd = 0.15; Lyd.gnistre(); }
    }
  }
  else if (!iGang) sp.yaw += dt * 0.06;                                           // titelskærm: kig langsomt rundt
  for (const d of dyr) d.opdater(dt, sp.pos);
  if (ONLINE) opdaterOnline(dt);
  verden.opdater(ONLINE ? 6 : verden.snavset.size > 40 ? 12 : 4);
  animerVæsker();
  tegnPortalSlør(dt);
  opdaterVærktøj(håndFlamme, tid);
  opdaterStykker(dt);
  for (const s of skyer) {                                                        // skyerne driver og følger med
    s.position.x += dt * 0.8;
    if (s.position.x - kamera.position.x > 120) s.position.x -= 240; else if (s.position.x - kamera.position.x < -120) s.position.x += 240;
    if (s.position.z - kamera.position.z > 120) s.position.z -= 240; else if (s.position.z - kamera.position.z < -120) s.position.z += 240;
  }

  const bob = sp.jord && !sp.flyver ? Math.abs(Math.sin(gangFase * Math.PI)) * 0.06 : 0;
  if (skyd.kører) {                                                               // kameraet bag og over kampvognen
    const kv = skyd.kører, cp = Math.cos(sp.pitch), fx = -Math.sin(sp.yaw) * cp, fy = Math.sin(sp.pitch), fz = -Math.cos(sp.yaw) * cp;
    let afst = 7.5;
    for (let d = 1.5; d <= 7.5; d += 0.5) if (verden.erFast(Math.floor(kv.pos.x - fx * d), Math.floor(kv.pos.y + 2.4 - fy * d), Math.floor(kv.pos.z - fz * d))) { afst = d - 0.6; break; }
    kamera.position.set(kv.pos.x - fx * afst, kv.pos.y + 2.4 - fy * afst, kv.pos.z - fz * afst);
  } else kamera.position.set(sp.pos.x, sp.pos.y + ØJE + bob, sp.pos.z);
  if (rystelse > 0) {                                                             // skærmen ryster efter et brag
    rystelse = Math.max(0, rystelse - dt * 1.6);
    kamera.position.x += (Math.random() - 0.5) * rystelse * 0.3;
    kamera.position.y += (Math.random() - 0.5) * rystelse * 0.3;
    kamera.position.z += (Math.random() - 0.5) * rystelse * 0.3;
  }
  kamera.rotation.set(sp.pitch, sp.yaw, 0);
  const øje = verden.hent(Math.floor(kamera.position.x), Math.floor(kamera.position.y), Math.floor(kamera.position.z));
  const underVand = iGang && verden.væske[øje] === "vand";
  if (underVand !== document.body.classList.contains("under-vand")) document.body.classList.toggle("under-vand", underVand);
  himmel.position.copy(kamera.position);
  if (stjerner) stjerner.position.copy(kamera.position);
  opdaterSne(dt, tid); opdaterNordlys(tid);
  for (const m of følgerKamera) { m.position.copy(kamera.position).addScaledVector(m.userData.retning, m.userData.afstand); m.lookAt(kamera.position); }

  sving = Math.max(0, sving - dt * 4);
  const s = Math.sin(sving * Math.PI);
  hånd.position.set(0.4 + Math.cos(gangFase * Math.PI * 2) * 0.012, -0.36 + bob * 0.4 - s * 0.1, -0.9 - s * 0.1);
  hånd.rotation.x = -s * 0.8;
  hånd.visible = iGang && !skyd.kører;
  renderer.render(scene, kamera);
}

// ---------- Start ----------
async function startSpil() {
  Lyd.sætStemning(cfg.stemning);
  Lyd.klar(); Lyd.sætMusikStil(musikStil); Lyd.klik();
  if (ONLINE && !(await forbindOnline())) return;
  try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (_) {}
  iGang = true;
  luk("start");
  document.body.classList.add("i-gang");
  besked(ONLINE ? `${figurIkon(minFigur)} Velkommen til ${onlineInfo?.navn || cfg.navn}!` : `${cfg.ikon} ${cfg.navn}`, 2400);
  setTimeout(() => { if (iGang) besked(cfg.id === "pirat" ? "🏴‍☠️ Find de røde krydser i sandet, og grav skatten op med 🔨 hammeren · tryk på kanonerne!"
    : cfg.brand ? "🚒 Tag brandslangen, og hold fingeren nede for at sprøjte · følg røgen, når det brænder"
    : cfg.skyd ? "🎯 Tryk for at skyde · hold fingeren nede for at skyde mange · tryk på en grøn kampvogn for at køre"
    : cfg.fyrværkeri ? "🎆 Tryk for at sende en raket op · tænd fyrværkeri-kasserne med 🔥 tænderen"
    : nyVæske ? "NYT: 🪣 Vand, 🌋 lava og 🔥 ild! Find dem i ⋯" : nyTNT && !ONLINE ? "NYT: 🧨 TNT! Sæt den og slå på den med 🔨" : "Tryk = byg 🧱   🔨 = fjern   Træk = kig 👀", 5000); }, 2500);
  const tip = læs("broekraft-portaltip", 0);                      // de første par gange: sådan laver man en portal
  if (tip < 3 && !portalKom) { skriv("broekraft-portaltip", tip + 1); setTimeout(() => { if (iGang) besked("NYT: 🌀 Byg en ramme af obsidian, og tænd den med 🔥 — så får du en portal!", 5500); }, 8500); }
}
tegnHotbar();
opdaterHånd();
$("verdenNavn").textContent = `${cfg.ikon} ${cfg.navn}`;
$("verdenNy").classList.toggle("skjult", hentet.length >= VERDENER.length);
const startKnap = $("startKnap");
startKnap.textContent = ONLINE ? "▶ Spil sammen" : "▶ Spil";
startKnap.disabled = false;
startKnap.addEventListener("click", startSpil);
let autoStart = false;
try { autoStart = (!ONLINE || portalKom) && sessionStorage.getItem("broekraft-start") === "1"; sessionStorage.removeItem("broekraft-start"); } catch (_) {}
if (portalKom && !ONLINE) ankomVedPortal();
if (autoStart) setTimeout(startSpil, 0);                          // når hele filen er læst (så forbindelsen til serveren er klar)
// ---------- Spil sammen: forbindelsen til familiens Broekraft Server ----------
let net = null, minId = null, førsteVelkommen = true, dyrLavet = false, sidsteBum = null;
let minFigur = læs("broekraft-figur", "gris");
if (!FIGURER.some(f => f.id === minFigur)) minFigur = "gris";
const andre = new Map();                                          // id → Figur

function status(tekst) { $("status").textContent = tekst; }
function opdaterStatus() {
  const alle = [figurIkon(minFigur), ...[...andre.values()].map(f => figurIkon(f.figur))];
  status(`🟢 ${alle.join(" ")}`);
}

// Titelskærmen: vælg dit dyr, før du går ind
function forberedOnline() {
  $("verdenNavn").textContent = onlineInfo ? `${cfg.ikon} ${onlineInfo.navn} · ${onlineInfo.spillere}/${onlineInfo.maks} spillere` : "";
  document.querySelector(".splash").textContent = "Spil sammen!";
  const grid = $("figurValg");
  for (const f of FIGURER) {
    const b = document.createElement("button");
    b.className = "figur" + (f.id === minFigur ? " valgt" : "");
    b.innerHTML = `<span class="figur-ikon">${f.ikon}</span><span>${f.navn}</span>`;
    b.addEventListener("click", () => {
      minFigur = f.id; skriv("broekraft-figur", f.id); Lyd.klar(); Lyd.vælg();
      grid.querySelectorAll(".figur").forEach(x => x.classList.toggle("valgt", x === b));
    });
    grid.appendChild(b);
  }
  if (!onlineInfo) visFejl("Verdenen er ikke startet 😕", "Bed en voksen om at starte den på computeren.");
}
function visFejl(titel, tekst) {
  vis("start");
  iGang = false; document.body.classList.remove("i-gang");
  $("onlineFejl").textContent = `${titel} ${tekst}`;
  $("onlineFejl").classList.remove("skjult");
  startKnap.disabled = !onlineInfo; startKnap.textContent = "🔄 Prøv igen";
}

async function forbindOnline() {
  startKnap.disabled = true; startKnap.textContent = "Forbinder…";
  $("onlineFejl").classList.add("skjult");
  stopTale();
  if (net) { net.luk(); net = null; }
  try {
    net = await forbind(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`, { figur: minFigur });
  } catch (fejl) { visFejl("Kunne ikke finde computeren 😕", "Er den tændt, og er I på samme wifi?"); return false; }
  net.addEventListener("velkommen", e => velkommen(e.detail));
  net.addEventListener("klump", e => verden.søjle(e.detail.cx, e.detail.cz, e.detail.data));
  net.addEventListener("glem", e => verden.glemSøjle(e.detail.cx, e.detail.cz));
  net.addEventListener("blok", e => blokFraServer(e.detail));
  net.addEventListener("ind", e => {
    if (e.detail.id === minId || andre.has(e.detail.id)) return;
    nyFigur(e.detail); Lyd.æg(); besked(`${figurIkon(e.detail.figur)} er kommet ind!`); opdaterStatus();
  });
  net.addEventListener("ud", e => {
    const f = andre.get(e.detail.id);
    if (f) { besked(`${figurIkon(f.figur)} er gået 👋`); f.fjern(); andre.delete(e.detail.id); opdaterStatus(); }
  });
  net.addEventListener("pos", e => {
    for (const p of e.detail.liste) if (p.id !== minId) (andre.get(p.id) || nyFigur(p)).sæt(p.x, p.y, p.z, p.yaw);
  });
  net.addEventListener("bum", e => { sidsteBum = { ...e.detail, tid: performance.now() }; bragEffekt(e.detail.x, e.detail.y, e.detail.z); });
  net.addEventListener("emoji", e => visEmoji(e.detail.id, e.detail.e));
  net.addEventListener("fyrværkeri", e => fyr.raket(e.detail.x, e.detail.y, e.detail.z, e.detail));
  net.addEventListener("lukket", e => status(e.detail.genforbinder ? "🟡 Forbinder igen…" : "🔴 Afbrudt"));
  net.addEventListener("fejl", e => besked(`⚠️ ${e.detail.besked}`, 3000));
  net.udsyn(UDSYN[udsynNr].r);
  try { await net.vælg(ONLINE_ID); }
  catch (fejl) {
    net.luk(); net = null;
    visFejl(fejl.message === "fuld" ? "Verdenen er fuld 😕" : "Kunne ikke komme ind i verdenen 😕",
      fejl.message === "fuld" ? "Vent lidt, eller vælg en anden verden." : "Prøv igen om lidt.");
    return false;
  }
  startTale();
  startKnap.textContent = "▶ Spil sammen"; startKnap.disabled = false;
  return true;
}

// Serveren siger velkommen — også når forbindelsen kommer igen efter et hul
function velkommen(v) {
  minId = v.dig;
  verden.rydAlt();
  for (const f of andre.values()) f.fjern();
  andre.clear();
  for (const p of v.spillere) {
    if (p.id !== minId) { nyFigur(p); continue; }
    if (førsteVelkommen) { sp.pos.set(p.x, p.y, p.z); sp.vel.set(0, 0, 0); ventPåJord = false; }
  }
  førsteVelkommen = false;
  opdaterStatus();
}
function nyFigur(p) {
  const f = new Figur(p.id, p.figur, scene);
  andre.set(p.id, f);
  if (Number.isFinite(p.x)) f.sæt(p.x, p.y, p.z, p.yaw || 0);
  return f;
}
function blokFraServer({ x, y, z, id }) {
  const før = verden.hent(x, y, z);
  if (!verden.sæt(x, y, z, id)) return;
  portalTjek(x, y, z);
  if (verden.væske[før] === "lava" && (id === ID.Sten || id === ID.Obsidian)) simLyd("tss", x, y, z);
  else if (id === ID.Ild) simLyd("knitre", x, y, z);
  // blokke der ryger i et brag, flyver som småstykker
  if (!id && før && sidsteBum && performance.now() - sidsteBum.tid < 700 && Math.random() < 0.4) {
    const a = Math.max(0.3, Math.hypot(x + 0.5 - sidsteBum.x, z + 0.5 - sidsteBum.z)), f = atlas.farve(før);
    for (let k = 0; k < 3; k++) partikel(x + 0.5, y + 0.5, z + 0.5, f.clone().multiplyScalar(0.8 + Math.random() * 0.4),
      (x + 0.5 - sidsteBum.x) / a * 7 + (Math.random() - 0.5) * 3, 3 + Math.random() * 6, (z + 0.5 - sidsteBum.z) / a * 7 + (Math.random() - 0.5) * 3, 0.9 + Math.random() * 0.6);
  }
}
function visEmoji(id, e) {
  if (id === minId) E.tekstPop(window.innerWidth / 2, window.innerHeight * 0.3, e, { s: 90 });
  else andre.get(id)?.visEmoji(e);
  Lyd.vælg();
}
function opdaterOnline(dt) {
  for (const f of andre.values()) f.opdater(dt);
  if (!iGang || !net) return;
  net.pos(sp.pos.x, sp.pos.y, sp.pos.z, sp.yaw, sp.pitch);
  sendKø(dt);
  if (!dyrLavet && verden.hentet(Math.floor(sp.pos.x), Math.floor(sp.pos.z)) && !ventPåJord) { dyrLavet = true; lavStartDyr(sp.pos.x, sp.pos.z); }
}
// Emoji-knapperne
$("emojiKnap").addEventListener("click", () => { Lyd.klar(); Lyd.klik(); $("stemmeBar").classList.add("skjult"); $("emojiBar").classList.toggle("skjult"); });
$("emojiBar").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
  net?.emoji(b.textContent); $("emojiBar").classList.add("skjult");
}));

// ---------- Walkie-talkie: hold 🎤 nede og tal med de andre — med sjove stemmer ----------
// En voksen slår det til for verdenen i kontrolpanelet. stemmer.js laver forbindelserne mellem
// tablets; her er knappen, mikrofonen, stemmerne (stemmeeffekt.js), afspilningen og lydbølgerne.
// Barnets egen stemme sendes kun ud — den spilles aldrig i ens egen højttaler.
let tale = null, graf = null, mik = null, henterMik = false, taleTip = false;
let minStemme = stemmeAf(læs("broekraft-stemme", "normal")).id;
const afspillere = new Map();                                     // id → <audio> med et andet barns stemme
const talere = new Set();
const mikKnap = $("mikKnap"), stemmeBar = $("stemmeBar");

function startTale() {
  if (!net || tale) return;
  try {
    graf ||= new Stemmegraf(E.audio());
    graf.sæt(minStemme);
    tale = forbindStemmer(net, graf.strøm);
  } catch (fejl) { console.warn("Walkie-talkie er ikke mulig her:", fejl.message); tale = null; return; }
  tale.addEventListener("stemmerTil", e => visTaleknap(e.detail.til));
  tale.addEventListener("lyd", e => nyAfspiller(e.detail.id, e.detail.strøm));
  tale.addEventListener("lydSlut", e => fjernAfspiller(e.detail.id));
  tale.addEventListener("taler", e => talerSkift(e.detail.id, e.detail.til));
  tale.addEventListener("fejl", e => besked(`🎤 ${e.detail.besked}`, 3500));
}
function stopTale() {
  tale?.luk(); tale = null;
  slipMikrofon();
  for (const id of [...afspillere.keys()]) fjernAfspiller(id);
  talere.clear(); Lyd.dæmp(false);
  document.body.classList.remove("kan-tale");
}
// Knapperne vises kun, når en voksen har sagt ja
function visTaleknap(til) {
  document.body.classList.toggle("kan-tale", til);
  if (!til) { slipMikrofon(); mikKnap.classList.remove("taler"); stemmeBar.classList.add("skjult"); return; }
  if (taleTip) return;
  taleTip = true;
  setTimeout(() => { if (tale?.tilladt && iGang) besked("🎤 I kan tale sammen! Hold mikrofonen nede, mens du snakker", 4500); }, iGang ? 0 : 8000);
}

// Mikrofonen: spørg først om lov, når barnet trykker på 🎤 første gang
async function hentMikrofon() {
  if (PARAM.has("falskmik") && PARAM.has("debug")) {           // afprøvning uden mikrofon: en tone i stedet
    const ac = E.audio(), o = ac.createOscillator(), d = ac.createMediaStreamDestination();
    o.frequency.value = 220; o.connect(d); o.start();
    return d.stream;
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("usikker");
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
}
async function tændMikrofon() {
  if (henterMik) return;
  henterMik = true;
  try {
    const strøm = await hentMikrofon();
    if (!tale?.tilladt) { strøm.getTracks().forEach(t => t.stop()); return; }
    mik = strøm;
    mik.getAudioTracks()[0]?.addEventListener("ended", () => { if (mik === strøm) slipMikrofon(); });
    graf.tilslut(mik);
    Lyd.vælg(); besked("🎤 Klar! Hold knappen nede, mens du snakker", 3500);
  } catch (fejl) {
    besked(fejl.message === "usikker"
      ? "🔒 En voksen skal gøre tabletten klar til mikrofonen (se computerens kontrolpanel)"
      : "🎤 Mikrofonen fik ikke lov. En voksen kan tillade den i Safari", 5000);
  } finally { henterMik = false; }
}
function slipMikrofon() { graf?.frakobl(); mik?.getTracks().forEach(t => t.stop()); mik = null; }

// Hold nede = tal · slip = stop (også hvis fingeren glider af knappen)
function talTryk() {
  Lyd.klar(); afspilVentende();
  if (!tale?.tilladt) return;
  if (!mik) { tændMikrofon(); return; }
  if (tale.tal(true)) mikKnap.classList.add("taler");
}
function talSlip() { tale?.tal(false); mikKnap.classList.remove("taler"); }
mikKnap.addEventListener("pointerdown", e => { e.preventDefault(); try { mikKnap.setPointerCapture(e.pointerId); } catch (_) {} talTryk(); });
for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) mikKnap.addEventListener(n, talSlip);
window.addEventListener("keydown", e => { if (e.code === "KeyT" && !e.repeat && iGang && !pause) talTryk(); });   // T på computeren
window.addEventListener("keyup", e => { if (e.code === "KeyT") talSlip(); });

// De andres stemmer spilles med et lille lydelement hver. Safari vil have et tryk, før lyd må starte.
function nyAfspiller(id, strøm) {
  fjernAfspiller(id);
  const a = document.createElement("audio");
  a.autoplay = true; a.setAttribute("playsinline", ""); a.srcObject = strøm; a.hidden = true;
  document.body.appendChild(a);
  afspillere.set(id, a);
  a.play().catch(() => {});
}
function afspilVentende() { for (const a of afspillere.values()) if (a.paused) a.play().catch(() => {}); }
function fjernAfspiller(id) {
  const a = afspillere.get(id);
  if (!a) return;
  a.pause(); a.srcObject = null; a.remove(); afspillere.delete(id);
}
// Lydbølger om den, der taler — og spillets egne lyde bliver stille imens
function talerSkift(id, til) {
  if (id === minId) mikKnap.classList.toggle("taler", til);
  else andre.get(id)?.visTaler(til);
  if (til) talere.add(id); else talere.delete(id);
  Lyd.dæmp([...talere].some(t => t !== minId));
}

// Vælg en sjov stemme: 🙂 🐭 🦁 🤖 👻
for (const st of STEMMER) {
  const b = document.createElement("button");
  b.dataset.stemme = st.id; b.setAttribute("aria-label", st.navn);
  b.innerHTML = `${st.ikon}<span>${st.navn}</span>`;
  b.addEventListener("click", () => { vælgStemme(st.id); Lyd.vælg(); besked(`${st.ikon} ${st.navn}`, 1500); stemmeBar.classList.add("skjult"); });
  stemmeBar.appendChild(b);
}
function vælgStemme(id) {
  minStemme = stemmeAf(id).id; skriv("broekraft-stemme", minStemme);
  graf?.sæt(minStemme);
  $("stemmeKnap").textContent = stemmeAf(minStemme).ikon;
  stemmeBar.querySelectorAll("button").forEach(b => b.classList.toggle("valgt", b.dataset.stemme === minStemme));
}
vælgStemme(minStemme);
$("stemmeKnap").addEventListener("click", () => { Lyd.klar(); Lyd.klik(); $("emojiBar").classList.add("skjult"); stemmeBar.classList.toggle("skjult"); });
if (ONLINE) {
  document.addEventListener("pointerdown", afspilVentende, true);
  window.addEventListener("pagehide", slipMikrofon);
}

if (ONLINE) forberedOnline();
window.broekraftKlar = true;
if (location.search.includes("debug")) window.bk = { sp, verden, dyr, tast, cfg, andre, sim, get net() { return net; }, get tale() { return tale; }, get graf() { return graf; }, afspillere, skyd, fyr, tændPortal, visPortalValg, brand, steg: n => { for (let i = 0; i < n; i++) tegnFrame(sidst + 1000 / 60); sidst = performance.now(); } };
