import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { lås } from "../laas.js";
import { BILER, DELE, GARAGE, gulv, MISSIONER, OPGRADERINGER, RUTER } from "./verden-data.js";
import { kør, nyBil } from "./fysik.js";
import { gem, hent, nyFremgang, opgrader } from "./fremgang.js";
import { næsteMål as hentNæsteMål, opdaterOpgave } from "./missioner.js";
import { styring } from "./styring.js";
import { lyd } from "./lyd.js";

const el = (id) => document.getElementById(id);
const mobil = matchMedia("(pointer: coarse)").matches || innerWidth < 760;
let fremgang = hent(), bil = nyBil(), startet = false, pauset = true, tid = 0, opsparing = 0, hudTid = 0, beskedTid = 0;
const løbende = { hopKlar: false };
const styr = styring(), lyde = lyd(), modeller = new Map();
let bilModel, hjul = [], verden;

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
const delmodeller = DELE.map((del) => {
  const g = new THREE.Group(), tandhjul = new THREE.Mesh(new THREE.TorusGeometry(1.1, .36, 6, 12), delmateriale);
  g.add(tandhjul);
  for (let i = 0; i < 8; i++) {
    const tand = new THREE.Mesh(new THREE.BoxGeometry(.6, .5, .55), delmateriale);
    const v = i * Math.PI / 4;
    tand.position.set(Math.cos(v) * 1.45, Math.sin(v) * 1.45, 0);
    tand.rotation.z = v;
    g.add(tand);
  }
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
    if (o.name.startsWith("hjul_")) hjul.push({ o, forhjul: o.name.includes("_for_"), rul: 0 });
    if (o.isMesh) {
      o.castShadow = !mobil;
      o.receiveShadow = !mobil;
    }
  });
  fremgang.bil = id;
  opdaterBil(0);
  gem(fremgang);
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
  const mål = hjem ? GARAGE : nærmesteRedning();
  bil = { ...nyBil(), x: mål.x, z: mål.z, y: gulv(mål.x, mål.z).y + .8, vinkel: mål.vinkel ?? Math.PI, nitro: 1 };
  styr.ryd();
  løbende.hopKlar = false;
  kamera.position.set(bil.x, bil.y + 7, bil.z + 15);
  if (startet) besked(hjem ? "Bilen er tilbage ved den blå garage." : "Bilen står sikkert på vejen igen.");
}
function nærmesteRedning() {
  let bedste = GARAGE, afstand = Infinity;
  for (const r of RUTER) {
    for (let i = 1; i < r.punkter.length; i++) {
      const a = r.punkter[i - 1], b = r.punkter[i], dx = b[0] - a[0], dz = b[2] - a[2];
      const t = Math.max(0, Math.min(1, ((bil.x - a[0]) * dx + (bil.z - a[2]) * dz) / (dx * dx + dz * dz)));
      const x = a[0] + dx * t, z = a[2] + dz * t, d = Math.hypot(x - bil.x, z - bil.z);
      if (d < afstand) {
        afstand = d;
        bedste = { x, z, vinkel: Math.atan2(dx, dz) };
      }
    }
  }
  return bedste;
}

// Opgaver kræver, at bilen faktisk når frem, følger porte eller gennemfører et hop.
function opdaterMission(dt) {
  for (const hændelse of opdaterOpgave(fremgang, bil, løbende, dt)) {
    gem(fremgang);
    lyde.klang(hændelse.type === "færdig");
    besked(hændelse.tekst, hændelse.type === "færdig" ? 5 : 3);
    if (hændelse.slut) setTimeout(visSejr, 1200);
  }
}

function opdaterHud() {
  const m = aktuelMission(), mål = næsteMål(), afstand = Math.hypot(bil.x - mål.x, bil.z - mål.z);
  el("mål-navn").textContent = m?.navn || "Dalen lyser igen";
  el("mål-tekst").textContent = m?.tekst || "Alle otte opgaver er klaret. Udforsk frit, prøv bilerne og byg videre i garagen.";
  el("antal").textContent = m ? `${fremgang.mission + 1}/8` : "8/8";
  el("skrot").textContent = fremgang.skrot;
  el("mål-afstand").textContent = `${Math.round(afstand)} m`;
  const retning = Math.atan2(mål.x - bil.x, mål.z - bil.z) - bil.vinkel;
  el("pil").style.transform = `rotate(${retning}rad)`;
  el("fart").textContent = Math.round(Math.abs(bil.fart) * 3.6);
  el("nitro-fyld").style.width = `${bil.nitro * 100}%`;
  el("mission-status").textContent = m?.type === "dele"
    ? `${fremgang.dele.length}/3 dele`
    : m?.type === "løb"
    ? `${fremgang.port}/5 porte${fremgang.løbStart ? ` · ${Math.max(0, 100 - fremgang.løbTid).toFixed(0)} s` : ""}`
    : m?.type === "porte"
    ? `${fremgang.port}/3 signaler`
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
function tegnKort(mål) {
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
}

function visDialog(html) {
  pauset = true;
  styr.ryd();
  gem(fremgang);
  el("dialog").innerHTML = `<section class="menu-kort">${html}</section>`;
  el("dialog").classList.remove("skjult");
  el("dialog").querySelector("[data-luk]")?.addEventListener("click", lukDialog);
}
function lukDialog() {
  el("dialog").classList.add("skjult");
  pauset = !startet;
  styr.ryd();
}
function visPause() {
  visDialog(
    `<div class="overlinje">TAG EN PAUSE</div><h2>Ørkenen venter.</h2><p>Din fremgang er gemt på denne enhed.</p><div class="dialog-knapper"><button data-luk class="primær">Kør videre</button><button id="pause-garage">Til garagen</button><button id="pause-hjælp">Hjælp</button><button id="nulstil">Nyt eventyr</button><a href="../../index.html">← Til spilkassen</a></div>`,
  );
  el("pause-garage").onclick = () => visGarage();
  el("pause-hjælp").onclick = visHjælp;
  el("nulstil").onclick = () => {
    visDialog(
      '<div class="overlinje">NYT EVENTYR</div><h2>Begynd forfra?</h2><p>Opgaver, skrot og opgraderinger i Skrotstorm bliver nulstillet på denne enhed.</p><div class="dialog-knapper"><button data-luk>Behold min bil</button><button id="bekræft-reset" class="primær">Ja, begynd forfra</button></div>',
    );
    el("bekræft-reset").onclick = () => {
      fremgang = nyFremgang();
      gem(fremgang);
      sætBil(fremgang.bil);
      gensæt(true);
      lukDialog();
      opdaterHud();
      besked("Et nyt eventyr begynder ved den blå garage.");
    };
  };
}
function visGarage() {
  const hjemme = Math.hypot(bil.x - GARAGE.x, bil.z - GARAGE.z) < 60;
  visDialog(
    `<div class="overlinje">DEN BLÅ GARAGE · ${fremgang.skrot} SKROT</div><h2>Byg. Kør. Gentag.</h2><p class="lille">${
      hjemme
        ? "Vælg din bil og køb forbedringer. Alle tre biler har forskellige køreegenskaber."
        : "Se dine forbedringer. Kør tilbage til garagen eller hent bilen derhen for at bygge videre."
    }</p><div class="biler">${
      BILER.map((b) =>
        `<button class="bilvalg ${fremgang.bil === b.id ? "valgt" : ""}" data-bil="${b.id}" ${
          hjemme ? "" : "disabled"
        }>${b.navn}<small>${b.tekst}</small></button>`
      ).join("")
    }</div>${
      OPGRADERINGER.map((o) =>
        `<div class="opgradering"><div class="forklaring"><strong>${o.navn} <span class="niveau">${"●".repeat(fremgang[o.id])}${
          "○".repeat(3 - fremgang[o.id])
        }</span></strong><small>${o.tekst}</small></div><button data-opgrader="${o.id}" ${
          !hjemme || fremgang[o.id] >= 3 || fremgang.skrot < o.priser[fremgang[o.id]] ? "disabled" : ""
        }>${fremgang[o.id] >= 3 ? "Færdig" : `${o.priser[fremgang[o.id]]} ⚙`}</button></div>`
      ).join("")
    }<div class="dialog-knapper"><button data-luk class="primær">Kør videre</button>${
      hjemme ? "" : '<button id="hjem-garage">Hent bilen til garagen</button>'
    }<button id="garage-hjælp">Hjælp</button></div>`,
  );
  for (const b of el("dialog").querySelectorAll("[data-bil]")) {
    b.onclick = () => {
      sætBil(b.dataset.bil);
      visGarage();
    };
  }
  for (const b of el("dialog").querySelectorAll("[data-opgrader]")) {
    b.onclick = () => {
      if (opgrader(fremgang, b.dataset.opgrader)) {
        gem(fremgang);
        lyde.klang();
        visGarage();
      }
    };
  }
  if (el("hjem-garage")) {
    el("hjem-garage").onclick = () => {
      gensæt(true);
      visGarage();
    };
  }
  el("garage-hjælp").onclick = visHjælp;
}
function visHjælp() {
  visDialog(
    `<div class="overlinje">SÅDAN KØRER DU</div><h2>Dit eget ørkeneventyr.</h2><div class="hjælp-række"><b>Computer</b><span>W / ↑ giver gas. S / ↓ bremser og bakker. A / D eller ← / → styrer. Mellemrum er håndbremsen. Hold Shift for nitro.</span></div><div class="hjælp-række"><b>Touch</b><span>Hold de store pile til venstre for at styre. Hold GAS til højre for at køre. BAK, ■ brems og ⚡ nitro kan bruges samtidig med styringen.</span></div><div class="hjælp-række"><b>Find vej</b><span>Følg pilen og det blå lys. Kortets G er garage, F er fabrik, S er solstation og T er udsigtstårn. Bjergvejen stiger op mod øst.</span></div><div class="hjælp-række"><b>Byg videre</b><span>Opgaver giver skrot. Garagens motor, hjul og nitro ændrer bilen. Brug vejene for høj fart. Sandet bremser dig.</span></div><div class="hjælp-række"><b>Sidder fast?</b><span>Tryk Gensæt bil eller R. Garage-menuen kan hente bilen hjem gratis. Escape eller Ⅱ pauser. Du behøver aldrig låse musen.</span></div><div class="hjælp-række"><b>Den store rampe</b><span>Opgave 5: kom fra vest, kør mod øst og ram den orange rampe med mindst 55 km/t. Brug nitro og hold rattet lige.</span></div><p class="lille">Fremgang gemmes automatisk på denne enhed. Ingen konti eller betaling. Luk og åbn hjælpen når som helst.</p><div class="dialog-knapper"><button data-luk class="primær">${
      startet ? "Tilbage til bilen" : "Tilbage"
    }</button></div>`,
  );
}
function visSejr() {
  if (aktuelMission()) return;
  visDialog(
    `<div class="overlinje">8 / 8 OPGAVER KLARET</div><h2>Du tændte dalen.</h2><p>Stormlygten lyser over bjergpasset. Skrotpladsen, fabrikken og solstationen er forbundet igen.</p><p class="lille">Din bil og alle forbedringer er gemt. Du kan fortsætte frit på dalens veje eller starte et nyt eventyr i pausemenuen.</p><div class="dialog-knapper"><button data-luk class="primær">Kør frit videre</button><button id="sejr-garage">Byg i garagen</button><a href="../../index.html">Til spilkassen</a></div>`,
  );
  el("sejr-garage").onclick = visGarage;
}

// Alt vækkes af et tryk på Start; lyden virker derfor også i Safari.
el("start").onclick = () => {
  lyde.start();
  startet = true;
  pauset = false;
  el("menu").classList.add("skjult");
  for (const id of ["hud", "kort-panel", "fart-panel", "bund", "touch"]) el(id).classList.remove("skjult");
  gensæt(true);
  opdaterHud();
  besked("Følg pilen til din første opgave. God tur!", 5);
};
el("pause-knap").onclick = visPause;
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
window.addEventListener("pagehide", () => gem(fremgang));
function størrelse() {
  renderer.setSize(innerWidth, innerHeight, false);
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
}
window.addEventListener("resize", størrelse);
størrelse();

let før = performance.now();
function ramme(nu) {
  requestAnimationFrame(ramme);
  const dt = Math.min(.06, Math.max(0, (nu - før) / 1000));
  før = nu;
  tid += dt;
  if (startet && !pauset) {
    opsparing += dt;
    while (opsparing >= 1 / 60) {
      kør(bil, styr.hent(), fremgang, 1 / 60);
      opdaterMission(1 / 60);
      opsparing -= 1 / 60;
    }
    if (bil.y < -15 || !Number.isFinite(bil.x + bil.z + bil.y)) gensæt();
    opdaterBil(dt);
    const ret = new THREE.Vector3(Math.sin(bil.vinkel), 0, Math.cos(bil.vinkel));
    const afstand = 11 + Math.min(5, Math.abs(bil.fart) * .12);
    const kameraMål = new THREE.Vector3(
      bil.x - ret.x * afstand,
      bil.y + 5.1 + Math.abs(bil.fart) * .055,
      bil.z - ret.z * afstand,
    );
    kameraMål.y = Math.max(kameraMål.y, gulv(kameraMål.x, kameraMål.z, bil.y).y + 2.6);
    kamera.position.lerp(kameraMål, 1 - Math.exp(-dt * 5));
    kamera.lookAt(bil.x + ret.x * 6, bil.y + 1.8, bil.z + ret.z * 6);
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
    hudTid += dt;
    if (hudTid > .1) {
      opdaterHud();
      hudTid = 0;
    }
    if (Math.floor(tid / 5) !== Math.floor((tid - dt) / 5)) gem(fremgang);
  } else if (!startet) {
    kamera.position.set(-306, 12, 198);
    kamera.lookAt(-275, 4, 238);
  }
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
  renderer.render(scene, kamera);
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
    BILER.forEach((b, i) => modeller.set(b.id, data[i + 1].scene));
    sætBil(fremgang.bil);
    el("start").disabled = false;
    el("start").textContent = fremgang.mission || fremgang.dele.length || fremgang.skrot
      ? "Fortsæt mit eventyr →"
      : "Start motoren →";
    el("indlæsning").textContent = "Klar på computer, tablet og telefon · Fremgang gemmes";
    opdaterHud();
  } catch (fejl) {
    console.error("Skrotstorm kunne ikke indlæses:", fejl);
    el("indlæsning").textContent = "Modellerne kunne ikke hentes. Prøv at åbne spillet igen.";
    el("start").textContent = "Prøv igen";
    el("start").disabled = false;
    el("start").onclick = () => location.reload();
  }
}
indlæs();
