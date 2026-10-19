// ===== Kuglebanen — et dyr i en glaskugle, og hele banen vipper =====
// Vip iPad'en (eller træk med fingeren) for at trille kuglen. Saml frugt og slik, og nå i mål.
// Falder man ned, starter man igen ved det sidste flag.
//
// Filerne:  baner.js (de 15 baner) · bygger.js (bygger en bane) · fysik.js (kuglen ruller)
//           styring.js (vip, finger, taster) · jungle.js / vaerelse.js / slik.js (de tre verdener)
//           pynt.js (fælles pynt) · figurer.js (dyrene) · former.js (geometri) · lyd.js (lyde og musik)
// ?bane=jungle-3 starter en bestemt bane. ?debug giver kb i konsollen.

import * as THREE from "./three.js";
import { Fysik, Kugle, R, trin, findKanter } from "./fysik.js";
import { BANER, VERDENER, banerI } from "./baner.js";
import { bygBane, bagBane, frem } from "./bygger.js";
import { lavKugle, lys as lavLys } from "./pynt.js";
import { lavStyring } from "./styring.js";
import * as Lyd from "./lyd.js";
import { jungle } from "./jungle.js";
import { vaerelse } from "./vaerelse.js";
import { slik } from "./slik.js";

const TEMAER = { jungle, vaerelse, slik };
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const URL_P = new URLSearchParams(location.search);
const E = window.Effekter;

// ---------- Gemt (kun på denne enhed) ----------
const GEM = "kuglebanen-v1";
const gemt = { vip: true, fart: "rolig", musik: true, verden: "jungle", stjerner: {} };
try { Object.assign(gemt, JSON.parse(localStorage.getItem(GEM)) || {}); } catch (_) {}
const gem = () => { try { localStorage.setItem(GEM, JSON.stringify(gemt)); } catch (_) {} };

// Rolig: lavere fart, bremser når man slipper, og hjælper én med ikke at trille ud over kanten.
// Hurtig: mere fart og fart i kuglen, ligesom det rigtige spil.
const FART = {
  rolig: { g: 24, vip: 0.34, maks: 5.4, rul: 0.3, bremse: 2.0, hjælp: true, hjælpFart: 4.6 },
  hurtig: { g: 26, vip: 0.42, maks: 10, rul: 0.15, bremse: 0.6, hjælp: false, hjælpFart: 0 },
};

// ---------- Oplæsning på dansk (kun hvis enheden har en dansk stemme) ----------
let stemme = null;
const findStemme = () => { try { stemme = speechSynthesis.getVoices().find(v => /^da/i.test(v.lang)) || null; } catch (_) {} };
if ("speechSynthesis" in window) { findStemme(); speechSynthesis.onvoiceschanged = findStemme; }
function sig(tekst) {
  if (!stemme) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(tekst);
    u.voice = stemme; u.lang = stemme.lang; u.rate = 1.05; u.pitch = 1.25;
    speechSynthesis.speak(u);
  } catch (_) {}
}

// ---------- 3D-scenen ----------
const renderer = new THREE.WebGLRenderer({ canvas: $("scene"), antialias: true, powerPreference: "high-performance" });
const maksTæthed = Math.min(window.devicePixelRatio || 1, 2);
let tæthed = Math.min(maksTæthed, 1.5);
renderer.setPixelRatio(tæthed);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);
function størrelse() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.fov = w / h < 1 ? 70 : 55;
  kamera.updateProjectionMatrix();
}
addEventListener("resize", størrelse);
størrelse();

// ---------- Styring ----------
const styr = lavStyring(renderer.domElement, $("pind"));
styr.påTryk = () => Lyd.klar();

// ---------- Spillets tilstand ----------
const sp = {
  tilstand: "menu",          // menu | spil | pause | fald | mål
  def: null, tema: null, bane: null, fys: null, kugle: new Kugle(), kv: null, dyr: null, sol: null,
  t: 0, fysT: 0, akk: 0, samlet: 0, faldT: 0, målT: 0, stødPause: 0, fartPause: 0, stille: 0,
  igen: null,                // hvor man starter igen (flag)
  kamYaw: 0, kamPos: new THREE.Vector3(), kamMål: new THREE.Vector3(), vipX: 0, vipY: 0, figYaw: 0,
  hjælpOn: 0,
};
const ind = { ...FART.rolig };

// Ryd den gamle bane væk
function ryd() {
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  if (scene.environment) scene.environment.dispose();
  scene.clear();
  scene.environment = null; scene.fog = null; scene.background = null;
}

// Byg en bane og læg kuglen ved starten
function indlæs(id) {
  ryd();
  const def = BANER.find(b => b.id === id) || BANER[0];
  const tema = TEMAER[def.verden];
  tema.opsæt(scene, renderer);
  sp.sol = lavLys(scene, tema.lys);
  const fys = new Fysik();
  const bane = bygBane(def, tema, fys);
  scene.add(bagBane(bane));
  scene.add(bane.aktive);
  tema.omgivelser(scene, bane);

  const kv = lavKugle({ ...tema.kugle });
  const dyr = tema.dyr();
  kv.gruppe.add(dyr.gruppe);
  scene.add(kv.gruppe, kv.skygge);
  tema.efter?.(scene);

  Object.assign(sp, { def, tema, bane, fys, kv, dyr, samlet: 0, fysT: 0, akk: 0, målT: 0, igen: { p: bane.start.p.clone(), ψ: bane.start.ψ } });
  fys.bevæg(0, 1 / 240);
  placér(sp.igen, false);
  Lyd.sætTema(tema.musik);
  document.documentElement.style.setProperty("--farve", tema.farve);
  opdaterHud();
  lavIkon();
}

// Læg kuglen ved et sted (falde = den dumper ned fra lidt højere oppe)
function placér(sted, falde = true) {
  const k = sp.kugle;
  const b = sp.fys.bundUnder(sted.p.x, sted.p.y + 1.5, sted.p.z, 4);
  const y = b ? b.y : sted.p.y;
  k.p.set(sted.p.x, y + R + (falde ? 1.8 : 0.01), sted.p.z);
  k.v.set(0, 0, 0);
  k.påJorden = false; k.luft = 0;
  sp.kamYaw = sted.ψ;
  sp.figYaw = sted.ψ + Math.PI;
  kameraBagved(true);
}

// ---------- HUD ----------
function opdaterHud() {
  const { def, tema, bane } = sp;
  $("navnTekst").textContent = def.navn;
  $("antal").textContent = sp.samlet;
  $("total").textContent = bane.antal;
  const baner = banerI(def.verden);
  $("prikker").innerHTML = baner.map(b => `<span class="${b.id === def.id ? "nu" : ""}"></span>`).join("");
}
// Ikonet øverst er den rigtige 3D-ting, tegnet én gang med en lille ekstra tegner
const ikonCache = {};
function lavIkon() {
  const id = sp.tema.id;
  if (ikonCache[id]) { $("ikon").src = ikonCache[id]; return; }
  try {
    const r2 = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    r2.setPixelRatio(1); r2.setSize(128, 128, false);
    r2.toneMapping = THREE.ACESFilmicToneMapping; r2.toneMappingExposure = 0.95;
    const s2 = new THREE.Scene();
    s2.add(new THREE.HemisphereLight("#ffffff", "#806040", 2.2));
    const d = new THREE.DirectionalLight("#ffffff", 3); d.position.set(-2, 3, 4); s2.add(d);
    const ting = sp.tema.ikon(); s2.add(ting);
    const kasse = new THREE.Box3().setFromObject(ting), mid = kasse.getCenter(new THREE.Vector3()), str = kasse.getBoundingSphere(new THREE.Sphere()).radius;
    const k2 = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    k2.position.copy(mid).add(new THREE.Vector3(0, 0.15, 1).normalize().multiplyScalar(str / Math.sin(Math.PI / 12) * 1.02));
    k2.lookAt(mid);
    r2.render(s2, k2);
    ikonCache[id] = r2.domElement.toDataURL();
    r2.dispose(); r2.forceContextLoss?.();
    $("ikon").src = ikonCache[id];
  } catch (_) { $("ikon").removeAttribute("src"); }
}

let beskedTimer = 0;
function visBesked(tekst, tid = 4500) {
  const b = $("besked");
  b.textContent = tekst; b.classList.remove("skjult");
  clearTimeout(beskedTimer); beskedTimer = setTimeout(() => b.classList.add("skjult"), tid);
}

// Skærmposition for et punkt (til stjerner og konfetti)
const _s = new THREE.Vector3();
function påSkærm(p) {
  _s.copy(p).project(kamera);
  return [(_s.x + 1) / 2 * innerWidth, (1 - _s.y) / 2 * innerHeight];
}

// ---------- Kameraet ----------
const vinkel = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const AFST = 5.4, HØJDE = 2.6;
function kameraBagved(straks) {
  const k = sp.kugle, f = frem(sp.kamYaw), m = sp.tilstand === "mål" ? 1.45 : 1;   // i mål trækker kameraet sig lidt tilbage
  sp.kamMål.set(k.p.x - f.x * AFST * m, k.p.y + HØJDE * m - sp.vipY * 0.6, k.p.z - f.z * AFST * m);
  if (straks) sp.kamPos.copy(sp.kamMål);
}
const kig = new THREE.Vector3(), op = new THREE.Vector3();
function opdaterKamera(dt) {
  const k = sp.kugle;
  if (sp.tilstand === "menu") {
    // langsom tur rundt om banen
    const c = sp.bane.grænse.getCenter(new THREE.Vector3()), s = sp.bane.grænse.getSize(new THREE.Vector3());
    const r = Math.max(s.x, s.z) * 0.62 + 7, a = sp.t * 0.07 + 0.6;
    kamera.position.set(c.x + Math.sin(a) * r, c.y + r * 0.52 + 2, c.z + Math.cos(a) * r);
    kamera.up.set(0, 1, 0);
    kamera.lookAt(c.x, c.y - 1, c.z);
    sp.kamPos.copy(kamera.position);
    return;
  }
  if (sp.tilstand === "mål") {
    // kameraet kører langsomt rundt om kuglen
    sp.kamYaw += dt * 0.5;
  } else if (sp.tilstand === "spil") {
    // kameraet drejer langsomt efter kuglen, når den triller fremad
    const vh = Math.hypot(k.v.x, k.v.z);
    if (vh > 1.0) {
      const d = vinkel(Math.atan2(k.v.x, -k.v.z) - sp.kamYaw);
      if (Math.abs(d) < 1.9) sp.kamYaw += d * (1 - Math.exp(-dt * 1.25 * Math.min(1, (vh - 1.0) / 3)));
    }
  }
  sp.kamYaw = vinkel(sp.kamYaw);
  const falder = sp.tilstand === "fald";
  if (!falder) kameraBagved(false);
  const a = 1 - Math.exp(-dt * (falder ? 2 : 7));
  sp.kamPos.lerp(sp.kamMål, a);
  kamera.position.copy(sp.kamPos);
  const f = frem(sp.kamYaw);
  kig.set(k.p.x + f.x * 1.6, k.p.y + 0.35, k.p.z + f.z * 1.6);
  if (falder) kig.copy(k.p);
  // hele verden ser ud til at vippe lidt med, når man styrer
  const h = new THREE.Vector3(Math.cos(sp.kamYaw), 0, Math.sin(sp.kamYaw));
  op.set(0, 1, 0).addScaledVector(h, -sp.vipX * 0.13).normalize();
  kamera.up.copy(op);
  kamera.lookAt(kig);
}

// ---------- Kuglen og dyret ----------
const _akse = new THREE.Vector3(), _q = new THREE.Quaternion(), _rel = new THREE.Vector3(), _ned = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
function opdaterKugle(dt) {
  const k = sp.kugle, kv = sp.kv;
  kv.gruppe.position.copy(k.p);
  // glasset ruller
  _rel.copy(k.v).sub(k.jordV);
  const n = k.påJorden ? k.jordN : THREE.Object3D.DEFAULT_UP;
  _akse.crossVectors(n, _rel);
  const l = _akse.length();
  if (l > 1e-4) { _q.setFromAxisAngle(_akse.divideScalar(l), l / R * dt); kv.drej.quaternion.premultiply(_q); }
  // dyret står op og kigger hvor det triller (eller på os, når det står stille)
  const vh = Math.hypot(k.v.x, k.v.z);
  let mål;
  if (vh > 0.7 && sp.tilstand !== "mål") mål = Math.atan2(k.v.x, k.v.z);
  else mål = Math.atan2(sp.kamPos.x - k.p.x, sp.kamPos.z - k.p.z);
  sp.figYaw += vinkel(mål - sp.figYaw) * (1 - Math.exp(-dt * 6));
  const g = sp.dyr.gruppe;
  g.rotation.y = sp.figYaw;
  const grund = sp.dyr.hamster ? -0.1 : -0.07;
  const løb = Math.min(vh, 5);
  g.position.y = grund + Math.abs(Math.sin(sp.t * (6 + løb * 2))) * 0.012 * løb + (sp.tilstand === "mål" ? Math.abs(Math.sin(sp.t * 7)) * 0.06 : 0);
  g.rotation.x = Math.min(0.25, løb * 0.04);
  // vink når den står stille eller er i mål
  sp.stille = vh < 0.3 ? sp.stille + dt : 0;
  const vink = sp.tilstand === "mål" || sp.stille > 1.5 || sp.tilstand === "menu";
  if (sp.dyr.arm) {
    const a = sp.dyr.arm;
    if (sp.dyr.hamster) a.position.y = -0.1 + (vink ? Math.abs(Math.sin(sp.t * 6)) * 0.03 : 0);
    else a.rotation.z = vink ? Math.sin(sp.t * 9) * 0.45 : a.rotation.z * 0.9;
  }
  // skyggen under kuglen
  const b = sp.fys.bundUnder(k.p.x, k.p.y, k.p.z, 30);
  if (b) {
    const højde = k.p.y - R - b.y, s = Math.max(0, 1 - højde / 5);
    kv.skygge.visible = s > 0.02;
    kv.skygge.position.set(k.p.x, b.y + 0.03, k.p.z);
    if (b.form.form === "kasse") kv.skygge.quaternion.copy(b.form.rot).multiply(_ned); else kv.skygge.quaternion.copy(_ned);
    kv.skygge.material.opacity = 0.55 * s;
    kv.skygge.scale.setScalar(1 + højde * 0.15);
  } else kv.skygge.visible = false;
  // solen følger kuglen, så skyggerne er skarpe lige omkring den
  sp.sol.position.set(k.p.x - 9, k.p.y + 16, k.p.z + 8);
  sp.sol.target.position.copy(k.p);
}

// ---------- Hver billede ----------
const hændelser = { stød: 0, stødN: new THREE.Vector3(), bumper: null, gulv: false };
const TRIN = 1 / 240;
let pulser = [];

function opdater(dt) {
  sp.t += dt;
  const { bane, fys, kugle: k } = sp;
  if (!bane) return;
  const inp = styr.læs(dt);
  const spiller = sp.tilstand === "spil";
  sp.vipX += ((spiller ? inp.x : 0) - sp.vipX) * Math.min(1, dt * 8);
  sp.vipY += ((spiller ? inp.y : 0) - sp.vipY) * Math.min(1, dt * 8);
  opdaterMåler(inp);

  if (sp.tilstand !== "pause") {
    // styringen regnes om til verdens retninger ud fra kameraet
    const f = frem(sp.kamYaw), h = new THREE.Vector3(Math.cos(sp.kamYaw), 0, Math.sin(sp.kamYaw));
    const s = spiller ? { x: h.x * inp.x + f.x * inp.y, z: h.z * inp.x + f.z * inp.y } : { x: 0, z: 0 };
    const i = sp.tilstand === "mål" ? { ...ind, bremse: 5, rul: 2 } : ind;
    findKanter(fys, k);
    hændelser.stød = 0; hændelser.bumper = null; hændelser.gulv = false;
    sp.akk += dt;
    let n = 0;
    while (sp.akk >= TRIN && n < 14) {
      sp.fysT += TRIN;
      fys.bevæg(sp.fysT, TRIN);
      trin(fys, k, s, TRIN, i, hændelser);
      sp.akk -= TRIN; n++;
    }
    if (n >= 14) sp.akk = 0;
    for (const l of bane.levende) { l.obj.position.copy(l.form.pos); if (l.drej) l.obj.quaternion.copy(l.form.rot); }
    hændelserNu(dt);
  }
  animer(dt);
  opdaterKugle(dt);
  opdaterKamera(dt);
  const fart = Math.hypot(k.v.x - k.jordV.x, k.v.z - k.jordV.z);
  Lyd.rul(sp.tilstand === "pause" ? 0 : fart, k.påJorden, sp.tema.underlag(k.jordForm?.stil));
}

function hændelserNu(dt) {
  const { bane, kugle: k } = sp;
  sp.stødPause -= dt; sp.fartPause -= dt;
  if (hændelser.stød > 2.4 && sp.stødPause <= 0) { Lyd.stød(hændelser.stød); sp.stødPause = 0.1; }
  if (hændelser.bumper) { Lyd.bumper(); if (hændelser.bumper.obj) pulser.push({ obj: hændelser.bumper.obj, t: 0 }); }

  if (sp.tilstand === "spil") {
    // faldet ned?
    if (hændelser.gulv || k.p.y < bane.minY - (bane.gulvY != null ? 1.6 : 7)) startFald();
    // ting man samler
    for (const t of bane.ting) {
      if (t.taget || t.obj.position.distanceToSquared(k.p) > (R + 0.48) ** 2) continue;
      t.taget = true; t.flyv = 0;
      sp.samlet++;
      $("antal").textContent = sp.samlet;
      Lyd.saml();
      const [x, y] = påSkærm(t.obj.position);
      E?.stjerner?.(x, y, { antal: 6 });
    }
    // flag
    for (const f of bane.flag) {
      if (f.nået) continue;
      const dx = k.p.x - f.p.x, dz = k.p.z - f.p.z;
      if (dx * dx + dz * dz < 2.4 * 2.4 && Math.abs(k.p.y - R - f.p.y) < 1.6) {
        f.nået = true; f.nå();
        sp.igen = { p: f.p.clone(), ψ: f.ψ };
        Lyd.flag();
        const [x, y] = påSkærm(f.gruppe.position.clone().setY(f.p.y + 2));
        E?.konfetti?.(x, y, { antal: 26 });
      }
    }
    // fartpile
    if (k.påJorden && sp.fartPause <= 0) for (const p of bane.pads) {
      const dx = k.p.x - p.p.x, dz = k.p.z - p.p.z;
      if (dx * dx + dz * dz > 1.0 || Math.abs(k.p.y - R - p.p.y) > 0.8) continue;
      const vd = k.v.dot(p.dir);
      if (vd < 11) k.v.addScaledVector(p.dir, 11 - vd);
      Lyd.fart(); sp.fartPause = 0.6;
    }
    // igennem en donut
    for (const r of bane.ringe) {
      const d = _rel.copy(k.p).sub(r.c), s = d.dot(r.akse);
      const radial = Math.sqrt(Math.max(0, d.lengthSq() - s * s));
      const side = Math.sign(s);
      if (r.side && side !== r.side && radial < r.rr) { Lyd.ring(); const [x, y] = påSkærm(r.c); E?.stjerner?.(x, y, { antal: 8 }); }
      r.side = radial < r.rr + 1 ? side : 0;
    }
    // i mål?
    const m = bane.mål;
    if (m) {
      const dx = k.p.x - m.p.x, dz = k.p.z - m.p.z;
      if (dx * dx + dz * dz < 1.25 * 1.25 && Math.abs(k.p.y - R - m.p.y) < 1.0) vind();
    }
  }
  if (sp.tilstand === "fald") {
    sp.faldT += dt;
    if (sp.faldT > 0.75) $("fade").classList.add("vis");
    if (sp.faldT > 1.15) {
      placér(sp.igen, true);
      sp.tilstand = "spil";
      $("fade").classList.remove("vis");
      Lyd.op();
    }
  }
  if (sp.tilstand === "mål") {
    sp.målT += dt;
  }
}

function startFald() {
  sp.tilstand = "fald"; sp.faldT = 0;
  Lyd.fald();
}

// Små animationer: tingene svæver og drejer, flag vajer, bumpere hopper
function animer(dt) {
  const { bane } = sp, t = sp.t;
  for (const ting of bane.ting) {
    const o = ting.obj;
    if (ting.taget) {
      if (!o.visible) continue;
      ting.flyv += dt;
      o.position.y += dt * 3;
      o.scale.setScalar(Math.max(0.01, 1 + ting.flyv * 2 - ting.flyv * ting.flyv * 6));
      o.rotation.y += dt * 12;
      if (ting.flyv > 0.45) o.visible = false;
      continue;
    }
    o.position.y = ting.p.y + Math.sin(t * 2.2 + ting.fase) * 0.09;
    o.rotation.y = t * 1.6 + ting.fase;
  }
  for (const f of bane.flag) f.anim?.(t, dt);
  bane.mål?.anim?.(t, dt, sp.tilstand === "mål" ? 3 : 0.6);
  pulser = pulser.filter(p => {
    p.t += dt;
    const s = 1 + Math.sin(Math.min(1, p.t / 0.35) * Math.PI) * 0.25;
    p.obj.scale.set(s, 1 / s, s);
    return p.t < 0.35;
  });
}

// Vippe-måleren nederst til højre viser, hvordan man styrer lige nu
let målerX = 0, målerY = 0;
function opdaterMåler(inp) {
  if (Math.abs(inp.x - målerX) + Math.abs(inp.y - målerY) < 0.01) return;
  målerX = inp.x; målerY = inp.y;
  const r = $("vipMaaler").clientWidth * 0.32;
  $("vipPrik").style.transform = `translate(${inp.x * r}px, ${-inp.y * r}px)`;
}

// ---------- I mål ----------
function vind() {
  sp.tilstand = "mål"; sp.målT = 0;
  Lyd.mål();
  const [x, y] = påSkærm(sp.kugle.p);
  E?.konfetti?.(x, y, { antal: 90 });
  E?.stjerner?.(x, y, { antal: 16 });
  sig("Godt klaret!");
  const andel = sp.bane.antal ? sp.samlet / sp.bane.antal : 1;
  const stjerner = 1 + (andel >= 0.5 ? 1 : 0) + (andel >= 1 ? 1 : 0);
  gemt.stjerner[sp.def.id] = Math.max(gemt.stjerner[sp.def.id] || 0, stjerner);
  gem();
  setTimeout(() => {
    if (sp.tilstand !== "mål") return;
    $("stjerner").innerHTML = [0, 1, 2].map(i => `<span class="${i < stjerner ? "fuld" : ""}" style="animation-delay:${0.15 + i * 0.25}s">⭐</span>`).join("");
    $("maalTal").textContent = `${sp.samlet} af ${sp.bane.antal}`;
    $("maal").classList.remove("skjult");
    $("hud").classList.add("skjult");
  }, 1700);
}

// ---------- Menuen ----------
function stjernerI(verden) { return banerI(verden).reduce((s, b) => s + (gemt.stjerner[b.id] || 0), 0); }
function lavMenu() {
  $("verdener").innerHTML = VERDENER.map(v => {
    const t = TEMAER[v];
    return `<button class="verden ${v === gemt.verden ? "valgt" : ""}" data-v="${v}" style="--vfarve:${t.farve}">
      <span class="dyr">${t.emoji}</span><span class="vnavn">${t.navn}</span><span class="vstjerner">⭐ ${stjernerI(v)} / 15</span></button>`;
  }).join("");
  const baner = banerI(gemt.verden), farve = TEMAER[gemt.verden].farve;
  $("baner").innerHTML = baner.map((b, i) => {
    const s = gemt.stjerner[b.id] || 0;
    return `<button class="bane" data-id="${b.id}" style="--vfarve:${farve}"><span class="nr">${i + 1}</span><span class="bnavn">${b.navn}</span>
      <span class="bstjerner">${"★".repeat(s)}<i>${"★".repeat(3 - s)}</i></span></button>`;
  }).join("");
  $$(".verden").forEach(b => b.onclick = () => {
    Lyd.klar(); Lyd.klik();
    if (gemt.verden === b.dataset.v) return;
    gemt.verden = b.dataset.v; gem();
    lavMenu();
    indlæs(banerI(gemt.verden)[0].id);
  });
  $$(".bane").forEach(b => b.onclick = () => startBane(b.dataset.id));
}
function opdaterKnapper() {
  $$(".styreKnap").forEach(b => b.textContent = gemt.vip ? "📱 Vip" : "👆 Finger");
  $$(".fartKnap").forEach(b => b.textContent = gemt.fart === "rolig" ? "🐢 Rolig" : "🐇 Hurtig");
  $$(".musikKnap").forEach(b => b.textContent = gemt.musik ? "🎵" : "🔇");
  Object.assign(ind, FART[gemt.fart]);
  styr.brugVip = gemt.vip;
}
$$(".styreKnap").forEach(b => b.onclick = async () => {
  Lyd.klar(); Lyd.klik();
  if (!gemt.vip) {
    const ok = await styr.bedOmVip();
    gemt.vip = ok; styr.kalibrer();
    visBesked(ok ? "📱 Vip iPad'en for at trille" : "👆 Træk med fingeren for at trille");
  } else { gemt.vip = false; visBesked("👆 Træk med fingeren for at trille"); }
  gem(); opdaterKnapper();
});
$$(".fartKnap").forEach(b => b.onclick = () => { Lyd.klar(); Lyd.klik(); gemt.fart = gemt.fart === "rolig" ? "hurtig" : "rolig"; gem(); opdaterKnapper(); });
$$(".musikKnap").forEach(b => b.onclick = () => { Lyd.klar(); gemt.musik = !gemt.musik; gem(); Lyd.sætMusik(gemt.musik); opdaterKnapper(); });

async function startBane(id) {
  Lyd.klar(); Lyd.klik();
  const vip = gemt.vip ? styr.bedOmVip() : Promise.resolve(false);   // iPad vil spørges i selve trykket
  if (!sp.def || sp.def.id !== id || sp.tilstand !== "menu") indlæs(id);
  gemt.verden = sp.def.verden; gem();
  if (gemt.vip && !(await vip)) { gemt.vip = false; gem(); }
  opdaterKnapper();
  styr.kalibrer();
  $("menu").classList.add("skjult");
  $("maal").classList.add("skjult");
  $("pause").classList.add("skjult");
  $("hud").classList.remove("skjult");
  placér(sp.igen, true);
  sp.tilstand = "spil";
  sig(sp.def.navn);
  visBesked(gemt.vip && styr.vip.har ? "📱 Vip iPad'en — eller træk med fingeren 👆" : "👆 Træk med fingeren for at trille");
}

function tilMenu() {
  Lyd.klar(); Lyd.klik();
  const id = sp.def.id;
  indlæs(id);
  sp.tilstand = "menu";
  gemt.verden = sp.def.verden;
  lavMenu();
  $("menu").classList.remove("skjult");
  $("hud").classList.add("skjult");
  $("maal").classList.add("skjult");
  $("pause").classList.add("skjult");
  $("besked").classList.add("skjult");
}

function næsteBane() {
  const i = BANER.findIndex(b => b.id === sp.def.id);
  startBane(BANER[(i + 1) % BANER.length].id);
}

$("pauseKnap").onclick = () => {
  Lyd.klar(); Lyd.klik();
  if (sp.tilstand !== "spil" && sp.tilstand !== "fald") return;
  sp.førPause = sp.tilstand;
  sp.tilstand = "pause";
  $("pause").classList.remove("skjult");
};
$("fortsaet").onclick = () => { Lyd.klik(); styr.kalibrer(); sp.tilstand = sp.førPause || "spil"; $("pause").classList.add("skjult"); };
$("forfra").onclick = () => { const id = sp.def.id; indlæs(id); startBane(id); };
$("tilMenu").onclick = tilMenu;
$("igen").onclick = () => { const id = sp.def.id; indlæs(id); startBane(id); };
$("naeste").onclick = næsteBane;
$("tilBaner").onclick = tilMenu;
$("vipMaaler").onclick = () => {
  Lyd.klar(); styr.kalibrer();
  const m = $("vipMaaler"); m.classList.remove("nulstil"); void m.offsetWidth; m.classList.add("nulstil");
};
document.addEventListener("visibilitychange", () => { if (document.hidden && sp.tilstand === "spil") $("pauseKnap").onclick(); });

// ---------- Løkken (med automatisk billedkvalitet) ----------
let sidst = performance.now(), målSum = 0, målAntal = 0;
function løkke(nu) {
  requestAnimationFrame(løkke);
  const dt = Math.min(0.05, Math.max(0, (nu - sidst) / 1000));
  sidst = nu;
  opdater(dt);
  renderer.render(scene, kamera);
  målSum += dt; målAntal++;
  if (målSum > 2.5) {
    const snit = målSum / målAntal;
    if (snit > 0.024 && tæthed > 1) { tæthed = Math.max(1, tæthed - 0.25); renderer.setPixelRatio(tæthed); størrelse(); }
    else if (snit < 0.0135 && tæthed < maksTæthed) { tæthed = Math.min(maksTæthed, tæthed + 0.25); renderer.setPixelRatio(tæthed); størrelse(); }
    målSum = 0; målAntal = 0;
  }
}

// ---------- Start ----------
Lyd.sætMusik(gemt.musik);
opdaterKnapper();
if (!TEMAER[gemt.verden]) gemt.verden = "jungle";
const startId = URL_P.get("bane");
indlæs(startId && BANER.some(b => b.id === startId) ? startId : banerI(gemt.verden)[0].id);
gemt.verden = sp.def.verden;
lavMenu();
requestAnimationFrame(t => { sidst = t; løkke(t); });
window.kuglebanenKlar = true;
$("menu").classList.add("klar");

// ?debug: kb.spol(sek) kører spillet frem uden at vente på skærmen, kb.styr(x, y) holder styringen
if (URL_P.has("debug")) {
  let holdt = null;
  const gammelLæs = styr.læs;
  styr.læs = dt => holdt ? (styr.ud.x = holdt.x, styr.ud.y = holdt.y, styr.ud) : gammelLæs(dt);
  window.kb = {
    sp, styr, kamera, scene, renderer, THREE, startBane, indlæs, gemt, ind,
    spol(sek, d = 1 / 60) { for (let t = 0; t < sek; t += d) opdater(d); renderer.render(scene, kamera); },
    hold(x, y) { holdt = x == null ? null : { x, y }; },
    tp(x, y, z) { sp.kugle.p.set(x, y, z); sp.kugle.v.set(0, 0, 0); },
    // Autopilot til afprøvning: triller gennem punkterne som et forsigtigt barn.
    // Et punkt er [x, y, z] eller { p: [x, y, z], r, vent: () => true når man må køre videre }
    kør(punkter, maksTid = 90, fart = 4) {
      const k = sp.kugle, d = 1 / 60;
      let i = 0, t = 0, fald = 0, førsteFald = null;
      while (t < maksTid && sp.tilstand !== "mål") {
        if (sp.tilstand === "fald") { if (!fald) førsteFald = [i, ...k.p.toArray().map(v => +v.toFixed(2))]; fald++; while (sp.tilstand === "fald" && t < maksTid) { holdt = { x: 0, y: 0 }; opdater(d); t += d; } }
        const pk = punkter[Math.min(i, punkter.length - 1)], w = typeof pk.p === "function" ? pk.p() : pk.p || pk;
        const dx = w[0] - k.p.x, dz = w[2] - k.p.z, dist = Math.hypot(dx, dz);
        if ((pk.færdig ? pk.færdig() : dist < (pk.r || 0.9)) && i < punkter.length - 1) { i++; continue; }
        let vd = Math.min(pk.fart || fart, 0.6 + dist * 1.4);
        if (pk.vent && !pk.vent()) vd = 0;
        const ex = dx / (dist || 1) * vd - k.v.x, ez = dz / (dist || 1) * vd - k.v.z;
        let wx = ex * 0.8, wz = ez * 0.8;
        const l = Math.hypot(wx, wz); if (l > 1) { wx /= l; wz /= l; }
        const f = frem(sp.kamYaw), h = { x: Math.cos(sp.kamYaw), z: Math.sin(sp.kamYaw) };
        holdt = { x: wx * h.x + wz * h.z, y: wx * f.x + wz * f.z };
        opdater(d); t += d;
      }
      holdt = null;
      renderer.render(scene, kamera);
      return { mål: sp.tilstand === "mål", tid: +t.toFixed(1), samlet: sp.samlet, af: sp.bane.antal, fald, førsteFald, punkt: i, p: k.p.toArray().map(v => +v.toFixed(2)) };
    },
  };
}
