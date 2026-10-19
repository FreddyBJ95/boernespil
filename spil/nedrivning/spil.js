// ===== Nedrivningsfirmaet: selve spillet =====
// Spillet går gennem nogle faser: menu → opgaven forklares → sprængstof sættes på (placering) →
// nedtælling og tænding → sprængningen (fysikken kører, indtil alt ligger stille) → resultatet.
// Alt det tunge ligger i de andre filer: dele.js (bygningernes stykker og statik), sprængstof.js,
// effekter.js (ild, røg, støv), lyd.js, bygninger.js og baner.js (opgaverne).

import * as THREE from "../3d-faelles/three.module.js";
import { startFysik, nyVerden, fysikTrin, stråle, fysik } from "./fysik.js";
import { hentFotos, MATERIALER } from "./materialer.js";
import { Dele } from "./dele.js";
import { Ruder } from "./ruder.js";
import { Effekter } from "./effekter.js";
import { Efterbehandling } from "./efterbehandling.js";
import { Lyd } from "./lyd.js";
import { Sprængstof, SPRÆNGSTOF, hentModeller } from "./sprængstof.js";
import { Verden, TIDER } from "./verden.js";
import { Kamera } from "./styring.js";
import { BANER, FRIT, tjek } from "./baner.js";
import { Terræn, TERRÆN } from "./terraen.js";
import { Lunter } from "./lunte.js";
import { mobil } from "./enhed.js";

const $ = id => document.getElementById(id);
const debug = new URLSearchParams(location.search).has("debug");
const NØGLE = "nedrivning-fremgang-v1";
const kr = n => `${Math.round(n).toLocaleString("da-DK")} kr`;

// ---------- Fremgangen gemmes på enheden ----------
let fremgang = {};
try { fremgang = JSON.parse(localStorage.getItem(NØGLE) || "{}"); } catch (_) { fremgang = {}; }
const gem = () => { try { localStorage.setItem(NØGLE, JSON.stringify(fremgang)); } catch (_) { /* privat browser */ } };

// ---------- 3D ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $("verden"), antialias: false, powerPreference: "high-performance" });
} catch (_) {
  $("indlæser").textContent = "Denne browser kunne ikke åbne 3D. Prøv Safari eller Chrome med 3D slået til.";
  throw new Error("3D kunne ikke åbnes");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobil ? 1 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;                    // filmfarverne lægges på i efterbehandlingen
const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.15, 900);
const efter = new Efterbehandling(renderer, { bloom: true, samples: mobil ? 0 : 4 });
efter.størrelse(innerWidth, innerHeight);
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight); efter.størrelse(innerWidth, innerHeight);
  kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix();
});

// ---------- Tilstanden ----------
let tilstand = "start", bane = null, valgt = null, forsinkelse = 0, lager = {}, slowmo = false, rolig = 0, sprængTid = 0, blink = 0, valgtLadning = null, menuVinkel = 0;
let verden, ruder, dele, effekter, lyd, sprængstof, kam, terræn, lunter, zoneMesh = null, markør = null, ikoner = {};
let naturTid = 0, skredStartet = false, skredMasse = 0, lunteLyd = null;              // lavinen og lunten (se natur())
const skredSted = new THREE.Vector3(), tmpNatur = new THREE.Vector3();

// ---------- Indlæsningen ----------
const status = t => { $("indlæser").textContent = t; };
status("Henter fysikken…");
await startFysik();
nyVerden();
status("Henter fotos af beton, mursten og stål…");
const fotos = await hentFotos(renderer);
status("Henter sprængstoffet…");
const modeller = await hentModeller();
verden = new Verden(scene, renderer, fotos);
await verden.pynt();
ruder = new Ruder(scene);
dele = new Dele(scene, fotos, ruder);
effekter = new Effekter(scene);
lyd = new Lyd();
sprængstof = new Sprængstof({ scene, dele, effekter, lyd, ruder, kamera }, modeller);
terræn = new Terræn(scene, fotos);
lunter = new Lunter({ scene, effekter, sprængstof });
sprængstof.ctx.lunter = lunter; sprængstof.ctx.terræn = terræn;
kam = new Kamera(kamera, $("verden"), { vedTryk, vedHover, vedTegn });
dele.forbered(Object.keys(MATERIALER));
kobl();
lavMarkør();
verden.sætTid("dag");
ikoner = lavIkoner();
bygBane(FRIT, true);
kam.sæt({ mål: [0, 6, 0], yaw: 0.3, pitch: 0.3, afstand: 80 });
tilstand = "menu";
status(mobil ? "Træk med én finger for at kigge rundt, knib med to for at zoome." : "Træk med musen for at kigge rundt, hjulet zoomer.");
$("tilOpgaver").disabled = $("tilFrit").disabled = false;
$("tilOpgaver").textContent = "Opgaver";
visKonto();
requestAnimationFrame(løkke);

// ---------- Hændelser fra delene, ruderne og fysikken ----------
const STØV = { beton: [0.5, 0.48, 0.45], råbeton: [0.47, 0.45, 0.42], mursten: [0.5, 0.39, 0.33], puds: [0.56, 0.54, 0.5], træ: [0.4, 0.35, 0.29], rødtræ: [0.4, 0.33, 0.29], klippe: [0.46, 0.44, 0.41], sne: [0.9, 0.92, 0.95] };
const GRUS = { beton: 0x8e8a84, råbeton: 0x7a7670, mursten: 0x8e4a36, puds: 0xc8c4bc, træ: 0x6a4a30, rødtræ: 0x7a3022, stål: 0x5a5e64, rødstål: 0x7a3a2a, blik: 0x9a9ea2, tag: 0x4a4e54, klippe: 0x8a8680, sne: 0xf0f4f8 };
function kobl() {
  dele.hændelser.knus = (del, p) => {
    const m = MATERIALER[del.mat];
    effekter.støv(p, del.vol, STØV[del.mat] || STØV.beton, 2.5);
    effekter.smågrus(p, Math.min(12, 3 + Math.round(del.vol * 5)), new THREE.Color(GRUS[del.mat] ?? 0x888888), 3.5);
    lyd.knus(p, m.lyd, del.vol);
  };
  dele.hændelser.løsn = d => { for (const v of d.vinduer) ruder.venter.push({ v, t: Math.random() * 0.3, fra: null }); };
  dele.hændelser.split = (k, c) => {
    lyd.styrt(c, k.masse);
    const liste = [...k.dele], n = Math.min(8, Math.ceil(liste.length / 6));
    for (let i = 0; i < n; i++) {
      const d = liste[Math.floor(Math.random() * liste.length)];
      const { p } = dele.sted(d, new THREE.Vector3());
      p.y = Math.min(p.y, 1.5);
      effekter.støv(p, Math.min(60, k.masse / 2400 / n * 3), STØV[d.mat] || STØV.beton, 5);
    }
  };
  dele.hændelser.stød = (d, kraft) => {
    const { p } = dele.sted(d, new THREE.Vector3()), m = MATERIALER[d.mat];
    if (d.masse > 800 && kraft > d.masse * 9.81 * 10) { lyd.styrt(p, d.masse); if (d.masse > 3000) effekter.støv(p.setY(Math.min(p.y, 1)), d.vol * 0.6, STØV[d.mat] || STØV.beton, 3); }
    else lyd.slag(p, m.lyd, Math.min(1, kraft / (d.masse * 9.81 * 30)));
  };
  ruder.vedKnus = (v, fra) => { effekter.glas(v.p, v.normal, v.b, v.h, fra); lyd.glas(v.p); };
}
function vedStød(a, b, kraft) {
  if (a?.def) sprængstof.stød(a, kraft);
  if (b?.def) sprængstof.stød(b, kraft);
  const dA = a?.str ? a : null, dB = b?.str ? b : null;
  if (dA || dB) dele.stød(dA, dB, kraft);
}

// ---------- Byg en opgave ----------
function bygBane(def, baggrund = false) {
  sprængstof.tøm(); lunter.tøm(); terræn.tøm();
  nyVerden();
  skredStartet = false; skredMasse = 0;
  dele.nulstil(); ruder.tøm(); effekter.tøm();
  lyd.stopLøkker?.();
  if (zoneMesh) { scene.remove(zoneMesh); zoneMesh = null; }
  const tid = verden.sætTid(def.tid);
  verden.sætUnderlag(def.underlag ?? "sand");
  terræn.byg(TERRÆN[def.terræn]);
  effekter.lysFra(verden.sol, verden.solRetning, new THREE.Color(tid.himmel), new THREE.Color(tid.tåge), tid.tæthed);
  efter.eksponering = tid.eksponering;
  def.byg({ dele, ruder, sprængstof, terræn });
  for (const b of dele.bygninger) for (const d of b.dele) d.original = true;
  if (def.zone) lavZone(def.zone);
  lager = { ...def.værktøj };
  valgt = null; valgtLadning = null; slowmo = false; rolig = 0; sprængTid = 0;
  $("slowmo").setAttribute("aria-pressed", "false");
  if (!baggrund) kam.sæt(def.kamera);
  try { renderer.compile(scene, kamera); } catch (_) { /* skærmkortet bygger resten, når det tegnes */ }
}
// Det grønne felt, hvor noget skal lande
function lavZone([x0, z0, x1, z1]) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(60,200,90,0.22)"; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(120,255,140,0.9)"; g.lineWidth = 6; g.setLineDash([14, 10]); g.strokeRect(3, 3, 122, 122);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  zoneMesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false }));
  zoneMesh.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2); zoneMesh.renderOrder = 2;
  scene.add(zoneMesh);
}

// ---------- Ikonerne til værktøjskassen: modellerne fotograferet i et lille studie ----------
function lavIkoner() {
  const ud = {}, str = 128;
  const rt = new THREE.WebGLRenderTarget(str, str, { samples: 4 });
  const studie = new THREE.Scene();
  studie.environment = scene.environment;
  studie.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 3); sol.position.set(2, 4, 3); studie.add(sol);
  const k = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const før = renderer.getClearColor(new THREE.Color()), førA = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0);
  const px = new Uint8Array(str * str * 4), c = document.createElement("canvas"); c.width = c.height = str;
  const g = c.getContext("2d"), billede = g.createImageData(str, str);
  for (const [type, def] of Object.entries(SPRÆNGSTOF)) {
    const m = modeller[def.model].clone(true);
    const box = new THREE.Box3().setFromObject(m), s = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const skala = 1 / Math.max(s.x, s.y, s.z);
    m.scale.setScalar(skala); m.position.copy(mid).multiplyScalar(-skala);
    studie.add(m);
    k.position.set(1.35, 1.05, 1.6); k.lookAt(0, 0, 0);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(studie, k);
    renderer.readRenderTargetPixels(rt, 0, 0, str, str, px);
    for (let y = 0; y < str; y++) for (let x = 0; x < str; x++) {
      const i = ((str - 1 - y) * str + x) * 4, j = (y * str + x) * 4, a = px[j + 3] / 255;
      for (let ch = 0; ch < 3; ch++) { const v = px[j + ch] / 255 / Math.max(a, 1e-3); billede.data[i + ch] = Math.min(255, Math.pow(v / (1 + v * 0.35), 1 / 2.2) * 290); }
      billede.data[i + 3] = px[j + 3];
    }
    g.putImageData(billede, 0, 0);
    ud[type] = c.toDataURL();
    studie.remove(m);
  }
  renderer.setRenderTarget(null); renderer.setClearColor(før, førA);
  rt.dispose();
  return ud;
}

// ---------- Markøren, der viser hvor ladningen kommer til at sidde ----------
function lavMarkør() {
  markør = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 32), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.9, depthTest: false, fog: false }));
  markør.renderOrder = 20; markør.visible = false;
  scene.add(markør);
}
function vedHover(x, y) {
  if (tilstand !== "placering" || !valgt) { markør.visible = false; return; }
  const { fra, retning } = kam.stråle(x, y), t = stråle(fra, retning, 500);
  if (!t) { markør.visible = false; return; }
  const def = SPRÆNGSTOF[valgt];
  const ok = def.fast ? !!(t.ejer?.str && t.ejer.fast) : t.normal.y > 0.55;
  markør.visible = true;
  markør.position.set(t.punkt.x + t.normal.x * 0.02, t.punkt.y + t.normal.y * 0.02, t.punkt.z + t.normal.z * 0.02);
  markør.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(t.normal.x, t.normal.y, t.normal.z));
  markør.material.color.set(ok ? 0xffd23a : 0xff4a3a);
  markør.scale.setScalar(def.fast ? 1 : 2.5);
}

// ---------- Tryk på pladsen: sæt sprængstof, eller vælg en ladning ----------
function vedTryk(x, y) {
  lyd.start();
  if (tilstand !== "placering") return;
  lukPop();
  // tæt på en ladning, der allerede er sat? så vælges den
  const r = $("verden").getBoundingClientRect();
  let bedst = null, bedstA = 30;
  for (const l of sprængstof.alle) {
    if (!l.spiller || !l.mesh || l.væk) continue;
    const p = l.mesh.position.clone().add(new THREE.Vector3(0, 0.15, 0)).project(kamera);
    if (p.z > 1) continue;
    const a = Math.hypot((p.x + 1) / 2 * r.width + r.left - x, (1 - p.y) / 2 * r.height + r.top - y);
    if (a < bedstA) { bedstA = a; bedst = l; }
  }
  if (bedst && (!valgt || bedstA < 18)) { visPop(bedst, x, y); return; }
  const lun = lunter.tætPå(kamera, x, y, r, valgt ? 14 : 22);
  if (lun) { visPop({ lunte: lun }, x, y); return; }
  if (valgt === "lunte") { tip("Træk med fingeren hen over jorden — fra tændingen hen til det, der skal tændes."); return; }
  if (!valgt) { tip("Vælg et sprængstof nederst — og tryk så der, hvor det skal sidde."); return; }
  if (!(lager[valgt] > 0)) { tip("Der er ikke flere af den slags."); return; }
  const { fra, retning } = kam.stråle(x, y), t = stråle(fra, retning, 500);
  if (!t) return;
  const def = SPRÆNGSTOF[valgt];
  if (def.fast) {
    if (!t.ejer?.str || !t.ejer.fast) { tip(`${def.navn} skal sidde på en bygning — tryk på en søjle eller en mur.`); return; }
    sprængstof.sætFast(valgt, t.ejer, t.punkt, t.normal, forsinkelse);
  } else {
    if (t.normal.y < 0.55) { tip(`${def.navn} skal stå på jorden eller på noget fladt.`); return; }
    sprængstof.stil(valgt, t.punkt, { spiller: true, forsinkelse });
  }
  lager[valgt]--;
  lyd.klik();
  visVærktøj();
}
function visPop(l, x, y) {
  valgtLadning = l;
  const pop = $("pop");
  pop.classList.remove("skjult");
  pop.style.left = `${Math.min(innerWidth - 190, Math.max(10, x - 90))}px`;
  pop.style.top = `${Math.max(70, y - 120)}px`;
  if (l.lunte) { pop.querySelector("small").textContent = `LUNTE · ${l.lunte.total.toFixed(1).replace(".", ",")} M`; pop.querySelector(".pop-f").style.display = "none"; return; }
  pop.querySelectorAll("[data-f]").forEach(b => b.classList.toggle("valgt", +b.dataset.f === l.forsinkelse));
  pop.querySelector("small").textContent = l.def.fast || l.def.tænder ? `${l.def.navn.toUpperCase()} · FORSINKELSE` : l.def.navn.toUpperCase();
  pop.querySelector(".pop-f").style.display = l.def.fast || l.def.tænder ? "" : "none";
}
function lukPop() { $("pop").classList.add("skjult"); valgtLadning = null; }
$("pop").querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => {
  if (!valgtLadning) return;
  valgtLadning.forsinkelse = +b.dataset.f; lyd.klik(1.3); lukPop();
}));
$("popFjern").addEventListener("click", () => {
  if (!valgtLadning) return;
  const l = valgtLadning;
  if (l.lunte) { lunter.fjern(l.lunte); lager.lunte = (lager.lunte ?? 0) + l.lunte.total; sprængstof.forbrug -= l.lunte.total * SPRÆNGSTOF.lunte.pris; lyd.klik(0.7); lukPop(); visVærktøj(); return; }
  sprængstof.fjern(l); lager[l.type] = (lager[l.type] ?? 0) + 1;
  lyd.klik(0.7); lukPop(); visVærktøj();
});

// ---------- Lunten: træk med fingeren hen over jorden ----------
function vedTegn(type, x, y) {
  const punkt = () => { const { fra, retning } = kam.stråle(x, y), t = stråle(fra, retning, 500); return t ? new THREE.Vector3(t.punkt.x, t.punkt.y, t.punkt.z) : null; };
  if (type === "start") {
    if (tilstand !== "placering" || valgt !== "lunte" || !(lager.lunte > 0.5)) return false;
    const p = punkt(); if (!p) return false;
    lukPop(); lunter.begynd(p); lyd.start();
    return true;
  }
  if (type === "flyt") { const p = punkt(); if (p) lunter.tilføj(p, lager.lunte); return true; }
  if (type === "slut") {
    const l = lunter.afslut();
    if (l) { lager.lunte = Math.max(0, lager.lunte - l.total); sprængstof.forbrug += l.total * SPRÆNGSTOF.lunte.pris; lyd.klik(); visVærktøj(); }
    return true;
  }
  return false;
}

// ---------- Værktøjskassen nederst ----------
function visVærktøj() {
  const v = $("værktøj"); v.innerHTML = "";
  for (const [type, antal] of Object.entries(lager)) {
    const def = SPRÆNGSTOF[type];
    const b = document.createElement("button");
    b.className = "ting" + (valgt === type ? " valgt" : "");
    b.innerHTML = `<img src="${ikoner[type]}" alt=""><span><b>${def.navn}</b><small>${def.tekst}</small></span><i>${antal === Infinity ? "∞" : type === "lunte" ? `${Math.floor(antal)} m` : antal}</i>`;
    b.disabled = !(antal > (type === "lunte" ? 0.5 : 0));
    b.title = `${def.navn} — ${def.pris} kr`;
    b.addEventListener("click", () => { lyd.start(); valgt = valgt === type ? null : type; lyd.klik(1.2); visVærktøj(); if (valgt) tip(def.lunte ? "Træk med fingeren hen over jorden — lunten tændes, hvor du begynder." : def.fast ? "Tryk på en søjle eller mur, hvor ladningen skal sidde." : "Tryk på jorden, hvor den skal stå."); });
    v.appendChild(b);
  }
  const klar = sprængstof.alle.some(l => l.spiller && (l.def.fast || l.def.tænder)) || lunter.alle.some(l => l.spiller);
  $("tænd").disabled = !klar || tilstand !== "placering";
  if (!valgt) markør.visible = false;
}
$("forsinkelser").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
  forsinkelse = +b.dataset.f;
  $("forsinkelser").querySelectorAll("button").forEach(x => x.classList.toggle("valgt", x === b));
  lyd.klik(1.4);
}));

// ---------- Tændingen: hornet lyder, der tælles ned, og så går det løs ----------
let nedtælling = null;
function tænd() {
  if (tilstand !== "placering") return;
  if (!sprængstof.alle.some(l => l.spiller && (l.def.fast || l.def.tænder)) && !lunter.alle.some(l => l.spiller)) { tip("Sæt mindst én ladning eller lunte først."); return; }
  lyd.start(); lukPop(); valgt = null; visVærktøj(); markør.visible = false;
  tilstand = "nedtælling";
  $("tænd").classList.add("trykket"); $("tænd").disabled = true;
  lyd.horn();
  let n = 3;
  const vis = () => { const e = $("nedtælling"); e.textContent = n; e.classList.remove("puls"); void e.offsetWidth; e.classList.add("puls"); };
  vis();
  nedtælling = setInterval(() => {
    n--;
    if (n === 1) lyd.horn();
    if (n > 0) { vis(); return; }
    clearInterval(nedtælling); nedtælling = null;
    $("nedtælling").textContent = "";
    $("tænd").classList.remove("trykket");
    tilstand = "sprængning"; sprængTid = 0; rolig = 0;
    sprængstof.tænd();
    $("kæde").classList.add("vis");
  }, 1000);
}
$("tænd").addEventListener("click", tænd);
addEventListener("keydown", e => {
  if (e.key === " " && tilstand === "placering") { e.preventDefault(); tænd(); }
  if (e.key.toLowerCase() === "t") skiftSlowmo();
  if (e.key === "Escape") lukPop();
});
function skiftSlowmo() { slowmo = !slowmo; $("slowmo").setAttribute("aria-pressed", String(slowmo)); }
$("slowmo").addEventListener("click", skiftSlowmo);
$("lydKnap").addEventListener("click", () => { lyd.start(); lyd.slå(!lyd.slået); $("lydKnap").textContent = lyd.slået ? "Lyd: fra" : "Lyd: til"; $("lydKnap").setAttribute("aria-pressed", String(lyd.slået)); });
$("nulstil").addEventListener("click", () => { if (bane) startPlacering(bane); });
$("menuKnap").addEventListener("click", () => tilMenu());

// ---------- Faserne ----------
function vis(id) {
  for (const l of ["menu", "opgaver", "brief", "resultat"]) $(l).classList.toggle("skjult", l !== id);
  const iSpil = !id;
  $("top").classList.toggle("skjult", !iSpil && id !== "resultat");
  $("bund").classList.toggle("skjult", !iSpil || tilstand === "resultat");
}
function tilMenu() {
  if (nedtælling) { clearInterval(nedtælling); nedtælling = null; $("nedtælling").textContent = ""; }
  lukPop(); $("kæde").classList.remove("vis");
  if (bane) { bane = null; bygBane(FRIT, true); kam.sæt({ mål: [0, 6, 0], yaw: kam.yaw, pitch: 0.3, afstand: 80 }); }
  tilstand = "menu"; vis("menu"); visKonto();
}
function visKonto() { $("konto").textContent = kr(fremgang.konto || 0); }
function visOpgaver() {
  const l = $("baneliste"); l.innerHTML = "";
  BANER.forEach((b, i) => {
    const st = fremgang[b.id] || 0, låst = i > 0 && !(fremgang[BANER[i - 1].id] > 0) && !debug;
    const e = document.createElement("button");
    e.className = "banekort" + (låst ? " låst" : "");
    e.disabled = låst;
    e.innerHTML = `<span class="nr">${i + 1}</span><span class="tekst"><b>${b.navn}</b><small>${låst ? "Løs den forrige opgave først" : b.kunde}</small></span><span class="st">${"★".repeat(st)}<i>${"★".repeat(3 - st)}</i></span>`;
    e.addEventListener("click", () => { lyd.start(); visBrief(b); });
    l.appendChild(e);
  });
  vis("opgaver");
}
function visBrief(b) {
  $("briefKunde").textContent = `KUNDE: ${b.kunde.toUpperCase()}`;
  $("briefNavn").textContent = b.navn; $("briefTekst").textContent = b.tekst;
  $("briefMål").innerHTML = [...b.mål.map(m => `<li>${m.tekst}</li>`), `<li class="ekstra">★★ Brug højst ${kr(b.budget)} på sprængstof</li>`, b.ekstra ? `<li class="ekstra">★★★ ${b.ekstra.tekst}</li>` : ""].join("");
  $("briefTip").textContent = b.tip || "";
  $("briefStart").onclick = () => startPlacering(b);
  vis("brief");
}
function startPlacering(b) {
  bane = b;
  if (nedtælling) { clearInterval(nedtælling); nedtælling = null; $("nedtælling").textContent = ""; }
  bygBane(b);
  tilstand = "placering";
  $("kunde").textContent = b.kunde.toUpperCase(); $("banenavn").textContent = b.navn;
  $("mål").innerHTML = b.mål.map(m => `<li>${m.tekst}</li>`).join("");
  $("nulstil").classList.toggle("skjult", !b.frit);
  $("kæde").classList.remove("vis"); $("kæde").querySelector("b").textContent = "0";
  vis(null); visVærktøj();
  tip(b.tip || "Vælg et sprængstof nederst.", 7000);
}
function afslut() {
  tilstand = "resultat";
  $("kæde").classList.remove("vis");
  if (bane.frit) { tilstand = "placering"; lager = { ...bane.værktøj }; visVærktøj(); tip("Sæt mere sprængstof — eller tryk ↺ for at bygge det hele op igen."); for (const l of sprængstof.alle) if (l.spiller && l.væk) l.spiller = false; return; }
  const ctx = { dele, sprængstof };
  const res = bane.mål.map(m => ({ m, ...tjek({ ...m, rekt: m.rekt || bane.zone }, ctx) }));
  const løst = res.every(r => r.ok), forbrug = sprængstof.forbrug;
  const ekstra = bane.ekstra ? tjek({ ...bane.ekstra, rekt: bane.zone }, ctx) : { ok: false };
  const st = løst ? 1 + (forbrug <= bane.budget ? 1 : 0) + (forbrug <= bane.budget && ekstra.ok ? 1 : 0) : 0;
  const honorar = løst ? Math.round(bane.honorar * (0.6 + 0.2 * st)) : 0;
  const før = fremgang[bane.id] || 0;
  if (st > før) { fremgang.konto = (fremgang.konto || 0) + honorar - (fremgang[`${bane.id}-kr`] || 0); fremgang[`${bane.id}-kr`] = honorar; fremgang[bane.id] = st; gem(); }
  $("resNavn").textContent = løst ? `${bane.navn}: opgaven er løst` : `${bane.navn}: ikke helt`;
  $("stjerner").innerHTML = [0, 1, 2].map(i => `<span class="${i < st ? "fuld" : ""}">★</span>`).join("");
  $("resMål").innerHTML = [...res.map(r => `<li class="${r.ok ? "ok" : "nej"}">${r.m.tekst} <small>${r.tal}</small></li>`),
    `<li class="${forbrug <= bane.budget ? "ok" : "nej"}">Højst ${kr(bane.budget)} sprængstof <small>${kr(forbrug)}</small></li>`,
    bane.ekstra ? `<li class="${ekstra.ok ? "ok" : "nej"}">${bane.ekstra.tekst} <small>${ekstra.tal ?? ""}</small></li>` : ""].join("");
  $("resTal").innerHTML = `<dt>Sprængninger</dt><dd>${sprængstof.sprængninger}</dd><dt>I kæden</dt><dd>${sprængstof.kæde}</dd><dt>Honorar</dt><dd>${kr(honorar)}</dd>`;
  const i = BANER.indexOf(bane);
  $("resNæste").style.display = løst && i < BANER.length - 1 ? "" : "none";
  vis("resultat");
}
$("tilOpgaver").addEventListener("click", () => { lyd.start(); visOpgaver(); });
$("tilFrit").addEventListener("click", () => { lyd.start(); startPlacering(FRIT); });
$("resIgen").addEventListener("click", () => startPlacering(bane));
$("resNæste").addEventListener("click", () => { const i = BANER.indexOf(bane); visBrief(BANER[i + 1]); });
$("resSe").addEventListener("click", () => { for (const l of ["resultat"]) $(l).classList.add("skjult"); $("top").classList.remove("skjult"); tip("Kig dig omkring. Tryk ☰ for menuen."); });
document.querySelectorAll(".tilbage").forEach(b => b.addEventListener("click", () => { const til = b.dataset.til; if (til === "opgaver") { if (tilstand === "resultat") tilMenu(); visOpgaver(); } else tilMenu(); }));

// En kort besked midt på skærmen
let tipTid = null;
function tip(t, ms = 4000) {
  const e = $("tip"); e.textContent = t; e.classList.add("vis");
  clearTimeout(tipTid); tipTid = setTimeout(() => e.classList.remove("vis"), ms);
}

// ---------- Etiketter med forsinkelsen over ladningerne ----------
const etiketPulje = [];
function visEtiketter() {
  const rod = $("etiketter");
  let n = 0;
  if (tilstand === "placering") for (const l of sprængstof.alle) {
    if (!l.spiller || l.væk || !l.mesh || !(l.def.fast || l.def.tænder) || !l.forsinkelse) continue;
    const p = l.mesh.position.clone().add(new THREE.Vector3(0, 0.3, 0)).project(kamera);
    if (p.z > 1) continue;
    let e = etiketPulje[n]; if (!e) { e = document.createElement("span"); rod.appendChild(e); etiketPulje.push(e); }
    e.style.display = ""; e.textContent = `${String(l.forsinkelse).replace(".", ",")} s`;
    e.style.transform = `translate(${(p.x + 1) / 2 * innerWidth}px, ${(1 - p.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
    n++;
  }
  for (let i = n; i < etiketPulje.length; i++) etiketPulje[i].style.display = "none";
}

// ---------- Løkken: fysik, effekter og tegning ----------
let sidst = performance.now(), kædeVist = 0, støvTæller = 0;
function natur(dt) {
  naturTid -= dt; if (naturTid > 0) return; naturTid = 0.1;
  let masse = 0, n = 0, sne = 0;
  skredSted.set(0, 0, 0);
  for (const d of dele.levende) {
    if (d.væk || (d.mat !== "sne" && d.mat !== "klippe" && !terræn.vand)) continue;
    const krop = d.klynge ? d.klynge.krop : d.krop;
    if (!krop || krop.isSleeping() || krop.isFixed()) continue;
    const v = krop.linvel(), fart = Math.hypot(v.x, v.y, v.z);
    if ((d.mat === "sne" || d.mat === "klippe") && fart > 1.5) {
      const { p } = dele.sted(d, tmpNatur);
      masse += d.masse; skredSted.add(p); n++;
      if (d.mat === "sne") { sne++; if (Math.random() < (mobil ? 0.12 : 0.25)) effekter.pudder(p, fart); }
      else if (Math.random() < 0.08) effekter.støv(p, 0.6, STØV.klippe, 2);
    }
    if (terræn.vand && !d.plasket && v.y < -2) {
      const { p } = dele.sted(d, tmpNatur);
      if (terræn.iVand(p)) { d.plasket = true; effekter.plask(p, d.vol, terræn.vand.y); lyd.plask(p, d.vol); }
    }
  }
  skredMasse = masse;
  if (n) skredSted.divideScalar(n);
  if (masse > 30000 && !skredStartet) { skredStartet = true; lyd.skred(skredSted, sne > n / 2); }
}
function trin(dt) {
  const dtS = dt * (slowmo ? 0.22 : 1);
  if (tilstand !== "menu" || true) fysikTrin(dtS, vedStød, () => dele.efterTrin());
  dele.synk(); dele.ryd();
  lunteLyd = lunter.opdater(dt * (slowmo ? 0.22 : 1));
  if (tilstand === "sprængning" || tilstand === "resultat") natur(dt);
  sprængstof.opdater(dtS);
  sprængstof.varme(effekter.ilde, dtS);
  ruder.opdater(dtS);
  effekter.opdater(dtS, kamera);
  if (tilstand === "sprængning") {
    sprængTid += dtS;
    støvTæller -= dt;
    if (støvTæller <= 0) {
      støvTæller = 0.25;
      let bevæger = 0;
      for (const d of dele.levende) { const k = d.klynge ? d.klynge.krop : d.krop; if (k && !k.isSleeping() && !k.isFixed()) { const v = k.linvel(); if (v.x * v.x + v.y * v.y + v.z * v.z > 0.5) bevæger++; } if (bevæger > 4) break; }
      const stille = !sprængstof.aktiv() && bevæger <= 4 && performance.now() - sprængstof.sidsteBrag > 1500;
      rolig = stille ? rolig + 0.25 : 0;
      if (rolig >= 2.2 || sprængTid > 45) afslut();
    }
  }
}
let fejl = [];
function løkke(t) {
  requestAnimationFrame(løkke);
  try { billede(t); } catch (e) { vedFejl(e); }
}
// Går noget galt, vises en kort besked, og spillet kører videre. Bliver det ved, kan opgaven bygges op igen.
function vedFejl(e) {
  console.error(e);
  const nu = performance.now();
  fejl = fejl.filter(t => nu - t < 3000); fejl.push(nu);
  if (fejl.length === 1) tip(`Ups — der skete en fejl (${e?.message ?? e}). Tryk ↺ eller ☰ for at prøve igen.`, 9000);
  if (fejl.length > 90 && bane && tilstand !== "menu") { fejl = []; tip("Byggepladsen blev bygget op igen efter en fejl.", 6000); startPlacering(bane); }
}
function billede(t) {
  const dt = Math.min(0.05, (t - sidst) / 1000); sidst = t;
  trin(dt);
  // menuen: kameraet glider langsomt rundt om pladsen
  if (tilstand === "menu") { menuVinkel += dt * 0.05; kam.yaw += dt * 0.05; }
  kam.opdater(dt, effekter.ryst);
  const e = kamera.matrixWorld.elements;
  lyd.sætLytter(kamera.position, { x: e[0], y: e[1], z: e[2] });
  // lyden af ild og susende gas
  if (lyd.ctx) {
    let nær = null, a = 1e9;
    for (const f of effekter.ilde) { const x = f.p.distanceTo(kamera.position); if (x < a) { a = x; nær = f; } }
    lyd.løkke("ild", nær ? Math.min(1, 0.25 + effekter.ilde.length * 0.1) : 0, nær ? nær.p : null);
    const gas = sprængstof.gasStyrke();
    lyd.løkke("gas", gas ? 0.9 : 0, gas);
    lyd.løkke("lunte", lunteLyd ? 0.55 : 0, lunteLyd, "gnist", 1.6);
    lyd.løkke("lavine", Math.min(1, skredMasse / 120000), skredMasse > 0 ? skredSted : null, "lavine");
  }
  verden.følg(kam.vis.mål);
  // et kort hvidt blink i billedet ved meget store, tætte sprængninger
  blink = Math.max(blink * Math.exp(-dt * 10), effekter.ryst > 1 ? (effekter.ryst - 1) * 0.6 : 0);
  efter.blink = blink;
  efter.tegn(scene, kamera, t / 1000);
  if (sprængstof.kæde !== kædeVist) { kædeVist = sprængstof.kæde; const k = $("kæde").querySelector("b"); k.textContent = kædeVist; k.classList.remove("puls"); void k.offsetWidth; k.classList.add("puls"); }
  visEtiketter();
}

// ---------- Fejlfinding: ?debug giver window.nd ----------
if (debug) {
  window.nd = {
    THREE, dele, sprængstof, effekter, lyd, fysik, kam, scene, renderer, kamera, BANER, lunter, terræn,
    bane: id => startPlacering(BANER.find(b => b.id === id) || FRIT),
    tænd: () => { tilstand = "sprængning"; sprængTid = 0; rolig = 0; sprængstof.tænd(); },
    spol: (sek, skridt = 1 / 60) => { for (let i = 0; i < sek / skridt; i++) trin(skridt); },
    tegn: () => efter.tegn(scene, kamera, performance.now() / 1000),
    get tilstand() { return tilstand; },
  };
}
