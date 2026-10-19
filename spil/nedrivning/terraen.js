// ===== Terrænet: bjerge, skrænter og en kløft med en flod =====
// Nogle opgaver foregår ikke på den flade byggeplads: et snedækket bjerg (lavinen), et stenbrud og en
// flodkløft under en gammel bro. Terrænet er et net af trekanter, hvis højde gives af en funktion.
// Det samme net bruges både til at tegne og af fysikken, så sne og sten glider præcis på det, man ser.

import * as THREE from "../3d-faelles/three.module.js";
import { lavHav } from "../3d-faelles/pynt.js";
import { RAPIER, fysik } from "./fysik.js";

export class Terræn {
  constructor(scene, fotos) {
    this.scene = scene; this.fotos = fotos; this.ting = []; this.vand = null;
    this.højdeFn = () => 0;
  }
  tøm() {
    for (const m of this.ting) { this.scene.remove(m); if (m !== this.hav) m.geometry.dispose(); }   // materialerne og floden genbruges
    this.ting = []; this.vand = null; this.højdeFn = () => 0;
  }
  højde(x, z) { return Math.max(0, this.højdeFn(x, z)); }

  // def: { højde(x, z), område: [x0, z0, x1, z1], net: antal felter, foto: "sne" | "klippe", tone, glat, vand: { y, område } }
  byg(def) {
    this.tøm();
    if (!def) return;
    this.højdeFn = def.højde;
    const [x0, z0, x1, z1] = def.område, n = def.net ?? 90;
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, n, n).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    const f = this.fotos[def.foto] || this.fotos.sand, meter = f?.meter ?? 2;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, this.højde(x, z) + 0.02);                         // en anelse over pladsen, så de to flader ikke flimrer
      uv.setXY(i, x / meter, z / meter);
    }
    geo.computeVertexNormals();
    this.materialer ??= {};
    let mat = this.materialer[def.foto];
    if (!mat) {
      mat = this.materialer[def.foto] = new THREE.MeshStandardMaterial({ roughness: 1 });
      if (f) { mat.map = f.farve; mat.normalMap = f.normal; mat.roughnessMap = f.arm; mat.aoMap = f.arm; mat.aoMapIntensity = 0.6; }
    }
    mat.color.set(def.tone ?? 0xffffff);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true; mesh.castShadow = true;
    this.scene.add(mesh); this.ting.push(mesh);
    // fysikken: samme trekanter
    const krop = fysik.verden.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const cd = RAPIER.ColliderDesc.trimesh(new Float32Array(p.array), new Uint32Array(geo.index.array)).setFriction(def.glat ? 0.12 : 0.85).setRestitution(0.02);
    if (def.glat) cd.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
    const k = fysik.verden.createCollider(cd, krop);
    fysik.terræn.add(k.handle);
    // floden i bunden af kløften
    if (def.vand) {
      const [vx0, vz0, vx1, vz1] = def.vand.område;
      const hav = this.hav ??= lavHav({ dyb: "#123a3c", lav: "#3a6e62", top: "#5a86b0", horisont: "#c8d4da" }, 100, 1);
      hav.scale.set((vx1 - vx0) / 100, 1, (vz1 - vz0) / 100);
      hav.position.set((vx0 + vx1) / 2, def.vand.y, (vz0 + vz1) / 2);
      hav.receiveShadow = false;
      this.scene.add(hav); this.ting.push(hav);
      this.vand = { y: def.vand.y, område: def.vand.område };
    }
  }
  // Er punktet i floden? (til plask)
  iVand(p) {
    const v = this.vand;
    if (!v) return false;
    const [x0, z0, x1, z1] = v.område;
    return p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1 && p.y < v.y + 0.3;
  }
}

// ---------- Terrænerne til opgaverne ----------
const blød = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const støj = (x, z) => Math.sin(x * 0.21 + Math.sin(z * 0.13) * 2) * 0.6 + Math.sin(z * 0.17 - x * 0.07) * 0.5 + Math.sin(x * 0.53 + z * 0.41) * 0.18;

export const TERRÆN = {
  // Et bjerg mod nord (-z), der stiger fra dalbunden ved z = 6 til 34 m oppe ved z = -50
  bjerg: {
    område: [-60, -70, 60, 16], net: 96, foto: "sne", glat: true,
    højde: (x, z) => {
      const op = blød(8, -48, z);                                   // 0 i dalen, 1 oppe ved toppen
      const skulder = Math.pow(op, 1.25) * 34;
      const kamme = (1 - Math.abs(x) / 60) * 6 * op + støj(x, z) * 1.4 * op;
      return skulder + kamme + Math.max(0, Math.abs(x) - 22) * 0.35 * op;   // siderne løfter sig, så sneen løber ned i dalen
    },
  },
  // En stejl klippevæg bag stenbruddets grav
  stenbrud: {
    område: [-50, -60, 50, -4], net: 80, foto: "klippe", tone: 0xc8c2b8,
    højde: (x, z) => blød(-10, -18, z) * (16 + støj(x, z) * 1.5) + blød(-30, -55, z) * 6,
  },
  // To brinker med en flod imellem (broen går over kløften fra vest til øst)
  kløft: {
    område: [-60, -45, 60, 45], net: 100, foto: "klippe", tone: 0xa8a294,
    højde: (x, z) => { const a = Math.abs(x); return blød(9, 17, a) * (8 + støj(x, z) * 0.4) + blød(40, 58, a) * 4; },
    vand: { y: 0.55, område: [-12, -45, 12, 45] },
  },
};
