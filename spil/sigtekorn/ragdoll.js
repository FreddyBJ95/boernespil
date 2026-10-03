// ===== Ragdoll: når en soldat dør, falder kroppen med rigtig fysik i stedet for en fast animation =====
// Kroppen bliver til 19 punkter (hoved, hals, bryst, mave, bækken, skuldre, albuer, hænder, hofter, knæ, fødder
// og tæer), bundet sammen af stænger med fast længde ("Verlet-fysik", som mange spil bruger). Punkterne falder
// med tyngdekraften, får et skub af kuglen, der dræbte, og støder mod banens kasser — så kroppen kan falde
// ned ad en trappe, hænge over en kasse eller glide ned ad en mur. Skelettets knogler drejes, så de følger
// punkterne, og så følger kroppen og udstyret med. Våbnet tabes, og et hovedskud kan skyde hjelmen af.
// Ligene bliver liggende et stykke tid og synker så ned i sandet.

import * as THREE from "./three.js";

const TYNGDE = 11, RUNDER = 8, DÆMP = 0.997, GNID = 0.35;      // m/s², gentagelser af stængerne, luftmodstand, gnidning mod jorden
const LIG_TID = 22, SYNK = 2.5, MAKS_LIG = 14;

// Punkterne: navn, knoglen det sidder på (three.js fjerner punktummet: "lår.R" i Blender hedder "lårR"), hvor langt ude ad knoglen (meter) og hvor tykt det er (radius)
const PUNKTER = [
  ["bækken", "hofte", 0, 0.13], ["mave", "mave", 0, 0.13], ["bryst", "bryst", 0, 0.14], ["hals", "hals", 0, 0.08], ["hoved", "hoved", 0.12, 0.12],
  ["skulderR", "overarmR", 0, 0.07], ["albueR", "underarmR", 0, 0.06], ["håndR", "håndR", 0, 0.05],
  ["skulderL", "overarmL", 0, 0.07], ["albueL", "underarmL", 0, 0.06], ["håndL", "håndL", 0, 0.05],
  ["hofteR", "lårR", 0, 0.08], ["knæR", "skinnebenR", 0, 0.07], ["fodR", "fodR", 0, 0.06], ["tåR", "fodR", 0.17, 0.05],
  ["hofteL", "lårL", 0, 0.08], ["knæL", "skinnebenL", 0, 0.07], ["fodL", "fodL", 0, 0.06], ["tåL", "fodL", 0.17, 0.05],
];
const NR = Object.fromEntries(PUNKTER.map((p, i) => [p[0], i]));
// Stængerne: [punkt, punkt, stivhed]. Overkroppen er afstivet med krydsstænger, ryggen og nakken er lidt bløde
const STÆNGER = [
  ["bækken", "mave"], ["mave", "bryst"], ["bryst", "hals"], ["hals", "hoved"],
  ["skulderR", "skulderL"], ["skulderR", "hals"], ["skulderL", "hals"], ["skulderR", "bryst"], ["skulderL", "bryst"], ["skulderR", "mave"], ["skulderL", "mave"],
  ["hofteR", "hofteL"], ["hofteR", "bækken"], ["hofteL", "bækken"], ["hofteR", "mave"], ["hofteL", "mave"],
  ["bækken", "bryst", 0.35], ["mave", "hals", 0.35], ["hofteR", "skulderL", 0.15], ["hofteL", "skulderR", 0.15],
  ["hoved", "skulderR", 0.3], ["hoved", "skulderL", 0.3], ["hoved", "bryst", 0.3],
  ["skulderR", "albueR"], ["albueR", "håndR"], ["skulderL", "albueL"], ["albueL", "håndL"],
  ["hofteR", "knæR"], ["knæR", "fodR"], ["fodR", "tåR"], ["knæR", "tåR"],
  ["hofteL", "knæL"], ["knæL", "fodL"], ["fodL", "tåL"], ["knæL", "tåL"],
].map(([a, b, s = 1]) => [NR[a], NR[b], s]);
// "Muskler": holder kroppens form det første halve sekund (stivheden falder til 0), så den vælter som en hel
// krop — bagover af et hovedskud, fremover, hvis den løb — og først derefter bliver slap
const MUSKLER = [["hofteR", "fodR", 0.5], ["hofteL", "fodL", 0.5], ["bryst", "knæR", 0.35], ["bryst", "knæL", 0.35], ["hoved", "bækken", 0.4],
  ["mave", "fodR", 0.25], ["mave", "fodL", 0.25], ["skulderR", "håndR", 0.2], ["skulderL", "håndL", 0.2]].map(([a, b, s]) => [NR[a], NR[b], s]);
const MUSKEL_TID = 0.5;
// Mindste afstande, så knæ og albuer ikke foldes helt sammen, og hovedet ikke ryger ind i brystet
const MINDST = [["hofteR", "fodR", 0.42], ["hofteL", "fodL", 0.42], ["skulderR", "håndR", 0.17], ["skulderL", "håndL", 0.17],
  ["hoved", "mave", 0.38], ["håndR", "mave", 0.12], ["håndL", "mave", 0.12], ["fodR", "fodL", 0.12], ["knæR", "knæL", 0.1]].map(([a, b, d]) => [NR[a], NR[b], d]);
// Knoglerne, der følger punkterne: [knogle, fra, til, retning til siden]. Forældre før børn
const KNOGLER = [
  ["hofte", "bækken", "mave", "hofteR"], ["mave", "mave", "bryst", "hofteR"], ["bryst", "bryst", "hals", "skulderR"], ["hals", "hals", "hoved", "skulderR"],
  ["overarmR", "skulderR", "albueR", "bryst"], ["underarmR", "albueR", "håndR", "bryst"],
  ["overarmL", "skulderL", "albueL", "bryst"], ["underarmL", "albueL", "håndL", "bryst"],
  ["lårR", "hofteR", "knæR", "hofteL"], ["skinnebenR", "knæR", "fodR", "tåR"], ["fodR", "fodR", "tåR", "knæR"],
  ["lårL", "hofteL", "knæL", "hofteR"], ["skinnebenL", "knæL", "fodL", "tåL"], ["fodL", "fodL", "tåL", "knæL"],
];
// Hvor kuglen skubber: kropsdelen → punkter og hvor meget
const SKUB = {
  hoved: [["hoved", 1], ["hals", 0.55], ["bryst", 0.2]], krop: [["bryst", 1], ["skulderR", 0.6], ["skulderL", 0.6], ["hals", 0.5], ["mave", 0.4]],
  mave: [["mave", 1], ["bækken", 0.7], ["bryst", 0.4]], ben: [["knæR", 0.8], ["knæL", 0.8], ["hofteR", 0.4], ["hofteL", 0.4]],
};

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), pt = new THREE.Vector3(), mx = new THREE.Matrix4(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const alle = [];

// ---------- Et lille stift legeme af tre punkter (våbnet og hjelmen) ----------
class Ting {
  constructor(obj, verden, fart) {
    this.obj = obj; this.verden = verden;
    obj.updateWorldMatrix(true, true);
    const kasse = lokalKasse(obj), str = kasse.getSize(new THREE.Vector3()), midt = kasse.getCenter(new THREE.Vector3());
    const akser = [[str.x, new THREE.Vector3(1, 0, 0)], [str.y, new THREE.Vector3(0, 1, 0)], [str.z, new THREE.Vector3(0, 0, 1)]].sort((a, b) => b[0] - a[0]);
    const lang = akser[0][1].clone().multiplyScalar(akser[0][0] * 0.45), bred = akser[1][1].clone().multiplyScalar(Math.max(0.03, akser[1][0] * 0.45));
    const lokal = [midt.clone().sub(lang), midt.clone().add(lang), midt.clone().add(bred)];
    this.p = lokal.map(l => l.applyMatrix4(obj.matrixWorld));
    this.r = Math.max(0.025, akser[2][0] * 0.5 * obj.getWorldScale(v1).x);
    this.f = this.p.map(p => p.clone().addScaledVector(fart, -1 / 128));
    this.l = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => [a, b, this.p[a].distanceTo(this.p[b])]);
    // forskydningen mellem trekanten og tingens egen drejning og plads
    const q0 = ramme(this.p[0], this.p[1], this.p[2], qa).clone(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    obj.matrixWorld.decompose(pos, q, s);
    this.qOff = q0.clone().invert().multiply(q); this.pOff = pos.sub(this.p[0]).applyQuaternion(q0.clone().invert()); this.skala = s;
    obj.matrixAutoUpdate = false; this.sover = 0;
  }
  trin(dt) {
    if (this.sover > 1) return;
    let maks = 0;
    for (let i = 0; i < 3; i++) {
      const p = this.p[i], f = this.f[i];
      v1.subVectors(p, f).multiplyScalar(DÆMP); f.copy(p); p.add(v1); p.y -= TYNGDE * dt * dt;
      maks = Math.max(maks, v1.length() / dt);
    }
    for (let k = 0; k < 4; k++) { for (const [a, b, l] of this.l) stang(this.p[a], this.p[b], l, 1, 1); for (let i = 0; i < 3; i++) støde(this.verden, this.p[i], this.f[i], this.r, k === 3); }
    this.sover = maks < 0.06 ? this.sover + dt : 0;
  }
  tegn(synk) {
    const q0 = ramme(this.p[0], this.p[1], this.p[2], qb);          // trekantens drejning
    qa.copy(q0).multiply(this.qOff);
    pt.copy(this.pOff).applyQuaternion(q0).add(this.p[0]); pt.y -= synk;
    this.obj.matrix.compose(pt, qa, this.skala); this.obj.matrixWorldNeedsUpdate = true;
  }
}

// ---------- Selve ragdollen ----------
class Ragdoll {
  constructor(model, scene, verden, fart, skud, lyd) {
    this.model = model; this.scene = scene; this.verden = verden; this.lyd = lyd; this.alder = 0; this.sover = 0; this.landet = false;
    model.updateWorldMatrix(true, true);
    const ben = n => model.getObjectByName(n);
    this.ben = {}; for (const [n] of KNOGLER) this.ben[n] = ben(n);
    // punkterne der, hvor knoglerne er lige nu (midt i den animation, soldaten var i gang med)
    this.p = PUNKTER.map(([, b, ud]) => { const k = ben(b); return k.localToWorld(new THREE.Vector3(0, ud / k.getWorldScale(v1).y, 0)); });
    this.r = PUNKTER.map(p => p[3]);
    const skub = SKUB[skud?.del] || SKUB.krop, kraft = skud?.kraft ?? 3;
    this.f = this.p.map((p, i) => {
      const v = fart.clone();
      for (const [n, k] of skub) if (NR[n] === i && skud) v.addScaledVector(skud.r, kraft * k);
      return p.clone().addScaledVector(v, -1 / 128);
    });
    this.l = STÆNGER.map(([a, b, s]) => [a, b, this.p[a].distanceTo(this.p[b]), s]);
    this.m = MUSKLER.map(([a, b, s]) => [a, b, this.p[a].distanceTo(this.p[b]), s]);
    // forskydningen mellem hver knogles ramme af punkter og knoglens egen drejning
    this.off = KNOGLER.map(([n, a, b, c]) => {
      const q = this.ben[n].getWorldQuaternion(new THREE.Quaternion());
      return ramme(this.p[NR[a]], this.p[NR[b]], this.p[NR[c]], qa).clone().invert().multiply(q);
    });
    this.ting = [];
  }
  // Våbnet ryger ud af hånden (og hjelmen af hovedet ved et hovedskud)
  slip(obj, fart) {
    if (obj.parent !== this.scene) {                                 // ud af hånden: læg den direkte i verdenen, samme sted
      obj.updateWorldMatrix(true, false);
      const m = obj.matrixWorld.clone(); obj.parent.remove(obj); this.scene.add(obj);
      obj.matrix.copy(m); obj.matrixWorld.copy(m); obj.matrixAutoUpdate = false;
    }
    this.ting.push(new Ting(obj, this.verden, fart));
  }
  trin(dt) {
    this.alder += dt;
    for (const t of this.ting) t.trin(dt);
    if (this.sover > 0.6) return;
    const { p, f, r } = this;
    let maks = 0;
    for (let i = 0; i < p.length; i++) {
      v1.subVectors(p[i], f[i]).multiplyScalar(DÆMP); f[i].copy(p[i]); p[i].add(v1); p[i].y -= TYNGDE * dt * dt;
      maks = Math.max(maks, v1.length() / dt);
    }
    const muskel = Math.max(0, 1 - this.alder / MUSKEL_TID);
    for (let k = 0; k < RUNDER; k++) {
      for (const [a, b, l, s] of this.l) stang(p[a], p[b], l, s, 1);
      if (muskel > 0) for (const [a, b, l, s] of this.m) stang(p[a], p[b], l, s * muskel, 1);
      for (const [a, b, d] of MINDST) { if (p[a].distanceTo(p[b]) < d) stang(p[a], p[b], d, 0.5, 1); }
      if (k % 2 === 1) for (let i = 0; i < p.length; i++) støde(this.verden, p[i], f[i], r[i], k === RUNDER - 1);
    }
    this.knæ();
    // lyden, når kroppen rammer jorden
    if (!this.landet && p[NR.bryst].y - this.verden.gulv(p[NR.bryst].x, p[NR.bryst].y + 0.3, p[NR.bryst].z) < 0.2) { this.landet = true; this.lyd?.(p[NR.bryst]); }
    this.sover = maks < 0.08 ? this.sover + dt : 0;
  }
  // Knæene bøjer kun fremad (ikke som en flamingo)
  knæ() {
    const p = this.p;
    v3.crossVectors(v1.subVectors(p[NR.hofteL], p[NR.hofteR]), v2.subVectors(p[NR.mave], p[NR.bækken])).normalize();   // bækkenets "frem"
    for (const [h, k, fo] of [["hofteR", "knæR", "fodR"], ["hofteL", "knæL", "fodL"]]) {
      const H = p[NR[h]], K = p[NR[k]], F = p[NR[fo]];
      v1.subVectors(F, H); const l2 = v1.lengthSq(); if (l2 < 1e-6) continue;
      const t = v2.subVectors(K, H).dot(v1) / l2;
      v2.copy(H).addScaledVector(v1, t); v2.subVectors(K, v2);                 // fra benets linje ud til knæet
      const s = v2.dot(v3);
      if (s < 0) { K.addScaledVector(v3, -s * 1.5); this.f[NR[k]].addScaledVector(v3, -s * 1.5); }
    }
  }
  tegn() {
    const synk = Math.max(0, this.alder - LIG_TID) / SYNK * 0.7;
    for (const t of this.ting) t.tegn(synk);
    if (this.tegnet && this.sover > 0.6 && synk === this.sidstSynk) return;
    this.tegnet = true; this.sidstSynk = synk;
    const p = this.p;
    // bækkenet først: knoglens plads følger punktet (de andre knogler har fast længde)
    const hofte = this.ben.hofte;
    v1.copy(p[NR.bækken]); v1.y -= synk; hofte.parent.updateWorldMatrix(true, false); hofte.position.copy(hofte.parent.worldToLocal(v1));
    KNOGLER.forEach(([n, a, b, c], i) => {
      const k = this.ben[n];
      const q = ramme(p[NR[a]], p[NR[b]], p[NR[c]], qa).multiply(this.off[i]);
      k.parent.getWorldQuaternion(qb);
      k.quaternion.copy(qb.invert().multiply(q));
      k.updateMatrixWorld(true);
    });
  }
  fjern() {
    this.scene.remove(this.model);
    for (const t of this.ting) this.scene.remove(t.obj);
    this.model.traverse(o => { if (o.isMesh) o.material.dispose(); });
  }
}

// Tingens størrelse i dens egne koordinater (også hvis den består af flere dele)
function lokalKasse(obj) {
  const kasse = new THREE.Box3(), inv = obj.matrixWorld.clone().invert();
  obj.traverse(o => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    kasse.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
  });
  return kasse;
}
// Drejningen af en ramme lagt gennem tre punkter: y peger fra a mod b, x så godt som muligt mod c
function ramme(a, b, c, ud) {
  const y = v1.subVectors(b, a).normalize(), x = v2.subVectors(c, a);
  x.addScaledVector(y, -x.dot(y));
  if (x.lengthSq() < 1e-8) x.set(1, 0, 0).addScaledVector(y, -y.x);
  x.normalize();
  const z = v3.crossVectors(x, y);
  mx.makeBasis(x, y, z);
  return ud.setFromRotationMatrix(mx);
}
// En stang: skub de to punkter mod den rigtige afstand (s = stivhed 0..1)
function stang(a, b, l, s) {
  v1.subVectors(b, a); const d = v1.length(); if (d < 1e-6) return;
  v1.multiplyScalar(((d - l) / d) * 0.5 * s);
  a.add(v1); b.sub(v1);
}
// Et punkt (kugle med radius r) støder mod banens kasser: skub det ud — og brems det langs fladen (gnidning)
function støde(verden, p, f, r, gnid) {
  for (const k of verden.nær(p.x - r, p.z - r, p.x + r, p.z + r)) {
    const cx = Math.max(k.min[0], Math.min(p.x, k.max[0])), cy = Math.max(k.min[1], Math.min(p.y, k.max[1])), cz = Math.max(k.min[2], Math.min(p.z, k.max[2]));
    let nx = p.x - cx, ny = p.y - cy, nz = p.z - cz, d = Math.hypot(nx, ny, nz);
    if (d >= r) continue;
    if (d < 1e-6) {                                                  // midten er inde i kassen: ud ad den korteste vej
      const ud = [[p.x - k.min[0], -1, 0, 0], [k.max[0] - p.x, 1, 0, 0], [p.y - k.min[1], 0, -1, 0], [k.max[1] - p.y, 0, 1, 0], [p.z - k.min[2], 0, 0, -1], [k.max[2] - p.z, 0, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      nx = ud[1]; ny = ud[2]; nz = ud[3]; d = -ud[0];
    } else { nx /= d; ny /= d; nz /= d; }
    const ind = r - d;
    p.x += nx * ind; p.y += ny * ind; p.z += nz * ind;
    if (gnid) {                                                      // farten langs fladen bliver mindre
      const vx = p.x - f.x, vy = p.y - f.y, vz = p.z - f.z, vn = vx * nx + vy * ny + vz * nz;
      const tx = vx - vn * nx, ty = vy - vn * ny, tz = vz - vn * nz;
      f.x = p.x - tx * (1 - GNID) - Math.max(0, vn) * nx; f.y = p.y - ty * (1 - GNID) - Math.max(0, vn) * ny; f.z = p.z - tz * (1 - GNID) - Math.max(0, vn) * nz;
    }
  }
}

// ---------- Til spillet ----------
// En soldat døde: lav hans ragdoll. skud = { r: kuglens retning, del: kropsdelen, kraft: m/s }, lyd(pos) når kroppen lander
export function nyRagdoll(model, scene, verden, fart, skud, lyd) {
  const rd = new Ragdoll(model, scene, verden, fart, skud, lyd);
  alle.push(rd);
  while (alle.length > MAKS_LIG) alle.shift().fjern();
  return rd;
}
export function ragdollTrin(dt) {
  for (let i = alle.length - 1; i >= 0; i--) {
    const rd = alle[i];
    rd.trin(dt);
    if (rd.alder > LIG_TID + SYNK) { rd.fjern(); alle.splice(i, 1); }
  }
}
export function ragdollTegn() { for (const rd of alle) rd.tegn(); }
export function ryddRagdolls() { for (const rd of alle) rd.fjern(); alle.length = 0; }
