// ===== Broekraft — byg og udforsk i 3D, lavet til de mindste =====
// Styring som Minecraft på tablet: pilene går, træk med fingeren for at kigge rundt,
// tryk = sæt en blok, hold fingeren = hak en blok, hop-knap (dobbelttryk = flyv).
// På computer: WASD/pile, mellemrum = hop (to gange = flyv), shift = ned, 1–9 = vælg blok, E = inventar.
// Blokkene står i blokke.js og dyrene i dyr.js — tilføj flere dér.

import * as THREE from "./three.js";
import { BLOKKE, ID, lavAtlas } from "./blokke.js";
import { Verden, BX, BY, BZ, HAV, rng } from "./verden.js";
import { DYR, Dyr, ægIkon } from "./dyr.js";
import * as Lyd from "./lyd.js";

const E = window.Effekter, $ = id => document.getElementById(id);
const RÆKKE = 7, HAKTID = 0.4;                                  // hvor langt man når, og hvor længe en blok tager at hakke
const B = 0.3, HØJ = 1.7, ØJE = 1.55, HOP = 8.6, TYNGDE = 28, GÅ = 4.3, FLYV = 9;

// ---------- Gemt verden (kun på denne enhed) ----------
const GEM = "broekraft-v1";
const STANDARD = [
  { blok: ID["Græs"] }, { blok: ID.Planker }, { blok: ID.Sten }, { blok: ID.Glas }, { blok: ID["Rød uld"] },
  { blok: ID["Gul uld"] }, { blok: ID["Blå uld"] }, { blok: ID.Regnbue }, { æg: "?" },
];
let gemt = null;
try { gemt = JSON.parse(localStorage.getItem(GEM)); } catch (_) {}
if (!gemt || !Number.isFinite(gemt.frø)) gemt = { frø: (Math.random() * 2 ** 31) | 0, ændringer: {}, musik: true };
const gyldig = s => s && (s.æg ? s.æg === "?" || DYR.some(d => d.id === s.æg) : BLOKKE[s.blok] && !BLOKKE[s.blok].skjult);
if (!Array.isArray(gemt.hotbar) || gemt.hotbar.length !== 9 || !gemt.hotbar.every(gyldig)) gemt.hotbar = STANDARD.map(s => ({ ...s }));
if (!(gemt.valgt >= 0 && gemt.valgt < 9)) gemt.valgt = 0;
if (gemt.musik === undefined) gemt.musik = true;

// ---------- 3D-scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $("scene"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const HORISONT = new THREE.Color("#cde8ff");
scene.background = HORISONT;
scene.fog = new THREE.Fog(HORISONT, 30, 72);
const kamera = new THREE.PerspectiveCamera(70, 1, 0.05, 500);
kamera.rotation.order = "YXZ";
scene.add(kamera);
scene.add(new THREE.HemisphereLight("#ffffff", "#7a9a5a", 2.2));
const sollys = new THREE.DirectionalLight("#ffffff", 1.4);
sollys.position.set(0.5, 1, 0.3);
scene.add(sollys);

// himmel, firkantet sol, hav og skyer
const himmelGeo = new THREE.SphereGeometry(300, 24, 12), hp = himmelGeo.attributes.position, hf = [];
{
  const top = new THREE.Color("#4a9df5"), c = new THREE.Color();
  for (let i = 0; i < hp.count; i++) { c.copy(HORISONT).lerp(top, Math.pow(Math.max(0, hp.getY(i) / 300), 0.6)); hf.push(c.r, c.g, c.b); }
}
himmelGeo.setAttribute("color", new THREE.Float32BufferAttribute(hf, 3));
const himmel = new THREE.Mesh(himmelGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
himmel.renderOrder = -1;
scene.add(himmel);
const sol = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.MeshBasicMaterial({ color: "#fff6b0", fog: false }));
const SOL_RETNING = new THREE.Vector3(0.4, 0.55, -0.7).normalize();
scene.add(sol);
const hav = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#3f8fe0" }));
hav.position.set(BX / 2, HAV, BZ / 2);
scene.add(hav);
const skyer = [], skyR = rng(gemt.frø + 7), skyMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85, fog: false });
for (let i = 0; i < 16; i++) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(6 + skyR() * 14, 1.5, 4 + skyR() * 10), skyMat);
  s.position.set(-60 + skyR() * 184, 44 + skyR() * 4, -60 + skyR() * 184);
  scene.add(s); skyer.push(s);
}

// ---------- Verdenen ----------
const atlas = lavAtlas();
const blokMat = new THREE.MeshBasicMaterial({ map: atlas.tekstur, vertexColors: true, alphaTest: 0.5 });
const verden = new Verden(gemt.frø, atlas, blokMat, scene);
verden.generer();
verden.anvend(gemt.ændringer);
verden.bygAlle();

// ---------- Spilleren ----------
const sp = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0.6, pitch: -0.25, jord: false, flyver: false };
function startSted() {
  const x = Math.floor(BX / 2), z = Math.floor(BZ / 2);
  sp.pos.set(x + 0.5, verden.topY(x, z) + 1, z + 0.5);
  sp.vel.set(0, 0, 0);
}
if (Array.isArray(gemt.spiller) && gemt.spiller.every(Number.isFinite)) {
  const [x, y, z, yaw, pitch, fly] = gemt.spiller;
  sp.pos.set(x, y, z); sp.yaw = yaw; sp.pitch = pitch; sp.flyver = !!fly;
} else startSted();
while (verden.kolliderer(sp.pos, B, HØJ) && sp.pos.y < BY + 2) sp.pos.y += 1;
document.body.classList.toggle("flyver", sp.flyver);

function gem() {
  try {
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
function nytDyr(def, x, y, z) {
  const d = new Dyr(def, verden, scene);
  d.pos.set(x, y, z);
  while (verden.kolliderer(d.pos, d.b, d.h) && d.pos.y < BY) d.pos.y += 1;
  dyr.push(d);
  while (dyr.length > 30) dyr.shift().fjern();
  return d;
}
{
  const R = rng(gemt.frø + 99);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(BX / 2 + (R() - 0.5) * 26), z = Math.floor(BZ / 2 + (R() - 0.5) * 26);
    nytDyr(DYR[i % DYR.length], x + 0.5, verden.topY(x, z) + 1, z + 0.5);
  }
}

// ---------- Hånden med den valgte blok ----------
const hånd = new THREE.Group();
kamera.add(hånd);
let håndModel = null, sving = 0;
const ægFarver = s => s.æg === "?" ? ["#ffffff", "#ff7eb6"] : (DYR.find(d => d.id === s.æg) || DYR[0]).æg;
function opdaterHånd() {
  if (håndModel) { hånd.remove(håndModel); håndModel.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } }); }
  const s = gemt.hotbar[gemt.valgt];
  if (s.æg) {
    const [a, b] = ægFarver(s);
    håndModel = new THREE.Group();
    const æg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshLambertMaterial({ color: a }));
    æg.scale.set(0.75, 1, 0.75);
    håndModel.add(æg);
    for (const [x, y, z] of [[0.33, 0.2, 0.1], [-0.2, -0.1, 0.3], [0.1, -0.3, 0.3], [-0.3, 0.25, -0.1], [0.2, 0, -0.3]]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshLambertMaterial({ color: b }));
      p.position.set(x, y, z); p.renderOrder = 11; håndModel.add(p);
    }
  } else håndModel = atlas.blokMesh(s.blok);
  håndModel.scale.setScalar(0.22);
  håndModel.rotation.set(0.15, 0.75, 0);
  håndModel.traverse(c => { if (c.material) { c.material.depthTest = false; c.material.fog = false; } if (!c.renderOrder) c.renderOrder = 10; });
  hånd.add(håndModel);
}

// ---------- Hak-markering og småstykker ----------
const markør = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), new THREE.LineBasicMaterial({ color: "#000000", transparent: true, opacity: 0.6 }));
const revne = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0, depthWrite: false }));
markør.visible = revne.visible = false;
scene.add(markør, revne);

const STYK = 160, stykMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial(), STYK);
stykMesh.frustumCulled = false;
scene.add(stykMesh);
const styk = Array.from({ length: STYK }, () => ({ liv: 0 }));
let stykNr = 0;
const dummy = new THREE.Object3D(), tmp = new THREE.Vector3();
function stykker(x, y, z, farve) {
  for (let i = 0; i < 16; i++) {
    const n = stykNr; stykNr = (stykNr + 1) % STYK;
    Object.assign(styk[n], {
      x: x + (Math.random() - 0.5) * 0.6, y: y + (Math.random() - 0.5) * 0.6, z: z + (Math.random() - 0.5) * 0.6,
      vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 4, vz: (Math.random() - 0.5) * 4, liv: 0.6 + Math.random() * 0.4,
    });
    stykMesh.setColorAt(n, farve.clone().multiplyScalar(0.8 + Math.random() * 0.4));
  }
  stykMesh.instanceColor.needsUpdate = true;
}
function opdaterStykker(dt) {
  for (let i = 0; i < STYK; i++) {
    const s = styk[i];
    if (s.liv > 0) {
      s.liv -= dt; s.vy -= 20 * dt;
      s.x += s.vx * dt; s.z += s.vz * dt;
      const ny = s.y + s.vy * dt;
      if (verden.erFast(Math.floor(s.x), Math.floor(ny), Math.floor(s.z))) { s.vy = 0; s.vx *= 0.8; s.vz *= 0.8; } else s.y = ny;
    }
    dummy.position.set(s.x || 0, s.y || 0, s.z || 0);
    dummy.scale.setScalar(s.liv > 0 ? Math.min(1, s.liv * 3) : 0);
    dummy.updateMatrix();
    stykMesh.setMatrixAt(i, dummy.matrix);
  }
  stykMesh.instanceMatrix.needsUpdate = true;
}

// ---------- Byg, hak og dyr ----------
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
    bedst.d.klap();
    const p = tilSkærm(bedst.d.pos, bedst.d.h + 0.3);
    E.tekstPop(p.x, p.y, "❤️", { s: 50 });
    return;
  }
  if (hit) sætBlok(hit);
}

function sætBlok(hit) {
  const s = gemt.hotbar[gemt.valgt];
  let tx = hit.x + hit.n[0], ty = hit.y + hit.n[1], tz = hit.z + hit.n[2];
  if (BLOKKE[hit.id].kryds) { tx = hit.x; ty = hit.y; tz = hit.z; }            // tryk på en blomst = byt den ud
  if (s.æg) { lavDyr(s, tx, ty, tz); return; }
  if (!verden.inde(tx, ty, tz)) return;
  const der = verden.hent(tx, ty, tz);
  if (der && !BLOKKE[der].kryds) return;
  const b = BLOKKE[s.blok];
  if (b.kryds && !verden.fast[verden.hent(tx, ty - 1, tz)]) return;             // blomster skal stå på noget
  if (!b.kryds && (overlap(tx, ty, tz, sp.pos, B, HØJ) || dyr.some(d => overlap(tx, ty, tz, d.pos, d.b, d.h)))) return;
  verden.sæt(tx, ty, tz, s.blok);
  Lyd.sæt(b.lyd);
  sving = 1;
  gemSnart();
}

function lavDyr(s, x, y, z) {
  if (x < 0 || x >= BX || z < 0 || z >= BZ || y >= BY) return;
  const def = s.æg === "?" ? DYR[Math.floor(Math.random() * DYR.length)] : DYR.find(d => d.id === s.æg) || DYR[0];
  const d = nytDyr(def, x + 0.5, y + 0.01, z + 0.5);
  d.klapTid = 0.5;
  Lyd.æg(); sving = 1;
  setTimeout(() => Lyd.dyrLyd(def.lyd), 350);
  const p = tilSkærm(d.pos, 0.5);
  E.konfetti(p.x, p.y, { antal: 24 });
  E.tekstPop(p.x, p.y - 40, def.navn, { s: 30 });
}

function knus(hit) {
  verden.sæt(hit.x, hit.y, hit.z, 0);
  const over = verden.hent(hit.x, hit.y + 1, hit.z);
  if (over && BLOKKE[over].kryds) verden.sæt(hit.x, hit.y + 1, hit.z, 0);          // blomsten ovenpå ryger med
  stykker(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, atlas.farve(hit.id));
  Lyd.knus(BLOKKE[hit.id].lyd);
  gemSnart();
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

// Fingre på selve verdenen: træk = kig, tryk = byg, hold = hak
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
cv.addEventListener("wheel", e => { e.preventDefault(); if (iGang) vælgSlot((gemt.valgt + (e.deltaY > 0 ? 1 : 8)) % 9); }, { passive: false });

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
function opdaterSpiller(dt) {
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
  if (r.jord) {
    if (fald < -13) Lyd.land();
    sp.vel.y = 0;
    if (sp.flyver && fald < -0.5) skiftFlyv();                                  // lander man, så går man igen
  }
  if (r.loft) sp.vel.y = Math.min(0, sp.vel.y);
  sp.jord = r.jord;
  if (r.væg && sp.jord && l > 0.1) {                                            // hop selv op ad ét trin
    tmp.copy(sp.pos); tmp.y += 1.05; tmp.x += mx * 0.35; tmp.z += mz * 0.35;
    if (!verden.kolliderer(tmp, B, HØJ)) sp.vel.y = HOP * 0.92;
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
const ikonFor = s => s.æg ? ægIkon(ægFarver(s)) : atlas.ikon(s.blok);
const navnFor = s => s.æg ? (s.æg === "?" ? "Overraskelses-æg" : `${(DYR.find(d => d.id === s.æg) || DYR[0]).navn}-æg`) : BLOKKE[s.blok].navn;

function tegnHotbar() {
  const hb = $("hotbar");
  hb.innerHTML = "";
  gemt.hotbar.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "slot" + (i === gemt.valgt ? " valgt" : "");
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
  document.querySelectorAll("#hotbar .slot:not(.mere)").forEach((b, j) => b.classList.toggle("valgt", j === i));
  opdaterHånd();
  Lyd.vælg();
  const n = $("tingNavn");
  n.textContent = navnFor(gemt.hotbar[i]); n.classList.add("vis");
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
      gemt.hotbar[gemt.valgt] = { ...s };
      tegnHotbar(); opdaterHånd(); Lyd.vælg(); gemSnart();
      luk("inventar");
    });
    grid.appendChild(b);
  }
  vis("inventar");
}

$("menuKnap").addEventListener("click", () => { Lyd.klik(); $("musikKnap").textContent = gemt.musik ? "🎵 Musik: TIL" : "🔇 Musik: FRA"; nyTryk = 0; $("nyVerden").textContent = "🌍 Ny verden"; vis("menu"); });
$("musikKnap").addEventListener("click", () => {
  gemt.musik = !gemt.musik; Lyd.sætMusik(gemt.musik); Lyd.klik(); gemSnart();
  $("musikKnap").textContent = gemt.musik ? "🎵 Musik: TIL" : "🔇 Musik: FRA";
});
$("hjemStart").addEventListener("click", () => { Lyd.klik(); startSted(); if (sp.flyver) skiftFlyv(); luk("menu"); gemSnart(); });
let nyTryk = 0;
$("nyVerden").addEventListener("click", () => {
  Lyd.klik();
  if (Date.now() - nyTryk > 4000) { nyTryk = Date.now(); $("nyVerden").textContent = "Er du sikker? Tryk igen 🌍"; return; }
  clearTimeout(gemTimer);
  gemt = { frø: (Math.random() * 2 ** 31) | 0, ændringer: {}, hotbar: gemt.hotbar, valgt: gemt.valgt, musik: gemt.musik };
  try { localStorage.setItem(GEM, JSON.stringify(gemt)); } catch (_) {}
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

let tid = 0, sidst = performance.now();
renderer.setAnimationLoop(nu => {
  const dt = Math.min(0.05, (nu - sidst) / 1000);
  sidst = nu; tid += dt;
  if (iGang && !pause) { opdaterSpiller(dt); opdaterHak(dt); }
  else if (!iGang) sp.yaw += dt * 0.06;                                           // titelskærm: kig langsomt rundt
  for (const d of dyr) d.opdater(dt, sp.pos);
  verden.opdater(4);
  opdaterStykker(dt);
  for (const s of skyer) { s.position.x += dt * 0.8; if (s.position.x > 130) s.position.x = -70; }

  const bob = sp.jord && !sp.flyver ? Math.abs(Math.sin(gangFase * Math.PI)) * 0.06 : 0;
  kamera.position.set(sp.pos.x, sp.pos.y + ØJE + bob, sp.pos.z);
  kamera.rotation.set(sp.pitch, sp.yaw, 0);
  himmel.position.copy(kamera.position);
  sol.position.copy(kamera.position).addScaledVector(SOL_RETNING, 250);
  sol.lookAt(kamera.position);

  sving = Math.max(0, sving - dt * 4);
  const s = Math.sin(sving * Math.PI);
  hånd.position.set(0.4 + Math.cos(gangFase * Math.PI * 2) * 0.012, -0.36 + bob * 0.4 - s * 0.1, -0.9 - s * 0.1);
  hånd.rotation.x = -s * 0.8;
  hånd.visible = iGang;
  renderer.render(scene, kamera);
});

// ---------- Start ----------
tegnHotbar();
opdaterHånd();
const startKnap = $("startKnap");
startKnap.textContent = "▶ Spil";
startKnap.disabled = false;
startKnap.addEventListener("click", () => {
  Lyd.klar(); Lyd.sætMusik(gemt.musik); Lyd.klik();
  try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (_) {}
  iGang = true;
  luk("start");
  document.body.classList.add("i-gang");
  besked("Tryk = byg 🧱   Hold = hak ⛏️   Træk = kig 👀", 6000);
});
window.broekraftKlar = true;
if (location.search.includes("debug")) window.bk = { sp, verden, dyr, tast };
