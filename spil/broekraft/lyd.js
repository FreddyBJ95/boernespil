// ===== Lyde og musik til Broekraft — alt laves med Web Audio, ingen lydfiler =====

let ac = null, ud = null, musikG = null, ekko = null, støjBuf = null, musikTil = true;

export function klar() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  ac = window.Effekter.audio();
  ud = ac.createGain(); ud.gain.value = 0.9; ud.connect(ac.destination);
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
    if (musikTil && !document.hidden) frase();
    setTimeout(musikLøkke, stemning.pause[0] + Math.random() * (stemning.pause[1] - stemning.pause[0]));
  })();
  (function fugleLøkke() {
    setTimeout(() => { if (!document.hidden) fugl(); fugleLøkke(); }, 6000 + Math.random() * 9000);
  })();
}

export function sætMusik(til) {
  musikTil = til;
  if (musikG) musikG.gain.setTargetAtTime(til ? 1 : 0, ac.currentTime, 0.3);
}

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

// ---------- Blokke, skridt og bevægelse ----------
const MAT = {
  græs: { f: 900, q: 0.8, tone: 160 }, sten: { f: 2200, q: 1.5, tone: 260 }, træ: { f: 650, q: 2, tone: 190 },
  sand: { f: 1500, q: 0.5, tone: 150 }, glas: { f: 3500, q: 3, tone: 1400 }, uld: { f: 500, q: 0.7, tone: 140 },
  metal: { f: 3000, q: 6, tone: 1100 },
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
    default: tone(600, t, 0.1, "sine", 0.2 * v, 900);
  }
}
