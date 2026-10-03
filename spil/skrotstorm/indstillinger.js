const NØGLE = 'skrotstorm-indstillinger-v1';
export const STANDARD = Object.freeze({ kamera: 'følg', grafik: 'auto', styring: 'pile', følsomhed: 1, lydstyrke: .65, gps: true, vistStart: false });

// Indstillinger ligger for sig selv, så gamle biler, skrot og opgaver aldrig nulstilles.
export function validerValg(data) {
  const valg = { ...STANDARD };
  if (!data || typeof data !== 'object') return valg;
  if (['følg', 'udsigt', 'motorhjelm'].includes(data.kamera)) valg.kamera = data.kamera;
  if (['auto', 'let', 'flot'].includes(data.grafik)) valg.grafik = data.grafik;
  if (['pile', 'rat'].includes(data.styring)) valg.styring = data.styring;
  if (Number.isFinite(data.følsomhed) && data.følsomhed >= .5 && data.følsomhed <= 1.5) valg.følsomhed = data.følsomhed;
  if (Number.isFinite(data.lydstyrke) && data.lydstyrke >= 0 && data.lydstyrke <= 1) valg.lydstyrke = data.lydstyrke;
  if (typeof data.gps === 'boolean') valg.gps = data.gps;
  valg.vistStart = data.vistStart === true;
  return valg;
}
export function hentValg() {
  try { return validerValg(JSON.parse(localStorage.getItem(NØGLE))); } catch { return { ...STANDARD }; }
}
export function gemValg(valg) {
  try {
    const tekst = JSON.stringify(validerValg(valg));
    if (localStorage.getItem(NØGLE) !== tekst) localStorage.setItem(NØGLE, tekst);
    return true;
  } catch { return false; /* Alle valg virker også i den åbne fane uden lager. */ }
}
