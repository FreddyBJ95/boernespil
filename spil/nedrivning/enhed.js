// ===== Hvilken slags enhed spiller vi på? =====
// Tablets og telefoner har langt mindre hukommelse og et svagere skærmkort end en PC. Her får de
// en lettere udgave: mindre billeder, lyd i mono, lavere opløsning og færre stumper ad gangen.
// ?mobil i adressen giver den lette udgave på en PC (til afprøvning), ?pc giver den fulde.

const adresse = new URLSearchParams(location.search);
const grov = matchMedia("(pointer:coarse)").matches;
const lidtHukommelse = (navigator.deviceMemory ?? 8) <= 4;

export const mobil = adresse.has("mobil") || (!adresse.has("pc") && (grov || lidtHukommelse));
