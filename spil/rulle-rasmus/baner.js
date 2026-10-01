// ===== Banerne i Rulle Rasmus =====
// Hver bane er en liste af stykker, der lægges efter hinanden (se bane.js for alle muligheder).
//   sving: grader (+ = højre, − = venstre) · r: radius i meter · lige: meter · hul: et hop over ingenting
//   bakke: op/ned · rampe: hop-rampe · bølger: [højde, antal] · rende: kanterne går op, så Rasmus holdes inde
//   kant: rækværk · flag: genstart her · mål: målstregen · frugt/puder/trampolin/fart: ting på banen
// Banen starter med standardværdierne øverst (bredde, rende, kant). fart: tophastighed (1 = normal).
// tema: se temaer.js · frø: tal der bestemmer, hvor pynten står
// mellem / svær: ekstra stykker, der sættes ind lige før målet på de sværere sværhedsgrader.

export const BANER = [
  {
    id: "engen", navn: "Engen", ikon: "🌼", tema: "eng", frø: 3,
    bredde: 7, rende: 0.35, kant: true, fart: 0.8,
    // Mellem og Svær: ekstra stykker lige før målet (Svær får begge dele)
    mellem: [
      { lige: 8, flag: true },
      { sving: 60, r: 13 },
      { lige: 10, bølger: [0.5, 2], puder: [[0.5, 1.2]] },
      { sving: -80, r: 12, rende: 0.8 },
      { lige: 8, bakke: -1.5, frugt: -1, rende: 0.4 },
      { sving: 40, r: 16 },
    ],
    svær: [
      { lige: 6, flag: true },
      { lige: 4, fart: true },
      { lige: 5, rampe: 0.9 },
      { hul: 4, bakke: -1 },
      { lige: 8, flag: true },
      { sving: -70, r: 12 },
      { lige: 12, bølger: [0.6, 3], puder: [[0.3, -1], [0.7, 1]] },
      { sving: 50, r: 14 },
    ],
    stykker: [
      { lige: 12 },
      { sving: 40, r: 18 },
      { lige: 8, bakke: -1.2 },
      { sving: -60, r: 14 },
      { lige: 6, flag: true },
      { lige: 10, puder: [0] },
      { sving: 70, r: 13, rende: 0.9 },
      { lige: 12, bølger: [0.6, 2], rende: 0.5, frugt: -1.5 },
      { sving: -50, r: 16, flag: true },
      { lige: 10, kant: false, bakke: -1.5 },
      { sving: 45, r: 16, kant: false },
      { lige: 8, bakke: 1 },
      { sving: -35, r: 18, flag: true },
      { lige: 10, frugt: 1.5 },
      { lige: 6, mål: true, bredde: 8.5 },
      { lige: 12 },
    ],
  },
  {
    id: "slik", navn: "Slikbanen", ikon: "🍭", tema: "slik", frø: 5,
    bredde: 6, rende: 0.5, kant: true, fart: 0.9,
    mellem: [
      { lige: 6, flag: true },
      { sving: 70, r: 11, rende: 1.1 },
      { lige: 10, bakke: -2, bølger: [0.4, 2], rende: 0.5 },
      { sving: -90, r: 10, rende: 1.2 },
      { lige: 8, puder: [[0.5, 0]], frugt: 1.5, rende: 0.5 },
    ],
    svær: [
      { lige: 6, flag: true },
      { lige: 5, trampolin: true },
      { hul: 4.5, bakke: 0.5 },
      { lige: 8, flag: true },
      { sving: 100, r: 11, rende: 1.2, bakke: -2 },
      { lige: 12, bredde: 4.5, bølger: [0.5, 3], rende: 0.4 },
      { sving: -60, r: 13, bredde: 6 },
    ],
    stykker: [
      { lige: 10 },
      { sving: -60, r: 12 },
      { lige: 10, puder: [[0.3, -1.4], [0.75, 1.4]] },
      { sving: 90, r: 10, rende: 1.3 },
      { lige: 6, flag: true, rende: 0.5 },
      { lige: 12, bølger: [0.55, 3], frugt: 1.2 },
      { sving: -80, r: 11, bredde: 5, kant: false },
      { lige: 5, fart: true, kant: false },
      { lige: 10, bakke: -3, kant: false },
      { sving: 120, r: 12, rende: 1.4, flag: true, bredde: 6 },
      { lige: 5, trampolin: true, rende: 0.4 },
      { hul: 4.5, stjerner: true },
      { lige: 8, flag: true },
      { sving: -70, r: 13, kant: false, frugt: -1 },
      { lige: 10, bakke: -1.5, puder: [0] },
      { lige: 6, mål: true, bredde: 8 },
      { lige: 12 },
    ],
  },
  {
    id: "is", navn: "Isbanen", ikon: "❄️", tema: "is", frø: 9,
    bredde: 7, rende: 0.8, kant: true, fart: 0.9, is: true,
    mellem: [
      { lige: 6, flag: true },
      { sving: -60, r: 13, rende: 1.2 },
      { lige: 12, bakke: -2, rende: 0.8 },
      { sving: 90, r: 12, rende: 1.3 },
      { lige: 8, frugt: -1.5, rende: 0.8 },
    ],
    svær: [
      { lige: 6, flag: true, is: false },
      { lige: 4, fart: true, is: false },
      { lige: 5, rampe: 1.0, is: false },
      { hul: 4.5, bakke: -1.5 },
      { lige: 8, flag: true },
      { sving: -120, r: 11, rende: 1.4, bakke: -2 },
      { lige: 10, bølger: [0.5, 3], bredde: 5, rende: 0.6 },
      { sving: 40, r: 15, bredde: 7 },
    ],
    stykker: [
      { lige: 10, is: false },
      { sving: 50, r: 16 },
      { lige: 10, bakke: -2 },
      { sving: -90, r: 12, rende: 1.4 },
      { lige: 8, flag: true },
      { lige: 14, bølger: [0.55, 3], kant: false, frugt: 0 },
      { sving: 180, r: 11, rende: 1.5, bakke: -3 },
      { lige: 6, flag: true, rende: 0.8 },
      { lige: 10, bredde: 5.5, rende: 0.5, kant: false },
      { sving: -70, r: 14, kant: true, rende: 1.1 },
      { lige: 8, puder: [[0.5, 0]], bredde: 7, rende: 0.8 },
      { sving: 60, r: 14, flag: true },
      { lige: 10, bakke: -1, frugt: 1.5 },
      { lige: 6, mål: true, bredde: 8.5, is: false },
      { lige: 12, is: false },
    ],
  },
  {
    id: "jungle", navn: "Junglen", ikon: "🌴", tema: "jungle", frø: 11,
    bredde: 5, rende: 0.25, kant: true, fart: 1,
    mellem: [
      { lige: 6, flag: true },
      { sving: 70, r: 12 },
      { lige: 4, fart: true },
      { lige: 5, rampe: 1.0 },
      { hul: 4.5, bakke: -1 },
      { lige: 8, flag: true },
      { sving: -60, r: 12, rende: 0.8 },
    ],
    svær: [
      { lige: 10, bredde: 4, bølger: [0.4, 3], rende: 0.3 },
      { sving: 90, r: 11, rende: 0.9, flag: true, bredde: 5 },
      { lige: 4, trampolin: true },
      { hul: 5, bakke: 0.8 },
      { lige: 8, flag: true },
      { sving: -80, r: 12 },
      { lige: 8, puder: [[0.5, 0.9]], rende: 0.3 },
    ],
    stykker: [
      { lige: 10 },
      { sving: 45, r: 14 },
      { lige: 8, kant: false },
      { sving: -45, r: 14, flag: true },
      { lige: 4, fart: true },
      { lige: 5, rampe: 1.0, kant: false },
      { hul: 4.5, bakke: -1.2 },
      { lige: 8, bredde: 6, flag: true },
      { sving: 90, r: 11, rende: 0.9 },
      { lige: 10, bølger: [0.4, 3], kant: false, rende: 0.3, frugt: 1 },
      { lige: 4, trampolin: true, bredde: 5 },
      { hul: 4.5, bakke: 1 },
      { lige: 8, flag: true },
      { sving: -100, r: 12, rende: 1 },
      { lige: 12, bakke: -2, puder: [[0.3, -1.1], [0.7, 1.1]], rende: 0.3 },
      { lige: 6, mål: true, bredde: 7 },
      { lige: 12 },
    ],
  },
  {
    id: "regnbue", navn: "Regnbuen", ikon: "🌈", tema: "regnbue", frø: 13,
    bredde: 5, rende: 0.4, kant: false, fart: 1.05,
    mellem: [
      { lige: 6, flag: true },
      { sving: 90, r: 12, rende: 1.2 },
      { lige: 12, bakke: -2, bølger: [0.5, 3], rende: 0.4 },
      { sving: -70, r: 13 },
      { lige: 4, fart: true },
      { lige: 5, rampe: 1.0 },
      { hul: 5, bakke: -1.5 },
      { lige: 8, flag: true },
    ],
    svær: [
      { sving: 120, r: 11, rende: 1.3 },
      { lige: 12, bredde: 3.8, rende: 0.3, frugt: 0 },
      { sving: -90, r: 12, rende: 1.0, bredde: 5 },
      { lige: 4, trampolin: true },
      { hul: 5 },
      { lige: 8, flag: true },
      { lige: 12, bakke: -3, bølger: [0.6, 2], rende: 0.4 },
    ],
    stykker: [
      { lige: 10, kant: true },
      { sving: 60, r: 14, kant: true },
      { lige: 12, bølger: [0.6, 3] },
      { sving: -90, r: 12, rende: 1.2, flag: true },
      { lige: 4, fart: true, bredde: 5.5, rende: 0.3 },
      { lige: 5, rampe: 1.1 },
      { hul: 5.5, bakke: -1.5 },
      { lige: 8, flag: true, bredde: 5 },
      { sving: 120, r: 11, rende: 1.3, bakke: -2, kant: true },
      { lige: 12, bredde: 4, rende: 0.35, frugt: 0 },
      { sving: -60, r: 14 },
      { lige: 4, trampolin: true, bredde: 5 },
      { hul: 4.5 },
      { lige: 8, flag: true, bredde: 5.5 },
      { lige: 14, bakke: -4, bølger: [0.7, 2] },
      { lige: 6, mål: true, bredde: 8, kant: true },
      { lige: 12, kant: true },
    ],
  },
];

// ---------- Sværhedsgrader ----------
// Nem: banen som den står ovenfor. Mellem: længere, lidt smallere og hurtigere, med hegn kun i de skarpe sving.
// Svær: endnu længere, smal, hurtig og helt uden kanter (kun ved start og mål er der hegn).
export const SVÆRHED = {
  nem:    { navn: "Nem", ikon: "🐢", bredde: 1, rende: 1, fart: 1, kant: "alle" },
  mellem: { navn: "Mellem", ikon: "🐇", bredde: 0.86, rende: 0.8, fart: 1.08, kant: "sving" },
  svær:   { navn: "Svær", ikon: "🚀", bredde: 0.76, rende: 0.6, fart: 1.15, kant: "ingen" },
};

// Laver banen i den valgte sværhedsgrad ud fra den grundlæggende bane
export function lavBaneDef(grund, sv = "nem") {
  const s = SVÆRHED[sv] || SVÆRHED.nem;
  const ekstra = sv === "mellem" ? grund.mellem || [] : sv === "svær" ? [...(grund.mellem || []), ...(grund.svær || [])] : [];
  const stykker = grund.stykker.slice();
  const mi = stykker.findIndex(st => st.mål);
  stykker.splice(mi, 0, ...ekstra);
  const målNr = mi + ekstra.length;
  let w = Math.max(3.8, grund.bredde * s.bredde);        // bredden undervejs (til at se, om der er plads til puder)
  return {
    ...grund, sv,
    bredde: Math.max(3.8, grund.bredde * s.bredde), rende: (grund.rende ?? 0.3) * s.rende, fart: (grund.fart ?? 1) * s.fart,
    stykker: stykker.map((st, k) => {
      const n = { ...st };
      if (n.bredde) n.bredde = Math.max(3.8, n.bredde * s.bredde);
      if (n.frugt != null) n.frugt *= s.bredde;           // frugt og puder rykker med ind, når banen bliver smallere
      if (n.puder) n.puder = [].concat(n.puder).map(pu => Array.isArray(pu) ? [pu[0], pu[1] * s.bredde] : pu * s.bredde);
      const wFør = w;
      if (n.bredde) w = n.bredde;
      if (n.puder && Math.min(wFør, w) < 4.8) delete n.puder;   // på en smal bane er der ikke plads til at køre udenom
      if (n.rende != null) n.rende *= s.rende;
      if (k > 0 && k < målNr) {                           // start og mål beholder deres hegn
        if (s.kant === "ingen") n.kant = false;
        else if (s.kant === "sving") n.kant = (n.kant ?? grund.kant ?? true) && Math.abs(n.sving || 0) >= 60;
      }
      return n;
    }),
  };
}
