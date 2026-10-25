// Delene er frit tilgængelige: prøv en ny konstruktion efter hvert styrt.
export const DELE = {
  hjul: [
    { id: 'vej', navn: 'Vejhjul', ikon: '◉', radius: .68, greb: 1.7, tekst: 'Let og hurtigt' },
    { id: 'monster', navn: 'Monsterhjul', ikon: '◉', radius: 1.05, greb: 2.4, tekst: 'Kravler over murbrokker' },
    { id: 'hop', navn: 'Hoppehjul', ikon: '◎', radius: .85, greb: 1.5, tekst: 'Elastiske landinger' },
  ],
  motor: [
    { id: 'racer', navn: 'Racermotor', ikon: 'ϟ', kraft: 100, fart: 34, tekst: 'Høj fart, lav vægt' },
    { id: 'diesel', navn: 'Trækmotor', ikon: '⚙', kraft: 160, fart: 25, tekst: 'Skubber tunge læs' },
    { id: 'raket', navn: 'Raketmotor', ikon: '➤', kraft: 115, fart: 31, tekst: 'Ekstra kraft med BOOST' },
  ],
  front: [
    { id: 'kile', navn: 'Rambuk', ikon: '▶', masse: 8, tekst: 'Slår bunden ud af tårnet' },
    { id: 'plov', navn: 'Løfteplov', ikon: '◢', masse: 5, tekst: 'Løfter vragdele opad' },
    { id: 'let', navn: 'Let kofanger', ikon: '⌁', masse: 1, tekst: 'Mere fart til hoppene' },
  ],
  last: [
    { id: 'benzin', navn: 'Benzintønder', ikon: '▥', farve: '#ff9948', tekst: 'Ild, røg og forsinkede brag' },
    { id: 'gas', navn: 'Grøn gas', ikon: '♨', farve: '#91ff70', tekst: 'En voksende sky af grøn ild' },
    { id: 'tnt', navn: 'TNT-kasser', ikon: '✹', farve: '#ff635b', tekst: 'Et tungt slag mod fundamentet' },
    { id: 'blaa', navn: 'Blå puls', ikon: '✧', farve: '#56ddff', tekst: 'En trykring kaster delene væk' },
    { id: 'lilla', navn: 'Lilla hvirvel', ikon: '✺', farve: '#cd8aff', tekst: 'Suger ind — og slynger ud' },
    { id: 'tom', navn: 'Ingen last', ikon: '−', farve: '#a1a8b2', tekst: 'Kun bilen og din fart' },
  ],
};

export const STANDARD = { hjul: 'monster', motor: 'diesel', front: 'kile', last: 'blaa', antal: 3, farve: '#f5cc4c' };
export const BANER = [
  { navn: 'Domino-kvarteret', kort: '01', tekst: 'Ram første domino. Se kæden vælte højhuset.', højde: 9, domino: 9, rampe: false, type: 'blaa', mål: 35 },
  { navn: 'Gasværkets tvillinger', kort: '02', tekst: 'To højhuse. Grøn gas. Én meget dårlig parkeringsplads.', højde: 12, domino: 5, rampe: false, type: 'gas', mål: 45 },
  { navn: 'Spring gennem taget', kort: '03', tekst: 'Tag rampen og send lasten ind mellem etagerne.', højde: 14, domino: 4, rampe: true, type: 'benzin', mål: 40 },
  { navn: 'Neon-nedsmeltning', kort: '04', tekst: 'Blå puls møder lilla hvirvel i det højeste tårn.', højde: 18, domino: 7, rampe: false, type: 'lilla', mål: 55 },
];

export function del(type, id) {
  return DELE[type].find(d => d.id === id) || DELE[type][0];
}

// Kun kendte dele og små, gyldige værdier læses fra enhedens gemning.
export function normaliser(data = {}) {
  if (!data || typeof data !== 'object') data = {};
  const bil = { ...STANDARD };
  for (const type of Object.keys(DELE)) {
    if (DELE[type].some(d => d.id === data[type])) bil[type] = data[type];
  }
  bil.antal = [1, 2, 3].includes(data.antal) ? data.antal : 3;
  if (['#f5cc4c', '#62ded7', '#f17d9a', '#a38bfa'].includes(data.farve)) bil.farve = data.farve;
  return bil;
}
