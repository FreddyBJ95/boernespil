// ===== Brandmandsbyen: huse, der af og til begynder at brænde =====
// Når man spiller alene, vælger brandvæsenet af og til et hus tæt på barnet og tænder ild på taget.
// Røgen stiger højt op, så man kan finde huset. Ilden bliver ved, til barnet har sprøjtet
// hver eneste flamme ud med 🚒 brandslangen — så er huset reddet, og man får ⭐.
// Tagene er af tagsten, som ikke kan brænde, så husene aldrig brænder ned.

import { ID } from "./blokke.js";

const HVER = [28, 48];                                    // sekunder mellem to brande

export class Brandvæsen {
  // h: { sæt(x, y, z, id), røg(x, y, z), besked(tekst, ms), reddet(x, y, z), alarm() }
  constructor(verden, h) {
    this.v = verden; this.h = h;
    this.huse = null;                                     // findes første gang, der skal brænde
    this.brænder = [];
    this.næste = 14;
    this.tjekT = 0; this.røgT = 0;
  }

  // Find husene: hvert tag er en klump af tagsten. Flammerne kan sidde oven på dem.
  findHuse() {
    const v = this.v, d = v.data, lag = v.BX * v.BZ, set = new Uint8Array(d.length);
    this.huse = [];
    for (let i = 0; i < d.length; i++) {
      if (d[i] !== ID.Tagsten || set[i]) continue;
      const kø = [i], toppe = [];
      set[i] = 1;
      let sx = 0, sz = 0, n = 0;
      while (kø.length && n < 600) {
        const j = kø.pop(), x = j % v.BX, y = Math.floor(j / lag), z = Math.floor((j % lag) / v.BX);
        sx += x; sz += z; n++;
        if (v.hent(x, y + 1, z) === 0) toppe.push([x, y + 1, z]);
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const a = x + dx, b = y + dy, c = z + dz;
          if (!v.inde(a, b, c)) continue;
          const k = a + c * v.BX + b * lag;
          if (!set[k] && d[k] === ID.Tagsten) { set[k] = 1; kø.push(k); }
        }
      }
      if (toppe.length >= 4) this.huse.push({ x: sx / n, z: sz / n, toppe });
    }
  }

  // Tænd ild på et hus, der er tæt på (men ikke det, man står på)
  startBrand(spiller) {
    if (!this.huse) this.findHuse();
    const mulige = this.huse.filter(hus => {
      const a = Math.hypot(hus.x - spiller.x, hus.z - spiller.z);
      return a > 10 && a < 46 && !this.brænder.some(b => b.hus === hus);
    });
    if (!mulige.length) return;
    const hus = mulige[Math.floor(Math.random() * mulige.length)];
    const valgt = [...hus.toppe].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3));
    const flammer = valgt.map(([x, y, z]) => ({ x, y, z, slukket: false }));
    for (const f of flammer) this.h.sæt(f.x, f.y, f.z, ID.Ild);
    this.brænder.push({ hus, flammer });
    this.h.alarm();
    this.h.besked("🚒 Det brænder i et hus! Følg røgen, og sluk ilden med brandslangen", 5000);
  }

  // Brandslangen har slukket en flamme her
  sprøjtet(x, y, z) {
    for (const b of this.brænder) for (const f of b.flammer) if (f.x === x && f.y === y && f.z === z) f.slukket = true;
  }

  opdater(dt, spiller) {
    this.næste -= dt;
    if (this.næste <= 0) {
      this.næste = HVER[0] + Math.random() * (HVER[1] - HVER[0]);
      if (this.brænder.length < 2) this.startBrand(spiller);
    }
    if (!this.brænder.length) return;
    // Røg der stiger højt op over huset
    this.røgT -= dt;
    if (this.røgT <= 0) {
      this.røgT = 0.08;
      for (const b of this.brænder) {
        const f = b.flammer.filter(f => !f.slukket);
        for (let i = 0; i < 2 && f.length; i++) { const k = f[Math.floor(Math.random() * f.length)]; this.h.røg(k.x + 0.5, k.y + 1, k.z + 0.5); }
      }
    }
    // Ilden holdes i gang, indtil den er sprøjtet ud
    this.tjekT -= dt;
    if (this.tjekT > 0) return;
    this.tjekT = 0.4;
    for (const b of [...this.brænder]) {
      for (const f of b.flammer) if (!f.slukket && this.v.hent(f.x, f.y, f.z) !== ID.Ild) {
        if (this.v.hent(f.x, f.y, f.z) === 0) this.h.sæt(f.x, f.y, f.z, ID.Ild); else f.slukket = true;   // bygget over: så er den væk
      }
      if (b.flammer.every(f => f.slukket)) {
        this.brænder.splice(this.brænder.indexOf(b), 1);
        const f = b.flammer[0];
        this.h.reddet(f.x + 0.5, f.y, f.z + 0.5);
      }
    }
  }
}
