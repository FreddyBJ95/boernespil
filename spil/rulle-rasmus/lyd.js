// ===== Lyde til Rulle Rasmus — alt laves med Web Audio, ingen lydfiler =====
// klar() skal kaldes første gang, barnet trykker (sådan vil iPad have det).

let ac = null, ud = null, støj = null, rulG = null, rulF = null, rulF2 = null, musikG = null;
let musikTil = true, tema = null, næsteSlag = 0, slag = 0, musikTimer = 0;

export function klar() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  ac = window.Effekter.audio();
  const komp = ac.createDynamicsCompressor();
  ud = ac.createGain(); ud.gain.value = 0.9;
  ud.connect(komp); komp.connect(ac.destination);
  støj = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = støj.getChannelData(0);
  let b = 0;
  for (let i = 0; i < d.length; i++) { b = b * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = b * 1.6; }   // lidt dybere støj

  // Rullelyden: støj gennem to filtre, som skrues op og ned med farten
  const kilde = ac.createBufferSource(); kilde.buffer = støj; kilde.loop = true;
  rulF = ac.createBiquadFilter(); rulF.type = "lowpass"; rulF.frequency.value = 300;
  rulF2 = ac.createBiquadFilter(); rulF2.type = "peaking"; rulF2.frequency.value = 140; rulF2.gain.value = 9; rulF2.Q.value = 1.5;
  rulG = ac.createGain(); rulG.gain.value = 0;
  kilde.connect(rulF); rulF.connect(rulF2); rulF2.connect(rulG); rulG.connect(ud);
  kilde.start();

  musikG = ac.createGain(); musikG.gain.value = musikTil ? 0.55 : 0; musikG.connect(ud);
  clearInterval(musikTimer);
  musikTimer = setInterval(planlægMusik, 60);
}

const nu = () => ac.currentTime;

function tone(f, t0, dur, { type = "sine", vol = 0.2, slut = 0, mål = ud, anslag = 0.01 } = {}) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (slut) o.frequency.exponentialRampToValueAtTime(slut, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + anslag);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(mål);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function sus(t0, dur, fra, til, vol, type = "bandpass", q = 1) {
  if (!ac) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = støj; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(fra, t0);
  f.frequency.exponentialRampToValueAtTime(til, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.03, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(ud);
  s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
}

// ---------- Rullelyden (kaldes hver frame) ----------
// underlag: "græs" | "træ" | "slik" | "is" | "regnbue"
export function rul(fart, påJorden, underlag) {
  if (!ac) return;
  const t = nu(), f = Math.min(fart, 14);
  const vol = påJorden ? Math.min(0.32, f * 0.03) * (underlag === "is" ? 0.6 : 1) : 0;
  const lys = { græs: 220, træ: 420, slik: 260, is: 2200, regnbue: 900 }[underlag] || 300;
  rulG.gain.setTargetAtTime(vol, t, 0.06);
  rulF.frequency.setTargetAtTime(lys + f * 45, t, 0.08);
  rulF2.frequency.setTargetAtTime(underlag === "træ" ? 180 + f * 6 : 110 + f * 8, t, 0.1);
}

// ---------- Hændelser ----------
export function land(styrke, skin = 0) {
  if (!ac) return;
  const t = nu(), s = Math.min(1, styrke / 12);
  tone(260 + s * 40, t, 0.22, { slut: 90, vol: 0.12 + s * 0.3 });            // blødt "blob"
  sus(t, 0.12, 900, 250, 0.05 + s * 0.12, "lowpass");
  if (skin === 3) { tone(180, t, 0.07, { type: "square", vol: 0.05 }); sus(t, 0.08, 1400, 600, 0.12); }   // Broekraft: "tok"
  if (skin === 1) sus(t, 0.35, 400, 2400, 0.08);                            // ild: fwusj
  if (skin === 2 || skin === 4) [1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.04, 0.3, { vol: 0.05 }));
}

export function hop() {                                   // et lille "wiii"
  if (!ac) return;
  const t = nu();
  tone(420, t, 0.28, { slut: 900, vol: 0.12, type: "triangle" });
  tone(630, t + 0.02, 0.25, { slut: 1300, vol: 0.05 });
}

const SKALA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];   // stjernerne spiller en tone højere hver gang
let stjerneNr = 0, sidsteStjerne = 0;
export function stjerne() {
  if (!ac) return;
  const t = nu();
  if (t - sidsteStjerne > 1.4) stjerneNr = 0;
  sidsteStjerne = t;
  const f = 784 * Math.pow(2, SKALA[Math.min(stjerneNr++, SKALA.length - 1)] / 12);
  tone(f, t, 0.35, { vol: 0.13, type: "triangle" });
  tone(f * 2, t + 0.03, 0.25, { vol: 0.05 });
  tone(f * 1.5, t + 0.06, 0.3, { vol: 0.04 });
}

export function nam() {
  if (!ac) return;
  const t = nu();
  for (const [dt, f] of [[0, 320], [0.16, 280], [0.32, 340]]) { tone(f, t + dt, 0.1, { type: "triangle", vol: 0.16, slut: f * 0.7 }); sus(t + dt, 0.06, 500, 300, 0.05); }
  [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + 0.5 + i * 0.07, 0.25, { vol: 0.07 }));
}

export function flag() {
  if (!ac) return;
  const t = nu();
  [523, 659, 784, 1047].forEach((f, i) => { tone(f, t + i * 0.09, 0.5, { vol: 0.1, type: "triangle" }); tone(f * 2, t + i * 0.09, 0.35, { vol: 0.03 }); });
  sus(t, 0.3, 3000, 6000, 0.03, "highpass");
}

export function fald() {                                  // fløjt ned, når han falder af
  if (!ac) return;
  const t = nu();
  tone(1100, t, 0.9, { slut: 260, vol: 0.12, type: "sine", anslag: 0.05 });
  tone(1650, t, 0.9, { slut: 390, vol: 0.03, type: "sine", anslag: 0.05 });
}

export function plask() {
  if (!ac) return;
  const t = nu();
  sus(t, 0.5, 1800, 300, 0.35, "lowpass");
  sus(t + 0.02, 0.25, 3000, 1200, 0.12);
  for (let i = 0; i < 6; i++) tone(500 + Math.random() * 900, t + 0.15 + i * 0.06, 0.08, { slut: 1400, vol: 0.05 });   // bobler
}

export function puf() {                                   // ned i en blød sky
  if (!ac) return;
  const t = nu();
  sus(t, 0.6, 600, 200, 0.25, "lowpass");
  sus(t, 0.4, 2500, 800, 0.05);
}

export function dukOp() {
  if (!ac) return;
  const t = nu();
  tone(300, t, 0.15, { slut: 700, vol: 0.14, type: "triangle" });
  tone(660, t + 0.12, 0.3, { vol: 0.08 });
  tone(990, t + 0.2, 0.3, { vol: 0.05 });
}

export function trampolin() {
  if (!ac) return;
  const t = nu();
  const o = ac.createOscillator(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.45);
  l.frequency.value = 16; lg.gain.value = 30; l.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g); g.connect(ud); o.start(t); l.start(t); o.stop(t + 0.6); l.stop(t + 0.6);
  hop();
}

export function fart() {
  if (!ac) return;
  const t = nu();
  sus(t, 0.6, 300, 3500, 0.2, "bandpass", 2);
  tone(300, t, 0.5, { slut: 1200, vol: 0.06, type: "sawtooth" });
}

export function bonk(styrke = 1) {
  if (!ac) return;
  const t = nu();
  tone(170, t, 0.25, { slut: 70, vol: 0.12 * styrke });
  tone(420, t, 0.2, { slut: 240, vol: 0.06 * styrke, type: "triangle" });
}

export function boing() {                                 // svampe og gummidråber på banen
  if (!ac) return;
  const t = nu();
  tone(200, t, 0.35, { slut: 480, vol: 0.2, type: "triangle" });
  tone(300, t + 0.05, 0.3, { slut: 700, vol: 0.06 });
}

export function vælg(skin = 0) {                          // når man vælger en ny Rasmus
  if (!ac) return;
  const t = nu();
  if (skin === 1) { sus(t, 0.5, 300, 3000, 0.2); tone(200, t, 0.4, { slut: 90, vol: 0.1, type: "sawtooth" }); return; }
  if (skin === 3) { [0, 0.12, 0.24].forEach(d => { tone(200, t + d, 0.07, { type: "square", vol: 0.05 }); sus(t + d, 0.06, 1400, 700, 0.12); }); return; }
  if (skin === 2 || skin === 4) { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.045, 0.5, { vol: 0.06, type: "triangle" })); return; }
  if (skin === 5) { [880, 1109, 1319, 1760].forEach((f, i) => tone(f, t + i * 0.1, 0.9, { vol: 0.05 })); return; }
  if (skin === 6) { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.6, { vol: 0.07, type: "triangle" })); return; }
  tone(330, t, 0.25, { slut: 220, vol: 0.15 });
  tone(660, t + 0.1, 0.25, { vol: 0.08, type: "triangle" });
}

export function mål() {
  if (!ac) return;
  const t = nu();
  const melodi = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]];
  for (const [f, d] of melodi) { tone(f, t + d, 0.45, { type: "triangle", vol: 0.14 }); tone(f / 2, t + d, 0.4, { vol: 0.06 }); }
  [1047, 1319, 1568].forEach(f => tone(f, t + 0.8, 1.4, { type: "triangle", vol: 0.08 }));
  sus(t + 0.8, 1.2, 5000, 2000, 0.05, "highpass");
}

export function fyrværkeri() {
  if (!ac) return;
  const t = nu() + Math.random() * 0.05;
  tone(900 + Math.random() * 400, t, 0.5, { slut: 2500, vol: 0.03, anslag: 0.1 });
  sus(t + 0.5, 0.5, 1500, 200, 0.25, "lowpass");
  for (let i = 0; i < 8; i++) sus(t + 0.6 + Math.random() * 0.6, 0.04, 5000, 3000, 0.05, "highpass");   // knitren
}

// ---------- Baggrundsmusik: en rolig, glad melodi, der aldrig er helt ens ----------
// Hver bane har sin toneart, sit tempo og sin lyd.
const MUSIK = {
  eng:     { grund: 60, bpm: 104, akkorder: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], lyd: "triangle" },
  slik:    { grund: 65, bpm: 116, akkorder: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], lyd: "square" },
  is:      { grund: 62, bpm: 92, akkorder: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], lyd: "sine" },
  jungle:  { grund: 57, bpm: 112, akkorder: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]], lyd: "triangle" },
  regnbue: { grund: 64, bpm: 98, akkorder: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], lyd: "sine" },
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

export function musik(nyt) {
  tema = MUSIK[nyt] ? nyt : null;
  slag = 0;
  if (ac) næsteSlag = nu() + 0.3;
}
export function sætMusik(til) {
  musikTil = til;
  if (musikG) musikG.gain.setTargetAtTime(til ? 0.55 : 0, nu(), 0.2);
}

function planlægMusik() {
  if (!ac || !tema || document.hidden) return;
  const m = MUSIK[tema], ottendedel = 30 / m.bpm;
  if (næsteSlag < nu()) næsteSlag = nu() + 0.05;
  while (næsteSlag < nu() + 0.25) {
    const takt = Math.floor(slag / 8) % m.akkorder.length, i = slag % 8, akk = m.akkorder[takt], t = næsteSlag;
    if (i === 0 || i === 4) tone(mtof(m.grund - 24 + akk[0]), t, ottendedel * 3.5, { type: "triangle", vol: 0.1, mål: musikG, anslag: 0.02 });
    // brudte akkorder op og ned
    const op = [0, 1, 2, 1, 2, 3, 2, 1][i] % akk.length;
    tone(mtof(m.grund + akk[op]), t, ottendedel * 1.8, { type: "sine", vol: 0.045, mål: musikG });
    // en lille melodi ind imellem
    if ((i === 0 || i === 3 || i === 6) && Math.random() < 0.6) {
      const n = akk[Math.floor(Math.random() * akk.length)] + 12;
      tone(mtof(m.grund + n), t, ottendedel * 2.5, { type: m.lyd, vol: m.lyd === "square" ? 0.012 : 0.035, mål: musikG, anslag: 0.02 });
    }
    slag++;
    næsteSlag += ottendedel;
  }
}
