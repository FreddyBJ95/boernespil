// Optagede brag blandes med syntetisk motor, opladning og farvede energilyde.
const KLIP = ['stor', 'tnt', 'gas', 'metal', 'beton', 'brokker', 'glas', 'trae_knaek'];
export class Lyd {
  constructor() {
    this.ctx = null;
    this.buffere = new Map();
    this.stemmer = new Set();
    this.tændt = true;
    this.volumen = .55;
    this.slagTid = 0;
    this.kameraX = 0;
  }

  // Opret synkront ved fingertryk, før nogen netværkshentning afventes på Safari.
  start() {
    try {
      if (!this.ctx) this.opret();
      this.ctx.resume().catch(() => {});
    } catch { return; }
    if (!this.henter) {
      this.henter = true;
      for (const navn of KLIP) fetch(`../brudpunkt/lyde/${navn}.mp3`)
        .then(s => { if (!s.ok) throw new Error('Lyd mangler'); return s.arrayBuffer(); })
        .then(b => this.ctx.decodeAudioData(b)).then(b => this.buffere.set(navn, b)).catch(() => {});
    }
  }

  opret() {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.ctx = new Audio();
    const c = this.ctx;
    this.ud = c.createGain();
    this.ud.gain.value = this.tændt ? this.volumen : 0;
    const kompressor = c.createDynamicsCompressor();
    kompressor.threshold.value = -15;
    kompressor.ratio.value = 10;
    kompressor.attack.value = .003;
    kompressor.release.value = .22;
    this.ud.connect(kompressor).connect(c.destination);
    const ekko = c.createDelay(.5), dæmp = c.createGain(), filter = c.createBiquadFilter();
    ekko.delayTime.value = .19;
    dæmp.gain.value = .15;
    filter.frequency.value = 1600;
    this.klang = c.createGain();
    this.klang.gain.value = .22;
    this.klang.connect(ekko).connect(filter).connect(this.ud);
    filter.connect(dæmp).connect(ekko);
    this.motor = c.createOscillator();
    this.motor.type = 'sawtooth';
    this.motorFilter = c.createBiquadFilter();
    this.motorFilter.frequency.value = 170;
    this.motorGain = c.createGain();
    this.motorGain.gain.value = 0;
    this.motor.connect(this.motorFilter).connect(this.motorGain).connect(this.ud);
    this.motor.start();
    this.støj = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = this.støj.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  vælg(tændt, volumen = this.volumen) {
    this.tændt = tændt;
    this.volumen = volumen;
    if (this.ctx) this.ud.gain.setTargetAtTime(tændt ? volumen : 0, this.ctx.currentTime, .03);
  }

  // Alle kortvarige stemmer afkobles, og antallet har et fast loft.
  forbind(kilde, styrke, x, varighed, filter = null) {
    if (this.stemmer.size >= 22) return false;
    const c = this.ctx, gain = c.createGain(), pan = c.createStereoPanner();
    const nu = c.currentTime;
    const afstand = Math.max(.22, 1 / (1 + Math.abs(x - this.kameraX) * .025));
    gain.gain.setValueAtTime(.001, nu);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, styrke * afstand), nu + .008);
    gain.gain.exponentialRampToValueAtTime(.001, nu + varighed);
    pan.pan.value = Math.max(-.8, Math.min(.8, (x - this.kameraX) / 30));
    if (filter) kilde.connect(filter).connect(gain);
    else kilde.connect(gain);
    gain.connect(pan).connect(this.ud);
    pan.connect(this.klang);
    this.stemmer.add(kilde);
    kilde.onended = () => {
      this.stemmer.delete(kilde);
      kilde.disconnect();
      gain.disconnect();
      pan.disconnect();
      filter?.disconnect();
    };
    kilde.start();
    kilde.stop(nu + varighed + .02);
    return true;
  }

  klip(navn, styrke, x, rate = 1) {
    const b = this.buffere.get(navn);
    if (!b || !this.ctx || !this.tændt) return;
    const kilde = this.ctx.createBufferSource();
    kilde.buffer = b;
    kilde.playbackRate.value = rate;
    this.forbind(kilde, styrke, x, Math.min(4, b.duration / rate));
  }

  tone(fra, til, sekunder, styrke, x, type = 'sine') {
    if (!this.ctx || !this.tændt) return;
    const o = this.ctx.createOscillator(), t = this.ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(fra, t);
    o.frequency.exponentialRampToValueAtTime(til, t + sekunder);
    this.forbind(o, styrke, x, sekunder);
  }

  sus(styrke, x, sekunder = .8, frekvens = 900) {
    if (!this.ctx || !this.tændt) return;
    const kilde = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter();
    kilde.buffer = this.støj;
    filter.type = 'lowpass';
    filter.frequency.value = frekvens;
    this.forbind(kilde, styrke, x, sekunder, filter);
  }

  hændelse(e) {
    if (!this.ctx || !this.tændt) return;
    const x = e.p.x;
    if (e.type === 'slag') {
      if (this.ctx.currentTime - this.slagTid < .045) return;
      this.slagTid = this.ctx.currentTime;
      this.klip(e.materiale, .12 + e.styrke * .35, x, .85 + Math.random() * .3);
    } else if (e.type === 'lunte') {
      this.tone(160, 700, .18, .055, x, 'triangle');
    } else if (e.type === 'brag' || e.type === 'efterslag') {
      // Et nyt brag får plads foran gamle efterklange under en tæt kædereaktion.
      while (this.stemmer.size > 16) {
        const ældste = this.stemmer.values().next().value;
        this.stemmer.delete(ældste);
        try { ældste.stop(); } catch { /* Efterklangen er allerede slut. */ }
      }
      this.klip(e.slags === 'tnt' ? 'tnt' : e.slags === 'gas' ? 'gas' : 'stor', .65, x, .8 + Math.random() * .18);
      this.tone(e.slags === 'blaa' ? 140 : 85, 24, 1.1, .43, x);
      this.sus(.24, x, 1.5, e.slags === 'gas' ? 1600 : 600);
      if (e.slags === 'blaa') this.tone(1250, 90, .65, .16, x, 'triangle');
      if (e.slags === 'lilla') {
        this.tone(90, 650, .5, .12, x, 'triangle');
        this.tone(680, 55, 1.2, .14, x);
      }
      if (e.slags === 'benzin') this.klip('brokker', .25, x, .8);
    }
  }

  kør(fart, gas, boost, aktiv) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.motor.frequency.setTargetAtTime(32 + fart * .55 + Math.abs(gas) * 25, t, .12);
    this.motorFilter.frequency.setTargetAtTime(boost ? 1000 : 150 + fart * 3, t, .1);
    this.motorGain.gain.setTargetAtTime(aktiv ? .025 + Math.abs(gas) * .035 : 0, t, .08);
  }

  pause(pauser) {
    if (!this.ctx) return;
    if (pauser) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }

  nulstil() {
    for (const stemme of this.stemmer) {
      try { stemme.stop(); } catch { /* Stemmen kan allerede være afsluttet. */ }
    }
    this.kør(0, 0, false, false);
  }
}
