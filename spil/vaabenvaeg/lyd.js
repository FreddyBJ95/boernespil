// ===== Lydene =====
// Alt laves med kode (ingen lydfiler): et skud er lag af et skarpt knald, et brag af larm, et dybt bump
// og en rullende hale med ekko. Hylstrene klirrer på bordet, magasinet klonker, og lasergeværet siger "piuuw".

let ctx = null, ud = null, våbenBus = null, rumSend = null, støjBuf = null, brunBuf = null;
let tændt = true;

// ---------- Start (kræver et tryk fra barnet) ----------
export function start() {
  if (ctx) { if (ctx.state !== "running") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* ikke alle browsere */ }
  ctx = new AC();
  // Hovedkæden: alt → hovedstyrke → begrænser (så mange skud i træk ikke knaser) → højttaler
  const komp = ctx.createDynamicsCompressor();
  komp.threshold.value = -10; komp.knee.value = 6; komp.ratio.value = 12; komp.attack.value = 0.002; komp.release.value = 0.15;
  ud = ctx.createGain(); ud.gain.value = tændt ? 1 : 0;
  ud.connect(komp); komp.connect(ctx.destination);
  // Skuddene går gennem en let forvrængning, der giver knaldet "kant"
  const forvræng = ctx.createWaveShaper(), kurve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; kurve[i] = Math.tanh(x * 2.6) / Math.tanh(2.6); }
  forvræng.curve = kurve; våbenBus = ctx.createGain(); våbenBus.gain.value = 0.9; våbenBus.connect(forvræng); forvræng.connect(ud);
  // Efterklang: et lille rum lavet af kode (tidlige ekkoer fra væggen + en hale, der bliver mørkere)
  const rum = ctx.createConvolver(); rum.buffer = lavRumklang(1.6);
  rumSend = ctx.createGain(); rumSend.gain.value = 0.55; rumSend.connect(rum); rum.connect(ud);
  // Støj at bygge lyde af: hvid (sus) og brun (rumlen) — i mono for at spare hukommelse
  støjBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const s = støjBuf.getChannelData(0); for (let i = 0; i < s.length; i++) s[i] = Math.random() * 2 - 1;
  brunBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const b = brunBuf.getChannelData(0); let sidst = 0;
  for (let i = 0; i < b.length; i++) { sidst = (sidst + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = sidst * 3.5; }
}
export function sætLyd(på) { tændt = på; if (ud) ud.gain.setTargetAtTime(på ? 1 : 0, ctx.currentTime, 0.05); }
export const lydErTændt = () => tændt;

function lavRumklang(sek) {
  const sr = ctx.sampleRate, n = Math.floor(sr * sek), buf = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      lp += (Math.random() * 2 - 1 - lp) * Math.max(0.03, 0.85 - t * 0.6);
      d[i] = lp * Math.exp(-t / 0.32) * 0.5 * Math.min(1, t / 0.008);
    }
    for (const [t, g] of [[0.011, 0.5], [0.023 + c * 0.003, 0.35], [0.041, 0.25], [0.09, 0.15]]) {
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
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); ind = p; }
  ind.connect(bus);
  if (rumklang) { const r = ctx.createGain(); r.gain.value = rumklang; ind.connect(r); r.connect(rumSend); }
  return g;
}
// Et stød af støj gennem et filter med en kurve (angreb → top → henfald)
function støjStød(mål, { t = nu(), varighed = 0.1, filter = "bandpass", frek = 1000, frekSlut = null, Q = 1, styrke = 1, angreb = 0.001, buf = støjBuf }) {
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(frek, t); f.Q.value = Q;
  if (frekSlut) f.frequency.exponentialRampToValueAtTime(frekSlut, t + varighed);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(styrke, t + angreb); g.gain.exponentialRampToValueAtTime(0.0001, t + varighed);
  s.connect(f); f.connect(g); g.connect(mål);
  s.start(t, Math.max(0, Math.random() * (buf.duration - varighed - 0.05))); s.stop(t + varighed + 0.02);
}
// En tone, der glider fra en frekvens til en anden og dør ud
function tone(mål, { t = nu(), type = "sine", frek = 440, frekSlut = null, varighed = 0.2, styrke = 0.5, angreb = 0.002 }) {
  const maks = ctx.sampleRate * 0.45;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(Math.min(frek, maks), t);
  if (frekSlut) o.frequency.exponentialRampToValueAtTime(Math.min(frekSlut, maks), t + varighed);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(styrke, t + angreb); g.gain.exponentialRampToValueAtTime(0.0001, t + varighed);
  o.connect(g); g.connect(mål); o.start(t); o.stop(t + varighed + 0.02);
  return o;
}
// Metal, der klinger (toner, der ikke passer sammen som i musik — det er det, der lyder som metal)
function klang(mål, { t = nu(), frek = 2000, forhold = [1, 2.32, 4.25, 6.63], henfald = 0.12, styrke = 0.3 }) {
  forhold.forEach((f, i) => {
    const fr = frek * f * (1 + (Math.random() - 0.5) * 0.02);
    if (fr < ctx.sampleRate * 0.45) tone(mål, { t, frek: fr, varighed: henfald / (1 + i * 0.6), styrke: styrke / (1 + i * 0.8), angreb: 0.0008 });
  });
}
// Et klik (fjedre, låse og metaldele, der rammer hinanden)
function klik(mål, { t = nu(), frek = 3500, styrke = 0.5, tørt = 0.02 } = {}) {
  støjStød(mål, { t, varighed: 0.012, filter: "bandpass", frek, Q: 2.5, styrke });
  tone(mål, { t, frek: frek * 0.62, varighed: tørt + 0.02, styrke: styrke * 0.35 });
}
// Ekko fra væggene: en forsinket og dæmpet kopi
function ekko(kilde, forsinkelse, styrke, mørk = 2200) {
  const d = ctx.createDelay(2); d.delayTime.value = forsinkelse;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = mørk;
  const g = ctx.createGain(); g.gain.value = styrke;
  kilde.connect(d); d.connect(f); f.connect(g); g.connect(ud);
}

// ---------- Skud ----------
// knald = det skarpe smæld, krop = braget, bund = trykbølgen i maven, hale = rumlen bagefter
const SKUD = {
  pistol: { knald: 1.0, krop: 0.85, kropFrek: 1350, bund: 0.75, bundFrek: 165, hale: 0.45, ekkoer: [[0.05, 0.24]], klik: 0.035 },
  stor: { knald: 1.35, krop: 1.35, kropFrek: 800, bund: 1.45, bundFrek: 92, hale: 1.15, ekkoer: [[0.05, 0.34], [0.38, 0.18], [0.8, 0.08]], klik: 0.05 },
  riffel: { knald: 1.25, krop: 1.0, kropFrek: 1500, bund: 1.0, bundFrek: 125, hale: 0.65, ekkoer: [[0.05, 0.26], [0.31, 0.12]], klik: 0.028 },
  ak: { knald: 1.25, krop: 1.15, kropFrek: 1100, bund: 1.15, bundFrek: 105, hale: 0.8, ekkoer: [[0.05, 0.3], [0.33, 0.14]], klik: 0.03 },
  mg: { knald: 1.3, krop: 1.1, kropFrek: 1300, bund: 1.15, bundFrek: 112, hale: 0.8, ekkoer: [[0.05, 0.3], [0.35, 0.15]], klik: 0.025 },
  maskinpistol: { knald: 1.0, krop: 0.8, kropFrek: 1600, bund: 0.7, bundFrek: 150, hale: 0.45, ekkoer: [[0.05, 0.22]], klik: 0.022 },
};
export function skud(slags, pan = 0, dæmpet = false) {
  if (!ctx) return;
  if (dæmpet) return dæmpetSkud(slags, pan);
  const s = SKUD[slags], t = nu(), v = 1 + (Math.random() - 0.5) * 0.1;
  const mål = kæde(1, pan, 0.4 * s.hale, våbenBus);
  // 1) det skarpe knald: kuglen bryder lydmuren, og krudtet eksploderer
  støjStød(mål, { t, varighed: 0.03, filter: "highpass", frek: 2400 * v, Q: 0.5, styrke: 1.8 * s.knald, angreb: 0.0003 });
  støjStød(mål, { t, varighed: 0.018, filter: "bandpass", frek: 4400 * v, Q: 1, styrke: 1.3 * s.knald, angreb: 0.0003 });
  // 2) braget: larm, der hurtigt bliver mørkere
  støjStød(mål, { t, varighed: 0.2 * s.hale + 0.09, filter: "lowpass", frek: 7500, frekSlut: s.kropFrek * 0.35, Q: 0.7, styrke: 1.5 * s.krop, angreb: 0.0012 });
  støjStød(mål, { t, varighed: 0.11, filter: "bandpass", frek: s.kropFrek * v, Q: 0.9, styrke: 1.2 * s.krop, angreb: 0.001 });
  // 3) det dybe bump (trykbølgen)
  tone(mål, { t, frek: s.bundFrek * v, frekSlut: 36, varighed: 0.22 + s.bund * 0.1, styrke: 1.4 * s.bund, angreb: 0.002 });
  tone(mål, { t, type: "triangle", frek: s.bundFrek * 2.2, frekSlut: 55, varighed: 0.08, styrke: 0.55 * s.bund });
  // 4) halen: rumlen, der ruller ud i lokalet
  støjStød(mål, { t: t + 0.01, varighed: 0.45 + s.hale * 0.8, filter: "lowpass", frek: 950, frekSlut: 150, Q: 0.5, styrke: 0.5 * s.hale, angreb: 0.025, buf: brunBuf });
  // 5) ekko fra væggene
  for (const [d, g] of s.ekkoer) ekko(mål, d, g, d > 0.2 ? 900 : 2600);
  // 6) slæden eller bundstykket, der smækker frem og tilbage
  klik(mål, { t: t + s.klik, frek: 2600, styrke: 0.3 });
}
// Med lyddæmper: et dumpt "pfft", et lille smæld og mekanikken, der nu kan høres tydeligt
function dæmpetSkud(slags, pan) {
  const s = SKUD[slags], t = nu(), v = 1 + (Math.random() - 0.5) * 0.1;
  const mål = kæde(0.85, pan, 0.12);
  støjStød(mål, { t, varighed: 0.09, filter: "bandpass", frek: 900 * v, frekSlut: 300, Q: 0.8, styrke: 1.1, angreb: 0.002 });
  støjStød(mål, { t, varighed: 0.035, filter: "highpass", frek: 3000, Q: 0.5, styrke: 0.35, angreb: 0.001 });
  tone(mål, { t, frek: s.bundFrek * 1.3, frekSlut: 60, varighed: 0.09, styrke: 0.5 });
  klik(mål, { t: t + s.klik * 0.6, frek: 3000, styrke: 0.55 });
  klik(mål, { t: t + s.klik * 1.6, frek: 2200, styrke: 0.6 });
  klang(mål, { t: t + s.klik * 1.6, frek: 1700, henfald: 0.06, styrke: 0.18 });
}
// Klik, når magasinet er tomt
export function tørKlik() { if (!ctx) return; const m = kæde(0.8, 0, 0.05); klik(m, { frek: 3200, styrke: 0.6, tørt: 0.03 }); klik(m, { t: nu() + 0.012, frek: 1900, styrke: 0.3 }); }

// ---------- Lasergeværet ----------
// "Piuuw": en tone, der styrter ned, rystet af en anden tone (FM), et elektrisk knitter og et dybt bump
export function laser(pan = 0) {
  if (!ctx) return;
  const t = nu(), v = 1 + (Math.random() - 0.5) * 0.12, mål = kæde(0.9, pan, 0.35);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.25); lp.connect(mål);
  const hoved = tone(lp, { t, type: "sawtooth", frek: 2300 * v, frekSlut: 130, varighed: 0.26, styrke: 0.5, angreb: 0.002 });
  const mod = ctx.createOscillator(), modG = ctx.createGain(); mod.frequency.value = 260 * v; modG.gain.value = 500;
  mod.connect(modG); modG.connect(hoved.frequency); mod.start(t); mod.stop(t + 0.28);
  tone(lp, { t, type: "square", frek: 1150 * v, frekSlut: 85, varighed: 0.18, styrke: 0.22 });
  tone(mål, { t, frek: 120, frekSlut: 38, varighed: 0.22, styrke: 1.0, angreb: 0.003 });
  støjStød(mål, { t, varighed: 0.06, filter: "bandpass", frek: 3500, Q: 0.8, styrke: 0.55 });
  støjStød(mål, { t: t + 0.02, varighed: 0.25, filter: "highpass", frek: 5000, frekSlut: 2500, styrke: 0.12, angreb: 0.02 });
}
// ---------- Sci-fi-våbnene ----------
// De går gennem en hårdere forvrængning end krudtvåbnene, og hvert skud er bygget af mange lag:
// et smæld, et drøn i maven, en rumlende hale, elektrisk knitren og ekko — det giver "skrald".
let sciBus = null;
function sciKæde(styrke, pan, rum) {
  if (!sciBus) {
    const f = ctx.createWaveShaper(), k = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1, y = Math.tanh(x * 9) / Math.tanh(9); k[i] = Math.round(y * 20) / 20 * 0.6 + y * 0.4; }   // hård forvrængning + knas
    f.curve = k; f.oversample = "2x";
    sciBus = ctx.createGain(); sciBus.gain.value = 1; sciBus.connect(f); f.connect(ud);
  }
  return kæde(styrke, pan, rum, sciBus);
}
// Fælles lag til alle sci-fi-skud
function brag(m, t, { bund = 60, styrke = 1, knitter = 0.5, hale = 0.6 }) {
  støjStød(m, { t, varighed: 0.03, filter: "highpass", frek: 1800, styrke: 1.7 * styrke, angreb: 0.0003 });                 // smældet
  støjStød(m, { t, varighed: 0.12, filter: "bandpass", frek: 900, Q: 0.8, styrke: 1.2 * styrke, angreb: 0.001 });           // braget
  tone(m, { t, frek: bund * 2.6, frekSlut: bund * 0.45, varighed: 0.4 + hale * 0.35, styrke: 1.8 * styrke, angreb: 0.002 });  // drønet
  tone(m, { t, type: "triangle", frek: bund * 6, frekSlut: bund, varighed: 0.14, styrke: 0.8 * styrke });
  støjStød(m, { t: t + 0.01, varighed: 0.5 + hale, filter: "lowpass", frek: 1400, frekSlut: 110, styrke: 0.9 * styrke * hale, angreb: 0.02, buf: brunBuf });   // rumlen
  for (let i = 0; i < 14 * knitter; i++) klik(m, { t: t + 0.02 + Math.random() * 0.45, frek: 2200 + Math.random() * 6000, styrke: 0.45 * Math.random() });   // knitren
}
// Ekko, der hopper fra side til side (pan -1 … 1)
function sideEkko(kilde, forsinkelse, styrke, pan, mørk = 2000) {
  const d = ctx.createDelay(2); d.delayTime.value = forsinkelse;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = mørk;
  const g = ctx.createGain(); g.gain.value = styrke;
  kilde.connect(d); d.connect(f); f.connect(g);
  if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(ud); } else g.connect(ud);
}
function pingPong(m, styrke = 0.35) { [[0.11, -0.8], [0.23, 0.8], [0.37, -0.6], [0.53, 0.6], [0.72, 0]].forEach(([d, p], i) => sideEkko(m, d, styrke / (1 + i * 0.6), p, 2400 - i * 300)); }
// FM-hyl: en tone, der rystes af en anden (rumvæsen-lyden)
function hyl(m, t, { type = "sawtooth", frek, frekSlut, varighed, styrke, modFrek, modDybde }) {
  const h = tone(m, { t, type, frek, frekSlut, varighed, styrke });
  const mod = ctx.createOscillator(), mg = ctx.createGain(); mod.frequency.value = modFrek; mg.gain.value = modDybde;
  mod.connect(mg); mg.connect(h.frequency); mod.start(t); mod.stop(t + varighed + 0.02);
}
// plasma = gravitonkanonens "VUUUMP", retro = strålepistolens "PIU-IU-IU", hagl = energihaglgeværets BRAG, slim = krabbens "SPLURT"
export function energi(slags, pan = 0) {
  if (!ctx) return;
  const t = nu(), v = 1 + (Math.random() - 0.5) * 0.1;
  if (slags === "plasma") {
    const m = sciKæde(1.4, pan, 0.7);
    brag(m, t, { bund: 38 * v, styrke: 1.6, knitter: 1.8, hale: 1.6 });
    hyl(m, t, { type: "sine", frek: 60, frekSlut: 22, varighed: 1.1, styrke: 1.2, modFrek: 7, modDybde: 14 });      // undergrunds-drøn
    pingPong(m, 0.4);
    hyl(m, t, { frek: 1400 * v, frekSlut: 55, varighed: 0.6, styrke: 0.45, modFrek: 36, modDybde: 420 });
    hyl(m, t, { type: "square", frek: 700 * v, frekSlut: 40, varighed: 0.5, styrke: 0.3, modFrek: 9, modDybde: 120 });
    tone(m, { t, frek: 320, frekSlut: 28, varighed: 0.8, styrke: 1.4, angreb: 0.004 });
    støjStød(m, { t, varighed: 0.55, filter: "bandpass", frek: 300, frekSlut: 5000, Q: 1.5, styrke: 0.7, angreb: 0.03 });   // sug
    ekko(m, 0.13, 0.4, 1800); ekko(m, 0.31, 0.25, 1200); ekko(m, 0.6, 0.12, 800);
  } else if (slags === "retro") {
    const m = sciKæde(1.2, pan, 0.6);
    brag(m, t, { bund: 80 * v, styrke: 1.05, knitter: 1, hale: 0.6 });
    hyl(m, t, { type: "sawtooth", frek: 6000 * v, frekSlut: 700, varighed: 0.25, styrke: 0.15, modFrek: 60, modDybde: 900 });
    pingPong(m, 0.3);
    hyl(m, t, { type: "square", frek: 2100 * v, frekSlut: 260, varighed: 0.38, styrke: 0.38, modFrek: 30, modDybde: 260 });
    hyl(m, t, { type: "square", frek: 4200 * v, frekSlut: 520, varighed: 0.3, styrke: 0.18, modFrek: 31, modDybde: 500 });
    hyl(m, t, { type: "triangle", frek: 1050 * v, frekSlut: 130, varighed: 0.42, styrke: 0.35, modFrek: 15, modDybde: 90 });
    ekko(m, 0.09, 0.4, 3000); ekko(m, 0.19, 0.25, 2200); ekko(m, 0.3, 0.14, 1500);
  } else if (slags === "hagl") {
    skud("stor", pan);
    const m = sciKæde(1.45, pan, 0.65);
    brag(m, t, { bund: 44 * v, styrke: 1.8, knitter: 1.6, hale: 1.8 });
    tone(m, { t, frek: 90, frekSlut: 24, varighed: 0.9, styrke: 1.4, angreb: 0.002 });
    pingPong(m, 0.38);
    hyl(m, t, { frek: 1700 * v, frekSlut: 90, varighed: 0.3, styrke: 0.45, modFrek: 55, modDybde: 600 });
    tone(m, { t, type: "square", frek: 3200 * v, frekSlut: 180, varighed: 0.22, styrke: 0.25 });
    støjStød(m, { t, varighed: 0.35, filter: "highpass", frek: 5000, frekSlut: 1500, styrke: 0.5, angreb: 0.004 });
    ekko(m, 0.12, 0.35, 1500); ekko(m, 0.42, 0.2, 900);
  } else if (slags === "slim") {
    const m = sciKæde(1.3, pan, 0.45);
    brag(m, t, { bund: 62 * v, styrke: 1, knitter: 0.5, hale: 0.7 });
    pingPong(m, 0.22);
    tone(m, { t, frek: 220 * v, frekSlut: 1100, varighed: 0.11, styrke: 1, angreb: 0.004 });           // "blop"
    tone(m, { t: t + 0.04, frek: 900 * v, frekSlut: 150, varighed: 0.16, styrke: 0.6 });
    for (let i = 0; i < 4; i++) tone(m, { t: t + 0.05 + i * 0.04 + Math.random() * 0.02, frek: 400 + Math.random() * 900, frekSlut: 1500 + Math.random() * 900, varighed: 0.04, styrke: 0.35 });   // bobler
    støjStød(m, { t, varighed: 0.22, filter: "bandpass", frek: 1100, frekSlut: 300, Q: 2.5, styrke: 0.9, angreb: 0.01 });   // squelch
    ekko(m, 0.1, 0.3, 1600);
  }
}
// Et skud rammer væggen ude til højre: en eksplosion med drøn, knitren og ekko
export function nedslag(farveSlags, styrke = 1, pan = 0.8) {
  if (!ctx) return;
  const t = nu(), m = sciKæde(1.2 * styrke, pan, 0.7);
  brag(m, t, { bund: (farveSlags === "retro" ? 90 : 34) * (1 + (Math.random() - 0.5) * 0.15), styrke: 1.4 * styrke, knitter: 1.5, hale: 1.4 * styrke });
  støjStød(m, { t, varighed: 0.6, filter: "lowpass", frek: 3000, frekSlut: 160, styrke: 1.2 * styrke, angreb: 0.004 });
  if (farveSlags === "retro") hyl(m, t, { type: "square", frek: 2600, frekSlut: 1800, varighed: 0.25, styrke: 0.18, modFrek: 40, modDybde: 600 });
  pingPong(m, 0.3 * styrke);
}
// Den nye energicelle lader op: en stigende hvinen, der ender i et "pling"
export function opladning(varighed = 0.7) {
  if (!ctx) return;
  const t = nu(), m = kæde(0.5, 0, 0.25);
  tone(m, { t, type: "sine", frek: 180, frekSlut: 2200, varighed, styrke: 0.28, angreb: varighed * 0.6 });
  tone(m, { t, type: "triangle", frek: 90, frekSlut: 1100, varighed, styrke: 0.18, angreb: varighed * 0.6 });
  [0, 7, 12].forEach((n, i) => tone(m, { t: t + varighed + i * 0.06, type: "triangle", frek: 1318 * 2 ** (n / 12), varighed: 0.3, styrke: 0.12 }));
}

// ---------- Lysværdet ----------
// Brummen: to savtakker, der ligger en anelse skævt af hinanden (så de "slår"), gennem et filter.
// Når sværdet svinges, bliver brummen højere og lysere, og et sus af luft blandes ind.
let brum = null, sidsteFart = -1;
export function sværdBrum(på) {
  if (!ctx) return;
  if (på && !brum) {
    const t = nu(), m = kæde(1, 0, 0.25);
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.32, t, 0.06);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 3;
    const o = [["sawtooth", 88], ["sawtooth", 90.7], ["sine", 176]].map(([type, f]) => {
      const n = ctx.createOscillator(); n.type = type; n.frequency.value = f; n.connect(lp); return n;
    });
    lp.connect(g); g.connect(m);
    const sus = ctx.createBufferSource(); sus.buffer = støjBuf; sus.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 1.4;
    const sg = ctx.createGain(); sg.gain.value = 0;
    sus.connect(bp); bp.connect(sg); sg.connect(m);
    [...o, sus].forEach(n => n.start(t));
    brum = { g, lp, o, bp, sg, kilder: [...o, sus] }; sidsteFart = -1;
  } else if (!på && brum) {
    const b = brum, t = nu(); brum = null;
    b.g.gain.cancelScheduledValues(t); b.g.gain.setTargetAtTime(0, t, 0.05);
    b.sg.gain.cancelScheduledValues(t); b.sg.gain.setTargetAtTime(0, t, 0.05);
    b.kilder.forEach(k => k.stop(t + 0.4));
  }
}
// f: 0 = sværdet står stille … 1 = et hurtigt sving
export function sværdFart(f) {
  if (!brum) return;
  f = Math.min(1.5, f);
  if (Math.abs(f - sidsteFart) < 0.02) return;
  sidsteFart = f;
  const t = nu();
  brum.g.gain.setTargetAtTime(0.32 + 0.6 * f, t, 0.03);
  brum.lp.frequency.setTargetAtTime(420 + 2300 * f, t, 0.03);
  brum.o[0].frequency.setTargetAtTime(88 * (1 + 0.22 * f), t, 0.04);
  brum.o[1].frequency.setTargetAtTime(90.7 * (1 + 0.22 * f), t, 0.04);
  brum.sg.gain.setTargetAtTime(0.9 * f, t, 0.03);
  brum.bp.frequency.setTargetAtTime(600 + 1700 * f, t, 0.04);
}
// Klingen tændes: et smæld, et stigende "VRUMMM" og elektrisk knitren
export function sværdTænd(pan = 0) {
  if (!ctx) return;
  const t = nu(), m = sciKæde(0.9, pan, 0.5);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
  lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(4200, t + 0.18); lp.frequency.exponentialRampToValueAtTime(600, t + 0.55); lp.connect(m);
  tone(lp, { t, type: "sawtooth", frek: 40, frekSlut: 180, varighed: 0.55, styrke: 0.6, angreb: 0.05 });
  tone(lp, { t, type: "sawtooth", frek: 43, frekSlut: 186, varighed: 0.55, styrke: 0.5, angreb: 0.05 });
  støjStød(m, { t, varighed: 0.32, filter: "bandpass", frek: 400, frekSlut: 4200, Q: 1.2, styrke: 0.8, angreb: 0.03 });
  støjStød(m, { t, varighed: 0.04, filter: "highpass", frek: 2000, styrke: 1.0, angreb: 0.0005 });
  tone(m, { t, frek: 110, frekSlut: 38, varighed: 0.45, styrke: 1.1 });
  for (let i = 0; i < 9; i++) klik(m, { t: t + Math.random() * 0.32, frek: 2500 + Math.random() * 5000, styrke: 0.35 * Math.random() });
  ekko(m, 0.12, 0.25, 1800);
}
// Klingen slukkes: brummen falder ned og forsvinder
export function sværdSluk(pan = 0) {
  if (!ctx) return;
  const t = nu(), m = sciKæde(0.8, pan, 0.4);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
  lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.42); lp.connect(m);
  tone(lp, { t, type: "sawtooth", frek: 185, frekSlut: 34, varighed: 0.45, styrke: 0.6, angreb: 0.005 });
  tone(lp, { t, type: "sawtooth", frek: 178, frekSlut: 31, varighed: 0.45, styrke: 0.45, angreb: 0.005 });
  støjStød(m, { t, varighed: 0.36, filter: "bandpass", frek: 3000, frekSlut: 300, Q: 1.2, styrke: 0.6, angreb: 0.01 });
}
// Et sving gennem luften: "SVUUSH"
export function sværdSus(pan = 0, styrke = 1) {
  if (!ctx) return;
  const t = nu(), m = kæde(0.85 * styrke, pan, 0.2);
  støjStød(m, { t, varighed: 0.24, filter: "bandpass", frek: 380, frekSlut: 2500, Q: 1.3, styrke: 0.9, angreb: 0.1 });
  tone(m, { t, type: "triangle", frek: 95, frekSlut: 165, varighed: 0.26, styrke: 0.35, angreb: 0.08 });
}
// Klingen hugger ned i bordet: smæld, metalklang, elektrisk "BZZRT" og træ, der syder
export function sværdSlag(pan = 0, styrke = 1) {
  if (!ctx) return;
  const t = nu(), m = sciKæde(1.3 * styrke, pan, 0.55);
  brag(m, t, { bund: 70 * (1 + (Math.random() - 0.5) * 0.15), styrke: 1.05, knitter: 1.5, hale: 0.7 });
  klang(m, { t, frek: 1450 + Math.random() * 300, forhold: [1, 2.76, 5.4, 8.9], henfald: 0.3, styrke: 0.5 });
  hyl(m, t, { type: "sawtooth", frek: 900, frekSlut: 160, varighed: 0.32, styrke: 0.35, modFrek: 47, modDybde: 380 });
  støjStød(m, { t: t + 0.02, varighed: 0.55, filter: "highpass", frek: 4200, frekSlut: 2200, styrke: 0.55, angreb: 0.01 });
  pingPong(m, 0.25);
}

// ---------- Mekanik ----------
export function mekanik(navn, pan = 0) {
  if (!ctx) return;
  const m = kæde(0.9, pan, 0.1), t = nu();
  const glid = (varighed, fra, til, s = 0.25) => støjStød(m, { t, varighed, filter: "bandpass", frek: fra, frekSlut: til, Q: 1.6, styrke: s, angreb: varighed * 0.3 });
  switch (navn) {
    case "magUd": klik(m, { frek: 2600, styrke: 0.6 }); glid(0.14, 1800, 700, 0.2); break;
    case "magInd": støjStød(m, { varighed: 0.05, filter: "lowpass", frek: 900, styrke: 0.8 }); tone(m, { frek: 240, frekSlut: 120, varighed: 0.05, styrke: 0.5 }); klik(m, { t: t + 0.03, frek: 3000, styrke: 0.7 }); break;
    case "boltFrem": glid(0.05, 2400, 1200, 0.25); klik(m, { t: t + 0.045, frek: 2100, styrke: 0.9 }); klang(m, { t: t + 0.045, frek: 1500, henfald: 0.09, styrke: 0.3 }); break;
    case "spænd": klik(m, { frek: 2400, styrke: 0.5 }); glid(0.13, 1300, 2700, 0.24); klik(m, { t: t + 0.14, frek: 1900, styrke: 0.7 }); break;   // ladegrebet trækkes tilbage og låses
    case "pumpeTilbage": glid(0.07, 900, 2200, 0.35); klik(m, { t: t + 0.06, frek: 1700, styrke: 0.8 }); break;   // haglgeværets pumpe: "klik"
    case "pumpeFrem": glid(0.07, 2200, 900, 0.35); klik(m, { t: t + 0.06, frek: 2300, styrke: 0.9 }); klang(m, { t: t + 0.06, frek: 1200, henfald: 0.08, styrke: 0.25 }); break;   // … "klak"
    case "skal": klik(m, { frek: 2600, styrke: 0.6 }); glid(0.06, 1200, 700, 0.2); break;   // en patron trykkes ind i haglgeværet
    case "slædeFrem": glid(0.04, 2600, 1300, 0.25); klik(m, { t: t + 0.04, frek: 2300, styrke: 0.9 }); klang(m, { t: t + 0.04, frek: 1700, henfald: 0.07, styrke: 0.25 }); break;
    case "dæmperPå": for (let i = 0; i < 4; i++) klik(m, { t: t + i * 0.09, frek: 3600 - i * 200, styrke: 0.25 }); glid(0.38, 1400, 2400, 0.12); klik(m, { t: t + 0.42, frek: 2000, styrke: 0.6 }); break;
    case "dæmperAf": glid(0.3, 2400, 1300, 0.12); for (let i = 0; i < 3; i++) klik(m, { t: t + i * 0.08, frek: 3400, styrke: 0.2 }); break;
    case "celleUd": støjStød(m, { varighed: 0.35, filter: "highpass", frek: 3000, frekSlut: 6000, styrke: 0.35, angreb: 0.01 }); klik(m, { frek: 2200, styrke: 0.6 }); break;
    case "celleInd": klik(m, { frek: 2800, styrke: 0.7 }); tone(m, { frek: 320, frekSlut: 160, varighed: 0.06, styrke: 0.4 }); break;
  }
}

// ---------- Ting der lander på bordet ----------
// slags: "messing" (hylster), "magasin" (tungt metal), "celle" (glas og metal)
export function lander(slags, styrke = 1, pan = 0) {
  if (!ctx) return;
  const s = Math.min(1, styrke), m = kæde(s * 0.55, pan, 0.08), t = nu();
  if (slags === "magasin") { støjStød(m, { varighed: 0.08, filter: "lowpass", frek: 1300, styrke: 1 }); klang(m, { frek: 520 + Math.random() * 120, henfald: 0.16, styrke: 0.35 }); return; }
  if (slags === "celle") { klang(m, { frek: 1900 + Math.random() * 500, forhold: [1, 2.71, 5.1], henfald: 0.35, styrke: 0.4 }); støjStød(m, { varighed: 0.01, filter: "highpass", frek: 5000, styrke: 0.3 }); return; }
  if (slags === "slim") {   // en klat slim rammer bordet: "SPLAT"
    const sm = kæde(0.9, pan, 0.2);
    støjStød(sm, { varighed: 0.2, filter: "lowpass", frek: 1400, frekSlut: 200, styrke: 1.4 }); støjStød(sm, { varighed: 0.1, filter: "bandpass", frek: 2400, Q: 2, styrke: 0.6 });
    tone(sm, { frek: 200, frekSlut: 50, varighed: 0.14, styrke: 0.9 }); return;
  }
  if (slags === "energi") { klang(m, { t, frek: 1600 + Math.random() * 500, henfald: 0.2, styrke: 0.4 }); return; }    // et tomt energihylster
  if (slags === "led") { klik(m, { frek: 4200 + Math.random() * 800, styrke: 0.35, tørt: 0.01 }); return; }     // båndled fra maskingeværet
  if (slags === "stor") { klang(m, { t, frek: 2100 + Math.random() * 900, henfald: 0.24 + Math.random() * 0.12, styrke: 0.55 }); støjStød(m, { t, varighed: 0.01, filter: "highpass", frek: 4000, styrke: 0.45 }); return; }
  // Messing klinger højt og lyst — hvert hylster lidt forskelligt
  klang(m, { t, frek: 2900 + Math.random() * 1800, henfald: 0.14 + Math.random() * 0.14, styrke: 0.5 });
  støjStød(m, { t, varighed: 0.007, filter: "highpass", frek: 5000, styrke: 0.4 });
}
