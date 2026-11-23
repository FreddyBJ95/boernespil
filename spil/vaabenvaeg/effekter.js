// ===== Effekterne: mundingsild, røg, gnister, sporlys, laserstråler og ting der falder på bordet =====
// Alt tegnes på et almindeligt 2D-lærred. Små billeder (ild, røg, hylstre) tegnes én gang og genbruges.
// Hylstre og magasiner, der er faldet til ro, males fast på bordet (et eget lag), så de ikke koster noget
// at tegne igen — derfor kan der ligge hundredvis af hylstre uden at spillet bliver tungt.

const tilfældig = (a, b) => a + Math.random() * (b - a);
function lærred(b, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(b)); c.height = Math.max(1, Math.ceil(h)); return c; }

// ---------- Mundingsilden (tegnes én gang i fire udgaver) ----------
// Billedet er 360 × 180, og mundingen sidder i (20, 90). Ilden peger mod højre.
export const GLIMT_MUNDING = [20, 90];
function flammetunge(g, x, y, a, L, w) {
  g.save(); g.translate(x, y); g.rotate(a);
  const lg = g.createLinearGradient(0, 0, L, 0);
  lg.addColorStop(0, "rgba(255,255,235,0.95)"); lg.addColorStop(0.22, "rgba(255,225,130,0.85)");
  lg.addColorStop(0.6, "rgba(255,135,35,0.45)"); lg.addColorStop(1, "rgba(255,60,0,0)");
  g.fillStyle = lg;
  g.beginPath(); g.moveTo(0, -w * 0.3); g.quadraticCurveTo(L * 0.35, -w, L, 0); g.quadraticCurveTo(L * 0.35, w, 0, w * 0.3); g.closePath(); g.fill();
  g.restore();
}
function lavGlimt() {
  const c = lærred(360, 180), g = c.getContext("2d"), [ox, oy] = GLIMT_MUNDING;
  g.globalCompositeOperation = "lighter";
  // Blød glød rundt om det hele
  const r = g.createRadialGradient(ox + 80, oy, 0, ox + 80, oy, 120);
  r.addColorStop(0, "rgba(255,190,90,0.5)"); r.addColorStop(0.5, "rgba(255,120,30,0.16)"); r.addColorStop(1, "rgba(255,80,0,0)");
  g.fillStyle = r; g.fillRect(0, 0, 360, 180);
  // Flammetunger fremad
  for (let i = 0; i < 9; i++) { const a = tilfældig(-0.3, 0.3); flammetunge(g, ox, oy, a, tilfældig(130, 330) * (1 - Math.abs(a)), tilfældig(10, 24)); }
  // Sideflammer fra flammedæmperens slidser (giver den stjerneform, man ser på fotos)
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) flammetunge(g, ox + 6 + i * 12, oy, s * tilfældig(0.95, 1.35), tilfældig(40, 80), tilfældig(6, 10));
  // Den hvide kerne lige ved mundingen
  const k = g.createRadialGradient(ox + 30, oy, 0, ox + 30, oy, 46);
  k.addColorStop(0, "rgba(255,255,255,1)"); k.addColorStop(0.4, "rgba(255,245,200,0.8)"); k.addColorStop(1, "rgba(255,200,80,0)");
  g.fillStyle = k; g.save(); g.translate(ox + 30, oy); g.scale(1, 0.42); g.translate(-ox - 30, -oy); g.fillRect(0, 0, 360, 180); g.restore();
  return c;
}

// ---------- Røg ----------
function lavRøg() {
  const c = lærred(128, 128), g = c.getContext("2d");
  for (let i = 0; i < 8; i++) {
    const x = 64 + tilfældig(-22, 22), y = 64 + tilfældig(-22, 22), rr = tilfældig(22, 40);
    const rg = g.createRadialGradient(x, y, 0, x, y, rr);
    rg.addColorStop(0, "rgba(220,220,228,0.3)"); rg.addColorStop(1, "rgba(220,220,228,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  }
  return c;
}

let glimtBilleder = null, røgBilleder = null;
function sørgForBilleder() {
  if (glimtBilleder) return;
  glimtBilleder = [lavGlimt(), lavGlimt(), lavGlimt(), lavGlimt()];
  røgBilleder = [lavRøg(), lavRøg(), lavRøg()];
}

// ---------- Hylstre ----------
// Mål i millimeter: længde, tykkelse, halsens tykkelse og hvor skulderen begynder.
// Lige pistolhylstre har ingen skulder: halsen er næsten lige så tyk som kroppen.
const HYLSTRE = {
  "556": { l: 44.7, d: 9.6, hals: 6.4, skulder: 36 },      // riffelpatron (M4, M249)
  "762": { l: 38.6, d: 11.35, hals: 8.6, skulder: 30.5 },  // AK-47
  "9mm": { l: 19.15, d: 9.96, hals: 9.6, skulder: 16.5 },  // pistoler og maskinpistol
  "50ae": { l: 32.6, d: 13.9, hals: 13.6, skulder: 30 },   // Desert Eagle
};
export const hylsterMål = slags => HYLSTRE[slags];
// Tegner et messinghylster fra siden: bunden til venstre, mundingen til højre
export function lavHylster(slags, pxMm) {
  const M = HYLSTRE[slags], k = pxMm, b = M.l * k, h = M.d * k, c = lærred(b + 2, h + 2), g = c.getContext("2d");
  g.translate(1, 1);
  const midt = h / 2, halv = d => d * k / 2;
  const p = new Path2D();
  p.moveTo(0, 0); p.lineTo(1.1 * k, 0);                               // randen
  p.lineTo(1.1 * k, midt - halv(M.d * 0.82)); p.lineTo(2.3 * k, midt - halv(M.d * 0.82));   // rillen
  p.lineTo(2.8 * k, midt - halv(M.d)); p.lineTo(M.skulder * k, midt - halv(M.d * 0.94));   // kroppen (smalner lidt)
  p.lineTo((M.skulder + 2.6) * k, midt - halv(M.hals)); p.lineTo(b, midt - halv(M.hals));  // skulder og hals
  p.lineTo(b, midt + halv(M.hals)); p.lineTo((M.skulder + 2.6) * k, midt + halv(M.hals));
  p.lineTo(M.skulder * k, midt + halv(M.d * 0.94)); p.lineTo(2.8 * k, midt + halv(M.d));
  p.lineTo(2.3 * k, midt + halv(M.d * 0.82)); p.lineTo(1.1 * k, midt + halv(M.d * 0.82)); p.lineTo(1.1 * k, h); p.lineTo(0, h);
  p.closePath();
  // Messing: mørkt i kanterne og et lyst skær lidt over midten (som en rund cylinder)
  const lg = g.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, "#5e400f"); lg.addColorStop(0.2, "#f9e08f"); lg.addColorStop(0.36, "#e2b24c");
  lg.addColorStop(0.7, "#9a6c22"); lg.addColorStop(1, "#4a3208");
  g.fillStyle = lg; g.fill(p);
  // Mundingen er lidt mørkere (sod fra krudtet) og randen har en kant
  g.globalCompositeOperation = "source-atop";
  const sod = g.createLinearGradient(b - 7 * k, 0, b, 0); sod.addColorStop(0, "rgba(40,25,10,0)"); sod.addColorStop(1, "rgba(40,25,10,0.55)");
  g.fillStyle = sod; g.fillRect(b - 7 * k, 0, 7 * k, h);
  g.fillStyle = "rgba(60,40,10,0.5)"; g.fillRect(1.1 * k, 0, 0.5 * k, h);
  return { billede: c, b: b + 2, h: h + 2 };
}

// ---------- Bæltelænker (M249): et lille bøjet stålled ----------
export function lavLed(pxMm) {
  const k = pxMm, b = 14 * k, h = 11 * k, c = lærred(b + 2, h + 2), g = c.getContext("2d");
  g.translate(1, 1);
  const lg = g.createLinearGradient(0, 0, 0, h);
  lg.addColorStop(0, "#2a2c30"); lg.addColorStop(0.3, "#8c9097"); lg.addColorStop(0.6, "#3c3f44"); lg.addColorStop(1, "#141517");
  g.strokeStyle = lg; g.lineWidth = Math.max(1, 1.6 * k);
  // To bøjler, der holder om patronen, og en tunge imellem
  g.beginPath(); g.arc(b * 0.3, h * 0.55, h * 0.4, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
  g.beginPath(); g.arc(b * 0.72, h * 0.55, h * 0.4, Math.PI * 0.9, Math.PI * 2.1); g.stroke();
  g.fillStyle = lg; g.fillRect(b * 0.12, h * 0.78, b * 0.8, 1.6 * k);
  return { billede: c, b: b + 2, h: h + 2 };
}

// ---------- Energihylster (haglgeværet): en lille orange glascylinder med messingbund ----------
export function lavEnergiPatron(pxMm) {
  const k = pxMm, b = 30 * k, h = 13 * k, c = lærred(b + 2, h + 2), g = c.getContext("2d");
  g.translate(1, 1);
  const glas = g.createLinearGradient(0, 0, 0, h);
  glas.addColorStop(0, "#7a2a05"); glas.addColorStop(0.25, "#ffc07a"); glas.addColorStop(0.5, "#ff7a1a"); glas.addColorStop(1, "#5c1d02");
  g.fillStyle = glas; g.fillRect(b * 0.22, h * 0.06, b * 0.78, h * 0.88);
  const messing = g.createLinearGradient(0, 0, 0, h);
  messing.addColorStop(0, "#5e400f"); messing.addColorStop(0.25, "#f9e08f"); messing.addColorStop(0.6, "#b0802c"); messing.addColorStop(1, "#4a3208");
  g.fillStyle = messing; g.fillRect(0, 0, b * 0.24, h);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(b * 0.3, h * 0.2, b * 0.6, h * 0.1);
  return { billede: c, b: b + 2, h: h + 2 };
}

// ---------- Det der lever lige nu ----------
const glimt = [], røg = [], gnister = [], sporlys = [], stråler = [], ringe = [], lys = [], ting = [], kugler = [], lyn = [], blink = [];
let skærmB = 2000, skærmH = 2000;
let bord = null, bordG = null, bordTop = 0, bordDpr = 1, bordAntal = 0, tyngde = 4000;
// Kaldes når noget rammer bordet: (slags, styrke 0..1, x)
export let vedLanding = () => {};
export function sætVedLanding(f) { vedLanding = f; }
// Kaldes når et sci-fi-skud rammer skærmkanten ude til højre: (x, y, farve, størrelse)
let vedNedslag = () => {};
export function sætVedNedslag(f) { vedNedslag = f; }

// Gør bordlaget klar (når skærmen ændrer størrelse). Det der lå på bordet tegnes med over.
export function nytBord(W, H, dpr, top, g) {
  sørgForBilleder();
  tyngde = g; skærmB = W; skærmH = H;
  const gammelt = bord, gammelTop = bordTop;
  bord = lærred(W * dpr, (H - top) * dpr); bordG = bord.getContext("2d");
  bordTop = top; bordDpr = dpr;
  if (gammelt) bordG.drawImage(gammelt, 0, (gammelTop - top) * dpr);
}
// Når skærmen drejes, passer det der flyver ikke længere med bordet — så fjernes det
export function rydLuften() { for (const l of [glimt, røg, gnister, sporlys, stråler, ringe, lys, ting, kugler, lyn, blink]) l.length = 0; }
export function ryd() {
  for (const l of [glimt, røg, gnister, sporlys, stråler, ringe, lys, ting, kugler, lyn, blink]) l.length = 0;
  if (bordG) bordG.clearRect(0, 0, bord.width, bord.height);
  bordAntal = 0;
}

// ---------- At sætte effekter i gang ----------
export function mundingsild(x, y, vinkel, størrelse) {
  glimt.push({ b: glimtBilleder[Math.random() * 4 | 0], x, y, a: vinkel + tilfældig(-0.06, 0.06), s: størrelse * tilfældig(0.8, 1.2), vend: Math.random() < 0.5, liv: 0, maks: 0.055 });
}
export function lysglimt(x, y, radius, farve, styrke = 1, varighed = 0.09) {
  lys.push({ x, y, r: radius, farve, styrke, liv: 0, maks: varighed });
}
export function røgsky(x, y, størrelse, vx = 0, vy = 0, farve = null) {
  røg.push({ b: røgBilleder[Math.random() * 3 | 0], x, y, vx: vx + tilfældig(-15, 15), vy: vy + tilfældig(-10, 5), r: størrelse * tilfældig(0.6, 1), dr: størrelse * tilfældig(0.9, 1.6),
    rot: Math.random() * 6.3, vr: tilfældig(-0.6, 0.6), liv: 0, maks: tilfældig(1.2, 2.2), styrke: tilfældig(0.55, 0.85), farve });
}
export function gnistregn(x, y, vinkel, antal, fart, farve = "255,190,90") {
  for (let i = 0; i < antal; i++) {
    const a = vinkel + tilfældig(-0.5, 0.5), v = fart * tilfældig(0.4, 1);
    gnister.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, liv: 0, maks: tilfældig(0.08, 0.2), farve });
  }
}
export function sporkugle(x, y, vinkel, fart, farve = null, tyk = 4) { sporlys.push({ x, y, vx: Math.cos(vinkel) * fart, vy: Math.sin(vinkel) * fart, liv: 0, maks: 0.5, farve, tyk }); }
export function laserstråle(x, y, vinkel, tyk, farve) { stråler.push({ x, y, a: vinkel, tyk, farve, liv: 0, maks: 0.16 }); }
export function ring(x, y, vinkel, størrelse, farve, fart = 0, maks = 0.18) {
  ringe.push({ x, y, a: vinkel, r: størrelse * 0.2, dr: størrelse * 5 * 0.18 / maks, liv: 0, maks, farve, vx: Math.cos(vinkel) * fart, vy: Math.sin(vinkel) * fart });
}
// Hele skærmen blinker kort i en farve (de store sci-fi-skud)
export function skærmblink(farve, styrke = 0.3, varighed = 0.15, kant = false) { blink.push({ farve, styrke, liv: 0, maks: varighed, kant }); }
// Elektriske lyn: takkede streger, der springer ud fra et punkt og blafrer (tegnes på ny hvert billede)
export function lynild(x, y, vinkel, længde, farve, antal = 3, spredning = 1.2, varighed = 0.12) {
  for (let i = 0; i < antal; i++) lyn.push({ x, y, a: vinkel + tilfældig(-spredning, spredning), l: længde * tilfældig(0.5, 1), farve, liv: 0, maks: varighed * tilfældig(0.6, 1.2) });
}
// En lysende energikugle, der flyver af sted med en hale. tyngde > 0 = den falder i en bue (slim),
// og når den rammer bordet, bliver den til en klat, der males fast på bordet.
export function energikugle(o) {
  kugler.push(Object.assign({ vx: 0, vy: 0, r: 10, farve: "255,255,255", tyngde: 0, gulv: null, liv: 0, maks: 3, spor: [], knitter: false }, o));
}
// Et hylster, et magasin eller en energicelle, der falder ned på bordet.
// flad = de vinkler, tingen kan ligge stille i; glød = en farve, den lyser med (energicellen)
export function smid(o) {
  ting.push(Object.assign({ vx: 0, vy: 0, a: 0, va: 0, s: 1, ds: 0, sMaks: 1, flad: [0, Math.PI], lyd: "messing", ro: 0, glød: null }, o));
}

// ---------- Hvert billede ----------
export function opdater(dt) {
  for (const l of [glimt, gnister, sporlys, stråler, ringe, lys, lyn, blink]) {
    for (let i = l.length - 1; i >= 0; i--) { const e = l[i]; e.liv += dt; if (e.liv > e.maks) l.splice(i, 1); }
  }
  for (const g of gnister) { g.vy += tyngde * 0.15 * dt; g.x += g.vx * dt; g.y += g.vy * dt; }
  for (let i = sporlys.length - 1; i >= 0; i--) {
    const s = sporlys[i]; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.farve && s.x > skærmB) {   // energihagl rammer kanten: et lille sprøjt af gnister
      gnistregn(skærmB - 2, s.y, Math.PI + tilfældig(-0.8, 0.8), 4, 900, s.farve);
      lysglimt(skærmB, s.y, 70, s.farve, 0.8, 0.1); sporlys.splice(i, 1);
    }
  }
  for (const r of ringe) { r.r += r.dr * dt; r.x += r.vx * dt; r.y += r.vy * dt; }
  for (let i = kugler.length - 1; i >= 0; i--) {
    const k = kugler[i]; k.liv += dt;
    k.spor.push(k.x, k.y); if (k.spor.length > 16) k.spor.splice(0, 2);
    k.vy += k.tyngde * dt; k.x += k.vx * dt; k.y += k.vy * dt;
    if (k.knitter && Math.random() < dt * 40) gnistregn(k.x, k.y, Math.random() * 6.3, 2, 700, k.farve);
    if (k.knitter && Math.random() < dt * 25) lynild(k.x, k.y, Math.random() * 6.3, k.r * 3.2, k.farve, 2, 3.2, 0.07);
    if (k.gulv !== null && k.y >= k.gulv) {
      // Slimet sprøjter op til alle sider, når det rammer bordet
      klat(k.x, k.gulv, k.r, k.farve); vedLanding("slim", 1, k.x);
      for (let j = 0; j < 9; j++) { const a = -Math.PI / 2 + tilfældig(-1.3, 1.3), f = tilfældig(150, 520); gnister.push({ x: k.x, y: k.gulv, vx: Math.cos(a) * f, vy: Math.sin(a) * f, liv: 0, maks: tilfældig(0.25, 0.5), farve: k.farve, tyk: k.r * 0.35 }); }
      lysglimt(k.x, k.gulv, k.r * 6, k.farve, 0.7, 0.12);
      kugler.splice(i, 1); continue;
    }
    if (k.nedslag && k.x > skærmB - k.r * 0.5) { vedNedslag(skærmB - 4, k.y, k.farve, k.r); kugler.splice(i, 1); continue; }
    if (k.liv > k.maks || k.x > skærmB + 300 || k.x < -300 || k.y > skærmH + 300) kugler.splice(i, 1);
  }
  for (let i = røg.length - 1; i >= 0; i--) {
    const r = røg[i]; r.liv += dt;
    if (r.liv > r.maks) { røg.splice(i, 1); continue; }
    const træk = Math.pow(0.12, dt); r.vx *= træk; r.vy = r.vy * træk - 26 * dt;   // røgen stiger
    r.x += r.vx * dt; r.y += r.vy * dt; r.r += r.dr * dt; r.dr *= Math.pow(0.3, dt); r.rot += r.vr * dt;
  }
  if (røg.length > 90) røg.splice(0, røg.length - 90);
  for (let i = ting.length - 1; i >= 0; i--) if (fald(ting[i], dt)) ting.splice(i, 1);
}
// Tyngdekraft, hop på bordet og til sidst: læg tingen ned og mal den fast på bordet
function fald(o, dt) {
  o.vy += tyngde * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt;
  if (o.ds) o.s = Math.min(o.sMaks, o.s + o.ds * dt);
  const ned = (Math.abs(Math.sin(o.a)) * o.b + Math.abs(Math.cos(o.a)) * o.h) * 0.5 * o.s;
  if (o.y + ned < o.gulv) return false;
  o.y = o.gulv - ned;
  if (o.vy > 0) {
    const fart = o.vy;
    if (fart > 110) vedLanding(o.lyd, fart / 1100, o.x);
    o.vy = -fart * tilfældig(0.22, 0.42);
    o.vx *= 0.55; o.va = -o.va * 0.4 + tilfældig(-9, 9) * Math.min(1, fart / 700); o.ds = 0;
  }
  if (Math.abs(o.vy) < 80) {
    o.vy = 0; o.ro += dt; o.vx *= Math.pow(0.01, dt);
    // Drej den ned på siden (den nærmeste flade vinkel)
    let mål = o.flad[0], bedst = 9;
    for (const f of o.flad) for (const k of [-2, 0, 2]) { const v = f + k * Math.PI, d = Math.abs(v - o.a); if (d < bedst) { bedst = d; mål = v; } }
    o.a += (mål - o.a) * Math.min(1, dt * 12); o.va *= Math.pow(0.001, dt);
    if (o.ro > 0.3 && Math.abs(o.vx) < 10) { malPåBordet(o); return true; }
  }
  return false;
}
function malPåBordet(o) {
  if (!bordG) return;
  if (++bordAntal > 500) {   // når bordet er helt fyldt, falmer de ældste lidt væk
    bordG.save(); bordG.globalCompositeOperation = "destination-out"; bordG.fillStyle = "rgba(0,0,0,0.45)"; bordG.fillRect(0, 0, bord.width, bord.height); bordG.restore();
    bordAntal = 280;
  }
  bordG.save(); bordG.setTransform(bordDpr, 0, 0, bordDpr, 0, -bordTop * bordDpr);
  tegnTing(bordG, o, true);
  bordG.restore();
}
// En klat slim, der er landet: en flad, blank plet med små dråber rundt om
function klat(x, y, r, farve) {
  if (!bordG) return;
  bordG.save(); bordG.setTransform(bordDpr, 0, 0, bordDpr, 0, -bordTop * bordDpr);
  bordG.fillStyle = `rgba(${farve},0.75)`;
  bordG.beginPath(); bordG.ellipse(x, y, r * 1.6, r * 0.45, 0, 0, Math.PI * 2); bordG.fill();
  for (let i = 0; i < 6; i++) { bordG.beginPath(); bordG.ellipse(x + tilfældig(-3, 3) * r, y + tilfældig(-0.5, 0.5) * r, r * 0.25, r * 0.09, 0, 0, Math.PI * 2); bordG.fill(); }
  bordG.fillStyle = "rgba(255,255,255,0.35)"; bordG.beginPath(); bordG.ellipse(x - r * 0.4, y - r * 0.12, r * 0.5, r * 0.08, 0, 0, Math.PI * 2); bordG.fill();
  bordG.restore();
  if (++bordAntal > 500) bordAntal = 500;
}
// Et brændemærke fra lysværdet: en sort, svedet plet med en mørk revne i midten
export function brændemærke(x, y, r) {
  if (!bordG) return;
  bordG.save(); bordG.setTransform(bordDpr, 0, 0, bordDpr, 0, -bordTop * bordDpr);
  bordG.translate(x, y); bordG.scale(1, 0.32);
  const g = bordG.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, "rgba(8,4,2,0.95)"); g.addColorStop(0.45, "rgba(25,12,5,0.6)"); g.addColorStop(1, "rgba(40,20,8,0)");
  bordG.fillStyle = g; bordG.fillRect(-r, -r, r * 2, r * 2);
  bordG.fillStyle = "rgba(0,0,0,0.9)";
  bordG.beginPath(); bordG.ellipse(0, 0, r * 0.6, r * 0.14, 0, 0, Math.PI * 2); bordG.fill();
  bordG.restore();
  if (++bordAntal > 500) bordAntal = 500;
}
function tegnTing(c, o, påBordet = false) {
  c.save(); c.translate(o.x, o.y); c.rotate(o.a); c.scale(o.s, o.s);
  c.drawImage(o.billede, -o.b / 2, -o.h / 2, o.b, o.h);
  if (o.glød) {
    c.globalCompositeOperation = "lighter";
    const r = Math.max(o.b, o.h) * 0.9, g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${o.glød},${påBordet ? 0.12 : 0.3})`); g.addColorStop(1, `rgba(${o.glød},0)`);
    c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2);
  }
  c.restore();
}

// ---------- Tegning ----------
// Bordlaget (alt der ligger stille) — tegnes bag våbnet
export function tegnBord(c) { if (bord) c.drawImage(bord, 0, bordTop, bord.width / bordDpr, bord.height / bordDpr); }

// Alt det levende — tegnes foran våbnet
export function tegnForan(c, W) {
  // Røg (almindelig blanding)
  for (const r of røg) {
    const t = r.liv / r.maks, a = r.styrke * Math.min(1, r.liv * 12) * (1 - t) * (1 - t);
    c.globalAlpha = a; c.save(); c.translate(r.x, r.y); c.rotate(r.rot);
    c.drawImage(r.b, -r.r, -r.r, r.r * 2, r.r * 2); c.restore();
  }
  c.globalAlpha = 1;
  // Hylstre og andet, der flyver
  for (const o of ting) tegnTing(c, o);
  // Lys og ild lægges oven i (lighter = farverne lægges sammen og bliver lysere)
  c.globalCompositeOperation = "lighter";
  for (const l of lys) {
    const a = l.styrke * (1 - l.liv / l.maks), g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, `rgba(${l.farve},${0.55 * a})`); g.addColorStop(0.35, `rgba(${l.farve},${0.2 * a})`); g.addColorStop(1, `rgba(${l.farve},0)`);
    c.fillStyle = g; c.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  for (const s of stråler) tegnStråle(c, s, W);
  for (const k of kugler) tegnKugle(c, k);
  for (const l of lyn) tegnLyn(c, l);
  for (const b of blink) {
    const a = b.styrke * (1 - b.liv / b.maks) ** 2;
    if (b.kant) {   // farvet lys fra kanterne og ind (som når man bliver blændet)
      const g = c.createRadialGradient(skærmB / 2, skærmH / 2, Math.min(skærmB, skærmH) * 0.25, skærmB / 2, skærmH / 2, Math.max(skærmB, skærmH) * 0.75);
      g.addColorStop(0, `rgba(${b.farve},0)`); g.addColorStop(1, `rgba(${b.farve},${a})`);
      c.fillStyle = g;
    } else c.fillStyle = `rgba(${b.farve},${a})`;
    c.fillRect(-50, -50, skærmB + 100, skærmH + 100);
  }
  for (const r of ringe) {
    const a = 1 - r.liv / r.maks;
    c.save(); c.translate(r.x, r.y); c.rotate(r.a); c.scale(0.35, 1);
    c.strokeStyle = `rgba(${r.farve},${0.85 * a})`; c.lineWidth = (5 + r.r * 0.06) * a + 1;
    c.beginPath(); c.arc(0, 0, r.r, 0, Math.PI * 2); c.stroke(); c.restore();
  }
  for (const g of glimt) {
    const t = g.liv / g.maks, [ox, oy] = GLIMT_MUNDING;
    c.globalAlpha = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
    c.save(); c.translate(g.x, g.y); c.rotate(g.a); c.scale(g.s, g.vend ? -g.s : g.s);
    c.drawImage(g.b, -ox, -oy); c.restore();
  }
  c.globalAlpha = 1;
  c.lineCap = "round";
  for (const s of sporlys) {
    const l = 0.05, g = c.createLinearGradient(s.x, s.y, s.x - s.vx * l, s.y - s.vy * l);
    if (s.farve) { g.addColorStop(0, "rgba(255,250,230,1)"); g.addColorStop(0.3, `rgba(${s.farve},0.85)`); g.addColorStop(1, `rgba(${s.farve},0)`); }
    else { g.addColorStop(0, "rgba(255,240,200,1)"); g.addColorStop(0.3, "rgba(255,120,40,0.8)"); g.addColorStop(1, "rgba(255,60,20,0)"); }
    c.strokeStyle = g; c.lineWidth = s.tyk; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * l, s.y - s.vy * l); c.stroke();
  }
  for (const g of gnister) {
    const a = 1 - g.liv / g.maks;
    c.strokeStyle = `rgba(${g.farve},${a})`; c.lineWidth = g.tyk || 2;
    c.beginPath(); c.moveTo(g.x, g.y); c.lineTo(g.x - g.vx * 0.014, g.y - g.vy * 0.014); c.stroke();
  }
  c.globalCompositeOperation = "source-over";
}

// Et lyn: en takket linje med en bred, farvet glød og en tynd, hvid kerne
function tegnLyn(c, l) {
  const a = 1 - l.liv / l.maks, n = 7, pkt = [l.x, l.y];
  let x = l.x, y = l.y;
  for (let i = 1; i <= n; i++) {
    const d = l.l / n, vin = l.a + tilfældig(-0.9, 0.9);
    x += Math.cos(vin) * d; y += Math.sin(vin) * d; pkt.push(x, y);
  }
  c.lineJoin = "round"; c.lineCap = "round";
  for (const [b, farve] of [[7, `rgba(${l.farve},${0.35 * a})`], [3, `rgba(${l.farve},${0.9 * a})`], [1.2, `rgba(255,255,255,${a})`]]) {
    c.strokeStyle = farve; c.lineWidth = b; c.beginPath(); c.moveTo(pkt[0], pkt[1]);
    for (let i = 2; i < pkt.length; i += 2) c.lineTo(pkt[i], pkt[i + 1]);
    c.stroke();
  }
}
// En energikugle: en hale af lys bagved og en hvid kerne med farvet glød
function tegnKugle(c, k) {
  const sp = k.spor;
  if (sp.length >= 4) {
    c.lineCap = "round";
    for (let i = 2; i < sp.length; i += 2) {
      const a = i / sp.length;
      c.strokeStyle = `rgba(${k.farve},${0.5 * a})`; c.lineWidth = k.r * 1.4 * a;
      c.beginPath(); c.moveTo(sp[i - 2], sp[i - 1]); c.lineTo(sp[i], sp[i + 1]); c.stroke();
    }
  }
  const g = c.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.r * 2.4);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, `rgba(${k.farve},0.95)`); g.addColorStop(0.5, `rgba(${k.farve},0.35)`); g.addColorStop(1, `rgba(${k.farve},0)`);
  c.fillStyle = g; c.fillRect(k.x - k.r * 2.4, k.y - k.r * 2.4, k.r * 4.8, k.r * 4.8);
}

// En laserstråle: bred svag glød, en lysere midte og en næsten hvid kerne. Den skyder hurtigt ud over skærmen.
function tegnStråle(c, s, W) {
  const t = s.liv / s.maks, a = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75, L = Math.min(W * 1.6, s.liv * 16000 + 60);
  c.save(); c.translate(s.x, s.y); c.rotate(s.a);
  const lag = [[s.tyk * 7, 0.16], [s.tyk * 3.2, 0.4], [s.tyk * 1.4, 0.8]];
  for (const [b, styrke] of lag) {
    c.fillStyle = `rgba(${s.farve},${styrke * a})`;
    c.beginPath(); c.moveTo(0, -b * 0.3); c.lineTo(L, -b / 2); c.lineTo(L, b / 2); c.lineTo(0, b * 0.3); c.closePath(); c.fill();
  }
  c.fillStyle = `rgba(255,255,255,${0.95 * a})`; c.fillRect(0, -s.tyk * 0.3, L, s.tyk * 0.6);
  c.restore();
}

// Hvor meget der er i gang (til prøver)
export const tæl = () => ({ kugler: kugler.length, glimt: glimt.length, røg: røg.length, gnister: gnister.length, ting: ting.length, påBordet: bordAntal });
