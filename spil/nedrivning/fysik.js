// ===== Fysikken: Rapier regner på alle stykker beton, mursten og stål =====
// Rapier (rapier.rs, Apache-2.0) ligger i mappen rapier/ og kører som WebAssembly i browseren.
// Verdenen regnes 60 gange i sekundet. Hver gang to ting støder hårdt sammen, sender Rapier besked,
// så spillet kan lade en søjle knække eller en plade gå i stykker.

import * as RAPIER from "./rapier/rapier.js";
export { RAPIER };

export const fysik = { verden: null, kø: null, ejere: new Map(), terræn: new Set(), tid: 0 };
const TRIN = 1 / 60;
let rest = 0;

export async function startFysik() { await RAPIER.init(); }

// En ny, tom verden med en flad jord (ved hver ny bane)
export function nyVerden() {
  if (fysik.verden) { fysik.verden.free(); fysik.kø.free(); }
  const v = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  v.timestep = TRIN;
  v.numSolverIterations = 4;
  const jord = v.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -2, 0));
  const k = v.createCollider(RAPIER.ColliderDesc.cuboid(400, 2, 400).setFriction(0.9).setRestitution(0.05), jord);
  fysik.verden = v; fysik.kø = new RAPIER.EventQueue(true); fysik.jordKollider = k.handle;
  fysik.ejere.clear(); fysik.terræn.clear(); fysik.tid = 0; rest = 0;
  return v;
}

// Gå frem i tiden: fast trin på 1/60 sekund, højst fire trin pr. billede (ellers hakker det på langsomme maskiner)
export function fysikTrin(dt, vedStød, efterTrin) {
  rest = Math.min(rest + dt, TRIN * 4);
  let n = 0;
  while (rest >= TRIN) {
    fysik.verden.step(fysik.kø);
    fysik.kø.drainContactForceEvents(e => vedStød(fysik.ejere.get(e.collider1()), fysik.ejere.get(e.collider2()), e.totalForceMagnitude(), e.collider1(), e.collider2()));
    fysik.tid += TRIN; rest -= TRIN; n++;
    efterTrin?.();
  }
  return n;
}

// Hvad rammer en stråle fra et punkt i en retning? Svarer med ejeren (en del, en ting eller jorden), punktet og fladens retning
export function stråle(fra, retning, maks = 400, udeladKrop = null) {
  const r = new RAPIER.Ray(fra, retning);
  const træf = fysik.verden.castRayAndGetNormal(r, maks, true, undefined, undefined, undefined, udeladKrop || undefined);
  if (!træf) return null;
  const t = træf.timeOfImpact;
  return {
    ejer: fysik.ejere.get(træf.collider.handle) || null, jord: træf.collider.handle === fysik.jordKollider || fysik.terræn.has(træf.collider.handle), t,
    punkt: { x: fra.x + retning.x * t, y: fra.y + retning.y * t, z: fra.z + retning.z * t }, normal: træf.normal,
  };
}
