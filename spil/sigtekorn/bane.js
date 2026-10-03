// ===== Banen: Støvbyen — en ørkenby i stil med Dust =====
// Byen er en massiv blok, hvor gaderne er skåret ud. Resten bliver til huse i forskellige højder.
//  · Ørkenrævene starter i syd, Sandslangerne i nord
//  · Midten: en lang gade med dobbeltdøre tæt på nord og en kasse i midten
//  · A: en lang vej fra syd (med døre), en kort vej fra midten og en hævet plads med kasser
//  · B: tunneler med tag fra syd, en vej fra midten og en hævet plads
// Alt er kasser, så kollisionen (verden.js) er enkel. Til sidst laves et vej-net, som botterne går efter.

import * as THREE from "./three.js";

const MIN = -58, MAX = 58, N = MAX - MIN;                          // byen er 116 × 116 meter
// Gader og pladser: [x0, z0, x1, z1] (nord er −z)
const ÅBNE = [
  [-14, -54, 14, -40],       // Sandslangernes start (nord)
  [-18, 40, 18, 54],         // Ørkenrævenes start (syd)
  [-4, -40, 4, 40],          // midten
  [22, -44, 44, -22],        // A-pladsen
  [18, 40, 48, 48], [40, -22, 48, 48],          // den lange vej til A
  [4, -14, 22, -8], [16, -28, 24, -8],          // den korte vej fra midten til A
  [14, -48, 24, -40],        // fra nord til A
  [-44, -44, -22, -22],      // B-pladsen
  [-48, 40, -18, 48], [-48, -22, -40, 48],      // tunnelerne til B
  [-24, -48, -14, -40],      // fra nord til B
  [-22, -14, -4, -8], [-26, -24, -18, -8],      // fra midten til B
  [-40, 10, -4, 14],         // de nedre tunneler: fra midten til tunnelerne
];
// Lamper under tunneltagene: deres lys er bagt ind i lysbilledet (blender/lav_lys.py), her tegnes kun selve lampen
export const LAMPER = [[-44, 6], [-44, 18], [-44, 30], [-34, 12]];
export const LAMPE_Y = 2.72;
export const STEDER = { A: [36, -34], B: [-36, -36], midt: [0, 0], nord: [0, -47], syd: [0, 47] };
export const START = {
  ræve: [[-10, 47], [-5, 50], [0, 46], [5, 50], [10, 47], [-12, 51], [12, 51], [0, 52]],
  slanger: [[-8, -47], [-4, -51], [0, -46], [4, -51], [8, -47], [-11, -50], [11, -50], [0, -52]],
};

const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- Geometri: kasser med teksturer i verdens-meter og mørkere farve forneden (som skygge i hjørnerne) ----------
const FLISE = { sandsten: 4, puds: 4, fliser: 4, sand: 6, mørk: 4, tag: 3 };
class Bygger {
  constructor() { this.grupper = new Map(); }
  gruppe(mat) {
    if (!this.grupper.has(mat)) this.grupper.set(mat, { pos: [], nor: [], uv: [], farve: [], idx: [] });
    return this.grupper.get(mat);
  }
  // En firkant: fire hjørner (mod uret set udefra), normalen og uv/farve for hvert hjørne
  firkant(mat, h, n, uv, f) {
    const g = this.gruppe(mat), i = g.pos.length / 3;
    for (let k = 0; k < 4; k++) { g.pos.push(...h[k]); g.nor.push(...n); g.uv.push(...uv[k]); g.farve.push(f[k], f[k], f[k]); }
    g.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  // En kasse. o: { prFlade: tekstur pr. side (kasser og døre), bund: tegn bunden, top: false = uden top, mørkere: 0..1 }
  kasse(x0, y0, z0, x1, y1, z1, mat, o = {}) {
    const t = FLISE[mat] || 4, pr = !!o.prFlade, m = o.mørkere ?? 1;
    const ao = y => m * (y - y0 > 2.4 ? 1 : 0.6 + 0.4 * Math.min(1, (y - y0) / 2.4));
    const uvS = (a, y) => (pr ? null : [a / t, y / t]);
    // siderne deles ved 2,4 m, så skyggen forneden ikke strækker sig op ad hele muren
    const lag = y1 - y0 > 2.6 ? [y0, y0 + 2.4, y1] : [y0, y1];
    for (let j = 0; j < lag.length - 1; j++) {
      const ya = lag[j], yb = lag[j + 1], fa = ao(ya), fb = ao(yb);
      const v0 = pr ? (ya - y0) / (y1 - y0) : null, v1 = pr ? (yb - y0) / (y1 - y0) : null;
      const s = (a0, a1, l) => pr ? [[0, v0], [1, v0], [1, v1], [0, v1]] : [uvS(a0, ya), uvS(a1, ya), uvS(a1, yb), uvS(a0, yb)];
      this.firkant(mat, [[x1, ya, z1], [x1, ya, z0], [x1, yb, z0], [x1, yb, z1]], [1, 0, 0], s(-z1, -z0), [fa, fa, fb, fb]);   // øst
      this.firkant(mat, [[x0, ya, z0], [x0, ya, z1], [x0, yb, z1], [x0, yb, z0]], [-1, 0, 0], s(z0, z1), [fa, fa, fb, fb]);    // vest
      this.firkant(mat, [[x0, ya, z1], [x1, ya, z1], [x1, yb, z1], [x0, yb, z1]], [0, 0, 1], s(x0, x1), [fa, fa, fb, fb]);     // syd
      this.firkant(mat, [[x1, ya, z0], [x0, ya, z0], [x0, yb, z0], [x1, yb, z0]], [0, 0, -1], s(-x1, -x0), [fa, fa, fb, fb]);  // nord
    }
    const ft = m;                                                   // toppen er altid lys (solen skinner på den)
    if (o.top !== false) this.firkant(o.topMat || mat, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0],
      pr ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[x0 / t, -z1 / t], [x1 / t, -z1 / t], [x1 / t, -z0 / t], [x0 / t, -z0 / t]], [ft, ft, ft, ft]);
    if (o.bund) { const fb = 0.55 * m; this.firkant(mat, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0],
      [[x0 / t, z0 / t], [x1 / t, z0 / t], [x1 / t, z1 / t], [x0 / t, z1 / t]], [fb, fb, fb, fb]); }
  }
  // Et stykke gulv (kun oversiden)
  gulv(x0, z0, x1, z1, mat) {
    const t = FLISE[mat] || 4;
    this.firkant(mat, [[x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0]], [0, 1, 0],
      [[x0 / t, -z1 / t], [x1 / t, -z1 / t], [x1 / t, -z0 / t], [x0 / t, -z0 / t]], [1, 1, 1, 1]);
  }
  // Lav én mesh pr. materiale (navnet er materialets, så lyset fra Blender kan finde den igen)
  færdig(scene, materialer) {
    const masker = [];
    for (const [mat, g] of this.grupper) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(g.nor, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(g.farve, 3));
      geo.setIndex(g.idx);
      const mesh = new THREE.Mesh(geo, materialer[mat]);
      mesh.name = mat; mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh); masker.push(mesh);
    }
    return masker;
  }
}

// ---------- Materialerne: fotos fra Poly Haven (eller de tegnede teksturer, hvis fotoene ikke kunne hentes) ----------
function lavMaterialer(t) {
  const std = (map, o = {}) => new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: o.bump ?? 1.2, roughness: o.ru ?? 0.95, metalness: o.me ?? 0, vertexColors: true, color: o.farve ?? 0xffffff });
  // Et foto: farve, buler (normal) og ruhed + skygge i krogene (arm). Gentages, så det får sin rigtige størrelse i meter
  const foto = (navn, flise, o = {}) => {
    const f = t.foto[navn], gentag = flise / f.meter;
    for (const k of [f.farve, f.normal, f.arm]) k.repeat.set(gentag, gentag);
    return new THREE.MeshStandardMaterial({ map: f.farve, normalMap: f.normal, normalScale: new THREE.Vector2(o.nor ?? 1, o.nor ?? 1),
      roughnessMap: f.arm, aoMap: f.arm, roughness: 1, metalness: 0, vertexColors: true, color: o.farve ?? 0xffffff });
  };
  const stof = farve => new THREE.MeshStandardMaterial({ color: farve, roughness: 1, vertexColors: true, side: THREE.DoubleSide });
  const fælles = {
    vindue: new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.4, vertexColors: true }),
    stofRød: stof(0xb8402e), stofBlå: stof(0x2e6a9a), stofHvid: stof(0xe8dcc0),
  };
  if (t.foto) return {
    sandsten: foto("sandsten", FLISE.sandsten, { nor: 1.3 }), puds: foto("puds", FLISE.puds), fliser: foto("fliser", FLISE.fliser), sand: foto("sand", FLISE.sand),
    mørk: foto("sandsten", FLISE.mørk, { farve: 0x9a8a72, nor: 1.3 }), tag: foto("planker", FLISE.tag, { farve: 0xb89870 }),
    trækasse: std(t.kasseFoto, { bump: 1.2, ru: 0.85 }), dør: std(t.dørFoto, { bump: 0.8, ru: 0.7 }),
    metal: std(t.metal, { ru: 0.55, me: 0.45 }), ...fælles,
  };
  return {
    sandsten: std(t.sandsten), puds: std(t.puds, { bump: 0.6 }), fliser: std(t.fliser, { bump: 1 }), sand: std(t.sand, { bump: 0.5 }),
    mørk: std(t.sandsten, { farve: 0x9a8a72 }), tag: std(t.trækasse, { farve: 0xb89870, bump: 0.6 }),
    trækasse: std(t.trækasse, { bump: 1.5, ru: 0.9 }), dør: std(t.dør, { bump: 0.8, ru: 0.6, me: 0.35 }), metal: std(t.metal, { ru: 0.55, me: 0.45 }),
    ...fælles,
  };
}
// Materialer, kuglerne kan ramme (bestemmer gnisterne og lyden)
const KUGLEMAT = { sandsten: "sten", puds: "sten", fliser: "sten", sand: "sand", mørk: "sten", tag: "træ", trækasse: "træ", dør: "metal", metal: "metal", vindue: "sten" };

// ---------- Byg hele byen ----------
export function lavBane(scene, verden, t) {
  const mat = lavMaterialer(t), b = new Bygger();
  const solid = (x0, y0, z0, x1, y1, z1, m, o = {}) => { b.kasse(x0, y0, z0, x1, y1, z1, m, o); if (o.kollision !== false) verden.tilføj(x0, y0, z0, x1, y1, z1, KUGLEMAT[m] || "sten"); };

  // jorden: en kasse under hele byen, så man ikke falder igennem
  verden.tilføj(MIN - 10, -2, MIN - 10, MAX + 10, 0, MAX + 10, "sand");

  // ---- husene: alt det, der ikke er gade, slået sammen til store kasser ----
  const fast = new Uint8Array(N * N).fill(1);
  for (const [x0, z0, x1, z1] of ÅBNE) for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) fast[(x - MIN) + (z - MIN) * N] = 0;
  const erFast = (x, z) => x < MIN || z < MIN || x >= MAX || z >= MAX || fast[(Math.floor(x) - MIN) + (Math.floor(z) - MIN) * N] === 1;
  // Saml felterne af én slags (huse eller gade) til så store rektangler som muligt
  const rektangler = (slags, gør) => {
    const brugt = new Uint8Array(N * N), er = k => fast[k] === slags && !brugt[k];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = i + j * N;
      if (!er(k)) continue;
      let w = 1; while (i + w < N && er(k + w)) w++;
      let h = 1;
      while (j + h < N) { let ok = true; for (let q = 0; q < w; q++) if (!er(k + q + h * N)) { ok = false; break; } if (!ok) break; h++; }
      for (let a = 0; a < w; a++) for (let c = 0; c < h; c++) brugt[k + a + c * N] = 1;
      gør(MIN + i, MIN + j, MIN + i + w, MIN + j + h);
    }
  };
  rektangler(1, (x0, z0, x1, z1) => {
    const kant = x0 <= MIN || z0 <= MIN || x1 >= MAX || z1 >= MAX;
    const r = hash(x0 * 7 + 3, z0 * 13 + 1), højde = kant ? 10 : 6.5 + Math.floor(r * 6) * 0.5;
    solid(x0, 0, z0, x1, højde, z1, r < 0.58 ? "sandsten" : "puds");
  });
  rektangler(0, (x0, z0, x1, z1) => b.gulv(x0, z0, x1, z1, "sand"));   // sand i gaderne (ikke under husene)

  // ---- de hævede pladser A og B med trapper ----
  const plads = (x0, z0, x1, z1) => solid(x0, 0, z0, x1, 1, z1, "sandsten", { topMat: "fliser" });
  const trin = (x0, z0, x1, z1, hh) => solid(x0, 0, z0, x1, hh, z1, "sandsten", { topMat: "fliser" });
  plads(30, -40, 42, -28);
  trin(36, -28, 42, -27.4, 0.667); trin(36, -27.4, 42, -26.8, 0.333);          // trappe mod syd (den lange vej)
  trin(29.4, -36, 30, -30, 0.667); trin(28.8, -36, 29.4, -30, 0.333);          // trappe mod vest (den korte vej)
  plads(-42, -42, -30, -30);
  trin(-30, -38, -29.4, -32, 0.667); trin(-29.4, -38, -28.8, -32, 0.333);      // trappe mod øst
  trin(-42, -30, -36, -29.4, 0.667); trin(-42, -29.4, -36, -28.8, 0.333);      // trappe mod syd (tunnelerne)
  // fliser på gulvet i midten og ved starterne
  for (const [x0, z0, x1, z1] of [[-6, -54, 6, -44], [-6, 44, 6, 54], [22, -44, 30, -22], [30, -28, 44, -22], [-44, -44, -22, -42], [-30, -42, -22, -22], [-4, -30, 4, -20]])
    b.kasse(x0, -0.1, z0, x1, 0.004, z1, "fliser");

  // ---- døre: en mur med en åbning og to åbne dørfløje ----
  const døråbning = (langsX, a, b0, b1, åben0, åben1) => {
    // langsX: muren går på langs af x (står vinkelret på en gade, der løber nord–syd) i z = a..a+0.8
    const H = 4.2, L = 2.9;
    if (langsX) {
      solid(b0, 0, a, åben0, H, a + 0.8, "sandsten"); solid(åben1, 0, a, b1, H, a + 0.8, "sandsten");
      solid(åben0, L, a, åben1, H, a + 0.8, "sandsten", { bund: true });
      solid(åben0 - 0.12, 0, a + 0.8, åben0, L - 0.05, a + 0.8 + (åben1 - åben0) / 2, "dør", { prFlade: true });
      solid(åben1, 0, a + 0.8, åben1 + 0.12, L - 0.05, a + 0.8 + (åben1 - åben0) / 2, "dør", { prFlade: true });
    } else {
      solid(a, 0, b0, a + 0.8, H, åben0, "sandsten"); solid(a, 0, åben1, a + 0.8, H, b1, "sandsten");
      solid(a, L, åben0, a + 0.8, H, åben1, "sandsten", { bund: true });
      solid(a - (åben1 - åben0) / 2, 0, åben0 - 0.12, a, L - 0.05, åben0, "dør", { prFlade: true });
      solid(a - (åben1 - åben0) / 2, 0, åben1, a, L - 0.05, åben1 + 0.12, "dør", { prFlade: true });
    }
  };
  døråbning(true, -26, -4, 4, -1.4, 1.4);            // dobbeltdørene i midten
  døråbning(false, 32, 40, 48, 42.6, 45.4);          // dørene på den lange vej til A
  døråbning(false, -19, -48, -40, -45.4, -42.6);     // dørene fra nord til B

  // ---- tunnelerne: tag over gaden og bjælker, der bærer det ----
  const tag = (x0, z0, x1, z1) => {
    solid(x0, 3.3, z0, x1, 3.9, z1, "mørk", { bund: true });
    for (let z = z0 + 3; z < z1 - 1; z += 6) solid(x0, 2.95, z, x1, 3.3, z + 0.4, "tag", { bund: true, kollision: false });
  };
  tag(-48, 0, -40, 36); tag(-40, 10, -28, 14);

  // ---- buer hen over gaderne (en bjælke foroven og en pille i hver side) ----
  const bue = (x0, z0, x1, z1) => {                                   // langs en akse: fra (x0,z0) til (x1,z1), 0,8 m tyk
    solid(x0, 3.7, z0, x1, 4.6, z1, "sandsten", { bund: true });
    if (z1 - z0 < x1 - x0) { solid(x0, 0, z0, x0 + 0.5, 3.7, z1, "sandsten"); solid(x1 - 0.5, 0, z0, x1, 3.7, z1, "sandsten"); }
    else { solid(x0, 0, z0, x1, 3.7, z0 + 0.5, "sandsten"); solid(x0, 0, z1 - 0.5, x1, 3.7, z1, "sandsten"); }
  };
  bue(-4, 30, 4, 30.8); bue(-4, -2, 4, -1.2); bue(40, 4, 48, 4.8); bue(-48, -12, -40, -11.2); bue(16, -20, 24, -19.2);

  // ---- trækasser og tønder (dækning) ----
  const kasse = (x, y, z, s = 1.4) => solid(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, "trækasse", { prFlade: true });
  for (const [x, y, z, s] of [[0, 0, -6, 1.4], [2.4, 0, 18, 1.2], [-2.6, 0, -18, 1.2], [33.6, 1, -35.2, 1.4], [33.6, 2.4, -35.2, 1.0], [38.6, 1, -31.2, 1.4],
    [31.6, 1, -29.4, 1.2], [25.6, 0, -41.4, 1.4], [45.2, 0, 44.6, 1.4], [41.6, 0, 20.6, 1.4], [12.6, 0, -12.9, 1.2], [-37.3, 1, -37.3, 1.4],
    [-37.3, 2.4, -37.3, 1.0], [-32.3, 1, -40.3, 1.4], [-26.3, 0, -29.3, 1.4], [-46.4, 0, 24.6, 1.2], [-5.3, 0, 46.7, 1.4], [8.7, 0, 50.7, 1.4],
    [-7.3, 0, -47.3, 1.4], [19, 0, -10.5, 1.2], [-20.5, 0, -11, 1.2], [44.6, 0, -8, 1.4], [-44.6, 0, -18, 1.2]]) kasse(x, y, z, s);
  const tønder = [];
  for (const [x, z] of [[20.4, -44.5], [-20.4, -44.5], [46.6, 12], [-46.5, 6], [16.5, 46.5], [-16.5, 41.5]]) {
    verden.tilføj(x - 0.32, 0, z - 0.32, x + 0.32, 0.95, z + 0.32, "metal");
    tønder.push([x, z]);
  }

  // ---- vinduer, døre og markiser på husenes facader langs gaderne ----
  for (const [x0, z0, x1, z1] of ÅBNE) {
    const sider = [[x0, z0, x0, z1, -1, 0], [x1, z0, x1, z1, 1, 0], [x0, z0, x1, z0, 0, -1], [x0, z1, x1, z1, 0, 1]];
    for (const [ax, az, bx, bz, nx, nz] of sider) {
      const l = Math.hypot(bx - ax, bz - az);
      for (let s = 3; s < l - 2; s += 5 + hash(ax + s, az - s) * 3) {
        const px = ax + (bx - ax) * s / l, pz = az + (bz - az) * s / l;
        if (!erFast(px + nx * 0.5, pz + nz * 0.5) || !erFast(px + nx * 0.5 + (bx - ax) / l * 1.2, pz + nz * 0.5 + (bz - az) / l * 1.2)) continue;
        const r = hash(Math.round(px * 3), Math.round(pz * 5)), ux = (bx - ax) / l, uz = (bz - az) / l, d = 0.06;
        const væg = (u0, u1, y0, y1, m, o = {}) => {                    // en flad ting op ad muren (ved punktet, langs muren)
          const qa = [px + ux * u0, pz + uz * u0], qb = [px + ux * u1, pz + uz * u1];
          const xa = Math.min(qa[0], qb[0]), xb = Math.max(qa[0], qb[0]), za = Math.min(qa[1], qb[1]), zb = Math.max(qa[1], qb[1]);
          if (nx) b.kasse(px - (nx > 0 ? d : 0), y0, za, px + (nx > 0 ? 0 : d), y1, zb, m, o);   // lidt ud fra muren, ind mod gaden
          else b.kasse(xa, y0, pz - (nz > 0 ? d : 0), xb, y1, pz + (nz > 0 ? 0 : d), m, o);
        };
        if (r < 0.55) væg(-0.55, 0.55, 3.1, 4.3, "vindue", { prFlade: true });                       // et mørkt vindue
        else if (r < 0.75) { væg(-0.7, 0.7, 0, 2.4, "dør", { prFlade: true });                        // en dør med en markise over
          const stof = ["stofRød", "stofBlå", "stofHvid"][Math.floor(r * 30) % 3];
          if (nx) b.kasse(px - (nx > 0 ? 1.0 : 0), 2.62, pz - 0.95, px + (nx > 0 ? 0 : 1.0), 2.7, pz + 0.95, stof, { bund: true, prFlade: true });
          else b.kasse(px - 0.95, 2.62, pz - (nz > 0 ? 1.0 : 0), px + 0.95, 2.7, pz + (nz > 0 ? 0 : 1.0), stof, { bund: true, prFlade: true });
        } else if (r < 0.88) væg(-0.5, 0.5, 2.9, 4.0, "vindue", { prFlade: true });
      }
    }
  }

  const masker = b.færdig(scene, mat);
  lavTønder(scene, tønder, t);
  lavLamper(scene);
  lavPalmer(scene, verden, t, [[-12, 49], [13, 43.5], [11, -51], [26, -25.5], [-25.5, -41], [46.5, 30], [-15, 51]]);
  const knuder = lavVejnet(verden, erFast);
  return { knuder, erFast, masker };
}

// Tønder: runde, med to ringe (kun til at se på — kollisionen er en kasse)
function lavTønder(scene, tønder, t) {
  const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.95, 16), ring = new THREE.TorusGeometry(0.305, 0.02, 6, 20);
  const f = t.foto?.metal, gentag = k => { const c = k.clone(); c.repeat.set(2, 1); return c; };   // fotoet er 1 m: rundt om tønden ca. 2 m
  const m = f ? new THREE.MeshStandardMaterial({ map: gentag(f.farve), normalMap: gentag(f.normal), roughnessMap: gentag(f.arm), metalnessMap: gentag(f.arm), roughness: 1, metalness: 1 })
    : new THREE.MeshStandardMaterial({ map: t.metal, roughness: 0.6, metalness: 0.4, color: 0x8a9a70 });
  const rm = new THREE.MeshStandardMaterial({ color: 0x3a3f30, roughness: 0.5, metalness: 0.6 });
  for (const [x, z] of tønder) {
    const g = new THREE.Mesh(geo, m); g.position.set(x, 0.475, z); g.castShadow = g.receiveShadow = true; scene.add(g);
    for (const y of [0.25, 0.7]) { const r = new THREE.Mesh(ring, rm); r.rotation.x = Math.PI / 2; r.position.set(x, y, z); scene.add(r); }
  }
}
// Lamperne: en ledning fra taget, en skærm af metal og en pære, der lyser
function lavLamper(scene) {
  const skærm = new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide });
  const pære = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  const ledning = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (const [x, z] of LAMPER) {
    const g = new THREE.Group(); g.position.set(x, LAMPE_Y, z);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.3 - LAMPE_Y, 4), ledning); l.position.y = (3.3 - LAMPE_Y) / 2;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.2, 0.14, 16, 1, true), skærm); s.castShadow = true;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), pære); p.position.y = -0.06;
    g.add(l, s, p); scene.add(g);
  }
}
// Palmer: en buet stamme og en krone af lange blade
function lavPalmer(scene, verden, t, steder) {
  const f = t.foto?.bark, gentag = k => { const c = k.clone(); c.repeat.set(1, 0.7); return c; };
  const bark = f ? new THREE.MeshStandardMaterial({ map: gentag(f.farve), normalMap: gentag(f.normal), roughnessMap: gentag(f.arm), roughness: 1 })
    : new THREE.MeshStandardMaterial({ map: t.bark, roughness: 1 });
  const blad = new THREE.MeshStandardMaterial({ map: t.palmeblad, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 });
  const bladGeo = new THREE.PlaneGeometry(1.2, 3.6, 1, 4);
  { const p = bladGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, -(((y + 1.8) / 3.6) ** 2) * 1.2); } bladGeo.translate(0, 1.8, 0); bladGeo.computeVertexNormals(); }
  for (const [x, z] of steder) {
    const g = new THREE.Group(), h = 6 + hash(x, z) * 2.5, hæld = (hash(z, x) - 0.5) * 0.5;
    let px = 0, py = 0;
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.17 - i * 0.008, 0.2 - i * 0.008, h / 8 + 0.05, 9), bark);
      const nx = px + hæld * (i / 8) * 0.6; s.position.set((px + nx) / 2, py + h / 16, 0); s.rotation.z = -hæld * 0.35;
      s.castShadow = true; g.add(s); px = nx; py += h / 8;
    }
    for (let i = 0; i < 9; i++) {
      const bl = new THREE.Mesh(bladGeo, blad); bl.position.set(px, py, 0);
      bl.rotation.set(-1.0 - hash(i, x) * 0.5, i / 9 * Math.PI * 2, 0, "YXZ"); bl.castShadow = true; g.add(bl);
    }
    g.position.set(x, 0, z); g.rotation.y = hash(x + 1, z) * 6;
    scene.add(g);
    verden.tilføj(x - 0.22, 0, z - 0.22, x + 0.22, h, z + 0.22, "træ");
  }
}

// ---------- Vej-nettet: punkter for hver 3 meter på gaderne, forbundet, hvor man kan gå direkte ----------
function lavVejnet(verden, erFast) {
  const knuder = [], B = 0.42;
  for (let x = MIN + 1.5; x < MAX; x += 3) for (let z = MIN + 1.5; z < MAX; z += 3) {
    if (erFast(x, z)) continue;
    const y = verden.gulv(x, 1.2, z);
    if (y < -0.5 || y > 1.05 || !verden.fri(x, y + 0.01, z, B, 1.8)) continue;
    knuder.push({ x, y, z, nab: [] });
  }
  const kanGå = (a, c) => {                                         // gå i små skridt: ingen trin over 0,45 m, og der skal være plads
    const l = Math.hypot(c.x - a.x, c.z - a.z), n = Math.ceil(l / 0.35);
    let y = a.y;
    for (let i = 1; i <= n; i++) {
      const x = a.x + (c.x - a.x) * i / n, z = a.z + (c.z - a.z) * i / n, g = verden.gulv(x, y + 0.46, z);
      if (Math.abs(g - y) > 0.46 || !verden.fri(x, g + 0.01, z, B * 0.9, 1.75)) return false;
      y = g;
    }
    return Math.abs(y - c.y) < 0.05;
  };
  for (let i = 0; i < knuder.length; i++) for (let j = i + 1; j < knuder.length; j++) {
    const a = knuder[i], c = knuder[j], d = Math.hypot(a.x - c.x, a.z - c.z);
    if (d > 4.3 || !kanGå(a, c) || !kanGå(c, a)) continue;
    a.nab.push(j); c.nab.push(i);
  }
  return knuder;
}

// Den korteste vej mellem to knuder (A*). Svarer med en liste af knude-numre
export function findVej(knuder, fra, til) {
  if (fra === til) return [til];
  const g = new Map([[fra, 0]]), kom = new Map(), åben = new Set([fra]);
  const h = i => Math.hypot(knuder[i].x - knuder[til].x, knuder[i].z - knuder[til].z);
  const f = new Map([[fra, h(fra)]]);
  while (åben.size) {
    let bedst = null;
    for (const i of åben) if (bedst === null || f.get(i) < f.get(bedst)) bedst = i;
    if (bedst === til) { const vej = [til]; let k = til; while (kom.has(k)) { k = kom.get(k); vej.unshift(k); } return vej; }
    åben.delete(bedst);
    for (const n of knuder[bedst].nab) {
      const ng = g.get(bedst) + Math.hypot(knuder[n].x - knuder[bedst].x, knuder[n].z - knuder[bedst].z);
      if (ng < (g.get(n) ?? Infinity)) { g.set(n, ng); kom.set(n, bedst); f.set(n, ng + h(n)); åben.add(n); }
    }
  }
  return null;
}
// Den nærmeste knude (med næsten samme højde) til et sted
export function nærmesteKnude(knuder, x, y, z) {
  let bedst = -1, bd = Infinity;
  for (let i = 0; i < knuder.length; i++) {
    const k = knuder[i], d = (k.x - x) ** 2 + (k.z - z) ** 2 + ((k.y - y) * 3) ** 2;
    if (d < bd) { bd = d; bedst = i; }
  }
  return bedst;
}
