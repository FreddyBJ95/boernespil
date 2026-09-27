// ===== Blokkene i Broekraft =====
// Tilføj en ny blok: skriv en ny linje i BLOKKE (id = pladsen i listen).
//  tekstur:      navnet på et mønster i MØNSTRE — eller { top, side, bund } med tre forskellige.
//                "uld:#farve", "blomst:#farve", "prikker:#farve:#prik" og "lilleSvamp:#farve" kan få valgfri farver.
//  gennemsigtig: man kan se igennem (glas) · kryds: tynd plante man kan gå igennem (blomster)
//  lyser:        altid fuldt oplyst · uknuselig: kan ikke hakkes · skjult: vises ikke i inventaret
//  hopper:       man hopper højt når man lander på den (som en trampolin)
//  tnt:          kan tændes med hammeren og sprænger så et hul (se spil.js)
//  væske:        "vand" eller "lava" · niveau: 0 = kilde, højere = tyndere strøm
//  ild:          flammer styret af simulering.js
//  Nye blokke skal altid tilføjes NEDERST, så gemte verdener stadig passer.
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
  // --- Zombieverdenen ---
  { navn: "Mørkt græs", tekstur: { top: "mørkGræsTop", side: "mørkGræsSide", bund: "jord" }, lyd: "græs" },
  { navn: "Gravsten", tekstur: "gravsten", lyd: "sten" },
  { navn: "Død stamme", tekstur: { top: "stammeTop", side: "dødStamme", bund: "stammeTop" }, lyd: "træ" },
  { navn: "Lygtemand", tekstur: { top: "græskarTop", side: "lygtemand", bund: "græskarTop" }, lyser: true, lyd: "træ" },
  { navn: "Spindelvæv", tekstur: "spindelvæv", kryds: true, lyd: "uld" },
  // --- Svampeverdenen ---
  { navn: "Svampejord", tekstur: { top: "svampejordTop", side: "svampejordSide", bund: "jord" }, lyd: "græs" },
  { navn: "Rød svamp", tekstur: "prikker:#d9232e:#ffffff", hopper: true, lyd: "uld" },
  { navn: "Blå svamp", tekstur: "prikker:#3a7be0:#ffe066", hopper: true, lyd: "uld" },
  { navn: "Svampestok", tekstur: { top: "svampestokTop", side: "svampestok", bund: "svampestokTop" }, lyd: "træ" },
  { navn: "Lille svamp", tekstur: "lilleSvamp:#e8283c", kryds: true, lyd: "græs" },
  { navn: "Glødesvamp", tekstur: "lilleSvamp:#5ff0ff", kryds: true, lyser: true, lyd: "glas" },
  // --- Ostemånen ---
  { navn: "Ost", tekstur: "ost", lyd: "uld" },
  { navn: "Månesten", tekstur: "månesten", lyd: "sten" },
  { navn: "Stjerneblok", tekstur: "stjerner", lyser: true, lyd: "glas" },
  { navn: "Krystal", tekstur: "krystal", kryds: true, lyser: true, lyd: "glas" },
  // --- TNT ---
  { navn: "TNT", tekstur: { top: "tntTop", side: "tntSide", bund: "tntBund" }, tnt: true, lyd: "græs" },
  // --- Vand, lava og ild (Claude tilføjer visningen) ---
  { navn: "Vand", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 0, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Vand 1", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 1, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Vand 2", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 2, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Vand 3", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 3, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Vand 4", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 4, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Vand 5", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 5, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Vand 6", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 6, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Vand 7", tekstur: "uld:#3a6fe0", væske: "vand", niveau: 7, gennemsigtig: true, skjult: true, lyd: "sten" },
  { navn: "Lava", tekstur: "uld:#f28a1e", væske: "lava", niveau: 0, lyser: true, skjult: true, lyd: "sten" },
  { navn: "Lava 1", tekstur: "uld:#f28a1e", væske: "lava", niveau: 1, lyser: true, skjult: true, lyd: "sten" },
  { navn: "Lava 2", tekstur: "uld:#f28a1e", væske: "lava", niveau: 2, lyser: true, skjult: true, lyd: "sten" },
  { navn: "Lava 3", tekstur: "uld:#f28a1e", væske: "lava", niveau: 3, lyser: true, skjult: true, lyd: "sten" },
  { navn: "Ild", tekstur: "blomst:#f28a1e", ild: true, kryds: true, lyser: true, skjult: true, lyd: "græs" },
  { navn: "Obsidian", tekstur: "bundsten", skjult: true, lyd: "sten" },
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

  // --- Zombieverdenen ---
  mørkGræsTop: (set, r) => { fyld(set, r, "#2f5d4a", 0.3); prik(set, r, ["#6b3f8c", "#3f7a5a", "#24483a"], 30); },
  mørkGræsSide: (set, r) => {
    fyld(set, r, "#5a3a22", 0.25); prik(set, r, ["#442a18", "#6e4a2c"], 20);
    const g = hex("#2f5d4a");
    for (let x = 0; x < T; x++) { const h = 3 + (r() < 0.5 ? 1 : 0); for (let y = 0; y < h; y++) set(x, y, lys(g, 1 + (r() - 0.5) * 0.3)); }
  },
  gravsten: (set, r) => {
    fyld(set, r, "#9a9aa2", 0.15);
    alle((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) set(x, y, hex("#6f6f78")); });
    for (let y = 3; y <= 12; y++) { set(7, y, hex("#55555c")); set(8, y, hex("#55555c")); }
    for (let x = 4; x <= 11; x++) { set(x, 5, hex("#55555c")); set(x, 6, hex("#55555c")); }
    for (let i = 0; i < 10; i++) set(Math.floor(r() * T), 13 + Math.floor(r() * 3), hex("#4f7a3a"));
  },
  dødStamme: (set, r) => { const c = hex("#6e6259"); alle((x, y) => set(x, y, lys(c, (x % 5 === 0 ? 0.72 : 1) * (1 + (r() - 0.5) * 0.18)))); },
  lygtemand: (set, r) => alle((x, y) => {
    const øje = y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) && !(y === 4 && (x === 3 || x === 12));
    const mund = (y === 10 && x >= 3 && x <= 12) || (y === 11 && x >= 4 && x <= 11 && x !== 6 && x !== 9);
    set(x, y, øje || mund ? lys(hex("#ffe066"), 1 + (r() - 0.5) * 0.15) : lys(hex("#e8891c"), (x % 4 === 0 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.12)));
  }),
  spindelvæv: set => alle((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const tråd = x === y || x + y === 15 || x === 7 || y === 8 || Math.abs(d - 3.5) < 0.5 || Math.abs(d - 6.5) < 0.5;
    set(x, y, [240, 240, 245], tråd ? 255 : 0);
  }),

  // --- Svampeverdenen ---
  svampejordTop: (set, r) => { fyld(set, r, "#8a6f9e", 0.25); prik(set, r, ["#b89ad0", "#6a5280", "#c9b0e0"], 30); },
  svampejordSide: (set, r) => {
    MØNSTRE.jord(set, r);
    const g = hex("#8a6f9e");
    for (let x = 0; x < T; x++) { const h = 2 + (r() < 0.5 ? 1 : 0); for (let y = 0; y < h; y++) set(x, y, lys(g, 1 + (r() - 0.5) * 0.3)); }
  },
  svampestok: (set, r) => { const c = hex("#efe6d2"); alle((x, y) => set(x, y, lys(c, (x % 3 === 0 ? 0.93 : 1) * (1 + (r() - 0.5) * 0.06)))); },
  svampestokTop: (set, r) => alle((x, y) => set(x, y, lys(hex(Math.hypot(x - 7.5, y - 7.5) < 3 ? "#d9cdb0" : "#efe6d2"), 1 + (r() - 0.5) * 0.06))),

  // --- Ostemånen ---
  ost: (set, r) => {
    fyld(set, r, "#ffcf3f", 0.08);
    const huller = [[4, 4, 2.2], [11, 6, 1.6], [6, 11, 1.8], [12, 12, 1.3], [1, 9, 1]];
    alle((x, y) => { for (const [hx, hy, hr] of huller) { const d = Math.hypot(x - hx, y - hy); if (d < hr) set(x, y, hex(d < hr - 0.8 ? "#c98f1e" : "#e0a82a")); } });
  },
  månesten: (set, r) => {
    fyld(set, r, "#a9a9b8", 0.18);
    for (const [hx, hy, hr] of [[5, 5, 2.5], [11, 11, 2], [12, 3, 1.3]]) alle((x, y) => {
      const d = Math.hypot(x - hx, y - hy);
      if (d < hr - 0.7) set(x, y, hex("#8a8a99")); else if (d < hr + 0.3) set(x, y, hex("#c8c8d4"));
    });
  },
  stjerner: (set, r) => {
    fyld(set, r, "#141438", 0.25); prik(set, r, ["#ffffff", "#fff3a0", "#b0c8ff"], 14);
    for (const [cx, cy] of [[4, 11], [11, 4]]) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + dx, cy + dy, hex("#ffffff"));
  },
  tntSide: (set, r) => {
    alle((x, y) => set(x, y, lys(hex("#d62d20"), (x % 4 === 1 ? 0.8 : 1) * (y < 2 || y > 13 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.1))));
    for (let x = 0; x < T; x++) for (let y = 5; y <= 10; y++) set(x, y, hex(y === 5 || y === 10 ? "#c8c8c8" : "#f2f2f2"));
    const bogstaver = { T: ["###", ".#.", ".#.", ".#."], N: ["#..#", "##.#", "#.##", "#..#"] };
    let x0 = 2;
    for (const b of "TNT") {
      bogstaver[b].forEach((række, dy) => [...række].forEach((c, dx) => { if (c === "#") set(x0 + dx, 6 + dy, hex("#1a1a1a")); }));
      x0 += bogstaver[b][0].length + 1;
    }
  },
  tntTop: (set, r) => {
    fyld(set, r, "#9a9a9a", 0.15);
    alle((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, hex("#d62d20")); });
    alle((x, y) => { if (x >= 6 && x <= 9 && y >= 6 && y <= 9) set(x, y, hex(x >= 7 && x <= 8 && y >= 7 && y <= 8 ? "#1a1a1a" : "#555555")); });
  },
  tntBund: (set, r) => fyld(set, r, "#8a8a8a", 0.15),
  krystal: set => alle((x, y) => {
    const a = y >= 4 && Math.abs(x - 4.5) <= (y - 4) * 0.28, b = y >= 7 && Math.abs(x - 11) <= (y - 7) * 0.3, c = y >= 1 && Math.abs(x - 7.5) <= (y - 1) * 0.2;
    if (c) set(x, y, hex(x < 7.5 ? "#e2d0ff" : "#c9a8ff")); else if (a || b) set(x, y, hex(x % 2 ? "#b98cff" : "#9b6ae8")); else set(x, y, [0, 0, 0], 0);
  }),
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
  if (type === "prikker") return (set, r) => {
    const prikFarve = navn.split(":")[2];
    fyld(set, r, farve, 0.12);
    const prikker = [[3, 3], [10, 2], [6, 8], [13, 9], [2, 12], [9, 13]];
    alle((x, y) => { for (const [px, py] of prikker) if ((x - px) ** 2 + (y - py) ** 2 < 2.6) set(x, y, lys(hex(prikFarve), 1 + (r() - 0.5) * 0.08)); });
  };
  if (type === "lilleSvamp") return (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 9; y < T; y++) { set(7, y, hex("#efe6d2")); set(8, y, hex("#d9cdb0")); }
    alle((x, y) => { if (y <= 9 && (x - 7.5) ** 2 / 30 + (y - 9.5) ** 2 / 26 < 1) set(x, y, lys(hex(farve), 1 + (r() - 0.5) * 0.15)); });
    for (const [x, y] of [[5, 6], [9, 5], [11, 8], [7, 7]]) set(x, y, hex("#ffffff"));
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
