import { strict as assert } from "node:assert";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import { BroekraftServer } from "../main.js";
import { Verdenslager } from "../verdener.js";

const kilde = await Deno.readTextFile(new URL("../../spil/sigtekorn/online.js", import.meta.url));
const kopi = (v) => JSON.parse(JSON.stringify(v));
const vent = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function ventTil(prøve, tekst) {
  const slut = performance.now() + 5000;
  while (performance.now() < slut) {
    if (prøve()) return;
    await vent(10);
  }
  throw new Error("Mangler " + tekst);
}

// Port 0 og en tom datamappe prøver det rigtige HTTP/WS-program uden familiens gemninger.
async function opsæt() {
  const rod = await Deno.makeTempDir({ prefix: "sigtekorn-online-test-" });
  const app = new BroekraftServer({ lager: new Verdenslager(rod) });
  await app.init();
  const http = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req, info) => app.håndter(req, info));
  app.port = http.addr.port;
  const base = `http://127.0.0.1:${http.addr.port}`;
  const klienter = [];
  return {
    app,
    base,
    async klient(bane = "havnen") {
      const k = await lavKlient(base, bane);
      klienter.push(k);
      return k;
    },
    async luk() {
      for (const k of klienter) k.net.luk();
      for (const k of klienter) await k.ryd();
      await app.luk();
      await http.shutdown();
      await Deno.remove(rod, { recursive: true });
    },
  };
}

// Kilden evalueres uændret. Kun importerne til figurtegning erstattes; Online, JSON og sockets er faktiske.
async function lavKlient(base, bane) {
  const url = new URL(base), timere = new Set(), sockets = [];
  const log = { status: [], baner: [], figurer: [], fjernet: [], tilstande: [], hændelser: [], minTilstand: 0 };
  class BrowserSocket extends WebSocket {
    constructor(adresse) {
      super(adresse, { headers: { origin: base } });
      sockets.push(this);
    }
  }
  const kontekst = createContext({
    WebSocket: BrowserSocket,
    performance,
    console,
    location: { protocol: url.protocol, host: url.host, hostname: url.hostname },
    setTimeout(f, ms) {
      const id = setTimeout(() => {
        timere.delete(id);
        f();
      }, ms);
      timere.add(id);
      return id;
    },
    clearTimeout(id) {
      clearTimeout(id);
      timere.delete(id);
    },
  });
  const grafik = new SyntheticModule([], () => {}, { context: kontekst });
  const bot = new SyntheticModule(["Bot", "vinkel"], function () {
    this.setExport(
      "Bot",
      class {
        constructor() {
          throw new Error("Netprøven må ikke bygge en spilfigur");
        }
      },
    );
    this.setExport("vinkel", (n) => n);
  }, { context: kontekst });
  const våben = new SyntheticModule(["nytVåben"], function () {
    this.setExport("nytVåben", () => {
      throw new Error("Netprøven må ikke bygge et våben");
    });
  }, { context: kontekst });
  const modul = new SourceTextModule(kilde, { context: kontekst, identifier: "sigtekorn/online.js" });
  await modul.link((sti) => {
    if (sti === "./three.js") return grafik;
    if (sti === "./bots.js") return bot;
    if (sti === "./vaaben.js") return våben;
    throw new Error("Uventet import i netklienten: " + sti);
  });
  await modul.evaluate();
  const min = { bane };
  const net = new modul.namespace.Online({
    status: (tekst) => log.status.push(tekst),
    minTilstand() {
      log.minTilstand++;
      return { bane: min.bane };
    },
    rumTilstand(data) {
      log.baner.push(kopi(data));
      // Spillets eksterne callback får den valgte bane; her gemmes kun en værdi, ingen verden åbnes.
      if (data?.bane) min.bane = data.bane;
    },
    lavFjern(id, navn, hold) {
      const f = { id, navn, hold, modtag: (data) => log.tilstande.push({ id, data: kopi(data) }) };
      log.figurer.push(f);
      return f;
    },
    fjernet: (f) => log.fjernet.push(f.id),
    modtag: (f, data) => log.hændelser.push({ id: f.id, data: kopi(data) }),
  });
  return {
    net,
    log,
    min,
    async ryd() {
      for (const id of timere) clearTimeout(id);
      timere.clear();
      await Promise.all(sockets.map((socket) => {
        if (socket.readyState === WebSocket.CLOSED) return;
        return new Promise((resolve) => {
          socket.addEventListener("close", resolve, { once: true });
          socket.close();
        });
      }));
    },
  };
}

const spiller = (hold = "ræve", x = 1) => ({
  k: "tilstand",
  p: [x, 0, 4],
  v: [1, 0, 0],
  yaw: .2,
  pitch: -.1,
  hold,
  våben: "storm",
  liv: 100,
  panser: 20,
  duk: 0,
  kravl: 0,
  jord: true,
  død: false,
});
async function delSpillere(a, b) {
  a.net.tick(.05, () => spiller("ræve"));
  b.net.tick(.05, () => spiller("slanger", 2));
  await ventTil(() => a.net.fjerne.has(b.net.dig) && b.net.fjerne.has(a.net.dig), "begge fjerne spillere");
}

Deno.test("Sigtekorns faktiske Online: værtsbane, tredje spiller, navnesammenfald og baneskift", async () => {
  const v = await opsæt();
  try {
    const a = await v.klient("havnen"), b = await v.klient("fjeldbyen"), c = await v.klient("ørken");
    const første = await a.net.forbind("Mor", "familie");
    assert.equal(a.net.erVært, true);
    assert.equal(a.log.minTilstand, 1, "Værten skal sende sin faktiske minTilstand efter velkomsten");
    assert.equal(første.tilstand, null);
    await b.net.forbind("Mor", "familie");
    await ventTil(() => b.log.baner.some((d) => d.bane === "havnen"), "værtens bane hos anden spiller");
    assert.equal(b.min.bane, "havnen");
    assert.equal(b.net.mitNavn, "Mor 2");
    assert.equal(b.net.erVært, false);
    await ventTil(() => a.net.navne.get(b.net.dig) === "Mor 2", "den andens tildelte navn");
    const tredje = await c.net.forbind("Far", "familie");
    assert.deepEqual(kopi(tredje.tilstand), { bane: "havnen" }, "En senere spiller får værtens gemte bane i velkomsten");
    assert.equal(c.net.navne.size, 2);
    a.net.sætTilstand({ bane: "fjeldbyen" });
    await ventTil(() => b.min.bane === "fjeldbyen" && c.min.bane === "fjeldbyen", "delt baneskift");
    const gammel = b.net.dig;
    const igen = await b.net.forbind("Mor", "familie");
    assert.notEqual(igen.dig, gammel);
    assert.deepEqual(kopi(igen.tilstand), { bane: "fjeldbyen" });
    assert.equal(b.net.mitNavn, "Mor 2", "Et baneskift skal ikke reservere gamle navne for evigt");
    await ventTil(() => !a.net.navne.has(gammel) && a.net.navne.has(igen.dig), "oprydning af den gamle forbindelse");
  } finally {
    await v.luk();
  }
});

Deno.test("Sigtekorns faktiske Online: position, skud, granat, direkte træf og død går gennem serveren", async () => {
  const v = await opsæt();
  try {
    const a = await v.klient(), b = await v.klient(), c = await v.klient();
    await a.net.forbind("Far", "familie");
    await b.net.forbind("Mor", "familie");
    await c.net.forbind("Barn", "familie");
    await delSpillere(a, b);
    await ventTil(() => c.net.fjerne.has(a.net.dig) && c.net.fjerne.has(b.net.dig), "de to skyttespillere hos tredje klient");
    assert.deepEqual(b.log.tilstande[0].data, spiller("ræve"));
    const skud = { k: "skud", o: [1, 1.6, 4], r: [.2, -.1], v: "storm" };
    a.net.skud(skud, 1);
    await ventTil(
      () => b.log.hændelser.some((e) => e.data.k === "skud") && c.log.hændelser.some((e) => e.data.k === "skud"),
      "skud til andre",
    );
    assert.deepEqual(b.log.hændelser.find((e) => e.data.k === "skud"), { id: a.net.dig, data: skud });
    assert.equal(a.log.hændelser.length, 0, "Skytten må ikke få sit eget skud retur");
    const granat = { k: "granat", type: "raket", o: [1, 1, 4], fart: [0, 0, 15] };
    a.net.send(granat);
    await ventTil(() => c.log.hændelser.some((e) => e.data.k === "granat"), "granat til tredje spiller");
    const træf = { k: "træf", liv: 36, panser: 7, del: "krop", lem: null };
    a.net.send(træf, b.net.dig);
    await ventTil(() => b.log.hændelser.some((e) => e.data.k === "træf"), "direkte træf hos offeret");
    assert.deepEqual(b.log.hændelser.find((e) => e.data.k === "træf").data, træf);
    await vent(30);
    assert.equal(c.log.hændelser.some((e) => e.data.k === "træf"), false, "Tredje spiller får ingen andens skade");
    const død = { k: "død", af: a.net.dig, våben: "Stormgevær", hoved: false, lem: null, r: null };
    b.net.send(død);
    await ventTil(
      () => a.log.hændelser.some((e) => e.data.k === "død") && c.log.hændelser.some((e) => e.data.k === "død"),
      "dødsbesked til begge andre",
    );
    assert.deepEqual(a.log.hændelser.find((e) => e.data.k === "død").data, død);
  } finally {
    await v.luk();
  }
});

Deno.test("Sigtekorns faktiske Online: værtsvalg og automatisk genforbindelse rydder gamle figurer", async () => {
  const v = await opsæt();
  try {
    const a = await v.klient(), b = await v.klient();
    await a.net.forbind("Far", "familie");
    await b.net.forbind("Mor", "familie");
    await delSpillere(a, b);
    const gammel = a.net.dig, mor = b.net.dig;
    a.net.ws.close();
    await ventTil(() => b.net.erVært && !b.net.navne.has(gammel), "ny vært efter mistet forbindelse");
    assert.equal(b.net.vært, mor);
    assert.ok(b.log.fjernet.includes(gammel));
    assert.ok(a.log.fjernet.includes(mor), "Den tabte klient rydder sine gamle fjernfigurer");
    b.net.sætTilstand({ bane: "fjeldbyen" });
    await ventTil(() => a.net.forbundet && a.net.dig !== gammel, "automatisk genforbindelse med nyt id");
    assert.equal(a.net.erVært, false);
    assert.equal(a.net.vært, mor);
    assert.equal(a.min.bane, "fjeldbyen");
    assert.ok(a.log.status.some((t) => t.includes("prøver igen")));
    await delSpillere(a, b);
    assert.equal(a.net.fjerne.size, 1);
    assert.equal(b.net.fjerne.size, 1);
    assert.equal(b.net.fjerne.has(gammel), false);
    assert.equal(v.app.spilrum.forbindelser.size, 2);
    a.net.luk();
    b.net.luk();
    await ventTil(() => v.app.spilrum.forbindelser.size === 0, "sidste forbindelses oprydning");
    assert.equal(a.net.forbundet, false);
    assert.equal(a.net.fjerne.size, 0);
    assert.equal(b.net.navne.size, 0);
  } finally {
    await v.luk();
  }
});

Deno.test("Sigtekorns faktiske Online: rum holdes adskilt, og holdskift udskifter én fjernfigur", async () => {
  const v = await opsæt();
  try {
    const a = await v.klient("havnen"), b = await v.klient("havnen"), anden = await v.klient("fjeldbyen");
    await a.net.forbind("Far", "familie");
    await b.net.forbind("Mor", "familie");
    await anden.net.forbind("Far", "nabo");
    await delSpillere(a, b);
    assert.equal(anden.net.erVært, true);
    assert.equal(anden.net.mitNavn, "Far", "Navne i andre rum skal ikke reserveres her");
    assert.equal(anden.net.navne.size, 0);
    a.net.sætTilstand({ bane: "ørken" });
    await ventTil(() => b.min.bane === "ørken", "bane i det rigtige rum");
    const fjernetFør = b.log.fjernet.length;
    a.net.tick(.05, () => spiller("slanger", 7));
    await ventTil(() => b.log.tilstande.some((e) => e.data.p[0] === 7), "nyt hold og position");
    assert.equal(b.log.fjernet.length, fjernetFør + 1);
    assert.equal(b.net.fjerne.size, 1);
    assert.equal(b.net.fjerne.get(a.net.dig).hold, "slanger");
    a.net.send({ k: "træf", liv: 36 }, anden.net.dig);
    await vent(30);
    assert.equal(anden.min.bane, "fjeldbyen");
    assert.equal(anden.net.navne.size, 0);
    assert.equal(anden.net.fjerne.size, 0);
    assert.equal(anden.log.hændelser.length, 0);
  } finally {
    await v.luk();
  }
});

Deno.test("Sigtekorns faktiske Online: serverens fejltekst og fuldt rum afvises gennem forbind-løftet", async () => {
  const v = await opsæt();
  try {
    const ugyldig = await v.klient();
    await assert.rejects(ugyldig.net.forbind("<Far>", "familie"), /Navnet skal have/);
    assert.equal(ugyldig.net.forbundet, false);
    ugyldig.net.luk();
    for (let i = 0; i < 8; i++) {
      const k = await v.klient();
      await k.net.forbind("Spiller " + i, "familie");
    }
    const niende = await v.klient();
    await assert.rejects(niende.net.forbind("Spiller 9", "familie"), /Rummet er fuldt \(8\)/);
    assert.equal(niende.net.forbundet, false);
    assert.equal(niende.net.navne.size, 0);
  } finally {
    await v.luk();
  }
});
