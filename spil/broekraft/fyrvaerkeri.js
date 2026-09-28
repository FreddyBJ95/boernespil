// ===== Fyrværkeri i Broekraft =====
// Raketter skydes op med et hvin og springer ud i farvede gnister: kugle, ring, hjerte, stjerne,
// smiley, guldregn, knitter, blomst, sommerfugl, spiral, palme, planet og regn. Desuden fontæner
// på jorden, romerlys, ønskelygter der svæver op, og show-kasser med en stor finale. Gnisterne er glødende prikker (THREE.Points), der lægges oven i
// hinanden, så de lyser på nattehimlen. Nye mønstre: tilføj en funktion i MØNSTRE.

import * as THREE from "./three.js";

const MAKS = 7000;
const FARVER = ["#ff3b5c", "#ffd23f", "#4cd964", "#3aa8ff", "#c86bff", "#ff8c1a", "#ffffff", "#ff6fd0", "#5ff0ff"];
const tilfældig = a => a[Math.floor(Math.random() * a.length)];

// Blød, rund prik (lysende i midten)
function prikTekstur() {
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.35, "rgba(255,255,255,.8)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// Former i en flade der vender mod kameraet: svarer punkter (x, y) omkring 0 med radius ca. 1
const FORMER = {
  hjerte: n => Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2; return [16 * Math.sin(t) ** 3 / 16, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]; }),
  stjerne: n => Array.from({ length: n }, (_, i) => {
    const f = i / n * 10, k = Math.floor(f), t = f - k, r0 = k % 2 ? 0.45 : 1, r1 = k % 2 ? 1 : 0.45, a0 = k / 10 * Math.PI * 2 - Math.PI / 2, a1 = (k + 1) / 10 * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a0) * r0 * (1 - t) + Math.cos(a1) * r1 * t, -(Math.sin(a0) * r0 * (1 - t) + Math.sin(a1) * r1 * t)];
  }),
  smiley: n => {
    const p = [], m = Math.floor(n * 0.6);
    for (let i = 0; i < m; i++) { const t = i / m * Math.PI * 2; p.push([Math.cos(t), Math.sin(t)]); }
    for (const x of [-0.35, 0.35]) for (let i = 0; i < 6; i++) p.push([x + (Math.random() - 0.5) * 0.08, 0.32 + (Math.random() - 0.5) * 0.08]);
    const r = n - p.length;
    for (let i = 0; i < r; i++) { const t = Math.PI * (1.15 + 0.7 * i / r); p.push([Math.cos(t) * 0.55, Math.sin(t) * 0.55 - 0.02]); }
    return p;
  },
};

// En sværm af glødende prikker. size = hvor store de er (blokke).
class Sværm {
  constructor(scene, maks, size) {
    this.maks = maks;
    this.pos = new Float32Array(maks * 3); this.farve = new Float32Array(maks * 3);
    this.vel = new Float32Array(maks * 3); this.base = new Float32Array(maks * 3);
    this.liv = new Float32Array(maks); this.start = new Float32Array(maks); this.g = new Float32Array(maks);
    this.træk = new Float32Array(maks); this.blinker = new Uint8Array(maks);
    this.nr = 0; this.levende = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.farve, 3));
    this.punkter = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: prikTekstur(), vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
    this.punkter.frustumCulled = false; this.punkter.renderOrder = 5;
    scene.add(this.punkter);
  }
  gnist(x, y, z, vx, vy, vz, c, liv, g, træk, blinker) {
    const i = this.nr; this.nr = (this.nr + 1) % this.maks;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3); this.base.set([c.r, c.g, c.b], i * 3);
    this.liv[i] = liv; this.start[i] = liv; this.g[i] = g; this.træk[i] = træk; this.blinker[i] = blinker ? 1 : 0;
  }
  // flyv, brems, fald og falm
  opdater(dt) {
    const { pos, vel, base, farve, liv, start, g, træk, blinker } = this;
    let levende = 0;
    for (let i = 0; i < this.maks; i++) {
      if (liv[i] <= 0) { if (farve[i * 3] || farve[i * 3 + 1] || farve[i * 3 + 2]) farve.fill(0, i * 3, i * 3 + 3); continue; }
      levende++;
      liv[i] -= dt;
      const j = i * 3, bremse = Math.exp(-træk[i] * dt);
      vel[j] *= bremse; vel[j + 1] = vel[j + 1] * bremse - 9.8 * g[i] * dt; vel[j + 2] *= bremse;
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      let lys = Math.max(0, liv[i] / start[i]);
      lys = lys > 0.7 ? 1 : lys / 0.7;
      if (blinker[i] && Math.random() < 0.45) lys *= 0.15;
      farve[j] = base[j] * lys; farve[j + 1] = base[j + 1] * lys; farve[j + 2] = base[j + 2] * lys;
    }
    this.levende = levende;
    this.punkter.geometry.attributes.position.needsUpdate = true;
    this.punkter.geometry.attributes.color.needsUpdate = true;
  }
}

export class Fyrværkeri {
  // kamera: så former vender rigtigt · lyd: { fløjt(), brag(afstand), knitre(afstand) } · blink(farve, styrke): himlen lyser
  constructor(scene, kamera, { lyd, blink } = {}) {
    Object.assign(this, { scene, kamera, lyd: lyd || {}, blink: blink || (() => {}) });
    this.stor = new Sværm(scene, MAKS, 0.55);                     // selve bragene
    this.lille = new Sværm(scene, 1500, 0.2);                     // raketternes haler
    this.raketter = [];
    this.fyrkasser = [];
    this.fontæner = [];
    this.lygter = [];
    this.farveTmp = new THREE.Color();
  }
  get levende() { return this.stor.levende + this.lille.levende; }

  // Én gnist: farve som THREE.Color eller hex · g = tyngde · træk = luftmodstand pr. sekund · blinker = knitrer · lille = små gnister
  gnist(x, y, z, vx, vy, vz, farve, liv, { g = 0.35, træk = 1.4, blinker = false, lille = false } = {}) {
    const c = typeof farve === "string" ? this.farveTmp.set(farve) : farve;
    (lille ? this.lille : this.stor).gnist(x, y, z, vx, vy, vz, c, liv, g, træk, blinker);
  }

  // Send en raket op fra (x, y, z). mønster: se MØNSTRE (tom = tilfældigt)
  // Sammen sender serveren fart, farver og højde med, så raketten flyver ens hos alle
  // Særlige: "fontæne" (på jorden), "lygte" (ønskelygte) og "romerlys" (en lille kugle, der skydes op)
  raket(x, y, z, { mønster, farver, højde = 16 + Math.random() * 10, vx = (Math.random() - 0.5) * 2.5, vy = 22 + Math.random() * 5, vz = (Math.random() - 0.5) * 2.5 } = {}) {
    farver ||= [tilfældig(FARVER), tilfældig(FARVER)];
    if (mønster === "fontæne") return this.fontæne(x, y, z, farver);
    if (mønster === "lygte") return this.lygte(x, y, z, vx, vz);
    if (this.raketter.length > 24) return;
    if (mønster === "romerlys") { højde = 8 + Math.random() * 5; vy = 18; vx *= 0.3; vz *= 0.3; mønster = "lille"; }
    this.raketter.push({ x, y, z, vx, vy, vz, top: y + højde, mønster: MØNSTRE[mønster] ? mønster : tilfældig(TILFÆLDIGE), farver, t: 0 });
    this.lyd.fløjt?.(this.afstand(x, y, z));
  }

  // Fontæne: gnister sprøjter op fra jorden i ti sekunder
  fontæne(x, y, z, farver = [tilfældig(FARVER), tilfældig(FARVER)]) {
    if (this.fontæner.length < 12) this.fontæner.push({ x, y, z, farver, tid: 10, lyd: 0 });
  }

  // Ønskelygte: en lille glødende papirlygte, der svæver langsomt op og driver med vinden
  lygte(x, y, z, vx = 0, vz = 0) {
    if (this.lygter.length >= 30) this.fjernLygte(this.lygter[0]);
    const g = new THREE.Group(), papir = new THREE.MeshBasicMaterial({ color: "#ffb347", transparent: true, opacity: 0.92, fog: false });
    const krop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55), papir);
    const flamme = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.18), new THREE.MeshBasicMaterial({ color: "#fff3a0", fog: false }));
    flamme.position.y = -0.28;
    const kant = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), new THREE.MeshBasicMaterial({ color: "#e8891c", fog: false }));
    kant.position.y = 0.36;
    g.add(krop, flamme, kant);
    g.position.set(x, y, z);
    this.scene.add(g);
    this.lygter.push({ g, papir, x, y, z, vx: vx * 0.2 + (Math.random() - 0.5) * 0.4, vz: vz * 0.2 + (Math.random() - 0.5) * 0.4, t: Math.random() * 10, alder: 0 });
  }
  fjernLygte(l) {
    this.lygter.splice(this.lygter.indexOf(l), 1);
    this.scene.remove(l.g); l.g.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } });
  }

  afstand(x, y, z) { const k = this.kamera.position; return Math.hypot(x - k.x, y - k.y, z - k.z); }

  // Raketten springer ud
  brag(r) {
    const k = this.kamera, fremad = new THREE.Vector3(), højre = new THREE.Vector3(), op = new THREE.Vector3();
    k.getWorldDirection(fremad); højre.crossVectors(fremad, k.up).normalize(); op.crossVectors(højre, fremad).normalize();
    MØNSTRE[r.mønster](this, r, { højre, op });
    const f = this.farveTmp.set(r.farver[0]);
    this.blink(f, Math.max(0.15, 1 - this.afstand(r.x, r.y, r.z) / 90));
    this.lyd.brag?.(this.afstand(r.x, r.y, r.z));
  }

  // Fyrværkeri-kasse: skyder en hel serie raketter op fra samme sted
  // show = true: et langt show, der slutter med en stor finale
  tændKasse(x, y, z, antal = 12, show = false) {
    this.fyrkasser.push({ x, y, z, antal: show ? 36 : antal, show, tid: 0.3 });
  }

  opdater(dt) {
    // raketterne stiger med en hale af små guldgnister
    for (let i = this.raketter.length - 1; i >= 0; i--) {
      const r = this.raketter[i];
      r.t += dt; r.vy -= 9 * dt;
      r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
      for (let n = 0; n < 3; n++) this.gnist(r.x, r.y, r.z, (Math.random() - 0.5) * 1.2, -2 - Math.random() * 2, (Math.random() - 0.5) * 1.2, n ? "#ffb347" : "#fff3a0", 0.35 + Math.random() * 0.3, { g: 0.2, træk: 2, lille: true });
      if (r.y >= r.top || r.vy < 3) { this.raketter.splice(i, 1); this.brag(r); }
    }
    for (let i = this.fyrkasser.length - 1; i >= 0; i--) {
      const f = this.fyrkasser[i];
      if ((f.tid -= dt) > 0) continue;
      const finale = f.show && f.antal <= 8;
      this.raket(f.x + 0.5, f.y + 1, f.z + 0.5, { højde: finale ? 18 + Math.random() * 10 : 12 + Math.random() * 12, mønster: finale ? tilfældig(FINALE) : undefined });
      f.tid = finale ? 0.08 : f.show ? 0.25 + Math.random() * 0.35 : 0.35 + Math.random() * 0.45;
      if (--f.antal <= 0) this.fyrkasser.splice(i, 1);
    }
    // fontænerne sprøjter
    for (let i = this.fontæner.length - 1; i >= 0; i--) {
      const f = this.fontæner[i];
      f.tid -= dt;
      const n = Math.round(dt * (f.tid > 1.5 ? 220 : 80)), farver = [f.farver[0], f.farver[1], "#fff3a0", "#ffd23f"];
      for (let k = 0; k < n; k++) {
        const v = Math.random() * Math.PI * 2, s = Math.random() * 1.4;
        this.gnist(f.x + 0.5, f.y + 0.1, f.z + 0.5, Math.cos(v) * s, 7 + Math.random() * 4, Math.sin(v) * s, farver[k % 4], 0.9 + Math.random() * 0.5, { g: 0.6, træk: 0.8 });
      }
      if ((f.lyd -= dt) <= 0) { f.lyd = 0.9; this.lyd.knitre?.(this.afstand(f.x, f.y, f.z)); }
      if (f.tid <= 0) this.fontæner.splice(i, 1);
    }
    // ønskelygterne svæver op, blafrer og slukker til sidst
    for (const l of [...this.lygter]) {
      l.t += dt; l.alder += dt;
      l.x += (l.vx + Math.sin(l.t * 0.4) * 0.3) * dt; l.z += (l.vz + Math.cos(l.t * 0.3) * 0.3) * dt; l.y += 1.3 * dt;
      l.g.position.set(l.x, l.y, l.z);
      l.g.rotation.y += dt * 0.3;
      l.papir.opacity = Math.min(0.92, Math.max(0, (32 - l.alder) / 4)) * (0.85 + Math.sin(l.t * 9) * 0.07);
      if (l.alder > 32) this.fjernLygte(l);
    }
    this.stor.opdater(dt); this.lille.opdater(dt);
  }
}

// ---------- Mønstrene ----------
// Hver får (fyr, raket, { højre, op }) og laver gnisterne. Farverne ligger i raket.farver.
const kugleRetning = () => { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [s * Math.cos(t), u, s * Math.sin(t)]; };
function iFladen(fyr, r, form, fart, { højre, op }, farve, liv = 1.8) {
  form.forEach(([a, b], i) => {
    const vx = (højre.x * a + op.x * b) * fart, vy = (højre.y * a + op.y * b) * fart, vz = (højre.z * a + op.z * b) * fart;
    fyr.gnist(r.x, r.y, r.z, vx, vy, vz, Array.isArray(farve) ? farve[i % farve.length] : farve, liv + Math.random() * 0.3, { g: 0.12, træk: 1.1 });
  });
}
const cirkel = (n, rr = 1, fladt = 1) => Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2; return [Math.cos(t) * rr, Math.sin(t) * rr * fladt]; });
const MØNSTRE = {
  kugle(fyr, r) {
    for (let i = 0; i < 170; i++) {
      const [x, y, z] = kugleRetning(), v = 10 + Math.random() * 2;
      fyr.gnist(r.x, r.y, r.z, x * v, y * v, z * v, r.farver[i % 2], 1.6 + Math.random() * 0.6);
    }
  },
  ring(fyr, r) {
    const hæld = Math.random() * 0.8;
    for (let i = 0; i < 110; i++) {
      const t = i / 110 * Math.PI * 2, v = 11;
      fyr.gnist(r.x, r.y, r.z, Math.cos(t) * v, Math.sin(t) * v * hæld, Math.sin(t) * v, r.farver[0], 1.7);
    }
    for (let i = 0; i < 30; i++) { const [x, y, z] = kugleRetning(); fyr.gnist(r.x, r.y, r.z, x * 3, y * 3, z * 3, r.farver[1], 1.2); }
  },
  hjerte(fyr, r, akser) { iFladen(fyr, r, FORMER.hjerte(120), 9, akser, "#ff4f8b"); iFladen(fyr, r, FORMER.hjerte(60), 6, akser, "#ffc2dc", 1.5); },
  stjerne(fyr, r, akser) { iFladen(fyr, r, FORMER.stjerne(130), 10, akser, r.farver[0]); },
  smiley(fyr, r, akser) { iFladen(fyr, r, FORMER.smiley(120), 9, akser, "#ffd23f", 2.1); },
  guldregn(fyr, r) {                                             // lange gyldne gnister, der daler langsomt
    for (let i = 0; i < 150; i++) {
      const [x, y, z] = kugleRetning(), v = 8 + Math.random() * 3;
      fyr.gnist(r.x, r.y, r.z, x * v, y * v + 2, z * v, i % 3 ? "#ffcf5a" : "#fff3c4", 2.8 + Math.random() * 1.2, { g: 0.45, træk: 1.6 });
    }
  },
  knitter(fyr, r) {                                              // hvide gnister, der blinker og knitrer
    for (let i = 0; i < 160; i++) {
      const [x, y, z] = kugleRetning(), v = 6 + Math.random() * 6;
      fyr.gnist(r.x, r.y, r.z, x * v, y * v, z * v, i % 4 ? "#ffffff" : r.farver[0], 1.4 + Math.random() * 1.2, { blinker: true, g: 0.3 });
    }
    fyr.lyd.knitre?.(fyr.afstand(r.x, r.y, r.z));
  },
  regnbue(fyr, r) {
    for (let i = 0; i < 180; i++) {
      const [x, y, z] = kugleRetning(), v = 10 + Math.random();
      fyr.gnist(r.x, r.y, r.z, x * v, y * v, z * v, FARVER[i % 6], 1.8);
    }
  },
  blomst(fyr, r, akser) {                                        // fem kronblade om en gul midte
    const blade = Array.from({ length: 150 }, (_, i) => { const t = i / 150 * Math.PI * 2, rr = Math.abs(Math.sin(t * 2.5)) * 0.8 + 0.2; return [Math.cos(t) * rr, Math.sin(t) * rr]; });
    iFladen(fyr, r, blade, 10, akser, r.farver[0]);
    iFladen(fyr, r, cirkel(30, 0.18), 10, akser, "#ffd23f", 1.6);
  },
  sommerfugl(fyr, r, akser) {                                    // sommerfugle-kurven
    const form = Array.from({ length: 230 }, (_, i) => {
      const t = i / 230 * 12 * Math.PI, k = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.sin(t / 12) ** 5;
      return [Math.sin(t) * k / 4.2, Math.cos(t) * k / 4.2];
    });
    iFladen(fyr, r, form, 9, akser, [r.farver[0], r.farver[1]], 2);
  },
  spiral(fyr, r, akser) {                                        // fire arme, der snor sig
    const form = [];
    for (let a = 0; a < 4; a++) for (let j = 0; j < 34; j++) { const v = a * Math.PI / 2 + j * 0.17, s = 0.12 + j / 34; form.push([Math.cos(v) * s, Math.sin(v) * s]); }
    iFladen(fyr, r, form, 10, akser, [r.farver[0], r.farver[1]], 1.8);
  },
  palme(fyr, r) {                                                // lange gyldne blade, der hænger ned
    for (let k = 0; k < 9; k++) {
      const v = k / 9 * Math.PI * 2;
      for (let j = 0; j < 18; j++) { const s = 3 + j * 0.55; fyr.gnist(r.x, r.y, r.z, Math.cos(v) * s, 2 + j * 0.25, Math.sin(v) * s, j % 3 ? "#ffcf5a" : "#7dff7a", 2.2 + Math.random() * 0.5, { g: 0.55, træk: 1.2 }); }
    }
  },
  planet(fyr, r, akser) {                                        // en kugle med en ring om
    for (let i = 0; i < 90; i++) { const [x, y, z] = kugleRetning(); fyr.gnist(r.x, r.y, r.z, x * 5, y * 5, z * 5, r.farver[0], 1.8, { g: 0.15, træk: 1.3 }); }
    iFladen(fyr, r, cirkel(100, 1, 0.3), 11, akser, r.farver[1]);
  },
  regn(fyr, r) {                                                 // farvet regn, der drysser ned
    for (let i = 0; i < 200; i++) { const [x, y, z] = kugleRetning(), v = 4 + Math.random() * 4; fyr.gnist(r.x, r.y, r.z, x * v, y * v + 1, z * v, FARVER[i % FARVER.length], 3 + Math.random(), { g: 0.8, træk: 2.5 }); }
  },
  lille(fyr, r) {                                                // romerlysets lille kugle
    for (let i = 0; i < 40; i++) { const [x, y, z] = kugleRetning(); fyr.gnist(r.x, r.y, r.z, x * 4, y * 4, z * 4, r.farver[0], 0.9, { g: 0.3 }); }
  },
};
const TILFÆLDIGE = Object.keys(MØNSTRE).filter(m => m !== "lille");
const FINALE = ["kugle", "palme", "regnbue", "planet", "blomst", "guldregn"];
