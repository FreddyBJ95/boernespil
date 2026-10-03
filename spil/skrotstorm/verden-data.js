// Alle ruter, bygninger og opgaver bruger de samme koordinater.
export const GARAGE = { x: -275, z: 220, y: 0, navn: "Den blå garage" };
export const RUTER = [
  {
    navn: "Ørkenringen",
    bredde: 25,
    punkter: [
      [-275, 0, 220],
      [-345, 0, 80],
      [-325, 0, -140],
      [-245, 0, -230],
      [-70, 0, -265],
      [95, 5, -240],
      [215, 30, -175],
      [300, 57, -85],
      [330, 72, 45],
      [265, 58, 150],
      [160, 27, 220],
      [20, 0, 265],
      [-155, 0, 265],
      [-275, 0, 220],
    ],
  },
  { navn: "Fabriksvejen", bredde: 21, punkter: [[-325, 0, -140], [-170, 0, -130], [-20, 0, -190], [-70, 0, -265]] },
  { navn: "Solruten", bredde: 23, punkter: [[-275, 0, 220], [-170, 0, 80], [-90, 0, -40], [-170, 0, -130]] },
  { navn: "Brovejen", bredde: 22, punkter: [[-170, 0, 80], [-30, 0, 75], [80, 12, 100], [160, 27, 220]] },
  { navn: "Stuntvejen", bredde: 24, punkter: [[-90, 0, -40], [20, 0, -35], [105, 0, -25], [180, 0, 30], [210, 0, 100]] },
  { navn: "Solstationen", bredde: 20, punkter: [[-155, 0, 265], [-110, 0, 190], [20, 0, 265]] },
];
export const RAMPER = [
  { x: 75, z: -29, vinkel: Math.PI / 2, bredde: 14, længde: 32, højde: 6 },
  { x: -155, z: 190, vinkel: 0, bredde: 12, længde: 28, højde: 4 },
];
export const KOLLISIONER = [
  { x: -280, z: 256, r: 17, y: 0 },
  { x: -185, z: -182, r: 20, y: 0 },
  { x: -115, z: -195, r: 18, y: 0 },
  { x: -28, z: -236, r: 10, y: 0 },
  { x: 15, z: -217, r: 22, y: 0 },
  { x: -98, z: 218, r: 13, y: 0 },
  { x: 346, z: 19, r: 10, y: 72 },
  { x: -240, z: -90, r: 14, y: 0 },
  { x: -60, z: -138, r: 14, y: 0 },
  { x: -220, z: -280, r: 14, y: 0 },
  { x: -330, z: -230, r: 14, y: 0 },
];
export const DELE = [
  { x: -285, z: -176, navn: "Et tandhjul" },
  { x: -269, z: -201, navn: "En køler" },
  { x: -301, z: -203, navn: "Et hjulleje" },
];
export const BILER = [
  {
    id: "rotten",
    navn: "Rustrotten",
    tekst: "Let og hurtig. Den originale skrotbil.",
    fart: 30,
    kraft: 10,
    greb: 1,
    farve: 0xf19539,
  },
  {
    id: "buggy",
    navn: "Sandloppen",
    tekst: "Stærkt greb og hurtige sving i sandet.",
    fart: 28,
    kraft: 11,
    greb: 1.22,
    farve: 0x36b6ad,
  },
  { id: "truck", navn: "Jernoksen", tekst: "Tung, stabil og god til levering.", fart: 26, kraft: 9, greb: 1.12, farve: 0xeccc75 },
];
export const OPGRADERINGER = [
  { id: "motor", navn: "Motor", tekst: "Mere trækkraft og højere topfart", priser: [35, 65, 110] },
  { id: "hjul", navn: "Terrænhjul", tekst: "Bedre greb og mindre farttab i sand", priser: [30, 55, 95] },
  { id: "nitro", navn: "Nitro", tekst: "Længere boost og hurtigere genopladning", priser: [40, 70, 100] },
];
export const MISSIONER = [
  {
    id: "dele",
    navn: "1 · Tre gode fund",
    tekst: "Find de tre glødende reservedele på skrotpladsen. Kør tæt på for at samle dem op.",
    kort: "Find tre reservedele",
    mål: { x: -285, z: -190, y: 0 },
    belønning: 65,
    type: "dele",
  },
  {
    id: "levering",
    navn: "2 · Fabrikken vågner",
    tekst: "Reservedele er lastet. Kør dem til den orange fabrik. Den blå garage kan nu forbedre din bil.",
    kort: "Lever til fabrikken",
    mål: { x: -17, z: -197, y: 0 },
    belønning: 75,
    type: "levering",
  },
  {
    id: "løb",
    navn: "3 · Ørkenens kurér",
    tekst: "Følg fem blå porte på Solruten på under 100 sekunder. Kør ind i første port for at starte.",
    kort: "Følg de blå porte",
    mål: { x: -170, z: -128, y: 0 },
    belønning: 90,
    type: "løb",
    porte: [[-170, 0, -128], [-90, 0, -40], [-170, 0, 80], [-275, 0, 220], [-155, 0, 265]],
  },
  {
    id: "bjerg",
    navn: "4 · Signalet på toppen",
    tekst: "Tag Ørkenringen østpå, op gennem bjergpasset. Tænd signalet ved udsigtstårnet.",
    kort: "Nå udsigtstårnet",
    mål: { x: 330, z: 45, y: 72 },
    belønning: 100,
    type: "besøg",
  },
  {
    id: "hop",
    navn: "5 · Sand over kløften",
    tekst: "Kør fra vest mod øst over den store orange rampe ved Stuntvejen. Land sikkert efter et hop på mindst 0,55 sekund.",
    kort: "Hop over den orange rampe",
    mål: { x: 75, z: -29, y: 0 },
    belønning: 100,
    type: "hop",
  },
  {
    id: "sol",
    navn: "6 · Lys i støvet",
    tekst: "Batteriet er lastet. Lever det til solstationen syd for centrum.",
    kort: "Lever til solstationen",
    mål: { x: -110, z: 190, y: 0 },
    belønning: 110,
    type: "levering",
  },
  {
    id: "bro",
    navn: "7 · Broens hemmelighed",
    tekst: "Undersøg tre blå signaler på Brovejen. Følg rækkefølgen fra dalen til broens høje ende.",
    kort: "Undersøg broens signaler",
    mål: { x: -30, z: 75, y: 0 },
    belønning: 120,
    type: "porte",
    porte: [[-30, 0, 75], [80, 12, 100], [160, 27, 220]],
  },
  {
    id: "finale",
    navn: "8 · Skrotstormens hjerte",
    tekst: "Den gamle stormlygte er klar. Kør den til udsigtstårnet og giv hele dalen et nyt lys.",
    kort: "Tænd stormlygten",
    mål: { x: 330, z: 45, y: 72 },
    belønning: 200,
    type: "levering",
  },
];

// Landskabets højde: vejene ligger på jævne dæmninger, bjergene står udenfor ruten.
export function terrænHøjde(x, z) {
  const bakke = (cx, cz, h, r) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return bakke(400, -170, 110, 85) + bakke(420, 120, 125, 95) + bakke(180, -360, 65, 80) + bakke(-390, -340, 42, 85);
}

// Find nærmeste vejstykke, inklusive højden på bjergveje og broer.
export function nærmesteVej(x, z, støtteGrænse = Infinity) {
  let bedst = { afstand: Infinity, y: 0, bredde: 0 };
  for (const rute of RUTER) {
    for (let i = 1; i < rute.punkter.length; i++) {
      const a = rute.punkter[i - 1], b = rute.punkter[i];
      const dx = b[0] - a[0], dz = b[2] - a[2];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz)));
      const afstand = Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t);
      const y = a[1] + (b[1] - a[1]) * t;
      if (afstand < bedst.afstand && y <= støtteGrænse) {
        bedst = { afstand, y, bredde: rute.bredde, x: a[0] + dx * t, z: a[2] + dz * t };
      }
    }
  }
  return bedst;
}

// Kun flader under bilen kan støtte den. Et højt brodæk må ikke løfte bilen fra dalen.
// Uden højde bruges den øverste flade til kort og en udtrykkelig redning på vejen.
export function gulv(x, z, bilhøjde = Infinity) {
  // Små samlinger mellem opkørsler overlapper. Vælg nærmeste støtte i bilens niveau.
  const støtteGrænse = bilhøjde - 0.8 + 1.5;
  const vej = nærmesteVej(x, z, støtteGrænse);
  const påVej = vej.afstand < vej.bredde / 2 + 2 && vej.y <= støtteGrænse;
  let y = påVej ? vej.y : terrænHøjde(x, z);
  for (const r of RAMPER) {
    const dx = x - r.x, dz = z - r.z;
    const langs = dx * Math.sin(r.vinkel) + dz * Math.cos(r.vinkel);
    const tværs = dx * Math.cos(r.vinkel) - dz * Math.sin(r.vinkel);
    const rampehøjde = (langs / r.længde + 0.5) * r.højde;
    if (Math.abs(tværs) < r.bredde / 2 && langs >= -r.længde / 2 && langs <= r.længde / 2 && rampehøjde <= støtteGrænse) {
      y = Math.max(y, rampehøjde);
    }
  }
  return { y, vej: påVej && vej.afstand < vej.bredde / 2, afstand: vej.afstand };
}
