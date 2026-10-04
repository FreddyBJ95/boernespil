// ===== Profilen: erfaring (XP), niveauer, rang, udfordringer og skins =====
// Man får XP for drab, hovedskud, vundne runder og kampe. Hvert niveau kræver lidt mere end det forrige,
// og hvert tredje niveau giver en ny rang (fra Rekrut til Global Elite).
// Udfordringerne låser skins op (skins.js) — mønstre, man kan sætte på sine våben.
// Alt gemmes i browseren (localStorage), ligesom statistikken.

const NØGLE = "sigtekorn-profil";
export const RANG = ["Rekrut", "Menig", "Konstabel", "Overkonstabel", "Korporal", "Sergent", "Oversergent", "Fændrik",
  "Løjtnant", "Premierløjtnant", "Kaptajn", "Major", "Oberstløjtnant", "Oberst", "General", "Global Elite"];
const krav = n => 600 + 150 * n;                                   // XP fra niveau n til n + 1
export const rang = niveau => RANG[Math.min(RANG.length - 1, Math.floor((niveau - 1) / 3))];

// Udfordringerne: mål = hvor mange gange — og det skin, man får
export const UDFORDRINGER = [
  { id: "hoveder", navn: "Skarpskytte", tekst: "Lav 25 hovedskud", mål: 25, skin: "tiger" },
  { id: "kniv", navn: "Stille og roligt", tekst: "Dræb 5 med en kniv", mål: 5, skin: "rubin" },
  { id: "bombe", navn: "Bombemester", tekst: "Vind 5 bomberunder", mål: 5, skin: "ørken" },
  { id: "desarmer", navn: "Kolde hænder", tekst: "Læg eller desarmér 3 bomber selv", mål: 3, skin: "kobber" },
  { id: "træning", navn: "Lynhurtig", tekst: "Gennemfør træningen på under 30 sekunder", mål: 1, skin: "is" },
  { id: "ræs", navn: "Hele rækken", tekst: "Vind et våbenræs", mål: 1, skin: "guld" },
  { id: "snig", navn: "Langt væk", tekst: "Dræb 15 med snigskytte, spejder- eller jagtgevær", mål: 15, skin: "nat" },
  { id: "stime", navn: "Ustoppelig", tekst: "Få 5 drab i træk — 3 gange", mål: 3, skin: "lyn" },
  { id: "zombier", navn: "Overlever", tekst: "Overlev 10 bølger zombier", mål: 1, skin: "gift" },
  { id: "sejre", navn: "Vinder", tekst: "Vind 10 kampe", mål: 10, skin: "lava" },
  { id: "niveau", navn: "Veteran", tekst: "Nå niveau 15", mål: 15, skin: "galakse" },
];

export class Profil {
  constructor() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(NØGLE) || "{}"); } catch (_) { /* ingen profil endnu */ }
    this.xp = d.xp || 0; this.tal = d.tal || {}; this.skin = d.skin || "standard";
    this.kampXp = 0;                                               // XP i den kamp, man er i gang med
  }
  gem() { try { localStorage.setItem(NØGLE, JSON.stringify({ xp: this.xp, tal: this.tal, skin: this.skin })); } catch (_) {} }
  get niveau() { let n = 1, rest = this.xp; while (rest >= krav(n)) { rest -= krav(n); n++; } return { niveau: n, rest, krav: krav(n), rang: rang(n) }; }
  // Giv XP. Svarer med { op: det nye niveau, hvis man steg (ellers null), klaret: udfordringer, der lige blev klaret }
  giv(mængde) {
    const før = this.niveau.niveau;
    this.xp += mængde; this.kampXp += mængde;
    const nu = this.niveau, klaret = nu.niveau !== før ? this.sæt("niveau", nu.niveau) : [];
    this.gem();
    return { op: nu.niveau !== før ? nu : null, klaret };
  }
  // Tæl en udfordring op. Svarer med de udfordringer, der lige er blevet klaret
  tæl(id, n = 1) { return this.sæt(id, (this.tal[id] || 0) + n); }
  sæt(id, værdi) {
    const u = UDFORDRINGER.find(u => u.id === id); if (!u) return [];
    const før = this.tal[id] || 0;
    this.tal[id] = Math.max(før, værdi); this.gem();
    return før < u.mål && this.tal[id] >= u.mål ? [u] : [];
  }
  klaret(u) { return (this.tal[u.id] || 0) >= u.mål; }
  // De skins, man har låst op (standard har man altid)
  get skins() { return ["standard", ...UDFORDRINGER.filter(u => this.klaret(u)).map(u => u.skin)]; }
}
