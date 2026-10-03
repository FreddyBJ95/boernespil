import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Den faktiske loopfunktion bruger her kun stubs, så ingen adgang eller spilverden åbnes.
test('Start/pause tegner højst 20 Hz, skjult intet, og genoptagelse får frisk tid', () => {
  const kilde = readFileSync(new URL('./spil.js', import.meta.url), 'utf8');
  const blok = kilde.slice(kilde.indexOf('function loop(nu)'), kilde.indexOf('// Touch bruger én finger'));
  const køretider = [], kameratider = [], tegninger = [], dokument = { hidden: false };
  const opret = new Function('document', 'requestAnimationFrame', 'opdatér', 'kameraTrin', 'renderer', `
    let kører = false, paused = true, sidst = 0, sidsteTegning = 0;
    const scene = {}, kamera = {};
    ${blok}
    return { loop, sæt: (k, p) => { kører = k; paused = p; }, tid: () => sidst };
  `);
  const prøve = opret(dokument, () => {}, dt => køretider.push(dt), dt => kameratider.push(dt), { render: () => tegninger.push(1) });
  let nu = 0;
  for (const [kører, paused] of [[false, true], [true, true]]) {
    prøve.sæt(kører, paused); const før = tegninger.length;
    for (let i = 0; i < 60; i++) { nu += 1000 / 60; prøve.loop(nu); }
    assert.ok(tegninger.length - før <= 20 && tegninger.length - før >= 10);
  }
  dokument.hidden = true; const førSkjult = tegninger.length;
  for (let i = 0; i < 180; i++) { nu += 1000 / 60; prøve.loop(nu); }
  assert.equal(tegninger.length, førSkjult);
  assert.equal(prøve.tid(), nu);
  dokument.hidden = false; prøve.sæt(true, false); nu += 1000 / 60; prøve.loop(nu);
  assert.ok(Math.abs(køretider.at(-1) - 1 / 60) < 1e-8);
  assert.equal(tegninger.length, førSkjult + 1);
  assert.ok(kameratider.at(-1) <= .1);
  for (let i = 0; i < 60; i++) { nu += 1000 / 60; prøve.loop(nu); }
  assert.equal(tegninger.length, førSkjult + 61);
});
