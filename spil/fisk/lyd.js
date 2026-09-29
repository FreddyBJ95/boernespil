// ===== Lyde til "Mærkelige fisk" — alt laves med Web Audio, ingen lydfiler =====

let ac = null, ud = null, støjBuf = null, knirkG = null, knirkO = null, bane = "sø";

// Hvor fisker vi? Havet skvulper mere, og der skriger måger i stedet for at synge fugle
export function sætBane(b) { bane = b; }

export function klar() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  ac = window.Effekter.audio();
  ud = ac.createGain(); ud.gain.value = 0.9; ud.connect(ac.destination);
  støjBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = støjBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Stille skvulp fra søen hele tiden
  const skvulp = støjKilde(true), lp = ac.createBiquadFilter(), sg = ac.createGain();
  lp.type = "lowpass"; lp.frequency.value = bane === "hav" ? 520 : 380; sg.gain.value = bane === "hav" ? 0.09 : 0.05;
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = 0.22; lg.gain.value = 0.035;
  lfo.connect(lg); lg.connect(sg.gain);
  skvulp.connect(lp); lp.connect(sg); sg.connect(ud);
  skvulp.start(); lfo.start();

  // Knirkende snøre når fisken trækker (starter tavs)
  knirkO = ac.createOscillator(); knirkO.type = "sawtooth"; knirkO.frequency.value = 110;
  const vib = ac.createOscillator(), vg = ac.createGain();
  vib.frequency.value = 9; vg.gain.value = 8;
  vib.connect(vg); vg.connect(knirkO.frequency);
  const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1100; bp.Q.value = 3;
  knirkG = ac.createGain(); knirkG.gain.value = 0;
  knirkO.connect(bp); bp.connect(knirkG); knirkG.connect(ud);
  knirkO.start(); vib.start();

  // Fugle der kvidrer (eller måger der skriger) en gang imellem
  (function fugleLøkke() {
    setTimeout(() => { if (!document.hidden) { if (bane === "hav") måge(0.35); else fugl(); } fugleLøkke(); }, 4000 + Math.random() * 7000);
  })();
}

const nu = () => ac.currentTime;
function støjKilde(loop) { const s = ac.createBufferSource(); s.buffer = støjBuf; s.loop = !!loop; return s; }

function tone(f, t0, dur, type = "sine", vol = 0.2, slut) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (slut) o.frequency.exponentialRampToValueAtTime(slut, t0 + dur);
  o.connect(g); g.connect(ud);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.start(t0); o.stop(t0 + dur + 0.03);
}

// Støj gennem et filter der glider fra én frekvens til en anden (svup, plask, tss)
function sus(t0, dur, fra, til, vol, type = "bandpass", q = 1) {
  if (!ac) return;
  const s = støjKilde(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(fra, t0);
  f.frequency.exponentialRampToValueAtTime(til, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.15);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(ud);
  s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
}

// En tone der glider, evt. med vibrato og filter (boing, arrr, uhhh)
function glid(f0, f1, t0, dur, { type = "sine", vol = 0.25, vibHz = 0, vib = 0, filter = 0, q = 1 } = {}) {
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

export function kast() {
  if (!ac) return;
  sus(nu(), 0.4, 400, 2600, 0.35, "bandpass", 1.2);          // svup!
  // hjulet snurrer mens snøren flyver ud
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), t0 = nu() + 0.15;
  o.type = "square";
  o.frequency.setValueAtTime(95, t0);
  o.frequency.exponentialRampToValueAtTime(40, t0 + 1.0);
  f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 1.5;
  o.connect(f); f.connect(g); g.connect(ud);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
  o.start(t0); o.stop(t0 + 1.05);
}

export function plask(stor = 1) {
  if (!ac) return;
  sus(nu(), 0.25 + 0.25 * stor, 2500, 250, Math.min(0.6, 0.3 * stor), "lowpass", 0.7);
  tone(380, nu(), 0.1, "sine", 0.12 * stor, 900);
  tone(260, nu() + 0.06, 0.12, "sine", 0.1 * stor, 700);
}

export function klik(spænding = 0) { if (ac) tone(1800 + spænding * 900, nu(), 0.02, "square", 0.04); }

export function bid() {             // lille bjælde på stangen + et dunk
  if (!ac) return;
  [0, 0.12, 0.24].forEach(d => { tone(1760, nu() + d, 0.35, "sine", 0.18); tone(2640, nu() + d, 0.25, "sine", 0.07); });
  tone(90, nu(), 0.2, "sine", 0.4, 50);
}

export function knirk(styrke) {
  if (!ac) return;
  knirkG.gain.setTargetAtTime(Math.min(1, styrke) * 0.07, nu(), 0.06);
  knirkO.frequency.setTargetAtTime(90 + styrke * 90, nu(), 0.1);
}

export function fugl() {
  if (!ac) return;
  const f = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3), t0 = nu();
  for (let i = 0; i < n; i++) tone(f * (1 + (i % 2) * 0.12), t0 + i * 0.12, 0.08, "sine", 0.045, f * 1.35);
}

export function rap() {             // anden siger rap rap
  if (!ac) return;
  for (const d of [0, 0.22]) glid(520, 330, nu() + d, 0.18, { type: "sawtooth", vol: 0.3, filter: 1300, q: 2.5 });
}

export function spand() {           // fisken lander i spanden
  if (!ac) return;
  tone(700, nu(), 0.09, "sine", 0.3, 180);
  sus(nu() + 0.05, 0.3, 2000, 300, 0.25, "lowpass", 0.7);
  [784, 1047].forEach((f, i) => tone(f, nu() + 0.15 + i * 0.09, 0.2, "triangle", 0.15));
}

export function måge(vol = 1) {     // kli-kli-kli
  if (!ac) return;
  for (let i = 0; i < 3; i++) glid(1500, 950, nu() + i * 0.17, 0.16, { type: "sawtooth", vol: 0.1 * vol, filter: 1900, q: 4 });
}

export function kvæk() {            // frøen på åkanden
  if (!ac) return;
  for (const d of [0, 0.26]) glid(260, 170, nu() + d, 0.2, { type: "square", vol: 0.16, filter: 700, q: 3 });
}

export function motor(sek = 4) {     // bådens påhængsmotor: brrrum
  if (!ac) return;
  const t0 = nu(), o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
  o.type = "sawtooth"; o.frequency.setValueAtTime(48, t0); o.frequency.linearRampToValueAtTime(75, t0 + 1); o.frequency.linearRampToValueAtTime(52, t0 + sek);
  lfo.frequency.value = 22; lg.gain.value = 10; lfo.connect(lg); lg.connect(o.frequency);
  f.type = "lowpass"; f.frequency.value = 420;
  o.connect(f); f.connect(g); g.connect(ud);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22, t0 + 0.3);
  g.gain.setValueAtTime(0.22, t0 + sek - 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t0 + sek);
  o.start(t0); lfo.start(t0); o.stop(t0 + sek + 0.05); lfo.stop(t0 + sek + 0.05);
  sus(t0 + 0.4, sek - 0.6, 900, 1500, 0.08, "bandpass", 0.6);                 // vandet, der sprøjter
}

export function hvalSang(vol = 0.5) {  // langt ude synger hvalen
  if (!ac) return;
  glid(260, 470, nu(), 1.0, { vol: 0.12 * vol, vibHz: 5, vib: 14 });
  glid(470, 230, nu() + 1.0, 1.3, { vol: 0.12 * vol, vibHz: 4, vib: 12 });
}

export function tryk() { if (ac) tone(660, nu(), 0.08, "triangle", 0.2, 990); }

// Hver fisk har sin egen sjove lyd (vælges med "lyd" i fisk.js)
export function fiskeLyd(type) {
  if (!ac) return;
  const t = nu();
  switch (type) {
    case "disko":
      for (let i = 0; i < 8; i++) {
        const b = t + i * 0.22;
        if (i % 2 === 0) tone(130, b, 0.18, "sine", 0.45, 45);           // bum
        else sus(b, 0.06, 8000, 6000, 0.12, "highpass");                // tss
        tone([196, 196, 233, 262][Math.floor(i / 2) % 4], b, 0.2, "sawtooth", 0.05);
      }
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + 1.0 + i * 0.1, 0.25, "triangle", 0.1));
      break;
    case "pust":
      sus(t, 0.7, 300, 1500, 0.25, "bandpass", 0.8);
      tone(700, t + 0.7, 0.08, "sine", 0.3, 180);
      break;
    case "fanfare":
      window.Effekter.fanfare();
      break;
    case "boing":
      glid(160, 520, t, 0.5, { vol: 0.3, vibHz: 12, vib: 40 });
      break;
    case "arr":
      glid(170, 110, t, 0.8, { type: "sawtooth", vol: 0.35, vibHz: 6, vib: 10, filter: 800, q: 2 });
      break;
    case "plop":
      tone(700, t, 0.09, "sine", 0.3, 180);
      tone(500, t + 0.15, 0.09, "sine", 0.25, 150);
      break;
    case "magi":
      [1047, 1319, 1568, 2093, 2637, 3136].forEach((f, i) => {
        tone(f, t + i * 0.07, 0.4, "sine", 0.09);
        tone(f * 2, t + i * 0.07, 0.2, "sine", 0.03);
      });
      break;
    case "uhh":
      glid(330, 220, t, 1.2, { vol: 0.15, vibHz: 5, vib: 12 });
      glid(415, 277, t + 0.05, 1.2, { vol: 0.08, vibHz: 5.5, vib: 12 });
      break;
    case "hmm":
      tone(150, t, 0.25, "triangle", 0.25);
      tone(190, t + 0.3, 0.3, "triangle", 0.25);
      break;
    case "haj":                     // dum-dum … dum-dum
      [0, 0.45, 0.8, 1.05, 1.25, 1.42].forEach((d, i) => tone(i % 2 ? 87 : 82, t + d, 0.22, "triangle", 0.45));
      break;
    case "sværd":
      sus(t, 0.3, 700, 4000, 0.3, "bandpass", 1);
      tone(2637, t + 0.25, 0.5, "triangle", 0.12); tone(3951, t + 0.25, 0.35, "sine", 0.05);
      break;
    case "blæk":                    // splat!
      sus(t, 0.35, 3000, 300, 0.35, "bandpass", 2);
      [0, 0.12].forEach((d, i) => tone(260 + i * 120, t + 0.3 + d, 0.1, "sine", 0.2, 520 + i * 200));
      break;
    case "knips":
      for (let i = 0; i < 4; i++) { tone(2300, t + i * 0.13, 0.025, "square", 0.1); sus(t + i * 0.13, 0.05, 5000, 3000, 0.12, "highpass"); }
      break;
    case "hval":
      glid(300, 540, t, 0.9, { vol: 0.2, vibHz: 5, vib: 15 });
      glid(540, 260, t + 0.9, 1.1, { vol: 0.2, vibHz: 4, vib: 12 });
      break;
    case "skat":                    // mønter, der klirrer — og en fanfare
      for (let i = 0; i < 16; i++) tone(2000 + Math.random() * 2600, t + i * 0.05, 0.16, "triangle", 0.06);
      setTimeout(() => window.Effekter.fanfare(), 700);
      break;
    case "bip":
      [880, 660, 990, 1320, 1320].forEach((fr, i) => tone(fr, t + i * 0.12, 0.09, "square", 0.07));
      break;
    case "spøg":                    // buhuuu
      glid(420, 290, t, 1.3, { vol: 0.14, vibHz: 6, vib: 30 });
      glid(630, 440, t + 0.1, 1.2, { vol: 0.07, vibHz: 6.5, vib: 30 });
      break;
    case "tss":                     // det syder
      sus(t, 1.0, 6000, 3000, 0.22, "highpass", 0.7);
      tone(110, t, 0.5, "sine", 0.25, 60);
      break;
    case "klirr":
      [2637, 3136, 3520, 4186, 3520].forEach((fr, i) => tone(fr, t + i * 0.07, 0.35, "sine", 0.09));
      break;
    case "miav":
      glid(560, 880, t, 0.25, { type: "sawtooth", vol: 0.16, filter: 1500, q: 3 });
      glid(880, 480, t + 0.25, 0.45, { type: "sawtooth", vol: 0.16, filter: 1300, q: 3 });
      break;
    case "raket":
      glid(180, 1500, t, 0.9, { type: "sawtooth", vol: 0.1, filter: 900, q: 1 });
      sus(t, 0.9, 500, 3000, 0.2, "bandpass", 0.8);
      break;
    case "rawr":
      glid(170, 90, t, 0.75, { type: "sawtooth", vol: 0.32, vibHz: 25, vib: 20, filter: 650, q: 1.5 });
      break;
    default:                        // "blub"
      [0, 0.12, 0.24].forEach((d, i) => tone(300 + i * 140, t + d, 0.11, "sine", 0.22, (300 + i * 140) * 1.9));
  }
}
