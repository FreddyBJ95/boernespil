import * as T from '../3d-faelles/three.module.js';

export const FARVER = { benzin: '#ff9e45', tnt: '#ff6857', gas: '#8dff71', blaa: '#5cdbff', lilla: '#c28aff' };

// Små delte teksturer giver blød røg og lys uden eksterne billedfiler.
function tekstur(røg) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, røg ? 'rgba(220,225,235,.45)' : '#fff');
  g.addColorStop(.25, røg ? 'rgba(180,190,210,.3)' : 'rgba(255,255,255,.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

export class Effekter {
  constructor(scene) {
    this.gruppe = new T.Group();
    scene.add(this.gruppe);
    this.lys = tekstur(false);
    this.røg = tekstur(true);
    this.dele = [];
    this.ryst = 0;
    this.rolig = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ringForm = new T.TorusGeometry(1, .025, 5, 64);
  }

  partikel(p, farve, røg = false, fart = 7) {
    if (this.dele.length >= 260) return;
    const mat = new T.SpriteMaterial({ map: røg ? this.røg : this.lys, color: farve, transparent: true, depthWrite: false,
      blending: røg ? T.NormalBlending : T.AdditiveBlending, toneMapped: false });
    const mesh = new T.Sprite(mat);
    mesh.position.set(p.x, p.y, 1 + Math.random() * 2);
    this.gruppe.add(mesh);
    const vinkel = Math.random() * Math.PI * 2, styrke = Math.random() * fart;
    const d = { mesh, vx: Math.cos(vinkel) * styrke, vy: Math.sin(vinkel) * styrke + (røg ? 3 : 2),
      tid: 0, liv: røg ? 2.5 + Math.random() * 2 : .4 + Math.random() * .9, størrelse: røg ? 2 + Math.random() * 3 : .3 + Math.random() * 1.4, røg };
    this.dele.push(d);
    return d;
  }

  ring(p, farve) {
    if (this.dele.length >= 260) return;
    const mesh = new T.Mesh(this.ringForm, new T.MeshBasicMaterial({ color: farve, transparent: true, opacity: .9, depthWrite: false }));
    mesh.position.set(p.x, p.y, 2);
    this.gruppe.add(mesh);
    this.dele.push({ mesh, tid: 0, liv: .7, ring: true });
  }

  hændelse(e) {
    if (e.type === 'brag' || e.type === 'efterslag') {
      const farve = FARVER[e.slags];
      for (let i = 0; i < (this.rolig ? 12 : 30); i++) this.partikel(e.p, i % 7 ? farve : '#fff1cf', false, 13);
      // Store farvede ildtunger bliver hængende, mens røgen stiger over dem.
      for (let i = 0; i < 9; i++) {
        const flamme = this.partikel({ x: e.p.x + (Math.random() - .5) * 3, y: e.p.y }, farve, false, 3);
        if (!flamme) break;
        flamme.størrelse = 3 + Math.random() * 5;
        flamme.liv = e.slags === 'gas' ? 2.2 : 1.5;
        flamme.vy = 3 + Math.random() * 4;
        flamme.flamme = true;
        flamme.mesh.material.blending = T.NormalBlending;
      }
      for (let i = 0; i < 15; i++) this.partikel(e.p, i % 4 ? '#505865' : farve, true, 6);
      this.ring(e.p, farve);
      if (!this.rolig) this.ryst = Math.min(.28, this.ryst + .17);
    } else if (e.type === 'slag' && e.styrke > .12) {
      for (let i = 0; i < 3; i++) this.partikel(e.p, '#b4b1a8', true, 3);
      if (e.styrke > .6 && !this.rolig) this.ryst = Math.max(this.ryst, .07);
    } else if (e.type === 'lunte') {
      for (let i = 0; i < 5; i++) this.partikel(e.p, FARVER[e.slags], false, 2);
    }
  }

  boost(p) {
    this.partikel({ x: p.x - 3, y: p.y + .5 }, '#76dfff', false, 2);
  }

  pas(dt) {
    this.ryst *= Math.exp(-dt * 7);
    for (let i = this.dele.length - 1; i >= 0; i--) {
      const d = this.dele[i];
      d.tid += dt;
      const andel = d.tid / d.liv;
      if (andel >= 1) {
        this.gruppe.remove(d.mesh);
        d.mesh.material.dispose();
        this.dele.splice(i, 1);
        continue;
      }
      d.mesh.material.opacity = (1 - andel) * (d.røg ? .65 : .95);
      if (d.ring) d.mesh.scale.setScalar(.4 + andel * 13);
      else {
        d.mesh.position.x += d.vx * dt;
        d.mesh.position.y += d.vy * dt;
        d.vx *= Math.exp(-dt * (d.røg ? 1.2 : 2));
        d.vy += (d.røg ? 1 : -6) * dt;
        d.mesh.scale.setScalar(d.størrelse * (d.røg ? .7 + andel * 2 : 1 - andel * .5));
        if (d.flamme) {
          d.mesh.scale.x *= .65 + Math.sin(d.tid * 18) * .12;
          d.mesh.scale.y *= 1.3;
        }
      }
    }
  }

  nulstil() {
    for (const d of this.dele) {
      this.gruppe.remove(d.mesh);
      d.mesh.material.dispose();
    }
    this.dele = [];
    this.ryst = 0;
  }
}
