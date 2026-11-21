// ===== Effekterne: mundingsglimt, krudtrøg, kuglespor, skudhuller, splinter og gnister =====
// Mundingsglimtet er to krydsede "flammeplader" langs løbet + en stjerne forfra og et kort lysglimt,
// der lyser våbnet og bordet op. Det ses kun i et enkelt billede eller to — som i virkeligheden.

import * as THREE from "../3d-faelles/three.module.js";
import { skudhul } from "./teksturer.js";

const tilf = (a, b) => a + Math.random() * (b - a);
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rnd = s => v3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);

// Billedet af mundingsilden: en takket flammekegle ud fra mundingen (tegnes én gang)
function glimtTekstur() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d");
  const lag = (farve, skala, takker) => {
    g.fillStyle = farve; g.beginPath(); g.moveTo(0, 64);
    for (let i = 0; i <= takker; i++) {
      const t = i / takker, x = Math.pow(t, 0.8) * 250 * skala, b = Math.sin(t * Math.PI) * (1 - t * 0.6) * 54 * skala * (i % 2 ? 0.55 : 1) + 4;
      g.lineTo(x, 64 - b);
    }
    for (let i = takker; i >= 0; i--) {
      const t = i / takker, x = Math.pow(t, 0.8) * 250 * skala, b = Math.sin(t * Math.PI) * (1 - t * 0.6) * 54 * skala * (i % 2 ? 1 : 0.6) + 4;
      g.lineTo(x, 64 + b);
    }
    g.fill();
  };
  g.filter = "blur(3px)"; lag("rgba(255,120,30,0.55)", 1, 14); g.filter = "blur(2px)"; lag("rgba(255,200,90,0.85)", 0.72, 12); g.filter = "blur(1px)"; lag("rgba(255,255,230,1)", 0.4, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function stjerneTekstur() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
  g.translate(64, 64); g.filter = "blur(2px)";
  for (const [farve, r] of [["rgba(255,140,40,0.6)", 60], ["rgba(255,230,160,0.9)", 36], ["#fff", 16]]) {
    g.fillStyle = farve; g.beginPath();
    for (let i = 0; i < 16; i++) { const v = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.35 : r * (0.7 + Math.random() * 0.3); g.lineTo(Math.cos(v) * rr, Math.sin(v) * rr); }
    g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Effekter {
  constructor(scene, glød, røg) {
    this.scene = scene; this.glød = glød; this.røg = røg;
    // Mundingsglimt
    const m = new THREE.MeshBasicMaterial({ map: glimtTekstur(), color: new THREE.Color(2.6, 1.8, 1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const plade = new THREE.PlaneGeometry(1, 0.5).translate(0.5, 0, 0);
    this.glimt = new THREE.Group();
    const a = new THREE.Mesh(plade, m), b = new THREE.Mesh(plade, m), c = new THREE.Mesh(plade, m);
    a.scale.y = b.scale.y = c.scale.y = 1.5; b.rotation.x = Math.PI / 3; c.rotation.x = Math.PI * 2 / 3;
    const stjerne = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: stjerneTekstur(), color: new THREE.Color(2.4, 1.9, 1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    stjerne.rotation.y = Math.PI / 2;
    this.sideFlammer = new THREE.Group();
    for (const s of [-1, 1]) { const f = new THREE.Mesh(plade, m); f.rotation.y = s * Math.PI / 2; f.scale.set(0.5, 0.6, 1); f.position.x = -0.03; this.sideFlammer.add(f); }
    this.glimt.add(a, b, c, stjerne, this.sideFlammer);
    this.glimt.traverse(o => { o.renderOrder = 6; o.frustumCulled = false; });
    this.glimt.visible = false; this.glimtTid = 0;
    this.glimtLys = new THREE.PointLight(0xffb060, 0, 6, 2); scene.add(this.glimtLys);
    // Skudhuller (op til 160, de ældste forsvinder først)
    this.huller = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: skudhul(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 0.95 }), 160);
    this.huller.count = 0; this.hulNr = 0; this.huller.renderOrder = 1; this.huller.frustumCulled = false; scene.add(this.huller);
    this.røgFra = null; this.røgTid = 0;
  }

  // Ild fra mundingen. munding = Object3D ved løbets ende (glimtet hænger på den og følger med)
  mundingsild(munding, str = 0.1, { side = false, røg = 1 } = {}) {
    munding.add(this.glimt);
    this.glimt.visible = true; this.glimtTid = 0.045;
    this.glimt.rotation.x = Math.random() * Math.PI;
    this.glimt.scale.set(str * tilf(0.75, 1.25), str * tilf(0.8, 1.3), str * tilf(0.8, 1.3));
    this.sideFlammer.visible = side;
    munding.getWorldPosition(this.glimtLys.position);
    this.glimtLys.intensity = 1.5 + str * 12;
    const mp = this.glimtLys.position, ret = v3(1, 0, 0).transformDirection(munding.matrixWorld);
    this.glød.udsend({ pos: mp.clone().addScaledVector(ret, str * 0.55), liv: 0.045, str: str * 0.55, farve: new THREE.Color(3.0, 1.8, 0.8), ind: 0.001 });
    this.glød.udsend({ pos: mp.clone().addScaledVector(ret, str * 0.15), liv: 0.03, str: str * 0.24, farve: new THREE.Color(4, 3.3, 2.4), ind: 0.001 });
    for (let i = 0; i < 6; i++) this.glød.udsend({ pos: mp, fart: ret.clone().multiplyScalar(tilf(4, 9)).add(rnd(3)), liv: tilf(0.04, 0.1), str: 0.004, strak: 0.012, farve: new THREE.Color(5, 3, 1.2), ind: 0.001 });
    // Krudtrøg ud af mundingen
    const p = munding.getWorldPosition(v3()), retning = v3(1, 0, 0).transformDirection(munding.matrixWorld);
    for (let i = 0; i < 4 * røg; i++) {
      this.røg.udsend({ pos: p.clone().addScaledVector(retning, 0.02 + Math.random() * 0.06), fart: retning.clone().multiplyScalar(tilf(0.3, 1.4)).add(rnd(0.3)).add(v3(0, 0.15, 0)),
        liv: tilf(1.2, 2.2), str: 0.03, strSlut: tilf(0.25, 0.45) * (0.6 + str * 3), farve: new THREE.Color(0.42, 0.4, 0.42), alfa: 0.2, billede: 1, luft: 2.2, tyngde: -0.12, spin: tilf(-1, 1), ind: 0.08 });
    }
    this.røgFra = munding; this.røgTid = 1.6;
  }
  // Kuglesporet: en hurtig lysstribe fra mundingen ud til træfferen
  spor(fra, til, farve = new THREE.Color(2.4, 1.9, 1.2)) {
    const d = til.clone().sub(fra), l = d.length(), fart = 260;
    this.glød.udsend({ pos: fra.clone().addScaledVector(d, 0.05 / Math.max(l, 0.1)), fart: d.normalize().multiplyScalar(fart), liv: Math.max(0.016, l / fart), str: 0.006, strak: 0.004, farve, ind: 0.001 });
  }
  // Et skudhul i en flade (punkt + fladens normal)
  skudhul(p, n, str = 0.045) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromUnitVectors(v3(0, 0, 1), n);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 0, 1), Math.random() * 6.28));
    m.compose(p.clone().addScaledVector(n, 0.004), q, v3(str, str, str));
    this.huller.setMatrixAt(this.hulNr, m); this.hulNr = (this.hulNr + 1) % 160;
    this.huller.count = Math.min(160, Math.max(this.huller.count, this.hulNr === 0 ? 160 : this.hulNr));
    this.huller.instanceMatrix.needsUpdate = true;
  }
  // Hvad der sprøjter ud, når en kugle rammer (slags: træ, jord, halm, metal, skive)
  træf(slags, p, n, retning, styrke = 1) {
    const ud = n.clone().multiplyScalar(0.7).add(retning.clone().reflect(n).multiplyScalar(0.5)).normalize();
    if (slags === "metal" || slags === "dåse" || slags === "plade") {
      this.glød.udsend({ pos: p, liv: 0.07, str: 0.18, farve: new THREE.Color(4, 3, 2), ind: 0.001 });
      for (let i = 0; i < 16 * styrke; i++) this.glød.udsend({ pos: p, fart: ud.clone().multiplyScalar(tilf(1.5, 5)).add(rnd(4)), liv: tilf(0.2, 0.55), str: 0.006, strak: 0.035, farve: new THREE.Color(5, 3.4, 1.4), farveSlut: new THREE.Color(2.5, 0.5, 0.05), tyngde: 7, luft: 1.2 });
      return;
    }
    const farve = { træ: [0.75, 0.58, 0.4], skive: [0.9, 0.86, 0.78], jord: [0.22, 0.17, 0.1], halm: [0.85, 0.7, 0.35] }[slags] || [0.6, 0.5, 0.4];
    const c = new THREE.Color(...farve);
    for (let i = 0; i < 9 * styrke; i++) this.røg.udsend({ pos: p, fart: ud.clone().multiplyScalar(tilf(1, 3.5)).add(rnd(2.5)), liv: tilf(0.5, 1.1), str: slags === "halm" ? 0.02 : 0.012, farve: c.clone().multiplyScalar(tilf(0.6, 1)), billede: 3, tyngde: slags === "halm" ? 3 : 9.8, luft: slags === "halm" ? 2 : 0.4, spin: tilf(-12, 12), strak: slags === "halm" ? 0 : 0.01 });
    const støv = slags === "jord" ? new THREE.Color(0.32, 0.26, 0.2) : c.clone().multiplyScalar(0.55);
    for (let i = 0; i < 3 * styrke; i++) this.røg.udsend({ pos: p.clone().addScaledVector(n, 0.03), fart: ud.clone().multiplyScalar(tilf(0.3, 1)).add(rnd(0.4)), liv: tilf(0.9, 1.6), str: 0.06, strSlut: slags === "jord" ? 0.6 : 0.35, farve: støv, alfa: 0.35, billede: 1, luft: 2.5, tyngde: -0.1, spin: tilf(-1, 1), ind: 0.05 });
  }
  // Gnister (fx når lyssværdet rammer noget hårdt)
  gnister(p, retning, antal = 20, farve = new THREE.Color(5, 3.4, 1.4)) {
    for (let i = 0; i < antal; i++) this.glød.udsend({ pos: p, fart: retning.clone().multiplyScalar(tilf(0.5, 3)).add(rnd(4)), liv: tilf(0.2, 0.6), str: 0.006, strak: 0.03, farve, farveSlut: new THREE.Color(2, 0.4, 0.05), tyngde: 6, luft: 1 });
  }
  opdater(dt) {
    if (this.glimtTid > 0) { this.glimtTid -= dt; if (this.glimtTid <= 0) this.glimt.visible = false; }
    this.glimtLys.intensity *= Math.exp(-dt * 45);
    // Tynde røgstriber fra løbet lidt efter skuddet
    if (this.røgTid > 0 && this.røgFra) {
      this.røgTid -= dt;
      if (Math.random() < dt * 22 * this.røgTid) {
        const p = this.røgFra.getWorldPosition(v3());
        this.røg.udsend({ pos: p, fart: v3(tilf(-0.03, 0.03), tilf(0.12, 0.25), tilf(-0.03, 0.03)), liv: tilf(1.2, 2), str: 0.012, strSlut: 0.09, farve: new THREE.Color(0.5, 0.5, 0.52), alfa: 0.13, billede: 1, luft: 0.6, spin: tilf(-1, 1), ind: 0.2 });
      }
    }
  }
}
