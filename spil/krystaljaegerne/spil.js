import * as THREE from "../3d-faelles/three.module.js";
import { lås } from "../laas.js";
import {
  alleSegl,
  bossSpor,
  danGrotte,
  drik,
  FJENDETYPER,
  fremskridt,
  givEliksirer,
  GROTTENAVNE,
  kopiRejse,
  læsRejse,
  maxLiv,
  niveau,
  nyRejse,
  næsteOpgave,
  OPGAVER,
  opgradér,
  skade,
  startGrotte,
  sværdRammer,
  VÅBEN,
} from "./eventyr.js";
import { animer, bygGrotte, bygØ, frit, hentModeller, kopi, STEDER } from "./verden.js";
import { lavHimmel, lavMiljø } from "../3d-faelles/pynt.js";
import { opdatérFlyvere } from "./projektiler.js";
import { fortsætSpor, friLinje, rumRute, ruteLængde, vælgMål, øRute } from "./navigation.js";
import { tegnRejsekort } from "./kort.js";
import { forsøgGem } from "./lagring.js";
import { guideEfterSkridt, tastFokus, trykTast } from "./styring.js";
import { opdatérAngreb, startAngreb } from "./kamp.js";
import { opretKampfigur } from "./kampfigur.js";
import { opdatérKampstatus } from "./kampstatus.js";
import { nyeØveskiver, ramØveskive } from "./øveplads.js";
import { indsamlFund, medOpgavebelønning, seglFund } from "./fund.js";
import { opretFundfigur } from "./fundfigur.js";
import { fundTaske, opretFundkort } from "./fundkort.js";

const $ = (id) => document.getElementById(id);
// Uændret tekst genudskrives ikke; statusfelter forbliver rolige for skærmlæsere.
function sætTekst(felt, tekst) {
  const element = typeof felt === "string" ? $(felt) : felt;
  const værdi = String(tekst);
  if (element.textContent !== værdi) element.textContent = værdi;
}
const NØGLE = "krystaljaegerne-rejse-v1";
const touch = matchMedia("(pointer:coarse)").matches;
const mobil = touch || Math.min(innerWidth, innerHeight) < 700;
const mindreBevægelse = matchMedia("(prefers-reduced-motion: reduce)");
const fundkort = opretFundkort();
let fundfigur;
let gemt = null;
try {
  gemt = læsRejse(localStorage.getItem(NØGLE));
} catch { /* privat browser kan nægte lagring */ }
let s = nyRejse(),
  verden,
  modeller,
  helt,
  ven,
  mira,
  kører = false,
  paused = false;
let tid = 0,
  gemtid = 0,
  hudtid = 0,
  angrebspause = 0,
  venpause = 0,
  helbredstid = 0,
  beskedtid = 0;
let yaw = .62,
  zoom = 20,
  retning = new THREE.Vector2(0, -1),
  sigte = null,
  nær = null;
let målFjende = null,
  egetSpor = null,
  rute = [],
  ruteNøgle = "",
  angrebHold = null,
  fokusTilbage = null,
  kameraYaw = yaw,
  kameraZoom = zoom;
let gemtRute = [];
let guideStart = { x: 0, z: 5 };
let lagerVirker = true;
let sidstEnergiTip = -10;
let kampfigur,
  angreb = null,
  angrebMål = null,
  sidsteSværd = null,
  sidstØveTip = -10;
const øveskiver = [];
const skilte = [], flyvetekster = [];
const taster = new Set(),
  joystick = { x: 0, y: 0 },
  fjender = [],
  ting = [],
  skud = [],
  effekter = [];
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9c4c9);
scene.fog = new THREE.Fog(0xa9c4c9, 38, 100);
const kamera = new THREE.PerspectiveCamera(
  48,
  innerWidth / innerHeight,
  .1,
  300,
);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $("verden"),
    antialias: !mobil,
    powerPreference: "high-performance",
  });
} catch {
  $("menu").classList.remove("skjult");
  $("indlæser").textContent = "Denne browser kunne ikke åbne 3D. Prøv Safari eller Chrome med 3D slået til.";
  throw new Error("3D kunne ikke åbnes");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobil ? 1.4 : 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !mobil;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;                         // himlens spejlinger giver ekstra lys
// Himmel med sol og skyer over øen; spejlingerne laves af den samme himmel (spil/3d-faelles/pynt.js)
const himmel = lavHimmel({ top: "#3d6f93", horisont: "#a9c4c9", bund: "#5c7f86", sol: [-18, 30, 15], solFarve: "#ffe8c7", dis: 0.45, skyer: 0.35, skyFarve: "#eef3f0" });
scene.add(himmel);
const miljø = lavMiljø(renderer, himmel, "#3d5a50");
scene.environment = miljø;
// I grotterne ses himlen ikke, og spejlingerne fra den lyse himmel slås fra
scene.userData.vedOmråde = (iGrotte) => { himmel.visible = !iGrotte; scene.environment = iGrotte ? null : miljø; };
scene.add(new THREE.HemisphereLight(0xc6e7ec, 0x385141, 1.6));
const sol = new THREE.DirectionalLight(0xffe8c7, 2.5);
sol.position.set(-18, 30, 15);
sol.castShadow = !mobil;
sol.shadow.mapSize.set(1024, 1024);
sol.shadow.camera.left = -24;
sol.shadow.camera.right = 24;
sol.shadow.camera.top = 24;
sol.shadow.camera.bottom = -24;
sol.shadow.camera.far = 80;
sol.shadow.bias = -.001;
scene.add(sol);
scene.add(sol.target);
const glød = new THREE.PointLight(0x56ffe1, 8, 14, 2);
scene.add(glød);
const ray = new THREE.Raycaster(),
  jord = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  ramt = new THREE.Vector3();
const kamMål = new THREE.Vector3(), kamPos = new THREE.Vector3();
const boldGeo = new THREE.IcosahedronGeometry(.16, 1),
  ringGeo = new THREE.RingGeometry(.92, 1, 48);
const fællesGeometri = new Set([boldGeo, ringGeo]),
  fællesMaterialer = new Set();
const farver = {
  ven: 0x8cfbea,
  magi: 0xc197ff,
  bue: 0xffda95,
  fjende: 0xce8bf1,
};
let lydkontekst;
const vejpil = new THREE.Group(),
  pilmat = new THREE.MeshBasicMaterial({
    color: 0xe9d09a,
    transparent: true,
    opacity: .85,
  });
const pilspids = new THREE.Mesh(new THREE.ConeGeometry(.24, .6, 5), pilmat);
pilspids.rotation.x = Math.PI / 2;
pilspids.position.z = .6;
vejpil.add(pilspids);
const pilskaft = new THREE.Mesh(new THREE.BoxGeometry(.13, .06, .65), pilmat);
pilskaft.position.z = .15;
vejpil.add(pilskaft);
scene.add(vejpil);
const sporring = new THREE.Mesh(
  ringGeo,
  new THREE.MeshBasicMaterial({
    color: 0xe8ce94,
    transparent: true,
    opacity: .75,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
sporring.rotation.x = -Math.PI / 2;
sporring.scale.setScalar(1.4);
scene.add(sporring);
const sigtering = new THREE.Mesh(
  ringGeo,
  new THREE.MeshBasicMaterial({
    color: 0x90e8d3,
    transparent: true,
    opacity: .8,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
sigtering.rotation.x = -Math.PI / 2;
scene.add(sigtering);

// Små, selvskabte toner giver feedback uden eksterne lydfiler.
function tone(frekvens = 440, længde = .12, volumen = .06) {
  if (!s.lyd) return;
  try {
    lydkontekst ||= new (window.AudioContext || window.webkitAudioContext)();
    if (lydkontekst.state === "suspended") {
      Promise.resolve(lydkontekst.resume()).catch(() => {});
    }
    const oscillator = lydkontekst.createOscillator(),
      gain = lydkontekst.createGain(),
      nu = lydkontekst.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frekvens, nu);
    oscillator.frequency.exponentialRampToValueAtTime(
      frekvens * .75,
      nu + længde,
    );
    gain.gain.setValueAtTime(volumen, nu);
    gain.gain.exponentialRampToValueAtTime(.0001, nu + længde);
    oscillator.connect(gain);
    gain.connect(lydkontekst.destination);
    oscillator.start(nu);
    oscillator.stop(nu + længde);
  } catch { /* lyd er valgfri, også på gamle tablets */ }
}

function besked(tekst, sekunder = 4) {
  $("besked").textContent = tekst;
  $("besked").style.opacity = 1;
  beskedtid = sekunder;
  $("hud").classList.add("har-besked");
}
function gem() {
  if (!kører) return false;
  const resultat = forsøgGem(
    (tekst) => localStorage.setItem(NØGLE, tekst),
    s,
    lagerVirker,
  );
  if ($("valggemning")) {
    sætTekst(
      "valggemning",
      resultat.gemt
        ? "Dine valg og rejsen er gemt på denne enhed."
        : "Dine valg gælder i denne åbne fane. Browseren tillader ikke gemning her.",
    );
  }
  if (resultat.gemt) {
    gemt = kopiRejse(s);
    sætTekst("gemtstatus", "✓ Gemt på denne enhed");
    lagerVirker = true;
    return true;
  } else {
    sætTekst("gemtstatus", "Kun i denne åbne fane");
    if (resultat.visAdvarsel) {
      besked(
        "Browseren kan ikke gemme her. Eventyret fortsætter i denne åbne fane.",
        6,
      );
    }
    lagerVirker = false;
    return false;
  }
}
function opgave(id, antal = 1) {
  const færdig = fremskridt(s, id, antal);
  if (færdig) {
    besked(
      `✓ ${færdig.navn} · +${færdig.xp} erfaring · +${færdig.mønter} kobber`,
      5,
    );
    tone(660, .3);
    gem();
  }
  return færdig;
}

// Et dialoglag standser tiden og nulstiller fingre/taster, så ingen går utilsigtet.
function dialog(titel, tekst, knapper, mærke = "KRYSTALJÆGERNE") {
  if ($("dialog").classList.contains("skjult")) {
    fokusTilbage = document.activeElement;
  }
  paused = true;
  $("fundkort").classList.add("fund-pause");
  angrebHold = null;
  dragId = null;
  joystickId = null;
  taster.clear();
  joystick.x = 0;
  joystick.y = 0;
  $("pind").style.transform = "";
  $("dialogtitel").textContent = titel;
  $("dialogtekst").innerHTML = tekst;
  $("dialogmærke").textContent = mærke;
  $("dialogknapper").replaceChildren();
  for (const [navn, handling, klasse] of knapper) {
    const b = document.createElement("button");
    b.textContent = navn;
    if (klasse) b.className = klasse;
    b.onclick = handling;
    $("dialogknapper").append(b);
  }
  $("dialog").classList.remove("skjult");
  $("dialog").querySelector(".kort").scrollTop = 0;
  $("dialogtitel").tabIndex = -1;
  $("dialogtitel").focus({ preventScroll: true });
}
function lukDialog() {
  $("dialog").classList.add("skjult");
  paused = false;
  $("fundkort").classList.remove("fund-pause");
  angrebHold = null;
  taster.clear();
  if (fokusTilbage?.isConnected) fokusTilbage.focus({ preventScroll: true });
}
function bekræftNy() {
  dialog(
    "Begynd på ny?",
    "<p>Dit gemte eventyr på denne enhed bliver erstattet. Du kan også fortsætte fra dit sidste sted.</p>",
    [
      ["Begynd på ny", () => {
        lukDialog();
        s = nyRejse();
        start();
      }, "fare"],
      ["Behold eventyret", lukDialog],
    ],
  );
}
function hjælp() {
  dialog(
    "Et lys i det ukendte",
    `<h3>Find vej</h3><p>Følg det gyldne spor eller åbn Rejsekort / M. I grotterne følger sporet de åbne rum. Find porten til dybde 2 og bring tre bossegl til Stjerneporten.</p><h3>Gå og brug</h3><p>WASD / pile eller venstre fingerpind. Træk på højre side for at dreje kameraet. Rul med musen for at se figuren tættere på. Tryk Brug / E ved Mira, skatte og porte.</p><h3>Tre våben</h3><p><b>Sværd mod mosslim:</b> to skiftende, brede sværdslag tæt på.<br><b>Bue mod krystaldyr:</b> langt og præcist. Figuren spænder buen og slipper pilen.<br><b>Magi mod stenvogtere:</b> løft staven og send lys over et område. Bruger 14 energi.</p><h3>Prøv på øvepladsen</h3><p>Syd for brønden står tre skiver. Ram hver med det våben, der står på skiltet. Sværd kræver, at du står tæt på; bue og magi kan ramme på afstand. Første gennemførte øvelse giver 25 kobber og 15 erfaring. Du kan øve igen uden en ny belønning.</p><h3>En rolig kamp</h3><p>Hold Slå, Skyd eller Kast lys / mellemrum for gentagne angreb. Den lille bjælke viser, hvornår våbnet er klar igen. Autosigte vælger en synlig fjende, og ringen viser hvem. Gå ud af den lyserøde ring før slaget. En krystalvifte undviges bedst sidelæns.</p><h3>Rejs videre</h3><p>Eliksir / Q heler og giver energi. Mira heler gratis og forbedrer dit udstyr. Lumen hjælper i kamp; uden kamp genvinder dit lys liv. Fortsæt bevarer også en igangværende grotte.</p>`,
    [["Tilbage til eventyret", lukDialog]],
    "HJÆLP",
  );
}
function inventar() {
  const færdige = OPGAVER.filter((o) => (s.opgaver[o.id] || 0) >= o.mål);
  dialog(
    "Din rejsetaske",
    `${fundTaske(s)}<p>Niveau ${niveau(s)} · ${s.xp} erfaring<br>Udstyr ${
      ["I", "II", "III", "IV"][s.udstyr]
    }</p><p>${
      90 * niveau(s) ** 2 - s.xp
    } erfaring til næste niveau · ${maxLiv(s)} maksimalt liv.</p><h3>Dine tre våben</h3><ul class="våbenoversigt"><li>⚔ Sværd · ${
      skade({ ...s, våben: "sværd" }, "slim")
    } lys mod mosslim · tæt og bredt</li><li>➶ Bue · ${
      skade({ ...s, våben: "bue" }, "krystaldyr")
    } lys mod krystaldyr · langt og præcist</li><li>✦ Magi · ${
      skade({ ...s, våben: "magi" }, "stenvogter")
    } lys mod stenvogtere · 14 energi og et område</li></ul><h3>Opgaver</h3><p>${færdige.length} af ${OPGAVER.length} opgaver færdige.</p><ul>${
      OPGAVER.map((o) =>
        `<li>${(s.opgaver[o.id] || 0) >= o.mål ? "✓" : "◇"} ${o.navn} · ${Math.min(s.opgaver[o.id] || 0, o.mål)}/${o.mål}</li>`
      ).join("")
    }</ul>`,
    [["Luk tasken", lukDialog]],
    "INVENTAR",
  );
}
function pausemenu() {
  const gemtNu = gem();
  dialog(
    "En rolig pause",
    gemtNu
      ? "<p>Rejsen er gemt på denne enhed.</p>"
      : "<p>Rejsen findes kun i denne åbne fane. Browseren tillader ikke gemning lige nu.</p>",
    [
      ["Fortsæt", lukDialog],
      ["Rejsetaske", inventar],
      ["Rejsekort", rejsekort],
      ["Indstillinger", indstillinger],
      ["Hjælp", hjælp],
      ["Begynd på ny", bekræftNy],
    ],
    "PAUSE",
  );
}

// Kortet kan vælge et landmærke; opgaven kan altid vælges igen med ét tryk.
function rejsekort() {
  const mål = egetSpor || findMål();
  const opgave = næsteOpgave(s);
  dialog(
    s.grotte ? `${GROTTENAVNE[s.grotte.id]} · dybde ${s.grotte.dybde}` : "Øens rejsekort",
    `${
      opgave
        ? `<p class="kortmål"><b>${opgave.navn}</b><br>${opgave.tekst}<br>${
          Math.min(s.opgaver[opgave.id] || 0, opgave.mål)
        } / ${opgave.mål} fuldført</p>`
        : ""
    }<canvas id="stortkort" width="560" height="560" aria-label="Kort med din rute og øens landmærker"></canvas><p class="kortforklaring"><span>● Dig</span><span>◇ Næste spor</span><span>✦ Skatte og krystaller</span><span>● Vogtere</span></p><p>Den gyldne linje viser vejen. Vælg et sted, eller følg din næste opgave.</p>`,
    [
      ["Følg næste opgave", () => {
        egetSpor = null;
        ruteNøgle = "";
        lukDialog();
        hud();
      }],
      ...verden.steder.map((t) => [t.navn, () => {
        egetSpor = { x: t.x, z: t.z, navn: t.navn };
        ruteNøgle = "";
        lukDialog();
        hud();
        besked(`Dit spor: ${t.navn}`);
      }]),
      ["Luk kortet", lukDialog],
    ],
    "REJSEKORT",
  );
  tegnRejsekort($("stortkort"), {
    s,
    verden,
    fjender,
    ting,
    mål,
    rute,
    tid,
    stort: true,
  });
}

// Kun selve indstillingsændringen gemmes; menuen ændrer aldrig fremgangen.
function indstillinger() {
  const v = s.valg;
  dialog(
    "Gør rejsen til din",
    `<label class="valg"><input type="checkbox" data-valg="autosigte" ${
      v.autosigte ? "checked" : ""
    }>Autosigte på en synlig fjende</label><label class="valg"><input type="checkbox" data-valg="vejviser" ${
      v.vejviser ? "checked" : ""
    }>Gyldent spor i verden</label><label class="valg"><input type="checkbox" data-valg="roligeEffekter" ${
      v.roligeEffekter ? "checked" : ""
    }>Rolige effekter og færre blink</label><label class="valg">Kameraets følsomhed<select id="kameravalg"><option value="0.6">Roligt</option><option value="1">Normalt</option><option value="1.5">Hurtigt</option></select></label><p id="valggemning" role="status">${
      lagerVirker
        ? "Dine valg og rejsen gemmes på denne enhed."
        : "Dine valg gælder i denne åbne fane. Browseren tillader ikke gemning her."
    }</p>`,
    [["Vend kameraet mod nord", () => {
      yaw = 0;
      zoom = 23;
      lukDialog();
    }], ["Vis første rejsevejledning", () => {
      s.vejledning = 0;
      guideStart = { x: s.x, z: s.z };
      ruteNøgle = "";
      gem();
      lukDialog();
    }], ["Tilbage til eventyret", lukDialog]],
    "INDSTILLINGER",
  );
  for (const c of $("dialogtekst").querySelectorAll("[data-valg]")) {
    c.onchange = () => {
      s.valg[c.dataset.valg] = c.checked;
      gem();
    };
  }
  const kameraValg = $("kameravalg");
  kameraValg.value = String(v.kamera < .8 ? .6 : v.kamera > 1.2 ? 1.5 : 1);
  kameraValg.onchange = () => {
    s.valg.kamera = Number(kameraValg.value);
    gem();
  };
}

function vejledning() {
  s.vejledning = guideEfterSkridt(s.vejledning, guideStart, s);
  const trin = [
    [
      "1 · Find Mira",
      "Gå mod den gyldne pil. WASD / pile eller fingerpinden til venstre.",
    ],
    [
      "2 · Tal med Mira",
      "Gå tæt på brønden, og tryk Brug / E. Lumen følger dig.",
    ],
    [
      "3 · Prøv dine våben",
      "Vælg Sværd, Bue eller Magi i bunden. 1 / 2 / 3 på PC.",
    ],
    [
      "4 · Klar til øen",
      "Tryk Slå / Skyd / Kast lys eller mellemrum for at angribe. Kortet viser næste krystal og sikre rum.",
    ],
  ];
  const vis = trin[s.vejledning];
  $("vejledning").classList.toggle("skjult", !vis);
  if (vis) {
    $("vejledning").querySelector("b").textContent = vis[0];
    $("vejledning").querySelector("span").textContent = vis[1];
  }
}

// En label tegnes én gang som tekstur og forbliver læsbar fra alle kameravinkler.
function label(tekst, farve = "#e3f4e8", bredde = 256) {
  const c = document.createElement("canvas");
  c.width = bredde;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#152c3bd9";
  g.beginPath();
  if (g.roundRect) g.roundRect(1, 1, bredde - 2, 62, 16);
  else g.rect(1, 1, bredde - 2, 62);
  g.fill();
  g.fillStyle = farve;
  g.font = "600 23px system-ui";
  g.textAlign = "center";
  g.fillText(tekst, bredde / 2, 41);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const obj = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }),
  );
  obj.scale.set(bredde / 64 * 1.0, 1, 1);
  return obj;
}
function ring(x, z, r, farve = 0xcf8baf) {
  const obj = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      color: farve,
      transparent: true,
      opacity: .65,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  obj.rotation.x = -Math.PI / 2;
  obj.position.set(x, .05, z);
  obj.scale.setScalar(r);
  scene.add(obj);
  return obj;
}
function blink(x, z, farve = 0x6ff5cf, r = 1.5) {
  if (s.valg.roligeEffekter) r *= .65;
  const obj = ring(x, z, .1, farve);
  effekter.push({ obj, liv: .45, max: .45, r });
}

// Skade og automatisk loot kan aflæses ved figuren uden at skjule næste mål.
function flyvetekst(x, z, tekst, farve = "#efdca8", liv = 1.2) {
  if (flyvetekster.length >= 14) {
    const gammel = flyvetekster.shift();
    fjern(gammel.obj);
  }
  const obj = label(tekst, farve, 256);
  obj.scale.set(2.6, .65, 1);
  obj.position.set(x, 2.25, z);
  scene.add(obj);
  flyvetekster.push({ obj, liv, max: liv });
}

// Genstandskort og Blender-fund viser samme belønning, som allerede er gemt i rejsen.
function roligeFund() {
  return s.valg.roligeEffekter || mindreBevægelse.matches;
}
function visFund(fund, sted, færdig = null) {
  const belønning = medOpgavebelønning(fund, færdig);
  const rolig = roligeFund();
  fundfigur.vis(belønning, {
    x: sted.x, z: sted.z, kiste: sted.type === "kiste" ? sted.obj : null, rolig,
  });
  fundkort.vis(belønning, { rolig });
}

// Lokale teksturer og effekter frigives ved områdeskift; modelbiblioteket deles videre.
function fjern(obj) {
  if (!obj) return;
  scene.remove(obj);
  obj.traverse((del) => {
    if (del.geometry && !del.isSprite && !fællesGeometri.has(del.geometry)) {   // alle sprites deler én form
      del.geometry.dispose();
    }
    for (
      const mat of Array.isArray(del.material) ? del.material : del.material ? [del.material] : []
    ) {
      if (fællesMaterialer.has(mat)) continue;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
    if (del.isInstancedMesh) del.dispose();
  });
}

function nyFjende(data) {
  const boss = !!data.boss;
  const liv = boss ? [150, 185, 235][data.grotte] : { slim: 38, stenvogter: 58, krystaldyr: 45 }[data.art];
  const obj = kopi(modeller, data.art, data.x, data.z, boss ? 2.1 : 1.1);
  obj.userData.skala = boss ? 2.1 : 1.1;
  scene.add(obj);
  const navn = boss ? ["Mosvogteren", "Krystalhjorten", "Den gamle vogter"][data.grotte] : null;
  const tekst = boss ? label(navn, "#edd6a4", 320) : null;
  if (tekst) {
    tekst.position.y = 4.8;
    obj.add(tekst);
  }
  const bar = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, .1),
    new THREE.MeshBasicMaterial({
      color: boss ? 0xd6a371 : 0x76e8ce,
      side: THREE.DoubleSide,
    }),
  );
  bar.position.y = boss ? 3.7 : 2.5;
  obj.add(bar);
  const f = {
    ...data,
    obj,
    hp: liv,
    max: liv,
    timer: 1.3,
    varsling: 0,
    ring: null,
    stun: 0,
    bar,
    kamp: false,
    summoned: false,
  };
  fjender.push(f);
  return f;
}

// Kun aktivitetstilstand og koordinater gemmes; geometri dannes fra det validerede frø.
function skiftVerden() {
  afbrydAngreb();
  fundfigur?.ryd();
  fundkort.skjul();
  nær = null;
  angrebspause = 0;
  øveskiver.length = 0;
  målFjende = null;
  egetSpor = null;
  ruteNøgle = "";
  skilte.length = 0;
  for (const t of flyvetekster) fjern(t.obj);
  flyvetekster.length = 0;
  if (verden) fjern(verden.rod);
  for (const f of fjender) {
    fjern(f.obj);
    if (f.ring) fjern(f.ring);
  }
  for (const t of ting) fjern(t.obj);
  for (const p of skud) fjern(p.obj);
  for (const e of effekter) fjern(e.obj);
  fjender.length = 0;
  ting.length = 0;
  skud.length = 0;
  effekter.length = 0;
  if (mira) fjern(mira);
  verden = s.grotte
    ? bygGrotte(
      modeller,
      danGrotte(s.grotte.frø, s.grotte.id, s.grotte.dybde),
      s.opgaver["boss" + s.grotte.id] >= 1,
    )
    : bygØ(modeller, s.frø);
  scene.add(verden.rod);
  scene.background.set(s.grotte ? 0x172439 : 0xa9c4c9);
  scene.userData?.vedOmråde?.(!!s.grotte);                      // himmel og spejlinger kun på øen
  scene.fog.color.copy(scene.background);
  scene.fog.near = s.grotte ? 25 : 38;
  scene.fog.far = s.grotte ? 60 : 100;
  for (const f of verden.fjender) {
    if (s.beroliget.includes(f.id) || f.boss && s.opgaver["boss" + f.grotte]) {
      continue;
    }
    nyFjende(f);
  }
  for (const data of verden.ting) {
    if (s.hentet.includes(data.id)) continue;
    const obj = kopi(
      modeller,
      data.type === "kiste" ? "skattekiste" : "fundkrystal",
      data.x,
      data.z,
      data.type === "kiste" ? 1 : .7,
    );
    scene.add(obj);
    ting.push({ ...data, obj });
  }
  for (const sted of verden.steder) {
    const l = label(
      sted.navn,
      sted.type === "grotte" ? "#9de8dc" : "#e3d5b4",
      256,
    );
    l.position.set(sted.x, sted.type === "portal" ? 6 : 3.1, sted.z);
    verden.rod.add(l);
  }
  for (const skilt of verden.mærker || []) {
    const l = label(skilt.tekst, "#efd9a8", 384);
    l.scale.set(4.2, .7, 1);
    l.position.set(skilt.x, 2.8, skilt.z);
    verden.rod.add(l);
    skilte.push(l);
  }
  if (!s.grotte) {
    mira = kopi(modeller, "eventyrer", 2, 0, 1);
    mira.rotation.y = 0;                                     // ansigtet (+Z) vender mod landsbyen og kameraet
    scene.add(mira);
    bygØveplads();
  }
  helt.position.set(s.x, 0, s.z);
  ven.position.set(s.x - 1.4, 1, s.z + 1.4);
  kamMål.set(s.x, 0, s.z);
  $("område").textContent = s.grotte ? `${GROTTENAVNE[s.grotte.id]} · dybde ${s.grotte.dybde}` : "Lysvig · krystallernes ø";
  hud();
  gem();
}

function start() {
  $("menu").classList.add("skjult");
  $("hud").classList.remove("skjult");
  kører = true;
  paused = false;
  guideStart = { x: s.x, z: s.z };
  skiftVåben(s.våben, false);
  skiftVerden();
  besked(
    s.opgaver.mira ? "Velkommen tilbage. Lumen husker vejen." : "Mira venter ved brønden. Gå tæt på og tryk Brug.",
    6,
  );
  tone(330, .2);
}
function skiftVåben(v, afSpiller = true) {
  const ændret = s.våben !== v || afSpiller && s.vejledning === 2;
  s.våben = v;
  if (afSpiller && s.vejledning === 2) s.vejledning = 3;
  document.querySelectorAll("[data-våben]").forEach((b) => b.classList.toggle("valgt", b.dataset.våben === v));
  afbrydAngreb();
  kampfigur?.skiftVåben(v);
  kampstatus();
  if (afSpiller && ændret) gem();
}

// Tre originale Blender-skiver gør våbnenes afstand og bevægelse nemme at øve.
function bygØveplads() {
  for (const skive of nyeØveskiver()) {
    skive.obj = kopi(modeller, "træningsskive", skive.x, skive.z);
    skive.label = label(skive.navn, "#eed4a4", 320);
    skive.label.position.y = 2.5;
    skive.label.scale.set(3.5, .7, 1);
    skive.obj.add(skive.label);
    verden.rod.add(skive.obj);
    øveskiver.push(skive);
  }
  verden.steder.push({
    id: "øveplads",
    navn: "Øveplads · prøv tre våben",
    type: "øvelse",
    x: 0,
    z: 10,
  });
}

function ramSkive(skive, våben) {
  const r = ramØveskive(s, skive, våben, øveskiver);
  if (!r.ramt) {
    if (r.tip && tid - sidstØveTip > 3) {
      besked(r.tip, 2);
      sidstØveTip = tid;
    }
    return;
  }
  skive.ramtTid = tid;
  skive.label.material.color.set(0x98f4bb);
  blink(skive.x, skive.z, 0x85ecd4, 1.2);
  const antal = øveskiver.filter((t) => t.ramt).length;
  flyvetekst(
    skive.x,
    skive.z,
    `✓ ${VÅBEN[våben].navn} · ${antal}/3`,
    "#96eddb",
  );
  tone(580 + antal * 100, .15);
  if (r.fuldført) {
    besked(
      r.belønning
        ? "Øvelse klaret! +25 kobber · +15 erfaring. Mira venter ved brønden."
        : "Alle tre skiver lyser igen. Du er klar til øen!",
      5,
    );
    hud();
    gem();
  }
}

function findMål() {
  if (s.vejledning < 2 && s.opgaver.mira) {
    return s.grotte ? verden.steder.find((t) => t.type === "udgang") : STEDER[0];
  }
  const mål = næsteOpgave(s);
  if (!mål) return null;
  if (mål.id === "mira") {
    return s.grotte ? verden.steder.find((t) => t.type === "udgang") : STEDER[0];
  }
  if (mål.id === "krystal" || mål.id === "kiste") {
    return ting.filter((t) => t.type === mål.id).sort((a, b) =>
      Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z)
    )[0] || (s.grotte ? verden.steder.find((t) => t.type === "udgang") : STEDER[0]);
  }
  if (mål.id === "vogter") {
    return fjender.filter((f) => f.hp > 0 && f.art === "stenvogter").sort((
      a,
      b,
    ) =>
      Math.hypot(a.obj.position.x - s.x, a.obj.position.z - s.z) -
      Math.hypot(b.obj.position.x - s.x, b.obj.position.z - s.z)
    )[0]?.obj.position || (s.grotte ? verden.steder.find((t) => t.type === "udgang") : STEDER[2]);
  }
  if (mål.id.startsWith("boss")) {
    const id = Number(mål.id.slice(-1));
    return bossSpor(s, id, fjender, verden.steder) || STEDER[id + 1];
  }
  return s.grotte ? verden.steder.find((t) => t.type === "udgang") : STEDER[4];
}

// Sporet genberegnes ved et nyt rum eller en ny retning, ikke for hvert renderbillede.
function opdatérSpor(mål) {
  if (!mål) {
    rute = [];
    vejpil.visible = false;
    sporring.visible = false;
    return;
  }
  const trin = 8,                                          // ruten regnes kun om for hver 8. meter (det kan tage lidt tid på en tablet)
    n = `${s.grotte?.frø || "ø"}-${s.grotte?.dybde || 0}-${Math.floor((s.x + trin / 2) / trin)},${
      Math.floor((s.z + trin / 2) / trin)
    }-${Math.round(mål.x)},${Math.round(mål.z)}`;
  if (n !== ruteNøgle) {
    ruteNøgle = n;
    gemtRute = s.grotte ? rumRute(verden.grotte, s, mål) : øRute(s, mål, (x, z) => frit(verden, x, z));
  }
  rute = fortsætSpor(s, gemtRute, (x, z) => frit(verden, x, z));
  const næste = rute[1] || mål,
    dx = næste.x - s.x,
    dz = næste.z - s.z,
    d = Math.hypot(dx, dz) || 1;
  vejpil.visible = s.valg.vejviser &&
    Math.hypot(mål.x - s.x, mål.z - s.z) > 2.5;
  vejpil.position.set(s.x + dx / d * 1.5, .13, s.z + dz / d * 1.5);
  vejpil.rotation.y = Math.atan2(dx, dz);
  sporring.visible = s.valg.vejviser;
  sporring.position.set(mål.x, .06, mål.z);
}

function kampHud() {
  målFjende = vælgMål(
    s,
    fjender,
    VÅBEN[s.våben].rækkevidde,
    (x, z) => frit(verden, x, z),
    målFjende,
  );
  const f = målFjende || nærFjende(9), data = f ? FJENDETYPER[f.art] : null;
  $("kampmål").classList.toggle("skjult", !f);
  sigtering.visible = s.valg.autosigte && !!målFjende;
  if (målFjende) {
    sigtering.position.set(
      målFjende.obj.position.x,
      .065,
      målFjende.obj.position.z,
    );
    sigtering.scale.setScalar(målFjende.boss ? 1.7 : .9);
    sigtering.material.color.set(
      data?.svaghed === s.våben ? 0xf1d497 : 0x90e8d3,
    );
  }
  if (!f) return;
  sætTekst(
    "fjendenavn",
    f.boss ? ["Mosvogteren", "Krystalhjorten", "Den gamle vogter"][f.grotte] : data.navn,
  );
  $("fjendeliv").max = f.max;
  $("fjendeliv").value = f.hp;
  sætTekst(
    "fjendehint",
    `${data.svaghed === s.våben ? "✦ Stærkt valg" : "Prøv " + data.svaghed} · ${data.hint}`,
  );
  sætTekst(
    "bossvarsel",
    f.varsling > 0
      ? (f.boss && f.art === "krystaldyr" ? "KRYSTALVIFTE · gå sidelæns" : "SLAG PÅ VEJ · ud af lysringen")
      : f.boss
      ? "Tre segl · en rolig hånd"
      : "",
  );
  $("kampmål").classList.toggle("varsler", f.varsling > 0);
}
function hud() {
  const max = maxLiv(s);
  $("liv").max = max;
  $("liv").value = s.hp;
  sætTekst("livtekst", `${Math.ceil(s.hp)} / ${max}`);
  $("mana").value = s.mana;
  sætTekst("niveau", `Niveau ${niveau(s)}`);
  sætTekst("mønter", Math.floor(s.mønter));
  sætTekst("udstyr", `Udstyr ${["I", "II", "III", "IV"][s.udstyr]}`);
  sætTekst("eliksirtekst", `Q · ${s.eliksirer} tilbage`);
  sætTekst("lyd", s.lyd ? "♫" : "♪̸");
  const o = næsteOpgave(s);
  sætTekst($("opgave").querySelector("h2"), o ? o.navn : "Øen synger igen");
  sætTekst(
    $("opgave").querySelector("p"),
    o ? o.tekst : "Alle segl er hjemme. Udforsk øen og nye grotter.",
  );
  sætTekst(
    $("opgave").querySelector("small"),
    o ? `${Math.min(s.opgaver[o.id] || 0, o.mål)} / ${o.mål} · ${s.xp} erfaring` : "Eventyret fuldført",
  );
  const mål = egetSpor || findMål();
  opdatérSpor(mål);
  sætTekst(
    "afstand",
    mål
      ? `${
        Math.round(
          rute.length ? ruteLængde(rute) : Math.hypot(mål.x - s.x, mål.z - s.z),
        )
      } skridt · ${egetSpor ? egetSpor.navn : "følg det gyldne spor"}`
      : "",
  );
  nær =
    [...ting, ...verden.steder].filter((t) => Math.hypot(t.x - s.x, t.z - s.z) < 2.8).sort((a, b) =>
      Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z)
    )[0];
  $("prompt").classList.toggle("skjult", !nær);
  $("hud").classList.toggle("har-nær", !!nær);
  if (nær) {
    sætTekst(
      "prompt",
      `Brug / E · ${
        nær.navn ||
        (nær.type === "kiste" ? "Åbn skattekisten" : "Saml lyskrystallen")
      }`,
    );
  }
  tegnKort(mål);
  kampHud();
  vejledning();
}

// Minikortet viser rumforbindelser og mål; det drejer ikke med kameraet.
function tegnKort(mål) {
  tegnRejsekort($("kort"), { s, verden, fjender, ting, mål, rute, tid });
}

function brug() {
  if (!kører || paused || !nær) return;
  if (nær.type === "øvelse") {
    const antal = øveskiver.filter((t) => t.ramt).length;
    dialog(
      "Lysvigs øveplads",
      `<p>Ram de tre skiver med våbnet på hvert skilt. Gå tæt på sværdskiven; brug bue og magi på afstand. Autosigte hjælper, eller du kan klikke på skiven.</p><p>${antal} af 3 skiver lyser. ${
        s.træning
          ? "Din belønning er allerede gemt. Øv så tit du vil."
          : "Første gennemførte øvelse giver 25 kobber og 15 erfaring."
      }</p>`,
      [[antal === 3 ? "Øv igen" : "Tilbage til øvelsen", () => {
        if (antal === 3) {
          for (const skive of øveskiver) {
            skive.ramt = false;
            skive.ramtTid = null;
            skive.label.material.color.set(0xffffff);
          }
        }
        lukDialog();
      }]],
      "FRIVILLIG · INGEN FARE",
    );
    return;
  }
  tone(520, .1);
  if (nær.type === "krystal" || nær.type === "kiste") {
    const t = nær;
    const fund = indsamlFund(s, t);
    if (!fund) return;
    // Den åbnede kiste ejes nu af fundforløbet; den kan ikke samles igen.
    if (t.type !== "kiste") fjern(t.obj);
    ting.splice(ting.indexOf(t), 1);
    nær = null;
    blink(t.x, t.z, 0x85ecd4);
    const færdig = opgave(t.type);
    if (t.type === "krystal") {
      if (!færdig) besked("Lyskrystal fundet · +3 kobber");
      flyvetekst(t.x, t.z, "+3 kobber · lysenergi", "#96eddb", 1.6);
    } else {
      const flere = fund.genstande.find((g) => g.type === "eliksir")?.antal || 0;
      if (!færdig) {
        besked(`Skat! +18 kobber · +15 erfaring${flere ? " · 1 eliksir" : ""}`);
      }
      flyvetekst(t.x, t.z, "+18 kobber · +15 erfaring", "#efd3a3", 2.0);
    }
    visFund(fund, t, færdig);
    hud();
    gem();
    return;
  }
  if (nær.type === "mira") {
    if (s.vejledning < 2) s.vejledning = 2;
    opgave("mira");
    s.hp = maxLiv(s);
    s.mana = 100;
    const pris = [60, 120, 220][s.udstyr];
    dialog(
      "Mira, krystalsmeden",
      `<p>»Porten mod nord har mistet sine tre segl. Mosgrotten, Spejlgrotten og Kobberdybet vogter hvert sit. Tag Lumen med — et lille lys kan vise en stor vej.«</p><p>Prøv gerne de tre våben på øvepladsen syd for brønden, inden du går ud på øen.</p><p>Du er helet. ${s.mønter} kobber i tasken.<br>${
        pris ? `Næste udstyr: ${pris} kobber. Stærkere våben og +10 liv.` : "Dit udstyr er fuldt opgraderet."
      }</p>`,
      [
        ...(pris
          ? [["Opgradér udstyr", () => {
            if (opgradér(s)) {
              gem();
              lukDialog();
              besked("Mira har forbedret alle dine våben og din rustning.");
            } else {
              lukDialog();
              besked(`Du mangler ${pris - s.mønter} kobber til opgraderingen.`);
            }
          }]]
          : []),
        ["Køb eliksir · 15 kobber", () => {
          lukDialog();
          if (s.eliksirer >= 99) {
            besked("Din taske har allerede 99 eliksirer.");
            return;
          }
          if (s.mønter >= 15) {
            s.mønter -= 15;
            givEliksirer(s, 1);
            gem();
            besked("En ny eliksir er klar i tasken.");
          } else {besked(
              "Du mangler kobber. Skattekister er et godt sted at lede.",
            );}
        }],
        ["Videre på rejsen", lukDialog],
      ],
      "LYSVIG",
    );
    return;
  }
  if (nær.type === "grotte") {
    const id = nær.grotte;
    const tips = [
      "Mossvampene lyser i mørket. Mosvogteren spreder brede ringe; sværdet er stærkt mod moslyset.",
      "Violette krystaller spejler dit lys. Krystalhjorten sender en vifte; gå sidelæns og brug buen.",
      "Gamle søjler holder på kobberets varme. Den gamle vogter varsler et stort slag; brug magi og hold afstand.",
    ];
    dialog(
      GROTTENAVNE[id],
      `<p>${
        tips[id]
      }</p><p>Find den gyldne port på første dybde. Vogteren og seglet er på dybde 2. Kortet viser åbne rum, og du kan altid vende tilbage ved indgangen.</p>`,
      [
        ["Gå ind", () => {
          lukDialog();
          startGrotte(s, id);
          skiftVerden();
          besked(`${GROTTENAVNE[id]} · find porten til dybde 2.`);
        }],
        ["Bliv på øen", lukDialog],
      ],
      "NYE RUM VED HVERT BESØG",
    );
    return;
  }
  if (nær.type === "trappe") {
    s.grotte.dybde = 2;
    s.x = 0;
    s.z = 0;
    skiftVerden();
    besked("Dybde 2. Følg kortets gyldne spor til vogteren.", 5);
    return;
  }
  if (nær.type === "udgang") {
    forladGrotte();
    return;
  }
  if (nær.type === "portal") {
    if (!alleSegl(s)) {
      besked(
        `Porten venter på tre segl. Du har ${[0, 1, 2].filter((i) => s.opgaver["boss" + i]).length}.`,
        5,
      );
      return;
    }
    opgave("finale");
    gem();
    dialog(
      "Øens hjerte er vågnet",
      "<p>De tre segl mødes. Krystallerne synger, og et varmt lys vender tilbage til Lysvig.</p><p>Mira og Lumen takker dig. Din rejse er fuldført, men øen og nye grotter venter stadig, hvis du vil udforske.</p>",
      [["Udforsk videre", lukDialog], ["Se min rejse", inventar]],
      "EVENTYRET FULDFØRT",
    );
  }
}
function forladGrotte() {
  const id = s.grotte.id;
  s.grotte = null;
  s.x = STEDER[id + 1].x;
  s.z = STEDER[id + 1].z + 3.5;
  skiftVerden();
  besked("Tilbage på øen. Mira kan hele dig og opgradere udstyret.");
}

function ramFjende(f, antal) {
  if (f.hp <= 0) return;
  f.hp = Math.max(0, f.hp - antal);
  f.kamp = true;
  f.stun = .13;
  flyvetekst(
    f.obj.position.x,
    f.obj.position.z,
    String(Math.round(antal)),
    "#aff2d9",
    .85,
  );
  blink(f.obj.position.x, f.obj.position.z, 0xaef6d5, .85);
  tone(220, .07, .035);
  if (f.hp === 0) {
    fjern(f.obj);
    if (f.ring) {
      fjern(f.ring);
      f.ring = null;
    }
    if (!s.beroliget.includes(f.id)) s.beroliget.push(f.id);       // bossens lysvæsner får samme id ved hvert nyt forsøg
    s.xp += f.boss ? 45 : 12;
    s.mønter += f.boss ? 30 : 7;
    if (!f.boss) {
      flyvetekst(
        f.obj.position.x,
        f.obj.position.z,
        "+7 kobber · +12 erfaring",
        "#efd3a3",
        2.0,
      );
    }
    const vogteropgave = f.art === "stenvogter" ? opgave("vogter") : null;
    if (f.boss) {
      const færdig = opgave("boss" + f.grotte);
      const flere = givEliksirer(s, 2);
      s.hp = maxLiv(s);
      s.mana = 100;
      besked(
        `✦ Segl fundet! ${["Mosvogteren", "Krystalhjorten", "Den gamle vogter"][f.grotte]} hviler nu. ${flere ? `+${flere} ${flere === 1 ? "eliksir" : "eliksirer"}` : "Tasken er fuld af eliksirer"}`,
        7,
      );
      visFund(medOpgavebelønning(seglFund(f.grotte, flere), vogteropgave), {
        x: f.obj.position.x, z: f.obj.position.z,
      }, færdig);
      const udgang = {
        id: "bossudgang",
        navn: "Seglet er dit · tilbage til øen",
        type: "udgang",
        x: f.obj.position.x,
        z: f.obj.position.z,
      };
      verden.steder.push(udgang);
      const l = label("Seglet er dit · Brug");
      l.position.set(udgang.x, 2, udgang.z);
      verden.rod.add(l);
      const port = kopi(modeller, "portal", udgang.x, udgang.z, .7);
      verden.rod.add(port);
    }
    gem();
  }
}
function nærFjende(r = 30) {
  return vælgMål(s, fjender, r, (x, z) => frit(verden, x, z));
}
function sendSkud(
  x,
  z,
  dx,
  dz,
  type,
  dmg,
  art = null,
  vedAngreb = null,
  højde = 1.1,
  dy = 0,
) {
  const hastighed = { magi: 14, bue: 26, ven: 21, fjende: 10 }[type];
  let obj;
  if (type === "bue") {
    obj = kopi(modeller, "kamppil");
    obj.rotation.y = Math.atan2(-dx, -dz);
  } else {
    obj = new THREE.Mesh(
      boldGeo,
      new THREE.MeshBasicMaterial({ color: farver[type] }),
    );
    obj.scale.setScalar(type === "magi" ? 1.8 : 1);
  }
  obj.position.set(x, højde, z);
  scene.add(obj);
  skud.push({
    obj,
    dx: dx * hastighed,
    dz: dz * hastighed,
    dy: dy * hastighed,
    liv: type === "bue" ? .95 : 1.6,
    type,
    dmg,
    art,
    niveau: vedAngreb?.niveau ?? niveau(s),
    udstyr: vedAngreb?.udstyr ?? s.udstyr,
  });
}
function angrib() {
  if (!kører || paused || angreb || angrebspause > 0) return;
  const v = VÅBEN[s.våben];
  if (s.vejledning === 3) {
    s.vejledning = 4;
    gem();
  }
  if (s.mana < v.mana) {
    angrebspause = .35;
    if (tid - sidstEnergiTip > 3) {
      besked("Energien lader op. Brug sværd eller bue imens.", 2);
      sidstEnergiTip = tid;
    }
    return;
  }
  s.mana -= v.mana;
  angrebspause = v.pause;
  let dx = retning.x, dz = retning.y;
  const mål = vælgMål(
    s,
    fjender,
    v.rækkevidde,
    (x, z) => frit(verden, x, z),
    målFjende,
  );
  målFjende = mål;
  angrebMål = null;
  if (sigte && (!s.valg.autosigte || !mål) && !touch) {
    dx = sigte.x - s.x;
    dz = sigte.z - s.z;
    angrebMål = { x: sigte.x, z: sigte.z };
  } else if (mål && s.valg.autosigte) {
    dx = mål.obj.position.x - s.x;
    dz = mål.obj.position.z - s.z;
    angrebMål = mål;
  } else if (s.valg.autosigte && !sigte) {
    const skive = øveskiver.filter((t) =>
      !t.ramt && t.våben === s.våben &&
      Math.hypot(t.x - s.x, t.z - s.z) <= v.rækkevidde &&
      friLinje(s, t, (x, z) => frit(verden, x, z))
    )
      .sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
    if (skive) {
      dx = skive.x - s.x;
      dz = skive.z - s.z;
      angrebMål = skive;
    }
  }
  if (Math.hypot(dx, dz) < .001) {
    dx = retning.x;
    dz = retning.y || -1;
    angrebMål = null;
  }
  const d = Math.hypot(dx, dz);
  dx /= d;
  dz /= d;
  retning.set(dx, dz);
  helt.rotation.y = Math.atan2(-dx, -dz);
  angreb = startAngreb(s.våben, {
    x: s.x,
    z: s.z,
    dx,
    dz,
    skade: skade(s, mål?.art),
    art: mål?.art,
    udstyr: s.udstyr,
    niveau: niveau(s),
  }, sidsteSværd && tid - sidsteSværd.start < 1.1 ? sidsteSværd.slag : null);
  if (s.våben === "sværd") sidsteSværd = { slag: angreb.slag, start: tid };
  else sidsteSværd = null;
  kampfigur.pose({
    våben: s.våben,
    tid,
    fart: 0,
    fremskridt: 0,
    slag: angreb.slag,
  });
  kampstatus();
}

// Arme og skade følger det samme forløb: pilen flyver ved strengens slip, aldrig ved trykket.
function kampTrin(dt, fart) {
  // Autosigte følger det samme synlige mål under tilløbet, også mens helten går.
  const p = angrebMål?.obj?.position || angrebMål;
  if (
    angreb && !angreb.slået && p && angrebMål.hp !== 0 &&
    Math.hypot(p.x - s.x, p.z - s.z) <= VÅBEN[angreb.type].rækkevidde &&
    friLinje(s, p, (x, z) => frit(verden, x, z))
  ) {
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    if (d > .001) {
      angreb = Object.freeze({
        ...angreb,
        dx: (p.x - s.x) / d,
        dz: (p.z - s.z) / d,
      });
    }
  }
  const trin = angreb ? opdatérAngreb(angreb, dt) : null;
  if (trin) angreb = trin.angreb;
  if (angreb) {
    retning.set(angreb.dx, angreb.dz);
    helt.rotation.y = Math.atan2(-angreb.dx, -angreb.dz);
  }
  const pose = {
    våben: s.våben,
    tid,
    fart,
    fremskridt: angreb?.fremskridt ?? null,
    slag: angreb?.slag ?? 1,
  };
  if (trin?.udløs) {
    // Et langsomt billede må ikke flytte udgangen: brug den nøjagtige slip-pose først.
    kampfigur.pose({
      ...pose,
      fremskridt: { sværd: .35, bue: .55, magi: .4 }[angreb.type],
    });
    udløsAngreb(angreb);
  }
  kampfigur.pose(pose);
  if (trin?.færdig) angreb = null;
  kampstatus();
}

function kampstatus() {
  opdatérKampstatus({
    våben: s.våben,
    energi: s.mana,
    fremskridt: angreb?.fremskridt ?? null,
    slag: angreb?.slag ?? 1,
    pause: angrebspause,
    varighed: VÅBEN[s.våben].pause,
  });
}

// Rejser, død og våbenskift må ikke efterlade et skjult angreb i den nye scene.
function afbrydAngreb() {
  angreb = null;
  angrebMål = null;
  sidsteSværd = null;
  kampfigur?.nulstil();
}

function udløsAngreb(a) {
  const { dx, dz } = a;
  const vedSlag = {
    ...s,
    våben: a.type,
    udstyr: a.udstyr,
    xp: 90 * (a.niveau - 1) ** 2,
  };
  if (a.type === "sværd") {
    const r = ring(s.x + dx * .9, s.z + dz * .9, .4, 0xefd9a9);
    effekter.push({ obj: r, liv: .23, max: .23, r: 2 });
    for (const f of fjender) {
      if (
        f.hp > 0 && sværdRammer(s, f.obj.position, { x: dx, z: dz }) &&
        friLinje(s, f.obj.position, (x, z) => frit(verden, x, z))
      ) {
        ramFjende(f, skade(vedSlag, f.art));
        if (f.hp > 0) f.stun = Math.max(f.stun, f.boss ? .08 : .22);
      }
    }
    for (const skive of øveskiver) {
      if (
        sværdRammer(s, skive, { x: dx, z: dz }) &&
        friLinje(s, skive, (x, z) => frit(verden, x, z))
      ) ramSkive(skive, a.type);
    }
    tone(240, .14);
  } else {
    const fra = kampfigur.munding({ x: dx, z: dz });
    const p = angrebMål?.obj?.position || angrebMål;
    let skudX = dx, skudZ = dz, hældning = 0;
    if (p && angrebMål.hp !== 0) {
      const d = Math.hypot(p.x - fra.x, p.z - fra.z);
      if (d > .3) {
        skudX = (p.x - fra.x) / d;
        skudZ = (p.z - fra.z) / d;
      }
      if (a.type === "magi") hældning = (1.1 - fra.y) / Math.max(3, d);
    } else if (a.type === "magi") {
      hældning = (1.1 - fra.y) / VÅBEN.magi.rækkevidde;
    }
    // En pil må ikke dukke op bag en væg, selv hvis buen står helt op ad den.
    if (
      friLinje(s, fra, (x, z) => frit(verden, x, z)) &&
      frit(verden, fra.x, fra.z)
    ) {
      sendSkud(
        fra.x,
        fra.z,
        skudX,
        skudZ,
        a.type,
        a.skade,
        a.art,
        a,
        fra.y,
        hældning,
      );
    }
    tone(a.type === "magi" ? 740 : 460, .14);
  }
}
function eliksir() {
  if (!kører || paused) return;
  if (drik(s)) {
    besked("Eliksir · liv og energi genopfyldt");
    blink(s.x, s.z, 0x98f4bb, 3);
    tone(600, .3);
    gem();
  } else {besked(
      s.eliksirer ? "Dit liv og din energi er allerede fulde." : "Ingen eliksirer. Mira sælger flere.",
    );}
}

function ramHelt(antal) {
  s.hp = Math.max(0, s.hp - antal);
  helbredstid = 5;
  blink(s.x, s.z, 0xf3a392, 1.5);
  tone(120, .16);
  $("liv").value = s.hp;
  if (s.hp <= 0) {
    s.mønter = Math.max(0, s.mønter - 10);
    s.hp = maxLiv(s);
    s.mana = 100;
    s.grotte = null;
    s.x = 0;
    s.z = 5;
    skiftVerden();
    dialog(
      "Lumen viser vejen hjem",
      "<p>Lumen har båret dit lys tilbage til Lysvig. Du beholder dine skatte, niveau og segl. 10 kobber gik til en tryg hjemrejse.</p><p>Prøv at skifte våben, opgradere hos Mira og gå væk fra vogternes lysringe.</p>",
      [["Prøv igen", lukDialog]],
      "EN NY CHANCE",
    );
  }
}

// Et fjendeslag varsles på gulvet, så både mus og fingre kan undvige i tide.
function opdatérFjender(dt) {
  for (const f of fjender) {
    if (f.hp <= 0) continue;
    const p = f.obj.position,
      dx = s.x - p.x,
      dz = s.z - p.z,
      d = Math.hypot(dx, dz);
    f.obj.visible = d < 45;
    f.bar.scale.x = Math.max(.01, f.hp / f.max);
    f.bar.quaternion.copy(f.obj.quaternion).invert().multiply(
      kamera.quaternion,
    );
    f.stun = Math.max(0, f.stun - dt);
    f.timer -= dt;
    f.obj.rotation.y = Math.atan2(dx, dz);                     // fjendernes ansigt (+Z) vender mod spilleren
    animer(f.obj, tid + f.x, d < 18 ? 1 : 0, f.art);
    if (d > 18 && !f.boss) continue;
    if (d > 24) continue;
    if (!friLinje(s, p, (x, z) => frit(verden, x, z))) {
      if (f.ring) {
        fjern(f.ring);
        f.ring = null;
      }
      f.varsling = 0;
      continue;
    }
    helbredstid = Math.max(helbredstid, 2);
    const radius = f.boss ? (f.art === "krystaldyr" ? 8 : 5.0) : (f.art === "stenvogter" ? 2.8 : 2.2);
    if (f.varsling > 0) {
      f.varsling -= dt;
      f.ring.material.opacity = s.valg.roligeEffekter ? .6 : .35 + .25 * Math.sin(tid * 20);
      f.ring.position.set(p.x, .06, p.z);
      if (f.varsling <= 0) {
        fjern(f.ring);
        f.ring = null;
        if (f.boss && f.art === "krystaldyr") {
          const vinkel = Math.atan2(dx, dz);
          for (let j = -2; j <= 2; j++) {
            sendSkud(
              p.x,
              p.z,
              Math.sin(vinkel + j * .17),
              Math.cos(vinkel + j * .17),
              "fjende",
              17,
            );
          }
        } else if (d < radius + .3) {
          ramHelt(f.boss ? 22 : 9);
          if (paused) return;
        }
        blink(p.x, p.z, 0xd3a7cf, radius);
        f.timer = f.boss ? 2.6 : 2.2;
      }
      continue;
    }
    if (d < radius + .1 && f.timer <= 0) {
      f.varsling = f.boss ? 1.1 : .8;
      f.ring = ring(p.x, p.z, radius, 0xeb9bc9);
      continue;
    }
    if (f.stun > 0) continue;
    const ønsket = f.boss && f.art === "krystaldyr" ? 6 : 1.7;
    const fart = (f.boss ? 2.3 : f.art === "slim" ? 2.4 : 1.9) * dt;
    if (d > ønsket) {
      const x = p.x + dx / d * fart, z = p.z + dz / d * fart;
      if (frit(verden, x, p.z)) p.x = x;
      if (frit(verden, p.x, z)) p.z = z;
    }
    if (f.boss && f.hp < f.max * .45 && !f.summoned) {
      f.summoned = true;
      for (const [j, ox] of [-1.5, 1.5].entries()) {
        const x = p.x + ox, z = p.z + 1.5;
        if (frit(verden, x, z)) {
          nyFjende({ id: f.id + "-lys-" + j, x, z, art: f.art, boss: false });
        }
      }
      besked(
        "Vogteren kalder på to små lysvæsner. Hold afstand og brug området omkring dig.",
        4,
      );
    }
  }
}

function opdatérSkud(dt) {
  opdatérFlyvere(skud, dt, {
    erFrit: (x, z) => frit(verden, x, z),
    afbryd: () => paused,
    fjern: (p) => fjern(p.obj),
    ramning: (p) => {
      const x = p.obj.position.x, z = p.obj.position.z;
      if (p.type === "fjende") {
        if (Math.hypot(x - s.x, z - s.z) < .7) {
          ramHelt(p.dmg);
          p.liv = 0;
        }
      } else {
        const skive = p.type !== "ven" &&
          øveskiver.find((t) => Math.hypot(x - t.x, z - t.z) < .85);
        if (skive) {
          ramSkive(skive, p.type);
          p.liv = 0;
          return;
        }
        const f = fjender.find((f) =>
          f.hp > 0 &&
          Math.hypot(x - f.obj.position.x, z - f.obj.position.z) <
            (f.boss ? 1.2 : .75)
        );
        if (f) {
          const vedSkud = {
            ...s,
            våben: p.type,
            udstyr: p.udstyr,
            xp: 90 * (p.niveau - 1) ** 2,
          };
          if (p.type === "magi") {
            blink(x, z, 0xba91ff, 3.2);
            for (const a of fjender) {
              if (
                a.hp > 0 &&
                Math.hypot(x - a.obj.position.x, z - a.obj.position.z) < 3.4 &&
                friLinje({ x, z }, a.obj.position, (x, z) => frit(verden, x, z))
              ) {
                ramFjende(a, skade(vedSkud, a.art));
                a.stun = .65;
              }
            }
          } else ramFjende(f, p.type === "ven" ? p.dmg : skade(vedSkud, f.art));
          p.liv = 0;
        }
      }
    },
  });
}

function opdatér(dt) {
  tid += dt;
  angrebspause = Math.max(0, angrebspause - dt);
  venpause -= dt;
  helbredstid = Math.max(0, helbredstid - dt);
  if (angrebHold !== null || taster.has(" ")) angrib();
  let vx = (taster.has("d") || taster.has("arrowright") ? 1 : 0) -
    (taster.has("a") || taster.has("arrowleft") ? 1 : 0) +
    joystick.x;
  let vz = (taster.has("w") || taster.has("arrowup") ? 1 : 0) -
    (taster.has("s") || taster.has("arrowdown") ? 1 : 0) +
    joystick.y;
  const længde = Math.hypot(vx, vz);
  if (længde > 1) {
    vx /= længde;
    vz /= længde;
  }
  const dx = vx * Math.cos(yaw) - vz * Math.sin(yaw),
    dz = -vx * Math.sin(yaw) - vz * Math.cos(yaw),
    fart = 5.2 * dt;
  if (frit(verden, s.x + dx * fart, s.z)) s.x += dx * fart;
  if (frit(verden, s.x, s.z + dz * fart)) s.z += dz * fart;
  if (længde > .05) {
    if (!angreb) retning.set(dx, dz).normalize();
  }
  helt.rotation.y = angreb ? Math.atan2(-angreb.dx, -angreb.dz) : Math.atan2(-retning.x, -retning.y);
  helt.position.set(s.x, Math.sin(tid * 9) * .035 * Math.min(1, længde), s.z);
  kampTrin(dt, Math.min(1, længde));
  ven.position.lerp(
    new THREE.Vector3(s.x - 1.4, 1.35 + Math.sin(tid * 2) * .2, s.z + 1.4),
    1 - Math.exp(-dt * 3),
  );
  ven.rotation.y = helt.rotation.y + Math.PI;                  // heltens forside er -Z, Lumens øjne sidder på +Z
  const mål = nærFjende(12);
  if (mål && venpause <= 0) {
    const a = mål.obj.position,
      b = ven.position,
      d = Math.hypot(a.x - b.x, a.z - b.z) || 1;
    sendSkud(
      b.x,
      b.z,
      (a.x - b.x) / d,
      (a.z - b.z) / d,
      "ven",
      7 + Math.floor(niveau(s) / 2),
    );
    venpause = 1.8;
  }
  if (!mål && helbredstid === 0) s.hp = Math.min(maxLiv(s), s.hp + 1.8 * dt);
  s.mana = Math.min(100, s.mana + 5 * dt);
  opdatérFjender(dt);
  if (paused) return;
  opdatérSkud(dt);
  if (paused) return;
  const rolig = roligeFund();
  fundfigur.opdatér(dt, { rolig });
  fundkort.opdatér(dt, { rolig });
  for (let i = flyvetekster.length - 1; i >= 0; i--) {
    const t = flyvetekster[i];
    t.liv -= dt;
    t.obj.position.y += dt * .6;
    t.obj.material.opacity = Math.min(1, t.liv / .35);
    if (t.liv <= 0) {
      fjern(t.obj);
      flyvetekster.splice(i, 1);
    }
  }
  for (let i = effekter.length - 1; i >= 0; i--) {
    const e = effekter[i];
    e.liv -= dt;
    e.obj.scale.setScalar(e.r * (1 - e.liv / e.max));
    e.obj.material.opacity = e.liv / e.max * .75;
    if (e.liv <= 0) {
      fjern(e.obj);
      effekter.splice(i, 1);
    }
  }
  for (const t of ting) {
    if (t.type === "krystal") {
      t.obj.position.y = .25 +
        (rolig ? 0 : Math.sin(tid * 2 + t.x) * .15);
      if (!rolig) t.obj.rotation.y += dt * .7;
    }
  }
  for (const skive of øveskiver) {
    skive.label.visible = Math.hypot(skive.x - s.x, skive.z - s.z) < 17;
    const slagTid = skive.ramtTid == null ? 1 : tid - skive.ramtTid;
    skive.obj.rotation.x = slagTid < .4 ? Math.sin(slagTid * Math.PI / .4) * -.12 : 0;
  }
  for (const skilt of skilte) {
    skilt.visible = Math.hypot(skilt.position.x - s.x, skilt.position.z - s.z) < 20;
  }
  sporring.material.opacity = s.valg.roligeEffekter ? .65 : .62 + Math.sin(tid * 2) * .12;
  glød.position.set(ven.position.x, 2, ven.position.z);
  hudtid += dt;
  if (hudtid > .15) {
    hudtid = 0;
    hud();
  }
  gemtid += dt;
  if (gemtid > 5) {
    gemtid = 0;
    gem();
  }
  if (beskedtid > 0) {
    beskedtid -= dt;
    if (beskedtid <= 0) {
      $("besked").style.opacity = 0;
      $("hud").classList.remove("har-besked");
    }
  }
}

// Kameraet følger blødt. Touchdrag drejer det uden at kræve Pointer Lock.
function kameraTrin(dt) {
  const mål = helt ? helt.position : new THREE.Vector3(0, 0, 0);
  kamMål.lerp(mål, 1 - Math.exp(-dt * 6));
  kameraYaw += (yaw - kameraYaw) * (1 - Math.exp(-dt * 10));
  kameraZoom += (zoom - kameraZoom) * (1 - Math.exp(-dt * 8));
  const d = kameraZoom;
  kamPos.set(
    kamMål.x + Math.sin(kameraYaw) * d,
    Math.max(8, d * .68) + (touch ? .6 : 0),
    kamMål.z + Math.cos(kameraYaw) * d,
  );
  kamera.position.lerp(kamPos, 1 - Math.exp(-dt * 7));
  kamera.lookAt(kamMål.x, .65, kamMål.z);
  sol.position.set(kamMål.x - 18, 30, kamMål.z + 15);
  sol.target.position.set(kamMål.x, 0, kamMål.z);
}
let sidst = performance.now(), sidsteTegning = 0;
function loop(nu) {
  requestAnimationFrame(loop);
  const dt = Math.min(.045, (nu - sidst) / 1000);
  sidst = nu;
  if (kører && !paused) opdatér(dt);
  // Hold frame-tiden frisk under pause, men spar tegnekald og batteri bag dialogen.
  if (!document.hidden && (kører && !paused || nu - sidsteTegning >= 50)) {
    const tegneDelta = Math.min(.1, (nu - sidsteTegning) / 1000 || dt);
    kameraTrin(tegneDelta);
    renderer.render(scene, kamera);
    sidsteTegning = nu;
  }
}

// Touch bruger én finger til bevægelse og en anden til kamera eller handlinger.
let joystickId = null, dragId = null, dragX = 0, dragY = 0, dragAfstand = 0;
function flytPind(e) {
  const r = $("joystick").getBoundingClientRect(),
    dx = e.clientX - r.left - r.width / 2,
    dy = e.clientY - r.top - r.height / 2,
    d = Math.hypot(dx, dy) || 1,
    k = Math.min(1, 38 / d);
  joystick.x = dx * k / 38;
  joystick.y = -dy * k / 38;
  $("pind").style.transform = `translate(${dx * k}px,${dy * k}px)`;
}
$("joystick").addEventListener("pointerdown", (e) => {
  if (paused || joystickId !== null) return;
  joystickId = e.pointerId;
  $("joystick").setPointerCapture(e.pointerId);
  flytPind(e);
  e.preventDefault();
});
$("joystick").addEventListener("pointermove", (e) => {
  if (e.pointerId === joystickId) flytPind(e);
});
for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) {
  $("joystick").addEventListener(n, (e) => {
    if (e.pointerId !== joystickId) return;
    joystickId = null;
    joystick.x = 0;
    joystick.y = 0;
    $("pind").style.transform = "";
  });
}
$("verden").addEventListener("pointerdown", (e) => {
  if (!kører || paused) return;
  if (e.pointerType === "mouse" && e.button === 0) {
    sigteFra(e);
    angrib();
  } else if (
    dragId === null &&
    (e.pointerType === "mouse" && e.button === 2 ||
      e.pointerType !== "mouse" && e.clientX > innerWidth * .35)
  ) {
    dragId = e.pointerId;
    dragX = e.clientX;
    dragY = e.clientY;
    dragAfstand = 0;
    $("verden").setPointerCapture(e.pointerId);
  }
});
$("verden").addEventListener("pointermove", (e) => {
  if (e.pointerId === dragId) {
    const dx = e.clientX - dragX, dy = e.clientY - dragY;
    dragAfstand += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * .008 * s.valg.kamera;
    zoom = Math.max(10, Math.min(32, zoom + dy * .035 * s.valg.kamera));
    dragX = e.clientX;
    dragY = e.clientY;
  } else if (e.pointerType === "mouse") sigteFra(e);
});
for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) {
  $("verden").addEventListener(n, (e) => {
    if (e.pointerId === dragId) dragId = null;
  });
}
function sigteFra(e) {
  ray.setFromCamera(
    new THREE.Vector2(
      e.clientX / innerWidth * 2 - 1,
      -e.clientY / innerHeight * 2 + 1,
    ),
    kamera,
  );
  if (ray.ray.intersectPlane(jord, ramt)) sigte = { x: ramt.x, z: ramt.z };
}
$("verden").addEventListener("wheel", (e) => {
  zoom = Math.max(10, Math.min(34, zoom + e.deltaY * .015));
  e.preventDefault();
}, { passive: false });
$("verden").addEventListener("contextmenu", (e) => e.preventDefault());
// Kun en rigtig Tab-navigation gør HUD-knappers Mellemrum til et almindeligt knaptryk.
let tastaturMenu = false;
$("verden").tabIndex = -1;
window.addEventListener("pointerdown", () => {
  tastaturMenu = false;
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Tab") tastaturMenu = true;
  if (paused && e.key === "Tab") {
    const knapper = [
      ...$("dialog").querySelectorAll(
        "button:not(:disabled),input,select,a[href]",
      ),
    ];
    if (knapper.length) {
      const først = knapper[0], sidst = knapper[knapper.length - 1];
      if (!knapper.includes(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? sidst : først).focus();
      } else if (e.shiftKey && document.activeElement === først) {
        e.preventDefault();
        sidst.focus();
      } else if (!e.shiftKey && document.activeElement === sidst) {
        e.preventDefault();
        først.focus();
      }
    }
    return;
  }
  if (!kører) return;
  if (e.key === "Escape") {
    if (paused) lukDialog();
    else pausemenu();
    return;
  }
  if (paused) return;
  // Formularfelter og Tab-valgte knapper beholder deres almindelige taster.
  const fokus = tastFokus(
    e.key.toLowerCase(),
    tastaturMenu,
    Boolean(e.target.closest("input,select,textarea,[contenteditable]")),
    Boolean(e.target.closest("button,a")),
  );
  tastaturMenu = fokus.tastaturMenu;
  if (!fokus.spil) return;
  if (fokus.flytFokus) $("verden").focus({ preventScroll: true });
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
  ) e.preventDefault();
  if (!trykTast(taster, e.key.toLowerCase(), e.repeat)) return;
  if (e.repeat) return;
  if (e.key === " ") angrib();
  if (e.key.toLowerCase() === "e") brug();
  if (e.key.toLowerCase() === "q") eliksir();
  if (e.key.toLowerCase() === "i") inventar();
  if (e.key.toLowerCase() === "m") rejsekort();
  if (["1", "2", "3"].includes(e.key)) {
    skiftVåben(["sværd", "bue", "magi"][Number(e.key) - 1]);
  }
});
window.addEventListener("keyup", (e) => taster.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  taster.clear();
  joystick.x = 0;
  joystick.y = 0;
  if (kører && !paused) pausemenu();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && kører) {
    gem();
    if (!paused) pausemenu();
  }
});
window.addEventListener("pagehide", gem);
window.addEventListener("resize", () => {
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
$("angrib").onclick = () => {
  sigte = null;
  angrib();
};
$("angrib").addEventListener("pointerdown", (e) => {
  if (paused || !kører || angrebHold !== null) return;
  e.preventDefault();
  sigte = null;
  angrebHold = e.pointerId;
  $("angrib").setPointerCapture(e.pointerId);
  angrib();
});
for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) {
  $("angrib").addEventListener(n, (e) => {
    if (angrebHold === e.pointerId) angrebHold = null;
  });
}
$("interager").onclick = brug;
$("eliksir").onclick = eliksir;
$("pause").onclick = pausemenu;
$("hjælp").onclick = hjælp;
$("taske").onclick = inventar;
$("åbnkort").onclick = rejsekort;
$("indstillinger").onclick = indstillinger;
$("skjulvejledning").onclick = () => {
  s.vejledning = 4;
  $("vejledning").classList.add("skjult");
  gem();
};
$("lyd").onclick = () => {
  s.lyd = !s.lyd;
  hud();
  gem();
};
document.querySelectorAll("[data-våben]").forEach((b) => b.onclick = () => skiftVåben(b.dataset.våben));
$("start").onclick = () => {
  if (gemt) bekræftNy();
  else {
    s = nyRejse();
    start();
  }
};
$("fortsæt").onclick = () => {
  s = kopiRejse(gemt);
  skiftVåben(s.våben, false);
  start();
};

await lås($("lås"), "../../index.html");
$("menu").classList.remove("skjult");
$("start").disabled = true;
$("fortsæt").disabled = true;
try {
  modeller = await hentModeller();
  fundfigur = opretFundfigur(scene, modeller);
  for (const model of Object.values(modeller)) {
    model.traverse((del) => {
      if (del.geometry) fællesGeometri.add(del.geometry);
      for (
        const mat of Array.isArray(del.material) ? del.material : del.material ? [del.material] : []
      ) {
        fællesMaterialer.add(mat);
      }
    });
  }
  helt = kopi(modeller, "eventyrer");
  kampfigur = opretKampfigur(helt, modeller);
  ven = kopi(modeller, "følgesvend");
  scene.add(helt, ven);
  skiftVåben("sværd", false);
  $("indlæser").textContent = gemt
    ? `Din gemte rejse · niveau ${niveau(gemt)} · ${[0, 1, 2].filter((i) => gemt.opgaver["boss" + i]).length} af 3 segl`
    : "Øen er klar · PC, tablet og telefon";
  $("start").disabled = false;
  $("fortsæt").disabled = false;
  if (gemt) $("fortsæt").classList.remove("skjult");
  // ?debug giver adgang til scenen i konsollen (til afprøvning)
  if (location.search.includes("debug")) window.krystal = { scene, kamera, renderer, THREE, modeller, get s() { return s; }, get helt() { return helt; }, get fjender() { return fjender; } };
  requestAnimationFrame(loop);
} catch (err) {
  console.error(err);
  $("indlæser").textContent = "Øens modeller kunne ikke hentes. Genindlæs siden, når forbindelsen er klar.";
  window.dispatchEvent(new Event("spil-3d-fejl"));
}
