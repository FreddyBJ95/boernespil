// ===== Fælles ting over familieserveren: de andre spilleres dyr fra æg og deres biler =====
// Hver tablet ejer de dyr, den selv har klækket, og de biler, den har sat eller kørt i, og sender dem til serveren
// et par gange i sekundet (server/ting.js). Her tegnes de andres ting: dyrene går, og bilerne kører derhen,
// hvor ejerens tablet siger — lidt blødt, så det ser roligt ud mellem beskederne.
// En bil har en fælles nøgle ("v2" for byens egne biler, ellers "<spiller>:<nr>"), så kun én tablet ejer den ad gangen:
// trykker man på en andens bil, overtager man den, og den forsvinder hos den gamle ejer.

import * as THREE from "./three.js";
import { Dyr } from "./dyr.js";
import { Bil, BILER } from "./biler.js";

const tmp = new THREE.Vector3();

export class FællesTing {
  // s: { scene, verden, dyrDef(id) → dyrets opskrift eller null,
  //      mine(nøgle) → "kører" | "står" | null (har jeg selv bilen?), slipBil(nøgle) (en anden har taget den),
  //      efterladt({ nøgle, slags, x, y, z, yaw }) (en af byens biler, som ejeren har forladt, bliver stående her) }
  constructor(s) { this.s = s; this.spillere = new Map(); this.pufede = new Map(); }   // spiller-id → Map(nr → ting) · pufede dyr → tid

  // En ny liste fra en anden spiller: nye ting laves, kendte får et nyt mål, forsvundne fjernes
  modtag(fra, liste) {
    let hans = this.spillere.get(fra);
    if (!hans) this.spillere.set(fra, hans = new Map());
    const set = new Set(), nu = performance.now();
    for (const t of liste) {
      if (t.s === "dyr" && nu - (this.pufede.get(`${fra}:${t.n}`) ?? -Infinity) < 2000) continue;   // lige blevet til konfetti
      const nøgle = t.s === "bil" ? (t.k || `${fra}:${t.n}`) : null;
      if (nøgle) {
        const her = this.s.mine(nøgle);
        if (her === "kører") continue;                              // jeg kører selv i den lige nu — vis ingen kopi
        if (her === "står") this.s.slipBil(nøgle);                  // en anden har taget min bil: den forsvinder her
        for (const [andenFra, andre] of this.spillere) {           // en tredje spiller havde den før: den nyeste vinder
          if (andenFra === fra) continue;
          for (const [n, a] of andre) if (a.nøgle === nøgle) { this.fjernTing(a); andre.delete(n); }
        }
      }
      set.add(t.n);
      let ting = hans.get(t.n);
      if (ting && (ting.s !== t.s || ting.id !== t.id || ting.nøgle !== nøgle)) { this.fjernTing(ting); hans.delete(t.n); ting = null; }
      if (!ting) { ting = this.lav(t, fra, nøgle); if (!ting) continue; hans.set(t.n, ting); }
      ting.mål.set(t.x, t.y, t.z); ting.målYaw = t.yaw; ting.lys = !!t.lys;
    }
    for (const [n, ting] of hans) if (!set.has(n)) { this.fjernTing(ting, true); hans.delete(n); }
  }

  // Lav et dyr eller en bil, der står, hvor den anden tablet siger
  lav(t, fra, nøgle) {
    const { scene, verden } = this.s, ting = { s: t.s, id: t.id, fra, n: t.n, nøgle, mål: new THREE.Vector3(t.x, t.y, t.z), målYaw: t.yaw, lys: false };
    if (t.s === "dyr") {
      const def = this.s.dyrDef(t.id);
      if (!def) return null;                                        // et dyr, denne tablet ikke kender (ældre spil)
      ting.dyr = new Dyr(def, verden, scene);
      ting.dyr.pos.set(t.x, t.y, t.z); ting.dyr.yaw = t.yaw; ting.dyr.klapTid = 0.5;
      return ting;
    }
    if (!BILER[t.id]) return null;
    ting.bil = new Bil(scene, verden, t.id);
    ting.bil.pos.set(t.x, t.y, t.z); ting.bil.yaw = ting.bil.tårnYaw = t.yaw; ting.bil.opdater(0);
    return ting;
  }

  // Hvert billede: dyrene går og bilerne glider hen mod deres mål
  opdater(dt, spiller) {
    const k = Math.min(1, dt * 8);
    for (const hans of this.spillere.values()) for (const ting of hans.values()) {
      if (ting.dyr) { ting.dyr.følgNet(dt, ting.mål, ting.målYaw, spiller); continue; }
      const b = ting.bil;
      if (b.pos.distanceToSquared(ting.mål) > 100) b.pos.copy(ting.mål); else b.pos.lerp(ting.mål, k);
      let dy = ting.målYaw - b.yaw;
      dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      b.yaw += dy * k; b.tårnYaw = b.yaw;
      if (b.sirene !== ting.lys) b.skiftSirene();                   // blinklysene, når ejeren har tændt sirenen
      b.opdater(dt);
    }
  }

  // Fjern en ting. Er det en af byens biler, som ejeren slipper (fx går fra verdenen), bliver den stående her
  fjernTing(ting, efterlad = false) {
    if (ting.dyr) { ting.dyr.fjern(); return; }
    const p = ting.bil.pos;
    if (efterlad && ting.nøgle?.startsWith("v")) this.s.efterladt?.({ nøgle: ting.nøgle, slags: ting.id, x: p.x, y: p.y, z: p.z, yaw: ting.bil.yaw });
    ting.bil.fjern();
  }
  fjernSpiller(fra) {
    const hans = this.spillere.get(fra);
    if (!hans) return;
    for (const ting of hans.values()) this.fjernTing(ting, true);
    this.spillere.delete(fra);
  }
  ryd() { for (const fra of [...this.spillere.keys()]) this.fjernSpiller(fra); }   // ny forbindelse: serveren sender alt igen

  // Tryk: den nærmeste af de andres biler på strålen (ligesom skyd.kampvognVed)
  bilVed(stråle, maks) {
    let bedst = null;
    for (const hans of this.spillere.values()) for (const ting of hans.values()) {
      if (!ting.bil) continue;
      const t = tmp.copy(ting.bil.pos).setY(ting.bil.pos.y + 1).sub(stråle.origin).dot(stråle.direction);
      if (t < 0 || t > maks) continue;
      const p = stråle.origin.clone().addScaledVector(stråle.direction, t);
      if (ting.bil.rammer(p, 0.2) && (!bedst || t < bedst.afst)) bedst = { ting, afst: t };
    }
    return bedst;
  }
  // Tryk: det nærmeste af de andres dyr (raycaster fra spillet)
  dyrVed(ray, maks) {
    let bedst = null;
    for (const hans of this.spillere.values()) for (const ting of hans.values()) {
      if (!ting.dyr) continue;
      const h = ray.intersectObject(ting.dyr.model, true)[0];
      if (h && h.distance < maks && (!bedst || h.distance < bedst.afst)) bedst = { ting, afst: h.distance };
    }
    return bedst;
  }
  // Overtag en andens bil: den fjernes her, og spillet laver sin egen på samme sted med samme nøgle
  overtag(ting) {
    const hans = this.spillere.get(ting.fra), b = ting.bil;
    hans?.delete(ting.n);
    const ud = { nøgle: ting.nøgle, slags: ting.id, x: b.pos.x, y: b.pos.y, z: b.pos.z, yaw: b.yaw, sirene: b.sirene };
    b.fjern();
    return ud;
  }
  // Fjern en andens dyr med det samme (fx en zombie, der er blevet til konfetti — ejeren fjerner den også)
  fjernDyr(ting) {
    this.spillere.get(ting.fra)?.delete(ting.n); ting.dyr.fjern();
    this.pufede.set(`${ting.fra}:${ting.n}`, performance.now());
    for (const [k, t] of this.pufede) if (performance.now() - t > 2000) this.pufede.delete(k);
  }
}
