// ===== Lyde til Burgerløbet (Web Audio, ingen lydfiler) =====
let ac = null, ud = null, støj = null;

export function klar() {
  try {
    ac = window.Effekter.audio();
    if (!ud) {
      ud = ac.createGain(); ud.gain.value = 0.9; ud.connect(ac.destination);
      støj = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = støj.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
  } catch (_) {}
}
const nu = () => ac ? ac.currentTime : 0;
function tone(f, start, dur, type, vol, slut, vib) {
  if (!ud) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(f, start);
  if (slut) o.frequency.exponentialRampToValueAtTime(slut, start + dur);
  if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(start); l.stop(start + dur + 0.05); }
  o.connect(g); g.connect(ud);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol || 0.2, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.start(start); o.stop(start + dur + 0.05);
}
function sus(start, dur, type, fra, til, vol, q) {
  if (!ud) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = støj; f.type = type; f.Q.value = q || 1;
  f.frequency.setValueAtTime(fra, start); f.frequency.exponentialRampToValueAtTime(til, start + dur);
  g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f); f.connect(g); g.connect(ud);
  s.start(start, Math.random() * 0.5, dur + 0.05);
}

const SKALA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
// Et lag lander på burgeren — tonen går op, når man samler mange i træk
export function saml(iTræk) {
  const f = SKALA[Math.min(iTræk, SKALA.length - 1)];
  tone(f, nu(), 0.18, "triangle", 0.2); tone(f * 2, nu() + 0.03, 0.12, "sine", 0.07);
  tone(200, nu(), 0.08, "sine", 0.15, 120);
}
export function port() { [523, 659, 784, 1047].forEach((f, i) => tone(f, nu() + i * 0.06, 0.2, "triangle", 0.16)); }
export function bonk() { tone(160, nu(), 0.3, "sine", 0.4, 70); sus(nu(), 0.15, "lowpass", 900, 200, 0.4); tone(300, nu() + 0.05, 0.4, "sine", 0.18, 700, [16, 40]); }
export function start() { tone(784, nu(), 0.15, "square", 0.08); tone(1047, nu() + 0.18, 0.3, "square", 0.08); }
export function hop() { tone(300, nu(), 0.6, "sine", 0.25, 900); sus(nu(), 0.6, "bandpass", 500, 2500, 0.15, 1.5); }
export function tyg() { for (let i = 0; i < 11; i++) sus(nu() + i * 0.2, 0.1, "lowpass", 800, 250, 0.35); }
export function synk() { tone(420, nu(), 0.3, "sine", 0.4, 100); }
export function mmm() { tone(165, nu(), 1.1, "triangle", 0.25, 208, [5, 6]); tone(330, nu(), 1.1, "sine", 0.07, 415); }
export function bøvs() { sus(nu(), 0.8, "lowpass", 380, 140, 0.6, 4); tone(70, nu(), 0.8, "sawtooth", 0.2, 52, [20, 10]); }
export function hm() { tone(220, nu(), 0.4, "triangle", 0.2, 190); }
export function trin() { sus(nu(), 0.03, "bandpass", 1600, 1200, 0.05, 3); }
