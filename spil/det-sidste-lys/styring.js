// Hver hånd ejer sin pointer, så gå- og kamerafingre kan slippes uafhængigt.
export class FingerStyring {
  constructor() {
    this.gang = { x: 0, y: 0, id: null };
    this.kig = null;
    this.pile = new Map();
    this.taster = new Set();
  }

  begyndGå(id) {
    if (this.gang.id !== null) return false;
    this.gang.id = id;
    return true;
  }

  flytGå(id, x, y, radius = 36) {
    if (this.gang.id !== id) return false;
    const afstand = Math.hypot(x, y);
    const skala = afstand > radius ? radius / afstand : 1;
    // Et lille dødt felt gør det let at stå stille med fingeren på pinden.
    this.gang.x = afstand < 4 ? 0 : x * skala / radius;
    this.gang.y = afstand < 4 ? 0 : -y * skala / radius;
    return true;
  }

  slipGå(id) {
    if (this.gang.id !== id) return false;
    this.gang.x = 0;
    this.gang.y = 0;
    this.gang.id = null;
    return true;
  }

  begyndKig(id, x, y) {
    if (this.kig) return false;
    this.kig = { id, x, y };
    return true;
  }

  flytKig(id, x, y) {
    if (!this.kig || this.kig.id !== id) return null;
    const bevægelse = { x: x - this.kig.x, y: y - this.kig.y };
    this.kig.x = x;
    this.kig.y = y;
    return bevægelse;
  }

  slipKig(id) {
    if (!this.kig || this.kig.id !== id) return false;
    this.kig = null;
    return true;
  }

  trykPil(id, retning) {
    if (!["frem", "tilbage", "venstre", "højre"].includes(retning) || this.pile.has(id)) return false;
    this.pile.set(id, retning);
    return true;
  }

  slipPil(id) {
    this.pile.delete(id);
  }

  gårMod(retning) {
    return [...this.pile.values()].includes(retning);
  }

  trykTast(tast, gentag = false) {
    if (gentag && !this.taster.has(tast)) return false;
    this.taster.add(tast);
    return true;
  }

  nulstil() {
    this.gang.x = 0;
    this.gang.y = 0;
    this.gang.id = null;
    this.kig = null;
    this.pile.clear();
    this.taster.clear();
  }
}
