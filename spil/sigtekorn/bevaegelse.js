// ===== Bevægelse som i Counter-Strike: fart, friktion, luft-styring, gå, dukke og hoppe =====
// Tallene er Source-motorens, omregnet til meter (1 enhed = 2,54 cm), og fysikken kører med fast tick
// (128 gange i sekundet), så bevægelserne føles ens hver gang — og man kan blive god til dem:
//  · på jorden accelererer man hurtigt og bremser med friktion (tryk modsat vej for at stoppe brat)
//  · i luften kan man kun styre lidt — men drejer man musen med, kan man strafe-hoppe og bunny-hoppe
//  · shift = gå (stille og præcist), C = duk (langsomt, men lille og meget præcist)

import * as THREE from "./three.js";

export const U = 0.0254;
export const FYSIK = {
  accel: 5.5,               // sv_accelerate
  luftAccel: 12,            // sv_airaccelerate
  friktion: 5.2,            // sv_friction
  stopFart: 80 * U,         // sv_stopspeed
  tyngde: 800 * U,          // sv_gravity
  hop: 301.993 * U,         // hoppets fart opad
  luftLoft: 30 * U,         // så meget kan man ændre farten pr. tick i luften (air strafe)
  trin: 18 * U,             // så højt et trin kan man gå op ad
  gå: 0.52, duk: 0.34,      // fart, når man går eller dukker sig
};
export const KROP = { b: 16 * U, høj: 72 * U, dukHøj: 54 * U, øje: 64 * U, dukØje: 46 * U };
export const TICK = 1 / 128;

// En aktør er en spiller eller en bot: fødderne, farten, hvor den kigger hen, og om den dukker sig
export function nyAktør(x, y, z, yaw = 0) {
  return { pos: new THREE.Vector3(x, y, z), forrige: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), jord: false,
    duk: 0, b: KROP.b, h: KROP.høj, yaw, pitch: 0, hopKlar: true, trådOp: 0, landet: 0 };
}

// Øjets højde over fødderne (glider, mens man dukker sig)
export const øjeHøjde = a => KROP.øje - (KROP.øje - KROP.dukØje) * a.duk;

// Ét tick. ind = { frem, side: -1..1, hop, gå, duk } · maxFart: våbnets fart (m/s) · verden: Kasseverden
export function bevæg(a, ind, dt, verden, maxFart) {
  a.forrige.copy(a.pos);
  // dukke sig og rejse sig igen. På jorden rejser man sig opad (kun hvis der er plads over hovedet).
  // I luften trækker man benene op, mens hovedet bliver, hvor det er — så kommer man højere op (crouch-jump som i CS)
  const førH = a.h;
  if (ind.duk) a.duk = Math.min(1, a.duk + dt / 0.2);
  else if (a.duk > 0) {
    const ny = Math.max(0, a.duk - dt / 0.2), nyH = KROP.høj - (KROP.høj - KROP.dukHøj) * ny;
    if (a.jord ? verden.fri(a.pos.x, a.pos.y, a.pos.z, a.b, KROP.høj) : verden.fri(a.pos.x, a.pos.y - (nyH - førH), a.pos.z, a.b, nyH)) a.duk = ny;
  }
  a.h = KROP.høj - (KROP.høj - KROP.dukHøj) * a.duk;
  if (!a.jord && a.h !== førH) { a.pos.y += førH - a.h; a.forrige.y += førH - a.h; }

  // den vej, man gerne vil (frem/tilbage og til siden ud fra, hvor man kigger)
  const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw), hx = Math.cos(a.yaw), hz = -Math.sin(a.yaw);
  let ønskX = fx * ind.frem + hx * ind.side, ønskZ = fz * ind.frem + hz * ind.side;
  const l = Math.hypot(ønskX, ønskZ);
  if (l > 1e-6) { ønskX /= l; ønskZ /= l; }
  const ønsketFart = l > 1e-6 ? maxFart * (ind.gå ? FYSIK.gå : 1) * (a.duk > 0.5 ? FYSIK.duk : 1) : 0;

  // hop (kun et nyt tryk — men på samme tick som man lander, så friktionen ikke når at bremse: bunny hop)
  let hoppede = false;
  if (a.jord && ind.hop && a.hopKlar) { a.vel.y = FYSIK.hop; a.jord = false; a.hopKlar = false; hoppede = true; }
  if (!ind.hop) a.hopKlar = true;

  if (a.jord) {
    friktion(a, dt);
    accelerer(a, ønskX, ønskZ, ønsketFart, l > 1e-6 ? maxFart : 0, FYSIK.accel, dt);
  } else {
    luftAccelerer(a, ønskX, ønskZ, ønsketFart, dt);
  }
  a.vel.y -= FYSIK.tyngde * dt;
  const varPåJorden = a.jord;
  a.trådOp = 0;
  verden.bevæg(a, a.vel.x * dt, a.vel.y * dt, a.vel.z * dt, varPåJorden, FYSIK.trin);
  if (varPåJorden && !a.jord && !hoppede) {                         // ned ad trin uden at "falde" et stykke hver gang
    let g = -Infinity;
    for (const [ox, oz] of [[0, 0], [-a.b, -a.b], [a.b, -a.b], [-a.b, a.b], [a.b, a.b]]) g = Math.max(g, verden.gulv(a.pos.x + ox, a.pos.y, a.pos.z + oz));
    if (a.pos.y - g <= FYSIK.trin + 0.01 && verden.fri(a.pos.x, g + 0.0005, a.pos.z, a.b, a.h)) { a.pos.y = g + 0.0005; a.jord = true; a.vel.y = 0; }
  }
  if (a.jord && !varPåJorden) a.landet = 1;                         // til våbnets rystelse og lyden af landingen
  return hoppede;
}

// Friktion på jorden: under stopfarten bremser man med en fast mængde, så man står helt stille hurtigt
function friktion(a, dt) {
  const fart = Math.hypot(a.vel.x, a.vel.z);
  if (fart < 0.001) { a.vel.x = a.vel.z = 0; return; }
  const kontrol = fart < FYSIK.stopFart ? FYSIK.stopFart : fart;
  const ny = Math.max(0, fart - kontrol * FYSIK.friktion * dt);
  a.vel.x *= ny / fart; a.vel.z *= ny / fart;
}
// Acceleration på jorden: op mod den ønskede fart i den ønskede retning. Som i CS:GO accelererer man med
// våbnets fulde fart (fuld), også når man går stille eller dukker sig — ellers vinder friktionen
function accelerer(a, ux, uz, ønsket, fuld, accel, dt) {
  if (ønsket <= 0) return;
  const nu = a.vel.x * ux + a.vel.z * uz, mangler = ønsket - nu;
  if (mangler <= 0) return;
  const tilføj = Math.min(accel * dt * fuld, mangler);
  a.vel.x += ux * tilføj; a.vel.z += uz * tilføj;
}
// I luften: man kan kun tilføje lidt fart i den retning, man trykker — men kigger man samme vej, som man
// strafer, drejer farten med (det er hemmeligheden bag strafe-hop)
function luftAccelerer(a, ux, uz, ønsket, dt) {
  if (ønsket <= 0) return;
  const loft = Math.min(ønsket, FYSIK.luftLoft);
  const nu = a.vel.x * ux + a.vel.z * uz, mangler = loft - nu;
  if (mangler <= 0) return;
  const tilføj = Math.min(FYSIK.luftAccel * ønsket * dt, mangler);
  a.vel.x += ux * tilføj; a.vel.z += uz * tilføj;
}
