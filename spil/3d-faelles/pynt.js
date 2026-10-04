// ===== Fælles grafik til de tre voksenverdener: himmel, spejlinger og fine mønstre i jorden =====
// Himlen er en stor kugle med en blød farveovergang og en sol, der altid følger kameraet.
// Miljøet (spejlingerne) laves ud fra den samme himmel, så metal, lak og glas får lys fra omgivelserne.
// Detaljerne lægges oven på eksisterende materialer på grafikkortet: sandriller, asfaltkorn, græs og klippelag.
// De koster ingen billeder at hente og virker på alle flader uden UV-koordinater.
import * as THREE from "./three.module.js";

// ---------- Himlen ----------
const himmelVertex = `
varying vec3 vRetning;
void main() {
  vRetning = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;                                       // altid bagerst
}`;
const himmelFragment = `
uniform vec3 uTop, uHorisont, uBund, uSolRetning, uSolFarve;
uniform float uSolStyrke, uDis, uStjerner, uSkyer, uTid;
uniform vec3 uSkyFarve;
varying vec3 vRetning;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
float sHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float sNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float sFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * sNoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vRetning);
  float h = d.y;
  vec3 c = h > 0.0 ? mix(uHorisont, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorisont, uBund, pow(clamp(-h, 0.0, 1.0), 0.35));
  c = mix(c, uHorisont, uDis * exp(-abs(h) * 9.0));            // dis lige over horisonten
  float s = max(dot(d, normalize(uSolRetning)), 0.0);
  c += uSolFarve * uSolStyrke * (pow(s, 900.0) * 6.0 + pow(s, 60.0) * 0.45 + pow(s, 6.0) * 0.18);
  if (uSkyer > 0.0 && h > 0.0) {                              // bloede skyer paa et lag over landskabet
    vec2 uv = d.xz / (h + 0.12) * 0.9 + vec2(uTid * 0.006, uTid * 0.002);
    float n = sFbm(uv);
    float daek = smoothstep(1.0 - uSkyer - 0.12, 1.0 - uSkyer + 0.28, n) * smoothstep(0.0, 0.18, h);
    float lys = 0.78 + 0.22 * smoothstep(0.3, 0.9, sFbm(uv + 0.35)) + 0.35 * pow(s, 8.0);
    c = mix(c, uSkyFarve * lys, daek * 0.88);
  }
  if (uStjerner > 0.0 && h > 0.02) {                          // stjerner om natten
    vec3 g = floor(d * 260.0);
    float st = step(0.9965, hash(g)) * smoothstep(0.02, 0.25, h);
    c += vec3(st) * uStjerner * (0.6 + 0.4 * hash(g + 3.0));
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// farver: { top, horisont, bund, sol: retning [x,y,z], solFarve, solStyrke, dis, stjerner }
export function lavHimmel(farver = {}) {
  const u = {
    uTop: { value: new THREE.Color(farver.top ?? "#4a8ad8") },
    uHorisont: { value: new THREE.Color(farver.horisont ?? "#dce9f0") },
    uBund: { value: new THREE.Color(farver.bund ?? farver.horisont ?? "#cfd8d8") },
    uSolRetning: { value: new THREE.Vector3(...(farver.sol ?? [-0.5, 0.45, -0.7])).normalize() },
    uSolFarve: { value: new THREE.Color(farver.solFarve ?? "#fff1d0") },
    uSolStyrke: { value: farver.solStyrke ?? 1 },
    uDis: { value: farver.dis ?? 0.35 },
    uStjerner: { value: farver.stjerner ?? 0 },
    uSkyer: { value: farver.skyer ?? 0 },                       // 0 = klar himmel, 0,5 = halvt skyet
    uSkyFarve: { value: new THREE.Color(farver.skyFarve ?? "#ffffff") },
    uTid: { value: 0 },
  };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24),
    new THREE.ShaderMaterial({ uniforms: u, vertexShader: himmelVertex, fragmentShader: himmelFragment, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.userData.ingenSkygge = true;                           // himlen må aldrig kaste skygge
  mesh.scale.setScalar(100);
  // Kuglen følger kameraet, så man aldrig kommer tæt på kanten
  mesh.onBeforeRender = (_r, _s, kamera) => { mesh.position.copy(kamera.position); mesh.updateMatrixWorld(); u.uTid.value = performance.now() / 1000; };
  mesh.userData.uniforms = u;
  return mesh;
}

// Spejlinger ud fra himlen (og evt. en jordfarve under horisonten). Kald igen, hvis himlen skifter farve.
export function lavMiljø(renderer, himmel, jordFarve = null) {
  const sc = new THREE.Scene(), kopi = new THREE.Mesh(himmel.geometry, himmel.material);
  kopi.scale.setScalar(50); sc.add(kopi);
  if (jordFarve) {
    const jord = new THREE.Mesh(new THREE.CircleGeometry(40, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: jordFarve }));
    jord.position.y = -2; sc.add(jord);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tekstur = pmrem.fromScene(sc, 0.04, 0.1, 200).texture;
  pmrem.dispose();
  sc.traverse(o => { if (o.isMesh && o !== kopi) { o.geometry.dispose(); o.material.dispose(); } });
  return tekstur;
}

// ---------- Fine mønstre på eksisterende materialer ----------
const støj = `
varying vec3 vPyntVerden;
float pHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float pStoej(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), f.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float pFbm(vec2 p, int n) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { if (i >= n) break; s += a * pStoej(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
vec3 pBump(vec3 n, vec3 pos, float h, float styrke) {
  vec3 dpx = dFdx(pos), dpy = dFdy(pos);
  float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * n - styrke * grad);
}`;

// Mønstre: farven (f = hvor meget farven svinger) og højden h til den lille bump-skygge
const MØNSTRE = {
  sand: `float h = pFbm(p.xz * 0.35, n) * 0.6 + 0.4 * sin(dot(p.xz, vec2(0.83, 0.56)) * 2.6 + pFbm(p.xz * 0.12, 2) * 6.0);
         float f = pFbm(p.xz * 0.05, n) - 0.5 + (h - 0.5) * 0.35;`,
  asfalt: `float h = pStoej(p.xz * 9.0) * 0.6 + pStoej(p.xz * 2.2) * 0.4;
           float f = (pFbm(p.xz * 0.12, n) - 0.5) * 0.9 + (pStoej(p.xz * 14.0) - 0.5) * 0.5;`,
  græs: `float h = pStoej(p.xz * 6.0) * 0.5 + pStoej(p.xz * 1.7) * 0.5;
         float f = (pFbm(p.xz * 0.08, n) - 0.5) * 1.2 + (pStoej(p.xz * 3.5) - 0.5) * 0.4;`,
  klippe: `float h = pFbm(p.xz * 0.6 + p.y * 0.4, n) + 0.35 * sin(p.y * 2.2 + pFbm(p.xz * 0.2, 2) * 4.0);
           float f = (h - 0.7) * 0.8;`,
  træ: `float h = pStoej(vec2(p.x * 0.4 + p.z * 0.4, p.y * 12.0)) * 0.7 + pStoej(p.xz * 3.0) * 0.3;
        float f = (h - 0.5) * 0.7;`,
  sten: `float h = pFbm(p.xz * 1.6 + p.y, n);
         float f = (pFbm(p.xz * 0.3, n) - 0.5) * 0.8 + (h - 0.5) * 0.4;`,
};

// type: et af MØNSTRE · styrke: hvor meget farven svinger (0,1–0,4) · bump: hvor dybe rillerne er · fin: false = billigere
const pyntede = new WeakSet();
export function detaljer(materiale, type, { styrke = 0.22, bump = 0.6, fin = true, skala = 1, tone = null } = {}) {
  if (!materiale || pyntede.has(materiale)) return materiale;
  pyntede.add(materiale);
  materiale.userData.pynt = type;
  materiale.userData.pyntValg = { styrke, bump, fin, skala, tone };
  const toneFarve = tone ? new THREE.Color(tone) : null;
  materiale.onBeforeCompile = sh => {
    sh.uniforms.uPyntTone = { value: toneFarve || new THREE.Color(1, 1, 1) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPyntVerden;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvPyntVerden = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${støj}\nuniform vec3 uPyntTone;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
      vec3 p = vPyntVerden * ${skala.toFixed(3)};
      int n = ${fin ? 3 : 1};
      ${MØNSTRE[type]}
      diffuseColor.rgb *= clamp(1.0 + f * ${(styrke * 2).toFixed(3)}, 0.5, 1.6);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uPyntTone, clamp(f + 0.5, 0.0, 1.0));
      float pyntHoejde = h;`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      ${fin && bump > 0 ? `normal = pBump(normal, -vViewPosition, pyntHoejde * ${(bump * 0.06).toFixed(4)}, 1.0);` : ""}`);
  };
  materiale.customProgramCacheKey = () => `pynt-${type}-${fin}-${styrke}-${bump}-${skala}-${tone}`;
  materiale.needsUpdate = true;
  return materiale;
}

// Et klonet materiale (material.clone()) mister mønstret: giv det det samme igen
export function fornyDetaljer(materiale) {
  const v = materiale?.userData?.pyntValg;
  if (v && materiale.userData.pynt) detaljer(materiale, materiale.userData.pynt, v);
  return materiale;
}

// Find materialerne i en indlæst model efter navn (fx "Gyldent sand") og giv dem mønstre
export function detaljerEfterNavn(rod, regler, valg = {}) {
  const set = new Set();
  rod.traverse(o => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (set.has(m)) continue;
      for (const [navn, type, ekstra] of regler) {
        if (m.name && m.name.toLowerCase().includes(navn.toLowerCase())) { detaljer(m, type, { ...valg, ...ekstra }); set.add(m); break; }
      }
    }
  });
  return set.size;
}

// ---------- Havet: små bølger, der spejler himlen, glimter i solen og skummer ved en ø ----------
// farver: { dyb, lav, top, horisont, sol: retning, ø: [x, z, radius] } · størrelse: kantlængde i meter
export function lavHav(farver = {}, størrelse = 1200, inddeling = 1) {
  const u = {
    uTid: { value: 0 }, uKamera: { value: new THREE.Vector3() },
    uDyb: { value: new THREE.Color(farver.dyb ?? "#0b2f3d") }, uLav: { value: new THREE.Color(farver.lav ?? "#2f8c8c") },
    uTop: { value: new THREE.Color(farver.top ?? "#4a8ad8") }, uHorisont: { value: new THREE.Color(farver.horisont ?? "#dce9f0") },
    uSolRetning: { value: new THREE.Vector3(...(farver.sol ?? [-0.5, 0.45, -0.7])).normalize() },
    uØ: { value: new THREE.Vector3(...(farver.ø ?? [0, 0, 0])) },
  };
  const materiale = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `
varying vec3 vP;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
varying vec3 vP;
uniform float uTid;
uniform vec3 uKamera, uDyb, uLav, uTop, uHorisont, uSolRetning, uO;
vec2 boelge(vec2 q, vec2 r, float f, float a, float hast) { float k = dot(q, r) * f + uTid * hast; return r * cos(k) * f * a; }
void main() {
  vec2 g = boelge(vP.xz, normalize(vec2(1.0, 0.4)), 0.48, 0.05, -1.8) + boelge(vP.xz, normalize(vec2(-0.3, 1.0)), 0.9, 0.025, 1.3)
         + boelge(vP.xz, normalize(vec2(0.7, -0.7)), 1.7, 0.012, 2.1) + boelge(vP.xz, normalize(vec2(-0.9, -0.2)), 3.1, 0.006, -2.6);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(uKamera - vP);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  vec3 spejl = mix(uHorisont, uTop, clamp(r.y * 1.8, 0.0, 1.0));
  float kyst = uO.z > 0.0 ? length(vP.xz - uO.xy) / uO.z : 9.0;      // 1 = oeens kant
  vec3 c = mix(mix(uDyb, uLav, smoothstep(1.35, 1.0, kyst)), spejl, fres);
  c += vec3(1.0, 0.86, 0.62) * pow(max(dot(r, uSolRetning), 0.0), 220.0) * 2.5;
  float skum = smoothstep(1.08, 1.0, kyst) * (0.55 + 0.45 * sin(kyst * 140.0 - uTid * 1.7 + sin(vP.x * 0.3) * 2.0));
  c = mix(c, vec3(0.82, 0.86, 0.82), clamp(skum, 0.0, 1.0) * 0.6);
  float d = clamp(length(vP.xz - uKamera.xz) / 400.0, 0.0, 1.0);
  c = mix(c, uHorisont, pow(d, 1.6));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  materiale.uniforms.uO = u.uØ;                                // (GLSL-navne må ikke have æ, ø og å)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(størrelse, størrelse, inddeling, inddeling).rotateX(-Math.PI / 2), materiale);
  mesh.userData.ingenSkygge = true;
  mesh.onBeforeRender = (_r, _s, kamera) => { u.uKamera.value.copy(kamera.position); u.uTid.value = performance.now() / 1000; };
  mesh.userData.uniforms = u;
  return mesh;
}
