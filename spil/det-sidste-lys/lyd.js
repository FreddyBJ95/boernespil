// Havbrus og få bløde toner skabes lokalt, uden lydfiler eller eksterne tjenester.
export class ØLyd {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.aktiv = true;
    this.pauset = false;
    this.sidsteTone = 0;
  }

  async start() {
    let ny = null;
    try {
      if (!this.ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return false;
        ny = new Audio();
        const master = ny.createGain();
        master.gain.value = this.aktiv && !this.pauset ? .14 : 0;
        master.connect(ny.destination);
        const buffer = ny.createBuffer(1, ny.sampleRate * 5, ny.sampleRate);
        const data = buffer.getChannelData(0);
        let s = 0;
        for (let i = 0; i < data.length; i++) {
          s = (s + (Math.random() * 2 - 1) * .035) / 1.015;
          data[i] = s;
        }
        const kilde = ny.createBufferSource();
        kilde.buffer = buffer;
        kilde.loop = true;
        const filter = ny.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 650;
        const hav = ny.createGain();
        hav.gain.value = .8;
        kilde.connect(filter);
        filter.connect(hav);
        hav.connect(master);
        // Små toner (gåder, nye kapitler) har deres egen styrke: de skal høres, selv om havet er dæmpet bag en dialog
        const effekter = ny.createGain();
        effekter.gain.value = .14;
        effekter.connect(ny.destination);
        this.effekter = effekter;
        kilde.start();
        this.ctx = ny;
        this.master = master;
        ny = null;
      }
      await this.ctx.resume();
      return true;
    } catch {
      // En halv lydgraf lukkes; hverken lukning eller afvist resume må stoppe eventyret.
      try {
        if (ny) Promise.resolve(ny.close?.()).catch(() => {});
      } catch { /* lyd er valgfri */ }
      return false;
    }
  }

  sæt(aktiv, pause = false) {
    this.aktiv = aktiv;
    this.pauset = pause;
    try {
      if (this.master) this.master.gain.setTargetAtTime(aktiv && !pause ? .14 : 0, this.ctx.currentTime, .3);
    } catch { /* Nogle enheder kan lukke lydkonteksten under en pause. */ }
  }

  // En dialog dæmper havet, men gådernes klik og kapitlernes klokker skal stadig høres
  dæmp(aktiv) {
    this.aktiv = aktiv;
    this.pauset = false;
    try {
      if (this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .3);
    } catch { /* lyd er valgfri */ }
  }

  tone(frekvens, efter = 0, styrke = .12) {
    if (!this.ctx || !this.effekter || !this.aktiv || this.pauset) return;
    try {
      const nu = this.ctx.currentTime + efter, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frekvens;
      gain.gain.setValueAtTime(0, nu);
      gain.gain.linearRampToValueAtTime(styrke, nu + .06);
      gain.gain.exponentialRampToValueAtTime(.001, nu + 2.6);
      osc.connect(gain);
      gain.connect(this.effekter);
      osc.start(nu);
      osc.stop(nu + 2.7);
    } catch { /* En tone er valgfri feedback; spillet kan fortsætte uden den. */ }
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
