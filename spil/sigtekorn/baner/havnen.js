// ===== Havnen — en containerhavn ved vandet =====
// Ørkenrævene starter i vest, Sandslangerne i øst. Tre veje mellem dem:
//  · Nord: kajen langs vandet, ind til containerpladsen under den store kran (A)
//  · Midten: den brede gade med containere og kasser som dækning
//  · Syd: de smalle stræder langs lagerhallen (B), med døre ind i hallen fra begge sider
// Bag kajen ligger et containerskib (kun til at se på). Lyset er bagt i Blender (lamperne i hallen også).

const X0 = -60, X1 = 60, Z0 = -46, Z1 = 48;
const L = 6.06, W = 2.44, H = 2.59;                              // en container (meter)
// Lamper i lagerhallen: [x, y, z, loftet, watt]
const LAMPER = [[-8, 6, 26, 8, 260], [8, 6, 26, 8, 260], [-8, 6, 35, 8, 260], [8, 6, 35, 8, 260], [0, 6, 30.5, 8, 260], [0, 6, 41, 8, 260]];
// Poster: [x, z, og det sted man kigger hen imod]
const POSTER = [
  // vest og øst ud fra starterne
  [-44, -43, 0, -43], [-44, 2, 0, 2], [-21, 16, -16, 40], [44, -43, 0, -43], [44, 2, 0, 2], [21, 16, 16, 40],
  // kajen og containerpladsen (A)
  [-30, -43.5, 0, -43], [-20.5, -43.5, 10, -30], [-10, -29, 20, -30], [5, -26, 20, -40], [12, -38, -10, -30], [22, -29, 0, -20], [28, -43.5, 0, -40], [33, -43.5, 10, -43],
  // gaden i midten
  [-30, -2, 0, 0], [-12, -9, 12, 0], [0, -9.5, 0, -22], [0, 10, 20, 12], [12, 11, -12, 0], [30, -7, 0, 0], [36, 13, 16, 30],
  // lagerhallen (B) og strædet på hver side
  [0, 23.5, 0, 14], [-10.5, 39.5, 10, 30], [9, 41, -12, 31], [-11, 31.5, -16, 31.5], [11, 31.5, 16, 31.5],
  [-16, 22, -16, 44], [-16, 45, -16, 20], [16, 22, 16, 44], [16, 45, 16, 20],
  // baggaderne
  [-40, 44.5, -16, 44.5], [-24, 43, -44, 44], [40, 44.5, 16, 44.5], [24, 43, 44, 44],
];
const START = {
  ræve: [[-55, -6], [-53, -2], [-55, 2], [-53, 6], [-56, 10], [-52, -10], [-57, -2], [-51, 2]],
  slanger: [[55, -6], [53, -2], [55, 2], [53, 6], [56, 10], [52, -10], [57, -2], [51, 2]],
};
const OMVEJE = [[-30, -43], [30, -43], [-30, 44.5], [30, 44.5], [-16, 31], [16, 31]];
const FARVER = ["containerRød", "containerBlå", "containerGrøn", "containerOrange", "containerGul", "containerHvid"];

function byg({ b, solid, verden, hash }) {
  // jorden og en usynlig mur ved kajkanten (man kan ikke hoppe i vandet)
  verden.tilføj(-70, -2, Z0, 70, 0, 60, "sten");
  verden.tilføj(-62, 0.9, Z0 - 0.45, 62, 7, Z0, "sten");
  b.gulv(X0, Z0, X1, Z1, "beton");
  solid(X0, 0, Z0 - 0.45, X1, 0.9, Z0, "beton");                   // den lave kant mod vandet

  // ---- husene: lagerbygninger hele vejen rundt og fire blokke, der laver vejene ----
  for (const [x0, z0, x1, z1, h] of [[X0 - 2, Z0, X0, Z1 + 2, 12], [X1, Z0, X1 + 2, Z1 + 2, 12], [X0, Z1, X1, Z1 + 2, 12],
    [-46, -40, -20, -14, 10], [30, -40, 46, -14, 10], [-46, 18, -18, 41, 11], [18, 18, 46, 41, 11],
    [-8, -3, 8, 6, 9]]) solid(x0, 0, z0, x1, h, z1, "lagerhal");                  // (den sidste: kontorbygningen midt i gaden)
  // (bag blokkene i syd går en baggade langs muren fra starterne hen til strædet ved lagerhallen)

  // ---- lagerhallen (B): mure med en stor port mod nord og en dør i hver side — og et tag ----
  const T = 0.5, HH = 8;
  solid(-14, 0, 20, -4, HH, 20 + T, "lagerhal"); solid(4, 0, 20, 14, HH, 20 + T, "lagerhal"); solid(-4, 4.5, 20, 4, HH, 20 + T, "lagerhal", { bund: true });
  for (const [x0, x1] of [[-14, -14 + T], [14 - T, 14]]) {
    solid(x0, 0, 20 + T, x1, HH, 30, "lagerhal"); solid(x0, 0, 33, x1, HH, Z1, "lagerhal"); solid(x0, 3, 30, x1, HH, 33, "lagerhal", { bund: true });
  }
  solid(-14, HH, 20, 14, HH + 0.4, Z1, "lagerhal", { bund: true });
  // inde i hallen: en læsserampe (B-pladsen) med trapper, og reoler med kasser
  solid(-6, 0, 38, 6, 1, 45, "beton");
  solid(-4, 0, 37.4, 4, 0.667, 38, "beton"); solid(-4, 0, 36.8, 4, 0.333, 37.4, "beton");
  const kasse = (x, y, z, s = 1.3) => solid(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, "trækasse", { prFlade: true });
  for (const [x0, x1] of [[-11, -5], [5, 11]]) for (const z of [25, 33]) {
    for (const x of [x0, x1]) for (const zz of [z, z + 1.6]) solid(x - 0.06, 0, zz - 0.06, x + 0.06, 3.2, zz + 0.06, "metal");     // stolperne
    for (const y of [1.0, 2.1, 3.2]) solid(x0, y, z - 0.06, x1, y + 0.08, z + 1.66, "metal", { bund: true });                    // hylderne
    kasse(x0 + 1.2, 1.08, z + 0.8, 1.0); kasse(x1 - 1.4, 2.18, z + 0.8, 0.9);
  }
  kasse(-3.5, 1, 41.5); kasse(3.2, 1, 40.3); kasse(3.2, 2.3, 40.3, 1.0); kasse(-9, 0, 42, 1.4); kasse(10, 0, 23.5, 1.4);

  // ---- containerne: på pladsen ved kajen (A), i gaden og ved starterne ----
  const container = (x, z, langsZ, høj, farve) => {
    for (let i = 0; i < høj; i++) {
      const [lx, lz] = langsZ ? [W, L] : [L, W];
      solid(x - lx / 2, i * H, z - lz / 2, x + lx / 2, (i + 1) * H, z + lz / 2, FARVER[(farve + i * 2) % FARVER.length]);
    }
  };
  for (const [x, z, langsZ, høj] of [
    // A: containerpladsen
    [-14, -36, 0, 2], [-14, -24, 0, 1], [-4, -31, 1, 3], [8, -42, 0, 1], [16, -34, 1, 2], [22, -24, 0, 1], [26, -40, 1, 2], [4, -20.5, 0, 1], [-15, -43, 0, 1],
    // gaden
    [-24, -3, 0, 1], [-31, 8, 1, 2], [0, -7, 0, 1], [10, 3, 1, 2], [24, -4, 0, 1], [31, 9, 1, 1], [-9, 12, 0, 1],
    [-16, -8, 1, 2], [18, 8, 1, 2], [-38, 2, 0, 1], [38, -2, 0, 1], [6, -11, 0, 2],
    // baggaderne
    [-34, 44.6, 0, 1], [36, 44.6, 0, 1],
    // ved starterne
    [-50, -24, 1, 2], [-50, 26, 1, 1], [50, -24, 1, 2], [50, 26, 1, 1],
  ]) container(x, z, langsZ, høj, Math.floor(hash(x * 3, z * 7) * FARVER.length));
  // kasser og trapper op på nogle af de lave containere (så man kan komme derop)
  for (const [x, z] of [[-20, -2], [26.5, -5.8], [-1.5, -9.3], [4, -18.3], [-17, -24]]) { kasse(x, 0, z, 1.3); }

  // ---- kranen over containerpladsen: fire ben og bjælker højt oppe ----
  for (const [x, z] of [[-8, -44], [-8, -22], [16, -44], [16, -22]]) solid(x - 0.6, 0, z - 0.6, x + 0.6, 18, z + 0.6, "containerGul");
  for (const x of [-8, 16]) solid(x - 0.7, 18, -44.6, x + 0.7, 19.6, -21.4, "containerGul", { bund: true, kollision: false });
  solid(-8.7, 19.6, -33.8, 16.7, 21, -31.4, "containerGul", { bund: true, kollision: false });
  solid(2, 16.6, -34, 5, 19.6, -31.2, "containerHvid", { bund: true, kollision: false });                                     // førerhuset

  // ---- tønder og pullerter langs kajen ----
  const tønder = [];
  for (const [x, z] of [[-38, -44.6], [-26, -44.6], [-2, -44.6], [24, -44.6], [38, -44.6], [-40, 12], [40, -12], [-6, 44], [7, 22]]) {
    verden.tilføj(x - 0.32, 0, z - 0.32, x + 0.32, 0.95, z + 0.32, "metal"); tønder.push([x, z]);
  }
  return {
    grænse: [X0, Z0, X1, Z1], tønder, lamper: LAMPER, palmer: [],
    ekstraKnuder: [[0, 36], [0, 39.5], [-2, 36], [2, 36], [-2, 39.5], [2, 39.5]],      // trappen op på læsserampen
    pynt: pynt,
  };
}

// Det, der kun er til at se på: vandet og containerskibet bag kajen (ikke med i lysbilledet)
function pynt({ scene, THREE }) {
  const vand = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshStandardMaterial({ color: 0x1d4a58, roughness: 0.12, metalness: 0.15 }));
  vand.rotation.x = -Math.PI / 2; vand.position.set(0, -1.6, Z0 - 150); vand.receiveShadow = true; scene.add(vand);
  const kaj = new THREE.Mesh(new THREE.BoxGeometry(300, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x6a665e, roughness: 0.9 }));
  kaj.position.set(0, -0.8, Z0 - 0.75); scene.add(kaj);
  const skib = new THREE.Group(), m = (farve, ru = 0.7) => new THREE.MeshStandardMaterial({ color: farve, roughness: ru, metalness: 0.2 });
  const boks = (w, h, d, farve, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(farve)); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; skib.add(o); return o; };
  boks(90, 9, 18, 0x23344a, 0, 2, 0); boks(90, 1.2, 18.4, 0x8a2a22, 0, -2.6, 0);                                  // skroget
  boks(12, 12, 14, 0xe8e6e0, -36, 12.5, 0); boks(13, 1, 15, 0x3a3a3a, -36, 19, 0); boks(3, 6, 3, 0xd8d8d0, -38, 22.5, 0);  // broen og skorstenen
  const farver = [0xb83a2a, 0x2a5aa8, 0x3a8a4a, 0xd8782a, 0xd8b02a, 0xd8d8d0];
  for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 2 + ((i * 7 + j) % 3); k++)
    boks(L, H, W, farve(farver, i, j, k), -24 + i * 6.6, 6.5 + k * H + H / 2, -5 + j * (W + 0.3));
  skib.position.set(25, 0, Z0 - 62); scene.add(skib);
}
const farve = (f, i, j, k) => f[(i * 5 + j * 3 + k * 7) % f.length];

// Lagerhallen (B) og strædet ved siden af skal have flere besøg — gaden i midten får dem af sig selv
const postVægt = ([x, z]) => z > 18 && Math.abs(x) < 18 ? 2.6 : z > -16 && z < 16 ? 0.6 : 1;

export default { navn: "Havnen", start: START, poster: POSTER, omveje: OMVEJE, postVægt, byg };
