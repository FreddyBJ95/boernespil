// ===== Fjeldbyen — en lille by i sneen mellem fjeldene =====
// Sandslangerne starter foran Fjeldhotellet i nord, Ørkenrævene foran skiudlejningen i syd. Tre veje mellem dem:
//  · Vest: skoven med graner, store sten og en jagthytte, man kan løbe igennem
//  · Midten: torvet med en frossen sø, et juletræ, boder og en scene, et bageri og et posthus foran starterne —
//    og en hvid trækirke og en kro på hver side, som man også kan løbe igennem
//  · Øst: savværket med et stort halvtag, stakke af træstammer og et lille kontor
// Det sner, og lyset er bagt i Blender (lamperne i kirken, kroen, jagthytten og savværket også).

const X0 = -50, X1 = 50, Z0 = -54, Z1 = 54;
// Lamper: [x, y, z, loftet, watt]
const LAMPER = [[-24.5, 5.6, -4.5, 7, 140], [-24.5, 5.6, 4.5, 7, 140], [24.5, 5.2, -3, 6.5, 120], [24.5, 5.2, 4, 6.5, 120],
  [-41, 3.5, 0, 4.2, 90], [37, 4.9, -4, 5.5, 110], [37, 4.9, 4, 5.5, 110]];
// Poster: [x, z, og det sted man kigger hen imod]
const POSTER = [
  // skoven og jagthytten
  [-45, -30, -40, 0], [-36, -36, -24, -42], [-35, -12, -44, 0], [-41.5, -1.5, -41.5, -20], [-40.5, 1.5, -40.5, 20], [-44, 20, -36, 0], [-36, 33, -44, 10], [-45, 44, -40, 20],
  // kirken og strædet ved siden af
  [-24.5, -5, -20, 0], [-21.5, -1, -29, 0], [-32, 0, -44, 0], [-17, 1, 0, 0], [-28, -22, -18, -18], [-22, 22, -40, 20], [-26, 11.5, -20, 20],
  // torvet
  [-12, -24, 0, -10], [12, -24, 0, -10], [9.5, -34, 9.5, -10], [-11, -12, 8, 0], [11, -12, -8, 0], [-15, 4, 10, 0], [15, 0, -10, 0],
  [-4, 17.5, 0, 0], [4, 17.5, 0, -10], [-9, 23.5, 0, 10], [9, 23.5, 0, 10],
  // kroen og strædet ved siden af
  [21, 4, 29, 0], [28, -3, 20, 3], [24, -20, 10, -20], [28.5, 11, 40, 12], [22, 20, 10, 20],
  // savværket
  [36, -6, 30, -20], [36, 6, 30, 20], [45, -1, 34, 0], [32, -30, 40, -40], [44, -26, 40, -40], [32, 30, 40, 40], [44, 26, 36, 20], [48.5, 2, 48.5, -10],
  // ved starterne
  [-38, -44, -38, -20], [38, -44, 38, -20], [-38, 44, -38, 20], [38, 44, 38, 20],
];
const START = {
  ræve: [[-6, 44], [-2, 44], [2, 44], [6, 44], [-10, 44], [10, 44], [-4, 42], [4, 42]],
  slanger: [[-6, -44], [-2, -44], [2, -44], [6, -44], [-10, -44], [10, -44], [-4, -42], [4, -42]],
};
const OMVEJE = [[-40, -12], [-40, 12], [41, -12], [41, 12], [-21, -19], [-22, 17], [24, -20], [24, 20.5]];
// Graner: [x, z, højde] (dem på banen kan man ikke gå igennem — stammen er hård)
const GRANER = [
  [-45, -36, 10], [-36, -31, 9], [-47, -22, 11], [-33, -20, 8], [-41, -15, 10], [-48, -8, 9], [-33, -6, 9], [-34, 8, 10], [-47, 9, 9],
  [-40, 15, 11], [-33, 20, 8], [-46, 24, 10], [-38, 29, 9], [-44, 38, 10], [-34, 37, 9],
  [33, -37, 9], [46, -40, 10], [32, 36, 9], [47, 43, 10], [44, 15, 9],
  [0, -15, 13],                                                                      // juletræet på torvet
];

function byg({ b, solid, verden, hash }) {
  // ---- jorden, fjeldet hele vejen rundt og knoldene ----
  verden.tilføj(-70, -2, -70, 70, 0, 70, "sand");
  b.gulv(X0, Z0, X1, Z1, "sne");
  for (const [x0, z0, x1, z1, h] of [[X0 - 4, Z0 - 4, X0, Z1 + 4, 16], [X1, Z0 - 4, X1 + 4, Z1 + 4, 15], [X0, Z0 - 4, X1, Z0, 18], [X0, Z1, X1, Z1 + 4, 14]])
    solid(x0, 0, z0, x1, h, z1, "klippe");
  // fjeldvæggen er ikke lige: klippestykker i forskellige størrelser stikker ud, med sne på toppen
  // (ikke foran hotellet og skiudlejningen, og ikke ved stien bag savværket)
  const klipper = (fra, til, kant, ind, langsX, fri) => {
    for (let a = fra, i = 0; a < til; i++) {
      const w = 4 + hash(i * 7 + kant, 13) * 6, d = 0.8 + hash(i * 3, kant * 5 + 1) * 2.4, h = 7 + hash(kant + i * 11, 29) * 12;
      if (!fri(a, a + w)) {
        const [i0, i1] = ind > 0 ? [kant, kant + d] : [kant - d, kant];
        if (langsX) solid(a, 0, i0, a + w, h, i1, "klippe", { topMat: "sne" }); else solid(i0, 0, a, i1, h, a + w, "klippe", { topMat: "sne" });
      }
      a += w * (0.6 + hash(i, kant) * 0.3);
    }
  };
  klipper(X0, X1, Z0, 1, true, (a, b) => b > -19.5 && a < 19.5);                 // nord (hotellet)
  klipper(X0, X1, Z1, -1, true, (a, b) => b > -17.5 && a < 17.5);                // syd (skiudlejningen)
  klipper(Z0 + 2, Z1 - 2, X0, 1, false, () => false);                           // vest
  klipper(Z0 + 2, Z1 - 2, X1, -1, false, (a, b) => b > -13 && a < 24);          // øst (stien bag savværket)

  // ---- små byggeklodser: tag med sne, vinduer, kasser og sten ----
  const tag = (x0, z0, x1, z1, y) => {                              // fladt tag i to trin med sne på toppen
    solid(x0 - 0.5, y, z0 - 0.5, x1 + 0.5, y + 0.45, z1 + 0.5, "tagSort", { topMat: "sne", bund: true });
    const ind = Math.min(x1 - x0, z1 - z0) * 0.18;
    solid(x0 + ind, y + 0.45, z0 + ind, x1 - ind, y + 1.1, z1 - ind, "tagSort", { topMat: "sne" });
  };
  const vindue = (x, y, z, retning, b = 1.2, h = 1.3) => {         // retning: den vej muren vender ("n", "s", "v", "ø") — vinduet sidder uden på
    const langsX = retning === "n" || retning === "s", ud = retning === "s" || retning === "ø" ? 1 : -1;
    const klods = (kant, dybde, m) => {
      const a = b / 2 + kant, [u0, u1] = [Math.min(0, ud * dybde), Math.max(0, ud * dybde)];
      if (langsX) solid(x - a, y - kant, z + u0, x + a, y + h + kant, z + u1, m, { kollision: false });
      else solid(x + u0, y - kant, z - a, x + u1, y + h + kant, z + a, m, { kollision: false });
    };
    klods(0.12, 0.04, "panelHvid"); klods(0, 0.07, "vindue");                                   // en hvid karm og det mørke glas
  };
  const række = (a0, a1, fast, y, retning, ret = "x", dør = null) => {   // vinduer for hver 3,2 meter langs en mur (ikke lige over døren)
    for (let a = a0 + 1.6; a <= a1 - 1.4; a += 3.2) {
      if (dør !== null && y < 2 && Math.abs(a - dør) < 2.2) continue;
      ret === "x" ? vindue(a, y, fast, retning) : vindue(fast, y, a, retning);
    }
  };
  const hus = (x0, z0, x1, z1, h, mat, vinduer = "nsvø", dør = null) => {   // et hus, man ikke kan gå ind i: mure, tag og vinduer
    solid(x0, 0, z0, x1, h, z1, mat); tag(x0, z0, x1, z1, h);
    for (const y of h > 7 ? [1.3, 4.6, 7.9].filter(y => y + 1.6 < h) : [1.4]) {
      if (vinduer.includes("n")) række(x0, x1, z0, y, "n", "x", dør);
      if (vinduer.includes("s")) række(x0, x1, z1, y, "s", "x", dør);
      if (vinduer.includes("v")) række(z0, z1, x0, y, "v", "z");
      if (vinduer.includes("ø")) række(z0, z1, x1, y, "ø", "z");
    }
  };
  const kasse = (x, y, z, s = 1.3) => solid(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, "trækasse", { prFlade: true });
  const sten = (x, z, w, h, d) => solid(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, "sten");
  const stak = (x0, z0, x1, z1, h) => solid(x0, 0, z0, x1, h, z1, "stammer");           // en stak træstammer

  // ---- Fjeldhotellet i nord (Sandslangerne) og skiudlejningen i syd (Ørkenrævene) ----
  hus(-18, -54, 18, -47, 12, "panelGul", "s", 0);
  solid(-1.4, 0, -47, 1.4, 2.8, -46.9, "dør", { prFlade: true, kollision: false });
  solid(-3, 3.2, -47, 3, 3.5, -44.5, "tagSort", { topMat: "sne", bund: true });              // et halvtag over indgangen
  for (const x of [-2.8, 2.8]) solid(x - 0.12, 0, -44.82, x + 0.12, 3.2, -44.58, "panelHvid");
  hus(-16, 47, 16, 54, 8, "panelRød", "n", 0);
  solid(-1.4, 0, 46.9, 1.4, 2.8, 47, "dør", { prFlade: true, kollision: false });
  for (const s of [-1, 1]) { stak(s > 0 ? 6 : -13, -41, s > 0 ? 13 : -6, -39.6, 2.2); stak(s > 0 ? 6 : -13, 39.6, s > 0 ? 13 : -6, 41, 2.2); }   // stakke foran starterne
  kasse(-24, 0, -42); kasse(24, 0, -42.5); kasse(-24, 0, 42.5); kasse(24.5, 0, 42); kasse(24.5, 1.3, 42, 1.0);

  // ---- vest for torvet: to huse og den hvide trækirke med tårn (døre mod skoven og mod torvet) ----
  hus(-30, -36, -20, -25, 6.5, "panelRød");
  hus(-30, 25, -20, 36, 6.5, "panelGul");
  const K = 0.5, KH = 7;
  solid(-30, 0, -9, -19, KH, -9 + K, "panelHvid"); solid(-30, 0, 9 - K, -19, KH, 9, "panelHvid");
  for (const [x0, x1] of [[-30, -30 + K], [-19 - K, -19]]) {
    solid(x0, 0, -9 + K, x1, KH, -1.5, "panelHvid"); solid(x0, 0, 1.5, x1, KH, 9 - K, "panelHvid"); solid(x0, 3.2, -1.5, x1, KH, 1.5, "panelHvid", { bund: true });
  }
  tag(-30, -9, -19, 9, KH);
  for (const x of [-27.5, -24.5, -21.5]) vindue(x, 2.2, 9, "s", 1.1, 2.6);
  for (const z of [-6, -3.5, 4, 6.5]) { vindue(-30, 2.2, z, "v", 1.1, 2.6); vindue(-19, 2.2, z, "ø", 1.1, 2.6); }
  for (const z of [-7.5, -5.5, -3.5, 2.5, 4.5, 6.5]) { solid(-28.5, 0, z, -25.5, 0.9, z + 0.5, "panelBrun"); solid(-23.5, 0, z, -20.5, 0.9, z + 0.5, "panelBrun"); }   // kirkebænkene
  solid(-26, 0, -8.5, -23, 1.0, -7.8, "panelHvid");                                         // alteret
  // tårnet med spir og kors (et pejlemærke, man kan se fra hele byen)
  solid(-27, 0, -13.5, -22, 15, -9, "panelHvid");
  for (const [y, s] of [[10.5, "n"], [10.5, "s"]]) vindue(-24.5, y, s === "n" ? -13.5 : -9, s, 1.4, 2.2);
  vindue(-27, 10.5, -11.25, "v", 1.4, 2.2); vindue(-22, 10.5, -11.25, "ø", 1.4, 2.2);
  solid(-27.4, 15, -13.9, -21.6, 15.5, -8.6, "tagSort", { topMat: "sne", bund: true });
  solid(-26.4, 15.5, -12.9, -22.6, 17.5, -9.6, "tagSort", { topMat: "sne" });
  solid(-25.4, 17.5, -11.9, -23.6, 20, -10.6, "tagSort", { topMat: "sne" });
  solid(-24.6, 20, -11.35, -24.4, 22.4, -11.15, "metal", { kollision: false }); solid(-25.0, 21.5, -11.35, -24.0, 21.7, -11.15, "metal", { kollision: false });
  // strædet nord for kirken: et skur — og syd for kirken: et brændeskur
  solid(-29, 0, -21, -24, 2.6, -17, "panelBrun"); solid(-29.4, 2.6, -21.4, -23.6, 2.9, -16.6, "tagSort", { topMat: "sne", bund: true });
  solid(-29, 0, 14, -25, 2.8, 18, "panelBrun"); solid(-29.4, 2.8, 13.6, -24.6, 3.1, 18.4, "tagSort", { topMat: "sne", bund: true });

  // ---- øst for torvet: to huse og kroen (døre mod torvet og mod savværket, ikke lige over for hinanden) ----
  hus(20, -36, 30, -25, 6.5, "panelGul");
  hus(20, 25, 30, 36, 6.5, "panelBrun");
  const KR = 6.5;
  solid(19, 0, -8, 30, KR, -7.5, "panelRød"); solid(19, 0, 7.5, 30, KR, 8, "panelRød");
  solid(19, 0, -7.5, 19.5, KR, 2, "panelRød"); solid(19, 0, 5, 19.5, KR, 7.5, "panelRød"); solid(19, 3, 2, 19.5, KR, 5, "panelRød", { bund: true });
  solid(29.5, 0, -7.5, 30, KR, -5, "panelRød"); solid(29.5, 0, -2, 30, KR, 7.5, "panelRød"); solid(29.5, 3, -5, 30, KR, -2, "panelRød", { bund: true });
  tag(19, -8, 30, 8, KR);
  for (const x of [21.5, 24.5, 27.5]) { vindue(x, 1.6, -8, "n"); vindue(x, 1.6, 8, "s"); }
  solid(22.5, 0, -6.5, 23.5, 1.1, 0, "panelBrun");                                           // disken
  solid(26, 0, 3, 27.2, 0.8, 4.2, "panelBrun"); solid(26, 0, -0.4, 27.2, 0.8, 0.8, "panelBrun");  // bordene
  solid(21, 0, -17, 28, 2.3, -15.6, "stammer");                                              // brænde i strædet nord for kroen
  solid(22, 0, 13, 27, 2.6, 17, "panelBrun"); solid(21.6, 2.6, 12.6, 27.4, 2.9, 17.4, "tagSort", { topMat: "sne", bund: true });   // et skur syd for kroen
  kasse(28.5, 0, 19); kasse(28.6, 0, 20.4, 1.0);

  // ---- torvet: den frosne sø, boder, juletræet, en scene, en brønd, bageriet og posthuset ----
  // (husene og stakkene står, så man ikke kan se hele vejen fra den ene start til den anden)
  solid(-8, 0, -6, 8, 0.04, 6, "is");
  solid(-1.6, 0.04, -1.4, 1.6, 2.5, 1.4, "panelRød"); solid(-2, 2.5, -1.8, 2, 2.75, 1.8, "tagSort", { topMat: "sne", bund: true });   // en isfiskerhytte på søen
  vindue(-1.6, 1.2, 0, "v", 0.7, 0.6); vindue(1.6, 1.2, 0, "ø", 0.7, 0.6);
  solid(-14, 0, -9, -10, 1.2, -8.2, "sne"); solid(10, 0, 8.2, 14, 1.2, 9, "sne");                            // to snevolde (dækning, når man dukker sig)
  solid(-17, 0, 12, -13, 2.4, 15, "sne"); solid(13, 0, -15, 17, 2.4, -12, "sne");                           // store bunker af skovlet sne
  solid(-16.6, 2.4, 12.4, -13.4, 3.0, 14.6, "sne"); solid(13.4, 2.4, -14.6, 16.6, 3.0, -12.4, "sne");
  for (const [x0, stof] of [[-13, "stofRød"], [7, "stofBlå"]]) {
    solid(x0, 0, -18.6, x0 + 6, 1.1, -18, "panelBrun");                                      // disken
    solid(x0, 0, -21, x0 + 6, 2.6, -20.8, "panelBrun");                                       // bagvæggen
    for (const x of [x0, x0 + 5.8]) { solid(x, 0, -21, x + 0.2, 2.6, -20.8, "panelBrun"); solid(x, 1.1, -18.6, x + 0.2, 2.6, -18.4, "panelBrun"); }
    solid(x0 - 0.3, 2.6, -21.3, x0 + 6.3, 2.8, -17.7, stof, { bund: true });
  }
  solid(-6, 0, 15, 6, 1.0, 20, "panelBrun");                                                  // scenen
  solid(-2, 0, 14.4, 2, 0.667, 15, "panelBrun"); solid(-2, 0, 13.8, 2, 0.333, 14.4, "panelBrun");
  solid(-6, 1.0, 19.6, 6, 4.2, 20, "panelRød");
  for (const x of [-6, 5.7]) solid(x, 1.0, 15, x + 0.3, 4.2, 15.3, "panelHvid");
  solid(-6.4, 4.2, 14.6, 6.4, 4.5, 20.4, "tagSort", { topMat: "sne", bund: true });
  solid(-13.8, 0, 8.2, -12.2, 1.0, 9.8, "sten");                                              // brønden
  for (const x of [-13.8, -12.4]) solid(x, 1.0, 8.9, x + 0.2, 2.6, 9.1, "panelBrun");
  solid(-14.2, 2.6, 7.8, -11.8, 2.8, 10.2, "tagSort", { topMat: "sne", bund: true });
  hus(-7, -38, 7, -31, 6, "panelRød");                                                       // bageriet
  hus(-7, 27, 7, 33, 6, "panelGul");                                                          // posthuset
  stak(-18, -12, -14.5, -10.5, 2.2); stak(14.5, 9, 18, 10.5, 2.2);
  for (const s of [-1, 1]) for (const [z0, z1] of [[22, 25], [-29, -26]]) {                 // fire skure: syd for scenen og nord for boderne
    const [x0, x1] = s < 0 ? [-17, -11] : [11, 17];
    solid(x0, 0, z0, x1, 2.8, z1, "panelBrun"); solid(x0 - 0.4, 2.8, z0 - 0.4, x1 + 0.4, 3.1, z1 + 0.4, "tagSort", { topMat: "sne", bund: true });
  }
  solid(-14, 0, -4, -12.5, 0.5, 2, "panelBrun"); solid(12.5, 0, -2, 14, 0.5, 4, "panelBrun");   // bænke
  verden.tilføj(10.4, 0, 9.4, 11.6, 1.9, 10.6, "sand");                                       // snemanden (tegnes i pynt)

  // ---- skoven: jagthytten (døre i begge ender) og store sten ----
  solid(-45, 0, -4, -42.5, 4.2, -3.6, "panelBrun"); solid(-40.5, 0, -4, -37, 4.2, -3.6, "panelBrun"); solid(-42.5, 2.4, -4, -40.5, 4.2, -3.6, "panelBrun", { bund: true });
  solid(-45, 0, 3.6, -41.5, 4.2, 4, "panelBrun"); solid(-39.5, 0, 3.6, -37, 4.2, 4, "panelBrun"); solid(-41.5, 2.4, 3.6, -39.5, 4.2, 4, "panelBrun", { bund: true });
  solid(-45, 0, -3.6, -44.6, 4.2, 3.6, "panelBrun"); solid(-37.4, 0, -3.6, -37, 4.2, 3.6, "panelBrun");
  tag(-45, -4, -37, 4, 4.2);
  vindue(-45, 1.5, 0, "v"); vindue(-37, 1.5, 0, "ø");
  solid(-43.8, 0, -1, -42.6, 0.8, 1, "panelBrun"); solid(-38.6, 0, 1.6, -37.4, 1.4, 3.2, "metal");     // bordet og brændeovnen
  for (const [x, z, w, h, d] of [[-36, -26, 3, 2.2, 2.6], [-46, 16, 4, 2.8, 3], [-35.5, 26, 2.6, 1.6, 2.4], [-43, 31, 3.2, 2.4, 3.6], [-40, -42, 4, 1.8, 2.6], [-31.5, -40, 2.4, 1.4, 2]]) sten(x, z, w, h, d);

  // ---- savværket: et stort halvtag med en sav, planker og stammer — og et kontor ----
  for (const x of [34, 46.6]) for (const z of [-9, -0.2, 8.6]) solid(x, 0, z, x + 0.4, 5.5, z + 0.4, "panelBrun");
  solid(47, 0, -9, 47.4, 5.5, 9, "panelBrun");
  solid(33.6, 5.5, -9.6, 47.8, 6.0, 9.6, "tagSort", { topMat: "sne", bund: true });
  solid(39.5, 0, -6, 41, 1.0, 4, "panelBrun"); solid(40.15, 1.0, -1.2, 40.35, 1.7, 0.2, "metal", { kollision: false });   // savbænken og klingen
  solid(43, 0, -7.5, 45.5, 1.4, -3, "panelBrun"); stak(42.5, 2.5, 46.5, 7.5, 1.8);
  stak(33, -27, 39, -22, 1.8); stak(41, -34, 47, -30, 2.4); stak(35, 21, 41, 26, 1.6); stak(42, 29, 46.5, 36, 2.2);
  hus(40, -21, 46, -15, 3.8, "panelRød", "nvs");

  return {
    grænse: [X0, Z0, X1, Z1], tønder: [[-15.5, -43], [15.5, -42], [-14, 43], [33, 12], [31.5, -12]], lamper: LAMPER, palmer: [],
    graner: GRANER,
    // ekstra punkter: trappen op på scenen, dørene i kirken og jagthytten og stien bag savværket
    ekstraKnuder: [[0, 13.5], [0, 15.6], [-1.5, 13.5], [1.5, 13.5], [-1.5, 15.6], [1.5, 15.6],
      [-31, 0], [-28.6, 0], [-26.5, 0], [-24.5, 0], [-22.5, 0], [-20.4, 0], [-18, 0], [-24.5, -6], [-24.5, -3], [-24.5, 3], [-24.5, 6],
      [-41.5, -5.2], [-41.5, -2.8], [-41.5, 0], [-40.5, 2.8], [-40.5, 5.2], [-40.5, 0],
      ...[-10, -7, -4, -1, 2, 5, 8, 11, 14, 17, 20].map(z => [48.7, z])],
    pynt,
  };
}

// Det, der kun er til at se på: snemanden, fjeldene langt væk og sneen, der falder
function pynt({ scene, THREE }) {
  const hvid = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.9 }), sort = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 });
  const mand = new THREE.Group();
  for (const [r, y] of [[0.6, 0.55], [0.45, 1.35], [0.32, 1.95]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), hvid); k.position.y = y; k.castShadow = k.receiveShadow = true; mand.add(k); }
  const næse = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0xe8701e, roughness: 0.7 }));
  næse.rotation.x = Math.PI / 2; næse.position.set(0, 1.97, 0.42); mand.add(næse);
  for (const x of [-0.11, 0.11]) { const ø = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), sort); ø.position.set(x, 2.06, 0.28); mand.add(ø); }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 14), sort); hat.position.y = 2.36; mand.add(hat);
  mand.position.set(11, 0, 10); mand.rotation.y = -0.7; scene.add(mand);

  // fjeldene rundt om byen: store kegler med sne på toppen, lyse og blålige som langt væk
  // (lidt eget lys, så siden væk fra solen er blågrå som luften langt væk — ikke sort)
  const fjeld = new THREE.MeshLambertMaterial({ color: 0x8a9aab, emissive: 0x5a6878, flatShading: true, fog: false });
  const top = new THREE.MeshLambertMaterial({ color: 0xe8eef4, emissive: 0x8a96a6, flatShading: true, fog: false });
  for (let i = 0; i < 16; i++) {
    const v = i / 16 * Math.PI * 2 + 0.2, afst = 260 + (i * 37 % 5) * 30, h = 70 + (i * 53 % 7) * 14, r = h * 1.3;
    const g = new THREE.Group(); g.position.set(Math.cos(v) * afst, -4, Math.sin(v) * afst);
    const k = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), fjeld); k.position.y = h / 2; g.add(k);
    const t = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, h * 0.36, 7), top); t.position.y = h * 0.82 + 0.5; g.add(t);
    g.rotation.y = i * 1.3; scene.add(g);
  }

  // sneen: små hvide fnug i en kasse rundt om kameraet — de falder og driver lidt med vinden
  const N = 2600, B = 56, H = 28, basis = new Float32Array(N * 3), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { basis[i * 3] = Math.random() * B; basis[i * 3 + 1] = Math.random() * H; basis[i * 3 + 2] = Math.random() * B; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lærred = document.createElement("canvas"); lærred.width = lærred.height = 32;
  const g = lærred.getContext("2d"), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(0.5, "rgba(255,255,255,0.8)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
  const fnug = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, map: new THREE.CanvasTexture(lærred), transparent: true, depthWrite: false, opacity: 0.9 }));
  fnug.frustumCulled = false; scene.add(fnug);
  let tid = 0;
  const mod = (a, n) => ((a % n) + n) % n;
  return {
    opdater(dt, kam) {
      tid += dt;
      for (let i = 0; i < N; i++) {
        const j = i * 3, svaj = Math.sin(tid * 0.7 + i) * 0.4;
        pos[j] = kam.x - B / 2 + mod(basis[j] + tid * 0.6 + svaj - kam.x, B);
        pos[j + 1] = kam.y - 8 + mod(basis[j + 1] - tid * 1.1 - kam.y, H);
        pos[j + 2] = kam.z - B / 2 + mod(basis[j + 2] + tid * 0.25 - kam.z, B);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Skoven og savværket skal have flere besøg — torvet får dem af sig selv (alle går over det)
const postVægt = ([x]) => Math.abs(x) > 30 ? 1.7 : Math.abs(x) < 18 ? 0.75 : 1;
// Vejret: en klar vinterdag med lav sol, blå himmel og lidt dis
const vejr = {
  tåge: [0xdce4ec, 45, 185], sol: [-0.5, 0.55, 0.45], solFarve: 0xfff1e0, solStyrke: 2.6,
  himmel: [0x5f86b8, 0xb8cde2, 0xeef2f6], horisont: [0.86, 0.9, 0.97], zenit: [0.4, 0.55, 0.85], himmelLys: 1.25,
};

// Bombepladserne (tættere på Sandslangernes start, som i CS): A mellem savværket og kontoret, B nord i skoven
const STEDER = { A: [36, -13, 6], B: [-38, -20, 7] };

export default { navn: "Fjeldbyen", steder: STEDER, fotos: ["sne", "klippe", "panel"], start: START, poster: POSTER, omveje: OMVEJE, postVægt, vejr, byg };
