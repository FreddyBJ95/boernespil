// ===== Enhjørningeland: de små føl, der er løbet væk, og regnbuesporet =====
// Fem små enhjørningeføl leger ude på engene. Tryk på et føl, så følger det efter dig. Tag det med hjem
// til folden ved stalden, så bliver det dér. Når alle fem er hjemme, bliver der fest med fyrværkeri —
// og lidt efter løber de ud at lege igen. Når man rider på en enhjørning, kommer der et spor af
// regnbuefarvede gnister bagefter, og enhjørningernes horn glimter af og til.

import * as THREE from "./three.js";

export const ENHJØRNINGER = new Set(["enhjorning", "regnbueenhjorning", "rosaenhjorning", "pegasus", "enhjorningfol"]);
const ANTAL = 5;                                  // så mange føl skal findes
const REGNBUE = ["#ff4d5e", "#ffa13a", "#ffe14a", "#5fe36a", "#4ab8ff", "#b47cff", "#ff7ed0"].map(f => new THREE.Color(f));
const GLIMT = ["#ffffff", "#fff3a0", "#ffd0f0"].map(f => new THREE.Color(f));

const STIL = `
#følTæller { position: fixed; top: 10px; right: 10px; z-index: 6; display: none; background: #0008; color: #fff;
  font: 800 20px system-ui, sans-serif; padding: 8px 14px; border-radius: 18px; border: 2px solid #ff9ed8; }
.i-gang #følTæller.vis { display: block; }
.online #følTæller { top: 62px; }
#følTæller.hop { animation: følHop 0.6s ease-out; }
@keyframes følHop { 40% { transform: scale(1.35); } }
`;

export class Føljagt {
  // s: { sp, verden, dyr, nytDyr(def, x, y, z), dyrDef(id), stald: [x, z], partikel, lyd, besked(tekst, ms), fest(),
  //      fyrværkeri(x, y, z), rider() → id på det dyr, man rider på (eller undefined) }
  constructor(s) {
    this.s = s;
    this.føl = []; this.hjemme = 0; this.igenTid = 0; this.sporTid = 0; this.glimtTid = 0; this.udsat = false;
    const st = document.createElement("style"); st.textContent = STIL; document.head.appendChild(st);
    this.tæller = document.createElement("div"); this.tæller.id = "følTæller";
    document.body.appendChild(this.tæller);
  }
  // Midten af folden og en plads til hvert føl derinde
  get stald() { const [x, z] = this.s.stald; return { x: x + 0.5, z: z - 1.5 }; }
  plads(i) { const { x, z } = this.stald; return new THREE.Vector3(x - 4 + (i % 3) * 4, this.s.verden.topY(Math.floor(x), Math.floor(z)) + 1, z - 1 + Math.floor(i / 3) * 2.5); }

  // Føllene løber ud på engene — et stykke væk fra stalden, på tørt land
  udsæt() {
    const { verden, nytDyr, dyrDef } = this.s, { x: ux, z: uz } = this.stald;
    for (const d of this.føl) { d.fjern(); const i = this.s.dyr.indexOf(d); if (i >= 0) this.s.dyr.splice(i, 1); }
    this.føl = []; this.hjemme = 0;
    for (let n = 0, forsøg = 0; n < ANTAL && forsøg < 200; forsøg++) {
      const v = Math.random() * Math.PI * 2, r = 28 + Math.random() * 34;
      const x = Math.floor(ux + Math.cos(v) * r), z = Math.floor(uz + Math.sin(v) * r);
      if (!verden.inde(x, 0, z) || !verden.hentet(x, z)) continue;
      const y = verden.topY(x, z);
      if (verden.væske[verden.hent(x, y, z)] || verden.væske[verden.hent(x, y + 1, z)] || y < 8) continue;
      const d = nytDyr(dyrDef("enhjorningfol"), x + 0.5, y + 1, z + 0.5);
      d.kæledyr = true;                                         // så det ikke forsvinder, når der kommer nye dyr
      this.føl.push(d); n++;
    }
    this.udsat = this.føl.length > 0;
    this.visTæller();
  }
  visTæller(hop) {
    this.tæller.classList.toggle("vis", this.udsat);
    this.tæller.textContent = `🦄 ${this.hjemme}/${this.føl.length} føl hjemme`;
    if (hop) { this.tæller.classList.remove("hop"); void this.tæller.offsetWidth; this.tæller.classList.add("hop"); }
  }

  // Barnet har klappet et dyr: er det et føl, følger det med
  klappet(d) {
    if (d.def.id !== "enhjorningfol" || !this.føl.includes(d) || d.hjemme || d.følg) return;
    d.følg = this.s.sp.pos;
    this.s.lyd.magi();
    this.s.besked("🦄 Føllet følger efter dig! Tag det med hjem til stalden 🏠", 3500);
    this.drys(d.pos.x, d.pos.y + 1, d.pos.z, 16);
  }

  // Et lille drys af regnbuefarvede gnister
  drys(x, y, z, n, fart = 2.5) {
    for (let i = 0; i < n; i++) this.s.partikel(x, y, z, REGNBUE[i % REGNBUE.length],
      (Math.random() - 0.5) * fart, Math.random() * fart, (Math.random() - 0.5) * fart, 0.9 + Math.random() * 0.6, 0.3, 0.7);
  }

  // ---------- hvert billede ----------
  opdater(dt) {
    const { sp, verden } = this.s;
    if (!this.udsat) { if (verden.hentet(...this.s.stald)) this.udsæt(); return; }   // sammen: vent, til jorden er hentet
    // et føl, der følger med, er kommet hjem i folden
    const { x: ux, z: uz } = this.stald;
    for (const d of this.føl) {
      if (!d.følg || d.hjemme || Math.hypot(d.pos.x - ux, d.pos.z - uz) > 7) continue;
      d.hjemme = true; d.følg = this.plads(this.hjemme); this.hjemme++;
      this.s.lyd.guld(); this.drys(d.pos.x, d.pos.y + 1, d.pos.z, 30, 4);
      this.visTæller(true);
      if (this.hjemme >= this.føl.length) this.alleHjemme();
      else this.s.besked(`🏠 Føllet er hjemme! ${this.hjemme} af ${this.føl.length}`, 3000);
    }
    // efter festen løber føllene ud at lege igen
    if (this.igenTid > 0 && (this.igenTid -= dt) <= 0) {
      this.s.besked("🦄 Åh, føllene er løbet ud at lege igen! Kan du finde dem?", 4000);
      this.udsæt();
    }
    // regnbuesporet bag den enhjørning, man rider på
    if (ENHJØRNINGER.has(this.s.rider?.()) && (this.sporTid -= dt) <= 0) {
      this.sporTid = 0.04;
      const c = REGNBUE[Math.floor(Math.random() * REGNBUE.length)], bag = new THREE.Vector3(Math.sin(sp.yaw), 0, Math.cos(sp.yaw));
      this.s.partikel(sp.pos.x + bag.x * 0.9 + (Math.random() - 0.5) * 0.5, sp.pos.y + 0.4 + Math.random() * 0.6, sp.pos.z + bag.z * 0.9 + (Math.random() - 0.5) * 0.5,
        c, (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6, 1.4, 0.05, 0.8);
    }
    // enhjørningernes horn glimter af og til
    if ((this.glimtTid -= dt) <= 0) {
      this.glimtTid = 0.15;
      for (const d of this.s.dyr) {
        if (!ENHJØRNINGER.has(d.def.id) || Math.random() > 0.25 || Math.hypot(d.pos.x - sp.pos.x, d.pos.z - sp.pos.z) > 30) continue;
        const s = d.def.skala || 1, fx = Math.sin(d.yaw) * 0.85 * s, fz = Math.cos(d.yaw) * 0.85 * s;
        this.s.partikel(d.pos.x + fx, d.pos.y + 2.15 * s, d.pos.z + fz, GLIMT[Math.floor(Math.random() * GLIMT.length)],
          (Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8, 0.8, 0.05, 0.5);
      }
    }
  }
  // Alle føllene er hjemme: hjerter, fyrværkeri over stalden og en stor glæde
  alleHjemme() {
    const { x, z } = this.stald, y = this.s.verden.topY(Math.floor(x), Math.floor(z)) + 2;
    this.s.besked("🎉 Alle føllene er hjemme! Godt klaret! 🦄💖", 5000);
    this.s.fest(); this.s.lyd.guld();
    for (let i = 0; i < 6; i++) setTimeout(() => this.s.fyrværkeri(x + (Math.random() - 0.5) * 10, y, z + (Math.random() - 0.5) * 8), 400 + i * 600);
    this.igenTid = 45;
  }
}
