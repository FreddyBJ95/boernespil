import { strict as assert } from "node:assert";
import { join } from "node:path";
import { Verdenslager, metadata, UDGAVE } from "../verdener.js";
import { UendeligtLager } from "../uendelig-lager.js";
import { lavLand, MIDT, STØRRELSE } from "../../spil/broekraft/uendelig.js";
import { lavStøj } from "../../spil/broekraft/verden.js";
import { ID } from "../../spil/broekraft/blokke.js";

// Hver prøve får sin egen mappe og lukker også workerne, hvis en kontrol fejler.
async function prøve(handling) {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-uendelig-" }), åbne = [];
  const lager = new Verdenslager(rod), meta = metadata({ navn: "Årstiderne", type: "uendelig", frø: 12345 });
  await lager.gem(meta, null);
  const åbn = async (fra = lager) => {
    const { data } = await fra.indlæs(meta.id);
    if (!åbne.includes(data)) åbne.push(data);
    return data;
  };
  try { await handling({ rod, lager, meta, åbn, åbne }); }
  finally {
    for (const data of åbne) {
      try { await data.luk(); }
      catch { data.worker?.terminate(); }
    }
    await Deno.remove(rod, { recursive: true });
  }
}

Deno.test("Uendelig: metadata og skjulte verdener, mens gamle formater bevares", async () => {
  assert.equal(UDGAVE, "0.5.7");
  const u = metadata({ navn: "Uden kanter", type: "uendelig", bredde: 128 });
  assert.equal(u.version, "0.2.0"); assert.equal(u.bredde, STØRRELSE); assert.equal(u.dybde, STØRRELSE);
  assert.throws(() => metadata({ navn: "Skjult", type: "guldslot", bredde: 128 }), /verdenstype/);
  await prøve(async ({ lager }) => {
    for (const type of ["græsø", "uendelig", "guldslot"]) {
      const m = { ...metadata({ navn: "Gammel", type: "græsø", bredde: 128 }), type };
      const bytes = new Uint8Array(128 * 128 * 64); bytes[100] = ID.Planker;
      await lager.gem(m, bytes);
      const læst = await lager.indlæs(m.id);
      assert.equal(læst.meta.version, "0.1.0"); assert.equal(læst.data[100], ID.Planker);
    }
    assert.equal((await lager.liste()).length, 4);
  });
});

Deno.test("Uendelig: workerens søjler er byte-identiske med tabletten og deduplikeres", async () => {
  await prøve(async ({ åbn, meta }) => {
    const data = await åbn(), land = lavLand({ støj: lavStøj(meta.frø), ID, BY: 64, frø: meta.frø });
    for (const [cx, cz] of [[2048, 2048], [2100, 2021], [0, 4095], [2235, 2048]]) {
      const [a, b] = await Promise.all([data.indlæs(cx, cz), data.indlæs(cx, cz)]);
      assert.strictEqual(a, b); assert.deepEqual(a, land.søjle(cx, cz));
    }
    assert.equal(data.søjler.size, 4); assert.equal(data.indlæsninger.size, 0); assert.equal(data.regionLæsninger.size, 0);
    for (const cx of [-1, 4096, 1.5]) await assert.rejects(data.indlæs(cx, 2048), /Ugyldig søjle/);
  });
});

Deno.test("Uendelig: ændringen 3000 blokke hjemmefra overlever genstart og regional backup", async () => {
  await prøve(async ({ lager, rod, meta, åbn }) => {
    const data = await åbn(), x = MIDT + 3000, z = MIDT, y = 50, cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    await data.indlæs(cx, cz);
    assert.equal(data.sæt(x, y, z, ID.Planker), true);
    const kopi = await lager.backup(meta.id);
    await data.luk();
    const ny = await åbn(new Verdenslager(rod));
    assert.equal((await ny.indlæs(cx, cz))[(x % 16) + (z % 16) * 16 + y * 256], ID.Planker);
    assert.equal((await Deno.stat(join(kopi, "ændringer", `r.${Math.floor(cx / 32)}.${Math.floor(cz / 32)}.bin.gz`))).isFile, true);
    await assert.rejects(Deno.stat(join(lager.mappe(meta.id), "data.bin.gz")), Deno.errors.NotFound);
    const backup = new UendeligtLager(kopi, meta);
    try { assert.equal((await backup.indlæs(cx, cz))[(x % 16) + y * 256], ID.Planker); }
    finally { await backup.luk(); }
  });
});

Deno.test("Uendelig: en tur på 2000 blokke har et lille LRU-lager og ingen regioncache", async () => {
  await prøve(async ({ åbn }) => {
    const data = await åbn(); data.maksLager = 4;
    let størst = 0, glemt = 0;
    data.påGlem = () => glemt++;
    for (let i = 0; i <= 125; i++) {
      const cx = 2048 + i;
      await data.indlæs(cx, 2048);
      størst = Math.max(størst, data.søjler.size);
      if (i % 12 === 0) data.sæt(cx * 16, 50, MIDT, ID.Planker);
      await data.beskær(new Set([`${cx},2048`]));
      assert.ok(data.søjler.size <= 5); assert.equal(data.regionLæsninger.size, 0);
    }
    assert.ok(størst > data.søjler.size); assert.ok(glemt > 100);
    assert.equal((await data.indlæs(2048, 2048))[50 * 256], ID.Planker);
    await data.beskær(new Set(), performance.now() + data.glemEfter + 1);
    assert.equal(data.søjler.size, 0); assert.equal(data.detaljer.size, 0);
  });
});

Deno.test("Uendelig: samtidige snapshots og søjler i samme region overskriver ikke hinanden", async () => {
  await prøve(async ({ lager, rod, meta, åbn }) => {
    const data = await åbn();
    await Promise.all([data.indlæs(2048, 2048), data.indlæs(2049, 2048)]);
    data.sæt(MIDT, 50, MIDT, ID.Planker);
    const første = lager.gem(meta, data);
    data.sæt(MIDT, 50, MIDT, ID.Sten);
    data.sæt(MIDT + 16, 50, MIDT, ID.Kage);
    const anden = data.gem(), backup = lager.backup(meta.id);
    await Promise.all([første, anden, backup]);
    await data.luk();
    const ny = await åbn(new Verdenslager(rod));
    assert.equal((await ny.indlæs(2048, 2048))[50 * 256], ID.Sten);
    assert.equal((await ny.indlæs(2049, 2048))[50 * 256], ID.Kage);
    assert.equal(ny.snapshot().length, 0);
  });
});

Deno.test("Uendelig: genskabt oprindelig blok fjerner den gemte ændring", async () => {
  await prøve(async ({ lager, meta, åbn }) => {
    const data = await åbn(), bytes = await data.indlæs(2048, 2048), original = bytes[50 * 256];
    const sti = join(lager.mappe(meta.id), "ændringer", "r.64.64.bin.gz");
    data.sæt(MIDT, 50, MIDT, ID.Planker); await data.gem();
    assert.equal((await Deno.stat(sti)).isFile, true);
    data.sæt(MIDT, 50, MIDT, original); await data.gem();
    await assert.rejects(Deno.stat(sti), Deno.errors.NotFound);
    assert.equal(data.snapshot().length, 0);
  });
});

Deno.test("Uendelig: læsning fra simuleringen forhindrer ikke udløb, og synlige søjler beskyttes", async () => {
  await prøve(async ({ åbn }) => {
    const data = await åbn(), indlæst = [], glemt = [];
    data.påIndlæsning = (cx, cz) => indlæst.push(`${cx},${cz}`);
    data.påGlem = (cx, cz) => glemt.push(`${cx},${cz}`);
    await Promise.all([data.indlæs(2048, 2048), data.indlæs(2049, 2048)]);
    await data.indlæs(2048, 2048);
    assert.deepEqual(indlæst.sort(), ["2048,2048", "2049,2048"]);
    const brugt = data.detaljer.get("2049,2048").brugt;
    for (let i = 0; i < 1000; i++) data.hentSøjle(2049, 2048);
    assert.equal(data.detaljer.get("2049,2048").brugt, brugt);
    await data.beskær(new Set(["2048,2048"]), performance.now() + data.glemEfter + 1);
    assert.ok(data.hentSøjle(2048, 2048)); assert.equal(data.hentSøjle(2049, 2048), undefined);
    assert.deepEqual(glemt, ["2049,2048"]);
  });
});

Deno.test("Uendelig: en mislykket gemning beholder ændringer og søjler i hukommelsen", async () => {
  await prøve(async ({ lager, meta, åbn }) => {
    const data = await åbn(); await data.indlæs(2048, 2048);
    data.sæt(MIDT, 50, MIDT, ID.Planker);
    const mappe = join(lager.mappe(meta.id), "ændringer"), sti = join(mappe, "r.64.64.bin.gz");
    await Deno.mkdir(mappe); await Deno.writeFile(sti, new Uint8Array([1, 2, 3]));
    await assert.rejects(data.beskær(new Set(), performance.now() + data.glemEfter + 1), /beskadiget/);
    assert.equal(data.snapshot().length, 1); assert.equal(data.hentSøjle(2048, 2048)[50 * 256], ID.Planker);
    await Deno.remove(sti); await data.gem();
    await data.beskær(new Set(), performance.now() + data.glemEfter + 1);
    assert.equal(data.søjler.size, 0);
    assert.equal((await data.indlæs(2048, 2048))[50 * 256], ID.Planker);
  });
});

Deno.test("Uendelig: stop frigiver søjler og callbacks, som ellers fastholder det gamle rum", async () => {
  await prøve(async ({ åbn }) => {
    const data = await åbn();
    data.påIndlæsning = () => {}; data.påGlem = () => {};
    await data.indlæs(2048, 2048); await data.luk();
    assert.equal(data.søjler.size, 0); assert.equal(data.detaljer.size, 0); assert.equal(data.worker, null);
    assert.equal(data.påIndlæsning, null); assert.equal(data.påGlem, null);
    await assert.rejects(data.indlæs(2048, 2048), /lukket/);
  });
});

Deno.test("Uendelig: beskadigede ændringer afvises og bliver ikke skrevet hen over", async () => {
  await prøve(async ({ lager, meta, åbn }) => {
    const mappe = join(lager.mappe(meta.id), "ændringer"), sti = join(mappe, "r.64.64.bin.gz");
    await Deno.mkdir(mappe);
    const beskadiget = new Uint8Array([1, 2, 3]);
    await Deno.writeFile(sti, beskadiget);
    const data = await åbn();
    await assert.rejects(data.indlæs(2048, 2048), /beskadiget/);
    assert.equal(data.søjler.size, 0); assert.deepEqual(await Deno.readFile(sti), beskadiget);
    const komprimeret = new Uint8Array(await new Response(new Blob([new Uint8Array(10)]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
    await Deno.writeFile(sti, komprimeret);
    await assert.rejects(data.indlæs(2048, 2048), /beskadiget/);
    assert.deepEqual(await Deno.readFile(sti), komprimeret);
  });
});
