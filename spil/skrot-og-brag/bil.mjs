// ===== Bilen i fysikken: en rigtig lastbil på 2,5 ton, der kører ind i Nedrivningsfirmaets bygninger =====
// Karrosseri, førerhus, hjul og front er dele af én krop (ingen fuger), så den er stabil i Rapier.
// Bilen kører i en lige bane langs x. Efter hvert fysiktrin rettes den ind, så den kun kan vippe
// frem og tilbage — resten af verdenen (murbrokker, tønder, glas) flyver frit i alle retninger.
// Lasten står på ladet. Ved sammenstødet flyver den af og springer som Nedrivningsfirmaets sprængstof.
import * as THREE from '../3d-faelles/three.module.js';
import { RAPIER, fysik } from '../nedrivning/fysik.js';
import { SPRÆNGSTOF } from '../nedrivning/sprængstof.js';
import { bygBil, bygHjul, bygFront, AKSEL, SPOR, bundOver } from './bilmodel.mjs';
import { del, START } from './baner.mjs';

const MASSE = 2400;
const tmp = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
const r = (a, b) => a + Math.random() * (b - a);

// Hvor lasten står på ladet (bilens eget rum), for 1, 2 eller 3 stk.
const PLADSER = { 1: [[-1.65, 0]], 2: [[-2.15, -0.42], [-1.2, 0.42]], 3: [[-2.25, -0.45], [-1.6, 0.45], [-1.05, -0.4]] };

export class Bil {
  constructor({ scene, bil, tekstur, sprængstof, modeller }) {
    this.scene = scene; this.bil = bil; this.sprængstof = sprængstof;
    const hjul = del('hjul', bil.hjul), front = del('front', bil.front);
    this.motor = del('motor', bil.motor);
    this.r = hjul.radius;
    this.brændstof = 1;
    this.kørt = false;
    this.bump = null;
    this.ejer = { bil: this };
    this.fartFør = 0;
    this.lavGrafik(bil, hjul, tekstur, modeller);
    this.lavKrop(hjul, front);
  }

  // ---------- Det, man ser ----------
  lavGrafik(bil, hjul, tekstur, modeller) {
    this.gruppe = new THREE.Group();
    this.scene.add(this.gruppe);
    this.model = bygBil(bil, del, tekstur);
    this.gruppe.add(this.model);
    this.hjul = [];
    const zHjul = SPOR + hjul.bred * 0.22;
    for (const x of [-AKSEL, AKSEL]) for (const z of [-zHjul, zHjul]) {
      const w = bygHjul(bil.hjul, hjul.radius, hjul.bred);
      w.position.set(x, 0, z);
      this.gruppe.add(w);
      this.hjul.push(w);
    }
    this.front = bygFront(bil.front, tekstur);
    this.front.position.copy(this.frontSted());
    this.gruppe.add(this.front);
    // Lasten: Nedrivningsfirmaets modeller stillet på ladet
    this.last = [];
    if (bil.last !== 'tom') for (const [x, z] of PLADSER[bil.antal]) {
      const def = SPRÆNGSTOF[bil.last], m = modeller[def.model].clone(true);
      const liggende = bil.last === 'gas';
      m.position.set(x, bundOver(this.r) + 1.04 + (liggende ? def.str[0] / 2 : 0), z);
      if (liggende) m.rotation.set(Math.PI / 2, 0, r(-0.3, 0.3));
      else m.rotation.y = r(0, 6.28);
      this.gruppe.add(m);
      this.last.push({ type: bil.last, def, mesh: m, liggende });
    }
    this.model.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  }

  frontSted() {
    const x = this.bil.front === 'let' ? 2.96 : this.bil.front === 'plov' ? 3.05 : 3.12;
    return new THREE.Vector3(x, bundOver(this.r) + (this.bil.front === 'let' ? 0.2 : 0.42), 0);
  }

  // ---------- Kroppen i fysikken ----------
  lavKrop(hjul, front) {
    const yb = bundOver(this.r);
    this.krop = fysik.verden.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(START, this.r + 0.03, 0)
      .setLinearDamping(0.04).setAngularDamping(0.9).setCcdEnabled(true));
    const lav = (cd, masse, greb = 0.6) => {
      // Hjulene er kugler, der ikke drejer i fysikken: de skal glide let, så kun motoren styrer farten
      if (greb < 0.1) cd.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
      cd.setMass(masse).setFriction(greb).setRestitution(0.05)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(MASSE * 9.81 * 1.5);
      const k = fysik.verden.createCollider(cd, this.krop);
      fysik.ejere.set(k.handle, this.ejer);
      return k;
    };
    this.kroppe = [
      lav(RAPIER.ColliderDesc.cuboid(2.72, 0.48, 1.0).setTranslation(0, yb + 0.48, 0), 1850),
      lav(RAPIER.ColliderDesc.cuboid(0.98, 0.56, 0.95).setTranslation(0.37, yb + 1.5, 0), 350),
    ];
    this.hjulKroppe = [];
    for (const x of [-AKSEL, AKSEL]) for (const z of [-SPOR, SPOR]) {
      const k = lav(RAPIER.ColliderDesc.ball(this.r).setTranslation(x, 0, z), 70, 0.04);
      this.hjulKroppe.push(k);
    }
    const f = this.frontSted();
    const form = this.bil.front === 'let' ? RAPIER.ColliderDesc.cuboid(0.12, 0.14, 1.04)
      : this.bil.front === 'plov' ? RAPIER.ColliderDesc.cuboid(0.2, 0.45, 1.15) : RAPIER.ColliderDesc.cuboid(0.26, 0.44, 1.05);
    this.kroppe.push(lav(form.setTranslation(f.x, f.y, 0), front.masse, 0.4));
    this.masse = this.krop.mass();
  }

  // Hvor bilens nederste punkt under hjulene er (til motorens trækkraft)
  hjulPunkt(vinkel, p) {
    return { x: p.x + Math.sin(vinkel) * this.r, y: p.y - Math.cos(vinkel) * this.r, z: 0 };
  }

  // ---------- Efter hvert fysiktrin: ret bilen ind og sæt kræfterne til næste trin ----------
  efterTrin({ gas = 0, boost = false, aktiv = false }) {
    const k = this.krop;
    if (!k) return;
    const t = k.translation(), q = k.rotation(), v = k.linvel(), w = k.angvel();
    // Kun vip frem og tilbage: ingen sidefart, ingen rul og intet sving
    if (Math.abs(t.z) > 1e-4 || Math.abs(v.z) > 1e-4) {
      k.setTranslation({ x: t.x, y: t.y, z: 0 }, false);
      k.setLinvel({ x: v.x, y: v.y, z: 0 }, false);
    }
    if (Math.abs(q.x) + Math.abs(q.y) > 1e-6) {
      const n = Math.hypot(q.z, q.w) || 1;
      k.setRotation({ x: 0, y: 0, z: q.z / n, w: q.w / n }, false);
    }
    if (Math.abs(w.x) + Math.abs(w.y) > 1e-6) k.setAngvel({ x: 0, y: 0, z: w.z }, false);
    const vinkel = Math.atan2(Math.sin(2 * Math.atan2(q.z, q.w)), Math.cos(2 * Math.atan2(q.z, q.w)));
    this.vinkel = vinkel;
    if (!this.bump) this.fartFør = Math.max(this.fartFør * 0.97, v.x);
    k.resetForces(true);
    k.resetTorques(true);
    if (!aktiv) return;
    if (gas) this.kørt = true;
    let kontakt = false;
    for (const h of this.hjulKroppe) fysik.verden.contactPairsWith(h, () => { kontakt = true; });
    const p = k.translation();
    // Motoren trækker nede ved hjulene; uden gas ruller bilen langsomt ud
    if (kontakt && gas && (Math.abs(v.x) < this.motor.fart || gas * v.x < 0)) {
      k.addForceAtPoint({ x: gas * this.motor.kraft, y: 0, z: 0 }, this.hjulPunkt(vinkel, p), true);
    } else if (kontakt && !gas) k.addForce({ x: -v.x * 700, y: 0, z: 0 }, true);
    if (boost && this.brændstof > 0 && this.kørt) {
      this.brændstof = Math.max(0, this.brændstof - 1 / 60 / 3);
      const imp = this.masse * 0.09 * this.motor.boost;
      k.applyImpulseAtPoint({ x: Math.cos(vinkel) * imp, y: Math.sin(vinkel) * imp + imp * 0.08, z: 0 }, { x: p.x, y: p.y + 0.4, z: 0 }, true);
    }
    // Som et godt legetøj retter bilen sig op igen, hvis den tipper mere end 35°
    const over = Math.abs(vinkel) > 0.6 ? vinkel - Math.sign(vinkel) * 0.6 : 0;
    k.addTorque({ x: 0, y: 0, z: (-over * 10 - w.z * (over ? 2.5 : 0.3)) * this.masse * 2.6 }, true);
  }

  // ---------- Sammenstødet ----------
  // Lasten flyver af ladet med bilens fart og springer et øjeblik efter
  kastLast() {
    if (this.kastet) return;
    this.kastet = true;
    const fart = Math.max(4, this.fartFør);
    for (const c of this.last) {
      c.mesh.getWorldPosition(tmp);
      this.gruppe.remove(c.mesh);
      const l = this.sprængstof.stil(c.type, { x: tmp.x, y: tmp.y - c.def.str[1] / 2, z: tmp.z }, { spiller: false, liggende: c.liggende });
      l.fraBil = true;
      l.krop.setLinvel({ x: fart * r(0.55, 0.85), y: r(2.5, 5), z: r(-1.5, 1.5) }, true);
      l.krop.setAngvel({ x: r(-4, 4), y: r(-4, 4), z: r(-4, 4) }, true);
      this.sprængstof.planlæg(l, c.type === 'fyrværkeri' ? r(0.2, 0.5) : r(0.35, 0.8), true);
    }
    this.last = [];
  }

  // Bilen mærker trykbølgen fra en sprængning i nærheden
  trykbølge(p, W) {
    if (!this.krop) return;
    const t = this.krop.translation(), S = Math.cbrt(W);
    tmp.set(t.x - p.x, t.y - p.y, 0);
    const a = tmp.length();
    if (a > 12 * S) return;
    tmp.normalize();
    tmp.y = Math.abs(tmp.y) + 0.5;
    const fart = Math.min(8, 6 * S / (1 + a * a * 0.1));
    this.krop.applyImpulse({ x: tmp.x * fart * this.masse * 0.6, y: tmp.y * fart * this.masse * 0.5, z: 0 }, true);
    this.krop.applyTorqueImpulse({ x: 0, y: 0, z: r(-1, 1) * this.masse * 2 }, true);
  }

  // ---------- Hvert billede: læg grafikken, hvor fysikken siger ----------
  synk(dt, boost) {
    if (!this.krop) return;
    const t = this.krop.translation(), q = this.krop.rotation();
    this.gruppe.position.set(t.x, t.y, t.z);
    this.gruppe.quaternion.set(q.x, q.y, q.z, q.w);
    const rul = -t.x / this.r;
    for (const w of this.hjul) w.rotation.z = rul;
    const flamme = this.model.userData.flamme;
    if (flamme) {
      flamme.visible = boost;
      if (boost) flamme.scale.set(1, 0.85 + Math.random() * 0.4, 1);
    }
  }

  // Midten af fronten i verdenen: dér rammer bilen bygningen
  frontPunkt() {
    const t = this.krop.translation(), v = this.vinkel || 0, lx = 3.25, ly = bundOver(this.r) + 0.6;
    return new THREE.Vector3(t.x + Math.cos(v) * lx - Math.sin(v) * ly, t.y + Math.sin(v) * lx + Math.cos(v) * ly, 0);
  }

  get sted() { return this.krop ? this.krop.translation() : { x: START, y: 0, z: 0 }; }
  get fart() { return this.krop ? this.krop.linvel().x : 0; }

  // Når hele fysikverdenen bygges forfra, er kroppen allerede væk: kun grafikken fjernes
  slip() {
    this.scene.remove(this.gruppe);
    this.krop = null;
  }

  fjern() {
    this.scene.remove(this.gruppe);
    if (this.krop) {
      for (const k of [...this.kroppe, ...this.hjulKroppe]) fysik.ejere.delete(k.handle);
      fysik.verden.removeRigidBody(this.krop);
    }
    this.krop = null;
  }
}
