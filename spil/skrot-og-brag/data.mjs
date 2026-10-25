// Delene er frit tilgængelige: prøv en ny konstruktion efter hvert styrt.
export const DELE = {
  hjul: [
    { id: 'vej', navn: 'Små hjul', radius: .68, greb: 1.7 },
    { id: 'monster', navn: 'Monsterhjul', radius: 1.05, greb: 2.4 },
    { id: 'hop', navn: 'Hoppehjul', radius: .85, greb: 1.5 },
  ],
  motor: [
    { id: 'racer', navn: 'Lynmotor', kraft: 100, fart: 34 },
    { id: 'diesel', navn: 'Stærk motor', kraft: 160, fart: 25 },
    { id: 'raket', navn: 'Raket', kraft: 115, fart: 31 },
  ],
  front: [
    { id: 'kile', navn: 'Rambuk', masse: 8 },
    { id: 'plov', navn: 'Skovl', masse: 5 },
    { id: 'let', navn: 'Kofanger', masse: 1 },
  ],
  last: [
    { id: 'benzin', navn: 'Ildtønder', farve: '#ff8a1f' },
    { id: 'gas', navn: 'Grøn sky', farve: '#3ccf4e' },
    { id: 'tnt', navn: 'Dynamit', farve: '#ef3b3b' },
    { id: 'blaa', navn: 'Blå bølge', farve: '#2f9bff' },
    { id: 'lilla', navn: 'Lilla hvirvel', farve: '#a45cff' },
    { id: 'tom', navn: 'Ingen last', farve: '#b8c2cc' },
  ],
  fører: [
    { id: 'bjørn', navn: 'Bjørn' },
    { id: 'gris', navn: 'Gris' },
    { id: 'frø', navn: 'Frø' },
    { id: 'kat', navn: 'Kat' },
  ],
};

// Lakeringen vælges blandt stærke legetøjsfarver.
export const FARVER = ['#ff4d4d', '#ff9f1c', '#ffd23f', '#3ecf6e', '#3a86ff', '#9b5de5', '#ff70a6'];
export const FARVENAVNE = ['Rød', 'Orange', 'Gul', 'Grøn', 'Blå', 'Lilla', 'Lyserød'];

export const STANDARD = { hjul: 'monster', motor: 'diesel', front: 'kile', last: 'blaa', antal: 3, farve: '#ff4d4d', fører: 'bjørn' };

// Hver bane er ét mål, man kører direkte ind i. Stjernerne gives for hvor meget der vælter.
export const BANER = [
  { id: 'hus', navn: 'Det lille hus', stjerner: [30, 60, 85] },
  { id: 'bunke', navn: 'Klodsbjerget', stjerner: [30, 60, 85] },
  { id: 'tårn', navn: 'Regnbuetårnet', stjerner: [25, 50, 80] },
  { id: 'slot', navn: 'Slottet', stjerner: [25, 50, 75] },
  { id: 'hop', navn: 'Det store hop', stjerner: [25, 50, 80], rampe: true },
];

export function del(type, id) {
  return DELE[type].find(d => d.id === id) || DELE[type][0];
}

// Antal stjerner for en procentdel af målet, der er væltet.
export function stjerner(bane, procent) {
  return BANER[bane].stjerner.filter(grænse => procent >= grænse).length;
}

// Kun kendte dele og små, gyldige værdier læses fra enhedens gemning.
export function normaliser(data = {}) {
  if (!data || typeof data !== 'object') data = {};
  const bil = { ...STANDARD };
  for (const type of Object.keys(DELE)) {
    if (DELE[type].some(d => d.id === data[type])) bil[type] = data[type];
  }
  bil.antal = [1, 2, 3].includes(data.antal) ? data.antal : 3;
  if (FARVER.includes(data.farve)) bil.farve = data.farve;
  return bil;
}
