import test from 'node:test';
import assert from 'node:assert/strict';
import { nyRejse } from './eventyr.js';
import { nyeØveskiver, ramØveskive } from './øveplads.js';

test('øverunder har tre selvstændige skiver ved landsbyen med ét bestemt våben hver', () => {
  const a = nyeØveskiver(), b = nyeØveskiver();
  assert.equal(new Set(a.map(k => k.id)).size, 3);
  assert.deepEqual(a.map(k => k.våben), ['sværd', 'bue', 'magi']);
  assert.deepEqual(a.map(k => [k.x, k.z]), [[-3,12], [0,13], [3,12]]);
  assert.ok(a.every(k => k.ramt === false && Math.hypot(k.x, k.z) < 17));
  a[0].ramt = true;
  assert.equal(b[0].ramt, false, 'nye runder deler ingen mutable skiver');
});

test('forkert våben og gentagne træffere ændrer hverken skiver, fremgang eller belønning', () => {
  const s = nyRejse(9), skiver = nyeØveskiver();
  for (const skive of skiver) {
    for (const våben of ['sværd', 'bue', 'magi'].filter(v => v !== skive.våben)) {
      const før = JSON.stringify(s), resultat = ramØveskive(s, skive, våben, skiver);
      assert.equal(resultat.ramt, false);
      assert.equal(resultat.belønning, false);
      assert.equal(resultat.fuldført, false);
      assert.equal(skive.ramt, false);
      assert.equal(JSON.stringify(s), før);
      assert.match(resultat.tip, /Sværd|Bue|Magi/, 'rådet fortæller præcist hvilket våben der skal vælges');
    }
  }
  assert.equal(ramØveskive(s, skiver[0], 'sværd', skiver).ramt, true);
  assert.equal(ramØveskive(s, skiver[0], 'sværd', skiver).ramt, false);
  assert.equal(s.xp, 0);
  assert.equal(s.mønter, 0);
});

test('alle seks våbenrækkefølger giver første fuldførelse præcis én lille belønning', () => {
  for (const rækkefølge of [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]]) {
    const s = nyRejse(9), skiver = nyeØveskiver();
    s.xp = 200; s.mønter = 80;
    for (const [i, nr] of rækkefølge.entries()) {
      const resultat = ramØveskive(s, skiver[nr], skiver[nr].våben, skiver);
      assert.equal(resultat.ramt, true);
      assert.equal(resultat.fuldført, i === 2);
      assert.equal(resultat.belønning, i === 2);
      assert.equal(s.xp, i === 2 ? 215 : 200);
      assert.equal(s.mønter, i === 2 ? 105 : 80);
    }
    assert.equal(s.træning, true);
    assert.deepEqual(s.opgaver, {}, 'øvelsen tager ikke en af kampagnens otte opgaver');
    for (const skive of skiver) assert.equal(ramØveskive(s, skive, skive.våben, skiver).belønning, false);
    assert.equal(s.xp, 215); assert.equal(s.mønter, 105);
  }
});

test('genåbnet eller fortsat øveplads kan vises fuldført igen uden at farme belønningen', () => {
  const s = nyRejse(9), første = nyeØveskiver();
  for (const skive of første) ramØveskive(s, skive, skive.våben, første);
  const fortsæt = JSON.parse(JSON.stringify(s)), næste = nyeØveskiver();
  for (const [i, skive] of næste.entries()) {
    const resultat = ramØveskive(fortsæt, skive, skive.våben, næste);
    assert.equal(resultat.ramt, true);
    assert.equal(resultat.fuldført, i === 2);
    assert.equal(resultat.belønning, false);
  }
  assert.equal(fortsæt.xp, 15);
  assert.equal(fortsæt.mønter, 25);
  assert.equal(fortsæt.træning, true);
});

test('to skiver eller en fremmed ramning kan ikke fuldføre øvelsen', () => {
  const s = nyRejse(9), skiver = nyeØveskiver();
  const fremmed = { ...skiver[2], id: 'ikke-en-øveskive' };
  assert.equal(ramØveskive(s, fremmed, 'magi', skiver).ramt, false);
  const toSkiver = skiver.slice(0, 2);
  for (const skive of toSkiver) assert.equal(ramØveskive(s, skive, skive.våben, toSkiver).fuldført, false);
  assert.equal(s.xp, 0); assert.equal(s.mønter, 0);
  assert.equal(s.træning === true, false);
});
