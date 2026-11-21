// ===== Partikler og stumper =====
// Partikler: tusindvis af små flade billeder (gnister, røg, flammer, konfetti, saft), der altid vender
// mod kameraet. Hurtige gnister strækkes langs deres fart, så de ligner lysstriber.
// Stumper: rigtige 3D-dele (hylstre, magasiner, glasskår, frugtstykker), der falder, hopper og drejer.

import * as THREE from "../3d-faelles/three.module.js";
import { partikelAtlas } from "./teksturer.js";

const VERT = `
attribute vec3 aPos; attribute vec3 aFart; attribute vec4 aFarve; attribute vec4 aInfo;
varying vec2 vUv; varying vec4 vFarve;
void main() {
  vec4 mv = viewMatrix * vec4(aPos, 1.0);
  vec2 h = position.xy;
  float str = aInfo.x, felt = aInfo.y, rot = aInfo.z, strak = aInfo.w;
  vec2 o;
  if (strak > 0.0) {
    vec3 vv = (viewMatrix * vec4(aFart, 0.0)).xyz;
    vec2 d = vv.xy / max(1e-4, -mv.z);           // farten, som den ses paa skaermen
    float l = length(d);
    vec2 r = l > 1e-5 ? d / l : vec2(0.0, 1.0);
    o = r * h.y * (str + l * strak * -mv.z) + vec2(-r.y, r.x) * h.x * str;
  } else {
    float c = cos(rot), s = sin(rot);
    o = vec2(c * h.x - s * h.y, s * h.x + c * h.y) * str;
  }
  mv.xy += o;
  gl_Position = projectionMatrix * mv;
  vec2 fo = vec2(mod(felt, 2.0) * 0.5, felt < 1.5 ? 0.5 : 0.0);
  vUv = (h + 0.5) * 0.5 + fo;
  vFarve = aFarve;
}`;
const FRAG = `
uniform sampler2D tAtlas;
varying vec2 vUv; varying vec4 vFarve;
void main() {
  vec4 t = texture2D(tAtlas, vUv);
  gl_FragColor = vec4(vFarve.rgb * t.rgb, vFarve.a * t.a);
  if (gl_FragColor.a < 0.003) discard;
}`;

export class Partikler {
  constructor(scene, { maks = 3000, lægSammen = true } = {}) {
    this.maks = maks; this.antal = 0;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const attr = (n, s) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(maks * s), s); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(n, a); return a; };
    this.aPos = attr("aPos", 3); this.aFart = attr("aFart", 3); this.aFarve = attr("aFarve", 4); this.aInfo = attr("aInfo", 4);
    geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tAtlas: { value: partikelAtlas() } }, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: lægSammen ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = lægSammen ? 3 : 2;
    scene.add(this.mesh);
    // Hver partikels tilstand i rene tal-lister (hurtigt)
    const F = n => new Float32Array(maks * n);
    this.p = F(3); this.v = F(3); this.f0 = F(3); this.f1 = F(3);
    this.alder = F(1); this.liv = F(1); this.s0 = F(1); this.s1 = F(1); this.alfa = F(1); this.tyngde = F(1); this.luft = F(1);
    this.felt = F(1); this.rot = F(1); this.spin = F(1); this.strak = F(1); this.ind = F(1);
  }
  // Send én partikel af sted
  udsend({ pos, fart = null, liv = 1, str = 0.05, strSlut = null, farve, farveSlut = null, alfa = 1, tyngde = 0, luft = 0, billede = 0, rot = Math.random() * 6.28, spin = 0, strak = 0, ind = 0.05 }) {
    if (this.antal >= this.maks) return;
    const i = this.antal++, i3 = i * 3;
    this.p[i3] = pos.x; this.p[i3 + 1] = pos.y; this.p[i3 + 2] = pos.z;
    this.v[i3] = fart ? fart.x : 0; this.v[i3 + 1] = fart ? fart.y : 0; this.v[i3 + 2] = fart ? fart.z : 0;
    const a = farve, b = farveSlut || farve;
    this.f0[i3] = a.r; this.f0[i3 + 1] = a.g; this.f0[i3 + 2] = a.b; this.f1[i3] = b.r; this.f1[i3 + 1] = b.g; this.f1[i3 + 2] = b.b;
    this.alder[i] = 0; this.liv[i] = liv; this.s0[i] = str; this.s1[i] = strSlut ?? str; this.alfa[i] = alfa;
    this.tyngde[i] = tyngde; this.luft[i] = luft; this.felt[i] = billede; this.rot[i] = rot; this.spin[i] = spin; this.strak[i] = strak; this.ind[i] = ind;
  }
  // Flyt dem alle, fjern de gamle og skriv resten til skærmkortet
  opdater(dt) {
    let n = this.antal;
    for (let i = 0; i < n; i++) {
      this.alder[i] += dt;
      if (this.alder[i] >= this.liv[i]) { this.flyt(n - 1, i); n--; i--; continue; }
      const i3 = i * 3, d = Math.exp(-this.luft[i] * dt);
      this.v[i3 + 1] -= this.tyngde[i] * dt;
      this.v[i3] *= d; this.v[i3 + 1] *= d; this.v[i3 + 2] *= d;
      this.p[i3] += this.v[i3] * dt; this.p[i3 + 1] += this.v[i3 + 1] * dt; this.p[i3 + 2] += this.v[i3 + 2] * dt;
      this.rot[i] += this.spin[i] * dt;
      const t = this.alder[i] / this.liv[i];
      const a = this.alfa[i] * Math.min(1, t / Math.max(1e-3, this.ind[i])) * (1 - t) * (1 - t * 0.5);
      const ap = this.aPos.array, af = this.aFart.array;
      ap[i3] = this.p[i3]; ap[i3 + 1] = this.p[i3 + 1]; ap[i3 + 2] = this.p[i3 + 2];
      af[i3] = this.v[i3]; af[i3 + 1] = this.v[i3 + 1]; af[i3 + 2] = this.v[i3 + 2];
      const i4 = i * 4;
      this.aFarve.array[i4] = this.f0[i3] + (this.f1[i3] - this.f0[i3]) * t;
      this.aFarve.array[i4 + 1] = this.f0[i3 + 1] + (this.f1[i3 + 1] - this.f0[i3 + 1]) * t;
      this.aFarve.array[i4 + 2] = this.f0[i3 + 2] + (this.f1[i3 + 2] - this.f0[i3 + 2]) * t;
      this.aFarve.array[i4 + 3] = a;
      this.aInfo.array[i4] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.aInfo.array[i4 + 1] = this.felt[i]; this.aInfo.array[i4 + 2] = this.rot[i]; this.aInfo.array[i4 + 3] = this.strak[i];
    }
    this.antal = n;
    const g = this.mesh.geometry; g.instanceCount = n;
    for (const a of [this.aPos, this.aFart, this.aFarve, this.aInfo]) { a.needsUpdate = true; a.addUpdateRange?.(0, n * a.itemSize); }
  }
  // Kopiér partikel fra → til (bruges når en dør: den sidste flyttes ind på dens plads)
  flyt(fra, til) {
    if (fra === til) return;
    for (const [arr, s] of [[this.p, 3], [this.v, 3], [this.f0, 3], [this.f1, 3]]) for (let k = 0; k < s; k++) arr[til * s + k] = arr[fra * s + k];
    for (const arr of [this.alder, this.liv, this.s0, this.s1, this.alfa, this.tyngde, this.luft, this.felt, this.rot, this.spin, this.strak, this.ind]) arr[til] = arr[fra];
  }
}

// ---------- Stumper med tyngdekraft ----------
const _q = new THREE.Quaternion(), _a = new THREE.Vector3(), _x = new THREE.Vector3(), _f = new THREE.Vector3();
export class Stumper {
  // gulv(x, z) giver højden af det, der ligger under punktet (bordet, hylden eller jorden)
  constructor(scene, gulv) { this.scene = scene; this.gulv = gulv; this.liste = []; }
  tilføj(obj, { fart, spin = new THREE.Vector3(), liv = 8, hop = 0.35, gnid = 0.55, radius = 0.006, ramt = null, læg = true, tyngde = 9.81, maks = 70 } = {}) {
    if (!obj.parent) this.scene.add(obj);
    this.liste.push({ obj, fart: fart.clone(), spin: spin.clone(), liv, start: liv, hop, gnid, radius, ramt, læg, tyngde, hvile: 0 });
    while (this.liste.length > maks) this.fjern(this.liste[0]);
  }
  fjern(s) { s.obj.removeFromParent(); this.liste.splice(this.liste.indexOf(s), 1); s.obj.userData.væk?.(); }
  opdater(dt) {
    for (const s of [...this.liste]) {
      const o = s.obj;
      s.liv -= dt;
      if (s.liv <= 0) { this.fjern(s); continue; }
      if (s.liv < 0.6) o.scale.setScalar(Math.max(0.001, s.liv / 0.6) * (o.userData.skala ?? 1));
      if (s.hvile > 0.4) continue;
      s.fart.y -= s.tyngde * dt;
      o.position.addScaledVector(s.fart, dt);
      const w = s.spin.length();
      if (w > 1e-4) { _q.setFromAxisAngle(_a.copy(s.spin).divideScalar(w), w * dt); o.quaternion.premultiply(_q); }
      const bund = this.gulv(o.position.x, o.position.z) + s.radius;
      if (o.position.y < bund) {
        o.position.y = bund;
        const slag = -s.fart.y;
        if (slag > 0.25 && s.ramt) s.ramt(slag, o);
        s.fart.y = slag > 0.4 ? slag * s.hop : 0;
        s.fart.x *= s.gnid; s.fart.z *= s.gnid; s.spin.multiplyScalar(0.55);
        // Læg sig ned: hylstre og stumper ender liggende på siden, ikke stående på højkant
        if (s.læg) {
          _x.set(1, 0, 0).applyQuaternion(o.quaternion);
          _f.set(_x.x, 0, _x.z).normalize();
          if (_f.lengthSq() > 0.5) { _q.setFromUnitVectors(_x, _f); o.quaternion.premultiply(_q.slerp(new THREE.Quaternion(), 0.4)); }
        }
        if (s.fart.lengthSq() < 0.01 && s.spin.lengthSq() < 4) s.hvile += dt; else s.hvile = 0;
        // Rul lidt videre (et liggende hylster triller hen over bordet)
        if (s.læg && s.fart.y === 0) s.spin.set(-s.fart.z, 0, s.fart.x).multiplyScalar(1 / Math.max(0.003, s.radius) * 0.6);
      }
      if (o.position.y < -2) this.fjern(s);
    }
  }
}
