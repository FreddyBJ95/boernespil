// ===== Fjollet Slange — modellerne fra Blender (modeller/*.glb, lavet med blender/slange.py) =====
// hoved.glb: slangens hoved · mad.glb: maden · hatte.glb: hattene · pynt.glb: træer, svampe, palmer, krabber …
// Kan en fil ikke hentes, bygges tingene af simple former som før (se slange.js, mad.js og verden.js).
import * as THREE from "./three.js";
import { hentGLB, smelt } from "../glb.js";

export const MODELLER = {};

// Hent filerne (højst ventMaks millisekunder — ellers starter spillet med de simple former)
export function hentModeller(navne = ["hoved", "mad", "hatte", "pynt"], ventMaks = 8000) {
  const alle = navne.map(n => hentGLB(new URL(`modeller/${n}.glb`, import.meta.url))
    .then(m => { MODELLER[n] = smelt(m, navn => /^(hvide|pupilkugle|laag)_/.test(navn)); })   // øjnenes dele skal kunne bevæge sig
    .catch(() => {}));
  return Promise.race([Promise.all(alle), new Promise(r => setTimeout(r, ventMaks))]);
}

// En kopi af én ting fra en fil, fx kopi("mad", "æble"). Formerne deles med de andre kopier (userData.delt),
// så de må ikke smides ud, når tingen fjernes.
export function kopi(fil, navn) {
  const m = MODELLER[fil] && MODELLER[fil].getObjectByName(navn);
  if (!m) return null;
  const k = m.clone();
  k.position.set(0, 0, 0);
  k.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.delt = true; } });
  return k;
}

// Mange ens ting på én gang (træer, blomster, søstjerner …): én InstancedMesh for hver del af tingen.
// fn(o, i) stiller ting nr. i (o.position, o.rotation, o.scale) og kan give en farve til delene med materialet "tone".
export function mange(fil, navn, antal, fn, kaster = true) {
  const model = MODELLER[fil] && MODELLER[fil].getObjectByName(navn);
  if (!model) return null;
  model.updateMatrixWorld(true);
  const ind = new THREE.Matrix4().copy(model.matrixWorld).invert(), dele = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(ind, o.matrixWorld));
    const im = new THREE.InstancedMesh(geo, o.material.clone(), antal);
    im.castShadow = kaster; im.receiveShadow = true;
    dele.push(im);
  });
  const o = new THREE.Object3D(), c = new THREE.Color(), g = new THREE.Group();
  for (let i = 0; i < antal; i++) {
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    const farve = fn(o, i);
    o.updateMatrix();
    for (const d of dele) {
      d.setMatrixAt(i, o.matrix);
      if (farve && d.material.name === "tone") d.setColorAt(i, c.set(farve));
    }
  }
  for (const d of dele) g.add(d);
  return g;
}

// Giv delene med materialet "tone" en farve (fx glasuren på en donut)
export function tone(obj, farve) {
  obj.traverse(o => { if (o.isMesh && o.material.name === "tone") { o.material = o.material.clone(); o.material.color.set(farve); } });
  return obj;
}
