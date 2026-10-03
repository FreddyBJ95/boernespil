// ===== Skærmen: sigtekorn, liv, ammunition, stilling, drab, ramt-tegn, skaderetning og pointtavle =====
// Og statistikken, der gemmes på computeren, så man kan se, at man bliver bedre.

const $ = id => document.getElementById(id);

export class Hud {
  constructor() {
    this.ramtTid = 0; this.skader = []; this.drab = [];
    this.el = { sigte: $("sigte"), ramt: $("ramt"), liv: $("livTal"), panser: $("panserTal"), ammo: $("ammoTal"), reserve: $("ammoReserve"), våben: $("våbenNavn"),
      holdA: $("holdA"), holdB: $("holdB"), ur: $("ur"), drab: $("drab"), retning: $("skadeRetning"), besked: $("besked"), tavle: $("tavle"), død: $("død"),
      kikkert: $("kikkert"), fart: $("fart"), rød: $("rødKant") };
  }
  // Sigtekornet: afstanden mellem stregerne vokser med unøjagtigheden (u i radianer), så man kan se, hvornår man rammer
  sigte(u, fov, højde, synlig) {
    const px = Math.max(3, Math.min(120, Math.tan(u) / Math.tan(fov / 2) * højde / 2));
    this.el.sigte.style.setProperty("--hul", `${px.toFixed(1)}px`);
    this.el.sigte.style.display = synlig ? "" : "none";
  }
  liv(liv, panser) { this.el.liv.textContent = Math.max(0, liv); this.el.panser.textContent = Math.max(0, panser); this.el.liv.parentElement.classList.toggle("lavt", liv <= 25); }
  ammo(v) {
    this.el.våben.textContent = v.d.navn;
    this.el.ammo.textContent = v.d.nærkamp ? "" : v.genlader > 0 ? "…" : v.skud;
    this.el.reserve.textContent = v.d.nærkamp ? "" : `/ ${v.reserve}`;
    this.el.ammo.classList.toggle("lavt", !v.d.nærkamp && v.skud <= Math.ceil(v.d.magasin * 0.2));
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
  død(tekst) { this.el.død.innerHTML = tekst; this.el.død.classList.toggle("skjult", !tekst); }
  kikkert(til) { this.el.kikkert.classList.toggle("skjult", !til); }
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
  return `${s.drab} drab · ${s.død} gange død · K/D ${kd} · ${hs} % hovedskud · ${ram} % træffere · bedste stime ${s.bedsteStime}`;
}
