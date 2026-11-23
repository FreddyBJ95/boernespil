// ===== Lysværdet: et skaft af stål tegnet med kode og en klinge af lys =====
// Tegnet i et område på 1480 × 120: skaftet til venstre (0–340), klingen kommer ud ved x = 340 og går
// 1120 enheder ud til højre. Skaftet tegnes én gang til et billede; klingen tegnes på ny hvert billede.

export const SVÆRD_MÅL = { b: 1480, h: 120, skaft: 340, klinge: 1120 };
// Klingens farver — ladeknappen skifter til den næste
export const SVÆRD_FARVER = ["70,150,255", "70,255,110", "255,55,55", "190,80,255", "255,210,50", "255,90,200"];

// ---------- Små tegnehjælpere ----------
function form(...p) { const s = new Path2D(); s.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) s.lineTo(p[i], p[i + 1]); s.closePath(); return s; }
function rund(x, y, b, h, r) {
  const s = new Path2D(); s.moveTo(x + r, y); s.arcTo(x + b, y, x + b, y + h, r); s.arcTo(x + b, y + h, x, y + h, r);
  s.arcTo(x, y + h, x, y, r); s.arcTo(x, y, x + b, y, r); s.closePath(); return s;
}
function lodret(c, y0, y1, stop) { const g = c.createLinearGradient(0, y0, 0, y1); for (const [t, f] of stop) g.addColorStop(t, f); return g; }
function del(c, s, y0, y1, farver, kant = "rgba(8,10,14,0.85)") {
  c.fillStyle = lodret(c, y0, y1, farver); c.fill(s);
  c.lineWidth = 1.6; c.strokeStyle = kant; c.stroke(s);
}
function streg(c, farve, b, x0, y0, x1, y1) { c.strokeStyle = farve; c.lineWidth = b; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
// Blankt stål (et rør, der får lys fra oven), mørk grafit og sort gummi
const STÅL = [[0, "#4f5761"], [0.16, "#f4f7fa"], [0.36, "#b9c1ca"], [0.7, "#68717c"], [1, "#1f2328"]];
const GRAFIT = [[0, "#5d646f"], [0.2, "#353a42"], [1, "#121418"]];
const GUMMI = [[0, "#3a3d44"], [0.3, "#1c1e22"], [1, "#0b0c0e"]];

// ---------- Skaftet (tegnes én gang) ----------
export function lavSkaft(k) {
  const lær = document.createElement("canvas");
  lær.width = Math.ceil(SVÆRD_MÅL.skaft * k); lær.height = Math.ceil(SVÆRD_MÅL.h * k);
  const c = lær.getContext("2d"); c.scale(k, k); c.lineJoin = "round";
  tegnSkaft(c);
  return lær;
}
function tegnSkaft(c) {
  // Hovedrøret af blankt stål
  del(c, rund(20, 30, 276, 60, 6), 30, 90, STÅL);
  // Knoppen bagerst
  del(c, form(2, 38, 12, 25, 36, 25, 36, 95, 12, 95, 2, 82), 25, 95, GRAFIT);
  streg(c, "rgba(255,255,255,0.25)", 1.5, 12, 29, 34, 29);
  // Grebet: sorte gummiriller hele vejen rundt
  for (let x = 54; x <= 186; x += 19) {
    const rille = rund(x, 25, 12, 70, 5);
    del(c, rille, 25, 95, GUMMI);
    streg(c, "rgba(255,255,255,0.18)", 1.4, x + 3, 30, x + 9, 30);
  }
  // Halsen: mørke ringe
  for (const x of [206, 214, 282]) streg(c, "rgba(10,12,16,0.85)", 3, x, 31, x, 89);
  // Tændknappen: en lille plade med en rød knap og en grøn lampe
  del(c, rund(222, 17, 56, 16, 4), 17, 33, GRAFIT);
  c.fillStyle = lodret(c, 13, 27, [[0, "#ff8a7a"], [0.5, "#e0221c"], [1, "#6d0805"]]);
  c.beginPath(); c.arc(238, 20, 7, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "rgba(0,0,0,0.6)"; c.lineWidth = 1.2; c.stroke();
  c.fillStyle = "#8dffb0"; c.fillRect(255, 21, 14, 6);
  c.fillStyle = "rgba(141,255,176,0.35)"; c.fillRect(252, 18, 20, 12);
  // Mundstykket: en bredere krave med lufthuller, hvor klingen kommer ud
  del(c, form(284, 30, 298, 19, 338, 19, 338, 101, 298, 101, 284, 90), 19, 101, STÅL);
  for (let i = 0; i < 3; i++) {
    c.fillStyle = "rgba(10,12,16,0.85)";
    c.fillRect(304 + i * 10, 25, 5, 16);
    c.fillRect(304 + i * 10, 79, 5, 16);
  }
  c.fillStyle = "#0d0f12"; c.fillRect(333, 36, 6, 48);
  // Lys langs røret (det blanke metal)
  streg(c, "rgba(255,255,255,0.65)", 2, 24, 38, 292, 38);
  streg(c, "rgba(255,255,255,0.4)", 1.5, 300, 27, 336, 27);
}

// ---------- Klingen (tegnes hvert billede) ----------
// c står i sværdets egne koordinater. Lag af farvet lys lægges oven i hinanden, med en hvid kerne inderst.
// flimmer gør klingen en anelse tykkere og tyndere, så den lever.
export function tegnKlinge(c, x, y, længde, farve, flimmer = 1) {
  c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
  const x1 = x + længde;
  for (const [b, a] of [[160, 0.06], [104, 0.11], [66, 0.24], [42, 0.5]]) {
    c.strokeStyle = `rgba(${farve},${a})`; c.lineWidth = b * flimmer;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y); c.stroke();
  }
  c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 24 * flimmer;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y); c.stroke();
  c.strokeStyle = "#fff"; c.lineWidth = 13;
  c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y); c.stroke();
  c.restore();
}
