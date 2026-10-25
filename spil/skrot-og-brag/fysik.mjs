import * as R from '../brudpunkt/rapier/rapier.mjs';
import { BANER, del, normaliser } from './data.mjs';

let klar;
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });
const Q = v => ({ x: 0, y: 0, z: Math.sin(v / 2), w: Math.cos(v / 2) });
export const TRIN = 1 / 60;

export async function opretFysik(bil, bane = 0) {
  klar ??= R.init();
  await klar;
  return new Forsøg(normaliser(bil), Math.max(0, Math.min(3, bane | 0)));
}

// Banen har rigtig 3D-kollision, men bilen holdes i køreplanet for enkel touchstyring.
class Forsøg {
  constructor(bil, bane) {
    this.bil = bil;
    this.bane = BANER[bane];
    this.baneNr = bane;
    this.verden = new R.World(V(0, -16));
    this.verden.timestep = TRIN;
    this.verden.numSolverIterations = 8;
    this.kø = new R.EventQueue(true);
    this.dele = [];
    this.kort = new Map();
    this.baand = [];
    this.hændelser = [];
    this.tid = 0;
    this.kæde = 0;
    this.brændstof = 1;
    this.kørt = false;
    this.næsteId = 0;
    this.sidsteSlag = new Map();
    this.totalBygning = 0;
    this.bygBane();
    this.bygBil();
  }

  // Få standardformer holder både grafik og fysik billige på tablets.
  blok(x, y, b, h, type, muligheder = {}) {
    const fast = !!muligheder.fast;
    const beskrivelse = (fast ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.dynamic())
      .setTranslation(x, y, 0).setRotation(Q(muligheder.vinkel || 0));
    if (!fast) beskrivelse.enabledTranslations(true, true, false).enabledRotations(false, false, true)
      .setLinearDamping(.08).setAngularDamping(.15).setCcdEnabled(true);
    const krop = this.verden.createRigidBody(beskrivelse);
    let form = muligheder.radius ? R.ColliderDesc.ball(muligheder.radius) : R.ColliderDesc.cuboid(b / 2, h / 2, (muligheder.dybde || 2.2) / 2);
    if (muligheder.slags === 'plov') form = R.ColliderDesc.convexHull(new Float32Array([
      -b / 2, -h / 2, -1.25, -b / 2, h / 2, -1.25, b / 2, -h / 2, -1.25,
      -b / 2, -h / 2, 1.25, -b / 2, h / 2, 1.25, b / 2, -h / 2, 1.25,
    ]));
    form.setMass(muligheder.masse || 1).setFriction(muligheder.greb ?? .65)
      .setRestitution(muligheder.hop || .04)
      .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(35);
    const collider = this.verden.createCollider(form, krop);
    const d = { id: this.næsteId++, krop, collider, x, y, b, h, type, fast, ...muligheder, ramt: false, aktivering: null, sprængt: false, dybde: 0 };
    this.dele.push(d);
    this.kort.set(collider.handle, d);
    if (type === 'mur' || type === 'bjælke') this.totalBygning++;
    return d;
  }

  // Fuger holder huset oppe, indtil en fysisk påvirkning knækker dem.
  bind(a, b, styrke = 200, bil = false) {
    const pa = a.krop.translation(), pb = b.krop.translation();
    const led = this.verden.createImpulseJoint(R.JointData.fixed(V(pb.x - pa.x, pb.y - pa.y), Q(0), V(), Q(0)), a.krop, b.krop, true);
    led.setContactsEnabled(false);
    const baand = { a, b, led, styrke, bil, brudt: false };
    this.baand.push(baand);
    return baand;
  }

  bygBane() {
    this.blok(48, -1, 125, 2, 'jord', { fast: true, dybde: 16 });
    this.blok(-7, 4, 2, 10, 'jord', { fast: true });
    this.blok(106, 4, 2, 10, 'jord', { fast: true });
    if (this.bane.rampe) this.blok(18, 1.3, 11, .65, 'rampe', { fast: true, vinkel: .27, dybde: 4 });
    for (let i = 0; i < this.bane.domino; i++) {
      this.blok(23 + i * 2.35, 2.1, .55, 4.2, 'domino', { masse: 2.4, farve: i % 2 ? '#61dad4' : '#f5ca51' });
    }
    const slut = 23 + this.bane.domino * 2.35;
    this.celle(slut, 1, this.bane.type);
    this.tårn(slut + 5, this.bane.højde);
    this.celle(slut + 7, 1, 'tnt');
    this.celle(slut + 10, 1, this.baneNr === 3 ? 'blaa' : 'gas');
    if (this.baneNr > 0) {
      this.tårn(slut + 18, Math.max(6, this.bane.højde - 4));
      this.celle(slut + 17, 4.8, this.baneNr === 3 ? 'lilla' : 'benzin');
    }
  }

  tårn(x, etager) {
    let forrige = [];
    for (let etage = 0; etage < etager; etage++) {
      const y = .86 + etage * 1.72;
      const venstre = this.blok(x - 2.65, y, .62, 1.5, 'mur', { masse: 1.6, etage });
      const højre = this.blok(x + 2.65, y, .62, 1.5, 'mur', { masse: 1.6, etage });
      const gulv = this.blok(x, y + .84, 5.9, .18, 'bjælke', { masse: 2.6, etage });
      this.bind(venstre, gulv, 110);
      this.bind(højre, gulv, 110);
      if (forrige.length) {
        this.bind(forrige[0], venstre, 90);
        this.bind(forrige[1], højre, 90);
      }
      forrige = [venstre, højre];
      if (etage > 0 && etage % 3 === 1) this.celle(x, y + .3, ['benzin', 'gas', 'blaa', 'lilla'][etage % 4]);
    }
  }

  celle(x, y, slags, last = false) {
    return this.blok(x, y, .85, 1.45, 'celle', { masse: 1.3, slags, last });
  }

  bygBil() {
    const hjul = del('hjul', this.bil.hjul), front = del('front', this.bil.front);
    const y = hjul.radius + 1;
    this.chassis = this.blok(3, y, 5.6, .65, 'bil', { masse: 9, farve: this.bil.farve });
    this.hjul = [-1.85, 1.85].map(dx => {
      const collider = this.verden.createCollider(R.ColliderDesc.ball(hjul.radius).setTranslation(dx, -.92, 0)
        .setMass(1.8).setFriction(hjul.greb * .12).setRestitution(this.bil.hjul === 'hop' ? .55 : .03)
        .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(35), this.chassis.krop);
      const d = { id: this.næsteId++, krop: this.chassis.krop, collider, type: 'hjul', radius: hjul.radius,
        lokal: V(dx, -.92), x: 3 + dx, y: hjul.radius + .08, b: hjul.radius * 2, h: hjul.radius * 2 };
      this.dele.push(d);
      this.kort.set(collider.handle, d);
      return d;
    });
    const næse = this.blok(6.3, y + .1, this.bil.front === 'plov' ? 1.6 : 1.05, this.bil.front === 'let' ? .45 : 1.05, 'front', { masse: front.masse, slags: this.bil.front });
    this.bind(this.chassis, næse, 2100, true);
    this.last = [];
    if (this.bil.last !== 'tom') for (let i = 0; i < this.bil.antal; i++) {
      const c = this.celle(1.2 + i * 1.05, y + 1.08, this.bil.last, true);
      this.bind(this.chassis, c, 700, true);
      this.last.push(c);
    }
    // Delene på bilen må ikke kæmpe mod deres egne hjul eller beslag.
    for (const d of this.dele) d.collider.setCollisionGroups(
      ['bil', 'hjul', 'front'].includes(d.type) || d.last ? 0x00020001 : 0x00010003);
  }

  // Kun kollision, fald eller en virkelig trykbølge kan vække en celle.
  antænd(c, dybde = 1, vent = .28 + (c.id % 3) * .16) {
    if (c.type !== 'celle' || c.sprængt || c.aktivering !== null) return;
    c.aktivering = this.tid + vent;
    c.dybde = dybde;
    this.hændelser.push({ type: 'lunte', slags: c.slags, p: { ...c.krop.translation() } });
  }

  knæk(d, slag) {
    for (const b of this.baand) {
      if (!b.brudt && (b.a === d || b.b === d) && slag > b.styrke) {
        this.verden.removeImpulseJoint(b.led, true);
        b.brudt = true;
        b.a.ramt = b.b.ramt = true;
      }
    }
  }

  spræng(c) {
    c.sprængt = true;
    const p = { ...c.krop.translation() };
    const radius = { tnt: 8.5, gas: 9.5, benzin: 7, blaa: 11, lilla: 10 }[c.slags];
    this.kæde++;
    this.hændelser.push({ type: 'brag', slags: c.slags, p, kæde: this.kæde, dybde: c.dybde });
    this.knæk(c, 10000);
    c.krop.setEnabled(false);
    this.puls(p, radius, c.slags, c.dybde);
    if (c.slags === 'gas') this.hændelser.push({ type: 'sky', p, slut: this.tid + 1.3, dybde: c.dybde });
    if (c.slags === 'lilla') this.hændelser.push({ type: 'hvirvel', p, slut: this.tid + .65, dybde: c.dybde });
  }

  puls(p, radius, slags, dybde) {
    for (const d of this.dele) {
      if (d.fast || d.sprængt || d.lokal) continue;
      const q = d.krop.translation(), dx = q.x - p.x, dy = q.y - p.y;
      const afstand = Math.hypot(dx, dy);
      if (afstand > radius) continue;
      const kraft = (1 - afstand / radius) * (slags === 'tnt' ? 25 : 19);
      this.knæk(d, kraft * 24);
      const retning = slags === 'lilla' ? -.65 : 1;
      d.krop.applyImpulse(V(retning * dx / Math.max(afstand, .3) * kraft, (retning * dy / Math.max(afstand, .3) + .6) * kraft), true);
      if (d.type === 'celle') this.antænd(d, dybde + 1, slags === 'benzin' ? .8 : .48 + afstand * .065);
      if (d.type === 'mur' || d.type === 'bjælke') d.ramt = true;
    }
  }

  // Hjulenes kollisionsformer følger en fælles aksel; kun kontakt med banen giver trækkraft.
  trin({ gas = 0, boost = false } = {}) {
    this.tid += TRIN;
    if (Math.abs(gas) > 0) this.kørt = true;
    const motor = del('motor', this.bil.motor);
    const bil = this.chassis.krop;
    let kontakt = false;
    for (const h of this.hjul) this.verden.contactPairsWith(h.collider, () => { kontakt = true; });
    bil.resetForces(true);
    if (kontakt && (Math.abs(bil.linvel().x) < motor.fart * .72 || gas * bil.linvel().x < 0)) {
      bil.addForce(V(gas * motor.kraft * 2.8, 0), true);
    }
    if (boost && this.brændstof > 0 && this.kørt) {
      this.brændstof = Math.max(0, this.brændstof - TRIN / 3);
      const q = bil.rotation(), vinkel = 2 * Math.atan2(q.z, q.w);
      bil.applyImpulse(V(Math.cos(vinkel) * (this.bil.motor === 'raket' ? 2.5 : 1.6), Math.sin(vinkel) * 1.8 + .16), true);
    }
    this.verden.step(this.kø);
    this.kø.drainContactForceEvents(e => {
      const a = this.kort.get(e.collider1()), b = this.kort.get(e.collider2());
      if (!a || !b || (a.fast && b.fast)) return;
      const impuls = e.totalForceMagnitude() * TRIN;
      const fart = Math.hypot(a.krop.linvel().x - b.krop.linvel().x, a.krop.linvel().y - b.krop.linvel().y);
      if (impuls < 2 || fart < 2 || this.tid < .7) return;
      const anslag = impuls * Math.max(1, fart * .35);
      for (const d of [a, b]) {
        this.knæk(d, anslag);
        if (d.type === 'celle' && (impuls > 8 || fart > 6)) this.antænd(d);
        if (anslag > 80 && (d.type === 'mur' || d.type === 'bjælke')) d.ramt = true;
      }
      // Lasten registrerer også chassisets slag mod en bygning eller domino.
      const biltyper = ['bil', 'front', 'hjul'];
      const måltyper = ['mur', 'bjælke', 'domino', 'celle'];
      if (((biltyper.includes(a.type) && måltyper.includes(b.type)) ||
        (biltyper.includes(b.type) && måltyper.includes(a.type))) && anslag > 100) {
        for (const c of this.last) this.antænd(c);
      }
      const nøgle = [a.id, b.id].sort((x, y) => x - y).join('/');
      if (impuls > 3 && this.tid - (this.sidsteSlag.get(nøgle) || 0) > .2) {
        this.sidsteSlag.set(nøgle, this.tid);
        this.hændelser.push({ type: 'slag', p: { ...a.krop.translation() }, styrke: Math.min(1, impuls / 60), materiale: a.type === 'domino' || b.type === 'domino' ? 'metal' : 'beton' });
      }
    });
    for (const c of this.dele) if (c.aktivering !== null && !c.sprængt && this.tid >= c.aktivering) this.spræng(c);
    this.opdaterFelter();
    // Et loft på hastigheder holder store samtidige sammenstyrtninger stabile.
    for (const d of this.dele) if (!d.fast && !d.sprængt && !d.lokal) {
      const v = d.krop.linvel(), fart = Math.hypot(v.x, v.y);
      if (fart > 48) d.krop.setLinvel(V(v.x * 48 / fart, v.y * 48 / fart), true);
      const a = d.krop.angvel();
      if (Math.abs(a.z) > 14) d.krop.setAngvel(V(0, 0, Math.sign(a.z) * 14), true);
    }
  }

  // Den grønne sky vokser fysisk. Lilla trækker først ind og giver derefter et efterslag.
  opdaterFelter() {
    this.felter ??= [];
    for (const e of this.hændelser) if ((e.type === 'sky' || e.type === 'hvirvel') && !e.felt) {
      e.felt = true;
      this.felter.push(e);
    }
    this.felter = this.felter.filter(f => {
      if (this.tid >= f.slut) {
        if (f.type === 'hvirvel') {
          this.puls(f.p, 12, 'blaa', f.dybde);
          this.hændelser.push({ type: 'efterslag', p: f.p, slags: 'lilla' });
        }
        return false;
      }
      if (f.type === 'sky') {
        const radius = 4 + (1.3 - (f.slut - this.tid)) * 6;
        for (const d of this.dele) if (d.type === 'celle' && Math.hypot(d.krop.translation().x - f.p.x, d.krop.translation().y - f.p.y) < radius) this.antænd(d, f.dybde + 1, .3);
      }
      return true;
    });
  }

  status() {
    let væltet = 0;
    for (const d of this.dele) if (d.type === 'mur' || d.type === 'bjælke') {
      const p = d.krop.translation(), q = d.krop.rotation();
      if (Math.hypot(p.x - d.x, p.y - d.y) > 1.2 || Math.abs(q.z) > .2) væltet++;
    }
    return { procent: Math.round(væltet / this.totalBygning * 100), kæde: this.kæde, fart: Math.round(Math.abs(this.chassis.krop.linvel().x) * 3.6), brændstof: this.brændstof };
  }

  hentHændelser() {
    return this.hændelser.splice(0);
  }

  luk() {
    this.kø.free();
    this.verden.free();
  }
}
