// ===== Børneværelset: hamsteren triller hen over bøger, linealer og byggeklodser =====
import * as THREE from "./three.js";
import { rundKasse, bag } from "./former.js";
import { tilf, vælg, del, pind, kGlav, std, blank, tekstur, miljø, skilt, målbånd, jordbær, husk } from "./pynt.js";
import { hamster, bamse } from "./figurer.js";

const BOGFARVER = ["#e8505b", "#3f8fe0", "#43b581", "#ffb627", "#8e6cf0", "#ff7aa8", "#20b2aa"];
const KLODSFARVER = ["#e8483f", "#ffc93c", "#3a8dde", "#4cc36a"];
const SKRIFT = 'ui-rounded, "SF Pro Rounded", "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif';
const RUM = "#f3e2cc";

// ---------- Teksturer ----------
const sideTex = () => tekstur(128, 128, (g, w, h) => {
  g.fillStyle = "#fbf3e3"; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(150,130,100,0.25)"; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
}, { gentag: false, nøgle: "bogsider" });

const forsideTex = farve => tekstur(256, 256, (g, w, h) => {
  g.fillStyle = farve; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36);
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.roundRect(52, 46, w - 104, 46, 12); g.fill();
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 26 : 58; g.lineTo(w / 2 + Math.cos(a) * r, 162 + Math.sin(a) * r); }
  g.fill();
}, { gentag: false, nøgle: "forside" + farve });

const linealTex = () => tekstur(128, 1024, (g, w, h) => {
  g.fillStyle = "#ffd23f"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#3b2f1a";
  const n = 70;
  for (let i = 1; i < n; i++) { const y = i * h / n, lang = i % 10 === 0 ? 56 : i % 5 === 0 ? 40 : 24; g.fillRect(0, y - 1.5, lang, 3); }
  g.font = `800 34px ${SKRIFT}`; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 10; i < n; i += 10) { g.save(); g.translate(86, i * h / n); g.rotate(-Math.PI / 2); g.fillText(String(i / 10), 0, 0); g.restore(); }
}, { gentag: false, nøgle: "lineal" });

const klodsTex = () => tekstur(256, 256, (g, w, h) => {
  const s = w / 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = KLODSFARVER[(i + j * 2) % 4]; g.fillRect(i * s, j * s, s, s);
    const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
    gr.addColorStop(0, "rgba(255,255,255,0.28)"); gr.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = gr; g.fillRect(i * s + 6, j * s + 6, s - 12, s - 12);
  }
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 6;
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
}, { nøgle: "klods" });

const bilbaneTex = () => tekstur(128, 256, (g, w, h) => {
  g.fillStyle = "#ff7a1a"; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0, w, h / 2);
  g.fillStyle = "#ffffff"; g.fillRect(0, 30, 7, 90); g.fillRect(w - 7, 30, 7, 90);
}, { nøgle: "bilbane" });

const egTex = () => tekstur(512, 512, (g, w, h) => {
  for (let i = 0; i < 4; i++) {
    let y = -tilf(0, 200);
    while (y < h) {
      const l = tilf(180, 320);
      g.fillStyle = "#" + new THREE.Color("#d8a466").offsetHSL(tilf(-0.01, 0.01), 0, tilf(-0.06, 0.05)).getHexString();
      g.fillRect(i * 128, y, 128, l);
      g.strokeStyle = "rgba(120,70,30,0.16)"; g.lineWidth = 2;
      for (let k = 0; k < 7; k++) { const x0 = i * 128 + tilf(8, 120); g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + tilf(-8, 8), y + l * 0.3, x0 + tilf(-8, 8), y + l * 0.7, x0 + tilf(-5, 5), y + l); g.stroke(); }
      g.fillStyle = "rgba(80,45,15,0.45)"; g.fillRect(i * 128, y, 128, 3);
      y += l;
    }
    g.fillStyle = "rgba(80,45,15,0.5)"; g.fillRect(i * 128, 0, 3, h);
  }
}, { nøgle: "eg" });

// Lyst birketræ til skrivebordet (uden brædder, så det ikke ligner gulvet)
const birkTex = () => tekstur(512, 512, (g, w, h) => {
  g.fillStyle = "#f3dcb4"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(170,120,60,0.14)"; g.lineWidth = 3;
  for (let i = 0; i < 40; i++) { const y0 = tilf(0, h); g.beginPath(); g.moveTo(0, y0); g.bezierCurveTo(w * 0.3, y0 + tilf(-14, 14), w * 0.7, y0 + tilf(-14, 14), w, y0 + tilf(-10, 10)); g.stroke(); }
}, { nøgle: "birk" });

// ---------- Materialer ----------
let M = null;
function mats() {
  if (M) return M;
  const gul = std("#ffd23f", 0.4), orange = std("#ff7a1a", 0.35);
  const klods = blank("#ffffff", { map: klodsTex(), roughness: 0.45, clearcoat: 0.3 });
  M = {
    lineal: { top: std("#ffffff", 0.4, { map: linealTex() }), side: gul, native: true, r: 0.04 },
    klods: { top: klods, side: klods, skala: 2.8, r: 0.1 },
    blyant: { top: std("#ffffff", 0.45, { map: tekstur(128, 64, (g, w, h) => { g.fillStyle = "#ffcf33"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(w * 0.32, 0, 6, h); g.fillRect(w * 0.66, 0, 6, h); }, { nøgle: "blyant" }) }), side: std("#f2b51d", 0.45), lokal: true, skala: 1.2, r: 0.12 },
    bilbane: { top: std("#ffffff", 0.35, { map: bilbaneTex() }), side: orange, lokal: true, skala: 2.2, sideSkala: 2.2, r: 0.06 },
    bilbaneRund: { top: orange, side: orange, skala: 2 },
    bord: { top: std("#ffffff", 0.4, { map: birkTex() }), side: std("#7fc8f8", 0.45), skala: 7, r: 0.12 },
    hylde: { top: std("#fbf7f0", 0.5), side: std("#efe6da", 0.5), skala: 2, r: 0.06 },
    tromme: { top: std("#fff3dc", 0.7), side: blank("#e8483f"), skala: 2 },
    kant: blank("#ff7a1a", { roughness: 0.35 }),
  };
  return M;
}
const siderMat = () => husk("bogsider", () => std("#ffffff", 0.85, { map: sideTex() }));
const farveMat = (farve, ru = 0.6) => husk("farve" + farve + ru, () => std(farve, ru));
function bogMats() {
  const farve = vælg(BOGFARVER);
  return husk("bogmats" + farve, () => ({ top: std("#ffffff", 0.6, { map: forsideTex(farve) }), side: siderMat(), bund: farveMat(farve), native: true, r: 0.06, farve }));
}

// ---------- Ting i værelset ----------
function bog(f, x, top, z, b, d, h, farve, rotY = 0) {
  const omslag = farveMat(farve), sider = siderMat();
  return del(f, rundKasse(b, h, d, Math.min(0.07, h * 0.25), 2), [sider, omslag, omslag, omslag, sider, sider], [x, top - h / 2, z], 1, [0, rotY, 0]);
}
// Bøger stablet fra gulvet op til y
function bogstabel(f, x, y, z, b, d, gulv) {
  while (y > gulv + 0.05) {
    const h = Math.min(tilf(0.45, 0.8), y - gulv);
    bog(f, x + tilf(-0.2, 0.2), y, z + tilf(-0.2, 0.2), b + tilf(-0.4, 0.4), d + tilf(-0.3, 0.3), h, vælg(BOGFARVER), tilf(-0.14, 0.14));
    y -= h;
  }
}
// Alle bogstaverne på ét stort billede, så alle klodser kan tegnes på én gang
const ABC = "ABCDEFGHIJKLMNOPRSTUVÆØÅ";
const abcMat = () => husk("abc", () => {
  const farver = ["#e8483f", "#3a8dde", "#3fb562", "#ff9f1c", "#9a5cf0", "#ff5f9e"];
  const tex = tekstur(1280, 1280, (g, w, h) => {
    const s = w / 5;
    for (let i = 0; i < 25; i++) {
      const x = (i % 5) * s, y = Math.floor(i / 5) * s, farve = farver[i % 6];
      g.fillStyle = "#f2d39f"; g.fillRect(x, y, s, s);
      g.strokeStyle = farve; g.lineWidth = 20; g.strokeRect(x + 22, y + 22, s - 44, s - 44);
      if (i < ABC.length) {
        g.fillStyle = farve; g.font = `800 170px ${SKRIFT}`; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(ABC[i], x + s / 2, y + s / 2 + 10);
      }
    }
  }, { gentag: false });
  return std("#ffffff", 0.55, { map: tex });
});
function abcKlods(f, x, y, z, s, rot = 0) {
  const geo = rundKasse(s, s, s, s * 0.08, 2), uv = geo.attributes.uv, pr = 36;   // 36 hjørner pr. side
  for (let side = 0; side < 6; side++) {
    const c = Math.floor(tilf(0, ABC.length - 0.01)), cx = c % 5, cy = Math.floor(c / 5);
    for (let v = side * pr; v < (side + 1) * pr; v++) {
      const u = Math.min(0.97, Math.max(0.03, uv.getX(v))), w = Math.min(0.97, Math.max(0.03, uv.getY(v)));
      uv.setXY(v, (cx + u) / 5, 1 - (cy + 1 - w) / 5);
    }
  }
  return del(f, geo, abcMat(), [x, y, z], 1, [0, rot, 0]);
}
function klodsSøjle(f, x, y, z, gulv) {
  const s = 1.3;
  let top = y;
  while (top - gulv > 0.3) {
    const h = Math.min(s, top - gulv);
    abcKlods(f, x, top - h / 2, z, s, tilf(-0.15, 0.15)).scale.y = h / s;
    top -= h;
  }
}
function blyant(f, p, l, farve, rot) {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...rot); f.add(g);
  const r = 0.16;
  del(g, new THREE.CylinderGeometry(r, r, l, 6), husk("blyant" + farve, () => blank(farve, { roughness: 0.35, clearcoat: 0.5 })), [0, l / 2, 0]);
  del(g, new THREE.ConeGeometry(r, 0.5, 6), farveMat("#f3c58f", 0.8), [0, l + 0.25, 0]);
  del(g, new THREE.ConeGeometry(r * 0.32, 0.16, 10), farveMat(farve, 0.5), [0, l + 0.42, 0]);
  del(g, new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.16, 14), husk("metal", () => std("#c9ccd2", 0.25, { metalness: 0.8 })), [0, -0.06, 0]);
  del(g, new THREE.CylinderGeometry(r, r, 0.22, 14), farveMat("#ff9db0", 0.7), [0, -0.24, 0]);
  return g;
}

export const vaerelse = {
  id: "vaerelse", navn: "Børneværelset", farve: "#3fa9f5", dyrNavn: "Hamsteren", emoji: "🐹",
  dyr: hamster,
  kugle: { tone: "#fff0f6", søm: "#ff6fa8" },
  lys: { farve: "#ffe7c7", styrke: 3.0, himmel: "#fff3e2", jord: "#c99a6e", hs: 0.5 },
  musik: "vaerelse",
  gulvUnder: 3.6,
  get kantMat() { return mats().kant; },

  opsæt(scene, renderer) {
    scene.background = new THREE.Color(RUM);
    scene.environment = miljø(renderer);
    scene.fog = new THREE.Fog(RUM, 45, 130);
  },
  efter(scene) {
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { if (!m.transmission && "envMapIntensity" in m) m.envMapIntensity = 0.5; }); });
  },
  materialer(stil, d, rund) {
    const m = mats();
    if (stil === "bog" || (!stil && !rund)) return bogMats();
    if (rund) return stil === "bilbane" ? m.bilbaneRund : stil === "klods" ? m.klods : m.tromme;
    return m[stil] || bogMats();
  },
  underlag: stil => stil === "lineal" || stil === "blyant" || stil === "bilbane" ? "plast" : "træ",

  // Søjler ned til gulvet under pladerne
  pynt(d) {
    const res = d.res;
    if (d.t === "plade" && (d.stil === "bog" || d.stil === "klods" || d.stil === "bord" || d.stil === "hylde")) {
      res.efter.push(() => {
        const gulv = res.gulvY, bund = d.top - (d.h ?? 0.6);
        if (bund - gulv < 0.3) return;
        const q = d.q, c = new THREE.Vector3(d.p[0], 0, d.p[2]);
        const hjørner = (ix, iz) => new THREE.Vector3(ix, 0, iz).applyQuaternion(q).add(c);
        if (d.stil === "bord") {
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = hjørner(sx * (d.b / 2 - 0.5), sz * (d.d / 2 - 0.5)); del(d.gruppe, rundKasse(0.6, bund - gulv, 0.6, 0.08, 2), std("#7fc8f8", 0.45), [p.x, (bund + gulv) / 2, p.z]); }
        } else if (d.stil === "hylde") {
          for (const sx of [-1, 1]) { const p = hjørner(sx * (d.b / 2 - 0.4), 0); del(d.gruppe, rundKasse(0.4, bund - gulv, d.d * 0.9, 0.06, 2), std("#efe6da", 0.5), [p.x, (bund + gulv) / 2, p.z]); }
        } else if (d.stil === "klods") {
          const ix = d.b / 2 - 0.75, iz = d.d / 2 - 0.75;
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = hjørner(sx * ix, sz * iz); klodsSøjle(d.gruppe, p.x, bund, p.z, gulv); }
        } else if (d.b * d.d < 30) {
          bogstabel(d.gruppe, d.p[0], bund, d.p[2], d.b * 0.9, d.d * 0.9, gulv);
        } else {
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const p = hjørner(sx * d.b / 4, sz * d.d / 4); bogstabel(d.gruppe, p.x, bund, p.z, d.b * 0.4, d.d * 0.4, gulv); }
        }
      });
    }
    if (d.t === "rund" && d.led && d.stil === "bilbane") {
      res.efter.push(() => {
        const bund = d.top - (d.h ?? 0.6), gulv = res.gulvY;
        if (bund - gulv > 0.3) del(d.gruppe, new THREE.CylinderGeometry(0.22, 0.3, bund - gulv, 14), blank("#ffd23f"), [d.p[0], (bund + gulv) / 2, d.p[2]]);
      });
    }
    // blyant-broen får en spids i den ene ende og et viskelæder i den anden
    if (d.t === "plade" && d.stil === "blyant") {
      const q = d.q, l = d.d, c = new THREE.Vector3(...d.p);
      const ende = s => new THREE.Vector3(0, -0.15, s * (l / 2 + 0.2)).applyQuaternion(q).add(c);
      const spids = del(d.gruppe, new THREE.ConeGeometry(0.62, 0.9, 6), std("#f3c58f", 0.8), ende(-1).toArray());
      spids.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
      const visk = del(d.gruppe, rundKasse(1.2, 0.3, 0.5, 0.1, 2), std("#ff9db0", 0.7), ende(1).toArray());
      visk.quaternion.copy(q);
    }
  },
  pyntFlyt() {},

  bumper() {
    const g = new THREE.Group();
    const zig = tekstur(256, 64, (c, w, h) => { c.fillStyle = "#e8483f"; c.fillRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 7; c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(i * w / 8, i % 2 ? 14 : h - 14); c.stroke(); }, { nøgle: "tromme" });
    zig.repeat.set(2, 1);
    del(g, new THREE.CylinderGeometry(0.46, 0.46, 0.7, 28), [blank("#ffffff", { map: zig }), std("#fff3dc", 0.6), std("#fff3dc", 0.6)], [0, 0.35, 0]);
    del(g, new THREE.TorusGeometry(0.46, 0.05, 8, 28), blank("#ffd23f"), [0, 0.7, 0], 1, [Math.PI / 2, 0, 0]);
    return g;
  },
  stang(l) {
    const g = new THREE.Group();
    blyant(g, [-l / 2 + 0.25, 0, 0], l - 0.75, "#3a8dde", [0, 0, -Math.PI / 2]);
    return g;
  },
  nav() { const g = new THREE.Group(); del(g, rundKasse(0.7, 0.8, 0.7, 0.12, 2), blank("#8e6cf0"), [0, 0.4, 0]); return g; },
  søjle(r, h) {
    const g = new THREE.Group();
    del(g, new THREE.CylinderGeometry(r, r * 0.92, h * 0.6, 28, 1, true), blank("#4fc3ff", { side: THREE.DoubleSide }), [0, h * 0.3, 0]);
    del(g, new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.1, 28), blank("#3aa0d8"), [0, 0.05, 0]);
    const fv = ["#e8483f", "#ffc93c", "#4cc36a", "#9a5cf0", "#ff7aa8"];
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; blyant(g, [Math.cos(a) * r * 0.45, 0.1, Math.sin(a) * r * 0.45], h * 0.75, fv[i], [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18]); }
    return g;
  },

  // Målet: et hamsterhjul og en vimpel på en blyant
  mål() {
    const g = new THREE.Group();
    const hjul = new THREE.Group(); hjul.position.set(0.4, 0, -1.4); g.add(hjul);
    const r = 1.25, dyb = 0.9, my = r + 0.35;
    const rosa = blank("#ff6fa8"), hvid = blank("#ffffff"), blå = blank("#38b6ff");
    const drej = new THREE.Group(); drej.position.y = my; hjul.add(drej);
    for (const s of [-1, 1]) del(drej, new THREE.TorusGeometry(r, 0.07, 10, 64), rosa, [0, 0, s * dyb / 2]);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; pind(drej, [Math.cos(a) * r, Math.sin(a) * r, -dyb / 2], [Math.cos(a) * r, Math.sin(a) * r, dyb / 2], 0.025, hvid, 5); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; pind(drej, [0, 0, -dyb / 2], [Math.cos(a) * r, Math.sin(a) * r, -dyb / 2], 0.035, rosa); }
    del(hjul, new THREE.CylinderGeometry(0.13, 0.13, 0.3, 16), blå, [0, my, -dyb / 2 - 0.1], 1, [Math.PI / 2, 0, 0]);
    pind(hjul, [0, my, -dyb / 2 - 0.22], [-0.95, 0.06, -dyb / 2 - 0.45], 0.07, blå);
    pind(hjul, [0, my, -dyb / 2 - 0.22], [0.95, 0.06, -dyb / 2 - 0.45], 0.07, blå);
    del(hjul, rundKasse(2.5, 0.12, 0.6, 0.04, 2), blå, [0, 0.06, -dyb / 2 - 0.45]);
    blyant(g, [-1.6, 0.3, -0.6], 3.2, "#3a8dde", [0, 0, 0]);
    const vimpel = tekstur(512, 256, (c, w, h) => {
      c.fillStyle = "#ff4d6d"; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, h / 2); c.lineTo(0, h); c.fill();
      c.fillStyle = "#fff"; c.font = `800 110px ${SKRIFT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("MÅL", w * 0.34, h / 2 + 6);
    }, { gentag: false, nøgle: "vimpel" });
    const geo = new THREE.PlaneGeometry(1.8, 0.9, 12, 1), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + 0.9) * 2.4) * 0.12);
    const v = new THREE.Mesh(geo, std("#ffffff", 0.7, { map: vimpel, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    v.position.set(-1.6 + 0.95, 3.1, -0.6); v.castShadow = true; g.add(v);
    const linje = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.4), std("#ffffff", 0.6, { map: tekstur(512, 64, (c, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? "#222" : "#fff"; c.fillRect(i * w / 16, j * h / 2, w / 16, h / 2); } }, { gentag: false, nøgle: "mållinje" }), polygonOffset: true, polygonOffsetFactor: -2 }));
    linje.rotation.x = -Math.PI / 2; linje.position.set(0, 0.02, 0.9); linje.receiveShadow = true; g.add(linje);
    return { gruppe: g, anim: (t, dt, fart = 0.6) => { drej.rotation.z -= dt * fart; v.rotation.y = Math.sin(t * 2) * 0.12; } };
  },

  flag() {
    const g = new THREE.Group();
    blyant(g, [0, 0.25, 0], 2.2, "#4cc36a", [0, 0, 0]);
    const form = new THREE.Shape(); form.moveTo(0, 0); form.lineTo(0.85, -0.27); form.lineTo(0, -0.54); form.closePath();
    const mat = blank("#ff9f1c", { side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(form), mat);
    flag.position.set(0.15, 1.5, 0); flag.castShadow = true;
    g.add(flag);
    let mål = 1.5;
    return {
      gruppe: g,
      nå() { mål = 2.4; mat.color.set("#4cd964"); },
      anim(t, dt) { flag.position.y += (mål - flag.position.y) * Math.min(1, dt * 4); flag.rotation.y = Math.sin(t * 3) * 0.25; },
    };
  },

  ting() { const g = new THREE.Group(); const j = jordbær(); j.scale.setScalar(1.5); g.add(j); return g; },
  ikon: () => { const j = jordbær(); j.rotation.set(0.15, 0.4, 0.2); return j; },

  // Gulv, tæppe, vægge, vindue og legetøj rundt om banen
  omgivelser(scene, res) {
    const g = new THREE.Group(), gy = res.gulvY;
    const c = res.grænse.getCenter(new THREE.Vector3()), str = res.grænse.getSize(new THREE.Vector3());
    const hx = str.x / 2 + 12, hz = str.z / 2 + 12;
    const gulvTex = egTex().clone(); gulvTex.needsUpdate = true; gulvTex.repeat.set(16, 16);
    const gulv = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), std("#ffffff", 0.4, { map: gulvTex }));
    gulv.rotation.x = -Math.PI / 2; gulv.position.set(c.x, gy, c.z); gulv.receiveShadow = true; g.add(gulv);
    const tæppeTex = tekstur(1024, 1024, (t, w, h) => {
      const farver = ["#ffb0c4", "#98ceff", "#ffe27a", "#a3e39b", "#cfb2ff"];
      for (let i = 10; i > 0; i--) { t.fillStyle = farver[i % farver.length]; t.beginPath(); t.arc(w / 2, h / 2, i / 10 * w / 2, 0, Math.PI * 2); t.fill(); }
    }, { gentag: false, nøgle: "tæppe" });
    const tæppe = new THREE.Mesh(new THREE.CircleGeometry(Math.max(hx, hz) * 0.75, 80), std("#ffffff", 1, { map: tæppeTex }));
    tæppe.rotation.x = -Math.PI / 2; tæppe.position.set(c.x, gy + 0.02, c.z); tæppe.receiveShadow = true; g.add(tæppe);

    const tapetTex = tekstur(256, 256, (t, w, h) => {
      t.fillStyle = "#cdeee2"; t.fillRect(0, 0, w, h);
      t.fillStyle = "rgba(255,255,255,0.75)";
      for (const [x, y] of [[64, 64], [192, 192]]) {
        t.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 22; t.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        t.fill();
      }
    }, { nøgle: "tapet" });
    tapetTex.repeat.set(12, 5);
    const væg = std("#ffffff", 0.9, { map: tapetTex });
    const lister = std("#ffffff", 0.5);
    // fire vægge
    for (const [x, z, ry, l] of [[c.x, c.z - hz, 0, hx * 2], [c.x, c.z + hz, Math.PI, hx * 2], [c.x - hx, c.z, Math.PI / 2, hz * 2], [c.x + hx, c.z, -Math.PI / 2, hz * 2]]) {
      const v = new THREE.Mesh(new THREE.PlaneGeometry(l, 26), væg);
      v.position.set(x, gy + 13, z); v.rotation.y = ry; v.receiveShadow = true; g.add(v);
      const liste = del(g, new THREE.BoxGeometry(l, 1, 0.3), lister, [x, gy + 0.5, z], 1, [0, ry, 0]);
      liste.translateZ(0.15);
    }
    // vindue i bagvæggen
    const udsigt = tekstur(512, 512, (t, w, h) => {
      const gr = t.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#6db8ff"); gr.addColorStop(1, "#d9f0ff");
      t.fillStyle = gr; t.fillRect(0, 0, w, h);
      t.fillStyle = "rgba(255,255,255,0.95)";
      for (const [x, y, s] of [[130, 160, 1], [370, 260, 1.3], [250, 400, 0.8]]) for (let i = 0; i < 5; i++) { t.beginPath(); t.arc(x + (i - 2) * 26 * s, y - (i % 2) * 14 * s, 30 * s, 0, 7); t.fill(); }
    }, { gentag: false, nøgle: "udsigt" });
    const vx = c.x - 3, vy = gy + 12, vz = c.z - hz + 0.05;
    const glas = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshBasicMaterial({ map: udsigt }));
    glas.position.set(vx, vy, vz); g.add(glas);
    for (const [x, y, b, h] of [[0, 4.1, 10.6, 0.5], [0, -4.1, 10.6, 0.5], [-5.1, 0, 0.5, 8.6], [5.1, 0, 0.5, 8.6], [0, 0, 0.3, 8], [0, 0, 10, 0.3]])
      del(g, new THREE.BoxGeometry(b, h, 0.4), lister, [vx + x, vy + y, vz + 0.2]);
    const gardin = std("#ffe08a", 0.9, { side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(3, 12, 20, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 6) * 0.25);
      geo.computeVertexNormals();
      del(g, geo, gardin, [vx + s * 6.6, vy - 0.8, vz + 0.8]);
    }
    // legetøj på gulvet, uden for banen
    const plads = () => {
      for (let n = 0; n < 30; n++) {
        const x = c.x + tilf(-hx + 3, hx - 3), z = c.z + tilf(-hz + 3, hz - 3);
        const b = res.grænse;
        if (x < b.min.x - 1.5 || x > b.max.x + 1.5 || z < b.min.z - 1.5 || z > b.max.z + 1.5) return [x, z];
      }
      return [c.x - hx + 4, c.z - hz + 4];
    };
    const bm = bamse(); bm.scale.setScalar(5.5);
    bm.position.set(c.x - hx + 5, gy, c.z - hz + 6); bm.rotation.y = 0.6; g.add(bm);
    const boldTex = tekstur(512, 256, (t, w, h) => { const fv = ["#ff5a5f", "#ffffff", "#ffc93c", "#ffffff", "#3a8dde", "#ffffff"]; for (let i = 0; i < 6; i++) { t.fillStyle = fv[i]; t.fillRect(i * w / 6, 0, w / 6 + 1, h); } }, { gentag: false, nøgle: "bold" });
    del(g, new THREE.SphereGeometry(2.4, 40, 24), blank("#ffffff", { map: boldTex, roughness: 0.3 }), [c.x + hx - 5, gy + 2.4, c.z - hz + 6], 1, [0.3, 0.6, 0.2]);
    for (let i = 0; i < 6; i++) { const [x, z] = plads(); abcKlods(g, x, gy + 0.65, z, 1.3, tilf(0, 3)); }
    const fv = ["#e8483f", "#4cc36a", "#9a5cf0", "#3a8dde", "#ffb627"];
    for (let i = 0; i < 5; i++) { const [x, z] = plads(); blyant(g, [x, gy + 0.16, z], 5, fv[i], [0, tilf(0, 6.28), Math.PI / 2]); }
    // reol med bøger ved bagvæggen
    const rx = c.x + hx - 9, rz = c.z - hz + 1.2;
    del(g, new THREE.BoxGeometry(7, 12, 2.2), std("#f4ede2", 0.6), [rx, gy + 6, rz]);
    for (let hyl = 0; hyl < 3; hyl++) {
      let x = rx - 3.1;
      while (x < rx + 3) { const b = tilf(0.35, 0.6), h = tilf(2, 2.9); del(g, new THREE.BoxGeometry(b, h, 1.6), farveMat(vælg(BOGFARVER)), [x + b / 2, gy + 1 + hyl * 3.8 + h / 2, rz + 0.4]); x += b + 0.04; }
    }
    scene.add(bag(g));
  },
};
