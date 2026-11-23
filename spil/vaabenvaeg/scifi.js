// ===== Lasergeværet: et sci-fi-våben tegnet med kode =====
// Tegnet i et område på 1000 × 380 (mundingen til højre). De faste dele tegnes én gang til et billede;
// det der lyser og bevæger sig (spolerne, strålen, varmen, energicellen og skærmen) tegnes hvert billede.

export const LASER_MÅL = { b: 1000, h: 380 };
const CELLE = { x: 607, y: 222, b: 50, h: 112, vinkel: -0.14 };   // energicellen: øverste midte, størrelse og hældning
const SPOLER = []; for (let x = 676; x <= 900; x += 14) SPOLER.push(x);
const VENTILER = []; for (let x = 690; x <= 880; x += 27) VENTILER.push(x);

// ---------- Små tegnehjælpere ----------
function form(...p) { const s = new Path2D(); s.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) s.lineTo(p[i], p[i + 1]); s.closePath(); return s; }
function rund(x, y, b, h, r) {
  const s = new Path2D(); s.moveTo(x + r, y); s.arcTo(x + b, y, x + b, y + h, r); s.arcTo(x + b, y + h, x, y + h, r);
  s.arcTo(x, y + h, x, y, r); s.arcTo(x, y, x + b, y, r); s.closePath(); return s;
}
function lodret(c, y0, y1, stop) { const g = c.createLinearGradient(0, y0, 0, y1); for (const [t, f] of stop) g.addColorStop(t, f); return g; }
function vandret(c, x0, x1, stop) { const g = c.createLinearGradient(x0, 0, x1, 0); for (const [t, f] of stop) g.addColorStop(t, f); return g; }
// Farverne: en hvid skal af plast og en mørk grafitramme af metal
const HVID = [[0, "#fdfeff"], [0.5, "#e2e6ec"], [1, "#aab1bc"]];
const GRAFIT = [[0, "#565d68"], [0.12, "#343941"], [1, "#15181c"]];
const GUMMI = [[0, "#33363c"], [1, "#141518"]];
const METAL = [[0, "#4c535d"], [0.35, "#d3d9e0"], [0.55, "#8d96a2"], [1, "#2f343b"]];
function del(c, s, y0, y1, farver, kant = "rgba(8,10,14,0.85)") {
  c.fillStyle = lodret(c, y0, y1, farver); c.fill(s);
  c.lineWidth = 1.6; c.strokeStyle = kant; c.stroke(s);
}
function streg(c, farve, b, ...p) { c.strokeStyle = farve; c.lineWidth = b; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); }
function skrue(c, x, y) {
  c.fillStyle = lodret(c, y - 3.6, y + 3.6, [[0, "#f2f4f7"], [1, "#6f7782"]]); c.beginPath(); c.arc(x, y, 3.6, 0, 7); c.fill();
  c.strokeStyle = "rgba(0,0,0,0.5)"; c.lineWidth = 1; c.stroke(); streg(c, "rgba(0,0,0,0.55)", 1.1, x - 2.2, y, x + 2.2, y);
}

// ---------- De faste dele (tegnes én gang) ----------
export function lavLaserBillede(k) {
  const lær = document.createElement("canvas");
  lær.width = Math.ceil(LASER_MÅL.b * k); lær.height = Math.ceil(LASER_MÅL.h * k);
  const c = lær.getContext("2d"); c.scale(k, k); c.lineJoin = "round";

  // Kolben: et skelet af grafit med en gummiplade bagest og en hvid kindpude
  del(c, form(52, 122, 262, 132, 262, 162, 52, 156), 122, 162, GRAFIT);
  del(c, form(56, 252, 250, 196, 262, 214, 60, 286), 196, 286, GRAFIT);
  del(c, form(128, 156, 168, 158, 152, 232, 112, 246), 156, 246, GRAFIT);
  del(c, form(64, 104, 206, 104, 232, 122, 232, 134, 58, 128, 58, 112), 104, 134, HVID, "rgba(60,66,76,0.9)");
  streg(c, "rgba(255,255,255,0.8)", 1.4, 68, 106, 204, 106);
  const plade = rund(24, 106, 36, 186, 12);
  del(c, plade, 106, 292, GUMMI);
  c.save(); c.clip(plade); for (let y = 118; y < 290; y += 11) streg(c, "rgba(255,255,255,0.07)", 3, 24, y, 60, y); c.restore();

  // Den nederste ramme
  del(c, form(244, 140, 648, 140, 648, 214, 608, 238, 334, 238, 292, 214, 244, 200), 140, 238, GRAFIT);
  streg(c, "rgba(255,255,255,0.12)", 1.2, 300, 216, 600, 216);
  // Grebet: gummi med en riflet overflade, vinklet bagud
  const greb = form(382, 226, 472, 226, 456, 330, 446, 350, 396, 354, 380, 344, 372, 328);
  del(c, greb, 226, 354, GUMMI);
  c.save(); c.clip(greb);
  for (let y = 236; y < 356; y += 7) streg(c, "rgba(255,255,255,0.06)", 2.2, 360, y + 10, 480, y);
  c.fillStyle = vandret(c, 372, 472, [[0, "rgba(255,255,255,0)"], [0.75, "rgba(255,255,255,0.08)"], [1, "rgba(255,255,255,0)"]]); c.fill(greb);
  c.restore();
  // Aftrækkerbøjlen og aftrækkeren
  c.lineCap = "round";
  streg(c, "#1a1d22", 11, 472, 232, 476, 268, 492, 282, 548, 282, 564, 270, 572, 236);
  streg(c, "rgba(255,255,255,0.14)", 2, 478, 270, 492, 278, 546, 278);
  c.fillStyle = lodret(c, 230, 268, METAL);
  c.beginPath(); c.moveTo(516, 232); c.quadraticCurveTo(526, 252, 512, 268); c.lineTo(505, 266); c.quadraticCurveTo(516, 250, 507, 232); c.closePath(); c.fill();
  // Holderen til energicellen (med en orange udløserknap)
  del(c, form(568, 212, 650, 212, 650, 240, 576, 242), 212, 242, GRAFIT);
  del(c, rund(626, 240, 18, 8, 3), 240, 248, [[0, "#ffb45a"], [1, "#d0601a"]]);

  // Løbskappen med et vindue ind til de lysende spoler
  const kappe = form(646, 124, 914, 124, 930, 136, 930, 190, 914, 200, 646, 200);
  del(c, kappe, 124, 200, GRAFIT);
  streg(c, "rgba(255,255,255,0.28)", 1.4, 650, 127, 912, 127);
  for (const x of VENTILER) { c.fillStyle = "#07080a"; c.fill(form(x, 141, x + 12, 129, x + 20, 129, x + 8, 141)); }
  const vindue = rund(668, 145, 242, 36, 10);
  c.fillStyle = "#05070a"; c.fill(vindue);
  c.save(); c.clip(vindue);
  for (const x of SPOLER) { c.fillStyle = lodret(c, 145, 181, [[0, "#3a1a08"], [0.28, "#d98b4a"], [0.42, "#f6c890"], [0.7, "#9a5226"], [1, "#2a1206"]]); c.fill(form(x, 145, x + 8, 145, x + 4, 181, x - 4, 181)); }
  c.fillStyle = lodret(c, 145, 181, [[0, "rgba(255,255,255,0.22)"], [0.4, "rgba(255,255,255,0.03)"], [1, "rgba(255,255,255,0)"]]); c.fill(vindue);
  c.restore();
  c.lineWidth = 2.4; c.strokeStyle = "#0b0d10"; c.stroke(vindue);
  del(c, rund(652, 200, 214, 11, 3), 200, 211, GRAFIT);
  for (let x = 660; x < 860; x += 13) { c.fillStyle = "rgba(255,255,255,0.1)"; c.fillRect(x, 202, 6, 3); }

  // Emitteren foran: et hus, en metalring og to hvide "gafler"
  del(c, form(914, 126, 962, 138, 962, 182, 914, 198), 126, 198, [[0, "#646c78"], [0.2, "#3d434c"], [1, "#1a1d22"]]);
  del(c, form(944, 130, 1000, 142, 1000, 151, 960, 150), 130, 151, HVID, "rgba(60,66,76,0.9)");
  del(c, form(944, 190, 1000, 178, 1000, 169, 960, 170), 169, 190, HVID, "rgba(60,66,76,0.9)");
  c.fillStyle = lodret(c, 138, 182, METAL); c.beginPath(); c.ellipse(962, 160, 7, 22, 0, 0, 7); c.fill();
  c.fillStyle = "#081820"; c.beginPath(); c.ellipse(966, 160, 4, 14, 0, 0, 7); c.fill();

  // Den hvide skal ovenpå (med en mørk rille, hvor lysstriben sidder)
  const skal = form(252, 112, 614, 112, 658, 140, 658, 182, 606, 192, 300, 192, 262, 180, 240, 142);
  del(c, skal, 112, 192, HVID, "rgba(60,66,76,0.95)");
  streg(c, "rgba(255,255,255,0.95)", 1.6, 256, 114, 612, 114);
  c.fillStyle = "#151a22"; c.fill(rund(272, 175, 372, 8, 3));
  streg(c, "rgba(80,90,104,0.7)", 1.4, 334, 114, 334, 172);
  streg(c, "rgba(80,90,104,0.7)", 1.4, 528, 114, 528, 172);
  streg(c, "rgba(80,90,104,0.7)", 1.4, 590, 114, 622, 172);
  // Skærmen (tallet tegnes hvert billede) og skruerne
  const skærm = rund(290, 126, 94, 38, 7);
  c.fillStyle = "#061017"; c.fill(skærm); c.lineWidth = 2; c.strokeStyle = "#7f8894"; c.stroke(skærm);
  for (const [x, y] of [[268, 130], [268, 166], [640, 148], [640, 170], [512, 128], [556, 128]]) skrue(c, x, y);
  // Påskrift og en orange advarselsmærkat
  c.fillStyle = "#5f6874"; c.font = "800 17px system-ui, sans-serif"; c.fillText("XR-7", 540, 166);
  c.font = "700 9px system-ui, sans-serif"; c.fillText("PULS · LASER", 400, 168);
  c.fillStyle = "#ff8a2a"; c.fill(form(866, 186, 896, 186, 892, 196, 870, 196));
  c.fillStyle = "#1a1d22"; for (let i = 0; i < 3; i++) c.fill(form(872 + i * 8, 186, 876 + i * 8, 186, 872 + i * 8, 196, 868 + i * 8, 196));

  // Skinnen på toppen og holografsigtet
  del(c, rund(300, 100, 310, 13, 2), 100, 113, GRAFIT);
  for (let x = 306; x < 604; x += 14) { c.fillStyle = "#6b737e"; c.fillRect(x, 100, 7, 3.5); }
  del(c, form(424, 101, 566, 101, 560, 86, 430, 86), 86, 101, GRAFIT);
  const hætte = form(438, 88, 452, 44, 548, 44, 558, 88);
  del(c, hætte, 44, 88, GRAFIT);
  const glas = form(458, 82, 466, 54, 536, 54, 542, 82);
  c.fillStyle = lodret(c, 54, 82, [[0, "#12303a"], [1, "#081820"]]); c.fill(glas);
  c.save(); c.clip(glas); c.fillStyle = "rgba(255,255,255,0.14)"; c.fill(form(470, 54, 490, 54, 470, 82, 452, 82)); c.restore();
  streg(c, "rgba(255,255,255,0.3)", 1.2, 454, 46, 546, 46);
  return lær;
}

// ---------- Energicellen (tegnes én gang; væsken tegnes hvert billede) ----------
export function lavCelle(k) {
  const lær = document.createElement("canvas");
  lær.width = Math.ceil(CELLE.b * k); lær.height = Math.ceil(CELLE.h * k);
  const c = lær.getContext("2d"); c.scale(k, k);
  const top = rund(0, 0, 50, 18, 6), bund = rund(0, 92, 50, 20, 7), glas = rund(5, 14, 40, 82, 14);
  c.fillStyle = "rgba(20,48,58,0.85)"; c.fill(glas); c.lineWidth = 1.5; c.strokeStyle = "rgba(190,235,255,0.55)"; c.stroke(glas);
  c.fillStyle = vandret(c, 0, 50, METAL); c.fill(top); c.fill(bund);
  c.strokeStyle = "rgba(0,0,0,0.6)"; c.lineWidth = 1.2; c.stroke(top); c.stroke(bund);
  streg(c, "rgba(0,0,0,0.5)", 1.4, 2, 101, 48, 101);
  c.fillStyle = "#ff8a2a"; c.fillRect(20, 4, 10, 5);
  return lær;
}
// Cellen tegnet med væske (niveau 0..1). Bruges både i geværet og når den falder ned på bordet.
export function tegnCelle(c, billede, niveau, glød = 1) {
  c.drawImage(billede, -CELLE.b / 2, 0, CELLE.b, CELLE.h);
  if (niveau <= 0) return;
  const h = 76 * niveau, y = 17 + 76 - h;
  c.save(); c.globalCompositeOperation = "lighter";
  c.fillStyle = lodret(c, y, y + h, [[0, `rgba(150,245,255,${0.95 * glød})`], [1, `rgba(20,140,230,${0.8 * glød})`]]);
  c.fill(rund(-17, y, 34, h, Math.min(12, h / 2)));
  const g = c.createRadialGradient(0, y + h / 2, 0, 0, y + h / 2, 60);
  g.addColorStop(0, `rgba(60,200,255,${0.28 * glød})`); g.addColorStop(1, "rgba(60,200,255,0)");
  c.fillStyle = g; c.fillRect(-60, y + h / 2 - 60, 120, 120);
  c.restore();
}
export const CELLE_PLADS = CELLE;

// ---------- Det der lyser (hvert billede) ----------
// t = { puls 0..1 lige efter et skud, bølge 0..1 opladningen der løber mod mundingen, varme 0..1, tal, niveau 0..1, tid }
export function tegnLaserLys(c, t) {
  c.save(); c.globalCompositeOperation = "lighter";
  // Spolerne: svagt blå i ro, blændende efter et skud; en lysbølge løber frem før skuddet
  const vindue = rund(668, 145, 242, 36, 10);
  c.save(); c.clip(vindue);
  c.fillStyle = `rgba(40,170,255,${0.08 + t.puls * 0.45})`; c.fill(vindue);
  SPOLER.forEach((x, i) => {
    const pos = i / (SPOLER.length - 1), bølge = t.bølge > 0 ? Math.exp(-(((pos - t.bølge) * 5) ** 2)) : 0;
    const a = Math.min(1, 0.18 + 0.06 * Math.sin(t.tid * 5 + i) + t.puls * 0.8 + bølge * 0.9);
    c.fillStyle = `rgba(90,220,255,${a})`; c.fill(form(x, 145, x + 8, 145, x + 4, 181, x - 4, 181));
  });
  c.restore();
  // Varme: ventilerne gløder orange, og løbskappen bliver rødlig
  if (t.varme > 0.02) {
    for (const x of VENTILER) { c.fillStyle = `rgba(255,${120 - t.varme * 60},30,${t.varme})`; c.fill(form(x, 141, x + 12, 129, x + 20, 129, x + 8, 141)); }
    c.fillStyle = `rgba(255,80,20,${t.varme * 0.16})`; c.fill(form(646, 124, 914, 124, 930, 136, 930, 190, 914, 200, 646, 200));
  }
  // Linsen i emitteren
  const r = 22 + t.puls * 40, g = c.createRadialGradient(968, 160, 0, 968, 160, r);
  g.addColorStop(0, `rgba(230,255,255,${0.6 + t.puls * 0.4})`); g.addColorStop(0.3, `rgba(80,220,255,${0.35 + t.puls * 0.5})`); g.addColorStop(1, "rgba(40,160,255,0)");
  c.fillStyle = g; c.fillRect(968 - r, 160 - r, r * 2, r * 2);
  // Lysstriben langs siden
  c.fillStyle = `rgba(60,215,255,${0.55 + t.puls * 0.45})`; c.fill(rund(274, 177, 368, 4, 2));
  c.fillStyle = `rgba(60,215,255,${0.1 + t.puls * 0.2})`; c.fill(rund(268, 170, 380, 18, 9));
  // Rødpunktet i sigtet
  const p = c.createRadialGradient(500, 67, 0, 500, 67, 9);
  p.addColorStop(0, "rgba(255,230,230,1)"); p.addColorStop(0.3, "rgba(255,40,40,0.9)"); p.addColorStop(1, "rgba(255,0,0,0)");
  c.fillStyle = p; c.fillRect(490, 57, 20, 20);
  c.restore();
  // Skærmen: hvor mange skud der er tilbage, og en lille måler
  c.save();
  c.fillStyle = t.niveau < 0.2 ? "#ff6a4a" : "#6fe6ff"; c.font = "800 24px ui-monospace, Menlo, monospace"; c.textAlign = "center";
  c.fillText(String(t.tal).padStart(2, "0"), 337, 153);
  c.fillStyle = "rgba(111,230,255,0.25)"; c.fillRect(298, 156, 78, 4);
  c.fillStyle = t.niveau < 0.2 ? "#ff6a4a" : "#6fe6ff"; c.fillRect(298, 156, 78 * t.niveau, 4);
  c.restore();
}
