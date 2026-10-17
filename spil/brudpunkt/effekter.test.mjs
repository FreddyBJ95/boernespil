import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../3d-faelles/three.module.js";
import { BrudEffekter } from "./effekter.js";

function opret(indstillinger = {}) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1.5, .1, 200);
  camera.position.set(0, 2, 4);
  camera.lookAt(0, .5, 0);
  camera.updateMatrixWorld();
  const kald = [], blink = { style: {} };
  const gradient = { addColorStop() {} };
  const ctx = Object.fromEntries(
    ["setTransform", "clearRect", "fillRect", "beginPath", "moveTo", "lineTo", "stroke", "fill", "closePath", "ellipse"]
      .map((n) => [n, (...a) => kald.push([n, ...a])]),
  );
  ctx.createRadialGradient = () => gradient;
  const canvas = { width: 600, height: 400, getContext: () => ctx };
  const skader = [];
  const effekt = new BrudEffekter(scene, camera, { canvas, blink, vedSkade: (s) => skader.push(s), ...indstillinger });
  return { scene, camera, effekt, canvas, ctx, kald, blink, skader };
}

test("En rigtig nærliggende puls giver glasrevner, og objektivnulstilling bevarer verdenens effekter", () => {
  const { effekt, skader, kald, blink } = opret();
  effekt.haendelse({ type: "puls", position: [0, .8, 0], styrke: 1 });
  const ryst = effekt.tick(.016);
  assert.deepEqual(skader, [true]);
  assert.ok(ryst.some((n) => n !== 0));
  assert.ok(Number(blink.style.opacity) > 0);
  assert.ok(kald.some(([type]) => type === "stroke"), "Revnerne skal faktisk tegnes");
  const før = effekt.antal;
  effekt.nulstilObjektiv();
  assert.deepEqual(skader, [true, false]);
  assert.equal(effekt.revner.length, 0);
  assert.equal(effekt.antal, før);
  effekt.frigiv();
});

test("Fjerne pulser skader ikke kameraet, og ugyldige hændelser starter intet", () => {
  const { effekt, skader } = opret();
  effekt.haendelse({ type: "puls", position: [80, 1, 80], styrke: 1 });
  assert.deepEqual(effekt.tick(.016), [0, 0, 0]);
  assert.deepEqual(skader, []);
  const før = effekt.antal;
  for (
    const h of [null, {}, { type: "puls", position: [NaN, 0, 0], styrke: 1 }, {
      type: "ukendt",
      position: [0, 0, 0],
      styrke: 1,
    }]
  ) effekt.haendelse(h);
  assert.equal(effekt.antal, før);
  effekt.frigiv();
});

test("Kædereaktioner holder partikel- og GPU-loftet, også ved grafikkvalitetsskift", () => {
  const { effekt, scene } = opret({ kvalitet: "flot" });
  const geometrier = scene.children[0].children.map((m) => m.geometry);
  for (let i = 0; i < 100; i++) effekt.haendelse({ type: "puls", position: [i % 20, 1, 0], styrke: .9 });
  assert.ok(effekt.antal <= 1000);
  effekt.saetKvalitet("let");
  effekt.tick(.016);
  assert.ok(effekt.antal <= 250);
  assert.equal(scene.children[0].children.length, 6);
  assert.deepEqual(scene.children[0].children.map((m) => m.geometry), geometrier);
  assert.equal(scene.children[0].children.reduce((sum, m) => sum + m.count, 0), effekt.antal);
  for (let i = 0; i < 65; i++) effekt.tick(.1);
  assert.equal(effekt.antal, 0);
  assert.ok(scene.children[0].children.every((m) => m.count === 0));
  effekt.frigiv();
});

test("Rolige effekter har ingen rystelse og begrænsede blink; kæden udløser ikke hurtige nye blink", () => {
  const { effekt, blink } = opret({ rolig: true });
  effekt.haendelse({ type: "puls", position: [0, 1, 3], styrke: 1 });
  assert.deepEqual(effekt.tick(.016), [0, 0, 0]);
  const første = Number(blink.style.opacity);
  assert.ok(første <= .025);
  effekt.haendelse({ type: "puls", position: [0, 1, 3], styrke: 1 });
  effekt.tick(.016);
  assert.ok(Number(blink.style.opacity) < første, "Næste puls skal lade det første blink falde til ro");
  effekt.frigiv();
});

test("Glasset har højst fire skader, kan tegnes på ny efter resize og nulstilles helt", () => {
  const { effekt, canvas, camera } = opret();
  for (let i = 0; i < 20; i++) effekt.haendelse({ type: "puls", position: camera.position.toArray(), styrke: 1 });
  assert.equal(effekt.revner.length, 4);
  assert.ok(effekt.revner.every((r) => Number.isFinite(r.x) && Number.isFinite(r.y)));
  effekt.resize(900, 500, 2);
  assert.equal(canvas.width, 1800);
  assert.equal(canvas.height, 1000);
  effekt.nulstil();
  assert.equal(effekt.revner.length, 0);
  assert.equal(effekt.antal, 0);
  assert.deepEqual(effekt.tick(.016), [0, 0, 0]);
  effekt.frigiv();
});

test("Frigiv fjerner alle egne GPU-ressourcer og kan kaldes flere gange", () => {
  const { effekt, scene } = opret();
  let frigivet = 0;
  for (const mesh of scene.children[0].children) {
    mesh.geometry.addEventListener("dispose", () => frigivet++);
    mesh.material.addEventListener("dispose", () => frigivet++);
  }
  for (const kort of effekt.kort) kort.addEventListener("dispose", () => frigivet++);
  effekt.frigiv();
  effekt.frigiv();
  assert.equal(scene.children.length, 0);
  assert.equal(frigivet, 14);
  effetEfterLukning(effekt);
});

function effetEfterLukning(effekt) {
  effekt.haendelse({ type: "puls", position: [0, 1, 0], styrke: 1 });
  assert.equal(effekt.antal, 0);
  assert.deepEqual(effekt.tick(.016), [0, 0, 0]);
}
