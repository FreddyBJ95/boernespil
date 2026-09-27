import { strict as assert } from "node:assert";
import { Rum } from "../rum.js";
import { metadata } from "../verdener.js";
import { lokalKandidat, rensBeskrivelse } from "../../spil/broekraft/stemmesignal.js";
import { forbindStemmer } from "../../spil/broekraft/stemmer.js";

function spiller(id, version = "0.2.0") {
  const beskeder = [];
  return { id, version, beskeder, socket: { readyState: 1, bufferedAmount: 0, send(b) { if (typeof b === "string") beskeder.push(JSON.parse(b)); } } };
}
function rum() {
  return new Rum(metadata({ navn: "Test", type: "græsø", bredde: 128, maksSpillere: 8 }), new Uint8Array(128 * 128 * 64));
}
const sdp = "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=rtcp-mux\r\n";
const kandidat = "candidate:1 1 udp 1234 192.168.1.10 50000 typ host";

Deno.test("Stemmesignaler: samme rum, voksenkontakt, ældre klient og hastighed", () => {
  const r = rum(), andet = rum(), a = spiller("a"), b = spiller("b"), gammel = spiller("g", "0.1.0"), c = spiller("c");
  for (const p of [a, b, gammel]) r.ind(p);
  andet.ind(c);
  const besked = { t: "rtc", til: "b", fra: "falsk", data: { klar: true, runde: "r1", hemmeligt: "fjernes" } };
  r.besked(a, besked, 0);
  assert.equal(b.beskeder.filter(b => b.t === "rtc").length, 0);
  r.skiftStemmer(true);
  for (const p of [a, b]) assert.deepEqual(p.beskeder.at(-1), { t: "stemmer", til: true });
  assert.ok(!gammel.beskeder.some(b => b.t === "stemmer"));
  r.besked(a, besked, 1000);
  assert.deepEqual(b.beskeder.at(-1), { t: "rtc", fra: "a", data: { klar: true, runde: "r1" } });
  r.besked(a, { ...besked, til: "c" }, 1000);
  r.besked(a, { ...besked, til: "g" }, 1000);
  r.besked(gammel, besked, 1000);
  assert.ok(!c.beskeder.some(b => b.t === "rtc"));
  assert.ok(!gammel.beskeder.some(b => b.t === "rtc"));
  b.beskeder.length = 0;
  for (let i = 0; i < 100; i++) r.besked(a, besked, 3000);
  assert.equal(b.beskeder.length, 64);
  r.besked(a, besked, 4001); assert.equal(b.beskeder.length, 65);
  r.besked(a, { t: "taler", til: true }, performance.now());
  assert.equal(a.taler, true);
  a.taleSlut = -1; r.tick(0.01); assert.equal(a.taler, false);
  r.skiftStemmer(false);
  r.besked(a, besked, 5000); assert.equal(b.beskeder.at(-1).t, "stemmer");
  assert.equal(b.beskeder.at(-1).til, false);
});

Deno.test("ICE/SDP: kun lokal lyd, ingen video, relay eller offentlig adresse", () => {
  assert.equal(lokalKandidat(kandidat), true);
  assert.equal(lokalKandidat(kandidat.replace("192.168.1.10", "tablet-123.local")), true);
  assert.equal(lokalKandidat(kandidat.replace("192.168.1.10", "8.8.8.8")), false);
  for (const type of ["relay", "srflx", "prflx"]) assert.equal(lokalKandidat(kandidat.replace("host", type)), false);
  assert.equal(rensBeskrivelse({ type: "offer", sdp: sdp.replace("audio", "video") }), null);
  assert.equal(rensBeskrivelse({ type: "offer", sdp: sdp.replace("0.0.0.0", "8.8.8.8") }), null);
  const b = rensBeskrivelse({ type: "offer", sdp: sdp + "a=" + kandidat.replace("host", "relay") + "\r\n" });
  assert.ok(!b.sdp.includes("relay"));
});

class TestNet extends EventTarget {
  constructor(id, ids) {
    super(); this.version = "0.2.0"; this.klar = true;
    this.info = { dig: id, verden: { stemmer: true } };
    this.spillere = new Map(ids.map(id => [id, { id, version: "0.2.0" }]));
    this.sendt = []; this.tale = [];
  }
  rtc(til, data) { this.sendt.push({ til, data }); this.lever?.(til, data); }
  taler(til) { this.tale.push(til); }
  hændelse(navn, detail) { this.dispatchEvent(new CustomEvent(navn, { detail })); }
}
class TestPeer {
  constructor(valg) { assert.deepEqual(valg.iceServers, []); this.signalingState = "stable"; this.kandidater = []; }
  addTrack(spor) { assert.equal(spor.enabled, false); }
  createOffer() { return { type: "offer", sdp }; }
  createAnswer() { return { type: "answer", sdp }; }
  setLocalDescription(b) { this.localDescription = b; this.signalingState = b.type === "offer" ? "have-local-offer" : "stable"; }
  setRemoteDescription(b) { this.remoteDescription = b; this.signalingState = b.type === "offer" ? "have-remote-offer" : "stable"; }
  addIceCandidate(k) { assert.ok(this.remoteDescription); this.kandidater.push(k); }
  close() { this.lukket = true; }
}
function strøm() {
  const spor = new EventTarget(); spor.enabled = true; spor.readyState = "live";
  return { getAudioTracks: () => [spor], getVideoTracks: () => [] };
}
async function afvent() { for (let i = 0; i < 30; i++) await Promise.resolve(); }

Deno.test("Walkie-talkie: forhandling, ICE-kø, 20 sekunder, afbrydelse og oprydning", async () => {
  const oprindelig = globalThis.RTCPeerConnection, set = globalThis.setTimeout, clear = globalThis.clearTimeout;
  const timere = new Map(); let nr = 0;
  globalThis.RTCPeerConnection = TestPeer;
  globalThis.setTimeout = (fn, ms) => { assert.equal(ms, 20000); timere.set(++nr, fn); return nr; };
  globalThis.clearTimeout = id => timere.delete(id);
  const a = new TestNet("a", ["a", "b"]), b = new TestNet("b", ["a", "b"]), sa = strøm(), sb = strøm();
  let va, vb;
  try {
    a.lever = (_, data) => queueMicrotask(() => b.hændelse("rtc", { fra: "a", data }));
    b.lever = (_, data) => queueMicrotask(() => a.hændelse("rtc", { fra: "b", data }));
    va = forbindStemmer(a, sa); vb = forbindStemmer(b, sb);
    await afvent();
    assert.equal(va.peers.get("b").pc.remoteDescription.type, "answer");
    assert.equal(vb.peers.get("a").pc.remoteDescription.type, "offer");
    assert.equal(sa.getAudioTracks()[0].enabled, false);
    assert.equal(va.tal(true), true); assert.equal(sa.getAudioTracks()[0].enabled, true);
    va.tal(true); assert.equal(timere.size, 1);
    [...timere.values()][0](); assert.equal(sa.getAudioTracks()[0].enabled, false);
    assert.equal(va.tal(true), false); va.tal(false); assert.equal(va.tal(true), true);
    a.hændelse("stemmer", { til: false }); assert.equal(sa.getAudioTracks()[0].enabled, false); assert.equal(va.peers.size, 0);
    a.hændelse("stemmer", { til: true }); await afvent();
    va.tal(false); va.tal(true); a.hændelse("lukket", {});
    assert.equal(sa.getAudioTracks()[0].enabled, false); assert.equal(va.peers.size, 0);
    a.hændelse("velkommen", a.info); await afvent();
    assert.equal(va.peers.get("b").pc.remoteDescription.type, "answer");
    const p = va.peers.get("b"); p.pc.remoteDescription = null;
    a.hændelse("rtc", { fra: "b", data: { runde: p.modrunde, modrunde: va.runde, kandidat: { candidate: kandidat, sdpMid: "0", sdpMLineIndex: 0 } } });
    await afvent(); assert.equal(p.kandidater.length, 1);
    p.pc.signalingState = "have-local-offer";
    a.hændelse("rtc", { fra: "b", data: { runde: p.modrunde, modrunde: va.runde, beskrivelse: { type: "answer", sdp } } });
    await afvent(); assert.equal(p.kandidater.length, 0); assert.equal(p.pc.kandidater.length, 1);
    const gammelRunde = va.runde;
    va.luk(); a.hændelse("velkommen", a.info); assert.equal(va.runde, gammelRunde);
    assert.equal(p.pc.lukket, true); assert.equal(va.tal(true), false);
  } finally {
    va?.luk(); vb?.luk();
    globalThis.RTCPeerConnection = oprindelig; globalThis.setTimeout = set; globalThis.clearTimeout = clear;
  }
  assert.equal(timere.size, 0);
});

Deno.test("Walkie-talkie: højst syv andre peers og ingen lyd uden voksenkontakt", () => {
  const oprindelig = globalThis.RTCPeerConnection; globalThis.RTCPeerConnection = TestPeer;
  let v;
  try {
    const net = new TestNet("a", ["a", "b", "c", "d", "e", "f", "g", "h", "i"]), lyd = strøm();
    net.info.verden.stemmer = false;
    v = forbindStemmer(net, lyd); assert.equal(v.peers.size, 0); assert.equal(v.tal(true), false);
    net.hændelse("stemmer", { til: true }); assert.equal(v.peers.size, 7);
    v.luk(); assert.equal(lyd.getAudioTracks()[0].enabled, false);
  } finally { v?.luk(); globalThis.RTCPeerConnection = oprindelig; }
});
