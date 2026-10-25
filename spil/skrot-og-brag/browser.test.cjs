// Kør med NODE_PATH til en installeret Playwright. Prøven starter selv en lille server og lukker den igen.
// Spillet bruger Nedrivningsfirmaets fysik og grafik, så prøverne kører i en rigtig browser med WebGL.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const ROD = path.resolve(__dirname, '../..');
const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.json': 'application/json', '.glb': 'model/gltf-binary' };
let server, ADRESSE;

before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      let sti = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (sti.endsWith('/')) sti += 'index.html';
      const fil = path.resolve(ROD, `.${sti}`);
      if (!fil.startsWith(ROD + path.sep)) throw new Error('Uden for projektet');
      const indhold = await fs.readFile(fil);
      res.writeHead(200, { 'Content-Type': TYPER[path.extname(fil)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(indhold);
    } catch { res.writeHead(404); res.end('Ikke fundet'); }
  });
  await new Promise(klar => server.listen(0, '127.0.0.1', klar));
  ADRESSE = `http://127.0.0.1:${server.address().port}/spil/skrot-og-brag/?prøve`;
});
after(() => server.close());

const start = () => chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const klar = page => page.waitForFunction(() => !document.getElementById('start').disabled, null, { timeout: 60000 });
const kør = page => page.getByRole('button', { name: 'Kør', exact: true }).click({ force: true });
const fejlListe = page => {
  const fejl = [];
  page.on('pageerror', e => fejl.push(e.message));
  page.on('console', m => { if (m.type() === 'error') fejl.push(m.text()); });
  return fejl;
};

test('browser: værksted, lyd, kørsel, pause, forfra og gemning', async () => {
  const browser = await start();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const fejl = fejlListe(page), lydfiler = [];
    page.on('response', r => { if (r.url().endsWith('.mp3')) lydfiler.push(r.status()); });
    await page.goto(ADRESSE);
    await klar(page);
    await page.getByRole('tab', { name: 'Last', exact: true }).click();
    await page.getByRole('button', { name: 'Gasflasker', exact: true }).click();
    await page.getByRole('tab', { name: 'Front', exact: true }).click();
    await page.getByRole('button', { name: 'Sneplov', exact: true }).click();
    await page.getByRole('button', { name: /^Murstenshuset/ }).click();
    await kør(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => sb.bil.bump && sb.procent > 0, null, { timeout: 20000 });
    await page.keyboard.up('ArrowRight');
    assert.equal(await page.evaluate(() => sb.bil.last.length), 0, 'lasten flyver af ladet ved sammenstødet');
    await page.waitForTimeout(1500);
    assert.ok(lydfiler.length >= 20, `optagede lyde hentet: ${lydfiler.length}`);
    assert.ok(lydfiler.every(s => s === 200));
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('heading', { name: 'Pause', exact: true }).waitFor();
    const før = await page.evaluate(() => sb.bil.sted.y);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => sb.bil.sted.y), før, 'fysikken står stille under pausen');
    await page.getByRole('button', { name: 'Fortsæt', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Start forfra', exact: true }).click();
    await page.waitForFunction(() => sb.procent === 0 && !sb.bil.bump);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.getByRole('heading', { name: 'Pause', exact: true }).waitFor();
    assert.equal(await page.locator('#kørsel').evaluate(e => e.inert), true, 'knapperne bag pausen kan ikke nås');
    await page.getByRole('dialog').getByRole('button', { name: 'Til værkstedet', exact: true }).click();
    await page.reload();
    await klar(page);
    await page.getByRole('tab', { name: 'Last', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Gasflasker', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('tab', { name: 'Front', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Sneplov', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: /^Murstenshuset/ }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});

test('browser: alle seks bygninger vælter, når standardbilen kører ind i dem', async () => {
  const browser = await start();
  try {
    for (let bane = 0; bane < 6; bane++) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
      const fejl = fejlListe(page);
      await page.addInitScript(nr => localStorage.setItem('skrot-og-brag-v3', JSON.stringify({ bane: nr })), bane);
      await page.goto(ADRESSE);
      await klar(page);
      await kør(page);
      await page.keyboard.down('ArrowRight');
      await page.waitForFunction(() => sb.tilstand === 'resultat', null, { timeout: 45000 });
      const { procent, første, navn } = await page.evaluate(() => ({ procent: sb.procent, første: sb.BANER[sb.bane()].stjerner[0], navn: sb.BANER[sb.bane()].navn }));
      assert.ok(procent >= første, `${navn}: ${procent} %`);
      assert.ok(await page.locator('.stjerner span.tændt').count() >= 1);
      assert.deepEqual(fejl, [], navn);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('browser: næste bane efter resultatet', async () => {
  const browser = await start();
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
    const fejl = fejlListe(page);
    await page.goto(ADRESSE);
    await klar(page);
    await kør(page);
    await page.keyboard.down('ArrowRight');
    await page.getByRole('dialog').waitFor({ timeout: 45000 });
    await page.keyboard.up('ArrowRight');
    await page.getByRole('button', { name: 'Næste bane', exact: true }).click();
    await page.waitForFunction(() => sb.bane() === 1 && sb.tilstand === 'kør' && sb.procent === 0);
    assert.equal(await page.locator('#kørsel').isVisible(), true);
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});

test('touch: to pedaler samtidigt, ingen hængende gas og telefonlayout', async () => {
  const browser = await start();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage(), fejl = fejlListe(page);
    await page.goto(ADRESSE);
    await klar(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await kør(page);
    const cdp = await context.newCDPSession(page);
    const gas = await page.locator('#gas').boundingBox(), boost = await page.locator('#boost').boundingBox();
    assert.ok(gas.x + gas.width <= 390);
    assert.ok(boost.x > 0);
    const punkt = (b, id) => ({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [punkt(gas, 0), punkt(boost, 1)] });
    await page.waitForTimeout(900);
    assert.ok(parseFloat(await page.locator('#tank').evaluate(e => e.style.strokeDashoffset)) > 0, 'turboen bruger brændstof');
    assert.ok(await page.evaluate(() => sb.bil.fart > 2), 'bilen kører');
    assert.equal(await page.locator('#tip').isHidden(), true);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.locator('.pedal.trykket').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Start forfra', exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#tank').evaluate(e => e.style.strokeDashoffset), '0');
    await page.getByRole('button', { name: 'Til værkstedet', exact: true }).click();
    await klar(page);
    await page.getByRole('tab', { name: 'Last', exact: true }).click();
    await page.getByRole('button', { name: 'TNT-kasser', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'TNT-kasser', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});
