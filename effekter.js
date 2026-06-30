// ===== effekter.js — fælles fest-effekter til alle spil =====
// Brug: <script src="../../effekter.js"></script>
// Så kald fx Effekter.konfetti(x, y), Effekter.fanfare(), Effekter.stjerner(x, y) osv.
// x/y er skærm-koordinater (samme som e.clientX / e.clientY).

(function () {
  let canvas, ctx, dele = [], kører = false, sidste = 0;

  function klar() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
    document.body.appendChild(canvas);
    str();
    window.addEventListener("resize", str);
  }
  function str() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext("2d");
  }
  function start() {
    if (!kører) { kører = true; sidste = performance.now(); requestAnimationFrame(loop); }
  }
  function loop(nu) {
    const dt = Math.min((nu - sidste) / 1000, 0.05);
    sidste = nu;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of dele) {
      p.liv -= dt;
      if (p.liv <= 0) { p.død = true; continue; }
      p.vy += p.tyngde * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const a = Math.max(0, Math.min(1, p.liv / p.maxliv));
      ctx.globalAlpha = a;
      if (p.type === "konfetti") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.farve;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      } else {
        const sz = p.vokser ? p.s * (2 - a) : p.s;
        ctx.font = sz + "px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.tekst, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
    dele = dele.filter(p => !p.død);
    if (dele.length) requestAnimationFrame(loop); else kører = false;
  }

  const FARVER = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff70a6", "#06d6a0"];

  function konfetti(x, y, opts) {
    klar(); opts = opts || {};
    const n = opts.antal || 40;
    const farver = opts.farver || FARVER;
    for (let i = 0; i < n; i++) {
      const v = 120 + Math.random() * 280, vink = Math.random() * Math.PI * 2;
      dele.push({
        type: "konfetti", x, y,
        vx: Math.cos(vink) * v, vy: Math.sin(vink) * v - 140,
        tyngde: 620, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18,
        s: 8 + Math.random() * 9, farve: farver[i % farver.length],
        liv: 1.1 + Math.random() * 0.7, maxliv: 1.8
      });
    }
    start();
  }

  function stjerner(x, y, opts) {
    klar(); opts = opts || {};
    const n = opts.antal || 12;
    const set = opts.emojis || ["⭐", "✨", "🌟", "💫", "🎉", "🌈"];
    for (let i = 0; i < n; i++) {
      const v = 90 + Math.random() * 200, vink = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      dele.push({
        type: "emoji", tekst: set[Math.floor(Math.random() * set.length)],
        x, y, vx: Math.cos(vink) * v, vy: Math.sin(vink) * v,
        tyngde: 140, rot: 0, vr: 0,
        s: 28 + Math.random() * 18, liv: 1.0 + Math.random() * 0.7, maxliv: 1.7
      });
    }
    start();
  }

  function tekstPop(x, y, tekst) {
    klar();
    dele.push({
      type: "emoji", tekst, x, y, vx: 0, vy: -70, tyngde: 0, rot: 0, vr: 0,
      s: 64, vokser: true, liv: 0.9, maxliv: 0.9
    });
    start();
  }

  function flash(farve) {
    if (!document.body) return;
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:9998;background:" +
      (farve || "#fff") + ";opacity:.55;transition:opacity .45s";
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.opacity = "0"; });
    setTimeout(() => d.remove(), 480);
  }

  // ---- Lyd (Web Audio, ingen filer) ----
  let ac;
  function audio() {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function blip(freq, start, dur, type, vol) {
    const a = audio(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.25, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.start(start); o.stop(start + dur);
  }
  function ding() {
    const a = audio(), n = a.currentTime;
    blip(880, n, 0.12, "sine", 0.3);
    blip(1320, n + 0.06, 0.16, "sine", 0.25);
  }
  function pop() {
    const a = audio(), n = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.type = "triangle";
    o.frequency.setValueAtTime(900, n);
    o.frequency.exponentialRampToValueAtTime(200, n + 0.15);
    g.gain.setValueAtTime(0.3, n);
    g.gain.exponentialRampToValueAtTime(0.001, n + 0.18);
    o.start(n); o.stop(n + 0.18);
  }
  function fanfare() {
    const a = audio(), n = a.currentTime;
    [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, n + i * 0.1, 0.22, "square", 0.22));
    blip(1047, n + 0.52, 0.45, "sine", 0.22);
  }
  function fejl() {
    const a = audio(), n = a.currentTime;
    blip(220, n, 0.32, "sawtooth", 0.25);
  }

  window.Effekter = { konfetti, stjerner, tekstPop, flash, ding, pop, fanfare, fejl, audio };
})();
