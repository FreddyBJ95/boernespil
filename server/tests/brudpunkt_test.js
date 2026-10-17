import { strict as assert } from "node:assert";
import { createContext, runInNewContext, SourceTextModule, SyntheticModule } from "node:vm";
import { basename, resolve, sep } from "node:path";
import { BroekraftServer } from "../main.js";
import { Verdenslager } from "../verdener.js";
import { spilfiler } from "./tre-verdener-filer.js";

const projekt = new URL("../../", import.meta.url);
const læs = (sti) => Deno.readTextFile(new URL(sti, projekt));

// Den faktiske HTML-indgang skal starte spillet én gang eller vise hjælp ved manglende moduler.
Deno.test("Brudpunkt: HTML-opstart kalder startlaget og viser en synlig fejl ved fil- og netværksfejl", async () => {
  const html = await læs("spil/brudpunkt/index.html");
  const kode = html.match(/<script id="spilstart"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(kode, "Den normale indgang skal selv starte spillet");
  for (const protocol of ["http:", "file:"]) {
    for (const fejl of [false, true]) {
      const elementer = {
        spilstart: { dataset: { spil: "./spil.js" } },
        indlaesning: { textContent: "Åbner prøvefeltet …" },
        opstartsfejl: { hidden: true },
        opstartsvejledning: { textContent: "Spillets filer kunne ikke hentes." },
        streg: { hidden: false },
      };
      const kontekst = createContext({
        document: {
          getElementById: (id) => elementer[id],
          querySelector: (s) => s === ".laesestreg" ? elementer.streg : null,
        },
        location: { protocol },
      });
      let starter = 0;
      const modul = new SourceTextModule(kode, {
        context: kontekst,
        importModuleDynamically: async (sti) => {
          assert.equal(sti, "../3d-faelles/start.js");
          if (fejl) throw new TypeError("Modulet kunne ikke hentes");
          const start = new SyntheticModule(["startSpil"], function () {
            this.setExport("startSpil", (script) => {
              assert.equal(script, elementer.spilstart);
              starter++;
            });
          }, { context: kontekst });
          await start.link(() => {});
          await start.evaluate();
          return start;
        },
      });
      await modul.link(() => {});
      await modul.evaluate();
      assert.equal(starter, fejl ? 0 : 1);
      assert.equal(elementer.opstartsfejl.hidden, !fejl);
      assert.equal(elementer.streg.hidden, fejl);
      if (fejl) {
        assert.equal(elementer.indlaesning.textContent, "Spillet kunne ikke åbnes.");
        assert.match(elementer.opstartsvejledning.textContent, protocol === "file:" ? /serveren/ : /kunne ikke hentes/);
      }
    }
  }
});

// Offline-prøven finder spillets faktiske filer; en ny lyd kan dermed ikke glemmes.
Deno.test("Brudpunkt: alle 27 lyde, fysik og modeller er på offline-listen", async () => {
  const ramme = { self: { addEventListener() {} } };
  runInNewContext(await læs("sw.js") + ";globalThis.prøve = { filer: FILER, cache: CACHE };", ramme);
  assert.match(ramme.prøve.cache, /^boernespil-v\d+$/);
  const filer = new Set(ramme.prøve.filer);
  const aktuelle = await spilfiler("brudpunkt");
  assert.equal(aktuelle.filter((f) => f.endsWith(".mp3")).length, 27);
  for (const fil of aktuelle) assert.ok(filer.has(fil), `Offline-filen mangler: ${fil}`);
  assert.ok(filer.has("spil/brudpunkt/"));
  assert.ok(filer.has("spil/brudpunkt/rapier/rapier.mjs"));
  assert.ok(filer.has("spil/brudpunkt/rapier/LICENSE-RAPIER.txt"));
  assert.ok(!aktuelle.some((f) => /(?:\.test\.mjs|\.blend|\/blender\/|\.py)$/.test(f)));
});

// Den voksenbeskyttede indgang ligger i det eksisterende rum og bruger samme lås.
Deno.test("Brudpunkt: Spilkassens voksenrum linker til det nye spil", async () => {
  const html = await læs("index.html");
  assert.match(html, /href="spil\/brudpunkt\/"[\s\S]*?src="spil\/brudpunkt\/forside\.jpg"[\s\S]*?BRUDPUNKT/);
  assert.match(html, /Byg et prøvefelt, udløs fiktive energipulser/);
  assert.match(await læs("spil/brudpunkt/spil.js"), /await\s+lås\(/);
});

// GET og HEAD skal levere en rigtig MJS-fil, ikke en HTML-fallback med forkert MIME.
Deno.test("Brudpunkt: familieserveren leverer fysik, licens og modeller med GET og HEAD", async () => {
  const rod = await Deno.makeTempDir({ prefix: "brudpunkt-server-test-" });
  const testrod = resolve(rod, "..");
  const app = new BroekraftServer({ lager: new Verdenslager(rod), adresser: ["192.168.1.23"] });
  await app.init();
  try {
    for (
      const [sti, type] of [
        ["rapier/rapier.mjs", "text/javascript; charset=utf-8"],
        ["rapier/LICENSE-RAPIER.txt", "text/plain; charset=utf-8"],
        ["rapier/PROVENIENS.txt", "text/plain; charset=utf-8"],
        ["modeller/brudpunkt.glb", "model/gltf-binary"],
        ["modeller/opskrifter.json", "application/json"],
        ["lyde/glas.mp3", "audio/mpeg"],
      ]
    ) {
      const kilde = await Deno.readFile(new URL(`spil/brudpunkt/${sti}`, projekt));
      const url = `http://192.168.1.23:8080/spil/brudpunkt/${sti}`;
      for (const method of ["GET", "HEAD"]) {
        const svar = await app.håndter(new Request(url, { method }), { remoteAddr: { hostname: "192.168.1.42" } });
        assert.equal(svar.status, 200, `${method} ${sti}`);
        assert.equal(svar.headers.get("content-type"), type, sti);
        assert.equal(svar.headers.get("content-length"), String(kilde.byteLength), sti);
        assert.equal(svar.headers.get("x-content-type-options"), "nosniff", sti);
        assert.deepEqual(new Uint8Array(await svar.arrayBuffer()), method === "GET" ? kilde : new Uint8Array(), sti);
      }
    }
  } finally {
    await app.luk();
    const sti = resolve(rod);
    if (!sti.startsWith(testrod + sep) || !basename(sti).startsWith("brudpunkt-server-test-")) {
      throw new Error("Forkert testmappe");
    }
    await Deno.remove(sti, { recursive: true });
  }
});

// Hver fysikdel skal have netop sin egen synlige model med centrum samme sted.
Deno.test("Brudpunkt: Blender-modellen passer til hver fysikdel og har indbygget geometri", async () => {
  const opskrifter = JSON.parse(await læs("spil/brudpunkt/modeller/opskrifter.json"));
  const bytes = await Deno.readFile(new URL("spil/brudpunkt/modeller/brudpunkt.glb", projekt));
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(header.getUint32(0, true), 0x46546c67);
  assert.equal(header.getUint32(8, true), bytes.byteLength);
  const model = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + header.getUint32(12, true))));
  assert.match(model.asset.generator, /Blender/);
  assert.ok(model.buffers.every((buffer) => !buffer.uri));
  assert.ok((model.images ?? []).every((billede) => !billede.uri));
  for (const [type, opskrift] of Object.entries(opskrifter)) {
    for (const del of opskrift.dele) {
      const navn = `${type}__${del.id}`;
      const noder = model.nodes.filter((node) => node.name === navn);
      assert.equal(noder.length, 1, `${navn}: én synlig del pr. fysikdel`);
      const node = noder[0];
      assert.ok(node.mesh !== undefined || node.children?.some((i) => model.nodes[i].mesh !== undefined), `${navn}: geometri`);
      for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs((node.translation?.[i] ?? 0) - del.p[i]) < 0.0001, `${navn}: delens centrum`);
      }
    }
  }
});

// Den indbyggede motor er den originale Apache-2.0-pakke fra den noterede udgave.
Deno.test("Brudpunkt: fysikmotorens bytes og licens stemmer med proveniensen", async () => {
  const sti = new URL("spil/brudpunkt/rapier/rapier.mjs", projekt);
  const bytes = await Deno.readFile(sti);
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0"))
    .join("");
  assert.equal(sha, "02dc6a4e2fffc013bab08fbb44fa68f501d8303615e9afe4c7d89ad4eedda0d0");
  assert.match(await læs("spil/brudpunkt/rapier/PROVENIENS.txt"), new RegExp(sha));
  assert.match(
    await læs("spil/brudpunkt/rapier/LICENSE-RAPIER.txt"),
    /Apache License[\s\S]*Version 2\.0[\s\S]*Copyright 2020 Dimforge EURL/,
  );
});
