// ===== Museet — kamp indendørs, i stil med Office =====
// Ørkenrævene starter i gården foran museet (syd), Sandslangerne i personalegangen bagerst (nord).
// Tre veje ind i museet fra gården:
//  · Midten: hovedindgangen ind i forhallen og videre til lysgården (A) med den store statue under åben himmel
//  · Vest: sidedøren ind i den lange vestgang, med døre til butikken, rustkammeret (B) og malerisalen
//  · Øst: læsseporten ind i magasinet, og derfra ind i kontorgangen
// Alle rum har lamper, og lyset er bagt i Blender (lysgården får sit lys fra himlen).

const X0 = -40, X1 = 40, Z0 = -32, Z1 = 36;
const H = 6, DØR = 2.8, T = 0.5;                                   // loftshøjde, dørhøjde og murtykkelse
// Lamper: [x, y, z, loftet, watt]
const LAMPE = (x, z, w = 380) => [x, 5.3, z, H, w];
const LAMPER = [
  LAMPE(-33.2, -24, 280), LAMPE(-33.2, -8, 280), LAMPE(-33.2, 8, 280),                // vestgangen
  LAMPE(-21, -26), LAMPE(-21, -14), LAMPE(-21, 0), LAMPE(-21, 15),                    // malerisalen, rustkammeret og butikken
  LAMPE(-6, -27), LAMPE(6, -27), LAMPE(-5, 14, 450), LAMPE(5, 14, 450),              // personalegangen og forhallen
  LAMPE(16.5, -26), LAMPE(24.5, -26), LAMPE(32.5, -26), LAMPE(24, -19, 280),         // kontorerne og kontorgangen
  LAMPE(16.5, -12.5), LAMPE(24.5, -12.5), LAMPE(32.5, -12.5),
  LAMPE(18, 2, 500), LAMPE(30, 2, 500), LAMPE(18, 15, 500), LAMPE(30, 15, 500),     // magasinet
];
// Poster: [x, z, og det sted man kigger hen imod]
const POSTER = [
  // gården
  [-20, 25, 0, 22], [20, 25, 28, 22], [-30, 26, -30, 22], [0, 25.5, 0, 20], [33, 27, 28, 22],
  // forhallen og lysgården (A)
  [-8, 19, 0, 22], [8, 10, -8, 20], [0, 9, 0, -10], [-7, -3, 7, -3], [7, -12, -7, -3], [-6, -18, 0, 0], [6, 2, -6, -12],
  // vestgangen, butikken, rustkammeret og malerisalen (B)
  [-33, 18, -33, -20], [-33, -2, -33, 18], [-33, -26, -33, 0], [-20, 18, -28, 13], [-16, 12, -28, 13],
  [-22, 4, -28, 0], [-15, -4, -22, 2], [-26, -12, -15, -20], [-15, -27, -26, -18], [-24, -28, -16, -16], [-18, -10, -24, -24],
  // personalegangen
  [-11, -26, 0, -12], [11, -26, 0, -12], [0, -30, 0, -20], [0, -23, 0, -14],
  // kontorerne og kontorgangen
  [14, -19, 34, -19], [34, -19, 14, -19], [18.5, -25, 16, -21], [25, -14, 25, -18], [33.5, -25, 32, -21], [18.5, -13, 16, -18],
  // magasinet
  [16, 18, 28, 22], [32, 10, 20, 0], [18, -2, 30, 10], [33, -2, 16, 15], [24, 9, 28, 22],
];
const START = {
  ræve: [[-16, 33], [-13, 32], [-9, 33], [9, 33], [12, 34], [16, 33], [-20, 34], [20, 34]],          // (ikke lige ud for hoveddøren)
  slanger: [[-9, -28], [-5, -29.5], [0, -28], [5, -29.5], [9, -28], [-3, -27], [3, -27], [0, -30]],
};
const OMVEJE = [[-33, 0], [-33, -14], [24, 6], [24, -19]];
// Bombepladserne: A i lysgården, B i rustkammeret (lige langt for begge hold)
const STEDER = { A: [0, -14, 7.5], B: [-21.5, -4, 6] };

function byg({ b, solid, verden }) {
  const ekstra = [];                                               // punkter for vej-nettet ved hver dør
  // En mur langs x (z0..z1 er tykkelsen) eller langs z (x0..x1 er tykkelsen), med døråbninger [fra, til]
  const mur = (x0, z0, x1, z1, døre = [], mat = "galleri", o = {}) => {
    const langsX = x1 - x0 > z1 - z0, [a0, a1] = langsX ? [x0, x1] : [z0, z1], h = o.h ?? H, dh = o.dør ?? DØR;
    const del = (s0, s1, y0, y1, bund) => langsX ? solid(s0, y0, z0, s1, y1, z1, mat, { bund }) : solid(x0, y0, s0, x1, y1, s1, mat, { bund });
    let a = a0;
    for (const [d0, d1] of [...døre].sort((p, q) => p[0] - q[0])) {
      if (d0 > a) del(a, d0, 0, h);
      if (dh < h) del(d0, d1, dh, h, true);                          // over døren
      a = d1;
      const m = (d0 + d1) / 2, mt = langsX ? (z0 + z1) / 2 : (x0 + x1) / 2;   // vej-punkter i døren og på hver side af den
      for (const u of [-1.3, 0, 1.3]) ekstra.push(langsX ? [m, mt + u] : [mt + u, m]);
    }
    if (a < a1) del(a, a1, 0, h);
  };
  const tag = (x0, z0, x1, z1, mat = "panelHvid") => solid(x0, H, z0, x1, H + 0.5, z1, mat, { bund: true });   // loftet (undersiden ses indefra)
  const kasse = (x, y, z, s = 1.3) => solid(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, "trækasse", { prFlade: true });
  const maleri = (x, y, z, retning, w, h, stof) => {               // et maleri med ramme på en mur (retning: den vej det vender)
    const langsX = retning === "n" || retning === "s", ud = retning === "s" || retning === "ø" ? 1 : -1;
    const lag = (kant, d0, d1, m) => {
      const [u0, u1] = [Math.min(ud * d0, ud * d1), Math.max(ud * d0, ud * d1)];
      if (langsX) solid(x - w / 2 - kant, y - kant, z + u0, x + w / 2 + kant, y + h + kant, z + u1, m, { kollision: false });
      else solid(x + u0, y - kant, z - w / 2 - kant, x + u1, y + h + kant, z + w / 2 + kant, m, { kollision: false });
    };
    lag(0.1, 0, 0.05, "dør"); lag(0, 0, 0.07, stof);
  };

  // ---- jorden og gulvene (hvert stykke kun én gang, så de ikke flimrer) ----
  verden.tilføj(-60, -2, -60, 60, 0, 60, "sten");
  b.gulv(X0, 22, X1, Z1, "fliser");                                 // gården
  b.gulv(-12, -21.5, 12, 22, "fliser");                             // lysgården og forhallen
  b.gulv(-12, -32, 12, -21.5, "pier");                              // personalegangen
  b.gulv(-36, -32, -12, 22, "fliser");                              // vestgangen og de tre sale
  b.gulv(12, -32, 36, -7.5, "pier");                                // kontorerne
  b.gulv(12, -7.5, 36, 22, "beton");                                // magasinet

  // ---- gården: høje mure rundt om, et springvand, en varevogn og kasser ved læsseporten ----
  for (const [x0, z0, x1, z1] of [[X0 - 1, 22, X0, Z1 + 1], [X1, 22, X1 + 1, Z1 + 1], [X0, Z1, X1, Z1 + 1], [X0, 22, -36, 22.5], [36, 22, X1, 22.5]])
    solid(x0, 0, z0, x1, 8, z1, "sandsten");
  solid(-2.5, 0, 26.5, 2.5, 0.8, 29.5, "sandsten"); solid(-0.6, 0.8, 27.4, 0.6, 2.6, 28.6, "sandsten");   // springvandet
  solid(-7, 0, 31, 7, 2.2, 31.6, "sandsten");                        // en havemur bag springvandet (man kan ikke se fra døren ind i starten)
  solid(-23, 0, 26.5, -17, 2.4, 29, "panelHvid"); solid(-17, 0, 26.7, -15.5, 1.6, 28.8, "panelHvid");   // varevognen
  for (const [x, z] of [[-22, 26.5], [-19, 26.5], [-16.2, 26.7]]) solid(x - 0.9, 1.0, z - 0.04, x + 0.4, 1.9, z, "vindue", { kollision: false });
  kasse(27, 0, 26); kasse(28.4, 0, 26.3, 1.0); kasse(27.6, 1.3, 26.1, 1.0); kasse(33, 0, 30); kasse(-30, 0, 30, 1.4);

  // ---- facaden: en søjlegang foran hovedindgangen, vinduer og to røde bannere ----
  for (const x of [-8.5, -5, 5, 8.5]) solid(x - 0.4, 0, 24.6, x + 0.4, H, 25.4, "sandsten");
  solid(-10, H, 22, 10, H + 0.6, 26, "sandsten", { bund: true }); solid(-9, H + 0.6, 22, 9, H + 1.4, 25.4, "sandsten");
  for (let x = -26; x <= 22; x += 4) {
    if (Math.abs(x) < 11 || (x > -36 && x < -31)) continue;
    solid(x - 0.85, 1.45, 22, x + 0.85, 4.35, 22.08, "sandsten", { kollision: false }); solid(x - 0.7, 1.6, 22, x + 0.7, 4.2, 22.12, "vindue", { kollision: false });
  }
  for (const x of [-12.5, 12.5]) solid(x - 0.6, 2.4, 22, x + 0.6, 5.6, 22.06, "stofRød", { kollision: false });

  // ---- museets ydermure (døre: vest, hovedindgangen og læsseporten) og loftet (åbent over lysgården) ----
  mur(-36, 21.5, 24, 22, [[-35, -32], [-3, 3]], "sandsten");
  mur(24, 21.5, 36, 22, [[24, 32]], "sandsten", { dør: 4.5 });      // læsseporten er højere end en dør
  mur(-36, -32, 36, -31.5, [], "sandsten");
  mur(-36, -31.5, -35.5, 21.5, [], "sandsten"); mur(35.5, -31.5, 36, 21.5, [], "sandsten");
  tag(-36, -32, 36, -21.5); tag(-36, 6, 36, 22); tag(-36, -21.5, -12, 6); tag(12, -21.5, 36, 6);
  solid(-12, H, -21.5, 12, H + 0.3, -21, "dør", { bund: true }); solid(-12, H, 5.5, 12, H + 0.3, 6, "dør", { bund: true });   // kanten om lyset
  for (const x of [-12, 11.5]) solid(x, H, -21, x + 0.5, H + 0.3, 5.5, "dør", { bund: true });

  // ---- vestgangen og de tre sale (butikken, rustkammeret og malerisalen = B) ----
  mur(-31, -31.5, -30.5, 21.5, [[-20, -17.6], [-13, -10.6], [-1.2, 1.2], [12, 14.4]]);
  mur(-30.5, 8, -12.5, 8.5, [[-20, -17.6]]); mur(-30.5, -8, -12.5, -7.5, [[-24, -21.6]]);
  mur(-12.5, -31.5, -12, 21.5, [[-28, -25.6], [-14, -11.6], [-2, 0.4], [14, 16.4]]);
  // malerisalen: fritstående vægge med malerier — god dækning
  for (const [x, z, langsX] of [[-24, -24, true], [-17, -24, false], [-24, -14, false], [-17.5, -14, true]]) {
    if (langsX) { solid(x - 2, 0, z - 0.15, x + 2, 2.8, z + 0.15, "panelHvid"); maleri(x, 1.1, z + 0.15, "s", 1.6, 1.1, "stofRød"); maleri(x, 1.1, z - 0.15, "n", 1.6, 1.1, "stofBlå"); }
    else { solid(x - 0.15, 0, z - 2, x + 0.15, 2.8, z + 2, "panelHvid"); maleri(x + 0.15, 1.1, z, "ø", 1.6, 1.1, "stofBlå"); maleri(x - 0.15, 1.1, z, "v", 1.6, 1.1, "stofHvid"); }
  }
  for (const [z, stof] of [[-28.5, "stofRød"], [-24.5, "stofHvid"], [-15.5, "stofBlå"]]) maleri(-30.5, 1.3, z, "ø", 2.2, 1.5, stof);
  for (const [x, stof] of [[-25, "stofBlå"], [-17, "stofRød"]]) maleri(x, 1.3, -31.5, "s", 2.6, 1.6, stof);
  solid(-22, 0, -19.6, -20, 0.5, -18.4, "pier");                    // en bænk midt i salen
  // rustkammeret: montrer (kasser med mørkt glas på toppen)
  for (const [x, z] of [[-26, -3], [-26, 3], [-17, -3], [-17, 3], [-21.5, 0]]) {
    solid(x - 0.8, 0, z - 0.6, x + 0.8, 0.9, z + 0.6, "metal"); solid(x - 0.75, 0.9, z - 0.55, x + 0.75, 1.6, z + 0.55, "vindue");
  }
  // butikken: reoler og en disk
  for (const z of [11, 15]) solid(-28, 0, z, -22, 2.0, z + 0.6, "metal");
  solid(-17, 0, 17, -13, 1.1, 18.2, "pier");
  kasse(-27, 0, 19.5, 1.0); kasse(-25.6, 0, 19.8, 0.9);

  // ---- midten: personalegangen (Sandslangernes start), lysgården (A) og forhallen ----
  mur(-12, -22, 12, -21.5, [[-8, -5.6], [5.6, 8]]);
  mur(-12, 6, 12, 6.5, [[-6, 6]], "galleri", { dør: 4.5 });            // en bred bue mellem forhallen og lysgården
  for (const [x0, x1] of [[-10.5, -4], [4, 10.5]]) solid(x0, 0, -25, x1, H, -24.5, "galleri");      // skillevægge: man kan ikke se fra lysgården ind i starten
  for (const x of [-11, -9.6]) solid(x, 0, -31.4, x + 1.2, 2.2, -30.8, "metal");                      // skabe
  for (const x of [8.4, 9.8]) solid(x, 0, -31.4, x + 1.2, 2.2, -30.8, "metal");
  // lysgården: en stor statue på en sokkel, fire træer i krukker og bænke
  solid(-2, 0, -10, 2, 1.0, -6, "sandsten"); solid(-0.9, 1.0, -8.9, 0.9, 3.2, -7.1, "mørk"); solid(-1.5, 3.2, -9.3, 1.5, 3.8, -6.7, "mørk");
  solid(-0.5, 3.8, -8.5, 0.5, 5.2, -7.5, "mørk");
  for (const [x, z] of [[-8, -17], [8, -17], [-8, 2], [8, 2]]) solid(x - 0.9, 0, z - 0.9, x + 0.9, 0.8, z + 0.9, "sandsten");
  solid(-9, 0, -9, -8, 0.5, -5, "pier"); solid(8, 0, -9, 9, 0.5, -5, "pier");
  // forhallen: billetlugen og fire søjler
  solid(-9, 0, 16, -4, 1.1, 17.2, "pier"); solid(-9, 1.1, 16.9, -4, 2.4, 17.2, "vindue", { kollision: false });
  for (const [x, z] of [[-6, 10], [6, 10], [-6, 19], [6, 19]]) solid(x - 0.45, 0, z - 0.45, x + 0.45, H, z + 0.45, "sandsten");

  // ---- øst: kontorgangen med kontorer på begge sider, og magasinet med læsseporten ----
  mur(12, -31.5, 12.5, 21.5, [[-27, -24.6], [-20.2, -17.8], [-6, -3.6], [13, 15.4]]);
  mur(12.5, -21.5, 35.5, -21, [[15, 17.4], [23, 25.4], [31, 33.4]]);
  mur(12.5, -17, 35.5, -16.5, [[15, 17.4], [23, 25.4], [31, 33.4]]);
  for (const x of [20.5, 28.5]) { mur(x, -31.5, x + 0.5, -21.5); mur(x, -16.5, x + 0.5, -8); }
  mur(12.5, -8, 35.5, -7.5, [[16, 18.4], [30, 32.4]]);
  for (const x0 of [13.5, 21.5, 29.5]) {                            // et skrivebord og et arkivskab i hvert kontor
    solid(x0 + 0.5, 0, -29, x0 + 3.5, 0.8, -27.8, "pier"); solid(x0 + 4.6, 0, -31.4, x0 + 5.6, 1.4, -30.6, "metal");
    solid(x0 + 0.5, 0, -11.2, x0 + 3.5, 0.8, -10, "pier"); solid(x0 + 4.6, 0, -9.4, x0 + 5.6, 1.4, -8.6, "metal");
  }
  // magasinet: kasser, reoler og en statue i en kasse
  for (const [x, z] of [[16, 3], [17.4, 3.3], [16.6, 4.6], [27, 12], [28.4, 12.2], [22, 18], [33, 3], [33, -5]]) kasse(x, 0, z);
  kasse(16.6, 1.3, 3.2, 1.1); kasse(27.6, 1.3, 12.1, 1.1);
  for (const z of [-4.5, 7]) solid(20, 0, z, 26, 2.6, z + 0.7, "metal");
  solid(29, 0, 16, 32, 2.2, 19, "trækasse", { prFlade: true });

  return {
    grænse: [X0, Z0, X1, Z1], tønder: [[-34, -30], [34, 20], [14, 20.5], [-28.5, 24]], lamper: LAMPER, palmer: [],
    graner: [[-8, -17, 7], [8, -17, 7], [-8, 2, 6.5], [8, 2, 6.5], [-36, 33, 9], [36, 33, 9], [-12, 34, 8]].map(([x, z, h]) => [x, z, h, true, false]),   // (uden sne)
    ekstraKnuder: [...ekstra, ...[-10.5, -7, -3.5, 0, 3.5, 7, 10.5].map(x => [x, -23.25])],   // (og gangen bag skillevæggene)
  };
}

// Lyset: lamperne er hvidere end i de andre baner (som i et rigtigt museum)
const vejr = { lampeFarve: [1.0, 0.9, 0.76] };

// Gadelamper om natten i gården og lysgården: [x, z, højde, watt] — og stormen er regn med lyn og torden
const NATLAMPER = [[-30, 25.5, 4.5, 150], [-14, 25.5, 4.5, 150], [14, 25.5, 4.5, 150], [30, 25.5, 4.5, 150], [-24, 34, 4.5, 150], [24, 34, 4.5, 150], [-6, -19, 4, 120], [6, 4, 4, 120]];

export default { navn: "Museet", natLamper: NATLAMPER, storm: "regn", vejr, fotos: ["sandsten", "fliser", "beton", "panel"], start: START, poster: POSTER, omveje: OMVEJE, steder: STEDER, byg };
