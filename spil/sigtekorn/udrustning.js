// ===== Udrustningen i menuen: vælg hovedvåben, pistol, kniv, to slags granater og banen =====
// Alt kommer fra katalog.js — kommer der noget nyt i kataloget, dukker det op her af sig selv.
// Hvert valg er et kort i sjældenhedens farve (som i Fortnite) med streger for skade, kadence osv.

import { PRIMÆR, SEKUNDÆR, KNIVE, GRANATER, BANER, SJÆLDEN, STANDARD } from "./katalog.js";

const PLADSER = [
  { nøgle: "primær", navn: "Hovedvåben", liste: PRIMÆR, tast: "1" },
  { nøgle: "sekundær", navn: "Pistol", liste: SEKUNDÆR, tast: "2" },
  { nøgle: "kniv", navn: "Nærkamp", liste: KNIVE, tast: "3" },
  { nøgle: "granat0", navn: "Granat", liste: GRANATER, tast: "4" },
  { nøgle: "granat1", navn: "Granat", liste: GRANATER, tast: "4" },
  { nøgle: "bane", navn: "Bane", liste: BANER, tast: "" },
];
const KLASSE = { gevær: "Gevær", mp: "Maskinpistol", hagl: "Haglgevær", snig: "Snigskytte", tung: "Tungt våben", special: "Specialvåben", pistol: "Pistol", kniv: "Nærkamp" };

// Sørg for, at udrustningen kun indeholder ting, der findes (fx hvis noget er blevet fjernet fra kataloget)
export function retUdrustning(u) {
  const ok = { ...STANDARD, ...(u || {}) };
  if (!PRIMÆR[ok.primær]) ok.primær = STANDARD.primær;
  if (!SEKUNDÆR[ok.sekundær]) ok.sekundær = STANDARD.sekundær;
  if (!KNIVE[ok.kniv]) ok.kniv = STANDARD.kniv;
  if (!BANER[ok.bane]) ok.bane = STANDARD.bane;
  ok.granater = (Array.isArray(ok.granater) ? ok.granater : STANDARD.granater).filter(g => GRANATER[g]).slice(0, 2);
  while (ok.granater.length < 2) ok.granater.push(Object.keys(GRANATER).find(g => !ok.granater.includes(g)));
  return ok;
}

// Stregerne på kortet (0..1)
function værdier(d) {
  if (d.nærkamp) return [["Skade", d.stik / 100], ["Hastighed", 0.3 / d.kadence], ["Rækkevidde", d.rækkevidde / 2.1], ["Fart", d.fart / 255]];
  if (!d.kadence) return [];
  const skade = d.skade * (d.hagl || 1);
  const ps = d.salve ? d.salve / (d.kadence + (d.salve - 1) * d.salveTid) : 1 / d.kadence;     // skud i sekundet (salver regnes med)
  return [["Skade", Math.min(1, skade / (d.projektil === "raket" ? 150 : 130))], ["Kadence", Math.min(1, ps / 16)],
    ["Præcision", Math.max(0.05, 1 - d.stå / 0.013)], ["Rækkevidde", Math.max(0.05, ((d.rækkevidde ?? 0.99) - 0.5) / 0.5)],
    ["Fart", Math.min(1, (d.fart / 250) ** 2)], ["Magasin", Math.min(1, Math.log(1 + d.magasin) / Math.log(201))]];
}
function kort(id, d, valgt, lille = false) {
  const s = SJÆLDEN[d.sjælden] || SJÆLDEN.almindelig;
  const streger = lille ? "" : `<div class="streger">${værdier(d).map(([n, v]) => `<span>${n}</span><i><b style="width:${Math.round(Math.min(1, v) * 100)}%"></b></i>`).join("")}</div>`;
  const info = d.klasse ? KLASSE[d.klasse] || "" : d.antal ? `${d.antal} stk.` : "";
  return `<button class="kort${valgt ? " valgt" : ""}${lille ? " lille" : ""}" data-id="${id}" style="--s:${s.farve}">
    <span class="sjælden">${s.navn}${info ? " · " + info : ""}</span><b class="navn">${d.ikon && lille ? d.ikon + " " : ""}${d.navn}</b>
    ${lille ? "" : `<span class="tekst">${d.tekst || ""}</span>`}${streger}</button>`;
}

// Tegn udrustningen i "rod" (i menuen). vælger = elementet til listen med valgmuligheder. gem() kaldes ved hver ændring
export function lavUdrustning(rod, vælger, ind, gem, bip) {
  const hent = p => p.nøgle.startsWith("granat") ? ind.udrustning.granater[+p.nøgle.slice(-1)] : ind.udrustning[p.nøgle];
  const tegn = () => {
    rod.innerHTML = PLADSER.map(p => `<div class="plads" data-plads="${p.nøgle}"><span class="pladsnavn">${p.tast ? `<kbd>${p.tast}</kbd> ` : ""}${p.navn}</span>${kort(hent(p), p.liste[hent(p)], false, true)}</div>`).join("");
    rod.querySelectorAll(".plads").forEach(el => el.addEventListener("click", () => åbn(PLADSER.find(p => p.nøgle === el.dataset.plads))));
  };
  const åbn = p => {
    const nu = hent(p), andenGranat = p.nøgle.startsWith("granat") ? ind.udrustning.granater[1 - +p.nøgle.slice(-1)] : null;
    vælger.innerHTML = `<div class="vælger-kort"><h2>Vælg ${p.navn.toLowerCase()}</h2><div class="vælger-gitter">${Object.entries(p.liste)
      .filter(([id]) => id !== andenGranat).map(([id, d]) => kort(id, d, id === nu)).join("")}</div><button class="stor anden luk">Tilbage</button></div>`;
    vælger.classList.remove("skjult");
    vælger.querySelectorAll(".kort").forEach(k => k.addEventListener("click", () => {
      const nyBane = p.nøgle === "bane" && ind.udrustning.bane !== k.dataset.id;
      if (p.nøgle.startsWith("granat")) ind.udrustning.granater[+p.nøgle.slice(-1)] = k.dataset.id; else ind.udrustning[p.nøgle] = k.dataset.id;
      gem(); bip?.(); vælger.classList.add("skjult"); tegn();
      if (nyBane) location.reload();                                  // en ny bane bygges, når siden starter
    }));
    vælger.querySelector(".luk").addEventListener("click", () => vælger.classList.add("skjult"));
  };
  tegn();
}
