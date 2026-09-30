// ===== Uendelighedsverdenen: landet laves stykke for stykke (søjler på 16 × 16), mens man går =====
// Samme frø giver altid det samme land, så kun det, børnene bygger og graver, skal gemmes.
// Årstiderne ligger efter sted: nord (−z) er vinter, syd (+z) sommer, øst (+x) efterår og vest (−x) forår.
// Midt i ligger hjemmet: en lille plads med lygter og fire stier ud til årstiderne.
// Filen har ingen imports, så både spillet (spil.js) og serveren (verdener.js) kan bruge den.

export const STØRRELSE = 65536;                 // blokke i hver retning — i praksis uendeligt for små ben
export const MIDT = STØRRELSE / 2;              // her starter man (så koordinaterne aldrig bliver negative)
export const HAVNIVEAU = 14;                    // vandet går op til og med denne højde

// Dyrene, der bor i hver årstid (dyr.js)
export const ÅRSTIDSDYR = {
  hjem: ["ko", "gris", "hone", "kanin"],
  forår: ["faar", "kanin", "hone", "and"],
  sommer: ["ko", "gris", "hest", "hone"],
  efterår: ["gris", "hest", "kanin", "faar"],
  vinter: ["pingvin", "rensdyr", "pingvin"],
};

const glat = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(x, z, s) {                         // et fast "tilfældigt" tal mellem 0 og 1 for hvert sted
  let n = (Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(s, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// støj: lavStøj(frø) fra verden.js · ID: blokkenes numre · BY: verdenens højde · frø: et helt tal
export function lavLand({ støj, ID, BY, frø }) {
  const S = (x, z, skala, f) => støj(x / skala + f, z / skala - f * 0.7);
  const H = (x, z, n) => hash(x, z, (frø + n * 7919) | 0);
  const TOP = BY - 6, SNE = Math.min(38, BY - 10), TRÆGRÆNSE = SNE - 3;
  const BLOMSTER = [ID.Tulipan, ID["Hvid blomst"], ID["Blå blomst"], ID["Gul blomst"], ID["Rød blomst"]];
  const LØV = [ID["Orange blade"], ID["Røde blade"], ID["Gule blade"]];

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

  // Landets højde: store lave områder (søer og hav), bløde bakker og høje bjerge
  function højde(x, z) {
    const d = Math.hypot(x - MIDT, z - MIDT);
    const land = S(x, z, 150, 300), bakker = S(x, z, 38, 400) * 0.65 + S(x, z, 13, 500) * 0.35;
    const bjerg = glat(0.58, 0.82, S(x, z, 95, 600));
    let h = 7 + land * 14 + bakker * 7 + bjerg * (16 + S(x, z, 20, 700) * 16);
    const hjem = glat(90, 34, d);                  // fladt og tørt omkring hjemmet
    h = h * (1 - hjem) + 18 * hjem;
    return Math.max(2, Math.min(TOP, Math.round(h)));
  }

  // Overfladen et sted: højde, årstid, øverste blok og blokken under den
  function overflade(x, z) {
    const h = højde(x, z), å = årstid(x, z), rx = x - MIDT, rz = z - MIDT, d = Math.hypot(rx, rz);
    const plads = d <= 5.5, sti = !plads && d < 170 && (Math.abs(rx) <= 1 || Math.abs(rz) <= 1);
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
    return { h, å, top, under, vand, plads, sti };
  }

  // Blomster, græs, græskar og svampe oven på jorden
  function plante(x, z, o) {
    if (o.vand || o.plads || o.sti || o.top === ID.Sand || o.top === ID.Sten || o.h >= SNE) return 0;
    const r = H(x, z, 5), v = H(x, z, 6);
    switch (o.å) {
      case "forår": return r < 0.07 ? BLOMSTER[Math.floor(v * 4)] : r < 0.15 ? ID["Højt græs"] : 0;
      case "sommer":
        if (S(x, z, 28, 900) > 0.66) return r < 0.4 ? ID.Solsikke : r < 0.5 ? ID["Gul blomst"] : 0;   // solsikkemarker
        return r < 0.035 ? BLOMSTER[3 + Math.floor(v * 2)] : r < 0.12 ? ID["Højt græs"] : 0;
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
    if (o.vand || o.plads || o.sti || (o.top === ID.Sand && !strand) || o.top === ID.Sten || o.h >= TRÆGRÆNSE || o.h + 10 >= BY) return null;
    const skov = glat(0.5, 0.72, S(x, z, 45, 800));
    if (o.å === "hjem" && Math.hypot(x - MIDT, z - MIDT) < 14) return null;         // pladsen derhjemme skal være åben
    const tæthed = strand ? 0.06 : o.å === "hjem" ? 0.003 : { forår: 0.012, sommer: 0.007, efterår: 0.016, vinter: 0.012 }[o.å] * (1 + skov * 5);
    return r < tæthed ? { x, z, h: o.h, å: o.å, v: H(x, z, 11), palme: strand } : null;
  }

  // Tegn et træ. put(x, y, z, id, stamme) sætter kun blokke inde i den søjle, der er ved at blive lavet
  function tegnTræ({ x, z, h, å, v, palme }, put) {
    if (palme) {                                   // palme: en høj stamme og store blade, der hænger ned
      const top = h + 6 + (Math.floor(v * 100) % 2);
      for (let y = h + 1; y < top; y++) put(x, y, z, ID.Palmestamme, true);
      put(x, top, z, ID.Palmeblade);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        put(x + dx, top, z + dz, ID.Palmeblade); put(x + dx * 2, top, z + dz * 2, ID.Palmeblade); put(x + dx * 3, top - 1, z + dz * 3, ID.Palmeblade);
      }
      return;
    }
    let stamme = ID.Træstamme, blade = ID.Blade, form = v < 0.25 ? "stor" : "eg";
    if (å === "vinter") { form = "gran"; blade = ID.Snegran; }
    else if (å === "forår") { if (v < 0.6) { form = "kirsebær"; blade = ID.Kirsebærblade; } else { form = "birk"; stamme = ID.Birkestamme; } }
    else if (å === "efterår") { blade = LØV[Math.floor(v * 3)]; if (v > 0.66) { form = "birk"; stamme = ID.Birkestamme; } }
    const y0 = h + 1, top = y0 + { eg: 4, stor: 6, birk: 5, kirsebær: 4, gran: 7 }[form] + (Math.floor(v * 100) % 2);
    for (let y = y0; y < top; y++) put(x, y, z, stamme, true);
    const skive = (y, r) => {                      // et rundt lag blade
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (dx * dx + dz * dz <= r * r + 0.6) put(x + dx, y, z + dz, blade);
    };
    if (form === "gran") {                         // en spids kegle
      for (let y = y0 + 2; y <= top; y++) skive(y, Math.max(0, Math.round((top - y) * 0.45)));
      put(x, top + 1, z, blade);
    } else if (form === "kirsebær") { skive(top - 1, 3); skive(top, 3); skive(top + 1, 2); }
    else if (form === "birk") { skive(top - 2, 1); skive(top - 1, 2); skive(top, 2); skive(top + 1, 1); }
    else { const r = form === "stor" ? 3 : 2; skive(top - 2, r - 1); skive(top - 1, r); skive(top, r); skive(top + 1, r - 1); }
  }

  // Lav en søjle på 16 × 16 blokke (cx, cz tæller i søjler). Svarer med blokkene som (x + z·16 + y·256)
  function søjle(cx, cz) {
    const data = new Uint8Array(256 * BY), x0 = cx * 16, z0 = cz * 16;
    const put = (x, y, z, id, stamme) => {
      if (x < x0 || x >= x0 + 16 || z < z0 || z >= z0 + 16 || y < 1 || y >= BY) return;
      const i = (x - x0) + (z - z0) * 16 + y * 256;
      if (!data[i] || stamme) data[i] = id;                                 // stammen går igennem blade og blomster
    };
    for (let z = z0; z < z0 + 16; z++) for (let x = x0; x < x0 + 16; x++) {
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
    // fire lygtepæle ved pladsen derhjemme
    for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
      const x = MIDT + dx, z = MIDT + dz, y = højde(x, z);
      put(x, y + 1, z, ID.Hegn, true); put(x, y + 2, z, ID.Hegn, true); put(x, y + 3, z, ID.Lampe, true);
    }
    // træer fra søjlen selv og lidt uden for (kronerne rækker ind over kanten)
    for (let z = z0 - 3; z < z0 + 19; z++) for (let x = x0 - 3; x < x0 + 19; x++) {
      const t = træ(x, z);
      if (t) tegnTræ(t, put);
    }
    return data;
  }

  return { søjle, årstid, højde };
}
