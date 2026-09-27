// ===== De andre børn, når man spiller sammen =====
// Hver spiller er et af dyrene fra dyr.js. Figuren glider blødt hen til de positioner, serveren
// sender (ca. 10 gange i sekundet), svinger med benene og har en lille boble over hovedet,
// så man kan finde hinanden. Emoji vises i en stor boble i et par sekunder.

import * as THREE from "./three.js";
import { DYR, byggDyr } from "./dyr.js";

export const FIGURER = [
  { id: "gris", ikon: "🐷", navn: "Gris" },
  { id: "ko", ikon: "🐮", navn: "Ko" },
  { id: "faar", ikon: "🐑", navn: "Får" },
  { id: "hone", ikon: "🐔", navn: "Høne" },
  { id: "fro", ikon: "🐸", navn: "Frø" },
  { id: "and", ikon: "🦆", navn: "And" },
  { id: "snegl", ikon: "🐌", navn: "Snegl" },
  { id: "zombie", ikon: "🧟", navn: "Zombie" },
];
export const figurIkon = id => (FIGURER.find(f => f.id === id) || FIGURER[0]).ikon;

// En rund boble med et emoji i, som altid vender mod kameraet
function boble(tekst, farve) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = farve; g.beginPath(); g.arc(64, 60, 54, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(48, 108); g.lineTo(80, 108); g.lineTo(64, 126); g.closePath(); g.fill();
  g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(64, 60, 54, 0, Math.PI * 2); g.stroke();
  g.font = "64px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(tekst, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false }));
  s.renderOrder = 20;
  return s;
}
const FARVER = ["#ffffff", "#ffe066", "#a6e3ff", "#ffc2e0", "#c8f7a8", "#e0ccff", "#ffd1a6", "#b8fff0"];

export class Figur {
  constructor(id, figur, scene) {
    this.id = id; this.figur = figur; this.scene = scene;
    this.def = DYR.find(d => d.id === figur) || DYR[0];
    this.model = byggDyr(this.def);
    scene.add(this.model);
    const boks = new THREE.Box3().setFromObject(this.model);
    this.højde = boks.max.y;
    this.mærke = boble(figurIkon(figur), FARVER[Math.abs(hash(id)) % FARVER.length]);
    this.mærke.scale.setScalar(0.55);
    scene.add(this.mærke);
    this.pos = new THREE.Vector3(); this.mål = new THREE.Vector3();
    this.yaw = 0; this.målYaw = 0; this.fase = 0; this.t = Math.random() * 10; this.ny = true;
    this.emoji = null; this.emojiTid = 0;
  }

  // Ny position fra serveren (fødderne). Spillerens kamera kigger mod -z, dyrene har næsen mod +z.
  sæt(x, y, z, yaw) {
    this.mål.set(x, y, z);
    this.målYaw = yaw + Math.PI;
    if (this.ny) { this.pos.copy(this.mål); this.yaw = this.målYaw; this.ny = false; }
  }

  visEmoji(e) {
    if (this.emoji) { this.scene.remove(this.emoji); this.emoji.material.map.dispose(); this.emoji.material.dispose(); }
    this.emoji = boble(e, "#ffffff");
    this.scene.add(this.emoji);
    this.emojiTid = 2.8;
  }

  opdater(dt) {
    this.t += dt;
    const før = this.pos.clone();
    this.pos.lerp(this.mål, Math.min(1, dt * 10));
    if (this.pos.distanceTo(this.mål) > 8) this.pos.copy(this.mål);             // teleport: spring bare
    let d = this.målYaw - this.yaw;
    d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.yaw += d * Math.min(1, dt * 10);
    const fart = Math.hypot(this.pos.x - før.x, this.pos.z - før.z) / Math.max(dt, 1e-4);
    this.fase += fart * dt * 5;
    const u = this.model.userData;
    for (const b of u.ben) b.rotation.x = Math.sin(this.fase + b.userData.fase) * 0.7 * Math.min(1, fart);
    const iLuften = this.pos.y - før.y > 0.01 || this.mål.y - this.pos.y > 0.3;
    for (const w of u.vinge) w.rotation.z = w.userData.side * ((iLuften ? Math.sin(this.t * 20) * 0.7 : Math.sin(this.t * 3) * 0.1) - 0.1);
    for (const h of u.hale) h.rotation.y = Math.sin(this.t * 6) * 0.35;
    for (const m of u.regnbue) m.color.setHSL((this.t * 0.2) % 1, 0.75, 0.72);
    const k = this.def.skala || 1;
    this.model.scale.setScalar(k);
    this.model.position.copy(this.pos);
    this.model.rotation.set(0, this.yaw, 0);
    const top = this.pos.y + this.højde * k;
    this.mærke.position.set(this.pos.x, top + 0.55 + Math.sin(this.t * 2.5) * 0.06, this.pos.z);
    if (this.emoji) {
      this.emojiTid -= dt;
      const pop = Math.min(1, (2.8 - this.emojiTid) * 6);
      this.emoji.scale.setScalar(1.1 * pop);
      this.emoji.position.set(this.pos.x, top + 1.5 + (2.8 - this.emojiTid) * 0.15, this.pos.z);
      this.emoji.material.opacity = Math.min(1, this.emojiTid * 2);
      if (this.emojiTid <= 0) { this.scene.remove(this.emoji); this.emoji.material.map.dispose(); this.emoji.material.dispose(); this.emoji = null; }
    }
  }

  fjern() {
    this.scene.remove(this.model, this.mærke);
    if (this.emoji) this.scene.remove(this.emoji);
    this.model.traverse(c => { if (c.material) c.material.dispose(); });
    this.mærke.material.map.dispose(); this.mærke.material.dispose();
  }
}

function hash(s) { let h = 7; for (const c of String(s)) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return h; }
