import assert from "node:assert/strict";
import { after, test } from "node:test";
import * as THREE from "../3d-faelles/three.module.js";
import { BaneKamera } from "./kamera.js";

// Kun inputfladen erstattes; kameraets vektorer og rotationer er de rigtige fra Three.
const gammeltVindue = globalThis.window;
globalThis.window = new EventTarget();
after(() => {
  if (gammeltVindue === undefined) delete globalThis.window;
  else globalThis.window = gammeltVindue;
});

class Flade extends EventTarget {
  setPointerCapture(id) { this.fanget = id; }
  send(type, egenskaber = {}) {
    const hændelse = new Event(type, { cancelable: true });
    Object.assign(hændelse, {
      pointerId: 1, pointerType: "touch", button: 0, buttons: 1,
      clientX: 100, clientY: 100, shiftKey: false,
    }, egenskaber);
    this.dispatchEvent(hændelse);
    return hændelse;
  }
}

function opret(t, kald = {}) {
  const flade = new Flade();
  const kamera = new THREE.PerspectiveCamera(46, 1, .12, 230);
  const styring = new BaneKamera(flade, kamera, kald);
  t.after(() => styring.frigiv());
  return { flade, kamera, styring };
}

test("et tryk vælger én gang, mens fingeruro ikke flytter objektet", t => {
  let valgt = 0, flyttet = 0;
  const sluppet = [];
  const { flade, styring } = opret(t, {
    grib: () => true, tryk: () => valgt++, flyt: () => flyttet++,
    slip: annulleret => sluppet.push(annulleret),
  });
  const start = [styring.yaw, styring.pitch, styring.afstand];
  flade.send("pointerdown");
  flade.send("pointermove", { clientX: 102, clientY: 101 });
  flade.send("pointerup", { clientX: 102, clientY: 101 });
  flade.send("lostpointercapture");
  assert.equal(valgt, 1);
  assert.equal(flyttet, 0);
  assert.deepEqual(sluppet, [false]);
  assert.deepEqual([styring.yaw, styring.pitch, styring.afstand], start);
});

test("et objekttræk flytter objektet og må ikke også udløse et tryk", t => {
  let valgt = 0;
  const bevægelser = [], sluppet = [];
  const { flade, styring } = opret(t, {
    grib: () => true, tryk: () => valgt++,
    flyt: e => bevægelser.push([e.clientX, e.clientY]),
    slip: annulleret => sluppet.push(annulleret),
  });
  const yaw = styring.yaw;
  flade.send("pointerdown");
  flade.send("pointermove", { clientX: 118 });
  flade.send("pointermove", { clientX: 125, clientY: 103 });
  flade.send("pointerup", { clientX: 125, clientY: 103 });
  assert.deepEqual(bevægelser, [[118, 100], [125, 103]]);
  assert.deepEqual(sluppet, [false]);
  assert.equal(valgt, 0);
  assert.equal(styring.yaw, yaw);
});

test("anden finger annullerer objekttrækket og giver kameraet begge fingre", t => {
  const sluppet = [];
  let valgt = 0, flyttet = 0;
  const { flade, styring } = opret(t, {
    grib: () => true, tryk: () => valgt++, flyt: () => flyttet++,
    slip: annulleret => sluppet.push(annulleret),
  });
  flade.send("pointerdown");
  flade.send("pointermove", { clientX: 110 });
  assert.equal(flyttet, 1);
  flade.send("pointerdown", { pointerId: 2, clientX: 210 });
  assert.deepEqual(sluppet, [true]);
  const afstand = styring.afstand, yaw = styring.yaw;
  flade.send("pointermove", { pointerId: 2, clientX: 250 });
  assert.ok(styring.afstand < afstand, "spredte fingre zoomer tættere på");
  assert.notEqual(styring.yaw, yaw, "fingrenes fælles bevægelse drejer kameraet");
  flade.send("pointerup", { pointerId: 2, clientX: 250 });
  const efterToFingre = styring.yaw;
  flade.send("pointermove", { clientX: 130 });
  assert.notEqual(styring.yaw, efterToFingre, "den sidste finger fortsætter med at styre kameraet");
  flade.send("pointerup", { clientX: 130 });
  assert.equal(flyttet, 1, "objektet må ikke gribes igen midt i gestussen");
  assert.equal(valgt, 0, "slutningen på en gestus må ikke placere et nyt objekt");
  assert.deepEqual(sluppet, [true]);
});

test("annullering og mistet fangst slipper kun objektet én gang og klikker aldrig", t => {
  for (const afslutning of ["pointercancel", "lostpointercapture"]) {
    const sluppet = [];
    let valgt = 0;
    const { flade, styring } = opret(t, {
      grib: () => true, tryk: () => valgt++,
      slip: annulleret => sluppet.push(annulleret),
    });
    flade.send("pointerdown");
    flade.send("pointermove", { clientY: 120 });
    flade.send(afslutning);
    flade.send("pointerup");
    flade.send("lostpointercapture");
    assert.deepEqual(sluppet, [true]);
    assert.equal(valgt, 0);
    assert.equal(styring.pege.size, 0);
  }
});

test("et afbrudt tofingergreb bliver ikke til et klik med den tilbageværende finger", t => {
  let valgt = 0;
  const { flade, styring } = opret(t, { tryk: () => valgt++ });
  flade.send("pointerdown");
  flade.send("pointerdown", { pointerId: 2, clientX: 200 });
  flade.send("pointercancel", { pointerId: 2, clientX: 200 });
  flade.send("pointerup");
  assert.equal(valgt, 0);
  assert.equal(styring.pege.size, 0);
});

test("fokus væk fra spillet annullerer trækket; frigiv fjerner inputlytterne", t => {
  const sluppet = [];
  let valgt = 0;
  const { flade, styring } = opret(t, {
    grib: () => true, tryk: () => valgt++,
    slip: annulleret => sluppet.push(annulleret),
  });
  flade.send("pointerdown");
  window.dispatchEvent(new Event("blur"));
  flade.send("pointerup");
  assert.deepEqual(sluppet, [true]);
  assert.equal(valgt, 0);
  styring.frigiv();
  const afstand = styring.afstand;
  flade.send("pointerdown");
  flade.send("pointerup");
  flade.send("wheel", { deltaY: 400 });
  assert.equal(valgt, 0);
  assert.equal(styring.afstand, afstand);
  assert.equal(styring.pege.size, 0);
});

test("zoom og panorering holder banen inden for kameraets arbejdsområde", t => {
  const { flade, styring } = opret(t);
  assert.equal(flade.send("wheel", { deltaY: 100000 }).defaultPrevented, true);
  assert.equal(styring.afstand, 90);
  flade.send("wheel", { deltaY: -100000 });
  assert.equal(styring.afstand, 3);
  styring.aktiv = false;
  flade.send("wheel", { deltaY: 100000 });
  assert.equal(styring.afstand, 3);
  styring.aktiv = true;
  const yaw = styring.yaw, pitch = styring.pitch;
  flade.send("pointerdown", { pointerType: "mouse", button: 2, buttons: 2 });
  flade.send("pointermove", { pointerType: "mouse", button: 2, buttons: 2, clientX: 10000, clientY: -10000 });
  flade.send("pointerup", { pointerType: "mouse", button: 2, buttons: 0 });
  assert.equal(styring.yaw, yaw);
  assert.equal(styring.pitch, pitch);
  assert.ok(Math.abs(styring.maal.x) <= 35 && Math.abs(styring.maal.z) <= 35);
  assert.ok(styring.maal.x !== 0 || styring.maal.z !== 0);
});

test("kameraet ser mod målet og genskaber sin position efter en rystelse", t => {
  const { styring, kamera } = opret(t);
  styring.maal.set(4, 3, -7);
  styring.opdater();
  const grundstilling = kamera.position.clone();
  assert.ok(Math.abs(kamera.position.distanceTo(styring.maal) - styring.afstand) < 1e-10);
  assert.ok(kamera.getWorldDirection(new THREE.Vector3()).distanceTo(styring.maal.clone().sub(kamera.position).normalize()) < 1e-10);
  kamera.position.add(new THREE.Vector3(.2, -.1, .3));
  styring.opdater();
  assert.ok(kamera.position.distanceTo(grundstilling) < 1e-10);
  styring.overblik();
  styring.opdater();
  assert.deepEqual(styring.maal.toArray(), [0, 2, 0]);
  assert.ok(kamera.position.toArray().every(Number.isFinite));
  assert.ok(Math.abs(kamera.position.distanceTo(styring.maal) - 40) < 1e-10);
});
