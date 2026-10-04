import { strict as assert } from "node:assert";
import { BroekraftServer } from "../main.js";
import { metadata, Verdenslager, VERSION } from "../verdener.js";

const HEJ = { t: "hej", spil: "sigtekorn", version: 1, navn: "Far", rum: "familie" };

// Vent på en faktisk tilstandsændring, kun med eventloop-ture; ingen faste netværkspauser.
async function ventPå(vælg, tekst) {
  const slut = performance.now() + 4000;
  while (!vælg()) {
    if (performance.now() > slut) throw new Error(`Mangler ${tekst}`);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function opsæt({ broekraft = false } = {}) {
  const rod = await Deno.makeTempDir({ prefix: "broekraft-spilrum-" });
  const lager = new Verdenslager(rod), klienter = [], sockets = [];
  const meta = broekraft ? metadata({ navn: "Den eksisterende verden", type: "græsø", bredde: 128, maksSpillere: 2 }) : null;
  if (meta) {
    const data = new Uint8Array(128 * 128 * 64);
    data.fill(26, 0, 128 * 128);
    await lager.gem(meta, data);
  }
  const app = new BroekraftServer({ lager, netværkstjek: { hent: async () => ({ status: "test" }) } });
  await app.init();
  const http = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req, info) => app.håndter(req, info));
  const base = `http://127.0.0.1:${http.addr.port}`;
  app.port = http.addr.port;
  app.kørTimere();
  return {
    app,
    lager,
    meta,
    base,
    port: http.addr.port,
    klienter,
    sockets,
    async luk() {
      for (const socket of sockets) socket.close();
      await Promise.all(klienter.map((k) => k.luk()));
      if (!app.lukker) await app.luk();
      await http.shutdown();
      await Deno.remove(rod, { recursive: true });
    },
  };
}

// Pakker opsamles også før en test begynder at vente, så hurtige velkomster aldrig mistes.
async function åbn(v, sti = "/ws/rum") {
  const socket = new WebSocket(v.base.replace("http", "ws") + sti);
  socket.binaryType = "arraybuffer";
  const alle = [], kø = [], ventende = [];
  let afslut;
  const lukket = new Promise((resolve) => {
    afslut = resolve;
  });
  const klient = {
    socket,
    alle,
    lukket,
    send: (b) => socket.send(JSON.stringify(b)),
    rå: (b) => socket.send(b),
    næste(vælg) {
      const passer = typeof vælg === "string" ? (b) => b.t === vælg : vælg;
      const i = kø.findIndex(passer);
      if (i >= 0) return Promise.resolve(kø.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const vent = { passer, resolve, reject };
        vent.timer = setTimeout(() => {
          ventende.splice(ventende.indexOf(vent), 1);
          reject(new Error(`Mangler WebSocket-pakke ${String(vælg)}`));
        }, 4000);
        ventende.push(vent);
      });
    },
    async luk() {
      if (socket.readyState === WebSocket.OPEN) socket.close();
      await lukket;
    },
  };
  v.klienter.push(klient);
  socket.onmessage = ({ data }) => {
    const b = typeof data === "string" ? JSON.parse(data) : { t: "binær", data };
    alle.push(b);
    const i = ventende.findIndex((vent) => vent.passer(b));
    if (i < 0) kø.push(b);
    else {
      const vent = ventende.splice(i, 1)[0];
      clearTimeout(vent.timer);
      vent.resolve(b);
    }
  };
  socket.onclose = (e) => {
    for (const vent of ventende.splice(0)) {
      clearTimeout(vent.timer);
      vent.reject(new Error(`WebSocket lukket (${e.code}) før svaret`));
    }
    afslut(e);
  };
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket åbnede ikke")), 4000);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error("WebSocket kunne ikke åbnes"));
    };
  });
  return klient;
}

async function ind(v, oplysninger = {}) {
  const k = await åbn(v);
  k.send({ ...HEJ, ...oplysninger });
  k.velkommen = await k.næste("velkommen");
  return k;
}

// Dårligt JSON giver en fejlpakkes rundtur. Den står efter allerede sendte frames på samme socket.
async function barriere(k) {
  const svar = k.næste("fejl");
  k.rå("{");
  const fejl = await svar;
  assert.ok(typeof (fejl.tekst ?? fejl.besked) === "string");
}

// Rigtigt TCP/HTTP-håndtryk gør Origin/Host testbare uden browserens faste WebSocket-headers.
async function håndtryk(v, { sti = "/ws/rum", origin = v.base, host = `127.0.0.1:${v.port}` } = {}) {
  const conn = await Deno.connect({ hostname: "127.0.0.1", port: v.port });
  const timer = setTimeout(() => {
    try {
      conn.close();
    } catch { /* allerede lukket */ }
  }, 4000);
  try {
    const tekst = `GET ${sti} HTTP/1.1\r\nHost: ${host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
      `Sec-WebSocket-Key: c3BpbHJ1bS10ZXN0LWtleSE=\r\nSec-WebSocket-Version: 13\r\n` +
      (origin == null ? "" : `Origin: ${origin}\r\n`) + "\r\n";
    const data = new TextEncoder().encode(tekst);
    for (let i = 0; i < data.length;) i += await conn.write(data.subarray(i));
    const blok = new Uint8Array(4096);
    let svar = "";
    while (!svar.includes("\r\n\r\n")) {
      const antal = await conn.read(blok);
      if (antal == null) throw new Error("HTTP-håndtrykket sluttede uden headers");
      svar += new TextDecoder().decode(blok.subarray(0, antal));
      if (svar.length > 8192) throw new Error("HTTP-headers blev for store");
    }
    return Number(svar.match(/^HTTP\/1\.1 (\d{3})/)?.[1]);
  } finally {
    clearTimeout(timer);
    try {
      conn.close();
    } catch { /* timeout kan have lukket forbindelsen */ }
  }
}

function tæller(v) {
  return v.app.spillere.size + v.app.spilrum.forbindelser.size;
}

Deno.test("Spilrum HTTP/WS: hej, danske navne, normaliseret rum, suffix og ugyldige felter", async () => {
  const v = await opsæt();
  try {
    const a = await ind(v, { navn: "  Far-Ø  ", rum: "  FAMILIE-ø  ", version: 2 });
    assert.match(a.velkommen.dig, /^[a-z0-9]{6,12}$/);
    assert.equal(a.velkommen.navn, "Far-Ø");
    assert.equal(a.velkommen.vært, a.velkommen.dig);
    assert.deepEqual(a.velkommen.spillere, []);
    assert.equal(a.velkommen.tilstand, null);
    const b = await ind(v, { navn: "Far-Ø", rum: "familie-ø" });
    assert.equal(b.velkommen.navn, "Far-Ø 2");
    assert.deepEqual(b.velkommen.spillere, [{ id: a.velkommen.dig, navn: "Far-Ø" }]);
    assert.deepEqual(await a.næste("ind"), { t: "ind", id: b.velkommen.dig, navn: "Far-Ø 2" });
    assert.ok(v.app.spilrum.rum.has("sigtekorn/familie-ø"));
    const ugyldig = await åbn(v);
    for (
      const ændring of [
        { spil: "x" },
        { spil: "Aldrig" },
        { spil: "sigte-korn" },
        { version: 1.5 },
        { navn: "  " },
        { navn: "<Mor>" },
        { navn: "x".repeat(17) },
        { rum: "" },
        { rum: "familie!" },
        { rum: "x".repeat(21) },
      ]
    ) {
      ugyldig.send({ ...HEJ, ...ændring });
      const fejl = await ugyldig.næste("fejl");
      assert.ok(fejl.tekst);
    }
    assert.equal(v.app.spilrum.rum.size, 1);
    assert.equal(tæller(v), 3, "Åbne forbindelser tæller, selv om hej er ugyldigt");
    assert.deepEqual(await v.lager.liste(), [], "Spilrum opretter ingen gemt Brøkraft-verden");
  } finally {
    await v.luk();
  }
});

Deno.test("Spilrum HTTP/WS: broadcast, unicast og fuld isolation mellem rum og spil uden sender-echo", async () => {
  const v = await opsæt();
  try {
    const a = await ind(v), b = await ind(v, { navn: "Mor" }), c = await ind(v, { navn: "Ven" });
    const andetRum = await ind(v, { rum: "andet" }), andetSpil = await ind(v, { spil: "lyset" });
    const data = { k: "tilstand", p: [1.2, 0, 40.5], eget: { navn: "æøå", sandt: true } };
    const start = new Map([a, b, c, andetRum, andetSpil].map((k) => [k, k.alle.length]));
    a.send({ t: "til", id: andetRum.velkommen.dig, data });
    assert.deepEqual(await b.næste("fra"), { t: "fra", id: a.velkommen.dig, data });
    assert.deepEqual(await c.næste("fra"), { t: "fra", id: a.velkommen.dig, data });
    await Promise.all([a, andetRum, andetSpil].map(barriere));
    for (const k of [a, andetRum, andetSpil]) {
      assert.equal(k.alle.slice(start.get(k)).filter((m) => m.t === "fra").length, 0);
    }
    const startC = c.alle.length, startA = a.alle.length;
    const træf = { k: "træf", liv: 36 };
    a.send({ t: "til", til: b.velkommen.dig, data: træf });
    assert.deepEqual(await b.næste("fra"), { t: "fra", id: a.velkommen.dig, data: træf });
    await Promise.all([a, c].map(barriere));
    assert.ok(!c.alle.slice(startC).some((m) => m.t === "fra"));
    assert.ok(!a.alle.slice(startA).some((m) => m.t === "fra"));
    const stilhed = [a, b, c, andetRum, andetSpil].map((k) => k.alle.length);
    a.send({ t: "til", til: andetRum.velkommen.dig, data: { k: "må-ikke-krydse-rum" } });
    a.send({ t: "til", til: "ukendt-id", data: { k: "ingen-modtager" } });
    a.send({ t: "ukendt", data: { k: "ignoreres" } });
    await barriere(a);
    await Promise.all([b, c, andetRum, andetSpil].map(barriere));
    [a, b, c, andetRum, andetSpil].forEach((k, i) => {
      assert.ok(!k.alle.slice(stilhed[i]).some((m) => m.t === "fra"));
    });
  } finally {
    await v.luk();
  }
});

Deno.test("Spilrum HTTP/WS: kun værtens tilstand gemmes, ældste overtager, sidste ud sletter rummet", async () => {
  const v = await opsæt();
  try {
    const a = await ind(v), b = await ind(v, { navn: "Mor" });
    const tilstand = { bane: "havnen", spiltype: "hold" };
    a.send({ t: "tilstand", data: tilstand });
    assert.deepEqual(await b.næste("tilstand"), { t: "tilstand", data: tilstand });
    b.send({ t: "tilstand", data: { bane: "ikke-værtens-bane" } });
    await barriere(b);
    const c = await ind(v, { navn: "Tredje" });
    assert.deepEqual(c.velkommen.tilstand, tilstand);
    assert.equal(c.velkommen.vært, a.velkommen.dig);
    const udB = b.næste((m) => m.t === "ud" && m.id === a.velkommen.dig);
    const værtB = b.næste("vært"), udC = c.næste((m) => m.t === "ud" && m.id === a.velkommen.dig), værtC = c.næste("vært");
    await a.luk();
    await Promise.all([udB, udC]);
    assert.deepEqual(await værtB, { t: "vært", id: b.velkommen.dig });
    assert.deepEqual(await værtC, { t: "vært", id: b.velkommen.dig });
    const d = await ind(v, { navn: "Fjerde" });
    assert.equal(d.velkommen.vært, b.velkommen.dig);
    assert.deepEqual(d.velkommen.tilstand, tilstand);
    const næsteTilstand = { bane: "fjeldbyen" };
    b.send({ t: "tilstand", data: næsteTilstand });
    assert.deepEqual(await c.næste("tilstand"), { t: "tilstand", data: næsteTilstand });
    assert.deepEqual(await d.næste("tilstand"), { t: "tilstand", data: næsteTilstand });
    await Promise.all([b, c, d].map((k) => k.luk()));
    await ventPå(() => tæller(v) === 0, "alle serverforbindelser lukkede");
    assert.equal(v.app.spilrum.rum.size, 0);
  } finally {
    await v.luk();
  }
});

Deno.test("Spilrum HTTP/WS: otte spillere, niende fuld/lukket og pladsen frigives ved udgang", async () => {
  const v = await opsæt();
  try {
    const spillere = [];
    for (let i = 0; i < 8; i++) spillere.push(await ind(v, { navn: `Spiller ${i}` }));
    const fuld = await åbn(v);
    fuld.send(HEJ);
    assert.deepEqual(await fuld.næste("fuld"), { t: "fuld" });
    assert.equal((await fuld.lukket).code, 1008);
    await ventPå(() => tæller(v) === 8, "afvist forbindelse fjernet");
    const ud = spillere[0].næste((m) => m.t === "ud" && m.id === spillere[7].velkommen.dig);
    await spillere[7].luk();
    await ud;
    const ny = await ind(v, { navn: "Ny spiller" });
    assert.equal(ny.velkommen.spillere.length, 7);
    assert.equal(ny.velkommen.vært, spillere[0].velkommen.dig);
    assert.equal(tæller(v), 8);
  } finally {
    await v.luk();
  }
});

Deno.test("Spilrum HTTP/WS: hej først, dårligt JSON kan repareres, store data droppes og binary lukker", async () => {
  const v = await opsæt();
  try {
    const a = await åbn(v);
    a.send({ t: "til", data: { k: "før-hej" } });
    assert.ok((await a.næste("fejl")).tekst);
    await barriere(a);
    a.send(HEJ);
    a.velkommen = await a.næste("velkommen");
    const b = await ind(v, { navn: "Mor" });
    const fra = b.alle.length;
    a.send({ t: "til", data: { tekst: "ø".repeat(800) } });
    a.send({ t: "tilstand", data: { tekst: "ø".repeat(300) } });
    await barriere(a);
    await barriere(b);
    assert.ok(!b.alle.slice(fra).some((m) => m.t === "fra" || m.t === "tilstand"));
    assert.equal(a.socket.readyState, WebSocket.OPEN);
    a.send({ t: "til", data: { k: "stadig-forbundet" } });
    assert.equal((await b.næste("fra")).data.k, "stadig-forbundet");
    a.rå(new Uint8Array([1, 2, 3]));
    assert.equal((await a.lukket).code, 1003);
    await b.næste((m) => m.t === "ud" && m.id === a.velkommen.dig);
    await ventPå(() => tæller(v) === 1, "binær forbindelse fjernet");
  } finally {
    await v.luk();
  }
});

Deno.test("Spilrum HTTP: samme Origin og kompatibel native uden Origin; fremmed Origin/Host/IP afvises", async () => {
  const v = await opsæt();
  try {
    assert.equal(await håndtryk(v), 101);
    await ventPå(() => tæller(v) === 0, "råt håndtryk lukket");
    assert.equal(await håndtryk(v, { origin: "http://fremmed.dk" }), 403);
    assert.equal(await håndtryk(v, { host: "fremmed.dk" }), 403);
    assert.equal(tæller(v), 0);
    const offentlig = await v.app.håndter(new Request(v.base + "/ws/rum", { headers: { origin: v.base } }), {
      remoteAddr: { hostname: "8.8.8.8" },
    });
    assert.equal(offentlig.status, 403);
    const udenOrigin = await åbn(v);
    assert.equal(tæller(v), 1);
    await udenOrigin.luk();
    await ventPå(() => tæller(v) === 0, "native uden hej lukket");
  } finally {
    await v.luk();
  }
});

function testsocket() {
  return {
    readyState: WebSocket.OPEN,
    bufferedAmount: 0,
    send() {},
    close(code = 1000) {
      if (this.readyState === WebSocket.CLOSED) return;
      this.readyState = WebSocket.CLOSED;
      this.onclose?.({ code });
    },
  };
}

Deno.test("Spilrum HTTP/WS: fælles 128-grænse tæller åbne prehej sockets på begge ruter og shutdown rydder alt", async () => {
  const v = await opsæt();
  try {
    for (let i = 0; i < 127; i++) {
      const socket = testsocket();
      v.sockets.push(socket);
      if (i < 64) v.app.tilslut(socket);
      else v.app.spilrum.tilslut(socket);
    }
    assert.equal(tæller(v), 127);
    const spil = await åbn(v);
    assert.equal(tæller(v), 128);
    assert.equal(v.app.spilrum.rum.size, 0);
    assert.equal((await (await fetch(v.base + "/api/status")).json()).forbindelser, 128);
    assert.equal(await håndtryk(v), 503);
    assert.equal(await håndtryk(v, { sti: "/ws" }), 503);
    await spil.luk();
    await ventPå(() => tæller(v) === 127, "ledig plads efter prehej lukning");
    const broekraft = await åbn(v, "/ws");
    assert.equal(tæller(v), 128);
    assert.equal(await håndtryk(v), 503);
    v.sockets[0].close();
    const nytSpil = await åbn(v);
    assert.equal(tæller(v), 128);
    await v.app.luk();
    await Promise.all([broekraft.lukket, nytSpil.lukket]);
    await ventPå(() => tæller(v) === 0, "Alle forbindelser ryddes efter serverlukning");
    assert.equal(v.app.spillere.size, 0);
    assert.equal(v.app.spilrum.forbindelser.size, 0);
    assert.equal(v.app.spilrum.rum.size, 0);
    assert.equal((await fetch(v.base + "/ws/rum")).status, 503);
  } finally {
    await v.luk();
  }
});

Deno.test("Spilrum HTTP/WS: den oprindelige Brøkraft-liste, verden og blokdeling fungerer samtidig", async () => {
  const v = await opsæt({ broekraft: true });
  try {
    const spilA = await ind(v), spilB = await ind(v, { navn: "Mor" });
    const a = await åbn(v, "/ws"), b = await åbn(v, "/ws");
    for (const [k, figur] of [[a, "gris"], [b, "ko"]]) {
      k.send({ t: "hej", figur, version: VERSION });
      k.send({ t: "verdener" });
      const liste = await k.næste("verdener");
      assert.equal(liste.liste[0].id, v.meta.id);
      k.send({ t: "vælg", verden: v.meta.id });
      assert.equal((await k.næste("velkommen")).verden.id, v.meta.id);
      assert.ok((await k.næste("binær")).data.byteLength > 11);
    }
    a.send({ t: "sæt", x: 66, y: 2, z: 64, id: 7 });
    assert.equal((await b.næste((m) => m.t === "blok" && m.x === 66)).id, 7);
    assert.equal(v.app.rum.get(v.meta.id).hent(66, 2, 64), 7);
    const førA = a.alle.length, førB = b.alle.length;
    spilA.send({ t: "til", data: { k: "skud", eget: true } });
    assert.equal((await spilB.næste("fra")).id, spilA.velkommen.dig);
    await Promise.all([a, b].map(barriere));
    assert.ok(!a.alle.slice(førA).some((m) => m.t === "fra"));
    assert.ok(!b.alle.slice(førB).some((m) => m.t === "fra"));
    assert.equal(v.app.rum.get(v.meta.id).spillere.size, 2);
    assert.equal(v.app.spilrum.rum.size, 1);
    assert.equal(tæller(v), 4);
  } finally {
    await v.luk();
  }
});
