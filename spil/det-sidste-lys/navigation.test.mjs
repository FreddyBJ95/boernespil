import { kanGå, RAVTRÆER, STEDER } from "./verden.js";
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
