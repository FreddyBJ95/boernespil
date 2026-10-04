// ===== Bombe: runder som i Counter-Strike =====
// Ørkenrævene (angriberne) har en bombe, som de skal lægge på plads A eller B. Sandslangerne forsvarer pladserne.
// Hver runde har man ét liv. Runden vindes:
//  · af Ørkenrævene, når bomben springer, eller når alle Sandslanger er væk
//  · af Sandslangerne, når bomben bliver desarmeret, når alle Ørkenræve er væk (før bomben er lagt),
//    eller når tiden løber ud, uden at bomben er lagt
// Første hold til 8 runder vinder kampen. Spilleren kan være på begge hold: hold E inde på en plads for at lægge bomben
// (Ørkenrævene) — eller ved bomben for at desarmere den (Sandslangerne).

import * as THREE from "./three.js";

export const RUNDER = 8;                                           // runder for at vinde
const RUNDETID = 115, BOMBETID = 40, LÆGTID = 3.2, DESARMERTID = 5, FRYS = 3, PAUSE = 4.5;

export class Bombe {
  // k: { scene, bane, verden, kampfolk(), spiller, hud, lyd, eksplosion(pos, skytte), nyRunde(), slut(runder) }
  constructor(k) {
    this.k = k;
    this.model = lavModel(); this.model.visible = false; k.scene.add(this.model);
    this.mærker = lavMærker(k.scene, k.bane.steder, k.verden);
    this.runder = { ræve: 0, slanger: 0 }; this.tilstand = "slut"; this.pause = 0;
  }
  startKamp() {
    this.runder = { ræve: 0, slanger: 0 };
    this.startRunde();
  }
  // En ny runde: alle får liv igen, en af Ørkenrævene får bomben, og holdet vælger en plads (A eller B)
  startRunde() {
    this.k.nyRunde();
    this.tilstand = "frys"; this.frys = FRYS; this.tid = RUNDETID;
    this.lagt = false; this.timer = 0; this.ligger = null; this.sted = null; this.handling = null; this.næsteBip = 0;
    const ræve = this.k.kampfolk().filter(k => k.hold === "ræve");
    this.bærer = ræve[Math.floor(Math.random() * ræve.length)] || null;
    this.mål = Math.random() < 0.5 ? "A" : "B";
    // forsvarerne deler sig mellem de to pladser
    this.k.kampfolk().filter(k => k.hold === "slanger").forEach((k, i) => { k.vagt = i % 2 ? "A" : "B"; });
    for (const k of this.k.kampfolk()) k.handling = false;
    this.roteret = false;
    this.nyePoster();
    this.model.visible = false;
    const { hud } = this.k;
    const nr = this.runder.ræve + this.runder.slanger + 1, sp = this.k.spiller;
    hud.besked(this.bærer === sp ? "💣 Du har bomben! Læg den på A eller B (hold E inde)"
      : sp.hold === "ræve" ? `Runde ${nr} — læg bomben på A eller B` : `Runde ${nr} — forsvar A og B`, 2800);
  }
  // Botterne vælger nye poster med det samme (når bomben bliver lagt eller tabt)
  nyePoster() {
    for (const b of this.k.kampfolk()) if (!b.erSpiller) { b.post = null; b.holder = false; b.vej = []; b.vejMål = null; }
  }
  get fryser() { return this.tilstand === "frys"; }
  // Hvert tick: bomben, at lægge og desarmere, og hvem der har vundet runden. brug = spilleren holder E inde
  tick(dt, brug) {
    if (this.tilstand === "slut") {
      if ((this.pause -= dt) <= 0) {
        if (Math.max(this.runder.ræve, this.runder.slanger) >= RUNDER) { this.tilstand = "færdig"; this.k.slut(this.runder); }
        else this.startRunde();
      }
      return;
    }
    if (this.tilstand === "færdig") return;
    if (this.tilstand === "frys") { if ((this.frys -= dt) <= 0) this.tilstand = "spil"; return; }
    this.tid -= dt;
    const folk = this.k.kampfolk();
    // bomben: falder, hvis bæreren dør — og samles op af den første Ørkenræv, der går hen over den
    if (this.bærer?.død) {
      this.ligger = this.bærer.a.pos.clone(); this.bærer = null; this.vis(this.ligger);
      if (!this.lagt) { this.k.hud.besked("Bomben er tabt!", 1800); this.nyePoster(); }
    }
    if (!this.bærer && !this.lagt && this.ligger) {
      const k = folk.find(k => k.hold === "ræve" && !k.død && Math.hypot(k.a.pos.x - this.ligger.x, k.a.pos.z - this.ligger.z) < 1.3);
      if (k) {
        this.bærer = k; this.ligger = null; this.model.visible = false; this.nyePoster();
        if (k === this.k.spiller) this.k.hud.besked("💣 Du samlede bomben op", 1800);
      }
    }
    this.handlinger(dt, brug, folk);
    if (this.tilstand !== "spil") return;                            // (bomben blev lige desarmeret)
    this.roter(folk);
    // bomben tikker — hurtigere og hurtigere — og springer
    if (this.lagt) {
      this.timer -= dt;
      if (this.timer <= this.næsteBip) {
        this.næsteBip = this.timer - Math.max(0.12, Math.min(1, this.timer / 12));
        this.k.lyd.bombeBip(this.ligger);
      }
      if (this.timer <= 0) {
        this.k.eksplosion(this.ligger.clone().add(new THREE.Vector3(0, 0.3, 0)), this.lægger);
        this.model.visible = false;
        return this.vinder("ræve", "💥 Bomben sprang!");
      }
    }
    const levende = h => folk.some(k => k.hold === h && !k.død);
    if (!levende("slanger")) this.vinder("ræve", "Alle Sandslangerne er væk");
    else if (!levende("ræve") && !this.lagt) this.vinder("slanger", "Alle Ørkenrævene er væk");
    else if (this.tid <= 0 && !this.lagt) this.vinder("slanger", "Tiden løb ud");
  }
  // At lægge bomben (Ørkenrævene, på en plads) og at desarmere den (Sandslangerne, ved bomben).
  // Den, der gør det, står stille — bliver man ramt, eller ser en bot en fjende, starter man forfra
  handlinger(dt, brug, folk) {
    const sp = this.k.spiller;
    let h = this.handling;
    if (h && (h.hvem.død || (h.hvem.erSpiller ? !brug : h.hvem.mål) || Math.hypot(h.hvem.a.pos.x - h.x, h.hvem.a.pos.z - h.z) > 0.6)) {
      h.hvem.handling = false; h = this.handling = null;
    }
    if (!h) {
      let hvem = null, type = null;
      if (!this.lagt && this.bærer && !this.bærer.død && this.påPlads(this.bærer.a.pos) && (this.bærer.erSpiller ? brug : !this.bærer.mål)) { hvem = this.bærer; type = "lægge"; }
      if (this.lagt) {
        const ved = k => Math.hypot(k.a.pos.x - this.ligger.x, k.a.pos.z - this.ligger.z) < 1.6;
        hvem = sp.hold === "slanger" && !sp.død && brug && ved(sp) ? sp                     // spilleren desarmerer (hold E inde)
          : folk.find(k => k.hold === "slanger" && !k.død && !k.erSpiller && !k.mål && ved(k));
        type = hvem ? "desarmere" : null;
      }
      if (hvem) { h = this.handling = { hvem, type, tid: 0, x: hvem.a.pos.x, z: hvem.a.pos.z }; hvem.handling = true; if (type === "lægge") this.k.lyd.bip(660); }
    }
    if (!h) return;
    h.tid += dt;
    const længde = h.type === "lægge" ? LÆGTID : DESARMERTID;
    if (h.tid < længde) return;
    h.hvem.handling = false; this.handling = null;
    if (h.type === "lægge") {
      this.lagt = true; this.timer = BOMBETID; this.næsteBip = BOMBETID - 1; this.lægger = h.hvem;
      this.ligger = h.hvem.a.pos.clone(); this.sted = this.påPlads(this.ligger); this.bærer = null; this.vis(this.ligger);
      this.k.lyd.bip(990);
      this.k.hud.besked(sp.hold === "slanger" ? `💣 Bomben er lagt på ${this.sted}! Find den, og hold E inde for at desarmere` : `💣 Bomben er lagt på ${this.sted}!`, 2600);
      this.nyePoster();
    } else {
      this.timer = 0; this.lagt = false; this.k.lyd.bip(520);
      this.vinder("slanger", "✂️ Bomben blev desarmeret");
    }
  }
  // Ser en forsvarer angriberne ved en plads, skynder de fleste af de andre forsvarere sig derhen (én gang pr. runde)
  roter(folk) {
    if (this.roteret || this.lagt) return;
    for (const [navn, [x, z, r]] of Object.entries(this.k.bane.steder)) {
      const set = folk.some(k => k.hold === "slanger" && !k.død && k.mål && Math.hypot(k.mål.a.pos.x - x, k.mål.a.pos.z - z) < r + 16);
      if (!set) continue;
      this.roteret = true;
      for (const k of folk) if (k.hold === "slanger" && !k.død && !k.erSpiller && k.vagt !== navn && Math.random() < 0.75) {
        k.vagt = navn; k.post = null; k.holder = false; k.vej = []; k.vejMål = null;
      }
      return;
    }
  }
  vinder(hold, grund) {
    this.runder[hold]++; this.tilstand = "slut"; this.pause = PAUSE;
    if (this.handling) { this.handling.hvem.handling = false; this.handling = null; }
    const navn = hold === "ræve" ? "Ørkenrævene" : "Sandslangerne";
    this.k.hud.besked(`${grund} — ${navn} vandt runden (${this.runder.ræve}–${this.runder.slanger})`, 3800);
    this.k.lyd.bip(hold === this.k.spiller.hold ? 1180 : 330);
  }
  // Hvilken plads er et sted på? ("A", "B" eller null)
  påPlads(p) {
    for (const [navn, [x, z, r]] of Object.entries(this.k.bane.steder)) if (Math.hypot(p.x - x, p.z - z) < r) return navn;
    return null;
  }
  vis(p) { this.model.position.set(p.x, p.y + 0.06, p.z); this.model.visible = true; }
  // En post til en bot: angriberne går mod deres plads (bæreren helt ind på den), forsvarerne vogter deres plads —
  // og når bomben er lagt, bytter de: angriberne vogter bomben, og forsvarerne går hen til den
  vælgPost(bot) {
    if (this.tilstand !== "spil" && this.tilstand !== "frys") return null;
    const steder = this.k.bane.steder, poster = this.k.bane.poster;
    const nær = (x, z, r) => { const p = poster.filter(p => Math.hypot(p[0] - x, p[1] - z) < r); return p.length ? p[Math.floor(Math.random() * p.length)] : null; };
    if (bot.hold === "ræve") {
      if (bot === this.bærer) { const [x, z] = steder[this.mål]; return [x, z, x, z - 10]; }
      if (!this.bærer && !this.lagt && this.ligger) {                 // bomben ligger på jorden: den nærmeste henter den
        const ræve = this.k.kampfolk().filter(k => k.hold === "ræve" && !k.død && !k.erSpiller);
        const nærmest = ræve.sort((a, b) => a.a.pos.distanceTo(this.ligger) - b.a.pos.distanceTo(this.ligger))[0];
        if (nærmest === bot) return [this.ligger.x, this.ligger.z, this.ligger.x, this.ligger.z - 10];
      }
      if (this.lagt) return nær(this.ligger.x, this.ligger.z, 16) || [this.ligger.x + 3, this.ligger.z, this.ligger.x, this.ligger.z];
      const [x, z, r] = steder[this.mål]; return nær(x, z, r + 14) || [x, z, x, z + 10];
    }
    if (this.lagt) return [this.ligger.x, this.ligger.z, this.ligger.x, this.ligger.z + 10];
    const [x, z, r] = steder[bot.vagt || "A"]; return nær(x, z, r + 12) || [x, z, x, z + 10];
  }
  // Til skærmen: runderne, uret (bombens ur, når den er lagt) og hvor langt man er med at lægge/desarmere
  status() {
    const h = this.handling;
    return { ræve: this.runder.ræve, slanger: this.runder.slanger, ur: this.lagt ? this.timer : this.tilstand === "frys" ? this.frys : this.tid, lagt: this.lagt,
      fremskridt: h ? { andel: h.tid / (h.type === "lægge" ? LÆGTID : DESARMERTID),
        tekst: h.hvem.erSpiller ? (h.type === "lægge" ? "Lægger bomben…" : "Desarmerer…") : h.type === "lægge" ? `${h.hvem.navn} lægger bomben` : `${h.hvem.navn} desarmerer` } : null,
      bærer: this.bærer };
  }
  // Hvert billede: lampen på bomben blinker
  tegn(nu) {
    if (!this.model.visible) return;
    const lampe = this.model.userData.lampe;
    lampe.visible = !this.lagt || (nu * (this.timer < 10 ? 5 : 1.5)) % 1 < 0.35;
  }
}

// Bomben: en olivengrøn kasse med en lille skærm, ledninger og en rød lampe
function lavModel() {
  const g = new THREE.Group(), m = (farve, ru = 0.6, me = 0.2) => new THREE.MeshStandardMaterial({ color: farve, roughness: ru, metalness: me });
  const boks = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  boks(0.34, 0.1, 0.22, m(0x4a5232, 0.8, 0.1), 0, 0.05, 0);
  boks(0.12, 0.012, 0.07, m(0x10140e, 0.3, 0.1), -0.06, 0.106, 0.03);                   // skærmen
  boks(0.1, 0.01, 0.07, m(0x2a2a28, 0.5, 0.3), 0.08, 0.105, 0.03);                      // tasterne
  for (const [z, farve] of [[-0.05, 0xc03028], [-0.07, 0x2850c0], [-0.09, 0xd8c040]]) boks(0.3, 0.012, 0.012, m(farve, 0.5, 0), 0, 0.106, z);   // ledningerne
  const lampe = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  lampe.position.set(0.13, 0.11, 0.07); g.add(lampe);
  g.userData.lampe = lampe;
  g.scale.setScalar(1.5);                                            // (lidt større end i virkeligheden, så man kan se den)
  return g;
}

// Store malede bogstaver på jorden, så man kan se, hvor plads A og B er
function lavMærker(scene, steder, verden) {
  const ud = [];
  for (const [navn, [x, z]] of Object.entries(steder || {})) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    g.strokeStyle = "rgba(230, 70, 40, 0.75)"; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "rgba(230, 70, 40, 0.8)"; g.font = "bold 170px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(navn, 128, 136);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, roughness: 1 }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, verden.gulv(x, 1.2, z) + 0.02, z); mesh.receiveShadow = true;
    mesh.visible = false; scene.add(mesh); ud.push(mesh);
  }
  return ud;
}
export function visMærker(bombe, til) { for (const m of bombe.mærker) m.visible = til; }
