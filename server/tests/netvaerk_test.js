import { strict as assert } from "node:assert";
import { Netværkstjek, læsProfiler } from "../netvaerk.js";

Deno.test("Netværk: kun serverens netkort medtages, også ved flere profiler", () => {
  const profiler = læsProfiler(JSON.stringify([
    { profil: "Public", adresser: ["192.168.1.2"] },
    { profil: "Private", adresser: ["10.0.0.2", "169.254.1.1"] },
    { profil: "Public", adresser: ["172.16.0.3"] },
  ]), ["192.168.1.2", "10.0.0.2"]);
  assert.deepEqual(profiler, [{ profil: "Public", adresser: ["192.168.1.2"] }, { profil: "Private", adresser: ["10.0.0.2"] }]);
  assert.equal(læsProfiler('{"profil":"DomainAuthenticated","adresser":["10.0.0.2"]}', ["10.0.0.2"])[0].profil, "DomainAuthenticated");
  assert.throws(() => læsProfiler("ødelagt", []));
});

Deno.test("Netværk: tjek deles og opdateres efter et minut; fejl stopper ikke serveren", async () => {
  let tid = 100, kald = 0, afslut;
  const tjek = new Netværkstjek({ platform: "windows", nu: () => tid, kør: () => { kald++; return new Promise(r => { afslut = r; }); } });
  const a = tjek.hent(["10.0.0.2"]), b = tjek.hent(["10.0.0.2"]);
  assert.equal(kald, 1);
  afslut('[{"profil":"Private","adresser":["10.0.0.2"]}]');
  assert.deepEqual(await a, await b); assert.equal((await a).status, "klar");
  await tjek.hent(["10.0.0.2"]); assert.equal(kald, 1);
  tid += 60001; const c = tjek.hent(["10.0.0.2"]); assert.equal(kald, 2);
  afslut("forkert JSON"); assert.equal((await c).status, "ukendt");
  const fejl = new Netværkstjek({ platform: "windows", kør: () => { throw new Error("Ingen adgang"); } });
  assert.equal((await fejl.hent([])).status, "ukendt");
  const mac = new Netværkstjek({ platform: "darwin", kør: () => { throw new Error("Må ikke køres"); } });
  assert.equal((await mac.hent([])).status, "ikke-windows");
});
