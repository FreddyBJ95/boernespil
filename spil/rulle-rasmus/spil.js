// ===== Rulle Rasmus — styr blobben gennem banen =====
// Vip iPad'en, eller tryk på skærmen der hvor Rasmus skal trille hen. Hold ham på banen,
// saml stjerner og frugt, og nå i mål. Falder han af, hopper han op igen ved det sidste flag.
//
// Filerne:  baner.js (banerne) · temaer.js (hvordan de ser ud) · blob.js (Rasmus og hans farver)
//           bane.js (vejen og 3D-modellen) · ting.js (stjerner, flag, mål …) · verden.js (himmel, vand, pynt)
//           lyd.js (lyde og musik) · partikler.js (gnister og konfetti) · teksturer.js (billeder tegnet med kode)
// ?debug giver adgang til spillet i konsollen (rr), og ?bane=is starter direkte på en bane.

import * as THREE from "./three.js";
import { Bane, lavModel } from "./bane.js";
import { BANER } from "./baner.js";
import { lavTema } from "./temaer.js";
import { byggVerden } from "./verden.js";
import { byggTing } from "./ting.js";
import { Blob, SKINS, R } from "./blob.js";
import { Partikler, Brikker } from "./partikler.js";
import * as T from "./teksturer.js";
import * as Lyd from "./lyd.js";

const E = window.Effekter;
const $ = id => document.getElementById(id);
const URL_P = new URLSearchParams(location.search);

// ---------- Gemt fremskridt (kun på denne enhed) ----------
const GEM = "rulle-rasmus-v1";
const gemt = { skin: "blaa", vip: true, musik: true, bane: "engen", bedst: {}, klaret: {} };
try { Object.assign(gemt, JSON.parse(localStorage.getItem(GEM)) || {}); } catch (_) {}
const gem = () => { try { localStorage.setItem(GEM, JSON.stringify(gemt)); } catch (_) {} };

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
let pixelTæthed = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelTæthed);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
T.sætAnisotropi(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1600);
scene.add(kamera);

const fx = {
  glød: new Partikler(scene, { maks: 900, tekstur: T.glimt(), additiv: true }),
  flamme: new Partikler(scene, { maks: 420, tekstur: T.flamme(), additiv: true, vend: true }),
  prikker: new Partikler(scene, { maks: 320, tekstur: T.prik() }),
  sky: new Partikler(scene, { maks: 60, tekstur: T.skyklat(80) }),
  brikker: new Brikker(scene, { maks: 120, geo: new THREE.BoxGeometry(1, 1, 1), mat: new THREE.MeshStandardMaterial({ roughness: 0.9 }) }),
  konfetti: new Brikker(scene, { maks: 260, geo: new THREE.PlaneGeometry(1, 0.6), mat: new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }) }),
};
const rasmus = new Blob(scene, fx);
rasmus.sætSkin(gemt.skin);

// En ring i vandet, når Rasmus plasker ned
const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }));
scene.add(ring);
let ringT = 9;

// Mål billedfladen (ikke vinduet), så billedet aldrig bliver strakt — heller ikke når iPad'en vendes
function størrelse() {
  const el = renderer.domElement, w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.fov = w / h < 1 ? 72 : 58;
  kamera.updateProjectionMatrix();
  const hp = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
  for (const p of Object.values(fx)) p.skala?.(hp, kamera.fov);
  ting?.skala(hp / (2 * Math.tan(kamera.fov * Math.PI / 360)));
}
E.vedStørrelse(størrelse);

// Hvis iPad'en har svært ved at følge med, tegnes billedet med lidt færre pixels
let fpsT = 0, fpsN = 0, dårlige = 0;
function kvalitet(dt) {
  fpsT += dt; fpsN++;
  if (fpsT < 2) return;
  const snit = fpsT / fpsN;
  fpsT = 0; fpsN = 0;
  if (snit > 0.026 && pixelTæthed > 1) {
    if (++dårlige >= 2) { pixelTæthed = Math.max(1, pixelTæthed - 0.25); renderer.setPixelRatio(pixelTæthed); størrelse(); dårlige = 0; }
  } else dårlige = 0;
}

// ---------- Banen ----------
let baneDef = null, bane = null, tema = null, verden = null, ting = null;
const sp = {
  pos: new THREE.Vector3(), v: new THREE.Vector3(), påJorden: true, i: 0,
  tilstand: "menu",                                    // menu · spil · falder · væk · mål
  flag: 0, stjerner: 0, frugt: 0, boost: 0, faldT: 0, stilleT: 0, hopOm: 3, målT: 0, rørt: false,
};

function indlæs(id) {
  if (verden) verden.fjern();
  for (const p of Object.values(fx)) p.ryd();
  baneDef = BANER.find(b => b.id === id) || BANER[0];
  gemt.bane = baneDef.id; gem();
  tema = lavTema(baneDef.tema);
  bane = new Bane(baneDef);
  verden = byggVerden(scene, renderer, bane, tema);
  verden.gruppe.add(lavModel(bane, tema));
  ting = byggTing(verden.gruppe, bane, tema, fx);
  størrelse();
  Lyd.musik(tema.musik);
  sp.flag = 0; sp.stjerner = 0; sp.frugt = 0; sp.boost = 0; sp.tilstand = "menu"; sp.stilleT = 0;
  rasmus.størrelseMål = 1; rasmus.visMål = 1;
  placér(0);
  kamYaw = yawFra(bane.retning(0, 8));
  kamPos.set(sp.pos.x, sp.pos.y + 3, sp.pos.z + 6);
  $("stjerneTal").textContent = "0";
  lavFremskridt();
}

// Sæt Rasmus ved et flag (løft = hvor højt oppe han dukker op)
function placér(flagNr, løft = 0) {
  const i = bane.flag[flagNr], p = bane.P[i], frem = flagNr === 0 ? 4 : 0.8;
  sp.pos.set(p.x + p.fx * frem, p.y + R + løft, p.z + p.fz * frem);
  sp.v.set(0, 0, 0);
  sp.påJorden = løft === 0;
  sp.i = bane.nærmest(sp.pos.x, sp.pos.y, sp.pos.z, i, 20);
}

// ---------- Styring: vip, finger og piletaster ----------
const styr = { finger: null, taster: new Set(), vip: { har: false, x: 0, y: 0, x0: 0, y0: 0, kalibrer: true } };

function skærmVinkel() {
  const a = screen.orientation && typeof screen.orientation.angle === "number" ? screen.orientation.angle
    : typeof window.orientation === "number" ? window.orientation : 0;
  return ((a % 360) + 360) % 360;
}
// Tyngdekraften regnes ud i skærmens retninger (sx: mod højre, sy: mod toppen), så det virker på
// højkant og på langs, og uden hop når iPad'en holdes næsten lodret
window.addEventListener("deviceorientation", e => {
  if (e.beta == null || e.gamma == null) return;
  const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
  const gx = Math.sin(g) * Math.cos(b), gy = -Math.sin(b), a = skærmVinkel() * Math.PI / 180;
  const v = styr.vip;
  v.x = Math.cos(a) * gx - Math.sin(a) * gy;
  v.y = Math.sin(a) * gx + Math.cos(a) * gy;
  if (!v.har || v.kalibrer) { v.x0 = v.x; v.y0 = v.y; v.kalibrer = false; }
  v.har = true;
});
function kalibrer() { styr.vip.kalibrer = true; }

async function bedOmVip() {
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      return (await DeviceOrientationEvent.requestPermission()) === "granted";
    }
  } catch (_) { return false; }
  return true;
}

const canvas = renderer.domElement;
canvas.addEventListener("pointerdown", e => {
  Lyd.klar();
  styr.finger = { x: e.clientX, y: e.clientY, id: e.pointerId };
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener("pointermove", e => { if (styr.finger && styr.finger.id === e.pointerId) { styr.finger.x = e.clientX; styr.finger.y = e.clientY; } });
const slip = e => { if (styr.finger && styr.finger.id === e.pointerId) styr.finger = null; };
canvas.addEventListener("pointerup", slip);
canvas.addEventListener("pointercancel", slip);
const TAST = { ArrowUp: "op", w: "op", W: "op", ArrowDown: "ned", s: "ned", S: "ned", ArrowLeft: "v", a: "v", A: "v", ArrowRight: "h", d: "h", D: "h" };
addEventListener("keydown", e => { if (TAST[e.key]) { styr.taster.add(TAST[e.key]); e.preventDefault(); Lyd.klar(); } });
addEventListener("keyup", e => styr.taster.delete(TAST[e.key]));
addEventListener("blur", () => { styr.taster.clear(); styr.finger = null; });

const stråle = new THREE.Raycaster(), gulv = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ramt = new THREE.Vector3();
const kamFrem = new THREE.Vector3(), kamHøjre = new THREE.Vector3();

// Giver en retning i verden (x, z) med styrke 0–1, og hvor meget der vippes (til kameraet)
function styring() {
  kamera.getWorldDirection(kamFrem); kamFrem.y = 0; kamFrem.normalize();
  kamHøjre.set(-kamFrem.z, 0, kamFrem.x);
  let ix = 0, iy = 0;
  if (styr.auto) {                                       // afprøvning (?debug): kør selv mod midten af banen længere fremme
    const j = Math.min(bane.P.length - 1, sp.i + 16), pu = bane.puder.find(pu => pu.i > sp.i - 4 && pu.i < sp.i + 30);
    const p = bane.punktPå(j, pu ? (bane.flade(pu.x, pu.z, pu.i).u > 0 ? -1.9 : 1.9) : 0, 0);
    const dx = p.x - sp.pos.x, dz = p.z - sp.pos.z, d = Math.hypot(dx, dz) || 1;
    return { x: dx / d * styr.auto, z: dz / d * styr.auto, ix: 0, iy: 1 };
  }
  // fingeren: Rasmus triller hen mod det sted på banen, man trykker
  if (styr.finger) {
    const w = canvas.clientWidth, h = canvas.clientHeight, r = canvas.getBoundingClientRect();
    const nx = (styr.finger.x - r.left) / w * 2 - 1, ny = -((styr.finger.y - r.top) / h) * 2 + 1;
    stråle.setFromCamera({ x: nx, y: ny }, kamera);
    gulv.constant = -(sp.pos.y - R);
    if (stråle.ray.intersectPlane(gulv, ramt) && ramt.distanceTo(kamera.position) < 80) {
      const dx = ramt.x - sp.pos.x, dz = ramt.z - sp.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.35) return { x: 0, z: 0, ix: 0, iy: 0 };
      const k = Math.max(0.55, Math.min(1, d / 2.5)) / d;          // selv et lille tryk tæt på ham giver fart
      const x = dx * k, z = dz * k;
      return { x, z, ix: x * kamHøjre.x + z * kamHøjre.z, iy: x * kamFrem.x + z * kamFrem.z };
    }
    ix = nx; iy = 1;
  } else if (styr.taster.size) {
    ix = (styr.taster.has("h") ? 1 : 0) - (styr.taster.has("v") ? 1 : 0);
    iy = (styr.taster.has("op") ? 1 : 0) - (styr.taster.has("ned") ? 1 : 0);
  } else if (gemt.vip && styr.vip.har) {
    const v = styr.vip, død = 0.035, fuld = 0.3;
    const blød = d => Math.abs(d) < død ? 0 : Math.sign(d) * Math.min(1, 0.3 + 0.7 * (Math.abs(d) - død) / (fuld - død));   // et lille vip giver straks lidt fart
    ix = blød(v.x - v.x0); iy = blød(v.y - v.y0);
  }
  const l = Math.hypot(ix, iy);
  if (l > 1) { ix /= l; iy /= l; }
  return { x: kamHøjre.x * ix + kamFrem.x * iy, z: kamHøjre.z * ix + kamFrem.z * iy, ix, iy };
}

// ---------- Fysik ----------
const G = 20, ACC = 14, MAKS = 10.5;

function trin(dt, inp) {
  const p = sp.pos, v = sp.v, spiller = sp.tilstand === "spil";
  sp.i = bane.nærmest(p.x, p.y, p.z, sp.i);
  const pt = bane.P[sp.i];

  // styring og hældning (tyngdekraften trækker ned ad bakke og ind mod midten af renden)
  let ax = 0, az = 0;
  if (spiller) {
    const greb = sp.påJorden ? (pt.is ? 0.5 : 1) : 0.5;
    ax = inp.x * ACC * greb; az = inp.z * ACC * greb;
  }
  if (sp.påJorden) {
    const e = 0.06, h0 = bane.højde(p.x, p.z, sp.i), hx = bane.højde(p.x + e, p.z, sp.i), hz = bane.højde(p.x, p.z + e, sp.i);
    if (h0 != null && hx != null && hz != null) {
      const gx = (hx - h0) / e, gz = (hz - h0) / e, n = 1 + gx * gx + gz * gz;
      ax -= G * gx / n; az -= G * gz / n;
    }
  }
  v.x += ax * dt; v.z += az * dt;

  // bremse: på græs stopper han hurtigt, når man slipper — på is glider han videre
  const styrer = Math.hypot(inp.x, inp.z) > 0.1;
  const bremse = !sp.påJorden ? 0.05 : pt.is ? 0.25 : (!styrer || !spiller) ? 1.8 : 0.6;
  const k = Math.exp(-bremse * dt);
  v.x *= k; v.z *= k;
  const vh = Math.hypot(v.x, v.z), maks = MAKS * (baneDef.fart ?? 1) * (sp.boost > 0 ? 1.45 : 1);
  if (vh > maks) { const f = Math.max(maks / vh, Math.exp(-3 * dt)); v.x *= f; v.z *= f; }

  const fx0 = p.x, fz0 = p.z, gammelY = p.y;
  p.x += v.x * dt; p.z += v.z * dt;
  kanter();

  // op og ned: følg banen, flyv af den, eller land på den
  const f = bane.flade(p.x, p.z, sp.i);
  let støtte = f.fast && Math.abs(f.u) <= f.halv + 0.12 ? f.h : null;
  if (støtte != null && p.y - R < støtte - 0.35) {       // ind i siden af banen: prel af
    p.x = fx0; p.z = fz0; v.x *= -0.2; v.z *= -0.2; støtte = null;
  }
  if (støtte != null && Math.abs(f.u) > f.halv) {         // helt ude på kanten: han tipper ud over
    v.x += f.p.rx * Math.sign(f.u) * 5 * dt; v.z += f.p.rz * Math.sign(f.u) * 5 * dt;
  }
  if (sp.påJorden) {
    if (støtte == null) sp.påJorden = false;
    else {
      const målY = støtte + R, nyVy = (målY - p.y) / dt;
      if (nyVy < v.y - G * dt * 1.25 && målY < p.y) sp.påJorden = false;
      else { v.y = Math.min(nyVy, 9); p.y = målY; }        // et pludseligt trin kan aldrig skyde ham til vejrs
    }
  }
  if (!sp.påJorden) {
    v.y -= G * dt;
    p.y += v.y * dt;
    if (støtte != null && p.y - R <= støtte && gammelY - R >= støtte - 0.4 && sp.tilstand !== "falder") {
      const stød = -v.y;
      p.y = støtte + R; v.y = 0; sp.påJorden = true;
      if (stød > 2.2) { rasmus.land(stød); Lyd.land(stød, rasmus.skin.mønster || 0); }
    }
  }

  // puder, trampoliner og fartfelter
  bane.puder.forEach((pu, n) => {
    const dx = p.x - pu.x, dz = p.z - pu.z, d = Math.hypot(dx, dz) || 0.001, min = pu.r + R * 0.9;
    if (d < min && Math.abs(p.y - (pu.y + 0.5)) < 1.2) {
      const nx = dx / d, nz = dz / d, vn = v.x * nx + v.z * nz;
      p.x = pu.x + nx * min; p.z = pu.z + nz * min;
      if (vn < 0.5) {
        const ud = Math.max(4.5, -vn * 1.1);
        v.x += nx * (ud - vn); v.z += nz * (ud - vn);
        if (sp.påJorden) { sp.påJorden = false; v.y = 3.5; }
        rasmus.stød(1); ting.stød(n); Lyd.boing();
      }
    }
  });
  if (spiller && sp.påJorden) {
    const fl = bane.flade(p.x, p.z, sp.i), q = fl.p;
    if (q.tramp && Math.abs(fl.u) < fl.halv) {
      v.y = 12.5; sp.påJorden = false;
      const vf = v.x * q.fx + v.z * q.fz;
      if (vf < 7) { v.x += q.fx * (7 - vf); v.z += q.fz * (7 - vf); }
      rasmus.hop(); rasmus.glad(1.5); Lyd.trampolin();
      let bedst = 0;
      bane.trampoliner.forEach((tr, n) => { if (Math.abs(tr.i - sp.i) < Math.abs(bane.trampoliner[bedst].i - sp.i)) bedst = n; });
      ting.hop(bedst);
    }
    if (q.fart && Math.abs(fl.u) < 1.4 && sp.boost < 1) {
      sp.boost = 1.8;
      const vf = v.x * q.fx + v.z * q.fz;
      if (vf < 13) { v.x += q.fx * (13 - vf); v.z += q.fz * (13 - vf); }
      rasmus.glad(1.5); Lyd.fart();
    }
  }
  // hjælp i luften over et hul: styr blidt mod midten, og hold farten fremad
  if (spiller && !sp.påJorden && !pt.fast) {
    const fl = bane.flade(p.x, p.z, sp.i), q = fl.p, a = Math.min(1, 3 * dt);
    const vl = v.x * q.rx + v.z * q.rz, målL = -fl.u * 1.2;
    v.x += q.rx * (målL - vl) * a; v.z += q.rz * (målL - vl) * a;
    const vf = v.x * q.fx + v.z * q.fz;
    if (vf < 7.2) { v.x += q.fx * (7.2 - vf) * a; v.z += q.fz * (7.2 - vf) * a; }
  }
}

// Rækværk på siderne, og vægge bag starten og for enden af målet
function kanter() {
  const p = sp.pos, v = sp.v, f = bane.flade(p.x, p.z, sp.i), pt = f.p, sidste = bane.P.length - 1;
  if ((f.i === 0 && f.a < 0) || (f.i === sidste && f.a > 0)) {
    p.x -= pt.fx * f.a; p.z -= pt.fz * f.a;
    const vf = v.x * pt.fx + v.z * pt.fz;
    if (vf * f.a > 0) { v.x -= pt.fx * vf * 1.4; v.z -= pt.fz * vf * 1.4; }
  }
  if (pt.kant && pt.fast && p.y < f.midtY + 1.6) {
    const grænse = f.halv - R * 0.85, au = Math.abs(f.u);
    if (au > grænse && au < f.halv + 0.8) {
      const s = Math.sign(f.u), ind = au - grænse;
      p.x -= pt.rx * s * ind; p.z -= pt.rz * s * ind;
      const vl = v.x * pt.rx + v.z * pt.rz;
      if (vl * s > 0) {
        v.x -= pt.rx * vl * 1.45; v.z -= pt.rz * vl * 1.45;
        if (Math.abs(vl) > 3) { Lyd.bonk(Math.min(1, Math.abs(vl) / 8)); rasmus.stød(0.4); }
      }
    }
  }
}

// ---------- Hvad sker der? (stjerner, flag, fald og mål) ----------
function efterTrin(dt) {
  const p = sp.pos;
  sp.boost = Math.max(0, sp.boost - dt);
  if (sp.tilstand === "spil" || sp.tilstand === "mål") {
    const n = ting.samlStjerner(p, R * rasmus.størrelse);
    for (let k = 0; k < n; k++) setTimeout(Lyd.stjerne, k * 60);
    if (n) {
      sp.stjerner += n; rasmus.glad(0.8);
      $("stjerneTal").textContent = sp.stjerner;
      const t = $("stjerner"); t.classList.remove("hop"); void t.offsetWidth; t.classList.add("hop");
    }
    const frugt = ting.samlFrugt(p, R * rasmus.størrelse);
    if (frugt) {
      sp.frugt++; rasmus.størrelseMål = Math.min(1.3, 1 + sp.frugt * 0.1);
      rasmus.glad(2); rasmus.hop(); Lyd.nam();
    }
  }
  if (sp.tilstand === "spil") {
    // nye flag
    for (let k = sp.flag + 1; k < bane.flag.length; k++) {
      if (sp.i >= bane.flag[k] && sp.påJorden) {
        sp.flag = k;
        if (ting.nåFlag(bane.flag[k])) { Lyd.flag(); rasmus.glad(1.5); }
      }
    }
    opdaterFremskridt();
    // i mål!
    if (sp.i >= bane.målI) { iMål(); return; }
    // falder han af?
    const f = bane.flade(p.x, p.z, sp.i);
    if (!sp.påJorden && p.y < f.midtY - 1.3 && (Math.abs(f.u) > f.halv || !f.fast)) {
      sp.tilstand = "falder"; sp.faldT = 0; Lyd.fald();
    }
    // står han stille, kigger han på os
    sp.stilleT = Math.hypot(sp.v.x, sp.v.z) < 0.3 ? sp.stilleT + dt : 0;
  }
  if (sp.tilstand === "falder") {
    sp.faldT += dt;
    sp.v.x *= Math.exp(-dt * 0.8); sp.v.z *= Math.exp(-dt * 0.8);
    const bund = verden.bund;
    if (p.y < bund + 0.3 || sp.faldT > 3) plask(bund);
  }
  if (sp.tilstand === "væk") {
    sp.faldT += dt;
    if (sp.faldT > 1.1) { sp.tilstand = "spil"; placér(sp.flag, 2.6); rasmus.dukOp(); Lyd.dukOp(); }
  }
  if (sp.tilstand === "menu") {                         // i menuen hopper han glad en gang imellem
    sp.hopOm -= dt;
    if (sp.hopOm <= 0 && sp.påJorden) { sp.v.y = 5; sp.påJorden = false; rasmus.hop(); sp.hopOm = 2.5 + Math.random() * 3; }
  }
  if (sp.tilstand === "mål") {
    sp.målT += dt;
    sp.hopOm -= dt;
    if (sp.hopOm <= 0 && sp.påJorden) { sp.v.y = 6; sp.påJorden = false; rasmus.hop(); Lyd.hop(); sp.hopOm = 0.9; }
  }
}

// Ned i vandet (eller skyerne): plask, og så op ved det sidste flag
function plask(bund) {
  const p = sp.pos;
  sp.tilstand = "væk"; sp.faldT = 0;
  rasmus.forsvind();
  if (tema.under.type === "vand") {
    Lyd.plask();
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * 6.28, v = 1 + Math.random() * 3;
      fx.prikker.udsend({ x: p.x, y: bund + 0.1, z: p.z, vx: Math.cos(a) * v, vy: 4 + Math.random() * 5, vz: Math.sin(a) * v, liv: 1.2, str: 0.14 + Math.random() * 0.1, strSlut: 0.04, farve: "#eaf8ff", tyngde: 16 });
    }
    ring.position.set(p.x, bund + 0.05, p.z); ringT = 0;
  } else {
    Lyd.puf();
    for (let k = 0; k < 14; k++) {
      const a = Math.random() * 6.28, v = 1 + Math.random() * 2;
      fx.sky.udsend({ x: p.x, y: bund + 1, z: p.z, vx: Math.cos(a) * v, vy: 0.5 + Math.random(), vz: Math.sin(a) * v, liv: 1.6, str: 2.5, strSlut: 4.5, farve: "#ffffff", alfa: 0.9, modstand: 1.5 });
    }
  }
}

function iMål() {
  sp.tilstand = "mål"; sp.målT = 0; sp.hopOm = 0.6;
  Lyd.mål();
  ting.fejr(Lyd.fyrværkeri);
  E.fest(innerWidth / 2, innerHeight * 0.35);
  rasmus.glad(8);
  målYaw = kamYaw;
  const id = baneDef.id;
  gemt.klaret[id] = true;
  gemt.bedst[id] = Math.max(gemt.bedst[id] || 0, sp.stjerner);
  gem();
  opdaterFremskridt(1);
  setTimeout(() => sig("Godt klaret! Rasmus kom i mål."), 700);
  setTimeout(visMålKort, 2600);
}

// ---------- Kameraet ----------
let kamYaw = 0, målYaw = 0;
const kamPos = new THREE.Vector3(), kamMål = new THREE.Vector3(), kigPå = new THREE.Vector3(), kigGlat = new THREE.Vector3();
const yawFra = ([fx, fz]) => Math.atan2(fx, -fz);
const vinkelMod = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
let rul = 0;

function opdaterKamera(dt, inp, tid) {
  const p = sp.pos;
  if (sp.tilstand === "menu") {
    // foran Rasmus, lidt fra siden, og svajer langsomt — Rasmus står øverst i billedet over menuen
    const yaw = yawFra(bane.retning(0, 8)) + Math.PI + Math.sin(tid * 0.3) * 0.45, smal = kamera.aspect < 0.75;
    kamMål.set(p.x + Math.sin(yaw) * (smal ? 4.2 : 3.4), p.y + (smal ? 0.5 : 0.9), p.z - Math.cos(yaw) * (smal ? 4.2 : 3.4));
    kigPå.set(p.x, p.y - (smal ? 1.9 : 0.55), p.z);
  } else if (sp.tilstand === "mål") {
    const yaw = målYaw - 0.5 + Math.sin(sp.målT * 0.4) * 0.5;   // foran Rasmus, med ballonbuen bag ham
    kamMål.set(p.x + Math.sin(yaw) * 5.2, p.y + 1.8, p.z - Math.cos(yaw) * 5.2);
    kigPå.set(p.x, p.y + 0.4, p.z);
  } else {
    kamYaw = vinkelMod(kamYaw, yawFra(bane.retning(sp.i, 14)), Math.min(1, dt * 2.5));
    const fx = Math.sin(kamYaw), fz = -Math.cos(kamYaw), vh = Math.min(12, Math.hypot(sp.v.x, sp.v.z));
    const afst = 6.8 + vh * 0.2, høj = 3.3 + vh * 0.07;
    if (sp.tilstand === "spil") {
      const ly = sp.påJorden ? p.y : Math.max(p.y, bane.P[sp.i].y + R);
      kamMål.set(p.x - fx * afst, ly + høj, p.z - fz * afst);
    }
    kigPå.set(p.x + fx * 2.4, (sp.tilstand === "spil" ? p.y : Math.max(p.y, verden.bund + 1)) + 0.3, p.z + fz * 2.4);
  }
  const k = 1 - Math.exp(-dt * (sp.tilstand === "menu" ? 2.5 : 5));
  kamPos.lerp(kamMål, k);
  kigGlat.lerp(kigPå, 1 - Math.exp(-dt * 8));
  kamera.position.copy(kamPos);
  kamera.lookAt(kigGlat);
  rul += ((sp.tilstand === "spil" ? -inp.ix * 0.05 : 0) - rul) * Math.min(1, dt * 5);   // billedet vipper lidt med
  kamera.rotateZ(rul);
}

// ---------- Hver frame ----------
let sidst = performance.now(), tid = 0;
const tomInp = { x: 0, z: 0, ix: 0, iy: 0 };
function løkke(nu) {
  requestAnimationFrame(løkke);
  const dt = Math.min(0.05, Math.max(0, (nu - sidst) / 1000));
  sidst = nu;
  kvalitet(dt);
  opdater(dt);
}
function opdater(dt, tegn = true) {
  tid += dt;
  if (!bane) return;
  const inp = sp.tilstand === "spil" ? styring() : tomInp;
  if (sp.tilstand === "spil" && (Math.abs(inp.x) + Math.abs(inp.z)) > 0.2 && !sp.rørt) { sp.rørt = true; skjulBesked(); }
  if (sp.tilstand !== "væk") {
    const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n;
    for (let k = 0; k < n; k++) trin(h, inp);
  }
  efterTrin(dt);
  const kigMod = sp.tilstand === "menu" || sp.tilstand === "mål" || sp.stilleT > 1.2 ? kamera.position : null;
  rasmus.opdater(dt, {
    pos: sp.pos, fart: sp.v, påJorden: sp.påJorden, kigPå: kigMod, kamera: kamera.position,
    stemning: sp.tilstand === "falder" ? "bange" : sp.tilstand === "mål" ? "glad" : null,
  });
  Lyd.rul(Math.hypot(sp.v.x, sp.v.z), sp.påJorden && sp.tilstand !== "væk", tema.underlag);
  opdaterKamera(dt, inp, tid);
  verden.opdater(tid, dt, sp.tilstand === "væk" || sp.tilstand === "falder" ? bane.P[bane.flag[sp.flag]] : sp.pos, kamera.position);
  ting.opdater(tid, dt);
  for (const p of Object.values(fx)) p.opdater(dt);
  ringT += dt;
  ring.material.opacity = ringT < 1.2 ? (1 - ringT / 1.2) * 0.8 : 0;
  ring.scale.setScalar(0.5 + ringT * 3);
  if (tegn) renderer.render(scene, kamera);
}

// ---------- Skærmene: menu, spil og mål ----------
function lavSkins() {
  const liste = $("skins");
  liste.innerHTML = "";
  for (const s of SKINS) {
    const b = document.createElement("button");
    b.className = "skin" + (s.ikon ? " saerlig" : "");
    b.dataset.skin = s.id;
    b.setAttribute("aria-label", s.navn);
    b.style.setProperty("--farve", s.farve);
    if (s.ikon) b.innerHTML = `<span>${s.ikon}</span>`;
    b.addEventListener("click", () => vælgSkin(s.id));
    liste.appendChild(b);
  }
  markérSkin();
}
function markérSkin() {
  document.querySelectorAll(".skin").forEach(b => b.classList.toggle("valgt", b.dataset.skin === gemt.skin));
  const s = SKINS.find(s => s.id === gemt.skin) || SKINS[0];
  $("skinNavn").textContent = s.ikon ? `${s.ikon} ${s.navn}` : s.navn;
  document.documentElement.style.setProperty("--rasmus", s.farve);
}
function vælgSkin(id) {
  Lyd.klar();
  gemt.skin = id; gem();
  rasmus.sætSkin(id);
  markérSkin();
  Lyd.vælg(rasmus.skin.mønster || 0);
  if (sp.påJorden) { sp.v.y = 5.5; sp.påJorden = false; }
  rasmus.hop(); rasmus.glad(1.5);
  const p = sp.pos;
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * 6.28;
    fx.glød.udsend({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * 3, vy: 1 + Math.random() * 3, vz: Math.sin(a) * 3, liv: 0.9, str: 0.3, strSlut: 0.02, farve: rasmus.glimtFarve(k), modstand: 2 });
  }
}

function lavBaner() {
  const liste = $("baner");
  liste.innerHTML = "";
  for (const b of BANER) {
    const k = document.createElement("button");
    k.className = "bane-kort";
    k.dataset.bane = b.id;
    const bedst = gemt.bedst[b.id];
    k.innerHTML = `<span class="bane-ikon">${b.ikon}</span><b>${b.navn}</b>` +
      `<small>${gemt.klaret[b.id] ? `🏆 ⭐ ${bedst || 0}` : "&nbsp;"}</small>`;
    k.addEventListener("click", () => startBane(b.id));
    liste.appendChild(k);
  }
}

async function startBane(id) {
  Lyd.klar();
  const vip = gemt.vip ? bedOmVip() : Promise.resolve(false);   // spørg om lov straks (iPad vil have det i selve trykket)
  if (!baneDef || id !== baneDef.id || sp.tilstand !== "menu") indlæs(id);
  rasmus.vis = rasmus.visMål = 1;
  if (gemt.vip && !(await vip)) { gemt.vip = false; gem(); }
  opdaterStyreKnap();
  kalibrer();
  $("menu").classList.add("skjult");
  $("hud").classList.remove("skjult");
  $("maalKort").classList.add("skjult");
  sp.tilstand = "spil"; sp.rørt = false; sp.stilleT = 0;
  sig(baneDef.navn);
  visBesked(styr.vip.har && gemt.vip ? "📱 Vip iPad'en — eller tryk der, hvor Rasmus skal hen 👆" : "👆 Tryk der, hvor Rasmus skal hen");
}

function tilMenu() {
  Lyd.klar();
  indlæs(baneDef.id);
  sp.tilstand = "menu"; sp.hopOm = 1.5;
  lavBaner();
  $("menu").classList.remove("skjult");
  $("hud").classList.add("skjult");
  $("maalKort").classList.add("skjult");
  skjulBesked();
}

function visMålKort() {
  if (sp.tilstand !== "mål") return;
  const n = ting.antalStjerner, andel = n ? sp.stjerner / n : 1;
  const store = 1 + (andel >= 0.5 ? 1 : 0) + (andel >= 0.85 ? 1 : 0);
  $("maalStjerner").innerHTML = [0, 1, 2].map(i => `<span class="${i < store ? "fuld" : ""}" style="animation-delay:${0.2 + i * 0.25}s">⭐</span>`).join("");
  $("maalTal").textContent = `${sp.stjerner} af ${n} stjerner`;
  const i = BANER.findIndex(b => b.id === baneDef.id);
  $("naeste").classList.toggle("skjult", i >= BANER.length - 1);
  $("maalKort").classList.remove("skjult");
}

// Fremskridt øverst: Rasmus på vej mod målflaget
function lavFremskridt() {
  const bar = $("fremBar");
  bar.querySelectorAll(".frem-flag").forEach(e => e.remove());
  const slut = bane.P[bane.målI].s;
  for (const i of bane.flag.slice(1)) {
    const e = document.createElement("span");
    e.className = "frem-flag"; e.style.left = `${bane.P[i].s / slut * 100}%`;
    bar.appendChild(e);
  }
  opdaterFremskridt(0);
}
function opdaterFremskridt(v) {
  const andel = v ?? Math.min(1, bane.P[sp.i].s / bane.P[bane.målI].s);
  $("fremFyld").style.width = `${andel * 100}%`;
  $("fremRasmus").style.left = `${andel * 100}%`;
}

let beskedTimer = 0;
function visBesked(tekst) {
  const b = $("besked");
  b.textContent = tekst; b.classList.remove("skjult");
  clearTimeout(beskedTimer); beskedTimer = setTimeout(skjulBesked, 6000);
}
function skjulBesked() { $("besked").classList.add("skjult"); }

function opdaterStyreKnap() {
  const k = $("styreKnap");
  k.textContent = gemt.vip ? "📱" : "👆";
  k.setAttribute("aria-label", gemt.vip ? "Styr ved at vippe (tryk for kun finger)" : "Styr med fingeren (tryk for at vippe)");
}
$("styreKnap").addEventListener("click", async () => {
  Lyd.klar();
  if (!gemt.vip) {
    const ok = await bedOmVip();
    gemt.vip = ok; kalibrer();
    visBesked(ok ? (styr.vip.har ? "📱 Vip iPad'en for at styre" : "📱 Kan ikke mærke vip her — brug fingeren 👆") : "👆 Styr med fingeren");
  } else { gemt.vip = false; visBesked("👆 Styr med fingeren"); }
  gem(); opdaterStyreKnap();
});
function opdaterMusikKnap() { $("musikKnap").textContent = gemt.musik ? "🎵" : "🔇"; }
$("musikKnap").addEventListener("click", () => { Lyd.klar(); gemt.musik = !gemt.musik; gem(); Lyd.sætMusik(gemt.musik); opdaterMusikKnap(); });
$("kortKnap").addEventListener("click", tilMenu);
$("naeste").addEventListener("click", () => { const i = BANER.findIndex(b => b.id === baneDef.id); startBane(BANER[Math.min(BANER.length - 1, i + 1)].id); });
$("igen").addEventListener("click", () => { indlæs(baneDef.id); startBane(baneDef.id); });
$("tilBaner").addEventListener("click", tilMenu);

// ---------- Start ----------
Lyd.sætMusik(gemt.musik);
opdaterMusikKnap();
opdaterStyreKnap();
lavSkins();
lavBaner();
indlæs(URL_P.get("bane") || gemt.bane);
størrelse();
requestAnimationFrame(t => { sidst = t; løkke(t); });
window.rasmusKlar = true;
$("menu").classList.add("klar");
// ?debug: rr.spol(sek) kører spillet frem uden at vente på skærmen (til afprøvning)
if (URL_P.has("debug")) window.rr = {
  sp, rasmus, styr, kamera, scene, renderer, THREE, startBane, indlæs, gemt,
  get bane() { return bane; }, get verden() { return verden; }, get ting() { return ting; },
  spol(sek, trin = 1 / 60) { for (let t = 0; t < sek; t += trin) opdater(trin, false); renderer.render(scene, kamera); },
};
