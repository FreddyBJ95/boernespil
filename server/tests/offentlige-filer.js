import { strict as assert } from "node:assert";

// Forsidens billeder og ikoner skal være tilgængelige på både kilde- og pakkeserveren.
const billeder = [
  ...["ordmaerke", "kasseven-vinker", "kasseven-taenker", "kasseven-sover", "kasseven-fejrer"]
    .map(navn => [`/billeder/spilkassen/${navn}.webp`, "image/webp"]),
  ["/billeder/spilkassen/logo.png", "image/png"],
  ["/billeder/spilkassen/maskoter/kasseven-vinker.png", "image/png"],
  ["/billeder/sigtekorn.jpg", "image/jpeg"],
  ...["favicon", "apple-touch-icon", "icon-maskable-512"].map(navn => [`/${navn}.png`, "image/png"]),
];

// Filernes signaturer fanger fx en HTML-fejlside, selv hvis status og MIME ser rigtige ud.
function prøvIndhold(data, mime, sti) {
  assert.ok(data.length > 0, `${sti}: GET skal have indhold`);
  const tekst = (start, slut) => new TextDecoder().decode(data.subarray(start, slut));
  if (mime === "image/png") assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], sti);
  if (mime === "image/jpeg") assert.deepEqual([...data.subarray(0, 3)], [255, 216, 255], sti);
  if (mime === "image/webp") {
    assert.equal(tekst(0, 4), "RIFF", sti);
    assert.equal(tekst(8, 12), "WEBP", sti);
  }
  if (mime === "model/gltf-binary") {
    assert.equal(tekst(0, 4), "glTF", sti);
    const header = new DataView(data.buffer, data.byteOffset, data.byteLength);
    assert.equal(header.getUint32(4, true), 2, `${sti}: GLB-version`);
    assert.equal(header.getUint32(8, true), data.length, `${sti}: hele modellen skal med`);
  }
  if (mime === "application/json") JSON.parse(tekst(0, data.length));
}

// GET leverer de rigtige bytes; HEAD giver de samme headere uden en filkrop.
export async function prøvOffentligeFiler(hent, læsKilde) {
  const prøv = async (sti, mime) => {
    const svar = await hent(sti), data = new Uint8Array(await svar.arrayBuffer());
    assert.equal(svar.status, 200, sti);
    assert.equal(svar.headers.get("content-type"), mime, sti);
    assert.equal(svar.headers.get("x-content-type-options"), "nosniff", sti);
    prøvIndhold(data, mime, sti);
    if (læsKilde) assert.deepEqual(data, await læsKilde(sti), `${sti}: filen skal leveres uændret`);
    const head = await hent(sti, { method: "HEAD" }), tom = await head.arrayBuffer();
    assert.equal(head.status, 200, `${sti}: HEAD`);
    assert.equal(head.headers.get("content-type"), mime, `${sti}: HEAD MIME`);
    assert.equal(head.headers.get("x-content-type-options"), "nosniff", `${sti}: HEAD nosniff`);
    assert.equal(head.headers.get("cache-control"), svar.headers.get("cache-control"), `${sti}: HEAD cache`);
    assert.equal(tom.byteLength, 0, `${sti}: HEAD må ikke sende filen`);
    return data;
  };
  for (const [sti, mime] of billeder) await prøv(sti, mime);

  // Sigtekorn henter både soldaten, våbnene, teksturerne og det bagte lys lokalt.
  for (const navn of ["soldat", "gevaer", "pistol", "snig", "kniv"]) {
    await prøv(`/spil/sigtekorn/modeller/${navn}.glb`, "model/gltf-binary");
  }
  const fotos = JSON.parse(new TextDecoder().decode(await prøv("/spil/sigtekorn/teksturer/teksturer.json", "application/json")));
  for (const navn of Object.keys(fotos)) for (const kort of ["farve", "normal", "arm"]) {
    await prøv(`/spil/sigtekorn/teksturer/${navn}_${kort}.webp`, "image/webp");
  }
  const lys = JSON.parse(new TextDecoder().decode(await prøv("/spil/sigtekorn/modeller/lys.json", "application/json")));
  const koordinater = await prøv("/spil/sigtekorn/modeller/lys.bin", "application/octet-stream");
  assert.equal(koordinater.byteLength, lys.masker.reduce((sum, maske) => sum + maske.hjørner, 0) * 4,
    "Lyskoordinaterne skal passe til alle hjørner i banens masker");
  await prøv("/spil/sigtekorn/modeller/lys.webp", "image/webp");
}

// Flere offentlige filer må ikke åbne adgang til serverkode, skjulte filer eller stier uden for mapperne.
export async function prøvPrivateFiler(hent) {
  const stier = [
    "/server/main.js", "/server/verdener.js", "/.git/config", "/AGENTS.md",
    "/billeder-spilkassen/logo.png", "/billeder/.git/config",
    "/billeder/%2e%2e%2fserver/main.js", "/billeder/%2e%2e%2findex.html",
    "/billeder/%2e%2e%5cserver/main.js", "/billeder/spilkassen/logo.png%00",
    "/spil/%2e%2e%2fserver/main.js",
  ];
  for (const sti of stier) for (const method of ["GET", "HEAD"]) {
    const svar = await hent(sti, { method }); await svar.arrayBuffer();
    assert.equal(svar.status, 404, `${method} ${sti}`);
  }
}
