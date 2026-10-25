// ===== Tegneserie-brag i dagslys =====
// Runde røgpuffer vokser hurtigt og skrumper væk igen, så der aldrig skal sorteres gennemsigtighed.
// Konfetti drysser ned, og en farvet ring viser trykbølgen. Alt deler få materialer.
import * as T from '../3d-faelles/three.module.js';
import { LASTFARVER } from './modeller.mjs';

const KONFETTI = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff70a6', '#ffffff'];
const MAKS = 240;

export class Effekter {
  constructor(scene) {
    this.gruppe = new T.Group();
    scene.add(this.gruppe);
    this.pufForm = new T.IcosahedronGeometry(1, 2);
    this.flageForm = new T.BoxGeometry(.34, .2, .03);
    this.ringForm = new T.TorusGeometry(1, .07, 6, 48);
    this.materialer = new Map();
    this.dele = [];
    this.ryst = 0;
    this.rolig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Røg får lys og skygge fra solen; ild gløder lidt af sig selv, men er stadig rund at se på.
  materiale(farve, lys = false) {
    const nøgle = `${farve}/${lys}`;
    if (!this.materialer.has(nøgle)) this.materialer.set(nøgle, lys
      ? new T.MeshStandardMaterial({ color: farve, emissive: farve, emissiveIntensity: .55, roughness: .7 })
      : new T.MeshStandardMaterial({ color: farve, roughness: .9, side: T.DoubleSide }));
    return this.materialer.get(nøgle);
  }

  // Én puf: en kugle, der flyver, vokser og skrumper. op > 0 får røg til at stige.
  puf(p, farve, { fart = 4, liv = 1, størrelse = 1, op = 1, lys = false, z = 0 } = {}) {
    if (this.dele.length >= MAKS) return null;
    const mesh = new T.Mesh(this.pufForm, this.materiale(farve, lys));
    mesh.position.set(p.x, p.y, (p.z || 0) + z + (Math.random() - .5) * 1.4);
    mesh.scale.setScalar(.01);
    this.gruppe.add(mesh);
    const v = Math.random() * Math.PI * 2, s = (.3 + Math.random() * .7) * fart;
    const d = { mesh, vx: Math.cos(v) * s, vy: Math.sin(v) * s * .8, vz: (Math.random() - .5) * fart * .4, op, tid: 0, liv: liv * (.75 + Math.random() * .5), størrelse: størrelse * (.7 + Math.random() * .6) };
    this.dele.push(d);
    return d;
  }

  konfetti(p, antal) {
    for (let i = 0; i < antal && this.dele.length < MAKS; i++) {
      const mesh = new T.Mesh(this.flageForm, this.materiale(KONFETTI[i % KONFETTI.length]));
      mesh.position.set(p.x, p.y, (Math.random() - .5) * 2);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.gruppe.add(mesh);
      const v = Math.random() * Math.PI, s = 6 + Math.random() * 9;
      this.dele.push({ mesh, flage: true, vx: Math.cos(v) * s, vy: Math.sin(v) * s + 4, vz: (Math.random() - .5) * 6,
        spin: (Math.random() - .5) * 18, tid: 0, liv: 2.2 + Math.random() * 1.2 });
    }
  }

  ring(p, farve) {
    if (this.dele.length >= MAKS) return;
    const mesh = new T.Mesh(this.ringForm, new T.MeshBasicMaterial({ color: farve, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }));
    mesh.position.set(p.x, p.y, 2.2);
    this.gruppe.add(mesh);
    this.dele.push({ mesh, ring: true, tid: 0, liv: .65 });
  }

  hændelse(e) {
    const færre = this.rolig ? .45 : 1;
    if (e.type === 'brag' || e.type === 'efterslag') {
      const farve = LASTFARVER[e.slags] || '#ff8a1f';
      const lys = new T.Color(farve).lerp(new T.Color('#fff6b0'), .45).getStyle();
      for (let i = 0; i < 8 * færre; i++) this.puf(e.p, i % 3 ? farve : lys, { lys: true, fart: 5, liv: .55, størrelse: 1.6, op: 0 });
      for (let i = 0; i < 11 * færre; i++) this.puf(e.p, i % 3 ? '#f4f4f6' : '#d7dbe2', { fart: 6, liv: 1.8, størrelse: 1.5, op: 2.2 });
      if (e.slags === 'gas') for (let i = 0; i < 8 * færre; i++) this.puf(e.p, '#8fe38f', { fart: 7, liv: 2.6, størrelse: 1.8, op: .6 });
      this.konfetti(e.p, Math.round(16 * færre));
      this.ring(e.p, farve);
      if (!this.rolig) this.ryst = Math.min(.45, this.ryst + .25);
    } else if (e.type === 'hvirvel') {
      for (let i = 0; i < 12 * færre; i++) {
        const v = i / 12 * Math.PI * 2;
        const d = this.puf({ x: e.p.x + Math.cos(v) * 5, y: e.p.y + Math.sin(v) * 5 }, '#c79bff', { fart: 0, liv: .7, størrelse: .7, op: 0 });
        if (d) { d.vx = -Math.cos(v) * 7 - Math.sin(v) * 5; d.vy = -Math.sin(v) * 7 + Math.cos(v) * 5; }
      }
    } else if (e.type === 'bump') {
      for (let i = 0; i < 7 * færre; i++) this.puf({ x: e.p.x + 3.5, y: e.p.y }, '#e9dcc3', { fart: 5, liv: .9, størrelse: .9, op: 1 });
      if (!this.rolig) this.ryst = Math.max(this.ryst, .22);
    } else if (e.type === 'slag' && e.styrke > .15) {
      for (let i = 0; i < 2; i++) this.puf(e.p, '#e9dcc3', { fart: 2.5, liv: .8, størrelse: .55 + e.styrke * .5, op: .8 });
      if (e.styrke > .6 && !this.rolig) this.ryst = Math.max(this.ryst, .08);
    } else if (e.type === 'lunte') {
      for (let i = 0; i < 4; i++) this.puf(e.p, i % 2 ? '#ffd23f' : '#ffffff', { lys: true, fart: 3, liv: .35, størrelse: .22, op: 0 });
    }
  }

  // Ildflammer bag raketten og små udstødningspuffer, mens bilen kører.
  boost(p) {
    for (let i = 0; i < 2; i++) this.puf(p, i ? '#ffd23f' : '#ff7a1f', { lys: true, fart: 1.5, liv: .3, størrelse: .55, op: 0 });
  }

  udstødning(p) {
    this.puf(p, '#e4e7ee', { fart: .6, liv: .55, størrelse: .2, op: 1.4 });
  }

  pas(dt) {
    this.ryst *= Math.exp(-dt * 8);
    for (let i = this.dele.length - 1; i >= 0; i--) {
      const d = this.dele[i];
      d.tid += dt;
      const andel = d.tid / d.liv;
      if (andel >= 1) {
        this.gruppe.remove(d.mesh);
        if (d.ring) d.mesh.material.dispose();
        this.dele.splice(i, 1);
        continue;
      }
      if (d.ring) {
        d.mesh.scale.setScalar(.5 + andel * 12);
        d.mesh.material.opacity = .9 * (1 - andel);
        continue;
      }
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      if (d.flage) {
        // Konfetti falder og vender, mens luften bremser den.
        d.vy -= 14 * dt;
        d.vx *= Math.exp(-dt * 1.5);
        d.vy = Math.max(d.vy, -4);
        d.mesh.rotation.x += d.spin * dt;
        d.mesh.rotation.y += d.spin * .7 * dt;
        if (d.mesh.position.y < .05) { d.mesh.position.y = .05; d.vx = d.vy = d.vz = d.spin = 0; }
        continue;
      }
      d.vx *= Math.exp(-dt * 3);
      d.vy = d.vy * Math.exp(-dt * 3) + d.op * dt * 3;
      d.vz *= Math.exp(-dt * 3);
      // Hurtigt op i størrelse, langsomt ned igen.
      d.mesh.scale.setScalar(Math.max(.01, d.størrelse * Math.sin(Math.PI * Math.pow(andel, .45))));
    }
  }

  nulstil() {
    for (const d of this.dele) {
      this.gruppe.remove(d.mesh);
      if (d.ring) d.mesh.material.dispose();
    }
    this.dele = [];
    this.ryst = 0;
  }
}
