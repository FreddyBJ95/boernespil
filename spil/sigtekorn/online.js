// ===== Online mod familien: holdkamp over familiens server =====
// Sigtekorn åbnes fra familiens server (fx https://192.168.0.26:8443/spil/sigtekorn/) og forbinder til
// spil-kanalen /ws/rum (se OVERDRAGELSE-CODEX-SIGTEKORN-ONLINE.md). Alle i samme rum spiller sammen på
// værtens bane. Hver computer styrer sin egen spiller og sender, hvor den er; den, der skyder, afgør, om
// den rammer, og sender skaden til den ramte — og den, der dør, fortæller alle, hvem der vandt dysten.

import * as THREE from "./three.js";
import { Bot, vinkel } from "./bots.js";
import { nytVåben } from "./vaaben.js";

// Kun når spillet er åbnet fra familiens server på hjemmets net (ikke fra internettet)
export const kanOnline = () => /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
const FARVE = { ræve: "#e8b860", slanger: "#8fd06a" };

// Navnet over hovedet (i holdets farve)
function navneskilt(navn, hold) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d");
  g.font = "bold 34px system-ui"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,0.75)"; g.strokeText(navn, 128, 32);
  g.fillStyle = FARVE[hold] || "#fff"; g.fillText(navn, 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(1.3, 0.33, 1); s.position.y = 2.35; s.renderOrder = 6;
  return s;
}

// ---------- En spiller på en anden computer ----------
// Tegnes og rammes ligesom en bot, men har ingen hjerne: den følger det, der kommer over nettet
export class Fjern extends Bot {
  constructor(s, id, navn, hold) {
    super(s, hold, navn);
    this.id = id; this.fjern = true; this.net = null;
    this.skilt = navneskilt(navn, hold); this.model.add(this.skilt);
  }
  // Hvert tick: glid blødt hen mod den sidste position (lidt frem ad farten, så den ikke halter bagefter)
  tick(dt) {
    const d = this.net, a = this.a; if (!d || this.død) return;
    a.forrige.copy(a.pos);
    const t = Math.min(0.12, (performance.now() - d.modtaget) / 1000), k = Math.min(1, dt * 14);
    const x = d.p[0] + d.v[0] * t, y = d.p[1], z = d.p[2] + d.v[2] * t;
    if (Math.hypot(x - a.pos.x, y - a.pos.y, z - a.pos.z) > 4) a.pos.set(x, y, z);   // (langt væk: hop derhen)
    else a.pos.set(a.pos.x + (x - a.pos.x) * k, a.pos.y + (y - a.pos.y) * k, a.pos.z + (z - a.pos.z) * k);
    a.yaw += vinkel(d.yaw - a.yaw) * k; a.pitch += (d.pitch - a.pitch) * k;
    a.vel.set(d.v[0], d.v[1], d.v[2]); a.duk = d.duk; a.kravl = d.kravl; a.jord = d.jord;
  }
  // En ny tilstand over nettet (våbnet, livet, og om den er stået op igen)
  modtag(d) {
    d.modtaget = performance.now();
    const første = !this.net; this.net = d;
    if (første || (this.død && !d.død)) {                             // første gang, eller genopstået: på plads med det samme
      if (this.død) this.spawn();
      this.a.pos.set(d.p[0], d.p[1], d.p[2]); this.a.forrige.copy(this.a.pos);
    }
    if (this.våben?.id !== d.våben && d.våben) this.våben = nytVåben(d.våben);
    if (this.fig && d.skin && this.fig.skin !== d.skin) this.fig.skin = d.skin;
    if (!this.død) { this.liv = d.liv; this.panser = d.panser; }
  }
  // Ramt her: skaden sendes til den anden computer, som selv afgør det (og fortæller alle, hvis den døde)
  ramt(skade, fra, skud = null) {
    if (fra?.erSpiller && !this.død) this.s.sendTræf?.(this, skade, skud);
    return false;
  }
  // Død over nettet: falder fra hinanden her også
  // (den kommer kun op igen, når den anden computer siger det — se modtag)
  dø(skud) { if (!this.død) Bot.prototype.ramt.call(this, { liv: 9999, panser: 0 }, null, skud); }
}

// ---------- Forbindelsen ----------
export class Online {
  // k: { lavFjern(id, navn, hold), fjernet(f), modtag(f, data), status(tekst), rumTilstand(data), minTilstand() }
  constructor(k) {
    this.k = k; this.ws = null; this.dig = null; this.vært = null; this.navne = new Map(); this.fjerne = new Map();
    this.sendTid = 0; this.skudTid = 0; this.ønsket = null; this.forsøg = 0;
  }
  get forbundet() { return this.ws?.readyState === 1 && !!this.dig; }
  get erVært() { return this.forbundet && this.vært === this.dig; }
  // Forbind til rummet (svarer, når serveren har sagt velkommen)
  forbind(navn, rum) {
    this.ønsket = { navn, rum }; this.luk(false); this.ønsket = { navn, rum };
    return new Promise((ok, fejl) => {
      const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/rum`;
      let ws; try { ws = this.ws = new WebSocket(url); } catch (e) { fejl(e); return; }
      this.k.status("Forbinder …");
      const tidUd = setTimeout(() => { fejl(new Error("Ingen svar fra serveren")); ws.close(); }, 8000);
      ws.onopen = () => ws.send(JSON.stringify({ t: "hej", spil: "sigtekorn", version: 1, navn, rum }));
      ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.t === "velkommen") { clearTimeout(tidUd); this.forsøg = 0; this.velkommen(m); ok(m); }
        else if (m.t === "fuld" || m.t === "fejl") { clearTimeout(tidUd); fejl(new Error(m.t === "fuld" ? "Rummet er fuldt (8)" : m.tekst)); }
        else this.besked(m);
      };
      ws.onclose = () => {
        clearTimeout(tidUd);
        if (ws !== this.ws) return;
        const varForbundet = !!this.dig; this.dig = null; this.ryd();
        if (this.ønsket && varForbundet) {                             // forbindelsen røg: prøv igen lidt efter
          this.k.status("Forbindelsen røg — prøver igen …");
          setTimeout(() => { if (this.ønsket && !this.forbundet) this.forbind(this.ønsket.navn, this.ønsket.rum).catch(() => {}); }, Math.min(10000, 800 * 2 ** this.forsøg++));
        } else fejl(new Error("Kunne ikke forbinde"));
      };
    });
  }
  luk(glem = true) {
    if (glem) this.ønsket = null;
    const ws = this.ws; this.ws = null; this.dig = null; ws?.close(); this.ryd();
    if (glem) this.k.status("");
  }
  ryd() { for (const f of this.fjerne.values()) this.k.fjernet(f); this.fjerne.clear(); this.navne.clear(); }
  velkommen(m) {
    this.dig = m.dig; this.mitNavn = m.navn; this.vært = m.vært;
    for (const s of m.spillere) this.navne.set(s.id, s.navn);
    if (m.tilstand) this.k.rumTilstand(m.tilstand);
    if (this.erVært) this.ws.send(JSON.stringify({ t: "tilstand", data: this.k.minTilstand() }));
    this.visStatus();
  }
  visStatus() {
    const andre = [...this.navne.values()];
    this.k.status(`Forbundet${this.erVært ? " (du bestemmer banen)" : ""} · ${andre.length ? "med " + andre.join(", ") : "venter på de andre …"}`);
  }
  // Beskeder fra serveren
  besked(m) {
    if (m.t === "ind") { this.navne.set(m.id, m.navn); this.visStatus(); }
    else if (m.t === "ud") { const f = this.fjerne.get(m.id); if (f) this.k.fjernet(f); this.fjerne.delete(m.id); this.navne.delete(m.id); this.visStatus(); }
    else if (m.t === "vært") { this.vært = m.id; if (this.erVært) this.ws.send(JSON.stringify({ t: "tilstand", data: this.k.minTilstand() })); this.visStatus(); }
    else if (m.t === "tilstand") this.k.rumTilstand(m.data);
    else if (m.t === "fra" && m.data) this.fra(m.id, m.data);
  }
  // En anden spillers besked: dens tilstand — eller et skud, et træf, en granat eller et drab
  fra(id, d) {
    let f = this.fjerne.get(id);
    if (d.k === "tilstand") {
      if (f && f.hold !== d.hold) { this.k.fjernet(f); this.fjerne.delete(id); f = null; }   // (skiftet hold)
      if (!f) { f = this.k.lavFjern(id, this.navne.get(id) || "?", d.hold); if (!f) return; this.fjerne.set(id, f); }   // (kun når man selv spiller online)
      f.modtag(d);
    } else if (f) this.k.modtag(f, d);
  }
  send(data, til = null) { if (this.forbundet) this.ws.send(JSON.stringify(til ? { t: "til", til, data } : { t: "til", data })); }
  sætTilstand(data) { if (this.erVært) this.ws.send(JSON.stringify({ t: "tilstand", data })); }
  // Ens egen tilstand cirka 20 gange i sekundet (tilstand() laver beskeden)
  tick(dt, tilstand) {
    if (!this.forbundet || (this.sendTid -= dt) > 0) return;
    this.sendTid = 0.05; this.send(tilstand());
  }
  // Skud sendes højst 15 gange i sekundet (minigunnen skyder hurtigere, men det ses ikke)
  skud(data, nu) { if (nu - this.skudTid < 1 / 15) return; this.skudTid = nu; this.send(data); }
}
