// Midlertidig lokal testserver; gemmer aldrig i familiens datamappe.
import { BroekraftServer } from "../main.js";
import { metadata, Verdenslager } from "../verdener.js";
import { Rum } from "../rum.js";
const mappe = await Deno.makeTempDir({ prefix: "broekraft-browser-" });
const app = new BroekraftServer({ lager: new Verdenslager(mappe) }); await app.init();
const m = metadata({ navn: "Lydtest", type: "græsø", bredde: 128, maksSpillere: 8, stemmer: true });
app.metadata.set(m.id, m); app.rum.set(m.id, new Rum(m, new Uint8Array(128 * 128 * 64)));
const server = Deno.serve({ hostname: "127.0.0.1", port: 8097 }, async (req, info) => {
  if (new URL(req.url).pathname === "/lydtest") return new Response(await Deno.readTextFile(new URL("./browser-stemmer.html", import.meta.url)), { headers: { "content-type": "text/html; charset=utf-8" } });
  return app.håndter(req, info);
});
app.port = server.addr.port; app.kørTimere();
Deno.addSignalListener("SIGINT", async () => { await app.luk(); await server.shutdown(); await Deno.remove(mappe, { recursive: true }); Deno.exit(); });
