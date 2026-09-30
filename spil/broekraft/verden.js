// ===== Verdenen: blokkene, terrænet, 3D-modellen af blokkene og kollision =====

import * as THREE from "./three.js";
import { BLOKKE, ID } from "./blokke.js";

export const BX = 64, BY = 32, BZ = 64;          // verdenens størrelse i blokke
export const HAV = 6.5;                            // havets højde rundt om øen
const CS = 16;                                     // blokke pr. klump (chunk) i hver retning

// Tilfældige tal og bløde bakker ud fra et "frø" (samme frø = samme verden)
export function rng(frø) {
  let a = frø >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function lavStøj(frø) {
  const h = (x, z) => {
    let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(frø, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  return (x, z) => {
    const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0;
    const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = h(x0, z0) + (h(x0 + 1, z0) - h(x0, z0)) * sx;
    const b = h(x0, z0 + 1) + (h(x0 + 1, z0 + 1) - h(x0, z0 + 1)) * sx;
    return a + (b - a) * sz;
  };
}

// De seks sider af en blok: retning, fire hjørner (mod uret set udefra), lysstyrke og tekstur-side
const FLADER = [
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], lys: 1.0, side: "top" },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], lys: 0.55, side: "bund" },
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], lys: 0.8, side: "side" },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], lys: 0.8, side: "side" },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], lys: 0.9, side: "side" },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], lys: 0.7, side: "side" },
];
for (const F of FLADER) F.t = [0, 1, 2].filter(a => F.n[a] === 0);   // de to akser langs fladen
const AO = [0.5, 0.68, 0.84, 1];                                      // mørkere i hjørner og kroge
const lin = l => Math.pow(l, 2.2);
// Hver klump tegnes i fem lag: faste blokke, vand (gennemsigtigt), lava (gløder), ild (blafrer) og portaler (hvirvler).
const LAG = ["fast", "vand", "lava", "ild", "portal"];
const lagNøgle = (nøgle, lag) => (lag === "fast" ? nøgle : `${nøgle}|${lag}`);
const nytLag = () => ({ pos: [], uv: [], farve: [], idx: [] });
const HJØRNER = [[-1, -1], [0, -1], [-1, 0], [0, 0]];

export class Verden {
  // mål: { BX, BY, BZ } — standard er den lille ø. online: true gemmer verdenen som søjler på 16×16,
  // som serveren sender én ad gangen (se søjle() og glemSøjle()).
  // uendelig: true er Uendelighedsverdenen: søjlerne laves på tabletten (uendelig.js), og det, børnene
  // bygger, huskes pr. søjle, så det kommer igen, når søjlen laves på ny.
  constructor(frø, atlas, materiale, scene, mål = {}) {
    Object.assign(this, { frø, atlas, mat: materiale, scene });
    this.BX = mål.BX || BX; this.BY = mål.BY || BY; this.BZ = mål.BZ || BZ;
    this.online = !!mål.online || !!mål.uendelig;
    this.uendelig = !!mål.uendelig;
    this.søjler = this.online ? new Map() : null;                      // søjle-nummer → blokkene i søjlen
    this.søjleÆndringer = new Map();                                    // uendelig: søjle-nummer → (plads → blok)
    this.data = this.online ? null : new Uint8Array(this.BX * this.BY * this.BZ);
    this.klumper = new Map();
    this.snavset = new Set();
    this.ændringer = new Map();
    this.fast = BLOKKE.map(b => !!b && !b.kryds && !b.væske && !b.portal);   // kan ikke gå igennem
    this.dækker = BLOKKE.map(b => !!b && !b.gennemsigtig && !b.kryds && !b.væske); // skjuler naboens side
    this.væske = BLOKKE.map(b => b?.væske || null);                    // "vand", "lava" eller null
    this.portal = BLOKKE.map(b => !!b?.portal);                        // lilla portal (spil.js sender en videre)
    this.animMat = null;                                               // { vand, lava, ild, portal } — sættes af spil.js
    this.gløder = new Map();                                           // klump → ild, lava og portaler (til gnister og bobler)
    this.vedÆndring = null;                                            // kaldes efter hver sæt() (simuleringen)
    this.hopper = BLOKKE.map(b => !!b && !!b.hopper);                 // trampolin
    this.tyngde = 28;
  }

  i(x, y, z) { return x + z * this.BX + y * this.BX * this.BZ; }
  inde(x, y, z) { return x >= 0 && x < this.BX && y >= 0 && y < this.BY && z >= 0 && z < this.BZ; }
  søjleNr(cx, cz) { return cx + cz * (this.BX >> 4); }
  søjleAf(x, z) { return this.søjler.get(this.søjleNr(x >> 4, z >> 4)); }
  hent(x, y, z) {
    if (y < 0) return ID.Bundsten;
    if (!this.inde(x, y, z)) return 0;
    if (this.online) { const s = this.søjleAf(x, z); return s ? s[(x & 15) + (z & 15) * 16 + y * 256] : 0; }
    return this.data[this.i(x, y, z)];
  }
  // Er søjlen hentet? (online: ellers venter spilleren på, at jorden under en er kommet)
  hentet(x, z) { return !this.online || !!(this.inde(x, 0, z) && this.søjleAf(x, z)); }
  erFast(x, y, z) {
    if (y < 0 || x < 0 || x >= this.BX || z < 0 || z >= this.BZ) return true;   // usynlige vægge ved kanten
    if (y >= this.BY) return false;
    if (this.online && !this.søjleAf(x, z)) return true;                         // ikke hentet endnu
    return this.fast[this.hent(x, y, z)];
  }
  sæt(x, y, z, id) {
    if (!this.inde(x, y, z)) return false;
    if (this.online) {
      const s = this.søjleAf(x, z), j = (x & 15) + (z & 15) * 16 + y * 256;
      if (!s || s[j] === id) return false;
      s[j] = id;
      if (this.uendelig) this.husk(x, y, z, id);
    } else {
      const i = this.i(x, y, z);
      if (this.data[i] === id) return false;
      this.data[i] = id;
      this.ændringer.set(i, id);
    }
    const cx = x >> 4, cy = y >> 4, cz = z >> 4;
    this.snavs(cx, cy, cz);
    if ((x & 15) === 0) this.snavs(cx - 1, cy, cz); if ((x & 15) === 15) this.snavs(cx + 1, cy, cz);
    if ((y & 15) === 0) this.snavs(cx, cy - 1, cz); if ((y & 15) === 15) this.snavs(cx, cy + 1, cz);
    if ((z & 15) === 0) this.snavs(cx, cy, cz - 1); if ((z & 15) === 15) this.snavs(cx, cy, cz + 1);
    if (this.vedÆndring) this.vedÆndring(x, y, z);
    return true;
  }
  // Markér en 16×16×16-klump til at blive bygget om
  snavs(cx, cy, cz) {
    if (cx >= 0 && cy >= 0 && cz >= 0 && cx < this.BX / CS && cy < this.BY / CS && cz < this.BZ / CS) this.snavset.add(`${cx},${cy},${cz}`);
  }

  // ---------- Online: søjler fra serveren ----------
  søjle(cx, cz, data) {
    if (cx < 0 || cz < 0 || cx >= this.BX >> 4 || cz >= this.BZ >> 4) return;
    const højde = data.length / 256;
    const s = højde === this.BY ? data : new Uint8Array(256 * this.BY);
    if (s !== data) s.set(data.subarray(0, Math.min(data.length, s.length)));
    this.søjler.set(this.søjleNr(cx, cz), s);
    if (this.uendelig) {                                // det, børnene har bygget her før
      for (const [i, id] of this.søjleÆndringer.get(this.søjleNr(cx, cz)) || []) {
        const { x, y, z } = this.sted(i);
        s[(x & 15) + (z & 15) * 16 + y * 256] = id;
      }
    }
    // byg søjlen og kanten af naboerne om (de viste sider ud mod "ingenting" før)
    for (let cy = 0; cy < this.BY / CS; cy++) {
      this.snavs(cx, cy, cz);
      this.snavs(cx - 1, cy, cz); this.snavs(cx + 1, cy, cz); this.snavs(cx, cy, cz - 1); this.snavs(cx, cy, cz + 1);
    }
  }
  // stille: naboerne skal ikke bygges om (Uendelighedsverdenen glemmer land langt væk, som ingen kan se)
  glemSøjle(cx, cz, stille = false) {
    if (cx < 0 || cz < 0 || cx >= this.BX >> 4 || cz >= this.BZ >> 4) return;
    this.søjler.delete(this.søjleNr(cx, cz));
    for (let cy = 0; cy < this.BY / CS; cy++) {
      this.fjernKlump(`${cx},${cy},${cz}`);
      this.snavset.delete(`${cx},${cy},${cz}`);
      if (!stille) { this.snavs(cx - 1, cy, cz); this.snavs(cx + 1, cy, cz); this.snavs(cx, cy, cz - 1); this.snavs(cx, cy, cz + 1); }
    }
  }
  rydAlt() {                                    // ny tilslutning: glem alt og vent på nye søjler
    if (this.online) this.søjler.clear();
    for (const m of this.klumper.values()) { this.scene.remove(m); m.geometry.dispose(); }
    this.klumper.clear();
    this.gløder.clear();
    this.snavset.clear();
  }
  // Uendelig: husk en ændring (også pr. søjle), og læs de gemte ændringer ind
  sted(i) { return { x: i % this.BX, z: Math.floor(i / this.BX) % this.BZ, y: Math.floor(i / (this.BX * this.BZ)) }; }
  husk(x, y, z, id) {
    const i = this.i(x, y, z), k = this.søjleNr(x >> 4, z >> 4);
    this.ændringer.set(i, id);
    let æ = this.søjleÆndringer.get(k);
    if (!æ) this.søjleÆndringer.set(k, æ = new Map());
    æ.set(i, id);
  }
  indlæsÆndringer(ændringer) {
    for (const [i, id] of Object.entries(ændringer || {})) {
      const n = +i;
      if (!Number.isFinite(n) || n < 0 || BLOKKE[id] === undefined) continue;
      const { x, y, z } = this.sted(n);
      if (this.inde(x, y, z)) this.husk(x, y, z, id);
    }
  }
  fjernKlump(nøgle) {
    for (const lag of LAG) this.fjernLag(lagNøgle(nøgle, lag));
    this.gløder.delete(nøgle);
  }
  fjernLag(k) {
    const m = this.klumper.get(k);
    if (m) { this.scene.remove(m); m.geometry.dispose(); this.klumper.delete(k); }
  }
  // Står kassen (med fødderne i p) på en trampolin-blok?
  hopperUnder(p, b) {
    const y = Math.floor(p.y - 0.05);
    for (const [dx, dz] of [[0, 0], [-b, -b], [b, -b], [-b, b], [b, b]]) if (this.hopper[this.hent(Math.floor(p.x + dx), y, Math.floor(p.z + dz))]) return true;
    return false;
  }
  topY(x, z) {
    for (let y = this.BY - 1; y >= 0; y--) if (this.fast[this.hent(x, y, z)]) return y;
    return 0;
  }

  // ---------- Terræn ----------
  // Hver verden har sin egen opskrift (se verdener.js). Den får et lille værktøjssæt:
  // sæt/hent blokke, tilfældige tal (R), bløde bakker (støj), terræn(), pynt() og top[] = højeste blok.
  generer(opskrift) {
    const { BX, BY, BZ } = this;
    const R = rng(this.frø), støj = lavStøj(this.frø), top = new Int16Array(BX * BZ);
    const a = {
      R, støj, ID, BX, BY, BZ, top,
      antal: n => Math.round(n * (BX * BZ) / 4096),
      sæt: (x, y, z, id) => { if (this.inde(x, y, z)) this.data[this.i(x, y, z)] = id; },
      hent: (x, y, z) => this.hent(x, y, z),
      nærStart: (x, z, r) => Math.abs(x - BX / 2) < r && Math.abs(z - BZ / 2) < r,
      // fyld jorden: højde(x, z) giver overfladens højde, lag(x, z, y, h) giver blokken i højde y
      terræn: (højde, lag) => {
        for (let x = 0; x < BX; x++) for (let z = 0; z < BZ; z++) {
          const h = Math.max(1, Math.min(BY - 6, højde(x, z)));
          for (let y = 0; y <= h; y++) a.sæt(x, y, z, lag(x, z, y, h));
          top[x + z * BX] = h;
        }
      },
      // strø n ting ud oven på overfladen, men kun hvor den øverste blok er en af "på"
      pynt: (n, vælg, på) => {
        for (let k = 0; k < n; k++) {
          const x = Math.floor(R() * BX), z = Math.floor(R() * BZ), h = top[x + z * BX];
          if (på.includes(a.hent(x, h, z)) && a.hent(x, h + 1, z) === 0) a.sæt(x, h + 1, z, typeof vælg === "function" ? vælg() : vælg);
        }
      },
    };
    opskrift(a);
  }
  anvend(ændringer) {
    for (const [i, id] of Object.entries(ændringer || {})) {
      const n = +i;
      if (this.data && n >= 0 && n < this.data.length && BLOKKE[id] !== undefined) { this.data[n] = id; this.ændringer.set(n, id); }
    }
  }

  // ---------- 3D-model af blokkene (bygges i klumper på 16×16×16) ----------
  bygAlle() {
    for (let cx = 0; cx < this.BX / CS; cx++) for (let cy = 0; cy < this.BY / CS; cy++) for (let cz = 0; cz < this.BZ / CS; cz++) this.bygKlump(cx, cy, cz);
  }
  // Byg klumperne tæt på (x, z) med det samme — resten kommer lidt efter lidt, de nærmeste først
  bygOmkring(x, z, r = 3) {
    if (this.online) return;                            // søjle-verdener bygges, efterhånden som søjlerne kommer
    const cx0 = Math.floor(x / CS), cz0 = Math.floor(z / CS), alle = [];
    for (let cx = 0; cx < this.BX / CS; cx++) for (let cy = 0; cy < this.BY / CS; cy++) for (let cz = 0; cz < this.BZ / CS; cz++) alle.push([cx, cy, cz, Math.hypot(cx - cx0, cz - cz0)]);
    alle.sort((a, b) => a[3] - b[3]);
    for (const [cx, cy, cz, d] of alle) { if (d <= r) this.bygKlump(cx, cy, cz); else this.snavset.add(`${cx},${cy},${cz}`); }
  }
  opdater(maks = 4) {
    let n = 0;
    for (const k of this.snavset) {
      this.snavset.delete(k);
      const [cx, cy, cz] = k.split(",").map(Number);
      this.bygKlump(cx, cy, cz);
      if (++n >= maks) break;
    }
  }
  ao(x, y, z, F, c) {
    const bx = x + F.n[0], by = y + F.n[1], bz = z + F.n[2], [a, b] = F.t;
    const d1 = [0, 0, 0], d2 = [0, 0, 0];
    d1[a] = c[a] ? 1 : -1; d2[b] = c[b] ? 1 : -1;
    const s1 = this.dækker[this.hent(bx + d1[0], by + d1[1], bz + d1[2])] ? 1 : 0;
    const s2 = this.dækker[this.hent(bx + d2[0], by + d2[1], bz + d2[2])] ? 1 : 0;
    const hj = this.dækker[this.hent(bx + d1[0] + d2[0], by + d1[1] + d2[1], bz + d1[2] + d2[2])] ? 1 : 0;
    return s1 && s2 ? 0 : 3 - s1 - s2 - hj;
  }
  bygKlump(cx, cy, cz) {
    const lag = { fast: nytLag(), vand: nytLag(), lava: nytLag(), ild: nytLag(), portal: nytLag() }, gløder = { ild: [], lava: [], portal: [] };
    const { pos, uv, farve, idx } = lag.fast;
    for (let y = cy * CS; y < cy * CS + CS; y++) for (let z = cz * CS; z < cz * CS + CS; z++) for (let x = cx * CS; x < cx * CS + CS; x++) {
      const id = this.hent(x, y, z);
      if (!id) continue;
      const b = BLOKKE[id];
      if (!b) continue;                                            // ukendt blok — spring over
      if (b.væske) {
        this.væskeFlader(x, y, z, id, lag[b.væske]);
        if (b.væske === "lava" && this.væske[this.hent(x, y + 1, z)] !== "lava") gløder.lava.push([x, y, z]);
        continue;
      }
      if (b.ild) { this.flammer(x, y, z, lag.ild); gløder.ild.push([x, y, z]); continue; }
      if (b.portal) { this.portalFlade(x, y, z, lag.portal); gløder.portal.push([x, y, z]); continue; }
      if (b.kryds) { this.kryds(x, y, z, id, pos, uv, farve, idx); continue; }
      for (const F of FLADER) {
        const nid = this.hent(x + F.n[0], y + F.n[1], z + F.n[2]);
        if (this.dækker[nid] || (b.gennemsigtig && nid === id)) continue;
        const [u0, v0, u1, v1] = this.atlas.uv(id, F.side), ao = [];
        for (let k = 0; k < 4; k++) {
          const c = F.v[k];
          pos.push(x + c[0], y + c[1], z + c[2]);
          ao.push(b.lyser ? 3 : this.ao(x, y, z, F, c));
          const l = lin(b.lyser ? 1 : F.lys * AO[ao[k]]);
          farve.push(l, l, l);
        }
        uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
        const s = pos.length / 3 - 4;
        if (ao[0] + ao[2] < ao[1] + ao[3]) idx.push(s + 1, s + 2, s + 3, s + 1, s + 3, s);
        else idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
      }
    }
    const nøgle = `${cx},${cy},${cz}`;
    for (const navn of LAG) this.sætLag(nøgle, navn, lag[navn]);
    if (gløder.ild.length || gløder.lava.length || gløder.portal.length) this.gløder.set(nøgle, gløder); else this.gløder.delete(nøgle);
  }
  sætLag(nøgle, navn, { pos, uv, farve, idx }) {
    const k = lagNøgle(nøgle, navn);
    let m = this.klumper.get(k);
    if (!pos.length) { this.fjernLag(k); return; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(farve, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    if (m) { m.geometry.dispose(); m.geometry = g; return; }
    m = new THREE.Mesh(g, navn === "fast" ? this.mat : this.animMat?.[navn] || this.mat);
    if (navn === "vand" || navn === "portal") m.renderOrder = navn === "vand" ? 1 : 2;   // det gennemsigtige tegnes efter alt det faste
    const [cx, , cz] = nøgle.split(",").map(Number);
    m.userData.midt = [cx * CS + CS / 2, cz * CS + CS / 2];          // klumpens midte (til at skjule klumper langt væk)
    this.scene.add(m); this.klumper.set(k, m);
  }
  // Skjul klumper, der er længere væk end man kan se (tågen) — så får store verdener meget mindre at tegne
  skjulFjerne(x, z, maks) {
    const m2 = (maks + CS) * (maks + CS);
    for (const m of this.klumper.values()) {
      const [mx, mz] = m.userData.midt;
      m.visible = (mx - x) * (mx - x) + (mz - z) * (mz - z) < m2;
    }
  }

  // ---------- Vand og lava: overfladen er lavere, jo tyndere strømmen er ----------
  væskeHøjde(id) {
    const b = BLOKKE[id], maks = b.væske === "vand" ? 7 : 3;
    return (maks + 1 - b.niveau) / (maks + 2);
  }
  // Højden i et hjørne er et gennemsnit af de fire blokke omkring det, så strømme skråner blødt nedad
  hjørne(x, y, z, type) {
    let sum = 0, n = 0;
    for (const [dx, dz] of HJØRNER) {
      const id = this.hent(x + dx, y, z + dz);
      if (this.væske[id] === type) {
        if (this.væske[this.hent(x + dx, y + 1, z + dz)] === type) return 1;
        const w = BLOKKE[id].niveau ? 1 : 4;                        // kilder vejer mest
        sum += this.væskeHøjde(id) * w; n += w;
      } else if (!this.fast[id]) n += 1;                          // luft ved siden af trækker kanten ned
    }
    return n ? Math.max(0.06, sum / n) : 0.06;
  }
  væskeFlader(x, y, z, id, { pos, uv, farve, idx }) {
    const type = this.væske[id], lyser = BLOKKE[id].lyser;
    const fuld = this.væske[this.hent(x, y + 1, z)] === type;
    const h = fuld ? [1, 1, 1, 1] : [this.hjørne(x, y, z, type), this.hjørne(x + 1, y, z, type), this.hjørne(x + 1, y, z + 1, type), this.hjørne(x, y, z + 1, type)];
    const top = (a, b) => h[a ? (b ? 2 : 1) : (b ? 3 : 0)];
    for (const F of FLADER) {
      const nid = this.hent(x + F.n[0], y + F.n[1], z + F.n[2]);
      if (this.væske[nid] === type) continue;                      // samme væske ved siden af: ingen væg
      if (F.n[1] !== 1 && this.dækker[nid]) continue;             // toppen vises altid (der er luft over den)
      const l = lin(lyser ? 1 : F.lys), s = pos.length / 3;
      for (const c of F.v) {
        const vy = c[1] ? top(c[0], c[2]) : 0;
        pos.push(x + c[0], y + vy, z + c[2]);
        farve.push(l, l, l);
        if (F.n[1]) uv.push(x + c[0], z + c[2]);                   // mønstret følger verden, så det går i ét
        else if (F.n[0]) uv.push(z + c[2], y + vy);
        else uv.push(x + c[0], y + vy);
      }
      idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    }
  }
  // Ild: to skrå flammer på kryds og fire langs kanterne (materialet viser én ramme ad gangen)
  flammer(x, y, z, { pos, uv, farve, idx }) {
    const H = 1.1, i = 0.14, spejl = (x + z) & 1;
    const kvadrater = [
      [[0, 0, 0], [1, 0, 1], [1, H, 1], [0, H, 0]], [[1, 0, 0], [0, 0, 1], [0, H, 1], [1, H, 0]],
      [[i, 0, 0], [i, 0, 1], [i, H, 1], [i, H, 0]], [[1 - i, 0, 1], [1 - i, 0, 0], [1 - i, H, 0], [1 - i, H, 1]],
      [[1, 0, i], [0, 0, i], [0, H, i], [1, H, i]], [[0, 0, 1 - i], [1, 0, 1 - i], [1, H, 1 - i], [0, H, 1 - i]],
    ];
    const u0 = spejl ? 1 : 0, u1 = 1 - u0, v0 = 0.02, v1 = 0.98;
    for (const q of kvadrater) {
      const s = pos.length / 3;
      for (const c of q) { pos.push(x + c[0], y + c[1], z + c[2]); farve.push(1, 1, 1); }
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    }
  }
  // Portal: en tynd, lilla hinde midt i blokken, på langs af rammen (materialet får den til at hvirvle)
  portalLangsX(x, y, z) {
    const p = (a, b, c) => this.portal[this.hent(a, b, c)];
    if (p(x - 1, y, z) || p(x + 1, y, z)) return true;
    if (p(x, y, z - 1) || p(x, y, z + 1)) return false;
    return this.fast[this.hent(x - 1, y, z)] && this.fast[this.hent(x + 1, y, z)];   // én blok bred: rammen står på siderne
  }
  portalFlade(x, y, z, { pos, uv, farve, idx }) {
    const langsX = this.portalLangsX(x, y, z), s = pos.length / 3;
    const hjørner = langsX ? [[0, 0, 0.5], [1, 0, 0.5], [1, 1, 0.5], [0, 1, 0.5]] : [[0.5, 0, 1], [0.5, 0, 0], [0.5, 1, 0], [0.5, 1, 1]];
    for (const c of hjørner) { pos.push(x + c[0], y + c[1], z + c[2]); farve.push(1, 1, 1); }
    uv.push(0, 0.01, 1, 0.01, 1, 0.99, 0, 0.99);
    idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
  }
  kryds(x, y, z, id, pos, uv, farve, idx) {     // blomster: to skrå flader på kryds
    const [u0, v0, u1, v1] = this.atlas.uv(id, "side");
    const kvadrater = [
      [[0.15, 0, 0.15], [0.85, 0, 0.85], [0.85, 1, 0.85], [0.15, 1, 0.15]],
      [[0.85, 0, 0.15], [0.15, 0, 0.85], [0.15, 1, 0.85], [0.85, 1, 0.15]],
    ];
    for (const q of kvadrater) for (const vend of [false, true]) {
      const s = pos.length / 3;
      for (const c of q) { pos.push(x + c[0], y + c[1], z + c[2]); farve.push(1, 1, 1); }
      uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      if (vend) idx.push(s, s + 2, s + 1, s, s + 3, s + 2); else idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    }
  }

  // ---------- Stråle: hvilken blok peger man på? ----------
  stråle(o, d, maks = 8, medVæske = false) {          // vand, lava og portaler rammes kun med medVæske
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
    let tx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
    let ty = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
    let tz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
    let t = 0, n = [0, 0, 0];
    while (t <= maks) {
      const id = this.hent(x, y, z);
      if (id && t > 0 && (medVæske || (!this.væske[id] && !this.portal[id]))) return { x, y, z, id, n, t };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; n = [-sx, 0, 0]; }
      else if (ty < tz) { y += sy; t = ty; ty += tdy; n = [0, -sy, 0]; }
      else { z += sz; t = tz; tz += tdz; n = [0, 0, -sz]; }
    }
    return null;
  }

  // ---------- Kollision for spiller og dyr (en kasse: halv bredde b, højde h) ----------
  kolliderer(p, b, h) {
    const x0 = Math.floor(p.x - b), x1 = Math.floor(p.x + b), y0 = Math.floor(p.y), y1 = Math.floor(p.y + h);
    const z0 = Math.floor(p.z - b), z1 = Math.floor(p.z + b);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.erFast(x, y, z)) return true;
    return false;
  }
  // Flyt kassen med d, akse for akse, og stop ved blokke. Svarer om den ramte jord, væg eller loft.
  bevæg(p, d, b, h) {
    const svar = { jord: false, væg: false, loft: false };
    const trin = Math.max(1, Math.ceil(Math.max(Math.abs(d.x), Math.abs(d.y), Math.abs(d.z)) / 0.3));
    const stop = { x: false, y: false, z: false };
    for (let i = 0; i < trin; i++) {
      for (const a of ["y", "x", "z"]) {
        const s = d[a] / trin;
        if (!s || stop[a]) continue;
        const før = p[a];
        p[a] += s;
        if (!this.kolliderer(p, b, h)) continue;
        if (a === "y") {
          if (s < 0) { p.y = Math.floor(p.y) + 1; svar.jord = true; } else { p.y = Math.floor(p.y + h) - h - 0.001; svar.loft = true; }
        } else {
          p[a] = s > 0 ? Math.floor(p[a] + b) - b - 0.001 : Math.floor(p[a] - b) + 1 + b + 0.001;
          svar.væg = true;
        }
        if (this.kolliderer(p, b, h)) p[a] = før;
        stop[a] = true;
      }
    }
    return svar;
  }
}
