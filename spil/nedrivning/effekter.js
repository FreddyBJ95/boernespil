// ===== Effekterne: ildkugler, røg, støvskyer, gnister, glasskår, grus, brændemærker og lys =====
// Ild og røg er de samme "pust": en blød kugle af støj, der starter hvidglødende varm, bliver orange og
// rød og ender som røg, der stiger og driver med vinden. Pustene sorteres bagfra og frem hvert billede,
// så røgen dækker rigtigt for hinanden. Lyset fra ilden er HDR (lysere end hvidt), så efterbehandlingen
// kan få det til at stråle.

import * as THREE from "../3d-faelles/three.module.js";

const mobil = matchMedia("(pointer:coarse)").matches;
const MAKS_PUST = mobil ? 900 : 2200, MAKS_GNIST = mobil ? 500 : 1200, MAKS_GRUS = mobil ? 500 : 1100, MAKS_SKÅR = mobil ? 500 : 1000;
const r = (a, b) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

// ---------- Støj som et billede (billigere end at regne den ud for hver prik på skærmen) ----------
function støjBillede(n = 128) {
  const data = new Uint8Array(n * n * 4);
  const gitter = (g, frø) => {                                 // et gitter af tilfældige tal, der gentager sig
    const v = new Float32Array(g * g); let s = frø;
    for (let i = 0; i < v.length; i++) { s = (s * 16807) % 2147483647; v[i] = s / 2147483647; }
    return (x, y) => v[((y % g + g) % g) * g + ((x % g + g) % g)];
  };
  const blød = (f, g, x, y) => {
    const gx = x * g / n, gy = y * g / n, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = f(ix, iy), b = f(ix + 1, iy), c = f(ix, iy + 1), d = f(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const lag = [4, 8, 16, 32].map((g, i) => [g, gitter(g, 1234 + i * 977)]);
  const lag2 = [4, 8, 16, 32].map((g, i) => [g, gitter(g, 4321 + i * 577)]);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let a = 0, b = 0, w = 0.5;
    for (let i = 0; i < 4; i++) { a += blød(lag[i][1], lag[i][0], x, y) * w; b += blød(lag2[i][1], lag2[i][0], x, y) * w; w *= 0.5; }
    const i = (y * n + x) * 4;
    data[i] = Math.min(255, a / 0.9375 * 255); data[i + 1] = Math.min(255, b / 0.9375 * 255);
    data[i + 2] = Math.min(255, blød(lag[2][1], lag[2][0], x, y) * 255); data[i + 3] = Math.min(255, blød(lag2[3][1], lag2[3][0], x, y) * 255);
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// ---------- Pustene: ild, røg og støv ----------
const PUST_VERTEX = `
attribute vec3 iPos;
attribute vec4 iA;
attribute vec4 iB;
attribute vec3 iFarve;
uniform vec3 uHoejre;
uniform vec3 uOp;
uniform float uTaage;
varying vec2 vQ;
varying vec4 vB;
varying vec3 vFarve;
varying float vSeed;
varying float vAlder;
varying float vY;
varying float vTaage;
varying float vStr;
void main() {
  float c = cos(iA.y), s = sin(iA.y);
  vec2 q = position.xy;
  vec2 qr = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  vec3 w = iPos + (uHoejre * qr.x + uOp * qr.y) * iA.x;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  vQ = q * 2.0; vB = iB; vFarve = iFarve; vSeed = iA.w; vAlder = iA.z; vY = w.y; vStr = iA.x;
  float d = length(mv.xyz) * uTaage;
  vTaage = 1.0 - exp(-d * d);
}`;
const PUST_FRAGMENT = `
uniform sampler2D tStoej;
uniform vec3 uSolKam;
uniform vec3 uSolFarve;
uniform vec3 uHimmelFarve;
uniform vec3 uTaageFarve;
varying vec2 vQ;
varying vec4 vB;
varying vec3 vFarve;
varying float vSeed;
varying float vAlder;
varying float vY;
varying float vTaage;
varying float vStr;
vec3 sortLegeme(float T) {
  vec3 c = mix(vec3(0.0), vec3(0.55, 0.04, 0.0), smoothstep(0.08, 0.32, T));
  c = mix(c, vec3(1.0, 0.3, 0.03), smoothstep(0.28, 0.58, T));
  c = mix(c, vec3(1.0, 0.64, 0.18), smoothstep(0.55, 0.85, T));
  c = mix(c, vec3(1.0, 0.92, 0.72), smoothstep(0.85, 1.25, T));
  return c * (0.4 + 9.0 * T * T);
}
void main() {
  float r = length(vQ);
  if (r > 1.0) discard;
  float t = vAlder * 0.35;
  vec2 uv = vQ * 0.28 + vec2(vSeed * 7.31, vSeed * 3.17);
  // støjen forskydes af sig selv ("domain warp"), så kanterne bliver krøllede som rigtig røg
  vec4 s0 = texture2D(tStoej, uv * 0.55 + vec2(t * 0.05, -t * 0.03));
  vec2 warp = (s0.rg - 0.5) * 0.32;
  vec4 s1 = texture2D(tStoej, uv + warp + vec2(t * 0.09, -t * 0.06));
  vec4 s2 = texture2D(tStoej, uv * 1.9 + warp * 1.5 - vec2(t * 0.04, t * 0.11) + 0.37);
  float n1 = mix(s1.r, s1.g, fract(vSeed * 5.0));
  float n2 = mix(s2.b, s2.a, 0.5);
  float boelge = n1 * 0.86 + n2 * 0.14;
  float kant = 1.0 - r * r;
  float taet = kant * 1.15 + (boelge - 0.5) * 2.7 - 0.24;
  taet = smoothstep(0.0, 0.55, taet);
  if (taet < 0.004) discard;
  // lys og skygge: toppen og siden mod solen er lyse, kløfterne mellem bølgerne mørke
  float hul = smoothstep(0.28, 0.72, boelge);
  vec3 n = normalize(vec3(vQ.x + (n2 - 0.5) * 1.5, vQ.y + (n1 - 0.5) * 1.5 + 0.2, sqrt(max(0.0, 1.0 - r * r)) + 0.12));
  float lys = clamp(dot(n, uSolKam) * 0.7 + 0.32, 0.0, 1.0);
  vec3 roeg = vFarve * (uHimmelFarve * (0.26 + 0.22 * hul) + uSolFarve * lys * (0.35 + 0.45 * hul));
  roeg += vB.z * vec3(1.7, 0.55, 0.14) * (0.35 + 0.65 * (0.5 - vQ.y * 0.5)) * (0.3 + boelge);
  // ilden: varmest i midten og i bølgerne; sod (mørke striber) hvor den er køligere
  float T = vB.x * (0.3 + 1.05 * boelge) * (0.4 + 0.75 * kant);
  vec3 ild = sortLegeme(T);
  float ildDel = smoothstep(0.14, 0.5, T);
  float a = taet * vB.y * smoothstep(0.0, max(0.35, vStr * 0.22), vY);
  vec3 farve = roeg * (1.0 - ildDel) * a + ild * taet * vB.y;
  float alfa = a * (1.0 - ildDel * 0.9);
  farve = mix(farve, uTaageFarve * alfa, vTaage);
  gl_FragColor = vec4(farve, alfa);
}`;

class Pust {
  constructor(scene, støj, n) {
    this.n = n; this.antal = 0;
    // simulering (på CPU'en)
    this.pos = new Float32Array(n * 3); this.fart = new Float32Array(n * 3);
    this.str = new Float32Array(n); this.slutStr = new Float32Array(n); this.vækst = new Float32Array(n);
    this.rot = new Float32Array(n); this.drej = new Float32Array(n); this.alder = new Float32Array(n); this.liv = new Float32Array(n);
    this.varme = new Float32Array(n); this.køl = new Float32Array(n); this.løft = new Float32Array(n); this.bremse = new Float32Array(n);
    this.tæt = new Float32Array(n); this.farve = new Float32Array(n * 3); this.vind = new Float32Array(n); this.frø = new Float32Array(n);
    this.indfas = new Float32Array(n); this.glød = new Float32Array(n);
    this.ledig = []; for (let i = n - 1; i >= 0; i--) this.ledig.push(i);
    this.aktive = [];
    // tegning
    const geo = new THREE.InstancedBufferGeometry();
    const plan = new THREE.PlaneGeometry(1, 1);
    geo.index = plan.index; geo.setAttribute("position", plan.attributes.position);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aA = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aB = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aF = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iPos", this.aPos); geo.setAttribute("iA", this.aA); geo.setAttribute("iB", this.aB); geo.setAttribute("iFarve", this.aF);
    geo.instanceCount = 0;
    this.u = {
      tStoej: { value: støj }, uHoejre: { value: new THREE.Vector3(1, 0, 0) }, uOp: { value: new THREE.Vector3(0, 1, 0) },
      uSolKam: { value: new THREE.Vector3(0, 1, 0) }, uSolFarve: { value: new THREE.Color(1, 0.95, 0.85) }, uHimmelFarve: { value: new THREE.Color(0.55, 0.62, 0.72) },
      uTaageFarve: { value: new THREE.Color(0.7, 0.75, 0.8) }, uTaage: { value: 0.004 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: PUST_VERTEX, fragmentShader: PUST_FRAGMENT, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 10;
    scene.add(this.mesh);
    this.orden = [];
  }
  // Et nyt pust. o: { p, v, str, slut, vækst, liv, varme, køl, løft, bremse, tæt, farve: [r,g,b], vind, glød }
  nyt(o) {
    let i = this.ledig.pop();
    if (i === undefined) { i = this.aktive.shift(); if (i === undefined) return; }
    else this.antal++;
    this.pos.set([o.p.x, o.p.y, o.p.z], i * 3);
    this.fart.set([o.v?.x ?? 0, o.v?.y ?? 0, o.v?.z ?? 0], i * 3);
    this.str[i] = o.str; this.slutStr[i] = o.slut ?? o.str * 2; this.vækst[i] = o.vækst ?? 1;
    this.rot[i] = Math.random() * 6.28; this.drej[i] = (Math.random() - 0.5) * (o.drej ?? 0.6);
    this.alder[i] = 0; this.liv[i] = o.liv; this.varme[i] = o.varme ?? 0; this.køl[i] = o.køl ?? 0.3;
    this.løft[i] = o.løft ?? 0; this.bremse[i] = o.bremse ?? 1; this.tæt[i] = o.tæt ?? 0.8;
    this.farve.set(o.farve ?? [0.4, 0.4, 0.4], i * 3); this.vind[i] = o.vind ?? 1; this.frø[i] = Math.random();
    this.indfas[i] = o.indfas ?? 0.04; this.glød[i] = o.glød ?? 0;
    this.aktive.push(i);
  }
  opdater(dt, vind, kamera) {
    const ny = [];
    for (const i of this.aktive) {
      this.alder[i] += dt;
      if (this.alder[i] >= this.liv[i]) { this.ledig.push(i); this.antal--; continue; }
      ny.push(i);
      const k = Math.exp(-this.bremse[i] * dt), j = i * 3, h = this.varme[i];
      const vk = Math.min(1, this.vind[i] * dt * (0.15 + Math.min(1, this.alder[i] * 0.3)));
      this.fart[j] = this.fart[j] * k + (vind.x - this.fart[j]) * vk;
      this.fart[j + 2] = this.fart[j + 2] * k + (vind.z - this.fart[j + 2]) * vk;
      this.fart[j + 1] = this.fart[j + 1] * k + (this.løft[i] * (0.25 + h)) * dt;
      this.pos[j] += this.fart[j] * dt; this.pos[j + 1] += this.fart[j + 1] * dt; this.pos[j + 2] += this.fart[j + 2] * dt;
      const bund = this.str[i] * 0.38;
      if (this.pos[j + 1] < bund) { this.pos[j + 1] = bund; if (this.fart[j + 1] < 0) { const v = -this.fart[j + 1] * 0.5; this.fart[j + 1] = 0; this.fart[j] += Math.sign(this.fart[j] || 1) * v * 0.3; this.fart[j + 2] += Math.sign(this.fart[j + 2] || 1) * v * 0.3; } }
      this.varme[i] = h * Math.exp(-dt / this.køl[i]);
      this.str[i] += (this.slutStr[i] - this.str[i]) * (1 - Math.exp(-this.vækst[i] * dt));
      this.rot[i] += this.drej[i] * dt;
    }
    this.aktive = ny;
    // sortér bagfra og frem
    const kp = kamera.position, fx = -kamera.matrixWorld.elements[8], fy = -kamera.matrixWorld.elements[9], fz = -kamera.matrixWorld.elements[10];
    const o = this.orden; o.length = 0;
    for (const i of ny) o.push(i);
    const dyb = this.dyb || (this.dyb = new Float32Array(this.n));
    for (const i of o) { const j = i * 3; dyb[i] = (this.pos[j] - kp.x) * fx + (this.pos[j + 1] - kp.y) * fy + (this.pos[j + 2] - kp.z) * fz; }
    o.sort((a, b) => dyb[b] - dyb[a]);
    const P = this.aPos.array, A = this.aA.array, B = this.aB.array, F = this.aF.array;
    let n = 0;
    for (const i of o) {
      const j = i * 3, liv = this.alder[i] / this.liv[i];
      const ind = Math.min(1, this.alder[i] / this.indfas[i]), ud = 1 - Math.pow(liv, 2.2);
      P[n * 3] = this.pos[j]; P[n * 3 + 1] = this.pos[j + 1]; P[n * 3 + 2] = this.pos[j + 2];
      A[n * 4] = this.str[i]; A[n * 4 + 1] = this.rot[i]; A[n * 4 + 2] = this.alder[i]; A[n * 4 + 3] = this.frø[i];
      B[n * 4] = this.varme[i]; B[n * 4 + 1] = this.tæt[i] * ind * ud; B[n * 4 + 2] = Math.min(1.2, this.glød[i] * this.varme[i] * 3 + this.varme[i] * 0.4); B[n * 4 + 3] = 0;
      F[n * 3] = this.farve[j]; F[n * 3 + 1] = this.farve[j + 1]; F[n * 3 + 2] = this.farve[j + 2];
      n++;
    }
    this.mesh.geometry.instanceCount = n;
    for (const a of [this.aPos, this.aA, this.aB, this.aF]) a.needsUpdate = true;
  }
  tøm() { for (const i of this.aktive) this.ledig.push(i); this.aktive = []; this.antal = 0; this.mesh.geometry.instanceCount = 0; }
}

// ---------- Gnister og lysende glimt (lægges oven i billedet, som lys) ----------
const GNIST_VERTEX = `
attribute vec3 iPos;
attribute vec3 iFart;
attribute vec4 iD;
varying vec2 vQ;
varying vec4 vD;
void main() {
  vec4 a = viewMatrix * vec4(iPos, 1.0);
  vec4 b = viewMatrix * vec4(iPos - iFart * iD.y, 1.0);
  vec2 sa = a.xy / -a.z, sb = b.xy / -b.z;
  vec2 akse = sa - sb; float l = length(akse);
  vec2 ret = l > 1e-5 ? akse / l : vec2(1.0, 0.0);
  vec2 tvaers = vec2(-ret.y, ret.x);
  vec3 p = mix(b.xyz, a.xyz, position.x + 0.5);
  p.xy += tvaers * position.y * iD.x * -p.z * 0.002 * 2.0;
  p.xy += ret * (position.x) * iD.x * -p.z * 0.002;
  gl_Position = projectionMatrix * vec4(p, 1.0);
  vQ = position.xy * 2.0; vD = iD;
}`;
const GNIST_FRAGMENT = `
varying vec2 vQ;
varying vec4 vD;
void main() {
  float a = smoothstep(1.0, 0.0, abs(vQ.y)) * smoothstep(1.0, 0.6, abs(vQ.x));
  vec3 c = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.85, 0.55), vD.z) * vD.w;
  gl_FragColor = vec4(c * a, 0.0);
}`;
class Gnister {
  constructor(scene, n) {
    this.n = n; this.liste = [];
    const geo = new THREE.InstancedBufferGeometry(), plan = new THREE.PlaneGeometry(1, 1);
    geo.index = plan.index; geo.setAttribute("position", plan.attributes.position);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aFart = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aD = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iPos", this.aPos); geo.setAttribute("iFart", this.aFart); geo.setAttribute("iD", this.aD);
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({ vertexShader: GNIST_VERTEX, fragmentShader: GNIST_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 11;
    scene.add(this.mesh);
  }
  nyt(p, v, liv, tyk = 1.5, varm = 1, lys = 6) {
    if (this.liste.length >= this.n) this.liste.shift();
    this.liste.push({ p: p.clone(), v: v.clone(), liv, alder: 0, tyk, varm, lys });
  }
  opdater(dt) {
    const P = this.aPos.array, V = this.aFart.array, D = this.aD.array;
    let n = 0;
    this.liste = this.liste.filter(g => (g.alder += dt) < g.liv);
    for (const g of this.liste) {
      g.v.y -= 9.8 * dt; g.v.multiplyScalar(Math.exp(-0.6 * dt));
      g.p.addScaledVector(g.v, dt);
      if (g.p.y < 0.02) { g.p.y = 0.02; g.v.y *= -0.35; g.v.x *= 0.6; g.v.z *= 0.6; }
      const l = 1 - g.alder / g.liv;
      P.set([g.p.x, g.p.y, g.p.z], n * 3); V.set([g.v.x, g.v.y, g.v.z], n * 3);
      D[n * 4] = g.tyk; D[n * 4 + 1] = 0.035; D[n * 4 + 2] = g.varm * l; D[n * 4 + 3] = g.lys * l * l;
      n++;
    }
    this.mesh.geometry.instanceCount = n;
    this.aPos.needsUpdate = this.aFart.needsUpdate = this.aD.needsUpdate = true;
  }
  tøm() { this.liste.length = 0; this.mesh.geometry.instanceCount = 0; }
}

// Glimtet: en kort, blændende kugle af lys i sprængningens midte
const GLIMT_FRAGMENT = `
uniform vec3 uFarve;
uniform float uStyrke;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float a = exp(-r * r * 5.0) + 0.25 * exp(-r * r * 1.2);
  gl_FragColor = vec4(uFarve * uStyrke * a, 0.0);
}`;
class Glimt {
  constructor(scene, n = 6) {
    this.puljer = Array.from({ length: n }, () => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uFarve: { value: new THREE.Color(1, 0.8, 0.5) }, uStyrke: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0,0.0,0.0,1.0); mv.xy += position.xy * vec2(length(modelMatrix[0].xyz)); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: GLIMT_FRAGMENT, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.frustumCulled = false; m.visible = false; m.renderOrder = 12;
      scene.add(m);
      return { m, tid: 0, liv: 1, styrke: 0 };
    });
  }
  nyt(p, str, styrke, liv, farve) {
    const g = this.puljer.reduce((a, b) => (a.tid <= 0 ? a : b.tid <= 0 ? b : a.tid < b.tid ? a : b));
    g.m.position.copy(p); g.m.scale.setScalar(str); g.tid = g.liv = liv; g.styrke = styrke; g.m.visible = true;
    g.m.material.uniforms.uFarve.value.set(farve ?? 0xffc890);
  }
  opdater(dt) {
    for (const g of this.puljer) {
      if (g.tid <= 0) continue;
      g.tid -= dt;
      if (g.tid <= 0) { g.m.visible = false; continue; }
      const l = g.tid / g.liv;
      g.m.material.uniforms.uStyrke.value = g.styrke * l * l;
    }
  }
}

// ---------- Småting med en enkel fysik: grus og glasskår ----------
class Småting {
  constructor(scene, geo, mat, n, skår = false) {
    this.mesh = new THREE.InstancedMesh(geo, mat, n);
    this.mesh.castShadow = !skår; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    this.n = n; this.liste = []; this.næste = 0; this.skår = skår;
    scene.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3();
  }
  nyt(p, v, str, farve, røg = 0) {
    const i = this.næste; this.næste = (this.næste + 1) % this.n;
    if (this.mesh.count < this.n) this.mesh.count = Math.max(this.mesh.count, i + 1);
    const t = { i, p: p.clone(), v: v.clone(), q: new THREE.Quaternion().random(), w: new THREE.Vector3(r(-12, 12), r(-12, 12), r(-12, 12)), str, ro: false, røg, røgTid: 0 };
    this.liste[i] = t;
    this.mesh.setColorAt(i, farve); this.mesh.instanceColor.needsUpdate = true;
    return t;
  }
  opdater(dt, pust) {
    let ændret = false;
    for (const t of this.liste) {
      if (!t || t.ro) continue;
      ændret = true;
      t.v.y -= 9.8 * dt;
      if (this.skår) t.v.multiplyScalar(Math.exp(-1.2 * dt));
      t.p.addScaledVector(t.v, dt);
      const bund = t.str * 0.25;
      if (t.p.y < bund) {
        t.p.y = bund;
        if (Math.abs(t.v.y) < 1.2 && t.v.lengthSq() < 2) { t.ro = true; t.v.set(0, 0, 0); }
        t.v.y *= -0.25; t.v.x *= 0.45; t.v.z *= 0.45; t.w.multiplyScalar(0.4);
      }
      tmp.copy(t.w).multiplyScalar(dt);
      const vinkel = tmp.length();
      if (vinkel > 0) t.q.premultiply(this.q.setFromAxisAngle(tmp.normalize(), vinkel));
      if (t.røg > 0 && pust && t.v.lengthSq() > 120) {            // et kort røgspor efter de hurtigste stykker
        t.røgTid -= dt;
        if (t.røgTid <= 0) { t.røgTid = 0.035; t.røg -= 0.035; pust.nyt({ p: t.p, str: 0.22, slut: 0.8, vækst: 1.5, liv: r(0.7, 1.3), tæt: 0.45, farve: [0.3, 0.28, 0.26], vind: 1.2, løft: 0.4, bremse: 2 }); }
      }
      this.s.setScalar(t.str);
      this.m.compose(t.p, t.q, this.s); this.mesh.setMatrixAt(t.i, this.m);
    }
    if (ændret) this.mesh.instanceMatrix.needsUpdate = true;
  }
  tøm() { this.liste = []; this.mesh.count = 0; this.næste = 0; }
}

// ---------- Brændemærker på jorden ----------
function brændTekstur() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  for (let i = 0; i < 60; i++) {
    const v = Math.random() * 6.28, a = Math.random() * 90, x = 128 + Math.cos(v) * a, y = 128 + Math.sin(v) * a, rad = 20 + Math.random() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(0,0,0,0.5)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(0,0,0,0.95)"); gr.addColorStop(0.45, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ===== Alt samlet =====
export class Effekter {
  constructor(scene) {
    this.scene = scene;
    const støj = støjBillede();
    this.pust = new Pust(scene, støj, MAKS_PUST);
    this.gnister = new Gnister(scene, MAKS_GNIST);
    this.glimt = new Glimt(scene);
    const grusMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const brokGeo = new THREE.IcosahedronGeometry(0.5, 0);
    this.grus = new Småting(scene, brokGeo, grusMat, MAKS_GRUS);
    const skårGeo = new THREE.BufferGeometry();
    skårGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, -0.3, 0.5, 0, -0.4, 0.05, 0, 0.6], 3)); skårGeo.computeVertexNormals();
    const skårMat = new THREE.MeshStandardMaterial({ color: 0xd8e8ee, metalness: 1, roughness: 0.04, side: THREE.DoubleSide, envMapIntensity: 2.2, transparent: true, opacity: 0.85 });
    this.skår = new Småting(scene, skårGeo, skårMat, MAKS_SKÅR, true);
    // brændemærker
    this.mærkeMat = new THREE.MeshStandardMaterial({ map: brændTekstur(), color: 0x0c0a08, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 1 });
    this.mærker = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.mærkeMat, 80);
    this.mærker.count = 0; this.mærker.frustumCulled = false; this.mærker.receiveShadow = true; this.mærkeNr = 0;
    scene.add(this.mærker);
    // lys: en fast pulje, så skærmkortet aldrig skal bygge sine programmer om (det giver hak)
    this.lys = Array.from({ length: mobil ? 3 : 6 }, () => {
      const l = new THREE.PointLight(0xffa860, 0, 0, 2); l.castShadow = false; scene.add(l);
      return { l, tid: 0, liv: 1, top: 0, flimmer: 0, ild: null };
    });
    this.ilde = [];
    this.vind = new THREE.Vector3(1.6, 0, 0.7);
    this.ryst = 0;
  }
  tøm() {
    this.pust.tøm(); this.gnister.tøm(); this.grus.tøm(); this.skår.tøm();
    this.mærker.count = 0; this.mærkeNr = 0; this.ilde = []; this.ryst = 0;
    for (const l of this.lys) { l.l.intensity = 0; l.tid = 0; l.ild = null; }
  }
  // Himlens og solens farver, så røgen får det samme lys som resten af verdenen
  lysFra(sol, solRetning, himmel, tåge, tæthed) {
    this.pust.u.uSolFarve.value.copy(sol.color).multiplyScalar(Math.min(1.2, sol.intensity / 2.6));
    this.pust.u.uHimmelFarve.value.copy(himmel);
    this.pust.u.uTaageFarve.value.copy(tåge); this.pust.u.uTaage.value = tæthed;
    this.solRetning = solRetning.clone();
  }

  // ---------- En sprængning ----------
  // W: sprængstoffets størrelse i kg TNT · art: "høj" (dynamit, C4, TNT), "benzin", "gas"
  eksplosion(p, W, art = "høj", { jord = p.y < 1.2, kamera = null } = {}) {
    const S = Math.cbrt(W), høj = art === "høj", benzin = art === "benzin", gas = art === "gas";
    const PU = this.pust;
    // mange sprængninger på én gang: hver får færre pust, så røgen ikke løber tør
    const plads = Math.max(0.22, Math.min(1, 1.15 - PU.antal / PU.n)), N = x => Math.max(1, Math.round(x * plads));
    // ildkuglen
    const n = N((høj ? 14 : 20) + (høj ? 14 : 18) * S);
    for (let i = 0; i < n; i++) {
      const d = tmp.set(r(-1, 1), r(-0.3, 1), r(-1, 1)).normalize();
      if (jord) d.y = Math.abs(d.y) * 0.8 + 0.15;
      const fart = (høj ? r(8, 20) : r(5, 13)) * S;
      const varm = høj ? r(0.08, 0.18) : benzin ? r(0.45, 0.85) : r(0.35, 0.6);
      PU.nyt({
        p: tmp2.copy(p).addScaledVector(d, r(0, 0.35) * S), v: d.clone().multiplyScalar(fart), str: r(0.35, 0.65) * S, slut: r(1.5, 2.5) * S * (benzin ? 1.25 : 1), vækst: r(3, 5),
        liv: r(7, 13) * (0.7 + S * 0.15), varme: høj ? r(0.9, 1.15) : r(1.05, 1.3), køl: varm * Math.sqrt(S), løft: høj ? r(2, 4) : r(6, 9), bremse: r(3.4, 5),
        tæt: r(0.85, 1), farve: benzin ? grå(r(0.04, 0.08)) : gas ? grå(r(0.25, 0.38)) : brun(r(0.28, 0.42)), vind: 0.8, glød: 0.6, drej: 0.8, indfas: 0.02,
      });
    }
    // søjlen af røg og ild, der stiger op (benzin og gas)
    if (!høj) for (let i = 0; i < N(8 + 6 * S); i++) {
      PU.nyt({ p: tmp2.copy(p).add(tmp.set(r(-0.5, 0.5) * S, r(0, 1) * S, r(-0.5, 0.5) * S)), v: tmp.set(r(-1, 1), r(6, 12) * S, r(-1, 1)), str: r(0.8, 1.3) * S, slut: r(2.6, 3.6) * S, vækst: r(1.5, 2.5),
        liv: r(9, 15), varme: r(0.8, 1.1), køl: r(0.5, 0.9) * Math.sqrt(S), løft: 5, bremse: r(1.3, 1.9), tæt: 0.95, farve: benzin ? grå(r(0.03, 0.06)) : grå(r(0.22, 0.32)), vind: 0.9, glød: 0.8 });
    }
    // støvringen langs jorden (trykbølgen hvirvler jorden op) og støvstrålerne (det kantede udseende)
    if (jord) {
      for (let i = 0; i < N(4 + 10 * S * S); i++) {
        const v = r(0, 6.283), d = tmp.set(Math.cos(v), 0, Math.sin(v));
        PU.nyt({ p: tmp2.copy(p).addScaledVector(d, r(0.4, 1.2) * S).setY(r(0.2, 0.6)), v: d.clone().multiplyScalar(r(7, 15) * S).setY(r(0.3, 1.6)), str: r(0.8, 1.3) * S, slut: r(2.6, 4.2) * S, vækst: r(1.4, 2.2),
          liv: r(6, 11), tæt: r(0.35, 0.6), farve: jordFarve(), vind: 1, bremse: r(2.2, 3), løft: 0.15, indfas: 0.05 });
      }
      if (høj && W >= 1.5) for (let s = 0; s < N(2 + 2 * S * S); s++) {
        const d = tmp.set(r(-1, 1), r(0.6, 1.8), r(-1, 1)).normalize().clone();
        for (let k = 0; k < 5; k++) PU.nyt({ p: tmp2.copy(p).addScaledVector(d, k * 0.35 * S), v: d.clone().multiplyScalar((6 + k * 4.5) * S), str: (0.45 + k * 0.1) * S, slut: (1.3 + k * 0.25) * S, vækst: 2,
          liv: r(5, 9), tæt: 0.55, farve: jordFarve(), vind: 1, bremse: r(2.2, 2.8), løft: 0.2, indfas: 0.03 });
      }
    }
    // gnister og glødende stumper
    for (let i = 0; i < (høj ? 40 : 25) * S; i++) {
      const d = tmp.set(r(-1, 1), r(-0.2, 1.2), r(-1, 1)).normalize();
      this.gnister.nyt(p, d.multiplyScalar(r(10, 38) * (høj ? 1 : 0.7)), r(0.3, 1.5), r(1.2, 2.4), Math.random(), r(5, 14));
    }
    // grus og sten med røgspor
    if (jord) for (let i = 0; i < 12 * S; i++) {
      const d = tmp.set(r(-1, 1), r(0.4, 1.6), r(-1, 1)).normalize();
      this.grus.nyt(p, d.multiplyScalar(r(6, 22) * Math.sqrt(S)), r(0.05, 0.22), new THREE.Color().setRGB(...jordFarve().map(x => x * 1.4)), Math.random() < 0.12 ? 0.5 : 0);
    }
    // glimtet og lyset
    this.glimt.nyt(tmp2.copy(p).setY(p.y + 0.3), (høj ? 7 : 9) * S, høj ? 40 : 18, høj ? 0.09 : 0.22, høj ? 0xfff0d0 : 0xffb070);
    this.glimt.nyt(tmp2.copy(p).setY(p.y + 0.8 * S), 18 * S, høj ? 5 : 8, høj ? 0.35 : 0.9, 0xff9a50);
    this.lysBlink(tmp2.copy(p).setY(p.y + 1.5 + S), Math.min(4000, (høj ? 700 : 380) * S * S), høj ? 0.2 : 1.1, høj ? 0 : 0.5);
    // brændemærke
    if (jord) this.mærke(p, (høj ? 1.6 : 2.6) * S);
    // kameraet ryster (mere jo tættere på)
    const afstand = kamera ? kamera.position.distanceTo(p) : 30;
    this.ryst = Math.min(1.6, this.ryst + 0.9 * S / (1 + afstand / 14));
    return S;
  }
  // Støv, når noget knuses eller styrter (vol: hvor meget, i m³)
  støv(p, vol, farve = [0.6, 0.57, 0.52], fart = 2) {
    const plads = Math.max(0.15, Math.min(1, 1.1 - this.pust.antal / this.pust.n));
    const n = Math.max(1, Math.round(Math.min(14, 2 + Math.sqrt(vol) * 3) * plads)), S = Math.cbrt(Math.max(0.05, vol));
    for (let i = 0; i < n; i++) {
      const d = tmp.set(r(-1, 1), r(-0.1, 0.7), r(-1, 1)).normalize();
      this.pust.nyt({ p: tmp2.copy(p).addScaledVector(d, r(0, 0.6) * S), v: d.clone().multiplyScalar(r(0.5, 1.5) * fart), str: r(0.6, 1.1) * S + 0.3, slut: r(2, 3.4) * S + 1, vækst: r(0.7, 1.3),
        liv: r(7, 14), tæt: r(0.32, 0.55), farve: farve.map(x => x * r(0.85, 1.1)), vind: 0.8, bremse: 1.2, løft: 0.25, indfas: 0.15 });
    }
  }
  // Grus fra en knust del (farven fra materialet)
  smågrus(p, n, farve, fart = 3) {
    for (let i = 0; i < n; i++) {
      const d = tmp.set(r(-1, 1), r(0, 1.2), r(-1, 1)).normalize();
      this.grus.nyt(tmp2.copy(p).add(tmp.clone().multiplyScalar(0.3)), d.multiplyScalar(r(0.5, 1.5) * fart), r(0.04, 0.16), farve);
    }
  }
  // En rude knuses: glasskår kastes væk fra sprængningen
  glas(p, normal, b, h, fra = null) {
    const n = Math.min(26, Math.round(b * h * 12) + 6);
    for (let i = 0; i < n; i++) {
      const q = tmp2.set(r(-0.5, 0.5) * b, r(-0.5, 0.5) * h, 0);
      const pos = p.clone().add(q.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(normal.x, normal.z)));
      const ud = fra ? pos.clone().sub(fra).normalize() : normal.clone();
      if (ud.dot(normal) < 0 && fra) ud.addScaledVector(normal, -2 * ud.dot(normal) * 0.5);
      this.skår.nyt(pos, ud.multiplyScalar(r(2, 9)).add(tmp.set(r(-1, 1), r(0, 2), r(-1, 1))), r(0.05, 0.17), new THREE.Color(1, 1, 1));
    }
  }
  mærke(p, str) {
    const i = this.mærkeNr++ % 80;
    this.mærker.count = Math.min(80, Math.max(this.mærker.count, i + 1));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0.012 + i * 0.0002, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28), new THREE.Vector3(str * 2, 1, str * 2));
    this.mærker.setMatrixAt(i, m); this.mærker.instanceMatrix.needsUpdate = true;
  }
  // Ild, der bliver ved med at brænde (efter en tønde eller en gasflaske). styrke ~ 1 for en tønde
  ild(p, styrke = 1, varighed = 20, sort = true) {
    const ild = { p: p.clone(), styrke, rest: varighed, varighed, sort, t: 0, t2: 0 };
    this.ilde.push(ild);
    return ild;
  }
  lysBlink(p, styrke, liv, flimmer = 0, ild = null) {
    let l = this.lys.find(x => x.tid <= 0 && !x.ild) || this.lys.reduce((a, b) => (a.top * a.tid / a.liv < b.top * b.tid / b.liv ? a : b));
    l.l.position.copy(p); l.top = styrke; l.tid = l.liv = liv; l.flimmer = flimmer; l.ild = ild;
    l.l.color.setRGB(1, 0.6, 0.3);
    return l;
  }

  opdater(dt, kamera) {
    // ildene
    this.ilde = this.ilde.filter(f => (f.rest -= dt) > 0);
    for (const f of this.ilde) {
      const k = Math.min(1, f.rest / 4) * Math.min(1, (f.varighed - f.rest) * 2 + 0.3), S = f.styrke;
      f.t -= dt;
      while (f.t <= 0) {
        f.t += 0.045 / Math.max(0.3, S * k);
        this.pust.nyt({ p: tmp2.copy(f.p).add(tmp.set(r(-0.4, 0.4) * S, r(0, 0.3), r(-0.4, 0.4) * S)), v: tmp.set(r(-0.4, 0.4), r(1.5, 3), r(-0.4, 0.4)), str: r(0.35, 0.7) * S, slut: r(0.9, 1.4) * S, vækst: 2.5,
          liv: r(1.4, 2.6), varme: r(0.95, 1.2), køl: r(0.22, 0.38), løft: 4, bremse: 1.4, tæt: 0.9, farve: f.sort ? grå(r(0.05, 0.1)) : grå(0.3), vind: 0.6, glød: 0.8, indfas: 0.05 });
      }
      f.t2 -= dt;
      if (f.t2 <= 0) {
        f.t2 = 0.3;
        this.pust.nyt({ p: tmp2.copy(f.p).setY(f.p.y + S * 1.2), v: tmp.set(r(-0.3, 0.3), r(2, 3.2), r(-0.3, 0.3)), str: r(0.9, 1.3) * S, slut: r(3, 4.5) * S, vækst: 0.6,
          liv: r(9, 14), varme: 0.15, køl: 0.6, løft: 1.2, bremse: 0.5, tæt: 0.75 * k, farve: f.sort ? grå(r(0.06, 0.1)) : grå(0.35), vind: 1, glød: 1 });
      }
      if (!this.lys.some(l => l.ild === f) && Math.random() < dt * 4) {
        const fri = this.lys.find(l => l.tid <= 0 && !l.ild);
        if (fri) { fri.ild = f; fri.l.position.copy(f.p).setY(f.p.y + 2.6 + f.styrke); }
      }
    }
    // lysene
    for (const l of this.lys) {
      if (l.ild) {
        if (!this.ilde.includes(l.ild)) { l.ild = null; l.l.intensity = 0; continue; }
        if (l.tid <= 0) { const k = Math.min(1, l.ild.rest / 4); l.l.intensity = (26 + Math.random() * 18) * l.ild.styrke * l.ild.styrke * k; continue; }
      }
      if (l.tid <= 0) continue;
      l.tid -= dt;
      const t = Math.max(0, l.tid / l.liv);
      l.l.intensity = l.top * t * t * (l.flimmer ? 1 - l.flimmer * Math.random() : 1);
      if (l.tid <= 0 && !l.ild) l.l.intensity = 0;
    }
    // kameraets ryst dør ud
    this.ryst *= Math.exp(-dt * 3.2);
    // retning til solen set fra kameraet (røgens lys)
    if (this.solRetning) {
      const e = kamera.matrixWorld.elements;
      this.pust.u.uHoejre.value.set(e[0], e[1], e[2]); this.pust.u.uOp.value.set(e[4], e[5], e[6]);
      this.pust.u.uSolKam.value.set(this.solRetning.dot(tmp.set(e[0], e[1], e[2])), this.solRetning.dot(tmp.set(e[4], e[5], e[6])), this.solRetning.dot(tmp.set(e[8], e[9], e[10])));
    }
    this.pust.opdater(dt, this.vind, kamera);
    this.gnister.opdater(dt);
    this.glimt.opdater(dt);
    this.grus.opdater(dt, this.pust);
    this.skår.opdater(dt, null);
  }
  aktivitet() { return this.pust.antal + this.ilde.length * 30; }
}

function grå(v) { return [v, v * 0.98, v * 0.95]; }
function brun(v) { return [v * 1.08, v, v * 0.88]; }
function jordFarve() { const v = r(0.28, 0.38); return [v * 1.08, v, v * 0.84]; }
