import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { lås } from "../laas.js";
import { BaneKamera } from "./kamera.js";
import { BrudEffekter } from "./effekter.js";
import { BrudLyd } from "./lyd.js";
import { opretSimulering } from "./simulering.js";
import { læsOpstilling, pakOpstilling } from "./opsaetning.js";

const $ = (id) => document.getElementById(id);
const klip = (n, a, b) => Math.max(a, Math.min(b, n));
const NØGLE = "brudpunkt-opstilling-v1", VALG = "brudpunkt-valg-v1";
const NAVNE = {
  bil: "Servicebil",
  hus: "Værkstedshus",
  taarn: "Vandtårn",
  celle: "Energicelle",
};
const mobil = matchMedia("(pointer:coarse)").matches || innerWidth < 900;
let indstillinger = {
  grafik: "auto",
  lyd: true,
  rolig: matchMedia("(prefers-reduced-motion: reduce)").matches,
};
try {
  const v = JSON.parse(localStorage.getItem(VALG) || "{}");
  if (["auto", "let", "flot"].includes(v.grafik)) {
    indstillinger.grafik = v.grafik;
  }
  if (typeof v.lyd === "boolean") indstillinger.lyd = v.lyd;
  if (typeof v.rolig === "boolean") indstillinger.rolig = v.rolig;
} catch { /* Browseren kan afslå at huske valg. */ }

// Spillet bruger den samme voksenlås som Spilkassens øvrige store 3D-spil.
await lås($("laas"));
$("indlaesning").textContent = "Bygger modeller, lys og fysik …";
const renderer = new THREE.WebGLRenderer({
  canvas: $("verden"),
  antialias: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#c5c9b7");
scene.fog = new THREE.Fog("#c4c5ae", 75, 170);
const kamera = new THREE.PerspectiveCamera(
  46,
  innerWidth / innerHeight,
  .12,
  230,
);
scene.add(new THREE.HemisphereLight("#d8e7ed", "#827456", 1.5));
const sol = new THREE.DirectionalLight("#ffe1a2", 3.3);
sol.position.set(-24, 36, 21);
sol.castShadow = true;
Object.assign(sol.shadow.camera, {
  left: -36,
  right: 36,
  top: 36,
  bottom: -36,
  near: 1,
  far: 110,
});
sol.shadow.bias = -.00025;
sol.shadow.normalBias = .045;
scene.add(sol);

// Enkle reflekterende himmelflader giver metallet lys uden at hente et HDR-billede.
const lysrum = new THREE.Scene();
lysrum.background = new THREE.Color("#a9bcc2");
for (
  const [p, farve, bredde] of [[[0, 30, 0], "#e5eff2", 50], [
    [-25, 12, 12],
    "#ffe3b4",
    24,
  ], [[20, 2, -25], "#b2c5bf", 18]]
) {
  const flade = new THREE.Mesh(
    new THREE.PlaneGeometry(bredde, bredde),
    new THREE.MeshBasicMaterial({ color: farve, side: THREE.DoubleSide }),
  );
  flade.position.set(...p);
  flade.lookAt(0, 0, 0);
  lysrum.add(flade);
}
const pmrem = new THREE.PMREMGenerator(renderer);
const refleksion = pmrem.fromScene(lysrum, .07);
scene.environment = refleksion.texture;
for (const flade of lysrum.children) {
  flade.geometry.dispose();
  flade.material.dispose();
}
pmrem.dispose();

// Betonens pletter, reparationsfuger og påmalede felter er lavet til netop dette prøvefelt.
function betonTekstur() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#aaa99a";
  g.fillRect(0, 0, 1024, 1024);
  let frø = 71;
  const rand = () => {
    frø = (Math.imul(frø, 1664525) + 1013904223) >>> 0;
    return frø / 4294967296;
  };
  for (let n = 0; n < 18000; n++) {
    g.fillStyle = n % 2 ? "#262b2910" : "#f5eed220";
    const s = 1 + rand() * 3;
    g.fillRect(rand() * 1024, rand() * 1024, s, s);
  }
  for (let n = 0; n < 35; n++) {
    const x = rand() * 1024, y = rand() * 1024, r = 12 + rand() * 75;
    const t = g.createRadialGradient(x, y, 0, x, y, r);
    t.addColorStop(0, "#323c2c0e");
    t.addColorStop(1, "#303a2e00");
    g.fillStyle = t;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = "#6f786b55";
  g.lineWidth = 1.5;
  for (let n = 0; n <= 8; n++) {
    g.beginPath();
    g.moveTo(n * 128, 0);
    g.lineTo(n * 128, 1024);
    g.moveTo(0, n * 128);
    g.lineTo(1024, n * 128);
    g.stroke();
  }
  g.strokeStyle = "#d4b96a99";
  g.lineWidth = 6;
  g.strokeRect(35, 35, 954, 954);
  g.lineWidth = 2;
  g.setLineDash([11, 16]);
  g.strokeRect(235, 235, 554, 554);
  g.setLineDash([]);
  g.font = "bold 65px sans-serif";
  g.fillStyle = "#d8c99288";
  g.fillText("07", 65, 120);
  const tekstur = new THREE.CanvasTexture(c);
  tekstur.colorSpace = THREE.SRGBColorSpace;
  tekstur.anisotropy = 8;
  return tekstur;
}
const jord = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 180),
  new THREE.MeshStandardMaterial({ color: "#87765a", roughness: 1 }),
);
jord.rotation.x = -Math.PI / 2;
jord.position.y = -.09;
jord.receiveShadow = true;
scene.add(jord);
const beton = new THREE.Mesh(
  new THREE.BoxGeometry(48, .12, 48),
  new THREE.MeshStandardMaterial({ map: betonTekstur(), roughness: .94 }),
);
beton.position.y = -.06;
beton.receiveShadow = true;
scene.add(beton);

const modelURL = new URL("./modeller/brudpunkt.glb", import.meta.url);
const [gltf, opskrifter] = await Promise.all([
  new GLTFLoader().loadAsync(modelURL.href),
  fetch(new URL("./modeller/opskrifter.json", import.meta.url), {
    signal: AbortSignal.timeout(20000),
  }).then((r) => {
    if (!r.ok) throw new Error("Modellernes opskrift mangler");
    return r.json();
  }),
]);
gltf.scene.updateMatrixWorld(true);
const miljø = gltf.scene.getObjectByName("omgivelser");
if (!miljø) throw new Error("Prøvefeltets omgivelser mangler");
const omgivelser = miljø.clone(true);
miljø.matrixWorld.decompose(
  omgivelser.position,
  omgivelser.quaternion,
  omgivelser.scale,
);
omgivelser.traverse((o) => {
  if (o.isMesh) {
    o.castShadow = true;
    o.receiveShadow = true;
  }
});
scene.add(omgivelser);

const simulering = await opretSimulering(opskrifter, {
  kvalitet: indstillinger.grafik,
});
const lyd = new BrudLyd();
lyd.saetLyd(indstillinger.lyd);
const effekter = new BrudEffekter(scene, kamera, {
  canvas: $("objektiv"),
  blink: $("blink"),
  rolig: indstillinger.rolig,
  kvalitet: indstillinger.grafik,
  vedSkade: (skade) => {
    $("kameraskade").hidden = !skade;
  },
});
const modeller = new Map(), egneMaterialer = new Map(), opsætning = new Map();
const kaster = new THREE.Raycaster(),
  mus = new THREE.Vector2(),
  gulv = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(1, 1.025, 64),
  new THREE.MeshBasicMaterial({
    color: "#ffd180",
    side: THREE.DoubleSide,
    transparent: true,
    opacity: .9,
    depthWrite: false,
  }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = .035;
ring.visible = false;
scene.add(ring);
let valgt = null,
  værktøj = null,
  træk = null,
  følg = null,
  fase = "byg",
  resumeFase = null;
let tempo = 1,
  nedtælling = 0,
  senesteSekund = 0,
  sidstePuls = 0,
  tæller = 0,
  antalBrud = 0;
let frames = [],
  frameIds = [],
  optaget = 0,
  hændelsesfilm = [],
  replayTid = 0,
  replayKører = false;
let forrigeResultat = new Map(),
  beskedTid = 0,
  hudTid = 0,
  sidsteNu = performance.now(),
  sidsteTegning = 0;
const kontrol = new BaneKamera($("verden"), kamera, {
  tryk: klikPåFelt,
  grib,
  flyt: trækObjekt,
  slip: slipObjekt,
});

function besked(tekst) {
  $("besked").textContent = tekst;
  $("besked").classList.add("vis");
  beskedTid = 3.5;
}
function gemValg() {
  try {
    localStorage.setItem(VALG, JSON.stringify(indstillinger));
  } catch { /* Spillet kan fortsætte uden gemte valg. */ }
}
function gem() {
  try {
    localStorage.setItem(NØGLE, pakOpstilling([...opsætning.values()]));
    $("gemt").textContent = "Opstillingen er gemt på din enhed";
  } catch {
    $("gemt").textContent = "Kunne ikke gemme — behold siden åben";
  }
}

// Kun kloner ejer deres materialer. Den fælles geometri genbruges på tværs af forsøg.
function tegnObjekt(spec) {
  const materialer = [];
  for (const del of opskrifter[spec.type].dele) {
    const original = gltf.scene.getObjectByName(`${spec.type}__${del.id}`);
    if (!original) {
      throw new Error(`Modellen mangler delen ${spec.type}/${del.id}`);
    }
    const wrapper = new THREE.Group(), figur = original.clone(true);
    original.matrixWorld.decompose(
      figur.position,
      figur.quaternion,
      figur.scale,
    );
    figur.position.sub(new THREE.Vector3(...del.p));
    figur.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.objekt = spec.id;
      const klon = (m) => {
        const k = m.clone();
        k.userData.helFarve = k.color?.clone();
        materialer.push(k);
        return k;
      };
      o.material = Array.isArray(o.material)
        ? o.material.map(klon)
        : klon(o.material);
    });
    wrapper.add(figur);
    wrapper.userData.objekt = spec.id;
    scene.add(wrapper);
    modeller.set(`${spec.id}/${del.id}`, wrapper);
  }
  egneMaterialer.set(spec.id, materialer);
}

function sletTegning(id) {
  for (const [nøgle, figur] of modeller) {
    if (figur.userData.objekt === id) {
      scene.remove(figur);
      modeller.delete(nøgle);
    }
  }
  for (const m of egneMaterialer.get(id) || []) m.dispose();
  egneMaterialer.delete(id);
}

function placér(spec) {
  const normal = simulering.placér(spec);
  try {
    tegnObjekt(normal);
  } catch (e) {
    simulering.fjern(normal.id);
    sletTegning(normal.id);
    throw e;
  }
  opsætning.set(normal.id, normal);
  return normal;
}

function flytSpec(id, ændring) {
  const gammel = opsætning.get(id);
  if (!gammel || fase !== "byg") return;
  simulering.fjern(id);
  try {
    const ny = simulering.placér({ ...gammel, ...ændring });
    opsætning.set(id, ny);
  } catch (e) {
    simulering.placér(gammel);
    throw e;
  }
  visPoser(simulering.hentDele());
  visValg();
}

function rydFelt() {
  simulering.ryd();
  for (const id of [...opsætning.keys()]) sletTegning(id);
  opsætning.clear();
  valgt = null;
  følg = null;
  ring.visible = false;
}

// Nulstilling genskaber præcis opstillingen før testen, ikke et tilfældigt nyt forsøg.
function nulstil() {
  const liste = [...opsætning.values()];
  rydFelt();
  fase = "byg";
  resumeFase = null;
  frames = [];
  frameIds = [];
  hændelsesfilm = [];
  optaget = 0;
  antalBrud = 0;
  sidstePuls = 0;
  nedtælling = 0;
  replayKører = false;
  lyd.stop();
  effekter.nulstil();
  for (const spec of liste) placér(spec);
  $("resultat").hidden = true;
  $("genspil").textContent = "↺ Gense";
  $("tidslinje").value = "0";
  $("tidslinje").max = "1";
  $("tip").textContent =
    "Træk en ting for at flytte den. Træk i det tomme felt for at dreje kameraet.";
  $("start").disabled = false;
  $("start").innerHTML = "Start test <span>↗</span>";
  $("fase").textContent = "OPSTILLING";
  $("status").textContent = "Klar til næste forsøg";
  $("statuslys").classList.remove("korer");
  bygKnapper(false);
  visValg();
  visPoser(simulering.hentDele());
  opdaterTal();
}

function nytId() {
  return `objekt_${Date.now().toString(36)}_${++tæller}`;
}
function opskrift(type, x, z, vinkel = 0, styrke = 3, forsinkelse = .3) {
  return { id: nytId(), type, x, y: 0, z, vinkel, styrke, forsinkelse };
}

function prøvOpstilling(navn, gemDen = true) {
  if (fase !== "byg") nulstil();
  rydFelt();
  effekter.nulstil();
  const liste = navn === "kaede"
    ? [
      opskrift("celle", -12, 2, 0, 3, .3),
      opskrift("celle", -4.5, 1, 0, 3, .6),
      opskrift("celle", 3, 1, 0, 4, .8),
      opskrift("celle", 10, 2, 0, 3, .9),
      opskrift("bil", -9, -2, .3),
      opskrift("hus", .5, -5, .15),
      opskrift("taarn", 10, -4, 0),
    ]
    : navn === "taarn"
    ? [
      opskrift("celle", -2, 2, 0, 4, 1),
      opskrift("taarn", 0, 0),
      opskrift("bil", 6, -2, -.35),
      opskrift("celle", 7, -1, 0, 3, 1),
    ]
    : [
      opskrift("celle", -2, 2, 0, 3, .3),
      opskrift("bil", -6.2, -.5, .3),
      opskrift("hus", 4, -3.6),
      opskrift("taarn", 10, 5),
      opskrift("celle", 6, 2, 0, 3, .8),
    ];
  for (const spec of liste) placér(spec);
  kontrol.overblik();
  visPoser(simulering.hentDele());
  valgt = liste[0].id;
  visValg();
  opdaterTal();
  if (gemDen) gem();
}

// Modellerne beholder samme id under brud, så replay kan gemmes kompakt i talbuffere.
function visPoser(dele) {
  for (const del of dele) {
    const figur = modeller.get(del.id);
    if (!figur) continue;
    figur.position.set(...del.p);
    figur.quaternion.set(...del.q);
    if (Math.abs((figur.userData.skade || 0) - del.skade) > .02) {
      figur.userData.skade = del.skade;
      figur.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m.color && m.userData.helFarve) {
            m.color.copy(m.userData.helFarve).multiplyScalar(
              1 - del.skade * .37,
            );
          }
        }
        if (o.morphTargetInfluences?.length) {
          o.morphTargetInfluences[0] = klip(del.skade, 0, 1);
        }
      });
    }
  }
}

function optag(dele, tid) {
  if (tid - optaget < .05 || frames.length >= 900) return;
  if (!frameIds.length) frameIds = dele.map((d) => d.id);
  const data = new Float32Array(dele.length * 8);
  for (let i = 0; i < dele.length; i++) {
    data.set([...dele[i].p, ...dele[i].q, dele[i].skade], i * 8);
  }
  frames.push({ tid, data });
  optaget = tid;
  $("tidslinje").max = Math.max(0, frames.length - 1);
}

function visFrame(indeks) {
  const frame = frames[klip(indeks, 0, frames.length - 1)];
  if (!frame) return;
  const dele = frameIds.map((id, i) => ({
    id,
    p: frame.data.subarray(i * 8, i * 8 + 3),
    q: frame.data.subarray(i * 8 + 3, i * 8 + 7),
    skade: frame.data[i * 8 + 7],
  }));
  visPoser(dele);
  $("tidslinje").value = String(indeks);
  $("tid").textContent = frame.tid.toFixed(1).padStart(4, "0");
}

function forberedRay(e) {
  const r = $("verden").getBoundingClientRect();
  mus.set(
    (e.clientX - r.left) / r.width * 2 - 1,
    1 - (e.clientY - r.top) / r.height * 2,
  );
  kaster.setFromCamera(mus, kamera);
}
function påGulvet(e) {
  forberedRay(e);
  const p = kaster.ray.intersectPlane(gulv, new THREE.Vector3());
  if (!p) return null;
  p.x = klip(p.x, -22, 22);
  p.z = klip(p.z, -22, 22);
  return p;
}
function ramtObjekt(e) {
  forberedRay(e);
  const ramte = kaster.intersectObjects([...modeller.values()], true);
  return ramte.find((r) => r.object.userData.objekt)?.object.userData.objekt ||
    null;
}

function klikPåFelt(e) {
  if (fase !== "byg") {
    const id = ramtObjekt(e);
    if (id) {
      valgt = id;
      visValg();
    }
    return;
  }
  if (værktøj) {
    const p = påGulvet(e);
    if (!p) return;
    try {
      const spec = placér(
        opskrift(
          værktøj,
          Math.round(p.x * 4) / 4,
          Math.round(p.z * 4) / 4,
          0,
          +$("styrke").value,
          +$("forsinkelse").value,
        ),
      );
      valgt = spec.id;
      visPoser(simulering.hentDele());
      visValg();
      gem();
      opdaterTal();
      lyd.klik();
    } catch (fejl) {
      besked(fejl.message);
    }
  } else {
    valgt = ramtObjekt(e);
    visValg();
  }
}
function grib(e) {
  if (fase !== "byg" || værktøj) return false;
  const id = ramtObjekt(e);
  if (!id) return false;
  const p = påGulvet(e);
  if (!p) return false;
  valgt = id;
  const spec = opsætning.get(id);
  træk = { original: { ...spec }, dx: spec.x - p.x, dz: spec.z - p.z };
  visValg();
  return true;
}
function trækObjekt(e) {
  if (!træk || !valgt) return;
  const p = påGulvet(e);
  if (!p) return;
  try {
    flytSpec(valgt, {
      x: klip(Math.round((p.x + træk.dx) * 4) / 4, -22, 22),
      z: klip(Math.round((p.z + træk.dz) * 4) / 4, -22, 22),
    });
  } catch (fejl) {
    besked(fejl.message);
  }
}
function slipObjekt(annulleret) {
  if (træk && valgt) {
    if (annulleret && fase === "byg") flytSpec(valgt, træk.original);
    else gem();
  }
  træk = null;
}

function visValg() {
  const spec = opsætning.get(valgt);
  $("valg").hidden = !spec || fase !== "byg";
  ring.visible = !!spec && fase === "byg";
  if (!spec) return;
  $("valgnavn").textContent = NAVNE[spec.type];
  $("hoejde").value = spec.y;
  if (spec.type === "celle") {
    $("styrke").value = spec.styrke;
    $("styrkevaerdi").textContent = `${spec.styrke} / 5`;
    // Forudbyggede kæder kan bruge finere forsinkelser end de fire hurtige valg.
    const værdi = String(spec.forsinkelse);
    if (![...$("forsinkelse").options].some((o) => o.value === værdi)) {
      const mulighed = document.createElement("option");
      mulighed.value = værdi;
      mulighed.textContent = `${spec.forsinkelse.toLocaleString("da-DK")} sek.`;
      $("forsinkelse").append(mulighed);
    }
    $("forsinkelse").value = værdi;
  }
  const radius = Math.max(
    ...opskrifter[spec.type].dele.map((d) =>
      Math.hypot(Math.abs(d.p[0]) + d.halv[0], Math.abs(d.p[2]) + d.halv[2])
    ),
  ) + .25;
  ring.scale.setScalar(radius);
  ring.position.set(spec.x, .035, spec.z);
}

function bygKnapper(låst) {
  for (
    const b of document.querySelectorAll(
      ".panel button, .panel input, .panel select",
    )
  ) if (b.id !== "panelhjaelp") b.disabled = låst;
}
function vælgVærktøj(type) {
  værktøj = type;
  kontrol.annuller();
  for (const b of document.querySelectorAll("[data-type]")) {
    b.setAttribute("aria-pressed", String(b.dataset.type === type));
  }
  $("afslutplacering").hidden = !type;
  $("vaerktoejstip").textContent = type
    ? `Tryk på banen for at placere: ${NAVNE[type]}.`
    : "Vælg en ting, og tryk på banen.";
  $("verden").style.cursor = type ? "crosshair" : "grab";
  if (type && innerWidth < 760) skjulPanel();
}
function skjulPanel() {
  $("panel").classList.remove("ouvert");
  $("vaerktoej").setAttribute("aria-expanded", "false");
}
function opdaterTal() {
  const s = simulering.hentStatus();
  $("tid").textContent = s.tid.toFixed(1).padStart(4, "0");
  $("kaede").textContent = String(s.pulser);
  $("brud").textContent = String(antalBrud);
  $("styrkevaerdi").textContent = `${$("styrke").value} / 5`;
}

// Startknappen leverer brugerhandlingen til lydsystemet før nedtællingen begynder.
function startTest() {
  if (fase === "pause") {
    fase = resumeFase || "test";
    resumeFase = null;
    if (fase === "test") simulering.start();
    $("start").textContent = "Afslut test";
    void lyd.start();
    return;
  }
  if (fase === "test") {
    afslutTest();
    return;
  }
  if (fase === "resultat" || fase === "replay") {
    nulstil();
    return;
  }
  if (fase !== "byg") return;
  if (![...opsætning.values()].some((s) => s.type === "celle")) {
    besked("Placér en energicelle, så der er noget at starte testen med.");
    return;
  }
  vælgVærktøj(null);
  kontrol.annuller();
  valgt = null;
  visValg();
  skjulPanel();
  frames = [];
  frameIds = [];
  hændelsesfilm = [];
  optaget = -1;
  sidstePuls = 0;
  antalBrud = 0;
  optag(simulering.hentDele(), 0);
  effekter.nulstil();
  void lyd.start();
  nedtælling = 2;
  senesteSekund = 3;
  fase = "ned";
  bygKnapper(true);
  $("start").disabled = true;
  $("start").textContent = "Gør klar …";
  $("statuslys").classList.add("korer");
  $("fase").textContent = "GØR KLAR";
  $("tip").textContent =
    "Du kan stadig flytte kameraet. Prøv at følge bilen eller gå helt tæt på.";
}

function afslutTest() {
  simulering.stop();
  fase = "resultat";
  replayKører = false;
  $("fase").textContent = "TESTRESULTAT";
  $("status").textContent = "Et forsøg. Mange følger.";
  $("start").disabled = false;
  $("start").textContent = "Byg videre ↗";
  const resultater = simulering.hentResultater();
  $("resultatliste").replaceChildren();
  for (const r of resultater) {
    if (r.type === "celle") continue;
    const row = document.createElement("div");
    row.className = "resultatraekke";
    const tekst = document.createElement("div"),
      navn = document.createElement("span"),
      procent = document.createElement("b");
    navn.textContent = NAVNE[r.type];
    const værdi = Math.round(r.skade * 100), før = forrigeResultat.get(r.id);
    procent.textContent = `${værdi} %${
      før === undefined ? "" : ` (${værdi - før >= 0 ? "+" : ""}${værdi - før})`
    }`;
    tekst.append(navn, procent);
    const måler = document.createElement("progress");
    måler.max = 100;
    måler.value = værdi;
    måler.setAttribute(
      "aria-label",
      `${NAVNE[r.type]}: ${værdi} procent beskadiget`,
    );
    row.append(tekst, måler);
    $("resultatliste").append(row);
  }
  forrigeResultat = new Map(
    resultater.map((r) => [r.id, Math.round(r.skade * 100)]),
  );
  $("resultat").hidden = false;
  $("genspil").disabled = frames.length < 2;
  $("tidslinje").value = String(frames.length - 1);
}

function startReplay() {
  if (replayKører) {
    replayKører = false;
    $("genspil").textContent = "▶ Fortsæt";
    return;
  }
  if (fase !== "replay" || replayTid >= (frames.at(-1)?.tid || 0)) {
    replayTid = 0;
    effekter.nulstil();
    lyd.stop();
  }
  fase = "replay";
  replayKører = true;
  $("genspil").textContent = "Ⅱ Pause";
  $("fase").textContent = "REPLAY";
}

// Indstillinger bevarer modelvalget; kun tegnekvaliteten ændres undervejs.
function grafik() {
  const letGrafik = indstillinger.grafik === "let",
    flot = indstillinger.grafik === "flot";
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio || 1,
      letGrafik ? 1 : flot ? 2 : mobil ? 1.3 : 1.6,
    ),
  );
  renderer.shadowMap.enabled = !letGrafik;
  sol.shadow.mapSize.setScalar(flot ? 2048 : 1024);
  if (sol.shadow.map) {
    sol.shadow.map.dispose();
    sol.shadow.map = null;
  }
  effekter.saetKvalitet(indstillinger.grafik);
  resize();
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  effekter.resize(innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 2));
}

for (const b of document.querySelectorAll("[data-type]")) {
  b.addEventListener(
    "click",
    () => vælgVærktøj(værktøj === b.dataset.type ? null : b.dataset.type),
  );
}
for (const b of document.querySelectorAll("[data-forsoeg]")) {
  b.addEventListener("click", () => {
    prøvOpstilling(b.dataset.forsoeg);
    vælgVærktøj(null);
    skjulPanel();
    besked("Opstillingen er klar. Flyt gerne tingene, før du tester.");
  });
}
$("afslutplacering").onclick = () => vælgVærktøj(null);
$("vaerktoej").onclick = () => {
  const åben = $("panel").classList.toggle("ouvert");
  $("vaerktoej").setAttribute("aria-expanded", String(åben));
};
$("start").onclick = startTest;
$("nulstil").onclick = nulstil;
$("nytest").onclick = nulstil;
$("toem").onclick = () => {
  rydFelt();
  gem();
  visValg();
  opdaterTal();
  besked("Et tomt prøvefelt. Hvad vil du bygge?");
};
$("drej").onclick = () => {
  if (valgt) {
    flytSpec(valgt, { vinkel: opsætning.get(valgt).vinkel + Math.PI / 12 });
    gem();
  }
};
$("hoejde").onchange = () => {
  if (valgt) {
    const h = Number($("hoejde").value);
    if (Number.isFinite(h)) {
      flytSpec(valgt, { y: klip(h, 0, 8) });
      gem();
    }
  }
};
$("slet").onclick = () => {
  if (valgt && fase === "byg") {
    simulering.fjern(valgt);
    sletTegning(valgt);
    opsætning.delete(valgt);
    valgt = null;
    visValg();
    gem();
    opdaterTal();
  }
};
$("kopier").onclick = () => {
  const spec = opsætning.get(valgt);
  if (!spec || fase !== "byg") return;
  try {
    const ny = placér({
      ...spec,
      id: nytId(),
      x: klip(spec.x + 3.5, -22, 22),
      z: klip(spec.z + 2, -22, 22),
    });
    valgt = ny.id;
    visPoser(simulering.hentDele());
    visValg();
    gem();
    opdaterTal();
  } catch (fejl) {
    besked(fejl.message);
  }
};
function opdaterPuls() {
  const spec = opsætning.get(valgt)?.type === "celle"
    ? opsætning.get(valgt)
    : [...opsætning.values()].find((s) => s.type === "celle");
  if (spec && fase === "byg") {
    flytSpec(spec.id, {
      styrke: +$("styrke").value,
      forsinkelse: +$("forsinkelse").value,
    });
    gem();
  }
  $("styrkevaerdi").textContent = `${$("styrke").value} / 5`;
}
$("styrke").oninput = opdaterPuls;
$("forsinkelse").onchange = opdaterPuls;
$("tempo").onclick = () => {
  tempo = tempo === 1 ? .25 : 1;
  $("tempo").setAttribute("aria-pressed", String(tempo !== 1));
};
$("overblik").onclick = () => {
  følg = null;
  kontrol.overblik();
};
$("foelg").onclick = () => {
  følg = valgt || [...opsætning.values()].find((s) => s.type === "bil")?.id;
  if (!følg) {
    besked("Placér et objekt at følge først.");
    return;
  }
  kontrol.afstand = 14;
  kontrol.pitch = .36;
};
$("naer").onclick = () => {
  const s = [...opsætning.values()].find((s) => s.type === "celle");
  if (!s) {
    besked("Placér en energicelle først.");
    return;
  }
  følg = null;
  kontrol.maal.set(s.x, 1.2, s.z);
  kontrol.afstand = 5.5;
  kontrol.pitch = .18;
  kontrol.yaw = .55;
  besked(
    indstillinger.rolig
      ? "Du har valgt rolige kameraeffekter."
      : "Her kan trykbølgen revne kameraets objektiv.",
  );
};
$("nytobjektiv").onclick = () => effekter.nulstilObjektiv();
$("grafik").value = indstillinger.grafik;
$("grafik").onchange = () => {
  indstillinger.grafik = $("grafik").value;
  grafik();
  gemValg();
};
$("lyd").setAttribute("aria-pressed", String(indstillinger.lyd));
$("lyd").onclick = () => {
  indstillinger.lyd = !indstillinger.lyd;
  lyd.saetLyd(indstillinger.lyd);
  if (indstillinger.lyd) void lyd.start();
  $("lyd").setAttribute("aria-pressed", String(indstillinger.lyd));
  $("lyd").setAttribute(
    "aria-label",
    indstillinger.lyd ? "Slå lyd fra" : "Slå lyd til",
  );
  gemValg();
};
$("rolig").checked = indstillinger.rolig;
$("rolig").onchange = () => {
  indstillinger.rolig = $("rolig").checked;
  effekter.saetRolig(indstillinger.rolig);
  gemValg();
};
function hjælp() {
  kontrol.annuller();
  pauseTest();
  if (!$("vejledning").open) $("vejledning").showModal();
}
$("hjaelp").onclick = hjælp;
$("panelhjaelp").onclick = hjælp;
$("lukhjaelp").onclick = $("forstaaet").onclick = () => {
  $("vejledning").close();
  try {
    localStorage.setItem("brudpunkt-hjaelp", "1");
  } catch {}
};
$("lukresultat").onclick = () => {
  $("resultat").hidden = true;
};
$("genspil").onclick = startReplay;
$("tidslinje").oninput = () => {
  simulering.stop();
  fase = "replay";
  replayKører = false;
  lyd.stop();
  effekter.nulstil();
  const i = +$("tidslinje").value;
  replayTid = frames[i]?.tid || 0;
  visFrame(i);
  $("genspil").textContent = "▶ Fortsæt";
};

function pauseTest() {
  if (fase === "test" || fase === "ned") {
    resumeFase = fase;
    fase = "pause";
    simulering.stop();
    lyd.stop();
    $("start").disabled = false;
    $("start").textContent = "Fortsæt";
    $("status").textContent = "Forsøget holder pause";
  }
  replayKører = false;
  lyd.stop();
  if (fase === "replay") $("genspil").textContent = "▶ Fortsæt";
  kontrol.annuller();
}
document.addEventListener("visibilitychange", () => {
  sidsteNu = performance.now();
  if (document.hidden) pauseTest();
});
window.addEventListener("blur", pauseTest);
window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => {
  if (
    /^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName) || $("vejledning").open
  ) return;
  if (e.code === "Escape") {
    vælgVærktøj(null);
    skjulPanel();
    if (fase === "test" || fase === "ned") pauseTest();
  }
  if (e.code === "KeyR" && fase === "byg" && valgt) $("drej").click();
  if (e.code === "Delete" && fase === "byg" && valgt) $("slet").click();
  if (e.code === "Space") {
    e.preventDefault();
    startTest();
  }
});

// Gemte data valideres, før der bygges fysik. En afvist gemning får et brugbart nyt prøvefelt.
let gendannet = false;
try {
  const gemt = localStorage.getItem(NØGLE);
  if (gemt) {
    for (const spec of læsOpstilling(gemt)) placér(spec);
    gendannet = true;
  }
} catch {
  rydFelt();
  besked(
    "Den gemte opstilling kunne ikke åbnes. Et nyt prøvefelt er gjort klar.",
  );
}
if (!gendannet) prøvOpstilling("vaerksted", false);
visPoser(simulering.hentDele());
grafik();
kontrol.opdater();
$("indlaeser").hidden = true;
$("app").hidden = false;
try {
  if (!localStorage.getItem("brudpunkt-hjaelp")) hjælp();
} catch {
  hjælp();
}

// Fysik, billeder og lyd følger samme hændelser. En skjult fane simulerer eller tegner intet.
function tegn(nu) {
  requestAnimationFrame(tegn);
  const dt = klip((nu - sidsteNu) / 1000, 0, .05);
  sidsteNu = nu;
  if (document.hidden) return;
  const fart = dt * tempo;
  if (fase === "ned") {
    nedtælling -= dt;
    const sekund = Math.ceil(nedtælling);
    if (sekund !== senesteSekund) {
      senesteSekund = sekund;
      $("status").textContent = `Testen begynder om ${Math.max(1, sekund)} …`;
      lyd.klik();
    }
    if (nedtælling <= 0) {
      simulering.start();
      fase = "test";
      $("start").disabled = false;
      $("start").textContent = "Afslut test";
      $("fase").textContent = "TEST I GANG";
      $("status").textContent = "Se, hvad der giver efter";
    }
  }
  if (fase === "test") {
    simulering.tick(fart);
    const dele = simulering.hentDele(), s = simulering.hentStatus();
    visPoser(dele);
    optag(dele, s.tid);
    const hændelser = simulering.hentHaendelser();
    kontrol.opdater();
    for (const h of hændelser) {
      effekter.haendelse(h);
      void lyd.afspil(h);
      if (h.type !== "kontakt" || hændelsesfilm.length < 3500) {
        hændelsesfilm.push({ tid: s.tid, h });
      }
      if (h.type === "puls") sidstePuls = s.tid;
      if (h.type === "brud") antalBrud++;
    }
    if ((s.tid > Math.max(9, sidstePuls + 7) && !s.planlagte) || s.tid > 42) {
      afslutTest();
    }
  }
  if (fase === "replay" && replayKører && frames.length) {
    const før = replayTid;
    replayTid = Math.min(replayTid + fart, frames.at(-1).tid);
    let i = frames.findIndex((f) => f.tid >= replayTid);
    if (i < 0) i = frames.length - 1;
    visFrame(i);
    kontrol.opdater();
    for (const { tid, h } of hændelsesfilm) {
      if (tid > før && tid <= replayTid) {
        effekter.haendelse(h);
        void lyd.afspil(h);
      }
    }
    if (replayTid >= frames.at(-1).tid) {
      replayKører = false;
      $("genspil").textContent = "↺ Gense";
    }
  }
  if (følg) {
    const figur = [...modeller.values()].find((m) =>
      m.userData.objekt === følg
    );
    if (figur) kontrol.maal.lerp(figur.position, Math.min(1, dt * 4));
  }
  kontrol.opdater();
  const ryst = effekter.tick(
    (fase === "pause" || (fase === "replay" && !replayKører)) ? 0 : fart,
    dt,
  );
  if (ryst) kamera.position.add(new THREE.Vector3(...ryst));
  kamera.updateMatrixWorld();
  const retning = kamera.getWorldDirection(new THREE.Vector3());
  lyd.opdaterKamera(kamera.position.toArray(), retning.toArray());
  if (beskedTid > 0) {
    beskedTid -= dt;
    if (beskedTid <= 0) $("besked").classList.remove("vis");
  }
  hudTid -= dt;
  if (hudTid <= 0) {
    if (fase !== "replay") opdaterTal();
    hudTid = .13;
  }
  if (fase === "test" || fase === "replay" || nu - sidsteTegning >= 33) {
    renderer.render(scene, kamera);
    sidsteTegning = nu;
  }
}
requestAnimationFrame(tegn);
