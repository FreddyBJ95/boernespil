// ===== Lyden: rigtige optagelser af sprængninger, sammenstyrtninger, glas og ild =====
// Optagelserne er fra Freesound (alle CC0, se lyde/KILDER.md). Hver lyd placeres i verdenen:
// langt væk bliver den svagere og mere dump, og den kommer senere end glimtet (lyden går 343 m i sekundet).
// En kompressor til sidst sørger for, at en lang kædereaktion ikke "knækker" i højttalerne.

import { mobil } from "./enhed.js";

const FILER = ["tnt", "bjerg", "mine", "minesprengning", "dynamit", "knald", "fjern", "stor", "kontrolleret", "styrt_kort", "styrt", "traehus",
  "nedrivning", "brokker_stor", "brokker", "stenskred", "beton", "slag", "glas_fald", "glas", "glas2", "metal_fald", "metal", "trae_knaek", "ild", "gas", "horn",
  "plask", "raket", "floejt", "fyrvaerkeri", "lavine", "sneskred", "jordskred", "gnist"];
// Udsnit af optagelser med flere slag i (start, længde i sekunder)
const UDSNIT = { beton: [[0.15, 1.4], [1.9, 1.5], [4.85, 1.6]], fyrvaerkeri: [[1.15, 1.8], [3.9, 1.6], [5.65, 1.4], [6.95, 1.5], [9.35, 1.6]] };
const vælg = l => l[Math.floor(Math.random() * l.length)];

export class Lyd {
  constructor(mappe = "lyde/") {
    this.mappe = mappe; this.ctx = null; this.b = {}; this.slået = false; this.sidst = {}; this.stemmer = 0; this.løkker = {};
    this.lytter = { p: { x: 0, y: 0, z: 0 }, højre: { x: 1, y: 0, z: 0 } };
  }
  // Skal kaldes fra et tryk (iPad kræver det, før der må komme lyd)
  async start() {
    if (this.ctx) { if (this.ctx.state !== "running") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // På en tablet: 32 000 prøver i sekundet og mono — lydene fylder så en tredjedel i hukommelsen
    let c;
    try { c = mobil ? new AC({ sampleRate: 32000 }) : new AC(); } catch (_) { c = new AC(); }
    this.ctx = c;
    this.komp = c.createDynamicsCompressor();
    this.komp.threshold.value = -16; this.komp.knee.value = 10; this.komp.ratio.value = 5; this.komp.attack.value = 0.004; this.komp.release.value = 0.3;
    this.hoved = c.createGain(); this.hoved.gain.value = this.slået ? 0 : 0.9;
    this.komp.connect(this.hoved); this.hoved.connect(c.destination);
    // ekko fra omgivelserne (en kunstig rumklang: støj, der dør ud over 2,5 sekunder)
    this.rum = c.createConvolver(); this.rum.buffer = this.rumklang(2.6);
    this.rumNiveau = c.createGain(); this.rumNiveau.gain.value = 0.35;
    this.rum.connect(this.rumNiveau); this.rumNiveau.connect(this.komp);
    const hent = async navn => {
      try {
        const data = await fetch(this.mappe + navn + ".mp3").then(s => s.arrayBuffer());
        const b = await new Promise((ok, fejl) => c.decodeAudioData(data, ok, fejl));
        this.b[navn] = mobil ? this.mono(b) : b;
      } catch (_) { /* lyden mangler: spillet kører videre uden */ }
    };
    if (mobil) for (const navn of FILER) await hent(navn);           // én ad gangen, så hukommelsen ikke topper
    else await Promise.all(FILER.map(hent));
    for (const navn of ["ild", "gas", "lavine", "gnist"]) if (this.b[navn]) this.b[navn] = this.løkkebar(this.b[navn], 0.6);
  }
  // To kanaler bliver til én (stereo fra panoreringen kommer alligevel bagefter)
  mono(buf) {
    if (buf.numberOfChannels < 2) return buf;
    const ud = this.ctx.createBuffer(1, buf.length, buf.sampleRate), d = ud.getChannelData(0);
    const a = buf.getChannelData(0), b = buf.getChannelData(1);
    for (let i = 0; i < d.length; i++) d[i] = (a[i] + b[i]) * 0.5;
    return ud;
  }
  rumklang(sek) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sek), b = c.createBuffer(2, n, c.sampleRate);
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k);
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4) * (t < 0.012 ? t / 0.012 : 1);
      }
      for (const [t, a] of [[0.09, 0.5], [0.23, 0.35], [0.41, 0.25]]) {               // ekkoer fra bygningerne rundt om
        const i0 = Math.floor((t + k * 0.013) * c.sampleRate);
        for (let i = 0; i < 400 && i0 + i < n; i++) d[i0 + i] += (Math.random() * 2 - 1) * a * (1 - i / 400);
      }
    }
    return b;
  }
  // Lav en løkke uden klik: enden blændes over i starten
  løkkebar(buf, sek) {
    const c = this.ctx, x = Math.floor(sek * buf.sampleRate), n = buf.length - x;
    const ud = c.createBuffer(buf.numberOfChannels, n, buf.sampleRate);
    for (let k = 0; k < buf.numberOfChannels; k++) {
      const a = buf.getChannelData(k), b = ud.getChannelData(k);
      for (let i = 0; i < n; i++) b[i] = i < x ? a[i] * (i / x) + a[n + i] * (1 - i / x) : a[i];
    }
    return ud;
  }
  slå(av) {
    this.slået = av;
    if (this.hoved) this.hoved.gain.setTargetAtTime(av ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }
  sætLytter(p, højre) { this.lytter.p = p; this.lytter.højre = højre; }

  // Spil en optagelse et sted i verdenen
  // o: { p, styrke, tone, start, længde, rum, udenForsinkelse }
  spil(navn, o = {}) {
    const c = this.ctx, buf = this.b[navn];
    if (!c || !buf || this.slået) return null;
    if (this.stemmer > 28) return null;
    let afstand = 8, pan = 0;
    if (o.p) {
      const dx = o.p.x - this.lytter.p.x, dy = o.p.y - this.lytter.p.y, dz = o.p.z - this.lytter.p.z;
      afstand = Math.hypot(dx, dy, dz);
      pan = Math.max(-0.85, Math.min(0.85, (dx * this.lytter.højre.x + dz * this.lytter.højre.z) / Math.max(4, afstand)));
    }
    const nu = c.currentTime + (o.udenForsinkelse ? 0 : afstand / 343) + (o.efter ?? 0);
    const kilde = c.createBufferSource(); kilde.buffer = buf;
    kilde.playbackRate.value = (o.tone ?? 1) * (0.94 + Math.random() * 0.12);
    const filter = c.createBiquadFilter(); filter.type = "lowpass";
    filter.frequency.value = Math.max(500, 19000 * Math.exp(-afstand / (o.rækkevidde ?? 110)));
    const g = c.createGain();
    g.gain.value = (o.styrke ?? 1) / (1 + afstand / (o.rækkevidde ?? 30));
    const p = c.createStereoPanner ? c.createStereoPanner() : null;
    if (p) p.pan.value = pan;
    kilde.connect(filter); filter.connect(g);
    (p ? (g.connect(p), p) : g).connect(this.komp);
    const send = c.createGain(); send.gain.value = Math.min(0.9, (o.rum ?? 0.25) * (0.5 + afstand / 60));
    g.connect(send); send.connect(this.rum);
    kilde.start(nu, o.start ?? 0, o.længde);
    this.stemmer++;
    kilde.onended = () => { this.stemmer--; kilde.disconnect(); g.disconnect(); send.disconnect(); };
    return kilde;
  }
  // Hvor ofte en slags lyd højst må spilles
  må(slags, pause) {
    const t = performance.now();
    if (t - (this.sidst[slags] || 0) < pause * 1000) return false;
    this.sidst[slags] = t; return true;
  }

  // ---------- Lydene i spillet ----------
  eksplosion(p, W, art = "høj") {
    if (!this.må("eksplosion", 0.055)) return;
    const S = Math.cbrt(W), afstand = Math.hypot(p.x - this.lytter.p.x, p.z - this.lytter.p.z);
    let navn;
    if (afstand > 160) navn = "fjern";
    else if (art !== "høj") navn = W > 12 ? vælg(["stor", "bjerg"]) : vælg(["stor", "kontrolleret"]);
    else if (W > 12) navn = vælg(["mine", "bjerg"]);
    else if (W > 3) navn = vælg(["tnt", "minesprengning", "bjerg"]);
    else if (W > 0.8) navn = vælg(["dynamit", "tnt", "kontrolleret"]);
    else navn = vælg(["knald", "dynamit"]);
    this.spil(navn, { p, styrke: 0.55 + 0.35 * S, tone: 1.08 - Math.min(0.25, S * 0.07), rækkevidde: 45 + 20 * S, rum: 0.3 });
    if (W > 6 && afstand < 160) this.spil("fjern", { p, styrke: 0.5, tone: 0.8, efter: 0.05, rækkevidde: 80, rum: 0.6 });   // dyb rumlen bagefter
    if (art !== "høj" && W > 2) this.spil("stor", { p, styrke: 0.35, tone: 0.7, efter: 0.12, rækkevidde: 60 });
  }
  styrt(p, masse) {
    if (masse > 40000) { if (this.må("styrt", 0.9)) this.spil(vælg(["styrt", "nedrivning", "stenskred"]), { p, styrke: 1.1, rækkevidde: 60, rum: 0.35 }); }
    else if (masse > 6000) { if (this.må("styrtM", 0.35)) this.spil(vælg(["brokker_stor", "styrt_kort", "styrt"]), { p, styrke: 0.8, rækkevidde: 40 }); }
    else if (masse > 600) { if (this.må("styrtS", 0.12)) this.spil(vælg(["brokker", "brokker_stor"]), { p, styrke: 0.45, tone: 1.1, rækkevidde: 28 }); }
  }
  knus(p, lyd, vol) {
    if (lyd === "sne") { if (this.må("sne", 0.25)) this.spil("sneskred", { p, start: Math.random() * 2.5, længde: 1.6, styrke: 0.35 + Math.min(0.4, vol * 0.05), tone: 0.8, rækkevidde: 40 }); return; }
    if (lyd === "sten") { if (this.må("sten", 0.12)) this.spil(vælg(["stenskred", "brokker_stor", "brokker"]), { p, styrke: 0.5 + Math.min(0.4, vol * 0.05), tone: 0.85, rækkevidde: 40 }); return; }
    if (lyd === "metal") { if (this.må("metal", 0.15)) this.spil(vol > 0.3 ? "metal_fald" : "metal", { p, styrke: 0.6, rækkevidde: 30 }); return; }
    if (lyd === "træ") { if (this.må("træ", 0.15)) this.spil(vol > 1 ? "traehus" : "trae_knaek", { p, styrke: 0.7, rækkevidde: 30 }); return; }
    if (!this.må("beton", 0.07)) return;
    const [start, længde] = vælg(UDSNIT.beton);
    this.spil("beton", { p, start, længde, styrke: 0.35 + Math.min(0.6, vol * 0.3), tone: vol > 1 ? 0.8 : 1.05, rækkevidde: 30 });
  }
  slag(p, lyd, styrke) {
    if (!this.må("slag" + lyd, lyd === "metal" ? 0.09 : 0.05)) return;
    if (lyd === "metal") this.spil("metal", { p, styrke: 0.25 * styrke, tone: 1.2, rækkevidde: 20 });
    else if (lyd === "træ") this.spil("trae_knaek", { p, styrke: 0.2 * styrke, tone: 1.3, rækkevidde: 20 });
    else this.spil("slag", { p, styrke: 0.35 * styrke, tone: 0.9 + Math.random() * 0.3, rækkevidde: 20 });
  }
  glas(p) { if (this.må("glas", 0.06)) this.spil(vælg(["glas", "glas2", "glas_fald"]), { p, styrke: 0.45, rækkevidde: 25 }); }
  // Fyrværkeri: raketten suser op (af og til med fløjt), og braget og knitren deroppe
  raket(p) { if (this.må("raket", 0.08)) this.spil(Math.random() < 0.35 ? "floejt" : "raket", { p, styrke: 0.45, tone: 0.9 + Math.random() * 0.25, rækkevidde: 40 }); }
  fyrværkeriBrag(p) {
    if (!this.må("fyrbrag", 0.07)) return;
    const [start, længde] = vælg(UDSNIT.fyrvaerkeri);
    this.spil("fyrvaerkeri", { p, start, længde, styrke: 0.7, tone: 0.9 + Math.random() * 0.2, rækkevidde: 70, rum: 0.5 });
  }
  plask(p, vol) { if (this.må("plask", 0.12)) this.spil("plask", { p, styrke: 0.4 + Math.min(0.6, vol * 0.08), tone: vol > 4 ? 0.75 : 1.05, rækkevidde: 40 }); }
  // Et skred begynder: dybt drøn fra sne eller sten
  skred(p, sne) { if (this.må("skred", 4)) this.spil(sne ? "sneskred" : "jordskred", { p, styrke: 1, tone: sne ? 0.75 : 0.9, rækkevidde: 90, rum: 0.5 }); }
  termit(p) { this.spil("gnist", { p, styrke: 1.2, tone: 1.3, længde: 2.8, rækkevidde: 30 }); this.spil("ild", { p, styrke: 0.5, tone: 1.6, længde: 2.8, rækkevidde: 30 }); }
  horn() { this.spil("horn", { styrke: 0.6, udenForsinkelse: true, rum: 0.5 }); }
  // Et lille mekanisk klik (når noget sættes på plads) — laves direkte, uden optagelse
  klik(høj = 1) {
    const c = this.ctx; if (!c || this.slået) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "square"; o.frequency.setValueAtTime(1800 * høj, c.currentTime); o.frequency.exponentialRampToValueAtTime(600 * høj, c.currentTime + 0.04);
    g.gain.setValueAtTime(0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06);
    o.connect(g); g.connect(this.komp); o.start(); o.stop(c.currentTime + 0.07);
  }
  // Løkker: ild og gas, der suser. styrke 0 = stille
  løkke(navn, styrke, p = null, kilde = navn, tone = 1) {
    const c = this.ctx; if (!c || !this.b[kilde]) return;
    let l = this.løkker[navn];
    if (!l) {
      const k = c.createBufferSource(); k.buffer = this.b[kilde]; k.loop = true; k.playbackRate.value = tone;
      const g = c.createGain(); g.gain.value = 0;
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      k.connect(g); (pan ? (g.connect(pan), pan) : g).connect(this.komp); k.start();
      l = this.løkker[navn] = { k, g, pan };
    }
    let s = styrke;
    if (p) {
      const dx = p.x - this.lytter.p.x, dz = p.z - this.lytter.p.z, a = Math.hypot(dx, p.y - this.lytter.p.y, dz);
      s = styrke / (1 + a / 18);
      if (l.pan) l.pan.pan.setTargetAtTime(Math.max(-0.8, Math.min(0.8, (dx * this.lytter.højre.x + dz * this.lytter.højre.z) / Math.max(4, a))), c.currentTime, 0.1);
    }
    l.g.gain.setTargetAtTime(this.slået ? 0 : Math.min(1, s), c.currentTime, 0.15);
  }
  stopLøkker() { for (const l of Object.values(this.løkker)) l.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); }
}
