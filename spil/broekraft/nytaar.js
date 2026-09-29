// ===== Nytårsaften i Fyrværkeri-verdenen: pariserhjulet, nedtællingen og kæmperaketten =====
//  Pariserhjulet drejer langsomt med lys, der skifter farve. Tryk på en gondol, så kører man en tur rundt
//  (⬆ = stig ud undervejs — så flyver man). cfg.pariserhjul giver, hvor det står.
//  Nytårsuret: tryk på et Ur, så tæller det ned fra 10 — og så kommer en stor finale med raketter og et droneshow,
//  der skriver det nye år på himlen. I Fyrværkeri-verdenen sker det også af sig selv hvert fjerde minut.
//  Kæmperaketten: tryk på den, så flyver man selv op med den, den springer ud i fyrværkeri, og man daler ned i faldskærm.

import * as THREE from "./three.js";
import { ID } from "./blokke.js";

const KASSE = new THREE.BoxGeometry(1, 1, 1), KEGLE = new THREE.ConeGeometry(1, 1, 10);
const R = 9, GONDOLER = 8, LAMPER = 40, FART = 0.28;          // hjulets radius, antal gondoler og lamper, radianer pr. sekund
const GONDOLFARVER = ["#e0302a", "#3a7bff", "#ffd23f", "#4cd964", "#c86bff", "#ff8c1a", "#ff6fd0", "#5ff0ff"];
const RØG = new THREE.Color("#c8c4be"), GNIST = ["#fff3a0", "#ffd23f", "#ff8c1a"];
const FINALE = ["kugle", "ring", "hjerte", "stjerne", "palme", "guldregn", "blomst", "planet", "regnbue"];
const tmp = new THREE.Vector3();

export class Nytår {
  // spil: { scene, verden, sp, fyr, partikel, lyd, tal(n), besked, sæt(x,y,z,id), faldskærm(til), fest(), tast,
  //         hjul: [x, z] eller null, torv: [x, z] eller null (nedtællingen af sig selv) }
  constructor(spil) {
    this.s = spil;
    this.hjul = null; this.hjulSted = spil.hjul;                  // (hjulet bygges, når jorden under det er hentet)
    this.nedtæl = null; this.næsteNytår = 150;
    this.tur = null;                                              // barnet sidder i en gondol
    this.raket = null; this.skærm = null; this.genopbyg = [];
  }

  // ---------- Pariserhjulet ----------
  byggHjul(x, z) {
    const { scene, verden } = this.s, y = verden.topY(Math.floor(x), Math.floor(z)) + 1;
    const mat = f => new THREE.MeshLambertMaterial({ color: f }), stel = mat("#e8e8f0");
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    const bjælke = (a, b, tyk, m, far = g) => {                    // en bjælke mellem to punkter
      const k = new THREE.Mesh(KASSE, m), l = a.distanceTo(b);
      k.scale.set(tyk, tyk, l); k.position.copy(a).add(b).multiplyScalar(0.5); k.lookAt(b); far.add(k); return k;
    };
    const nav = new THREE.Vector3(0, R + 2, 0);
    for (const s of [-1, 1]) for (const b of [-1, 1]) bjælke(new THREE.Vector3(b * 6, 0, s * 1.7), new THREE.Vector3(0, R + 2, s * 1.7), 0.45, stel);   // stellet: to A-ben
    const drej = new THREE.Group(); drej.position.copy(nav); g.add(drej);
    const lamper = [];
    for (let i = 0; i < LAMPER; i++) {                            // ringen af lamper, der skifter farve
      const v = i / LAMPER * Math.PI * 2, m = new THREE.MeshBasicMaterial({ color: "#ffffff" });
      for (const s of [-0.7, 0.7]) { const k = new THREE.Mesh(KASSE, m); k.scale.setScalar(0.5); k.position.set(Math.cos(v) * R, Math.sin(v) * R, s); drej.add(k); }
      lamper.push(m);
    }
    for (let i = 0; i < GONDOLER; i++) {                          // eger fra navet ud til ringen
      const v = i / GONDOLER * Math.PI * 2;
      for (const s of [-0.7, 0.7]) bjælke(new THREE.Vector3(0, 0, s), new THREE.Vector3(Math.cos(v) * R, Math.sin(v) * R, s), 0.22, stel, drej);
    }
    const navKlods = new THREE.Mesh(KASSE, mat("#d9a520")); navKlods.scale.set(1.2, 1.2, 2.2); drej.add(navKlods);
    const gondoler = GONDOLFARVER.map(f => {                        // gondolerne hænger lige ned, mens hjulet drejer
      const gg = new THREE.Group(), m = mat(f);
      const del = (b, h, l, x2, y2, z2, mm = m) => { const k = new THREE.Mesh(KASSE, mm); k.scale.set(b, h, l); k.position.set(x2, y2, z2); gg.add(k); };
      del(1.6, 0.2, 1.3, 0, -1.6, 0); del(1.7, 0.25, 1.4, 0, 0, 0);
      for (const a of [-0.7, 0.7]) for (const b of [-0.55, 0.55]) del(0.1, 1.5, 0.1, a, -0.8, b, stel);
      del(1.6, 0.5, 0.12, 0, -1.3, 0.6); del(1.6, 0.5, 0.12, 0, -1.3, -0.6);
      scene.add(gg);
      return gg;
    });
    return { g, drej, lamper, gondoler, nav: nav.add(g.position), vinkel: 0 };
  }
  gondolPos(i, ud = new THREE.Vector3()) {
    const h = this.hjul, v = h.vinkel + i / GONDOLER * Math.PI * 2;
    return ud.set(h.nav.x + Math.cos(v) * R, h.nav.y + Math.sin(v) * R, h.nav.z);
  }
  opdaterHjul(dt, tid) {
    const h = this.hjul;
    if (!h) return;
    h.vinkel += FART * dt;
    h.drej.rotation.z = h.vinkel;
    h.gondoler.forEach((gg, i) => gg.position.copy(this.gondolPos(i)));
    h.lamper.forEach((m, i) => m.color.setHSL((i / LAMPER + tid * 0.15) % 1, 0.9, 0.62));   // farverne løber rundt
  }
  // Tryk på en gondol: stig ind
  trykHjul(stråle) {
    if (!this.hjul || this.tur) return false;
    for (let i = 0; i < GONDOLER; i++) {
      const p = this.gondolPos(i, tmp).add({ x: 0, y: -1, z: 0 }), t = p.clone().sub(stråle.origin).dot(stråle.direction);
      if (t < 0 || t > 16) continue;
      if (stråle.origin.clone().addScaledVector(stråle.direction, t).distanceTo(p) > 1.3) continue;
      this.tur = { i, drejet: 0 };
      this.s.lyd.vælg(); this.s.besked("🎡 Du kører i pariserhjulet! ⬆ = stig ud", 3500);
      return true;
    }
    return false;
  }

  // ---------- Nytårsuret: 10 – 9 – 8 … og så finalen ----------
  trykUr() { if (!this.nedtæl) this.startNedtælling(); }
  startNedtælling() {
    this.nedtæl = { t: 0, n: 11 };
    this.s.besked("🕛 Nu tæller vi ned til nytår!", 3000);
  }
  opdaterNedtælling(dt) {
    const { sp } = this.s, torv = this.s.torv;
    if (!this.nedtæl && torv && (this.næsteNytår -= dt) <= 0) {   // af sig selv, hvis barnet er i nærheden af torvet
      this.næsteNytår = 240;
      if (Math.hypot(sp.pos.x - torv[0], sp.pos.z - torv[1]) < 80) this.startNedtælling();
    }
    const n = this.nedtæl;
    if (!n) return;
    n.t += dt;
    const tal = 10 - Math.floor(n.t);
    if (tal !== n.n && tal >= 1) { n.n = tal; this.s.tal(tal); this.s.lyd.nedtælling(tal); }
    if (n.t >= 10 && !n.finale) this.finale();
    if (n.finale) this.opdaterFinale(dt);
  }
  finale() {
    const { verden, sp, fyr } = this.s, n = this.nedtæl, [cx, cz] = this.s.torv || [sp.pos.x, sp.pos.z];
    const y = verden.topY(Math.floor(cx), Math.floor(cz)) + 1, år = String(new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0));
    n.finale = { t: 0, næste: 0, raketter: 60, x: cx, y, z: cz };
    this.s.besked(`🎆 Godt nytår ${år} 🎆`, 5000);
    this.s.fest();
    fyr.droneshow(cx + 0.5, y, cz + 0.5, { figurer: ["hjerte", "stjerne"], tal: år });
    for (let i = 0; i < 4; i++) { const v = i / 4 * Math.PI * 2 + 0.4; fyr.fontæne(cx + Math.cos(v) * 7, y, cz + Math.sin(v) * 7); }
  }
  opdaterFinale(dt) {
    const f = this.nedtæl.finale;
    f.t += dt;
    if ((f.næste -= dt) <= 0 && f.raketter > 0) {               // raketter fra en ring rundt om torvet — hurtigere og hurtigere
      f.næste = Math.max(0.06, 0.35 - f.t * 0.02); f.raketter--;
      const v = Math.random() * Math.PI * 2, r = 9 + Math.random() * 5;
      this.s.fyr.raket(f.x + Math.cos(v) * r, f.y, f.z + Math.sin(v) * r, { mønster: FINALE[Math.floor(Math.random() * FINALE.length)], højde: 18 + Math.random() * 14 });
    }
    if (f.raketter <= 0 && f.t > 14) this.nedtæl = null;
  }

  // ---------- Kæmperaketten: flyv selv op med den ----------
  raketTur({ x, y, z }) {
    if (this.raket || this.tur) return;
    const { sp, scene } = this.s;
    this.s.sæt(x, y, z, 0);
    this.genopbyg.push({ x, y, z, t: 25 });
    const g = new THREE.Group(), m = f => new THREE.MeshLambertMaterial({ color: f, emissive: new THREE.Color(f).multiplyScalar(0.25) });
    for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(KASSE, m(i % 2 ? "#f4f4f0" : "#e0302a")); k.scale.set(1, 0.9, 1); k.position.y = 0.45 + i * 0.9; g.add(k); }
    const spids = new THREE.Mesh(KEGLE, m("#ffd23f")); spids.scale.set(0.6, 1.2, 0.6); spids.position.y = 4.2; g.add(spids);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = new THREE.Mesh(KASSE, m("#e0302a")); k.scale.set(a ? 0.6 : 0.1, 1, b ? 0.6 : 0.1); k.position.set(a * 0.7, 0.5, b * 0.7); g.add(k); }
    const flamme = new THREE.Mesh(KEGLE, new THREE.MeshBasicMaterial({ color: "#ffd23f", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    flamme.rotation.x = Math.PI; flamme.scale.set(0.5, 1.6, 0.5); flamme.position.y = -0.8; flamme.visible = false; g.add(flamme);
    g.position.set(x + 0.5, y, z + 0.5); scene.add(g);
    this.raket = { g, flamme, fase: "tænd", t: 0, v: 0 };
    if (sp.flyver) this.s.stopFlyv();
    this.s.lyd.tænd(); this.s.besked("🚀 Hold godt fast — raketten letter!", 2500);
  }
  opdaterRaket(dt) {
    const r = this.raket, { sp, partikel, fyr } = this.s;
    if (!r) return;
    r.t += dt;
    const p = r.g.position;
    if (r.fase === "tænd") {                                      // den ryster og ryger
      r.g.position.x += (Math.random() - 0.5) * 0.05;
      if (Math.random() < 0.6) partikel(p.x, p.y + 0.2, p.z, RØG, (Math.random() - 0.5) * 3, 0.6, (Math.random() - 0.5) * 3, 1.6, -0.04, 5);
      if (r.t > 1.4) { r.fase = "flyv"; r.t = 0; r.flamme.visible = true; this.s.lyd.missilStart?.(0); }
    } else if (r.fase === "flyv") {                              // op, op, op — med en hale af gnister
      r.v = Math.min(26, r.v + 16 * dt); p.y += r.v * dt;
      r.flamme.scale.y = 1.4 + Math.random() * 0.8;
      for (let i = 0; i < 4; i++) fyr.gnist(p.x, p.y - 0.8, p.z, GNIST[i % 3], (Math.random() - 0.5) * 3, -6 - Math.random() * 4, (Math.random() - 0.5) * 3, 0.6, { g: 0.3, træk: 1 });
      if (Math.random() < 0.5) partikel(p.x, p.y - 1, p.z, RØG, (Math.random() - 0.5), -1, (Math.random() - 0.5), 2.5, -0.02, 4);
      if (r.t > 2.8 || p.y > this.s.verden.BY + 12) this.springUd();
    }
    sp.pos.set(p.x, p.y + 4.4, p.z); sp.vel.set(0, 0, 0); sp.jord = false;
  }
  springUd() {                                                   // raketten springer ud i fyrværkeri — og faldskærmen folder sig ud
    const r = this.raket, { fyr, scene, sp } = this.s, p = r.g.position;
    for (const mønster of ["kugle", "ring", "stjerne"]) fyr.brag({ x: p.x, y: p.y + 3, z: p.z, mønster, farver: ["#ffd23f", "#ff3b5c", "#5ff0ff"] });
    scene.remove(r.g); r.g.traverse(c => c.material?.dispose());
    this.raket = null;
    this.skærm = this.byggSkærm();
    sp.vel.set(0, 2, 0);
    this.s.faldskærm(true);
    this.s.besked("🪂 Faldskærmen er foldet ud · styr med joysticket", 3000);
  }
  // Faldskærmen: en stribet kuppel over barnet, der følger med ned
  byggSkærm() {
    const g = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const v = i / 10 * Math.PI * 2, k = new THREE.Mesh(KASSE, new THREE.MeshLambertMaterial({ color: GONDOLFARVER[i % GONDOLFARVER.length], side: THREE.DoubleSide }));
      k.scale.set(1.6, 0.25, 1.1); k.position.set(Math.cos(v) * 1.6, 0, Math.sin(v) * 1.6);
      k.rotation.set(0, -v, -0.45); g.add(k);                    // stykkerne hælder udad og nedad som en kuppel
    }
    const top = new THREE.Mesh(KASSE, new THREE.MeshLambertMaterial({ color: "#ffffff" })); top.scale.set(1.4, 0.3, 1.4); top.position.y = 0.35; g.add(top);
    this.s.scene.add(g);
    return g;
  }
  opdaterSkærm(dt) {
    const { sp } = this.s;
    if (!this.skærm) return;
    this.skærm.position.set(sp.pos.x, sp.pos.y + 4.2, sp.pos.z);
    this.skærmT = (this.skærmT || 0) + dt;
    if (sp.jord || sp.flyver || this.skærmT > 30) {              // landet (eller i vandet længe): skærmen forsvinder
      this.skærmT = 0;
      this.s.scene.remove(this.skærm); this.skærm.traverse(c => c.material?.dispose());
      this.skærm = null; this.s.faldskærm(false);
    }
  }
  // Kæmperaketten kommer tilbage på sin plads lidt efter
  opdaterGenopbyg(dt) {
    for (let i = this.genopbyg.length - 1; i >= 0; i--) {
      const g = this.genopbyg[i];
      if ((g.t -= dt) > 0) continue;
      this.genopbyg.splice(i, 1);
      if (!this.s.verden.hent(g.x, g.y, g.z)) this.s.sæt(g.x, g.y, g.z, ID.Kæmperaket);
    }
  }

  // ---------- Barnet i gondolen eller på raketten (spil.js styrer det ellers selv) ----------
  styrSpiller(dt) {
    const { sp, tast } = this.s;
    if (this.raket) return true;
    const t = this.tur;
    if (!t) return false;
    t.drejet += FART * dt;
    const p = this.gondolPos(t.i, tmp);
    sp.pos.set(p.x, p.y - 1.45, p.z); sp.vel.set(0, 0, 0); sp.jord = true;
    const ud = tast.hop && !t.hopFør && t.drejet > 0.3;
    t.hopFør = !!tast.hop;
    if (t.drejet >= Math.PI * 2 || ud) {                          // en hel tur rundt (eller ⬆): stig ud
      this.tur = null;
      if (ud && p.y - this.hjul.g.position.y > 4) { this.s.startFlyv(); return true; }   // højt oppe: så flyver man
      sp.pos.set(p.x, this.hjul.g.position.y + 0.2, p.z + 3.2);
    }
    return true;
  }

  opdater(dt, tid) {
    const st = this.hjulSted;
    if (st && !this.hjul && this.s.verden.hentet(Math.floor(st[0]), Math.floor(st[1]))) this.hjul = this.byggHjul(...st);
    this.opdaterHjul(dt, tid);
    this.opdaterNedtælling(dt);
    this.opdaterRaket(dt);
    this.opdaterSkærm(dt);
    this.opdaterGenopbyg(dt);
  }
}
