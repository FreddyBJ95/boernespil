import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../3d-faelles/three.module.js';
import { ØVerden, sætLanterneBudget } from './verden.js';

// Den faktiske kvalitetsmetode afprøves på en ren scene uden renderer, lås eller spil.
test('Let/auto-mobil begrænser lys og Flot genskaber dem uden at fjerne fyrstrålen', () => {
  globalThis.devicePixelRatio = 3;
  const verden = Object.create(ØVerden.prototype);
  verden.mobil = true;
  verden.kamera = new THREE.PerspectiveCamera();
  verden.scene = new THREE.Scene();
  verden.renderer = { setPixelRatio() {}, shadowMap: {} };
  verden.tilpas = () => {};
  verden.spot = new THREE.SpotLight();
  verden.fyrlys = new THREE.PointLight();
  verden.håndlys = new THREE.PointLight();
  verden.lanterner = Array.from({ length: 8 }, (_, i) => {
    const lys = new THREE.PointLight(); lys.position.set(i * 10, 3, 0); return lys;
  });
  const kegle = new THREE.Mesh(new THREE.ConeGeometry(), new THREE.MeshBasicMaterial());
  verden.scene.add(verden.spot, verden.fyrlys, verden.håndlys, kegle, ...verden.lanterner);
  const antal = () => {
    let punkt = 0, spot = 0;
    verden.scene.traverseVisible(o => { if (o.isPointLight) punkt++; if (o.isSpotLight) spot++; });
    return { punkt, spot };
  };
  for (const kvalitet of ['let', 'auto']) {
    verden.anvendIndstillinger({ kvalitet, rolig: false });
    assert.deepEqual(antal(), { punkt: 4, spot: 0 });
    assert.ok(kegle.visible && verden.fyrlys.visible && verden.håndlys.visible);
  }
  verden.kamera.position.set(69, 2, 0);
  sætLanterneBudget(verden.lanterner, verden.kamera.position, true);
  assert.deepEqual(verden.lanterner.map((l, i) => l.visible ? i : -1).filter(i => i >= 0), [6, 7]);
  verden.anvendIndstillinger({ kvalitet: 'flot', rolig: false });
  assert.deepEqual(antal(), { punkt: 10, spot: 1 });
  verden.mobil = false;
  verden.anvendIndstillinger({ kvalitet: 'auto', rolig: false });
  assert.deepEqual(antal(), { punkt: 10, spot: 1 });
  kegle.geometry.dispose(); kegle.material.dispose();
});

// Kun den eksisterende framefunktion køres med ufarlige stubs; ingen verden/adgang åbnes.
test('Pause/dialog/menu tegner højst 20 Hz, skjult intet, og genoptagelse får frisk tid', () => {
  const kilde = readFileSync(new URL('./spil.js', import.meta.url), 'utf8');
  const blok = kilde.slice(kilde.indexOf('function billede(nu)'), kilde.indexOf('// Voksenlåsen gennemføres'));
  const køretider = [], tegninger = [], dokument = { hidden: false, getElementById: () => ({ classList: { add() {} } }) };
  const verden = { kamera: { position: { set() {} }, lookAt() {} }, opdater: (...v) => tegninger.push(v) };
  const opret = new Function('document', 'requestAnimationFrame', 'verden', 'gå', `
    let tilstandUI = 'pause', sidst = 0, sidsteTegning = 0, tidsSum = 0, hudTid = 0, gemTid = 0, beskedTid = Infinity, galleriet = false;
    const tilstand = { spilletid: 0, indstillinger: { rolig: true } }, lyd = { opdater() {} };
    const $ = id => document.getElementById(id), findInteraktion = () => {}, gemNu = () => {};
    ${blok}
    return { billede, sætUI: value => { tilstandUI = value; }, tid: () => sidst };
  `);
  const prøve = opret(dokument, () => {}, verden, dt => køretider.push(dt));
  let nu = 0;
  for (const ui of ['menu', 'pause', 'dialog']) {
    prøve.sætUI(ui); const før = tegninger.length;
    for (let i = 0; i < 60; i++) { nu += 1000 / 60; prøve.billede(nu); }
    assert.ok(tegninger.length - før <= 20 && tegninger.length - før >= 10);
  }
  dokument.hidden = true; const førSkjult = tegninger.length;
  for (let i = 0; i < 180; i++) { nu += 1000 / 60; prøve.billede(nu); }
  assert.equal(tegninger.length, førSkjult);
  assert.equal(prøve.tid(), nu);
  dokument.hidden = false; prøve.sætUI('spil'); nu += 1000 / 60; prøve.billede(nu);
  assert.ok(Math.abs(køretider.at(-1) - 1 / 60) < 1e-8);
  assert.equal(tegninger.length, førSkjult + 1);
  for (let i = 0; i < 60; i++) { nu += 1000 / 60; prøve.billede(nu); }
  assert.equal(tegninger.length, førSkjult + 61);
});
