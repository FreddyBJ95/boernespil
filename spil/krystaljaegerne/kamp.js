import { VÅBEN } from "./eventyr.js";

const UDLØSNING = Object.freeze({ sværd: .35, bue: .55, magi: .4 });
const tal = (værdi, standard) => Number.isFinite(værdi) ? værdi : standard;

// Animation og kamp deler våbnets eksisterende pause; der indføres ingen ekstra ventetid.
export function angribVarighed(våben) {
  return Object.prototype.hasOwnProperty.call(UDLØSNING, våben) ? VÅBEN[våben].pause : 0;
}

// Root giver kun det forrige slag videre, når sværdets kombination skal fortsætte.
export function vælgSlag(forrige) {
  const slag = typeof forrige === "number" ? forrige : forrige?.type === "sværd" ? forrige.slag : 0;
  return slag === 1 ? 2 : 1;
}

// Et angreb fastholder startpunkt, retning og udstyr, selv om helten går eller skifter senere.
export function startAngreb(våben, oplysninger = {}, forrige = null) {
  const varighed = angribVarighed(våben);
  if (!varighed) return null;
  const s = oplysninger || {};
  return Object.freeze({
    type: våben,
    tid: 0,
    fremskridt: 0,
    slået: false,
    varighed,
    slag: våben === "sværd" ? vælgSlag(forrige) : 1,
    x: tal(s.x, 0),
    z: tal(s.z, 0),
    dx: tal(s.dx, 0),
    dz: tal(s.dz, -1),
    skade: Math.max(0, tal(s.skade, VÅBEN[våben].skade)),
    art: typeof s.art === "string" ? s.art : null,
    udstyr: Math.max(0, Math.trunc(tal(s.udstyr, 0))),
    niveau: Math.max(1, Math.trunc(tal(s.niveau, 1))),
  });
}

// Hvert nyt trin er en selvstændig record. Også et helt oversprunget angreb udløser præcis én gang.
export function opdatérAngreb(angreb, dt) {
  if (!angreb) return { angreb: null, udløs: false, færdig: true };
  const færdig = angreb.tid >= angreb.varighed;
  if (færdig || !Number.isFinite(dt) || dt <= 0) return { angreb, udløs: false, færdig };
  const tid = Math.min(angreb.varighed, angreb.tid + dt);
  const udløs = !angreb.slået && tid >= angreb.varighed * UDLØSNING[angreb.type];
  const næste = Object.freeze({
    ...angreb,
    tid,
    fremskridt: tid / angreb.varighed,
    slået: angreb.slået || udløs,
  });
  // Den færdige record afleveres stadig: root håndterer udløs før angreb sættes til null.
  return { angreb: næste, udløs, færdig: tid >= angreb.varighed };
}
