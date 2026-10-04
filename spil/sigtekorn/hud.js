// ===== Skærmen: sigtekorn, liv, ammunition, stilling, drab, ramt-tegn, skaderetning og pointtavle =====
// Og statistikken, der gemmes på computeren, så man kan se, at man bliver bedre.

import { SJÆLDEN } from "./katalog.js";

const $ = id => document.getElementById(id);

export class Hud {
  constructor() {
    this.ramtTid = 0; this.skader = []; this.drab = [];
    this.el = { sigte: $("sigte"), ramt: $("ramt"), liv: $("livTal"), panser: $("panserTal"), ammo: $("ammoTal"), reserve: $("ammoReserve"), våben: $("våbenNavn"),
      holdA: $("holdA"), holdB: $("holdB"), ur: $("ur"), drab: $("drab"), retning: $("skadeRetning"), besked: $("besked"), tavle: $("tavle"), død: $("død"),
      kikkert: $("kikkert"), prik: $("prik"), fart: $("fart"), fremskridt: $("fremskridt"), bombeIkon: $("bombeIkon"), rød: $("rødKant"), granater: $("granatBoks"), blænd: $("blænd") };
    this.blændStyrke = 0; this.blændTid = 0; this.granatTekst = null;
  }
  // Sigtekornet: afstanden mellem stregerne vokser med unøjagtigheden (u i radianer), så man kan se, hvornår man rammer
  sigte(u, fov, højde, synlig) {
    const px = Math.max(3, Math.min(120, Math.tan(u) / Math.tan(fov / 2) * højde / 2));
    this.el.sigte.style.setProperty("--hul", `${px.toFixed(1)}px`);
    this.el.sigte.style.display = synlig ? "" : "none";
  }
  liv(liv, panser) {
    this.el.liv.textContent = Math.max(0, liv); this.el.panser.textContent = Math.max(0, panser);
    $("livBoks").classList.toggle("lavt", liv <= 25);
    $("livBjælke").style.width = `${Math.max(0, Math.min(100, liv))}%`; $("panserBjælke").style.width = `${Math.max(0, Math.min(100, panser))}%`;
  }
  ammo(v, ekstra = "") {                                            // ekstra: fx "5/17" i våbenræs
    this.el.våben.textContent = ekstra ? `${v.d.navn} · ${ekstra}` : v.d.navn; this.el.våben.style.color = SJÆLDEN[v.d.sjælden]?.farve || "";
    const intet = v.d.nærkamp || v.d.klasse === "ingen";
    this.el.ammo.textContent = intet ? "" : v.genlader > 0 ? "…" : v.d.granat ? `${v.d.ikon} ${v.skud}` : v.skud;
    this.el.reserve.textContent = intet || v.d.granat ? "" : v.d.opspin && v.spin < v.d.opspin && v.spin > 0 ? "snurrer…" : `/ ${v.reserve}`;
    this.el.ammo.classList.toggle("lavt", !intet && v.skud <= Math.ceil(v.d.magasin * 0.2));
  }
  stilling(a, b, sekunder) {
    this.el.holdA.textContent = a; this.el.holdB.textContent = b;
    const s = Math.max(0, Math.ceil(sekunder)); this.el.ur.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  // Et kryds midt på skærmen, når man rammer (rødt ved hovedskud)
  ramt(hoved, dræbt) {
    this.el.ramt.className = "vis" + (hoved ? " hoved" : "") + (dræbt ? " dræbt" : "");
    this.ramtTid = dræbt ? 0.35 : 0.18;
  }
  // En rød bue i kanten af skærmen, der peger mod den, der skød (vinkel i radianer i forhold til, hvor man kigger)
  skadeFra(vinkel) {
    const d = document.createElement("i"); d.style.setProperty("--v", `${(-vinkel * 180 / Math.PI).toFixed(0)}deg`);
    this.el.retning.appendChild(d); setTimeout(() => d.remove(), 1200);
    this.el.rød.classList.remove("vis"); void this.el.rød.offsetWidth; this.el.rød.classList.add("vis");
  }
  // Drabslisten øverst til højre
  drabLinje(drabsmand, offer, våben, hoved, egen) {
    const d = document.createElement("div"); d.className = "linje" + (egen ? " egen" : "");
    d.innerHTML = `<span class="${drabsmand.hold}">${drabsmand.navn}</span> <b>${våben}${hoved ? " ◎" : ""}</b> <span class="${offer.hold}">${offer.navn}</span>`;
    this.el.drab.prepend(d); setTimeout(() => d.remove(), 6000);
    while (this.el.drab.children.length > 6) this.el.drab.lastChild.remove();
  }
  besked(tekst, ms = 2200) {
    this.el.besked.textContent = tekst; this.el.besked.classList.add("vis");
    clearTimeout(this.beskedT); this.beskedT = setTimeout(() => this.el.besked.classList.remove("vis"), ms);
  }
  // XP: et lille tal, der svæver op ved sigtekornet
  xp(n) {
    const el = document.createElement("div"); el.className = "xp"; el.textContent = `+${n} XP`;
    document.getElementById("hud").appendChild(el); setTimeout(() => el.remove(), 1300);
  }
  død(tekst) { this.el.død.innerHTML = tekst; this.el.død.classList.toggle("skjult", !tekst); }
  // Granaterne: ikonet og hvor mange der er tilbage (den, man holder, lyser)
  granater(liste) {
    const tekst = liste.map(g => `<span class="${g.antal ? "har" : ""}${g.aktiv ? " aktiv" : ""}">${g.ikon} ${g.antal}</span>`).join("");
    if (tekst !== this.granatTekst) { this.el.granater.innerHTML = this.granatTekst = tekst; this.el.granater.classList.toggle("skjult", !tekst); }
  }
  // Blændet: skærmen bliver hvid og falmer langsomt (styrke 0..1)
  blænd(styrke) { this.blændStyrke = Math.max(this.blændStyrke, styrke); this.blændTid = 0.6 + 3.4 * styrke; this.blændStart = this.blændTid; }
  kikkert(til) { this.el.kikkert.classList.toggle("skjult", !til); }
  prik(til) { this.el.prik.classList.toggle("skjult", !til); }       // rødpunktet midt i rødpunktsigtet
  // Bomberunder: en bjælke, mens bomben lægges eller desarmeres, et ikon, når man selv har bomben, og et rødt ur
  bombe(st, spiller) {
    const f = st?.fremskridt, el = this.el.fremskridt;
    el.classList.toggle("skjult", !f);
    if (f) { el.firstElementChild.textContent = f.tekst; el.lastElementChild.style.width = `${Math.round(Math.min(1, f.andel) * 100)}%`; }
    this.el.bombeIkon.classList.toggle("skjult", !st || st.bærer !== spiller || spiller.død);
    this.el.ur.classList.toggle("bombe", !!st?.lagt);
  }
  fart(v) { this.el.fart.textContent = v == null ? "" : `${Math.round(v / 0.0254)} u/s`; }
  // Pointtavlen (hold Tab): navn, drab, dødsfald og hovedskud
  tavle(vis, kampfolk, holdNavne) {
    this.el.tavle.classList.toggle("skjult", !vis);
    if (!vis) return;
    const rækker = h => kampfolk.filter(k => k.hold === h).sort((a, b) => b.drab - a.drab)
      .map(k => `<tr class="${k.erSpiller ? "mig" : ""}${k.død ? " død" : ""}"><td>${k.navn}</td><td>${k.drab}</td><td>${k.dødsfald}</td><td>${k.drab ? Math.round(100 * k.hoveder / k.drab) : 0} %</td></tr>`).join("");
    this.el.tavle.innerHTML = ["ræve", "slanger"].map(h => `<div class="hold ${h}"><h2>${holdNavne[h]}</h2><table><tr><th>Navn</th><th>Drab</th><th>Død</th><th>Hoved</th></tr>${rækker(h)}</table></div>`).join("");
  }
  opdater(dt) {
    if (this.ramtTid > 0 && (this.ramtTid -= dt) <= 0) this.el.ramt.className = "";
    if (this.blændTid > 0) {
      this.blændTid -= dt;
      const t = Math.max(0, this.blændTid / this.blændStart);
      this.el.blænd.style.opacity = (this.blændStyrke * Math.min(1, t * 1.6)).toFixed(3);
      if (this.blændTid <= 0) { this.blændStyrke = 0; this.el.blænd.style.opacity = 0; }
    }
  }
}

// ---------- Statistikken (gemmes på computeren) ----------
const STAT = "sigtekorn-statistik";
export function læsStatistik() {
  try { return Object.assign({ drab: 0, død: 0, hoved: 0, skud: 0, træf: 0, kampe: 0, sejre: 0, bedsteStime: 0 }, JSON.parse(localStorage.getItem(STAT) || "{}")); }
  catch (_) { return { drab: 0, død: 0, hoved: 0, skud: 0, træf: 0, kampe: 0, sejre: 0, bedsteStime: 0 }; }
}
export function gemStatistik(s) { try { localStorage.setItem(STAT, JSON.stringify(s)); } catch (_) {} }
export function statistikTekst(s) {
  if (!s.drab && !s.død) return "Ingen kampe endnu — held og lykke!";
  const kd = s.død ? (s.drab / s.død).toFixed(2) : s.drab, hs = s.drab ? Math.round(100 * s.hoved / s.drab) : 0, ram = s.skud ? Math.round(100 * s.træf / s.skud) : 0;
  const træning = Object.entries(s.træning || {}).map(([k, t]) => `${k} ${t.toFixed(1).replace(".", ",")} s`).join(", ");   // rekorderne i træning
  return `${s.drab} drab · ${s.død} gange død · K/D ${kd} · ${hs} % hovedskud · ${ram} % træffere · bedste stime ${s.bedsteStime}` +
    (træning ? ` · træning: ${træning}` : "");
}
