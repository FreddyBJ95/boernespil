import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { opretFundfigur } from "./fundfigur.js";

// De faktiske Blender-filer afprøves sammen med managerens ejerskab og levetid.
const fil = fs.readFileSync(new URL("./modeller/fund.glb", import.meta.url));
const gltf = await new GLTFLoader().parseAsync(fil.buffer.slice(fil.byteOffset, fil.byteOffset + fil.byteLength), "");
const modeller = Object.fromEntries(gltf.scene.children.map((obj) => [obj.name, obj]));
const ny = () => {
  const scene = new THREE.Scene();
  return { scene, manager: opretFundfigur(scene, modeller) };
};
const forløb = (scene) => scene.children.filter((o) => o.name === "fundForløb");
const genstande = (scene) => {
  const liste = [];
  scene.traverse((o) => {
    if (o.name.startsWith("fundGenstand_")) liste.push(o);
  });
  return liste;
};
const kistefund = {
  type: "kiste",
  titel: "Et stille fund",
  genstande: [
    { type: "kobber", navn: "Kobber", antal: 40 },
    { type: "eliksir", navn: "Eliksir", antal: 2 },
    { type: "krystal", navn: "Lyskrystal", antal: 1 },
    { type: "erfaring", navn: "Erfaring", antal: 25 },
  ],
};
const nær = (a, b) => assert.ok(a.distanceTo(b) < 1e-6, `${a.toArray()} ≈ ${b.toArray()}`);

test("fund.glb har fem originale modeller, indlejrede ressourcer og facetter/glas", () => {
  assert.equal(fil.subarray(0, 4).toString(), "glTF");
  const j = JSON.parse(fil.subarray(20, 20 + fil.readUInt32LE(12)));
  assert.deepEqual(
    j.scenes[0].nodes.map((i) => j.nodes[i].name).sort(),
    ["fundkrystal", "fundkobber", "fundeliksir", "fundsegl", "skattekiste"].sort(),
  );
  assert.ok(j.buffers.every((b) => !b.uri));
  assert.ok(!j.images?.length);
  const krystal = new THREE.Box3().setFromObject(modeller.fundkrystal);
  assert.ok(krystal.max.y > .9 && krystal.max.x - krystal.min.x > .6);
  let lys = 0, glas = 0;
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      if (o.material.emissiveIntensity > .1) lys++;
      if (o.material.transparent && o.material.opacity < .5) glas++;
    }
  });
  assert.ok(lys > 3 && glas >= 1);
});

test("skattekisten har en hul bund og et lokalt hængsel, der åbner foran", () => {
  const kiste = modeller.skattekiste.clone(true), låg = kiste.getObjectByName("kistelåg");
  nær(låg.position, new THREE.Vector3(0, .8, .455));
  assert.ok(Math.abs(låg.rotation.x) < 1e-8);
  kiste.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, .65, 0), new THREE.Vector3(0, -1, 0));
  const gulv = ray.intersectObject(kiste, true)[0];
  assert.ok(gulv && Math.abs(gulv.point.y - .16) < .001, "midten indeholder gulv, ikke en udfyldt kasse");
  const lukket = låg.localToWorld(new THREE.Vector3(0, .14, -.83));
  låg.rotation.x = 1.15;
  kiste.updateMatrixWorld(true);
  const åben = låg.localToWorld(new THREE.Vector3(0, .14, -.83));
  assert.ok(åben.y > lukket.y + .65, "positiv X løfter den forreste lågkant");
});

test("en taget kiste åbner på .6s, viser de faktiske genstande og forsvinder først efter nogle sekunder", () => {
  const { scene, manager } = ny(), kiste = modeller.skattekiste.clone(true);
  kiste.position.set(5, 0, -3);
  scene.add(kiste);
  assert.equal(manager.vis(kistefund, { x: 5, z: -3, kiste }), true);
  assert.equal(manager.vis(kistefund, { x: 5, z: -3, kiste }), false, "samme kiste kan kun overtages én gang");
  const låg = kiste.getObjectByName("kistelåg");
  assert.equal(låg.rotation.x, 0);
  assert.deepEqual(genstande(scene).map((o) => o.userData.fundtype).sort(), ["kobber", "eliksir", "krystal"].sort());
  assert.ok(genstande(scene).every((o) => !o.visible));
  manager.opdatér(.3);
  assert.ok(låg.rotation.x > .4 && låg.rotation.x < .8);
  manager.opdatér(.3);
  assert.ok(Math.abs(låg.rotation.x - 1.15) < 1e-8);
  assert.ok(genstande(scene).every((o) => o.visible));
  const før = genstande(scene).map((o) => o.position.y);
  manager.opdatér(.7);
  assert.ok(genstande(scene).every((o, i) => o.position.y > før[i] + .5));
  manager.opdatér(1.6);
  assert.equal(kiste.parent, scene, "åben kiste bliver stående et stykke tid");
  manager.opdatér(1.4);
  assert.equal(kiste.parent, null);
  assert.equal(forløb(scene).length, 0);
});

test("krystal og segl løftes, rolige effekter stopper spin og alle glimt", () => {
  const { scene, manager } = ny();
  manager.vis({ type: "krystal", genstande: [{ type: "kobber", antal: 3 }] }, { x: 1, z: 2 });
  const krystal = genstande(scene).find((o) => o.userData.fundtype === "krystal");
  const glimt = scene.getObjectByName("fundGlimt");
  manager.opdatér(.4);
  assert.ok(krystal.position.y > .7 && krystal.rotation.y > 0);
  assert.equal(glimt.visible, true);
  const drej = krystal.rotation.y;
  manager.opdatér(.2, { rolig: true });
  assert.equal(krystal.rotation.y, drej);
  assert.equal(glimt.visible, false);
  manager.ryd();
  manager.vis({ type: "segl", genstande: [{ type: "segl", antal: 1 }] }, { x: 4, z: -2, rolig: true });
  manager.opdatér(.8, { rolig: true });
  const segl = genstande(scene)[0];
  assert.equal(genstande(scene).length, 1);
  assert.ok(segl.position.y > 1.5 && segl.rotation.y === 0);
  assert.equal(scene.getObjectByName("fundGlimt"), undefined);
  manager.ryd();
});

test("højst otte samtidige forløb og fire genstandstyper; kæmpe antal skaber ikke meshstorm", () => {
  const { scene, manager } = ny(), kister = [];
  const stort = {
    type: "kiste",
    genstande: Array.from({ length: 400 }, (_, i) => ({
      type: ["kobber", "krystal", "eliksir", "segl", "erfaring"][i % 5],
      antal: 1000000,
    })),
  };
  for (let i = 0; i < 20; i++) {
    const kiste = modeller.skattekiste.clone(true);
    kister.push(kiste);
    kiste.position.x = i;
    scene.add(kiste);
    manager.vis(stort, { x: i, z: 0, kiste });
    assert.ok(forløb(scene).length <= 8 && genstande(scene).length <= 32);
  }
  assert.equal(forløb(scene).length, 8);
  assert.ok(kister.slice(0, 12).every((k) => !k.parent), "ældre ejede kister ryddes ved loftet");
  assert.ok(kister.slice(12).every((k) => k.parent === scene));
  manager.ryd();
  assert.equal(scene.children.length, 0);
});

test("flytning fra områdets rod bevarer kistens verdensposition, rotation og skala", () => {
  const { scene, manager } = ny(), område = new THREE.Group();
  område.position.set(8, 2, -3);
  område.rotation.y = .7;
  område.scale.setScalar(1.25);
  scene.add(område);
  const kiste = modeller.skattekiste.clone(true);
  kiste.position.set(2, 0, -1);
  kiste.rotation.y = -.2;
  kiste.scale.setScalar(.9);
  område.add(kiste);
  scene.updateMatrixWorld(true);
  const position = kiste.getWorldPosition(new THREE.Vector3()), q = kiste.getWorldQuaternion(new THREE.Quaternion());
  const skala = kiste.getWorldScale(new THREE.Vector3());
  manager.vis(kistefund, { x: position.x, z: position.z, kiste, rolig: true });
  scene.updateMatrixWorld(true);
  nær(kiste.getWorldPosition(new THREE.Vector3()), position);
  nær(kiste.getWorldScale(new THREE.Vector3()), skala);
  assert.ok(kiste.getWorldQuaternion(new THREE.Quaternion()).angleTo(q) < 1e-6);
  manager.opdatér(.7, { rolig: true });
  const ting = genstande(scene);
  assert.ok(ting.every((o) => o.getWorldPosition(new THREE.Vector3()).y > position.y + .6));
  manager.ryd();
  assert.equal(scene.children.length, 1);
  assert.equal(område.children.length, 0);
});

test("fading bruger egne materialer; ryd frigiver dem én gang og rører aldrig biblioteket", () => {
  const { scene, manager } = ny(), kiste = modeller.skattekiste.clone(true);
  const kildeMats = new Set(), kildeGeo = new Set();
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      kildeMats.add(o.material);
      kildeGeo.add(o.geometry);
    }
  });
  const før = [...kildeMats].map((m) => [m.uuid, m.opacity, m.transparent, m.depthWrite]);
  let bibliotekFrigivet = 0;
  for (const m of [...kildeMats, ...kildeGeo]) m.addEventListener("dispose", () => bibliotekFrigivet++);
  scene.add(kiste);
  manager.vis(kistefund, { x: 0, z: 0, kiste });
  const egneMats = new Set(), egneGeo = new Set();
  scene.traverse((o) => {
    if (o.material && !kildeMats.has(o.material)) egneMats.add(o.material);
    if (o.geometry && !kildeGeo.has(o.geometry)) egneGeo.add(o.geometry);
  });
  let egneFrigivet = 0;
  for (const m of [...egneMats, ...egneGeo]) m.addEventListener("dispose", () => egneFrigivet++);
  manager.opdatér(3.9);
  assert.ok([...egneMats].some((m) => m.opacity < .4));
  assert.deepEqual([...kildeMats].map((m) => [m.uuid, m.opacity, m.transparent, m.depthWrite]), før);
  manager.ryd();
  manager.ryd();
  assert.equal(bibliotekFrigivet, 0);
  assert.equal(egneFrigivet, egneMats.size + egneGeo.size);
  assert.ok(kiste.children.filter((o) => o.isMesh).every((o) => kildeMats.has(o.material)));
  manager.vis({ type: "krystal" }, { x: 0, z: 0 });
  manager.opdatér(.8);
  manager.ryd();
  assert.equal(bibliotekFrigivet, 0, "manageren kan genbruges efter et områdeskift");
});

test("ugyldigt input afvises; ingen tick betyder samme positur og pause uden fremgang", () => {
  const { scene, manager } = ny();
  assert.equal(manager.vis({ type: "forkert" }, {}), false);
  assert.equal(manager.vis(null), false);
  assert.equal(manager.vis(kistefund, { kiste: {} }), false);
  assert.equal(scene.children.length, 0);
  manager.vis({ type: "segl", genstande: [null, { type: "kobber", antal: -1 }] }, { x: NaN, z: Infinity });
  manager.opdatér(.5);
  const genstand = genstande(scene)[0], p = genstand.position.clone(), q = genstand.quaternion.clone();
  for (const dt of [0, -1, NaN, Infinity]) manager.opdatér(dt);
  nær(genstand.position, p);
  assert.ok(genstand.quaternion.angleTo(q) < 1e-6);
  assert.ok(genstand.position.toArray().every(Number.isFinite));
  manager.opdatér(10);
  assert.equal(scene.children.length, 0);
});
