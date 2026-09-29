// ===== Kampvogne i Broekraft =====
// En kampvogn er bygget af klodser: to bælter, en krop og et tårn med kanon, der kan dreje for sig.
// Børnenes kampvogne er grønne. De fjendtlige legetøjskampvogne er farvede og har store øjne.
// Næsen (kanonen) peger mod +z ligesom dyrenes, så yaw = 0 kører mod +z.

import * as THREE from "./three.js";

const KASSE = new THREE.BoxGeometry(1, 1, 1);
const tmp = new THREE.Vector3();
export const KV_B = 1.15, KV_H = 1.6;                              // halv bredde og højde (til kollision)

function byggModel(farve, øjne) {
  const g = new THREE.Group(), lak = [];
  const klods = (b, h, d, f, x, y, z, { lys = false, lakeret = false } = {}) => {
    const m = new THREE.Mesh(KASSE, lys ? new THREE.MeshBasicMaterial({ color: f }) : new THREE.MeshLambertMaterial({ color: f }));
    m.scale.set(b, h, d); m.position.set(x, y, z);
    if (lakeret) lak.push(m.material);
    return m;
  };
  const mørk = new THREE.Color(farve).multiplyScalar(0.7).getStyle();
  for (const s of [-1, 1]) {                                       // bælter med hjul
    g.add(klods(0.55, 0.62, 3.3, "#2d2d2d", s * 0.98, 0.31, 0));
    for (let i = 0; i < 4; i++) g.add(klods(0.6, 0.3, 0.3, "#6b6b6b", s * 0.98, 0.31, -1.2 + i * 0.8));
  }
  g.add(klods(1.5, 0.62, 2.9, farve, 0, 0.85, 0, { lakeret: true }), klods(1.54, 0.12, 2.94, mørk, 0, 0.58, 0));
  const tårn = new THREE.Group(); tårn.position.set(0, 1.16, -0.15);
  const kanon = new THREE.Group(); kanon.position.set(0, 0.3, 0.55);
  kanon.add(klods(0.22, 0.22, 1.7, "#3a3a3a", 0, 0, 0.85), klods(0.3, 0.3, 0.25, "#2a2a2a", 0, 0, 1.7));
  tårn.add(klods(1.15, 0.55, 1.3, farve, 0, 0.27, 0, { lakeret: true }), klods(0.34, 0.12, 0.34, "#3a3a3a", 0.3, 0.6, -0.25), kanon);
  if (øjne) for (const s of [-1, 1]) {                             // store, glade øjne foran på tårnet
    tårn.add(klods(0.34, 0.34, 0.06, "#ffffff", s * 0.3, 0.33, 0.66, { lys: true }), klods(0.16, 0.18, 0.07, "#1a1a1a", s * 0.28, 0.3, 0.68, { lys: true }));
  } else tårn.add(klods(0.3, 0.3, 0.05, "#ffffff", 0, 0.3, -0.66, { lys: true }), klods(0.18, 0.18, 0.06, "#e03a3a", 0, 0.3, -0.67, { lys: true }));
  g.add(tårn);
  return { g, tårn, kanon, lak };
}

export class Kampvogn {
  // model: en anden krop (biler.js bruger den til brandbiler, ambulancer og politibiler) · fart: blokke pr. sekund
  constructor(scene, verden, { farve = "#5a8a3a", fjende = false, model = byggModel, fart = 6.5 } = {}) {
    Object.assign(this, { scene, verden, fjende, fart });
    const m = model(farve, fjende);
    Object.assign(this, { model: m.g, tårn: m.tårn, kanon: m.kanon, lak: m.lak });
    scene.add(this.model);
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = Math.random() * Math.PI * 2; this.tårnYaw = this.yaw;
    this.liv = fjende ? 6 : Infinity; this.rekyl = 0; this.blink = 0; this.t = Math.random() * 10; this.jord = false; this.blokeret = false;
  }

  // frem: -1..1 (tilbage/frem) · drej: -1..1 (venstre/højre)
  kør(frem, drej, dt, tyngde) {
    this.yaw -= drej * dt * 1.7;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), fart = frem * this.fart;
    this.vel.x += (fx * fart - this.vel.x) * Math.min(1, dt * 4);
    this.vel.z += (fz * fart - this.vel.z) * Math.min(1, dt * 4);
    this.vel.y = Math.max(-30, this.vel.y - tyngde * dt);
    const førX = this.pos.x, førZ = this.pos.z;
    const r = this.verden.bevæg(this.pos, tmp.copy(this.vel).multiplyScalar(dt), KV_B, KV_H);
    if (r.jord) this.vel.y = 0;
    if (r.loft) this.vel.y = Math.min(0, this.vel.y);
    this.jord = r.jord;
    if (r.væg && this.jord && Math.abs(frem) > 0.1) {             // kør selv op over en kant — op til tre blokke høj
      let op = 0;
      for (const h of [1, 2, 3]) {
        tmp.copy(this.pos); tmp.y += h + 0.05; tmp.x += fx * 0.5 * Math.sign(frem); tmp.z += fz * 0.5 * Math.sign(frem);
        if (!this.verden.kolliderer(tmp, KV_B, KV_H)) { op = h; break; }
      }
      if (op) this.vel.y = Math.sqrt(2 * tyngde * (op + 0.4)); else this.blokeret = true;
    }
    // Sidder kampvognen fast (fx i et dybt hul)? Så hopper den selv op efter et øjeblik
    const flyttet = Math.hypot(this.pos.x - førX, this.pos.z - førZ) / Math.max(dt, 1e-4);
    this.fast = Math.abs(frem) > 0.1 && flyttet < 0.6 ? (this.fast || 0) + dt : 0;
    if (flyttet > 2) this.redning = 0;
    if (this.fast > 1.2 && this.jord) {                           // hver gang den stadig sidder fast, hopper den højere
      this.hop(Math.min(2, 1.25 + 0.35 * (this.redning || 0)));
      this.redning = (this.redning || 0) + 1; this.fast = 0;
    }
  }
  // Hop! (knappen ⬆ i kampvognen) — styrke 1 er godt to blokke op
  hop(styrke = 1) {
    if (!this.jord) return false;
    this.vel.y = 11 * styrke; this.jord = false;
    return true;
  }

  // Drej tårnet blødt mod en retning (yaw i verden)
  sigt(målYaw, dt, fart = 2.6) {
    let d = målYaw - this.tårnYaw;
    d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.tårnYaw += Math.max(-fart * dt, Math.min(fart * dt, d));
  }

  // Hvor kuglen kommer ud, og hvilken vej kanonen peger
  munding() {
    const r = new THREE.Vector3(Math.sin(this.tårnYaw), 0.08, Math.cos(this.tårnYaw)).normalize();
    return { pos: this.pos.clone().add(new THREE.Vector3(0, 1.46, 0)).addScaledVector(r, 2.2), retning: r };
  }
  skudt() { this.rekyl = 1; }

  træf(n = 1) { this.liv -= n; this.blink = 0.18; return this.liv <= 0; }
  mal(farve) { for (const m of this.lak) m.color.set(farve); }
  rammer(p, ekstra = 0) {                                          // er punktet p inde i kampvognen?
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z, dy = p.y - this.pos.y;
    return Math.hypot(dx, dz) < 1.6 + ekstra && dy > -0.3 - ekstra && dy < 2 + ekstra;
  }

  opdater(dt) {
    this.t += dt;
    this.rekyl = Math.max(0, this.rekyl - dt * 4);
    this.blink = Math.max(0, this.blink - dt);
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.yaw;
    this.tårn.rotation.y = this.tårnYaw - this.yaw;
    this.kanon.position.z = 0.55 - this.rekyl * 0.35;
    const hvid = this.blink > 0 ? 0.8 : 0;
    for (const m of this.lak) m.emissive?.setScalar(hvid);
    if (this.fjende) this.model.position.y += Math.abs(Math.sin(this.t * 7)) * 0.04 * Math.min(1, Math.hypot(this.vel.x, this.vel.z));
  }

  fjern() {
    this.scene.remove(this.model);
    this.model.traverse(c => { if (c.material) c.material.dispose(); });
  }
}
