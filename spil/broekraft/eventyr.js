// ===== Eventyret i Den uendelige verden: spådamen, opgaverne, guldet, butikken og guldkisten =====
// Spådamen bor i et telt ved pladsen derhjemme (og i hver landsby). Tryk på hende, så læser hun en
// opgave højt og tydeligt — og viser den med store billeder. Når opgaven er klaret, regner det med guld.
// Guldet kan bruges i butikken (kæledyr, der følger efter én, en pony med sadel, hatte, et lille hus,
// fyrværkeri og blokke af glimmerguld, regnbuelys og hjerter)
// og ses i guldkisten på pladsen. De store opgaver er de seks magiske sten (sten.js).

import * as THREE from "./three.js";
import { HJEMSTED } from "./uendelig.js";

// ---------- Opgaverne: små og til at forstå for 3–6-årige ----------
export const OPGAVER = [
  { id: "blomst", ikon: "🌷", mål: 3, guld: 5, tekst: "Kan du plukke tre blomster til mig? Slå dem med hammeren." },
  { id: "klap:faar", ikon: "🐑", mål: 3, guld: 6, tekst: "Kan du give tre får et klap? Tryk på dem. De bor i forårslandet." },
  { id: "rid:hest", ikon: "🐴", mål: 1, guld: 8, tekst: "Kan du ride en tur på en hest? Tryk på en hest for at sætte dig op." },
  { id: "tårn", ikon: "🧱", mål: 1, guld: 6, tekst: "Kan du bygge et tårn, der er fem blokke højt?" },
  { id: "snemand", ikon: "⛄", mål: 1, guld: 10, tekst: "Kan du bygge en snemand? To sneblokke og et græskar øverst!" },
  { id: "pingvin", ikon: "🐧", mål: 1, guld: 8, tekst: "Kan du finde en pingvin? De bor i vinterlandet mod nord." },
  { id: "bjerg", ikon: "⛰️", mål: 1, guld: 10, tekst: "Kan du klatre op på et højt bjerg — helt op, hvor sneen ligger?" },
  { id: "kiste", ikon: "💰", mål: 1, guld: 12, tekst: "Kan du finde en skattekiste? Der er en i hvert kæmpetræ og i krystalgrotterne i bjergene." },
  { id: "tog", ikon: "🚂", mål: 1, guld: 6, tekst: "Kan du køre en tur med toget? Trappen op til stationen er lige ved pladsen." },
  { id: "ballon", ikon: "🎈", mål: 1, guld: 6, tekst: "Kan du flyve en tur i luftballonen? Den står ved pladsen." },
  { id: "landsby", ikon: "🏘️", mål: 1, guld: 10, tekst: "Kan du finde en landsby? Kig på kortet, når du går på opdagelse." },
  { id: "græskar", ikon: "🎃", mål: 3, guld: 8, tekst: "Kan du finde tre græskar i efterårslandet mod øst? Slå dem med hammeren." },
  { id: "dino", ikon: "🦕", mål: 1, guld: 15, tekst: "Kan du finde en dinosaur? De bor i junglen langt mod syd. Pas på de hurtige!" },
  { id: "fyrværkeri", ikon: "🎆", mål: 1, guld: 6, giv: "Fyrværkeri", tekst: "Kan du tænde et fyrværkeri? Jeg har givet dig en fyrværkeri-kasse. Sæt den på jorden, og slå på den med hammeren!" },
  { id: "jordbær", ikon: "🍓", mål: 3, guld: 6, tekst: "Kan du plukke tre jordbær? De gror i sommerlandet mod syd. Slå dem med hammeren." },
  { id: "is", ikon: "🍦", mål: 1, guld: 8, tekst: "Kan du finde en isbod og hente en is? Isboderne står ved strandene i sommerlandet mod syd. Slå på isen med hammeren." },
  { id: "pindsvin", ikon: "🦔", mål: 1, guld: 8, tekst: "Kan du finde et pindsvin? Det tripper rundt i efterårsskoven mod øst." },
  { id: "egern", ikon: "🐿️", mål: 1, guld: 8, tekst: "Kan du finde et egern? Det hopper rundt mellem de røde og gule træer mod øst." },
];

// ---------- Butikken ----------
export const VARER = [
  { id: "hund", ikon: "🐶", navn: "Hundehvalp", pris: 15, dyr: "dalmatiner" },
  { id: "kat", ikon: "🐱", navn: "Kattekilling", pris: 15, dyr: "kat" },
  { id: "kanin", ikon: "🐰", navn: "Kanin", pris: 10, dyr: "kanin" },
  { id: "pingvin", ikon: "🐧", navn: "Pingvin", pris: 20, dyr: "pingvin" },
  { id: "enhjorning", ikon: "🦄", navn: "Enhjørning", pris: 40, dyr: "enhjorning" },
  { id: "drage", ikon: "🐉", navn: "Lille drage", pris: 60, dyr: "drage" },
  { id: "pony", ikon: "🐴", navn: "Din egen pony med sadel", pris: 30, dyr: "hest" },
  { id: "hat", ikon: "🎩", navn: "Høj hat til dit dyr", pris: 8, hat: "hat" },
  { id: "sløjfe", ikon: "🎀", navn: "Sløjfe til dit dyr", pris: 8, hat: "sløjfe" },
  { id: "papkrone", ikon: "👑", navn: "Krone til dit dyr", pris: 25, hat: "krone" },
  { id: "hus", ikon: "🏠", navn: "Et lille hus (bygges, hvor du står)", pris: 20, hus: true, igen: true },
  { id: "fyrvaerkeri", ikon: "🎆", navn: "Fyrværkeri-show", pris: 10, show: true, igen: true },
  { id: "glimmerguld", ikon: "✨", navn: "Glimmerguld at bygge med", pris: 12, blok: "Glimmerguld" },
  { id: "regnbuelys", ikon: "🌈", navn: "Regnbuelys at bygge med", pris: 12, blok: "Regnbuelys" },
  { id: "hjerteblok", ikon: "💖", navn: "Hjerteblokke at bygge med", pris: 12, blok: "Hjerteblok" },
];

// ---------- Oplæsning på dansk (tablettens egen stemme) ----------
let stemme = null;
const findStemme = () => { try { stemme = speechSynthesis.getVoices().find(v => /^da/i.test(v.lang)) || null; } catch (_) {} };
if ("speechSynthesis" in window) { findStemme(); speechSynthesis.onvoiceschanged = findStemme; }
export function sig(tekst) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(tekst.replace(/[^\p{L}\p{N}\s.,!?—–-]/gu, ""));
    if (stemme) { u.voice = stemme; u.lang = stemme.lang; } else u.lang = "da-DK";
    u.rate = 0.88; u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch (_) {}
}

// ---------- Figurerne: spådamen og købmanden (af klodser, ligesom dyrene) ----------
const kasse = new THREE.BoxGeometry(1, 1, 1);
function klods(til, b, h, l, farve, x, y, z, mat) {
  const m = new THREE.Mesh(kasse, mat || new THREE.MeshLambertMaterial({ color: farve }));
  m.scale.set(b, h, l); m.position.set(x, y, z); til.add(m);
  return m;
}
function ansigt(til, y, z, skæg) {
  klods(til, 0.62, 0.62, 0.62, "#f1c28d", 0, y, 0);
  for (const s of [-1, 1]) klods(til, 0.09, 0.09, 0.02, "#222", s * 0.14, y + 0.05, z);
  klods(til, 0.2, 0.05, 0.02, "#b5433b", 0, y - 0.14, z);
  if (skæg) klods(til, 0.34, 0.08, 0.04, "#6b4a2b", 0, y - 0.08, z + 0.01);
}
function byggSpådame() {
  const g = new THREE.Group();
  klods(g, 0.95, 0.9, 0.95, "#7b2cbf", 0, 0.45, 0);                       // den lange kjole
  klods(g, 0.7, 0.55, 0.5, "#9d4edd", 0, 1.17, 0);                         // overkroppen
  ansigt(g, 1.76, 0.32);
  klods(g, 0.68, 0.22, 0.68, "#e63946", 0, 2.1, 0);                        // tørklædet
  klods(g, 0.7, 0.4, 0.2, "#e63946", 0, 1.92, -0.26);
  for (const s of [-1, 1]) {
    klods(g, 0.08, 0.08, 0.08, "#ffd23f", s * 0.36, 1.66, 0.05);           // øreringe
    for (let i = 0; i < 4; i++) klods(g, 0.07, 0.07, 0.03, "#ffd23f", -0.24 + i * 0.16, 2.0, 0.35);   // mønter i tørklædet
  }
  const arme = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 0.45, 1.36, 0.05); klods(a, 0.2, 0.55, 0.2, "#9d4edd", 0, -0.22, 0.12); a.rotation.x = -0.9; g.add(a); return a; });
  const bord = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), new THREE.MeshLambertMaterial({ color: "#8a5a30" }));
  bord.position.set(0, 0.95, 0.75); g.add(bord);
  klods(g, 0.1, 0.9, 0.1, "#6b4a2b", 0, 0.47, 0.75);
  const kugleMat = new THREE.MeshBasicMaterial({ color: "#9fe8ff", transparent: true, opacity: 0.75 });
  const kugle = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), kugleMat); kugle.position.set(0, 1.27, 0.75); g.add(kugle);
  const glød = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" })); kugle.add(glød);
  g.userData = { arme, kugle, glød };
  return g;
}
function byggKøbmand() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) klods(g, 0.28, 0.75, 0.3, "#3a4fb0", s * 0.17, 0.38, 0);
  klods(g, 0.72, 0.8, 0.42, "#2a9d8f", 0, 1.15, 0);                        // trøjen
  klods(g, 0.6, 0.72, 0.03, "#f4f0e8", 0, 1.1, 0.22);                      // forklædet
  ansigt(g, 1.86, 0.32, true);
  klods(g, 0.7, 0.14, 0.7, "#e63946", 0, 2.2, 0); klods(g, 0.5, 0.2, 0.5, "#e63946", 0, 2.34, 0);   // huen
  for (const s of [-1, 1]) klods(g, 0.2, 0.7, 0.22, "#2a9d8f", s * 0.46, 1.2, 0);
  g.userData = {};
  return g;
}
// Hatte til kæledyret
function byggHat(slags) {
  const g = new THREE.Group();
  if (slags === "hat") { klods(g, 0.5, 0.05, 0.5, "#1b1b24", 0, 0, 0); klods(g, 0.32, 0.4, 0.32, "#1b1b24", 0, 0.22, 0); klods(g, 0.34, 0.07, 0.34, "#e63946", 0, 0.08, 0); }
  else if (slags === "krone") {
    const guld = new THREE.MeshLambertMaterial({ color: "#ffd23f", emissive: "#6a4a00" });
    klods(g, 0.42, 0.14, 0.42, null, 0, 0.07, 0, guld);
    for (const [x, z] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) klods(g, 0.09, 0.14, 0.09, null, x, 0.2, z, guld);
    klods(g, 0.08, 0.08, 0.08, "#e63946", 0, 0.1, 0.22);
  } else { for (const s of [-1, 1]) klods(g, 0.2, 0.16, 0.08, "#ff5fa2", s * 0.13, 0.05, 0); klods(g, 0.08, 0.08, 0.1, "#e63946", 0, 0.05, 0); }
  return g;
}

// En rød sadel med stigbøjler til ponyen fra butikken (ponyens ryg er 1,22 blok oppe)
function byggSadel() {
  const g = new THREE.Group();
  klods(g, 0.66, 0.05, 0.66, "#3a6fd8", 0, 1.24, 0);                       // sadeldækkenet
  klods(g, 0.5, 0.12, 0.46, "#c0392b", 0, 1.31, -0.02);                    // selve sadlen
  klods(g, 0.5, 0.12, 0.08, "#8e2a20", 0, 1.4, -0.24); klods(g, 0.2, 0.14, 0.08, "#8e2a20", 0, 1.41, 0.2);
  for (const s of [-1, 1]) { klods(g, 0.03, 0.34, 0.03, "#5a3a1a", s * 0.34, 1.08, 0); klods(g, 0.1, 0.04, 0.12, "#c8ccd4", s * 0.34, 0.9, 0); }
  return g;
}

// ---------- Paneler (store knapper, til små fingre) ----------
const STIL = `
.eventyr-panel { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 36; width: min(640px, calc(100vw - 24px));
  max-height: calc(100vh - 24px); overflow-y: auto; display: none; background: #fff8ee; border: 4px solid #7b2cbf; border-radius: 24px;
  padding: 14px 16px 16px; box-shadow: 0 12px 34px #0009; font: 700 20px system-ui, sans-serif; color: #2a1a3a; touch-action: pan-y; }
.eventyr-panel.vis { display: block; }
.eventyr-panel .hoved { display: flex; gap: 12px; align-items: center; }
.eventyr-panel .portræt { font-size: 56px; line-height: 1; }
.eventyr-panel .tale { font-size: 21px; line-height: 1.35; }
.eventyr-panel .opgave { margin: 12px auto 4px; text-align: center; font-size: 54px; letter-spacing: 6px; }
.eventyr-panel .opgave small { display: block; font-size: 22px; letter-spacing: 0; }
.eventyr-panel .knapper { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 10px; }
.eventyr-panel button { font: 800 21px system-ui, sans-serif; padding: 12px 16px; border-radius: 16px; border: 3px solid #0002; background: #ffd84d; color: #2a1a3a; }
.eventyr-panel button.anden { background: #e6dcff; }
.eventyr-panel button:disabled { opacity: 0.45; }
.eventyr-panel .varer { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: 10px; }
.eventyr-panel .vare { background: #fff; border: 3px solid #e6dcff; border-radius: 16px; padding: 8px; text-align: center; }
.eventyr-panel .vare .ikon { font-size: 40px; }
.eventyr-panel .vare .navn { font-size: 16px; min-height: 40px; }
.eventyr-panel .guldbunke { text-align: center; font-size: 30px; line-height: 1.2; margin: 8px 0; word-break: break-all; }
.eventyr-panel .sten { display: flex; gap: 10px; justify-content: center; font-size: 34px; margin: 8px 0; }
.eventyr-panel .sten span { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; background: #0001; }
#guldTæller { position: fixed; top: 10px; right: 10px; z-index: 6; display: none; gap: 8px; align-items: center; }
.i-gang.uendelig #guldTæller, .i-gang.guldslot #guldTæller { display: flex; }
#guldTæller .pille { background: #0008; color: #fff; font: 800 20px system-ui, sans-serif; padding: 8px 14px; border-radius: 18px; border: 2px solid #ffd84d; }
#guldTæller .pille.opgave { border-color: #c77dff; cursor: pointer; }
#guldTæller .pille.hop { animation: guldHop 0.6s ease-out; }
@keyframes guldHop { 40% { transform: scale(1.35); } }
`;

export class Eventyr {
  // s: { scene, sp, dyr, nytDyr(def, x, y, z), dyrDef(id), land, lyd, besked, fest(x, y), konfetti(), guldRegn(),
  //      bygHus(x, y, z), fyrværkeriShow(), givBlok(navn) → lægger blokken i hotbaren, sten: { mangler() → næste sten eller null, fundet() → [..], rejsTil(sten) } }
  constructor(s) {
    this.s = s;
    this.gem = this.læs();
    this.figurer = [];                              // spådamer og købmanden, der står i nærheden
    this.nuværende = null;
    const st = document.createElement("style"); st.textContent = STIL; document.head.appendChild(st);
    this.panel = document.createElement("div"); this.panel.className = "eventyr-panel";
    this.panel.addEventListener("pointerdown", e => e.stopPropagation());
    document.body.appendChild(this.panel);
    this.tæller = document.createElement("div"); this.tæller.id = "guldTæller";
    this.tæller.innerHTML = `<div class="pille opgave" hidden></div><div class="pille guld">💰 0</div>`;
    this.tæller.querySelector(".opgave").addEventListener("click", () => this.visOpgave(true));
    document.body.appendChild(this.tæller);
    this.opdaterTæller();
    if (s.hjem !== false) this.lavHjem();          // i guldslottet står spådamen i slotsgården i stedet
    this.tjekTid = 0; this.landsbyTid = 0;
    this.spawnKæledyr();
  }
  læs() {
    let g = null;
    try { g = JSON.parse(localStorage.getItem("broekraft-eventyr") || "null"); } catch (_) {}
    return Object.assign({ guld: 0, opgave: null, klaret: [], ejer: [], kæledyr: null, hat: null, klaretAntal: 0 }, g || {});
  }
  gemNu() { try { localStorage.setItem("broekraft-eventyr", JSON.stringify(this.gem)); } catch (_) {} }
  opdaterTæller(hop) {
    const g = this.tæller.querySelector(".guld"), o = this.tæller.querySelector(".opgave");
    g.textContent = `${this.s.krone?.() ? "👑 " : ""}💰 ${this.gem.guld}`;
    if (hop) { g.classList.remove("hop"); void g.offsetWidth; g.classList.add("hop"); }
    const op = this.gem.opgave && OPGAVER.find(x => x.id === this.gem.opgave.id);
    o.hidden = !op;
    if (op) o.textContent = this.gem.opgave.færdig ? "🔮 ✅" : `🔮 ${op.ikon} ${this.gem.opgave.tæl}/${op.mål}`;
  }

  // ---------- figurerne ----------
  lavHjem() {
    const h = HJEMSTED.spådame, b = HJEMSTED.butik;
    this.figur("spådame", h.x + 0.5, h.y, h.z + 0.5, -Math.PI / 2, true);
    this.figur("købmand", b.x + 0.5, b.y, b.z + 0.5, Math.PI / 2, true);
  }
  figur(slags, x, y, z, vend, fast, nøgle) {
    const m = slags === "spådame" ? byggSpådame() : byggKøbmand();
    m.position.set(x, y, z); m.rotation.y = vend;
    m.userData.slags = slags; m.userData.fast = fast; m.userData.nøgle = nøgle;
    this.s.scene.add(m); this.figurer.push(m);
    return m;
  }
  // spådamerne i landsbyerne dukker op, når man kommer i nærheden
  opdaterLandsbyer() {
    const p = this.s.sp.pos, nær = this.s.land.landsbyer(p.x - 120, p.z - 120, p.x + 120, p.z + 120);
    const nøgler = new Set(nær.map(l => `${l.x},${l.z}`));
    for (const m of [...this.figurer]) if (!m.userData.fast && !nøgler.has(m.userData.nøgle)) { this.s.scene.remove(m); this.figurer.splice(this.figurer.indexOf(m), 1); }
    for (const l of nær) {
      const n = `${l.x},${l.z}`, t = l.huse.find(h => h.telt);
      if (!t || this.figurer.some(m => m.userData.nøgle === n)) continue;
      this.figur("spådame", t.x + 0.5, t.h + 1, t.z + 0.5, Math.atan2(t.dør[0], t.dør[1]), false, n);
    }
    if (nær.some(l => Math.hypot(p.x - l.x, p.z - l.z) < 22)) this.hændelse("landsby");
  }
  // Rammer strålen en af figurerne?
  tryk(ray) {
    let bedst = null;
    for (const m of this.figurer) {
      const h = ray.intersectObject(m, true)[0];
      if (h && h.distance < 9 && (!bedst || h.distance < bedst.d)) bedst = { m, d: h.distance };
    }
    if (!bedst) return false;
    if (bedst.m.userData.slags === "spådame") this.talMedSpådamen(); else this.visButik();
    return true;
  }

  // ---------- spådamen ----------
  talMedSpådamen() {
    this.s.lyd.magi();
    const g = this.gem, op = g.opgave && OPGAVER.find(x => x.id === g.opgave.id);
    if (op && g.opgave.færdig) { this.belønning(op); return; }
    if (op) { this.visOpgave(true, "Du er i gang med en opgave. "); return; }
    // en ny opgave — efter et par små opgaver fortæller hun om de magiske sten
    const næsteSten = this.s.sten.mangler();
    if (næsteSten && g.klaretAntal % 3 === 2) { this.fortælOmSten(næsteSten); return; }   // efter hver anden lille opgave
    const muligt = OPGAVER.filter(x => !g.klaret.slice(-4).includes(x.id));
    const ny = muligt[Math.floor(Math.random() * muligt.length)];
    g.opgave = { id: ny.id, tæl: 0, færdig: false };
    if (ny.giv) this.s.givBlok(ny.giv);
    this.gemNu(); this.opdaterTæller();
    this.visOpgave(true, "Hej med dig! Jeg har en opgave til dig. ");
  }
  visOpgave(læsHøjt, før = "") {
    const g = this.gem, op = g.opgave && OPGAVER.find(x => x.id === g.opgave.id);
    if (!op) return;
    const tekst = før + op.tekst;
    this.visPanel(`<div class="hoved"><div class="portræt">🔮</div><div class="tale">${tekst}</div></div>
      <div class="opgave">${op.ikon.repeat(Math.min(op.mål, 5))}<small>${g.opgave.tæl} af ${op.mål} · 💰 ${op.guld} guld</small></div>
      <div class="knapper"><button data-k="hør">🔊 Hør igen</button><button data-k="ok">👍 Ja!</button></div>`,
      { hør: () => sig(tekst), ok: () => this.lukPanel() });
    if (læsHøjt) sig(tekst);
  }
  fortælOmSten(sten) {
    const antal = this.s.sten.fundet().length;
    const tekst = `${antal ? `Du har fundet ${antal} af de seks magiske sten!` : "Der findes seks magiske sten."} ${sten.ikon} ${sten.navn} ligger i ${sten.verden} — ${sten.hvor}. Vil du rejse derhen og finde den?`;
    this.visPanel(`<div class="hoved"><div class="portræt">🔮</div><div class="tale">${tekst}</div></div>
      <div class="sten">${this.s.sten.alle().map(x => `<span>${this.s.sten.fundet().includes(x.id) ? x.ikon : "❔"}</span>`).join("")}</div>
      <div class="knapper"><button data-k="hør">🔊 Hør igen</button><button data-k="rejs">🌀 Rejs derhen!</button><button class="anden" data-k="senere">Senere</button></div>`,
      { hør: () => sig(tekst), rejs: () => { this.lukPanel(); this.s.sten.rejsTil(sten); }, senere: () => this.lukPanel() });
    sig(tekst);
    this.gem.klaretAntal++; this.gemNu();
  }
  belønning(op) {
    const g = this.gem;
    g.guld += op.guld; g.klaret.push(op.id); g.klaretAntal++; g.opgave = null;
    this.gemNu(); this.opdaterTæller(true);
    const tekst = `Godt klaret! Du får ${op.guld} guldmønter!`;
    this.visPanel(`<div class="hoved"><div class="portræt">🔮</div><div class="tale">${tekst}</div></div>
      <div class="guldbunke">${"🪙".repeat(Math.min(op.guld, 20))}</div>
      <div class="knapper"><button data-k="ok">🥳 Tak!</button></div>`, { ok: () => this.lukPanel() });
    sig(tekst);
    this.s.lyd.guld(); this.s.guldRegn(); this.s.fest();
  }
  // Guld fra en skattekiste
  fåGuld(n) { this.gem.guld += n; this.gemNu(); this.opdaterTæller(true); }
  // Barnet står af sit kæledyr (når man har redet på det): så er det stadig ens kæledyr
  stegAf(d) {
    if (d.def.id !== this.gem.kæledyr || (this.kæledyr && this.s.dyr.includes(this.kæledyr))) return;
    this.kæledyr = d; d.følg = this.s.sp.pos; d.kæledyr = true; this.sætHat();
  }
  // Noget er sket i verdenen: tæller det med i opgaven?
  hændelse(navn, n = 1) {
    const g = this.gem, op = g.opgave && OPGAVER.find(x => x.id === g.opgave.id);
    if (!op || g.opgave.færdig || op.id !== navn) return;
    g.opgave.tæl = Math.min(op.mål, g.opgave.tæl + n);
    if (g.opgave.tæl >= op.mål) {
      g.opgave.færdig = true;
      this.s.besked(`✅ Opgaven er klaret! 🔮 Spådamen har guld til dig`, 3500);
      sig(`Godt klaret! Gå tilbage til spådamen og få dit guld.`);
      this.s.lyd.magi(); this.s.fest();
    } else this.s.besked(`${op.ikon} ${g.opgave.tæl} af ${op.mål}`, 1500);
    this.gemNu(); this.opdaterTæller(true);
  }

  // ---------- butikken ----------
  visButik() {
    this.s.lyd.magi();
    const g = this.gem;
    const varer = VARER.map(v => {
      const ejer = !v.igen && g.ejer.includes(v.id), råd = g.guld >= v.pris;
      const brug = v.dyr && ejer ? `<button class="anden" data-k="brug:${v.id}">${g.kæledyr === v.dyr ? "✅ Med dig" : "Tag med"}</button>`
        : v.hat && ejer ? `<button class="anden" data-k="brug:${v.id}">${g.hat === v.hat ? "✅ På" : "Tag på"}</button>`
        : v.blok && ejer ? `<button class="anden" data-k="brug:${v.id}">🎒 Tag frem</button>`
        : `<button data-k="køb:${v.id}" ${råd ? "" : "disabled"}>💰 ${v.pris}</button>`;
      return `<div class="vare"><div class="ikon">${v.ikon}</div><div class="navn">${v.navn}</div>${brug}</div>`;
    }).join("");
    const handling = {};
    for (const v of VARER) { handling["køb:" + v.id] = () => this.køb(v); handling["brug:" + v.id] = () => this.brug(v); }
    handling.luk = () => this.lukPanel();
    this.visPanel(`<div class="hoved"><div class="portræt">🧑‍🌾</div><div class="tale">Velkommen i butikken! Du har 💰 ${g.guld} guld.</div></div>
      <div class="varer">${varer}</div><div class="knapper"><button class="anden" data-k="luk">✖️ Luk</button></div>`, handling);
    sig(`Velkommen i butikken! Du har ${g.guld} guldmønter.`);
  }
  køb(v) {
    const g = this.gem;
    if (g.guld < v.pris) return;
    g.guld -= v.pris;
    if (!v.igen && !g.ejer.includes(v.id)) g.ejer.push(v.id);
    this.gemNu(); this.opdaterTæller(true);
    this.s.lyd.guld();
    if (v.hus) { this.lukPanel(); this.s.bygHus(); sig("Værsgo! Her er dit nye hus!"); return; }
    if (v.show) { this.lukPanel(); this.s.fyrværkeriShow(); sig("Se op på himlen!"); return; }
    sig(`Tak for handlen! ${v.navn}!`);
    this.brug(v);
  }
  brug(v) {
    if (v.blok) { this.s.givBlok(v.blok); this.lukPanel(); return; }   // blokken ligger nu i hotbaren (og i ⋯)
    if (v.dyr) { this.gem.kæledyr = v.dyr; this.gemNu(); this.spawnKæledyr(); }
    if (v.hat) { this.gem.hat = this.gem.hat === v.hat ? null : v.hat; this.gemNu(); this.sætHat(); }
    this.visButik();
  }
  // Kæledyret følger efter en (dyr.js: følg)
  spawnKæledyr() {
    if (this.kæledyr) { this.kæledyr.fjern(); const i = this.s.dyr.indexOf(this.kæledyr); if (i >= 0) this.s.dyr.splice(i, 1); this.kæledyr = null; }
    if (!this.gem.kæledyr) return;
    const p = this.s.sp.pos;
    this.kæledyr = this.s.nytDyr(this.s.dyrDef(this.gem.kæledyr), p.x + 1.5, p.y + 0.5, p.z + 1.5);
    this.kæledyr.følg = this.s.sp.pos; this.kæledyr.kæledyr = true;
    this.sætHat();
  }
  sætHat() {
    const d = this.kæledyr;
    if (!d) return;
    if (d.def.id === "hest" && !d.sadel) { d.sadel = byggSadel(); d.model.add(d.sadel); }
    if (d.hat) { d.hat.parent?.remove(d.hat); d.hat = null; }
    if (!this.gem.hat) return;
    const hoved = d.model.userData.hoved?.[0] || d.model, boks = new THREE.Box3().setFromObject(hoved), top = new THREE.Vector3();
    boks.getCenter(top); top.y = boks.max.y;
    d.model.worldToLocal(top);
    d.hat = byggHat(this.gem.hat); d.hat.position.copy(top);
    d.model.add(d.hat);
  }

  // ---------- guldkisten derhjemme ----------
  visKiste() {
    this.s.lyd.guld();
    const g = this.gem, alle = this.s.sten.alle(), fundet = this.s.sten.fundet();
    const dyrene = VARER.filter(v => (v.dyr || v.blok) && g.ejer.includes(v.id)).map(v => v.ikon).join(" ") || "—";
    const tekst = `Din skattekiste! Du har ${g.guld} guldmønter.`;
    this.visPanel(`<div class="hoved"><div class="portræt">💰</div><div class="tale">${tekst}</div></div>
      <div class="guldbunke">${g.guld ? "🪙".repeat(Math.min(g.guld, 60)) : "Tom — klar spådamens opgaver!"}</div>
      <div class="tale">De magiske sten:</div><div class="sten">${alle.map(x => `<span>${fundet.includes(x.id) ? x.ikon : "❔"}</span>`).join("")}</div>
      <div class="tale">Dine dyr og blokke: ${dyrene}</div>
      <div class="knapper"><button data-k="ok">👍 Luk</button></div>`, { ok: () => this.lukPanel() });
    sig(tekst);
  }

  visPanel(html, handlinger) {
    this.panel.innerHTML = html;
    this.panel.querySelectorAll("button[data-k]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); handlinger[b.dataset.k]?.(); }));
    this.panel.classList.add("vis");
  }
  lukPanel() { this.panel.classList.remove("vis"); try { speechSynthesis.cancel(); } catch (_) {} }

  // ---------- hvert billede ----------
  opdater(dt, t) {
    for (const m of this.figurer) {                 // spådamen bevæger hænderne over krystalkuglen
      const u = m.userData;
      if (u.arme) u.arme.forEach((a, i) => { a.rotation.x = -0.9 + Math.sin(t * 2 + i * 1.5) * 0.18; });
      if (u.kugle) { u.glød.scale.setScalar(0.8 + Math.sin(t * 3) * 0.4); u.kugle.material.color.setHSL((t * 0.08) % 1, 0.8, 0.8); }
    }
    if ((this.tjekTid -= dt) <= 0) {                // opgaver, man klarer ved at være et sted
      this.tjekTid = 0.5;
      const p = this.s.sp.pos;
      if (p.y >= 40) this.hændelse("bjerg");
      for (const d of this.s.dyr) {
        const a = Math.hypot(d.pos.x - p.x, d.pos.z - p.z);
        if (a < 5 && d.def.id === "pingvin" && !d.kæledyr) this.hændelse("pingvin");
        if (a < 5 && (d.def.id === "pindsvin" || d.def.id === "egern")) this.hændelse(d.def.id);
        if (a < 8 && ["triceratops", "langhals", "dinounge", "dino"].includes(d.def.id)) this.hændelse("dino");
      }
      if (this.gem.kæledyr && (!this.kæledyr || !this.s.dyr.includes(this.kæledyr)) && this.s.rider?.() !== this.gem.kæledyr) this.spawnKæledyr();   // kæledyret kommer altid med
    }
    if (this.s.land && (this.landsbyTid -= dt) <= 0) { this.landsbyTid = 2; this.opdaterLandsbyer(); }
  }
}
