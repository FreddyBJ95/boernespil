// ===== Mærkelige fisk — 3D-fiskespil =====
// Tryk for at kaste. Hold fingeren nede for at spole ind. Se hvilken mærkelig fisk der bider!
// Man kan fiske fra broen ved søen eller fra en båd på havet (verden.js). På havet kan man sejle videre med 🚤.
// Fiskene står i fisk.js og fiskestængerne i staenger.js — tilføj flere dér.

import * as THREE from "./three.js";
import { FISKE, byggFisk, animerFisk, rydOp } from "./fisk.js";
import { STÆNGER, byggStang } from "./staenger.js";
import { byggVerden } from "./verden.js";
import * as Lyd from "./lyd.js";

const E = window.Effekter;
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const blød = s => s * s * (3 - 2 * s);

// ---------- Gemt fremskridt (kun på denne enhed) ----------
const GEM = "maerkelige-fisk-v1";
const gemt = { fangst: {}, stang: "spinne", total: 0 };
try { Object.assign(gemt, JSON.parse(localStorage.getItem(GEM)) || {}); } catch (_) {}
const gem = () => { try { localStorage.setItem(GEM, JSON.stringify(gemt)); } catch (_) {} };

// ---------- Hvor fisker vi? Søen eller havet (vælges på startskærmen) ----------
const BANE_GEM = "maerkelige-fisk-bane";
let BANE = "sø";
try { if (localStorage.getItem(BANE_GEM) === "hav") BANE = "hav"; } catch (_) {}
const fiskeHer = FISKE.filter(f => !f.sted || f.sted === BANE);
Lyd.sætBane(BANE);

// ---------- Oplæsning på dansk (kun hvis enheden har en dansk stemme) ----------
let stemme = null;
const findStemme = () => { try { stemme = speechSynthesis.getVoices().find(v => /^da/i.test(v.lang)) || null; } catch (_) {} };
if ("speechSynthesis" in window) { findStemme(); speechSynthesis.onvoiceschanged = findStemme; }
function sig(tekst) {
  if (!stemme) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(tekst);
    u.voice = stemme; u.lang = stemme.lang; u.rate = 1.05; u.pitch = 1.2;
    speechSynthesis.speak(u);
  } catch (_) {}
}

// ---------- 3D-scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $("scene"), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(60, 1, 0.05, 900);
kamera.rotation.order = "YXZ";
scene.add(kamera);
const verden = byggVerden(scene, renderer, { bane: BANE, fiskeHer, lyd: (navn, ...x) => Lyd[navn]?.(...x) });
kamera.position.copy(verden.kamera.pos);
kamera.rotation.x = verden.kamera.rx;

// Mål selve billedfladen (ikke vinduet), så billedet aldrig bliver strakt — heller ikke når telefonen vendes
function størrelse() {
  const el = renderer.domElement, w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.fov = w / h < 1 ? 72 : 60;       // lidt bredere udsyn når skærmen står på højkant
  kamera.updateProjectionMatrix();
}
window.Effekter.vedStørrelse(størrelse);
størrelse();

// ---------- Fiskestangen (sidder fast foran kameraet, som om man holder den) ----------
const stangHolder = new THREE.Group();
stangHolder.position.set(0.3, -0.3, -0.62);
kamera.add(stangHolder);
const lineMat = new THREE.MeshBasicMaterial({ color: "#fde047" });
let stangDef = STÆNGER.find(s => s.id === gemt.stang) || STÆNGER[0], stang = null;
function skiftStang(def) {
  if (stang) { stangHolder.remove(stang.gruppe); rydOp(stang.gruppe); }
  stangDef = def;
  stang = byggStang(def);
  stang.gruppe.rotation.set(-1.0, 0, 0.14);
  stangHolder.add(stang.gruppe);
  lineMat.color.set(def.line || "#fde047");
  gemt.stang = def.id; gem();
}
skiftStang(stangDef);

// ---------- Grej: flåd, blink og snøre ----------
const glat = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.35, ...x });
const flåd = new THREE.Group();
flåd.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glat("#ff2d55")));
flåd.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glat("#ffffff")));
const pind = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), glat("#ff2d55")); pind.position.y = 0.17; flåd.add(pind);
scene.add(flåd);
const blink = new THREE.Group();
const ske = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), glat("#ffd23f", { metalness: 0.9, roughness: 0.2 }));
ske.scale.set(0.035, 0.08, 0.014); ske.position.y = -0.08; blink.add(ske);
blink.add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), glat("#e63946")));
scene.add(blink);

const snøre = new THREE.Mesh(new THREE.BufferGeometry(), lineMat);
const forfang = new THREE.Mesh(new THREE.BufferGeometry(), lineMat);
snøre.frustumCulled = forfang.frustumCulled = false;
scene.add(snøre, forfang);
function tegnLine(m, fra, til, slap) {
  const midt = fra.clone().lerp(til, 0.5); midt.y -= slap;
  m.geometry.dispose();
  m.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(fra.clone(), midt, til.clone()), 20, 0.008, 4, false);
}

// ---------- Solstråler bag fangsten ----------
function stråleTekstur() {
  const c = document.createElement("canvas"); c.width = c.height = 512;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, "rgba(255,244,190,0.95)"); g.addColorStop(1, "rgba(255,244,190,0)");
  x.fillStyle = g;
  for (let i = 0; i < 18; i++) {
    const a0 = i / 18 * Math.PI * 2, a1 = a0 + Math.PI / 18;
    x.beginPath(); x.moveTo(256, 256); x.arc(256, 256, 256, a0, a1); x.closePath(); x.fill();
  }
  x.beginPath(); x.arc(256, 256, 70, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const VIS_POS = new THREE.Vector3(0, 0.18, -1.7);
const stråler = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: stråleTekstur(), transparent: true, opacity: 0, depthWrite: false, fog: false }));
stråler.position.set(0, VIS_POS.y, -3.2);
const mørke = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: "#0b1d33", transparent: true, opacity: 0, depthWrite: false, fog: false }));
mørke.position.z = -3.4;
kamera.add(stråler, mørke);

// ---------- Små stjerner, der drejer rundt om fangsten ----------
const stjerneForm = new THREE.Shape();
for (let i = 0; i <= 10; i++) {
  const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 1;
  if (i === 0) stjerneForm.moveTo(Math.cos(a) * r, Math.sin(a) * r); else stjerneForm.lineTo(Math.cos(a) * r, Math.sin(a) * r);
}
const stjerneGeo = new THREE.ShapeGeometry(stjerneForm), glimmer = new THREE.Group();
for (let i = 0; i < 12; i++) {
  const m = new THREE.Mesh(stjerneGeo, new THREE.MeshBasicMaterial({ color: i % 3 ? "#fff3a0" : "#ffffff", transparent: true, opacity: 0, fog: false, depthWrite: false }));
  m.userData = { a: i / 12 * Math.PI * 2, r: 0.55 + (i % 3) * 0.12, s: 0.03 + (i % 4) * 0.012, f: 0.6 + (i % 5) * 0.15 };
  glimmer.add(m);
}
glimmer.position.copy(VIS_POS);
kamera.add(glimmer);

// ---------- Tilstand ----------
const ANKER = new THREE.Vector3(0.25, 0, 1.0);        // her ender flåddet når det er spolet helt ind
let fase = "start", faseTid = 0, tid = 0;
let holder = false;
const flådPos = new THREE.Vector3(0, 2, 2), landing = new THREE.Vector3(), kastFra = new THREE.Vector3();
const retning = new THREE.Vector3(0, 0, -1), vinkelret = new THREE.Vector3(1, 0, 0);
let afstand = 0, startAfstand = 0, bidOm = 0, side = 0, kastet = false, kastLyd = false;
let fisk = null, fiskDef = null, fiskCm = 0, fiskSkala = 1, visSkala = 1, sidsteId = null;
let springer = -1, springTid = 0, rykTid = 0, ryk = 0, ringTid = 0, spinTid = -1;
let bøjMål = 0.05, bøjNu = 0.05, sideMål = 0, sideNu = 0, sving = 0, spinFart = 0, klikV = 0, visVip = 0, stråleOp = 0;
const landFra = new THREE.Vector3(), landQ = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), qFlip = new THREE.Quaternion();
const qVis = new THREE.Quaternion(), qMål = new THREE.Quaternion(), Y_AKSE = new THREE.Vector3(0, 1, 0);
let nytSted = false;                                   // lige sejlet til et nyt sted: de sjældne fisk bider lidt oftere
const X_AKSE = new THREE.Vector3(1, 0, 0), vSpids = new THREE.Vector3(), vMund = new THREE.Vector3(), vTmp = new THREE.Vector3();

const sejlKnap = $("sejlKnap"), beskedEl = $("besked"), kampbarEl = $("kampbar"), kampFyld = $("kampfyld"), kampFisk = $("kampfisk"), kortEl = $("kort"), talEl = $("tal");
talEl.textContent = gemt.total || 0;

const BESKED = {
  start: "", klar: "Tryk for at kaste! 🎣", kast: "Svup! 🎣", vent: "Hold fingeren nede for at spole ind 🌀",
  bid: "Fisk på! 🐟", kamp: "Hold nede og spol! Den kæmper! 💪", land: "Den kommer op! 🌊", vis: "", spand: "",
  sejl: "Brrrum! Vi sejler ud til et nyt sted… 🚤",
};
function sætFase(f) {
  fase = f; faseTid = 0;
  beskedEl.textContent = BESKED[f] || "";
  beskedEl.classList.toggle("skjult", !BESKED[f]);
  kampbarEl.classList.toggle("skjult", f !== "kamp");
  sejlKnap.classList.toggle("skjult", !(BANE === "hav" && f === "klar"));
}

function tilSkærm(v) {
  const p = v.clone().project(kamera);
  return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight };
}
const stjerner = f => f.chance >= 0.1 ? "⭐" : f.chance >= 0.05 ? "⭐⭐" : "⭐⭐⭐";

// Vælg en fisk — sjældne fisk er sjældne, men nye fisk dukker lidt oftere op
const prøvFisk = new URLSearchParams(location.search).get("fisk");   // fx ?fisk=disko — godt når man laver en ny fisk
function vælgFisk() {
  const valgt = prøvFisk && FISKE.find(f => f.id === prøvFisk);
  if (valgt) return valgt;
  const bonus = nytSted ? 1.8 : 1;
  nytSted = false;
  const v = fiskeHer.map(f => {
    let w = f.chance;
    if (f.chance < 0.06) w *= stangDef.held * bonus;
    if (!gemt.fangst[f.id]) w *= 1.6;
    if (f.id === sidsteId) w *= 0.25;
    return w;
  });
  let r = Math.random() * v.reduce((a, b) => a + b, 0);
  for (let i = 0; i < fiskeHer.length; i++) { r -= v[i]; if (r <= 0) { sidsteId = fiskeHer[i].id; return fiskeHer[i]; } }
  return fiskeHer[0];
}

// ---------- Handlinger ----------
function startKast() {
  const D = stangDef.kast * rnd(0.75, 1), v = rnd(-0.32, 0.32);
  retning.set(Math.sin(v), 0, -Math.cos(v));
  vinkelret.set(-retning.z, 0, retning.x);
  landing.copy(ANKER).addScaledVector(retning, D);
  kastet = false; kastLyd = false;
  sætFase("kast");
}

function startBid() {
  fiskDef = vælgFisk();
  const [a, b] = fiskDef.cm;
  fiskCm = Math.round(rnd(a, b));
  fisk = byggFisk(fiskDef);
  fiskSkala = (0.85 + (b > a ? (fiskCm - a) / (b - a) : 0.5) * 0.35) * 0.9;
  fisk.scale.setScalar(fiskSkala);
  fisk.position.set(flådPos.x, -0.55, flådPos.z);
  scene.add(fisk);
  startAfstand = afstand; ryk = 0; rykTid = rnd(1.5, 3); springTid = rnd(1.2, 2.5); springer = -1;
  Lyd.bid();
  verden.plask(flådPos, 0.7);
  const p = tilSkærm(flådPos);
  E.tekstPop(p.x, p.y - 50, "❗", { s: 90 });
  sig("Fisk på!");
  sætFase("bid");
}

function startLand() {
  Lyd.knirk(0); Lyd.plask(1.4);
  verden.plask(fisk.position, 2.2); verden.dråber(fisk.position, 20, 5);
  landFra.copy(fisk.position); landQ.copy(fisk.quaternion);
  qVis.setFromAxisAngle(Y_AKSE, fisk.userData.visDrej || 0);
  const dybde = -VIS_POS.z, synH = 2 * dybde * Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)), synB = synH * kamera.aspect;
  visSkala = Math.min(synB * 0.62 / fisk.userData.længde, synH * 0.42 / fisk.userData.højde, 1.6);
  flåd.visible = blink.visible = false;
  sætFase("land");
}

function visFangst() {
  const før = gemt.fangst[fiskDef.id];
  gemt.fangst[fiskDef.id] = { antal: (før?.antal || 0) + 1, størst: Math.max(før?.størst || 0, fiskCm) };
  gem();
  $("kortNavn").textContent = fiskDef.navn;
  $("kortStjerner").textContent = stjerner(fiskDef);
  $("kortCm").textContent = `${fiskCm} cm`;
  $("kortTekst").textContent = fiskDef.tekst || "";
  $("kortNy").style.display = før ? "none" : "";
  kortEl.classList.remove("skjult");
  E.fest(window.innerWidth / 2, window.innerHeight * 0.35);
  const sjælden = fiskDef.chance <= 0.035;              // de sjældne fisk får guldstråler og ekstra fest
  stråler.material.color.set(sjælden ? "#ffd23f" : "#ffffff");
  if (sjælden) {
    setTimeout(() => E.fest(window.innerWidth * 0.2, window.innerHeight * 0.3), 450);
    setTimeout(() => E.fest(window.innerWidth * 0.8, window.innerHeight * 0.3), 900);
  }
  const def = fiskDef;
  setTimeout(() => Lyd.fiskeLyd(def.lyd), 800);
  setTimeout(() => sig(def.tale || `Du fangede en ${def.navn}!`), 1500);
  sætFase("vis");
}

function startSpand() {
  if (fase !== "vis") return;
  kortEl.classList.add("skjult");
  Lyd.tryk();
  scene.attach(fisk);
  landFra.copy(fisk.position);
  visSkala = fisk.scale.x;
  flåd.visible = blink.visible = true;
  sætFase("spand");
}
$("iSpanden").addEventListener("click", startSpand);

// ---------- Hver frame ----------
function opdaterFase(dt) {
  const spids = stang.spids.getWorldPosition(vSpids);
  spinFart = 0;
  switch (fase) {
    case "klar":
      bøjMål = 0.05; sving = 0;
      break;

    case "kast": {
      const t = faseTid;
      sving = t < 0.35 ? 0.6 * blød(t / 0.35)
        : t < 0.55 ? 0.6 - 1.0 * blød((t - 0.35) / 0.2)
        : -0.4 * (1 - blød(Math.min(1, (t - 0.55) / 0.5)));
      if (t >= 0.35 && !kastLyd) { kastLyd = true; Lyd.kast(); }
      if (t >= 0.5) {
        if (!kastet) { kastet = true; kastFra.copy(flådPos); }
        const s = Math.min(1, (t - 0.5) / 1.1), D = kastFra.distanceTo(landing);
        flådPos.lerpVectors(kastFra, landing, s);
        flådPos.y += Math.sin(Math.PI * s) * (2.5 + D * 0.18);
        spinFart = 30 * (1 - s);
        if (s >= 1) {
          flådPos.y = verden.bølge(landing.x, landing.z, tid);
          verden.plask(landing, 1); Lyd.plask(1);
          afstand = startAfstand = vTmp.subVectors(landing, ANKER).dot(retning);
          bidOm = rnd(1.6, 4);
          sætFase("vent");
        }
      }
      break;
    }

    case "vent":
      if (holder) { afstand = Math.max(2.6, afstand - stangDef.spolFart * 0.55 * dt); spinFart = 14; }
      bidOm -= dt;
      flådPos.copy(ANKER).addScaledVector(retning, afstand);
      flådPos.y = verden.bølge(flådPos.x, flådPos.z, tid) + 0.02;
      bøjMål = holder ? 0.18 : 0.08;
      ringTid -= dt;
      if (holder && ringTid <= 0) { verden.ring(flådPos, 0.6); ringTid = 0.35; }
      if (bidOm < 1.4 && Math.random() < dt * 6) verden.bobler(flådPos);   // bobler: nu kommer der en fisk!
      if (bidOm <= 0 || afstand <= 5) startBid();
      break;

    case "bid": {
      const s = Math.min(1, faseTid / 0.7);
      flådPos.y = verden.bølge(flådPos.x, flådPos.z, tid) - Math.sin(Math.PI * s) * 0.35;
      bøjMål = 0.7;
      animerFisk(fisk, tid, 2);
      if (s >= 1) sætFase("kamp");
      break;
    }

    case "kamp": {
      const træk = fiskDef.styrke;
      rykTid -= dt;
      if (rykTid <= 0) {                  // fisken tager et ordentligt ryk
        ryk = 1; rykTid = Math.max(1.5, rnd(2.2, 4.5) - træk);
        verden.plask(fisk.position, 0.6); Lyd.plask(0.6);
      }
      ryk = Math.max(0, ryk - dt / 0.9);
      if (holder) {
        afstand -= stangDef.spolFart * (1 - træk * 0.5) * (1 - ryk * 0.75) * dt;
        spinFart = 16 * (1 - ryk * 0.6);
      } else {
        afstand = Math.min(startAfstand + 2, afstand + (0.5 + træk) * dt);
        spinFart = -6 * ryk;
      }
      side = Math.sin(tid * 1.5) * (0.8 + træk * 1.6) * Math.min(1, afstand / 8);
      flådPos.copy(ANKER).addScaledVector(retning, afstand).addScaledVector(vinkelret, side);
      const vy = verden.bølge(flådPos.x, flådPos.z, tid);
      flådPos.y = vy - ryk * 0.25 + Math.sin(tid * 9) * 0.03;

      // fisken svømmer lige under flåddet og hopper en gang imellem
      const fp = fisk.position;
      fp.x = flådPos.x + retning.x * 0.4; fp.z = flådPos.z + retning.z * 0.4;
      const dx = retning.x + vinkelret.x * Math.cos(tid * 1.5) * 0.6, dz = retning.z + vinkelret.z * Math.cos(tid * 1.5) * 0.6;
      let hæld = 0;
      springTid -= dt;
      if (springer < 0 && springTid <= 0 && fiskDef.spring > 0) {
        springer = 0; Lyd.plask(0.9); verden.plask(fp, 0.9);
      }
      if (springer >= 0) {
        springer += dt / 0.9;
        const s = Math.min(1, springer);
        fp.y = -0.5 + Math.sin(Math.PI * s) * (1.6 + fiskSkala * 0.5);
        hæld = Math.cos(Math.PI * s) * 0.9;
        if (springer >= 1) {
          springer = -1; springTid = rnd(2.5, 5) * (1.3 - fiskDef.spring);
          verden.plask(fp, 1); Lyd.plask(1);
        }
      } else fp.y = -0.5 + Math.sin(tid * 3) * 0.05;
      fisk.rotation.set(0, Math.atan2(-dz, dx), hæld);
      animerFisk(fisk, tid, 1.5 + ryk);

      bøjMål = 0.4 + (holder ? 0.3 : 0.1) + ryk * 0.35 + træk * 0.15;
      sideMål = THREE.MathUtils.clamp(side * 0.08, -0.25, 0.25);
      Lyd.knirk(holder ? 0.35 + ryk * 0.65 : ryk * 0.6);
      ringTid -= dt;
      if (ringTid <= 0) { verden.ring(flådPos, 0.8); ringTid = 0.3; }
      if (Math.random() < dt * 3) verden.dråber(flådPos, 3, 2);

      const v = THREE.MathUtils.clamp((startAfstand - afstand) / Math.max(1, startAfstand - 2.3), 0, 1);
      kampFyld.style.width = (v * 100).toFixed(1) + "%";
      kampFisk.style.left = `calc(${(v * 100).toFixed(1)}% - 18px)`;
      if (afstand <= 2.3) startLand();
      break;
    }

    case "land": {
      const s = Math.min(1, faseTid / 1.25), e = blød(s);
      const mål = kamera.localToWorld(VIS_POS.clone());
      fisk.position.lerpVectors(landFra, mål, e);
      fisk.position.y += Math.sin(Math.PI * s) * 2.4;
      qTmp.slerpQuaternions(landQ, qMål.copy(kamera.quaternion).multiply(qVis), e);
      qFlip.setFromAxisAngle(X_AKSE, e * Math.PI * 2);           // en flot saltomortale op af vandet
      fisk.quaternion.copy(qTmp).multiply(qFlip);
      fisk.scale.setScalar(THREE.MathUtils.lerp(fiskSkala, visSkala, e));
      animerFisk(fisk, tid, 2.5);
      if (s < 0.6 && Math.random() < 0.6) verden.dråber(fisk.position, 2, 1.5);
      bøjMål = 0.5 * (1 - e);
      if (s >= 1) {
        kamera.attach(fisk);
        fisk.position.copy(VIS_POS); fisk.quaternion.identity();
        visFangst();
      }
      break;
    }

    case "vis": {
      let drej = Math.sin(tid * 0.9) * 0.6;
      if (spinTid >= 0) {                  // tryk på fisken = den laver en snurretur
        spinTid += dt / 0.7;
        drej += blød(Math.min(1, spinTid)) * Math.PI * 2;
        if (spinTid >= 1) spinTid = -1;
      }
      fisk.rotation.set(0, drej + (fisk.userData.visDrej || 0), Math.sin(tid * 1.7) * 0.06);
      fisk.position.set(VIS_POS.x, VIS_POS.y + Math.sin(tid * 2) * 0.03, VIS_POS.z);
      animerFisk(fisk, tid, 1);
      bøjMål = 0.05;
      break;
    }

    case "sejl":                          // båden sejler (verden.js), grejet hænger stille
      bøjMål = 0.05; sving = 0;
      if (!verden.sejler) {
        nytSted = true; sætFase("klar");
        beskedEl.textContent = "Nyt fiskested! 🌊 Tryk for at kaste"; beskedEl.classList.remove("skjult");
      }
      break;

    case "spand": {
      const s = Math.min(1, faseTid / 0.9), e = blød(s);
      fisk.position.lerpVectors(landFra, verden.spandPos, e);
      fisk.position.y += Math.sin(Math.PI * s) * 0.8;
      fisk.scale.setScalar(THREE.MathUtils.lerp(visSkala, 0.1, e));
      fisk.rotateZ(dt * 8);
      if (s >= 1) {
        verden.dråber(verden.spandPos, 10, 1.6);
        verden.spandFisk(fiskDef.finne || fiskDef.farve);
        Lyd.spand();
        scene.remove(fisk); rydOp(fisk); fisk = null;
        gemt.total = (gemt.total || 0) + 1; gem();
        talEl.textContent = gemt.total;
        talEl.parentElement.classList.remove("hop"); void talEl.offsetWidth; talEl.parentElement.classList.add("hop");
        sætFase("klar");
      }
      break;
    }
  }

  // Grejet hænger fra stangens spids, når det ikke er ude i vandet
  const hænger = fase === "klar" || fase === "start" || fase === "spand" || fase === "sejl" || (fase === "kast" && !kastet) || fase === "land" || fase === "vis";
  if (hænger) {
    vTmp.set(spids.x + Math.sin(tid * 1.3) * 0.05, spids.y - 0.5, spids.z + Math.cos(tid * 1.1) * 0.04);
    flådPos.lerp(vTmp, Math.min(1, dt * 10));
  }
  return hænger;
}

function opdaterStang(dt) {
  bøjNu += (bøjMål - bøjNu) * Math.min(1, dt * 7);
  sideNu += (sideMål - sideNu) * Math.min(1, dt * 5);
  if (fase !== "kamp") sideMål = 0;
  stang.segmenter.forEach((s, i) => {
    s.rotation.x = -bøjNu * stang.vægt[i];
    s.rotation.z = -sideNu * stang.vægt[i];
  });
  // under fremvisningen læner stangen sig til siden, så fisken kan ses
  visVip += (((fase === "land" && faseTid > 0.6) || fase === "vis") - visVip) * Math.min(1, dt * 4);
  stangHolder.rotation.set(sving + Math.sin(tid * 1.4) * 0.012 + visVip * 0.2, 0, -visVip * 0.6 + Math.sin(tid * 31) * 0.012 * ryk);
  stang.sving.rotation.x += spinFart * dt;
  if (spinFart > 0) {
    klikV += spinFart * dt;
    while (klikV > 1.2) { klikV -= 1.2; Lyd.klik(ryk); }
  }
  if (fase !== "kamp") Lyd.knirk(0);
  // solstråler bag fangsten
  stråleOp += ((fase === "vis" || (fase === "land" && faseTid > 0.8)) - stråleOp) * Math.min(1, dt * 4);
  stråler.material.opacity = stråleOp * 0.9;
  mørke.material.opacity = stråleOp * 0.35;
  stråler.visible = mørke.visible = stråleOp > 0.01;
  stråler.rotation.z += dt * 0.3;
  glimmer.visible = stråleOp > 0.01;
  if (glimmer.visible) for (const m of glimmer.children) {
    const u = m.userData, a = u.a + tid * u.f;
    m.position.set(Math.cos(a) * u.r * 1.3, Math.sin(a) * u.r * 0.75, 0.15);
    m.scale.setScalar(u.s * (1 + Math.sin(tid * 6 + u.a * 3) * 0.35));
    m.rotation.z = tid * 2 + u.a;
    m.material.opacity = stråleOp;
  }
}

function opdaterGrej(hænger) {
  const spids = stang.spids.getWorldPosition(vSpids);
  flåd.position.copy(flådPos);
  flåd.scale.setScalar(Math.min(1.8, 0.45 + flådPos.distanceTo(kamera.position) * 0.05));   // lille tæt på, men til at se langt ude
  flåd.rotation.z = fase === "kast" ? faseTid * 8 : Math.sin(tid * 2) * 0.1;
  blink.position.copy(flådPos).add(vTmp.set(0, hænger ? -0.28 : -0.7, 0));
  blink.rotation.y += 0.15;

  let slut = flådPos;
  if (fisk && (fase === "land" || fase === "vis")) slut = fisk.localToWorld(vMund.copy(fisk.userData.mund));
  const slap = hænger && slut === flådPos ? 0 : fase === "vent" ? (holder ? 0.1 : 0.35) : fase === "kast" ? 0.6 : 0.05;
  tegnLine(snøre, spids, slut, slap * Math.min(1, spids.distanceTo(slut) / 6));
  forfang.visible = hænger && blink.visible;
  if (forfang.visible) tegnLine(forfang, flådPos, blink.position, 0);
}

let sidst = performance.now();
renderer.setAnimationLoop(nu => {
  const dt = Math.min(0.05, (nu - sidst) / 1000);
  sidst = nu; tid += dt; faseTid += dt;
  const vug = verden.vugge(tid);                                   // man vugger lidt på broen — og meget i båden
  kamera.position.y = verden.kamera.pos.y + vug.y;
  kamera.rotation.x = verden.kamera.rx + vug.rx * 0.9;
  kamera.rotation.z = vug.rz * 0.9;
  const hænger = opdaterFase(dt);
  opdaterStang(dt);
  verden.opdater(tid, dt);
  scene.updateMatrixWorld();
  opdaterGrej(hænger);
  renderer.render(scene, kamera);
});

// ---------- Styring: tryk = kast, hold nede = spol ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function ramt(e, obj) {
  ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, kamera);
  return ray.intersectObject(obj, true).length > 0;
}
function trykNed(e) {
  if (fase === "start") return;
  Lyd.klar();
  for (const k of verden.klikbare) if (e && ramt(e, k.obj)) { Lyd[k.lyd]?.(); k.tryk(); return; }   // and, frø og måger
  if (fase === "vis") {
    if (e && fisk && ramt(e, fisk)) { spinTid = 0; Lyd.fiskeLyd(fiskDef.lyd); }
    return;
  }
  holder = true;
  if (fase === "klar") startKast();
}
$("scene").addEventListener("pointerdown", trykNed);
window.addEventListener("pointerup", () => { holder = false; });
window.addEventListener("pointercancel", () => { holder = false; });
window.addEventListener("blur", () => { holder = false; });
window.addEventListener("keydown", e => { if ((e.code === "Space" || e.code === "Enter") && !e.repeat) { e.preventDefault(); if (fase === "vis") startSpand(); else trykNed(null); } });
window.addEventListener("keyup", e => { if (e.code === "Space" || e.code === "Enter") holder = false; });

// ---------- Overlays: start, fangstbog og stangvalg ----------
function vis(id) { $(id).classList.remove("skjult"); holder = false; }
function luk(id) { $(id).classList.add("skjult"); }
document.querySelectorAll("[data-luk]").forEach(b => b.addEventListener("click", () => { Lyd.tryk(); luk(b.dataset.luk); }));

// Små billeder af fiskene til fangstbogen — tegnes med en separat lille 3D-tegner
let miniTegner = null, miniScene, miniKamera, silhuet;
const miniCache = {};
function miniBillede(def, fanget) {
  const nøgle = def.id + (fanget ? "+" : "-");
  if (miniCache[nøgle]) return miniCache[nøgle];
  if (!miniTegner) {
    miniTegner = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    miniTegner.setSize(240, 160, false);
    miniTegner.toneMapping = THREE.ACESFilmicToneMapping;
    miniScene = new THREE.Scene();
    miniScene.add(new THREE.HemisphereLight("#ffffff", "#8899aa", 2.2));
    const l = new THREE.DirectionalLight("#ffffff", 2); l.position.set(2, 3, 4); miniScene.add(l);
    const pmrem = new THREE.PMREMGenerator(miniTegner);
    miniScene.environment = pmrem.fromScene(verden.omgivelser(), 0.03, 0.1, 1200).texture;
    pmrem.dispose();
    miniKamera = new THREE.PerspectiveCamera(35, 240 / 160, 0.1, 50);
    miniKamera.position.set(0, 0.2, 4); miniKamera.lookAt(0, 0, 0);
    silhuet = new THREE.MeshBasicMaterial({ color: "#1d3557" });
  }
  const f = byggFisk(def);
  f.scale.setScalar(Math.min(2.9 / f.userData.længde, 1.9 / f.userData.højde));
  f.rotation.y = -0.35 + (f.userData.visDrej || 0);
  miniScene.overrideMaterial = fanget ? null : silhuet;
  miniScene.add(f);
  animerFisk(f, 1.2, 1);
  miniTegner.render(miniScene, miniKamera);
  miniCache[nøgle] = miniTegner.domElement.toDataURL();
  miniScene.remove(f); rydOp(f);
  return miniCache[nøgle];
}

$("bogKnap").addEventListener("click", () => {
  Lyd.klar(); Lyd.tryk();
  const grid = $("bogGrid");
  grid.innerHTML = "";
  let fanget = 0;
  for (const f of FISKE) {
    const g = gemt.fangst[f.id];
    if (g) fanget++;
    const d = document.createElement("div");
    d.className = "bog-celle" + (g ? "" : " ukendt");
    const img = new Image(); img.src = miniBillede(f, !!g); img.alt = g ? f.navn : "Ukendt fisk";
    const navn = document.createElement("div"); navn.className = "bog-navn"; navn.textContent = g ? f.navn : "???";
    const info = document.createElement("div"); info.className = "bog-info";
    const hvor = f.sted === "hav" ? " · 🌊" : f.sted === "sø" ? " · 🏞️" : "";
    info.textContent = (g ? `×${g.antal} · største ${g.størst} cm` : stjerner(f)) + hvor;
    d.append(img, navn, info);
    grid.appendChild(d);
  }
  $("bogTal").textContent = `Du har fanget ${fanget} af ${FISKE.length} slags`;
  vis("bog");
});

const niveau = (v, lav, høj) => Math.max(1, Math.min(3, 1 + Math.round((v - lav) / (høj - lav) * 2)));
$("stangKnap").addEventListener("click", () => {
  Lyd.klar(); Lyd.tryk();
  const grid = $("stangGrid");
  grid.innerHTML = "";
  for (const s of STÆNGER) {
    const b = document.createElement("button");
    b.className = "stang-kort" + (s.id === stangDef.id ? " valgt" : "");
    const farver = s.farver.length > 1 ? s.farver : [s.farver[0], s.farver[0]];
    const stribe = document.createElement("div"); stribe.className = "stang-farve";
    stribe.style.background = `linear-gradient(90deg, ${farver.join(", ")})`;
    const navn = document.createElement("div"); navn.className = "stang-navn"; navn.textContent = s.navn;
    const evner = document.createElement("div"); evner.className = "stang-evner";
    evner.textContent = `Spol ${"⚡".repeat(niveau(s.spolFart, 4, 5.5))}
Kast ${"🎯".repeat(niveau(s.kast, 18, 26))}
Held ${"🍀".repeat(niveau(s.held, 1, 3))}`;
    const tekst = document.createElement("div"); tekst.className = "stang-tekst"; tekst.textContent = s.tekst || "";
    b.append(stribe, navn, evner, tekst);
    b.addEventListener("click", () => {
      skiftStang(s); Lyd.spand();
      const r = b.getBoundingClientRect();
      E.konfetti(r.left + r.width / 2, r.top + r.height / 2, { antal: 30, farver: s.farver });
      setTimeout(() => luk("staenger"), 350);
    });
    grid.appendChild(b);
  }
  vis("staenger");
});

// ---------- Sejl videre (kun på havet) ----------
sejlKnap.addEventListener("click", () => {
  Lyd.klar();
  if (fase !== "klar" || !verden.sejl()) return;
  Lyd.tryk(); sætFase("sejl");
});

// ---------- Startskærmen: vælg søen eller havet ----------
$("startKnap").classList.add("skjult");
function begynd() {
  Lyd.klar();
  try { if ("speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch (_) {}
  luk("start");
  Lyd.tryk();
  if (fase === "start") sætFase("klar");
}
document.querySelectorAll(".bane-kort").forEach(k => {
  k.disabled = false;
  k.classList.toggle("valgt", k.dataset.bane === BANE);
  k.addEventListener("click", () => {
    if (k.dataset.bane === BANE) { begynd(); return; }
    try { localStorage.setItem(BANE_GEM, k.dataset.bane); sessionStorage.setItem("fisk-start", "1"); } catch (_) {}
    location.reload();                                  // byg det andet sted
  });
});
$("stedKnap").addEventListener("click", () => { Lyd.klar(); Lyd.tryk(); vis("start"); });
sætFase("start");
let direkte = false;                                     // lige skiftet sted: spring startskærmen over
try { direkte = sessionStorage.getItem("fisk-start") === "1"; sessionStorage.removeItem("fisk-start"); } catch (_) {}
if (direkte) { luk("start"); sætFase("klar"); }
window.fiskKlar = true;
if (location.search.includes("debug")) window.fisk = { verden, scene, kamera };   // til afprøvning
