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
function lavStøj(frø) {
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

export class Verden {
  constructor(frø, atlas, materiale, scene) {
    Object.assign(this, { frø, atlas, mat: materiale, scene });
    this.data = new Uint8Array(BX * BY * BZ);
    this.klumper = new Map();
    this.snavset = new Set();
    this.ændringer = new Map();
    this.fast = BLOKKE.map(b => !!b && !b.kryds);                      // kan ikke gå igennem
    this.dækker = BLOKKE.map(b => !!b && !b.gennemsigtig && !b.kryds); // skjuler naboens side
  }

  i(x, y, z) { return x + z * BX + y * BX * BZ; }
  inde(x, y, z) { return x >= 0 && x < BX && y >= 0 && y < BY && z >= 0 && z < BZ; }
  hent(x, y, z) {
    if (y < 0) return ID.Bundsten;
    return this.inde(x, y, z) ? this.data[this.i(x, y, z)] : 0;
  }
  erFast(x, y, z) {
    if (y < 0 || x < 0 || x >= BX || z < 0 || z >= BZ) return true;   // usynlige vægge ved kanten
    if (y >= BY) return false;
    return this.fast[this.data[this.i(x, y, z)]];
  }
  sæt(x, y, z, id) {
    if (!this.inde(x, y, z)) return false;
    const i = this.i(x, y, z);
    if (this.data[i] === id) return false;
    this.data[i] = id;
    this.ændringer.set(i, id);
    const m = (a, b, c) => { if (a >= 0 && b >= 0 && c >= 0 && a < BX / CS && b < BY / CS && c < BZ / CS) this.snavset.add(`${a},${b},${c}`); };
    const cx = x >> 4, cy = y >> 4, cz = z >> 4;
    m(cx, cy, cz);
    if ((x & 15) === 0) m(cx - 1, cy, cz); if ((x & 15) === 15) m(cx + 1, cy, cz);
    if ((y & 15) === 0) m(cx, cy - 1, cz); if ((y & 15) === 15) m(cx, cy + 1, cz);
    if ((z & 15) === 0) m(cx, cy, cz - 1); if ((z & 15) === 15) m(cx, cy, cz + 1);
    return true;
  }
  topY(x, z) {
    for (let y = BY - 1; y >= 0; y--) if (this.fast[this.hent(x, y, z)]) return y;
    return 0;
  }

  // ---------- Terræn ----------
  generer() {
    const R = rng(this.frø), støj = lavStøj(this.frø), top = new Int16Array(BX * BZ);
    const sæt = (x, y, z, id) => { if (this.inde(x, y, z)) this.data[this.i(x, y, z)] = id; };
    for (let x = 0; x < BX; x++) for (let z = 0; z < BZ; z++) {
      // bløde bakker — lidt fladere omkring midten, hvor man starter
      const midt = Math.min(1, Math.hypot(x - BX / 2, z - BZ / 2) / 14);
      const h = Math.round(10 + (støj(x / 18, z / 18) * 7 + støj(x / 7 + 50, z / 7 + 20) * 2.5 - 4.5) * (0.35 + 0.65 * midt));
      const sand = støj(x / 11 + 200, z / 11 + 100) > 0.7;
      for (let y = 0; y <= h; y++) {
        sæt(x, y, z, y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? (sand ? ID.Sand : ID.Jord) : (sand ? ID.Sand : ID["Græs"]));
      }
      top[x + z * BX] = h;
    }
    // træer
    for (let n = 0; n < 28; n++) {
      const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = top[x + z * BX];
      if (this.data[this.i(x, h, z)] !== ID["Græs"] || (Math.abs(x - BX / 2) < 5 && Math.abs(z - BZ / 2) < 5)) continue;
      const hs = 4 + Math.floor(R() * 2);
      for (let y = 1; y <= hs; y++) sæt(x, h + y, z, ID.Træstamme);
      for (let dy = -2; dy <= 1; dy++) {
        const r = dy >= 0 ? 1 : 2;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && R() < 0.7) continue;
          if (dy === 1 && Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
          if (this.hent(x + dx, h + hs + dy, z + dz) === 0) sæt(x + dx, h + hs + dy, z + dz, ID.Blade);
        }
      }
    }
    // blomster
    for (let n = 0; n < 70; n++) {
      const x = Math.floor(R() * BX), z = Math.floor(R() * BZ), h = top[x + z * BX];
      if (this.data[this.i(x, h, z)] === ID["Græs"] && this.hent(x, h + 1, z) === 0)
        sæt(x, h + 1, z, R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]);
    }
  }
  anvend(ændringer) {
    for (const [i, id] of Object.entries(ændringer || {})) {
      const n = +i;
      if (n >= 0 && n < this.data.length && BLOKKE[id] !== undefined) { this.data[n] = id; this.ændringer.set(n, id); }
    }
  }

  // ---------- 3D-model af blokkene (bygges i klumper på 16×16×16) ----------
  bygAlle() {
    for (let cx = 0; cx < BX / CS; cx++) for (let cy = 0; cy < BY / CS; cy++) for (let cz = 0; cz < BZ / CS; cz++) this.bygKlump(cx, cy, cz);
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
    const pos = [], uv = [], farve = [], idx = [];
    for (let y = cy * CS; y < cy * CS + CS; y++) for (let z = cz * CS; z < cz * CS + CS; z++) for (let x = cx * CS; x < cx * CS + CS; x++) {
      const id = this.data[this.i(x, y, z)];
      if (!id) continue;
      const b = BLOKKE[id];
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
    let m = this.klumper.get(nøgle);
    if (!pos.length) {
      if (m) { this.scene.remove(m); m.geometry.dispose(); this.klumper.delete(nøgle); }
      return;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(farve, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    if (m) { m.geometry.dispose(); m.geometry = g; }
    else { m = new THREE.Mesh(g, this.mat); this.scene.add(m); this.klumper.set(nøgle, m); }
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
  stråle(o, d, maks = 8) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const tdx = sx ? Math.abs(1 / d.x) : Infinity, tdy = sy ? Math.abs(1 / d.y) : Infinity, tdz = sz ? Math.abs(1 / d.z) : Infinity;
    let tx = sx > 0 ? (x + 1 - o.x) * tdx : sx < 0 ? (o.x - x) * tdx : Infinity;
    let ty = sy > 0 ? (y + 1 - o.y) * tdy : sy < 0 ? (o.y - y) * tdy : Infinity;
    let tz = sz > 0 ? (z + 1 - o.z) * tdz : sz < 0 ? (o.z - z) * tdz : Infinity;
    let t = 0, n = [0, 0, 0];
    while (t <= maks) {
      const id = this.hent(x, y, z);
      if (id && t > 0) return { x, y, z, id, n, t };
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
