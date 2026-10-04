import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { opretKampfigur } from "./kampfigur.js";

// Prøverne bruger de rigtige eksporter fra Blender, så navne, akser og håndgreb afprøves samlet.
const modeller = {};
for (const navn of ["eventyr", "kamp"]) {
  const b = fs.readFileSync(new URL(`./modeller/${navn}.glb`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), "");
  for (const obj of gltf.scene.children) modeller[obj.name] = obj;
}
const nær = (a, b, tolerance = 1e-6) => assert.ok(a.distanceTo(b) < tolerance, `${a.toArray()} ≈ ${b.toArray()}`);
const verdenspunkt = (obj, p = new THREE.Vector3()) => obj.localToWorld(p.clone());
const ny = () => {
  const helt = modeller.eventyrer.clone(true);
  return { helt, rig: opretKampfigur(helt, modeller) };
};
const matrixliste = (helt) => {
  helt.updateMatrixWorld(true);
  const værdier = [];
  helt.traverse((o) => værdier.push(o.name, ...o.matrix.elements, o.visible));
  return værdier;
};

test("kamp.glb har fem selvstændige modeller med rigtige greb og fremadrettet pil", () => {
  const fil = fs.readFileSync(new URL("./modeller/kamp.glb", import.meta.url));
  const j = JSON.parse(fil.subarray(20, 20 + fil.readUInt32LE(12)));
  assert.deepEqual(
    j.scenes[0].nodes.map((n) => j.nodes[n].name).sort(),
    ["kampsværd", "kampbue", "kamppil", "kampstav", "træningsskive"].sort(),
  );
  assert.ok(j.buffers.every((b) => !b.uri));
  assert.ok(!j.images?.length);
  const pil = new THREE.Box3().setFromObject(modeller.kamppil);
  assert.ok(pil.min.z < -1.05 && pil.max.z < .03, "pilen flyver langs lokal -Z fra nok0");
  const bue = new THREE.Box3().setFromObject(modeller.kampbue);
  assert.ok(bue.max.y > .68 && bue.min.y < -.68 && bue.max.x - bue.min.x < .14, "lodret bue med greb0");
  const skive = new THREE.Box3().setFromObject(modeller.træningsskive);
  assert.ok(Math.abs(skive.min.y) < .001 && skive.max.y > 1.8, "skivens egen fod står på gulvet");
});

test("arme drejer om skuldrene, og for-/bagdetaljer følger spillets -Z", () => {
  const { helt, rig } = ny();
  assert.ok(helt.getObjectByName("Icosphere").position.z < -.25, "øjne ser samme vej som våben");
  assert.ok(helt.getObjectByName("kappe").position.z > .19, "kappen bliver bagpå");
  const skulder = helt.getObjectByName("kampSkulderHøjre");
  nær(skulder.position, new THREE.Vector3(.39, 1.275, 0), 1e-6);
  for (const p of [0, .2, .35, .6, 1]) {
    rig.pose({ våben: "sværd", fremskridt: p });
    nær(skulder.position, new THREE.Vector3(.39, 1.275, 0), 1e-6);
  }
  rig.ryd();
});

test("begge sværdslag giver forskellige synlige tværslag med håndfast greb", () => {
  const { helt, rig } = ny();
  const sværd = helt.getObjectByName("kampsværd"), hånd = helt.getObjectByName("kampHåndHøjre");
  rig.pose({ våben: "sværd", fremskridt: .2, slag: 1 });
  const tilløb = verdenspunkt(sværd, new THREE.Vector3(0, 1.25, 0));
  rig.pose({ våben: "sværd", fremskridt: .35, slag: 1 });
  const første = verdenspunkt(sværd, new THREE.Vector3(0, 1.25, 0));
  nær(verdenspunkt(sværd), verdenspunkt(hånd));
  assert.ok(tilløb.distanceTo(første) > 1.4, "klingen bevæger sig tydeligt gennem slaget");
  assert.ok(første.z < -1.2 && første.x < -.3);
  rig.pose({ våben: "sværd", fremskridt: .35, slag: 2 });
  const anden = verdenspunkt(sværd, new THREE.Vector3(0, 1.25, 0));
  assert.ok(anden.x > 1.1 && anden.z < -1.1, "anden fejning går til modsat side");
  nær(verdenspunkt(sværd), verdenspunkt(hånd));
  rig.ryd();
});

test("buen bliver i venstre hånd; højre hånd trækker streng og nokket pil helt frem til slip", () => {
  const { helt, rig } = ny();
  const bue = helt.getObjectByName("kampbue"), håndV = helt.getObjectByName("kampHåndVenstre");
  const håndH = helt.getObjectByName("kampHåndHøjre"), streng = helt.getObjectByName("kampBuestreng");
  const pil = helt.getObjectByName("kampNokketPil");
  rig.pose({ våben: "bue", fremskridt: .2 });
  const start = verdenspunkt(pil);
  const strengStart = streng.geometry.attributes.position.getZ(1);
  for (const p of [.2, .35, .54]) {
    rig.pose({ våben: "bue", fremskridt: p });
    assert.equal(pil.visible, true);
    nær(verdenspunkt(bue), verdenspunkt(håndV));
    nær(verdenspunkt(pil), verdenspunkt(håndH));
    const nok = new THREE.Vector3().fromBufferAttribute(streng.geometry.attributes.position, 1);
    nær(verdenspunkt(streng, nok), verdenspunkt(pil));
  }
  assert.ok(verdenspunkt(pil).z - start.z > .075, "hånden trækker tilbage, mens buen presses frem");
  assert.ok(streng.geometry.attributes.position.getZ(1) - strengStart > .18, "strengen spændes tydeligt i buen");
  rig.pose({ våben: "bue", fremskridt: .55 });
  assert.equal(pil.visible, false);
  nær(rig.munding({ x: 0, z: -1 }), verdenspunkt(pil));
  const slipsted = rig.munding();
  rig.pose({ våben: "bue", fremskridt: .65 });
  assert.ok(streng.geometry.attributes.position.getZ(1) < .14, "strengen slår tilbage efter slip");
  nær(rig.munding(), slipsted, 1e-6);
  rig.ryd();
});

test("munding følger faktisk drejet/placeret figur, og pilmodellen springer ikke ved slip", () => {
  const { helt, rig } = ny();
  helt.position.set(17, .3, -8);
  helt.rotation.y = -Math.PI / 2;
  helt.scale.setScalar(1.3);
  rig.pose({ våben: "bue", fremskridt: .55 });
  const pil = helt.getObjectByName("kampNokketPil"), nok = rig.munding({ x: 1, z: 0 });
  const flyvende = modeller.kamppil.clone(true);
  flyvende.position.copy(nok);
  pil.getWorldQuaternion(flyvende.quaternion);
  pil.getWorldScale(flyvende.scale);
  flyvende.updateMatrixWorld(true);
  nær(verdenspunkt(flyvende, new THREE.Vector3(0, 0, -1.08)), verdenspunkt(pil, new THREE.Vector3(0, 0, -1.08)));
  const iFiguren = helt.worldToLocal(nok.clone());
  nær(iFiguren, new THREE.Vector3(-.22, 1.34, -.20));
  assert.ok(iFiguren.y > 1.325 && iFiguren.z < -.19, "pilen ligger over og foran brystet ved slip");
  rig.ryd();
});

test("krystalstaven løftes mod målet, og magi kommer fra den synlige krystal", () => {
  const { helt, rig } = ny();
  rig.pose({ våben: "magi", fremskridt: null });
  const hvile = rig.munding();
  rig.pose({ våben: "magi", fremskridt: .4 });
  const slip = rig.munding();
  assert.ok(slip.y > hvile.y + .4 && slip.z < hvile.z - .6);
  nær(slip, verdenspunkt(helt.getObjectByName("kampstav"), new THREE.Vector3(0, 1.12, 0)));
  rig.ryd();
});

test("våbenskift/reset og mange gang-/kampposer giver hverken drift eller ugyldige led", () => {
  const { helt, rig } = ny();
  rig.pose({ våben: "bue", fremskridt: null, tid: 1.25, fart: .8 });
  const før = matrixliste(helt);
  for (let i = 0; i < 450; i++) {
    rig.pose({
      våben: ["sværd", "bue", "magi"][i % 3],
      tid: i / 60,
      fart: .7,
      fremskridt: i % 101 / 100,
      slag: i % 2 + 1,
    });
    helt.traverse((o) => assert.ok(o.matrix.elements.every(Number.isFinite), o.name));
  }
  rig.pose({ våben: "bue", fremskridt: null, tid: 1.25, fart: .8 });
  assert.deepEqual(matrixliste(helt), før, "posen afhænger kun af aktuelle argumenter");
  rig.nulstil();
  assert.equal(helt.getObjectByName("kampbue").visible, true);
  assert.equal(helt.getObjectByName("kampsværd").visible, false);
  assert.equal(helt.getObjectByName("kampNokketPil").visible, false);
  rig.pose({ våben: "magi", fremskridt: NaN, tid: Infinity, fart: NaN });
  helt.traverse((o) => assert.ok(o.matrix.elements.every(Number.isFinite), o.name));
  rig.ryd();
});

test("ryd gendanner originalfigur og genbrugte ressourcer; manglende assets ændrer intet", () => {
  const helt = modeller.eventyrer.clone(true), original = matrixliste(helt);
  let geometriFrigivet = 0;
  helt.getObjectByName("armHøjre").geometry.addEventListener("dispose", () => geometriFrigivet++);
  assert.throws(() => opretKampfigur(helt, {}), /Blender-modellen/);
  assert.deepEqual(matrixliste(helt), original);
  const rig = opretKampfigur(helt, modeller);
  rig.pose({ våben: "sværd", fremskridt: .35, slag: 2 });
  rig.ryd();
  rig.ryd();
  assert.equal(geometriFrigivet, 0, "originalens delte Blendergeometri bevares");
  // Ryd må flytte de to oprindelige arme tilbage i children-rækkefølgen; transformationerne skal være ens.
  const nodeData = (h) => {
    h.updateMatrixWorld(true);
    return h.children.map((o) => [o.name, ...o.matrix.elements, o.visible]).sort((a, b) => a[0].localeCompare(b[0]));
  };
  assert.deepEqual(nodeData(helt), nodeData(modeller.eventyrer));
  assert.equal(helt.getObjectByName("kampSkulderHøjre"), undefined);
  rig.pose({ våben: "bue", fremskridt: .4 });
  assert.equal(helt.getObjectByName("kampSkulderHøjre"), undefined);
});
