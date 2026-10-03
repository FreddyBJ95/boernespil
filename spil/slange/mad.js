// ===== Fjollet Slange — maden og de magiske bobler =====
// MADER: frugt og slik bygget af små 3D-former. Tilføj en ny: skriv en funktion, der bygger den (ca. 1 enhed stor).
// KRÆFTER: bobler med en kraft indeni — turbo, magnet, regnbue og guldstjerne (se spil.js for hvad de gør).

import * as THREE from "./three.js";
import { GLØD } from "./verden.js";
import { kopi } from "./modeller.js";

const TAU = Math.PI * 2;
const mat = (farve, ekstra = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.45, metalness: 0, ...ekstra });
const del = (geo, farve, x = 0, y = 0, z = 0, ekstra) => { const m = new THREE.Mesh(geo, mat(farve, ekstra)); m.position.set(x, y, z); m.castShadow = true; return m; };
const blad = (x, y, z, rot = 0) => { const b = del(new THREE.SphereGeometry(0.16, 8, 6), "#3fae3a", x, y, z); b.scale.set(1.6, 0.3, 0.8); b.rotation.z = rot; return b; };

export const MADER = {
  æble: g => { const k = del(new THREE.SphereGeometry(0.42, 20, 14), "#e8283c", 0, 0.42, 0, { roughness: 0.3 }); k.scale.set(1, 0.92, 1); g.add(k, del(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 6), "#6e4520", 0, 0.86, 0), blad(0.12, 0.86, 0, -0.5)); },
  banan: g => {
    const krumme = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.5, 0.55, 0), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.5, 0.55, 0));
    g.add(del(new THREE.TubeGeometry(krumme, 20, 0.16, 10), "#ffd93b", 0, 0.1, 0));
    g.add(del(new THREE.SphereGeometry(0.06, 6, 4), "#5a3a1a", -0.5, 0.66, 0), del(new THREE.SphereGeometry(0.06, 6, 4), "#5a3a1a", 0.5, 0.66, 0));
  },
  jordbær: g => {
    const k = del(new THREE.SphereGeometry(0.4, 18, 12), "#ff2a4a", 0, 0.45, 0, { roughness: 0.35 }); k.scale.set(1, 1.15, 1); g.add(k);
    for (let i = 0; i < 18; i++) { const v = i * 2.4, y = 0.2 + (i % 6) * 0.1, r = Math.sin((y - 0.05) / 0.9 * Math.PI) * 0.4; g.add(del(new THREE.SphereGeometry(0.035, 4, 3), "#fff3a0", Math.cos(v) * r, y, Math.sin(v) * r)); }
    for (let i = 0; i < 5; i++) g.add(blad(Math.cos(i / 5 * TAU) * 0.14, 0.9, Math.sin(i / 5 * TAU) * 0.14, i / 5 * TAU));
  },
  vandmelon: g => {
    const skive = del(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 24, 1, false, 0, Math.PI), "#ff4a5a", 0, 0.45, 0);
    skive.rotation.set(Math.PI / 2, 0, 0); g.add(skive);
    const skal = del(new THREE.TorusGeometry(0.55, 0.07, 8, 24, Math.PI), "#3fae3a", 0, 0.45, 0); skal.rotation.z = Math.PI; g.add(skal);
    for (let i = 0; i < 6; i++) { const v = Math.PI + 0.4 + i * 0.4; g.add(del(new THREE.SphereGeometry(0.035, 4, 3), "#1a1a1a", Math.cos(v) * 0.3, 0.45 + Math.sin(v) * 0.3 + 0.0, 0.12)); }
    g.rotation.x = -0.2;
  },
  donut: g => {
    const d = del(new THREE.TorusGeometry(0.34, 0.17, 12, 24), "#d8a060", 0, 0.5, 0); g.add(d);
    const gl = del(new THREE.TorusGeometry(0.34, 0.175, 12, 24), "#ff8fd0", 0, 0.5, 0.05, { roughness: 0.25 }); gl.scale.z = 0.7; g.add(gl);
    for (let i = 0; i < 14; i++) { const v = i / 14 * TAU, s = del(new THREE.BoxGeometry(0.1, 0.03, 0.03), ["#ffffff", "#ffd23f", "#5fd3ff", "#8aff7a"][i % 4], Math.cos(v) * 0.34, 0.5 + Math.sin(v) * 0.34, 0.2); s.rotation.z = v * 3; g.add(s); }
  },
  cupcake: g => {
    g.add(del(new THREE.CylinderGeometry(0.32, 0.24, 0.35, 14), "#ff8fd0", 0, 0.18, 0));
    for (let k = 0; k < 3; k++) { const c = del(new THREE.SphereGeometry(0.34 - k * 0.09, 14, 10), "#fff6fb", 0, 0.45 + k * 0.14, 0, { roughness: 0.3 }); c.scale.y = 0.7; g.add(c); }
    g.add(del(new THREE.SphereGeometry(0.1, 10, 8), "#e8283c", 0, 0.86, 0, { roughness: 0.2 }));
  },
  is: g => {
    g.add(del(new THREE.ConeGeometry(0.28, 0.7, 14), "#e8b060", 0, 0.35, 0));
    g.children[0].rotation.x = Math.PI;
    g.add(del(new THREE.SphereGeometry(0.3, 14, 10), "#ffb0d8", 0, 0.78, 0, { roughness: 0.3 }), del(new THREE.SphereGeometry(0.26, 14, 10), "#fff3c0", 0, 1.08, 0, { roughness: 0.3 }));
    g.add(del(new THREE.SphereGeometry(0.07, 8, 6), "#e8283c", 0, 1.34, 0));
  },
  ost: g => {
    const o = del(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 3), "#ffc93a", 0, 0.3, 0, { roughness: 0.6 }); o.rotation.y = 0.5; g.add(o);
    for (const [x, z] of [[0.05, 0.1], [-0.15, -0.05], [0.2, -0.12]]) g.add(del(new THREE.SphereGeometry(0.07, 8, 6), "#e8a020", x, 0.51, z));
  },
  kirsebær: g => {
    for (const s of [-1, 1]) {
      g.add(del(new THREE.SphereGeometry(0.22, 14, 10), "#c8102e", s * 0.2, 0.25, 0, { roughness: 0.2 }));
      const stilk = del(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 4), "#4a7a2a", s * 0.1, 0.62, 0); stilk.rotation.z = s * 0.35; g.add(stilk);
    }
    g.add(blad(0.08, 0.9, 0, 0.3));
  },
  småkage: g => {
    const k = del(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20), "#d8a060", 0, 0.5, 0, { roughness: 0.8 }); k.rotation.x = Math.PI / 2; g.add(k);
    for (const [x, y] of [[0.15, 0.1], [-0.2, 0.05], [0.05, -0.2], [-0.05, 0.25], [0.25, -0.12]]) g.add(del(new THREE.SphereGeometry(0.06, 6, 4), "#4a2a14", x, 0.5 + y, 0.07));
  },
  gulerod: g => {
    const k = del(new THREE.ConeGeometry(0.2, 0.9, 12), "#ff8c1a", 0, 0.4, 0); k.rotation.x = Math.PI; g.add(k);
    for (let i = 0; i < 3; i++) g.add(blad(Math.cos(i * 2) * 0.06, 0.95, Math.sin(i * 2) * 0.06, 1.2 + i * 0.6));
  },
  pizza: g => {
    const s = new THREE.Shape(); s.moveTo(0, 0.6); s.lineTo(-0.4, -0.4); s.lineTo(0.4, -0.4); s.lineTo(0, 0.6);
    const p = del(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), "#ffc93a", 0, 0.5, -0.05); g.add(p);
    g.add(del(new THREE.BoxGeometry(0.85, 0.14, 0.16), "#d8a060", 0, 0.1, 0));
    for (const [x, y] of [[0, 0.25], [-0.12, -0.05], [0.14, -0.1]]) { const pp = del(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 12), "#d8232e", x, 0.5 + y, 0.07); pp.rotation.x = Math.PI / 2; g.add(pp); }
  },
};
export const MADNAVNE = Object.keys(MADER);

// Byg et stykke mad med en blød glød under sig
export function lavMad(navn) {
  const g = new THREE.Group(), model = new THREE.Group(), blender = kopi("mad", navn);   // fra Blender, hvis den findes
  if (blender) model.add(blender); else MADER[navn](model);
  g.add(model);
  const glød = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLØD, color: "#fff6b0", transparent: true, depthWrite: false, opacity: 0.8 }));
  glød.scale.setScalar(2.2); glød.position.y = 0.4; g.add(glød);
  g.userData = { model, glød };
  return g;
}

// ---------- De magiske bobler ----------
export const KRÆFTER = {
  turbo: { ikon: "🚀", navn: "Turbo!", farve: "#ff8c1a", tid: 6 },
  magnet: { ikon: "🧲", navn: "Magnet!", farve: "#e8283c", tid: 9 },
  regnbue: { ikon: "🌈", navn: "Regnbue!", farve: "#b15bff", tid: 9 },
  stjerne: { ikon: "⭐", navn: "Guldstjerne!", farve: "#ffd23f", tid: 0 },
};
function emojiTekstur(emoji) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.font = "96px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emoji, 64, 72);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function lavKraft(navn) {
  const k = KRÆFTER[navn], g = new THREE.Group();
  if (navn === "stjerne") {                                  // guldstjernen er en rigtig 3D-stjerne
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.28 : 0.65, v = i / 10 * TAU + Math.PI / 2; i ? s.lineTo(Math.cos(v) * r, Math.sin(v) * r) : s.moveTo(Math.cos(v) * r, Math.sin(v) * r); }
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 }),
      new THREE.MeshStandardMaterial({ color: "#ffd23f", metalness: 0.6, roughness: 0.25, emissive: "#ff9a00", emissiveIntensity: 0.35 }));
    m.geometry.center(); m.position.y = 0.9; m.castShadow = true; g.add(m);
    g.userData.model = m;
  } else {                                                   // de andre er skinnende bobler med et billede indeni
    const boble = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshStandardMaterial({ color: k.farve, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2, emissive: k.farve, emissiveIntensity: 0.25, depthWrite: false }));
    boble.position.y = 1;
    const glans = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8 }));
    glans.position.set(-0.3, 0.35, 0.55); glans.scale.set(1, 1.4, 0.4); boble.add(glans);
    const ikon = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTekstur(k.ikon), transparent: true, depthWrite: false }));
    ikon.scale.setScalar(0.95); ikon.position.y = 1;
    g.add(ikon, boble);
    g.userData.model = boble;
  }
  const glød = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLØD, color: k.farve, transparent: true, depthWrite: false, opacity: 0.9 }));
  glød.scale.setScalar(3); glød.position.y = 1; g.add(glød);
  g.userData.glød = glød;
  return g;
}
