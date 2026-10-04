// ===== Kollision: banen er lavet af kasser, og spillerne er kasser, der glider langs dem =====
// Hver kasse har et min- og et max-hjørne (i meter) og et materiale ("sten", "træ", "metal", "sand"),
// som bestemmer lyden og gnisterne, når man skyder på den. Kasserne ligger i et gitter, så man hurtigt
// kan finde dem i nærheden — både når nogen går, og når en kugle flyver.

const CELLE = 8;                                  // gitterets felter er 8 × 8 meter
const EPS = 0.0005;
const AKSE = ["x", "y", "z"];

export class Kasseverden {
  constructor() { this.kasser = []; this.celler = new Map(); this.besøgt = 0; }

  // Læg en kasse i verdenen
  tilføj(x0, y0, z0, x1, y1, z1, mat = "sten") {
    const k = { min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)], mat, nr: 0 };
    this.kasser.push(k);
    for (let cx = Math.floor(k.min[0] / CELLE); cx <= Math.floor(k.max[0] / CELLE); cx++)
      for (let cz = Math.floor(k.min[2] / CELLE); cz <= Math.floor(k.max[2] / CELLE); cz++) {
        const n = cx * 1000 + cz;
        if (!this.celler.has(n)) this.celler.set(n, []);
        this.celler.get(n).push(k);
      }
    return k;
  }

  // Fjern en kasse igen (fx et køretøj, der kører væk)
  fjern(k) {
    const i = this.kasser.indexOf(k); if (i >= 0) this.kasser.splice(i, 1);
    for (const liste of this.celler.values()) { const j = liste.indexOf(k); if (j >= 0) liste.splice(j, 1); }
  }

  // Alle kasser i felterne, som firkanten rører (hver kasse kun én gang)
  nær(x0, z0, x1, z1) {
    const ud = [], mærke = ++this.besøgt;
    for (let cx = Math.floor(x0 / CELLE); cx <= Math.floor(x1 / CELLE); cx++)
      for (let cz = Math.floor(z0 / CELLE); cz <= Math.floor(z1 / CELLE); cz++) {
        for (const k of this.celler.get(cx * 1000 + cz) || []) if (k.nr !== mærke) { k.nr = mærke; ud.push(k); }
      }
    return ud;
  }

  // Er der plads til en krop (halv bredde b, højde h) med fødderne i (x, y, z)?
  fri(x, y, z, b, h) {
    for (const k of this.nær(x - b, z - b, x + b, z + b)) {
      if (x + b > k.min[0] + EPS && x - b < k.max[0] - EPS && y + h > k.min[1] + EPS && y < k.max[1] - EPS && z + b > k.min[2] + EPS && z - b < k.max[2] - EPS) return false;
    }
    return true;
  }

  // Den højeste overflade under et punkt (til fødderne og til botternes vej-net)
  gulv(x, y, z) {
    let bedst = -Infinity;
    for (const k of this.nær(x, z, x, z)) {
      if (x >= k.min[0] && x <= k.max[0] && z >= k.min[2] && z <= k.max[2] && k.max[1] <= y + EPS && k.max[1] > bedst) bedst = k.max[1];
    }
    return bedst;
  }

  // Flyt en aktør (pos = fødderne, b = halv bredde, h = højde) — én akse ad gangen, så den glider langs væggene.
  // jordFør: stod den på jorden før flytningen? Så må den gå op ad trin på op til `trin` meter.
  bevæg(a, dx, dy, dz, jordFør, trin) {
    a.jord = false;
    this.akse(a, 1, dy, false, 0);
    this.akse(a, 0, dx, jordFør, trin);
    this.akse(a, 2, dz, jordFør, trin);
  }
  akse(a, i, d, jordFør, trin) {
    if (!d) return;
    const p = a.pos, n = AKSE[i];
    p[n] += d;
    for (const k of this.nær(p.x - a.b, p.z - a.b, p.x + a.b, p.z + a.b)) {
      if (!(p.x + a.b > k.min[0] + EPS && p.x - a.b < k.max[0] - EPS && p.y + a.h > k.min[1] + EPS && p.y < k.max[1] - EPS && p.z + a.b > k.min[2] + EPS && p.z - a.b < k.max[2] - EPS)) continue;
      if (i !== 1 && jordFør) {                                    // et lille trin: gå op på det
        const op = k.max[1] - p.y;
        if (op > 0 && op <= trin && this.fri(p.x, k.max[1] + EPS, p.z, a.b, a.h)) { p.y = k.max[1] + EPS; a.trådOp = op; continue; }
      }
      if (i === 1) {
        if (d < 0) { p.y = k.max[1] + EPS; a.jord = true; } else p.y = k.min[1] - a.h - EPS;
        a.vel.y = 0;
      } else {
        p[n] = d > 0 ? k.min[i] - a.b - EPS : k.max[i] + a.b + EPS;
        a.vel[n] = 0;
      }
    }
  }

  // En stråle (fx en kugle) fra o i retningen r (enhedsvektor). Svarer med den nærmeste kasse, den rammer
  stråle(o, r, maks = 300) {
    let bedst = null, bedstT = maks;
    // gå felt for felt langs strålen (vandret), og test kasserne i hvert felt
    let cx = Math.floor(o.x / CELLE), cz = Math.floor(o.z / CELLE);
    const sx = Math.sign(r.x) || 1, sz = Math.sign(r.z) || 1;
    const tdx = Math.abs(CELLE / (r.x || 1e-9)), tdz = Math.abs(CELLE / (r.z || 1e-9));
    let tx = r.x ? (((sx > 0 ? cx + 1 : cx) * CELLE - o.x) / r.x) : Infinity;
    let tz = r.z ? (((sz > 0 ? cz + 1 : cz) * CELLE - o.z) / r.z) : Infinity;
    const mærke = ++this.besøgt;
    for (let skridt = 0; skridt < 200; skridt++) {
      for (const k of this.celler.get(cx * 1000 + cz) || []) {
        if (k.nr === mærke) continue;
        k.nr = mærke;
        const h = ramKasse(o, r, k, bedstT);
        if (h) { bedstT = h.t; bedst = { ...h, kasse: k }; }
      }
      const næste = Math.min(tx, tz);
      if (næste > bedstT || næste > maks) break;
      if (tx < tz) { cx += sx; tx += tdx; } else { cz += sz; tz += tdz; }
    }
    return bedst;
  }
}

// Rammer strålen kassen før afstanden maks? (Slab-metoden.) Svarer med afstanden og fladens retning
export function ramKasse(o, r, k, maks = Infinity) {
  let t0 = 0, t1 = maks, akse = -1, side = 0;
  const op = [o.x, o.y, o.z], rr = [r.x, r.y, r.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(rr[i]) < 1e-12) { if (op[i] < k.min[i] || op[i] > k.max[i]) return null; continue; }
    let a = (k.min[i] - op[i]) / rr[i], b = (k.max[i] - op[i]) / rr[i], s = -1;
    if (a > b) { const t = a; a = b; b = t; s = 1; }
    if (a > t0) { t0 = a; akse = i; side = s; }
    if (b < t1) t1 = b;
    if (t0 > t1) return null;
  }
  if (akse < 0) return null;                                       // strålen starter inde i kassen
  const normal = [0, 0, 0]; normal[akse] = side;
  return { t: t0, normal };
}
