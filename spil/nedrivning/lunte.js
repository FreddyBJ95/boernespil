// ===== Lunterne: en snor, man trækker hen over jorden med fingeren =====
// Når der trykkes på tændingsboksen, tændes hver lunte i den ende, hvor man begyndte at trække.
// Gnisten løber langs lunten (1,4 m i sekundet), og når den når en tønde, en gasflaske, en kasse
// fyrværkeri eller en ladning, går den af. En lunte kan også blive tændt af en sprængning eller ild.

import * as THREE from "../3d-faelles/three.module.js";

const FART = 1.4, RADIAL = 5;
const r = (a, b) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3();

export class Lunter {
  constructor(ctx) {
    this.ctx = ctx; this.alle = []; this.tegning = null;
    this.mat = new THREE.MeshStandardMaterial({ color: 0x3b2c1e, roughness: 0.85 });
    this.hætteMat = new THREE.MeshStandardMaterial({ color: 0xd06a1a, roughness: 0.5 });
    this.stregMat = new THREE.LineBasicMaterial({ color: 0xffd23a });
  }
  tøm() {
    for (const l of this.alle) this.fjernVisning(l);
    this.alle = []; this.annullér();
  }
  længde() { return this.alle.reduce((s, l) => s + (l.spiller ? l.total : 0), 0); }

  // ---------- Tegn en lunte ----------
  begynd(p) {
    this.annullér();
    const geo = new THREE.BufferGeometry().setFromPoints([p, p]);
    const streg = new THREE.Line(geo, this.stregMat); streg.frustumCulled = false; streg.renderOrder = 15;
    this.ctx.scene.add(streg);
    this.tegning = { punkter: [p.clone().setY(p.y + 0.03)], længde: 0, streg };
  }
  // Et nyt punkt (højst så langt, som der er lunte til)
  tilføj(p, maks) {
    const t = this.tegning; if (!t) return;
    const q = p.clone().setY(p.y + 0.03), sidste = t.punkter[t.punkter.length - 1], a = q.distanceTo(sidste);
    if (a < 0.3 || t.længde + a > maks) return;
    t.punkter.push(q); t.længde += a;
    t.streg.geometry.dispose(); t.streg.geometry = new THREE.BufferGeometry().setFromPoints(t.punkter);
  }
  afslut(spiller = true) {
    const t = this.tegning; this.annullér();
    if (!t || t.punkter.length < 2 || t.længde < 0.6) return null;
    return this.lav(t.punkter, spiller);
  }
  annullér() {
    if (this.tegning) { this.ctx.scene.remove(this.tegning.streg); this.tegning.streg.geometry.dispose(); }
    this.tegning = null;
  }
  // En færdig lunte langs punkterne
  lav(punkter, spiller = true) {
    const afstande = [0];
    for (let i = 1; i < punkter.length; i++) afstande.push(afstande[i - 1] + punkter[i].distanceTo(punkter[i - 1]));
    const total = afstande[afstande.length - 1], segmenter = Math.max(8, Math.round(total * 4));
    const kurve = new THREE.CatmullRomCurve3(punkter, false, "centripetal");
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(kurve, segmenter, 0.035, RADIAL, false), this.mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const hætte = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10), this.hætteMat);
    hætte.position.copy(punkter[0]).setY(punkter[0].y + 0.04);
    this.ctx.scene.add(mesh, hætte);
    const l = { punkter, afstande, total, segmenter, kurve, mesh, hætte, tændt: false, færdig: false, front: 0, spiller, røgTid: 0 };
    this.alle.push(l);
    return l;
  }
  fjern(l) { this.fjernVisning(l); this.alle = this.alle.filter(x => x !== l); }
  fjernVisning(l) {
    for (const m of [l.mesh, l.hætte]) if (m) { this.ctx.scene.remove(m); m.geometry.dispose(); }
    l.mesh = l.hætte = null;
  }
  // Punktet på lunten, et stykke (meter) fra starten
  punktVed(l, s, ud = new THREE.Vector3()) {
    const a = l.afstande;
    let i = 1; while (i < a.length - 1 && a[i] < s) i++;
    const t = Math.max(0, Math.min(1, (s - a[i - 1]) / Math.max(1e-6, a[i] - a[i - 1])));
    return ud.copy(l.punkter[i - 1]).lerp(l.punkter[i], t);
  }

  // ---------- Brænd ----------
  tændAlle() { let n = 0; for (const l of this.alle) if (l.spiller && !l.tændt) { this.tænd(l, 0); n++; } return n; }
  tænd(l, fra) {
    if (l.tændt) return;
    l.tændt = true; l.front = fra;
    if (l.hætte) { this.ctx.scene.remove(l.hætte); l.hætte.geometry.dispose(); l.hætte = null; }
  }
  // En sprængning eller ild nær lunten tænder den dér, hvor den er tættest på
  nærPunkt(p, radius) {
    for (const l of this.alle) {
      if (l.tændt) continue;
      for (let i = 0; i < l.punkter.length; i++) if (l.punkter[i].distanceTo(p) < radius) { this.tænd(l, l.afstande[i]); break; }
    }
  }
  opdater(dt) {
    const { effekter, sprængstof } = this.ctx;
    let nær = null;
    for (const l of this.alle) {
      if (!l.tændt || l.færdig) continue;
      l.front += FART * dt;
      const p = this.punktVed(l, Math.min(l.front, l.total), tmp).clone();
      nær = p;
      // gnisterne og den lille røg, der følger gnisten
      for (let i = 0; i < 2; i++) effekter.gnister.nyt(p, new THREE.Vector3(r(-1, 1), r(0.5, 2), r(-1, 1)).multiplyScalar(r(1, 2.5)), r(0.2, 0.5), r(0.8, 1.3), 1, r(5, 9));
      l.røgTid -= dt;
      if (l.røgTid <= 0) { l.røgTid = 0.07; effekter.pust.nyt({ p, v: new THREE.Vector3(0, 0.6, 0), str: 0.12, slut: 0.6, vækst: 1.5, liv: r(1.2, 2), tæt: 0.5, farve: [0.55, 0.55, 0.55], vind: 1, løft: 0.4, bremse: 1 }); }
      // det, gnisten når, går af
      sprængstof.antændNær(p, 0.7);
      // den brændte del forsvinder
      if (l.mesh) l.mesh.geometry.setDrawRange(Math.floor(Math.min(1, l.front / l.total) * l.segmenter) * RADIAL * 6, Infinity);
      if (l.front >= l.total) { l.færdig = true; if (l.mesh) l.mesh.visible = false; }
    }
    return nær;                                                  // hvor lunten hvæser (til lyden)
  }
  aktiv() { return this.alle.some(l => l.tændt && !l.færdig); }
  // Den lunte, der ligger tættest på et punkt på skærmen (til "Fjern")
  tætPå(kamera, x, y, rect, maks = 22) {
    let bedst = null, bedstA = maks;
    for (const l of this.alle) {
      if (!l.spiller || l.tændt) continue;
      for (const q of l.punkter) {
        const s = q.clone().project(kamera);
        if (s.z > 1) continue;
        const a = Math.hypot((s.x + 1) / 2 * rect.width + rect.left - x, (1 - s.y) / 2 * rect.height + rect.top - y);
        if (a < bedstA) { bedstA = a; bedst = l; }
      }
    }
    return bedst;
  }
}
