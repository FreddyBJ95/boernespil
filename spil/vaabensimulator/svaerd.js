// ===== Sværdene: lyssværdet og ildsværdet =====
// Lyssværdet: et forkromet greb og en klinge af lys — en hvid kerne med en farvet glød omkring, der
// blafrer som flammer. Når man svinger, trækker klingen et lysspor efter sig.
// Ildsværdet: en glødende stålklinge med flammer, gløder og røg, der blæser bagud, når man svinger.
// Sværdet står langs +y med grebets midte i (0, 0, 0).

import * as THREE from "../3d-faelles/three.module.js";
import { side, del } from "./former.js";
import { mat } from "./materialer.js";

export const SVÆRDFARVER = {
  blå: [0.25, 0.55, 3.2], grøn: [0.35, 3.0, 0.45], rød: [3.4, 0.22, 0.18], lilla: [1.8, 0.35, 3.2],
  gul: [3.0, 2.2, 0.25], pink: [3.2, 0.5, 2.0], hvid: [2.2, 2.6, 3.2], regnbue: [2, 2, 2],
};
export const ILDFARVER = {
  ild: [[1.9, 1.05, 0.32], [1.1, 0.22, 0.02]], blå: [[0.6, 1.1, 2.2], [0.08, 0.25, 1.3]], grøn: [[0.9, 2.0, 0.45], [0.12, 0.8, 0.08]], lilla: [[1.5, 0.7, 2.1], [0.6, 0.08, 1.1]],
};

// ---------- Klingens glød (et bånd, der altid vender mod kameraet) ----------
const GLØD_V = `
uniform float uL; uniform float uB;
varying vec2 vP;
void main() {
  vec3 bund = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 top = (modelViewMatrix * vec4(0.0, max(uL, 0.0001), 0.0, 1.0)).xyz;
  vec3 a = normalize(top - bund);
  float langs = mix(-uB, uL + uB, position.y);
  vec3 p = bund + a * langs;
  vec3 tvaers = normalize(cross(a, normalize(p)));
  p += tvaers * position.x * uB;
  vP = vec2(position.x * uB, langs);
  gl_Position = projectionMatrix * vec4(p, 1.0);
}`;
const GLØD_F = `
uniform vec3 uFarve; uniform float uL; uniform float uB; uniform float uTid; uniform float uFlamme; uniform float uRegnbue; uniform float uStyrke; uniform float uKerne;
varying vec2 vP;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float st(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
vec3 regnbue(float x) { return clamp(abs(mod(x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  float dy = vP.y < 0.0 ? -vP.y : max(0.0, vP.y - uL);
  float d = length(vec2(vP.x, dy * 1.4));
  // flammerne: stoej, der stroemmer op ad klingen og faar kanten til at blafre
  float n = st(vec2(vP.y * 18.0 - uTid * 9.0, vP.x * 55.0 + uTid * 3.0)) * 0.65 + st(vec2(vP.y * 41.0 - uTid * 15.0, vP.x * 90.0)) * 0.35;
  float b = uB * (1.0 - uFlamme * 0.5 + uFlamme * n * 0.9);
  float gloed = exp(-pow(d / (b * 0.55), 2.0)) * 1.35 + exp(-d / (b * 0.3)) * 0.5;
  float kerne = smoothstep(0.0075, 0.0035, d);
  vec3 f = uRegnbue > 0.5 ? regnbue(vP.y * 1.3 - uTid * 0.5) * 2.6 + 0.15 : uFarve;
  vec3 c = (f * gloed * (0.85 + n * 0.3) + (vec3(1.0, 1.0, 1.0) * kerne * 1.15 + f * kerne * 0.35) * uKerne) * uStyrke;
  gl_FragColor = vec4(c, 1.0);
}`;

// Lysspor: et bånd gennem klingens seneste stillinger (lyser mest ude ved spidsen og falmer bagud)
const SPOR_V = `attribute float aAlfa; attribute float aTvaers; varying float vA; varying float vT;
  void main() { vA = aAlfa; vT = aTvaers; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SPOR_F = `uniform vec3 uFarve; uniform float uRegnbue; uniform float uTid; varying float vA; varying float vT;
  vec3 regnbue(float x) { return clamp(abs(mod(x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
  void main() { vec3 f = uRegnbue > 0.5 ? regnbue(vT * 1.2 - uTid * 0.5) * 2.4 : uFarve;
    float k = smoothstep(0.0, 0.35, vT) * (0.35 + 0.65 * vT); gl_FragColor = vec4(f * vA * k * 0.55 + vec3(vA * vA * k * 0.25), 1.0); }`;

class Spor {
  constructor(scene) {
    this.prøver = []; this.maks = 14; this.del = 4;
    const n = this.maks * this.del * 2;
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.alfa = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    const tv = new Float32Array(n); for (let i = 0; i < n; i++) tv[i] = i % 2;
    geo.setAttribute("position", this.pos); geo.setAttribute("aAlfa", this.alfa); geo.setAttribute("aTvaers", new THREE.BufferAttribute(tv, 1));
    const idx = []; for (let i = 0; i < n / 2 - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({ uniforms: { uFarve: { value: new THREE.Color() }, uRegnbue: { value: 0 }, uTid: { value: 0 } }, vertexShader: SPOR_V, fragmentShader: SPOR_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }
  // Gem klingens stilling nu og tegn båndet (glat kurve gennem de seneste stillinger)
  opdater(bund, top, t, synlig) {
    if (synlig) this.prøver.push({ b: bund.clone(), s: top.clone(), t });
    while (this.prøver.length && (t - this.prøver[0].t > 0.11 || this.prøver.length > this.maks)) this.prøver.shift();
    const P = this.prøver, n = P.length, A = this.pos.array, L = this.alfa.array;
    let k = 0;
    const cr = (a, b, c, d, u, ud) => {   // Catmull-Rom: glat kurve gennem fire punkter
      const u2 = u * u, u3 = u2 * u;
      ud.set(0, 0, 0).addScaledVector(a, -0.5 * u3 + u2 - 0.5 * u).addScaledVector(b, 1.5 * u3 - 2.5 * u2 + 1).addScaledVector(c, -1.5 * u3 + 2 * u2 + 0.5 * u).addScaledVector(d, 0.5 * u3 - 0.5 * u2);
    };
    const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < this.del; j++) {
        const u = j / this.del, p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
        cr(p0.b, p1.b, p2.b, p3.b, u, v1); cr(p0.s, p1.s, p2.s, p3.s, u, v2);
        const alder = t - (p1.t + (p2.t - p1.t) * u), a = Math.pow(Math.max(0, 1 - alder / 0.11), 1.6);
        A.set([v1.x, v1.y, v1.z, v2.x, v2.y, v2.z], k * 6); L[k * 2] = a; L[k * 2 + 1] = a; k++;
      }
    }
    if (n > 0) { A.set([P[n - 1].b.x, P[n - 1].b.y, P[n - 1].b.z, P[n - 1].s.x, P[n - 1].s.y, P[n - 1].s.z], k * 6); L[k * 2] = L[k * 2 + 1] = 1; k++; }
    this.mesh.geometry.setDrawRange(0, Math.max(0, (k - 1) * 6));
    this.pos.needsUpdate = true; this.alfa.needsUpdate = true;
  }
}

// ---------- Fælles for begge sværd ----------
class Sværd {
  constructor(scene, partikler, røg) {
    this.scene = scene; this.partikler = partikler; this.røg = røg;
    this.gruppe = new THREE.Group();
    this.ude = 0; this.mål = 0;              // hvor langt klingen er ude (0..1)
    this.bund = new THREE.Vector3(); this.top = new THREE.Vector3(); this.sidstTop = new THREE.Vector3(); this.fart = 0; this.spidsFart = new THREE.Vector3();
    this.spor = new Spor(scene);
  }
  tænd() { this.mål = 1; }
  sluk() { this.mål = 0; }
  get tændt() { return this.mål > 0.5; }
  // Klingens to ender i verden (til at skære frugt over)
  klinge() { return [this.bund, this.top]; }
  fælles(dt, t) {
    const før = this.ude;
    this.ude += (this.mål - this.ude) * (1 - Math.exp(-dt * (this.mål > this.ude ? 9 : 11)));
    if (Math.abs(this.ude - this.mål) < 0.002) this.ude = this.mål;
    this.gruppe.updateWorldMatrix(true, false);
    this.bund.set(0, this.klingeStart + this.klingeLængde * 0.25 * this.ude, 0).applyMatrix4(this.gruppe.matrixWorld);
    this.top.set(0, this.klingeStart + this.klingeLængde * this.ude, 0).applyMatrix4(this.gruppe.matrixWorld);
    this.spidsFart.copy(this.top).sub(this.sidstTop).divideScalar(Math.max(dt, 1e-3));
    if (før === 0 && this.ude > 0) this.spidsFart.set(0, 0, 0);
    this.fart = this.spidsFart.length() * Math.min(1, this.ude * 1.5);
    this.sidstTop.copy(this.top);
    this.spor.opdater(this.bund, this.top, t, this.ude > 0.3 && this.fart > 1.2 && this.gruppe.visible);
  }
}

// ---------- Lyssværdet ----------
export class Lyssværd extends Sværd {
  constructor(scene, partikler, røg) {
    super(scene, partikler, røg);
    this.klingeStart = 0.144; this.klingeLængde = 0.95; this.farveNavn = "blå";
    const g = this.gruppe;
    // Grebet: drejet krom med et ribbet gummigreb, kontakt og en lysende ring ved klingen
    const profil = [[0, 0], [0.015, 0], [0.0175, 0.003], [0.0178, 0.012], [0.016, 0.015], [0.016, 0.022], [0.017, 0.024], [0.017, 0.028], [0.0158, 0.030], [0.0158, 0.135],
      [0.0172, 0.137], [0.018, 0.14], [0.018, 0.175], [0.0168, 0.178], [0.0168, 0.2], [0.0185, 0.205], [0.0215, 0.235], [0.0232, 0.255], [0.0232, 0.262], [0.02, 0.264], [0.013, 0.264], [0.013, 0.258], [0, 0.258]];
    const greb = new THREE.LatheGeometry(profil.map(([r, y]) => new THREE.Vector2(r, y - 0.12)), 40);
    g.add(del(greb, mat.krom));
    const ribber = []; for (let i = 0; i <= 60; i++) { const y = 0.034 + i / 60 * 0.098; ribber.push(new THREE.Vector2(0.0166 + Math.max(0, Math.sin(i / 60 * Math.PI * 13)) * 0.0013, y - 0.12)); }
    g.add(del(new THREE.LatheGeometry(ribber, 36), mat.gummi));
    for (const y of [0.026, 0.139, 0.176]) g.add(del(new THREE.TorusGeometry(0.0172, 0.0012, 8, 36).rotateX(Math.PI / 2), mat.mørkStål, 0, y - 0.12, 0));
    const kontakt = new THREE.Group(); kontakt.position.set(0, 0.157 - 0.12, 0.0175); g.add(kontakt);
    kontakt.add(del(new THREE.BoxGeometry(0.012, 0.026, 0.008), mat.mørkStål));
    kontakt.add(del(new THREE.CylinderGeometry(0.0034, 0.0034, 0.006, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.3 }), 0, -0.004, 0.005));
    this.lampe = new THREE.Mesh(new THREE.SphereGeometry(0.0018, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.lampe.position.set(0, 0.0075, 0.0045); kontakt.add(this.lampe);
    for (let i = 0; i < 4; i++) { const v = i / 4 * Math.PI * 2 + Math.PI / 4, s = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.003), mat.hul); s.position.set(Math.sin(v) * 0.0205, 0.226 - 0.12, Math.cos(v) * 0.0205); s.rotation.y = v; s.rotation.x = -0.12 * 0; g.add(s); }
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.0108, 0.0022, 8, 28).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff })); this.ring.position.y = 0.26 - 0.12; g.add(this.ring);
    // Kernen (en hvid stang) og gløden omkring den
    this.kerne = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0062, 1, 16, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) }));
    this.kerne.position.y = this.klingeStart; g.add(this.kerne);
    this.spids = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 14, 8), this.kerne.material); g.add(this.spids);
    const glødGeo = new THREE.PlaneGeometry(2, 1, 1, 1).translate(0, 0.5, 0);
    this.glødMat = new THREE.ShaderMaterial({
      uniforms: { uFarve: { value: new THREE.Color() }, uL: { value: 0 }, uB: { value: 0.04 }, uTid: { value: 0 }, uFlamme: { value: 0.55 }, uRegnbue: { value: 0 }, uStyrke: { value: 1 }, uKerne: { value: 1 } },
      vertexShader: GLØD_V, fragmentShader: GLØD_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.glød = new THREE.Mesh(glødGeo, this.glødMat); this.glød.position.y = this.klingeStart; this.glød.frustumCulled = false; this.glød.renderOrder = 5; g.add(this.glød);
    // Lyset fra klingen (farver bordet, grebet og målene)
    this.lys = new THREE.PointLight(0xffffff, 0, 5, 2); this.lys.position.y = this.klingeStart + 0.4; g.add(this.lys);
    this.sætFarve("blå");
  }
  sætFarve(navn) {
    this.farveNavn = navn;
    const [r, gg, b] = SVÆRDFARVER[navn];
    this.farve = new THREE.Color(r, gg, b);
    this.glødMat.uniforms.uFarve.value.copy(this.farve); this.glødMat.uniforms.uRegnbue.value = navn === "regnbue" ? 1 : 0;
    this.spor.mat.uniforms.uFarve.value.copy(this.farve); this.spor.mat.uniforms.uRegnbue.value = navn === "regnbue" ? 1 : 0;
    this.kerne.material.color.setRGB(0.9 + r * 0.55, 0.9 + gg * 0.55, 0.9 + b * 0.55);
    this.ring.material.color.setRGB(r * 1.2, gg * 1.2, b * 1.2);
  }
  opdater(dt, t) {
    this.fælles(dt, t);
    const l = this.klingeLængde * this.ude, flimmer = 1 + Math.sin(t * 61) * 0.025 + Math.sin(t * 23) * 0.03 + (Math.random() - 0.5) * 0.04;
    this.kerne.visible = this.spids.visible = this.glød.visible = this.ude > 0.002;
    this.kerne.scale.y = Math.max(0.0001, l); this.spids.position.y = this.klingeStart + l;
    const u = this.glødMat.uniforms; u.uL.value = l; u.uTid.value = t; u.uStyrke.value = flimmer * (0.9 + Math.min(0.4, this.fart * 0.03));
    this.spor.mat.uniforms.uTid.value = t;
    const lf = this.farveNavn === "regnbue" ? new THREE.Color().setHSL((t * 0.25) % 1, 1, 0.5).multiplyScalar(2) : this.farve;
    this.lys.color.setRGB(lf.r, lf.g, lf.b).multiplyScalar(1 / Math.max(lf.r, lf.g, lf.b));
    this.lys.intensity = this.ude * 1.6 * flimmer; this.lys.position.y = this.klingeStart + l * 0.45;
    this.lampe.material.color.setRGB(this.ude > 0.5 ? 0.4 : 3, this.ude > 0.5 ? 3 : 0.3, 0.3);
    // Små gnister af lys fra klingen, når man svinger hurtigt
    if (this.ude > 0.8 && this.fart > 3 && Math.random() < dt * this.fart * 6) {
      const p = new THREE.Vector3().lerpVectors(this.bund, this.top, 0.4 + Math.random() * 0.6);
      const f = lf;
      this.partikler.udsend({ pos: p, fart: this.spidsFart.clone().multiplyScalar(-0.06).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.3, (Math.random() - 0.5) * 0.4)), liv: 0.35 + Math.random() * 0.3, str: 0.012, strSlut: 0.002, farve: new THREE.Color(f.r * 1.4 + 1, f.g * 1.4 + 1, f.b * 1.4 + 1), farveSlut: f, luft: 2, tyngde: -0.3 });
    }
  }
}

// ---------- Ildsværdet ----------
export class Ildsværd extends Sværd {
  constructor(scene, partikler, røg) {
    super(scene, partikler, røg);
    this.klingeStart = 0.07; this.klingeLængde = 0.86; this.farveNavn = "ild"; this.udsendt = 0;
    const g = this.gruppe;
    // Grebet: læderviklet greb, parérstang og knap af guld med en rød sten
    const læder = new THREE.MeshStandardMaterial({ color: 0x4a2414, roughness: 0.8 });
    const vikling = []; for (let i = 0; i <= 64; i++) { const y = -0.085 + i / 64 * 0.15; vikling.push(new THREE.Vector2(0.0145 + Math.abs(Math.sin(i / 64 * Math.PI * 9)) * 0.0018, y)); }
    g.add(del(new THREE.LatheGeometry(vikling, 28), læder));
    const parér = side([[-0.095, -0.004, 0.006], [-0.03, -0.012, 0.01], [0.0, -0.016, 0.01], [0.03, -0.012, 0.01], [0.095, -0.004, 0.006], [0.1, 0.006, 0.004], [0.03, 0.012, 0.01], [0.0, 0.02, 0.01], [-0.03, 0.012, 0.01], [-0.1, 0.006, 0.004]], 0.024, { fas: 0.006 });
    g.add(del(parér, mat.guld, 0, 0.07, 0));
    for (const s of [-1, 1]) g.add(del(new THREE.SphereGeometry(0.011, 16, 12), mat.guld, s * 0.1, 0.071, 0));
    g.add(del(new THREE.SphereGeometry(0.02, 24, 16), mat.guld, 0, -0.098, 0));
    const sten = new THREE.Mesh(new THREE.OctahedronGeometry(0.009, 1), new THREE.MeshPhysicalMaterial({ color: 0xff1a10, emissive: 0xff2000, emissiveIntensity: 1.5, roughness: 0.1, metalness: 0, clearcoat: 1 }));
    sten.position.set(0, -0.098, 0.018); g.add(sten);
    g.add(del(new THREE.CylinderGeometry(0.019, 0.016, 0.014, 24), mat.guld, 0, 0.066, 0));
    // Klingen: stål med slebne kanter og en rille på midten, der gløder rødglødende ved kanterne
    const c = document.createElement("canvas"); c.width = 64; c.height = 256; const k = c.getContext("2d");
    const gr = k.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "#fff"); gr.addColorStop(0.3, "#5a2a10"); gr.addColorStop(0.5, "#200800"); gr.addColorStop(0.7, "#5a2a10"); gr.addColorStop(1, "#fff");
    k.fillStyle = gr; k.fillRect(0, 0, 64, 256); const op = k.createLinearGradient(0, 0, 0, 256); op.addColorStop(0, "rgba(255,255,255,0.9)"); op.addColorStop(0.3, "rgba(255,255,255,0)"); op.addColorStop(1, "rgba(0,0,0,0.6)");
    k.fillStyle = op; k.fillRect(0, 0, 64, 256);
    const glødKort = new THREE.CanvasTexture(c); glødKort.colorSpace = THREE.SRGBColorSpace; glødKort.repeat.set(1 / 0.048, 1 / 0.86); glødKort.offset.set(0.5, 0);
    this.klingeMat = new THREE.MeshStandardMaterial({ color: 0x3a3634, metalness: 1, roughness: 0.32, emissive: 0xff5a10, emissiveMap: glødKort, emissiveIntensity: 2.2 });
    const klinge = side([[-0.024, 0, 0.002], [0.024, 0, 0.002], [0.0205, 0.74, 0], [0, 0.86, 0], [-0.0205, 0.74, 0]], 0.0075, { fas: 0.0034, uv: 1, kurve: 2 });
    this.klingeMesh = del(klinge, this.klingeMat, 0, this.klingeStart, 0); g.add(this.klingeMesh);
    const rille = del(side([[-0.004, 0.02, 0.003], [0.004, 0.02, 0.003], [0.003, 0.6, 0.003], [-0.003, 0.6, 0.003]], 0.0079, { fas: 0.0005 }), new THREE.MeshStandardMaterial({ color: 0x120604, emissive: 0x401000, roughness: 0.6, metalness: 0.8 }), 0, this.klingeStart, 0);
    g.add(rille);
    this.kappeMat = new THREE.ShaderMaterial({
      uniforms: { uFarve: { value: new THREE.Color() }, uL: { value: 0 }, uB: { value: 0.075 }, uTid: { value: 0 }, uFlamme: { value: 1.0 }, uRegnbue: { value: 0 }, uStyrke: { value: 1 }, uKerne: { value: 0 } },
      vertexShader: GLØD_V, fragmentShader: GLØD_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.kappe = new THREE.Mesh(new THREE.PlaneGeometry(2, 1, 1, 1).translate(0, 0.5, 0), this.kappeMat);
    this.kappe.position.y = this.klingeStart + 0.01; this.kappe.frustumCulled = false; this.kappe.renderOrder = 5; g.add(this.kappe);
    this.lys = new THREE.PointLight(0xff7a2a, 0, 6, 2); this.lys.position.y = 0.4; g.add(this.lys);
    this.sætFarve("ild");
  }
  sætFarve(navn) {
    this.farveNavn = navn;
    [this.f0, this.f1] = ILDFARVER[navn].map(a => new THREE.Color(...a));
    this.klingeMat.emissive.copy(this.f1).multiplyScalar(1 / Math.max(this.f1.r, this.f1.g, this.f1.b));
    this.spor.mat.uniforms.uFarve.value.copy(this.f1).multiplyScalar(0.8);
    this.kappeMat.uniforms.uFarve.value.copy(this.f0).lerp(this.f1, 0.4).multiplyScalar(1.35);
  }
  opdater(dt, t) {
    this.fælles(dt, t);
    this.klingeMesh.scale.y = Math.max(0.001, 0.15 + this.ude * 0.85);
    const blaf = 0.8 + Math.sin(t * 17) * 0.1 + Math.sin(t * 41) * 0.08 + Math.random() * 0.15;
    this.klingeMat.emissiveIntensity = (0.5 + this.ude * 2.2) * blaf;
    this.lys.color.copy(this.f1).multiplyScalar(1 / Math.max(this.f1.r, this.f1.g, this.f1.b)).lerp(new THREE.Color(1, 0.8, 0.5), 0.3);
    this.lys.intensity = this.ude * 2.6 * blaf;
    const ku = this.kappeMat.uniforms; ku.uL.value = this.klingeLængde * 0.97 * this.ude; ku.uTid.value = t * 1.3; ku.uStyrke.value = blaf * Math.min(1, this.ude * 1.5);
    this.kappe.visible = this.ude > 0.01;
    if (this.ude < 0.02 || !this.gruppe.visible) return;
    // Flammer langs klingen: de stiger op og blæser bagud, når man svinger
    const op = new THREE.Vector3(0, 1, 0), mod = this.spidsFart.clone().multiplyScalar(-0.22);
    this.udsendt += dt * (110 + Math.min(200, this.fart * 16)) * this.ude;
    while (this.udsendt > 1) {
      this.udsendt--;
      const u = Math.random(), p = new THREE.Vector3().set(0, this.klingeStart + 0.02 + u * this.klingeLængde * this.ude * 0.95, 0).applyMatrix4(this.gruppe.matrixWorld);
      p.x += (Math.random() - 0.5) * 0.02; p.z += (Math.random() - 0.5) * 0.02;
      const v = op.clone().multiplyScalar(0.6 + Math.random() * 0.6).add(mod.clone().multiplyScalar(0.4 + u * 0.8)).add(new THREE.Vector3((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15));
      const s = 0.03 + Math.random() * 0.03 + Math.min(0.02, this.fart * 0.0015);
      this.partikler.udsend({ pos: p, fart: v, liv: 0.16 + Math.random() * 0.22, str: s * 1.3, strSlut: s * 0.35, farve: this.f0, farveSlut: this.f1.clone().multiplyScalar(0.3), billede: Math.random() < 0.6 ? 2 : 0, rot: 0, alfa: 0.85, luft: 1.2, tyngde: -0.6, ind: 0.15 });
      if (Math.random() < 0.06) this.partikler.udsend({ pos: p, fart: v.clone().multiplyScalar(1.6).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3, (Math.random() - 0.5) * 0.6)), liv: 0.8 + Math.random(), str: 0.006, farve: new THREE.Color(4, 2, 0.6), farveSlut: this.f1, luft: 0.6, tyngde: -0.2 });
      if (Math.random() < 0.05) this.røg.udsend({ pos: p.clone().add(new THREE.Vector3(0, 0.1, 0)), fart: v.clone().multiplyScalar(0.8), liv: 1.1, str: 0.06, strSlut: 0.22, farve: new THREE.Color(0.05, 0.04, 0.04), alfa: 0.22, billede: 1, luft: 0.8, tyngde: -0.25, spin: (Math.random() - 0.5) * 1.5, ind: 0.3 });
    }
  }
}
