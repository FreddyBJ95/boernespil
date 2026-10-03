import { basename, resolve, sep } from "node:path";
import { strict as assert } from "node:assert";
import { runInNewContext } from "node:vm";
import { BroekraftServer } from "../main.js";
import { Verdenslager } from "../verdener.js";
import { prøvVoksenverden, spilfiler, VOKSENVERDENER } from "./tre-verdener-filer.js";

// Alle modeller, biblioteker og spilfiler skal være på den faktiske offline-liste.
Deno.test("Voksenverdener: offline-cache medtager hele spillet og lokale 3D-biblioteker", async () => {
  const kode = await Deno.readTextFile(new URL("../../sw.js", import.meta.url));
  const ramme = { self: { addEventListener() {} } };
  runInNewContext(kode + ";globalThis.prøveFiler = FILER;", ramme);
  const filer = new Set(ramme.prøveFiler);
  for (const id of VOKSENVERDENER) {
    for (const fil of await spilfiler(id)) assert.ok(filer.has(fil), `Offline-filen mangler: ${fil}`);
  }
  for (const fil of ["three.module.js", "GLTFLoader.js", "BufferGeometryUtils.js", "start.js"]) {
    assert.ok(filer.has(`spil/3d-faelles/${fil}`));
  }
  assert.ok(filer.has("spil/laas.js"));
});

// De tre nye spils komplette modelpakker skal også kunne leveres til en tablet.
for (const id of VOKSENVERDENER) {
  Deno.test(`Voksenverden: ${id}, alle browserfiler og Blender-modeller med GET/HEAD`, async () => {
    const rod = await Deno.makeTempDir({ prefix: "voksenverden-test-" });
    const testrod = resolve(rod, "..");
    const app = new BroekraftServer({ lager: new Verdenslager(rod), adresser: ["192.168.1.23"] });
    await app.init();
    try {
      await prøvVoksenverden(
        (sti, options) =>
          app.håndter(new Request("http://192.168.1.23:8080" + sti, options), {
            remoteAddr: { hostname: "192.168.1.42" },
          }),
        id,
        true,
      );
    } finally {
      await app.luk();
      const sti = resolve(rod);
      if (!sti.startsWith(testrod + sep) || !basename(sti).startsWith("voksenverden-test-")) {
        throw new Error("Forkert testmappe");
      }
      await Deno.remove(sti, { recursive: true });
    }
  });
}
