// ===== Værktøjer i Broekraft: spande, tænder, våben og fyrværkeri =====
// Et værktøj ligger i hotbaren som { v: "vand" } osv. Ikonerne er små pixel-tegninger (16×16),
// og i hånden vises en lille 3D-model.
//  navn:  vises når man vælger det · blok: den kilde-blok spanden hælder ud (id fra blokke.js)
//  væske: farverne på indholdet [lys, mørk]
//  våben: skyder (skyd.js) · fyrværkeri: sender raketter op eller gnistrer (fyrvaerkeri.js)
//  hold:  hvor ofte der skydes, mens man holder fingeren nede (sekunder)

import * as THREE from "./three.js";
import { ID } from "./blokke.js";

export const VÆRKTØJ = {
  vand: { navn: "Vandspand", blok: ID.Vand, væske: ["#8fc4ff", "#3a7fe0"] },
  lava: { navn: "Lavaspand", blok: ID.Lava, væske: ["#ffe066", "#f26a1b"] },
  tænder: { navn: "Tænder" },
  gevær: { navn: "Gevær", våben: "gevær", hold: 0.14 },
  bazooka: { navn: "Bazooka", våben: "bazooka", hold: 0.9 },
  maling: { navn: "Malingspistol", våben: "maling", hold: 0.18 },
  raket: { navn: "Fyrværkeri-raket", fyrværkeri: "raket", hold: 0.45 },
  stjernekaster: { navn: "Stjernekaster", fyrværkeri: "stjernekaster", hold: 0.12 },
};

// ---------- Ikoner (pixel-tegninger) ----------
const ikoner = {};
function tegn(tegner) {
  const k = document.createElement("canvas"); k.width = k.height = 64;
  const g = k.getContext("2d");
  tegner((x, y, farve) => { g.fillStyle = farve; g.fillRect(x * 4, y * 4, 4, 4); });
  return k.toDataURL();
}
// Spanden: grå metal med hank og væske i toppen
function spand(set, [lys, mørk]) {
  const KANT = "#3d4147", METAL = "#b8bec6", GLANS = "#e6eaee", HANK = "#6b7078";
  for (let x = 5; x <= 10; x++) set(x, 1, HANK);
  set(4, 2, HANK); set(11, 2, HANK); set(3, 3, HANK); set(12, 3, HANK);
  for (let x = 2; x <= 13; x++) set(x, 4, KANT);
  for (let x = 3; x <= 12; x++) { set(x, 5, lys); set(x, 6, mørk); }
  set(2, 5, KANT); set(13, 5, KANT); set(2, 6, KANT); set(13, 6, KANT);
  for (let y = 7; y <= 13; y++) {
    const ind = y >= 11 ? 4 : 3;                                  // spanden bliver smallere forneden
    set(ind, y, KANT); set(15 - ind, y, KANT);
    for (let x = ind + 1; x < 15 - ind; x++) set(x, y, x === ind + 2 ? GLANS : METAL);
  }
  for (let x = 4; x <= 11; x++) set(x, 14, KANT);
}
// Tænderen: en stor tændstik med rødt hoved og en flamme
function tænder(set) {
  for (let i = 0; i < 8; i++) { set(2 + i, 13 - i, "#e8c98a"); set(3 + i, 13 - i, "#c9a25e"); set(2 + i, 14 - i, "#b08a4a"); }
  for (const [x, y] of [[9, 5], [10, 5], [11, 5], [9, 6], [10, 6], [11, 6], [10, 4], [10, 7], [12, 5]]) set(x, y, "#e0302a");
  set(9, 5, "#ff6b5e");
  for (let y = 0; y <= 4; y++) for (let x = 10; x <= 15; x++) {
    const d = (x - 12.5) ** 2 / 2.6 + (y - 2) ** 2 / 4.5;
    if (d < 1) set(x, y, d < 0.35 ? "#fff3a0" : d < 0.7 ? "#ffd23f" : "#ff8c1a");
  }
}
// Legetøjsgevær (orange med blåt løb)
function gevær(set) {
  for (let x = 2; x <= 11; x++) for (let y = 5; y <= 8; y++) set(x, y, y === 5 ? "#ffb35a" : y === 8 ? "#d96a0a" : "#ff8a1e");
  for (let x = 12; x <= 15; x++) for (let y = 6; y <= 7; y++) set(x, y, "#3a7be0");
  set(15, 5, "#3a7be0"); set(15, 8, "#3a7be0");
  for (let y = 9; y <= 13; y++) for (let x = 3; x <= 5; x++) set(x, y, y === 13 ? "#111111" : "#2a2a2a");
  set(7, 9, "#2a2a2a"); set(7, 10, "#2a2a2a"); set(8, 10, "#2a2a2a"); set(6, 4, "#2a2a2a"); set(7, 4, "#2a2a2a");
  set(9, 6, "#ffe066"); set(10, 6, "#ffe066");
}
// Bazooka: grønt rør med en rød raket i spidsen
function bazooka(set) {
  for (let x = 0; x <= 12; x++) for (let y = 5; y <= 9; y++) set(x, y, y === 5 ? "#6fa044" : y === 9 ? "#3a5a22" : "#4f7a2e");
  for (let y = 5; y <= 9; y++) { set(3, y, "#2a2a2a"); set(9, y, "#2a2a2a"); }
  for (let y = 6; y <= 8; y++) { set(13, y, "#e0302a"); set(14, y, "#e0302a"); }
  set(15, 7, "#e0302a"); set(13, 5, "#ff6b5e"); set(13, 9, "#b82020");
  for (let y = 10; y <= 13; y++) { set(6, y, "#2a2a2a"); set(7, y, "#2a2a2a"); }
  set(5, 3, "#2a2a2a"); set(5, 4, "#2a2a2a"); set(6, 3, "#2a2a2a");
}
// Malingspistol: lyserød med en beholder fuld af farver
function maling(set) {
  for (let x = 2; x <= 11; x++) for (let y = 7; y <= 9; y++) set(x, y, y === 9 ? "#d94a92" : "#ff6fb5");
  for (let x = 12; x <= 15; x++) set(x, 8, "#9b4de0");
  set(15, 7, "#9b4de0"); set(15, 9, "#9b4de0");
  for (let y = 10; y <= 13; y++) for (let x = 3; x <= 5; x++) set(x, y, "#2a2a2a");
  for (let y = 1; y <= 6; y++) for (let x = 5; x <= 10; x++) { const d = Math.hypot(x - 7.5, y - 3.5); if (d < 3) set(x, y, d < 2.2 ? "#ffffff" : "#bfbfbf"); }
  set(6, 3, "#e03a3a"); set(8, 2, "#3a7be0"); set(9, 4, "#4cb748"); set(7, 5, "#f5d02a");
}
// Fyrværkeri-raket med pind
function raket(set) {
  for (let y = 4; y <= 11; y++) for (let x = 6; x <= 9; x++) set(x, y, x === 6 ? "#ff6b5e" : x === 9 ? "#a81e16" : "#e0302a");
  for (const y of [6, 9]) for (let x = 6; x <= 9; x++) set(x, y, "#ffe066");
  for (let x = 6; x <= 9; x++) set(x, 3, "#f5c542");
  set(7, 2, "#f5c542"); set(8, 2, "#f5c542"); set(7, 1, "#ffd23f"); set(8, 1, "#ffd23f");
  for (let y = 11; y <= 15; y++) set(10, y, "#8a5a2b");
  set(7, 13, "#ff8c1a"); set(8, 14, "#ffd23f"); set(6, 14, "#ffd23f");
}
// Stjernekaster: en tråd med et stort glimt
function stjernekaster(set) {
  for (let i = 0; i < 9; i++) set(2 + i, 14 - i, i < 4 ? "#6b7078" : "#9aa3ad");
  const glimt = [[0, 0, "#ffffff"], [1, 0, "#fff3a0"], [-1, 0, "#fff3a0"], [0, 1, "#fff3a0"], [0, -1, "#fff3a0"], [2, 0, "#ffd23f"], [-2, 0, "#ffd23f"],
    [0, 2, "#ffd23f"], [0, -2, "#ffd23f"], [1, 1, "#ffd23f"], [-1, -1, "#ffd23f"], [1, -1, "#ffd23f"], [-1, 1, "#ffd23f"], [3, -2, "#ff8c1a"], [-3, 2, "#ff8c1a"], [2, 3, "#ff8c1a"], [-2, -3, "#ff8c1a"]];
  for (const [dx, dy, f] of glimt) set(12 + dx, 3 + dy, f);
}
const TEGNERE = { tænder, gevær, bazooka, maling, raket, stjernekaster };
export function værktøjIkon(id) {
  if (!ikoner[id]) ikoner[id] = tegn(set => (TEGNERE[id] ? TEGNERE[id](set) : spand(set, VÆRKTØJ[id].væske)));
  return ikoner[id];
}

// ---------- 3D-model til hånden ----------
const kasse = (b, h, d, farve, x = 0, y = 0, z = 0, lys = false) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), lys ? new THREE.MeshBasicMaterial({ color: farve }) : new THREE.MeshLambertMaterial({ color: farve }));
  m.position.set(x, y, z);
  return m;
};
// Svarer { model, flamme } — flammen blafrer (se opdaterVærktøj)
export function værktøjModel(id) {
  const model = new THREE.Group();
  let flamme = null;
  if (id === "tænder") {
    model.add(kasse(0.14, 1.1, 0.14, "#e8c98a"), kasse(0.26, 0.26, 0.26, "#e0302a", 0, 0.62, 0));
    flamme = new THREE.Group();
    flamme.add(kasse(0.24, 0.34, 0.24, "#ff8c1a", 0, 0, 0, true), kasse(0.14, 0.22, 0.14, "#fff3a0", 0, -0.02, 0, true));
    flamme.position.y = 0.9;
    model.add(flamme);
    model.rotation.set(0.25, 0.3, 0.45);
  } else if (id === "gevær" || id === "maling") {            // løbet peger frem (-z)
    const [krop, mørk, løb] = id === "gevær" ? ["#ff8a1e", "#d96a0a", "#3a7be0"] : ["#ff6fb5", "#d94a92", "#9b4de0"];
    model.add(kasse(0.42, 0.42, 1.3, krop), kasse(0.44, 0.1, 1.2, mørk, 0, -0.18, 0), kasse(0.22, 0.22, 0.7, løb, 0, 0.04, -0.95));
    model.add(kasse(0.26, 0.62, 0.3, "#2a2a2a", 0, -0.46, 0.35), kasse(0.08, 0.2, 0.08, "#2a2a2a", 0, 0.3, 0.1));
    if (id === "maling") {
      const tank = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshLambertMaterial({ color: "#ffffff" }));
      tank.position.set(0, 0.42, 0.05); model.add(tank);
      for (const [f, x, z] of [["#e03a3a", -0.15, 0.1], ["#3a7be0", 0.12, -0.08], ["#4cb748", 0.05, 0.22]]) model.add(kasse(0.1, 0.1, 0.1, f, x, 0.68, z, true));
    }
    model.rotation.set(0.05, 0.12, 0);
  } else if (id === "bazooka") {                             // på skulderen, spidsen frem
    model.add(kasse(0.5, 0.5, 2.3, "#4f7a2e"), kasse(0.54, 0.54, 0.12, "#2a2a2a", 0, 0, 0.5), kasse(0.54, 0.54, 0.12, "#2a2a2a", 0, 0, -0.5));
    model.add(kasse(0.36, 0.36, 0.4, "#e0302a", 0, 0, -1.3), kasse(0.2, 0.2, 0.2, "#ff6b5e", 0, 0, -1.55));
    model.add(kasse(0.2, 0.55, 0.24, "#2a2a2a", 0, -0.5, 0.1), kasse(0.1, 0.22, 0.1, "#2a2a2a", -0.2, 0.34, 0.2));
    model.rotation.set(0.04, 0.1, 0); model.position.set(0.1, 0.2, 0.2);
  } else if (id === "raket") {                               // rød raket med gul spids og pind
    const kegle = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.45, 8), new THREE.MeshLambertMaterial({ color: "#f5c542" }));
    kegle.position.y = 0.75; model.add(kegle);
    model.add(kasse(0.42, 1.0, 0.42, "#e0302a"), kasse(0.44, 0.1, 0.44, "#ffe066", 0, 0.2, 0), kasse(0.44, 0.1, 0.44, "#ffe066", 0, -0.2, 0));
    model.add(kasse(0.07, 1.6, 0.07, "#8a5a2b", 0.26, -0.8, 0));
    model.rotation.set(0.2, 0.4, 0.25);
  } else if (id === "stjernekaster") {                       // tynd tråd med et glimt, der gnistrer
    model.add(kasse(0.07, 1.5, 0.07, "#9aa3ad"), kasse(0.1, 0.5, 0.1, "#6b7078", 0, -0.55, 0));
    flamme = new THREE.Group();
    flamme.add(kasse(0.26, 0.26, 0.26, "#fff3a0", 0, 0, 0, true), kasse(0.14, 0.44, 0.14, "#ffffff", 0, 0, 0, true), kasse(0.44, 0.14, 0.14, "#ffd23f", 0, 0, 0, true));
    flamme.position.y = 0.78;
    model.add(flamme);
    model.rotation.set(0.3, 0.3, 0.5);
  } else {
    const [lys, mørk] = VÆRKTØJ[id].væske;
    model.add(kasse(0.8, 0.8, 0.8, "#b8bec6"), kasse(0.84, 0.08, 0.84, "#6b7078", 0, 0.4, 0));
    model.add(kasse(0.68, 0.06, 0.68, mørk, 0, 0.38, 0, true), kasse(0.4, 0.07, 0.4, lys, 0.08, 0.39, 0.08, true));
    model.add(kasse(0.06, 0.5, 0.06, "#6b7078", -0.42, 0.62, 0), kasse(0.06, 0.5, 0.06, "#6b7078", 0.42, 0.62, 0), kasse(0.9, 0.06, 0.06, "#6b7078", 0, 0.88, 0));
    model.rotation.set(0.35, 0.6, 0);
  }
  return { model, flamme };
}
export function opdaterVærktøj(flamme, tid) {
  if (!flamme) return;
  flamme.scale.set(1 + Math.sin(tid * 23) * 0.12, 1 + Math.sin(tid * 17 + 1) * 0.2, 1 + Math.cos(tid * 19) * 0.12);
}
