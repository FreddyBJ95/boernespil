// ===== Materialerne: hvordan stål, plast, træ og messing ser ud i lyset =====
// Metal er "metalness" 1 og spejler omgivelserne (miljøkortet), så det ligner rigtigt metal.
// Ruheden varierer en smule over fladen (slibestriber og pletter), ellers ser det ud som plastik.

import * as THREE from "../3d-faelles/three.module.js";
import { træ, riflingBuler, prikBuler, knurlBuler, metalRuhed } from "./teksturer.js";

const lager = new Map();
function husk(navn, lav) { if (!lager.has(navn)) lager.set(navn, lav()); return lager.get(navn); }

// Metal: farve, ruhed og om det er børstet (striber) eller sandblæst (pletter)
function metal(farve, ruhed, slags = "sandblæst", ekstra = {}) {
  return new THREE.MeshPhysicalMaterial({ color: farve, metalness: 1, roughness: ruhed, roughnessMap: metalRuhed(slags), ...ekstra });
}

export const mat = {
  // Våbenstål: mørkt nitreret (pistolslæde), blånet (haglgevær), rustfrit (revolver), blankt (bundstykker)
  get nitrid() { return husk("nitrid", () => metal(0x1f2124, 0.42, "sandblæst", { metalness: 0.75, envMapIntensity: 0.8, clearcoat: 0.12, clearcoatRoughness: 0.5 })); },
  get blånet() { return husk("blånet", () => metal(0x1f2733, 0.28, "børstet", { clearcoat: 0.6, clearcoatRoughness: 0.15 })); },
  get rustfri() { return husk("rustfri", () => metal(0xb2b6bc, 0.2, "børstet")); },
  get blank() { return husk("blank", () => metal(0xdadde2, 0.14, "børstet")); },
  get mørkStål() { return husk("mørkStål", () => metal(0x24262a, 0.42, "sandblæst", { metalness: 0.9 })); },
  get aluminium() { return husk("alu", () => metal(0x2c2e33, 0.44, "sandblæst", { metalness: 0.6 })); },
  get messing() { return husk("messing", () => metal(0xd9aa58, 0.26, "børstet")); },
  get kobber() { return husk("kobber", () => metal(0xc8794a, 0.3, "børstet")); },
  get guld() { return husk("guld", () => metal(0xe2b04a, 0.22, "børstet")); },
  get krom() { return husk("krom", () => metal(0xe8eaee, 0.06, "børstet")); },

  // Plast og gummi
  get polymer() { return husk("polymer", () => new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.62, metalness: 0 })); },
  get polymerGreb() { return husk("polymerGreb", () => new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.8, metalness: 0, bumpMap: prikBuler(), bumpScale: 0.7 })); },
  get tan() { return husk("tan", () => new THREE.MeshStandardMaterial({ color: 0x8f7756, roughness: 0.74, metalness: 0, roughnessMap: metalRuhed("sandblæst") })); },
  get oliven() { return husk("oliven", () => new THREE.MeshStandardMaterial({ color: 0x4d5436, roughness: 0.72, metalness: 0, roughnessMap: metalRuhed("sandblæst") })); },
  get gummi() { return husk("gummi", () => new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.95, metalness: 0 })); },
  get rødPlast() { return husk("rødPlast", () => new THREE.MeshPhysicalMaterial({ color: 0xa8141b, roughness: 0.42, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.3 })); },
  get hvidMaling() { return husk("hvid", () => new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 })); },
  get orangeMaling() { return husk("orange", () => new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.45 })); },

  // Træ: valnød med lak (en blank klar hinde ovenpå) og med riflet greb
  get valnød() { return husk("valnød", () => new THREE.MeshPhysicalMaterial({ map: træ("valnød"), roughness: 0.48, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.22 })); },
  get valnødRiflet() { return husk("valnødR", () => new THREE.MeshPhysicalMaterial({ map: træ("valnød"), roughness: 0.6, metalness: 0, bumpMap: riflingBuler(40), bumpScale: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 })); },

  // Knurlet metal (drejeknapper på kikkerten, hjul)
  get knurl() { return husk("knurl", () => metal(0x2b2d31, 0.5, "sandblæst", { metalness: 0.85, bumpMap: knurlBuler(), bumpScale: 1.5 })); },

  // Linser med farvet antirefleks-belægning (skinner lilla og grønt)
  get linse() { return husk("linse", () => new THREE.MeshPhysicalMaterial({ color: 0x05070d, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520] })); },

  // Selvlysende: tritiumprikker i sigtet, rødpunktet, mørket i løbet
  get tritium() { return husk("tritium", () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 6, 1.2) })); },
  get rødPunkt() { return husk("rødPunkt", () => new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 0.4, 0.3) })); },
  get hul() { return husk("hul", () => new THREE.MeshBasicMaterial({ color: 0x030303 })); },
};
