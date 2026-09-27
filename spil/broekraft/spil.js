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
const MÅL = ONLINE ? { BX: onlineInfo?.bredde || 128, BY: 64, BZ: onlineInfo?.dybde || 128, online: true } : {};
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
const GEM = ONLINE ? `broekraft-online-${ONLINE_ID}` : cfg.id === "græsø" ? "broekraft-v1" : `broekraft-v1-${cfg.id}`;
const tilTing = n => (n.startsWith("æg:") ? { æg: n.slice(3) } : { blok: ID[n] });
const STANDARD = cfg.hotbar.map(tilTing);
let gemt = læs(GEM, null);
if (!gemt || !Number.isFinite(gemt.frø)) gemt = { frø: (Math.random() * 2 ** 31) | 0, ændringer: {}, musik: læs("broekraft-musik", true) };
const gyldig = s => s && (s.æg ? s.æg === "?" || DYR.some(d => d.id === s.æg) : BLOKKE[s.blok] && !BLOKKE[s.blok].skjult);
if (!Array.isArray(gemt.hotbar) || gemt.hotbar.length !== 9 || !gemt.hotbar.every(gyldig)) gemt.hotbar = STANDARD.map(s => ({ ...s }));
if (!(gemt.valgt >= -1 && gemt.valgt < 9)) gemt.valgt = 0;
if (gemt.musik === undefined) gemt.musik = true;
if (!gemt.tnt && !gemt.hotbar.some(s => s.blok === ID.TNT)) gemt.hotbar[7] = { blok: ID.TNT };   // nyt: TNT!
const nyTNT = !gemt.tnt;
gemt.tnt = true;

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
const verden = new Verden(gemt.frø, atlas, blokMat, scene, MÅL);
verden.tyngde = TYNGDE;
if (!ONLINE) {                                    // alene: lav øen her. Sammen: serveren sender verdenen
  verden.generer(cfg.generer);
  verden.anvend(gemt.ændringer);
  verden.bygAlle();
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
      localStorage.setItem(GEM, JSON.stringify({ frø: gemt.frø, hotbar: gemt.hotbar, valgt: gemt.valgt, musik: gemt.musik, tnt: true }));
      return;
    }
    gemt.ændringer = Object.fromEntries(verden.ændringer);
    gemt.spiller = [sp.pos.x, sp.pos.y, sp.pos.z, sp.yaw, sp.pitch, sp.flyver ? 1 : 0];
    localStorage.setItem(GEM, JSON.stringify(gemt));
  } catch (_) {}
}
let gemTimer = 0;
const gemSnart = () => { clearTimeout(gemTimer); gemTimer = setTimeout(gem, 1200); };
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
    nytDyr(dyrDef(cfg.dyr[i % cfg.dyr.length]), x + 0.5, verden.topY(x, z) + 1, z + 0.5);
  }
}
if (!ONLINE) lavStartDyr(BX / 2, BZ / 2);
let genfødTid = 6;
function genfød(dt) {                                            // nye zombier og spøgelser dukker op langt væk
  if (!cfg.genfød || (genfødTid -= dt) > 0) return;
  genfødTid = 5;
  if (dyr.filter(d => cfg.dyr.includes(d.def.id)).length >= cfg.antal) return;
  for (let f = 0; f < 12; f++) {
    const x = ONLINE ? Math.floor(sp.pos.x + (Math.random() - 0.5) * 50) : 2 + Math.floor(Math.random() * (verden.BX - 4));
    const z = ONLINE ? Math.floor(sp.pos.z + (Math.random() - 0.5) * 50) : 2 + Math.floor(Math.random() * (verden.BZ - 4));
    if (Math.hypot(x - sp.pos.x, z - sp.pos.z) < 10 || !verden.inde(x, 0, z) || !verden.hentet(x, z)) continue;
    nytDyr(dyrDef(cfg.dyr[Math.floor(Math.random() * cfg.dyr.length)]), x + 0.5, verden.topY(x, z) + 1, z + 0.5);
    return;
  }
}

// ---------- Hånden: den valgte blok, et dyre-æg eller hammeren ----------
const hånd = new THREE.Group();
kamera.add(hånd);
let håndModel = null, sving = 0;
const valgtTing = () => (gemt.valgt < 0 ? { hammer: true } : gemt.hotbar[gemt.valgt]);
const ægFarver = s => (s.æg === "?" ? ["#ffffff", "#ff7eb6"] : dyrDef(s.æg).æg);
function opdaterHånd() {
  if (håndModel) { hånd.remove(håndModel); håndModel.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } }); }
  const s = valgtTing();
  if (s.hammer) {
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
  håndModel.traverse(c => { if (c.material) { c.material.depthTest = false; c.material.fog = false; } if (!c.renderOrder) c.renderOrder = 10; });
  hånd.add(håndModel);
}

// ---------- Hak-markering og småstykker ----------
const markør = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), new THREE.LineBasicMaterial({ color: "#000000", transparent: true, opacity: 0.6 }));
const revne = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0, depthWrite: false }));
markør.visible = revne.visible = false;
scene.add(markør, revne);

const STYK = 400, stykMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial(), STYK);
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
function stråleFra(x, y) {
  ndc.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, kamera);
  return verden.stråle(ray.ray.origin, ray.ray.direction, RÆKKE);
}
function tilSkærm(p, dy = 0) {
  const v = tmp.set(p.x, p.y + dy, p.z).project(kamera);
  return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
}
const overlap = (x, y, z, p, b, h) => x + 1 > p.x - b && x < p.x + b && y + 1 > p.y && y < p.y + h && z + 1 > p.z - b && z < p.z + b;

function tryk(x, y) {
  const hit = stråleFra(x, y);
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
    if (BLOKKE[hit.id].tnt) {                                     // … men TNT bliver tændt!
      if (ONLINE) { net?.tænd(hit.x, hit.y, hit.z); tændTNT(hit.x, hit.y, hit.z, 2.2, true); } else tændTNT(hit.x, hit.y, hit.z);
      sving = 1; return;
    }
    if (!BLOKKE[hit.id].uknuselig) { knus(hit, true); sving = 1; }
    return;
  }
  sætBlok(hit);
}

function puf(d) {                                                // zombier og spøgelser bliver til konfetti og en blomst
  const p = tilSkærm(d.pos, d.h * 0.6);
  E.konfetti(p.x, p.y, { antal: 40 });
  E.tekstPop(p.x, p.y - 30, "PUF!", { s: 52 });
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
  if (der && !BLOKKE[der].kryds) return;
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
  stykker(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, atlas.farve(hit.id));
  if (hammer) Lyd.bank(BLOKKE[hit.id].lyd); else Lyd.knus(BLOKKE[hit.id].lyd);
  gemSnart();
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
  const p = tmp.set(cx, cy, cz).project(kamera);
  if (p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) E.tekstPop((p.x + 1) / 2 * window.innerWidth, (1 - p.y) / 2 * window.innerHeight, "BOOM!", { s: 80 });
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
let gangFase = 0;
let venteBesked = 0;
function opdaterSpiller(dt) {
  if (ONLINE) {                                     // stå stille, til jorden under en er hentet
    const x = Math.floor(sp.pos.x), z = Math.floor(sp.pos.z);
    if (!verden.hentet(x, z)) { if ((venteBesked -= dt) <= 0) { besked("Henter verden… 🌍", 1500); venteBesked = 1.6; } return; }
    if (ventPåJord) { ventPåJord = false; sp.pos.y = verden.topY(x, z) + 1; sp.vel.set(0, 0, 0); }
  }
  const frem = tast.frem - tast.tilbage, side = tast.hoejre - tast.venstre;
  const fx = -Math.sin(sp.yaw), fz = -Math.cos(sp.yaw), rx = Math.cos(sp.yaw), rz = -Math.sin(sp.yaw);
  let mx = fx * frem + rx * side, mz = fz * frem + rz * side;
  const l = Math.hypot(mx, mz);
  if (l > 1) { mx /= l; mz /= l; }
  const fart = sp.flyver ? FLYV : GÅ, greb = sp.jord || sp.flyver ? 12 : 3;
  sp.vel.x += (mx * fart - sp.vel.x) * Math.min(1, dt * greb);
  sp.vel.z += (mz * fart - sp.vel.z) * Math.min(1, dt * greb);
  if (sp.flyver) {
    const op = (tast.hop || tast.op ? 1 : 0) - (tast.ned ? 1 : 0);
    sp.vel.y += (op * 7 - sp.vel.y) * Math.min(1, dt * 8);
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
}

// ---------- Hotbar, inventar og menu ----------
const ikonFor = s => (s.æg ? ægIkon(ægFarver(s)) : atlas.ikon(s.blok));
const navnFor = s => (s.hammer ? "Hammer" : s.æg ? (s.æg === "?" ? "Overraskelses-æg" : `${dyrDef(s.æg).navn}-æg`) : BLOKKE[s.blok].navn);

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

function vis(id) { $(id).classList.remove("skjult"); pause = true; for (const k in tast) tast[k] = 0; fingre.clear(); }
function luk(id) { $(id).classList.add("skjult"); pause = !!document.querySelector(".overlay:not(.skjult)"); }
document.querySelectorAll("[data-luk]").forEach(b => b.addEventListener("click", () => { Lyd.klik(); luk(b.dataset.luk); }));

function visInventar() {
  const grid = $("invGrid");
  grid.innerHTML = "";
  const ting = [
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
    const kort = document.createElement("div");
    kort.className = "verden-kort" + (v.id === cfg.id ? " her" : "");
    kort.style.background = `linear-gradient(165deg, ${v.himmel[0]}, ${v.himmel[1]})`;
    const top = document.createElement("div"); top.className = "verden-top";
    const ikon = document.createElement("span"); ikon.className = "verden-ikon"; ikon.textContent = v.ikon;
    top.appendChild(ikon);
    for (const n of v.vis) { const img = new Image(); img.src = atlas.ikon(ID[n]); img.alt = ""; top.appendChild(img); }
    const navn = document.createElement("div"); navn.className = "verden-navn"; navn.textContent = v.navn;
    const tekst = document.createElement("div"); tekst.className = "verden-tekst"; tekst.textContent = v.tekst;
    const knap = document.createElement("button"); knap.className = "mc";
    knap.textContent = v.id === cfg.id ? "▶ Du er her" : hentet.includes(v.id) ? "▶ Spil" : "⬇ Hent";
    knap.addEventListener("click", () => vælgVerden(v));
    kort.append(top, navn, tekst, knap);
    grid.appendChild(kort);
  }
  vis("verdener");
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
$("menuKnap").addEventListener("click", () => { Lyd.klik(); $("musikKnap").textContent = gemt.musik ? "🎵 Musik: TIL" : "🔇 Musik: FRA"; nyTryk = 0; $("nyVerden").textContent = "🔄 Start forfra"; vis("menu"); });
$("musikKnap").addEventListener("click", () => {
  gemt.musik = !gemt.musik; Lyd.sætMusik(gemt.musik); Lyd.klik(); gemSnart(); skriv("broekraft-musik", gemt.musik);
  $("musikKnap").textContent = gemt.musik ? "🎵 Musik: TIL" : "🔇 Musik: FRA";
});
$("hjemStart").addEventListener("click", () => { Lyd.klik(); startSted(); if (sp.flyver) skiftFlyv(); luk("menu"); gemSnart(); });
$("udsynKnap").textContent = `👀 Udsyn: ${UDSYN[udsynNr].navn}`;
$("udsynKnap").addEventListener("click", () => {                  // hvor langt kan man se (online)
  udsynNr = (udsynNr + 1) % UDSYN.length; skriv("broekraft-udsyn", udsynNr); Lyd.klik();
  [scene.fog.near, scene.fog.far] = UDSYN[udsynNr].tåge;
  net?.udsyn(UDSYN[udsynNr].r);
  $("udsynKnap").textContent = `👀 Udsyn: ${UDSYN[udsynNr].navn}`;
});
$("forladKnap").addEventListener("click", () => { Lyd.klik(); net?.luk(); location.href = "/"; });
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
function størrelse() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.fov = w / h < 1 ? 80 : 70;
  kamera.updateProjectionMatrix();
}
window.addEventListener("resize", størrelse);
størrelse();

let tid = 0, sidst = performance.now(), fejlVist = false;
renderer.setAnimationLoop(nu => {
  try { tegnFrame(nu); } catch (fejl) { if (!fejlVist) { fejlVist = true; console.error(fejl); } }   // spillet kører videre selv hvis noget går galt
});
function tegnFrame(nu) {
  const dt = Math.min(0.05, (nu - sidst) / 1000);
  sidst = nu; tid += dt;
  if (iGang && !pause) { opdaterSpiller(dt); opdaterHak(dt); genfød(dt); opdaterTNT(dt); }
  else if (!iGang) sp.yaw += dt * 0.06;                                           // titelskærm: kig langsomt rundt
  for (const d of dyr) d.opdater(dt, sp.pos);
  if (ONLINE) opdaterOnline(dt);
  verden.opdater(ONLINE ? 6 : 4);
  opdaterStykker(dt);
  for (const s of skyer) {                                                        // skyerne driver og følger med
    s.position.x += dt * 0.8;
    if (s.position.x - kamera.position.x > 120) s.position.x -= 240; else if (s.position.x - kamera.position.x < -120) s.position.x += 240;
    if (s.position.z - kamera.position.z > 120) s.position.z -= 240; else if (s.position.z - kamera.position.z < -120) s.position.z += 240;
  }

  const bob = sp.jord && !sp.flyver ? Math.abs(Math.sin(gangFase * Math.PI)) * 0.06 : 0;
  kamera.position.set(sp.pos.x, sp.pos.y + ØJE + bob, sp.pos.z);
  if (rystelse > 0) {                                                             // skærmen ryster efter et brag
    rystelse = Math.max(0, rystelse - dt * 1.6);
    kamera.position.x += (Math.random() - 0.5) * rystelse * 0.3;
    kamera.position.y += (Math.random() - 0.5) * rystelse * 0.3;
    kamera.position.z += (Math.random() - 0.5) * rystelse * 0.3;
  }
  kamera.rotation.set(sp.pitch, sp.yaw, 0);
  himmel.position.copy(kamera.position);
  if (stjerner) stjerner.position.copy(kamera.position);
  for (const m of følgerKamera) { m.position.copy(kamera.position).addScaledVector(m.userData.retning, m.userData.afstand); m.lookAt(kamera.position); }

  sving = Math.max(0, sving - dt * 4);
  const s = Math.sin(sving * Math.PI);
  hånd.position.set(0.4 + Math.cos(gangFase * Math.PI * 2) * 0.012, -0.36 + bob * 0.4 - s * 0.1, -0.9 - s * 0.1);
  hånd.rotation.x = -s * 0.8;
  hånd.visible = iGang;
  renderer.render(scene, kamera);
}

// ---------- Start ----------
async function startSpil() {
  Lyd.sætStemning(cfg.stemning);
  Lyd.klar(); Lyd.sætMusik(gemt.musik); Lyd.klik();
  if (ONLINE && !(await forbindOnline())) return;
  try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (_) {}
  iGang = true;
  luk("start");
  document.body.classList.add("i-gang");
  besked(ONLINE ? `${figurIkon(minFigur)} Velkommen til ${onlineInfo?.navn || cfg.navn}!` : `${cfg.ikon} ${cfg.navn}`, 2400);
  setTimeout(() => { if (iGang) besked(nyTNT && !ONLINE ? "NYT: 🧨 TNT! Sæt den og slå på den med 🔨" : "Tryk = byg 🧱   🔨 = fjern   Træk = kig 👀", 5000); }, 2500);
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
try { autoStart = !ONLINE && sessionStorage.getItem("broekraft-start") === "1"; sessionStorage.removeItem("broekraft-start"); } catch (_) {}
if (autoStart) startSpil();
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
  if (!dyrLavet && verden.hentet(Math.floor(sp.pos.x), Math.floor(sp.pos.z)) && !ventPåJord) { dyrLavet = true; lavStartDyr(sp.pos.x, sp.pos.z); }
}
// Emoji-knapperne
$("emojiKnap").addEventListener("click", () => { Lyd.klar(); Lyd.klik(); $("emojiBar").classList.toggle("skjult"); });
$("emojiBar").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
  net?.emoji(b.textContent); $("emojiBar").classList.add("skjult");
}));

if (ONLINE) forberedOnline();
window.broekraftKlar = true;
if (location.search.includes("debug")) window.bk = { sp, verden, dyr, tast, cfg, andre, get net() { return net; } };
