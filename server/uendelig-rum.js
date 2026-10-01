import { Rum, bragRadius } from "./rum.js";
import { ID, BLOKKE } from "../spil/broekraft/blokke.js";
import { pakKlump, send } from "./protokol.js";

const nøgle = (cx, cz) => `${cx},${cz}`;
const væske = id => id >= 43 && id <= 55;
const SIDER = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Rummet deler reglerne med de gamle verdener, men holder kun sete søjler i hukommelsen.
export class UendeligtRum extends Rum {
  constructor(meta, data) {
    super(meta, data);
    this.opgaver = new Set();
    this.beskyttede = new Map();
    this.ventendeBrag = 0;
    this.sim.inde = this.simInde.bind(this);
    data.påIndlæsning = (cx, cz, bytes) => this.vækSøjle(cx, cz, bytes);
    data.påGlem = () => { this.simSkalRyddes = true; };
  }

  hent(x, y, z) {
    if (!this.inde(x, y, z)) return ID.Bundsten;
    return this.data.hentSøjle(x >> 4, z >> 4)?.[(x & 15) + (z & 15) * 16 + y * 256] ?? ID.Bundsten;
  }

  // En manglende nabosøjle er en pause: kantens eksisterende vand tørrer ikke ud.
  simInde(x, y, z) {
    if (!this.inde(x, y, z) || !this.data.hentSøjle(x >> 4, z >> 4)) return false;
    return SIDER.every(([dx, dz]) => !this.inde(x + dx, y, z + dz) || this.data.hentSøjle((x + dx) >> 4, (z + dz) >> 4));
  }

  // Hold søjler fast, indtil en bygning eller eksplosion er helt færdig.
  medSøjler(søjler, handling) {
    const keys = [...new Set(søjler.map(([cx, cz]) => nøgle(cx, cz)))];
    for (const k of keys) this.beskyttede.set(k, (this.beskyttede.get(k) || 0) + 1);
    const opgave = (async () => {
      try {
        await this.beskærer;
        // Også ved én læsefejl skal de andre søjler være færdige, før deres beskyttelse slippes.
        const resultater = await Promise.allSettled(keys.map(k => Promise.resolve().then(() => this.data.indlæs(...k.split(",").map(Number)))));
        const fejl = resultater.find(r => r.status === "rejected");
        if (fejl) throw fejl.reason;
        return await handling();
      } finally {
        for (const k of keys) {
          const antal = this.beskyttede.get(k) - 1;
          if (antal) this.beskyttede.set(k, antal); else this.beskyttede.delete(k);
        }
      }
    })();
    this.opgaver.add(opgave);
    opgave.finally(() => this.opgaver.delete(opgave)).catch(() => {});
    return opgave;
  }

  async ind(s, gyldig = () => true) {
    if (this.stoppet) return false;
    return await this.medSøjler([[this.meta.bredde / 32, this.meta.dybde / 32]], () => {
      if (this.stoppet || !gyldig() || s.socket.readyState !== 1) return false;
      return super.ind(s);
    });
  }

  // Start oven på hjemmets højeste blok, også hvis børnene har bygget helt til loftet.
  startsted() {
    const x = this.meta.bredde / 2, z = this.meta.dybde / 2;
    let y = this.meta.højde;
    while (y > 1 && !this.hent(x, y - 1, z)) y--;
    return { x, y, z };
  }

  sæt(x, y, z, id) {
    if (!this.inde(x, y, z) || !Number.isInteger(id) || id < 0 || BLOKKE[id] === undefined || id === ID.Bundsten) return;
    if (!this.data.hentSøjle(x >> 4, z >> 4)) return this.medSøjler([[x >> 4, z >> 4]], () => this.sæt(x, y, z, id));
    if (this.hent(x, y, z) === id || this.hent(x, y, z) === ID.Bundsten) return;
    this.data.sæt(x, y, z, id);
    this.revision++;
    const k = nøgle(x >> 4, z >> 4);
    for (const s of this.spillere.values()) if (s.klumper.has(k)) send(s, { t: "blok", x, y, z, id });
    this.sim.blokÆndret(x, y, z);
  }

  tænd(x, y, z, lunte) {
    if (!this.inde(x, y, z)) return;
    if (!this.data.hentSøjle(x >> 4, z >> 4)) return this.medSøjler([[x >> 4, z >> 4]], () => super.tænd(x, y, z, lunte));
    return super.tænd(x, y, z, lunte);
  }

  eksploder(x, y, z, slags) {
    const søjler = [], R = bragRadius(slags);
    for (let cx = Math.max(0, Math.floor((x - R) / 16)); cx <= Math.min(this.meta.bredde / 16 - 1, Math.floor((x + R) / 16)); cx++) {
      for (let cz = Math.max(0, Math.floor((z - R) / 16)); cz <= Math.min(this.meta.dybde / 16 - 1, Math.floor((z + R) / 16)); cz++) søjler.push([cx, cz]);
    }
    this.ventendeBrag++;
    const opgave = this.medSøjler(søjler, () => super.eksploder(x, y, z, slags));
    opgave.catch(fejl => {
      // Et genforsøg bevarer både bombetype og træfpunkt, uden delvise blokændringer.
      this.lunter.push({ x, y: y - 0.5, z, lunte: 2, vy: 0, venter: true, ...(slags ? { slags } : {}) });
      const navn = slags ? "Braget" : "TNT";
      console.error(`${navn} venter på landet:`, fejl.message);
      this.alle({ t: "fejl", besked: `${navn} venter på landet: ${fejl.message}` });
    }).finally(() => { this.ventendeBrag--; });
    return opgave;
  }

  // Indlæs før reglerne læser en blok. Grænser og ratebegrænsning gælder også før diskadgang.
  async besked(s, b, nu = performance.now()) {
    if (this.stoppet || this.spillere.get(s.id) !== s) return;
    if (["sæt", "tænd", "fyrkasse"].includes(b.t)) {
      if (!this.inde(b.x, b.y, b.z)) return;
      const tider = b.t === "fyrkasse" ? s.fyrTider : s.bygTider;
      if ((tider || []).filter(t => nu - t < 1000).length >= (b.t === "fyrkasse" ? 2 : 20)) return;
      if (b.t === "sæt" && (!Number.isInteger(b.id) || b.id < 0 || BLOKKE[b.id] === undefined || b.id === ID.Bundsten)) return;
      await this.medSøjler([[b.x >> 4, b.z >> 4]], () => {
        if (!this.stoppet && this.spillere.get(s.id) === s) super.besked(s, b, nu);
      });
    } else if (b.t === "brag") {
      // Rum validerer afstanden og starter derefter den asynkrone eksplosion.
      await super.besked(s, b, nu);
    } else super.besked(s, b, nu);
  }

  ønsket(s) {
    const cx = Math.floor(s.x / 16), cz = Math.floor(s.z / 16), søjler = [];
    for (let x = Math.max(0, cx - s.r); x <= Math.min(this.meta.bredde / 16 - 1, cx + s.r); x++) {
      for (let z = Math.max(0, cz - s.r); z <= Math.min(this.meta.dybde / 16 - 1, cz + s.r); z++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d <= s.r) søjler.push({ x, z, k: nøgle(x, z), d });
      }
    }
    return søjler;
  }

  // Fire søjler pr. spiller ad gangen; en flyvetur kan ikke efterlade en voksende arbejdskø.
  strøm(s) {
    if (this.stoppet || s.strømmer || !this.spillere.has(s.id)) return;
    const ønsket = this.ønsket(s), keys = new Set(ønsket.map(p => p.k));
    for (const k of s.klumper) if (!keys.has(k)) {
      const [cx, cz] = k.split(",").map(Number);
      send(s, { t: "glem", cx, cz }); s.klumper.delete(k);
    }
    if (s.socket.bufferedAmount > 512 * 1024) return;
    const mangler = ønsket.filter(p => !s.klumper.has(p.k)).sort((a, b) => a.d - b.d).slice(0, 4);
    if (!mangler.length) return;
    s.strømmer = this.medSøjler(mangler.map(p => [p.x, p.z]), () => {
      if (this.stoppet || s.rum !== this) return;
      const aktuelle = new Set(this.ønsket(s).map(p => p.k));
      for (const { x, z, k } of mangler) {
        if (!aktuelle.has(k) || s.socket.bufferedAmount > 512 * 1024) continue;
        send(s, pakKlump(this.data.hentSøjle(x, z), x, z, this.meta.højde)); s.klumper.add(k);
      }
    }).catch(fejl => { send(s, { t: "fejl", besked: `Kunne ikke hente landet: ${fejl.message}` }); })
      .finally(() => { s.strømmer = null; });
  }

  vækSøjle(cx, cz, data) {
    for (let i = 0; i < data.length; i++) if (væske(data[i])) {
      this.sim.blokÆndret(cx * 16 + i % 16, Math.floor(i / 256), cz * 16 + Math.floor(i / 16) % 16);
    }
    // Væk også nabokantens luft ved vandet, som ventede på denne søjle.
    for (const [dx, dz] of SIDER) {
      if (!this.data.hentSøjle(cx + dx, cz + dz)) continue;
      for (let y = 0; y < this.meta.højde; y++) for (let i = 0; i < 16; i++) {
        const x = cx * 16 + (dx === 1 ? 16 : dx === -1 ? -1 : i);
        const z = cz * 16 + (dz === 1 ? 16 : dz === -1 ? -1 : i);
        if (væske(this.hent(x, y, z)) || SIDER.some(([sx, sz]) => væske(this.hent(x + sx, y, z + sz)))) this.sim.blokÆndret(x, y, z);
      }
    }
  }

  async beskær() {
    const behold = new Set(this.beskyttede.keys());
    for (const s of this.spillere.values()) for (const p of this.ønsket(s)) behold.add(p.k);
    for (const t of this.lunter) behold.add(nøgle(Math.floor(t.x / 16), Math.floor(t.z / 16)));
    await this.data.beskær(behold);
    if (this.simSkalRyddes) {
      this.simSkalRyddes = false;
      for (const map of [this.sim.aktive, this.sim.brænder, this.sim.ildAlder]) for (const k of map.keys()) {
        const [x, , z] = k.split(",").map(Number);
        if (!this.data.hentSøjle(x >> 4, z >> 4)) map.delete(k);
      }
    }
  }

  tick(dt, nu) {
    if (this.stoppet) return;
    super.tick(dt, nu);
    if (!this.beskærer) this.beskærer = this.beskær().catch(fejl => console.error("Kunne ikke glemme søjler:", fejl))
      .finally(() => { this.beskærer = null; });
  }

  async vent() {
    let fejl;
    while (this.opgaver.size) {
      const resultater = await Promise.allSettled([...this.opgaver]);
      fejl ||= resultater.find(r => r.status === "rejected")?.reason;
    }
    if (fejl) throw fejl;
  }

  // Stop strømning først og fuldfør TNT-kæder før data gemmes og workeren lukkes.
  async afslut() {
    this.stoppet = true;
    for (const s of [...this.spillere.values()]) { this.ud(s); s.socket.close(1001, "Verdenen er stoppet"); }
    await this.vent();
    await this.beskærer;
    this.fyrkasser.length = 0;
    while (this.lunter.length) {
      const t = this.lunter.shift();
      await this.startEksplosion(t.x, t.y + 0.5, t.z, t.slags);
      await this.beskær();
    }
  }
}
