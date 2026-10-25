// ===== Lastbilen: en rigtig pickup med lad, bygget i koden af blank lak, krom, gummi og glas =====
// Alle mål er i meter. Bilens eget rum: x frem, y op, z til højre. y = 0 er akslernes højde.
// Karrosseriet er en sideprofil med hjulkasser, der trækkes ud i bilens bredde med afrundede kanter.
// Ladet er af rigtige træplanker og stål (fototeksturer fra Nedrivningsfirmaet).
import * as THREE from '../3d-faelles/three.module.js';
import { mergeGeometries } from '../3d-faelles/BufferGeometryUtils.js';

export const AKSEL = 1.65;          // akslerne sidder 1,65 m foran og bag midten
export const SPOR = 0.9;            // hjulene sidder 0,9 m ude i hver side
export const LÆNGDE = 5.4;

// Hvor højt karrosseriets bund sidder over akslen: store hjul løfter bilen, så hjulkasserne passer.
export const bundOver = r => Math.max(0.05, r - 0.35);

// ---------- Materialerne ----------
const mat = {};
function materialer() {
  if (mat.krom) return mat;
  mat.krom = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.14 });
  mat.alu = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.9, roughness: 0.32 });
  mat.plast = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: 0.72 });
  mat.gummi = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.93 });
  mat.glas = new THREE.MeshPhysicalMaterial({ color: 0x0b1116, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  mat.forlys = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 2.2, roughness: 0.2 });
  mat.baglys = new THREE.MeshStandardMaterial({ color: 0x8a0d0d, emissive: 0xff2a1a, emissiveIntensity: 1.2, roughness: 0.3 });
  mat.blink = new THREE.MeshStandardMaterial({ color: 0xc86a10, emissive: 0xff8a20, emissiveIntensity: 0.5, roughness: 0.3 });
  mat.mørkstål = new THREE.MeshStandardMaterial({ color: 0x2c2f33, metalness: 0.7, roughness: 0.5 });
  mat.fjeder = new THREE.MeshStandardMaterial({ color: 0xe8b10f, metalness: 0.5, roughness: 0.35 });
  mat.dyse = new THREE.MeshStandardMaterial({ color: 0x3a3430, metalness: 0.8, roughness: 0.45 });
  mat.flamme = new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  return mat;
}

// Blank billak med en klar lakhinde ovenpå, som på en rigtig bil
const lakker = new Map();
export function lak(farve) {
  if (!lakker.has(farve)) lakker.set(farve, new THREE.MeshPhysicalMaterial({ color: farve, metalness: 0.45, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.15 }));
  return lakker.get(farve);
}

// En advarselsstribe i gul og sort til rambukken
let stribe;
function striber() {
  if (stribe) return stribe;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8b10f'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#141414';
  for (let i = -128; i < 256; i += 48) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 24, 0); g.lineTo(i + 24 + 128, 128); g.lineTo(i + 128, 128); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
  stribe = new THREE.MeshStandardMaterial({ map: t, metalness: 0.4, roughness: 0.5 });
  return stribe;
}

// ---------- Små hjælpere ----------
function stk(gruppe, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  o.castShadow = o.receiveShadow = true;
  gruppe.add(o);
  return o;
}
const kasse = (b, h, d) => new THREE.BoxGeometry(b, h, d);
function rund(b, h, d, r = 0.04) {
  const s = new THREE.Shape(), e = 0.0001;
  r = Math.min(r, b / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  s.absarc(-b / 2 + r, -h / 2 + r, e, -Math.PI / 2, -Math.PI, true);
  s.absarc(-b / 2 + r, h / 2 - r, e, Math.PI, Math.PI / 2, true);
  s.absarc(b / 2 - r, h / 2 - r, e, Math.PI / 2, 0, true);
  s.absarc(b / 2 - r, -h / 2 + r, e, 0, -Math.PI / 2, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3, curveSegments: 2 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  return g;
}
// En flad profil trukket ud i z (med en lille afrunding på kanterne)
function profil(punkter, bredde, kant = 0.05) {
  const s = new THREE.Shape(punkter.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: bredde - 2 * kant, bevelEnabled: true, bevelSize: kant, bevelThickness: kant, bevelSegments: 4, curveSegments: 12 });
  g.translate(0, 0, -(bredde - 2 * kant) / 2);
  return g;
}

// ---------- Karrosseriet ----------
// Sideprofilen af underdelen: kofangerzonen, to hjulkasser, front med grill, motorhjelm og ladets flade
function karrosseriProfil(r) {
  const yb = bundOver(r), R = r + 0.1, c = Math.sqrt(Math.max(0.01, R * R - yb * yb)), a = Math.atan2(yb, c);
  const p = [[-2.70, 0.2], [-2.6, 0]];
  const bue = cx => {
    for (let i = 0; i <= 14; i++) {
      const v = Math.PI - a - (Math.PI - 2 * a) * i / 14;
      p.push([cx + Math.cos(v) * R, Math.sin(v) * R - yb]);
    }
  };
  p.push([-AKSEL - c, 0]); bue(-AKSEL);
  p.push([AKSEL - c, 0]); bue(AKSEL);
  p.push([2.6, 0], [2.73, 0.22], [2.76, 0.62], [2.68, 0.86], [2.2, 0.93], [1.25, 0.99], [-2.66, 0.94], [-2.72, 0.84]);
  return p;
}
// Førerhuset med skrå forrude
const HUS = [[-0.62, 0.9], [-0.62, 1.98], [-0.5, 2.08], [0.55, 2.08], [0.72, 2.03], [1.3, 1.24], [1.36, 0.92]];

export function bygBil(bil, del, tekstur) {
  const m = materialer(), g = new THREE.Group(), r = del('hjul', bil.hjul).radius;
  const krop = new THREE.Group();
  krop.position.y = bundOver(r);
  g.add(krop);
  g.userData.krop = krop;
  const lakM = lak(bil.farve);

  // Underdelen og førerhuset
  stk(krop, profil(karrosseriProfil(r), 2.02, 0.07), lakM);
  stk(krop, profil(HUS, 1.92, 0.08), lakM);
  // Ruderne: forrude, sideruder (to på hver side) og bagrude
  const vinkel = Math.atan2(2.03 - 1.24, 0.72 - 1.3), lf = Math.hypot(0.72 - 1.3, 2.03 - 1.24);
  stk(krop, kasse(lf * 0.9, 0.02, 1.62), m.glas, 1.01 + 0.07, 1.635 + 0.05, 0, 0, 0, vinkel);
  for (const s of [-1, 1]) {
    const z = s * 1.003;
    const side = [[-0.48, 1.3], [-0.48, 1.92], [0.28, 1.94], [0.28, 1.3]], for_ = [[0.4, 1.3], [0.4, 1.94], [0.62, 1.94], [1.12, 1.3]];
    for (const pkt of [side, for_]) {
      const sg = new THREE.ShapeGeometry(new THREE.Shape(pkt.map(([x, y]) => new THREE.Vector2(x, y))));
      const o = stk(krop, sg, m.glas, 0, 0, z);
      if (s < 0) o.rotation.y = Math.PI, o.scale.x = -1;
    }
    // Dørsprækker, håndtag og spejle
    stk(krop, kasse(0.012, 0.95, 0.004), m.plast, 0.34, 0.95, s * 1.012);
    stk(krop, kasse(0.012, 0.95, 0.004), m.plast, -0.56, 0.95, s * 1.012);
    stk(krop, rund(0.2, 0.05, 0.04, 0.015), m.krom, 0.1, 1.12, s * 1.02);
    stk(krop, rund(0.06, 0.06, 0.18, 0.02), m.plast, 1.12, 1.42, s * 1.07);
    stk(krop, rund(0.06, 0.24, 0.3, 0.03), m.plast, 1.1, 1.5, s * 1.2);
    stk(krop, kasse(0.005, 0.2, 0.26), m.glas, 1.135, 1.5, s * 1.2);
  }
  stk(krop, kasse(0.02, 0.5, 1.5), m.glas, -0.705, 1.68, 0);
  // Fronten: grill, lygter, blinklys og nummerplade
  const fx = 2.83;
  stk(krop, rund(0.06, 0.36, 1.2, 0.02), m.plast, fx + 0.01, 0.58, 0);
  for (let i = 0; i < 4; i++) stk(krop, kasse(0.03, 0.02, 1.16), m.krom, fx + 0.04, 0.45 + i * 0.085, 0);
  stk(krop, rund(0.04, 0.42, 1.28, 0.02), m.krom, fx, 0.58, 0).scale.set(0.6, 1, 1);
  for (const s of [-1, 1]) {
    stk(krop, rund(0.05, 0.2, 0.32, 0.03), m.forlys, fx, 0.68, s * 0.8);
    stk(krop, rund(0.04, 0.24, 0.36, 0.02), m.krom, fx - 0.02, 0.68, s * 0.8);
    stk(krop, rund(0.04, 0.07, 0.16, 0.02), m.blink, fx - 0.01, 0.5, s * 0.86);
    stk(krop, rund(0.05, 0.28, 0.14, 0.02), m.baglys, -2.79, 0.66, s * 0.86);
  }
  stk(krop, kasse(0.01, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }), fx + 0.02, 0.3, 0);
  // Ladet: træplanker på en stålramme, med sider af stål og en gitterstige bag førerhuset
  stk(krop, kasse(1.98, 0.1, 1.98), tekstur('træ'), -1.68, 0.99, 0);
  for (const s of [-1, 1]) {
    stk(krop, kasse(1.98, 0.06, 0.06), m.mørkstål, -1.68, 1.42, s * 0.97);
    stk(krop, kasse(1.98, 0.04, 0.04), m.mørkstål, -1.68, 1.2, s * 0.97);
    for (const x of [-2.62, -2.0, -1.36, -0.74]) stk(krop, kasse(0.06, 0.46, 0.06), m.mørkstål, x, 1.2, s * 0.97);
  }
  stk(krop, kasse(0.06, 0.06, 1.96), m.mørkstål, -2.62, 1.42, 0);
  stk(krop, kasse(0.06, 0.06, 1.96), m.mørkstål, -2.62, 1.2, 0);
  for (let i = 0; i < 5; i++) stk(krop, kasse(0.05, 1.25, 0.05), m.mørkstål, -0.7, 1.6, -0.8 + i * 0.4);
  stk(krop, kasse(0.06, 0.06, 1.9), m.mørkstål, -0.7, 2.22, 0);
  // Under bilen: kofanger bagi, trinbræt og tank
  stk(krop, rund(0.18, 0.18, 2.0, 0.04), m.plast, -2.74, 0.14, 0);
  for (const s of [-1, 1]) stk(krop, rund(0.9, 0.05, 0.2, 0.02), m.alu, 0.35, 0.04, s * 1.08);
  stk(krop, new THREE.CylinderGeometry(0.2, 0.2, 0.8, 18), m.alu, -0.4, -0.12, 0.62, 0, 0, Math.PI / 2);
  // Motoren kan ses: racerens sidepotter, dieselens skorstene eller raketten
  if (bil.motor === 'racer') {
    for (const s of [-1, 1]) stk(krop, new THREE.CylinderGeometry(0.08, 0.08, 2.0, 14), m.krom, -0.6, -0.02, s * 1.12, 0, 0, Math.PI / 2);
    stk(krop, rund(0.7, 0.14, 0.62, 0.05), lakM, 1.9, 1.03, 0);
    stk(krop, rund(0.06, 0.1, 0.5, 0.02), m.plast, 2.26, 1.02, 0);
  } else if (bil.motor === 'raket') {
    const raket = new THREE.Group();
    raket.position.set(0.05, 2.5, 0);
    for (const x of [-0.45, 0.45]) stk(krop, kasse(0.1, 0.22, 0.5), m.mørkstål, x, 2.18, 0);
    krop.add(raket);
    stk(raket, new THREE.CylinderGeometry(0.34, 0.34, 1.5, 24), m.alu, 0, 0, 0, 0, 0, Math.PI / 2);
    stk(raket, new THREE.CylinderGeometry(0.35, 0.35, 0.12, 24), lakM, 0.35, 0, 0, 0, 0, Math.PI / 2);
    stk(raket, new THREE.CylinderGeometry(0.22, 0.34, 0.45, 24, 1, true), m.dyse, -0.97, 0, 0, 0, 0, Math.PI / 2);
    stk(raket, new THREE.SphereGeometry(0.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.alu, 0.75, 0, 0, 0, 0, -Math.PI / 2);
    for (const v of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) stk(raket, kasse(0.4, 0.02, 0.32), lakM, -0.55, Math.cos(v) * 0.42, Math.sin(v) * 0.42, v, 0, 0);
    const flamme = stk(raket, new THREE.ConeGeometry(0.2, 1.4, 16, 1, true), m.flamme, -1.85, 0, 0, 0, 0, Math.PI / 2);
    flamme.castShadow = false; flamme.visible = false;
    g.userData.flamme = flamme;
  } else {
    for (const s of [-1, 1]) {
      stk(krop, new THREE.CylinderGeometry(0.07, 0.07, 1.9, 14), m.krom, -0.78, 1.95, s * 0.9);
      stk(krop, new THREE.CylinderGeometry(0.075, 0.07, 0.12, 14), m.mørkstål, -0.78, 2.94, s * 0.9, s * 0.4, 0, 0);
    }
  }
  // Store hjul: affjedringen kan ses mellem akslen og bilen
  if (r > 0.7) for (const x of [-AKSEL, AKSEL]) for (const s of [-1, 1]) {
    stk(g, new THREE.CylinderGeometry(0.09, 0.09, bundOver(r) + 0.25, 12), m.fjeder, x + 0.3, bundOver(r) / 2 - 0.05, s * 0.55, 0, 0, 0.25);
    stk(g, new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10), m.mørkstål, x, 0, 0, Math.PI / 2, 0, 0);
  }
  return g;
}

// ---------- Hjulene ----------
// Dækket er en drejet profil med knaster på slidbanen; fælgen har eger og møtrikker.
export function bygHjul(type, radius, bred) {
  const m = materialer(), g = new THREE.Group();
  const af = Math.min(bred * 0.42, radius * 0.28), pkt = [new THREE.Vector2(radius * 0.6, -bred / 2)];
  for (let i = 0; i <= 8; i++) {
    const v = -Math.PI / 2 + i / 8 * Math.PI;
    pkt.push(new THREE.Vector2(radius - af + Math.cos(v) * af, Math.sin(v) * bred / 2));
  }
  pkt.push(new THREE.Vector2(radius * 0.6, bred / 2));
  const dæk = new THREE.LatheGeometry(pkt, 40).rotateX(Math.PI / 2);
  // Knasterne på slidbanen: to forskudte rækker
  const antal = type === 'monster' ? 18 : type === 'terræn' ? 24 : 34, knast = [];
  const høj = type === 'monster' ? 0.07 : type === 'terræn' ? 0.035 : 0.012;
  for (let i = 0; i < antal; i++) for (const række of [-1, 1]) {
    const v = (i + (række > 0 ? 0.5 : 0)) / antal * Math.PI * 2;
    const k = new THREE.BoxGeometry(høj * 2 + 0.02, radius * 2 * Math.PI / antal * 0.45, bred * 0.42);
    k.translate(radius - 0.01, 0, række * bred * 0.24);
    k.rotateZ(v);
    knast.push(k.toNonIndexed());
  }
  stk(g, mergeGeometries([dæk.toNonIndexed(), ...knast]), m.gummi);
  // Fælgen
  const fælgM = type === 'monster' ? m.krom : m.alu;
  stk(g, new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, bred * 0.8, 28), fælgM, 0, 0, 0, Math.PI / 2, 0, 0);
  for (const s of [-1, 1]) {
    stk(g, new THREE.CylinderGeometry(radius * 0.18, radius * 0.22, 0.06, 18), m.alu, 0, 0, s * bred * 0.42, Math.PI / 2, 0, 0);
    const eger = type === 'vej' ? 10 : 6;
    for (let i = 0; i < eger; i++) {
      const v = i / eger * Math.PI * 2;
      stk(g, kasse(radius * 0.42, radius * (type === 'vej' ? 0.06 : 0.12), 0.03), fælgM, Math.cos(v) * radius * 0.37, Math.sin(v) * radius * 0.37, s * bred * 0.41, 0, 0, v);
    }
    for (let i = 0; i < 6; i++) {
      const v = i / 6 * Math.PI * 2;
      stk(g, new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6), m.krom, Math.cos(v) * radius * 0.12, Math.sin(v) * radius * 0.12, s * bred * 0.45, Math.PI / 2, 0, 0);
    }
  }
  return g;
}

// ---------- Fronten: rambuk, sneplov eller kofanger ----------
export function bygFront(type, tekstur) {
  const m = materialer(), g = new THREE.Group();
  if (type === 'kile') {
    stk(g, rund(0.5, 0.86, 2.1, 0.05), tekstur('stål'), 0, 0, 0);
    stk(g, kasse(0.03, 0.62, 2.0), striber(), 0.26, 0, 0);
    for (const y of [-0.3, 0.3]) for (const z of [-0.85, 0, 0.85]) stk(g, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), m.krom, 0.27, y, z, 0, 0, Math.PI / 2);
    for (const z of [-0.6, 0.6]) stk(g, kasse(0.55, 0.14, 0.14), m.mørkstål, -0.45, 0, z);
  } else if (type === 'plov') {
    // Et krumt plovblad i gul stål, hult fortil, med en kant af blankt stål forneden
    const R = 0.8, v0 = 0.6, for_ = [], bag = [];
    for (let i = 0; i <= 12; i++) {
      const v = -v0 + 2 * v0 * i / 12;
      for_.push([R - R * Math.cos(v), R * Math.sin(v)]);
      bag.push([R - R * Math.cos(v) - 0.06, R * Math.sin(v)]);
    }
    stk(g, profil([...for_, ...bag.reverse()], 2.3, 0.02), lak(0xe8b10f), -0.08, 0, 0);
    stk(g, kasse(0.1, 0.06, 2.3), m.krom, 0.08, -R * Math.sin(v0) - 0.02, 0);
    for (const z of [-0.7, 0.7]) stk(g, kasse(0.6, 0.12, 0.12), m.mørkstål, -0.2, 0.05, z);
  } else {
    stk(g, rund(0.22, 0.26, 2.08, 0.08), m.plast, 0, 0, 0);
    stk(g, rund(0.06, 0.08, 2.1, 0.03), m.krom, 0.1, 0.02, 0);
  }
  return g;
}
