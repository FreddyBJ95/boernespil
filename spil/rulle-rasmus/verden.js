// ===== Verdenen omkring banen =====
// Himlen med sol (og stjerner på Regnbuen), lyset og skyggerne, vandet under banen (eller et skyhav),
// pynten langs banen, bjerge og øer langt væk, og det, der flyver i luften (pollen, sne, sommerfugle …).

import * as THREE from "./three.js";
import { Samler } from "./bane.js";
import { Partikler } from "./partikler.js";
import * as T from "./teksturer.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const farve = f => new THREE.Color(f);

// ---------- Himlen: en farveovergang med sol (tegnes på grafikkortet) ----------
function lavHimmel(h) {
  const uni = {
    uTop: { value: farve(h.top) }, uHor: { value: farve(h.horisont) }, uBund: { value: farve(h.bund) },
    uSol: { value: V(...h.sol).normalize() }, uSolFarve: { value: farve(h.solFarve) },
    uStjerner: { value: h.stjerner || 0 }, uTid: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `
      varying vec3 vRet;
      void main() {
        vRet = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w * 0.9999;
      }`,
    fragmentShader: `
      uniform vec3 uTop, uHor, uBund, uSol, uSolFarve; uniform float uStjerner, uTid;
      varying vec3 vRet;
      float hashH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vRet);
        float h = d.y;
        vec3 c = h > 0.0 ? mix(uHor, uTop, pow(h, 0.5)) : mix(uHor, uBund, pow(min(1.0, -h * 3.0), 0.6));
        float s = max(dot(d, uSol), 0.0);
        c += uSolFarve * (pow(s, 1200.0) * 8.0 + pow(s, 90.0) * 0.45 + pow(s, 8.0) * 0.15);
        if (uStjerner > 0.0 && h > 0.05) {
          vec3 q = d * 150.0, id = floor(q);
          float r = hashH(id);
          if (r > 0.985) {
            float glimt = 0.55 + 0.45 * sin(uTid * (1.5 + r * 3.0) + r * 100.0);
            c += vec3(1.0, 0.95, 0.9) * smoothstep(0.35, 0.0, length(fract(q) - 0.5)) * glimt * uStjerner * smoothstep(0.05, 0.5, h) * 1.5;
          }
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return { mesh: m, uni };
}

// ---------- Vandet: blankt, med bølger der glimter i solen ----------
function lavVand(u, cx, cz, bund) {
  const uni = { uTid: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({
    color: u.farve, roughness: u.ruhed ?? 0.05, metalness: 0, envMapIntensity: 1.25,
    emissive: u.farve, emissiveIntensity: u.mælk ? 0.18 : 0.12,
  });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vVerden;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvVerden = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTid;\nvarying vec3 vVerden;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{
  vec2 p = vVerden.xz; float t = uTid; vec2 g = vec2(0.0);
  g += 1.00 * vec2(0.8, 0.6)   * cos(dot(vec2(0.8, 0.6), p) * 0.55 + t * 1.1);
  g += 0.70 * vec2(-0.5, 0.86) * cos(dot(vec2(-0.5, 0.86), p) * 1.1 + t * 1.6);
  g += 0.45 * vec2(0.3, -0.95) * cos(dot(vec2(0.3, -0.95), p) * 2.3 + t * 2.3);
  g += 0.30 * vec2(-0.9, -0.4) * cos(dot(vec2(-0.9, -0.4), p) * 4.1 + t * 3.1);
  g += 0.18 * vec2(0.6, -0.8)  * cos(dot(vec2(0.6, -0.8), p) * 7.3 + t * 4.2);
  g += 0.10 * vec2(-0.2, 0.98) * cos(dot(vec2(-0.2, 0.98), p) * 12.7 + t * 5.5);
  float fjern = clamp(length(vVerden.xz - cameraPosition.xz) / 220.0, 0.0, 1.0);
  g *= 0.11 * (1.0 - fjern * 0.85);
  normal = normalize((viewMatrix * vec4(normalize(vec3(-g.x, 1.0, -g.y)), 0.0)).xyz);
}`);
  };
  mat.customProgramCacheKey = () => "vand";
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2), mat);
  m.position.set(cx, bund, cz);
  return { mesh: m, uni };
}

// ---------- Skyhavet under Regnbuen ----------
function lavSkyhav(gruppe, cx, cz, bund, r) {
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#f3ecff", emissive: "#e8dcff", emissiveIntensity: 0.55, roughness: 1 }));
  plan.position.set(cx, bund - 3, cz);
  gruppe.add(plan);
  const tekster = [T.skyklat(71), T.skyklat(72), T.skyklat(73)];
  const mats = tekster.map(t => new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, color: "#ffffff" }));
  const skyer = [];
  for (let i = 0; i < 170; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * 260, s = 18 + r() * 30;
    const sp = new THREE.Sprite(mats[i % 3]);
    sp.position.set(cx + Math.cos(a) * d, bund - 1 + r() * 4, cz + Math.sin(a) * d);
    sp.scale.set(s, s * 0.62, 1);
    gruppe.add(sp); skyer.push(sp);
  }
  return skyer;
}

// ---------- Sommerfugle ----------
function vingeTekstur(f1, f2) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d");
  x.fillStyle = f1;
  x.beginPath(); x.ellipse(36, 22, 26, 20, -0.4, 0, 7); x.fill();
  x.beginPath(); x.ellipse(30, 46, 16, 14, 0.4, 0, 7); x.fill();
  x.fillStyle = f2;
  x.beginPath(); x.arc(42, 20, 7, 0, 7); x.fill();
  x.beginPath(); x.arc(30, 48, 5, 0, 7); x.fill();
  x.strokeStyle = "rgba(0,0,0,.6)"; x.lineWidth = 3;
  x.beginPath(); x.ellipse(36, 22, 26, 20, -0.4, 0, 7); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function lavSommerfugle(gruppe, antal, farver) {
  const liste = [];
  for (let i = 0; i < antal; i++) {
    const [f1, f2] = farver[i % farver.length];
    const mat = new THREE.MeshBasicMaterial({ map: vingeTekstur(f1, f2), transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: true });
    const g = new THREE.Group(), vinger = [];
    for (const s of [-1, 1]) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22).translate(0.11, 0, 0), mat);
      v.rotation.x = -Math.PI / 2; v.scale.x = s;
      const hængsel = new THREE.Group(); hængsel.add(v); g.add(hængsel); vinger.push(hængsel);
    }
    g.userData = { vinger, fase: Math.random() * 10, a: Math.random() * 6.28, r: 5 + Math.random() * 9, h: 0.6 + Math.random() * 2.2 };
    gruppe.add(g); liste.push(g);
  }
  return liste;
}

// ---------- Luftballoner og store stjerner (Regnbuen) ----------
function stribeTekstur(farver) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 8;
  const x = c.getContext("2d"), n = farver.length * 2;
  for (let i = 0; i < n; i++) { x.fillStyle = farver[i % farver.length]; x.fillRect(i * 256 / n, 0, 256 / n + 1, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function lavLuftballon(farver) {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, y = -1.4 + t * 3.4;
    const rr = t < 0.25 ? 0.35 + t * 2.6 : Math.sin(Math.acos(Math.min(1, (y - 0.55) / 1.45))) * 1.5;
    pts.push(new THREE.Vector2(Math.max(0.02, rr), y));
  }
  const ballon = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshPhysicalMaterial({ map: stribeTekstur(farver), roughness: 0.45, clearcoat: 0.4 }));
  const kurv = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.4, 12), new THREE.MeshStandardMaterial({ color: "#8a5a2b", roughness: 0.9 }));
  kurv.position.y = -2.1;
  g.add(ballon, kurv);
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * 6.28 + 0.78, reb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), new THREE.MeshBasicMaterial({ color: "#5a4030" }));
    reb.position.set(Math.cos(a) * 0.3, -1.65, Math.sin(a) * 0.3);
    g.add(reb);
  }
  return g;
}
function stjerneGeo(r = 1, tyk = 0.35) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: tyk, bevelEnabled: true, bevelThickness: tyk * 0.4, bevelSize: r * 0.12, bevelSegments: 3 });
  g.center();
  return g;
}
export { stjerneGeo };

// ---------- Hele verdenen ----------
export function byggVerden(scene, renderer, bane, tema) {
  const gruppe = new THREE.Group(), P = bane.P, opd = [], r = T.frø(bane.def.frø ?? 7);
  scene.add(gruppe);

  // hvor ligger banen? (midten og den laveste højde)
  let minY = Infinity, cx = 0, cz = 0;
  for (const p of P) { minY = Math.min(minY, p.y); cx += p.x; cz += p.z; }
  cx /= P.length; cz /= P.length;
  const bund = minY + tema.under.y;

  // himmel, tåge og omgivelser til spejlinger
  const himmel = lavHimmel(tema.himmel);
  gruppe.add(himmel.mesh);
  scene.fog = new THREE.Fog(tema.himmel.horisont, tema.tåge[0], tema.tåge[1]);
  scene.background = new THREE.Color(tema.himmel.horisont);
  const envScene = new THREE.Scene(), envHimmel = lavHimmel(tema.himmel);
  envScene.add(envHimmel.mesh);
  const envBund = new THREE.Mesh(new THREE.CircleGeometry(800, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(tema.under.type === "vand" ? tema.under.farve : "#f3ecff").lerp(new THREE.Color("#c9bfae"), 0.7) }));
  envBund.position.y = -60;
  envScene.add(envBund);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.02, 0.1, 2000).texture;
  pmrem.dispose();
  envHimmel.mesh.geometry.dispose(); envHimmel.mesh.material.dispose(); envBund.geometry.dispose(); envBund.material.dispose();
  scene.environment = env;

  // lys: himmellys og sol med skygger, der følger Rasmus
  const [hs, hb, hi] = tema.hemi;
  gruppe.add(new THREE.HemisphereLight(hs, hb, hi));
  const solRet = V(...tema.himmel.sol).normalize();
  const sol = new THREE.DirectionalLight(tema.sollys[0], tema.sollys[1]);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 140 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.035;
  gruppe.add(sol, sol.target);

  // under banen: vand eller skyer
  let vand = null, skyer = null;
  if (tema.under.type === "vand") { vand = lavVand(tema.under, cx, cz, bund); gruppe.add(vand.mesh); }
  else skyer = lavSkyhav(gruppe, cx, cz, bund, r);

  // pynt langs banen (samles til få store figurer, så iPad'en kan følge med)
  const S = new Samler();
  const forTæt = (x, z, luft) => {
    for (let i = 0; i < P.length; i += 3) {
      const p = P[i], m = p.w / 2 + luft;
      if ((p.x - x) ** 2 + (p.z - z) ** 2 < m * m) return true;
    }
    return false;
  };
  for (let i = 12; i < P.length - 12;) {
    const p = P[i], side = r() < 0.5 ? -1 : 1, af = p.w / 2 + (tema.pyntAfstand ?? 3.5) + r() * 7;
    const x = p.x + p.rx * side * af, z = p.z + p.rz * side * af;
    if (!forTæt(x, z, (tema.pyntAfstand ?? 3.5) + 1)) tema.pynt[Math.floor(r() * tema.pynt.length)](S, x, bund, z, p.y, r);
    i += Math.round((5 + r() * 6) / 0.25);
  }
  tema.fjernt(S, cx, cz, bund, r);
  S.byg(gruppe, false);

  // det, der flyver i luften
  const luft = new Partikler(scene, {
    maks: 260, tekstur: tema.luft === "glimmer" ? T.glimt() : T.prik(), additiv: tema.luft === "glimmer",
  });
  let luftT = 0;
  const sommerfugle = tema.luft === "sommerfugle" || tema.luft === "pollen"
    ? lavSommerfugle(gruppe, tema.luft === "pollen" ? 7 : 10, tema.luft === "pollen"
      ? [["#ffb61f", "#ffffff"], ["#ffffff", "#ffd23f"], ["#ff8cc6", "#ffffff"], ["#8fd0ff", "#ffffff"]]
      : [["#1e7bff", "#bfe3ff"], ["#ff3d7f", "#ffe14d"], ["#ffb61f", "#1a1a1a"], ["#7dffcf", "#1e7bff"]])
    : [];
  opd.push((t, dt, fokus) => {
    luftT += dt;
    const rate = { pollen: 10, sne: 55, bobler: 6, sommerfugle: 4, glimmer: 16 }[tema.luft] || 0;
    while (luftT > 1 / rate) {
      luftT -= 1 / rate;
      const a = Math.random() * 6.28, d = 3 + Math.random() * 22, x = fokus.x + Math.cos(a) * d, z = fokus.z + Math.sin(a) * d;
      if (tema.luft === "sne") luft.udsend({ x, y: fokus.y + 6 + Math.random() * 8, z, vx: 0.4, vy: -1.1, vz: 0.2, liv: 9, str: 0.09, farve: "#ffffff", alfa: 0.95, ind: 0.5 });
      else if (tema.luft === "bobler") luft.udsend({ x, y: fokus.y - 4 - Math.random() * 4, z, vy: 1.1, vx: 0.2, liv: 9, str: 0.35 + Math.random() * 0.4, farve: ["#ffd6f0", "#d6f3ff", "#fff6c8"][Math.floor(Math.random() * 3)], alfa: 0.4, ind: 1 });
      else if (tema.luft === "glimmer") luft.udsend({ x, y: fokus.y - 2 + Math.random() * 8, z, liv: 2.5, str: 0.35, strSlut: 0.05, farve: ["#ffffff", "#ffe07a", "#ffb8e6", "#b8d8ff"][Math.floor(Math.random() * 4)], ind: 0.8 });
      else luft.udsend({ x, y: fokus.y + Math.random() * 5, z, vx: 0.5, vy: 0.15, vz: 0.2, liv: 8, str: 0.07, farve: "#fffdf0", alfa: 0.9, ind: 1, modstand: 0 });
    }
    luft.opdater(dt);
    for (const s of sommerfugle) {
      const u = s.userData;
      u.a += dt * 0.35;
      s.position.set(fokus.x + Math.cos(u.a + u.fase) * u.r, fokus.y + u.h + Math.sin(t * 1.3 + u.fase) * 0.6, fokus.z + Math.sin(u.a * 1.3 + u.fase) * u.r);
      s.rotation.y = -u.a + Math.PI;
      const slag = Math.sin(t * 18 + u.fase) * 1.1;
      u.vinger[0].rotation.z = slag; u.vinger[1].rotation.z = -slag;
    }
  });

  // Regnbuen: luftballoner og store gyldne stjerner, der svæver rundt
  if (tema.flyvende) {
    const guld = new THREE.MeshStandardMaterial({ color: "#ffd24a", metalness: 1, roughness: 0.25, emissive: "#ffb000", emissiveIntensity: 0.5 });
    const sg = stjerneGeo(1.4, 0.4), flyv = [];
    for (let k = 0; k < 16; k++) {
      const p = P[Math.floor(r() * P.length)], side = r() < 0.5 ? -1 : 1, af = p.w / 2 + 6 + r() * 14;
      const x = p.x + p.rx * side * af, z = p.z + p.rz * side * af;
      const ting = k % 2 ? lavLuftballon(tema.balloner.slice(k % 3, k % 3 + 3)) : new THREE.Mesh(sg, guld);
      ting.position.set(x, p.y + 2 + r() * 8, z);
      if (k % 2) ting.scale.setScalar(1.4 + r());
      ting.userData = { y: ting.position.y, fase: r() * 6 };
      gruppe.add(ting); flyv.push(ting);
    }
    opd.push(t => { for (const f of flyv) { f.position.y = f.userData.y + Math.sin(t * 0.6 + f.userData.fase) * 1.2; if (f.isMesh) f.rotation.y = t * 0.8 + f.userData.fase; } });
    const måne = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 20), new THREE.MeshStandardMaterial({ color: "#fff4d8", emissive: "#fff0c8", emissiveIntensity: 0.8, roughness: 1, fog: false }));
    måne.position.set(cx - 300, bund + 260, cz - 520);
    gruppe.add(måne);
  }

  opd.push((t, dt, fokus, kamPos) => {
    himmel.mesh.position.copy(kamPos);
    himmel.uni.uTid.value = t;
    if (vand) vand.uni.uTid.value = t;
    if (skyer) for (const s of skyer) { s.position.x += dt * 0.6; if (s.position.x > cx + 260) s.position.x -= 520; }
    // solen og skyggerne følger Rasmus (rundet af, så skyggerne ikke flimrer)
    const gx = Math.round(fokus.x * 4) / 4, gy = Math.round(fokus.y * 4) / 4, gz = Math.round(fokus.z * 4) / 4;
    sol.target.position.set(gx, gy, gz);
    sol.position.set(gx + solRet.x * 60, gy + solRet.y * 60, gz + solRet.z * 60);
  });

  return {
    gruppe, bund, sol,
    opdater(t, dt, fokus, kamPos) { for (const f of opd) f(t, dt, fokus, kamPos); },
    fjern() {
      scene.remove(gruppe);
      scene.remove(luft.punkter);
      luft.punkter.geometry.dispose(); luft.punkter.material.dispose();
      gruppe.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && !o.isSprite) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      env.dispose();
      scene.environment = null;
    },
  };
}
