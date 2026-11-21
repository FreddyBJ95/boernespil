import { send } from "./protokol.js";

// Fælles ting (server 0.6.0): dyr fra æg og biler, som én tablet ejer og styrer, og som de andre i samme verden ser.
// Ejeren sender hele sin liste et par gange i sekundet. Serveren renser den, husker den til nye spillere og sender den videre.
export const MAKS_TING = 16;                       // pr. spiller
const SLAGS = ["dyr", "bil"];
const NAVN = /^[a-z]{2,24}$/;                      // dyrets eller bilens id, fx "zombie" eller "brandbil"
const NØGLE = /^[a-z0-9:-]{1,64}$/;                // en bils fælles nøgle, fx "v2" (byens egne biler) eller "<spiller>:<nr>"
const AFSTAND = 256;                               // ting må højst være så langt fra ejeren

function sted(meta, x, y, z) {
  return [x, y, z].every(Number.isFinite) && x >= 0 && x < meta.bredde && z >= 0 && z < meta.dybde && y >= -8 && y <= meta.højde + 64;
}

// Byg en ny, ren liste: kun kendte felter, endelige tal inden for verdenen og tæt på ejeren. Ugyldige ting springes over.
export function rensTing(rum, s, b) {
  if (!b || b.t !== "ting" || !Array.isArray(b.liste) || b.liste.length > MAKS_TING) return null;
  const { meta } = rum, ud = [], numre = new Set();
  for (const t of b.liste) {
    if (!t || typeof t !== "object" || !Number.isInteger(t.n) || t.n < 0 || t.n > 65535 || numre.has(t.n)) continue;
    if (!SLAGS.includes(t.s) || typeof t.id !== "string" || !NAVN.test(t.id)) continue;
    if (!sted(meta, t.x, t.y, t.z) || !Number.isFinite(t.yaw) || Math.abs(t.yaw) > 1e6) continue;
    if ([s.x, s.y, s.z].every(Number.isFinite) && Math.hypot(t.x - s.x, t.z - s.z) > AFSTAND) continue;
    if (t.k !== undefined && (t.s !== "bil" || typeof t.k !== "string" || !NØGLE.test(t.k))) continue;
    if (t.lys !== undefined && typeof t.lys !== "boolean") continue;
    numre.add(t.n);
    const ren = { n: t.n, s: t.s, id: t.id, x: t.x, y: t.y, z: t.z, yaw: t.yaw };
    if (t.k !== undefined) ren.k = t.k;
    if (t.lys) ren.lys = true;
    ud.push(ren);
  }
  return ud;
}

// Højst seks lister pr. sekund pr. spiller. Afsenderen får ikke sin egen liste tilbage; 0.1.0-klienter får intet.
export function sendTing(rum, s, b, nu = performance.now()) {
  if (rum.stoppet || rum.spillere.get(s.id) !== s || s.version !== "0.2.0") return false;
  const liste = rensTing(rum, s, b);
  if (!liste) return false;
  s.tingTider = (s.tingTider || []).filter(t => nu - t < 1000);
  if (s.tingTider.length >= 6) return false;
  s.tingTider.push(nu);
  s.ting = liste;
  const besked = { t: "ting", fra: s.id, liste };
  for (const p of rum.spillere.values()) if (p !== s && p.version === "0.2.0") send(p, besked);
  return true;
}

// En ny spiller i verdenen får de andres ting med det samme (efter velkommen)
export function sendAlleTing(rum, s) {
  if (s.version !== "0.2.0") return;
  for (const p of rum.spillere.values()) if (p !== s && p.ting?.length) send(s, { t: "ting", fra: p.id, liste: p.ting });
}

// Tryk på en andens dyr (fx en zombie, der bliver til konfetti): beskeden går kun til ejeren, som selv fjerner dyret
export function sendPuf(rum, s, b, nu = performance.now()) {
  if (rum.stoppet || rum.spillere.get(s.id) !== s || s.version !== "0.2.0") return false;
  if (!b || typeof b.til !== "string" || !Number.isInteger(b.n)) return false;
  const ejer = rum.spillere.get(b.til);
  if (!ejer || ejer === s || ejer.version !== "0.2.0" || !ejer.ting?.some(t => t.n === b.n && t.s === "dyr")) return false;
  s.pufTider = (s.pufTider || []).filter(t => nu - t < 1000);
  if (s.pufTider.length >= 4) return false;
  s.pufTider.push(nu);
  send(ejer, { t: "puf", fra: s.id, n: b.n });
  return true;
}
