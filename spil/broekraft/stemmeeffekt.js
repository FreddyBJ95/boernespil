// ===== Sjove stemmer til walkie-talkien =====
// Mikrofonen går gennem én lille lydgraf med fem veje: normal, mus, løve, robot og spøgelse.
// Man skifter stemme ved at skrue op for én vej og ned for de andre. Udgangen (ét lydspor)
// er den samme hele tiden, så forbindelserne til de andre tablets ikke skal laves om (se stemmer.js).

export const STEMMER = [
  { id: "normal", ikon: "🙂", navn: "Min stemme" },
  { id: "mus", ikon: "🐭", navn: "Mus" },
  { id: "løve", ikon: "🦁", navn: "Løve" },
  { id: "robot", ikon: "🤖", navn: "Robot" },
  { id: "spøgelse", ikon: "👻", navn: "Spøgelse" },
];
export const stemmeAf = id => STEMMER.find(s => s.id === id) || STEMMER[0];

// Lysere eller dybere stemme uden at tale hurtigere: to forsinkelser glider hele tiden og skiftes
// blødt ud, lige når de springer tilbage. faktor 1,6 = lys mus · 0,65 = dyb løve.
export function tonehøjde(ac, faktor, vindue) {
  const ind = ac.createGain(), ud = ac.createGain();
  const n = Math.round(vindue / Math.abs(1 - faktor) * ac.sampleRate);   // én glidning
  const rampe = ac.createBuffer(1, n, ac.sampleRate), fade = ac.createBuffer(1, n, ac.sampleRate);
  const r = rampe.getChannelData(0), f = fade.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const fase = i / n;
    r[i] = (faktor > 1 ? 1 - fase : fase) * vindue;           // kortere forsinkelse = lysere, længere = dybere
    f[i] = Math.sin(Math.PI * fase) ** 2;                       // stille præcis når forsinkelsen springer
  }
  const start = ac.currentTime + 0.05;
  for (const forskud of [0, n / 2 / ac.sampleRate]) {           // to hoveder, et halvt skridt forskudt
    const d = ac.createDelay(vindue + 0.02), g = ac.createGain();
    d.delayTime.value = 0; g.gain.value = 0;
    const styrR = ac.createBufferSource(), styrF = ac.createBufferSource();
    styrR.buffer = rampe; styrF.buffer = fade; styrR.loop = styrF.loop = true;
    styrR.connect(d.delayTime); styrF.connect(g.gain);
    styrR.start(start, forskud); styrF.start(start, forskud);
    ind.connect(d); d.connect(g); g.connect(ud);
  }
  return { ind, ud };
}

const filter = (ac, type, frekvens) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = frekvens; return f; };
const forstærk = (ac, v) => { const g = ac.createGain(); g.gain.value = v; return g; };
const kæde = (...noder) => { for (let i = 0; i < noder.length - 1; i++) noder[i].connect(noder[i + 1]); return noder.at(-1); };

export class Stemmegraf {
  constructor(ac) {
    this.ac = ac;
    this.indgang = forstærk(ac, 1);                              // mikrofonen kobles på her
    this.udgang = ac.createMediaStreamDestination();
    const komp = ac.createDynamicsCompressor();                  // jævn lydstyrke, også når barnet råber
    komp.threshold.value = -24; komp.ratio.value = 4;
    kæde(komp, forstærk(ac, 1.6), this.udgang);
    this.veje = {};
    const vej = (navn, ud) => { const g = forstærk(ac, 0); ud.connect(g); g.connect(komp); this.veje[navn] = g; };

    vej("normal", this.indgang);

    // 🐭 Mus: meget lys og pibende
    const mus = tonehøjde(ac, 1.6, 0.05);
    this.indgang.connect(mus.ind);
    vej("mus", kæde(mus.ud, filter(ac, "highpass", 250)));

    // 🦁 Løve: dyb og brummende
    const løve = tonehøjde(ac, 0.65, 0.07);
    this.indgang.connect(løve.ind);
    vej("løve", kæde(løve.ud, filter(ac, "lowpass", 3200), forstærk(ac, 1.3)));

    // 🤖 Robot: stemmen ganges med en dyb tone (ringmodulation) og får en metallisk klang
    const ring = forstærk(ac, 0), bære = ac.createOscillator();
    bære.frequency.value = 50; bære.connect(ring.gain); bære.start();
    this.indgang.connect(ring);
    const kam = ac.createDelay(0.05), tilbage = forstærk(ac, 0.55), robot = forstærk(ac, 1.8);
    kam.delayTime.value = 0.009;
    ring.connect(kam); kam.connect(tilbage); tilbage.connect(kam);
    ring.connect(robot); kam.connect(robot);
    vej("robot", robot);

    // 👻 Spøgelse: lidt lysere, bølgende og med ekko
    const lys = tonehøjde(ac, 1.2, 0.08), bølge = forstærk(ac, 0.75), lfo = ac.createOscillator(), dybde = forstærk(ac, 0.25);
    lfo.frequency.value = 5; lfo.connect(dybde); dybde.connect(bølge.gain); lfo.start();
    this.indgang.connect(lys.ind); lys.ud.connect(bølge);
    const ekko = ac.createDelay(1), dæmpet = filter(ac, "lowpass", 2500), igen = forstærk(ac, 0.45), spøgelse = forstærk(ac, 1);
    ekko.delayTime.value = 0.28;
    bølge.connect(ekko); ekko.connect(dæmpet); dæmpet.connect(igen); igen.connect(ekko);
    bølge.connect(spøgelse); dæmpet.connect(spøgelse);
    vej("spøgelse", spøgelse);

    this.sæt("normal");
  }
  get strøm() { return this.udgang.stream; }
  // Skift stemme blødt (ingen klik)
  sæt(navn) {
    const valgt = this.veje[navn] ? navn : "normal";
    for (const [n, g] of Object.entries(this.veje)) g.gain.setTargetAtTime(n === valgt ? 1 : 0, this.ac.currentTime, 0.03);
  }
  // Mikrofonen ind og ud af grafen — udgangen bliver den samme
  tilslut(mikrofon) { this.frakobl(); this.kilde = this.ac.createMediaStreamSource(mikrofon); this.kilde.connect(this.indgang); }
  frakobl() { this.kilde?.disconnect(); this.kilde = null; }
}
