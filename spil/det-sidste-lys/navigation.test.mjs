import { kanGå, RAVTRÆER, STEDER, stjernePositioner } from "./verden.js";
import * as THREE from "../3d-faelles/three.module.js";
import assert from "node:assert/strict";
const trin = 2, kø = [[-24, 80]], set = new Set(["-24,80"]);
for (let i = 0; i < kø.length; i++) {
  const [x, z] = kø[i];
  for (const [dx, dz] of [[trin, 0], [-trin, 0], [0, trin], [0, -trin]]) {
    const nx = x + dx, nz = z + dz, key = nx + "," + nz;
    if (!set.has(key) && kanGå(nx, nz)) {
      set.add(key);
      kø.push([nx, nz]);
    }
  }
}
for (const [id, p] of Object.entries(STEDER)) {
  assert.ok(kø.some(([x, z]) => Math.hypot(x - p.x, z - p.z) < 3), "Sted kan nås: " + id);
}
for (const p of RAVTRÆER) assert.ok(kø.some(([x, z]) => Math.hypot(x - p.x, z - p.z) < 3));
for (let z = 30; z >= 23; z -= .2) assert.ok(kanGå(7, z), "Værkstedsdøren kan passeres");
console.log("Alle seks steder og tre ravtræer kan nås fra kajen. Værkstedets dør kan passeres. " + kø.length + " gangfelter.");

// Ugyldige himmelkoordinater ville også ødelægge Three.js' bounding sphere i Safari.
const stjerner = stjernePositioner();
assert.equal(stjerner.length, 260 * 3);
assert.ok(stjerner.every(Number.isFinite), "Stjernehimlens koordinater er alle endelige");
for (let i = 0; i < stjerner.length; i += 3) {
  assert.ok(Math.abs(Math.hypot(...stjerner.slice(i, i + 3)) - 480) < 1e-6, "Alle stjerner ligger på himmelkuglen");
}
const himmel = new THREE.BufferGeometry();
himmel.setAttribute("position", new THREE.Float32BufferAttribute(stjerner, 3));
himmel.computeBoundingSphere();
assert.ok(Number.isFinite(himmel.boundingSphere.radius), "Three.js beregner en endelig bounding sphere");
himmel.dispose();
console.log("Stjernehimlens 260 stjerner og Three.js bounding sphere er uden NaN.");
