// Havbrus og få bløde toner skabes lokalt, uden lydfiler eller eksterne tjenester.
export class ØLyd {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.aktiv = true;
    this.sidsteTone = 0;
  }

  async start() {
    if (!this.ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.ctx = new Audio();
      this.master = this.ctx.createGain();
      this.master.gain.value = .14;
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 5, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let s = 0;
      for (let i = 0; i < data.length; i++) {
        s = (s + (Math.random() * 2 - 1) * .035) / 1.015;
        data[i] = s;
      }
      const kilde = this.ctx.createBufferSource();
      kilde.buffer = buffer;
      kilde.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 650;
      const hav = this.ctx.createGain();
      hav.gain.value = .8;
      kilde.connect(filter);
      filter.connect(hav);
      hav.connect(this.master);
      kilde.start();
    }
    try {
      await this.ctx.resume();
    } catch { /* En browser kan bede om et nyt tryk. */ }
  }

  sæt(aktiv, pause = false) {
    this.aktiv = aktiv;
    if (this.master) this.master.gain.setTargetAtTime(aktiv && !pause ? .14 : 0, this.ctx.currentTime, .3);
  }

  tone(frekvens, efter = 0, styrke = .12) {
    if (!this.ctx || !this.aktiv) return;
    const nu = this.ctx.currentTime + efter, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frekvens;
    gain.gain.setValueAtTime(0, nu);
    gain.gain.linearRampToValueAtTime(styrke, nu + .06);
    gain.gain.exponentialRampToValueAtTime(.001, nu + 2.6);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(nu);
    osc.stop(nu + 2.7);
  }

  fremskridt() {
    [293.66, 369.99, 440, 587.33].forEach((f, i) => this.tone(f, i * .17, .18));
  }

  opdater(tid, nat) {
    if (tid - this.sidsteTone > 15) {
      this.sidsteTone = tid;
      const f = nat ? 220 : 293.66;
      this.tone(f, 0, .085);
      this.tone(f * 1.5, 1.5, .045);
      this.tone(f * 2, 3, .035);
    }
  }
}
