// ===== Projektiler og granater: raketter, pile og håndgranater, blænd-, røg- og impulsgranater =====
// Alt, der flyver gennem luften i stedet for at ramme med det samme. Granaterne hopper af mure og jord
// (lidt som en bold), og når lunten er brændt ud, springer de:
//   håndgranat og raket: en eksplosion, der skader (mindre bag en mur), skubber og skyder arme og ben af
//   blændgranat: et hvidt lys, der blænder dem, der kigger   røggranat: en sky, som ingen kan se igennem
//   impulsgranat: skubber alle væk (som i Fortnite) — kast den under dig selv, så flyver du
// k = { scene, verden, effekter, lyd, kampfolk(), nu(), træf(kæmper, o, r, maks), skad(offer, skade, skytte, skud, navn, hoved),
//       blænd(pos), ryst(pos, styrke) }

import * as THREE from "./three.js";
import { GRANATER } from "./katalog.js";

const TYNGDE = 11, RAKET_FART = 34, PIL_FART = 78;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), NED = new THREE.Vector3(0, -1, 0);

export class Projektiler {
  constructor(k, t) {
    this.k = k; this.liste = []; this.skyer = []; this.pile = [];
    const mat = (farve, o = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.6, metalness: 0.3, ...o });
    // ---- modellerne (små, enkle) ----
    const raket = new THREE.Group();
    raket.add(rør(0.045, 0.5, mat(0x5a6648)), del(new THREE.ConeGeometry(0.045, 0.14, 12), mat(0x8a2a1a), [0, 0, -0.32], [-Math.PI / 2, 0, 0]));
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.07, 0.1), mat(0x3a3f30)); f.position.set(0, 0, 0.22); f.rotation.z = i * Math.PI / 2; f.translateY(0.06); raket.add(f); }
    const ild = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.glimt, color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false })); ild.scale.setScalar(0.35); ild.position.z = 0.32; raket.add(ild);
    const pil = new THREE.Group();
    pil.add(rør(0.006, 0.6, mat(0x6a4a2a, { metalness: 0 })), del(new THREE.ConeGeometry(0.012, 0.05, 8), mat(0x9a9ea4, { metalness: 0.9 }), [0, 0, -0.32], [-Math.PI / 2, 0, 0]));
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.03, 0.08), mat(0xc83a2a, { metalness: 0 })); f.position.set(0, 0, 0.26); f.rotation.z = i * Math.PI * 2 / 3; f.translateY(0.015); pil.add(f); }
    this.form = {
      raket, pil,
      he: kugleMed(0.045, mat(0x3a4a2a), mat(0x8a8a80)), blænd: dåse(0.032, 0.11, mat(0x8a9098), mat(0xd8d8d0)),
      røg: dåse(0.034, 0.12, mat(0x5a6a5a), mat(0xe0e0d0)), impuls: kugleMed(0.05, mat(0x2a7aff, { emissive: 0x1a4aff, emissiveIntensity: 1.2 }), mat(0xe8f0ff)),
    };
    for (const g of Object.values(this.form)) g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.røgMat = new THREE.SpriteMaterial({ map: t.røg, color: 0xc8c4bc, transparent: true, opacity: 0.85, depthWrite: false });
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  }

  // ---------- Affyr og kast ----------
  raket(skytte, o, r, v) { this.nyt({ type: "raket", skytte, v, pos: o.clone().addScaledVector(r, 0.6), fart: r.clone().multiplyScalar(RAKET_FART), tyngde: 0.6, liv: 6, form: this.form.raket }); this.k.lyd.raket(o); }
  pil(skytte, o, r, v) { this.nyt({ type: "pil", skytte, v, pos: o.clone().addScaledVector(r, 0.4), fart: r.clone().multiplyScalar(PIL_FART), tyngde: 1, liv: 4, form: this.form.pil }); }
  granat(id, skytte, o, fart) {
    const g = GRANATER[id];
    this.nyt({ type: "granat", id, g, skytte, pos: o.clone(), fart: fart.clone(), tyngde: 1, liv: g.lunte, form: this.form[id], spin: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12) });
  }
  nyt(p) {
    p.mesh = p.form.clone(); p.mesh.position.copy(p.pos); this.k.scene.add(p.mesh);
    if (p.type !== "granat") p.mesh.lookAt(tmp.copy(p.pos).add(p.fart));
    p.sporTid = 0; this.liste.push(p);
  }

  // ---------- Hvert tick: flyv, ram, hop og spring ----------
  trin(dt) {
    const { verden } = this.k;
    for (let i = this.liste.length - 1; i >= 0; i--) {
      const p = this.liste[i];
      p.fart.y -= TYNGDE * p.tyngde * dt;
      const skridt = tmp.copy(p.fart).multiplyScalar(dt), l = skridt.length(), r = tmp2.copy(skridt).divideScalar(l || 1);
      const væg = verden.stråle(p.pos, r, l);
      if (p.type === "granat") {
        if (væg) {                                                     // hop: spejl farten i fladen og mist noget af den
          const n = new THREE.Vector3(...væg.normal), vn = p.fart.dot(n);
          p.fart.addScaledVector(n, -1.45 * vn).multiplyScalar(0.62);
          p.pos.addScaledVector(r, Math.max(0, væg.t - 0.03)).addScaledVector(n, 0.02);
          if (Math.abs(vn) > 2) this.k.lyd.prel(p.pos);
          p.spin.multiplyScalar(0.6);
        } else p.pos.add(skridt);
        if ((p.liv -= dt) <= 0) { this.spring(p); this.fjern(i); }
        continue;
      }
      // raketter og pile: rammer de nogen?
      let bedst = væg ? { t: væg.t, væg } : null;
      for (const k of this.k.kampfolk()) {
        if (k.død || k === p.skytte || k.hold === p.skytte.hold) continue;
        const h = this.k.træf(k, p.pos, r, bedst ? bedst.t : l);
        if (h) bedst = { t: h.t, k, h };
      }
      if (bedst) {
        p.pos.addScaledVector(r, bedst.t);
        if (p.type === "raket") { p.pos.addScaledVector(r, -0.15); this.eksplosion(p.pos, p.skytte, p.v.d.navn, p.v.d.skade, p.v.d.radius); }
        else this.pilRammer(p, bedst, r);
        this.fjern(i); continue;
      }
      p.pos.add(skridt);
      if ((p.liv -= dt) <= 0) { if (p.type === "raket") this.eksplosion(p.pos, p.skytte, p.v.d.navn, p.v.d.skade, p.v.d.radius); this.fjern(i); continue; }
      if (p.type === "raket" && (p.sporTid -= dt) <= 0) { p.sporTid = 0.012; this.k.effekter.røgspor(p.pos); }
    }
    // røgskyerne vokser og forsvinder igen
    const nu = this.k.nu();
    for (let i = this.skyer.length - 1; i >= 0; i--) {
      const s = this.skyer[i], alder = nu - s.start;
      s.r = Math.min(1, alder / 1.6) * 3.8 * (alder > s.varighed - 2.5 ? Math.max(0.05, (s.varighed - alder) / 2.5) : 1);
      if (alder > s.varighed) { for (const sp of s.sprites) this.k.scene.remove(sp); this.skyer.splice(i, 1); }
    }
  }
  fjern(i) { this.k.scene.remove(this.liste[i].mesh); this.liste.splice(i, 1); }
  // En pil: i en krop (skade som en kugle) eller fast i muren et stykke tid
  pilRammer(p, bedst, r) {
    if (bedst.k) { this.k.kugle(p.skytte, bedst.k, bedst.h, p.v, p.pos.distanceTo(p.skytte.a.pos), r); return; }
    const m = p.form.clone(); m.position.copy(p.pos).addScaledVector(r, 0.12); m.lookAt(tmp.copy(m.position).add(r)); this.k.scene.add(m);
    this.pile.push({ m, til: this.k.nu() + 12 }); this.k.lyd.prel(p.pos);
    while (this.pile.length > 30 || (this.pile.length && this.pile[0].til < this.k.nu())) this.k.scene.remove(this.pile.shift().m);
  }
  // Lunten er brændt ud
  spring(p) {
    const { g, pos } = p;
    if (p.id === "he") this.eksplosion(pos, p.skytte, g.navn, g.skade, g.radius);
    else if (p.id === "blænd") { this.k.effekter.blændLys(pos); this.k.lyd.blænd(pos); this.k.blænd(pos); }
    else if (p.id === "røg") this.røg(pos, g.varighed);
    else if (p.id === "impuls") this.impuls(pos, g.kraft, g.radius);
  }

  // ---------- En eksplosion: skade, skub og arme og ben, der flyver ----------
  eksplosion(pos, skytte, navn, maks, radius) {
    const { verden, effekter, lyd } = this.k;
    effekter.eksplosion(pos); lyd.eksplosion(pos); this.k.ryst(pos, 1);
    this.k.byggeri?.().eksplosion(pos, maks, radius);                 // (byggede vægge, gulve og trapper går i stykker)
    const jord = verden.stråle(pos, NED, 2.5);
    if (jord) effekter.brændemærke(tmp.copy(pos).addScaledVector(NED, jord.t), jord.normal);
    for (const k of this.k.kampfolk()) {
      if (k.død || (k.hold === skytte.hold && k !== skytte)) continue;
      const midt = tmp.set(k.a.pos.x, k.a.pos.y + k.a.h * 0.55, k.a.pos.z), d = midt.distanceTo(pos);
      if (d > radius) continue;
      const r = tmp2.subVectors(midt, pos).normalize(), bag = verden.stråle(pos, r, d);
      const nær = 1 - d / radius;
      let liv = maks * nær ** 1.3 * (bag ? 0.3 : 1) * (k === skytte ? 0.5 : 1);
      const panser = k.panser > 0 ? Math.min(k.panser, liv * 0.3) : 0; liv -= panser * 0.6;
      k.a.vel.addScaledVector(r, 11 * nær).add(new THREE.Vector3(0, 5 * nær, 0)); k.a.jord = false;
      // tæt på: en arm eller et ben ryger (hvis soldaten overlever) — og kroppen skubbes hårdt
      const lemmer = k.fig ? ["armR", "armL", "benR", "benL"].filter(l => !k.fig.mangler[l]) : [];
      const lem = lemmer.length && Math.random() < nær * 1.3 ? lemmer[Math.floor(Math.random() * lemmer.length)] : null;
      this.k.skad(k, { liv: Math.round(liv), panser: Math.round(panser) }, skytte, { r: r.clone(), del: "krop", lem, kraft: 4 + 9 * nær }, navn, false);
    }
  }
  // Impulsgranaten: alle i nærheden skubbes væk (ingen skade)
  impuls(pos, kraft, radius) {
    this.k.effekter.impuls(pos); this.k.lyd.impuls(pos);
    const ring = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.ringMat.clone()); ring.position.copy(pos); this.k.scene.add(ring);
    const start = performance.now(), vokse = () => { const t = (performance.now() - start) / 300; ring.scale.setScalar(0.5 + t * radius); ring.material.opacity = 0.5 * (1 - t); if (t < 1) requestAnimationFrame(vokse); else { this.k.scene.remove(ring); ring.material.dispose(); } };
    vokse();
    for (const k of this.k.kampfolk()) {
      if (k.død) continue;
      const midt = tmp.set(k.a.pos.x, k.a.pos.y + 0.5, k.a.pos.z), d = midt.distanceTo(pos);
      if (d > radius) continue;
      const r = tmp2.subVectors(midt, pos); r.y = Math.max(r.y, 0.3); r.normalize();
      const nær = 1 - d / radius * 0.6;
      k.a.vel.addScaledVector(r, kraft * nær); k.a.vel.y = Math.max(k.a.vel.y, 7 * nær); k.a.jord = false;
    }
  }
  // Røggranaten: en sky af store, bløde billeder (sprites), der vokser op og falder sammen igen
  røg(pos, varighed) {
    this.k.lyd.røg(pos);
    const sky = { pos: pos.clone(), r: 0, start: this.k.nu(), varighed, sprites: [] };
    for (let i = 0; i < 28; i++) {
      const sp = new THREE.Sprite(this.røgMat.clone()); sp.material.rotation = Math.random() * 6.3;
      sp.userData = { ud: new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).normalize(), afst: 0.3 + Math.random() * 0.7, str: 2.2 + Math.random() * 1.6 };
      this.k.scene.add(sp); sky.sprites.push(sp);
    }
    this.skyer.push(sky);
  }
  // Er der røg mellem a og b? (botterne kan ikke se igennem)
  røgBlokerer(a, b) {
    for (const s of this.skyer) {
      if (s.r < 0.8) continue;
      const ab = tmp.subVectors(b, a), l2 = ab.lengthSq(), t = l2 ? Math.max(0, Math.min(1, tmp2.subVectors(s.pos, a).dot(ab) / l2)) : 0;
      if (tmp2.copy(a).addScaledVector(ab, t).distanceTo(s.pos) < s.r * 0.85) return true;
    }
    return false;
  }

  // ---------- Hvert billede: flyt modellerne og røgen ----------
  tegn(dt) {
    for (const p of this.liste) {
      p.mesh.position.copy(p.pos);
      if (p.type === "granat") { p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt; p.mesh.rotation.z += p.spin.z * dt; }
      else p.mesh.lookAt(tmp.copy(p.pos).add(p.fart));
    }
    const nu = this.k.nu();
    for (const s of this.skyer) {
      const alder = nu - s.start;
      for (const sp of s.sprites) {
        const u = sp.userData;
        sp.position.copy(s.pos).addScaledVector(u.ud, s.r * u.afst); sp.position.y += 0.4 + Math.sin(alder * 0.3 + u.afst * 9) * 0.1;
        sp.scale.setScalar(u.str * Math.min(1, alder / 1.2 + 0.2));
        sp.material.opacity = 0.85 * Math.min(1, s.r / 2.5);
        sp.material.rotation += dt * 0.05 * (u.afst - 0.6);
      }
    }
  }
  ryd() {
    for (const p of this.liste) this.k.scene.remove(p.mesh);
    for (const s of this.skyer) for (const sp of s.sprites) this.k.scene.remove(sp);
    for (const p of this.pile) this.k.scene.remove(p.m);
    this.liste = []; this.skyer = []; this.pile = [];
  }
}

// ---------- Små modeller ----------
function del(geo, m, p, r) { const o = new THREE.Mesh(geo, m); o.position.set(...p); o.rotation.set(...r); return o; }
function rør(r, l, m) { const g = new THREE.CylinderGeometry(r, r, l, 12); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, m); }
function kugleMed(r, m, m2) {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 0.5, 8), m2); top.position.y = r * 1.05; g.add(top);
  return g;
}
function dåse(r, h, m, m2) {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), m));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, r * 0.6, 8), m2); top.position.y = h / 2 + r * 0.25; g.add(top);
  const bånd = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, h * 0.15, 14), m2); g.add(bånd);
  return g;
}
