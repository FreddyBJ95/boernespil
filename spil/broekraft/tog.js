// ===== Toget og luftballonen i Den uendelige verden =====
// Toget kører på de fire baner fra stationen derhjemme ud til årstiderne (uendelig.js lægger skinnerne).
//   Tryk på toget → vælg hvor det skal hen → det kører af sted, og man sidder i den første vogn.
//   Ved en station: tryk på 🚪 for at stå af, eller på toget for at køre længere ud eller hjem.
//   Går man hen til en station, hvor toget ikke er, så kommer det kørende.
// Luftballonen står fortøjet derhjemme. Tryk på den for at stige i. ⬆ = brænderen (op), ⬇ = ned,
//   joysticket styrer, og 🚪 lander ballonen blødt, så man kan stige ud.

import * as THREE from "./three.js";
import { MIDT, TOG_Y, STATION_HVER, BANELÆNGDE, BANER, HJEMSTED } from "./uendelig.js";

const kasse = new THREE.BoxGeometry(1, 1, 1);
const lam = f => new THREE.MeshLambertMaterial({ color: f });
function klods(til, b, h, l, farve, x, y, z) {
  const m = new THREE.Mesh(kasse, typeof farve === "string" ? lam(farve) : farve);
  m.scale.set(b, h, l); m.position.set(x, y, z); til.add(m);
  return m;
}

// ---------- Et lille valg-panel med store knapper (hvor skal toget hen?) ----------
const STIL = `
#rejsePanel { position: fixed; inset: 0; z-index: 35; display: none; align-items: center; justify-content: center; background: #0006; }
#rejsePanel.vis { display: flex; }
#rejsePanel .boks { background: #fff8e8; border: 4px solid #6b4a2b; border-radius: 22px; padding: 18px 20px; max-width: 92vw; text-align: center;
  font: 800 22px system-ui, sans-serif; color: #3a2a1a; box-shadow: 0 10px 30px #0008; }
#rejsePanel .knapper { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 14px; }
#rejsePanel button { font: 800 22px system-ui, sans-serif; padding: 14px 18px; min-width: 130px; border-radius: 16px; border: 3px solid #0003;
  background: #ffd84d; color: #3a2a1a; }
#rejsePanel button.luk { background: #ddd; min-width: 60px; }
`;
let panel = null;
export function vælg(titel, muligheder) {                     // muligheder: [{ tekst, gør }]
  if (!panel) {
    const st = document.createElement("style"); st.textContent = STIL; document.head.appendChild(st);
    panel = document.createElement("div"); panel.id = "rejsePanel";
    panel.innerHTML = `<div class="boks"><div class="titel"></div><div class="knapper"></div></div>`;
    panel.addEventListener("pointerdown", e => { if (e.target === panel) panel.classList.remove("vis"); });
    document.body.appendChild(panel);
  }
  panel.querySelector(".titel").textContent = titel;
  const k = panel.querySelector(".knapper"); k.innerHTML = "";
  for (const m of [...muligheder, { tekst: "✖️", gør: () => {}, luk: true }]) {
    const b = document.createElement("button"); b.textContent = m.tekst; if (m.luk) b.className = "luk";
    b.addEventListener("click", e => { e.stopPropagation(); panel.classList.remove("vis"); m.gør(); });
    k.appendChild(b);
  }
  panel.classList.add("vis");
}

// ---------- Toget ----------
function byggTog() {
  const g = new THREE.Group(), hjul = [];
  const hjulGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 14); hjulGeo.rotateZ(Math.PI / 2);
  const hjulMat = lam("#26262a");
  const sæt = (til, z) => { for (const x of [-0.95, 0.95]) for (const dz of [-0.9, 0.9]) { const h = new THREE.Mesh(hjulGeo, hjulMat); h.position.set(x, 0.42, z + dz); til.add(h); hjul.push(h); } };
  // lokomotivet (forrest, næsen mod +z)
  const lok = new THREE.Group(); g.add(lok);
  klods(lok, 1.9, 0.5, 4.2, "#26262a", 0, 0.6, 0);
  const kedel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.6, 16), lam("#d8262a")); kedel.rotation.x = Math.PI / 2; kedel.position.set(0, 1.55, 0.7); lok.add(kedel);
  klods(lok, 1.9, 1.7, 1.5, "#d8262a", 0, 1.75, -1.25);                        // førerhuset
  klods(lok, 2.05, 0.25, 1.7, "#26262a", 0, 2.7, -1.25);                       // taget
  for (const x of [-0.96, 0.96]) klods(lok, 0.05, 0.6, 0.9, new THREE.MeshBasicMaterial({ color: "#bfe8ff" }), x, 2.0, -1.25);
  const skorsten = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.9, 12), lam("#26262a")); skorsten.position.set(0, 2.65, 1.5); lok.add(skorsten);
  klods(lok, 1.95, 0.18, 4.25, "#ffd23f", 0, 0.95, 0);                         // gul stribe
  // et venligt ansigt foran
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const k = c.getContext("2d");
  k.fillStyle = "#f4f0e8"; k.beginPath(); k.arc(32, 32, 30, 0, Math.PI * 2); k.fill();
  k.fillStyle = "#222"; k.beginPath(); k.arc(22, 26, 5, 0, Math.PI * 2); k.arc(42, 26, 5, 0, Math.PI * 2); k.fill();
  k.lineWidth = 4; k.strokeStyle = "#222"; k.beginPath(); k.arc(32, 36, 13, 0.2 * Math.PI, 0.8 * Math.PI); k.stroke();
  k.fillStyle = "#ff9aa2"; k.beginPath(); k.arc(16, 38, 4, 0, Math.PI * 2); k.arc(48, 38, 4, 0, Math.PI * 2); k.fill();
  const ansigt = new THREE.Mesh(new THREE.CircleGeometry(0.78, 24), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  ansigt.position.set(0, 1.55, 2.02); lok.add(ansigt);
  sæt(lok, 0.6); sæt(lok, -1.1);
  // to vogne bagefter — barnet sidder i den første
  const vogne = [["#3a86ff", -4.6], ["#06d6a0", -8.4]].map(([farve, z]) => {
    const v = new THREE.Group(); v.position.z = z; g.add(v);
    klods(v, 1.9, 0.5, 3.2, "#26262a", 0, 0.6, 0);
    klods(v, 1.9, 0.9, 3.2, farve, 0, 1.3, 0);
    klods(v, 1.5, 0.4, 2.7, "#8a5a30", 0, 1.6, 0);                            // bænkene indeni
    for (const x of [-0.95, 0.95]) klods(v, 0.12, 0.35, 3.2, "#ffd23f", x, 1.9, 0);
    sæt(v, 0);
    return v;
  });
  const røg = [];                                                              // røgskyer fra skorstenen
  const røgMat = new THREE.MeshLambertMaterial({ color: "#f2f2f2", transparent: true, opacity: 0.8 });
  for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), røgMat); r.visible = false; g.add(r); røg.push({ m: r, t: i / 8 }); }
  return { g, hjul, vogne, røg };
}

export class Tog {
  // s: { scene, sp, lyd, besked, gem(), tilstand: { linje, r } }
  constructor(s) {
    this.s = s;
    const m = byggTog(); Object.assign(this, m);
    s.scene.add(this.g);
    this.linje = s.tilstand?.linje ?? 0;            // hvilken bane (BANER) toget står på
    this.r = s.tilstand?.r ?? 0;                    // hvor langt ude (0 = hjemme)
    this.mål = null; this.fart = 0; this.kører = false; this.tjuk = 0; this.retning = 1;
    this.placer();
  }
  get tilstand() { return { linje: this.linje, r: this.r }; }
  retningFor() { const b = BANER[this.linje]; return { dx: b.dx, dz: b.dz }; }
  pos() { const { dx, dz } = this.retningFor(); return new THREE.Vector3(MIDT + 0.5 + dx * this.r, TOG_Y + 1, MIDT + 0.5 + dz * this.r); }
  placer() {
    const { dx, dz } = this.retningFor(), p = this.pos();
    this.g.position.copy(p);
    const vej = this.mål !== null && this.mål < this.r ? -1 : 1;              // næsen peger den vej, toget kører
    this.retning = this.mål !== null ? vej : this.retning;
    this.g.rotation.y = Math.atan2(dx * this.retning, dz * this.retning);
  }
  sæde() { const { dx, dz } = this.retningFor(), p = this.pos(); return p.set(p.x - dx * this.retning * 4.6, p.y + 0.9, p.z - dz * this.retning * 4.6); }
  stationNavn() { return this.r === 0 ? "Stationen derhjemme" : `${BANER[this.linje].ikon} ${BANER[this.linje].tekst} (station ${Math.round(this.r / STATION_HVER)})`; }

  // Rammer strålen toget? (så kan man trykke på det langt nede fra jorden)
  rammer(ray) {
    if (!this.g.visible) return null;
    const h = ray.intersectObject(this.g, true)[0];
    return h && h.distance < 45 ? h.distance : null;
  }
  tryk() {
    if (this.mål !== null) { this.s.lyd.togFløjt(); return; }
    const muligheder = [];
    if (this.r === 0) for (let i = 0; i < BANER.length; i++) muligheder.push({ tekst: `${BANER[i].ikon} ${BANER[i].tekst}`, gør: () => this.kørTil(i, STATION_HVER) });
    else {
      if (this.r + STATION_HVER <= BANELÆNGDE) muligheder.push({ tekst: "➡️ Længere ud", gør: () => this.kørTil(this.linje, this.r + STATION_HVER) });
      if (this.r > STATION_HVER) muligheder.push({ tekst: "⬅️ Én station tilbage", gør: () => this.kørTil(this.linje, this.r - STATION_HVER) });
      muligheder.push({ tekst: "🏡 Hjem", gør: () => this.kørTil(this.linje, 0) });
    }
    vælg(this.kører ? "🚂 Hvor skal vi hen?" : "🚂 Tryk, hvor toget skal køre hen!", muligheder);
  }
  kørTil(linje, r) {
    if (this.r === 0) this.linje = linje;           // hjemme kan toget dreje ind på alle fire baner
    this.mål = r; this.fart = 0;
    this.kører = true;                              // barnet stiger på
    this.placer();
    this.s.lyd.togFløjt(); this.s.vedAfgang?.();
    this.s.besked(r === 0 ? "🚂 Vi kører hjem! Tuut tuut!" : `🚂 Vi kører til ${BANER[this.linje].tekst}! Tuut tuut!`, 3000);
  }
  // Barnet sidder i toget: toget flytter det
  styrSpiller(dt) {
    if (!this.kører) return false;
    const s = this.sæde();
    this.s.sp.pos.set(s.x, s.y, s.z); this.s.sp.vel.set(0, 0, 0); this.s.sp.jord = true;
    return true;
  }
  stigUd() {
    if (!this.kører) return false;
    if (this.mål !== null) { this.s.besked("Vent, til toget holder stille 🚂", 1800); return true; }
    this.kører = false;
    const { dx, dz } = this.retningFor(), p = this.pos();
    if (this.r === 0) this.s.sp.pos.set(MIDT + 2.5, TOG_Y + 1, MIDT - 3.5);  // perronen derhjemme (trappen er lige ved siden af)
    else if (dx) this.s.sp.pos.set(p.x, TOG_Y + 1, p.z + 2.5);                // trappen går ned mod +z
    else this.s.sp.pos.set(p.x + 2.5, TOG_Y + 1, p.z);                        // … eller mod +x
    this.s.sp.vel.set(0, 0, 0);
    this.s.gem();
    return true;
  }
  opdater(dt, tNu) {
    const sp = this.s.sp.pos;
    // går barnet hen til en station, og toget er langt væk, så kommer toget (det har ventet et andet sted)
    if (!this.kører && this.mål === null && this.g.position.distanceTo(sp) > 150) {
      for (let i = 0; i < BANER.length; i++) for (let r = 0; r <= BANELÆNGDE; r += STATION_HVER) {
        const x = MIDT + BANER[i].dx * r, z = MIDT + BANER[i].dz * r;
        if (Math.hypot(sp.x - x, sp.z - z) < 28) { this.linje = r === 0 ? this.linje : i; this.r = r; this.placer(); }
      }
    }
    if (this.mål !== null) {                        // kør: sæt farten op, og brems blødt før stationen
      const rest = Math.abs(this.mål - this.r), maks = 22, acc = 5;
      this.fart = rest < (this.fart * this.fart) / (2 * acc) + 0.5 ? Math.max(2, this.fart - acc * dt) : Math.min(maks, this.fart + acc * dt);
      const skridt = Math.min(rest, this.fart * dt);
      this.r += Math.sign(this.mål - this.r) * skridt;
      if (rest - skridt < 0.01) {
        this.r = this.mål; this.mål = null; this.fart = 0;
        this.s.lyd.togFløjt();
        this.s.besked(`🚉 ${this.stationNavn()}! Tryk på 🚪 for at stå af — eller på toget for at køre videre`, 5000);
        this.s.gem();
      }
      this.placer();
      if ((this.tjuk -= dt * this.fart) <= 0) { this.tjuk = 3; this.s.lyd.togKør(this.fart); }
    }
    for (const h of this.hjul) h.rotation.x += this.fart * dt / 0.42 * this.retning;
    this.røg.forEach(r => {                         // røg stiger op af skorstenen
      r.t = (r.t + dt * (0.5 + this.fart * 0.05)) % 1;
      r.m.visible = this.g.visible;
      r.m.position.set(Math.sin(r.t * 9 + tNu) * 0.2, 3.1 + r.t * 3, 1.5 - r.t * this.fart * 0.25);
      r.m.scale.setScalar(0.6 + r.t * 1.8);
    });
    this.g.visible = this.g.position.distanceTo(sp) < 200;
  }
}

// ---------- Luftballonen ----------
function byggBallon() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(3.2, 24, 16), p = geo.attributes.position, f = [], c = new THREE.Color();
  const striber = ["#e63946", "#ffd23f", "#3a86ff", "#ffffff", "#06d6a0", "#ff7eb6"];
  for (let i = 0; i < p.count; i++) {                // lodrette striber i regnbuens farver
    const a = Math.atan2(p.getZ(i), p.getX(i)), n = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % striber.length;
    c.set(striber[n]); f.push(c.r, c.g, c.b);
    const y = p.getY(i); if (y < 0) p.setY(i, y * 1.25);                   // lidt spids forneden
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(f, 3));
  const hylster = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  hylster.position.y = 6.2; g.add(hylster);
  klods(g, 1.7, 1.0, 1.7, "#8a5a30", 0, 0.5, 0);                           // kurven
  klods(g, 1.8, 0.15, 1.8, "#6b4a2b", 0, 1.05, 0);
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {   // tovene op til ballonen
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 4), lam("#5a4a3a"));
    t.position.set(x * 1.1, 2.7, z * 1.1); t.rotation.set(z * 0.25, 0, -x * 0.25); g.add(t);
  }
  const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.0, 10), new THREE.MeshBasicMaterial({ color: "#ffb020", transparent: true, opacity: 0.9 }));
  flamme.position.y = 2.2; flamme.visible = false; g.add(flamme);
  return { g, flamme };
}

export class Ballon {
  // s: { scene, verden, sp, lyd, besked, gem(), pos: [x, y, z] eller null }
  constructor(s) {
    this.s = s;
    const m = byggBallon(); Object.assign(this, m);
    s.scene.add(this.g);
    const p = s.pos || [HJEMSTED.ballon.x + 0.5, HJEMSTED.ballon.y, HJEMSTED.ballon.z + 0.5];
    this.pos = new THREE.Vector3(...p);
    this.vel = new THREE.Vector3();
    this.flyver = false; this.lander = false; this.brændTid = 0; this.t = 0;
  }
  get tilstand() { return [this.pos.x, this.pos.y, this.pos.z]; }
  rammer(ray) {
    if (this.flyver || !this.g.visible) return null;
    const h = ray.intersectObject(this.g, true)[0];
    return h && h.distance < 14 ? h.distance : null;
  }
  tryk() {                                          // stig i ballonen
    if (this.flyver) { this.brænd(); return; }
    this.flyver = true; this.lander = false; this.vel.set(0, 2, 0);
    this.brænd();
    this.s.besked("🎈 Du flyver i luftballonen! ⬆ = op · ⬇ = ned · styr med joysticket · 🚪 = land", 5000);
  }
  brænd() { this.brændTid = 0.8; this.s.lyd.brænder(); }
  stigUd() {
    if (!this.flyver) return false;
    if (!this.lander) { this.lander = true; this.s.besked("🎈 Ballonen lander…", 2000); }
    return true;
  }
  jord(x, z) { return this.s.verden.hentet(Math.floor(x), Math.floor(z)) ? this.s.verden.topY(Math.floor(x), Math.floor(z)) + 1 : this.pos.y; }
  // Barnet står i kurven: ballonen flytter det
  styrSpiller(dt, tast, yaw) {
    if (!this.flyver) return false;
    const frem = tast.frem - tast.tilbage, side = tast.hoejre - tast.venstre;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const mx = (fx * frem + rx * side) * 6, mz = (fz * frem + rz * side) * 6;
    this.vel.x += (mx - this.vel.x) * Math.min(1, dt * 1.5);
    this.vel.z += (mz - this.vel.z) * Math.min(1, dt * 1.5);
    if (this.lander) this.vel.y += (-2.5 - this.vel.y) * Math.min(1, dt * 2);
    else if (tast.hop || tast.op) { this.vel.y = Math.min(3.5, this.vel.y + dt * 5); if (this.brændTid <= 0) this.brænd(); }
    else if (tast.ned) this.vel.y = Math.max(-3, this.vel.y - dt * 5);
    else this.vel.y += (-0.25 - this.vel.y) * Math.min(1, dt);             // ellers daler den stille
    const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    const v = this.s.verden, fri = (x, y, z) => !v.erFast(Math.floor(x), Math.floor(y), Math.floor(z)) && !v.erFast(Math.floor(x), Math.floor(y + 1), Math.floor(z));
    if (fri(nx, this.pos.y, this.pos.z)) this.pos.x = nx; else this.vel.x = 0;
    if (fri(this.pos.x, this.pos.y, nz)) this.pos.z = nz; else this.vel.z = 0;
    this.pos.y = Math.min(this.s.verden.BY - 2, this.pos.y + this.vel.y * dt);
    const bund = this.jord(this.pos.x, this.pos.z);
    if (this.pos.y <= bund) {                        // kurven står på jorden
      this.pos.y = bund; this.vel.y = Math.max(0, this.vel.y);
      if (this.lander) {                             // landet: stig ud ved siden af kurven
        this.flyver = this.lander = false; this.vel.set(0, 0, 0);
        const sp = this.s.sp;
        sp.pos.set(this.pos.x + 1.8, this.jord(this.pos.x + 1.8, this.pos.z) + 0.05, this.pos.z); sp.vel.set(0, 0, 0);
        this.s.besked("🎈 Godt landet!", 2000); this.s.gem();
        return false;
      }
    }
    const sp = this.s.sp;
    sp.pos.set(this.pos.x, this.pos.y + 1.1, this.pos.z); sp.vel.set(0, 0, 0); sp.jord = true;
    return true;
  }
  opdater(dt) {
    this.t += dt;
    this.brændTid = Math.max(0, this.brændTid - dt);
    this.flamme.visible = this.brændTid > 0;
    this.flamme.scale.setScalar(0.8 + Math.random() * 0.5);
    if (!this.flyver && this.s.verden.hentet(Math.floor(this.pos.x), Math.floor(this.pos.z))) this.pos.y = this.jord(this.pos.x, this.pos.z);
    this.g.position.set(this.pos.x, this.pos.y + (this.flyver ? Math.sin(this.t * 1.3) * 0.15 : 0), this.pos.z);
    this.g.rotation.z = this.flyver ? Math.sin(this.t * 0.9) * 0.04 : 0;
    this.g.visible = this.g.position.distanceTo(this.s.sp.pos) < 220;
  }
}
