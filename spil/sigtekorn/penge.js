// ===== Penge og købsmenuen i Bombe (som i Counter-Strike) =====
// Alle starter med $800. Man tjener penge ved at dræbe (mere med kniv og haglgevær, mindre med snigskytte)
// og ved at vinde runder — taber man, får man lidt, og mere for hver runde i træk, man taber.
// I starten af hver runde kan man købe (tast B): pistoler, hovedvåben, en skudsikker vest og granater.
// Overlever man runden, beholder man det, man har. Dør man, starter man forfra med en pistol.

import { ALLE as VÅBEN, GRANATER } from "./katalog.js";

export const START = 800, MAKS = 16000, KØBETID = 20;              // penge fra start, højst, og sekunder man kan købe i
// Priserne (dyrere jo bedre, cirka som i CS)
export const PRISER = {
  pistol: 0, lydløs: 300, automat: 500, revolver: 700,
  mp: 1200, sprøjte: 1250, pump: 1100, hagl: 2000, salve: 2050, spejder: 1700, armbrøst: 2200,
  storm: 2700, jagt: 2900, kamp: 3000, taktisk: 3100, snig: 4750, lmg: 5200, raket: 5500, minigun: 6000,
  vest: 650, he: 300, blænd: 200, røg: 300, impuls: 400,
};
// Menuen: grupper med tal-taster (B åbner, så et tal for gruppen og et tal for tingen)
export const GRUPPER = [
  { navn: "Pistoler", ting: ["pistol", "lydløs", "automat", "revolver"] },
  { navn: "Maskinpistoler og haglgeværer", ting: ["mp", "sprøjte", "pump", "hagl"] },
  { navn: "Geværer", ting: ["salve", "storm", "taktisk", "kamp", "spejder", "jagt", "armbrøst", "snig"] },
  { navn: "Tunge våben", ting: ["lmg", "raket", "minigun"] },
  { navn: "Udstyr og granater", ting: ["vest", "he", "blænd", "røg", "impuls"] },
];
// Penge for et drab med et våben
export const drabPenge = d => !d ? 300 : d.nærkamp ? 1500 : d.klasse === "mp" ? 600 : d.klasse === "hagl" ? 900 : d.klasse === "snig" ? 100 : 300;
// Penge efter en runde: vinderne og taberne (mere for hver runde i træk, holdet har tabt)
export const RUNDE = { sejr: 3250, bombe: 3500, tab: tabt => Math.min(3400, 1400 + 500 * Math.max(0, tabt - 1)), lagtTab: 800, lagt: 300 };

// Det, man starter med (og har, når man har været død): standardpistolen, ingen vest og ingen granater
export const nytUdstyr = () => ({ primær: null, sekundær: "pistol", granater: [], panser: 0 });
// Navn og hvad det er (til menuen)
export function vare(id) {
  if (id === "vest") return { navn: "Skudsikker vest", type: "vest" };
  if (GRANATER[id]) return { navn: GRANATER[id].navn, type: "granat", ikon: GRANATER[id].ikon };
  const d = VÅBEN[id]; return { navn: d?.navn || id, type: d?.klasse === "pistol" ? "sekundær" : "primær", sjælden: d?.sjælden };
}
// Kan man købe det? (råd til det, og man har det ikke allerede)
export function kanKøbe(f, id) {
  const u = f.udstyr, v = vare(id);
  if ((f.penge || 0) < PRISER[id]) return false;
  if (v.type === "vest") return u.panser < 100;
  if (v.type === "granat") return !u.granater.includes(id) && u.granater.length < 3;
  return v.type === "primær" ? u.primær !== id : u.sekundær !== id;
}
// Køb noget: pengene trækkes, og det kommer i udstyret
export function køb(f, id) {
  if (!kanKøbe(f, id)) return false;
  f.penge -= PRISER[id];
  const u = f.udstyr, v = vare(id);
  if (v.type === "vest") u.panser = 100;
  else if (v.type === "granat") u.granater.push(id);
  else u[v.type] = id;
  return true;
}
export const giv = (f, beløb) => { f.penge = Math.min(MAKS, Math.max(0, (f.penge || 0) + beløb)); };

// En bot køber: et gevær og en vest, hvis der er råd — ellers noget billigere, en vest eller ingenting (spare-runde).
// Er der penge tilbage, køber den en granat eller to
export function botKøb(bot) {
  const u = bot.udstyr, r = Math.random;
  if (!u.primær) {
    const valg = bot.penge >= 5400 && r() < 0.15 ? ["snig"] : bot.penge >= 3700 ? ["storm", "taktisk", "kamp", "jagt"]
      : bot.penge >= 2000 ? ["mp", "sprøjte", "pump", "salve", "spejder"] : [];
    if (valg.length) køb(bot, valg[Math.floor(r() * valg.length)]);
    else if (bot.penge >= 1200 && r() < 0.5) køb(bot, ["lydløs", "automat", "revolver"][Math.floor(r() * 3)]);
  }
  køb(bot, "vest");
  for (const g of ["he", "blænd", "røg"]) if (bot.penge > 1500 && r() < 0.5) køb(bot, g);
}

// Købsmenuen på skærmen: grupperne (eller tingene i en gruppe) med tal, pris og om man har råd
export function tegnKøbsmenu(el, f, gruppe) {
  const linje = (tast, tekst, pris, kan) => `<div class="køb${kan ? "" : " kanIkke"}" data-tast="${tast}"><kbd>${tast}</kbd> ${tekst}${pris !== null ? `<span>$${pris}</span>` : ""}</div>`;
  const indhold = gruppe === null
    ? GRUPPER.map((g, i) => linje(i + 1, g.navn, null, true)).join("")
    : GRUPPER[gruppe].ting.map((id, i) => { const v = vare(id); return linje(i + 1, `${v.ikon ? v.ikon + " " : ""}${v.navn}`, PRISER[id], kanKøbe(f, id)); }).join("") + linje(0, "Tilbage", null, true);
  el.innerHTML = `<h3>🛒 Køb <small>$${f.penge}</small></h3>${gruppe !== null ? `<h4>${GRUPPER[gruppe].navn}</h4>` : ""}${indhold}<p>Tast et tal · B lukker</p>`;
}
