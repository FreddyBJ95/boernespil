// ===== Teksturerne: træ, metal, greb, dåser, frugt, partikler og skiver =====
// Alt tegnes med kode på et lærred, når spillet starter, så der ikke skal hentes billedfiler.
// Støjen er "fast" (samme tal hver gang), så træet og metallet ser ens ud fra gang til gang.

import * as THREE from "../3d-faelles/three.module.js";

// ---------- Støj ----------
// Et hurtigt "terningkast" for et punkt i et gitter (giver altid det samme tal for samme punkt)
function hash(x, y, frø = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(frø | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Blød støj, der gentager sig efter px × py felter (så teksturer kan lægges side om side uden synlige samlinger)
function støj(x, y, px = 1e9, py = 1e9, frø = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a, p) => ((a % p) + p) % p;
  const x0 = m(xi, px), x1 = m(xi + 1, px), y0 = m(yi, py), y1 = m(yi + 1, py);
  const a = hash(x0, y0, frø), b = hash(x1, y0, frø), c = hash(x0, y1, frø), d = hash(x1, y1, frø);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// Flere lag støj oven i hinanden (store bølger + små detaljer)
function fbm(x, y, px, py, lag = 4, frø = 0) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < lag; i++) { s += a * støj(x * f, y * f, px * f, py * f, frø + i); n += a; f *= 2; a *= 0.5; }
  return s / n;
}
export { støj, fbm };

// ---------- Lærreder og teksturer ----------
function lærred(b, h) { const c = document.createElement("canvas"); c.width = b; c.height = h; return c; }
// Mal hvert punkt med en funktion, der giver [r, g, b, a]
function pixler(b, h, fn) {
  const c = lærred(b, h), g = c.getContext("2d"), billede = g.createImageData(b, h), d = billede.data, ud = [0, 0, 0, 255];
  for (let y = 0; y < h; y++) for (let x = 0; x < b; x++) {
    ud[3] = 255; fn(x / b, y / h, ud);
    const i = (y * b + x) * 4; d[i] = ud[0]; d[i + 1] = ud[1]; d[i + 2] = ud[2]; d[i + 3] = ud[3];
  }
  g.putImageData(billede, 0, 0);
  return c;
}
// Gør et lærred til en tekstur. farve = sRGB (billeder), ellers rå tal (ruhed, buler)
function tekstur(c, { farve = true, gentag = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = farve ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (gentag) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}
const bland = (a, b, t) => a + (b - a) * t;
const glat = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function farveMiks(ud, a, b, t) { ud[0] = bland(a[0], b[0], t); ud[1] = bland(a[1], b[1], t); ud[2] = bland(a[2], b[2], t); }

// Gem teksturerne, så de kun tegnes én gang
const lager = new Map();
function husk(navn, lav) { if (!lager.has(navn)) lager.set(navn, lav()); return lager.get(navn); }

// ---------- Træ ----------
// Årerne løber langs u (vandret i teksturen). Valnød til skæfter, lyst fyr til bordet og hegnet.
export function træ(navn = "valnød") {
  return husk("træ-" + navn, () => {
    const sæt = {
      valnød: { lys: [150, 90, 50], mørk: [66, 34, 16], årer: 16, figur: 0.45, frø: 3 },
      bord: { lys: [176, 124, 78], mørk: [112, 72, 42], årer: 22, figur: 0.3, frø: 7 },
      planke: { lys: [150, 128, 104], mørk: [96, 80, 64], årer: 20, figur: 0.25, frø: 11 },
      hegn: { lys: [140, 104, 70], mørk: [88, 62, 40], årer: 18, figur: 0.3, frø: 17 },
    }[navn];
    const c = pixler(512, 512, (u, v, ud) => {
      const bøj = fbm(u * 3, v * 2, 3, 2, 4, sæt.frø) * sæt.figur * 3;
      const ring = Math.sin((v * sæt.årer + bøj) * Math.PI * 2) * 0.5 + 0.5;
      const fin = fbm(u * 6, v * 160, 6, 160, 2, sæt.frø + 5);
      const plet = fbm(u * 2, v * 2, 2, 2, 3, sæt.frø + 9);
      const t = Math.min(1, Math.pow(ring, 3) * 0.55 + fin * 0.45 + (plet - 0.5) * 0.35);
      farveMiks(ud, sæt.lys, sæt.mørk, t);
    });
    return tekstur(c, { gentag: true });
  });
}

// Fintmasket rudemønster (riflet greb på træ) som buler
export function riflingBuler(tæthed = 40) {
  return husk("rifling" + tæthed, () => tekstur(pixler(256, 256, (u, v, ud) => {
    const a = Math.abs(((u + v) * tæthed) % 1 - 0.5) * 2, b = Math.abs(((u - v + 4) * tæthed) % 1 - 0.5) * 2;
    const h = Math.min(a, b) * 255; ud[0] = ud[1] = ud[2] = h;
  }), { farve: false, gentag: true }));
}

// Prikket plastgreb (som på moderne pistoler): små tilfældige knopper
export function prikBuler() {
  return husk("prik", () => tekstur(pixler(256, 256, (u, v, ud) => {
    const n = støj(u * 34, v * 34, 34, 34, 21) * 0.75 + støj(u * 68, v * 68, 68, 68, 22) * 0.25;
    const h = glat(0.45, 0.75, n) * 255; ud[0] = ud[1] = ud[2] = h;
  }), { farve: false, gentag: true }));
}

// Riller (som på et knurlet metalhjul eller en rifletmøtrik)
export function knurlBuler() {
  return husk("knurl", () => tekstur(pixler(128, 128, (u, v, ud) => {
    const a = Math.abs(((u * 2 + v) * 16) % 1 - 0.5), b = Math.abs(((u * 2 - v + 4) * 16) % 1 - 0.5);
    ud[0] = ud[1] = ud[2] = Math.min(a, b) * 510;
  }), { farve: false, gentag: true }));
}

// Ruhed for metal: fine slibestriber langs u og lidt pletter, så lyset ikke bliver plastisk
export function metalRuhed(slags = "børstet") {
  return husk("metal-" + slags, () => tekstur(pixler(256, 256, (u, v, ud) => {
    let h;
    if (slags === "børstet") h = 0.55 + (fbm(u * 2, v * 256, 2, 256, 2, 31) - 0.5) * 0.7 + (fbm(u * 4, v * 4, 4, 4, 3, 32) - 0.5) * 0.25;
    else h = 0.75 + (fbm(u * 48, v * 48, 48, 48, 3, 33) - 0.5) * 0.2 + (støj(u * 160, v * 160, 160, 160, 34) - 0.5) * 0.12;
    ud[0] = ud[1] = ud[2] = Math.max(0, Math.min(255, h * 255));
  }), { farve: false, gentag: true }));
}

// ---------- Dåser og flasker ----------
// Seks forskellige etiketter med striber, stjerner og bølger (ingen rigtige mærker)
export function dåseEtiket(nr) {
  return husk("dåse" + nr, () => {
    const c = lærred(512, 256), g = c.getContext("2d");
    const sæt = [
      ["#d62828", "#fcbf49", "#ffffff"], ["#1d4ed8", "#93c5fd", "#ffffff"], ["#15803d", "#bef264", "#fef9c3"],
      ["#7c3aed", "#f0abfc", "#ffffff"], ["#ea580c", "#fde68a", "#7c2d12"], ["#111827", "#f43f5e", "#e5e7eb"],
    ][nr % 6];
    g.fillStyle = sæt[0]; g.fillRect(0, 0, 512, 256);
    g.fillStyle = sæt[1];
    if (nr % 3 === 0) for (let i = 0; i < 8; i++) { g.save(); g.translate(i * 64, 0); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(0, 40, 22, 176); g.restore(); }
    else if (nr % 3 === 1) { g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, 128 + Math.sin(x / 512 * Math.PI * 6) * 26); g.lineTo(512, 256); g.lineTo(0, 256); g.fill(); }
    else for (let i = 0; i < 26; i++) { g.beginPath(); g.arc((i * 97) % 512, 50 + ((i * 53) % 160), 6 + (i % 4) * 4, 0, 7); g.fill(); }
    // et rundt mærke med en stjerne midt på
    g.fillStyle = sæt[2]; g.beginPath(); g.arc(256, 128, 58, 0, 7); g.fill();
    g.fillStyle = sæt[0]; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 20 : 46, v = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(256 + Math.cos(v) * r, 128 + Math.sin(v) * r); }
    g.fill();
    // blanke metalkanter foroven og forneden
    const kant = g.createLinearGradient(0, 0, 0, 24); kant.addColorStop(0, "#f2f2f2"); kant.addColorStop(1, "#8d9095");
    g.fillStyle = kant; g.fillRect(0, 0, 512, 22); g.save(); g.scale(1, -1); g.fillRect(0, -256, 512, 22); g.restore();
    return tekstur(c);
  });
}

// ---------- Frugt ----------
// Skallen uden på frugten (u rundt om, v fra top til bund)
export function frugtSkal(slags) {
  return husk("skal-" + slags, () => {
    const fn = {
      melon: (u, v, ud) => {
        const bølge = fbm(u * 4, v * 3, 4, 3, 3, 41) * 1.4;
        const s = Math.sin((u * 14 + bølge) * Math.PI * 2) * 0.5 + 0.5;
        const plet = fbm(u * 24, v * 12, 24, 12, 3, 42);
        farveMiks(ud, [24, 70, 26], [98, 150, 58], glat(0.35, 0.75, s * 0.75 + plet * 0.35));
      },
      appelsin: (u, v, ud) => {
        const n = støj(u * 160, v * 80, 160, 80, 43) * 0.6 + fbm(u * 8, v * 4, 8, 4, 3, 44) * 0.4;
        farveMiks(ud, [250, 140, 20], [214, 94, 8], n);
      },
      æble: (u, v, ud) => {
        const strib = fbm(u * 30, v * 3, 30, 3, 3, 45);
        const prik = støj(u * 200, v * 100, 200, 100, 46) > 0.86 ? 0.6 : 0;
        farveMiks(ud, [200, 22, 30], [242, 176, 60], Math.min(1, glat(0.55, 0.9, strib) * 0.7 + glat(0.75, 1, v) * 0.6 + prik));
      },
      græskar: (u, v, ud) => {
        const rib = Math.pow(Math.abs(Math.sin(u * Math.PI * 10)), 0.35);
        const n = fbm(u * 12, v * 6, 12, 6, 3, 47);
        farveMiks(ud, [170, 70, 6], [250, 140, 28], rib * 0.8 + n * 0.3);
      },
      kokos: (u, v, ud) => {
        const fibre = fbm(u * 4, v * 90, 4, 90, 3, 48);
        farveMiks(ud, [64, 38, 20], [140, 96, 60], glat(0.3, 0.8, fibre));
      },
    }[slags];
    return tekstur(pixler(512, 256, fn), { gentag: true });
  });
}
// Buler i skallen (appelsinens porer, græskarrets ribber, kokosnøddens hår)
export function frugtBuler(slags) {
  return husk("skalbule-" + slags, () => tekstur(pixler(256, 128, (u, v, ud) => {
    let h = 0.5;
    if (slags === "appelsin") h = støj(u * 160, v * 80, 160, 80, 43);
    if (slags === "græskar") h = Math.pow(Math.abs(Math.sin(u * Math.PI * 10)), 0.35);
    if (slags === "kokos") h = fbm(u * 4, v * 90, 4, 90, 3, 48);
    if (slags === "melon") h = 0.5 + støj(u * 60, v * 30, 60, 30, 49) * 0.2;
    ud[0] = ud[1] = ud[2] = h * 255;
  }), { farve: false, gentag: true }));
}

// Snitfladen inde i frugten (en cirkel: kant yderst, frugtkød og kerner indeni)
export function snitFlade(slags) {
  return husk("snit-" + slags, () => {
    const S = 256, c = lærred(S, S), g = c.getContext("2d"), m = S / 2;
    const ring = (r, farve) => { g.fillStyle = farve; g.beginPath(); g.arc(m, m, r, 0, 7); g.fill(); };
    if (slags === "melon") {
      ring(128, "#2f6b2a"); ring(122, "#cfe6b0");
      const kød = g.createRadialGradient(m, m, 4, m, m, 112); kød.addColorStop(0, "#ff5a6e"); kød.addColorStop(0.75, "#f2324c"); kød.addColorStop(1, "#ff8c8c");
      g.fillStyle = kød; g.beginPath(); g.arc(m, m, 112, 0, 7); g.fill();
      for (let i = 0; i < 400; i++) { const v = Math.random() * 7, r = Math.sqrt(Math.random()) * 108; g.fillStyle = `rgba(255,${150 + Math.random() * 80 | 0},${160 + Math.random() * 60 | 0},0.25)`; g.fillRect(m + Math.cos(v) * r, m + Math.sin(v) * r, 2, 2); }
      for (let i = 0; i < 22; i++) {
        const v = i / 22 * Math.PI * 2 + (i % 2) * 0.12, r = 62 + (i % 3) * 9;
        g.save(); g.translate(m + Math.cos(v) * r, m + Math.sin(v) * r); g.rotate(v);
        g.fillStyle = "#1b120d"; g.beginPath(); g.ellipse(0, 0, 7, 4, 0, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(-2, -1, 2.5, 1.2, 0, 0, 7); g.fill(); g.restore();
      }
    } else if (slags === "appelsin") {
      ring(128, "#f08a12"); ring(118, "#fff1d6");
      for (let i = 0; i < 11; i++) {
        const v0 = i / 11 * Math.PI * 2 + 0.03, v1 = (i + 1) / 11 * Math.PI * 2 - 0.03;
        const lys = g.createRadialGradient(m, m, 10, m, m, 110); lys.addColorStop(0, "#ffd27a"); lys.addColorStop(1, "#ff9a1a");
        g.fillStyle = lys; g.beginPath(); g.moveTo(m + Math.cos((v0 + v1) / 2) * 10, m + Math.sin((v0 + v1) / 2) * 10); g.arc(m, m, 110, v0, v1); g.fill();
      }
      for (let i = 0; i < 260; i++) { const v = Math.random() * 7, r = 14 + Math.random() * 92; g.fillStyle = "rgba(255,240,190,0.35)"; g.beginPath(); g.ellipse(m + Math.cos(v) * r, m + Math.sin(v) * r, 4, 1.5, v, 0, 7); g.fill(); }
      ring(12, "#fff6e0");
    } else if (slags === "æble") {
      ring(128, "#b81c24"); ring(123, "#fff3cf");
      const kød = g.createRadialGradient(m, m, 10, m, m, 123); kød.addColorStop(0, "#f7e7b4"); kød.addColorStop(1, "#fff6dc"); g.fillStyle = kød; g.beginPath(); g.arc(m, m, 122, 0, 7); g.fill();
      g.strokeStyle = "rgba(190,160,90,0.6)"; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 10; i++) { const v = i / 10 * Math.PI * 2, r = i % 2 ? 22 : 42; g.lineTo(m + Math.cos(v) * r, m + Math.sin(v) * r); } g.stroke();
      for (let i = 0; i < 5; i++) { const v = i / 5 * Math.PI * 2; g.save(); g.translate(m + Math.cos(v) * 26, m + Math.sin(v) * 26); g.rotate(v); g.fillStyle = "#5a3418"; g.beginPath(); g.ellipse(0, 0, 8, 4, 0, 0, 7); g.fill(); g.restore(); }
    } else if (slags === "græskar") {
      ring(128, "#d8740c"); ring(116, "#ffb02e");
      const hul = g.createRadialGradient(m, m, 10, m, m, 70); hul.addColorStop(0, "#e88a1a"); hul.addColorStop(1, "#ffa424"); g.fillStyle = hul; g.beginPath(); g.arc(m, m, 70, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,210,120,0.7)"; g.lineWidth = 2;
      for (let i = 0; i < 40; i++) { const v = Math.random() * 7; g.beginPath(); g.moveTo(m, m); g.quadraticCurveTo(m + Math.cos(v + 0.5) * 40, m + Math.sin(v + 0.5) * 40, m + Math.cos(v) * 66, m + Math.sin(v) * 66); g.stroke(); }
      for (let i = 0; i < 16; i++) { const v = Math.random() * 7, r = 20 + Math.random() * 40; g.save(); g.translate(m + Math.cos(v) * r, m + Math.sin(v) * r); g.rotate(v); g.fillStyle = "#fff4d0"; g.beginPath(); g.ellipse(0, 0, 9, 5, 0, 0, 7); g.fill(); g.restore(); }
    } else {
      ring(128, "#5a3a22"); ring(116, "#f7f3ea");
      const k = g.createRadialGradient(m, m, 10, m, m, 100); k.addColorStop(0, "rgba(220,230,240,0.9)"); k.addColorStop(0.8, "rgba(240,240,235,0.6)"); k.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = k; g.beginPath(); g.arc(m, m, 96, 0, 7); g.fill();
    }
    return tekstur(c);
  });
}

// ---------- Partikler ----------
// Fire billeder i ét (2×2): 0 = blødt lys, 1 = røgpuf, 2 = flamme, 3 = lille firkant (konfetti, splinter)
export function partikelAtlas() {
  return husk("atlas", () => {
    const S = 512, h = S / 2, c = lærred(S, S), g = c.getContext("2d");
    // blødt lys
    let r = g.createRadialGradient(h / 2, h / 2, 0, h / 2, h / 2, h / 2);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.2, "rgba(255,255,255,0.85)"); r.addColorStop(0.5, "rgba(255,255,255,0.25)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, h, h);
    // røgpuf: mange bløde klatter med støj
    const røg = pixler(h, h, (u, v, ud) => {
      const dx = u - 0.5, dy = v - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
      const n = fbm(u * 5, v * 5, 5, 5, 4, 61);
      const a = Math.max(0, 1 - d * (1.1 - (n - 0.5) * 0.9)); ud[0] = ud[1] = ud[2] = 255; ud[3] = Math.pow(a, 1.6) * 255 * (0.6 + n * 0.6);
    });
    g.drawImage(røg, h, 0);
    // flamme: en dråbe, der er spids foroven, med takket kant
    const flamme = pixler(h, h, (u, v, ud) => {
      const y = 1 - v, x = (u - 0.5) * 2;
      const bredde = Math.max(0.0001, Math.pow(Math.sin(Math.min(1, y * 1.15) * Math.PI), 0.8) * (1 - y * 0.55));
      const n = fbm(u * 6, v * 4, 6, 4, 3, 62);
      const d = Math.abs(x) / bredde + (n - 0.5) * 0.6;
      const a = Math.max(0, 1 - d) * glat(0, 0.12, y) ; ud[0] = ud[1] = ud[2] = 255; ud[3] = Math.min(1, a * 1.6) * 255;
    });
    g.drawImage(flamme, 0, h);
    // firkant med lidt bløde hjørner
    g.fillStyle = "#fff"; g.beginPath(); g.roundRect(h + h * 0.2, h + h * 0.2, h * 0.6, h * 0.6, h * 0.08); g.fill();
    return tekstur(c, { aniso: 1 });
  });
}

// Skudhul i træ: mørkt hul, lyse splinter rundt om og små revner
export function skudhul() {
  return husk("skudhul", () => {
    const S = 128, c = lærred(S, S), g = c.getContext("2d"), m = S / 2;
    const splint = g.createRadialGradient(m, m, 6, m, m, 40); splint.addColorStop(0, "rgba(232,200,150,0.95)"); splint.addColorStop(1, "rgba(232,200,150,0)");
    g.fillStyle = splint; g.beginPath();
    for (let i = 0; i <= 24; i++) { const v = i / 24 * Math.PI * 2, r = 18 + Math.random() * 22; g.lineTo(m + Math.cos(v) * r, m + Math.sin(v) * r); } g.fill();
    g.strokeStyle = "rgba(40,24,12,0.7)"; g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { const v = Math.random() * 7; g.beginPath(); g.moveTo(m, m); g.lineTo(m + Math.cos(v) * (20 + Math.random() * 24), m + Math.sin(v) * (20 + Math.random() * 24)); g.stroke(); }
    const hul = g.createRadialGradient(m, m, 2, m, m, 13); hul.addColorStop(0, "rgba(5,3,2,1)"); hul.addColorStop(0.7, "rgba(20,12,6,1)"); hul.addColorStop(1, "rgba(40,25,12,0)");
    g.fillStyle = hul; g.beginPath(); g.arc(m, m, 13, 0, 7); g.fill();
    return tekstur(c, { aniso: 4 });
  });
}

// Skydeskive som til bueskydning: gul midte, rød, blå, sort og hvid
export function skydeskive() {
  return husk("skive", () => {
    const S = 512, c = lærred(S, S), g = c.getContext("2d"), m = S / 2;
    const farver = ["#f4f1e8", "#f4f1e8", "#1c1c1e", "#1c1c1e", "#2f7fd8", "#2f7fd8", "#d8322c", "#d8322c", "#f7d23e", "#f7d23e"];
    for (let i = 0; i < 10; i++) {
      const r = m * (1 - i / 10);
      g.fillStyle = farver[i]; g.beginPath(); g.arc(m, m, r, 0, 7); g.fill();
      g.strokeStyle = i < 2 ? "#333" : (i < 4 ? "#ddd" : "#222"); g.lineWidth = 2; g.stroke();
    }
    g.strokeStyle = "#222"; g.lineWidth = 2; g.beginPath(); g.moveTo(m - 8, m); g.lineTo(m + 8, m); g.moveTo(m, m - 8); g.lineTo(m, m + 8); g.stroke();
    return tekstur(c);
  });
}

// Græs til jorden (gentages mange gange)
export function græs() {
  return husk("græs", () => tekstur(pixler(256, 256, (u, v, ud) => {
    const n = fbm(u * 8, v * 8, 8, 8, 4, 71), f = støj(u * 128, v * 128, 128, 128, 72);
    farveMiks(ud, [34, 52, 22], [78, 98, 40], n * 0.7 + f * 0.3);
    if (støj(u * 64, v * 64, 64, 64, 73) > 0.8) farveMiks(ud, [ud[0], ud[1], ud[2]], [96, 84, 50], 0.5);
  }), { gentag: true }));
}

// Plankeværk: lodrette brædder med mørke sprækker, søm og lidt forskellig farve
export function planker() {
  return husk("planker", () => tekstur(pixler(512, 512, (u, v, ud) => {
    const b = u * 6, nr = Math.floor(b), x = b - nr;
    const tone = 0.82 + hash(nr, 3, 91) * 0.3;
    const år = fbm(x * 3 + nr * 7, v * 40, 1e9, 40, 3, 92 + nr) * 0.5 + fbm(x * 12, v * 4, 1e9, 4, 2, 93) * 0.2;
    let lys = (0.55 + år * 0.6) * tone;
    if (x < 0.035 || x > 0.965) lys *= 0.25;
    for (const sy of [0.12, 0.88]) { const d = Math.hypot((x - 0.5) * 0.17, v - sy); if (d < 0.009) lys = 0.25 + (0.009 - d) * 30; }
    ud[0] = 150 * lys; ud[1] = 126 * lys; ud[2] = 100 * lys;
  }), { gentag: true }));
}

// Halm til halmballerne
export function halm() {
  return husk("halm", () => tekstur(pixler(256, 256, (u, v, ud) => {
    const n = fbm(u * 3, v * 60, 3, 60, 3, 81), f = fbm(u * 6, v * 120, 6, 120, 2, 82);
    farveMiks(ud, [150, 112, 44], [226, 190, 104], n * 0.6 + f * 0.4);
  }), { gentag: true }));
}
