// ===== Lyde og musik til Broekraft — alt laves med Web Audio, ingen lydfiler =====

let ac = null, ud = null, musikG = null, ekko = null, støjBuf = null, musikTil = true, musikStil = "stille";

export function klar() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  ac = window.Effekter.audio();
  ud = ac.createGain(); ud.gain.value = 0.9;
  const komp = ac.createDynamicsCompressor();          // så store brag ikke skratter
  ud.connect(komp); komp.connect(ac.destination);
  musikG = ac.createGain(); musikG.gain.value = musikTil ? 1 : 0; musikG.connect(ud);
  // ekko til rum-musikken
  const forsink = ac.createDelay(1), tilbage = ac.createGain();
  ekko = ac.createGain(); ekko.gain.value = stemning.ekko ? 0.5 : 0;
  forsink.delayTime.value = 0.38; tilbage.gain.value = 0.4;
  musikG.connect(ekko); ekko.connect(forsink); forsink.connect(tilbage); tilbage.connect(forsink); forsink.connect(ud);
  støjBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = støjBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  (function musikLøkke() {
    if (musikTil && musikStil === "stille" && !document.hidden) frase();
    setTimeout(musikLøkke, stemning.pause[0] + Math.random() * (stemning.pause[1] - stemning.pause[0]));
  })();
  (function fugleLøkke() {
    setTimeout(() => { if (!document.hidden && (musikStil === "stille" || musikStil === "fra")) fugl(); fugleLøkke(); }, 6000 + Math.random() * 9000);
  })();
  if (SEKVENSER[musikStil]) startSekvens(musikStil);
}

export function sætMusik(til) {
  musikTil = til;
  if (musikG) musikG.gain.setTargetAtTime(til ? 1 : 0, ac.currentTime, 0.3);
}

// Vælg baggrundsmusik: "stille" (den rolige, der passer til verdenen), "hardstyle", "rock", "chip" (8-bit) eller "fra"
export const MUSIKSTILE = [
  { id: "stille", navn: "🎹 Stille" }, { id: "hardstyle", navn: "🔊 Hardstyle" }, { id: "rock", navn: "🎸 Rock" },
  { id: "chip", navn: "👾 8-bit" }, { id: "fra", navn: "🔇 Fra" },
];
export function sætMusikStil(stil) {
  musikStil = MUSIKSTILE.some(s => s.id === stil) ? stil : "stille";
  sætMusik(musikStil !== "fra");
  if (!ac) return;
  stopSekvens();
  if (SEKVENSER[musikStil]) startSekvens(musikStil);
}

// Når et andet barn taler i walkie-talkien, bliver spillets musik og lyde stille, så man kan høre det
export function dæmp(til) { if (ud) ud.gain.setTargetAtTime(til ? 0.3 : 0.9, ac.currentTime, 0.15); }

const nu = () => ac.currentTime;
function tone(f, t0, dur, type = "sine", vol = 0.2, slut, mål = ud) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (slut) o.frequency.exponentialRampToValueAtTime(slut, t0 + dur);
  o.connect(g); g.connect(mål);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.03);
}
function sus(t0, dur, fra, til, vol, type = "bandpass", q = 1) {
  if (!ac) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = støjBuf;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(fra, t0);
  f.frequency.exponentialRampToValueAtTime(til, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.01, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(ud);
  s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
}
function glid(f0, f1, t0, dur, { type = "sine", vol = 0.25, vibHz = 0, vib = 0, filter = 0, q = 1 } = {}) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  if (vibHz) {
    const l = ac.createOscillator(), lg = ac.createGain();
    l.frequency.value = vibHz; lg.gain.value = vib;
    l.connect(lg); lg.connect(o.frequency);
    l.start(t0); l.stop(t0 + dur + 0.05);
  }
  let sidste = o;
  if (filter) {
    const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = filter; f.Q.value = q;
    o.connect(f); sidste = f;
  }
  sidste.connect(g); g.connect(ud);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
  g.gain.setValueAtTime(vol, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

// ---------- Musik der finder på sig selv — hver verden har sin stemning ----------
const STEMNINGER = {
  rolig: { skala: [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0], type: "sine", længde: 2.4, vol: 0.05, noder: 3, pause: [2600, 5200] },
  uhyggelig: { skala: [110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.7], type: "triangle", længde: 3.2, vol: 0.06, noder: 2, pause: [3000, 5500], klokke: true },
  glad: { skala: [523.3, 587.3, 659.3, 740.0, 784.0, 880.0, 987.8, 1046.5], type: "triangle", længde: 0.8, vol: 0.05, noder: 6, pause: [1600, 3200] },
  rum: { skala: [261.6, 293.7, 329.6, 370.0, 415.3, 466.2, 523.3, 587.3], type: "sine", længde: 4.5, vol: 0.045, noder: 2, pause: [3500, 6500], ekko: true },
};
let stemning = STEMNINGER.rolig;
export function sætStemning(navn) {
  stemning = STEMNINGER[navn] || STEMNINGER.rolig;
  if (ekko) ekko.gain.value = stemning.ekko ? 0.5 : 0;
}
function klaver(f, t0, dur, vol) {
  tone(f, t0, dur, stemning.type, vol, null, musikG);
  tone(f * 2, t0, dur * 0.5, "triangle", vol * 0.25, null, musikG);
}
function frase() {
  if (!ac) return;
  const S = stemning.skala, t = nu() + 0.05, n = 1 + Math.floor(Math.random() * stemning.noder), trin = stemning.længde < 1 ? 0.2 : 0.5;
  let i = Math.floor(Math.random() * S.length);
  for (let k = 0; k < n; k++) {
    i = Math.max(0, Math.min(S.length - 1, i + Math.floor(Math.random() * 5) - 2));
    klaver(S[i], t + k * trin + Math.random() * 0.05, stemning.længde, stemning.vol);
  }
  if (Math.random() < 0.5) klaver(S[Math.floor(Math.random() * 4)] / 2, t, stemning.længde * 1.3, stemning.vol * 0.8);
  if (stemning.klokke && Math.random() < 0.3) tone(880, t + 0.3, 2.5, "sine", 0.03, null, musikG);   // fjern klokke
}

// ---------- Baggrundsmusik: hardstyle, rock og 8-bit ----------
// En lille sequencer spiller 16-dele efter et mønster. Instrumenterne er bygget af oscillatorer,
// støj og forvrængning. Nye numre: tilføj en stil i SEKVENSER med bpm og trin(i, tid, længde).
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let sekvens = null, kæder = null;

// Forvrængning (tanh-kurve): højere mængde = mere smadder
function forvræng(mængde) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * mængde); }
  const w = ac.createWaveShaper(); w.curve = c; w.oversample = "2x";
  return w;
}
function filt(type, f, q = 0.7) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function forstærk(v) { const g = ac.createGain(); g.gain.value = v; return g; }
function kobl(...noder) { for (let i = 0; i < noder.length - 1; i++) noder[i].connect(noder[i + 1]); return noder[0]; }
// Faste effektkæder, som tonerne sendes ind i
function lavKæder() {
  if (kæder) return kæder;
  const lead = forstærk(1), ekkoL = ac.createDelay(1), igen = forstærk(0.3);
  ekkoL.delayTime.value = 0.3;
  lead.connect(musikG); lead.connect(ekkoL); ekkoL.connect(igen); igen.connect(ekkoL); igen.connect(musikG);
  kæder = {
    kick: kobl(forstærk(1), forvræng(9), filt("lowpass", 5000), filt("highpass", 30), forstærk(0.32), musikG),    // hardstyle-kick
    guitar: kobl(forstærk(1), forvræng(28), filt("lowpass", 3800), filt("highpass", 90), forstærk(0.11), musikG), // el-guitar
    lead,
  };
  return kæder;
}
function hylster(t, vol, anslag, hold, slip) {                    // lydstyrke: op, hold, ned
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + anslag);
  g.gain.setValueAtTime(vol, t + anslag + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + anslag + hold + slip);
  return g;
}
function osc(type, f, t, slut, mål, detune = 0) {
  const o = ac.createOscillator();
  if (typeof type === "string") o.type = type; else o.setPeriodicWave(type);
  o.frequency.value = f; o.detune.value = detune; o.connect(mål); o.start(t); o.stop(slut);
  return o;
}
function støj(t, varighed, type, f, vol, q = 0.8, mål = musikG) {
  const s = ac.createBufferSource(), g = hylster(t, vol, 0.002, 0, varighed);
  s.buffer = støjBuf; kobl(s, filt(type, f, q), g, mål);
  s.start(t, Math.random()); s.stop(t + varighed + 0.05);
}

// --- Trommer ---
function stortromme(t, vol = 0.8) {
  const g = hylster(t, vol, 0.002, 0.02, 0.25), o = osc("sine", 150, t, t + 0.3, g);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.1); g.connect(musikG);
}
function lilletromme(t, vol = 0.5) {
  støj(t, 0.16, "bandpass", 1900, vol, 0.7);
  const g = hylster(t, vol * 0.5, 0.002, 0, 0.1), o = osc("triangle", 200, t, t + 0.12, g);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.1); g.connect(musikG);
}
function hihat(t, vol = 0.08, åben = false) { støj(t, åben ? 0.22 : 0.04, "highpass", 7500, vol, 0.7); }
function klap(t, vol = 0.35) { for (const d of [0, 0.011, 0.022]) støj(t + d, d === 0.022 ? 0.14 : 0.012, "bandpass", 1150, vol, 1.2); }
function bækken(t, vol = 0.2) { støj(t, 1.3, "highpass", 5000, vol, 0.5); }

// --- Hardstyle: et tungt, forvrænget kick med en tone i halen og en bred supersaw-melodi ---
function hardKick(t, grund) {
  const g = hylster(t, 1, 0.001, 0.16, 0.2), o = osc("sine", 260, t, t + 0.4, g);
  o.frequency.exponentialRampToValueAtTime(grund * 2.2, t + 0.025);
  o.frequency.exponentialRampToValueAtTime(grund, t + 0.1);
  g.connect(kæder.kick);
  støj(t, 0.012, "highpass", 3000, 0.25);                        // klik foran
}
function supersaw(t, midi, varighed, vol) {
  const g = hylster(t, vol, 0.008, varighed * 0.6, varighed * 0.4), lp = filt("lowpass", 5200);
  kobl(g, lp, kæder.lead);
  for (const d of [-22, -9, 0, 9, 22]) osc("sawtooth", mtof(midi), t, t + varighed + 0.05, g, d);
  osc("sawtooth", mtof(midi - 12), t, t + varighed + 0.05, g, 4);
}
// --- Rock: power chords (grundtone, kvint, oktav) gennem kraftig forvrængning ---
function guitar(t, midi, varighed, dæmpet) {
  const g = hylster(t, dæmpet ? 0.9 : 0.7, 0.004, varighed * 0.7, dæmpet ? 0.05 : varighed * 0.5), lp = filt("lowpass", dæmpet ? 900 : 3600);
  kobl(g, lp, kæder.guitar);
  for (const [iv, v] of [[0, 1], [7, 0.8], [12, 0.55]]) for (const d of [-7, 7]) {
    const og = forstærk(v); og.connect(g); osc("sawtooth", mtof(midi + iv), t, t + varighed + 0.3, og, d);
  }
}
function bas(t, midi, varighed, vol = 0.18) {
  const g = hylster(t, vol, 0.005, varighed * 0.7, varighed * 0.3), lp = filt("lowpass", 420);
  kobl(g, lp, musikG); osc("sawtooth", mtof(midi), t, t + varighed + 0.05, g);
}
// --- 8-bit: firkant- og trekantsbølger som i gamle spillemaskiner ---
let pulsBølge = null;
function puls() {                                                // smal firkantbølge (25 %) — den klassiske 8-bit-lyd
  if (!pulsBølge) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    pulsBølge = ac.createPeriodicWave(re, im);
  }
  return pulsBølge;
}
function chip(t, midi, varighed, bølge, vol) {
  const g = hylster(t, vol, 0.003, varighed * 0.5, varighed * 0.5);
  g.connect(musikG); osc(bølge === "puls" ? puls() : bølge, mtof(midi), t, t + varighed + 0.05, g);
}
function chipKick(t) { const g = hylster(t, 0.35, 0.001, 0.02, 0.08), o = osc("square", 180, t, t + 0.12, g); o.frequency.exponentialRampToValueAtTime(45, t + 0.08); kobl(g, filt("lowpass", 1200), musikG); }
function chipSnare(t) { støj(t, 0.09, "highpass", 1800, 0.22); chip(t, 60, 0.04, "square", 0.05); }

// --- Numrene ---
const HS = [                                                     // Am – F – C – G
  { rod: 45, melodi: [69, 72, 76, 72, 81, 79, 76, 72] },
  { rod: 41, melodi: [65, 69, 72, 69, 77, 76, 72, 69] },
  { rod: 48, melodi: [67, 72, 76, 72, 79, 76, 72, 67] },
  { rod: 43, melodi: [67, 71, 74, 71, 79, 74, 71, 74] },
];
const c = tone => ({ tone, lang: false }), l = tone => ({ tone, lang: true });
const RIFF = [                                                   // E-mol: tunge "chugs" og lange akkorder
  [c(40), c(40), c(40), null, c(40), c(40), l(43), null, c(40), c(40), l(45), null, c(40), c(40), c(46), c(45)],
  [c(40), c(40), c(40), null, c(40), c(40), l(38), null, c(40), c(40), l(43), null, l(42), null, c(40), c(40)],
];
const CHIP = [                                                   // C – G – Am – F, glad og hurtig
  { rod: 36, akkord: [60, 64, 67, 72], melodi: [76, 76, 79, 76, 72, 74, 76, null] },
  { rod: 43, akkord: [59, 62, 67, 71], melodi: [74, 74, 79, 74, 71, 72, 74, null] },
  { rod: 45, akkord: [57, 60, 64, 69], melodi: [72, 72, 76, 72, 69, 71, 72, 76] },
  { rod: 41, akkord: [57, 60, 65, 69], melodi: [77, 76, 74, 72, 74, 76, 72, null] },
];
const SEKVENSER = {
  hardstyle: { bpm: 150, trin(i, t, L) {
    const takt = Math.floor(i / 16) % 8, s = i % 16, a = HS[Math.floor(i / 16) % 4];
    const pause = takt === 7 && s >= 8;                          // et lille pust før næste runde
    if (s % 4 === 0 && !pause) hardKick(t, mtof(a.rod - 12));
    if (s % 4 === 2) hihat(t, 0.1, true);
    if ((s === 4 || s === 12) && !pause) klap(t);
    if (s % 2 === 0 && takt >= 2) { const n = a.melodi[s / 2]; if (n) supersaw(t, n, L * 1.8, 0.05); }
    if (takt < 2 && s === 0) supersaw(t, a.rod + 24, L * 14, 0.035);
    if (pause && s === 8) støj(t, L * 8, "bandpass", 800, 0.05, 0.5);   // sus op mod næste runde
  } },
  rock: { bpm: 138, trin(i, t, L) {
    const takt = Math.floor(i / 16) % 4, s = i % 16, n = RIFF[takt % 2][s];
    if ([0, 6, 8, 10].includes(s)) stortromme(t, 0.75);
    if (s === 4 || s === 12) lilletromme(t, 0.5);
    if (s % 2 === 0) hihat(t, 0.06);
    if (s === 0 && takt === 0) bækken(t);
    if (n) { const v = n.lang ? L * 2 : L * 0.9; guitar(t, n.tone, v, !n.lang); bas(t, n.tone - 12, v); }
  } },
  chip: { bpm: 160, trin(i, t, L) {
    const s = i % 16, a = CHIP[Math.floor(i / 16) % 4];
    if (s % 2 === 0) { const n = a.melodi[s / 2]; if (n) chip(t, n, L * 1.7, "puls", 0.06); }
    chip(t, a.akkord[s % 4] + 12, L * 0.8, "square", 0.018);
    if (s % 2 === 0) chip(t, a.rod + (s % 4 === 2 ? 12 : 0), L * 1.6, "triangle", 0.15);
    if (s % 8 === 0) chipKick(t);
    if (s % 8 === 4) chipSnare(t);
    if (s % 2 === 1) hihat(t, 0.03);
  } },
};
// Planlæg tonerne lidt forud, så rytmen holder, selv om spillet har travlt
function startSekvens(stil) {
  lavKæder();
  sekvens = { s: SEKVENSER[stil], i: 0, næste: ac.currentTime + 0.1, timer: setInterval(planlæg, 25) };
}
function stopSekvens() { if (sekvens) clearInterval(sekvens.timer); sekvens = null; }
function planlæg() {
  if (!sekvens || !ac) return;
  if (document.hidden || !musikTil || ac.state !== "running") { sekvens.næste = ac.currentTime + 0.1; return; }
  const L = 60 / sekvens.s.bpm / 4;
  if (sekvens.næste < ac.currentTime - 0.2) sekvens.næste = ac.currentTime + 0.05;    // efter en pause
  while (sekvens.næste < ac.currentTime + 0.12) { sekvens.s.trin(sekvens.i, sekvens.næste, L); sekvens.næste += L; sekvens.i++; }
}

// ---------- Blokke, skridt og bevægelse ----------
const MAT = {
  græs: { f: 900, q: 0.8, tone: 160 }, sten: { f: 2200, q: 1.5, tone: 260 }, træ: { f: 650, q: 2, tone: 190 },
  sand: { f: 1500, q: 0.5, tone: 150 }, glas: { f: 3500, q: 3, tone: 1400 }, uld: { f: 500, q: 0.7, tone: 140 },
  metal: { f: 3000, q: 6, tone: 1100 }, vand: { f: 700, q: 1.2, tone: 300 }, lava: { f: 400, q: 1, tone: 110 },
  ild: { f: 2500, q: 0.8, tone: 400 },
};
const mat = m => MAT[m] || MAT.græs;

export function sæt(m) {
  if (!ac) return;
  const M = mat(m);
  sus(nu(), 0.1, M.f * 1.2, M.f * 0.6, 0.35, "bandpass", M.q);
  tone(M.tone, nu(), 0.08, "sine", 0.3, M.tone * 0.6);
}
export function hak(m) {
  if (!ac) return;
  const M = mat(m);
  sus(nu(), 0.05, M.f * 1.5, M.f, 0.18, "bandpass", M.q);
}
export function knus(m) {
  if (!ac) return;
  const M = mat(m);
  sus(nu(), 0.25, M.f * 1.4, M.f * 0.4, 0.45, "bandpass", M.q);
  for (let i = 0; i < 3; i++) sus(nu() + 0.03 + i * 0.05, 0.05, M.f * 2, M.f, 0.2, "bandpass", M.q);
  if (m === "glas") [2600, 3300, 2900].forEach((f, i) => tone(f, nu() + i * 0.04, 0.2, "sine", 0.08));
}
export function skridt(m) {
  if (!ac) return;
  const M = mat(m);
  sus(nu(), 0.07, M.f, M.f * 0.7, 0.07, "bandpass", M.q);
}
export function hop() { if (ac) glid(260, 420, nu(), 0.12, { vol: 0.06 }); }
export function land() { if (ac) { tone(90, nu(), 0.12, "sine", 0.3, 50); sus(nu(), 0.1, 800, 300, 0.12, "lowpass"); } }
export function flyv(til) { if (ac) { sus(nu(), 0.5, til ? 400 : 2000, til ? 2200 : 400, 0.25, "bandpass", 1); tone(til ? 500 : 800, nu(), 0.3, "triangle", 0.1, til ? 900 : 400); } }
export function klik() { if (ac) tone(900, nu(), 0.05, "square", 0.05); }
export function vælg() { if (ac) tone(700, nu(), 0.07, "triangle", 0.15, 1000); }
export function æg() {
  if (!ac) return;
  tone(600, nu(), 0.09, "sine", 0.3, 200);
  [784, 988, 1175, 1568].forEach((f, i) => tone(f, nu() + 0.1 + i * 0.07, 0.25, "triangle", 0.12));
}
export function puf() {           // zombier og spøgelser der forsvinder i konfetti
  if (!ac) return;
  sus(nu(), 0.3, 3000, 400, 0.4, "bandpass", 0.8);
  [1047, 1319, 1568].forEach((f, i) => tone(f, nu() + 0.08 + i * 0.06, 0.2, "triangle", 0.12));
}
// ---------- TNT ----------
export function tænd() { if (ac) sus(nu(), 0.35, 800, 5000, 0.25, "bandpass", 1.5); }
export function lunte() {
  if (!ac) return;
  sus(nu(), 0.09, 6000, 4000, 0.06, "highpass", 0.7);
  if (Math.random() < 0.3) tone(2000 + Math.random() * 1500, nu(), 0.02, "square", 0.03);
}
export function bum(afstand = 0) {
  if (!ac) return;
  const v = Math.max(0.25, 1 - afstand / 35), t = nu();
  sus(t, 1.4, 1500, 50, 0.9 * v, "lowpass", 0.6);
  tone(80, t, 0.7, "sine", 0.8 * v, 28);
  tone(45, t, 1.0, "sine", 0.5 * v, 25);
  for (let i = 0; i < 8; i++) sus(t + 0.05 + Math.random() * 0.6, 0.07, 3500, 1800, 0.18 * v, "bandpass", 1.2);
}
export function boing() { if (ac) glid(180, 620, nu(), 0.35, { vol: 0.22, vibHz: 14, vib: 50 }); }
export function bank(m) {         // hammerslag
  if (!ac) return;
  tone(160, nu(), 0.12, "square", 0.12, 70);
  knus(m);
}
export function fugl() {
  if (!ac) return;
  const f = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3), t0 = nu();
  for (let i = 0; i < n; i++) tone(f * (1 + (i % 2) * 0.12), t0 + i * 0.12, 0.08, "sine", 0.035, f * 1.35);
}

// ---------- Vand, lava og ild ----------
const nær = afstand => Math.max(0, 1 - afstand / 24);
export function plask(afstand = 0) {       // man hopper i vandet eller hælder vand ud
  if (!ac) return;
  const v = nær(afstand), t = nu();
  if (v <= 0) return;
  sus(t, 0.45, 2500, 300, 0.4 * v, "bandpass", 0.7);
  for (let i = 0; i < 4; i++) glid(500 + Math.random() * 500, 1200 + Math.random() * 800, t + 0.05 + i * 0.06, 0.07, { vol: 0.08 * v });
}
export function blub(afstand = 0) {        // en boble i vandet eller i lavaen
  if (!ac) return;
  const v = nær(afstand);
  if (v > 0) glid(180 + Math.random() * 120, 520 + Math.random() * 200, nu(), 0.09, { vol: 0.16 * v });
}
export function tss(afstand = 0) {         // lava der møder vand bliver til sten
  if (!ac) return;
  const v = nær(afstand);
  if (v > 0) sus(nu(), 0.8, 7000, 2500, 0.3 * v, "highpass", 0.6);
}
export function knitre(afstand = 0) {      // ild der knitrer
  if (!ac) return;
  const v = nær(afstand), t = nu();
  if (v <= 0) return;
  for (let i = 0; i < 3; i++) sus(t + Math.random() * 0.25, 0.03, 3000 + Math.random() * 2000, 1500, 0.14 * v, "bandpass", 2);
  sus(t, 0.3, 500, 300, 0.05 * v, "lowpass");
}
export function tændIld() {                // wuusj — ilden blusser op
  if (!ac) return;
  sus(nu(), 0.5, 300, 1800, 0.35, "bandpass", 0.8);
  knitre(0);
}
export function av() {                     // lava eller ild: en lille hoppende tone, ingen skade
  if (!ac) return;
  const t = nu();
  glid(900, 500, t, 0.14, { type: "triangle", vol: 0.2 });
  glid(1000, 1500, t + 0.15, 0.18, { type: "triangle", vol: 0.18 });
  sus(t, 0.3, 5000, 2000, 0.12, "highpass", 0.6);
}

// ---------- Skydebanen (legetøjslyde) ----------
export function skud() {                   // pjuu — legetøjsgeværet
  if (!ac) return;
  glid(1500, 420, nu(), 0.11, { type: "square", vol: 0.06, filter: 3000 });
  sus(nu(), 0.05, 5000, 2500, 0.1, "highpass", 0.8);
}
export function bazookaSkud() {            // fuuusj — raketten flyver af sted
  if (!ac) return;
  sus(nu(), 0.7, 300, 1800, 0.35, "bandpass", 0.9);
  tone(130, nu(), 0.25, "sine", 0.3, 60);
}
export function kanonSkud() {              // en dyb "dunk" fra kampvognen
  if (!ac) return;
  tone(95, nu(), 0.35, "sine", 0.45, 40);
  sus(nu(), 0.35, 1400, 160, 0.35, "lowpass", 0.7);
}
export function klask(styrke = 1) {        // en blød skumkugle eller malingsklat
  if (!ac) return;
  sus(nu(), 0.16, 900, 200, 0.35 * styrke, "lowpass", 1);
  glid(320, 130, nu(), 0.14, { vol: 0.14 * styrke });
}
export function ballon(afstand = 0) {      // ballonen springer
  if (!ac) return;
  const v = Math.max(0.2, 1 - afstand / 40);
  sus(nu(), 0.07, 6000, 1500, 0.45 * v, "bandpass", 0.6);
  tone(1100, nu(), 0.05, "square", 0.07 * v, 300);
}
export function point() { if (ac) [1319, 1760].forEach((f, i) => tone(f, nu() + i * 0.07, 0.12, "triangle", 0.1)); }

// ---------- Fyrværkeri ----------
const fjern = afstand => Math.max(0.15, 1 - afstand / 90);
export function fløjt(afstand = 0) {       // raketten hviner op
  if (!ac) return;
  const v = fjern(afstand);
  glid(500, 1800, nu(), 0.9, { type: "triangle", vol: 0.05 * v, vibHz: 16, vib: 25 });
  sus(nu(), 0.9, 2000, 6000, 0.07 * v, "highpass", 0.5);
}
export function fyrBrag(afstand = 0) {     // et blødt, dybt brag — ikke så højt som TNT
  if (!ac) return;
  const v = fjern(afstand), t = nu() + Math.min(0.4, afstand / 340);   // lyden kommer lidt efter lyset
  sus(t, 1.1, 900, 70, 0.45 * v, "lowpass", 0.6);
  tone(70, t, 0.5, "sine", 0.3 * v, 35);
}
export function fyrKnitre(afstand = 0) {   // gnister, der knitrer
  if (!ac) return;
  const v = fjern(afstand), t = nu() + 0.3;
  for (let i = 0; i < 16; i++) sus(t + Math.random() * 1.3, 0.025, 5000 + Math.random() * 3000, 2500, 0.12 * v, "highpass", 1);
}
export function gnistre() {                // stjernekasteren
  if (ac) sus(nu(), 0.06, 7000, 4000, 0.03, "highpass", 1);
}

// ---------- Dyrenes stemmer (vælges med "lyd" i dyr.js) ----------
export function dyrLyd(type, afstand = 0) {
  if (!ac) return;
  const v = Math.max(0.25, 1 - afstand / 14), t = nu();
  switch (type) {
    case "muh": glid(155, 110, t, 1.0, { type: "sawtooth", vol: 0.3 * v, vibHz: 5, vib: 4, filter: 600, q: 1.5 }); break;
    case "øf": for (const d of [0, 0.18]) glid(260, 190, t + d, 0.13, { type: "square", vol: 0.18 * v, filter: 900, q: 3 }); break;
    case "mæh": glid(430, 380, t, 0.7, { type: "sawtooth", vol: 0.22 * v, vibHz: 16, vib: 30, filter: 1300, q: 2 }); break;
    case "kluk": [0, 0.12, 0.24].forEach(d => glid(700, 520, t + d, 0.07, { type: "triangle", vol: 0.25 * v })); break;
    case "kvæk": for (const d of [0, 0.16]) glid(190, 140, t + d, 0.12, { type: "square", vol: 0.2 * v, filter: 700, q: 4 }); break;
    case "rap": for (const d of [0, 0.22]) glid(520, 330, t + d, 0.18, { type: "sawtooth", vol: 0.28 * v, filter: 1300, q: 2.5 }); break;
    case "wiii": glid(400, 1600, t, 0.6, { vol: 0.2 * v, vibHz: 20, vib: 40 }); sus(t, 0.8, 600, 3000, 0.2 * v, "bandpass", 1); break;
    case "uuuh": glid(220, 150, t, 1.1, { type: "sawtooth", vol: 0.22 * v, vibHz: 4, vib: 8, filter: 500, q: 2 }); break;
    case "buuh": glid(520, 330, t, 0.9, { vol: 0.2 * v, vibHz: 6, vib: 25 }); break;
    case "boing": glid(180, 620, t, 0.35, { vol: 0.22 * v, vibHz: 14, vib: 50 }); break;
    case "bipbop": [0, 0.1, 0.2, 0.3].forEach(d => tone(600 + Math.random() * 900, t + d, 0.08, "square", 0.08 * v)); break;
    case "pip": [0, 0.12].forEach(d => tone(2200, t + d, 0.06, "sine", 0.15 * v, 2800)); break;
    case "rawr": glid(340, 170, t, 0.45, { type: "sawtooth", vol: 0.2 * v, vibHz: 22, vib: 30, filter: 900, q: 2 }); sus(t, 0.35, 1200, 400, 0.12 * v, "bandpass", 1.5); break;
    default: tone(600, t, 0.1, "sine", 0.2 * v, 900);
  }
}
