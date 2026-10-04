// ===== Killcam: se de sidste sekunder, før du døde — gennem øjnene på den, der dræbte dig =====
// Spillet optager hele tiden, hvor alle står, hvor de kigger hen, og hvilket våben de har (32 gange i sekundet),
// og hvor skuddene fløj. Når du dør, afspilles de sidste fire sekunder med rene kopier af soldaterne
// (de rigtige ligger måske i stykker på jorden), mens kameraet sidder i drabsmandens øjne.

import * as THREE from "./three.js";
import { Figur } from "./leddeloes.js";

const HYPPIGHED = 1 / 32, GEMMES = 8, LÆNGDE = 4, EFTER = 0.35;     // optag 32 gange i sekundet, gem 8 sekunder, vis 4

export class Killcam {
  // k: { scene, kampfolk(), spiller, effekter, øjeHøjde(a) }
  constructor(k) {
    this.k = k; this.billeder = []; this.skud = []; this.næste = 0; this.aktiv = null;
    this.figurer = new Map();                                      // kopierne af soldaterne (laves første gang)
  }
  // Hvert tick: gem et billede af alle (højst 32 i sekundet)
  optag(tid) {
    if (tid < this.næste) return;
    this.næste = tid + HYPPIGHED;
    const folk = this.k.kampfolk().map(f => {
      const a = f.a, c = Math.cos(a.yaw), s = Math.sin(a.yaw);
      const våben = f.erSpiller ? this.k.aktivt() : f.våben?.id ?? null;
      return { f, x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw, pitch: a.pitch, vx: c * a.vel.x - s * a.vel.z, vz: s * a.vel.x + c * a.vel.z,
        fart: Math.hypot(a.vel.x, a.vel.z), duk: a.duk, kravl: !!a.kravl, våben, død: f.død, liv: f.liv };
    });
    this.billeder.push({ tid, folk });
    while (this.billeder.length && this.billeder[0].tid < tid - GEMMES) this.billeder.shift();
    while (this.skud.length && this.skud[0].tid < tid - GEMMES) this.skud.shift();
  }
  // Et skud (lysspor) — så det også kan ses i afspilningen (og drabsmandens våben sparker, når han skyder)
  spor(fra, til, tid, skytte = null) { this.skud.push({ fra: fra.clone(), til: til.clone(), tid, skytte }); }
  // Start afspilningen: de sidste sekunder op til tid (da du døde), set fra dræber
  start(dræber, tid) {
    if (!dræber || dræber.erSpiller || !this.billeder.length) return false;
    this.aktiv = { dræber, fra: Math.max(this.billeder[0].tid, tid - LÆNGDE), til: tid + EFTER, t: 0, skudNr: 0 };
    this.aktiv.t = this.aktiv.fra;
    this.aktiv.skudNr = this.skud.findIndex(s => s.tid >= this.aktiv.fra);
    for (const f of this.k.kampfolk()) if (!f.erSpiller) f.model.visible = false;       // de rigtige soldater skjules imens
    return true;
  }
  stop() {
    if (!this.aktiv) return;
    this.aktiv = null;
    for (const fig of this.figurer.values()) fig.model.visible = false;
    for (const f of this.k.kampfolk()) if (!f.erSpiller) f.model.visible = true;
  }
  // Hvert billede under afspilningen: stil kopierne op, sæt kameraet i drabsmandens øjne. Svarer false, når den er færdig
  tegn(dt, kamera) {
    const a = this.aktiv; if (!a) return false;
    a.t += dt;
    if (a.t >= a.til) { this.stop(); return false; }
    const i = this.billeder.findIndex(b => b.tid >= a.t), b1 = this.billeder[Math.max(0, i)], b0 = this.billeder[Math.max(0, i - 1)];
    const u = b1.tid > b0.tid ? (a.t - b0.tid) / (b1.tid - b0.tid) : 0;
    const brugt = new Set();
    for (const s1 of b1.folk) {
      const s0 = b0.folk.find(s => s.f === s1.f) || s1, fig = this.figur(s1.f);
      brugt.add(fig);
      if (s1.død) { fig.model.visible = false; continue; }
      const lerp = (p, q) => p + (q - p) * u, yaw = s0.yaw + vinkel(s1.yaw - s0.yaw) * u;
      fig.model.visible = s1.f !== a.dræber;                          // (man ser ikke sig selv indefra)
      fig.model.position.set(lerp(s0.x, s1.x), lerp(s0.y, s1.y), lerp(s0.z, s1.z)); fig.model.rotation.y = yaw;
      fig.poser({ fart: s1.fart, vx: s1.vx, vz: s1.vz, duk: s1.duk, pitch: lerp(s0.pitch, s1.pitch), kravl: s1.kravl, våben: s1.våben, dt });
      if (s1.f === a.dræber) {
        kamera.position.set(lerp(s0.x, s1.x), lerp(s0.y, s1.y) + this.k.øjeHøjde({ duk: s1.duk, kravl: s1.kravl }), lerp(s0.z, s1.z));
        kamera.rotation.set(lerp(s0.pitch, s1.pitch), yaw, 0);
        a.liv = s1.liv; a.våben = s1.våben; a.fart = s1.fart;
      }
    }
    for (const fig of this.figurer.values()) if (!brugt.has(fig)) fig.model.visible = false;
    // skuddene, der blev affyret i mellemtiden
    while (a.skudNr >= 0 && a.skudNr < this.skud.length && this.skud[a.skudNr].tid <= a.t) {
      const s = this.skud[a.skudNr++];
      if (s.skytte === a.dræber && this.k.dræberSkud) this.k.dræberSkud(a.våben, s.til);   // (fra mundingen af våbnet i hans hånd)
      else this.k.effekter.sporFra(s.fra, s.til);
    }
    return true;
  }
  // En kopi af en soldat (med samme hold og skin) — kun til afspilningen
  figur(f) {
    let fig = this.figurer.get(f);
    if (!fig) { fig = new Figur(f.hold); fig.skin = f.fig?.skin; fig.model.visible = false; this.k.scene.add(fig.model); this.figurer.set(f, fig); }
    return fig;
  }
  // Til skærmen: hvem du ser fra, med hvilket våben, og hvor meget liv de havde
  get info() { const a = this.aktiv; return a ? { navn: a.dræber.navn, hold: a.dræber.hold, våben: a.våben, liv: a.liv } : null; }
  // Nye botter (ny kamp): glem de gamle kopier
  ryd() { this.stop(); for (const fig of this.figurer.values()) this.k.scene.remove(fig.model); this.figurer.clear(); this.billeder = []; this.skud = []; }
}
const vinkel = v => ((v + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
