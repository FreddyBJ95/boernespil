import { BLOKKE } from "../spil/broekraft/blokke.js";
import { send } from "./protokol.js";

const VÅBEN = ["gevær", "bazooka", "maling", "kanon", "atom"];
const STØRRELSER = ["mini", "atom", "kæmpe"];
const FELTER = {
  skud: ["type", "x", "y", "z", "vx", "vy", "vz"],
  missil: ["x", "z", "bund", "top", "mx", "mz", "forsinkelse"],
  svampesky: ["x", "y", "z", "str"],
  lunte: ["x", "y", "z", "id", "lunte"],
  droner: ["x", "y", "z"],
};

// Flyvende effekter må være over loftet, ligesom spillere og de eksisterende brag.
function sted(meta, x, y, z) {
  return [x, y, z].every(Number.isFinite) && x >= 0 && x < meta.bredde
    && z >= 0 && z < meta.dybde && y >= 0 && y <= meta.højde + 64;
}

function nær(s, x, y, z, radius) {
  return [s.x, s.y, s.z].every(Number.isFinite) && Math.hypot(x - s.x, y - s.y, z - s.z) <= radius;
}

// Byg et nyt objekt: klienten kan hverken udgive sig for en anden eller sende egne felter videre.
export function rensEffekt(rum, s, b) {
  if (!b || b.t !== "effekt" || typeof b.slags !== "string" || !Object.hasOwn(FELTER, b.slags)) return null;
  const felter = FELTER[b.slags], { meta } = rum;
  const tal = felter.filter(k => k !== "type" && k !== "str");
  if (!tal.every(k => Number.isFinite(b[k]))) return null;
  try { if (new TextEncoder().encode(JSON.stringify(b)).length > 1024) return null; }
  catch { return null; }

  if (b.slags === "missil") {
    if (![b.x, b.z, b.bund, b.top].every(Number.isInteger) || b.bund < 0 || b.bund > b.top
      || b.top >= meta.højde || b.top - b.bund > 24 || !sted(meta, b.x, b.bund, b.z)
      || !sted(meta, b.mx, 0, b.mz) || !nær(s, b.x, b.bund, b.z, 96)
      || b.forsinkelse < 0 || b.forsinkelse > 5) return null;
  } else {
    if (!sted(meta, b.x, b.y, b.z)) return null;
    if (b.slags === "skud" && (!VÅBEN.includes(b.type) || !nær(s, b.x, b.y, b.z, 8)
      || Math.hypot(b.vx, b.vy, b.vz) > 1.5)) return null;
    if (b.slags === "svampesky" && (!STØRRELSER.includes(b.str) || !nær(s, b.x, b.y, b.z, 128))) return null;
    if (b.slags === "droner" && !nær(s, b.x, b.y, b.z, 12)) return null;
    if (b.slags === "lunte" && (![b.x, b.y, b.z, b.id].every(Number.isInteger) || b.y >= meta.højde
      || !nær(s, b.x, b.y, b.z, 12) || !(BLOKKE[b.id]?.tnt || BLOKKE[b.id]?.atom)
      || b.lunte < 0.2 || b.lunte > 6)) return null;
  }

  const ud = { t: "effekt", slags: b.slags, fra: s.id };
  for (const k of felter) ud[k] = b[k];
  return ud;
}

// Kun godkendte effekter bruger den rullende kvote; rummets og spillerens kvoter tages sammen.
export function sendEffekt(rum, s, b, nu = performance.now()) {
  if (rum.stoppet || rum.spillere.get(s.id) !== s || s.version !== "0.2.0") return false;
  const besked = rensEffekt(rum, s, b);
  if (!besked) return false;
  s.effektTider = (s.effektTider || []).filter(t => nu - t < 1000);
  rum.effektTider = (rum.effektTider || []).filter(t => nu - t < 1000);
  if (s.effektTider.length >= 8 || rum.effektTider.length >= 40) return false;
  s.effektTider.push(nu); rum.effektTider.push(nu);
  for (const p of rum.spillere.values()) if (p !== s && p.version === "0.2.0") send(p, besked);
  return true;
}
