import { BANER, DELE, STANDARD, del, normaliser } from './data.mjs';
import { opretFysik, TRIN } from './fysik.mjs';
import { Grafik } from './grafik.mjs';
import { Lyd } from './lyd.mjs';

const $ = id => document.getElementById(id);
const GEMNING = 'skrot-og-brag-v1';
let gemt = {};
try { gemt = JSON.parse(localStorage.getItem(GEMNING) || '{}') || {}; } catch { /* Privat browsing er også velkommen. */ }
let bil = normaliser(gemt.bil), bane = 0, fane = 'last';
let tilstand = 'garage', sim, travl = false, rester = 0, sidsteTid = 0, sidsteBrag = 0, målTid = null;
let bedste = Array.isArray(gemt.bedste) ? gemt.bedste.slice(0, 4).map(n => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0) : [];
const lyd = new Lyd();
lyd.tændt = gemt.lyd !== false;
const grafik = new Grafik($('scene'));
grafik.effekter.rolig = gemt.rolig === true || grafik.effekter.rolig;
const taster = new Set(), fingre = new Map();

// Gem kun konstruktion, rekorder og komfortvalg; spillet kræver ingen konto.
function gem() {
  try { localStorage.setItem(GEMNING, JSON.stringify({ bil, bedste, lyd: lyd.tændt, rolig: grafik.effekter.rolig })); }
  catch { $('gemt').textContent = 'Bilen kan bruges nu, men kunne ikke gemmes på enheden.'; }
}

function knap(tekst, klasse, valgt, handling) {
  const b = document.createElement('button');
  b.className = klasse;
  b.textContent = tekst;
  b.setAttribute('aria-pressed', String(valgt));
  b.addEventListener('click', handling);
  return b;
}

// De fire hylder ændrer rigtige egenskaber i fysikken og på bilmodellen.
function visDele() {
  $('faner').replaceChildren();
  for (const [id, navn] of Object.entries({ hjul: 'Hjul', motor: 'Motor', front: 'Front', last: 'Last' })) {
    const b = knap(navn, 'fane', fane === id, () => { fane = id; visDele(); });
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(fane === id));
    $('faner').append(b);
  }
  $('dele').replaceChildren();
  for (const d of DELE[fane]) {
    const b = knap('', 'del', bil[fane] === d.id, async () => {
      if (travl) return;
      bil[fane] = d.id;
      gem();
      visDele();
      await nulstil(true);
    });
    b.style.setProperty('--delfarve', d.farve || '#f5cc4c');
    const symbol = document.createElement('span'), tekst = document.createElement('span'), navn = document.createElement('b'), forklaring = document.createElement('small'), flue = document.createElement('span');
    symbol.className = 'symbol';
    symbol.textContent = d.ikon;
    navn.textContent = d.navn;
    forklaring.textContent = d.tekst;
    flue.className = 'flue';
    flue.textContent = bil[fane] === d.id ? '✓' : '';
    tekst.append(navn, forklaring);
    b.append(symbol, tekst, flue);
    $('dele').append(b);
  }
  $('antal').replaceChildren(...[1, 2, 3].map(n => knap(n, '', bil.antal === n, async () => {
    if (travl) return;
    bil.antal = n;
    gem(); visDele(); await nulstil(true);
  })));
  $('farver').replaceChildren(...['#f5cc4c', '#62ded7', '#f17d9a', '#a38bfa'].map((farve, i) => {
    const b = knap('', 'lak', bil.farve === farve, async () => {
      if (travl) return;
      bil.farve = farve;
      gem(); visDele(); await nulstil(true);
    });
    b.style.setProperty('--lak', farve);
    b.setAttribute('aria-label', ['Gul', 'Turkis', 'Rosa', 'Lilla'][i]);
    return b;
  }));
  $('bilnavn').textContent = `${del('hjul', bil.hjul).navn} + ${del('last', bil.last).navn}`.toUpperCase();
}

function visBane() {
  $('baner').replaceChildren(...BANER.map((b, i) => {
    const k = knap(b.kort, 'bane', bane === i, async () => {
      if (travl) return;
      bane = i;
      visBane(); await nulstil(true);
    });
    k.setAttribute('aria-label', b.navn);
    return k;
  }));
  $('banenavn').textContent = BANER[bane].navn;
  $('banetekst').textContent = BANER[bane].tekst;
  $('maaltekst').textContent = `Vælt mindst ${BANER[bane].mål}% af bygningerne`;
  $('rekord').textContent = bedste[bane] ? `DIN REKORD / ${bedste[bane]}% væltet` : 'ALLE DELE ER LÅST OP · BARE BYG LØS';
}

function slip() {
  taster.clear();
  fingre.clear();
  for (const id of ['gas', 'bak', 'boost']) $(id).classList.remove('trykket');
}

// Opstillinger frigiver deres WASM-hukommelse ved hvert nyt forsøg.
async function nulstil(garage = false) {
  if (travl) return;
  travl = true;
  $('start').disabled = true;
  slip();
  lyd.nulstil();
  try {
    const ny = await opretFysik(bil, bane);
    sim?.luk();
    sim = ny;
    // Lad fuger og last falde til ro, før barnet tager over.
    for (let i = 0; i < 90; i++) sim.trin();
    sim.hentHændelser();
    sim.tid = 0;
    grafik.byg(sim);
    grafik.kameraX = 5;
    grafik.kameraY = 3;
    rester = 0;
    sidsteBrag = 0;
    målTid = null;
    tilstand = garage ? 'garage' : 'kør';
    $('garage').hidden = !garage;
    $('kørsel').hidden = garage;
    $('pause').hidden = garage;
    $('overblik').hidden = garage;
    $('dialog').hidden = true;
    $('kædebesked').textContent = garage ? '' : 'Hold KØR nede →';
    $('status').hidden = true;
    $('start').textContent = 'Ud og lav ballade →';
    opdaterTal();
  } catch (fejl) {
    console.error(fejl);
    $('status').textContent = 'Værkstedet kunne ikke indlæses. Genindlæs siden for at prøve igen.';
    $('status').hidden = false;
  } finally {
    travl = false;
    $('start').disabled = !sim;
  }
}

function opdaterTal() {
  const s = sim.status();
  $('procent').textContent = s.procent;
  $('kaede').textContent = s.kæde;
  $('fart').textContent = s.fart;
  $('tank').value = s.brændstof;
  return s;
}

// Resultatet kommer efter kædereaktionen, så de sidste etager får tid til at falde.
function resultat() {
  if (tilstand !== 'kør') return;
  const s = opdaterTal(), vundet = s.procent >= BANER[bane].mål;
  bedste[bane] = Math.max(bedste[bane] || 0, s.procent);
  gem();
  tilstand = 'resultat';
  slip();
  $('dialog').hidden = false;
  $('resultatunder').textContent = vundet ? 'MISSION KLARET' : 'EN NY IDÉ TIL BILEN?';
  $('resultattitel').textContent = vundet ? 'Sikke et brag!' : 'Byg. Brag. Prøv igen.';
  $('resultattekst').textContent = vundet ? 'Din konstruktion satte gang i balladen. Kan en anden last lave en endnu større kæde?' : 'Prøv en tungere front, en anden last eller mere fart før sammenstødet.';
  $('resultattal').innerHTML = `<div><b>${s.procent}%</b><span>af huset væltet</span></div><div><b>${s.kæde}</b><span>eksplosioner i kæden</span></div>`;
  $('fortsæt').textContent = 'Samme bil, nyt forsøg →';
  $('fortsæt').focus();
}

function pause() {
  if (tilstand === 'pause') {
    tilstand = 'kør';
    $('dialog').hidden = true;
    lyd.pause(false);
    sidsteTid = performance.now();
  } else if (tilstand === 'kør') {
    tilstand = 'pause';
    slip();
    lyd.pause(true);
    $('dialog').hidden = false;
    $('resultatunder').textContent = 'ET LILLE PITSTOP';
    $('resultattitel').textContent = 'Pause';
    $('resultattekst').textContent = 'Bilen og kædereaktionen venter på dig.';
    $('resultattal').replaceChildren();
    $('fortsæt').textContent = 'Kør videre →';
    $('fortsæt').focus();
  }
}

// Pointer capture gør, at en pedal slipper korrekt, selv når fingeren glider væk.
for (const id of ['gas', 'bak', 'boost']) {
  const b = $(id);
  b.addEventListener('pointerdown', e => {
    if (tilstand !== 'kør') return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    fingre.set(e.pointerId, id);
    b.classList.add('trykket');
    lyd.start();
  });
  const slut = e => {
    fingre.delete(e.pointerId);
    b.classList.toggle('trykket', [...fingre.values()].includes(id));
  };
  b.addEventListener('pointerup', slut);
  b.addEventListener('pointercancel', slut);
  b.addEventListener('lostpointercapture', slut);
}

document.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (['ArrowRight', 'ArrowLeft', 'KeyD', 'KeyA', 'Space'].includes(e.code) && tilstand === 'kør') {
    e.preventDefault();
    taster.add(e.code);
    lyd.start();
  }
  if (!e.repeat && e.code === 'KeyR' && tilstand === 'kør') nulstil();
  if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) pause();
});
document.addEventListener('keyup', e => taster.delete(e.code));
window.addEventListener('blur', () => { slip(); if (tilstand === 'kør') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    slip();
    if (tilstand === 'kør') pause();
    lyd.pause(true);
  } else if (tilstand !== 'pause') lyd.pause(false);
});
window.addEventListener('resize', () => grafik.størrelse());
$('scene').addEventListener('webglcontextlost', e => {
  e.preventDefault();
  if (tilstand === 'kør') pause();
  $('status').textContent = 'Grafikken blev afbrudt. Genindlæs siden for at fortsætte.';
  $('status').hidden = false;
});

$('start').addEventListener('click', () => { lyd.start(); nulstil(); });
$('igen').addEventListener('click', () => nulstil());
$('tilbage').addEventListener('click', () => { visBane(); nulstil(true); });
$('byg-om').addEventListener('click', () => { lyd.pause(false); visBane(); nulstil(true); });
$('fortsæt').addEventListener('click', () => {
  lyd.start();
  if (tilstand === 'pause') pause();
  else nulstil();
});
$('pause').addEventListener('click', pause);
$('overblik').addEventListener('click', () => {
  grafik.overblik = !grafik.overblik;
  $('overblik').setAttribute('aria-pressed', String(grafik.overblik));
});
$('lyd').addEventListener('click', () => {
  lyd.start();
  lyd.vælg(!lyd.tændt);
  if (tilstand === 'pause') lyd.pause(true);
  komfort(); gem();
});
$('rolig').addEventListener('click', () => {
  grafik.effekter.rolig = !grafik.effekter.rolig;
  komfort(); gem();
});
function komfort() {
  $('lyd').textContent = lyd.tændt ? 'Lyd til' : 'Lyd fra';
  $('lyd').setAttribute('aria-pressed', String(lyd.tændt));
  $('rolig').setAttribute('aria-pressed', String(grafik.effekter.rolig));
}

// Fast fysiktrin giver samme køreegenskaber ved 30 og 60 billeder i sekundet.
function tegn(tid) {
  requestAnimationFrame(tegn);
  const dt = Math.min(.08, (tid - (sidsteTid || tid)) / 1000);
  sidsteTid = tid;
  if (!sim || travl || document.hidden) return;
  const værdier = [...fingre.values()];
  const frem = taster.has('ArrowRight') || taster.has('KeyD') || værdier.includes('gas');
  const bak = taster.has('ArrowLeft') || taster.has('KeyA') || værdier.includes('bak');
  const gas = Number(frem) - Number(bak);
  const boost = (taster.has('Space') || værdier.includes('boost')) && sim.brændstof > 0;
  if (tilstand === 'kør') {
    rester = Math.min(rester + dt, TRIN * 5);
    while (rester >= TRIN) {
      sim.trin({ gas, boost });
      for (const e of sim.hentHændelser()) {
        grafik.effekter.hændelse(e);
        lyd.hændelse(e);
        if (e.type === 'brag') {
          sidsteBrag = sim.tid;
          grafik.bragFokus = { ...e.p, tid: sim.tid };
          $('kædebesked').textContent = `${e.kæde} BRAG · ${e.dybde > 1 ? 'KÆDEREAKTION!' : 'SÅDAN!'}`;
        }
      }
      rester -= TRIN;
    }
    const s = opdaterTal(), p = sim.chassis.krop.translation();
    if (s.procent >= BANER[bane].mål) målTid ??= sim.tid;
    if ((målTid !== null && sim.tid - Math.max(målTid, sidsteBrag) > 7) ||
      (sim.kørt && sim.tid > 5 && (p.y < -12 || p.x > 112 || p.x < -16)) ||
      (sim.kørt && sim.tid > 55)) resultat();
  }
  lyd.kameraX = grafik.kameraX;
  lyd.kør(sim.status().fart, gas, boost, tilstand === 'kør');
  if (tilstand !== 'pause') grafik.opdater(dt, tilstand === 'garage', boost && tilstand === 'kør');
}

visDele();
visBane();
komfort();
await nulstil(true);
requestAnimationFrame(tegn);
