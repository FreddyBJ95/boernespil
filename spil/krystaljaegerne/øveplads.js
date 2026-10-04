// Tre skiver nær landsbyen giver en kort, gratis prøve af hvert våben.
const VÅBEN = ['sværd', 'bue', 'magi'];
const ANVISNING = {
  sværd: 'Gå tæt på, vælg Sværd og brug Slå.',
  bue: 'Vælg Bue og brug Skyd.',
  magi: 'Vælg Magi og brug Kast lys.',
};

// Hver øverunde får egne skiver; en ny runde ændrer aldrig den gemte belønning.
export function nyeØveskiver() {
  return [
    { id: 'øve-sværd', navn: 'Sværd · tæt på', våben: 'sværd', x: -3, z: 12, ramt: false },
    { id: 'øve-bue', navn: 'Bue · ram skiven', våben: 'bue', x: 0, z: 13, ramt: false },
    { id: 'øve-magi', navn: 'Magi · send lys', våben: 'magi', x: 3, z: 12, ramt: false },
  ];
}

// Kun en ny, rigtig våbenramning tæller. belønning er true præcis ved første fuldførelse.
export function ramØveskive(s, skive, våben, alleSkiver) {
  const svar = { ramt: false, fuldført: false, belønning: false, tip: '' };
  if (!s || !skive || !Array.isArray(alleSkiver) || !VÅBEN.includes(skive.våben)) return svar;
  const mål = alleSkiver.find(k => k.id === skive.id && k.våben === skive.våben);
  if (!mål) return svar;
  if (mål.ramt) return { ...svar, tip: 'Den skive er ramt. Prøv en af de andre.' };
  if (våben !== mål.våben) return { ...svar, tip: ANVISNING[mål.våben] };
  mål.ramt = true;
  skive.ramt = true;
  const fuldført = VÅBEN.every(v => alleSkiver.some(k => k.våben === v && k.ramt === true));
  if (fuldført) {
    const belønning = s.træning !== true;
    if (belønning) { s.xp += 15; s.mønter += 25; }
    s.træning = true;
    return { ramt: true, fuldført: true, belønning,
      tip: belønning ? 'Tre skiver, tre våben. +15 erfaring og +25 kobber.' : 'Alle tre skiver er ramt. Øverunden er klaret igen.',
    };
  }
  const næste = alleSkiver.find(k => !k.ramt && VÅBEN.includes(k.våben));
  return { ramt: true, fuldført: false, belønning: false, tip: `Godt ramt! ${næste ? ANVISNING[næste.våben] : ''}` };
}
