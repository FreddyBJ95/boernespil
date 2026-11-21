// ===== Morellgården i Brunlanes: en verden bygget efter rigtige kort =====
// Terrænet, markerne, skoven og husene kommer fra morellgaarden-kort.js (Kartverket, NIBIO og OpenStreetMap).
// Her bliver dataene til blokke: jorden med marker og grusveje, husene med vægge, vinduer og tag, og træerne ét for ét.
// 1 blok = 1 meter. Midt i verdenen (startstedet) står man på plænen foran den røde smie.
// Opskriften virker i alle størrelser: en lille verden viser midten af gården, en stor verden får havet rundt om.

import { N, OVERFLADER, HØJDER, OVERFLADE, TRÆER, BYGNINGER } from "./morellgaarden-kort.js";
import { pakUd, pakHøjderUd } from "./rigtige-steder.js";

const KANT = 14;                                   // så mange blokke skråner landet ned mod stranden ved kanten

// Kortet pakkes ud første gang, verdenen laves
let kort = null;
function hentKort() {
  if (kort) return kort;
  const { højde, maks } = pakHøjderUd(HØJDER, N);
  return (kort = { højde, flade: pakUd(OVERFLADE, N * N), maks });
}

export function bygMorellgården(a) {
  const { R, ID, BX, BY, BZ, top } = a, k = hentKort();
  const ox = Math.floor((BX - N) / 2), oz = Math.floor((BZ - N) / 2);    // kortets hjørne i verdenen (negativt = beskåret)
  const BUND = Math.min(9, Math.floor(BY / 4)), skala = Math.min(1, (BY - 18) / k.maks);   // lave verdener bliver fladere
  const KODE = Object.fromEntries(OVERFLADER.map((n, i) => [n, i]));
  const felt = (x, z) => { const rx = x - ox, rz = z - oz; return rx >= 0 && rz >= 0 && rx < N && rz < N ? rx + rz * N : -1; };
  const fladeAf = (x, z) => { const i = felt(x, z); return i < 0 ? -1 : k.flade[i]; };
  const kantAf = (x, z) => Math.min(x, z, BX - 1 - x, BZ - 1 - z, x - ox, z - oz, ox + N - 1 - x, oz + N - 1 - z);
  const nyY = h => BUND + Math.round(h * skala);

  // ---------- Terrænet: rigtige højder, der skråner blødt ned til en strand ved kanten ----------
  const højdeAf = (x, z) => {
    const i = felt(x, z);
    if (i < 0) return 3;                                                   // uden for kortet: havbund
    const h = nyY(k.højde[i]), d = kantAf(x, z);
    if (d >= KANT) return h;
    const t = d / KANT, s = t * t * (3 - 2 * t);
    return Math.round(4 + (h - 4) * s);
  };
  const TOP = {
    græs: ID["Græs"], muld: ID.Muld, kornmark: ID.Muld, grus: ID.Grus, asfalt: ID.Asfalt, vejstribe: ID.Vejstribe, skovbund: ID["Græs"],
    hogst: ID["Tørt græs"], have: ID["Græs"], busk: ID["Græs"], frugthave: ID["Græs"], eng: ID["Græs"], hvedemark: ID.Muld,
  };
  const topBlok = OVERFLADER.map(n => TOP[n]);
  const strand = (x, z, h) => fladeAf(x, z) < 0 || (kantAf(x, z) < KANT && h <= 9);
  a.terræn(højdeAf, (x, z, y, h) => {
    if (y === 0) return ID.Bundsten;
    if (y < h - 3) return ID.Sten;
    if (strand(x, z, h)) return ID.Sand;
    if (y < h) return ID.Jord;
    const f = fladeAf(x, z);
    return f === KODE.kornmark && x % 3 ? ID["Græs"] : topBlok[f];       // den grønne kornmark har brune furer
  });

  // ---------- Husene ----------
  const TAG = { lyst: ID.Stålplade, mørkt: ID.Asfalt, tegl: ID.Tagsten };
  const materiale = b => {
    const hvid = b.osm % 3 !== 0;                                         // naboernes huse: mest hvide, nogle gule
    if (b.slags === "smia" || b.slags === "låve") return { væg: ID.Ladetræ, kant: ID["Hvidt træ"] };   // rødt med hvide hjørner
    if (b.slags === "stuehus") return { væg: ID["Hvidt træ"], kant: ID["Hvidt træ"] };
    if (b.slags === "hus") return { væg: hvid ? ID["Hvidt træ"] : ID["Gul puds"], kant: ID["Hvidt træ"] };
    return { væg: b.osm % 2 ? ID.Ladetræ : ID["Hvidt træ"], kant: ID["Hvidt træ"] };              // garager og skure
  };
  for (const b of BYGNINGER) hus(b);

  // Et hus: grund, vægge med vinduer og dør, gavle, tag med udhæng og til sidst skorsten og indbo
  function hus(b) {
    const bx = b.x + ox, bz = b.z + oz, W = b.fod[0].length, D = b.fod.length;
    const inde = (x, z) => b.fod[z - bz]?.[x - bx] === "#";
    for (let z = bz; z < bz + D; z++) for (let x = bx; x < bx + W; x++) if (inde(x, z) && kantAf(x, z) < KANT + 2) return;   // for tæt på stranden
    const m = materiale(b), tag = TAG[b.tag] || ID.Asfalt, y0 = nyY(b.jord);
    const væg = Math.max(2, b.væg), ryg = Math.max(væg + 1, b.ryg), langsZ = b.langs === "z";
    lavGrund(bx, bz, W, D, y0, inde);
    const [s0, s1] = hovedspænd(b, langsZ, W, D);
    const halv = (s1 - s0) / 2, stigning = (ryg - væg) / Math.max(1, halv);
    const indAf = (x, z) => { const j = langsZ ? x - bx : z - bz; return j < s0 || j > s1 ? -1 : Math.min(j - s0, s1 - j); };   // -1 = udbygning
    const tagY = d => y0 + væg + (d < 0 ? 0 : 1 + Math.floor(d * stigning));
    const yderst = (x, z, dx, dz) => !inde(x + dx, z + dz);
    const dør = findDør(bx, bz, W, D, langsZ, inde);
    const portBred = b.slags === "låve" ? 2 : 0;                          // laden får en stor port
    const iDør = (x, z) => langsZ ? x === dør[0] && Math.abs(z - dør[1]) <= portBred : z === dør[1] && Math.abs(x - dør[0]) <= portBred;
    const vedDør = (x, z) => langsZ ? x === dør[0] && Math.abs(z - dør[1]) === portBred + 1 : z === dør[1] && Math.abs(x - dør[0]) === portBred + 1;

    for (let z = bz; z < bz + D; z++) for (let x = bx; x < bx + W; x++) {
      if (!inde(x, z)) continue;
      const ude = [yderst(x, z, 1, 0), yderst(x, z, -1, 0), yderst(x, z, 0, 1), yderst(x, z, 0, -1)];
      const væggen = ude.some(Boolean), hjørne = (ude[0] || ude[1]) && (ude[2] || ude[3]);
      const d = indAf(x, z), yTop = tagY(d), yUnder = d <= 0 ? y0 + væg + 1 : tagY(d - 1) + 1;
      // Væggen: hvide hjørner, vinduer hver tredje blok, og døren med hvid karm
      if (væggen) {
        const langs = ude[2] || ude[3] ? x - bx : z - bz, glasHøj = væg >= 4 ? 2 : 1;
        const vindue = !hjørne && langs % (b.slags === "låve" ? 4 : 3) === 1;
        for (let y = y0 + 1; y <= y0 + væg; y++) {
          const h = y - y0;
          let blok = hjørne ? m.kant : m.væg;
          if (vindue && h >= 2 && h < 2 + glasHøj) blok = ID.Glas;
          if (iDør(x, z)) blok = h <= (portBred ? 3 : 2) ? 0 : m.kant;
          else if (vedDør(x, z) && h <= (portBred ? 3 : 2)) blok = m.kant;
          a.sæt(x, y, z, blok);
        }
      }
      // Gavlen: væggen fortsætter op under taget for enderne af huset
      const gavl = langsZ ? ude[2] || ude[3] : ude[0] || ude[1];
      if (gavl && d >= 0) for (let y = y0 + væg + 1; y < yUnder; y++) a.sæt(x, y, z, m.væg);
      // Taget: trin for trin op mod tagryggen
      for (let y = Math.min(yUnder, yTop); y <= yTop; y++) a.sæt(x, y, z, tag);
      // Tagudhæng over langsiderne og hvide vindskeder ved gavlene
      for (const [dx, dz, i] of [[1, 0, 0], [-1, 0, 1], [0, 1, 2], [0, -1, 3]]) {
        if (!ude[i]) continue;
        const langside = langsZ ? dx !== 0 : dz !== 0;
        if (langside && d <= 0) a.sæt(x + dx, y0 + væg, z + dz, tag);
        else if (!langside && d >= 0) a.sæt(x + dx, yTop, z + dz, m.kant);
      }
    }
    // Skorsten af mursten i den ene ende af tagryggen (ikke på laden og skurene)
    if (b.slags === "smia" || b.slags === "stuehus" || b.slags === "hus") {
      const midt = Math.round(s0 + halv), cx = langsZ ? bx + midt : bx + 2, cz = langsZ ? bz + 2 : bz + midt;
      if (inde(cx, cz)) for (let y = tagY(indAf(cx, cz)) + 1; y <= tagY(indAf(cx, cz)) + 2; y++) a.sæt(cx, y, cz, ID.Mursten);
    }
    if (b.slags === "smia") indretSmien(bx, bz, D, y0, inde);
    if (b.slags === "låve") for (let n = 0; n < 7; n++) {                // høballer inde i laden
      const x = bx + 1 + Math.floor(R() * (W - 2)), z = bz + 1 + Math.floor(R() * (D - 2));
      if (inde(x, z) && !a.hent(x, y0 + 1, z) && !iDør(x, z)) { a.sæt(x, y0 + 1, z, ID.Høballe); if (R() < 0.4) a.sæt(x, y0 + 2, z, ID.Høballe); }
    }
  }

  // Grunden: jorden graves væk over gulvet (også lige udenom), og under huset bygges en stensokkel
  function lavGrund(bx, bz, W, D, y0, inde) {
    for (let z = bz - 1; z <= bz + D; z++) for (let x = bx - 1; x <= bx + W; x++) {
      let nær = false;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (inde(x + dx, z + dz)) nær = true;
      if (!nær) continue;
      const t = top[x + z * BX], øverst = a.hent(x, t, z);
      for (let y = y0 + 1; y <= t; y++) a.sæt(x, y, z, 0);
      if (inde(x, z)) { for (let y = Math.min(t, y0) - 2; y < y0; y++) a.sæt(x, y, z, ID.Stensokkel); a.sæt(x, y0, z, ID.Planker); }
      else { for (let y = t + 1; y < y0; y++) a.sæt(x, y, z, ID.Jord); if (t !== y0) a.sæt(x, y0, z, øverst === ID.Grus ? ID.Grus : ID["Græs"]); }
      top[x + z * BX] = y0;
    }
  }

  // Hovedhuset er den bredde, de fleste rækker har — udbygninger (som smiens vindfang) får fladt tag
  function hovedspænd(b, langsZ, W, D) {
    const spænd = {};
    for (let n = 0; n < (langsZ ? D : W); n++) {
      let lav = 1e9, høj = -1;
      for (let j = 0; j < (langsZ ? W : D); j++) if (langsZ ? b.fod[n][j] === "#" : b.fod[j][n] === "#") { lav = Math.min(lav, j); høj = Math.max(høj, j); }
      if (høj >= 0) spænd[`${lav},${høj}`] = (spænd[`${lav},${høj}`] || 0) + 1;
    }
    return Object.entries(spænd).sort((p, q) => q[1] - p[1])[0][0].split(",").map(Number);
  }

  // Døren sidder midt på den lange side, der vender ind mod midten af verdenen (gårdspladsen)
  function findDør(bx, bz, W, D, langsZ, inde) {
    const mod = langsZ ? Math.sign(BX / 2 - (bx + W / 2)) || 1 : Math.sign(BZ / 2 - (bz + D / 2)) || 1;
    const celler = [];
    for (let z = bz; z < bz + D; z++) for (let x = bx; x < bx + W; x++) if (inde(x, z) && !inde(x + (langsZ ? mod : 0), z + (langsZ ? 0 : mod))) celler.push([x, z]);
    celler.sort((p, q) => (langsZ ? q[0] - p[0] : q[1] - p[1]) * mod || (langsZ ? p[1] - q[1] : p[0] - q[0]));
    const yderst = celler.filter(c => (langsZ ? c[0] : c[1]) === (langsZ ? celler[0][0] : celler[0][1]));
    return yderst[Math.floor(yderst.length / 2)] || [bx, bz];
  }

  // Smien indeni: seng, bord, den gamle lysekrone og ildstedet (som på fotoerne)
  function indretSmien(bx, bz, D, y0, inde) {
    const sæt = (x, y, z, id) => { if (inde(x, z) && !a.hent(x, y, z)) a.sæt(x, y, z, id); };
    sæt(bx + 1, y0 + 1, bz + 1, ID["Hvid uld"]); sæt(bx + 1, y0 + 1, bz + 2, ID["Hvid uld"]); sæt(bx + 2, y0 + 1, bz + 1, ID["Blå uld"]);
    sæt(bx + 3, y0 + 1, bz + Math.floor(D / 2), ID.Planker);
    sæt(bx + 3, y0 + 3, bz + Math.floor(D / 2), ID.Lampe);
    sæt(bx + 1, y0 + 1, bz + D - 2, ID.Mursten); sæt(bx + 1, y0 + 2, bz + D - 2, ID["Hvid puds"]);
  }

  // ---------- Planter oven på jorden: korn i rækker, blomster i haven, bregner i skoven ----------
  const naturlig = id => id === ID["Græs"] || id === ID.Muld || id === ID["Tørt græs"];
  for (let z = 1; z < BZ - 1; z++) for (let x = 1; x < BX - 1; x++) {
    const f = fladeAf(x, z), g = top[x + z * BX];
    if (f < 0 || !naturlig(a.hent(x, g, z)) || a.hent(x, g + 1, z) || kantAf(x, z) < KANT - 3) continue;
    const r = R(), sæt = id => a.sæt(x, g + 1, z, id);
    switch (f) {
      case KODE.kornmark: if (x % 3 && r < 0.3) sæt(ID["Højt græs"]); break;              // ung korn mellem furerne
      case KODE.hvedemark: if (x % 2 === 0 && r < 0.9) sæt(ID.Hvede); break;
      case KODE.eng: if (r < 0.09) sæt(ID["Højt græs"]); else if (r < 0.12) sæt([ID["Gul blomst"], ID["Hvid blomst"], ID["Blå blomst"]][Math.floor(r * 1000) % 3]); break;
      case KODE.have: if (r < 0.05) sæt([ID["Rød blomst"], ID["Gul blomst"], ID.Tulipan, ID["Hvid blomst"]][Math.floor(r * 1000) % 4]); break;
      case KODE.skovbund: if (r < 0.1) sæt(ID.Bregne); else if (r < 0.16) sæt(ID["Højt græs"]); break;
      case KODE.hogst: if (r < 0.015) sæt(ID["Død stamme"]); else if (r < 0.07) sæt(ID["Højt græs"]); break;
      case KODE.busk: sæt(ID.Blade); if (r < 0.4) a.sæt(x, g + 2, z, ID.Blade); break;
    }
  }

  // ---------- Træerne: gran og birk på Raet, store løvtræer ved gården og kirsebær i rækker ----------
  const GRAN = 0, BIRK = 1, LØV = 2, KIRSEBÆR = 3;
  const blad = (x, y, z, id) => { if (y < BY && !a.hent(x, y, z)) a.sæt(x, y, z, id); };
  const træ = (x, z, h, slags, bladId) => {
    if (x < 1 || z < 1 || x >= BX - 1 || z >= BZ - 1 || kantAf(x, z) < KANT || a.nærStart(x, z, 3)) return;
    const g = top[x + z * BX];
    if (!naturlig(a.hent(x, g, z))) return;                               // ikke på veje, grus og huse
    h = Math.max(3, Math.min(slags === KIRSEBÆR ? h : Math.round(h * 0.85), BY - 4 - g));
    if (slags === GRAN) {                                                 // spidst grantræ, lag på lag
      const r0 = Math.max(1, Math.round(h * 0.2));
      for (let y = 1; y < h; y++) a.sæt(x, g + y, z, ID.Træstamme);
      for (let y = 2; y <= h; y++) {
        let r = Math.round(r0 * (1 - (y - 2) / Math.max(1, h - 2)) + 0.3);
        if (y % 2 && r > 1) r--;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (dx * dx + dz * dz <= r * r + 0.5) blad(x + dx, g + y, z + dz, ID.Granblade);
      }
      blad(x, g + h + 1, z, ID.Granblade);
      return;
    }
    if (slags === KIRSEBÆR) {                                             // lille frugttræ med lyserøde blomster
      for (let y = 1; y < h; y++) a.sæt(x, g + y, z, ID.Træstamme);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        blad(x + dx, g + h - 1, z + dz, bladId || ID.Kirsebærblade);
        if (!dx || !dz) blad(x + dx, g + h, z + dz, bladId || ID.Kirsebærblade);
      }
      return;
    }
    // Birk og løvtræ: en stamme og en rund krone
    const rk = slags === BIRK ? Math.min(2, 1 + h * 0.1) : Math.max(2, Math.min(4.5, 1.6 + h * 0.17));
    const yc = g + h - Math.round(rk * 0.7), stamme = slags === BIRK ? ID.Birkestamme : ID.Træstamme;
    for (let y = g + 1; y <= yc; y++) a.sæt(x, y, z, stamme);
    const ri = Math.ceil(rk);
    for (let dy = -ri; dy <= ri; dy++) for (let dx = -ri; dx <= ri; dx++) for (let dz = -ri; dz <= ri; dz++) {
      const d = Math.sqrt(dx * dx + dz * dz + dy * dy * 1.6);
      if (d <= rk && (d < rk - 1 || R() < 0.8)) blad(x + dx, yc + dy + 1, z + dz, bladId || ID.Blade);
    }
  };
  for (let i = 0; i < TRÆER.length; i += 4) træ(TRÆER[i] + ox, TRÆER[i + 1] + oz, TRÆER[i + 2], TRÆER[i + 3]);

  // ---------- Små ting fra fotoerne: kirsebærtræet og havemøblerne ved smien, folden til hestene og høballer ----------
  const smia = BYGNINGER.find(b => b.slags === "smia"), låve = BYGNINGER.find(b => b.slags === "låve");
  const BLOKKE_KRYDS = new Set([ID["Højt græs"], ID.Hvede, ID.Bregne, ID["Gul blomst"], ID["Hvid blomst"], ID["Blå blomst"], ID["Rød blomst"], ID.Tulipan]);
  const påJorden = (x, z) => x > 0 && z > 0 && x < BX - 1 && z < BZ - 1 && kantAf(x, z) >= KANT && naturlig(a.hent(x, top[x + z * BX], z)) && !a.hent(x, top[x + z * BX] + 1, z);
  if (smia) {
    const sx = smia.x + ox, sz = smia.z + oz, W = smia.fod[0].length, D = smia.fod.length;
    træ(sx + W + 2, sz + D + 1, 7, LØV, ID.Kirsebærblade);                // det gamle kirsebærtræ ved smien
    // hvidt havebord med to stole og en lygte på en pæl — på den første ledige plet på plænen ved smien
    const bord = [[sx + W, sz + D + 3], [sx + 3, sz + D + 3], [sx + W + 4, sz + D - 2], [sx - 3, sz + D - 2]]
      .find(([x, z]) => påJorden(x, z) && påJorden(x - 1, z) && påJorden(x + 1, z) && påJorden(x, z + 2));
    if (bord) {
      const [x, z] = bord, y = top[x + z * BX] + 1;
      a.sæt(x, y, z, ID["Hvid puds"]); a.sæt(x - 1, y, z, ID.Hegn); a.sæt(x + 1, y, z, ID.Hegn);
      a.sæt(x, y, z + 2, ID.Hegn); a.sæt(x, y + 1, z + 2, ID.Lampe);
    }
    // Folden med hegn på marken sydvest for smiens have (hestene fra nabogården kigger forbi om sommeren)
    const fx0 = sx - 36, fx1 = sx - 4, fz0 = sz + 22, fz1 = sz + 44;
    for (let x = Math.max(1, fx0); x <= Math.min(BX - 2, fx1); x++) for (let z = Math.max(1, fz0); z <= Math.min(BZ - 2, fz1); z++) {
      if (kantAf(x, z) < KANT) continue;
      const g = top[x + z * BX], over = a.hent(x, g + 1, z);
      if (a.hent(x, g, z) === ID.Muld) a.sæt(x, g, z, ID["Græs"]);          // græs i folden i stedet for korn
      if (over && BLOKKE_KRYDS.has(over)) a.sæt(x, g + 1, z, 0);
      const rand = x === fx0 || x === fx1 || z === fz0 || z === fz1, låge = x === fx1 && Math.abs(z - fz0 - 5) <= 1;
      if (rand && !låge && påJorden(x, z)) a.sæt(x, g + 1, z, ID.Hegn);
      else if (!rand && R() < 0.05 && påJorden(x, z)) a.sæt(x, g + 1, z, ID["Højt græs"]);
    }
  }
  if (låve) {                                                             // høballer ved ladens nordende
    const lx = låve.x + ox + låve.fod[0].length + 2, lz = låve.z + oz + 1;
    for (let n = 0; n < 6; n++) {
      const x = lx + (n % 3), z = lz + Math.floor(n / 3) * 2, g = top[x + z * BX];
      if (x < BX - 1 && z > 0 && kantAf(x, z) >= KANT && !a.hent(x, g + 1, z)) a.sæt(x, g + 1, z, ID.Høballe);
    }
  }
}
