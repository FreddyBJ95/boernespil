// ===== Skydning i Broekraft: våben, skydeskiver, balloner og kampvogne =====
// Alt er legetøj: det, man rammer, forsvinder i konfetti, og fjenderne skyder med bløde skumkugler,
// der kun giver en farveklat på skærmen. Ingen kommer til skade, og der er ingen udbrudsord.
//  VÅBEN: fart (blokke/s) · tyngde (0 = lige ud) · liv (sekunder) · brag = sprænger som TNT
// Våbnene kan bruges i alle verdener. På Skydebanen (cfg.skyd) er der også balloner, kampvogne og point.

import * as THREE from "./three.js";
import { BLOKKE, ID } from "./blokke.js";
import { Kampvogn, KV_B, KV_H } from "./kampvogn.js";

const VÅBEN = {
  gevær: { fart: 55, tyngde: 0, liv: 1.1 },
  bazooka: { fart: 24, tyngde: 0, liv: 2.5, brag: true },
  maling: { fart: 30, tyngde: 0.22, liv: 2 },
  kanon: { fart: 34, tyngde: 0.12, liv: 2.5, brag: true },      // kampvognens kanon
  atom: { fart: 21, tyngde: 0.5, liv: 5, brag: true },          // atomkasteren: en lille atombombe i en bue (svampesky, se atom.js)
  skum: { fart: 13, tyngde: 0.35, liv: 4 },                     // fjendernes bløde skumkugler
};
const MALING = ["Rød uld", "Orange uld", "Gul uld", "Grøn uld", "Blå uld", "Lilla uld", "Lyserød uld"].map(n => ID[n]);
const FARVER = ["#ff3b5c", "#ffd23f", "#4cd964", "#3aa8ff", "#c86bff", "#ff8c1a", "#ffffff", "#ff6fd0"];
const KONFETTI = FARVER.map(f => new THREE.Color(f));
const SKUM = ["#ff6fd0", "#c86bff", "#3aa8ff", "#4cd964", "#ffd23f"];
const tilfældig = a => a[Math.floor(Math.random() * a.length)];
const tmp = new THREE.Vector3();
const ATOMGNIST = ["#8aff5a", "#f5d02a", "#c8ff7a"].map(f => new THREE.Color(f));

// Små modeller til det, der flyver
const GEO = { kasse: new THREE.BoxGeometry(1, 1, 1), kugle: new THREE.SphereGeometry(1, 10, 8), kegle: new THREE.ConeGeometry(1, 1, 8) };
function projektilModel(type, farve) {
  const g = new THREE.Group();
  const del = (geo, f, s, p = [0, 0, 0], lys = false) => {
    const m = new THREE.Mesh(geo, lys ? new THREE.MeshBasicMaterial({ color: f }) : new THREE.MeshLambertMaterial({ color: f }));
    m.scale.set(...s); m.position.set(...p); g.add(m); return m;
  };
  if (type === "gevær") del(GEO.kasse, "#fff3a0", [0.09, 0.09, 0.75], [0, 0, 0], true);
  else if (type === "bazooka") {
    del(GEO.kasse, "#4f7a2e", [0.22, 0.22, 0.7]);
    const spids = del(GEO.kegle, "#e0302a", [0.13, 0.3, 0.13], [0, 0, 0.48]); spids.rotation.x = Math.PI / 2;
    del(GEO.kasse, "#ffd23f", [0.3, 0.04, 0.2], [0, 0, -0.3]);
  } else if (type === "atom") {                                    // gul kugle med sort bælte og små finner
    del(GEO.kugle, "#f5d02a", [0.3, 0.3, 0.3]);
    del(GEO.kasse, "#1a1a1a", [0.62, 0.09, 0.62]);
    del(GEO.kasse, "#1a1a1a", [0.5, 0.05, 0.22], [0, 0, -0.34]); del(GEO.kasse, "#1a1a1a", [0.05, 0.5, 0.22], [0, 0, -0.34]);
  } else del(GEO.kugle, farve, type === "kanon" ? [0.2, 0.2, 0.2] : type === "skum" ? [0.27, 0.27, 0.27] : [0.14, 0.14, 0.14], [0, 0, 0], type === "maling");
  return g;
}

// En ballon med snor, der svæver og vipper
function ballonModel(farve) {
  const g = new THREE.Group();
  const krop = new THREE.Mesh(GEO.kugle, new THREE.MeshLambertMaterial({ color: farve, emissive: new THREE.Color(farve).multiplyScalar(0.25) }));
  krop.scale.set(0.42, 0.52, 0.42); krop.position.y = 1;
  const knude = new THREE.Mesh(GEO.kegle, krop.material); knude.scale.set(0.08, 0.1, 0.08); knude.position.y = 0.45;
  const snor = new THREE.Mesh(GEO.kasse, new THREE.MeshBasicMaterial({ color: "#eeeeee" })); snor.scale.set(0.02, 0.9, 0.02); snor.position.y = -0.05;
  const glans = new THREE.Mesh(GEO.kugle, new THREE.MeshBasicMaterial({ color: "#ffffff" })); glans.scale.set(0.08, 0.12, 0.05); glans.position.set(-0.17, 1.2, 0.33);
  g.add(krop, knude, snor, glans);
  return g;
}

export class Skydning {
  // spil: { scene, verden, kamera, sp, dyr, partikel, eksploder, bragEffekt, puf, lyd, net(), online, sæt(x,y,z,id), atom(x,y,z),
  //         point(n), klat(farve), tyngde, bane (true på Skydebanen), start: [x, z] }
  constructor(spil) {
    this.s = spil;
    this.skud = []; this.balloner = []; this.fjender = []; this.egne = []; this.genopstil = []; this.igen = [];
    this.kører = null;                                               // kampvognen, barnet sidder i
    this.cooldown = 0; this.kanonPause = 0; this.t = 0;
  }

  // ---------- Affyr ----------
  // type: gevær/bazooka/maling/kanon/skum · afsender: "barn" eller "fjende"
  affyr(type, start, retning, { afsender = "barn", farve } = {}) {
    const v = VÅBEN[type];
    if (this.skud.length > 80) this.fjern(this.skud.shift());
    const malId = type === "maling" ? tilfældig(MALING) : 0;
    const f = farve || (type === "maling" ? BLOKFARVE(malId) : type === "skum" ? tilfældig(SKUM) : "#333333");
    const model = projektilModel(type, f);
    model.position.copy(start);
    this.s.scene.add(model);
    const p = { type, pos: start.clone(), vel: retning.clone().normalize().multiplyScalar(v.fart), liv: v.liv, model, afsender, malId, farve: f };
    this.retning(p);
    this.skud.push(p);
    return p;
  }
  retning(p) { tmp.copy(p.pos).add(p.vel); p.model.lookAt(tmp); }

  // Barnet trykker med et våben: kuglen flyver fra hånden mod det sted, fingeren peger på
  skydMod(type, kameraPos, stråle, afstand = 40) {
    if ((type === "bazooka" || type === "atom") && this.cooldown > 0) return false;
    const k = this.s.kamera, højre = new THREE.Vector3(), op = new THREE.Vector3(0, 1, 0), frem = new THREE.Vector3();
    k.getWorldDirection(frem); højre.crossVectors(frem, op).normalize();
    const mål = kameraPos.clone().addScaledVector(stråle, afstand);
    const fra = kameraPos.clone().addScaledVector(frem, 0.7).addScaledVector(højre, 0.28).addScaledVector(op, -0.22);
    const retning = mål.sub(fra).normalize();
    if (type === "maling") retning.y += 0.02;
    if (type === "atom") retning.y += 0.14;                        // atombomben flyver i en bue
    this.affyr(type, fra, retning);
    if (type === "gevær") this.s.lyd.skud(); else if (type === "bazooka") { this.s.lyd.bazookaSkud(); this.cooldown = 0.8; }
    else if (type === "atom") { this.s.lyd.atomkasterSkud(); this.cooldown = 1.3; } else this.s.lyd.klask(0.4);
    if (type === "gevær") for (let i = 0; i < 3; i++) this.s.partikel(fra.x, fra.y, fra.z, KONFETTI[1], retning.x * 3 + (Math.random() - 0.5), retning.y * 3 + Math.random(), retning.z * 3 + (Math.random() - 0.5), 0.12, -0.1, 0.6);
    return true;
  }

  // ---------- Hvad der sker, når noget bliver ramt ----------
  ramtBlok(p, x, y, z, id) {
    const b = BLOKKE[id];
    if (VÅBEN[p.type].brag) return this.brag(p.pos.clone().addScaledVector(p.vel.clone().normalize(), -0.4), p.type === "atom");
    if (p.type === "skum") return this.stænk(p.pos, p.farve, 10);
    if (p.type === "gevær" && b.skive) return this.skivePop(x, y, z);
    if (p.type === "maling" && !b.uknuselig && !b.tnt && !b.skive && !b.fyrværkeri && !b.lyser) {
      if (this.s.online) this.s.net()?.sæt(x, y, z, p.malId); else this.s.sæt(x, y, z, p.malId);
      return this.stænk(p.pos, p.farve, 14);
    }
    this.stænk(p.pos, p.type === "maling" ? p.farve : "#fff3a0", 5, 0.6);          // små gnister på alt andet
  }
  ramtDyr(p, d) {
    if (VÅBEN[p.type].brag) return this.brag(p.pos.clone(), p.type === "atom");
    if (d.def.klap === "puf") {
      if (--d.liv > 0) { d.klap(); d.flugt = 1.5; this.stænk(p.pos, "#fff3a0", 8, 1); return; }   // dinoen skal rammes to gange
      this.s.puf(d); this.s.point(d.def.liv ? 3 : 2); return;
    }
    d.klap();                                                        // venlige dyr hopper bare lidt
    if (p.type === "maling") this.stænk(p.pos, p.farve, 10);
  }
  ramtKampvogn(p, kv) {
    if (VÅBEN[p.type].brag) return this.brag(p.pos.clone(), p.type === "atom");
    if (p.type === "maling") { kv.mal(p.farve); this.stænk(p.pos, p.farve, 12); }
    else this.stænk(p.pos, "#fff3a0", 6, 0.8);
    if (kv.fjende && kv.træf(1)) this.kampvognVæk(kv);
    else this.s.lyd.bank?.("metal");
  }

  // Bazooka og kanon: et stort brag. Skiver, balloner og fjender i nærheden bliver ramt.
  // Atomkasteren (atom = true): en lille atomsprængning med svampesky (spil.js/atom.js)
  brag(c, atom = false) {
    for (let x = Math.floor(c.x - 3.3); x <= c.x + 3.3; x++) for (let y = Math.floor(c.y - 3.3); y <= c.y + 3.3; y++) for (let z = Math.floor(c.z - 3.3); z <= c.z + 3.3; z++) {
      if (BLOKKE[this.s.verden.hent(x, y, z)]?.skive && Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y, z + 0.5 - c.z) < 3) { this.genopstil.push({ x, y, z, tid: 15 }); this.s.point(1); }
    }
    for (const b of [...this.balloner]) if (b.pos.distanceTo(c) < (atom ? 9 : 4.5)) this.ballonPop(b);
    for (const kv of [...this.fjender]) if (kv.rammer(c, atom ? 5 : 2.5) && kv.træf(3)) this.kampvognVæk(kv);
    if (atom) this.s.atom(c.x, c.y, c.z);
    else if (this.s.online) this.s.net()?.brag(c.x, c.y, c.z);      // sammen: serveren sprænger og sender "bum" til alle
    else this.s.eksploder(c.x, c.y, c.z);
  }

  // Skydeskiven bliver til konfetti og stiller sig op igen efter et stykke tid
  skivePop(x, y, z) {
    if (this.s.online) this.s.net()?.sæt(x, y, z, 0); else this.s.sæt(x, y, z, 0);
    this.konfetti(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), 26);
    this.s.lyd.puf(); this.s.point(1);
    this.genopstil.push({ x, y, z, tid: 15 });
  }
  konfetti(c, n = 20, fart = 5) {
    for (let i = 0; i < n; i++) this.s.partikel(c.x, c.y, c.z, KONFETTI[i % KONFETTI.length], (Math.random() - 0.5) * fart, 2 + Math.random() * fart, (Math.random() - 0.5) * fart, 1.2 + Math.random() * 0.8, 0.35, 0.8);
  }
  stænk(c, farve, n = 10, fart = 3) {
    const f = new THREE.Color(farve);
    for (let i = 0; i < n; i++) this.s.partikel(c.x, c.y, c.z, f, (Math.random() - 0.5) * fart * 2, Math.random() * fart * 1.5, (Math.random() - 0.5) * fart * 2, 0.5 + Math.random() * 0.4, 0.9, 0.8);
  }

  // ---------- Balloner ----------
  nyBallon() {
    const { sp, verden } = this.s;
    for (let f = 0; f < 10; f++) {
      const vinkel = Math.random() * Math.PI * 2, r = 8 + Math.random() * 20;
      const x = Math.floor(sp.pos.x + Math.cos(vinkel) * r), z = Math.floor(sp.pos.z + Math.sin(vinkel) * r);
      if (!verden.inde(x, 0, z) || !verden.hentet(x, z)) continue;
      const farve = tilfældig(FARVER.slice(0, 6)), model = ballonModel(farve);
      const b = { pos: new THREE.Vector3(x + 0.5, verden.topY(x, z) + 2 + Math.random() * 5, z + 0.5), model, farve, t: Math.random() * 10, drift: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.15, (Math.random() - 0.5) * 0.6) };
      this.s.scene.add(model); this.balloner.push(b);
      return;
    }
  }
  ballonPop(b) {
    this.balloner.splice(this.balloner.indexOf(b), 1);
    this.s.scene.remove(b.model); b.model.traverse(c => c.material?.dispose());
    const c = b.pos.clone(); c.y += 1;
    this.stænk(c, b.farve, 18, 4); this.konfetti(c, 10, 3);
    this.s.lyd.ballon(this.s.sp.pos.distanceTo(c)); this.s.point(1);
  }

  // ---------- Kampvogne ----------
  nyKampvogn(x, z, fjende) {
    const { scene, verden } = this.s;
    const kv = new Kampvogn(scene, verden, fjende ? { farve: tilfældig(["#e84f7a", "#9b5de5", "#f28a1e", "#3a9ad9"]), fjende: true } : { farve: "#5a8a3a" });
    kv.pos.set(x + 0.5, verden.topY(x, z) + 1.2, z + 0.5);
    while (verden.kolliderer(kv.pos, KV_B, KV_H) && kv.pos.y < verden.BY) kv.pos.y += 1;
    if (!fjende) kv.yaw = kv.tårnYaw = Math.PI;
    kv.opdater(0);
    (fjende ? this.fjender : this.egne).push(kv);
    kv.ai = { tid: 0, drej: 0, frem: 0, skud: 3 + Math.random() * 3 };
    return kv;
  }
  // Et sted langt fra barnet, hvor der er hentet jord
  ledigtSted(min, maks) {
    const { sp, verden } = this.s;
    for (let f = 0; f < 30; f++) {
      const v = Math.random() * Math.PI * 2, r = min + Math.random() * (maks - min);
      const x = Math.floor(sp.pos.x + Math.cos(v) * r), z = Math.floor(sp.pos.z + Math.sin(v) * r);
      if (x > 3 && z > 3 && x < verden.BX - 4 && z < verden.BZ - 4 && verden.hentet(x, z)) return [x, z];
    }
    return null;
  }
  kampvognVæk(kv) {
    this.fjender.splice(this.fjender.indexOf(kv), 1);
    const c = kv.pos.clone(); c.y += 1.2;
    this.konfetti(c, 60, 9);
    for (let i = 0; i < 20; i++) this.s.partikel(c.x, c.y, c.z, new THREE.Color("#fff3a0"), (Math.random() - 0.5) * 10, 3 + Math.random() * 8, (Math.random() - 0.5) * 10, 0.6, -0.05, 1.8);
    this.s.lyd.bum(this.s.sp.pos.distanceTo(c));
    kv.fjern();
    this.s.point(5);
    this.igen.push({ tid: 20 });                                     // en ny legetøjskampvogn kører ind senere
  }

  // Tryk på en af børnenes kampvogne = stig ind
  kampvognVed(stråle, maks) {
    let bedst = null;
    for (const kv of this.egne) {
      const t = tmp.copy(kv.pos).setY(kv.pos.y + 1).sub(stråle.origin).dot(stråle.direction);
      if (t < 0 || t > maks) continue;
      const p = stråle.origin.clone().addScaledVector(stråle.direction, t);
      if (kv.rammer(p, 0.2) && (!bedst || t < bedst.afst)) bedst = { kv, afst: t };
    }
    return bedst;
  }
  stigInd(kv) {
    this.kører = kv; this.s.lyd.kanonSkud?.(); kv.tårnYaw = kv.yaw;
    document.body.classList.add("i-kampvogn");
  }
  stigUd() {
    const kv = this.kører;
    if (!kv) return;
    this.kører = null;
    document.body.classList.remove("i-kampvogn");
    const { sp, verden } = this.s, side = kv.yaw + Math.PI / 2;
    sp.pos.set(kv.pos.x + Math.sin(side) * 2.4, kv.pos.y + 0.2, kv.pos.z + Math.cos(side) * 2.4);
    while (verden.kolliderer(sp.pos, 0.3, 1.7) && sp.pos.y < verden.BY + 2) sp.pos.y += 1;
    sp.vel.set(0, 0, 0);
  }
  // Styr kampvognen med pilene. Tårnet følger kameraet.
  styr(tast, kameraYaw, dt) {
    const kv = this.kører;
    if (tast.hop && kv.hop()) this.s.lyd.boing();                   // ⬆ = kampvognen hopper
    kv.kør(tast.frem - tast.tilbage, tast.hoejre - tast.venstre, dt, this.s.tyngde);
    kv.sigt(kameraYaw + Math.PI, dt, 4);
    this.s.sp.pos.set(kv.pos.x, kv.pos.y + 0.6, kv.pos.z);
    this.s.sp.vel.set(0, 0, 0);
  }
  kanon(stråleRetning) {
    const kv = this.kører;
    if (!kv || this.kanonPause > 0) return;
    this.kanonPause = 0.9;
    kv.sigt(Math.atan2(stråleRetning.x, stråleRetning.z), 1, 100);
    const { pos } = kv.munding(), r = stråleRetning.clone(); r.y = Math.max(-0.3, r.y + 0.04);
    this.affyr("kanon", pos, r);
    kv.skudt(); this.s.lyd.kanonSkud();
    for (let i = 0; i < 10; i++) this.s.partikel(pos.x, pos.y, pos.z, new THREE.Color("#9a9a9a"), (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 0.8, -0.1, 2.2);
  }

  // ---------- Hvert billede ----------
  opdater(dt) {
    const { sp, verden, dyr } = this.s;
    this.t += dt; this.cooldown -= dt; this.kanonPause -= dt;

    // skydebanen: balloner og fjender kommer (igen)
    if (this.s.bane) {
      if (!this.startet && verden.hentet(Math.floor(sp.pos.x), Math.floor(sp.pos.z))) {
        this.startet = true;
        const [sx, sz] = this.s.start;
        this.nyKampvogn(Math.floor(sx) + 4, Math.floor(sz) + 6, false); this.nyKampvogn(Math.floor(sx) - 4, Math.floor(sz) + 6, false);   // foran hangaren
        for (let i = 0; i < 4; i++) { const s = this.ledigtSted(30, 60); if (s) this.nyKampvogn(s[0], s[1], true); }
      }
      if (this.startet && this.balloner.length < 12 && Math.random() < dt * 2) this.nyBallon();
      for (let i = this.igen.length - 1; i >= 0; i--) if ((this.igen[i].tid -= dt) <= 0) {
        const s = this.ledigtSted(30, 60);
        if (s) { this.nyKampvogn(s[0], s[1], true); this.igen.splice(i, 1); } else this.igen[i].tid = 3;
      }
    }
    // skydeskiver stiller sig op igen
    for (let i = this.genopstil.length - 1; i >= 0; i--) {
      const g = this.genopstil[i];
      if ((g.tid -= dt) > 0) continue;
      this.genopstil.splice(i, 1);
      if (verden.hent(g.x, g.y, g.z) === 0 && !(Math.abs(g.x + 0.5 - sp.pos.x) < 0.9 && Math.abs(g.z + 0.5 - sp.pos.z) < 0.9)) {
        if (this.s.online) this.s.net()?.sæt(g.x, g.y, g.z, ID.Skydeskive); else this.s.sæt(g.x, g.y, g.z, ID.Skydeskive);
      }
    }

    // turbo-dinoerne: når de når frem, skubber de barnet omkuld (en farveklat, men ingen skade) og løber væk
    for (const d of dyr) {
      if (d.def.evne !== "jæger" || d.flugt > 0) continue;
      const dx = sp.pos.x - d.pos.x, dz = sp.pos.z - d.pos.z, afst = Math.hypot(dx, dz);
      if (afst > (this.kører ? 2.2 : 1.7) || Math.abs(sp.pos.y - d.pos.y) > 1.8) continue;
      d.flugt = 2.5; d.klapTid = 0.5;
      this.s.lyd.dyrLyd(d.def.lyd);
      if (this.kører) continue;                                    // kampvognen er for stor til at vælte
      const k = 1 / Math.max(0.3, afst);
      sp.vel.x += dx * k * 9; sp.vel.z += dz * k * 9; sp.vel.y = Math.max(sp.vel.y, 6); sp.jord = false;
      this.s.klat("#5fd35f"); this.s.lyd.klask(1);
    }

    // balloner svæver og vipper
    for (const b of [...this.balloner]) {
      b.t += dt;
      b.pos.addScaledVector(b.drift, dt);
      b.model.position.set(b.pos.x, b.pos.y + Math.sin(b.t * 1.5) * 0.25, b.pos.z);
      b.model.rotation.z = Math.sin(b.t * 1.1) * 0.12;
      if (b.pos.distanceTo(sp.pos) > 48 || b.pos.y > verden.BY + 10) { this.balloner.splice(this.balloner.indexOf(b), 1); this.s.scene.remove(b.model); }
    }

    // fjendernes legetøjskampvogne kører rundt og skyder skumkugler efter barnet
    const mål = tmp.set(sp.pos.x, sp.pos.y + 1, sp.pos.z).clone();
    for (const kv of this.fjender) {
      const ai = kv.ai, dx = mål.x - kv.pos.x, dz = mål.z - kv.pos.z, afst = Math.hypot(dx, dz);
      if ((ai.tid -= dt) <= 0) { ai.tid = 2 + Math.random() * 3; ai.drej = (Math.random() - 0.5) * 1.2; ai.frem = Math.random() < 0.75 ? 0.5 : 0; }
      if (kv.blokeret) { kv.blokeret = false; ai.drej = 1; ai.tid = 1.2; }
      if (afst < 9) { ai.frem = -0.4; }                              // ikke for tæt på
      kv.kør(ai.frem, ai.drej, dt, this.s.tyngde);
      if (afst < 28) {
        kv.sigt(Math.atan2(dx, dz), dt);
        if ((ai.skud -= dt) <= 0 && afst < 22) {
          ai.skud = 3 + Math.random() * 2.5;
          const { pos } = kv.munding(), fart = VÅBEN.skum.fart, t = afst / fart, g = VÅBEN.skum.tyngde * this.s.tyngde;
          const r = new THREE.Vector3(dx + (Math.random() - 0.5) * 2, 0, dz + (Math.random() - 0.5) * 2).normalize().multiplyScalar(fart);
          r.y = (mål.y - pos.y) / t + 0.5 * g * t;
          this.affyr("skum", pos, r, { afsender: "fjende" }).vel.copy(r);
          kv.skudt(); this.s.lyd.klask(0.2);
        }
      } else kv.sigt(kv.yaw, dt, 1);
      if (kv.pos.y < -10) kv.pos.y = verden.BY;
      kv.opdater(dt);
    }
    for (const kv of this.egne) {
      if (kv !== this.kører) { kv.kør(0, 0, dt, this.s.tyngde); if (kv.pos.y < -10) kv.pos.y = verden.BY; }
      kv.opdater(dt);
    }

    // alt det, der flyver
    for (let i = this.skud.length - 1; i >= 0; i--) {
      const p = this.skud[i], v = VÅBEN[p.type];
      p.liv -= dt;
      p.vel.y -= v.tyngde * this.s.tyngde * dt;
      const trin = Math.max(1, Math.ceil(p.vel.length() * dt / 0.3));
      let ramt = false;
      for (let n = 0; n < trin && !ramt; n++) {
        p.pos.addScaledVector(p.vel, dt / trin);
        ramt = this.tjekRamt(p);
      }
      if (p.type === "bazooka" && Math.random() < 0.8) this.s.partikel(p.pos.x, p.pos.y, p.pos.z, new THREE.Color("#b0b0b0"), (Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4, 0.7, -0.08, 1.6);
      if (p.type === "atom" && Math.random() < 0.7) this.s.partikel(p.pos.x, p.pos.y, p.pos.z, ATOMGNIST[Math.floor(Math.random() * 3)], (Math.random() - 0.5) * 0.6, 0.5, (Math.random() - 0.5) * 0.6, 0.6, -0.05, 0.9);
      if (!ramt && p.liv <= 0 && v.brag) { this.brag(p.pos.clone(), p.type === "atom"); ramt = true; }
      if (ramt || p.liv <= 0) { this.fjern(p); this.skud.splice(i, 1); continue; }
      p.model.position.copy(p.pos); this.retning(p);
    }
  }

  tjekRamt(p) {
    const { verden, sp, dyr } = this.s;
    if (p.afsender === "fjende") {
      if (Math.hypot(p.pos.x - sp.pos.x, p.pos.z - sp.pos.z) < 0.8 && p.pos.y > sp.pos.y - 0.2 && p.pos.y < sp.pos.y + 2.2) {
        this.s.klat(p.farve); this.s.lyd.klask(1); sp.vel.x += p.vel.x * 0.15; sp.vel.z += p.vel.z * 0.15;
        return true;
      }
    } else {
      for (const b of this.balloner) if (tmp.set(b.pos.x, b.pos.y + 1, b.pos.z).distanceTo(p.pos) < 0.65) { this.ballonPop(b); return true; }
      for (const d of dyr) if (Math.hypot(p.pos.x - d.pos.x, p.pos.z - d.pos.z) < d.b + 0.25 && p.pos.y > d.pos.y && p.pos.y < d.pos.y + d.h + 0.2) { this.ramtDyr(p, d); return true; }
      for (const kv of this.fjender) if (kv.rammer(p.pos)) { this.ramtKampvogn(p, kv); return true; }
      for (const kv of this.egne) if (kv !== this.kører && kv.rammer(p.pos)) { this.ramtKampvogn(p, kv); return true; }
    }
    const x = Math.floor(p.pos.x), y = Math.floor(p.pos.y), z = Math.floor(p.pos.z), id = verden.hent(x, y, z);
    if (id && BLOKKE[id] && !BLOKKE[id].kryds && !BLOKKE[id].væske) { this.ramtBlok(p, x, y, z, id); return true; }
    return !verden.inde(x, Math.max(0, y), z) || y < -2;
  }

  fjern(p) { this.s.scene.remove(p.model); p.model.traverse(c => c.material?.dispose()); }
}

// Farven på en uldblok (til malingskuglerne)
const ULDFARVE = { "Rød uld": "#e03a3a", "Orange uld": "#f28a1e", "Gul uld": "#f5d02a", "Grøn uld": "#4cb748", "Blå uld": "#3a6fe0", "Lilla uld": "#9b4de0", "Lyserød uld": "#f28ac8" };
function BLOKFARVE(id) { return ULDFARVE[BLOKKE[id]?.navn] || "#ffffff"; }
