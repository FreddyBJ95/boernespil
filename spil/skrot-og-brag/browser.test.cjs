// Kør med NODE_PATH til en installeret Playwright og en lokal prøveserver på 18124.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ADRESSE = 'http://127.0.0.1:18124/spil/skrot-og-brag/';

test('browser: garage, lyd, kørsel, pause, nulstilling og gemning', async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const fejl = [], lydfiler = [];
    page.on('pageerror', e => fejl.push(e.message));
    page.on('response', r => { if (r.url().endsWith('.mp3')) lydfiler.push(r.status()); });
    await page.addInitScript(() => {
      const Oprindelig = window.AudioContext;
      window.__lyd = [];
      window.AudioContext = class extends Oprindelig {
        constructor(...args) { super(...args); window.__lyd.push(this); }
      };
    });
    await page.goto(ADRESSE);
    await page.getByRole('button', { name: 'Ud og lav ballade' }).waitFor();
    await page.getByRole('button', { name: 'Lilla hvirvel' }).click();
    await page.getByRole('tab', { name: 'Front', exact: true }).click();
    await page.getByRole('button', { name: 'Løfteplov' }).click();
    await page.getByRole('button', { name: 'Neon-nedsmeltning', exact: true }).click();
    await page.getByRole('button', { name: 'Ud og lav ballade' }).click();
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(() => Number(document.getElementById('kaede').textContent) >= 2, { timeout: 15000 });
    await page.keyboard.up('ArrowRight');
    assert.ok(Number(await page.locator('#procent').textContent()) > 0);
    assert.equal(await page.evaluate(() => window.__lyd[0]?.state), 'running');
    assert.ok(lydfiler.length >= 8);
    assert.ok(lydfiler.every(s => s === 200));
    await page.getByRole('button', { name: 'Pause', exact: false }).click();
    const før = await page.locator('#kaede').textContent();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#kaede').textContent(), før);
    assert.equal(await page.evaluate(() => window.__lyd[0].state), 'suspended');
    await page.getByRole('button', { name: 'Kør videre' }).click();
    await page.getByRole('button', { name: 'Nyt forsøg' }).click();
    await page.waitForFunction(() => document.getElementById('kaede').textContent === '0');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.getByRole('heading', { name: 'Pause', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Til værkstedet', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Ud og lav ballade' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Lilla hvirvel' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('tab', { name: 'Front', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Løfteplov' }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});

test('touch: to pedaler samtidigt, ingen hængende gas og telefonlayout', async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage(), fejl = [];
    page.on('pageerror', e => fejl.push(e.message));
    await page.goto(ADRESSE);
    await page.getByRole('button', { name: 'Ud og lav ballade' }).click();
    const cdp = await context.newCDPSession(page);
    const gas = await page.locator('#gas').boundingBox(), boost = await page.locator('#boost').boundingBox();
    assert.ok(gas.x + gas.width <= 390);
    assert.ok(boost.x > 0);
    const point = (b, id) => ({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), id });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(gas, 0), point(boost, 1)] });
    await page.waitForTimeout(850);
    assert.ok(Number(await page.locator('#fart').textContent()) > 0);
    assert.ok(Number(await page.locator('#tank').getAttribute('value')) < 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.locator('.pedal.trykket').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Nyt forsøg' }).click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#fart').textContent(), '0');
    await page.getByRole('button', { name: 'Byg om', exact: false }).first().click();
    await page.getByRole('button', { name: 'Ud og lav ballade' }).waitFor();
    await page.getByRole('button', { name: 'Benzintønder' }).click();
    assert.equal(await page.getByRole('button', { name: 'Benzintønder' }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(fejl, []);
  } finally { await browser.close(); }
});
