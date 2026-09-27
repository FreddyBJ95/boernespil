import { BLOKKE, ID } from "../spil/broekraft/blokke.js";
import { Simulering } from "../spil/broekraft/simulering.js";
import { EMOJIER, pakKlump, send } from "./protokol.js";
import { rensSignal } from "../spil/broekraft/stemmesignal.js";

export class Rum {
  constructor(meta, data) {
    Object.assign(this, { meta, data });
    this.spillere = new Map();
    this.lunter = [];
    this.revision = 0;
    this.gemtRevision = 0;
    this.posTid = 0;
    this.sim = new Simulering({ hent: this.hent.bind(this), sæt: this.sæt.bind(this), inde: this.inde.bind(this), højde: meta.højde, ildBreder: meta.ildBreder, tændTNT: this.tænd.bind(this) });
    // Kun ved indlæsning vækkes gemte væsker og flammer.
    for (let i = 0; i < data.length; i++) if (data[i] >= 43 && data[i] <= 55) {
      const y = Math.floor(i / (meta.bredde * meta.dybde)), rest = i % (meta.bredde * meta.dybde);
      this.sim.blokÆndret(rest % meta.bredde, y, Math.floor(rest / meta.bredde));
    }
  }

  inde(x, y, z) { return [x, y, z].every(Number.isInteger) && x >= 0 && x < this.meta.bredde && y >= 0 && y < this.meta.højde && z >= 0 && z < this.meta.dybde; }
  i(x, y, z) { return x + z * this.meta.bredde + y * this.meta.bredde * this.meta.dybde; }
  hent(x, y, z) { return this.inde(x, y, z) ? this.data[this.i(x, y, z)] : ID.Bundsten; }
  alle(besked, undtagen) { for (const s of this.spillere.values()) if (s !== undtagen) send(s, besked); }

  sæt(x, y, z, id) {
    if (!this.inde(x, y, z) || this.hent(x, y, z) === id || this.hent(x, y, z) === ID.Bundsten) return;
    this.data[this.i(x, y, z)] = id;
    this.revision++;
    const k = `${x >> 4},${z >> 4}`;
    for (const s of this.spillere.values()) if (s.klumper.has(k)) send(s, { t: "blok", x, y, z, id });
    this.sim.blokÆndret(x, y, z);
  }

  ind(s) {
    if (this.spillere.size >= this.meta.maksSpillere) { send(s, { t: "fuld" }); return false; }
    const x = this.meta.bredde / 2, z = this.meta.dybde / 2;
    let y = this.meta.højde - 2;
    while (y > 1 && !this.hent(x, y - 1, z)) y--;
    Object.assign(s, { rum: this, x: x + 0.5, y, z: z + 0.5, yaw: 0, pitch: 0, r: s.r || 6, klumper: new Set() });
    this.spillere.set(s.id, s);
    const { id, navn, type, bredde, dybde, højde, frø, ildBreder } = this.meta;
    send(s, { t: "velkommen", dig: s.id, verden: { id, navn, type, bredde, dybde, højde, frø, ildBreder, stemmer: this.meta.stemmer === true }, spillere: [...this.spillere.values()].map(p => this.spillerInfo(p)) });
    this.alle({ t: "ind", id: s.id, figur: s.figur, version: s.version }, s);
    this.strøm(s);
    return true;
  }

  spillerInfo(s) { return { id: s.id, figur: s.figur, version: s.version, x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch }; }
  ud(s) { if (!this.spillere.delete(s.id)) return; this.taleStatus(s, false); s.rum = null; this.alle({ t: "ud", id: s.id }); }

  // Serveren sender kun signaler; mikrofonens lyd går direkte mellem tablets.
  stemmeBesked(s, b, nu) {
    if (s.version !== "0.2.0" || !this.meta.stemmer) return;
    if (b.t === "taler") {
      if (typeof b.til !== "boolean") return;
      if (!b.til) { this.taleStatus(s, false); return; }
      s.taleTider = (s.taleTider || []).filter(t => nu - t < 1000);
      if (s.taleTider.length >= 4 || s.taler) return;
      s.taleTider.push(nu); s.taleSlut = nu + 20000; this.taleStatus(s, true);
      return;
    }
    s.rtcTider = (s.rtcTider || []).filter(t => nu - t < 1000);
    if (s.rtcTider.length >= 64) return;
    s.rtcTider.push(nu);
    const modtager = this.spillere.get(b.til);
    if (!modtager || modtager === s || modtager.version !== "0.2.0") return;
    const data = rensSignal(b.data);
    if (data) send(modtager, { t: "rtc", fra: s.id, data });
  }

  taleStatus(s, til) {
    if (!!s.taler === til) return;
    s.taler = til;
    for (const p of this.spillere.values()) if (p.version === "0.2.0") send(p, { t: "taler", id: s.id, til });
  }

  skiftStemmer(til) {
    this.meta.stemmer = til;
    for (const s of this.spillere.values()) {
      if (!til) this.taleStatus(s, false);
      if (s.version === "0.2.0") send(s, { t: "stemmer", til });
    }
  }

  // Send højst fire søjler ad gangen, så langsomme tablets ikke drukner i data.
  strøm(s) {
    const cx = Math.floor(s.x / 16), cz = Math.floor(s.z / 16), ønsket = new Set(), mangler = [];
    for (let x = Math.max(0, cx - s.r); x <= Math.min(this.meta.bredde / 16 - 1, cx + s.r); x++) {
      for (let z = Math.max(0, cz - s.r); z <= Math.min(this.meta.dybde / 16 - 1, cz + s.r); z++) {
        const d = Math.hypot(x - cx, z - cz);
        if (d > s.r) continue;
        const k = `${x},${z}`; ønsket.add(k);
        if (!s.klumper.has(k)) mangler.push({ x, z, k, d });
      }
    }
    for (const k of s.klumper) if (!ønsket.has(k)) {
      const [x, z] = k.split(",").map(Number);
      send(s, { t: "glem", cx: x, cz: z }); s.klumper.delete(k);
    }
    for (const { x, z, k } of mangler.sort((a, b) => a.d - b.d).slice(0, 4)) {
      if (s.socket.bufferedAmount > 512 * 1024) break;
      const data = new Uint8Array(256 * this.meta.højde);
      for (let y = 0; y < this.meta.højde; y++) for (let dz = 0; dz < 16; dz++) {
        const start = this.i(x * 16, y, z * 16 + dz);
        data.set(this.data.subarray(start, start + 16), dz * 16 + y * 256);
      }
      send(s, pakKlump(data, x, z, this.meta.højde)); s.klumper.add(k);
    }
  }

  // Alle ændringer og positioner valideres på serveren.
  besked(s, b, nu = performance.now()) {
    if (b.t === "rtc" || b.t === "taler") { this.stemmeBesked(s, b, nu); return; }
    if (b.t === "udsyn" && Number.isInteger(b.r)) s.r = Math.max(1, Math.min(8, b.r));
    if (b.t === "pos" && nu - (s.sidstePos ?? -Infinity) >= 100) {
      if (![b.x, b.y, b.z, b.yaw, b.pitch].every(Number.isFinite) || b.x < 0 || b.x >= this.meta.bredde || b.z < 0 || b.z >= this.meta.dybde || b.y < 0 || b.y > this.meta.højde + 64 || Math.abs(b.yaw) > 1e6 || Math.abs(b.pitch) > Math.PI) return;
      for (const k of ["x", "y", "z", "yaw", "pitch"]) s[k] = b[k];
      s.sidstePos = nu;
    }
    if (b.t === "sæt" || b.t === "tænd") {
      s.bygTider = (s.bygTider || []).filter(t => nu - t < 1000);
      if (s.bygTider.length >= 20) return;
      s.bygTider.push(nu);
      const { x, y, z, id } = b;
      if (!this.inde(x, y, z) || this.hent(x, y, z) === ID.Bundsten) return;
      if (b.t === "tænd") { this.tænd(x, y, z); return; }
      if (!Number.isInteger(id) || id < 0 || BLOKKE[id] === undefined || id === ID.Bundsten) return;
      if (id && [...this.spillere.values()].some(p => x + 1 > p.x - 0.3 && x < p.x + 0.3 && y + 1 > p.y && y < p.y + 1.7 && z + 1 > p.z - 0.3 && z < p.z + 0.3)) return;
      this.sæt(x, y, z, id);
    }
    if (b.t === "emoji" && EMOJIER.includes(b.e) && nu - (s.sidsteEmoji ?? -Infinity) > 500) {
      s.sidsteEmoji = nu; this.alle({ t: "emoji", id: s.id, e: b.e });
    }
  }

  tænd(x, y, z, lunte = 2.2) {
    if (this.hent(x, y, z) !== ID.TNT || this.lunter.length >= 40) return;
    this.sæt(x, y, z, 0);
    this.lunter.push({ x: x + 0.5, y, z: z + 0.5, lunte, vy: lunte < 1 ? 3 : 2 });
  }

  eksploder(cx, cy, cz) {
    const R = 3.3;
    for (let x = Math.floor(cx - R); x <= cx + R; x++) for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let z = Math.floor(cz - R); z <= cz + R; z++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz);
      if (d > R || (d > R - 0.9 && Math.random() < 0.5) || !this.inde(x, y, z)) continue;
      const id = this.hent(x, y, z);
      if (!id || BLOKKE[id].uknuselig) continue;
      if (id === ID.TNT) this.tænd(x, y, z, 0.25 + Math.random() * 0.5);
      else this.sæt(x, y, z, 0);
    }
    this.alle({ t: "bum", x: cx, y: cy, z: cz });
  }

  tick(dt) {
    for (const s of this.spillere.values()) if (s.taler && performance.now() >= s.taleSlut) this.taleStatus(s, false);
    this.sim.tick(dt);
    for (const t of [...this.lunter]) {
      t.lunte -= dt;
      t.vy = Math.max(-30, t.vy - (this.meta.type === "maane" ? 9 : 28) * dt);
      const trin = Math.max(1, Math.ceil(Math.abs(t.vy * dt) / 0.3));
      for (let i = 0; i < trin; i++) {
        const ny = t.y + t.vy * dt / trin, y = Math.floor(t.vy > 0 ? ny + 0.98 : ny);
        const id = this.hent(Math.floor(t.x), y, Math.floor(t.z));
        if (id && !BLOKKE[id]?.kryds && !BLOKKE[id]?.væske) { t.vy = 0; break; }
        t.y = ny;
      }
      if (t.lunte <= 0) { this.lunter.splice(this.lunter.indexOf(t), 1); this.eksploder(t.x, t.y + 0.5, t.z); }
    }
    this.posTid += dt;
    if (this.posTid >= 0.1 - 1e-8) {
      this.posTid = 0;
      this.alle({ t: "pos", liste: [...this.spillere.values()].map(s => this.spillerInfo(s)) });
      for (const s of this.spillere.values()) this.strøm(s);
    }
  }

  // Afslut lunter før stop/gemning, så tændt TNT ikke blot forsvinder ved genstart.
  afslut() {
    while (this.lunter.length) {
      const t = this.lunter.shift();
      this.eksploder(t.x, t.y + 0.5, t.z);
    }
    for (const s of [...this.spillere.values()]) { this.ud(s); s.socket.close(1001, "Verdenen er stoppet"); }
  }
}
