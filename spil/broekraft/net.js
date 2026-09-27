// Lille EventTarget-klient. Ingen afhængigheder og ingen antagelser om 3D-visningen.
export function udpakKlump(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13 || bytes[0] !== 1 || (bytes.length - 11) % 2) throw new Error("Ugyldig klump");
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cx = header.getInt32(1, true), cz = header.getInt32(5, true), højde = header.getUint16(9, true);
  if (cx < 0 || cz < 0 || cx >= 64 || cz >= 64 || højde < 1 || højde > 64) throw new Error("Ugyldige klumpmål");
  const data = new Uint8Array(256 * højde);
  let pos = 0;
  for (let i = 11; i < bytes.length; i += 2) {
    const antal = bytes[i], id = bytes[i + 1];
    if (!antal || pos + antal > data.length || id > 56) throw new Error("Ugyldig RLE");
    data.fill(id, pos, pos + antal); pos += antal;
  }
  if (pos !== data.length) throw new Error("Ufuldstændig klump");
  return { cx, cz, højde, data };
}

class Forbindelse extends EventTarget {
  constructor(url, { figur = "gris", version = "0.1.0" } = {}) {
    super();
    Object.assign(this, { url, figur, version });
    this.ventende = new Map();
    this.forsøg = 0;
    this.radius = 6;
    this.sidstePos = -Infinity;
  }

  hændelse(navn, detail) { this.dispatchEvent(new CustomEvent(navn, { detail })); }
  send(besked) { if (this.socket?.readyState === 1) this.socket.send(JSON.stringify(besked)); }

  åbn() {
    return new Promise((resolve, reject) => {
      const socket = this.socket = new WebSocket(this.url);
      socket.binaryType = "arraybuffer";
      let åbnet = false;
      const timeout = setTimeout(() => { socket.close(); reject(new Error("Serveren svarer ikke")); }, 10000);
      socket.onopen = () => {
        åbnet = true; clearTimeout(timeout); this.forsøg = 0;
        this.send({ t: "hej", figur: this.figur, version: this.version });
        if (this.verden) this.vælg(this.verden, true).catch(fejl => this.hændelse("fejl", { besked: fejl.message }));
        resolve(this);
      };
      socket.onmessage = ({ data }) => {
        try {
          if (typeof data !== "string") { this.hændelse("klump", udpakKlump(data)); return; }
          const b = JSON.parse(data), { t, ...detail } = b;
          if (t === "velkommen") {
            if (!this.gendanPosition) { this.position = null; clearTimeout(this.posTimer); this.posTimer = null; }
            this.klar = true;
            this.verden = b.verden.id;
            this.send({ t: "udsyn", r: this.radius });
            if (this.position) this.send({ t: "pos", ...this.position });
          }
          const type = t === "fuld" ? "velkommen" : t;
          if (t === "fejl") this.afvisAlle(new Error(b.besked));
          else if (this.ventende.has(type)) {
            const v = this.ventende.get(type); this.ventende.delete(type); clearTimeout(v.timer);
            if (t === "fuld") v.reject(new Error("fuld"));
            else v.resolve(t === "verdener" ? b.liste : detail);
          }
          this.hændelse(t, detail);
        } catch (fejl) { this.hændelse("fejl", { besked: fejl.message }); }
      };
      socket.onclose = () => {
        clearTimeout(timeout); this.klar = false;
        this.afvisAlle(new Error("Forbindelsen blev afbrudt"));
        this.hændelse("lukket", { genforbinder: !this.stoppet });
        if (!åbnet) reject(new Error("Kunne ikke forbinde til serveren"));
        if (!this.stoppet) this.genforbindTimer = setTimeout(() => this.åbn().catch(() => {}), Math.min(10000, 500 * 2 ** this.forsøg++));
      };
      socket.onerror = () => {};
    });
  }

  afvisAlle(fejl) {
    for (const v of this.ventende.values()) { clearTimeout(v.timer); v.reject(fejl); }
    this.ventende.clear();
  }

  forespørg(besked, svar) {
    if (this.socket?.readyState !== 1) return Promise.reject(new Error("Ikke forbundet"));
    if (this.ventende.has(svar)) return Promise.reject(new Error("Vent på det forrige svar"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.ventende.delete(svar); reject(new Error("Serveren svarer ikke")); }, 15000);
      this.ventende.set(svar, { resolve, reject, timer }); this.send(besked);
    });
  }

  verdener() { return this.forespørg({ t: "verdener" }, "verdener"); }
  vælg(verden, gendanPosition = false) {
    if (!this.ventende.has("velkommen")) this.gendanPosition = gendanPosition;
    return this.forespørg({ t: "vælg", verden }, "velkommen");
  }
  udsyn(r) { this.radius = Math.max(1, Math.min(8, Math.round(r) || 6)); this.send({ t: "udsyn", r: this.radius }); }
  pos(x, y, z, yaw, pitch) {
    this.position = { x, y, z, yaw, pitch };
    if (!this.klar) return;
    const nu = performance.now();
    if (nu - this.sidstePos >= 100) { this.sidstePos = nu; this.send({ t: "pos", ...this.position }); }
    else if (!this.posTimer) this.posTimer = setTimeout(() => {
      this.posTimer = null;
      if (this.klar) { this.sidstePos = performance.now(); this.send({ t: "pos", ...this.position }); }
    }, 100 - (nu - this.sidstePos));
  }
  sæt(x, y, z, id) { if (this.klar) this.send({ t: "sæt", x, y, z, id }); }
  tænd(x, y, z) { if (this.klar) this.send({ t: "tænd", x, y, z }); }
  emoji(e) { if (this.klar) this.send({ t: "emoji", e }); }
  luk() {
    this.stoppet = true; this.klar = false;
    clearTimeout(this.genforbindTimer); clearTimeout(this.posTimer);
    this.afvisAlle(new Error("Forbindelsen er lukket"));
    this.socket?.close();
  }
}

export async function forbind(url, valg = {}) {
  const f = new Forbindelse(url, valg);
  try { return await f.åbn(); }
  catch (fejl) { f.luk(); throw fejl; }
}
