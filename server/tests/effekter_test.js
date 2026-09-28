import { strict as assert } from "node:assert";
import { Rum, FYRMØNSTRE } from "../rum.js";
import { metadata } from "../verdener.js";
import { ID } from "../../spil/broekraft/blokke.js";

function opsæt() {
  const rum = new Rum(metadata({ navn: "Effekter", type: "skydebane", bredde: 128, maksSpillere: 8 }), new Uint8Array(128 * 128 * 64));
  const spillere = ["a", "b"].map(id => {
    const beskeder = [], s = { id, beskeder, socket: { readyState: 1, bufferedAmount: 0, send(data) { if (typeof data === "string") beskeder.push(JSON.parse(data)); }, close() {} } };
    rum.ind(s); s.x = 64; s.y = 5; s.z = 64; return s;
  });
  return { rum, a: spillere[0], b: spillere[1] };
}
const hændelser = (s, type) => s.beskeder.filter(b => b.t === type);

Deno.test("Brag: samme blokændringer til begge, fast radius, Bundsten og TNT-kæde", () => {
  const { rum, a, b } = opsæt();
  rum.sæt(65, 5, 64, ID.Sten); rum.sæt(65, 4, 64, ID.Bundsten);
  rum.sæt(65, 5, 65, ID.TNT); rum.sæt(70, 5, 64, ID.Sten);
  a.beskeder.length = b.beskeder.length = 0;
  rum.besked(a, { t: "brag", x: 65.5, y: 5.5, z: 64.5, radius: 100 }, 1000);
  assert.equal(rum.hent(65, 5, 64), 0); assert.equal(rum.hent(65, 4, 64), ID.Bundsten);
  assert.equal(rum.hent(70, 5, 64), ID.Sten); assert.equal(rum.lunter.length, 1);
  assert.deepEqual(hændelser(a, "blok"), hændelser(b, "blok"));
  assert.ok(hændelser(a, "blok").some(b => b.id === 0));
  assert.deepEqual(hændelser(a, "bum"), hændelser(b, "bum"));
  rum.besked(a, { t: "brag", x: 65, y: 5, z: 64 }, 1000);
  rum.besked(a, { t: "brag", x: 65, y: 5, z: 64 }, 1000);
  assert.equal(hændelser(b, "bum").length, 2);
  for (const p of [{ x: NaN, y: 5, z: 64 }, { x: 128, y: 5, z: 64 }, { x: 64, y: 129, z: 64 }]) rum.besked(a, { t: "brag", ...p }, 3000);
  a.x = 0; a.z = 0; rum.besked(a, { t: "brag", x: 127, y: 5, z: 127 }, 3000);
  assert.equal(hændelser(b, "bum").length, 2);
});

Deno.test("Raketter: validering, delt mønster/farver, rumsikkerhed og rategrænse", () => {
  const { rum, a, b } = opsæt(), andet = opsæt();
  const r = { t: "fyrværkeri", x: 65, y: 5, z: 64, mønster: "hjerte", farver: ["forkert"], fra: "falsk" };
  rum.besked(a, r, 1000);
  const modtaget = hændelser(b, "fyrværkeri")[0];
  assert.equal(modtaget.mønster, "hjerte"); assert.equal(modtaget.fra, "a");
  assert.ok(modtaget.farver.every(f => /^#[0-9a-f]{6}$/.test(f)));
  assert.deepEqual(hændelser(a, "fyrværkeri"), hændelser(b, "fyrværkeri"));
  assert.equal(hændelser(andet.a, "fyrværkeri").length, 0);
  for (const data of [{ mønster: "ukendt" }, { mønster: {} }, { x: Infinity }, { x: 120 }]) rum.besked(a, { ...r, ...data }, 2001);
  assert.equal(hændelser(b, "fyrværkeri").length, 1);
  for (let i = 0; i < 10; i++) rum.besked(a, r, 3000);
  assert.equal(hændelser(b, "fyrværkeri").length, 3);
  assert.equal(new Set(hændelser(b, "fyrværkeri").map(b => b.id)).size, 3);
  let sendt = 0;
  for (let i = 0; i < 30; i++) if (rum.fyrRaket(65, 5, 64, a.id, "ring", 5000)) sendt++;
  assert.equal(sendt, 16);
  assert.equal(rum.revision, 0);
});

Deno.test("Fyrkasse: kun rigtig blok, én forbrugning, 12 fælles raketter og stop", () => {
  const { rum, a, b } = opsæt();
  rum.sæt(65, 5, 64, ID.Fyrværkeri);
  const tænd = { t: "fyrkasse", x: 65, y: 5, z: 64 };
  rum.besked(a, { ...tænd, x: 65.5 }, 1000);
  assert.equal(rum.fyrkasser.length, 0);
  rum.besked(a, tænd, 1000); rum.besked(b, tænd, 1000);
  assert.equal(rum.fyrkasser.length, 1); assert.equal(rum.hent(65, 5, 64), 0);
  for (let i = 0; i < 250; i++) rum.tick(0.05, 1000 + i * 50);
  assert.equal(rum.fyrkasser.length, 0);
  assert.equal(hændelser(a, "fyrværkeri").length, 12);
  assert.deepEqual(hændelser(a, "fyrværkeri"), hændelser(b, "fyrværkeri"));
  assert.ok(hændelser(a, "fyrværkeri").every(r => FYRMØNSTRE.includes(r.mønster)));
  for (let i = 0; i < 5; i++) { rum.sæt(65, 5, 64 + i, ID.Fyrværkeri); rum.besked(a, { ...tænd, z: 64 + i }, 20000 + 1001 * i); }
  assert.equal(rum.fyrkasser.length, 4); assert.equal(rum.hent(65, 5, 68), ID.Fyrværkeri);
  rum.afslut(); assert.equal(rum.fyrkasser.length, 0);
});

Deno.test("Show-kasse giver 36 raketter med finale; fontænen giver én fontæne på jorden", () => {
  const { rum, a, b } = opsæt();
  rum.sæt(65, 5, 64, ID["Show-kasse"]); rum.sæt(63, 5, 64, ID.Fontæne);
  rum.besked(a, { t: "fyrkasse", x: 65, y: 5, z: 64 }, 1000);
  rum.besked(a, { t: "fyrkasse", x: 63, y: 5, z: 64 }, 1600);
  assert.equal(rum.hent(65, 5, 64), 0); assert.equal(rum.hent(63, 5, 64), 0);
  const fontæner = hændelser(b, "fyrværkeri").filter(r => r.mønster === "fontæne");
  assert.equal(fontæner.length, 1); assert.deepEqual([fontæner[0].x, fontæner[0].y, fontæner[0].z], [63, 5, 64]);
  for (let i = 0; i < 600; i++) rum.tick(0.05, 2000 + i * 50);
  const raketter = hændelser(b, "fyrværkeri").filter(r => r.mønster !== "fontæne");
  assert.equal(raketter.length, 36);
  assert.ok(raketter.every(r => FYRMØNSTRE.includes(r.mønster) && !["romerlys", "fontæne", "lygte"].includes(r.mønster)));
});
