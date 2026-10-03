import { RUTER } from './verden-data.js';

const afstand = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const punkt = p => ({ x: p[0], y: p[1], z: p[2] });

// Vejnettet deler kun knuder, når både sted og højde passer. Bro og dal er to niveauer.
function vejnet() {
  const knuder = [], kanter = [], kendte = new Map();
  const hentKnude = p => {
    const id = `${p.x},${p.y},${p.z}`;
    if (!kendte.has(id)) { kendte.set(id, knuder.length); knuder.push(p); }
    return kendte.get(id);
  };
  for (const rute of RUTER) {
    for (let i = 1; i < rute.punkter.length; i++) {
      const a = hentKnude(punkt(rute.punkter[i - 1])), b = hentKnude(punkt(rute.punkter[i]));
      kanter.push({ a, b, navn: rute.navn, længde: afstand(knuder[a], knuder[b]) });
    }
  }
  return { knuder, kanter };
}
const NET = vejnet();

// Redning vælger samme niveau som GPS. Den flytter ikke en bil gennem et brodæk.
export function redningspunkt(bil) {
  const f = vejforbindelse(bil, bil.y - .8);
  if (!f) return undefined;
  const a = NET.knuder[f.kant.a], b = NET.knuder[f.kant.b];
  return { ...f.på, vinkel: Math.atan2(b.x - a.x, b.z - a.z) };
}

// En bil under en bro forbindes til en lav vej eller opkørsel, aldrig til dækket ovenover.
function vejforbindelse(p, højde) {
  let bedste;
  for (const kant of NET.kanter) {
    const a = NET.knuder[kant.a], b = NET.knuder[kant.b];
    const dx = b.x - a.x, dz = b.z - a.z, dy = b.y - a.y;
    let minT = 0, maxT = 1;
    if (Math.abs(dy) < .001) {
      if (Math.abs(a.y - højde) > 2.1) continue;
    } else {
      const t1 = (højde - 2.1 - a.y) / dy, t2 = (højde + 2.1 - a.y) / dy;
      minT = Math.max(0, Math.min(t1, t2)); maxT = Math.min(1, Math.max(t1, t2));
      if (minT > maxT) continue;
    }
    const t = Math.max(minT, Math.min(maxT, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
    const på = { x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t };
    const pris = afstand(p, på) + Math.abs(på.y - højde) * 8;
    if (!bedste || pris < bedste.pris) bedste = { kant, på, t, pris };
  }
  return bedste;
}

// Korteste sammenhængende rute, inklusive bilens og målets projektion på den rigtige vej.
export function planlægRute(bil, mål) {
  const start = vejforbindelse(bil, bil.y - .8), slut = vejforbindelse(mål, mål.y || 0);
  if (!start || !slut) return { punkter: [bil, mål], længde: afstand(bil, mål), navn: 'Følg målets lys', niveau: 0 };
  const knuder = [...NET.knuder, start.på, slut.på], s = knuder.length - 2, m = knuder.length - 1;
  const naboer = knuder.map(() => []);
  const forbind = (a, b, længde, navn) => {
    naboer[a].push({ til: b, længde, navn }); naboer[b].push({ til: a, længde, navn });
  };
  for (const k of NET.kanter) forbind(k.a, k.b, k.længde, k.navn);
  for (const [f, id] of [[start, s], [slut, m]]) {
    forbind(id, f.kant.a, f.t * f.kant.længde, f.kant.navn);
    forbind(id, f.kant.b, (1 - f.t) * f.kant.længde, f.kant.navn);
  }
  if (start.kant === slut.kant) forbind(s, m, Math.abs(start.t - slut.t) * start.kant.længde, start.kant.navn);
  const priser = knuder.map(() => Infinity), før = [], navn = [], færdig = new Set(); priser[s] = 0;
  for (let i = 0; i < knuder.length; i++) {
    let valgt = -1;
    for (let j = 0; j < knuder.length; j++) if (!færdig.has(j) && (valgt < 0 || priser[j] < priser[valgt])) valgt = j;
    if (valgt < 0 || !Number.isFinite(priser[valgt]) || valgt === m) break;
    færdig.add(valgt);
    for (const n of naboer[valgt]) if (priser[valgt] + n.længde < priser[n.til]) {
      priser[n.til] = priser[valgt] + n.længde; før[n.til] = valgt; navn[n.til] = n.navn;
    }
  }
  const vej = [m];
  while (vej[0] !== s && før[vej[0]] !== undefined) vej.unshift(før[vej[0]]);
  const punkter = [{ x: bil.x, y: bil.y - .8, z: bil.z }, ...vej.map(id => ({ ...knuder[id] })), { ...mål, y: mål.y || 0 }];
  const rene = punkter.filter((p, i) => !i || afstand(p, punkter[i - 1]) > .5 || Math.abs(p.y - punkter[i - 1].y) > .5);
  return { punkter: rene, længde: priser[m] + afstand(bil, start.på) + afstand(slut.på, mål), navn: navn[vej[1]] || start.kant.navn, niveau: start.på.y };
}

// Pilen peger langs ruten. Ved et sving vises et kort, brugbart kørselsråd.
export function næsteVejpunkt(rute, bil) {
  const punkter = rute.punkter;
  let id = 1;
  while (id < punkter.length - 1 && afstand(bil, punkter[id]) < 6) id++;
  const mål = punkter[id] || punkter[0];
  const vinkel = Math.atan2(mål.x - bil.x, mål.z - bil.z);
  let forskel = vinkel - bil.vinkel;
  while (forskel > Math.PI) forskel -= Math.PI * 2;
  while (forskel < -Math.PI) forskel += Math.PI * 2;
  const tekst = Math.abs(forskel) > 2.1 ? 'Vend bilen' : forskel > .55 ? 'Hold til højre' : forskel < -.55 ? 'Hold til venstre' : 'Følg vejen';
  return { ...mål, tekst, afstand: afstand(bil, mål), vinkel: forskel };
}

// Små markører bruger den planlagte vejhøjde; de tegnes aldrig som en genvej op på en bro.
export function rutemarkører(rute, afstandMellem = 24, maks = 35) {
  const ud = []; let rest = 8;
  for (let i = 1; i < rute.punkter.length; i++) {
    const a = rute.punkter[i - 1], b = rute.punkter[i], længde = afstand(a, b);
    if (længde < .01) continue;
    while (rest < længde && ud.length < maks) {
      const t = rest / længde;
      ud.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, vinkel: Math.atan2(b.x - a.x, b.z - a.z) });
      rest += afstandMellem;
    }
    rest -= længde;
    if (ud.length >= maks) break;
  }
  return ud;
}
