// ===== Banerne: de fælles byggeklodser — kasser med teksturer, materialer, tønder, lamper, palmer og vej-nettet =====
// Hver bane står i sin egen fil i baner/ og bygger sig selv af klodserne her. Alt er kasser, så kollisionen
// (verden.js) er enkel. Til sidst laves et vej-net, som botterne går efter.
// En ny bane: lav baner/<navn>.js (se stoevbyen.js), tilføj den i BANER herunder og i katalog.js.

import * as THREE from "./three.js";
import stoevbyen from "./baner/stoevbyen.js";
import havnen from "./baner/havnen.js";
import fjeldbyen from "./baner/fjeldbyen.js";

const BANER = { stoevbyen, havnen, fjeldbyen };
// De fotos, en bane skal bruge: dem i banens fil og dem, alle baner bruger (kasser, døre, tønder og træer)
export const fotoBrug = id => [...new Set(["planker", "doer", "metal", "bark", ...((BANER[id] || BANER.stoevbyen).fotos || [])])];

const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- Geometri: kasser med teksturer i verdens-meter og mørkere farve forneden (som skygge i hjørnerne) ----------
const FLISE = { sandsten: 4, puds: 4, fliser: 4, sand: 6, mørk: 4, tag: 3, beton: 4, lagerhal: 2, pier: 3,
  containerRød: 2, containerBlå: 2, containerGrøn: 2, containerOrange: 2, containerGul: 2, containerHvid: 2,
  sne: 9, klippe: 6, sten: 3, is: 5, stammer: 2, tagSort: 3, panelRød: 3, panelGul: 3, panelBrun: 3, panelHvid: 3 };
class Bygger {
  constructor() { this.grupper = new Map(); }
  gruppe(mat) {
    if (!this.grupper.has(mat)) this.grupper.set(mat, { pos: [], nor: [], uv: [], farve: [], idx: [] });
    return this.grupper.get(mat);
  }
  // En firkant: fire hjørner (mod uret set udefra), normalen og uv/farve for hvert hjørne
  firkant(mat, h, n, uv, f) {
    const g = this.gruppe(mat), i = g.pos.length / 3;
    for (let k = 0; k < 4; k++) { g.pos.push(...h[k]); g.nor.push(...n); g.uv.push(...uv[k]); g.farve.push(f[k], f[k], f[k]); }
    g.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  // En kasse. o: { prFlade: tekstur pr. side (kasser og døre), bund: tegn bunden, top: false = uden top, mørkere: 0..1 }
  kasse(x0, y0, z0, x1, y1, z1, mat, o = {}) {
    const t = FLISE[mat] || 4, pr = !!o.prFlade, m = o.mørkere ?? 1;
    const ao = y => m * (y - y0 > 2.4 ? 1 : 0.6 + 0.4 * Math.min(1, (y - y0) / 2.4));
    const uvS = (a, y) => (pr ? null : [a / t, y / t]);
    // siderne deles ved 2,4 m, så skyggen forneden ikke strækker sig op ad hele muren
    const lag = y1 - y0 > 2.6 ? [y0, y0 + 2.4, y1] : [y0, y1];
    for (let j = 0; j < lag.length - 1; j++) {
      const ya = lag[j], yb = lag[j + 1], fa = ao(ya), fb = ao(yb);
      const v0 = pr ? (ya - y0) / (y1 - y0) : null, v1 = pr ? (yb - y0) / (y1 - y0) : null;
      const s = (a0, a1, l) => pr ? [[0, v0], [1, v0], [1, v1], [0, v1]] : [uvS(a0, ya), uvS(a1, ya), uvS(a1, yb), uvS(a0, yb)];
      this.firkant(mat, [[x1, ya, z1], [x1, ya, z0], [x1, yb, z0], [x1, yb, z1]], [1, 0, 0], s(-z1, -z0), [fa, fa, fb, fb]);   // øst
      this.firkant(mat, [[x0, ya, z0], [x0, ya, z1], [x0, yb, z1], [x0, yb, z0]], [-1, 0, 0], s(z0, z1), [fa, fa, fb, fb]);    // vest
      this.firkant(mat, [[x0, ya, z1], [x1, ya, z1], [x1, yb, z1], [x0, yb, z1]], [0, 0, 1], s(x0, x1), [fa, fa, fb, fb]);     // syd
      this.firkant(mat, [[x1, ya, z0], [x0, ya, z0], [x0, yb, z0], [x1, yb, z0]], [0, 0, -1], s(-x1, -x0), [fa, fa, fb, fb]);  // nord
    }
    const ft = m;                                                   // toppen er altid lys (solen skinner på den)
    if (o.top !== false) this.firkant(o.topMat || mat, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0],
      pr ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[x0 / t, -z1 / t], [x1 / t, -z1 / t], [x1 / t, -z0 / t], [x0 / t, -z0 / t]], [ft, ft, ft, ft]);
    if (o.bund) { const fb = 0.55 * m; this.firkant(mat, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0],
      [[x0 / t, z0 / t], [x1 / t, z0 / t], [x1 / t, z1 / t], [x0 / t, z1 / t]], [fb, fb, fb, fb]); }
  }
  // Et stykke gulv (kun oversiden)
  gulv(x0, z0, x1, z1, mat) {
    const t = FLISE[mat] || 4;
    this.firkant(mat, [[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]], [0, 1, 0],
      [[x0 / t, -z1 / t], [x1 / t, -z1 / t], [x1 / t, -z0 / t], [x0 / t, -z0 / t]], [1, 1, 1, 1]);
  }
  // Lav én mesh pr. materiale (navnet er materialets, så lyset fra Blender kan finde den igen)
  færdig(scene, materialer) {
    const masker = [];
    for (const [mat, g] of this.grupper) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(g.nor, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(g.farve, 3));
      geo.setIndex(g.idx);
      const mesh = new THREE.Mesh(geo, materialer[mat]);
      mesh.name = mat; mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh); masker.push(mesh);
    }
    return masker;
  }
}

// ---------- Materialerne: fotos fra Poly Haven (eller de tegnede teksturer, hvis fotoene ikke kunne hentes) ----------
function lavMaterialer(t) {
  const std = (map, o = {}) => new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: o.bump ?? 1.2, roughness: o.ru ?? 0.95, metalness: o.me ?? 0, vertexColors: true, color: o.farve ?? 0xffffff });
  // Et foto: farve, buler (normal) og ruhed + skygge i krogene (arm). Gentages, så det får sin rigtige størrelse i meter
  const foto = (navn, flise, o = {}) => {
    const f = t.foto[navn];
    if (!f) return std(t.metal, { farve: o.farve ?? 0x9a9a9a, ru: 0.9 });   // fotoet hører til en anden bane (og er ikke hentet)
    const gentag = flise / f.meter;
    for (const k of [f.farve, f.normal, f.arm]) k.repeat.set(gentag, gentag);
    return new THREE.MeshStandardMaterial({ map: f.farve, normalMap: f.normal, normalScale: new THREE.Vector2(o.nor ?? 1, o.nor ?? 1),
      roughnessMap: f.arm, aoMap: f.arm, roughness: 1, metalness: 0, vertexColors: true, color: new THREE.Color(o.farve ?? 0xffffff).multiplyScalar(o.lys ?? 1) });
  };
  const fjeld = () => {                                            // Fjeldbyen: sne, fjeld, træhuse i mange farver og en frossen sø
    const is = foto("sne", FLISE.is, { farve: 0x9cc4dc, nor: 0.4 }); is.roughnessMap = null; is.roughness = 0.18;
    return {
      sne: foto("sne", FLISE.sne), klippe: foto("klippe", FLISE.klippe, { farve: 0xb8bcc6, nor: 1.4 }), sten: foto("klippe", FLISE.sten, { farve: 0xa0a4ac, nor: 1.4 }), is,
      stammer: foto("bark", FLISE.stammer, { farve: 0xa07858 }), tagSort: foto("planker", FLISE.tagSort, { farve: 0x5a4c42 }),
      panelRød: foto("panel", FLISE.panelRød, { farve: 0xc8402c, lys: 1.15 }), panelGul: foto("panel", FLISE.panelGul, { farve: 0xf0c060, lys: 1.15 }),
      panelBrun: foto("panel", FLISE.panelBrun, { farve: 0xa47a58, lys: 1.1 }), panelHvid: foto("panel", FLISE.panelHvid, { farve: 0xffffff, lys: 1.5 }),
    };
  };
  const stof = farve => new THREE.MeshStandardMaterial({ color: farve, roughness: 1, vertexColors: true, side: THREE.DoubleSide });
  const fælles = {
    vindue: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.4, vertexColors: true }),
    stofRød: stof(0xb8402e), stofBlå: stof(0x2e6a9a), stofHvid: stof(0xe8dcc0),
  };
  const havn = f => ({                                             // Havnen: beton, metalplader og containere i mange farver
    beton: f("beton", FLISE.beton), lagerhal: f("blik", FLISE.lagerhal, { farve: 0xa0acb6 }), pier: f("planker", FLISE.pier, { farve: 0x9a8070 }),
    containerRød: f("blik", 2, { farve: 0xe85038 }), containerBlå: f("blik", 2, { farve: 0x3a7ae0 }), containerGrøn: f("blik", 2, { farve: 0x4ab05a }),
    containerOrange: f("blik", 2, { farve: 0xf89038 }), containerGul: f("blik", 2, { farve: 0xf8cc3a }), containerHvid: f("blik", 2, { farve: 0xf0f0e8 }),
  });
  if (t.foto) return {
    ...(t.foto.beton && t.foto.blik ? havn(foto) : havn((_, __, o = {}) => std(t.metal, { farve: o.farve ?? 0x9a9a9a, ru: 0.8 }))),
    sandsten: foto("sandsten", FLISE.sandsten, { nor: 1.3 }), puds: foto("puds", FLISE.puds), fliser: foto("fliser", FLISE.fliser), sand: foto("sand", FLISE.sand),
    mørk: foto("sandsten", FLISE.mørk, { farve: 0x9a8a72, nor: 1.3 }), tag: foto("planker", FLISE.tag, { farve: 0xb89870 }),
    trækasse: std(t.kasseFoto, { bump: 1.2, ru: 0.85 }), dør: std(t.dørFoto, { bump: 0.8, ru: 0.7 }),
    metal: std(t.metal, { ru: 0.55, me: 0.45 }), ...fjeld(), ...fælles,
  };
  return {
    sandsten: std(t.sandsten), puds: std(t.puds, { bump: 0.6 }), fliser: std(t.fliser, { bump: 1 }), sand: std(t.sand, { bump: 0.5 }),
    mørk: std(t.sandsten, { farve: 0x9a8a72 }), tag: std(t.trækasse, { farve: 0xb89870, bump: 0.6 }),
    trækasse: std(t.trækasse, { bump: 1.5, ru: 0.9 }), dør: std(t.dør, { bump: 0.8, ru: 0.6, me: 0.35 }), metal: std(t.metal, { ru: 0.55, me: 0.45 }),
    ...havn((_, __, o = {}) => std(t.metal, { farve: o.farve ?? 0x9a9a9a, ru: 0.8 })), ...fælles,
    sne: std(t.sand, { farve: 0xf4f6fa, bump: 0.3 }), klippe: std(t.sandsten, { farve: 0x9aa0a8 }), sten: std(t.sandsten, { farve: 0x8a9098 }), is: std(t.fliser, { farve: 0xb8d8ea, ru: 0.2 }),
    stammer: std(t.bark, { farve: 0xa07858 }), tagSort: std(t.trækasse, { farve: 0x5a4c42 }), panelRød: std(t.trækasse, { farve: 0xc8402c }),
    panelGul: std(t.trækasse, { farve: 0xf0c060 }), panelBrun: std(t.trækasse, { farve: 0xa47a58 }), panelHvid: std(t.trækasse, { farve: 0xf4f2ec }),
  };
}
// Materialer, kuglerne kan ramme (bestemmer gnisterne og lyden)
const KUGLEMAT = { sandsten: "sten", puds: "sten", fliser: "sten", sand: "sand", mørk: "sten", tag: "træ", trækasse: "træ", dør: "metal", metal: "metal", vindue: "sten",
  beton: "sten", lagerhal: "metal", pier: "træ", containerRød: "metal", containerBlå: "metal", containerGrøn: "metal", containerOrange: "metal", containerGul: "metal", containerHvid: "metal",
  sne: "sand", klippe: "sten", sten: "sten", is: "sten", stammer: "træ", tagSort: "træ", panelRød: "træ", panelGul: "træ", panelBrun: "træ", panelHvid: "træ" };

// ---------- Byg en bane (id fra katalog.js) ----------
export function lavBane(scene, verden, t, id = "stoevbyen") {
  const def = BANER[id] || BANER.stoevbyen;
  const mat = lavMaterialer(t), b = new Bygger();
  const solid = (x0, y0, z0, x1, y1, z1, m, o = {}) => { b.kasse(x0, y0, z0, x1, y1, z1, m, o); if (o.kollision !== false) verden.tilføj(x0, y0, z0, x1, y1, z1, KUGLEMAT[m] || "sten"); };
  const info = def.byg({ b, solid, verden, hash, scene, t, THREE });
  const masker = b.færdig(scene, mat);
  lavTønder(scene, info.tønder || [], t);
  lavLamper(scene, info.lamper || []);
  lavPalmer(scene, verden, t, info.palmer || []);
  lavGraner(scene, verden, t, info.graner || []);
  // det, der kun er til at se på (fx vand og et skib, eller sne der falder) — kun i browseren, ikke når banen gemmes til Blender
  const pynt = typeof document !== "undefined" ? info.pynt?.({ scene, THREE, t, hash }) : null;
  const knuder = lavVejnet(verden, info.erFast || (() => false), info.grænse, info.ekstraKnuder || []);
  return { id: BANER[id] ? id : "stoevbyen", navn: def.navn, knuder, erFast: info.erFast, masker, start: def.start, poster: def.poster, omveje: def.omveje || [], postVægt: def.postVægt || (() => 1), lamper: info.lamper || [], grænse: info.grænse,
    vejr: def.vejr || null, opdater: pynt?.opdater || null };
}

// Tønder: runde, med to ringe (kun til at se på — kollisionen er en kasse)
function lavTønder(scene, tønder, t) {
  const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.95, 16), ring = new THREE.TorusGeometry(0.305, 0.02, 6, 20);
  const f = t.foto?.metal, gentag = k => { const c = k.clone(); c.repeat.set(2, 1); return c; };   // fotoet er 1 m: rundt om tønden ca. 2 m
  const m = f ? new THREE.MeshStandardMaterial({ map: gentag(f.farve), normalMap: gentag(f.normal), roughnessMap: gentag(f.arm), metalnessMap: gentag(f.arm), roughness: 1, metalness: 1 })
    : new THREE.MeshStandardMaterial({ map: t.metal, roughness: 0.6, metalness: 0.4, color: 0x8a9a70 });
  const rm = new THREE.MeshStandardMaterial({ color: 0x3a3f30, roughness: 0.5, metalness: 0.6 });
  for (const [x, z] of tønder) {
    const g = new THREE.Mesh(geo, m); g.position.set(x, 0.475, z); g.castShadow = g.receiveShadow = true; scene.add(g);
    for (const y of [0.25, 0.7]) { const r = new THREE.Mesh(ring, rm); r.rotation.x = Math.PI / 2; r.position.set(x, y, z); scene.add(r); }
  }
}
// Lamperne: en ledning fra taget, en skærm af metal og en pære, der lyser
function lavLamper(scene, lamper) {
  const skærm = new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide });
  const pære = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  const ledning = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const [x, y, z, loft] of lamper) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, loft - y, 4), ledning); l.position.y = (loft - y) / 2;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.2, 0.14, 16, 1, true), skærm); s.castShadow = true;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), pære); p.position.y = -0.06;
    g.add(l, s, p); scene.add(g);
  }
}
// Palmer: en buet stamme og en krone af lange blade
function lavPalmer(scene, verden, t, steder) {
  const f = t.foto?.bark, gentag = k => { const c = k.clone(); c.repeat.set(1, 0.7); return c; };
  const bark = f ? new THREE.MeshStandardMaterial({ map: gentag(f.farve), normalMap: gentag(f.normal), roughnessMap: gentag(f.arm), roughness: 1 })
    : new THREE.MeshStandardMaterial({ map: t.bark, roughness: 1 });
  const blad = new THREE.MeshStandardMaterial({ map: t.palmeblad, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 });
  const bladGeo = new THREE.PlaneGeometry(1.2, 3.6, 1, 4);
  { const p = bladGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -(((y + 1.8) / 3.6) ** 2) * 1.2); } bladGeo.translate(0, 1.8, 0); bladGeo.computeVertexNormals(); }
  for (const [x, z] of steder) {
    const g = new THREE.Group(), h = 6 + hash(x, z) * 2.5, hæld = (hash(z, x) - 0.5) * 0.5;
    let px = 0, py = 0;
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.17 - i * 0.008, 0.2 - i * 0.008, h / 8 + 0.05, 9), bark);
      const nx = px + hæld * (i / 8) * 0.6; s.position.set((px + nx) / 2, py + h / 16, 0); s.rotation.z = -hæld * 0.35;
      s.castShadow = true; g.add(s); px = nx; py += h / 8;
    }
    for (let i = 0; i < 9; i++) {
      const bl = new THREE.Mesh(bladGeo, blad); bl.position.set(px, py, 0);
      bl.rotation.set(-1.0 - hash(i, x) * 0.5, i / 9 * Math.PI * 2, 0, "YXZ"); bl.castShadow = true; g.add(bl);
    }
    g.position.set(x, 0, z); g.rotation.y = hash(x + 1, z) * 6;
    scene.add(g);
    verden.tilføj(x - 0.22, 0, z - 0.22, x + 0.22, h, z + 0.22, "træ");
  }
}

// Graner: en stamme og fire lag grønne kegler med sne på. Alle graner samles i tre masker (én pr. materiale).
// steder: [x, z, højde, kollision] — uden kollision står de bare til pynt uden for banen
function lavGraner(scene, verden, t, steder) {
  for (const [x, z, h = 9, kollision = true] of steder) if (kollision) verden.tilføj(x - 0.22, 0, z - 0.22, x + 0.22, h, z + 0.22, "træ");
  if (!steder.length || typeof document === "undefined") return;    // (når banen gemmes til Blender, er kun stammerne med)
  const f = t.foto?.bark, gentag = k => { const c = k.clone(); c.repeat.set(1, 2); return c; };
  const bark = f ? new THREE.MeshStandardMaterial({ map: gentag(f.farve), normalMap: gentag(f.normal), roughness: 1, color: 0x8a6a52 })
    : new THREE.MeshStandardMaterial({ map: t.bark, roughness: 1, color: 0x8a6a52 });
  const nåle = new THREE.MeshStandardMaterial({ color: 0x2a4632, roughness: 0.95, flatShading: true });
  const sne = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
  const dele = { bark: [], nåle: [], sne: [] }, m = new THREE.Matrix4();
  const læg = (liste, geo, x, y, z) => { geo.applyMatrix4(m.makeRotationY(hash(x * 7, z * 3) * 6.3)); geo.translate(x, y, z); liste.push(geo.toNonIndexed()); };
  for (const [x, z, h = 9, kollision = true] of steder) {
    const r = h * 0.23, y0 = Math.max(2.1, h * 0.18), hh = (h - y0) * 0.42;   // de nederste grene er over hovedet på soldaterne
    læg(dele.bark, new THREE.CylinderGeometry(r * 0.07, r * 0.1, y0 + 0.5, 7), x, (y0 + 0.5) / 2, z);
    for (let i = 0; i < 4; i++) {
      const y = y0 + i * (h - y0 - hh) / 3, rr = r * (1 - i * 0.2);
      læg(dele.nåle, new THREE.ConeGeometry(rr, hh, 9), x, y + hh / 2, z);
      // sne på den del af laget, man kan se (resten skjules af laget ovenover) — og på toppen af træet
      læg(dele.sne, new THREE.CylinderGeometry(rr * 0.5 * 1.04, rr * 0.86 * 1.04, hh * 0.36, 9, 1, true), x, y + hh * 0.32, z);
      if (i === 3) læg(dele.sne, new THREE.ConeGeometry(rr * 0.5 * 1.04, hh * 0.5, 9), x, y + hh * 0.75, z);
    }
  }
  for (const [navn, mat] of [["bark", bark], ["nåle", nåle], ["sne", sne]]) {
    const mesh = new THREE.Mesh(samlGeo(dele[navn]), mat);
    mesh.castShadow = true; mesh.receiveShadow = navn !== "nåle"; scene.add(mesh);
  }
}
// Læg mange (ikke-indekserede) former sammen til én
function samlGeo(geoer) {
  const ud = new THREE.BufferGeometry();
  for (const n of ["position", "normal", "uv"]) {
    const længde = geoer.reduce((s, g) => s + g.attributes[n].array.length, 0), a = new Float32Array(længde);
    let i = 0; for (const g of geoer) { a.set(g.attributes[n].array, i); i += g.attributes[n].array.length; }
    ud.setAttribute(n, new THREE.BufferAttribute(a, n === "uv" ? 2 : 3));
  }
  return ud;
}

// ---------- Vej-nettet: punkter for hver 3 meter på gaderne, forbundet, hvor man kan gå direkte ----------
function lavVejnet(verden, erFast, [x0, z0, x1, z1], ekstra) {
  const knuder = [], B = 0.42;
  for (let x = x0 + 1.5; x < x1; x += 3) for (let z = z0 + 1.5; z < z1; z += 3) {
    if (erFast(x, z)) continue;
    const y = verden.gulv(x, 1.2, z);
    if (y < -0.5 || y > 1.05 || !verden.fri(x, y + 0.01, z, B, 1.8)) continue;
    knuder.push({ x, y, z, nab: [] });
  }
  // ekstra punkter (fx ved trapper, hvor gitteret ikke passer med trinene)
  for (const [x, z] of ekstra) {
    const y = verden.gulv(x, 1.2, z);
    if (verden.fri(x, y + 0.01, z, B, 1.8)) knuder.push({ x, y, z, nab: [] });
  }
  const kanGå = (a, c) => {                                         // gå i små skridt: ingen trin over 0,45 m, og der skal være plads
    const l = Math.hypot(c.x - a.x, c.z - a.z), n = Math.ceil(l / 0.35);
    let y = a.y;
    for (let i = 1; i <= n; i++) {
      const x = a.x + (c.x - a.x) * i / n, z = a.z + (c.z - a.z) * i / n, g = verden.gulv(x, y + 0.46, z);
      if (Math.abs(g - y) > 0.46 || !verden.fri(x, g + 0.46, z, B * 0.9, 1.3)) return false;   // (trin under 0,46 m kan man træde op på)
      y = g;
    }
    return Math.abs(y - c.y) < 0.05;
  };
  for (let i = 0; i < knuder.length; i++) for (let j = i + 1; j < knuder.length; j++) {
    const a = knuder[i], c = knuder[j], d = Math.hypot(a.x - c.x, a.z - c.z);
    if (d > 4.3 || !kanGå(a, c) || !kanGå(c, a)) continue;
    a.nab.push(j); c.nab.push(i);
  }
  return knuder;
}

// Den korteste vej mellem to knuder (A*). Svarer med en liste af knude-numre
export function findVej(knuder, fra, til) {
  if (fra === til) return [til];
  const g = new Map([[fra, 0]]), kom = new Map(), åben = new Set([fra]);
  const h = i => Math.hypot(knuder[i].x - knuder[til].x, knuder[i].z - knuder[til].z);
  const f = new Map([[fra, h(fra)]]);
  while (åben.size) {
    let bedst = null;
    for (const i of åben) if (bedst === null || f.get(i) < f.get(bedst)) bedst = i;
    if (bedst === til) { const vej = [til]; let k = til; while (kom.has(k)) { k = kom.get(k); vej.unshift(k); } return vej; }
    åben.delete(bedst);
    for (const n of knuder[bedst].nab) {
      const ng = g.get(bedst) + Math.hypot(knuder[n].x - knuder[bedst].x, knuder[n].z - knuder[bedst].z);
      if (ng < (g.get(n) ?? Infinity)) { g.set(n, ng); kom.set(n, bedst); f.set(n, ng + h(n)); åben.add(n); }
    }
  }
  return null;
}
// Den nærmeste knude (med næsten samme højde) til et sted
export function nærmesteKnude(knuder, x, y, z) {
  let bedst = -1, bd = Infinity;
  for (let i = 0; i < knuder.length; i++) {
    const k = knuder[i], d = (k.x - x) ** 2 + (k.z - z) ** 2 + ((k.y - y) * 3) ** 2;
    if (d < bd) { bd = d; bedst = i; }
  }
  return bedst;
}
