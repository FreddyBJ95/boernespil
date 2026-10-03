import { strict as assert } from "node:assert";
import * as THREE from "../../spil/3d-faelles/three.module.js";
import { GLTFLoader } from "../../spil/3d-faelles/GLTFLoader.js";
import { spilfiler, VOKSENVERDENER } from "./tre-verdener-filer.js";
import { bygGrotte, bygØ, kopi } from "../../spil/krystaljaegerne/verden.js";
import { danGrotte } from "../../spil/krystaljaegerne/eventyr.js";

// Brug spillets rigtige loader: en gyldig GLB-header er ikke nok til at tegne modellen.
for (const id of VOKSENVERDENER) {
  Deno.test(`Blenderverden: ${id}, faktisk indlæsning og endelig geometri`, async () => {
    for (const fil of (await spilfiler(id)).filter((f) => f.endsWith(".glb"))) {
      const bytes = await Deno.readFile(new URL("../../" + fil, import.meta.url));
      const model = await new GLTFLoader().parseAsync(bytes.buffer, "");
      model.scene.updateMatrixWorld(true);
      let masker = 0;
      const geometrier = new Set();
      model.scene.traverse((obj) => {
        assert.ok(obj.matrixWorld.elements.every(Number.isFinite), `${fil}/${obj.name}: transform`);
        if (!obj.isMesh) return;
        masker++;
        const g = obj.geometry;
        if (geometrier.has(g)) return;
        geometrier.add(g);
        assert.ok(g.attributes.position?.count > 0, `${fil}/${obj.name}: hjørner`);
        for (const [navn, a] of Object.entries(g.attributes)) {
          assert.ok([...a.array].every(Number.isFinite), `${fil}/${obj.name}/${navn}: ingen NaN eller Infinity`);
        }
        if (g.index) {
          assert.ok(
            [...g.index.array].every((i) => i >= 0 && i < g.attributes.position.count),
            `${fil}: trekantsindekser`,
          );
        }
        g.computeBoundingBox();
        g.computeBoundingSphere();
        assert.ok(
          [
            ...g.boundingBox.min.toArray(),
            ...g.boundingBox.max.toArray(),
            ...g.boundingSphere.center.toArray(),
            g.boundingSphere.radius,
          ].every(Number.isFinite),
          `${fil}: synlighedsområde`,
        );
      });
      assert.ok(masker > 0, `${fil}: synlig geometri`);
      const område = new THREE.Box3().setFromObject(model.scene);
      assert.ok(!område.isEmpty(), `${fil}: verdenen har udstrækning`);
      assert.ok([...område.min.toArray(), ...område.max.toArray()].every(Number.isFinite), `${fil}: verdensgrænser`);
    }
  });
}

// En model kan være gyldig alene, men have et forkert navn eller en ugyldig instans i spillets scene.
Deno.test("Krystaljægerne: faktiske Blender-modeller bygger ø, seks grotter og alle figurer", async () => {
  const bibliotek = {};
  for (const navn of ["eventyr", "detaljer"]) {
    const data = await Deno.readFile(new URL(`../../spil/krystaljaegerne/modeller/${navn}.glb`, import.meta.url));
    const model = await new GLTFLoader().parseAsync(data.buffer, "");
    for (const obj of model.scene.children) bibliotek[obj.name] = obj;
  }
  const scener = [bygØ(bibliotek, 12).rod];
  for (let id = 0; id < 3; id++) {
    for (let dybde = 1; dybde <= 2; dybde++) {
      scener.push(bygGrotte(bibliotek, danGrotte(271, id, dybde), dybde === 2).rod);
    }
  }
  for (
    const navn of [
      "eventyrer",
      "følgesvend",
      "sværd",
      "bue",
      "stav",
      "slim",
      "stenvogter",
      "krystaldyr",
      "kiste",
      "krystal",
      "portal",
    ]
  ) {
    assert.ok(bibliotek[navn], `Figurmodellen mangler: ${navn}`);
    scener.push(kopi(bibliotek, navn, 10, 12, .7));
  }
  for (const scene of scener) {
    scene.updateMatrixWorld(true);
    scene.traverse((obj) => {
      assert.ok(obj.matrixWorld.elements.every(Number.isFinite), `Sceneobjekt ${obj.name}: transform`);
      if (obj.isInstancedMesh) {
        assert.ok(obj.count > 0 && obj.count <= obj.instanceMatrix.count, "Gyldigt antal instanser");
        assert.ok([...obj.instanceMatrix.array].every(Number.isFinite), "Alle instanser har endelige koordinater");
        obj.computeBoundingSphere();
        assert.ok(Number.isFinite(obj.boundingSphere.radius), "Instanserne har endelig synlighedsgrænse");
      }
    });
    assert.ok(!new THREE.Box3().setFromObject(scene).isEmpty(), "Scenen kan tegnes");
  }
});
