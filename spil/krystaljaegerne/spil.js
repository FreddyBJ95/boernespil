import * as THREE from "../3d-faelles/three.module.js";
import { lås } from "../laas.js";
import {
  alleSegl,
  bossSpor,
  danGrotte,
  drik,
  fremskridt,
  givEliksirer,
  GROTTENAVNE,
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
import { opdatérFlyvere } from "./projektiler.js";

const $ = (id) => document.getElementById(id);
const NØGLE = "krystaljaegerne-rejse-v1";
const touch = matchMedia("(pointer:coarse)").matches;
const mobil = touch || Math.min(innerWidth, innerHeight) < 700;
let gemt = null;
try {
  gemt = læsRejse(localStorage.getItem(NØGLE));
} catch { /* privat browser kan nægte lagring */ }
let s = nyRejse(), verden, modeller, helt, ven, mira, kører = false, paused = false;
let tid = 0, gemtid = 0, hudtid = 0, angrebspause = 0, venpause = 0, helbredstid = 0, beskedtid = 0;
let yaw = .62, zoom = touch ? 23 : 25, retning = new THREE.Vector2(0, -1), sigte = null, nær = null;
const taster = new Set(), joystick = { x: 0, y: 0 }, fjender = [], ting = [], skud = [], effekter = [];
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x789cab);
scene.fog = new THREE.Fog(0x789cab, 38, 100);
const kamera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 300);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $("verden"), antialias: !mobil, powerPreference: "high-performance" });
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
renderer.toneMappingExposure = 1.2;
scene.add(new THREE.HemisphereLight(0xc6e7ec, 0x385141, 2.5));
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
const ray = new THREE.Raycaster(), jord = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ramt = new THREE.Vector3();
const kamMål = new THREE.Vector3(), kamPos = new THREE.Vector3();
const boldGeo = new THREE.IcosahedronGeometry(.16, 1), ringGeo = new THREE.RingGeometry(.92, 1, 48);
const pilGeo = new THREE.CylinderGeometry(.035, .035, .75, 5), spidsGeo = new THREE.ConeGeometry(.11, .22, 5);
const fællesGeometri = new Set([boldGeo, ringGeo, pilGeo, spidsGeo]), fællesMaterialer = new Set();
const farver = { ven: 0x8cfbea, magi: 0xc197ff, bue: 0xffda95, fjende: 0xce8bf1 };
let lydkontekst;

// Små, selvskabte toner giver feedback uden eksterne lydfiler.
function tone(frekvens = 440, længde = .12, volumen = .06) {
  if (!s.lyd) return;
  try {
    lydkontekst ||= new (window.AudioContext || window.webkitAudioContext)();
    if (lydkontekst.state === "suspended") lydkontekst.resume();
    const oscillator = lydkontekst.createOscillator(), gain = lydkontekst.createGain(), nu = lydkontekst.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frekvens, nu);
    oscillator.frequency.exponentialRampToValueAtTime(frekvens * .75, nu + længde);
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
}
function gem() {
  if (!kører) return;
  try {
    localStorage.setItem(NØGLE, JSON.stringify(s));
    gemt = structuredClone(s);
  } catch {
    besked("Browseren kan ikke gemme her. Eventyret fortsætter i denne åbne fane.", 6);
  }
}
function opgave(id, antal = 1) {
  const færdig = fremskridt(s, id, antal);
  if (færdig) {
    besked(`✓ ${færdig.navn} · +${færdig.xp} erfaring · +${færdig.mønter} kobber`, 5);
    tone(660, .3);
    gem();
  }
}

// Et dialoglag standser tiden og nulstiller fingre/taster, så ingen går utilsigtet.
function dialog(titel, tekst, knapper, mærke = "KRYSTALJÆGERNE") {
  paused = true;
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
}
function lukDialog() {
  $("dialog").classList.add("skjult");
  paused = false;
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
    `<p>Find krystaller og skatte, og følg næste mål til venstre. De tre grotter har hver to dybder og en vogter med et segl. Bring alle segl til Stjerneporten.</p><ul><li><b>Gå:</b> WASD / pile eller venstre fingerpind. Træk på højre side for at dreje kameraet.</li><li><b>Angrib:</b> klik, mellemrum eller Angrib. Touch sigter automatisk på den nærmeste fjende.</li><li><b>Brug:</b> E eller Brug ved en kiste, krystal, port eller Mira.</li><li><b>Sværd</b> svinger bredt tæt på. <b>Bue</b> sender pile langt. <b>Magi</b> sprænger et område og bruger energi.</li><li>Gå væk fra lysringen, før en vogter slår. Din følgesvend Lumen hjælper både med lys og heling.</li><li>Eliksir: Q / Eliksir. Liv genvinder langsomt uden kamp. Opgradér hos Mira.</li></ul><p>Fremgangen gemmes automatisk på denne enhed. Et nyt grottebesøg skaber nye rum. Fortsæt bevarer din igangværende grotte.</p>`,
    [["Tilbage til eventyret", lukDialog]],
    "HJÆLP",
  );
}
function inventar() {
  const færdige = OPGAVER.filter((o) => (s.opgaver[o.id] || 0) >= o.mål);
  dialog(
    "Din rejsetaske",
    `<p>Niveau ${niveau(s)} · ${s.xp} erfaring<br>${s.mønter} kobber · ${s.eliksirer} eliksirer<br>Udstyr ${
      ["I", "II", "III", "IV"][s.udstyr]
    } · ${
      [0, 1, 2].filter((i) => s.opgaver["boss" + i]).length
    } af 3 segl</p><p>${færdige.length} af ${OPGAVER.length} opgaver færdige.</p><ul>${
      OPGAVER.map((o) =>
        `<li>${(s.opgaver[o.id] || 0) >= o.mål ? "✓" : "◇"} ${o.navn} · ${Math.min(s.opgaver[o.id] || 0, o.mål)}/${o.mål}</li>`
      ).join("")
    }</ul>`,
    [["Luk tasken", lukDialog]],
    "INVENTAR",
  );
}
function pausemenu() {
  gem();
  dialog("En rolig pause", "<p>Rejsen er gemt på denne enhed.</p>", [
    ["Fortsæt", lukDialog],
    ["Rejsetaske", inventar],
    ["Hjælp", hjælp],
    ["Begynd på ny", bekræftNy],
  ], "PAUSE");
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
  const obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  obj.scale.set(bredde / 64 * 1.0, 1, 1);
  return obj;
}
function ring(x, z, r, farve = 0xcf8baf) {
  const obj = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color: farve, transparent: true, opacity: .65, side: THREE.DoubleSide, depthWrite: false }),
  );
  obj.rotation.x = -Math.PI / 2;
  obj.position.set(x, .05, z);
  obj.scale.setScalar(r);
  scene.add(obj);
  return obj;
}
function blink(x, z, farve = 0x6ff5cf, r = 1.5) {
  const obj = ring(x, z, .1, farve);
  effekter.push({ obj, liv: .45, max: .45, r });
}

// Lokale teksturer og effekter frigives ved områdeskift; modelbiblioteket deles videre.
function fjern(obj) {
  if (!obj) return;
  scene.remove(obj);
  obj.traverse((del) => {
    if (del.geometry && !fællesGeometri.has(del.geometry)) del.geometry.dispose();
    for (const mat of Array.isArray(del.material) ? del.material : del.material ? [del.material] : []) {
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
    new THREE.MeshBasicMaterial({ color: boss ? 0xd6a371 : 0x76e8ce, side: THREE.DoubleSide }),
  );
  bar.position.y = boss ? 3.7 : 2.5;
  obj.add(bar);
  const f = { ...data, obj, hp: liv, max: liv, timer: 1.3, varsling: 0, ring: null, stun: 0, bar, kamp: false, summoned: false };
  fjender.push(f);
  return f;
}

// Kun aktivitetstilstand og koordinater gemmes; geometri dannes fra det validerede frø.
function skiftVerden() {
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
  verden = s.grotte ? bygGrotte(modeller, danGrotte(s.grotte.frø, s.grotte.id, s.grotte.dybde)) : bygØ(modeller, s.frø);
  scene.add(verden.rod);
  scene.background.set(s.grotte ? 0x172439 : 0x789cab);
  scene.fog.color.copy(scene.background);
  scene.fog.near = s.grotte ? 25 : 38;
  scene.fog.far = s.grotte ? 60 : 100;
  for (const f of verden.fjender) {
    if (s.beroliget.includes(f.id) || f.boss && s.opgaver["boss" + f.grotte]) continue;
    nyFjende(f);
  }
  for (const data of verden.ting) {
    if (s.hentet.includes(data.id)) continue;
    const obj = kopi(modeller, data.type === "kiste" ? "kiste" : "krystal", data.x, data.z, data.type === "kiste" ? 1 : .3);
    scene.add(obj);
    ting.push({ ...data, obj });
  }
  for (const sted of verden.steder) {
    const l = label(sted.navn, sted.type === "grotte" ? "#9de8dc" : "#e3d5b4", 256);
    l.position.set(sted.x, sted.type === "portal" ? 6 : 3.1, sted.z);
    verden.rod.add(l);
  }
  if (!s.grotte) {
    mira = kopi(modeller, "eventyrer", 2, 0, 1);
    mira.rotation.y = Math.PI;
    scene.add(mira);
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
  skiftVåben(s.våben);
  skiftVerden();
  besked(s.opgaver.mira ? "Velkommen tilbage. Lumen husker vejen." : "Mira venter ved brønden. Gå tæt på og tryk Brug.", 6);
  tone(330, .2);
}
function skiftVåben(v) {
  s.våben = v;
  document.querySelectorAll("[data-våben]").forEach((b) => b.classList.toggle("valgt", b.dataset.våben === v));
  if (helt) {
    for (const o of [...helt.children]) if (o.userData.våben) helt.remove(o);
    const o = kopi(modeller, v === "magi" ? "stav" : v, .45, 0, .7);
    o.position.y = .55;
    o.rotation.z = -.35;
    o.userData.våben = true;
    helt.add(o);
  }
}

function findMål() {
  const mål = næsteOpgave(s);
  if (!mål) return null;
  if (mål.id === "mira") return STEDER[0];
  if (mål.id === "krystal" || mål.id === "kiste") {
    return ting.filter((t) => t.type === mål.id).sort((a, b) =>
      Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z)
    )[0] || STEDER[0];
  }
  if (mål.id === "vogter") {
    return fjender.filter((f) => f.art === "stenvogter").sort((a, b) =>
      Math.hypot(a.obj.position.x - s.x, a.obj.position.z - s.z) - Math.hypot(b.obj.position.x - s.x, b.obj.position.z - s.z)
    )[0]?.obj.position || STEDER[2];
  }
  if (mål.id.startsWith("boss")) {
    const id = Number(mål.id.slice(-1));
    return bossSpor(s, id, fjender, verden.steder) || STEDER[id + 1];
  }
  return STEDER[4];
}
function hud() {
  const max = maxLiv(s);
  $("liv").max = max;
  $("liv").value = s.hp;
  $("livtekst").textContent = `${Math.ceil(s.hp)} / ${max}`;
  $("mana").value = s.mana;
  $("niveau").textContent = `Niveau ${niveau(s)}`;
  $("mønter").textContent = Math.floor(s.mønter);
  $("udstyr").textContent = `Udstyr ${["I", "II", "III", "IV"][s.udstyr]}`;
  $("eliksirtekst").textContent = `Q · ${s.eliksirer} tilbage`;
  $("lyd").textContent = s.lyd ? "♫" : "♪̸";
  const o = næsteOpgave(s);
  $("opgave").querySelector("h2").textContent = o ? o.navn : "Øen synger igen";
  $("opgave").querySelector("p").textContent = o ? o.tekst : "Alle segl er hjemme. Udforsk øen og nye grotter.";
  $("opgave").querySelector("small").textContent = o
    ? `${Math.min(s.opgaver[o.id] || 0, o.mål)} / ${o.mål} · ${s.xp} erfaring`
    : "Eventyret fuldført";
  const mål = findMål();
  $("afstand").textContent = mål ? `${Math.round(Math.hypot(mål.x - s.x, mål.z - s.z))} skridt til næste spor` : "";
  nær =
    [...ting, ...verden.steder].filter((t) => Math.hypot(t.x - s.x, t.z - s.z) < 2.8).sort((a, b) =>
      Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z)
    )[0];
  $("prompt").classList.toggle("skjult", !nær);
  if (nær) {
    $("prompt").textContent = `Brug / E · ${nær.navn || (nær.type === "kiste" ? "Åbn skattekisten" : "Saml lyskrystallen")}`;
  }
  tegnKort(mål);
}

// Minikortet viser rumforbindelser og mål; det drejer ikke med kameraet.
function tegnKort(mål) {
  const c = $("kort"), g = c.getContext("2d"), w = c.width;
  g.clearRect(0, 0, w, w);
  g.save();
  g.beginPath();
  g.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = "#102837";
  g.fillRect(0, 0, w, w);
  const skala = s.grotte ? Math.min(3, 140 / (Math.max(...verden.grotte.rum.map((r) => Math.hypot(r.x * 8, r.z * 8))) + 12)) : 1;
  const punkt = (x, z) => [w / 2 + x * skala, w / 2 + z * skala];
  if (s.grotte) {
    g.fillStyle = "#5c727e";
    for (const r of verden.grotte.rum) {
      const p = punkt(r.x * 8 - 3.8, r.z * 8 - 3.8);
      g.fillRect(p[0], p[1], 7.6 * skala, 7.6 * skala);
    }
  } else {
    g.fillStyle = "#426e62";
    g.beginPath();
    g.arc(w / 2, w / 2, 70, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#9a92704f";
    for (const t of STEDER) {
      g.beginPath();
      g.moveTo(w / 2, w / 2);
      g.lineTo(...punkt(t.x, t.z));
      g.stroke();
    }
  }
  const prik = (x, z, farve, r) => {
    g.fillStyle = farve;
    g.beginPath();
    g.arc(...punkt(x, z), r, 0, Math.PI * 2);
    g.fill();
  };
  for (const t of verden.steder) prik(t.x, t.z, "#baa781", 3);
  for (const f of fjender) {
    if (f.hp > 0) prik(f.obj.position.x, f.obj.position.z, f.boss ? "#d49bdc" : "#d38a80", f.boss ? 3 : 1.5);
  }
  if (mål) {
    g.strokeStyle = "#ffe3a0";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(...punkt(mål.x, mål.z), 6 + Math.sin(tid * 4), 0, Math.PI * 2);
    g.stroke();
  }
  prik(s.x, s.z, "#80ffdf", 3.5);
  g.fillStyle = "#c4ddd5";
  g.font = "10px system-ui";
  g.textAlign = "center";
  g.fillText("N", w / 2, 14);
  g.restore();
}

function brug() {
  if (!kører || paused || !nær) return;
  tone(520, .1);
  if (nær.type === "krystal" || nær.type === "kiste") {
    const t = nær;
    s.hentet.push(t.id);
    fjern(t.obj);
    ting.splice(ting.indexOf(t), 1);
    blink(t.x, t.z, 0x85ecd4);
    if (t.type === "krystal") {
      s.mønter += 3;
      s.mana = Math.min(100, s.mana + 16);
      opgave("krystal");
      besked("Lyskrystal fundet · +3 kobber");
    } else {
      s.mønter += 18;
      s.xp += 15;
      givEliksirer(s, 1);
      opgave("kiste");
      besked("Skat! +18 kobber · +15 erfaring · 1 eliksir");
    }
    hud();
    gem();
    return;
  }
  if (nær.type === "mira") {
    opgave("mira");
    s.hp = maxLiv(s);
    s.mana = 100;
    const pris = [60, 120, 220][s.udstyr];
    dialog(
      "Mira, krystalsmeden",
      `<p>»Porten mod nord har mistet sine tre segl. Mosgrotten, Spejlgrotten og Kobberdybet vogter hvert sit. Tag Lumen med — et lille lys kan vise en stor vej.«</p><p>Du er helet. ${s.mønter} kobber i tasken.<br>${
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
          } else besked("Du mangler kobber. Skattekister er et godt sted at lede.");
        }],
        ["Videre på rejsen", lukDialog],
      ],
      "LYSVIG",
    );
    return;
  }
  if (nær.type === "grotte") {
    const id = nær.grotte;
    dialog(
      GROTTENAVNE[id],
      "<p>En ny sti af kamre venter under øen. Find porten på første dybde; vogteren og seglet er på dybde 2. Du kan altid vende tilbage ved indgangen.</p>",
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
      besked(`Porten venter på tre segl. Du har ${[0, 1, 2].filter((i) => s.opgaver["boss" + i]).length}.`, 5);
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
  blink(f.obj.position.x, f.obj.position.z, 0xaef6d5, .85);
  tone(220, .07, .035);
  if (f.hp === 0) {
    fjern(f.obj);
    if (f.ring) {
      fjern(f.ring);
      f.ring = null;
    }
    s.beroliget.push(f.id);
    s.xp += f.boss ? 45 : 12;
    s.mønter += f.boss ? 30 : 7;
    if (f.art === "stenvogter") opgave("vogter");
    if (f.boss) {
      opgave("boss" + f.grotte);
      const flere = givEliksirer(s, 2);
      s.hp = maxLiv(s);
      s.mana = 100;
      besked(
        `✦ Segl fundet! ${["Mosvogteren", "Krystalhjorten", "Den gamle vogter"][f.grotte]} hviler nu. +${flere} eliksirer`,
        7,
      );
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
    }
    gem();
  }
}
function nærFjende(r = 30) {
  return fjender.filter((f) => f.hp > 0 && Math.hypot(f.obj.position.x - s.x, f.obj.position.z - s.z) < r).sort((a, b) =>
    Math.hypot(a.obj.position.x - s.x, a.obj.position.z - s.z) - Math.hypot(b.obj.position.x - s.x, b.obj.position.z - s.z)
  )[0];
}
function sendSkud(x, z, dx, dz, type, dmg, art = null) {
  const hastighed = { magi: 14, bue: 26, ven: 21, fjende: 10 }[type];
  let obj;
  if (type === "bue") {
    obj = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: farver[type] }),
      skaft = new THREE.Mesh(pilGeo, mat),
      spids = new THREE.Mesh(spidsGeo, mat);
    spids.position.y = .46;
    obj.add(skaft, spids);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, 0, dz));
  } else {
    obj = new THREE.Mesh(boldGeo, new THREE.MeshBasicMaterial({ color: farver[type] }));
    obj.scale.setScalar(type === "magi" ? 1.8 : 1);
  }
  obj.position.set(x, 1.1, z);
  scene.add(obj);
  skud.push({
    obj,
    dx: dx * hastighed,
    dz: dz * hastighed,
    liv: type === "bue" ? .95 : 1.6,
    type,
    dmg,
    art,
    niveau: niveau(s),
    udstyr: s.udstyr,
  });
}
function angrib() {
  if (!kører || paused || angrebspause > 0) return;
  const v = VÅBEN[s.våben];
  if (s.mana < v.mana) {
    besked("Mere energi om et øjeblik. Brug sværd eller bue imens.", 2);
    return;
  }
  s.mana -= v.mana;
  angrebspause = v.pause;
  let dx = retning.x, dz = retning.y;
  const mål = nærFjende(v.rækkevidde);
  if (sigte && !touch) {
    dx = sigte.x - s.x;
    dz = sigte.z - s.z;
  } else if (mål) {
    dx = mål.obj.position.x - s.x;
    dz = mål.obj.position.z - s.z;
  }
  const d = Math.hypot(dx, dz) || 1;
  dx /= d;
  dz /= d;
  retning.set(dx, dz);
  helt.rotation.y = Math.atan2(-dx, -dz);
  if (s.våben === "sværd") {
    const r = ring(s.x + dx * .9, s.z + dz * .9, .4, 0xefd9a9);
    effekter.push({ obj: r, liv: .23, max: .23, r: 2 });
    for (const f of fjender) if (f.hp > 0 && sværdRammer(s, f.obj.position, { x: dx, z: dz })) ramFjende(f, skade(s, f.art));
    tone(240, .14);
  } else {
    sendSkud(s.x + dx * .7, s.z + dz * .7, dx, dz, s.våben, skade(s, mål?.art));
    tone(s.våben === "magi" ? 740 : 460, .14);
  }
}
function eliksir() {
  if (!kører || paused) return;
  if (drik(s)) {
    besked("Eliksir · liv og energi genopfyldt");
    blink(s.x, s.z, 0x98f4bb, 3);
    tone(600, .3);
    gem();
  } else besked(s.eliksirer ? "Dit liv og din energi er allerede fulde." : "Ingen eliksirer. Mira sælger flere.");
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
    const p = f.obj.position, dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz);
    f.obj.visible = d < 45;
    f.bar.scale.x = Math.max(.01, f.hp / f.max);
    f.bar.quaternion.copy(kamera.quaternion);
    f.stun = Math.max(0, f.stun - dt);
    f.timer -= dt;
    f.obj.rotation.y = Math.atan2(-dx, -dz);
    animer(f.obj, tid + f.x, d < 18 ? 1 : 0, f.art);
    if (d > 18 && !f.boss) continue;
    if (d > 24) continue;
    helbredstid = Math.max(helbredstid, 2);
    const radius = f.boss ? (f.art === "krystaldyr" ? 8 : 5.0) : (f.art === "stenvogter" ? 2.8 : 2.2);
    if (f.varsling > 0) {
      f.varsling -= dt;
      f.ring.material.opacity = .35 + .25 * Math.sin(tid * 20);
      f.ring.position.set(p.x, .06, p.z);
      if (f.varsling <= 0) {
        fjern(f.ring);
        f.ring = null;
        if (f.boss && f.art === "krystaldyr") {
          const vinkel = Math.atan2(dx, dz);
          for (let j = -2; j <= 2; j++) sendSkud(p.x, p.z, Math.sin(vinkel + j * .17), Math.cos(vinkel + j * .17), "fjende", 17);
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
        if (frit(verden, x, z)) nyFjende({ id: f.id + "-lys-" + j, x, z, art: f.art, boss: false });
      }
      besked("Vogteren kalder på to små lysvæsner. Hold afstand og brug området omkring dig.", 4);
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
        const f = fjender.find((f) => f.hp > 0 && Math.hypot(x - f.obj.position.x, z - f.obj.position.z) < (f.boss ? 1.2 : .75));
        if (f) {
          const vedSkud = { ...s, våben: p.type, udstyr: p.udstyr, xp: 90 * (p.niveau - 1) ** 2 };
          if (p.type === "magi") {
            blink(x, z, 0xba91ff, 3.2);
            for (const a of fjender) {
              if (a.hp > 0 && Math.hypot(x - a.obj.position.x, z - a.obj.position.z) < 3.4) {
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
  let vx = (taster.has("d") || taster.has("arrowright") ? 1 : 0) - (taster.has("a") || taster.has("arrowleft") ? 1 : 0) +
    joystick.x;
  let vz = (taster.has("w") || taster.has("arrowup") ? 1 : 0) - (taster.has("s") || taster.has("arrowdown") ? 1 : 0) + joystick.y;
  const længde = Math.hypot(vx, vz);
  if (længde > 1) {
    vx /= længde;
    vz /= længde;
  }
  const dx = vx * Math.cos(yaw) - vz * Math.sin(yaw), dz = -vx * Math.sin(yaw) - vz * Math.cos(yaw), fart = 5.2 * dt;
  if (frit(verden, s.x + dx * fart, s.z)) s.x += dx * fart;
  if (frit(verden, s.x, s.z + dz * fart)) s.z += dz * fart;
  if (længde > .05) {
    retning.set(dx, dz).normalize();
    helt.rotation.y = Math.atan2(-dx, -dz);
  }
  helt.position.set(s.x, Math.sin(tid * 9) * .035 * Math.min(1, længde), s.z);
  animer(helt, tid, Math.min(1, længde));
  ven.position.lerp(new THREE.Vector3(s.x - 1.4, 1.35 + Math.sin(tid * 2) * .2, s.z + 1.4), 1 - Math.exp(-dt * 3));
  ven.rotation.y = helt.rotation.y;
  const mål = nærFjende(12);
  if (mål && venpause <= 0) {
    const a = mål.obj.position, b = ven.position, d = Math.hypot(a.x - b.x, a.z - b.z) || 1;
    sendSkud(b.x, b.z, (a.x - b.x) / d, (a.z - b.z) / d, "ven", 7 + Math.floor(niveau(s) / 2));
    venpause = 1.8;
  }
  if (!mål && helbredstid === 0) s.hp = Math.min(maxLiv(s), s.hp + 1.8 * dt);
  s.mana = Math.min(100, s.mana + 5 * dt);
  opdatérFjender(dt);
  if (paused) return;
  opdatérSkud(dt);
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
      t.obj.position.y = .25 + Math.sin(tid * 2 + t.x) * .15;
      t.obj.rotation.y += dt * .7;
    }
  }
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
    if (beskedtid <= 0) $("besked").style.opacity = 0;
  }
}

// Kameraet følger blødt. Touchdrag drejer det uden at kræve Pointer Lock.
function kameraTrin(dt) {
  const mål = helt ? helt.position : new THREE.Vector3(0, 0, 0);
  kamMål.lerp(mål, 1 - Math.exp(-dt * 6));
  const d = zoom;
  kamPos.set(kamMål.x + Math.sin(yaw) * d, 17 + (touch ? 1 : 0), kamMål.z + Math.cos(yaw) * d);
  kamera.position.lerp(kamPos, 1 - Math.exp(-dt * 7));
  kamera.lookAt(kamMål.x, .65, kamMål.z);
  sol.position.set(kamMål.x - 18, 30, kamMål.z + 15);
  sol.target.position.set(kamMål.x, 0, kamMål.z);
}
let sidst = performance.now();
function loop(nu) {
  requestAnimationFrame(loop);
  const dt = Math.min(.045, (nu - sidst) / 1000);
  sidst = nu;
  if (kører && !paused) opdatér(dt);
  kameraTrin(dt);
  renderer.render(scene, kamera);
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
  if (paused) return;
  joystickId = e.pointerId;
  $("joystick").setPointerCapture(e.pointerId);
  flytPind(e);
  e.preventDefault();
});
$("joystick").addEventListener("pointermove", (e) => {
  if (e.pointerId === joystickId) flytPind(e);
});
for (const n of ["pointerup", "pointercancel", "lostpointercapture"]) {
  $("joystick").addEventListener(n, () => {
    joystickId = null;
    joystick.x = 0;
    joystick.y = 0;
    $("pind").style.transform = "";
  });
}
$("verden").addEventListener("pointerdown", (e) => {
  if (!kører || paused) return;
  if (e.pointerType === "mouse") {
    sigteFra(e);
    angrib();
  } else if (e.clientX > innerWidth * .35) {
    dragId = e.pointerId;
    dragX = e.clientX;
    dragY = e.clientY;
    dragAfstand = 0;
    $("verden").setPointerCapture(e.pointerId);
  }
});
$("verden").addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") sigteFra(e);
  else if (e.pointerId === dragId) {
    const dx = e.clientX - dragX, dy = e.clientY - dragY;
    dragAfstand += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * .008;
    zoom = Math.max(16, Math.min(32, zoom + dy * .035));
    dragX = e.clientX;
    dragY = e.clientY;
  }
});
for (const n of ["pointerup", "pointercancel"]) {
  $("verden").addEventListener(n, () => {
    dragId = null;
  });
}
function sigteFra(e) {
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), kamera);
  if (ray.ray.intersectPlane(jord, ramt)) sigte = { x: ramt.x, z: ramt.z };
}
$("verden").addEventListener("wheel", (e) => {
  zoom = Math.max(16, Math.min(34, zoom + e.deltaY * .015));
  e.preventDefault();
}, { passive: false });
$("verden").addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("keydown", (e) => {
  if (!kører) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  if (e.key === "Escape") {
    if (paused) lukDialog();
    else pausemenu();
    return;
  }
  if (paused) return;
  taster.add(e.key.toLowerCase());
  if (e.repeat) return;
  if (e.key === " ") angrib();
  if (e.key.toLowerCase() === "e") brug();
  if (e.key.toLowerCase() === "q") eliksir();
  if (e.key.toLowerCase() === "i") inventar();
  if (["1", "2", "3"].includes(e.key)) skiftVåben(["sværd", "bue", "magi"][Number(e.key) - 1]);
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
$("interager").onclick = brug;
$("eliksir").onclick = eliksir;
$("pause").onclick = pausemenu;
$("hjælp").onclick = hjælp;
$("taske").onclick = inventar;
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
  s = structuredClone(gemt);
  skiftVåben(s.våben);
  start();
};

await lås($("lås"), "../../index.html");
$("menu").classList.remove("skjult");
$("start").disabled = true;
$("fortsæt").disabled = true;
try {
  modeller = await hentModeller();
  for (const model of Object.values(modeller)) {
    model.traverse((del) => {
      if (del.geometry) fællesGeometri.add(del.geometry);
      for (const mat of Array.isArray(del.material) ? del.material : del.material ? [del.material] : []) {
        fællesMaterialer.add(mat);
      }
    });
  }
  helt = kopi(modeller, "eventyrer");
  ven = kopi(modeller, "følgesvend");
  scene.add(helt, ven);
  skiftVåben("sværd");
  $("indlæser").textContent = "Øen er klar · PC, tablet og telefon";
  $("start").disabled = false;
  $("fortsæt").disabled = false;
  if (gemt) $("fortsæt").classList.remove("skjult");
  requestAnimationFrame(loop);
} catch (err) {
  console.error(err);
  $("indlæser").textContent = "Øens modeller kunne ikke hentes. Genindlæs siden, når forbindelsen er klar.";
}
