import { BroekraftServer } from "../main.js";
import { Verdenslager } from "../verdener.js";

// Kun en særskilt lokal testserver. Ingen af familiens gemninger, adgangskoder eller certifikater åbnes.
const rod = await Deno.makeTempDir({ prefix: "brudpunkt-browser-" });
const app = new BroekraftServer({
  lager: new Verdenslager(rod),
  netværkstjek: { hent: async () => ({ status: "prøve" }) },
});
await app.init();
const http = Deno.serve(
  { hostname: "127.0.0.1", port: 18123, onListen() {} },
  async (req, info) => {
    if (new URL(req.url).pathname === "/proeve-brudpunkt") {
      return new Response(
        await Deno.readFile(
          new URL("./brudpunkt-modelvisning.html", import.meta.url),
        ),
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        },
      );
    }
    return app.håndter(req, info);
  },
);
app.port = http.addr.port;
console.log(
  "Spil: http://127.0.0.1:18123/spil/brudpunkt/\nTeknisk modelprøve: http://127.0.0.1:18123/proeve-brudpunkt",
);
let lukker = false;
Deno.addSignalListener("SIGINT", async () => {
  if (lukker) return;
  lukker = true;
  await app.luk();
  await http.shutdown();
  Deno.exit(0);
});
