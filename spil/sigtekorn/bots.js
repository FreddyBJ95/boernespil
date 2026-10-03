// ===== Botterne: soldater, der går rundt i byen, ser og hører fjenderne og skyder med samme våben som dig =====
// En bot ser kun det, den har frit udsyn til (inden for 150°), og hører skud og løbende fodtrin.
// Den reagerer efter en kort tid, sigter med en fejl, der bliver mindre, jo længere den sigter,
// stopper op for at skyde præcist (ligesom man selv skal) og skyder i salver. De svære botter styrer rekylen.

import * as THREE from "./three.js";
import { nyAktør, bevæg, øjeHøjde, KROP, U } from "./bevaegelse.js";
import { nytVåben, affyr, efterSkud, opdaterVåben, skudRetning, genlad, VÅBEN } from "./vaaben.js";
import { findVej, nærmesteKnude, STEDER, START } from "./bane.js";
import { ramKasse } from "./verden.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { clone as klonSkelet } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/utils/SkeletonUtils.js";

// ---------- Soldaten fra Blender (blender/lav_soldat.py): krop, udstyr, skelet og animationer ----------
let soldat = null;
export function hentSoldat() {
  return new Promise(klar => new GLTFLoader().load("modeller/soldat.glb", g => { soldat = g; klar(true); }, undefined, e => { console.warn("Ingen soldat-model", e); klar(false); }));
}
const HOLDFARVER = {
  ræve: { uniform: 0xb89b6e, vest: 0x7e6644, kasket: 0xc8b08a, tørklæde: 0x9a3a2a, vis: ["kasket", "tørklæde"], skjul: ["hjelm", "briller"] },
  slanger: { uniform: 0x5b6a3e, vest: 0x363d26, hjelm: 0x4a5530, vis: ["hjelm", "briller"], skjul: ["kasket", "tørklæde"] },
};
function byggSoldatGLB(hold) {
  const f = HOLDFARVER[hold], g = new THREE.Group(), krop = klonSkelet(soldat.scene);
  krop.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true; o.frustumCulled = false;
      o.material = o.material.clone();
      if (f[o.material.name] !== undefined) o.material.color.set(f[o.material.name]);
    }
  });
  for (const n of f.skjul) { const o = krop.getObjectByName(n); if (o) o.visible = false; }
  g.add(krop);
  const mixer = new THREE.AnimationMixer(krop), handlinger = {};
  for (const c of soldat.animations) handlinger[c.name] = mixer.clipAction(c);
  if (handlinger.død) { handlinger.død.setLoop(THREE.LoopOnce, 1); handlinger.død.clampWhenFinished = true; }
  g.userData = { glb: true, mixer, handlinger, bryst: krop.getObjectByName("bryst"), nu: null };
  return g;
}
const qPitch = new THREE.Quaternion(), xAkse = new THREE.Vector3(1, 0, 0);

const G = Math.PI / 180;
export const NAVNE = ["Grus", "Kaktus", "Sandorm", "Gekko", "Skorpion", "Mirage", "Kamel", "Sahara", "Oase", "Klit", "Støvsky", "Ørkenvind", "Palme", "Fata Morgana"];
export const SVÆRHED = {
  let: { navn: "Let", reaktion: 0.8, drej: 3.5, fejl: 8, sigteTid: 0.9, rekylStyr: 0.15, hoved: 0.05, salve: [2, 4], strafe: 0 },
  normal: { navn: "Normal", reaktion: 0.46, drej: 6.5, fejl: 5, sigteTid: 0.6, rekylStyr: 0.45, hoved: 0.2, salve: [3, 6], strafe: 0.3 },
  svær: { navn: "Svær", reaktion: 0.3, drej: 10, fejl: 3, sigteTid: 0.42, rekylStyr: 0.72, hoved: 0.45, salve: [3, 8], strafe: 0.6 },
  ekspert: { navn: "Ekspert", reaktion: 0.2, drej: 15, fejl: 1.8, sigteTid: 0.3, rekylStyr: 0.88, hoved: 0.7, salve: [4, 10], strafe: 0.85 },
};
// Kroppens dele (stående, i meter): hoved, krop (bryst), mave og ben
const DELE = [["hoved", [-0.13, 1.53, -0.14], [0.13, 1.83, 0.14]], ["krop", [-0.24, 1.15, -0.15], [0.24, 1.53, 0.16]],
  ["mave", [-0.22, 0.88, -0.14], [0.22, 1.15, 0.15]], ["ben", [-0.22, 0, -0.13], [0.22, 0.88, 0.13]]];

// Rammer strålen (o, r) en kæmper (spiller eller bot)? Svarer med { t, del, punkt }
export function træfKrop(a, o, r, maks) {
  const k = a.h / KROP.høj, c = Math.cos(a.yaw), s = Math.sin(a.yaw);
  // drej strålen ind i kroppens eget koordinatsystem
  const ox = o.x - a.pos.x, oz = o.z - a.pos.z;
  const lo = { x: c * ox - s * oz, y: o.y - a.pos.y, z: s * ox + c * oz }, lr = { x: c * r.x - s * r.z, y: r.y, z: s * r.x + c * r.z };
  let bedst = null;
  for (const [del, mn, mx] of DELE) {
    const h = ramKasse(lo, lr, { min: [mn[0], mn[1] * k, mn[2]], max: [mx[0], mx[1] * k, mx[2]] }, bedst ? bedst.t : maks);
    if (h) bedst = { t: h.t, del };
  }
  return bedst;
}

// ---------- Soldaten (af klodser) ----------
const DRAGT = {
  ræve: { trøje: 0xb89a68, bukser: 0x6e5a3c, vest: 0x8a7046, hoved: 0xc8b088, tørklæde: 0x9a3a2a, støvler: 0x3a2c1e },
  slanger: { trøje: 0x55673a, bukser: 0x3d4a2b, vest: 0x2e3324, hoved: 0x4a5530, tørklæde: 0x2a3020, støvler: 0x1e1e1a },
};
function byggSoldat(hold) {
  const d = DRAGT[hold], g = new THREE.Group(), mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
  const hud = mat([0xd9a877, 0xb9805a, 0x8a5a3a, 0xe8c09a][Math.floor(Math.random() * 4)]);
  const kasse = (p, w, h, dd, m, x, y, z) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); k.position.set(x, y, z); k.castShadow = true; p.add(k); return k; };
  const hofte = new THREE.Group(); hofte.position.y = 0.9; g.add(hofte);
  const ben = [-1, 1].map(s => {
    const b = new THREE.Group(); b.position.set(s * 0.11, 0, 0); hofte.add(b);
    kasse(b, 0.17, 0.82, 0.19, mat(d.bukser), 0, -0.41, 0); kasse(b, 0.19, 0.12, 0.27, mat(d.støvler), 0, -0.84, -0.04);
    return b;
  });
  const krop = new THREE.Group(); krop.position.y = 0.9; g.add(krop);
  kasse(krop, 0.44, 0.62, 0.26, mat(d.trøje), 0, 0.31, 0);
  kasse(krop, 0.47, 0.42, 0.3, mat(d.vest), 0, 0.36, 0);
  kasse(krop, 0.3, 0.08, 0.3, mat(d.tørklæde), 0, 0.64, 0);
  const hoved = new THREE.Group(); hoved.position.y = 0.66; krop.add(hoved);
  kasse(hoved, 0.23, 0.26, 0.24, hud, 0, 0.14, 0);
  if (hold === "slanger") { kasse(hoved, 0.28, 0.12, 0.29, mat(d.hoved), 0, 0.27, 0.0); kasse(hoved, 0.21, 0.05, 0.03, mat(0x111111), 0, 0.17, -0.12); }
  else { kasse(hoved, 0.25, 0.1, 0.26, mat(d.hoved), 0, 0.26, 0.01); kasse(hoved, 0.25, 0.1, 0.06, mat(d.tørklæde), 0, 0.06, -0.11); }
  const arme = new THREE.Group(); arme.position.set(0, 0.52, 0); krop.add(arme);
  kasse(arme, 0.1, 0.1, 0.42, mat(d.trøje), 0.2, -0.05, -0.16); kasse(arme, 0.1, 0.1, 0.46, mat(d.trøje), -0.16, -0.05, -0.28);
  kasse(arme, 0.06, 0.09, 0.62, new THREE.MeshStandardMaterial({ color: 0x26282b, metalness: 0.6, roughness: 0.45 }), 0.03, -0.02, -0.45);
  kasse(arme, 0.04, 0.12, 0.06, new THREE.MeshStandardMaterial({ color: 0x26282b, metalness: 0.6, roughness: 0.45 }), 0.03, -0.1, -0.42);
  g.userData = { ben, krop, hoved, arme, hofte };
  return g;
}

export class Bot {
  // s: { scene, verden, knuder, kampfolk(), skyd(skytte, o, r), lyd, nu(), sværhed }
  constructor(s, hold, navn) {
    this.s = s; this.hold = hold; this.navn = navn; this.erSpiller = false;
    this.model = soldat ? byggSoldatGLB(hold) : byggSoldat(hold); s.scene.add(this.model);
    this.drab = 0; this.dødsfald = 0; this.hoveder = 0;
    this.spawn();
  }
  spawn() {
    const [x, z] = START[this.hold][Math.floor(Math.random() * START[this.hold].length)];
    this.a = nyAktør(x + (Math.random() - 0.5) * 2, 0.01, z + (Math.random() - 0.5) * 2, this.hold === "ræve" ? 0 : Math.PI);
    this.liv = 100; this.panser = 100; this.død = false; this.dødTid = 0;
    const sv = this.s.sværhed(); this.sv = sv;
    this.våben = nytVåben(Math.random() < (sv === SVÆRHED.let ? 0.3 : 0.12) ? "pistol" : Math.random() < 0.08 ? "snig" : "gevær");
    if (this.våben.d.zoom) this.våben.kikkert = 1;                     // snigskytte-botten har altid kikkerten på
    this.mål = null; this.setFørst = 0; this.sidstSet = null; this.sidstSetTid = -99; this.vej = []; this.vejMål = null;
    this.tænkTid = Math.random() * 0.12; this.salve = 0; this.salvePause = 0; this.fejlYaw = 0; this.fejlPitch = 0;
    this.fastTid = 0; this.fastPos = this.a.pos.clone(); this.lytte = null; this.strafe = 0; this.strafeTid = 0; this.dukker = false;
    this.model.visible = true; this.model.rotation.set(0, 0, 0); this.fald = 0; this.fase = 0; this.trinTid = 0;
  }
  // En lyd i nærheden (et skud eller fodtrin) — er der ingen fjende i syne, går botten hen og kigger
  hør(pos, fra) {
    if (this.død || this.mål || !fra || fra.hold === this.hold) return;
    this.lytte = { x: pos.x, y: pos.y, z: pos.z, tid: this.s.nu() };
  }
  // Kan botten se fjenden? (fri sigtelinje til hovedet eller brystet)
  kanSe(f, nu) {
    const øje = this.øje(), d = Math.hypot(f.a.pos.x - øje.x, f.a.pos.z - øje.z);
    if (d > 90) return false;
    const ret = Math.atan2(-(f.a.pos.x - øje.x), -(f.a.pos.z - øje.z));
    let v = Math.abs(((ret - this.a.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    if (v > 75 * G && d > 3) return false;
    for (const h of [øjeHøjde(f.a) - 0.05, f.a.h * 0.62]) {
      const mål = new THREE.Vector3(f.a.pos.x, f.a.pos.y + h, f.a.pos.z), r = mål.clone().sub(øje), l = r.length(); r.divideScalar(l);
      const hit = this.s.verden.stråle(øje, r, l);
      if (!hit) return true;
    }
    return false;
  }
  øje() { return new THREE.Vector3(this.a.pos.x, this.a.pos.y + øjeHøjde(this.a), this.a.pos.z); }

  // ---------- Ét tick ----------
  tick(dt) {
    const nu = this.s.nu();
    if (this.død) { this.fald = Math.min(1, this.fald + dt * 2.5); return; }
    opdaterVåben(this.våben, dt);
    if ((this.tænkTid -= dt) <= 0) { this.tænkTid = 0.1; this.tænk(nu); }
    let frem = 0, side = 0, duk = false, hop = false, gå = false;
    const sv = this.sv;
    if (this.mål) {
      // ---- kamp: sigt og skyd ----
      const f = this.mål, øje = this.øje();
      const del = this.hovedSigte ? øjeHøjde(f.a) - 0.04 : f.a.h * 0.6;
      const dx = f.a.pos.x - øje.x, dy = f.a.pos.y + del - øje.y, dz = f.a.pos.z - øje.z, l = Math.hypot(dx, dz);
      const ønskYaw = Math.atan2(-dx, -dz) + this.fejlYaw, ønskPitch = Math.atan2(dy, l) + this.fejlPitch;
      this.drejMod(ønskYaw, ønskPitch, dt);
      // fejlen bliver mindre, jo længere botten sigter (men forsvinder aldrig helt)
      const k = Math.exp(-dt / (sv.sigteTid * 0.5));
      this.fejlYaw *= k; this.fejlPitch *= k;
      const afvig = Math.abs(vinkel(ønskYaw - this.fejlYaw - this.a.yaw)) + Math.abs(ønskPitch - this.fejlPitch - this.a.pitch);
      const tolerance = Math.max(1.2 * G, Math.atan2(0.3, l));
      // står stille for at ramme (eller strafer lidt mellem salverne, hvis den er god)
      if (this.salvePause > 0) { this.salvePause -= dt; if (sv.strafe > Math.random() * 1.5) side = this.strafe; }
      else if (nu >= this.setFørst && afvig < tolerance * 2.5 && l > 1) {          // først når botten har nået at reagere
        const fart = Math.hypot(this.a.vel.x, this.a.vel.z);
        if (fart < this.våben.d.fart * 0.36 || this.våben.d.nærkamp) this.skyd();
      }
      if ((this.strafeTid -= dt) <= 0) { this.strafeTid = 0.3 + Math.random() * 0.5; this.strafe = Math.random() < 0.5 ? -1 : 1; }
      duk = this.dukker;
      if (this.våben.skud <= 0) genlad(this.våben);
    } else {
      // ---- gå efter vej-nettet (mod det, den har hørt, det sidste sted, den så fjenden, eller et sted i byen) ----
      const p = this.næstePunkt(nu);
      if (p) {
        const dx = p.x - this.a.pos.x, dz = p.z - this.a.pos.z;
        const ønskYaw = Math.atan2(-dx, -dz);
        this.drejMod(ønskYaw, 0, dt);
        frem = Math.abs(vinkel(ønskYaw - this.a.yaw)) < 1.2 ? 1 : 0.2;
        // sidder den fast? så hop — og find en ny vej, hvis det ikke hjælper
        if ((this.fastTid += dt) > 0.9) {
          if (this.a.pos.distanceTo(this.fastPos) < 0.5) { hop = true; if (this.fastTid > 2.2) { this.vej = []; this.vejMål = null; this.fastTid = 0; } }
          else { this.fastTid = 0; this.fastPos.copy(this.a.pos); }
        }
      }
      if (this.våben.skud < this.våben.d.magasin * 0.4) genlad(this.våben);
    }
    const maks = (this.våben.kikkert && this.våben.d.kikkertFart) || this.våben.d.fart;
    bevæg(this.a, { frem, side, hop, gå, duk }, dt, this.s.verden, maks);
    // fodtrin, som de andre kan høre
    const fart = Math.hypot(this.a.vel.x, this.a.vel.z);
    if (this.a.jord && fart > this.våben.d.fart * 0.6 && (this.trinTid -= dt * fart) <= 0) { this.trinTid = 1.9; this.s.trin(this); }
  }
  drejMod(yaw, pitch, dt) {
    const d = vinkel(yaw - this.a.yaw), maks = this.sv.drej * dt;
    this.a.yaw += Math.max(-maks, Math.min(maks, d * Math.min(1, dt * 14)));
    this.a.pitch += Math.max(-maks, Math.min(maks, (pitch - this.a.pitch) * Math.min(1, dt * 14)));
  }
  // Hvor skal botten gå hen nu? Svarer med det næste punkt på vejen
  næstePunkt(nu) {
    const { knuder } = this.s;
    let mål = null;
    if (this.sidstSet && nu - this.sidstSetTid < 7) mål = this.sidstSet;
    else if (this.lytte && nu - this.lytte.tid < 6) mål = this.lytte;
    if (mål && (!this.vejMål || Math.hypot(this.vejMål.x - mål.x, this.vejMål.z - mål.z) > 3)) this.lavVej(mål);
    if (!this.vej.length) {
      if (mål) { this.sidstSet = null; this.lytte = null; }
      const steder = Object.values(STEDER), [x, z] = steder[Math.floor(Math.random() * steder.length)];
      this.lavVej({ x: x + (Math.random() - 0.5) * 10, y: 0, z: z + (Math.random() - 0.5) * 10 });
      if (!this.vej.length) return null;
    }
    const k = knuder[this.vej[0]];
    if (Math.hypot(k.x - this.a.pos.x, k.z - this.a.pos.z) < 0.9) { this.vej.shift(); this.fastTid = 0; this.fastPos.copy(this.a.pos); }
    return this.vej.length ? knuder[this.vej[0]] : null;
  }
  lavVej(mål) {
    const { knuder } = this.s;
    const fra = nærmesteKnude(knuder, this.a.pos.x, this.a.pos.y, this.a.pos.z), til = nærmesteKnude(knuder, mål.x, mål.y ?? 0, mål.z);
    this.vej = (fra >= 0 && til >= 0 && findVej(knuder, fra, til)) || [];
    this.vejMål = { x: mål.x, z: mål.z };
  }
  // ---------- Tænk (10 gange i sekundet): hvem kan den se? ----------
  tænk(nu) {
    const fjender = this.s.kampfolk().filter(f => f.hold !== this.hold && !f.død);
    if (this.mål && (this.mål.død || !fjender.includes(this.mål))) this.mål = null;
    if (this.mål && !this.kanSe(this.mål, nu)) {                 // fjenden forsvandt bag noget: husk, hvor den var
      this.sidstSet = this.mål.a.pos.clone(); this.sidstSetTid = nu; this.mål = null; this.vej = []; this.vejMål = null;
    }
    if (!this.mål) {
      let bedst = null, bd = Infinity;
      for (const f of fjender) { const d = f.a.pos.distanceTo(this.a.pos); if (d < bd && this.kanSe(f, nu)) { bd = d; bedst = f; } }
      if (bedst) {
        this.mål = bedst; this.sidstSet = null; this.lytte = null;
        this.setFørst = nu + this.sv.reaktion * (0.8 + Math.random() * 0.45);
        const fejl = this.sv.fejl * G * (0.6 + Math.random() * 0.8), v = Math.random() * Math.PI * 2;
        this.fejlYaw = Math.cos(v) * fejl; this.fejlPitch = Math.sin(v) * fejl * 0.6;
        this.hovedSigte = Math.random() < this.sv.hoved;
        this.dukker = bd > 18 && Math.random() < this.sv.strafe * 0.5;
        this.salve = 0; this.salvePause = 0;
      }
    }
  }
  // Skyd ét skud (salver: et par skud og så en kort pause, så rekylen falder til ro)
  skyd() {
    const v = this.våben;
    if (!affyr(v)) { if (v.skud <= 0) genlad(v); return; }
    const m = v.d.mønster, i = m ? Math.min(Math.floor(v.rekyl), m.length - 1) : 0, [op, højre] = m ? m[i] : [0, 0];
    // gode botter trækker imod rekylen
    const yaw = this.a.yaw + højre * G * this.sv.rekylStyr, pitch = this.a.pitch - op * G * this.sv.rekylStyr;
    const ret = skudRetning(v, this.a, yaw, pitch);
    efterSkud(v);
    this.s.skyd(this, this.øje(), ret, v);
    this.salve++;
    const [min, maks] = this.sv.salve;
    if (!v.d.auto || this.salve >= min + Math.floor(Math.random() * (maks - min + 1))) { this.salve = 0; this.salvePause = v.d.auto ? 0.22 + Math.random() * 0.3 : 0.25 + Math.random() * 0.35; }
  }
  // Ramt: mist liv — og vend dig mod den, der skød
  ramt(skade, fra) {
    this.liv -= skade.liv; this.panser = Math.max(0, this.panser - skade.panser);
    if (!this.mål && fra && !fra.død) { this.sidstSet = fra.a.pos.clone(); this.sidstSetTid = this.s.nu(); this.vej = []; this.vejMål = null;
      this.drejMod(Math.atan2(-(fra.a.pos.x - this.a.pos.x), -(fra.a.pos.z - this.a.pos.z)), 0, 0.15); }
    if (this.liv <= 0) { this.død = true; this.dødTid = this.s.nu(); this.fald = 0; this.dødsfald++; return true; }
    return false;
  }

  // ---------- Hvert billede: flyt modellen og lad den gå, sigte og falde ----------
  tegn(alfa, dt) {
    const a = this.a, u = this.model.userData;
    this.model.position.lerpVectors(a.forrige, a.pos, alfa);
    this.model.rotation.y = a.yaw;
    const fart = Math.hypot(a.vel.x, a.vel.z);
    if (u.glb) { this.tegnGLB(u, fart, dt); return; }
    this.fase += dt * fart * 2.4;
    const sving = Math.sin(this.fase) * Math.min(1, fart / 4) * 0.7;
    u.ben[0].rotation.x = sving; u.ben[1].rotation.x = -sving;
    const duk = a.duk;
    u.hofte.position.y = 0.9 - duk * 0.38; u.krop.position.y = 0.9 - duk * 0.42;
    u.ben.forEach(b => { b.rotation.x -= duk * 0.9; });
    u.arme.rotation.x = a.pitch; u.hoved.rotation.x = a.pitch * 0.6;
    if (this.død) { this.model.rotation.x = this.fald * 1.45; this.model.position.y -= this.fald * 0.15; }
    else this.model.rotation.x = 0;
  }
}
// Soldaten fra Blender: vælg animationen efter fart og dukning — og drej brystet med sigtet
Bot.prototype.tegnGLB = function (u, fart, dt) {
  const a = this.a;
  const navn = this.død ? "død" : a.duk > 0.5 ? (fart > 0.4 ? "dukgå" : "duk") : fart > 3.6 ? "løb" : fart > 0.4 ? "gå" : "stå";
  if (navn !== u.nu) {
    const ny = u.handlinger[navn], gammel = u.handlinger[u.nu];
    if (ny) { ny.reset(); ny.play(); if (gammel) ny.crossFadeFrom(gammel, navn === "død" ? 0.08 : 0.18, false); }
    u.nu = navn;
  }
  const h = u.handlinger[navn];
  if (h && (navn === "løb" || navn === "gå" || navn === "dukgå")) h.timeScale = Math.max(0.6, fart / (navn === "løb" ? 5.4 : navn === "gå" ? 2.4 : 1.6));
  u.mixer.update(dt);
  if (u.bryst && !this.død) u.bryst.quaternion.multiply(qPitch.setFromAxisAngle(xAkse, -a.pitch));   // sigt op og ned
};
// En vinkel mellem −π og π
export function vinkel(v) { return ((v + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
