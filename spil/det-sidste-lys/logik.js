// Otte kapitler fører fra det første brev til fyrets sidste lys.
export const OPGAVER = [
  {
    id: "brev",
    navn: "Et brev på kajen",
    mål: "Find Elins brev i den røde postkasse på havnen.",
    sted: "havn",
    hjælp: "Gå hen til den lille røde postkasse på kajen. Tryk på Undersøg, når den er tæt på.",
  },
  {
    id: "nøgle",
    navn: "Fyrmesterens værksted",
    mål: "Åbn tidevandslåsen ved værkstedet i landsbyen.",
    sted: "værksted",
    hjælp: "Elins brev siger: faldende vand, tre mærker, vestenvind. Vælg Faldende, III og Vest i låsen.",
  },
  {
    id: "harpiks",
    navn: "Skovens rav",
    mål: "Saml rav fra de tre gamle fyrretræer i skoven.",
    sted: "skov",
    hjælp: "De tre ravtræer står rundt om skovens lysning. Ravet lyser varmt ved stammerne. Find alle tre.",
  },
  {
    id: "linse",
    navn: "Den gamle linse",
    mål: "Løs kompasrosen i ruinen mod nord.",
    sted: "ruin",
    hjælp: "De tre mærker på nøglen læses fra håndtag til spids: Ugle, Måne, Bølge. Sæt ruinens ringe i den rækkefølge.",
  },
  {
    id: "strøm",
    navn: "Et hjerte af lys",
    mål: "Forbind ledningerne på fyrets kontrolbord.",
    sted: "fyr",
    hjælp: "Tegningen siger: havets blå til Bølge, skovens grønne til Blad og ildens røde til Sol.",
  },
  {
    id: "spor",
    navn: "Det skjulte spor",
    mål: "Lad natten falde. Ret fyrets prøvelys mod vest.",
    sted: "fyr",
    hjælp:
      "Brug Sol/måne-knappen til at vælge Nat. Ved fyrets bord vælges Vest. Lysstrålen når ruinen og vækker kystens blå sten.",
  },
  {
    id: "prisme",
    navn: "Havgrottens spejle",
    mål: "Følg de blå sten til havgrotten. Find prismen.",
    sted: "grotte",
    hjælp:
      "I grotten: Sol peger mod Øst, Bølge mod Vest, Stjerne mod Syd. Drej hvert spejl med knapperne. Prismen vågner kun om natten.",
  },
  {
    id: "lys",
    navn: "Det sidste lys",
    mål: "Bær prismen tilbage til fyret og tænd lyset.",
    sted: "fyr",
    hjælp: "Vend tilbage til fyrets kontrolbord. Vælg Sæt prismen i. Hele øens lys samles i lanternen.",
  },
];

export const GEMMENØGLE = "det-sidste-lys-v1";
export const MÆRKER = ["Ugle", "Måne", "Bølge", "Blad", "Sol", "Stjerne"];
export const SVAR = Object.freeze({
  tide: ["Faldende", "III", "Vest"],
  ringe: ["Ugle", "Måne", "Bølge"],
  ledninger: ["Bølge", "Blad", "Sol"],
  spejle: [1, 3, 2],
});

// Nye komfortvalg er valgfrie i version 1, så tidligere gemninger stadig virker.
export function nyeIndstillinger() {
  return { følsomhed: 1, rolig: false, tekst: 1, kvalitet: "auto", styring: "pind" };
}

export function validerIndstillinger(data) {
  const valg = nyeIndstillinger();
  if (!data || typeof data !== "object") return valg;
  if (Number.isFinite(data.følsomhed) && data.følsomhed >= .4 && data.følsomhed <= 2) valg.følsomhed = data.følsomhed;
  valg.rolig = data.rolig === true;
  if ([1, 1.2, 1.4].includes(data.tekst)) valg.tekst = data.tekst;
  if (["auto", "let", "flot"].includes(data.kvalitet)) valg.kvalitet = data.kvalitet;
  if (["pind", "pile"].includes(data.styring)) valg.styring = data.styring;
  return valg;
}

const GÅDEVALG = {
  tide: [["Stigende", "Faldende", "Stille"], ["I", "II", "III"], ["Nord", "Øst", "Syd", "Vest"]],
  ringe: [MÆRKER, MÆRKER, MÆRKER],
  ledninger: [["Sol", "Bølge", "Blad"], ["Sol", "Bølge", "Blad"], ["Blad", "Bølge", "Sol"]],
  spejle: [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3]],
};

export const STEDNOTER = [
  { id: "ring", navn: "En ring til alle", x: -21.5, z: 69, tekst: "På bagsiden af den slidte redningsring står Elins håndskrift: ‘Her hører alle til. Også dem, der kommer sent hjem.’ Der er nye reb i den gamle ring. Nogen har passet på øen, selv mens fyret var mørkt." },
  { id: "have", navn: "Elins lille have", x: -12, z: 31, tekst: "Havebogen lugter af salvie. Elin har noteret: ‘Strandsenneppen blomstrer, selv efter en vinter med saltvind. Sæt en gul potte ved hver dør, så ingen skal vente i et gråt hus.’ Du ser blomsterne for første gang." },
  { id: "varde", navn: "En sti af fælles sten", x: -42, z: -18, tekst: "Under vardens kobbermærke ligger en gammel tegning: hver familie lagde en sten, da skovstien blev anlagt. Den mindste sten har dine og Elins initialer. Øen har båret jer begge hele vejen." },
  { id: "logbog", navn: "Fyrets logbog", tekst: "Fra galleriet genkender du alle stierne. I logbogen står én sætning gentaget år efter år: ‘Ingen båd for lille, ingen nat for lang.’ På sidste side har Elin tegnet to kopper og skrevet: ‘Når du kommer hjem.’" },
];

export function findStednote(tilstand, id) {
  if (!STEDNOTER.some(n => n.id === id) || tilstand.fund.includes(id)) return tilstand;
  return { ...tilstand, fund: [...tilstand.fund, id] };
}

export function nytEventyr(forrige) {
  const næste = nyTilstand();
  næste.indstillinger = validerIndstillinger(forrige?.indstillinger);
  næste.lyd = forrige?.lyd !== false;
  næste.vejledning = forrige?.vejledning === true;
  return næste;
}

// Browserens bfcache må beholde den levende galleriposition, mens save ligger sikkert ved foden.
export function sikkerGemmetilstand(tilstand, galleriet) {
  return galleriet ? { ...tilstand, position: { x: 32, z: -35 } } : tilstand;
}

export function validerGåde(type, svar) {
  return Array.isArray(svar) && svar.length === 3 && GÅDEVALG[type]?.every((valg, i) => valg.includes(svar[i]));
}

// Et besøg i dagbogen eller en pause mister ikke den indstilling, spilleren arbejdede på.
export function gemGåde(tilstand, type, svar) {
  if (!validerGåde(type, svar)) return tilstand;
  return { ...tilstand, gåder: { ...tilstand.gåder, [type]: [...svar] } };
}

// Ny fremgang er fuldt spilbar, også når browseren ikke kan gemme.
export function nyTilstand() {
  return {
    version: 1,
    færdige: [],
    rav: [],
    nat: false,
    retning: 0,
    position: { x: -25, z: 80 },
    kurs: -0.18,
    besøgte: ["havn"],
    lyd: true,
    spilletid: 0,
    indstillinger: nyeIndstillinger(),
    gåder: {},
    vink: {},
    vejledning: false,
    fund: [],
  };
}

export function aktivOpgave(tilstand) {
  return OPGAVER.find((opgave) => !tilstand.færdige.includes(opgave.id)) || null;
}

// Låste kapitler kan ikke fuldføres ved at springe tidligere opgaver over.
export function fuldfør(tilstand, id) {
  if (aktivOpgave(tilstand)?.id !== id) return tilstand;
  if (id === "harpiks" && tilstand.rav.length !== 3) return tilstand;
  if (id === "spor" && (!tilstand.nat || tilstand.retning !== 3)) return tilstand;
  if (id === "prisme" && !tilstand.nat) return tilstand;
  return { ...tilstand, færdige: [...tilstand.færdige, id] };
}

// Rav er én fysisk genstand pr. træ, så den samme genstand aldrig tælles to gange.
export function samlRav(tilstand, træ) {
  if (aktivOpgave(tilstand)?.id !== "harpiks" || !Number.isInteger(træ) || træ < 0 || træ > 2 || tilstand.rav.includes(træ)) {
    return tilstand;
  }
  const næste = { ...tilstand, rav: [...tilstand.rav, træ].sort() };
  return næste.rav.length === 3 ? fuldfør(næste, "harpiks") : næste;
}

export function rigtigtSvar(type, svar) {
  return Array.isArray(svar) && SVAR[type]?.length === svar.length && SVAR[type].every((del, i) => del === svar[i]);
}

// Gemninger valideres og kopieres; fremmed tekst og umulige koordinater afvises.
export function validerGemning(data) {
  if (!data || typeof data !== "object" || data.version !== 1 || !Array.isArray(data.færdige) || !Array.isArray(data.rav)) {
    return null;
  }
  if (data.færdige.length > OPGAVER.length || !data.færdige.every((id, i) => id === OPGAVER[i].id)) return null;
  if (data.rav.length > 3 || data.rav.some((id, i) => !Number.isInteger(id) || id < 0 || id > 2 || data.rav.indexOf(id) !== i)) {
    return null;
  }
  if (data.færdige.includes("harpiks") && data.rav.length !== 3) return null;
  if (data.rav.length && !data.færdige.includes("nøgle")) return null;
  const næste = nyTilstand();
  næste.færdige = [...data.færdige];
  næste.rav = [...data.rav].sort();
  næste.nat = data.nat === true;
  næste.retning = Number.isInteger(data.retning) && data.retning >= 0 && data.retning <= 3 ? data.retning : 0;
  næste.lyd = data.lyd !== false;
  næste.indstillinger = validerIndstillinger(data.indstillinger);
  næste.vejledning = data.vejledning === true;
  if (Array.isArray(data.fund)) næste.fund = [...new Set(data.fund.filter(id => STEDNOTER.some(n => n.id === id)))];
  for (const type of Object.keys(GÅDEVALG)) {
    if (validerGåde(type, data.gåder?.[type])) næste.gåder[type] = [...data.gåder[type]];
  }
  for (const opgave of OPGAVER) {
    const trin = data.vink?.[opgave.id];
    if (Number.isInteger(trin) && trin >= 0 && trin <= 2) næste.vink[opgave.id] = trin;
  }
  næste.spilletid = Number.isFinite(data.spilletid) ? Math.max(0, Math.min(data.spilletid, 360000)) : 0;
  if (
    Number.isFinite(data.position?.x) && Number.isFinite(data.position?.z) && Math.abs(data.position.x) <= 86 &&
    Math.abs(data.position.z) <= 106
  ) næste.position = { x: data.position.x, z: data.position.z };
  if (Number.isFinite(data.kurs)) næste.kurs = data.kurs % (Math.PI * 2);
  const kendte = ["havn", "værksted", "skov", "ruin", "fyr", "grotte"];
  if (Array.isArray(data.besøgte)) {
    næste.besøgte = [...new Set(["havn", ...data.besøgte.filter((sted) => kendte.includes(sted))])];
  }
  return næste;
}

export function læsGemning(lager) {
  try {
    return validerGemning(JSON.parse(lager.getItem(GEMMENØGLE) || "null"));
  } catch {
    return null;
  }
}

export function gem(tilstand, lager) {
  try {
    lager.setItem(GEMMENØGLE, JSON.stringify(tilstand));
    return true;
  } catch {
    return false;
  }
}

// Samme kysthøjde som i den originale Blender-ø.
export function terrænHøjde(x, z) {
  const r = Math.hypot(x / 82, z / 102);
  const kant = Math.min(1, Math.max(0, (1.03 - r) / .16));
  const bakker = 11 * Math.exp(-((x - 38) ** 2 + (z + 44) ** 2) / 550) + 4 * Math.exp(-((x + 12) ** 2 + (z + 62) ** 2) / 600) +
    2.2 * Math.exp(-((x + 45) ** 2 + (z + 28) ** 2) / 700);
  const havnebassin = 6 * Math.exp(-((x + 29) ** 2 / 160 + (z - 87) ** 2 / 190));
  return -2.6 + kant * (5.4 + bakker + .65 * Math.sin(x * .12) * Math.cos(z * .09) + .25 * Math.sin(z * .3 + x * .2)) -
    havnebassin;
}
