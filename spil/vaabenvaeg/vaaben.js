// ===== Våbnene på væggen =====
// Hvert fotovåben er et udklippet billede. Alle mål er i billedets egne pixels (b × h).
//   greb      = hvor hånden holder (rekylen drejer om dette punkt)
//   munding   = hvor ilden kommer ud      udkast = hvor hylstrene flyver ud
//   slæde     = pistolens slæde: et omrids i fotoet, der glider `vandring` pixels bagud ved hvert skud
//   indre     = det man ser, når slæden er tilbage: løbet [x0, x1, midte, tykkelse] og fjederen
//   kammer    = hvor den næste patron ses, når slæden er tilbage
//   spænder   = ladegrebet (MP5), der trækkes tilbage, når der skiftes magasin
//   magasin   = enten et eget billede (M4) eller et omrids i fotoet; vinkel = hvor skråt det glider ud,
//               ud = hvor langt det skal glide for at være fri; krop = den del, der er skjult inde i grebet
//   lyddæmper = længde og tykkelse i millimeter (så får våbnet en lyddæmperknap)
// Kilder og licenser til fotoene står i billeder/KILDER.txt.
export const VÅBEN = [
  { id: "glock", navn: "Glock", type: "foto", billede: "billeder/glock.webp", b: 1375, h: 953, mmPrEnhed: 202 / 1375,
    greb: [300, 600], munding: [1372, 118], udkast: [800, 40],
    slæde: { form: [[100, 0], [1400, 0], [1400, 178], [885, 178], [870, 166], [745, 164], [738, 174], [100, 176]], vandring: 290 },
    indre: [{ løb: [700, 1372, 118, 58] }, { fjeder: [960, 1345, 158, 30] }],
    magasin: { form: [[30, 904], [372, 896], [372, 962], [30, 962]], vinkel: 0.33, ud: 820, krop: { x: 205, y: 906, b: 245, l: 700, farve: "plast" } },
    auto: false, kadence: 7, cyklus: 0.1, patroner: 17, hylster: "9mm", lyd: "pistol",
    glimt: 120, rekyl: { skub: 330, løft: 1.7 }, ryst: 0.3, lyddæmper: { l: 165, d: 34 } },

  { id: "m9", navn: "Beretta", type: "foto", billede: "billeder/m9.webp", b: 1671, h: 1029, mmPrEnhed: 217 / 1671,
    greb: [290, 640], munding: [1669, 104], udkast: [520, 40],
    slæde: { form: [[162, 15], [706, 15], [706, 166], [1450, 166], [1450, 0], [1606, 0], [1606, 322], [1450, 328], [1450, 305], [600, 300], [588, 270], [152, 270]], vandring: 290 },
    indre: [{ løb: [540, 1669, 106, 116] }, { fjeder: [1120, 1590, 245, 40] }],
    kammer: [388, 112],
    magasin: { form: [[85, 982], [458, 982], [458, 1034], [85, 1034]], vinkel: 0.1, ud: 860, krop: { x: 272, y: 984, b: 225, l: 740, farve: "stål" } },
    auto: false, kadence: 6, cyklus: 0.1, patroner: 15, hylster: "9mm", lyd: "pistol",
    glimt: 120, rekyl: { skub: 300, løft: 1.5 }, ryst: 0.3, lyddæmper: { l: 165, d: 34 } },

  { id: "deagle", navn: "Desert Eagle", type: "foto", billede: "billeder/deagle.webp", b: 937, h: 576, mmPrEnhed: 267 / 937,
    greb: [230, 380], munding: [936, 112], udkast: [230, 20],
    slæde: { form: [[57, 18], [318, 18], [318, 168], [792, 168], [792, 254], [320, 254], [300, 228], [57, 228]], vandring: 150 },
    indre: [{ løb: [150, 340, 112, 92] }, { fjeder: [560, 800, 212, 26] }],
    kammer: [92, 122],
    magasin: { form: [[130, 516], [290, 516], [330, 506], [364, 500], [364, 550], [130, 550]], vinkel: 0.06, ud: 340, krop: { x: 236, y: 518, b: 150, l: 290, farve: "stål" } },
    auto: false, kadence: 4, cyklus: 0.13, patroner: 7, hylster: "50ae", lyd: "stor",
    glimt: 230, rekyl: { skub: 560, løft: 2.8 }, ryst: 0.6 },

  { id: "mp5", navn: "MP5", type: "foto", billede: "billeder/mp5.webp", b: 1273, h: 829, mmPrEnhed: 550 / 1273,
    greb: [230, 480], munding: [1271, 230], udkast: [470, 150],
    spænder: { form: [[790, 86], [880, 86], [880, 154], [790, 154]], vandring: 190, rør: [780, 890, 122, 46] },
    magasin: { form: [[497, 385], [624, 385], [642, 500], [674, 600], [720, 700], [752, 770], [752, 834], [596, 834], [558, 700], [530, 600], [515, 545], [497, 470]], vinkel: -0.12, ud: 480 },
    auto: true, kadence: 13, patroner: 30, hylster: "9mm", lyd: "maskinpistol",
    glimt: 95, rekyl: { skub: 210, løft: 0.5 }, ryst: 0.25, lyddæmper: { l: 200, d: 42 } },

  { id: "m4", navn: "Automatgevær", type: "foto",
    billede: "billeder/m4.webp", b: 1855, h: 561, mmPrEnhed: 838 / 1855,
    greb: [540, 360], munding: [1853, 152], udkast: [850, 120],
    magasin: { billede: "billeder/m4_magasin.webp", x: 778, y: 280, vinkel: 0, ud: 480 },
    port: { x: 747, y: 102, b: 179, h: 32, dæksel: [744, 100, 185, 35], hængsel: 139 },
    auto: true, kadence: 13, patroner: 30, hylster: "556", lyd: "riffel",
    glimt: 170, rekyl: { skub: 380, løft: 1.0 }, ryst: 0.35, sporlys: 4, lyddæmper: { l: 170, d: 40 } },

  { id: "ak", navn: "AK-47", type: "foto", billede: "billeder/ak47.webp", b: 1688, h: 494, mmPrEnhed: 880 / 1688,
    greb: [530, 380], munding: [1686, 96], udkast: [880, 100],
    magasin: { form: [[778, 193], [916, 193], [1085, 425], [1085, 535], [830, 535], [778, 260]], vinkel: -0.25, ud: 420 },
    auto: true, kadence: 10, patroner: 30, hylster: "762", lyd: "ak",
    glimt: 200, rekyl: { skub: 430, løft: 1.2 }, ryst: 0.45, sporlys: 5 },

  { id: "m249", navn: "Maskingevær", type: "foto", billede: "billeder/m249.webp", b: 1677, h: 766, mmPrEnhed: 893 / 1677,
    greb: [530, 520], munding: [1675, 98], udkast: [650, 320], udkastNed: true, led: [740, 320],
    magasin: { form: [[720, 372], [918, 372], [918, 580], [720, 580]], vinkel: 0, ud: 300 },
    auto: true, kadence: 14, patroner: 100, hylster: "556", lyd: "mg",
    glimt: 190, rekyl: { skub: 340, løft: 0.8 }, ryst: 0.5, sporlys: 4 },

  // ---- Sci-fi (billeder lavet med ChatGPT til spillet) ----
  //   skud   = hvad der kommer ud: kugle, ringe, hagl eller slim, i farven `farve`
  //   lys    = selvlysende steder [x, y, bredde, højde, bølge] — de gløder og blinker ved hvert skud
  //   kløer  = dele der drejer om `om` (åbner sig ved skuddet)     kugle = energikuglen, der vokser frem igen
  //   pumpe  = haglgeværets pumpe, der glider tilbage og frem       bobler = glastanke med bobler
  //   opladning = sekunder om at lade op igen (ingen magasiner)     skal = patronerne trykkes i én ad gangen
  { id: "gravitation", navn: "Gravitonkanon", type: "foto", billede: "billeder/gravitation.webp", b: 1500, h: 570, mmPrEnhed: 0.6,
    greb: [580, 420], munding: [1317, 255],
    skud: { slags: "kugle", farve: "190,110,255", størrelse: 74, lyd: "plasma" },
    kugle: { x: 1317, y: 255, r: 74 },
    kløer: [{ form: [[1205, 25], [1500, 25], [1500, 228], [1448, 228], [1400, 190], [1330, 178], [1262, 186], [1205, 200]], om: [1235, 128], drej: -0.3 },
            { form: [[1205, 312], [1262, 326], [1330, 334], [1400, 322], [1448, 282], [1500, 282], [1500, 450], [1205, 450]], om: [1235, 350], drej: 0.3 }],
    lys: [[597, 218, 115, 42], [903, 202, 50, 40], [597, 294, 40, 15], [661, 68, 55, 18], [1113, 250, 24, 100]],
    auto: false, kadence: 2.2, patroner: 10, opladning: 1.4, rekyl: { skub: 620, løft: 1.3 }, ryst: 1.2 },

  { id: "straale", navn: "Strålepistol", type: "foto", billede: "billeder/straale.webp", b: 1500, h: 643, mmPrEnhed: 0.25,
    greb: [260, 420], munding: [1490, 234], antenne: [705, 16],
    skud: { slags: "ringe", farve: "80,255,220", størrelse: 60, lyd: "retro" },
    lys: [[467, 214, 85, 34], [897, 234, 36, 126, 1], [1100, 234, 36, 126, 2], [1270, 234, 36, 126, 3]],
    auto: true, kadence: 5, patroner: 20, opladning: 1.0, rekyl: { skub: 220, løft: 0.7 }, ryst: 0.35 },

  { id: "hagl", navn: "Energihagl", type: "foto", billede: "billeder/hagl.webp", b: 1500, h: 418, mmPrEnhed: 0.55,
    greb: [440, 300], munding: [1495, 79], munding2: [1495, 212], udkast: [555, 110],
    skud: { slags: "hagl", farve: "255,140,40", antal: 10, lyd: "hagl" },
    pumpe: { form: [[800, 158], [1135, 158], [1135, 290], [800, 290]], vandring: 140, rør: [985, 1150, 222, 82] },
    hylster: "energi", lys: [[555, 133, 70, 30]],
    auto: false, kadence: 1.6, patroner: 6, skal: true, glimt: 260, rekyl: { skub: 720, løft: 2.3 }, ryst: 1.4 },

  { id: "krabbe", navn: "Krabbeblaster", type: "foto", billede: "billeder/krabbe.webp", b: 1500, h: 713, mmPrEnhed: 0.4,
    greb: [725, 480], munding: [1208, 294],
    skud: { slags: "slim", farve: "90,255,80", størrelse: 30, lyd: "slim" },
    kløer: [{ form: [[1110, 40], [1500, 40], [1500, 262], [1440, 262], [1300, 250], [1250, 212], [1230, 198], [1110, 198]], om: [1150, 140], drej: -0.28 },
            { form: [[1110, 355], [1240, 350], [1290, 330], [1500, 322], [1500, 600], [1110, 600]], om: [1150, 425], drej: 0.28 }],
    bobler: [[315, 225, 515, 285], [650, 222, 740, 268]],
    lys: [[1208, 294, 70, 70], [862, 226, 45, 40], [944, 298, 30, 30], [415, 255, 110, 34], [695, 245, 50, 26]],
    auto: true, kadence: 6, patroner: 25, opladning: 1.2, rekyl: { skub: 260, løft: 0.8 }, ryst: 0.35 },

  { id: "laser", navn: "Lasergevær", type: "laser", b: 1000, h: 380, mmPrEnhed: 0.9,
    greb: [425, 300], munding: [1000, 160], auto: true, kadence: 8, patroner: 40,
    rekyl: { skub: 220, løft: 0.45 }, ryst: 0.18 },

  // Lysværdet: tegnet med kode (svaerd.js). Første tryk tænder klingen, de næste svinger sværdet,
  // og ladeknappen skifter farve. munding = hvor klingen kommer ud af skaftet.
  { id: "lysvaerd", navn: "Lysværd", type: "sværd", b: 1480, h: 120, mmPrEnhed: 0.8,
    greb: [125, 60], munding: [340, 60], auto: true, kadence: 2.4, patroner: 1,
    rekyl: { skub: 0, løft: 0 }, ryst: 0 },
];
