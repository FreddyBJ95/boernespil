import { strict as assert } from "node:assert";

export const VOKSENVERDENER = ["det-sidste-lys", "skrotstorm", "krystaljaegerne"];
const projekt = new URL("../../", import.meta.url);
const filtyper = {
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  html: "text/html; charset=utf-8",
  json: "application/json",
  glb: "model/gltf-binary",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

// Find alle spillets faktiske browserfiler, så en ny model eller tekstur ikke bliver glemt i pakketesten.
export async function spilfiler(id) {
  assert.ok(VOKSENVERDENER.includes(id));
  const filer = [];
  async function gå(sti) {
    for await (const fil of Deno.readDir(new URL(sti, projekt))) {
      if (fil.name.startsWith(".") || fil.name === "blender") continue;
      const navn = `${sti}/${fil.name}`;
      if (fil.isDirectory) await gå(navn);
      else if (
        fil.isFile && filtyper[fil.name.split(".").at(-1)] &&
        !/([._]test\.|^package\.json$)/.test(fil.name)
      ) filer.push(navn);
    }
  }
  await gå(`spil/${id}`);
  return filer.sort();
}

// Blender-GLB skal have hele sin geometri indbygget; en HTML-fejlside kan aldrig tælle som en model.
function prøvGLB(bytes, sti) {
  assert.ok(bytes.byteLength >= 20, sti);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(dv.getUint32(0, true), 0x46546c67, sti);
  assert.equal(dv.getUint32(4, true), 2, sti);
  assert.equal(dv.getUint32(8, true), bytes.byteLength, `${sti}: hele GLB-filen`);
  assert.equal(dv.getUint32(16, true), 0x4e4f534a, sti);
  const længde = dv.getUint32(12, true);
  const model = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + længde)));
  assert.match(model.asset.generator, /Blender/i, `${sti}: modellen skal være eksporteret af Blender`);
  assert.ok(model.nodes?.length && model.meshes?.length, `${sti}: modellen skal indeholde geometri`);
  assert.ok(model.buffers.every((b) => !b.uri), `${sti}: geometri må ikke ligge i en manglende ekstern fil`);
}

// Samme prøve bruges mod kildekoden og det selvstændige program, fra en isoleret datamappe.
export async function prøvVoksenverden(hent, id, sammenlignKilde = false) {
  const filer = await spilfiler(id);
  assert.ok(filer.includes(`spil/${id}/index.html`) && filer.includes(`spil/${id}/forside.jpg`), id);
  assert.ok(filer.some((f) => f.endsWith(".glb")), `${id}: Blender-modeller skal følge spillet`);
  for (const sti of filer) {
    const svar = await hent("/" + sti), data = new Uint8Array(await svar.arrayBuffer());
    assert.equal(svar.status, 200, sti);
    assert.equal(svar.headers.get("content-type"), filtyper[sti.split(".").at(-1)], sti);
    assert.equal(svar.headers.get("x-content-type-options"), "nosniff", sti);
    assert.ok(data.length, sti);
    if (sammenlignKilde) assert.deepEqual(data, await Deno.readFile(new URL(sti, projekt)), sti);
    if (sti.endsWith(".glb")) prøvGLB(data, sti);
    if (sti.endsWith(".jpg")) assert.deepEqual([...data.subarray(0, 3)], [255, 216, 255], sti);
    const head = await hent("/" + sti, { method: "HEAD" });
    assert.equal(head.status, 200, sti);
    assert.equal(head.headers.get("content-type"), svar.headers.get("content-type"), sti);
    assert.equal(head.headers.get("content-length"), String(data.byteLength), `${sti}: HEAD beskriver hele filens størrelse`);
    assert.equal((await head.arrayBuffer()).byteLength, 0, sti);
  }
  for (const fil of ["three.module.js", "GLTFLoader.js", "BufferGeometryUtils.js", "start.js"]) {
    const svar = await hent(`/spil/3d-faelles/${fil}`);
    assert.equal(svar.status, 200, fil);
    assert.equal(svar.headers.get("content-type"), filtyper.js, fil);
    const kode = await svar.text();
    assert.ok(kode.length > 1000, `${fil}: hele biblioteket skal følge med`);
    if (sammenlignKilde) assert.equal(kode, await Deno.readTextFile(new URL(`spil/3d-faelles/${fil}`, projekt)), fil);
    const imports = [...kode.matchAll(/^import\s[\s\S]*?from\s+['"]([^'"]+)['"];?/gm)];
    assert.ok(
      imports.every((m) => m[1].startsWith("./") || m[1].startsWith("../")),
      `${fil}: motorens imports skal være lokale`,
    );
  }
  const licens = await hent("/spil/3d-faelles/LICENSE-three.txt");
  assert.equal(licens.status, 200);
  assert.equal(licens.headers.get("content-type"), "text/plain; charset=utf-8");
  assert.match(await licens.text(), /MIT License[\s\S]*Copyright[\s\S]*permission notice/);
  return filer.length;
}
