import { join } from "node:path";
import { VERDENER } from "../spil/broekraft/verdener.js";
import { BLOKKE } from "../spil/broekraft/blokke.js";
import { STØRRELSE } from "../spil/broekraft/uendelig.js";
import { UendeligtLager } from "./uendelig-lager.js";

export const VERSION = "0.2.0";                              // protokollen mellem tablet og server
export const UDGAVE = "0.5.7";                               // programmets udgave (vises i vinduet og kontrolpanelet)
// De endelige verdener beholder deres format; uendelige verdener gemmer kun ændringer.
const DATA_VERSION = "0.1.0";
const UENDELIG_VERSION = "0.2.0";
export const STØRRELSER = [128, 256, 512, 1024];

// Data ligger uden for programmet, så en opdatering ikke overskriver børnenes verdener.
export function datamappe() {
  if (Deno.build.os === "windows") return join(Deno.env.get("APPDATA") || Deno.env.get("USERPROFILE"), "BroekraftServer", "verdener");
  return join(Deno.env.get("HOME"), ...(Deno.build.os === "darwin" ? ["Library", "Application Support"] : [".local", "share"]), "BroekraftServer", "verdener");
}

export function metadata(valg, { læst = false } = {}) {
  if (!valg || typeof valg.navn !== "string" || !valg.navn.trim() || valg.navn.length > 60) throw new Error("Skriv et navn på højst 60 tegn");
  if (!VERDENER.some(v => v.id === valg.type && (læst || !v.skjult))) throw new Error("Vælg en verdenstype");
  const uendelig = valg.type === "uendelig" && (!læst || valg.version === UENDELIG_VERSION);
  if (!uendelig && !STØRRELSER.includes(valg.bredde)) throw new Error("Vælg en af de fire størrelser");
  const maksSpillere = valg.maksSpillere ?? 4;
  if (!Number.isInteger(maksSpillere) || maksSpillere < 1 || maksSpillere > 8) throw new Error("Vælg 1–8 spillere");
  const frø = valg.frø === "" || valg.frø == null ? crypto.getRandomValues(new Uint32Array(1))[0] : Number(valg.frø);
  if (!Number.isInteger(frø) || frø < 0 || frø > 0xffffffff) throw new Error("Frø skal være et helt tal mellem 0 og 4294967295");
  if (valg.ildBreder != null && typeof valg.ildBreder !== "boolean") throw new Error("Ildindstillingen skal være til eller fra");
  if (valg.stemmer != null && typeof valg.stemmer !== "boolean") throw new Error("Taleindstillingen skal være til eller fra");
  const bredde = uendelig ? STØRRELSE : valg.bredde;
  return { id: crypto.randomUUID(), navn: valg.navn.trim(), type: valg.type, bredde, dybde: bredde, højde: 64, frø, maksSpillere, ildBreder: valg.ildBreder ?? true, stemmer: valg.stemmer ?? false, oprettet: new Date().toISOString(), version: uendelig ? UENDELIG_VERSION : DATA_VERSION };
}

export class Verdenslager {
  constructor(rod = datamappe()) {
    this.rod = rod;
    this.køer = new Map();
    this.uendelige = new Map();
  }

  mappe(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Ugyldigt verdens-id");
    return join(this.rod, id);
  }

  async liste() {
    await Deno.mkdir(this.rod, { recursive: true });
    const liste = [];
    for await (const fil of Deno.readDir(this.rod)) {
      if (!fil.isDirectory || !/^[a-f0-9-]{36}$/.test(fil.name)) continue;
      try { liste.push(await this.meta(fil.name)); }
      catch (fejl) { console.error(`Kunne ikke læse verden ${fil.name}: ${fejl.message}`); }
    }
    return liste.sort((a, b) => a.oprettet.localeCompare(b.oprettet));
  }

  async meta(id) {
    const meta = JSON.parse(await Deno.readTextFile(join(this.mappe(id), "meta.json")));
    metadata(meta, { læst: true });
    const uendelig = meta.type === "uendelig" && meta.version === UENDELIG_VERSION;
    if (meta.id !== id || meta.dybde !== meta.bredde || meta.højde !== 64 ||
      (uendelig ? meta.bredde !== STØRRELSE : meta.version !== DATA_VERSION)) throw new Error("Verdensfilen har et ukendt format");
    return { ...meta, stemmer: meta.stemmer ?? false };
  }

  // Skriv til midlertidig fil og omdøb atomisk; samtidige gemninger står i kø.
  gem(meta, data) {
    const uendelig = meta.type === "uendelig" && meta.version === UENDELIG_VERSION;
    if (uendelig && data != null && !(data instanceof UendeligtLager)) throw new Error("Uendelige verdener gemmer kun ændringer");
    const kopi = uendelig ? data?.snapshot() : data.slice();
    const metaKopi = { ...meta };
    return this.iKø(meta.id, async () => {
      const mappe = this.mappe(meta.id);
      await Deno.mkdir(mappe, { recursive: true });
      if (uendelig) { if (data) await data.gemSnapshot(kopi); }
      else {
        const pakket = new Blob([kopi]).stream().pipeThrough(new CompressionStream("gzip"));
        const fil = await Deno.open(join(mappe, "data.bin.gz.ny"), { write: true, create: true, truncate: true });
        await pakket.pipeTo(fil.writable);
        await Deno.rename(join(mappe, "data.bin.gz.ny"), join(mappe, "data.bin.gz"));
      }
      await this.skrivMeta(metaKopi);
    });
  }

  // Kontakten kan gemmes uden at læse en stor, stoppet verden ind i hukommelsen.
  gemMeta(meta) {
    const kopi = { ...meta };
    return this.iKø(meta.id, () => this.skrivMeta(kopi));
  }

  async skrivMeta(meta) {
    const mappe = this.mappe(meta.id);
    await Deno.mkdir(mappe, { recursive: true });
    await Deno.writeTextFile(join(mappe, "meta.json.ny"), JSON.stringify(meta, null, 2));
    await Deno.rename(join(mappe, "meta.json.ny"), join(mappe, "meta.json"));
  }

  iKø(id, handling) {
    const opgave = (this.køer.get(id) || Promise.resolve()).catch(() => {}).then(handling);
    this.køer.set(id, opgave);
    opgave.finally(() => { if (this.køer.get(id) === opgave) this.køer.delete(id); }).catch(() => {});
    return opgave;
  }

  async indlæs(id) {
    const meta = await this.meta(id);
    if (meta.type === "uendelig" && meta.version === UENDELIG_VERSION) {
      let data = this.uendelige.get(id);
      if (!data || data.lukket) {
        data = new UendeligtLager(this.mappe(id), meta, { iKø: handling => this.iKø(id, handling) });
        this.uendelige.set(id, data);
      }
      return { meta, data };
    }
    const fil = await Deno.open(join(this.mappe(id), "data.bin.gz"));
    const data = new Uint8Array(await new Response(fil.readable.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    if (data.length !== meta.bredde * meta.dybde * meta.højde || data.some(id => id >= BLOKKE.length)) throw new Error("Verdensdata er beskadiget");
    return { meta, data };
  }

  backup(id) {
    const data = this.uendelige.get(id), kopi = data?.snapshot();
    return this.iKø(id, async () => {
      if (data && !data.lukket) await data.gemSnapshot(kopi);
      await this.meta(id);
      const mål = join(this.rod, "backups", `${id}-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`);
      await kopiérMappe(this.mappe(id), mål);
      return mål;
    });
  }

  async slet(id) {
    await this.uendelige.get(id)?.luk();
    return this.iKø(id, async () => {
      await Deno.remove(this.mappe(id), { recursive: true });
      this.uendelige.delete(id);
    });
  }
}

// Både de gamle data og alle ændringsregioner følger med i en backup.
async function kopiérMappe(fra, til) {
  await Deno.mkdir(til, { recursive: true });
  for await (const fil of Deno.readDir(fra)) {
    if (fil.name.endsWith(".ny")) continue;
    if (fil.isDirectory) await kopiérMappe(join(fra, fil.name), join(til, fil.name));
    else if (fil.isFile) await Deno.copyFile(join(fra, fil.name), join(til, fil.name));
  }
}
