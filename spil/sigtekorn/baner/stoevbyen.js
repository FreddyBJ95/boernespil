// ===== Støvbyen — en ørkenby i stil med Dust =====
// Byen er en massiv blok, hvor gaderne er skåret ud. Resten bliver til huse i forskellige højder.
//  · Ørkenrævene starter i syd, Sandslangerne i nord
//  · Midten: en lang gade med dobbeltdøre tæt på nord og en kassestak i midten
//  · A: en lang vej fra syd (med døre), en kort vej fra midten og en hævet plads med kasser
//  · B: tunneler med tag fra syd, en vej fra midten og en hævet plads
// Bygges med de fælles klodser i bane.js (k = { b, solid, verden, hash }).
// (Rækkefølgen af kasserne må ikke ændres uden at bage lyset igen: blender/eksporter_bane.mjs og lav_lys.py)

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
const LAMPER = [[-44, 2.72, 6, 3.3], [-44, 2.72, 18, 3.3], [-44, 2.72, 30, 3.3], [-34, 2.72, 12, 3.3]];   // [x, y, z, loftet]
// Poster: gode steder at holde øje fra — [x, z, og det sted man kigger hen imod]. Botterne fordeler sig mellem dem,
// holder dem et stykke tid og går så videre, så hele byen bliver brugt (ikke kun midtergaden)
const POSTER = [
  // A-pladsen og vejene derhen
  [36, -38, 44, -24], [40.5, -33.5, 23, -25], [27, -43, 44, -27], [43.5, -24.5, 44, 4], [31, -24, 20, -24],
  [44, 6, 44, 40], [44, 30, 44, -12], [36, 44.5, 20, 44], [21.5, 44, 40, 44],
  [20, -12.5, 5, -11], [20, -25.5, 20, -9], [19, -43.5, 19, -30],
  // midten
  [0, 8, 0, -30], [0, -17, 0, 25], [2.4, 16.4, 0, -22], [-2, -31.5, 0, -8], [2, 36, 0, 0],
  // B-pladsen, tunnelerne og B kort
  [-36, -36.5, -44, -23], [-26.5, -27.5, -43, -41], [-40.5, -40.5, -27, -30], [-44, -16, -44, 22], [-44, 22, -44, -10],
  [-30, 44, -46, 44], [-20, 12, -4, 12], [-22, -11.5, -6, -11], [-22, -21.5, -22, -9], [-16, -44, -16, -30],
];
const START = {
  ræve: [[-10, 47], [-5, 50], [0, 46], [5, 50], [10, 47], [-12, 51], [12, 51], [0, 52]],
  slanger: [[-9.5, -47], [-4, -51], [0, -46], [4, -51], [8, -47], [-11, -50], [11, -50], [0, -52]],
};

// Omveje: punkter på sidevejene, som botterne nogle gange går forbi (så ikke alle går gennem midten)
const OMVEJE = [[44, 24], [44, -6], [-44, 24], [-44, -6]];

function byg({ b, solid, verden, hash }) {
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
  for (const [x, y, z, s] of [[-1.0, 0, 22.2, 1.4], [0.45, 0, 22.5, 1.4], [-0.35, 1.4, 22.35, 1.0],   // kassestakken midt i midtergaden (bryder den lange sigtelinje)
    [0, 0, -6, 1.4], [2.4, 0, 18, 1.2], [-2.6, 0, -18, 1.2], [33.6, 1, -35.2, 1.4], [33.6, 2.4, -35.2, 1.0], [38.6, 1, -31.2, 1.4],
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

  return {
    erFast, grænse: [MIN, MIN, MAX, MAX], tønder, lamper: LAMPER,
    palmer: [[-12, 49], [13, 43.5], [11, -51], [26, -25.5], [-25.5, -41], [46.5, 30], [-15, 51]],
    // ekstra punkter for foden og toppen af trapperne op til A og B (ellers passer gitteret ikke med trinene)
    ekstraKnuder: [[39, -25.5], [39, -29.5], [27.5, -33], [31.5, -33], [-27.5, -35], [-31.5, -35], [-39, -27.5], [-39, -31.5]],
  };
}

// Midtergaden (x tæt på 0) er kun en gang imellem en post — ellers står alle der og skyder på hinanden
const postVægt = ([x]) => Math.abs(x) < 5 ? 0.3 : 1;

// Bombepladserne: A og B er de to hævede pladser tæt på Sandslangernes start
const STEDER = { A: [34, -34, 7], B: [-34, -34, 7] };

// Gadelamper om natten: [x, z, højde, watt] — og stormen er en sandstorm
const NATLAMPER = [[3.5, -30, 4, 110], [-3.5, 0, 4, 110], [3.5, 28, 4, 110], [23, -36, 4, 110], [41, -26, 4, 110], [-26, -41, 4, 110], [-41, -26, 4, 110],
  [45, 12, 4, 110], [30, 45.5, 4, 110], [12, -10, 4, 110], [-14, -10, 4, 110], [-12, 43, 4, 110], [12, -43, 4, 110], [-30, 45.5, 4, 110]];

export default { navn: "Støvbyen", natLamper: NATLAMPER, storm: "sand", steder: STEDER, fotos: ["sandsten", "puds", "sand", "fliser"], start: START, poster: POSTER, omveje: OMVEJE, postVægt, byg };
