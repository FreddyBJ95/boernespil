// ===== Våbnene: skud, aftrækker, spredning, rekyl, genladning og skade (selve våbnene står i katalog.js) =====
// Som i CS rammer man præcist, når man står stille (og endnu mere præcist dukket). Løber man, spredes
// skuddene meget, og i luften rammer man næsten ingenting. Hvert gevær har et FAST rekylmønster:
// skuddene går op og så til siderne i samme mønster hver gang — så man kan lære at trække musen imod.
// Kameraet følger kun 45 % af rekylen med, så kuglerne lander over sigtekornet, hvis man ikke styrer.

import { U } from "./bevaegelse.js";
import { ALLE } from "./katalog.js";

const G = Math.PI / 180;
// Alle våben (fra kataloget): id → egenskaber
export const VÅBEN = ALLE;
// Hvor meget hver del af kroppen tæller (som i CS: hovedet giver fire gange så meget)
export const KROPSDEL = { hoved: 4, krop: 1, mave: 1.25, arm: 1, ben: 0.75 };

// Et våben, som en spiller eller bot har: skud tilbage, reserve, og hvor "uroligt" det er lige nu
export function nytVåben(id) {
  const d = VÅBEN[id] || VÅBEN.pistol;
  return { id: VÅBEN[id] ? id : "pistol", d, skud: d.magasin ?? 0, reserve: d.reserve ?? 0, klar: 0, genlader: 0, rekyl: 0, uro: 0, pause: 1, kikkert: 0, kø: 0, spin: 0, holdtFør: false };
}
// Aftrækkeren, hvert tick: skal der gå et skud af nu? holdt = aftrækkeren er trykket ned.
// Automatvåben skyder, så længe man holder; de andre kun, når man trykker igen (botterne trykker hver gang).
// Salvegeværet skyder tre skud pr. tryk, og minigunnen skal snurre op, før den skyder.
export function aftrækker(v, holdt, dt, bot = false) {
  const d = v.d, nyt = holdt && !v.holdtFør; v.holdtFør = holdt;
  if (d.opspin) v.spin = holdt && v.genlader <= 0 ? Math.min(d.opspin, v.spin + dt) : Math.max(0, v.spin - dt * 1.5);
  if (v.kø > 0) {                                                   // resten af salven
    if (v.klar > 0) return false;
    if (!affyr(v)) { v.kø = 0; return false; }
    v.kø--; v.klar = v.kø > 0 ? d.salveTid : d.kadence;
    return true;
  }
  if (!holdt || v.klar > 0 || v.genlader > 0 || (v.skud <= 0 && !d.nærkamp)) return false;   // (en kniv har ingen patroner)
  if (d.opspin && v.spin < d.opspin) return false;
  if (!d.auto && !nyt && !bot) return false;
  if (!affyr(v)) return false;
  if (d.salve) { v.kø = d.salve - 1; v.klar = d.salveTid; }
  return true;
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
  if (v.d.zoom && v.kikkert && v.d.kadence > 0.8) v.kikkert = -v.kikkert;   // snigskytterne: kikkerten går af, mens man lader
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
