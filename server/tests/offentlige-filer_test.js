import { strict as assert } from "node:assert";
import { offentligeSpilfiler, prøvOffentligeFiler } from "./offentlige-filer.js";

const projekt = new URL("../../", import.meta.url);
const typer = {
  js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8", css: "text/css; charset=utf-8",
  json: "application/json", bin: "application/octet-stream", glb: "model/gltf-binary",
  png: "image/png", jpg: "image/jpeg", webp: "image/webp",
};
const kildefiler = new Map();
const kilde = sti => {
  if (!kildefiler.has(sti)) kildefiler.set(sti, Deno.readFile(new URL(sti.slice(1), projekt)));
  return kildefiler.get(sti);
};

// En pakkeprøve får HTTP-svar uden adgang til kildefiler; ændringer i svarene skal opdages alligevel.
function pakkesvar({ mangler, afkortet } = {}) {
  const kald = new Map();
  const hent = async (sti, { method = "GET" } = {}) => {
    const nøgle = `${method} ${sti}`;
    kald.set(nøgle, (kald.get(nøgle) || 0) + 1);
    if (sti === mangler) return new Response(method === "HEAD" ? null : "Mangler i pakken", { status: 404 });
    let bytes = await kilde(sti);
    if (sti === afkortet) bytes = bytes.subarray(0, bytes.length - 4);
    return new Response(method === "HEAD" ? null : bytes, {
      headers: {
        "content-type": typer[sti.split(".").at(-1)],
        "content-length": String(bytes.byteLength),
        "x-content-type-options": "nosniff", "cache-control": "public, max-age=3600",
      },
    });
  };
  return { hent, kald };
}

Deno.test("Offentlige spilfiler: nye filer opdages uden at besøge private mapper, links eller Blender-kilder", async () => {
  const besøg = [];
  const almindelig = name => ({ name, isFile: true, isDirectory: false, isSymlink: false });
  const læsMappe = async function* (url) {
    besøg.push(url.pathname);
    for (const navn of ["nyt-modul.js", "index.html", "ny-model.glb", "lys_ny.json", "lys_ny.bin", "lys_ny.webp",
      "lys.json", "sand_farve.webp", "teksturer.json", ".hemmelig.js", "lager.json", "verden_test.js", "model.blend", "kilde.py",
      "../server.js", "hemmelig%2f.js", "modul?.js", "modul#privat.js"]) yield almindelig(navn);
    yield { ...almindelig("link.js"), isSymlink: true };
    for (const name of ["blender", "server", ".git", "privat"]) yield { name, isFile: false, isDirectory: true, isSymlink: false };
  };
  const filer = await offentligeSpilfiler(læsMappe), stier = new Set(filer.map(([sti]) => sti));
  assert.equal(besøg.length, 8, "Kun de otte præcist godkendte mapper må åbnes");
  assert.ok(besøg.every(sti => /\/spil\/(fisk|rulle-rasmus|sigtekorn)(\/(modeller|teksturer|baner))?\/$/.test(sti)));
  assert.ok(stier.has("/spil/fisk/nyt-modul.js"));
  assert.ok(stier.has("/spil/rulle-rasmus/modeller/ny-model.glb"));
  assert.ok(stier.has("/spil/sigtekorn/baner/nyt-modul.js"));
  assert.ok(stier.has("/spil/sigtekorn/modeller/lys_ny.bin"));
  assert.ok(!stier.has("/spil/sigtekorn/modeller/lager.json"));
  assert.ok(!stier.has("/spil/fisk/ny-model.glb"), "Modeltyper er kun tilladt i modelmapperne");
  assert.ok(filer.every(([sti]) => !/(hemmelig|privat|server|link\.js|_test\.|\.blend|\.py)/.test(sti)));
  assert.equal(stier.size, filer.length, "Filerne må ikke prøves dobbelt");
});

Deno.test("Offentlige spilfiler: alle aktuelle Fisk/Rasmus/Sigtekorn-filer får præcis GET og HEAD samt kildebytes", async () => {
  const { hent, kald } = pakkesvar();
  await prøvOffentligeFiler(hent, kilde);
  const filer = await offentligeSpilfiler();
  for (const [sti] of filer) {
    assert.equal(kald.get(`GET ${sti}`), 1, sti);
    assert.equal(kald.get(`HEAD ${sti}`), 1, sti);
  }
  for (const sti of ["/spil/fisk/modeller/hav.glb", "/spil/rulle-rasmus/modeller/rasmus.glb",
    "/spil/sigtekorn/baner/havnen.js", "/spil/sigtekorn/modeller/minigun.glb", "/spil/sigtekorn/modeller/lys_havnen.webp"]) {
    assert.equal(kald.get(`HEAD ${sti}`), 1, `${sti}: den nye officielle fil skal med`);
  }
});

Deno.test("Offentlige spilfiler: manglende nye modeller, banemodul og lysatlas får pakketesten til at fejle", async () => {
  for (const mangler of ["/spil/fisk/modeller/hav.glb", "/spil/rulle-rasmus/modeller/rasmus.glb",
    "/spil/sigtekorn/baner/havnen.js", "/spil/sigtekorn/modeller/minigun.glb", "/spil/sigtekorn/modeller/lys_havnen.webp"]) {
    await assert.rejects(() => prøvOffentligeFiler(pakkesvar({ mangler }).hent), fejl => {
      assert.match(fejl.message, new RegExp(mangler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return true;
    });
  }
});

Deno.test("Offentlige spilfiler: både Støvbyens og Havnens lyskoordinater skal passe til metadata", async () => {
  for (const afkortet of ["/spil/sigtekorn/modeller/lys.bin", "/spil/sigtekorn/modeller/lys_havnen.bin"]) {
    await assert.rejects(() => prøvOffentligeFiler(pakkesvar({ afkortet }).hent), /lyskoordinaterne skal passe/);
  }
});
