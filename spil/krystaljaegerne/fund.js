import { givEliksirer } from "./eventyr.js";

const SEGL = Object.freeze([
  "Mossets segl",
  "Spejlenes segl",
  "Kobberdybets segl",
]);
const VOGTER = Object.freeze([
  "Mosvogteren",
  "Krystalhjorten",
  "Den gamle vogter",
]);
const gyldigtTal = (n) => Number.isFinite(n) && n >= 0;
const genstand = (type, navn, antal) => ({ type, navn, antal });

// Fundet gemmes før det vises. En gammel nær-reference eller genindlæsning giver aldrig samme skat igen.
export function indsamlFund(s, t) {
  if (
    !s || !Array.isArray(s.hentet) || !t ||
    !["krystal", "kiste"].includes(t.type) ||
    typeof t.id !== "string" || !t.id.trim() || t.id.length > 90 ||
    s.hentet.includes(t.id) ||
    !gyldigtTal(s.mønter)
  ) return null;
  if (t.type === "krystal" && (!gyldigtTal(s.mana) || s.mana > 100)) {
    return null;
  }
  if (
    t.type === "kiste" &&
    (!gyldigtTal(s.xp) || !Number.isInteger(s.eliksirer) ||
      s.eliksirer < 0 || s.eliksirer > 99)
  ) return null;

  s.hentet.push(t.id);
  if (t.type === "krystal") {
    const før = s.mana;
    s.mønter += 3;
    s.mana = Math.min(100, før + 16);
    return {
      type: "krystal",
      titel: "Lyskrystal fundet",
      genstande: [
        genstand("krystal", "Lyskrystal", 1),
        genstand("kobber", "Kobber", 3),
        ...(s.mana > før ? [genstand("energi", "Energi", s.mana - før)] : []),
      ],
      note: "Krystallens lys bruges ved indsamlingen.",
    };
  }

  s.mønter += 18;
  s.xp += 15;
  const eliksirer = givEliksirer(s, 1);
  return {
    type: "kiste",
    titel: "Skattekisten er åben",
    genstande: [
      genstand("kobber", "Kobber", 18),
      genstand("erfaring", "Erfaring", 15),
      ...(eliksirer ? [genstand("eliksir", "Eliksir", eliksirer)] : []),
    ],
    ...(eliksirer ? {} : { note: "Eliksirtasken er fuld · 99 / 99." }),
  };
}

// Bossens belønning er allerede givet i spillet; her beskrives kun den faktiske gevinst.
export function seglFund(grotte, eliksirer = 0) {
  if (!Number.isInteger(grotte) || grotte < 0 || grotte >= SEGL.length) {
    return null;
  }
  const antal = Number.isInteger(eliksirer) && eliksirer >= 0 && eliksirer <= 2
    ? eliksirer
    : 0;
  return {
    type: "segl",
    titel: "Segl fundet",
    genstande: [
      genstand("segl", SEGL[grotte], 1),
      genstand("kobber", "Kobber", 30),
      genstand("erfaring", "Erfaring", 45),
      ...(antal ? [genstand("eliksir", "Eliksir", antal)] : []),
    ],
    note: `${VOGTER[grotte]} hviler nu. Seglet åbner vejen til Stjerneporten.`,
  };
}

// Opgavernes ekstra belønning samles i de samme rækker, uden at ændre fundet eller give belønningen igen.
export function medOpgavebelønning(fund, færdig) {
  if (!fund || !Array.isArray(fund.genstande)) return null;
  const kopi = { ...fund, genstande: fund.genstande.map((g) => ({ ...g })) };
  if (!færdig || typeof færdig.navn !== "string" || !færdig.navn.trim()) {
    return kopi;
  }
  const ekstra = [];
  for (
    const [felt, type, navn] of [["mønter", "kobber", "Kobber"], [
      "xp",
      "erfaring",
      "Erfaring",
    ]]
  ) {
    const antal = færdig[felt];
    if (!gyldigtTal(antal) || antal === 0) continue;
    const række = kopi.genstande.find((g) => g.type === type);
    if (række) række.antal += antal;
    else kopi.genstande.push(genstand(type, navn, antal));
    ekstra.push(navn.toLowerCase());
  }
  if (!ekstra.length) return kopi;
  const note = `Opgave klaret: ${færdig.navn}. Ekstra ${
    ekstra.join(" og ")
  } er medregnet.`;
  const heling = "Opgaven genopfyldte dit liv og din energi.";
  kopi.note = [
    kopi.note,
    note,
    ...(kopi.note?.includes(heling) ? [] : [heling]),
  ].filter(Boolean).join(" ");
  return kopi;
}
