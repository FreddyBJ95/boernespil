// ===== Efterbehandlingen: lyset fra ild og glimt stråler ("bloom"), og billedet får filmens farver =====
// Verdenen tegnes først i et billede med "for meget lys" (HDR). De lyseste dele skaleres ned i fem trin,
// sløres og lægges oven på igen, så en ildkugle lyser ud over sine kanter, som i et kamera. Til sidst
// bliver lyset trykket sammen til skærmens farver (ACES, som i film), og hjørnerne bliver en anelse mørkere.

import * as THREE from "../3d-faelles/three.module.js";

const SKÆRM_VERTEX = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Ned: 13 punkter (som i moderne spil), første gang kun det lyseste over tærsklen
const NED = `
uniform sampler2D tKilde;
uniform vec2 uTexel;
uniform float uTaerskel;
uniform float uFoerste;
varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tKilde, vUv + o * uTexel).rgb; }
vec3 lys(vec3 c) {
  if (uFoerste < 0.5) return c;
  float l = max(c.r, max(c.g, c.b));
  return c * max(0.0, l - uTaerskel) / max(l, 1e-4) / (1.0 + l * 0.05);
}
void main() {
  vec3 a = s(vec2(-2.0, 2.0)), b = s(vec2(0.0, 2.0)), c = s(vec2(2.0, 2.0));
  vec3 d = s(vec2(-2.0, 0.0)), e = s(vec2(0.0, 0.0)), f = s(vec2(2.0, 0.0));
  vec3 g = s(vec2(-2.0, -2.0)), h = s(vec2(0.0, -2.0)), i = s(vec2(2.0, -2.0));
  vec3 j = s(vec2(-1.0, 1.0)), k = s(vec2(1.0, 1.0)), l = s(vec2(-1.0, -1.0)), m = s(vec2(1.0, -1.0));
  vec3 sum = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  gl_FragColor = vec4(lys(sum), 1.0);
}`;
// Op: et blødt 3×3-filter, lagt oven i det næste større trin
const OP = `
uniform sampler2D tKilde;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec2 o = uTexel * uRadius;
  vec3 c = texture2D(tKilde, vUv).rgb * 4.0;
  c += (texture2D(tKilde, vUv + vec2(o.x, 0.0)).rgb + texture2D(tKilde, vUv - vec2(o.x, 0.0)).rgb + texture2D(tKilde, vUv + vec2(0.0, o.y)).rgb + texture2D(tKilde, vUv - vec2(0.0, o.y)).rgb) * 2.0;
  c += texture2D(tKilde, vUv + o).rgb + texture2D(tKilde, vUv - o).rgb + texture2D(tKilde, vUv + vec2(o.x, -o.y)).rgb + texture2D(tKilde, vUv + vec2(-o.x, o.y)).rgb;
  gl_FragColor = vec4(c / 16.0, 1.0);
}`;
// Til sidst: læg det sammen, filmfarver, lidt mørkere hjørner og en anelse filmkorn
const SLUT = `
uniform sampler2D tBillede;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uEksponering;
uniform float uBlink;
uniform float uTid;
uniform float uMedBloom;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c) {
  const mat3 ind = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ud = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c = ind * (c / 0.6); c = RRTAndODTFit(c); c = ud * c;
  return clamp(c, 0.0, 1.0);
}
vec3 tilSRGB(vec3 c) { return mix(pow(c, vec3(0.41666)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTid) * 43758.5453); }
void main() {
  vec3 c = texture2D(tBillede, vUv).rgb;
  if (uMedBloom > 0.5) c += texture2D(tBloom, vUv).rgb * uBloom;
  c *= uEksponering * (1.0 + uBlink);
  c = aces(c);
  vec2 v = vUv - 0.5;
  c *= 1.0 - dot(v, v) * 0.55;
  c = tilSRGB(c);
  c += (hash(vUv * 731.0) - 0.5) * 0.018;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Efterbehandling {
  constructor(renderer, { bloom = true, samples = 4 } = {}) {
    this.r = renderer; this.medBloom = bloom;
    const type = THREE.HalfFloatType;
    this.billede = new THREE.WebGLRenderTarget(1, 1, { type, samples, depthBuffer: true });
    this.trin = Array.from({ length: 5 }, () => new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
    this.kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.ned = new THREE.ShaderMaterial({ uniforms: { tKilde: { value: null }, uTexel: { value: new THREE.Vector2() }, uTaerskel: { value: 2.4 }, uFoerste: { value: 0 } }, vertexShader: SKÆRM_VERTEX, fragmentShader: NED, depthTest: false, depthWrite: false });
    this.op = new THREE.ShaderMaterial({ uniforms: { tKilde: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } }, vertexShader: SKÆRM_VERTEX, fragmentShader: OP, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true });
    this.slut = new THREE.ShaderMaterial({
      uniforms: { tBillede: { value: this.billede.texture }, tBloom: { value: this.trin[0].texture }, uBloom: { value: 0.08 }, uEksponering: { value: 1 }, uBlink: { value: 0 }, uTid: { value: 0 }, uMedBloom: { value: bloom ? 1 : 0 } },
      vertexShader: SKÆRM_VERTEX, fragmentShader: SLUT, depthTest: false, depthWrite: false,
    });
    this.flade = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ned); this.flade.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.flade);
  }
  størrelse(b, h) {
    const pr = this.r.getPixelRatio(), w = Math.floor(b * pr), hh = Math.floor(h * pr);
    this.billede.setSize(w, hh);
    this.trin.forEach((t, i) => t.setSize(Math.max(1, w >> (i + 1)), Math.max(1, hh >> (i + 1))));
  }
  pas(mat, mål) { this.flade.material = mat; this.r.setRenderTarget(mål); this.r.render(this.scene, this.kamera); }
  tegn(scene, kamera, tid) {
    const r = this.r;
    r.setRenderTarget(this.billede); r.render(scene, kamera);
    if (this.medBloom) {
      let kilde = this.billede.texture, b = this.billede.width, h = this.billede.height;
      for (let i = 0; i < this.trin.length; i++) {
        this.ned.uniforms.tKilde.value = kilde; this.ned.uniforms.uTexel.value.set(1 / b, 1 / h); this.ned.uniforms.uFoerste.value = i === 0 ? 1 : 0;
        this.pas(this.ned, this.trin[i]);
        kilde = this.trin[i].texture; b = this.trin[i].width; h = this.trin[i].height;
      }
      const autoKlar = r.autoClear; r.autoClear = false;
      for (let i = this.trin.length - 1; i > 0; i--) {
        this.op.uniforms.tKilde.value = this.trin[i].texture; this.op.uniforms.uTexel.value.set(1 / this.trin[i].width, 1 / this.trin[i].height);
        this.pas(this.op, this.trin[i - 1]);
      }
      r.autoClear = autoKlar;
    }
    this.slut.uniforms.uTid.value = tid % 100;
    this.pas(this.slut, null);
  }
  set eksponering(v) { this.slut.uniforms.uEksponering.value = v; }
  set blink(v) { this.slut.uniforms.uBlink.value = v; }
}
