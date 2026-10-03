import { BILER, GARAGE, gulv, KOLLISIONER, nærmesteVej } from "./verden-data.js";

export function nyBil() {
  return {
    x: GARAGE.x,
    z: GARAGE.z - 8,
    y: 0.8,
    vinkel: Math.PI,
    fart: 0,
    vy: 0,
    sidelæns: 0,
    drej: 0,
    påJord: true,
    luftTid: 0,
    senesteHop: 0,
    nitro: 1,
    afstand: 0,
    slag: 0,
  };
}

// Opgraderinger påvirker faktiske tal i bevægelsen.
export function egenskaber(fremgang) {
  const bil = BILER.find((b) => b.id === fremgang.bil) || BILER[0];
  return {
    topfart: bil.fart + fremgang.motor * 4,
    kraft: bil.kraft + fremgang.motor * 2.1,
    greb: bil.greb + fremgang.hjul * 0.14,
    sand: 0.55 + fremgang.hjul * 0.12,
    nitroTid: 2.5 + fremgang.nitro * 1.6,
  };
}

// Små faste tidsskridt holder bilens sving og hop ens på tablet og computer.
export function kør(bil, input, fremgang, dt) {
  dt = Math.max(0, Math.min(1 / 30, dt));
  const e = egenskaber(fremgang), før = gulv(bil.x, bil.z, bil.y);
  const boost = input.nitro && input.gas > 0 && bil.nitro > 0.02;
  const greb = e.greb * (før.vej ? 1 : 0.77);
  const top = e.topfart * (før.vej ? 1 : e.sand) * (boost ? 1.38 : 1);
  bil.drej += (input.drej - bil.drej) * Math.min(1, dt * 7);
  if (bil.påJord) {
    const kraft = input.gas > 0 ? e.kraft * (boost ? 1.6 : 1) : input.gas < 0 ? -e.kraft * 0.68 : 0;
    bil.fart += kraft * dt;
    const modstand = (før.vej ? 0.15 : 0.35 - fremgang.hjul * 0.06) + Math.abs(bil.fart) * 0.016;
    bil.fart *= Math.max(0, 1 - modstand * dt);
    if (input.bremse) bil.fart *= Math.max(0, 1 - dt * 2.8);
    bil.fart = Math.max(-9, Math.min(top, bil.fart));
    const sving = bil.drej * Math.min(Math.abs(bil.fart) / 8, 1) * (1.28 / (1 + Math.abs(bil.fart) * 0.035)) *
      Math.sign(bil.fart) * greb;
    bil.vinkel += sving * dt * (input.bremse ? 1.3 : 1);
    bil.sidelæns += (bil.drej * bil.fart * (input.bremse ? 0.23 : 0.045) - bil.sidelæns) * Math.min(1, dt * greb * 4);
  }
  if (boost) bil.nitro = Math.max(0, bil.nitro - dt / e.nitroTid);
  else bil.nitro = Math.min(1, bil.nitro + dt * (0.045 + fremgang.nitro * 0.015));
  const dx = (Math.sin(bil.vinkel) * bil.fart + Math.cos(bil.vinkel) * bil.sidelæns) * dt;
  const dz = (Math.cos(bil.vinkel) * bil.fart - Math.sin(bil.vinkel) * bil.sidelæns) * dt;
  bil.x += dx;
  bil.z += dz;
  bil.afstand += Math.hypot(dx, dz);
  // Rækværker på de høje veje holder bilen væk fra brokanten.
  const kant = nærmesteVej(bil.x, bil.z);
  if (bil.påJord && før.vej && før.y > 8 && kant.afstand > kant.bredde / 2 - 2) {
    const d = (kant.bredde / 2 - 2.1) / Math.max(.01, kant.afstand);
    bil.x = kant.x + (bil.x - kant.x) * d;
    bil.z = kant.z + (bil.z - kant.z) * d;
    bil.fart *= .7;
    bil.sidelæns = 0;
    bil.slag = .2;
  }
  const efter = gulv(bil.x, bil.z, bil.y), fod = efter.y + 0.8;
  if (bil.påJord && bil.y - fod > 0.23) {
    bil.påJord = false;
    bil.vy = Math.min(14, Math.max(0, bil.vy));
    bil.luftTid = 0;
  }
  if (bil.påJord) {
    const stigning = (efter.y - før.y) / Math.max(0.05, Math.hypot(dx, dz));
    bil.vy = Math.min(13, Math.max(-10, stigning * Math.abs(bil.fart)));
    bil.fart -= stigning * 9.5 * dt;
    bil.y = fod;
  } else {
    bil.vy -= 19 * dt;
    bil.y += bil.vy * dt;
    bil.luftTid += dt;
    if (bil.y <= fod) {
      bil.y = fod;
      bil.påJord = true;
      bil.senesteHop = bil.luftTid;
      bil.vy = 0;
      bil.fart *= bil.luftTid > 0.45 ? 0.83 : 0.98;
    }
  }
  bil.slag = Math.max(0, bil.slag - dt);
  // Runde sikkerhedszoner følger bygningerne. Et sammenstød stopper og skubber bilen fri.
  for (const k of KOLLISIONER) {
    const afstand = Math.hypot(bil.x - k.x, bil.z - k.z);
    if (afstand < k.r + 2 && Math.abs(bil.y - k.y) < 9) {
      const nx = afstand > 0.001 ? (bil.x - k.x) / afstand : 1;
      const nz = afstand > 0.001 ? (bil.z - k.z) / afstand : 0;
      bil.x = k.x + nx * (k.r + 2.1);
      bil.z = k.z + nz * (k.r + 2.1);
      bil.fart *= -0.17;
      bil.sidelæns *= 0.2;
      bil.slag = 0.4;
    }
  }
  // Verdenskanten er en blød barriere, og redning er altid tilgængelig.
  if (Math.abs(bil.x) > 435 || Math.abs(bil.z) > 405) {
    bil.x = Math.max(-435, Math.min(435, bil.x));
    bil.z = Math.max(-405, Math.min(405, bil.z));
    bil.fart *= -0.25;
  }
  return bil;
}
