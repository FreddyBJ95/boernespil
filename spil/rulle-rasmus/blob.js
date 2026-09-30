// ===== Rasmus — blobben man styrer =====
// Kroppen er en blød gelé-kugle, der vrikker, mases flad når den lander, og strækker sig når den hopper.
// Øjnene og munden sidder fast foran, mens mønstret på kroppen ruller rundt, når han triller.
// SKINS: farverne og de særlige blobber (ild, enhjørning, Broekraft …). Tilføj flere dér.
//   farve:   grundfarven · ikon: vises på knappen · mønster: nummer på mønstret i shaderen (se nedenfor)
//   klods:   true = Rasmus er en blød klods i stedet for en kugle (Broekraft)

import * as THREE from "./three.js";
import { pixelGræs, REGNBUE } from "./teksturer.js";

export const R = 0.5;                                   // Rasmus' radius i meter

export const SKINS = [
  { id: "blaa", navn: "Blå", farve: "#2f8cff" },
  { id: "groen", navn: "Grøn", farve: "#2fd24a" },
  { id: "roed", navn: "Rød", farve: "#ff3048" },
  { id: "gul", navn: "Gul", farve: "#ffcc14" },
  { id: "orange", navn: "Orange", farve: "#ff8214" },
  { id: "lilla", navn: "Lilla", farve: "#9656ff" },
  { id: "lyseroed", navn: "Lyserød", farve: "#ff66b3" },
  { id: "turkis", navn: "Turkis", farve: "#14ccbe" },
  { id: "ild", navn: "Ild-Rasmus", ikon: "🔥", mønster: 1, farve: "#ff5a14" },
  { id: "enhjorning", navn: "Enhjørning", ikon: "🦄", mønster: 2, farve: "#ffffff" },
  { id: "broekraft", navn: "Broekraft", ikon: "⛏️", mønster: 3, farve: "#6dbb44", klods: true },
  { id: "regnbue", navn: "Regnbue", ikon: "🌈", mønster: 4, farve: "#ff9a1f" },
  { id: "galakse", navn: "Galakse", ikon: "🌌", mønster: 5, farve: "#5b2bb5" },
  { id: "guld", navn: "Guld", ikon: "👑", mønster: 6, farve: "#ffc933" },
];

const KLODS = 0.9;                                      // Broekraft-klodsens sidelængde
const BUND = 0.84;                                      // hvor meget kuglen er trykket flad forneden

// ---------- Små GLSL-hjælpere: støj og regnbuefarver ----------
const GLSL_STØJ = `
float hashR(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float stoejR(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hashR(i), hashR(i + vec3(1,0,0)), f.x), mix(hashR(i + vec3(0,1,0)), hashR(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hashR(i + vec3(0,0,1)), hashR(i + vec3(1,0,1)), f.x), mix(hashR(i + vec3(0,1,1)), hashR(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbmR(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * stoejR(p); p *= 2.03; a *= 0.5; } return v; }
vec3 regnbueF(float h) { return 0.5 + 0.5 * cos(6.2831 * (h + vec3(0.0, 0.33, 0.67))); }
`;

// Mønstrene på kroppen. vMonster = retningen på kroppen, der ruller med, når Rasmus triller.
const GLSL_MØNSTRE = `
vec3 mp = normalize(vMonster);
vec3 ekstraLys = vec3(0.0);
#if MONSTER == 0
  diffuseColor.rgb *= 0.88 + 0.26 * fbmR(mp * 3.0);
  vec3 celle = floor(mp * 16.0);
  float boble = step(0.9, hashR(celle)) * smoothstep(0.32, 0.05, length(fract(mp * 16.0) - 0.5));
  diffuseColor.rgb = mix(diffuseColor.rgb, min(vec3(1.0), diffuseColor.rgb * 1.5 + 0.08), boble * 0.6);
#elif MONSTER == 1
  float n1 = fbmR(mp * 2.4 + vec3(0.0, -uTid * 0.8, uTid * 0.2));
  float n2 = fbmR(mp * 5.0 + vec3(uTid * 0.4, -uTid * 1.2, 0.0));
  float f = n1 * 0.6 + n2 * 0.4;
  float spraekke = 1.0 - smoothstep(0.015, 0.07, abs(f - 0.5));      // tynde, glødende sprækker
  float varmt = smoothstep(0.56, 0.78, f);                            // varme pletter
  diffuseColor.rgb = mix(vec3(0.06, 0.012, 0.006), vec3(0.3, 0.035, 0.0), n1);
  vec3 varm = mix(vec3(1.0, 0.18, 0.0), vec3(1.0, 0.5, 0.05), n2);
  ekstraLys = varm * (spraekke * 1.3 + varmt * 0.8) + vec3(0.25, 0.03, 0.0);
#elif MONSTER == 2
  float n = fbmR(mp * 1.6 + uTid * 0.05);
  diffuseColor.rgb = mix(vec3(1.0, 0.97, 0.99), regnbueF(n * 1.3 + mp.y * 0.35), 0.2);
  vec3 celle = floor(mp * 45.0);
  ekstraLys = vec3(1.0, 0.95, 1.0) * step(0.965, hashR(celle)) * (0.5 + 0.5 * sin(uTid * 5.0 + hashR(celle + 3.1) * 30.0)) * 1.6;
#elif MONSTER == 3
  vec3 an = abs(vObjN);
  vec2 uv; float felt = 1.0;
  if (an.y > an.x && an.y > an.z) { uv = vObj.xz; felt = vObjN.y > 0.0 ? 0.0 : 2.0; }
  else if (an.x > an.z) uv = vec2(-vObj.z * sign(vObjN.x), vObj.y);
  else uv = vec2(vObj.x * sign(vObjN.z), vObj.y);
  uv = clamp(uv / ${KLODS.toFixed(3)} + 0.5, 0.001, 0.999);
  diffuseColor.rgb = texture2D(uPixel, vec2((felt + uv.x) / 3.0, uv.y)).rgb;
#elif MONSTER == 4
  diffuseColor.rgb = pow(regnbueF(mp.y * 0.6 + atan(mp.z, mp.x) * 0.05 + uTid * 0.07), vec3(1.8));
  ekstraLys = diffuseColor.rgb * 0.12;
#elif MONSTER == 5
  float n = fbmR(mp * 2.2 + uTid * 0.03), n2 = fbmR(mp * 4.5 - uTid * 0.02);
  diffuseColor.rgb = mix(vec3(0.01, 0.005, 0.05), vec3(0.2, 0.05, 0.4), n);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.08, 0.4), smoothstep(0.55, 0.8, n2) * 0.6);
  ekstraLys = vec3(0.3, 0.08, 0.55) * smoothstep(0.5, 0.9, n) * 0.5;
  vec3 celle = floor(mp * 40.0);
  float glimt = step(0.95, hashR(celle)) * smoothstep(0.3, 0.0, length(fract(mp * 40.0) - 0.5));
  ekstraLys += vec3(1.0) * glimt * (0.6 + 0.4 * sin(uTid * 4.0 + hashR(celle) * 40.0)) * 2.5;
#elif MONSTER == 6
  diffuseColor.rgb *= 0.82 + 0.3 * fbmR(mp * 7.0);
  vec3 celle = floor(mp * 30.0);
  ekstraLys = vec3(1.0, 0.85, 0.5) * step(0.975, hashR(celle)) * (0.5 + 0.5 * sin(uTid * 6.0 + hashR(celle) * 50.0)) * 2.0;
#endif
`;

function lavMateriale(skin, uni) {
  const m = new THREE.MeshPhysicalMaterial({
    color: skin.farve, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
    sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffffff"),
  });
  const M = skin.mønster || 0;
  if (M === 1) Object.assign(m, { roughness: 0.6, clearcoat: 0.25, sheen: 0 });
  if (M === 2) Object.assign(m, { roughness: 0.3, iridescence: 0.55, iridescenceIOR: 1.3, iridescenceThicknessRange: [350, 750], emissive: new THREE.Color("#ffe6f4"), emissiveIntensity: 0.22 });
  if (M === 3) Object.assign(m, { roughness: 0.9, clearcoat: 0, sheen: 0, color: new THREE.Color("#ffffff") });
  if (M === 5) Object.assign(m, { roughness: 0.25, sheen: 0 });
  if (M === 6) Object.assign(m, { metalness: 0.9, roughness: 0.24, clearcoat: 0.6, sheen: 0, emissive: new THREE.Color("#8a5a00"), emissiveIntensity: 0.35 });
  m.defines = { MONSTER: M };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
uniform float uTid; uniform mat3 uRul; uniform vec3 uVrik;
varying vec3 vMonster; varying vec3 vObj; varying vec3 vObjN;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vec3 nObj = normalize(objectNormal);
vObj = position; vObjN = nObj; vMonster = uRul * nObj;
float vrik = sin(position.x * 9.0 + uTid * 11.0) * sin(position.z * 8.0 + uTid * 9.0) * uVrik.x
           + sin(position.y * 10.0 + uTid * 14.0) * uVrik.y;
transformed += nObj * vrik;`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
uniform float uTid; uniform vec3 uRand; uniform sampler2D uPixel;
varying vec3 vMonster; varying vec3 vObj; varying vec3 vObjN;
${GLSL_STØJ}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
${GLSL_MØNSTRE}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
totalEmissiveRadiance += ekstraLys;
float randLys = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 2.5);
totalEmissiveRadiance += uRand * randLys * 0.5;`);
  };
  m.customProgramCacheKey = () => "rasmus-" + M;
  return m;
}

// ---------- Kroppens form ----------
function kugleGeo() {
  const g = new THREE.SphereGeometry(R, 64, 44), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), k = 1 + 0.07 * (1 - (y / R + 1) / 2);   // lidt bredere forneden, som en dråbe der sidder
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
    if (y < -R * BUND) p.setY(i, -R * BUND);                   // flad bund
  }
  return g;
}
// Et punkt på kuglens overflade i retningen d (samme form som kugleGeo)
function påKugle(d, ekstra = 0) {
  const p = d.clone().normalize().multiplyScalar(R + ekstra), k = 1 + 0.07 * (1 - (p.y / R + 1) / 2);
  p.x *= k; p.z *= k;
  return p;
}

function klodsGeo() {
  const S = KLODS, rr = 0.16, h = S / 2 - rr, g = new THREE.BoxGeometry(S, S, S, 14, 14, 14);
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), ind = new THREE.Vector3(), d = new THREE.Vector3();
  const kl = THREE.MathUtils.clamp;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    ind.set(kl(v.x, -h, h), kl(v.y, -h, h), kl(v.z, -h, h));
    d.subVectors(v, ind).normalize();
    v.copy(ind).addScaledVector(d, rr);
    p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, d.x, d.y, d.z);
  }
  return g;
}

const std = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.4, ...x });

export class Blob {
  // partikler: { glød, flamme, prikker, brikker } fra spil.js
  constructor(scene, partikler) {
    this.p = partikler;
    this.rod = new THREE.Group();                        // står ved Rasmus' fødder
    this.drej = new THREE.Group();                       // drejer mod der, han kigger hen
    this.rod.add(this.drej);
    scene.add(this.rod);
    this.uni = {
      uTid: { value: 0 }, uRul: { value: new THREE.Matrix3() }, uVrik: { value: new THREE.Vector3() },
      uRand: { value: new THREE.Color() }, uPixel: { value: pixelGræs() },
    };
    this.lys = new THREE.PointLight("#ff7a1a", 0, 7, 1.6);  // ild-Rasmus lyser op omkring sig
    this.lys.position.y = 0.6;
    this.rod.add(this.lys);

    this.rulQ = new THREE.Quaternion();
    this.yaw = 0; this.læn = 0;
    this.mas = 0; this.masV = 0;                         // hvor flad (+) eller strakt (−) han er
    this.vrik = 0;                                       // hvor meget geléen dirrer
    this.blinkOm = 2; this.blinkT = 0;
    this.gladT = 0; this.vis = 1; this.visMål = 1;
    this.kig = new THREE.Vector2(); this.kigMål = new THREE.Vector2(); this.kigOm = 1;
    this.sporT = 0; this.tid = 0;
    this.størrelse = 1; this.størrelseMål = 1;           // frugt gør ham lidt større
    this.sætSkin("blaa");
  }

  sætSkin(id) {
    const skin = SKINS.find(s => s.id === id) || SKINS[0];
    this.skin = skin;
    if (this.krop) { this.drej.remove(this.krop); this.krop.material.dispose(); this.krop.geometry.dispose(); }
    if (this.pynt) { this.drej.remove(this.pynt); this.pynt.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); }
    const klods = !!skin.klods;
    this.krop = new THREE.Mesh(klods ? klodsGeo() : kugleGeo(), lavMateriale(skin, this.uni));
    this.krop.castShadow = true;
    this.midt = new THREE.Vector3(0, klods ? KLODS / 2 : R * BUND, 0);
    this.krop.position.copy(this.midt);
    this.drej.add(this.krop);
    const rand = new THREE.Color(skin.farve);
    if (skin.mønster === 3) rand.set("#7cc84f");
    if (skin.mønster === 2) rand.set("#ffc8f0");
    if (skin.mønster === 5) rand.set("#9a6bff");
    this.uni.uRand.value.copy(rand).multiplyScalar(skin.mønster === 6 ? 0.3 : 0.7);
    this.pynt = new THREE.Group();
    this.drej.add(this.pynt);
    if (klods) this.klodsAnsigt(); else this.kugleAnsigt();
    this.tilbehør(skin);
    this.lys.intensity = 0;
  }

  // Øjne, mund og kinder på den runde Rasmus
  kugleAnsigt() {
    const c = this.midt, sort = std("#101014", { roughness: 0.15 }), hvid = std("#ffffff", { roughness: 0.2, emissive: "#ffffff", emissiveIntensity: 0.18 });
    this.øjne = [];
    for (const s of [-1, 1]) {
      const d = new THREE.Vector3(s * 0.36, 0.42, 0.83).normalize();
      const øje = new THREE.Group();
      øje.position.copy(c).add(påKugle(d, -0.03));
      øje.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
      const hv = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 16), hvid);
      hv.scale.set(1, 1.12, 0.62);
      const pupil = new THREE.Group();
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 12), sort);
      pu.scale.set(1, 1.1, 0.5);
      const glans = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
      glans.position.set(0.024, 0.032, 0.035);
      pupil.add(pu, glans);
      pupil.position.z = 0.058;
      øje.add(hv, pupil);
      this.pynt.add(øje);
      this.øjne.push({ øje, pupil });
    }
    // munden: smil, stor åben mund og en lille "o"
    const md = new THREE.Vector3(0, 0.04, 1).normalize();
    this.mund = new THREE.Group();
    this.mund.position.copy(c).add(påKugle(md, 0.004));
    this.mund.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), md);
    const mørk = std("#3a0914", { roughness: 0.5 });
    const smil = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.017, 8, 20, Math.PI), mørk);
    smil.rotation.z = Math.PI; smil.position.y = 0.035;
    const stor = new THREE.Group();
    const hul = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24, Math.PI, Math.PI), mørk);
    const tunge = new THREE.Mesh(new THREE.CircleGeometry(0.052, 16, Math.PI, Math.PI), std("#ff6b8a"));
    tunge.position.set(0, -0.042, 0.003); tunge.scale.y = 0.8;
    stor.add(hul, tunge); stor.position.set(0, 0.02, 0.01);
    const o = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), mørk);
    o.scale.set(0.9, 1.25, 1); o.position.z = 0.012;
    this.mund.add(smil, stor, o);
    this.munde = { smil, stor, o };
    this.pynt.add(this.mund);
    const kind = new THREE.MeshBasicMaterial({ color: "#ff6f9f", transparent: true, opacity: 0.45, depthWrite: false });
    for (const s of [-1, 1]) {
      const d = new THREE.Vector3(s * 0.64, 0.1, 0.76).normalize();
      const k = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), kind);
      k.position.copy(c).add(påKugle(d, 0.006));
      k.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
      this.pynt.add(k);
    }
  }

  // Firkantede pixeløjne på Broekraft-klodsen
  klodsAnsigt() {
    const S = KLODS, z = S / 2 + 0.004, sort = new THREE.MeshBasicMaterial({ color: "#15151a" }), hvid = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const plan = (b, h, mat) => new THREE.Mesh(new THREE.PlaneGeometry(b, h), mat);
    this.øjne = [];
    for (const s of [-1, 1]) {
      const øje = new THREE.Group();
      øje.position.set(s * 0.19, S * 0.66, z);
      const hv = plan(0.2, 0.2, hvid);
      const pupil = new THREE.Group();
      const pu = plan(0.1, 0.1, sort); pu.position.z = 0.002;
      const glans = plan(0.035, 0.035, hvid); glans.position.set(0.02, 0.02, 0.004);
      pupil.add(pu, glans);
      øje.add(hv, pupil);
      this.pynt.add(øje);
      this.øjne.push({ øje, pupil, firkant: true });
    }
    this.mund = new THREE.Group();
    this.mund.position.set(0, S * 0.36, z);
    const mørk = new THREE.MeshBasicMaterial({ color: "#3a1a0a" });
    const smil = new THREE.Group();
    for (const [x, y, b, h] of [[-0.1, 0.03, 0.05, 0.05], [0.1, 0.03, 0.05, 0.05], [0, -0.01, 0.16, 0.05]]) {
      const m = plan(b, h, mørk); m.position.set(x, y, 0); smil.add(m);
    }
    const stor = new THREE.Group();
    const hul = plan(0.22, 0.12, mørk); stor.add(hul);
    const tunge = plan(0.12, 0.05, new THREE.MeshBasicMaterial({ color: "#e0506a" })); tunge.position.set(0, -0.035, 0.002); stor.add(tunge);
    const o = plan(0.08, 0.1, mørk);
    this.mund.add(smil, stor, o);
    this.munde = { smil, stor, o };
    this.pynt.add(this.mund);
    const kind = new THREE.MeshBasicMaterial({ color: "#ff7fa0", transparent: true, opacity: 0.55 });
    for (const s of [-1, 1]) { const k = plan(0.1, 0.06, kind); k.position.set(s * 0.3, S * 0.42, z); this.pynt.add(k); }
  }

  // Horn, manke, krone, blomst og måne
  tilbehør(skin) {
    const c = this.midt, M = skin.mønster;
    this.måne = null;
    if (M === 2) {                                       // enhjørning: gyldent snoet horn, ører og regnbuemanke
      const g = new THREE.ConeGeometry(0.075, 0.42, 24, 20);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
        const r2 = rr * (1 + 0.16 * Math.sin(a * 2 + y * 38));
        p.setXYZ(i, Math.cos(a) * r2, y, Math.sin(a) * r2);
      }
      g.computeVertexNormals();
      const d = new THREE.Vector3(0, 0.8, 0.6).normalize();
      const horn = new THREE.Mesh(g, std("#ffd66b", { metalness: 0.75, roughness: 0.28, emissive: "#ffae00", emissiveIntensity: 0.35 }));
      horn.position.copy(c).add(påKugle(d, 0.14));
      horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3(0, 0.25, 0.15)).normalize());
      horn.castShadow = true;
      this.pynt.add(horn);
      const øreMat = std("#ffffff", { roughness: 0.5 }), indeMat = std("#ffb3d9", { roughness: 0.6 });
      for (const s of [-1, 1]) {
        const d2 = new THREE.Vector3(s * 0.5, 0.8, 0.12).normalize();
        const øre = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 14), øreMat);
        øre.position.copy(c).add(påKugle(d2, 0.05));
        øre.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d2);
        const inde = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.12, 12), indeMat);
        inde.position.set(0, -0.01, 0.028);
        øre.add(inde);
        this.pynt.add(øre);
      }
      // regnbuemanken: en pandelok bag hornet, der falder ned over nakken
      const manke = ["#ff7eb6", "#c77dff", "#7ab8ff", "#7dffcf", "#ffe66d", "#ff9f6b", "#ff7eb6"];
      manke.forEach((f, i) => {
        const a = 0.12 + i * 0.27, sid = Math.sin(i * 1.3) * 0.18;
        const d3 = new THREE.Vector3(sid, Math.cos(a), -Math.sin(a)).normalize();
        const tot = new THREE.Mesh(new THREE.SphereGeometry(0.13 - i * 0.006, 16, 12),
          new THREE.MeshPhysicalMaterial({ color: f, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color("#ffffff"), emissive: f, emissiveIntensity: 0.15 }));
        tot.position.copy(c).add(påKugle(d3, 0.03));
        tot.scale.set(1.3, 0.8, 1.15);
        tot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d3);
        this.pynt.add(tot);
      });
    }
    if (M === 6) {                                       // guld: en lille krone
      const krone = new THREE.Group(), guld = std("#ffd24a", { metalness: 0.85, roughness: 0.22, emissive: "#a86b00", emissiveIntensity: 0.35 });
      krone.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.1, 24, 1, true), guld));
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const tak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 8), guld);
        tak.position.set(Math.cos(a) * 0.16, 0.1, Math.sin(a) * 0.16);
        const perle = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), std(i % 2 ? "#ff2b55" : "#2bb5ff", { roughness: 0.1 }));
        perle.position.set(Math.cos(a) * 0.17, 0.0, Math.sin(a) * 0.17);
        krone.add(tak, perle);
      }
      krone.position.set(0, c.y + R * 0.95, -0.03);
      krone.rotation.set(-0.15, 0, 0.12);
      krone.traverse(o => { if (o.isMesh) o.castShadow = true; });
      this.pynt.add(krone);
    }
    if (M === 3) {                                       // Broekraft: en lille pixelblomst på toppen
      const blomst = new THREE.Group();
      const stilk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), std("#3f8a26", { roughness: 0.9 }));
      stilk.position.y = 0.07;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.1), std("#e8283c", { roughness: 0.9 }));
      top.position.y = 0.16;
      const midt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.075, 0.04), std("#ffd21f", { roughness: 0.9 }));
      midt.position.y = 0.162;
      blomst.add(stilk, top, midt);
      blomst.position.set(0.18, KLODS, -0.1);
      this.pynt.add(blomst);
    }
    if (M === 5) {                                       // galakse: en lille planet med ring, der kredser
      const måne = new THREE.Group();
      måne.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), std("#ffb45c", { emissive: "#ff7a1a", emissiveIntensity: 0.4 })));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 30), std("#ffe2b0", { emissive: "#ffcf80", emissiveIntensity: 0.5 }));
      ring.rotation.x = 1.2;
      måne.add(ring);
      this.pynt.add(måne);
      this.måne = måne;
    }
  }

  // ---------- Hændelser ----------
  land(styrke) {                                         // styrke ≈ fart ned i m/s
    const s = Math.min(1, styrke / 12);
    this.masV += 2 + s * 9;
    this.vrik = Math.min(1, this.vrik + 0.3 + s);
    this.stænk(Math.round(4 + s * 18), 1 + s * 3);
  }
  hop() { this.masV -= 5; this.vrik = Math.min(1, this.vrik + 0.4); }
  stød(styrke = 1) { this.masV += 3 * styrke; this.vrik = Math.min(1, this.vrik + 0.6); this.stænk(8, 2); }
  glad(sek = 1.2) { this.gladT = Math.max(this.gladT, sek); }
  forsvind() { this.visMål = 0; this.vis = 0; }
  dukOp() { this.visMål = 1; this.vis = 0.01; this.masV -= 6; this.vrik = 1; this.stænk(16, 2.5); }

  // Små stumper, der flyver ud, når han lander (dråber, gnister, klodser …)
  stænk(n, fart) {
    const M = this.skin.mønster || 0, p = this.rod.position, rnd = Math.random;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, v = fart * (0.5 + rnd());
      const o = { x: p.x + Math.cos(a) * 0.35, y: p.y + 0.1, z: p.z + Math.sin(a) * 0.35, vx: Math.cos(a) * v, vy: 1.5 + rnd() * fart * 1.2, vz: Math.sin(a) * v };
      if (M === 3) this.p.brikker.udsend({ ...o, liv: 1.2, str: 0.07 + rnd() * 0.05, farve: rnd() < 0.4 ? "#6dbb44" : "#8a5a36", gulv: p.y + 0.03 });
      else if (M === 1) this.p.flamme.udsend({ ...o, vy: o.vy + 1, liv: 0.5, str: 0.35, strSlut: 0.05, farve: "#ffe07a", farve2: "#ff3a00", tyngde: -2, modstand: 2 });
      else if (M === 0) this.p.prikker.udsend({ ...o, liv: 0.8, str: 0.12 + rnd() * 0.08, strSlut: 0.02, farve: this.skin.farve, tyngde: 14 });
      else this.p.glød.udsend({ ...o, liv: 0.9, str: 0.25, strSlut: 0.02, farve: this.glimtFarve(i), tyngde: 6, modstand: 1.5 });
    }
  }
  glimtFarve(i) {
    const M = this.skin.mønster;
    if (M === 2 || M === 4) return REGNBUE[i % REGNBUE.length];
    if (M === 5) return ["#b98cff", "#7ab8ff", "#ffffff", "#ff8cd9"][i % 4];
    if (M === 6) return ["#ffe07a", "#fff4c2", "#ffc933"][i % 3];
    return "#ffffff";
  }

  // ---------- Hver frame ----------
  // pos: midten af kuglen · fart: m/s · påJorden · stemning: "glad" | "bange" | null · kigPå: punkt han ser mod, når han står stille
  opdater(dt, { pos, fart, påJorden, stemning = null, kigPå = null, kamera = null }) {
    this.tid += dt;
    const u = this.uni;
    u.uTid.value = this.tid;
    this.rod.position.set(pos.x, pos.y - R, pos.z);
    const vh = Math.hypot(fart.x, fart.z);

    // drej mod der, han triller hen (eller mod kameraet, når han står stille)
    let målYaw = this.yaw;
    if (vh > 0.7) målYaw = Math.atan2(fart.x, fart.z);
    else if (kigPå) målYaw = Math.atan2(kigPå.x - pos.x, kigPå.z - pos.z);
    let dy = målYaw - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * Math.min(1, dt * (vh > 0.7 ? 9 : 3.5));
    this.læn += (Math.min(vh * 0.02, 0.18) - this.læn) * Math.min(1, dt * 6);
    this.drej.rotation.set(this.læn, this.yaw, 0, "YXZ");

    // squash & stretch: en fjeder, der svinger tilbage til normal form
    const mål = påJorden ? 0 : THREE.MathUtils.clamp(-fart.y * 0.018, -0.2, 0.08);
    this.masV += (-(this.mas - mål) * 190 - this.masV * 9) * dt;
    this.mas = THREE.MathUtils.clamp(this.mas + this.masV * dt, -0.35, 0.45);
    this.vis += (this.visMål - this.vis) * Math.min(1, dt * (this.visMål > this.vis ? 7 : 20));
    this.størrelse += (this.størrelseMål - this.størrelse) * Math.min(1, dt * 4);
    const sy = 1 - this.mas, sxz = 1 / Math.sqrt(Math.max(0.3, sy)), v = this.vis * this.størrelse;
    this.rod.scale.set(sxz * v, sy * v, sxz * v);
    this.rod.visible = v > 0.02;

    // mønstret ruller med, som om han var en rigtig kugle
    if (vh > 0.01 && !this.skin.klods) {
      const akse = new THREE.Vector3(fart.z, 0, -fart.x).normalize();
      this.rulQ.premultiply(new THREE.Quaternion().setFromAxisAngle(akse, vh * dt / R)).normalize();
    }
    const q = this.rulQ.clone().invert().multiply(this.drej.quaternion);
    u.uRul.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));

    // geléen dirrer
    this.vrik *= Math.exp(-dt * 2.5);
    const dir = 0.006 + this.vrik * 0.03 + Math.min(vh, 10) * 0.0015;
    u.uVrik.value.set(dir, dir * 0.6, 0);

    this.ansigt(dt, påJorden, fart, stemning, kigPå, kamera);
    this.effekter(dt, vh, påJorden);
  }

  ansigt(dt, påJorden, fart, stemning, kigPå, kamera) {
    // blink
    this.blinkOm -= dt;
    if (this.blinkOm <= 0) { this.blinkT = 0.16; this.blinkOm = 1.8 + Math.random() * 3.5; }
    this.blinkT = Math.max(0, this.blinkT - dt);
    const lukket = this.blinkT > 0 ? Math.sin(this.blinkT / 0.16 * Math.PI) : 0;
    // hvor kigger han hen? Mod kameraet, hvis det er tæt på og foran ham — ellers lidt rundt
    this.kigOm -= dt;
    if (this.kigOm <= 0) { this.kigMål.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.3) * 0.8); this.kigOm = 0.8 + Math.random() * 2; }
    const mål = new THREE.Vector2().copy(this.kigMål);
    if (kamera) {
      const lok = this.drej.worldToLocal(kamera.clone());
      if (lok.z > 0.5) mål.set(THREE.MathUtils.clamp(lok.x / lok.z, -1, 1), THREE.MathUtils.clamp((lok.y - 0.5) / lok.z, -1, 1));
    }
    if (stemning === "bange") mål.set(0, -1);
    this.kig.lerp(mål, Math.min(1, dt * 10));
    for (const { øje, pupil, firkant } of this.øjne) {
      øje.scale.y = 1 - lukket * 0.9;
      const m = firkant ? 0.045 : 0.034;
      pupil.position.x = this.kig.x * m; pupil.position.y = this.kig.y * m;
    }
    this.gladT = Math.max(0, this.gladT - dt);
    let mund = "smil";
    if (stemning === "bange") mund = "o";
    else if (this.gladT > 0 || stemning === "glad" || (!påJorden && fart.y > 1)) mund = "stor";
    for (const [navn, m] of Object.entries(this.munde)) m.visible = navn === mund;
  }

  // Flammer, glimmer og planeten, der kredser
  effekter(dt, vh, påJorden) {
    const M = this.skin.mønster || 0, p = this.rod.position, rnd = Math.random, s = this.rod.scale.y;
    if (!this.rod.visible) { this.lys.intensity = 0; return; }
    this.sporT += dt;
    if (M === 1) {                                       // ild: flammer op fra toppen og gløder
      this.lys.intensity = 5 + Math.sin(this.tid * 23) * 0.8 + Math.sin(this.tid * 13) * 0.6;
      const n = Math.floor(this.sporT * (38 + vh * 5));
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, r = rnd() * 0.3;
        this.p.flamme.udsend({ x: p.x + Math.cos(a) * r, y: p.y + (0.55 + rnd() * 0.3) * s, z: p.z + Math.sin(a) * r,
          vx: (rnd() - 0.5) * 0.4, vy: 1.4 + rnd() * 1.2, vz: (rnd() - 0.5) * 0.4, liv: 0.45 + rnd() * 0.3,
          str: 0.45 + rnd() * 0.2, strSlut: 0.06, farve: "#ff9a1a", farve2: "#c01800", alfa: 0.75, modstand: 1.2 });
        if (rnd() < 0.15) this.p.glød.udsend({ x: p.x, y: p.y + 0.8, z: p.z, vx: (rnd() - 0.5) * 1.5, vy: 2 + rnd() * 2, vz: (rnd() - 0.5) * 1.5,
          liv: 1.2, str: 0.06, farve: "#ffb347", farve2: "#ff3300", tyngde: -0.5 });
      }
      if (n) this.sporT = 0;
      return;
    }
    const rate = M === 5 ? 6 + vh * 3 : (M === 2 || M === 4 || M === 6) ? vh * 7 : 0;
    const n = Math.floor(this.sporT * rate);
    if (n) this.sporT = 0;
    if (!rate) this.sporT = 0;
    for (let i = 0; i < n; i++) {                        // glimmer-spor bag ham
      const a = rnd() * Math.PI * 2, r = 0.2 + rnd() * 0.3;
      this.p.glød.udsend({ x: p.x + Math.cos(a) * r, y: p.y + 0.15 + rnd() * 0.6, z: p.z + Math.sin(a) * r,
        vy: 0.3 + rnd() * 0.5, liv: 0.9 + rnd() * 0.6, str: 0.18 + rnd() * 0.14, strSlut: 0.01,
        farve: this.glimtFarve((this.tid * 20 + i) | 0), modstand: 1, ind: 0.1 });
    }
    if (M === 3 && påJorden && vh > 3 && rnd() < dt * vh * 1.5) {  // Broekraft: små jordklumper
      this.p.brikker.udsend({ x: p.x, y: p.y + 0.05, z: p.z, vx: (rnd() - 0.5) * 2, vy: 2 + rnd() * 2, vz: (rnd() - 0.5) * 2,
        liv: 0.9, str: 0.06, farve: rnd() < 0.5 ? "#6dbb44" : "#8a5a36", gulv: p.y + 0.03 });
    }
    if (this.måne) {
      const a = this.tid * 1.8;
      this.måne.position.set(Math.cos(a) * 0.85, this.midt.y + 0.25 + Math.sin(a * 0.7) * 0.2, Math.sin(a) * 0.85);
      this.måne.rotation.y += dt;
    }
  }
}
