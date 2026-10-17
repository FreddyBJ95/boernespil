import { strict as assert } from "node:assert";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";
import * as THREE from "../../spil/3d-faelles/three.module.js";
import { GLTFLoader } from "../../spil/3d-faelles/GLTFLoader.js";
import { opretSimulering } from "../../spil/brudpunkt/simulering.js";
import * as opstilling from "../../spil/brudpunkt/opsaetning.js";

const rod = new URL("../../spil/brudpunkt/", import.meta.url);
const [html, kilde, kamerakilde, effektkilde, opskrifter, modeldata] = await Promise.all([
  Deno.readTextFile(new URL("index.html", rod)),
  Deno.readTextFile(new URL("spil.js", rod)),
  Deno.readTextFile(new URL("kamera.js", rod)),
  Deno.readTextFile(new URL("effekter.js", rod)),
  Deno.readTextFile(new URL("modeller/opskrifter.json", rod)).then(JSON.parse),
  Deno.readFile(new URL("modeller/brudpunkt.glb", rod)),
]);
const gltf = await new Promise((løs, afvis) => new GLTFLoader().parse(modeldata.buffer, "", løs, afvis));
const kopi = (v) => JSON.parse(JSON.stringify(v));

// Den lille inputflade prøver spillets faktiske hændelser. Den ejer ingen browser eller legitimationsoplysninger.
class Hændelser {
  constructor() {
    this.lyttere = new Map();
  }
  addEventListener(type, fn) {
    if (!this.lyttere.has(type)) this.lyttere.set(type, new Set());
    this.lyttere.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.lyttere.get(type)?.delete(fn);
  }
  send(type, ekstra = {}) {
    const e = {
      type,
      target: this,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...ekstra,
    };
    for (const fn of [...this.lyttere.get(type) || []]) fn(e);
    this[`on${type}`]?.(e);
    return e;
  }
}

class Element extends Hændelser {
  constructor(tagName) {
    super();
    Object.assign(this, {
      tagName: tagName.toUpperCase(),
      children: [],
      parentNode: null,
      dataset: {},
      style: {},
      hidden: false,
      disabled: false,
      checked: false,
      open: false,
      attributes: new Map(),
      _tekst: "",
      _værdi: undefined,
    });
    const klasser = new Set();
    this.classList = {
      add: (...navne) => navne.forEach((n) => klasser.add(n)),
      remove: (...navne) => navne.forEach((n) => klasser.delete(n)),
      contains: (n) => klasser.has(n),
      toggle(n, tvunget) {
        const med = tvunget === undefined ? !klasser.has(n) : tvunget;
        if (med) klasser.add(n);
        else klasser.delete(n);
        return med;
      },
    };
  }
  set className(v) {
    this._klasse = v;
    this.classList.add(...v.split(/\s+/).filter(Boolean));
  }
  get className() {
    return this._klasse || "";
  }
  set textContent(v) {
    this._tekst = String(v);
    this.children = [];
  }
  get textContent() {
    return this._tekst + this.children.map((e) => e.textContent).join("");
  }
  set innerHTML(v) {
    this.textContent = v.replace(/<[^>]*>/g, "");
  }
  get options() {
    return this.children.filter((e) => e.tagName === "OPTION");
  }
  set value(v) {
    const tekst = String(v);
    this._værdi = this.tagName !== "SELECT" || this.options.some((o) => o.value === tekst) ? tekst : "";
  }
  get value() {
    return this._værdi ?? (this.tagName === "SELECT" ? this.options[0]?.value || "" : "");
  }
  setAttribute(navn, v) {
    const tekst = String(v);
    this.attributes.set(navn, tekst);
    if (navn === "class") this.className = tekst;
    else if (navn === "id") this.id = tekst;
    else if (navn.startsWith("data-")) this.dataset[navn.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = tekst;
    else if (["hidden", "disabled", "checked"].includes(navn)) this[navn] = true;
    else if (navn === "value") this.value = tekst;
    else this[navn] = tekst;
  }
  getAttribute(navn) {
    return this.attributes.get(navn) ?? null;
  }
  append(...elementer) {
    for (const e of elementer) {
      e.parentNode = this;
      this.children.push(e);
    }
  }
  replaceChildren(...elementer) {
    this.children = [];
    this._tekst = "";
    this.append(...elementer);
  }
  click() {
    if (!this.disabled) this.send("click");
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  setPointerCapture() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1024, height: 768 };
  }
  getContext() {
    const gradient = { addColorStop() {} };
    return new Proxy({ createRadialGradient: () => gradient }, { get: (obj, key) => obj[key] || (() => {}) });
  }
}

// ID'er, knapper, data-attributter og select-valg hentes fra den samme HTML, som brugeren åbner.
function dokumentFraHTML(tekst) {
  const dokument = new Hændelser(), alle = [], stak = [new Element("rod")];
  const tags = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)>/g;
  let forrige = 0;
  for (const tag of tekst.matchAll(tags)) {
    stak.at(-1)._tekst += tekst.slice(forrige, tag.index).replace(/\s+/g, " ");
    forrige = tag.index + tag[0].length;
    if (tag[1]) {
      stak.pop();
      continue;
    }
    const e = new Element(tag[2]);
    for (const a of tag[3].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      e.setAttribute(a[1], a[2] ?? a[3] ?? a[4] ?? "");
    }
    stak.at(-1).append(e);
    alle.push(e);
    if (!/^(meta|link|input|br|hr|img)$/i.test(tag[2]) && !tag[3].endsWith("/")) stak.push(e);
  }
  dokument.getElementById = (id) => alle.find((e) => e.id === id) || null;
  dokument.createElement = (tag) => new Element(tag);
  dokument.hidden = false;
  dokument.querySelectorAll = (vælger) =>
    alle.filter((e) =>
      vælger.split(",").some((s) => {
        s = s.trim();
        if (/^\[data-[a-z]+\]$/.test(s)) return e.attributes.has(s.slice(1, -1));
        const match = /^\.panel (button|input|select)(?::not\(#panelhjaelp\))?$/.exec(s);
        if (!match || e.tagName !== match[1].toUpperCase()) return false;
        if (s.includes(":not") && e.id === "panelhjaelp") return false;
        for (let p = e.parentNode; p; p = p.parentNode) if (p.classList.contains("panel")) return true;
        return false;
      })
    );
  return dokument;
}

async function startPrøve({ gemning = {}, nægtGemning = false, holdLås = false } = {}) {
  const dokument = dokumentFraHTML(html), vindue = new Hændelser(), gemt = new Map(Object.entries(gemning));
  const log = {
      lås: 0,
      lyde: [],
      stoppet: 0,
      tegninger: 0,
      renderere: 0,
      modelhentninger: 0,
      opskrifthentninger: 0,
      fysikstarter: 0,
    },
    simuleringer = [],
    rammer = [];
  let frigivPrøvelås, meldLåsVist;
  const prøvelås = new Promise((løs) => {
    frigivPrøvelås = løs;
  });
  const låsVist = new Promise((løs) => {
    meldLåsVist = løs;
  });
  let tid = 0, sim, sidsteScene, sidsteKamera, afvisGemning = nægtGemning;
  const lagring = {
    getItem(nøgle) {
      if (afvisGemning) throw new Error("Prøvens enhed nægter lagring");
      return gemt.get(nøgle) ?? null;
    },
    setItem(nøgle, værdi) {
      if (afvisGemning) throw new Error("Prøvens lager er fuldt");
      gemt.set(nøgle, String(værdi));
    },
  };
  const kontekst = createContext({
    document: dokument,
    window: vindue,
    localStorage: lagring,
    URL,
    AbortSignal,
    console,
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    performance: { now: () => tid },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (fn) => rammer.push(fn),
    fetch: (url) => {
      assert.equal(String(url), new URL("modeller/opskrifter.json", rod).href);
      log.opskrifthentninger++;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(kopi(opskrifter)) });
    },
  });
  function syntetisk(exports) {
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [navn, værdi] of Object.entries(exports)) this.setExport(navn, værdi);
    }, { context: kontekst });
  }
  const grafik = syntetisk({
    ...THREE,
    WebGLRenderer: class {
      constructor() {
        log.renderere++;
        this.shadowMap = {};
      }
      setPixelRatio() {}
      setSize() {}
      render(scene, kamera) {
        scene.updateMatrixWorld(true);
        kamera.updateMatrixWorld(true);
        sidsteScene = scene;
        sidsteKamera = kamera;
        log.tegninger++;
      }
    },
    PMREMGenerator: class {
      fromScene() {
        return { texture: new THREE.Texture() };
      }
      dispose() {}
    },
  });
  // Kun denne isolerede test udskifter voksenlåsen. Den læser hverken rigtig PIN eller rigtig browserlagring.
  const adgang = syntetisk({
    lås: async (element) => {
      assert.equal(element.id, "laas");
      log.lås++;
      element.classList.remove("skjult");
      meldLåsVist();
      if (holdLås) await prøvelås;
      element.classList.add("skjult");
    },
  });
  const moduler = new Map([
    [new URL("../3d-faelles/three.module.js", rod).href, grafik],
    [
      new URL("../3d-faelles/GLTFLoader.js", rod).href,
      syntetisk({
        GLTFLoader: class {
          loadAsync(url) {
            assert.equal(url, new URL("modeller/brudpunkt.glb", rod).href);
            log.modelhentninger++;
            return Promise.resolve({ scene: gltf.scene.clone(true) });
          }
        },
      }),
    ],
    [new URL("../laas.js", rod).href, adgang],
    [new URL("./opsaetning.js", rod).href, syntetisk(opstilling)],
    [
      new URL("./simulering.js", rod).href,
      syntetisk({
        opretSimulering: async (...args) => {
          log.fysikstarter++;
          sim = await opretSimulering(...args);
          simuleringer.push(sim);
          return sim;
        },
      }),
    ],
    [
      new URL("./lyd.js", rod).href,
      syntetisk({
        BrudLyd: class {
          saetLyd() {}
          start() {
            return Promise.resolve(true);
          }
          stop() {
            log.stoppet++;
          }
          klik() {}
          opdaterKamera() {}
          afspil(h) {
            log.lyde.push(kopi(h));
            return Promise.resolve(true);
          }
        },
      }),
    ],
  ]);
  for (const [navn, indhold] of [["spil.js", kilde], ["kamera.js", kamerakilde], ["effekter.js", effektkilde]]) {
    const url = new URL(navn, rod).href;
    moduler.set(
      url,
      new SourceTextModule(indhold, {
        context: kontekst,
        identifier: url,
        initializeImportMeta: (meta) => {
          meta.url = url;
        },
      }),
    );
  }
  const program = moduler.get(new URL("spil.js", rod).href);
  await program.link((sti, fra) => {
    const url = new URL(sti, fra.identifier).href;
    if (!moduler.has(url)) throw new Error("Uventet import i Brudpunkts UI-prøve: " + url);
    return moduler.get(url);
  });
  const klar = program.evaluate().catch((e) => {
    simuleringer.forEach((s) => s.frigiv());
    throw e;
  });
  if (holdLås) {
    await Promise.race([
      låsVist,
      klar.then(() => {
        throw new Error("Spillet blev færdigt uden at afvente prøvens voksenlås");
      }),
    ]);
  } else await klar;
  const $ = (id) => {
    const e = dokument.getElementById(id);
    assert.ok(e, "Mangler HTML-elementet " + id);
    return e;
  };
  return {
    $,
    log,
    get sim() {
      return sim;
    },
    klar,
    frigivLås() {
      frigivPrøvelås();
      return klar;
    },
    gemt,
    dokument,
    vindue,
    knap: (felt, værdi) => dokument.querySelectorAll(`[data-${felt}]`).find((e) => e.dataset[felt] === værdi),
    gemningAfvist(v) {
      afvisGemning = v;
    },
    frame(antal = 1) {
      for (let n = 0; n < antal; n++) {
        const fn = rammer.shift();
        assert.ok(fn, "Spillet skal bestille næste frame");
        tid += 50;
        fn(tid);
      }
    },
    pege(type, punkt, ekstra = {}) {
      assert.ok(sidsteKamera, "Tegn en frame inden input på banen");
      const p = new THREE.Vector3(...punkt).project(sidsteKamera);
      $("verden").send(type, {
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: (p.x + 1) * 512,
        clientY: (1 - p.y) * 384,
        shiftKey: false,
        ...ekstra,
      });
    },
    klikFelt(p) {
      this.pege("pointerdown", p);
      this.pege("pointerup", p);
    },
    objekter: () => [...sim.objekter.values()].map((o) => kopi(o.spec)),
    tegnet: () => sidsteScene,
    luk() {
      simuleringer.forEach((s) => s.frigiv());
      rammer.length = 0;
    },
  };
}

// Spillet ligger blandt børnespillene: det starter med det samme, uden at spørge efter voksenkoden.
Deno.test("Brudpunkt: starter uden voksenlås og bygger GPU, model og fysik med det samme", async () => {
  const p = await startPrøve({ gemning: { "brudpunkt-hjaelp": "1" } });
  try {
    assert.equal(p.log.lås, 0);
    assert.equal(p.$("app").hidden, false);
    assert.equal(p.$("indlaeser").hidden, true);
    assert.equal(p.log.renderere, 1);
    assert.equal(p.log.modelhentninger, 1);
    assert.equal(p.log.opskrifthentninger, 1);
    assert.equal(p.log.fysikstarter, 1);
    assert.equal(p.sim.hentStatus().objekter, 5);
    p.frame();
    assert.ok(p.log.tegninger > 0);
  } finally {
    p.luk();
  }
});

Deno.test("Brudpunkt: faktisk HTML, Three og Rapier starter; placering, træk, kopi, drejning og sletning gemmer samme opstilling", async () => {
  const p = await startPrøve();
  try {
    assert.equal(p.log.lås, 0);
    assert.equal(p.$("indlaeser").hidden, true);
    assert.equal(p.$("app").hidden, false);
    assert.equal(p.$("vejledning").open, true);
    p.$("forstaaet").click();
    p.frame();
    assert.equal(p.sim.hentStatus().objekter, 5);
    assert.equal(p.sim.hentDele().length, 81);
    p.knap("type", "bil").click();
    p.klikFelt([-14, 0, 12]);
    assert.equal(p.sim.hentStatus().objekter, 6);
    const bil = p.objekter().at(-1);
    assert.equal(bil.type, "bil");
    assert.deepEqual([bil.x, bil.z], [-14, 12]);
    p.$("afslutplacering").click();
    p.frame();
    p.pege("pointerdown", [-14, 1, 12]);
    p.pege("pointermove", [-10, 1, 12]);
    p.pege("pointerup", [-10, 1, 12]);
    const flyttet = p.objekter().find((o) => o.id === bil.id);
    assert.ok(flyttet.x > -13, "Det tegnede objekt skal faktisk flyttes gennem raycaster/input");
    p.$("drej").click();
    p.$("hoejde").value = "1.25";
    p.$("hoejde").send("change");
    const ændret = p.objekter().find((o) => o.id === bil.id);
    assert.ok(Math.abs(ændret.vinkel - Math.PI / 12) < 1e-10);
    assert.equal(ændret.y, 1.25);
    p.$("kopier").click();
    assert.equal(p.sim.hentStatus().objekter, 7);
    p.$("slet").click();
    assert.equal(p.sim.hentStatus().objekter, 6);
    assert.deepEqual(opstilling.læsOpstilling(p.gemt.get("brudpunkt-opstilling-v1")), p.objekter());
    assert.ok(p.log.tegninger > 0);
  } finally {
    p.luk();
  }
});

Deno.test("Brudpunkt: en kædes fine forsinkelse overlever styrkeskift og genåbning af gemningen", async () => {
  const p = await startPrøve({ gemning: { "brudpunkt-hjaelp": "1" } });
  let gemning;
  try {
    p.knap("forsoeg", "kaede").click();
    p.frame();
    assert.equal(p.sim.hentStatus().objekter, 7);
    p.klikFelt([-4.5, 1, 1]);
    assert.equal(p.$("valgnavn").textContent, "Energicelle");
    assert.equal(p.$("forsinkelse").value, "0.6");
    p.$("styrke").value = "5";
    p.$("styrke").send("input");
    const celle = p.objekter().find((o) => o.x === -4.5 && o.type === "celle");
    assert.equal(celle.styrke, 5);
    assert.equal(celle.forsinkelse, .6);
    assert.equal(p.$("styrkevaerdi").textContent, "5 / 5");
    gemning = Object.fromEntries(p.gemt);
  } finally {
    p.luk();
  }
  const q = await startPrøve({ gemning });
  try {
    const celle = q.objekter().find((o) => o.x === -4.5 && o.type === "celle");
    assert.equal(celle.styrke, 5);
    assert.equal(celle.forsinkelse, .6);
    assert.equal(q.sim.hentStatus().objekter, 7);
  } finally {
    q.luk();
  }
});

Deno.test("Brudpunkt: nedtælling, faktisk kæde, objektivskade, pause, replay og nulstilling hænger sammen", async () => {
  const p = await startPrøve({ gemning: { "brudpunkt-hjaelp": "1" } });
  try {
    p.frame();
    const oprindelig = p.objekter();
    p.$("naer").click();
    p.$("start").click();
    assert.equal(p.$("start").disabled, true);
    assert.equal(p.knap("type", "bil").disabled, true);
    p.frame(20);
    assert.equal(p.$("panelhjaelp").disabled, false, "Mobilens hjælp skal være tilgængelig, mens byggeknapperne er låst");
    p.$("panelhjaelp").click();
    assert.equal(p.$("start").textContent, "Fortsæt");
    p.frame(20);
    assert.equal(p.sim.hentStatus().tid, 0, "Hjælp må ikke starte fysikken under nedtællingen");
    p.$("forstaaet").click();
    p.$("start").click();
    p.frame(36);
    assert.ok(p.sim.hentStatus().tid > .3);
    assert.ok(p.sim.hentStatus().pulser >= 1, "Den faktiske Rapier-simulering skal udløse første celle");
    assert.ok(p.log.lyde.some((h) => h.type === "puls"));
    assert.equal(p.$("kameraskade").hidden, false);
    p.$("nytobjektiv").click();
    assert.equal(p.$("kameraskade").hidden, true);
    p.vindue.send("blur");
    const pausetid = p.sim.hentStatus().tid;
    p.frame(10);
    assert.equal(p.sim.hentStatus().tid, pausetid);
    p.$("start").click();
    p.frame(40);
    p.$("start").click();
    assert.equal(p.$("resultat").hidden, false);
    assert.equal(p.$("resultatliste").children.length, 3);
    p.$("genspil").click();
    p.frame(4);
    const replayFør = p.$("tidslinje").value, lydstop = p.log.stoppet;
    p.$("hjaelp").click();
    p.frame(10);
    assert.equal(p.$("tidslinje").value, replayFør, "Replay står stille bag hjælpedialogen");
    assert.ok(p.log.stoppet > lydstop, "Hjælp stopper også replaylydene");
    assert.equal(p.$("genspil").textContent, "▶ Fortsæt");
    p.$("forstaaet").click();
    p.$("nytest").click();
    assert.deepEqual(p.objekter(), oprindelig);
    assert.ok(p.sim.hentDele().every((d) => d.skade === 0));
    assert.equal(p.$("resultat").hidden, true);
    assert.equal(p.$("kameraskade").hidden, true);
    assert.equal(p.$("genspil").textContent, "↺ Gense");
    assert.equal(p.$("tidslinje").value, "0");
    assert.match(p.$("tip").textContent, /^Træk en ting/);
    assert.equal(p.knap("type", "bil").disabled, false);
    assert.equal(p.sim.hentStatus().pulser, 0);
  } finally {
    p.luk();
  }
});

Deno.test("Brudpunkt: enhedens lagringsfejl stopper ikke placering og et nyt forsøg", async () => {
  const p = await startPrøve({ nægtGemning: true });
  try {
    p.$("forstaaet").click();
    p.frame();
    assert.equal(p.sim.hentStatus().objekter, 5);
    p.knap("type", "celle").click();
    p.klikFelt([-14, 0, 12]);
    assert.equal(p.sim.hentStatus().objekter, 6);
    assert.match(p.$("gemt").textContent, /Kunne ikke gemme/);
    p.gemningAfvist(false);
    p.$("toem").click();
    assert.equal(p.sim.hentStatus().objekter, 0);
    assert.deepEqual(opstilling.læsOpstilling(p.gemt.get("brudpunkt-opstilling-v1")), []);
    p.$("start").click();
    assert.match(p.$("besked").textContent, /Placér en energicelle/);
  } finally {
    p.luk();
  }
});

Deno.test("Brudpunkt: ødelagt JSON giver en brugbar standardbane, og en gemt tom bane gendannes tom", async () => {
  const p = await startPrøve({ gemning: { "brudpunkt-opstilling-v1": "{ødelagt", "brudpunkt-hjaelp": "1" } });
  try {
    assert.equal(p.$("app").hidden, false);
    assert.equal(p.sim.hentStatus().objekter, 5);
    assert.match(p.$("besked").textContent, /gemte opstilling kunne ikke åbnes/);
    p.knap("forsoeg", "taarn").click();
    assert.equal(opstilling.læsOpstilling(p.gemt.get("brudpunkt-opstilling-v1")).length, 4);
  } finally {
    p.luk();
  }
  const q = await startPrøve({
    gemning: {
      "brudpunkt-opstilling-v1": opstilling.pakOpstilling([]),
      "brudpunkt-hjaelp": "1",
    },
  });
  try {
    assert.equal(q.sim.hentStatus().objekter, 0);
    q.$("start").click();
    assert.match(q.$("besked").textContent, /Placér en energicelle/);
  } finally {
    q.luk();
  }
});
