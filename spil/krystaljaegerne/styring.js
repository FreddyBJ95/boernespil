// Når en dialog har sluppet en tast, kan browserens autorepeat ikke tage den igen.
export function trykTast(taster, tast, gentaget = false) {
  if (gentaget && !taster.has(tast)) return false;
  taster.add(tast);
  return true;
}

// En genåbnet rejsevejledning venter på nye skridt fra det sted, hvor den blev åbnet.
export function guideEfterSkridt(trin, start, nu) {
  return trin === 0 && Math.hypot(nu.x - start.x, nu.z - start.z) > 1.5 ? 1 : trin;
}
