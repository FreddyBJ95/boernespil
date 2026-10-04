// ===== Skins: mønstre på våbnene (låses op med udfordringerne i profil.js) =====
// Hvert skin tegner et mønster på et lærred. Mønsteret lægges oven på våbnets bagte farvebillede fra Blender:
// mønsterets farve, ganget med våbnets lys og skygge (så kanter og krogene stadig kan ses).
// Nogle skins lyser (lava, lyn, gift, galakse), og guld og kobber er blankt metal.

import * as THREE from "./three.js";

const S = 512;                                                     // mønsterets størrelse (gentages hen over våbnet)
// En lille tilfældighedsgenerator med frø, så et skin ser ens ud hver gang
const tilfældig = frø => () => { frø = (frø * 16807) % 2147483647; return (frø - 1) / 2147483646; };
// Bløde klatter (til camo og tåge)
function klatter(g, farver, antal, min, maks, frø, slør = 18) {
  const r = tilfældig(frø);
  g.filter = `blur(${slør}px)`;
  for (let i = 0; i < antal; i++) { g.fillStyle = farver[Math.floor(r() * farver.length)]; g.beginPath(); g.arc(r() * S, r() * S, min + r() * (maks - min), 0, Math.PI * 2); g.fill(); }
  g.filter = "none";
}
// Takkede linjer (revner og lyn)
function linjer(g, farve, antal, bredde, frø, længde = 14) {
  const r = tilfældig(frø);
  g.strokeStyle = farve; g.lineWidth = bredde; g.lineCap = "round";
  for (let i = 0; i < antal; i++) {
    let x = r() * S, y = r() * S, v = r() * Math.PI * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < længde; j++) { v += (r() - 0.5) * 1.6; x += Math.cos(v) * 22; y += Math.sin(v) * 22; g.lineTo(x, y); }
    g.stroke();
  }
}
const fyld = (g, farve) => { g.fillStyle = farve; g.fillRect(0, 0, S, S); };

export const SKINS = {
  standard: { navn: "Standard", sjælden: "almindelig" },
  tiger: { navn: "Tiger", sjælden: "sjælden", mønster: g => {
    fyld(g, "#e8862a"); const r = tilfældig(7); g.fillStyle = "#1a120a";
    for (let i = 0; i < 26; i++) { const y = r() * S, t = 8 + r() * 16; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= S; x += 16) g.lineTo(x, y + Math.sin(x / 40 + i) * 14 + (r() - 0.5) * 6);
      for (let x = S; x >= 0; x -= 16) g.lineTo(x, y + t + Math.sin(x / 33 + i) * 10); g.fill(); }
  } },
  rubin: { navn: "Rubin", sjælden: "sjælden", mønster: g => {
    fyld(g, "#8a0a1e"); const r = tilfældig(11);
    for (let i = 0; i < 220; i++) { g.fillStyle = `hsl(${348 + r() * 14}, 85%, ${22 + r() * 30}%)`; g.beginPath();
      const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + 30 + r() * 30, y + r() * 30); g.lineTo(x + r() * 30, y + 30 + r() * 30); g.fill(); }
  }, ru: 0.25 },
  ørken: { navn: "Ørken", sjælden: "usædvanlig", mønster: g => { fyld(g, "#c8a878"); klatter(g, ["#a07848", "#7a5a38", "#e0c898"], 70, 20, 60, 3); } },
  kobber: { navn: "Kobber", sjælden: "episk", mønster: g => { fyld(g, "#b8683a"); klatter(g, ["#d88a52", "#8a4a28", "#5a8a7a"], 50, 8, 30, 5, 10); }, metal: 0.9, ru: 0.32 },
  is: { navn: "Is", sjælden: "episk", mønster: g => { fyld(g, "#bfe4f4"); klatter(g, ["#e8f8ff", "#8ac4e0"], 40, 20, 70, 13); linjer(g, "rgba(255,255,255,0.9)", 24, 2, 17, 8); }, ru: 0.15 },
  guld: { navn: "Guld", sjælden: "legendarisk", mønster: g => {
    const v = g.createLinearGradient(0, 0, S, S); v.addColorStop(0, "#f4d060"); v.addColorStop(0.5, "#c89428"); v.addColorStop(1, "#f8e090");
    g.fillStyle = v; g.fillRect(0, 0, S, S);
  }, metal: 0.85, ru: 0.3, lys: 1.55 },
  nat: { navn: "Nat", sjælden: "episk", mønster: g => {
    fyld(g, "#141a2a"); const r = tilfældig(19);
    for (let i = 0; i < 260; i++) { g.fillStyle = ["#1e2a44", "#0a0e18", "#2a3858"][Math.floor(r() * 3)]; const s = 12 + Math.floor(r() * 3) * 12; g.fillRect(Math.floor(r() * S / 12) * 12, Math.floor(r() * S / 12) * 12, s, s); }
  } },
  lyn: { navn: "Lyn", sjælden: "episk", mønster: g => { fyld(g, "#241238"); klatter(g, ["#3a1a5a", "#120820"], 30, 30, 80, 23); },
    glød: g => linjer(g, "#5af0ff", 16, 3, 29, 16) },
  gift: { navn: "Gift", sjælden: "episk", mønster: g => { fyld(g, "#2a5a14"); klatter(g, ["#3a7a1a", "#1a3a0a"], 50, 15, 50, 31); },
    glød: g => { const r = tilfældig(37); g.fillStyle = "#8aff3a"; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * S, r() * S, 3 + r() * 9, 0, Math.PI * 2); g.fill(); } } },
  lava: { navn: "Lava", sjælden: "legendarisk", mønster: g => { fyld(g, "#1a1210"); klatter(g, ["#2a1a14", "#0a0806"], 40, 20, 60, 41); },
    glød: g => { linjer(g, "#ff6a10", 30, 5, 43, 10); linjer(g, "#ffd040", 30, 1.5, 43, 10); } },
  galakse: { navn: "Galakse", sjælden: "legendarisk", mønster: g => { fyld(g, "#100828"); klatter(g, ["#4a1a7a", "#1a3a8a", "#8a2a7a", "#0a0418"], 60, 30, 90, 47, 26); },
    glød: g => { const r = tilfældig(53); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.fillRect(r() * S, r() * S, 1 + r() * 2.4, 1 + r() * 2.4); } } },
};

// Et lærred med skinnets mønster (og et med det, der lyser) — laves kun én gang pr. skin
const mønstre = new Map();
function mønster(id) {
  if (mønstre.has(id)) return mønstre.get(id);
  const sk = SKINS[id], lav = tegn => { const c = document.createElement("canvas"); c.width = c.height = S; tegn(c.getContext("2d")); return c; };
  const m = { farve: lav(sk.mønster), glød: sk.glød ? lav(g => { fyld(g, "#000"); sk.glød(g); }) : null };
  mønstre.set(id, m); return m;
}

// Våbnets farvebillede med skinnet lagt på: mønsterets farve × våbnets lys og skygge.
// Gemmes, så hvert billede kun laves én gang pr. skin
const færdige = new Map();
function påførBillede(orig, id) {
  const nøgle = orig.uuid + id;
  if (færdige.has(nøgle)) return færdige.get(nøgle);
  const img = orig.image, w = img.width, h = img.height, c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, w, h);
  const o = g.getImageData(0, 0, w, h), od = o.data;
  // gennemsnittet af lyset, så både sorte og lyse dele får mønsteret (skyggerne i krogene bliver)
  let sum = 0, antal = 0;
  for (let i = 0; i < od.length; i += 64) { const l = od[i] * 0.3 + od[i + 1] * 0.59 + od[i + 2] * 0.11; if (l > 3) { sum += l; antal++; } }
  const midt = antal ? sum / antal : 80, lys = SKINS[id].lys || 1;
  g.fillStyle = g.createPattern(mønster(id).farve, "repeat"); g.fillRect(0, 0, w, h);
  const m = g.getImageData(0, 0, w, h), md = m.data;
  for (let i = 0; i < od.length; i += 4) {
    const l = od[i] * 0.3 + od[i + 1] * 0.59 + od[i + 2] * 0.11, f = Math.max(0.3, Math.min(1.35, 0.85 + (l - midt) / 255 * 1.8)) * lys;
    md[i] = Math.min(255, md[i] * f); md[i + 1] = Math.min(255, md[i + 1] * f); md[i + 2] = Math.min(255, md[i + 2] * f);
  }
  g.putImageData(m, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = orig.flipY; t.anisotropy = 4;
  færdige.set(nøgle, t); return t;
}
const glødBilleder = new Map();
function glødBillede(id, flipY) {
  const nøgle = id + flipY;
  if (!glødBilleder.has(nøgle)) { const t = new THREE.CanvasTexture(mønster(id).glød); t.colorSpace = THREE.SRGBColorSpace; t.flipY = flipY; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); glødBilleder.set(nøgle, t); }
  return glødBilleder.get(nøgle);
}

// Sæt et skin på en model (et våben fra Blender) — hænderne får ikke skinnet. "standard" sætter det oprindelige tilbage.
// Materialerne kopieres første gang, så andre, der bruger samme model, ikke får skinnet med
export function sætSkin(model, id = "standard") {
  if (!model) return;
  model.traverse(o => {
    if (!o.isMesh || o.name.startsWith("hænder") || o.parent?.name?.startsWith("hænder")) return;
    if (!o.userData.egetMat) { o.material = o.material.clone(); o.userData.egetMat = true; o.userData.orig = { map: o.material.map, metal: o.material.metalness, ru: o.material.roughness, metalMap: o.material.metalnessMap, ruMap: o.material.roughnessMap }; }
    const m = o.material, orig = o.userData.orig, sk = SKINS[id];
    m.map = orig.map; m.metalness = orig.metal; m.roughness = orig.ru; m.metalnessMap = orig.metalMap; m.roughnessMap = orig.ruMap;
    m.emissive?.set(0x000000); m.emissiveMap = null;
    if (sk?.mønster && orig.map?.image) {
      m.map = påførBillede(orig.map, id);
      if (sk.metal !== undefined) { m.metalness = sk.metal; m.metalnessMap = null; }
      if (sk.ru !== undefined) { m.roughness = sk.ru; m.roughnessMap = null; }
      if (sk.glød) { m.emissiveMap = glødBillede(id, orig.map.flipY); m.emissive.set(0xffffff); m.emissiveIntensity = 1.4; }
    }
    m.needsUpdate = true;
  });
}

// Et lille billede af mønsteret (til menuen)
export function skinBillede(id) {
  if (!SKINS[id]?.mønster) return "";
  const c = document.createElement("canvas"); c.width = c.height = 96;
  const g = c.getContext("2d"), m = mønster(id);
  g.drawImage(m.farve, 0, 0, 160, 160, 0, 0, 96, 96);
  if (m.glød) { g.globalCompositeOperation = "lighter"; g.drawImage(m.glød, 0, 0, 160, 160, 0, 0, 96, 96); }
  return c.toDataURL("image/jpeg", 0.85);
}
