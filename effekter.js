// ===== effekter.js — moderne fest-effekter til alle spil =====
// <script src="../../effekter.js"></script>
// Effekter.konfetti(x,y) · .stjerner(x,y) · .tekstPop(x,y,tekst) · .boelge(x,y)
// .flash() · .ding() · .pop() · .fanfare() · .fejl() · .fest(x,y) · .skibidi()

(function () {
  let canvas, ctx, dele = [], kører = false, sidste = 0;

  function klar() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:99999";
    document.body.appendChild(canvas);
    str();
    window.addEventListener("resize", str);
  }
  function str() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * d;
    canvas.height = window.innerHeight * d;
    ctx = canvas.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function start() {
    if (!kører) { kører = true; sidste = performance.now(); requestAnimationFrame(loop); }
  }

  function stjernePath(cx, cy, r, takker) {
    takker = takker || 5;
    ctx.beginPath();
    for (let i = 0; i < takker * 2; i++) {
      const rad = i % 2 ? r * 0.45 : r;
      const a = (Math.PI / takker) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function loop(nu) {
    const dt = Math.min((nu - sidste) / 1000, 0.05);
    sidste = nu;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of dele) {
      p.liv -= dt;
      if (p.liv <= 0) { p.død = true; continue; }
      const a = Math.max(0, Math.min(1, p.liv / p.maxliv));
      ctx.globalAlpha = a;

      if (p.form === "boelge") {
        // Chokbølge-ring der breder sig ud
        p.r += p.fart * dt;
        ctx.globalAlpha = a * 0.6;
        ctx.strokeStyle = p.farve;
        ctx.lineWidth = p.tyk * a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      // fysik
      p.vy += p.tyngde * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      if (p.glød) { ctx.shadowBlur = p.s * 0.9; ctx.shadowColor = p.farve; }

      if (p.form === "rekt") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.farve;
        ctx.fillRect(-p.s / 2, -p.s * 0.32, p.s, p.s * 0.64);
        ctx.restore();
      } else if (p.form === "cirkel") {
        ctx.fillStyle = p.farve;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.form === "stjerne") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.farve;
        stjernePath(0, 0, p.s * 0.7);
        ctx.fill();
        ctx.restore();
      } else { // emoji / tekst
        const sz = p.vokser ? p.s * (2 - a) : p.s;
        ctx.font = "bold " + sz + "px ui-rounded, system-ui, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (p.skygge) { ctx.shadowBlur = 16; ctx.shadowColor = "rgba(0,0,0,.35)"; }
        ctx.fillText(p.tekst, p.x, p.y);
      }
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    dele = dele.filter(p => !p.død);
    if (dele.length) requestAnimationFrame(loop); else kører = false;
  }

  const FARVER = ["#ff477e", "#ffd23f", "#06d6a0", "#3a86ff", "#b15bff", "#ff8c42", "#22e3c3"];
  const FORMER = ["rekt", "rekt", "cirkel", "stjerne"];

  function konfetti(x, y, opts) {
    klar(); opts = opts || {};
    const n = opts.antal || 60;
    const farver = opts.farver || FARVER;
    for (let i = 0; i < n; i++) {
      const v = 160 + Math.random() * 360, vink = Math.random() * Math.PI * 2;
      dele.push({
        form: FORMER[Math.floor(Math.random() * FORMER.length)],
        x, y,
        vx: Math.cos(vink) * v, vy: Math.sin(vink) * v - 180,
        tyngde: 760, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 22,
        s: 9 + Math.random() * 11, farve: farver[i % farver.length], glød: true,
        liv: 1.2 + Math.random() * 0.9, maxliv: 2.1
      });
    }
    boelge(x, y, opts.ring || "#ffffff");
    start();
  }

  function boelge(x, y, farve) {
    klar();
    dele.push({ form: "boelge", x, y, r: 6, fart: 520, tyk: 8, farve: farve || "#ffffff", liv: 0.55, maxliv: 0.55 });
    start();
  }

  function stjerner(x, y, opts) {
    klar(); opts = opts || {};
    const n = opts.antal || 14;
    const set = opts.emojis || ["⭐", "✨", "🌟", "💫", "🎉", "🌈"];
    for (let i = 0; i < n; i++) {
      const v = 110 + Math.random() * 240, vink = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      dele.push({
        form: "emoji", tekst: set[Math.floor(Math.random() * set.length)],
        x, y, vx: Math.cos(vink) * v, vy: Math.sin(vink) * v, skygge: true,
        tyngde: 160, rot: 0, vr: 0,
        s: 30 + Math.random() * 20, liv: 1.1 + Math.random() * 0.7, maxliv: 1.8
      });
    }
    start();
  }

  function tekstPop(x, y, tekst, opts) {
    klar(); opts = opts || {};
    dele.push({
      form: "emoji", tekst, x, y, vx: 0, vy: -90, tyngde: 0, rot: 0, vr: 0,
      s: opts.s || 70, vokser: true, skygge: true, liv: 1.0, maxliv: 1.0
    });
    start();
  }

  function flash(farve) {
    if (!document.body) return;
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:99998;transition:opacity .5s;opacity:.5;" +
      "background:radial-gradient(circle at 50% 45%, " + (farve || "#fff") + ", transparent 70%)";
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.opacity = "0"; });
    setTimeout(() => d.remove(), 520);
  }

  // Stor samlet fest
  function fest(x, y, opts) {
    opts = opts || {};
    x = x == null ? window.innerWidth / 2 : x;
    y = y == null ? window.innerHeight / 2 : y;
    konfetti(x, y, { antal: 80 });
    stjerner(x, y, { antal: 18 });
    boelge(x, y, "#fff");
    flash(opts.farve || "#ffffff");
    fanfare();
  }

  // ---- Lyd (Web Audio, ingen filer) ----
  let ac, master;
  function audio() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.85;
      const komp = ac.createDynamicsCompressor ? ac.createDynamicsCompressor() : null;
      if (komp) { master.connect(komp); komp.connect(ac.destination); }
      else master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function node() { audio(); return master; }

  function blip(freq, start, dur, type, vol, detune) {
    const a = audio(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(node());
    o.type = type || "sine"; o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.start(start); o.stop(start + dur + 0.02);
  }
  // rigere tone: to let-forskudte oscillatorer
  function rig(freq, start, dur, vol) {
    blip(freq, start, dur, "triangle", (vol || 0.25), -6);
    blip(freq, start, dur, "sine", (vol || 0.25) * 0.7, +6);
  }

  function ding() {
    const n = audio().currentTime;
    rig(880, n, 0.18, 0.3);
    rig(1320, n + 0.05, 0.22, 0.22);
  }
  function pop() {
    const a = audio(), n = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(node()); o.type = "triangle";
    o.frequency.setValueAtTime(1000, n);
    o.frequency.exponentialRampToValueAtTime(180, n + 0.16);
    g.gain.setValueAtTime(0.32, n);
    g.gain.exponentialRampToValueAtTime(0.0001, n + 0.2);
    o.start(n); o.stop(n + 0.22);
  }
  function fanfare() {
    const n = audio().currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => rig(f, n + i * 0.1, 0.26, 0.26));
    // sluttende akkord
    [659, 988, 1319].forEach(f => rig(f, n + 0.55, 0.5, 0.2));
  }
  function fejl() {
    const a = audio(), n = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(node()); o.type = "sawtooth";
    o.frequency.setValueAtTime(300, n);
    o.frequency.exponentialRampToValueAtTime(120, n + 0.3);
    g.gain.setValueAtTime(0.25, n);
    g.gain.exponentialRampToValueAtTime(0.0001, n + 0.32);
    o.start(n); o.stop(n + 0.34);
  }
  // Dyb wobble-bas til Skibidi-temaet
  function skibidi() {
    const a = audio(), n = a.currentTime;
    const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    o.type = "sawtooth"; o.frequency.value = 70;
    lfo.type = "sine"; lfo.frequency.value = 7; lg.gain.value = 28;
    lfo.connect(lg); lg.connect(o.frequency);
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    o.connect(lp); lp.connect(g); g.connect(node());
    g.gain.setValueAtTime(0.0001, n);
    g.gain.exponentialRampToValueAtTime(0.35, n + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, n + 0.4);
    o.start(n); lfo.start(n); o.stop(n + 0.42); lfo.stop(n + 0.42);
    blip(180, n, 0.18, "square", 0.12);
  }

  window.Effekter = { konfetti, stjerner, tekstPop, boelge, flash, fest, ding, pop, fanfare, fejl, skibidi, audio };
})();
