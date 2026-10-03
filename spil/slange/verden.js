// ===== Fjollet Slange — verdenerne: Haven, Stranden, Slikland og Rummet =====
// Hver verden har sine farver, sin kant rundt om legepladsen og sin pynt (træer, palmer, slikkepinde, krystaller …).
// Tilføj en ny verden: kopiér en blok i TEMAER og skriv en ny pynt-funktion nederst.

import * as THREE from "./three.js";
import { kopi, mange, tone } from "./modeller.js";

export const ARENA = 24;                                     // legepladsens radius — slangen bliver indenfor
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

export const TEMAER = [
  { id: "have", navn: "Haven", ikon: "🌷", himmel: ["#4aa8ff", "#dff3ff"], tåge: [42, 115], jord: ["#62bb45", "#8edb58", "#459a33"],
    rand: 0.28, vand: "#4fb4ff", sol: [1.25, "#fff4d6"], hemi: ["#ffffff", "#5a8a3a", 1.1], skyer: "#ffffff" },
  { id: "strand", navn: "Stranden", ikon: "🏖️", himmel: ["#2f9cff", "#e6f8ff"], tåge: [46, 125], jord: ["#f2d99a", "#fbe8b8", "#e0c482"],
    rand: -0.32, vand: "#1fb6d8", sol: [1.35, "#fff0c8"], hemi: ["#ffffff", "#c8a870", 1.1], skyer: "#ffffff" },
  { id: "slik", navn: "Slikland", ikon: "🍭", himmel: ["#ff82c8", "#ffe6f6"], tåge: [40, 110], jord: ["#ff9fd2", "#ffc6e6", "#f080bc"],
    rand: 0.22, vand: "#8a4a2a", sol: [1.2, "#fff0f8"], hemi: ["#fff6fb", "#c86aa0", 1.15], skyer: "#ffd0ec" },
  { id: "rum", navn: "Rummet", ikon: "🚀", himmel: ["#03041a", "#221657"], tåge: [48, 140], jord: ["#9892bc", "#bab4d8", "#77719a"],
    rand: 0.3, vand: null, sol: [0.9, "#cfd8ff"], hemi: ["#b8c0ff", "#3a2a5a", 0.9], skyer: null, stjerner: true },
];

// Jordens højde: små bløde bakker på legepladsen — udenfor rejser landet sig (eller falder ned i havet på stranden)
export function højde(x, z, tema) {
  const d = Math.hypot(x, z);
  let h = Math.sin(x * 0.23) * Math.cos(z * 0.19) * 0.35 + Math.sin(x * 0.61 + z * 0.37) * 0.15;
  if (d > ARENA + 2) h += (d - ARENA - 2) * tema.rand;
  return h;
}

// Små hjælpere til materialer og former
const mat = (farve, ekstra = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.75, metalness: 0, ...ekstra });
const skygge = (m, kaster = true) => { m.castShadow = kaster; m.receiveShadow = true; return m; };
function stribeTekstur(a, b, n = 6) {                        // skrå striber — til slikstokke og badebolde
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = a; g.fillRect(0, 0, 64, 64); g.fillStyle = b;
  for (let i = -n; i < n * 2; i++) { g.beginPath(); g.moveTo(i * 64 / n, 0); g.lineTo(i * 64 / n + 64 / n / 2, 0); g.lineTo(i * 64 / n + 64 / n / 2 - 64, 64); g.lineTo(i * 64 / n - 64, 64); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function prikTekstur() {                                     // mykt, rundt lys — til glød og sol
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.4, "rgba(255,255,255,.5)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export const GLØD = prikTekstur();

// ---------- Selve verdenen ----------
export function byggVerden(scene, renderer) {
  let tema = TEMAER[0];

  // Himmel: en stor kugle med blød farveovergang, stjerner og skyer
  const himmelGeo = new THREE.SphereGeometry(320, 32, 16);
  himmelGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(himmelGeo.attributes.position.count * 3), 3));
  const himmel = new THREE.Mesh(himmelGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  himmel.renderOrder = -2; scene.add(himmel);
  const stjernePos = [];
  for (let i = 0; i < 900; i++) { const v = rnd(0, TAU), y = rnd(-0.1, 1), rr = Math.sqrt(1 - y * y); stjernePos.push(Math.cos(v) * rr * 300, y * 300, Math.sin(v) * rr * 300); }
  const stjerneGeo = new THREE.BufferGeometry(); stjerneGeo.setAttribute("position", new THREE.Float32BufferAttribute(stjernePos, 3));
  const stjerner = new THREE.Points(stjerneGeo, new THREE.PointsMaterial({ color: "#ffffff", size: 2, sizeAttenuation: false, fog: false, transparent: true }));
  stjerner.renderOrder = -1; scene.add(stjerner);
  const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLØD, color: "#fff2c0", fog: false, depthWrite: false, transparent: true }));
  sol.scale.setScalar(70); scene.add(sol);

  // Lys: himmellys, sol med bløde skygger, der følger slangen
  const hemi = new THREE.HemisphereLight("#ffffff", "#5a8a3a", 1.1); scene.add(hemi);
  const lys = new THREE.DirectionalLight("#fff4d6", 1.25);
  lys.castShadow = true;
  lys.shadow.mapSize.set(1024, 1024);
  Object.assign(lys.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 90 });
  lys.shadow.camera.updateProjectionMatrix();
  lys.shadow.bias = -0.0008; lys.shadow.normalBias = 0.03;
  scene.add(lys, lys.target);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.fog = new THREE.Fog("#dff3ff", 42, 115);

  // Jorden: én stor, rund ø med farver, der skifter med verdenen
  const jordGeo = new THREE.PlaneGeometry(150, 150, 110, 110).rotateX(-Math.PI / 2);
  jordGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(jordGeo.attributes.position.count * 3), 3));
  const jord = new THREE.Mesh(jordGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  jord.receiveShadow = true; scene.add(jord);

  // Vand med små bølger (ses mest på stranden)
  const vandGeo = new THREE.PlaneGeometry(420, 420, 70, 70).rotateX(-Math.PI / 2);
  const vandGrund = Float32Array.from(vandGeo.attributes.position.array);
  const vand = new THREE.Mesh(vandGeo, new THREE.MeshStandardMaterial({ color: "#4fb4ff", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }));
  vand.position.y = -1.2; vand.receiveShadow = true; scene.add(vand);

  // Skyer af bløde kugler, der driver langsomt
  const skyer = new THREE.Group(); scene.add(skyer);
  const skyMat = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true, fog: false });
  for (let i = 0; i < 14; i++) {
    const sky = new THREE.Group();
    for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(2.5, 4.5), 1), skyMat); m.position.set(k * 3 - 6, rnd(-0.5, 1.5), rnd(-1.5, 1.5)); sky.add(m); }
    const v = rnd(0, TAU), a = rnd(60, 150);
    sky.position.set(Math.cos(v) * a, rnd(28, 44), Math.sin(v) * a);
    sky.userData.fart = rnd(0.6, 1.4);
    skyer.add(sky);
  }

  let pynt = new THREE.Group(); scene.add(pynt);
  let dyr = [];                                              // små væsner, der lever i verdenen (sommerfugle, krabber …)

  // Skift til en anden verden: farver, højder og al pynten bygges om
  function skift(nr) {
    tema = TEMAER[nr % TEMAER.length];
    const top = new THREE.Color(tema.himmel[0]), bund = new THREE.Color(tema.himmel[1]), c = new THREE.Color();
    const hp = himmelGeo.attributes.position, hc = himmelGeo.attributes.color;
    for (let i = 0; i < hp.count; i++) { c.copy(bund).lerp(top, Math.pow(Math.max(0, hp.getY(i) / 320), 0.55)); hc.setXYZ(i, c.r, c.g, c.b); }
    hc.needsUpdate = true;
    scene.fog.color.set(tema.himmel[1]); [scene.fog.near, scene.fog.far] = tema.tåge;
    stjerner.visible = !!tema.stjerner;
    skyer.visible = !!tema.skyer; if (tema.skyer) skyMat.color.set(tema.skyer);
    hemi.color.set(tema.hemi[0]); hemi.groundColor.set(tema.hemi[1]); hemi.intensity = tema.hemi[2];
    lys.color.set(tema.sol[1]); lys.intensity = tema.sol[0];
    sol.material.color.set(tema.id === "rum" ? "#8fb0ff" : "#fff2c0"); sol.scale.setScalar(tema.id === "rum" ? 40 : 70);
    vand.visible = !!tema.vand; if (tema.vand) vand.material.color.set(tema.vand);
    // jorden: højder og farver
    const p = jordGeo.attributes.position, jc = jordGeo.attributes.color;
    const [c0, c1, c2] = tema.jord.map(f => new THREE.Color(f)), sand = new THREE.Color("#f2d99a"), VÅDSAND = new THREE.Color("#c8a46a");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = højde(x, z, tema), d = Math.hypot(x, z);
      p.setY(i, h);
      const n = Math.sin(x * 0.9) * Math.cos(z * 0.7) + Math.sin(x * 0.31 + z * 0.43) * 0.8;
      c.copy(c0).lerp(n > 0 ? c1 : c2, Math.min(1, Math.abs(n) * 0.5));
      if (tema.id === "rum" && Math.sin(x * 0.5) * Math.cos(z * 0.45) > 0.8) c.multiplyScalar(0.75);   // mørke kratere
      if (tema.id === "strand" && d > ARENA + 3) c.lerp(VÅDSAND, Math.min(1, (d - ARENA - 3) / 8));                   // våd sand ned mod vandet
      if (tema.id === "have" && d > ARENA + 1.5 && d < ARENA + 3.5) c.lerp(sand, 0.6);           // en grussti rundt om hækken
      jc.setXYZ(i, c.r, c.g, c.b);
    }
    p.needsUpdate = true; jc.needsUpdate = true; jordGeo.computeVertexNormals();
    // pynten
    scene.remove(pynt);
    pynt.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && !o.userData.delt) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); } });
    pynt = new THREE.Group(); scene.add(pynt);
    dyr = [];
    PYNT[tema.id]({ gruppe: pynt, dyr, h: (x, z) => højde(x, z, tema) });
    return tema;
  }

  // Hver billede: vandet bølger, skyerne driver, lyset og skyggerne følger slangen, dyrene lever
  function opdater(dt, t, fokus) {
    if (vand.visible) {
      const vp = vandGeo.attributes.position;
      for (let i = 0; i < vp.count; i++) { const x = vandGrund[i * 3], z = vandGrund[i * 3 + 2]; vp.setY(i, Math.sin(x * 0.18 + t * 1.3) * 0.18 + Math.cos(z * 0.22 + t * 1.1) * 0.14); }
      vp.needsUpdate = true;
    }
    for (const sky of skyer.children) { sky.position.x += sky.userData.fart * dt; if (sky.position.x > 160) sky.position.x -= 320; }
    lys.position.set(fokus.x + 18, 34, fokus.z + 12); lys.target.position.set(fokus.x, 0, fokus.z);
    himmel.position.set(fokus.x, 0, fokus.z); stjerner.position.copy(himmel.position);
    sol.position.set(fokus.x + 140, 150, fokus.z - 210);
    for (const d of dyr) d.opdater(dt, t, fokus);
  }

  return { skift, opdater, højde: (x, z) => højde(x, z, tema), get tema() { return tema; } };
}

// ---------- Pynten i hver verden ----------
// Hver funktion får { gruppe, dyr, h } — læg ting i gruppen, og levende ting i dyr (med en opdater-funktion)
function ring(n, r, fn) { for (let i = 0; i < n; i++) { const v = i / n * TAU; fn(Math.cos(v) * r, Math.sin(v) * r, v, i); } }
function uden(fn, n, r0, r1) { for (let i = 0; i < n; i++) { const v = rnd(0, TAU), a = rnd(r0, r1); fn(Math.cos(v) * a, Math.sin(v) * a, i); } }
function instanser(geo, materiale, antal, fn, kaster = true) {
  const m = new THREE.InstancedMesh(geo, materiale, antal), o = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < antal; i++) { const farve = fn(o, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (farve) m.setColorAt(i, c.set(farve)); }
  m.castShadow = kaster; m.receiveShadow = true;
  return m;
}
// Sommerfugle (og andre flyvere): to vinger, der basker, og en bue gennem luften
function sommerfugl(gruppe, dyr, farve, h) {
  const g = new THREE.Group(), vm = mat(farve, { side: THREE.DoubleSide, emissive: farve, emissiveIntensity: 0.15 });
  const vinge = s => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), vm); m.scale.set(1, 1.3, 1); m.position.x = s * 0.3; const p = new THREE.Group(); p.add(m); return p; };
  const v1 = vinge(-1), v2 = vinge(1);
  g.add(v1, v2, new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), mat("#2a2a2a")));
  g.children[2].rotation.x = Math.PI / 2;
  gruppe.add(g);
  const c = { x: rnd(-18, 18), z: rnd(-18, 18), v: rnd(0, TAU), f: rnd(0.5, 1) };
  dyr.push({ opdater(dt, t, fokus) {
    c.v += dt * c.f * 0.6;
    let x = c.x + Math.cos(c.v) * 4, z = c.z + Math.sin(c.v * 1.3) * 4;
    const af = Math.hypot(x - fokus.x, z - fokus.z);
    if (af < 2.5) { c.x += (x - fokus.x) / af * dt * 8; c.z += (z - fokus.z) / af * dt * 8; }       // flyver væk fra slangen
    g.position.set(x, h(x, z) + 1.8 + Math.sin(t * 2 + c.f * 9) * 0.5, z);
    g.rotation.y = -c.v;
    const s = Math.sin(t * 16 + c.f * 5) * 1.1;
    v1.rotation.y = s; v2.rotation.y = -s;
  } });
}

const PYNT = {
  // ---------- Haven: hæk, træer, blomster, svampe og sommerfugle ----------
  have({ gruppe, dyr, h }) {
    const busk = new THREE.IcosahedronGeometry(1, 1);
    gruppe.add(instanser(busk, mat("#3f9b35", { flatShading: true }), 150, (o, i) => {
      const v = i / 150 * TAU, r = ARENA + 1 + (i % 2) * 0.6;
      o.position.set(Math.cos(v) * r, h(Math.cos(v) * r, Math.sin(v) * r) + 0.5, Math.sin(v) * r); o.scale.setScalar(rnd(0.8, 1.15)); o.rotation.set(rnd(0, 3), rnd(0, 3), 0);
      return ["#3f9b35", "#4cb140", "#358a2c"][i % 3];
    }));
    // træer udenfor hækken (fra Blender, ellers af simple former)
    const stammer = [], kroner = [];
    uden((x, z) => { stammer.push([x, z]); }, 46, ARENA + 6, 62);
    const skov = mange("pynt", "træ", stammer.length, (o, i) => {
      const [x, z] = stammer[i]; o.position.set(x, h(x, z), z); o.rotation.y = rnd(0, TAU); o.scale.setScalar(rnd(0.85, 1.2));
    });
    if (skov) gruppe.add(skov);
    else gruppe.add(instanser(new THREE.CylinderGeometry(0.35, 0.5, 3, 7), mat("#7a5230", { flatShading: true }), stammer.length, (o, i) => {
      const [x, z] = stammer[i]; o.position.set(x, h(x, z) + 1.5, z); o.scale.setScalar(1); kroner.push([x, h(x, z) + 3.6, z]);
    }));
    if (!skov) gruppe.add(instanser(new THREE.IcosahedronGeometry(2, 1), mat("#4cb140", { flatShading: true }), kroner.length * 2, (o, i) => {
      const [x, y, z] = kroner[i >> 1]; o.position.set(x + (i & 1) * 0.8, y + (i & 1) * 1.1, z - (i & 1) * 0.5); o.scale.setScalar((i & 1) ? 0.8 : 1.1); o.rotation.set(rnd(0, 3), rnd(0, 3), 0);
      return ["#4cb140", "#5fcc4a", "#3e9f38", "#78c850"][i % 4];
    }));
    // blomster på plænen
    const blomster = [];
    for (let i = 0; i < 110; i++) { const v = rnd(0, TAU), a = Math.sqrt(Math.random()) * (ARENA - 1); blomster.push([Math.cos(v) * a, Math.sin(v) * a]); }
    const BLOMSTERFARVER = ["#ff4d6d", "#ffd23f", "#ff8fd0", "#b15bff", "#ffffff", "#ff8c1a"];
    const eng = mange("pynt", "blomst", blomster.length, (o, i) => {
      const [x, z] = blomster[i]; o.position.set(x, h(x, z), z); o.rotation.y = rnd(0, TAU); o.scale.setScalar(rnd(0.9, 1.25));
      return BLOMSTERFARVER[i % 6];
    }, false);
    if (eng) gruppe.add(eng);
    else {
    gruppe.add(instanser(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), mat("#3a8a2a"), blomster.length, (o, i) => { const [x, z] = blomster[i]; o.position.set(x, h(x, z) + 0.25, z); }, false));
    gruppe.add(instanser(new THREE.SphereGeometry(0.2, 8, 6), mat("#ffffff", { roughness: 0.6 }), blomster.length, (o, i) => {
      const [x, z] = blomster[i]; o.position.set(x, h(x, z) + 0.55, z); o.scale.set(1, 0.45, 1);
      return ["#ff4d6d", "#ffd23f", "#ff8fd0", "#b15bff", "#ffffff", "#ff8c1a"][i % 6];
    }, false));
    gruppe.add(instanser(new THREE.SphereGeometry(0.08, 6, 4), mat("#ffe066", { emissive: "#ffb800", emissiveIntensity: 0.3 }), blomster.length, (o, i) => { const [x, z] = blomster[i]; o.position.set(x, h(x, z) + 0.62, z); }, false));
    }
    // græstotter
    gruppe.add(instanser(new THREE.ConeGeometry(0.12, 0.45, 4), mat("#3f9b35", { flatShading: true }), 320, (o) => {
      const v = rnd(0, TAU), a = rnd(0, ARENA + 12), x = Math.cos(v) * a, z = Math.sin(v) * a; o.position.set(x, h(x, z) + 0.18, z); o.rotation.z = rnd(-0.3, 0.3);
    }, false));
    // røde fluesvampe med hvide prikker
    for (let i = 0; i < 9; i++) {
      const v = rnd(0, TAU), a = rnd(6, ARENA - 2), x = Math.cos(v) * a, z = Math.sin(v) * a, s = rnd(0.7, 1.3), g = new THREE.Group();
      const svamp = kopi("pynt", "fluesvamp");
      if (svamp) { svamp.position.set(x, h(x, z), z); svamp.scale.setScalar(s); svamp.rotation.y = rnd(0, TAU); gruppe.add(svamp); continue; }
      g.add(skygge(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.6, 10), mat("#fff3e0"))));
      const hat = skygge(new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, TAU, 0, Math.PI / 2), mat("#e8283c", { roughness: 0.5 })));
      hat.position.y = 0.28; g.add(hat);
      for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), mat("#ffffff")); const pv = k / 6 * TAU; p.position.set(Math.cos(pv) * 0.35, 0.62, Math.sin(pv) * 0.35); g.add(p); }
      g.position.set(x, h(x, z) + 0.3 * s, z); g.scale.setScalar(s); gruppe.add(g);
    }
    for (const f of ["#ff8fd0", "#ffd23f", "#6ad0ff", "#b15bff", "#ff8c1a", "#ffffff", "#ff4d6d", "#8aff7a"]) sommerfugl(gruppe, dyr, f, h);
  },

  // ---------- Stranden: reb-hegn, palmer, søstjerner, sandslot, badebold og krabber ----------
  strand({ gruppe, dyr, h }) {
    ring(40, ARENA + 1, (x, z) => { const p = skygge(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 1.4, 8), mat("#8a6232"))); p.position.set(x, h(x, z) + 0.6, z); gruppe.add(p); });
    const reb = new THREE.Mesh(new THREE.TorusGeometry(ARENA + 1, 0.06, 6, 160), mat("#e8d8b0"));
    reb.rotation.x = Math.PI / 2; reb.position.y = h(ARENA + 1, 0) + 1.05; gruppe.add(reb);
    // palmer med skrå stammer og store blade
    uden((x, z) => {
      const palme = kopi("pynt", "palme");
      if (palme) { palme.position.set(x, h(x, z), z); palme.rotation.y = rnd(0, TAU); palme.scale.setScalar(rnd(0.8, 1.2)); gruppe.add(palme); return; }
      const g = new THREE.Group(), hs = rnd(4, 6), hæld = rnd(-0.3, 0.3);
      for (let k = 0; k < 6; k++) { const s = skygge(new THREE.Mesh(new THREE.CylinderGeometry(0.28 - k * 0.02, 0.32 - k * 0.02, hs / 6 + 0.05, 8), mat(k % 2 ? "#b8905a" : "#a07a48"))); s.position.set(Math.sin(hæld) * k * hs / 6 * 0.4, k * hs / 6 + hs / 12, 0); g.add(s); }
      const top = new THREE.Vector3(Math.sin(hæld) * hs * 0.4, hs, 0);
      for (let k = 0; k < 7; k++) {
        const blad = skygge(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), mat("#3fae3a", { flatShading: true })));
        blad.scale.set(2.2, 0.12, 0.55); blad.position.copy(top); const v = k / 7 * TAU;
        blad.rotation.set(0, v, -0.45); blad.position.x += Math.cos(v) * 1.6; blad.position.z -= Math.sin(v) * 1.6; blad.position.y -= 0.4;
        g.add(blad);
      }
      for (let k = 0; k < 3; k++) { const n = skygge(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat("#6e4520"))); n.position.set(top.x + rnd(-0.3, 0.3), top.y - 0.35, top.z + rnd(-0.3, 0.3)); g.add(n); }
      g.position.set(x, h(x, z), z); g.rotation.y = rnd(0, TAU); gruppe.add(g);
    }, 16, ARENA + 2.5, ARENA + 4.2);                         // på den tørre strand lige uden for rebet
    // søstjerner og muslinger i sandet
    const stjerneForm = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const rr = k % 2 ? 0.16 : 0.42, v = k / 10 * TAU + Math.PI / 2; k ? stjerneForm.lineTo(Math.cos(v) * rr, Math.sin(v) * rr) : stjerneForm.moveTo(Math.cos(v) * rr, Math.sin(v) * rr); }
    const stjerneGeo = new THREE.ExtrudeGeometry(stjerneForm, { depth: 0.08, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }).rotateX(-Math.PI / 2);
    const SØFARVER = ["#ff8c4a", "#ff6fa0", "#ffd23f", "#ff5a5a"], SKALFARVER = ["#fff0e6", "#ffd6e0", "#f5e0c0"];
    const stjerner = mange("pynt", "søstjerne", 22, (o, i) => {
      const v = rnd(0, TAU), a = rnd(3, ARENA - 1.5), x = Math.cos(v) * a, z = Math.sin(v) * a; o.position.set(x, h(x, z), z); o.rotation.y = rnd(0, TAU);
      return SØFARVER[i % 4];
    }, false);
    const skaller = mange("pynt", "musling", 18, (o, i) => {
      const v = rnd(0, TAU), a = rnd(3, ARENA - 1.5), x = Math.cos(v) * a, z = Math.sin(v) * a; o.position.set(x, h(x, z), z); o.rotation.y = rnd(0, TAU); o.scale.setScalar(rnd(0.8, 1.2));
      return SKALFARVER[i % 3];
    }, false);
    if (stjerner && skaller) gruppe.add(stjerner, skaller);
    else {
    gruppe.add(instanser(stjerneGeo, mat("#ff8c4a", { roughness: 0.6 }), 22, (o, i) => {
      const v = rnd(0, TAU), a = rnd(3, ARENA - 1.5), x = Math.cos(v) * a, z = Math.sin(v) * a; o.position.set(x, h(x, z) + 0.05, z); o.rotation.y = rnd(0, TAU);
      return ["#ff8c4a", "#ff6fa0", "#ffd23f", "#ff5a5a"][i % 4];
    }, false));
    gruppe.add(instanser(new THREE.SphereGeometry(0.28, 10, 6, 0, TAU, 0, Math.PI / 2), mat("#fff0e6", { roughness: 0.4 }), 18, (o, i) => {
      const v = rnd(0, TAU), a = rnd(3, ARENA - 1.5), x = Math.cos(v) * a, z = Math.sin(v) * a; o.position.set(x, h(x, z), z); o.scale.set(1, 0.6, 1.3); o.rotation.y = rnd(0, TAU);
      return ["#fff0e6", "#ffd6e0", "#f5e0c0"][i % 3];
    }, false));
    }
    // et sandslot med tårne og flag
    const slot = kopi("pynt", "sandslot");
    if (slot) { slot.position.set(13, h(13, -12), -12); slot.rotation.y = -0.6; gruppe.add(slot); }
    else { const g = new THREE.Group(), sm = mat("#e8c888", { flatShading: true });
      g.add(skygge(new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 3), sm)));
      for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
        const t = skygge(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.2, 10), sm)); t.position.set(dx, 0.4, dz); g.add(t);
        const tag = skygge(new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 10), sm)); tag.position.set(dx, 1.9, dz); g.add(tag);
      }
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), mat("#ff4d6d", { side: THREE.DoubleSide })); flag.position.set(1.85, 2.9, 1.5); g.add(flag);
      const stang = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4), mat("#6e4520")); stang.position.set(1.5, 2.7, 1.5); g.add(stang);
      g.position.set(13, h(13, -12) + 0.7, -12); gruppe.add(g);
    }
    // badebolden — slangen kan skubbe til den
    { const bold = skygge(new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), new THREE.MeshStandardMaterial({ map: stribeTekstur("#ffffff", "#ff4d6d", 3), roughness: 0.35 })));
      gruppe.add(bold);
      const b = { x: -8, z: 6, vx: 0, vz: 0 };
      dyr.push({ opdater(dt, t, fokus) {
        const dx = b.x - fokus.x, dz = b.z - fokus.z, af = Math.hypot(dx, dz);
        if (af < 1.6) { b.vx += dx / af * 7; b.vz += dz / af * 7; }                          // slangen skubber
        b.x += b.vx * dt; b.z += b.vz * dt; b.vx *= Math.pow(0.35, dt); b.vz *= Math.pow(0.35, dt);
        const d = Math.hypot(b.x, b.z);
        if (d > ARENA - 1.2) { b.x *= (ARENA - 1.2) / d; b.z *= (ARENA - 1.2) / d; b.vx *= -0.7; b.vz *= -0.7; }
        bold.position.set(b.x, h(b.x, b.z) + 0.9, b.z);
        bold.rotation.z -= b.vx * dt / 0.9; bold.rotation.x += b.vz * dt / 0.9;
      } });
    }
    // krabber, der går sidelæns
    for (let i = 0; i < 5; i++) {
      let g = kopi("pynt", "krabbe");
      if (!g) {
      g = new THREE.Group(); const km = mat("#e8502a", { roughness: 0.5 });
      g.add(skygge(new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), km)).translateY(0.25));
      g.children[0].scale.set(1.3, 0.55, 1);
      for (const s of [-1, 1]) {
        const klo = skygge(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), km)); klo.position.set(s * 0.62, 0.35, 0.25); g.add(klo);
        const øje = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat("#ffffff")); øje.position.set(s * 0.13, 0.52, 0.28); g.add(øje);
        const pup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mat("#111111")); pup.position.set(s * 0.13, 0.53, 0.35); g.add(pup);
      }
      }
      gruppe.add(g);
      const k = { x: rnd(-16, 16), z: rnd(-16, 16), v: rnd(0, TAU) };
      dyr.push({ opdater(dt, t, fokus) {
        k.v += Math.sin(t * 0.7 + i) * dt * 0.5;
        const af = Math.hypot(k.x - fokus.x, k.z - fokus.z), f = af < 3 ? 4 : 1.2;
        k.x += Math.cos(k.v) * f * dt; k.z += Math.sin(k.v) * f * dt;
        if (Math.hypot(k.x, k.z) > ARENA - 2) k.v += Math.PI;
        g.position.set(k.x, h(k.x, k.z) + Math.abs(Math.sin(t * 12 + i)) * 0.05, k.z);
        g.rotation.y = -k.v;                                                                // krabber går sidelæns!
      } });
    }
  },

  // ---------- Slikland: slikstokke-hegn, slikkepinde, vingummi, kæmpe cupcakes og svævende donuts ----------
  slik({ gruppe, dyr, h }) {
    const stok = new THREE.MeshStandardMaterial({ map: stribeTekstur("#ffffff", "#e8283c", 4), roughness: 0.35 });
    stok.map.repeat.set(1, 3);
    gruppe.add(instanser(new THREE.CylinderGeometry(0.16, 0.16, 1.8, 10), stok, 64, (o, i) => {
      const v = i / 64 * TAU, r = ARENA + 1, x = Math.cos(v) * r, z = Math.sin(v) * r; o.position.set(x, h(x, z) + 0.9, z);
    }));
    const kroge = new THREE.Mesh(new THREE.TorusGeometry(ARENA + 1, 0.12, 8, 180), stok);
    kroge.rotation.x = Math.PI / 2; kroge.position.y = h(ARENA + 1, 0) + 1.75; gruppe.add(kroge);
    // slikkepinde-træer
    const spiral = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d"), F = ["#ff3b5c", "#ffd23f", "#4cd964", "#3aa8ff", "#c86bff", "#ff8c1a"];
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const v = Math.atan2(y - 64, x - 64), d = Math.hypot(x - 64, y - 64); if (d < 64) { g.fillStyle = F[Math.floor((v / TAU + 1) * 6 + d * 0.09) % 6]; g.fillRect(x, y, 1, 1); } }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const pinde = [];
    uden((x, z) => pinde.push([x, z]), 30, ARENA + 4, 60);
    const slikskov = mange("pynt", "slikkepind", pinde.length, (o, i) => {
      const [x, z] = pinde[i]; o.position.set(x, h(x, z), z); o.rotation.y = rnd(0, TAU); o.scale.setScalar(rnd(0.75, 1.25));
    });
    if (slikskov) gruppe.add(slikskov);
    else for (const [x, z] of pinde) {
      const g = new THREE.Group(), hs = rnd(3, 5.5);
      const pind = skygge(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, hs, 8), mat("#ffffff"))); pind.position.y = hs / 2; g.add(pind);
      const slik = skygge(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.4, 32), [mat("#ff8fd0"), new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.3 }), new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.3 })]));
      slik.rotation.x = Math.PI / 2; slik.position.y = hs + 1.2; g.add(slik);
      g.position.set(x, h(x, z), z); g.rotation.y = rnd(0, TAU); gruppe.add(g);
    }
    // vingummi-dråber på plænen
    gruppe.add(instanser(new THREE.SphereGeometry(0.45, 14, 8, 0, TAU, 0, Math.PI / 2), mat("#ffffff", { roughness: 0.2, transparent: true, opacity: 0.9 }), 34, (o, i) => {
      const v = rnd(0, TAU), a = rnd(3, ARENA - 1.5), x = Math.cos(v) * a, z = Math.sin(v) * a; o.position.set(x, h(x, z), z); o.scale.set(1, 1.3, 1);
      return ["#ff3b5c", "#4cd964", "#ffd23f", "#c86bff", "#ff8c1a", "#3aa8ff"][i % 6];
    }));
    // kæmpe cupcakes udenfor
    uden((x, z) => {
      const kage = kopi("pynt", "kæmpecupcake");
      if (kage) { kage.position.set(x, h(x, z), z); kage.rotation.y = rnd(0, TAU); gruppe.add(kage); return; }
      const g = new THREE.Group();
      g.add(skygge(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 1.8, 2.4, 16), mat("#ffb0d8", { flatShading: true }))).translateY(1.2));
      for (let k = 0; k < 3; k++) { const c = skygge(new THREE.Mesh(new THREE.SphereGeometry(2.3 - k * 0.6, 16, 10), mat(k % 2 ? "#fff6fb" : "#ff7ec0"))); c.position.y = 2.8 + k * 1.1; c.scale.y = 0.7; g.add(c); }
      const bær = skygge(new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), mat("#e8283c", { roughness: 0.3 }))); bær.position.y = 6.1; g.add(bær);
      g.position.set(x, h(x, z), z); gruppe.add(g);
    }, 7, 30, 55);
    // donuts, der svæver og drejer højt oppe
    for (let i = 0; i < 6; i++) {
      const blender = kopi("pynt", "svævedonut"), d = new THREE.Group();
      if (blender) d.add(tone(blender, ["#ff8fd0", "#6a3a1e", "#fff6fb"][i % 3]));
      else {
      d.add(new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.6, 12, 24), mat("#d8a060")));
      const glasur = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.62, 12, 24, Math.PI * 2), mat(["#ff8fd0", "#6a3a1e", "#fff6fb"][i % 3], { roughness: 0.3 }));
      glasur.scale.z = 0.6; glasur.position.z = 0.15; d.add(glasur);
      }
      const v = rnd(0, TAU), a = rnd(20, 40), y = rnd(9, 16);
      d.position.set(Math.cos(v) * a, y, Math.sin(v) * a); gruppe.add(d);
      dyr.push({ opdater(dt, t) { d.rotation.x = t * 0.4 + i; d.rotation.y = t * 0.6 + i; d.position.y = y + Math.sin(t + i) * 0.8; } });
    }
    for (const f of ["#ffffff", "#ffd23f", "#8aff7a", "#6ad0ff", "#ff5fa8"]) sommerfugl(gruppe, dyr, f, h);
  },

  // ---------- Rummet: lysende krystaller, planeter, en raket og en UFO ----------
  rum({ gruppe, dyr, h }) {
    gruppe.add(instanser(new THREE.OctahedronGeometry(0.6, 0), mat("#ffffff", { emissive: "#6a4aff", emissiveIntensity: 0.8, roughness: 0.2, flatShading: true }), 60, (o, i) => {
      const v = i / 60 * TAU, r = ARENA + 1 + (i % 2) * 0.5, x = Math.cos(v) * r, z = Math.sin(v) * r;
      o.position.set(x, h(x, z) + 0.6, z); o.scale.set(0.8, rnd(1.4, 2.4), 0.8); o.rotation.set(rnd(-0.3, 0.3), rnd(0, 3), rnd(-0.3, 0.3));
      return ["#9ad8ff", "#c8a0ff", "#ff9ae8"][i % 3];
    }));
    gruppe.add(instanser(new THREE.OctahedronGeometry(0.3, 0), mat("#ffffff", { emissive: "#4affd8", emissiveIntensity: 0.9, flatShading: true }), 26, (o, i) => {
      const v = rnd(0, TAU), a = rnd(4, ARENA - 2), x = Math.cos(v) * a, z = Math.sin(v) * a; o.position.set(x, h(x, z) + 0.3, z); o.scale.set(1, 1.8, 1); o.rotation.y = rnd(0, 3);
      return ["#8affd8", "#ffd23f", "#ff8fd0"][i % 3];
    }));
    // planeter på himlen (en med ringe)
    for (const [x, y, z, r, f, ringe] of [[-90, 70, -140, 22, "#ff9a5a", true], [110, 50, -120, 12, "#6ad0ff", false], [40, 95, 150, 16, "#b88aff", false]]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ color: f, roughness: 0.8, emissive: f, emissiveIntensity: 0.25, fog: false }));
      p.position.set(x, y, z); gruppe.add(p);
      if (ringe) { const rr = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2.1, 48), new THREE.MeshBasicMaterial({ color: "#ffe0b0", side: THREE.DoubleSide, transparent: true, opacity: 0.7, fog: false })); rr.rotation.x = 1.2; p.add(rr); }
      dyr.push({ opdater(dt, t, fokus) { p.position.set(fokus.x + x, y, fokus.z + z); p.rotation.y = t * 0.05; } });
    }
    // en raket, der står klar
    const raket = kopi("pynt", "raket");
    if (raket) { raket.position.set(-30, h(-30, -8), -8); gruppe.add(raket); }
    else { const g = new THREE.Group();
      g.add(skygge(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 16), mat("#f4f4f8", { roughness: 0.4 }))).translateY(4));
      g.add(skygge(new THREE.Mesh(new THREE.ConeGeometry(1, 2.2, 16), mat("#e8283c", { roughness: 0.4 }))).translateY(8.1));
      const vindue = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), mat("#6ad0ff", { emissive: "#3a8aff", emissiveIntensity: 0.5 })); vindue.position.set(0, 5, 1.01); g.add(vindue);
      for (let k = 0; k < 4; k++) { const f = skygge(new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 1.4), mat("#e8283c"))); const v = k / 4 * TAU; f.position.set(Math.cos(v) * 1.1, 1.8, Math.sin(v) * 1.1); f.rotation.y = -v; g.add(f); }
      g.position.set(-30, h(-30, -8), -8); gruppe.add(g);
    }
    // UFO'en, der flyver i cirkler med blinkende lys
    { const g = new THREE.Group();
      const skål = kopi("pynt", "ufo") || new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 12), mat("#b8c0d0", { metalness: 0.5, roughness: 0.3 }));
      if (skål.isMesh) skål.scale.y = 0.3;                                       // (kun den simple skål skal klemmes flad)
      g.add(skål);
      const kuppel = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI / 2), mat("#8affd8", { transparent: true, opacity: 0.7, emissive: "#3affb0", emissiveIntensity: 0.4 })); kuppel.position.y = 0.4; g.add(kuppel);
      const lamper = [];
      for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffd23f" })); const v = k / 8 * TAU; l.position.set(Math.cos(v) * 1.9, -0.1, Math.sin(v) * 1.9); g.add(l); lamper.push(l); }
      const stråle = new THREE.Mesh(new THREE.ConeGeometry(2.2, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: "#8affd8", transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); stråle.position.y = -3.6; g.add(stråle);
      gruppe.add(g);
      dyr.push({ opdater(dt, t) {
        g.position.set(Math.cos(t * 0.25) * 18, 9 + Math.sin(t * 1.3) * 0.6, Math.sin(t * 0.25) * 18); g.rotation.y = t * 1.5;
        lamper.forEach((l, k) => l.material.color.set((Math.floor(t * 6) + k) % 2 ? "#ffd23f" : "#ff4d6d"));
      } });
    }
  },
};
