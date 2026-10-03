import { DELE, GARAGE, MISSIONER } from "./verden-data.js";
import { afslutMission } from "./fremgang.js";

// Næste mål er altid entydigt, både på kortet og i opgavens regler.
export function næsteMål(fremgang) {
  const m = MISSIONER[fremgang.mission];
  if (!m) return GARAGE;
  if (m.type === "dele") return DELE.find((_, i) => !fremgang.dele.includes(i)) || m.mål;
  if (m.porte) {
    const p = m.porte[Math.min(fremgang.port, m.porte.length - 1)];
    return { x: p[0], y: p[1], z: p[2] };
  }
  return m.mål;
}

// Rene spilleregler kan afprøves uden browser og uden at tegne verdenen.
export function opdaterOpgave(fremgang, bil, løbende, dt) {
  const m = MISSIONER[fremgang.mission], hændelser = [];
  if (!m) return hændelser;
  const mål = næsteMål(fremgang);
  const nær = Math.hypot(bil.x - mål.x, bil.z - mål.z) < 14 && Math.abs(bil.y - (mål.y || 0) - .8) < 6;
  let færdig = false;
  if (m.type === "dele") {
    DELE.forEach((d, i) => {
      if (!fremgang.dele.includes(i) && Math.hypot(bil.x - d.x, bil.z - d.z) < 8 && Math.abs(bil.y - .8) < 6) {
        fremgang.dele.push(i);
        hændelser.push({ type: "del", tekst: `${d.navn} fundet · ${fremgang.dele.length}/3` });
      }
    });
    færdig = fremgang.dele.length === 3;
  } else if (m.type === "løb" || m.type === "porte") {
    if (m.type === "løb" && fremgang.løbStart) {
      fremgang.løbTid += dt;
      if (fremgang.løbTid > 100) {
        fremgang.port = 0;
        fremgang.løbStart = false;
        fremgang.løbTid = 0;
        hændelser.push({ type: "tid", tekst: "Tiden løb ud. Kør tilbage til første blå port og prøv igen." });
        return hændelser;
      }
    }
    if (nær) {
      fremgang.port++;
      fremgang.løbStart = true;
      færdig = fremgang.port >= m.porte.length;
      if (!færdig) hændelser.push({ type: "port", tekst: `Signal ${fremgang.port}/${m.porte.length} · følg næste blå port` });
    }
  } else if (m.type === "hop") {
    const vedRampe = Math.hypot(bil.x - m.mål.x, bil.z - m.mål.z) < 40;
    if (!bil.påJord && vedRampe) {
      løbende.rampeForsøg = true;
      // Et rigtigt tilløb går mod øst og letter over rampens høje ende.
      if (bil.fart > 15 && bil.y > 4 && bil.x > 82 && Math.sin(bil.vinkel) > .65) løbende.hopKlar = true;
    }
    if (løbende.rampeForsøg && bil.påJord) {
      færdig = løbende.hopKlar && bil.senesteHop >= .55;
      if (!færdig) hændelser.push({ type: 'hop', tekst: 'Prøv igen: tag tilløb fra vest, brug nitro og kør lige mod øst med mindst 55 km/t.' });
      løbende.rampeForsøg = false;
      løbende.hopKlar = false;
      løbende.rampeTilgang = false;
      bil.senesteHop = 0;
    }
  } else færdig = nær && bil.påJord;
  if (færdig) {
    const klaret = afslutMission(fremgang);
    løbende.hopKlar = false;
    bil.senesteHop = 0;
    hændelser.push({
      type: "færdig",
      tekst: `Opgave klaret · +${klaret.belønning} skrot!`,
      slut: fremgang.mission === MISSIONER.length,
    });
  }
  return hændelser;
}
