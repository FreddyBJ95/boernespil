// ===== Temaerne: hvordan hver bane ser ud =====
// Et tema bestemmer himlen, lyset, hvad der er under banen (vand eller skyer), banens overflade,
// rækværket, puderne man kan støde ind i, og pynten rundt om banen (træer, slikkepinde, graner …).
// pynt(S, x, bund, z, top, r): lægger én ting ved siden af banen. S er en Samler (bane.js),
//   bund = vandets højde, top = omtrent banens højde, r = tilfældige tal.

import * as THREE from "./three.js";
import * as T from "./teksturer.js";
import { læg, kopi } from "./modeller.js";

const std = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.75, ...x });
const fys = (farve, x = {}) => new THREE.MeshPhysicalMaterial({ color: farve, roughness: 0.35, clearcoat: 0.6, ...x });

// Teksturerne laves kun én gang, også når man skifter bane
const lager = {};
const tex = (navn, fn) => (lager[navn] ??= fn());

// En knoldet kugle (trækroner, skyer, sten): en kugle med små buler
const knoldLager = {};
export function knold(frø = 1, styrke = 0.16, seg = 18) {
  const nøgle = `${frø}-${styrke}-${seg}`;
  if (knoldLager[nøgle]) return knoldLager[nøgle];
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + styrke * (Math.sin(v.x * 3.1 + frø) * Math.sin(v.y * 2.7 + frø * 2.1) * Math.sin(v.z * 3.3 + frø * 1.3) * 1.4
      + 0.45 * Math.sin(v.x * 7.3 + v.z * 5.1 + frø) * Math.sin(v.y * 6.1 + frø));
    v.multiplyScalar(n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return (knoldLager[nøgle] = g);
}

// Delte figurer
const G = {
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16, 1),
  cylLav: new THREE.CylinderGeometry(1, 1, 1, 10, 1),
  kegle: new THREE.ConeGeometry(1, 1, 18, 1),
  kugle: new THREE.SphereGeometry(1, 20, 14),
  halvkugle: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  kasse: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.35, 12, 28),
};

// En lille ø i vandet under pynten
function ø(S, x, bund, z, r, mat, kant, str = 1) {
  const rr = (2.4 + r() * 1.6) * str;
  if (læg(S, "ø", [x, bund, z], [0, r() * 6, 0], [rr, str, rr])) return;   // øen fra Blender
  S.put(G.cyl, kant, [x, bund - 0.3, z], [0, r() * 6, 0], [rr * 1.12, 0.9, rr * 1.12]);
  S.put(knold(3, 0.1, 16), mat, [x, bund + 0.1, z], [0, r() * 6, 0], [rr, 0.45 * str, rr]);
}

// ---------- ENGEN ----------
function eng() {
  const græs = tex("græs", T.græs), jord = tex("jordSide", T.jordSide);
  const bark = std("#7a5230", { roughness: 0.95 }), løv = [std("#3f9a35", { roughness: 0.85 }), std("#4fae3c", { roughness: 0.85 }), std("#2f8a3a", { roughness: 0.85 })];
  const grønø = std("#58a83e", { roughness: 0.95 }), sand = std("#e6d29a", { roughness: 1 });
  const hat = fys("#e8283c", { roughness: 0.45 }), prik = std("#fff8ee", { roughness: 0.6 }), stilk = std("#f3ead2", { roughness: 0.8 });
  const kron = [fys("#ff8cc6", { roughness: 0.5 }), fys("#ffd23f", { roughness: 0.5 }), fys("#b58cff", { roughness: 0.5 }), fys("#ffffff", { roughness: 0.5 })];
  const grøn = std("#3f8f2e", { roughness: 0.8 }), midt = std("#ffb61f", { roughness: 0.9 });
  const sten = std("#9aa0a6", { roughness: 0.9 });

  function træ(S, x, bund, z, top, r) {
    ø(S, x, bund, z, r, grønø, sand);
    const h = top - bund + 1 + r() * 4;
    if (læg(S, "stamme", [x, bund, z], [0, r() * 6, 0], [0.45, h, 0.45])) {         // stamme, gren og krone fra Blender
      læg(S, "stamme", [x + 0.25, bund + h * 0.55, z], [0, 0, -0.7], [0.18, 2.4, 0.18]);
      læg(S, "løvkrone", [x, bund + h, z], [0, r() * 6, 0], 0.85 + r() * 0.35);
      return;
    }
    S.put(G.cylLav, bark, [x, bund + h / 2, z], [0, 0, 0], [0.45, h, 0.45]);
    S.put(G.cylLav, bark, [x + 0.8, bund + h * 0.7, z], [0, 0, -0.7], [0.18, 2.4, 0.18]);
    const n = 5 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + r(), d = k === 0 ? 0 : 1.4 + r() * 0.8, s = 1.7 + r() * 1.0;
      S.put(knold(k + 1, 0.2), løv[k % 3], [x + Math.cos(a) * d, bund + h + (k === 0 ? 1.4 : r() * 1.2 - 0.2), z + Math.sin(a) * d], [r(), r() * 6, 0], [s, s * 0.85, s]);
    }
  }
  function svamp(S, x, bund, z, top, r) {
    ø(S, x, bund, z, r, grønø, sand, 0.8);
    const h = top - bund - 1.5 + r() * 3, rr = 2 + r() * 1;
    if (læg(S, "svampestok", [x, bund, z], [0, r() * 6, 0], [0.6, h, 0.6])) {
      læg(S, "svampehat", [x, bund + h - 0.15, z], [0, r() * 6, 0], rr);
      return;
    }
    S.put(G.cyl, stilk, [x, bund + h / 2, z], [0, 0, (r() - 0.5) * 0.15], [0.6, h, 0.6]);
    S.put(G.halvkugle, hat, [x, bund + h - 0.2, z], [0, 0, 0], [rr, rr * 0.62, rr]);
    for (let k = 0; k < 9; k++) {
      const a = r() * 6.28, b = 0.35 + r() * 0.8;
      const px = Math.cos(a) * Math.sin(b), py = Math.cos(b), pz = Math.sin(a) * Math.sin(b);
      S.put(G.kugle, prik, [x + px * rr, bund + h - 0.2 + py * rr * 0.62, z + pz * rr], [0, 0, 0], 0.25 + r() * 0.15);
    }
  }
  function blomst(S, x, bund, z, top, r) {
    ø(S, x, bund, z, r, grønø, sand, 0.6);
    const h = top - bund + r() * 3, k = kron[Math.floor(r() * kron.length)];
    S.put(G.cylLav, grøn, [x, bund + h / 2, z], [0, 0, 0], [0.16, h, 0.16]);
    S.put(G.kugle, grøn, [x + 0.7, bund + h * 0.45, z], [0, 0, 0.6], [0.9, 0.12, 0.45]);
    S.put(G.kugle, grøn, [x - 0.7, bund + h * 0.3, z], [0, 0, -0.6], [0.9, 0.12, 0.45]);
    const hoved = new THREE.Matrix4().compose(new THREE.Vector3(x, bund + h, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, r() * 6, 0)), new THREE.Vector3(1, 1, 1));
    if (læg(S, "blomsterhoved", [0, 0, 0], [0, 0, 0], 1, hoved, k.color.getStyle())) return;
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      S.put(G.kugle, k, [Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95], [0, -a, 0], [0.7, 0.14, 0.42], hoved);
    }
    S.put(G.kugle, midt, [0, 0.08, 0], [0, 0, 0], [0.5, 0.25, 0.5], hoved);
  }
  function fjernt(S, cx, cz, bund, r) {                   // grønne bakker og øer langt væk
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, d = 230 + r() * 260, s = 30 + r() * 60;
      S.put(knold(i % 5 + 1, 0.12, 20), løv[i % 3], [cx + Math.cos(a) * d, bund - s * 0.25, cz + Math.sin(a) * d], [0, r() * 6, 0], [s, s * (0.35 + r() * 0.25), s * 0.8]);
    }
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28, d = 90 + r() * 110;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, s = 6 + r() * 10;
      S.put(G.cyl, sand, [x, bund - 0.2, z], [0, 0, 0], [s * 1.1, 0.8, s * 1.1]);
      S.put(knold(i + 2, 0.12), grønø, [x, bund, z], [0, 0, 0], [s, s * 0.3, s]);
      for (let k = 0; k < 3; k++) S.put(knold(k + 1, 0.2), løv[k], [x + (r() - 0.5) * s, bund + s * 0.3 + 2, z + (r() - 0.5) * s], [0, 0, 0], 2 + r() * 2);
      if (r() < 0.5) S.put(knold(i, 0.2, 10), sten, [x + s * 0.5, bund + 0.5, z], [0, 0, 0], 1.2 + r());
    }
  }
  function pude() {                                      // en blød, rød svamp midt på banen
    const g = new THREE.Group(), m = kopi("pude_eng");
    if (m) { g.add(m); return g; }
    const st = new THREE.Mesh(G.cyl, stilk); st.scale.set(0.32, 0.6, 0.32); st.position.y = 0.3;
    const h = new THREE.Mesh(G.halvkugle, hat); h.scale.set(0.8, 0.55, 0.8); h.position.y = 0.5;
    g.add(st, h);
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * 6.28, p = new THREE.Mesh(G.kugle, prik); p.scale.setScalar(0.09);
      p.position.set(Math.cos(a) * 0.55, 0.85, Math.sin(a) * 0.55); g.add(p);
    }
    const p = new THREE.Mesh(G.kugle, prik); p.scale.setScalar(0.12); p.position.y = 1.05; g.add(p);
    return g;
  }
  return {
    himmel: { top: "#2f86ea", horisont: "#cde9ff", bund: "#e9f6ff", sol: [-0.35, 0.62, -0.7], solFarve: "#fff3c8" },
    tåge: [90, 520], hemi: ["#dff1ff", "#5d8a4a", 0.95], sollys: ["#fff1d6", 2.6],
    under: { type: "vand", y: -13, farve: "#1f7fa8" }, underlag: "græs", musik: "eng",
    top: std("#ffffff", { map: græs.map, normalMap: græs.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.92 }),
    side: std("#ffffff", { map: jord.map, normalMap: jord.normalMap, roughness: 0.95 }),
    topL: 4, sideL: 6, tyk: 1.6, bund: 0.7,
    rækværk: {
      afstand: 2.2, stolpe: (S, p, a) => S.put(G.kasse, bark, [p.x, p.y + 0.36, p.z], [0, a, 0], [0.16, 0.72, 0.16]),
      rør: [{ h: 0.62, r: 0.055, mat: bark }, { h: 0.32, r: 0.045, mat: bark }],
    },
    pynt: [træ, træ, svamp, blomst], fjernt, pude, luft: "pollen",
    balloner: ["#ff477e", "#ffd23f", "#06d6a0", "#3a86ff", "#ffffff"],
  };
}

// ---------- SLIKBANEN ----------
function slik() {
  const glas = tex("glasur", T.glasur), kage = tex("kageSide", T.kageSide), stribe = tex("striber", () => T.striber("#ffffff", "#ff2d55"));
  const spir = [tex("spiral1", () => T.spiral()), tex("spiral2", () => T.spiral(["#a56bff", "#ffffff", "#4dd2ff", "#ffffff"])), tex("spiral3", () => T.spiral(["#7cff6b", "#ffffff", "#ff9f1c", "#ffffff"]))];
  const pind = std("#fffaf0", { roughness: 0.5 });
  const pindeMat = spir.map(t => fys("#ffffff", { map: t, roughness: 0.18, clearcoat: 1 }));
  const stok = fys("#ffffff", { map: stribe, roughness: 0.2, clearcoat: 1 });
  const vaffel = std("#d9a45b", { roughness: 0.85 }), is = [fys("#ff9ecb"), fys("#9ff5d0"), fys("#fff2c8"), fys("#c6a2ff")];
  const kirsebær = fys("#e8102f", { roughness: 0.15, clearcoat: 1 });
  const gummi = ["#ff3355", "#ffcc00", "#33cc66", "#3399ff", "#ff66cc", "#ff8800"].map(f => fys(f, { roughness: 0.55, clearcoat: 0.3, sheen: 1, sheenColor: new THREE.Color("#ffffff") }));
  const kagemat = std("#f7d88f", { roughness: 0.9 }), glasurMat = fys("#ff8fc8", { roughness: 0.4 }), choko = fys("#6b3a1e", { roughness: 0.35 });
  const donut = std("#e0a868", { roughness: 0.8 });

  function slikkepind(S, x, bund, z, top, r) {
    const h = top - bund + 2 + r() * 4, rr = 1.8 + r() * 1.2;
    if (læg(S, "slikpind", [x, bund, z], [0, 0, 0], [0.18, h, 0.18])) {
      læg(S, "slikskive" + (1 + Math.floor(r() * 3)), [x, bund + h + rr * 0.8, z], [0, r() * 6, 0], [rr, rr, 1]);
      gummiø(S, x, bund, z, r);
      return;
    }
    S.put(G.cylLav, pind, [x, bund + h / 2, z], [0, 0, 0], [0.18, h, 0.18]);
    S.put(G.cyl, pindeMat[Math.floor(r() * 3)], [x, bund + h + rr * 0.8, z], [Math.PI / 2, 0, r() * 6], [rr, 0.45, rr]);
    gummiø(S, x, bund, z, r);
  }
  function slikstok(S, x, bund, z, top, r) {
    const h = top - bund + 1 + r() * 4, a = r() * 6.28, rr = 1.3;
    const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, h, 0)];
    for (let k = 1; k <= 8; k++) { const v = k / 8 * Math.PI; pts.push(new THREE.Vector3(rr - Math.cos(v) * rr, h + Math.sin(v) * rr, 0)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.4, 12, false);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * h * 0.6, uv.getY(i));
    S.put(g, stok, [x, bund, z], [0, a, 0], 1);
    g.dispose();
    gummiø(S, x, bund, z, r);
  }
  function isvaffel(S, x, bund, z, top, r) {
    const h = (top - bund) * 0.75 + r() * 2, rr = 1.4 + r() * 0.5;
    if (læg(S, "isvaffel", [x, bund + h / 2, z], [0, r() * 6, 0], [rr, h, rr])) {
      let y = bund + h;
      for (let k = 0; k < 2 + Math.floor(r() * 2); k++) {
        læg(S, "iskugle", [x, y + rr * 0.55, z], [0, r() * 6, 0], [rr * 1.08, rr * 1.05, rr * 1.08], null, is[Math.floor(r() * 4)].color.getStyle());
        y += rr * 1.3;
      }
      læg(S, "kirsebær", [x, y + 0.1, z], [0, r() * 6, 0], 0.4);
      return;
    }
    S.put(G.kegle, vaffel, [x, bund + h / 2, z], [Math.PI, 0, 0], [rr, h, rr]);
    let y = bund + h;
    for (let k = 0; k < 2 + Math.floor(r() * 2); k++) {
      S.put(knold(k + 7, 0.08), is[Math.floor(r() * 4)], [x, y + rr * 0.55, z], [0, r() * 6, 0], [rr * 1.08, rr * 0.9, rr * 1.08]);
      y += rr * 1.3;
    }
    S.put(G.kugle, kirsebær, [x, y + 0.1, z], [0, 0, 0], 0.4);
  }
  function gummiø(S, x, bund, z, r) {
    const s = 2.5 + r() * 1.5;
    S.put(G.halvkugle, gummi[Math.floor(r() * gummi.length)], [x, bund - 0.4, z], [0, 0, 0], [s, s * 0.8, s]);
  }
  function fjernt(S, cx, cz, bund, r) {                   // kagebjerge og kæmpe-cupcakes
    for (let i = 0; i < 22; i++) {
      const a = r() * 6.28, d = 220 + r() * 260, s = 25 + r() * 45;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      S.put(G.cyl, kagemat, [x, bund + s * 0.3, z], [0, 0, 0], [s, s * 0.6, s]);
      S.put(knold(i % 4 + 3, 0.08, 20), i % 3 ? glasurMat : choko, [x, bund + s * 0.6, z], [0, 0, 0], [s * 1.02, s * 0.35, s * 1.02]);
    }
    for (let i = 0; i < 12; i++) {
      const a = r() * 6.28, d = 90 + r() * 100, s = 3 + r() * 4;
      S.put(G.torus, donut, [cx + Math.cos(a) * d, bund + 0.3, cz + Math.sin(a) * d], [Math.PI / 2, 0, 0], [s, s, s * 0.9]);
      S.put(G.torus, glasurMat, [cx + Math.cos(a) * d, bund + 0.3 + s * 0.12, cz + Math.sin(a) * d], [Math.PI / 2, 0, 0], [s * 1.02, s * 1.02, s * 0.6]);
    }
  }
  function pude() {                                      // en gummidråbe med sukker på
    const g = new THREE.Group(), farve = gummi[Math.floor(Math.random() * gummi.length)], b = kopi("pude_slik", farve.color.getStyle());
    if (b) { g.add(b); return g; }
    const m = new THREE.Mesh(G.halvkugle, farve);
    m.scale.set(0.75, 1.0, 0.75);
    g.add(m);
    return g;
  }
  return {
    himmel: { top: "#4f93ff", horisont: "#ffd3e8", bund: "#ffd6ec", sol: [0.3, 0.55, -0.75], solFarve: "#fff0f6" },
    tåge: [110, 560], hemi: ["#fff0fa", "#ff9ec7", 0.7], sollys: ["#fff4ea", 2.9],
    under: { type: "vand", y: -13, farve: "#ff9cc8", ruhed: 0.1, mælk: true }, underlag: "slik", musik: "slik",
    top: fys("#ffffff", { map: glas.map, normalMap: glas.normalMap, roughness: 0.4, clearcoat: 0.5 }),
    side: std("#ffffff", { map: kage.map, normalMap: kage.normalMap, roughness: 0.8 }),
    topL: 3, sideL: 5, tyk: 1.4, bund: 0.85,
    rækværk: {
      afstand: 2.4, stolpe: (S, p, a) => S.put(G.cylLav, stok, [p.x, p.y + 0.4, p.z], [0, a, 0], [0.09, 0.8, 0.09]),
      rør: [{ h: 0.72, r: 0.08, mat: stok }],
    },
    pynt: [slikkepind, slikstok, isvaffel, slikkepind], fjernt, pude, luft: "bobler",
    balloner: ["#ff66cc", "#ffffff", "#a56bff", "#4dd2ff", "#ffe14d"],
  };
}

// ---------- ISBANEN ----------
function isTema() {
  const ist = tex("is", T.is), side = tex("isSide", T.isSide);
  const gran = [std("#1f5a3a", { roughness: 0.9 }), std("#2a6b45", { roughness: 0.9 })], sne = std("#f4fbff", { roughness: 0.7 });
  const stamme = std("#5b3a22", { roughness: 0.95 }), isflage = std("#e8f7ff", { roughness: 0.35 });
  const krystal = fys("#8fd8ff", { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85, emissive: "#2aa0e0", emissiveIntensity: 0.25 });
  const bjerg = std("#ffffff", { roughness: 0.85, vertexColors: true });
  const kul = std("#1a1a1a", { roughness: 0.6 }), gulerod = std("#ff7a1a", { roughness: 0.6 }), hue = fys("#e8283c", { roughness: 0.7 });

  function flage(S, x, bund, z, r, s = 1) { S.put(knold(5, 0.1, 14), isflage, [x, bund, z], [0, r() * 6, 0], [3.5 * s, 0.6, 3 * s]); }
  function granTræ(S, x, bund, z, top, r) {
    flage(S, x, bund, z, r);
    const h = top - bund + 2 + r() * 5, lag = 5;
    if (læg(S, "grantræ", [x, bund, z], [0, r() * 6, 0], [1, h / 10, 1])) return;     // grantræet med sne fra Blender
    S.put(G.cylLav, stamme, [x, bund + h * 0.25, z], [0, 0, 0], [0.35, h * 0.5, 0.35]);
    for (let k = 0; k < lag; k++) {
      const t = k / lag, y = bund + h * (0.3 + t * 0.62), rr = 2.6 * (1 - t * 0.75), hh = 2.8 - t * 0.8;
      S.put(G.kegle, gran[k % 2], [x, y, z], [0, r() * 6, 0], [rr, hh, rr]);
      S.put(G.kegle, sne, [x, y + hh * 0.22, z], [0, r() * 6, 0], [rr * 0.72, hh * 0.58, rr * 0.72]);
    }
  }
  function isKrystal(S, x, bund, z, top, r) {
    flage(S, x, bund, z, r, 0.8);
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const h = (top - bund) * (0.6 + r() * 0.5), rr = 0.6 + r() * 0.6;
      const px = x + (r() - 0.5) * 2.2, pz = z + (r() - 0.5) * 2.2, hæld = [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4];
      const m = new THREE.Matrix4().compose(new THREE.Vector3(px, bund, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(...hæld)), new THREE.Vector3(1, 1, 1));
      S.put(new THREE.CylinderGeometry(rr, rr, h, 6), krystal, [0, h / 2, 0], [0, r(), 0], 1, m);
      S.put(new THREE.ConeGeometry(rr, rr * 2, 6), krystal, [0, h + rr, 0], [0, r(), 0], 1, m);
    }
  }
  function snemand(S, x, bund, z, top, r) {             // snemanden står på en svævende isklump
    const y = top - 3 - r() * 3;
    if (læg(S, "snemand", [x, y, z], [0, r() * 6.28, 0], 1)) return;              // snemanden og isklumpen fra Blender
    S.put(knold(4, 0.12, 14), isflage, [x, y - 0.7, z], [0, r() * 6, 0], [2.4, 1.2, 2.4]);
    S.put(G.kegle, isflage, [x, y - 2.4, z], [Math.PI, 0, 0], [2.2, 3.2, 2.2]);
    const a = r() * 6.28, m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)), new THREE.Vector3(1, 1, 1));
    S.put(G.kugle, sne, [0, 0.9, 0], [0, 0, 0], 1.0, m);
    S.put(G.kugle, sne, [0, 2.2, 0], [0, 0, 0], 0.72, m);
    S.put(G.kugle, sne, [0, 3.2, 0], [0, 0, 0], 0.52, m);
    for (const s of [-1, 1]) S.put(G.kugle, kul, [s * 0.18, 3.35, 0.45], [0, 0, 0], 0.07, m);
    S.put(G.kegle, gulerod, [0, 3.2, 0.62], [Math.PI / 2, 0, 0], [0.09, 0.4, 0.09], m);
    S.put(G.cyl, hue, [0, 3.72, 0], [0, 0, 0], [0.4, 0.25, 0.4], m);
    S.put(G.kugle, sne, [0, 3.95, 0], [0, 0, 0], 0.13, m);
  }
  function fjernt(S, cx, cz, bund, r) {                   // snebjerge (hvide foroven, blålige forneden)
    for (let i = 0; i < 20; i++) {
      const a = r() * 6.28, d = 240 + r() * 240, s = 40 + r() * 60, h = s * (1 + r() * 0.6);
      const g = new THREE.ConeGeometry(s, h, 22, 8), p = g.attributes.position, farver = [];
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k) / h + 0.5, x = p.getX(k), z = p.getZ(k), n = 1 + 0.18 * Math.sin(x * 0.2 + i) * Math.sin(z * 0.23 + y * 5);
        p.setX(k, x * n); p.setZ(k, z * n);
        const hvid = y > 0.55 + 0.1 * Math.sin(x * 0.3 + z * 0.2) ? 1 : 0;
        farver.push(hvid ? 0.95 : 0.45, hvid ? 0.97 : 0.58, hvid ? 1 : 0.72);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(farver, 3));
      g.computeVertexNormals();
      S.put(g, bjerg, [cx + Math.cos(a) * d, bund + h / 2 - 5, cz + Math.sin(a) * d], [0, r() * 6, 0], 1);
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28, d = 30 + r() * 170;
      flage(S, cx + Math.cos(a) * d, bund, cz + Math.sin(a) * d, r, 0.6 + r() * 1.4);
    }
  }
  function pude() {                                      // en stor snebold
    const g = new THREE.Group(), b = kopi("pude_is");
    if (b) { g.add(b); return g; }
    const m = new THREE.Mesh(knold(9, 0.06, 16), sne);
    m.scale.setScalar(0.7); m.position.y = 0.6;
    g.add(m);
    return g;
  }
  return {
    himmel: { top: "#5a9ee8", horisont: "#e6f4ff", bund: "#f4faff", sol: [0.4, 0.4, -0.8], solFarve: "#fffaf0" },
    tåge: [70, 460], hemi: ["#eef8ff", "#a8c8e0", 1.05], sollys: ["#fffaf2", 2.4],
    under: { type: "vand", y: -14, farve: "#155f86" }, underlag: "is", musik: "is",
    top: fys("#ffffff", { map: ist.map, normalMap: ist.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    side: fys("#ffffff", { map: side.map, normalMap: side.normalMap, roughness: 0.25, emissive: "#1d6fa8", emissiveIntensity: 0.15 }),
    topL: 5, sideL: 5, tyk: 1.1, bund: 0.9,
    rækværk: {
      afstand: 2.6,
      stolpe: (S, p, a) => { S.put(new THREE.CylinderGeometry(0.1, 0.12, 0.7, 6), krystal, [p.x, p.y + 0.35, p.z], [0, a, 0], 1); S.put(new THREE.ConeGeometry(0.12, 0.25, 6), krystal, [p.x, p.y + 0.82, p.z], [0, a, 0], 1); },
      rør: [{ h: 0.62, r: 0.065, mat: krystal }],
    },
    pynt: [granTræ, isKrystal, granTræ, snemand], fjernt, pude, luft: "sne",
    balloner: ["#8fd8ff", "#ffffff", "#c6a2ff", "#5ab0ff", "#ffffff"],
  };
}

// ---------- JUNGLEN ----------
function jungle() {
  const pl = tex("planker", T.planker), bj = tex("bjælke", T.bjælke);
  const stamme = std("#8a6a44", { roughness: 0.95 }), blad = [std("#2f8f2e", { roughness: 0.7, side: THREE.DoubleSide }), std("#4caf3a", { roughness: 0.7, side: THREE.DoubleSide })];
  const kokos = std("#5a3a1e", { roughness: 0.9 }), klippe = std("#7d8078", { roughness: 0.95 }), mos = std("#4f8f2e", { roughness: 0.95 });
  const reb = std("#c9a66b", { roughness: 1 }), bambus = std("#a8b54a", { roughness: 0.6 });
  const sand = std("#e8d49a", { roughness: 1 }), mørkgrøn = std("#1f6b2a", { roughness: 0.9 });
  const blomstMat = [fys("#ff3d7f"), fys("#ffb61f"), fys("#b05bff")];

  function palme(S, x, bund, z, top, r) {
    ø(S, x, bund, z, r, mos, sand);
    const h = top - bund + 2 + r() * 5, bøj = (r() - 0.5) * 5, a = r() * 6.28;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, bund, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)), new THREE.Vector3(1, 1, 1));
    const n = 10;
    let px = 0, py = 0;
    for (let k = 0; k < n; k++) {                         // stammen i led, der bøjer lidt
      const t = (k + 0.5) / n, nx = bøj * t * t, ny = h * t;
      if (!læg(S, "palmeled", [nx, ny - h / n * 0.5, 0], [0, 0, -bøj * 2 * t / h], [0.4 - t * 0.12, h / n * 1.05, 0.4 - t * 0.12], m))
        S.put(G.cylLav, stamme, [nx, ny, 0], [0, 0, -bøj * 2 * t / h], [0.42 - t * 0.12, h / n * 1.05, 0.42 - t * 0.12], m);
      px = nx; py = ny;
    }
    if (læg(S, "palmekrone", [px, py + 0.4, 0], [0, r() * 6, 0], 0.9 + r() * 0.2, m)) return;   // blade og kokosnødder fra Blender
    for (let k = 0; k < 8; k++) {                         // palmeblade
      const v = k / 8 * Math.PI * 2 + r() * 0.3;
      const bm = new THREE.Matrix4().compose(new THREE.Vector3(px, py + 0.4, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, v, 0)), new THREE.Vector3(1, 1, 1)).premultiply(m);
      for (let s = 0; s < 4; s++) S.put(G.kugle, blad[k % 2], [1.0 + s * 1.05, -0.2 - s * s * 0.18, 0], [0, 0, -0.25 - s * 0.18], [0.75, 0.05, 0.42 - s * 0.05], bm);
    }
    for (let k = 0; k < 3; k++) S.put(G.kugle, kokos, [px + Math.cos(k * 2) * 0.35, py - 0.05, Math.sin(k * 2) * 0.35], [0, 0, 0], 0.28, m);
  }
  function klippeTop(S, x, bund, z, top, r) {             // en klippe med mos og blomster
    const h = top - bund - 1 + r() * 4, s = 2.5 + r() * 1.5;
    S.put(knold(7, 0.22, 16), klippe, [x, bund + h / 2 - 1, z], [0, r() * 6, 0], [s, h / 2 + 1, s]);
    S.put(knold(8, 0.2, 14), mos, [x, bund + h - 0.4, z], [0, r() * 6, 0], [s * 0.95, 0.9, s * 0.95]);
    for (let k = 0; k < 4; k++) S.put(G.kugle, blomstMat[k % 3], [x + (r() - 0.5) * s, bund + h + 0.2, z + (r() - 0.5) * s], [0, 0, 0], 0.3);
  }
  function busk(S, x, bund, z, top, r) {
    ø(S, x, bund, z, r, mos, sand, 0.9);
    for (let k = 0; k < 6; k++) S.put(knold(k + 3, 0.25), k % 2 ? mørkgrøn : blad[0], [x + (r() - 0.5) * 4, bund + 1 + r() * 2, z + (r() - 0.5) * 4], [0, r() * 6, 0], 1.5 + r() * 1.5);
    palme(S, x + 1, bund, z + 1, top - 2, r);
  }
  function fjernt(S, cx, cz, bund, r) {                   // grønne junglebjerge
    for (let i = 0; i < 24; i++) {
      const a = r() * 6.28, d = 220 + r() * 260, s = 35 + r() * 55;
      S.put(knold(i % 6 + 1, 0.2, 20), i % 2 ? mørkgrøn : blad[0], [cx + Math.cos(a) * d, bund - s * 0.2, cz + Math.sin(a) * d], [0, r() * 6, 0], [s, s * (0.6 + r() * 0.5), s * 0.9]);
    }
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28, d = 80 + r() * 110;
      S.put(knold(i % 4 + 2, 0.25, 16), klippe, [cx + Math.cos(a) * d, bund + 2, cz + Math.sin(a) * d], [0, r() * 6, 0], [5 + r() * 5, 6 + r() * 12, 5 + r() * 5]);
    }
  }
  function pude() {                                      // en mosgroet træstub
    const g = new THREE.Group(), b = kopi("pude_jungle");
    if (b) { g.add(b); return g; }
    const s = new THREE.Mesh(G.cyl, stamme); s.scale.set(0.6, 0.8, 0.6); s.position.y = 0.4;
    const t = new THREE.Mesh(G.halvkugle, mos); t.scale.set(0.62, 0.2, 0.62); t.position.y = 0.8;
    g.add(s, t);
    return g;
  }
  return {
    himmel: { top: "#3a8fe0", horisont: "#dff3e6", bund: "#e6f5ea", sol: [-0.5, 0.6, -0.6], solFarve: "#fff0c8" },
    tåge: [60, 420], hemi: ["#e8fff0", "#3d7a3a", 0.95], sollys: ["#fff0d0", 2.6],
    under: { type: "vand", y: -12, farve: "#1b9486" }, underlag: "træ", musik: "jungle",
    top: std("#ffffff", { map: pl.map, normalMap: pl.normalMap, roughness: 0.85 }),
    side: std("#ffffff", { map: bj.map, normalMap: bj.normalMap, roughness: 0.9 }),
    topL: 4, topBredde: false, sideL: 4, tyk: 0.35, bund: 1,
    rækværk: {
      afstand: 2.4, hæng: 0.18,
      stolpe: (S, p, a) => { S.put(G.cylLav, bambus, [p.x, p.y + 0.45, p.z], [0, a, 0], [0.08, 0.9, 0.08]); S.put(G.cylLav, reb, [p.x, p.y + 0.72, p.z], [0, a, 0], [0.1, 0.06, 0.1]); },
      rør: [{ h: 0.72, r: 0.04, mat: reb }],
    },
    pynt: [palme, klippeTop, palme, busk], fjernt, pude, luft: "sommerfugle",
    balloner: ["#ff3d7f", "#ffb61f", "#2fd24a", "#1b9486", "#ffffff"],
  };
}

// ---------- REGNBUEN ----------
function regnbue() {
  const rb = tex("regnbue", T.regnbue), sk = tex("skySide", T.skySide);
  const skyMat = std("#ffffff", { roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.35 });
  const skyLilla = std("#e6dcff", { roughness: 1, emissive: "#b8a8ff", emissiveIntensity: 0.25 });
  const guld = std("#ffd24a", { metalness: 1, roughness: 0.25, emissive: "#ffb000", emissiveIntensity: 0.35 });

  function sky(S, x, bund, z, top, r) {
    const y = top - 4.5 - r() * 7, n = 5 + Math.floor(r() * 4), s = 2 + r() * 1.5;
    for (let k = 0; k < n; k++) {
      S.put(knold(k + 11, 0.1, 16), k % 3 ? skyMat : skyLilla, [x + (k - n / 2) * s * 0.7 + (r() - 0.5), y + r() * s * 0.5, z + (r() - 0.5) * s], [0, 0, 0], s * (0.7 + r() * 0.5));
    }
  }
  function fjernt(S, cx, cz, bund, r) {                   // skybanker langt væk
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28, d = 160 + r() * 300, s = 12 + r() * 26;
      S.put(knold(i % 7 + 1, 0.12, 16), i % 3 ? skyMat : skyLilla, [cx + Math.cos(a) * d, bund + r() * 25, cz + Math.sin(a) * d], [0, r() * 6, 0], [s * 1.6, s * 0.6, s]);
    }
  }
  function pude() {                                      // en blød skypude
    const g = new THREE.Group(), b = kopi("pude_regnbue");
    if (b) { g.add(b); return g; }
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(knold(k + 20, 0.08, 14), skyMat);
      m.scale.setScalar(0.38 + (k === 0 ? 0.15 : 0));
      m.position.set(k === 0 ? 0 : Math.cos(k * 1.57) * 0.4, k === 0 ? 0.55 : 0.35, k === 0 ? 0 : Math.sin(k * 1.57) * 0.4);
      g.add(m);
    }
    return g;
  }
  return {
    himmel: { top: "#2a2470", horisont: "#ffb8d9", bund: "#ffd9ec", sol: [0.2, 0.18, -0.95], solFarve: "#ffd0a0", stjerner: 1 },
    tåge: [80, 520], hemi: ["#ffe6f6", "#9a86ff", 1.1], sollys: ["#ffe2c8", 2.2],
    under: { type: "skyer", y: -12 }, underlag: "regnbue", musik: "regnbue",
    top: fys("#ffffff", { map: rb.map, normalMap: rb.normalMap, roughness: 0.3, clearcoat: 0.8, emissive: "#ffffff", emissiveMap: rb.map, emissiveIntensity: 0.35 }),
    side: std("#ffffff", { map: sk.map, normalMap: sk.normalMap, roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.2 }),
    topL: 3, topBredde: true, sideL: 5, tyk: 0.5, bund: 0.9,
    rækværk: {
      afstand: 2.4,
      stolpe: (S, p, a) => { S.put(G.cylLav, guld, [p.x, p.y + 0.35, p.z], [0, a, 0], [0.04, 0.7, 0.04]); S.put(G.kugle, guld, [p.x, p.y + 0.74, p.z], [0, 0, 0], 0.09); },
      rør: [{ h: 0.68, r: 0.035, mat: guld }],
    },
    pynt: [sky, sky, sky], pyntAfstand: 6.5, fjernt, pude, luft: "glimmer", flyvende: true,
    balloner: ["#ff3b3b", "#ff9a1f", "#ffe23b", "#3ddc55", "#2f9bff", "#b05bff"],
  };
}

const TEMAER = { eng, slik, is: isTema, jungle, regnbue };
export function lavTema(id) { return (TEMAER[id] || eng)(); }
