// ===== Slikland: pandaen triller over kiks, chokolade, lagkage og vafler =====
import * as THREE from "./three.js";
import { rundKasse, bag } from "./former.js";
import { tilf, vælg, del, pind, kG, kGlav, std, blank, tekstur, striber, himmel, miljø, ruJitter, sky, skilt, målbånd, karamel, husk } from "./pynt.js";
import { panda } from "./figurer.js";

const H = { top: "#7f6cff", horisont: "#ffcbe4", bund: "#9fe6da", sol: [-0.45, 0.2, -0.85], solFarve: "#fff2cf", solStyrke: 0.7 };
const FROSTING = "#ff9fcb";
const SLIKFARVER = [["#ff4f9a", "#ffd1e6"], ["#4fc3ff", "#d6f2ff"], ["#ffd23f", "#fff4c2"], ["#7ed957", "#e2ffd2"], ["#a77bff", "#ece2ff"]];

// ---------- Teksturer ----------
const krymmelTex = (bund = FROSTING, n = 90) => tekstur(512, 512, (g, w, h) => {
  g.fillStyle = bund; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(tilf(0, w), tilf(0, h), tilf(20, 60), tilf(10, 30), tilf(0, 3), 0, 7); g.fill(); }
  const fv = ["#ffffff", "#ffd23f", "#4fc3ff", "#7ed957", "#ff5a5f", "#a77bff"];
  for (let i = 0; i < n; i++) {
    g.save(); g.translate(tilf(0, w), tilf(0, h)); g.rotate(tilf(0, 3.14));
    g.fillStyle = vælg(fv); g.beginPath(); g.roundRect(-11, -3.5, 22, 7, 3.5); g.fill(); g.restore();
  }
}, { nøgle: "krymmel" + bund + n });

const chokoTex = () => tekstur(256, 256, (g, w, h) => {
  g.fillStyle = "#4a2512"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const x = i * 128, y = j * 128, gr = g.createLinearGradient(x, y, x + 128, y + 128);
    gr.addColorStop(0, "#8a4d2a"); gr.addColorStop(1, "#5a2d15");
    g.fillStyle = gr; g.beginPath(); g.roundRect(x + 8, y + 8, 112, 112, 12); g.fill();
    g.fillStyle = "#6e3a1d"; g.beginPath(); g.roundRect(x + 22, y + 22, 84, 84, 8); g.fill();
  }
}, { nøgle: "choko" });

const lagTex = () => tekstur(256, 256, (g, w, h) => {
  const bånd = [[FROSTING, 0.14], ["#f6d39b", 0.22], ["#ffffff", 0.08], ["#ff5c8a", 0.06], ["#f6d39b", 0.22], ["#ffffff", 0.08], ["#f6d39b", 0.2]];
  let y = 0;
  for (const [f, a] of bånd) { g.fillStyle = f; g.fillRect(0, y, w, a * h + 1); y += a * h; }
  g.fillStyle = "rgba(160,110,50,0.25)";
  for (let i = 0; i < 300; i++) g.fillRect(tilf(0, w), tilf(0.14, 1) * h, 2, 2);
}, { nøgle: "lag" });

const vaffelTex = () => tekstur(256, 256, (g, w, h) => {
  g.fillStyle = "#f1c27d"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#c98f45"; g.lineWidth = 10;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
}, { nøgle: "vaffel" });
const vaffelSide = () => tekstur(64, 64, (g, w, h) => {
  g.fillStyle = "#f1c27d"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#fff3e0"; g.fillRect(0, 14, w, 8); g.fillRect(0, 40, w, 8);
}, { nøgle: "vaffelside" });

const kiksTex = () => tekstur(512, 512, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "#f2c47e"); gr.addColorStop(0.85, "#e0a45a"); gr.addColorStop(1, "#b97a35");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(150,90,30,0.25)";
  for (let i = 0; i < 500; i++) g.fillRect(tilf(0, w), tilf(0, h), 3, 3);
  for (let i = 0; i < 26; i++) {
    const a = tilf(0, 6.28), r = tilf(30, 205), x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r;
    g.fillStyle = "#3d1e0c"; g.beginPath();
    for (let k = 0; k < 9; k++) { const b = k / 9 * 6.28; g.lineTo(x + Math.cos(b) * tilf(7, 15), y + Math.sin(b) * tilf(7, 15)); }
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.arc(x - 4, y - 4, 3, 0, 7); g.fill();
  }
}, { gentag: false, nøgle: "kiks" });

const skumTex = () => tekstur(512, 512, (g, w, h) => {
  g.fillStyle = "#fff6fb"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#ffc2dd"; g.lineWidth = 26;
  g.beginPath();
  for (let a = 0; a < 6 * Math.PI; a += 0.05) { const r = a * 13; g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
  g.stroke();
}, { gentag: false, nøgle: "skum" });

const lakridsTex = () => tekstur(128, 256, (g, w, h) => {
  g.fillStyle = "#1c1418"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ff4f9a"; g.fillRect(w * 0.38, 0, w * 0.24, h);
  g.fillStyle = "rgba(255,255,255,0.08)"; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 4);
}, { nøgle: "lakrids" });

const isTex = () => tekstur(512, 512, (g, w, h) => {
  g.fillStyle = "#8fe6bd"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ffb0d2";
  for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(tilf(0, w), tilf(0, h), tilf(30, 70), tilf(20, 45), tilf(0, 3), 0, 7); g.fill(); }
  const fv = ["#ffffff", "#ff5a8a", "#ffd23f", "#4fc3ff"];
  for (let i = 0; i < 80; i++) { g.save(); g.translate(tilf(0, w), tilf(0, h)); g.rotate(tilf(0, 3.14)); g.fillStyle = vælg(fv); g.beginPath(); g.roundRect(-10, -3, 20, 6, 3); g.fill(); g.restore(); }
}, { nøgle: "is" });
const isSide = () => tekstur(64, 128, (g, w, h) => {
  const fv = ["#8fe6bd", "#ffb0d2", "#ffe9a8"];
  for (let i = 0; i < 3; i++) { g.fillStyle = fv[i]; g.fillRect(0, i * h / 3, w, h / 3 + 1); }
}, { nøgle: "isside" });

const spiralTex = farver => tekstur(256, 256, (g, w, h) => {
  const img = g.createImageData(w, h), rgb = farver.map(f => new THREE.Color(f).convertLinearToSRGB());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - w / 2, dy = y - h / 2, r = Math.hypot(dx, dy) / (w / 2);
    const k = ((Math.atan2(dy, dx) / (Math.PI * 2) * farver.length + r * 3) % farver.length + farver.length) % farver.length;
    const col = rgb[Math.floor(k)], i = (y * w + x) * 4;
    img.data[i] = col.r * 255; img.data[i + 1] = col.g * 255; img.data[i + 2] = col.b * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, { gentag: false, nøgle: "spiral" + farver.join() });

// ---------- Materialer ----------
let M = null;
function mats() {
  if (M) return M;
  const lag = std("#ffffff", 0.7, { map: lagTex() });
  M = {
    choko: { top: std("#ffffff", 0.3, { map: chokoTex() }), side: std("#4a2512", 0.35), skala: 2, r: 0.1 },
    kage: { top: std("#ffffff", 0.45, { map: krymmelTex() }), side: lag, skala: 3, sideSkala: 1.2, r: 0.12 },
    kageRund: { top: std("#fff8f2", 0.45), side: lag, skala: 3, sideSkala: 1.1 },
    vaffel: { top: std("#ffffff", 0.6, { map: vaffelTex() }), side: std("#ffffff", 0.7, { map: vaffelSide() }), skala: 1, sideSkala: 0.5, r: 0.08 },
    lakrids: { top: blank("#ffffff", { map: lakridsTex(), roughness: 0.3 }), side: blank("#1c1418", { roughness: 0.3 }), lokal: true, skala: 1.4, r: 0.12 },
    is: { top: std("#ffffff", 0.5, { map: isTex() }), side: std("#ffffff", 0.6, { map: isSide() }), skala: 4, sideSkala: 1.2, r: 0.15 },
    kiks: { top: std("#ffffff", 0.75, { map: kiksTex() }), side: std("#d99a4e", 0.85), nativeRund: true, skala: 2 },
    skum: { top: std("#ffffff", 0.9, { map: skumTex() }), side: std("#fff0f6", 0.95), nativeRund: true, skala: 2 },
    kant: blank("#ffffff", { map: (() => { const t = striber(["#ffffff", "#ff3b5c"], 256, 64, 40); t.repeat.set(3, 1); return t; })() }),
  };
  return M;
}

// ---------- Slik-ting ----------
function glasurDryp(f, d) {
  const m = blank(d.stil === "kage" && d.t === "rund" ? "#fff8f2" : FROSTING, { roughness: 0.35, clearcoat: 0.6 });
  const læg = (x, z) => { const s = tilf(0.22, 0.5); del(f, kGlav, m, [x, d.top - 0.04 - s * 0.45, z], [0.17, s, 0.17]); };
  if (d.t === "rund") {
    const n = Math.round(d.r * 9);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; læg(d.p[0] + Math.cos(a) * (d.r - 0.02), d.p[2] + Math.sin(a) * (d.r - 0.02)); }
    return;
  }
  const q = d.q, c = new THREE.Vector3(d.p[0], 0, d.p[2]);
  const lp = (x, z) => { const p = new THREE.Vector3(x, 0, z).applyQuaternion(q).add(c); læg(p.x, p.z); };
  for (let x = -d.b / 2 + 0.3; x < d.b / 2 - 0.2; x += tilf(0.45, 0.7)) { lp(x, d.d / 2 - 0.08); lp(x, -d.d / 2 + 0.08); }
  for (let z = -d.d / 2 + 0.3; z < d.d / 2 - 0.2; z += tilf(0.45, 0.7)) { lp(-d.b / 2 + 0.08, z); lp(d.b / 2 - 0.08, z); }
}

function slikstok(f, x, y, z, h, retning, tyk = 0.15) {
  const pkt = [];
  for (let i = 0; i <= 8; i++) pkt.push(new THREE.Vector3(0, i / 8 * h, 0));
  for (let i = 1; i <= 12; i++) { const a = Math.PI - i / 12 * Math.PI * 1.15; pkt.push(new THREE.Vector3(retning * (0.5 + Math.cos(a) * 0.5), h + Math.sin(a) * 0.5, 0)); }
  const tex = striber(["#ffffff", "#ff3b5c"], 256, 64, 40); tex.repeat.set(16, 1);
  del(f, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pkt), 120, tyk, 14), blank("#ffffff", { map: tex }), [x, y, z]);
  const ende = pkt[pkt.length - 1];
  del(f, kGlav, blank("#ffffff"), [x + ende.x, y + ende.y, z], tyk);
}

function slikkepind(f, x, y, z, r, h, farver) {
  pind(f, [x, y, z], [x, y + h, z], r * 0.08, husk("s-pind", () => std("#ffffff", 0.4)), 10);
  const skive = husk("s-skive" + farver.join(), () => blank("#ffffff", { map: spiralTex(farver) }));
  del(f, new THREE.CylinderGeometry(r, r, r * 0.25, 40), [husk("s-kant" + farver[0], () => blank(farver[0])), skive, skive], [x, y + h + r * 0.85, z], 1, [Math.PI / 2, 0, tilf(-0.3, 0.3)]);
}
function vingummi(f, x, y, z, s, farve) {
  del(f, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), husk("s-gummi" + farve, () => blank(farve, { roughness: 0.4, clearcoat: 0.6 })), [x, y, z], [s, s * 1.15, s]);
}
function is(f, x, y, z, s) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); f.add(g);
  const vt = vaffelTex().clone(); vt.needsUpdate = true; vt.repeat.set(4, 2);
  del(g, new THREE.ConeGeometry(0.8, 2.4, 24), std("#ffffff", 0.7, { map: vt }), [0, -1.2, 0], 1, [Math.PI, 0, 0]);
  ["#ffc1dc", "#bff3d8", "#fff2c2"].forEach((c, i) => del(g, kGlav, blank(c, { roughness: 0.5, clearcoat: 0.2 }), [tilf(-0.1, 0.1), 0.25 + i * 0.75, 0], [0.82 - i * 0.08, 0.7, 0.82 - i * 0.08]));
  del(g, kGlav, blank("#ff1f3d", { roughness: 0.15 }), [0, 2.25, 0], 0.22);
}
function cupcake(f, x, y, z, s, farve) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); f.add(g);
  const st = striber([farve, "#ffffff"], 256, 64, 0); st.repeat.set(4, 1);
  del(g, new THREE.CylinderGeometry(1.2, 0.9, 1.2, 30), std("#ffffff", 0.6, { map: st }), [0, -0.6, 0]);
  for (let i = 0; i < 4; i++) del(g, new THREE.TorusGeometry(1.15 - i * 0.28, 0.32 - i * 0.04, 12, 32), blank("#fff3f8", { roughness: 0.4 }), [0, 0.15 + i * 0.32, 0], 1, [Math.PI / 2, 0, 0]);
  del(g, kGlav, blank("#ff1f3d", { roughness: 0.15 }), [0, 1.45, 0], 0.25);
}
// En svævende slik-ø: lyserød glasur ovenpå, chokoladeklippe nedenunder
function slikø(f, x, y, z, r) {
  const g = new THREE.Group(); g.position.set(x, y, z); f.add(g);
  const glasur = vælg(["#ff9fcb", "#bfe8ff", "#fff2a8"]);
  del(g, new THREE.CylinderGeometry(r, r * 0.98, 0.5, 40), husk("s-glasur" + glasur, () => std("#ffffff", 0.5, { map: krymmelTex(glasur, 140) })));
  const k = new THREE.ConeGeometry(r * 0.95, r * 1.7, 10, 4); k.rotateX(Math.PI); ruJitter(k, r * 0.07);
  del(g, k, husk("s-klippe", () => std("#5a2d15", 0.45, { flatShading: true })), [0, -0.25 - r * 0.85, 0]);
  const n = Math.max(1, Math.round(r / 2.5));
  const sæt = [["#ff4f9a", "#ffffff", "#ffd23f", "#ffffff"], ["#4fc3ff", "#ffffff", "#a77bff", "#ffffff"], ["#7ed957", "#ffffff", "#ff5a5f", "#ffffff"]];
  for (let i = 0; i < n; i++) { const a = tilf(0, 6.28), d = tilf(0, r * 0.55); slikkepind(g, Math.cos(a) * d, 0.25, Math.sin(a) * d, tilf(0.8, 1.2), tilf(2, 3), vælg(sæt)); }
  for (let i = 0; i < r * 1.2; i++) { const a = tilf(0, 6.28), d = tilf(r * 0.3, r * 0.85); vingummi(g, Math.cos(a) * d, 0.25, Math.sin(a) * d, tilf(0.35, 0.7), vælg(["#ff5a8a", "#ffd23f", "#7ed957", "#4fc3ff", "#ff8a3d", "#a77bff"])); }
  return g;
}

export const slik = {
  id: "slik", navn: "Slikland", farve: "#ff5fa2", dyrNavn: "Pandaen", emoji: "🐼",
  dyr: panda,
  kugle: { tone: "#fff2f8", søm: "#ff5fa2" },
  lys: { farve: "#fff0dc", styrke: 3.0, himmel: "#ffe3f1", jord: "#d88ab0", hs: 0.75 },
  musik: "slik",
  get kantMat() { return mats().kant; },

  opsæt(scene, renderer) {
    himmel(scene, H);
    scene.environment = miljø(renderer, H);
    scene.fog = new THREE.Fog(H.horisont, 80, 440);
    scene.background = new THREE.Color(H.horisont);
  },
  materialer(stil, d, rund) {
    const m = mats();
    if (rund) return stil === "kage" ? m.kageRund : m[stil] && m[stil].nativeRund ? m[stil] : stil === "choko" ? m.choko : m.kiks;
    return m[stil] || m.choko;
  },
  underlag: stil => stil === "vaffel" || stil === "kiks" ? "kiks" : stil === "is" ? "is" : "slik",

  pynt(d) {
    if (d.stil === "kage") glasurDryp(d.gruppe, d);
    if (d.t === "rund" && d.stil === "kage") {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2 + 0.2, r = d.r - 0.35, px = d.p[0] + Math.cos(a) * r, pz = d.p[2] + Math.sin(a) * r;
        del(d.gruppe, kGlav, blank("#ff1f3d", { roughness: 0.15 }), [px, d.top + 0.12, pz], 0.15);
      }
    }
  },

  bumper() {
    const g = new THREE.Group(), farve = vælg(["#ff5a8a", "#ffd23f", "#7ed957", "#4fc3ff", "#a77bff"]);
    const m = blank(farve, { roughness: 0.35, clearcoat: 0.7, sheen: 1, sheenColor: new THREE.Color("#ffffff"), sheenRoughness: 0.3 });
    del(g, new THREE.CylinderGeometry(0.47, 0.5, 0.45, 28), m, [0, 0.225, 0]);
    del(g, new THREE.SphereGeometry(0.47, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), m, [0, 0.45, 0], [1, 0.9, 1]);
    return g;
  },
  ring() {
    const g = new THREE.Group();
    del(g, new THREE.TorusGeometry(1.3, 0.42, 24, 64), std("#d99a52", 0.6));
    const tex = krymmelTex("#ff7eb6", 60).clone(); tex.needsUpdate = true; tex.repeat.set(5, 1);
    del(g, new THREE.TorusGeometry(1.3, 0.42 * 1.04, 24, 64), blank("#ffffff", { map: tex, roughness: 0.3 }), [0, 0, 0.11], [1, 1, 0.74]);
    return g;
  },
  stang(l) {
    const g = new THREE.Group();
    const tex = striber(["#ffffff", "#ff3b5c"], 256, 64, 40); tex.repeat.set(Math.round(l * 2), 1);
    del(g, new THREE.CylinderGeometry(0.17, 0.17, l, 18), blank("#ffffff", { map: tex }), [0, 0, 0], 1, [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) del(g, kGlav, blank("#ff3b5c"), [s * l / 2, 0, 0], 0.17);
    return g;
  },
  nav() { const g = new THREE.Group(); del(g, new THREE.CylinderGeometry(0.32, 0.36, 0.9, 20), blank("#ff5fa2"), [0, 0.45, 0]); del(g, kGlav, blank("#ff1f3d"), [0, 1.0, 0], 0.22); return g; },

  // Målet: to slikstokke med et skilt og et bånd imellem
  mål() {
    const g = new THREE.Group();
    slikstok(g, -1.65, 0, 0, 2.5, -1);
    slikstok(g, 1.65, 0, 0, 2.5, 1);
    skilt(g, "MÅL", "#ff5fa2", 2.8, 0.8, [0, 2.35, 0.05]);
    målbånd(g, 3.2, 0.72, ["#ffffff", "#ff5fa2"]);
    const konfetti = new THREE.Group(); g.add(konfetti);
    return { gruppe: g, anim: () => {} };
  },

  flag() {
    const g = new THREE.Group();
    slikstok(g, 0, 0, 0, 2.2, 1, 0.07);
    const form = new THREE.Shape(); form.moveTo(0, 0); form.lineTo(0.85, -0.27); form.lineTo(0, -0.54); form.closePath();
    const mat = blank("#ff9f1c", { side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(form), mat);
    flag.position.set(0.06, 1.4, 0); flag.castShadow = true;
    g.add(flag);
    let mål = 1.4;
    return {
      gruppe: g,
      nå() { mål = 2.1; mat.color.set("#4cd964"); },
      anim(t, dt) { flag.position.y += (mål - flag.position.y) * Math.min(1, dt * 4); flag.rotation.y = Math.sin(t * 3) * 0.25; },
    };
  },

  ting(i) { const g = new THREE.Group(); const k = karamel(...SLIKFARVER[i % SLIKFARVER.length]); k.scale.setScalar(1.3); g.add(k); return g; },
  ikon: () => karamel(...SLIKFARVER[0]),

  // Kagetårnet: et højt, lagdelt kagetårn midt i vindeltrappen
  særlig(def, res) {
    if (!def.tårn) return;
    const [x, z, y] = def.tårn;
    const lag = std("#ffffff", 0.7, { map: lagTex() });
    for (let i = 0; i < 3; i++) {
      const r = 4.6 - i * 0.4, h = 3, top = y - 1.2 - i * h;
      del(res.stille, new THREE.CylinderGeometry(r, r, h, 48), [lag, std("#fff8f2", 0.45), std("#fff8f2", 0.45)], [x, top - h / 2, z]);
    }
  },

  omgivelser(scene, res) {
    const g = new THREE.Group();
    const c = res.grænse.getCenter(new THREE.Vector3()), str = res.grænse.getSize(new THREE.Vector3());
    const rad = Math.max(str.x, str.z) / 2 + 10, y0 = res.minY;
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + tilf(0, 0.6), d = rad + tilf(4, 22); slikø(g, c.x + Math.cos(a) * d, y0 - tilf(3, 12), c.z + Math.sin(a) * d, tilf(3.5, 6.5)); }
    for (let i = 0; i < 3; i++) { const a = tilf(0, 6.28), d = rad + tilf(6, 20); is(g, c.x + Math.cos(a) * d, y0 - tilf(0, 6), c.z + Math.sin(a) * d, tilf(1.8, 2.6)); }
    for (let i = 0; i < 3; i++) { const a = tilf(0, 6.28), d = rad + tilf(14, 34); cupcake(g, c.x + Math.cos(a) * d, y0 - tilf(2, 8), c.z + Math.sin(a) * d, tilf(2.5, 3.6), vælg(["#ffd23f", "#7fd6ff", "#ff9fcb"])); }
    const skyF = [["#ffffff", "#ffd1ea"], ["#ffd1ea", "#d6ecff"], ["#e4dcff", "#ffffff"]];
    for (let i = 0; i < 10; i++) { const a = tilf(0, 6.28), d = rad + tilf(-4, 30); sky(g, c.x + Math.cos(a) * d, y0 - tilf(6, 18), c.z + Math.sin(a) * d, tilf(1.4, 3), ...skyF[i % 3]); }
    for (let i = 0; i < 6; i++) { const a = tilf(0, 6.28), d = tilf(140, 260); sky(g, c.x + Math.cos(a) * d, y0 + tilf(15, 40), c.z + Math.sin(a) * d, tilf(5, 8), ...skyF[i % 3]); }
    const sø = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), std("#8fe3d6", 0.22, { envMapIntensity: 1.1 }));
    sø.rotation.x = -Math.PI / 2; sø.position.set(c.x, y0 - 40, c.z);
    g.add(sø);
    for (let i = 0; i < 6; i++) { const a = tilf(0, 6.28), d = tilf(90, 260); vingummi(g, c.x + Math.cos(a) * d, y0 - 40, c.z + Math.sin(a) * d, tilf(10, 20), vælg(["#ff5a8a", "#7ed957", "#ffd23f", "#4fc3ff", "#a77bff"])); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    scene.add(bag(g));
  },
};
