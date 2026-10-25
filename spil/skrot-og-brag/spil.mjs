// ===== Skrot & Brag: byg en rigtig lastbil, og kør den ind i Nedrivningsfirmaets bygninger =====
// Verdenen, fysikken, bygningerne, sprængstoffet, røgen og lyden er Nedrivningsfirmaets egne
// (spil/nedrivning/). Her ligger bilen, værkstedet, kameraet og knapperne til de mindste.
import * as THREE from '../3d-faelles/three.module.js';
import { startFysik, nyVerden, fysikTrin, fysik, RAPIER } from '../nedrivning/fysik.js';
import { hentFotos, MATERIALER } from '../nedrivning/materialer.js';
import { Dele } from '../nedrivning/dele.js';
import { Ruder } from '../nedrivning/ruder.js';
import { Effekter } from '../nedrivning/effekter.js';
import { Efterbehandling } from '../nedrivning/efterbehandling.js';
import { Lyd } from '../nedrivning/lyd.js';
import { Sprængstof, SPRÆNGSTOF, hentModeller } from '../nedrivning/sprængstof.js';
import { Verden } from '../nedrivning/verden.js';
import { BYGNINGER } from '../nedrivning/bygninger.js';
import { mobil } from '../nedrivning/enhed.js';
import { BANER, DELE, FARVER, FARVENAVNE, START, del, normaliser, stjerner as stjerneTal } from './baner.mjs';
import { Bil } from './bil.mjs';
import { bygBil, bygHjul, bygFront } from './bilmodel.mjs';
import { Motorlyd } from './motorlyd.mjs';
import { Ikoner, billedeHtml, farveIkon, TOMIKON, FARVEFANE, banefoto } from './ikoner.mjs';

const $ = id => document.getElementById(id);
const GEMNING = 'skrot-og-brag-v3';
const FANER = [['hjul', 'Hjul'], ['motor', 'Motor'], ['front', 'Front'], ['last', 'Last'], ['farve', 'Farve']];
const TITLER = ['Prøv igen!', 'Godt kørt!', 'Sikke et brag!', 'KÆMPE BRAG!'];
const sideLayout = matchMedia('(max-height: 540px) and (orientation: landscape)');
const status = t => { $('status').textContent = t; $('status').hidden = !t; };

// ---------- Gemningen ----------
let gemt = {};
try { gemt = JSON.parse(localStorage.getItem(GEMNING) || '{}') || {}; } catch { /* privat browser */ }
let valg = normaliser(gemt.bil), fane = 'hjul';
let bane = Number.isInteger(gemt.bane) && gemt.bane >= 0 && gemt.bane < BANER.length ? gemt.bane : 0;
const bedste = BANER.map((_, i) => [0, 1, 2, 3].includes(gemt.stjerner?.[i]) ? gemt.stjerner[i] : 0);
let rolig = gemt.rolig === true || matchMedia('(prefers-reduced-motion: reduce)').matches;
function gem() {
  try { localStorage.setItem(GEMNING, JSON.stringify({ bil: valg, bane, stjerner: bedste, lyd: !lyd.slået, rolig })); } catch { /* spillet virker også uden */ }
}

// ---------- 3D: samme opsætning som Nedrivningsfirmaet ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobil ? 1 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.15, 900);
const efter = new Efterbehandling(renderer, { bloom: true, samples: mobil ? 0 : 4 });
efter.størrelse(innerWidth, innerHeight);

status('Henter fysikken …');
await startFysik();
nyVerden();
status('Henter fotos af beton, mursten og træ …');
const fotos = await hentFotos(renderer);
status('Henter tønderne og gasflaskerne …');
const modeller = await hentModeller();
const verden = new Verden(scene, renderer, fotos);
await verden.pynt();
const ruder = new Ruder(scene);
const dele = new Dele(scene, fotos, ruder);
const effekter = new Effekter(scene);
const lyd = new Lyd();
lyd.slået = gemt.lyd === false;
const motorlyd = new Motorlyd(lyd);
const sprængstof = new Sprængstof({ scene, dele, effekter, lyd, ruder, kamera }, modeller);
dele.forbered(Object.keys(MATERIALER));
const tid = verden.sætTid('dag');
effekter.lysFra(verden.sol, verden.solRetning, new THREE.Color(tid.himmel), new THREE.Color(tid.tåge), tid.tæthed);
const tekstur = navn => dele.materiale(navn);
const ikoner = new Ikoner(renderer, scene.environment);

// En sprængning i nærheden skubber også til bilen
const brag = sprængstof.brag.bind(sprængstof);
sprængstof.brag = l => {
  const p = brag(l);
  if (p && bil) bil.trykbølge(p, l.def.W);
  return p;
};

// ---------- Støv, grus, glas og lyd, når bygningerne går i stykker (som i Nedrivningsfirmaet) ----------
const STØV = { beton: [0.5, 0.48, 0.45], råbeton: [0.47, 0.45, 0.42], mursten: [0.5, 0.39, 0.33], puds: [0.56, 0.54, 0.5], træ: [0.4, 0.35, 0.29], rødtræ: [0.4, 0.33, 0.29] };
const GRUS = { beton: 0x8e8a84, råbeton: 0x7a7670, mursten: 0x8e4a36, puds: 0xc8c4bc, træ: 0x6a4a30, rødtræ: 0x7a3022, stål: 0x5a5e64, rødstål: 0x7a3a2a, blik: 0x9a9ea2, tag: 0x4a4e54 };
dele.hændelser.knus = (d, p) => {
  effekter.støv(p, d.vol, STØV[d.mat] || STØV.beton, 2.5);
  effekter.smågrus(p, Math.min(12, 3 + Math.round(d.vol * 5)), new THREE.Color(GRUS[d.mat] ?? 0x888888), 3.5);
  lyd.knus(p, MATERIALER[d.mat].lyd, d.vol);
};
dele.hændelser.løsn = d => { for (const v of d.vinduer) ruder.venter.push({ v, t: Math.random() * 0.3, fra: null }); };
dele.hændelser.split = (k, c) => {
  lyd.styrt(c, k.masse);
  const liste = [...k.dele], n = Math.min(8, Math.ceil(liste.length / 6));
  for (let i = 0; i < n; i++) {
    const d = liste[Math.floor(Math.random() * liste.length)], { p } = dele.sted(d, new THREE.Vector3());
    p.y = Math.min(p.y, 1.5);
    effekter.støv(p, Math.min(60, k.masse / 2400 / n * 3), STØV[d.mat] || STØV.beton, 5);
  }
};
dele.hændelser.stød = (d, kraft) => {
  const { p } = dele.sted(d, new THREE.Vector3()), m = MATERIALER[d.mat];
  if (d.masse > 800 && kraft > d.masse * 9.81 * 10) { lyd.styrt(p, d.masse); if (d.masse > 3000) effekter.støv(p.setY(Math.min(p.y, 1)), d.vol * 0.6, STØV[d.mat] || STØV.beton, 3); }
  else lyd.slag(p, m.lyd, Math.min(1, kraft / (d.masse * 9.81 * 30)));
};
ruder.vedKnus = (v, fra) => { effekter.glas(v.p, v.normal, v.b, v.h, fra); lyd.glas(v.p); };

// Stød fra fysikken: bygningsdele, sprængstof — og bilen, der rammer noget
function vedStød(a, b, kraft) {
  if (a?.def) sprængstof.stød(a, kraft);
  if (b?.def) sprængstof.stød(b, kraft);
  const dA = a?.str ? a : null, dB = b?.str ? b : null;
  if (dA || dB) dele.stød(dA, dB, kraft);
  const anden = a?.bil ? b : b?.bil ? a : null;
  if (anden && tilstand === 'kør') bilRammer(anden, kraft);
}
// Bilen rammer noget. Selve ændringerne i verdenen venter til efter fysiktrinnet (som i Nedrivningsfirmaet).
const RAMBUK = { kile: 1.6, plov: 1.3, let: 0.9 };
let ramKø = [], sidsteRam = -1;
function bilRammer(anden, kraft) {
  if (anden.def && !anden.tændt && kraft > 3e4 && !anden.fraBil) sprængstof.planlæg(anden, 0.12, true);
  const fart = Math.max(Math.abs(bil.fart), bil.fartFør * 0.85);
  // Rambukken: et hårdt stød knuser den del, bilen rammer, og ryster delene omkring løs
  if (anden.str && !anden.væk && fart > 3 && spilTid - sidsteRam > 0.18) {
    sidsteRam = spilTid;
    ramKø.push({ del: anden, W: Math.min(8, (fart / 9) ** 2 * RAMBUK[valg.front]) });
  }
  if (bil.bump || kraft < bil.masse * 9.81 * 3 || !(anden.str || anden.def)) return;
  bil.bump = { tid: spilTid };
  ramKø.push({ første: true });
}
function udførRam() {
  for (const r of ramKø) {
    const p = bil.frontPunkt();
    if (r.første) {
      bil.kastLast();
      effekter.støv(p.clone().setY(0.8), 2.5, [0.5, 0.46, 0.42], 4);
      lyd.slag(p, 'metal', 1);
      lyd.styrt(p, 2500);
      slowmo = rolig ? 0 : 1.3;
    } else if (!r.del.væk) {
      sprængstof.ramDele(p, r.W, r.del, { skærer: false });
      ruder.trykbølge(p, 3 + r.W);
      effekter.støv(p, 1 + r.W * 0.4, [0.5, 0.46, 0.42], 3);
    }
  }
  ramKø = [];
}

// ---------- Tilstanden ----------
let tilstand = 'garage', bil = null, bygninger = [], rampe = null, mål = null, dialog = null;
let spilTid = 0, slowmo = 0, roTid = 0, tjekTid = 0, tændte = 0, sidst = 0;
const taster = new Set(), fingre = new Map();

// Byg banen op: en ny fysikverden, bygningen, sprængstoffet og bilen
function bygBane() {
  bil?.slip();
  bil = null;
  sprængstof.tøm();
  ramKø = [];
  sidsteRam = -1;
  nyVerden();
  dele.nulstil(); ruder.tøm(); effekter.tøm();
  lyd.stopLøkker?.();
  if (rampe) { scene.remove(rampe); rampe = null; }
  const b = BANER[bane];
  bygninger = b.byg.map(([navn, val]) => BYGNINGER[navn](dele, ruder, val));
  for (const [type, x, z] of b.ting) sprængstof.stil(type, { x, y: 0, z }, { spiller: false });
  if (b.rampe) lavRampe(b.rampe);
  // Byggehegnet holder bilen inde på pladsen (det, man ser, er Nedrivningsfirmaets hegn)
  const hegn = fysik.verden.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  for (const x of [-49.6, 49.6]) fysik.verden.createCollider(RAPIER.ColliderDesc.cuboid(0.2, 3, 46).setTranslation(x, 3, 0).setFriction(0.3).setRestitution(0.2), hegn);
  mål = new THREE.Box3();
  for (const g of bygninger) mål.union(g.kasse);
  nyBil();
}

// Rampen: en skrå stålplade på en betonklods, fast i fysikken
function lavRampe({ x, højde, længde }) {
  const v = Math.atan2(højde, længde), L = Math.hypot(højde, længde), t = 0.4;
  const cx = x - Math.cos(v) * L / 2 + Math.sin(v) * t / 2, cy = Math.sin(v) * L / 2 - Math.cos(v) * t / 2;
  const krop = fysik.verden.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, 0).setRotation({ x: 0, y: 0, z: Math.sin(v / 2), w: Math.cos(v / 2) }));
  fysik.verden.createCollider(RAPIER.ColliderDesc.cuboid(L / 2, t / 2, 2.4).setFriction(0.9), krop);
  rampe = new THREE.Group();
  const plade = new THREE.Mesh(new THREE.BoxGeometry(L, t, 4.8), tekstur('stål'));
  plade.position.set(cx, cy, 0); plade.rotation.z = v;
  const klods = new THREE.Mesh(new THREE.BoxGeometry(1.2, højde, 4.6), tekstur('råbeton'));
  klods.position.set(x - 0.6, højde / 2 - 0.05, 0);
  rampe.add(plade, klods);
  rampe.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  scene.add(rampe);
}

function nyBil() {
  bil?.fjern();
  bil = new Bil({ scene, bil: valg, tekstur, sprængstof, modeller });
  // Lad bilen og tingene falde til ro, før barnet tager over
  for (let i = 0; i < 40; i++) fysikTrin(1 / 60, vedStød, efterTrin);
  spilTid = 0;
}

function efterTrin() {
  if (ramKø.length) udførRam();
  dele.efterTrin();
  bil?.efterTrin({ ...styring(), aktiv: tilstand === 'kør' });
}

// Hvor meget af bygningerne, der ikke længere står, hvor de stod (efter rumfang)
function procent() {
  let start = 0, står = 0;
  for (const b of bygninger) {
    start += b.startVolumen;
    for (const d of b.dele) if (d.fast && !d.væk) står += d.vol;
  }
  return start ? Math.max(0, Math.min(100, Math.round(100 * (1 - står / start)))) : 0;
}

// ---------- Værkstedet ----------
function knap(klasse, valgt, handling) {
  const b = document.createElement('button');
  b.className = klasse;
  b.setAttribute('aria-pressed', String(valgt));
  b.addEventListener('click', handling);
  return b;
}

// Ikonerne tegnes af de rigtige modeller, første gang de skal bruges
const ikon = {
  hjul: id => ikoner.tegn(`hjul-${id}`, () => { const h = del('hjul', id); return bygHjul(id, h.radius, h.bred); }, [0.35, 0.25, 1.6], 1.75),
  motor: id => ikoner.tegn(`motor-${id}-${valg.farve}`, () => bygBil({ ...valg, motor: id, hjul: 'terræn' }, del, tekstur), [1.6, 0.9, 1.4]),
  front: id => ikoner.tegn(`front-${id}`, () => bygFront(id, tekstur), [1.4, 0.6, 1.2]),
  last: (id, n = 1) => id === 'tom' ? TOMIKON : ikoner.tegn(`last-${id}-${n}`, () => {
    const g = new THREE.Group(), def = SPRÆNGSTOF[id];
    for (let i = 0; i < n; i++) {
      const m = modeller[def.model].clone(true);
      m.position.set((i - (n - 1) / 2) * def.str[0] * 1.15, 0, (i % 2) * 0.1);
      g.add(m);
    }
    return g;
  }),
};
const vis = url => url.startsWith('<svg') ? url : billedeHtml(url);

function visDele() {
  $('faner').replaceChildren(...FANER.map(([id, navn]) => {
    const b = knap('fane', fane === id, () => { fane = id; klik(); visDele(); });
    b.removeAttribute('aria-pressed');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(fane === id));
    b.setAttribute('aria-label', navn);
    b.innerHTML = id === 'farve' ? FARVEFANE : vis(id === 'hjul' ? ikon.hjul('monster') : id === 'motor' ? ikon.motor('diesel') : id === 'front' ? ikon.front('kile') : ikon.last('tønde'));
    return b;
  }));
  const liste = [], valgKnap = (indhold, navn, valgt, handling, klasse = 'del') => {
    const b = knap(klasse, valgt, handling);
    b.setAttribute('aria-label', navn);
    b.innerHTML = indhold;
    return b;
  };
  if (fane === 'farve') FARVER.forEach((f, i) => liste.push(valgKnap(farveIkon(f), FARVENAVNE[i], valg.farve === f, () => skift('farve', f))));
  else for (const d of DELE[fane]) liste.push(valgKnap(vis(ikon[fane](d.id)), d.navn, valg[fane] === d.id, () => skift(fane, d.id)));
  if (fane === 'last' && valg.last !== 'tom') {
    const skiller = document.createElement('span');
    skiller.className = 'skiller';
    liste.push(skiller);
    for (const n of [1, 2, 3]) liste.push(valgKnap(vis(ikon.last(valg.last, n)), n === 1 ? 'Én' : `${n} stk.`, valg.antal === n, () => skift('antal', n), 'del lille'));
  }
  $('dele').replaceChildren(...liste);
  requestAnimationFrame(opdaterFri);
}

function skift(type, værdi) {
  if (valg[type] === værdi) return;
  valg = normaliser({ ...valg, [type]: værdi });
  klik();
  gem();
  visDele();
  nyBil();
}

function visBaner() {
  $('baner').replaceChildren(...BANER.map((b, i) => {
    const k = knap('bane', bane === i, () => {
      if (bane === i) return;
      bane = i;
      klik();
      gem();
      visBaner();
      bygBane();
    });
    k.setAttribute('aria-label', `${b.navn}, ${bedste[i]} af 3 stjerner`);
    k.innerHTML = `${banefoto(b.id)}<span class="stj"><b>${'★'.repeat(bedste[i])}</b>${'★'.repeat(3 - bedste[i])}</span>`;
    return k;
  }));
  $('målIkon').innerHTML = banefoto(BANER[bane].id);
  BANER[bane].stjerner.forEach((g, i) => { $(`s${i + 1}`).style.left = `${g}%`; });
}

// Kameraet centrerer billedet i den del af skærmen, som knapperne ikke dækker
let fri = null;
function opdaterFri() {
  const w = innerWidth, h = innerHeight;
  if (tilstand === 'garage') {
    const top = document.querySelector('.top').getBoundingClientRect().bottom;
    if (sideLayout.matches) {
      const v = document.querySelector('.byg').getBoundingClientRect().right, hø = document.querySelector('.baner-panel').getBoundingClientRect().left;
      fri = { x: (v + hø) / 2, y: (top + h) / 2, b: Math.max(160, hø - v), h: h - top };
    } else {
      const dok = $('dok').getBoundingClientRect().top;
      fri = { x: w / 2, y: (top + dok) / 2, b: w, h: Math.max(140, dok - top) };
    }
  } else {
    const top = document.querySelector('.hud-top').getBoundingClientRect().bottom, bund = h - (h < 560 ? 90 : 120);
    fri = { x: w / 2, y: (top + bund) / 2, b: w, h: Math.max(140, bund - top) };
  }
}

// ---------- Skærmene ----------
function visTilstand(ny) {
  tilstand = ny;
  const garage = ny === 'garage';
  $('garage').hidden = !garage;
  $('kørsel').hidden = garage;
  $('kørsel').inert = false;
  $('dialog').hidden = true;
  $('tip').hidden = false;
  dialog = null;
  roTid = 0; tændte = 0; slowmo = 0;
  for (let i = 1; i <= 3; i++) $(`s${i}`).classList.remove('tændt');
  opdaterTal();
  opdaterFri();
  spring = true;
}

function opdaterTal() {
  const p = procent();
  $('fyld').style.width = `${p}%`;
  $('tank').style.strokeDashoffset = String(289 * (1 - (bil?.brændstof ?? 1)));
  $('boost').classList.toggle('tom-tank', (bil?.brændstof ?? 1) <= 0);
  const n = stjerneTal(bane, p);
  while (tændte < n) {
    $(`s${++tændte}`).classList.add('tændt');
    ding(tændte - 1);
  }
  return p;
}

function visDialog(type, n = 0, p = 0) {
  dialog = type;
  slip();
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
  $('dialogTal').textContent = type === 'pause' ? '' : `${p} % væltet`;
  $('fortsæt').setAttribute('aria-label', type === 'pause' ? 'Fortsæt' : 'Næste bane');
  $('igen').setAttribute('aria-label', type === 'pause' ? 'Start forfra' : 'Prøv igen');
  $('fortsæt').focus({ preventScroll: true });
}

function resultat() {
  if (tilstand !== 'kør') return;
  const p = opdaterTal(), n = stjerneTal(bane, p);
  bedste[bane] = Math.max(bedste[bane], n);
  gem();
  tilstand = 'resultat';
  visDialog('resultat', n, p);
}

function pause() {
  if (tilstand === 'pause') {
    tilstand = 'kør';
    $('dialog').hidden = true;
    $('kørsel').inert = false;
    dialog = null;
    lyd.ctx?.resume();
    sidst = performance.now();
  } else if (tilstand === 'kør') {
    tilstand = 'pause';
    lyd.ctx?.suspend();
    visDialog('pause');
  }
}

// ---------- Små lyde ----------
function lydStart() {
  lyd.start();
  motorlyd.start();
}
function klik() { lydStart(); lyd.klik?.(); }
function ding(n) {
  const c = lyd.ctx;
  if (!c || lyd.slået) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime, f = [784, 988, 1175][n] || 1175;
  o.type = 'triangle'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(lyd.komp);
  o.start(t); o.stop(t + 0.62);
}

// ---------- Styringen ----------
function styring() {
  const v = [...fingre.values()];
  const frem = taster.has('ArrowRight') || taster.has('KeyD') || v.includes('gas');
  const bak = taster.has('ArrowLeft') || taster.has('KeyA') || v.includes('bak');
  return { gas: Number(frem) - Number(bak), boost: (taster.has('Space') || v.includes('boost')) && (bil?.brændstof ?? 0) > 0 };
}
function slip() {
  taster.clear();
  fingre.clear();
  for (const id of ['gas', 'bak', 'boost', 'dyt']) $(id).classList.remove('trykket');
}
for (const id of ['gas', 'bak', 'boost', 'dyt']) {
  const b = $(id);
  b.addEventListener('pointerdown', e => {
    if (tilstand !== 'kør') return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    fingre.set(e.pointerId, id);
    b.classList.add('trykket');
    lydStart();
    if (id === 'dyt') lyd.horn();
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
    lydStart();
  }
  if (e.repeat) return;
  if (e.code === 'KeyH' && tilstand === 'kør') { lydStart(); lyd.horn(); }
  if (e.code === 'KeyR' && (tilstand === 'kør' || tilstand === 'resultat')) forfra();
  if (e.code === 'Escape' || e.code === 'KeyP') pause();
  if (e.code === 'Enter' && tilstand === 'garage' && document.activeElement === document.body) start();
});
document.addEventListener('keyup', e => taster.delete(e.code));
addEventListener('blur', () => { slip(); if (tilstand === 'kør') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { slip(); if (tilstand === 'kør') pause(); lyd.ctx?.suspend(); }
  else if (tilstand !== 'pause') lyd.ctx?.resume();
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  efter.størrelse(innerWidth, innerHeight);
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  opdaterFri();
});
$('scene').addEventListener('webglcontextlost', e => {
  e.preventDefault();
  if (tilstand === 'kør') pause();
  status('Grafikken blev afbrudt. Genindlæs siden for at fortsætte.');
});

function start() {
  if (!bil) return;
  lydStart();
  lyd.horn();
  visTilstand('kør');
}
function forfra() {
  lyd.ctx?.resume();
  bygBane();
  visTilstand('kør');
}
function tilVærksted() {
  lyd.ctx?.resume();
  bygBane();
  visBaner();
  visTilstand('garage');
}

$('start').addEventListener('click', start);
$('tilbage').addEventListener('click', () => { klik(); tilVærksted(); });
$('pause').addEventListener('click', pause);
$('igen').addEventListener('click', () => { lydStart(); forfra(); });
$('tilVærksted').addEventListener('click', tilVærksted);
$('fortsæt').addEventListener('click', () => {
  lydStart();
  if (dialog === 'pause') return pause();
  bane = (bane + 1) % BANER.length;
  gem();
  visBaner();
  forfra();
});
for (const id of ['lyd', 'lydP']) $(id).addEventListener('click', () => {
  lydStart();
  lyd.slå(!lyd.slået);
  komfort(); gem();
});
for (const id of ['rolig', 'roligP']) $(id).addEventListener('click', () => { rolig = !rolig; komfort(); gem(); });
function komfort() {
  for (const id of ['lyd', 'lydP']) { $(id).textContent = lyd.slået ? '🔇' : '🔊'; $(id).setAttribute('aria-pressed', String(!lyd.slået)); }
  for (const id of ['rolig', 'roligP']) $(id).setAttribute('aria-pressed', String(rolig));
}

// ---------- Kameraet ----------
// I værkstedet går det langsomt rundt om bilen. Under kørslen følger det bilen fra siden og bagfra,
// viser hele bygningen, når bilen nærmer sig, og kredser om sammenstyrtningen bagefter.
const fokus = new THREE.Vector3(START + 2, 1.5, 0), fokusMål = new THREE.Vector3();
let afstand = 12, afstandMål = 12, sving = -0.6, svingMål = -0.6, højde = 0.28, spring = true;
let fastKamera = null;
function kameraFor(dt) {
  if (fastKamera) {
    kamera.position.set(...fastKamera.fra); kamera.lookAt(...fastKamera.mod); kamera.clearViewOffset();
    return;
  }
  const p = bil.sted, mid = mål.getCenter(new THREE.Vector3()), st = mål.getSize(new THREE.Vector3());
  const størrelse = Math.max(st.x, st.y * 1.2, 6);
  if (tilstand === 'garage') {
    // Bilen (ca. 7,5 × 4,5 m) skal fylde det frie stykke over knapperne
    const w = innerWidth, h = innerHeight, f = fri || { b: w, h }, tan = Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2));
    fokusMål.set(p.x + 0.4, 1.4, 0);
    afstandMål = 1.3 * Math.max(7.5 / (2 * tan * kamera.aspect * (f.b / w)), 4.5 / (2 * tan * (f.h / h)));
    svingMål = 0.55 + Math.sin(performance.now() / 4000) * 0.6;
    højde = 0.2;
  } else if (!bil.bump) {
    const nær = Math.max(0, Math.min(1, (p.x - (mål.min.x - 26)) / 18));
    fokusMål.set(p.x + 4 + (mid.x - p.x - 4) * nær * 0.55, 1.4 + st.y * 0.3 * nær, mid.z * nær * 0.5);
    afstandMål = 13 + (størrelse * 1.15 - 13) * nær;
    svingMål = -0.75 + nær * 0.35;
    højde = 0.24;
  } else {
    const siden = spilTid - bil.bump.tid;
    fokusMål.set(mid.x - 1, Math.max(2, st.y * 0.32), mid.z * 0.5);
    afstandMål = Math.max(16, størrelse * 1.25);
    svingMål = -0.4 + Math.min(0.9, siden * 0.06);
    højde = 0.26;
  }
  if (kamera.aspect < 1 && tilstand !== 'garage') afstandMål *= 1.45;
  // Efter et skift springer kameraet direkte på plads; ellers glider det blødt
  const k = spring ? 1 : 1 - Math.exp(-dt * (tilstand === 'garage' ? 2.5 : 2.2));
  spring = false;
  fokus.lerp(fokusMål, k);
  afstand += (afstandMål - afstand) * k;
  sving += (svingMål - sving) * k;
  const ryst = rolig ? 0 : Math.min(1.2, effekter.ryst) * 0.35;
  kamera.position.set(
    fokus.x + Math.sin(sving) * Math.cos(højde) * afstand + (Math.random() - 0.5) * ryst,
    fokus.y + Math.sin(højde) * afstand + (Math.random() - 0.5) * ryst,
    fokus.z + Math.cos(sving) * Math.cos(højde) * afstand);
  kamera.lookAt(fokus);
  const w = innerWidth, h = innerHeight, f = fri || { x: w / 2, y: h / 2 };
  kamera.setViewOffset(w, h, w / 2 - f.x, h / 2 - f.y, w, h);
}

// ---------- Hovedløkken ----------
function billede(t) {
  requestAnimationFrame(billede);
  const dt = Math.min(0.05, (t - (sidst || t)) / 1000);
  sidst = t;
  if (document.hidden || tilstand === 'pause') return;
  slowmo = Math.max(0, slowmo - dt);
  const dtS = dt * (slowmo > 0 ? 0.3 : 1);
  const { gas, boost } = styring();
  if (tilstand === 'kør' || tilstand === 'resultat') {
    spilTid += dtS;
    if (gas) $('tip').hidden = true;
    fysikTrin(dtS, vedStød, efterTrin);
    dele.synk(); dele.ryd();
    sprængstof.opdater(dtS);
    sprængstof.varme(effekter.ilde, dtS);
    ruder.opdater(dtS);
    if (tilstand === 'kør') {
      opdaterTal();
      afgør(dt);
    }
  } else dele.synk();
  effekter.opdater(dtS, kamera);
  bil.synk(dt, boost && tilstand === 'kør');
  kameraFor(dt);
  const e = kamera.matrixWorld.elements;
  lyd.sætLytter(kamera.position, { x: e[0], y: e[1], z: e[2] });
  motorlyd.kør(bil.fart, tilstand === 'kør' ? gas : 0, boost, tilstand === 'kør');
  if (lyd.ctx) {
    let nær = null, a = 1e9;
    for (const f of effekter.ilde) { const x = f.p.distanceTo(kamera.position); if (x < a) { a = x; nær = f; } }
    lyd.løkke('ild', nær ? Math.min(1, 0.25 + effekter.ilde.length * 0.1) : 0, nær ? nær.p : null);
  }
  verden.følg(fokus);
  efter.blink = rolig ? 0 : Math.max(0, effekter.ryst - 1) * 0.5;
  efter.tegn(scene, kamera, t / 1000);
}

// Resultatet kommer, når alt er faldet til ro — som i Nedrivningsfirmaet
function afgør(dt) {
  const p = bil.sted;
  if (!bil.bump) {
    if (bil.kørt && (p.x > mål.max.x + 25 || p.y < -15)) resultat();
    return;
  }
  tjekTid -= dt;
  if (tjekTid > 0) return;
  tjekTid = 0.25;
  let bevæger = 0;
  for (const d of dele.levende) {
    const k = d.klynge ? d.klynge.krop : d.krop;
    if (k && !k.isSleeping() && !k.isFixed()) { const v = k.linvel(); if (v.x * v.x + v.y * v.y + v.z * v.z > 0.6) bevæger++; }
    if (bevæger > 4) break;
  }
  const stille = !sprængstof.aktiv() && bevæger <= 4 && performance.now() - sprængstof.sidsteBrag > 1500;
  roTid = stille ? roTid + 0.25 : 0;
  if (roTid >= 1.75 || spilTid - bil.bump.tid > 22) resultat();
}

// ---------- Start ----------
bygBane();
visDele();
visBaner();
komfort();
visTilstand('garage');
status('');
$('start').disabled = false;
requestAnimationFrame(billede);

// Til prøverne: ?prøve giver adgang til spillets tilstand
if (new URLSearchParams(location.search).has('prøve')) {
  window.sb = {
    get tilstand() { return tilstand; }, get procent() { return procent(); }, get bil() { return bil; }, get mål() { return mål; },
    BANER, bane: () => bane, dele, sprængstof, kamera,
    kig: (fra, mod) => { fastKamera = fra ? { fra, mod } : null; },
  };
}
