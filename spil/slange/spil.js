// ===== Fjollet Slange 3D =====
// Hold fingeren på skærmen og før slangen rundt. Spis maden, så bliver slangen længere.
// Hver 5. ting giver en ny hat (slange.js), og hver 15. ting rejser slangen videre til en ny verden (verden.js).
// Magiske bobler (mad.js): 🚀 turbo, 🧲 magnet (maden flyver hen til slangen), 🌈 regnbue (mere mad) og ⭐ guldstjerne.
// Ingen kan tabe: slangen hopper blødt tilbage fra kanten, og den kan godt krydse sig selv.

import * as THREE from "./three.js";
import { byggVerden, ARENA, GLØD } from "./verden.js";
import { Slange, HATTE } from "./slange.js";
import { lavMad, MADNAVNE, lavKraft, KRÆFTER } from "./mad.js";
import * as Lyd from "./lyd.js";

const E = window.Effekter, $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const vinkelForskel = (a, b) => ((b - a + Math.PI * 3) % TAU) - Math.PI;

// ---------- 3D-scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $("scene"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
const verden = byggVerden(scene, renderer);
let temaNr = 0, tema = verden.skift(0);

// Mål selve billedfladen, så billedet aldrig bliver strakt — heller ikke når tabletten vendes
function størrelse() {
  const el = renderer.domElement, w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.updateProjectionMatrix();
}
størrelse();
E.vedStørrelse(størrelse);

// ---------- Slangen ----------
const slange = new Slange(scene);
const pos = new THREE.Vector3(0, 0, 4);
let vinkel = -Math.PI / 2;                                   // op ad skærmen
let antal = 10, point = 0;
const sti = [];
for (let i = 0; i < 400; i++) sti.push({ x: pos.x, z: pos.z + i * 0.1 });

// ---------- Fingeren styrer: slangen kører hen mod det sted på jorden, man peger på ----------
const cv = renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), mål = new THREE.Vector3();
let følger = false, fx = 0, fy = 0, styret = false;
function finger(e) { fx = e.clientX; fy = e.clientY; }
function fingerPåJorden() {
  const r = cv.getBoundingClientRect();
  ndc.set((fx - r.left) / r.width * 2 - 1, -((fy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, kamera);
  plan.constant = -slange.hoved.position.y;
  return ray.ray.intersectPlane(plan, mål);
}
cv.addEventListener("pointerdown", e => {
  Lyd.klar();
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  finger(e); følger = true;
  const h = tilSkærm(slange.hoved.position);                 // tryk på slangen = den fniser
  if (Math.hypot(h.x - fx, h.y - fy) < 70) { slange.fnis = 1.2; Lyd.fnis(); for (let i = 0; i < 10; i++) partikel(pos.x, slange.hoved.position.y + 0.8, pos.z, HJERTE, rnd(-2, 2), rnd(3, 5), rnd(-2, 2), 1, 0.5, 1.4); }
});
cv.addEventListener("pointermove", e => { if (følger) finger(e); });
for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) cv.addEventListener(n, () => { følger = false; });
function tilSkærm(p) {
  const v = p.clone().project(kamera), r = cv.getBoundingClientRect();
  return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
}

// ---------- Partikler: små, farvede glimt i 3D ----------
const STYK = 600, styk = [], stykMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: "#ffffff" }), STYK);
stykMesh.frustumCulled = false; scene.add(stykMesh);
for (let i = 0; i < STYK; i++) { styk.push({ liv: 0 }); stykMesh.setColorAt(i, new THREE.Color("#ffffff")); }
let stykNr = 0;
const dummy = new THREE.Object3D();
function partikel(x, y, z, farve, vx, vy, vz, liv, g = 1, str = 1) {
  const s = styk[stykNr]; stykMesh.setColorAt(stykNr, farve); stykNr = (stykNr + 1) % STYK;
  Object.assign(s, { x, y, z, vx, vy, vz, liv, maks: liv, g, str, rot: rnd(0, TAU) });
  stykMesh.instanceColor.needsUpdate = true;
}
function opdaterPartikler(dt) {
  for (let i = 0; i < STYK; i++) {
    const s = styk[i];
    if (s.liv > 0) { s.liv -= dt; s.vy -= 12 * s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.rot += dt * 6; }
    dummy.position.set(s.x || 0, s.y || 0, s.z || 0);
    dummy.rotation.set(s.rot || 0, s.rot || 0, 0);
    dummy.scale.setScalar(s.liv > 0 ? Math.min(1, s.liv / s.maks * 2) * s.str : 0);
    dummy.updateMatrix(); stykMesh.setMatrixAt(i, dummy.matrix);
  }
  stykMesh.instanceMatrix.needsUpdate = true;
}
const FARVER = ["#ff4d6d", "#ffd23f", "#06d6a0", "#3a86ff", "#b15bff", "#ff8c1a", "#ffffff"].map(f => new THREE.Color(f));
const HJERTE = new THREE.Color("#ff5fa8"), GULD = new THREE.Color("#ffd23f");
function sprut(x, y, z, antalS = 30, fart = 5, farver = FARVER) {
  for (let i = 0; i < antalS; i++) partikel(x, y, z, farver[i % farver.length], rnd(-1, 1) * fart, rnd(0.5, 1.4) * fart, rnd(-1, 1) * fart, rnd(0.8, 1.4), 0.8, rnd(1, 1.8));
}

// ---------- Maden ----------
const mader = [];
function nyMad() {
  let x = 0, z = 0;
  for (let forsøg = 0; forsøg < 30; forsøg++) {                   // et sted, der ikke er for langt væk — og ikke oven i slangen
    const v = rnd(0, TAU), a = rnd(5, 13);
    x = pos.x + Math.cos(v) * a; z = pos.z + Math.sin(v) * a;
    const d = Math.hypot(x, z);
    if (d > ARENA - 2.5) { x *= (ARENA - 2.5) / d; z *= (ARENA - 2.5) / d; }
    if (Math.hypot(x - pos.x, z - pos.z) > 4 && !mader.some(m => Math.hypot(m.x - x, m.z - z) < 3)) break;
  }
  const navn = MADNAVNE[Math.floor(Math.random() * MADNAVNE.length)], g = lavMad(navn);
  g.position.set(x, verden.højde(x, z), z); g.scale.setScalar(0.01);
  scene.add(g);
  mader.push({ g, x, z, t: 0, fase: rnd(0, TAU) });
}
function fjern(o) {
  scene.remove(o);
  o.traverse(c => {
    if (c.isMesh) c.geometry.dispose();
    if (c.material) { if (c.material.map && c.material.map !== GLØD) c.material.map.dispose(); c.material.dispose(); }
  });
}
function opdaterMad(dt, t) {
  const behov = aktiv.regnbue > 0 ? 3 : 1;
  while (mader.length < behov) nyMad();
  for (const m of [...mader]) {
    m.t += dt;
    if (aktiv.magnet > 0) {                                        // magneten trækker maden hen til slangen
      const dx = pos.x - m.x, dz = pos.z - m.z, af = Math.hypot(dx, dz);
      if (af < 14 && af > 0.1) { const f = Math.min(af, dt * (4 + (14 - af) * 0.8)); m.x += dx / af * f; m.z += dz / af * f; }
    }
    const pop = m.t < 0.4 ? Math.sin(m.t / 0.4 * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1;
    m.g.scale.setScalar(Math.max(0.01, pop * 1.15));
    m.g.position.set(m.x, verden.højde(m.x, m.z) + 0.25 + Math.sin(t * 3 + m.fase) * 0.15, m.z);
    m.g.userData.model.rotation.y += dt * 1.6;
    m.g.userData.glød.material.opacity = 0.55 + Math.sin(t * 4 + m.fase) * 0.25;
    if (Math.hypot(m.x - pos.x, m.z - pos.z) < 1.25) spis(m);
  }
}
function spis(m) {
  mader.splice(mader.indexOf(m), 1);
  const p = m.g.position.clone(); fjern(m.g);
  point++; antal += 3;
  $("pointTal").textContent = point;
  const el = $("point"); el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop");
  Lyd.gumle();
  sprut(p.x, p.y + 0.6, p.z, 36, 5);
  const s = tilSkærm(p); E.konfetti(s.x, s.y, { antal: 26 });
  if (point % 15 === 0) setTimeout(nyVerden, 900);                 // hver 15. ting: en ny verden
  else if (point % 5 === 0) nyHat();                                // hver 5. ting: en ny hat
}
function nyHat() {
  const nr = Math.floor(point / 5) - 1, h = HATTE[nr % HATTE.length];
  slange.sætHat(nr % HATTE.length);
  Lyd.hat();
  sprut(pos.x, slange.hoved.position.y + 1, pos.z, 50, 6);
  const s = tilSkærm(slange.hoved.position); E.stjerner(s.x, s.y, { antal: 14 });
  besked(`Ny hat: ${h.navn} ${h.ikon}`);
}

// ---------- Nye verdener: Haven → Stranden → Slikland → Rummet → Haven … ----------
function nyVerden() {
  Lyd.rejse();
  const hvid = $("skift"); hvid.classList.add("vis");
  setTimeout(() => {
    temaNr++;
    tema = verden.skift(temaNr);
    Lyd.sætTema(tema.id);
    nyHat();
    besked(`Velkommen til ${tema.navn} ${tema.ikon}`, 3500);
    hvid.classList.remove("vis");
    E.fanfare();
  }, 600);
}

// ---------- De magiske bobler ----------
let kraftObj = null, kraftTid = rnd(10, 15);
const aktiv = { turbo: 0, magnet: 0, regnbue: 0 };
function nyKraft() {
  const navne = ["turbo", "magnet", "regnbue", "turbo", "magnet", "regnbue", "stjerne"], navn = navne[Math.floor(Math.random() * navne.length)];
  const v = rnd(0, TAU), a = rnd(6, 12);
  let x = pos.x + Math.cos(v) * a, z = pos.z + Math.sin(v) * a;
  const d = Math.hypot(x, z); if (d > ARENA - 3) { x *= (ARENA - 3) / d; z *= (ARENA - 3) / d; }
  const g = lavKraft(navn); g.scale.setScalar(0.01); scene.add(g);
  kraftObj = { g, x, z, navn, t: 0 };
}
function opdaterKraft(dt, t) {
  for (const k in aktiv) aktiv[k] = Math.max(0, aktiv[k] - dt);
  if (!kraftObj && (kraftTid -= dt) <= 0) nyKraft();
  if (kraftObj) {
    const k = kraftObj; k.t += dt;
    k.g.scale.setScalar(Math.min(1, k.t * 3) * (1 + Math.sin(t * 5) * 0.05));
    k.g.position.set(k.x, verden.højde(k.x, k.z) + Math.sin(t * 2) * 0.25, k.z);
    k.g.userData.model.rotation.y += dt * 2;
    if (Math.hypot(k.x - pos.x, k.z - pos.z) < 1.5) tagKraft(k);
    else if (k.t > 28) { sprut(k.x, k.g.position.y + 1, k.z, 16, 3); fjern(k.g); kraftObj = null; kraftTid = rnd(8, 14); }
  }
  // lille viser øverst: hvilken kraft, og hvor længe den varer endnu
  let bedst = null;
  for (const k in aktiv) if (aktiv[k] > 0 && (!bedst || aktiv[k] > aktiv[bedst])) bedst = k;
  $("kraft").classList.toggle("skjult", !bedst);
  if (bedst) { $("kraftIkon").textContent = KRÆFTER[bedst].ikon; $("kraftFyld").style.width = `${aktiv[bedst] / KRÆFTER[bedst].tid * 100}%`; }
}
function tagKraft(k) {
  const info = KRÆFTER[k.navn], p = k.g.position.clone();
  fjern(k.g); kraftObj = null; kraftTid = rnd(14, 22);
  Lyd.kraft(k.navn);
  sprut(p.x, p.y + 1, p.z, 40, 6, [new THREE.Color(info.farve), new THREE.Color("#ffffff"), GULD]);
  besked(`${info.ikon} ${info.navn}`, 2000);
  if (k.navn === "stjerne") {                                      // guldstjerne: slangen vokser en masse, og der er fest
    antal += 10; E.fanfare(); E.flash("#fff3b0");
    const s = tilSkærm(p); E.stjerner(s.x, s.y, { antal: 22 }); E.konfetti(s.x, s.y, { antal: 60 });
  } else aktiv[k.navn] = info.tid;
}

// ---------- Pilen, der viser vej til maden, når den er langt væk ----------
const pil = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.9, 12), new THREE.MeshStandardMaterial({ color: "#ffd23f", emissive: "#ff9a00", emissiveIntensity: 0.4, roughness: 0.3 }));
pil.geometry.rotateX(Math.PI / 2); scene.add(pil);
function opdaterPil(t) {
  let næst = null, af = Infinity;
  for (const m of mader) { const d = Math.hypot(m.x - pos.x, m.z - pos.z); if (d < af) { af = d; næst = m; } }
  pil.visible = !!næst && af > 9;
  if (!pil.visible) return;
  const v = Math.atan2(næst.z - pos.z, næst.x - pos.x), r = 2 + Math.sin(t * 6) * 0.3;
  pil.position.set(pos.x + Math.cos(v) * r, slange.hoved.position.y + 1.1, pos.z + Math.sin(v) * r);
  pil.rotation.set(0, Math.PI / 2 - v, 0);
}

// ---------- Slangen kører: drejer blødt mod fingeren og hopper tilbage fra kanten ----------
const FART = 5.2, DREJ = 3.6;
let bumpet = false;
function styr(dt) {
  const turbo = aktiv.turbo > 0;
  if (følger && fingerPåJorden()) {
    const dx = mål.x - pos.x, dz = mål.z - pos.z;
    if (Math.hypot(dx, dz) > 0.9) {
      const maks = DREJ * (turbo ? 1.3 : 1) * dt;
      vinkel += Math.max(-maks, Math.min(maks, vinkelForskel(vinkel, Math.atan2(dz, dx))));
      if (!styret) { styret = true; $("besked").classList.add("skjult"); }
    }
  }
  const f = FART * (turbo ? 1.8 : 1);
  pos.x += Math.cos(vinkel) * f * dt; pos.z += Math.sin(vinkel) * f * dt;
  const d = Math.hypot(pos.x, pos.z), kant = ARENA - 0.9;
  if (d > kant) {                                                  // bump! slangen vender blødt ind mod midten igen
    const nx = pos.x / d, nz = pos.z / d;
    pos.x = nx * kant; pos.z = nz * kant;
    const vx = Math.cos(vinkel), vz = Math.sin(vinkel), dot = vx * nx + vz * nz;
    if (dot > 0) vinkel = Math.atan2(vz - 2 * dot * nz, vx - 2 * dot * nx);
    if (!bumpet) { Lyd.bump(); bumpet = true; }
  } else if (d < kant - 0.5) bumpet = false;
  const s = sti[0];
  if (Math.hypot(pos.x - s.x, pos.z - s.z) > 0.08) { sti.unshift({ x: pos.x, z: pos.z }); if (sti.length > 3200) sti.length = 3200; }
}

// ---------- Kameraet svæver bag og over slangen og zoomer lidt ud, når den bliver lang ----------
const kamMål = new THREE.Vector3(), kigPå = new THREE.Vector3(0, 0, 4);
kamera.position.set(0, 17, 4 + 12); kamera.lookAt(kigPå);                // kameraet starter det rigtige sted
let kamZoom = 1;                                             // (kun til test og billeder)
function opdaterKamera(dt) {
  const zoom = (1 + Math.min(0.5, antal / 260)) * kamZoom;
  kigPå.lerp(new THREE.Vector3(pos.x + Math.cos(vinkel) * 1.5, slange.hoved.position.y, pos.z + Math.sin(vinkel) * 1.5), 1 - Math.pow(0.02, dt));
  kamMål.set(kigPå.x, kigPå.y + 16.5 * zoom, kigPå.z + 11.5 * zoom);
  kamera.position.lerp(kamMål, 1 - Math.pow(0.03, dt));
  kamera.lookAt(kigPå);
  const fov = aktiv.turbo > 0 ? 58 : 50;
  if (Math.abs(kamera.fov - fov) > 0.05) { kamera.fov += (fov - kamera.fov) * Math.min(1, dt * 4); kamera.updateProjectionMatrix(); }
}

// ---------- Beskeder nederst på skærmen ----------
let beskedT = 0;
function besked(tekst, ms = 2600) {
  const el = $("besked"); el.textContent = tekst; el.classList.remove("skjult");
  clearTimeout(beskedT); beskedT = setTimeout(() => el.classList.add("skjult"), ms);
}

// ---------- Musik til og fra ----------
let musik = true;
try { musik = localStorage.getItem("slange-musik") !== "fra"; } catch (_) {}
Lyd.musik(musik);
$("musikKnap").textContent = musik ? "🎵" : "🔇";
$("musikKnap").addEventListener("click", () => {
  musik = !musik; Lyd.klar(); Lyd.musik(musik);
  $("musikKnap").textContent = musik ? "🎵" : "🔇";
  try { localStorage.setItem("slange-musik", musik ? "til" : "fra"); } catch (_) {}
});

// ---------- Hvert billede ----------
let tid = 0, sidst = performance.now();
renderer.setAnimationLoop(frame);
function frame(nu) {
  const dt = Math.max(0, Math.min(0.05, (nu - sidst) / 1000)); sidst = nu; tid += dt;
  styr(dt);
  opdaterMad(dt, tid);
  opdaterKraft(dt, tid);
  const næste = mader[0] || { x: pos.x + Math.cos(vinkel), z: pos.z + Math.sin(vinkel) };
  slange.opdater(dt, tid, { pos, vinkel, sti, antal, højde: verden.højde, kig: næste, regnbue: aktiv.regnbue > 0, turbo: aktiv.turbo > 0 });
  // turbo: flammer bag hovedet · regnbue: glimmer bag halen
  if (aktiv.turbo > 0 && Math.random() < 0.8) partikel(pos.x - Math.cos(vinkel) * 0.9, slange.hoved.position.y, pos.z - Math.sin(vinkel) * 0.9, FARVER[Math.random() < 0.5 ? 1 : 5], rnd(-1, 1), rnd(0.5, 2), rnd(-1, 1), 0.5, 0.2, 1.6);
  if (aktiv.regnbue > 0 && Math.random() < 0.7) { const s = sti[Math.min(sti.length - 1, Math.floor(antal * 4.6))] || sti[0]; partikel(s.x, verden.højde(s.x, s.z) + 0.6, s.z, FARVER[Math.floor(Math.random() * 6)], rnd(-0.8, 0.8), rnd(1, 3), rnd(-0.8, 0.8), 1, 0.3, 1.2); }
  opdaterPil(tid);
  opdaterPartikler(dt);
  verden.opdater(dt, tid, pos);
  opdaterKamera(dt);
  renderer.render(scene, kamera);
}
if (location.search.includes("debug")) window.sl = { kamera, set zoom(v) { kamZoom = v; }, steg: n => { for (let i = 0; i < n; i++) frame(sidst + 1000 / 60); sidst = performance.now(); }, pos, get vinkel() { return vinkel; }, set vinkel(v) { vinkel = v; }, mader, aktiv, slange, verden, spis, nyVerden, nyKraft, get kraftObj() { return kraftObj; }, tagKraft, get point() { return point; }, set point(p) { point = p; } };
