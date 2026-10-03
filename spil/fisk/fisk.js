// ===== Fiskene i "Mærkelige fisk" =====
// Tilføj en ny fisk: kopiér en blok i FISKE, giv den et nyt id og skru på værdierne.
// Alle fisk bygges af de samme dele (krop, hale, finner, øjne, mund) + valgfrit tilbehør.
//
//  krop:      "normal" | "rund" | "lang" | "kasse" | "banan" | "støvle"
//             og de særlige: "blæksprutte" | "krabbe" | "stjerne" | "kiste"
//  form:      [længde, højde, bredde] — ganges på kroppens standardmål (valgfri)
//  farve/bug: ryg- og mavefarve · finne: farve på hale og finner
//  mønster:   "ingen" | "striber" | "prikker" | "regnbue" | "disko" | "skelet" | "guld" | "sennep"
//             | "klovn" | "robot" | "spøgelse" | "lava" | "is" | "frø" (små prikker som på et jordbær)
//  mønsterFarve: farve til striber/prikker
//  øjne:      0, 1, 2 eller 3 · øjeStr: øjnenes størrelse (0.085 er normalt)
//  mund:      "normal" | "læber" | "tænder" | "tunge"
//  tilbehør:  "krone", "høj hat", "piratHat", "briller", "solbriller", "øjeklap",
//             "overskæg", "horn", "lygte", "pigge", "sløjfe", "hajfinne", "hammer", "sværd",
//             "sprøjt", "antenne", "katteører", "knurhår", "rumhjelm", "kappe", "tiara", "blade", "rygpigge"
//  cm:        [mindst, størst] · chance: hvor tit den bider (0.02 = sjælden, 0.2 = tit)
//  styrke:    0–1, hvor hårdt den kæmper · spring: 0–1, hvor tit den hopper op af vandet
//  lyd:       "blub" | "disko" | "pust" | "fanfare" | "boing" | "arr" | "plop" | "magi" | "uhh" | "hmm"
//             | "haj" | "sværd" | "blæk" | "knips" | "hval" | "skat" | "bip" | "spøg" | "tss" | "klirr"
//             | "miav" | "raket" | "rawr"
//  sted:      "sø" = kun i søen · "hav" = kun på havet · udeladt = begge steder
//  tekst:     lille sjov linje på fangstkortet · tale: hvad stemmen siger (valgfri)

import * as THREE from "./three.js";

export const FISKE = [
  { id: "aborre", navn: "Aborre", krop: "normal", farve: "#6fae3a", bug: "#f1e7b8", finne: "#ff6b3d",
    mønster: "striber", mønsterFarve: "#2f4f1a", mund: "normal",
    cm: [15, 35], chance: 0.2, styrke: 0.3, spring: 0.25, lyd: "blub", sted: "sø", tekst: "En helt almindelig fisk. Næsten." },
  { id: "disko", navn: "Diskofisk", krop: "normal", form: [1, 1.1, 1.1], farve: "#c0c0ff", bug: "#ffffff", finne: "#ff4fd8",
    mønster: "disko", mund: "læber", tilbehør: ["solbriller"],
    cm: [20, 40], chance: 0.07, styrke: 0.45, spring: 0.7, lyd: "disko", tekst: "Den elsker at danse!" },
  { id: "konge", navn: "Kongekarpe", krop: "normal", form: [1.1, 1.25, 1.2], farve: "#ff9f1c", bug: "#ffe8a3", finne: "#ffcf33",
    mund: "læber", tilbehør: ["krone"],
    cm: [40, 80], chance: 0.05, styrke: 0.7, spring: 0.2, lyd: "fanfare", sted: "sø", tekst: "Kongen af hele søen!" },
  { id: "brille", navn: "Brillelaks", krop: "normal", form: [1.15, 0.95, 0.9], farve: "#9fb8c8", bug: "#ffd6e0", finne: "#ff8fab",
    mønster: "prikker", mønsterFarve: "#5b6b7a", tilbehør: ["briller"],
    cm: [30, 60], chance: 0.12, styrke: 0.5, spring: 0.5, lyd: "hmm", tekst: "Den læser avis under vandet." },
  { id: "gedde", navn: "Overskægsgedde", krop: "lang", farve: "#4c8a3f", bug: "#e8f0c0", finne: "#8fbf4f",
    mønster: "prikker", mønsterFarve: "#c8e07a", mund: "tænder", tilbehør: ["overskæg", "høj hat"],
    cm: [60, 110], chance: 0.08, styrke: 0.8, spring: 0.3, lyd: "hmm", sted: "sø", tekst: "Meget fornem. Meget lang." },
  { id: "trold", navn: "Trekøjet trold", krop: "normal", form: [0.95, 1.2, 1.2], farve: "#8e5bd8", bug: "#d9c2ff", finne: "#5fd3a6",
    mønster: "prikker", mønsterFarve: "#5e3aa0", øjne: 3, øjeStr: 0.095, mund: "tænder",
    cm: [20, 45], chance: 0.08, styrke: 0.55, spring: 0.5, lyd: "uhh", tekst: "Tre øjne — den ser ALT!" },
  { id: "puste", navn: "Pustefisk", krop: "rund", farve: "#ffd23f", bug: "#fff5c2", finne: "#ff9f1c",
    mønster: "prikker", mønsterFarve: "#c98a00", øjeStr: 0.11, mund: "læber", tilbehør: ["pigge"],
    cm: [15, 30], chance: 0.1, styrke: 0.35, spring: 0.3, lyd: "pust", tekst: "Pust! Pas på piggene!" },
  { id: "lygte", navn: "Lygtefisk", krop: "normal", form: [0.9, 1.3, 1.1], farve: "#27325c", bug: "#4a5a8c", finne: "#3fa7ff",
    øjeStr: 0.07, mund: "tænder", tilbehør: ["lygte"],
    cm: [20, 50], chance: 0.07, styrke: 0.6, spring: 0.2, lyd: "boing", tekst: "Den har sin egen natlampe." },
  { id: "enhjorning", navn: "Enhjørningefisk", krop: "normal", farve: "#ffc8e8", bug: "#ffffff", finne: "#b98cff",
    mønster: "regnbue", mund: "læber", tilbehør: ["horn"],
    cm: [25, 50], chance: 0.035, styrke: 0.5, spring: 0.8, lyd: "magi", tekst: "Magisk og glitrende!" },
  { id: "banan", navn: "Bananfisk", krop: "banan", farve: "#ffe135", bug: "#fff6a8", finne: "#8a6d1f",
    cm: [18, 25], chance: 0.1, styrke: 0.3, spring: 0.6, lyd: "boing", tekst: "Kan man spise den? Nej!" },
  { id: "kasse", navn: "Kassefisk", krop: "kasse", farve: "#3a86ff", bug: "#a0c4ff", finne: "#ff006e",
    mønster: "striber", mønsterFarve: "#ffbe0b", mund: "læber", tilbehør: ["sløjfe"],
    cm: [20, 40], chance: 0.1, styrke: 0.4, spring: 0.3, lyd: "blub", tekst: "Firkantet fra fødslen." },
  { id: "pirat", navn: "Piratfisk", krop: "normal", form: [1.1, 1, 1], farve: "#6c757d", bug: "#d6d6d6", finne: "#b5172e",
    mønster: "striber", mønsterFarve: "#3d4349", mund: "tænder", tilbehør: ["piratHat", "øjeklap"],
    cm: [30, 70], chance: 0.07, styrke: 0.75, spring: 0.4, lyd: "arr", tekst: "Arrr! Hvor er skatten?" },
  { id: "skelet", navn: "Skeletfisk", krop: "normal", farve: "#2b2b3a", bug: "#3a3a4d", finne: "#e8e8e8",
    mønster: "skelet", øjeStr: 0.1, mund: "tænder",
    cm: [25, 45], chance: 0.06, styrke: 0.5, spring: 0.4, lyd: "uhh", tekst: "Uhhh… lidt uhyggelig. Men sød." },
  { id: "polse", navn: "Pølsefisk", krop: "lang", form: [0.8, 1.2, 1.3], farve: "#c1440e", bug: "#e07a3f", finne: "#ffd23f",
    mønster: "sennep", mund: "tunge",
    cm: [20, 40], chance: 0.08, styrke: 0.35, spring: 0.5, lyd: "boing", tekst: "Lugter lidt af grill…" },
  { id: "stovle", navn: "Gammel støvle", krop: "støvle", farve: "#7a4a26",
    cm: [28, 32], chance: 0.1, styrke: 0.15, spring: 0, lyd: "plop",
    tekst: "Hov! Det er jo slet ikke en fisk…", tale: "Du fangede en gammel støvle! Hov!" },
  { id: "guldfisk", navn: "Guldfisken", krop: "normal", form: [0.7, 0.85, 0.85], farve: "#ffc300", bug: "#fff1a8", finne: "#ff8c00",
    mønster: "guld", mund: "læber", øjeStr: 0.1,
    cm: [5, 9], chance: 0.02, styrke: 0.2, spring: 0.9, lyd: "magi",
    tekst: "Superduper sjælden! Du må ønske dig noget.", tale: "Wow! Du fangede Guldfisken!" },

  // ----- Havet (man fisker fra båden) -----
  { id: "haj", navn: "Smilehajen", krop: "lang", form: [1.05, 1.7, 1.35], farve: "#7f93a8", bug: "#f4f6f9", finne: "#6c8096",
    mund: "tænder", tilbehør: ["hajfinne"], sted: "hav",
    cm: [90, 160], chance: 0.06, styrke: 0.9, spring: 0.35, lyd: "haj", tekst: "Den smiler med 300 tænder!" },
  { id: "hammerhaj", navn: "Hammerhajen", krop: "lang", form: [1, 1.5, 1.3], farve: "#8a9bb0", bug: "#eef1f5", finne: "#76889e",
    øjne: 0, tilbehør: ["hammer", "hajfinne"], sted: "hav",
    cm: [100, 180], chance: 0.04, styrke: 0.95, spring: 0.25, lyd: "haj", tekst: "Den banker søm i med hovedet." },
  { id: "svaerd", navn: "Sværdfisken", krop: "lang", form: [1, 1.3, 1], farve: "#2f5fa8", bug: "#dfe9f7", finne: "#1f3f7a",
    tilbehør: ["sværd"], sted: "hav",
    cm: [90, 150], chance: 0.05, styrke: 0.85, spring: 0.7, lyd: "sværd", tekst: "En ægte ridder af havet!" },
  { id: "klovn", navn: "Klovnefisken", krop: "normal", form: [0.9, 1.1, 1], farve: "#ff7a1a", bug: "#ffa65c", finne: "#ff7a1a",
    mønster: "klovn", mund: "læber", sted: "hav",
    cm: [8, 14], chance: 0.13, styrke: 0.25, spring: 0.5, lyd: "boing", tekst: "Den kan tre vittigheder!" },
  { id: "blaeksprutte", navn: "Blæksprutten", krop: "blæksprutte", farve: "#9b5de5", bug: "#e2c6ff", sted: "hav",
    cm: [30, 70], chance: 0.07, styrke: 0.6, spring: 0.2, lyd: "blæk", tekst: "Otte arme — og den krammer gerne!" },
  { id: "krabbe", navn: "Knibekrabben", krop: "krabbe", farve: "#e4572e", bug: "#ffb38a", sted: "hav",
    cm: [15, 30], chance: 0.1, styrke: 0.4, spring: 0.15, lyd: "knips", tekst: "Knib knib! Den går sidelæns." },
  { id: "soestjerne", navn: "Søstjernen", krop: "stjerne", farve: "#ff8fab", bug: "#ffe0e8", sted: "hav",
    cm: [15, 30], chance: 0.1, styrke: 0.15, spring: 0, lyd: "magi", tekst: "En stjerne, der er faldet i havet." },
  { id: "hval", navn: "Hvalungen", krop: "rund", form: [1.5, 0.85, 0.9], farve: "#3a6ea5", bug: "#e8f1fa", finne: "#2f5d8c",
    øjeStr: 0.07, mund: "normal", tilbehør: ["sprøjt"], sted: "hav",
    cm: [150, 250], chance: 0.025, styrke: 1, spring: 0.4, lyd: "hval",
    tekst: "En baby-hval! Mor venter længere ude.", tale: "Wow! Du fangede en baby-hval!" },
  { id: "skat", navn: "Skattekisten", krop: "kiste", farve: "#8b5a2b", sted: "hav",
    cm: [40, 60], chance: 0.03, styrke: 0.5, spring: 0, lyd: "skat",
    tekst: "Fuld af guld og ædelsten!", tale: "Du fandt en skattekiste! Fuld af guld!" },

  // ----- Søen -----
  { id: "kat", navn: "Kattefisken", krop: "normal", form: [1.05, 1, 1.05], farve: "#f4a340", bug: "#fff1dc", finne: "#e88a1a",
    mønster: "striber", mønsterFarve: "#c46a10", mund: "normal", tilbehør: ["katteører", "knurhår"], sted: "sø",
    cm: [25, 60], chance: 0.08, styrke: 0.5, spring: 0.4, lyd: "miav", tekst: "Miav! Den spinder under vandet." },
  { id: "jordbaer", navn: "Jordbærfisken", krop: "rund", form: [1.1, 0.9, 0.9], farve: "#e8323c", bug: "#ff6b6b", finne: "#3fa34d",
    mønster: "frø", mønsterFarve: "#ffe066", mund: "tunge", tilbehør: ["blade"], sted: "sø",
    cm: [10, 20], chance: 0.08, styrke: 0.25, spring: 0.5, lyd: "plop", tekst: "Den smager af sommer!" },
  { id: "zebra", navn: "Zebrafisken", krop: "normal", form: [1.1, 0.9, 0.9], farve: "#ffffff", bug: "#ffffff", finne: "#222222",
    mønster: "striber", mønsterFarve: "#1a1a1a", sted: "sø",
    cm: [8, 16], chance: 0.12, styrke: 0.25, spring: 0.4, lyd: "blub", tekst: "Sort med hvide striber. Eller omvendt?" },

  // ----- Begge steder -----
  { id: "robot", navn: "Robotfisken", krop: "kasse", farve: "#aab7c4", bug: "#d7dee6", finne: "#ff4f4f", mønster: "robot",
    øjeStr: 0.1, mund: "normal", tilbehør: ["antenne"],
    cm: [25, 45], chance: 0.06, styrke: 0.5, spring: 0.4, lyd: "bip", tekst: "Bip bop! Batteriet er fuldt." },
  { id: "spoegelse", navn: "Spøgelsesfisken", krop: "normal", farve: "#e8f4ff", bug: "#ffffff", finne: "#cfe8ff", mønster: "spøgelse",
    øjeStr: 0.1, mund: "tunge",
    cm: [20, 40], chance: 0.05, styrke: 0.35, spring: 0.6, lyd: "spøg", tekst: "Buhu! Man kan se lige igennem den." },
  { id: "lava", navn: "Lavafisken", krop: "normal", form: [1.05, 1.1, 1.1], farve: "#2b1a14", bug: "#3d2418", finne: "#ff6a00", mønster: "lava",
    mund: "tænder",
    cm: [30, 55], chance: 0.04, styrke: 0.7, spring: 0.5, lyd: "tss", tekst: "Varm! Den kommer fra en vulkan." },
  { id: "is", navn: "Isfisken", krop: "normal", farve: "#bfefff", bug: "#ffffff", finne: "#8ad8ff", mønster: "is",
    cm: [20, 40], chance: 0.05, styrke: 0.4, spring: 0.4, lyd: "klirr", tekst: "Brrr! Den er lavet af is." },
  { id: "astronaut", navn: "Astronautfisken", krop: "normal", farve: "#ffffff", bug: "#e6e9f0", finne: "#3a86ff",
    mund: "læber", tilbehør: ["rumhjelm"],
    cm: [20, 35], chance: 0.04, styrke: 0.45, spring: 0.8, lyd: "raket", tekst: "Den har været på Månen!" },
  { id: "super", navn: "Superfisken", krop: "normal", form: [1, 1.1, 1.05], farve: "#2f6bff", bug: "#9fbaff", finne: "#e63946",
    mund: "læber", tilbehør: ["kappe"],
    cm: [30, 50], chance: 0.04, styrke: 0.8, spring: 0.9, lyd: "fanfare", tekst: "Den kan flyve! Næsten." },
  { id: "prinsesse", navn: "Prinsessefisken", krop: "normal", form: [0.95, 1.1, 1], farve: "#ff9ed2", bug: "#fff0f8", finne: "#c77dff",
    mønster: "prikker", mønsterFarve: "#ffffff", mund: "læber", tilbehør: ["tiara"],
    cm: [18, 35], chance: 0.05, styrke: 0.35, spring: 0.6, lyd: "magi", tekst: "Hun bor i et slot af koraller." },
  { id: "dino", navn: "Dinofisken", krop: "lang", form: [1, 1.4, 1.3], farve: "#4caf50", bug: "#c5e8b0", finne: "#ff9f1c",
    mund: "tænder", tilbehør: ["rygpigge"],
    cm: [60, 120], chance: 0.04, styrke: 0.85, spring: 0.3, lyd: "rawr", tekst: "Rawr! Den er 100 millioner år gammel." },
];

// ---------- Byggeklodser ----------
const HVID = "#ffffff", SORT = "#15151f";
const std = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.45, metalness: 0.05, ...x });
function mesh(geo, m, x = 0, y = 0, z = 0) { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); return me; }
function udfyldt(shape, dybde) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: dybde, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 10,
  });
  g.translate(0, 0, -dybde / 2);
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function øje(r) {
  const e = new THREE.Group();
  e.add(mesh(new THREE.SphereGeometry(r, 20, 14), std(HVID, { roughness: 0.25 })));
  const pupil = mesh(new THREE.SphereGeometry(r * 0.55, 16, 12), std(SORT, { roughness: 0.15 }), 0, 0, r * 0.6);
  pupil.add(mesh(new THREE.SphereGeometry(r * 0.17, 8, 6), new THREE.MeshBasicMaterial({ color: HVID }), r * 0.18, r * 0.2, r * 0.42));
  pupil.userData.r = r;
  e.add(pupil);
  e.userData.pupil = pupil;
  return e;
}

// Kropsmål (halve længder): [x, y, z]
const KROP = { normal: [0.5, 0.27, 0.17], rund: [0.4, 0.38, 0.36], lang: [0.8, 0.15, 0.13], kasse: [0.46, 0.28, 0.2], banan: [0.55, 0.13, 0.13] };

export function byggFisk(def) {
  const særlig = { støvle: byggStøvle, blæksprutte: byggBlæksprutte, krabbe: byggKrabbe, stjerne: byggSøstjerne, kiste: byggKiste }[def.krop];
  const indre = særlig ? særlig(def) : byggKropFisk(def);
  // centrér så fisken drejer om sin midte
  const boks = new THREE.Box3().setFromObject(indre), midt = boks.getCenter(new THREE.Vector3());
  indre.position.sub(midt);
  const fisk = new THREE.Group();
  fisk.add(indre);
  fisk.userData = { ...indre.userData, def, længde: boks.max.x - boks.min.x, højde: boks.max.y - boks.min.y };
  fisk.userData.mund = (indre.userData.mund || V(0, 0, 0)).clone().sub(midt);
  return fisk;
}

function byggKropFisk(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [] };
  const f = def.form || [1, 1, 1], [bx, by, bz] = KROP[def.krop] || KROP.normal;
  const rx = bx * f[0], ry = by * f[1], rz = bz * f[2];
  const kasse = def.krop === "kasse", tilspids = !(kasse || def.krop === "rund");
  const bøj = def.krop === "banan" ? x => 1.3 * x * x : () => 0;          // bananen krummer
  const smal = x => tilspids ? 1 - Math.max(0, -x / rx) * 0.35 : 1;          // smallere mod halen
  const smalZ = x => tilspids ? 1 - Math.max(0, -x / rx) * 0.45 : 1;
  const ell = x => Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  const top = x => kasse ? ry : ry * ell(x) * smal(x) + bøj(x);
  const bund = x => kasse ? -ry : -ry * ell(x) * smal(x) + bøj(x);
  const s = Math.max(0.6, ry / 0.27);                                         // størrelse på finner og hale

  // Punkt + normal på kroppens side (bruges til øjne, prikker, tænder)
  function flade(x, y, side) {
    if (kasse) return { p: V(x, y, side * rz * 1.04), n: V(0, 0, side) };
    const zz = rz * Math.sqrt(Math.max(0.02, 1 - (x / rx) ** 2 - (y / ry) ** 2));
    const n = V(x / rx ** 2, y / ry ** 2, side * zz / rz ** 2).normalize();
    return { p: V(x, y * smal(x) + bøj(x), side * zz * smalZ(x)), n };
  }

  // --- krop ---
  let geo = kasse ? new THREE.BoxGeometry(2, 2, 2, 10, 8, 6) : new THREE.SphereGeometry(1, 36, 22);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (kasse) v.lerp(v.clone().normalize().multiplyScalar(1.2), 0.25);     // bløde kanter
    const x = v.x * rx;
    p.setXYZ(i, x, v.y * ry * smal(x) + bøj(x), v.z * rz * smalZ(x));
  }
  const facetter = def.mønster === "disko" || def.mønster === "is";          // små flader med hver sin farve
  if (facetter) geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  farvKrop(geo, def, rx, ry, bøj, smal);
  const glans = { disko: [0.25, 0.7], guld: [0.22, 0.45], robot: [0.3, 0.75], is: [0.08, 0.25] }[def.mønster] || [0.5, 0.05];
  const kropMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: glans[0], metalness: glans[1], flatShading: facetter,
  });
  if (def.mønster === "disko") { kropMat.emissive = new THREE.Color("#222244"); u.disko = kropMat; }
  if (def.mønster === "guld") { kropMat.emissive = new THREE.Color("#7a4d00"); u.guld = kropMat; }
  if (def.mønster === "lava") { kropMat.emissive = new THREE.Color("#ff3a00"); kropMat.emissiveIntensity = 0.25; u.lava = kropMat; }
  if (def.mønster === "is") { Object.assign(kropMat, { transparent: true, opacity: 0.85 }); kropMat.emissive = new THREE.Color("#2a5a7a"); }
  const spøgelse = def.mønster === "spøgelse";                                  // man kan se igennem den
  if (spøgelse) {
    Object.assign(kropMat, { transparent: true, opacity: 0.55, depthWrite: false });
    kropMat.emissive = new THREE.Color("#9fd4ff"); kropMat.emissiveIntensity = 0.35; u.spøgelse = kropMat;
  }
  g.add(mesh(geo, kropMat));

  const finneMat = std(def.finne || "#ff9f1c", { side: THREE.DoubleSide, ...(spøgelse ? { transparent: true, opacity: 0.5, depthWrite: false } : {}) });

  // --- hale ---
  const hs = new THREE.Shape();
  hs.moveTo(0.02, 0.06);
  hs.quadraticCurveTo(-0.14, 0.1, -0.34, 0.3);
  hs.quadraticCurveTo(-0.24, 0, -0.34, -0.3);
  hs.quadraticCurveTo(-0.14, -0.1, 0.02, -0.06);
  hs.closePath();
  const hale = new THREE.Group();
  hale.add(mesh(udfyldt(hs, 0.03), finneMat));
  const hx = def.krop === "rund" ? -rx * 0.92 : -rx * 0.97;
  hale.position.set(hx, bøj(hx), 0);
  hale.scale.setScalar(s);
  g.add(hale);
  u.hale = hale;

  // --- rygfinne ---
  const tilbehør = def.tilbehør || [];
  if (!["pigge", "hajfinne", "rygpigge"].some(t => tilbehør.includes(t))) {
    const ds = new THREE.Shape();
    ds.moveTo(0.2, 0);
    ds.quadraticCurveTo(0.08, 0.2, -0.18, 0.2);
    ds.quadraticCurveTo(-0.14, 0.08, -0.22, 0);
    ds.closePath();
    const ryg = mesh(udfyldt(ds, 0.025), finneMat, -rx * 0.1, top(-rx * 0.1) - 0.03, 0);
    ryg.scale.set(rx / 0.5, s * 0.9, 1);
    g.add(ryg);
  }

  // --- sidefinner (de basker) ---
  for (const side of [1, -1]) {
    const fi = new THREE.Group();
    const m = mesh(new THREE.SphereGeometry(1, 12, 8), finneMat, -0.08 * s, 0, 0);
    m.scale.set(0.11 * s, 0.018, 0.06 * s);
    fi.add(m);
    const a = flade(rx * 0.15, -ry * 0.3, side);
    fi.position.copy(a.p);
    fi.rotation.y = side * 0.5;
    fi.userData.side = side;
    g.add(fi);
    u.finner.push(fi);
  }

  // --- øjne ---
  const eR = def.øjeStr || 0.085, antal = def.øjne ?? 2, øjne = [];
  function sætØje(pos, n) {
    const e = øje(eR);
    e.position.copy(pos).addScaledVector(n, eR * 0.35);
    e.lookAt(e.position.clone().add(n));
    g.add(e); u.pupiller.push(e.userData.pupil); øjne.push(e);
  }
  const ex = rx * (def.krop === "lang" ? 0.72 : 0.55), ey = ry * 0.3;
  if (antal === 1) {
    sætØje(V(rx * 0.72, top(rx * 0.72) * 0.75, 0), V(0.6, 0.8, 0).normalize());
  } else if (antal >= 2) {
    for (const side of [1, -1]) { const a = flade(ex, ey, side); sætØje(a.p, a.n); }
    if (antal >= 3) sætØje(V(rx * 0.2, top(rx * 0.2), 0), V(0.25, 1, 0).normalize());
  }

  // --- mund ---
  const mx = rx * 0.99, my = -ry * 0.12 + bøj(rx * 0.99);
  u.mund = V(rx * 1.02, my, 0);
  const mørkMund = () => { const m = mesh(new THREE.SphereGeometry(1, 12, 8), std("#3a1020"), mx, my, 0); m.scale.set(0.02, 0.035 * s, 0.06 * s); g.add(m); };
  switch (def.mund) {
    case "læber": {
      const l = mesh(new THREE.TorusGeometry(0.045 * s, 0.022 * s, 10, 20), std("#ff4f8b", { roughness: 0.3 }), mx, my, 0);
      l.rotation.y = Math.PI / 2;
      g.add(l);
      break;
    }
    case "tænder": {
      mørkMund();
      const tm = std(HVID, { roughness: 0.3 }), tg = new THREE.ConeGeometry(0.018 * s, 0.05 * s, 6);
      for (const side of [1, -1]) for (let i = 0; i < 4; i++) {
        const a = flade(rx * (0.92 - i * 0.07), -ry * 0.16, side);
        const t = mesh(tg, tm); t.position.copy(a.p).addScaledVector(a.n, 0.004); t.rotation.x = Math.PI;
        g.add(t);
      }
      break;
    }
    case "tunge": {
      mørkMund();
      const t = mesh(new THREE.SphereGeometry(1, 12, 8), std("#ff6f91", { roughness: 0.4 }), mx + 0.04, my - 0.03, 0);
      t.scale.set(0.07, 0.018, 0.045); t.rotation.z = -0.4;
      g.add(t);
      break;
    }
    default: mørkMund();
  }

  // --- prikker ---
  if (def.mønster === "prikker" || def.mønster === "frø") {
    const frø = def.mønster === "frø", pm = std(def.mønsterFarve || "#222222", { roughness: 0.5 }), pg = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < (frø ? 80 : 26); i++) {
      const xn = Math.random() * 1.4 - 0.75, yn = Math.random() * 0.95 - 0.15, side = i % 2 ? 1 : -1;
      if (1 - xn * xn - yn * yn < 0.12 || (Math.abs(xn - ex / rx) < 0.18 && Math.abs(yn - 0.3) < 0.3)) continue;
      const a = flade(xn * rx, yn * ry, side), r = frø ? 0.011 + Math.random() * 0.005 : 0.022 + Math.random() * 0.022;
      const d = mesh(pg, pm); d.scale.set(r, frø ? r * 1.5 : r, r * 0.35);
      d.position.copy(a.p); d.lookAt(a.p.clone().add(a.n));
      g.add(d);
    }
  }

  // --- tilbehør ---
  const guldMat = std("#ffc83d", { metalness: 0.85, roughness: 0.25 });
  const sortMat = std("#1b1b24", { roughness: 0.35 });
  for (const t of tilbehør) {
    if (t === "krone") {
      const k = new THREE.Group(), kx = rx * 0.28;
      k.add(mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.07, 18, 1, true), std("#ffc83d", { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide })));
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, cx = Math.cos(a) * 0.095, cz = Math.sin(a) * 0.095;
        k.add(mesh(new THREE.ConeGeometry(0.025, 0.08, 6), guldMat, cx, 0.07, cz));
        k.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), guldMat, cx, 0.115, cz));
      }
      [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a, i) =>
        k.add(mesh(new THREE.SphereGeometry(0.02, 10, 8), std(i % 2 ? "#e63946" : "#3a86ff", { roughness: 0.2 }), Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1)));
      k.position.set(kx, top(kx) + 0.02, 0); k.rotation.z = -0.15; k.scale.setScalar(Math.max(0.9, s * 0.9));
      g.add(k);
    } else if (t === "høj hat") {
      const h = new THREE.Group(), hx = rx * 0.2;
      h.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.015, 24), sortMat));
      h.add(mesh(new THREE.CylinderGeometry(0.095, 0.1, 0.2, 20), sortMat, 0, 0.1, 0));
      h.add(mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.04, 20), std("#e63946"), 0, 0.03, 0));
      h.position.set(hx, top(hx) - 0.005, 0); h.rotation.z = -0.12;
      g.add(h);
    } else if (t === "piratHat") {
      const h = new THREE.Group(), hx = rx * 0.22;
      const kuppel = mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), sortMat);
      kuppel.scale.set(1.25, 0.8, 1); h.add(kuppel);
      const skygge = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), sortMat);
      skygge.scale.set(1.3, 1, 0.75); h.add(skygge);
      for (const side of [1, -1]) h.add(mesh(new THREE.SphereGeometry(0.032, 10, 8), std(HVID), 0.02, 0.055, side * 0.115));
      h.position.set(hx, top(hx) - 0.01, 0); h.rotation.z = -0.1;
      g.add(h);
    } else if ((t === "briller" || t === "solbriller") && øjne.length >= 2) {
      const stel = t === "solbriller" ? std("#ff4fd8", { roughness: 0.3 }) : std(SORT, { metalness: 0.3, roughness: 0.2 });
      for (const e of øjne.slice(0, 2)) {
        const ring = mesh(new THREE.TorusGeometry(eR * 1.3, 0.012, 8, 24), stel);
        ring.position.copy(e.position); ring.quaternion.copy(e.quaternion); ring.translateZ(eR * 0.75);
        g.add(ring);
        if (t === "solbriller") {
          const l = mesh(new THREE.CircleGeometry(eR * 1.3, 24), new THREE.MeshStandardMaterial({ color: "#111122", metalness: 0.6, roughness: 0.1, side: THREE.DoubleSide }));
          l.position.copy(ring.position); l.quaternion.copy(ring.quaternion);
          g.add(l);
        }
      }
      const R = Math.abs(øjne[0].position.z) + eR * 0.6;
      const bro = mesh(new THREE.TorusGeometry(R, 0.01, 6, 20, Math.PI), stel, ex + 0.02, ey + bøj(ex), 0);
      bro.rotation.y = Math.PI / 2;
      bro.scale.y = Math.max(0.3, (top(ex) + 0.02 - ey) / R);
      g.add(bro);
    } else if (t === "øjeklap" && øjne.length) {
      const e = øjne[0];
      const klap = mesh(new THREE.CylinderGeometry(eR * 1.25, eR * 1.25, 0.015, 20), sortMat);
      klap.position.copy(e.position); klap.quaternion.copy(e.quaternion);
      klap.rotateX(Math.PI / 2); klap.translateY(eR * 0.8);
      g.add(klap);
      const bånd = mesh(new THREE.TorusGeometry(1, 0.012, 6, 40), sortMat, ex, bøj(ex), 0);
      bånd.rotation.y = Math.PI / 2;
      bånd.scale.set(rz * ell(ex) * 1.06, ry * ell(ex) * 1.04, 1);
      g.add(bånd);
    } else if (t === "overskæg") {
      const brun = std("#3b2414", { roughness: 0.8 });
      for (const side of [1, -1]) {
        const kurve = new THREE.CatmullRomCurve3([
          V(rx * 1.0, my + 0.03, 0), V(rx * 0.97, my - 0.02, side * 0.06),
          V(rx * 0.9, my - 0.01, side * 0.13), V(rx * 0.84, my + 0.05, side * 0.17),
        ]);
        g.add(mesh(new THREE.TubeGeometry(kurve, 16, 0.022, 8, false), brun));
        g.add(mesh(new THREE.SphereGeometry(0.024, 8, 6), brun, rx * 0.84, my + 0.05, side * 0.17));
      }
    } else if (t === "horn") {
      const hg = new THREE.ConeGeometry(0.045, 0.34, 14, 8), hp = hg.attributes.position, hf = [];
      const a = new THREE.Color("#fff3c4"), b = new THREE.Color("#ffc83d");
      for (let i = 0; i < hp.count; i++) { const c = Math.floor((hp.getY(i) + 0.17) / 0.34 * 7) % 2 ? a : b; hf.push(c.r, c.g, c.b); }
      hg.setAttribute("color", new THREE.Float32BufferAttribute(hf, 3));
      const hx2 = rx * 0.62, horn = mesh(hg, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.3 }), hx2, top(hx2) + 0.12, 0);
      horn.rotation.z = -0.65;
      g.add(horn);
    } else if (t === "lygte") {
      const lx0 = rx * 0.3, ly0 = top(lx0);
      const kurve = new THREE.CatmullRomCurve3([V(lx0, ly0 - 0.02, 0), V(rx * 0.55, ly0 + 0.28, 0), V(rx * 0.95, ly0 + 0.36, 0), V(rx * 1.22, ly0 + 0.2, 0)]);
      g.add(mesh(new THREE.TubeGeometry(kurve, 20, 0.013, 6, false), std(def.farve)));
      const pære = new THREE.MeshStandardMaterial({ color: "#fff8c0", emissive: "#ffe86b", emissiveIntensity: 2 });
      g.add(mesh(new THREE.SphereGeometry(0.065, 16, 12), pære, rx * 1.22, ly0 + 0.16, 0));
      u.lygte = pære;
    } else if (t === "pigge") {
      const pm = std(def.finne || "#ff9f1c", { roughness: 0.4 }), pg = new THREE.ConeGeometry(0.028, 0.12, 6);
      pg.translate(0, 0.06, 0);
      const N = 50, op = V(0, 1, 0);
      for (let i = 0; i < N; i++) {                  // jævnt fordelt over kroppen
        const yy = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - yy * yy), a = i * 2.39996;
        const d = V(Math.cos(a) * rr, yy, Math.sin(a) * rr);
        if ((d.x > 0.5 && Math.abs(d.y) < 0.6) || d.x < -0.85) continue;   // ikke i ansigtet og ved halen
        const n = V(d.x / rx, d.y / ry, d.z / rz).normalize();
        const pig = mesh(pg, pm);
        pig.position.set(d.x * rx, d.y * ry, d.z * rz).addScaledVector(n, -0.01);
        pig.quaternion.setFromUnitVectors(op, n);
        g.add(pig);
      }
    } else if (t === "hajfinne") {                     // en stor, spids rygfinne
      const fs = new THREE.Shape();
      fs.moveTo(0.2, 0); fs.quadraticCurveTo(0.04, 0.16, -0.08, 0.42); fs.quadraticCurveTo(-0.1, 0.18, -0.24, 0); fs.closePath();
      const hf = mesh(udfyldt(fs, 0.035), finneMat, -rx * 0.05, top(-rx * 0.05) - 0.05, 0);
      hf.scale.set(0.9 * Math.max(1, rx / 0.5), s * 0.85, 1);
      g.add(hf);
    } else if (t === "hammer") {                       // hammerhovedet med øjnene yderst
      const hx = rx * 0.88, hy = top(hx) * 0.35, B = 0.26 * s;
      const hm = mesh(new THREE.CapsuleGeometry(0.075 * s, B * 2, 6, 14), std(def.farve, { roughness: 0.5 }), hx, hy, 0);
      hm.rotation.x = Math.PI / 2; hm.scale.set(1.4, 1, 0.55);
      g.add(hm);
      for (const side of [1, -1]) sætØje(V(hx + 0.02, hy + 0.02, side * (B + 0.085 * s)), V(0.35, 0.25, side).normalize());
      u.visDrej = -0.7;                                 // vis den lidt forfra, så man kan se hammeren
    } else if (t === "sværd") {                        // et langt sværd ud af næsen
      const sv = mesh(new THREE.ConeGeometry(0.03 * s, 0.75, 12), std("#d9dde3", { metalness: 0.5, roughness: 0.3 }), rx + 0.34, my + 0.02, 0);
      sv.rotation.z = -Math.PI / 2;
      g.add(sv);
    } else if (t === "sprøjt") {                       // hvalens vandsprøjt (dråberne flytter sig i animerFisk)
      const sp = new THREE.Group(), dm = new THREE.MeshStandardMaterial({ color: "#d8f3ff", transparent: true, opacity: 0.8, roughness: 0.1 });
      for (let i = 0; i < 10; i++) sp.add(mesh(new THREE.SphereGeometry(0.04, 8, 6), dm));
      const sx = rx * 0.3; sp.position.set(sx, top(sx) - 0.02, 0);
      g.add(sp); u.sprøjt = sp;
    } else if (t === "antenne") {                      // robottens antenne med et blinkende lys
      const ax = rx * 0.3;
      g.add(mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.26, 6), std("#555b66", { metalness: 0.6 }), ax, top(ax) + 0.13, 0));
      const lys = new THREE.MeshStandardMaterial({ color: "#ff3b3b", emissive: "#ff2020", emissiveIntensity: 2 });
      g.add(mesh(new THREE.SphereGeometry(0.045, 12, 8), lys, ax, top(ax) + 0.27, 0));
      for (const side of [1, -1]) for (const bx0 of [-0.6, 0.1]) {                // små skruer på siden
        const a = flade(bx0 * rx, -ry * 0.4, side), sk = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 8), std("#6b7480", { metalness: 0.8, roughness: 0.3 }));
        sk.position.copy(a.p); sk.quaternion.setFromUnitVectors(V(0, 1, 0), a.n); g.add(sk);
      }
      u.lygte = lys;
    } else if (t === "katteører") {
      for (const side of [1, -1]) {
        const ox = rx * 0.42, ør = new THREE.Group();
        ør.add(mesh(new THREE.ConeGeometry(0.075, 0.15, 4), std(def.farve)));
        ør.add(mesh(new THREE.ConeGeometry(0.042, 0.09, 4), std("#ffb3c6"), 0.02, -0.015, 0));
        ør.position.set(ox, top(ox) + 0.03, side * rz * 0.5); ør.rotation.x = -side * 0.3;
        g.add(ør);
      }
    } else if (t === "knurhår") {
      const km = std("#3a2a1a");
      for (const side of [1, -1]) for (let i = 0; i < 3; i++) {
        const w = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), km, rx * 0.93, my + 0.035, side * (rz * 0.55 + 0.15));
        w.rotation.x = side * (Math.PI / 2 + (i - 1) * 0.28);
        g.add(w);
      }
    } else if (t === "rumhjelm") {                     // en glasboble om hovedet
      const hx = rx * 0.5, r = Math.max(ry, rz) * 1.25 + 0.06;
      const glas = new THREE.MeshStandardMaterial({ color: "#d6f1ff", transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2, depthWrite: false });
      g.add(mesh(new THREE.SphereGeometry(r, 26, 18), glas, hx, 0, 0));
      const krave = mesh(new THREE.TorusGeometry(r * 0.93, 0.026, 8, 30), std("#d0d6de", { metalness: 0.7, roughness: 0.3 }), hx - r * 0.36, 0, 0);
      krave.rotation.y = Math.PI / 2; g.add(krave);
      const skin = mesh(new THREE.SphereGeometry(r * 0.2, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.75 }), hx + r * 0.35, r * 0.5, r * 0.45);
      skin.scale.set(1, 0.45, 0.35); g.add(skin);
    } else if (t === "kappe") {                        // en rød superheltekappe, der blafrer
      const kg = new THREE.PlaneGeometry(0.62, 0.4, 10, 4).rotateX(-Math.PI / 2);
      kg.translate(-0.31, 0, 0);
      const kappe = mesh(kg, std("#e63946", { side: THREE.DoubleSide, roughness: 0.6 }), rx * 0.3, top(rx * 0.3) + 0.03, 0);
      kappe.rotation.z = -0.22;                          // bagenden løfter sig
      kappe.userData.x0 = Float32Array.from(kg.attributes.position.array);
      g.add(kappe); u.kappe = kappe;
      g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), std("#ffc83d", { metalness: 0.8, roughness: 0.3 }), rx * 0.3, top(rx * 0.3) + 0.03, 0));
    } else if (t === "tiara") {
      const tx = rx * 0.3, ti = new THREE.Group(), sølv = std("#f1f5f9", { metalness: 0.9, roughness: 0.2 });
      ti.add(mesh(new THREE.BoxGeometry(0.05, 0.03, 0.2), sølv));
      [[0, 0.11, "#ff4fa3"], [-0.065, 0.075, "#6ec6ff"], [0.065, 0.075, "#6ec6ff"]].forEach(([z, h, farve]) => {
        ti.add(mesh(new THREE.ConeGeometry(0.022, h, 6), sølv, 0, h / 2, z));
        ti.add(mesh(new THREE.SphereGeometry(0.02, 10, 8), std(farve, { roughness: 0.15, metalness: 0.3 }), 0.012, h * 0.45, z));
      });
      ti.position.set(tx, top(tx) + 0.01, 0); ti.rotation.z = -0.2;
      g.add(ti);
    } else if (t === "blade") {                        // jordbærblade og en lille stilk
      const bm = std("#3fa34d", { side: THREE.DoubleSide }), bx0 = -rx * 0.05, bæg = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, b = mesh(new THREE.ConeGeometry(0.05, 0.2, 4), bm, Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08);
        b.scale.z = 0.3; b.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
        bæg.add(b);
      }
      bæg.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6), std("#2d7a36"), 0, 0.06, 0));
      bæg.position.set(bx0, top(bx0) - 0.01, 0);
      g.add(bæg);
    } else if (t === "rygpigge") {                     // dinosaur-plader hen ad ryggen
      const pm = [std(def.finne || "#ff9f1c", { roughness: 0.4 }), std("#ffd23f", { roughness: 0.4 })];
      for (let i = 0; i < 6; i++) {
        const px = rx * (0.45 - i * 0.22), h = 1 - Math.abs(i - 2.5) / 3.5;
        const pl = mesh(new THREE.ConeGeometry(0.075, 0.17, 4), pm[i % 2], px, top(px) + 0.05 * h, 0);
        pl.scale.set(h, h, 0.35 * h);
        g.add(pl);
      }
    } else if (t === "sløjfe") {
      const sm = std("#e63946", { roughness: 0.4 }), sløjfe = new THREE.Group(), sx = rx * 0.5;
      for (const side of [1, -1]) {
        const c = mesh(new THREE.ConeGeometry(0.06, 0.11, 4), sm, -side * 0.055, 0, 0);
        c.rotation.z = side * Math.PI / 2;
        sløjfe.add(c);
      }
      sløjfe.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), sm));
      sløjfe.position.set(sx, bund(sx) - 0.02, 0);
      g.add(sløjfe);
    }
  }

  g.userData = u;
  return g;
}

function farvKrop(geo, def, rx, ry, bøj, smal) {
  const p = geo.attributes.position, n = p.count, farver = new Float32Array(n * 3);
  const ryg = new THREE.Color(def.farve), bug = new THREE.Color(def.bug || def.farve), mf = new THREE.Color(def.mønsterFarve || "#222222");
  const c = new THREE.Color(), hvid = new THREE.Color(HVID);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), xn = x / rx, y = (p.getY(i) - bøj(x)) / smal(x);
    const h = THREE.MathUtils.clamp((y / ry + 1) / 2, 0, 1);
    c.copy(bug).lerp(ryg, THREE.MathUtils.smoothstep(h, 0.3, 0.65));
    switch (def.mønster) {
      case "striber": if (Math.sin(xn * 13) > 0.45 && h > 0.3) c.lerp(mf, 0.85); break;
      case "regnbue": c.setHSL((xn * 0.5 + 0.5) * 0.85, 0.85, 0.62).lerp(hvid, (1 - h) * 0.35); break;
      case "skelet": {
        const ribben = Math.abs(Math.sin(xn * 11)) > 0.82 && xn > -0.75 && xn < 0.4;
        const rygrad = Math.abs(y / ry) < 0.1 && xn < 0.45;
        if (xn > 0.5) c.set("#e6e6e6");                 // kranie
        else if (ribben || rygrad) c.set("#f2f2f2");
        break;
      }
      case "guld": c.lerp(hvid, Math.max(0, Math.sin(xn * 20 + y * 30)) * 0.25); break;
      case "sennep": if (Math.abs(h - (0.86 + 0.06 * Math.sin(xn * 18))) < 0.045) c.set("#ffd23f"); break;
      case "klovn":                                     // tre hvide bånd med sorte kanter
        for (const b of [0.5, 0, -0.55]) { const d = Math.abs(xn - b); if (d < 0.09) c.set(HVID); else if (d < 0.125) c.set("#1a1a1a"); }
        break;
      case "robot": if (Math.abs(Math.sin(xn * 10)) < 0.07 || Math.abs(y / ry) < 0.04) c.multiplyScalar(0.6); break;
      case "spøgelse": c.lerp(hvid, 0.3); break;
      case "lava": {                                    // glødende revner
        const k = Math.abs(Math.sin(xn * 7 + Math.sin(y / ry * 5) * 1.3)), k2 = Math.abs(Math.sin(y / ry * 6 - xn * 3));
        if (k < 0.16 || k2 < 0.1) c.set(k < 0.07 ? "#ffe066" : "#ff7a00");
        break;
      }
    }
    farver.set([c.r, c.g, c.b], i * 3);
  }
  if (def.mønster === "disko" || def.mønster === "is") {  // hver lille flade får sin egen farve
    for (let i = 0; i < n; i += 3) {
      if (def.mønster === "is") c.setHSL(0.52 + Math.random() * 0.05, 0.6, 0.76 + Math.random() * 0.18);
      else c.setHSL(Math.random(), 0.9, 0.62);
      for (let j = 0; j < 3; j++) farver.set([c.r, c.g, c.b], (i + j) * 3);
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(farver, 3));
}

function byggStøvle(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [] };
  const læder = std(def.farve || "#7a4a26", { roughness: 0.85 }), sål = std("#2b2118", { roughness: 0.9 }), snøre = std("#f1e3c8");
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.5, 18), læder, -0.14, 0.22, 0));        // skaft
  const hul = mesh(new THREE.CircleGeometry(0.15, 18), std("#1a120b"), -0.14, 0.472, 0);
  hul.rotation.x = -Math.PI / 2; g.add(hul);
  const fod = mesh(new THREE.CapsuleGeometry(0.14, 0.34, 8, 16), læder, 0.07, -0.03, 0);
  fod.rotation.z = Math.PI / 2; fod.scale.set(0.9, 1, 1.05); g.add(fod);
  g.add(mesh(new THREE.BoxGeometry(0.68, 0.05, 0.3), sål, 0.06, -0.16, 0));                     // sål
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.07, 0.28), sål, -0.18, -0.2, 0));                     // hæl
  for (let i = 0; i < 4; i++) for (const r of [0.7, -0.7]) {                                     // snørebånd
    const b = mesh(new THREE.BoxGeometry(0.016, 0.1, 0.012), snøre, 0.03, 0.38 - i * 0.09, 0);
    b.rotation.x = r; g.add(b);
  }
  const tang = new THREE.CatmullRomCurve3([V(-0.14, 0.45, 0.05), V(-0.05, 0.62, 0.08), V(0.08, 0.6, 0.1), V(0.16, 0.46, 0.12)]);
  g.add(mesh(new THREE.TubeGeometry(tang, 16, 0.02, 6), std("#3f9b3f")));
  // en lille fisk kigger op af støvlen
  const lille = byggKropFisk({ krop: "normal", farve: "#ff9f1c", bug: "#fff1c1", finne: "#ff6b3d", øjeStr: 0.1, mund: "læber" });
  lille.scale.setScalar(0.35); lille.rotation.z = Math.PI / 2 - 0.3; lille.position.set(-0.16, 0.56, 0);
  g.add(lille);
  u.hale = lille.userData.hale; u.pupiller.push(...lille.userData.pupiller);
  u.mund = V(0.38, 0, 0);
  g.userData = u;
  return g;
}

// ---------- Blæksprutten: et stort hoved og otte arme, der vifter ----------
function byggBlæksprutte(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [], tentakler: [], visDrej: -Math.PI / 2 };
  const hud = std(def.farve, { roughness: 0.45 }), lys = std(def.bug || "#ffffff", { roughness: 0.5 });
  const R = [0.3, 0.36, 0.3], C = V(-0.02, 0.2, 0);
  const hoved = mesh(new THREE.SphereGeometry(1, 30, 22), hud, C.x, C.y, C.z); hoved.scale.set(...R); g.add(hoved);
  const påHoved = d => { d.normalize(); return V(C.x + d.x * R[0], C.y + d.y * R[1], C.z + d.z * R[2]); };
  for (let i = 0; i < 12; i++) {                       // lyse pletter
    const d = V(Math.random() * 1.4 - 0.9, Math.random() * 1.2 - 0.1, Math.random() * 2 - 1);
    if (d.x > 0.3 && d.y < 0.6) continue;
    const pl = mesh(new THREE.SphereGeometry(1, 10, 8), lys); pl.position.copy(påHoved(d.clone())); pl.scale.setScalar(0.03 + Math.random() * 0.025);
    g.add(pl);
  }
  for (const side of [1, -1]) {                        // to store øjne foran
    const n = V(0.85, -0.05, side * 0.52).normalize(), e = øje(0.1);
    e.position.copy(påHoved(n.clone())).addScaledVector(n, 0.02); e.lookAt(e.position.clone().add(n));
    g.add(e); u.pupiller.push(e.userData.pupil);
  }
  const mund = mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 14), std("#5a1a4a"), 0.28, 0.0, 0);
  mund.rotation.y = Math.PI / 2; g.add(mund);
  for (let i = 0; i < 8; i++) {                        // otte arme, der krummer op for enden
    const a = i / 8 * Math.PI * 2 + 0.2, rod = new THREE.Group();
    rod.position.set(Math.cos(a) * 0.17, -0.07, Math.sin(a) * 0.17); rod.rotation.y = -a;
    g.add(rod);
    let far = rod; const led = [];
    for (let k = 0; k < 5; k++) {
      const r = 0.065 - k * 0.009, L = 0.11, seg = new THREE.Group();
      seg.position.x = k === 0 ? 0 : L;
      seg.userData.basis = k === 0 ? -1.15 : 0.28;
      seg.rotation.z = seg.userData.basis;
      const m = mesh(new THREE.SphereGeometry(1, 10, 8), hud, L / 2, 0, 0); m.scale.set(L * 0.66, r, r); seg.add(m);
      if (k > 0) seg.add(mesh(new THREE.SphereGeometry(r * 0.38, 8, 6), lys, L / 2, -r * 0.8, 0));   // sugekop
      far.add(seg); far = seg; led.push(seg);
    }
    u.tentakler.push(led);
  }
  u.mund = V(0.3, 0.02, 0);
  g.userData = u;
  return g;
}

// ---------- Krabben: skal, øjne på stilke, to klosakse og seks ben ----------
function byggKrabbe(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [], klo: [], ben: [], visDrej: -Math.PI / 2 };
  const skal = std(def.farve, { roughness: 0.4 }), lys = std(def.bug || "#ffb38a", { roughness: 0.5 });
  const krop = mesh(new THREE.SphereGeometry(1, 30, 16), skal); krop.scale.set(0.26, 0.15, 0.34); g.add(krop);
  const mave = mesh(new THREE.SphereGeometry(1, 20, 10), lys, 0, -0.04, 0); mave.scale.set(0.22, 0.1, 0.3); g.add(mave);
  for (const side of [1, -1]) {                        // øjne på stilke
    g.add(mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.16, 8), skal, 0.16, 0.18, side * 0.085));
    const e = øje(0.062); e.position.set(0.17, 0.28, side * 0.09);
    e.lookAt(e.position.clone().add(V(1, 0.25, side * 0.3))); g.add(e); u.pupiller.push(e.userData.pupil);
  }
  const smil = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), std("#3a1020"), 0.255, 0.02, 0);
  smil.rotation.set(0, Math.PI / 2, Math.PI); g.add(smil);
  for (const side of [1, -1]) {                        // klosakse
    const arm = new THREE.Group(); arm.position.set(0.12, 0.02, side * 0.3); arm.rotation.y = -side * 0.55;
    const over = mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.2, 8), skal, 0.1, 0, 0); over.rotation.z = -Math.PI / 2; arm.add(over);
    const hånd = new THREE.Group(); hånd.position.set(0.24, 0.03, 0); arm.add(hånd);
    const håndflade = mesh(new THREE.SphereGeometry(1, 16, 10), skal); håndflade.scale.set(0.09, 0.075, 0.065); hånd.add(håndflade);
    const fast = mesh(new THREE.ConeGeometry(0.035, 0.13, 8), skal, 0.12, -0.025, 0); fast.rotation.z = -Math.PI / 2 - 0.15; hånd.add(fast);
    const klo = new THREE.Group(); klo.position.set(0.05, 0.03, 0); hånd.add(klo);
    const øvre = mesh(new THREE.ConeGeometry(0.032, 0.13, 8), skal, 0.065, 0, 0); øvre.rotation.z = -Math.PI / 2 + 0.15; klo.add(øvre);
    g.add(arm); u.klo.push(klo);
  }
  for (const side of [1, -1]) for (let i = 0; i < 3; i++) {   // seks ben
    const ben = new THREE.Group(); ben.position.set(-0.03 - i * 0.09, -0.02, side * 0.27);
    const øvre = mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.16, 6), skal, 0, 0.04, side * 0.07); øvre.rotation.x = side * 1.05; ben.add(øvre);
    const nedre = mesh(new THREE.CylinderGeometry(0.012, 0.017, 0.21, 6), skal, 0, -0.02, side * 0.18); nedre.rotation.x = side * (Math.PI - 0.38); ben.add(nedre);
    ben.userData.fase = i * 2.1 + (side > 0 ? 0 : 1);
    g.add(ben); u.ben.push(ben);
  }
  u.mund = V(0.26, 0.02, 0);
  g.userData = u;
  return g;
}

// ---------- Søstjernen: fem bløde arme med prikker og et smil ----------
function byggSøstjerne(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [] };
  const form = new THREE.Shape(), N = 5;
  for (let i = 0; i <= N * 2; i++) {
    const a = Math.PI / 2 + i * Math.PI / N, r = i % 2 ? 0.15 : 0.38;
    if (i === 0) form.moveTo(Math.cos(a) * r, Math.sin(a) * r); else form.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(form, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.045, bevelSegments: 3 });
  geo.translate(0, 0, -0.025);
  const stjerne = new THREE.Group(); g.add(stjerne);
  stjerne.add(mesh(geo, std(def.farve, { roughness: 0.55 })));
  const pm = std(def.bug || "#ffe0e8", { roughness: 0.5 });
  for (let i = 0; i < N; i++) for (const r of [0.14, 0.22, 0.3]) {   // prikker ud ad armene
    const a = Math.PI / 2 + i * Math.PI * 2 / N, d = mesh(new THREE.SphereGeometry(0.022, 8, 6), pm, Math.cos(a) * r, Math.sin(a) * r, 0.07);
    d.scale.z = 0.4; stjerne.add(d);
  }
  for (const side of [1, -1]) {
    const e = øje(0.055); e.position.set(side * 0.055, 0.04, 0.085); stjerne.add(e); u.pupiller.push(e.userData.pupil);
  }
  const smil = mesh(new THREE.TorusGeometry(0.04, 0.011, 6, 12, Math.PI), std("#7a1030"), 0, -0.02, 0.085);
  smil.rotation.z = Math.PI; stjerne.add(smil);
  u.stjerne = stjerne;
  u.mund = V(0, 0.4, 0);
  g.userData = u;
  return g;
}

// ---------- Skattekisten: guldbeslag, et låg der åbner sig, og guld indeni ----------
function byggKiste(def) {
  const g = new THREE.Group(), u = { finner: [], pupiller: [], visDrej: -Math.PI / 2 + 0.4 };
  const træ = std(def.farve || "#8b5a2b", { roughness: 0.8 }), guld = std("#ffc83d", { metalness: 0.85, roughness: 0.25 });
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.3, 0.62), træ));
  for (const z of [-0.2, 0.2]) g.add(mesh(new THREE.BoxGeometry(0.42, 0.32, 0.045), guld, 0, 0, z));   // guldbånd
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.04, 0.64), guld, 0, 0.14, 0));
  const lås = mesh(new THREE.BoxGeometry(0.03, 0.09, 0.08), guld, 0.215, 0.08, 0); g.add(lås);
  g.add(mesh(new THREE.BoxGeometry(0.01, 0.035, 0.018), std("#2b1a0a"), 0.232, 0.07, 0));
  for (const side of [1, -1]) {                        // hanke
    const h = mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 14, Math.PI), guld, 0, 0.02, side * 0.325); h.rotation.x = side * Math.PI / 2; g.add(h);
  }
  // guld og ædelsten, der glimter i kisten
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.02, 0.56), new THREE.MeshStandardMaterial({ color: "#ffd84d", emissive: "#ffb000", emissiveIntensity: 0.9 }), 0, 0.155, 0));
  const mønt = new THREE.CylinderGeometry(0.035, 0.035, 0.01, 14);
  const møntGuld = std("#ffcf40", { metalness: 0.4, roughness: 0.3, emissive: "#a86a00", emissiveIntensity: 0.5 });
  for (let i = 0; i < 14; i++) {
    const m = mesh(mønt, møntGuld, (Math.random() - 0.5) * 0.3, 0.17 + Math.random() * 0.05, (Math.random() - 0.5) * 0.5);
    m.rotation.set(Math.random() - 0.5, 0, Math.random() - 0.5); g.add(m);
  }
  ["#e63946", "#3a86ff", "#06d6a0", "#b15bff"].forEach((farve, i) =>
    g.add(mesh(new THREE.OctahedronGeometry(0.035), std(farve, { roughness: 0.1, metalness: 0.3 }), -0.08 + i * 0.05, 0.2, -0.18 + i * 0.12)));
  const hængsel = new THREE.Group(); hængsel.position.set(-0.2, 0.16, 0); g.add(hængsel);     // låget drejer om bagkanten
  const lågGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.62, 18, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2);
  hængsel.add(mesh(lågGeo, træ, 0.2, 0, 0));
  for (const z of [-0.2, 0.2]) {
    const b = mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.045, 18, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), std("#ffc83d", { metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide }), 0.2, 0, z);
    hængsel.add(b);
  }
  hængsel.rotation.z = 0.5;
  u.låg = hængsel;
  const tang = new THREE.CatmullRomCurve3([V(0.21, -0.14, -0.25), V(0.23, 0.02, -0.12), V(0.21, 0.1, 0.05), V(0.18, 0.2, 0.2)]);
  g.add(mesh(new THREE.TubeGeometry(tang, 16, 0.016, 6), std("#3f9b3f")));
  u.mund = V(0.22, 0.08, 0);
  g.userData = u;
  return g;
}

// Små bevægelser: hale, finner, vrikkeøjne, lygte og disko-lys
export function animerFisk(f, t, fart = 1) {
  const u = f.userData;
  if (u.hale) u.hale.rotation.y = Math.sin(t * 8 * fart) * 0.5;
  for (const fi of u.finner || []) fi.rotation.x = fi.userData.side * (0.2 + Math.sin(t * 6 * fart) * 0.35);
  for (const p of u.pupiller || []) {
    const r = p.userData.r;
    p.position.x = Math.sin(t * 2.7 + r * 50) * r * 0.16;
    p.position.y = Math.cos(t * 2.1 + r * 80) * r * 0.16;
  }
  if (u.lygte) u.lygte.emissiveIntensity = 1.6 + Math.sin(t * 5) * 1.1;
  if (u.disko) u.disko.emissive.setHSL((t * 0.4) % 1, 0.9, 0.18);
  if (u.guld) u.guld.emissiveIntensity = 0.7 + Math.sin(t * 4) * 0.3;          // guldet glimter
  if (u.lava) u.lava.emissiveIntensity = 0.25 + Math.sin(t * 3) * 0.15;         // lavaen gløder
  if (u.spøgelse) u.spøgelse.opacity = 0.45 + Math.sin(t * 2) * 0.15;           // spøgelset blinker
  if (u.sprøjt) u.sprøjt.children.forEach((d, i, alle) => {                       // hvalens vandsprøjt
    const k = (t * 1.6 + i / alle.length) % 1;
    d.position.set(Math.sin(i * 2.4) * k * 0.13, k * 0.45, Math.cos(i * 2.4) * k * 0.13);
    d.scale.setScalar(1 - k * 0.6);
  });
  if (u.kappe) {                                                                 // kappen blafrer
    const p = u.kappe.geometry.attributes.position, x0 = u.kappe.userData.x0;
    for (let i = 0; i < p.count; i++) { const x = x0[i * 3]; p.setY(i, x0[i * 3 + 1] + Math.sin(t * 9 * fart + x * 12) * 0.05 * (-x / 0.62)); }
    p.needsUpdate = true;
  }
  for (const [i, arm] of (u.tentakler || []).entries())                          // blækspruttens arme
    arm.forEach((seg, j) => { seg.rotation.z = seg.userData.basis + Math.sin(t * 3 * fart + i * 0.8 + j * 0.6) * 0.2; });
  for (const k of u.klo || []) k.rotation.z = Math.max(0, Math.sin(t * 5 * fart)) * 0.5;   // knib knib
  for (const b of u.ben || []) b.rotation.y = Math.sin(t * 10 * fart + b.userData.fase) * 0.25;
  if (u.låg) u.låg.rotation.z = 0.45 + Math.sin(t * 2) * 0.2;                     // kistelåget vipper
  if (u.stjerne) u.stjerne.rotation.z = Math.sin(t * 1.5) * 0.15;
}

// Frigør grafikhukommelse når en fisk (eller stang) ikke skal bruges mere
export function rydOp(o) {
  o.traverse(c => {
    if (c.userData.delt) return;                              // formerne fra Blender deles med andre ting
    if (c.geometry) c.geometry.dispose();
    if (c.material) [].concat(c.material).forEach(m => m.dispose());
  });
}
