// ===== Burgerløbet — saml alt det lækre på vejen, og giv burgeren til kæmpen for enden =====
// Træk fingeren til siden for at styre. Hver ting, man rammer, hopper op på burgeren.
// Kagerrullerne slår de øverste lag af. Ved portene vælger man venstre eller højre.
import * as THREE from "./three.js";
import { lavLag, lavLøber, LAG } from "./figurer.js";
import { byggBane, BREDDE } from "./bane.js";
import * as Lyd from "./lyd.js";

const $ = id => document.getElementById(id);
const klem = (v, a, b) => Math.max(a, Math.min(b, v));
const tilf = (a, b) => a + Math.random() * (b - a);
const FART = 8.5;                           // hvor hurtigt burgeren løber (enheder pr. sekund)
const STJERNER = [1, 12, 25];               // så mange lag giver 1, 2 og 3 stjerner
const MAKS_LAG = 90;

// ---------- 3D-motoren ----------
const lærred = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas: lærred, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa070, 2.2));
const sol = new THREE.DirectionalLight(0xfff4e0, 2.4);
scene.add(sol, sol.target);
function størrelse() {
  const w = lærred.clientWidth || window.innerWidth, h = lærred.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h; kamera.fov = w < h ? 74 : 60; kamera.updateProjectionMatrix();
}
window.Effekter.vedStørrelse(størrelse);
størrelse();

// ---------- Tilstand ----------
let niveau = hentNiveau();
let bane = null, løber = null;
let tilstand = "start";                     // start · løb · mål · slut
let px = 0, målX = 0, pz = 0, vx = 0, fart = 0, tTid = 0, tid = 0;
let sving = 0, svingV = 0, stakH = 0, iTræk = 0, sidsteSaml = -9, usårlig = 0, ryst = 0, hopY = 0;
let lag = [], flyvende = [], løse = [], krummer = [], antalSamlet = 0;
const kig = new THREE.Vector3();

function hentNiveau() {
  const q = parseInt(new URLSearchParams(location.search).get("niveau"), 10);
  if (q > 0) return q;
  try { return Math.max(1, parseInt(localStorage.getItem("burgerloeb-niveau"), 10) || 1); } catch (_) { return 1; }
}
function gemNiveau(n) { try { localStorage.setItem("burgerloeb-niveau", String(n)); } catch (_) {} }

// ---------- Byg en ny bane ----------
function nyBane() {
  if (bane) scene.remove(bane.gruppe);
  if (løber) scene.remove(løber.gruppe);
  for (const f of [...flyvende, ...løse, ...krummer]) scene.remove(f.m);
  bane = byggBane(scene, niveau);
  løber = lavLøber();
  scene.add(løber.gruppe);
  px = målX = pz = vx = fart = sving = svingV = stakH = 0; iTræk = 0; usårlig = 0; hopY = 0;
  lag = []; flyvende = []; løse = []; krummer = []; antalSamlet = 0;
  løber.gruppe.position.set(0, 0, 0); løber.gruppe.scale.setScalar(1); løber.gruppe.visible = true;
  $("tal").textContent = 0; $("baneNr").textContent = "Bane " + niveau;
  kamera.position.set(4, 3, 6);
  sætTilstand("start");
}
function sætTilstand(t) {
  tilstand = t; tTid = 0;
  $("startSkærm").classList.toggle("skjult", t !== "start");
  $("slutSkærm").classList.toggle("skjult", t !== "slut");
  $("frem").style.visibility = t === "løb" ? "visible" : "hidden";
  if (t !== "løb") $("hint").classList.add("skjult");
}

// ---------- Burgerens lag ----------
const stakTop = () => løber.gruppe.localToWorld(new THREE.Vector3(sving * Math.pow(stakH, 1.25) * 0.5, 0.76 + stakH, 0));
// En ting flyver op på toppen af burgeren (vent = hvor længe den venter, før den flyver)
function flyvTilStak(m, type, vent = 0) {
  const fra = m.getWorldPosition(new THREE.Vector3());
  scene.attach(m);
  flyvende.push({ m, type, fra, t: 0, vent });
}
function tilføjLag(m, type) {
  m.position.set(0, stakH, 0); m.rotation.set(0, Math.random() * 6, 0); m.scale.setScalar(1);
  løber.stak.add(m);
  lag.push({ m, type, y: stakH, klem: 1 });
  stakH += LAG[type].h;
  if (type !== "top") antalSamlet++;
  iTræk = tid - sidsteSaml < 1.3 ? iTræk + 1 : 0; sidsteSaml = tid;
  Lyd.saml(iTræk);
  svingV += tilf(-0.4, 0.4);
  $("tal").textContent = antalSamlet;
  const el = $("taeller"); el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop");
}
// Kagerullen slår de øverste lag af — de tumler ned af bordet
function tab(n) {
  for (let i = 0; i < n && lag.length; i++) {
    const l = lag.pop();
    stakH -= LAG[l.type].h;
    if (l.type !== "top") antalSamlet--;
    scene.attach(l.m);
    løse.push({ m: l.m, v: new THREE.Vector3(tilf(-3, 3), tilf(3, 6), tilf(2, 5)), rv: new THREE.Vector3(tilf(-6, 6), tilf(-6, 6), tilf(-6, 6)), liv: 1.6 });
  }
  $("tal").textContent = antalSamlet;
}
function placerLag(dt) {
  for (const l of lag) {
    l.klem = Math.max(0, l.klem - dt * 5);
    const y = l.y, f = y / Math.max(stakH, 0.1);
    l.m.position.x = sving * Math.pow(y, 1.25) * 0.5;
    l.m.rotation.z = -sving * 0.45 * f;
    const sq = 1 - Math.sin(l.klem * Math.PI) * 0.35;
    l.m.scale.set(1 + (1 - sq) * 0.5, sq, 1 + (1 - sq) * 0.5);
  }
}

// ---------- Løbet ----------
function opdaterLøb(dt) {
  fart += (FART - fart) * Math.min(1, dt * 1.5);
  pz -= fart * dt;
  const før = px;
  px += (målX - px) * Math.min(1, dt * 10);
  vx = (px - før) / Math.max(dt, 0.001);
  // benene løber, og burgeren hopper lidt for hvert skridt
  const skridt = tid * (10 + fart);
  løber.ben[0].rotation.x = Math.sin(skridt) * 0.9; løber.ben[1].rotation.x = -Math.sin(skridt) * 0.9;
  if (Math.sin(skridt) * Math.sin(skridt - dt * (10 + fart)) < 0) Lyd.trin();
  hopY = Math.max(0, hopY - dt * 6);
  løber.gruppe.position.set(px, Math.abs(Math.sin(skridt)) * 0.07 + Math.sin(hopY * Math.PI) * 0.6, pz);
  løber.gruppe.rotation.z = -vx * 0.01;
  // stakken bøjer sig, når man drejer — og vipper tilbage som gele
  svingV += ((-vx * 0.014 - sving) * 45 - svingV * 7) * dt;
  sving += svingV * dt;
  usårlig = Math.max(0, usårlig - dt);
  løber.gruppe.visible = usårlig <= 0 || Math.floor(usårlig * 12) % 2 === 0;

  // saml ting op
  for (const t of bane.ting) {
    if (t.taget) continue;
    if (t.z > pz + 2 || t.z < pz - 70) continue;
    t.m.rotation.y += dt * 1.6; t.m.position.y = 0.9 + Math.sin(tid * 3 + t.z) * 0.12;
    if (Math.abs(t.z - pz) < 0.75 && Math.abs(t.x - px) < 1.05 && lag.length < MAKS_LAG) {
      t.taget = true; t.ring.visible = false;
      flyvTilStak(t.m, t.type);
    }
  }
  // portene: den side, man løber igennem, giver flere af samme slags
  for (const p of bane.porte) {
    if (p.taget || pz > p.z + 0.2 || pz < p.z - 1) continue;
    const side = px < 0 ? -1 : 1;
    for (const q of bane.porte) if (q.z === p.z) q.taget = true;
    const valgt = bane.porte.find(q => q.z === p.z && q.x === side);
    if (!valgt) continue;
    Lyd.port();
    valgt.valgt = true;
    for (let i = 0; i < valgt.antal; i++) {
      const m = lavLag(valgt.type);
      m.position.set(valgt.x * 1.62, 2.6, valgt.z);
      scene.add(m);
      flyvTilStak(m, valgt.type, i * 0.12);
    }
  }
  // portene, man er kørt igennem, skrumper væk (så kameraet ikke flyver ind i skiltet)
  for (const p of bane.porte) {
    if (!p.taget || !p.m.visible) continue;
    p.svind = (p.svind || 0) + dt * 2.2;
    p.m.scale.setScalar(Math.max(0, 1 - p.svind) * (p.valgt ? 1.2 : 1));
    if (p.svind >= 1) p.m.visible = false;
  }
  // kagerullerne: nogle ruller frem og tilbage
  for (const r of bane.ruller) {
    if (r.bevæger) { r.x = Math.sin(tid * r.fart + r.fase) * 2.1; r.m.position.x = r.x; r.m.rotation.x = -r.x / 0.34; }
    if (usårlig <= 0 && Math.abs(r.z - pz) < 0.55 && Math.abs(r.x - px) < r.bredde / 2 + 0.3) {
      Lyd.bonk(); tab(Math.min(3, lag.length)); usårlig = 1.3; fart *= 0.35; hopY = 1; ryst = 0.35;
    }
  }
  if (pz <= -bane.L + 1.5) { sætTilstand("mål"); Lyd.hm(); return; }
  // fremskridt øverst
  const p = klem(-pz / bane.L, 0, 1);
  $("fremFyld").style.width = (p * 100).toFixed(1) + "%";
  $("fremMig").style.left = `calc(${(p * 100).toFixed(1)}% - 14px)`;
  $("hint").classList.toggle("skjult", tTid > 3.5);
}

// ---------- Målet: burgeren hopper ind i munden på kæmpen ----------
let hopFra = null, reaktion = false, bøvset = false;
function opdaterMål(dt) {
  const k = bane.kæmpe, mund = k.mundPos();
  // 1) løberen stopper og får låg på, hvis der ikke er et
  if (tTid < 0.7) {
    fart = Math.max(0, fart - dt * 14); pz -= fart * dt;
    løber.gruppe.position.z = pz;
    px += (0 - px) * Math.min(1, dt * 4); løber.gruppe.position.x = px;
    if (tTid - dt <= 0.05 && tTid > 0.05 && !lag.some(l => l.type === "top")) {
      const top = lavLag("top"); top.position.set(px, 7, pz); scene.add(top); flyvTilStak(top, "top");
    }
    hopFra = null; reaktion = false; bøvset = false;
    k.tilstand.åben = Math.min(1.3, k.tilstand.åben + dt);
  } else if (tTid < 2.1) {
    // 2) hop! i en stor bue ind i munden
    if (!hopFra) { hopFra = løber.gruppe.position.clone(); Lyd.hop(); }
    const p = klem((tTid - 0.8) / 1.3, 0, 1), e = p * p * (3 - 2 * p);
    const passer = Math.min(1, 2.8 / (stakH + 1.1));
    const mål = mund.clone().add(new THREE.Vector3(0, -(0.76 + stakH * 0.5) * passer, -0.5));
    løber.gruppe.position.lerpVectors(hopFra, mål, e);
    løber.gruppe.position.y += Math.sin(e * Math.PI) * (3 + stakH * 0.3);
    løber.gruppe.scale.setScalar(1 + (passer - 1) * e);
    løber.gruppe.rotation.x = -e * 0.4;
    løber.ben.forEach((b, i) => { b.rotation.x = Math.sin(tid * 30 + i * 3) * 1.2; });
    k.tilstand.åben = 1.3;
  } else if (tTid < 4.4) {
    // 3) gumle gumle
    if (løber.gruppe.visible) { løber.gruppe.visible = false; k.tilstand.åben = 0; k.tilstand.tyg = 1; Lyd.tyg(); k.tilstand.hop = 0.5; }
    if (Math.random() < dt * 16) {
      const m = new THREE.Mesh(krummeGeo, krummeMat[Math.floor(Math.random() * krummeMat.length)]);
      m.position.copy(mund).add(new THREE.Vector3(tilf(-1, 1), 0, 0.8));
      scene.add(m);
      krummer.push({ m, v: new THREE.Vector3(tilf(-3, 3), tilf(2, 6), tilf(1, 4)), liv: 1.2 });
    }
  } else {
    // 4) synke, og så glæde — og en bøvs, hvis burgeren var stor
    if (!reaktion) {
      reaktion = true; k.tilstand.tyg = 0; Lyd.synk();
      setTimeout(() => Lyd.mmm(), 300);
      k.tilstand.glad = 1; k.tilstand.hop = 1;
      k.mave.scale.setScalar(1 + Math.min(0.45, antalSamlet * 0.015));
      window.Effekter.stjerner(innerWidth / 2, innerHeight * 0.35, { antal: 16 });
    }
    if (!bøvset && antalSamlet >= 15 && tTid > 5.3) { bøvset = true; Lyd.bøvs(); k.tilstand.åben = 0.9; setTimeout(() => { if (bane) bane.kæmpe.tilstand.åben = 0; }, 700); }
    k.tilstand.hop = Math.max(0, k.tilstand.hop - dt * 0.4);
    if (tTid > (antalSamlet >= 15 ? 6.4 : 5.6)) visResultat();
  }
}
const krummeGeo = new THREE.SphereGeometry(0.12, 6, 5);
const krummeMat = ["#e39a45", "#6b3a1c", "#5fc23a", "#ffc928", "#e0301e"].map(f => new THREE.MeshStandardMaterial({ color: f }));

function visResultat() {
  sætTilstand("slut");
  const antal = STJERNER.filter(s => antalSamlet >= s).length;
  $("resTal").textContent = antalSamlet;
  $("resStjerner").querySelectorAll("span").forEach((s, i) => s.classList.toggle("slukket", i >= antal));
  gemNiveau(Math.max(hentGemt(), niveau + 1));
  window.Effekter.fanfare();
  if (antal >= 2) window.Effekter.konfetti(innerWidth / 2, innerHeight * 0.3, { antal: 90 });
}
function hentGemt() { try { return parseInt(localStorage.getItem("burgerloeb-niveau"), 10) || 1; } catch (_) { return 1; } }

// ---------- Ting der flyver: lag på vej op, lag der falder af, krummer ----------
function opdaterFlyvende(dt) {
  for (const f of flyvende) {
    if (f.vent > 0) { f.vent -= dt; continue; }
    f.t = Math.min(1, f.t + dt / 0.3);
    const mål = stakTop(), e = f.t;
    f.m.position.lerpVectors(f.fra, mål, e);
    f.m.position.y += Math.sin(e * Math.PI) * 1.4;
    f.m.rotation.y += dt * 9;
    if (f.t >= 1) { f.færdig = true; tilføjLag(f.m, f.type); }
  }
  flyvende = flyvende.filter(f => !f.færdig);
  for (const l of [...løse, ...krummer]) {
    l.liv -= dt; l.v.y -= 14 * dt;
    l.m.position.addScaledVector(l.v, dt);
    if (l.rv) { l.m.rotation.x += l.rv.x * dt; l.m.rotation.z += l.rv.z * dt; }
    if (l.liv <= 0) scene.remove(l.m);
  }
  løse = løse.filter(l => l.liv > 0); krummer = krummer.filter(l => l.liv > 0);
}

// ---------- Kameraet ----------
function opdaterKamera(dt) {
  const ønsket = new THREE.Vector3();
  if (tilstand === "start") {                 // kører langsomt rundt om den lille burger
    const a = tid * 0.35;
    ønsket.set(Math.sin(a) * 4.2, 1.9, pz + Math.cos(a) * 4.2);
    kig.set(0, -0.3, pz);                     // kig lidt under burgeren, så den står over startkortet
  } else if (tilstand === "løb") {
    // kameraet er altid over toppen af burgeren, så man kan se vejen forude
    ønsket.set(px * 0.55, 3.4 + stakH * 1.05, pz + 6.2 + stakH * 0.7);
    kig.set(px * 0.7, 0.9 + stakH * 0.25, pz - 7);
  } else {                                    // set skråt fra siden, så man ser både burgeren og kæmpen
    ønsket.set(-5.5, 5.6 + Math.min(3, stakH * 0.25), -bane.L + 4.5);
    kig.set(0, 2.6, -bane.L - 3.2);
  }
  kamera.position.lerp(ønsket, Math.min(1, dt * (tilstand === "løb" ? 5 : 2)));
  ryst = Math.max(0, ryst - dt);
  kamera.position.x += Math.sin(tid * 70) * ryst * 0.4;
  kamera.lookAt(kig);
  sol.position.set(kamera.position.x - 6, 16, kamera.position.z + 4);
  sol.target.position.set(kig.x, 0, kig.z - 4);
}

// ---------- Løkken ----------
let sidst = performance.now();
function loop(t) {
  const dt = klem((t - sidst) / 1000, 0, 0.05);
  sidst = t;
  steg(dt);
  renderer.render(scene, kamera);
  requestAnimationFrame(loop);
}
function steg(dt) {
  tid += dt; tTid += dt;
  if (tilstand === "løb") opdaterLøb(dt);
  else if (tilstand === "mål") opdaterMål(dt);
  else if (tilstand === "start") { løber.ben.forEach(b => { b.rotation.x *= 0.9; }); løber.gruppe.position.y = Math.abs(Math.sin(tid * 3)) * 0.05; }
  opdaterFlyvende(dt);
  placerLag(dt);
  sving *= tilstand === "løb" ? 1 : 0.95;
  bane.kæmpe.opdater(tid, løber.gruppe.getWorldPosition(new THREE.Vector3()));
  if (tilstand === "løb") bane.kæmpe.tilstand.åben = klem(1.2 - (pz + bane.L) / 25, 0, 1.2);
  opdaterKamera(dt);
}

// ---------- Styring: træk fingeren til siden (eller brug piletasterne) ----------
let træk = null;
lærred.addEventListener("pointerdown", e => {
  Lyd.klar();
  træk = { id: e.pointerId, x: e.clientX, fra: målX };
  try { lærred.setPointerCapture(e.pointerId); } catch (_) {}
});
lærred.addEventListener("pointermove", e => {
  if (!træk || e.pointerId !== træk.id) return;
  målX = klem(træk.fra + (e.clientX - træk.x) / (lærred.clientWidth || innerWidth) * 12, -(BREDDE - 0.55), BREDDE - 0.55);
});
const slip = e => { if (træk && e.pointerId === træk.id) træk = null; };
lærred.addEventListener("pointerup", slip);
lærred.addEventListener("pointercancel", slip);
const taster = {};
addEventListener("keydown", e => { taster[e.key] = true; if ((e.key === " " || e.key === "Enter") && tilstand === "start") start(); });
addEventListener("keyup", e => { taster[e.key] = false; });
setInterval(() => {
  const r = (taster.ArrowRight || taster.d ? 1 : 0) - (taster.ArrowLeft || taster.a ? 1 : 0);
  if (r) målX = klem(målX + r * 0.12, -(BREDDE - 0.55), BREDDE - 0.55);
}, 16);

function start() {
  Lyd.klar(); Lyd.start();
  sætTilstand("løb");
  $("hint").classList.remove("skjult");
}
$("startKnap").addEventListener("click", start);
$("næsteKnap").addEventListener("click", () => { niveau++; nyBane(); start(); });
$("igenKnap").addEventListener("click", () => { nyBane(); start(); });

nyBane();
requestAnimationFrame(loop);
if (location.search.includes("debug")) window.bl = { get tilstand() { return tilstand; }, get pz() { return pz; }, set pz(v) { pz = v; }, get lag() { return lag; },
  get bane() { return bane; }, get antal() { return antalSamlet; }, set målX(v) { målX = v; }, start, scene, kamera, renderer,
  spol(sek) { for (let i = 0; i < sek * 60; i++) steg(1 / 60); renderer.render(scene, kamera); return tilstand; } };
