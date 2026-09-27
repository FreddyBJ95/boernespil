// Walkie-talkie-transport. Claude ejer mikrofon, effekter, knap og afspilning.
import { lokalKandidat, rensSignal, rensBeskrivelse } from "./stemmesignal.js";

class Stemmer extends EventTarget {
  constructor(net, strøm) {
    super();
    this.net = net; this.strøm = strøm;
    this.spor = strøm.getAudioTracks();
    this.spor.forEach(s => { s.enabled = false; });
    if (this.spor.length !== 1 || strøm.getVideoTracks().length) throw new Error("Walkie-talkie kræver én lydkanal og ingen video");
    this.peers = new Map(); this.lyttere = [];
    this.tilladt = false; this.talerNu = false; this.kræverSlip = false; this.lukket = false;
    this.lyt(net, "velkommen", e => this.nulstil(e.detail));
    this.lyt(net, "ind", e => { if (e.detail.version === "0.2.0") this.opret(e.detail.id); });
    this.lyt(net, "ud", e => this.fjern(e.detail.id));
    this.lyt(net, "rtc", e => this.signal(e.detail));
    this.lyt(net, "stemmer", e => this.skift(e.detail.til));
    this.lyt(net, "lukket", () => this.nulstil(null));
    // Serverens ekko af vores egne tryk kan ankomme efter et nyt, hurtigt tryk — det ignoreres.
    // Egen tale stoppes af 20-sekundersgrænsen, voksenkontakten og afbrydelser her i klienten.
    this.lyt(net, "taler", e => { if (e.detail.id !== this.dig) this.hændelse("taler", e.detail); });
    this.lyt(globalThis.document, "visibilitychange", () => { if (globalThis.document.hidden) this.stopTale(true); });
    this.lyt(globalThis, "pagehide", () => this.luk());
    this.lyt(globalThis, "blur", () => this.stopTale(true));
    this.lyt(this.spor[0], "ended", () => this.luk());
    this.nulstil(net.info);
    queueMicrotask(() => { if (!this.lukket) this.hændelse("stemmerTil", { til: this.tilladt }); });
  }

  lyt(kilde, navn, fn) {
    if (!kilde?.addEventListener) return;
    kilde.addEventListener(navn, fn); this.lyttere.push(() => kilde.removeEventListener(navn, fn));
  }
  hændelse(navn, detail) { this.dispatchEvent(new CustomEvent(navn, { detail })); }

  // En ny tilslutning kræver nye forbindelser og et nyt tryk på taleknappen.
  nulstil(info) {
    this.stopTale(true);
    for (const id of this.peers.keys()) this.fjern(id);
    this.dig = info?.dig;
    this.tilladt = false;
    this.runde = crypto.randomUUID();
    this.skift(info?.verden.stemmer === true);
  }

  skift(til) {
    if (this.lukket) return;
    this.tilladt = til === true && !!this.dig && this.net.version === "0.2.0";
    this.stopTale(true);
    for (const id of this.peers.keys()) this.fjern(id);
    this.runde = crypto.randomUUID();
    if (this.tilladt) {
      for (const s of this.net.spillere.values()) if (s.version === "0.2.0") this.opret(s.id);
    }
    this.hændelse("stemmerTil", { til: this.tilladt });
  }

  opret(id) {
    if (!this.tilladt || this.lukket || id === this.dig || !this.net.spillere.has(id)) return null;
    if (this.peers.has(id)) return this.peers.get(id);
    if (this.peers.size >= 7) return null;
    if (typeof RTCPeerConnection === "undefined") { this.hændelse("fejl", { besked: "Denne browser understøtter ikke walkie-talkie" }); return null; }
    const pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: "all", bundlePolicy: "max-bundle" });
    const p = { id, pc, kø: Promise.resolve(), kandidater: [], tilbudt: false, modrunde: null };
    this.peers.set(id, p);
    pc.addTrack(this.spor[0], this.strøm);
    pc.onicecandidate = e => {
      if (this.peers.get(id) !== p || !e.candidate || !lokalKandidat(e.candidate.candidate)) return;
      this.send(p, { kandidat: e.candidate.toJSON() });
    };
    pc.ontrack = e => {
      if (this.peers.get(id) !== p || !this.tilladt || e.track.kind !== "audio") return;
      this.hændelse("lyd", { id, strøm: e.streams[0] || new MediaStream([e.track]) });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState !== "failed" || this.peers.get(id) !== p) return;
      this.hændelse("fejl", { besked: "Lydforbindelsen blev afbrudt. Prøv at slå walkie-talkie fra og til igen.", id });
      this.fjern(id);
    };
    this.net.rtc(id, { klar: true, runde: this.runde });
    return p;
  }

  send(p, data) {
    if (this.tilladt && this.peers.get(p.id) === p && p.modrunde) this.net.rtc(p.id, { ...data, runde: this.runde, modrunde: p.modrunde });
  }

  // Begge sider melder sig klar. Mindste spiller-id laver tilbuddet, så to tilbud ikke kolliderer.
  signal({ fra, data }) {
    if (!this.tilladt || this.lukket || this.net.spillere.get(fra)?.version !== "0.2.0") return;
    const b = rensSignal(data);
    if (!b) return;
    let p = this.peers.get(fra);
    if (b.klar) {
      if (p?.modrunde && p.modrunde !== b.runde) { this.fjern(fra); p = null; }
      p ||= this.opret(fra);
      if (!p || p.modrunde === b.runde) return;
      p.modrunde = b.runde;
      this.net.rtc(fra, { klar: true, runde: this.runde });
      if (this.dig < fra) this.iKø(p, async () => {
        if (p.tilbudt) return;
        p.tilbudt = true;
        await p.pc.setLocalDescription(await p.pc.createOffer());
        const beskrivelse = rensBeskrivelse(p.pc.localDescription);
        if (beskrivelse) this.send(p, { beskrivelse });
      });
      return;
    }
    if (!p || b.runde !== p.modrunde || b.modrunde !== this.runde) return;
    this.iKø(p, async () => {
      if (b.beskrivelse) {
        // Kun den valgte initiator må sende tilbud; gamle/dobbelte svar ignoreres.
        if (b.beskrivelse.type === "offer" && (this.dig < fra || p.pc.signalingState !== "stable")) return;
        if (b.beskrivelse.type === "answer" && p.pc.signalingState !== "have-local-offer") return;
        await p.pc.setRemoteDescription(b.beskrivelse);
        if (this.peers.get(fra) !== p) return;
        for (const k of p.kandidater.splice(0)) await p.pc.addIceCandidate(k);
        if (b.beskrivelse.type === "offer") {
          await p.pc.setLocalDescription(await p.pc.createAnswer());
          const beskrivelse = rensBeskrivelse(p.pc.localDescription);
          if (beskrivelse) this.send(p, { beskrivelse });
        }
      } else if (b.kandidat) {
        if (p.pc.remoteDescription) await p.pc.addIceCandidate(b.kandidat);
        else if (p.kandidater.length < 64) p.kandidater.push(b.kandidat);
      }
    });
  }

  iKø(p, handling) {
    p.kø = p.kø.then(async () => { if (this.tilladt && this.peers.get(p.id) === p) await handling(); }).catch(() => {
      if (this.peers.get(p.id) !== p) return;
      this.fjern(p.id);
      this.hændelse("fejl", { id: p.id, besked: "Kunne ikke forbinde lyden. Tjek, at enhederne bruger samme wifi." });
    });
  }

  // Gentagne tal(true) forlænger ikke de 20 sekunder; barnet skal slippe først.
  tal(til) {
    if (!til) { this.kræverSlip = false; this.stopTale(false); return false; }
    if (this.lukket || !this.tilladt || !this.net.klar || this.kræverSlip || globalThis.document?.hidden || this.spor[0].readyState === "ended") return false;
    if (this.talerNu) return true;
    this.talerNu = true; this.spor[0].enabled = true;
    this.net.taler(true); this.hændelse("taler", { id: this.dig, til: true });
    this.taleTimer = setTimeout(() => this.stopTale(true), 20000);
    return true;
  }

  stopTale(kræverSlip) {
    clearTimeout(this.taleTimer);
    this.spor.forEach(s => { s.enabled = false; });
    if (kræverSlip && this.talerNu) this.kræverSlip = true;
    if (!this.talerNu) return;
    this.talerNu = false;
    this.net.taler(false); this.hændelse("taler", { id: this.dig, til: false });
  }

  fjern(id) {
    const p = this.peers.get(id);
    if (!p) return;
    this.peers.delete(id);
    p.pc.onicecandidate = p.pc.ontrack = p.pc.onconnectionstatechange = null;
    p.pc.close(); p.kandidater.length = 0;
    this.hændelse("taler", { id, til: false });
    this.hændelse("lydSlut", { id });
  }

  // Strømmen ejes af kalderen: sluk sporet og forbindelserne, men ødelæg ikke Claudes lydgraf.
  luk() {
    if (this.lukket) return;
    this.stopTale(true); this.lukket = true; this.tilladt = false;
    for (const id of this.peers.keys()) this.fjern(id);
    for (const fjern of this.lyttere.splice(0)) fjern();
    this.hændelse("stemmerTil", { til: false });
  }
}

export function forbindStemmer(net, strøm) { return new Stemmer(net, strøm); }
