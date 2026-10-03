// Eventyrets regler er adskilt fra tegningen, så gemninger og kamp kan kontrolleres.
export const VERSION = 1;
export const VÅBEN = {
  sværd: { navn: "Kobbersværd", skade: 19, rækkevidde: 3.0, pause: .55, mana: 0 },
  bue: { navn: "Skovbue", skade: 15, rækkevidde: 24, pause: .7, mana: 0 },
  magi: { navn: "Krystalstav", skade: 25, rækkevidde: 18, pause: 1.0, mana: 14 },
};
export const OPGAVER = [
  { id: "mira", navn: "En stemme i landsbyen", tekst: "Tal med Mira ved brønden.", mål: 1, xp: 20, mønter: 12 },
  { id: "krystal", navn: "Lys i lommen", tekst: "Find 8 lyskrystaller på øen.", mål: 8, xp: 65, mønter: 35 },
  {
    id: "kiste",
    navn: "De glemte kort",
    tekst: "Åbn 3 skattekister i skoven og ruinerne.",
    mål: 3,
    xp: 70,
    mønter: 45,
  },
  { id: "vogter", navn: "Ruinerne vågner", tekst: "Berolig 4 stenvogtere med dine våben.", mål: 4, xp: 85, mønter: 55 },
  {
    id: "boss0",
    navn: "Mossets hemmelighed",
    tekst: "Find Mosvogteren på dybde 2 i Mosgrotten.",
    mål: 1,
    xp: 110,
    mønter: 70,
  },
  {
    id: "boss1",
    navn: "Spejlenes sang",
    tekst: "Find Krystalhjorten på dybde 2 i Spejlgrotten.",
    mål: 1,
    xp: 145,
    mønter: 85,
  },
  {
    id: "boss2",
    navn: "Det sidste segl",
    tekst: "Find Den gamle vogter på dybde 2 i Kobberdybet.",
    mål: 1,
    xp: 190,
    mønter: 110,
  },
  {
    id: "finale",
    navn: "Øens hjerte",
    tekst: "Bring de tre segl til Stjerneporten mod nord.",
    mål: 1,
    xp: 200,
    mønter: 100,
  },
];
export const GROTTENAVNE = ["Mosgrotten", "Spejlgrotten", "Kobberdybet"];
export const FJENDETYPER = {
  slim: { navn: "Mosslim", svaghed: "sværd", hint: "Sværdet spreder mossets bløde lys." },
  stenvogter: { navn: "Stenvogter", svaghed: "magi", hint: "Magi løsner lyset i dens sten." },
  krystaldyr: { navn: "Krystaldyr", svaghed: "bue", hint: "Buen finder sprækker mellem krystallerne." },
};
export const VALG = { autosigte: true, roligeEffekter: false, vejviser: true, kamera: 1 };

// Rejsen består kun af JSON-data; ældre Safari kan også tage en selvstændig kopi.
export function kopiRejse(s) {
  return typeof structuredClone === "function" ? structuredClone(s) : JSON.parse(JSON.stringify(s));
}

// Frøet er et heltal; samme gemte besøg giver altid præcis de samme rum.
export function tilfældig(frø) {
  let t = frø >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let n = Math.imul(t ^ t >>> 15, t | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

// Hvert nyt grottebesøg vælger en ny, sammenhængende kæde med sidekamre.
export function danGrotte(frø, id, dybde) {
  const rnd = tilfældig((frø + id * 7879 + dybde * 314159) >>> 0);
  const rum = [{ x: 0, z: 0, afstand: 0 }];
  const kendt = new Map([["0,0", rum[0]]]);
  const retninger = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let forsøg = 0;
  while (rum.length < 10 + id * 2 + dybde * 2 && forsøg++ < 5000) {
    const fra = rum[Math.floor(rnd() * rum.length)];
    const [dx, dz] = retninger[Math.floor(rnd() * 4)];
    const x = fra.x + dx, z = fra.z + dz, nøgle = `${x},${z}`;
    if (kendt.has(nøgle)) continue;
    const nyt = { x, z, afstand: fra.afstand + 1 };
    rum.push(nyt);
    kendt.set(nøgle, nyt);
  }
  // En faktisk korteste vej udpeger målrummet, også når rummene danner sløjfer.
  const kø = [rum[0]], besøg = new Set(["0,0"]);
  for (let i = 0; i < kø.length; i++) {
    const fra = kø[i];
    for (const [dx, dz] of retninger) {
      const n = `${fra.x + dx},${fra.z + dz}`;
      if (!kendt.has(n) || besøg.has(n)) continue;
      const nyt = kendt.get(n);
      nyt.afstand = fra.afstand + 1;
      besøg.add(n);
      kø.push(nyt);
    }
  }
  const slut = rum.reduce((a, b) => a.afstand > b.afstand ? a : b);
  const ting = [];
  for (const [i, r] of rum.entries()) {
    if (i === 0 || r === slut) continue;
    ting.push({
      id: `rum${i}`,
      type: i % 4 === 0 ? "kiste" : i % 3 === 0 ? "krystal" : "fjende",
      art: ["slim", "stenvogter", "krystaldyr"][(i + id) % 3],
      x: r.x * 8 + (rnd() - .5) * 3,
      z: r.z * 8 + (rnd() - .5) * 3,
    });
  }
  return { rum, slut, ting, frø, id, dybde };
}

// Rummenes gulvareal bestemmer bevægelse; der kan aldrig gås gennem en ydervæg.
export function kanGå(grotte, x, z, radius = .45) {
  const kendt = new Set(grotte.rum.map((r) => `${r.x},${r.z}`));
  return [[x - radius, z - radius], [x + radius, z - radius], [x - radius, z + radius], [x + radius, z + radius]]
    .every(([a, b]) => kendt.has(`${Math.floor((a + 4) / 8)},${Math.floor((b + 4) / 8)}`));
}

export function nyRejse(frø = Math.floor(Math.random() * 4294967295)) {
  return {
    version: VERSION,
    frø: frø >>> 0,
    x: 0,
    z: 5,
    hp: 100,
    mana: 100,
    xp: 0,
    mønter: 0,
    våben: "sværd",
    udstyr: 0,
    eliksirer: 3,
    opgaver: {},
    hentet: [],
    beroliget: [],
    besøg: [0, 0, 0],
    grotte: null,
    lyd: true,
    valg: { ...VALG },
    vejledning: 0,
  };
}

// Et forkert eller ufuldstændigt save afvises i stedet for at skabe et halvt eventyr.
export function læsRejse(tekst) {
  try {
    const s = typeof tekst === "string" ? JSON.parse(tekst) : tekst;
    if (!s || s.version !== VERSION || !Number.isInteger(s.frø) || s.frø < 0 || s.frø > 4294967295) return null;
    for (const n of ["x", "z", "hp", "mana", "xp", "mønter", "udstyr", "eliksirer"]) {
      if (!Number.isFinite(s[n])) return null;
    }
    if (
      Math.abs(s.x) > 200 || Math.abs(s.z) > 200 || s.xp < 0 || s.xp > 100000 || s.mønter < 0 || s.mønter > 100000 ||
      s.hp < 0 ||
      s.mana < 0 || s.mana > 100
    ) return null;
    if (
      !Number.isInteger(s.udstyr) || s.udstyr < 0 || s.udstyr > 3 || !Number.isInteger(s.eliksirer) ||
      s.eliksirer < 0 ||
      s.eliksirer > 99 || !VÅBEN[s.våben]
    ) return null;
    // Det største lovlige liv følger niveauet. Lidt for højt liv fra ældre data kan stadig repareres.
    if (s.hp > Math.max(300, maxLiv(s))) return null;
    if (!s.opgaver || typeof s.opgaver !== "object" || Array.isArray(s.opgaver)) return null;
    for (const k of Object.keys(s.opgaver)) {
      if (
        !OPGAVER.some((o) => o.id === k) || !Number.isInteger(s.opgaver[k]) || s.opgaver[k] < 0 || s.opgaver[k] > 10000
      ) {
        return null;
      }
    }
    for (const k of ["hentet", "beroliget"]) {
      if (
        !Array.isArray(s[k]) || s[k].length > 2000 || s[k].some((v) => typeof v !== "string" || v.length > 90) ||
        new Set(s[k]).size !== s[k].length
      ) return null;
    }
    if (
      !Array.isArray(s.besøg) || s.besøg.length !== 3 || s.besøg.some((n) => !Number.isInteger(n) || n < 0 || n > 10000)
    ) {
      return null;
    }
    if (
      s.grotte &&
      (![0, 1, 2].includes(s.grotte.id) || ![1, 2].includes(s.grotte.dybde) || !Number.isInteger(s.grotte.frø) ||
        s.grotte.frø < 0 || s.grotte.frø > 4294967295)
    ) return null;
    const kopi = kopiRejse(s);
    kopi.hp = Math.min(kopi.hp, maxLiv(kopi));
    kopi.lyd = s.lyd !== false;
    // Nye valg er valgfrie i v1; gamle eventyr fortsætter med sikre standarder.
    kopi.valg = { ...VALG };
    if (s.valg && typeof s.valg === "object" && !Array.isArray(s.valg)) {
      for (const k of ["autosigte", "roligeEffekter", "vejviser"]) {
        if (typeof s.valg[k] === "boolean") kopi.valg[k] = s.valg[k];
      }
      if (Number.isFinite(s.valg.kamera)) kopi.valg.kamera = Math.max(.4, Math.min(1.8, s.valg.kamera));
    }
    kopi.vejledning = Number.isInteger(s.vejledning) ? Math.max(0, Math.min(4, s.vejledning)) : s.opgaver.mira ? 4 : 0;
    if (!s.grotte && (Math.abs(s.x) > 68 || Math.abs(s.z) > 68)) {
      kopi.x = 0;
      kopi.z = 5;
    }
    if (s.grotte && !kanGå(danGrotte(s.grotte.frø, s.grotte.id, s.grotte.dybde), s.x, s.z)) {
      kopi.x = 0;
      kopi.z = 0;
    }
    return kopi;
  } catch {
    return null;
  }
}

export function niveau(s) {
  return 1 + Math.floor(Math.sqrt(s.xp / 90));
}
export function maxLiv(s) {
  return 100 + (niveau(s) - 1) * 14 + s.udstyr * 10;
}
export function næsteOpgave(s) {
  return OPGAVER.find((o) => (s.opgaver[o.id] || 0) < o.mål) || null;
}
export function alleSegl(s) {
  return [0, 1, 2].every((i) => s.opgaver[`boss${i}`] >= 1);
}

// Belønningen gives kun den ene gang, hvor en opgave bliver færdig.
export function fremskridt(s, id, antal = 1) {
  const o = OPGAVER.find((v) => v.id === id);
  if (!o) return null;
  const før = s.opgaver[id] || 0;
  s.opgaver[id] = Math.min(o.mål, før + antal);
  if (før < o.mål && s.opgaver[id] >= o.mål) {
    s.xp += o.xp;
    s.mønter += o.mønter;
    s.hp = maxLiv(s);
    s.mana = 100;
    return o;
  }
  return null;
}

// Sværdet er bredt og tæt; buen kræver sigte; magien spreder sig og bruger energi.
export function skade(s, art) {
  const bonus = 1 + (niveau(s) - 1) * .12 + s.udstyr * .2;
  const svaghed = FJENDETYPER[art]?.svaghed;
  return Math.round(VÅBEN[s.våben].skade * bonus * (svaghed === s.våben ? 1.4 : 1));
}
export function sværdRammer(fra, til, retning) {
  const dx = til.x - fra.x, dz = til.z - fra.z, d = Math.hypot(dx, dz);
  return d <= 3.0 && (d < .1 || (dx * retning.x + dz * retning.z) / d > .15);
}

// Landsbyens værksted opgraderer alle tre våben og rustningen sammen.
export function opgradér(s) {
  const pris = [60, 120, 220][s.udstyr];
  if (pris === undefined || s.mønter < pris) return false;
  s.mønter -= pris;
  s.udstyr++;
  s.hp = maxLiv(s);
  return true;
}
export function drik(s) {
  if (s.eliksirer <= 0 || (s.hp >= maxLiv(s) && s.mana >= 100)) return false;
  s.eliksirer--;
  s.hp = Math.min(maxLiv(s), s.hp + 75);
  s.mana = 100;
  return true;
}
export function givEliksirer(s, antal) {
  const før = s.eliksirer;
  s.eliksirer = Math.min(99, s.eliksirer + Math.max(0, antal));
  return s.eliksirer - før;
}

// Et mål i en anden grotte leder først til udgangen; døde vogtere er aldrig spor.
export function bossSpor(s, id, fjender, steder) {
  if (!s.grotte) return null;
  const udgang = steder.find((v) => v.id === "bossudgang") || steder.find((v) => v.type === "udgang");
  if (s.grotte.id !== id) return udgang || steder[0];
  const boss = fjender.find((f) => f.boss && f.hp > 0 && f.grotte === id);
  if (boss) return boss.obj.position;
  if (s.grotte.dybde === 1) return steder.find((v) => v.type === "trappe") || udgang || steder[0];
  return udgang || steder[0];
}
export function startGrotte(s, id) {
  // Et nyt besøg erstatter netop denne grottes gamle rumsamlinger, ikke øens skatte.
  const forstavelse = `g${id}-`;
  s.hentet = s.hentet.filter((n) => !n.startsWith(forstavelse));
  s.beroliget = s.beroliget.filter((n) => !n.startsWith(forstavelse));
  s.besøg[id]++;
  const frø = (s.frø + Math.imul(s.besøg[id], 2654435761) + id * 4411) >>> 0;
  s.grotte = { id, dybde: 1, frø };
  s.x = 0;
  s.z = 0;
  return danGrotte(frø, id, 1);
}
