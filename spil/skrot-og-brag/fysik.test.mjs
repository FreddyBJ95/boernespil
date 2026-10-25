import test from 'node:test';
import assert from 'node:assert/strict';
import { opretFysik } from './fysik.mjs';
import { STANDARD, normaliser, BANER } from './data.mjs';

function kør(s, antal, input = {}) {
  const hændelser = [];
  for (let i = 0; i < antal; i++) {
    s.trin(input);
    hændelser.push(...s.hentHændelser());
  }
  return hændelser;
}

test('alle højhuse og last forbliver hele, indtil noget rammer dem', async () => {
  for (let bane = 0; bane < BANER.length; bane++) {
    const s = await opretFysik(STANDARD, bane);
    try {
      const hændelser = kør(s, 600);
      assert.equal(s.status().procent, 0, `bane ${bane}`);
      assert.equal(s.kæde, 0);
      assert.equal(s.baand.filter(b => b.brudt).length, 0);
      assert.equal(hændelser.filter(e => e.type === 'lunte').length, 0);
      assert.ok(Math.abs(s.chassis.krop.translation().x - 3) < .05);
    } finally { s.luk(); }
  }
});

test('en faktisk køretur starter en forsinket kæde og vælter etager', async () => {
  const s = await opretFysik(STANDARD);
  try {
    kør(s, 90);
    const hændelser = kør(s, 900, { gas: 1 });
    const brag = hændelser.filter(e => e.type === 'brag');
    assert.ok(brag.length >= 4);
    assert.ok(brag.some(e => e.dybde > 1));
    assert.ok(s.status().procent >= BANER[0].mål);
    assert.ok(s.baand.some(b => b.brudt && !b.bil));
    assert.equal(new Set(brag.map(e => `${e.p.x}/${e.p.y}`)).size, brag.length);
  } finally { s.luk(); }
});

test('dominoer overfører bevægelse til naboer uden at bilen kører', async () => {
  const s = await opretFysik({ ...STANDARD, last: 'tom' });
  try {
    kør(s, 120);
    const dominoer = s.dele.filter(d => d.type === 'domino');
    dominoer[0].krop.applyImpulseAtPoint({ x: 6, y: 0, z: 0 }, { x: 23, y: 3.8, z: 0 }, true);
    kør(s, 360);
    assert.ok(dominoer.slice(1, 5).filter(d => Math.abs(d.krop.rotation().z) > .3).length >= 3);
    assert.ok(Math.abs(s.chassis.krop.translation().x - 3) < .1);
  } finally { s.luk(); }
});

test('en fjern celle reagerer ikke på en puls uden for dens rækkevidde', async () => {
  const s = await opretFysik(STANDARD);
  try {
    kør(s, 120);
    const celler = s.dele.filter(d => d.type === 'celle' && !d.last);
    const c = celler[0];
    const fjern = s.celle(90, 1, 'gas');
    c.krop.applyImpulse({ x: 0, y: 0, z: 0 }, true);
    s.antænd(c, 1, .1);
    kør(s, 12);
    assert.ok(c.sprængt);
    assert.equal(fjern.aktivering, null);
    assert.equal(fjern.sprængt, false);
  } finally { s.luk(); }
});

test('lilla hvirvel giver et fysisk efterslag, og hver celle sprænger kun én gang', async () => {
  const s = await opretFysik({ ...STANDARD, last: 'lilla', antal: 1 });
  try {
    kør(s, 120);
    s.antænd(s.last[0], 1, .01);
    const hændelser = kør(s, 65);
    assert.ok(hændelser.some(e => e.type === 'hvirvel'));
    assert.ok(hændelser.some(e => e.type === 'efterslag'));
    const før = s.kæde;
    s.antænd(s.last[0]);
    kør(s, 30);
    assert.equal(s.kæde, før);
  } finally { s.luk(); }
});

test('hjul, last og motorvalg ændrer fysikken, og ugyldige gemninger normaliseres', async () => {
  assert.deepEqual(normaliser({ hjul: 'ukendt', antal: 200, farve: 'red' }), STANDARD);
  assert.deepEqual(normaliser(null), STANDARD);
  for (const hjul of ['vej', 'monster', 'hop']) {
    const s = await opretFysik({ ...STANDARD, hjul, last: 'tom' });
    try {
      kør(s, 120);
      assert.equal(s.last.length, 0);
      assert.ok(Math.abs(s.chassis.krop.translation().y - (s.hjul[0].radius + .92)) < .05);
      kør(s, 50, { gas: 1, boost: true });
      assert.ok(s.brændstof < 1 && s.brændstof >= 0);
      assert.ok(s.chassis.krop.translation().x > 4);
    } finally { s.luk(); }
  }
});
