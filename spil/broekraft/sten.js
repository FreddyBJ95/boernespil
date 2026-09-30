// ===== De seks magiske sten, stenringen, superkræfterne og Guld-føniksen =====
// Hver sten svæver og gløder i sin egen verden (Underverdenen, Dinodalen, Fyrværkeri, NUKE-banen,
// Havbunden og Skyøerne). Gå hen til den (eller tryk på den), så er den din.
// I Den uendelige verden giver stenene superkræfter, og i stenringen ved pladsen sætter de sig selv i
// soklerne. Når alle seks sidder der, smelter de sammen til Guld-føniksen, der flyver barnet op til
// guldslottet i himlen (verdenen "guldslot"). Bagefter kan guldfløjten altid kalde føniksen igen.

import * as THREE from "./three.js";
import { HJEMSTED, MIDT, HJEMHØJDE } from "./uendelig.js";
import { ID } from "./blokke.js";

// Et hvidt slør over hele skærmen (når føniksen flyver ind i skyerne)
export function hvidtSlør() {
  let el = document.getElementById("hvidSlør");
  if (!el) {
    el = document.createElement("div"); el.id = "hvidSlør";
    el.style.cssText = "position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:30;transition:opacity 1.2s";
    document.body.appendChild(el);
  }
  return el;
}

export const STEN = [
  { id: "ild", ikon: "🔴", farve: "#ff3b30", navn: "Ildstenen", verden: "underverden", verdenNavn: "Underverdenen", hvor: "ved lavaen", kraft: "Nu kan du gå på lava og ild uden at blive varm!" },
  { id: "dino", ikon: "🟠", farve: "#ff8c1a", navn: "Dinostenen", verden: "dino", verdenNavn: "Dinodalen", hvor: "ved vulkanen", kraft: "Tryk på 🦖, så kommer der en dino, du kan ride på!" },
  { id: "stjerne", ikon: "🟡", farve: "#ffd23f", navn: "Stjernestenen", verden: "fyrvaerkeri", verdenNavn: "Fyrværkeri-verdenen", hvor: "oppe ved tårnuret", kraft: "Tryk på ✨, så skyder du stjerner og fyrværkeri!" },
  { id: "atom", ikon: "🟢", farve: "#5aff3a", navn: "Atomstenen", verden: "atom", verdenNavn: "NUKE-banen", hvor: "ved den røde knap i bunkeren", kraft: "Tryk på 💪, så bliver du kæmpestor!" },
  { id: "hav", ikon: "🔵", farve: "#3a86ff", navn: "Havstenen", verden: "hav", verdenNavn: "Havbunden", hvor: "ved det sunkne skib", kraft: "Nu svømmer du lynhurtigt!" },
  { id: "sky", ikon: "🟣", farve: "#b15bff", navn: "Skystenen", verden: "sky", verdenNavn: "Skyøerne", hvor: "på den højeste ø", kraft: "Tryk på 🦘, så hopper du kæmpehøjt!" },
];

// Hvad barnet har fundet og sat i ringen (gemmes på tabletten — det gælder alle verdener)
export function læsSten() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem("broekraft-sten") || "null"); } catch (_) {}
  return Object.assign({ fundet: [], isat: [], finale: false, krone: false }, g || {});
}
export function gemSten(g) { try { localStorage.setItem("broekraft-sten", JSON.stringify(g)); } catch (_) {} }

function glødTekstur(farve) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const k = c.getContext("2d"), g = k.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, farve); g.addColorStop(1, "rgba(0,0,0,0)");
  k.fillStyle = g; k.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
// En sten: en funklende ædelsten med et glødende skær
function byggSten(farve, stor = 1) {
  const g = new THREE.Group();
  const perle = new THREE.Mesh(new THREE.OctahedronGeometry(0.42 * stor, 0), new THREE.MeshLambertMaterial({ color: farve, emissive: farve, emissiveIntensity: 0.6, flatShading: true }));
  perle.scale.y = 1.35; g.add(perle);
  const skær = new THREE.Sprite(new THREE.SpriteMaterial({ map: glødTekstur(farve), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  skær.scale.setScalar(2.4 * stor); g.add(skær);
  g.userData = { perle, skær };
  return g;
}

// ---------- Find stenens plads i den verden, den ligger i ----------
export function stenSted(sten, verden, cfg) {
  const { BX, BY, BZ } = verden;
  const midt = [BX >> 1, BZ >> 1];
  const find = (skal, fra = midt, r = Math.max(BX, BZ)) => {          // den nærmeste blok af en slags (spiral ud fra midten)
    for (let d = 0; d < r; d += 2) for (let a = 0; a < Math.max(1, d * 3); a++) {
      const v = (a / Math.max(1, d * 3)) * Math.PI * 2, x = Math.round(fra[0] + Math.cos(v) * d), z = Math.round(fra[1] + Math.sin(v) * d);
      if (x < 0 || z < 0 || x >= BX || z >= BZ) continue;
      for (let y = BY - 1; y > 0; y--) if (skal(verden.hent(x, y, z), x, y, z)) return { x, y, z };
    }
    return null;
  };
  const top = (x, z) => ({ x, y: verden.topY(x, z) + 1, z });
  let p = null;
  if (sten.id === "ild") {                          // på en klippe lige ved lavaen
    const l = find(id => verden.væske[id] === "lava");
    if (l) for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [0, 3]]) { const t = top(l.x + dx, l.z + dz); if (!verden.væske[verden.hent(t.x, t.y - 1, t.z)]) { p = t; break; } }
  } else if (sten.id === "dino" && cfg.vulkan) { const [vx, vz] = cfg.vulkan(BX, BZ); p = top(Math.min(BX - 2, vx + 9), vz); }
  else if (sten.id === "stjerne") { const u = find(id => id === ID.Ur); if (u) { let y = u.y; while (y < BY - 2 && verden.erFast(u.x, y, u.z)) y++; p = { x: u.x, y, z: u.z }; } }
  else if (sten.id === "atom") { const k = find(id => id === ID.Affyringsknap); if (k) p = { x: k.x + 1, y: k.y + 1, z: k.z }; }
  else if (sten.id === "hav") { const s = find(id => id === ID.Skibsplanker); if (s) p = { x: s.x, y: s.y + 1, z: s.z }; }
  else if (sten.id === "sky") {                     // den højeste ø
    let bedst = null;
    for (let x = 4; x < BX - 4; x += 3) for (let z = 4; z < BZ - 4; z += 3) { const y = verden.topY(x, z); if (!bedst || y > bedst.y) bedst = { x, y: y + 1, z }; }
    p = bedst;
  }
  return p || top(midt[0] + 4, midt[1] + 4);
}

// ---------- Stenen i sin egen verden: gå hen til den, så er den din ----------
export class StenJagt {
  // s: { scene, verden, cfg, sp, lyd, besked, fest(), sig(tekst), rejsHjem() }
  constructor(s) {
    this.s = s;
    this.sten = STEN.find(x => x.verden === s.cfg.id);
    this.data = læsSten();
    if (!this.sten || this.data.fundet.includes(this.sten.id)) return;
    this.p = stenSted(this.sten, s.verden, s.cfg);
    this.model = byggSten(this.sten.farve, 1.4);
    this.stråle = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 60, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: this.sten.farve, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.stråle.position.y = 30; this.model.add(this.stråle);   // en lysstråle, så man kan se stenen langt væk
    this.model.position.set(this.p.x + 0.5, this.p.y + 1.1, this.p.z + 0.5);
    s.scene.add(this.model);
    this.t = 0;
  }
  get aktiv() { return !!this.model; }
  opdater(dt) {
    if (!this.model) return;
    this.t += dt;
    this.model.userData.perle.rotation.y += dt * 1.6;
    this.model.position.y = this.p.y + 1.1 + Math.sin(this.t * 2) * 0.18;
    const sp = this.s.sp.pos;
    if (Math.hypot(sp.x - this.model.position.x, sp.z - this.model.position.z) < 1.6 && Math.abs(sp.y + 0.8 - this.model.position.y) < 2) this.tag();
  }
  tryk(ray) {
    if (!this.model) return false;
    const h = ray.intersectObject(this.model.userData.perle, false)[0];
    if (!h || h.distance > 10) return false;
    this.tag(); return true;
  }
  tag() {
    const sten = this.sten;
    this.s.scene.remove(this.model); this.model = null;
    this.data = læsSten();
    if (!this.data.fundet.includes(sten.id)) this.data.fundet.push(sten.id);
    gemSten(this.data);
    this.s.lyd.stenFundet(); this.s.fest(); setTimeout(() => this.s.fest(), 500);
    const tekst = `Du fandt ${sten.navn}! ${sten.kraft} Tag den med hjem til stenringen i den uendelige verden.`;
    this.s.besked(`${sten.ikon} Du fandt ${sten.navn}!`, 5000);
    this.s.sig(tekst);
    this.s.vælg?.(`${sten.ikon} ${sten.navn} er din! Nu har du ${this.data.fundet.length} af 6.`, [
      { tekst: "♾️ Hjem til Den uendelige verden", gør: () => this.s.rejsHjem() },
      { tekst: "Bliv her lidt", gør: () => {} },
    ]);
  }
}

// ---------- Guld-føniksen ----------
function byggFøniks() {
  const g = new THREE.Group(), guld = new THREE.MeshLambertMaterial({ color: "#ffd23f", emissive: "#b86a00", emissiveIntensity: 0.7 });
  const rød = new THREE.MeshLambertMaterial({ color: "#ff6a1a", emissive: "#a82a00", emissiveIntensity: 0.6 });
  const krop = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), guld); krop.scale.set(0.9, 0.8, 1.6); g.add(krop);
  const hals = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), guld); hals.position.set(0, 0.7, 1.4); g.add(hals);
  const hoved = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), guld); hoved.position.set(0, 1.25, 1.9); g.add(hoved);
  const næb = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 8), rød); næb.rotation.x = Math.PI / 2; næb.position.set(0, 1.18, 2.45); g.add(næb);
  for (const s of [-1, 1]) {
    const øje = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: "#1b1b24" })); øje.position.set(s * 0.3, 1.38, 2.2); g.add(øje);
  }
  for (let i = 0; i < 3; i++) {                      // en lille krone af fjer
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 6), rød); f.position.set((i - 1) * 0.15, 1.75, 1.8 - i * 0.12); f.rotation.x = -0.4; g.add(f);
  }
  const vinger = [-1, 1].map(s => {
    const v = new THREE.Group(); v.position.set(s * 0.8, 0.35, 0.2); g.add(v);
    for (let i = 0; i < 6; i++) {                    // store fjer, der spreder sig som en vifte
      const l = 3.2 - i * 0.3, fj = new THREE.Mesh(new THREE.BoxGeometry(l, 0.1, 0.62), i < 3 ? guld : rød);
      fj.geometry.translate(s * l / 2, 0, 0);
      fj.position.set(0, 0, 0.3 - i * 0.28); fj.rotation.y = -s * i * 0.16; v.add(fj);
    }
    v.userData.s = s;
    return v;
  });
  const hale = new THREE.Group(); hale.position.set(0, 0.1, -1.5); g.add(hale);
  for (let i = -2; i <= 2; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 2.6), Math.abs(i) === 2 ? rød : guld);
    f.position.set(i * 0.25, 0, -1.2); f.rotation.y = i * 0.18; hale.add(f);
  }
  const skær = new THREE.Sprite(new THREE.SpriteMaterial({ map: glødTekstur("#ffcc33"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
  skær.scale.setScalar(9); g.add(skær);
  g.scale.setScalar(1.6);
  g.userData = { vinger, hale };
  return g;
}
export class Føniks {
  // s: { scene, sp, lyd, partikel(x, y, z, farve, …) }
  constructor(s) {
    this.s = s;
    this.g = byggFøniks(); this.g.visible = false; s.scene.add(this.g);
    this.sti = null; this.t = 0; this.rytter = false; this.slut = null; this.tid = 0;
  }
  // Flyv ad en sti (punkter) på sekunder sek. rytter: barnet sidder på ryggen
  flyv(punkter, sek, rytter, slut) {
    this.sti = new THREE.CatmullRomCurve3(punkter); this.sek = sek; this.t = 0; this.rytter = rytter; this.slut = slut;
    this.g.visible = true;
    this.g.position.copy(punkter[0]);
    this.s.lyd.fønix();
  }
  stå(p, vend = 0) { this.sti = null; this.rytter = false; this.g.visible = true; this.g.position.copy(p); this.g.rotation.set(0, vend, 0); }
  væk() { this.g.visible = false; this.sti = null; this.rytter = false; }
  rammer(ray) {
    if (!this.g.visible || this.sti) return null;
    const h = ray.intersectObjects(this.g.children.filter(c => !c.isSprite), true)[0];   // (skæret tæller ikke)
    return h && h.distance < 14 ? h.distance : null;
  }
  styrSpiller() {
    if (!this.rytter) return false;
    const p = this.g.position, sp = this.s.sp;
    sp.pos.set(p.x, p.y + 1.6, p.z); sp.vel.set(0, 0, 0); sp.jord = true;
    return true;
  }
  opdater(dt) {
    if (!this.g.visible) return;
    this.tid += dt;
    const u = this.g.userData, flyver = !!this.sti;
    u.vinger.forEach(v => { v.rotation.z = v.userData.s * (flyver ? Math.sin(this.tid * 6) * 0.6 : 0.45 + Math.sin(this.tid * 1.5) * 0.08); });
    u.hale.rotation.x = Math.sin(this.tid * 2) * 0.08;
    if (Math.random() < dt * 30) {                   // gnister efter føniksen
      const p = this.g.position;
      this.s.partikel(p.x + (Math.random() - 0.5) * 3, p.y + (Math.random() - 0.5) * 2, p.z + (Math.random() - 0.5) * 3,
        new THREE.Color(Math.random() < 0.5 ? "#ffd23f" : "#ff8c1a"), (Math.random() - 0.5), -1 - Math.random(), (Math.random() - 0.5), 1, 0.2, 1.5);
    }
    if (!this.sti) return;
    this.t = Math.min(1, this.t + dt / this.sek);
    const p = this.sti.getPointAt(this.t), vej = this.sti.getTangentAt(Math.min(0.999, this.t));
    this.g.position.copy(p);
    this.g.rotation.set(-Math.asin(Math.max(-0.8, Math.min(0.8, vej.y))) * 0.6, Math.atan2(vej.x, vej.z), 0);
    if (this.t >= 1) {
      const slut = this.slut; this.sti = null;
      if (this.rytter) { this.rytter = false; this.s.sp.pos.y += 0.5; }
      this.g.rotation.x = 0;
      slut?.();
    }
  }
}

// ---------- Stenringen, superkræfterne og finalen i Den uendelige verden ----------
export class Stenring {
  // s: { scene, sp, lyd, besked, sig(tekst), fest(), flash(farve), hvid(til, sek), partikel, dagNat, rejsTil(id, føniks), kraft(navn), føniksKommer }
  constructor(s) {
    this.s = s;
    this.data = læsSten();
    this.modeller = HJEMSTED.sokler.map((p, i) => {  // stenene, der sidder i soklerne
      const m = byggSten(STEN[i].farve, 1.1);
      m.position.set(p.x + 0.5, p.y + 1.4, p.z + 0.5); m.visible = this.data.isat.includes(STEN[i].id);
      s.scene.add(m);
      return m;
    });
    this.føniks = new Føniks({ scene: s.scene, sp: s.sp, lyd: s.lyd, partikel: s.partikel });
    this.flyvende = null;                             // en sten på vej fra barnet til soklen
    this.t = 0; this.finale = null;
    this.lavKnapper();
    if (s.føniksKommer) this.landerHjemme();           // hjem fra guldslottet på føniksens ryg
  }
  fundet() { return this.data.fundet; }
  mangler() { return STEN.find(x => !this.data.fundet.includes(x.id)) || null; }
  har(id) { return this.data.fundet.includes(id); }

  // Knapper til superkræfterne og guldfløjten (højre side af skærmen)
  lavKnapper() {
    const st = document.createElement("style");
    st.textContent = `#kræfter { position: fixed; right: 12px; top: 50%; transform: translateY(-50%); z-index: 6; display: none; flex-direction: column; gap: 10px; }
      .i-gang.uendelig #kræfter, .i-gang.guldslot #kræfter { display: flex; }
      .i-kampvogn #kræfter { display: none !important; }
      #kræfter button { width: 62px; height: 62px; border-radius: 50%; font-size: 30px; border: 3px solid #fff8; background: #0006; }
      #kræfter button.aktiv { background: #ffd23fcc; }`;
    document.head.appendChild(st);
    this.knapper = document.createElement("div"); this.knapper.id = "kræfter"; document.body.appendChild(this.knapper);
    this.slør = hvidtSlør();
    this.tegnKnapper();
  }
  tegnKnapper() {
    const k = this.knapper; k.innerHTML = "";
    const knap = (ikon, navn, gør) => {
      const b = document.createElement("button"); b.textContent = ikon; b.setAttribute("aria-label", navn);
      b.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); gør(b); });
      k.appendChild(b);
    };
    if (this.har("dino")) knap("🦖", "Kald en dino", () => this.s.kraft("dino"));
    if (this.har("stjerne")) knap("✨", "Stjerner og fyrværkeri", () => this.s.kraft("stjerne"));
    if (this.har("atom")) knap("💪", "Bliv kæmpestor", () => this.s.kraft("atom"));
    if (this.har("sky")) knap("🦘", "Kæmpehop", () => this.s.kraft("sky"));
    if (this.data.finale) knap("🎶", "Guldfløjten: kald Guld-føniksen", () => this.kaldFøniks());
  }

  // ---------- hvert billede ----------
  opdater(dt) {
    this.t += dt;
    this.modeller.forEach((m, i) => { if (m.visible) { m.userData.perle.rotation.y += dt * 1.2; m.position.y = HJEMSTED.sokler[i].y + 1.4 + Math.sin(this.t * 2 + i) * 0.12; } });
    this.føniks.opdater(dt);
    const sp = this.s.sp.pos;
    // tæt på ringen med en sten, der ikke sidder der endnu: den flyver selv hen i sin sokkel
    if (!this.flyvende && !this.finale && Math.hypot(sp.x - MIDT, sp.z - MIDT) < 13 && Math.abs(sp.y - HJEMHØJDE) < 8) {
      const i = STEN.findIndex(x => this.data.fundet.includes(x.id) && !this.data.isat.includes(x.id));
      if (i >= 0) {
        const sokkel = HJEMSTED.sokler[i], m = byggSten(STEN[i].farve, 1.1);
        m.position.set(sp.x, sp.y + 1.2, sp.z); this.s.scene.add(m);
        this.flyvende = { i, m, fra: m.position.clone(), til: new THREE.Vector3(sokkel.x + 0.5, sokkel.y + 1.4, sokkel.z + 0.5), t: 0 };
        this.s.besked(`${STEN[i].ikon} ${STEN[i].navn} flyver hen i stenringen!`, 2500);
      }
    }
    if (this.flyvende) {
      const f = this.flyvende;
      f.t = Math.min(1, f.t + dt / 1.6);
      f.m.position.lerpVectors(f.fra, f.til, f.t); f.m.position.y += Math.sin(f.t * Math.PI) * 3;
      f.m.userData.perle.rotation.y += dt * 8;
      if (f.t >= 1) {
        this.s.scene.remove(f.m); this.modeller[f.i].visible = true;
        this.data.isat.push(STEN[f.i].id); gemSten(this.data);
        this.s.lyd.stenFundet(); this.s.fest();
        this.flyvende = null;
        if (this.data.isat.length === STEN.length && !this.data.finale) this.startFinale();
        else this.s.sig(`${STEN[f.i].navn} sidder i stenringen! ${6 - this.data.isat.length ? `Der mangler ${6 - this.data.isat.length}.` : ""}`);
      }
    }
    if (this.finale) this.opdaterFinale(dt);
  }

  // ---------- finalen: stenene smelter sammen til Guld-føniksen ----------
  startFinale() {
    this.finale = { t: 0, trin: 0 };
    this.s.dagNat && (this.s.dagNat.tid = 0.76);      // himlen bliver mørk og fuld af stjerner
    this.s.sig("Alle seks magiske sten sidder i stenringen! Se op!");
    this.s.besked("✨ Alle seks sten er på plads! ✨", 5000);
  }
  opdaterFinale(dt) {
    const f = this.finale, midt = new THREE.Vector3(MIDT + 0.5, HJEMHØJDE + 14, MIDT + 0.5);
    f.t += dt;
    if (f.trin === 0) {                              // stenene svæver op og snurrer rundt om hinanden
      this.modeller.forEach((m, i) => {
        const a = f.t * 2.2 + (i / 6) * Math.PI * 2, r = Math.max(0.4, 8.5 * (1 - f.t / 5));
        m.position.set(midt.x + Math.cos(a) * r, HJEMHØJDE + 3 + Math.min(1, f.t / 3) * 11, midt.z + Math.sin(a) * r);
        m.userData.perle.rotation.y += dt * 10;
      });
      if (f.t > 5) {                                  // … og smelter sammen i et glimt
        f.trin = 1; f.t = 0;
        this.modeller.forEach(m => { m.visible = false; });
        this.s.flash("#fff6c0"); this.s.fest(); this.s.lyd.fønix();
        const sp = this.s.sp.pos, land = new THREE.Vector3(sp.x + 3, HJEMHØJDE + 1.2, sp.z + 3);
        this.føniks.flyv([midt.clone(), new THREE.Vector3(midt.x + 10, midt.y + 4, midt.z - 8), new THREE.Vector3(sp.x + 8, HJEMHØJDE + 8, sp.z + 6), land], 4, false,
          () => { this.føniks.stå(land, Math.atan2(sp.x - land.x, sp.z - land.z)); this.s.sig("Guld-føniksen! Tryk på den, og sæt dig op på ryggen!"); this.s.besked("🔥 Tryk på Guld-føniksen og flyv med!", 6000); });
        this.data.finale = true; gemSten(this.data); this.tegnKnapper();
      }
    } else if (f.trin === 1 && f.t > 1) {
      this.finale = null;                             // resten sker, når barnet trykker på føniksen
      this.modeller.forEach((m, i) => { m.visible = true; m.position.set(HJEMSTED.sokler[i].x + 0.5, HJEMSTED.sokler[i].y + 1.4, HJEMSTED.sokler[i].z + 0.5); });
    }
  }
  // Tryk på føniksen: flyv op til guldslottet
  tryk(ray) {
    if (this.føniks.rammer(ray) === null) return false;
    this.flyvTilSlottet(); return true;
  }
  flyvTilSlottet() {
    const p = this.føniks.g.position.clone(), op = [];
    for (let i = 0; i <= 8; i++) {                    // en spiral op over hjemmet, og så ind i skyerne
      const a = i * 0.8, r = 10 + i * 2;
      op.push(new THREE.Vector3(MIDT + Math.cos(a) * r, p.y + 2 + i * 6, MIDT + Math.sin(a) * r));
    }
    op.unshift(p);
    op.push(new THREE.Vector3(MIDT + 60, p.y + 64, MIDT - 90));
    this.s.sig("Hold godt fast! Vi flyver op til guldslottet i himlen!");
    this.føniks.flyv(op, 12, true, () => {});
    setTimeout(() => { this.slør.style.opacity = 1; }, 10800);
    setTimeout(() => this.s.rejsTil("guldslot", true), 12200);
  }
  kaldFøniks() {                                      // guldfløjten
    const sp = this.s.sp.pos, land = new THREE.Vector3(sp.x + 3, sp.y + 0.2, sp.z + 3);
    this.s.lyd.fønix();
    this.føniks.flyv([new THREE.Vector3(sp.x - 40, sp.y + 40, sp.z - 40), new THREE.Vector3(sp.x - 10, sp.y + 12, sp.z - 5), land], 4, false,
      () => { this.føniks.stå(land); this.s.besked("🔥 Tryk på Guld-føniksen og flyv til guldslottet!", 5000); });
  }
  landerHjemme() {                                    // barnet kommer hjem på føniksens ryg
    const land = new THREE.Vector3(MIDT + 8, HJEMHØJDE + 1.2, MIDT + 8);
    this.føniks.flyv([new THREE.Vector3(MIDT - 60, HJEMHØJDE + 50, MIDT - 60), new THREE.Vector3(MIDT - 10, HJEMHØJDE + 20, MIDT - 10), land], 6, true,
      () => { this.føniks.stå(land); this.s.sp.pos.set(land.x + 2.5, HJEMHØJDE + 1.1, land.z); this.s.besked("🏡 Hjemme igen!", 2500); });
  }
  styrSpiller() { return this.føniks.styrSpiller(); }
}

// ---------- Guldslottet: føniksen lander i slotsgården, og spådamen tager imod ----------
export class Guldslot {
  // s: { scene, sp, lyd, besked, sig, fest, flash, partikel, gård: {x, y, z}, rejsTil(id, føniks), fyrværkeri(), spådame(x, y, z, vend) }
  constructor(s) {
    this.s = s;
    this.data = læsSten();
    this.føniks = new Føniks({ scene: s.scene, sp: s.sp, lyd: s.lyd, partikel: s.partikel });
    const g = s.gård, land = new THREE.Vector3(g.x + 0.5, g.y + 1.2, g.z + 6.5);
    if (s.føniksKommer) {                             // vi kommer flyvende ind over skyerne
      this.føniks.flyv([new THREE.Vector3(g.x - 60, g.y + 30, g.z + 80), new THREE.Vector3(g.x - 20, g.y + 14, g.z + 30), new THREE.Vector3(g.x + 6, g.y + 6, g.z + 12), land], 7, true,
        () => { this.føniks.stå(land, Math.PI); this.s.sp.pos.set(land.x + 2.5, g.y + 1.1, land.z); this.velkommen(); });
    } else this.føniks.stå(land, Math.PI);
  }
  velkommen() {
    const første = !this.data.krone;
    this.data.krone = true; gemSten(this.data);
    this.s.fest(); this.s.fyrværkeri();
    this.s.sig(første ? "Velkommen til guldslottet! Du fandt alle seks sten. Du er helten fra den uendelige verden! Her er din krone!"
      : "Velkommen tilbage til guldslottet, helt!");
    this.s.besked(første ? "👑 Du er helten fra Den uendelige verden! 👑" : "👑 Velkommen tilbage til guldslottet!", 7000);
  }
  tryk(ray) {                                         // tryk på føniksen: flyv hjem
    if (this.føniks.rammer(ray) === null) return false;
    const p = this.føniks.g.position.clone();
    this.s.sig("Vi flyver hjem til den uendelige verden!");
    this.føniks.flyv([p, new THREE.Vector3(p.x + 10, p.y + 12, p.z + 20), new THREE.Vector3(p.x - 30, p.y + 30, p.z + 70)], 5, true, () => {});
    setTimeout(() => { hvidtSlør().style.opacity = 1; }, 4000);
    setTimeout(() => this.s.rejsTil("uendelig", true), 5200);
    return true;
  }
  opdater(dt) { this.føniks.opdater(dt); }
  styrSpiller() { return this.føniks.styrSpiller(); }
}
