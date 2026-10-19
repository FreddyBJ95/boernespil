// ===== Kuglens fysik =====
// Banen er bygget af enkle former: kasser (plader, ramper, kanter), lodrette cylindre (runde plader,
// bumpere), ringe (donuts) og kugler. Kuglen ruller med 5/7 af tyngdekraften (som en rigtig massiv kugle),
// og når man vipper, vipper tyngdekraften med — præcis som når hele banen hælder.
import * as THREE from "./three.js";

export const R = 0.55;

const c = { n: new THREE.Vector3(), d: 0, v: new THREE.Vector3() };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3();
const klem = (x, a, b) => x < a ? a : x > b ? b : x;

// ---------- Formerne ----------
function fælles(f) {
  f.fart = new THREE.Vector3();   // formens fart (for flydende plader og drejende stænger)
  f.delta = new THREE.Vector3();  // hvor meget den flyttede sig i sidste trin
  f.w = 0;                        // drejefart om lodret akse
  f.hop ??= 0; f.slag ??= 0; f.art ??= "jord";
  return f;
}
export function kasse({ pos, halv, rot = new THREE.Quaternion(), ...ekstra }) {
  return fælles({ form: "kasse", pos: pos.clone(), rot: rot.clone(), inv: rot.clone().invert(), halv: halv.clone(), radius: halv.length(), ...ekstra });
}
export function cylinder({ pos, r, hh, ...ekstra }) {
  return fælles({ form: "cyl", pos: pos.clone(), r, hh, radius: Math.hypot(r, hh), ...ekstra });
}
export function ring({ pos, akse, rr, r, ...ekstra }) {
  return fælles({ form: "ring", pos: pos.clone(), akse: akse.clone().normalize(), rr, r, radius: rr + r, ...ekstra });
}
export function kugleForm({ pos, r, ...ekstra }) {
  return fælles({ form: "kugle", pos: pos.clone(), r, radius: r, ...ekstra });
}

// Plader der sejler frem og tilbage. De holder en lille pause i hver ende, så man kan nå at komme om bord.
export function sejl(f, fra, til, tid, fase = 0) {
  const A = new THREE.Vector3(...fra), B = new THREE.Vector3(...til), ny = new THREE.Vector3();
  const blød = x => x * x * (3 - 2 * x);
  f.bevæg = (t, dt) => {
    const u = ((t / tid + fase) % 1 + 1) % 1;
    const s = u < 0.22 ? 0 : u < 0.5 ? blød((u - 0.22) / 0.28) : u < 0.72 ? 1 : 1 - blød((u - 0.72) / 0.28);
    ny.lerpVectors(A, B, s);
    f.delta.subVectors(ny, f.pos);
    f.fart.copy(f.delta).divideScalar(dt || 1 / 240);
    f.pos.copy(ny);
  };
  f.bevæg(0, 1);
  f.delta.set(0, 0, 0); f.fart.set(0, 0, 0);
  return f;
}
// Stænger der drejer rundt om deres midte
export function drej(f, fart, start = 0) {
  const grund = f.rot.clone(), akse = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  f.w = fart;
  f.bevæg = t => {
    q.setFromAxisAngle(akse, start + fart * t);
    f.rot.multiplyQuaternions(q, grund);
    f.inv.copy(f.rot).invert();
  };
  f.bevæg(0);
  return f;
}

// Farten i et punkt på formen (flytning + drejning)
function punktFart(f, p, n, ud) {
  ud.copy(f.fart);
  if (f.w) {
    const rx = p.x - n.x * R - f.pos.x, rz = p.z - n.z * R - f.pos.z;
    ud.x += f.w * rz; ud.z -= f.w * rx;
  }
}

// ---------- Kontakt mellem kuglen og en form ----------
function kasseKontakt(f, p) {
  _v.copy(p).sub(f.pos).applyQuaternion(f.inv);
  const h = f.halv;
  const dx = _v.x - klem(_v.x, -h.x, h.x), dy = _v.y - klem(_v.y, -h.y, h.y), dz = _v.z - klem(_v.z, -h.z, h.z);
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 > R * R) return false;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    c.n.set(dx / d, dy / d, dz / d); c.d = R - d;
  } else {                                                  // midten er inde i kassen: ud den korteste vej
    const ex = h.x - Math.abs(_v.x), ey = h.y - Math.abs(_v.y), ez = h.z - Math.abs(_v.z);
    if (ey <= ex && ey <= ez) { c.n.set(0, Math.sign(_v.y) || 1, 0); c.d = ey + R; }
    else if (ex <= ez) { c.n.set(Math.sign(_v.x) || 1, 0, 0); c.d = ex + R; }
    else { c.n.set(0, 0, Math.sign(_v.z) || 1); c.d = ez + R; }
  }
  c.n.applyQuaternion(f.rot);
  return true;
}

function cylKontakt(f, p) {
  const dx = p.x - f.pos.x, dz = p.z - f.pos.z, dy = p.y - f.pos.y;
  const rad = Math.hypot(dx, dz);
  if (rad < f.r && Math.abs(dy) < f.hh) {
    const ey = f.hh - Math.abs(dy), er = f.r - rad;
    if (ey < er) { c.n.set(0, Math.sign(dy) || 1, 0); c.d = ey + R; }
    else { if (rad < 1e-6) c.n.set(1, 0, 0); else c.n.set(dx / rad, 0, dz / rad); c.d = er + R; }
    return true;
  }
  const k = rad > f.r ? f.r / rad : 1;
  const ex = dx - dx * k, ey = dy - klem(dy, -f.hh, f.hh), ez = dz - dz * k;
  const d2 = ex * ex + ey * ey + ez * ez;
  if (d2 > R * R || d2 < 1e-12) return false;
  const d = Math.sqrt(d2);
  c.n.set(ex / d, ey / d, ez / d); c.d = R - d;
  return true;
}

function ringKontakt(f, p) {
  _v.copy(p).sub(f.pos);
  _w.copy(_v).addScaledVector(f.akse, -_v.dot(f.akse));
  const l = _w.length();
  if (l < 1e-6) return false;
  _w.multiplyScalar(f.rr / l).add(f.pos);
  _v.copy(p).sub(_w);
  const d = _v.length();
  if (d > f.r + R || d < 1e-9) return false;
  c.n.copy(_v).divideScalar(d); c.d = f.r + R - d;
  return true;
}

function kugleKontakt(f, p) {
  _v.copy(p).sub(f.pos);
  const d = _v.length();
  if (d > f.r + R || d < 1e-9) return false;
  c.n.copy(_v).divideScalar(d); c.d = f.r + R - d;
  return true;
}

function kontakt(f, p) {
  const ok = f.form === "kasse" ? kasseKontakt(f, p) : f.form === "cyl" ? cylKontakt(f, p) : f.form === "ring" ? ringKontakt(f, p) : kugleKontakt(f, p);
  if (ok) punktFart(f, p, c.n, c.v);
  return ok;
}

// Stråle lige ned gennem en kasse: afstand til den flade, der vender opad (ellers null)
function kasseStråle(f, x, y, z) {
  const o = _v.set(x, y, z).sub(f.pos).applyQuaternion(f.inv);
  const d = _w.set(0, -1, 0).applyQuaternion(f.inv);
  let t0 = -Infinity, t1 = Infinity, akse = -1;
  for (let i = 0; i < 3; i++) {
    const oi = o.getComponent(i), di = d.getComponent(i), h = f.halv.getComponent(i);
    if (Math.abs(di) < 1e-9) { if (oi < -h || oi > h) return null; continue; }
    let ta = (-h - oi) / di, tb = (h - oi) / di;
    if (ta > tb) { const s = ta; ta = tb; tb = s; }
    if (ta > t0) { t0 = ta; akse = i; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;
  }
  if (t1 < 0 || akse < 0) return null;
  _n.set(0, 0, 0).setComponent(akse, -Math.sign(d.getComponent(akse))).applyQuaternion(f.rot);
  return _n.y > 0.3 ? t0 : null;
}

// ---------- Verdenen ----------
export class Fysik {
  constructor() { this.former = []; this.t = 0; }
  tilføj(f) { this.former.push(f); return f; }
  // flyt de bevægelige former frem til tiden t
  bevæg(t, dt) { this.t = t; for (const f of this.former) if (f.bevæg) f.bevæg(t, dt); }
  // Den øverste jord lige under et punkt (inden for maks)
  bundUnder(x, y, z, maks = 60) {
    let bedst = null, bt = maks;
    for (const f of this.former) {
      if (f.art !== "jord" && f.art !== "gulv") continue;
      let t = null;
      if (f.form === "kasse") {
        const dx = x - f.pos.x, dz = z - f.pos.z;
        if (dx * dx + dz * dz > f.radius * f.radius) continue;
        t = kasseStråle(f, x, y, z);
      } else if (f.form === "cyl") {
        if (Math.hypot(x - f.pos.x, z - f.pos.z) <= f.r) t = y - (f.pos.y + f.hh);
      }
      if (t != null && t > -0.6 && t < bt) { bt = t; bedst = f; }
    }
    return bedst ? { y: y - bt, form: bedst } : null;
  }
}

// ---------- Kuglen ----------
export class Kugle {
  constructor() {
    this.p = new THREE.Vector3(); this.v = new THREE.Vector3();
    this.påJorden = false; this.jordN = new THREE.Vector3(0, 1, 0); this.jordForm = null; this.jordV = new THREE.Vector3();
    this.tom = [];        // retninger uden jord lige foran (til kant-hjælpen)
    this.luft = 0;        // hvor længe kuglen har været i luften
  }
}

const RETNINGER = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(Math.cos(i * Math.PI / 4), 0, Math.sin(i * Math.PI / 4)));
// Kig rundt om kuglen: hvor er der ikke noget at trille på? (én gang pr. billede)
export function findKanter(fys, k) {
  k.tom.length = 0;
  if (!k.påJorden) return;
  for (const r of RETNINGER) {
    // et lille hul (mellem en plade og en flåde) tæller ikke: der skal også være tomt lidt længere ude
    if (fys.bundUnder(k.p.x + r.x * 0.8, k.p.y + 0.2, k.p.z + r.z * 0.8, 1.7)) continue;
    if (fys.bundUnder(k.p.x + r.x * 1.25, k.p.y + 0.2, k.p.z + r.z * 1.25, 1.9)) continue;
    k.tom.push(r);
  }
}

const G = new THREE.Vector3(), A = new THREE.Vector3(), rel = new THREE.Vector3(), relT = new THREE.Vector3(), nSum = new THREE.Vector3();

// Ét lille fysik-trin. styr = { x, z } er vippet i verdens retninger (længde højst 1).
// ind = { g, vip, maks, rul, bremse, hjælp, hjælpFart }. ud samler hændelser (stød, bumper, gulv).
export function trin(fys, k, styr, dt, ind, ud) {
  G.set(styr.x * ind.g * ind.vip, -ind.g, styr.z * ind.g * ind.vip);
  A.copy(G);
  if (k.påJorden) {
    const n = k.jordN, gn = G.dot(n);
    A.addScaledVector(n, -gn).multiplyScalar(5 / 7).addScaledVector(n, gn);     // rul: 5/7 af kraften langs jorden
    rel.copy(k.v).sub(k.jordV);
    relT.copy(rel).addScaledVector(n, -rel.dot(n));
    const s = relT.length();
    const styrer = styr.x * styr.x + styr.z * styr.z > 0.006;
    A.addScaledVector(relT, -(ind.rul + (styrer ? 0 : ind.bremse)));            // rullemodstand, og bremse når man slipper
    if (s > ind.maks) A.addScaledVector(relT, -(s - ind.maks) * 3 / s);        // blød fartgrænse
    if (ind.hjælp && k.tom.length && s < ind.hjælpFart) {
      for (const r of k.tom) {                                                  // ingen jord den vej: brems og vip ikke derud
        const udad = relT.x * r.x + relT.z * r.z;
        if (udad > 0) { A.x -= r.x * udad * 10; A.z -= r.z * udad * 10; }
        const skub = A.x * r.x + A.z * r.z;
        if (skub > 0) { A.x -= r.x * skub * 0.95; A.z -= r.z * skub * 0.95; }
      }
    }
  } else {
    A.addScaledVector(k.v, -0.04);
  }
  k.v.addScaledVector(A, dt);
  if (k.påJorden && k.jordForm && k.jordForm.bevæg) k.p.add(k.jordForm.delta);  // følg med flåden
  k.p.addScaledVector(k.v, dt);

  // Kollisioner (et par gange, så hjørner sidder godt)
  let jord = false, jf = null;
  nSum.set(0, 0, 0);
  for (let it = 0; it < 3; it++) {
    let ramt = false;
    for (const f of fys.former) {
      const rr = f.radius + R;
      if (f.pos.distanceToSquared(k.p) > rr * rr) continue;
      if (!kontakt(f, k.p)) continue;
      ramt = true;
      k.p.addScaledVector(c.n, c.d);
      rel.copy(k.v).sub(c.v);
      const vn = rel.dot(c.n);
      if (vn < 0) {
        let e = f.hop;
        if (!e) e = -vn > 3.5 && c.n.y < 0.7 ? 0.3 : -vn > 4 ? 0.18 : 0;     // hårde stød giver et lille hop
        k.v.addScaledVector(c.n, -vn * (1 + e));
        if (f.slag) { k.v.addScaledVector(c.n, f.slag); ud.bumper = f; }
        if (-vn > ud.stød) { ud.stød = -vn; ud.stødN.copy(c.n); }
        if (f.art === "gulv") ud.gulv = true;
      }
      // på en flåde flyttes kuglen med (se ovenfor), så dens fart regnes i forhold til flåden
      if (c.n.y > 0.5 && f.art !== "væg") { jord = true; nSum.add(c.n); jf = f; if (f.bevæg) k.jordV.set(0, 0, 0); else k.jordV.copy(c.v); }
    }
    if (!ramt) break;
  }
  k.påJorden = jord;
  k.jordForm = jf;
  if (jord) { k.jordN.copy(nSum.normalize()); k.luft = 0; }
  else { k.jordV.set(0, 0, 0); k.luft += dt; }
}
