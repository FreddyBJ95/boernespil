import test from "node:test";
import assert from "node:assert/strict";
import { BrudLyd } from "./lyd.js";

const parameter = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} });
const vent = () => new Promise((løs) => setImmediate(løs));

// En lille Web Audio-dobbelt tæller virkelige kilder og forbindelser, uden browser eller højttalere.
function miljø(t, valg = {}) {
  const originaler = Object.fromEntries(["AudioContext", "webkitAudioContext", "fetch"].map((n) => [n, globalThis[n]]));
  const instanser = [], hentet = [];
  class Knude {
    constructor(kontekst) {
      this.kontekst = kontekst;
      this.forbindelser = [];
      this.frakoblet = false;
      for (
        const n of [
          "gain",
          "frequency",
          "Q",
          "playbackRate",
          "threshold",
          "knee",
          "ratio",
          "attack",
          "release",
          "positionX",
          "positionY",
          "positionZ",
        ]
      ) this[n] = parameter();
    }
    connect(knude) {
      this.forbindelser.push(knude);
    }
    disconnect() {
      this.forbindelser = [];
      this.frakoblet = true;
    }
    start(...argumenter) {
      this.startArgumenter = argumenter;
      this.startet = true;
      this.kontekst.spiller.add(this);
      this.kontekst.maks = Math.max(this.kontekst.maks, this.kontekst.spiller.size);
    }
    stop(tid) {
      if (tid !== undefined) return;
      this.kontekst.spiller.delete(this);
      this.stoppet = true;
    }
    afslut() {
      this.kontekst.spiller.delete(this);
      this.onended?.();
    }
  }
  class Kontekst {
    constructor() {
      this.state = "suspended";
      this.currentTime = 1;
      this.sampleRate = 8000;
      this.destination = {};
      this.spiller = new Set();
      this.knuder = [];
      this.kilder = [];
      this.maks = 0;
      this.resumeKald = 0;
      this.listener = Object.fromEntries(
        ["positionX", "positionY", "positionZ", "forwardX", "forwardY", "forwardZ", "upX", "upY", "upZ"].map((
          n,
        ) => [n, parameter()]),
      );
      instanser.push(this);
    }
    async resume() {
      this.resumeKald++;
      if (valg.resumeFejl) throw new Error("Brugeren har ikke startet lyd endnu");
      this.state = "running";
    }
    close() {
      this.state = "closed";
      return Promise.resolve();
    }
    lav() {
      const k = new Knude(this);
      this.knuder.push(k);
      return k;
    }
    createGain() {
      return this.lav();
    }
    createDynamicsCompressor() {
      return this.lav();
    }
    createConvolver() {
      return this.lav();
    }
    createBiquadFilter() {
      return this.lav();
    }
    createPanner() {
      return this.lav();
    }
    createBufferSource() {
      const k = this.lav();
      this.kilder.push(k);
      return k;
    }
    createOscillator() {
      return this.createBufferSource();
    }
    createBuffer(kanaler, længde) {
      return { getChannelData: () => new Float32Array(længde) };
    }
    async decodeAudioData(data) {
      if (valg.decodeFejl) throw new Error("Decoder afviste fil");
      if (valg.decode) return await valg.decode(data);
      return { duration: 5 };
    }
  }
  delete globalThis.webkitAudioContext;
  globalThis.AudioContext = Kontekst;
  globalThis.fetch = async (url, indstillinger) => {
    hentet.push(String(url));
    if (valg.fetch) return await valg.fetch(url, indstillinger);
    return { ok: !valg.fetchFejl, arrayBuffer: async () => new ArrayBuffer(2) };
  };
  t.after(() => {
    for (const [navn, værdi] of Object.entries(originaler)) {
      if (værdi === undefined) delete globalThis[navn];
      else globalThis[navn] = værdi;
    }
  });
  return { instanser, hentet };
}

test("Lyd er valgfri, hvis browseren ikke har Web Audio", async (t) => {
  miljø(t);
  delete globalThis.AudioContext;
  const lyd = new BrudLyd();
  assert.equal(await lyd.start(), false);
  assert.equal(await lyd.afspil({ type: "puls", position: [0, 0, 0] }), false);
  lyd.klik();
  lyd.stop();
  lyd.frigiv();
});

test("Safari-resume kaldes fra start, en afvisning kan prøves igen, og konteksten genbruges", async (t) => {
  const valg = { resumeFejl: true }, m = miljø(t, valg), lyd = new BrudLyd();
  const opstart = lyd.start();
  assert.equal(m.instanser[0].resumeKald, 1, "Resume skal ske før nogen ventetid fra indlæsning");
  assert.equal(await opstart, false);
  assert.equal(m.instanser[0].resumeKald, 1);
  assert.equal(m.hentet.length, 0);
  valg.resumeFejl = false;
  assert.equal(await lyd.start(), true);
  assert.equal(await lyd.start(), true);
  assert.equal(m.instanser.length, 1);
  assert.equal(m.hentet.length, 8, "De samme otte kerneklip skal kun hentes én gang");
  lyd.frigiv();
});

test("Den ældre Safari-konstruktør understøttes også", async (t) => {
  const m = miljø(t), lyd = new BrudLyd();
  globalThis.webkitAudioContext = globalThis.AudioContext;
  delete globalThis.AudioContext;
  assert.equal(await lyd.start(), true);
  assert.equal(m.instanser.length, 1);
  lyd.frigiv();
});

test("Manglende MP3 og decoderfejl giver lydløs fallback uden genhentning", async (t) => {
  const m = miljø(t, { decodeFejl: true }), lyd = new BrudLyd();
  assert.equal(await lyd.start(), true);
  assert.equal(await lyd.afspil({ type: "puls", position: [0, 0, 0], styrke: .8 }), false);
  assert.equal(m.instanser[0].kilder.length, 0);
  assert.equal(m.hentet.length, 8);
  lyd.frigiv();
});

test("404 på en lyd er også valgfri og forhindrer ikke start", async (t) => {
  const m = miljø(t, { fetchFejl: true }), lyd = new BrudLyd();
  assert.equal(await lyd.start(), true);
  assert.equal(await lyd.afspil({ type: "puls", position: [0, 0, 0] }), false);
  assert.equal(m.instanser[0].kilder.length, 0);
  lyd.frigiv();
});

test("Kædereaktioner har højst 16 kilder; kontaktlyde kan vige for nye brag", async (t) => {
  const m = miljø(t), lyd = new BrudLyd();
  await lyd.start();
  for (let i = 0; i < 16; i++) assert.equal(await lyd.afspil({ type: "kontakt", position: [i, 0, 0] }), true);
  assert.equal(await lyd.afspil({ type: "kontakt", position: [18, 0, 0] }), false);
  for (let i = 0; i < 40; i++) await lyd.afspil({ type: "puls", position: [i, 3, 0] });
  const c = m.instanser[0];
  assert.equal(c.maks, 16);
  assert.equal(c.spiller.size, 16);
  lyd.stop();
  assert.equal(c.spiller.size, 0);
  assert.ok(c.kilder.every((k) => k.frakoblet));
  lyd.frigiv();
});

test("Kontakter i samme område dæmpes, men kan høres igen når fysiktiden går", async (t) => {
  const m = miljø(t), lyd = new BrudLyd();
  await lyd.start();
  const hændelse = { type: "kontakt", materiale: "beton", position: [2, 0, 1] };
  assert.equal(await lyd.afspil(hændelse), true);
  assert.equal(await lyd.afspil({ ...hændelse, position: [2.01, 0, 1] }), false);
  m.instanser[0].currentTime += .1;
  assert.equal(await lyd.afspil(hændelse), true);
  assert.equal(await lyd.afspil({ ...hændelse, position: [300, 0, 0] }), false);
  assert.equal(await lyd.afspil({ ...hændelse, position: [NaN, 0, 0] }), false);
  assert.equal(await lyd.afspil({ ...hændelse, styrke: NaN }), false);
  lyd.frigiv();
});

test("En optagelses stille forkant forsinker ikke den kontrollerede puls", async (t) => {
  const m = miljø(t), lyd = new BrudLyd();
  await lyd.start();
  assert.equal(await lyd.afspil({ type: "puls", position: [0, 0, 0], styrke: .2 }), true);
  assert.equal(m.instanser[0].kilder[0].startArgumenter[1], .12);
  lyd.frigiv();
});

test("Mute standser også et klip, der afventer indlæsning", async (t) => {
  const m = miljø(t), lyd = new BrudLyd();
  await lyd.start();
  let løs;
  m.instanser[0].decodeAudioData = () =>
    new Promise((r) => {
      løs = r;
    });
  const før = Math.random;
  Math.random = () => .999;
  const afspilning = lyd.afspil({ type: "brud", materiale: "glas", position: [0, 0, 0] });
  Math.random = før;
  await vent();
  assert.equal(typeof løs, "function");
  lyd.saetLyd(false);
  løs({ duration: 2 });
  assert.equal(await afspilning, false);
  assert.equal(m.instanser[0].spiller.size, 0);
  lyd.saetLyd(true);
  assert.equal(await lyd.afspil({ type: "puls", position: [2, 0, 0] }), true);
  lyd.frigiv();
});

test("Nulstilling starter ikke ventende klip, og køen er begrænset til 16 hændelser", async (t) => {
  const m = miljø(t), lyd = new BrudLyd();
  await lyd.start();
  let løs;
  m.instanser[0].decodeAudioData = () =>
    new Promise((r) => {
      løs = r;
    });
  const før = Math.random;
  Math.random = () => .999;
  const hændelser = Array.from(
    { length: 16 },
    (_, i) => lyd.afspil({ type: "brud", materiale: "glas", position: [i, 0, 0] }),
  );
  Math.random = før;
  assert.equal(await lyd.afspil({ type: "puls", position: [30, 0, 0] }), false);
  await vent();
  lyd.stop();
  løs({ duration: 2 });
  assert.ok((await Promise.all(hændelser)).every((spillet) => spillet === false));
  assert.equal(m.instanser[0].spiller.size, 0);
  lyd.frigiv();
});

test("Afsluttede klip frakobles; kameraretning og endelig lukning rydder lydgrafen", async (t) => {
  const m = miljø(t), lyd = new BrudLyd();
  await lyd.start();
  lyd.opdaterKamera([5, 3, 2], [1, 0, 0]);
  const c = m.instanser[0];
  assert.equal(c.listener.positionX.value, 5);
  assert.equal(c.listener.forwardX.value, 1);
  await lyd.afspil({ type: "puls", position: [1, 0, 0] });
  c.kilder[0].afslut();
  assert.equal(c.spiller.size, 0);
  lyd.klik();
  lyd.frigiv();
  lyd.frigiv();
  assert.equal(c.state, "closed");
  assert.equal(c.spiller.size, 0);
  assert.ok(c.knuder.every((k) => k.frakoblet));
  assert.equal(await lyd.start(), false);
  assert.equal(await lyd.afspil({ type: "puls", position: [0, 0, 0] }), false);
});

test("Lukning afbryder højst to samtidige filhentninger og frigiver resten af køen", async (t) => {
  let aktive = 0, maks = 0;
  const m = miljø(t, {
    fetch: (url, { signal }) =>
      new Promise((løs, afvis) => {
        aktive++;
        maks = Math.max(maks, aktive);
        signal.addEventListener("abort", () => {
          aktive--;
          afvis(new Error("Afbrudt"));
        }, { once: true });
      }),
  });
  const lyd = new BrudLyd(), opstart = lyd.start();
  await vent();
  assert.equal(aktive, 2);
  lyd.frigiv();
  assert.equal(await opstart, false);
  assert.equal(maks, 2);
  assert.equal(aktive, 0);
  assert.equal(m.hentet.length, 2);
});
