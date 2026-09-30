// ===== Mærkelige dyr i Broekraft =====
// Tilføj et nyt dyr: kopiér en blok i DYR og byg det af klodser.
// Mål er i "pixels" ligesom i Minecraft: 16 pixels = 1 blok. y = 0 er jorden, +z er forrest (næsen).
//  del:   { s: [bredde, højde, dybde], p: [x, y, z] = klodsens midte, f: farve, rolle, børn: [flere dele] }
//  rolle: "ben" (svinger når dyret går) · "hoved" (kigger på dig) · "vinge" (basker) · "hale" (logrer)
//         "arm" (zombie-arme) · "flamme" (vises kun når turbosneglen drøner af sted) · "rul" (triller rundt)
//  regnbue: true = klodsen skifter farve · lys: true = lyser selv · gennemsigtig: 0.8 = lidt gennemsigtig
//  glød:  true = dyret lyser grønt og drysser små, grønne gnister (NUKE-banen) · "ild" = orange gnister
//  evne:  "flyver" | "hopper" | "turbo" | "flagrer" (falder langsomt) | "zombie" (følger efter dig) | "svæver"
//         "svømmer" (svømmer rundt i sin egen højde over havbunden) · "ruller" (triller med vinden)
//         "jæger" (spurter efter dig og skubber — se skyd.js) · liv: hvor mange skud der skal til (standard 1)
//  klap:  "puf" = dyret forsvinder i konfetti og bliver til en blomst når man trykker på det
//         slag: hvor mange tryk der skal til, før det siger puf (standard 1)
//  skala: gør hele dyret større/mindre · fart: blokke pr. sekund · ride: man kan ride på det (se listen under DYR)
//  lyd:   "muh" | "øf" | "mæh" | "kluk" | "kvæk" | "rap" | "wiii" | "uuuh" | "buuh" | "boing" | "bipbop" | "pip" | "rawr"
//  æg:    to farver til dyre-ægget

import * as THREE from "./three.js";
import * as Lyd from "./lyd.js";

// To øjne: hvid klods med sort pupil, set forfra
const øjne = (x, y, z, str = 2) => [-1, 1].flatMap(s => [
  { s: [str, str, 0.4], p: [s * x, y, z], f: "#ffffff" },
  { s: [str / 2, str / 2, 0.5], p: [s * x - s * str / 4, y - str / 4, z + 0.1], f: "#1a1a1a" },
]);
const fireBen = (s, x, y, z, f) => [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]].map(([a, b, fase]) =>
  ({ s, p: [a * x, y, b * z], f, rolle: "ben", fase }));

export const DYR = [
  { id: "ko", navn: "Prikkeko", lyd: "muh", fart: 1.2, æg: ["#ff9ecb", "#ffffff"], dele: [
    { s: [12, 10, 18], p: [0, 17, 0], f: "#ff9ecb" },
    { s: [12.4, 4, 5], p: [0, 19, 3], f: "#ffffff" },
    { s: [12.4, 5, 4], p: [0, 15, -5], f: "#ffffff" },
    { s: [6, 10.4, 5], p: [2, 17, -1], f: "#ffffff" },
    ...fireBen([4, 12, 4], 4, 6, 6.5, "#f27fb3"),
    { s: [1, 8, 1], p: [0, 17, -9.5], f: "#f27fb3", rolle: "hale" },
    { s: [8, 8, 6], p: [0, 21, 12], f: "#ff9ecb", rolle: "hoved", børn: [
      { s: [6, 3, 1], p: [0, 18, 15.5], f: "#ffd1e6" },
      { s: [1, 3, 1], p: [-3.5, 26.5, 12], f: "#fff5cc" }, { s: [1, 3, 1], p: [3.5, 26.5, 12], f: "#fff5cc" },
      ...øjne(2.5, 22, 15.1),
    ] },
  ] },
  { id: "gris", navn: "Flyvegris", lyd: "øf", fart: 1.4, evne: "flyver", æg: ["#f8a5c2", "#ffffff"], dele: [
    { s: [10, 8, 14], p: [0, 10, 0], f: "#f8a5c2" },
    ...fireBen([4, 6, 4], 3, 3, 4.5, "#f28bb0"),
    { s: [8, 1, 6], p: [-9, 13, 0], f: "#ffffff", rolle: "vinge" },
    { s: [8, 1, 6], p: [9, 13, 0], f: "#ffffff", rolle: "vinge" },
    { s: [1, 1, 3], p: [0, 12, -8], f: "#f28bb0", rolle: "hale" },
    { s: [8, 8, 8], p: [0, 12, 10], f: "#f8a5c2", rolle: "hoved", børn: [
      { s: [4, 3, 1], p: [0, 10.5, 14.5], f: "#f47fa9" },
      { s: [1, 1, 0.3], p: [-1, 10.5, 15.1], f: "#8a3050" }, { s: [1, 1, 0.3], p: [1, 10.5, 15.1], f: "#8a3050" },
      { s: [2, 2, 1], p: [-3, 17, 9], f: "#f28bb0" }, { s: [2, 2, 1], p: [3, 17, 9], f: "#f28bb0" },
      ...øjne(2, 13.5, 14.1),
    ] },
  ] },
  { id: "faar", navn: "Regnbuefår", lyd: "mæh", fart: 1.1, æg: ["#ffffff", "#ff7eb6"], dele: [
    { s: [11, 10, 14], p: [0, 14, 0], f: "#ffffff", regnbue: true },
    ...fireBen([3, 9, 3], 3, 4.5, 4.5, "#e8d7c8"),
    { s: [6, 6, 7], p: [0, 17, 9], f: "#f0dcc8", rolle: "hoved", børn: [
      { s: [7, 3, 5], p: [0, 20.5, 8], f: "#ffffff", regnbue: true },
      { s: [2, 1, 0.3], p: [0, 15.5, 12.6], f: "#c08080" },
      ...øjne(1.5, 17.5, 12.6),
    ] },
  ] },
  { id: "hone", navn: "Hattehøne", lyd: "kluk", fart: 1.3, evne: "flagrer", æg: ["#ffffff", "#e03a3a"], dele: [
    { s: [6, 6, 8], p: [0, 7, 0], f: "#ffffff" },
    { s: [1, 4, 1], p: [-1.5, 2, 0], f: "#f5b22a", rolle: "ben", fase: 0 },
    { s: [1, 4, 1], p: [1.5, 2, 0], f: "#f5b22a", rolle: "ben", fase: Math.PI },
    { s: [1, 4, 6], p: [-3.5, 8, 0], f: "#f2f2f2", rolle: "vinge" },
    { s: [1, 4, 6], p: [3.5, 8, 0], f: "#f2f2f2", rolle: "vinge" },
    { s: [4, 4, 2], p: [0, 10, -4.5], f: "#f2f2f2", rolle: "hale" },
    { s: [4, 6, 3], p: [0, 12, 4], f: "#ffffff", rolle: "hoved", børn: [
      { s: [4, 2, 2], p: [0, 12, 6.5], f: "#f5a623" },
      { s: [2, 2, 2], p: [0, 10, 6], f: "#e03a3a" },
      { s: [6, 1, 6], p: [0, 15.5, 4], f: "#1b1b24" },
      { s: [4, 5, 4], p: [0, 18.5, 4], f: "#1b1b24" },
      { s: [4.2, 1, 4.2], p: [0, 16.8, 4], f: "#e03a3a" },
      ...øjne(1.5, 13.5, 5.6, 1.5),
    ] },
  ] },
  { id: "fro", navn: "Hoppefrø", lyd: "kvæk", fart: 2.4, evne: "hopper", æg: ["#5fd35f", "#2e8b2e"], dele: [
    { s: [8, 6, 8], p: [0, 4, 0], f: "#5fd35f" },
    { s: [6, 0.6, 0.3], p: [0, 3, 4.1], f: "#2e6b2e" },
    { s: [1.5, 1, 0.3], p: [-3, 4, 4.1], f: "#ff9ecb" }, { s: [1.5, 1, 0.3], p: [3, 4, 4.1], f: "#ff9ecb" },
    { s: [3, 2, 4], p: [-4, 1, -2], f: "#4cb74c", rolle: "ben", fase: 0 },
    { s: [3, 2, 4], p: [4, 1, -2], f: "#4cb74c", rolle: "ben", fase: 0 },
    { s: [2, 2, 2], p: [-3, 1, 3], f: "#4cb74c", rolle: "ben", fase: Math.PI },
    { s: [2, 2, 2], p: [3, 1, 3], f: "#4cb74c", rolle: "ben", fase: Math.PI },
    { s: [8, 3, 3], p: [0, 8, 2.5], f: "#5fd35f", rolle: "hoved", børn: [
      { s: [3, 3, 3], p: [-2.5, 9, 2.5], f: "#5fd35f" }, { s: [3, 3, 3], p: [2.5, 9, 2.5], f: "#5fd35f" },
      ...øjne(2.5, 9.3, 4.1, 2.4),
    ] },
  ] },
  { id: "and", navn: "Giraf-and", lyd: "rap", fart: 1.2, evne: "flagrer", æg: ["#ffd23f", "#c47a1e"], dele: [
    { s: [6, 5, 8], p: [0, 5.5, -1], f: "#ffd23f" },
    { s: [1, 3, 1], p: [-1.5, 1.5, 0], f: "#ff8c1a", rolle: "ben", fase: 0 },
    { s: [1, 3, 1], p: [1.5, 1.5, 0], f: "#ff8c1a", rolle: "ben", fase: Math.PI },
    { s: [1, 3, 5], p: [-3.5, 6, -1], f: "#f5c518", rolle: "vinge" },
    { s: [1, 3, 5], p: [3.5, 6, -1], f: "#f5c518", rolle: "vinge" },
    { s: [2, 2, 2], p: [0, 7, -5.5], f: "#f5c518", rolle: "hale" },
    { s: [2, 14, 2], p: [0, 15, 2.5], f: "#ffd23f", rolle: "hoved", børn: [
      { s: [2.3, 2, 2.3], p: [0, 11, 2.5], f: "#c47a1e" }, { s: [2.3, 2, 2.3], p: [0, 16, 2.5], f: "#c47a1e" },
      { s: [4, 4, 5], p: [0, 23, 3.5], f: "#ffd23f" },
      { s: [3, 1, 3], p: [0, 22, 7.5], f: "#ff8c1a" },
      { s: [0.6, 2, 0.6], p: [-1, 26, 2.5], f: "#c47a1e" }, { s: [0.6, 2, 0.6], p: [1, 26, 2.5], f: "#c47a1e" },
      ...øjne(1.5, 24, 6.1, 1.5),
    ] },
  ] },
  { id: "snegl", navn: "Turbosnegl", lyd: "wiii", fart: 0.5, evne: "turbo", æg: ["#9ad16b", "#e8891c"], dele: [
    { s: [4, 3, 14], p: [0, 1.5, 1], f: "#b8d98a" },
    { s: [8, 8, 8], p: [0, 7, -1], f: "#e8891c" },
    { s: [8.2, 4, 4], p: [0, 7, -1], f: "#b35f10" },
    { s: [4, 4, 8.2], p: [0, 7, -1], f: "#f5b25a" },
    { s: [3, 3, 7], p: [0, 12.5, -2], f: "#cfd6e0" },
    { s: [3.4, 3.4, 1], p: [0, 12.5, 1.5], f: "#e03a3a" },
    { s: [1, 2, 2], p: [-2, 12, -5], f: "#e03a3a" }, { s: [1, 2, 2], p: [2, 12, -5], f: "#e03a3a" },
    { s: [2, 2, 3], p: [0, 12.5, -7], f: "#ffb020", rolle: "flamme" },
    { s: [4, 1, 1], p: [0, 3, 7.5], f: "#b8d98a", rolle: "hoved", børn: [
      { s: [1, 4, 1], p: [-1, 5, 7], f: "#b8d98a" }, { s: [1, 4, 1], p: [1, 5, 7], f: "#b8d98a" },
      { s: [1.6, 1.6, 1.6], p: [-1, 7.5, 7], f: "#1a1a1a" }, { s: [1.6, 1.6, 1.6], p: [1, 7.5, 7], f: "#1a1a1a" },
    ] },
  ] },

  // ---------- Zombieverdenen ----------
  { id: "zombie", navn: "Fjollet zombie", lyd: "uuuh", fart: 0.9, evne: "zombie", klap: "puf", skala: 0.8, æg: ["#5fae4f", "#3a4fb0"], dele: [
    { s: [8, 12, 4], p: [0, 18, 0], f: "#3fa0a0" },
    { s: [4, 12, 4], p: [-2, 6, 0], f: "#3a4fb0", rolle: "ben", fase: 0 },
    { s: [4, 12, 4], p: [2, 6, 0], f: "#3a4fb0", rolle: "ben", fase: Math.PI },
    { s: [4, 4, 12], p: [-6, 22, 4], f: "#5fae4f", rolle: "arm" },
    { s: [4, 4, 12], p: [6, 22, 4], f: "#5fae4f", rolle: "arm" },
    { s: [8, 8, 8], p: [0, 28, 0], f: "#5fae4f", rolle: "hoved", børn: [
      { s: [3, 3, 0.4], p: [-2, 29, 4.1], f: "#ffffff" }, { s: [1.5, 1.5, 0.5], p: [-2, 28.5, 4.2], f: "#1a1a1a" },
      { s: [2, 2, 0.4], p: [2.2, 29, 4.1], f: "#ffffff" }, { s: [1, 1, 0.5], p: [2.4, 28.8, 4.2], f: "#1a1a1a" },
      { s: [4, 1, 0.4], p: [0, 25.5, 4.1], f: "#2a4a2a" },
      { s: [2, 1.5, 1], p: [0.8, 24.8, 4.4], f: "#ff7eb6" },
      { s: [1, 3, 1], p: [0, 33.5, 0], f: "#3f9b35" },
      { s: [3, 3, 1], p: [0, 36, 0], f: "#ff7eb6" }, { s: [1, 1, 1.2], p: [0, 36, 0], f: "#ffd23f" },
    ] },
  ] },
  { id: "zombiehone", navn: "Zombiehøne", lyd: "kluk", fart: 1.2, evne: "flagrer", klap: "puf", æg: ["#9fd08a", "#ffffff"], dele: [
    { s: [6, 6, 8], p: [0, 7, 0], f: "#9fd08a" },
    { s: [1, 4, 1], p: [-1.5, 2, 0], f: "#f5b22a", rolle: "ben", fase: 0 },
    { s: [1, 4, 1], p: [1.5, 2, 0], f: "#f5b22a", rolle: "ben", fase: Math.PI },
    { s: [1, 4, 6], p: [-3.5, 8, 0], f: "#8ac077", rolle: "vinge" },
    { s: [1, 4, 6], p: [3.5, 8, 0], f: "#8ac077", rolle: "vinge" },
    { s: [4, 4, 2], p: [0, 10, -4.5], f: "#8ac077", rolle: "hale" },
    { s: [4, 6, 3], p: [0, 12, 4], f: "#9fd08a", rolle: "hoved", børn: [
      { s: [4, 2, 2], p: [0, 12, 6.5], f: "#f5a623" },
      { s: [4.4, 1.2, 3.4], p: [0, 14.2, 4], f: "#ffffff" },
      { s: [2, 2, 2], p: [0, 16, 4], f: "#e03a3a" },
      ...øjne(1.5, 13, 5.6, 1.5),
    ] },
  ] },
  { id: "spogelse", navn: "Venligt spøgelse", lyd: "buuh", fart: 1.0, evne: "svæver", klap: "puf", æg: ["#ffffff", "#b0b0ff"], dele: [
    { s: [3, 3, 3], p: [-3.5, 1.5, -3], f: "#f4f4ff", gennemsigtig: 0.8, rolle: "ben", fase: 0 },
    { s: [3, 3, 3], p: [3.5, 1.5, -3], f: "#f4f4ff", gennemsigtig: 0.8, rolle: "ben", fase: Math.PI },
    { s: [3, 3, 3], p: [-3.5, 1.5, 3], f: "#f4f4ff", gennemsigtig: 0.8, rolle: "ben", fase: Math.PI },
    { s: [3, 3, 3], p: [3.5, 1.5, 3], f: "#f4f4ff", gennemsigtig: 0.8, rolle: "ben", fase: 0 },
    { s: [3, 5, 3], p: [-6.5, 9, 1], f: "#f4f4ff", gennemsigtig: 0.8, rolle: "vinge" },
    { s: [3, 5, 3], p: [6.5, 9, 1], f: "#f4f4ff", gennemsigtig: 0.8, rolle: "vinge" },
    { s: [10, 12, 10], p: [0, 9, 0], f: "#f4f4ff", gennemsigtig: 0.8, rolle: "hoved", børn: [
      { s: [2, 3, 0.4], p: [-2, 11, 5.1], f: "#1a1a2a" }, { s: [2, 3, 0.4], p: [2, 11, 5.1], f: "#1a1a2a" },
      { s: [0.8, 0.8, 0.5], p: [-2.4, 11.8, 5.2], f: "#ffffff" }, { s: [0.8, 0.8, 0.5], p: [1.6, 11.8, 5.2], f: "#ffffff" },
      { s: [2, 2, 0.4], p: [0, 7.5, 5.1], f: "#1a1a2a" },
      { s: [2, 1, 0.4], p: [-3.8, 9, 5.1], f: "#ffb0c8" }, { s: [2, 1, 0.4], p: [3.8, 9, 5.1], f: "#ffb0c8" },
    ] },
  ] },

  // ---------- Svampeverdenen ----------
  { id: "svampeko", navn: "Svampeko", lyd: "muh", fart: 1.1, æg: ["#d9232e", "#ffffff"], dele: [
    { s: [12, 10, 18], p: [0, 17, 0], f: "#d9232e" },
    { s: [12.4, 4, 5], p: [0, 19, 4], f: "#ffffff" },
    { s: [12.4, 5, 4], p: [0, 15, -5], f: "#ffffff" },
    ...fireBen([4, 12, 4], 4, 6, 6.5, "#c9b8b0"),
    { s: [1, 3, 1], p: [-3, 23.5, -4], f: "#efe6d2" }, { s: [4, 1.5, 4], p: [-3, 25.5, -4], f: "#d9232e" },
    { s: [1, 3, 1], p: [3, 23.5, 2], f: "#efe6d2" }, { s: [4, 1.5, 4], p: [3, 25.5, 2], f: "#d9232e" },
    { s: [1, 3, 1], p: [-2, 23.5, 5], f: "#efe6d2" }, { s: [3, 1.2, 3], p: [-2, 25.2, 5], f: "#3a7be0" },
    { s: [1, 8, 1], p: [0, 17, -9.5], f: "#c9b8b0", rolle: "hale" },
    { s: [8, 8, 6], p: [0, 21, 12], f: "#d9232e", rolle: "hoved", børn: [
      { s: [6, 3, 1], p: [0, 18, 15.5], f: "#ffd1d6" },
      { s: [1, 3, 1], p: [-3.5, 26.5, 12], f: "#efe6d2" }, { s: [1, 3, 1], p: [3.5, 26.5, 12], f: "#efe6d2" },
      ...øjne(2.5, 22, 15.1),
    ] },
  ] },
  { id: "hoppesvamp", navn: "Hoppesvamp", lyd: "boing", fart: 2.2, evne: "hopper", æg: ["#e03a3a", "#ffffff"], dele: [
    { s: [2, 1, 3], p: [-1.5, 0.5, 0.5], f: "#d9cdb0", rolle: "ben", fase: 0 },
    { s: [2, 1, 3], p: [1.5, 0.5, 0.5], f: "#d9cdb0", rolle: "ben", fase: Math.PI },
    { s: [6, 7, 6], p: [0, 4.5, 0], f: "#efe6d2", rolle: "hoved", børn: [
      ...øjne(1.5, 6, 3.1, 1.6),
      { s: [2.4, 0.7, 0.3], p: [0, 3.5, 3.1], f: "#d9476b" },
      { s: [1.2, 0.8, 0.3], p: [-2.2, 4.3, 3.1], f: "#ffb0c8" }, { s: [1.2, 0.8, 0.3], p: [2.2, 4.3, 3.1], f: "#ffb0c8" },
      { s: [12, 4, 12], p: [0, 10, 0], f: "#e03a3a" },
      { s: [2.4, 0.4, 2.4], p: [-3, 12.1, -2], f: "#ffffff" }, { s: [2, 0.4, 2], p: [3, 12.1, 2], f: "#ffffff" },
      { s: [1.6, 0.4, 1.6], p: [0, 12.1, 0], f: "#ffffff" },
      { s: [0.4, 2, 2], p: [6.1, 10, 1], f: "#ffffff" }, { s: [0.4, 2, 2], p: [-6.1, 10, -1], f: "#ffffff" },
      { s: [2, 2, 0.4], p: [2, 10, 6.1], f: "#ffffff" },
    ] },
  ] },

  // ---------- Ostemånen ----------
  { id: "rumvaesen", navn: "Rumvæsen", lyd: "bipbop", fart: 1.5, evne: "hopper", æg: ["#7ee08a", "#b98cff"], dele: [
    { s: [6, 8, 4], p: [0, 8, 0], f: "#7ee08a" },
    { s: [2, 4, 2], p: [-1.5, 2, 0], f: "#5fc06f", rolle: "ben", fase: 0 },
    { s: [2, 4, 2], p: [1.5, 2, 0], f: "#5fc06f", rolle: "ben", fase: Math.PI },
    { s: [2, 6, 2], p: [-4, 8, 0], f: "#5fc06f", rolle: "vinge" },
    { s: [2, 6, 2], p: [4, 8, 0], f: "#5fc06f", rolle: "vinge" },
    { s: [10, 8, 8], p: [0, 16, 0], f: "#7ee08a", rolle: "hoved", børn: [
      { s: [2.5, 2.5, 0.4], p: [-3, 17, 4.1], f: "#1a1a2a" }, { s: [2.5, 2.5, 0.4], p: [3, 17, 4.1], f: "#1a1a2a" },
      { s: [2.5, 2.5, 0.4], p: [0, 19.2, 4.1], f: "#1a1a2a" },
      { s: [0.8, 0.8, 0.5], p: [-3.5, 17.6, 4.2], f: "#ffffff" }, { s: [0.8, 0.8, 0.5], p: [2.5, 17.6, 4.2], f: "#ffffff" },
      { s: [0.8, 0.8, 0.5], p: [-0.5, 19.8, 4.2], f: "#ffffff" },
      { s: [3, 0.6, 0.3], p: [0, 13.5, 4.1], f: "#2e6b2e" },
      { s: [0.8, 4, 0.8], p: [0, 22, 0], f: "#5fc06f" },
      { s: [2, 2, 2], p: [0, 25, 0], f: "#ffe066", lys: true },
    ] },
  ] },
  { id: "ostemus", navn: "Ostemus", lyd: "pip", fart: 2.6, æg: ["#b0b0b8", "#ff9ecb"], dele: [
    { s: [5, 4, 8], p: [0, 3, 0], f: "#b0b0b8" },
    ...fireBen([1, 1, 1], 1.8, 0.5, 2.5, "#ff9ecb"),
    { s: [0.6, 0.6, 8], p: [0, 3, -8], f: "#ff9ecb", rolle: "hale" },
    { s: [4, 4, 4], p: [0, 4, 5.5], f: "#b0b0b8", rolle: "hoved", børn: [
      { s: [3, 3, 0.6], p: [-2, 7.5, 5], f: "#ff9ecb" }, { s: [3, 3, 0.6], p: [2, 7.5, 5], f: "#ff9ecb" },
      { s: [1, 1, 1], p: [0, 4, 7.6], f: "#ff6f91" },
      ...øjne(1.1, 5, 7.6, 1.2),
      { s: [3, 0.2, 0.2], p: [-2, 3.8, 7.5], f: "#ffffff" }, { s: [3, 0.2, 0.2], p: [2, 3.8, 7.5], f: "#ffffff" },
      { s: [3, 2, 2], p: [0, 2.5, 8.6], f: "#ffcf3f" },
    ] },
  ] },
  // Fyrværkeri-verdenen: en pingvin, der vralter og basker med vingerne
  { id: "pingvin", navn: "Pingvin", lyd: "pip", fart: 0.9, æg: ["#1f2a3a", "#ffffff"], dele: [
    { s: [8, 12, 7], p: [0, 9, 0], f: "#1f2a3a" },
    { s: [6, 9, 1], p: [0, 8, 3.6], f: "#ffffff" },
    { s: [3, 1.5, 4], p: [-2, 0.75, 1], f: "#ff8c1a", rolle: "ben", fase: 0 },
    { s: [3, 1.5, 4], p: [2, 0.75, 1], f: "#ff8c1a", rolle: "ben", fase: Math.PI },
    { s: [1, 7, 4], p: [-4.5, 10, 0], f: "#1f2a3a", rolle: "vinge" },
    { s: [1, 7, 4], p: [4.5, 10, 0], f: "#1f2a3a", rolle: "vinge" },
    { s: [7, 6, 6], p: [0, 18, 0], f: "#1f2a3a", rolle: "hoved", børn: [
      { s: [5, 3, 1], p: [0, 17.5, 3.1], f: "#ffffff" },
      ...øjne(1.5, 19, 3.1, 1.6),
      { s: [2, 1.5, 2.5], p: [0, 17, 4], f: "#ff8c1a" },
    ] },
  ] },
  // Fyrværkeri-verdenen: et rensdyr med gevir og en rød mule, der lyser
  { id: "rensdyr", navn: "Rensdyr", lyd: "muh", fart: 1.3, æg: ["#8a5a2b", "#ff2a2a"], dele: [
    { s: [9, 9, 16], p: [0, 16, 0], f: "#8a5a2b" },
    { s: [9.2, 3, 8], p: [0, 13, 1], f: "#d8c3a0" },
    ...fireBen([3, 12, 3], 3, 6, 6, "#6b4220"),
    { s: [2, 3, 2], p: [0, 18, -8.5], f: "#f2e6d0", rolle: "hale" },
    { s: [4, 6, 4], p: [0, 20, 8], f: "#8a5a2b" },
    { s: [6, 7, 8], p: [0, 23, 11], f: "#8a5a2b", rolle: "hoved", børn: [
      ...øjne(2, 25, 15.1, 1.8),
      { s: [2.4, 2.4, 1.5], p: [0, 22, 15.6], f: "#ff2a2a", lys: true },
      { s: [1, 6, 1], p: [-2.5, 30, 10], f: "#d8b88a" }, { s: [1, 6, 1], p: [2.5, 30, 10], f: "#d8b88a" },
      { s: [4, 1, 1], p: [-4, 31, 10], f: "#d8b88a" }, { s: [4, 1, 1], p: [4, 31, 10], f: "#d8b88a" },
      { s: [1, 3, 1], p: [-5.5, 32.5, 10], f: "#d8b88a" }, { s: [1, 3, 1], p: [5.5, 32.5, 10], f: "#d8b88a" },
    ] },
  ] },
  // Skydebanen: en hurtig turbo-dino, der spurter efter dig og skubber dig omkuld — man skal ramme den to gange
  { id: "dino", navn: "Turbo-dino", lyd: "rawr", fart: 6, evne: "jæger", klap: "puf", liv: 2, æg: ["#5fd35f", "#ffd23f"], dele: [
    { s: [8, 9, 14], p: [0, 15, 0], f: "#5fd35f" },
    { s: [8.4, 3, 10], p: [0, 18.5, -1], f: "#3a9a3a" },
    { s: [6, 3, 10], p: [0, 11, 1], f: "#d8f5a0" },
    { s: [4, 4, 14], p: [0, 16, -13], f: "#5fd35f", rolle: "hale" },
    { s: [3, 10, 4], p: [-3, 5, 0], f: "#4cbf4c", rolle: "ben", fase: 0 },
    { s: [3, 10, 4], p: [3, 5, 0], f: "#4cbf4c", rolle: "ben", fase: Math.PI },
    { s: [1.5, 4, 1.5], p: [-3, 13, 7], f: "#4cbf4c" }, { s: [1.5, 4, 1.5], p: [3, 13, 7], f: "#4cbf4c" },
    { s: [7, 7, 10], p: [0, 22, 9], f: "#5fd35f", rolle: "hoved", børn: [
      ...øjne(2, 24, 14.1, 2.4),
      { s: [6, 1.5, 0.4], p: [0, 20, 14.1], f: "#2a4a2a" },
      { s: [1, 1, 0.5], p: [-2, 19.5, 14.2], f: "#ffffff" }, { s: [1, 1, 0.5], p: [2, 19.5, 14.2], f: "#ffffff" },
      { s: [2, 2, 3], p: [0, 26, 7], f: "#ffd23f" },
    ] },
  ] },
  // Skydebanen: en legetøjsrobot, der går efter dig og danser — rammer man den, bliver den til konfetti
  { id: "robot", navn: "Legetøjsrobot", lyd: "bipbop", fart: 1.1, evne: "zombie", klap: "puf", skala: 0.85, æg: ["#9aa8b8", "#ffd23f"], dele: [
    { s: [3, 8, 3], p: [-2.5, 4, 0], f: "#5a6a7a", rolle: "ben", fase: 0 },
    { s: [3, 8, 3], p: [2.5, 4, 0], f: "#5a6a7a", rolle: "ben", fase: Math.PI },
    { s: [10, 9, 6], p: [0, 12.5, 0], f: "#9aa8b8" },
    { s: [4, 3, 0.4], p: [0, 13.5, 3.1], f: "#ffd23f", lys: true },
    { s: [2.5, 2.5, 7], p: [-6.5, 14, 3], f: "#7a8a9a", rolle: "arm" },
    { s: [2.5, 2.5, 7], p: [6.5, 14, 3], f: "#7a8a9a", rolle: "arm" },
    { s: [8, 7, 7], p: [0, 20.5, 0], f: "#b8c4d2", rolle: "hoved", børn: [
      { s: [2, 2, 0.4], p: [-2, 21, 3.6], f: "#5ff0ff", lys: true }, { s: [2, 2, 0.4], p: [2, 21, 3.6], f: "#5ff0ff", lys: true },
      { s: [4, 1, 0.4], p: [0, 18.5, 3.6], f: "#2a2a2a" },
      { s: [1, 4, 1], p: [0, 25.5, 0], f: "#5a6a7a" }, { s: [2, 2, 2], p: [0, 28, 0], f: "#ff3b30", lys: true },
    ] },
  ] },
  // Underverdenen: en lille, hoppende lavaklump med glødende striber
  { id: "lavaklump", navn: "Lavaklump", lyd: "boing", fart: 2.2, evne: "hopper", æg: ["#3a1208", "#ff7a1a"], dele: [
    { s: [2, 1, 3], p: [-2.5, 0.5, 0.5], f: "#2a0c06", rolle: "ben", fase: 0 },
    { s: [2, 1, 3], p: [2.5, 0.5, 0.5], f: "#2a0c06", rolle: "ben", fase: Math.PI },
    { s: [10, 9, 10], p: [0, 5.5, 0], f: "#3a1208", rolle: "hoved", børn: [
      { s: [10.3, 1, 10.3], p: [0, 3.5, 0], f: "#ff7a1a", lys: true },
      { s: [10.3, 1, 10.3], p: [0, 7.5, 0], f: "#ffb020", lys: true },
      { s: [2.4, 2.4, 0.4], p: [-2.5, 6, 5.1], f: "#ffe066", lys: true }, { s: [2.4, 2.4, 0.4], p: [2.5, 6, 5.1], f: "#ffe066", lys: true },
      { s: [1.2, 1.2, 0.5], p: [-2.5, 5.7, 5.2], f: "#2a0c06" }, { s: [1.2, 1.2, 0.5], p: [2.5, 5.7, 5.2], f: "#2a0c06" },
      { s: [3, 0.8, 0.4], p: [0, 2.2, 5.1], f: "#ff7a1a", lys: true },
    ] },
  ] },
  // Underverdenen: en venlig gris med guldkrone, der elsker at gå på opdagelse
  { id: "guldgris", navn: "Guldgris", lyd: "øf", fart: 1.3, æg: ["#f0a0a8", "#f5c542"], dele: [
    { s: [10, 8, 14], p: [0, 10, 0], f: "#f0a0a8" },
    { s: [10.4, 3, 6], p: [0, 11, 0], f: "#8a5a2b" },
    ...fireBen([4, 6, 4], 3, 3, 4.5, "#d88890"),
    { s: [1, 1, 3], p: [0, 12, -8], f: "#d88890", rolle: "hale" },
    { s: [8, 8, 8], p: [0, 13, 10], f: "#f0a0a8", rolle: "hoved", børn: [
      { s: [4, 3, 1], p: [0, 11.5, 14.5], f: "#e0808a" },
      { s: [1, 1, 0.3], p: [-1, 11.5, 15.1], f: "#8a3050" }, { s: [1, 1, 0.3], p: [1, 11.5, 15.1], f: "#8a3050" },
      { s: [1, 2, 1], p: [-2.5, 10, 14.5], f: "#fff3d0" }, { s: [1, 2, 1], p: [2.5, 10, 14.5], f: "#fff3d0" },
      { s: [2, 3, 1], p: [-4.5, 16, 9], f: "#e0808a" }, { s: [2, 3, 1], p: [4.5, 16, 9], f: "#e0808a" },
      ...øjne(2, 14.5, 14.1),
      { s: [7, 1.5, 7], p: [0, 17.8, 10], f: "#f5c542" },
      { s: [1.4, 2, 1.4], p: [-2.8, 19.5, 12.8], f: "#f5c542" }, { s: [1.4, 2, 1.4], p: [2.8, 19.5, 12.8], f: "#f5c542" },
      { s: [1.4, 2, 1.4], p: [0, 19.5, 12.8], f: "#f5c542" },
      { s: [1, 1, 0.4], p: [0, 18, 13.6], f: "#e03a3a", lys: true },
    ] },
  ] },
  // Brandmandsbyen: en dalmatiner med en lille brandhjelm
  { id: "dalmatiner", navn: "Brandhund", lyd: "vov", fart: 2, æg: ["#ffffff", "#1a1a1a"], dele: [
    { s: [7, 7, 13], p: [0, 10, 0], f: "#ffffff" },
    { s: [7.3, 2, 2], p: [0, 12, -3], f: "#1a1a1a" }, { s: [7.3, 2, 2], p: [0, 9, 2], f: "#1a1a1a" }, { s: [2, 7.3, 2], p: [1, 10, -1], f: "#1a1a1a" },
    { s: [7.3, 1.5, 1.5], p: [0, 8, -5], f: "#1a1a1a" },
    ...fireBen([2.5, 6, 2.5], 2.2, 3, 4.5, "#ffffff"),
    { s: [1, 1, 5], p: [0, 12.5, -8.5], f: "#ffffff", rolle: "hale" },
    { s: [6, 6, 7], p: [0, 15, 8], f: "#ffffff", rolle: "hoved", børn: [
      { s: [4, 3, 3], p: [0, 13.5, 12.5], f: "#ffffff" },
      { s: [1.6, 1.2, 0.5], p: [0, 14.6, 14.1], f: "#1a1a1a" },
      { s: [1.5, 0.4, 1.8], p: [0, 12, 13.4], f: "#ff7eb6" },
      { s: [1.5, 4, 2], p: [-3.6, 14.5, 7], f: "#1a1a1a" }, { s: [1.5, 4, 2], p: [3.6, 14.5, 7], f: "#1a1a1a" },
      ...øjne(1.6, 16, 11.6, 1.5),
      { s: [6.4, 1.6, 7], p: [0, 18.8, 8], f: "#e03a3a" }, { s: [7.2, 0.6, 8.2], p: [0, 18, 8.4], f: "#c82a20" },
      { s: [1.6, 1.6, 0.4], p: [0, 19, 11.6], f: "#ffd23f" },
    ] },
  ] },
  // Brandmandsbyen: en orange kat med striber
  { id: "kat", navn: "Kat", lyd: "mjav", fart: 1.5, æg: ["#f5a04a", "#ffffff"], dele: [
    { s: [5, 5, 10], p: [0, 7, 0], f: "#f5a04a" },
    { s: [5.2, 1, 1.5], p: [0, 8, -2], f: "#d9782a" }, { s: [5.2, 1, 1.5], p: [0, 8, 1.5], f: "#d9782a" },
    ...fireBen([2, 5, 2], 1.6, 2.5, 3.5, "#f5a04a"),
    { s: [1.2, 8, 1.2], p: [0, 12, -5.5], f: "#f5a04a", rolle: "hale" },
    { s: [6, 5, 5], p: [0, 10, 6], f: "#f5a04a", rolle: "hoved", børn: [
      { s: [1.8, 2, 1], p: [-2, 13.5, 6], f: "#f5a04a" }, { s: [1.8, 2, 1], p: [2, 13.5, 6], f: "#f5a04a" },
      { s: [1, 1, 1.1], p: [-2, 13.3, 6.1], f: "#ffb0c8" }, { s: [1, 1, 1.1], p: [2, 13.3, 6.1], f: "#ffb0c8" },
      { s: [3, 2, 1], p: [0, 8.5, 8.8], f: "#ffffff" },
      { s: [1, 0.8, 0.4], p: [0, 9.4, 9.4], f: "#ff7eb6" },
      ...øjne(1.5, 11, 8.6, 1.5),
      { s: [3, 0.2, 0.2], p: [-2.5, 9, 8.8], f: "#ffffff" }, { s: [3, 0.2, 0.2], p: [2.5, 9, 8.8], f: "#ffffff" },
    ] },
  ] },
  // Piratøen: en farvestrålende papegøje, der letter af og til
  { id: "papegoje", navn: "Papegøje", lyd: "kra", fart: 1.4, evne: "flyver", æg: ["#e03a3a", "#3a7be0"], dele: [
    { s: [5, 7, 6], p: [0, 7, 0], f: "#e03a3a" },
    { s: [1, 3, 1], p: [-1.2, 2, 0.5], f: "#5a5a5a", rolle: "ben", fase: 0 }, { s: [1, 3, 1], p: [1.2, 2, 0.5], f: "#5a5a5a", rolle: "ben", fase: Math.PI },
    { s: [1, 6, 6], p: [-3, 7.5, -0.5], f: "#3a7be0", rolle: "vinge" }, { s: [1, 6, 6], p: [3, 7.5, -0.5], f: "#3a7be0", rolle: "vinge" },
    { s: [1.2, 2, 5], p: [-3.1, 5.5, -1], f: "#ffd23f" }, { s: [1.2, 2, 5], p: [3.1, 5.5, -1], f: "#ffd23f" },
    { s: [3, 1, 8], p: [0, 4.5, -6], f: "#3a7be0", rolle: "hale" },
    { s: [5, 5, 5], p: [0, 12.5, 1.5], f: "#e03a3a", rolle: "hoved", børn: [
      { s: [2.4, 2.6, 2.4], p: [0, 11.5, 4.8], f: "#f2e6b0" }, { s: [1.6, 1.4, 1.2], p: [0, 10.2, 5.4], f: "#2a2a2a" },
      { s: [4.2, 2, 0.4], p: [0, 13, 4.1], f: "#ffffff" },
      ...øjne(1.3, 13, 4.2, 1.2),
    ] },
  ] },
  // Piratøen: en rød krabbe med klosakse, der vinker
  { id: "krabbe", navn: "Krabbe", lyd: "knips", fart: 1.8, æg: ["#e8502a", "#ffd9c8"], dele: [
    { s: [9, 3, 6], p: [0, 3, 0], f: "#e8502a" },
    { s: [9.2, 1, 6.2], p: [0, 4.2, 0], f: "#ff7a4a" },
    ...[-1, 1].flatMap(s => [-1.5, 0.5, 2.5].map((z, i) => ({ s: [1, 3, 1], p: [s * 4.2, 1.2, z - 1], f: "#c83a1a", rolle: "ben", fase: i * 2 + (s > 0 ? Math.PI : 0) }))),
    { s: [3, 3, 3], p: [-5, 4, 4], f: "#e8502a", rolle: "vinge" }, { s: [3, 3, 3], p: [5, 4, 4], f: "#e8502a", rolle: "vinge" },
    { s: [1.2, 3, 1.2], p: [-5.5, 4, 6], f: "#c83a1a" }, { s: [1.2, 3, 1.2], p: [5.5, 4, 6], f: "#c83a1a" },
    { s: [4, 3, 1], p: [0, 6, 2.5], f: "#e8502a", rolle: "hoved", børn: [
      { s: [0.8, 3, 0.8], p: [-1.5, 7, 2.5], f: "#c83a1a" }, { s: [0.8, 3, 0.8], p: [1.5, 7, 2.5], f: "#c83a1a" },
      { s: [1.8, 1.8, 1.8], p: [-1.5, 9, 2.5], f: "#ffffff" }, { s: [1.8, 1.8, 1.8], p: [1.5, 9, 2.5], f: "#ffffff" },
      { s: [1, 1, 0.4], p: [-1.5, 9, 3.5], f: "#1a1a1a" }, { s: [1, 1, 0.4], p: [1.5, 9, 3.5], f: "#1a1a1a" },
      { s: [2, 0.6, 0.4], p: [0, 4.8, 3.1], f: "#8a1a0a" },
    ] },
  ] },
  // Havbunden: en klovnfisk med hvide striber
  { id: "klovnfisk", navn: "Klovnfisk", lyd: "blub", fart: 1.8, evne: "svømmer", æg: ["#ff8c1a", "#ffffff"], dele: [
    { s: [3, 5, 9], p: [0, 4, 0], f: "#ff8c1a" },
    { s: [3.2, 5.2, 1.2], p: [0, 4, 1.5], f: "#ffffff" }, { s: [3.2, 4.6, 1.2], p: [0, 4, -2], f: "#ffffff" },
    { s: [0.8, 4, 3], p: [0, 4, -5.5], f: "#ff8c1a", rolle: "hale" },
    { s: [2.5, 1, 2.5], p: [-2, 3.5, 1], f: "#ff8c1a", rolle: "vinge" }, { s: [2.5, 1, 2.5], p: [2, 3.5, 1], f: "#ff8c1a", rolle: "vinge" },
    { s: [1, 2, 4], p: [0, 7, 0], f: "#ff8c1a" },
    { s: [3, 4, 2], p: [0, 4, 5.5], f: "#ff8c1a", rolle: "hoved", børn: [ ...øjne(1.2, 4.8, 6.6, 1.3), { s: [1.2, 0.6, 0.4], p: [0, 3, 6.6], f: "#1a1a1a" } ] },
  ] },
  // Havbunden: en blå fisk med gul hale
  { id: "blaafisk", navn: "Blåfisk", lyd: "blub", fart: 2, evne: "svømmer", æg: ["#3a6fe0", "#ffd23f"], dele: [
    { s: [3, 6, 9], p: [0, 4.5, 0], f: "#3a6fe0" },
    { s: [3.2, 2, 5], p: [0, 6.5, -1], f: "#1a3a8a" },
    { s: [0.8, 5, 3], p: [0, 4.5, -5.5], f: "#ffd23f", rolle: "hale" },
    { s: [2.5, 1, 2.5], p: [-2, 4, 1], f: "#5a8aff", rolle: "vinge" }, { s: [2.5, 1, 2.5], p: [2, 4, 1], f: "#5a8aff", rolle: "vinge" },
    { s: [3, 5, 2], p: [0, 4.5, 5.5], f: "#3a6fe0", rolle: "hoved", børn: [ ...øjne(1.2, 5.3, 6.6, 1.3), { s: [1.2, 0.6, 0.4], p: [0, 3.2, 6.6], f: "#1a1a1a" } ] },
  ] },
  // Havbunden: en havskildpadde, der padler langsomt af sted
  { id: "skildpadde", navn: "Havskildpadde", lyd: "blub", fart: 0.9, evne: "svømmer", æg: ["#5a8a3a", "#c8b070"], dele: [
    { s: [12, 5, 14], p: [0, 6, 0], f: "#6a8a3a" },
    { s: [9, 2, 11], p: [0, 9.5, 0], f: "#8aa84a" }, { s: [4, 1, 4], p: [0, 10.8, 0], f: "#a8c05a" },
    { s: [12.4, 2, 14.4], p: [0, 4, 0], f: "#d8c88a" },
    { s: [8, 1.5, 4], p: [-9, 5, 3], f: "#8ab06a", rolle: "vinge" }, { s: [8, 1.5, 4], p: [9, 5, 3], f: "#8ab06a", rolle: "vinge" },
    { s: [3, 1.5, 3], p: [-5, 4.5, -7], f: "#8ab06a", rolle: "ben", fase: 0 }, { s: [3, 1.5, 3], p: [5, 4.5, -7], f: "#8ab06a", rolle: "ben", fase: Math.PI },
    { s: [4, 4, 5], p: [0, 6, 9.5], f: "#8ab06a", rolle: "hoved", børn: [ ...øjne(1.4, 7, 12.1, 1.3), { s: [2, 0.5, 0.4], p: [0, 5, 12.1], f: "#3a4a2a" } ] },
  ] },
  // Havbunden: en lilla blæksprutte med otte arme, der svinger
  { id: "blaeksprutte", navn: "Blæksprutte", lyd: "blub", fart: 1, evne: "svømmer", æg: ["#b45aff", "#ffd0ff"], dele: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const v = i / 8 * Math.PI * 2; return { s: [1.4, 6, 1.4], p: [Math.cos(v) * 3, 3, Math.sin(v) * 3], f: "#9a4ae0", rolle: "ben", fase: i * 0.8 }; }),
    { s: [9, 10, 9], p: [0, 11, 0], f: "#b45aff", rolle: "hoved", børn: [
      ...øjne(2, 10, 4.6, 2.6),
      { s: [1.4, 1.4, 0.4], p: [-3, 13, 4.6], f: "#ffd0ff" }, { s: [1, 1, 0.4], p: [3, 14, 4.6], f: "#ffd0ff" },
      { s: [2, 1, 0.4], p: [0, 7.5, 4.6], f: "#5a1a8a" },
    ] },
  ] },
  // Havbunden: en stor, venlig hval, der synger dybt
  { id: "hval", navn: "Hval", lyd: "hval", fart: 1.1, evne: "svømmer", æg: ["#3a5a8a", "#dfe8f0"], dele: [
    { s: [18, 16, 34], p: [0, 12, 0], f: "#3a5a8a" },
    { s: [18.4, 5, 30], p: [0, 5.5, 2], f: "#dfe8f0" },
    { s: [12, 10, 12], p: [0, 12, -22], f: "#3a5a8a" },
    { s: [26, 2, 8], p: [0, 13, -30], f: "#2f4a74", rolle: "hale" },
    { s: [10, 2, 6], p: [-13, 8, 6], f: "#2f4a74", rolle: "vinge" }, { s: [10, 2, 6], p: [13, 8, 6], f: "#2f4a74", rolle: "vinge" },
    { s: [16, 14, 6], p: [0, 12, 19], f: "#3a5a8a", rolle: "hoved", børn: [
      ...øjne(6, 13, 22.1, 2.2),
      { s: [12, 1, 0.4], p: [0, 8, 22.1], f: "#1a2a44" },
      { s: [3, 1, 3], p: [0, 19.5, 15], f: "#2f4a74" },
    ] },
  ] },
  // Slikland: vingummibamser, man næsten kan se igennem — de hopper rundt
  { id: "gummibjorn", navn: "Rød vingummibamse", lyd: "boing", fart: 1.8, evne: "hopper", æg: ["#ff3b5c", "#ffffff"], dele: [
    { s: [2.5, 3, 3], p: [-2, 1.5, 0], f: "#d82a48", gennemsigtig: 0.85, rolle: "ben", fase: 0 }, { s: [2.5, 3, 3], p: [2, 1.5, 0], f: "#d82a48", gennemsigtig: 0.85, rolle: "ben", fase: Math.PI },
    { s: [7, 7, 6], p: [0, 6.5, 0], f: "#ff3b5c", gennemsigtig: 0.85 },
    { s: [3, 3, 0.4], p: [-1.2, 7.5, 3.1], f: "#ff9aaa", gennemsigtig: 0.7 },
    { s: [2, 4, 2], p: [-4.2, 7, 0.5], f: "#d82a48", gennemsigtig: 0.85, rolle: "vinge" }, { s: [2, 4, 2], p: [4.2, 7, 0.5], f: "#d82a48", gennemsigtig: 0.85, rolle: "vinge" },
    { s: [6, 5.5, 5], p: [0, 12.5, 0.5], f: "#ff3b5c", gennemsigtig: 0.85, rolle: "hoved", børn: [
      { s: [2, 2, 1.5], p: [-2.5, 15.8, 0.5], f: "#ff3b5c", gennemsigtig: 0.85 }, { s: [2, 2, 1.5], p: [2.5, 15.8, 0.5], f: "#ff3b5c", gennemsigtig: 0.85 },
      { s: [2.6, 1.8, 1.2], p: [0, 11.3, 3.4], f: "#ff9aaa", gennemsigtig: 0.85 },
      { s: [1, 0.8, 0.4], p: [0, 12, 4.1], f: "#1a1a1a" },
      ...øjne(1.4, 13.6, 3.1, 1.2),
    ] },
  ] },
  { id: "gummibjorngron", navn: "Grøn vingummibamse", lyd: "boing", fart: 1.8, evne: "hopper", æg: ["#3fd35a", "#ffffff"], dele: [
    { s: [2.5, 3, 3], p: [-2, 1.5, 0], f: "#2aa848", gennemsigtig: 0.85, rolle: "ben", fase: 0 }, { s: [2.5, 3, 3], p: [2, 1.5, 0], f: "#2aa848", gennemsigtig: 0.85, rolle: "ben", fase: Math.PI },
    { s: [7, 7, 6], p: [0, 6.5, 0], f: "#3fd35a", gennemsigtig: 0.85 },
    { s: [3, 3, 0.4], p: [-1.2, 7.5, 3.1], f: "#a8ffb0", gennemsigtig: 0.7 },
    { s: [2, 4, 2], p: [-4.2, 7, 0.5], f: "#2aa848", gennemsigtig: 0.85, rolle: "vinge" }, { s: [2, 4, 2], p: [4.2, 7, 0.5], f: "#2aa848", gennemsigtig: 0.85, rolle: "vinge" },
    { s: [6, 5.5, 5], p: [0, 12.5, 0.5], f: "#3fd35a", gennemsigtig: 0.85, rolle: "hoved", børn: [
      { s: [2, 2, 1.5], p: [-2.5, 15.8, 0.5], f: "#3fd35a", gennemsigtig: 0.85 }, { s: [2, 2, 1.5], p: [2.5, 15.8, 0.5], f: "#3fd35a", gennemsigtig: 0.85 },
      { s: [2.6, 1.8, 1.2], p: [0, 11.3, 3.4], f: "#a8ffb0", gennemsigtig: 0.85 },
      { s: [1, 0.8, 0.4], p: [0, 12, 4.1], f: "#1a1a1a" },
      ...øjne(1.4, 13.6, 3.1, 1.2),
    ] },
  ] },
  // Slikland: en hvid enhjørning med regnbuemanke og et gyldent horn
  { id: "enhjorning", navn: "Enhjørning", lyd: "vrinsk", fart: 1.6, æg: ["#ffffff", "#ff7eb6"], dele: [
    { s: [9, 9, 17], p: [0, 16, 0], f: "#ffffff" },
    ...fireBen([3, 12, 3], 3, 6, 6, "#f4f0ff"),
    { s: [2, 10, 3], p: [0, 16, -9.5], f: "#ff7eb6", regnbue: true, rolle: "hale" },
    { s: [4, 8, 5], p: [0, 22, 8], f: "#ffffff" },
    { s: [6, 7, 10], p: [0, 26, 12], f: "#ffffff", rolle: "hoved", børn: [
      { s: [5, 4, 4], p: [0, 24, 17], f: "#fff0f6" },
      { s: [1, 1, 0.4], p: [-1.2, 24, 19.1], f: "#c8a0b0" }, { s: [1, 1, 0.4], p: [1.2, 24, 19.1], f: "#c8a0b0" },
      ...øjne(2.2, 27.5, 14.8, 1.8),
      { s: [1.4, 6, 1.4], p: [0, 33, 13], f: "#ffd23f", lys: true },
      { s: [1.5, 2.5, 1], p: [-2, 30.5, 10], f: "#ffffff" }, { s: [1.5, 2.5, 1], p: [2, 30.5, 10], f: "#ffffff" },
      { s: [2, 9, 3], p: [0, 25, 7.5], f: "#c86bff", regnbue: true },
    ] },
  ] },
  // Skyøerne: et får, der er så blødt som en sky
  { id: "skyfaar", navn: "Skyfår", lyd: "mæh", fart: 1.1, æg: ["#ffffff", "#8fd0ff"], dele: [
    { s: [12, 11, 15], p: [0, 14, 0], f: "#ffffff" },
    { s: [6, 6, 6], p: [-4, 19, 3], f: "#f4f8ff" }, { s: [6, 6, 6], p: [4, 19, -3], f: "#f4f8ff" }, { s: [5, 5, 5], p: [0, 20, -5], f: "#f4f8ff" },
    ...fireBen([3, 8, 3], 3, 4, 4.5, "#c8d0e0"),
    { s: [6, 6, 6], p: [0, 16, 9.5], f: "#ffd6e6", rolle: "hoved", børn: [
      { s: [7, 3, 5], p: [0, 19.5, 8.5], f: "#ffffff" },
      { s: [2, 1, 0.3], p: [0, 14.5, 12.6], f: "#c08080" },
      ...øjne(1.5, 16.8, 12.6),
    ] },
  ] },
  // Skyøerne: en venlig, grøn drage, der flyver rundt mellem øerne
  { id: "drage", navn: "Lille drage", lyd: "rawr", fart: 1.8, evne: "flyver", æg: ["#4cc05a", "#ffd23f"], dele: [
    { s: [8, 8, 14], p: [0, 11, 0], f: "#4cc05a" },
    { s: [6, 3, 12], p: [0, 7.5, 1], f: "#ffe27a" },
    ...fireBen([3, 6, 3], 3, 3, 4.5, "#3a9a48"),
    { s: [12, 1, 8], p: [-9, 15, -1], f: "#6ad0ff", rolle: "vinge" }, { s: [12, 1, 8], p: [9, 15, -1], f: "#6ad0ff", rolle: "vinge" },
    { s: [3, 3, 12], p: [0, 11, -12], f: "#4cc05a", rolle: "hale" },
    { s: [1, 3, 8], p: [0, 16, -2], f: "#ff8c1a" },
    { s: [7, 7, 8], p: [0, 16, 10], f: "#4cc05a", rolle: "hoved", børn: [
      { s: [5, 3, 4], p: [0, 14, 15], f: "#5ad06a" },
      { s: [1, 1, 0.4], p: [-1.2, 15, 17.1], f: "#1a4a2a" }, { s: [1, 1, 0.4], p: [1.2, 15, 17.1], f: "#1a4a2a" },
      ...øjne(2, 17.5, 14.1, 2),
      { s: [1.2, 3, 1.2], p: [-2, 21, 8], f: "#ffd23f" }, { s: [1.2, 3, 1.2], p: [2, 21, 8], f: "#ffd23f" },
    ] },
  ] },
  // Bondegården: en brun pony med mørk manke
  { id: "hest", navn: "Pony", lyd: "vrinsk", fart: 1.7, æg: ["#a8703a", "#3a2210"], dele: [
    { s: [9, 9, 16], p: [0, 15, 0], f: "#a8703a" },
    ...fireBen([3, 11, 3], 3, 5.5, 6, "#8a5a2b"),
    { s: [2, 10, 3], p: [0, 15, -9], f: "#3a2210", rolle: "hale" },
    { s: [4, 8, 5], p: [0, 21, 7.5], f: "#a8703a" }, { s: [1.5, 9, 4], p: [0, 22, 5.5], f: "#3a2210" },
    { s: [5, 6, 9], p: [0, 25, 11], f: "#a8703a", rolle: "hoved", børn: [
      { s: [1.5, 4, 0.4], p: [0, 25, 15.6], f: "#ffffff" },
      { s: [1, 1, 0.4], p: [-1, 23, 15.6], f: "#3a2210" }, { s: [1, 1, 0.4], p: [1, 23, 15.6], f: "#3a2210" },
      ...øjne(2, 26.5, 13, 1.6),
      { s: [1.4, 2.5, 1], p: [-1.6, 29, 8.5], f: "#8a5a2b" }, { s: [1.4, 2.5, 1], p: [1.6, 29, 8.5], f: "#8a5a2b" },
      { s: [1.6, 2, 4], p: [0, 28.5, 10], f: "#3a2210" },
    ] },
  ] },
  // Bondegården: en lille kanin med lange ører, der hopper
  { id: "kanin", navn: "Kanin", lyd: "pip", fart: 2.4, evne: "hopper", æg: ["#f0ece6", "#ff9ecb"], dele: [
    { s: [5, 5, 7], p: [0, 3.5, 0], f: "#e8e2da" },
    { s: [3, 3, 2], p: [0, 4, -4], f: "#ffffff" },
    { s: [2, 2, 3], p: [-1.5, 1, 1.5], f: "#d8d0c6", rolle: "ben", fase: 0 }, { s: [2, 2, 3], p: [1.5, 1, 1.5], f: "#d8d0c6", rolle: "ben", fase: Math.PI },
    { s: [4, 4, 4], p: [0, 6.5, 4], f: "#e8e2da", rolle: "hoved", børn: [
      { s: [1, 5, 1.5], p: [-1, 11, 3.5], f: "#e8e2da" }, { s: [1, 5, 1.5], p: [1, 11, 3.5], f: "#e8e2da" },
      { s: [0.6, 4, 0.6], p: [-1, 11, 4.4], f: "#ffb0c8" }, { s: [0.6, 4, 0.6], p: [1, 11, 4.4], f: "#ffb0c8" },
      { s: [1, 0.8, 0.4], p: [0, 6, 6.1], f: "#ff7eb6" },
      ...øjne(1.1, 7.2, 6.1, 1.1),
    ] },
  ] },
  // Dinodalen: en kæmpe, venlig langhals — den strækker halsen hen mod dig
  { id: "langhals", navn: "Langhals", lyd: "hval", fart: 0.8, æg: ["#7ab86a", "#4a8a3a"], dele: [
    { s: [18, 15, 26], p: [0, 27, 0], f: "#7ab86a" },
    { s: [18.4, 5, 20], p: [0, 22, 1], f: "#a8d890" },
    ...fireBen([5, 20, 5], 6, 10, 9, "#6aa85a"),
    { s: [5, 5, 22], p: [0, 28, -23], f: "#7ab86a", rolle: "hale" },
    { s: [6, 26, 6], p: [0, 44, 13], f: "#7ab86a", rolle: "hoved", børn: [
      { s: [7, 6, 10], p: [0, 59, 17], f: "#7ab86a" },
      ...øjne(2.4, 61, 22.1, 1.8),
      { s: [4, 0.8, 0.4], p: [0, 57.5, 22.1], f: "#3a5a2a" },
      { s: [1.5, 1, 0.4], p: [-2.5, 58.5, 22.1], f: "#ffb0c8" }, { s: [1.5, 1, 0.4], p: [2.5, 58.5, 22.1], f: "#ffb0c8" },
    ] },
  ] },
  // Dinodalen: en triceratops med tre horn og en stor krave
  { id: "triceratops", navn: "Triceratops", lyd: "rawr", fart: 1.2, æg: ["#c8884a", "#f4ecd0"], dele: [
    { s: [14, 12, 20], p: [0, 14, 0], f: "#c8884a" },
    { s: [14.4, 3, 16], p: [0, 10, 1], f: "#e8b070" },
    ...fireBen([4, 9, 4], 4.5, 4.5, 6.5, "#a86a38"),
    { s: [4, 4, 10], p: [0, 13, -14], f: "#c8884a", rolle: "hale" },
    { s: [10, 9, 10], p: [0, 15, 13], f: "#c8884a", rolle: "hoved", børn: [
      { s: [16, 12, 2], p: [0, 19, 9], f: "#e87a3a" }, { s: [14, 2, 2.2], p: [0, 24.5, 9], f: "#f4ecd0" },
      { s: [1.5, 1.5, 8], p: [-3, 20, 20], f: "#f4ecd0" }, { s: [1.5, 1.5, 8], p: [3, 20, 20], f: "#f4ecd0" },
      { s: [1.5, 3, 1.5], p: [0, 16, 18.5], f: "#f4ecd0" },
      ...øjne(3, 17, 18.1, 2),
      { s: [6, 1, 0.4], p: [0, 12, 18.1], f: "#6a3a1a" },
    ] },
  ] },
  // Dinodalen: en lille dino-unge med store øjne — den kommer ud af ægget
  { id: "dinounge", navn: "Dino-unge", lyd: "pip", fart: 2.2, æg: ["#f4ecd0", "#5aa84a"], dele: [
    { s: [5, 5, 7], p: [0, 5.5, 0], f: "#6ad05a" },
    { s: [4, 2, 5], p: [0, 3.5, 0.5], f: "#d8f5a0" },
    { s: [2, 3, 2], p: [-1.6, 1.5, 0], f: "#4cb748", rolle: "ben", fase: 0 }, { s: [2, 3, 2], p: [1.6, 1.5, 0], f: "#4cb748", rolle: "ben", fase: Math.PI },
    { s: [2, 2, 6], p: [0, 5, -6], f: "#6ad05a", rolle: "hale" },
    { s: [6, 6, 6], p: [0, 10, 3.5], f: "#6ad05a", rolle: "hoved", børn: [
      ...øjne(1.6, 11, 6.6, 2.2),
      { s: [3, 0.6, 0.4], p: [0, 8.2, 6.6], f: "#2a5a2a" },
      { s: [4, 1.5, 2], p: [0, 13.5, 3], f: "#f4ecd0" },
    ] },
  ] },
  // Dinodalen: en flyveøgle, der svæver rundt over junglen
  { id: "flyveogle", navn: "Flyveøgle", lyd: "kra", fart: 2, evne: "flyver", æg: ["#b86a4a", "#ffd23f"], dele: [
    { s: [4, 4, 10], p: [0, 8, 0], f: "#b86a4a" },
    { s: [16, 1, 8], p: [-10, 10, 0], f: "#d88a5a", rolle: "vinge" }, { s: [16, 1, 8], p: [10, 10, 0], f: "#d88a5a", rolle: "vinge" },
    { s: [1, 3, 1], p: [-1.2, 4.5, -1], f: "#8a4a2a", rolle: "ben", fase: 0 }, { s: [1, 3, 1], p: [1.2, 4.5, -1], f: "#8a4a2a", rolle: "ben", fase: Math.PI },
    { s: [1.5, 1.5, 5], p: [0, 8, -7], f: "#b86a4a", rolle: "hale" },
    { s: [4, 4, 5], p: [0, 10, 7], f: "#b86a4a", rolle: "hoved", børn: [
      { s: [2, 1.6, 6], p: [0, 9.5, 12], f: "#ffd23f" }, { s: [1, 3, 5], p: [0, 13, 5], f: "#e03a3a" },
      ...øjne(1.3, 11, 9.6, 1.2),
    ] },
  ] },
  // NUKE-banen: en lysende grøn zombie — den følger efter dig og danser, og tryk gør den til konfetti
  { id: "atomzombie", navn: "Atomzombie", lyd: "uuuh", fart: 1, evne: "zombie", klap: "puf", glød: true, skala: 0.85, æg: ["#7aff3a", "#1a3a1a"], dele: [
    { s: [8, 12, 4], p: [0, 18, 0], f: "#2a5a2a" },
    { s: [8.2, 3, 4.2], p: [0, 15, 0], f: "#7aff3a", lys: true },
    { s: [4, 12, 4], p: [-2, 6, 0], f: "#3a4a3a", rolle: "ben", fase: 0 },
    { s: [4, 12, 4], p: [2, 6, 0], f: "#3a4a3a", rolle: "ben", fase: Math.PI },
    { s: [4, 4, 12], p: [-6, 22, 4], f: "#8aff4a", lys: true, rolle: "arm" },
    { s: [4, 4, 12], p: [6, 22, 4], f: "#8aff4a", lys: true, rolle: "arm" },
    { s: [8, 8, 8], p: [0, 28, 0], f: "#8aff4a", lys: true, rolle: "hoved", børn: [
      { s: [3, 3, 0.4], p: [-2, 29, 4.1], f: "#ffff5a", lys: true }, { s: [1.5, 1.5, 0.5], p: [-2, 28.5, 4.2], f: "#1a3a1a" },
      { s: [3, 3, 0.4], p: [2, 29, 4.1], f: "#ffff5a", lys: true }, { s: [1.5, 1.5, 0.5], p: [2, 28.5, 4.2], f: "#1a3a1a" },
      { s: [4, 1, 0.4], p: [0, 25.5, 4.1], f: "#1a3a1a" },
      { s: [2, 3, 2], p: [-2, 33.5, 0], f: "#5aff2a", lys: true }, { s: [2, 2, 2], p: [2, 33, 1], f: "#5aff2a", lys: true },
    ] },
  ] },
  // NUKE-banen: en stor, lysende frø med tre øjne
  { id: "atomfro", navn: "Atomfrø", lyd: "kvæk", fart: 2.4, evne: "hopper", glød: true, skala: 1.4, æg: ["#6aff3a", "#ffff5a"], dele: [
    { s: [8, 6, 8], p: [0, 4, 0], f: "#6aff3a", lys: true },
    { s: [6, 0.6, 0.3], p: [0, 3, 4.1], f: "#1a5a1a" },
    { s: [3, 2, 4], p: [-4, 1, -2], f: "#4ae02a", rolle: "ben", fase: 0 }, { s: [3, 2, 4], p: [4, 1, -2], f: "#4ae02a", rolle: "ben", fase: 0 },
    { s: [2, 2, 2], p: [-3, 1, 3], f: "#4ae02a", rolle: "ben", fase: Math.PI }, { s: [2, 2, 2], p: [3, 1, 3], f: "#4ae02a", rolle: "ben", fase: Math.PI },
    { s: [8, 3, 3], p: [0, 8, 2.5], f: "#6aff3a", lys: true, rolle: "hoved", børn: [
      { s: [3, 3, 3], p: [-3, 9.5, 2.5], f: "#6aff3a", lys: true }, { s: [3, 3, 3], p: [3, 9.5, 2.5], f: "#6aff3a", lys: true }, { s: [3, 3, 3], p: [0, 10.5, 2.5], f: "#6aff3a", lys: true },
      { s: [2, 2, 0.4], p: [-3, 9.8, 4.1], f: "#ffffff" }, { s: [1, 1, 0.5], p: [-3, 9.8, 4.2], f: "#1a1a1a" },
      { s: [2, 2, 0.4], p: [3, 9.8, 4.1], f: "#ffffff" }, { s: [1, 1, 0.5], p: [3, 9.8, 4.2], f: "#1a1a1a" },
      { s: [2, 2, 0.4], p: [0, 10.8, 4.1], f: "#ffffff" }, { s: [1, 1, 0.5], p: [0, 10.8, 4.2], f: "#1a1a1a" },
    ] },
  ] },
  // NUKE-banen: en kæmpestor zombie med et fjollet grin — tryk på den tre gange, så bliver den til konfetti
  { id: "kaempezombie", navn: "Kæmpezombie", lyd: "uuuh", fart: 0.8, evne: "zombie", klap: "puf", slag: 3, glød: true, skala: 1.4, æg: ["#5aff2a", "#4a2a6a"], dele: [
    { s: [10, 12, 5], p: [0, 18, 0], f: "#4a2a6a" },
    { s: [10.2, 2, 5.2], p: [0, 13, 0], f: "#2a1a3a" },
    { s: [3, 3, 0.4], p: [2.5, 20, 2.6], f: "#7aff3a", lys: true },
    { s: [4.5, 12, 4.5], p: [-2.5, 6, 0], f: "#2a2a4a", rolle: "ben", fase: 0 },
    { s: [4.5, 12, 4.5], p: [2.5, 6, 0], f: "#2a2a4a", rolle: "ben", fase: Math.PI },
    { s: [4, 4, 13], p: [-7, 22, 4.5], f: "#7aff3a", lys: true, rolle: "arm" },
    { s: [4, 4, 13], p: [7, 22, 4.5], f: "#7aff3a", lys: true, rolle: "arm" },
    { s: [10, 9, 9], p: [0, 28.5, 0], f: "#7aff3a", lys: true, rolle: "hoved", børn: [
      { s: [3.5, 3.5, 0.4], p: [-2.5, 30, 4.6], f: "#ffff5a", lys: true }, { s: [1.6, 1.6, 0.5], p: [-2, 29.4, 4.7], f: "#1a3a1a" },
      { s: [2.5, 2.5, 0.4], p: [2.8, 30.4, 4.6], f: "#ffff5a", lys: true }, { s: [1.2, 1.2, 0.5], p: [2.4, 30, 4.7], f: "#1a3a1a" },
      { s: [6, 1.2, 0.4], p: [0, 26, 4.6], f: "#1a3a1a" }, { s: [1.2, 1.2, 0.4], p: [-3.4, 26.8, 4.6], f: "#1a3a1a" }, { s: [1.2, 1.2, 0.4], p: [3.4, 26.8, 4.6], f: "#1a3a1a" },
      { s: [2, 2.5, 0.6], p: [1, 24.6, 4.6], f: "#ff6fa0" },
      { s: [2, 3, 2], p: [-3, 34.5, 0], f: "#5aff2a", lys: true }, { s: [2, 4, 2], p: [0, 35, 1], f: "#5aff2a", lys: true }, { s: [2, 2.5, 2], p: [3, 34.2, -1], f: "#5aff2a", lys: true },
    ] },
  ] },
  // NUKE-banen: en venlig ko med to hoveder og lysende pletter — begge hoveder kigger på dig
  { id: "tohovedko", navn: "Tohovedet ko", lyd: "muh", fart: 1.1, æg: ["#d8c8a0", "#7aff3a"], dele: [
    { s: [14, 10, 18], p: [0, 17, 0], f: "#d8c8a0" },
    { s: [14.4, 3, 4], p: [0, 19, 2], f: "#7aff3a", lys: true },
    { s: [5, 10.4, 4], p: [-3, 17, -5], f: "#7aff3a", lys: true },
    ...fireBen([4, 12, 4], 5, 6, 6.5, "#b8a880"),
    { s: [1, 8, 1], p: [0, 17, -9.5], f: "#b8a880", rolle: "hale" },
    ...[-1, 1].map(s => ({ s: [7, 7, 6], p: [s * 4.2, 22, 11.5], f: "#d8c8a0", rolle: "hoved", børn: [
      { s: [5, 2.5, 1], p: [s * 4.2, 19.5, 14.8], f: "#f0c8b8" },
      { s: [1, 3, 1], p: [s * 4.2 - 2.6, 26.5, 11.5], f: "#fff5cc" }, { s: [1, 3, 1], p: [s * 4.2 + 2.6, 26.5, 11.5], f: "#fff5cc" },
      ...[-1.6, 1.6].flatMap(e => [
        { s: [2, 2, 0.4], p: [s * 4.2 + e, 23, 14.6], f: "#ffffff" },
        { s: [1, 1, 0.5], p: [s * 4.2 + e - Math.sign(e) * 0.5, 22.5, 14.7], f: "#1a1a1a" },
      ]),
    ] })),
  ] },
  // Ildtornadoerne: en ørkenræv med kæmpestore ører
  { id: "orkenraev", navn: "Ørkenræv", lyd: "jip", fart: 2.2, æg: ["#e8c890", "#ffffff"], dele: [
    { s: [7, 6, 12], p: [0, 8, 0], f: "#e8c890" },
    { s: [5, 2, 9], p: [0, 5.2, 0.5], f: "#fff0d8" },
    ...fireBen([2, 5, 2], 2.2, 2.5, 4, "#d8b070"),
    { s: [4, 4, 9], p: [0, 9, -9.5], f: "#e8c890", rolle: "hale", børn: [{ s: [4.2, 4.2, 3], p: [0, 9, -13], f: "#fff0d8" }] },
    { s: [7, 6, 6], p: [0, 12, 8], f: "#e8c890", rolle: "hoved", børn: [
      { s: [3, 2.5, 3], p: [0, 10.5, 12], f: "#fff0d8" }, { s: [1.4, 1.2, 0.6], p: [0, 11.4, 13.6], f: "#1a1a1a" },
      { s: [3, 7, 1], p: [-3, 18, 7.5], f: "#e8c890" }, { s: [1.6, 5, 1.2], p: [-3, 17.5, 7.8], f: "#ffb0a0" },
      { s: [3, 7, 1], p: [3, 18, 7.5], f: "#e8c890" }, { s: [1.6, 5, 1.2], p: [3, 17.5, 7.8], f: "#ffb0a0" },
      ...øjne(1.8, 13, 11.1, 1.6),
    ] },
  ] },
  // Ildtornadoerne: en lille præriehund, der hopper rundt
  { id: "praeriehund", navn: "Præriehund", lyd: "pip", fart: 2, evne: "hopper", skala: 0.9, æg: ["#b0885a", "#f0d8b0"], dele: [
    { s: [6, 8, 6], p: [0, 6, 0], f: "#b0885a" },
    { s: [4, 5, 0.5], p: [0, 5.5, 3.1], f: "#f0d8b0" },
    { s: [2, 2, 3], p: [-2, 1, 2], f: "#8a6a40", rolle: "ben", fase: 0 }, { s: [2, 2, 3], p: [2, 1, 2], f: "#8a6a40", rolle: "ben", fase: Math.PI },
    { s: [1.5, 2.5, 1.5], p: [-2.5, 8, 3.2], f: "#8a6a40" }, { s: [1.5, 2.5, 1.5], p: [2.5, 8, 3.2], f: "#8a6a40" },
    { s: [2, 2, 4], p: [0, 3, -4.5], f: "#8a6a40", rolle: "hale" },
    { s: [5, 5, 5], p: [0, 12.5, 0.5], f: "#b0885a", rolle: "hoved", børn: [
      { s: [3, 2, 1], p: [0, 11, 3.5], f: "#f0d8b0" }, { s: [1, 0.8, 0.4], p: [0, 11.8, 4.1], f: "#1a1a1a" },
      { s: [1.4, 1.4, 1], p: [-2.2, 15.4, 0.5], f: "#8a6a40" }, { s: [1.4, 1.4, 1], p: [2.2, 15.4, 0.5], f: "#8a6a40" },
      ...øjne(1.3, 13.5, 3.1, 1.3),
    ] },
  ] },
  // Ildtornadoerne: en rullebusk, der triller hen over prærien med vinden
  { id: "rullebusk", navn: "Rullebusk", lyd: "rasl", fart: 2.6, evne: "ruller", æg: ["#b08a50", "#6a4a2a"], dele: [
    { s: [3, 3, 3], p: [0, 7, 0], f: "#8a6a3a", rolle: "rul", børn: [
      { s: [12, 1, 1], p: [0, 7, 0], f: "#9a7a44" }, { s: [1, 12, 1], p: [0, 7, 0], f: "#9a7a44" }, { s: [1, 1, 12], p: [0, 7, 0], f: "#9a7a44" },
      ...Array.from({ length: 26 }, (_, i) => {                  // små kviste jævnt fordelt på en kugle
        const h = 1 - 2 * (i + 0.5) / 26, rr = Math.sqrt(1 - h * h), v = i * 2.4;
        return { s: [2.2, 2.2, 2.2], p: [Math.cos(v) * rr * 6, 7 + h * 6, Math.sin(v) * rr * 6], f: i % 3 ? "#b08a50" : "#7a5a30" };
      }),
    ] },
  ] },
  // Ildtornadoerne: en føniks — en lysende ildfugl, der flyver rundt og drysser gnister
  { id: "foniks", navn: "Føniks", lyd: "fønix", fart: 1.6, evne: "flyver", glød: "ild", skala: 1.2, æg: ["#ff4d2e", "#ffd23f"], dele: [
    { s: [6, 6, 9], p: [0, 8, 0], f: "#ff5a1f", lys: true },
    { s: [4, 3, 6], p: [0, 6, 1], f: "#ffd23f", lys: true },
    { s: [1.5, 4, 1.5], p: [-1.5, 2.5, 0], f: "#d88a1a", rolle: "ben", fase: 0 }, { s: [1.5, 4, 1.5], p: [1.5, 2.5, 0], f: "#d88a1a", rolle: "ben", fase: Math.PI },
    { s: [9, 1, 6], p: [-7, 9, 0], f: "#ff8c1a", lys: true, rolle: "vinge", børn: [{ s: [5, 1.2, 3], p: [-10, 9, -1.5], f: "#ffd23f", lys: true }] },
    { s: [9, 1, 6], p: [7, 9, 0], f: "#ff8c1a", lys: true, rolle: "vinge", børn: [{ s: [5, 1.2, 3], p: [10, 9, -1.5], f: "#ffd23f", lys: true }] },
    { s: [2, 1.5, 10], p: [-1.5, 8, -9], f: "#ff3b1a", lys: true, rolle: "hale", børn: [{ s: [2, 1.5, 6], p: [-2, 8.5, -16], f: "#ffd23f", lys: true }] },
    { s: [2, 1.5, 12], p: [1.5, 8.5, -10], f: "#ff8c1a", lys: true, rolle: "hale", børn: [{ s: [2, 1.5, 5], p: [2, 9, -18], f: "#fff3a0", lys: true }] },
    { s: [5, 5, 5], p: [0, 13, 5], f: "#ff5a1f", lys: true, rolle: "hoved", børn: [
      { s: [2, 1.5, 3], p: [0, 12.5, 8.5], f: "#ffd23f", lys: true },
      { s: [1, 3, 1], p: [0, 16.5, 4.5], f: "#ffd23f", lys: true }, { s: [1, 2, 1], p: [-1.2, 16, 4], f: "#ff8c1a", lys: true }, { s: [1, 2, 1], p: [1.2, 16, 4], f: "#ff8c1a", lys: true },
      ...øjne(1.3, 14, 7.6, 1.4),
    ] },
  ] },
];
// Dyr, man kan ride på: tryk på dem, så sidder man på ryggen (biler.js og spil.js)
for (const id of ["ko", "gris", "svampeko", "rensdyr", "dalmatiner", "enhjorning", "drage", "hest", "langhals", "triceratops", "tohovedko", "foniks"]) {
  const d = DYR.find(x => x.id === id);
  if (d) d.ride = true;
}
// ---------- Byg et dyr af klodser ----------
const kasse = new THREE.BoxGeometry(1, 1, 1);
const S = 1 / 16;
export function byggDyr(def) {
  const g = new THREE.Group();
  const u = { ben: [], hoved: [], vinge: [], hale: [], arm: [], flamme: [], regnbue: [], rul: [] };
  function del(d, forælder, fp) {
    const [w, h, dd] = d.s, [x, y, z] = d.p;
    const pivot = d.rolle === "ben" ? [x, y + h / 2, z]
      : d.rolle === "hoved" ? [x, y - h / 2, z - dd / 2]
      : d.rolle === "vinge" ? [x - Math.sign(x) * w / 2, y, z]
      : d.rolle === "hale" ? [x, y, z + dd / 2]
      : d.rolle === "arm" ? [x, y, z - dd / 2] : [x, y, z];
    const grp = new THREE.Group();
    grp.position.set((pivot[0] - fp[0]) * S, (pivot[1] - fp[1]) * S, (pivot[2] - fp[2]) * S);
    const mat = d.lys ? new THREE.MeshBasicMaterial({ color: d.f })
      : new THREE.MeshLambertMaterial({ color: d.f, transparent: !!d.gennemsigtig, opacity: d.gennemsigtig || 1 });
    const m = new THREE.Mesh(kasse, mat);
    m.scale.set(w * S, h * S, dd * S);
    m.position.set((x - pivot[0]) * S, (y - pivot[1]) * S, (z - pivot[2]) * S);
    grp.add(m);
    forælder.add(grp);
    grp.userData.fase = d.fase || 0;
    grp.userData.side = Math.sign(x) || 1;
    if (d.rolle) u[d.rolle].push(grp);
    if (d.regnbue) u.regnbue.push(mat);
    for (const b of d.børn || []) del(b, grp, pivot);
  }
  for (const d of def.dele) del(d, g, [0, 0, 0]);
  g.userData = u;
  g.scale.setScalar(def.skala || 1);
  return g;
}

// ---------- Et levende dyr i verdenen ----------
const tmp = new THREE.Vector3();
export class Dyr {
  constructor(def, verden, scene) {
    this.def = def; this.v = verden; this.scene = scene;
    this.model = byggDyr(def);
    scene.add(this.model);
    const boks = new THREE.Box3().setFromObject(this.model), str = boks.getSize(new THREE.Vector3());
    this.b = Math.min(0.42, Math.max(0.15, Math.max(str.x, str.z) * 0.32));
    this.h = Math.min(1.8, Math.max(0.3, str.y * 0.9));
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = Math.random() * Math.PI * 2; this.målYaw = this.yaw;
    this.tid = Math.random() * 2; this.går = false; this.jord = false; this.fase = 0; this.t = Math.random() * 10;
    this.skub = new THREE.Vector3();                     // skub fra en eksplosion
    this.flyv = 0; this.turbo = 0; this.hopTid = 0; this.klapTid = 0; this.lydTid = 4 + Math.random() * 10;
    this.liv = def.liv || 1; this.flugt = 0;              // liv: hvor mange skud der skal til · flugt: løber væk et øjeblik
  }

  opdater(dt, spiller) {
    const d = this.def, u = this.model.userData;
    this.t += dt; this.tid -= dt;
    if (this.holdt) {                                      // en tornado snurrer dyret rundt (tornado.js flytter det)
      this.model.position.copy(this.pos);
      this.model.rotation.set(Math.sin(this.t * 7) * 0.3, this.model.rotation.y + dt * 9, 0);
      return;
    }
    if (this.tid <= 0) {                                   // find på noget nyt at lave
      this.går = Math.random() < 0.65;
      this.tid = 1.5 + Math.random() * 3.5;
      if (this.går) this.målYaw = this.yaw + (Math.random() - 0.5) * 3;
      if (d.evne === "flyver" && Math.random() < 0.3) this.flyv = 3 + Math.random() * 3;
      if (d.evne === "turbo" && this.går && Math.random() < 0.35) this.turbo = 1.6;
    }
    const tilX = spiller.x - this.pos.x, tilZ = spiller.z - this.pos.z, afst = Math.hypot(tilX, tilZ);
    this.danser = false;
    if (d.evne === "zombie" && afst < 14) {               // zombier traver efter dig — og danser når de når frem
      this.målYaw = Math.atan2(tilX, tilZ);
      this.går = afst > 2.3; this.danser = !this.går; this.tid = 1;
    }
    let følgAfst = 0;
    if (this.følg) {                                       // et kæledyr (Den uendelige verden) følger efter barnet
      const fx = this.følg.x - this.pos.x, fz = this.følg.z - this.pos.z;
      følgAfst = Math.hypot(fx, fz);
      this.målYaw = Math.atan2(fx, fz); this.går = følgAfst > 2.8; this.tid = 1; this.flyv = 0;
      // sidder det fast (fx bag en trappe), eller er barnet langt væk, så springer det hen til barnet
      this.følgFast = this.går && følgAfst >= (this.følgFør ?? Infinity) - 0.005 ? (this.følgFast || 0) + dt : 0;
      this.følgFør = følgAfst;
      if (følgAfst > 26 || this.følgFast > 1.5) {
        this.pos.set(this.følg.x - fx / følgAfst * 2.5, this.følg.y + 0.6, this.følg.z - fz / følgAfst * 2.5); this.vel.set(0, 0, 0);
        this.følgFast = 0; this.klapTid = 0.5;
      }
    }
    if (d.evne === "jæger") {                              // turbo-dinoen spurter efter dig — og løber væk efter et skub
      this.flugt = Math.max(0, this.flugt - dt);
      this.omvej = Math.max(0, (this.omvej || 0) - dt);
      if (this.omvej > 0) { this.målYaw = this.omvejYaw; this.går = true; this.tid = 1; }
      else if (this.flugt > 0) { this.målYaw = Math.atan2(-tilX, -tilZ); this.går = true; this.tid = 1; }
      else if (afst < 32) {
        this.målYaw = Math.atan2(tilX, tilZ); this.går = afst > 0.6; this.tid = 1;
        if (this.jord && afst > 2 && afst < 6 && Math.random() < dt * 1.5) this.vel.y = 7;     // et spring frem
      }
    }
    if (d.evne === "ruller") {                            // rullebusken triller med vinden og hopper lidt
      if (this.vind === undefined) this.vind = Math.random() * Math.PI * 2;
      this.målYaw = this.vind + Math.sin(this.t * 0.3) * 0.4; this.går = true; this.tid = 1;
      if (this.jord && Math.random() < dt * 1.2) this.vel.y = 4.5;
    }
    let dy = this.målYaw - this.yaw;
    dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.yaw += dy * Math.min(1, dt * (d.evne === "jæger" ? 10 : 4));   // dinoen drejer skarpt

    let fart = this.går ? d.fart : 0;
    if (this.følg && this.går) fart = Math.max(fart, Math.min(6, følgAfst * 0.9));   // kæledyret skynder sig efter
    if (this.turbo > 0) { this.turbo -= dt; fart = 6; this.går = true; }
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    if (d.evne === "hopper") {                           // frøen bevæger sig kun i hop
      if (this.jord && this.går) { this.hopTid -= dt; if (this.hopTid <= 0) { this.vel.y = 7.5; this.hopTid = 0.6 + Math.random() * 0.8; } }
      const luft = this.jord ? 0 : fart;
      this.vel.x = fx * luft; this.vel.z = fz * luft;
    } else { this.vel.x = fx * fart; this.vel.z = fz * fart; }
    this.vel.x += this.skub.x; this.vel.z += this.skub.z;
    this.skub.multiplyScalar(Math.pow(0.08, dt));

    const g = this.v.tyngde;
    if (d.evne === "svømmer") {                           // fisk svømmer rundt i hver sin højde over bunden
      if (this.svøm === undefined) this.svøm = 1 + Math.random() * 7;
      const bund = this.v.topY(Math.floor(this.pos.x), Math.floor(this.pos.z));
      const målY = Math.min(this.v.BY - 7, bund + 1 + this.svøm) + Math.sin(this.t * 0.8) * 0.4;
      this.vel.y = (målY - this.pos.y) * 1.5;
    } else if (d.evne === "svæver") {                     // spøgelset svæver over jorden
      const målY = this.v.topY(Math.floor(this.pos.x), Math.floor(this.pos.z)) + 1.4 + Math.sin(this.t * 2) * 0.3;
      this.vel.y = (målY - this.pos.y) * 3;
    } else if (this.flyv > 0) {                          // flyvegrisen letter
      this.flyv -= dt;
      const målY = this.v.topY(Math.floor(this.pos.x), Math.floor(this.pos.z)) + 4;
      this.vel.y += ((målY - this.pos.y) * 2 - this.vel.y) * Math.min(1, dt * 3);
    } else {
      this.vel.y -= g * dt;
      if (d.evne === "flagrer" && this.vel.y < -2.5) this.vel.y = -2.5;
    }
    const r = this.v.bevæg(this.pos, tmp.copy(this.vel).multiplyScalar(dt), this.b, this.h);
    this.jord = r.jord;
    if (r.jord || r.loft) this.vel.y = r.jord ? 0 : Math.min(0, this.vel.y);
    if (r.jord && this.v.hopperUnder(this.pos, this.b)) this.vel.y = 11;       // boing!
    if (r.væg && this.går) {                             // hop op ad et trin, eller vend om
      tmp.copy(this.pos); tmp.y += 1.05; tmp.x += fx * 0.3; tmp.z += fz * 0.3;
      const jæger = d.evne === "jæger";
      const hopFart = blokke => Math.sqrt(2 * g * (blokke + 0.45));   // højt nok til at komme helt op over kanten
      if (this.jord && !this.v.kolliderer(tmp, this.b, this.h)) this.vel.y = hopFart(1);
      else if (jæger && this.jord && !this.v.kolliderer(tmp.setY(this.pos.y + 2.05), this.b, this.h)) this.vel.y = hopFart(2);   // dinoen springer højt
      else if (jæger) { this.omvej = 0.7; this.omvejYaw = this.yaw + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2; }  // løb udenom
      else if (d.evne === "ruller") this.vind += Math.PI * (0.6 + Math.random() * 0.8);                                // vinden vender
      else this.målYaw += Math.PI * (0.5 + Math.random());
    }

    // bevægelser
    const vandret = Math.hypot(this.vel.x, this.vel.z), luft = !this.jord;
    this.fase += vandret * dt * 5;
    for (const b of u.ben) b.rotation.x = Math.sin(this.fase + b.userData.fase) * 0.7 * Math.min(1, vandret);
    for (const w of u.vinge) w.rotation.z = w.userData.side * ((this.flyv > 0 || luft ? Math.sin(this.t * 20) * 0.7 : Math.sin(this.t * 3) * 0.1) - 0.1);
    for (const h of u.hale) h.rotation.y = Math.sin(this.t * 6) * 0.35;
    for (const f of u.flamme) { f.visible = this.turbo > 0; f.scale.setScalar(0.8 + Math.random() * 0.6); }
    for (const a of u.arm) a.rotation.x = this.danser ? -0.8 + Math.sin(this.t * 9) * 0.6 : Math.sin(this.t * 2.5 + a.userData.side) * 0.12;
    for (const m of u.regnbue) m.color.setHSL((this.t * 0.2) % 1, 0.75, 0.72);
    for (const r of u.rul) r.rotation.x += vandret * dt * 2.3;
    let kig = Math.sin(this.t * 0.7) * 0.4;
    if (afst < 6) { kig = Math.atan2(tilX, tilZ) - this.yaw; kig = ((kig + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; kig = Math.max(-0.9, Math.min(0.9, kig)); }
    for (const h of u.hoved) { h.rotation.y += (kig - h.rotation.y) * Math.min(1, dt * 5); h.rotation.x = Math.sin(this.t * 2) * 0.05; }

    this.klapTid = Math.max(0, this.klapTid - dt);
    const hop = Math.sin(this.klapTid / 0.5 * Math.PI) * 0.15;
    const k = d.skala || 1;
    this.model.scale.set(k * (1 + hop), k * (1 - hop), k * (1 + hop));
    this.model.position.copy(this.pos);
    this.model.rotation.set(0, this.yaw + (this.danser ? Math.sin(this.t * 6) * 0.4 : 0), this.danser ? Math.sin(this.t * 6) * 0.12 : 0);

    this.lydTid -= dt;
    if (this.lydTid <= 0) { this.lydTid = 8 + Math.random() * 12; if (afst < 12) Lyd.dyrLyd(d.lyd, afst); }
  }

  klap() {                                               // når man trykker på dyret
    Lyd.dyrLyd(this.def.lyd);
    if (this.jord) this.vel.y = 6;
    this.klapTid = 0.5;
    this.lydTid = 6 + Math.random() * 8;
    if (this.def.evne === "flyver") this.flyv = 4;
    if (this.def.evne === "turbo") { this.turbo = 1.6; this.tid = 1.6; }
  }

  fjern() {
    this.scene.remove(this.model);
    this.model.traverse(c => { if (c.material) c.material.dispose(); });
  }
}

// ---------- Ikon til dyre-æg ----------
const ægIkoner = {};
export function ægIkon(farver) {
  const nøgle = farver.join();
  if (ægIkoner[nøgle]) return ægIkoner[nøgle];
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = farver[0];
  g.beginPath(); g.ellipse(32, 35, 17, 23, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = farver[1];
  for (const [x, y, r] of [[25, 24, 4], [39, 30, 5], [28, 43, 5], [40, 47, 3], [33, 15, 3]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "rgba(255,255,255,.5)";
  g.beginPath(); g.ellipse(24, 26, 4, 7, -0.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2;
  g.beginPath(); g.ellipse(32, 35, 17, 23, 0, 0, Math.PI * 2); g.stroke();
  return (ægIkoner[nøgle] = c.toDataURL());
}
