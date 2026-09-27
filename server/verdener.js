import { join } from "node:path";
import { VERDENER } from "../spil/broekraft/verdener.js";

export const VERSION = "0.2.0";
// Protokollen får nyt nummer; verdensdata beholder sit kompatible format.
const DATA_VERSION = "0.1.0";
export const STØRRELSER = [128, 256, 512, 1024];

// Data ligger uden for programmet, så en opdatering ikke overskriver børnenes verdener.
export function datamappe() {
  if (Deno.build.os === "windows") return join(Deno.env.get("APPDATA") || Deno.env.get("USERPROFILE"), "BroekraftServer", "verdener");
  return join(Deno.env.get("HOME"), ...(Deno.build.os === "darwin" ? ["Library", "Application Support"] : [".local", "share"]), "BroekraftServer", "verdener");
}

export function metadata(valg) {
  if (!valg || typeof valg.navn !== "string" || !valg.navn.trim() || valg.navn.length > 60) throw new Error("Skriv et navn på højst 60 tegn");
  if (!VERDENER.some(v => v.id === valg.type)) throw new Error("Vælg en verdenstype");
  if (!STØRRELSER.includes(valg.bredde)) throw new Error("Vælg en af de fire størrelser");
  const maksSpillere = valg.maksSpillere ?? 4;
  if (!Number.isInteger(maksSpillere) || maksSpillere < 1 || maksSpillere > 8) throw new Error("Vælg 1–8 spillere");
  const frø = valg.frø === "" || valg.frø == null ? crypto.getRandomValues(new Uint32Array(1))[0] : Number(valg.frø);
  if (!Number.isInteger(frø) || frø < 0 || frø > 0xffffffff) throw new Error("Frø skal være et helt tal mellem 0 og 4294967295");
  if (valg.ildBreder != null && typeof valg.ildBreder !== "boolean") throw new Error("Ildindstillingen skal være til eller fra");
  if (valg.stemmer != null && typeof valg.stemmer !== "boolean") throw new Error("Taleindstillingen skal være til eller fra");
  return { id: crypto.randomUUID(), navn: valg.navn.trim(), type: valg.type, bredde: valg.bredde, dybde: valg.bredde, højde: 64, frø, maksSpillere, ildBreder: valg.ildBreder ?? true, stemmer: valg.stemmer ?? false, oprettet: new Date().toISOString(), version: DATA_VERSION };
}

export class Verdenslager {
  constructor(rod = datamappe()) {
    this.rod = rod;
    this.køer = new Map();
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
    metadata(meta);
    if (meta.id !== id || meta.dybde !== meta.bredde || meta.højde !== 64 || meta.version !== DATA_VERSION) throw new Error("Verdensfilen har et ukendt format");
    return { ...meta, stemmer: meta.stemmer ?? false };
  }

  // Skriv til midlertidig fil og omdøb atomisk; samtidige gemninger står i kø.
  gem(meta, data) {
    const kopi = data.slice();
    return this.iKø(meta.id, async () => {
      const mappe = this.mappe(meta.id);
      await Deno.mkdir(mappe, { recursive: true });
      const pakket = new Blob([kopi]).stream().pipeThrough(new CompressionStream("gzip"));
      const fil = await Deno.open(join(mappe, "data.bin.gz.ny"), { write: true, create: true, truncate: true });
      await pakket.pipeTo(fil.writable);
      await Deno.rename(join(mappe, "data.bin.gz.ny"), join(mappe, "data.bin.gz"));
      await Deno.writeTextFile(join(mappe, "meta.json.ny"), JSON.stringify(meta, null, 2));
      await Deno.rename(join(mappe, "meta.json.ny"), join(mappe, "meta.json"));
    });
  }

  // Kontakten kan gemmes uden at læse en stor, stoppet verden ind i hukommelsen.
  gemMeta(meta) {
    return this.iKø(meta.id, async () => {
      const mappe = this.mappe(meta.id);
      await Deno.writeTextFile(join(mappe, "meta.json.ny"), JSON.stringify(meta, null, 2));
      await Deno.rename(join(mappe, "meta.json.ny"), join(mappe, "meta.json"));
    });
  }

  iKø(id, handling) {
    const opgave = (this.køer.get(id) || Promise.resolve()).catch(() => {}).then(handling);
    this.køer.set(id, opgave);
    opgave.finally(() => { if (this.køer.get(id) === opgave) this.køer.delete(id); }).catch(() => {});
    return opgave;
  }

  async indlæs(id) {
    const meta = await this.meta(id);
    const fil = await Deno.open(join(this.mappe(id), "data.bin.gz"));
    const data = new Uint8Array(await new Response(fil.readable.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    if (data.length !== meta.bredde * meta.dybde * meta.højde || data.some(id => id > 56)) throw new Error("Verdensdata er beskadiget");
    return { meta, data };
  }

  async backup(id) {
    await this.køer.get(id);
    await this.meta(id);
    const mål = join(this.rod, "backups", `${id}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
    await Deno.mkdir(mål, { recursive: true });
    for (const navn of ["meta.json", "data.bin.gz"]) await Deno.copyFile(join(this.mappe(id), navn), join(mål, navn));
    return mål;
  }

  async slet(id) {
    await this.køer.get(id);
    await Deno.remove(this.mappe(id), { recursive: true });
  }
}
