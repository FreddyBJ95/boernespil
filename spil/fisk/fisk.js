// ===== Fiskene i "Mærkelige fisk" =====
// Tilføj en ny fisk: kopiér en blok i FISKE, giv den et nyt id og skru på værdierne.
// Alle fisk bygges af de samme dele (krop, hale, finner, øjne, mund) + valgfrit tilbehør.
//
//  krop:      "normal" | "rund" | "lang" | "kasse" | "banan" | "støvle"
//  form:      [længde, højde, bredde] — ganges på kroppens standardmål (valgfri)
//  farve/bug: ryg- og mavefarve · finne: farve på hale og finner
//  mønster:   "ingen" | "striber" | "prikker" | "regnbue" | "disko" | "skelet" | "guld" | "sennep"
//  mønsterFarve: farve til striber/prikker
//  øjne:      1, 2 eller 3 · øjeStr: øjnenes størrelse (0.085 er normalt)
//  mund:      "normal" | "læber" | "tænder" | "tunge"
//  tilbehør:  "krone", "høj hat", "piratHat", "briller", "solbriller", "øjeklap",
//             "overskæg", "horn", "lygte", "pigge", "sløjfe"
//  cm:        [mindst, størst] · chance: hvor tit den bider (0.02 = sjælden, 0.2 = tit)
//  styrke:    0–1, hvor hårdt den kæmper · spring: 0–1, hvor tit den hopper op af vandet
//  lyd:       "blub" | "disko" | "pust" | "fanfare" | "boing" | "arr" | "plop" | "magi" | "uhh" | "hmm"
//  tekst:     lille sjov linje på fangstkortet · tale: hvad stemmen siger (valgfri)

import * as THREE from "./three.js";

export const FISKE = [
  { id: "aborre", navn: "Aborre", krop: "normal", farve: "#6fae3a", bug: "#f1e7b8", finne: "#ff6b3d",
    mønster: "striber", mønsterFarve: "#2f4f1a", mund: "normal",
    cm: [15, 35], chance: 0.2, styrke: 0.3, spring: 0.25, lyd: "blub", tekst: "En helt almindelig fisk. Næsten." },
  { id: "disko", navn: "Diskofisk", krop: "normal", form: [1, 1.1, 1.1], farve: "#c0c0ff", bug: "#ffffff", finne: "#ff4fd8",
    mønster: "disko", mund: "læber", tilbehør: ["solbriller"],
    cm: [20, 40], chance: 0.07, styrke: 0.45, spring: 0.7, lyd: "disko", tekst: "Den elsker at danse!" },
  { id: "konge", navn: "Kongekarpe", krop: "normal", form: [1.1, 1.25, 1.2], farve: "#ff9f1c", bug: "#ffe8a3", finne: "#ffcf33",
    mund: "læber", tilbehør: ["krone"],
    cm: [40, 80], chance: 0.05, styrke: 0.7, spring: 0.2, lyd: "fanfare", tekst: "Kongen af hele søen!" },
  { id: "brille", navn: "Brillelaks", krop: "normal", form: [1.15, 0.95, 0.9], farve: "#9fb8c8", bug: "#ffd6e0", finne: "#ff8fab",
    mønster: "prikker", mønsterFarve: "#5b6b7a", tilbehør: ["briller"],
    cm: [30, 60], chance: 0.12, styrke: 0.5, spring: 0.5, lyd: "hmm", tekst: "Den læser avis under vandet." },
  { id: "gedde", navn: "Overskægsgedde", krop: "lang", farve: "#4c8a3f", bug: "#e8f0c0", finne: "#8fbf4f",
    mønster: "prikker", mønsterFarve: "#c8e07a", mund: "tænder", tilbehør: ["overskæg", "høj hat"],
    cm: [60, 110], chance: 0.08, styrke: 0.8, spring: 0.3, lyd: "hmm", tekst: "Meget fornem. Meget lang." },
  { id: "trold", navn: "Trekøjet trold", krop: "normal", form: [0.95, 1.2, 1.2], farve: "#8e5bd8", bug: "#d9c2ff", finne: "#5fd3a6",
    mønster: "prikker", mønsterFarve: "#5e3aa0", øjne: 3, øjeStr: 0.095, mund: "tænder",
    cm: [20, 45], chance: 0.08, styrke: 0.55, spring: 0.5, lyd: "uhh", tekst: "Tre øjne — den ser ALT!" },
  { id: "puste", navn: "Pustefisk", krop: "rund", farve: "#ffd23f", bug: "#fff5c2", finne: "#ff9f1c",
    mønster: "prikker", mønsterFarve: "#c98a00", øjeStr: 0.11, mund: "læber", tilbehør: ["pigge"],
    cm: [15, 30], chance: 0.1, styrke: 0.35, spring: 0.3, lyd: "pust", tekst: "Pust! Pas på piggene!" },
  { id: "lygte", navn: "Lygtefisk", krop: "normal", form: [0.9, 1.3, 1.1], farve: "#27325c", bug: "#4a5a8c", finne: "#3fa7ff",
    øjeStr: 0.07, mund: "tænder", tilbehør: ["lygte"],
    cm: [20, 50], chance: 0.07, styrke: 0.6, spring: 0.2, lyd: "boing", tekst: "Den har sin egen natlampe." },
  { id: "enhjorning", navn: "Enhjørningefisk", krop: "normal", farve: "#ffc8e8", bug: "#ffffff", finne: "#b98cff",
    mønster: "regnbue", mund: "læber", tilbehør: ["horn"],
    cm: [25, 50], chance: 0.035, styrke: 0.5, spring: 0.8, lyd: "magi", tekst: "Magisk og glitrende!" },
  { id: "banan", navn: "Bananfisk", krop: "banan", farve: "#ffe135", bug: "#fff6a8", finne: "#8a6d1f",
    cm: [18, 25], chance: 0.1, styrke: 0.3, spring: 0.6, lyd: "boing", tekst: "Kan man spise den? Nej!" },
  { id: "kasse", navn: "Kassefisk", krop: "kasse", farve: "#3a86ff", bug: "#a0c4ff", finne: "#ff006e",
    mønster: "striber", mønsterFarve: "#ffbe0b", mund: "læber", tilbehør: ["sløjfe"],
    cm: [20, 40], chance: 0.1, styrke: 0.4, spring: 0.3, lyd: "blub", tekst: "Firkantet fra fødslen." },
  { id: "pirat", navn: "Piratfisk", krop: "normal", form: [1.1, 1, 1], farve: "#6c757d", bug: "#d6d6d6", finne: "#b5172e",
    mønster: "striber", mønsterFarve: "#3d4349", mund: "tænder", tilbehør: ["piratHat", "øjeklap"],
    cm: [30, 70], chance: 0.07, styrke: 0.75, spring: 0.4, lyd: "arr", tekst: "Arrr! Hvor er skatten?" },
  { id: "skelet", navn: "Skeletfisk", krop: "normal", farve: "#2b2b3a", bug: "#3a3a4d", finne: "#e8e8e8",
    mønster: "skelet", øjeStr: 0.1, mund: "tænder",
    cm: [25, 45], chance: 0.06, styrke: 0.5, spring: 0.4, lyd: "uhh", tekst: "Uhhh… lidt uhyggelig. Men sød." },
  { id: "polse", navn: "Pølsefisk", krop: "lang", form: [0.8, 1.2, 1.3], farve: "#c1440e", bug: "#e07a3f", finne: "#ffd23f",
    mønster: "sennep", mund: "tunge",
    cm: [20, 40], chance: 0.08, styrke: 0.35, spring: 0.5, lyd: "boing", tekst: "Lugter lidt af grill…" },
  { id: "stovle", navn: "Gammel støvle", krop: "støvle", farve: "#7a4a26",
    cm: [28, 32], chance: 0.1, styrke: 0.15, spring: 0, lyd: "plop",
    tekst: "Hov! Det er jo slet ikke en fisk…", tale: "Du fangede en gammel støvle! Hov!" },
  { id: "guldfisk", navn: "Guldfisken", krop: "normal", form: [0.7, 0.85, 0.85], farve: "#ffc300", bug: "#fff1a8", finne: "#ff8c00",
    mønster: "guld", mund: "læber", øjeStr: 0.1,
    cm: [5, 9], chance: 0.02, styrke: 0.2, spring: 0.9, lyd: "magi",
    tekst: "Superduper sjælden! Du må ønske dig noget.", tale: "Wow! Du fangede Guldfisken!" },
];

// ---------- Byggeklodser ----------
const HVID = "#ffffff", SORT = "#15151f";
const std = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.45, metalness: 0.05, ...x });
function mesh(geo, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); return me; }
function udfyldt(shape, dybde) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: dybde, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 10,
  });
  g.translate(0, 0, -dybde / 2);
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function øje(r) {
  const e = new THREE.Group();
  e.add(mesh(new THREE.SphereGeometry(r, 20, 14), std(HVID, { roughness: 0.25 })));
  const pupil = mesh(new THREE.SphereGeometry(r * 0.55, 16, 12), std(SORT, { roughness: 0.15 }), 0, 0, r * 0.6);
  pupil.add(mesh(new THREE.SphereGeometry(r * 0.17, 8, 6), new THREE.MeshBasicMaterial({ color: HVID }), r * 0.18, r * 0.2, r * 0.42));
  pupil.userData.r = r;
  e.add(pupil);
  e.userData.pupil = pupil;
  return e;
}

// Kropsmål (halve længder): [x, y, z]
const KROP = { normal: [0.5, 0.27, 0.17], rund: [0.4, 0.38, 0.36], lang: [0.8, 0.15, 0.13], kasse: [0.46, 0.28, 0.2], banan: [0.55, 0.13, 0.13] };

export function byggFisk(def) {
  const indre = def.krop === "støvle" ? byggStøvle(def) : byggKropFisk(def);
  // centrér så fisken drejer om sin midte
  const boks = new THREE.Box3().setFromObject(indre), midt = boks.getCenter(new THREE.Vector3());
  indre.position.sub(midt);
  const fisk = new THREE.Group();
  fisk.add(indre);
  fisk.userData = { ...indre.userData, def, længde: boks.max.x - boks.min.x, højde: boks.max.y - boks.min.y };
  fisk.userData.mund = (indre.userData.mund || V(0, 0, 0)).clone().sub(midt);
  return fisk;
}

function byggKropFisk(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [] };
  const f = def.form || [1, 1, 1], [bx, by, bz] = KROP[def.krop] || KROP.normal;
  const rx = bx * f[0], ry = by * f[1], rz = bz * f[2];
  const kasse = def.krop === "kasse", tilspids = !(kasse || def.krop === "rund");
  const bøj = def.krop === "banan" ? x => 1.3 * x * x : () => 0;          // bananen krummer
  const smal = x => tilspids ? 1 - Math.max(0, -x / rx) * 0.35 : 1;          // smallere mod halen
  const smalZ = x => tilspids ? 1 - Math.max(0, -x / rx) * 0.45 : 1;
  const ell = x => Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  const top = x => kasse ? ry : ry * ell(x) * smal(x) + bøj(x);
  const bund = x => kasse ? -ry : -ry * ell(x) * smal(x) + bøj(x);
  const s = Math.max(0.6, ry / 0.27);                                         // størrelse på finner og hale

  // Punkt + normal på kroppens side (bruges til øjne, prikker, tænder)
  function flade(x, y, side) {
    if (kasse) return { p: V(x, y, side * rz * 1.04), n: V(0, 0, side) };
    const zz = rz * Math.sqrt(Math.max(0.02, 1 - (x / rx) ** 2 - (y / ry) ** 2));
    const n = V(x / rx ** 2, y / ry ** 2, side * zz / rz ** 2).normalize();
    return { p: V(x, y * smal(x) + bøj(x), side * zz * smalZ(x)), n };
  }

  // --- krop ---
  let geo = kasse ? new THREE.BoxGeometry(2, 2, 2, 10, 8, 6) : new THREE.SphereGeometry(1, 36, 22);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (kasse) v.lerp(v.clone().normalize().multiplyScalar(1.2), 0.25);     // bløde kanter
    const x = v.x * rx;
    p.setXYZ(i, x, v.y * ry * smal(x) + bøj(x), v.z * rz * smalZ(x));
  }
  if (def.mønster === "disko") geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  farvKrop(geo, def, rx, ry, bøj, smal);
  const glans = { disko: [0.25, 0.7], guld: [0.22, 0.45] }[def.mønster] || [0.5, 0.05];
  const kropMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: glans[0], metalness: glans[1], flatShading: def.mønster === "disko",
  });
  if (def.mønster === "disko") { kropMat.emissive = new THREE.Color("#222244"); u.disko = kropMat; }
  if (def.mønster === "guld") { kropMat.emissive = new THREE.Color("#7a4d00"); u.guld = kropMat; }
  g.add(mesh(geo, kropMat));

  const finneMat = std(def.finne || "#ff9f1c", { side: THREE.DoubleSide });

  // --- hale ---
  const hs = new THREE.Shape();
  hs.moveTo(0.02, 0.06);
  hs.quadraticCurveTo(-0.14, 0.1, -0.34, 0.3);
  hs.quadraticCurveTo(-0.24, 0, -0.34, -0.3);
  hs.quadraticCurveTo(-0.14, -0.1, 0.02, -0.06);
  hs.closePath();
  const hale = new THREE.Group();
  hale.add(mesh(udfyldt(hs, 0.03), finneMat));
  const hx = def.krop === "rund" ? -rx * 0.92 : -rx * 0.97;
  hale.position.set(hx, bøj(hx), 0);
  hale.scale.setScalar(s);
  g.add(hale);
  u.hale = hale;

  // --- rygfinne ---
  const tilbehør = def.tilbehør || [];
  if (!tilbehør.includes("pigge")) {
    const ds = new THREE.Shape();
    ds.moveTo(0.2, 0);
    ds.quadraticCurveTo(0.08, 0.2, -0.18, 0.2);
    ds.quadraticCurveTo(-0.14, 0.08, -0.22, 0);
    ds.closePath();
    const ryg = mesh(udfyldt(ds, 0.025), finneMat, -rx * 0.1, top(-rx * 0.1) - 0.03, 0);
    ryg.scale.set(rx / 0.5, s * 0.9, 1);
    g.add(ryg);
  }

  // --- sidefinner (de basker) ---
  for (const side of [1, -1]) {
    const fi = new THREE.Group();
    const m = mesh(new THREE.SphereGeometry(1, 12, 8), finneMat, -0.08 * s, 0, 0);
    m.scale.set(0.11 * s, 0.018, 0.06 * s);
    fi.add(m);
    const a = flade(rx * 0.15, -ry * 0.3, side);
    fi.position.copy(a.p);
    fi.rotation.y = side * 0.5;
    fi.userData.side = side;
    g.add(fi);
    u.finner.push(fi);
  }

  // --- øjne ---
  const eR = def.øjeStr || 0.085, antal = def.øjne ?? 2, øjne = [];
  function sætØje(pos, n) {
    const e = øje(eR);
    e.position.copy(pos).addScaledVector(n, eR * 0.35);
    e.lookAt(e.position.clone().add(n));
    g.add(e); u.pupiller.push(e.userData.pupil); øjne.push(e);
  }
  const ex = rx * (def.krop === "lang" ? 0.72 : 0.55), ey = ry * 0.3;
  if (antal === 1) {
    sætØje(V(rx * 0.72, top(rx * 0.72) * 0.75, 0), V(0.6, 0.8, 0).normalize());
  } else {
    for (const side of [1, -1]) { const a = flade(ex, ey, side); sætØje(a.p, a.n); }
    if (antal >= 3) sætØje(V(rx * 0.2, top(rx * 0.2), 0), V(0.25, 1, 0).normalize());
  }

  // --- mund ---
  const mx = rx * 0.99, my = -ry * 0.12 + bøj(rx * 0.99);
  u.mund = V(rx * 1.02, my, 0);
  const mørkMund = () => { const m = mesh(new THREE.SphereGeometry(1, 12, 8), std("#3a1020"), mx, my, 0); m.scale.set(0.02, 0.035 * s, 0.06 * s); g.add(m); };
  switch (def.mund) {
    case "læber": {
      const l = mesh(new THREE.TorusGeometry(0.045 * s, 0.022 * s, 10, 20), std("#ff4f8b", { roughness: 0.3 }), mx, my, 0);
      l.rotation.y = Math.PI / 2;
      g.add(l);
      break;
    }
    case "tænder": {
      mørkMund();
      const tm = std(HVID, { roughness: 0.3 }), tg = new THREE.ConeGeometry(0.018 * s, 0.05 * s, 6);
      for (const side of [1, -1]) for (let i = 0; i < 4; i++) {
        const a = flade(rx * (0.92 - i * 0.07), -ry * 0.16, side);
        const t = mesh(tg, tm); t.position.copy(a.p).addScaledVector(a.n, 0.004); t.rotation.x = Math.PI;
        g.add(t);
      }
      break;
    }
    case "tunge": {
      mørkMund();
      const t = mesh(new THREE.SphereGeometry(1, 12, 8), std("#ff6f91", { roughness: 0.4 }), mx + 0.04, my - 0.03, 0);
      t.scale.set(0.07, 0.018, 0.045); t.rotation.z = -0.4;
      g.add(t);
      break;
    }
    default: mørkMund();
  }

  // --- prikker ---
  if (def.mønster === "prikker") {
    const pm = std(def.mønsterFarve || "#222222", { roughness: 0.5 }), pg = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 26; i++) {
      const xn = Math.random() * 1.4 - 0.75, yn = Math.random() * 0.95 - 0.15, side = i % 2 ? 1 : -1;
      if (1 - xn * xn - yn * yn < 0.12 || (Math.abs(xn - ex / rx) < 0.18 && Math.abs(yn - 0.3) < 0.3)) continue;
      const a = flade(xn * rx, yn * ry, side), r = 0.022 + Math.random() * 0.022;
      const d = mesh(pg, pm); d.scale.set(r, r, r * 0.35);
      d.position.copy(a.p); d.lookAt(a.p.clone().add(a.n));
      g.add(d);
    }
  }

  // --- tilbehør ---
  const guldMat = std("#ffc83d", { metalness: 0.85, roughness: 0.25 });
  const sortMat = std("#1b1b24", { roughness: 0.35 });
  for (const t of tilbehør) {
    if (t === "krone") {
      const k = new THREE.Group(), kx = rx * 0.28;
      k.add(mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.07, 18, 1, true), std("#ffc83d", { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide })));
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, cx = Math.cos(a) * 0.095, cz = Math.sin(a) * 0.095;
        k.add(mesh(new THREE.ConeGeometry(0.025, 0.08, 6), guldMat, cx, 0.07, cz));
        k.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), guldMat, cx, 0.115, cz));
      }
      [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a, i) =>
        k.add(mesh(new THREE.SphereGeometry(0.02, 10, 8), std(i % 2 ? "#e63946" : "#3a86ff", { roughness: 0.2 }), Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1)));
      k.position.set(kx, top(kx) + 0.02, 0); k.rotation.z = -0.15; k.scale.setScalar(Math.max(0.9, s * 0.9));
      g.add(k);
    } else if (t === "høj hat") {
      const h = new THREE.Group(), hx = rx * 0.2;
      h.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.015, 24), sortMat));
      h.add(mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.2, 20), sortMat, 0, 0.1, 0));
      h.add(mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.04, 20), std("#e63946"), 0, 0.03, 0));
      h.position.set(hx, top(hx) - 0.005, 0); h.rotation.z = -0.12;
      g.add(h);
    } else if (t === "piratHat") {
      const h = new THREE.Group(), hx = rx * 0.22;
      const kuppel = mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), sortMat);
      kuppel.scale.set(1.25, 0.8, 1); h.add(kuppel);
      const skygge = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), sortMat);
      skygge.scale.set(1.3, 1, 0.75); h.add(skygge);
      for (const side of [1, -1]) h.add(mesh(new THREE.SphereGeometry(0.032, 10, 8), std(HVID), 0.02, 0.055, side * 0.115));
      h.position.set(hx, top(hx) - 0.01, 0); h.rotation.z = -0.1;
      g.add(h);
    } else if ((t === "briller" || t === "solbriller") && øjne.length >= 2) {
      const stel = t === "solbriller" ? std("#ff4fd8", { roughness: 0.3 }) : std(SORT, { metalness: 0.3, roughness: 0.2 });
      for (const e of øjne.slice(0, 2)) {
        const ring = mesh(new THREE.TorusGeometry(eR * 1.3, 0.012, 8, 24), stel);
        ring.position.copy(e.position); ring.quaternion.copy(e.quaternion); ring.translateZ(eR * 0.75);
        g.add(ring);
        if (t === "solbriller") {
          const l = mesh(new THREE.CircleGeometry(eR * 1.3, 24), new THREE.MeshStandardMaterial({ color: "#111122", metalness: 0.6, roughness: 0.1, side: THREE.DoubleSide }));
          l.position.copy(ring.position); l.quaternion.copy(ring.quaternion);
          g.add(l);
        }
      }
      const R = Math.abs(øjne[0].position.z) + eR * 0.6;
      const bro = mesh(new THREE.TorusGeometry(R, 0.01, 6, 20, Math.PI), stel, ex + 0.02, ey + bøj(ex), 0);
      bro.rotation.y = Math.PI / 2;
      bro.scale.y = Math.max(0.3, (top(ex) + 0.02 - ey) / R);
      g.add(bro);
    } else if (t === "øjeklap" && øjne.length) {
      const e = øjne[0];
      const klap = mesh(new THREE.CylinderGeometry(eR * 1.25, eR * 1.25, 0.015, 20), sortMat);
      klap.position.copy(e.position); klap.quaternion.copy(e.quaternion);
      klap.rotateX(Math.PI / 2); klap.translateY(eR * 0.8);
      g.add(klap);
      const bånd = mesh(new THREE.TorusGeometry(1, 0.012, 6, 40), sortMat, ex, bøj(ex), 0);
      bånd.rotation.y = Math.PI / 2;
      bånd.scale.set(rz * ell(ex) * 1.06, ry * ell(ex) * 1.04, 1);
      g.add(bånd);
    } else if (t === "overskæg") {
      const brun = std("#3b2414", { roughness: 0.8 });
      for (const side of [1, -1]) {
        const kurve = new THREE.CatmullRomCurve3([
          V(rx * 1.0, my + 0.03, 0), V(rx * 0.97, my - 0.02, side * 0.06),
          V(rx * 0.9, my - 0.01, side * 0.13), V(rx * 0.84, my + 0.05, side * 0.17),
        ]);
        g.add(mesh(new THREE.TubeGeometry(kurve, 16, 0.022, 8, false), brun));
        g.add(mesh(new THREE.SphereGeometry(0.024, 8, 6), brun, rx * 0.84, my + 0.05, side * 0.17));
      }
    } else if (t === "horn") {
      const hg = new THREE.ConeGeometry(0.045, 0.34, 14, 8), hp = hg.attributes.position, hf = [];
      const a = new THREE.Color("#fff3c4"), b = new THREE.Color("#ffc83d");
      for (let i = 0; i < hp.count; i++) { const c = Math.floor((hp.getY(i) + 0.17) / 0.34 * 7) % 2 ? a : b; hf.push(c.r, c.g, c.b); }
      hg.setAttribute("color", new THREE.Float32BufferAttribute(hf, 3));
      const hx2 = rx * 0.62, horn = mesh(hg, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.3 }), hx2, top(hx2) + 0.12, 0);
      horn.rotation.z = -0.65;
      g.add(horn);
    } else if (t === "lygte") {
      const lx0 = rx * 0.3, ly0 = top(lx0);
      const kurve = new THREE.CatmullRomCurve3([V(lx0, ly0 - 0.02, 0), V(rx * 0.55, ly0 + 0.28, 0), V(rx * 0.95, ly0 + 0.36, 0), V(rx * 1.22, ly0 + 0.2, 0)]);
      g.add(mesh(new THREE.TubeGeometry(kurve, 20, 0.013, 6, false), std(def.farve)));
      const pære = new THREE.MeshStandardMaterial({ color: "#fff8c0", emissive: "#ffe86b", emissiveIntensity: 2 });
      g.add(mesh(new THREE.SphereGeometry(0.065, 16, 12), pære, rx * 1.22, ly0 + 0.16, 0));
      u.lygte = pære;
    } else if (t === "pigge") {
      const pm = std(def.finne || "#ff9f1c", { roughness: 0.4 }), pg = new THREE.ConeGeometry(0.028, 0.12, 6);
      pg.translate(0, 0.06, 0);
      const N = 50, op = V(0, 1, 0);
      for (let i = 0; i < N; i++) {                  // jævnt fordelt over kroppen
        const yy = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - yy * yy), a = i * 2.39996;
        const d = V(Math.cos(a) * rr, yy, Math.sin(a) * rr);
        if ((d.x > 0.5 && Math.abs(d.y) < 0.6) || d.x < -0.85) continue;   // ikke i ansigtet og ved halen
        const n = V(d.x / rx, d.y / ry, d.z / rz).normalize();
        const pig = mesh(pg, pm);
        pig.position.set(d.x * rx, d.y * ry, d.z * rz).addScaledVector(n, -0.01);
        pig.quaternion.setFromUnitVectors(op, n);
        g.add(pig);
      }
    } else if (t === "sløjfe") {
      const sm = std("#e63946", { roughness: 0.4 }), sløjfe = new THREE.Group(), sx = rx * 0.5;
      for (const side of [1, -1]) {
        const c = mesh(new THREE.ConeGeometry(0.06, 0.11, 4), sm, -side * 0.055, 0, 0);
        c.rotation.z = side * Math.PI / 2;
        sløjfe.add(c);
      }
      sløjfe.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), sm));
      sløjfe.position.set(sx, bund(sx) - 0.02, 0);
      g.add(sløjfe);
    }
  }

  g.userData = u;
  return g;
}

function farvKrop(geo, def, rx, ry, bøj, smal) {
  const p = geo.attributes.position, n = p.count, farver = new Float32Array(n * 3);
  const ryg = new THREE.Color(def.farve), bug = new THREE.Color(def.bug || def.farve), mf = new THREE.Color(def.mønsterFarve || "#222222");
  const c = new THREE.Color(), hvid = new THREE.Color(HVID);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), xn = x / rx, y = (p.getY(i) - bøj(x)) / smal(x);
    const h = THREE.MathUtils.clamp((y / ry + 1) / 2, 0, 1);
    c.copy(bug).lerp(ryg, THREE.MathUtils.smoothstep(h, 0.3, 0.65));
    switch (def.mønster) {
      case "striber": if (Math.sin(xn * 13) > 0.45 && h > 0.3) c.lerp(mf, 0.85); break;
      case "regnbue": c.setHSL((xn * 0.5 + 0.5) * 0.85, 0.85, 0.62).lerp(hvid, (1 - h) * 0.35); break;
      case "skelet": {
        const ribben = Math.abs(Math.sin(xn * 11)) > 0.82 && xn > -0.75 && xn < 0.4;
        const rygrad = Math.abs(y / ry) < 0.1 && xn < 0.45;
        if (xn > 0.5) c.set("#e6e6e6");                 // kranie
        else if (ribben || rygrad) c.set("#f2f2f2");
        break;
      }
      case "guld": c.lerp(hvid, Math.max(0, Math.sin(xn * 20 + y * 30)) * 0.25); break;
      case "sennep": if (Math.abs(h - (0.86 + 0.06 * Math.sin(xn * 18))) < 0.045) c.set("#ffd23f"); break;
    }
    farver.set([c.r, c.g, c.b], i * 3);
  }
  if (def.mønster === "disko") {                        // hver lille flade får sin egen farve
    for (let i = 0; i < n; i += 3) {
      c.setHSL(Math.random(), 0.9, 0.62);
      for (let j = 0; j < 3; j++) farver.set([c.r, c.g, c.b], (i + j) * 3);
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(farver, 3));
}

function byggStøvle(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [] };
  const læder = std(def.farve || "#7a4a26", { roughness: 0.85 }), sål = std("#2b2118", { roughness: 0.9 }), snøre = std("#f1e3c8");
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.5, 18), læder, -0.14, 0.22, 0));        // skaft
  const hul = mesh(new THREE.CircleGeometry(0.15, 18), std("#1a120b"), -0.14, 0.472, 0);
  hul.rotation.x = -Math.PI / 2; g.add(hul);
  const fod = mesh(new THREE.CapsuleGeometry(0.14, 0.34, 8, 16), læder, 0.07, -0.03, 0);
  fod.rotation.z = Math.PI / 2; fod.scale.set(0.9, 1, 1.05); g.add(fod);
  g.add(mesh(new THREE.BoxGeometry(0.68, 0.05, 0.3), sål, 0.06, -0.16, 0));                     // sål
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.07, 0.28), sål, -0.18, -0.2, 0));                     // hæl
  for (let i = 0; i < 4; i++) for (const r of [0.7, -0.7]) {                                     // snørebånd
    const b = mesh(new THREE.BoxGeometry(0.016, 0.1, 0.012), snøre, 0.03, 0.38 - i * 0.09, 0);
    b.rotation.x = r; g.add(b);
  }
  const tang = new THREE.CatmullRomCurve3([V(-0.14, 0.45, 0.05), V(-0.05, 0.62, 0.08), V(0.08, 0.6, 0.1), V(0.16, 0.46, 0.12)]);
  g.add(mesh(new THREE.TubeGeometry(tang, 16, 0.02, 6), std("#3f9b3f")));
  // en lille fisk kigger op af støvlen
  const lille = byggKropFisk({ krop: "normal", farve: "#ff9f1c", bug: "#fff1c1", finne: "#ff6b3d", øjeStr: 0.1, mund: "læber" });
  lille.scale.setScalar(0.35); lille.rotation.z = Math.PI / 2 - 0.3; lille.position.set(-0.16, 0.56, 0);
  g.add(lille);
  u.hale = lille.userData.hale; u.pupiller.push(...lille.userData.pupiller);
  u.mund = V(0.38, 0, 0);
  g.userData = u;
  return g;
}

// Små bevægelser: hale, finner, vrikkeøjne, lygte og disko-lys
export function animerFisk(f, t, fart = 1) {
  const u = f.userData;
  if (u.hale) u.hale.rotation.y = Math.sin(t * 8 * fart) * 0.5;
  for (const fi of u.finner || []) fi.rotation.x = fi.userData.side * (0.2 + Math.sin(t * 6 * fart) * 0.35);
  for (const p of u.pupiller || []) {
    const r = p.userData.r;
    p.position.x = Math.sin(t * 2.7 + r * 50) * r * 0.16;
    p.position.y = Math.cos(t * 2.1 + r * 80) * r * 0.16;
  }
  if (u.lygte) u.lygte.emissiveIntensity = 1.6 + Math.sin(t * 5) * 1.1;
  if (u.disko) u.disko.emissive.setHSL((t * 0.4) % 1, 0.9, 0.18);
  if (u.guld) u.guld.emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.3;          // guldet glimter
}

// Frigør grafikhukommelse når en fisk (eller stang) ikke skal bruges mere
export function rydOp(o) {
  o.traverse(c => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) [].concat(c.material).forEach(m => m.dispose());
  });
}
