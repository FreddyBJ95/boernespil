// ===== NUKE-banen: svampeskyer, missiler og den røde knap =====
// Atombomber og missiler giver et kæmpe glimt, en trykbølge og en svampesky. Ingen kommer til skade:
// zombierne bliver til konfetti, og alle andre bliver bare blæst lidt væk (eksploder i spil.js).
//  Et missil bygges af Missil-blokke med en Missilspids på toppen. Tænd det med 🔥 eller 🔨, så flyver det
//  væk fra en. Den røde Affyringsknap sender alle missiler i nærheden af sted efter en nedtælling —
//  mod Dukkebyen, hvis verdenen har en (cfg.atommål). Missiler fra knappen bliver bygget igen lidt efter.
//  Jo længere missilet er, jo større bliver braget: 1–3 blokke = lille, 4–8 = atom, 9 eller flere = kæmpe.

import * as THREE from "./three.js";
import { ID } from "./blokke.js";

// Hvor stor sprængningen er: R = radius i blokke, sky = svampeskyens størrelse
export const STØRRELSE = { mini: { R: 5, sky: 0.55 }, atom: { R: 9, sky: 1 }, kæmpe: { R: 13, sky: 1.5 } };
const KASSE = new THREE.BoxGeometry(1, 1, 1), KEGLE = new THREE.ConeGeometry(1, 1, 12);
const GRÅ = new THREE.Color("#8a8580"), ORANGE = new THREE.Color("#ff8a2a"), GUL = new THREE.Color("#ffc050");
const RØG = new THREE.Color("#c8c4be"), MØRKRØG = new THREE.Color("#8a8680");
const ILD = ["#fff3a0", "#ffd23f", "#ff8c1a", "#ff4d2e"].map(f => new THREE.Color(f));
const GNIST = ["#ffffff", "#fff3a0", "#8aff5a"].map(f => new THREE.Color(f));
const OP = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
const LØFT = 1.6;                                                // sekunder, hvor missilet letter lige op

// Et punkt på en blød kurve gennem fire punkter (Bézier) — og retningen i punktet
function kurve(P, u, ud) {
  const v = 1 - u;
  return ud.set(0, 0, 0).addScaledVector(P[0], v * v * v).addScaledVector(P[1], 3 * v * v * u).addScaledVector(P[2], 3 * v * u * u).addScaledVector(P[3], u * u * u);
}
function kurveRetning(P, u, ud) {
  const v = 1 - u;
  return ud.set(0, 0, 0).addScaledVector(P[0], -3 * v * v).addScaledVector(P[1], 3 * v * v - 6 * u * v).addScaledVector(P[2], 6 * u * v - 3 * u * u).addScaledVector(P[3], 3 * u * u);
}

export class Atom {
  // spil: { scene, verden, sp, partikel(x,y,z,farve,vx,vy,vz,liv,g,str), lyd, sprængning(x,y,z,slags), sæt(x,y,z,id),
  //         online, tal(n), besked(tekst,ms), mål: [x, z] eller null, ryst(styrke), del(slags, data) → sammen: vis det for de andre }
  constructor(spil) {
    this.s = spil;
    this.skyer = []; this.missiler = []; this.genlad = [];
    this.nedtæl = null;                                          // den røde knap tæller ned
  }

  // ---------- Svampeskyen: stamme, hat, en ring ved foden, en krave og en hvid kugle i midten ----------
  svampesky(x, y, z, str = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(str); this.s.scene.add(g);
    // skyen får lys og skygge (Lambert), så man kan se de enkelte klumper — og tågen må ikke gøre den grå
    const mat = f => new THREE.MeshLambertMaterial({ color: f, emissive: new THREE.Color(f).multiplyScalar(0.5), transparent: true, fog: false });
    const m = { stamme: mat("#ff8a2a"), hat: mat("#ffb040"), fod: mat("#c8a070"), krave: mat("#f4f0ea"),
      kerne: new THREE.MeshBasicMaterial({ color: "#fffbe0", transparent: true, depthWrite: false, fog: false }) };
    const puf = [], ny = (del, data) => { const k = new THREE.Mesh(KASSE, m[del]); g.add(k); puf.push({ k, del, ...data }); };
    for (let i = 0; i < 18; i++) ny("stamme", { h: i / 17, v: Math.random() * 6.3, r: Math.random() * 0.8, s: 2 + Math.random() * 1.4 });
    for (let i = 0; i < 34; i++) ny("hat", { v: i / 34 * Math.PI * 2 + Math.random() * 0.2, r: 0.35 + Math.random() * 0.65, dy: (Math.random() - 0.35) * 1.4, s: 2.6 + Math.random() * 2.4 });
    for (let i = 0; i < 20; i++) ny("fod", { v: i / 20 * Math.PI * 2, r: 0.7 + Math.random() * 0.3, s: 1.8 + Math.random() * 1.4 });
    for (let i = 0; i < 16; i++) ny("krave", { v: i / 16 * Math.PI * 2, s: 1.2 + Math.random() * 0.8 });
    ny("kerne", { s: 1 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    ring.position.y = 0.6; g.add(ring);
    this.skyer.push({ g, puf, m, ring, t: 0 });
  }
  opdaterSkyer(dt) {
    for (const s of [...this.skyer]) {
      s.t += dt;
      const t = s.t, T = 11, k = 1 - Math.pow(1 - Math.min(1, t / 3.5), 3), H = 3 + 20 * k, CR = 2 + 7.5 * (1 - Math.pow(1 - Math.min(1, t / 4.5), 3));
      const gløder = Math.max(0, 1 - Math.pow(t / 7, 1.5)), falm = t > T - 3 ? Math.max(0, (T - t) / 3) : 1;
      for (const p of s.puf) {
        if (p.del === "stamme") { p.k.position.set(Math.cos(p.v) * p.r * (1 + k * 0.6), p.h * H, Math.sin(p.v) * p.r * (1 + k * 0.6)); p.k.scale.setScalar(p.s * (0.5 + 0.6 * k)); }
        else if (p.del === "hat") { p.k.position.set(Math.cos(p.v) * CR * p.r, H + p.dy * (1 + CR * 0.35), Math.sin(p.v) * CR * p.r); p.k.scale.setScalar(p.s * (0.4 + 0.9 * k)); }
        else if (p.del === "fod") { const rr = (2 + 16 * Math.min(1, t / 2.5)) * p.r; p.k.position.set(Math.cos(p.v) * rr, 0.6 + t * 0.15, Math.sin(p.v) * rr); p.k.scale.setScalar(p.s * (1 + t * 0.25)); }
        else if (p.del === "krave") {                            // kraven af damp om stammen: den vokser ud og forsvinder
          const kt = Math.max(0, t - 0.8), rr = 1.5 + kt * 3.2;
          p.k.visible = t > 0.8 && kt < 3;
          p.k.position.set(Math.cos(p.v + kt * 0.2) * rr, H * 0.5, Math.sin(p.v + kt * 0.2) * rr); p.k.scale.set(p.s * (1 + kt * 0.4), p.s * 0.5, p.s * (1 + kt * 0.4));
        }
        else { p.k.scale.setScalar(t < 0.35 ? 2 + t * 70 : Math.max(0.01, 26 * (1 - (t - 0.35) / 0.9))); p.k.position.y = 1.5; }
        p.k.rotation.y += dt * 0.3;
      }
      s.m.stamme.color.copy(GRÅ).lerp(ORANGE, gløder); s.m.hat.color.copy(GRÅ).lerp(GUL, gløder);
      s.m.stamme.emissive.copy(s.m.stamme.color).multiplyScalar(0.25 + 0.4 * gløder); s.m.hat.emissive.copy(s.m.hat.color).multiplyScalar(0.25 + 0.4 * gløder);
      for (const n of ["stamme", "hat"]) s.m[n].opacity = falm;
      s.m.fod.opacity = Math.max(0, 1 - t / 6) * falm;
      s.m.krave.opacity = Math.max(0, Math.min(1, (t - 0.8) * 3)) * Math.max(0, 1 - (t - 0.8) / 3) * 0.9;
      s.m.kerne.opacity = Math.max(0, 1 - t / 1.2);
      s.ring.scale.setScalar(1 + 48 * Math.min(1, t / 1.6)); s.ring.material.opacity = Math.max(0, 0.85 * (1 - t / 1.6));
      if (t > T) {
        this.s.scene.remove(s.g); s.ring.geometry.dispose(); s.ring.material.dispose();
        for (const x of Object.values(s.m)) x.dispose();
        this.skyer.splice(this.skyer.indexOf(s), 1);
      }
    }
  }

  // ---------- Missilerne ----------
  // Find missiler (en Missilspids med Missil-blokke under) omkring et sted — de nærmeste først
  findMissiler(x0, z0, r = 40) {
    const { verden } = this.s, fundet = [];
    for (let x = x0 - r; x <= x0 + r; x++) for (let z = z0 - r; z <= z0 + r; z++) {
      if (!verden.inde(x, 0, z) || !verden.hentet(x, z)) continue;
      for (let y = verden.BY - 1; y > 0; y--) {
        if (verden.hent(x, y, z) !== ID.Missilspids) continue;
        let bund = y;
        while (bund > 1 && verden.hent(x, bund - 1, z) === ID.Missil) bund--;
        fundet.push({ x, z, bund, top: y });
      }
    }
    return fundet.sort((a, b) => Math.hypot(a.x - x0, a.z - z0) - Math.hypot(b.x - x0, b.z - z0)).slice(0, 8);
  }

  // Den røde knap: nedtælling 3 – 2 – 1, og så flyver alle missiler i nærheden
  trykKnap({ x, y, z }) {
    if (this.nedtæl) return;
    if (!this.findMissiler(x, z).length) {
      this.s.lyd.bank?.("metal");
      this.s.besked("🚀 Byg et missil af Missil-blokke med en Missilspids på toppen — så sender knappen det af sted", 5000);
      return;
    }
    this.nedtæl = { x, y, z, t: 0, n: 3 };
    this.s.lyd.alarm(); this.s.lyd.nedtælling(3); this.s.tal(3);
  }
  opdaterNedtælling(dt) {
    const n = this.nedtæl;
    if (!n) return;
    n.t += dt;
    const tal = 3 - Math.floor(n.t);
    if (tal !== n.n && tal >= 1) { n.n = tal; this.s.tal(tal); this.s.lyd.nedtælling(tal); }
    if (n.t < 3) return;
    this.nedtæl = null;
    const missiler = this.findMissiler(n.x, n.z), mål = this.målFor(n.x, n.z);
    missiler.forEach((m, i) => {                                // de spredes lidt rundt om målet
      const v = i * 2.4, r = i ? 6 + (i % 3) * 3 : 0;
      this.sendAf(m, [mål[0] + Math.cos(v) * r, mål[1] + Math.sin(v) * r], i * 0.45, true);
    });
  }
  // Hvor flyver missilerne hen? Mod Dukkebyen, hvis den er tæt nok på — ellers langt frem foran barnet
  målFor(x, z) {
    const { mål, sp, verden } = this.s;
    if (mål && Math.hypot(mål[0] - x, mål[1] - z) < 150) return mål;
    const fx = -Math.sin(sp.yaw), fz = -Math.cos(sp.yaw);
    return [Math.max(4, Math.min(verden.BX - 5, sp.pos.x + fx * 55)), Math.max(4, Math.min(verden.BZ - 5, sp.pos.z + fz * 55))];
  }
  // Tænd ét missil med 🔥 eller 🔨: find hele missilet omkring blokken, og send det væk fra barnet
  tændMissil({ x, y, z }) {
    const { verden, sp } = this.s, del = id => id === ID.Missil || id === ID.Missilspids;
    let top = y, bund = y;
    while (top < verden.BY - 1 && del(verden.hent(x, top + 1, z))) top++;
    while (bund > 1 && verden.hent(x, bund - 1, z) === ID.Missil) bund--;
    let dx = x + 0.5 - sp.pos.x, dz = z + 0.5 - sp.pos.z;
    const l = Math.hypot(dx, dz);
    if (l < 0.3) { dx = -Math.sin(sp.yaw); dz = -Math.cos(sp.yaw); } else { dx /= l; dz /= l; }
    const mål = [Math.max(4, Math.min(verden.BX - 5, x + dx * 55)), Math.max(4, Math.min(verden.BZ - 5, z + dz * 55))];
    this.sendAf({ x, z, bund, top }, mål, 0.9, false);
    this.s.lyd.nedtælling(2);
  }
  // Blokkene bliver til et rigtigt missil, der letter (fremmed: en anden spillers missil — blokkene og braget
  // kommer fra serveren, så her flyver det bare)
  sendAf(m, mål, forsinkelse, genlad, fremmed = false) {
    if (!fremmed) {
      for (let y = m.bund; y <= m.top; y++) this.s.sæt(m.x, y, m.z, 0);
      this.s.del?.("missil", { x: m.x, z: m.z, bund: m.bund, top: m.top, mx: mål[0], mz: mål[1], forsinkelse });
    }
    const længde = m.top - m.bund + 1, model = this.missilModel(længde - 1);
    model.g.position.set(m.x + 0.5, m.bund, m.z + 0.5);
    this.s.scene.add(model.g);
    const slags = længde <= 3 ? "mini" : længde <= 8 ? "atom" : "kæmpe";
    this.missiler.push({ ...model, fra: model.g.position.clone(), mål, t: -forsinkelse, slags, røgT: 0, fløjt: false, startet: false, fremmed });
    if (genlad && !this.s.online) this.genlad.push({ ...m, t: 30 });
  }
  // Sammen: et missil, som en anden spiller har sendt af sted
  fremmedMissil({ x, z, bund, top, mx, mz, forsinkelse }) {
    const { verden } = this.s;
    if (![x, z, bund, top, mx, mz, forsinkelse].every(Number.isFinite) || this.missiler.length > 16) return;
    if (top < bund || top - bund > 24 || bund < 0 || top >= verden.BY || !verden.inde(mx, 0, mz)) return;
    this.sendAf({ x, z, bund, top }, [mx, mz], Math.max(0, Math.min(5, forsinkelse)), false, true);
  }
  // Et missil af klodser: hvid krop med røde bånd, rød spids, fire finner og en flamme bagi
  missilModel(krop) {
    const g = new THREE.Group(), mat = f => new THREE.MeshLambertMaterial({ color: f, emissive: new THREE.Color(f).multiplyScalar(0.3), fog: false });
    const hvid = mat("#f2f2ee"), rød = mat("#d8262a");
    for (let i = 0; i < krop; i++) { const k = new THREE.Mesh(KASSE, i % 3 === 1 ? rød : hvid); k.scale.set(0.8, 1, 0.8); k.position.y = i + 0.5; g.add(k); }
    const spids = new THREE.Mesh(KEGLE, rød); spids.scale.set(0.46, 1, 0.46); spids.position.y = krop + 0.5; g.add(spids);
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const f = new THREE.Mesh(KASSE, rød); f.scale.set(x ? 0.45 : 0.08, 0.8, z ? 0.45 : 0.08); f.position.set(x * 0.55, 0.4, z * 0.55); g.add(f);
    }
    const fm = ["#ffd23f", "#ff6a1a"].map((f, i) => new THREE.MeshBasicMaterial({ color: f, transparent: true, opacity: i ? 0.8 : 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    const flamme = new THREE.Group();
    for (const [i, s, y] of [[0, 1.4, -0.7], [1, 2.2, -1.1]]) { const f = new THREE.Mesh(KEGLE, fm[i]); f.scale.set(0.3 + i * 0.15, s, 0.3 + i * 0.15); f.rotation.x = Math.PI; f.position.y = y; flamme.add(f); }
    flamme.scale.setScalar(0.01); g.add(flamme);
    return { g, flamme, mats: [hvid, rød, ...fm] };
  }
  opdaterMissiler(dt) {
    const { sp, verden, partikel, lyd } = this.s;
    for (const m of [...this.missiler]) {
      m.t += dt;
      const p = m.g.position, afst = Math.hypot(p.x - sp.pos.x, p.z - sp.pos.z);
      if (m.t < 0) {                                              // lunten: lidt røg og gnister ved foden
        if (Math.random() < dt * 20) partikel(p.x + (Math.random() - 0.5), p.y + 0.2, p.z + (Math.random() - 0.5), RØG, (Math.random() - 0.5), 0.8, (Math.random() - 0.5), 1.2, -0.08, 2.5);
        m.flamme.scale.setScalar(0.25 + Math.random() * 0.2);
        continue;
      }
      if (!m.startet) { m.startet = true; lyd.missilStart(afst); if (afst < 30) this.s.ryst(0.6); }
      if (m.t < LØFT) {                                           // letter langsomt, lige op, i en stor sky af røg
        p.set(m.fra.x + (Math.random() - 0.5) * 0.06, m.fra.y + 2.5 * m.t * m.t, m.fra.z + (Math.random() - 0.5) * 0.06);
        m.g.quaternion.identity();
        for (let i = 0; i < 3; i++) {
          const v = Math.random() * Math.PI * 2, f = 3 + Math.random() * 4;
          partikel(m.fra.x, m.fra.y + 0.3, m.fra.z, Math.random() < 0.5 ? RØG : MØRKRØG, Math.cos(v) * f, 1 + Math.random() * 2.5, Math.sin(v) * f, 2.2 + Math.random(), -0.03, 9 + Math.random() * 7);
        }
      } else {
        if (!m.bane) {                                            // flyv i en stor bue op over himlen og ned på målet
          const Q0 = p.clone(), [tx, tz] = m.mål, ty = verden.topY(Math.floor(tx), Math.floor(tz)) + 1;
          m.bane = [Q0, Q0.clone().add(tmp.set(0, 42, 0)), new THREE.Vector3(tx, Q0.y + 48, tz), new THREE.Vector3(tx, ty, tz)];
          m.T = 2.6 + Math.hypot(tx - Q0.x, tz - Q0.z) / 28;
        }
        const s = Math.min(1, (m.t - LØFT) / m.T), u = s * (0.3 + 0.7 * s);
        kurve(m.bane, u, p);
        m.g.quaternion.setFromUnitVectors(OP, kurveRetning(m.bane, u, tmp).normalize());
        if (!m.fløjt && (1 - s) * m.T < 1.4) { m.fløjt = true; lyd.missilFløjt(afst); }
        if (s >= 1) { this.nedslag(m); continue; }
      }
      m.flamme.scale.set(0.9 + Math.random() * 0.3, 0.8 + Math.random() * 0.6, 0.9 + Math.random() * 0.3);
      if ((m.røgT -= dt) <= 0) {                                  // et spor af røg og ild bag missilet
        m.røgT = 0.03;
        const hale = tmp.copy(OP).applyQuaternion(m.g.quaternion).multiplyScalar(-0.6).add(p);
        partikel(hale.x, hale.y, hale.z, Math.random() < 0.7 ? RØG : MØRKRØG, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 2.8, -0.02, 5 + Math.random() * 3);
        partikel(hale.x, hale.y, hale.z, ILD[Math.floor(Math.random() * 4)], (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.4, 0.2, 1.6);
      }
    }
  }
  nedslag(m) {
    this.s.scene.remove(m.g);
    for (const x of m.mats) x.dispose();
    this.missiler.splice(this.missiler.indexOf(m), 1);
    if (m.fremmed) return;                                      // svampeskyen kommer fra den, der sendte missilet
    const [tx, tz] = m.mål, ty = this.s.verden.topY(Math.floor(tx), Math.floor(tz)) + 1;   // krateret kan være blevet dybere
    this.s.sprængning(tx, ty + 0.5, tz, m.slags);
  }
  // Siloerne bliver fyldt igen: et nyt missil står klar efter et halvt minut
  opdaterGenladning(dt) {
    const { verden, partikel, sp } = this.s;
    for (const r of [...this.genlad]) {
      if ((r.t -= dt) > 0) continue;
      this.genlad.splice(this.genlad.indexOf(r), 1);
      let tom = true;
      for (let y = r.bund; y <= r.top; y++) if (verden.hent(r.x, y, r.z)) tom = false;
      if (!tom) continue;
      for (let y = r.bund; y < r.top; y++) this.s.sæt(r.x, y, r.z, ID.Missil);
      this.s.sæt(r.x, r.top, r.z, ID.Missilspids);
      for (let i = 0; i < 24; i++) partikel(r.x + 0.5, r.bund + Math.random() * (r.top - r.bund + 1), r.z + 0.5, GNIST[i % 3],
        (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, 0.9, 0.2, 0.9);
      this.s.lyd.genladet(Math.hypot(r.x - sp.pos.x, r.z - sp.pos.z));
    }
  }

  opdater(dt) {
    this.opdaterSkyer(dt);
    this.opdaterNedtælling(dt);
    this.opdaterMissiler(dt);
    this.opdaterGenladning(dt);
  }
}
