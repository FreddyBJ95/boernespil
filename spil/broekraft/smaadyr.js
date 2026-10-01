// ===== Små ting i luften i Den uendelige verden: sommerfugle, bier og drager =====
// Sommerfugle flagrer rundt i forårslandet, bier summer om blomsterne i sommerlandet,
// og i efterårslandet blafrer der drager (dem med en snor) højt oppe i vinden.
// De er kun til at se på. Om natten sover de, og så kommer ildfluerne frem i stedet (dagnat.js).

import * as THREE from "./three.js";
import { ID } from "./blokke.js";

const VINGEFARVER = ["#ff7eb6", "#ffd23f", "#7ec8ff", "#c77dff", "#ff9f4a", "#ffffff", "#5fe36a"];
const DRAGEFARVER = [["#e63946", "#ffd23f"], ["#3a86ff", "#ffffff"], ["#8338ec", "#ff9f1c"], ["#2a9d8f", "#ff5fa2"]];
const kasse = new THREE.BoxGeometry(1, 1, 1);
const JORD = new Set([ID.Græs, ID["Tørt græs"], ID["Mørkt græs"], ID.Sand]);   // de flyver over jorden — ikke oven på trætoppene
const mat = farve => new THREE.MeshLambertMaterial({ color: farve });

// Et fast "tilfældigt" tal mellem 0 og 1 for et sted (så dragerne står samme sted hver gang)
function hash(x, z) {
  let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// En sommerfugl: en lille krop og to vinger, der klapper
function byggSommerfugl(farve) {
  const g = new THREE.Group(), vMat = new THREE.MeshLambertMaterial({ color: farve, side: THREE.DoubleSide });
  const krop = new THREE.Mesh(kasse, mat("#2a1a10")); krop.scale.set(0.04, 0.04, 0.2); g.add(krop);
  const vinger = [-1, 1].map(s => {
    const v = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.26), vMat);
    m.rotation.x = -Math.PI / 2; m.position.x = s * 0.11; v.add(m);
    const prik = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.DoubleSide }));
    prik.rotation.x = -Math.PI / 2; prik.position.set(s * 0.12, 0.002, -0.04); v.add(prik);
    g.add(v); return v;
  });
  g.userData.vinger = vinger;
  return g;
}
// En bi: gul og sort stribet, med to små gennemsigtige vinger
function byggBi() {
  const g = new THREE.Group();
  const krop = new THREE.Mesh(kasse, mat("#ffcc1a")); krop.scale.set(0.13, 0.12, 0.2); g.add(krop);
  for (const z of [-0.03, 0.05]) { const s = new THREE.Mesh(kasse, mat("#1b1b24")); s.scale.set(0.135, 0.125, 0.03); s.position.z = z; g.add(s); }
  const vMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  const vinger = [-1, 1].map(s => {
    const v = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), vMat);
    m.rotation.x = -Math.PI / 2; m.position.x = s * 0.06; v.add(m); v.position.y = 0.065;
    g.add(v); return v;
  });
  g.userData.vinger = vinger;
  return g;
}
// En drage: en farvet firkant på spidsen, en hale med sløjfer og en snor ned til en lille pæl
function byggDrage([a, b]) {
  const g = new THREE.Group(), drage = new THREE.Group();
  const halv = (farve, top) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(top ? [0, 0.9, 0, -0.6, 0, 0, 0.6, 0, 0] : [-0.6, 0, 0, 0, -1.2, 0, 0.6, 0, 0], 3));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: farve, side: THREE.DoubleSide }));
  };
  drage.add(halv(a, true), halv(b, false));
  const pind = new THREE.Mesh(kasse, mat("#6b4a2b")); pind.scale.set(1.2, 0.05, 0.05); drage.add(pind);
  const hale = [];
  for (let i = 0; i < 5; i++) {
    const sløjfe = new THREE.Mesh(kasse, new THREE.MeshBasicMaterial({ color: i & 1 ? a : b }));
    sløjfe.scale.set(0.3, 0.12, 0.05); drage.add(sløjfe); hale.push(sløjfe);
  }
  drage.scale.setScalar(2.2);
  g.add(drage);
  const snor = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: "#f4f0e8" }));
  snor.frustumCulled = false; g.add(snor);
  const pæl = new THREE.Mesh(kasse, mat("#8a5a30")); pæl.scale.set(0.12, 0.8, 0.12); g.add(pæl);
  g.userData = { drage, hale, snor, pæl };
  return g;
}

export class Smådyr {
  // s: { scene, sp, land, verden }
  constructor(s) {
    this.s = s;
    this.flyvere = [];                             // sommerfugle og bier
    for (let i = 0; i < 12; i++) this.ny("sommerfugl", byggSommerfugl(VINGEFARVER[i % VINGEFARVER.length]));
    for (let i = 0; i < 8; i++) this.ny("bi", byggBi());
    this.drager = DRAGEFARVER.concat(DRAGEFARVER).map(f => { const m = byggDrage(f); m.visible = false; s.scene.add(m); return { m, sted: null }; });
    this.tjek = 0;
  }
  ny(slags, m) {
    m.scale.setScalar(slags === "sommerfugl" ? 1.6 : 1.4);
    m.visible = false; this.s.scene.add(m);
    this.flyvere.push({ slags, m, anker: new THREE.Vector3(), fase: Math.random() * 100, aktiv: false, sidst: new THREE.Vector3() });
  }
  // Find et sted tæt på barnet i den rigtige årstid (eller ingenting)
  findSted(slags) {
    const { sp, land, verden } = this.s;
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 16;
      const x = Math.floor(sp.pos.x + Math.cos(a) * r), z = Math.floor(sp.pos.z + Math.sin(a) * r);
      if (!verden.hentet(x, z)) continue;
      const å = land.årstid(x, z);
      if (slags === "sommerfugl" ? (å !== "forår" && !(å === "hjem" && k < 2)) : å !== "sommer") continue;
      const y = verden.topY(x, z);
      if (!JORD.has(verden.hent(x, y, z))) continue;
      return new THREE.Vector3(x + 0.5, y + 1, z + 0.5);
    }
    return null;
  }
  opdater(dt, t, dag) {
    const p = this.s.sp.pos;
    if ((this.tjek -= dt) <= 0) {                   // en gang i sekundet: hvem skal flyve hvor?
      this.tjek = 1;
      for (const f of this.flyvere) {
        if (f.aktiv && dag && f.anker.distanceTo(p) < 28) continue;
        const sted = dag ? this.findSted(f.slags) : null;
        f.aktiv = !!sted; f.m.visible = f.aktiv;
        if (sted) f.anker.copy(sted);
      }
      this.placérDrager(dag);
    }
    for (const f of this.flyvere) {
      if (!f.aktiv) continue;
      const { m, anker, fase } = f, [v1, v2] = m.userData.vinger;
      if (f.slags === "sommerfugl") {              // langsomme, bløde buer og vinger, der klapper
        m.position.set(anker.x + Math.sin(t * 0.6 + fase) * 2.6, anker.y + 0.9 + Math.sin(t * 1.3 + fase) * 0.5, anker.z + Math.cos(t * 0.45 + fase * 1.3) * 2.6);
        const klap = 0.25 + Math.abs(Math.sin(t * 11 + fase)) * 1.1;
        v1.rotation.z = klap; v2.rotation.z = -klap;
      } else {                                     // bierne suser i små ottetaller
        m.position.set(anker.x + Math.sin(t * 2.1 + fase) * 1.3, anker.y + 0.7 + Math.sin(t * 3.3 + fase) * 0.25, anker.z + Math.sin(t * 1.05 + fase * 2) * 1.3);
        const klap = 0.4 + Math.abs(Math.sin(t * 40 + fase)) * 0.8;
        v1.rotation.z = klap; v2.rotation.z = -klap;
      }
      const dx = m.position.x - f.sidst.x, dz = m.position.z - f.sidst.z;
      if (dx * dx + dz * dz > 1e-6) m.rotation.y = Math.atan2(dx, dz);
      f.sidst.copy(m.position);
    }
    for (const d of this.drager) if (d.sted) this.blafr(d, t);
  }
  // Dragerne står fast på steder i efterårslandet (en for hver 40 × 40 blokke, hvor der er en)
  placérDrager(dag) {
    const { sp, land, verden } = this.s, ønsket = [];
    if (dag) {
      const gx0 = Math.floor(sp.pos.x / 40), gz0 = Math.floor(sp.pos.z / 40);
      for (let gx = gx0 - 2; gx <= gx0 + 2; gx++) for (let gz = gz0 - 2; gz <= gz0 + 2; gz++) {
        if (hash(gx, gz) > 0.3) continue;
        const x = gx * 40 + 8 + Math.floor(hash(gz, gx) * 24), z = gz * 40 + 8 + Math.floor(hash(gx + 7, gz - 3) * 24);
        if (!verden.hentet(x, z) || land.årstid(x, z) !== "efterår") continue;
        const y = verden.topY(x, z);
        if (verden.væske[verden.hent(x, y, z)]) continue;
        ønsket.push({ x, y, z, nøgle: gx * 100003 + gz });
      }
    }
    for (const d of this.drager) if (d.sted && !ønsket.some(w => w.nøgle === d.sted.nøgle)) { d.sted = null; d.m.visible = false; }
    for (const w of ønsket) {
      if (this.drager.some(d => d.sted?.nøgle === w.nøgle)) continue;
      const fri = this.drager.find(d => !d.sted);
      if (!fri) break;
      fri.sted = w; fri.fase = hash(w.x, w.z) * 50; fri.m.visible = true;
      fri.m.userData.pæl.position.set(w.x + 0.5, w.y + 1.4, w.z + 0.5);
    }
  }
  // Dragen blafrer i vinden, og halen svinger efter
  blafr(d, t) {
    const { drage, hale, snor } = d.m.userData, { x, y, z } = d.sted, f = d.fase;
    drage.position.set(x + 6 + Math.sin(t * 0.5 + f) * 2.2, y + 16 + Math.sin(t * 0.8 + f) * 1.4, z + 0.5 + Math.cos(t * 0.35 + f) * 1.5);
    const p = this.s.sp.pos;                       // dragen vender forsiden mod barnet
    drage.rotation.set(-0.25, Math.atan2(p.x - drage.position.x, p.z - drage.position.z) + Math.sin(t * 0.4 + f) * 0.25, Math.sin(t * 0.9 + f) * 0.3);
    hale.forEach((s, i) => s.position.set(Math.sin(t * 2.4 + f + i * 0.9) * 0.18 * (i + 1), -1.4 - i * 0.45, 0));
    const a = snor.geometry.attributes.position;
    a.setXYZ(0, x + 0.5, y + 1.8, z + 0.5); a.setXYZ(1, drage.position.x, drage.position.y - 0.9, drage.position.z);
    a.needsUpdate = true;
  }
}
