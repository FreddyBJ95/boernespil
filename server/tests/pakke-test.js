import { strict as assert } from "node:assert";
import { forbind } from "../../spil/broekraft/net.js";
import { ID } from "../../spil/broekraft/blokke.js";
import { MIDT } from "../../spil/broekraft/uendelig.js";

// Køres mod en færdig pakke med en tom, isoleret datamappe, ikke familiens server.
const base = Deno.args[0];
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error("Angiv den lokale testservers HTTP-adresse");
const klienter = [], verdener = [], status = async () => await (await fetch(base + "/api/status")).json();
const { token, version } = await status(); assert.equal(version, "0.5.0");
async function handling(navn, data) {
  const svar = await fetch(base + "/api/" + navn, { method: "POST", headers: { origin: base, "x-broekraft-token": token }, body: JSON.stringify(data) });
  const b = await svar.json(); assert.ok(svar.ok, b.fejl); return b;
}
function hændelse(f, type, vælg = () => true) {
  return new Promise((resolve, reject) => {
    const lyt = e => {
      if (!vælg(e.detail)) return;
      clearTimeout(timer); f.removeEventListener(type, lyt); resolve(e.detail);
    };
    const timer = setTimeout(() => { f.removeEventListener(type, lyt); reject(new Error(`Mangler ${type}`)); }, 10000);
    f.addEventListener(type, lyt);
  });
}
async function opret(type) {
  const { id } = await handling("opret", { navn: `Pakketest ${type}`, type, bredde: 128, frø: 12345 });
  verdener.push(id);
  for (let i = 0; i < 100; i++) {
    const b = await status(), job = b.job.find(j => j.id === id);
    assert.notEqual(job.status, "fejl", job.fejl);
    if (job.status === "færdig") return id;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("Verdenen blev ikke færdig");
}
async function åbn(id) {
  const f = await forbind(base.replace("http:", "ws:") + "/ws"); klienter.push(f); f.udsyn(1);
  const land = hændelse(f, "klump"); await f.vælg(id); await land; return f;
}
try {
  const finite = await opret("maane"), måne = await åbn(finite);
  assert.equal(måne.info.verden.bredde, 128); måne.luk(); await handling("stop", { id: finite });
  const id = await opret("uendelig"), x = MIDT + 3000, y = 40, z = MIDT;
  let f = await åbn(id);
  assert.equal(f.info.verden.uendelig, true);
  const tag = hændelse(f, "blok", b => b.x === MIDT && b.y === 63 && b.z === MIDT);
  f.sæt(MIDT, 63, MIDT, ID.Glas); await tag;
  f.luk(); await handling("stop", { id }); await handling("start", { id }); f = await åbn(id);
  assert.equal(f.info.spillere.find(p => p.id === f.info.dig).y, 64);
  const flyt = async klient => {
    const klump = hændelse(klient, "klump", k => k.cx === (x >> 4) && k.cz === (z >> 4));
    klient.send({ t: "pos", x: x + 0.5, y: 60, z: z + 0.5, yaw: 0, pitch: 0 });
    return await klump;
  };
  await flyt(f);
  const blok = hændelse(f, "blok", b => b.x === x && b.y === y && b.id === ID.Glas);
  f.sæt(x, y, z, ID.Glas); await blok; f.luk(); await handling("stop", { id });
  await handling("start", { id });
  const ny = await åbn(id), gemt = await flyt(ny);
  assert.equal(gemt.data[(x & 15) + (z & 15) * 16 + y * 256], ID.Glas);
  const fjern = hændelse(ny, "blok", b => b.x === x && b.y === y && b.id === 0);
  ny.sæt(x, y, z, 0); await fjern;
  console.log("Færdig pakke: begge workers, WebSocket, højt hjem, fjern bygning, gemning, genstart og fjernelse af blok består.");
} finally {
  for (const f of klienter) f.luk();
  for (const id of verdener) await handling("stop", { id });
}
