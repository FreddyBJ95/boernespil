// ===== Værktøjer i Broekraft: vandspand, lavaspand og tænder =====
// Et værktøj ligger i hotbaren som { v: "vand" } osv. Ikonerne er små pixel-tegninger (16×16),
// og i hånden vises en lille 3D-model.
//  navn:  vises når man vælger det · blok: den kilde-blok spanden hælder ud (id fra blokke.js)
//  væske: farverne på indholdet [lys, mørk]

import * as THREE from "./three.js";
import { ID } from "./blokke.js";

export const VÆRKTØJ = {
  vand: { navn: "Vandspand", blok: ID.Vand, væske: ["#8fc4ff", "#3a7fe0"] },
  lava: { navn: "Lavaspand", blok: ID.Lava, væske: ["#ffe066", "#f26a1b"] },
  tænder: { navn: "Tænder" },
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
export function værktøjIkon(id) {
  if (!ikoner[id]) ikoner[id] = tegn(set => (id === "tænder" ? tænder(set) : spand(set, VÆRKTØJ[id].væske)));
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
