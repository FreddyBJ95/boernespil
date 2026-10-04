import test from 'node:test';
import assert from 'node:assert/strict';
import { opretFundkort, fundTaske } from './fundkort.js';

// Den faktiske kortmanager prøves med en lille læsbar DOM, uden spilstart, lager eller adgangskode.
function prøveflade() {
  const klasser = () => {
    const s = new Set();
    return { add: v => s.add(v), remove: v => s.delete(v), contains: v => s.has(v), toggle(v, t) {
      if (t ?? !s.has(v)) s.add(v);
      else s.delete(v);
    } };
  };
  const kort = [], oplæsninger = [], hud = { classList: klasser() }, måler = { style: {} };
  const status = { set textContent(v) { oplæsninger.push(v); } };
  let html = '';
  const element = {
    classList: klasser(), dataset: {}, parentElement: { querySelector: () => status },
    closest: () => hud,
    querySelector: () => måler,
    set innerHTML(v) { html = v; if (v) kort.push(v); },
    get innerHTML() { return html; },
  };
  const visning = opretFundkort(element);
  const tick = n => { for (let i = 0; i < n * 4; i++) visning.opdatér(.25); };
  return { visning, element, kort, oplæsninger, hud, måler, tick };
}
const krystal = () => ({ type: 'krystal', titel: 'Lyskrystal fundet', genstande: [
  { type: 'krystal', navn: 'Lyskrystal', antal: 1 }, { type: 'kobber', navn: 'Kobber', antal: 3 },
] });
const kiste = () => ({ type: 'kiste', titel: 'Skattekisten er åben', genstande: [
  { type: 'kobber', navn: 'Kobber', antal: 18 }, { type: 'eliksir', navn: 'Eliksir', antal: 1 },
] });

test('hurtige krystalfund erstatter aldrig en ulæst kiste, og alle gevinster bevares', () => {
  const p = prøveflade(), fund = kiste();
  p.visning.vis(fund);
  for (let i = 0; i < 25; i++) p.visning.vis(krystal());
  assert.match(p.element.innerHTML, /Skattekisten er åben/);
  assert.equal(p.oplæsninger.length, 1);
  assert.deepEqual(fund, kiste());
  p.tick(5);
  assert.match(p.element.innerHTML, /Skattekisten er åben/);
  p.tick(1);
  assert.match(p.element.innerHTML, /25 lyskrystaller fundet/);
  assert.match(p.element.innerHTML, /\+25<\/b> Lyskrystal/);
  assert.match(p.element.innerHTML, /\+75<\/b> Kobber/);
  p.tick(4);
  assert.equal(p.element.innerHTML, '');
  assert.equal(p.hud.classList.contains('har-fund'), false);
  assert.equal(p.kort.length, 2);
});

test('hundrede kister bruger højst otte ventende kort, uden at tabe antal', () => {
  const p = prøveflade();
  for (let i = 0; i < 100; i++) p.visning.vis(kiste());
  p.tick(60);
  assert.equal(p.kort.length, 9);
  const kobber = p.kort.flatMap(h => [...h.matchAll(/\+(\d+)<\/b> Kobber/g)]).reduce((sum, m) => sum + Number(m[1]), 0);
  const eliksirer = p.kort.flatMap(h => [...h.matchAll(/\+(\d+)<\/b> Eliksir/g)]).reduce((sum, m) => sum + Number(m[1]), 0);
  assert.equal(kobber, 1800);
  assert.equal(eliksirer, 100);
  assert.equal(p.oplæsninger.length, 9);
});

test('fuld kø bevarer navnene på særlige segl og næste korts seks læsesekunder', () => {
  const p = prøveflade();
  for (let i = 0; i < 9; i++) p.visning.vis(kiste());
  p.visning.vis({ type: 'segl', titel: 'Segl fundet', genstande: [
    { type: 'segl', navn: 'Kobberdybets segl', antal: 1 }, { type: 'kobber', navn: 'Kobber', antal: 30 },
  ], note: 'Vogteren hviler nu.' });
  p.tick(48);
  assert.match(p.element.innerHTML, /Kobberdybets segl/);
  assert.match(p.element.innerHTML, /\+48<\/b> Kobber/);
  assert.match(p.element.innerHTML, /Vogteren hviler nu/);
  p.tick(5);
  assert.match(p.element.innerHTML, /Kobberdybets segl/);
  p.tick(1);
  assert.equal(p.element.innerHTML, '');
});

test('pause og rolige valg ændrer ingen oplæsninger eller fundtid', () => {
  const p = prøveflade();
  p.visning.vis(krystal());
  for (let i = 0; i < 800; i++) p.visning.opdatér(0, { rolig: true });
  p.visning.opdatér(NaN);
  p.visning.opdatér(-100);
  p.visning.opdatér(0, { rolig: true });
  assert.equal(p.element.classList.contains('fund-rolig'), true);
  assert.equal(p.kort.length, 1);
  assert.equal(p.oplæsninger.length, 1);
  p.tick(3);
  assert.match(p.element.innerHTML, /Lyskrystal fundet/);
  assert.equal(p.oplæsninger.length, 1);
  assert.equal(p.kort.length, 1);
  p.tick(1);
  assert.equal(p.element.innerHTML, '');
});

test('decimale energigevinster er danske, og descriptor-tekst kan ikke blive HTML', () => {
  const p = prøveflade();
  p.visning.vis({ type: 'krystal', titel: '<img onerror="fejl">', note: '<script>fejl()</script>', genstande: [
    { type: 'energi', navn: 'Energi', antal: 13.7853 }, { type: 'kobber', navn: '<b>Kobber</b>', antal: 3 },
    { type: 'eliksir', navn: 'Eliksir', antal: 0 },
  ] });
  assert.match(p.element.innerHTML, /\+13,8<\/b> Energi/);
  assert.match(p.element.innerHTML, /&lt;img onerror=&quot;fejl&quot;&gt;/);
  assert.equal(p.element.innerHTML.includes('<script>'), false);
  assert.equal(p.element.innerHTML.includes('+0'), false);
  assert.match(p.oplæsninger[0], /13,8 Energi/);
});

test('verdensskift tømmer præsentationen, og ingen manglende flade kan standse spillet', () => {
  const p = prøveflade();
  p.visning.vis(krystal());
  p.visning.vis(kiste());
  p.visning.skjul();
  p.tick(30);
  assert.equal(p.element.innerHTML, '');
  assert.equal(p.element.classList.contains('skjult'), true);
  p.visning.vis(kiste());
  assert.match(p.element.innerHTML, /Skattekisten er åben/);
  assert.equal(p.kort.length, 2);
  const ingen = opretFundkort(null);
  assert.doesNotThrow(() => { ingen.vis(kiste()); ingen.opdatér(.1); ingen.skjul(); });
});

test('tasken viser faktisk beholdning og højst otte opgavekrystaller, aldrig permanent inventory', () => {
  const s = { mønter: 147, eliksirer: 2, hentet: ['krystal0', 'krystal1'], opgaver: { krystal: 19, boss0: 1, boss1: 0, boss2: 1 } };
  const html = fundTaske(s);
  assert.match(html, /Kobber<\/span><b>147<\/b>/);
  assert.match(html, /Eliksirer<\/span><b>2<\/b>/);
  assert.match(html, /Gamle segl<\/span><b>2 \/ 3<\/b>/);
  assert.match(html, /Lyskrystaller: <b>8 \/ 8<\/b> til opgaven/);
  assert.equal(s.opgaver.krystal, 19);
  assert.match(fundTaske(), /Lyskrystaller: <b>0 \/ 8<\/b> til opgaven/);
});
