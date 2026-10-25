// ===== Bildelene og banerne =====
// Alt er i rigtige mål: meter, kilo og newton. Bygningerne er Nedrivningsfirmaets egne
// (spil/nedrivning/bygninger.js), så de vælter og knuses på samme måde som dér.

export const DELE = {
  hjul: [
    { id: 'vej', navn: 'Vejhjul', radius: 0.42, bred: 0.3 },
    { id: 'terræn', navn: 'Terrænhjul', radius: 0.58, bred: 0.42 },
    { id: 'monster', navn: 'Monsterhjul', radius: 0.85, bred: 0.66 },
  ],
  motor: [
    { id: 'racer', navn: 'Lynmotor', kraft: 16000, fart: 27, boost: 1 },
    { id: 'diesel', navn: 'Stærk motor', kraft: 26000, fart: 19, boost: 1 },
    { id: 'raket', navn: 'Raket', kraft: 16000, fart: 24, boost: 2.2 },
  ],
  front: [
    { id: 'kile', navn: 'Rambuk', masse: 650 },
    { id: 'plov', navn: 'Sneplov', masse: 450 },
    { id: 'let', navn: 'Kofanger', masse: 60 },
  ],
  last: [
    { id: 'tønde', navn: 'Benzintønder' },
    { id: 'gas', navn: 'Gasflasker' },
    { id: 'tnt', navn: 'TNT-kasser' },
    { id: 'fyrværkeri', navn: 'Fyrværkeri' },
    { id: 'tom', navn: 'Ingen last' },
  ],
};

// Rigtige billakker
export const FARVER = [0xb3241e, 0xe8a90c, 0x1f4fa8, 0x2f7d34, 0xe0621a, 0x17191c, 0xe9e9e4];
export const FARVENAVNE = ['Rød', 'Gul', 'Blå', 'Grøn', 'Orange', 'Sort', 'Hvid'];

export const STANDARD = { hjul: 'monster', motor: 'diesel', front: 'kile', last: 'tønde', antal: 2, farve: 0xb3241e };

// Bilen starter her og kører mod +x. Bygningen står midt på byggepladsen.
export const START = -34;

// byg: [bygning, valg] fra Nedrivningsfirmaet · ting: [type, x, z] sprængstof, der står klar
// rampe: hvor rampen ender, og hvor høj den er · stjerner: hvor mange procent der skal være væk
export const BANER = [
  { id: 'skur', navn: 'Det gamle skur', byg: [['træskur', { x: 6, z: 0 }]], ting: [['tønde', 10, 1.2], ['tønde', 10.4, -1.4]], stjerner: [40, 75, 98] },
  { id: 'murstenshus', navn: 'Murstenshuset', byg: [['murstenshus', { x: 10, z: 0 }]], ting: [['gas', 4.6, 2.6]], stjerner: [25, 50, 75] },
  { id: 'lagerhal', navn: 'Lagerhallen', byg: [['lagerhal', { x: 12, z: 0, yaw: Math.PI / 2 }]], ting: [['tønde', 13, -2], ['tønde', 13, 2]], stjerner: [20, 45, 70] },
  { id: 'vandtårn', navn: 'Vandtårnet', byg: [['vandtårn', { x: 10, z: -2.6 }]], ting: [], stjerner: [30, 70, 98] },
  { id: 'betonblok', navn: 'Betonblokken', byg: [['betonblok', { x: 12, z: 0, fagX: 3, fagZ: 2, etager: 3 }]], ting: [['tnt', 5.4, 2.5]], rampe: { x: -4, højde: 2.4, længde: 9 }, stjerner: [25, 60, 90] },
  { id: 'skorsten', navn: 'Skorstenen', byg: [['skorsten', { x: 9, z: 0, højde: 26 }]], ting: [['tønde', 7, 2.4]], stjerner: [30, 70, 98] },
];

export function del(type, id) {
  return DELE[type].find(d => d.id === id) || DELE[type][0];
}

export function stjerner(bane, procent) {
  return BANER[bane].stjerner.filter(g => procent >= g).length;
}

// Kun kendte dele og gyldige tal læses fra enhedens gemning.
export function normaliser(data = {}) {
  if (!data || typeof data !== 'object') data = {};
  const bil = { ...STANDARD };
  for (const type of Object.keys(DELE)) if (DELE[type].some(d => d.id === data[type])) bil[type] = data[type];
  bil.antal = [1, 2, 3].includes(data.antal) ? data.antal : STANDARD.antal;
  if (FARVER.includes(data.farve)) bil.farve = data.farve;
  return bil;
}
