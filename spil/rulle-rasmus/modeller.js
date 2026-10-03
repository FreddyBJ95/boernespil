// ===== Rulle Rasmus — modellerne fra Blender (modeller/rasmus.glb, lavet med blender/rasmus.py) =====
// Pynten langs banen (træer, svampe, blomster, slik, grantræer, snemand, palmer), frugten, puderne og ballonerne.
// Stammer, stilke og pinde er 1 høje og 1 brede i filen, så temaer.js kan strække dem til den rigtige højde.
// Kan filen ikke hentes, bygges alt af simple former som før.
import * as THREE from "./three.js";
import { hentGLB, smelt } from "../glb.js";

let MODEL = null;

// Hent filen (højst ventMaks millisekunder — ellers starter spillet med de simple former)
export function hentModeller(ventMaks = 8000) {
  const hent = hentGLB(new URL("modeller/rasmus.glb", import.meta.url)).then(m => { MODEL = smelt(m); }).catch(() => {});
  return Promise.race([hent, new Promise(r => setTimeout(r, ventMaks))]);
}

// ---------- Til Samleren (bane.js): delene uden indeks og med farverne som almindelige tal ----------
const lager = new Map(), tonede = new Map();
function dele(navn) {
  if (lager.has(navn)) return lager.get(navn);
  const node = MODEL && MODEL.getObjectByName(navn);
  let ud = null;
  if (node) {
    node.updateMatrixWorld(true);
    const ind = new THREE.Matrix4().copy(node.matrixWorld).invert();
    ud = [];
    node.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry.toNonIndexed();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(ind, o.matrixWorld));
      const f = geo.attributes.color;
      if (f) {                                             // Samleren vil have farver som tre tal mellem 0 og 1
        const rgb = new Float32Array(f.count * 3);
        for (let i = 0; i < f.count; i++) { rgb[i * 3] = f.getX(i); rgb[i * 3 + 1] = f.getY(i); rgb[i * 3 + 2] = f.getZ(i); }
        geo.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
      }
      ud.push({ geo, mat: o.material });
    });
  }
  lager.set(navn, ud);
  return ud;
}
// Materialet "tone" i en bestemt farve (laves kun én gang pr. farve)
function tonet(mat, farve) {
  if (!farve || mat.name !== "tone") return mat;
  const nøgle = mat.uuid + farve;
  if (!tonede.has(nøgle)) { const m = mat.clone(); m.color.set(farve); tonede.set(nøgle, m); }
  return tonede.get(nøgle);
}

// Læg en model i Samleren med de samme tal som S.put: p = sted, r = drejning, s = størrelse (tal eller [x, y, z]).
// Giver false tilbage, hvis modellen ikke findes — så bygger temaet tingen af simple former i stedet.
export function læg(S, navn, p, r = [0, 0, 0], s = 1, forælder = null, farve = null) {
  const d = dele(navn);
  if (!d) return false;
  for (const { geo, mat } of d) S.put(geo, tonet(mat, farve), p, r, s, forælder);
  return true;
}

// En kopi af en ting (frugt, puder), som kan flytte sig. Formerne deles (userData.delt), så de ikke smides ud.
export function kopi(navn, farve = null) {
  const m = MODEL && MODEL.getObjectByName(navn);
  if (!m) return null;
  const k = m.clone();
  k.position.set(0, 0, 0);
  k.traverse(o => { if (o.isMesh) { o.userData.delt = true; o.material = tonet(o.material, farve); } });
  return k;
}

// Formen af en ting (fx ballonen), til en InstancedMesh
export function form(navn) {
  const m = MODEL && MODEL.getObjectByName(navn);
  let geo = null;
  if (m) m.traverse(o => { if (o.isMesh && !geo) geo = o.geometry; });
  return geo;
}
