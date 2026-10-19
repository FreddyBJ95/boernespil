// ===== Delene: alle stykker af bygningerne — søjler, plader, mure, brædder, ruder og brokker =====
// Hver del er en kasse (eller en cylinder eller en kile i en skorsten) med sin egen vægt og styrke.
// Så længe bygningen står, sidder delene fast. Hver del ved, hvad den står på ("under") og hvad den
// hænger fast i ved siden af ("side"). Sprænges en søjle væk, regnes det ud, hvad der ikke længere
// bæres — og det falder. Dele, der falder samtidig, hænger sammen i én "klump", indtil klumpen rammer
// noget hårdt. Så brækker den over i etager eller stykker, og de hårdeste stød knuser delene til brokker.

import * as THREE from "../3d-faelles/three.module.js";
import { RAPIER, fysik } from "./fysik.js";
import { MATERIALER, lavMateriale } from "./materialer.js";
import { mobil } from "./enhed.js";

export const MAKS_KROPPE = mobil ? 420 : 1400;
const TOL = 0.04;
const Y = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpS = new THREE.Vector3();
const NUL = new THREE.Matrix4().makeScale(0, 0, 0);

// ---------- Formerne (alle i en kasse fra -0,5 til 0,5, så de kan strækkes til enhver størrelse) ----------
// En kile: stykket af en rund skorsten — bred udadtil (+z) og smallere indadtil
const KILE_INDE = 0.68;
function kilePunkter(k = KILE_INDE) {
  const p = [];
  for (const y of [-0.5, 0.5]) for (const [x, z] of [[-0.5, 0.5], [0.5, 0.5], [k / 2, -0.5], [-k / 2, -0.5]]) p.push(x, y, z);
  return p;
}
function lavKile() {
  const p = kilePunkter(), v = i => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
  const flader = [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]];
  const pos = [];
  for (const f of flader) for (const t of [[f[0], f[1], f[2]], [f[0], f[2], f[3]]]) for (const i of t) pos.push(...v(i));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
// Brokker: en kasse, hvis hjørner er hakket skævt af — så de ligner stykker af knust beton
function lavBrok(frø) {
  let s = frø * 9301 + 49297;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const g = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2), p = g.attributes.position, flyt = new Map();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nøgle = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    if (!flyt.has(nøgle)) {
      const hjørne = Math.abs(x) + Math.abs(y) + Math.abs(z) > 1.4;
      const k = hjørne ? 0.12 + r() * 0.3 : 0.02 + r() * 0.16;
      flyt.set(nøgle, [x * (1 - k * (0.5 + r())) + (r() - 0.5) * 0.08, y * (1 - k * (0.5 + r())) + (r() - 0.5) * 0.08, z * (1 - k * (0.5 + r())) + (r() - 0.5) * 0.08]);
    }
    const [nx, ny, nz] = flyt.get(nøgle); p.setXYZ(i, nx, ny, nz);
  }
  const ud = g.toNonIndexed(); ud.computeVertexNormals(); g.dispose();
  return ud;
}
export const BROK_FORMER = 6;

// ---------- Et parti: mange ens former i ét InstancedMesh (én tegning til hundredvis af dele) ----------
class Parti {
  constructor(scene, geo, mat, n) {
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));            // farverne skal findes fra start (ellers bygges skyggekoden om midt i spillet)
    this.n = n; this.ledige = []; this.ændret = false;
    scene.add(this.mesh);
  }
  tag() {
    if (this.ledige.length) return this.ledige.pop();
    if (this.mesh.count >= this.n) return -1;
    return this.mesh.count++;
  }
  sæt(i, p, q, s) { tmpM.compose(p, q, s); this.mesh.setMatrixAt(i, tmpM); this.ændret = true; }
  farve(i, c) { this.mesh.setColorAt(i, c); this.farveÆndret = true; }
  slip(i) { this.mesh.setMatrixAt(i, NUL); this.ledige.push(i); this.ændret = true; }
  opdater() {
    this.mesh.visible = this.mesh.count > this.ledige.length;
    if (this.ændret) { this.mesh.instanceMatrix.needsUpdate = true; this.ændret = false; }
    if (this.farveÆndret) { this.mesh.instanceColor.needsUpdate = true; this.farveÆndret = false; }
  }
  tøm() { this.mesh.count = 0; this.ledige.length = 0; this.ændret = true; }
}

// ---------- Alle dele i verdenen ----------
export class Dele {
  constructor(scene, fotos, ruder) {
    this.scene = scene; this.fotos = fotos; this.ruder = ruder;
    this.materialer = {}; this.partier = new Map();
    this.geo = { kasse: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1), kile: lavKile(), brok: Array.from({ length: BROK_FORMER }, (_, i) => lavBrok(i + 1)) };
    this.hændelser = {};                                       // knus, løsn, stød, split (sættes af spillet: støv og lyd)
    this.nulstil();
  }
  nulstil() {
    for (const p of this.partier.values()) p.tøm();
    this.alle = new Set(); this.levende = new Set(); this.klumper = new Set(); this.bygninger = [];
    this.kø = { løsn: new Set(), knus: [], split: new Set() };
    this.næsteId = 1; this.knustDetteTrin = 0;
  }
  materiale(navn) { return this.materialer[navn] ??= lavMateriale(navn, this.fotos); }
  parti(form, mat) {
    const nøgle = `${form}:${mat}`;
    let p = this.partier.get(nøgle);
    if (!p) {
      const geo = form.startsWith("brok") ? this.geo.brok[+form.slice(4)] : this.geo[form];
      p = new Parti(this.scene, geo, this.materiale(mat), form.startsWith("brok") ? 700 : 1600);
      this.partier.set(nøgle, p);
    }
    return p;
  }
  // Lav partierne på forhånd (så skærmkortet ikke skal bygge nye tegneprogrammer midt i en sprængning)
  forbered(materialer) {
    for (const m of materialer) {
      this.parti("kasse", m);
      if (MATERIALER[m].brok) for (let i = 0; i < BROK_FORMER; i++) this.parti("brok" + i, m);
    }
  }

  // ---------- Lav en del ----------
  // spec: { form, mat, str: [x, y, z], pos: [x, y, z], yaw | kvat, fast, bygning, spænd, krav, ring, brok }
  lav(spec) {
    const m = MATERIALER[spec.mat], form = spec.form || "kasse";
    const str = new THREE.Vector3(...spec.str), pos = new THREE.Vector3(...spec.pos);
    const q = spec.kvat ? spec.kvat.clone() : new THREE.Quaternion().setFromAxisAngle(Y, spec.yaw || 0);
    const parti = this.parti(form, spec.mat), i = parti.tag();
    if (i < 0) return null;
    const vol = form === "cylinder" ? Math.PI / 4 * str.x * str.z * str.y : form === "kile" ? str.x * str.y * str.z * (1 + KILE_INDE) / 2 : str.x * str.y * str.z * (form.startsWith("brok") ? 0.62 : 1);
    const mål = [str.x, str.y, str.z].sort((a, b) => a - b);
    const del = {
      id: this.næsteId++, form, mat: spec.mat, str, vol, masse: vol * m.vægt,
      styrke: Math.max(2e4, (0.7e6 / m.brud) * mål[0] * mål[1]),
      fast: !!spec.fast, bygning: spec.bygning || null, spænd: !!spec.spænd, krav: spec.krav ?? 0.3, ring: spec.ring ?? -1, bærer: !!spec.bærer, brok: !!spec.brok,
      under: [], side: [], grund: false, arealUnder: 0,
      oprPos: pos.clone(), oprQ: q.clone(), parti, i, farve: new THREE.Color(spec.tone ?? 0xffffff),
      vinduer: [], ladninger: [], klynge: null, lok: null, krop: null, kol: null, væk: false, sod: 0,
    };
    if (spec.tone === undefined) {                               // hver del sin nuance
      const l = 0.86 + Math.random() * 0.2;
      del.farve.setRGB(l * (0.98 + Math.random() * 0.04), l, l * (0.97 + Math.random() * 0.05));
    }
    this.lavKrop(del, pos, q, del.fast);
    parti.sæt(i, pos, q, str); parti.farve(i, del.farve);
    this.alle.add(del);
    if (!del.fast) this.levende.add(del);
    if (del.bygning) del.bygning.dele.push(del);
    return del;
  }
  kolliderBeskrivelse(del, faktor = 1) {
    const s = del.str, m = MATERIALER[del.mat];
    let cd;
    if (del.form === "cylinder") cd = RAPIER.ColliderDesc.cylinder(s.y / 2, s.x / 2);
    else if (del.form === "kile") cd = RAPIER.ColliderDesc.convexHull(new Float32Array(kilePunkter().map((v, i) => v * [s.x, s.y, s.z][i % 3])));
    else if (del.form.startsWith("brok")) cd = RAPIER.ColliderDesc.cuboid(s.x * 0.43, s.y * 0.43, s.z * 0.43);
    else cd = RAPIER.ColliderDesc.cuboid(s.x / 2, s.y / 2, s.z / 2);
    cd.setDensity(m.vægt * faktor).setFriction(del.form.startsWith("brok") ? 0.95 : 0.8).setRestitution(0.02);
    // Små brokker giver ingen besked om stød (der er for mange af dem); store dele gør
    const lyd = del.brok && del.vol < 0.03 ? 0 : Math.min(del.styrke, del.masse * 9.81 * 6);
    if (lyd > 0 || del.fast) cd.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(del.fast ? del.styrke : Math.max(lyd, 400));
    return cd;
  }
  lavKrop(del, pos, q, fast) {
    const d = (fast ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
      .setTranslation(pos.x, pos.y, pos.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    if (!fast) d.setLinearDamping(0.03).setAngularDamping(0.2);
    if (!fast && del.brok && del.vol < 0.02) d.setCcdEnabled(true);
    del.krop = fysik.verden.createRigidBody(d);
    del.kol = fysik.verden.createCollider(this.kolliderBeskrivelse(del), del.krop);
    fysik.ejere.set(del.kol.handle, del);
  }
  fjernKrop(del) {
    if (del.kol) fysik.ejere.delete(del.kol.handle);
    if (del.klynge) {
      const k = del.klynge;
      fysik.verden.removeCollider(del.kol, true); k.dele.delete(del); del.klynge = null;
      if (!k.dele.size) { this.slipHængsel(k); fysik.verden.removeRigidBody(k.krop); this.klumper.delete(k); }
    } else if (del.krop) fysik.verden.removeRigidBody(del.krop);
    del.krop = del.kol = null; del.lok = null;
  }

  // ---------- Hvor er delen nu? ----------
  sted(del, p = new THREE.Vector3(), q = new THREE.Quaternion()) {
    if (del.klynge) {
      const k = del.klynge.krop, t = k.translation(), r = k.rotation();
      tmpQ2.set(r.x, r.y, r.z, r.w);
      p.copy(del.lok.p).applyQuaternion(tmpQ2).add(tmpV2.set(t.x, t.y, t.z));
      q.copy(tmpQ2).multiply(del.lok.q);
    } else if (del.krop) {
      const t = del.krop.translation(), r = del.krop.rotation();
      p.set(t.x, t.y, t.z); q.set(r.x, r.y, r.z, r.w);
    }
    return { p, q };
  }
  // Delens fart i et punkt (også når den sidder i en klump, der drejer)
  fart(del, ud = new THREE.Vector3()) {
    const krop = del.klynge ? del.klynge.krop : del.krop;
    if (!krop || krop.isFixed()) return ud.set(0, 0, 0);
    const v = krop.linvel(), w = krop.angvel(), c = krop.worldCom ? krop.worldCom() : krop.translation();
    const { p } = this.sted(del, tmpV);
    const rx = p.x - c.x, ry = p.y - c.y, rz = p.z - c.z;
    return ud.set(v.x + w.y * rz - w.z * ry, v.y + w.z * rx - w.x * rz, v.z + w.x * ry - w.y * rx);
  }
  // Delens kasse i verdenen (til støtte og til at regne højden ud)
  aabb(del, box = new THREE.Box3()) {
    const { p, q } = this.sted(del, new THREE.Vector3(), tmpQ);
    const h = tmpS.copy(del.str).multiplyScalar(0.5);
    box.makeEmpty();
    for (let i = 0; i < 8; i++) box.expandByPoint(tmpV.set(i & 1 ? h.x : -h.x, i & 2 ? h.y : -h.y, i & 4 ? h.z : -h.z).applyQuaternion(q).add(p));
    return box;
  }

  // ---------- Bygningens statik: hvad står på hvad ----------
  bygStatik(bygning) {
    const dele = bygning.dele.filter(d => d.fast), celle = 3, gitter = new Map();
    for (const d of dele) {
      d.box = this.aabb(d);
      const b = d.box;
      for (let x = Math.floor(b.min.x / celle); x <= Math.floor(b.max.x / celle); x++)
        for (let z = Math.floor(b.min.z / celle); z <= Math.floor(b.max.z / celle); z++) {
          const k = x * 10007 + z; if (!gitter.has(k)) gitter.set(k, []); gitter.get(k).push(d);
        }
      d.grund = b.min.y < TOL;
    }
    const set = new Set();
    for (const liste of gitter.values()) for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], b = liste[j], nøgle = a.id < b.id ? a.id * 100003 + b.id : b.id * 100003 + a.id;
      if (set.has(nøgle)) continue; set.add(nøgle);
      const A = a.box, B = b.box;
      const ox = Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x), oz = Math.min(A.max.z, B.max.z) - Math.max(A.min.z, B.min.z);
      const oy = Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y);
      if (ox < -TOL || oz < -TOL || oy < -TOL) continue;
      const areal = Math.max(0, ox) * Math.max(0, oz);
      // B står under A, hvis B's top er ved A's bund (eller inden for den nederste halvdel af en skrå del)
      const underA = (A, B) => B.max.y >= A.min.y - TOL && B.max.y <= (A.min.y + A.max.y) / 2 && (B.min.y + B.max.y) / 2 < A.min.y;
      if (areal > 1e-3 && underA(A, B)) { a.under.push({ del: b, areal }); a.arealUnder += areal; }
      else if (areal > 1e-3 && underA(B, A)) { b.under.push({ del: a, areal }); b.arealUnder += areal; }
      else if (oy > 0.15 * Math.min(A.max.y - A.min.y, B.max.y - B.min.y)) { a.side.push(b); b.side.push(a); }
    }
    bygning.massecentrum = new THREE.Vector3();
  }
  // Regn efter, om alt i bygningen stadig bæres. Det, der ikke gør, falder (samlet i klumper)
  tjekStatik(bygning) {
    const fast = bygning.dele.filter(d => d.fast && !d.væk);
    if (!fast.length) return;
    fast.sort((a, b) => a.oprPos.y - b.oprPos.y);
    const dybde = new Map();                                   // 0 = står på noget, 1-2 = hænger i naboerne
    for (let gang = 0; gang < 3; gang++) for (const d of fast) {
      if (dybde.get(d) === 0) continue;
      if (d.grund) { dybde.set(d, 0); continue; }
      let a = 0;
      for (const u of d.under) if (u.del.fast && dybde.get(u.del) === 0) a += u.areal;
      if (a >= d.arealUnder * d.krav - 1e-6 && a > 0) { dybde.set(d, 0); continue; }
      if (d.spænd) {
        let n = 0, mindst = 9;
        for (const s of d.side) { const ds = s.fast ? dybde.get(s) : undefined; if (ds !== undefined && ds < 2) { n++; mindst = Math.min(mindst, ds); } }
        if (n >= 2) dybde.set(d, mindst + 1);
      }
    }
    let løse = fast.filter(d => !dybde.has(d)), hængsel = null;
    if (bygning.tårn) {
      const t = this.tårnVælter(bygning, fast.filter(d => dybde.has(d)));
      if (t) { løse = løse.concat(t.dele); hængsel = t.hængsel; }
    }
    if (løse.length) this.løsn(løse, { klump: true, hængsel });
  }
  // Et tårn (skorsten, vandtårn) vælter, når en ring er så svækket, at vægten over den ikke længere står over det, der er tilbage
  tårnVælter(bygning, fast) {
    const ringe = new Map();
    for (const d of fast) if (d.ring >= 0) { if (!ringe.has(d.ring)) ringe.set(d.ring, []); ringe.get(d.ring).push(d); }
    const numre = [...ringe.keys()].sort((a, b) => a - b);
    for (const r of numre) {
      const bære = ringe.get(r).filter(d => d.bærer);
      if (!bære.length) continue;
      const top = Math.max(...bære.map(d => d.oprPos.y + d.str.y / 2));
      const over = fast.filter(d => d.oprPos.y > top - 0.05);
      if (!over.length) continue;
      const fuld = bygning.ringAreal?.[r] || 1;
      const tilbage = bære.reduce((s, d) => s + d.str.x * d.str.z, 0);
      // massecentret af alt over ringen
      let m = 0; const c = new THREE.Vector3();
      for (const d of over) { c.addScaledVector(d.oprPos, d.masse); m += d.masse; }
      c.divideScalar(m);
      // hvor langt ude står det, der er tilbage af ringen?
      const pkt = bære.map(d => [d.oprPos.x, d.oprPos.z]);
      const indenfor = iPolygon(c.x, c.z, konveksHylster(pkt), 0.15);
      if (tilbage < fuld * 0.42 || !indenfor) {
        // det vælter mod den side, hvor ringen er svagest (væk fra det, der er tilbage)
        let bx = 0, bz = 0; for (const d of bære) { bx += d.oprPos.x; bz += d.oprPos.z; }
        const retning = new THREE.Vector3(c.x - bx / bære.length, 0, c.z - bz / bære.length);
        if (retning.lengthSq() < 1e-6) retning.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        retning.normalize();
        // hængslet: den forreste kant af det, der er tilbage af ringen — tårnet drejer om den linje
        let frem = -Infinity;
        for (const d of bære) frem = Math.max(frem, (d.oprPos.x - bygning.x) * retning.x + (d.oprPos.z - bygning.z) * retning.z + Math.min(d.str.x, d.str.z) * 0.5);
        const punkt = new THREE.Vector3(bygning.x + retning.x * frem, top, bygning.z + retning.z * frem);
        return { dele: over, hængsel: { punkt, retning, akse: new THREE.Vector3(retning.z, 0, -retning.x) } };
      }
    }
    return null;
  }

  // ---------- Løsn dele: de begynder at falde ----------
  // klump: dele, der hænger sammen, falder som én klump (en etage, en hel skorsten)
  løsn(liste, { klump = false, hængsel = null } = {}) {
    liste = liste.filter(d => d.fast && !d.væk);
    if (!liste.length) return [];
    for (const d of liste) {
      d.fast = false; this.levende.add(d);
      if (d.bygning) d.bygning.ændret = true;
      this.hændelser.løsn?.(d);
    }
    // et lille skub ud af balance: løse mursten og søjler bliver ikke stående som tårne af klodser
    const vip = (krop, k) => krop.setAngvel({ x: (Math.random() - 0.5) * k, y: (Math.random() - 0.5) * k * 0.3, z: (Math.random() - 0.5) * k }, true);
    if (!klump) {
      for (const d of liste) { d.krop.setBodyType(RAPIER.RigidBodyType.Dynamic, true); this.nyTærskel(d); vip(d.krop, 0.9); }
      return liste;
    }
    // find sammenhængende grupper
    const i = new Set(liste), set = new Set(), grupper = [];
    for (const d of liste) {
      if (set.has(d)) continue;
      const g = [], stak = [d]; set.add(d);
      while (stak.length) {
        const x = stak.pop(); g.push(x);
        for (const n of [...x.under.map(u => u.del), ...x.side, ...this.ovenpå(x)]) if (i.has(n) && !set.has(n)) { set.add(n); stak.push(n); }
      }
      grupper.push(g);
    }
    for (const g of grupper) {
      if (g.length === 1) { g[0].krop.setBodyType(RAPIER.RigidBodyType.Dynamic, true); this.nyTærskel(g[0]); vip(g[0].krop, 0.9); continue; }
      const k = this.lavKlump(g, 0);
      if (hængsel && k) this.hængsl(k, hængsel);
      else if (k) vip(k.krop, 0.12);
    }
    return liste;
  }
  ovenpå(d) { return d._over || (d._over = d.bygning ? d.bygning.dele.filter(x => x.under.some(u => u.del === d)) : []); }
  nyTærskel(d) {
    if (!d.kol) return;
    d.kol.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
    d.kol.setContactForceEventThreshold(Math.max(400, Math.min(d.styrke, d.masse * 9.81 * 6)));
  }
  // Tårnet drejer om et hængsel (det, der er tilbage af muren), indtil det hælder så meget, at hængslet knækker
  hængsl(k, h) {
    const anker = fysik.verden.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(h.punkt.x, h.punkt.y, h.punkt.z));
    const c = k.krop.translation();
    const data = RAPIER.JointData.revolute({ x: 0, y: 0, z: 0 }, { x: h.punkt.x - c.x, y: h.punkt.y - c.y, z: h.punkt.z - c.z }, { x: h.akse.x, y: h.akse.y, z: h.akse.z });
    k.hængsel = { led: fysik.verden.createImpulseJoint(data, anker, k.krop, true), anker };
    const s = k.masse * 0.15;                                   // et lille skub i den rigtige retning
    k.krop.applyTorqueImpulse({ x: h.akse.x * s, y: 0, z: h.akse.z * s }, true);
  }
  slipHængsel(k) {
    if (!k.hængsel) return;
    fysik.verden.removeImpulseJoint(k.hængsel.led, true); fysik.verden.removeRigidBody(k.hængsel.anker);
    k.hængsel = null;
  }
  // En klump: mange dele i én stiv krop (de bliver i hver deres form, men flytter sig sammen)
  lavKlump(dele, niveau, fart = null) {
    let m = 0; const c = new THREE.Vector3(), sted = new Map();
    for (const d of dele) { const s = this.sted(d, new THREE.Vector3(), new THREE.Quaternion()); sted.set(d, s); c.addScaledVector(s.p, d.masse); m += d.masse; }
    c.divideScalar(m);
    const vel = fart ? fart.v : null, rot = fart ? fart.w : null;
    const krop = fysik.verden.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(c.x, c.y, c.z).setLinearDamping(0.02).setAngularDamping(0.1));
    const k = { krop, dele: new Set(), masse: m, niveau, tærskel: m * 9.81 * (niveau ? 4 : 2.5), kraft: 0 };
    for (const d of dele) {
      const s = sted.get(d);
      if (d.kol) fysik.ejere.delete(d.kol.handle);
      if (d.klynge) { fysik.verden.removeCollider(d.kol, false); d.klynge.dele.delete(d); }
      else if (d.krop) fysik.verden.removeRigidBody(d.krop);
      d.krop = null; d.klynge = k; d.lok = { p: s.p.clone().sub(c), q: s.q.clone() };
      const cd = this.kolliderBeskrivelse(d).setTranslation(d.lok.p.x, d.lok.p.y, d.lok.p.z).setRotation({ x: s.q.x, y: s.q.y, z: s.q.z, w: s.q.w });
      cd.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(Math.max(1000, d.masse * 9.81 * 3));
      d.kol = fysik.verden.createCollider(cd, krop);
      fysik.ejere.set(d.kol.handle, d);
      k.dele.add(d);
    }
    if (vel) { krop.setLinvel(vel, true); krop.setAngvel(rot, true); }
    this.klumper.add(k);
    return k;
  }
  // Klumpen brækker: først i bånd (etager / stykker af skorstenen), næste gang i enkelte dele
  brækKlump(k) {
    if (!this.klumper.has(k)) return;
    this.slipHængsel(k);
    this.klumper.delete(k);
    const v = k.krop.linvel(), w = k.krop.angvel(), c = k.krop.worldCom();
    const dele = [...k.dele];
    const fartI = d => {
      const { p } = this.sted(d, new THREE.Vector3());
      const r = p.clone().sub(tmpV.set(c.x, c.y, c.z));
      return { x: v.x + w.y * r.z - w.z * r.y, y: v.y + w.z * r.x - w.x * r.z, z: v.z + w.x * r.y - w.y * r.x };
    };
    // grupper efter båndet (hvor højt delen sad, da bygningen stod)
    const bånd = new Map(), h = k.niveau === 0 ? (dele[0].bygning?.båndHøjde ?? 3) : 0;
    if (h > 0) for (const d of dele) { const b = Math.floor(d.oprPos.y / h); if (!bånd.has(b)) bånd.set(b, []); bånd.get(b).push(d); }
    const stederFør = new Map(dele.map(d => [d, { ...this.sted(d, new THREE.Vector3(), new THREE.Quaternion()), v: fartI(d) }]));
    fysik.verden.removeRigidBody(k.krop);
    for (const d of dele) { fysik.ejere.delete(d.kol.handle); d.kol = null; d.klynge = null; d.lok = null; }
    const enkelt = d => {
      const s = stederFør.get(d);
      this.lavKrop(d, s.p, s.q, false);
      d.krop.setLinvel(s.v, true); d.krop.setAngvel(w, true);
      this.nyTærskel(d);
    };
    if (h > 0 && bånd.size > 1) {
      for (const g of bånd.values()) {
        if (g.length < 3) { g.forEach(enkelt); continue; }
        for (const d of g) { const s = stederFør.get(d); this.lavKrop(d, s.p, s.q, false); }   // midlertidigt, så lavKlump kan læse stedet
        const midt = stederFør.get(g[Math.floor(g.length / 2)]).v;
        this.lavKlump(g, 1, { v: midt, w });
      }
    } else dele.forEach(enkelt);
    this.hændelser.split?.(k, c);
  }

  // ---------- Knus en del til brokker ----------
  // fra: sprængningens midte (eller null), skub: hvor hurtigt brokkerne kastes væk (m/s)
  knus(del, fra = null, skub = 0) {
    if (del.væk) return [];
    const m = MATERIALER[del.mat];
    if (del.fast) { del.fast = false; this.levende.add(del); if (del.bygning) del.bygning.ændret = true; }
    // stål og blik bøjer — de knuses ikke, men rives løs og kastes
    if (!m.brok || del.brok && del.vol < 0.05 || this.levende.size > MAKS_KROPPE) {
      if (del.klynge) this.løsFraKlump(del);
      else { del.krop.setBodyType(RAPIER.RigidBodyType.Dynamic, true); this.nyTærskel(del); }
      if (fra) this.skub(del, fra, skub);
      return [del];
    }
    const { p, q } = this.sted(del, new THREE.Vector3(), new THREE.Quaternion());
    const v0 = this.fart(del, new THREE.Vector3());
    // hvor mange stykker langs hver side
    const s = del.str, t = m.brok;
    let n = [s.x, s.y, s.z].map(x => Math.max(1, Math.min(4, Math.round(x / t))));
    if (m.splint) { const lang = [s.x, s.y, s.z].indexOf(Math.max(s.x, s.y, s.z)); n = [1, 1, 1]; n[lang] = Math.max(2, Math.min(4, Math.round(Math.max(s.x, s.y, s.z) / 0.9))); }
    const loft = this.levende.size > MAKS_KROPPE * 0.6 ? 3 : mobil ? 4 : 8;
    while (n[0] * n[1] * n[2] > loft) { const i = n.indexOf(Math.max(...n)); n[i]--; }
    if (n[0] * n[1] * n[2] === 1) n[[s.x, s.y, s.z].indexOf(Math.max(s.x, s.y, s.z))] = 2;
    this.fjernDel(del, false);
    const nye = [];
    for (let ix = 0; ix < n[0]; ix++) for (let iy = 0; iy < n[1]; iy++) for (let iz = 0; iz < n[2]; iz++) {
      const cs = [s.x / n[0], s.y / n[1], s.z / n[2]];
      const lok = new THREE.Vector3((ix + 0.5) / n[0] - 0.5, (iy + 0.5) / n[1] - 0.5, (iz + 0.5) / n[2] - 0.5).multiply(s);
      const pos = lok.applyQuaternion(q).add(p);
      const qr = q.clone().multiply(tmpQ.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)));
      const b = this.lav({
        form: m.splint ? "kasse" : "brok" + Math.floor(Math.random() * BROK_FORMER), mat: del.mat, brok: true, bygning: del.bygning,
        str: cs.map(x => x * (m.splint ? 0.96 : 0.9 + Math.random() * 0.12)), pos: [pos.x, pos.y, pos.z], kvat: qr, tone: undefined,
      });
      if (!b) continue;
      b.farve.copy(del.farve).multiplyScalar(0.92 + Math.random() * 0.1); b.parti.farve(b.i, b.farve); b.sod = del.sod;
      b.krop.setLinvel({ x: v0.x + (Math.random() - 0.5), y: v0.y + Math.random() * 0.6, z: v0.z + (Math.random() - 0.5) }, true);
      if (fra) this.skub(b, fra, skub * (0.6 + Math.random() * 0.7));
      b.krop.setAngvel({ x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4 }, true);
      nye.push(b);
    }
    this.hændelser.knus?.(del, p, nye);
    return nye;
  }
  løsFraKlump(del) {
    const { p, q } = this.sted(del, new THREE.Vector3(), new THREE.Quaternion()), v = this.fart(del, new THREE.Vector3());
    fysik.ejere.delete(del.kol.handle); fysik.verden.removeCollider(del.kol, true); del.klynge.dele.delete(del);
    if (!del.klynge.dele.size) { this.slipHængsel(del.klynge); fysik.verden.removeRigidBody(del.klynge.krop); this.klumper.delete(del.klynge); }
    del.klynge = null; del.lok = null;
    this.lavKrop(del, p, q, false); del.krop.setLinvel(v, true); this.nyTærskel(del);
  }
  // Skub en del væk fra et punkt (sprængningen), med en fart i m/s
  skub(del, fra, fart) {
    if (fart <= 0) return;
    const krop = del.klynge ? del.klynge.krop : del.krop;
    if (!krop || krop.isFixed()) return;
    const { p } = this.sted(del, tmpV);
    const r = tmpV2.copy(p).sub(fra); r.y = r.y * 0.6 + 0.35 * r.length(); r.normalize();
    const imp = del.masse * fart * (del.klynge ? 0.35 : 1);
    krop.applyImpulseAtPoint({ x: r.x * imp, y: r.y * imp, z: r.z * imp }, { x: p.x, y: p.y, z: p.z }, true);
  }
  // Fjern en del helt (knust eller faldet ud af verdenen)
  fjernDel(del, synligt = true) {
    if (del.væk) return;
    del.væk = true; del.fast = false;
    this.fjernKrop(del);
    del.parti.slip(del.i);
    this.alle.delete(del); this.levende.delete(del);
    for (const v of del.vinduer) this.ruder.knus(v);
    for (const l of del.ladninger) l.del = null;
    if (del.bygning) del.bygning.ændret = true;
    if (synligt) this.hændelser.fjern?.(del);
  }

  // ---------- Stød fra fysikken ----------
  stød(a, b, kraft) {
    for (const [d, anden] of [[a, b], [b, a]]) {
      if (!d || !d.str || d.væk) continue;
      if (d.klynge) { d.klynge.kraft += kraft; continue; }     // kræfterne lægges sammen for hele klumpen
      if (d.fast) {
        if (kraft > d.styrke && (!anden || !anden.fast)) { this.kø.løsn.add(d); if (kraft > d.styrke * 3) this.kø.knus.push(d); }
        continue;
      }
      if (kraft > d.styrke * 2.2 && !d.brok || (d.brok && d.vol > 0.25 && kraft > d.styrke * 4)) this.kø.knus.push(d);
      this.hændelser.stød?.(d, kraft);
    }
  }
  // Efter hvert fysiktrin: brug køen (fysikken må ikke ændres midt i sine egne beskeder)
  efterTrin() {
    for (const k of this.klumper) {
      if (k.hængsel) {                                         // hængslet knækker, når tårnet hælder ca. 25° (eller rammer noget hårdt)
        const q = k.krop.rotation();
        k.hængsel.tid = (k.hængsel.tid || 0) + 1 / 60;
        if (2 * Math.acos(Math.min(1, Math.abs(q.w))) > 0.45 || k.kraft > k.tærskel || k.hængsel.tid > 8) this.slipHængsel(k);
        else { k.kraft = 0; continue; }
      }
      if (k.kraft > k.tærskel) this.kø.split.add(k);
      k.kraft = 0;
    }
    for (const k of this.kø.split) this.brækKlump(k);
    this.kø.split.clear();
    if (this.kø.løsn.size) { this.løsn([...this.kø.løsn]); this.kø.løsn.clear(); }
    let n = 0;
    for (const d of this.kø.knus) { if (n++ > 8) break; if (!d.væk) this.knus(d); }
    this.kø.knus.length = 0;
    for (const b of this.bygninger) if (b.ændret) { b.ændret = false; this.tjekStatik(b); }
  }

  // ---------- Tegn: læg delene, hvor fysikken siger de er ----------
  synk() {
    for (const d of this.levende) {
      if (d.væk) continue;
      const krop = d.klynge ? d.klynge.krop : d.krop;
      if (!krop) continue;
      if (krop.isSleeping() && d.sovet) continue;
      d.sovet = krop.isSleeping();
      const { p, q } = this.sted(d, tmpV, tmpQ);
      if (p.y < -40) { this.fjernDel(d); continue; }
      d.parti.sæt(d.i, p, q, d.str);
      for (const l of d.ladninger) l.flyt?.();
    }
    for (const p of this.partier.values()) p.opdater();
  }
  // Sod: delen bliver mørkere nær en sprængning
  sværtNær(punkt, radius) {
    for (const d of this.alle) {
      if (d.væk || d.sod > 0.7) continue;
      const { p } = this.sted(d, tmpV);
      const a = p.distanceTo(punkt);
      if (a > radius) continue;
      d.sod = Math.min(0.75, d.sod + (1 - a / radius) * 0.5);
      tmpS.set(d.farve.r, d.farve.g, d.farve.b).multiplyScalar(1 - d.sod);
      d.parti.farve(d.i, new THREE.Color(tmpS.x, tmpS.y * 0.97, tmpS.z * 0.94));
    }
  }
  antalKroppe() { let n = 0; for (const d of this.levende) if (!d.klynge) n++; return n + this.klumper.size; }
  // Læg sovende småbrokker fast, når der er for mange (de ligger alligevel stille på jorden)
  ryd() {
    if (this.antalKroppe() < MAKS_KROPPE * 0.9) return;
    for (const d of this.levende) {
      if (d.brok && !d.klynge && d.krop && d.krop.isSleeping()) { d.krop.setBodyType(RAPIER.RigidBodyType.Fixed, false); this.levende.delete(d); d.frosset = true; }
      if (this.antalKroppe() < MAKS_KROPPE * 0.7) break;
    }
  }
}

// ---------- Små hjælpere ----------
function konveksHylster(pkt) {
  if (pkt.length < 3) return pkt;
  const p = pkt.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kryds = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const ned = [], op = [];
  for (const x of p) { while (ned.length >= 2 && kryds(ned[ned.length - 2], ned[ned.length - 1], x) <= 0) ned.pop(); ned.push(x); }
  for (let i = p.length - 1; i >= 0; i--) { const x = p[i]; while (op.length >= 2 && kryds(op[op.length - 2], op[op.length - 1], x) <= 0) op.pop(); op.push(x); }
  op.pop(); ned.pop();
  return ned.concat(op);
}
// Er punktet inden for polygonen (krympet med en margin, målt som andel af afstanden til midten)?
function iPolygon(x, z, poly, margin = 0) {
  if (poly.length < 3) return false;
  let cx = 0, cz = 0; for (const p of poly) { cx += p[0]; cz += p[1]; } cx /= poly.length; cz /= poly.length;
  const pp = poly.map(p => [cx + (p[0] - cx) * (1 - margin), cz + (p[1] - cz) * (1 - margin)]);
  let inde = false;
  for (let i = 0, j = pp.length - 1; i < pp.length; j = i++) {
    const [xi, zi] = pp[i], [xj, zj] = pp[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inde = !inde;
  }
  return inde;
}
