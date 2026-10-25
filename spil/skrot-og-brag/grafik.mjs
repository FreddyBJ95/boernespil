// ===== Skrot & Brag: den solrige legeplads, kameraet og tegningen af alle fysikdele =====
import * as T from '../3d-faelles/three.module.js';
import { lavHimmel, detaljer } from '../3d-faelles/pynt.js';
import { Effekter } from './effekter.mjs';
import * as M from './modeller.mjs';

// Samme tilfældige landskab hver gang, så træerne ikke hopper rundt mellem forsøg.
function frø(start) {
  let s = start;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BILDELE = ['bil', 'hjul', 'front'];

export class Grafik {
  constructor(canvas) {
    const lille = matchMedia('(pointer: coarse)').matches;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, lille ? 1.5 : 1.75));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.scene = new T.Scene();
    this.scene.background = new T.Color('#bfe3ff');
    this.scene.fog = new T.Fog('#cfeaff', 110, 330);
    this.scene.add(lavHimmel({ top: '#3f8cff', horisont: '#d4edff', bund: '#d4edff', sol: [-.35, .5, -.8], solFarve: '#fff3d1', solStyrke: 1.3, dis: .3, skyer: .42 }));
    this.kamera = new T.PerspectiveCamera(36, 1, .5, 700);

    // Blød himmel ovenfra, varm sol fra venstre, og skygger der følger kameraet.
    this.scene.add(new T.HemisphereLight('#e3f2ff', '#86b964', 1.5));
    this.sol = new T.DirectionalLight('#fff0d4', 2.5);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(lille ? 1024 : 2048, lille ? 1024 : 2048);
    Object.assign(this.sol.shadow.camera, { left: -34, right: 34, top: 30, bottom: -10, near: 1, far: 140 });
    this.sol.shadow.bias = -.0005;
    this.sol.shadow.normalBias = .04;
    this.scene.add(this.sol, this.sol.target);

    this.mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .62, metalness: 0 });
    this.geometrier = new Map();
    this.verden = new T.Group();
    this.scene.add(this.verden);
    this.landskab();
    this.garagePynt = this.lavGarage();
    this.effekter = new Effekter(this.scene);
    this.meshes = [];
    this.kameraX = 6;
    this.kameraY = 3;
    this.kameraD = 26;
    this.tid = 0;
    this.udstødningsTid = 0;
    this.størrelse();
  }

  // Geometrier gemmes, så et nyt forsøg genbruger husene i stedet for at bygge dem forfra.
  geometri(nøgle, lav) {
    if (!this.geometrier.has(nøgle)) this.geometrier.set(nøgle, lav());
    return this.geometrier.get(nøgle);
  }

  mesh(geo, gruppe, skygge = true) {
    const m = new T.Mesh(geo, this.mat);
    m.castShadow = skygge;
    m.receiveShadow = true;
    gruppe.add(m);
    return m;
  }

  // ---------- Det faste landskab ----------
  landskab() {
    const græs = new T.MeshStandardMaterial({ color: '#86d05f', roughness: 1 });
    detaljer(græs, 'græs', { styrke: .22, bump: .35, skala: .6 });
    const jord = new T.Mesh(new T.PlaneGeometry(700, 420).rotateX(-Math.PI / 2), græs);
    jord.position.set(50, -.04, -120);
    jord.receiveShadow = true;
    this.scene.add(jord);
    const asfalt = new T.MeshStandardMaterial({ color: '#9aa3b5', roughness: .95 });
    detaljer(asfalt, 'asfalt', { styrke: .16, bump: .3 });
    const vej = new T.Mesh(new T.BoxGeometry(132, .1, 6.8), asfalt);
    vej.position.set(48, -.05, 0);
    vej.receiveShadow = true;
    this.scene.add(vej);

    const r = frø(7), f = new M.Form();
    // Kantsten i rødt og hvidt, hvide kantlinjer og en stiplet midterstribe
    for (let x = -18; x < 114; x += 1) for (const z of [-3.55, 3.55]) f.kasse(Math.round(x) % 2 ? '#ff595e' : '#ffffff', [x + .5, .06, z], [1, .2, .32]);
    for (const z of [-3.05, 3.05]) f.kasse('#ffffff', [48, .005, z], [132, .01, .14]);
    for (let x = -14; x < 112; x += 4) f.kasse('#ffd23f', [x, .005, 0], [2, .01, .16]);
    // Ternet startlinje
    for (let i = 0; i < 2; i++) for (let k = 0; k < 9; k++) f.kasse((i + k) % 2 ? '#262a33' : '#ffffff', [-.4 + i * .5, .008, -3 + k * .75 + .375], [.5, .012, .75]);
    // Et hvidt stakit bag vejen
    for (let x = -30; x < 130; x += 1.3) f.kasse('#ffffff', [x, .55, -6.2], [.16, 1.1, .12], .04);
    for (const y of [.4, .85]) f.kasse('#ffffff', [50, y, -6.2], [160, .12, .07]);
    // Træer med runde kroner bag stakittet
    for (let i = 0; i < 46; i++) {
      const x = -36 + i * 3.8 + r() * 2.5, z = -9.5 - r() * 22, h = 1.6 + r() * 1.4, k = 1.6 + r() * 1.3;
      const grøn = ['#4caf50', '#5cc35f', '#3e9c4a', '#7bd66b'][i % 4];
      f.cylinder('#8d5a3b', [x, h / 2, z], .28, h, undefined, 8);
      f.kugle(grøn, [x, h + k * .7, z], k);
      f.kugle(blandet(grøn), [x + k * .55, h + k * .45, z + .3], k * .7);
      if (i % 3 === 0) f.kugle('#ff595e', [x - k * .5, h + k * .9, z + k * .7], .18);
    }
    // Blomster og små buske foran vejen
    for (let i = 0; i < 80; i++) {
      const x = -30 + r() * 150, z = 5 + r() * 9;
      if (i % 4 === 0) f.kugle('#5cc35f', [x, .3, z], [.9, .55, .7]);
      else {
        f.cylinder('#4caf50', [x, .15, z], .03, .3, undefined, 5);
        f.kugle(['#ff595e', '#ffca3a', '#ffffff', '#ff70a6', '#9b5de5'][i % 5], [x, .33, z], .13);
      }
    }
    // Store, bløde bakker i horisonten
    for (let i = 0; i < 12; i++) {
      const x = -90 + i * 26 + r() * 10, z = -75 - r() * 60, b = 22 + r() * 26;
      f.kugle(['#7bc65a', '#6bb84d', '#8fd36a'][i % 3], [x, -2, z], [b, 8 + r() * 14, b * .7]);
    }
    // Hvide skyer
    for (let i = 0; i < 7; i++) {
      const x = -40 + i * 30 + r() * 12, y = 34 + r() * 16, z = -95 - r() * 30;
      for (let k = 0; k < 5; k++) f.kugle('#ffffff', [x + (k - 2) * 3.4, y + Math.sin(k * 1.3) * 1.2, z + r() * 2], 2.6 + r() * 2.2);
    }
    // Garagen ved starten og høballer ved vejens ende
    f.kasse('#ff595e', [-12, 2.4, 0], [6.5, 4.8, 7.6], .12);
    f.kasse('#ffffff', [-8.7, 1.8, 0], [.2, 3.6, 5.2], .05);
    f.kasse('#ffe8c2', [-8.62, 1.75, 0], [.1, 3.3, 4.8]);
    for (let i = 0; i < 6; i++) f.kasse('#f0d09b', [-8.55, .4 + i * .55, 0], [.06, .08, 4.8]);
    f.læg(rundTag(), '#3a86ff', [-12, 4.8, 0]);
    for (let i = 0; i < 3; i++) for (let k = 0; k <= i; k++) f.cylinder('#f2c94c', [107 + i * .2, 2.6 - i * .95, -1.8 + k * 1.8 + (2 - i) * .9], .95, 1.6, [Math.PI / 2, 0, 0], 14);
    const pynt = this.mesh(f.færdig(), this.scene);
    pynt.castShadow = true;
  }

  // Podiet og lidt værkstedsrod omkring bilen i garagen.
  lavGarage() {
    const g = new T.Group(), f = new M.Form();
    f.cylinder('#ffffff', [3, -.08, 0], 4.6, .2, undefined, 40);
    f.cylinder('#ffca3a', [3, -.12, 0], 4.75, .16, undefined, 40);
    for (let i = 0; i < 12; i++) {
      const v = i / 12 * Math.PI * 2;
      f.kasse(i % 2 ? '#ff595e' : '#3a86ff', [3 + Math.cos(v) * 4.2, .03, Math.sin(v) * 4.2], [.5, .02, .5], 0, [0, -v, 0]);
    }
    for (const [x, z] of [[-3.4, 2.6], [9.6, 2.2], [10.4, -2.6]]) {
      f.kegle('#ff7a1f', [x, .55, z], .42, 1.1);
      f.cylinder('#ffffff', [x, .55, z], .27, .16, undefined, 14);
      f.kasse('#ff7a1f', [x, .04, z], [1, .08, 1], .03);
    }
    for (let i = 0; i < 3; i++) f.læg(dækstak(), '#2a2f3a', [-3.2, .25 + i * .5, -2.4]);
    f.kasse('#ff595e', [9.4, .45, -.2], [1.4, .9, .8], .1);
    f.kasse('#262a33', [9.4, 1.0, -.2], [.8, .12, .14], .05);
    this.mesh(f.færdig(), g);
    this.scene.add(g);
    return g;
  }

  // ---------- Fysikdelene ----------
  byg(sim) {
    this.verden.clear();
    this.effekter.nulstil();
    this.meshes = [];
    this.sim = sim;
    this.bragFokus = null;
    const bil = sim.bil, bilNøgle = JSON.stringify(bil);
    for (const d of sim.dele) {
      let geo = null;
      if (d.type === 'bil') geo = this.geometri(`bil${bilNøgle}`, () => M.bilKrop(bil));
      else if (d.type === 'hjul') geo = this.geometri(`hjul${d.radius}|${bil.hjul}|${bil.farve}`, () => M.hjul(d.radius, bil.hjul, bil.farve));
      else if (d.type === 'front') geo = this.geometri(`front${d.slags}`, () => M.front(d));
      else if (d.type === 'celle') geo = this.geometri(`celle${d.slags}`, () => M.celle(d.slags));
      else if (d.type === 'mur') geo = this.geometri(`mur${d.udseende}|${d.husnr}|${d.b}`, () => M.mur(d));
      else if (d.type === 'bjælke') geo = this.geometri(`bj${d.udseende}|${d.husnr}|${d.b}|${d.etage ? 1 + d.etage % 6 : 0}`, () => M.bjælke(d));
      else if (d.type === 'tag') geo = this.geometri(`tag${d.udseende}|${d.husnr}|${d.b}|${d.h}`, () => M.tag(d));
      else if (d.type === 'klods') geo = this.geometri(`kl${d.udseende}|${d.farvenr}|${d.b.toFixed(2)}|${d.h}|${d.id % 3}`, () => M.klods(d));
      else if (d.type === 'rampe') geo = this.geometri('rampe', () => M.rampe(d));
      if (!geo) continue;
      const g = new T.Group();
      this.mesh(geo, g);
      if (d.type === 'celle' && d.slags !== 'tnt') {
        const skilt = new T.Mesh(this.geometri('skilt', () => new T.PlaneGeometry(.5, .5)), this.skiltMat(d.slags));
        skilt.position.z = .475;
        g.add(skilt);
      }
      this.verden.add(g);
      this.meshes.push({ d, g });
    }
    this.opdater(0, 'garage');
  }

  skiltMat(slags) {
    this.skilte ??= new Map();
    if (!this.skilte.has(slags)) this.skilte.set(slags, new T.MeshStandardMaterial({ map: M.mærke(slags), transparent: true, alphaTest: .4, roughness: .6 }));
    return this.skilte.get(slags);
  }

  størrelse() {
    this.bredde = innerWidth;
    this.højde = innerHeight;
    this.renderer.setSize(this.bredde, this.højde, false);
    this.kamera.aspect = this.bredde / this.højde;
    this.kamera.updateProjectionMatrix();
  }

  // Et punkt i verden omregnet til skærmens pixels, så tegneserieboblerne kan sidde ved braget.
  tilSkærm(p) {
    const v = new T.Vector3(p.x, p.y, p.z || 0).project(this.kamera);
    return { x: (v.x + 1) / 2 * this.bredde, y: (1 - v.y) / 2 * this.højde, synlig: v.z < 1 };
  }

  // fri: den del af skærmen, som knapperne ikke dækker. Kameraet centrerer billedet dér.
  kameraFor(dt, garage) {
    const w = this.bredde, h = this.højde, fri = this.fri || { x: w / 2, y: h / 2, b: w, h };
    const tan = Math.tan(T.MathUtils.degToRad(this.kamera.fov / 2));
    const p = this.sim.chassis.krop.translation();
    const blød = 1 - Math.exp(-dt * (garage ? 6 : 3));
    let cx, cy, synH;
    if (garage) {
      cx = p.x + .3;
      cy = p.y - .1;
      synH = Math.max(5.2 / (fri.h / h), 10.5 / (fri.b / w) / this.kamera.aspect) / .68;
    } else {
      const mål = this.sim.mål, fokus = this.bragFokus && this.sim.tid - this.bragFokus.tid < 6 ? this.bragFokus : null;
      let fra = p.x - 5, til = p.x + 15, top = 7;
      // Tæt på målet vises hele huset. Efter sammenstødet bliver kameraet ved huset,
      // og bilen er kun med, hvis den stadig er i nærheden.
      if (p.x > mål.fra - 22 || fokus || this.sim.bumpet) {
        const nær = p.x > mål.fra - 16 && p.x < mål.til + 12;
        fra = Math.min(nær || !this.sim.bumpet ? p.x - 4 : mål.fra - 3, mål.fra - 3);
        til = Math.max(nær ? p.x + 6 : mål.til + 4, mål.til + 4);
        top = mål.højde + 1.5;
      }
      if (fokus) {
        fra = Math.min(fra, fokus.x - 8);
        til = Math.max(til, fokus.x + 8);
        top = Math.max(top, Math.min(fokus.y + 5, 34));
      }
      fra = Math.max(-12, fra);
      til = Math.min(112, til);
      // På en smal skærm på højkant må siderne beskæres lidt, så bilen ikke bliver for lille.
      const bredde = (til - fra) * (this.kamera.aspect < 1 ? .86 : 1);
      cx = (fra + til) / 2;
      synH = Math.max(top + 1.5, bredde / this.kamera.aspect / (fri.b / w) * (fri.h / h)) / (fri.h / h);
      // Vejen lægges nederst i det frie felt, så der er himmel over huset i stedet for græs under.
      cy = Math.max(top / 2 - .2, synH * (fri.h / h) / 2 - 2.2);
    }
    const D = synH / 2 / tan;
    this.kameraX += (cx - this.kameraX) * blød;
    this.kameraY += (cy - this.kameraY) * blød;
    this.kameraD += (D - this.kameraD) * blød;
    const r = this.effekter.ryst, ryst = () => (Math.random() - .5) * r;
    if (garage) {
      const v = Math.sin(this.tid * .3) * .5 + .25;
      this.kamera.position.set(this.kameraX + Math.sin(v) * this.kameraD, this.kameraY + this.kameraD * .26, Math.cos(v) * this.kameraD);
    } else {
      this.kamera.position.set(this.kameraX - this.kameraD * .16 + ryst(), this.kameraY + this.kameraD * .2 + ryst(), this.kameraD);
    }
    this.kamera.lookAt(this.kameraX + ryst(), this.kameraY + ryst(), 0);
    this.kamera.setViewOffset(w, h, w / 2 - fri.x, h / 2 - fri.y, w, h);
    this.sol.target.position.set(this.kameraX + 4, 0, 0);
    this.sol.position.set(this.kameraX - 18, 36, 26);
  }

  opdater(dt, tilstand, { boost = false, gas = 0 } = {}) {
    if (!this.sim) return;
    this.tid += dt;
    const garage = tilstand === 'garage';
    for (const { d, g } of this.meshes) {
      const p = d.krop.translation(), q = d.krop.rotation();
      g.position.set(p.x, p.y, p.z);
      g.quaternion.set(q.x, q.y, q.z, q.w);
      if (d.lokal) {
        g.position.add(new T.Vector3(d.lokal.x, d.lokal.y, 0).applyQuaternion(g.quaternion));
        g.rotateZ(-p.x / d.radius);
      }
      g.visible = !d.sprængt && (!garage || BILDELE.includes(d.type) || d.last);
    }
    this.garagePynt.visible = garage;
    this.kameraFor(dt, garage);
    if (!garage) this.bilEffekter(dt, boost, gas);
    this.effekter.pas(dt);
    this.renderer.render(this.scene, this.kamera);
  }

  // Flammer fra raketten ved boost og små røgpuffer fra udstødningen.
  bilEffekter(dt, boost, gas) {
    const krop = this.sim.chassis.krop, p = krop.translation(), q = krop.rotation();
    const bag = new T.Vector3(this.sim.bil.motor === 'raket' ? -4.1 : -3, this.sim.bil.motor === 'raket' ? .08 : -.1, 0)
      .applyQuaternion(new T.Quaternion(q.x, q.y, q.z, q.w));
    const punkt = { x: p.x + bag.x, y: p.y + bag.y, z: 0 };
    if (boost) this.effekter.boost(punkt);
    this.udstødningsTid -= dt;
    if (gas && this.udstødningsTid <= 0) {
      this.udstødningsTid = .12;
      this.effekter.udstødning({ x: punkt.x, y: punkt.y + .2, z: -.8 });
    }
  }
}

function blandet(farve) {
  return M.blandFarve(farve, '#ffffff', .18);
}

// Garagens tag og bunken af dæk bruges kun én gang og skal ikke gemmes.
function rundTag() {
  const g = new T.CylinderGeometry(3.9, 3.9, 7.8, 20, 1, false, 0, Math.PI);
  g.rotateX(Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.scale(1, .45, 1);
  g.deleteAttribute('uv');
  return g;
}

function dækstak() {
  const g = new T.TorusGeometry(.6, .26, 10, 20);
  g.rotateX(Math.PI / 2);
  g.deleteAttribute('uv');
  return g;
}
