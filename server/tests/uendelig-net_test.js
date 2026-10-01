import { strict as assert } from "node:assert";
import { runInNewContext } from "node:vm";
import { forbind, udpakKlump } from "../../spil/broekraft/net.js";
import { pakKlump } from "../protokol.js";
import { verdensvalg, størrelsestekst } from "../kontrol/verdensvalg.js";

Deno.test("Uendelig net: klump 2100, sidste klump og velkomstens nøjagtige grænser", () => {
  const data = new Uint8Array(256 * 64); data[15 + 15 * 16 + 63 * 256] = 68;
  const mål = { bredde: 65536, dybde: 65536, højde: 64 };
  for (const cx of [2100, 4095]) {
    const b = pakKlump(data, cx, 4095, 64).buffer;
    assert.deepEqual(udpakKlump(b, 255, mål).data, data);
    assert.throws(() => udpakKlump(b), /Ugyldige klumpmål/);
    assert.throws(() => udpakKlump(b, 67, mål), /Ugyldig RLE/);
  }
  for (const [cx, cz] of [[4096, 0], [0, 4096], [-1, 0], [0, -1]]) {
    assert.throws(() => udpakKlump(pakKlump(data, cx, cz, 64).buffer, 255, mål), /Ugyldige klumpmål/);
  }
  assert.throws(() => udpakKlump(pakKlump(data, 8, 0, 64).buffer, 255, { bredde: 128, dybde: 256, højde: 64 }));
  assert.throws(() => udpakKlump(pakKlump(new Uint8Array(256 * 32), 0, 0, 32).buffer, 255, mål));
});

// En lille socket leverer de samme hændelser som browseren, uden at bruge et rigtigt netværk.
class TestSocket {
  constructor() { TestSocket.sidste = this; this.sendt = []; setTimeout(() => { this.readyState = 1; this.onopen(); }, 0); }
  send(data) { this.sendt.push(JSON.parse(data)); }
  lever(data) { this.onmessage({ data: typeof data === "object" && !(data instanceof ArrayBuffer) ? JSON.stringify(data) : data }); }
  close() { this.readyState = 3; this.onclose?.(); }
}

Deno.test("Uendelig net: velkomst skifter mål, og afbrudt forbindelse rydder dem", async () => {
  const oprindelig = globalThis.WebSocket;
  globalThis.WebSocket = TestSocket;
  let net;
  try {
    // Den gamle protokolversion bruger samme klumpformat, når netmodulet er opdateret.
    net = await forbind("ws://127.0.0.1/ws", { version: "0.1.0" });
    const socket = TestSocket.sidste, klumper = [], fejl = [];
    net.addEventListener("klump", e => klumper.push(e.detail));
    net.addEventListener("fejl", e => fejl.push(e.detail.besked));
    const data = new Uint8Array(256 * 64), stor = pakKlump(data, 2100, 2000, 64).buffer;
    socket.lever(stor);
    assert.equal(klumper.length, 0); assert.equal(fejl.at(-1), "Klump før velkommen");
    const storVelkomst = net.vælg("stor");
    socket.lever({ t: "velkommen", dig: "a", verden: { id: "stor", bredde: 65536, dybde: 65536, højde: 64, uendelig: true }, spillere: [{ id: "a" }, { id: "b" }] });
    await storVelkomst;
    socket.lever(stor); assert.equal(klumper.at(-1).cx, 2100);
    const lilleVelkomst = net.vælg("lille");
    socket.lever({ t: "velkommen", dig: "c", verden: { id: "lille", bredde: 128, dybde: 128, højde: 64 }, spillere: [{ id: "c" }] });
    await lilleVelkomst;
    assert.deepEqual([...net.spillere.keys()], ["c"]);
    socket.lever(stor); assert.equal(klumper.length, 1); assert.equal(fejl.at(-1), "Ugyldige klumpmål");
    socket.lever(pakKlump(data, 7, 7, 64).buffer); assert.equal(klumper.length, 2);
    net.luk(); assert.equal(net.info, null); assert.equal(net.spillere.size, 0);
    socket.lever(pakKlump(data, 0, 0, 64).buffer); assert.equal(klumper.length, 2);
  } finally { net?.luk(); globalThis.WebSocket = oprindelig; }
});

// Kontrolpanelet afprøves med dets rigtige hændelser og kun en lille erstatning for DOM/fetch.
Deno.test("Kontrol: hemmelige verdener udelades, og uendelig oprettes uden størrelsesfelt", async () => {
  assert.ok(verdensvalg().some(v => v.id === "uendelig"));
  assert.ok(!verdensvalg().some(v => v.id === "guldslot"));
  assert.equal(størrelsestekst({ type: "uendelig", uendelig: false, bredde: 128, dybde: 128 }), "128 × 128");
  assert.deepEqual(verdensvalg([{ id: "synlig" }, { id: "hemmelig", skjult: true }]).map(v => v.id), ["synlig"]);
  const felter = new Map();
  const element = tag => ({ tag, children: [], textContent: "", value: "", hidden: false, disabled: false,
    append(...børn) { this.children.push(...børn); },
    replaceChildren(...børn) { this.children = børn; if (tag === "select") this.value = børn[0]?.value || ""; },
  });
  const felt = s => {
    if (!felter.has(s)) felter.set(s, element(s.endsWith("[name=type]") ? "select" : "div"));
    return felter.get(s);
  };
  let aktiv = false, oprettet;
  const status = { token: "test", netværk: { status: "ikke-windows" }, certifikatAdresser: [], adresser: [], verdener: [], spillere: [], job: [] };
  const værdier = new Map([["navn", "Familielandet"], ["type", "uendelig"], ["bredde", "128"], ["maksSpillere", "4"], ["frø", "123"], ["ildBreder", "on"]]);
  const kontekst = {
    document: { querySelector: felt, createElement: element }, verdensvalg, størrelsestekst,
    setTimeout() {},
    FormData: class { get(k) { return værdier.get(k); } has(k) { return værdier.has(k); } },
    fetch(url, valg) {
      if (!aktiv) return new Promise(() => {});
      if (url === "/api/opret") oprettet = JSON.parse(valg.body);
      return Promise.resolve({ ok: true, json: () => Promise.resolve(url === "/api/status" ? status : {}) });
    },
  };
  const kilde = (await Deno.readTextFile(new URL("../kontrol/kontrol.js", import.meta.url)))
    .replace('import { verdensvalg, størrelsestekst } from "./verdensvalg.js";', "");
  runInNewContext(kilde, kontekst);
  const typer = felt("#opret [name=type]");
  assert.ok(typer.children.some(v => v.value === "uendelig"));
  assert.ok(!typer.children.some(v => v.value === "guldslot"));
  typer.value = "uendelig"; typer.onchange();
  assert.equal(felt("#størrelse").hidden, true); assert.equal(felt("#opret [name=bredde]").disabled, true);
  assert.equal(felt("#uden-kanter").hidden, false);
  aktiv = true; await felt("#opret").onsubmit({ preventDefault() {}, target: {} });
  assert.equal(oprettet.type, "uendelig"); assert.ok(!Object.hasOwn(oprettet, "bredde"));
  typer.value = "græsø"; typer.onchange();
  assert.equal(felt("#størrelse").hidden, false); assert.equal(felt("#opret [name=bredde]").disabled, false);
  assert.equal(felt("#uden-kanter").hidden, true);
  kontekst.visVerdener([{ id: "stor", type: "uendelig", navn: "Familielandet", bredde: 65536, dybde: 65536, spillere: 0, maksSpillere: 4 }]);
  assert.match(felt("#verdener").children[0].children[1].textContent, /^uden kanter ·/);
});
