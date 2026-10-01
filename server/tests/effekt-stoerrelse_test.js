import { strict as assert } from "node:assert";
import { læsBesked } from "../protokol.js";
import { BroekraftServer } from "../main.js";

// Grænsen gælder UTF-8 på ledningen, også mellemrum og felter, der senere renses væk.
Deno.test("Effekt: præcis 1024 UTF-8-bytes accepteres, og større tekst ignoreres stille", () => {
  const tekst = JSON.stringify({ t: "effekt", slags: "droner", x: 1, y: 2, z: 3 });
  const længde = new TextEncoder().encode(tekst).length;
  assert.equal(læsBesked(tekst + " ".repeat(1024 - længde)).t, "effekt");
  assert.equal(læsBesked(tekst + " ".repeat(1025 - længde)), null);
  assert.equal(læsBesked(JSON.stringify({ t: "effekt", ekstra: "ø".repeat(512) })), null);
  assert.equal(læsBesked(tekst + " ".repeat(5000)), null);
  assert.throws(() => læsBesked(JSON.stringify({ t: "pos", ekstra: "x".repeat(4096) })));
});

// En afvist effekt må hverken nå verdenen, sende en fejl eller afbryde næste besked.
Deno.test("Effekt: for stor tekst afbryder ikke serverens beskedkø", async () => {
  const svar = [], modtaget = [];
  const socket = { readyState: 1, bufferedAmount: 0, send: b => svar.push(JSON.parse(b)), close() {} };
  const app = new BroekraftServer(); app.tilslut(socket);
  const spiller = [...app.spillere][0];
  socket.onmessage({ data: JSON.stringify({ t: "hej", figur: "gris", version: "0.2.0" }) });
  await spiller.kø;
  spiller.rum = { besked: (_s, b) => modtaget.push(b) };
  const b = { t: "effekt", slags: "droner", x: 1, y: 2, z: 3 };
  socket.onmessage({ data: JSON.stringify(b) + " ".repeat(4096) });
  socket.onmessage({ data: JSON.stringify(b) });
  await spiller.kø;
  assert.deepEqual(modtaget, [b]);
  assert.deepEqual(svar, []);
});
