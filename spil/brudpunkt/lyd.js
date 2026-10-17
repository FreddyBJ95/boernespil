// BRUDPUNKT: optagede materialelyde med afstand, retning og en kort fælles rumklang.
const KERNE = ["knald", "kontrolleret", "stor", "metal", "beton", "glas", "trae_knaek", "brokker"];
const MATERIALER = {
  glas: ["glas", "glas2"],
  trae: ["trae_knaek"],
  metal: ["metal", "metal_fald"],
  beton: ["beton", "brokker"],
};
const MAKS_LYDE = 16;
const MAKS_VENTENDE = 16;
// Målt på de eksisterende klip: spring kun den stille optagelsesforkant over, ikke selve anslaget.
const FORKANT = { kontrolleret: .12, metal: .01, metal_fald: .02, beton: .22, glas: .06, glas2: .02, trae_knaek: .06 };
const begræns = (tal, fra, til) => Math.min(til, Math.max(fra, tal));
const punkt = (p) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);

export class BrudLyd {
  constructor({ volumen = .65 } = {}) {
    this.volumen = Number.isFinite(volumen) ? begræns(volumen, 0, 1) : .65;
    this.lyd = true;
    this.ctx = null;
    this.kamera = [0, 0, 0];
    this.retning = [0, 0, -1];
    this.buffere = new Map();
    this.aktive = new Set();
    this.ventetider = new Map();
    this.kø = [];
    this.henter = 0;
    this.venter = 0;
    this.hentninger = new Set();
    this.generation = 0;
    this.afsluttet = false;
    this.fælles = [];
  }

  // Kaldes direkte fra Start-knappen: især iPad kræver et klik for at åbne lyden.
  async start() {
    if (this.afsluttet) return false;
    try {
      if (!this.ctx) {
        const Kontekst = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Kontekst) return false;
        this.ctx = new Kontekst();
        try {
          this.lavUdgang();
        } catch (fejl) {
          try {
            this.ctx.close()?.catch(() => {});
          } catch { /* Intet lydsystem til rådighed. */ }
          this.ctx = null;
          throw fejl;
        }
      }
      if (this.ctx.state !== "running") await this.ctx.resume();
      if (this.afsluttet || this.ctx.state !== "running") return false;
      this.opdaterKamera(this.kamera, this.retning);
      await Promise.all(KERNE.map((navn) => this.hent(navn)));
      return !this.afsluttet && this.ctx.state === "running";
    } catch {
      return false;
    }
  }

  // Kun én kompressor og én rumklang deles af alle klip, også under store sammenstyrtninger.
  lavUdgang() {
    const c = this.ctx;
    this.ud = c.createGain();
    this.ud.gain.value = this.lyd ? this.volumen : 0;
    const grænse = c.createDynamicsCompressor();
    grænse.threshold.value = -10;
    grænse.knee.value = 12;
    grænse.ratio.value = 12;
    grænse.attack.value = .003;
    grænse.release.value = .15;
    this.ud.connect(grænse);
    grænse.connect(c.destination);
    this.klang = c.createConvolver();
    const impuls = c.createBuffer(2, Math.floor(c.sampleRate * .42), c.sampleRate);
    let frø = 438923;
    for (let kanal = 0; kanal < 2; kanal++) {
      const data = impuls.getChannelData(kanal);
      for (let i = 0; i < data.length; i++) {
        frø = (Math.imul(frø, 1664525) + 1013904223) | 0;
        data[i] = (frø / 2147483648) * (1 - i / data.length) ** 3 * .13;
      }
    }
    this.klang.buffer = impuls;
    const våd = c.createGain();
    våd.gain.value = .075;
    this.klang.connect(våd);
    våd.connect(this.ud);
    this.fælles = [this.ud, grænse, this.klang, våd];
  }

  // Indlæs højst to filer ad gangen. En manglende fil huskes som lydløs og prøves ikke hvert billede.
  hent(navn) {
    if (this.afsluttet || !this.ctx) return Promise.resolve(null);
    if (this.buffere.has(navn)) return this.buffere.get(navn);
    const løfte = new Promise((løs) => this.kø.push({ navn, løs }));
    this.buffere.set(navn, løfte);
    this.hentNæste();
    return løfte;
  }

  hentNæste() {
    while (!this.afsluttet && this.henter < 2 && this.kø.length) {
      const job = this.kø.shift(), c = this.ctx;
      const afbryd = new AbortController();
      this.hentninger.add(afbryd);
      this.henter++;
      Promise.resolve().then(async () => {
        const svar = await fetch(new URL(`./lyde/${job.navn}.mp3`, import.meta.url), { signal: afbryd.signal });
        if (!svar.ok) return null;
        const data = await svar.arrayBuffer();
        if (this.afsluttet) return null;
        return await c.decodeAudioData(data);
      }).catch(() => null).then(job.løs).finally(() => {
        this.henter--;
        this.hentninger.delete(afbryd);
        this.hentNæste();
      });
    }
  }

  // Lytteren følger kameraet. Retningen er valgfri for simple kameraer uden rotation.
  opdaterKamera(position, retning = this.retning) {
    if (!punkt(position)) return;
    this.kamera = [...position];
    if (punkt(retning) && Math.hypot(...retning) > .001) this.retning = [...retning];
    const l = this.ctx?.listener;
    if (!l || this.afsluttet) return;
    const [x, y, z] = this.kamera, [fx, fy, fz] = this.retning;
    if (l.positionX) {
      l.positionX.value = x;
      l.positionY.value = y;
      l.positionZ.value = z;
      l.forwardX.value = fx;
      l.forwardY.value = fy;
      l.forwardZ.value = fz;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(x, y, z);
      l.setOrientation(fx, fy, fz, 0, 1, 0);
    }
  }

  saetLyd(tændt) {
    this.lyd = Boolean(tændt);
    if (this.ud) this.ud.gain.value = this.lyd ? this.volumen : 0;
    if (!this.lyd) this.stop();
    return this.lyd;
  }

  // Kontakter samles i små områder, så en bunke hvilende brokker ikke bliver til en lydstorm.
  async afspil({ type, position, styrke = .5, materiale = "beton" } = {}) {
    const c = this.ctx;
    if (!c || c.state !== "running" || !this.lyd || this.afsluttet || !punkt(position)) return false;
    if (!["puls", "brud", "kontakt"].includes(type) || !Number.isFinite(styrke) || styrke <= 0) return false;
    const afstand = Math.hypot(...position.map((v, i) => v - this.kamera[i]));
    if (afstand > 180 || this.venter >= MAKS_VENTENDE) return false;
    const nøgle = `${type}/${materiale}/${position.map((v) => Math.round(v * 2)).join("/")}`;
    const pause = type === "kontakt" ? .09 : type === "brud" ? .07 : .045;
    if (c.currentTime - (this.ventetider.get(nøgle) ?? -Infinity) < pause) return false;
    if (this.ventetider.size >= 128) this.ventetider.delete(this.ventetider.keys().next().value);
    this.ventetider.set(nøgle, c.currentTime);
    const generation = this.generation;
    const muligheder = Object.hasOwn(MATERIALER, materiale) ? MATERIALER[materiale] : MATERIALER.beton;
    const navn = type === "puls"
      ? (styrke > .75 ? "stor" : styrke > .35 ? "knald" : "kontrolleret")
      : muligheder[Math.floor(Math.random() * muligheder.length)];
    this.venter++;
    try {
      const buffer = await this.hent(navn);
      if (!buffer || this.afsluttet || !this.lyd || this.generation !== generation || c.state !== "running") {
        return false;
      }
      return this.spilBuffer(buffer, {
        type,
        position: [...position],
        styrke: begræns(styrke, 0, 1),
        forkant: FORKANT[navn] || 0,
      });
    } catch {
      return false;
    } finally {
      this.venter--;
    }
  }

  // Når loftet er nået, må et nyt brag overtage en kontaktlyd; svage slag får ellers plads senere.
  givPlads(type) {
    if (this.aktive.size < MAKS_LYDE) return true;
    if (type === "kontakt") return false;
    const ældste = [...this.aktive].find((lyd) => lyd.type === "kontakt") || this.aktive.values().next().value;
    ældste.rens();
    return true;
  }

  spilBuffer(buffer, { type, position, styrke, forkant = 0 }) {
    if (!this.givPlads(type)) return false;
    const c = this.ctx, t = c.currentTime;
    const afstand = Math.hypot(...position.map((v, i) => v - this.kamera[i]));
    const dæmpning = 1 / (1 + afstand * .045 + afstand * afstand * .0008);
    const kilde = c.createBufferSource(), filter = c.createBiquadFilter();
    const gain = c.createGain(), panner = c.createPanner();
    kilde.buffer = buffer;
    kilde.playbackRate.value = type === "puls" ? .97 + Math.random() * .06 : .9 + Math.random() * .2;
    filter.type = "lowpass";
    filter.frequency.value = Math.max(650, 11000 / (1 + afstand * .035));
    filter.Q.value = .65;
    const grundstyrke = type === "puls" ? .95 : type === "brud" ? .4 : .18;
    const varighed = Math.min(buffer.duration - forkant, type === "puls" ? 7 : type === "brud" ? 3.5 : .8);
    const stopTid = t + varighed / kilde.playbackRate.value;
    gain.gain.setValueAtTime(grundstyrke * Math.sqrt(styrke) * dæmpning, t);
    gain.gain.setTargetAtTime(0, Math.max(t, stopTid - .12), .035);
    panner.panningModel = "equalpower";
    panner.distanceModel = "inverse";
    panner.rolloffFactor = 0;
    if (panner.positionX) {
      panner.positionX.value = position[0];
      panner.positionY.value = position[1];
      panner.positionZ.value = position[2];
    } else panner.setPosition(...position);
    kilde.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.ud);
    panner.connect(this.klang);
    const lyd = this.følgKilde(kilde, [kilde, filter, gain, panner], type);
    try {
      kilde.start(t, forkant, varighed);
      kilde.stop(stopTid + .02);
      return true;
    } catch {
      lyd.rens();
      return false;
    }
  }

  // Alle midlertidige knuder fjernes både ved naturlig afslutning og ved nulstilling.
  følgKilde(kilde, knuder, type) {
    const lyd = { type, rens: null };
    let færdig = false;
    lyd.rens = () => {
      if (færdig) return;
      færdig = true;
      kilde.onended = null;
      try {
        kilde.stop();
      } catch { /* Kilden kan allerede være afsluttet. */ }
      for (const knude of knuder) {
        try {
          knude.disconnect();
        } catch { /* En afbrudt kontekst må gerne være lydløs. */ }
      }
      this.aktive.delete(lyd);
    };
    kilde.onended = lyd.rens;
    this.aktive.add(lyd);
    return lyd;
  }

  // Et diskret klik kan bruges til valg og nedtælling uden at hente endnu en fil.
  klik() {
    const c = this.ctx;
    if (!c || c.state !== "running" || !this.lyd || this.afsluttet || !this.givPlads("kontakt")) return;
    const kilde = c.createOscillator(), gain = c.createGain(), t = c.currentTime;
    kilde.type = "sine";
    kilde.frequency.value = 760;
    gain.gain.setValueAtTime(.05, t);
    gain.gain.exponentialRampToValueAtTime(.0001, t + .07);
    kilde.connect(gain);
    gain.connect(this.ud);
    const lyd = this.følgKilde(kilde, [kilde, gain], "kontakt");
    try {
      kilde.start(t);
      kilde.stop(t + .08);
    } catch {
      lyd.rens();
    }
  }

  stop() {
    this.generation++;
    for (const lyd of [...this.aktive]) lyd.rens();
    this.ventetider.clear();
  }

  frigiv() {
    if (this.afsluttet) return;
    this.afsluttet = true;
    this.stop();
    for (const job of this.kø.splice(0)) job.løs(null);
    for (const afbryd of this.hentninger) afbryd.abort();
    for (const knude of this.fælles) {
      try {
        knude.disconnect();
      } catch { /* Lyden er allerede lukket. */ }
    }
    this.buffere.clear();
    try {
      this.ctx?.close()?.catch(() => {});
    } catch { /* Lukning må ikke forhindre at forlade spillet. */ }
  }
}
