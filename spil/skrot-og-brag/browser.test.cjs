// Kør med NODE_PATH til en installeret Playwright. Prøven starter selv en lille server og lukker den igen.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const ROD = path.resolve(__dirname, '../..');
const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
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
  ADRESSE = `http://127.0.0.1:${server.address().port}/spil/skrot-og-brag/`;
});
after(() => server.close());

const start = () => chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const kør = page => page.getByRole('button', { name: 'Kør', exact: true }).click({ force: true });

test('browser: værksted, lyd, kørsel, pause, nulstilling og gemning', async () => {
  const browser = await start();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const fejl = [], lydfiler = [];
    page.on('pageerror', e => fejl.push(e.message));
    page.on('console', m => { if (m.type() === 'error') fejl.push(m.text()); });
    page.on('response', r => { if (r.url().endsWith('.mp3')) lydfiler.push(r.status()); });
    await page.addInitScript(() => {
      const Oprindelig = window.AudioContext;
      window.__lyd = [];
      window.AudioContext = class extends Oprindelig {
        constructor(...args) { super(...args); window.__lyd.push(this); }
      };
    });
    await page.goto(ADRESSE);
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    await page.getByRole('tab', { name: 'Last', exact: true }).click();
    await page.getByRole('button', { name: 'Lilla hvirvel', exact: true }).click();
    await page.getByRole('tab', { name: 'Front', exact: true }).click();
    await page.getByRole('button', { name: 'Skovl', exact: true }).click();
    await page.getByRole('button', { name: /^Slottet/ }).click();
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    await kør(page);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => parseFloat(document.getElementById('fyld').style.width) >= 25, null, { timeout: 15000 });
    await page.keyboard.up('ArrowRight');
    assert.ok(await page.locator('#s1.tændt').count() === 1, 'første stjerne tændes');
    assert.equal(await page.evaluate(() => window.__lyd[0]?.state), 'running');
    await page.waitForTimeout(500);
    assert.ok(lydfiler.length >= 8);
    assert.ok(lydfiler.every(s => s === 200));
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('heading', { name: 'Pause', exact: true }).waitFor();
    const før = await page.locator('#fyld').getAttribute('style');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#fyld').getAttribute('style'), før);
    assert.equal(await page.evaluate(() => window.__lyd[0].state), 'suspended');
    await page.getByRole('button', { name: 'Fortsæt', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Start forfra', exact: true }).click();
    await page.waitForFunction(() => document.getElementById('fyld').style.width === '0%');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.getByRole('heading', { name: 'Pause', exact: true }).waitFor();
    assert.equal(await page.locator('#kørsel').evaluate(e => e.inert), true, 'knapperne bag pausen kan ikke nås');
    await page.getByRole('dialog').getByRole('button', { name: 'Til værkstedet', exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    await page.getByRole('tab', { name: 'Last', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Lilla hvirvel', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('tab', { name: 'Front', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Skovl', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('button', { name: /^Slottet/ }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});

test('browser: en hel tur ind i huset ender med stjerner', async () => {
  const browser = await start();
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
    const fejl = [];
    page.on('pageerror', e => fejl.push(e.message));
    await page.goto(ADRESSE);
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    await kør(page);
    await page.keyboard.down('ArrowRight');
    await page.locator('.boble').first().waitFor({ timeout: 10000 });
    await page.getByRole('dialog').waitFor({ timeout: 30000 });
    await page.keyboard.up('ArrowRight');
    assert.ok(await page.locator('.stjerner span.tændt').count() >= 1);
    await page.getByRole('button', { name: 'Næste bane', exact: true }).click();
    await page.waitForFunction(() => document.getElementById('fyld').style.width === '0%');
    assert.equal(await page.locator('#kørsel').isVisible(), true);
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});

test('touch: to pedaler samtidigt, ingen hængende gas og telefonlayout', async () => {
  const browser = await start();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage(), fejl = [];
    page.on('pageerror', e => fejl.push(e.message));
    await page.goto(ADRESSE);
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await kør(page);
    const cdp = await context.newCDPSession(page);
    const gas = await page.locator('#gas').boundingBox(), boost = await page.locator('#boost').boundingBox();
    assert.ok(gas.x + gas.width <= 390);
    assert.ok(boost.x > 0);
    const punkt = (b, id) => ({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [punkt(gas, 0), punkt(boost, 1)] });
    await page.waitForTimeout(850);
    assert.ok(parseFloat(await page.locator('#tank').evaluate(e => e.style.strokeDashoffset)) > 0, 'boost bruger raketbrændstof');
    assert.equal(await page.locator('#tip').isHidden(), true);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.locator('.pedal.trykket').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Start forfra', exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#tank').evaluate(e => e.style.strokeDashoffset), '0');
    await page.getByRole('button', { name: 'Til værkstedet', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    await page.getByRole('tab', { name: 'Last', exact: true }).click();
    await page.getByRole('button', { name: 'Ildtønder', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Ildtønder', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});
