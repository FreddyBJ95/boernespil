// ===== Våbnene: skade, kadence, magasin, spredning og rekylmønstre =====
// Som i CS rammer man præcist, når man står stille (og endnu mere præcist dukket). Løber man, spredes
// skuddene meget, og i luften rammer man næsten ingenting. Hvert gevær har et FAST rekylmønster:
// skuddene går op og så til siderne i samme mønster hver gang — så man kan lære at trække musen imod.
// Kameraet følger kun 45 % af rekylen med, så kuglerne lander over sigtekornet, hvis man ikke styrer.

import { U } from "./bevaegelse.js";

const G = Math.PI / 180;
// Stormgeværets mønster: [op, højre] i grader for hvert skud (samlet fra første skud)
const STORM = [[0, 0], [0.55, 0.05], [1.35, 0.1], [2.35, 0.05], [3.45, -0.1], [4.55, -0.3], [5.55, -0.55], [6.4, -0.7], [7.05, -0.6], [7.5, -0.3],
  [7.75, 0.2], [7.9, 0.8], [8.0, 1.4], [8.05, 1.9], [8.1, 2.3], [8.1, 2.5], [8.15, 2.4], [8.2, 2.1], [8.25, 1.6], [8.3, 1.0],
  [8.35, 0.4], [8.3, -0.2], [8.3, -0.8], [8.35, -1.3], [8.4, -1.6], [8.45, -1.7], [8.5, -1.5], [8.5, -1.0], [8.55, -0.4], [8.6, 0.2]];
const PISTOL = [[0, 0], [0.9, 0.1], [1.7, -0.15], [2.4, 0.2], [3.0, -0.1], [3.4, 0.25], [3.7, -0.2], [3.9, 0.15], [4.0, 0], [4.1, 0.2], [4.2, -0.1], [4.3, 0.1]];

export const VÅBEN = {
  gevær: { navn: "Stormgevær", tast: 1, plads: 0, auto: true, kadence: 0.1, skade: 36, panser: 0.775, rækkevidde: 0.98, magasin: 30, reserve: 90, genlad: 2.4,
    fart: 215 * U, stå: 0.0048, duk: 0.0033, bevæg: 0.173, hop: 0.47, skudUro: 0.0078, uroTid: 0.35, spredning: 0.0006, mønster: STORM, træk: 0.75 },
  snig: { navn: "Snigskytte", tast: 1, plads: 0, auto: false, kadence: 1.46, skade: 115, panser: 0.97, rækkevidde: 0.99, magasin: 5, reserve: 30, genlad: 3.6,
    fart: 200 * U, kikkertFart: 100 * U, stå: 0.0011, duk: 0.0009, udenKikkert: 0.11, bevæg: 0.25, hop: 0.5, skudUro: 0.1, uroTid: 0.4, spredning: 0.0002,
    zoom: [40, 15], træk: 1.1 },
  pistol: { navn: "Pistol", tast: 2, plads: 1, auto: false, kadence: 0.15, skade: 30, panser: 0.47, rækkevidde: 0.85, magasin: 12, reserve: 48, genlad: 2.2,
    fart: 240 * U, stå: 0.0055, duk: 0.0045, bevæg: 0.034, hop: 0.29, skudUro: 0.045, uroTid: 0.3, spredning: 0.002, mønster: PISTOL, træk: 0.5 },
  kniv: { navn: "Kniv", tast: 3, plads: 2, nærkamp: true, kadence: 0.45, skade: 40, stik: 65, rækkevidde: 1.7, fart: 250 * U, træk: 0.4 },
};
// Hvor meget hver del af kroppen tæller (som i CS: hovedet giver fire gange så meget)
export const KROPSDEL = { hoved: 4, krop: 1, mave: 1.25, ben: 0.75 };

// Et våben, som en spiller eller bot har: skud tilbage, reserve, og hvor "uroligt" det er lige nu
export function nytVåben(id) {
  const d = VÅBEN[id];
  return { id, d, skud: d.magasin ?? 0, reserve: d.reserve ?? 0, klar: 0, genlader: 0, rekyl: 0, uro: 0, pause: 1, kikkert: 0 };
}

// Hvor upræcist er næste skud (radianer)? a = skytten (fart, jord, duk)
export function unøjagtighed(v, a) {
  const d = v.d;
  if (d.nærkamp) return 0;
  const fart = Math.hypot(a.vel.x, a.vel.z), maks = (v.kikkert && d.kikkertFart) || d.fart;
  let u = a.duk > 0.5 ? d.duk : d.stå;
  if (d.udenKikkert && !v.kikkert) u = d.udenKikkert;
  const f = Math.max(0, Math.min(1, (fart - maks * 0.34) / (maks * 0.66)));   // under gå-fart rammer man stadig godt
  u += d.bevæg * f * f;
  if (!a.jord) u += d.hop;
  return u + v.uro;
}

// Retningen for næste kugle: sigtet + rekylmønsteret + en tilfældig spredning (mest i midten)
export function skudRetning(v, a, yaw, pitch, rnd = Math.random) {
  const m = v.d.mønster, i = m ? Math.min(Math.floor(v.rekyl), m.length - 1) : 0;
  const [op, højre] = m ? m[i] : [0, 0];
  const r = (unøjagtighed(v, a) + (v.d.spredning || 0)) * rnd(), vinkel = rnd() * Math.PI * 2;
  return { yaw: yaw - højre * G + Math.cos(vinkel) * r, pitch: pitch + op * G + Math.sin(vinkel) * r };
}
// Den del af rekylen, kameraet følger med (CS: 45 %), i radianer [pitch, yaw]
export function synligRekyl(v) {
  const m = v.d.mønster;
  if (!m || v.rekyl <= 0) return [0, 0];
  const i = Math.min(v.rekyl, m.length - 1), a = m[Math.floor(i)], b = m[Math.min(m.length - 1, Math.floor(i) + 1)], t = i - Math.floor(i);
  return [(a[0] + (b[0] - a[0]) * t) * G * 0.45, -(a[1] + (b[1] - a[1]) * t) * G * 0.45];
}
export function retningsvektor(yaw, pitch, ud) {
  const c = Math.cos(pitch);
  return ud.set(-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c);
}

// Kan der skydes nu? (og brug et skud)
export function affyr(v) {
  if (v.klar > 0 || v.genlader > 0) return false;
  if (v.d.nærkamp) { v.klar = v.d.kadence; return true; }
  if (v.skud <= 0) return false;
  v.skud--; v.klar = v.d.kadence; v.pause = 0;
  return true;
}
// Efter et skud: rekylen og uroen vokser (kaldes, når retningen er regnet ud)
export function efterSkud(v) {
  v.rekyl += 1; v.uro += v.d.skudUro || 0;
  if (v.d.zoom && v.kikkert) v.kikkert = -v.kikkert;               // snigskytten: kikkerten går af, mens man lader
}
// Hvert tick: nedtælling, genladning, og rekylen falder til ro, når man holder pause
export function opdaterVåben(v, dt) {
  v.klar = Math.max(0, v.klar - dt);
  v.pause += dt;
  if (v.uro > 0) v.uro *= Math.exp(-dt / ((v.d.uroTid || 0.3) / 3));
  if (v.pause > (v.d.kadence || 0.1) * 1.3) v.rekyl *= Math.exp(-dt / 0.16);
  if (v.rekyl < 0.05) v.rekyl = 0;
  if (v.d.zoom && v.kikkert < 0 && v.klar <= 0) v.kikkert = -v.kikkert;   // kikkerten kommer på igen
  if (v.genlader > 0 && (v.genlader -= dt) <= 0) {
    v.genlader = 0;
    const tag = Math.min(v.d.magasin - v.skud, v.reserve);
    v.skud += tag; v.reserve -= tag;
  }
}
export function genlad(v) {
  if (v.d.nærkamp || v.genlader > 0 || v.skud >= v.d.magasin || v.reserve <= 0) return false;
  v.genlader = v.d.genlad; v.kikkert = 0;
  return true;
}
// Hvor meget skade gør et skud? Panser tager noget af det (men ikke på benene)
export function skade(v, del, offer, afstand, stik = false) {
  const d = v.d;
  let s = (stik ? d.stik : d.skade) * (d.rækkevidde ? Math.pow(d.rækkevidde, afstand / (500 * U)) : 1) * (d.nærkamp ? 1 : KROPSDEL[del]);
  let panser = 0;
  if (offer.panser > 0 && del !== "ben" && !d.nærkamp) {
    const hp = s * d.panser; panser = Math.min(offer.panser, (s - hp) * 0.5); s = hp;
  }
  return { liv: Math.round(s), panser: Math.round(panser) };
}
