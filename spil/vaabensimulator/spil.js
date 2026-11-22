// ===== Våbensimulator =====
// Vælg et våben nederst. Lyssværd og ildsværd: træk med fingeren for at svinge — skær frugten over,
// der bliver kastet op. Pistol, revolver, haglgevær, stormgevær og snigskyttegevær: tryk på det, du
// vil ramme. Stormgeværet skyder, så længe man holder fingeren nede. Når magasinet er tomt: tryk ⟳.

import * as THREE from "../3d-faelles/three.module.js";
import { Efterbehandling } from "./efterbehandling.js";
import { lavBane, lavMiljøkort, lavVåbenMiljø, HYLDE } from "./bane.js";
import { Partikler, Stumper } from "./partikler.js";
import { Effekter } from "./effekter.js";
import { VÅBEN, patron } from "./vaaben.js";
import { Lyssværd, Ildsværd, SVÆRDFARVER, ILDFARVER } from "./svaerd.js";
import { Mål } from "./maal.js";
import { mat } from "./materialer.js";
import * as lyd from "./lyd.js";

const $ = id => document.getElementById(id);
const tilf = (a, b) => a + Math.random() * (b - a);
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const klem = (x, a, b) => Math.min(b, Math.max(a, x));
const blød = x => x * x * (3 - 2 * x);
const PRØVE = new URLSearchParams(location.search).has("prøve");

// ---------- Tegneren, kameraet og scenen ----------
// Spar på hukommelsen: lærredet selv behøver hverken gennemsigtighed eller dybde (alt tegnes først i et
// billede for sig og lægges på til sidst), og på tablets tegnes der med lidt færre punkter (1,3 i stedet for 2).
const lærred = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas: lærred, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // skyggerne tegnes kun hvert andet billede (se trin)
renderer.localClippingEnabled = true;
const mobil = /iPad|iPhone|Android|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
let pr = Math.min(window.devicePixelRatio || 1, mobil ? 1.3 : 1.75);
renderer.setPixelRatio(pr);

const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(50, 1, 0.02, 900);
const KAMERA_POS = v3(0, 1.45, 0.9), KIG = v3(0, 1.08, HYLDE.z - 1.5);
kamera.position.copy(KAMERA_POS); kamera.lookAt(KIG);
scene.add(kamera);
scene.environment = lavMiljøkort(renderer);
const bane = lavBane(scene);
const efter = new Efterbehandling(renderer, { samples: mobil ? 2 : 4 });

// Våbnet i hånden tegnes for sig selv ovenpå verden: med sit eget synsfelt (så kikkertens zoom ikke forvrænger
// det), sit eget lys (ét hovedlys, ét kantlys og himmelskær i stedet for alle banens lamper) og sit eget, roligere
// miljøkort (så sort stål ikke spejler den lyserøde aftenhimmel og ligner træ).
const våbenScene = new THREE.Scene();
våbenScene.environment = lavVåbenMiljø(renderer);
const våbenKamera = new THREE.PerspectiveCamera(50, 1, 0.01, 20);
våbenScene.add(våbenKamera, new THREE.HemisphereLight(0x9ea2d6, 0x3a2e26, 0.8));
const hovedlys = new THREE.DirectionalLight(0xfff0e2, 2.4), kantlys = new THREE.DirectionalLight(0xa9c2ff, 1.5);
hovedlys.position.set(0.7, 1.6, 0.9); kantlys.position.set(-1.2, 0.8, -1.4);
for (const l of [hovedlys, kantlys]) { våbenKamera.add(l, l.target); l.target.position.set(0, 0, -0.4); }
const våbenGlimt = new THREE.PointLight(0xffb060, 0, 3, 2); våbenScene.add(våbenGlimt);   // mundingsglimtet lyser også på våbnet
const forgrund = { scene: våbenScene, kamera: våbenKamera };

// Partikler: en slags der lyser (lægges sammen) og en der dækker (røg, saft, konfetti)
const glød = new Partikler(scene, { maks: 2500, lægSammen: true });
const røg = new Partikler(scene, { maks: 2500, lægSammen: false });
const stumper = new Stumper(scene, bane.gulv);
const effekter = new Effekter(scene, glød, røg);
const mål = new Mål({ scene, kamera, effekter, glød, røg, stumper, gulv: bane.gulv });

// ---------- Våbnene i hånden ----------
// kamera → hånd (stedet foran kameraet) → sigte (drejer mod målet) → rekyl (sparket) → lade (vip ved ladning) → våbnet
// (våbenKameraet følger kameraet præcist, så "foran kameraet" er det samme sted i begge scener)
const hånd = new THREE.Group(), sigte = new THREE.Group(), rekyl = new THREE.Group(), lade = new THREE.Group();
våbenKamera.add(hånd); hånd.add(sigte); sigte.add(rekyl); rekyl.add(lade);
const våben = VÅBEN.map(spec => {
  const model = spec.lav();
  // Modellerne er tegnet med højre side mod −z: spejl dem, så udkastet sidder til højre, og drej løbet frem (−z)
  model.gruppe.scale.set(spec.skala, spec.skala, -spec.skala);
  model.gruppe.rotation.y = Math.PI / 2;
  model.gruppe.add(model.munding, model.udkast);
  model.gruppe.visible = false; lade.add(model.gruppe);
  return { spec, model, ammo: spec.magasin, sidenSkud: 9, lader: false, ladT: 0, tom: false, harPumpet: true, harRepeteret: true, hændelse: 0 };
});
// Sværdene holdes i deres egen hånd nederst på skærmen
const sværdHånd = new THREE.Group(); kamera.add(sværdHånd);
const lyssværd = new Lyssværd(scene, glød, røg), ildsværd = new Ildsværd(scene, glød, røg);
sværdHånd.add(lyssværd.gruppe, ildsværd.gruppe);
lyssværd.gruppe.visible = ildsværd.gruppe.visible = false;

const VALG = [
  { id: "lyssværd", navn: "Lyssværd", sværd: lyssværd },
  { id: "ildsværd", navn: "Ildsværd", sværd: ildsværd },
  ...våben.map(v => ({ id: v.spec.id, navn: v.spec.navn, våben: v })),
];
let valgt = null, skift = 1;           // skift: 0 = våbnet er lige taget frem, 1 = på plads

// ---------- Ikonerne i våbenlinjen (tegnet af de rigtige 3D-modeller) ----------
// Hvert våben fotograferes fra siden foran en blød, lys baggrund (som i et udstillingsskab), så selv de sorte
// våben står tydeligt frem. Billedet tegnes i et lille billede for sig og læses tilbage som et almindeligt billede.
function lavIkoner() {
  const B = 264, H = 192, forhold = B / H;
  const mål = new THREE.WebGLRenderTarget(B, H, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const s = new THREE.Scene(), kam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
  // Baggrunden: et lyst skær bag våbnet, mørkere ud mod kanterne
  const bg = document.createElement("canvas"); bg.width = B; bg.height = H;
  const g = bg.getContext("2d"), grad = g.createRadialGradient(B * 0.5, H * 0.36, 8, B * 0.5, H * 0.42, B * 0.62);
  grad.addColorStop(0, "#b9bfd6"); grad.addColorStop(0.45, "#7d84a3"); grad.addColorStop(1, "#2c2a44");
  g.fillStyle = grad; g.fillRect(0, 0, B, H);
  s.background = new THREE.CanvasTexture(bg); s.background.colorSpace = THREE.SRGBColorSpace;
  s.environment = våbenScene.environment;
  s.add(new THREE.HemisphereLight(0xffffff, 0x4a4660, 1.4));
  const nøgle = new THREE.DirectionalLight(0xfff6ec, 2.6); nøgle.position.set(-1, 2, 3);
  const kant = new THREE.DirectionalLight(0xdce6ff, 2.2); kant.position.set(1.5, 1.2, -2);
  s.add(nøgle, kant);
  const px = new Uint8Array(B * H * 4);
  for (const v of VALG) {
    const obj = v.sværd ? v.sværd.gruppe : v.våben.model.gruppe, forælder = obj.parent;
    const gem = { p: obj.position.clone(), q: obj.quaternion.clone(), vis: obj.visible };
    s.add(obj); obj.visible = true; obj.position.set(0, 0, 0);
    if (v.sværd) { obj.quaternion.setFromEuler(new THREE.Euler(0.5, 0, -1.25)); v.sværd.ude = 0.5; v.sværd.mål = 0.5; v.sværd.opdater(0.016, 1); }
    else obj.quaternion.setFromEuler(new THREE.Euler(0.16, -0.22, v.våben.spec.ikonVip ?? 0.1));   // lange geværer vippes, så de fylder mere
    obj.updateMatrixWorld(true);
    // Kameraet rammer våbnet ind i den øverste del (navnet står nederst). Sværdets glød tæller ikke med.
    const box = new THREE.Box3();
    obj.traverse(o => { if (o.isMesh && o.frustumCulled && o.visible) box.expandByObject(o); });
    const c = box.getCenter(v3()), str = box.getSize(v3());
    const halvH = Math.max(str.y / 1.42, str.x / 1.84 / forhold), halvB = halvH * forhold;
    kam.left = -halvB; kam.right = halvB; kam.top = halvH * 0.86; kam.bottom = -halvH * 1.14;   // (målt fra kameraet)
    kam.position.set(c.x, c.y, 3); kam.lookAt(c.x, c.y, 0); kam.updateProjectionMatrix();
    renderer.setRenderTarget(mål); renderer.render(s, kam);
    renderer.readRenderTargetPixels(mål, 0, 0, B, H, px);
    // Billedet læses nedefra og op — vend det, og gem det som et almindeligt billede til knappen
    const c2 = document.createElement("canvas"); c2.width = B; c2.height = H;
    const g2 = c2.getContext("2d"), billede = g2.createImageData(B, H);
    for (let y = 0; y < H; y++) billede.data.set(px.subarray((H - 1 - y) * B * 4, (H - y) * B * 4), y * B * 4);
    g2.putImageData(billede, 0, 0);
    v.ikon = c2.toDataURL("image/jpeg", 0.9);
    forælder.add(obj); obj.position.copy(gem.p); obj.quaternion.copy(gem.q); obj.visible = gem.vis;
    if (v.sværd) { v.sværd.ude = 0; v.sværd.mål = 0; }
  }
  renderer.setRenderTarget(null);
  mål.dispose(); s.background.dispose();
}

// ---------- Brugerfladen ----------
const bar = $("våbenbar");
function lavBar() {
  for (const v of VALG) {
    const k = document.createElement("button");
    k.className = "våben-knap"; k.type = "button"; k.setAttribute("aria-label", v.navn); k.dataset.id = v.id;
    k.innerHTML = `<img alt="" src="${v.ikon}"><span>${v.navn}</span>`;
    k.addEventListener("click", () => { lyd.start(); vælg(v); });
    bar.append(k); v.knap = k;
  }
}
function lavFarver() {
  const f = $("farver"); f.innerHTML = "";
  const sv = valgt?.sværd; if (!sv) return;
  const liste = sv === lyssværd ? SVÆRDFARVER : ILDFARVER;
  for (const navn of Object.keys(liste)) {
    const k = document.createElement("button"); k.type = "button"; k.className = "farve"; k.setAttribute("aria-label", navn);
    const c = sv === lyssværd ? liste[navn] : liste[navn][1];
    const m = Math.max(...c);
    k.style.setProperty("--f", navn === "regnbue" ? "conic-gradient(red, orange, yellow, lime, cyan, blue, magenta, red)" : `rgb(${c.map(x => Math.round(Math.min(1, x / m * 1.05) * 255)).join(",")})`);
    if (navn === sv.farveNavn) k.classList.add("valgt");
    k.addEventListener("click", e => {
      e.stopPropagation(); lyd.start(); sv.sætFarve(navn);
      if (sv.tændt) lyd.sværdTænd(sv === lyssværd ? "lys" : "ild", navn);
      [...f.children].forEach(b => b.classList.toggle("valgt", b === k));
    });
    f.append(k);
  }
}
// Patronerne, der er tilbage (små messingpatroner — eller en bjælke for store magasiner)
function visAmmo() {
  const a = $("ammo"), v = valgt?.våben;
  if (!v) { a.hidden = true; return; }
  a.hidden = false;
  const n = v.spec.magasin;
  if (a.dataset.n !== String(n)) {
    a.dataset.n = n; a.innerHTML = "";
    for (let i = 0; i < n; i++) { const p = document.createElement("i"); p.className = v.spec.patron === "hagl" ? "patron hagl" : n > 17 ? "patron lille" : "patron"; a.append(p); }
  }
  [...a.children].forEach((p, i) => p.classList.toggle("brugt", i >= v.ammo));
  $("ladKnap").classList.toggle("tom", v.ammo === 0 && !v.lader);
}

function vælg(v) {
  if (valgt === v) return;
  const før = valgt;
  if (før?.sværd) { før.sværd.sluk(); lyd.sværdSluk(true); }
  valgt = v; skift = 0;
  for (const x of VALG) x.knap?.classList.toggle("valgt", x === v);
  for (const w of våben) w.model.gruppe.visible = w === v.våben;
  lyssværd.gruppe.visible = v.sværd === lyssværd; ildsværd.gruppe.visible = v.sværd === ildsværd;
  // Mundingsglimtets lys bruges kun med våben (sværdene har deres eget) — så er der lige mange lys hele tiden,
  // og spillet skal ikke bygge sine lysberegninger om, hver gang man skifter
  effekter.glimtLys.visible = !!v.våben;
  document.body.dataset.tilstand = v.sværd ? "sværd" : "våben";
  document.body.dataset.våben = v.id;
  if (v.våben) {
    const p = v.våben.spec.plads; hånd.position.set(...p);
    lyd.mekanik("vælg");
    sigtNu(v.våben);
  }
  if (v.sværd) { v.sværd.ude = 0; setTimeout(() => { if (valgt === v) tændSværd(true); }, 260); }
  lavFarver(); visAmmo();
  try { localStorage.setItem("vaabensim-valg", v.id); } catch { /* privat tilstand */ }
}
function tændSværd(på) {
  const sv = valgt?.sværd; if (!sv) return;
  if (på) { sv.tænd(); lyd.sværdTænd(sv === lyssværd ? "lys" : "ild", sv.farveNavn); } else { sv.sluk(); lyd.sværdSluk(); }
  $("tændKnap").classList.toggle("slukket", !på);
}

// ---------- Sigte og skud ----------
const stråle = new THREE.Raycaster();
let sigtePunkt = v3(0, 1.2, HYLDE.z);
// Rotationen, der får løbet til at pege præcis mod et punkt i verden (løbet ligger langs sigtets −z).
// "kant" vipper våbnet en anelse om løbets egen akse, så man ser mere af siden — uden at det sigter skævt.
function målRetning(punkt, kant = 0) {
  const p = våbenKamera.worldToLocal(punkt.clone()), d = p.sub(hånd.position).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(v3(), d, v3(0, 1, 0)));
  return q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), kant));
}
// Drej våbnet helt ind på sigtepunktet med det samme (lige før et skud, så kuglen går ud af løbet)
function sigtNu(v) { sigte.quaternion.copy(målRetning(sigtePunkt, v.spec.kant)); }
// Hvad rammer man, hvis man trykker her? (med hjælp: tæt nok på et mål tæller som et træf)
function find(x, y, spredning = 0) {
  const W = innerWidth, H = innerHeight, ndc = new THREE.Vector2(x / W * 2 - 1, -(y / H) * 2 + 1);
  stråle.setFromCamera(ndc, kamera);
  if (spredning) { stråle.ray.direction.add(v3(tilf(-1, 1), tilf(-1, 1), tilf(-1, 1)).multiplyScalar(spredning)).normalize(); }
  const ting = [...mål.træfbare, ...bane.skydbare];
  let træf = stråle.intersectObjects(ting, true)[0];
  if (!spredning && !(træf && træf.object.userData.mål)) {
    const nær = mål.findNær(x, y, W, H, Math.min(W, H) * 0.075);
    if (nær) {
      const c = nær.obj.getWorldPosition(v3());
      stråle.set(kamera.position, c.sub(kamera.position).normalize());
      træf = stråle.intersectObject(nær.obj, true)[0] || træf;
    }
  }
  if (!træf) return { punkt: stråle.ray.at(80, v3()), retning: stråle.ray.direction.clone() };
  const n = træf.face ? træf.face.normal.clone().transformDirection(træf.object.matrixWorld) : v3(0, 0, 1);
  return { punkt: træf.point, normal: n, retning: stråle.ray.direction.clone(), objekt: træf.object, mål: træf.object.userData.mål, slags: træf.object.userData.slags };
}

let rystelse = 0, kikkert = null;
const rekylFart = { løft: 0, tilbage: 0, rul: 0, sving: 0 }, rekylPos = { løft: 0, tilbage: 0, rul: 0, sving: 0 };
function skyd(v, x, y) {
  const spec = v.spec;
  v.ammo--; v.sidenSkud = 0; v.tom = v.ammo === 0; v.nytSkud = true; v.harPumpet = false; v.harRepeteret = false; v.hylsterUde = false;
  lyd.skud(spec.lyd, -0.3);
  const munding = v.model.munding, str = { pistol: 0.11, revolver: 0.17, hagl: 0.22, stormgevær: 0.13, snig: 0.2 }[spec.id];
  // Gennem kikkerten ses geværet ikke — så kun et kort lysglimt i stedet for ild foran linsen
  if (!kikkert) effekter.mundingsild(munding, str, { side: spec.id === "snig", røg: spec.id === "hagl" ? 1.6 : 1 });
  // Sparket: våbnet hopper op og tilbage, og kameraet ryster en smule
  const r = spec.rekyl;
  rekylFart.løft += r.løft * 14 * tilf(0.85, 1.15); rekylFart.tilbage += r.tilbage * 14; rekylFart.rul += r.rul * 14 * tilf(-1, 1); rekylFart.sving += r.rul * 6 * tilf(-1, 1);
  rystelse = Math.min(1, rystelse + r.løft * 1.4 + r.tilbage * 3);
  efter.blink = kikkert ? 0.18 : 0.02 + r.løft * 0.06;
  // Kuglerne (haglgeværet skyder 9 hagl på én gang)
  const fra = munding.getWorldPosition(v3());
  const antal = spec.hagl || 1, ramte = new Set();
  for (let i = 0; i < antal; i++) {
    const t = find(x, y, antal > 1 ? spec.spredning : (spec.spredning || 0) * (spec.auto ? 1 : 0));
    effekter.spor(fra, t.punkt);
    if (!t.normal) continue;
    const pan = klem(t.punkt.x / 4, -1, 1), afstand = t.punkt.distanceTo(kamera.position);
    if (t.mål) {
      if (!ramte.has(t.mål)) lyd.træf; // lyden afspilles i målet
      if (t.mål.tilstand !== "væk") mål.ramt(t.mål, t.punkt, t.retning, antal > 1 ? 0.6 : 1);
      ramte.add(t.mål);
    } else {
      const slags = t.slags || "træ";
      if (i < 3) lyd.træf(slags, antal > 1 ? 0.6 : 1, pan, afstand);
      effekter.træf(slags, t.punkt, t.normal, t.retning, antal > 1 ? 0.5 : 1);
      if (slags !== "jord" && slags !== "halm" && slags !== "metal") effekter.skudhul(t.punkt, t.normal, antal > 1 ? 0.022 : spec.id === "snig" ? 0.06 : 0.042);
      if (slags === "skive") tjekSkive(t);
    }
  }
  // Hylsteret ryger ud med det samme for pistol og stormgevær (de andre ved pumpe/repetering/ladning)
  if (spec.id === "pistol" || spec.id === "stormgevær") setTimeout(() => kastHylster(v), 18);
  visAmmo();
}
// Ramte man skydeskivens gule midte?
function tjekSkive(t) {
  const c = t.objekt.getWorldPosition(v3()), r = t.objekt.userData.radius, d = t.punkt.distanceTo(c) / r;
  if (d < 0.22) {
    lyd.bulls(klem(c.x / 4, -1, 1));
    for (let i = 0; i < 40; i++) glød.udsend({ pos: t.punkt, fart: v3(tilf(-2, 2), tilf(-1, 3), tilf(0, 1.5)), liv: tilf(0.6, 1.2), str: tilf(0.02, 0.04), farve: new THREE.Color(4, 3.2, 0.8), farveSlut: new THREE.Color(2, 0.5, 0.1), tyngde: 3, luft: 1.5, billede: 3, spin: 8 });
  }
}
// Et tomt hylster flyver ud til højre og klirrer ned på bordet
function kastHylster(v, fra = null, fart = null) {
  const g = v.model.gruppe, h = patron(v.spec.patron, false);
  h.position.copy(fra || v.model.udkast.getWorldPosition(v3()));
  h.quaternion.copy(g.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilf(-0.5, 0.5), tilf(-0.5, 0.5), tilf(-0.5, 0.5))));
  const lokal = fart || v3(tilf(-0.9, -0.3), tilf(1.3, 2.1), -tilf(1.5, 2.4));
  const f = lokal.applyMatrix3(new THREE.Matrix3().setFromMatrix4(g.matrixWorld)).divideScalar(v.spec.skala);
  const hagl = v.spec.patron === "hagl";
  stumper.tilføj(h, { fart: f, spin: v3(tilf(-30, 30), tilf(-30, 30), tilf(-30, 30)), liv: 14, radius: hagl ? 0.0105 : 0.005, hop: hagl ? 0.3 : 0.42, gnid: 0.62, ramt: s => lyd.hylster(s / 3, hagl ? "hagl" : "messing", 0.3) });
}
// Det tomme magasin falder ned på bordet
function tabMagasin(v) {
  const m = v.model.magasinDel; if (!m) return;
  const kopi = m.clone(true); m.updateWorldMatrix(true, true);
  kopi.matrixWorld.decompose(kopi.position, kopi.quaternion, kopi.scale);
  kopi.traverse(o => { if (o.isMesh && mat[o.material.name]) o.material = mat[o.material.name]; });   // nu er det en del af verden
  kopi.userData.skala = 1;
  const s = kopi.scale.clone();
  kopi.userData.væk = () => {};
  scene.add(kopi); kopi.scale.copy(s);
  stumper.tilføj(kopi, { fart: v3(tilf(-0.2, 0.2), -0.5, 0.1), spin: v3(tilf(-2, 2), tilf(-1, 1), tilf(-2, 2)), liv: 8, radius: 0.012, hop: 0.2, gnid: 0.4, læg: false, ramt: s2 => lyd.hylster(s2 / 2, "magasin", -0.3) });
  m.visible = false;
}

function genlad(v) {
  if (!v || v.lader || v.ammo === v.spec.magasin) return;
  v.lader = true; v.ladT = 0; v.hændelse = 0; v.ladAntal = v.spec.magasin - v.ammo; v.ladTom = v.tom;
  v.ladVarighed = v.spec.ladTid ?? (0.35 + v.ladAntal * 0.3 + (v.tom ? 0.95 : 0.4));
  v.ladHændelser = v.spec.hændelser.slice();
  if (v.spec.id === "hagl") {
    for (let i = 0; i < v.ladAntal; i++) v.ladHændelser.push([0.35 + i * 0.3 + 0.15, "haglInd"]);
    const slut = 0.35 + v.ladAntal * 0.3;
    if (v.tom) v.ladHændelser.push([slut + 0.36, "pumpeTilbage"], [slut + 0.5, "pumpeFrem"]);
    v.ladHændelser.sort((a, b) => a[0] - b[0]);
  }
  if (v.spec.id === "snig" && !v.tom) v.ladHændelser = v.ladHændelser.filter(([, n]) => !n.startsWith("bolt"));
  if (v.spec.id === "stormgevær" && !v.tom) v.ladHændelser = v.ladHændelser.filter(([, n]) => !n.startsWith("ladegreb"));
  if (v.spec.id === "pistol" && !v.tom) v.ladHændelser = v.ladHændelser.filter(([, n]) => n !== "slædeFrem");
  visAmmo();
}
// Hændelser under ladningen (lyde, magasiner og hylstre)
function ladHændelse(v, navn) {
  if (navn === "magFald") { tabMagasin(v); return; }
  if (navn === "hylstreUd") {
    for (const r of v.model.rande) {
      const p = r.getWorldPosition(v3());
      const h = patron("357", false); h.position.copy(p); h.quaternion.copy(v.model.gruppe.getWorldQuaternion(new THREE.Quaternion()));
      stumper.tilføj(h, { fart: v3(tilf(-0.3, 0.3), tilf(-0.6, -0.2), tilf(0.1, 0.4)), spin: v3(tilf(-8, 8), tilf(-8, 8), tilf(-8, 8)), liv: 14, radius: 0.005, hop: 0.4, gnid: 0.6, ramt: s => lyd.hylster(s / 3, "messing", 0.1) });
    }
  }
  if (navn === "pumpeTilbage") kastHylster(v);
  if (navn === "boltTilbage" && v.ladTom) { /* intet hylster i et tomt kammer */ }
  if (navn === "magInd" && v.model.magasinDel) v.model.magasinDel.visible = true;
  lyd.mekanik(navn, -0.25);
}

// ---------- Fingeren ----------
let finger = null, sidsteTryk = 0, tørKlik = 0;
const fingerPos = new THREE.Vector2(innerWidth / 2, innerHeight / 2);
lærred.addEventListener("pointerdown", e => {
  lyd.start(); sidsteTryk = performance.now(); skjulTip();
  if (finger !== null && valgt?.sværd) return;
  finger = e.pointerId; fingerPos.set(e.clientX, e.clientY);
  try { lærred.setPointerCapture(e.pointerId); } catch { /* ældre browsere */ }
  if (valgt?.våben) tryk(valgt.våben, e.clientX, e.clientY);
  if (valgt?.sværd) { sværdStyr.aktiv = true; sværdStyr.start = performance.now(); sværdStyr.flyttet = 0; if (!valgt.sværd.tændt) tændSværd(true); }
});
lærred.addEventListener("pointermove", e => {
  if (e.pointerId !== finger) return;
  sværdStyr.flyttet += Math.hypot(e.clientX - fingerPos.x, e.clientY - fingerPos.y);
  fingerPos.set(e.clientX, e.clientY);
});
const slip = e => {
  if (e.pointerId !== finger) return;
  finger = null; sværdStyr.aktiv = false;
  // Et hurtigt tryk med sværdet giver et hug hen mod fingeren
  if (valgt?.sværd && performance.now() - sværdStyr.start < 250 && sværdStyr.flyttet < 30) { sværdStyr.hug = 0.28; sværdStyr.hugMod.copy(fingerPos); }
};
lærred.addEventListener("pointerup", slip); lærred.addEventListener("pointercancel", slip);
document.addEventListener("contextmenu", e => e.preventDefault());

function tryk(v, x, y) {
  const t = find(x, y);
  sigtePunkt.copy(t.punkt);
  if (v.lader) return;
  if (v.ammo <= 0) {
    lyd.tørKlik(); tørKlik++;
    if (tørKlik >= 2) { tørKlik = 0; genlad(v); }
    return;
  }
  if (v.spec.kikkert) { startKikkert(v, x, y, t); return; }
  if (kanSkyde(v)) { sigtNu(v); skyd(v, x, y); }
}
const kanSkyde = v => !v.lader && v.ammo > 0 && v.sidenSkud >= v.spec.kadence && skift > 0.6 && !kikkert;

// Snigskytten: geværet løftes op til øjet, kameraet zoomer ind gennem kikkerten, skyder og zoomer ud igen
function startKikkert(v, x, y, t) {
  if (!kanSkyde(v)) return;
  kikkert = { v, x, y, punkt: t.punkt.clone(), t: 0, skudt: false };
  $("kikkert").hidden = false; $("kikkert").style.opacity = "0";
}

// ---------- Knapperne ----------
$("ladKnap").addEventListener("click", () => { lyd.start(); genlad(valgt?.våben); });
$("kastKnap").addEventListener("click", () => { lyd.start(); mål.kast(2 + (Math.random() < 0.4 ? 1 : 0), true); });
$("tændKnap").addEventListener("click", () => { lyd.start(); tændSværd(!valgt?.sværd?.tændt); });
const lydKnap = $("lyd");
try { if (localStorage.getItem("vaabensim-lyd") === "fra") { lyd.sætLyd(false); lydKnap.setAttribute("aria-pressed", "false"); lydKnap.textContent = "🔇"; } } catch { /* privat */ }
lydKnap.addEventListener("click", () => {
  lyd.start(); const på = !lyd.lydErTændt(); lyd.sætLyd(på);
  lydKnap.setAttribute("aria-pressed", String(på)); lydKnap.textContent = på ? "🔊" : "🔇";
  try { localStorage.setItem("vaabensim-lyd", på ? "til" : "fra"); } catch { /* privat */ }
});
// Tip: en hånd, der viser hvad man skal gøre, indtil barnet har prøvet
let tipTimer = 0;
function skjulTip() { $("tip").classList.remove("vis"); tipTimer = 0; }

// ---------- Sværdets styring ----------
const sværdStyr = { aktiv: false, start: 0, flyttet: 0, hug: 0, hugMod: new THREE.Vector2(), retning: v3(0.3, 1, -0.5).normalize(), pos: v3(0.09, -0.17, -0.62) };
const HVILE_POS = v3(0.09, -0.17, -0.62), HVILE_RET = v3(0.32, 1, -0.55).normalize();
function sværdMål(t) {
  let mod = null;
  if (sværdStyr.aktiv) mod = fingerPos;
  else if (sværdStyr.hug > 0) mod = sværdStyr.hugMod;
  if (!mod) return { pos: HVILE_POS.clone().add(v3(Math.sin(t * 0.9) * 0.01, Math.sin(t * 1.3) * 0.008, 0)), ret: HVILE_RET.clone().add(v3(Math.sin(t * 0.7) * 0.04, 0, Math.cos(t * 0.6) * 0.03)).normalize() };
  // Punktet under fingeren 1,7 m ude: klingen peger derhen, og hånden følger lidt med
  const ndc = new THREE.Vector2(mod.x / innerWidth * 2 - 1, -(mod.y / innerHeight) * 2 + 1);
  const p = v3(ndc.x, ndc.y, 0.5).unproject(kamera), retning = p.sub(kamera.position).normalize();
  const lokal = retning.transformDirection(kamera.matrixWorldInverse);
  const ude = lokal.clone().multiplyScalar(1.7 / Math.max(0.2, -lokal.z));
  const pos = HVILE_POS.clone().add(v3(klem(ude.x * 0.22 - 0.04, -0.3, 0.25), klem(ude.y * 0.12, -0.06, 0.12), 0));
  return { pos, ret: ude.sub(pos).normalize() };
}

// ---------- Størrelse ----------
function tilpas() {
  const W = innerWidth, H = innerHeight;
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  efter.størrelse(W, H);
  kamera.aspect = W / H;
  // Smal skærm (iPad på højkant): gør synsfeltet højere, så hele hylden stadig kan ses
  kamera.fov = klem(2 * Math.atan(Math.tan(31 * Math.PI / 180) / kamera.aspect) * 180 / Math.PI, 50, 78);
  basisFov = kamera.fov;
  kamera.updateProjectionMatrix();
  våbenKamera.aspect = kamera.aspect; våbenKamera.fov = basisFov; våbenKamera.updateProjectionMatrix();
}
let basisFov = 50;
addEventListener("resize", tilpas);

// ---------- Hvert billede ----------
let sidst = performance.now(), tid = 0, næsteKast = 2, målingT = 0, målingN = 0, billedNr = 0;
const _q = new THREE.Quaternion(), _øje = v3(), _fremad = v3();
function løkke(nu) {
  requestAnimationFrame(løkke);
  trin(nu);
}
function trin(nu) {
  // Tidsskridtet: aldrig baglæns og aldrig mere end 1/20 sekund (så intet eksploderer efter en pause)
  let dt = (nu - sidst) / 1000; if (!(dt > 0)) dt = 0; dt = Math.min(dt, 0.05); sidst = nu; tid += dt;
  // Kameraet: ånder lidt og ryster ved skud. Snigskyttens kikkert zoomer ind på målet
  rystelse *= Math.exp(-dt * 9);
  let kig = KIG.clone(), fov = basisFov, løftTilØjet = 0;
  if (kikkert) {
    // 1) geværet løftes op, til kikkerten sidder foran øjet  2) mørket lukker sig om linsen
    // 3) zoom ind (geværet skjules — man kigger jo gennem det)  4) skud midt i trådkorset  5) samme vej ud igen
    const k = kikkert; k.t += dt;
    const fra = (a, b) => blød(klem((k.t - a) / (b - a), 0, 1));
    løftTilØjet = fra(0, 0.2) * (1 - fra(1.3, 1.5));
    const mørke = fra(0.13, 0.22) * (1 - fra(1.24, 1.32));
    const zoom = fra(0.22, 0.36) * (1 - fra(1.1, 1.24));
    kig.lerp(k.punkt, løftTilØjet); fov = basisFov + (6.5 - basisFov) * zoom;
    $("kikkert").style.opacity = mørke.toFixed(3);
    k.v.model.gruppe.visible = zoom < 0.001;
    if (!k.skudt && k.t > 0.52) { k.skudt = true; skyd(k.v, innerWidth / 2, innerHeight / 2); }
    if (k.t > 1.5) { kikkert = null; $("kikkert").hidden = true; k.v.model.gruppe.visible = valgt?.våben === k.v; }
  }
  kamera.position.copy(KAMERA_POS).add(v3(Math.sin(tid * 0.6) * 0.004, Math.sin(tid * 0.9) * 0.003, 0));
  kamera.lookAt(kig);
  kamera.rotateX((Math.random() - 0.5) * rystelse * 0.02 + rystelse * 0.012); kamera.rotateY((Math.random() - 0.5) * rystelse * 0.016);
  if (Math.abs(kamera.fov - fov) > 0.01) { kamera.fov = fov; kamera.updateProjectionMatrix(); }
  kamera.updateMatrixWorld();
  våbenKamera.position.copy(kamera.position); våbenKamera.quaternion.copy(kamera.quaternion); våbenKamera.updateMatrixWorld(true);

  // Skift våben: det nye kommer op nedefra
  skift = Math.min(1, skift + dt * 2.8);
  const op = 1 - Math.pow(1 - skift, 3);
  const v = valgt?.våben;
  if (v) {
    v.sidenSkud += dt;
    if (v.spec.auto && finger !== null && kanSkyde(v)) { const t = find(fingerPos.x, fingerPos.y); sigtePunkt.copy(t.punkt); sigtNu(v); skyd(v, fingerPos.x, fingerPos.y); }
    else if (v.spec.auto && finger !== null) sigtePunkt.copy(find(fingerPos.x, fingerPos.y).punkt);
    // Pumpen og repeteringen: hylsteret ryger ud, når pumpen/bundstykket er helt tilbage
    if (v.spec.id === "hagl" && !v.harPumpet) {
      if (v.sidenSkud > 0.24 && !v.hylsterUde) { v.hylsterUde = true; kastHylster(v); lyd.mekanik("pumpeTilbage", -0.25); }
      if (v.sidenSkud > 0.38 && !v.frem) { v.frem = true; lyd.mekanik("pumpeFrem", -0.25); }
      if (v.sidenSkud > 0.46) { v.harPumpet = v.ammo === 0 ? true : true; v.frem = false; }
    }
    if (v.spec.id === "snig" && !v.harRepeteret) {
      const c = v.sidenSkud - 0.4;
      if (c > 0 && !v.op) { v.op = true; lyd.mekanik("boltOp", -0.25); }
      if (c > 0.12 && !v.hylsterUde) { v.hylsterUde = true; kastHylster(v, null, v3(tilf(-0.8, -0.4), tilf(0.8, 1.4), -tilf(1.2, 1.8))); lyd.mekanik("boltTilbage", -0.25); }
      if (c > 0.27 && !v.frem && v.ammo > 0) { v.frem = true; lyd.mekanik("boltFrem", -0.25); }
      if (c > 0.42) { if (v.ammo > 0) lyd.mekanik("boltNed", -0.25); v.harRepeteret = true; v.op = v.frem = false; }
      if (v.ammo === 0 && c > 0.3) v.harRepeteret = true;
    }
    if (v.spec.id === "revolver" && v.sidenSkud > 0.13 && v.sidenSkud - dt <= 0.13 && v.ammo > 0) lyd.mekanik("hane", -0.25);
    // Ladning
    if (v.lader) {
      v.ladT += dt;
      while (v.hændelse < v.ladHændelser.length && v.ladT >= v.ladHændelser[v.hændelse][0]) ladHændelse(v, v.ladHændelser[v.hændelse++][1]);
      if (v.ladT >= v.ladVarighed) { v.lader = false; v.ammo = v.spec.magasin; v.tom = false; v.sidenSkud = 9; v.harPumpet = v.harRepeteret = true; if (v.model.magasinDel) v.model.magasinDel.visible = true; visAmmo(); }
    }
    const st = { sidenSkud: v.sidenSkud, tom: v.tom, lader: v.lader, ladT: v.lader ? v.ladT : null, ladAntal: v.ladAntal, nytSkud: v.nytSkud, harPumpet: v.harPumpet, harRepeteret: v.harRepeteret, holder: finger !== null && v.spec.auto };
    if (v.lader) st.tom = v.ladTom;
    const ekstra = v.model.pose(st, dt) || {};
    v.nytSkud = st.nytSkud;
    // Rekyl som en fjeder: farten trækkes tilbage mod hvile og dæmpes
    for (const k of ["løft", "tilbage", "rul", "sving"]) {
      rekylFart[k] += (-rekylPos[k] * 260 - rekylFart[k] * 22) * dt;
      rekylPos[k] += rekylFart[k] * dt;
    }
    rekyl.position.set(0, rekylPos.løft * 0.04, rekylPos.tilbage);
    rekyl.rotation.set(rekylPos.løft, rekylPos.sving, rekylPos.rul);
    lade.rotation.set(ekstra.løft || 0, 0, ekstra.rul || 0);
    // Hånden: ånder lidt, og ved snigskyttens kikkert løftes geværet op foran øjet
    // (smal skærm: våbnet rykkes ind mod midten · bred, lav skærm som en telefon: lidt op over våbenlinjen)
    const p = v.spec.plads, smal = klem(kamera.aspect / 1.4, 0.55, 1), op2 = klem((kamera.aspect - 1.5) * 0.04, 0, 0.026);
    hånd.position.set(p[0] * smal + Math.sin(tid * 1.1) * 0.0015, p[1] + op2 + Math.sin(tid * 1.7) * 0.0012 - (1 - op) * 0.32, p[2]);
    if (løftTilØjet > 0 && v.spec.vedØjet) hånd.position.lerp(_øje.set(...v.spec.vedØjet), løftTilØjet);
    hånd.rotation.set(-(1 - op) * 0.6, 0, (1 - op) * 0.3);
    // Løbet peger mod punktet, man trykkede på (blødt, men hurtigt — og helt præcist ved hvert skud)
    // (når geværet er oppe ved øjet, følger det kameraet helt uden forsinkelse, så kikkerten sidder lige foran øjet)
    _q.copy(målRetning(sigtePunkt, v.spec.kant * (1 - løftTilØjet))); sigte.quaternion.slerp(_q, Math.max(1 - Math.exp(-dt * 22), løftTilØjet));
  }
  // Sværdet: klingen følger fingeren som noget tungt (fjeder), og frugt kastes op
  const sv = valgt?.sværd;
  if (sv) {
    sværdStyr.hug = Math.max(0, sværdStyr.hug - dt);
    const m = sværdMål(tid);
    sværdStyr.pos.lerp(m.pos, 1 - Math.exp(-dt * 13));
    sværdStyr.retning.lerp(m.ret, 1 - Math.exp(-dt * 19)).normalize();
    sværdHånd.position.copy(sværdStyr.pos).add(v3(0, -(1 - op) * 0.4, 0));
    sværdHånd.quaternion.setFromUnitVectors(v3(0, 1, 0), sværdStyr.retning);
    sværdHånd.rotateY(0.6);
    lyd.sværdFart(sv.fart / 9);
    mål.sværdTjek(sv, innerWidth, innerHeight, sv === ildsværd);
    næsteKast -= dt;
    if (næsteKast <= 0 && sv.tændt) { mål.kast(Math.random() < 0.25 ? 2 : 1, false); næsteKast = tilf(1.3, 2.3); }
  }
  lyssværd.opdater(dt, tid); ildsværd.opdater(dt, tid);
  mål.opdater(dt, tid, true);
  stumper.opdater(dt);
  effekter.opdater(dt);
  glød.opdater(dt); røg.opdater(dt);
  bane.opdater(tid, pr);
  lyd.natur();
  efter.blink = Math.max(0, (efter.slut.uniforms.uBlink.value) * Math.exp(-dt * 30));
  efter.farvekant = Math.min(0.45, rystelse * 0.5);
  // Mundingsglimtet lyser også på våbnet (lidt foran mundingen, så våbnet ikke bliver hvidt)
  våbenGlimt.intensity = effekter.glimtLys.intensity * 0.35;
  if (våbenGlimt.intensity > 0.01) våbenGlimt.position.copy(effekter.glimtLys.position).addScaledVector(kamera.getWorldDirection(_fremad), 0.12);
  // Skyggerne ændrer sig kun lidt fra billede til billede: tegn dem hvert andet billede
  renderer.shadowMap.needsUpdate = billedNr++ % 2 === 0;
  efter.tegn(scene, kamera, tid, forgrund);
  // Tip efter et stykke tid uden tryk
  tipTimer += dt;
  if (tipTimer > 7 && !$("tip").classList.contains("vis")) $("tip").classList.add("vis");
  visAmmoLøbende();
  // Hold billedet flydende: tegn med færre punkter, hvis det går for langsomt
  målingT += dt; målingN++;
  if (målingT > 2.5) { const snit = målingT / målingN; if (snit > 1 / 40 && pr > 1) { pr = Math.max(1, pr - 0.2); tilpas(); } målingT = 0; målingN = 0; }
}
let ammoSidst = "";
function visAmmoLøbende() { const v = valgt?.våben; const k = v ? `${v.ammo}${v.lader}` : ""; if (k !== ammoSidst) { ammoSidst = k; visAmmo(); } }

// ---------- Start ----------
tilpas();
lavIkoner();
lavBar();
let start = VALG[0];
try { start = VALG.find(v => v.id === localStorage.getItem("vaabensim-valg")) || VALG[0]; } catch { /* privat */ }
vælg(start);
$("henter").hidden = true;
requestAnimationFrame(løkke);

// Forsidebilledet (?forside): lyssværdet og revolveren side om side, og frugt i luften
if (new URLSearchParams(location.search).has("forside")) {
  document.body.classList.add("forside");
  vælg(VALG[0]); lyssværd.tænd(); lyssværd.ude = 1; lyssværd.spor.mesh.visible = false;
  sværdStyr.aktiv = true; fingerPos.set(innerWidth * 0.78, innerHeight * 0.12);
  const rev = våben[1]; rev.model.gruppe.visible = true;
  hånd.position.set(-0.075, -0.05, -0.34); sigte.quaternion.copy(målRetning(v3(0.6, 1.3, HYLDE.z))).multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), -0.45));
  for (const [slags, x, y] of [["melon", -0.35, 1.72], ["appelsin", 0.25, 1.9], ["æble", 0.55, 1.62]]) {
    const m = mål.nytMål(slags); mål.tilføj(m, v3(x, y, -1.1)); m.tilstand = "kastet"; m.tyngde = 0; m.obj.rotation.set(0.4, 0.8, 0.2);
  }
  næsteKast = 1e9;
}

// Til prøverne: ?prøve giver adgang til spillets tilstand
if (PRØVE) window.spil = { VALG, vælg, våben, mål, kamera, scene, våbenScene, våbenKamera, find, tryk, genlad, lyssværd, ildsværd, sværdStyr, fingerPos, renderer, efter, hånd, sigte, sigtePunkt, effekter, trin: (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) trin(sidst + dt * 1000); }, get valgt() { return valgt; } };
