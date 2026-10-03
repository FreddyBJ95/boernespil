// ===== Kataloget: alt, man kan vælge i Sigtekorn — våben, pistoler, knive, granater og baner =====
// Vil man have noget nyt med i spillet, tilføjer man det her (og evt. en model i blender/lav_arsenal.py).
// Felterne for våben:
//   navn, klasse (gevær, mp, hagl, snig, tung, special, pistol), sjælden (farven som i Fortnite), tekst
//   skade, kadence (sekunder mellem skud), auto, magasin, reserve, genlad (sekunder), fart (enheder/s)
//   stå/duk/bevæg/hop: hvor upræcist man skyder (radianer), skudUro/uroTid: uro efter hvert skud
//   mønster: [op, højre] i grader pr. skud (det faste rekylmønster) — eller lavMønster(...)
//   særlige: salve (skud pr. salve), hagl (antal hagl), spredning, zoom ([synsfelt, ...]), sigte ("kikkert"/"sigte"), prik (rødpunkt, når man sigter),
//            opspin (sekunder før minigunnen skyder), projektil ("raket"/"pil"), lydløs, panser (hvor meget går gennem vest)
//   model: GLB-filen i modeller/ (den samme bruges i hånden og hos botterne)

import { U } from "./bevaegelse.js";

// Sjældenhed: farven på kortet i udrustningen (som i Fortnite)
export const SJÆLDEN = {
  almindelig: { navn: "Almindelig", farve: "#a3abb3" }, usædvanlig: { navn: "Usædvanlig", farve: "#5fbf3a" },
  sjælden: { navn: "Sjælden", farve: "#3d8bff" }, episk: { navn: "Episk", farve: "#b05cff" }, legendarisk: { navn: "Legendarisk", farve: "#ffae2b" },
};

// Et fast rekylmønster: stiger op (mindre og mindre) og svajer til siderne — det samme hver gang, så det kan læres
export function lavMønster(n, op, flad, side, frekvens, frø = 1) {
  const m = []; let y = 0, x = 0;
  for (let i = 0; i < n; i++) {
    m.push([+y.toFixed(3), +x.toFixed(3)]);
    y += op * Math.max(0.08, 1 - i / flad);
    x = side * Math.sin(i * frekvens + frø) * Math.min(1, i / 6) + side * 0.3 * Math.sin(i * frekvens * 2.3 + frø * 3) * Math.min(1, i / 10);
  }
  return m;
}
const STORM = [[0, 0], [0.55, 0.05], [1.35, 0.1], [2.35, 0.05], [3.45, -0.1], [4.55, -0.3], [5.55, -0.55], [6.4, -0.7], [7.05, -0.6], [7.5, -0.3],
  [7.75, 0.2], [7.9, 0.8], [8.0, 1.4], [8.05, 1.9], [8.1, 2.3], [8.1, 2.5], [8.15, 2.4], [8.2, 2.1], [8.25, 1.6], [8.3, 1.0],
  [8.35, 0.4], [8.3, -0.2], [8.3, -0.8], [8.35, -1.3], [8.4, -1.6], [8.45, -1.7], [8.5, -1.5], [8.5, -1.0], [8.55, -0.4], [8.6, 0.2]];
const PISTOL = [[0, 0], [0.9, 0.1], [1.7, -0.15], [2.4, 0.2], [3.0, -0.1], [3.4, 0.25], [3.7, -0.2], [3.9, 0.15], [4.0, 0], [4.1, 0.2], [4.2, -0.1], [4.3, 0.1]];

// ---------- Hovedvåben (15) ----------
export const PRIMÆR = {
  storm: { navn: "Stormgevær", klasse: "gevær", sjælden: "sjælden", tekst: "Hård og pålidelig. Lær rekylmønsteret, så rammer du alt.",
    auto: true, kadence: 0.1, skade: 36, panser: 0.775, rækkevidde: 0.98, magasin: 30, reserve: 90, genlad: 2.4, fart: 215,
    stå: 0.0048, duk: 0.0033, bevæg: 0.173, hop: 0.47, skudUro: 0.0078, uroTid: 0.35, spredning: 0.0006, mønster: STORM, træk: 0.75, model: "gevaer" },
  taktisk: { navn: "Taktisk gevær", klasse: "gevær", sjælden: "sjælden", tekst: "Lydpotte og lav rekyl. Lidt mindre skade end stormgeværet.",
    auto: true, kadence: 0.09, skade: 33, panser: 0.7, rækkevidde: 0.97, magasin: 25, reserve: 75, genlad: 3.0, fart: 225, lydløs: true,
    stå: 0.0042, duk: 0.003, bevæg: 0.16, hop: 0.45, skudUro: 0.0065, uroTid: 0.33, spredning: 0.0005, mønster: lavMønster(25, 0.62, 12, 1.3, 0.55, 2), træk: 0.7, model: "taktisk" },
  salve: { navn: "Salvegevær", klasse: "gevær", sjælden: "usædvanlig", tekst: "Skyder tre skud ad gangen. Præcist, når man står stille.",
    auto: false, salve: 3, salveTid: 0.065, kadence: 0.36, skade: 31, panser: 0.7, rækkevidde: 0.96, magasin: 27, reserve: 81, genlad: 2.6, fart: 220,
    stå: 0.0036, duk: 0.0026, bevæg: 0.15, hop: 0.45, skudUro: 0.005, uroTid: 0.3, spredning: 0.0005, mønster: lavMønster(27, 0.5, 9, 0.6, 0.9, 3), træk: 0.7, model: "salve" },
  kamp: { navn: "Kampgevær", klasse: "gevær", sjælden: "episk", tekst: "Halvautomatisk med sigte. Stor skade — skyd roligt, ét skud ad gangen.",
    auto: false, kadence: 0.24, skade: 52, panser: 0.82, rækkevidde: 0.98, magasin: 20, reserve: 60, genlad: 2.8, fart: 210, zoom: [55], sigte: "sigte", prik: true,
    stå: 0.003, duk: 0.0022, bevæg: 0.2, hop: 0.5, skudUro: 0.012, uroTid: 0.32, spredning: 0.0003, mønster: lavMønster(20, 1.1, 8, 0.5, 0.7, 4), træk: 0.8, model: "kamp" },
  mp: { navn: "Maskinpistol", klasse: "mp", sjælden: "almindelig", tekst: "Hurtig og let. Bedst tæt på — og man kan løbe og skyde.",
    auto: true, kadence: 0.075, skade: 26, panser: 0.6, rækkevidde: 0.85, magasin: 30, reserve: 120, genlad: 2.2, fart: 240,
    stå: 0.0075, duk: 0.0055, bevæg: 0.05, hop: 0.3, skudUro: 0.0065, uroTid: 0.3, spredning: 0.0015, mønster: lavMønster(30, 0.38, 10, 0.9, 0.7, 5), træk: 0.5, model: "mp" },
  sprøjte: { navn: "Kuglesprøjten", klasse: "mp", sjælden: "usædvanlig", tekst: "Halvtreds skud i magasinet. Hold aftrækkeren nede.",
    auto: true, kadence: 0.068, skade: 24, panser: 0.65, rækkevidde: 0.86, magasin: 50, reserve: 100, genlad: 3.3, fart: 235,
    stå: 0.0085, duk: 0.006, bevæg: 0.055, hop: 0.3, skudUro: 0.006, uroTid: 0.3, spredning: 0.0018, mønster: lavMønster(50, 0.32, 14, 1.1, 0.45, 6), træk: 0.55, model: "sproejte" },
  pump: { navn: "Pumpgun", klasse: "hagl", sjælden: "episk", tekst: "Ni hagl i hvert skud. Næsten altid et drab tæt på.",
    auto: false, hagl: 9, haglSpred: 0.072, kadence: 0.85, skade: 22, panser: 0.75, rækkevidde: 0.55, magasin: 5, reserve: 25, genlad: 3.6, fart: 220,
    stå: 0.002, duk: 0.002, bevæg: 0.02, hop: 0.06, skudUro: 0.02, uroTid: 0.4, træk: 0.8, model: "pump" },
  hagl: { navn: "Automatisk haglgevær", klasse: "hagl", sjælden: "sjælden", tekst: "Hurtige hagl-skud — godt til at storme ind på en plads.",
    auto: false, hagl: 6, haglSpred: 0.085, kadence: 0.27, skade: 17, panser: 0.7, rækkevidde: 0.5, magasin: 8, reserve: 32, genlad: 3.2, fart: 215,
    stå: 0.003, duk: 0.003, bevæg: 0.025, hop: 0.07, skudUro: 0.015, uroTid: 0.35, træk: 0.8, model: "hagl" },
  snig: { navn: "Snigskytte", klasse: "snig", sjælden: "legendarisk", tekst: "Et skud i brystet er et drab. Brug kikkerten, og stå stille.",
    auto: false, kadence: 1.46, skade: 115, panser: 0.97, rækkevidde: 0.99, magasin: 5, reserve: 30, genlad: 3.6, fart: 200, kikkertFart: 100,
    stå: 0.0011, duk: 0.0009, udenKikkert: 0.11, bevæg: 0.25, hop: 0.5, skudUro: 0.1, uroTid: 0.4, spredning: 0.0002, zoom: [40, 15], sigte: "kikkert", træk: 1.1, model: "snig" },
  jagt: { navn: "Jagtgevær", klasse: "snig", sjælden: "usædvanlig", tekst: "Et gammelt jagtgevær med sigte. Stærkt, men langsomt.",
    auto: false, kadence: 1.05, skade: 86, panser: 0.9, rækkevidde: 0.99, magasin: 4, reserve: 24, genlad: 2.6, fart: 225,
    stå: 0.0016, duk: 0.0012, bevæg: 0.18, hop: 0.4, skudUro: 0.06, uroTid: 0.4, spredning: 0.0003, zoom: [50], sigte: "sigte", træk: 0.9, model: "jagt" },
  spejder: { navn: "Spejdergevær", klasse: "snig", sjælden: "sjælden", tekst: "Let snigskytte. Du kan løbe hurtigt med den — og ramme i luften.",
    auto: false, kadence: 1.25, skade: 88, panser: 0.85, rækkevidde: 0.98, magasin: 10, reserve: 40, genlad: 3.0, fart: 230, kikkertFart: 150,
    stå: 0.0014, duk: 0.0012, udenKikkert: 0.07, bevæg: 0.14, hop: 0.03, skudUro: 0.05, uroTid: 0.35, spredning: 0.0003, zoom: [40, 15], sigte: "kikkert", træk: 0.9, model: "spejder" },
  lmg: { navn: "Let maskingevær", klasse: "tung", sjælden: "sjælden", tekst: "Hundrede skud. Tungt at løbe med, men det holder en hel gade.",
    auto: true, kadence: 0.08, skade: 32, panser: 0.75, rækkevidde: 0.97, magasin: 100, reserve: 100, genlad: 5.5, fart: 195,
    stå: 0.0065, duk: 0.0045, bevæg: 0.2, hop: 0.5, skudUro: 0.0045, uroTid: 0.4, spredning: 0.001, mønster: lavMønster(100, 0.45, 12, 1.6, 0.3, 7), træk: 1.0, model: "lmg" },
  minigun: { navn: "Minigun", klasse: "tung", sjælden: "legendarisk", tekst: "Skal lige snurre op — og så regner det med kugler.",
    auto: true, opspin: 0.55, kadence: 0.045, skade: 19, panser: 0.6, rækkevidde: 0.9, magasin: 200, reserve: 200, genlad: 6, fart: 160,
    stå: 0.012, duk: 0.01, bevæg: 0.06, hop: 0.3, skudUro: 0.003, uroTid: 0.5, spredning: 0.006, mønster: lavMønster(200, 0.12, 20, 0.8, 0.2, 8), træk: 1.2, model: "minigun" },
  raket: { navn: "Raketkaster", klasse: "tung", sjælden: "legendarisk", tekst: "Raketten springer og sender arme og ben til alle sider. Pas på dig selv!",
    auto: false, projektil: "raket", kadence: 1.0, skade: 140, radius: 4.5, panser: 0.9, magasin: 1, reserve: 6, genlad: 3.2, fart: 190,
    stå: 0.002, duk: 0.002, bevæg: 0.04, hop: 0.1, skudUro: 0.02, uroTid: 0.4, træk: 1.1, model: "raket" },
  armbrøst: { navn: "Armbrøst", klasse: "special", sjælden: "episk", tekst: "Lydløse pile, der falder lidt. Et hovedskud er altid et drab.",
    auto: false, projektil: "pil", kadence: 0.5, skade: 95, panser: 0.95, magasin: 1, reserve: 20, genlad: 1.3, fart: 225, lydløs: true, zoom: [60], sigte: "sigte", prik: true,
    stå: 0.0012, duk: 0.001, bevæg: 0.12, hop: 0.3, skudUro: 0.02, uroTid: 0.4, træk: 0.8, model: "armbroest" },
};

// ---------- Pistoler (4) ----------
export const SEKUNDÆR = {
  pistol: { navn: "Pistol", klasse: "pistol", sjælden: "almindelig", tekst: "Stabil og præcis. Mange skud.",
    auto: false, kadence: 0.15, skade: 30, panser: 0.47, rækkevidde: 0.85, magasin: 12, reserve: 48, genlad: 2.2, fart: 240,
    stå: 0.0055, duk: 0.0045, bevæg: 0.034, hop: 0.29, skudUro: 0.045, uroTid: 0.3, spredning: 0.002, mønster: PISTOL, træk: 0.5, model: "pistol" },
  lydløs: { navn: "Lydløs pistol", klasse: "pistol", sjælden: "sjælden", tekst: "Med lydpotte — botterne hører den knap. Lidt mere skade.",
    auto: false, kadence: 0.17, skade: 35, panser: 0.5, rækkevidde: 0.87, magasin: 12, reserve: 24, genlad: 2.2, fart: 240, lydløs: true,
    stå: 0.0048, duk: 0.004, bevæg: 0.034, hop: 0.29, skudUro: 0.042, uroTid: 0.3, spredning: 0.0018, mønster: PISTOL, træk: 0.55, model: "lydloes" },
  automat: { navn: "Automatpistol", klasse: "pistol", sjælden: "usædvanlig", tekst: "Fuldautomatisk. Tømmer magasinet på et øjeblik.",
    auto: true, kadence: 0.07, skade: 22, panser: 0.45, rækkevidde: 0.8, magasin: 24, reserve: 72, genlad: 2.5, fart: 240,
    stå: 0.007, duk: 0.0055, bevæg: 0.04, hop: 0.3, skudUro: 0.012, uroTid: 0.3, spredning: 0.003, mønster: lavMønster(24, 0.55, 8, 1.2, 0.8, 9), træk: 0.5, model: "automat" },
  revolver: { navn: "Revolver", klasse: "pistol", sjælden: "episk", tekst: "Kæmpe skade og stor rekyl. Et hovedskud gennem hjelmen.",
    auto: false, kadence: 0.27, skade: 63, panser: 0.93, rækkevidde: 0.81, magasin: 7, reserve: 35, genlad: 2.3, fart: 230,
    stå: 0.006, duk: 0.0048, bevæg: 0.05, hop: 0.35, skudUro: 0.09, uroTid: 0.45, spredning: 0.002, mønster: lavMønster(7, 2.2, 5, 0.5, 1.4, 10), træk: 0.6, model: "revolver" },
};

// ---------- Nærkamp (4): venstre klik = hug, højre klik = stik ----------
export const KNIVE = {
  kniv: { navn: "Kampkniv", klasse: "kniv", sjælden: "almindelig", tekst: "Den gode gamle. Stik bagfra, og det er et drab.", nærkamp: true, kadence: 0.45, skade: 40, stik: 65, rækkevidde: 1.7, fart: 250, træk: 0.4, model: "kniv" },
  karambit: { navn: "Karambit", klasse: "kniv", sjælden: "episk", tekst: "Krum og hurtig. Lidt mindre skade, men flere hug.", nærkamp: true, kadence: 0.33, skade: 34, stik: 58, rækkevidde: 1.6, fart: 255, træk: 0.35, model: "karambit" },
  machete: { navn: "Machete", klasse: "kniv", sjælden: "sjælden", tekst: "Lang klinge, der når længere — men er lidt langsom.", nærkamp: true, kadence: 0.62, skade: 55, stik: 82, rækkevidde: 2.05, fart: 245, træk: 0.5, model: "machete" },
  hakke: { navn: "Hakke", klasse: "kniv", sjælden: "legendarisk", tekst: "Som i Fortnite. Tung og langsom — og et stik er næsten altid nok.", nærkamp: true, kadence: 0.8, skade: 62, stik: 100, rækkevidde: 2.0, fart: 240, træk: 0.6, model: "hakke" },
};

// ---------- Granater (vælg to slags) ----------
export const GRANATER = {
  he: { navn: "Håndgranat", sjælden: "sjælden", tekst: "Springer efter halvandet sekund. Arme og ben flyver.", ikon: "💣", antal: 1, lunte: 1.6, skade: 110, radius: 5, model: "granat" },
  blænd: { navn: "Blændgranat", sjælden: "usædvanlig", tekst: "Et hvidt lys, der blænder alle, der kigger på den — også dig.", ikon: "⚡", antal: 2, lunte: 1.4, model: "blaend" },
  røg: { navn: "Røggranat", sjælden: "almindelig", tekst: "En tyk sky i 15 sekunder. Ingen kan se igennem den.", ikon: "☁️", antal: 1, lunte: 1.5, varighed: 15, model: "roeg" },
  impuls: { navn: "Impulsgranat", sjælden: "episk", tekst: "Som i Fortnite: skubber alle væk — kast den under dig selv, og flyv.", ikon: "🌀", antal: 2, lunte: 1.0, kraft: 15, radius: 6, model: "impuls" },
};

// ---------- Baner (flere kommer) ----------
export const BANER = {
  stoevbyen: { navn: "Støvbyen", sjælden: "sjælden", tekst: "En ørkenby med to pladser, tunneler og en lang midtergade." },
  havnen: { navn: "Havnen", sjælden: "episk", tekst: "Containere i alle farver, en stor kran, en lagerhal og et skib ved kajen." },
};

// Standard-udrustningen
export const STANDARD = { primær: "storm", sekundær: "pistol", kniv: "kniv", granater: ["he", "blænd"], bane: "stoevbyen" };

// Alle våben i ét opslag (id → egenskaber), med fart i meter i sekundet
export const ALLE = {};
for (const gruppe of [PRIMÆR, SEKUNDÆR, KNIVE]) for (const [id, d] of Object.entries(gruppe)) {
  ALLE[id] = { ...d, fart: d.fart * U, kikkertFart: d.kikkertFart ? d.kikkertFart * U : undefined };
}
// Uden arme kan man ingenting holde
ALLE.ingen = { navn: "Ingen arme", klasse: "ingen", sjælden: "almindelig", kadence: 99, magasin: 0, reserve: 0, fart: 230 * U, træk: 0.3, stå: 0, duk: 0, bevæg: 0, hop: 0 };
// Granaterne er også "våben" i hånden (plads 4): venstre klik kaster langt, højre klik kaster kort
for (const [id, g] of Object.entries(GRANATER)) ALLE[`granat_${id}`] = { navn: g.navn, klasse: "granat", granat: id, sjælden: g.sjælden, ikon: g.ikon,
  kadence: 0.6, magasin: g.antal, reserve: 0, fart: 245 * U, træk: 0.45, stå: 0, duk: 0, bevæg: 0, hop: 0, model: g.model };
