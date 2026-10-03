// En lokal prøveserver med egne midlertidige data; den rører aldrig familiens verdener.
import { basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BroekraftServer } from "../main.js";
import { Verdenslager } from "../verdener.js";

const testrod = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
await Deno.mkdir(testrod, { recursive: true });
const mappe = await Deno.makeTempDir({ dir: testrod, prefix: "test-tre-verdener-" });
const app = new BroekraftServer({ lager: new Verdenslager(join(mappe, "verdener")) });
await app.init();
// Prøveserveren lader altid browseren hente aktuelle filer. Produktionens offline-cache
// afprøves særskilt; her må en ældre cache ikke skjule en rettelse under browserprøven.
const prøveWorker =
  "self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));";
const server = Deno.serve({ hostname: "127.0.0.1", port: 8080, onListen() {} }, async (req, info) => {
  if (new URL(req.url).pathname === "/proeve-modeller") {
    return new Response(await Deno.readTextFile(new URL("./tre-verdener-modelvisning.html", import.meta.url)), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (new URL(req.url).pathname === "/sw.js") {
    return new Response(prøveWorker, {
      headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (new URL(req.url).pathname === "/index.html" && new URL(req.url).searchParams.has("prøve")) {
    const svar = await app.håndter(req, info);
    return new Response((await svar.text()).replace('register("sw.js")', 'register("sw.js?prøve=tre-verdener")'), {
      headers: svar.headers,
    });
  }
  return app.håndter(req, info);
});
app.port = server.addr.port;
console.log("Tre voksenverdener: http://127.0.0.1:8080/index.html");

// Kun prøvemappen, der blev oprettet ovenfor, må ryddes efter en afsluttet test.
let lukker = false;
async function luk() {
  if (lukker) return;
  lukker = true;
  await app.luk();
  await server.shutdown();
  const sti = resolve(mappe);
  if (!sti.startsWith(testrod + sep) || !basename(sti).startsWith("test-tre-verdener-")) {
    throw new Error("Prøvemappen ligger uden for den tilladte testmappe");
  }
  await Deno.remove(sti, { recursive: true });
  Deno.exit(0);
}
Deno.addSignalListener("SIGINT", luk);
if (Deno.build.os !== "windows") Deno.addSignalListener("SIGTERM", luk);
