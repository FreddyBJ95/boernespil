import { extname, sep, resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Verdenslager, metadata, VERSION, UDGAVE } from "./verdener.js";
import { Rum } from "./rum.js";
import { UendeligtRum } from "./uendelig-rum.js";
import { FIGURER, læsBesked, send } from "./protokol.js";
import { hentCertifikater, certifikatSvar } from "./certifikat.js";
import { Netværkstjek } from "./netvaerk.js";

const ROD = fileURLToPath(new URL("../", import.meta.url));
// Logoer og spillets billeder og 3D-modeller får den filtype, browseren forventer.
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".mp3": "audio/mpeg", ".woff2": "font/woff2",
  ".glb": "model/gltf-binary", ".bin": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
};
export const lokal = ip => ip === "127.0.0.1" || ip === "::1";
export function privat(ip) {
  const tal = ip.split(".").map(Number);
  return tal.length === 4 && tal.every(n => Number.isInteger(n) && n >= 0 && n <= 255) && (tal[0] === 10 || (tal[0] === 172 && tal[1] >= 16 && tal[1] <= 31) || (tal[0] === 192 && tal[1] === 168));
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": MIME[".json"], "cache-control": "no-store" } });

export class BroekraftServer {
  constructor({ lager = new Verdenslager(), adresser = [], netværkstjek = new Netværkstjek() } = {}) {
    Object.assign(this, { lager, adresser });
    this.netværkstjek = netværkstjek; this.tabletSet = false;
    this.rum = new Map(); this.job = new Map(); this.spillere = new Set(); this.låse = new Map();
    this.token = crypto.randomUUID();
    this.værter = new Set(["localhost", "127.0.0.1", "[::1]", ...adresser]);
  }

  // Verdener, der kørte sidst (eller aldrig er stoppet af en voksen), starter af sig selv igen
  async init() {
    this.metadata = new Map((await this.lager.liste()).map(m => [m.id, m]));
    for (const m of this.metadata.values()) if (m.kører !== false) {
      try { await this.start(m.id); } catch (fejl) { console.error(`Kunne ikke starte "${m.navn}":`, fejl.message); }
    }
  }
  // Husk i meta.json, om en voksen har startet eller stoppet verdenen
  async husk(id, kører) {
    const meta = { ...this.metadata.get(id), kører };
    await this.lager.gemMeta(meta);
    this.metadata.set(id, meta);
    const r = this.rum.get(id);
    if (r) r.meta = meta;
  }
  liste(version) {
    return [...this.rum.values()].filter(r => version !== "0.1.0" || !(r instanceof UendeligtRum))
      .map(r => ({ id: r.meta.id, navn: r.meta.navn, type: r.meta.type, bredde: r.meta.bredde, dybde: r.meta.dybde, uendelig: r instanceof UendeligtRum, spillere: r.spillere.size, maks: r.meta.maksSpillere }));
  }

  // Én handling pr. verden ad gangen undgår dobbelt start og sletning midt i backup.
  async lås(id, handling) {
    const forrige = this.låse.get(id) || Promise.resolve();
    const næste = forrige.catch(() => {}).then(handling);
    this.låse.set(id, næste);
    try { return await næste; }
    finally { if (this.låse.get(id) === næste) this.låse.delete(id); }
  }

  async start(id) {
    if (this.rum.has(id)) return;
    const { meta, data } = await this.lager.indlæs(id);
    this.rum.set(id, meta.type === "uendelig" && meta.version === "0.2.0" ? new UendeligtRum(meta, data) : new Rum(meta, data));
  }

  async gem(rum) {
    if (rum.revision === rum.gemtRevision) return;
    const revision = rum.revision;
    await this.lager.gem(rum.meta, rum.data);
    rum.gemtRevision = revision;
  }

  async stop(id) {
    const rum = this.rum.get(id);
    if (!rum) return;
    try {
      await rum.afslut(); this.rum.delete(id);
      await this.gem(rum);
      if (rum instanceof UendeligtRum) await rum.data.luk();
    } catch (fejl) { rum.stoppet = false; this.rum.set(id, rum); throw fejl; }
  }

  opret(valg) {
    if ([...this.job.values()].some(j => j.status === "arbejder")) throw new Error("Vent til den igangværende verden er færdig");
    const meta = metadata(valg), job = { id: meta.id, navn: meta.navn, procent: 0, status: "arbejder" };
    this.job.set(meta.id, job);
    // Uendeligt land laves ved besøg, så oprettelsen gemmer kun frø og indstillinger.
    if (meta.type === "uendelig" && meta.version === "0.2.0") {
      meta.kører = true;
      job.færdig = this.lås(meta.id, async () => {
        try {
          await this.lager.gemMeta(meta); this.metadata.set(meta.id, meta);
          if (!this.lukker) await this.start(meta.id);
          job.procent = 100; job.status = "færdig";
        } catch (fejl) { job.status = "fejl"; job.fejl = fejl.message; }
      });
      return meta.id;
    }
    const worker = new Worker(new URL("./generator-worker.js", import.meta.url).href, { type: "module" });
    job.færdig = new Promise(resolve => {
      const afslut = () => { worker.terminate(); resolve(); };
      worker.onerror = e => { e.preventDefault(); job.status = "fejl"; job.fejl = e.message; afslut(); };
      worker.onmessage = async ({ data }) => {
        if (data.fejl) { job.status = "fejl"; job.fejl = data.fejl; afslut(); return; }
        if (data.procent != null) job.procent = Math.min(99, data.procent);
        if (data.data) {
          try {
            meta.kører = true;                                     // nye verdener starter — også efter en genstart
            await this.lager.gem(meta, data.data);
            this.metadata.set(meta.id, meta);
            if (!this.lukker) this.rum.set(meta.id, new Rum(meta, data.data));
            job.procent = 100; job.status = "færdig";
          } catch (fejl) { job.status = "fejl"; job.fejl = fejl.message; }
          afslut();
        }
      };
    });
    worker.postMessage(meta);
    return meta.id;
  }

  tilslut(socket) {
    const s = { id: crypto.randomUUID(), socket, rum: null, hej: false, vindue: performance.now(), antal: 0, ventende: 0, kø: Promise.resolve() };
    this.spillere.add(s);
    socket.onmessage = ({ data }) => {
      try {
        const nu = performance.now();
        if (nu - s.vindue >= 1000) { s.vindue = nu; s.antal = 0; }
        if (++s.antal > 100 || s.ventende >= 128) { socket.close(1008, "For mange beskeder"); return; }
        const b = læsBesked(data);
        if (!b) return;                                // for store kosmetiske effekter ignoreres stille
        // Hver tablet får sin egen kø, så et valg bliver færdigt før den første bygning.
        s.ventende++;
        s.kø = s.kø.then(async () => {
          if (this.lukker || !this.spillere.has(s)) return;
          if (b.t === "hej") {
            if (!FIGURER.includes(b.figur) || !["0.1.0", VERSION].includes(b.version)) { send(s, { t: "fejl", besked: "Ukendt figur eller version; genindlæs siden" }); return; }
            if (!s.hej) { s.figur = b.figur; s.version = b.version; s.hej = true; }
            return;
          }
          if (!s.hej) { send(s, { t: "fejl", besked: "Send hej først" }); return; }
          if (b.t === "verdener") { send(s, { t: "verdener", liste: this.liste(s.version) }); return; }
          if (b.t === "vælg") {
            const rum = this.rum.get(b.verden);
            if (!rum) { send(s, { t: "fejl", besked: "Verdenen er ikke startet" }); return; }
            if (s.version === "0.1.0" && rum instanceof UendeligtRum) { send(s, { t: "fejl", besked: "Genindlæs spillet for at besøge Den uendelige verden" }); return; }
            if (s.rum !== rum && rum.spillere.size >= rum.meta.maksSpillere) { send(s, { t: "fuld" }); return; }
            await rum.ind(s, () => this.spillere.has(s) && this.rum.get(b.verden) === rum); return;
          }
          await s.rum?.besked(s, b);
        }).catch(fejl => send(s, { t: "fejl", besked: fejl.message }))
          .finally(() => { s.ventende--; });
      } catch (fejl) { send(s, { t: "fejl", besked: fejl instanceof SyntaxError ? "Ugyldig JSON" : fejl.message }); }
    };
    socket.onclose = () => { s.rum?.ud(s); this.spillere.delete(s); };
    socket.onerror = () => socket.close();
  }

  // Kontrolpanelet kræver loopback, korrekt Host og ved ændringer også origin + lokalt token.
  async håndter(req, info) {
    try {
      const url = new URL(req.url), sti = decodeURIComponent(url.pathname), ip = info.remoteAddr.hostname;
      if (this.lukker) return new Response("Serveren lukker", { status: 503 });
      if (!this.værter.has(url.hostname) || (!lokal(ip) && !privat(ip))) return new Response("Kun lokalnettet", { status: 403 });
      const kontrol = sti === "/kontrol" || sti.startsWith("/kontrol/") || sti.startsWith("/api/");
      if (kontrol && !lokal(ip)) return new Response("Kun på serverens computer", { status: 403 });
      if (!lokal(ip) && !kontrol) this.tabletSet = true;
      if (this.certifikater && (sti === "/certifikat" || sti.startsWith("/certifikat/"))) {
        if (!["GET", "HEAD"].includes(req.method)) return new Response("Metoden er ikke tilladt", { status: 405 });
        const svar = certifikatSvar(sti, this.certifikater, `https://${url.hostname}:${this.httpsPort}/`);
        return req.method === "HEAD" ? new Response(null, { status: svar.status, headers: svar.headers }) : svar;
      }
      if (this.certifikater && url.protocol === "http:" && ["/", "/sammen", "/sammen/"].includes(sti)) {
        return new Response(null, { status: 307, headers: { location: `https://${url.hostname}:${this.httpsPort}${url.pathname}${url.search}`, "cache-control": "no-store" } });
      }
      if (sti.startsWith("/api/")) {
        if (req.method !== "GET" && (req.headers.get("origin") !== url.origin || req.headers.get("x-broekraft-token") !== this.token)) return new Response("Åbn kontrolpanelet igen", { status: 403 });
        return await this.api(req, sti);
      }
      if (sti === "/ws") {
        if (req.headers.get("origin") && req.headers.get("origin") !== url.origin) return new Response("Forkert oprindelse", { status: 403 });
        if (this.spillere.size >= 128) return new Response("For mange forbindelser", { status: 503 });
        const { socket, response } = Deno.upgradeWebSocket(req, { idleTimeout: 30 });
        this.tilslut(socket); return response;
      }
      if (sti === "/verdensliste") return json(this.liste());
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Metoden er ikke tilladt", { status: 405 });
      return await this.fil(sti, req.method === "HEAD");
    } catch (fejl) {
      if (fejl instanceof Deno.errors.NotFound) return json({ fejl: "Filen eller verdenen findes ikke" }, 404);
      console.error(fejl);
      return json({ fejl: fejl.message }, 400);
    }
  }

  async api(req, sti) {
    if (sti === "/api/status" && req.method === "GET") return json({
      token: this.token, version: UDGAVE, adresser: this.adresser.map(ip => this.certifikater ? `https://${ip}:${this.httpsPort}/` : `http://${ip}:${this.port}/`), datamappe: this.lager.rod,
      netværk: await this.netværkstjek.hent(this.adresser), tabletSet: this.tabletSet,
      certifikatAdresser: this.certifikater ? this.adresser.map(ip => `http://${ip}:${this.port}/certifikat`) : [], aftryk: this.certifikater?.aftryk,
      verdener: [...this.metadata.values()].map(m => ({ ...m, uendelig: m.type === "uendelig" && m.version === "0.2.0", startet: this.rum.has(m.id), spillere: this.rum.get(m.id)?.spillere.size || 0 })),
      spillere: [...this.spillere].filter(s => s.rum).map(s => ({ figur: s.figur, verden: s.rum.meta.navn })),
      job: [...this.job.values()].map(({ færdig: _, ...j }) => j),
    });
    if (req.method !== "POST") return json({ fejl: "Ukendt handling" }, 404);
    // Læs med en grænse, også når Content-Length mangler.
    const reader = req.body?.getReader(); let tekst = "", antal = 0;
    const decoder = new TextDecoder();
    if (reader) while (true) {
      const { value, done } = await reader.read(); if (done) break;
      antal += value.length;
      if (antal > 4096) { await reader.cancel(); return json({ fejl: "For stor forespørgsel" }, 413); }
      tekst += decoder.decode(value, { stream: true });
    }
    tekst += decoder.decode();
    const b = JSON.parse(tekst || "{}");
    if (sti === "/api/opret") return json({ id: this.opret(b) }, 202);
    if (!this.metadata.has(b.id)) return json({ fejl: "Ukendt verden" }, 404);
    return await this.lås(b.id, async () => {
      if (sti === "/api/start") { await this.start(b.id); await this.husk(b.id, true); }
      else if (sti === "/api/stemmer") {
        if (typeof b.til !== "boolean") return json({ fejl: "Vælg til eller fra" }, 400);
        const meta = { ...this.metadata.get(b.id), stemmer: b.til };
        await this.lager.gemMeta(meta);
        this.metadata.set(b.id, meta);
        const r = this.rum.get(b.id);
        if (r) { r.meta = meta; r.skiftStemmer(b.til); }
      }
      else if (sti === "/api/stop") { await this.stop(b.id); await this.husk(b.id, false); }
      else if (sti === "/api/backup") {
        const r = this.rum.get(b.id); if (r) await this.gem(r);
        return json({ mappe: await this.lager.backup(b.id) });
      } else if (sti === "/api/slet") {
        if (b.bekræft !== b.id || b.bekræftIgen !== "SLET") return json({ fejl: "Bekræft sletningen to gange" }, 400);
        await this.stop(b.id); await this.lager.slet(b.id); this.metadata.delete(b.id); this.job.delete(b.id);
      } else return json({ fejl: "Ukendt handling" }, 404);
      return json({ ok: true });
    });
  }

  // Kun offentlige spilfiler udleveres; serverkode, Git og gemte verdener er aldrig offentlige.
  async fil(sti, kunHeader) {
    let relativ;
    if (sti === "/") relativ = "server/sammen/index.html";
    else if (sti === "/kontrol" || sti === "/kontrol/") relativ = "server/kontrol/index.html";
    else if (/^\/kontrol\/(kontrol\.(css|js)|verdensvalg\.js|qrcode\.js)$/.test(sti)) relativ = sti.endsWith("qrcode.js") ? "server/vendor/qrcode.js" : `server${sti}`;
    else if (sti === "/sammen" || sti === "/sammen/") relativ = "server/sammen/index.html";
    else if (sti === "/sammen/sammen.js") relativ = "server/sammen/sammen.js";
    else if (sti === "/tilslut") return new Response(null, { status: 307, headers: { location: "/tilslut/" } });
    else if (sti === "/tilslut/") relativ = "tilslut/index.html";
    else if (/^\/tilslut\/(index\.html|tilslut\.(css|js)|adresse\.js|vendor\/jsQR\.js)$/.test(sti)) relativ = sti.slice(1);
    else if (sti === "/test-klient.html" || sti === "/test-klient.js") relativ = `server${sti}`;
    else {
      if (sti.includes("\\") || sti.includes("\0") || sti.split("/").some(del => del.startsWith("."))) return new Response("Ikke fundet", { status: 404 });
      if (!sti.startsWith("/spil/") && !sti.startsWith("/billeder/") &&
        !/^\/(index\.html|style\.css|effekter\.js|manifest\.json|sw\.js|icon-(192|512)\.png|favicon\.png|apple-touch-icon\.png|icon-maskable-512\.png)$/.test(sti)) return new Response("Ikke fundet", { status: 404 });
      relativ = sti.slice(1) + (sti.endsWith("/") ? "index.html" : "");
    }
    const fil = resolve(ROD, relativ);
    if (!fil.startsWith(resolve(ROD) + sep) || !MIME[extname(fil)]) return new Response("Ikke fundet", { status: 404 });
    const data = await Deno.readFile(fil);
    return new Response(kunHeader ? null : data, { headers: { "content-type": MIME[extname(fil)], "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  }

  kørTimere() {
    this.tickTimer = setInterval(() => { for (const r of this.rum.values()) r.tick(0.05); }, 50);
    this.gemTimer = setInterval(() => {
      for (const [id, r] of this.rum) this.lås(id, () => this.gem(r)).catch(fejl => console.error("Kunne ikke gemme:", fejl));
    }, 60000);
  }

  async luk() {
    this.lukker = true; clearInterval(this.tickTimer); clearInterval(this.gemTimer);
    await Promise.all([...this.spillere].map(s => s.kø));
    for (const s of this.spillere) s.socket.close(1001, "Serveren lukker");
    await Promise.all([...this.job.values()].map(j => j.færdig));
    await Promise.all([...this.låse.values()]);
    for (const id of [...this.rum.keys()]) await this.stop(id);
  }
}

// Lyt kun på loopback og private netkort; der oprettes ingen port-forwarding.
export async function startServer({ port = 8080, httpsPort = 8443, lager, åbn = true } = {}) {
  const adresser = [...new Set(Deno.networkInterfaces().map(n => n.address).filter(privat))];
  const app = new BroekraftServer({ lager, adresser }); await app.init();
  app.certifikater = await hentCertifikater(join(dirname(app.lager.rod), "certifikater"), adresser);
  app.httpsPort = httpsPort;
  let servere = [];
  for (; port < 8180; port++) {
    try {
      for (const hostname of ["127.0.0.1", ...adresser]) servere.push(Deno.serve({ hostname, port, onListen() {} }, (req, info) => app.håndter(req, info)));
      break;
    } catch (fejl) {
      await Promise.all(servere.map(s => s.shutdown())); servere = [];
      if (!(fejl instanceof Deno.errors.AddrInUse)) throw fejl;
    }
  }
  if (!servere.length) throw new Error("Ingen ledig port mellem 8080 og 8179");
  try {
    for (const hostname of ["127.0.0.1", ...adresser]) servere.push(Deno.serve({ hostname, port: httpsPort, cert: app.certifikater.cert, key: app.certifikater.key, onListen() {} }, (req, info) => app.håndter(req, info)));
  } catch (fejl) {
    await Promise.all(servere.map(s => s.shutdown()));
    throw new Error(`Kunne ikke åbne HTTPS-port ${httpsPort}. Luk en eventuel anden server og prøv igen. ${fejl.message}`);
  }
  app.port = port; app.kørTimere();
  const url = `http://127.0.0.1:${port}/kontrol`;
  console.log(`Broekraft Server ${UDGAVE}\nKontrolpanel: ${url}\nLad dette vindue stå åbent. Stop med Ctrl+C.`);
  if (åbn) {
    const cmd = Deno.build.os === "windows" ? ["rundll32.exe", "url.dll,FileProtocolHandler", url] : Deno.build.os === "darwin" ? ["open", url] : ["xdg-open", url];
    try { const barn = new Deno.Command(cmd[0], { args: cmd.slice(1), stdout: "null", stderr: "null" }).spawn(); barn.unref(); }
    catch { console.log("Åbn kontrolpanelet med adressen ovenfor."); }
  }
  return { app, servere, async luk() { await app.luk(); await Promise.all(servere.map(s => s.shutdown())); } };
}

if (import.meta.main) {
  const server = await startServer({ åbn: !Deno.args.includes("--ingen-browser") });
  let lukker = false;
  const luk = async () => {
    if (lukker) return; lukker = true;
    try { await server.luk(); Deno.exit(0); }
    catch (fejl) { console.error("Gemning mislykkedes. Lad vinduet stå åbent og prøv Ctrl+C igen:", fejl); lukker = false; }
  };
  Deno.addSignalListener("SIGINT", luk);
  if (Deno.build.os !== "windows") Deno.addSignalListener("SIGTERM", luk);
}
