// ===== Kortet over Den uendelige verden =====
// Hver gang et stykke land (en søjle på 16 × 16) bliver lavet, husker kortet farverne ovenfra.
// Tryk på 🗺️ for at se det: hvor man har været, hjemmet 🏡, togstationer 🚉, landsbyer 🏘️, spådamer 🔮
// og en pil, der viser hvor man selv er. Træk for at flytte kortet, ＋ og － for at zoome.

const STIL = `
#kortOverlay { position: fixed; inset: 0; z-index: 40; background: #0e1a2e; display: none; touch-action: none; }
#kortOverlay.vis { display: block; }
#kortOverlay canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#kortOverlay .kort-knapper { position: absolute; right: 12px; top: 12px; display: flex; flex-direction: column; gap: 10px; }
#kortOverlay .kort-knapper button { font-size: 28px; width: 58px; height: 58px; border-radius: 14px; border: 3px solid #fff8; background: #2c3e5acc; color: #fff; }
#kortOverlay .kort-titel { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); color: #fff; font: 800 22px system-ui, sans-serif;
  background: #0008; padding: 6px 16px; border-radius: 14px; pointer-events: none; }
`;
// De mest almindelige overflader får en pæn farve (resten tager blokkens egen farve)
const PÆNE = { "Græs": 0x5fb33a, "Sne": 0xf2f6ff, "Sand": 0xe3d59d, "Vand": 0x3f7fd6, "Is": 0xbfe4ff, "Tørt græs": 0xc8a84a,
  "Mørkt græs": 0x3f7f2a, "Sten": 0x8c8c8c, "Fliser": 0xd8d8d0, "Planker": 0xb8894f, "Skinner": 0x8a6a4a, "Skinner øst-vest": 0x8a6a4a };

export class Kort {
  // s: { nøgle (localStorage), frø, BY, BLOKKE, farve(id) → 0xRRGGBB, spiller() → { x, z, yaw }, mærker(x0, z0, x1, z1) → [{ x, z, ikon }],
  //      hjem: { x, z } }
  constructor(s) {
    this.s = s;
    this.felter = new Map();                        // søjle → fire farver (2 × 2)
    this.skala = 10;                                // pixels pr. søjle
    this.midt = null;                               // hvor kortet er centreret (null = på barnet)
    this.pæn = s.BLOKKE.map((b, id) => (b ? PÆNE[b.navn] ?? s.farve(id) : 0));
    this.fast = s.BLOKKE.map(b => !!b && !b.kryds);
    this.læs();
    this.lavSkærm();
  }
  læs() {
    try {
      const g = JSON.parse(localStorage.getItem(this.s.nøgle) || "null");
      if (g && g.frø === this.s.frø) for (const [k, ...f] of g.felter) this.felter.set(k, f);
    } catch (_) {}
  }
  gem() {
    clearTimeout(this.gemTimer);
    this.gemTimer = setTimeout(() => {
      try {
        const felter = [...this.felter].slice(-40000).map(([k, f]) => [k, ...f]);
        localStorage.setItem(this.s.nøgle, JSON.stringify({ frø: this.s.frø, felter }));
      } catch (_) {}
    }, 3000);
  }
  // Et nyt stykke land er lavet: husk farven ovenfra fire steder i søjlen
  husk(cx, cz, data) {
    const k = cx + cz * 4096;
    if (this.felter.has(k)) return;
    const f = [];
    for (const [sx, sz] of [[4, 4], [12, 4], [4, 12], [12, 12]]) {
      let id = 0;
      for (let y = this.s.BY - 1; y > 0; y--) { const b = data[sx + sz * 16 + y * 256]; if (b && this.fast[b]) { id = b; break; } }
      f.push(this.pæn[id] || 0);
    }
    this.felter.set(k, f);
    this.gem();
  }

  lavSkærm() {
    const st = document.createElement("style"); st.textContent = STIL; document.head.appendChild(st);
    const o = document.createElement("div"); o.id = "kortOverlay";
    o.innerHTML = `<canvas></canvas><div class="kort-titel">🗺️ Kortet</div>
      <div class="kort-knapper"><button data-k="luk" aria-label="Luk kortet">✖️</button><button data-k="ind" aria-label="Zoom ind">＋</button>
      <button data-k="ud" aria-label="Zoom ud">－</button><button data-k="mig" aria-label="Find mig">🎯</button><button data-k="hjem" aria-label="Find hjem">🏡</button></div>`;
    document.body.appendChild(o);
    this.overlay = o; this.lærred = o.querySelector("canvas");
    o.querySelectorAll("button").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const k = b.dataset.k;
      if (k === "luk") this.luk();
      else if (k === "ind") this.skala = Math.min(40, this.skala * 1.5);
      else if (k === "ud") this.skala = Math.max(2, this.skala / 1.5);
      else if (k === "mig") this.midt = null;
      else if (k === "hjem") this.midt = { x: this.s.hjem.x, z: this.s.hjem.z };
      this.tegn();
    }));
    let træk = null;                                 // træk med fingeren for at flytte kortet
    this.lærred.addEventListener("pointerdown", e => { træk = { x: e.clientX, y: e.clientY }; if (!this.midt) { const p = this.s.spiller(); this.midt = { x: p.x, z: p.z }; } });
    this.lærred.addEventListener("pointermove", e => {
      if (!træk) return;
      this.midt.x -= (e.clientX - træk.x) / this.skala * 16; this.midt.z -= (e.clientY - træk.y) / this.skala * 16;
      træk = { x: e.clientX, y: e.clientY }; this.tegn();
    });
    for (const n of ["pointerup", "pointercancel"]) this.lærred.addEventListener(n, () => { træk = null; });
  }
  get åben() { return this.overlay.classList.contains("vis"); }
  vis() { this.overlay.classList.add("vis"); this.midt = null; this.tegn(); }
  luk() { this.overlay.classList.remove("vis"); }

  tegn() {
    const c = this.lærred, W = c.width = c.clientWidth * (window.devicePixelRatio > 1 ? 2 : 1), Hh = c.height = c.clientHeight * (window.devicePixelRatio > 1 ? 2 : 1);
    const g = c.getContext("2d"), px = W / c.clientWidth, s = this.skala * px, p = this.s.spiller(), m = this.midt || { x: p.x, z: p.z };
    const tilSkærm = (x, z) => [W / 2 + (x - m.x) / 16 * s, Hh / 2 + (z - m.z) / 16 * s];
    g.fillStyle = "#0e1a2e"; g.fillRect(0, 0, W, Hh);
    // landet, man har set
    const x0 = m.x - W / 2 / s * 16, z0 = m.z - Hh / 2 / s * 16, x1 = m.x + W / 2 / s * 16, z1 = m.z + Hh / 2 / s * 16;
    for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++) for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++) {
      const f = this.felter.get(cx + cz * 4096);
      if (!f) continue;
      const [sx, sz] = tilSkærm(cx * 16, cz * 16), h = s / 2;
      f.forEach((farve, i) => { g.fillStyle = "#" + farve.toString(16).padStart(6, "0"); g.fillRect(Math.floor(sx + (i & 1) * h), Math.floor(sz + (i >> 1) * h), Math.ceil(h) + 1, Math.ceil(h) + 1); });
    }
    // årstiderne ude ved kanten
    g.font = `800 ${Math.round(20 * px)}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    const etiket = (tekst, x, y) => { g.fillStyle = "#000a"; const b = g.measureText(tekst).width + 20 * px; g.fillRect(x - b / 2, y - 16 * px, b, 32 * px); g.fillStyle = "#fff"; g.fillText(tekst, x, y); };
    etiket("❄️ Vinter", W / 2, 70 * px); etiket("☀️ Sommer", W / 2, Hh - 30 * px);
    etiket("🌸 Forår", 70 * px, Hh / 2); etiket("🍂 Efterår", W - 150 * px, Hh / 2);
    // mærker: hjemmet, stationer, landsbyer og spådamer
    g.font = `${Math.round(26 * px)}px system-ui, sans-serif`;
    for (const mk of this.s.mærker(x0, z0, x1, z1)) {
      if (!mk.altid && !this.felter.has(Math.floor(mk.x / 16) + Math.floor(mk.z / 16) * 4096)) continue;   // kun det, man har set
      const [x, y] = tilSkærm(mk.x, mk.z);
      g.fillText(mk.ikon, x, y);
    }
    // barnet: en rød pil, der peger den vej, man kigger
    const [bx, by] = tilSkærm(p.x, p.z);
    g.save(); g.translate(bx, by); g.rotate(-p.yaw);
    g.fillStyle = "#ff3b3b"; g.strokeStyle = "#fff"; g.lineWidth = 3 * px;
    g.beginPath(); g.moveTo(0, -16 * px); g.lineTo(11 * px, 12 * px); g.lineTo(0, 6 * px); g.lineTo(-11 * px, 12 * px); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
}
