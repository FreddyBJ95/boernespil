// ===== Fælles pynt til Kuglebanen =====
// Materialer, teksturer tegnet med kode, himmel, lys, glaskuglen, ansigter, skyer, balloner, målporte
// og de ting man samler (banan, jordbær, karamel).
import * as THREE from "./three.js";
import { rundKasse, smelt } from "./former.js";
import { R } from "./fysik.js";

// Fast tilfældighed, så verdenerne ser ens ud hver gang
let frø = 12345;
export const sætFrø = f => { frø = f; };
export const tilf = (a = 0, b = 1) => { frø = (frø * 16807) % 2147483647; return a + (frø / 2147483647) * (b - a); };
export const vælg = liste => liste[Math.floor(tilf(0, liste.length - 1e-9))];

export const kG = new THREE.SphereGeometry(1, 36, 24);     // til figurerne
export const kGlav = new THREE.SphereGeometry(1, 18, 12);  // til pynt langt væk
export const kap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 16);

// ---------- Materialer ----------
// husk: samme materiale genbruges, så mange ting kan tegnes på én gang
const MC = new Map();
export const husk = (nøgle, lav) => { if (!MC.has(nøgle)) MC.set(nøgle, lav()); return MC.get(nøgle); };
export const std = (farve, ru = 0.6, ex = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: ru, ...ex });
export const blank = (farve, ex = {}) => new THREE.MeshPhysicalMaterial({ color: farve, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, ...ex });
export const pels = (farve, ex = {}) => new THREE.MeshPhysicalMaterial({
  color: farve, roughness: 0.85, sheen: 1, sheenRoughness: 0.45,
  sheenColor: new THREE.Color(farve).lerp(new THREE.Color("#ffffff"), 0.55), ...ex,
});

// Læg en del ind i en gruppe
export function del(f, geo, mat, p = [0, 0, 0], s = 1, r = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  if (typeof s === "number") m.scale.setScalar(s); else m.scale.set(...s);
  m.rotation.set(...r);
  m.castShadow = m.receiveShadow = true;
  f.add(m);
  return m;
}
// En tynd stang mellem to punkter
export function pind(f, a, b, r, mat, seg = 10) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, A.distanceTo(B), seg), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = true;
  f.add(m);
  return m;
}

// ---------- Teksturer ----------
const cache = new Map();
export function tekstur(b, h, tegn, { gentag = true, farve = true, nøgle = null } = {}) {
  if (nøgle && cache.has(nøgle)) return cache.get(nøgle);
  const cv = document.createElement("canvas"); cv.width = b; cv.height = h;
  tegn(cv.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(cv);
  if (farve) t.colorSpace = THREE.SRGBColorSpace;
  if (gentag) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (nøgle) cache.set(nøgle, t);
  return t;
}

export function ternet(a, b, fuge = "rgba(30,60,10,0.22)", n = 2) {
  return tekstur(256, 256, (g, w, h) => {
    const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? b : a; g.fillRect(i * s, j * s, s, s);
      const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
      gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(0,0,0,0.07)");
      g.fillStyle = gr; g.fillRect(i * s + 4, j * s + 4, s - 8, s - 8);
    }
    g.strokeStyle = fuge; g.lineWidth = 5;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  }, { nøgle: `ternet${a}${b}${n}` });
}

export function striber(farver, b = 256, h = 64, skrå = 0) {
  return tekstur(b, h, (g, w, hh) => {
    const n = 8, s = w / n;
    for (let i = -2; i < n + 2; i++) {
      g.fillStyle = farver[(i + 20) % farver.length];
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s + s, 0); g.lineTo(i * s + s + skrå, hh); g.lineTo(i * s + skrå, hh); g.fill();
    }
  });
}

export function tekstTex(tekst, { bg = "#ff4d4d", farve = "#ffffff", b = 768, h = 256, str = 190 } = {}) {
  return tekstur(b, h, (g, w, hh) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, hh);
    const gr = g.createLinearGradient(0, 0, 0, hh);
    gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.font = `800 ${str}px ui-rounded, "SF Pro Rounded", "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = 18; g.strokeStyle = "rgba(0,0,0,0.16)";
    g.strokeText(tekst, w / 2, hh / 2 + str * 0.06);
    g.fillStyle = farve; g.fillText(tekst, w / 2, hh / 2 + str * 0.06);
  }, { gentag: false });
}

export function skyggeTex() {
  return tekstur(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(0.4, "rgba(0,0,0,0.38)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { gentag: false, nøgle: "skygge" });
}

// Verdens-UV: fliser og planker passer sammen hen over banen
export function planarUV(geo, top = 1, side = top) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / top, -p.getZ(i) / top);
    else if (ax >= az) uv.setXY(i, p.getZ(i) / side, p.getY(i) / side);
    else uv.setXY(i, p.getX(i) / side, p.getY(i) / side);
  }
  uv.needsUpdate = true;
  return geo;
}
// Samme, men i pladens egne retninger (til planker og fliser, der skal følge rampens retning)
export function lokalUV(geo, top = 1, side = top) {
  return planarUV(geo, top, side);
}

// Ru klippe: flyt hjørnerne lidt, men ens for hjørner der deler plads
export function ruJitter(geo, styrke) {
  const p = geo.attributes.position;
  geo.computeBoundingBox();
  const ymax = geo.boundingBox.max.y;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (Math.abs(y - ymax) < 1e-4) continue;
    const h = n => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + n) * 43758.5453; return s - Math.floor(s) - 0.5; };
    p.setXYZ(i, x + h(1) * styrke * 2, y + h(2) * styrke, z + h(3) * styrke * 2);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- Himmel, miljø og lys ----------
export function himmelMat({ top, horisont, bund, sol, solFarve = "#fff4d6", solStyrke = 0 }) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      cTop: { value: new THREE.Color(top) }, cHor: { value: new THREE.Color(horisont) }, cBund: { value: new THREE.Color(bund) },
      sol: { value: (sol ? new THREE.Vector3(...sol) : new THREE.Vector3(0, 1, 0)).normalize() },
      solFarve: { value: new THREE.Color(solFarve).multiplyScalar(solStyrke) },
    },
    vertexShader: `varying vec3 vP;
      void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 cTop, cHor, cBund, sol, solFarve; varying vec3 vP;
      void main() {
        vec3 d = normalize(vP); float h = d.y;
        vec3 c = h > 0.0 ? mix(cHor, cTop, pow(h, 0.55)) : mix(cHor, cBund, pow(min(-h * 5.0, 1.0), 0.6));
        float s = max(dot(d, sol), 0.0);
        c += solFarve * (pow(s, 900.0) * 6.0 + pow(s, 40.0) * 0.45 + pow(s, 6.0) * 0.18);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
// Himlen følger kameraet, så den altid er langt væk
export function himmel(scene, p) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), himmelMat(p));
  m.renderOrder = -10; m.frustumCulled = false;
  m.onBeforeRender = (r, s, kam) => m.position.copy(kam.position);
  scene.add(m);
  return m;
}

// Refleksioner: himlen (eller et lyst rum) + lyse felter, så glaskuglen får fine glimt
export function miljø(renderer, himmelP) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  if (himmelP) s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), himmelMat(himmelP)));
  else {
    const rum = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 40), new THREE.MeshBasicMaterial({ color: "#d8c8b4", side: THREE.BackSide }));
    rum.position.y = 6; s.add(rum);
    const gulv = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: "#b08050" }));
    gulv.rotation.x = -Math.PI / 2; gulv.position.y = -1.9; s.add(gulv);
  }
  const felt = (x, y, z, b, h, st) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(st, st, st), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  felt(-14, 22, 14, 14, 8, himmelP ? 3 : 4);
  felt(22, 12, -8, 7, 9, himmelP ? 1.2 : 2);
  const t = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return t;
}

export function lys(scene, { farve = "#fff1d6", styrke = 3, himmel = "#cfe8ff", jord = "#6f6650", hs = 1 }) {
  scene.add(new THREE.HemisphereLight(himmel, jord, hs));
  const d = new THREE.DirectionalLight(farve, styrke);
  d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048);
  const s = d.shadow.camera;
  s.left = -15; s.right = 15; s.top = 15; s.bottom = -15; s.near = 1; s.far = 70;
  d.shadow.bias = -0.0005; d.shadow.normalBias = 0.03;
  scene.add(d, d.target);
  return d;
}

// ---------- Glaskuglen ----------
export function lavKugle({ tone = "#eef8ff", søm = "#4fb3ff", billig = false } = {}) {
  const g = new THREE.Group();
  const drej = new THREE.Group();                 // glas og søm ruller; dyret bliver stående oprejst
  g.add(drej);
  const glasMat = billig
    ? new THREE.MeshPhysicalMaterial({ color: tone, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.28, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.8, depthWrite: false })
    : new THREE.MeshPhysicalMaterial({ color: tone, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.08, ior: 1.22, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  const glas = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), glasMat);
  glas.renderOrder = 2;
  drej.add(glas);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 1.003, 0.017, 10, 120), blank(søm, { roughness: 0.25 }));
  ring.rotation.set(0.55, 0.2, 0.35);
  drej.add(ring);
  const sk = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.2, R * 3.2), new THREE.MeshBasicMaterial({ map: skyggeTex(), transparent: true, depthWrite: false, opacity: 0.55 }));
  sk.rotation.x = -Math.PI / 2;
  sk.renderOrder = 1;
  return { gruppe: g, drej, glas, skygge: sk };
}

// ---------- Ansigter ----------
export function øje(f, x, y, z, r) {
  del(f, kG, blank("#141018", { roughness: 0.08 }), [x, y, z], [r, r * 1.2, r * 0.75]);
  const glans = std("#ffffff", 0.3, { emissive: "#ffffff", emissiveIntensity: 0.9 });
  del(f, kG, glans, [x - r * 0.33, y + r * 0.45, z + r * 0.6], r * 0.32);
  del(f, kG, glans, [x + r * 0.3, y - r * 0.38, z + r * 0.64], r * 0.14);
}
export function smil(f, x, y, z, r, tyk = 0.009, farve = "#3a1d14", hæld = -0.25) {
  return del(f, new THREE.TorusGeometry(r, tyk, 8, 24, Math.PI * 0.75), std(farve, 0.4), [x, y, z], 1, [hæld, 0, Math.PI + Math.PI * 0.125]);
}

// ---------- Pynt ----------
export function sky(f, x, y, z, s = 1, farve = "#ffffff", farve2 = null) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); f.add(g);
  const m1 = husk("sky" + farve, () => std(farve, 1, { emissive: farve, emissiveIntensity: 0.32 }));
  const m2 = farve2 ? husk("sky" + farve2, () => std(farve2, 1, { emissive: farve2, emissiveIntensity: 0.32 })) : m1;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = i / (n - 1) - 0.5;
    const r = 1.15 - Math.abs(a) * 1.0 + tilf(0, 0.35);
    const k = new THREE.Mesh(kGlav, i % 3 === 1 ? m2 : m1);
    k.position.set(a * 4.4, r * 0.25 + tilf(-0.1, 0.25), tilf(-0.7, 0.7));
    k.scale.set(r * 1.25, r, r);
    g.add(k);
  }
  return g;
}

export function ballon(f, p, farve, til) {
  del(f, kGlav, blank(farve, { roughness: 0.12 }), p, [0.34, 0.41, 0.34]);
  del(f, new THREE.ConeGeometry(0.06, 0.09, 10), blank(farve), [p[0], p[1] - 0.44, p[2]], 1, [Math.PI, 0, 0]);
  pind(f, [p[0], p[1] - 0.48, p[2]], til, 0.006, std("#ffffff", 0.6), 4);
}

// Målbånd: ternet bånd der hænger lidt
export function målbånd(f, bredde, y, farver = ["#ffffff", "#262626"]) {
  const tern = tekstur(512, 64, (g, w, h) => {
    const n = 16;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = farver[(i + j) % 2]; g.fillRect(i * w / n, j * h / 2, w / n, h / 2); }
  }, { gentag: false });
  const bg = new THREE.PlaneGeometry(bredde, 0.22, 24, 1);
  const p = bg.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = p.getX(i) / (bredde / 2); p.setY(i, p.getY(i) - 0.1 * (1 - t * t)); }
  const m = new THREE.Mesh(bg, std("#ffffff", 0.6, { map: tern, side: THREE.DoubleSide }));
  m.position.y = y; m.castShadow = true;
  m.userData.levende = true;
  f.add(m);
  return m;
}

// Et skilt med tekst foran
export function skilt(f, tekst, bg, b, h, p) {
  const front = blank("#ffffff", { map: tekstTex(tekst, { bg }) }), kant = blank(bg);
  return del(f, rundKasse(b, h, 0.16, 0.06, 2), [kant, kant, kant, kant, front, kant], p);
}

// ---------- Ting man samler ----------
function bananGeo(stilk = false) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 12, 24, true);
  const p = g.attributes.position, farver = [];
  const L = 0.62, bøj = 1.5, rb = L / bøj;
  const gul = new THREE.Color("#ffd935"), grøn = new THREE.Color("#a6c43a"), brun = new THREE.Color("#5a3a1c");
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) + 0.5;
    let prof = Math.pow(Math.sin(Math.PI * t), 0.6) * 0.088 + 0.012;
    if (t > 0.88) prof = Math.max(prof, 0.026);
    const a = (t - 0.5) * bøj;
    const cx = rb * Math.sin(a), cy = rb * (1 - Math.cos(a));
    const nx = -Math.sin(a), ny = Math.cos(a);
    const kant = 1 + 0.06 * Math.cos(5 * Math.atan2(p.getZ(i), p.getX(i)));
    const lx = p.getX(i) * prof * kant, lz = p.getZ(i) * prof * kant;
    p.setXYZ(i, cx + nx * lx, cy + ny * lx, lz);
    const col = t > 0.88 ? grøn.clone().lerp(brun, (t - 0.88) / 0.12 * 0.7)
      : t < 0.05 ? brun.clone()
        : gul.clone().lerp(grøn, Math.max(0, (t - 0.72) / 0.16) * 0.45);
    farver.push(col.r, col.g, col.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(farver, 3));
  if (stilk) g.translate(-rb * Math.sin(bøj / 2), -rb * (1 - Math.cos(bøj / 2)), 0);
  else { g.computeBoundingBox(); const m = g.boundingBox.getCenter(new THREE.Vector3()); g.translate(-m.x, -m.y, -m.z); }
  g.computeVertexNormals();
  return g;
}
let _banan, _bananS, _bananM;
export function banan(stilk = false) {
  _banan ||= bananGeo(); _bananS ||= bananGeo(true);
  _bananM ||= blank("#ffffff", { vertexColors: true, roughness: 0.35, clearcoat: 0.5, emissive: "#3a2a00", emissiveIntensity: 0.3 });
  const m = new THREE.Mesh(stilk ? _bananS : _banan, _bananM);
  m.castShadow = true;
  return m;
}
export function bananKlase() {
  const g = new THREE.Group();
  const k = new THREE.Group(); k.rotation.z = -1.1; g.add(k);
  for (let i = 0; i < 4; i++) {
    const b = banan(true);
    b.rotation.set((i - 1.5) * 0.42, 0, 0.1 * Math.abs(i - 1.5));
    k.add(b);
  }
  del(k, new THREE.CylinderGeometry(0.03, 0.035, 0.12, 8), std("#6b4a22", 0.7), [0.03, 0.05, 0], 1, [0, 0, -0.5]);
  return g;
}

const JB = [[0, -0.22], [0.05, -0.2], [0.11, -0.14], [0.155, -0.05], [0.17, 0.03], [0.155, 0.09], [0.11, 0.13], [0.05, 0.15], [0, 0.15]];
const jbR = y => { for (let i = 1; i < JB.length; i++) if (y <= JB[i][1]) { const [r0, y0] = JB[i - 1], [r1, y1] = JB[i]; return r0 + (r1 - r0) * (y - y0) / ((y1 - y0) || 1); } return 0; };
let _jb;
export function jordbær() {
  if (!_jb) {
    const krop = new THREE.LatheGeometry(JB.map(([r, y]) => new THREE.Vector2(r, y)), 28);
    const frø = [], grønt = [];
    for (let i = 0; i < 46; i++) {
      const y = tilf(-0.17, 0.11), a = tilf(0, Math.PI * 2), r = jbR(y);
      frø.push(new THREE.SphereGeometry(0.011, 5, 4).scale(1, 1.6, 1).translate(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      grønt.push(kGlav.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.075, 0.15, Math.sin(a) * 0.075),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, -0.35)), new THREE.Vector3(0.085, 0.013, 0.035))));
    }
    grønt.push(new THREE.CylinderGeometry(0.013, 0.013, 0.11, 6).rotateZ(-0.1).translate(0.006, 0.195, 0));
    _jb = {
      krop, frø: smelt(frø), grønt: smelt(grønt),
      rødM: blank("#ff2b45", { roughness: 0.28, clearcoat: 0.8, emissive: "#400008", emissiveIntensity: 0.3 }),
      frøM: std("#ffe48a", 0.5), bladM: std("#3fae3a", 0.6, { side: THREE.DoubleSide }),
    };
  }
  const g = new THREE.Group();
  del(g, _jb.krop, _jb.rødM);
  g.add(new THREE.Mesh(_jb.frø, _jb.frøM));
  del(g, _jb.grønt, _jb.bladM);
  return g;
}

export function karamel(farve, farve2) {
  const g = new THREE.Group();
  const tex = striber([farve, farve2], 256, 64, 40); tex.repeat.set(2, 1);
  del(g, kG, blank("#ffffff", { map: tex, emissive: farve, emissiveIntensity: 0.12 }), [0, 0, 0], [0.21, 0.16, 0.16]);
  const indpak = blank(farve, { roughness: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    del(g, new THREE.ConeGeometry(0.13, 0.17, 12, 1, true), indpak, [s * 0.27, 0, 0], 1, [0, 0, s * Math.PI / 2]);
    del(g, kGlav, blank(farve), [s * 0.2, 0, 0], [0.03, 0.05, 0.05]);
  }
  return g;
}
