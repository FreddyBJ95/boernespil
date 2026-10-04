// ===== Battle royale: alle mod alle — glid ned fra himlen, find våben i kisterne, og bliv inde i cirklen =====
// Alle starter højt oppe i et glidefly (W for fart, musen styrer) med kun kniven. På banen står der kister,
// som man åbner med E: et våben (jo sjældnere, jo bedre), måske en granat, en vest og træ til at bygge med.
// Stormen trækker sig sammen i fem faser — står man udenfor cirklen, mister man liv hvert sekund.
// Den sidste, der er tilbage, vinder.

import * as THREE from "./three.js";
import { PRIMÆR, SEKUNDÆR, GRANATER, SJÆLDEN } from "./katalog.js";

// Stormens faser: hvor længe den venter, hvor længe den lukker sig, hvor meget mindre cirklen bliver, og skaden pr. sekund
const FASER = [
  { vent: 45, luk: 30, del: 0.62, skade: 1 },
  { vent: 35, luk: 25, del: 0.55, skade: 2 },
  { vent: 30, luk: 20, del: 0.5, skade: 5 },
  { vent: 25, luk: 20, del: 0.4, skade: 8 },
  { vent: 20, luk: 25, del: 0, skade: 12 },
];
const KISTER = 16, HØJDE = 48, VÆGT = { almindelig: 40, usædvanlig: 30, sjælden: 18, episk: 9, legendarisk: 3 };

// Et tilfældigt våben fra kisten: sjældne våben er der færre af
function lodVåben() {
  const liste = [...Object.entries(PRIMÆR), ...Object.entries(SEKUNDÆR)].map(([id, d]) => [id, (VÆGT[d.sjælden] || 10) * (SEKUNDÆR[id] ? 0.45 : 1)]);
  let r = Math.random() * liste.reduce((s, [, v]) => s + v, 0);
  for (const [id, v] of liste) if ((r -= v) <= 0) return id;
  return liste[0][0];
}
// Kistens indhold: et våben — og måske en granat og en vest
export function kisteIndhold() {
  const g = Object.keys(GRANATER);
  return { våben: lodVåben(), granat: Math.random() < 0.45 ? g[Math.floor(Math.random() * g.length)] : null, vest: Math.random() < 0.35, træ: 40 };
}
export const sjældenFarve = id => SJÆLDEN[(PRIMÆR[id] || SEKUNDÆR[id])?.sjælden]?.farve || "#fff";

// En kiste: brunt træ med guldbeslag, et låg på hængsler og et gyldent skær
function lavKiste(glødTekstur) {
  const g = new THREE.Group(), træ = new THREE.MeshStandardMaterial({ color: 0x7a4620, roughness: 0.8 });
  const guld = new THREE.MeshStandardMaterial({ color: 0xd8a228, metalness: 0.8, roughness: 0.35, emissive: 0x5a3c00 });
  const kasse = (b, h, d, mat, x, y, z, far = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat); m.position.set(x, y, z); m.castShadow = true; far.add(m); return m; };
  kasse(0.9, 0.42, 0.55, træ, 0, 0.21, 0);
  for (const x of [-0.3, 0.3]) kasse(0.06, 0.44, 0.57, guld, x, 0.21, 0);
  const låg = new THREE.Group(); låg.position.set(0, 0.42, -0.275); g.add(låg);   // (hængslet bagest)
  kasse(0.92, 0.16, 0.57, træ, 0, 0.08, 0.285, låg);
  for (const x of [-0.3, 0.3]) kasse(0.06, 0.18, 0.59, guld, x, 0.08, 0.285, låg);
  kasse(0.12, 0.12, 0.04, guld, 0, -0.02, 0.58, låg);                              // låsen
  const skær = new THREE.Sprite(new THREE.SpriteMaterial({ map: glødTekstur, color: 0xffc040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  skær.scale.set(2.2, 2.2, 1); skær.position.y = 0.45; g.add(skær);
  return { model: g, låg, skær };
}
// Et glidefly: en trekantet vinge i en klar farve med to snore ned til føreren (egen: den, man selv ser over sig)
function lavGlidefly(farve, egen = false) {
  const g = new THREE.Group(), geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -1.3, -1.6, 0, 0.7, 1.6, 0, 0.7, 0, 0.25, 0.4, -1.6, 0, 0.7, 0, 0, -1.3, 0, 0.25, 0.4, 0, 0, -1.3, 1.6, 0, 0.7, 0, 0.25, 0.4, 1.6, 0, 0.7, -1.6, 0, 0.7], 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, egen ? new THREE.MeshBasicMaterial({ color: farve, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: farve, roughness: 0.6, side: THREE.DoubleSide })));
  if (egen) return g;
  const snor = new THREE.LineBasicMaterial({ color: 0x222222 });
  for (const x of [-1.2, 1.2]) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, 0.5), new THREE.Vector3(0, -1.1, 0.1)]), snor));
  return g;
}

export class BattleRoyale {
  // k: { scene, verden, bane, kampfolk(), hånd (førstepersons-vingen), effekter, lyd, skad(kæmper, liv), kisteFund(kæmper, fund), slut(vandt, plads) }
  constructor(k) {
    this.k = k; this.kister = []; this.aktiv = false;
    const [x0, z0, x1, z1] = k.bane.grænse; this.grænse = [x0, z0, x1, z1];
    this.midt0 = new THREE.Vector2((x0 + x1) / 2, (z0 + z1) / 2); this.r0 = Math.hypot(x1 - x0, z1 - z0) / 2 + 4;
    // stormvæggen: en lilla cylinder med striber, der bevæger sig
    const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d");
    for (let x = 0; x < 256; x += 2) { g.fillStyle = `rgba(${150 + Math.random() * 60}, ${70 + Math.random() * 40}, 255, ${0.25 + Math.random() * 0.5})`; g.fillRect(x, 0, 2, 64); }
    this.stribeTekstur = new THREE.CanvasTexture(c); this.stribeTekstur.wrapS = this.stribeTekstur.wrapT = THREE.RepeatWrapping; this.stribeTekstur.repeat.set(24, 3);
    this.væg = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 160, 128, 1, true),
      new THREE.MeshBasicMaterial({ map: this.stribeTekstur, color: 0xb070ff, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    this.væg.position.y = 40; this.væg.renderOrder = 4; this.væg.visible = false; k.scene.add(this.væg);
    // kisternes skær: en blød gylden plet
    const s = document.createElement("canvas"); s.width = s.height = 64; const sg = s.getContext("2d"), rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, "rgba(255,230,140,0.9)"); rg.addColorStop(0.4, "rgba(255,190,60,0.35)"); rg.addColorStop(1, "rgba(255,170,40,0)");
    sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64); this.glød = new THREE.CanvasTexture(s);
    // vingen, man selv ser over sig, når man glider
    this.minVinge = lavGlidefly(0x3aa0ff, true); this.minVinge.position.set(0, 0.36, -0.6); this.minVinge.rotation.x = 0.12; this.minVinge.scale.setScalar(0.42); this.minVinge.visible = false;
    k.hånd.scene.add(this.minVinge);
    this.kort = null;
  }

  // ---------- En ny kamp ----------
  start() {
    for (const ki of this.kister) this.k.scene.remove(ki.model);      // (glideflyene er allerede sat op, da alle kom i luften)
    this.kister = []; this.aktiv = true; this.fase = 0; this.tid = 0; this.pulsTid = 0; this.vinder = null;
    this.midt = this.midt0.clone(); this.r = this.r0; this.fra = { midt: this.midt.clone(), r: this.r };
    this.næste = this.nyCirkel(this.midt, this.r, FASER[0].del);
    // kisterne: på vej-nettet, med god afstand imellem
    const kn = this.k.bane.knuder.filter(n => this.inde(n.x, n.z)), valgt = [];
    for (let i = 0; i < 400 && valgt.length < KISTER; i++) {
      const n = kn[Math.floor(Math.random() * kn.length)];
      if (n && valgt.every(v => Math.hypot(v.x - n.x, v.z - n.z) > 9)) valgt.push(n);
    }
    for (const n of valgt) {
      const ki = lavKiste(this.glød); ki.model.position.set(n.x, Math.max(0, this.k.verden.gulv(n.x, (n.y || 0) + 1, n.z)), n.z);
      ki.model.rotation.y = Math.floor(Math.random() * 4) * Math.PI / 2; ki.åben = false; ki.t = 0; ki.fase = Math.random() * 6;
      this.k.scene.add(ki.model); this.kister.push(ki);
    }
    this.væg.visible = true; this.tegnKortGrund();
  }
  ryd() {
    for (const ki of this.kister) this.k.scene.remove(ki.model);
    for (const f of this.k.kampfolk()) this.landet(f);
    this.kister = []; this.aktiv = false; this.væg.visible = false; this.minVinge.visible = false;
  }
  inde(x, z) { const [x0, z0, x1, z1] = this.grænse; return x > x0 + 2 && x < x1 - 2 && z > z0 + 2 && z < z1 - 2; }
  // Den næste cirkel: helt inde i den gamle, med midten på et sted, man kan gå hen til
  nyCirkel(midt, r, del) {
    const nyR = r * del, frihed = r - nyR, kn = this.k.bane.knuder.filter(n => Math.hypot(n.x - midt.x, n.z - midt.y) <= frihed && this.inde(n.x, n.z));
    const n = kn.length && del > 0 ? kn[Math.floor(Math.random() * kn.length)] : null;
    return { midt: n ? new THREE.Vector2(n.x, n.z) : midt.clone(), r: nyR };
  }
  // Et sted at starte i luften: et tilfældigt sted over banen
  himmelSted() {
    const [x0, z0, x1, z1] = this.grænse;
    return [x0 + 8 + Math.random() * (x1 - x0 - 16), z0 + 8 + Math.random() * (z1 - z0 - 16)];
  }
  // Sæt en kæmper op i luften i et glidefly (botterne glider hen mod et sted på vej-nettet)
  iLuften(f, farve) {
    f.a.pos.y = HØJDE + Math.random() * 14; f.a.forrige.copy(f.a.pos); f.a.vel.set(0, 0, 0); f.a.svæver = true; f.a.jord = false;
    if (!f.erSpiller) {
      const kn = this.k.bane.knuder, n = kn[Math.floor(Math.random() * kn.length)]; f.landing = new THREE.Vector2(n.x, n.z);
      if (!f.glidefly) { f.glidefly = lavGlidefly(farve); f.glidefly.position.y = 2.75; f.model.add(f.glidefly); }
      f.glidefly.visible = true;
    }
  }
  landet(f) { f.a && (f.a.svæver = false); if (f.glidefly) f.glidefly.visible = false; }

  // ---------- Glid ----------
  // styring: { frem, side } (spilleren) — botterne glider selv hen mod deres landingssted
  svæv(f, styring, dt) {
    const a = f.a, { verden } = this.k;
    let vx = 0, vz = 0, vy = -5.5;
    if (f.erSpiller) {
      const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw), frem = styring.frem, side = styring.side;
      const fart = frem > 0 ? 14 : frem < 0 ? 4 : side ? 9 : 3;
      vx = fx * (frem >= 0 ? fart : -fart) + Math.cos(a.yaw) * side * 7; vz = fz * (frem >= 0 ? fart : -fart) - Math.sin(a.yaw) * side * 7;
      if (frem > 0) vy = -8.5;                                       // (W: hurtigere frem og nedad)
    } else if (f.landing) {
      const dx = f.landing.x - a.pos.x, dz = f.landing.y - a.pos.z, d = Math.hypot(dx, dz);
      if (d > 1.5) { vx = dx / d * 11; vz = dz / d * 11; a.yaw = Math.atan2(-dx, -dz); } else vy = -9;
    }
    a.vel.x += (vx - a.vel.x) * Math.min(1, dt * 2.5); a.vel.z += (vz - a.vel.z) * Math.min(1, dt * 2.5); a.vel.y = vy;
    a.forrige.copy(a.pos);
    const [x0, z0, x1, z1] = this.grænse;
    const nx = Math.max(x0 + 1, Math.min(x1 - 1, a.pos.x + a.vel.x * dt)), nz = Math.max(z0 + 1, Math.min(z1 - 1, a.pos.z + a.vel.z * dt));
    if (verden.fri(nx, a.pos.y, nz, a.b, a.h)) { a.pos.x = nx; a.pos.z = nz; } else { a.vel.x = a.vel.z = 0; }
    const g = verden.gulv(a.pos.x, a.pos.y + 0.05, a.pos.z), ny = a.pos.y + vy * dt;
    if (ny <= g + 0.02) { a.pos.y = g + 0.001; a.vel.set(0, 0, 0); a.jord = true; this.landet(f); if (f.erSpiller) this.k.lyd.landing?.(); return; }   // landet
    a.pos.y = ny;
  }

  // ---------- Hvert tick ----------
  tick(dt) {
    if (!this.aktiv) return;
    this.tid += dt;
    const fase = FASER[this.fase];
    if (fase && this.tid > fase.vent) {                              // stormen lukker sig: fra den gamle til den nye cirkel
      const t = Math.min(1, (this.tid - fase.vent) / fase.luk);
      this.midt.lerpVectors(this.fra.midt, this.næste.midt, t); this.r = this.fra.r + (this.næste.r - this.fra.r) * t;
      if (t >= 1) {
        this.fase++; this.tid = 0; this.fra = { midt: this.midt.clone(), r: this.r };
        if (FASER[this.fase]) this.næste = this.nyCirkel(this.midt, this.r, FASER[this.fase].del);
      }
    }
    // stormen skader hvert sekund dem, der står udenfor
    if ((this.pulsTid += dt) >= 1) {
      this.pulsTid -= 1;
      const skade = FASER[Math.min(this.fase, FASER.length - 1)].skade;
      for (const f of this.k.kampfolk()) if (!f.død && this.iStormen(f.a.pos)) this.k.skad(f, skade);
    }
    // botterne åbner de kister, de kommer forbi
    for (const f of this.k.kampfolk()) {
      if (f.erSpiller || f.død || f.a.svæver) continue;
      const ki = this.kisteNær(f.a.pos, 1.8); if (ki) this.åbn(ki, f);
    }
    // er der kun én tilbage?
    const levende = this.k.kampfolk().filter(f => !f.død);
    if (levende.length <= 1 && !this.vinder) { this.vinder = levende[0] || null; this.k.slut(this.vinder); }
  }
  iStormen(p) { return Math.hypot(p.x - this.midt.x, p.z - this.midt.y) > this.r; }
  tilbage() { return this.k.kampfolk().filter(f => !f.død).length; }
  // Et sted inde i den næste cirkel (botterne går derhen) — gerne en kiste, der ikke er åbnet endnu
  sikkerSted(bot) {
    const c = this.næste || { midt: this.midt, r: this.r }, inde = (x, z) => Math.hypot(x - c.midt.x, z - c.midt.y) < Math.max(4, c.r - 3);
    const kister = this.kister.filter(k => !k.åben && inde(k.model.position.x, k.model.position.z) && Math.hypot(k.model.position.x - bot.a.pos.x, k.model.position.z - bot.a.pos.z) < 40);
    if (kister.length && Math.random() < 0.7) { const k = kister[Math.floor(Math.random() * kister.length)].model.position; return [k.x, k.z, k.x, k.z]; }
    const kn = this.k.bane.knuder.filter(n => inde(n.x, n.z)), n = kn.length ? kn[Math.floor(Math.random() * kn.length)] : { x: c.midt.x, z: c.midt.y };
    return [n.x, n.z, c.midt.x, c.midt.y];
  }

  // ---------- Kisterne ----------
  kisteNær(pos, maks = 2.2) {
    let bedst = null, bd = maks;
    for (const ki of this.kister) { if (ki.åben) continue; const p = ki.model.position, d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < bd && Math.abs(p.y - pos.y) < 1.6) { bd = d; bedst = ki; } }
    return bedst;
  }
  åbn(ki, f) {
    if (ki.åben) return;
    ki.åben = true; ki.t = 0;
    const p = ki.model.position.clone().add(new THREE.Vector3(0, 0.6, 0));
    this.k.effekter.nedslag(p, [0, 1, 0], "metal", 1.5);
    this.k.lyd.kiste?.(p);
    this.k.kisteFund(f, kisteIndhold());
  }

  // ---------- Hvert billede ----------
  tegn(dt, nu, spiller) {
    if (!this.aktiv) return;
    this.væg.scale.set(this.r, 1, this.r); this.væg.position.x = this.midt.x; this.væg.position.z = this.midt.y;
    this.stribeTekstur.offset.x += dt * 0.03; this.stribeTekstur.offset.y -= dt * 0.08;
    for (const ki of this.kister) {
      if (!ki.åben) { ki.skær.material.opacity = 0.55 + Math.sin(nu * 3 + ki.fase) * 0.25; continue; }
      if (ki.t < 1) { ki.t = Math.min(1, ki.t + dt * 3); ki.låg.rotation.x = -1.9 * (1 - (1 - ki.t) ** 2); ki.skær.material.opacity = 0.8 * (1 - ki.t); }
    }
    this.minVinge.visible = !!spiller.a.svæver && !spiller.død;
    if (this.minVinge.visible) this.minVinge.rotation.z = Math.sin(nu * 1.3) * 0.05 + (spiller.a.vel.x * Math.cos(spiller.a.yaw) - spiller.a.vel.z * Math.sin(spiller.a.yaw)) * -0.02;   // (vingen hælder, når man drejer)
  }
  // Tekst til toppen af skærmen: hvad stormen gør lige nu
  stormTekst() {
    const fase = FASER[this.fase];
    if (!fase) return { tekst: "⛈ Stormen er lukket", sek: 0 };
    return this.tid < fase.vent ? { tekst: `⛈ Stormen lukker sig om`, sek: fase.vent - this.tid } : { tekst: "⛈ Stormen lukker sig!", sek: fase.vent + fase.luk - this.tid };
  }

  // ---------- Kortet ----------
  // Banens huse tegnes én gang (set ovenfra) — stormen, den næste cirkel og en selv tegnes ovenpå hvert billede
  tegnKortGrund() {
    const [x0, z0, x1, z1] = this.grænse, S = 150, c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d"), sk = S / Math.max(x1 - x0, z1 - z0);
    g.fillStyle = "#3a3428"; g.fillRect(0, 0, S, S);
    g.fillStyle = "#8a7a62";
    for (const k of this.k.verden.kasser) if (!k.byg && k.max[1] > 1.6 && k.min[1] < 3) g.fillRect((k.min[0] - x0) * sk, (k.min[2] - z0) * sk, Math.max(1, (k.max[0] - k.min[0]) * sk), Math.max(1, (k.max[2] - k.min[2]) * sk));
    this.kort = { grund: c, sk, S };
  }
  tegnKort(lærred, a) {
    if (!this.kort || !lærred) return;
    const g = lærred.getContext("2d"), { grund, sk, S } = this.kort, [x0, z0] = this.grænse, X = x => (x - x0) * sk, Z = z => (z - z0) * sk;
    g.clearRect(0, 0, S, S); g.drawImage(grund, 0, 0);
    g.save(); g.fillStyle = "rgba(150, 70, 255, 0.45)"; g.beginPath(); g.rect(0, 0, S, S); g.arc(X(this.midt.x), Z(this.midt.y), this.r * sk, 0, Math.PI * 2, true); g.fill("evenodd"); g.restore();
    if (this.næste && FASER[this.fase]) { g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(X(this.næste.midt.x), Z(this.næste.midt.y), this.næste.r * sk, 0, Math.PI * 2); g.stroke(); }
    g.save(); g.translate(X(a.pos.x), Z(a.pos.z)); g.rotate(-a.yaw); g.fillStyle = "#ffe14a"; g.strokeStyle = "#000"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
}
