import * as T from '../3d-faelles/three.module.js';
import { Effekter, FARVER } from './effekter.mjs';

export class Grafik {
  constructor(canvas) {
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#121f2b');
    this.scene.fog = new T.Fog('#121f2b', 65, 155);
    this.kamera = new T.PerspectiveCamera(42, 1, .1, 220);
    this.scene.add(new T.HemisphereLight('#bde8ff', '#34353a', 2.6));
    const sol = new T.DirectionalLight('#ffe3b2', 3.2);
    sol.position.set(-20, 35, 20);
    this.scene.add(sol);
    const neon = new T.DirectionalLight('#66d9eb', 1.5);
    neon.position.set(10, 8, -12);
    this.scene.add(neon);
    this.verden = new T.Group();
    this.scene.add(this.verden);
    this.effekter = new Effekter(this.scene);
    this.kasse = new T.BoxGeometry(1, 1, 1);
    this.cylinder = new T.CylinderGeometry(1, 1, 1, 20);
    this.kile = new T.BufferGeometry();
    this.kile.setAttribute('position', new T.Float32BufferAttribute([
      -.5,-.5,-.5, -.5,.5,-.5, .5,-.5,-.5, -.5,-.5,.5, .5,-.5,.5, -.5,.5,.5,
      -.5,.5,-.5, -.5,.5,.5, .5,-.5,.5, -.5,.5,-.5, .5,-.5,.5, .5,-.5,-.5,
      -.5,-.5,-.5, .5,-.5,-.5, .5,-.5,.5, -.5,-.5,-.5, .5,-.5,.5, -.5,-.5,.5,
      -.5,-.5,-.5, -.5,-.5,.5, -.5,.5,.5, -.5,-.5,-.5, -.5,.5,.5, -.5,.5,-.5,
    ], 3));
    this.kile.computeVertexNormals();
    this.materialer = new Map();
    this.meshes = [];
    this.pynt = new T.Group();
    this.scene.add(this.pynt);
    this.kameraX = 3;
    this.kameraY = 2;
    this.tid = 0;
    this.størrelse();
  }

  materiale(farve, metal = .2, lys = false) {
    const nøgle = `${farve}/${metal}/${lys}`;
    if (!this.materialer.has(nøgle)) this.materialer.set(nøgle, new T.MeshStandardMaterial({
      color: farve, metalness: metal, roughness: .65, ...(lys ? { emissive: farve, emissiveIntensity: .8 } : {}),
    }));
    return this.materialer.get(nøgle);
  }

  boks(gruppe, x, y, z, b, h, d, farve, metal = .2, lys = false) {
    const mesh = new T.Mesh(this.kasse, this.materiale(farve, metal, lys));
    mesh.position.set(x, y, z);
    mesh.scale.set(b, h, d);
    gruppe.add(mesh);
    return mesh;
  }

  // Hver synlig etage følger sine fysiske dele, også efter at huset er væltet.
  byg(sim) {
    this.verden.clear();
    this.pynt.clear();
    this.effekter.nulstil();
    this.meshes = [];
    this.sim = sim;
    this.bragFokus = null;
    for (const d of sim.dele) {
      const g = new T.Group();
      this.verden.add(g);
      this.meshes.push({ d, g });
      if (d.type === 'hjul') this.hjul(g, d.radius, sim.bil.farve);
      else if (d.type === 'bil') this.bil(g, sim.bil);
      else if (d.type === 'celle') this.celle(g, d.slags);
      else if (d.type === 'front') {
        if (d.slags === 'plov') {
          const plov = new T.Mesh(this.kile, this.materiale('#a7b4b6', .8));
          plov.scale.set(d.b, d.h, 2.5);
          g.add(plov);
        } else {
          this.boks(g, 0, 0, 0, d.b, d.h, 2.5, '#a7b4b6', .8);
          for (let i = 0; i < (d.slags === 'let' ? 1 : 3); i++) this.boks(g, .55, -.3 + i * .3, 0, .15, .08, 2.65, '#f5cc4c');
        }
      } else if (d.type === 'mur') {
        this.boks(g, 0, 0, 0, d.b, d.h, 3.4, d.etage % 3 ? '#6d8992' : '#a2b0ab');
        this.boks(g, 0, 0, 1.73, d.b * .5, d.h * .8, .05, '#bdd3c3');
      } else if (d.type === 'bjælke') {
        this.boks(g, 0, 0, 0, d.b, d.h, 3.5, '#c1b59c');
        for (let i = 0; i < 4; i++) {
          this.boks(g, -1.95 + i * 1.3, -.78, -1.5, 1.16, 1.35, .07, d.etage % 3 ? '#294859' : '#386073');
          this.boks(g, -1.95 + i * 1.3, -.65, -1.43, .84, .06, .07, '#74a9af', .2, true);
        }
        this.boks(g, 0, .16, 1.85, d.b, .1, .1, '#79c5b9', .2, true);
      } else if (d.type === 'domino') {
        this.boks(g, 0, 0, 0, d.b, d.h, 2.5, d.farve);
        this.boks(g, 0, .2, 1.28, d.b + .02, .12, .06, '#243646');
        for (const y of [-1.15, -.65, .8, 1.3]) this.boks(g, 0, y, 1.29, .15, .15, .05, '#243646');
      } else if (d.type === 'rampe') {
        this.boks(g, 0, 0, 0, d.b, d.h, 4, '#d6a441');
        for (let i = -4; i < 5; i++) this.boks(g, i, .34, 0, .12, .03, 4, '#293640');
      } else this.boks(g, 0, 0, 0, d.b, d.h, 16, '#273a42');
    }
    // Striber, lygtepæle og bjerge gør prøveområdet tydeligt uden flere fysikdele.
    for (let x = -4; x < 105; x += 4) this.boks(this.pynt, x, .015, 3.6, 1.8, .035, .12, '#b8b38e');
    for (let x = 15; x < 105; x += 18) {
      this.boks(this.pynt, x, 4, -6, .15, 8, .15, '#526a73');
      this.boks(this.pynt, x + .8, 8, -6, 1.8, .15, .35, '#ffe3a1', .2, true);
    }
    for (let i = 0; i < 12; i++) this.boks(this.pynt, i * 17 - 30, 2, -22 - i % 3 * 8, 12, 7 + i % 4 * 4, 8, '#1b303e');
    this.opdater(0, true);
  }

  hjul(g, radius, farve) {
    // To synlige dæk deler én kugleformet kollisionskrop i køreplanet.
    for (const z of [-1.35, 1.35]) {
      const dæk = new T.Mesh(this.cylinder, this.materiale('#17242d'));
      dæk.rotation.x = Math.PI / 2;
      dæk.scale.set(radius, .55, radius);
      dæk.position.z = z;
      g.add(dæk);
      const fælg = new T.Mesh(this.cylinder, this.materiale(farve, .7));
      fælg.rotation.x = Math.PI / 2;
      fælg.scale.set(radius * .5, .58, radius * .5);
      fælg.position.z = z;
      g.add(fælg);
      for (let i = 0; i < 12; i++) {
        const v = i * Math.PI / 6;
        const slid = this.boks(g, Math.sin(v) * radius, Math.cos(v) * radius, z, .22, .14, .6, '#2e3d43');
        slid.rotation.z = -v;
      }
    }
  }

  bil(g, bil) {
    this.boks(g, 0, 0, 0, 5.6, .65, 2.5, bil.farve, .5);
    this.boks(g, 1.8, .8, 0, 1.35, 1.3, 2.2, bil.farve);
    this.boks(g, 1.85, .95, 1.12, .9, .65, .05, '#164456', .6);
    this.boks(g, 2.5, .95, 0, .05, .62, 1.9, '#78d7e1', .6);
    this.boks(g, .9, .6, 1.28, .1, 1.5, .12, '#253b45');
    this.boks(g, -2.5, .65, 0, .12, .8, 2.3, '#5d747b');
    this.boks(g, 2.84, -.04, .9, .08, .25, .35, '#fff3bf', .2, true);
    this.boks(g, 2.84, -.04, -.9, .08, .25, .35, '#fff3bf', .2, true);
    this.boks(g, -1, -.42, 0, 3.1, .25, 1.3, '#172831');
    if (bil.motor === 'raket') {
      this.boks(g, -2.55, .4, 0, 1.2, .6, 1.1, '#a8b9ba', .8);
      this.boks(g, -3.2, .4, 0, .15, .5, .8, '#6bdfff', .2, true);
    }
    for (const x of [-2, -1, 0]) this.boks(g, x, 0, 1.27, .5, .12, .05, '#172b32');
  }

  celle(g, slags) {
    const farve = FARVER[slags];
    if (slags === 'tnt') {
      this.boks(g, 0, 0, 0, .85, 1.4, 1, '#ad5149');
      this.boks(g, 0, 0, .52, .7, .4, .04, '#ffe4ac');
      this.boks(g, 0, .5, .53, .85, .12, .04, '#493f3c');
    } else {
      const tønde = new T.Mesh(this.cylinder, this.materiale(slags === 'benzin' ? '#c47740' : '#334c58', .65));
      tønde.scale.set(.45, 1.4, .45);
      g.add(tønde);
      for (const y of [-.48, .48]) {
        const ring = new T.Mesh(this.cylinder, this.materiale(farve, .5, true));
        ring.scale.set(.47, .1, .47);
        ring.position.y = y;
        g.add(ring);
      }
      this.boks(g, 0, 0, .46, .24, .45, .05, farve, .2, true);
    }
  }

  størrelse() {
    this.bredde = innerWidth;
    this.højde = innerHeight;
    this.renderer.setSize(this.bredde, this.højde, false);
    this.kamera.aspect = this.bredde / this.højde;
    this.kamera.updateProjectionMatrix();
  }

  opdater(dt, garage = false, boost = false) {
    this.tid += dt;
    for (const { d, g } of this.meshes) {
      const p = d.krop.translation(), q = d.krop.rotation();
      g.position.copy(p);
      g.quaternion.copy(q);
      if (d.lokal) {
        const lokal = new T.Vector3(d.lokal.x, d.lokal.y, 0).applyQuaternion(g.quaternion);
        g.position.add(lokal);
        g.rotateZ(-p.x / d.radius);
      }
      g.visible = !d.sprængt && (!garage || ['bil', 'hjul', 'front'].includes(d.type) || d.last || d.type === 'jord');
    }
    this.pynt.visible = !garage;
    const p = this.sim.chassis.krop.translation();
    const faktor = 1 - Math.exp(-dt * 4);
    if (garage) {
      const smal = this.bredde < 950;
      const afstand = smal ? 20 : Math.max(18, 27 / this.kamera.aspect);
      this.kamera.position.set(9, 6, afstand);
      this.kamera.lookAt(3, smal ? -1.8 : 1.3, 0);
    } else {
      const fokus = this.bragFokus && this.sim.tid - this.bragFokus.tid < 7 ? this.bragFokus : null;
      const husX = 28 + this.sim.bane.domino * 2.35;
      const tætPåHus = Math.abs(p.x - husX) < 27 || fokus || this.overblik;
      const målX = this.overblik ? husX + 6 : fokus ? fokus.x : p.x + 7;
      const målY = tætPåHus ? this.sim.bane.højde * .78 : Math.max(3, p.y * .5 + 3);
      this.kameraX += (Math.max(4, Math.min(92, målX)) - this.kameraX) * faktor;
      this.kameraY += (Math.max(3, Math.min(22, målY)) - this.kameraY) * faktor;
      const afstand = Math.max(34, tætPåHus ? this.sim.bane.højde * 3.2 : 0, 28 / this.kamera.aspect);
      const r = this.effekter.ryst;
      this.kamera.position.set(this.kameraX - 4 + (Math.random() - .5) * r, this.kameraY + 6, afstand);
      this.kamera.lookAt(this.kameraX, this.kameraY + (Math.random() - .5) * r, 0);
      if (boost) this.effekter.boost(p);
    }
    this.effekter.pas(dt);
    this.renderer.render(this.scene, this.kamera);
  }
}
