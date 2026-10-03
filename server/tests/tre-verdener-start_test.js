import { strict as assert } from "node:assert";
import { startSpil, visStartfejl } from "../../spil/3d-faelles/start.js";

// Et lille DOM-miljø kører den faktiske komponent; ingen spil, voksenlås eller browserlager.
function miljø() {
  const rækkefølge = [];
  let dokument, genindlæsninger = 0;
  class Element extends EventTarget {
    constructor(tag) {
      super();
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attributter = new Map();
      this.inert = false;
    }
    append(...børn) {
      for (const barn of børn) { barn.parentNode = this; this.children.push(barn); }
      if (this === dokument.body) rækkefølge.push("overlay");
    }
    setAttribute(navn, værdi) { this.attributter.set(navn, værdi); }
    dispatchEvent(hændelse) {
      let stoppet = false;
      const stop = hændelse.stopPropagation.bind(hændelse);
      Object.defineProperty(hændelse, "stopPropagation", { configurable: true, value() { stoppet = true; stop(); } });
      const resultat = super.dispatchEvent(hændelse);
      if (hændelse.bubbles && !stoppet) {
        if (this.parentNode) this.parentNode.dispatchEvent(hændelse);
        else vindue.dispatchEvent(hændelse);
      }
      return resultat;
    }
    attachShadow() {
      this.shadowRoot = new Element("shadow");
      this.shadowRoot.host = this;
      return this.shadowRoot;
    }
    focus() {
      let rod = this;
      while (rod.parentNode) rod = rod.parentNode;
      if (rod.host) { rod.activeElement = this; dokument.activeElement = rod.host; }
      else dokument.activeElement = this;
    }
  }
  dokument = new EventTarget();
  dokument.baseURI = "https://eksempel.dk/spil/det-sidste-lys/index.html";
  dokument.createElement = tag => new Element(tag);
  dokument.body = new Element("body");
  const find = (rod, test) => {
    if (test(rod)) return rod;
    for (const barn of rod.children || []) { const r = find(barn, test); if (r) return r; }
    return null;
  };
  dokument.getElementById = id => find(dokument.body, e => e.id === id);
  const vindue = new EventTarget();
  vindue.Event = Event;
  vindue.location = { reload() { genindlæsninger++; } };
  vindue.addEventListener("blur", () => rækkefølge.push("blur"));
  const baggrund = new Element("main");
  dokument.body.append(baggrund);
  rækkefølge.length = 0;
  return { dokument, vindue, baggrund, rækkefølge, find, get genindlæsninger() { return genindlæsninger; } };
}
const script = () => ({ dataset: { spil: "./spil.js" } });
const lag = m => m.dokument.getElementById("spil-3d-startfejl");

Deno.test("3D-start: normal import ændrer hverken UI, lås eller input", async () => {
  const m = miljø();
  const kald = [];
  const resultat = await startSpil(script(), { ...m, importer: async sti => { kald.push(sti); } });
  assert.deepEqual(kald, ["https://eksempel.dk/spil/det-sidste-lys/spil.js"]);
  assert.equal(resultat.klar, true);
  assert.equal(lag(m), null);
  assert.equal(m.baggrund.inert, false);
  assert.deepEqual(m.rækkefølge, []);
  resultat.stop();
});

Deno.test("3D-start: afventet import udløser ingen loading-timeout eller låshandling", async () => {
  const m = miljø();
  let færdig, afsluttet = false;
  const venter = startSpil(script(), { ...m, importer: () => new Promise(resolve => { færdig = resolve; }) })
    .then(r => { afsluttet = true; return r; });
  await Promise.resolve();
  assert.equal(afsluttet, false);
  assert.equal(lag(m), null);
  assert.equal(m.baggrund.inert, false);
  færdig({});
  const resultat = await venter;
  assert.equal(resultat.klar, true);
  resultat.stop();
});

Deno.test("3D-start: importfejl har selvstændig retry, hjemlink og fokus", async () => {
  const m = miljø();
  const resultat = await startSpil(script(), { ...m, importer: async () => { throw new Error("Indlæsning af modul fejlede"); } });
  assert.equal(resultat.klar, false);
  assert.deepEqual(m.rækkefølge, ["blur", "overlay"], "Gammelt input standser før fallback");
  assert.equal(m.baggrund.inert, true);
  const rod = lag(m).shadowRoot;
  const igen = m.find(rod, e => e.tagName === "BUTTON");
  const hjem = m.find(rod, e => e.tagName === "A");
  const dialog = m.find(rod, e => e.tagName === "SECTION");
  assert.equal(igen.textContent, "Prøv igen");
  assert.equal(hjem.textContent, "Til spilkassen");
  assert.equal(hjem.href, "https://eksempel.dk/index.html");
  assert.equal(dialog.attributter.get("aria-modal"), "true");
  assert.equal(rod.activeElement, igen);
  igen.dispatchEvent(new Event("click"));
  assert.equal(m.genindlæsninger, 1);
  const tilbageTab = new Event("keydown", { cancelable: true });
  tilbageTab.key = "Tab"; tilbageTab.shiftKey = true;
  lag(m).dispatchEvent(tilbageTab);
  assert.equal(tilbageTab.defaultPrevented, true);
  assert.equal(rod.activeElement, hjem);
  const fremTab = new Event("keydown", { cancelable: true }); fremTab.key = "Tab";
  lag(m).dispatchEvent(fremTab);
  assert.equal(rod.activeElement, igen);
  let gamleKald = 0;
  m.vindue.addEventListener("keydown", () => gamleKald++);
  for (const key of ["Escape", "Tab", "w", " "]) {
    const tast = new Event("keydown", { bubbles: true, cancelable: true });
    tast.key = key;
    lag(m).dispatchEvent(tast);
  }
  assert.equal(gamleKald, 0, "Escape, Tab og styring må ikke nå gamle gamehandlers");
  m.baggrund.dispatchEvent(new Event("keydown", { bubbles: true }));
  assert.equal(gamleKald, 1, "Prøvemiljøet sender normale bubble-events videre");
  assert.equal(m.find(rod, e => e.id === "fejl-tekst").textContent.includes("Indlæsning af modul"), false, "Rå fejltekst vises ikke");
  resultat.stop();
});

Deno.test("3D-start: tabt kontekst pauser også efter vellykket import og dublerer ikke lag", async () => {
  const m = miljø();
  let kører = true, holdtInput = true;
  m.vindue.addEventListener("blur", () => { kører = false; holdtInput = false; });
  const resultat = await startSpil(script(), { ...m, importer: async () => ({}) });
  const mistet = new Event("webglcontextlost");
  Object.defineProperty(mistet, "target", { value: { tagName: "CANVAS" } });
  m.dokument.dispatchEvent(mistet);
  assert.equal(kører, false);
  assert.equal(holdtInput, false);
  assert.ok(lag(m));
  assert.equal(m.find(lag(m).shadowRoot, e => e.id === "fejl-titel").textContent, "Spillet holder en pause.");
  const første = lag(m);
  m.dokument.dispatchEvent(mistet);
  assert.equal(lag(m), første);
  assert.deepEqual(m.rækkefølge, ["blur", "overlay"]);
  resultat.stop();
});

Deno.test("3D-start: lokale fatale initfejl kan vises uden game-API eller gamle eventhandlers", async () => {
  const m = miljø();
  const resultat = await startSpil(script(), { ...m, importer: async () => ({}) });
  m.vindue.dispatchEvent(new Event("spil-3d-fejl"));
  assert.ok(lag(m));
  assert.equal(m.baggrund.inert, true);
  resultat.stop();
  const direkte = miljø();
  assert.ok(visStartfejl("start", direkte));
  const mangler = miljø();
  let kald = false;
  const afvist = await startSpil({ dataset: {} }, { ...mangler, importer: async () => { kald = true; } });
  assert.equal(afvist.klar, false);
  assert.equal(kald, false);
  assert.ok(lag(mangler));
  afvist.stop();
});

Deno.test("3D-start: andre canvas-events og afsluttede listeners viser ingen fejl", async () => {
  const m = miljø();
  const resultat = await startSpil(script(), { ...m, importer: async () => ({}) });
  m.dokument.dispatchEvent(new Event("webglcontextlost"));
  assert.equal(lag(m), null);
  resultat.stop();
  const mistet = new Event("webglcontextlost");
  Object.defineProperty(mistet, "target", { value: { tagName: "CANVAS" } });
  m.dokument.dispatchEvent(mistet);
  m.vindue.dispatchEvent(new Event("spil-3d-fejl"));
  assert.equal(lag(m), null);
});
