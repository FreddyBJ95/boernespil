// ===== Køretøjer: snescootere i Fjeldbyen og gaffeltrucks på Havnen =====
// Gå hen til et køretøj og tryk E for at stige ind (og E igen for at stige ud). W og S er gas og bremse/bak,
// A og D styrer. Man kan ikke skyde, mens man kører — men kører man stærkt ind i en fjende, vælter den.
// Et køretøj, der holder stille, er fast — man kan søge dækning bag det.

import * as THREE from "./three.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

// Hvert slags køretøj: modellen, hvor stærkt det kører, hvor hurtigt det drejer, hvor langt det når frem og
// tilbage fra midten, den halve bredde, højden — og hvor højt over sædet førerens øjne er
const TYPER = {
  snescooter: { fil: "modeller/snescooter.glb", maks: 15, accel: 7, bremse: 14, drej: 1.9, for: 1.72, bag: 1.38, bredde: 0.55, højde: 1.25, øje: 0.8 },
  gaffeltruck: { fil: "modeller/gaffeltruck.glb", maks: 6.5, accel: 4, bremse: 9, drej: 1.5, for: 2.2, bag: 1.3, bredde: 0.65, højde: 2.2, øje: 0.78 },
};

export class Køretøjer {
  // k: { scene, verden, liste ([type, x, z, yaw] fra banen), kampfolk(), spiller, ramVæltet(bot, fart) }
  constructor(k) {
    this.k = k; this.alle = []; this.kører = null;
    const loader = new GLTFLoader();
    for (const [type, x, z, yaw] of k.liste || []) {
      const t = TYPER[type], v = { type, t, model: new THREE.Group(), pos: new THREE.Vector3(x, 0, z), yaw, fart: 0, sæde: new THREE.Vector3(0, 0.7, 0), kasser: [] };
      v.pos.y = Math.max(0, k.verden.gulv(x, 2, z));
      k.scene.add(v.model);
      loader.loadAsync(t.fil).then(g => {
        const m = g.scene; m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
        const s = m.getObjectByName("saede"); if (s) v.sæde.copy(s.position);
        v.model.add(m);
      }).catch(() => {});
      this.alle.push(v); this.parkér(v);
    }
  }
  // Køretøjet fylder en række punkter fra bagenden til forenden (hvert med den halve bredde rundt om sig)
  punkter(v, x = v.pos.x, z = v.pos.z, yaw = v.yaw) {
    const t = v.t, fx = -Math.sin(yaw), fz = -Math.cos(yaw), span = t.for + t.bag - 2 * t.bredde;
    const n = Math.max(2, Math.ceil(span / t.bredde) + 1), ud = [];
    for (let i = 0; i < n; i++) { const d = -t.bag + t.bredde + span * i / (n - 1); ud.push([x + fx * d, z + fz * d]); }
    return ud;
  }
  // Et køretøj, der holder stille, er faste kasser (så man ikke går igennem det, og kugler rammer det)
  parkér(v) {
    const r = v.t.bredde, h = v.pos.y + v.t.højde * 0.7;
    v.kasser = this.punkter(v).map(([x, z]) => Object.assign(this.k.verden.tilføj(x - r, v.pos.y, z - r, x + r, h, z + r, "metal"), { ingenHul: true }));   // (skudhuller ville hænge i luften, når det kører væk)
  }
  // Det nærmeste køretøj, man kan stige ind i (højst 2,5 m væk)
  nærmeste(pos) {
    let bedst = null, bd = 2.5;
    for (const v of this.alle) { const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z); if (d < bd && !this.kører) { bd = d; bedst = v; } }
    return bedst;
  }
  stigInd(v) { this.kører = v; for (const k of v.kasser) this.k.verden.fjern(k); v.kasser = []; }
  // Stig ud: ved siden af køretøjet (venstre side — eller højre, hvis der ikke er plads)
  stigUd() {
    const v = this.kører; if (!v) return null;
    this.kører = null; v.fart = 0; this.parkér(v);
    for (const side of [1, -1]) {
      const x = v.pos.x - Math.cos(v.yaw) * side * (v.t.bredde + 0.9), z = v.pos.z + Math.sin(v.yaw) * side * (v.t.bredde + 0.9);
      if (this.k.verden.fri(x, v.pos.y + 0.05, z, 0.42, 1.8)) return new THREE.Vector3(x, v.pos.y + 0.02, z);
    }
    return new THREE.Vector3(v.pos.x, v.pos.y + v.t.højde + 0.1, v.pos.z);   // (ellers ovenpå)
  }
  // Hvert tick, mens man kører: gas, bremse og styring — stop ved mure, og væltede fjender
  tick(dt, frem, side) {
    const v = this.kører; if (!v) return;
    const t = v.t, retning = Math.sign(v.fart);
    if (frem && (Math.sign(frem) === retning || Math.abs(v.fart) < 0.3)) v.fart += frem * t.accel * dt;   // gas (frem eller bak)
    else if (frem) v.fart += frem * t.bremse * dt;                      // bremse
    else v.fart *= Math.exp(-dt * 0.9);                                  // ruller ud
    v.fart = Math.max(-t.maks * 0.4, Math.min(t.maks, v.fart));
    const yaw = v.yaw - side * t.drej * dt * Math.min(1, Math.abs(v.fart) / 3) * Math.sign(v.fart || 1);
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), nx = v.pos.x + fx * v.fart * dt, nz = v.pos.z + fz * v.fart * dt;
    const g = this.k.verden.gulv(nx, v.pos.y + 0.6, nz), y = Math.max(g, v.pos.y) + 0.35;
    const fri = g > -1 && this.punkter(v, nx, nz, yaw).every(([x, z]) => this.k.verden.fri(x, y, z, t.bredde, t.højde - 0.35));
    if (fri) { v.pos.set(nx, Math.max(0, g), nz); v.yaw = yaw; }
    else v.fart *= -0.25;                                                // ind i en mur: et lille tilbageslag
    // kører man stærkt ind i nogen, vælter de
    if (Math.abs(v.fart) > 5) for (const f of this.k.kampfolk()) {
      if (f.erSpiller || f.død || Math.abs(f.a.pos.y - v.pos.y) > 1.5) continue;
      if (this.punkter(v).some(([x, z]) => Math.hypot(f.a.pos.x - x, f.a.pos.z - z) < t.bredde + 0.45)) this.k.ramVæltet(f, v);
    }
  }
  // Førerens plads i verdenen (til kameraet og til at blive ramt)
  førerPos(ud) {
    const v = this.kører, c = Math.cos(v.yaw), s = Math.sin(v.yaw);
    return ud.set(v.pos.x + v.sæde.x * c + v.sæde.z * s, v.pos.y + v.sæde.y, v.pos.z - v.sæde.x * s + v.sæde.z * c);
  }
  // Hvert billede: modellerne står, hvor køretøjerne er
  tegn() { for (const v of this.alle) { v.model.position.copy(v.pos); v.model.rotation.y = v.yaw; } }
}
