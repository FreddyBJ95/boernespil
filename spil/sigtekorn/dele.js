// ===== Løse dele: hoveder, arme, ben og våben, der flyver af og falder med fysik =====
// Når en del bliver skudt af (eller soldaten falder fra hinanden), bliver den til en "klods": de otte hjørner af
// delens kasse er punkter, bundet sammen af stænger med fast længde (Verlet-fysik). Punkterne falder med
// tyngdekraften og støder mod banens kasser — så en arm kan tumle hen ad jorden og lægge sig på den flade side.
// Delene bliver liggende et stykke tid og synker så ned i sandet.

import * as THREE from "./three.js";

const TYNGDE = 11, RUNDER = 3, DÆMP = 0.996, GNID = 0.45;
const LIV = 22, SYNK = 2.5, MAKS = 140;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), pt = new THREE.Vector3();
const mx = new THREE.Matrix4(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const alle = [];

class Klods {
  // obj: en del, der allerede ligger direkte i scenen med sin verdens-matrix i obj.matrix
  constructor(obj, verden, fart, spin, lyd) {
    this.obj = obj; this.verden = verden; this.lyd = lyd; this.alder = 0; this.sover = 0; this.ramt = false;
    const kasse = lokalKasse(obj), m = obj.matrix, c = kasse.getCenter(new THREE.Vector3()), h = kasse.getSize(new THREE.Vector3()).multiplyScalar(0.46);
    h.x = Math.max(h.x, 0.02); h.y = Math.max(h.y, 0.02); h.z = Math.max(h.z, 0.02);
    // de otte hjørner (lidt inde i kassen, så delen ligger på jorden og ikke svæver)
    this.p = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) this.p.push(new THREE.Vector3(c.x + sx * h.x, c.y + sy * h.y, c.z + sz * h.z).applyMatrix4(m));
    const midt = this.p.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / 8);
    // farten: fremad + en drejning (spin) om midten
    this.f = this.p.map(p => { const r = v1.subVectors(p, midt); return p.clone().sub(fart.clone().add(v2.crossVectors(spin, r)).multiplyScalar(1 / 128)); });
    this.l = [];
    for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) this.l.push([a, b, this.p[a].distanceTo(this.p[b])]);
    // forskydningen mellem hjørnernes ramme og delens egen drejning og plads
    const q0 = ramme(this.p[0], this.p[1], this.p[2], qa).clone(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    m.decompose(pos, q, s);
    this.qOff = q0.clone().invert().multiply(q); this.pOff = pos.sub(this.p[0]).applyQuaternion(q0.invert()); this.skala = s;
    obj.matrixAutoUpdate = false;
  }
  trin(dt) {
    this.alder += dt;
    if (this.sover > 0.5) return;
    const { p, f } = this;
    let maks = 0;
    for (let i = 0; i < 8; i++) {
      v1.subVectors(p[i], f[i]).multiplyScalar(DÆMP); f[i].copy(p[i]); p[i].add(v1); p[i].y -= TYNGDE * dt * dt;
      maks = Math.max(maks, v1.lengthSq());
    }
    let stød = false;
    for (let k = 0; k < RUNDER; k++) {
      for (const [a, b, l] of this.l) stang(p[a], p[b], l);
      for (let i = 0; i < 8; i++) if (støde(this.verden, p[i], f[i], 0.012, k === RUNDER - 1)) stød = true;
    }
    if (stød && !this.ramt) { this.ramt = true; this.lyd?.(p[0], Math.sqrt(maks) / dt); }
    this.sover = Math.sqrt(maks) / dt < 0.05 ? this.sover + dt : 0;
  }
  tegn() {
    if (this.tegnet && this.sover > 0.5 && this.alder < LIV) return;
    this.tegnet = true;
    const q0 = ramme(this.p[0], this.p[1], this.p[2], qb);
    qa.copy(q0).multiply(this.qOff);
    pt.copy(this.pOff).applyQuaternion(q0).add(this.p[0]); pt.y -= Math.max(0, this.alder - LIV) / SYNK * 0.5;
    this.obj.matrix.compose(pt, qa, this.skala); this.obj.matrixWorldNeedsUpdate = true;
  }
}

// En dels størrelse i dens egne koordinater (også hvis den består af flere dele)
function lokalKasse(obj) {
  const kasse = new THREE.Box3();
  obj.updateWorldMatrix(false, true);
  const inv = obj.matrixWorld.clone().invert();
  obj.traverse(o => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    kasse.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
  });
  return kasse;
}
// Drejningen af en ramme gennem tre punkter: y fra a mod b, x så godt som muligt mod c
function ramme(a, b, c, ud) {
  const y = v1.subVectors(b, a).normalize(), x = v2.subVectors(c, a);
  x.addScaledVector(y, -x.dot(y));
  if (x.lengthSq() < 1e-10) x.set(1, 0, 0).addScaledVector(y, -y.x);
  x.normalize();
  mx.makeBasis(x, y, v3.crossVectors(x, y));
  return ud.setFromRotationMatrix(mx);
}
function stang(a, b, l) {
  v1.subVectors(b, a); const d = v1.length(); if (d < 1e-7) return;
  v1.multiplyScalar(((d - l) / d) * 0.5);
  a.add(v1); b.sub(v1);
}
// Et punkt støder mod banens kasser: skub det ud — og brems det langs fladen
function støde(verden, p, f, r, gnid) {
  let ramt = false;
  for (const k of verden.nær(p.x - r, p.z - r, p.x + r, p.z + r)) {
    const cx = Math.max(k.min[0], Math.min(p.x, k.max[0])), cy = Math.max(k.min[1], Math.min(p.y, k.max[1])), cz = Math.max(k.min[2], Math.min(p.z, k.max[2]));
    let nx = p.x - cx, ny = p.y - cy, nz = p.z - cz, d = Math.hypot(nx, ny, nz);
    if (d >= r) continue;
    if (d < 1e-7) {
      const ud = [[p.x - k.min[0], -1, 0, 0], [k.max[0] - p.x, 1, 0, 0], [p.y - k.min[1], 0, -1, 0], [k.max[1] - p.y, 0, 1, 0], [p.z - k.min[2], 0, 0, -1], [k.max[2] - p.z, 0, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      nx = ud[1]; ny = ud[2]; nz = ud[3]; d = -ud[0];
    } else { nx /= d; ny /= d; nz /= d; }
    const ind = r - d;
    p.x += nx * ind; p.y += ny * ind; p.z += nz * ind; ramt = true;
    if (gnid) {
      const vx = p.x - f.x, vy = p.y - f.y, vz = p.z - f.z, vn = vx * nx + vy * ny + vz * nz;
      const tx = vx - vn * nx, ty = vy - vn * ny, tz = vz - vn * nz, hop = vn < 0 ? -vn * 0.25 : 0;   // lidt hop, når den rammer
      f.x = p.x - tx * (1 - GNID) + hop * nx; f.y = p.y - ty * (1 - GNID) + hop * ny; f.z = p.z - tz * (1 - GNID) + hop * nz;
    }
  }
  return ramt;
}

// ---------- Til spillet ----------
// Lav en løs del af obj (en del af en soldat): en kopi lægges i scenen samme sted, og originalen skjules.
// fart og spin er Vector3 (m/s og rad/s). lyd(pos, fart) kaldes, første gang delen rammer noget
export function løsDel(obj, scene, verden, fart, spin, lyd) {
  obj.updateWorldMatrix(true, true);
  const kopi = obj.clone(); kopi.visible = true;                       // (skjulte hjelme o.l. i kopien forbliver skjulte)
  kopi.matrix.copy(obj.matrixWorld); kopi.matrixAutoUpdate = false; scene.add(kopi); kopi.updateMatrixWorld(true);
  obj.visible = false;
  const k = new Klods(kopi, verden, fart, spin, lyd);
  alle.push(k);
  while (alle.length > MAKS) fjern(alle.shift());
  return k;
}
function fjern(k) { k.obj.parent?.remove(k.obj); }
export function deleTrin(dt) {
  for (let i = alle.length - 1; i >= 0; i--) {
    const k = alle[i]; k.trin(dt);
    if (k.alder > LIV + SYNK) { fjern(k); alle.splice(i, 1); }
  }
}
export function deleTegn() { for (const k of alle) k.tegn(); }
export function ryddDele() { for (const k of alle) fjern(k); alle.length = 0; }
