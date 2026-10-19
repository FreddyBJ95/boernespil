// ===== Lyde til Kuglebanen — alt laves med Web Audio, ingen lydfiler =====
// klar() skal kaldes første gang, barnet trykker (sådan vil iPad have det).

let ac = null, ud = null, støj = null, rulG = null, rulF = null, rulF2 = null, musikG = null;
let musikTil = true, tema = "jungle", næste = 0, trinNr = 0, timer = 0;

export function klar() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  ac = window.Effekter?.audio?.() || new (window.AudioContext || window.webkitAudioContext)();
  const komp = ac.createDynamicsCompressor();
  ud = ac.createGain(); ud.gain.value = 0.9;
  ud.connect(komp); komp.connect(ac.destination);
  støj = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = støj.getChannelData(0);
  let b = 0;
  for (let i = 0; i < d.length; i++) { b = b * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = b * 1.6; }

  // Rullelyden: støj gennem to filtre, som skrues op og ned med farten
  const kilde = ac.createBufferSource(); kilde.buffer = støj; kilde.loop = true;
  rulF = ac.createBiquadFilter(); rulF.type = "lowpass"; rulF.frequency.value = 300;
  rulF2 = ac.createBiquadFilter(); rulF2.type = "peaking"; rulF2.frequency.value = 140; rulF2.gain.value = 9; rulF2.Q.value = 1.5;
  rulG = ac.createGain(); rulG.gain.value = 0;
  kilde.connect(rulF); rulF.connect(rulF2); rulF2.connect(rulG); rulG.connect(ud);
  kilde.start();

  musikG = ac.createGain(); musikG.gain.value = musikTil ? 0.5 : 0; musikG.connect(ud);
  clearInterval(timer);
  timer = setInterval(planlæg, 60);
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

// ---------- Rullelyden (kaldes hver billede) ----------
// underlag: "græs" | "træ" | "plast" | "kiks" | "slik" | "is"
export function rul(fart, påJorden, underlag) {
  if (!ac) return;
  const t = nu(), f = Math.min(fart, 12);
  const vol = påJorden ? Math.min(0.3, f * 0.035) : 0;
  const lys = { græs: 240, træ: 520, plast: 900, kiks: 380, slik: 300, is: 1600 }[underlag] || 300;
  rulG.gain.setTargetAtTime(vol, t, 0.05);
  rulF.frequency.setTargetAtTime(lys + f * 60, t, 0.08);
  rulF2.frequency.setTargetAtTime(underlag === "træ" ? 200 + f * 8 : 120 + f * 9, t, 0.1);
}

// ---------- Hændelser ----------
export function stød(styrke) {                    // kuglen lander eller rammer en kant
  if (!ac) return;
  const t = nu(), s = Math.min(1, styrke / 9);
  tone(180 + s * 60, t, 0.16, { slut: 70, vol: 0.08 + s * 0.25, type: "triangle" });
  tone(1400, t, 0.05, { vol: 0.02 + s * 0.05 });       // glasset klinger lidt
  sus(t, 0.08, 1200, 400, 0.03 + s * 0.08, "lowpass");
}

export function bumper() {                         // boing
  if (!ac) return;
  const t = nu();
  tone(300, t, 0.35, { slut: 620, vol: 0.2, type: "triangle" });
  tone(150, t, 0.3, { slut: 300, vol: 0.12 });
}

const SKALA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];   // tingene spiller en tone højere hver gang
let samletNr = 0, sidstSamlet = 0;
export function saml() {
  if (!ac) return;
  const t = nu();
  if (t - sidstSamlet > 2.5) samletNr = 0;
  sidstSamlet = t;
  const f = 784 * Math.pow(2, SKALA[Math.min(samletNr++, SKALA.length - 1)] / 12);
  tone(f, t, 0.35, { vol: 0.13, type: "triangle" });
  tone(f * 2, t + 0.03, 0.25, { vol: 0.05 });
  tone(f * 1.5, t + 0.06, 0.3, { vol: 0.04 });
}

export function flag() {
  if (!ac) return;
  const t = nu();
  [523, 659, 784, 1047].forEach((f, i) => { tone(f, t + i * 0.09, 0.5, { vol: 0.1, type: "triangle" }); tone(f * 2, t + i * 0.09, 0.35, { vol: 0.03 }); });
}

export function fald() {                          // fløjt ned, når kuglen falder af
  if (!ac) return;
  const t = nu();
  tone(1100, t, 0.9, { slut: 260, vol: 0.11, anslag: 0.05 });
  tone(1650, t, 0.9, { slut: 390, vol: 0.03, anslag: 0.05 });
}

export function op() {                            // kuglen dukker op igen
  if (!ac) return;
  const t = nu();
  [392, 523, 659].forEach((f, i) => tone(f, t + i * 0.07, 0.25, { vol: 0.08, type: "triangle" }));
}

export function fart() {                          // fartpil: wusj opad
  if (!ac) return;
  const t = nu();
  sus(t, 0.45, 500, 3500, 0.12);
  tone(300, t, 0.4, { slut: 900, vol: 0.06, type: "sawtooth" });
}

export function ring() {                          // igennem en donut
  if (!ac) return;
  const t = nu();
  [1047, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.3, { vol: 0.06 }));
  sus(t, 0.25, 2000, 5000, 0.04, "highpass");
}

export function mål() {                           // fanfare
  if (!ac) return;
  const t = nu();
  const n = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.6], [1047, 0.72]];
  n.forEach(([f, dt]) => { tone(f, t + dt, 0.45, { vol: 0.12, type: "triangle" }); tone(f / 2, t + dt, 0.4, { vol: 0.05, type: "square" }); });
  tone(1568, t + 0.9, 1.0, { vol: 0.1, type: "triangle" });
  sus(t + 0.9, 0.6, 3000, 8000, 0.04, "highpass");
}

export function klik() {
  if (!ac) return;
  tone(880, nu(), 0.08, { vol: 0.06, type: "triangle" });
}

// ---------- Musik: en lille glad melodi for hver verden ----------
const MUSIK = {
  jungle: { bpm: 112, grund: 262, lyd: "marimba",
    melodi: [0, null, 4, null, 7, null, 4, 2, 0, null, 2, 4, 2, null, null, null, 0, null, 4, null, 7, null, 9, 7, 4, null, 2, null, 0, null, null, null],
    bas: [-12, null, null, null, -5, null, null, null, -12, null, null, null, -5, null, -7, null] },
  vaerelse: { bpm: 96, grund: 523, lyd: "spilledåse",
    melodi: [7, null, 4, null, 0, null, 4, null, 5, null, 2, null, 7, null, null, null, 4, null, 7, 9, 7, null, 4, null, 2, null, 4, 2, 0, null, null, null],
    bas: [-12, null, -5, null, -10, null, -3, null, -12, null, -5, null, -7, null, -5, null] },
  slik: { bpm: 126, grund: 330, lyd: "hop",
    melodi: [0, 4, 7, 12, null, 7, null, 4, 5, 9, 12, 9, null, 7, null, null, 0, 4, 7, 12, null, 14, 12, 9, 7, null, 4, null, 0, null, null, null],
    bas: [-12, null, -12, null, -7, null, -7, null, -10, null, -10, null, -5, null, -5, null] },
};
function spil(navn, f, t, vol) {
  if (navn === "marimba") { tone(f, t, 0.35, { vol, mål: musikG }); tone(f * 4, t, 0.08, { vol: vol * 0.25, mål: musikG }); }
  else if (navn === "spilledåse") { tone(f, t, 0.9, { vol: vol * 0.8, mål: musikG }); tone(f * 2.76, t, 0.4, { vol: vol * 0.15, mål: musikG }); }
  else { tone(f, t, 0.18, { vol: vol * 0.7, type: "triangle", mål: musikG }); tone(f * 2, t, 0.1, { vol: vol * 0.15, type: "square", mål: musikG }); }
}
function planlæg() {
  if (!ac || !musikTil) return;
  const m = MUSIK[tema] || MUSIK.jungle, trin = 60 / m.bpm / 2;
  if (næste < nu()) næste = nu() + 0.05;
  while (næste < nu() + 0.25) {
    const i = trinNr % m.melodi.length;
    const n = m.melodi[i];
    if (n != null) spil(m.lyd, m.grund * Math.pow(2, n / 12), næste, 0.07);
    const b = m.bas[(trinNr >> 1) % m.bas.length];
    if (trinNr % 2 === 0 && b != null) tone(m.grund * Math.pow(2, b / 12), næste, trin * 1.8, { vol: 0.05, type: "triangle", mål: musikG });
    næste += trin; trinNr++;
  }
}
export function sætMusik(til) {
  musikTil = til;
  if (musikG) musikG.gain.setTargetAtTime(til ? 0.5 : 0, nu(), 0.2);
}
export function sætTema(navn) { if (navn !== tema) { tema = navn; trinNr = 0; } }
