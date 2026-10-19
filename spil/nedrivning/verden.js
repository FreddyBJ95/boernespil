// ===== Verdenen: byggepladsen, himlen, solen, hegnet og byen i baggrunden =====
// Himlen og spejlingerne kommer fra de fælles 3D-filer (spil/3d-faelles/pynt.js). Jorden er et foto af
// grus, og pladsen er omgivet af et byggehegn. Bag hegnet ligger byen — huse, der forsvinder i disen.

import * as THREE from "../3d-faelles/three.module.js";
import { lavHimmel, lavMiljø, detaljer } from "../3d-faelles/pynt.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { jordMateriale, mindre } from "./materialer.js";

import { mobil } from "./enhed.js";

// Tiderne på døgnet: himmel, sol, lys og dis
export const TIDER = {
  dag: { top: "#3f78b6", horisont: "#c8d4da", bund: "#8a8478", sol: [0.38, 0.62, 0.68], solFarve: "#fff1dc", solStyrke: 3.2, himmelLys: 1.15, himmel: "#bcd0e4", jord: "#6a5d4c", tåge: "#c2cbd0", tæthed: 0.0034, eksponering: 1.0, skyer: 0.3, stjerner: 0 },
  aften: { top: "#34507e", horisont: "#eeaa72", bund: "#6a4a38", sol: [0.78, 0.2, 0.5], solFarve: "#ffb070", solStyrke: 2.7, himmelLys: 0.8, himmel: "#8a8eae", jord: "#5a4436", tåge: "#c99878", tæthed: 0.0048, eksponering: 1.08, skyer: 0.38, stjerner: 0 },
  nat: { top: "#03060d", horisont: "#162030", bund: "#0a0c10", sol: [0.35, 0.55, 0.45], solFarve: "#9eb4dc", solStyrke: 0.28, himmelLys: 0.16, himmel: "#3a4a6a", jord: "#16140f", tåge: "#121a26", tæthed: 0.0058, eksponering: 1.3, skyer: 0.15, stjerner: 1 },
};

export class Verden {
  constructor(scene, renderer, fotos) {
    this.scene = scene; this.renderer = renderer; this.fotos = fotos;
    this.sol = new THREE.DirectionalLight(0xffffff, 3);
    this.sol.castShadow = true;
    const s = this.sol.shadow;
    s.mapSize.set(mobil ? 1024 : 2048, mobil ? 1024 : 2048);
    s.camera.left = -48; s.camera.right = 48; s.camera.top = 48; s.camera.bottom = -48; s.camera.near = 1; s.camera.far = 220;
    s.bias = -0.0004; s.normalBias = 0.035;
    scene.add(this.sol, this.sol.target);
    this.hemi = new THREE.HemisphereLight(0xbcd0e4, 0x6a5d4c, 1);
    scene.add(this.hemi);
    // projektører til natten (altid i scenen, så lysene ikke skal bygges om — de slukkes med styrke 0)
    this.projektører = [[-34, -30], [34, 28]].map(([x, z]) => {
      const l = new THREE.SpotLight(0xffe2b0, 0, 140, 0.55, 0.6, 1.2); l.position.set(x, 14, z); l.target.position.set(0, 4, 0);
      scene.add(l, l.target);
      return l;
    });
    this.lavJord();
    this.lavHegn();
    this.lavBy();
  }
  // ---------- Tidspunktet: himmel, sol og dis ----------
  sætTid(navn) {
    const t = TIDER[navn] || TIDER.dag;
    this.tid = t;
    if (this.himmel) { this.scene.remove(this.himmel); this.himmel.material.dispose(); }
    this.himmel = lavHimmel({ top: t.top, horisont: t.horisont, bund: t.bund, sol: t.sol, solFarve: t.solFarve, solStyrke: navn === "nat" ? 0.15 : 1, dis: 0.4, skyer: t.skyer, stjerner: t.stjerner, skyFarve: navn === "aften" ? "#f6d2b8" : navn === "nat" ? "#202838" : "#f4f6f8" });
    this.scene.add(this.himmel);
    this.scene.environment?.dispose?.();
    this.scene.environment = lavMiljø(this.renderer, this.himmel, t.jord);
    this.scene.fog = new THREE.FogExp2(t.tåge, t.tæthed);
    this.sol.color.set(t.solFarve); this.sol.intensity = t.solStyrke;
    this.solRetning = new THREE.Vector3(...t.sol).normalize();
    this.sol.position.copy(this.solRetning).multiplyScalar(110);
    this.hemi.color.set(t.himmel); this.hemi.groundColor.set(t.jord); this.hemi.intensity = t.himmelLys;
    for (const p of this.projektører) p.intensity = navn === "nat" ? 2600 : 0;
    for (const v of this.byVinduer || []) v.material.emissiveIntensity = navn === "nat" ? 1.6 : navn === "aften" ? 0.4 : 0;
    return t;
  }

  // ---------- Jorden: grus, en betonplads og en vej ----------
  lavJord() {
    const str = 700;
    const jord = new THREE.Mesh(new THREE.PlaneGeometry(str, str).rotateX(-Math.PI / 2), jordMateriale(this.fotos, str));
    jord.receiveShadow = true;
    this.scene.add(jord);
    // vejen langs pladsen og fortovet
    const asfalt = detaljer(new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: 0.95 }), "asfalt", { styrke: 0.35, bump: 0.5 });
    const vej = new THREE.Mesh(new THREE.PlaneGeometry(str, 9).rotateX(-Math.PI / 2), asfalt);
    vej.position.set(0, 0.015, -52); vej.receiveShadow = true; this.scene.add(vej);
    const streg = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.15).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.8 }));
    const striber = new THREE.InstancedMesh(streg.geometry, streg.material, 80);
    for (let i = 0; i < 80; i++) striber.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-320 + i * 8, 0.02, -52));
    striber.receiveShadow = true; this.scene.add(striber);
    // grusbunker og et par betonklodser på pladsen
    const grusMat = new THREE.MeshStandardMaterial({ color: 0x8c8274, roughness: 1 });
    if (this.fotos.sand) { grusMat.map = this.fotos.sand.farve; grusMat.normalMap = this.fotos.sand.normal; }
    for (const [x, z, r, h] of [[-40, 30, 5, 2.6], [-34, 36, 3.4, 1.8], [40, -30, 4.2, 2.2]]) {
      const g = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24, 1, true), grusMat); g.position.set(x, h / 2 - 0.05, z); g.castShadow = g.receiveShadow = true; this.scene.add(g);
    }
  }
  // ---------- Byggehegnet rundt om pladsen ----------
  lavHegn() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 256, 256); g.strokeStyle = "#b8bcc0"; g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    g.lineWidth = 8; g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1);
    const mat = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.5 });
    const plade = new THREE.PlaneGeometry(3.5, 2);
    const fod = new THREE.BoxGeometry(0.6, 0.15, 0.25);
    const fodMat = new THREE.MeshStandardMaterial({ color: 0x9a9890, roughness: 0.9 });
    const sider = [[-50, -46, 50, -46], [50, -46, 50, 46], [50, 46, -50, 46], [-50, 46, -50, -46]];
    const stk = [];
    for (const [x0, z0, x1, z1] of sider) {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 3.5);
      for (let i = 0; i < n; i++) {
        const s = (i + 0.5) / n;
        if (x0 === -50 && z0 === -46 && i > 12 && i < 16) continue;               // indkørslen fra vejen
        stk.push([x0 + (x1 - x0) * s, z0 + (z1 - z0) * s, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2]);
      }
    }
    const hegn = new THREE.InstancedMesh(plade, mat, stk.length), fødder = new THREE.InstancedMesh(fod, fodMat, stk.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    stk.forEach(([x, z, v], i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), v);
      hegn.setMatrixAt(i, m.compose(new THREE.Vector3(x, 1.12, z), q, new THREE.Vector3(1, 1, 1)));
      fødder.setMatrixAt(i, m.compose(new THREE.Vector3(x + Math.cos(v) * 1.75, 0.075, z - Math.sin(v) * 1.75), q, new THREE.Vector3(1, 1, 1)));
    });
    hegn.castShadow = true; fødder.castShadow = fødder.receiveShadow = true;
    this.scene.add(hegn, fødder);
  }
  // ---------- Byen bag hegnet: rækker af huse og træer i disen ----------
  lavBy() {
    const c = document.createElement("canvas"); c.width = 128; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, 128, 256);
    for (let y = 8; y < 256; y += 32) for (let x = 8; x < 128; x += 30) { g.fillStyle = Math.random() < 0.35 ? "#ffd9a0" : "#202428"; g.fillRect(x, y, 18, 20); }
    const lys = new THREE.CanvasTexture(c); lys.colorSpace = THREE.SRGBColorSpace; lys.wrapS = lys.wrapT = THREE.RepeatWrapping;
    const c2 = document.createElement("canvas"); c2.width = 128; c2.height = 256;
    const g2 = c2.getContext("2d");
    g2.fillStyle = "#b8b2a8"; g2.fillRect(0, 0, 128, 256);
    for (let y = 8; y < 256; y += 32) for (let x = 8; x < 128; x += 30) { g2.fillStyle = "#3a4048"; g2.fillRect(x, y, 18, 20); }
    const facade = new THREE.CanvasTexture(c2); facade.colorSpace = THREE.SRGBColorSpace; facade.wrapS = facade.wrapT = THREE.RepeatWrapping;
    const huse = [];
    let frø = 7; const r = () => { frø = (frø * 16807) % 2147483647; return frø / 2147483647; };
    for (let i = 0; i < 70; i++) {
      const v = r() * Math.PI * 2, a = 95 + r() * 110;
      const x = Math.cos(v) * a, z = Math.sin(v) * a;
      if (Math.abs(z + 52) < 10) continue;
      const h = 8 + r() * (r() < 0.2 ? 40 : 16), b = 10 + r() * 16, d = 10 + r() * 12;
      huse.push([x, z, b, h, d, r() * 3]);
    }
    this.byVinduer = [];
    for (const [x, z, b, h, d, v] of huse) {
      const mat = new THREE.MeshStandardMaterial({ map: facade, emissiveMap: lys, emissive: 0xffffff, emissiveIntensity: 0, color: new THREE.Color().setHSL(0.08 + r() * 0.05, 0.12, 0.55 + r() * 0.2), roughness: 0.9 });
      const geo = new THREE.BoxGeometry(b, h, d), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * b / 10, uv.getY(i) * h / 10);
      const hus = new THREE.Mesh(geo, mat);
      hus.position.set(x, h / 2, z); hus.rotation.y = v; hus.castShadow = false; hus.receiveShadow = true;
      this.scene.add(hus); this.byVinduer.push(hus);
    }
    // træer: stammer og kroner
    const kroneMat = new THREE.MeshStandardMaterial({ color: 0x3e5a2c, roughness: 1 }), stammeMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
    const kroneGeo = new THREE.IcosahedronGeometry(1, 1), stammeGeo = new THREE.CylinderGeometry(0.15, 0.22, 1, 6);
    const n = 90, kroner = new THREE.InstancedMesh(kroneGeo, kroneMat, n), stammer = new THREE.InstancedMesh(stammeGeo, stammeMat, n);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let forsøg = 0; forsøg < n * 2 && i < n; forsøg++) {
      const v = r() * Math.PI * 2, a = 58 + r() * 45, x = Math.cos(v) * a, z = Math.sin(v) * a;
      if (Math.abs(z + 52) < 6) continue;                                     // ingen træer på vejen
      const h = 4 + r() * 5, k = 2 + r() * 2.2;
      stammer.setMatrixAt(i, m.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)));
      kroner.setMatrixAt(i, m.compose(new THREE.Vector3(x, h + k * 0.6, z), new THREE.Quaternion().random(), new THREE.Vector3(k, k * 1.2, k)));
      kroner.setColorAt(i, new THREE.Color().setHSL(0.24 + r() * 0.06, 0.35, 0.22 + r() * 0.1));
      i++;
    }
    kroner.count = stammer.count = i;
    kroner.castShadow = stammer.castShadow = true; kroner.receiveShadow = true;
    this.scene.add(kroner, stammer);
  }
  // Skurvognen og gravkoen ved indkørslen (modeller fra Blender)
  async pynt() {
    const loader = new GLTFLoader(), hentet = {};
    for (const [fil, x, z, yaw] of [["skurvogn", -41, -38, 0.12], ["skurvogn", -40.5, -34.6, 0.1], ["gravko", 39, 35, -2.5]]) {
      try {
        hentet[fil] ??= (await loader.loadAsync(`modeller/${fil}.glb`)).scene;
        const g = hentet[fil].clone(true);
        g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (mobil) for (const k of ["map", "metalnessMap", "roughnessMap"]) if (o.material[k]) mindre(o.material[k], 512); if (o.material.transparent) { o.material.transparent = false; o.material.alphaTest = 0.5; o.material.depthWrite = true; o.material.side = THREE.FrontSide; o.castShadow = false; } } });
        g.position.set(x, 0, z); g.rotation.y = yaw;
        this.scene.add(g);
      } catch (_) { /* uden modellen står pladsen bare tom */ }
    }
  }
  // Solens skygger følger det sted, kameraet kigger på
  følg(mål) {
    this.sol.position.copy(mål).addScaledVector(this.solRetning, 110); this.sol.target.position.copy(mål); this.sol.target.updateMatrixWorld();
  }
}
