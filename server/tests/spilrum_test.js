import { strict as assert } from "node:assert";
import { Spilrum } from "../spilrum.js";

// Sockets og frister styres direkte, så tests hverken behøver netværk eller efterladte timere.
class Prøvesocket {
  constructor() {
    this.readyState = 1;
    this.bufferedAmount = 0;
    this.beskeder = [];
    this.lukninger = [];
    this.sendFejl = false;
    this.lukFejl = false;
  }
  send(rå) {
    if (this.sendFejl) throw new Error("Afsendelsen fejlede");
    this.beskeder.push(JSON.parse(rå));
  }
  close(kode, tekst) {
    this.lukninger.push({ kode, tekst });
    if (this.lukFejl) throw new Error("Lukningen fejlede");
    this.readyState = 3;
    this.onclose?.();
  }
  modtag(besked) {
    this.rå(JSON.stringify(besked));
  }
  rå(data) {
    this.onmessage?.({ data });
  }
  tag(type) {
    return this.beskeder.filter((besked) => besked.t === type);
  }
}

function opsæt(valg = {}) {
  let tid = 1000;
  let næsteFrist = 0;
  const frister = new Map();
  const app = new Spilrum({
    nu: () => tid,
    sætFrist: (handling, ms) => {
      const id = ++næsteFrist;
      frister.set(id, { handling, ms });
      return id;
    },
    rydFrist: (id) => frister.delete(id),
    ...valg,
  });
  return {
    app,
    frister,
    tid: (nu) => {
      tid = nu;
    },
    forbind: () => {
      const socket = new Prøvesocket();
      const spiller = app.tilslut(socket);
      return { socket, spiller };
    },
    ind: (navn = "Far", rum = "familie", spil = "sigtekorn", version = 1) => {
      const socket = new Prøvesocket();
      const spiller = app.tilslut(socket);
      socket.modtag({ t: "hej", navn, rum, spil, version });
      return { socket, spiller };
    },
  };
}

Deno.test("Spilrum: hej, længst tilstede som vært og velkommen uden egen spiller", () => {
  const v = opsæt();
  try {
    const a = v.ind("  Ægir  ", "  FAMILIE-Å2 ", "sigtekorn", 2);
    assert.equal(a.spiller.navn, "Ægir");
    assert.match(a.spiller.id, /^[a-f0-9]{12}$/);
    assert.equal(v.app.rum.size, 1);
    assert.ok(v.app.rum.has("sigtekorn/familie-å2"));
    assert.deepEqual(a.socket.tag("velkommen")[0], {
      t: "velkommen",
      dig: a.spiller.id,
      navn: "Ægir",
      vært: a.spiller.id,
      spillere: [],
      tilstand: null,
    });
    const b = v.ind("Mor", "familie-å2");
    assert.deepEqual(b.socket.tag("velkommen")[0].spillere, [{ id: a.spiller.id, navn: "Ægir" }]);
    assert.equal(b.socket.tag("velkommen")[0].vært, a.spiller.id);
    assert.deepEqual(a.socket.tag("ind"), [{ t: "ind", id: b.spiller.id, navn: "Mor" }]);
    assert.equal(v.frister.size, 0);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: NFC, Unicode-tegn og navnesuffix holder sig inden for 16 tegn", () => {
  const v = opsæt();
  try {
    const a = v.ind("A\u030Age");
    const b = v.ind("Åge");
    const c = v.ind("åge");
    assert.equal(a.spiller.navn, "Åge");
    assert.equal(b.spiller.navn, "Åge 2");
    assert.equal(c.spiller.navn, "åge 3");
    const lang = "𝒜".repeat(16);
    const d = v.ind(lang);
    const e = v.ind(lang);
    assert.equal(d.spiller.navn, lang);
    assert.equal(e.spiller.navn, "𝒜".repeat(14) + " 2");
    assert.equal([...e.spiller.navn].length, 16);
    const f = v.ind("  Ida-3  ");
    assert.equal(f.spiller.navn, "Ida-3");
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: navne, spil, version og rum valideres uden at oprette et rum", () => {
  const v = opsæt();
  try {
    const ugyldige = [
      { navn: "" },
      { navn: "x".repeat(17) },
      { navn: "Hej!" },
      { navn: "🦊" },
      { navn: "A\nB" },
      { rum: "" },
      { rum: "x".repeat(21) },
      { rum: "a/b" },
      { rum: "to rum" },
      { spil: "a" },
      { spil: "Sigtekorn" },
      { spil: "ææ" },
      { spil: "x".repeat(17) },
      { version: "1" },
      { version: 1.2 },
      { version: null },
    ];
    const { socket } = v.forbind();
    for (const ændring of ugyldige) {
      socket.modtag({ t: "hej", spil: "sigtekorn", version: 1, navn: "Far", rum: "familie", ...ændring });
    }
    assert.equal(socket.tag("fejl").length, ugyldige.length);
    assert.ok(socket.tag("fejl").every((besked) => typeof besked.tekst === "string"));
    assert.equal(v.app.rum.size, 0);
    assert.equal(v.app.forbindelser.size, 1);
    socket.modtag({ t: "hej", spil: "sigtekorn", version: 1, navn: "Far", rum: "familie" });
    assert.equal(socket.tag("velkommen").length, 1);
    socket.modtag({ t: "hej", spil: "andetspil", version: 1, navn: "Far", rum: "nytrum" });
    assert.equal(v.app.rum.size, 1);
    assert.equal(socket.tag("velkommen").length, 1);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: ottende deltager accepteres, niende får fuld og lukkes", () => {
  const v = opsæt();
  try {
    const deltagere = Array.from({ length: 8 }, (_, nr) => v.ind(`Spiller ${nr}`));
    const niende = v.ind("Ny");
    assert.equal(niende.socket.tag("fuld").length, 1);
    assert.equal(niende.socket.tag("velkommen").length, 0);
    assert.equal(niende.socket.lukninger[0].kode, 1008);
    assert.equal(v.app.forbindelser.size, 8);
    assert.equal(v.app.rum.get("sigtekorn/familie").spillere.size, 8);
    deltagere[3].socket.close();
    assert.equal(v.ind("Ny igen").socket.tag("velkommen").length, 1);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: broadcast, unicast og opaque data isoleres mellem både spil og rum", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor"), c = v.ind("Ida");
    const d = v.ind("Anden", "andet"), e = v.ind("Andet spil", "familie", "krystal");
    const data = { helt: [1, 2, 3], vilkårlig: { liv: -20, t: "hej", navn: "opaque" } };
    a.socket.modtag({ t: "til", data });
    assert.deepEqual(b.socket.tag("fra"), [{ t: "fra", id: a.spiller.id, data }]);
    assert.deepEqual(c.socket.tag("fra"), b.socket.tag("fra"));
    for (const k of [a, d, e]) assert.equal(k.socket.tag("fra").length, 0);
    a.socket.modtag({ t: "til", til: b.spiller.id, data: { kun: "Mor" } });
    assert.equal(b.socket.tag("fra").length, 2);
    assert.equal(c.socket.tag("fra").length, 1);
    for (const id of [d.spiller.id, e.spiller.id, a.spiller.id, "ukendt"]) {
      a.socket.modtag({ t: "til", til: id, data: { skjult: true } });
    }
    assert.equal(b.socket.tag("fra").length, 2);
    for (const k of [a, d, e]) assert.equal(k.socket.tag("fra").length, 0);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: kun vært kan gemme tilstand, som følger med næste velkomst", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor");
    b.socket.modtag({ t: "tilstand", data: { bane: "forbudt" } });
    for (const data of [null, [], undefined]) b.socket.modtag({ t: "tilstand", data });
    assert.equal(a.socket.tag("tilstand").length, 0);
    assert.equal(b.socket.tag("fejl").length, 0, "Alle tilstande fra en gæst ignoreres, også med ugyldige data");
    assert.equal(v.app.rum.get("sigtekorn/familie").tilstand, null);
    const data = { bane: "havnen", regler: ["rolige", 2] };
    a.socket.modtag({ t: "tilstand", data });
    assert.deepEqual(b.socket.tag("tilstand"), [{ t: "tilstand", data }]);
    assert.equal(a.socket.tag("tilstand").length, 0);
    const c = v.ind("Ida");
    assert.deepEqual(c.socket.tag("velkommen")[0].tilstand, data);
    a.socket.close();
    b.socket.modtag({ t: "tilstand", data: { bane: "skoven" } });
    assert.deepEqual(c.socket.tag("tilstand").at(-1), { t: "tilstand", data: { bane: "skoven" } });
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: vært overtages i indtrædelsesrækkefølge og tomme rum fjernes", () => {
  const v = opsæt();
  try {
    const venter = v.forbind();
    const a = v.ind("Far"), b = v.ind("Mor"), c = v.ind("Ida");
    venter.socket.modtag({ t: "hej", spil: "sigtekorn", version: 1, navn: "Venter", rum: "familie" });
    const ud = a.socket.onclose;
    a.socket.close();
    ud();
    assert.deepEqual(b.socket.tag("ud"), [{ t: "ud", id: a.spiller.id }]);
    assert.deepEqual(b.socket.tag("vært"), [{ t: "vært", id: b.spiller.id }]);
    b.socket.close();
    assert.equal(c.socket.tag("vært").at(-1).id, c.spiller.id);
    c.socket.close();
    assert.equal(venter.socket.tag("vært").at(-1).id, venter.spiller.id);
    venter.socket.close();
    assert.equal(v.app.rum.size, 0);
    assert.equal(v.app.forbindelser.size, 0);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: data må fylde præcis 1500/512 UTF8-byte, ikke flere", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor");
    a.socket.modtag({ t: "til", data: { x: "æ".repeat(746) } });
    a.socket.modtag({ t: "til", data: { x: "æ".repeat(747) } });
    assert.equal(b.socket.tag("fra").length, 1);
    a.socket.modtag({ t: "tilstand", data: { x: "ø".repeat(252) } });
    a.socket.modtag({ t: "tilstand", data: { x: "ø".repeat(253) } });
    assert.equal(b.socket.tag("tilstand").length, 1);
    assert.equal(v.ind("Ida").socket.tag("velkommen")[0].tilstand.x.length, 252);
    assert.equal(a.socket.tag("fejl").length, 0);
    assert.equal(a.socket.readyState, 1);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: rå kuvert over 4096 byte droppes før parse, præcis 4096 behandles", () => {
  const v = opsæt();
  try {
    const { socket } = v.forbind();
    socket.rå("{" + "æ".repeat(2048));
    assert.equal(socket.tag("fejl").length, 0);
    socket.rå("{" + " ".repeat(4095));
    assert.equal(socket.tag("fejl").length, 1);
    const hej = { t: "hej", spil: "sigtekorn", version: 1, navn: "Far", rum: "familie", ekstra: "" };
    const længde = new TextEncoder().encode(JSON.stringify(hej)).byteLength;
    hej.ekstra = "x".repeat(4097 - længde);
    socket.modtag(hej);
    assert.equal(socket.tag("velkommen").length, 0);
    hej.ekstra = hej.ekstra.slice(1);
    socket.modtag(hej);
    assert.equal(socket.tag("velkommen").length, 1);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: 40 data pr. spiller i rullende sekund, ikke i faste sekundvinduer", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor");
    for (let nr = 0; nr < 20; nr++) a.socket.modtag({ t: "til", data: { nr } });
    v.tid(1500);
    for (let nr = 20; nr < 40; nr++) a.socket.modtag({ t: "tilstand", data: { nr } });
    v.tid(1999);
    a.socket.modtag({ t: "til", data: { nr: 40 } });
    assert.equal(b.socket.tag("fra").length + b.socket.tag("tilstand").length, 40);
    v.tid(2000);
    for (let nr = 0; nr < 21; nr++) a.socket.modtag({ t: "til", data: { nr } });
    assert.equal(b.socket.tag("fra").length + b.socket.tag("tilstand").length, 60);
    v.tid(2499);
    a.socket.modtag({ t: "til", data: { nr: 99 } });
    assert.equal(b.socket.tag("fra").length, 40);
    v.tid(2500);
    a.socket.modtag({ t: "til", data: { nr: 100 } });
    assert.equal(b.socket.tag("fra").length, 41);
    assert.equal(a.socket.readyState, 1);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: 240 data pr. rum, rullende udløb og ingen påvirkning af andre rum", () => {
  const v = opsæt();
  try {
    const deltagere = Array.from({ length: 8 }, (_, nr) => v.ind(`Spiller ${nr}`));
    for (const spiller of deltagere.slice(0, 6)) {
      for (let nr = 0; nr < 40; nr++) spiller.socket.modtag({ t: "til", data: { nr } });
    }
    const modtager = deltagere[7];
    assert.equal(modtager.socket.tag("fra").length, 240);
    const syvende = deltagere[6];
    syvende.socket.modtag({ t: "til", data: { nr: 241 } });
    assert.equal(modtager.socket.tag("fra").length, 240);
    assert.equal(syvende.spiller.tider.length, 0);
    const anden = v.ind("Anden", "andet"), andenVen = v.ind("Ven", "andet");
    anden.socket.modtag({ t: "til", data: { okay: true } });
    assert.equal(andenVen.socket.tag("fra").length, 1);
    v.tid(1999);
    syvende.socket.modtag({ t: "til", data: {} });
    assert.equal(modtager.socket.tag("fra").length, 240);
    v.tid(2000);
    for (let nr = 0; nr < 40; nr++) syvende.socket.modtag({ t: "til", data: { nr } });
    assert.equal(modtager.socket.tag("fra").length, 280);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: første data og ugyldig JSON giver bounded fejl, ukendte typer ignoreres", () => {
  const v = opsæt();
  try {
    const { socket } = v.forbind();
    socket.modtag({ t: "ukendt" });
    assert.equal(socket.beskeder.length, 0);
    socket.modtag({ t: "til", data: {} });
    assert.equal(socket.tag("fejl")[0].tekst, "Send hej først");
    for (let nr = 0; nr < 100; nr++) socket.rå("{");
    assert.equal(socket.tag("fejl").length, 40);
    assert.equal(socket.readyState, 1);
    v.tid(1999);
    socket.rå("{");
    assert.equal(socket.tag("fejl").length, 40);
    v.tid(2000);
    socket.rå("{");
    assert.equal(socket.tag("fejl").length, 41);
    socket.modtag({ t: "hej", spil: "sigtekorn", version: 1, navn: "Far", rum: "familie" });
    assert.equal(socket.tag("velkommen").length, 1);
    for (const data of [null, [], 4, "tekst"]) socket.modtag({ t: "til", data });
    assert.equal(socket.tag("fra").length, 0);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: binary lukkes 1003, error og gentagne close rydder idempotent", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor");
    const ud = a.socket.onclose;
    a.socket.rå(new Uint8Array([1, 2]).buffer);
    assert.equal(a.socket.lukninger[0].kode, 1003);
    ud();
    assert.equal(b.socket.tag("ud").length, 1);
    assert.equal(v.app.forbindelser.size, 1);
    assert.equal(b.socket.tag("vært")[0].id, b.spiller.id);
    b.socket.onerror();
    assert.equal(b.socket.lukninger[0].kode, 1011);
    assert.equal(v.app.forbindelser.size, 0);
    assert.equal(v.app.rum.size, 0);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: sendefejl hos næste vært og kaster fra close efterlader ingen spøgelsesvært", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor"), c = v.ind("Ida");
    b.socket.sendFejl = true;
    b.socket.lukFejl = true;
    a.socket.close();
    assert.equal(v.app.forbindelser.size, 1);
    assert.equal(v.app.rum.get("sigtekorn/familie").vært, c.spiller.id);
    assert.equal(c.socket.tag("vært").at(-1).id, c.spiller.id);
    assert.equal(c.socket.tag("ud").filter((besked) => besked.id === b.spiller.id).length, 1);
    const d = v.forbind();
    d.socket.sendFejl = true;
    d.socket.modtag({ t: "hej", spil: "sigtekorn", version: 1, navn: "Ny", rum: "nyt" });
    assert.equal(v.app.rum.has("sigtekorn/nyt"), false);
    assert.equal(v.app.forbindelser.size, 1);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: sendefejl under værtens annoncering må ikke sende den lukkede vært bagefter", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor"), c = v.ind("Ida"), d = v.ind("Ven");
    const send = b.socket.send.bind(b.socket);
    // Ud-beskeden virker; det er netop den efterfølgende vært-besked, der får forbindelsen til at fejle.
    b.socket.send = (rå) => {
      if (JSON.parse(rå).t === "vært") throw new Error("Forbindelsen døde under værtens annoncering");
      send(rå);
    };
    a.socket.close();
    assert.equal(v.app.forbindelser.size, 2);
    assert.equal(v.app.rum.get("sigtekorn/familie").vært, c.spiller.id);
    for (const overlevende of [c, d]) {
      assert.deepEqual(overlevende.socket.tag("vært"), [{ t: "vært", id: c.spiller.id }]);
      assert.equal(overlevende.socket.tag("ud").filter((besked) => besked.id === b.spiller.id).length, 1);
      assert.equal(overlevende.socket.tag("ud").filter((besked) => besked.id === a.spiller.id).length, 1);
    }
    assert.equal(b.socket.lukninger[0].kode, 1011);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: langsom modtager lukkes 1013 over 4 MiB uden at stoppe de øvrige", () => {
  const v = opsæt();
  try {
    const a = v.ind("Far"), b = v.ind("Mor"), c = v.ind("Ida");
    b.socket.bufferedAmount = 4 * 1024 * 1024;
    a.socket.modtag({ t: "til", data: { nr: 1 } });
    assert.equal(b.socket.tag("fra").length, 1);
    b.socket.bufferedAmount++;
    a.socket.modtag({ t: "til", data: { nr: 2 } });
    assert.equal(b.socket.lukninger[0].kode, 1013);
    assert.equal(b.socket.tag("fra").length, 1);
    assert.equal(c.socket.tag("fra").length, 2);
    assert.deepEqual(c.socket.tag("ud"), [{ t: "ud", id: b.spiller.id }]);
    assert.equal(v.app.forbindelser.size, 2);
    assert.equal(v.app.rum.get("sigtekorn/familie").spillere.size, 2);
    const d = v.forbind();
    d.socket.bufferedAmount = 4 * 1024 * 1024 + 1;
    d.socket.modtag({ t: "hej", spil: "sigtekorn", version: 1, navn: "Ny", rum: "nyt" });
    assert.equal(d.socket.lukninger[0].kode, 1013);
    assert.equal(v.app.rum.has("sigtekorn/nyt"), false);
    assert.equal(v.frister.size, 0);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: ID-kollision genprøves også mod en forbindelse uden hej", () => {
  const ids = ["aaaaaaaaaaaa", "aaaaaaaaaaaa", "bbbbbbbbbbbb", "zzzzzzzzzzzz", "cccccccccccc"];
  const v = opsæt({ lavId: () => ids.shift() });
  try {
    const a = v.forbind(), b = v.forbind(), c = v.ind();
    assert.equal(a.spiller.id, "aaaaaaaaaaaa");
    assert.equal(b.spiller.id, "bbbbbbbbbbbb");
    assert.equal(c.spiller.id, "cccccccccccc");
    assert.equal(v.app.forbindelser.size, 3);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: første-hej-frist ryddes ved hej, timeout, error og shutdown", () => {
  const v = opsæt();
  try {
    const a = v.forbind();
    assert.equal(v.app.forbindelser.size, 1);
    assert.equal(v.frister.size, 1);
    const frist = [...v.frister.values()][0];
    assert.equal(frist.ms, 10000);
    frist.handling();
    assert.equal(a.socket.lukninger[0].kode, 1008);
    assert.equal(v.frister.size, 0);
    assert.equal(v.app.forbindelser.size, 0);
    v.ind("Far");
    assert.equal(v.frister.size, 0);
    const b = v.forbind();
    b.socket.onerror();
    assert.equal(v.frister.size, 0);
    const c = v.forbind();
    c.socket.lukFejl = true;
    v.app.luk();
    assert.equal(v.app.rum.size, 0);
    assert.equal(v.app.forbindelser.size, 0);
    assert.equal(v.frister.size, 0);
    assert.equal(c.socket.lukninger[0].kode, 1001);
    const efter = v.forbind();
    assert.equal(efter.socket.lukninger[0].kode, 1001);
    assert.equal(v.app.forbindelser.size, 0);
    assert.equal(v.frister.size, 0);
  } finally {
    v.app.luk();
  }
});

Deno.test("Spilrum: normale timere opryddes også uden hej", () => {
  const app = new Spilrum();
  try {
    const socket = new Prøvesocket();
    app.tilslut(socket);
    assert.equal(app.forbindelser.size, 1);
    app.luk();
    assert.equal(socket.lukninger[0].kode, 1001);
    assert.equal(app.forbindelser.size, 0);
  } finally {
    app.luk();
  }
});
