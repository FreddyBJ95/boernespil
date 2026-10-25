// ===== Skrot & Brag: byg en bil, kør den ind i et hus, og se det vælte =====
import { BANER, DELE, FARVER, FARVENAVNE, normaliser, stjerner as stjerneTal } from './data.mjs';
import { opretFysik, TRIN } from './fysik.mjs';
import { Grafik } from './grafik.mjs';
import { Lyd } from './lyd.mjs';
import { DELIKON, FANEIKON, BANEIKON, antalIkon, farveIkon } from './ikoner.mjs';
import { LASTFARVER } from './modeller.mjs';

const $ = id => document.getElementById(id);
const GEMNING = 'skrot-og-brag-v2';
const FANER = [['hjul', 'Hjul'], ['motor', 'Motor'], ['front', 'Front'], ['last', 'Last'], ['fører', 'Fører'], ['farve', 'Farve']];
const TITLER = ['Prøv igen!', 'Godt kørt!', 'Sikke et brag!', 'KÆMPE BRAG!'];
const ORD = { bump: ['BAM!', 'KRAS!', 'BONK!'], brag: ['BOM!', 'BRAG!', 'KA-BUM!', 'PANG!', 'BANG!'] };
const sideLayout = matchMedia('(max-height: 540px) and (orientation: landscape)');

// Den gamle udgaves bil læses med, så barnets bil ikke forsvinder.
let gemt = {};
try { gemt = JSON.parse(localStorage.getItem(GEMNING) || 'null') || JSON.parse(localStorage.getItem('skrot-og-brag-v1') || '{}') || {}; }
catch { /* Privat browsing er også velkommen. */ }
let bil = normaliser(gemt.bil), fane = 'hjul';
let bane = Number.isInteger(gemt.bane) && gemt.bane >= 0 && gemt.bane < BANER.length ? gemt.bane : 0;
const bedste = BANER.map((_, i) => [0, 1, 2, 3].includes(gemt.stjerner?.[i]) ? gemt.stjerner[i] : 0);

let tilstand = 'garage', sim, travl = false, rester = 0, sidsteTid = 0, dialog = null;
let sidsteBrag = 0, sidsteFremgang = 0, bumpTid = null, bedsteProcent = 0, tændte = 0, sidsteBoble = -1;
const lyd = new Lyd();
lyd.tændt = gemt.lyd !== false;
const grafik = new Grafik($('scene'));
grafik.effekter.rolig = gemt.rolig === true || grafik.effekter.rolig;
const taster = new Set(), fingre = new Map();

function gem() {
  try { localStorage.setItem(GEMNING, JSON.stringify({ bil, bane, stjerner: bedste, lyd: lyd.tændt, rolig: grafik.effekter.rolig })); }
  catch { /* Spillet virker også uden gemning. */ }
}

function knap(klasse, valgt, handling) {
  const b = document.createElement('button');
  b.className = klasse;
  b.setAttribute('aria-pressed', String(valgt));
  b.addEventListener('click', handling);
  return b;
}

// ---------- Værkstedet ----------
// Fanerne viser en tegning af hver del; et tryk skifter delen på bilen med det samme.
function visDele() {
  $('faner').replaceChildren(...FANER.map(([id, navn]) => {
    const b = knap('fane', fane === id, () => { fane = id; lyd.klik(); visDele(); });
    b.removeAttribute('aria-pressed');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(fane === id));
    b.setAttribute('aria-label', navn);
    b.innerHTML = FANEIKON[id];
    return b;
  }));
  const dele = [];
  const valg = (ikon, navn, valgt, handling, klasse = 'del') => {
    const b = knap(klasse, valgt, handling);
    b.setAttribute('aria-label', navn);
    b.innerHTML = ikon;
    return b;
  };
  if (fane === 'farve') FARVER.forEach((farve, i) => dele.push(valg(farveIkon(farve), FARVENAVNE[i], bil.farve === farve, () => skift('farve', farve))));
  else for (const d of DELE[fane]) dele.push(valg(DELIKON[fane][d.id], d.navn, bil[fane] === d.id, () => skift(fane, d.id)));
  if (fane === 'last' && bil.last !== 'tom') {
    const skiller = document.createElement('span');
    skiller.className = 'skiller';
    dele.push(skiller);
    for (const n of [1, 2, 3]) dele.push(valg(antalIkon(n, LASTFARVER[bil.last]), n === 1 ? 'Én tønde' : `${n} tønder`, bil.antal === n, () => skift('antal', n), 'del lille'));
  }
  $('dele').replaceChildren(...dele);
  requestAnimationFrame(opdaterFri);
}

async function skift(type, værdi) {
  if (travl || bil[type] === værdi) return;
  bil = normaliser({ ...bil, [type]: værdi });
  lyd.klik();
  gem();
  visDele();
  await nulstil(true);
}

function visBaner() {
  $('baner').replaceChildren(...BANER.map((b, i) => {
    const k = knap('bane', bane === i, async () => {
      if (travl || bane === i) return;
      bane = i;
      lyd.klik();
      gem();
      visBaner();
      await nulstil(true);
    });
    k.setAttribute('aria-label', `${b.navn}, ${bedste[i]} af 3 stjerner`);
    k.innerHTML = `${BANEIKON[b.id]}<span class="stj"><b>${'★'.repeat(bedste[i])}</b>${'★'.repeat(3 - bedste[i])}</span>`;
    return k;
  }));
  $('målIkon').innerHTML = BANEIKON[BANER[bane].id];
  BANER[bane].stjerner.forEach((grænse, i) => { $(`s${i + 1}`).style.left = `${grænse}%`; });
}

// Kameraet centrerer bilen i det stykke af skærmen, som knapperne ikke dækker.
function opdaterFri() {
  const w = innerWidth, h = innerHeight;
  if (tilstand === 'garage') {
    const top = document.querySelector('.top').getBoundingClientRect().bottom;
    if (sideLayout.matches) {
      const venstre = document.querySelector('.byg').getBoundingClientRect().right;
      const højre = document.querySelector('.baner-panel').getBoundingClientRect().left;
      grafik.fri = { x: (venstre + højre) / 2, y: (top + h) / 2, b: Math.max(160, højre - venstre), h: h - top };
    } else {
      const dok = $('dok').getBoundingClientRect().top;
      grafik.fri = { x: w / 2, y: (top + dok) / 2, b: w, h: Math.max(140, dok - top) };
    }
  } else {
    const top = document.querySelector('.hud-top').getBoundingClientRect().bottom, bund = h - (h < 560 ? 100 : 130);
    grafik.fri = { x: w / 2, y: (top + bund) / 2, b: w, h: Math.max(140, bund - top) };
  }
}

function slip() {
  taster.clear();
  fingre.clear();
  for (const id of ['gas', 'bak', 'boost', 'dyt']) $(id).classList.remove('trykket');
}

// Hver ny opstilling frigiver den forrige fysikverden.
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
    // Lad husene og lasten falde til ro, før barnet tager over.
    for (let i = 0; i < 90; i++) sim.trin();
    sim.hentHændelser();
    sim.tid = 0;
    grafik.byg(sim);
    vis(garage ? 'garage' : 'kør');
    $('status').hidden = true;
  } catch (fejl) {
    console.error(fejl);
    $('status').textContent = 'Værkstedet kunne ikke indlæses. Genindlæs siden for at prøve igen.';
    $('status').hidden = false;
  } finally {
    travl = false;
    $('start').disabled = !sim;
  }
}

// Skifter mellem værkstedet og kørslen uden at bygge banen om.
function vis(ny) {
  tilstand = ny;
  const garage = ny === 'garage';
  $('garage').hidden = !garage;
  $('kørsel').hidden = garage;
  $('dialog').hidden = true;
  $('kørsel').inert = false;
  $('tip').hidden = false;
  $('bobler').replaceChildren();
  dialog = null;
  rester = 0;
  sidsteBrag = sidsteFremgang = 0;
  bumpTid = null;
  bedsteProcent = 0;
  tændte = 0;
  sidsteBoble = -1;
  for (let i = 1; i <= 3; i++) $(`s${i}`).classList.remove('tændt');
  opdaterTal();
  opdaterFri();
}

function opdaterTal() {
  const s = sim.status();
  $('fyld').style.width = `${Math.min(100, s.procent)}%`;
  $('tank').style.strokeDashoffset = String(289 * (1 - s.brændstof));
  $('boost').classList.toggle('tom-tank', s.brændstof <= 0);
  const n = stjerneTal(bane, s.procent);
  while (tændte < n) {
    $(`s${++tændte}`).classList.add('tændt');
    lyd.ding(tændte - 1);
  }
  return s;
}

// ---------- Resultat og pause ----------
function visDialog(type, n = 0, procent = 0) {
  dialog = type;
  slip();
  // Knapperne bag dialogen kan ikke nås, mens den er åben.
  $('kørsel').inert = true;
  $('dialog').hidden = false;
  $('pausevalg').hidden = type !== 'pause';
  $('stjerner').replaceChildren(...(type === 'pause' ? [] : [0, 1, 2].map(i => {
    const s = document.createElement('span');
    s.textContent = '★';
    s.style.setProperty('--i', i);
    if (i < n) s.classList.add('tændt');
    return s;
  })));
  $('dialogTitel').textContent = type === 'pause' ? 'Pause' : TITLER[n];
  $('dialogTal').textContent = type === 'pause' ? '' : `${procent} % væltet`;
  $('fortsæt').setAttribute('aria-label', type === 'pause' ? 'Fortsæt' : 'Næste bane');
  $('igen').setAttribute('aria-label', type === 'pause' ? 'Start forfra' : 'Prøv igen');
  $('fortsæt').focus({ preventScroll: true });
}

function resultat() {
  if (tilstand !== 'kør') return;
  const s = opdaterTal(), n = stjerneTal(bane, s.procent);
  bedste[bane] = Math.max(bedste[bane], n);
  gem();
  tilstand = 'resultat';
  lyd.fanfare(n);
  visDialog('resultat', n, s.procent);
}

function pause() {
  if (tilstand === 'pause') {
    tilstand = 'kør';
    $('dialog').hidden = true;
    $('kørsel').inert = false;
    dialog = null;
    lyd.pause(false);
    sidsteTid = performance.now();
  } else if (tilstand === 'kør') {
    tilstand = 'pause';
    lyd.pause(true);
    visDialog('pause');
  }
}

// ---------- Tegneseriebobler ----------
function boble(e) {
  if (sim.tid - sidsteBoble < .3) return;
  sidsteBoble = sim.tid;
  const lag = $('bobler');
  if (lag.childElementCount >= 4) lag.firstElementChild.remove();
  const s = grafik.tilSkærm({ x: e.p.x + (e.type === 'bump' ? 3.6 : 0), y: e.p.y + 1.2 });
  if (!s.synlig) return;
  const b = document.createElement('div'), ord = document.createElement('span'), liste = ORD[e.type === 'bump' ? 'bump' : 'brag'];
  b.className = 'boble';
  b.style.left = `${Math.max(90, Math.min(innerWidth - 90, s.x))}px`;
  b.style.top = `${Math.max(150, Math.min(innerHeight - 170, s.y))}px`;
  b.style.setProperty('--farve', e.type === 'bump' ? '#ffd23f' : LASTFARVER[e.slags] || '#ff8a1f');
  ord.textContent = liste[Math.floor(Math.random() * liste.length)];
  ord.style.setProperty('--drej', `${Math.round(Math.random() * 20 - 10)}deg`);
  b.append(ord);
  b.addEventListener('animationend', () => b.remove());
  lag.append(b);
}

// ---------- Styring ----------
// Pointer capture gør, at en pedal slipper korrekt, selv når fingeren glider væk.
for (const id of ['gas', 'bak', 'boost', 'dyt']) {
  const b = $(id);
  b.addEventListener('pointerdown', e => {
    if (tilstand !== 'kør') return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    fingre.set(e.pointerId, id);
    b.classList.add('trykket');
    lyd.start();
    if (id === 'dyt') lyd.dyt();
  });
  const slut = e => {
    fingre.delete(e.pointerId);
    b.classList.toggle('trykket', [...fingre.values()].includes(id));
  };
  b.addEventListener('pointerup', slut);
  b.addEventListener('pointercancel', slut);
  b.addEventListener('lostpointercapture', slut);
  b.addEventListener('contextmenu', e => e.preventDefault());
}

document.addEventListener('keydown', e => {
  if (['ArrowRight', 'ArrowLeft', 'KeyD', 'KeyA', 'Space'].includes(e.code) && tilstand === 'kør') {
    e.preventDefault();
    taster.add(e.code);
    lyd.start();
  }
  if (e.repeat) return;
  if (e.code === 'KeyH' && tilstand === 'kør') { lyd.start(); lyd.dyt(); }
  if (e.code === 'KeyR' && (tilstand === 'kør' || tilstand === 'resultat')) nulstil();
  if (e.code === 'Escape' || e.code === 'KeyP') pause();
  if (e.code === 'Enter' && tilstand === 'garage' && document.activeElement === document.body) start();
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
window.addEventListener('resize', () => { grafik.størrelse(); opdaterFri(); });
$('scene').addEventListener('webglcontextlost', e => {
  e.preventDefault();
  if (tilstand === 'kør') pause();
  $('status').textContent = 'Grafikken blev afbrudt. Genindlæs siden for at fortsætte.';
  $('status').hidden = false;
});

// Garagens bil er allerede bygget og i ro, så KØR starter med det samme.
function start() {
  if (!sim || travl) return;
  lyd.start();
  lyd.dyt();
  vis('kør');
}

$('start').addEventListener('click', start);
$('tilbage').addEventListener('click', () => { lyd.klik(); visBaner(); nulstil(true); });
$('pause').addEventListener('click', pause);
$('igen').addEventListener('click', () => { lyd.start(); lyd.pause(false); nulstil(); });
$('tilVærksted').addEventListener('click', () => { lyd.pause(false); visBaner(); nulstil(true); });
$('fortsæt').addEventListener('click', () => {
  lyd.start();
  if (dialog === 'pause') return pause();
  bane = (bane + 1) % BANER.length;
  gem();
  visBaner();
  nulstil();
});
for (const id of ['lyd', 'lydP']) $(id).addEventListener('click', () => {
  lyd.start();
  lyd.vælg(!lyd.tændt);
  if (tilstand === 'pause') lyd.pause(true);
  komfort(); gem();
});
for (const id of ['rolig', 'roligP']) $(id).addEventListener('click', () => {
  grafik.effekter.rolig = !grafik.effekter.rolig;
  komfort(); gem();
});
function komfort() {
  for (const id of ['lyd', 'lydP']) {
    $(id).textContent = lyd.tændt ? '🔊' : '🔇';
    $(id).setAttribute('aria-pressed', String(lyd.tændt));
  }
  for (const id of ['rolig', 'roligP']) $(id).setAttribute('aria-pressed', String(grafik.effekter.rolig));
  document.body.classList.toggle('rolig', grafik.effekter.rolig);
}

// ---------- Hovedløkken ----------
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
    if (gas) $('tip').hidden = true;
    rester = Math.min(rester + dt, TRIN * 5);
    while (rester >= TRIN) {
      sim.trin({ gas, boost });
      for (const e of sim.hentHændelser()) {
        grafik.effekter.hændelse(e);
        lyd.hændelse(e);
        if (e.type === 'brag') {
          sidsteBrag = sim.tid;
          bumpTid ??= sim.tid;
          grafik.bragFokus = { ...e.p, tid: sim.tid };
          boble(e);
        } else if (e.type === 'bump') {
          bumpTid ??= sim.tid;
          boble(e);
        }
      }
      rester -= TRIN;
    }
    const s = opdaterTal(), p = sim.chassis.krop.translation();
    // Kun et tydeligt hop i væltede dele tæller som nyt; små skub i murbrokkerne gør ikke.
    if (s.procent >= bedsteProcent + 3 || (s.procent === 100 && bedsteProcent < 100)) {
      bedsteProcent = s.procent;
      sidsteFremgang = sim.tid;
      bumpTid ??= sim.tid;
    }
    // Resultatet kommer, når alt er faldet til ro, og senest 12 sekunder efter sammenstødet.
    if (bumpTid !== null) {
      const ro = sim.tid - Math.max(sidsteBrag, sidsteFremgang, bumpTid), efter = sim.tid - bumpTid;
      const lunter = sim.dele.some(d => d.type === 'celle' && d.aktivering !== null && !d.sprængt);
      if ((ro > 3.2 && !lunter) || (efter > 12 && !lunter) || efter > 18) resultat();
    }
    if (sim.kørt && sim.tid > 3 && (p.y < -12 || p.x > 112 || p.x < -16)) resultat();
  }
  lyd.kameraX = grafik.kameraX;
  lyd.kør(sim.status().fart, gas, boost, tilstand === 'kør');
  if (tilstand !== 'pause') grafik.opdater(dt, tilstand, { boost: boost && tilstand === 'kør', gas: tilstand === 'kør' ? gas : 0 });
}

visDele();
visBaner();
komfort();
await nulstil(true);
requestAnimationFrame(tegn);
