import { kanGå, næsteMål, RAVTRÆER, STEDER, stjernePositioner, skovLysPositioner, sporPositioner } from "./verden.js";
import { nyTilstand, STEDNOTER } from "./logik.js";
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
for (const note of STEDNOTER.filter(n=>Number.isFinite(n.x))) assert.ok(kø.some(([x,z])=>Math.hypot(x-note.x,z-note.z)<2.5), "Stednote kan nås: " + note.id);
const ravMål = { ...nyTilstand(), færdige: ["brev","nøgle"], position: { x:-54,z:-20 }, rav:[] };
assert.equal(næsteMål(ravMål), RAVTRÆER[1], "Nærmeste manglende rav er det fælles mål");
ravMål.rav=[1];
assert.notEqual(næsteMål(ravMål), RAVTRÆER[1], "Indsamlet rav bliver ikke ved at være mål");
console.log("Alle stednoter kan nås, og ravmål følger den næste manglende genstand.");

// Natlige skovlys får en reel Three.js-sfære også efter flere timers animation.
for (const tid of [0, .016, 5, 300, 7200, 36000]) {
  const punkter = skovLysPositioner(tid);
  assert.equal(punkter.length, 28 * 3);
  assert.ok(punkter.every(Number.isFinite), "Skovlys er endelige ved tid " + tid);
  const lys = new THREE.BufferGeometry();
  lys.setAttribute("position", new THREE.Float32BufferAttribute(punkter, 3));
  lys.computeBoundingSphere();
  assert.ok(Number.isFinite(lys.boundingSphere.radius));
  assert.ok(lys.boundingSphere.radius < 25, "Skovlys bliver omkring skoven");
  lys.dispose();
}
console.log("Skovlysets bevægelige buffer er uden NaN efter ti timers simulation.");

// Den skjulte sti må ikke lede spilleren ud i et utilgængeligt felt eller miste en instans.
const spor = sporPositioner();
const sten = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.28, 0), new THREE.MeshBasicMaterial(), spor.length);
for (let i = 0; i < spor.length; i++) {
  const p = spor[i];
  assert.ok(Object.values(p).every(Number.isFinite));
  assert.ok(kø.some(([x, z]) => Math.hypot(x-p.x, z-p.z) < 2), "Kyststen kan følges: " + i);
  if (i > 0) assert.ok(Math.hypot(p.x-spor[i-1].x, p.z-spor[i-1].z) <= 3.8, "Kyststen danner en sammenhængende sti");
  sten.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z));
}
sten.computeBoundingSphere();
assert.ok(Number.isFinite(sten.boundingSphere.radius));
sten.geometry.dispose();sten.material.dispose();
console.log(spor.length + " kyststen er sammenhængende, tilgængelige og samlet i ét tegnekald.");
