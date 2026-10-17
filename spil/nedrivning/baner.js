// ===== Opgaverne: hvad kunden vil have revet ned, og hvordan det bedømmes =====
// Hver opgave bygger sine bygninger og ting, giver en værktøjskasse med sprængstof og har mål.
// ★ = opgaven er løst · ★★ = løst inden for budgettet · ★★★ = også det ekstra mål.

import * as THREE from "../3d-faelles/three.module.js";
import { betonblok, skorsten, vandtårn, lagerhal, murstenshus, træskur } from "./bygninger.js";

const række = (antal, x0, z0, dx, dz) => Array.from({ length: antal }, (_, i) => [x0 + dx * i, z0 + dz * i]);

export const BANER = [
  {
    id: "skur", navn: "Det gamle skur", kunde: "Haveforeningen Solsikken", tid: "dag",
    tekst: "Det gamle redskabsskur skal væk, så der kan bygges et nyt. Riv det ned, så intet står højere end 1 meter.",
    tip: "Tryk på dynamitten nederst og så på en hjørnestolpe. Tryk derefter på den røde tændingsboks.",
    værktøj: { dynamit: 3 }, budget: 600, honorar: 8000,
    kamera: { mål: [0, 1.2, 0], yaw: 0.65, pitch: 0.32, afstand: 13 },
    byg({ dele, ruder }) { træskur(dele, ruder, { x: 0, z: 0 }); },
    mål: [{ type: "højde", bygning: "Træskuret", maks: 1.0, tekst: "Intet står over 1 m" }],
    ekstra: { type: "ladninger", maks: 2, tekst: "Højst to ladninger" },
  },
  {
    id: "hus", navn: "Murstenshuset", kunde: "Kommunen", tid: "dag",
    tekst: "Det faldefærdige murstenshus skal rives ned. Naboens skur lige ved siden af må ikke blive ramt.",
    tip: "Mure falder, når det, de står på, bliver sprængt væk. Prøv at fjerne de nederste sten hele vejen rundt.",
    værktøj: { dynamit: 10, c4: 2 }, budget: 2400, honorar: 24000,
    kamera: { mål: [3, 3, 0], yaw: 0.5, pitch: 0.34, afstand: 26 },
    byg({ dele, ruder }) { murstenshus(dele, ruder, { x: 0, z: 0 }); træskur(dele, ruder, { x: 13, z: 5, yaw: 0.2, navn: "Naboens skur" }); },
    mål: [{ type: "højde", bygning: "Murstenshuset", maks: 2.2, tekst: "Intet står over 2,2 m" }],
    ekstra: { type: "skån", bygning: "Naboens skur", maks: 0.02, tekst: "Naboens skur er helt" },
  },
  {
    id: "skorsten", navn: "Skorstenen", kunde: "Det gamle teglværk", tid: "aften",
    tekst: "Den 30 meter høje skorsten skal fældes, så den lander i det grønne felt. Den gamle hal bag den skal blive stående.",
    tip: "Spræng et kileformet hul i den side, skorstenen skal falde mod — og lad den anden side stå som et hængsel.",
    værktøj: { dynamit: 12, c4: 4 }, budget: 3200, honorar: 40000,
    kamera: { mål: [6, 8, 0], yaw: 1.2, pitch: 0.22, afstand: 52 },
    zone: [3, -7, 38, 7],
    byg({ dele, ruder }) { skorsten(dele, ruder, { x: 0, z: 0, højde: 30 }); lagerhal(dele, ruder, { x: -22, z: 0, yaw: Math.PI / 2, fagX: 3, navn: "Den gamle hal" }); },
    mål: [{ type: "zone", bygning: "Skorstenen", andel: 0.55, tekst: "Skorstenen lander i feltet" }],
    ekstra: { type: "skån", bygning: "Den gamle hal", maks: 0.02, tekst: "Hallen er helt" },
  },
  {
    id: "vandtaarn", navn: "Vandtårnet", kunde: "Vandværket", tid: "dag",
    tekst: "Vandtårnet er for gammelt. Fæld det ned i det grønne felt — villaen ved siden af må ikke få en skramme.",
    tip: "Et tårn på fire ben vælter mod det ben, der forsvinder først.",
    værktøj: { c4: 6, dynamit: 6 }, budget: 2400, honorar: 36000,
    kamera: { mål: [4, 9, 0], yaw: 1.0, pitch: 0.2, afstand: 50 },
    zone: [4, -9, 34, 9],
    byg({ dele, ruder }) { vandtårn(dele, ruder, { x: 0, z: 0 }); murstenshus(dele, ruder, { x: -18, z: 2, yaw: Math.PI / 2, navn: "Villaen" }); },
    mål: [{ type: "zone", bygning: "Vandtårnet", andel: 0.5, tekst: "Tårnet lander i feltet" }],
    ekstra: { type: "skån", bygning: "Villaen", maks: 0.02, tekst: "Villaen er helt" },
  },
  {
    id: "hal", navn: "Lagerhallen", kunde: "Fragtfirmaet Nord", tid: "dag",
    tekst: "Lagerhallen skal ned — og den er fuld af gamle benzintønder og gasflasker. Skær stålsøjlerne over og få tønderne med i kæden.",
    tip: "Stål knuses ikke af dynamit: brug skæreladninger på søjlerne. Tønderne springer, når ild eller tryk når dem.",
    værktøj: { skær: 8, dynamit: 4, tønde: 4 }, budget: 6000, honorar: 48000,
    kamera: { mål: [0, 3, 0], yaw: 0.6, pitch: 0.36, afstand: 34 },
    byg({ dele, ruder, sprængstof }) {
      lagerhal(dele, ruder, { x: 0, z: 0 });
      for (const [x, z] of række(5, -7, -3, 1.4, 0)) sprængstof.stil("tønde", new THREE.Vector3(x, 0, z), { spiller: false });
      for (const [x, z] of række(4, 3, 2.5, 0.8, 0)) sprængstof.stil("gas", new THREE.Vector3(x, 0, z), { spiller: false });
      for (const [x, z] of række(3, 6, -3.5, 1.4, 0)) sprængstof.stil("tønde", new THREE.Vector3(x, 0, z), { spiller: false });
    },
    mål: [{ type: "højde", bygning: "Lagerhallen", maks: 2.0, tekst: "Intet står over 2 m" }],
    ekstra: { type: "kæde", min: 10, tekst: "Mindst 10 i kæden" },
  },
  {
    id: "blok", navn: "Betonblokken", kunde: "Boligselskabet Lyngen", tid: "aften",
    tekst: "Den gamle betonblok skal styrte sammen om sig selv. Det lille murstenshus bag den må ikke blive ramt.",
    tip: "Dækkene hviler på søjler og facader. Fjern det, der bærer stueetagen, så falder resten ned i sit eget fodaftryk.",
    værktøj: { c4: 20, dynamit: 20 }, budget: 9000, honorar: 90000,
    kamera: { mål: [0, 5, 0], yaw: 0.55, pitch: 0.24, afstand: 44 },
    byg({ dele, ruder }) { betonblok(dele, ruder, { x: 0, z: 0 }); murstenshus(dele, ruder, { x: 2, z: 19, W: 7, D: 6, etager: 1, navn: "Det lille hus" }); },
    mål: [{ type: "højde", bygning: "Betonblokken", maks: 5, tekst: "Intet står over 5 m" }],
    ekstra: { type: "skån", bygning: "Det lille hus", maks: 0.02, tekst: "Det lille hus er helt" },
  },
  {
    id: "gas", navn: "Gaslageret", kunde: "Havnens gaslager", tid: "nat",
    tekst: "Det nedlagte gaslager skal ryddes. Få begge gastanke og kontoret med — én stor kædereaktion om natten.",
    tip: "Gastanke springer, når en stor ild eller sprængning når dem. Stil tønder og gasflasker som en lunte hen mod dem.",
    værktøj: { tnt: 1, dynamit: 3, tønde: 6, gas: 4 }, budget: 3500, honorar: 60000,
    kamera: { mål: [0, 2, 0], yaw: 0.75, pitch: 0.4, afstand: 46 },
    byg({ dele, ruder, sprængstof }) {
      sprængstof.stil("gastank", new THREE.Vector3(-9, 0, 8), { spiller: false, yaw: 0 });
      sprængstof.stil("gastank", new THREE.Vector3(9, 0, 8), { spiller: false, yaw: 0 });
      murstenshus(dele, ruder, { x: 0, z: -14, W: 7, D: 6, etager: 1, navn: "Kontoret" });
      for (const [x, z] of række(4, -3, -4, 2, 0)) sprængstof.stil("tønde", new THREE.Vector3(x, 0, z), { spiller: false });
      for (const [x, z] of række(3, 14, -2, 0, 1.2)) sprængstof.stil("gas", new THREE.Vector3(x, 0, z), { spiller: false });
    },
    mål: [{ type: "alle", ting: "gastank", tekst: "Begge gastanke er sprængt" }, { type: "højde", bygning: "Kontoret", maks: 1.6, tekst: "Kontoret er revet ned" }],
    ekstra: { type: "kæde", min: 12, tekst: "Mindst 12 i kæden" },
  },
  {
    id: "hoejhus", navn: "Højhuset", kunde: "Byens største nedrivning", tid: "dag",
    tekst: "Højhuset på ni etager skal styrte lodret ned. Naboblokkene på begge sider skal stå tilbage uden en skramme.",
    tip: "Brug forsinkelserne: lad midten gå først og siderne et halvt sekund efter, så huset folder sig ind mod midten.",
    værktøj: { c4: 40, dynamit: 30 }, budget: 16000, honorar: 160000,
    kamera: { mål: [0, 10, 0], yaw: 0.25, pitch: 0.18, afstand: 70 },
    byg({ dele, ruder }) {
      betonblok(dele, ruder, { x: 0, z: 0, etager: 9, fagX: 3, fagZ: 3, navn: "Højhuset", tone: 0xd8d2c6 });
      betonblok(dele, ruder, { x: -23, z: 0, etager: 3, fagX: 2, fagZ: 3, navn: "Nabo vest", tone: 0xc8b8a4 });
      betonblok(dele, ruder, { x: 23, z: 0, etager: 3, fagX: 2, fagZ: 3, navn: "Nabo øst", tone: 0xb8c0c4 });
    },
    mål: [{ type: "højde", bygning: "Højhuset", maks: 6, tekst: "Intet står over 6 m" }],
    ekstra: { type: "skån", bygning: ["Nabo vest", "Nabo øst"], maks: 0.02, tekst: "Naboerne er hele" },
  },
];

// Det frie område: alle slags bygninger og ubegrænset sprængstof
export const FRIT = {
  id: "frit", navn: "Frit område", kunde: "Bare for sjov", tid: "dag", frit: true,
  tekst: "Her er alt tilladt. Spræng, hvad du vil — og tryk på ↺ for at bygge det hele op igen.",
  værktøj: { dynamit: Infinity, c4: Infinity, skær: Infinity, tnt: Infinity, tønde: Infinity, gas: Infinity }, budget: Infinity, honorar: 0,
  kamera: { mål: [0, 4, 0], yaw: 0.6, pitch: 0.42, afstand: 72 },
  byg({ dele, ruder, sprængstof }) {
    betonblok(dele, ruder, { x: -24, z: -18, etager: 3, fagX: 3, fagZ: 2 });
    skorsten(dele, ruder, { x: 26, z: -22, højde: 24 });
    vandtårn(dele, ruder, { x: -28, z: 22 });
    lagerhal(dele, ruder, { x: 20, z: 18, fagX: 3 });
    træskur(dele, ruder, { x: 0, z: 30 });
    murstenshus(dele, ruder, { x: 0, z: -4, W: 8, D: 6, etager: 2 });
    for (const [x, z] of række(4, 15, 16, 1.5, 0)) sprængstof.stil("tønde", new THREE.Vector3(x, 0, z), { spiller: false });
    sprængstof.stil("gastank", new THREE.Vector3(0, 0, 16), { spiller: false, yaw: 0 });
  },
  mål: [],
};

// ---------- Målingerne ----------
const box = new THREE.Box3();
function bygningerMedNavn(dele, navn) {
  const navne = Array.isArray(navn) ? navn : [navn];
  return dele.bygninger.filter(b => navne.includes(b.navn));
}
// Det højeste punkt af alt, der hører til bygningen (også brokkerne)
export function højde(dele, b) {
  let h = 0;
  for (const d of b.dele) if (!d.væk) h = Math.max(h, dele.aabb(d, box).max.y);
  return h;
}
// Hvor stor en del af bygningen (målt i rumfang) ligger inden for feltet?
export function iZone(dele, b, [x0, z0, x1, z1]) {
  let ialt = 0, inde = 0;
  const p = new THREE.Vector3();
  for (const d of b.dele) {
    if (d.væk) continue;
    dele.sted(d, p);
    ialt += d.vol;
    if (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) inde += d.vol;
  }
  return ialt > 0 ? inde / ialt : 0;
}
// Hvor stor en del af de oprindelige dele er flyttet eller ødelagt?
export function skade(dele, b) {
  let n = 0, ødelagt = 0;
  const p = new THREE.Vector3();
  for (const d of b.dele) {
    if (!d.original) continue;
    n++;
    if (d.væk || (!d.fast && dele.sted(d, p).p.distanceTo(d.oprPos) > 0.25)) ødelagt++;
  }
  return n ? ødelagt / n : 0;
}

// Tjek ét mål. Svarer { ok, tal } (tal: det målte, til resultatet)
export function tjek(mål, { dele, sprængstof }) {
  if (mål.type === "højde") {
    const b = bygningerMedNavn(dele, mål.bygning);
    const h = Math.max(0, ...b.map(x => højde(dele, x)));
    return { ok: h <= mål.maks, tal: `${h.toFixed(1).replace(".", ",")} m` };
  }
  if (mål.type === "zone") {
    const [b] = bygningerMedNavn(dele, mål.bygning);
    const a = b ? iZone(dele, b, mål.rekt) : 0;
    return { ok: a >= mål.andel, tal: `${Math.round(a * 100)} % i feltet` };
  }
  if (mål.type === "skån") {
    const s = Math.max(0, ...bygningerMedNavn(dele, mål.bygning).map(b => skade(dele, b)));
    return { ok: s <= mål.maks, tal: s <= mål.maks ? "uskadt" : `${Math.round(s * 100)} % ødelagt` };
  }
  if (mål.type === "kæde") return { ok: sprængstof.kæde >= mål.min, tal: `${sprængstof.kæde} i kæden` };
  if (mål.type === "alle") {
    const alle = sprængstof.alle.filter(l => l.type === mål.ting);
    const tilbage = alle.filter(l => !l.væk).length;
    return { ok: tilbage === 0, tal: tilbage ? `${tilbage} tilbage` : "alle sprængt" };
  }
  if (mål.type === "ladninger") {
    const n = sprængstof.alle.filter(l => l.spiller).length;
    return { ok: n <= mål.maks, tal: `${n} brugt` };
  }
  return { ok: false, tal: "" };
}
