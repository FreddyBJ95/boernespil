import { strict as assert } from "node:assert";
import { X509Certificate } from "node:crypto";

const TID_UD = 5000;

// Beskeder, som lander før et await, ligger kort i kø. Hvert vent har sin egen faste grænse.
function kanal(socket) {
  const beskeder = [], ventende = new Set();
  let lukket = false;
  function fejl(e) {
    for (const v of ventende) {
      clearTimeout(v.timer);
      v.reject(e);
    }
    ventende.clear();
  }
  const modtag = (e) => {
    let b;
    try {
      b = JSON.parse(e.data);
    } catch {
      fejl(new Error("WSS-serveren sendte ugyldig JSON"));
      return;
    }
    const v = [...ventende].find((v) => v.type === b.t && v.vælg(b));
    if (v) {
      clearTimeout(v.timer);
      ventende.delete(v);
      v.resolve(b);
    } else beskeder.push(b);
  };
  const luk = () => {
    lukket = true;
    fejl(new Error("WSS-forbindelsen lukkede under prøven"));
  };
  socket.addEventListener("message", modtag);
  socket.addEventListener("close", luk);
  return {
    socket,
    send: (b) => socket.send(JSON.stringify(b)),
    vent(type, vælg = () => true) {
      const nr = beskeder.findIndex((b) => b.t === type && vælg(b));
      if (nr >= 0) return Promise.resolve(beskeder.splice(nr, 1)[0]);
      if (lukket) return Promise.reject(new Error("WSS-forbindelsen er lukket"));
      const p = new Promise((resolve, reject) => {
        const v = { type, vælg, resolve, reject };
        v.timer = setTimeout(() => {
          ventende.delete(v);
          reject(new Error("WSS mangler " + type));
        }, TID_UD);
        ventende.add(v);
      });
      // En efterfølgende send-fejl må ikke give et uobserveret løfte fra samme prøve.
      p.catch(() => {});
      return p;
    },
    ryd() {
      socket.removeEventListener("message", modtag);
      socket.removeEventListener("close", luk);
      fejl(new Error("WSS-prøven er afsluttet"));
      beskeder.length = 0;
    },
  };
}

// Også åbning og afslutning er begrænset, så en defekt pakket server ikke hænger i CI.
function åbn(socket) {
  return new Promise((resolve, reject) => {
    const afslut = (e) => {
      clearTimeout(timer);
      socket.removeEventListener("open", klar);
      socket.removeEventListener("error", fejl);
      socket.removeEventListener("close", fejl);
      if (e) reject(new Error("WSS kunne ikke åbnes med serverens eget rod-certifikat"));
      else resolve();
    };
    const klar = () => afslut();
    const fejl = (e) => afslut(e);
    const timer = setTimeout(() => afslut(true), TID_UD);
    socket.addEventListener("open", klar);
    socket.addEventListener("error", fejl);
    socket.addEventListener("close", fejl);
  });
}
function lukSocket(socket) {
  if (socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    const færdig = () => {
      clearTimeout(timer);
      socket.removeEventListener("close", færdig);
      resolve();
    };
    const timer = setTimeout(færdig, TID_UD);
    socket.addEventListener("close", færdig, { once: true });
    try {
      socket.close();
    } catch {
      færdig();
    }
  });
}

// Kun en særskilt loopback-testserver accepteres. Tilliden er lokal i denne ene HttpClient.
export async function prøvSikretSpilrum(httpbase, httpsport = 8443) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(httpbase)) throw new Error("Angiv testserverens http://127.0.0.1:port");
  if (!Number.isInteger(httpsport) || httpsport < 1 || httpsport > 65535) throw new Error("Ugyldig HTTPS-testport");
  const httpsbase = `https://127.0.0.1:${httpsport}`, forbindelser = [];
  let client;
  try {
    const certSvar = await fetch(httpbase + "/certifikat/broekraft.crt", { signal: AbortSignal.timeout(TID_UD) });
    assert.equal(certSvar.status, 200, "HTTP skal dele det offentlige DER-rod-certifikat");
    const rod = new X509Certificate(new Uint8Array(await certSvar.arrayBuffer()));
    assert.equal(rod.ca, true);
    const pem = rod.toString();
    assert.match(pem, /^-----BEGIN CERTIFICATE-----/);
    client = Deno.createHttpClient({ caCerts: [pem] });
    const fil = await fetch(httpsbase + "/spil/sigtekorn/online.js", { client, signal: AbortSignal.timeout(TID_UD) });
    assert.equal(fil.status, 200, "Sigtekorns klientfil skal kunne hentes med gyldig HTTPS");
    assert.equal(fil.headers.get("content-type"), "text/javascript; charset=utf-8");
    const kilde = await fil.text();
    assert.match(kilde, /export class Online/);
    assert.ok(kilde.includes("/ws/rum"));

    async function forbind(navn) {
      const socket = new WebSocket(httpsbase.replace("https:", "wss:") + "/ws/rum", { headers: { origin: httpsbase }, client });
      const k = kanal(socket);
      forbindelser.push(k);
      await åbn(socket);
      k.send({ t: "hej", spil: "sigtekorn", version: 1, navn, rum: "sikret-proeve" });
      k.velkommen = await k.vent("velkommen");
      return k;
    }
    const a = await forbind("Far");
    assert.equal(a.velkommen.vært, a.velkommen.dig);
    a.send({ t: "tilstand", data: { bane: "havnen" } });
    const b = await forbind("Mor");
    assert.equal(b.velkommen.vært, a.velkommen.dig);
    assert.deepEqual(b.velkommen.tilstand, { bane: "havnen" });
    assert.equal((await a.vent("ind")).id, b.velkommen.dig);
    const tilstand = { k: "tilstand", p: [1.2, 0, 40.5], hold: "slanger", våben: "storm" };
    b.send({ t: "til", data: tilstand });
    assert.deepEqual(await a.vent("fra"), { t: "fra", id: b.velkommen.dig, data: tilstand });
    const træf = { k: "træf", liv: 36, panser: 7, del: "krop" };
    a.send({ t: "til", til: b.velkommen.dig, data: træf });
    assert.deepEqual(await b.vent("fra"), { t: "fra", id: a.velkommen.dig, data: træf });
    await lukSocket(a.socket);
    assert.equal((await b.vent("ud")).id, a.velkommen.dig);
    assert.equal((await b.vent("vært")).id, b.velkommen.dig);
    await lukSocket(b.socket);
    return { httpsbase, vært: a.velkommen.dig, gæst: b.velkommen.dig };
  } finally {
    for (const k of forbindelser) k.ryd();
    await Promise.all(forbindelser.map((k) => lukSocket(k.socket)));
    client?.close();
  }
}

if (import.meta.main) {
  await prøvSikretSpilrum(Deno.args[0], Deno.args[1] ? Number(Deno.args[1]) : 8443);
  console.log("Gyldigt HTTPS/WSS: Sigtekorns klientfil, værtsbane, to spillere, position, direkte træf og ny vært består.");
}
