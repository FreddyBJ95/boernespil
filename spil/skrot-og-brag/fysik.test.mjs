import test from 'node:test';
import assert from 'node:assert/strict';
import { opretFysik } from './fysik.mjs';
import { STANDARD, DELE, normaliser, BANER, stjerner } from './data.mjs';

function kør(s, antal, input = {}) {
  const hændelser = [];
  for (let i = 0; i < antal; i++) {
    s.trin(input);
    hændelser.push(...s.hentHændelser());
  }
  return hændelser;
}

test('alle huse, klodser og last forbliver hele, indtil noget rammer dem', async () => {
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

test('en køretur ind i huset starter en kæde og vælter huset', async () => {
  const s = await opretFysik(STANDARD);
  try {
    kør(s, 90);
    const hændelser = kør(s, 900, { gas: 1 });
    const brag = hændelser.filter(e => e.type === 'brag');
    assert.ok(hændelser.some(e => e.type === 'bump'));
    assert.ok(brag.length >= 2);
    assert.ok(stjerner(0, s.status().procent) >= 1);
    assert.ok(s.baand.some(b => b.brudt && !b.bil));
    assert.equal(new Set(brag.map(e => `${e.p.x}/${e.p.y}`)).size, brag.length);
  } finally { s.luk(); }
});

test('en bil uden last kan selv skubbe klodsbjerget ned', async () => {
  const s = await opretFysik({ ...STANDARD, last: 'tom' }, 1);
  try {
    kør(s, 90);
    kør(s, 600, { gas: 1 });
    assert.equal(s.kæde, 1, 'kun tønden på toppen springer');
    assert.ok(s.status().procent >= BANER[1].stjerner[0]);
  } finally { s.luk(); }
});

test('alle bilkombinationer kører roligt frem til målet, også over rampen', async () => {
  for (const hjul of DELE.hjul) for (const front of DELE.front) for (const boost of [false, true]) {
    const s = await opretFysik({ ...STANDARD, hjul: hjul.id, front: front.id, motor: 'raket', last: 'tom' }, 4);
    try {
      kør(s, 90);
      let lodret = 0;
      for (let i = 0; i < 240; i++) {
        s.trin({ gas: 1, boost });
        const p = s.chassis.krop.translation(), v = s.chassis.krop.linvel();
        if (p.x + 4.5 > s.mål.fra - .5 || s.hentHændelser().some(e => e.type === 'bump')) break;
        lodret = Math.max(lodret, Math.abs(v.y));
      }
      assert.ok(lodret < 14, `${hjul.id}/${front.id}${boost ? '/boost' : ''}: ${lodret}`);
    } finally { s.luk(); }
  }
});

test('en fjern celle reagerer ikke på en puls uden for dens rækkevidde', async () => {
  const s = await opretFysik(STANDARD, 2);
  try {
    kør(s, 120);
    const celler = s.dele.filter(d => d.type === 'celle' && !d.last);
    const c = celler[0];
    const fjern = s.celle(90, 1, 'gas');
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
  assert.deepEqual(normaliser({ hjul: 'ukendt', antal: 200, farve: 'red', fører: 'drage' }), STANDARD);
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

test('stjernerne følger banens grænser', () => {
  assert.equal(stjerner(0, 0), 0);
  assert.equal(stjerner(0, BANER[0].stjerner[0]), 1);
  assert.equal(stjerner(0, 100), 3);
});
