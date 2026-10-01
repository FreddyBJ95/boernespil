// ===== Burgerløbet — saml alt det lækre på vejen, og giv burgeren til kæmpen for enden =====
// Træk fingeren til siden for at styre. Hver ting, man rammer, hopper op på burgeren.
// Kagerrullerne slår de øverste lag af. Ved portene vælger man venstre eller højre.
// Stjerner låser hatte op. Trampoliner sender burgeren op i luften, 🧲 trækker ting til sig, 🛡️ beskytter.
import * as THREE from "./three.js";
import { lavLag, lavLøber, LAG, lavHat, HATTE, lavSkjold, emojiSprite } from "./figurer.js";
import { byggBane, BREDDE, LUFT } from "./bane.js";
import { KÆMPE_EMOJI } from "./kaemper.js";
import * as Lyd from "./lyd.js";

const $ = id => document.getElementById(id);
const klem = (v, a, b) => Math.max(a, Math.min(b, v));
const tilf = (a, b) => a + Math.random() * (b - a);
const blød = p => p * p * (3 - 2 * p);
const FART = 8.5;                           // hvor hurtigt burgeren løber (enheder pr. sekund)
const STJERNER = [1, 12, 25];               // så mange lag giver 1, 2 og 3 stjerner på resultatet
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

// ---------- Det, der huskes på enheden: bane, stjerner og hat ----------
const hent = (navn, standard) => { try { const v = localStorage.getItem(navn); return v === null ? standard : v; } catch (_) { return standard; } };
const gem = (navn, v) => { try { localStorage.setItem(navn, String(v)); } catch (_) {} };
function hentNiveau() {
  const q = parseInt(new URLSearchParams(location.search).get("niveau"), 10);
  return q > 0 ? q : Math.max(1, parseInt(hent("burgerloeb-niveau", "1"), 10) || 1);
}
let stjTotal = parseInt(hent("burgerloeb-stjerner", "0"), 10) || 0;
let hatId = hent("burgerloeb-hat", "kokkehue");
const låstOp = h => stjTotal >= h.stjerner;

// ---------- Tilstand ----------
let niveau = hentNiveau();
let bane = null, løber = null, hat = null, skjold = null, magnetIkon = null;
let tilstand = "start";                     // start · løb · mål · slut
let px = 0, målX = 0, pz = 0, ry = 0, vx = 0, fart = 0, tTid = 0, tid = 0;
let sving = 0, svingV = 0, stakH = 0, iTræk = 0, sidsteSaml = -9, usårlig = 0, ryst = 0, hopY = 0;
let lag = [], flyvende = [], løse = [], krummer = [], glimt = [], antalSamlet = 0;
let stjRun = 0, iStjTræk = 0, sidsteStj = -9, luft = null, magnetTid = 0, harSkjold = false;
let pauset = false;
const kig = new THREE.Vector3();

// ---------- Byg en ny bane ----------
function nyBane() {
  if (bane) scene.remove(bane.gruppe);
  if (løber) scene.remove(løber.gruppe);
  for (const f of [...flyvende, ...løse, ...krummer, ...glimt]) scene.remove(f.m);
  bane = byggBane(scene, niveau);
  løber = lavLøber();
  scene.add(løber.gruppe);
  skjold = lavSkjold(); skjold.visible = false; løber.gruppe.add(skjold);
  magnetIkon = emojiSprite("🧲", 0.9); magnetIkon.visible = false; løber.gruppe.add(magnetIkon);
  sætHat(hatId);
  px = målX = pz = ry = vx = fart = sving = svingV = stakH = 0; iTræk = 0; usårlig = 0; hopY = 0;
  lag = []; flyvende = []; løse = []; krummer = []; glimt = []; antalSamlet = 0;
  stjRun = 0; luft = null; magnetTid = 0; harSkjold = false;
  løber.gruppe.position.set(0, 0, 0); løber.gruppe.scale.setScalar(1); løber.gruppe.rotation.set(0, 0, 0); løber.gruppe.visible = true;
  $("tal").textContent = 0; $("stjTal").textContent = 0;
  $("baneNr").textContent = `Bane ${niveau} · ${KÆMPE_EMOJI[bane.slags]}`;
  $("fremMaal").textContent = KÆMPE_EMOJI[bane.slags];
  lavHatteVælger();
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

// ---------- Hatten oven på burgeren ----------
function sætHat(id) {
  if (hat) løber.stak.remove(hat);
  hatId = id; gem("burgerloeb-hat", id);
  hat = lavHat(id);
  løber.stak.add(hat);
}
// Små billeder af hattene til knapperne (tegnet én gang med en lille 3D-tegner)
const hatBilleder = {};
function hatBillede(id) {
  if (hatBilleder[id]) return hatBilleder[id];
  const mini = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  mini.setSize(96, 96, false);
  const sc = new THREE.Scene(), kam = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x998877, 2.4));
  const lys = new THREE.DirectionalLight(0xffffff, 2); lys.position.set(2, 4, 3); sc.add(lys);
  for (const h of HATTE) {
    const g = new THREE.Group(), top = lavLag("top");
    g.add(top);
    if (h.id !== "ingen") { const hh = lavHat(h.id); hh.position.y = 0.38; g.add(hh); }
    sc.add(g);
    kam.position.set(0, 1.6, 3.3); kam.lookAt(0, 0.55, 0);
    mini.render(sc, kam);
    hatBilleder[h.id] = mini.domElement.toDataURL();
    sc.remove(g);
  }
  mini.dispose();
  return hatBilleder[id];
}
function lavHatteVælger() {
  const boks = $("hatte");
  boks.innerHTML = "";
  $("stjTotal").textContent = stjTotal;
  for (const h of HATTE) {
    const b = document.createElement("button"), åben = låstOp(h);
    b.className = "hat" + (h.id === hatId ? " valgt" : "") + (åben ? "" : " låst");
    b.innerHTML = `<img src="${hatBillede(h.id)}" alt="">` + (åben ? "" : `<small>🔒⭐${h.stjerner}</small>`);
    b.setAttribute("aria-label", h.id);
    b.addEventListener("click", () => {
      if (!åben) { Lyd.hm(); return; }
      Lyd.klar(); Lyd.saml(4); sætHat(h.id);
      boks.querySelectorAll(".hat").forEach(x => x.classList.toggle("valgt", x === b));
    });
    boks.appendChild(b);
  }
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
  hop("taeller");
}
function hop(id) { const el = $(id); el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop"); }
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
  // hatten sidder øverst og svajer med
  const påLåg = lag.length && lag[lag.length - 1].type === "top";   // på toppen af låget sidder hatten lidt nede i kuplen
  hat.position.set(sving * Math.pow(stakH, 1.25) * 0.5, stakH - (påLåg ? 0.12 : -0.02), 0);
  hat.rotation.z = -sving * 0.45;
  if (hat.userData.propel) hat.userData.propel.rotation.y += dt * (tilstand === "løb" ? 18 : 6);
  // skjoldet og magneten følger burgerens højde
  const høj = 0.76 + stakH;
  skjold.position.set(0, høj / 2 + 0.1, 0); skjold.scale.set(1.15, høj / 2 + 0.55, 1.15);
  skjold.material.opacity = 0.22 + Math.sin(tid * 6) * 0.05;
  magnetIkon.position.set(0, høj + 1.1 + Math.sin(tid * 5) * 0.12, 0);
}

// ---------- Stjerner ----------
function samlStjerne(s) {
  s.taget = true;
  stjRun++; iStjTræk = tid - sidsteStj < 1 ? iStjTræk + 1 : 0; sidsteStj = tid;
  Lyd.stjerne(iStjTræk);
  $("stjTal").textContent = stjRun; hop("stjBoks");
  glimt.push({ m: s.m, t: 0 });
}

// ---------- Løbet ----------
function opdaterLøb(dt) {
  if (!luft) fart += (FART - fart) * Math.min(1, dt * 1.5);
  pz -= fart * dt;
  const før = px;
  px += (målX - px) * Math.min(1, dt * 10);
  vx = (px - før) / Math.max(dt, 0.001);
  const skridt = tid * (10 + fart);
  if (luft) {                                 // oppe i luften efter en trampolin: benene spræller
    luft.t += dt / LUFT.tid;
    const p = Math.min(1, luft.t);
    ry = LUFT.højde * 4 * p * (1 - p);
    løber.ben[0].rotation.x = Math.sin(tid * 25) * 0.6 - 0.4; løber.ben[1].rotation.x = -Math.sin(tid * 25) * 0.6 - 0.4;
    if (luft.t >= 1) { luft = null; ry = 0; Lyd.land(); svingV += 0.8; lag.forEach(l => { l.klem = 0.6; }); }
  } else {                                    // benene løber, og burgeren hopper lidt for hvert skridt
    løber.ben[0].rotation.x = Math.sin(skridt) * 0.9; løber.ben[1].rotation.x = -Math.sin(skridt) * 0.9;
    if (Math.sin(skridt) * Math.sin(skridt - dt * (10 + fart)) < 0) Lyd.trin();
    ry = Math.abs(Math.sin(skridt)) * 0.07;
  }
  hopY = Math.max(0, hopY - dt * 6);
  løber.gruppe.position.set(px, ry + Math.sin(hopY * Math.PI) * 0.6, pz);
  løber.gruppe.rotation.z = -vx * 0.01;
  // stakken bøjer sig, når man drejer — og vipper tilbage som gele
  svingV += ((-vx * 0.014 - sving) * 45 - svingV * 7) * dt;
  sving += svingV * dt;
  usårlig = Math.max(0, usårlig - dt);
  løber.gruppe.visible = usårlig <= 0 || Math.floor(usårlig * 12) % 2 === 0;
  // hele burgeren (fra skoene til toppen) kan samle ting op
  const bund = ry - 0.3, top = ry + 0.76 + stakH + 0.6;
  const iHøjde = y => y >= bund && y <= top;

  // saml ting op
  for (const t of bane.ting) {
    if (t.taget || t.z > pz + 2 || t.z < pz - 70) continue;
    t.m.rotation.y += dt * 1.6; t.m.position.y = t.y + Math.sin(tid * 3 + t.z) * 0.12;
    const magnet = magnetTid > 0 && t.z < pz + 1 && t.z > pz - 12 && Math.abs(t.x - px) < 3.6;
    if ((magnet || (Math.abs(t.z - pz) < 0.75 && Math.abs(t.x - px) < 1.05 && iHøjde(t.y))) && lag.length < MAKS_LAG) {
      t.taget = true; if (t.ring) t.ring.visible = false;
      flyvTilStak(t.m, t.type);
    }
  }
  // stjerner
  for (const s of bane.stjerner) {
    if (s.taget || s.z > pz + 2 || s.z < pz - 70) continue;
    s.m.rotation.y += dt * 3;
    const magnet = magnetTid > 0 && s.z < pz + 1 && s.z > pz - 12 && Math.abs(s.x - px) < 3.6;
    if (magnet || (Math.abs(s.z - pz) < 0.8 && Math.abs(s.x - px) < 1.0 && iHøjde(s.y))) samlStjerne(s);
  }
  // trampoliner: burgeren flyver højt op i en bue
  for (const t of bane.trampoliner) {
    t.svaj = Math.max(0, t.svaj - dt * 3);
    t.m.userData.dug.position.y = 0.3 - Math.sin(t.svaj * Math.PI) * 0.18;
    if (!t.brugt && !luft && Math.abs(t.z - pz) < 0.9 && Math.abs(t.x - px) < 1.15 && ry < 0.4) {
      t.brugt = true; t.svaj = 1; luft = { t: 0 }; fart = FART; Lyd.boing();
      lag.forEach(l => { l.klem = 0.8; });
    }
  }
  // bobler med magnet eller skjold
  for (const p of bane.powerups) {
    if (p.taget) continue;
    p.m.position.y = p.y + Math.sin(tid * 3) * 0.15; p.m.rotation.y += dt;
    if (Math.abs(p.z - pz) < 0.85 && Math.abs(p.x - px) < 1.1 && iHøjde(p.y)) {
      p.taget = true; p.m.visible = false; Lyd.power();
      if (p.type === "magnet") magnetTid = 7; else harSkjold = true;
    }
  }
  magnetTid = Math.max(0, magnetTid - dt);
  magnetIkon.visible = magnetTid > 0 && (magnetTid > 1.5 || Math.floor(magnetTid * 6) % 2 === 0);
  skjold.visible = harSkjold;
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
  // kagerullerne: nogle ruller frem og tilbage. Man hopper hen over dem på en trampolin.
  for (const r of bane.ruller) {
    if (r.bevæger) { r.x = Math.sin(tid * r.fart + r.fase) * 2.1; r.m.position.x = r.x; r.m.rotation.x = -r.x / 0.34; }
    if (usårlig <= 0 && ry < 0.6 && Math.abs(r.z - pz) < 0.55 && Math.abs(r.x - px) < r.bredde / 2 + 0.3) {
      if (harSkjold) {                        // skjoldet springer i stedet for burgeren
        harSkjold = false; Lyd.pop(); usårlig = 1; fart *= 0.7; ryst = 0.15;
        for (let i = 0; i < 14; i++) knas(løber.gruppe.position.clone().add(new THREE.Vector3(tilf(-1, 1), tilf(0.3, 1.5), 0)), bobleMat);
      } else {
        Lyd.bonk(); tab(Math.min(3, lag.length)); usårlig = 1.3; fart *= 0.35; hopY = 1; ryst = 0.35;
      }
    }
  }
  if (pz <= -bane.L + 1.5) { sætTilstand("mål"); Lyd.hm(); luft = null; return; }
  // fremskridt øverst
  const p = klem(-pz / bane.L, 0, 1);
  $("fremFyld").style.width = (p * 100).toFixed(1) + "%";
  $("fremMig").style.left = `calc(${(p * 100).toFixed(1)}% - 14px)`;
  $("hint").classList.toggle("skjult", tTid > 3.5);
}

// ---------- Målet: burgeren hopper ind i munden på kæmpen ----------
let hopFra = null, reaktion = false, bøvset = false;
function opdaterMål(dt) {
  const k = bane.kæmpe, M = k.mundPos(), sk = k.gruppe.scale.x;
  const midtH = 0.59 + stakH * 0.5;            // burgerens midte, målt fra skoene
  const mast = Math.min(1, 2.3 / (0.76 + stakH));     // en høj burger bliver mast sammen som en harmonika, så den kan være i munden
  løber.gruppe.position.y = Math.max(0, løber.gruppe.position.y - dt * 8);
  if (tTid < 0.7) {
    // 1) løberen stopper midt på vejen og får låg på, hvis der ikke er et
    fart = Math.max(0, fart - dt * 14); pz -= fart * dt;
    løber.gruppe.position.z = pz;
    px += (0 - px) * Math.min(1, dt * 4); løber.gruppe.position.x = px;
    if (tTid - dt <= 0.05 && tTid > 0.05 && !lag.some(l => l.type === "top")) {
      const top = lavLag("top"); top.position.set(px, 7, pz); scene.add(top); flyvTilStak(top, "top");
    }
    hopFra = null; reaktion = false; bøvset = false;
    k.tilstand.åben = Math.min(1.3, k.tilstand.åben + dt);
  } else if (tTid < 2.2) {
    // 2) hop! i en bue hen foran munden — og så slubret ind gennem den åbne mund
    if (!hopFra) { hopFra = løber.gruppe.position.clone(); Lyd.hop(); }
    const p = klem((tTid - 0.7) / 1.5, 0, 1);
    let sy, sxz;
    if (p < 0.78) {
      const e = blød(p / 0.78);
      sy = 1 + (mast - 1) * e; sxz = 1 - 0.15 * e;
      const mål = new THREE.Vector3(M.x, M.y - midtH * sy, M.z + 0.55 * sk);
      løber.gruppe.position.lerpVectors(hopFra, mål, e);
      løber.gruppe.position.y += Math.sin(e * Math.PI) * (2.4 + stakH * 0.3);
      løber.gruppe.rotation.x = -e * 0.25;
      k.tilstand.åben = 1.3;
    } else {
      const q = (p - 0.78) / 0.22, f = 1 - q * 0.9;
      sy = mast * f; sxz = 0.85 * f;
      løber.gruppe.position.set(M.x, M.y - midtH * sy, M.z + (0.55 - q * 0.9) * sk);
      k.tilstand.åben = q < 0.6 ? 1.3 : 1.3 * (1 - (q - 0.6) / 0.4);
    }
    løber.gruppe.scale.set(sxz, sy, sxz);
    løber.ben.forEach((b, i) => { b.rotation.x = Math.sin(tid * 30 + i * 3) * 1.2; });
  } else if (tTid < 4.5) {
    // 3) gumle gumle
    if (løber.gruppe.visible) { løber.gruppe.visible = false; k.tilstand.åben = 0; k.tilstand.tyg = 1; Lyd.tyg(); k.tilstand.hop = 0.5; }
    if (Math.random() < dt * 16) knas(M.clone().add(new THREE.Vector3(tilf(-1, 1), 0, 0.8)), krummeMat[Math.floor(Math.random() * krummeMat.length)]);
  } else {
    // 4) synke, og så glæde — og en bøvs, hvis burgeren var stor
    if (!reaktion) {
      reaktion = true; k.tilstand.tyg = 0; Lyd.synk();
      setTimeout(() => Lyd.mmm(), 300);
      k.tilstand.glad = 1; k.tilstand.hop = 1;
      k.fedt(Math.min(0.35, antalSamlet * 0.012));
      window.Effekter.stjerner(innerWidth / 2, innerHeight * 0.35, { antal: 16 });
    }
    if (!bøvset && antalSamlet >= 15 && tTid > 5.4) { bøvset = true; Lyd.bøvs(); k.tilstand.åben = 0.9; setTimeout(() => { if (bane) bane.kæmpe.tilstand.åben = 0; }, 700); }
    k.tilstand.hop = Math.max(0, k.tilstand.hop - dt * 0.4);
    if (tTid > (antalSamlet >= 15 ? 6.5 : 5.7)) visResultat();
  }
}
const krummeGeo = new THREE.SphereGeometry(0.12, 6, 5);
const krummeMat = ["#e39a45", "#6b3a1c", "#5fc23a", "#ffc928", "#e0301e"].map(f => new THREE.MeshStandardMaterial({ color: f }));
const bobleMat = new THREE.MeshStandardMaterial({ color: "#bff0ff", transparent: true, opacity: 0.7 });
function knas(pos, materiale) {                 // små stykker, der flyver ud (krummer eller sæbebobler)
  const m = new THREE.Mesh(krummeGeo, materiale);
  m.position.copy(pos); scene.add(m);
  krummer.push({ m, v: new THREE.Vector3(tilf(-3, 3), tilf(2, 6), tilf(1, 4)), liv: 1.2 });
}

function visResultat() {
  sætTilstand("slut");
  const antal = STJERNER.filter(s => antalSamlet >= s).length;
  $("resTal").textContent = antalSamlet;
  $("resStj").textContent = stjRun;
  $("resStjerner").querySelectorAll("span").forEach((s, i) => s.classList.toggle("slukket", i >= antal));
  // stjernerne lægges til, og måske er der en ny hat
  const før = HATTE.filter(låstOp).length;
  stjTotal += stjRun; gem("burgerloeb-stjerner", stjTotal);
  const nye = HATTE.filter(låstOp).slice(før);
  $("nyHat").hidden = !nye.length;
  if (nye.length) $("nyHat").textContent = "Ny hat " + nye.map(h => h.emoji).join(" ");
  gem("burgerloeb-niveau", Math.max(parseInt(hent("burgerloeb-niveau", "1"), 10) || 1, niveau + 1));
  window.Effekter.fanfare();
  if (antal >= 2 || nye.length) window.Effekter.konfetti(innerWidth / 2, innerHeight * 0.3, { antal: 90 });
}

// ---------- Ting der flyver: lag på vej op, lag der falder af, krummer og stjerner ----------
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
  for (const g of glimt) {                   // en taget stjerne hopper op og bliver væk
    g.t += dt / 0.35;
    g.m.position.y += dt * 5; g.m.rotation.y += dt * 20;
    g.m.scale.setScalar(Math.max(0.01, 1 + Math.sin(g.t * Math.PI) * 0.6 - g.t));
    if (g.t >= 1) g.m.visible = false;
  }
  glimt = glimt.filter(g => g.t < 1);
}

// ---------- Kameraet ----------
function opdaterKamera(dt) {
  const ønsket = new THREE.Vector3();
  if (tilstand === "start") {                 // kører langsomt rundt om den lille burger
    const a = tid * 0.35;
    ønsket.set(Math.sin(a) * 4.6, 2.3, pz + Math.cos(a) * 4.6);
    kig.set(0, -1.3, pz);                     // kig et godt stykke under burgeren, så den står over startkortet
  } else if (tilstand === "løb") {
    // kameraet er altid over toppen af burgeren, så man kan se vejen forude — og følger med op i luften
    ønsket.set(px * 0.55, 3.4 + stakH * 1.05 + ry * 0.7, pz + 6.2 + stakH * 0.7);
    kig.set(px * 0.7, 0.9 + stakH * 0.25 + ry * 0.6, pz - 7);
  } else {                                    // skråt forfra, så man ser burgeren hoppe ind i munden
    const M = bane.kæmpe.mundPos();
    ønsket.set(M.x - 5.2, M.y + 2.6 + Math.min(2, stakH * 0.2), M.z + 8.5);
    kig.set(M.x + 0.6, M.y - 0.4, M.z - 1);
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
  if (!pauset) { steg(dt); renderer.render(scene, kamera); }
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
$("hjemKnap").addEventListener("click", () => { niveau++; nyBane(); });   // næste bane, men først startkortet med hattene

nyBane();
requestAnimationFrame(loop);
if (location.search.includes("debug")) window.bl = { get tilstand() { return tilstand; }, get pz() { return pz; }, set pz(v) { pz = v; }, get lag() { return lag; },
  get bane() { return bane; }, get antal() { return antalSamlet; }, get stjerner() { return stjRun; }, set målX(v) { målX = v; }, set pause(v) { pauset = v; }, set skjold(v) { harSkjold = v; },
  get løber() { return løber; }, start, scene, kamera, renderer,
  spol(sek) { for (let i = 0; i < sek * 60; i++) steg(1 / 60); renderer.render(scene, kamera); return tilstand; } };
