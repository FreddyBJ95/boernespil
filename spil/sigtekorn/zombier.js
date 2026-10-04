// ===== Zombier: overlev bølge efter bølge sammen med dine holdkammerater =====
// Zombierne er leddeløse ligesom soldaterne: skyd benene af dem, og de kravler videre — kun et hovedskud
// (eller nok skud i kroppen) stopper dem. De løber mod det nærmeste menneske og slår med kløerne.
// Hver bølge har flere zombier, og de er hurtigere og stærkere. Mellem bølgerne er der en kort pause,
// og alle, der er døde, kommer tilbage. Er alle mennesker døde på én gang, har zombierne vundet.
// Tre slags: almindelige, løbere (hurtige, men svagere — fra bølge 3) og kæmper (store, langsomme og
// meget stærke — to i hver femte bølge, og en gang imellem senere). Får en zombie fat i nogen, holder den
// fast og æder: en arm, en arm, et ben, et ben — og hovedet (bots.js og spil.js).

export const MAKS_SAMTIDIG = 12;                                  // så mange zombier på banen ad gangen
const PAUSE = 8;

export class Zombier {
  // k: { kampfolk(), knuder, hud, lyd, nyBølge() (alle døde kommer tilbage), slut(bølger), xp(bølge) }
  constructor(k) { this.k = k; this.bølge = 0; this.tilbage = 0; this.pause = 0; this.færdig = false; this.nåbare = null; }
  startKamp() { this.bølge = 0; this.færdig = false; this.næsteBølge(); }
  // En ny bølge: flere zombier, hurtigere og stærkere
  næsteBølge() {
    this.bølge++;
    this.tilbage = 6 + 3 * (this.bølge - 1);                       // zombier, der endnu ikke er kommet frem
    this.kæmper = this.bølge % 5 === 0 ? 2 : 0;                     // (hver femte bølge: to kæmper)
    this.pause = 0;
    this.k.nyBølge();
    this.k.hud.besked(this.kæmper ? `🧟 Bølge ${this.bølge} — kæmperne kommer!` : `🧟 Bølge ${this.bølge} — ${this.tilbage} zombier`, 2600);
  }
  get liv() { return 70 + 12 * (this.bølge - 1); }                  // en zombies liv i denne bølge
  get fart() { return Math.min(6.4, 4.1 + 0.15 * this.bølge); }     // og fart (m/s)
  get skade() { return Math.min(40, 14 + 2 * (this.bølge - 1)); }   // og hvor hårdt kløerne slår
  // Den næste zombie, der kommer frem: hvilken slags, og hvor stærk den er
  nyZombie() {
    const type = this.kæmper > 0 ? (this.kæmper--, "kæmpe") : this.bølge >= 6 && Math.random() < 0.08 ? "kæmpe"
      : this.bølge >= 3 && Math.random() < 0.25 ? "løber" : "normal";
    const k = { normal: [1, 1, 1, 1], løber: [0.7, 1.45, 0.8, 0.94], kæmpe: [4, 0.75, 1.6, 1.32] }[type];
    return { type, liv: this.liv * k[0], fart: Math.min(8.5, this.fart * k[1]), skade: this.skade * k[2], skala: k[3] };
  }
  // Må der komme en zombie mere frem lige nu? (tæller ned)
  måKomme() { if (this.tilbage <= 0 || this.pause > 0 || this.færdig) return false; this.tilbage--; return true; }
  // Hvert tick: er bølgen slut? Er alle mennesker døde?
  tick(dt) {
    if (this.færdig) return;
    const folk = this.k.kampfolk(), zombier = folk.filter(f => f.zombie && !f.død).length, mennesker = folk.filter(f => !f.zombie);
    if (!mennesker.some(m => !m.død)) { this.færdig = true; this.k.slut(this.bølge - 1); return; }
    if (this.pause > 0) { if ((this.pause -= dt) <= 0) this.næsteBølge(); return; }
    if (this.tilbage <= 0 && zombier === 0) {                     // bølgen er klaret
      this.k.xp(this.bølge);
      this.k.hud.besked(`✅ Bølge ${this.bølge} klaret! Næste bølge om ${PAUSE} sekunder — der står en forsyningskasse`, 3200);
      this.k.forsyning?.();                                          // (en kasse med liv, vest, granater og ammunition)
      this.pause = PAUSE;
    }
  }
  // Hvor en zombie kommer frem: et sted på vej-nettet, 22–55 meter fra det nærmeste menneske
  sted() {
    const kn = this.k.knuder, mennesker = this.k.kampfolk().filter(f => !f.zombie && !f.død);
    // kun steder, der hænger sammen med resten af banen (ikke en lille ø, hvor zombien ikke kan komme væk fra)
    if (!this.nåbare && mennesker.length) {
      const m = mennesker[0].a.pos; let s0 = 0, bd = Infinity;
      kn.forEach((n, i) => { const d = Math.hypot(n.x - m.x, n.z - m.z); if (d < bd) { bd = d; s0 = i; } });
      const set = new Set([s0]), kø = [s0];
      while (kø.length) for (const n of kn[kø.pop()].nab) if (!set.has(n)) { set.add(n); kø.push(n); }
      this.nåbare = set;
    }
    let reserve = null;
    for (let i = 0; i < 60; i++) {
      const i0 = Math.floor(Math.random() * kn.length), n = kn[i0];
      if (this.nåbare && !this.nåbare.has(i0)) continue;
      const d = Math.min(...mennesker.map(m => Math.hypot(m.a.pos.x - n.x, m.a.pos.z - n.z)), 999);
      if (n.y > 0.5) continue;
      if (d > 22 && d < 55) return [n.x, n.z];
      if (d > 22) reserve ??= [n.x, n.z];
    }
    return reserve || [kn[0].x, kn[0].z];
  }
  status() { return { bølge: this.bølge, tilbage: this.tilbage + this.k.kampfolk().filter(f => f.zombie && !f.død).length }; }
}
