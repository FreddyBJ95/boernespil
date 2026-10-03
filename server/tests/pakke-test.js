import { strict as assert } from "node:assert";
import { forbind } from "../../spil/broekraft/net.js";
import { ID } from "../../spil/broekraft/blokke.js";
import { MIDT } from "../../spil/broekraft/uendelig.js";
import { UDGAVE } from "../verdener.js";
import { VOKSENVERDENER, prøvVoksenverden } from "./tre-verdener-filer.js";
import { prøvOffentligeFiler, prøvPrivateFiler } from "./offentlige-filer.js";

// Køres mod en færdig pakke med en tom, isoleret datamappe, ikke familiens server.
const base = Deno.args[0];
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw new Error("Angiv den lokale testservers HTTP-adresse");
const klienter = [], verdener = [], status = async () => await (await fetch(base + "/api/status")).json();
const { token, version } = await status(); assert.equal(version, UDGAVE);
for (const id of VOKSENVERDENER) await prøvVoksenverden((sti, options) => fetch(base + sti, options), id);
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
async function åbn(id, vedKlump) {
  const f = await forbind(base.replace("http:", "ws:") + "/ws"); klienter.push(f); f.udsyn(1);
  const land = hændelse(f, "klump"); await f.vælg(id); const første = await land; vedKlump?.(første); return f;
}

// Den indbyggede opskrift og bloktabel skal virke både ved deling og indlæsning af gemte data.
async function enhjørningeland() {
  const id = await opret("enhjorning");
  let første;
  const a = await åbn(id, k => { første = k; }), ven = await åbn(id);
  assert.equal(a.info.verden.type, "enhjorning");
  assert.deepEqual([første.cx, første.cz, første.højde], [4, 4, 64]);
  assert.ok(første.data.includes(ID["Lyserødt græs"]), "Serverens opskrift skal sende lyserødt græs");
  assert.ok(første.data.includes(ID.Perlemor), "Startpladsens perlemor skal med i serverklumpen");
  const navne = ["Lyserødt græs", "Lilla blade", "Mintblade", "Regnbueblomst", "Perlemor"];
  const bygning = navne.map((navn, i) => ({ x: 68 + i, y: 40, z: 64, id: ID[navn] }));
  for (const blok of bygning) {
    assert.ok(Number.isInteger(blok.id), "Klienten skal kende den nye blok");
    const matcher = b => ["x", "y", "z", "id"].every(nøgle => b[nøgle] === blok[nøgle]);
    const hosBegge = [hændelse(a, "blok", matcher), hændelse(ven, "blok", matcher)];
    a.sæt(blok.x, blok.y, blok.z, blok.id); await Promise.all(hosBegge);
  }

  // Ridning deles gennem net.pos og er også synlig for et barn, der kommer ind senere.
  const dig = a.info.dig, hjem = a.info.spillere.find(p => p.id === dig);
  const ridning = hændelse(ven, "pos", b => b.liste.some(p => p.id === dig && p.rid === "pegasus"));
  a.pos(hjem.x, hjem.y, hjem.z, 0, 0, "pegasus"); await ridning;
  const tredje = await åbn(id);
  assert.equal(tredje.info.spillere.find(p => p.id === dig).rid, "pegasus", "Velkomsten skal vise dem, der allerede rider");
  const ståetAf = hændelse(ven, "pos", b => b.liste.some(p => p.id === dig && !Object.hasOwn(p, "rid")));
  a.pos(hjem.x, hjem.y, hjem.z, 0, 0, null); await ståetAf;
  tredje.luk();
  a.luk(); ven.luk(); await handling("stop", { id }); await handling("start", { id });
  let gemt;
  const ny = await åbn(id, k => { gemt = k; });
  for (const blok of bygning) {
    const indeks = (blok.x & 15) + (blok.z & 15) * 16 + blok.y * 256;
    assert.equal(gemt.data[indeks], blok.id, "Alle nye blokke skal overleve gemning og indlæsning");
    const fjernet = hændelse(ny, "blok", b => b.x === blok.x && b.y === blok.y && b.z === blok.z && b.id === 0);
    ny.sæt(blok.x, blok.y, blok.z, 0); await fjernet;
  }
  ny.luk(); await handling("stop", { id });
}

// To rigtige forbindelser prøver effekternes vej gennem det kompilerede program.
async function deltEffekt(afsender, modtager, position) {
  const ekko = [], lyt = e => ekko.push(e.detail);
  afsender.addEventListener("effekt", lyt);
  try {
    const data = { type: "bazooka", ...position, vx: 1, vy: 0, vz: 0 };
    const svar = hændelse(modtager, "effekt", e => e.slags === "skud");
    afsender.effekt("skud", { ...data, ekstra: "skal ikke sendes videre", fra: "forkert" });
    assert.deepEqual(await svar, { slags: "skud", ...data, fra: afsender.info.dig });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(ekko.length, 0, "Afsenderen skal ikke se sin egen effekt igen");
  } finally { afsender.removeEventListener("effekt", lyt); }
}
try {
  // Den kompilerede server skal medtage filernes bytes, ikke kun kende deres adresser.
  const hent = (sti, init) => fetch(base + sti, init);
  await prøvOffentligeFiler(hent);
  await prøvPrivateFiler(hent);
  const finite = await opret("maane"), måne = await åbn(finite);
  assert.equal(måne.info.verden.bredde, 128);
  const måneVen = await åbn(finite), hjem = måne.info.spillere.find(p => p.id === måne.info.dig);
  await deltEffekt(måne, måneVen, { x: hjem.x, y: hjem.y, z: hjem.z });
  måne.luk(); måneVen.luk(); await handling("stop", { id: finite });
  await enhjørningeland();
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
  const ven = await åbn(id); await flyt(ven);
  await deltEffekt(ny, ven, { x: x + 0.5, y: 60, z: z + 0.5 });

  // En blok otte skridt væk overlever det gamle brag og fjernes sikkert af radius ni.
  const mål = { x: x - 8, y: 5, z }, indeks = (mål.x & 15) + (mål.z & 15) * 16 + mål.y * 256;
  assert.notEqual(gemt.data[indeks], 0, "Gemningsprøven skal ændre det oprindelige land");
  const påMål = b => b.x === mål.x && b.y === mål.y && b.z === mål.z;
  const lagt = hændelse(ny, "blok", b => påMål(b) && b.id === ID.Glas);
  const lagtHosVen = hændelse(ven, "blok", b => påMål(b) && b.id === ID.Glas);
  ny.sæt(mål.x, mål.y, mål.z, ID.Glas); await Promise.all([lagt, lagtHosVen]);
  let sidsteId = ID.Glas;
  const lyt = e => { if (påMål(e.detail)) sidsteId = e.detail.id; };
  ny.addEventListener("blok", lyt);
  const punkt = { x: x + 0.5, y: mål.y + 0.5, z: z + 0.5 };
  try {
    const lille = hændelse(ny, "bum", b => b.x === punkt.x && b.y === punkt.y && b.z === punkt.z);
    ny.brag(punkt.x, punkt.y, punkt.z); await lille;
    assert.equal(sidsteId, ID.Glas, "Et almindeligt brag skal beholde radius 3,3");
    const væk = hændelse(ny, "blok", b => påMål(b) && b.id === 0);
    const vækHosVen = hændelse(ven, "blok", b => påMål(b) && b.id === 0);
    const stort = hændelse(ven, "bum", b => b.slags === "atom" && b.x === punkt.x);
    ny.brag(punkt.x, punkt.y, punkt.z, "atom"); await Promise.all([væk, vækHosVen, stort]);
  } finally { ny.removeEventListener("blok", lyt); }
  ny.luk(); ven.luk(); await handling("stop", { id }); await handling("start", { id });
  const efterBrag = await åbn(id), sprængt = await flyt(efterBrag);
  assert.equal(sprængt.data[indeks], 0, "Serverens store brag skal overleve genstart");
  console.log("Færdig pakke: Spilkassens billeder, appikoner, Sigtekorns modeller/teksturer/lys, GET/HEAD og filafskærmning, begge workers, WebSocket, Enhjørningeland og nye blokke, delt ridning, delte effekter, almindeligt og stort brag, højt hjem, fjern bygning og gemning efter genstart består.");
} finally {
  for (const f of klienter) f.luk();
  for (const id of verdener) await handling("stop", { id });
}
