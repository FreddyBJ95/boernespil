import * as R from '../brudpunkt/rapier/rapier.mjs';
import { BANER, del, normaliser } from './data.mjs';

let klar;
const V = (x = 0, y = 0, z = 0) => ({ x, y, z });
const Q = v => ({ x: 0, y: 0, z: Math.sin(v / 2), w: Math.cos(v / 2) });
export const TRIN = 1 / 60;

// Tag, rampe og skovl er trekanter i køreplanet. Hjørnerne gives om tyngdepunktet,
// så grafikken kan tegne præcis den samme form.
export function trekant(type, slags, b, h) {
  let p = null;
  if (type === 'tag') p = [[-b / 2, -h / 2], [b / 2, -h / 2], [0, h / 2]];
  else if (type === 'rampe') p = [[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, h / 2]];
  else if (type === 'front' && slags === 'plov') p = [[-b / 2, -h / 2], [-b / 2, h / 2], [b / 2, -h / 2]];
  if (!p) return null;
  const midt = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3];
  return { midt, punkter: p.map(([x, y]) => [x - midt[0], y - midt[1]]) };
}

export async function opretFysik(bil, bane = 0) {
  klar ??= R.init();
  await klar;
  return new Forsøg(normaliser(bil), Math.max(0, Math.min(BANER.length - 1, bane | 0)));
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
    // Skrå dele er trekanter. Kroppen lægges i trekantens tyngdepunkt, ellers løber fysikken løbsk.
    const hjørner = trekant(type, muligheder.slags, b, h);
    if (hjørner) {
      x += hjørner.midt[0];
      y += hjørner.midt[1];
    }
    const beskrivelse = (fast ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.dynamic())
      .setTranslation(x, y, 0).setRotation(Q(muligheder.vinkel || 0));
    if (!fast) beskrivelse.enabledTranslations(true, true, false)
      .setLinearDamping(.08).setAngularDamping(.15).setCcdEnabled(true);
    const krop = this.verden.createRigidBody(beskrivelse);
    let form = muligheder.radius ? R.ColliderDesc.ball(muligheder.radius) : R.ColliderDesc.cuboid(b / 2, h / 2, (muligheder.dybde || 2.2) / 2);
    const masse = muligheder.masse || 1;
    if (hjørner) {
      const z = (muligheder.dybde || 2.5) / 2;
      form = R.ColliderDesc.convexHull(new Float32Array(hjørner.punkter.flatMap(([px, py]) => [px, py, -z, px, py, z])));
      // En skæv trekant får en drejet inerti, som låste akser ikke tåler. Brug en lige kasses inerti.
      form.setMassProperties(masse, V(), V(masse / 12 * (h * h + 4 * z * z), masse / 12 * (b * b + 4 * z * z), masse / 12 * (b * b + h * h)), { x: 0, y: 0, z: 0, w: 1 });
    } else form.setMass(masse);
    form.setFriction(muligheder.greb ?? .65)
      .setRestitution(muligheder.hop || .04)
      .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(35);
    const collider = this.verden.createCollider(form, krop);
    const d = { id: this.næsteId++, krop, collider, x, y, b, h, type, fast, ...muligheder, trekant: hjørner?.punkter, ramt: false, aktivering: null, sprængt: false, dybde: 0 };
    this.dele.push(d);
    this.kort.set(collider.handle, d);
    if (d.bygning) this.totalBygning++;
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

  // Banen er en lang vej med ét mål for enden. Bilen kører direkte ind i det.
  bygBane() {
    this.blok(48, -1, 125, 2, 'jord', { fast: true, dybde: 16 });
    this.blok(-7, 4, 2, 10, 'jord', { fast: true });
    this.blok(106, 4, 2, 10, 'jord', { fast: true });
    const id = this.bane.id;
    if (id === 'hus') {
      this.hus(30, 2, { bredde: 6.4, udseende: 'hus', celler: ['benzin'] });
    } else if (id === 'bunke') {
      this.bunke(31, 6);
    } else if (id === 'tårn') {
      this.hus(32, 12, { bredde: 6, udseende: 'regnbue', celler: ['tnt', null, null, 'gas', null, null, 'benzin', null, null, 'blaa'] });
    } else if (id === 'slot') {
      this.hus(29, 5, { bredde: 3.4, udseende: 'slot', celler: ['gas'] });
      this.murværk(31.1, 7.8, 4);
      this.hus(40.7, 5, { bredde: 3.4, udseende: 'slot', celler: ['benzin'], husnr: 1 });
    } else {
      this.blok(17, 1.4, 10, 2.8, 'rampe', { fast: true, dybde: 4 });
      this.hus(37, 12, { bredde: 6, udseende: 'hus', celler: ['tnt', null, null, 'gas', null, null, 'lilla'] });
      this.hus(48, 5, { bredde: 5.2, udseende: 'hus', celler: ['benzin'], husnr: 1 });
    }
    // Kameraet bruger målets bredde og højde til at vise hele sammenstyrtningen.
    const dele = this.dele.filter(d => d.bygning);
    this.mål = {
      fra: Math.min(...dele.map(d => d.x - d.b / 2)),
      til: Math.max(...dele.map(d => d.x + d.b / 2)),
      højde: Math.max(...dele.map(d => d.y + d.h / 2)),
    };
  }

  // Et hus er etager af to vægge og et gulv, holdt sammen af brudbare fuger, og et tag øverst.
  hus(x, etager, { bredde = 6, udseende = 'hus', celler = [], husnr = 0 } = {}) {
    let forrige = [], gulv = null;
    const kant = bredde / 2 - .31;
    const materiale = udseende === 'slot' ? 'beton' : 'brokker';
    for (let etage = 0; etage < etager; etage++) {
      const y = .76 + etage * 1.72;
      const fælles = { masse: 1.6, etage, udseende, husnr, bygning: true, materiale };
      const venstre = this.blok(x - kant, y, .62, 1.5, 'mur', fælles);
      const højre = this.blok(x + kant, y, .62, 1.5, 'mur', fælles);
      gulv = this.blok(x, y + .84, bredde, .18, 'bjælke', { ...fælles, masse: 2.6 });
      this.bind(venstre, gulv, 110);
      this.bind(højre, gulv, 110);
      if (forrige.length) {
        this.bind(forrige[0], venstre, 90);
        this.bind(forrige[1], højre, 90);
      }
      forrige = [venstre, højre];
      if (celler[etage]) this.celle(x, etage ? y - .05 : .74, celler[etage]);
    }
    const højde = udseende === 'slot' ? 3.2 : 2.3;
    const tag = this.blok(x, gulv.y + .09 + højde / 2, bredde + .7, højde, 'tag',
      { masse: 2.4, udseende, husnr, etage: etager, bygning: true, materiale });
    this.bind(gulv, tag, 110);
  }

  // Klodsbjerget er løse legeklodser i en pyramide med en tønde på toppen.
  bunke(x, rækker) {
    const s = 1.45;
    for (let r = 0; r < rækker; r++) {
      const antal = rækker - r;
      for (let i = 0; i < antal; i++) {
        this.blok(x + (i - (antal - 1) / 2) * (s + .03), s / 2 + .01 + r * (s + .01), s, s, 'klods',
          { masse: 1.4, udseende: 'klods', farvenr: (r * 3 + i) % 5, bygning: true, materiale: 'trae_knaek' });
      }
    }
    this.celle(x, rækker * (s + .01) + .74, 'gas');
  }

  // Slotsmuren er løse sten i forbandt, så den kan skubbes og vælte ned i stykker.
  murværk(fra, bredde, rækker) {
    const sten = 1.3, højde = .86;
    for (let r = 0; r < rækker; r++) {
      const forskudt = r % 2 ? sten / 2 : 0;
      for (let x = fra - forskudt; x < fra + bredde - .05; x += sten + .02) {
        const venstre = Math.max(fra, x), højre = Math.min(fra + bredde, x + sten);
        if (højre - venstre < .3) continue;
        this.blok((venstre + højre) / 2, højde / 2 + .01 + r * (højde + .01), højre - venstre, højde, 'klods',
          { masse: 1.2, udseende: 'sten', bygning: true, materiale: 'beton' });
      }
    }
    // Takkerne øverst på muren.
    for (let x = fra + .45; x < fra + bredde - .3; x += 1.6) {
      this.blok(x, rækker * (højde + .01) + .36, .75, .7, 'klods', { masse: .6, udseende: 'sten', bygning: true, materiale: 'beton' });
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
      if (d.bygning) d.ramt = true;
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
    bil.resetTorques(true);
    // Motoren trækker nede ved hjulene, så bilen kører fremad i stedet for at stejle.
    const q = bil.rotation(), p = bil.translation();
    const vinkel = Math.atan2(Math.sin(2 * Math.atan2(q.z, q.w)), Math.cos(2 * Math.atan2(q.z, q.w)));
    const ned = this.hjul[0].radius + .92;
    const hjulpunkt = V(p.x + Math.sin(vinkel) * ned, p.y - Math.cos(vinkel) * ned);
    if (kontakt && (Math.abs(bil.linvel().x) < motor.fart * .72 || gas * bil.linvel().x < 0)) {
      bil.addForceAtPoint(V(gas * motor.kraft * 2.8, 0), hjulpunkt, true);
    }
    if (boost && this.brændstof > 0 && this.kørt) {
      this.brændstof = Math.max(0, this.brændstof - TRIN / 3);
      bil.applyImpulseAtPoint(V(Math.cos(vinkel) * (this.bil.motor === 'raket' ? 2.5 : 1.6), Math.sin(vinkel) * 1.8 + .16),
        V(p.x + Math.sin(vinkel) * .92, p.y - Math.cos(vinkel) * .92), true);
    }
    // Som et legetøj retter bilen sig selv op, når den tipper mere end 30 grader.
    if (!this.chassis.sprængt) {
      const over = Math.abs(vinkel) > .52 ? vinkel - Math.sign(vinkel) * .52 : 0;
      bil.addTorque(V(0, 0, (-over * 14 - bil.angvel().z * (over ? 3 : .4)) * 120), true);
    }
    this.verden.step(this.kø);
    this.iPlanet();
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
        if (anslag > 80 && d.bygning) d.ramt = true;
      }
      // Lasten registrerer også chassisets slag mod en bygning eller en tønde.
      const biltyper = ['bil', 'front', 'hjul'];
      const mål = d => d.bygning || d.type === 'celle';
      const bilRammer = (biltyper.includes(a.type) && mål(b)) || (biltyper.includes(b.type) && mål(a));
      if (bilRammer && anslag > 100) for (const c of this.last) this.antænd(c);
      // Første rigtige sammenstød får sit eget lille BAM i grafikken.
      if (bilRammer && anslag > 40 && !this.bumpet) {
        this.bumpet = true;
        this.hændelser.push({ type: 'bump', p: { ...this.chassis.krop.translation() } });
      }
      const nøgle = [a.id, b.id].sort((x, y) => x - y).join('/');
      if (impuls > 3 && this.tid - (this.sidsteSlag.get(nøgle) || 0) > .2) {
        this.sidsteSlag.set(nøgle, this.tid);
        this.hændelser.push({ type: 'slag', p: { ...a.krop.translation() }, styrke: Math.min(1, impuls / 60), materiale: a.materiale || b.materiale || 'metal' });
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

  // Kroppene må kun dreje om z-aksen. Rapiers låste drejeakser tåler ikke fuger, så det rettes efter hvert trin.
  iPlanet() {
    for (const d of this.dele) {
      if (d.fast || d.lokal || d.sprængt) continue;
      const k = d.krop, q = k.rotation(), w = k.angvel();
      if (Math.abs(q.x) + Math.abs(q.y) > 1e-7) {
        const n = Math.hypot(q.z, q.w) || 1;
        k.setRotation({ x: 0, y: 0, z: q.z / n, w: q.w / n }, false);
      }
      if (Math.abs(w.x) + Math.abs(w.y) > 1e-7) k.setAngvel({ x: 0, y: 0, z: w.z }, false);
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
    for (const d of this.dele) if (d.bygning) {
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
