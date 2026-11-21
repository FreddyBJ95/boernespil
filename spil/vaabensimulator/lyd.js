// ===== Lydene =====
// Skuddene laves af lag, som en rigtig optagelse: et skarpt knald, en krop af larm, et dybt bump i maven,
// efterklang og et ekko fra kuglefanget (12 m væk) — og for de store våben et rullende ekko fra bakkerne.
// Mekanikken (slæde, magasin, pumpe, bundstykke) er små klik og metalklang. Hylstrene klirrer på bordet.
// Lyssværdet brummer og skifter tone, når man svinger det. Ildsværdet bruger en rigtig optagelse af ild.
// Glas, plask og ild er CC0-optagelser fra Freesound, som Nedrivningsfirmaet også bruger (../nedrivning/lyde/).

let ctx = null, ud = null, våbenBus = null, rum = null, rumSend = null, støjBuf = null, brunBuf = null, knitreBuf = null;
let tændt = true;
const optagelser = {};

// ---------- Start (kræver et tryk fra barnet) ----------
export function start() {
  if (ctx) { if (ctx.state !== "running") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* ikke alle browsere */ }
  ctx = new AC();
  // Hovedkæden: alt → hovedstyrke → begrænser (så høje skud ikke knaser) → højttaler
  const komp = ctx.createDynamicsCompressor();
  komp.threshold.value = -12; komp.knee.value = 8; komp.ratio.value = 10; komp.attack.value = 0.002; komp.release.value = 0.18;
  ud = ctx.createGain(); ud.gain.value = tændt ? 0.9 : 0;
  ud.connect(komp); komp.connect(ctx.destination);
  // Våbnene går gennem en let forvrængning (giver knaldet "kant")
  const forvræng = ctx.createWaveShaper(); const kurve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; kurve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
  forvræng.curve = kurve; våbenBus = ctx.createGain(); våbenBus.gain.value = 0.8; våbenBus.connect(forvræng); forvræng.connect(ud);
  // Efterklang: et "rum" lavet af kode (tidlige ekkoer fra bord og planker + en hale der bliver mørkere)
  rum = ctx.createConvolver(); rum.buffer = lavRumklang(2.2); rumSend = ctx.createGain(); rumSend.gain.value = 0.5;
  rumSend.connect(rum); rum.connect(ud);
  // Støj til at bygge lyde af: hvid (sus), brun (rumlen) og knitren (ild)
  støjBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const s = støjBuf.getChannelData(0); for (let i = 0; i < s.length; i++) s[i] = Math.random() * 2 - 1;
  brunBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const b = brunBuf.getChannelData(0); let sidst = 0; for (let i = 0; i < b.length; i++) { sidst = (sidst + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = sidst * 3.5; }
  knitreBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const k = knitreBuf.getChannelData(0);
  for (let i = 0; i < 260; i++) { const p = Math.random() * (k.length - 600) | 0, a = Math.random() ** 2, l = 40 + Math.random() * 400 | 0; for (let j = 0; j < l; j++) k[p + j] += (Math.random() * 2 - 1) * a * Math.exp(-j / (l * 0.25)); }
  hentOptagelser();
  startNatur();
  if (ønsketSværd) sværdTænd(ønsketSværd.slags, ønsketSværd.farve);
}
export function sætLyd(på) { tændt = på; if (ud) ud.gain.setTargetAtTime(på ? 0.9 : 0, ctx.currentTime, 0.05); }
export const lydErTændt = () => tændt;

function hentOptagelser() {
  for (const n of ["glas", "glas2", "glas_fald", "plask", "ild", "metal", "trae_knaek", "gnist"]) {
    fetch(`../nedrivning/lyde/${n}.mp3`).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a)).then(buf => { optagelser[n] = n === "ild" ? sløjfe(buf) : buf; }).catch(() => {});
  }
}
// Gør en optagelse til en sløjfe uden klik: slutningen blandes ind over starten
function sløjfe(buf) {
  const over = Math.floor(buf.sampleRate * 0.6), n = buf.length - over;
  const ny = ctx.createBuffer(buf.numberOfChannels, n, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const a = buf.getChannelData(c), b = ny.getChannelData(c);
    for (let i = 0; i < n; i++) b[i] = a[i];
    for (let i = 0; i < over; i++) { const t = i / over; b[i] = a[i] * t + a[n + i] * (1 - t); }
  }
  return ny;
}

// Rumklangen: korte ekkoer fra bordet og plankerne + en sus, der dør ud og bliver mørkere
function lavRumklang(sek) {
  const sr = ctx.sampleRate, n = Math.floor(sr * sek), buf = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, k = 0.12 + t * 0.55;
      lp += (Math.random() * 2 - 1 - lp) * Math.max(0.02, 0.9 - t * 0.55);
      d[i] = lp * Math.exp(-t / 0.42) * 0.55 * Math.min(1, t / 0.01) * (1 - k * 0);
    }
    for (const [t, g] of [[0.009, 0.6], [0.021, 0.4], [0.034, 0.3], [0.071 + c * 0.004, 0.55], [0.15, 0.18]]) {
      const p = Math.floor(t * sr); for (let j = 0; j < 60; j++) d[p + j] += (Math.random() * 2 - 1) * g * Math.exp(-j / 12);
    }
  }
  return buf;
}

// ---------- Byggeklodser ----------
const nu = () => ctx.currentTime;
// En lydkæde med styrke og placering (pan: -1 venstre … 1 højre), som også sender til rumklangen
function kæde(styrke = 1, pan = 0, rumklang = 0.2, bus = ud) {
  const g = ctx.createGain(); g.gain.value = styrke;
  let ind = g;
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(bus); if (rumklang) { const r = ctx.createGain(); r.gain.value = rumklang; p.connect(r); r.connect(rumSend); } }
  else { g.connect(bus); if (rumklang) { const r = ctx.createGain(); r.gain.value = rumklang; g.connect(r); r.connect(rumSend); } }
  return ind;
}
// Et stød af støj gennem et filter med en kurve (angreb → top → henfald)
function støjStød(mål, { t = nu(), varighed = 0.1, filter = "bandpass", frek = 1000, frekSlut = null, Q = 1, styrke = 1, angreb = 0.001, buf = støjBuf, start = Math.random() * 1.5 }) {
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(frek, t); f.Q.value = Q;
  if (frekSlut) f.frequency.exponentialRampToValueAtTime(frekSlut, t + varighed);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(styrke, t + angreb); g.gain.exponentialRampToValueAtTime(0.0001, t + varighed);
  s.connect(f); f.connect(g); g.connect(mål); s.start(t, start); s.stop(t + varighed + 0.02);
}
// En tone, der glider fra en frekvens til en anden og dør ud
function tone(mål, { t = nu(), type = "sine", frek = 440, frekSlut = null, varighed = 0.2, styrke = 0.5, angreb = 0.002 }) {
  const maks = ctx.sampleRate * 0.45;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(Math.min(frek, maks), t);
  if (frekSlut) o.frequency.exponentialRampToValueAtTime(Math.min(frekSlut, maks), t + varighed);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(styrke, t + angreb); g.gain.exponentialRampToValueAtTime(0.0001, t + varighed);
  o.connect(g); g.connect(mål); o.start(t); o.stop(t + varighed + 0.02);
}
// Metal, der klinger (flere toner, der ikke passer sammen som i musik — det er det, der lyder som metal)
function klang(mål, { t = nu(), frek = 2000, forhold = [1, 2.32, 4.25, 6.63], henfald = 0.12, styrke = 0.3 }) {
  forhold.forEach((f, i) => {
    const fr = frek * f * (1 + (Math.random() - 0.5) * 0.02);
    if (fr < ctx.sampleRate * 0.45) tone(mål, { t, frek: fr, varighed: henfald / (1 + i * 0.6), styrke: styrke / (1 + i * 0.8), angreb: 0.0008 });
  });
}
// En optagelse (glas, plask …) med tilfældig tonehøjde
function spil(navn, mål, { styrke = 1, hastighed = 1 + (Math.random() - 0.5) * 0.15, t = nu() } = {}) {
  const buf = optagelser[navn]; if (!buf) return false;
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = hastighed;
  const g = ctx.createGain(); g.gain.value = styrke; s.connect(g); g.connect(mål); s.start(t);
  return true;
}
// Et klik (fjedre, låse og metaldele, der rammer hinanden)
function klik(mål, { t = nu(), frek = 3500, styrke = 0.5, tørt = 0.02 } = {}) {
  støjStød(mål, { t, varighed: 0.012, filter: "bandpass", frek, Q: 2.5, styrke });
  tone(mål, { t, frek: frek * 0.62, varighed: tørt + 0.02, styrke: styrke * 0.35 });
}
// Ekko: en forsinket og dæmpet kopi (fra kuglefanget eller bakkerne)
function ekko(kilde, forsinkelse, styrke, mørk = 2200) {
  const d = ctx.createDelay(3); d.delayTime.value = forsinkelse;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = mørk;
  const g = ctx.createGain(); g.gain.value = styrke;
  kilde.connect(d); d.connect(f); f.connect(g); g.connect(ud);
}

// ---------- Skud ----------
const SKUD = {
  pistol: { knald: 0.9, krop: 0.8, kropFrek: 1300, bund: 0.7, bundFrek: 170, hale: 0.45, ekkoer: [[0.072, 0.28]] },
  revolver: { knald: 1.0, krop: 1.0, kropFrek: 900, bund: 1.0, bundFrek: 120, hale: 0.8, ekkoer: [[0.072, 0.34], [0.55, 0.12]] },
  hagl: { knald: 0.9, krop: 1.2, kropFrek: 650, bund: 1.25, bundFrek: 95, hale: 1.1, ekkoer: [[0.072, 0.38], [0.6, 0.18], [1.15, 0.08]] },
  stormgevær: { knald: 1.0, krop: 0.75, kropFrek: 1700, bund: 0.6, bundFrek: 150, hale: 0.35, ekkoer: [[0.072, 0.22]] },
  snig: { knald: 1.2, krop: 1.1, kropFrek: 1000, bund: 1.2, bundFrek: 85, hale: 1.4, ekkoer: [[0.072, 0.35], [0.5, 0.25], [0.95, 0.15], [1.5, 0.08]] },
};
export function skud(slags, pan = -0.25) {
  if (!ctx) return;
  const s = SKUD[slags], t = nu(), v = 1 + (Math.random() - 0.5) * 0.08;
  const mål = kæde(1, pan, 0.35 * s.hale, våbenBus);
  // 1) det skarpe knald (krudtet og lydmuren)
  støjStød(mål, { t, varighed: 0.035, filter: "highpass", frek: 2200 * v, Q: 0.5, styrke: 1.6 * s.knald, angreb: 0.0004 });
  støjStød(mål, { t, varighed: 0.02, filter: "bandpass", frek: 4200 * v, Q: 1, styrke: 1.2 * s.knald, angreb: 0.0003 });
  // 2) kroppen: et brag af larm, der hurtigt bliver mørkere
  støjStød(mål, { t, varighed: 0.22 * s.hale + 0.08, filter: "lowpass", frek: 7000, frekSlut: s.kropFrek * 0.4, Q: 0.7, styrke: 1.4 * s.krop, angreb: 0.0015 });
  støjStød(mål, { t, varighed: 0.12, filter: "bandpass", frek: s.kropFrek * v, Q: 0.9, styrke: 1.1 * s.krop, angreb: 0.001 });
  // 3) det dybe bump (trykbølgen)
  tone(mål, { t, frek: s.bundFrek * v, frekSlut: 38, varighed: 0.2 + s.bund * 0.1, styrke: 1.3 * s.bund, angreb: 0.002 });
  tone(mål, { t, type: "triangle", frek: s.bundFrek * 2.1, frekSlut: 60, varighed: 0.08, styrke: 0.5 * s.bund });
  // 4) halen: rumlen, der breder sig ud over banen
  støjStød(mål, { t: t + 0.01, varighed: 0.5 + s.hale * 0.9, filter: "lowpass", frek: 900, frekSlut: 160, Q: 0.5, styrke: 0.45 * s.hale, angreb: 0.03, buf: brunBuf });
  // 5) ekko fra kuglefanget og bakkerne
  for (const [d, g] of s.ekkoer) ekko(mål, d, g, d > 0.3 ? 900 : 2600);
  // 6) mekanikken (slæden, bundstykket) lige efter
  if (slags === "pistol") { klik(mål, { t: t + 0.02, frek: 3000, styrke: 0.35 }); klik(mål, { t: t + 0.065, frek: 2400, styrke: 0.4 }); }
  if (slags === "stormgevær") klik(mål, { t: t + 0.03, frek: 2600, styrke: 0.3 });
  if (slags === "revolver") klik(mål, { t: t + 0.13, frek: 2800, styrke: 0.25 });
}
// Klik når magasinet er tomt
export function tørKlik() { if (!ctx) return; const m = kæde(0.8, -0.2, 0.05); klik(m, { frek: 3200, styrke: 0.6, tørt: 0.03 }); klik(m, { t: nu() + 0.012, frek: 1900, styrke: 0.3 }); }

// ---------- Mekanik ----------
export function mekanik(navn, pan = -0.2) {
  if (!ctx) return;
  const m = kæde(0.9, pan, 0.08), t = nu();
  const glid = (varighed, fra, til, s = 0.25) => støjStød(m, { t, varighed, filter: "bandpass", frek: fra, frekSlut: til, Q: 1.6, styrke: s, angreb: varighed * 0.3 });
  switch (navn) {
    case "magUd": klik(m, { frek: 2600, styrke: 0.5 }); glid(0.14, 1800, 700, 0.18); break;
    case "magFald": break;
    case "magInd": støjStød(m, { varighed: 0.05, filter: "lowpass", frek: 900, styrke: 0.7 }); tone(m, { frek: 240, frekSlut: 120, varighed: 0.05, styrke: 0.5 }); klik(m, { t: t + 0.03, frek: 3000, styrke: 0.6 }); break;
    case "slædeFrem": case "ladegrebSlip": case "boltFrem":
      glid(0.05, 2400, 1200, 0.2); klik(m, { t: t + 0.045, frek: 2100, styrke: 0.8 }); klang(m, { t: t + 0.045, frek: 1500, henfald: 0.08, styrke: 0.25 }); break;
    case "ladegreb": case "boltTilbage": glid(0.12, 1200, 2600, 0.22); klik(m, { t: t + 0.1, frek: 2700, styrke: 0.4 }); break;
    case "boltOp": klik(m, { frek: 2300, styrke: 0.5 }); break;
    case "boltNed": klik(m, { frek: 2000, styrke: 0.55 }); break;
    case "tromleUd": klik(m, { frek: 3100, styrke: 0.5 }); glid(0.1, 2600, 1500, 0.12); break;
    case "hylstreUd": glid(0.08, 1600, 3000, 0.25); for (let i = 0; i < 6; i++) setTimeout(() => hylster(0.6 + Math.random() * 0.4, "messing", pan - 0.2), 260 + i * 45 + Math.random() * 40); break;
    case "patronerInd": for (let i = 0; i < 3; i++) klik(m, { t: t + i * 0.025, frek: 3600 + i * 300, styrke: 0.25 }); break;
    case "tromleInd": klik(m, { frek: 2400, styrke: 0.8 }); for (let i = 0; i < 6; i++) klik(m, { t: t + 0.04 + i * 0.03 * (1 + i * 0.25), frek: 4200, styrke: 0.12 }); break;
    case "hane": klik(m, { frek: 3800, styrke: 0.35 }); klik(m, { t: t + 0.03, frek: 2800, styrke: 0.3 }); break;
    case "pumpeTilbage": glid(0.09, 1500, 2600, 0.35); klik(m, { t: t + 0.085, frek: 2200, styrke: 0.7 }); klang(m, { t: t + 0.085, frek: 900, henfald: 0.1, styrke: 0.2 }); break;
    case "pumpeFrem": glid(0.08, 2600, 1300, 0.3); klik(m, { t: t + 0.075, frek: 1800, styrke: 0.9 }); klang(m, { t: t + 0.075, frek: 700, henfald: 0.12, styrke: 0.25 }); break;
    case "haglInd": støjStød(m, { varighed: 0.06, filter: "bandpass", frek: 1400, Q: 1.5, styrke: 0.3 }); klik(m, { t: t + 0.05, frek: 2600, styrke: 0.5 }); break;
    case "vælg": glid(0.12, 900, 2200, 0.12); klik(m, { t: t + 0.1, frek: 2500, styrke: 0.5 }); klik(m, { t: t + 0.16, frek: 1700, styrke: 0.6 }); break;
  }
}

// Hylstre der lander på bordet (messing klinger, haglpatroner af plast siger "tok")
export function hylster(styrke = 1, slags = "messing", pan = 0.3) {
  if (!ctx) return;
  const m = kæde(Math.min(1, styrke) * 0.5, pan, 0.06), t = nu();
  if (slags === "hagl") { støjStød(m, { varighed: 0.03, filter: "bandpass", frek: 1100, Q: 2, styrke: 0.7 }); tone(m, { frek: 520, frekSlut: 380, varighed: 0.04, styrke: 0.4 }); return; }
  if (slags === "magasin") { støjStød(m, { varighed: 0.07, filter: "lowpass", frek: 1200, styrke: 0.9 }); klang(m, { frek: 640, henfald: 0.12, styrke: 0.3 }); return; }
  klang(m, { t, frek: 3000 + Math.random() * 1600, henfald: 0.16 + Math.random() * 0.12, styrke: 0.45 });
  støjStød(m, { t, varighed: 0.008, filter: "highpass", frek: 5000, styrke: 0.35 });
}

// ---------- Træffere ----------
export function træf(slags, styrke = 1, pan = 0, afstand = 10) {
  if (!ctx) return;
  const forsink = afstand / 343 * 0.6, t = nu() + forsink, dæmp = Math.min(1, 6 / (afstand + 2));
  const m = kæde(styrke * (0.5 + dæmp * 0.6), pan, 0.25);
  switch (slags) {
    case "træ": case "skive":
      støjStød(m, { t, varighed: 0.09, filter: "lowpass", frek: 1100, Q: 0.8, styrke: 0.8 });
      tone(m, { t, frek: 180, frekSlut: 90, varighed: 0.07, styrke: 0.5 });
      støjStød(m, { t, varighed: 0.02, filter: "highpass", frek: 3000, styrke: 0.4 });
      if (slags === "skive") støjStød(m, { t, varighed: 0.03, filter: "bandpass", frek: 1800, Q: 1.5, styrke: 0.4 });
      break;
    case "jord": case "halm": støjStød(m, { t, varighed: 0.12, filter: "lowpass", frek: slags === "halm" ? 1400 : 500, Q: 0.6, styrke: 0.8 }); break;
    case "metal": case "dåse":
      klang(m, { t, frek: slags === "dåse" ? 1150 + Math.random() * 400 : 650, forhold: [1, 2.76, 5.4, 8.93], henfald: slags === "dåse" ? 0.32 : 0.9, styrke: 0.55 });
      støjStød(m, { t, varighed: 0.015, filter: "highpass", frek: 4000, styrke: 0.6 });
      break;
    case "glas":
      if (!spil(Math.random() < 0.5 ? "glas" : "glas2", m, { t, styrke: 0.9 })) støjStød(m, { t, varighed: 0.3, filter: "highpass", frek: 4000, styrke: 0.6 });
      for (let i = 0; i < 7; i++) tone(m, { t: t + 0.03 + Math.random() * 0.35, frek: 3500 + Math.random() * 4000, varighed: 0.06, styrke: 0.08 });
      break;
    case "melon": case "frugt":
      støjStød(m, { t, varighed: 0.18, filter: "lowpass", frek: 2600, frekSlut: 300, Q: 1.2, styrke: 1 });
      tone(m, { t, frek: 110, frekSlut: 55, varighed: 0.12, styrke: 0.7 });
      spil("plask", m, { t, styrke: 0.5, hastighed: 1.3 });
      break;
    case "ballon":
      støjStød(m, { t, varighed: 0.05, filter: "highpass", frek: 600, styrke: 1.4, angreb: 0.0005 });
      tone(m, { t, frek: 240, frekSlut: 70, varighed: 0.04, styrke: 0.6 });
      [0, 4, 7, 12, 16].forEach((n, i) => tone(m, { t: t + 0.06 + i * 0.05, type: "triangle", frek: 880 * 2 ** (n / 12), varighed: 0.25, styrke: 0.07 }));
      break;
    case "plade":
      klang(m, { t, frek: 420, forhold: [1, 2.1, 3.9, 5.3], henfald: 1.3, styrke: 0.6 });
      break;
  }
}
// Plingeling, når man rammer skydeskivens gule midte
export function bulls(pan = 0) {
  if (!ctx) return;
  const m = kæde(0.6, pan, 0.4), t = nu() + 0.03;
  klang(m, { t, frek: 1046, forhold: [1, 2.0, 3.01, 4.2], henfald: 1.4, styrke: 0.4 });
  [0, 4, 7, 12].forEach((n, i) => tone(m, { t: t + 0.12 + i * 0.07, type: "triangle", frek: 1046 * 2 ** (n / 12), varighed: 0.35, styrke: 0.12 }));
}
// En ny ting dukker op på hylden
export function plop(pan = 0) { if (!ctx) return; const m = kæde(0.25, pan, 0.1); tone(m, { frek: 500, frekSlut: 900, varighed: 0.09, styrke: 0.4 }); }

// ---------- Lyssværdet og ildsværdet ----------
let sværd = null, ønsketSværd = null;
const BRUM = { blå: 90, grøn: 96, rød: 80, lilla: 86, gul: 100, pink: 104, hvid: 93, regnbue: 92 };
export function sværdTænd(slags, farve) {
  ønsketSværd = { slags, farve };
  if (!ctx) return;
  sværdSluk(true);
  const t = nu(), bus = ctx.createGain(); bus.gain.value = 0; bus.connect(ud);
  const send = ctx.createGain(); send.gain.value = 0.25; bus.connect(send); send.connect(rumSend);
  const s = { slags, bus, kilder: [], t0: t };
  // Svinget: sus af støj, der bliver højere og lysere, jo hurtigere man svinger
  const sus = ctx.createBufferSource(); sus.buffer = støjBuf; sus.loop = true;
  const susF = ctx.createBiquadFilter(); susF.type = "bandpass"; susF.frequency.value = 400; susF.Q.value = 1.1;
  const susG = ctx.createGain(); susG.gain.value = 0;
  sus.connect(susF); susF.connect(susG); susG.connect(bus); sus.start(); s.kilder.push(sus); Object.assign(s, { susF, susG });
  if (slags === "lys") {
    const f = BRUM[farve] || 90;
    // Brummen: to savtakker der næsten passer (giver den svævende lyd) + en ren overtone og en elektrisk summen
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 620; lp.Q.value = 1.5;
    const brumG = ctx.createGain(); brumG.gain.value = 0.42;
    const osc = [["sawtooth", f], ["sawtooth", f * 1.013], ["triangle", f * 2], ["sine", f / 2]].map(([type, fr], i) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(fr * 0.3, t); o.frequency.exponentialRampToValueAtTime(fr, t + 0.32);
      const g = ctx.createGain(); g.gain.value = [0.5, 0.45, 0.18, 0.5][i]; o.connect(g); g.connect(lp); o.start(); s.kilder.push(o); return { o, fr };
    });
    const sum = ctx.createBufferSource(); sum.buffer = støjBuf; sum.loop = true;
    const sumF = ctx.createBiquadFilter(); sumF.type = "bandpass"; sumF.frequency.value = f * 1.6; sumF.Q.value = 6;
    const sumG = ctx.createGain(); sumG.gain.value = 0.35; sum.connect(sumF); sumF.connect(sumG); sumG.connect(lp); sum.start(); s.kilder.push(sum);
    // Flagren: en langsom svingning i styrken (som et lysstofrør)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 11; const lfoG = ctx.createGain(); lfoG.gain.value = 0.06; lfo.connect(lfoG); lfoG.connect(brumG.gain); lfo.start(); s.kilder.push(lfo);
    lp.connect(brumG); brumG.connect(bus);
    Object.assign(s, { osc, lp, brumG });
    // Tænd-lyden: "ksssh-vvuum"
    bus.gain.setValueAtTime(0.0001, t); bus.gain.exponentialRampToValueAtTime(0.75, t + 0.25);
    const m = kæde(0.8, 0, 0.3);
    støjStød(m, { t, varighed: 0.45, filter: "bandpass", frek: 3200, frekSlut: 900, Q: 0.8, styrke: 0.5, angreb: 0.01 });
    tone(m, { t, type: "sawtooth", frek: 60, frekSlut: 240, varighed: 0.35, styrke: 0.35, angreb: 0.03 });
    tone(m, { t: t + 0.1, type: "sine", frek: 220, frekSlut: 110, varighed: 0.6, styrke: 0.35 });
  } else {
    // Ildsværdet: en optagelse af ild (eller rumlen, hvis den ikke er hentet endnu) + knitren
    const ild = ctx.createBufferSource(); ild.buffer = optagelser.ild || brunBuf; ild.loop = true;
    const ildF = ctx.createBiquadFilter(); ildF.type = "lowpass"; ildF.frequency.value = optagelser.ild ? 5000 : 700;
    const ildG = ctx.createGain(); ildG.gain.value = optagelser.ild ? 0.9 : 0.5; ild.connect(ildF); ildF.connect(ildG); ildG.connect(bus); ild.start(0, Math.random() * 3); s.kilder.push(ild);
    const kn = ctx.createBufferSource(); kn.buffer = knitreBuf; kn.loop = true;
    const knF = ctx.createBiquadFilter(); knF.type = "highpass"; knF.frequency.value = 1200; const knG = ctx.createGain(); knG.gain.value = 0.5;
    kn.connect(knF); knF.connect(knG); knG.connect(bus); kn.start(); s.kilder.push(kn);
    s.susF.type = "lowpass";
    Object.assign(s, { ildG, ildF });
    // "Fwoomp": ilden blusser op
    bus.gain.setValueAtTime(0.0001, t); bus.gain.exponentialRampToValueAtTime(0.85, t + 0.4);
    const m = kæde(0.9, 0, 0.3);
    støjStød(m, { t, varighed: 0.8, filter: "lowpass", frek: 250, frekSlut: 3000, Q: 0.8, styrke: 0.9, angreb: 0.12, buf: brunBuf });
    tone(m, { t, frek: 70, frekSlut: 45, varighed: 0.5, styrke: 0.6, angreb: 0.05 });
  }
  sværd = s;
}
export function sværdSluk(stille = false) {
  ønsketSværd = stille ? ønsketSværd : null;
  if (!ctx || !sværd) return;
  const s = sværd, t = nu(); sværd = null;
  s.bus.gain.cancelScheduledValues(t); s.bus.gain.setValueAtTime(s.bus.gain.value, t); s.bus.gain.exponentialRampToValueAtTime(0.0001, t + (stille ? 0.05 : 0.4));
  if (s.osc && !stille) for (const { o, fr } of s.osc) o.frequency.exponentialRampToValueAtTime(fr * 0.25, t + 0.4);
  if (!stille) {
    const m = kæde(0.6, 0, 0.3);
    if (s.slags === "lys") { tone(m, { t, type: "sawtooth", frek: 200, frekSlut: 40, varighed: 0.4, styrke: 0.3 }); støjStød(m, { t, varighed: 0.3, filter: "bandpass", frek: 1500, frekSlut: 400, styrke: 0.3 }); }
    else støjStød(m, { t, varighed: 0.7, filter: "highpass", frek: 2500, frekSlut: 5000, styrke: 0.4, angreb: 0.02 });
  }
  setTimeout(() => s.kilder.forEach(k => { try { k.stop(); } catch { /* allerede stoppet */ } }), 600);
}
// Kaldes hvert billede: fart 0..1 (hvor hurtigt spidsen bevæger sig)
export function sværdFart(fart) {
  if (!ctx || !sværd) return;
  const s = sværd, t = nu(), v = Math.min(1, fart);
  s.susG.gain.setTargetAtTime(Math.pow(v, 1.4) * (s.slags === "lys" ? 0.6 : 0.9), t, 0.03);
  s.susF.frequency.setTargetAtTime(s.slags === "lys" ? 300 + v * 1500 : 250 + v * 2200, t, 0.03);
  if (s.osc) {
    for (const { o, fr } of s.osc) o.frequency.setTargetAtTime(fr * (1 + v * 0.32), t, 0.04);
    s.lp.frequency.setTargetAtTime(620 + v * 1800, t, 0.04);
    s.brumG.gain.setTargetAtTime(0.42 + v * 0.35, t, 0.04);
  } else {
    s.ildG.gain.setTargetAtTime((optagelser.ild ? 0.9 : 0.5) * (1 + v * 0.8), t, 0.05);
  }
}
// Sværdet skærer noget over eller rammer noget hårdt
export function sværdSlag(slags = "frugt", pan = 0, lysSværd = true) {
  if (!ctx) return;
  const m = kæde(0.9, pan, 0.3), t = nu();
  if (lysSværd) {
    støjStød(m, { t, varighed: 0.22, filter: "bandpass", frek: 2800, frekSlut: 1200, Q: 0.9, styrke: 0.7 });
    tone(m, { t, type: "sawtooth", frek: 160, frekSlut: 90, varighed: 0.18, styrke: 0.35 });
    for (let i = 0; i < 10; i++) støjStød(m, { t: t + Math.random() * 0.25, varighed: 0.01, filter: "highpass", frek: 3000, styrke: 0.3 * Math.random() });
    støjStød(m, { t: t + 0.05, varighed: 0.5, filter: "highpass", frek: 5000, styrke: 0.15, angreb: 0.03 });   // det syder
  } else {
    støjStød(m, { t, varighed: 0.4, filter: "lowpass", frek: 400, frekSlut: 2600, Q: 0.7, styrke: 0.8, angreb: 0.05, buf: brunBuf });
  }
  if (slags === "frugt" || slags === "melon") { støjStød(m, { t, varighed: 0.12, filter: "lowpass", frek: 1800, frekSlut: 400, styrke: 0.5 }); spil("plask", m, { t, styrke: 0.35, hastighed: 1.4 }); }
  if (slags === "dåse") klang(m, { t, frek: 1300, forhold: [1, 2.76, 5.4], henfald: 0.25, styrke: 0.35 });
  if (slags === "glas") spil("glas2", m, { t, styrke: 0.7 });
}

// ---------- Naturen: fårekyllinger og en svag vind ----------
let næsteKyl = 0;
function startNatur() {
  const vind = ctx.createBufferSource(); vind.buffer = brunBuf; vind.loop = true;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 380;
  const g = ctx.createGain(); g.gain.value = 0.05;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = ctx.createGain(); lg.gain.value = 0.03; lfo.connect(lg); lg.connect(g.gain); lfo.start();
  vind.connect(f); f.connect(g); g.connect(ud); vind.start();
}
export function natur() {
  if (!ctx || nu() < næsteKyl) return;
  næsteKyl = nu() + 0.5 + Math.random() * 1.4;
  const m = kæde(0.05 + Math.random() * 0.04, Math.random() * 2 - 1, 0.3), t = nu(), f = 4300 + Math.random() * 600;
  const n = 2 + (Math.random() * 3 | 0);
  for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) tone(m, { t: t + k * 0.11 + j * 0.022, frek: f, varighed: 0.016, styrke: 0.5, angreb: 0.002 });
}
