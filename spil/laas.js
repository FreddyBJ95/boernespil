// ===== Låsen: voksenspillene kræver en firecifret kode =====
// Bruges både på forsiden (🔒 Voksenspil) og i selve voksenspillene, med den samme kode.
// Første gang vælger den voksne en kode. Den gemmes (som et hash) her på enheden, og så skal den
// skrives, hver gang browseren har været lukket. Låsen holder børnene ude — men den er ikke rigtig sikkerhed:
// spillene ligger på nettet, og en voksen med browserens udviklerværktøjer kan komme forbi.

const NØGLE = "voksen-pin", SESSION = "voksen-ok";

async function hash(pin, salt) {
  const tekst = `${salt}:${pin}`;
  if (crypto?.subtle) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tekst));
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 2166136261;                                             // uden https: et enkelt hash
  for (const c of tekst) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16);
}
const læs = () => { try { return JSON.parse(localStorage.getItem(NØGLE) || "null"); } catch (_) { return null; } };

// Er koden allerede skrevet, siden browseren blev åbnet?
export function erLåstOp() { try { return sessionStorage.getItem(SESSION) === "1"; } catch (_) { return false; } }

// Vis låsen i elementet `rod`. Svarer, når koden er rigtig (eller lige er valgt).
// hjem: hvor "Tilbage"-linket går hen — eller en funktion, der lukker låsen (som på forsiden)
export function lås(rod, hjem = "../../") {
  return new Promise(klar => {
    try { if (sessionStorage.getItem(SESSION) === "1") { rod.classList.add("skjult"); klar(); return; } } catch (_) {}
    const gemt = læs();
    let tilstand = gemt ? "tjek" : "ny", første = "", kode = "", forkert = 0, ventTil = 0;
    rod.innerHTML = `<div class="lås-kort"><div class="lås-ikon">🔒</div><h1>Voksenrummet</h1><p class="lås-tekst"></p>
      <div class="lås-prikker"><i></i><i></i><i></i><i></i></div>
      <div class="lås-taster">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"].map(k => `<button data-k="${k}">${k}</button>`).join("")}</div>
      ${typeof hjem === "function" ? `<button class="lås-hjem">← Tilbage til spillene</button>` : `<a class="lås-hjem" href="${hjem}">← Tilbage til spillene</a>`}</div>`;
    rod.classList.remove("skjult");
    if (typeof hjem === "function") rod.querySelector(".lås-hjem").addEventListener("click", () => { window.removeEventListener("keydown", tast); hjem(); });
    const tekst = rod.querySelector(".lås-tekst"), prikker = [...rod.querySelectorAll(".lås-prikker i")];
    const vis = () => {
      tekst.textContent = tilstand === "ny" ? "Vælg en kode på fire tal til voksenspillene." : tilstand === "igen" ? "Skriv koden én gang til." :
        Date.now() < ventTil ? `For mange forsøg. Vent ${Math.ceil((ventTil - Date.now()) / 1000)} sekunder.` : "Skriv koden for at spille.";
      prikker.forEach((p, i) => p.classList.toggle("fyldt", i < kode.length));
    };
    const ryst = () => { rod.querySelector(".lås-kort").classList.remove("ryst"); void rod.offsetWidth; rod.querySelector(".lås-kort").classList.add("ryst"); };
    const færdig = () => { try { sessionStorage.setItem(SESSION, "1"); } catch (_) {} rod.classList.add("skjult"); window.removeEventListener("keydown", tast); klar(); };
    const ok = async () => {
      if (kode.length < 4) return;
      if (tilstand === "ny") { første = kode; kode = ""; tilstand = "igen"; vis(); return; }
      if (tilstand === "igen") {
        if (kode !== første) { kode = ""; første = ""; tilstand = "ny"; ryst(); vis(); return; }
        const salt = Math.random().toString(36).slice(2);
        localStorage.setItem(NØGLE, JSON.stringify({ salt, hash: await hash(kode, salt) }));
        færdig(); return;
      }
      if (Date.now() < ventTil) { kode = ""; vis(); return; }
      if (await hash(kode, gemt.salt) === gemt.hash) { færdig(); return; }
      kode = ""; ryst();
      if (++forkert >= 3) { forkert = 0; ventTil = Date.now() + 30000; const t = setInterval(() => { vis(); if (Date.now() >= ventTil) clearInterval(t); }, 1000); }
      vis();
    };
    const tryk = k => {
      if (k === "⌫") kode = kode.slice(0, -1);
      else if (k === "✓") { ok(); return; }
      else if (kode.length < 4) { kode += k; if (kode.length === 4) setTimeout(ok, 120); }
      vis();
    };
    rod.querySelectorAll("button[data-k]").forEach(b => b.addEventListener("click", () => tryk(b.dataset.k)));
    const tast = e => { if (/^[0-9]$/.test(e.key)) tryk(e.key); else if (e.key === "Backspace") tryk("⌫"); else if (e.key === "Enter") tryk("✓"); };
    window.addEventListener("keydown", tast);
    vis();
  });
}
