import { friLinje } from "./navigation.js";

// Projektiler stopper ved vægge og ved områdeskift, også midt i en skadescallback.
export function opdatérFlyvere(skud, dt, { erFrit, ramning, fjern, afbryd }) {
  for (let i = skud.length - 1; i >= 0; i--) {
    if (afbryd()) return;
    const p = skud[i];
    if (!p) return;
    const fra = { x: p.obj.position.x, z: p.obj.position.z };
    p.liv -= dt;
    p.obj.position.x += p.dx * dt;
    p.obj.position.z += p.dz * dt;
    if (p.dy) p.obj.position.y += p.dy * dt;
    const x = p.obj.position.x, z = p.obj.position.z;
    if (
      p.liv <= 0 || p.dy < 0 && p.obj.position.y < .15 || !erFrit(x, z) ||
      !friLinje(fra, { x, z }, erFrit, .2)
    ) {
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
