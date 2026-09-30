// ===== Den uendelige verden: landet laves stykke for stykke (søjler på 16 × 16), mens man går =====
// Samme frø giver altid det samme land, så kun det, børnene bygger og graver, skal gemmes.
// Årstiderne ligger efter sted: nord (−z) er vinter, syd (+z) sommer, øst (+x) efterår og vest (−x) forår.
// Midt i ligger hjemmet: en plads med lygter, en togstation, stenringen, spådamens telt, en butik,
// guldkisten og en luftballon — og fire stier og fire togbaner ud til årstiderne.
// Ude i landet: landsbyer (med en spådame i et telt), krystalgrotter i bjergene, kæmpetræer med
// trætophus og langt mod syd en dinojungle.
// Filen har ingen imports, så både spillet (spil.js) og serveren (verdener.js) kan bruge den.

export const STØRRELSE = 65536;                 // blokke i hver retning — i praksis uendeligt for små ben
export const MIDT = STØRRELSE / 2;              // her starter man (så koordinaterne aldrig bliver negative)
export const HAVNIVEAU = 14;                    // vandet går op til og med denne højde
export const HJEMHØJDE = 18;                    // pladsen derhjemme ligger i denne højde
export const TOG_Y = 24;                        // togbanen kører på søjler i denne højde (og i tunnel gennem bjergene)
export const STATION_HVER = 400;                // en station for hver 400 blokke ud ad hver bane
export const BANELÆNGDE = 2400;                 // så langt ud går banerne (seks stationer)

// De fire togbaner fra stationen derhjemme
export const BANER = [
  { navn: "vinter", ikon: "❄️", tekst: "Vinterlandet", dx: 0, dz: -1 },
  { navn: "sommer", ikon: "☀️", tekst: "Sommerlandet", dx: 0, dz: 1 },
  { navn: "efterår", ikon: "🍂", tekst: "Efterårslandet", dx: 1, dz: 0 },
  { navn: "forår", ikon: "🌸", tekst: "Forårslandet", dx: -1, dz: 0 },
];

// Tingene på hjemmepladsen (verdens-koordinater)
const H0 = HJEMHØJDE + 1;
export const HJEMSTED = {
  spådame: { x: MIDT + 12, y: H0, z: MIDT - 12 },          // teltet (spådamen står i midten)
  butik: { x: MIDT - 12, y: H0, z: MIDT + 12 },            // boden (købmanden står bag disken)
  kiste: { x: MIDT + 3, y: H0, z: MIDT + 3 },              // guldkisten
  ballon: { x: MIDT - 12, y: H0, z: MIDT - 12 },           // luftballonen står fortøjet her
  station: { x: MIDT, y: TOG_Y + 1, z: MIDT },             // perronen oven over pladsen
  sokler: [15, 75, 135, 195, 255, 315].map(g => {          // stenringens seks sokler
    const a = g * Math.PI / 180;
    return { x: MIDT + Math.round(Math.cos(a) * 8.5), y: H0 + 2, z: MIDT + Math.round(Math.sin(a) * 8.5) };
  }),
};

// Dyrene, der bor hvert sted (dyr.js) — i dinojunglen er turbo-dinoerne farlige: de skubber en omkuld
export const ÅRSTIDSDYR = {
  hjem: ["ko", "gris", "hone", "kanin"],
  forår: ["faar", "kanin", "hone", "and"],
  sommer: ["ko", "gris", "hest", "hone"],
  efterår: ["gris", "hest", "kanin", "faar"],
  vinter: ["pingvin", "rensdyr", "pingvin"],
  jungle: ["triceratops", "langhals", "dinounge", "dino", "dino"],
};

const glat = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x, z, s) {                         // et fast "tilfældigt" tal mellem 0 og 1 for hvert sted
  let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(s, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const RETNINGER = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Alle felter i et gitter med feltstørrelsen celle, som rører firkanten (x0, z0)–(x1, z1)
function iCeller(celle, x0, z0, x1, z1, fn) {
  for (let gx = Math.floor(x0 / celle); gx <= Math.floor(x1 / celle); gx++) for (let gz = Math.floor(z0 / celle); gz <= Math.floor(z1 / celle); gz++) fn(gx, gz);
}

// Husk svaret for hvert felt (det samme felt spørges om fra mange søjler)
function husket(fn) {
  const m = new Map();
  return (gx, gz) => {
    const k = gx * 100003 + gz;
    if (m.has(k)) return m.get(k);
    if (m.size > 4000) m.clear();
    const v = fn(gx, gz); m.set(k, v);
    return v;
  };
}

// støj: lavStøj(frø) fra verden.js · ID: blokkenes numre · BY: verdenens højde · frø: et helt tal
export function lavLand({ støj, ID, BY, frø }) {
  const S = (x, z, skala, f) => støj(x / skala + f, z / skala - f * 0.7);
  const H = (x, z, n) => hash(x, z, (frø + n * 7919) | 0);
  const TOP = BY - 6, SNE = Math.min(38, BY - 10), TRÆGRÆNSE = SNE - 3;
  const BLOMSTER = [ID.Tulipan, ID["Hvid blomst"], ID["Blå blomst"], ID["Gul blomst"], ID["Rød blomst"]];
  const LØV = [ID["Orange blade"], ID["Røde blade"], ID["Gule blade"]];
  const BLOKKE_KRYDS = new Set([...BLOMSTER, ID["Højt græs"], ID.Bregne, ID["Tør busk"], ID["Lille svamp"], ID.Solsikke, ID.Lian]);

  // Hvilken årstid er det her? Grænserne bugter sig mere og mere, jo længere ud man kommer
  function årstid(x, z) {
    const rx = x - MIDT, rz = z - MIDT, d = Math.hypot(rx, rz);
    if (d < 40 + S(x, z, 12, 50) * 10) return "hjem";
    const bugt = 140 * glat(40, 220, d);
    const wx = rx + (S(x, z, 70, 100) - 0.5) * bugt + (S(x, z, 6, 130) - 0.5) * 12;
    const wz = rz + (S(x, z, 70, 200) - 0.5) * bugt + (S(x, z, 6, 230) - 0.5) * 12;
    if (Math.abs(wz) > Math.abs(wx)) return wz < 0 ? "vinter" : "sommer";
    return wx > 0 ? "efterår" : "forår";
  }
  // Som årstid(), men dybt inde i sommerlandet ligger dinojunglen
  function område(x, z) {
    const å = årstid(x, z);
    if (å === "sommer" && Math.hypot(x - MIDT, z - MIDT) > 380 && S(x, z, 110, 1000) > 0.55) return "jungle";
    return å;
  }

  // Landets højde: store lave områder (søer og hav), bløde bakker og høje bjerge
  const bjergHer = (x, z) => glat(0.58, 0.82, S(x, z, 95, 600));
  function højde(x, z) {
    const d = Math.hypot(x - MIDT, z - MIDT);
    const land = S(x, z, 150, 300), bakker = S(x, z, 38, 400) * 0.65 + S(x, z, 13, 500) * 0.35;
    let h = 7 + land * 14 + bakker * 7 + bjergHer(x, z) * (16 + S(x, z, 20, 700) * 16);
    const hjem = glat(90, 34, d);                  // fladt og tørt omkring hjemmet
    h = h * (1 - hjem) + HJEMHØJDE * hjem;
    return Math.max(2, Math.min(TOP, Math.round(h)));
  }

  // Overfladen et sted: højde, årstid, øverste blok og blokken under den
  function overflade(x, z) {
    const h = højde(x, z), å = område(x, z), rx = x - MIDT, rz = z - MIDT, d = Math.hypot(rx, rz);
    const plads = d <= 5.5;
    const sti = !plads && ((d < 170 && (Math.abs(rx) <= 1 || Math.abs(rz) <= 1)) || (d < 17 && (Math.abs(rx + rz) <= 1 || Math.abs(rx - rz) <= 1)));
    const vand = h < HAVNIVEAU;
    const stejl = Math.max(Math.abs(højde(x + 1, z) - h), Math.abs(højde(x - 1, z) - h), Math.abs(højde(x, z + 1) - h), Math.abs(højde(x, z - 1) - h)) >= 3;
    let top = ID.Græs, under = ID.Jord;
    if (plads) top = ID.Fliser;
    else if (vand || h <= HAVNIVEAU + 1) { top = !vand && å === "vinter" ? ID.Sne : ID.Sand; under = ID.Sand; }   // søbund og strand (med sne om vinteren)
    else if (sti) top = ID.Sand;                                                  // stierne ud til årstiderne
    else if (h >= SNE) { top = ID.Sne; under = ID.Sten; }                         // sne på bjergtoppene
    else if (stejl) { top = ID.Sten; under = ID.Sten; }                           // klipper
    else if (å === "vinter") top = ID.Sne;
    else if (å === "efterår" && H(x, z, 3) < 0.35) top = ID["Tørt græs"];
    else if (å === "jungle") top = H(x, z, 3) < 0.4 ? ID["Mørkt græs"] : ID.Græs;
    return { h, å, top, under, vand, plads, sti };
  }

  // Blomster, græs, græskar, svampe og bregner oven på jorden
  function plante(x, z, o) {
    if (o.vand || o.plads || o.sti || o.top === ID.Sand || o.top === ID.Sten || o.h >= SNE) return 0;
    const r = H(x, z, 5), v = H(x, z, 6);
    switch (o.å) {
      case "forår": return r < 0.07 ? BLOMSTER[Math.floor(v * 4)] : r < 0.15 ? ID["Højt græs"] : 0;
      case "sommer":
        if (S(x, z, 28, 900) > 0.66) return r < 0.4 ? ID.Solsikke : r < 0.5 ? ID["Gul blomst"] : 0;   // solsikkemarker
        return r < 0.035 ? BLOMSTER[3 + Math.floor(v * 2)] : r < 0.12 ? ID["Højt græs"] : 0;
      case "jungle": return r < 0.14 ? ID.Bregne : r < 0.24 ? ID["Højt græs"] : 0;
      case "efterår": return r < 0.008 ? ID.Græskar : r < 0.024 ? ID["Lille svamp"] : r < 0.04 ? ID["Tør busk"] : r < 0.08 ? ID["Højt græs"] : 0;
      case "vinter": return r < 0.01 ? ID["Tør busk"] : 0;
      default: return r < 0.03 ? BLOMSTER[Math.floor(v * 5)] : r < 0.09 ? ID["Højt græs"] : 0;
    }
  }

  // Står der et træ her? Svarer med træet (eller null). Skovene er der, hvor der står mange
  function træ(x, z) {
    const r = H(x, z, 9);
    if (r > 0.1) return null;                      // hurtigt nej de fleste steder
    const o = overflade(x, z);
    const strand = o.å === "sommer" && o.top === ID.Sand && !o.vand && !o.sti && !o.plads;   // palmer på sommerstrandene
    if (o.vand || o.plads || o.sti || (o.top === ID.Sand && !strand) || o.top === ID.Sten || o.h >= TRÆGRÆNSE || o.h + 12 >= BY) return null;
    if (o.å === "hjem" && Math.hypot(x - MIDT, z - MIDT) < 20) return null;         // pladsen derhjemme skal være åben
    if (Math.abs(x - MIDT) < 7 || Math.abs(z - MIDT) < 7) return null;              // ingen træer hen over togbanerne
    const skov = glat(0.5, 0.72, S(x, z, 45, 800));
    const tæthed = strand ? 0.06 : o.å === "hjem" ? 0.003 : o.å === "jungle" ? 0.06
      : { forår: 0.012, sommer: 0.007, efterår: 0.016, vinter: 0.012 }[o.å] * (1 + skov * 5);
    return r < tæthed ? { x, z, h: o.h, å: o.å, v: H(x, z, 11), palme: strand } : null;
  }

  // Tegn et træ. put(x, y, z, id, stamme) sætter kun blokke inde i den søjle, der er ved at blive lavet
  function tegnTræ({ x, z, h, å, v, palme }, put) {
    if (palme) {                                   // palme: en høj stamme og store blade, der hænger ned
      const top = h + 6 + (Math.floor(v * 100) % 2);
      for (let y = h + 1; y < top; y++) put(x, y, z, ID.Palmestamme, true);
      put(x, top, z, ID.Palmeblade);
      for (const [dx, dz] of RETNINGER) {
        put(x + dx, top, z + dz, ID.Palmeblade); put(x + dx * 2, top, z + dz * 2, ID.Palmeblade); put(x + dx * 3, top - 1, z + dz * 3, ID.Palmeblade);
      }
      return;
    }
    const skive = (y, r, blade) => {               // et rundt lag blade
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (dx * dx + dz * dz <= r * r + 0.6) put(x + dx, y, z + dz, blade);
    };
    if (å === "jungle") {                          // junglens høje træer med lianer, der hænger ned
      const top = h + 9 + Math.floor(v * 4);
      for (let y = h + 1; y < top; y++) put(x, y, z, ID.Junglestamme, true);
      skive(top - 1, 3, ID.Jungleblade); skive(top, 3, ID.Jungleblade); skive(top + 1, 2, ID.Jungleblade);
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2]]) {
        const l = 1 + Math.floor(H(x + dx, z + dz, 13) * 3);
        for (let k = 1; k <= l; k++) put(x + dx, top - 1 - k, z + dz, ID.Lian);
      }
      return;
    }
    let stamme = ID.Træstamme, blade = ID.Blade, form = v < 0.25 ? "stor" : "eg";
    if (å === "vinter") { form = "gran"; blade = ID.Snegran; }
    else if (å === "forår") { if (v < 0.6) { form = "kirsebær"; blade = ID.Kirsebærblade; } else { form = "birk"; stamme = ID.Birkestamme; } }
    else if (å === "efterår") { blade = LØV[Math.floor(v * 3)]; if (v > 0.66) { form = "birk"; stamme = ID.Birkestamme; } }
    const y0 = h + 1, top = y0 + { eg: 4, stor: 6, birk: 5, kirsebær: 4, gran: 7 }[form] + (Math.floor(v * 100) % 2);
    for (let y = y0; y < top; y++) put(x, y, z, stamme, true);
    if (form === "gran") {                         // en spids kegle
      for (let y = y0 + 2; y <= top; y++) skive(y, Math.max(0, Math.round((top - y) * 0.45)), blade);
      put(x, top + 1, z, blade);
    } else if (form === "kirsebær") { skive(top - 1, 3, blade); skive(top, 3, blade); skive(top + 1, 2, blade); }
    else if (form === "birk") { skive(top - 2, 1, blade); skive(top - 1, 2, blade); skive(top, 2, blade); skive(top + 1, 1, blade); }
    else { const r = form === "stor" ? 3 : 2; skive(top - 2, r - 1, blade); skive(top - 1, r, blade); skive(top, r, blade); skive(top + 1, r - 1, blade); }
  }

  // ---------- Landsbyer: små huse om en brønd, og et telt, hvor der bor en spådame ----------
  const LANDSBY_CELLE = 224;
  const nærBane = (x, z, r) => Math.abs(x - MIDT) < r || Math.abs(z - MIDT) < r;
  const landsby = husket((gx, gz) => {
    if (H(gx, gz, 21) > 0.6) return null;
    const x = gx * LANDSBY_CELLE + 40 + Math.floor(H(gx, gz, 22) * (LANDSBY_CELLE - 80));
    const z = gz * LANDSBY_CELLE + 40 + Math.floor(H(gx, gz, 23) * (LANDSBY_CELLE - 80));
    if (Math.hypot(x - MIDT, z - MIDT) < 180 || nærBane(x, z, 32)) return null;
    const o = overflade(x, z);
    if (o.vand || o.h >= TRÆGRÆNSE - 4 || o.h + 12 >= BY) return null;
    const n = 4 + Math.floor(H(gx, gz, 24) * 3), huse = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + H(gx, gz, 25) * 0.6;
      const hx = Math.round(x + Math.cos(a) * 12), hz = Math.round(z + Math.sin(a) * 12), hh = højde(hx, hz);
      if (hh < HAVNIVEAU + 1 || Math.abs(hh - o.h) > 6) continue;
      const dør = Math.abs(x - hx) > Math.abs(z - hz) ? [Math.sign(x - hx), 0] : [0, Math.sign(z - hz)];
      huse.push({ x: hx, z: hz, h: hh, dør, telt: huse.length === 0 });
    }
    return huse.length ? { x, z, h: o.h, å: o.å, huse } : null;
  });
  // Alle landsbyer, hvis midte ligger i firkanten (til kortet og spådamerne i spil.js)
  function landsbyer(x0, z0, x1, z1) {
    const ud = [];
    iCeller(LANDSBY_CELLE, x0, z0, x1, z1, (gx, gz) => { const l = landsby(gx, gz); if (l && l.x >= x0 && l.x <= x1 && l.z >= z0 && l.z <= z1) ud.push(l); });
    return ud;
  }

  // ---------- Krystalgrotter inde i bjergene: en hule med glødende krystaller og en skattekiste ----------
  const GROTTE_CELLE = 112;
  const grotte = husket((gx, gz) => {
    if (H(gx, gz, 31) > 0.6) return null;
    const x = gx * GROTTE_CELLE + 20 + Math.floor(H(gx, gz, 32) * 72), z = gz * GROTTE_CELLE + 20 + Math.floor(H(gx, gz, 33) * 72);
    if (bjergHer(x, z) < 0.5 || nærBane(x, z, 20)) return null;
    const h = højde(x, z);
    if (h < 30) return null;
    const y = Math.max(HAVNIVEAU + 3, h - 12);
    let bedst = null;                              // tunnelen går ud til den side, hvor bjerget er lavest
    for (const [dx, dz] of RETNINGER) for (let k = 7; k <= 40; k++) {
      if (højde(x + dx * k, z + dz * k) <= y) { if (!bedst || k < bedst.k) bedst = { dx, dz, k }; break; }
    }
    return bedst ? { x, y, z, ...bedst } : null;
  });

  // ---------- Kæmpetræer: en tyk stamme, en trappe rundt om, og et trætophus med en skattekiste ----------
  const KÆMPE_CELLE = 176;
  const kæmpetræ = husket((gx, gz) => {
    if (H(gx, gz, 41) > 0.45) return null;
    const x = gx * KÆMPE_CELLE + 30 + Math.floor(H(gx, gz, 42) * 116), z = gz * KÆMPE_CELLE + 30 + Math.floor(H(gx, gz, 43) * 116);
    if (Math.hypot(x - MIDT, z - MIDT) < 120 || nærBane(x, z, 16)) return null;
    const o = overflade(x, z);
    if (o.vand || o.top === ID.Sten || o.top === ID.Sand || o.h >= TRÆGRÆNSE - 2 || o.å === "vinter" || o.h + 29 >= BY) return null;
    return { x, z, h: o.h, å: o.å };
  });

  // Lav en søjle på 16 × 16 blokke (cx, cz tæller i søjler). Svarer med blokkene som (x + z·16 + y·256)
  function søjle(cx, cz) {
    const data = new Uint8Array(256 * BY), x0 = cx * 16, z0 = cz * 16, x1 = x0 + 15, z1 = z0 + 15;
    const inde = (x, y, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1 && y >= 1 && y < BY;
    const nr = (x, y, z) => (x - x0) + (z - z0) * 16 + y * 256;
    const put = (x, y, z, id, stamme) => {         // blade og blomster kun i luft — stammer går igennem
      if (!inde(x, y, z)) return;
      const i = nr(x, y, z);
      if (!data[i] || stamme) data[i] = id;
    };
    const sæt = (x, y, z, id) => { if (inde(x, y, z)) data[nr(x, y, z)] = id; };   // bygninger: altid
    const hent = (x, y, z) => (inde(x, y, z) ? data[nr(x, y, z)] : 0);
    const rører = (xa, za, xb, zb) => xb >= x0 && xa <= x1 && zb >= z0 && za <= z1;

    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const o = overflade(x, z), i = (x - x0) + (z - z0) * 16;
      data[i] = ID.Bundsten;
      for (let y = 1; y <= o.h; y++) data[i + y * 256] = y === o.h ? o.top : y >= o.h - 3 ? o.under : ID.Sten;
      if (o.vand) {                                // søer og hav — og is på dem om vinteren
        for (let y = o.h + 1; y <= HAVNIVEAU && y < BY; y++) data[i + y * 256] = ID.Vand;
        if (o.å === "vinter") data[i + HAVNIVEAU * 256] = ID.Is;
      } else if (o.h + 1 < BY) {
        const p = plante(x, z, o);
        if (p) data[i + (o.h + 1) * 256] = p;
      }
    }
    // træer fra søjlen selv og lidt uden for (kronerne rækker ind over kanten)
    for (let z = z0 - 3; z <= z1 + 3; z++) for (let x = x0 - 3; x <= x1 + 3; x++) {
      const t = træ(x, z);
      if (t) tegnTræ(t, put);
    }

    // Gør en firkant flad i højden h: jord under, luft over (til huse og telte)
    const flad = (xa, za, xb, zb, h, top) => {
      for (let x = Math.max(xa, x0); x <= Math.min(xb, x1); x++) for (let z = Math.max(za, z0); z <= Math.min(zb, z1); z++) {
        for (let y = 1; y < h; y++) if (!hent(x, y, z) || hent(x, y, z) === ID.Vand) sæt(x, y, z, ID.Jord);
        sæt(x, h, z, top);
        for (let y = h + 1; y <= Math.min(BY - 1, h + 12); y++) sæt(x, y, z, 0);
      }
    };
    const vægFor = å => ({ vinter: ID.Planker, efterår: ID.Mursten, forår: ID["Hvid puds"], sommer: ID["Gul puds"] }[å] || ID.Planker);
    // Et lille hus med dør ind mod landsbyens midte, vinduer og et spidst tag
    const hus = ({ x, z, h, dør: [ddx, ddz] }, å) => {
      if (!rører(x - 3, z - 3, x + 3, z + 3)) return;
      const væg = vægFor(å), tag = å === "vinter" ? ID.Sne : ID.Tagsten;
      flad(x - 3, z - 3, x + 3, z + 3, h, å === "vinter" ? ID.Sne : ID.Græs);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        sæt(x + dx, h, z + dz, ID.Planker);
        const kant = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        for (let y = h + 1; y <= h + 3; y++) sæt(x + dx, y, z + dz, kant ? væg : 0);
      }
      for (const [dx, dz] of RETNINGER) {
        if (dx === ddx && dz === ddz) { sæt(x + dx * 2, h + 1, z + dz * 2, 0); sæt(x + dx * 2, h + 2, z + dz * 2, 0); }
        else sæt(x + dx * 2, h + 2, z + dz * 2, ID.Glas);
      }
      for (let lag = 0; lag < 4; lag++) {        // taget: fire lag, der bliver mindre og mindre
        const r = 3 - lag;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) sæt(x + dx, h + 4 + lag, z + dz, tag);
      }
      sæt(x, h + 3, z, ID.Lampe);
    };
    // Spådamens telt: stribet stof, en spids top og en lampe i loftet
    const telt = ({ x, z, h, dør: [ddx, ddz] }, græs) => {
      if (!rører(x - 3, z - 3, x + 3, z + 3)) return;
      flad(x - 3, z - 3, x + 3, z + 3, h, græs);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        sæt(x + dx, h, z + dz, ID.Planker);
        const kant = Math.abs(dx) === 2 || Math.abs(dz) === 2, stof = (dx + dz) & 1 ? ID["Lilla uld"] : ID["Lyserød uld"];
        for (let y = h + 1; y <= h + 2; y++) sæt(x + dx, y, z + dz, kant ? stof : 0);
        sæt(x + dx, h + 3, z + dz, ID["Lilla uld"]);
      }
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) sæt(x + dx, h + 4, z + dz, ID["Lyserød uld"]);
      sæt(x, h + 5, z, ID["Gul uld"]);
      sæt(x, h + 3, z, ID.Lampe);
      sæt(x + ddx * 2, h + 1, z + ddz * 2, 0); sæt(x + ddx * 2, h + 2, z + ddz * 2, 0);
    };

    // ---- landsbyer ----
    iCeller(LANDSBY_CELLE, x0 - 60, z0 - 60, x1 + 60, z1 + 60, (gx, gz) => {
      const l = landsby(gx, gz);
      if (!l || !rører(l.x - 20, l.z - 20, l.x + 20, l.z + 20)) return;
      const græs = l.å === "vinter" ? ID.Sne : ID.Græs;
      for (const b of l.huse) {                    // stier fra brønden hen til husene
        const n = Math.max(Math.abs(b.x - l.x), Math.abs(b.z - l.z));
        for (let k = 0; k <= n; k++) {
          const x = Math.round(l.x + (b.x - l.x) * k / n), z = Math.round(l.z + (b.z - l.z) * k / n);
          if (!inde(x, 1, z)) continue;
          const y = højde(x, z);
          if (y >= HAVNIVEAU) { sæt(x, y, z, ID.Sand); if (hent(x, y + 1, z) && hent(x, y + 1, z) !== ID.Træstamme) sæt(x, y + 1, z, 0); }
        }
      }
      for (const b of l.huse) { if (b.telt) telt(b, græs); else hus(b, l.å); }
      flad(l.x - 2, l.z - 2, l.x + 2, l.z + 2, l.h, græs);              // brønden
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) sæt(l.x + dx, l.h + 1, l.z + dz, dx || dz ? ID.Borgsten : ID.Vand);
      sæt(l.x, l.h, l.z, ID.Vand);
      for (const [dx, dz] of [[-1, -1], [1, 1]]) { sæt(l.x + dx, l.h + 2, l.z + dz, ID.Hegn); sæt(l.x + dx, l.h + 3, l.z + dz, ID.Hegn); }
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) sæt(l.x + dx, l.h + 4, l.z + dz, ID.Tagsten);
    });

    // ---- krystalgrotter ----
    iCeller(GROTTE_CELLE, x0 - 50, z0 - 50, x1 + 50, z1 + 50, (gx, gz) => {
      const g = grotte(gx, gz);
      if (!g || !rører(g.x - 50, g.z - 50, g.x + 50, g.z + 50)) return;
      for (let x = Math.max(x0, g.x - 7); x <= Math.min(x1, g.x + 7); x++) for (let z = Math.max(z0, g.z - 7); z <= Math.min(z1, g.z + 7); z++) {
        for (let y = g.y - 1; y <= g.y + 6; y++) {
          const d = ((x - g.x) / 6.5) ** 2 + ((z - g.z) / 6.5) ** 2 + ((y - g.y) / 5.5) ** 2;
          if (y >= g.y && d < 1) sæt(x, y, z, 0);                       // selve hulen (med fladt gulv)
          else if (d < 1.35 && hent(x, y, z) && H(x * 7 + y, z, 34) < 0.12) sæt(x, y, z, ID.Glødesten);   // glødende sten i væggene
        }
        const d2 = ((x - g.x) / 6.5) ** 2 + ((z - g.z) / 6.5) ** 2;
        if (d2 < 0.8 && H(x, z, 35) < 0.18) sæt(x, g.y, z, ID.Krystal);  // krystaller på gulvet
      }
      for (let k = 0; k <= g.k + 2; k++) for (let s = -1; s <= 1; s++) {  // tunnelen ud af bjerget
        const x = g.x + g.dx * k + (g.dz ? s : 0), z = g.z + g.dz * k + (g.dx ? s : 0);
        for (let y = g.y; y <= g.y + 2; y++) sæt(x, y, z, 0);
        if (k > 6 && s === 0 && k % 5 === 0) sæt(x, g.y + 2, z, ID.Lampe);
      }
      sæt(g.x - g.dx * 3, g.y, g.z - g.dz * 3, ID.Skattekiste);
    });

    // ---- kæmpetræer ----
    iCeller(KÆMPE_CELLE, x0 - 12, z0 - 12, x1 + 12, z1 + 12, (gx, gz) => {
      const t = kæmpetræ(gx, gz);
      if (!t || !rører(t.x - 10, t.z - 10, t.x + 10, t.z + 10)) return;
      const { x, z, h } = t, blade = t.å === "forår" ? ID.Kirsebærblade : t.å === "efterår" ? ID["Orange blade"] : t.å === "jungle" ? ID.Jungleblade : ID.Blade;
      const top = h + 24, hus = h + 13;
      for (let y = top - 4; y <= top + 3; y++) {                        // en stor, rund krone
        const r = 8 - Math.abs(y - top) * 1.2;
        for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) if (dx * dx + dz * dz <= r * r && (y > top - 3 || H(x + dx, z + dz, 44) < 0.8)) put(x + dx, y, z + dz, blade);
      }
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = h + 1; y < top; y++) sæt(x + dx, y, z + dz, ID.Træstamme);
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {   // trætophuset: et gulv med et gelænder
        const d = dx * dx + dz * dz;
        if (d > 18.5 || (Math.abs(dx) <= 1 && Math.abs(dz) <= 1)) continue;
        sæt(x + dx, hus, z + dz, ID.Planker);
        for (let y = hus + 1; y <= hus + 3; y++) sæt(x + dx, y, z + dz, 0);
        if (d > 12.5 && !(dx === 4 && Math.abs(dz) <= 1)) sæt(x + dx, hus + 1, z + dz, ID.Hegn);
      }
      sæt(x + 3, hus + 1, z - 1, ID.Skattekiste); sæt(x - 3, hus + 3, z, ID.Lampe);
      const ring = [];                                                // trappen snor sig op rundt om stammen
      for (let i = -2; i <= 2; i++) ring.push([2, i]); for (let i = 1; i >= -2; i--) ring.push([i, 2]);
      for (let i = 1; i >= -2; i--) ring.push([-2, i]); for (let i = -1; i <= 1; i++) ring.push([i, -2]);
      for (let i = 0; i < hus - h; i++) {
        const [dx, dz] = ring[i % ring.length];
        sæt(x + dx, h + 1 + i, z + dz, ID.Planker);
        for (let y = h + 2 + i; y <= h + 4 + i && y < hus; y++) sæt(x + dx, y, z + dz, 0);
      }
      sæt(x - 2, hus, z, 0); sæt(x - 2, hus, z - 1, 0);                  // hullet i gulvet, hvor trappen kommer op
    });

    // ---- hjemmet ----
    if (rører(MIDT - 22, MIDT - 22, MIDT + 22, MIDT + 22)) {
      const hh = HJEMHØJDE;
      for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {  // fire lygtepæle
        sæt(MIDT + dx, hh + 1, MIDT + dz, ID.Hegn); sæt(MIDT + dx, hh + 2, MIDT + dz, ID.Hegn); sæt(MIDT + dx, hh + 3, MIDT + dz, ID.Lampe);
      }
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {   // perronen oven over pladsen
        const x = MIDT + dx, z = MIDT + dz, kant = Math.abs(dx) === 4 || Math.abs(dz) === 4;
        sæt(x, TOG_Y, z, dx === 0 ? ID.Skinner : dz === 0 ? ID["Skinner øst-vest"] : ID.Planker);
        const åben = Math.abs(dx) <= 1 || Math.abs(dz) <= 1 || (dx === 4 && (dz === -3 || dz === -4));
        if (kant && !åben) sæt(x, TOG_Y + 1, z, ID.Hegn);
        if (Math.abs(dx) === 4 && Math.abs(dz) === 4) for (let y = hh + 1; y < TOG_Y; y++) sæt(x, y, z, ID.Mursten);
      }
      for (let j = 0; j <= 5; j++) for (const dz of [-3, -4]) {        // trappen op til perronen
        const x = MIDT + 5 + j, z = MIDT + dz, top = TOG_Y - j;
        for (let y = hh + 1; y <= top; y++) sæt(x, y, z, ID.Planker);
        for (let y = top + 1; y <= top + 3; y++) sæt(x, y, z, 0);
      }
      for (const s of HJEMSTED.sokler) {                               // stenringen
        sæt(s.x, hh + 1, s.z, ID.Borgsten); sæt(s.x, hh + 2, s.z, ID.Stensokkel);
      }
      telt({ x: HJEMSTED.spådame.x, z: HJEMSTED.spådame.z, h: hh, dør: [-1, 0] }, ID.Græs);
      const b = HJEMSTED.butik;                                        // butikken: en disk, fire pæle og en stribet markise
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        for (let y = hh + 1; y <= hh + 5; y++) sæt(b.x + dx, y, b.z + dz, 0);
        sæt(b.x + dx, hh + 4, b.z + dz, dz & 1 ? ID["Hvid uld"] : ID["Rød uld"]);
      }
      for (let dz = -2; dz <= 2; dz++) sæt(b.x + 2, hh + 1, b.z + dz, ID.Planker);
      sæt(b.x + 2, hh + 2, b.z - 1, ID.Græskar); sæt(b.x + 2, hh + 2, b.z, ID.Ost); sæt(b.x + 2, hh + 2, b.z + 1, ID.Kage);
      for (const [dx, dz] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) for (let y = hh + 1; y <= hh + 3; y++) sæt(b.x + dx, y, b.z + dz, ID.Hegn);
      sæt(HJEMSTED.kiste.x, hh + 1, HJEMSTED.kiste.z, ID.Guldkiste);     // guldkisten på pladsen
      sæt(HJEMSTED.ballon.x + 2, hh + 1, HJEMSTED.ballon.z, ID.Hegn);     // ballonens fortøjningspæl
    }

    // ---- togbanerne: på søjler i luften og i tunnel gennem bjergene, med stationer ----
    const spor = (x, z, o, r, langsZ) => {
      sæt(x, TOG_Y, z, o === 0 ? (langsZ ? ID.Skinner : ID["Skinner øst-vest"]) : ID.Planker);
      for (let y = TOG_Y + 1; y <= Math.min(BY - 1, TOG_Y + 4); y++) sæt(x, y, z, 0);
    };
    const pille = (x, z) => { for (let y = 1; y < TOG_Y; y++) if (!hent(x, y, z) || hent(x, y, z) === ID.Vand || hent(x, y, z) === ID.Is || BLOKKE_KRYDS.has(hent(x, y, z))) sæt(x, y, z, ID.Mursten); };
    // en søjle for hver 8 blokke — tæt på hjemmet to søjler og en bjælke, så stien kan gå under banen
    const søjler = (r, ved) => {
      if (r % 8) return;
      if (r < 175) { ved(-2, pille); ved(2, pille); for (let o = -2; o <= 2; o++) ved(o, (x, z) => sæt(x, TOG_Y - 1, z, ID.Mursten)); }
      else ved(0, pille);
    };
    const station = (px, pz, langsZ) => {          // perron og en trappe ned (eller op) til landet
      for (let l = -4; l <= 4; l++) for (let o = -3; o <= 3; o++) {
        const x = langsZ ? px + o : px + l, z = langsZ ? pz + l : pz + o;
        if (Math.abs(o) >= 2) { sæt(x, TOG_Y, z, ID.Planker); for (let y = TOG_Y + 1; y <= Math.min(BY - 1, TOG_Y + 4); y++) sæt(x, y, z, 0); }
        if (Math.abs(o) === 3 && Math.abs(l) >= 2) sæt(x, TOG_Y + 1, z, ID.Hegn);
      }
      for (const l of [0, 1]) {
        let y = TOG_Y;
        for (let k = 4; k < 30; k++) {
          const x = langsZ ? px + k : px + l, z = langsZ ? pz + l : pz + k, g = højde(x, z);
          if (y === g) break;
          y += g > y ? 1 : -1;
          for (let yy = Math.max(1, Math.min(y, g)); yy <= y; yy++) sæt(x, yy, z, ID.Planker);
          for (let yy = y + 1; yy <= Math.min(BY - 1, y + 3); yy++) sæt(x, yy, z, 0);
        }
      }
    };
    if (x1 >= MIDT - 30 && x0 <= MIDT + 30) for (let z = z0; z <= z1; z++) {     // nord–syd
      const r = Math.abs(z - MIDT);
      if (r < 5 || r > BANELÆNGDE) continue;
      for (let o = -1; o <= 1; o++) spor(MIDT + o, z, o, r, true);
      søjler(r, (o, fn) => fn(MIDT + o, z));
      if (r % STATION_HVER === 0) station(MIDT, z, true);
    }
    if (z1 >= MIDT - 30 && z0 <= MIDT + 30) for (let x = x0; x <= x1; x++) {     // øst–vest
      const r = Math.abs(x - MIDT);
      if (r < 5 || r > BANELÆNGDE) continue;
      for (let o = -1; o <= 1; o++) spor(x, MIDT + o, o, r, false);
      søjler(r, (o, fn) => fn(x, MIDT + o));
      if (r % STATION_HVER === 0) station(x, MIDT, false);
    }
    // stationerne ligger tæt på banen, men trappen kan række ind i nabosøjlen
    for (const b of BANER) for (let k = 1; k * STATION_HVER <= BANELÆNGDE; k++) {
      const px = MIDT + b.dx * k * STATION_HVER, pz = MIDT + b.dz * k * STATION_HVER, langsZ = b.dz !== 0;
      if (rører(px - 32, pz - 32, px + 32, pz + 32) && !(langsZ ? (px >= x0 && px <= x1 && pz >= z0 && pz <= z1) : (pz >= z0 && pz <= z1 && px >= x0 && px <= x1))) station(px, pz, langsZ);
    }
    return data;
  }

  return { søjle, årstid, område, højde, landsbyer };
}
