// ===== Motorlyden: en dieselbrummen, der stiger med farten =====
// Lyden laves i Nedrivningsfirmaets lydmotor (samme kompressor og rumklang som bragene).
// To savtakker en kvint fra hinanden giver motorens dybe brum; et filter åbner, når der gives gas.
export class Motorlyd {
  constructor(lyd) {
    this.lyd = lyd;
    this.klar = false;
  }

  start() {
    const c = this.lyd.ctx;
    if (this.klar || !c || !this.lyd.komp) return;
    this.klar = true;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 200;
    this.filter.Q.value = 2;
    this.styrke = c.createGain();
    this.styrke.gain.value = 0;
    this.filter.connect(this.styrke).connect(this.lyd.komp);
    this.osc = [0.5, 0.75, 1].map((f, i) => {
      const o = c.createOscillator();
      o.type = i === 2 ? 'square' : 'sawtooth';
      const g = c.createGain();
      g.gain.value = i === 2 ? 0.12 : 0.35;
      o.connect(g).connect(this.filter);
      o.start();
      return { o, f };
    });
    // Raketten suser: filtreret støj
    const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.sus = c.createBufferSource();
    this.sus.buffer = b; this.sus.loop = true;
    this.susFilter = c.createBiquadFilter();
    this.susFilter.type = 'bandpass'; this.susFilter.frequency.value = 900;
    this.susStyrke = c.createGain(); this.susStyrke.gain.value = 0;
    this.sus.connect(this.susFilter).connect(this.susStyrke).connect(this.lyd.komp);
    this.sus.start();
  }

  // fart i m/s, gas -1…1, boost og om bilen er i gang
  kør(fart, gas, boost, aktiv) {
    if (!this.klar) return;
    const t = this.lyd.ctx.currentTime, grund = 38 + Math.abs(fart) * 3.2 + Math.abs(gas) * 18;
    for (const { o, f } of this.osc) o.frequency.setTargetAtTime(grund * f * 2, t, 0.08);
    this.filter.frequency.setTargetAtTime(gas ? 520 + Math.abs(fart) * 30 : 220, t, 0.1);
    this.styrke.gain.setTargetAtTime(aktiv && !this.lyd.slået ? 0.05 + Math.abs(gas) * 0.07 : 0, t, 0.1);
    this.susStyrke.gain.setTargetAtTime(aktiv && boost && !this.lyd.slået ? 0.35 : 0, t, 0.06);
  }
}
