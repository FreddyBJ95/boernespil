// ===== Spilkarrusellen — alle spillene på skift, lidt ad gangen =====
// Listen over spil hentes fra forsiden (alle kort i <main>), så nye spil kommer med af sig selv.
// Et spil holdes uden for karrusellen med data-karrusel="nej" på kortet.
// Spillene kører i en ramme (iframe) inde i denne side, så de ikke skal ændres.

const ROD = new URL("../../", location.href);                 // forsiden
const $ = id => document.getElementById(id);
const scene = $("scene"), ring = $("ring"), karrusel = $("karrusel"), besked = $("besked");
const valg = $("valg"), næste = $("naeste"), spilplads = $("spilplads"), ur = $("ur"), nedtælling = $("nedtaelling");
const OMKREDS = 2 * Math.PI * 20;                              // urets ring (r = 20 i svg'en)

let spil = [];              // alle spillene fra forsiden
let pose = [];              // de spil, der mangler i denne omgang (blandet)
let sidst = -1;             // det spil, vi lige har spillet
let tid = 20;               // sekunder pr. spil
let vinkel = 0;             // hvor langt karrusellen er drejet (grader)
let trin = 24;              // grader mellem to kort
let tilstand = "start";     // start · drejer · klar · spiller
let stjerner = 0;

// ----- Hent spillene fra forsiden -----
async function hentSpil() {
  const svar = await fetch(new URL("index.html", ROD));
  const dok = new DOMParser().parseFromString(await svar.text(), "text/html");
  return [...dok.querySelectorAll("main .spil-kort")]
    .filter(k => k.dataset.karrusel !== "nej")
    .map(k => ({
      navn: k.querySelector(".navn")?.textContent.trim() || "",
      ikon: k.querySelector(".ikon")?.textContent.trim() || "🎮",
      adresse: new URL(k.getAttribute("href"), ROD).href,
      farve: (k.getAttribute("style") || "").match(/--farve:\s*([^;]+)/)?.[1].trim() || "#7b5cff",
      billede: k.dataset.billede ? new URL(k.dataset.billede, ROD).href : "",
    }));
}

// ----- Byg ringen af kort -----
function bygRing() {
  ring.replaceChildren(...spil.map(s => {
    const kort = document.createElement("div");
    kort.className = "kort" + (s.billede ? " plakat" : "");
    kort.style.setProperty("--farve", s.farve);
    if (s.billede) kort.style.setProperty("--billede", `url("${s.billede}")`);
    const indre = document.createElement("div"), ikon = document.createElement("span"), navn = document.createElement("span");
    indre.className = "kort-indre"; ikon.className = "ikon"; navn.className = "navn";
    ikon.textContent = s.ikon; navn.textContent = s.navn;
    indre.append(ikon, navn); kort.append(indre);
    return kort;
  }));
  målRing();
}

// Kortenes størrelse og ringens radius passes til skærmen.
// På smalle skærme må karrusellen gerne gå lidt ud over kanterne, så de forreste kort er store nok.
function målRing() {
  const n = Math.max(spil.length, 3);
  const bredde = Math.max(110, Math.min(156, innerWidth * 0.2, innerHeight * 0.19));
  const radius = (bredde / 2 + 12) / Math.tan(Math.PI / n);
  const skala = Math.min(1, (innerWidth * 1.3) / (2 * radius + bredde * 0.6));
  trin = 360 / n;
  karrusel.style.setProperty("--b", `${bredde}px`);
  karrusel.style.setProperty("--r", `${radius}px`);
  karrusel.style.setProperty("--skala", skala.toFixed(3));
  [...ring.children].forEach((k, i) => { k.style.transform = `rotateY(${i * trin}deg) translateZ(${radius}px)`; });
  tegnRing();
}
function tegnRing() { ring.style.setProperty("--vinkel", `${vinkel}deg`); }

// Det kort, der vender lige frem mod os lige nu
function forreste() { return ((Math.round(-vinkel / trin) % spil.length) + spil.length) % spil.length; }

// ----- Karrusellen drejer langsomt rundt, mens man vælger tid -----
let sidsteBillede = 0;
function tomgang(nu) {
  const dt = Math.min(0.05, (nu - sidsteBillede) / 1000 || 0);
  sidsteBillede = nu;
  if (tilstand !== "start") return;
  vinkel -= dt * 9; tegnRing();
  requestAnimationFrame(tomgang);
}
function startTomgang() { sidsteBillede = performance.now(); requestAnimationFrame(tomgang); }

// ----- Drej karrusellen og stop ved spil nr. k -----
function drejTil(k) {
  return new Promise(klar => {
    const kort = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sek = kort ? 0.8 : 3.4, omgange = kort ? 0 : 2;
    const fra = vinkel, mål0 = -k * trin;
    const mål = mål0 - 360 * Math.ceil((mål0 - (fra - 360 * omgange - trin)) / 360);
    const start = performance.now();
    let sidsteKort = forreste();
    const skridt = nu => {
      const t = Math.min(1, (nu - start) / (sek * 1000));
      vinkel = fra + (mål - fra) * (1 - Math.pow(1 - t, 4));   // hurtigt først, langsomt til sidst
      tegnRing();
      const f = forreste();
      if (f !== sidsteKort) { sidsteKort = f; klik(); }
      if (t < 1) requestAnimationFrame(skridt); else klar();
    };
    requestAnimationFrame(skridt);
  });
}

// ----- Vælg det næste spil: alle kommer med én gang, før der blandes igen -----
function trækNæste() {
  if (!pose.length) {
    pose = spil.map((_, i) => i).filter(i => i !== sidst || spil.length < 2);
    for (let i = pose.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pose[i], pose[j]] = [pose[j], pose[i]]; }
    if (sidst >= 0 && spil.length > 1) pose.push(sidst);        // det sidste spil kommer tidligst igen til allersidst
  }
  return pose.shift();
}

// ----- En omgang: drej, vis navnet, og start spillet -----
let autoStart = 0;
async function nyOmgang() {
  tilstand = "drejer";
  næste.hidden = true;
  ring.querySelector(".valgt")?.classList.remove("valgt");
  besked.textContent = "Hvad bliver det næste spil? 🥁";
  const k = trækNæste();
  await drejTil(k);
  visNæste(k);
}

// Karrusellen er stoppet: kortet hopper frem, og spillet starter om lidt (eller med det samme ved tryk)
function visNæste(k) {
  tilstand = "klar";
  ring.children[k].classList.add("valgt");
  $("naesteNavn").textContent = `${spil[k].ikon} ${spil[k].navn}`;
  besked.textContent = "Næste spil er …";
  næste.hidden = false;
  const fyld = $("spilFyld");
  fyld.style.animation = "none"; void fyld.offsetWidth; fyld.style.animation = "";
  try { Effekter.konfetti(innerWidth / 2, innerHeight * 0.45, { antal: 50 }); Effekter.ding(); } catch (_) {}
  clearTimeout(autoStart);
  autoStart = setTimeout(() => startSpil(k), 2600);
  $("spilKnap").onclick = () => startSpil(k);
}

// ----- Spillet: en ramme i hele skærmen og uret i siden -----
let ramme = null;
function startSpil(k) {
  if (tilstand !== "klar") return;
  clearTimeout(autoStart);
  tilstand = "spiller"; sidst = k;
  ramme = document.createElement("iframe");
  ramme.title = spil[k].navn;
  ramme.allow = "fullscreen; autoplay; microphone; camera; gamepad; screen-wake-lock";
  ramme.addEventListener("load", () => vedIndlæst(ramme));
  ramme.src = spil[k].adresse;
  spilplads.replaceChildren(ramme);
  spilplads.hidden = false;
  scene.hidden = true;
  startUr();
}

// Når spillet er hentet: uret begynder at tælle, og 🏠 i spillet fører helt hjem
function vedIndlæst(r) {
  if (r !== ramme) return;
  try {
    if (erForsiden(r.contentWindow.location.href)) return gåHjem();
    r.contentDocument.addEventListener("click", e => {
      const link = e.target.closest?.("a[href]");
      if (link && erForsiden(link.href)) { e.preventDefault(); e.stopPropagation(); gåHjem(); }
    }, true);
    r.contentWindow.focus();
  } catch (_) {}
  urTæller = true;
}
function erForsiden(adresse) {
  const u = new URL(adresse, location.href);
  return u.origin === ROD.origin && (u.pathname === ROD.pathname || u.pathname === ROD.pathname + "index.html");
}
function gåHjem() { location.href = ROD.href; }

// ----- Uret: tæller kun, når spillet er hentet, og skærmen er tændt -----
let brugt = 0, urTæller = false, urTimer = 0, sidstTik = 0, sidstSagt = 0, reserveStart = 0;
function startUr() {
  brugt = 0; urTæller = false; sidstSagt = 0; sidstTik = performance.now();
  ur.hidden = false; ur.classList.remove("snart");
  tegnUr();
  clearInterval(urTimer); urTimer = setInterval(urTik, 200);
  clearTimeout(reserveStart); reserveStart = setTimeout(() => { urTæller = true; }, 8000);   // hvis spillet aldrig melder klar
}
function urTik() {
  const nu = performance.now();
  if (urTæller && document.visibilityState === "visible") brugt += Math.min(1, (nu - sidstTik) / 1000);
  sidstTik = nu;
  tegnUr();
  if (brugt >= tid) slutSpil(true);
}
function tegnUr() {
  const rest = Math.max(0, tid - brugt), sek = Math.ceil(rest);
  $("urFyld").style.strokeDashoffset = `${OMKREDS * (1 - rest / tid)}`;
  $("urTal").textContent = sek >= 60 ? `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, "0")}` : sek;
  const snart = urTæller && sek <= 5 && sek > 0;
  ur.classList.toggle("snart", snart);
  if (snart && sek !== sidstSagt) { sidstSagt = sek; visTal(sek); }
}

// De store tal de sidste fem sekunder, med et lille bip
function visTal(sek) {
  const tal = document.createElement("span");
  tal.textContent = sek;
  nedtælling.replaceChildren(tal);
  bip(sek === 1 ? 880 : 620);
}

// ----- Slut på spillet: tilbage til karrusellen, en stjerne, og så drejer den igen -----
function slutSpil(færdig) {
  if (tilstand !== "spiller") return;
  clearInterval(urTimer); clearTimeout(reserveStart);
  ur.hidden = true; nedtælling.replaceChildren();
  if (ramme) { ramme.src = "about:blank"; ramme.remove(); ramme = null; }   // stop lyden og frigør hukommelsen
  spilplads.hidden = true;
  scene.hidden = false;
  scene.classList.remove("ind"); void scene.offsetWidth; scene.classList.add("ind");
  if (færdig) giStjerne();
  besked.textContent = færdig ? "⏰ Tiden er gået!" : "⏭ Videre!";
  tilstand = "drejer";
  setTimeout(nyOmgang, færdig ? 1100 : 500);
}
function giStjerne() {
  stjerner++;
  const boks = $("stjerner");
  boks.hidden = false; $("antal").textContent = stjerner;
  boks.classList.remove("hop"); void boks.offsetWidth; boks.classList.add("hop");
  try {
    const r = boks.getBoundingClientRect();
    Effekter.stjerner(r.left + r.width / 2, r.top + r.height / 2, { antal: 10 });
    Effekter.fanfare();
  } catch (_) {}
}

// ----- Små lyde (Web Audio — den samme lydmotor som effekter.js) -----
function tone(frekvens, længde, styrke, type = "sine") {
  try {
    const a = Effekter.audio(), o = a.createOscillator(), g = a.createGain(), n = a.currentTime;
    o.type = type; o.frequency.value = frekvens;
    g.gain.setValueAtTime(styrke, n); g.gain.exponentialRampToValueAtTime(0.0001, n + længde);
    o.connect(g); g.connect(a.destination); o.start(n); o.stop(n + længde + 0.02);
  } catch (_) {}
}
const klik = () => tone(1500 + Math.random() * 300, 0.04, 0.08, "square");
const bip = f => tone(f, 0.18, 0.18, "triangle");

// ----- Knapperne -----
valg.addEventListener("click", e => {
  const knap = e.target.closest(".tid");
  if (!knap || tilstand !== "start" || !spil.length) return;
  tid = Number(knap.dataset.tid);
  try { localStorage.setItem("karrusel-tid", tid); Effekter.pop(); } catch (_) {}
  valg.hidden = true;
  nyOmgang();
});
$("spring").addEventListener("click", () => slutSpil(false));
addEventListener("resize", målRing);

// Den tid, man valgte sidst, er markeret
try {
  const gemt = localStorage.getItem("karrusel-tid");
  valg.querySelector(`[data-tid="${gemt}"]`)?.classList.add("sidst");
} catch (_) {}

// ----- Start -----
try {
  spil = await hentSpil();
  if (!spil.length) throw new Error("ingen spil");
  bygRing();
  vinkel = -Math.random() * 360;
  startTomgang();
} catch (_) {
  besked.textContent = "Spillene kunne ikke hentes. Prøv igen fra forsiden.";
  valg.hidden = true;
}
