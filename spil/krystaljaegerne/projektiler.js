// Projektiler stopper ved vægge og ved områdeskift, også midt i en skadescallback.
export function opdatérFlyvere(skud, dt, { erFrit, ramning, fjern, afbryd }) {
  for (let i = skud.length - 1; i >= 0; i--) {
    if (afbryd()) return;
    const p = skud[i];
    if (!p) return;
    p.liv -= dt;
    p.obj.position.x += p.dx * dt;
    p.obj.position.z += p.dz * dt;
    const x = p.obj.position.x, z = p.obj.position.z;
    if (p.liv <= 0 || !erFrit(x, z)) {
      fjern(p);
      skud.splice(i, 1);
      continue;
    }
    ramning(p);
    // Død kan erstatte hele scenen og tømme listen. Gamle projektiler er da ugyldige.
    if (afbryd() || skud[i] !== p) return;
    if (p.liv <= 0) {
      fjern(p);
      skud.splice(i, 1);
    }
  }
}
