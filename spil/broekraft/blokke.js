// ===== Blokkene i Broekraft =====
// Tilføj en ny blok: skriv en ny linje i BLOKKE (id = pladsen i listen).
//  tekstur:      navnet på et mønster i MØNSTRE — eller { top, side, bund } med tre forskellige.
//                "uld:#farve" og "blomst:#farve" laver uld/blomster i en valgfri farve.
//  gennemsigtig: man kan se igennem (glas) · kryds: tynd plante man kan gå igennem (blomster)
//  lyser:        altid fuldt oplyst · uknuselig: kan ikke hakkes · skjult: vises ikke i inventaret
//  lyd:          "græs" | "sten" | "træ" | "sand" | "glas" | "uld" | "metal"
// Et nyt mønster er en funktion i MØNSTRE der tegner 16×16 pixels med set(x, y, farve).

import * as THREE from "./three.js";

export const BLOKKE = [
  null,                                                                                   // 0 = luft
  { navn: "Græs", tekstur: { top: "græsTop", side: "græsSide", bund: "jord" }, lyd: "græs" },
  { navn: "Jord", tekstur: "jord", lyd: "græs" },
  { navn: "Sten", tekstur: "sten", lyd: "sten" },
  { navn: "Sand", tekstur: "sand", lyd: "sand" },
  { navn: "Træstamme", tekstur: { top: "stammeTop", side: "stamme", bund: "stammeTop" }, lyd: "træ" },
  { navn: "Blade", tekstur: "blade", lyd: "græs" },
  { navn: "Planker", tekstur: "planker", lyd: "træ" },
  { navn: "Glas", tekstur: "glas", gennemsigtig: true, lyd: "glas" },
  { navn: "Mursten", tekstur: "mursten", lyd: "sten" },
  { navn: "Rød uld", tekstur: "uld:#e03a3a", lyd: "uld" },
  { navn: "Orange uld", tekstur: "uld:#f28a1e", lyd: "uld" },
  { navn: "Gul uld", tekstur: "uld:#f5d02a", lyd: "uld" },
  { navn: "Grøn uld", tekstur: "uld:#4cb748", lyd: "uld" },
  { navn: "Blå uld", tekstur: "uld:#3a6fe0", lyd: "uld" },
  { navn: "Lilla uld", tekstur: "uld:#9b4de0", lyd: "uld" },
  { navn: "Lyserød uld", tekstur: "uld:#f28ac8", lyd: "uld" },
  { navn: "Hvid uld", tekstur: "uld:#f2f2f2", lyd: "uld" },
  { navn: "Regnbue", tekstur: "regnbue", lyd: "glas" },
  { navn: "Guld", tekstur: "guld", lyd: "metal" },
  { navn: "Diamant", tekstur: "diamant", lyd: "glas" },
  { navn: "Lampe", tekstur: "lampe", lyser: true, lyd: "glas" },
  { navn: "Kage", tekstur: { top: "kageTop", side: "kageSide", bund: "kageBund" }, lyd: "uld" },
  { navn: "Græskar", tekstur: { top: "græskarTop", side: "græskarSide", bund: "græskarTop" }, lyd: "træ" },
  { navn: "Rød blomst", tekstur: "blomst:#e8283c", kryds: true, lyd: "græs" },
  { navn: "Gul blomst", tekstur: "blomst:#f7d51d", kryds: true, lyd: "græs" },
  { navn: "Bundsten", tekstur: "bundsten", uknuselig: true, skjult: true, lyd: "sten" },
];

export const ID = {};
BLOKKE.forEach((b, i) => { if (b) ID[b.navn] = i; });

// ---------- Pixel-mønstre (16×16) ----------
const T = 16;
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lys = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
function rng(frø) {
  let a = frø >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const navnFrø = s => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const alle = fn => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) fn(x, y); };
function fyld(set, r, farve, v = 0.2) { const c = hex(farve); alle((x, y) => set(x, y, lys(c, 1 + (r() - 0.5) * v))); }
function prik(set, r, farver, n) { for (let i = 0; i < n; i++) set(Math.floor(r() * T), Math.floor(r() * T), hex(farver[i % farver.length])); }

const MØNSTRE = {
  jord: (set, r) => { fyld(set, r, "#8b5a2b", 0.25); prik(set, r, ["#6b4220", "#a8763f"], 22); },
  græsTop: (set, r) => { fyld(set, r, "#5fb33a", 0.28); prik(set, r, ["#4a9a2c", "#79cc4f"], 26); },
  græsSide: (set, r) => {
    MØNSTRE.jord(set, r);
    const g = hex("#5fb33a");
    for (let x = 0; x < T; x++) {
      const h = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.15 ? 1 : 0);
      for (let y = 0; y < h; y++) set(x, y, lys(g, 1 + (r() - 0.5) * 0.3));
    }
  },
  sten: (set, r) => { fyld(set, r, "#8c8c8c", 0.18); prik(set, r, ["#6f6f6f", "#a3a3a3", "#7a7a7a"], 30); },
  sand: (set, r) => { fyld(set, r, "#e3d59d", 0.12); prik(set, r, ["#d2c386", "#efe4b5"], 20); },
  stamme: (set, r) => { const c = hex("#6b4a2b"); alle((x, y) => set(x, y, lys(c, (x % 4 === 0 ? 0.75 : 1) * (1 + (r() - 0.5) * 0.2)))); },
  stammeTop: (set, r) => alle((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const c = d > 6.5 ? hex("#6b4a2b") : Math.floor(d) % 2 ? hex("#b8905a") : hex("#9c7545");
    set(x, y, lys(c, 1 + (r() - 0.5) * 0.12));
  }),
  blade: (set, r) => { fyld(set, r, "#3f9b35", 0.4); prik(set, r, ["#2d7a26", "#56b54a", "#23661e"], 44); },
  planker: (set, r) => {
    const c = hex("#b8894f"), m = hex("#8a6232");
    alle((x, y) => {
      const søm = x === (Math.floor(y / 4) % 2 ? 3 : 11);
      set(x, y, y % 4 === 3 || søm ? lys(m, 1 + (r() - 0.5) * 0.1) : lys(c, 1 + (r() - 0.5) * 0.14));
    });
  },
  glas: set => alle((x, y) => {
    const kant = x === 0 || y === 0 || x === 15 || y === 15, glans = (x - y === 2 || x - y === 3) && x > 2 && x < 9;
    if (kant) set(x, y, hex("#dff4ff")); else if (glans) set(x, y, hex("#ffffff")); else set(x, y, [200, 230, 255], 0);
  }),
  mursten: (set, r) => {
    const sten = hex("#b5523b"), mørtel = hex("#d4c9bc");
    alle((x, y) => {
      const skel = y % 4 === 3 || x === (Math.floor(y / 4) % 2 ? 0 : 8);
      set(x, y, skel ? lys(mørtel, 1 + (r() - 0.5) * 0.1) : lys(sten, 1 + (r() - 0.5) * 0.22));
    });
  },
  regnbue: (set, r) => {
    const f = ["#e8283c", "#f28a1e", "#f7d51d", "#4cb748", "#3a9ad9", "#3a4fd9", "#9b4de0", "#e84fb0"];
    alle((x, y) => set(x, y, lys(hex(f[Math.floor(y / 2)]), 1 + (r() - 0.5) * 0.1)));
  },
  guld: (set, r) => {
    fyld(set, r, "#f5c542", 0.12);
    alle((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, hex("#c9971e")); });
    prik(set, r, ["#fff3b0", "#ffe27a"], 14);
  },
  diamant: (set, r) => {
    fyld(set, r, "#7fe7f0", 0.14);
    alle((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, hex("#3fb8c4")); });
    prik(set, r, ["#ffffff", "#c8fbff"], 16);
  },
  lampe: (set, r) => alle((x, y) => {
    const kant = x === 0 || y === 0 || x === 15 || y === 15, klat = (x % 5 < 3) && (y % 5 < 3);
    set(x, y, kant ? hex("#c98f2a") : klat ? lys(hex("#fff7c2"), 1 + (r() - 0.5) * 0.05) : lys(hex("#f7c95b"), 1 + (r() - 0.5) * 0.1));
  }),
  kageTop: (set, r) => { fyld(set, r, "#f7f3ee", 0.05); prik(set, r, ["#e03a3a"], 7); },
  kageSide: (set, r) => alle((x, y) => {
    const glasur = y < 3 || (y === 3 && (x * 7) % 5 < 2);
    const c = glasur ? "#f7f3ee" : y === 9 || y === 10 ? "#f5e6c8" : y > 13 ? "#6e4530" : "#8a5a3c";
    set(x, y, lys(hex(c), 1 + (r() - 0.5) * 0.1));
  }),
  kageBund: (set, r) => fyld(set, r, "#6e4530", 0.1),
  græskarTop: (set, r) => alle((x, y) => {
    const stilk = x >= 6 && x <= 9 && y >= 6 && y <= 9;
    set(x, y, stilk ? hex("#5a7a2a") : lys(hex("#e8891c"), (x % 4 === 0 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.12)));
  }),
  græskarSide: (set, r) => alle((x, y) => {
    const øje = y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) && !(y === 4 && (x === 3 || x === 12));
    const mund = (y === 10 && x >= 3 && x <= 12) || (y === 11 && x >= 4 && x <= 11 && x !== 6 && x !== 9);
    set(x, y, øje || mund ? hex("#3a2410") : lys(hex("#e8891c"), (x % 4 === 0 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.12)));
  }),
  bundsten: (set, r) => { fyld(set, r, "#3a3a3a", 0.3); prik(set, r, ["#555555", "#222222"], 40); },
};

function maler(navn) {
  const [type, farve] = navn.split(":");
  if (type === "uld") return (set, r) => {
    const c = hex(farve);
    alle((x, y) => set(x, y, lys(c, ((x + y) % 4 === 0 ? 0.9 : 1) * (1 + (r() - 0.5) * 0.1))));
  };
  if (type === "blomst") return (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 7; y < T; y++) { set(7, y, hex("#3f9b35")); set(8, y, hex("#2d7a26")); }
    for (const [x, y] of [[6, 11], [5, 12], [9, 12], [10, 11]]) set(x, y, hex("#3f9b35"));
    alle((x, y) => { if ((x - 7.5) ** 2 + (y - 4.5) ** 2 < 11) set(x, y, lys(hex(farve), 1 + (r() - 0.5) * 0.25)); });
    for (const [x, y] of [[7, 4], [8, 4], [7, 5], [8, 5]]) set(x, y, hex("#fff3a0"));
  };
  return MØNSTRE[type] || MØNSTRE.jord;
}

// ---------- Tekstur-atlas, ikoner og små blok-modeller ----------
const lin = l => Math.pow(l, 2.2);                 // lysstyrke → lineær farve (så skyggerne ser rigtige ud)

export function lavAtlas() {
  const navne = [];
  const brug = n => { if (!navne.includes(n)) navne.push(n); return navne.indexOf(n); };
  const tab = BLOKKE.map(b => {
    if (!b) return null;
    const t = typeof b.tekstur === "string" ? { top: b.tekstur, side: b.tekstur, bund: b.tekstur } : b.tekstur;
    return { top: brug(t.top), side: brug(t.side), bund: brug(t.bund) };
  });
  const KOL = 8, W = KOL * T, H = Math.ceil(navne.length / KOL) * T;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g2 = c.getContext("2d"), img = g2.createImageData(W, H);
  navne.forEach((n, i) => {
    const ox = (i % KOL) * T, oy = Math.floor(i / KOL) * T;
    maler(n)((x, y, col, a = 255) => {
      const k = ((oy + y) * W + ox + x) * 4;
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = a;
    }, rng(navnFrø(n)));
  });
  g2.putImageData(img, 0, 0);

  const tekstur = new THREE.CanvasTexture(c);
  tekstur.magFilter = tekstur.minFilter = THREE.NearestFilter;
  tekstur.generateMipmaps = false;
  tekstur.colorSpace = THREE.SRGBColorSpace;

  const e = 0.0005, felt = i => [(i % KOL) * T, Math.floor(i / KOL) * T];
  const uvAf = i => { const [ox, oy] = felt(i); return [ox / W + e, 1 - (oy + T) / H + e, (ox + T) / W - e, 1 - oy / H - e]; };
  const uvTab = tab.map(t => t && { top: uvAf(t.top), side: uvAf(t.side), bund: uvAf(t.bund) });

  // gennemsnitsfarve pr. blok (til småstykker når en blok går i stykker)
  const farver = tab.map(t => {
    if (!t) return null;
    const [ox, oy] = felt(t.side);
    let r = 0, g = 0, b = 0, n = 0;
    alle((x, y) => { const k = ((oy + y) * W + ox + x) * 4; if (img.data[k + 3] > 128) { r += img.data[k]; g += img.data[k + 1]; b += img.data[k + 2]; n++; } });
    return new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
  });

  // Ikon til hotbaren: en lille skrå terning tegnet med de rigtige pixels
  const ikoner = {};
  function ikon(id) {
    if (ikoner[id]) return ikoner[id];
    const k = document.createElement("canvas"); k.width = k.height = 64;
    const g = k.getContext("2d");
    g.imageSmoothingEnabled = false;
    const t = tab[id];
    if (BLOKKE[id].kryds) {
      const [sx, sy] = felt(t.side);
      g.drawImage(c, sx, sy, T, T, 8, 8, 48, 48);
    } else {
      const flade = (i, a, b, cc, d, ee, f, skygge) => {
        const [sx, sy] = felt(i);
        g.setTransform(a, b, cc, d, ee, f);
        g.drawImage(c, sx, sy, T, T, 0, 0, T, T);
        if (skygge) { g.fillStyle = `rgba(0,0,0,${skygge})`; g.fillRect(0, 0, T, T); }
      };
      flade(t.top, 26 / T, 13 / T, -26 / T, 13 / T, 32, 6, 0);
      flade(t.side, 26 / T, 13 / T, 0, 29 / T, 6, 19, BLOKKE[id].lyser ? 0 : 0.2);
      flade(t.side, 26 / T, -13 / T, 0, 29 / T, 32, 32, BLOKKE[id].lyser ? 0 : 0.38);
    }
    return (ikoner[id] = k.toDataURL());
  }

  // En lille 3D-terning af en blok (til hånden)
  function blokMesh(id) {
    const b = BLOKKE[id];
    if (b.kryds) {
      const geo = new THREE.PlaneGeometry(1, 1), uv = geo.attributes.uv, [u0, v0, u1, v1] = uvTab[id].side;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tekstur, alphaTest: 0.5, side: THREE.DoubleSide }));
    }
    const geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.attributes.uv, lysF = [0.8, 0.8, 1, 0.55, 0.9, 0.7];
    const sider = ["side", "side", "top", "bund", "side", "side"], col = [];
    for (let f = 0; f < 6; f++) {
      const [u0, v0, u1, v1] = uvTab[id][sider[f]];
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k, l = lin(b.lyser ? 1 : lysF[f]);
        uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
        col.push(l, l, l);
      }
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tekstur, vertexColors: true, alphaTest: 0.5 }));
  }

  // Et felt fra atlasset som billede (bruges til baggrunde)
  function feltBillede(navn) {
    const i = navne.indexOf(navn), [sx, sy] = felt(Math.max(0, i));
    const k = document.createElement("canvas"); k.width = k.height = T;
    k.getContext("2d").drawImage(c, sx, sy, T, T, 0, 0, T, T);
    return k.toDataURL();
  }

  return { tekstur, uv: (id, side) => uvTab[id][side], farve: id => farver[id], ikon, blokMesh, feltBillede, lin };
}
