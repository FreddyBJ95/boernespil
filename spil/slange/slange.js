// ===== Fjollet Slange — selve slangen: krop, hoved, googly-øjne, tunge og hatte =====
// Kroppen er mange bløde kugler, der følger den vej, hovedet har kørt. Hovedet kigger efter maden.
// HATTE: slangen får en ny hat for hver 5. ting, den spiser. Tilføj en ny hat nederst i HATTE.

import * as THREE from "./three.js";

const TAU = Math.PI * 2;
const MAKS = 600;                                            // så lang kan slangen højst blive
const AFSTAND = 0.42;                                        // afstanden mellem kuglerne i kroppen
const mat = (farve, ekstra = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.4, metalness: 0, ...ekstra });
const del = (geo, farve, x = 0, y = 0, z = 0, ekstra) => { const m = new THREE.Mesh(geo, mat(farve, ekstra)); m.position.set(x, y, z); m.castShadow = true; return m; };

// ---------- Hattene (hovedets top er ved y = 0) ----------
export const HATTE = [
  { navn: "Festhat", ikon: "🥳", byg: g => {
    const k = del(new THREE.ConeGeometry(0.32, 0.8, 16), "#ff4d6d", 0, 0.4, 0); g.add(k);
    for (let i = 0; i < 3; i++) { const r = del(new THREE.TorusGeometry(0.28 - i * 0.08, 0.035, 6, 20), ["#ffd23f", "#5fd3ff", "#8aff7a"][i], 0, 0.12 + i * 0.22, 0); r.rotation.x = Math.PI / 2; g.add(r); }
    g.add(del(new THREE.SphereGeometry(0.11, 10, 8), "#ffd23f", 0, 0.85, 0));
  } },
  { navn: "Krone", ikon: "👑", byg: g => {
    const guld = { metalness: 0.7, roughness: 0.25, emissive: "#8a5a00", emissiveIntensity: 0.25 };
    g.add(del(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 20, 1, true), "#ffd23f", 0, 0.11, 0, { ...guld, side: THREE.DoubleSide }));
    for (let i = 0; i < 6; i++) { const v = i / 6 * TAU; g.add(del(new THREE.ConeGeometry(0.08, 0.2, 6), "#ffd23f", Math.cos(v) * 0.34, 0.3, Math.sin(v) * 0.34, guld)); g.add(del(new THREE.SphereGeometry(0.045, 6, 4), ["#e8283c", "#3a86ff", "#06d6a0"][i % 3], Math.cos(v) * 0.37, 0.1, Math.sin(v) * 0.37)); }
  } },
  { navn: "Piratehat", ikon: "🏴‍☠️", byg: g => {
    const skygge = del(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 3), "#1a1a1a", 0, 0.06, 0); skygge.rotation.y = Math.PI / 6; g.add(skygge);
    const top = del(new THREE.SphereGeometry(0.34, 16, 10, 0, TAU, 0, Math.PI / 2), "#1a1a1a", 0, 0.06, 0); top.scale.y = 1.1; g.add(top);
    g.add(del(new THREE.SphereGeometry(0.08, 8, 6), "#ffffff", 0, 0.28, 0.3));
    for (const s of [-1, 1]) { const b = del(new THREE.BoxGeometry(0.2, 0.035, 0.035), "#ffffff", 0, 0.2, 0.33); b.rotation.z = s * 0.7; g.add(b); }
  } },
  { navn: "Cowboyhat", ikon: "🤠", byg: g => {
    const b = del(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 24), "#a8702a", 0, 0.05, 0); b.scale.z = 0.85; g.add(b);
    g.add(del(new THREE.CylinderGeometry(0.28, 0.33, 0.4, 16), "#a8702a", 0, 0.26, 0), del(new THREE.CylinderGeometry(0.335, 0.335, 0.08, 16), "#5a3a14", 0, 0.12, 0));
  } },
  { navn: "Høj hat", ikon: "🎩", byg: g => {
    g.add(del(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), "#1a1a1a", 0, 0.03, 0), del(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 20), "#1a1a1a", 0, 0.4, 0), del(new THREE.CylinderGeometry(0.305, 0.305, 0.12, 20), "#e8283c", 0, 0.15, 0));
  } },
  { navn: "Kaninører", ikon: "🐰", byg: g => {
    for (const s of [-1, 1]) {
      const ø = del(new THREE.SphereGeometry(0.14, 12, 8), "#ffffff", s * 0.18, 0.4, 0); ø.scale.set(0.8, 3, 0.5); ø.rotation.z = -s * 0.15; g.add(ø);
      const inde = del(new THREE.SphereGeometry(0.08, 10, 6), "#ffb0c8", s * 0.18, 0.4, 0.05); inde.scale.set(0.8, 3.4, 0.4); inde.rotation.z = -s * 0.15; g.add(inde);
    }
  } },
  { navn: "Blomsterkrans", ikon: "🌸", byg: g => {
    for (let i = 0; i < 10; i++) { const v = i / 10 * TAU; g.add(del(new THREE.SphereGeometry(0.1, 10, 6), ["#ff8fd0", "#ffd23f", "#ffffff", "#b15bff", "#ff4d6d"][i % 5], Math.cos(v) * 0.34, 0.06, Math.sin(v) * 0.34)); g.add(del(new THREE.SphereGeometry(0.06, 6, 4), "#3fae3a", Math.cos(v + 0.3) * 0.36, 0.02, Math.sin(v + 0.3) * 0.36)); }
  } },
  { navn: "Kokkehue", ikon: "👨‍🍳", byg: g => {
    g.add(del(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 18), "#ffffff", 0, 0.15, 0));
    for (let i = 0; i < 5; i++) { const v = i / 5 * TAU; g.add(del(new THREE.SphereGeometry(0.2, 12, 8), "#ffffff", Math.cos(v) * 0.16, 0.42, Math.sin(v) * 0.16)); }
    g.add(del(new THREE.SphereGeometry(0.24, 12, 8), "#ffffff", 0, 0.5, 0));
  } },
  { navn: "Vikinghjelm", ikon: "⚔️", byg: g => {
    g.add(del(new THREE.SphereGeometry(0.38, 18, 10, 0, TAU, 0, Math.PI / 2), "#9aa3ad", 0, 0, 0, { metalness: 0.6, roughness: 0.3 }));
    for (const s of [-1, 1]) { const h = del(new THREE.ConeGeometry(0.09, 0.5, 10), "#fff3d0", s * 0.42, 0.28, 0); h.rotation.z = -s * 0.8; g.add(h); }
  } },
  { navn: "Astronauthjelm", ikon: "🧑‍🚀", byg: g => {
    const glas = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 16), new THREE.MeshStandardMaterial({ color: "#bfe8ff", transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.3, depthWrite: false }));
    glas.position.set(0, -0.35, 0.05); g.add(glas);
    const r = del(new THREE.TorusGeometry(0.72, 0.08, 8, 28), "#f4f4f8", 0, -0.95, 0.05); r.rotation.x = Math.PI / 2; g.add(r);
    g.add(del(new THREE.SphereGeometry(0.06, 6, 4), "#ff4d6d", 0, 0.6, 0.05, { emissive: "#ff0030", emissiveIntensity: 0.8 }));
  } },
];

// ---------- Hudfarver: normal (grøn med gule striber) eller regnbue (når man har spist en regnbueboble) ----------
const c = new THREE.Color();
function hudfarve(i, n, t, regnbue) {
  if (regnbue) return c.setHSL(((i * 0.035) - t * 0.6) % 1 + 1, 0.85, 0.58);
  const stribe = Math.floor(i / 3) % 3 === 2;
  return stribe ? c.set("#ffd93b") : c.set(i % 2 ? "#4fd35a" : "#46c552");
}

export class Slange {
  constructor(scene) {
    this.scene = scene;
    this.krop = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), mat("#ffffff", { roughness: 0.35 }), MAKS);
    this.krop.castShadow = true; this.krop.receiveShadow = true;
    this.krop.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < MAKS; i++) this.krop.setColorAt(i, c.set("#4fd35a"));
    this.krop.frustumCulled = false;
    scene.add(this.krop);
    this.o = new THREE.Object3D();
    this.bygHoved();
    this.hatNr = -1; this.hat = null;
    this.blinkT = 2; this.tungeT = 1.5; this.tunge = 0; this.fnis = 0; this.gab = 0;
  }

  // Hovedet: stort og rundt med kinder, næsebor, smil, googly-øjne og en tunge, der stikker ud
  bygHoved() {
    const h = new THREE.Group(), grøn = "#4fd35a";
    const kranie = del(new THREE.SphereGeometry(0.62, 28, 20), grøn); kranie.scale.set(1.05, 0.85, 1.2); h.add(kranie);
    const snude = del(new THREE.SphereGeometry(0.42, 20, 14), "#5fe06a", 0, -0.08, 0.45); snude.scale.set(1.15, 0.7, 0.9); h.add(snude);
    for (const s of [-1, 1]) {
      h.add(del(new THREE.SphereGeometry(0.05, 8, 6), "#1f5a24", s * 0.14, 0.02, 0.84));                     // næsebor
      const kind = del(new THREE.SphereGeometry(0.12, 10, 8), "#ff8fb0", s * 0.42, -0.1, 0.52); kind.scale.set(1, 0.6, 0.4); h.add(kind);
    }
    const smil = del(new THREE.TorusGeometry(0.26, 0.035, 8, 20, Math.PI), "#1f5a24", 0, -0.12, 0.76); smil.rotation.set(0.25, 0, Math.PI); h.add(smil);
    // googly-øjne på toppen: hvid kugle, sort pupil der kan flytte sig, og et øjenlåg til at blinke
    this.øjne = [];
    for (const s of [-1, 1]) {
      const ø = new THREE.Group(); ø.position.set(s * 0.3, 0.42, 0.22);
      const hvid = del(new THREE.SphereGeometry(0.26, 18, 12), "#ffffff", 0, 0, 0, { roughness: 0.15 });
      const pupil = del(new THREE.SphereGeometry(0.14, 14, 10), "#111111", 0, 0.15, 0.1, { roughness: 0.1 });
      const glans = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: "#ffffff" })); glans.position.set(0.05, 0.06, 0.12); pupil.add(glans);
      const låg = del(new THREE.SphereGeometry(0.275, 18, 12, 0, TAU, 0, Math.PI / 2), grøn); låg.scale.y = 0.05;
      ø.add(hvid, pupil, låg); h.add(ø);
      this.øjne.push({ ø, pupil, låg });
    }
    // den kløftede tunge
    this.tungeG = new THREE.Group(); this.tungeG.position.set(0, -0.18, 0.72);
    const tm = mat("#ff3b5c", { roughness: 0.3 });
    const stang = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.5), tm); stang.position.z = 0.25; this.tungeG.add(stang);
    for (const s of [-1, 1]) { const spids = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.2), tm); spids.position.set(s * 0.06, 0, 0.55); spids.rotation.y = s * 0.5; this.tungeG.add(spids); }
    this.tungeG.scale.z = 0.01; h.add(this.tungeG);
    this.hatPlads = new THREE.Group(); this.hatPlads.position.set(0, 0.5, -0.05); h.add(this.hatPlads);
    h.scale.setScalar(1.25);                                  // et stort, sødt hoved
    this.hoved = h; this.hovedDele = [kranie.material, snude.material, ...this.øjne.map(e => e.låg.material)];
    this.scene.add(h);
  }

  // Tag en hat på (nr i HATTE)
  sætHat(nr) {
    if (nr === this.hatNr) return;
    this.hatNr = nr;
    if (this.hat) { this.hatPlads.remove(this.hat); this.hat.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); }
    this.hat = new THREE.Group();
    HATTE[nr % HATTE.length].byg(this.hat);
    this.hatPlads.add(this.hat);
    this.hatHop = 1;
  }

  // Tegn slangen: hovedet i pos, kroppen langs stien. kig = det punkt øjnene kigger efter.
  opdater(dt, t, { pos, vinkel, sti, antal, højde, kig, regnbue, turbo }) {
    // hoved
    const hy = højde(pos.x, pos.z) + 0.72 + Math.abs(Math.sin(t * 7)) * 0.05;
    this.hoved.position.set(pos.x, hy, pos.z);
    this.hoved.rotation.set(0, Math.PI / 2 - vinkel, Math.sin(t * 5) * 0.06);
    const hovedFarve = regnbue ? c.setHSL((1 - (t * 0.6) % 1), 0.85, 0.58) : c.set("#4fd35a");
    for (const m of this.hovedDele) m.color.copy(hovedFarve);
    // kroppen: gå baglæns hen ad stien og læg en kugle for hver AFSTAND
    let nr = 0, brugt = 0, rest = AFSTAND * 1.4;
    for (let i = 1; i < sti.length && nr < antal; i++) {
      const a = sti[i - 1], b = sti[i], d = Math.hypot(b.x - a.x, b.z - a.z);
      while (rest <= brugt + d && nr < antal) {
        const k = d > 0 ? (rest - brugt) / d : 0, x = a.x + (b.x - a.x) * k, z = a.z + (b.z - a.z) * k;
        const andel = nr / Math.max(1, antal - 1), r = 0.62 * (1 - 0.55 * Math.pow(andel, 1.4)) * (1 + Math.sin(t * 9 - nr * 0.5) * 0.04);
        this.o.position.set(x, højde(x, z) + r + Math.max(0, Math.sin(t * 6 - nr * 0.35)) * 0.08, z);
        this.o.scale.set(r, r * 0.92, r);
        this.o.updateMatrix();
        this.krop.setMatrixAt(nr, this.o.matrix);
        this.krop.setColorAt(nr, hudfarve(nr, antal, t, regnbue));
        nr++; rest += AFSTAND;
      }
      brugt += d;
    }
    this.krop.count = nr;
    this.krop.instanceMatrix.needsUpdate = true;
    if (this.krop.instanceColor) this.krop.instanceColor.needsUpdate = true;

    // øjnene kigger efter maden, og de blinker af og til
    const lx = kig.x - pos.x, lz = kig.z - pos.z, lok = Math.atan2(lx, lz) - (Math.PI / 2 - vinkel);
    const px = Math.sin(lok) * 0.1, pz = 0.06 + Math.cos(lok) * 0.08;             // pupillerne sidder oppe på øjet, så man kan se dem ovenfra
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3;
    for (const e of this.øjne) {
      e.pupil.position.set(Math.max(-0.12, Math.min(0.12, px)), 0.15 + Math.sin(t * 3) * 0.01, pz);
      e.låg.scale.y = this.blinkT < 0 ? 1 : 0.05;
      e.låg.rotation.x = this.blinkT < 0 ? -0.2 : 0;
      e.ø.scale.setScalar(1 + (this.fnis > 0 ? Math.sin(t * 30) * 0.08 : 0));
    }
    // tungen stikker ud og ind (hurtigere når man fniser eller har turbo)
    this.tungeT -= dt;
    if (this.tungeT <= 0) { this.tunge = 0.45; this.tungeT = 1.2 + Math.random() * 2.5; }
    this.tunge = Math.max(0, this.tunge - dt);
    const ud = this.fnis > 0 || turbo ? 0.6 + Math.sin(t * 25) * 0.4 : Math.sin(Math.min(1, this.tunge / 0.45) * Math.PI);
    this.tungeG.scale.z = Math.max(0.01, ud);
    this.tungeG.rotation.y = Math.sin(t * 30) * 0.25 * ud;
    // fnis: hovedet vrikker; hatten hopper, når den er ny
    this.fnis = Math.max(0, this.fnis - dt);
    if (this.fnis > 0) this.hoved.rotation.z += Math.sin(t * 22) * 0.25;
    this.hatHop = Math.max(0, (this.hatHop || 0) - dt * 1.5);
    this.hatPlads.position.y = 0.5 + Math.sin(this.hatHop * Math.PI) * 0.8;
    this.hatPlads.rotation.y = this.hatHop * TAU;
  }

  // Til partikler og kameraet: hvor er halespidsen?
  halePos(target) { return target.setFromMatrixPosition(this.o.matrix); }
}
export { AFSTAND };
