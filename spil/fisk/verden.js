// ===== Verdenerne i "Mærkelige fisk" =====
// Søen:   brygge, himmel, træer, åkander, siv, en and, en frø, guldsmede og en regnbue.
// Havet:  man sidder i en båd, der vugger på bølgerne. Øer med palmer, et fyrtårn, sejlbåde,
//         måger, delfiner og en hval. Tryk på 🚤 for at sejle videre til et nyt fiskested.
// Fælles: vand med bølger og skum, solglimt, dråber, ringe, bobler og fisk, der springer langt ude.

import * as THREE from "./three.js";
import { byggFisk, animerFisk, rydOp } from "./fisk.js";

const std = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.8, ...x });
const rnd = (a, b) => a + Math.random() * (b - a);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function mesh(geo, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); return me; }
const ombryd = (v, fra, til) => fra + ((((v - fra) % (til - fra)) + (til - fra)) % (til - fra));

// ---------- Bølgerne ----------
// Samme formel to steder: i JavaScript (flåd, fisk, dråber) og i vandets shader (GLSL), så alt flyder ens.
const BØLGER = {
  sø: {
    js: (x, z, t) => Math.sin(x * 0.35 + t * 1.1) * 0.07 + Math.sin(z * 0.42 + t * 1.4) * 0.055 + Math.sin((x - z) * 0.9 + t * 2.2) * 0.025,
    glsl: "return sin(x * 0.35 + t * 1.1) * 0.07 + sin(z * 0.42 + t * 1.4) * 0.055 + sin((x - z) * 0.9 + t * 2.2) * 0.025;",
    skum: [0.1, 0.15],
  },
  hav: {
    js: (x, z, t) => Math.sin(x * 0.16 + t * 0.9) * 0.17 + Math.sin(z * 0.22 + t * 1.2) * 0.14
      + Math.sin((x - z) * 0.45 + t * 1.9) * 0.05 + Math.sin((x * 0.6 + z) * 0.95 + t * 2.7) * 0.025,
    glsl: "return sin(x * 0.16 + t * 0.9) * 0.17 + sin(z * 0.22 + t * 1.2) * 0.14 + sin((x - z) * 0.45 + t * 1.9) * 0.05 + sin((x * 0.6 + z) * 0.95 + t * 2.7) * 0.025;",
    skum: [0.2, 0.34],
  },
};

function glød(farve) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, farve); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// bane: "sø" eller "hav" · fiskeHer: fiskene, der bor her (til dem, der springer) · lyd(navn, …): spil.js spiller lyden
export function byggVerden(scene, renderer, { bane = "sø", fiskeHer = [], lyd = () => {} } = {}) {
  const HAV = bane === "hav", B = BØLGER[bane];
  const opd = [], dummy = new THREE.Object3D(), c = new THREE.Color();
  const klikbare = [];                                  // ting man kan trykke på: { obj, lyd, tryk() }
  const landskab = [];                                  // havet: øer og både, der glider forbi, når man sejler
  let forskyd = 0, tNu = 0;                             // forskyd: hvor langt båden har sejlet
  const bølge = (x, z, t) => B.js(x, z - forskyd, t);

  // ---------- himmel, tåge og lys ----------
  const HORISONT = new THREE.Color("#d4f0ff");
  scene.background = HORISONT.clone();
  scene.fog = new THREE.Fog(HORISONT, HAV ? 90 : 80, HAV ? 520 : 430);
  const himmelGeo = new THREE.SphereGeometry(560, 32, 20), hp = himmelGeo.attributes.position, hf = [];
  const top = new THREE.Color(HAV ? "#2f8cf2" : "#3b97f5"), hor = new THREE.Color("#d4f0ff"), bundF = new THREE.Color(HAV ? "#8fc8e8" : "#a8d8c8");
  for (let i = 0; i < hp.count; i++) {
    const y = hp.getY(i) / 560;
    if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.55)); else c.copy(hor).lerp(bundF, Math.min(1, -y * 5));
    hf.push(c.r, c.g, c.b);
  }
  himmelGeo.setAttribute("color", new THREE.Float32BufferAttribute(hf, 3));
  const himmelMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const himmel = new THREE.Mesh(himmelGeo, himmelMat);
  himmel.renderOrder = -1;
  scene.add(himmel);

  const solRetning = V(-120, 110, -300).normalize();
  // Omgivelser til spejlinger i vand, guld og disko
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(himmelGeo, himmelMat));
  const solKugle = mesh(new THREE.SphereGeometry(45, 16, 12), new THREE.MeshBasicMaterial({ color: "#fffbe0" }));
  solKugle.position.copy(solRetning).multiplyScalar(400);
  envScene.add(solKugle);
  const envJord = mesh(new THREE.CircleGeometry(500, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: HAV ? "#1f6f9a" : "#5f9e4a" }), 0, -30, 0);
  envScene.add(envJord);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.03, 0.1, 1200).texture;
  pmrem.dispose();

  const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: glød("#fff3b0"), fog: false, depthWrite: false, transparent: true }));
  sol.position.copy(solRetning).multiplyScalar(500);
  sol.scale.setScalar(115);
  scene.add(sol);

  scene.add(new THREE.HemisphereLight("#e3f4ff", HAV ? "#3a7fa8" : "#5d8a4a", 0.9));
  const sollys = new THREE.DirectionalLight("#fff2d6", 2.2);
  sollys.position.set(-20, 40, 30);
  scene.add(sollys);

  // ---------- vandet: bølgerne laves på grafikkortet, og toppen af bølgerne får hvidt skum ----------
  const MIDT = HAV ? V(0, 0, -60) : V(0, 0, -25), STR = HAV ? 320 : 240, SEG = HAV ? 128 : 110;
  const uni = { uTid: { value: 0 }, uForskyd: { value: 0 } };
  const vandMat = new THREE.MeshStandardMaterial({
    color: HAV ? "#1673b8" : "#1d8fc7", roughness: 0.1, metalness: 0.12, flatShading: true, transparent: true, opacity: HAV ? 0.93 : 0.88,
  });
  vandMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
uniform float uTid;
uniform float uForskyd;
varying float vHoejde;
float bolge(vec2 p) { float x = p.x; float z = p.y - uForskyd; float t = uTid; ${B.glsl} }`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
vec4 vVerden = modelMatrix * vec4(transformed, 1.0);
vHoejde = bolge(vVerden.xz);
transformed.y += vHoejde;`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
varying float vHoejde;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.98, 1.0), smoothstep(${B.skum[0].toFixed(3)}, ${B.skum[1].toFixed(3)}, vHoejde) * 0.7);`);
  };
  vandMat.customProgramCacheKey = () => "vand-" + bane;
  const vand = mesh(new THREE.PlaneGeometry(STR, STR, SEG, SEG).rotateX(-Math.PI / 2), vandMat, MIDT.x, 0, MIDT.z);
  vand.frustumCulled = false;
  scene.add(vand);
  opd.push(t => { uni.uTid.value = t; uni.uForskyd.value = forskyd; });
  scene.add(mesh(new THREE.PlaneGeometry(STR, STR).rotateX(-Math.PI / 2), std(HAV ? "#0b3a5c" : "#2f5d46"), MIDT.x, HAV ? -6 : -2.5, MIDT.z));
  if (HAV) {                                            // havet fortsætter helt ud til horisonten
    scene.add(mesh(new THREE.RingGeometry(150, 1100, 64, 1).rotateX(-Math.PI / 2), std("#1673b8", { roughness: 0.15, metalness: 0.12 }), MIDT.x, -0.45, MIDT.z));
  }

  // ---------- solglimt: små lys, der blinker i bølgerne mod solen ----------
  const glimtTekstur = glød("#fffbe0"), solXZ = V(solRetning.x, 0, solRetning.z).normalize(), glimt = [];
  function spredGlimt(gr) {
    gr.xz = [];
    for (let i = 0; i < gr.N; i++) {
      const d = rnd(6, HAV ? 110 : 70), side = rnd(-1, 1) * d * 0.35;
      gr.xz.push([solXZ.x * d - solXZ.z * side, 4 + solXZ.z * d + solXZ.x * side]);
    }
  }
  for (let k = 0; k < 3; k++) {
    const N = 70, pos = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glimtTekstur, size: 0.45, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; scene.add(pts);
    const gr = { pts, pos, N, fase: k / 3, sidst: 1, xz: [] };
    spredGlimt(gr); glimt.push(gr);
  }
  opd.push(t => {
    for (const gr of glimt) {
      const k = (t * 0.35 + gr.fase) % 1;
      if (k < gr.sidst) spredGlimt(gr);                  // et nyt blink et nyt sted
      gr.sidst = k;
      gr.pts.material.opacity = Math.sin(k * Math.PI) * 0.9;
      for (let i = 0; i < gr.N; i++) {
        const [x, z] = gr.xz[i];
        gr.pos[i * 3] = x; gr.pos[i * 3 + 1] = bølge(x, z, t) + 0.06; gr.pos[i * 3 + 2] = z;
      }
      gr.pts.geometry.attributes.position.needsUpdate = true;
    }
  });

  // ---------- skyer ----------
  const bakkeGeo = new THREE.IcosahedronGeometry(1, 1);
  const skyMat = new THREE.MeshStandardMaterial({ color: "#ffffff", flatShading: true, emissive: "#ffffff", emissiveIntensity: 0.45, roughness: 1, fog: false });
  const skyer = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Group();
    for (let j = 0; j < 6; j++) {
      const k = mesh(bakkeGeo, skyMat, rnd(-14, 14), rnd(-2, 4), rnd(-6, 6));
      k.scale.setScalar(rnd(6, 11));
      s.add(k);
    }
    s.position.set(rnd(-300, 300), rnd(55, 95), rnd(-330, -120));
    scene.add(s); skyer.push(s);
  }
  opd.push((t, dt) => { for (const s of skyer) { s.position.x += dt * 2.5; if (s.position.x > 320) s.position.x = -320; } });

  // ---------- vanddråber og ringe i vandet ----------
  const MAKS = 320;
  const dråbeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: "#eaf8ff" }), MAKS);
  dråbeMesh.frustumCulled = false;
  scene.add(dråbeMesh);
  const dr = Array.from({ length: MAKS }, () => ({ liv: 0 }));
  let næste = 0;
  function dråber(pos, n, fart = 3, str = 1) {           // str: større dråber (hvalens sprøjt langt ude)
    for (let i = 0; i < n; i++) {
      const d = dr[næste]; næste = (næste + 1) % MAKS;
      const a = Math.random() * Math.PI * 2, v = fart * rnd(0.2, 0.7);
      Object.assign(d, { x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: fart * rnd(0.6, 1.3), liv: 2, s: rnd(0.6, 1.6) * str });
    }
  }
  opd.push((t, dt) => {
    for (let i = 0; i < MAKS; i++) {
      const d = dr[i];
      if (d.liv > 0) {
        d.liv -= dt; d.vy -= 9.8 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        if (d.vy < 0 && d.y < bølge(d.x, d.z, t) - 0.05) d.liv = 0;
      }
      dummy.position.set(d.x || 0, d.y || 0, d.z || 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(d.liv > 0 ? d.s : 0);
      dummy.updateMatrix(); dråbeMesh.setMatrixAt(i, dummy.matrix);
    }
    dråbeMesh.instanceMatrix.needsUpdate = true;
  });

  const ringGeo = new THREE.RingGeometry(0.8, 1, 36).rotateX(-Math.PI / 2);
  const ringe = [];
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; scene.add(m); ringe.push({ m, liv: 0 });
  }
  function ring(pos, str = 1, forsink = 0) {
    const r = ringe.reduce((a, b) => (b.liv < a.liv ? b : a));
    Object.assign(r, { x: pos.x, z: pos.z, str, liv: 1.3 + forsink });
  }
  opd.push((t, dt) => {
    for (const r of ringe) {
      r.liv -= dt;
      r.m.visible = r.liv > 0 && r.liv <= 1.3;
      if (!r.m.visible) continue;
      const s = 1 - r.liv / 1.3;
      r.m.position.set(r.x, bølge(r.x, r.z, t) + 0.04, r.z);
      r.m.scale.setScalar((0.15 + s * 1.6) * r.str);
      r.m.material.opacity = 0.75 * (1 - s);
    }
  });

  function plask(pos, str = 1) {
    const p = V(pos.x, bølge(pos.x, pos.z, tNu) + 0.05, pos.z);
    dråber(p, Math.round(14 * str), 2.5 + str * 1.2);
    ring(p, str); ring(p, str * 0.7, 0.25);
  }

  // ---------- bobler: der er en fisk i nærheden af flåddet! ----------
  const BMAKS = 40;
  const bobleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6),
    new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.3 }), BMAKS);
  bobleMesh.frustumCulled = false;
  scene.add(bobleMesh);
  const bo = Array.from({ length: BMAKS }, () => ({ liv: 0 }));
  let næsteBoble = 0;
  function bobler(pos, n = 1) {
    for (let i = 0; i < n; i++) {
      const b = bo[næsteBoble]; næsteBoble = (næsteBoble + 1) % BMAKS;
      Object.assign(b, { x: pos.x + rnd(-0.35, 0.35), z: pos.z + rnd(-0.35, 0.35), dy: -rnd(0.3, 0.6), liv: 1, s: rnd(0.6, 1.4) });
    }
  }
  opd.push((t, dt) => {
    for (let i = 0; i < BMAKS; i++) {
      const b = bo[i];
      if (b.liv > 0) { b.dy += dt * 0.7; if (b.dy >= 0) { b.liv = 0; ring(b, 0.25); } }
      dummy.position.set(b.x || 0, b.liv > 0 ? bølge(b.x, b.z, t) + b.dy : 0, b.z || 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(b.liv > 0 ? b.s : 0);
      dummy.updateMatrix(); bobleMesh.setMatrixAt(i, dummy.matrix);
    }
    bobleMesh.instanceMatrix.needsUpdate = true;
  });

  // ---------- en fisk springer op af vandet langt ude en gang imellem ----------
  const spring = { m: null, t: -1, fra: V(), retning: V(1, 0, 0), h: 1.5, str: 1, vent: rnd(2.5, 5) };
  opd.push((t, dt) => {
    const s = spring;
    if (s.t < 0) {
      if ((s.vent -= dt) > 0 || !fiskeHer.length) return;
      if (s.m) { scene.remove(s.m); rydOp(s.m); }
      s.m = byggFisk(fiskeHer[Math.floor(Math.random() * fiskeHer.length)]);
      scene.add(s.m);
      const a = rnd(-0.9, 0.9), d = rnd(14, HAV ? 55 : 38), r = rnd(0, Math.PI * 2);
      s.fra.set(Math.sin(a) * d, 0, 2 - Math.cos(a) * d);
      s.retning.set(Math.cos(r), 0, Math.sin(r));
      s.str = 1 + d / 30; s.m.scale.setScalar(s.str);
      s.h = rnd(1.2, 2.2) * s.str * 0.8; s.t = 0;
      plask(s.fra, 0.8 * s.str);
      return;
    }
    s.t += dt / 1.1;
    const k = Math.min(1, s.t), p = s.m.position;
    p.copy(s.fra).addScaledVector(s.retning, k * 2.8 * s.str);
    p.y = bølge(p.x, p.z, t) - 0.3 + Math.sin(Math.PI * k) * s.h;
    s.m.rotation.set(0, Math.atan2(-s.retning.z, s.retning.x), Math.cos(Math.PI * k));
    s.m.visible = s.t < 1;
    animerFisk(s.m, t, 2);
    if (s.t >= 1) { plask(p, 0.9 * s.str); s.t = -1; s.vent = rnd(3.5, 8); }
  });

  // ---------- spanden til fangsten og en grejkasse ----------
  const spand = new THREE.Group();
  const rød = std("#e63946", { roughness: 0.4, side: THREE.DoubleSide });
  spand.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.23, 0.42, 24, 1, true), rød));
  spand.add(mesh(new THREE.CircleGeometry(0.23, 24).rotateX(-Math.PI / 2), rød, 0, -0.21, 0));
  const kant = mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 28), std("#ffffff"), 0, 0.21, 0);
  kant.rotation.x = Math.PI / 2; spand.add(kant);
  spand.add(mesh(new THREE.CircleGeometry(0.28, 24).rotateX(-Math.PI / 2), std("#4cc3f0", { roughness: 0.1 }), 0, 0.12, 0));
  const hank = mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 20, Math.PI), std("#9aa3ad", { metalness: 0.7, roughness: 0.3 }), 0, 0.21, 0);
  hank.rotation.set(-0.5, 0.4, 0); spand.add(hank);
  spand.scale.setScalar(0.8);
  const spandPos = V(-0.95, 0.98, 2.3);
  const iSpanden = [];
  function spandFisk(farve) {                            // en lille hale stikker op af spanden for hver fangst
    const h = mesh(new THREE.ConeGeometry(0.06, 0.16, 4), std(farve, { roughness: 0.4 }), rnd(-0.14, 0.14), 0.2, rnd(-0.14, 0.14));
    h.rotation.set(rnd(-0.4, 0.4), rnd(0, 3), rnd(-0.4, 0.4));
    spand.add(h); iSpanden.push(h);
    if (iSpanden.length > 7) spand.remove(iSpanden.shift());
  }
  const kasse = new THREE.Group();
  kasse.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 0.32), std("#2a9d8f", { roughness: 0.5 })));
  kasse.add(mesh(new THREE.BoxGeometry(0.57, 0.05, 0.34), std("#23867a", { roughness: 0.5 }), 0, 0.15, 0));
  kasse.add(mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12, Math.PI), std("#26262e"), 0, 0.17, 0));

  // ---------- og så selve stedet ----------
  let kamera, båd = null;
  if (HAV) byggHav(); else byggSø();

  // ======================================================================
  // Søen
  // ======================================================================
  function byggSø() {
    kamera = { pos: V(0, 2.1, 4.2), rx: -0.14 };
    const SØ = MIDT;

    // land, strand, bakker og bjerge
    scene.add(mesh(new THREE.RingGeometry(84, 700, 80, 4).rotateX(-Math.PI / 2), std("#6cbf4a", { flatShading: true }), SØ.x, 0.4, SØ.z));
    scene.add(mesh(new THREE.RingGeometry(79, 86, 80, 1).rotateX(-Math.PI / 2), std("#efd9a1"), SØ.x, 0.22, SØ.z));
    for (let i = 0; i < 9; i++) {
      const a = rnd(3.4, 6.0), r = rnd(150, 220);
      const m = mesh(bakkeGeo, std(["#5aa845", "#6fb84f", "#4f9a3f"][i % 3], { flatShading: true }), SØ.x + Math.cos(a) * r, -4, SØ.z + Math.sin(a) * r);
      m.scale.set(rnd(40, 70), rnd(16, 30), rnd(30, 50));
      m.rotation.y = rnd(0, 3);
      scene.add(m);
    }
    for (let i = 0; i < 6; i++) {
      const a = 3.5 + i * 0.48 + rnd(-0.12, 0.12), r = rnd(300, 360), h = rnd(90, 140);
      const x = SØ.x + Math.cos(a) * r, z = SØ.z + Math.sin(a) * r;
      scene.add(mesh(new THREE.ConeGeometry(h * 0.7, h, 6), std("#8fa9c4", { flatShading: true }), x, h / 2 - 5, z));
      scene.add(mesh(new THREE.ConeGeometry(h * 0.225, h * 0.3, 6), std("#ffffff", { flatShading: true }), x, h - 5 - h * 0.15 + 0.3, z));
    }

    // en regnbue bag bjergene
    const bue = new THREE.TorusGeometry(125, 6, 8, 64, Math.PI), bp = bue.attributes.position, bf = [];
    for (let i = 0; i < bp.count; i++) {
      const k = THREE.MathUtils.clamp((Math.hypot(bp.getX(i), bp.getY(i)) - 119) / 12, 0, 1);
      c.setHSL((1 - k) * 0.78, 0.9, 0.62); bf.push(c.r, c.g, c.b);
    }
    bue.setAttribute("color", new THREE.Float32BufferAttribute(bf, 3));
    const regnbue = mesh(bue, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, fog: false, depthWrite: false }), 70, -20, -380);
    regnbue.scale.z = 0.1; regnbue.renderOrder = -0.5;
    scene.add(regnbue);

    // træer rundt om søen
    const granGeo = new THREE.ConeGeometry(1, 1, 7); granGeo.translate(0, 0.5, 0);
    const kroneGeo = new THREE.IcosahedronGeometry(1, 0);
    const stammeGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 6); stammeGeo.translate(0, 0.5, 0);
    const træMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });
    const N = 140;
    const graner = new THREE.InstancedMesh(granGeo, træMat, N * 2);
    const kroner = new THREE.InstancedMesh(kroneGeo, træMat, N);
    const stammer = new THREE.InstancedMesh(stammeGeo, std("#6b4a2b"), N);
    const grøn = ["#2f7d3a", "#3b8f40", "#276b34", "#4f9d3a"], løv = ["#5bb04a", "#77c24d", "#4aa048", "#8fcf52"];
    let ng = 0, nk = 0;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rnd(-0.02, 0.02), r = rnd(90, 135), h = rnd(7, 15);
      const x = SØ.x + Math.cos(a) * r, z = SØ.z + Math.sin(a) * r;
      dummy.position.set(x, 0.4, z); dummy.rotation.set(0, rnd(0, 6), 0); dummy.scale.set(1.2, h * 0.3, 1.2);
      dummy.updateMatrix(); stammer.setMatrixAt(i, dummy.matrix);
      if (Math.random() < 0.6) {
        for (let j = 0; j < 2; j++) {
          dummy.position.set(x, 0.4 + h * (0.2 + j * 0.3), z);
          dummy.scale.set(h * (0.32 - j * 0.08), h * 0.55, h * (0.32 - j * 0.08));
          dummy.updateMatrix(); graner.setMatrixAt(ng, dummy.matrix); graner.setColorAt(ng++, c.set(grøn[(i + j) % 4]));
        }
      } else {
        dummy.position.set(x, 0.4 + h * 0.62, z); dummy.scale.set(h * 0.33, h * 0.3, h * 0.33);
        dummy.updateMatrix(); kroner.setMatrixAt(nk, dummy.matrix); kroner.setColorAt(nk++, c.set(løv[i % 4]));
      }
    }
    graner.count = ng; kroner.count = nk;
    for (const m of [graner, kroner, stammer]) { m.frustumCulled = false; scene.add(m); }

    // åkander (og én, som frøen sidder på)
    const åkGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.05, 20, 1, false, 0.4, Math.PI * 2 - 0.8);
    const åkMat = std("#3fa34d", { roughness: 0.6 }), blomMat = std("#ff8fc8", { roughness: 0.5 }), midtMat = std("#ffd23f");
    const bladGeo = new THREE.ConeGeometry(0.1, 0.28, 5); bladGeo.translate(0, 0.14, 0);
    const åer = [];
    const åkande = (x, z, blomst, str) => {
      const å = new THREE.Group();
      å.add(new THREE.Mesh(åkGeo, åkMat));
      if (blomst) {
        for (let j = 0; j < 7; j++) {
          const a = j / 7 * Math.PI * 2, b = mesh(bladGeo, blomMat, Math.cos(a) * 0.05, 0.03, Math.sin(a) * 0.05);
          b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
          å.add(b);
        }
        å.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), midtMat, 0, 0.08, 0));
      }
      å.position.set(x, 0, z); å.rotation.y = rnd(0, 6); å.scale.setScalar(str);
      scene.add(å); åer.push(å);
      return å;
    };
    for (let i = 0; i < 18; i++) åkande((i % 2 ? 1 : -1) * rnd(3.5, 22), rnd(-32, 0), Math.random() < 0.5, rnd(0.7, 1.3));
    const frøBlad = åkande(-3.4, -4.8, false, 1.25);
    opd.push(t => { for (const å of åer) å.position.y = bølge(å.position.x, å.position.z, t) + 0.03; });

    // siv
    const sivGeo = new THREE.ConeGeometry(0.05, 1, 4); sivGeo.translate(0, 0.5, 0);
    const NS = 160, siv = new THREE.InstancedMesh(sivGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), NS);
    const kolber = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 6), std("#6b3f1f"), NS);
    const klynger = [[-4.5, 0.5], [-6.5, -3], [5, 1], [7.5, -2.5], [-12, -8], [13, -10], [-20, -16], [22, -18]];
    let nkol = 0;
    for (let i = 0; i < NS; i++) {
      const [cx, cz] = klynger[i % klynger.length], x = cx + rnd(-1.4, 1.4), z = cz + rnd(-1.4, 1.4), h = rnd(1.2, 2.4);
      dummy.position.set(x, -0.3, z); dummy.rotation.set(rnd(-0.12, 0.12), 0, rnd(-0.12, 0.12)); dummy.scale.set(1, h, 1);
      dummy.updateMatrix(); siv.setMatrixAt(i, dummy.matrix); siv.setColorAt(i, c.setHSL(0.27 + rnd(-0.03, 0.03), 0.55, rnd(0.3, 0.45)));
      if (Math.random() < 0.3) {
        dummy.position.set(x, -0.3 + h * 0.8, z); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); kolber.setMatrixAt(nkol++, dummy.matrix);
      }
    }
    kolber.count = nkol;
    for (const m of [siv, kolber]) { m.frustumCulled = false; scene.add(m); }

    // brygge
    const plankeGeo = new THREE.BoxGeometry(2.6, 0.08, 0.3);
    const træFarver = ["#a47148", "#b5835a", "#9a6840", "#ad7a50"].map(f => std(f, { roughness: 0.85 }));
    for (let i = 0, z = 1.66; z < 16; z += 0.33, i++) {
      const p = mesh(plankeGeo, træFarver[i % 4], rnd(-0.03, 0.03), 0.6, z);
      p.rotation.y = rnd(-0.012, 0.012);
      scene.add(p);
    }
    for (const x of [-1.05, 1.05]) scene.add(mesh(new THREE.BoxGeometry(0.16, 0.2, 14.5), træFarver[2], x, 0.46, 8.8));
    const pælGeo = new THREE.CylinderGeometry(0.12, 0.13, 3.4, 8), pælMat = std("#7a5433", { roughness: 0.9 });
    for (const z of [1.62, 5, 8.5, 12]) for (const x of [-1.25, 1.25]) scene.add(mesh(pælGeo, pælMat, x, -0.75, z));

    spand.position.set(-0.95, 0.81, 2.3); scene.add(spand);
    kasse.position.set(0.85, 0.77, 2.6); kasse.rotation.y = 0.3; scene.add(kasse);

    // and der svømmer rundt (tryk på den!)
    const and = new THREE.Group();
    const gul = std("#ffd23f", { roughness: 0.4 }), orange = std("#ff8c1a", { roughness: 0.4 }), sort = std("#111111");
    const krop = mesh(new THREE.SphereGeometry(0.35, 18, 14), gul, 0, 0.12, 0); krop.scale.set(1.3, 0.85, 1); and.add(krop);
    const hale = mesh(new THREE.ConeGeometry(0.12, 0.25, 8), gul, -0.42, 0.28, 0); hale.rotation.z = 0.9; and.add(hale);
    and.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), gul, 0.3, 0.46, 0));
    const næb = mesh(new THREE.SphereGeometry(1, 12, 8), orange, 0.5, 0.42, 0); næb.scale.set(0.16, 0.05, 0.11); and.add(næb);
    for (const s of [1, -1]) and.add(mesh(new THREE.SphereGeometry(0.035, 8, 6), sort, 0.42, 0.52, s * 0.13));
    and.scale.setScalar(1.4);
    and.userData.hop = 0;
    scene.add(and);
    klikbare.push({ obj: and, lyd: "rap", tryk: () => { and.userData.hop = 1; } });
    opd.push((t, dt) => {
      const a = t * 0.1, x = 6 + Math.cos(a) * 3.5, z = -10 + Math.sin(a) * 3.5;
      and.userData.hop = Math.max(0, and.userData.hop - dt * 1.6);
      and.position.set(x, bølge(x, z, t) + Math.sin(and.userData.hop * Math.PI) * 0.8, z);
      and.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), Math.sin(t * 1.3) * 0.06);
    });

    // en frø på en åkande (tryk på den — så kvækker den og hopper)
    const frø = byggFrø();
    frø.rotation.y = Math.atan2(-9, 3.4);
    scene.add(frø);
    klikbare.push({ obj: frø, lyd: "kvæk", tryk: () => { frø.userData.hop = 1; } });
    opd.push((t, dt) => {
      const u = frø.userData;
      u.hop = Math.max(0, u.hop - dt * 1.5);
      frø.position.set(frøBlad.position.x, frøBlad.position.y + 0.03 + Math.sin(u.hop * Math.PI) * 0.9, frøBlad.position.z);
      const pust = u.hop > 0 ? Math.sin(u.hop * 14) : Math.max(0, Math.sin(t * 1.3)) ** 8;   // halsen puster sig op
      u.hals.scale.setScalar(0.001 + Math.max(0, pust) * 0.13);
    });

    // guldsmede, der svirrer rundt ved sivene
    const steder = [[-4.5, 0.5], [5, 1], [-6.5, -3], [7.5, -2.5]];
    for (let i = 0; i < 3; i++) {
      const g = byggGuldsmed(), [cx, cz] = steder[i];
      g.position.set(cx, 1.4, cz); scene.add(g);
      const mål = V(cx, 1.4, cz);
      let vent = 0;
      opd.push((t, dt) => {
        if ((vent -= dt) <= 0) {                           // pil af sted til et nyt sted
          const [sx, sz] = steder[Math.floor(Math.random() * steder.length)];
          mål.set(sx + rnd(-1.5, 1.5), rnd(0.9, 1.9), sz + rnd(-1.5, 1.5)); vent = rnd(1, 2.6);
        }
        const før = g.position.clone();
        g.position.lerp(mål, Math.min(1, dt * 3));
        g.position.y += Math.sin(t * 7 + i) * 0.004;
        const dx = g.position.x - før.x, dz = g.position.z - før.z;
        if (dx * dx + dz * dz > 1e-6) g.rotation.y = Math.atan2(-dz, dx);
        for (const v of g.userData.vinger) v.rotation.x = v.userData.side * Math.sin(t * 45 + i) * 0.5;
      });
    }
  }

  function byggFrø() {
    const g = new THREE.Group(), grøn = std("#4caf50", { roughness: 0.5 }), lys = std("#c5e8b0", { roughness: 0.5 }), sort = std("#111111");
    const krop = mesh(new THREE.SphereGeometry(1, 20, 14), grøn, 0, 0.18, 0); krop.scale.set(0.3, 0.2, 0.26); g.add(krop);
    const mave = mesh(new THREE.SphereGeometry(1, 16, 10), lys, 0.08, 0.14, 0); mave.scale.set(0.24, 0.14, 0.2); g.add(mave);
    const hoved = mesh(new THREE.SphereGeometry(1, 18, 12), grøn, 0.2, 0.3, 0); hoved.scale.set(0.2, 0.15, 0.22); g.add(hoved);
    for (const side of [1, -1]) {
      g.add(mesh(new THREE.SphereGeometry(0.08, 12, 10), grøn, 0.22, 0.43, side * 0.11));
      g.add(mesh(new THREE.SphereGeometry(0.062, 12, 10), std("#ffffff", { roughness: 0.3 }), 0.25, 0.46, side * 0.12));
      g.add(mesh(new THREE.SphereGeometry(0.034, 10, 8), sort, 0.3, 0.47, side * 0.13));
      const bag = mesh(new THREE.SphereGeometry(1, 12, 8), grøn, -0.16, 0.08, side * 0.24); bag.scale.set(0.2, 0.08, 0.1); g.add(bag);
      const for_ = mesh(new THREE.SphereGeometry(1, 10, 8), grøn, 0.22, 0.05, side * 0.16); for_.scale.set(0.1, 0.05, 0.06); g.add(for_);
    }
    const smil = mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 14, Math.PI), std("#2a4a1a"), 0.36, 0.28, 0);
    smil.rotation.set(0, Math.PI / 2, Math.PI); g.add(smil);
    const hals = mesh(new THREE.SphereGeometry(1, 14, 10), std("#f4ffd6", { transparent: true, opacity: 0.9 }), 0.3, 0.2, 0);
    hals.scale.setScalar(0.001); g.add(hals);
    g.scale.setScalar(1.3);
    g.userData = { hop: 0, hals };
    return g;
  }

  function byggGuldsmed() {
    const g = new THREE.Group(), blå = std("#1fb5c9", { metalness: 0.6, roughness: 0.3 });
    const krop = mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.42, 6), blå, -0.08, 0, 0); krop.rotation.z = Math.PI / 2; g.add(krop);
    g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), std("#1a8fa8", { metalness: 0.6, roughness: 0.3 }), 0.14, 0, 0));
    for (const side of [1, -1]) g.add(mesh(new THREE.SphereGeometry(0.02, 8, 6), std("#0d4a2a"), 0.165, 0.015, side * 0.022));
    const vm = new THREE.MeshStandardMaterial({ color: "#f2fbff", transparent: true, opacity: 0.7, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.4 });
    const vinger = [];
    for (const x of [0.06, -0.01]) for (const side of [1, -1]) {
      const v = new THREE.Group(); v.position.set(x, 0.015, 0);
      const w = mesh(new THREE.PlaneGeometry(0.06, 0.24), vm, 0, 0, side * 0.12); w.rotation.x = -Math.PI / 2; v.add(w);
      v.userData.side = side; g.add(v); vinger.push(v);
    }
    g.userData.vinger = vinger;
    g.scale.setScalar(1.7);
    return g;
  }

  // ======================================================================
  // Havet
  // ======================================================================
  function byggHav() {
    kamera = { pos: V(0, 1.45, 4.35), rx: -0.1 };
    båd = byggBåd();
    båd.position.set(0, 0, 3.9);
    scene.add(båd);

    // fjerne øer ved horisonten (for langt væk til at flytte sig, når man sejler)
    for (const [x, z, h] of [[-160, -430, 70], [210, -390, 50], [30, -470, 40]]) {
      scene.add(mesh(new THREE.ConeGeometry(h * 1.3, h, 7), std("#6f9a7a", { flatShading: true }), x, h / 2 - 8, z));
    }
    // øer med palmer — og et fyrtårn
    ø(-45, -110, 18, 3);
    const fyrØ = ø(70, -150, 24, 1);
    fyrtårn(fyrØ, 24);
    ø(-120, -230, 35, 5);
    ø(30, -300, 20, 2);
    ø(110, -60, 14, 2);

    // sejlbåde, der krydser langt ude
    [[-60, -95, "#e63946", 1.1], [80, -175, "#3a86ff", -0.8], [-20, -245, "#ffbe0b", 1.4]].forEach(([x, z, farve, fart]) => {
      const b = sejlbåd(farve);
      b.position.set(x, 0, z); b.rotation.y = fart > 0 ? 0 : Math.PI;
      b.userData = { z0: z, fart };
      scene.add(b); landskab.push(b);
      opd.push((t, dt) => {
        b.position.x = ombryd(b.position.x + b.userData.fart * dt, -220, 220);
        b.position.y = bølge(b.position.x, b.position.z, t) - 0.1;
        b.rotation.x = Math.sin(t * 0.9 + x) * 0.05;
      });
    });

    // en bøje med en måge på (tryk på mågen!)
    const bøje = new THREE.Group();
    bøje.add(mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.9, 14), std("#e63946", { roughness: 0.5 }), 0, 0.2, 0));
    bøje.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.22, 14), std("#ffffff", { roughness: 0.5 }), 0, 0.45, 0));
    bøje.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), std("#555b66", { metalness: 0.6 }), 0, 1.0, 0));
    const lygte = mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: "#ffe066", emissive: "#ffcc00", emissiveIntensity: 1 }), 0, 1.5, 0);
    bøje.add(lygte);
    const sidder = byggMåge(true);
    sidder.g.position.set(0.05, 0.56, 0); sidder.g.rotation.y = -1.2;
    bøje.add(sidder.g);
    const træfBøje = mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial(), 0, 0.8, 0); træfBøje.visible = false; bøje.add(træfBøje);
    bøje.position.set(4.5, 0, -9); bøje.userData = { z0: -9, fra: -95, til: 15 };
    scene.add(bøje); landskab.push(bøje);
    let mågeHop = 0;
    klikbare.push({ obj: bøje, lyd: "måge", tryk: () => { mågeHop = 1; } });
    opd.push((t, dt) => {
      bøje.position.y = bølge(bøje.position.x, bøje.position.z, t) - 0.15;
      bøje.rotation.set(Math.sin(t * 1.3) * 0.12, 0, Math.cos(t * 1.1) * 0.12);
      lygte.material.emissiveIntensity = Math.sin(t * 3) > 0.6 ? 2 : 0.3;
      mågeHop = Math.max(0, mågeHop - dt * 1.2);
      sidder.g.position.y = 0.56 + Math.sin(mågeHop * Math.PI) * 0.9;
      for (const v of sidder.vinger) v.rotation.x = v.userData.side * (mågeHop > 0 ? 0.3 + Math.sin(t * 22) * 0.9 : 1.25);
    });

    // måger, der flyver i cirkler
    for (let i = 0; i < 4; i++) {
      const m = byggMåge(false), cx = rnd(-25, 25), cz = rnd(-45, -15), R = rnd(8, 16), h = rnd(10, 18), fart = rnd(0.25, 0.4) * (i % 2 ? 1 : -1);
      m.g.scale.setScalar(1.8);
      const træf = mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial()); træf.visible = false; m.g.add(træf);
      scene.add(m.g);
      let rul = 0;
      klikbare.push({ obj: m.g, lyd: "måge", tryk: () => { rul = 1; } });
      opd.push((t, dt) => {
        const a = t * fart + i * 1.7;
        m.g.position.set(cx + Math.cos(a) * R, h + Math.sin(t * 0.7 + i) * 1.2, cz + Math.sin(a) * R);
        rul = Math.max(0, rul - dt * 0.8);
        // næbbet peger den vej, mågen flyver — og den laver en rulle, når man trykker på den
        m.g.rotation.set(rul * Math.PI * 2, -a + (fart > 0 ? -Math.PI / 2 : Math.PI / 2), fart > 0 ? 0.25 : -0.25);
        for (const v of m.vinger) v.rotation.x = v.userData.side * Math.sin(t * 7 + i) * 0.55;
      });
    }

    // delfiner, der springer sammen
    const delfiner = [byggDelfin(), byggDelfin()];
    for (const d of delfiner) { d.visible = false; scene.add(d); }
    const dFra = V(), dRet = V(1, 0, 0);
    let dT = -1, dVent = rnd(4, 8);
    opd.push((t, dt) => {
      if (dT < 0) {
        if ((dVent -= dt) > 0) return;
        const a = rnd(-1, 1), d = rnd(18, 45), r = rnd(0, Math.PI * 2);
        dFra.set(Math.sin(a) * d, 0, 2 - Math.cos(a) * d); dRet.set(Math.cos(r), 0, Math.sin(r));
        dT = 0; for (const m of delfiner) m.userData.trin = 0;
      }
      dT += dt / 1.5;
      delfiner.forEach((m, i) => {
        const s = dT - i * 0.2;
        m.visible = s >= 0 && s <= 1;
        if (!m.visible) return;
        const p = m.position;
        p.copy(dFra).addScaledVector(dRet, s * 9).add(V(-dRet.z * i * 1.6, 0, dRet.x * i * 1.6));
        p.y = bølge(p.x, p.z, t) - 0.6 + Math.sin(Math.PI * s) * 3.2;
        m.rotation.set(0, Math.atan2(-dRet.z, dRet.x), Math.cos(Math.PI * s) * 1.1);
        if (m.userData.trin === 0) { plask(p, 1); m.userData.trin = 1; }
        if (m.userData.trin === 1 && s > 0.93) { plask(p, 1.3); m.userData.trin = 2; }
      });
      if (dT > 1.3) { dT = -1; dVent = rnd(6, 12); }
    });

    // en hval, der dukker op langt ude, sprøjter og dykker med halen i vejret
    const hval = byggHval();
    hval.g.visible = false; scene.add(hval.g);
    const hPos = V();
    let hT = -1, hVent = rnd(10, 16), sprøjtet = 0;
    opd.push((t, dt) => {
      if (hT < 0) {
        if ((hVent -= dt) > 0) return;
        const a = rnd(-0.6, 0.6), d = rnd(55, 85);
        hPos.set(Math.sin(a) * d, 0, 2 - Math.cos(a) * d);
        hT = 0; sprøjtet = 0; hval.g.visible = true; hval.g.rotation.y = rnd(0, Math.PI * 2);
      }
      hT += dt / 11;
      let y, tip = 0;
      if (hT < 0.25) y = -4 + hT / 0.25 * 3.3;
      else if (hT < 0.6) y = -0.7 + Math.sin((hT - 0.25) * 18) * 0.1;
      else { const k = (hT - 0.6) / 0.4; y = -0.7 - k * 5; tip = Math.sin(k * Math.PI * 0.5) * 0.7; }
      hval.g.position.set(hPos.x, bølge(hPos.x, hPos.z, t) + y, hPos.z);
      hval.g.rotation.z = -tip;
      hval.hale.rotation.z = tip * 1.3;
      if ((sprøjtet === 0 && hT > 0.3) || (sprøjtet === 1 && hT > 0.46)) {       // pfffft!
        sprøjtet++;
        const top = hval.g.localToWorld(V(2.5, 1.6, 0));
        dråber(top, 60, 8, 6);
        if (sprøjtet === 1) lyd("hvalSang", 0.6);
      }
      if (hT >= 1) { hT = -1; hVent = rnd(18, 30); hval.g.visible = false; }
    });

    // øer og både glider forbi, når man sejler
    opd.push(() => {
      for (const o of landskab) o.position.z = ombryd(o.userData.z0 + forskyd, o.userData.fra ?? -450, o.userData.til ?? 250);
    });
  }

  function ø(x, z, r, palmer) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const sand = mesh(new THREE.IcosahedronGeometry(1, 2), std("#f0d9a0", { flatShading: true }), 0, -r * 0.05, 0);
    sand.scale.set(r, r * 0.16, r * 0.85); g.add(sand);
    const græs = mesh(new THREE.IcosahedronGeometry(1, 1), std("#5cb84a", { flatShading: true }), r * 0.05, r * 0.02, 0);
    græs.scale.set(r * 0.62, r * 0.2, r * 0.5); g.add(græs);
    for (let i = 0; i < palmer; i++) {
      const a = rnd(0, Math.PI * 2), d = rnd(0, r * 0.4);
      g.add(palme(Math.cos(a) * d, r * 0.13, Math.sin(a) * d * 0.8, rnd(5, 8) * (r / 22) ** 0.5));
    }
    for (let i = 0; i < 5; i++) {                        // sten ved vandkanten
      const a = rnd(0, Math.PI * 2), sten = mesh(new THREE.IcosahedronGeometry(1, 0), std("#8d949c", { flatShading: true }), Math.cos(a) * r * 0.95, 0, Math.sin(a) * r * 0.8);
      sten.scale.setScalar(rnd(0.8, 2.2)); sten.rotation.set(rnd(0, 3), rnd(0, 3), 0); g.add(sten);
    }
    g.userData.z0 = z;
    scene.add(g); landskab.push(g);
    return g;
  }

  function palme(x, y, z, h) {
    const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = rnd(0, Math.PI * 2);
    const stammeMat = std("#9b7443", { flatShading: true }), bladMat = std("#3f9d3a", { flatShading: true, side: THREE.DoubleSide });
    const bøj = rnd(0.25, 0.55);
    let tx = 0, ty = 0;
    for (let i = 0; i < 6; i++) {                        // stammen krummer lidt
      const k = i / 6, seg = mesh(new THREE.CylinderGeometry(0.26 - k * 0.1, 0.3 - k * 0.1, h / 6 + 0.05, 7), stammeMat, tx, ty + h / 12, 0);
      seg.rotation.z = -bøj * k * 0.6;
      p.add(seg);
      tx += Math.sin(bøj * k * 0.6) * h / 6; ty += Math.cos(bøj * k * 0.6) * h / 6;
    }
    const krone = new THREE.Group(); krone.position.set(tx, ty, 0); p.add(krone);
    for (let i = 0; i < 7; i++) {
      const arm = new THREE.Group(); arm.rotation.y = i / 7 * Math.PI * 2 + rnd(-0.2, 0.2); krone.add(arm);
      const blad = mesh(new THREE.ConeGeometry(0.5, h * 0.55, 4), bladMat, h * 0.24, -0.35, 0);
      blad.scale.z = 0.22; blad.rotation.z = -1.9; arm.add(blad);
    }
    for (let i = 0; i < 3; i++) krone.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), std("#6b4a2b"), Math.cos(i * 2.1) * 0.25, -0.25, Math.sin(i * 2.1) * 0.25));
    return p;
  }

  function fyrtårn(g, r) {
    const f = new THREE.Group(); f.position.set(-r * 0.2, r * 0.14, 0); g.add(f);
    const H = 16, N = 8;
    for (let i = 0; i < N; i++) {                        // røde og hvide striber
      const r0 = 2 - (i / N) * 0.7, r1 = 2 - ((i + 1) / N) * 0.7;
      f.add(mesh(new THREE.CylinderGeometry(r1, r0, H / N, 16), std(i % 2 ? "#ffffff" : "#e63946", { roughness: 0.6 }), 0, H / N * (i + 0.5), 0));
    }
    f.add(mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 16), std("#26262e"), 0, H + 0.15, 0));
    f.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.7, 12), new THREE.MeshStandardMaterial({ color: "#fff3a0", emissive: "#ffd84d", emissiveIntensity: 1.2 }), 0, H + 1.15, 0));
    f.add(mesh(new THREE.ConeGeometry(1.45, 1.5, 12), std("#e63946", { roughness: 0.5 }), 0, H + 2.75, 0));
    f.add(mesh(new THREE.SphereGeometry(0.25, 8, 6), std("#26262e"), 0, H + 3.6, 0));
    // lyskeglen, der drejer rundt
    const kegle = new THREE.ConeGeometry(3.2, 46, 20, 1, true); kegle.translate(0, -23, 0); kegle.rotateZ(Math.PI / 2);
    const lys = new THREE.Group(); lys.position.set(0, H + 1.15, 0); f.add(lys);
    lys.add(new THREE.Mesh(kegle, new THREE.MeshBasicMaterial({ color: "#fff2a0", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    opd.push((t, dt) => { lys.rotation.y += dt * 0.8; });
  }

  function sejlbåd(farve) {
    const g = new THREE.Group(), hvid = std("#ffffff", { roughness: 0.5 });
    const skrog = mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), hvid); skrog.scale.set(2.6, 0.8, 0.95); g.add(skrog);
    const dæk = mesh(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), std("#b5835a")); dæk.scale.set(2.6, 1, 0.95); g.add(dæk);
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 7, 6), std("#8a6a4a"), 0.3, 3.5, 0));
    const stor = new THREE.Shape(); stor.moveTo(0, 0.7); stor.lineTo(0, 6.8); stor.lineTo(-2.6, 0.7); stor.closePath();
    const sejl = mesh(new THREE.ShapeGeometry(stor), std("#fdfdfd", { side: THREE.DoubleSide, roughness: 0.7 }), 0.3, 0, 0); g.add(sejl);
    const lille = new THREE.Shape(); lille.moveTo(0, 0.7); lille.lineTo(0, 6); lille.lineTo(2.1, 0.7); lille.closePath();
    g.add(mesh(new THREE.ShapeGeometry(lille), std(farve, { side: THREE.DoubleSide, roughness: 0.7 }), 0.3, 0, 0));
    return g;
  }

  function byggMåge(sidder) {
    const g = new THREE.Group(), hvid = std("#ffffff", { roughness: 0.6 }), grå = std("#b8c2cc", { roughness: 0.6 }), sort = std("#1b1b24");
    const krop = mesh(new THREE.SphereGeometry(1, 16, 10), hvid); krop.scale.set(0.36, 0.2, 0.2); g.add(krop);
    g.add(mesh(new THREE.SphereGeometry(0.14, 12, 10), hvid, 0.3, 0.14, 0));
    const næb = mesh(new THREE.ConeGeometry(0.035, 0.18, 8), std("#ffc83d"), 0.5, 0.12, 0); næb.rotation.z = -Math.PI / 2; g.add(næb);
    g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), std("#e63946"), 0.5, 0.1, 0));
    for (const side of [1, -1]) g.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), sort, 0.38, 0.19, side * 0.09));
    const hale = mesh(new THREE.ConeGeometry(0.1, 0.22, 4), hvid, -0.4, 0.02, 0); hale.rotation.z = Math.PI / 2; hale.scale.z = 0.35; g.add(hale);
    const vinger = [];
    for (const side of [1, -1]) {
      const v = new THREE.Group(); v.position.set(0.02, 0.08, side * 0.14); g.add(v);
      v.add(mesh(new THREE.BoxGeometry(0.34, 0.025, 0.5), grå, 0, 0, side * 0.24));
      v.add(mesh(new THREE.BoxGeometry(0.2, 0.026, 0.14), sort, -0.05, 0, side * 0.46));
      v.userData.side = side; vinger.push(v);
    }
    if (sidder) for (const side of [1, -1]) g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 5), std("#ff9f1c"), 0.02, -0.25, side * 0.07));
    return { g, vinger };
  }

  function byggDelfin() {
    const g = new THREE.Group(), hud = std("#6f8fae", { roughness: 0.35 }), mave = std("#dfe8f0", { roughness: 0.4 });
    const krop = mesh(new THREE.SphereGeometry(1, 20, 12), hud); krop.scale.set(1.25, 0.36, 0.36); g.add(krop);
    const bug = mesh(new THREE.SphereGeometry(1, 16, 10), mave, 0.1, -0.1, 0); bug.scale.set(1.0, 0.24, 0.3); g.add(bug);
    const snude = mesh(new THREE.ConeGeometry(0.12, 0.45, 10), hud, 1.35, -0.05, 0); snude.rotation.z = -Math.PI / 2; g.add(snude);
    const finne = mesh(new THREE.ConeGeometry(0.22, 0.5, 4), hud, -0.1, 0.42, 0); finne.scale.z = 0.25; finne.rotation.z = 0.5; g.add(finne);
    g.add(mesh(new THREE.BoxGeometry(0.28, 0.05, 0.85), hud, -1.3, 0, 0));
    for (const side of [1, -1]) g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), std("#111111"), 0.95, 0.08, side * 0.24));
    return g;
  }

  function byggHval() {
    const g = new THREE.Group(), hud = std("#2f4f75", { roughness: 0.5 }), mave = std("#dbe6f0", { roughness: 0.5 });
    const krop = mesh(new THREE.SphereGeometry(1, 26, 16), hud); krop.scale.set(6, 1.8, 2.2); g.add(krop);
    const bug = mesh(new THREE.SphereGeometry(1, 20, 12), mave, 0.5, -0.6, 0); bug.scale.set(5, 1.2, 1.8); g.add(bug);
    const finne = mesh(new THREE.ConeGeometry(0.6, 1.2, 4), hud, -2.4, 1.75, 0); finne.scale.z = 0.3; finne.rotation.z = 0.6; g.add(finne);
    for (const side of [1, -1]) g.add(mesh(new THREE.SphereGeometry(0.18, 10, 8), std("#111111"), 4.4, 0.3, side * 1.55));
    const hale = new THREE.Group(); hale.position.set(-5.6, 0, 0); g.add(hale);
    hale.add(mesh(new THREE.CylinderGeometry(0.5, 0.9, 1.6, 10), hud, -0.6, 0, 0)).children[0].rotation.z = Math.PI / 2;
    for (const side of [1, -1]) {
      const flig = mesh(new THREE.SphereGeometry(1, 14, 8), hud, -1.6, 0, side * 1.2); flig.scale.set(1.1, 0.18, 1.4); flig.rotation.y = side * 0.5;
      hale.add(flig);
    }
    g.scale.setScalar(1.5);
    return { g, hale };
  }

  // Båden: blå med en træ-kant, bænke, årer, redningskrans, en lille vimpel — og spanden
  function byggBåd() {
    const b = new THREE.Group();
    const pkt = [[-0.72, -2.0], [-0.86, -1.2], [-0.9, 0], [-0.8, 1.2], [-0.5, 2.0], [0, 2.65], [0.5, 2.0], [0.8, 1.2], [0.9, 0], [0.86, -1.2], [0.72, -2.0]];
    const omrids = new THREE.CatmullRomCurve3(pkt.map(([x, y]) => V(x, y, 0)), true).getPoints(56).slice(0, -1).map(p => new THREE.Vector2(p.x, p.y));
    const indre = omrids.map(p => new THREE.Vector2(p.x * 0.88, p.y * 0.94 - 0.02));
    const skal = new THREE.Shape(omrids); skal.holes.push(new THREE.Path(indre));
    const væg = new THREE.Mesh(new THREE.ExtrudeGeometry(skal, { depth: 0.62, bevelEnabled: false }).rotateX(-Math.PI / 2),
      [std("#c8955a", { roughness: 0.7 }), std("#2a7fd4", { roughness: 0.5 })]);
    væg.position.y = -0.12; b.add(væg);
    const stribe = new THREE.Shape(omrids.map(p => p.clone().multiplyScalar(1.014))); stribe.holes.push(new THREE.Path(omrids));
    b.add(mesh(new THREE.ExtrudeGeometry(stribe, { depth: 0.08, bevelEnabled: false }).rotateX(-Math.PI / 2), std("#ffffff", { roughness: 0.5 }), 0, 0.26, 0));
    const træ = std("#b07a45", { roughness: 0.8 }), mørk = std("#8a5a30", { roughness: 0.8 });
    b.add(mesh(new THREE.ExtrudeGeometry(new THREE.Shape(indre), { depth: 0.04, bevelEnabled: false }).rotateX(-Math.PI / 2), træ, 0, 0.1, 0));
    for (const x of [-0.45, -0.15, 0.15, 0.45]) b.add(mesh(new THREE.BoxGeometry(0.02, 0.01, 3.6), mørk, x, 0.145, 0.2));
    b.add(mesh(new THREE.BoxGeometry(1.62, 0.07, 0.36), træ, 0, 0.36, -0.95));        // bænke
    b.add(mesh(new THREE.BoxGeometry(1.5, 0.07, 0.36), træ, 0, 0.36, 1.2));
    for (const side of [1, -1]) {                        // årerne ligger langs siderne
      const åre = new THREE.Group(); åre.position.set(side * 0.64, 0.44, -1.0); åre.rotation.set(0.04, 0, side * 0.15);
      const skaft = mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.5, 6), træ); skaft.rotation.x = Math.PI / 2; åre.add(skaft);
      åre.add(mesh(new THREE.BoxGeometry(0.02, 0.16, 0.4), træ, 0, 0, -0.9));
      b.add(åre);
    }
    const krans = new THREE.Group(); krans.position.set(0.5, 0.42, -1.75); krans.rotation.set(-1.1, 0.4, 0); b.add(krans);
    for (let i = 0; i < 4; i++) {
      const bue = mesh(new THREE.TorusGeometry(0.2, 0.065, 8, 8, Math.PI / 2), std(i % 2 ? "#ffffff" : "#e63946", { roughness: 0.5 }));
      bue.rotation.z = i * Math.PI / 2; krans.add(bue);
    }
    b.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 5), std("#8a6a4a"), 0, 0.6, -2.42));    // vimpel
    const vf = new THREE.Shape(); vf.moveTo(0, 0); vf.lineTo(0, 0.26); vf.lineTo(0.5, 0.13); vf.closePath();
    const vimpel = mesh(new THREE.ShapeGeometry(vf), std("#e63946", { side: THREE.DoubleSide }), 0, 0.6, -2.42);
    b.add(vimpel);
    opd.push(t => { vimpel.rotation.y = 0.35 + Math.sin(t * 7) * 0.25; });           // vimplen blafrer i vinden
    spand.position.set(-0.5, 0.31, -1.45); b.add(spand);
    kasse.position.set(0.42, 0.52, -0.95); kasse.rotation.y = 0.2; kasse.scale.setScalar(0.85); b.add(kasse);
    return b;
  }

  // ---------- båden (og kameraet) vugger på bølgerne ----------
  function vugge(t) {
    if (!HAV) return { y: Math.sin(t * 0.8) * 0.015, rx: 0, rz: Math.sin(t * 0.5) * 0.004 };
    const bz = 3.9, y = bølge(0, bz, t);
    const rx = Math.atan((bølge(0, bz - 1.6, t) - bølge(0, bz + 1.6, t)) / 3.2);
    const rz = -Math.atan((bølge(-0.8, bz, t) - bølge(0.8, bz, t)) / 1.6);
    return { y, rx, rz };
  }
  if (båd) opd.push(t => {
    const v = vugge(t);
    båd.position.y = v.y; båd.rotation.set(v.rx, 0, v.rz);
    båd.updateMatrixWorld(true);
    spand.getWorldPosition(spandPos); spandPos.y += 0.17;
  });

  // ---------- sejl videre (havet): øerne glider forbi, og vandet sprøjter om båden ----------
  const SEJL = 4.2;
  let sejlT = -1;
  function sejl() {
    if (!HAV || sejlT >= 0) return false;
    sejlT = 0; lyd("motor", SEJL);
    return true;
  }
  opd.push((t, dt) => {
    if (sejlT < 0) return;
    sejlT += dt;
    const fart = Math.sin(Math.min(1, sejlT / SEJL) * Math.PI) * 12;
    forskyd += fart * dt;
    for (const bx of [-0.8, 0.8]) if (Math.random() < dt * 30) dråber(V(bx, bølge(bx, 1.4, t) + 0.1, 1.4), 3, 2 + fart * 0.18);
    if (Math.random() < dt * 10) ring(V(rnd(-1.2, 1.2), 0, rnd(0, 1.5)), 0.7);
    if (sejlT >= SEJL) sejlT = -1;
  });

  return {
    opdater(t, dt) { tNu = t; for (const f of opd) f(t, dt); },
    bølge, plask, dråber, ring, bobler, klikbare, spandPos, spandFisk, kamera, vugge, sejl,
    get sejler() { return sejlT >= 0; },
    omgivelser: () => envScene,
  };
}
