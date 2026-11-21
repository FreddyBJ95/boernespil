// ===== Herøya industripark i Porsgrunn: en verden bygget efter rigtige kort =====
// Terrænet, vandet, pladserne og alle fabrikker, tanke, rør og huse kommer fra heroeya-kort.js (Kartverket, NIBIO og OpenStreetMap).
// 1 blok = 4,5 meter vandret og 2 meter lodret, så fabrikkerne og skorstenen på 101 meter rager højt op.
// Hver blok i kortet har en højde og et materiale, så hallerne, tankene og den store hvide ammoniakkugle står, hvor de står.
// Opskriften virker i alle størrelser: en lille verden viser midten af parken, en stor verden får fjorden rundt om.

import { N, OVERFLADER, SKORSTENE, KUGLER, HØJDER, OVERFLADE, ANLÆG, TRÆER } from "./heroeya-kort.js";
import { pakUd, pakHøjderUd } from "./rigtige-steder.js";

const KANT = 10;                                   // så mange blokke skråner landet ned mod vandet ved kanten
const V = 2;                                       // meter pr. blok lodret (som i kortdataene)

// Kortet pakkes ud første gang, verdenen laves
let kort = null;
function hentKort() {
  if (kort) return kort;
  const { højde } = pakHøjderUd(HØJDER, N);
  return (kort = { højde, flade: pakUd(OVERFLADE, N * N), anlæg: pakUd(ANLÆG, N * N) });
}

// Hvor skorstenene står i en verden på BX × BZ (bruges både af opskriften og af røgen i spil.js)
export function heroeyaSkorstene(BX, BZ) {
  const ox = Math.floor((BX - N) / 2), oz = Math.floor((BZ - N) / 2);
  return SKORSTENE.map(([x, z]) => [x + ox, z + oz]).filter(([x, z]) => x > 1 && z > 1 && x < BX - 2 && z < BZ - 2);
}

export function bygHerøya(a) {
  const { R, ID, BX, BY, BZ, top } = a, k = hentKort();
  const ox = Math.floor((BX - N) / 2), oz = Math.floor((BZ - N) / 2);    // kortets hjørne i verdenen (negativt = beskåret)
  const BUND = 6, skala = Math.min(1, (BY - 8) / 58);                    // havet står i 6,5 — lave verdener bliver lavere
  const KODE = Object.fromEntries(OVERFLADER.map((n, i) => [n, i]));
  const felt = (x, z) => { const rx = x - ox, rz = z - oz; return rx >= 0 && rz >= 0 && rx < N && rz < N ? rx + rz * N : -1; };
  const fladeAf = (x, z) => { const i = felt(x, z); return i < 0 ? KODE.vand : k.flade[i]; };
  const kantAf = (x, z) => Math.min(x, z, BX - 1 - x, BZ - 1 - z, x - ox, z - oz, ox + N - 1 - x, oz + N - 1 - z);

  // ---------- Terrænet: flad industripark ved fjorden; landet skråner ned til vandet ved kanten ----------
  const højdeAf = (x, z) => {
    const i = felt(x, z);
    if (i < 0 || k.flade[i] === KODE.vand) return 3;                    // havbunden
    const h = BUND + Math.max(1, Math.round(k.højde[i] * skala)), d = kantAf(x, z);
    if (d >= KANT) return h;
    const t = d / KANT;
    return Math.round(3 + (h - 3) * t * t * (3 - 2 * t));
  };
  const TOP = {
    vand: ID.Sand, asfalt: ID.Asfalt, beton: ID.Beton, grus: ID.Grus, græs: ID["Græs"], skov: ID["Græs"], klippe: ID.Sten, muld: ID.Muld,
    kaj: ID.Beton, brygge: ID.Planker, skinneNS: ID.Skinner, skinneØV: ID["Skinner øst-vest"], sand: ID.Sand,
  };
  const topBlok = OVERFLADER.map(n => TOP[n]);
  a.terræn(højdeAf, (x, z, y, h) => {
    if (y === 0) return ID.Bundsten;
    const f = fladeAf(x, z);
    if (f === KODE.kaj) return ID.Beton;                                  // kajerne er beton helt ned i vandet
    if (f === KODE.vand || h <= 7 && kantAf(x, z) < KANT) return ID.Sand;
    if (y < h - 3) return ID.Sten;
    return y < h ? ID.Jord : topBlok[f];
  });

  // ---------- Fabrikker, tanke, rør og huse: hver blok bliver en søjle med vægge og tag ----------
  const VÆG = [0, ID.Beton, ID.Stålplade, ID.Mursten, ID["Hvid puds"], 0, ID.Stålplade, ID.Stålplade];
  const TAG = [0, ID.Beton, ID.Asfalt, ID.Mursten, ID["Hvid puds"], 0, ID.Stålplade, ID.Beton];
  const HUSVÆG = [ID["Hvidt træ"], ID["Hvidt træ"], ID["Gul puds"], ID.Ladetræ, ID["Hvid puds"]], HUSTAG = [ID.Asfalt, ID.Tagsten, ID.Asfalt];
  const mat = new Uint8Array(BX * BZ), toppen = new Int16Array(BX * BZ), husNr = new Int32Array(BX * BZ).fill(-1);
  for (let z = 0; z < BZ; z++) for (let x = 0; x < BX; x++) {
    const j = x + z * BX, i = felt(x, z);
    toppen[j] = top[j];
    if (i < 0 || !k.anlæg[i] || kantAf(x, z) < KANT) continue;
    mat[j] = k.anlæg[i] >> 5;
    const h = Math.max(1, Math.round((k.anlæg[i] & 31) * skala));
    toppen[j] = Math.min(BY - 2, mat[j] === 7 ? 6 + h : top[j] + h);
  }
  nummererHuse();
  const lavere = (x, z, y) => x < 0 || z < 0 || x >= BX || z >= BZ || toppen[x + z * BX] < y;
  for (let z = 0; z < BZ; z++) for (let x = 0; x < BX; x++) {
    const j = x + z * BX, m = mat[j];
    if (!m) continue;
    const g = m === 7 ? 4 : top[j], t = toppen[j];
    const væg = m === 5 ? HUSVÆG[husNr[j] % HUSVÆG.length] : VÆG[m], tag = m === 5 ? HUSTAG[husNr[j] % HUSTAG.length] : TAG[m];
    for (let y = g + 1; y <= t; y++) {
      // vinduer i hver tredje højde, hvor væggen vender ud (ikke på rør, tanke og skibe)
      const ud = lavere(x + 1, z, y) || lavere(x - 1, z, y) || lavere(x, z + 1, y) || lavere(x, z - 1, y);
      const vindue = ud && y < t && (y - g) % 3 === 2 && (x + z) % 2 === 0 && m !== 4 && m !== 6 && m !== 7;
      a.sæt(x, y, z, y === t ? tag : vindue ? ID.Glas : væg);
    }
    top[j] = t;
  }
  // Husene får hver sin farve: naboblokke med boliger hører til samme hus
  function nummererHuse() {
    let nr = 0;
    for (let s = 0; s < BX * BZ; s++) {
      if (mat[s] !== 5 || husNr[s] >= 0) continue;
      const kø = [s]; husNr[s] = nr;
      while (kø.length) {
        const j = kø.pop(), x = j % BX, z = (j - x) / BX;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = (x + dx) + (z + dz) * BX;
          if (x + dx >= 0 && x + dx < BX && z + dz >= 0 && z + dz < BZ && mat[n] === 5 && husNr[n] < 0) { husNr[n] = nr; kø.push(n); }
        }
      }
      nr += 1 + Math.floor(R() * 3);
    }
  }

  // ---------- Skorstenen på 101 meter: beton med røde og hvide striber og et lys på toppen ----------
  for (const [x, z] of heroeyaSkorstene(BX, BZ)) {
    const [, , hb] = SKORSTENE.find(([sx, sz]) => sx + ox === x && sz + oz === z);
    const g = top[x + z * BX], t = Math.min(BY - 3, g + Math.max(4, Math.round(hb * skala)));
    for (let y = g + 1; y <= t; y++) for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      a.sæt(x + dx, y, z + dz, t - y < 6 ? ((t - y) % 3 < 2 ? ID["Rød uld"] : ID["Hvid uld"]) : ID.Beton);
    }
    a.sæt(x, t + 1, z, ID.Lampe);
    top[x + z * BX] = t + 1;
  }

  // ---------- Ammoniakkuglen: en stor hvid kugle på fire stålben ----------
  for (const [kx, kz, kr] of KUGLER) {
    const x = kx + ox, z = kz + oz, r = Math.max(2, Math.round(kr * Math.max(0.5, skala)));
    if (x - r < 1 || z - r < 1 || x + r >= BX - 1 || z + r >= BZ - 1 || kantAf(x, z) < KANT) continue;
    const g = top[x + z * BX], yc = Math.min(BY - 3 - r, g + 2 + r);
    for (const [bx, bz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {               // benene
      const lx = x + Math.round(bx * r * 0.6), lz = z + Math.round(bz * r * 0.6);
      for (let y = top[lx + lz * BX] + 1; y <= yc; y++) a.sæt(lx, y, lz, ID.Stålplade);
    }
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d <= r + 0.3 && d > r - 1.5) a.sæt(x + dx, yc + dy, z + dz, ID["Hvid puds"]);   // en hul skal
    }
    a.sæt(x, yc + r + 1, z, ID.Lampe);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (dx * dx + dz * dz <= r * r) top[x + dx + (z + dz) * BX] = Math.max(top[x + dx + (z + dz) * BX], yc);
  }

  // ---------- Træer og blomster i de grønne pletter ----------
  for (let i = 0; i < TRÆER.length; i += 4) {
    const x = TRÆER[i] + ox, z = TRÆER[i + 1] + oz;
    if (x < 1 || z < 1 || x >= BX - 1 || z >= BZ - 1 || kantAf(x, z) < KANT || a.nærStart(x, z, 2)) continue;
    const g = top[x + z * BX];
    if (a.hent(x, g, z) !== ID["Græs"] || a.hent(x, g + 1, z)) continue;
    const h = Math.max(3, Math.min(BY - 4 - g, Math.round(TRÆER[i + 2] / V * skala))), blad = TRÆER[i + 3] === 0 ? ID.Granblade : ID.Blade;
    for (let y = 1; y < h; y++) a.sæt(x, g + y, z, ID.Træstamme);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = h - 2; y <= h; y++) {
      if ((y === h && dx && dz) || a.hent(x + dx, g + y, z + dz)) continue;
      a.sæt(x + dx, g + y, z + dz, blad);
    }
    if (!a.hent(x, g + h + 1, z)) a.sæt(x, g + h + 1, z, blad);
  }
  a.pynt(a.antal(40), () => [ID["Gul blomst"], ID["Hvid blomst"], ID["Højt græs"], ID["Højt græs"]][Math.floor(R() * 4)], [ID["Græs"]]);
}
