// ===== Målene: dåser, flasker, meloner, græskar, balloner og stålgonger — og frugt til sværdet =====
// På hylden står der ting, der reagerer forskelligt: dåser flyver (og kan rammes igen i luften),
// flasker splintres, meloner og græskar sprænges, balloner springer med konfetti, og stålgongerne svinger.
// Med sværdet kastes frugt og dåser op foran en, og når klingen rammer, skæres de over i to halvdele
// (de "klippes" langs en flade, og en rigtig snitflade med kerner og frugtkød lægges på).

import * as THREE from "../3d-faelles/three.module.js";
import { dåseEtiket, frugtSkal, frugtBuler, snitFlade } from "./teksturer.js";
import { mat } from "./materialer.js";
import { HYLDE, FANG } from "./bane.js";
import * as lyd from "./lyd.js";

const tilf = (a, b) => a + Math.random() * (b - a);
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rnd = s => v3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
const vælg = a => a[Math.random() * a.length | 0];

// ---------- Frugt og ting at bygge ----------
const FRUGT = {
  melon: { r: [0.17, 0.15, 0.15], ru: 0.45, saft: [0.85, 0.06, 0.12], kød: 0xe0304a, skræl: 0x2f6b2a },
  appelsin: { r: [0.062, 0.06, 0.062], ru: 0.6, saft: [1.0, 0.5, 0.05], kød: 0xffa020, skræl: 0xf08a12 },
  æble: { r: [0.068, 0.062, 0.068], ru: 0.35, saft: [0.95, 0.9, 0.6], kød: 0xfff0c8, skræl: 0xb81c24 },
  græskar: { r: [0.16, 0.115, 0.16], ru: 0.55, saft: [1.0, 0.55, 0.1], kød: 0xffa424, skræl: 0xd8740c },
  kokos: { r: [0.075, 0.08, 0.075], ru: 0.95, saft: [0.95, 0.95, 0.92], kød: 0xf7f3ea, skræl: 0x5a3a22 },
};
const kugleGeo = new THREE.SphereGeometry(1, 40, 28);
// Ruheden som afstanden fra "rigtige" materialer — skal er lidt blank, kokos er mat og håret
function frugt(slags) {
  const s = FRUGT[slags], obj = new THREE.Group(), skal = new THREE.Group();
  skal.scale.set(...s.r); obj.add(skal);
  const m = new THREE.MeshPhysicalMaterial({ map: frugtSkal(slags), bumpMap: frugtBuler(slags), bumpScale: 2, roughness: s.ru, clearcoat: slags === "æble" ? 0.6 : 0.15, clearcoatRoughness: 0.4 });
  const k = new THREE.Mesh(kugleGeo, m); k.castShadow = k.receiveShadow = true; skal.add(k);
  if (slags === "æble") {
    const stilk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 })); stilk.position.y = 0.068; stilk.rotation.z = 0.2; obj.add(stilk);
    const blad = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x3f8a2a, roughness: 0.6 })); blad.scale.set(0.025, 0.003, 0.012); blad.position.set(0.016, 0.075, 0); blad.rotation.z = 0.5; obj.add(blad);
  }
  if (slags === "græskar") {
    const stilk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x5f6a2a, roughness: 0.9 })); stilk.position.y = 0.125; stilk.rotation.z = -0.25; obj.add(stilk);
  }
  return { obj, skal, radius: Math.max(...s.r), slags, inde: s.kød };
}
// En dåse med etiket, blanke låg og et hult indre (ses, når den skæres over)
function dåse() {
  const obj = new THREE.Group();
  const låg = mat.rustfri;
  const m = [new THREE.MeshPhysicalMaterial({ map: dåseEtiket(Math.random() * 6 | 0), metalness: 0.65, roughness: 0.32, clearcoat: 0.5 }), låg, låg];
  const krop = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 36, 1), m); krop.castShadow = krop.receiveShadow = true; obj.add(krop);
  for (const y of [-0.066, 0.066]) obj.add(new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.0028, 8, 36).rotateX(Math.PI / 2), låg)).position.y = y;
  const flig = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.002, 0.01), låg); flig.position.set(0.012, 0.0665, 0); obj.add(flig);
  return { obj, radius: 0.07, slags: "dåse", inde: 0x9da2a8, hul: true };
}
// En glasflaske (grøn, brun eller blå) med papiretiket og kapsel
const flaskeGeo = new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.038, 0.005], [0.038, 0.19], [0.034, 0.215], [0.018, 0.25], [0.0135, 0.272], [0.0135, 0.3], [0.0155, 0.302], [0.0155, 0.31], [0.012, 0.312], [0, 0.312]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
const etiketGeo = new THREE.CylinderGeometry(0.0386, 0.0386, 0.085, 32, 1, true);
function flaske() {
  const farve = vælg([0x2f8a3e, 0x7a4012, 0x2a5ab0, 0x2f8a3e]);
  const obj = new THREE.Group();
  const glas = new THREE.MeshPhysicalMaterial({ color: farve, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.6, clearcoat: 1, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false });
  const f = new THREE.Mesh(flaskeGeo, glas); f.position.y = -0.156; f.castShadow = true; obj.add(f);
  const e = new THREE.Mesh(etiketGeo, new THREE.MeshStandardMaterial({ color: vælg([0xf1e6c8, 0xffffff, 0xf7d36a]), roughness: 0.85 })); e.position.y = -0.156 + 0.11; obj.add(e);
  const kapsel = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.009, 20), mat.guld); kapsel.position.y = -0.156 + 0.308; obj.add(kapsel);
  return { obj, radius: 0.16, slags: "flaske", glas, farve };
}
// En ballon på en snor, der vipper i vinden
function ballon() {
  const farve = vælg([0xe51b2b, 0xffc21a, 0x1f6fe5, 0x22b04a, 0xff4fb0, 0xff7a10, 0x8a3ce0]);
  const obj = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color: farve, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.5, sheenColor: new THREE.Color(farve) });
  const k = new THREE.Mesh(kugleGeo, m); k.scale.set(0.135, 0.165, 0.135); k.castShadow = true; obj.add(k);
  const knude = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.022, 10), m); knude.position.y = -0.172; obj.add(knude);
  return { obj, radius: 0.17, slags: "ballon", farve };
}

// ---------- Små stumper til at sprænge med ----------
const klumpGeo = Array.from({ length: 6 }, () => {
  const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * tilf(0.6, 1.3), p.getY(i) * tilf(0.6, 1.3), p.getZ(i) * tilf(0.6, 1.3));
  g.computeVertexNormals(); return g;
});
const skårGeo = Array.from({ length: 6 }, () => {
  const g = new THREE.BufferGeometry(), a = tilf(0.4, 1), b = tilf(0.4, 1);
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, a, tilf(-0.3, 0.3), 0, tilf(0, a), b, tilf(-0.1, 0.1)], 3)); g.computeVertexNormals(); return g;
});

// Bagsiden af en klippet flade får frugtkødets farve (så en halv dåse ser hul ud indeni)
// Mærk en del med det mål, den hører til (skjult for kopiering, ellers peger kopien i ring)
function mærk(o, m) { Object.defineProperty(o.userData, "mål", { value: m, enumerable: false, configurable: true, writable: true }); }

function indersiden(materiale, farve) {
  materiale.onBeforeCompile = sh => {
    sh.uniforms.uInde = { value: new THREE.Color(farve) };
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uInde;")
      .replace("#include <map_fragment>", "#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = uInde;");
  };
  materiale.customProgramCacheKey = () => "inde";
}

// =====================================================================
export class Mål {
  constructor({ scene, kamera, effekter, glød, røg, stumper, gulv }) {
    Object.assign(this, { scene, kamera, effekter, glød, røg, stumper, gulv });
    this.alle = [];            // alle mål, man kan ramme lige nu
    this.halvdele = [];        // overskårne halvdele
    this.pladser = [];
    // Pladserne på hylden
    const typer = ["dåse", "flaske", "melon", "dåse", "græskar", "flaske", "dåse", "melon", "flaske", "dåse"];
    typer.forEach((slags, i) => this.pladser.push({ x: -3.6 + i * 0.8, slags, mål: null, vent: 0.2 + i * 0.08 }));
    // Balloner bundet til hegnspælene
    this.ballonPladser = [-3.45, -1.55, 0.35, 2.3, 3.55].map((x, i) => ({ x, y: 1.95 + (i % 2) * 0.35, mål: null, vent: 0.5 + i * 0.1 }));
    // Stålgonger, der hænger i kæder foran kuglefanget
    this.gonger = [];
    for (const x of [-2.1, 2.1]) {
      const ophæng = new THREE.Group(); ophæng.position.set(x, 2.35, FANG + 0.5); scene.add(ophæng);
      const bjælke = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.05), mat.mørkStål); bjælke.castShadow = true; ophæng.add(bjælke);
      for (const s of [-1, 1]) { const ben = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.35, 0.05), mat.mørkStål); ben.position.set(s * 0.33, -1.175, 0); ben.castShadow = true; ophæng.add(ben); }
      const sving = new THREE.Group(); ophæng.add(sving);
      for (const s of [-1, 1]) { const kæde = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.42, 6), mat.mørkStål); kæde.position.set(s * 0.12, -0.21, 0); sving.add(kæde); }
      const plade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.016, 40).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf0eee6, roughness: 0.5, metalness: 0.3 }));
      plade.position.y = -0.62; plade.castShadow = true; sving.add(plade);
      const g = { slags: "plade", obj: plade, sving, vinkel: 0, fart: 0, radius: 0.22, tilstand: "fast" };
      mærk(plade, g); this.alle.push(g); this.gonger.push(g);
    }
    this._p = v3();
  }

  // ---------- Opret og fjern ----------
  nytMål(slags) {
    if (slags === "dåse") return dåse();
    if (slags === "flaske") return flaske();
    if (slags === "ballon") return ballon();
    return frugt(slags);
  }
  tilføj(m, pos) {
    m.obj.position.copy(pos); m.obj.traverse(o => { if (o.isMesh) mærk(o, m); });
    this.scene.add(m.obj); this.alle.push(m);
    m.fart = v3(); m.spin = v3(); m.tid = 0; m.vokser = 0;
    return m;
  }
  fjern(m) { m.obj.removeFromParent(); m.tilstand = "væk"; const i = this.alle.indexOf(m); if (i >= 0) this.alle.splice(i, 1); }
  get træfbare() { return this.alle.map(m => m.obj); }

  // Find det mål, der er tættest på et punkt på skærmen (hjælp til små fingre)
  findNær(sx, sy, W, H, maks) {
    let bedst = null, bd = maks;
    for (const m of this.alle) {
      const p = m.obj.getWorldPosition(this._p).project(this.kamera);
      if (p.z > 1) continue;
      const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H, d = Math.hypot(x - sx, y - sy);
      if (d < bd) { bd = d; bedst = m; }
    }
    return bedst;
  }

  // ---------- Kast frugt og dåser op i luften ----------
  // langt = ude på banen (til at skyde efter), ellers lige foran en (til sværdet)
  kast(antal = 1, langt = false) {
    for (let i = 0; i < antal; i++) {
      const slags = langt ? vælg(["dåse", "dåse", "melon", "flaske", "græskar", "appelsin"]) : vælg(["melon", "melon", "appelsin", "æble", "græskar", "kokos", "dåse", "appelsin", "æble", "flaske"]);
      const m = this.nytMål(slags);
      const g = langt ? 7 : 4.6;
      const start = langt ? v3(tilf(-3, 3), 0.6, HYLDE.z - 0.6) : v3(tilf(-0.55, 0.55), 0.45, tilf(-1.25, -0.95));
      const top = langt ? tilf(2.6, 3.6) : tilf(1.55, 1.95);
      this.tilføj(m, start);
      m.tilstand = "kastet"; m.tyngde = g; m.langt = langt;
      m.fart.set((langt ? -start.x * 0.25 : -start.x * 0.9) + tilf(-0.3, 0.3), Math.sqrt(2 * g * (top - start.y)), langt ? tilf(0.2, 0.6) : tilf(0.05, 0.25));
      m.spin.set(tilf(-4, 4), tilf(-4, 4), tilf(-4, 4));
      m.obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      lyd.mekanik("magUd", m.obj.position.x * 0.2);
    }
  }

  // ---------- En kugle rammer et mål ----------
  ramt(m, p, retning, kraft = 1, sværd = false) {
    const pan = Math.max(-1, Math.min(1, p.x / 4)), afstand = p.distanceTo(this.kamera.position);
    switch (m.slags) {
      case "dåse": {
        lyd.træf("dåse", 1, pan, afstand);
        this.effekter.træf("dåse", p, retning.clone().negate(), retning, 0.7);
        // Sodavand sprøjter ud af hullet
        for (let i = 0; i < 14; i++) this.røg.udsend({ pos: p, fart: retning.clone().multiplyScalar(tilf(0.5, 2)).add(rnd(1.5)).add(v3(0, 1, 0)), liv: tilf(0.4, 0.9), str: 0.012, farve: new THREE.Color(0.9, 0.85, 0.75), alfa: 0.8, tyngde: 9, billede: 0 });
        if (m.tilstand !== "kastet") { m.tilstand = "flyver"; m.tyngde = 9.81; }
        m.fart.addScaledVector(retning, 3.2 * kraft).add(v3(tilf(-0.6, 0.6), tilf(2.2, 3.4) * kraft, 0));
        m.spin.add(v3(tilf(-14, 14), tilf(-8, 8), tilf(-14, 14)));
        m.tid = 0; m.hop = 0;
        break;
      }
      case "flaske": this.knus(m, p, retning); break;
      case "ballon": this.pop(m, p); break;
      case "plade": {
        lyd.træf("plade", 1, pan, afstand);
        this.effekter.træf("plade", p, v3(0, 0, 1), retning, 1);
        m.fart -= 3.2 * kraft;
        break;
      }
      default: this.spræng(m, p, retning, kraft);
    }
  }
  // Frugt springer i stykker: kød, skræl, kerner og saft
  spræng(m, p, retning, kraft = 1) {
    const s = FRUGT[m.slags], c = m.obj.getWorldPosition(v3());
    lyd.træf("melon", 1, Math.max(-1, Math.min(1, c.x / 4)), c.distanceTo(this.kamera.position));
    const r = m.radius, kødMat = new THREE.MeshStandardMaterial({ color: s.kød, roughness: 0.45 }), skrælMat = new THREE.MeshStandardMaterial({ color: s.skræl, roughness: 0.6 });
    const antal = r > 0.1 ? 14 : 8;
    for (let i = 0; i < antal; i++) {
      const skræl = i % 3 === 0, k = new THREE.Mesh(vælg(klumpGeo), skræl ? skrælMat : kødMat), st = r * tilf(0.18, 0.32);
      k.scale.set(st, skræl ? st * 0.4 : st, st); k.userData.skala = 1; k.castShadow = true;
      k.position.copy(c).add(rnd(r)); k.scale.multiplyScalar(1); this.scene.add(k);
      k.userData.skala = undefined;
      const s0 = k.scale.clone(); k.userData.væk = () => {}; k.scale.copy(s0);
      this.stumper.tilføj(k, { fart: retning.clone().multiplyScalar(tilf(0.5, 3) * kraft).add(rnd(4)).add(v3(0, tilf(1, 3), 0)), spin: rnd(20), liv: tilf(4, 7), radius: st * 0.6, hop: 0.15, gnid: 0.4, læg: false });
    }
    const saft = new THREE.Color(...s.saft);
    for (let i = 0; i < 40; i++) this.røg.udsend({ pos: c.clone().add(rnd(r * 0.8)), fart: retning.clone().multiplyScalar(tilf(0.3, 2.5)).add(rnd(3.5)).add(v3(0, 1, 0)), liv: tilf(0.5, 1.1), str: tilf(0.01, 0.025), farve: saft, alfa: 0.9, tyngde: 9.8, luft: 0.5 });
    if (m.slags === "melon") for (let i = 0; i < 18; i++) this.røg.udsend({ pos: c.clone().add(rnd(r)), fart: rnd(3).add(v3(0, 1.5, 0)), liv: 1, str: 0.008, farve: new THREE.Color(0.05, 0.03, 0.02), billede: 3, tyngde: 9.8, spin: tilf(-10, 10) });
    this.fjern(m);
  }
  // En flaske knuses: glasskår, glimt og en sprøjt
  knus(m, p, retning) {
    const c = m.obj.getWorldPosition(v3());
    lyd.træf("glas", 1, Math.max(-1, Math.min(1, c.x / 4)), c.distanceTo(this.kamera.position));
    const skårMat = new THREE.MeshPhysicalMaterial({ color: m.farve, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.75, side: THREE.DoubleSide, clearcoat: 1, envMapIntensity: 2.5 });
    for (let i = 0; i < 22; i++) {
      const k = new THREE.Mesh(vælg(skårGeo), skårMat), st = tilf(0.015, 0.045);
      k.scale.setScalar(st); k.userData.skala = st; k.position.copy(c).add(v3(tilf(-0.03, 0.03), tilf(-0.14, 0.14), tilf(-0.03, 0.03))); k.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      this.stumper.tilføj(k, { fart: retning.clone().multiplyScalar(tilf(0.5, 3.5)).add(rnd(3.5)).add(v3(0, tilf(0.5, 2.5), 0)), spin: rnd(30), liv: tilf(3, 6), radius: 0.003, hop: 0.25, gnid: 0.5, læg: true });
    }
    for (let i = 0; i < 26; i++) this.glød.udsend({ pos: c.clone().add(rnd(0.12)), fart: rnd(3).add(retning.clone().multiplyScalar(1.5)), liv: tilf(0.2, 0.6), str: 0.008, farve: new THREE.Color(2, 2.2, 2.4), tyngde: 6, billede: 3, spin: 20 });
    this.fjern(m);
  }
  // En ballon springer: konfetti og gummistumper
  pop(m, p) {
    const c = m.obj.getWorldPosition(v3());
    lyd.træf("ballon", 1, Math.max(-1, Math.min(1, c.x / 4)), c.distanceTo(this.kamera.position));
    const farver = [0xff3b4a, 0xffd23a, 0x3a8bff, 0x3ad06a, 0xff5fc8, 0xffffff, 0xff9a2a].map(f => new THREE.Color(f));
    for (let i = 0; i < 70; i++) this.røg.udsend({ pos: c.clone().add(rnd(0.15)), fart: rnd(5).add(v3(0, 1.5, 0)), liv: tilf(1.6, 3), str: tilf(0.018, 0.03), farve: vælg(farver), billede: 3, tyngde: 1.6, luft: 2.6, spin: tilf(-14, 14) });
    const gummi = new THREE.Color(m.farve);
    for (let i = 0; i < 10; i++) this.røg.udsend({ pos: c.clone().add(rnd(0.1)), fart: rnd(3), liv: 1.2, str: 0.03, farve: gummi, billede: 3, tyngde: 5, luft: 1.5, spin: tilf(-8, 8) });
    this.glød.udsend({ pos: c, liv: 0.08, str: 0.5, farve: new THREE.Color(1.5, 1.5, 1.5), ind: 0.001 });
    if (m.snor) m.snor.removeFromParent();
    this.fjern(m);
  }

  // ---------- Sværdet skærer ----------
  // Klingen og målene sammenlignes på skærmen, så det passer med det, barnet ser (dybden er ligegyldig)
  sværdTjek(sværd, W, H, ild = false) {
    const [a, b] = sværd.klinge(), proj = v => { const p = v.clone().project(this.kamera); return new THREE.Vector2((p.x + 1) / 2 * W, (1 - p.y) / 2 * H); };
    const A = proj(a), B = proj(b);
    const forA = this.sidstA || A, forB = this.sidstB || B;
    this.sidstA = A; this.sidstB = B;
    if (!sværd.tændt || sværd.ude < 0.8 || sværd.fart < 1.2) return;
    const fov = this.kamera.fov * Math.PI / 180;
    for (const m of [...this.alle]) {
      if (m.tilstand !== "kastet" || m.langt) continue;
      const c = m.obj.getWorldPosition(v3()), d = c.distanceTo(this.kamera.position);
      const C = proj(c), rpx = m.radius / (d * Math.tan(fov / 2)) * H / 2 * 1.1 + 6;
      for (let k = 0; k <= 3; k++) {
        const u = k / 3, p1 = forA.clone().lerp(A, u), p2 = forB.clone().lerp(B, u);
        if (afstandTilLinje(C, p1, p2) < rpx) { this.skær(m, sværd, ild); break; }
      }
    }
  }
  skær(m, sværd, ild) {
    const c = m.obj.getWorldPosition(v3()), pan = Math.max(-1, Math.min(1, c.x));
    const akse = sværd.top.clone().sub(sværd.bund).normalize();
    let n = akse.clone().cross(sværd.spidsFart);
    if (n.lengthSq() < 1e-4) n = akse.clone().cross(this.kamera.getWorldDirection(v3()));
    n.normalize();
    lyd.sværdSlag(m.slags === "melon" || FRUGT[m.slags] ? "frugt" : m.slags, pan, !ild);
    if (m.slags === "flaske") { this.knus(m, c, sværd.spidsFart.clone().normalize()); return; }
    const glødFarve = ild ? new THREE.Color(1, 0.35, 0.05) : (sværd.farve ? sværd.farve.clone().multiplyScalar(0.25).add(new THREE.Color(1, 0.45, 0.1)) : new THREE.Color(1, 0.5, 0.1));
    m.obj.updateWorldMatrix(true, true);
    for (const tegn of [1, -1]) {
      const halv = m.obj.clone(true), nn = n.clone().multiplyScalar(tegn);
      const plan = new THREE.Plane().setFromNormalAndCoplanarPoint(nn, c);
      halv.traverse(o => {
        if (!o.isMesh) return;
        o.material = Array.isArray(o.material) ? o.material.map(x => x.clone()) : o.material.clone();
        for (const x of [].concat(o.material)) { x.clippingPlanes = [plan]; x.side = THREE.DoubleSide; indersiden(x, m.inde); }
      });
      this.scene.add(halv); halv.updateWorldMatrix(true, true);
      // Snitfladen: en skive med frugtkød og kerner, lagt præcis i snittet (gløder et øjeblik)
      let låg = null;
      const skal = m.skal ? halv.children[m.obj.children.indexOf(m.skal)] : null;
      if (skal) {
        const nl = nn.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(skal.matrixWorld).transpose()).normalize();
        låg = new THREE.Mesh(new THREE.CircleGeometry(0.985, 48), new THREE.MeshStandardMaterial({ map: snitFlade(m.slags), roughness: 0.4, emissive: glødFarve, emissiveIntensity: 2.5, side: THREE.DoubleSide }));
        låg.quaternion.setFromUnitVectors(v3(0, 0, 1), nl.clone().negate()); låg.position.copy(nl).multiplyScalar(0.004);
        skal.add(låg);
      }
      const lokal = plan.clone().applyMatrix4(halv.matrixWorld.clone().invert());
      this.halvdele.push({ obj: halv, plan, lokal, låg, fart: m.fart.clone().multiplyScalar(0.5).addScaledVector(nn, tilf(0.9, 1.4)).addScaledVector(sværd.spidsFart, 0.08), spin: rnd(6).addScaledVector(nn.clone().cross(akse), tegn * 5), liv: 2.6, ild, glød: 1 });
    }
    // Saft (eller sodavand) sprøjter ud langs snittet + et glimt af lys
    const saft = FRUGT[m.slags] ? new THREE.Color(...FRUGT[m.slags].saft) : new THREE.Color(0.45, 0.22, 0.08);
    for (let i = 0; i < 34; i++) this.røg.udsend({ pos: c.clone().add(rnd(m.radius * 0.6)), fart: n.clone().multiplyScalar(tilf(-2, 2)).addScaledVector(sværd.spidsFart, tilf(0.05, 0.25)).add(rnd(1.2)), liv: tilf(0.5, 1), str: tilf(0.008, 0.02), farve: saft, alfa: 0.9, tyngde: 9.8, luft: 0.5 });
    this.glød.udsend({ pos: c, liv: 0.12, str: m.radius * 4, farve: ild ? new THREE.Color(3, 1.2, 0.2) : (sværd.farve || new THREE.Color(2, 2, 2)).clone().multiplyScalar(0.8), ind: 0.001 });
    if (m.slags === "dåse") this.effekter.gnister(c, sværd.spidsFart.clone().normalize(), 18);
    this.fjern(m);
  }

  // ---------- Hvert billede ----------
  opdater(dt, t, medHylde = true) {
    // Fyld hylden og ballonerne op igen
    for (const p of this.pladser) {
      if (p.mål && p.mål.tilstand === "væk") p.mål = null;
      if (p.mål && p.mål.tilstand !== "står") p.mål = null;
      if (!p.mål && medHylde) {
        p.vent -= dt;
        if (p.vent <= 0) {
          const m = this.nytMål(p.slags);
          const y = HYLDE.y + (m.slags === "dåse" ? 0.0662 : m.slags === "flaske" ? 0.156 : m.skal.scale.y);
          this.tilføj(m, v3(p.x + tilf(-0.08, 0.08), y, HYLDE.z + tilf(-0.06, 0.06)));
          m.tilstand = "står"; m.vokser = 0.001; m.obj.scale.setScalar(0.001); m.obj.rotation.y = Math.random() * 6;
          p.mål = m; p.vent = tilf(2.2, 3.2);
          lyd.plop(p.x / 5);
          for (let i = 0; i < 10; i++) this.glød.udsend({ pos: m.obj.position.clone().add(rnd(0.2)), fart: rnd(0.6).add(v3(0, 0.5, 0)), liv: 0.6, str: 0.02, farve: new THREE.Color(2.5, 2.2, 1.4), luft: 2 });
        }
      }
    }
    for (const b of this.ballonPladser) {
      if (b.mål && b.mål.tilstand === "væk") b.mål = null;
      if (!b.mål && medHylde) {
        b.vent -= dt;
        if (b.vent <= 0) {
          const m = this.nytMål("ballon"); this.tilføj(m, v3(b.x, b.y, HYLDE.z - 0.15)); m.tilstand = "svæver"; m.vokser = 0.001; m.obj.scale.setScalar(0.001); m.fase = Math.random() * 6; m.plads = b;
          const snor = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v3(), v3()]), new THREE.LineBasicMaterial({ color: 0xdddddd })); this.scene.add(snor); m.snor = snor;
          b.mål = m; b.vent = tilf(2.5, 3.5);
        }
      }
    }
    // Alle mål: vokser frem, svæver, flyver og hopper
    for (const m of [...this.alle]) {
      if (m.vokser > 0) { m.vokser = Math.min(1, m.vokser + dt * 3.2); const e = m.vokser, s = 1 + Math.sin(e * Math.PI) * 0.25 * (1 - e); m.obj.scale.setScalar(Math.max(0.001, e * s)); if (e >= 1) m.vokser = 0; }
      if (m.tilstand === "svæver") {
        const b = m.plads, w = Math.sin(t * 1.3 + m.fase) * 0.06, w2 = Math.cos(t * 0.9 + m.fase) * 0.04;
        m.obj.position.set(b.x + w, b.y + Math.sin(t * 1.7 + m.fase) * 0.03, HYLDE.z - 0.15 + w2); m.obj.rotation.z = -w * 1.5;
        const knude = m.obj.position.clone().add(v3(0, -0.18, 0)), pæl = v3(b.x > 0 ? b.x + 0.1 : b.x - 0.1, HYLDE.y + 0.02, HYLDE.z + 0.12);
        m.snor.geometry.setFromPoints([knude, knude.clone().lerp(pæl, 0.5).add(v3(w * 0.5, 0, 0)), pæl]);
      }
      if (m.tilstand === "flyver" || m.tilstand === "kastet") {
        m.tid += dt;
        m.fart.y -= m.tyngde * dt;
        m.obj.position.addScaledVector(m.fart, dt);
        const w = m.spin.length(); if (w > 1e-3) m.obj.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(m.spin.clone().divideScalar(w), w * dt));
        const bund = this.gulv(m.obj.position.x, m.obj.position.z) + (m.slags === "dåse" ? 0.045 : m.radius * 0.8);
        if (m.tilstand === "kastet" && !m.langt && m.fart.y < 0 && m.obj.position.y < 0.5) { this.fjern(m); continue; }
        if (m.obj.position.y < bund && m.fart.y < 0) {
          if (m.slags !== "dåse" && m.tilstand === "kastet") { if (m.slags === "flaske") this.knus(m, m.obj.position, v3(0, -1, 0)); else this.spræng(m, m.obj.position, v3(0, -1, 0), 0.5); continue; }
          m.obj.position.y = bund;
          if (-m.fart.y > 0.8) lyd.træf("dåse", Math.min(1, -m.fart.y / 5) * 0.6, m.obj.position.x / 4, 9);
          m.fart.y = -m.fart.y * 0.32; m.fart.x *= 0.6; m.fart.z *= 0.6; m.spin.multiplyScalar(0.6);
          if (Math.abs(m.fart.y) < 0.3) { m.fart.y = 0; m.spin.multiplyScalar(0.85); }
        }
        if (m.tid > 7 || m.obj.position.y < -1) this.fjern(m);
      }
    }
    // Stålgongerne svinger som et pendul
    for (const g of this.gonger) { g.fart += (-g.vinkel * 26 - g.fart * 1.6) * dt; g.vinkel += g.fart * dt; g.sving.rotation.x = g.vinkel; }
    // De overskårne halvdele falder, drejer, og klippefladen følger med
    for (const h of [...this.halvdele]) {
      h.liv -= dt;
      h.fart.y -= 5 * dt;
      h.obj.position.addScaledVector(h.fart, dt);
      const w = h.spin.length(); if (w > 1e-3) h.obj.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(h.spin.clone().divideScalar(w), w * dt));
      h.obj.updateWorldMatrix(true, true);
      h.plan.copy(h.lokal).applyMatrix4(h.obj.matrixWorld);
      h.glød = Math.max(0, h.glød - dt * (h.ild ? 0.5 : 0.9));
      if (h.låg) h.låg.material.emissiveIntensity = h.glød * h.glød * 2.5;
      if (h.ild && Math.random() < dt * 30 * h.glød) this.glød.udsend({ pos: h.obj.position.clone().add(rnd(0.08)), fart: v3(0, 0.5, 0).add(rnd(0.2)), liv: 0.4, str: 0.04, strSlut: 0.07, farve: new THREE.Color(3, 2, 0.8), farveSlut: new THREE.Color(1.5, 0.3, 0.05), billede: 2, rot: 0, ind: 0.2 });
      if (h.liv <= 0 || h.obj.position.y < 0.3) { h.obj.removeFromParent(); this.halvdele.splice(this.halvdele.indexOf(h), 1); }
    }
  }
}

function afstandTilLinje(p, a, b) {
  const ab = b.clone().sub(a), l2 = ab.lengthSq();
  const t = l2 > 0 ? Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / l2)) : 0;
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}
