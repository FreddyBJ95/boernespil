// ===== Lyde til Fjollet Slange — alt laves med Web Audio, ingen lydfiler =====
// Hver verden har sin egen lille glade melodi (marimba i haven, steeldrum på stranden, spilledåse i Slikland, rumlyde i rummet).

let ac = null, ud = null, musikG = null, støjBuf = null, tema = "have", musikTil = true, næsteNode = 0, trin = 0;

export function klar() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  ac = window.Effekter.audio();
  ud = ac.createGain(); ud.gain.value = 0.9; ud.connect(ac.destination);
  musikG = ac.createGain(); musikG.gain.value = musikTil ? 0.55 : 0; musikG.connect(ud);
  støjBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = støjBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  næsteNode = ac.currentTime + 0.1;
  setInterval(planlæg, 100);
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
  s.buffer = støjBuf; s.loop = true;
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(fra, t0); f.frequency.exponentialRampToValueAtTime(til, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(ud);
  s.start(t0); s.stop(t0 + dur + 0.05);
}

// ---------- Lydeffekter ----------
export function gumle() {                    // nam-nam: slangen spiser
  if (!ac) return;
  const t = nu();
  for (const d of [0, 0.11]) { tone(320, t + d, 0.09, "square", 0.07, 180); sus(t + d, 0.07, 1800, 700, 0.12, "bandpass", 2); }
  [880, 1175, 1568].forEach((f, i) => tone(f, t + 0.18 + i * 0.06, 0.18, "triangle", 0.09));
}
export function fnis() {                     // hihihi: man har trykket på slangen
  if (!ac) return;
  const t = nu();
  for (let i = 0; i < 4; i++) tone(900 + i * 60, t + i * 0.1, 0.08, "triangle", 0.1, 1300 + i * 60);
}
export function kraft(navn) {                // boblen springer, og kraften går i gang
  if (!ac) return;
  const t = nu();
  sus(t, 0.25, 900, 5000, 0.15, "bandpass", 1.5);
  if (navn === "turbo") { tone(200, t, 0.6, "sawtooth", 0.06, 900); sus(t, 0.8, 500, 3000, 0.15, "bandpass", 0.8); }
  else if (navn === "magnet") [523, 659, 523, 659].forEach((f, i) => tone(f, t + i * 0.08, 0.12, "square", 0.05));
  else if (navn === "regnbue") [523, 659, 784, 988, 1175, 1319, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.3, "triangle", 0.08));
  else [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, t + i * 0.07, 0.5, "sine", 0.12));
}
export function hat() {                      // ta-da: ny hat
  if (!ac) return;
  const t = nu();
  [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(([f, d]) => { tone(f, t + d, d > 0.3 ? 0.6 : 0.14, "triangle", 0.13); tone(f * 2, t + d, 0.1, "sine", 0.04); });
}
export function rejse() {                    // wuuusj til en ny verden
  if (!ac) return;
  const t = nu();
  sus(t, 1.2, 300, 6000, 0.2, "bandpass", 0.8);
  [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + 0.3 + i * 0.09, 0.5, "sine", 0.09));
}
export function bump() {                     // blødt bump mod kanten
  if (!ac) return;
  tone(160, nu(), 0.15, "sine", 0.12, 90);
}
export function boing() {                    // badebolden får et puf
  if (!ac) return;
  tone(180, nu(), 0.3, "sine", 0.14, 520);
}

// ---------- Musik: en lille melodi, der gentager sig, i hver verdens stil ----------
const SKALA = [0, 2, 4, 7, 9, 12, 14, 16];                  // glad pentatonisk skala
const STIL = {
  have: { grund: 523.25, type: "triangle", tempo: 0.2, vol: 0.06, melodi: [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 5, 7, 5, 4, 2] },
  strand: { grund: 587.33, type: "sine", tempo: 0.18, vol: 0.07, melodi: [4, -1, 5, 4, 2, -1, 0, 2, 4, 5, 4, -1, 2, 0, 1, 2] },
  slik: { grund: 783.99, type: "sine", tempo: 0.22, vol: 0.06, melodi: [7, 5, 4, 5, 7, 7, 7, -1, 5, 5, 5, -1, 7, 7, 7, -1] },
  rum: { grund: 440, type: "sine", tempo: 0.3, vol: 0.05, melodi: [0, -1, 4, -1, 7, -1, 5, -1, 3, -1, 4, -1, 2, -1, 0, -1] },
};
function planlæg() {
  if (!ac || document.hidden) { if (ac) næsteNode = ac.currentTime + 0.1; return; }
  const s = STIL[tema];
  while (næsteNode < ac.currentTime + 0.4) {
    const n = s.melodi[trin % s.melodi.length], t = næsteNode;
    if (n >= 0) {
      const f = s.grund * Math.pow(2, SKALA[n % SKALA.length] / 12);
      if (tema === "strand") { tone(f, t, 0.35, "sine", s.vol, undefined, musikG); tone(f * 2.01, t, 0.12, "sine", s.vol * 0.4, undefined, musikG); }   // steeldrum
      else if (tema === "rum") { tone(f, t, 0.9, "sine", s.vol, f * 1.01, musikG); tone(f / 2, t, 1.2, "triangle", s.vol * 0.5, undefined, musikG); }
      else tone(f, t, tema === "slik" ? 0.5 : 0.25, s.type, s.vol, undefined, musikG);
    }
    if (trin % 4 === 0) tone(s.grund / 4 * Math.pow(2, [0, 5, 7, 5][Math.floor(trin / 4) % 4] / 12), t, s.tempo * 3, "sine", s.vol * 1.3, undefined, musikG);   // bas
    næsteNode += s.tempo; trin++;
  }
}
export function sætTema(id) { tema = STIL[id] ? id : "have"; trin = 0; }
export function musik(til) {
  musikTil = til;
  if (musikG) musikG.gain.setTargetAtTime(til ? 0.55 : 0, ac.currentTime, 0.2);
}
