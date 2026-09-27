// Ren spillogik uden DOM/three.js. Blok-id'erne er stabile og kontrolleres i tests.
const VAND = 43, LAVA = 51, ILD = 55, STEN = 3, OBSIDIAN = 56, TNT = 42;
const BRÆNDBART = new Set([5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 22, 23, 24, 25, 29, 31, 35, 36]);
const SIDER = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
const NABOER = [...SIDER, [0, 1, 0], [0, -1, 0]];
const nøgle = (x, y, z) => `${x},${y},${z}`;
const vand = id => id >= VAND && id <= VAND + 7;
const lava = id => id >= LAVA && id <= LAVA + 3;

export class Simulering {
  constructor({ hent, sæt, inde, højde, ildBreder = true, tændTNT = () => {}, lyd = () => {}, tilfældig = Math.random }) {
    Object.assign(this, { hent, sæt, inde, højde, ildBreder, tændTNT, lyd, tilfældig });
    this.aktive = new Map();
    this.brænder = new Map();
    this.ildAlder = new Map();
    this.tid = 0;
    this.restant = 0;
    this.næsteVand = 0;
    this.næsteLava = 0;
  }

  // Væk kun det ændrede felt og dets naboer; der scannes aldrig en hel verden i tick.
  blokÆndret(x, y, z) {
    for (const [dx, dy, dz] of [[0, 0, 0], ...NABOER]) {
      const p = [x + dx, y + dy, z + dz];
      if (this.inde(...p)) this.aktive.set(nøgle(...p), p);
    }
    this.brænder.delete(nøgle(x, y, z));
    if (this.hent(x, y, z) !== ILD) this.ildAlder.delete(nøgle(x, y, z));
  }

  ændr(x, y, z, id) {
    if (!this.inde(x, y, z) || this.hent(x, y, z) === id) return;
    this.sæt(x, y, z, id);
    this.blokÆndret(x, y, z);
  }

  // Faste trin giver ens hastighed ved 20 server-ticks og ved skiftende billedhastighed.
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.restant += Math.min(dt, 0.5);
    while (this.restant >= 0.05 - 1e-8) {
      this.restant -= 0.05;
      this.trin();
    }
  }

  trin() {
    this.tid += 0.05;
    if (this.tid < this.næsteVand) return;
    this.næsteVand = this.tid + 0.2 - 1e-8;
    const medLava = this.tid >= this.næsteLava;
    if (medLava) this.næsteLava += 2 / 3;
    this.opvarmet = new Set();
    const felter = [...this.aktive.values()];
    this.aktive.clear();
    const ændringer = [];
    for (const p of felter) {
      const id = this.hent(...p);
      if (id === ILD) this.ild(...p);
      else if (lava(id)) {
        this.varme(...p);
        if (medLava) this.væske(p, LAVA, 3, ændringer);
        this.aktive.set(nøgle(...p), p);
      } else if (vand(id)) this.væske(p, VAND, 7, ændringer);
      else if (id === 0) {
        this.væske(p, VAND, 7, ændringer);
        if (medLava) this.væske(p, LAVA, 3, ændringer);
        else if (NABOER.some(d => lava(this.hent(...p.map((v, i) => v + d[i]))))) this.aktive.set(nøgle(...p), p);
      }
    }
    for (const [x, y, z, id] of ændringer) this.ændr(x, y, z, id);
    for (const k of this.brænder.keys()) if (!this.opvarmet.has(k)) this.brænder.delete(k);
  }

  // Find nærmeste hul med en kort bredde-først-søgning på samme højde.
  hulAfstand(x, y, z, kilde, maks, fraX, fraZ) {
    const kø = [[x, z, 0]], set = new Set([`${fraX},${fraZ}`]);
    for (let i = 0; i < kø.length; i++) {
      const [xx, zz, d] = kø[i], k = `${xx},${zz}`;
      if (set.has(k) || !this.inde(xx, y, zz)) continue;
      set.add(k);
      const id = this.hent(xx, y, zz);
      if (id !== 0 && !(id > kilde && id <= kilde + maks)) continue;
      const ned = this.hent(xx, y - 1, zz);
      if (this.inde(xx, y - 1, zz) && (ned === 0 || ned === kilde + 1)) return d;
      if (d < maks - 1) for (const [dx, , dz] of SIDER) kø.push([xx + dx, zz + dz, d + 1]);
    }
    return Infinity;
  }

  måFlydeFra(x, y, z, dx, dz, kilde, maks) {
    const ned = this.hent(x, y - 1, z);
    if (this.inde(x, y - 1, z) && (ned === 0 || (ned >= kilde && ned <= kilde + maks))) return false;
    const afstande = SIDER.map(([sx, , sz]) => this.hulAfstand(x + sx, y, z + sz, kilde, maks, x, z));
    const valgt = SIDER.findIndex(([sx, , sz]) => sx === dx && sz === dz);
    return afstande[valgt] === Math.min(...afstande);
  }

  // Flydende felter får altid deres niveau fra en kilde/opstrøm; løsrevne strømme tørrer ud.
  væske([x, y, z], kilde, maks, ændringer) {
    const id = this.hent(x, y, z), samme = v => v >= kilde && v <= kilde + maks;
    if (kilde === LAVA && lava(id)) {
      if (NABOER.some(([dx, dy, dz]) => vand(this.hent(x + dx, y + dy, z + dz)))) {
        ændringer.push([x, y, z, vand(this.hent(x, y + 1, z)) ? STEN : id === LAVA ? OBSIDIAN : STEN]);
        this.lyd("tss", x, y, z);
        return;
      }
    }
    if (id === kilde || (id !== 0 && !samme(id))) return;
    let niveau = Infinity;
    if (samme(this.hent(x, y + 1, z))) niveau = 1;
    else for (const [dx, , dz] of SIDER) {
      const nabo = this.hent(x + dx, y, z + dz);
      if (samme(nabo) && nabo - kilde < maks && this.måFlydeFra(x + dx, y, z + dz, -dx, -dz, kilde, maks)) niveau = Math.min(niveau, nabo - kilde + 1);
    }
    const ny = niveau <= maks ? kilde + niveau : 0;
    if (ny !== id && (ny || samme(id))) ændringer.push([x, y, z, ny]);
  }

  // Vand slukker; ellers brænder hver naboblok efter sin egen tid på 2–6 sekunder.
  ild(x, y, z) {
    const k = nøgle(x, y, z), naboer = NABOER.map(([dx, dy, dz]) => [x + dx, y + dy, z + dz]);
    if (naboer.some(p => vand(this.hent(...p)))) { this.ændr(x, y, z, 0); return; }
    let brændstof = false;
    for (const p of naboer) {
      const id = this.hent(...p);
      if (id === TNT) this.tændTNT(...p);
      if (!BRÆNDBART.has(id)) continue;
      brændstof = true;
      const pk = nøgle(...p);
      this.opvarmet.add(pk);
      if (!this.brænder.has(pk)) this.brænder.set(pk, this.tid + 2 + this.tilfældig() * 4);
      if (this.tid >= this.brænder.get(pk)) {
        this.ændr(...p, this.ildBreder ? ILD : 0);
        this.lyd("knitre", ...p);
      }
    }
    if (brændstof) this.ildAlder.delete(k);
    else {
      if (!this.ildAlder.has(k)) this.ildAlder.set(k, this.tid);
      if (this.tid - this.ildAlder.get(k) >= 3) { this.ændr(x, y, z, 0); return; }
    }
    if (this.ildBreder && this.tilfældig() < 0.08) this.antændNær(x, y, z);
    this.aktive.set(k, [x, y, z]);
  }

  antændNær(x, y, z) {
    for (const [dx, dy, dz] of NABOER) {
      const p = [x + dx, y + dy, z + dz];
      if (this.hent(...p) !== 0 || !this.inde(...p)) continue;
      if (NABOER.some(d => vand(this.hent(...p.map((v, i) => v + d[i]))))) continue;
      if (NABOER.some(d => BRÆNDBART.has(this.hent(...p.map((v, i) => v + d[i]))))) this.ændr(...p, ILD);
    }
  }

  varme(x, y, z) {
    for (const [dx, dy, dz] of NABOER) if (this.hent(x + dx, y + dy, z + dz) === TNT) this.tændTNT(x + dx, y + dy, z + dz);
    if (this.ildBreder && this.tilfældig() < 0.03) this.antændNær(x, y, z);
  }
}
