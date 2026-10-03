// ===== Effekterne i verdenen: skudhuller, støv og gnister, lysspor og mundingsglimtets lys =====

import * as THREE from "./three.js";

const HULLER = 160, STØV = 700, GNIST = 400, SPOR = 32;
const FARVE = { sten: [0xd8c4a0, 0xb8a07a], sand: [0xd8b880, 0xc8a46a], træ: [0x9a6a3a, 0x6e4a26], metal: [0xa0a4a8, 0x70747a], krop: [0xc8b89a, 0x8a7a60] };

export class Effekter {
  constructor(scene, t) {
    this.scene = scene;
    // skudhuller: små firkanter, der lægges på væggen, og de ældste genbruges
    const hulMat = new THREE.MeshStandardMaterial({ map: t.skudhul, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 1 });
    const hulGeo = new THREE.PlaneGeometry(0.09, 0.09);
    this.huller = Array.from({ length: HULLER }, () => { const m = new THREE.Mesh(hulGeo, hulMat); m.visible = false; scene.add(m); return m; });
    this.hulNr = 0;
    // støv (bløde skyer) og gnister (små og lysende)
    this.støv = lavPartikler(scene, STØV, t.røg, 0.42, THREE.NormalBlending, 0.75);
    this.gnist = lavPartikler(scene, GNIST, t.røg, 0.07, THREE.AdditiveBlending, 1);
    // lysspor efter kuglerne
    const sporMat = new THREE.LineBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    this.spor = Array.from({ length: SPOR }, () => {
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      const l = new THREE.Line(g, sporMat); l.visible = false; l.frustumCulled = false; scene.add(l);
      return { l, fra: new THREE.Vector3(), r: new THREE.Vector3(), t: 0, længde: 0 };
    });
    this.sporNr = 0;
    // mundingsglimtets lys (lyser væggene op et kort øjeblik)
    this.lys = new THREE.PointLight(0xffc070, 0, 9, 2); scene.add(this.lys); this.lysTid = 0;
  }
  // Et skudhul på væggen (p = punktet, n = fladens retning)
  hul(p, n) {
    const m = this.huller[this.hulNr++ % HULLER];
    m.position.set(p.x + n[0] * 0.004, p.y + n[1] * 0.004, p.z + n[2] * 0.004);
    m.lookAt(m.position.x + n[0], m.position.y + n[1], m.position.z + n[2]);
    m.rotateZ(Math.random() * 6.3); m.scale.setScalar(0.7 + Math.random() * 0.6);
    m.visible = true;
  }
  // Støv og gnister, der passer til det, kuglen ramte
  nedslag(p, n, mat = "sten", mængde = 1) {
    const [a, b] = FARVE[mat] || FARVE.sten, ca = new THREE.Color(a), cb = new THREE.Color(b);
    for (let i = 0; i < 7 * mængde; i++) {
      const f = ca.clone().lerp(cb, Math.random());
      sendUd(this.støv, p, n, f, 1.2 + Math.random() * 1.8, 0.5 + Math.random() * 0.6, -1.2, 1);
    }
    if (mat === "metal" || mat === "sten") for (let i = 0; i < (mat === "metal" ? 10 : 4); i++)
      sendUd(this.gnist, p, n, new THREE.Color(0xffd070), 3 + Math.random() * 5, 0.15 + Math.random() * 0.2, 9, 0.6);
  }
  // Et lysspor fra mundingen hen mod det, kuglen ramte
  sporFra(fra, til) {
    const s = this.spor[this.sporNr++ % SPOR];
    s.fra.copy(fra); s.r.copy(til).sub(fra); s.længde = s.r.length(); s.r.normalize(); s.t = 0; s.l.visible = true;
  }
  mundingslys(p) { this.lys.position.copy(p); this.lys.intensity = 3.5; this.lysTid = 0.045; }
  opdater(dt) {
    opdaterPartikler(this.støv, dt); opdaterPartikler(this.gnist, dt);
    for (const s of this.spor) {
      if (!s.l.visible) continue;
      s.t += dt;
      const hoved = Math.min(s.længde, s.t * 520), hale = Math.max(0, hoved - 4);
      const p = s.l.geometry.attributes.position;
      p.setXYZ(0, s.fra.x + s.r.x * hale, s.fra.y + s.r.y * hale, s.fra.z + s.r.z * hale);
      p.setXYZ(1, s.fra.x + s.r.x * hoved, s.fra.y + s.r.y * hoved, s.fra.z + s.r.z * hoved);
      p.needsUpdate = true;
      if (hale >= s.længde) s.l.visible = false;
    }
    if (this.lysTid > 0 && (this.lysTid -= dt) <= 0) this.lys.intensity = 0;
  }
}

// Partikler: én stor "Points"-sky med farve pr. partikel; hver partikel har fart og levetid
function lavPartikler(scene, n, tekstur, str, blanding, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(-999), 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  const mat = new THREE.PointsMaterial({ size: str, map: tekstur, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: blanding });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; scene.add(p);
  return { p, n, nr: 0, fart: new Float32Array(n * 3), liv: new Float32Array(n), tyngde: new Float32Array(n), dæmp: new Float32Array(n) };
}
function sendUd(s, p, n, farve, fart, liv, tyngde, dæmp) {
  const i = s.nr++ % s.n, pos = s.p.geometry.attributes.position, col = s.p.geometry.attributes.color;
  pos.setXYZ(i, p.x + n[0] * 0.05, p.y + n[1] * 0.05, p.z + n[2] * 0.05);
  col.setXYZ(i, farve.r, farve.g, farve.b);
  const vx = n[0] + (Math.random() - 0.5) * 1.4, vy = n[1] + (Math.random() - 0.5) * 1.4 + 0.3, vz = n[2] + (Math.random() - 0.5) * 1.4;
  s.fart[i * 3] = vx * fart; s.fart[i * 3 + 1] = vy * fart; s.fart[i * 3 + 2] = vz * fart;
  s.liv[i] = liv; s.tyngde[i] = tyngde; s.dæmp[i] = dæmp;
  pos.needsUpdate = col.needsUpdate = true;
}
function opdaterPartikler(s, dt) {
  const pos = s.p.geometry.attributes.position, a = pos.array;
  let nogen = false;
  for (let i = 0; i < s.n; i++) {
    if (s.liv[i] <= 0) continue;
    nogen = true;
    s.liv[i] -= dt;
    if (s.liv[i] <= 0) { a[i * 3 + 1] = -999; continue; }
    const k = Math.exp(-dt * 3 * s.dæmp[i]);
    s.fart[i * 3] *= k; s.fart[i * 3 + 2] *= k; s.fart[i * 3 + 1] = s.fart[i * 3 + 1] * k - s.tyngde[i] * dt;
    a[i * 3] += s.fart[i * 3] * dt; a[i * 3 + 1] += s.fart[i * 3 + 1] * dt; a[i * 3 + 2] += s.fart[i * 3 + 2] * dt;
  }
  if (nogen) pos.needsUpdate = true;
}
