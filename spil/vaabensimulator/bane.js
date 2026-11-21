// ===== Banen: en skydebane i skumringen =====
// Solen er lige gået ned bag bakkerne. Foran står skydebordet, ude på banen et hegn med en hylde til
// dåser, flasker og meloner, og bagerst et kuglefang af planker med skydeskiver og halmballer.
// Lyskæder hænger over banen, og to projektører lyser på målene.

import * as THREE from "../3d-faelles/three.module.js";
import { træ, græs, halm, skydeskive, planker as plankeTekstur, støj } from "./teksturer.js";
import { mat } from "./materialer.js";
import { patron } from "./vaaben.js";

export const BORD = { y: 1.0, x: 1.4, zFor: 0.42, zBag: -0.5 };      // skydebordets top
export const HYLDE = { y: 1.0, z: -7, x: 4.2, dybde: 0.45 };        // hylden på hegnet
export const FANG = -11.5;                                          // kuglefanget (z)
const SOL = new THREE.Vector3(0.38, 0.03, -1).normalize();

// ---------- Himlen ----------
const HIMMEL_V = `varying vec3 vRetning; void main() { vRetning = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`;
const HIMMEL_F = `
uniform vec3 uSol; uniform float uTid;
varying vec3 vRetning;
float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float st(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = h3(vec3(i, 0.0)), b = h3(vec3(i + vec2(1, 0), 0.0)), c = h3(vec3(i + vec2(0, 1), 0.0)), d = h3(vec3(i + vec2(1, 1), 0.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * st(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vRetning);
  float y = d.y;
  // farverne fra toppen ned mod horisonten (blaa nat -> lilla -> gloedende orange)
  vec3 top = vec3(0.025, 0.035, 0.12), midt = vec3(0.13, 0.09, 0.30), lav = vec3(0.95, 0.36, 0.30), hor = vec3(1.6, 0.62, 0.30);
  vec3 c = mix(hor, lav, smoothstep(0.0, 0.05, y));
  c = mix(c, midt, smoothstep(0.04, 0.26, y));
  c = mix(c, top, smoothstep(0.24, 0.8, y));
  // solens gloed over horisonten (mest i retning af solen)
  float s = max(dot(d, uSol), 0.0);
  c += vec3(1.4, 0.55, 0.22) * pow(s, 7.0) * 0.9 * (1.0 - smoothstep(0.0, 0.4, y));
  c += vec3(2.5, 1.2, 0.5) * pow(s, 90.0);
  // skyer: tynde striber, belyst lyseroedt nedefra af solen
  vec2 sp = d.xz / (y + 0.12) * 1.6 + vec2(uTid * 0.004, 0.0);
  float sky = smoothstep(0.52, 0.8, fbm(sp * vec2(0.6, 2.4)));
  vec3 skyF = mix(vec3(1.25, 0.5, 0.48), vec3(0.32, 0.2, 0.42), smoothstep(0.05, 0.4, y)) * (0.7 + pow(s, 3.0) * 1.2);
  c = mix(c, skyF, sky * smoothstep(0.02, 0.1, y) * 0.75);
  // stjerner hoejt oppe, der blinker lidt
  vec3 cel = floor(d * 220.0);
  float r = h3(cel);
  if (r > 0.9965 && y > 0.18) c += vec3(0.9, 0.95, 1.1) * (0.6 + 0.4 * sin(uTid * 3.0 + r * 900.0)) * smoothstep(0.18, 0.5, y) * 1.4;
  // under horisonten: moerk jord (daekkes af bakkerne)
  c = mix(c, vec3(0.04, 0.035, 0.06), smoothstep(0.0, -0.04, y));
  gl_FragColor = vec4(c, 1.0);
}`;

function lavHimmel() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), new THREE.ShaderMaterial({
    uniforms: { uSol: { value: SOL }, uTid: { value: 0 } }, vertexShader: HIMMEL_V, fragmentShader: HIMMEL_F, side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

// ---------- Bakker og trætoppe i horisonten ----------
function lavBakker() {
  const g = new THREE.Group();
  const lag = [[85, 4, 9, 0x07060c, 11], [140, 9, 16, 0x0d0a16, 23], [230, 16, 26, 0x171021, 37]];
  for (const [R, lavest, top, farve, frø] of lag.reverse()) {
    const pos = [], n = 160;
    for (let i = 0; i <= n; i++) {
      const v = -Math.PI * 0.62 + i / n * Math.PI * 1.24;
      const h = lavest + (støj(i / n * 7, frø, 1e9, 1e9, frø) * 0.7 + støj(i / n * 23, frø, 1e9, 1e9, frø + 1) * 0.3) * top;
      const x = Math.sin(v) * R, z = -Math.cos(v) * R;
      pos.push(x, -3, z, x, h, z);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const idx = []; for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } geo.setIndex(idx);
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: farve, side: THREE.DoubleSide, fog: true })));
  }
  // Grantræer langs den nærmeste bakke
  const træer = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), new THREE.MeshBasicMaterial({ color: 0x050409 }), 140), m4 = new THREE.Matrix4();
  for (let i = 0; i < 140; i++) {
    const v = -Math.PI * 0.6 + Math.random() * Math.PI * 1.2, R = 60 + Math.random() * 18, h = 5 + Math.random() * 9;
    m4.compose(new THREE.Vector3(Math.sin(v) * R, h / 2 + Math.random() * 3 - 1, -Math.cos(v) * R), new THREE.Quaternion(), new THREE.Vector3(h * 0.32, h, h * 0.32));
    træer.setMatrixAt(i, m4);
  }
  g.add(træer);
  return g;
}

// ---------- Ildfluer i græsset (bevæges helt af skærmkortet) ----------
function lavIldfluer() {
  const n = 70, pos = [], fase = [];
  for (let i = 0; i < n; i++) { pos.push((Math.random() - 0.5) * 14, 0.2 + Math.random() * 1.8, -2.5 - Math.random() * 10); fase.push(Math.random() * 100); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("aFase", new THREE.Float32BufferAttribute(fase, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTid: { value: 0 }, uPr: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aFase; uniform float uTid; uniform float uPr; varying float vLys;
      void main() { vec3 p = position + vec3(sin(uTid * 0.31 + aFase) * 0.8, sin(uTid * 0.53 + aFase * 2.0) * 0.3, cos(uTid * 0.27 + aFase) * 0.8);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        vLys = pow(max(0.0, sin(uTid * 0.9 + aFase * 7.0)), 5.0); gl_PointSize = (6.0 + vLys * 10.0) * uPr * 4.0 / -mv.z; }`,
    fragmentShader: `varying float vLys; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.0);
        gl_FragColor = vec4(vec3(1.4, 2.2, 0.5) * (0.15 + vLys * 2.0) * a, 1.0); }`,
  });
  const p = new THREE.Points(geo, m); p.frustumCulled = false;
  return p;
}

// ---------- Lyskegle fra en projektør (blød "tåge" i lyset) ----------
function lyskegle(fra, til, vinkel, farve) {
  const l = fra.distanceTo(til) * 1.15, r = Math.tan(vinkel) * l;
  const geo = new THREE.ConeGeometry(r, l, 32, 1, true); geo.translate(0, -l / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uFarve: { value: new THREE.Color(farve) }, uL: { value: l } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying float vT; varying vec3 vN; varying vec3 vV; uniform float uL;
      void main() { vT = -position.y / uL; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uFarve; varying float vT; varying vec3 vN; varying vec3 vV;
      void main() { vec3 n = vN + vec3(1e-5); float kant = pow(abs(dot(normalize(n), normalize(vV))), 2.0); float t = clamp(vT, 0.0, 1.0); gl_FragColor = vec4(uFarve * kant * pow(1.0 - t, 1.6) * 0.09, 1.0); }`,
  }));
  m.position.copy(fra);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), til.clone().sub(fra).normalize());
  return m;
}

// ---------- Miljøkortet: det metallet spejler (en blød "fotostudie"-himmel i skumringens farver) ----------
export function lavMiljøkort(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vP; void main() { float y = vP.y;
      vec3 c = mix(vec3(0.05, 0.05, 0.055), vec3(0.62, 0.46, 0.46), smoothstep(-0.3, 0.02, y));
      c = mix(c, vec3(0.22, 0.2, 0.42), smoothstep(0.05, 0.5, y));
      c += vec3(0.9, 0.5, 0.3) * pow(max(0.0, dot(vP, normalize(vec3(0.3, 0.05, -1.0)))), 6.0);
      gl_FragColor = vec4(c, 1.0); }`,
  })));
  // Lysfelter: en varm lampe bagfra, en kold kant og en lang lysstribe ovenover (giver flotte striber i stålet)
  const felt = (b, h, farve, styrke, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(farve).multiplyScalar(styrke), side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(0, 0, 0); s.add(m);
  };
  felt(4, 3, 0xfff1e4, 5, new THREE.Vector3(-3, 5, 6));
  felt(8, 0.6, 0xffffff, 6, new THREE.Vector3(0, 8, 0));
  felt(1.2, 6, 0x9fb4ff, 3, new THREE.Vector3(7, 1, 3));
  felt(3, 2, 0xffa060, 2, new THREE.Vector3(2, 1.5, -8));
  felt(5, 1.2, 0xd8e4ff, 3, new THREE.Vector3(-6, 3, -2));
  const pm = new THREE.PMREMGenerator(renderer);
  const kort = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return kort;
}

// ---------- Hele banen ----------
export function lavBane(scene) {
  const skydbare = [];                       // det man kan ramme med en kugle (med "slags" til lyd og effekter)
  const skyd = (m, slags) => { m.userData.slags = slags; skydbare.push(m); return m; };
  const himmel = lavHimmel(); scene.add(himmel);
  scene.add(lavBakker());
  scene.fog = new THREE.Fog(0x2a2142, 18, 150);

  // Jorden
  const gt = græs().clone(); gt.repeat.set(90, 90); gt.needsUpdate = true;
  const jord = skyd(new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: gt, roughness: 1, color: 0x9a9a9a })), "jord");
  jord.rotation.x = -Math.PI / 2; jord.receiveShadow = true; scene.add(jord);

  // Træmaterialer til hegn, planker og bord (teksturen gentages i meter)
  const træMat = (navn, rx, ry, farve = 0xffffff) => { const t = træ(navn).clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, color: farve }); };
  const boks = (b, h, d, m, x, y, z, slags = "træ") => { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), m); k.position.set(x, y, z); k.castShadow = k.receiveShadow = true; scene.add(k); if (slags) skyd(k, slags); return k; };

  // Hegnet med hylden til målene
  const hegn = træMat("hegn", 6, 1);
  boks(HYLDE.x * 2 + 0.4, 0.06, HYLDE.dybde, hegn, 0, HYLDE.y - 0.03, HYLDE.z);
  boks(HYLDE.x * 2 + 0.4, 0.12, 0.04, hegn, 0, 0.55, HYLDE.z + 0.15);
  for (let x = -HYLDE.x; x <= HYLDE.x + 0.01; x += HYLDE.x / 3) boks(0.1, 1.0, 0.1, træMat("hegn", 0.3, 2), x, 0.5, HYLDE.z + 0.12);

  // Kuglefanget af planker med skydeskiver
  const planker = (() => { const t = plankeTekstur().clone(); t.repeat.set(10, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, color: 0xd8cfc4 }); })();
  boks(12, 3.4, 0.14, planker, 0, 1.7, FANG);
  boks(12.4, 0.16, 0.3, træMat("hegn", 8, 1), 0, 3.45, FANG + 0.05);
  for (const x of [-6, -2, 2, 6]) boks(0.2, 3.6, 0.2, træMat("hegn", 0.4, 3), x, 1.8, FANG + 0.16);
  const skiver = [];
  for (const [x, y, r] of [[0, 2.05, 0.6], [-3.6, 1.85, 0.42], [3.6, 1.85, 0.42]]) {
    const plade = boks(r * 2.3, r * 2.3, 0.04, new THREE.MeshStandardMaterial({ color: 0xd9cfb8, roughness: 0.9 }), x, y, FANG + 0.1, "træ");
    const ansigt = skyd(new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ map: skydeskive(), roughness: 0.8 })), "skive");
    ansigt.position.set(x, y, FANG + 0.125); ansigt.receiveShadow = true; scene.add(ansigt);
    ansigt.userData.radius = r; skiver.push(ansigt);
    void plade;
  }
  // Halmballer foran kuglefanget
  const halmMat = (() => { const t = halm().clone(); t.repeat.set(2, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 1 }); })();
  for (const [x, y, z, ry] of [[-4.6, 0.28, -10.7, 0.1], [-3.4, 0.28, -10.9, -0.05], [-4.0, 0.84, -10.8, 0.05], [4.3, 0.28, -10.8, -0.12], [5.5, 0.28, -10.6, 0.08]]) {
    boks(1.15, 0.56, 0.6, halmMat, x, y, z, "halm").rotation.y = ry;
  }

  // Skydebordet med lanterne, ammunitionskasse og løse patroner
  const bordMat = (() => { const t = plankeTekstur().clone(); t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; t.repeat.set(1.1, 0.7); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.78, color: 0xd6a774 }); })();
  boks(BORD.x * 2, 0.06, BORD.zFor - BORD.zBag, bordMat, 0, BORD.y - 0.03, (BORD.zFor + BORD.zBag) / 2);
  boks(BORD.x * 2, 0.5, 0.04, bordMat, 0, BORD.y - 0.3, BORD.zBag + 0.04);
  for (const x of [-BORD.x + 0.08, BORD.x - 0.08]) for (const z of [BORD.zBag + 0.08, BORD.zFor - 0.08]) boks(0.07, BORD.y - 0.06, 0.07, bordMat, x, (BORD.y - 0.06) / 2, z, null);
  const kasse = new THREE.Group(); kasse.position.set(-1.0, BORD.y, -0.28); kasse.rotation.y = 0.25; scene.add(kasse);
  const oliven = new THREE.MeshStandardMaterial({ color: 0x3f4a2c, roughness: 0.55, metalness: 0.6 });
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.17, 0.14), oliven); kb.position.y = 0.085; kb.castShadow = kb.receiveShadow = true; kasse.add(kb);
  const kl = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.03, 0.15), oliven); kl.position.y = 0.175; kl.castShadow = true; kasse.add(kl);
  const hank = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 8, 20, Math.PI), mat.mørkStål); hank.position.y = 0.19; kasse.add(hank);
  for (let i = 0; i < 6; i++) {
    const p = patron(i < 3 ? "556" : "9mm", true);
    p.position.set(-0.78 + Math.random() * 0.25, BORD.y + 0.005, -0.12 + Math.random() * 0.22); p.rotation.y = Math.random() * 6; scene.add(p);
  }
  // Lanternen: blafrende flamme bag glas
  const lanterne = new THREE.Group(); lanterne.position.set(1.08, BORD.y, -0.3); scene.add(lanterne);
  lanterne.add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.03, 20), mat.mørkStål)).position.y = 0.015;
  const glas = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.2, metalness: 0 }));
  glas.position.y = 0.1; lanterne.add(glas);
  lanterne.add(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.05, 20), mat.mørkStål)).position.y = 0.19;
  const flamme = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 3.5, 1.2) }));
  flamme.scale.set(1, 1.8, 1); flamme.position.y = 0.08; lanterne.add(flamme);
  const lanterneLys = new THREE.PointLight(0xffa050, 0.9, 4, 2); lanterneLys.position.set(1.08, BORD.y + 0.1, -0.3); scene.add(lanterneLys);

  // Lys: himmelskær, solen bagfra, en arbejdslampe over skydebordet og projektører på målene
  scene.add(new THREE.HemisphereLight(0x7c7ac8, 0x2c2118, 0.75));
  const sol = new THREE.DirectionalLight(0xff9a5c, 1.4); sol.position.copy(SOL).multiplyScalar(60); scene.add(sol);
  const arbejdslys = new THREE.SpotLight(0xfff3ea, 38, 0, 0.62, 0.8, 2);
  arbejdslys.position.set(-1.4, 3.1, 2.3); arbejdslys.target.position.set(0, 1.15, -0.4);
  arbejdslys.castShadow = true; arbejdslys.shadow.mapSize.set(1024, 1024); arbejdslys.shadow.bias = -0.0002; arbejdslys.shadow.normalBias = 0.015;
  arbejdslys.shadow.camera.near = 0.5; arbejdslys.shadow.camera.far = 8;
  scene.add(arbejdslys, arbejdslys.target);
  for (const s of [-1, 1]) {
    const top = new THREE.Vector3(s * 4.9, 4.1, -5.8), mål = new THREE.Vector3(s * 0.8, 1.0, -9.6);
    boks(0.12, 4.2, 0.12, mat.mørkStål, s * 5.0, 2.1, -5.8, "metal");
    const hoved = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.2), mat.mørkStål); hoved.position.copy(top); hoved.lookAt(mål); scene.add(hoved);
    const glød = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5, 3.8) }));
    glød.position.copy(top).addScaledVector(mål.clone().sub(top).normalize(), 0.11); glød.lookAt(mål); scene.add(glød);
    const p = new THREE.SpotLight(0xffe2b8, 160, 0, 0.42, 0.55, 2); p.position.copy(top); p.target.position.copy(mål);
    if (s === 1) { p.castShadow = true; p.shadow.mapSize.set(1024, 1024); p.shadow.bias = -0.0003; p.shadow.camera.near = 2; p.shadow.camera.far = 14; }
    scene.add(p, p.target, lyskegle(top, mål, 0.42, 0xffe2b8));
  }

  // Lyskæder over banen (pærer i varme og muntre farver)
  const pærer = [], farver = [[4, 2.6, 1.1], [4, 2.6, 1.1], [4.5, 1.2, 0.8], [1.2, 3.4, 1.4], [1.3, 2, 4.5], [4.2, 3.4, 0.9]];
  const ledning = [];
  for (const z of [-3.2, -7.4]) {
    for (const s of [-1, 1]) boks(0.09, 3.6, 0.09, træMat("hegn", 0.3, 3), s * 5.2, 1.8, z, "træ");
    const a = new THREE.Vector3(-5.2, 3.5, z), b = new THREE.Vector3(5.2, 3.5, z), n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 0.65;
      ledning.push(p.clone()); if (i > 0 && i < n) pærer.push(p.clone().add(new THREE.Vector3(0, -0.07, 0)));
    }
    ledning.push(null);
  }
  const pæreMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.038, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), pærer.length);
  pærer.forEach((p, i) => { pæreMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)); pæreMesh.setColorAt(i, new THREE.Color(...farver[i % farver.length])); });
  scene.add(pæreMesh);
  const lp = []; for (let i = 0; i < ledning.length - 1; i++) if (ledning[i] && ledning[i + 1]) lp.push(ledning[i], ledning[i + 1]);
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0x111111 })));
  for (const z of [-3.2, -7.4]) { const l = new THREE.PointLight(0xffb070, 3, 9, 2); l.position.set(0, 2.7, z); scene.add(l); }

  const ildfluer = lavIldfluer(); scene.add(ildfluer);

  // Hvad ligger under et punkt? (bordet, hylden eller jorden) — bruges af faldende ting
  function gulv(x, z) {
    if (Math.abs(x) <= BORD.x && z <= BORD.zFor && z >= BORD.zBag) return BORD.y;
    if (Math.abs(x) <= HYLDE.x + 0.2 && Math.abs(z - HYLDE.z) <= HYLDE.dybde / 2) return HYLDE.y;
    return 0;
  }

  return {
    skydbare, skiver, gulv, lanterneLys,
    opdater(t, pr) {
      himmel.material.uniforms.uTid.value = t;
      ildfluer.material.uniforms.uTid.value = t; ildfluer.material.uniforms.uPr.value = pr;
      const blaf = 0.85 + Math.sin(t * 13) * 0.06 + Math.sin(t * 29.7) * 0.05 + Math.random() * 0.06;
      lanterneLys.intensity = 0.9 * blaf; flamme.scale.set(1, 1.8 * blaf, 1);
    },
  };
}
