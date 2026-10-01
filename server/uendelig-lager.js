import { join } from "node:path";
import { BLOKKE } from "../spil/broekraft/blokke.js";

const CS = 16, BY = 64, SØJLE_BYTES = CS * CS * BY, REGION = 32, ANTAL_SØJLER = 4096;
const MÆRKE = new Uint8Array([66, 82, 85, 75, 48, 50, 48, 0]); // BRUK020: ændringsformat 0.2.0
const MAKS_REGION_BYTES = 10 + REGION * REGION * (4 + SØJLE_BYTES * 3);
const nøgle = (cx, cz) => `${cx},${cz}`;
const regionFor = (cx, cz) => [Math.floor(cx / REGION), Math.floor(cz / REGION)];
const regionIndeks = (cx, cz) => (cx % REGION) + (cz % REGION) * REGION;

// En region gemmer kun ændrede blokke, aldrig det land som kan laves igen fra frøet.
function pakRegion(søjler) {
  let længde = 10;
  for (const ændringer of søjler.values()) længde += 4 + ændringer.size * 3;
  const data = new Uint8Array(længde), view = new DataView(data.buffer);
  data.set(MÆRKE); view.setUint16(8, søjler.size, true);
  let i = 10;
  for (const [søjle, ændringer] of søjler) {
    view.setUint16(i, søjle, true); view.setUint16(i + 2, ændringer.size, true); i += 4;
    for (const [indeks, id] of ændringer) {
      view.setUint16(i, indeks, true); data[i + 2] = id; i += 3;
    }
  }
  return data;
}

// Tjek også indeks og gentagelser: en beskadiget region må aldrig blive skrevet hen over.
function udpakRegion(data) {
  const beskadiget = () => { throw new Error("Ændringerne er beskadiget"); };
  if (data.length < 10 || MÆRKE.some((b, i) => data[i] !== b)) beskadiget();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength), antal = view.getUint16(8, true), søjler = new Map();
  if (antal > REGION * REGION) beskadiget();
  let i = 10;
  for (let s = 0; s < antal; s++) {
    if (i + 4 > data.length) beskadiget();
    const søjle = view.getUint16(i, true), antalÆndringer = view.getUint16(i + 2, true); i += 4;
    if (søjle >= REGION * REGION || søjler.has(søjle) || antalÆndringer > SØJLE_BYTES || i + antalÆndringer * 3 > data.length) beskadiget();
    const ændringer = new Map();
    for (let a = 0; a < antalÆndringer; a++) {
      const indeks = view.getUint16(i, true), id = data[i + 2]; i += 3;
      if (indeks >= SØJLE_BYTES || id >= BLOKKE.length || ændringer.has(indeks)) beskadiget();
      ændringer.set(indeks, id);
    }
    søjler.set(søjle, ændringer);
  }
  if (i !== data.length) beskadiget();
  return søjler;
}

// Begræns udpakket størrelse, så en fejl i en lille gzip-fil ikke sluger hele Pi'ens hukommelse.
async function læsRegion(sti) {
  let fil;
  try { fil = await Deno.open(sti); }
  catch (fejl) { if (fejl instanceof Deno.errors.NotFound) return new Map(); throw fejl; }
  const læser = fil.readable.pipeThrough(new DecompressionStream("gzip")).getReader(), bidder = [];
  let længde = 0;
  try {
    while (true) {
      const { done, value } = await læser.read();
      if (done) break;
      længde += value.length;
      if (længde > MAKS_REGION_BYTES) throw new Error("Regionen er for stor");
      bidder.push(value);
    }
    const data = new Uint8Array(længde);
    let i = 0;
    for (const bid of bidder) { data.set(bid, i); i += bid.length; }
    return udpakRegion(data);
  } catch (fejl) {
    await læser.cancel().catch(() => {});
    throw new Error(`Ændringerne er beskadiget: ${fejl.message}`);
  } finally { læser.releaseLock(); }
}

async function skrivRegion(sti, søjler) {
  const data = pakRegion(søjler), fil = await Deno.open(sti + ".ny", { write: true, create: true, truncate: true });
  await new Blob([data]).stream().pipeThrough(new CompressionStream("gzip")).pipeTo(fil.writable);
  await Deno.rename(sti + ".ny", sti);
}

export class UendeligtLager {
  constructor(mappe, meta, { iKø, maksLager = 32, glemEfter = 30000 } = {}) {
    this.mappe = mappe; this.meta = meta; this.maksLager = maksLager; this.glemEfter = glemEfter;
    this.søjler = new Map(); this.detaljer = new Map(); this.indlæsninger = new Map(); this.regionLæsninger = new Map();
    this.workerOpgaver = new Map(); this.nr = 0; this.kø = Promise.resolve(); this.beskærKø = Promise.resolve();
    this.iKø = iKø || (handling => {
      const opgave = this.kø.catch(() => {}).then(handling);
      this.kø = opgave;
      return opgave;
    });
  }

  regionSti(rx, rz) { return join(this.mappe, "ændringer", `r.${rx}.${rz}.bin.gz`); }

  // Regionen deles kun mellem samtidige læsninger; den bliver ikke et voksende lager i RAM.
  region(rx, rz) {
    const k = nøgle(rx, rz);
    if (!this.regionLæsninger.has(k)) {
      const opgave = læsRegion(this.regionSti(rx, rz));
      this.regionLæsninger.set(k, opgave);
      opgave.finally(() => { if (this.regionLæsninger.get(k) === opgave) this.regionLæsninger.delete(k); }).catch(() => {});
    }
    return this.regionLæsninger.get(k);
  }

  // Workerens beskeder får numre, så flere spillere kan vente på hver sin søjle.
  generer(cx, cz) {
    if (!this.worker) {
      this.worker = new Worker(new URL("./uendelig-worker.js", import.meta.url).href, { type: "module" });
      this.worker.onmessage = ({ data: svar }) => {
        const opgave = this.workerOpgaver.get(svar.nr);
        if (!opgave) return;
        this.workerOpgaver.delete(svar.nr);
        if (svar.fejl) opgave.reject(new Error(svar.fejl)); else opgave.resolve(svar.data);
      };
      this.worker.onerror = e => {
        e.preventDefault();
        for (const opgave of this.workerOpgaver.values()) opgave.reject(new Error(e.message));
        this.workerOpgaver.clear(); this.worker.terminate(); this.worker = null;
      };
    }
    const nr = ++this.nr;
    return new Promise((resolve, reject) => {
      this.workerOpgaver.set(nr, { resolve, reject });
      this.worker.postMessage({ nr, cx, cz, frø: this.meta.frø });
    });
  }

  indlæs(cx, cz) {
    if (this.lukket || this.lukker) return Promise.reject(new Error("Verdenslageret er lukket"));
    if (![cx, cz].every(n => Number.isInteger(n) && n >= 0 && n < ANTAL_SØJLER)) return Promise.reject(new Error("Ugyldig søjle"));
    const k = nøgle(cx, cz), data = this.hentSøjle(cx, cz);
    if (data) { this.detaljer.get(k).brugt = performance.now(); return Promise.resolve(data); }
    if (!this.indlæsninger.has(k)) {
      const opgave = this.lavSøjle(cx, cz);
      this.indlæsninger.set(k, opgave);
      opgave.finally(() => { if (this.indlæsninger.get(k) === opgave) this.indlæsninger.delete(k); }).catch(() => {});
    }
    return this.indlæsninger.get(k);
  }

  async lavSøjle(cx, cz) {
    const [rx, rz] = regionFor(cx, cz);
    const [data, region] = await Promise.all([this.generer(cx, cz), this.region(rx, rz)]);
    if (!(data instanceof Uint8Array) || data.length !== SØJLE_BYTES || data.some(id => id >= BLOKKE.length)) throw new Error("Landets søjle er beskadiget");
    const ændringer = new Map(region.get(regionIndeks(cx, cz)) || []), grund = new Map(), k = nøgle(cx, cz);
    for (const [indeks, id] of ændringer) { grund.set(indeks, data[indeks]); data[indeks] = id; }
    this.detaljer.set(k, { cx, cz, ændringer, grund, revision: 0, gemt: 0, brugt: performance.now() });
    this.søjler.set(k, data);
    this.påIndlæsning?.(cx, cz, data);
    return data;
  }

  hentSøjle(cx, cz) {
    return this.søjler.get(nøgle(cx, cz));
  }

  // Kun indlæste søjler må ændres. En ændring tilbage til det oprindelige land fylder ikke på disken.
  sæt(x, y, z, id) {
    if (![x, y, z, id].every(Number.isInteger) || x < 0 || z < 0 || x >= 65536 || z >= 65536 || y < 0 || y >= BY || id < 0 || id >= BLOKKE.length) return false;
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS), k = nøgle(cx, cz), data = this.hentSøjle(cx, cz);
    if (!data) return false;
    const indeks = (x % CS) + (z % CS) * CS + y * CS * CS;
    if (data[indeks] === id) return false;
    const detalje = this.detaljer.get(k), oprindelig = detalje.grund.get(indeks) ?? data[indeks];
    data[indeks] = id;
    if (id === oprindelig) { detalje.ændringer.delete(indeks); detalje.grund.delete(indeks); }
    else { detalje.grund.set(indeks, oprindelig); detalje.ændringer.set(indeks, id); }
    detalje.revision++; detalje.brugt = performance.now();
    return true;
  }

  // Kopien tages ved kaldet, også hvis en tidligere gemning stadig står i kø.
  snapshot() {
    const kopi = [];
    for (const [k, detalje] of this.detaljer) if (detalje.revision !== detalje.gemt) {
      kopi.push({ k, cx: detalje.cx, cz: detalje.cz, revision: detalje.revision, ændringer: new Map(detalje.ændringer) });
    }
    return kopi;
  }

  gem() {
    const kopi = this.snapshot();
    return this.iKø(() => this.gemSnapshot(kopi));
  }

  // Kaldes inde i den fælles verdenskø. Backup og meta-gemning bruger præcis samme kø.
  async gemSnapshot(kopi) {
    const regioner = new Map();
    for (const søjle of kopi) {
      const [rx, rz] = regionFor(søjle.cx, søjle.cz), k = nøgle(rx, rz);
      if (!regioner.has(k)) regioner.set(k, { rx, rz, søjler: [] });
      regioner.get(k).søjler.push(søjle);
    }
    if (regioner.size) await Deno.mkdir(join(this.mappe, "ændringer"), { recursive: true });
    for (const { rx, rz, søjler } of regioner.values()) {
      const sti = this.regionSti(rx, rz), region = await læsRegion(sti);
      for (const søjle of søjler) {
        const indeks = regionIndeks(søjle.cx, søjle.cz);
        if (søjle.ændringer.size) region.set(indeks, søjle.ændringer); else region.delete(indeks);
      }
      if (region.size) await skrivRegion(sti, region);
      else await Deno.remove(sti).catch(fejl => { if (!(fejl instanceof Deno.errors.NotFound)) throw fejl; });
      for (const søjle of søjler) {
        const detalje = this.detaljer.get(søjle.k);
        if (detalje?.revision === søjle.revision) detalje.gemt = søjle.revision;
      }
    }
  }

  // Synlige og andre aktive søjler er beskyttet af behold; resten bliver et lille LRU-lager.
  beskær(behold = new Set(), nu = performance.now()) {
    const kopi = new Set(behold);
    const opgave = this.beskærKø.catch(() => {}).then(async () => {
      const ledige = [...this.detaljer].filter(([k]) => !kopi.has(k)).sort((a, b) => b[1].brugt - a[1].brugt);
      const glemmes = ledige.filter(([, d], i) => i >= this.maksLager || nu - d.brugt >= this.glemEfter);
      if (!glemmes.length) return;
      await this.gem();
      for (const [k, detalje] of glemmes) {
        if (this.detaljer.get(k) !== detalje || detalje.revision !== detalje.gemt) continue;
        this.påGlem?.(detalje.cx, detalje.cz);
        this.detaljer.delete(k); this.søjler.delete(k);
      }
    });
    this.beskærKø = opgave;
    return opgave;
  }

  async luk() {
    if (this.lukket) return;
    this.lukker = true;
    try {
      await Promise.all([...this.indlæsninger.values()]);
      await this.beskærKø;
      await this.gem();
      this.worker?.terminate(); this.worker = null; this.lukket = true;
      this.søjler.clear(); this.detaljer.clear();
      // Lageret kan blive husket efter stop; callbacks må ikke fastholde det gamle rum og dets simulering.
      this.påIndlæsning = null; this.påGlem = null;
    } catch (fejl) { this.lukker = false; throw fejl; }
  }
}
