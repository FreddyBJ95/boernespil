// ===== Biler i Broekraft: brandbiler, ambulancer og politibiler, man kan køre i =====
// De kører som kampvognene (kampvogn.js), og skyd.js styrer dem: tryk på en bil for at stige ind,
// kør med joysticket eller WASD, og ⬆ tænder og slukker sirenen og blinklysene.
// Brandbilen har en vandkanon på taget, der drejer med kameraet — tryk (eller hold) for at sprøjte (spil.js).
// Ambulancen og politibilen dytter, når man trykker. Næsen peger mod +z ligesom kampvognens.

import * as THREE from "./three.js";
import { Kampvogn } from "./kampvogn.js";

const KASSE = new THREE.BoxGeometry(1, 1, 1);
export const BILER = {
  brandbil: { navn: "brandbilen", ikon: "🚒", lak: "#d8262a", stribe: "#f4f4f0", lys: ["#3a7bff", "#3a7bff"], vand: true },
  ambulance: { navn: "ambulancen", ikon: "🚑", lak: "#f4f4f0", stribe: "#e0302a", lys: ["#3a7bff", "#ff5a4a"] },
  politi: { navn: "politibilen", ikon: "🚓", lak: "#f4f4f0", stribe: "#2a4ad8", lys: ["#3a7bff", "#e0302a"] },
};

// En bil af klodser. Svarer { g, tårn, kanon, lak, blink } — blink er blinklysenes materialer
function byggBil(slags) {
  const d = BILER[slags], g = new THREE.Group(), lak = [], blink = [];
  const klods = (b, h, l, f, x, y, z, { lys = false, til = g } = {}) => {
    const m = new THREE.Mesh(KASSE, lys ? new THREE.MeshBasicMaterial({ color: f }) : new THREE.MeshLambertMaterial({ color: f }));
    m.scale.set(b, h, l); m.position.set(x, y, z); til.add(m);
    return m;
  };
  const rude = "#9fd8ff", mørk = "#2a2a2a";
  const hjul = zs => { for (const s of [-1, 1]) for (const z of zs) { klods(0.42, 0.78, 0.78, mørk, s * 1.02, 0.39, z); klods(0.44, 0.3, 0.3, "#b8bec6", s * 1.03, 0.39, z); } };
  const blinklys = (x, y, z, f) => { const m = klods(0.36, 0.22, 0.36, f, x, y, z, { lys: true }); blink.push({ m, farve: new THREE.Color(f) }); };
  const tårn = new THREE.Group(), kanon = new THREE.Group();
  if (slags === "brandbil") {
    lak.push(klods(2.1, 1.25, 4.9, d.lak, 0, 1.0, -0.1).material);                 // kassen bagved
    lak.push(klods(2.1, 1.05, 1.5, d.lak, 0, 2.05, 1.6).material);                 // førerhuset
    klods(2.14, 0.2, 4.94, d.stribe, 0, 0.95, -0.1);                               // den hvide stribe
    klods(1.9, 0.55, 0.06, rude, 0, 2.15, 2.36, { lys: true });                    // forruden
    for (const s of [-1, 1]) klods(0.06, 0.45, 0.9, rude, s * 1.06, 2.15, 1.65, { lys: true });
    for (const s of [-1, 1]) klods(0.34, 0.2, 0.08, "#fff3a0", s * 0.7, 0.75, 2.36, { lys: true });   // forlygter
    klods(1.7, 0.25, 0.1, "#b8bec6", 0, 0.5, 2.38);                                // kofanger
    for (const s of [-1, 1]) klods(0.08, 0.08, 3.4, "#d0d6de", s * 0.4, 1.72, -0.5); // stigen på taget
    for (let i = 0; i < 8; i++) klods(0.8, 0.07, 0.07, "#d0d6de", 0, 1.72, -2.1 + i * 0.45);
    for (const s of [-1, 1]) klods(0.12, 0.7, 1.4, "#b8bec6", s * 1.1, 1.15, -1.2);  // slangerullerne
    hjul([-1.7, -0.7, 1.55]);
    blinklys(-0.55, 2.7, 1.95, d.lys[0]); blinklys(0.55, 2.7, 1.95, d.lys[1]);
    // vandkanonen bag på taget: en fod, der drejer, og et mundstykke af messing
    tårn.position.set(0, 1.78, -1.95);
    klods(0.55, 0.3, 0.55, "#8a929c", 0, 0.1, 0, { til: tårn });
    kanon.position.set(0, 0.3, 0.1);
    klods(0.2, 0.2, 1.2, "#d9a520", 0, 0, 0.55, { til: kanon }); klods(0.28, 0.28, 0.18, "#b8860b", 0, 0, 1.2, { til: kanon });
    tårn.add(kanon);
  } else if (slags === "ambulance") {
    lak.push(klods(2.1, 1.9, 3.3, d.lak, 0, 1.35, -0.5).material);                 // den høje kasse
    lak.push(klods(2.0, 1.2, 1.3, d.lak, 0, 1.0, 1.75).material);                  // førerhuset
    klods(2.14, 0.3, 4.6, d.stribe, 0, 0.85, 0.1);
    klods(1.8, 0.5, 0.06, rude, 0, 1.35, 2.42, { lys: true });
    for (const s of [-1, 1]) {                                                      // røde kors på siderne
      klods(0.06, 0.9, 0.3, "#e0302a", s * 1.06, 1.6, -0.5); klods(0.06, 0.3, 0.9, "#e0302a", s * 1.06, 1.6, -0.5);
      klods(0.34, 0.2, 0.08, "#fff3a0", s * 0.7, 0.75, 2.42, { lys: true });
    }
    klods(0.9, 0.3, 0.06, "#e0302a", 0, 1.7, -2.16); klods(0.3, 0.9, 0.06, "#e0302a", 0, 1.7, -2.16);
    hjul([-1.4, 1.5]);
    blinklys(-0.55, 2.4, 0.8, d.lys[0]); blinklys(0.55, 2.4, 0.8, d.lys[1]);
  } else {                                                                          // politibilen: en lav bil med lysbjælke
    lak.push(klods(1.9, 0.75, 4.2, d.lak, 0, 0.75, 0).material);
    lak.push(klods(1.7, 0.65, 2.0, d.lak, 0, 1.45, -0.2).material);
    klods(1.94, 0.25, 4.24, d.stribe, 0, 0.72, 0);
    klods(1.5, 0.45, 0.06, rude, 0, 1.45, 0.82, { lys: true }); klods(1.5, 0.45, 0.06, rude, 0, 1.45, -1.22, { lys: true });
    for (const s of [-1, 1]) {
      klods(0.06, 0.4, 1.6, rude, s * 0.86, 1.45, -0.2, { lys: true });
      klods(0.3, 0.18, 0.08, "#fff3a0", s * 0.62, 0.8, 2.12, { lys: true });
    }
    klods(1.2, 0.12, 0.35, mørk, 0, 1.83, -0.2);
    hjul([-1.3, 1.3]);
    blinklys(-0.35, 1.97, -0.2, d.lys[0]); blinklys(0.35, 1.97, -0.2, d.lys[1]);
  }
  g.add(tårn);
  for (const b of blink) b.m.material.color.setScalar(0.15);                        // slukket, til sirenen tændes
  return { g, tårn, kanon, lak, blink };
}

export class Bil extends Kampvogn {
  constructor(scene, verden, slags) {
    let blink = [];
    super(scene, verden, { farve: BILER[slags].lak, fart: 8.5, model: () => { const m = byggBil(slags); blink = m.blink; return m; } });
    const d = BILER[slags];
    Object.assign(this, { slags, bil: true, navn: d.navn, ikon: d.ikon, vand: !!d.vand, blink, sirene: false, sireneT: 0, blinkT: 0 });
  }
  hop() { return false; }                                            // (⬆ er sirenen — se skiftSirene)
  skiftSirene() {
    this.sirene = !this.sirene; this.sireneT = 0;
    if (!this.sirene) for (const b of this.blink) b.m.material.color.setScalar(0.15);
  }
  // Hvor vandet kommer ud: for enden af vandkanonen, der peger derhen, man kigger
  munding() {
    const r = new THREE.Vector3(Math.sin(this.tårnYaw), 0.1, Math.cos(this.tårnYaw)).normalize();
    const fod = new THREE.Vector3(0, 2.1, -1.95).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).add(this.pos);
    return { pos: fod.addScaledVector(r, 1.3), retning: r };
  }
  rammer(p, ekstra = 0) {                                            // bilen er lidt længere end en kampvogn
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dy = p.y - this.pos.y;
    const langs = dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw), tværs = dx * Math.cos(this.yaw) - dz * Math.sin(this.yaw);
    return Math.abs(langs) < 2.6 + ekstra && Math.abs(tværs) < 1.2 + ekstra && dy > -0.3 - ekstra && dy < 2.8 + ekstra;
  }
  opdater(dt) {
    this.t += dt;
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    this.tårn.rotation.y = this.tårnYaw - this.yaw;
    if (this.sirene && (this.blinkT -= dt) <= 0) {                   // blinklysene skifter
      this.blinkT = 0.22; this.blinkNr = (this.blinkNr || 0) + 1;
      this.blink.forEach((b, i) => b.m.material.color.copy(b.farve).multiplyScalar((i + this.blinkNr) % 2 ? 1.3 : 0.15));
    }
  }
}
