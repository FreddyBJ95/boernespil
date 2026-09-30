// ===== Partikler: flammer, gnister, dråber, stjernestøv, skyer og konfetti =====
// Partikler: mange små lysende eller bløde prikker (én tegning til dem alle, så det går hurtigt).
// Brikker:   små 3D-klodser eller konfetti, der snurrer (Broekraft-jord, målfesten).
// udsend({...}) starter en ny, opdater(dt) flytter dem alle.

import * as THREE from "./three.js";

export class Partikler {
  constructor(scene, { maks = 600, tekstur, additiv = false, vend = false } = {}) {
    this.maks = maks; this.næste = 0;
    this.pos = new Float32Array(maks * 3);
    this.far = new Float32Array(maks * 3);
    this.str = new Float32Array(maks);
    this.alf = new Float32Array(maks);
    this.d = Array.from({ length: maks }, () => ({ liv: 0 }));
    const geo = new THREE.BufferGeometry(), dyn = a => a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", dyn(new THREE.BufferAttribute(this.pos, 3)));
    geo.setAttribute("aFarve", dyn(new THREE.BufferAttribute(this.far, 3)));
    geo.setAttribute("aStr", dyn(new THREE.BufferAttribute(this.str, 1)));
    geo.setAttribute("aAlfa", dyn(new THREE.BufferAttribute(this.alf, 1)));
    this.uni = { uTekstur: { value: tekstur }, uSkala: { value: 600 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uni, transparent: true, depthWrite: false,
      blending: additiv ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `
        attribute vec3 aFarve; attribute float aStr; attribute float aAlfa;
        uniform float uSkala;
        varying vec3 vFarve; varying float vAlfa;
        void main() {
          vFarve = aFarve; vAlfa = aAlfa;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlfa > 0.0 ? aStr * uSkala / max(0.2, -mv.z) : 0.0;
        }`,
      fragmentShader: `
        uniform sampler2D uTekstur;
        varying vec3 vFarve; varying float vAlfa;
        void main() {
          vec4 t = texture2D(uTekstur, ${vend ? "vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)" : "gl_PointCoord"});
          gl_FragColor = vec4(vFarve * t.rgb, t.a * vAlfa);
          if (gl_FragColor.a < 0.01) discard;
          #include <colorspace_fragment>
        }`,
    });
    this.punkter = new THREE.Points(geo, mat);
    this.punkter.frustumCulled = false;
    this.punkter.renderOrder = 5;
    scene.add(this.punkter);
  }

  // Skærmens højde i pixels bestemmer hvor store prikkerne tegnes
  skala(højdePx, fov) { this.uni.uSkala.value = højdePx / (2 * Math.tan(fov * Math.PI / 360)); }

  // x,y,z · vx,vy,vz · liv (sek) · str → strSlut (meter) · farve → farve2 · alfa · tyngde · modstand
  udsend(o) {
    const d = this.d[this.næste]; this.næste = (this.næste + 1) % this.maks;
    d.x = o.x; d.y = o.y; d.z = o.z;
    d.vx = o.vx || 0; d.vy = o.vy || 0; d.vz = o.vz || 0;
    d.liv = d.max = o.liv || 1;
    d.s0 = o.str ?? 0.2; d.s1 = o.strSlut ?? d.s0;
    d.a0 = o.alfa ?? 1; d.ind = o.ind || 0;
    d.g = o.tyngde || 0; d.m = o.modstand || 0;
    d.f1 = (d.f1 || new THREE.Color()).set(o.farve || "#ffffff");
    d.f2 = (d.f2 || new THREE.Color()).set(o.farve2 || o.farve || "#ffffff");
  }

  opdater(dt) {
    for (let i = 0; i < this.maks; i++) {
      const d = this.d[i];
      if (d.liv <= 0) { this.alf[i] = 0; continue; }
      d.liv -= dt;
      if (d.liv <= 0) { this.alf[i] = 0; continue; }
      const k = 1 - d.liv / d.max, bremse = Math.exp(-d.m * dt);
      d.vy -= d.g * dt;
      d.vx *= bremse; d.vy *= bremse; d.vz *= bremse;
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      this.pos[i * 3] = d.x; this.pos[i * 3 + 1] = d.y; this.pos[i * 3 + 2] = d.z;
      this.str[i] = d.s0 + (d.s1 - d.s0) * k;
      const ind = d.ind > 0 ? Math.min(1, k * d.max / d.ind) : 1;          // blødt frem, blødt væk
      this.alf[i] = d.a0 * ind * Math.min(1, d.liv / (d.max * 0.4));
      this.far[i * 3] = d.f1.r + (d.f2.r - d.f1.r) * k;
      this.far[i * 3 + 1] = d.f1.g + (d.f2.g - d.f1.g) * k;
      this.far[i * 3 + 2] = d.f1.b + (d.f2.b - d.f1.b) * k;
    }
    const a = this.punkter.geometry.attributes;
    a.position.needsUpdate = a.aFarve.needsUpdate = a.aStr.needsUpdate = a.aAlfa.needsUpdate = true;
  }

  ryd() { for (const d of this.d) d.liv = 0; }
}

// Små klodser eller konfetti, der snurrer og falder
export class Brikker {
  constructor(scene, { maks = 200, geo, mat } = {}) {
    this.maks = maks; this.næste = 0;
    this.mesh = new THREE.InstancedMesh(geo, mat, maks);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.d = Array.from({ length: maks }, () => ({ liv: 0 }));
    this.dummy = new THREE.Object3D();
    const c = new THREE.Color("#ffffff");
    for (let i = 0; i < maks; i++) this.mesh.setColorAt(i, c);
    scene.add(this.mesh);
    this.opdater(0);
  }

  udsend(o) {
    const i = this.næste, d = this.d[i]; this.næste = (i + 1) % this.maks;
    Object.assign(d, { x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, liv: o.liv || 1.5, max: o.liv || 1.5,
      s: o.str || 0.1, g: o.tyngde ?? 14, m: o.modstand || 0, rx: Math.random() * 6, ry: Math.random() * 6,
      sx: (Math.random() - 0.5) * (o.spin ?? 12), sy: (Math.random() - 0.5) * (o.spin ?? 12), gulv: o.gulv ?? -Infinity });
    this.mesh.setColorAt(i, new THREE.Color(o.farve || "#ffffff"));
    this.mesh.instanceColor.needsUpdate = true;
  }

  opdater(dt) {
    const m = this.dummy;
    for (let i = 0; i < this.maks; i++) {
      const d = this.d[i];
      if (d.liv > 0) {
        d.liv -= dt;
        const b = Math.exp(-d.m * dt);
        d.vy -= d.g * dt; d.vx *= b; d.vy *= b; d.vz *= b;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        if (d.y < d.gulv) { d.y = d.gulv; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; d.sx *= 0.5; d.sy *= 0.5; }
        d.rx += d.sx * dt; d.ry += d.sy * dt;
      }
      m.position.set(d.x || 0, d.y || 0, d.z || 0);
      m.rotation.set(d.rx || 0, d.ry || 0, 0);
      m.scale.setScalar(d.liv > 0 ? d.s * Math.min(1, d.liv / 0.4) : 0);
      m.updateMatrix();
      this.mesh.setMatrixAt(i, m.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  ryd() { for (const d of this.d) d.liv = 0; this.opdater(0); }
}
