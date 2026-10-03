// ===== Fiskestænger =====
// Tilføj en ny stang: kopiér en blok i STÆNGER og skru på værdierne.
//
//  farver:   stangens farver fra håndtag mod spids (gentages hvis der er færre end 10)
//  metal:    true giver blank metal-glans · håndtag, rulle, line: farver
//  længde:   stangens længde · spolFart: hvor hurtigt den spoler (4 er normalt)
//  kast:     hvor langt den kaster (18 er normalt) · held: gange chancen for sjældne fisk (1 er normalt)

import * as THREE from "./three.js";
import { kopi, tone } from "./modeller.js";

export const STÆNGER = [
  { id: "spinne", navn: "Spinnestang", farver: ["#1d4ed8", "#2563eb"], håndtag: "#c8a27a", rulle: "#cbd5e1", line: "#fde047",
    længde: 2.3, spolFart: 4, kast: 18, held: 1, tekst: "God til alt." },
  { id: "regnbue", navn: "Regnbuestang", farver: ["#ff4d6d", "#ffa45c", "#ffd84d", "#7ee08a", "#6ec6ff", "#b98cff"], håndtag: "#ffffff",
    rulle: "#f8fafc", line: "#ff7eb6", længde: 2.4, spolFart: 5.5, kast: 20, held: 1.4, tekst: "Spoler lynhurtigt!" },
  { id: "guld", navn: "Guldstang", farver: ["#f59e0b", "#fcd34d"], metal: true, håndtag: "#3f3f46", rulle: "#fbbf24", line: "#ffffff",
    længde: 2.2, spolFart: 4.5, kast: 20, held: 3, tekst: "Lokker de sjældne fisk frem." },
  { id: "slik", navn: "Slikstang", farver: ["#ef4444", "#ffffff"], håndtag: "#f472b6", rulle: "#f9a8d4", line: "#34d399",
    længde: 2.5, spolFart: 4, kast: 26, held: 1.5, tekst: "Kaster SUPER langt." },
];

const std = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.45, metalness: 0.05, ...x });
function mesh(geo, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); return me; }

// Stangen peger langs +Y. Den er bygget af led, så den kan bøje når fisken trækker.
export function byggStang(def) {
  const g = new THREE.Group(), N = 10, segL = def.længde / N;
  const mørk = std("#26262e", { metalness: 0.5, roughness: 0.3 });
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.5, 14), std(def.håndtag || "#c8a27a", { roughness: 0.9 }), 0, -0.25, 0));
  g.add(mesh(new THREE.SphereGeometry(0.037, 12, 8), mørk, 0, -0.5, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.12, 12), mørk, 0, 0.02, 0));        // hjulholder

  const mats = def.farver.map(c => std(c, def.metal ? { metalness: 0.8, roughness: 0.25 } : { roughness: 0.35 }));
  const ringMat = std("#d1d5db", { metalness: 0.8, roughness: 0.2 });
  const segmenter = [];
  let far = g;
  for (let i = 0; i < N; i++) {
    const r0 = 0.021 - 0.015 * i / N, r1 = 0.021 - 0.015 * (i + 1) / N;
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0.08 : segL;
    seg.add(mesh(new THREE.CylinderGeometry(r1, r0, segL, 8), mats[i % mats.length], 0, segL / 2, 0));
    if (i % 2 === 1) {                                                                        // stangøjne
      const ø = mesh(new THREE.TorusGeometry(r1 + 0.012, 0.0035, 6, 14), ringMat, 0, segL * 0.85, -(r1 + 0.012));
      ø.rotation.x = Math.PI / 2;
      seg.add(ø);
    }
    far.add(seg);
    segmenter.push(seg);
    far = seg;
  }
  const spids = new THREE.Object3D();
  spids.position.y = segL;
  far.add(spids);

  // Spinnehjul under stangen, med håndsving der drejer når man spoler
  const hjul = new THREE.Group(), hm = std(def.rulle || "#cbd5e1", { metalness: 0.6, roughness: 0.3 });
  hjul.position.set(0, 0.02, -0.035);
  const model = kopi("grej", "rulle");                                                       // hjulet fra Blender
  if (model) {
    tone(model, def.rulle || "#cbd5e1", "rulle"); tone(model, def.line || "#fde047", "line");
    hjul.add(model); hjul.scale.setScalar(1.3); g.add(hjul);
    const w = segmenter.map((_, i) => Math.pow((i + 1) / N, 1.6)), sum = w.reduce((a, b) => a + b, 0);
    return { gruppe: g, segmenter, vægt: w.map(x => x / sum), spids, sving: model.getObjectByName("sving") };
  }
  hjul.add(mesh(new THREE.BoxGeometry(0.014, 0.05, 0.06), hm, 0, 0, -0.02));
  hjul.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), hm, 0, -0.01, -0.08));
  hjul.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20), hm, 0, 0.035, -0.08));
  hjul.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.045, 20), std(def.line || "#fde047", { roughness: 0.6 }), 0, 0.064, -0.08));
  hjul.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 20), hm, 0, 0.09, -0.08));
  const bøjle = mesh(new THREE.TorusGeometry(0.05, 0.004, 6, 20, Math.PI), ringMat, 0, 0.07, -0.08);
  bøjle.rotation.y = Math.PI / 2;
  hjul.add(bøjle);
  const sving = new THREE.Group();
  sving.position.set(-0.05, -0.01, -0.08);
  sving.add(mesh(new THREE.BoxGeometry(0.01, 0.09, 0.012), hm, 0, 0.045, 0));
  const knop = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.04, 10), mørk, -0.02, 0.09, 0);
  knop.rotation.z = Math.PI / 2;
  sving.add(knop);
  hjul.add(sving);
  hjul.scale.setScalar(1.3);
  g.add(hjul);

  // hvor meget hvert led bøjer (mest ude ved spidsen)
  const w = segmenter.map((_, i) => Math.pow((i + 1) / N, 1.6)), sum = w.reduce((a, b) => a + b, 0);
  return { gruppe: g, segmenter, vægt: w.map(x => x / sum), spids, sving };
}
