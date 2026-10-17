import * as RAPIER from "./rapier/rapier.mjs";
import { GRAENSER, normaliserObjekt } from "./opsaetning.js";

const TRIN = 1 / 60;
const klip = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const længde = v => Math.hypot(...v);
const minus = (a, b) => a.map((v, i) => v - b[i]);
const plus = (a, b) => a.map((v, i) => v + b[i]);
const vektor = p => ({ x: p[0], y: p[1], z: p[2] });
const liste = p => [p.x, p.y, p.z];
const kvat = q => [q.x, q.y, q.z, q.w];
const drejning = vinkel => [0, Math.sin(vinkel / 2), 0, Math.cos(vinkel / 2)];
const modstand = { glas: 0.34, trae: 0.7, metal: 1, beton: 1.12 };
let klar;

// De samme små vektorregnestykker bruges af fysikken og kollisionsformerne.
function drej(p, q) {
  const [x, y, z, w] = q;
  const uv = [y * p[2] - z * p[1], z * p[0] - x * p[2], x * p[1] - y * p[0]];
  const uuv = [y * uv[2] - z * uv[1], z * uv[0] - x * uv[2], x * uv[1] - y * uv[0]];
  return p.map((v, i) => v + 2 * (w * uv[i] + uuv[i]));
}

function gang(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];
}

// Opskrifterne er vores egne grove kollisionsdele, ikke de detaljerede tegnemodeller.
function læsOpskrifter(data) {
  const resultat = {};
  for (const type of ["bil", "hus", "taarn", "celle"]) {
    const opskrift = data?.[type];
    if (!opskrift || !Array.isArray(opskrift.dele) || !opskrift.dele.length || opskrift.dele.length > 100) throw new Error(`Modellen til ${type} mangler dele.`);
    const ids = new Set();
    const dele = opskrift.dele.map(del => {
      if (typeof del.id !== "string" || !del.id || ids.has(del.id) || !Array.isArray(del.p) || !Array.isArray(del.halv) ||
        del.p.length !== 3 || del.halv.length !== 3 || !del.p.every(Number.isFinite) || !del.halv.every(n => Number.isFinite(n) && n > 0 && n < 20) ||
        !Object.hasOwn(modstand, del.materiale) || !Number.isFinite(del.styrke) || del.styrke < 0 || del.styrke > 1 ||
        !Number.isFinite(del.masse) || del.masse <= 0 || del.masse > 20) throw new Error(`En del af ${type} har ugyldige fysikdata.`);
      ids.add(del.id);
      return { ...del, p: [...del.p], halv: [...del.halv], fundament: !!del.fundament };
    });
    const baand = opskrift.baand ?? [];
    if (!Array.isArray(baand) || baand.length > 400 || baand.some(b => !Array.isArray(b) || b.length !== 2 || b[0] === b[1] || !b.every(id => ids.has(id)))) throw new Error(`Forbindelserne i ${type} er ugyldige.`);
    resultat[type] = { navn: opskrift.navn || type, dele, baand: baand.map(b => [...b]) };
  }
  return resultat;
}

// Alle størrelser herunder er fiktive spiltal. De beskriver ingen virkelige ladninger.
export async function opretSimulering(opskrifter, { kvalitet = "auto", frø = 12345 } = {}) {
  const data = læsOpskrifter(opskrifter);
  if (!["auto", "let", "flot"].includes(kvalitet)) throw new Error("Vælg automatisk, let eller flot grafik.");
  klar ??= RAPIER.init();
  await klar;
  return new Simulering(data, kvalitet, frø);
}

class Simulering {
  constructor(opskrifter, kvalitet, frø) {
    this.opskrifter = opskrifter;
    this.kvalitet = kvalitet;
    this.frø = Number.isFinite(frø) ? frø >>> 0 : 12345;
    this.startFrø = this.frø;
    this.objekter = new Map();
    this.dele = new Map();
    this.grupper = new Set();
    this.kollider = new Map();
    this.hændelser = [];
    this.plan = [];
    this.parTid = new Map();
    this.tid = 0;
    this.rester = 0;
    this.kører = false;
    this.startet = false;
    this.frigivet = false;
    this.pulser = 0;
    this.kæde = 0;
    this.næsteGruppe = 0;
    this.verden = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.verden.timestep = TRIN;
    this.verden.numSolverIterations = kvalitet === "let" ? 4 : 6;
    this.kø = new RAPIER.EventQueue(true);
    this.verden.createCollider(RAPIER.ColliderDesc.cuboid(70, 0.5, 70).setTranslation(0, -0.5, 0).setFriction(0.85));
  }

  kontroller() {
    if (this.frigivet) throw new Error("Forsøget er lukket.");
  }

  // En lille generator gør bruddenes variation gentagelig ved samme opstilling.
  tilfældig() {
    this.frø = (Math.imul(1664525, this.frø) + 1013904223) >>> 0;
    return this.frø / 4294967296;
  }

  hændelse(type, position, styrke, materiale = "beton", kaede = 0, objekt) {
    if (this.hændelser.length >= 240) this.hændelser.shift();
    this.hændelser.push({ type, position: [...position], styrke: klip(styrke), materiale, kaede, ...(objekt ? { objekt } : {}) });
  }

  placér(specifikation) {
    this.kontroller();
    if (this.startet) throw new Error("Nulstil forsøget, før du bygger videre.");
    const spec = normaliserObjekt(specifikation);
    if (this.objekter.has(spec.id)) throw new Error("Det navn er allerede brugt på banen.");
    if (this.objekter.size >= GRAENSER.objekter) throw new Error(`Der er plads til ${GRAENSER.objekter} objekter på banen.`);
    if (spec.type === "celle" && [...this.objekter.values()].filter(o => o.spec.type === "celle").length >= GRAENSER.celler) throw new Error(`Der er plads til ${GRAENSER.celler} energiceller.`);
    const opskrift = this.opskrifter[spec.type];
    if (this.dele.size + opskrift.dele.length > GRAENSER.dele) throw new Error("Banen har nået grænsen for fysiske dele. Fjern et objekt først.");
    const q = drejning(spec.vinkel);
    const objekt = { spec, dele: [], baand: opskrift.baand, celle: "klar", fri: false, kaede: 0 };
    for (const opskriftDel of opskrift.dele) {
      const del = { ...opskriftDel, id: `${spec.id}/${opskriftDel.id}`, del: opskriftDel.id, objekt, skade: 0, brudt: false, gruppe: null };
      del.p = plus([spec.x, spec.y, spec.z], drej(opskriftDel.p, q));
      del.q = [...q];
      this.dele.set(del.id, del);
      objekt.dele.push(del);
      this.opretGruppe([del], false);
    }
    this.objekter.set(spec.id, objekt);
    return { ...spec };
  }

  // Sammenhængende løse sektioner deler ét legeme, så et tårn kan vælte helt.
  opretGruppe(dele, aktiv, bevægelse = null) {
    const midt = dele.reduce((sum, del) => plus(sum, del.p), [0, 0, 0]).map(n => n / dele.length);
    const beskrivelse = (aktiv ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed())
      .setTranslation(...midt).setLinearDamping(0.06).setAngularDamping(0.12).setCanSleep(true);
    if (aktiv) beskrivelse.setCcdEnabled(true);
    const krop = this.verden.createRigidBody(beskrivelse);
    const gruppe = { id: ++this.næsteGruppe, krop, dele, aktiv, fart: [0, 0, 0], drej: [0, 0, 0] };
    for (const del of dele) {
      del.lokalP = minus(del.p, midt);
      del.lokalQ = [...del.q];
      const collider = this.verden.createCollider(RAPIER.ColliderDesc.cuboid(...del.halv)
        .setTranslation(...del.lokalP).setRotation({ x: del.q[0], y: del.q[1], z: del.q[2], w: del.q[3] })
        .setMass(del.masse).setFriction(del.materiale === "metal" ? 0.6 : 0.85).setRestitution(0.08)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(6), krop);
      del.collider = collider;
      del.gruppe = gruppe;
      this.kollider.set(collider.handle, del);
    }
    if (bevægelse) {
      krop.setLinvel(vektor(bevægelse.fart), true);
      krop.setAngvel(vektor(bevægelse.drej), true);
    }
    this.grupper.add(gruppe);
    return gruppe;
  }

  sletGruppe(gruppe) {
    for (const del of gruppe.dele) this.kollider.delete(del.collider.handle);
    this.verden.removeRigidBody(gruppe.krop);
    this.grupper.delete(gruppe);
  }

  fjern(id) {
    this.kontroller();
    if (this.startet) throw new Error("Nulstil forsøget, før du fjerner noget.");
    const objekt = this.objekter.get(id);
    if (!objekt) return false;
    for (const gruppe of new Set(objekt.dele.map(del => del.gruppe))) this.sletGruppe(gruppe);
    for (const del of objekt.dele) this.dele.delete(del.id);
    this.objekter.delete(id);
    return true;
  }

  // Fundamenter holder modellen fast, indtil brud afskærer en sammenhængende del.
  opdel(objekt) {
    const lokale = new Map(objekt.dele.map(del => [del.del, del]));
    const naboer = new Map(objekt.dele.map(del => [del, []]));
    for (const [a, b] of objekt.baand) {
      const fra = lokale.get(a), til = lokale.get(b);
      if (!fra.brudt && !til.brudt) { naboer.get(fra).push(til); naboer.get(til).push(fra); }
    }
    const besøgt = new Set();
    const komponenter = [];
    for (const del of objekt.dele) {
      if (besøgt.has(del)) continue;
      const gruppe = [del];
      besøgt.add(del);
      for (let i = 0; i < gruppe.length; i++) for (const nabo of naboer.get(gruppe[i])) {
        if (!besøgt.has(nabo)) { besøgt.add(nabo); gruppe.push(nabo); }
      }
      const støttet = !objekt.fri && gruppe.some(d => d.fundament && !d.brudt && !d.gruppe.aktiv);
      komponenter.push({ dele: gruppe, aktiv: !støttet });
    }
    return komponenter;
  }

  opdaterStøtte(objekt) {
    this.opdaterPoser();
    const komponenter = this.opdel(objekt);
    for (const komponent of komponenter) {
      const gamle = new Set(komponent.dele.map(del => del.gruppe));
      if (gamle.size === 1) {
        const gammel = [...gamle][0];
        if (gammel.dele.length === komponent.dele.length && gammel.aktiv === komponent.aktiv) continue;
      }
      // Hvert nyt legeme overtager moderlegemets bevægelse ved sit eget centrum.
      const fart = komponent.dele.reduce((sum, del) => plus(sum, liste(del.gruppe.krop.velocityAtPoint(vektor(del.p)))), [0, 0, 0]).map(n => n / komponent.dele.length);
      const drej = liste(komponent.dele[0].gruppe.krop.angvel());
      komponent.bevægelse = { fart, drej };
      komponent.ny = true;
    }
    // Genbyg samlet, så et opsplittet gammelt legeme ikke kan blive slettet to gange.
    const skift = komponenter.filter(k => k.ny);
    const gamle = new Set(skift.flatMap(k => k.dele.map(del => del.gruppe)));
    for (const gruppe of gamle) this.sletGruppe(gruppe);
    for (const komponent of skift) this.opretGruppe(komponent.dele, komponent.aktiv, komponent.bevægelse);
  }

  skad(del, påvirkning, kaede) {
    if (påvirkning <= 0 || del.brudt) return false;
    del.skade = klip(del.skade + påvirkning / (modstand[del.materiale] * (0.55 + del.styrke * 0.8)));
    if (del.skade < 1) return false;
    del.brudt = true;
    this.hændelse("brud", del.p, 0.25 + 0.6 * klip(påvirkning), del.materiale, kaede, del.objekt.spec.id);
    return true;
  }

  planlæg(objekt, kaede = 1, ekstraTid = 0) {
    if (objekt.celle !== "klar" || this.plan.length >= GRAENSER.celler) return;
    objekt.celle = "planlagt";
    objekt.kaede = kaede;
    this.plan.push({ tid: this.tid + ekstraTid + objekt.spec.forsinkelse, objekt, kaede });
    this.plan.sort((a, b) => a.tid - b.tid || a.objekt.spec.id.localeCompare(b.objekt.spec.id));
  }

  // Kun den første energicelle startes med knappen; de andre skal nås af kæden.
  start() {
    this.kontroller();
    if (!this.startet) {
      const første = [...this.objekter.values()].find(o => o.spec.type === "celle");
      if (!første) throw new Error("Placér en energicelle, før du starter forsøget.");
      // Byggemenuen kan holde ting i luften; ved første Start overtager tyngdekraften.
      for (const objekt of this.objekter.values()) if (objekt.spec.y > 0.05) {
        objekt.fri = true;
        this.opdaterStøtte(objekt);
      }
      this.planlæg(første);
      this.startet = true;
    }
    this.kører = true;
  }

  stop() {
    this.kontroller();
    this.kører = false;
    this.rester = 0;
  }

  udloes({ x, y = 0.7, z, styrke = 3, id, kaede = 1 } = {}) {
    this.kontroller();
    if (![x, y, z, styrke].every(Number.isFinite) || styrke < 1 || styrke > 5 || Math.abs(x) > 70 || Math.abs(z) > 70 || y < 0 || y > 200) throw new Error("Pulsen har en ugyldig placering eller styrke.");
    if (!Number.isInteger(kaede) || kaede < 1 || kaede > 16) throw new Error("Kæden er ugyldig.");
    const kilde = id ? this.objekter.get(id) : null;
    if (kilde?.spec.type === "celle") {
      if (kilde.celle === "brugt") return false;
      kilde.celle = "brugt";
      this.plan = this.plan.filter(p => p.objekt !== kilde);
    }
    this.startet = true;
    this.kører = true;
    this.opdaterPoser();
    const position = [x, y, z];
    const radius = 3.5 + styrke * 1.5;
    const skub = new Map();
    const berørte = new Set();
    this.pulser++;
    this.kæde = Math.max(this.kæde, kaede);
    this.hændelse("puls", position, styrke / 5, "energi", kaede, kilde?.spec.id);
    for (const del of this.dele.values()) {
      const fra = minus(del.p, position);
      const afstand = længde(fra);
      if (afstand > radius) continue;
      const fald = Math.pow(1 - afstand / radius, 1.35);
      const påvirkning = fald * (0.25 + styrke * 0.49);
      skub.set(del, { retning: afstand < 0.001 ? [this.tilfældig() - 0.5, 1, this.tilfældig() - 0.5] : fra.map(n => n / afstand), fald });
      if (del.objekt.spec.type === "celle" && del.objekt !== kilde && fald > 0.08) this.planlæg(del.objekt, kaede + 1, 0.14 + this.tilfældig() * 0.14);
      if (del.objekt.spec.type === "bil" && påvirkning > 0.08) del.objekt.fri = true;
      this.skad(del, påvirkning, kaede);
      berørte.add(del.objekt);
    }
    for (const objekt of berørte) this.opdaterStøtte(objekt);
    for (const gruppe of this.grupper) {
      if (!gruppe.aktiv) continue;
      const bidrag = gruppe.dele.filter(del => skub.has(del));
      if (!bidrag.length) continue;
      const kraft = bidrag.reduce((sum, del) => {
        const { retning, fald } = skub.get(del);
        return plus(sum, [retning[0] * fald, (Math.max(0.15, retning[1]) + 0.32) * fald, retning[2] * fald]);
      }, [0, 0, 0]).map(n => n / gruppe.dele.length);
      const faktor = (3 + styrke * 1.35) * gruppe.krop.mass();
      gruppe.krop.applyImpulse(vektor(kraft.map(n => n * faktor)), true);
      gruppe.krop.applyTorqueImpulse({ x: (this.tilfældig() - 0.5) * faktor * 0.16, y: (this.tilfældig() - 0.5) * faktor * 0.12, z: (this.tilfældig() - 0.5) * faktor * 0.16 }, true);
    }
    return true;
  }

  opdaterPoser() {
    for (const gruppe of this.grupper) {
      const p = liste(gruppe.krop.translation()), q = kvat(gruppe.krop.rotation());
      for (const del of gruppe.dele) {
        del.p = plus(p, drej(del.lokalP, q));
        del.q = gang(q, del.lokalQ);
      }
    }
  }

  // Kontaktkraft alene er også vægten på gulvet; kræv derfor et egentligt nedslag.
  kontakter() {
    const slag = [];
    this.kø.drainContactForceEvents(h => {
      if (slag.length >= 120) return;
      const a = this.kollider.get(h.collider1()), b = this.kollider.get(h.collider2());
      if (!a && !b) return;
      const ga = a?.gruppe, gb = b?.gruppe;
      const fart = længde(minus(ga?.fart ?? [0, 0, 0], gb?.fart ?? [0, 0, 0]));
      if (fart < 1.7 || h.totalForceMagnitude() < 10) return;
      const ids = [a?.id ?? "jord", b?.id ?? "jord"].sort();
      const nøgle = ids.join("|");
      if (this.tid - (this.parTid.get(nøgle) ?? -100) < 0.3) return;
      this.parTid.delete(nøgle);
      this.parTid.set(nøgle, this.tid);
      if (this.parTid.size > 2048) this.parTid.delete(this.parTid.keys().next().value);
      const bevægelig = ga?.aktiv ? ga : gb;
      const påvirkning = klip((fart - 1.7) * 0.13 * Math.sqrt(Math.min(12, bevægelig?.krop.mass() ?? 1)), 0, 2);
      slag.push({ a, b, påvirkning, position: a && b ? plus(a.p, b.p).map(n => n / 2) : [...(a ?? b).p] });
    });
    const berørte = new Set();
    for (const { a, b, påvirkning, position } of slag) {
      const materiale = (a ?? b).materiale;
      this.hændelse("kontakt", position, påvirkning / 2, materiale, this.kæde, (a ?? b).objekt.spec.id);
      for (const del of [a, b]) {
        if (!del) continue;
        if (del.objekt.spec.type === "celle" && påvirkning > 0.16) this.planlæg(del.objekt, Math.min(16, this.kæde + 1), 0.15);
        if (del.objekt.spec.type === "bil" && påvirkning > 0.3) del.objekt.fri = true;
        if (this.skad(del, påvirkning, this.kæde) || del.objekt.fri) berørte.add(del.objekt);
      }
    }
    for (const objekt of berørte) this.opdaterStøtte(objekt);
    if (this.parTid.size > 1800) for (const [nøgle, tid] of this.parTid) if (this.tid - tid > 1) this.parTid.delete(nøgle);
  }

  tick(dt) {
    this.kontroller();
    if (!Number.isFinite(dt) || dt < 0) throw new Error("Tiden i forsøget er ugyldig.");
    if (!this.kører) return;
    this.rester = Math.min(this.rester + Math.min(dt, 0.1), TRIN * 3);
    let trin = 0;
    while (this.rester + 1e-9 >= TRIN && trin++ < 3) {
      this.tid += TRIN;
      this.rester -= TRIN;
      // En endelig kø og højst otte celler holder også kæden af forsinkede pulser lille.
      while (this.plan.length && this.plan[0].tid <= this.tid) {
        const { objekt, kaede } = this.plan.shift();
        if (objekt.celle !== "planlagt") continue;
        const p = objekt.dele[0].p;
        this.udloes({ x: p[0], y: Math.max(0.1, p[1]), z: p[2], styrke: objekt.spec.styrke, id: objekt.spec.id, kaede: Math.min(16, kaede) });
      }
      for (const gruppe of this.grupper) { gruppe.fart = liste(gruppe.krop.linvel()); gruppe.drej = liste(gruppe.krop.angvel()); }
      this.verden.step(this.kø);
      this.opdaterPoser();
      this.kontakter();
      // Hold ekstreme numeriske hastigheder og bortfløjne brokker inden for banen.
      for (const gruppe of this.grupper) {
        if (!gruppe.aktiv) continue;
        const p = gruppe.krop.translation(), v = liste(gruppe.krop.linvel());
        if (![p.x, p.y, p.z, ...v].every(Number.isFinite)) {
          gruppeSikker(gruppe);
        } else {
          const fart = længde(v);
          if (fart > 40) gruppe.krop.setLinvel(vektor(v.map(n => n * 40 / fart)), true);
          if (p.y < -8 || Math.abs(p.x) > 65 || Math.abs(p.z) > 65) gruppe.krop.sleep();
        }
      }
    }
  }

  hentDele() {
    this.kontroller();
    this.opdaterPoser();
    return [...this.dele.values()].map(del => ({ id: del.id, objekt: del.objekt.spec.id, type: del.objekt.spec.type, del: del.del,
      p: [...del.p], q: [...del.q], skade: del.skade, aktiv: del.gruppe.aktiv }));
  }

  hentHaendelser() {
    this.kontroller();
    return this.hændelser.splice(0);
  }

  hentResultater() {
    this.kontroller();
    return [...this.objekter.values()].map(objekt => ({ id: objekt.spec.id, type: objekt.spec.type,
      navn: this.opskrifter[objekt.spec.type].navn,
      skade: objekt.dele.reduce((sum, del) => sum + del.skade * del.masse, 0) / objekt.dele.reduce((sum, del) => sum + del.masse, 0),
      brud: objekt.dele.filter(del => del.brudt).length, dele: objekt.dele.length, brugt: objekt.spec.type === "celle" && objekt.celle === "brugt" }));
  }

  hentStatus() {
    this.kontroller();
    return { kører: this.kører, startet: this.startet, tid: this.tid, objekter: this.objekter.size, dele: this.dele.size,
      aktive: [...this.grupper].filter(g => g.aktiv && !g.krop.isSleeping()).length,
      pulser: this.pulser, kaede: this.kæde, planlagte: this.plan.length, kvalitet: this.kvalitet };
  }

  ryd() {
    this.kontroller();
    for (const gruppe of [...this.grupper]) this.sletGruppe(gruppe);
    this.objekter.clear(); this.dele.clear(); this.kollider.clear(); this.parTid.clear();
    this.hændelser.length = 0; this.plan.length = 0;
    this.tid = 0; this.rester = 0; this.pulser = 0; this.kæde = 0; this.kører = false; this.startet = false;
    this.frø = this.startFrø;
  }

  frigiv() {
    if (this.frigivet) return;
    this.ryd();
    this.kø.free(); this.verden.free();
    this.frigivet = true;
  }
}

// Denne nødstopgren må aldrig sende NaN videre til kamera eller grafik.
function gruppeSikker(gruppe) {
  gruppe.krop.setTranslation({ x: 0, y: -5, z: 0 }, false);
  gruppe.krop.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
  gruppe.krop.setLinvel({ x: 0, y: 0, z: 0 }, false);
  gruppe.krop.setAngvel({ x: 0, y: 0, z: 0 }, false);
  gruppe.krop.sleep();
}
