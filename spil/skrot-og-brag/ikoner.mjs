// ===== Små tegninger til knapperne, så man kan vælge uden at kunne læse =====
// Alle ikoner er faste SVG-tegninger i koden; ingen billeder skal hentes.
const svg = (indhold, boks = '0 0 64 64') => `<svg viewBox="${boks}" aria-hidden="true" focusable="false">${indhold}</svg>`;
const MØRK = '#2a2f3a', STÅL = '#c9d1dc';

const hjulTegning = (r, nav, ekstra = '', dæk = MØRK) =>
  `${ekstra}<circle cx="32" cy="32" r="${r}" fill="${dæk}"/><circle cx="32" cy="32" r="${r * .52}" fill="${nav}"/><circle cx="32" cy="32" r="${r * .18}" fill="${MØRK}"/>`;

function knopper(r, antal) {
  let ud = '';
  for (let i = 0; i < antal; i++) ud += `<rect x="28" y="${32 - r - 3}" width="8" height="8" rx="2" fill="${MØRK}" transform="rotate(${i * 360 / antal} 32 32)"/>`;
  return ud;
}

const tønde = (farve, x = 32, y = 32, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M-15 -22h30q5 22 0 44h-30q-5 -22 0 -44z" fill="${farve}"/>
  <rect x="-18" y="-12" width="36" height="5" rx="2" fill="#fff" opacity=".7"/><rect x="-18" y="8" width="36" height="5" rx="2" fill="#fff" opacity=".7"/></g>`;

// Lastens tegn er de samme som på tønderne i spillet.
const TEGN = {
  benzin: '<path d="M32 12c10 10 14 18 12 26-2 10-14 12-20 6-5-5-3-12 2-16 0 5 3 7 5 7-3-8-1-16 1-23z" fill="#ff8a1f"/><circle cx="32" cy="42" r="5" fill="#ffd23f"/>',
  gas: '<g fill="#3ccf4e"><circle cx="23" cy="38" r="9"/><circle cx="33" cy="30" r="12"/><circle cx="43" cy="38" r="9"/><circle cx="32" cy="42" r="9"/></g>',
  blaa: '<g fill="none" stroke="#2f9bff" stroke-width="5" stroke-linecap="round"><path d="M24 24a12 12 0 0 1 16 0M24 40a12 12 0 0 0 16 0"/><path d="M17 18a21 21 0 0 1 30 0M17 46a21 21 0 0 0 30 0"/></g><circle cx="32" cy="32" r="4" fill="#2f9bff"/>',
  lilla: '<path d="M32 32m0 0a3 3 0 0 1 5 2a7 7 0 0 1-10 4a11 11 0 0 1-2-15a15 15 0 0 1 20 -1a19 19 0 0 1 2 25" fill="none" stroke="#a45cff" stroke-width="5" stroke-linecap="round"/>',
};

export const DELIKON = {
  hjul: {
    vej: svg(hjulTegning(17, STÅL)),
    monster: svg(knopper(25, 12) + hjulTegning(25, '#ffd23f')),
    hop: svg(`<path d="M12 56q20-8 40 0" stroke="#36cfc9" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M18 61q14-5 28 0" stroke="#36cfc9" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>` + `<g transform="translate(0 -4)">${hjulTegning(20, '#fff', '', '#36cfc9')}</g>`),
  },
  motor: {
    racer: svg('<path d="M36 6L14 36h14l-6 22 26-32H34l6-20z" fill="#ffd23f" stroke="#e0a100" stroke-width="3" stroke-linejoin="round"/>'),
    diesel: svg(`<circle cx="44" cy="12" r="6" fill="#d7dbe2"/><circle cx="52" cy="8" r="4" fill="#e6e9ee"/><rect x="38" y="16" width="9" height="22" rx="2" fill="${STÅL}"/>
      <rect x="8" y="30" width="40" height="24" rx="6" fill="#ff9f1c"/><rect x="14" y="24" width="22" height="9" rx="3" fill="${STÅL}"/><circle cx="20" cy="42" r="4" fill="${MØRK}"/><circle cx="34" cy="42" r="4" fill="${MØRK}"/>`),
    raket: svg(`<path d="M10 40l10-4 4 4-4 10z" fill="#ff4d4d"/><path d="M24 40l20-20c6-6 12-8 14-8 0 2-2 8-8 14L30 46z" fill="#f4f6fa" stroke="${STÅL}" stroke-width="2"/>
      <circle cx="44" cy="26" r="4" fill="#5ec8ff"/><path d="M24 40l-12 12M28 44l-10 12M20 36l-10 10" stroke="#ff9f1c" stroke-width="5" stroke-linecap="round"/>`),
  },
  front: {
    kile: svg(`<rect x="12" y="14" width="40" height="36" rx="7" fill="#ffd23f"/><path d="M20 14l-8 12v10l18-22zM34 14L12 46v4h4l26-36zM48 14L18 50h12l22-26V14z" fill="${MØRK}"/><rect x="50" y="16" width="6" height="32" rx="2" fill="${STÅL}"/>`),
    plov: svg(`<path d="M12 12v40h44z" fill="#ff9f1c" stroke="#d9792a" stroke-width="3" stroke-linejoin="round"/><path d="M44 52l12-4M50 52l10-2" stroke="${STÅL}" stroke-width="4" stroke-linecap="round"/><rect x="8" y="12" width="6" height="40" rx="2" fill="${MØRK}"/>`),
    let: svg(`<rect x="8" y="24" width="48" height="16" rx="8" fill="${MØRK}"/><rect x="14" y="29" width="36" height="6" rx="3" fill="${STÅL}"/>`),
  },
  last: {
    benzin: svg(tønde('#ff8a1f') + '<g transform="translate(16 15) scale(.5)">' + TEGN.benzin.replaceAll('#ff8a1f', '#fff') + '</g>'),
    gas: svg(tønde('#3ccf4e') + '<g transform="translate(16 15) scale(.5)">' + TEGN.gas.replaceAll('#3ccf4e', '#fff') + '</g>'),
    tnt: svg(`<g fill="#ef3b3b"><rect x="14" y="16" width="11" height="38" rx="5"/><rect x="26" y="14" width="11" height="40" rx="5"/><rect x="38" y="16" width="11" height="38" rx="5"/></g>
      <rect x="11" y="30" width="41" height="7" rx="3" fill="${MØRK}"/><path d="M32 14q2-8 10-8" stroke="#6b4f3a" stroke-width="3" fill="none"/><circle cx="43" cy="6" r="4" fill="#ffd23f"/>`),
    blaa: svg(tønde('#2f9bff') + '<g transform="translate(16 15) scale(.5)">' + TEGN.blaa.replaceAll('#2f9bff', '#fff') + '</g>'),
    lilla: svg(tønde('#a45cff') + '<g transform="translate(16 15) scale(.5)">' + TEGN.lilla.replaceAll('#a45cff', '#fff') + '</g>'),
    tom: svg('<circle cx="32" cy="32" r="22" fill="none" stroke="#b8c2cc" stroke-width="7"/><path d="M17 47L47 17" stroke="#b8c2cc" stroke-width="7" stroke-linecap="round"/>'),
  },
  fører: {
    bjørn: svg('<circle cx="16" cy="18" r="9" fill="#b5794a"/><circle cx="48" cy="18" r="9" fill="#b5794a"/><circle cx="32" cy="34" r="22" fill="#b5794a"/><ellipse cx="32" cy="42" rx="11" ry="8" fill="#ecc59c"/><ellipse cx="32" cy="38" rx="5" ry="3.5" fill="#262a33"/><circle cx="24" cy="29" r="3.5" fill="#262a33"/><circle cx="40" cy="29" r="3.5" fill="#262a33"/>'),
    gris: svg('<path d="M12 12l12 6-8 8z M52 12l-12 6 8 8z" fill="#ff8aa6"/><circle cx="32" cy="34" r="22" fill="#ffa9bd"/><ellipse cx="32" cy="40" rx="10" ry="7" fill="#ff8aa6"/><circle cx="28" cy="40" r="2.5" fill="#c9566f"/><circle cx="36" cy="40" r="2.5" fill="#c9566f"/><circle cx="24" cy="28" r="3.5" fill="#262a33"/><circle cx="40" cy="28" r="3.5" fill="#262a33"/>'),
    frø: svg('<circle cx="20" cy="18" r="10" fill="#5fd068"/><circle cx="44" cy="18" r="10" fill="#5fd068"/><circle cx="20" cy="18" r="6" fill="#fff"/><circle cx="44" cy="18" r="6" fill="#fff"/><circle cx="20" cy="19" r="3" fill="#262a33"/><circle cx="44" cy="19" r="3" fill="#262a33"/><ellipse cx="32" cy="38" rx="24" ry="18" fill="#5fd068"/><path d="M20 42q12 8 24 0" stroke="#b8324b" stroke-width="4" fill="none" stroke-linecap="round"/>'),
    kat: svg('<path d="M12 8l14 12-12 8z M52 8L38 20l12 8z" fill="#ffab4c"/><circle cx="32" cy="35" r="22" fill="#ffab4c"/><ellipse cx="32" cy="42" rx="10" ry="7" fill="#fff3e0"/><circle cx="32" cy="38" r="3" fill="#ff7f9b"/><circle cx="24" cy="30" r="3.5" fill="#262a33"/><circle cx="40" cy="30" r="3.5" fill="#262a33"/><path d="M6 40h12M6 46h12M46 40h12M46 46h12" stroke="#5a4a42" stroke-width="2" stroke-linecap="round"/>'),
  },
};

export const FANEIKON = {
  hjul: DELIKON.hjul.monster,
  motor: DELIKON.motor.diesel,
  front: DELIKON.front.kile,
  last: svg(tønde('#ff8a1f')),
  fører: DELIKON.fører.bjørn,
  farve: svg('<path d="M32 8C18 8 6 18 6 31c0 10 8 14 14 12 5-2 8 1 7 6-1 6 3 9 9 9 14 0 22-12 22-26S46 8 32 8z" fill="#fff3d6" stroke="#e8c98f" stroke-width="2"/><circle cx="20" cy="26" r="5" fill="#ff4d4d"/><circle cx="32" cy="18" r="5" fill="#ffd23f"/><circle cx="45" cy="24" r="5" fill="#3ecf6e"/><circle cx="47" cy="38" r="5" fill="#3a86ff"/>'),
};

// Antal tønder på ladet, tegnet i lastens farve.
export function antalIkon(n, farve) {
  const placering = { 1: [[32, 32]], 2: [[22, 32], [42, 32]], 3: [[14, 34], [32, 34], [50, 34]] }[n];
  return svg(placering.map(([x, y]) => tønde(farve, x, y, n === 3 ? .52 : .62)).join(''));
}

export function farveIkon(farve) {
  return svg(`<circle cx="32" cy="32" r="24" fill="${farve}"/><ellipse cx="24" cy="22" rx="8" ry="5" fill="#fff" opacity=".45" transform="rotate(-30 24 22)"/>`);
}

// Små billeder af banerne: himmel, græs og det, man skal køre ind i.
const baggrund = '<rect width="80" height="60" fill="#bfe3ff"/><circle cx="66" cy="12" r="6" fill="#ffe27a"/><rect y="46" width="80" height="14" fill="#86d05f"/><rect y="46" width="80" height="4" fill="#9aa3b5"/>';
export const BANEIKON = {
  hus: svg(baggrund + '<rect x="24" y="24" width="32" height="22" fill="#ffcf56"/><path d="M20 26l20-14 20 14z" fill="#ef4d4d"/><rect x="28" y="29" width="8" height="7" fill="#fff"/><rect x="44" y="33" width="7" height="13" fill="#3a86ff"/>', '0 0 80 60'),
  bunke: svg(baggrund + ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff924c', '#ff595e'].map((f, i) => {
    const r = [0, 0, 0, 1, 1, 2][i], k = [0, 1, 2, 0, 1, 0][i];
    return `<rect x="${24 + k * 11 + r * 5.5}" y="${36 - r * 10}" width="10" height="10" rx="2" fill="${f}"/>`;
  }).join(''), '0 0 80 60'),
  tårn: svg(baggrund + ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].map((f, i) => `<rect x="32" y="${40 - i * 6}" width="16" height="6" fill="${f}"/>`).join('') + '<path d="M30 10l10-8 10 8z" fill="#ff70a6"/>', '0 0 80 60'),
  slot: svg(baggrund + '<rect x="18" y="18" width="12" height="28" fill="#c3bfe0"/><rect x="50" y="18" width="12" height="28" fill="#c3bfe0"/><rect x="30" y="28" width="20" height="18" fill="#b8b3d9"/><path d="M16 19l8-12 8 12zM48 19l8-12 8 12z" fill="#4d6bff"/><path d="M24 7v-5l6 2.5zM56 7v-5l6 2.5z" fill="#ff4d4d"/><rect x="36" y="36" width="8" height="10" rx="4" fill="#9b6b43"/>', '0 0 80 60'),
  hop: svg(baggrund + '<path d="M6 46l20-10v10z" fill="#ff9f1c"/><rect x="50" y="14" width="16" height="32" fill="#7fd1f5"/><path d="M48 15l10-7 10 7z" fill="#ef4d4d"/><path d="M26 34q10-16 22-12" stroke="#fff" stroke-width="2.5" stroke-dasharray="3 3" fill="none"/><rect x="18" y="31" width="10" height="5" rx="2" fill="#ff4d4d"/>', '0 0 80 60'),
};
