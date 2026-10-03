import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { ØLyd } from "./lyd.js";

// Kun lyd-API'et er erstattet; prøverne kalder den faktiske lydklasse og Krystals tonefunktion.
function lydmiljø(valg = {}) {
  const spor = { kontekster: 0, genoptagelser: 0, lukninger: 0, gains: [], toner: [] };
  const prøv = (navn) => {
    if (valg.fejl === navn) throw new Error("Valgfri lydfejl: " + navn);
  };
  const parameter = () => ({
    value: 0,
    setTargetAtTime(v) {
      prøv("setTargetAtTime");
      this.value = v;
    },
    setValueAtTime(v) {
      prøv("setValueAtTime");
      this.value = v;
    },
    linearRampToValueAtTime() {
      prøv("linearRampToValueAtTime");
    },
    exponentialRampToValueAtTime() {
      prøv("exponentialRampToValueAtTime");
    },
  });
  const knude = () => ({
    connect() {
      prøv("connect");
    },
    start() {
      prøv("start");
    },
    stop() {
      prøv("stop");
    },
  });
  class Audio {
    constructor() {
      prøv("constructor");
      spor.kontekster++;
      this.destination = {};
      this.currentTime = 0;
      this.sampleRate = 16;
      this.state = "suspended";
    }
    createGain() {
      prøv("createGain");
      const g = { ...knude(), gain: parameter() };
      spor.gains.push(g);
      return g;
    }
    createBuffer(c, n) {
      prøv("createBuffer");
      return {
        getChannelData() {
          prøv("getChannelData");
          return new Float32Array(n);
        },
      };
    }
    createBufferSource() {
      prøv("createBufferSource");
      return knude();
    }
    createBiquadFilter() {
      prøv("createBiquadFilter");
      return { ...knude(), frequency: parameter() };
    }
    createOscillator() {
      prøv("createOscillator");
      const o = { ...knude(), frequency: parameter() };
      spor.toner.push(o);
      return o;
    }
    resume() {
      spor.genoptagelser++;
      prøv("resumeSynkront");
      return valg.fejl === "resume" ? Promise.reject(new Error("Lyd kræver et nyt tryk")) : Promise.resolve();
    }
    close() {
      spor.lukninger++;
      return valg.lukAfvist ? Promise.reject(new Error("Lydlukning afvist")) : Promise.resolve();
    }
  }
  return { Audio, spor };
}

async function medVindue(vindue, handling) {
  const tidligere = globalThis.window;
  try {
    globalThis.window = vindue;
    return await handling();
  } finally {
    if (tidligere === undefined) delete globalThis.window;
    else globalThis.window = tidligere;
  }
}

test("ØLyd: manglende WebAudio og alle fejl under grafens start er valgfri", async () => {
  await medVindue({}, async () => assert.equal(await new ØLyd().start(), false));
  for (
    const fejl of [
      "constructor",
      "createGain",
      "createBuffer",
      "getChannelData",
      "createBufferSource",
      "createBiquadFilter",
      "connect",
      "start",
    ]
  ) {
    const m = lydmiljø({ fejl, lukAfvist: true });
    await medVindue({ AudioContext: m.Audio }, async () => {
      const lyd = new ØLyd();
      assert.equal(await lyd.start(), false, fejl);
      assert.equal(lyd.ctx, null, "En halv lydgraf bliver ikke gemt");
      assert.equal(lyd.master, null);
      assert.equal(m.spor.lukninger, fejl === "constructor" ? 0 : 1);
      assert.doesNotThrow(() => lyd.fremskridt());
      assert.doesNotThrow(() => lyd.sæt(false));
    });
  }
  await new Promise((resolve) => setImmediate(resolve));
});

test("ØLyd: afvist resume kan prøves igen uden ny graf eller unhandled rejection", async () => {
  for (const fejl of ["resume", "resumeSynkront"]) {
    const valg = { fejl }, m = lydmiljø(valg);
    await medVindue({ webkitAudioContext: m.Audio }, async () => {
      const lyd = new ØLyd();
      assert.equal(await lyd.start(), false);
      assert.ok(lyd.ctx && lyd.master);
      valg.fejl = null;
      assert.equal(await lyd.start(), true);
      assert.equal(m.spor.kontekster, 1);
      assert.equal(m.spor.genoptagelser, 2);
    });
  }
});

test("ØLyd: eksisterende mute og pause er lydløse fra første graf, faste niveauer bevares", async () => {
  const m = lydmiljø();
  await medVindue({ AudioContext: m.Audio }, async () => {
    const lyd = new ØLyd();
    lyd.sæt(false);
    assert.equal(await lyd.start(), true);
    assert.equal(lyd.master.gain.value, 0);
    assert.equal(m.spor.gains[1].gain.value, .8, "Havets faste niveau er uændret");
    lyd.tone(440);
    assert.equal(m.spor.toner.length, 0);
    lyd.sæt(true, true);
    lyd.fremskridt();
    assert.equal(m.spor.toner.length, 0);
    lyd.sæt(true);
    assert.equal(lyd.master.gain.value, .14);
    lyd.tone(440);
    assert.equal(m.spor.toner.length, 1);
  });
});

test("ØLyd: en lukket eller afvist tone/volumenknude afbryder aldrig spillets callback", async () => {
  const valg = {}, m = lydmiljø(valg);
  await medVindue({ AudioContext: m.Audio }, async () => {
    const lyd = new ØLyd();
    await lyd.start();
    valg.fejl = "createOscillator";
    assert.doesNotThrow(() => lyd.fremskridt());
    valg.fejl = "setTargetAtTime";
    assert.doesNotThrow(() => lyd.sæt(false, true));
    assert.equal(lyd.aktiv, false);
    assert.equal(lyd.pauset, true);
  });
});

const krystalkode = readFileSync(new URL("../krystaljaegerne/spil.js", import.meta.url), "utf8");
const tonekode = krystalkode.match(/function tone\([\s\S]*?\n\}/)?.[0];
assert.ok(tonekode, "Den faktiske Krystaltone skal findes i runtimekoden");

test("Krystals faktiske tone: afvist async resume håndteres og synkrone lydfejl er valgfri", async () => {
  for (const fejl of ["resume", "resumeSynkront", "constructor", "createOscillator", "createGain"]) {
    const m = lydmiljø({ fejl });
    const ramme = { s: { lyd: true }, window: { AudioContext: m.Audio }, lydkontekst: null };
    runInNewContext(tonekode + "\n;globalThis.spilTone = tone;", ramme);
    assert.doesNotThrow(() => ramme.spilTone());
  }
  await new Promise((resolve) => setImmediate(resolve));
});

test("Krystals faktiske tone: mute opretter ingen lyd, normal tone beholder sin styrke", () => {
  const m = lydmiljø(), ramme = { s: { lyd: false }, window: { webkitAudioContext: m.Audio }, lydkontekst: null };
  runInNewContext(tonekode + "\n;globalThis.spilTone = tone;", ramme);
  ramme.spilTone();
  assert.equal(m.spor.kontekster, 0);
  ramme.s.lyd = true;
  ramme.spilTone();
  assert.equal(m.spor.kontekster, 1);
  assert.equal(m.spor.gains[0].gain.value, .06);
});
