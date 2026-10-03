import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { lås } from "../laas.js";
import { BILER, DELE, GARAGE, gulv, MISSIONER, OPGRADERINGER, RUTER } from "./verden-data.js";
import { kør, nyBil } from "./fysik.js";
import { gem, hent, nyFremgang, opgrader } from "./fremgang.js";
import { næsteMål as hentNæsteMål, opdaterOpgave } from "./missioner.js";
import { styring } from "./styring.js";
import { lyd } from "./lyd.js";
import { planlægRute, næsteVejpunkt, rutemarkører, redningspunkt } from './gps.js';
import { hentValg, gemValg } from './indstillinger.js';
import { brugerflade } from './brugerflade.js';
import { skabLiv } from './liv.js';

const el = (id) => document.getElementById(id);
const mobil = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
let fremgang = hent(), bil = nyBil(), startet = false, pauset = true, tid = 0, opsparing = 0, hudTid = 0, beskedTid = 0;
const løbende = { hopKlar: false };
const styr = styring(), lyde = lyd(), modeller = new Map();
let bilModel, hjul = [], verden, gemmer = true, ruteTid = 0, rute, navigation, depot;
const valg = hentValg();
let senestePosition = fremgang.position, rotorer = [];

// En begrænset opløsning og få materialer holder den store verden let på telefoner.
const renderer = new THREE.WebGLRenderer({ canvas: el("verden"), antialias: !mobil, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobil ? 1.4 : 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = !mobil;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc2a987);
scene.fog = new THREE.FogExp2(0xc2a987, .0017);
const kamera = new THREE.PerspectiveCamera(58, 1, .15, 1250);
scene.add(new THREE.HemisphereLight(0xe1e9dc, 0x8b613e, 2.2));
const sol = new THREE.DirectionalLight(0xffddb0, 3.1);
sol.position.set(-130, 160, 75);
scene.add(sol);
scene.add(sol.target);
sol.castShadow = !mobil;
sol.shadow.mapSize.set(1024, 1024);
sol.shadow.camera.left = -35;
sol.shadow.camera.right = 35;
sol.shadow.camera.top = 35;
sol.shadow.camera.bottom = -35;
sol.shadow.camera.near = 1;
sol.shadow.camera.far = 300;
sol.shadow.bias = -.0007;

// Missionens port og reservedelene er de eneste bevægelige ting i landskabet.
const målgruppe = new THREE.Group();
scene.add(målgruppe);
const målmateriale = new THREE.MeshStandardMaterial({
  color: 0x55dfcd,
  emissive: 0x196c66,
  emissiveIntensity: 1.2,
  roughness: .4,
});
const målring = new THREE.Mesh(new THREE.TorusGeometry(7, .3, 6, 36), målmateriale);
målring.position.y = 8;
målgruppe.add(målring);
const fodring = new THREE.Mesh(new THREE.TorusGeometry(9, .18, 5, 32), målmateriale);
fodring.rotation.x = Math.PI / 2;
fodring.position.y = .3;
målgruppe.add(fodring);
const målstråle = new THREE.Mesh(
  new THREE.CylinderGeometry(.25, .25, 70, 6),
  new THREE.MeshBasicMaterial({ color: 0x74eadc, transparent: true, opacity: .25, depthWrite: false }),
);
målstråle.position.y = 35;
målgruppe.add(målstråle);
const delgruppe = new THREE.Group();
scene.add(delgruppe);
const stormlys = new THREE.Group();
stormlys.position.set(346, 110, 19);
stormlys.visible = false;
scene.add(stormlys);
const stormmateriale = new THREE.MeshBasicMaterial({ color: 0xffde92, transparent: true, opacity: .7, depthWrite: false });
const stormhalo = new THREE.Mesh(new THREE.TorusGeometry(15, .45, 6, 40), stormmateriale);
stormhalo.rotation.x = Math.PI / 2;
stormlys.add(stormhalo);
const stormsøjle = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1.8, 115, 8),
  new THREE.MeshBasicMaterial({ color: 0xffda86, transparent: true, opacity: .22, depthWrite: false }),
);
stormsøjle.position.y = 57;
stormlys.add(stormsøjle);
const delmateriale = new THREE.MeshStandardMaterial({
  color: 0xffc36a,
  emissive: 0x7b4200,
  emissiveIntensity: .65,
  metalness: .6,
  roughness: .5,
});
const tandGeometri = new THREE.BoxGeometry(.6, .5, .55), tandMatrix = new THREE.Object3D();
const delmodeller = DELE.map((del) => {
  const g = new THREE.Group(), tandhjul = new THREE.Mesh(new THREE.TorusGeometry(1.1, .36, 6, 12), delmateriale);
  g.add(tandhjul);
  const tænder = new THREE.InstancedMesh(tandGeometri, delmateriale, 8);
  for (let i = 0; i < 8; i++) {
    const v = i * Math.PI / 4;
    tandMatrix.position.set(Math.cos(v) * 1.45, Math.sin(v) * 1.45, 0);
    tandMatrix.rotation.z = v;
    tandMatrix.updateMatrix();
    tænder.setMatrixAt(i, tandMatrix.matrix);
  }
  g.add(tænder);
  g.position.set(del.x, 2.4, del.z);
  delgruppe.add(g);
  return g;
});
// Støv bruger ét enkelt punktmesh og genbrugte punkter.
const støvAntal = mobil ? 35 : 70, støvData = new Float32Array(støvAntal * 3), støvLiv = new Float32Array(støvAntal);
const støvGeometri = new THREE.BufferGeometry();
støvGeometri.setAttribute("position", new THREE.BufferAttribute(støvData, 3));
const støv = new THREE.Points(
  støvGeometri,
  new THREE.PointsMaterial({ color: 0xc99e66, size: 1.3, transparent: true, opacity: .32, depthWrite: false }),
);
scene.add(støv);
let støvIndeks = 0;

function besked(tekst, sekunder = 4) {
  el("besked").textContent = tekst;
  el("besked").classList.add("vis");
  beskedTid = sekunder;
}
// Position gemmes kun med hjulene på en sikker støtteflade.
function gemNu() {
  if (startet && bil.påJord) {
    senestePosition = { x: bil.x, y: bil.y, z: bil.z, vinkel: bil.vinkel };
  }
  if (senestePosition) fremgang.position = senestePosition;
  const før = gemmer; gemmer = gem(fremgang);
  if (før && !gemmer && startet) besked('Denne browser kan ikke gemme. Turen fortsætter, så længe siden er åben.', 7);
  return gemmer;
}
function aktuelMission() {
  return MISSIONER[fremgang.mission];
}
function næsteMål() {
  return hentNæsteMål(fremgang);
}
function sætBil(id) {
  if (bilModel) scene.remove(bilModel);
  bilModel = modeller.get(id).clone(true);
  scene.add(bilModel);
  hjul = [];
  bilModel.traverse((o) => {
    if (o.name.startsWith("hjul_")) {
      // Drej først omkring bilens lodrette akse, så det rullende hjul ikke vipper i sving.
      o.rotation.order = 'YXZ';
      hjul.push({ o, forhjul: o.name.includes("_for_"), rul: 0 });
    }
    if (o.isMesh) {
      o.castShadow = !mobil;
      o.receiveShadow = !mobil;
    }
  });
  fremgang.bil = id;
  opdaterBil(0);
  anvendValg();
  gemNu();
}
function opdaterBil(dt) {
  if (!bilModel) return;
  bilModel.position.set(bil.x, bil.y - .8, bil.z);
  bilModel.rotation.y = bil.vinkel;
  bilModel.rotation.z = -bil.drej * Math.min(Math.abs(bil.fart) / 25, 1) * .04;
  bilModel.rotation.x = bil.påJord ? Math.atan2(bil.vy, Math.max(4, Math.abs(bil.fart))) * .65 : -.07;
  for (const h of hjul) {
    h.rul += bil.fart * dt / .64;
    h.o.rotation.x = h.rul;
    h.o.rotation.y = h.forhjul ? bil.drej * .37 : 0;
  }
}
function gensæt(hjem = false) {
  const mål = hjem ? GARAGE : redningspunkt(bil) || GARAGE;
  bil = { ...nyBil(), x: mål.x, z: mål.z, y: gulv(mål.x, mål.z, (mål.y || 0) + .8).y + .8, vinkel: mål.vinkel ?? Math.PI, nitro: 1 };
  styr.ryd();
  løbende.hopKlar = false;
  løbende.rampeForsøg = false;
  løbende.rampeTilgang = false;
  ruteTid = 0;
  kamera.position.set(bil.x, bil.y + 7, bil.z + 15);
  if (startet) besked(hjem ? "Bilen er tilbage ved den blå garage." : "Bilen står sikkert på vejen igen.");
}
// Opgaver kræver, at bilen faktisk når frem, følger porte eller gennemfører et hop.
function opdaterMission(dt) {
  const mission = aktuelMission();
  for (const hændelse of opdaterOpgave(fremgang, bil, løbende, dt)) {
    gemNu(); ruteTid = 0;
    lyde.klang(hændelse.type === "færdig");
    besked(hændelse.tekst, hændelse.type === "færdig" ? 3 : 2);
    if (hændelse.type === "færdig") {
      løbende.rampeTilgang = false;
      pauset = true; styr.sætAktiv(false); opsparing = 0;
      ui.klaret(mission);
    }
  }
}

// Blå vejvisere er ét instansmesh. GPS følger vejene og deres virkelige niveau.
const pilGeometri = new THREE.BufferGeometry();
pilGeometri.setAttribute('position', new THREE.Float32BufferAttribute([-1.6,0,-1,0,0,1.8,1.6,0,-1], 3));
pilGeometri.computeVertexNormals();
const vejvisere = new THREE.InstancedMesh(pilGeometri, new THREE.MeshBasicMaterial({ color: 0x53d8c5, transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false }), 35);
vejvisere.frustumCulled = false; vejvisere.count = 0; scene.add(vejvisere);
const markørMatrix = new THREE.Object3D();
function opdaterRute() {
  const mål = næsteMål(), hop = aktuelMission()?.type === 'hop';
  if (hop && Math.hypot(bil.x - 28, bil.z + 34) < 20) løbende.rampeTilgang = true;
  if (hop && løbende.rampeTilgang && bil.x > 170 && bil.påJord) løbende.rampeTilgang = false;
  if (hop && løbende.rampeTilgang) {
    rute = { punkter: [{ x: bil.x, y: bil.y - .8, z: bil.z }, { x: 75, y: 6, z: -29 }, { x: 125, y: 0, z: -29 }], længde: Math.hypot(bil.x - 125, bil.z + 29), navn: 'Stuntvejen' };
  } else rute = planlægRute(bil, hop ? { x: 28, z: -34, y: 0 } : mål);
  navigation = næsteVejpunkt(rute, bil);
  const markører = rutemarkører(rute);
  vejvisere.count = markører.length; vejvisere.visible = valg.gps && startet;
  markører.forEach((p, i) => {
    markørMatrix.position.set(p.x, gulv(p.x, p.z, p.y + .8).y + .22, p.z);
    markørMatrix.rotation.set(0, p.vinkel, 0); markørMatrix.updateMatrix();
    vejvisere.setMatrixAt(i, markørMatrix.matrix);
  });
  vejvisere.instanceMatrix.needsUpdate = true;
}
function opdaterHud() {
  const m = aktuelMission(), mål = næsteMål(), afstand = Math.hypot(bil.x - mål.x, bil.z - mål.z);
  el("mål-navn").textContent = m?.navn || "Dalen lyser igen";
  el("mål-tekst").textContent = m?.type === 'hop' ? (løbende.rampeTilgang ? 'Hold lige · mindst 55 km/t · brug nitro' : 'Følg GPS til tilløbet vest for rampen') : navigation ? `${navigation.tekst} · ${rute.navn}` : m?.kort || 'Udforsk frit og byg videre i garagen.';
  el("antal").textContent = m ? `${fremgang.mission + 1}/8` : "8/8";
  el("skrot").textContent = fremgang.skrot;
  el("mål-afstand").textContent = `${Math.round(rute?.længde || afstand)} m`;
  const retning = navigation?.vinkel ?? Math.atan2(mål.x - bil.x, mål.z - bil.z) - bil.vinkel;
  el("pil").style.transform = `rotate(${retning}rad)`;
  el("fart").textContent = Math.round(Math.abs(bil.fart) * 3.6);
  el("nitro-fyld").style.width = `${bil.nitro * 100}%`;
  el("mission-status").textContent = m?.type === "dele"
    ? `${fremgang.dele.length}/3 dele`
    : m?.type === "løb"
    ? `${fremgang.port}/5 porte${fremgang.løbStart ? ` · ${Math.max(0, 100 - fremgang.løbTid).toFixed(0)} s` : ""}`
    : m?.type === "porte"
    ? `${fremgang.port}/3 signaler`
    : m?.type === 'hop'
    ? (!bil.påJord && løbende.rampeForsøg ? `Hop ${bil.luftTid.toFixed(2)} / 0,55 s` : Math.abs(bil.fart) * 3.6 >= 55 ? 'Fart klar · hold lige' : 'Tilløb fra vest · mindst 55 km/t')
    : m?.type === 'levering'
    ? `Last: ${m.id === 'levering' ? 'reservedele' : m.id === 'sol' ? 'batteri' : 'stormlygte'}`
    : m?.type === 'besøg'
    ? `Højde ${Math.round(Math.max(0, bil.y - .8))} / 72 m`
    : "";
  el("område").textContent = bil.y > 40
    ? "BJERGPASSET"
    : bil.z < -115
    ? "RUSTBYEN"
    : Math.hypot(bil.x - GARAGE.x, bil.z - GARAGE.z) < 70
    ? "DEN BLÅ GARAGE"
    : "ØRKENENS VEJE";
  målgruppe.position.set(mål.x, (mål.y || 0) + .3, mål.z);
  målgruppe.visible = m?.type !== "dele";
  stormlys.visible = fremgang.mission === MISSIONER.length;
  delmodeller.forEach((g, i) => {
    g.visible = m?.type === "dele" && !fremgang.dele.includes(i);
  });
  tegnKort(mål);
}

// Kortet viser hele vejnettet. Den orange trekant vender som bilen.
const kort = el("kort").getContext("2d");
function tegnKort(mål, kontekst = kort, størrelse = 220) {
  const kort = kontekst;
  kort.save(); kort.scale(størrelse / 220, størrelse / 220);
  const px = (x) => 110 + x * .235, pz = (z) => 110 + z * .235;
  kort.clearRect(0, 0, 220, 220);
  kort.strokeStyle = "#2b5554";
  kort.lineWidth = 1;
  for (let i = 20; i < 220; i += 40) {
    kort.beginPath();
    kort.moveTo(i, 0);
    kort.lineTo(i, 220);
    kort.moveTo(0, i);
    kort.lineTo(220, i);
    kort.stroke();
  }
  kort.strokeStyle = "#95aea4";
  kort.lineWidth = 3;
  kort.lineJoin = "round";
  for (const r of RUTER) {
    kort.beginPath();
    r.punkter.forEach((p, i) => i ? kort.lineTo(px(p[0]), pz(p[2])) : kort.moveTo(px(p[0]), pz(p[2])));
    kort.stroke();
  }
  if (rute) {
    kort.strokeStyle = '#60e7d2'; kort.lineWidth = 4;
    kort.beginPath(); rute.punkter.forEach((p, i) => i ? kort.lineTo(px(p.x), pz(p.z)) : kort.moveTo(px(p.x), pz(p.z))); kort.stroke();
  }
  kort.font = "bold 12px system-ui";
  kort.fillStyle = "#d5d5bc";
  for (const [t, x, z] of [["G", -280, 246], ["F", 5, -220], ["S", -100, 212], ["T", 348, 24]]) kort.fillText(t, px(x), pz(z));
  kort.fillStyle = "#69e1d0";
  kort.beginPath();
  kort.arc(px(mål.x), pz(mål.z), 5 + Math.sin(tid * 4) * 1.1, 0, Math.PI * 2);
  kort.fill();
  kort.save();
  kort.translate(px(bil.x), pz(bil.z));
  kort.rotate(-bil.vinkel);
  kort.fillStyle = "#ffb960";
  kort.strokeStyle = "#173334";
  kort.lineWidth = 1.5;
  kort.beginPath();
  kort.moveTo(0, 8);
  kort.lineTo(-5, -5);
  kort.lineTo(5, -5);
  kort.closePath();
  kort.fill();
  kort.stroke();
  kort.restore();
  kort.restore();
}

// Menuer stopper fysisk tid og alle holdte knapper, også med flere fingre på skærmen.
const ui = brugerflade({
  fremgang: () => fremgang, startet: () => startet, valg: () => valg,
  hjemme: () => Math.hypot(bil.x - GARAGE.x, bil.z - GARAGE.z) < 60,
  gem: gemNu, gemValg,
  pause: værdi => { pauset = værdi || !startet; styr.sætAktiv(!pauset); opsparing = 0; gemNu(); },
  bil: sætBil, redning: gensæt, anvendValg,
  opgrader: id => {
    if (!opgrader(fremgang, id)) return false;
    gemNu(); lyde.klang(); besked('Bilen er forbedret. Prøv den på vejen.'); return true;
  },
  nulstil: () => {
    fremgang = nyFremgang(); senestePosition = undefined; sætBil(fremgang.bil);
    gensæt(true); gemNu(); opdaterHud(); besked('Et nyt eventyr begynder ved den blå garage.');
  },
  tegnKort: (kontekst, størrelse) => tegnKort(næsteMål(), kontekst, størrelse),
});
const visPause = ui.pause, visGarage = ui.garage, visHjælp = ui.hjælp, lukDialog = ui.luk;
function anvendValg() {
  const letGrafik = valg.grafik === 'let' || (valg.grafik === 'auto' && mobil);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, letGrafik ? 1 : mobil ? 1.4 : 1.8));
  renderer.shadowMap.enabled = !letGrafik; sol.castShadow = !letGrafik;
  scene.traverse(o => { if (o.isMesh && o !== vejvisere) { o.castShadow = !letGrafik; o.receiveShadow = !letGrafik; } });
  el('touch-rat').classList.toggle('skjult', valg.styring !== 'rat');
  document.querySelector('.styr').classList.toggle('skjult', valg.styring === 'rat');
  lyde.volumen(valg.lydstyrke);
  vejvisere.visible = valg.gps && startet;
  if (bilModel) bilModel.visible = valg.kamera !== 'motorhjelm';
  ruteTid = 0; størrelse();
}

// Alt vækkes af et tryk på Start; lyden virker derfor også i Safari.
el("start").onclick = () => {
  lyde.start();
  startet = true;
  pauset = false;
  styr.sætAktiv(true);
  el("menu").classList.add("skjult");
  for (const id of ["hud", "kort-panel", "fart-panel", "bund", "touch"]) el(id).classList.remove("skjult");
  if (fremgang.position) {
    bil = { ...nyBil(), ...fremgang.position };
    kamera.position.set(bil.x, bil.y + 7, bil.z + 15);
  } else gensæt(true);
  anvendValg(); opdaterRute(); opdaterHud();
  if (!valg.vistStart) ui.intro();
  else besked('Følg de blå vejvisere. Tryk på kortet for at læse opgaven.', 5);
};
el("pause-knap").onclick = visPause;
el("kort-panel").onclick = ui.kort;
el("garage-knap").onclick = visGarage;
el("hjælp-knap").onclick = visHjælp;
el("start-hjælp").onclick = visHjælp;
el("redning").onclick = () => gensæt();
el("lyd").textContent = lyde.dæmpet ? "Lyd: fra" : "Lyd: til";
el("lyd").onclick = () => {
  lyde.start();
  el("lyd").textContent = lyde.skift() ? "Lyd: fra" : "Lyd: til";
};
window.addEventListener("keydown", (e) => {
  if (!startet) return;
  if (e.key === "Escape") {
    e.preventDefault();
    el("dialog").classList.contains("skjult") ? visPause() : lukDialog();
  }
  if (e.key.toLowerCase() === "r" && !pauset) gensæt();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && startet) visPause();
});
window.addEventListener('blur', () => { if (startet && !pauset) visPause(); });
window.addEventListener("pagehide", gemNu);
function størrelse() {
  renderer.setSize(innerWidth, innerHeight, false);
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
}
window.addEventListener("resize", størrelse);
størrelse();

let før = performance.now(), sidsteTegning = 0;
function ramme(nu) {
  requestAnimationFrame(ramme);
  const dt = Math.min(.06, Math.max(0, (nu - før) / 1000));
  før = nu;
  tid += dt;
  if (startet && !pauset) {
    opsparing += dt;
    while (opsparing >= 1 / 60 && !pauset) {
      const input = styr.hent(); input.drej = Math.max(-1, Math.min(1, input.drej * valg.følsomhed));
      kør(bil, input, fremgang, 1 / 60);
      opdaterMission(1 / 60);
      opsparing -= 1 / 60;
    }
    if (bil.y < -15 || !Number.isFinite(bil.x + bil.z + bil.y)) gensæt();
    depot?.opdater(dt, bil, !pauset);
    opdaterBil(dt);
    const ret = new THREE.Vector3(Math.sin(bil.vinkel), 0, Math.cos(bil.vinkel));
    const bred = valg.kamera === 'udsigt', hood = valg.kamera === 'motorhjelm';
    const afstand = hood ? -1 : (bred ? 19 : 11) + Math.min(5, Math.abs(bil.fart) * .12);
    const kameraMål = new THREE.Vector3(
      bil.x - ret.x * afstand,
      bil.y + (hood ? 1.35 : bred ? 9 : 5.1) + (hood ? 0 : Math.abs(bil.fart) * .055),
      bil.z - ret.z * afstand,
    );
    kameraMål.y = Math.max(kameraMål.y, gulv(kameraMål.x, kameraMål.z, bil.y).y + (hood ? 1.5 : 2.6));
    kamera.position.lerp(kameraMål, 1 - Math.exp(-dt * 5));
    kamera.lookAt(bil.x + ret.x * (hood ? 25 : 6), bil.y + 1.8, bil.z + ret.z * (hood ? 25 : 6));
    sol.position.set(bil.x - 100, bil.y + 140, bil.z + 70);
    sol.target.position.set(bil.x, bil.y, bil.z);
    if (Math.abs(bil.fart) > 5 && bil.påJord) {
      const i = støvIndeks++ % støvAntal;
      støvData[i * 3] = bil.x - ret.x * 2 + (Math.random() - .5) * 2;
      støvData[i * 3 + 1] = bil.y - .2;
      støvData[i * 3 + 2] = bil.z - ret.z * 2;
      støvLiv[i] = .8;
    }
    for (let i = 0; i < støvAntal; i++) {
      if (støvLiv[i] > 0) {
        støvLiv[i] -= dt;
        støvData[i * 3 + 1] += dt * 2;
      } else støvData[i * 3 + 1] = -100;
    }
    støvGeometri.attributes.position.needsUpdate = true;
    ruteTid -= dt;
    if (ruteTid <= 0) { opdaterRute(); ruteTid = 1; }
    hudTid += dt;
    if (hudTid > .1) {
      opdaterHud();
      hudTid = 0;
    }
    if (Math.floor(tid / 5) !== Math.floor((tid - dt) / 5)) gemNu();
  } else if (!startet) {
    kamera.position.set(-306, 12, 198);
    kamera.lookAt(-275, 4, 238);
  }
  if (!pauset) rotorer.forEach((o, i) => o.rotation.z += dt * (.23 + i * .04));
  målring.rotation.y = Math.sin(tid * .65) * .23;
  målring.position.y = 8 + Math.sin(tid * 1.5) * .4;
  delmodeller.forEach((g, i) => {
    g.rotation.y = tid * .6 + i;
    g.position.y = 2.4 + Math.sin(tid * 2 + i) * .25;
  });
  if (beskedTid > 0) {
    beskedTid -= dt;
    if (beskedTid <= 0) el("besked").classList.remove("vis");
  }
  lyde.opdater(bil.fart, startet && !pauset);
  // Stillestående menuer behøver kun 20 billeder/s og bruger mindre batteri på tablets.
  if (!document.hidden && ((!pauset && startet) || nu - sidsteTegning >= 50)) {
    renderer.render(scene, kamera);
    sidsteTegning = nu;
  }
}
requestAnimationFrame(ramme);

async function indlæs() {
  try {
    await lås(el("lås"), "../../index.html");
    const loader = new GLTFLoader();
    const data = await Promise.all(["oerken", "rotten", "buggy", "truck"].map((n) => loader.loadAsync(`modeller/${n}.glb`)));
    verden = data[0].scene;
    scene.add(verden);
    verden.traverse((o) => {
      if (o.isMesh) {
        o.receiveShadow = !mobil;
        o.castShadow = !mobil;
      }
    });
    verden.traverse(o => { if (o.name.startsWith('rotor_')) rotorer.push(o); });
    BILER.forEach((b, i) => modeller.set(b.id, data[i + 1].scene));
    depot = skabLiv(THREE, scene, modeller.get('truck'));
    sætBil(fremgang.bil);
    anvendValg();
    el("start").disabled = false;
    el("start").textContent = gemmer && (fremgang.mission || fremgang.dele.length || fremgang.skrot || fremgang.position)
      ? "Fortsæt mit eventyr →"
      : "Start motoren →";
    el("indlæsning").textContent = gemmer ? "Klar på computer, tablet og telefon · Fremgang gemmes" : "Klar til turen · Denne browser kan ikke gemme";
    opdaterHud();
  } catch (fejl) {
    // En afbrudt modelindlæsning må hverken efterlade aktive fingre eller en kørende bil.
    pauset = true; startet = false; opsparing = 0;
    styr.sætAktiv(false); lyde.opdater(0, false);
    console.error("Skrotstorm kunne ikke indlæses:", fejl);
    el("indlæsning").textContent = "Modellerne kunne ikke hentes. Prøv at åbne spillet igen.";
    el("start").textContent = "Prøv igen";
    el("start").disabled = false;
    el("start").onclick = () => location.reload();
    window.dispatchEvent(new Event('spil-3d-fejl'));
  }
}
indlæs();
