// ===== Teksturer til Rulle Rasmus — alt tegnes med kode på et lærred (ingen billedfiler) =====
// Hver bane-overflade får et farvebillede (map) og et "bump"-billede (normalMap), så lyset
// falder på græsstrå, planker, krymmel og revner i isen, som om de var rigtige.

import * as THREE from "./three.js";

// Tilfældige tal, der bliver ens hver gang (så banerne ser ens ud hver gang)
export function frø(n = 1) {
  return () => {
    n = (n + 0x6D2B79F5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lærred(b, h = b) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  return [c, c.getContext("2d")];
}

// Tegn noget, så det gentager sig pænt ved kanterne (tegnes også ovre på den anden side)
function rundt(c, x, y, m, tegn) {
  const xs = [x], ys = [y];
  if (x < m) xs.push(x + c.width); if (x > c.width - m) xs.push(x - c.width);
  if (y < m) ys.push(y + c.height); if (y > c.height - m) ys.push(y - c.height);
  for (const a of xs) for (const b of ys) tegn(a, b);
}

// Lav et bump-billede ud af hvor lyst billedet er (lyse steder stikker op)
function normalKort(kilde, styrke = 2) {
  const b = kilde.width, h = kilde.height;
  const d = kilde.getContext("2d").getImageData(0, 0, b, h).data;
  const lum = new Float32Array(b * h);
  for (let i = 0; i < b * h; i++) lum[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const [c, x] = lærred(b, h), ud = x.createImageData(b, h);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < b; xx++) {
    const v = lum[y * b + (xx - 1 + b) % b], hø = lum[y * b + (xx + 1) % b];
    const o = lum[((y - 1 + h) % h) * b + xx], n = lum[((y + 1) % h) * b + xx];
    const nx = (v - hø) * styrke, ny = (n - o) * styrke, l = Math.hypot(nx, ny, 1), i = (y * b + xx) * 4;
    ud.data[i] = (nx / l * 0.5 + 0.5) * 255;
    ud.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
    ud.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    ud.data[i + 3] = 255;
  }
  x.putImageData(ud, 0, 0);
  return c;
}

let anisotropi = 4;
export function sætAnisotropi(n) { anisotropi = n; }

function tekstur(c, { farve = true, gentag = true, pixel = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (farve) t.colorSpace = THREE.SRGBColorSpace;
  if (gentag) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  else t.anisotropy = anisotropi;
  return t;
}

// Et færdigt sæt: farve + bump
function sæt(c, styrke, højde = c) {
  return { map: tekstur(c), normalMap: tekstur(normalKort(højde, styrke), { farve: false }) };
}

// ---------- Græs (Engen) ----------
export function græs() {
  const r = frø(11), [c, x] = lærred(512);
  x.fillStyle = "#4b9431"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {                               // store, bløde pletter af lysere og mørkere græs
    const px = r() * 512, py = r() * 512, rad = 30 + r() * 80, lys = r() < 0.5;
    rundt(c, px, py, rad, (a, b) => {
      const g = x.createRadialGradient(a, b, 0, a, b, rad);
      g.addColorStop(0, lys ? "rgba(140,200,80,.28)" : "rgba(30,80,20,.25)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(a - rad, b - rad, rad * 2, rad * 2);
    });
  }
  x.lineCap = "round";
  for (let i = 0; i < 16000; i++) {                            // græsstrå
    const px = r() * 512, py = r() * 512, l = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 1.1;
    x.strokeStyle = `hsl(${88 + r() * 30},${50 + r() * 25}%,${24 + r() * 32}%)`;
    x.lineWidth = 1 + r() * 1.4;
    rundt(c, px, py, 14, (a0, b0) => {
      x.beginPath(); x.moveTo(a0, b0); x.lineTo(a0 + Math.cos(a) * l, b0 + Math.sin(a) * l); x.stroke();
    });
  }
  for (let i = 0; i < 45; i++) {                               // små blomster i græsset
    const px = r() * 500 + 6, py = r() * 500 + 6, f = ["#ffffff", "#ffe066", "#ff9ecb", "#b6a4ff"][i % 4];
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2;
      x.fillStyle = f; x.beginPath(); x.arc(px + Math.cos(a) * 2.6, py + Math.sin(a) * 2.6, 2.2, 0, 7); x.fill();
    }
    x.fillStyle = "#ffcc33"; x.beginPath(); x.arc(px, py, 1.6, 0, 7); x.fill();
  }
  return sæt(c, 3);
}

// Siden af en svævende græsbane: græskant foroven, jord, sten og rødder
export function jordSide() {
  const r = frø(12), [c, x] = lærred(512, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#7a4f2c"); g.addColorStop(0.6, "#5b3920"); g.addColorStop(1, "#3b2414");
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 5; i++) {                                // lag i jorden
    x.fillStyle = `rgba(${i % 2 ? 40 : 120},${i % 2 ? 25 : 80},${i % 2 ? 10 : 45},.18)`;
    x.fillRect(0, 60 + i * 38 + r() * 10, 512, 8 + r() * 10);
  }
  for (let i = 0; i < 220; i++) {                              // småsten
    const px = r() * 512, py = 40 + r() * 216, s = 2 + r() * 7;
    x.fillStyle = `hsl(${25 + r() * 20},${10 + r() * 15}%,${30 + r() * 30}%)`;
    rundt(c, px, py, 10, (a, b) => { x.beginPath(); x.ellipse(a, b, s, s * 0.7, r() * 3, 0, 7); x.fill(); });
  }
  x.strokeStyle = "rgba(45,25,10,.8)"; x.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) {                               // rødder
    let px = r() * 512, py = 36;
    x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 8; k++) { px += (r() - 0.5) * 14; py += 6 + r() * 10; x.lineTo(px, py); }
    x.stroke();
  }
  for (let px = 0; px < 512; px += 2) {                        // græsset hænger ud over kanten
    const l = 18 + Math.sin(px * 0.11) * 5 + r() * 14;
    x.strokeStyle = `hsl(${90 + r() * 25},55%,${28 + r() * 22}%)`; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (r() - 0.5) * 4, l); x.stroke();
  }
  return sæt(c, 2.5);
}

// ---------- Planker (Junglen) ----------
export function planker() {
  const r = frø(21), [c, x] = lærred(512), [hc, hx] = lærred(512);
  hx.fillStyle = "#000"; hx.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 4; p++) {
    const y0 = p * 128, l = 34 + r() * 14;
    x.fillStyle = `hsl(${26 + r() * 10},${40 + r() * 12}%,${l}%)`; x.fillRect(0, y0, 512, 128);
    hx.fillStyle = "#bbb"; hx.fillRect(0, y0 + 4, 512, 120);
    for (let k = 0; k < 40; k++) {                             // årer i træet
      const yy = y0 + 8 + r() * 112, a = 1 + r() * 3, f = 0.01 + r() * 0.02, ph = r() * 9;
      x.strokeStyle = `rgba(${r() < 0.5 ? "60,30,10" : "210,160,100"},${0.12 + r() * 0.2})`; x.lineWidth = 1 + r() * 2;
      x.beginPath();
      for (let xx = 0; xx <= 512; xx += 8) x.lineTo(xx, yy + Math.sin(xx * f + ph) * a);
      x.stroke();
    }
    const kx = 60 + r() * 390, ky = y0 + 30 + r() * 68;         // en knast
    x.fillStyle = "rgba(60,30,12,.55)"; x.beginPath(); x.ellipse(kx, ky, 14, 7, 0, 0, 7); x.fill();
    x.strokeStyle = "rgba(60,30,12,.35)"; x.beginPath(); x.ellipse(kx, ky, 24, 12, 0, 0, 7); x.stroke();
    for (let m = 0; m < 25; m++) {                             // mos i kanterne
      const mx = r() < 0.5 ? r() * 60 : 452 + r() * 60, my = y0 + r() * 128;
      x.fillStyle = `rgba(${70 + r() * 40},${120 + r() * 50},40,.5)`; x.beginPath(); x.arc(mx, my, 3 + r() * 8, 0, 7); x.fill();
    }
    for (const sx of [34, 478]) for (const sy of [36, 92]) {    // søm
      x.fillStyle = "#3a3632"; x.beginPath(); x.arc(sx, y0 + sy, 5, 0, 7); x.fill();
      x.fillStyle = "#9a948c"; x.beginPath(); x.arc(sx - 1.5, y0 + sy - 1.5, 2, 0, 7); x.fill();
      hx.fillStyle = "#fff"; hx.beginPath(); hx.arc(sx, y0 + sy, 5, 0, 7); hx.fill();
    }
    x.fillStyle = "rgba(20,10,5,.85)"; x.fillRect(0, y0, 512, 4);   // mellemrum mellem plankerne
  }
  return sæt(c, 4, hc);
}

// Bjælken under plankerne
export function bjælke() {
  const r = frø(22), [c, x] = lærred(512, 128);
  x.fillStyle = "#5a3a1e"; x.fillRect(0, 0, 512, 128);
  for (let k = 0; k < 30; k++) {
    const yy = r() * 128;
    x.strokeStyle = `rgba(${r() < 0.5 ? "30,15,5" : "150,100,60"},.25)`; x.lineWidth = 1 + r() * 2;
    x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(170, yy + 4, 340, yy - 4, 512, yy); x.stroke();
  }
  return sæt(c, 2);
}

// ---------- Glasur med krymmel (Slikbanen) ----------
export function glasur() {
  const r = frø(31), [c, x] = lærred(512), [hc, hx] = lærred(512);
  x.fillStyle = "#ff8fc8"; x.fillRect(0, 0, 512, 512);
  hx.fillStyle = "#555"; hx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) {                               // bløde hvirvler i glasuren
    const px = r() * 512, py = r() * 512, rad = 20 + r() * 60;
    x.strokeStyle = "rgba(255,210,235,.35)"; x.lineWidth = 6 + r() * 10;
    rundt(c, px, py, rad + 10, (a, b) => { x.beginPath(); x.arc(a, b, rad, r() * 6, r() * 6 + 2.5); x.stroke(); });
  }
  const F = ["#ffe14d", "#4dd2ff", "#7cff6b", "#ffffff", "#ff4d6d", "#a56bff", "#ff9f1c"];
  for (let i = 0; i < 900; i++) {                              // krymmel
    const px = r() * 512, py = r() * 512, a = r() * Math.PI;
    x.fillStyle = F[i % F.length];
    rundt(c, px, py, 12, (a0, b0) => {
      for (const [ctx, farve] of [[x, null], [hx, "#fff"]]) {
        ctx.save(); ctx.translate(a0, b0); ctx.rotate(a);
        if (farve) ctx.fillStyle = farve;
        ctx.beginPath(); ctx.roundRect(-7, -2.2, 14, 4.4, 2.2); ctx.fill();
        ctx.restore();
      }
    });
  }
  return sæt(c, 3, hc);
}

// Siden af kagebanen: glasur der drypper, lagkage-lag og chokoladebund
export function kageSide() {
  const r = frø(32), [c, x] = lærred(512, 256);
  const lag = [[0, 70, "#ff8fc8"], [70, 118, "#f7d88f"], [118, 134, "#fff6ea"], [134, 150, "#e03a5a"], [150, 206, "#f7d88f"], [206, 256, "#6b3a1e"]];
  for (const [a, b, f] of lag) { x.fillStyle = f; x.fillRect(0, a, 512, b - a); }
  for (let i = 0; i < 260; i++) {                              // huller i kagebunden
    const py = r() < 0.5 ? 74 + r() * 40 : 154 + r() * 48;
    x.fillStyle = "rgba(190,140,60,.45)"; x.beginPath(); x.arc(r() * 512, py, 1 + r() * 3, 0, 7); x.fill();
  }
  x.fillStyle = "#ff8fc8";
  for (let px = 0; px < 512; px += 26 + r() * 20) {           // glasuren drypper ned
    const l = 12 + r() * 38, w = 7 + r() * 7;
    x.beginPath(); x.roundRect(px, 60, w, l, w / 2); x.fill();
  }
  x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(0, 8, 512, 5);
  return sæt(c, 2);
}

// ---------- Is (Isbanen) ----------
export function is() {
  const r = frø(41), [c, x] = lærred(512);
  const g = x.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "#d7f3ff"); g.addColorStop(0.5, "#bfe7fb"); g.addColorStop(1, "#d9f5ff");
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {                               // rim og sne
    const px = r() * 512, py = r() * 512, rad = 10 + r() * 40;
    rundt(c, px, py, rad, (a, b) => {
      const gg = x.createRadialGradient(a, b, 0, a, b, rad);
      gg.addColorStop(0, "rgba(255,255,255,.45)"); gg.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = gg; x.fillRect(a - rad, b - rad, rad * 2, rad * 2);
    });
  }
  for (let i = 0; i < 30; i++) {                               // revner
    let px = r() * 512, py = r() * 512, a = r() * 6.28;
    const pts = [[px, py]];
    for (let k = 0; k < 10; k++) { a += (r() - 0.5) * 1.2; px += Math.cos(a) * 12; py += Math.sin(a) * 12; pts.push([px, py]); }
    for (const [farve, bred, dx] of [["rgba(70,140,190,.55)", 2.5, 1], ["rgba(255,255,255,.9)", 1.2, 0]]) {
      x.strokeStyle = farve; x.lineWidth = bred;
      x.beginPath(); pts.forEach(([a0, b0], k) => k ? x.lineTo(a0 + dx, b0 + dx) : x.moveTo(a0 + dx, b0 + dx)); x.stroke();
    }
  }
  for (let i = 0; i < 160; i++) {                              // luftbobler i isen
    x.strokeStyle = "rgba(255,255,255,.5)"; x.lineWidth = 1;
    x.beginPath(); x.arc(r() * 512, r() * 512, 1 + r() * 3, 0, 7); x.stroke();
  }
  return sæt(c, 1.5);
}

export function isSide() {
  const r = frø(42), [c, x] = lærred(512, 256);
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#f2fbff"); g.addColorStop(0.12, "#9fdcf7"); g.addColorStop(1, "#2f7fc0");
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 80; i++) {                               // lodrette striber i isen
    const px = r() * 512;
    x.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.15})`; x.fillRect(px, 20, 2 + r() * 6, 236);
  }
  x.fillStyle = "#f7fdff";
  for (let px = 0; px < 512; px += 10 + r() * 16) {           // istapper
    const l = 14 + r() * 40, w = 6 + r() * 6;
    x.beginPath(); x.moveTo(px, 20); x.lineTo(px + w, 20); x.lineTo(px + w / 2, 20 + l); x.fill();
  }
  x.fillRect(0, 0, 512, 22);
  return sæt(c, 2);
}

// ---------- Regnbuen ----------
export const REGNBUE = ["#ff3b3b", "#ff9a1f", "#ffe23b", "#3ddc55", "#2f9bff", "#5b5bff", "#b05bff"];
export function regnbue() {
  const r = frø(51), [c, x] = lærred(256, 256);
  const g = x.createLinearGradient(0, 0, 256, 0);
  REGNBUE.forEach((f, i) => { g.addColorStop(i / 7 + 0.02, f); g.addColorStop((i + 1) / 7 - 0.02, f); });
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 7; i++) {                                // blank stribe midt i hvert bånd
    x.fillStyle = "rgba(255,255,255,.22)"; x.fillRect(i * 256 / 7 + 10, 0, 6, 256);
  }
  for (let i = 0; i < 70; i++) {                               // glimmer
    const px = r() * 256, py = r() * 256, s = 1 + r() * 2.5;
    x.fillStyle = "rgba(255,255,255,.9)";
    x.beginPath(); x.moveTo(px, py - s * 2); x.lineTo(px + s * 0.5, py); x.lineTo(px, py + s * 2); x.lineTo(px - s * 0.5, py); x.fill();
    x.beginPath(); x.moveTo(px - s * 2, py); x.lineTo(px, py + s * 0.5); x.lineTo(px + s * 2, py); x.lineTo(px, py - s * 0.5); x.fill();
  }
  return sæt(c, 1);
}

// Undersiden af regnbuen: bløde skyer
export function skySide() {
  const r = frø(52), [c, x] = lærred(512, 128);
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#dcd6ff");
  x.fillStyle = g; x.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 120; i++) {
    const px = r() * 512, py = 20 + r() * 100, rad = 8 + r() * 22;
    rundt(c, px, py, rad, (a, b) => {
      const gg = x.createRadialGradient(a, b - rad * 0.3, 0, a, b, rad);
      gg.addColorStop(0, "rgba(255,255,255,.9)"); gg.addColorStop(1, "rgba(200,190,255,0)");
      x.fillStyle = gg; x.beginPath(); x.arc(a, b, rad, 0, 7); x.fill();
    });
  }
  return sæt(c, 1.5);
}

// ---------- Broekraft-Rasmus: græsklods i pixels (top | side | bund) ----------
export function pixelGræs() {
  const r = frø(61), [c, x] = lærred(48, 16);
  const px = (xx, yy, f) => { x.fillStyle = f; x.fillRect(xx, yy, 1, 1); };
  const G = ["#5fa83a", "#6dbb44", "#4f9230", "#7cc84f"], J = ["#8a5a36", "#79502f", "#9b6a42", "#6a4428"];
  for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) {
    px(xx, yy, G[(r() * 4) | 0]);                               // toppen: græs
    px(32 + xx, yy, J[(r() * 4) | 0]);                          // bunden: jord
    const kant = 3 + ((xx * 7 + 3) % 3) - (xx % 5 === 0 ? 1 : 0);
    px(16 + xx, yy, yy < kant ? G[(r() * 4) | 0] : J[(r() * 4) | 0]);   // siden: græs foroven, jord forneden
  }
  return tekstur(c, { gentag: false, pixel: true });
}

// ---------- Små billeder til partikler og pynt ----------
export function glød() {
  const [c, x] = lærred(128), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.2, "rgba(255,255,255,.7)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return tekstur(c, { gentag: false });
}

export function prik() {
  const [c, x] = lærred(64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.55, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return tekstur(c, { gentag: false });
}

export function glimt() {
  const [c, x] = lærred(128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 30);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = "#fff";
  for (const [a, l] of [[0, 62], [Math.PI / 2, 62], [Math.PI / 4, 30], [-Math.PI / 4, 30]]) {
    x.save(); x.translate(64, 64); x.rotate(a);
    x.beginPath(); x.moveTo(-l, 0); x.quadraticCurveTo(0, 3, l, 0); x.quadraticCurveTo(0, -3, -l, 0); x.fill();
    x.restore();
  }
  return tekstur(c, { gentag: false });
}

export function flamme() {
  const [c, x] = lærred(64, 64);
  const g = x.createRadialGradient(32, 40, 0, 32, 36, 30);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.75)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(50, 26, 60, 42, 32, 62); x.bezierCurveTo(4, 42, 14, 26, 32, 2); x.fill();
  return tekstur(c, { gentag: false });
}

// En blød, lys sky (til skyhavet og himlen)
export function skyklat(seed = 71) {
  const r = frø(seed), [c, x] = lærred(256, 160);
  for (let i = 0; i < 26; i++) {
    const px = 50 + r() * 156, py = 70 + (r() - 0.5) * 50 - Math.sin((px - 40) / 176 * Math.PI) * 25, rad = 22 + r() * 30;
    const g = x.createRadialGradient(px, py - rad * 0.35, rad * 0.1, px, py, rad);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.7, "rgba(238,242,255,.85)"); g.addColorStop(1, "rgba(220,228,250,0)");
    x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
  }
  return tekstur(c, { gentag: false });
}

// Pile på fartfelterne
export function pile() {
  const [c, x] = lærred(128, 256);
  x.lineJoin = "round";
  for (const y0 of [40, 168]) {
    x.beginPath(); x.moveTo(14, y0 + 60); x.lineTo(64, y0); x.lineTo(114, y0 + 60); x.lineTo(114, y0 + 88); x.lineTo(64, y0 + 30); x.lineTo(14, y0 + 88); x.closePath();
    x.fillStyle = "#ffe23b"; x.fill(); x.lineWidth = 8; x.strokeStyle = "#ff7a00"; x.stroke();
  }
  const t = tekstur(c, { gentag: true });
  return t;
}

// Ternet målflag
export function ternet() {
  const [c, x] = lærred(128);
  for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) { x.fillStyle = (i + k) % 2 ? "#1d1d24" : "#ffffff"; x.fillRect(i * 16, k * 16, 16, 16); }
  const t = tekstur(c, { gentag: true }); t.magFilter = THREE.NearestFilter;
  return t;
}

// Skrå striber (slikstokke og rækværk på Slikbanen)
export function striber(a = "#ffffff", b = "#ff3355") {
  const [c, x] = lærred(64);
  x.fillStyle = a; x.fillRect(0, 0, 64, 64);
  x.fillStyle = b;
  for (let i = -64; i < 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i + 16 + 64, 64); x.lineTo(i + 64, 64); x.fill(); }
  return tekstur(c);
}

// Slikkepindens spiral
export function spiral(farver = ["#ff4d6d", "#ffffff", "#ffd23f", "#ffffff", "#4dd2ff", "#ffffff"]) {
  const [c, x] = lærred(256), n = farver.length, ud = x.createImageData(256, 256);
  const rgb = farver.map(f => { const h = new THREE.Color(f).getHex(); return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; });
  for (let y = 0; y < 256; y++) for (let xx = 0; xx < 256; xx++) {
    const dx = xx - 128, dy = y - 128, rr = Math.hypot(dx, dy);
    const bånd = ((Math.atan2(dy, dx) / (Math.PI * 2) + 1) * n + rr * 0.05) % n;
    const [R, G, B] = rgb[Math.floor(bånd)], i = (y * 256 + xx) * 4;
    ud.data[i] = R; ud.data[i + 1] = G; ud.data[i + 2] = B; ud.data[i + 3] = 255;
  }
  x.putImageData(ud, 0, 0);
  return tekstur(c, { gentag: false });
}
