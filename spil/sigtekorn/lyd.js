// ===== Lydene (Web Audio, laves med kode — ingen lydfiler) =====
// Skuddene er et skarpt knald + en dyb buldren + et ekko mellem husene. Lyde fra andre (botterne)
// placeres i 3D, så man kan høre, hvor de skyder og går — det er en vigtig del af CS.

let ctx = null, ud = null, ekko = null, støj = null;
export let lydstyrke = 0.8;
export function sætLydstyrke(v) { lydstyrke = v; if (ud) ud.gain.value = v; }

// Start lyden (kræver et klik fra brugeren)
export function start() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  ud = ctx.createGain(); ud.gain.value = lydstyrke;
  const komp = ctx.createDynamicsCompressor(); komp.threshold.value = -14; komp.ratio.value = 6;
  ud.connect(komp); komp.connect(ctx.destination);
  // ekkoet mellem husene: en kort forsinkelse, der bliver dæmpet og gentaget
  ekko = ctx.createDelay(1); ekko.delayTime.value = 0.13;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
  ekko.connect(lp); lp.connect(fb); fb.connect(ekko); lp.connect(ud);
  // hvid støj, som skuddene og trinene laves af
  støj = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = støj.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (ønsketVejr) startVejr();
}

// Vejret: en løkke af susende støj (regn: lys og jævn · vind: dyb og svingende) — og torden
let ønsketVejr = null, vejrKilde = null;
export function vejrLyd(slags) { ønsketVejr = slags; if (ctx) startVejr(); }
function startVejr() {
  if (vejrKilde) { vejrKilde.stop(); vejrKilde = null; }
  if (!ønsketVejr) return;
  const regn = ønsketVejr === "regn", s = ctx.createBufferSource(); s.buffer = støj; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = regn ? "highpass" : "lowpass"; f.frequency.value = regn ? 1500 : 420;
  const g = ctx.createGain(); g.gain.value = regn ? 0.1 : 0.16;
  if (!regn) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 0.09; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
  s.connect(f); f.connect(g); g.connect(ud); s.start(); vejrKilde = s;
}
// En zombie stønner (dybt og hæst, et sted i verdenen)
export function zombie(pos) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(pos, 0.5), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(95 + Math.random() * 30, t); o.frequency.linearRampToValueAtTime(70 + Math.random() * 20, t + 0.9);
  f.type = "bandpass"; f.frequency.value = 420; f.Q.value = 2.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
  o.connect(f); f.connect(g); g.connect(m); o.start(t); o.stop(t + 1.05);
  støjStød(m, t, 0.9, "bandpass", 700, 1.2, 0.15, 0.9);
}
export function torden(forsinkelse = 0.5) {
  if (!ctx) return;
  const t = ctx.currentTime + forsinkelse, m = kæde(null, 0.9);
  støjStød(m, t, 3, "lowpass", 140, 0.7, 1.5, 2.8); tone(m, t, 55, 28, 1.8, "sine", 0.5);
}

// Lytteren følger kameraet (position og retning)
export function lytter(p, f, op) {
  if (!ctx) return;
  const l = ctx.listener;
  if (l.positionX) {
    l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
    l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z; l.upX.value = op.x; l.upY.value = op.y; l.upZ.value = op.z;
  } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, op.x, op.y, op.z); }
}
// En lyd et sted i verdenen (pos) — eller "i hovedet" (pos = null)
function kæde(pos, styrke = 1) {
  const g = ctx.createGain(); g.gain.value = styrke;
  if (pos) {
    const p = ctx.createPanner(); p.panningModel = "HRTF"; p.distanceModel = "inverse"; p.refDistance = 4; p.rolloffFactor = 1.1; p.maxDistance = 200;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    g.connect(p); p.connect(ud); p.connect(ekko);
  } else { g.connect(ud); const e = ctx.createGain(); e.gain.value = 0.5; g.connect(e); e.connect(ekko); }
  return g;
}
function støjStød(mål, t, varighed, filter, frek, q, styrke, fald) {
  const s = ctx.createBufferSource(); s.buffer = støj; s.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.value = frek; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(styrke, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + fald);
  s.connect(f); f.connect(g); g.connect(mål); s.start(t, Math.random(), varighed);
}
function tone(mål, t, fra, til, varighed, type, styrke) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(fra, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, til), t + varighed);
  const g = ctx.createGain(); g.gain.setValueAtTime(styrke, t); g.gain.exponentialRampToValueAtTime(0.0001, t + varighed);
  o.connect(g); g.connect(mål); o.start(t); o.stop(t + varighed + 0.02);
}

// Et skud. d = våbnet (fra kataloget) · pos: hvor (null = ens eget). Lyden afhænger af våbnets klasse
export function skud(d, pos = null) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(pos, pos ? 1.3 : 0.9), k = d.klasse;
  if (d.projektil === "raket") return raket(pos);
  if (d.projektil === "pil") { tone(m, t, 320, 110, 0.16, "triangle", 0.5); støjStød(m, t, 0.1, "bandpass", 1500, 2, 0.4, 0.08); return; }
  if (d.lydløs) { støjStød(m, t, 0.12, "bandpass", 900, 1.2, 0.55, 0.08); tone(m, t, 220, 90, 0.06, "sine", 0.25); return; }
  if (k === "snig") {
    støjStød(m, t, 0.5, "bandpass", 1300, 0.6, 1.2, 0.35); støjStød(m, t, 0.9, "lowpass", 500, 0.7, 1.0, 0.8); tone(m, t, 90, 30, 0.45, "sine", 0.9);
  } else if (k === "pistol") {
    const tung = d.skade > 50;
    støjStød(m, t, 0.2, "bandpass", tung ? 1500 : 2400, 0.9, 0.8, 0.09); støjStød(m, t, 0.3, "lowpass", 1100, 0.7, tung ? 0.9 : 0.5, 0.18); tone(m, t, 140, 60, 0.12, "sine", tung ? 0.7 : 0.4);
  } else if (k === "hagl") {
    støjStød(m, t, 0.45, "lowpass", 900, 0.6, 1.3, 0.4); støjStød(m, t, 0.2, "bandpass", 2000, 0.6, 0.9, 0.12); tone(m, t, 70, 30, 0.3, "sine", 1.0);
  } else if (k === "mp") {
    støjStød(m, t, 0.15, "bandpass", 2600, 0.9, 0.8, 0.07); støjStød(m, t, 0.25, "lowpass", 1000, 0.7, 0.5, 0.15); tone(m, t, 110, 50, 0.1, "sine", 0.45);
  } else if (k === "tung") {
    støjStød(m, t, 0.2, "bandpass", 1500, 0.8, 1.0, 0.1); støjStød(m, t, 0.35, "lowpass", 650, 0.7, 0.8, 0.22); tone(m, t, 65, 32, 0.16, "sine", 0.7);
  } else {
    støjStød(m, t, 0.25, "bandpass", 1800, 0.8, 1.0, 0.11); støjStød(m, t, 0.4, "lowpass", 800, 0.7, 0.75, 0.28); tone(m, t, 75, 38, 0.2, "sine", 0.7);
  }
}
// Raketten bliver skudt af: et sus
export function raket(pos = null) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(pos, 0.9), s = ctx.createBufferSource(); s.buffer = støj;
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.4; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(1800, t + 0.6);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  s.connect(f); f.connect(g); g.connect(m); s.start(t, Math.random(), 1); tone(m, t, 90, 40, 0.3, "sine", 0.6);
}
// En eksplosion: et dybt brag og knitren bagefter
export function eksplosion(pos) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(pos, 2.2);
  støjStød(m, t, 1.4, "lowpass", 320, 0.7, 1.4, 1.3); tone(m, t, 70, 22, 0.9, "sine", 1.2);
  støjStød(m, t + 0.05, 0.6, "highpass", 2500, 0.7, 0.35, 0.5); støjStød(m, t + 0.12, 0.8, "bandpass", 900, 0.8, 0.4, 0.7);
}
// En granat eller pil rammer noget hårdt: et lille klik
export function prel(pos) { if (!ctx) return; const t = ctx.currentTime, m = kæde(pos, 0.5); tone(m, t, 2400 + Math.random() * 600, 1700, 0.06, "triangle", 0.25); støjStød(m, t, 0.05, "highpass", 3000, 1, 0.2, 0.04); }
export function blænd(pos) { if (!ctx) return; const t = ctx.currentTime, m = kæde(pos, 1.8); støjStød(m, t, 0.4, "bandpass", 2000, 0.6, 1.3, 0.25); tone(m, t, 120, 50, 0.3, "sine", 0.8); }
// Når man selv er blændet: en høj, ringende tone i ørerne
export function ringen(styrke) { if (!ctx) return; const t = ctx.currentTime, m = kæde(null, 0.25 * styrke); tone(m, t, 3600, 3400, 2.5 * styrke + 0.3, "sine", 0.5); }
export function røg(pos) { if (!ctx) return; const t = ctx.currentTime, m = kæde(pos, 0.6); støjStød(m, t, 2.0, "highpass", 2600, 0.5, 0.35, 2.0); }
export function impuls(pos) { if (!ctx) return; const t = ctx.currentTime, m = kæde(pos, 1.4); tone(m, t, 160, 40, 0.45, "sine", 1.0); støjStød(m, t, 0.4, "lowpass", 600, 1, 0.8, 0.35); }
// Man kaster en granat
export function kast() { if (!ctx) return; støjStød(kæde(null, 0.4), ctx.currentTime, 0.2, "bandpass", 1200, 1.5, 0.35, 0.15); }
// Kniven suser gennem luften
export function kniv() { if (!ctx) return; støjStød(kæde(null, 0.6), ctx.currentTime, 0.2, "bandpass", 3200, 2, 0.4, 0.16); }
// Klik, når magasinet er tomt
export function klik() { if (!ctx) return; tone(kæde(null, 0.4), ctx.currentTime, 2200, 1800, 0.03, "square", 0.25); }
// Genladning: magasinet ud, ind og et klik
export function genlad(tid) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(null, 0.5);
  for (const [dt, f] of [[0.15, 900], [tid * 0.55, 700], [tid * 0.85, 1500]]) { støjStød(m, t + dt, 0.06, "bandpass", f, 3, 0.5, 0.05); tone(m, t + dt, f * 1.5, f, 0.03, "square", 0.1); }
}
// Et fodtrin (stille, når man går eller dukker sig — så man kan snige sig)
export function trin(pos = null, styrke = 1) {
  if (!ctx) return;
  støjStød(kæde(pos, 0.35 * styrke), ctx.currentTime, 0.1, "bandpass", 500 + Math.random() * 400, 1.2, 0.6, 0.08);
}
export function landing(pos = null) { if (!ctx) return; støjStød(kæde(pos, 0.5), ctx.currentTime, 0.15, "lowpass", 400, 1, 0.8, 0.12); }
// En krop, der falder om: et dumpt bump i jorden og lidt rasl af udstyret
export function fald(pos) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(pos, 0.8);
  støjStød(m, t, 0.22, "lowpass", 260, 0.8, 0.9, 0.2); tone(m, t, 95, 45, 0.16, "sine", 0.45);
  støjStød(m, t + 0.06, 0.14, "bandpass", 2400, 2, 0.12, 0.12);
}
// En løs del (en arm, et hoved, et våben) rammer jorden: et lille dump
export function dunk(pos, styrke = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(pos, 0.5 * styrke);
  støjStød(m, t, 0.12, "lowpass", 420 + Math.random() * 300, 1, 0.8, 0.09); tone(m, t, 140 + Math.random() * 60, 60, 0.08, "sine", 0.3);
}
// Man ramte nogen: et lille "tik" — og et klart "ting" ved hovedskud
export function ramt(hoved) {
  if (!ctx) return;
  const t = ctx.currentTime, m = kæde(null, 0.5);
  if (hoved) { tone(m, t, 2600, 2400, 0.25, "sine", 0.35); tone(m, t, 5200, 5000, 0.12, "sine", 0.12); }
  else tone(m, t, 1400, 1100, 0.05, "triangle", 0.3);
}
// Man blev selv ramt: et dumpt slag
export function såret() { if (!ctx) return; const t = ctx.currentTime, m = kæde(null, 0.6); tone(m, t, 180, 70, 0.12, "sine", 0.6); støjStød(m, t, 0.1, "lowpass", 700, 1, 0.4, 0.08); }
// Kuglen rammer muren lige ved siden af en (sus og smæld)
export function nærSkud(pos) { if (!ctx) return; støjStød(kæde(pos, 0.5), ctx.currentTime, 0.1, "highpass", 3500, 1, 0.5, 0.07); }
// Et lille bip (menuer, nedtælling)
export function bombeBip(pos) { if (!ctx) return; tone(kæde(pos, 0.7), ctx.currentTime, 1850, 1850, 0.09, "square", 0.35); }
export function bip(f = 880) { if (!ctx) return; tone(kæde(null, 0.3), ctx.currentTime, f, f, 0.08, "sine", 0.3); }
