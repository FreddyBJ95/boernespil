// ===== Våbnet i hånden: modellerne, rekylen, svaj, gang, genladning og mundingsglimt =====
// Våbnet tegnes i sin egen lille scene oven på verdenen (så det aldrig stikker ind i en mur).

import * as THREE from "./three.js";

const M = {
  metal: new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.75, roughness: 0.42 }),
  lys: new THREE.MeshStandardMaterial({ color: 0x4a4d52, metalness: 0.8, roughness: 0.35 }),
  træ: new THREE.MeshStandardMaterial({ color: 0x7a4626, roughness: 0.65 }),
  oliven: new THREE.MeshStandardMaterial({ color: 0x4d5a32, roughness: 0.7, metalness: 0.15 }),
  klinge: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.95, roughness: 0.18 }),
  sort: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.8 }),
  ærme: new THREE.MeshStandardMaterial({ color: 0xb59468, roughness: 0.95 }),
  handske: new THREE.MeshStandardMaterial({ color: 0x222120, roughness: 0.9 }),
  glas: new THREE.MeshStandardMaterial({ color: 0x2a4a5a, metalness: 0.6, roughness: 0.1 }),
};
const kasse = (g, w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); g.add(k); return k; };
const rør = (g, r, l, m, x, y, z, seg = 12) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg), m); k.rotation.x = Math.PI / 2; k.position.set(x, y, z); g.add(k); return k; };

// Hænderne: to ærmer med handsker (højre ved grebet, venstre foran)
function hænder(g, venstre, højre) {
  const arm = (p, rot) => {
    const a = new THREE.Group(); a.position.set(...p); a.rotation.set(...rot);
    kasse(a, 0.058, 0.058, 0.32, M.ærme, 0, 0, 0.19); kasse(a, 0.064, 0.064, 0.05, M.ærme, 0, 0, 0.36);   // ærmet og en ærmekant
    kasse(a, 0.05, 0.045, 0.09, M.handske, 0, -0.004, -0.005); kasse(a, 0.045, 0.02, 0.05, M.handske, -0.012, 0.02, -0.03);   // hånden og tommelfingeren
    g.add(a);
  };
  if (højre) arm(højre, [0.55, 0.28, 0]);
  if (venstre) arm(venstre, [0.7, -0.45, 0.15]);
}
// Stormgeværet: træskæfte, buet magasin, gasrør og sigte
function stormgevær() {
  const g = new THREE.Group();
  kasse(g, 0.055, 0.075, 0.3, M.metal, 0, 0, 0);
  rør(g, 0.011, 0.36, M.metal, 0, 0.012, -0.32);
  rør(g, 0.01, 0.2, M.lys, 0, 0.04, -0.24);
  kasse(g, 0.064, 0.058, 0.17, M.træ, 0, 0.004, -0.22);
  kasse(g, 0.012, 0.035, 0.012, M.metal, 0, 0.045, -0.46);
  kasse(g, 0.03, 0.02, 0.03, M.metal, 0, 0.05, -0.05);
  kasse(g, 0.042, 0.12, 0.06, M.metal, 0, -0.085, -0.07, 0.22);
  kasse(g, 0.04, 0.1, 0.058, M.metal, 0, -0.18, -0.1, 0.5);
  kasse(g, 0.034, 0.085, 0.04, M.sort, 0, -0.07, 0.085, -0.35);
  kasse(g, 0.042, 0.07, 0.24, M.træ, 0, -0.02, 0.26, 0.08);
  g.userData = { munding: new THREE.Vector3(0, 0.012, -0.51), venstre: [-0.02, -0.06, -0.24], højre: [0.0, -0.08, 0.09] };
  return g;
}
// Snigskytten: lang pibe, kikkert og grønt skæfte
function snigskytte() {
  const g = new THREE.Group();
  kasse(g, 0.06, 0.075, 0.4, M.oliven, 0, 0, 0.02);
  rør(g, 0.013, 0.62, M.metal, 0, 0.01, -0.48);
  rør(g, 0.024, 0.28, M.sort, 0, 0.075, -0.02, 16);
  rør(g, 0.03, 0.04, M.sort, 0, 0.075, -0.17, 16); rør(g, 0.028, 0.04, M.sort, 0, 0.075, 0.13, 16);
  const linse = rør(g, 0.022, 0.005, M.glas, 0, 0.075, -0.19, 16);
  kasse(g, 0.02, 0.03, 0.02, M.metal, 0, 0.045, -0.06); kasse(g, 0.02, 0.03, 0.02, M.metal, 0, 0.045, 0.05);
  const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), M.lys); bolt.position.set(0.045, 0.02, 0.08); g.add(bolt);
  kasse(g, 0.036, 0.09, 0.045, M.oliven, 0, -0.07, 0.13, -0.3);
  kasse(g, 0.05, 0.09, 0.26, M.oliven, 0, -0.02, 0.33, 0.06);
  kasse(g, 0.04, 0.08, 0.05, M.metal, 0, -0.07, -0.04, 0.1);
  g.userData = { munding: new THREE.Vector3(0, 0.01, -0.8), venstre: [-0.02, -0.05, -0.2], højre: [0.0, -0.08, 0.14], linse };
  return g;
}
// Pistolen
function pistol() {
  const g = new THREE.Group();
  kasse(g, 0.034, 0.036, 0.19, M.lys, 0, 0.03, -0.03);
  kasse(g, 0.031, 0.028, 0.16, M.metal, 0, 0.0, -0.02);
  kasse(g, 0.033, 0.11, 0.045, M.sort, 0, -0.06, 0.05, -0.25);
  kasse(g, 0.008, 0.012, 0.008, M.metal, 0, 0.053, -0.11);
  rør(g, 0.006, 0.01, M.sort, 0, 0.03, -0.126);
  g.userData = { munding: new THREE.Vector3(0, 0.03, -0.13), venstre: [-0.03, -0.07, 0.04], højre: [0.0, -0.07, 0.06] };
  return g;
}
// Kniven
function kniv() {
  const g = new THREE.Group();
  const form = new THREE.Shape(); form.moveTo(0, 0); form.lineTo(0.2, 0.012); form.lineTo(0.215, 0.03); form.lineTo(0, 0.034); form.lineTo(0, 0);
  const klinge = new THREE.Mesh(new THREE.ExtrudeGeometry(form, { depth: 0.004, bevelEnabled: false }), M.klinge);
  klinge.rotation.y = Math.PI / 2; klinge.position.set(-0.002, -0.017, -0.02); g.add(klinge);
  kasse(g, 0.028, 0.04, 0.012, M.metal, 0, 0, 0.0);
  kasse(g, 0.026, 0.034, 0.12, M.sort, 0, -0.002, 0.07);
  g.userData = { munding: new THREE.Vector3(0, 0, -0.2), venstre: null, højre: [0.0, -0.03, 0.08] };
  return g;
}
const BYG = { gevær: stormgevær, snig: snigskytte, pistol, kniv };
const PLADS = { gevær: [0.2, -0.22, -0.52], snig: [0.19, -0.2, -0.5], pistol: [0.17, -0.18, -0.42], kniv: [0.2, -0.19, -0.38] };

export class Hånd {
  constructor(t) {
    this.scene = new THREE.Scene();
    this.kamera = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
    this.scene.add(new THREE.HemisphereLight(0xfff2dd, 0x6a5a40, 1.4));
    const sol = new THREE.DirectionalLight(0xffe6c0, 2.2); sol.position.set(1, 2, 1.5); this.scene.add(sol);
    this.rod = new THREE.Group(); this.scene.add(this.rod);
    this.modeller = {};
    for (const [id, byg] of Object.entries(BYG)) {
      const g = byg(), holder = new THREE.Group();
      holder.add(g); hænder(holder, g.userData.venstre, g.userData.højre);
      holder.visible = false; this.rod.add(holder);
      this.modeller[id] = { holder, g };
    }
    const glimtMat = new THREE.MeshBasicMaterial({ map: t.glimt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glimt = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), glimtMat); this.glimt.visible = false; this.scene.add(this.glimt);
    Object.assign(this, { aktiv: null, træk: 0, spark: 0, sparkRot: 0, fase: 0, svajX: 0, svajY: 0, glimtTid: 0, genlad: 0, genladTid: 1, hug: 0, land: 0 });
  }
  // Skift våben: det nye kommer op fra neden
  vis(id, trækTid) {
    for (const [k, m] of Object.entries(this.modeller)) m.holder.visible = k === id;
    this.aktiv = id; this.træk = 1; this.trækTid = trækTid; this.genlad = 0;
  }
  skud() {
    this.spark = this.aktiv === "snig" ? 1.6 : this.aktiv === "pistol" ? 0.8 : 1;
    if (this.aktiv === "kniv") { this.hug = 1; return; }
    const m = this.modeller[this.aktiv];
    m.g.updateWorldMatrix(true, false);
    this.glimt.position.copy(m.g.userData.munding).applyMatrix4(m.g.matrixWorld);
    this.glimt.rotation.z = Math.random() * 6.3; this.glimt.scale.setScalar(0.8 + Math.random() * 0.6);
    this.glimt.visible = true; this.glimtTid = 0.035;
  }
  genladStart(tid) { this.genlad = 1; this.genladTid = tid; }
  // Hvor sidder mundingen i verdenen? (til sporet af kuglen) — regnet ud fra kameraet
  munding(verdensKamera, ud) {
    return ud.set(0.12, -0.1, -0.6).applyMatrix4(verdensKamera.matrixWorld);
  }
  // Hvert billede: rekyl, svaj med musen, gang og animationer
  opdater(dt, s) {
    // s: { fart (0..1), jord, musX, musY, duk, skjul (kikkert) }
    this.rod.visible = !s.skjul;
    const id = this.aktiv; if (!id) return;
    const m = this.modeller[id], p = PLADS[id];
    this.træk = Math.max(0, this.træk - dt / (this.trækTid || 0.5));
    this.spark *= Math.exp(-dt * 16);
    this.hug = Math.max(0, this.hug - dt * 3.2);
    if (this.genlad > 0) this.genlad = Math.max(0, this.genlad - dt / this.genladTid);
    this.land *= Math.exp(-dt * 9); if (s.landet) this.land = 1;
    this.fase += dt * (s.jord ? 9.5 : 0) * Math.min(1, s.fart * 1.2);
    this.svajX += (Math.max(-0.04, Math.min(0.04, -s.musX * 0.0009)) - this.svajX) * Math.min(1, dt * 10);
    this.svajY += (Math.max(-0.04, Math.min(0.04, s.musY * 0.0009)) - this.svajY) * Math.min(1, dt * 10);
    const gang = s.jord ? Math.min(1, s.fart) : 0.2, dyk = Math.sin(Math.PI * this.genlad), trk = this.træk * this.træk;
    m.holder.position.set(p[0] + Math.sin(this.fase) * 0.011 * gang + this.svajX, p[1] - Math.abs(Math.cos(this.fase)) * 0.009 * gang - this.svajY - 0.07 * dyk - 0.25 * trk - 0.02 * this.land - 0.012 * s.duk,
      p[2] + 0.045 * this.spark);
    m.holder.rotation.set(0.07 * this.spark - 0.32 * dyk + 0.7 * trk + 0.02 * this.land, this.svajX * 2, 0.45 * dyk + this.svajX);
    if (id === "kniv") { const h = Math.sin(this.hug * Math.PI); m.holder.rotation.y += h * 0.9; m.holder.rotation.x -= h * 0.4; m.holder.position.x -= h * 0.08; }
    if (this.glimtTid > 0 && (this.glimtTid -= dt) <= 0) this.glimt.visible = false;
  }
  tilpas(aspekt) { this.kamera.aspect = aspekt; this.kamera.updateProjectionMatrix(); }
}
