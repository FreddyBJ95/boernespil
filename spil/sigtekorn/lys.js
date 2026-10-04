// ===== Lyset fra Blender: himmellyset og lyset, der kastes tilbage fra sand og mure, bagt ned i ét billede =====
// blender/lav_lys.py har regnet lyset ud med strålesporing (Cycles) og gemt det i modeller/lys.webp. lys.bin siger,
// hvor hvert hjørne af banen ligger i billedet. Solen og dens skarpe skygger tegner spillet stadig selv.
// Passer banen ikke længere til billedet (nogen har ændret bane.js uden at bage igen), bruges det gamle lys.

import * as THREE from "./three.js";

// Samme kontrolsum som blender/eksporter_bane.mjs
const kontrolsum = p => { let s = 0; for (let i = 0; i < p.length; i++) s += p[i] * ((i % 7) + 1); return Math.round(s); };

export async function hentLys(masker, bane = "stoevbyen", nat = false) {
  try {
    const fil = (bane === "stoevbyen" ? "modeller/lys" : `modeller/lys_${bane}`) + (nat ? "_nat" : "");   // (Støvbyens filer hedder bare lys.*)
    const [info, bin, billede] = await Promise.all([
      fetch(`${fil}.json`).then(r => r.json()),
      fetch(`${fil}.bin`).then(r => r.arrayBuffer()),
      new THREE.TextureLoader().loadAsync(`${fil}.webp`),
    ]);
    const uv = new Uint16Array(bin), efterNavn = new Map(masker.map(m => [m.name, m])), sæt = [];
    let start = 0;
    for (const m of info.masker) {
      const mesh = efterNavn.get(m.navn), p = mesh?.geometry.attributes.position;
      if (!p || p.count !== m.hjørner || kontrolsum(p.array) !== m.sum) { console.warn(`Lyset passer ikke til banen (${m.navn}) — bag det igen`); return null; }
      sæt.push([mesh, uv.subarray(start * 2, (start + m.hjørner) * 2)]);
      start += m.hjørner;
    }
    billede.colorSpace = THREE.SRGBColorSpace;
    billede.channel = 1;                                           // lysbilledet bruger sine egne koordinater (uv1)
    billede.anisotropy = 4;
    for (const [mesh, u] of sæt) {
      mesh.geometry.setAttribute("uv1", new THREE.BufferAttribute(u, 2, true));
      const mat = mesh.material;
      mat.lightMap = billede;
      mat.lightMapIntensity = Math.PI * info.k;                    // billedet gemmer lys / k, og three.js deler med π
      mat.vertexColors = false;                                    // de gamle skygger i hjørnerne er der nu rigtigt
      mat.envMapIntensity = 0;                                     // himlen er allerede med i billedet
      mat.needsUpdate = true;
    }
    return info;
  } catch (e) {
    console.warn("Intet lys fra Blender — bruger det gamle", e);
    return null;
  }
}

// Himlen som omgivelse for alt det, der bevæger sig (soldater, tønder, palmer): de får lys fra himlen og
// fra den lyse jord, men lidt svagere, så de ikke lyser op i de mørke tunneler
export function himmelMiljø(renderer, himmel, styrke = 0.55) {
  const mat = himmel.material.clone();
  for (const k of ["top", "midt", "bund"]) mat.uniforms[k].value = himmel.material.uniforms[k].value.clone().multiplyScalar(styrke);
  const scene = new THREE.Scene(); scene.add(new THREE.Mesh(himmel.geometry, mat));
  const pmrem = new THREE.PMREMGenerator(renderer), miljø = pmrem.fromScene(scene, 0.04, 1, 1000).texture;
  pmrem.dispose(); mat.dispose();
  return miljø;
}
