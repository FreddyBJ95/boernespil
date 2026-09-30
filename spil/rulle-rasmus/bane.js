// ===== Banen: den vej Rasmus triller på =====
// En bane er en liste af stykker (se baner.js). Ud fra dem lægges et punkt for hver kvarte meter
// med retning, bredde og højde. Punkterne bruges både til at tegne banen og til at mærke,
// om Rasmus stadig er på den.
//
// Stykker kan have:
//   lige: meter · sving: grader (+ = højre) og r: radius · hul: meter uden bane (et hop)
//   bakke: op/ned i meter · rampe: hop-rampe i meter · bølger: [højde, antal] små bakker
//   bredde · rende: hvor meget kanterne går op (en rende holder Rasmus inde) · kant: rækværk (true/false)
//   is: glat · flag: genstart her · mål: målstregen · frugt: sideværts placering · puder: [sideværts, …]
//   trampolin: true · fart: true (fartfelt med pile) · stjerner: false (ingen stjerner her)

import * as THREE from "./three.js";

export const DS = 0.25;                                  // afstand mellem punkterne på banen

export class Bane {
  constructor(def) {
    this.def = def;
    this.P = [];
    this.flag = [0];                                     // punkter, man genstarter fra (starten er det første)
    this.stjerner = []; this.frugter = []; this.puder = []; this.trampoliner = []; this.fartfelter = [];
    this.målI = 0;
    this.byg();
  }

  byg() {
    const d = this.def, P = this.P;
    let x = 0, y = 0, z = 0, h = 0, s = 0;
    let w = d.bredde ?? 6, rende = d.rende ?? 0.3;
    const punkt = (st, fast) => {
      const fx = Math.sin(h), fz = -Math.cos(h);
      P.push({ x, y, z, fx, fz, rx: -fz, rz: fx, w, rende, s, fast, kant: st.kant ?? d.kant ?? true,
        is: !!(st.is ?? d.is), tramp: false, fart: false, stykke: st });
    };
    punkt(d.stykker[0], true);
    for (const st of d.stykker) {
      const hul = st.hul != null;
      const L = st.lige ?? st.hul ?? (Math.abs(st.sving) * Math.PI / 180 * (st.r ?? 12));
      const n = Math.max(1, Math.round(L / DS)), dl = L / n, drej = (st.sving ?? 0) * Math.PI / 180 / n;
      const y0 = y, w0 = w, w1 = st.bredde ?? w, r0 = rende, r1 = st.rende ?? rende;
      const i0 = P.length - 1;                           // stykket starter i det sidste punkt
      if (st.flag) this.flag.push(i0);
      if (st.mål) this.målI = i0;
      for (let j = 1; j <= n; j++) {
        const t = j / n, e = (1 - Math.cos(Math.PI * t)) / 2;
        h += drej / 2; x += Math.sin(h) * dl; z -= Math.cos(h) * dl; h += drej / 2;
        s += dl;
        y = y0 + (st.bakke ?? 0) * (hul ? t : e) + (st.rampe ?? 0) * t * t;
        if (st.bølger) y += st.bølger[0] * Math.sin(Math.PI * st.bølger[1] * t) ** 2;
        w = w0 + (w1 - w0) * e; rende = r0 + (r1 - r0) * e;
        punkt(st, !hul);
      }
      y = y0 + (st.bakke ?? 0) + (st.rampe ?? 0);
      this.ting(st, i0, P.length - 1, L);
    }
    if (!this.målI) this.målI = Math.max(0, P.length - 40);
    this.længde = s;
    this.stjerneRække();
  }

  // Frugt, puder, trampoliner, fartfelter og stjernebuer over hop
  ting(st, i0, i1, L) {
    const P = this.P, midt = (i0 + i1) >> 1;
    if (st.frugt != null) this.frugter.push(this.punktPå(midt, st.frugt, 0.55));
    for (const pu of [].concat(st.puder ?? [])) {
      const [t, u] = Array.isArray(pu) ? pu : [0.5, pu];
      const i = Math.round(i0 + (i1 - i0) * t);
      this.puder.push({ ...this.punktPå(i, u, 0), i, r: 0.75 });
    }
    if (st.trampolin) {                                  // en trampolin hele vejen på tværs, så man ikke kan misse den
      const n = Math.round(1.0 / DS);
      for (let i = midt - n; i <= midt + n; i++) if (P[i]) P[i].tramp = true;
      this.trampoliner.push({ ...this.punktPå(midt, 0, 0), i: midt, i0: midt - n, i1: midt + n });
    }
    if (st.fart) {
      const n = Math.round(2.8 / DS);
      for (let i = i0 + 2; i <= Math.min(i1, i0 + 2 + n); i++) P[i].fart = true;
      this.fartfelter.push([i0 + 2, Math.min(i1, i0 + 2 + n)]);
    }
    if (st.hul != null && st.stjerner !== false) {       // stjerner i en bue hen over hullet
      const a = P[i0], b = P[i1], bue = 0.9 + L * 0.22;
      for (let k = 1; k * 1.3 < L; k++) {
        const t = k * 1.3 / L, p = P[Math.round(i0 + (i1 - i0) * t)];
        this.stjerner.push({ x: p.x, y: a.y + (b.y - a.y) * t + 0.9 + Math.sin(Math.PI * t) * bue, z: p.z });
      }
    }
  }

  // Stjerner hele vejen, der snor sig lidt fra side til side
  stjerneRække() {
    const P = this.P, afst = this.def.stjerneAfstand ?? 3.2;
    let næste = 4;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (p.s < næste) continue;
      næste = p.s + afst;
      if (!p.fast || p.stykke.stjerner === false || p.tramp || p.fart || p.stykke.rampe || i > this.målI - 6) continue;
      if (this.puder.some(pu => Math.abs(pu.i - i) < 8)) continue;
      const u = Math.sin(p.s * 0.26) * Math.max(0, p.w / 2 - 1.3) * 0.6;
      this.stjerner.push(this.punktPå(i, u, 0.72));
    }
  }

  // Et punkt på banens overflade: sideværts u meter fra midten, løftet op
  punktPå(i, u, løft) {
    const p = this.P[i], halv = p.w / 2, e = Math.min(1, Math.abs(u) / halv);
    return { x: p.x + p.rx * u, y: p.y + p.rende * e * e + løft, z: p.z + p.rz * u };
  }

  // Det punkt på banen, der er tættest på (søger kun omkring det sidste, så det går hurtigt)
  nærmest(x, y, z, hint = 0, vindue = 48) {
    const P = this.P;
    let bedst = hint, bd = Infinity;
    const a = Math.max(0, hint - vindue), b = Math.min(P.length - 1, hint + vindue);
    for (let i = a; i <= b; i++) {
      const p = P[i], dx = p.x - x, dz = p.z - z, dy = (p.y - y) * 0.5, dd = dx * dx + dz * dz + dy * dy;
      if (dd < bd) { bd = dd; bedst = i; }
    }
    return bedst;
  }

  // Hvor er Rasmus i forhold til banen? u = sideværts, a = frem/tilbage, h = overfladens højde
  flade(x, z, i) {
    const P = this.P, p = P[i];
    const dx = x - p.x, dz = z - p.z;
    const u = dx * p.rx + dz * p.rz, a = dx * p.fx + dz * p.fz;
    const j = a >= 0 ? Math.min(i + 1, P.length - 1) : Math.max(i - 1, 0);
    const t = j === i ? 0 : Math.min(1, Math.abs(a) / DS), q = P[j];
    const y = p.y + (q.y - p.y) * t, halv = (p.w + (q.w - p.w) * t) / 2, rende = p.rende + (q.rende - p.rende) * t;
    const uk = Math.min(Math.abs(u), halv) / halv;
    return { i, u, a, halv, midtY: y, h: y + rende * uk * uk, fast: p.fast && (t < 0.5 || q.fast), p };
  }

  // Højden under Rasmus, eller null hvis der ikke er noget at stå på
  højde(x, z, i, kant = 0.12) {
    const f = this.flade(x, z, i);
    return f.fast && Math.abs(f.u) <= f.halv + kant ? f.h : null;
  }

  // Gennemsnitlig retning lidt frem ad banen (til kameraet)
  retning(i, frem = 16) {
    let fx = 0, fz = 0;
    for (let k = i; k <= Math.min(this.P.length - 1, i + frem); k++) { fx += this.P[k].fx; fz += this.P[k].fz; }
    const l = Math.hypot(fx, fz) || 1;
    return [fx / l, fz / l];
  }
}

// ---------- 3D-modellen af banen ----------
// tema: { top, side (materialer), topL (meter pr. billede), topBredde (billedet går på tværs), tyk, bund, rækværk }
export function lavModel(bane, tema) {
  const gruppe = new THREE.Group(), P = bane.P, M = 12;
  const top = nyDel(), side = nyDel();
  const tyk = tema.tyk ?? 1.2, bundB = tema.bund ?? 0.8, topL = tema.topL ?? 4, sideL = tema.sideL ?? 6;

  const kørsler = [];
  let start = -1;
  for (let i = 0; i < P.length; i++) {
    if (P[i].fast) { if (start < 0) start = i; }
    else if (start >= 0) { kørsler.push([start, i - 1]); start = -1; }
  }
  if (start >= 0) kørsler.push([start, P.length - 1]);

  const kantPunkt = (p, sgn, bund) => {
    const u = sgn * p.w / 2 * (bund ? bundB : 1);
    return [p.x + p.rx * u, bund ? p.y - tyk : p.y + p.rende, p.z + p.rz * u];
  };

  for (const [a, b] of kørsler) {
    if (b - a < 1) continue;
    // toppen
    const v0 = top.pos.length / 3;
    for (let i = a; i <= b; i++) {
      const p = P[i];
      for (let k = 0; k <= M; k++) {
        const f = k / M, u = (f - 0.5) * p.w, e = (2 * u / p.w) ** 2;
        top.pos.push(p.x + p.rx * u, p.y + p.rende * e, p.z + p.rz * u);
        top.uv.push(tema.topBredde ? f : u / topL + 0.5, p.s / topL);
      }
    }
    for (let i = 0; i < b - a; i++) for (let k = 0; k < M; k++) {
      const q = v0 + i * (M + 1) + k, q1 = q + 1, q2 = q + M + 1, q3 = q2 + 1;
      top.idx.push(q, q1, q2, q1, q3, q2);
    }
    // siderne og bunden
    for (const sgn of [-1, 1]) {
      const s0 = side.pos.length / 3;
      for (let i = a; i <= b; i++) {
        side.pos.push(...kantPunkt(P[i], sgn, false), ...kantPunkt(P[i], sgn, true));
        side.uv.push(P[i].s / sideL, 1, P[i].s / sideL, 0);
      }
      for (let i = 0; i < b - a; i++) {
        const t0 = s0 + i * 2, b0 = t0 + 1, t1 = t0 + 2, b1 = t0 + 3;
        if (sgn > 0) side.idx.push(t0, b0, t1, t1, b0, b1); else side.idx.push(t0, t1, b0, t1, b1, b0);
      }
    }
    const bu = side.pos.length / 3;
    for (let i = a; i <= b; i++) {
      side.pos.push(...kantPunkt(P[i], -1, true), ...kantPunkt(P[i], 1, true));
      side.uv.push(0, 0.02, 0.3, 0.02);
    }
    for (let i = 0; i < b - a; i++) {
      const l0 = bu + i * 2, r0 = l0 + 1, l1 = l0 + 2, r1 = l0 + 3;
      side.idx.push(l0, l1, r0, r0, l1, r1);
    }
    // enderne lukkes
    for (const [i, frem] of [[a, false], [b, true]]) {
      const p = P[i], e0 = side.pos.length / 3;
      for (let k = 0; k <= M; k++) {
        const f = k / M, u = (f - 0.5) * p.w, ub = u * bundB, e = (2 * u / p.w) ** 2;
        side.pos.push(p.x + p.rx * u, p.y + p.rende * e, p.z + p.rz * u, p.x + p.rx * ub, p.y - tyk, p.z + p.rz * ub);
        side.uv.push(f * p.w / sideL, 1, f * p.w / sideL, 0);
      }
      for (let k = 0; k < M; k++) {
        const t0 = e0 + k * 2, b0 = t0 + 1, t1 = t0 + 2, b1 = t0 + 3;
        if (frem) side.idx.push(t0, t1, b0, t1, b1, b0); else side.idx.push(t0, b0, t1, t1, b0, b1);
      }
    }
  }

  const topMesh = new THREE.Mesh(tilGeo(top), tema.top);
  topMesh.receiveShadow = true;
  const sideMesh = new THREE.Mesh(tilGeo(side), tema.side);
  sideMesh.receiveShadow = true;
  gruppe.add(topMesh, sideMesh);
  if (tema.rækværk) gruppe.add(rækværk(bane, kørsler, tema.rækværk));
  return gruppe;
}

function nyDel() { return { pos: [], uv: [], idx: [] }; }
function tilGeo(d) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(d.pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(d.uv, 2));
  g.setIndex(d.idx);
  g.computeVertexNormals();
  return g;
}

// Rækværk langs kanterne: stolper og rør (eller reb), der følger banen
// rv: { højde, rør: [{ h, r, mat }], stolpe(samler, pos, retning), afstand, hæng }
function rækværk(bane, kørsler, rv) {
  const P = bane.P, gruppe = new THREE.Group(), afst = rv.afstand ?? 2.5, samler = new Samler();
  const kantPos = (p, sgn, løft) => new THREE.Vector3(p.x + p.rx * sgn * (p.w / 2 - 0.08), p.y + p.rende + løft, p.z + p.rz * sgn * (p.w / 2 - 0.08));
  for (const [a, b] of kørsler) for (const sgn of [-1, 1]) {
    let i = a;
    while (i <= b) {
      while (i <= b && !P[i].kant) i++;
      const c = i;
      while (i <= b && P[i].kant) i++;
      const e = i - 1;
      if (e - c < 4) continue;
      // stolper
      const antal = Math.max(1, Math.round((P[e].s - P[c].s) / afst));
      const stolper = [];
      for (let k = 0; k <= antal; k++) {
        const j = Math.round(c + (e - c) * k / antal), p = P[j];
        stolper.push(j);
        rv.stolpe(samler, kantPos(p, sgn, 0), Math.atan2(p.fx, p.fz));
      }
      // rør eller reb mellem stolperne
      for (const rør of rv.rør) {
        const pts = [];
        if (rv.hæng) {
          for (let k = 0; k < stolper.length - 1; k++) for (let m = 0; m < 6; m++) {
            const t = m / 6, j = Math.round(stolper[k] + (stolper[k + 1] - stolper[k]) * t);
            pts.push(kantPos(P[j], sgn, rør.h - Math.sin(Math.PI * t) * rv.hæng));
          }
          pts.push(kantPos(P[stolper[stolper.length - 1]], sgn, rør.h));
        } else {
          for (let j = c; j <= e; j += 3) pts.push(kantPos(P[j], sgn, rør.h));
          pts.push(kantPos(P[e], sgn, rør.h));
        }
        if (pts.length < 2) continue;
        const kurve = new THREE.CatmullRomCurve3(pts);
        const g = new THREE.TubeGeometry(kurve, Math.max(4, pts.length * 2), rør.r, 7, false);
        const m = new THREE.Mesh(g, rør.mat);
        m.castShadow = true;
        gruppe.add(m);
      }
    }
  }
  // tværs over enden og bag starten, så man ikke triller af
  for (const [i, frem] of [[0, false], [P.length - 1, true]]) {
    const p = P[i];
    for (let k = 0; k <= 4; k++) {
      const u = (k / 4 - 0.5) * (p.w - 0.16);
      rv.stolpe(samler, new THREE.Vector3(p.x + p.rx * u, p.y + p.rende * (2 * u / p.w) ** 2, p.z + p.rz * u), Math.atan2(p.rx, p.rz));
    }
    for (const rør of rv.rør) {
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const u = (k / 8 - 0.5) * (p.w - 0.16);
        pts.push(new THREE.Vector3(p.x + p.rx * u, p.y + p.rende * (2 * u / p.w) ** 2 + rør.h, p.z + p.rz * u));
      }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, rør.r, 7, false), rør.mat);
      m.castShadow = true;
      gruppe.add(m);
    }
  }
  samler.byg(gruppe, true);
  return gruppe;
}

// ---------- Samler: mange små figurer med samme materiale bliver til én (så iPad'en kan følge med) ----------
export class Samler {
  constructor() { this.dele = new Map(); }
  læg(geo, mat, matrix) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    if (!this.dele.has(mat)) this.dele.set(mat, []);
    this.dele.get(mat).push(g);
  }
  // Læg en figur ind et bestemt sted: p = position, r = drejning (Euler), s = størrelse (tal eller [x,y,z])
  put(geo, mat, p, r = [0, 0, 0], s = 1, forælder = null) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
      Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s));
    if (forælder) m.premultiply(forælder);
    this.læg(geo, mat, m);
  }
  byg(gruppe, skygge = false) {
    for (const [mat, liste] of this.dele) {
      let n = 0;
      for (const g of liste) n += g.attributes.position.count;
      const medFarve = liste.some(g => g.attributes.color);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      const far = medFarve ? new Float32Array(n * 3).fill(1) : null;
      let o = 0;
      for (const g of liste) {
        const c = g.attributes.position.count;
        pos.set(g.attributes.position.array, o * 3);
        if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        if (far && g.attributes.color) far.set(g.attributes.color.array, o * 3);
        o += c;
        g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      if (far) geo.setAttribute("color", new THREE.BufferAttribute(far, 3));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = skygge; mesh.receiveShadow = skygge;
      gruppe.add(mesh);
    }
    this.dele.clear();
  }
}
