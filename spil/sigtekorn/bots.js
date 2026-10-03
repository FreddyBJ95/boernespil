// ===== Botterne: soldater, der går rundt i byen, ser og hører fjenderne og skyder med samme våben som dig =====
// En bot ser kun det, den har frit udsyn til (inden for 150°), og hører skud og løbende fodtrin.
// Uden fjender i syne går den hen til en "post" (et godt sted at holde øje fra) og holder den et stykke tid;
// holdkammeraterne fordeler sig, så hele byen bliver brugt. Bliver den hårdt ramt, søger den dækning.
// Mister den en arm, kan den kun bruge pistol (og uden arme kan den ikke skyde). Mister den et ben, kravler den.
// Den reagerer efter en kort tid, sigter med en fejl, der bliver mindre, jo længere den sigter,
// stopper op for at skyde præcist (ligesom man selv skal) og skyder i salver. De svære botter styrer rekylen.

import * as THREE from "./three.js";
import { nyAktør, bevæg, øjeHøjde, KROP, U } from "./bevaegelse.js";
import { nytVåben, aftrækker, efterSkud, opdaterVåben, skudRetning, genlad, VÅBEN } from "./vaaben.js";
import { findVej, nærmesteKnude } from "./bane.js";
import { ramKasse } from "./verden.js";
import { Figur, hentLeddeløs, harLeddeløs } from "./leddeloes.js";

// Soldaterne er leddeløse (leddeloes.js): hovedet, armene og benene kan skydes af hver for sig
export { hentLeddeløs as hentSoldat };

const G = Math.PI / 180;
// Botternes udrustning: hovedvåben efter hvor almindelige de er (de sjældne er sjældne), og en pistol
const BOTVÅBEN = [["storm", 14], ["taktisk", 10], ["salve", 6], ["kamp", 5], ["mp", 9], ["sprøjte", 6], ["pump", 6], ["hagl", 4],
  ["snig", 3], ["jagt", 3], ["spejder", 4], ["lmg", 4], ["minigun", 1.5], ["raket", 1.5], ["armbrøst", 2]];
const BOTPISTOL = [["pistol", 5], ["lydløs", 2], ["automat", 2], ["revolver", 1.5]];
function lodtrækning(liste) {
  let r = Math.random() * liste.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of liste) if ((r -= w) <= 0) return id;
  return liste[0][0];
}

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
    this.fig = harLeddeløs() ? new Figur(hold) : null;
    this.model = this.fig ? this.fig.model : byggSoldat(hold); s.scene.add(this.model);
    this.drab = 0; this.dødsfald = 0; this.hoveder = 0;
    this.spawn();
  }
  spawn() {
    this.fig?.nulstil();
    for (const o of this.model.children) if (o.isSprite) o.visible = true;
    const start = this.s.bane.start[this.hold], [x, z] = start[Math.floor(Math.random() * start.length)];
    this.a = nyAktør(x + (Math.random() - 0.5) * 2, 0.01, z + (Math.random() - 0.5) * 2, this.hold === "ræve" ? 0 : Math.PI);
    this.liv = 100; this.panser = 100; this.død = false; this.dødTid = 0;
    const sv = this.s.sværhed(); this.sv = sv;
    this.sekundær = lodtrækning(BOTPISTOL);
    this.våben = nytVåben(Math.random() < (sv === SVÆRHED.let ? 0.2 : 0.06) ? this.sekundær : lodtrækning(BOTVÅBEN));
    if (this.våben.d.zoom) this.våben.kikkert = 1;                     // botter med kikkert har den altid på
    this.blindTil = 0; this.næsteKast = 0;
    this.granater = Math.random() < 0.65 ? [lodtrækning([["he", 5], ["blænd", 3], ["røg", 2]])] : [];
    this.mål = null; this.setFørst = 0; this.sidstSet = null; this.sidstSetTid = -99; this.vej = []; this.vejMål = null;
    this.tænkTid = Math.random() * 0.12; this.salve = 0; this.salvePause = 0; this.fejlYaw = 0; this.fejlPitch = 0;
    this.fastTid = 0; this.fastPos = this.a.pos.clone(); this.lytte = null; this.strafe = 0; this.strafeTid = 0; this.dukker = false;
    this.post = null; this.holder = false; this.holdTil = 0; this.holdDuk = false; this.flygt = null; this.sidstHørt = -9; this.fase0 = Math.random() * 6;
    this.model.visible = true; this.model.rotation.set(0, 0, 0); this.fald = 0; this.fase = 0; this.trinTid = 0;
  }
  // En lyd i nærheden (et skud eller fodtrin) — er der ingen fjende i syne, går botten hen og kigger
  // (højst hvert andet sekund, ikke for langt væk — og ikke altid: en bot, der holder en post, bliver ofte, hvor den er)
  hør(pos, fra) {
    if (this.død || this.mål || this.flygt || !fra || fra.hold === this.hold) return;
    const nu = this.s.nu(), d = Math.hypot(pos.x - this.a.pos.x, pos.z - this.a.pos.z);
    if (nu - this.sidstHørt < 2 || d > 26) return;
    this.sidstHørt = nu;
    if (Math.random() > (this.holder ? 0.35 : 0.6) * (1 - d / 45)) return;
    this.lytte = { x: pos.x, y: pos.y, z: pos.z, tid: nu };
    if (this.granater.length && nu > this.næsteKast && d > 8 && d < 22 && Math.random() < 0.3 && this.fig?.harArm() !== false) this.kast(pos, nu);   // en granat efter lyden
  }
  // Kan botten se fjenden? (fri sigtelinje til hovedet eller brystet)
  kanSe(f, nu) {
    if (nu < this.blindTil) return false;                                // blændet af en blændgranat
    const øje = this.øje(), d = Math.hypot(f.a.pos.x - øje.x, f.a.pos.z - øje.z);
    if (d > 90) return false;
    const ret = Math.atan2(-(f.a.pos.x - øje.x), -(f.a.pos.z - øje.z));
    let v = Math.abs(((ret - this.a.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    if (v > 75 * G && d > 3) return false;
    for (const h of [øjeHøjde(f.a) - 0.05, f.a.h * 0.62]) {
      const mål = new THREE.Vector3(f.a.pos.x, f.a.pos.y + h, f.a.pos.z), r = mål.clone().sub(øje), l = r.length(); r.divideScalar(l);
      const hit = this.s.verden.stråle(øje, r, l);
      if (!hit && !this.s.røgBlokerer?.(øje, mål)) return true;          // (man kan ikke se gennem røg)
    }
    return false;
  }
  øje() { return new THREE.Vector3(this.a.pos.x, this.a.pos.y + øjeHøjde(this.a), this.a.pos.z); }
  // Rammer strålen botten? Svarer med { t, del, lem } (lem: "armR", "benL", "hoved" … — den del, der kan flyve af)
  træf(o, r, maks) { return this.fig ? this.fig.træf(o, r, maks) : træfKrop(this.a, o, r, maks); }

  // ---------- Ét tick ----------
  tick(dt) {
    const nu = this.s.nu();
    if (this.død) { this.fald = Math.min(1, this.fald + dt * 2.5); return; }
    if (this.våben) opdaterVåben(this.våben, dt);
    if ((this.tænkTid -= dt) <= 0) { this.tænkTid = 0.1; this.tænk(nu); }
    let frem = 0, side = 0, duk = false, hop = false, gå = false, trykker = false;
    const sv = this.sv;
    if (this.flygt && (nu > this.flygt.til || (!this.vej.length && this.flygt.fremme && nu > this.flygt.fremme + 1.2))) {   // færdig med at gemme sig: kig efter fjenden igen
      this.sidstSet = this.flygt.fra; this.sidstSetTid = nu; this.flygt = null; this.vej = []; this.vejMål = null;
    }
    if (this.flygt) {
      // ---- søg dækning: løb om bag noget, genlad og vent lidt ----
      const p = this.følgVej();
      if (p) [frem, hop] = this.gåMod(p, dt);
      else { if (!this.flygt.fremme) this.flygt.fremme = nu; duk = true; }
      if (this.våben && this.våben.skud < this.våben.d.magasin) genlad(this.våben);
    } else if (this.mål && this.våben) {
      // ---- kamp: sigt og skyd ----
      const f = this.mål, øje = this.øje();
      const d = this.våben.d, del = d.projektil === "raket" ? 0.15 : this.hovedSigte ? øjeHøjde(f.a) - 0.04 : f.a.h * 0.6;   // raketter: sigt efter fødderne
      const dx = f.a.pos.x - øje.x, dz = f.a.pos.z - øje.z, l = Math.hypot(dx, dz);
      const fald = d.projektil ? 0.5 * (d.projektil === "raket" ? 6.6 : 11) * (l / (d.projektil === "raket" ? 34 : 78)) ** 2 : 0;   // pile og raketter falder lidt
      const dy = f.a.pos.y + del + fald - øje.y;
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
        if (fart < d.fart * 0.36 || d.klasse === "mp" || d.nærkamp) trykker = true;
      }
      if ((d.klasse === "hagl" && l > 9) || (d.projektil === "raket" && l < 6)) { frem = d.klasse === "hagl" ? 1 : -1; trykker = trykker && d.klasse !== "hagl"; }   // haglgevær: storm frem · raket: træd tilbage
      if ((this.strafeTid -= dt) <= 0) { this.strafeTid = 0.3 + Math.random() * 0.5; this.strafe = Math.random() < 0.5 ? -1 : 1; }
      duk = this.dukker;
      if (this.våben.skud <= 0) genlad(this.våben);
    } else {
      // ---- gå efter vej-nettet (mod det, den har hørt, det sidste sted, den så fjenden, eller en post) — eller hold posten ----
      const p = this.næstePunkt(nu);
      if (p) [frem, hop] = this.gåMod(p, dt);
      else if (this.holder && this.post) {                             // hold øje: kig mod det sted, fjenden kan komme fra
        const [, , kx, kz] = this.post, yaw = Math.atan2(-(kx - this.a.pos.x), -(kz - this.a.pos.z)) + Math.sin(nu * 0.6 + this.fase0) * 0.3;
        this.drejMod(yaw, 0, dt); duk = this.holdDuk;
      }
      if (this.våben && this.våben.skud < this.våben.d.magasin * 0.4) genlad(this.våben);
    }
    const maks = this.våben ? (this.våben.kikkert && this.våben.d.kikkertFart) || this.våben.d.fart : 6.2;
    bevæg(this.a, { frem, side, hop, gå, duk }, dt, this.s.verden, maks);
    if (this.våben && aftrækker(this.våben, trykker, dt, true)) this.skyd();   // salver, opspin og kadence styres af aftrækkeren
    // fodtrin, som de andre kan høre
    const fart = Math.hypot(this.a.vel.x, this.a.vel.z);
    if (this.a.jord && !this.a.kravl && fart > maks * 0.6 && (this.trinTid -= dt * fart) <= 0) { this.trinTid = 1.9; this.s.trin(this); }
  }
  drejMod(yaw, pitch, dt) {
    const d = vinkel(yaw - this.a.yaw), maks = this.sv.drej * dt;
    this.a.yaw += Math.max(-maks, Math.min(maks, d * Math.min(1, dt * 14)));
    this.a.pitch += Math.max(-maks, Math.min(maks, (pitch - this.a.pitch) * Math.min(1, dt * 14)));
  }
  // Gå mod et punkt — og hop, hvis den sidder fast (og find en ny vej, hvis det ikke hjælper). Svarer med [frem, hop]
  gåMod(p, dt) {
    const dx = p.x - this.a.pos.x, dz = p.z - this.a.pos.z, ønskYaw = Math.atan2(-dx, -dz);
    this.drejMod(ønskYaw, 0, dt);
    let hop = false;
    if ((this.fastTid += dt) > 0.9) {
      if (this.a.pos.distanceTo(this.fastPos) < 0.5) { hop = true; if (this.fastTid > 2.2) { this.vej = []; this.vejMål = null; this.fastTid = 0; } }
      else { this.fastTid = 0; this.fastPos.copy(this.a.pos); }
    }
    return [Math.abs(vinkel(ønskYaw - this.a.yaw)) < 1.2 ? 1 : 0.2, hop];
  }
  // Det næste punkt på den vej, botten er i gang med (eller null, når den er fremme)
  følgVej() {
    const { knuder } = this.s;
    if (!this.vej.length) return null;
    const k = knuder[this.vej[0]];
    if (Math.hypot(k.x - this.a.pos.x, k.z - this.a.pos.z) < 0.9) { this.vej.shift(); this.fastTid = 0; this.fastPos.copy(this.a.pos); }
    return this.vej.length ? knuder[this.vej[0]] : null;
  }
  // Hvor skal botten gå hen nu? Undersøg det, den har set eller hørt — eller gå til en post og hold den
  næstePunkt(nu) {
    let mål = null;
    if (this.sidstSet && nu - this.sidstSetTid < 7) mål = this.sidstSet;
    else if (this.lytte && nu - this.lytte.tid < 6) mål = this.lytte;
    if (mål) {
      this.holder = false;
      if (!this.vejMål || Math.hypot(this.vejMål.x - mål.x, this.vejMål.z - mål.z) > 3) this.lavVej(mål);
      const p = this.følgVej();
      if (!p) { this.sidstSet = null; this.lytte = null; this.post = null; }
      return p;
    }
    if (this.holder) {
      if (nu < this.holdTil) return null;
      this.holder = false; this.post = null;
    }
    for (let forsøg = 0; !this.post && forsøg < 4; forsøg++) {      // (kan botten ikke finde vej derhen, prøver den en anden post)
      this.post = this.vælgPost(); this.vejTilPost(this.post);
      if (!this.vej.length && Math.hypot(this.post[0] - this.a.pos.x, this.post[1] - this.a.pos.z) > 3) this.post = null;
    }
    if (!this.post) return null;
    const p = this.følgVej();
    if (!p) {                                                         // fremme ved posten: hold den 4–13 sekunder
      this.holder = true; this.holdTil = nu + 4 + Math.random() * 9; this.holdDuk = Math.random() < 0.3;
    }
    return p;
  }
  // Vælg en post: helst 8–55 meter væk, ikke den samme som sidst, og hvor der ikke allerede er holdkammerater
  vælgPost() {
    const venner = this.s.kampfolk().filter(f => f !== this && f.hold === this.hold && !f.død);
    let sum = 0;
    const POSTER = this.s.bane.poster;
    const vægte = POSTER.map(p => {
      const d = Math.hypot(p[0] - this.a.pos.x, p[1] - this.a.pos.z);
      let w = d < 8 ? 0.15 : 1;
      const [fx, fz] = this.s.bane.start[this.hold === "ræve" ? "slanger" : "ræve"][0];
      if (Math.hypot(p[0] - fx, p[1] - fz) < 18) w *= 0.25;             // ikke helt hen til fjendernes start
      w *= this.s.bane.postVægt(p);                                    // banen kan gøre nogle poster mere eller mindre populære
      if (p === this.sidstePost) w *= 0.1;
      for (const v of venner) {
        const vd = v.post ? Math.hypot(v.post[0] - p[0], v.post[1] - p[1]) : Math.hypot(v.a.pos.x - p[0], v.a.pos.z - p[1]);
        if (vd < 12) w *= 0.3;
      }
      sum += w; return w;
    });
    let r = Math.random() * sum;
    for (let i = 0; i < POSTER.length; i++) if ((r -= vægte[i]) <= 0) return (this.sidstePost = POSTER[i]);
    return (this.sidstePost = POSTER[0]);
  }
  // Hårdt ramt: løb om bag noget, som skytten ikke kan se igennem (et punkt på vej-nettet 3–11 meter væk)
  søgDækning(fra, nu) {
    const { knuder, verden } = this.s, øje = new THREE.Vector3(fra.a.pos.x, fra.a.pos.y + øjeHøjde(fra.a), fra.a.pos.z);
    let bedst = -1, bd = Infinity;
    for (let i = 0; i < knuder.length; i++) {
      const k = knuder[i], d = Math.hypot(k.x - this.a.pos.x, k.z - this.a.pos.z);
      if (d < 3 || d > 11 || d >= bd || Math.abs(k.y - this.a.pos.y) > 1.2) continue;
      const r = new THREE.Vector3(k.x, k.y + 1.3, k.z).sub(øje), l = r.length(); r.divideScalar(l);
      if (verden.stråle(øje, r, l)) { bd = d; bedst = i; }
    }
    if (bedst < 0) return;
    const fraKnude = nærmesteKnude(knuder, this.a.pos.x, this.a.pos.y, this.a.pos.z);
    this.vej = (fraKnude >= 0 && findVej(knuder, fraKnude, bedst)) || []; this.vejMål = null;
    if (!this.vej.length) return;
    this.flygt = { til: nu + 3.5 + Math.random() * 2, fremme: 0, fra: fra.a.pos.clone() };
    this.mål = null; this.holder = false;
  }
  // Vejen til en post. Ofte går botten forbi en "omvej" (et punkt på en sidevej, som banen har valgt), så ikke
  // alle går den korteste vej gennem midten — men kun hvis omvejen ikke er alt for lang
  vejTilPost(post) {
    const { knuder } = this.s, [px, pz] = post, p = this.a.pos, lige = Math.hypot(px - p.x, pz - p.z);
    const muligt = this.s.bane.omveje.filter(([vx, vz]) => Math.hypot(vx - p.x, vz - p.z) + Math.hypot(px - vx, pz - vz) < lige * 1.45 + 12 && Math.hypot(vx - p.x, vz - p.z) > 8);
    if (lige > 25 && muligt.length && Math.random() < 0.6) {
      const [vx, vz] = muligt[Math.floor(Math.random() * muligt.length)], via = { x: vx, y: 0, z: vz };
      const a = nærmesteKnude(knuder, p.x, p.y, p.z), b = nærmesteKnude(knuder, via.x, 0, via.z), c = nærmesteKnude(knuder, px, 0, pz);
      const v1 = findVej(knuder, a, b), v2 = v1 && findVej(knuder, b, c);
      if (v1 && v2) { this.vej = v1.concat(v2.slice(1)); this.vejMål = { x: px, z: pz }; return; }
    }
    this.lavVej({ x: px, y: 0, z: pz });
  }
  lavVej(mål) {
    const { knuder } = this.s;
    const fra = nærmesteKnude(knuder, this.a.pos.x, this.a.pos.y, this.a.pos.z), til = nærmesteKnude(knuder, mål.x, mål.y ?? 0, mål.z);
    this.vej = (fra >= 0 && til >= 0 && findVej(knuder, fra, til)) || [];
    this.vejMål = { x: mål.x, z: mål.z };
  }
  // Kast en granat derhen, hvor fjenden sidst blev set (en bue, der lander der)
  kast(mål, nu) {
    const type = this.granater.pop(), o = this.øje(), dx = mål.x - o.x, dz = mål.z - o.z, d = Math.hypot(dx, dz);
    const v = Math.min(18, Math.sqrt(11 * d / Math.sin(2 * 0.62))), c = Math.cos(0.62) * v / d;
    this.s.kast(this, type, o.add(new THREE.Vector3(dx / d * 0.4, 0, dz / d * 0.4)), new THREE.Vector3(dx * c, Math.sin(0.62) * v, dz * c));
    this.næsteKast = nu + 6;
  }
  // ---------- Tænk (10 gange i sekundet): hvem kan den se? ----------
  tænk(nu) {
    const fjender = this.s.kampfolk().filter(f => f.hold !== this.hold && !f.død);
    if (this.mål && (this.mål.død || !fjender.includes(this.mål))) this.mål = null;
    if (this.mål && !this.kanSe(this.mål, nu)) {                 // fjenden forsvandt bag noget: husk, hvor den var
      this.sidstSet = this.mål.a.pos.clone(); this.sidstSetTid = nu; this.mål = null; this.vej = []; this.vejMål = null;
    }
    // en fjende forsvandt lige bag et hjørne i nærheden: måske en granat efter den
    if (!this.mål && this.granater.length && this.sidstSet && nu - this.sidstSetTid < 4 && nu > this.næsteKast && this.fig?.harArm() !== false) {
      const d = Math.hypot(this.sidstSet.x - this.a.pos.x, this.sidstSet.z - this.a.pos.z);
      if (d > 7 && d < 24 && Math.random() < 0.14) this.kast(this.sidstSet, nu);
    }
    if (!this.mål && !this.flygt && this.våben) {
      let bedst = null, bd = Infinity;
      for (const f of fjender) { const d = f.a.pos.distanceTo(this.a.pos); if (d < bd && this.kanSe(f, nu)) { bd = d; bedst = f; } }
      if (bedst) {
        this.mål = bedst; this.sidstSet = null; this.lytte = null;
        const langt = Math.max(0, bd - 25) / 40;                          // langt væk: det tager længere tid at opdage og sigte
        this.setFørst = nu + this.sv.reaktion * (0.8 + Math.random() * 0.45) * (1 + langt);
        const fejl = this.sv.fejl * G * (0.6 + Math.random() * 0.8) * (1 + langt * 0.6), v = Math.random() * Math.PI * 2;
        this.fejlYaw = Math.cos(v) * fejl; this.fejlPitch = Math.sin(v) * fejl * 0.6;
        this.hovedSigte = Math.random() < this.sv.hoved;
        this.dukker = bd > 18 && Math.random() < this.sv.strafe * 0.5;
        this.salve = 0; this.salvePause = 0;
      }
    }
  }
  // Skyd ét skud (salver: et par skud og så en kort pause, så rekylen falder til ro)
  // Ét skud (aftrækkeren har allerede brugt patronen)
  skyd() {
    const v = this.våben;
    const m = v.d.mønster, i = m ? Math.min(Math.floor(v.rekyl), m.length - 1) : 0, [op, højre] = m ? m[i] : [0, 0];
    // gode botter trækker imod rekylen
    const yaw = this.a.yaw + højre * G * this.sv.rekylStyr, pitch = this.a.pitch - op * G * this.sv.rekylStyr;
    const ret = skudRetning(v, this.a, yaw, pitch);
    efterSkud(v);
    this.s.skyd(this, this.øje(), ret, v); this.fig?.skyd();
    this.salve++;
    const [min, maks] = this.sv.salve;
    if (!v.d.auto || this.salve >= min + Math.floor(Math.random() * (maks - min + 1))) {
      this.salve = 0; this.salvePause = v.d.auto ? 0.22 + Math.random() * 0.3 : 0.25 + Math.random() * 0.35;
      // langt væk (og ikke snigskytte): skyd en salve og gå i dækning igen i stedet for at stå midt på gaden
      const m = this.mål;
      if (m && !v.d.zoom && v.d.klasse !== "tung" && m.a.pos.distanceTo(this.a.pos) > 35 && Math.random() < 0.45) this.søgDækning(m, this.s.nu());
    }
  }
  // Ramt: mist liv — og vend dig mod den, der skød
  // skud: { r: kuglens retning, del: kropsdelen, lem: den del, der kan flyve af, kraft }
  ramt(skade, fra, skud = null) {
    this.liv -= skade.liv; this.panser = Math.max(0, this.panser - skade.panser);
    if (this.fig && skud?.lem === "hoved" && !skud.kniv) this.liv = 0;                   // skudt i hovedet: hovedet flyver af
    if (!this.mål && fra && !fra.død) { this.sidstSet = fra.a.pos.clone(); this.sidstSetTid = this.s.nu(); this.vej = []; this.vejMål = null;
      this.drejMod(Math.atan2(-(fra.a.pos.x - this.a.pos.x), -(fra.a.pos.z - this.a.pos.z)), 0, 0.15); }
    if (this.liv <= 0) {
      this.død = true; this.dødTid = this.s.nu(); this.fald = 0; this.dødsfald++;
      for (const o of this.model.children) if (o.isSprite) o.visible = false;
      this.fig?.falder(skud, this.s.scene, this.s.verden, this.fart(), this.s.delLyd);
      return true;
    }
    if (this.fig && skud?.lem && skud.lem !== "hoved") this.mistLem(skud.lem, skud);
    if (fra && !this.flygt && this.liv < 55 && Math.random() < 0.55) this.søgDækning(fra, this.s.nu());
    return false;
  }
  fart() { return new THREE.Vector3(this.a.vel.x, Math.max(-2, this.a.vel.y), this.a.vel.z); }
  // En arm eller et ben flyver af. Uden en arm taber den våbnet og trækker pistolen med den anden hånd
  // (uden arme kan den ikke skyde). Uden et ben kravler den
  mistLem(lem, skud) {
    const { scene, verden, delLyd } = this.s, fart = this.fart();
    if (lem.startsWith("arm") && this.våben) {
      this.fig.tabVåben(null, scene, verden, fart, delLyd);
      this.fig.skydAf(lem, skud, scene, verden, fart, delLyd);
      this.våben = this.fig.harArm() ? nytVåben(this.sekundær || "pistol") : null;
      if (!this.våben) this.mål = null;
    } else this.fig.skydAf(lem, skud, scene, verden, fart, delLyd);
    if (lem.startsWith("ben")) { this.a.kravl = true; this.dukker = false; }
  }

  // ---------- Hvert billede: flyt modellen og lad den gå, sigte og falde ----------
  tegn(alfa, dt) {
    const a = this.a, u = this.model.userData;
    this.model.position.lerpVectors(a.forrige, a.pos, alfa);
    this.model.rotation.y = a.yaw;
    const fart = Math.hypot(a.vel.x, a.vel.z);
    if (this.fig) {
      if (this.død) return;                                              // delene ligger på jorden (dele.js)
      const c = Math.cos(a.yaw), s = Math.sin(a.yaw);                    // farten set fra soldaten selv (x til højre, z bagud)
      this.fig.poser({ fart, vx: c * a.vel.x - s * a.vel.z, vz: s * a.vel.x + c * a.vel.z, duk: a.duk, pitch: a.pitch, kravl: !!a.kravl, våben: this.våben?.id ?? null, spin: this.våben?.d.opspin ? this.våben.spin / this.våben.d.opspin : 0, dt });
      return;
    }
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
// En vinkel mellem −π og π
export function vinkel(v) { return ((v + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
