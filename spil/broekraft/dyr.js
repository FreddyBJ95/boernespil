// ===== Mærkelige dyr i Broekraft =====
// Tilføj et nyt dyr: kopiér en blok i DYR og byg det af klodser.
// Mål er i "pixels" ligesom i Minecraft: 16 pixels = 1 blok. y = 0 er jorden, +z er forrest (næsen).
//  del:   { s: [bredde, højde, dybde], p: [x, y, z] = klodsens midte, f: farve, rolle, børn: [flere dele] }
//  rolle: "ben" (svinger når dyret går) · "hoved" (kigger på dig) · "vinge" (basker) · "hale" (logrer)
//         "arm" (zombie-arme) · "flamme" (vises kun når turbosneglen drøner af sted)
//  regnbue: true = klodsen skifter farve · lys: true = lyser selv · gennemsigtig: 0.8 = lidt gennemsigtig
//  evne:  "flyver" | "hopper" | "turbo" | "flagrer" (falder langsomt) | "zombie" (følger efter dig) | "svæver"
//  klap:  "puf" = dyret forsvinder i konfetti og bliver til en blomst når man trykker på det
//  skala: gør hele dyret større/mindre · fart: blokke pr. sekund
//  lyd:   "muh" | "øf" | "mæh" | "kluk" | "kvæk" | "rap" | "wiii" | "uuuh" | "buuh" | "boing" | "bipbop" | "pip"
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
];
// ---------- Byg et dyr af klodser ----------
const kasse = new THREE.BoxGeometry(1, 1, 1);
const S = 1 / 16;
export function byggDyr(def) {
  const g = new THREE.Group();
  const u = { ben: [], hoved: [], vinge: [], hale: [], arm: [], flamme: [], regnbue: [] };
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
  }

  opdater(dt, spiller) {
    const d = this.def, u = this.model.userData;
    this.t += dt; this.tid -= dt;
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
    let dy = this.målYaw - this.yaw;
    dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.yaw += dy * Math.min(1, dt * 4);

    let fart = this.går ? d.fart : 0;
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
    if (d.evne === "svæver") {                            // spøgelset svæver over jorden
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
      if (this.jord && !this.v.kolliderer(tmp, this.b, this.h)) this.vel.y = 7.5;
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
