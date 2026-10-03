import { BILER, MISSIONER, OPGRADERINGER, gulv } from "./verden-data.js";
const NØGLE = "skrotstorm-v1";
const heltal = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

export function nyFremgang() {
  return {
    version: 1,
    mission: 0,
    skrot: 0,
    motor: 0,
    hjul: 0,
    nitro: 0,
    bil: "rotten",
    dele: [],
    port: 0,
    løbTid: 0,
    løbStart: false,
    sejre: 0,
  };
}

// Kun kendte, gyldige felter hentes fra en gemt verden.
export function valider(data) {
  const ny = nyFremgang();
  if (!data || data.version !== 1 || !heltal(data.mission, 0, MISSIONER.length) || !heltal(data.skrot, 0, 100000)) return ny;
  for (const felt of ["motor", "hjul", "nitro"]) if (!heltal(data[felt], 0, 3)) return ny;
  if (!BILER.some((b) => b.id === data.bil)) return ny;
  Object.assign(ny, {
    mission: data.mission,
    skrot: data.skrot,
    motor: data.motor,
    hjul: data.hjul,
    nitro: data.nitro,
    bil: data.bil,
  });
  ny.dele = Array.isArray(data.dele) ? [...new Set(data.dele.filter((i) => heltal(i, 0, 2)))] : [];
  ny.port = heltal(data.port, 0, 5) ? data.port : 0;
  ny.sejre = heltal(data.sejre, 0, 10000) ? data.sejre : 0;
  // Gamle v1-spil har ingen position. Ugyldig position ændrer aldrig optjent fremgang.
  const p = data.position;
  if (p && [p.x, p.y, p.z, p.vinkel].every(Number.isFinite) && Math.abs(p.x) < 440 && Math.abs(p.z) < 410 && p.y > 0 && p.y < 180) {
    const støtte = gulv(p.x, p.z, p.y).y + .8;
    if (Math.abs(støtte - p.y) < 1.5) ny.position = { x: p.x, y: støtte, z: p.z, vinkel: p.vinkel % (Math.PI * 2) };
  }
  // Et tidsløb starter på ny efter en pause i browseren.
  if (MISSIONER[ny.mission]?.type === "løb") ny.port = 0;
  return ny;
}

export function hent() {
  try {
    return valider(JSON.parse(localStorage.getItem(NØGLE)));
  } catch {
    return nyFremgang();
  }
}
export function gem(data) {
  try {
    const tekst = JSON.stringify(data);
    if (localStorage.getItem(NØGLE) !== tekst) localStorage.setItem(NØGLE, tekst);
    return true;
  } catch { return false; /* Spillet virker også uden lager. */ }
}
export function opgrader(data, id) {
  const valgte = OPGRADERINGER.find((o) => o.id === id);
  if (!valgte || data[id] >= 3) return false;
  const pris = valgte.priser[data[id]];
  if (data.skrot < pris) return false;
  data.skrot -= pris;
  data[id]++;
  return true;
}
export function afslutMission(data) {
  const mission = MISSIONER[data.mission];
  if (!mission) return null;
  data.skrot += mission.belønning;
  data.mission++;
  data.port = 0;
  data.løbTid = 0;
  data.løbStart = false;
  if (data.mission === MISSIONER.length) data.sejre++;
  return mission;
}
