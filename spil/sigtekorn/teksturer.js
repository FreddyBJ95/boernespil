// ===== Teksturer tegnet med kode: sandsten, puds, sand, fliser, trækasser, blå døre og metal =====
// Alt tegnes på et lærred (canvas) én gang, når spillet starter. Teksturerne gentages i verdens-meter
// (se bane.js), så murstenene har samme størrelse overalt. Samme billede bruges også som "bump",
// så fugerne ligger dybere end stenene og fanger lyset fra solen.

import * as THREE from "./three.js";

function rng(s) {
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function lærred(n, tegn, frø = 1) {
  const c = document.createElement("canvas"); c.width = c.height = n;
  tegn(c.getContext("2d"), n, rng(frø));
  return c;
}
function tekstur(c, farve = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (farve) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;
// Lidt støj over hele billedet (sandkorn, ru overflade)
function korn(g, n, r, styrke) {
  const d = g.getImageData(0, 0, n, n), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const v = (r() - 0.5) * styrke; p[i] += v; p[i + 1] += v; p[i + 2] += v * 0.9; }
  g.putImageData(d, 0, 0);
}
// Bløde pletter (snavs, falmet maling)
function pletter(g, n, r, antal, farve, maks) {
  for (let i = 0; i < antal; i++) {
    const x = r() * n, y = r() * n, rad = (0.2 + r() * 0.8) * maks;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, farve); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    for (const [dx, dy] of [[0, 0], [-n, 0], [n, 0], [0, -n], [0, n]]) { g.save(); g.translate(dx, dy); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  }
}
// En tynd revne, der slynger sig
function revne(g, r, x, y, l) {
  g.strokeStyle = "rgba(60,40,20,0.45)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y);
  let v = r() * Math.PI * 2;
  for (let i = 0; i < l; i++) { v += (r() - 0.5) * 1.2; x += Math.cos(v) * 4; y += Math.sin(v) * 4; g.lineTo(x, y); }
  g.stroke();
}

// Sandsten: rækker af store blokke med fuger, hver blok i sin egen nuance
function sandsten(g, n, r) {
  g.fillStyle = "#b39466"; g.fillRect(0, 0, n, n);
  const rækker = 8, rh = n / rækker;
  for (let j = 0; j < rækker; j++) {
    let x = -r() * 120;
    while (x < n) {
      const w = 90 + r() * 90, l = 62 + r() * 10, h = 34 + r() * 6;
      g.fillStyle = hsl(h, 38 + r() * 12, l);
      const farve = g.fillStyle;
      for (const dx of [-n, 0, n]) {                                  // blokke, der går ud over kanten, fortsætter på den anden side
        g.fillStyle = farve; g.fillRect(x + 2 + dx, j * rh + 2, w - 4, rh - 4);
        g.fillStyle = "rgba(255,240,210,0.25)"; g.fillRect(x + 2 + dx, j * rh + 2, w - 4, 3);
        g.fillStyle = "rgba(80,50,20,0.18)"; g.fillRect(x + 2 + dx, j * rh + rh - 5, w - 4, 3);
      }
      if (r() < 0.3) { g.fillStyle = "rgba(90,60,30,0.25)"; g.fillRect(x + w * r(), j * rh + 2, 8 + r() * 10, 6 + r() * 8); }   // en flækket kant
      x += w;
    }
  }
  pletter(g, n, r, 18, "rgba(120,80,40,0.10)", 90);
  pletter(g, n, r, 10, "rgba(255,245,220,0.10)", 70);
  korn(g, n, r, 26);
}
// Puds: glat og lys, med falmede pletter, lapper og revner
function puds(g, n, r) {
  g.fillStyle = "#dcc297"; g.fillRect(0, 0, n, n);
  pletter(g, n, r, 30, "rgba(170,130,80,0.16)", 110);
  pletter(g, n, r, 20, "rgba(255,248,230,0.18)", 90);
  for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(${150 + r() * 40},${115 + r() * 30},${75 + r() * 20},0.22)`; g.fillRect(r() * n, r() * n, 40 + r() * 80, 30 + r() * 50); }
  for (let i = 0; i < 6; i++) revne(g, r, r() * n, r() * n, 8 + r() * 14);
  korn(g, n, r, 18);
}
// Sand på jorden: fint korn, små krusninger af vind og et par sten
function sand(g, n, r) {
  g.fillStyle = "#cfac74"; g.fillRect(0, 0, n, n);
  pletter(g, n, r, 40, "rgba(150,110,60,0.14)", 80);
  pletter(g, n, r, 30, "rgba(250,230,190,0.14)", 70);
  g.strokeStyle = "rgba(140,100,55,0.10)"; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) { const y = r() * n; g.beginPath(); for (let x = -10; x <= n + 10; x += 16) g.lineTo(x, y + Math.sin(x / 40 + i) * 6); g.stroke(); }
  for (let i = 0; i < 70; i++) { g.fillStyle = hsl(30, 20 + r() * 20, 40 + r() * 30); g.beginPath(); g.arc(r() * n, r() * n, 1 + r() * 2.5, 0, 7); g.fill(); }
  korn(g, n, r, 30);
}
// Fliser på pladserne: store, slidte stenfliser med fuger
function fliser(g, n, r) {
  g.fillStyle = "#8a6e4a"; g.fillRect(0, 0, n, n);
  const k = 4, s = n / k;
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
    g.fillStyle = hsl(32 + r() * 6, 38 + r() * 12, 60 + r() * 9);
    g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    const gr = g.createRadialGradient(i * s + s / 2, j * s + s / 2, s * 0.1, i * s + s / 2, j * s + s / 2, s * 0.7);
    gr.addColorStop(0, "rgba(255,250,235,0.12)"); gr.addColorStop(1, "rgba(80,60,30,0.18)");
    g.fillStyle = gr; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
  }
  pletter(g, n, r, 14, "rgba(90,70,40,0.12)", 80);
  korn(g, n, r, 22);
}
// Trækasse: brædder på langs, en mørkere ramme, et kryds og søm
function trækasse(g, n, r) {
  g.fillStyle = "#9c6b37"; g.fillRect(0, 0, n, n);
  const b = n / 6;
  for (let i = 0; i < 6; i++) {
    g.fillStyle = hsl(28, 45 + r() * 10, 36 + r() * 8); g.fillRect(0, i * b + 1, n, b - 2);
    g.strokeStyle = "rgba(60,35,15,0.25)"; g.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const y = i * b + 4 + r() * (b - 8); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= n; x += 20) g.lineTo(x, y + Math.sin(x / 30 + k) * 1.5); g.stroke(); }
  }
  const ramme = n * 0.1;
  g.fillStyle = "#6e4721";
  g.fillRect(0, 0, n, ramme); g.fillRect(0, n - ramme, n, ramme); g.fillRect(0, 0, ramme, n); g.fillRect(n - ramme, 0, ramme, n);
  g.save(); g.translate(n / 2, n / 2);
  for (const v of [Math.PI / 4, -Math.PI / 4]) { g.save(); g.rotate(v); g.fillRect(-n * 0.7, -ramme * 0.45, n * 1.4, ramme * 0.9); g.restore(); }
  g.restore();
  g.fillStyle = "#2a2a2a";
  for (const [x, y] of [[0.05, 0.05], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95], [0.5, 0.05], [0.5, 0.95], [0.05, 0.5], [0.95, 0.5]]) { g.beginPath(); g.arc(x * n, y * n, 2.5, 0, 7); g.fill(); }
  korn(g, n, r, 20);
}
// Blå metaldør med fyldninger, rust og ridser
function dør(g, n, r) {
  g.fillStyle = "#3d6d8c"; g.fillRect(0, 0, n, n);
  g.strokeStyle = "rgba(20,40,60,0.6)"; g.lineWidth = 6;
  g.strokeRect(n * 0.12, n * 0.08, n * 0.76, n * 0.38); g.strokeRect(n * 0.12, n * 0.54, n * 0.76, n * 0.38);
  pletter(g, n, r, 16, "rgba(140,80,40,0.35)", 30);
  g.strokeStyle = "rgba(200,220,230,0.25)"; g.lineWidth = 1;
  for (let i = 0; i < 30; i++) { const x = r() * n, y = r() * n; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 6); g.stroke(); }
  korn(g, n, r, 18);
}
// Metal (tønder og bjælker): grønligt gråt med rust
function metal(g, n, r) {
  g.fillStyle = "#5c6650"; g.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += n / 4) { g.fillStyle = "rgba(30,35,25,0.35)"; g.fillRect(0, y, n, 5); }
  pletter(g, n, r, 20, "rgba(130,70,30,0.35)", 30);
  korn(g, n, r, 20);
}
// Et skudhul: mørkt i midten, en lys ring af knust sten og små splinter
function skudhul(g, n) {
  const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, "rgba(10,8,6,1)"); gr.addColorStop(0.18, "rgba(25,20,15,0.95)"); gr.addColorStop(0.32, "rgba(90,75,55,0.6)");
  gr.addColorStop(0.55, "rgba(60,50,40,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
}
// Mundingsglimt: en lys stjerne (lægges oven på med "additiv" farve)
function glimt(g, n, r) {
  const m = n / 2;
  const gr = g.createRadialGradient(m, m, 0, m, m, m);
  gr.addColorStop(0, "rgba(255,255,230,1)"); gr.addColorStop(0.25, "rgba(255,210,120,0.85)"); gr.addColorStop(1, "rgba(255,120,30,0)");
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  g.translate(m, m); g.fillStyle = "rgba(255,230,160,0.8)";
  for (let i = 0; i < 7; i++) { g.rotate(Math.PI * 2 / 7 + r() * 0.3); g.beginPath(); g.moveTo(0, -3); g.lineTo(m * (0.6 + r() * 0.4), 0); g.lineTo(0, 3); g.fill(); }
}
// Røg og støv: en blød, rund sky
function røg(g, n) {
  const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
}
// Palmeblad: et langt blad med en midterribbe (gennemsigtigt omkring)
function palmeblad(g, n, r) {
  g.clearRect(0, 0, n, n);
  g.fillStyle = "#4e7a2c";
  for (let i = 0; i < 28; i++) {
    const t = i / 28, y = t * n, l = Math.sin(t * Math.PI) * n * 0.48;
    g.fillStyle = hsl(95 + r() * 15, 45, 26 + r() * 10);
    g.beginPath(); g.moveTo(n / 2, y); g.lineTo(n / 2 - l, y + n * 0.05); g.lineTo(n / 2 - l * 0.9, y + n * 0.07); g.lineTo(n / 2, y + n * 0.03);
    g.lineTo(n / 2 + l * 0.9, y + n * 0.07); g.lineTo(n / 2 + l, y + n * 0.05); g.closePath(); g.fill();
  }
  g.fillStyle = "#6b5a2a"; g.fillRect(n / 2 - 2, 0, 4, n);
}
// Palmestamme: ringe af bark
function bark(g, n, r) {
  g.fillStyle = "#7a6040"; g.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += 12) { g.fillStyle = hsl(30, 30, 25 + r() * 10); g.fillRect(0, y, n, 4); g.fillStyle = "rgba(255,230,180,0.15)"; g.fillRect(0, y + 4, n, 2); }
  korn(g, n, r, 24);
}

// Alle teksturer i ét opslag (lavet én gang)
export function lavTeksturer() {
  const t = {};
  for (const [navn, fn, n, frø] of [["sandsten", sandsten, 512, 3], ["puds", puds, 512, 5], ["sand", sand, 512, 7], ["fliser", fliser, 512, 11],
    ["trækasse", trækasse, 256, 13], ["dør", dør, 256, 17], ["metal", metal, 256, 19], ["bark", bark, 128, 23]]) t[navn] = tekstur(lærred(n, fn, frø));
  t.palmeblad = tekstur(lærred(256, palmeblad, 29));
  t.skudhul = tekstur(lærred(64, skudhul), true);
  t.glimt = tekstur(lærred(128, glimt, 31));
  t.røg = tekstur(lærred(64, røg), true);
  return t;
}
