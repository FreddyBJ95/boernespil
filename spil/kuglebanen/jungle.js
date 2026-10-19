// ===== Jungleøen: aben triller på svævende baner højt over et tropisk hav =====
import * as THREE from "./three.js";
import { bag } from "./former.js";
import { tilf, vælg, del, pind, kGlav, std, blank, tekstur, ternet, striber, himmel, miljø, ruJitter, sky, ballon, målbånd, skilt, banan, bananKlase, husk } from "./pynt.js";
import { abe } from "./figurer.js";

const H = { top: "#1f74dc", horisont: "#a6dbf7", bund: "#5fc6e4" };

// ---------- Teksturer ----------
function plankeTex(farve) {
  return tekstur(256, 256, (g, w, h) => {
    const base = new THREE.Color(farve);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = "#" + base.clone().offsetHSL(0, 0, tilf(-0.06, 0.05)).getHexString();
      g.fillRect(i * 64, 0, 64, h);
      g.strokeStyle = "rgba(70,35,10,0.2)"; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const x0 = i * 64 + tilf(6, 58);
        g.beginPath(); g.moveTo(x0, 0); g.bezierCurveTo(x0 + tilf(-6, 6), h * 0.3, x0 + tilf(-6, 6), h * 0.7, x0 + tilf(-4, 4), h); g.stroke();
      }
      g.fillStyle = "rgba(40,20,5,0.55)"; g.fillRect(i * 64, 0, 3, h);
    }
    g.fillStyle = "rgba(255,230,160,0.35)"; g.fillRect(0, 0, w, 10);
  });
}
// Brædder på tværs af broen
function brætTex() {
  return tekstur(256, 256, (g, w, h) => {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = "#" + new THREE.Color("#c98d50").offsetHSL(0, 0, tilf(-0.07, 0.05)).getHexString();
      g.fillRect(0, i * 64, w, 64);
      g.strokeStyle = "rgba(90,45,15,0.22)"; g.lineWidth = 2;
      for (let k = 0; k < 5; k++) { const y0 = i * 64 + tilf(8, 56); g.beginPath(); g.moveTo(0, y0); g.bezierCurveTo(w * 0.3, y0 + tilf(-5, 5), w * 0.7, y0 + tilf(-5, 5), w, y0 + tilf(-4, 4)); g.stroke(); }
      g.fillStyle = "rgba(40,20,5,0.6)"; g.fillRect(0, i * 64, w, 5);
      g.fillStyle = "#5a5a5a"; for (const x of [22, w - 22]) { g.beginPath(); g.arc(x, i * 64 + 32, 5, 0, 7); g.fill(); }
    }
  });
}
// Tømmerstammer til flåderne
function flådeTex() {
  return tekstur(256, 256, (g, w, h) => {
    for (let i = 0; i < 5; i++) {
      const y = i * h / 5, gr = g.createLinearGradient(0, y, 0, y + h / 5);
      gr.addColorStop(0, "#6b4120"); gr.addColorStop(0.3, "#b77a40"); gr.addColorStop(0.7, "#a86d36"); gr.addColorStop(1, "#5a3518");
      g.fillStyle = gr; g.fillRect(0, y, w, h / 5);
    }
    g.strokeStyle = "rgba(60,30,10,0.3)"; g.lineWidth = 3;
    for (const x of [30, w - 30]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  });
}
function stammeTex() {
  return tekstur(64, 64, (g, w, h) => {
    g.fillStyle = "#9b6a3a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#6f4724"; g.fillRect(0, 0, 12, h);
    g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(14, 0, 8, h);
  });
}

// ---------- Pynt ----------
function bladGeo(l, b) {
  const g = new THREE.PlaneGeometry(1, 1, 10, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getX(i) + 0.5, s = p.getY(i);
    const w = Math.sin(Math.PI * Math.min(1, t * 1.04 + 0.03)) * b;
    p.setXYZ(i, t * l, -t * t * l * 0.5 + Math.abs(s) * w * 0.6, s * w * 2);
  }
  g.computeVertexNormals();
  return g;
}
let _palmeM;
function palme(f, x, y, z, h = 4, hæld = 0.35, rot = 0) {
  _palmeM ||= { stamme: std("#ffffff", 0.9, { map: (() => { const t = stammeTex(); t.repeat.set(12, 1); return t; })() }), blade: [std("#38a137", 0.6, { side: THREE.DoubleSide }), std("#5cc246", 0.6, { side: THREE.DoubleSide })], nød: std("#6b4424", 0.6) };
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; f.add(g);
  const pkt = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; pkt.push(new THREE.Vector3(t * t * hæld * h, t * h, 0)); }
  const kurve = new THREE.CatmullRomCurve3(pkt);
  del(g, new THREE.TubeGeometry(kurve, 16, h * 0.04, 8), _palmeM.stamme);
  const top = kurve.getPoint(1);
  for (let i = 0; i < 8; i++) {
    const b = del(g, bladGeo(h * 0.5, h * 0.11), _palmeM.blade[i % 2], [top.x, top.y, top.z], 1, [0, i / 8 * Math.PI * 2 + tilf(0, 0.3), tilf(0.1, 0.5)]);
    b.receiveShadow = false;
  }
  for (let i = 0; i < 3; i++) del(g, kGlav, _palmeM.nød, [top.x + Math.cos(i * 2.1) * h * 0.045, top.y - h * 0.05, top.z + Math.sin(i * 2.1) * h * 0.045], h * 0.04);
  return g;
}

// En svævende ø: græs ovenpå, klippe der spidser til nedenunder
function flydeø(f, x, y, z, r) {
  const g = new THREE.Group(); g.position.set(x, y, z); f.add(g);
  del(g, new THREE.CylinderGeometry(r, r * 0.98, 0.5, 36), husk("j-græs", () => std("#78c652", 0.85)));
  del(g, new THREE.CylinderGeometry(r * 0.985, r * 0.93, 0.7, 36), husk("j-jord", () => std("#8a5f3a", 0.95)), [0, -0.55, 0]);
  const k = new THREE.ConeGeometry(r * 0.94, r * 1.8, 10, 4); k.rotateX(Math.PI);
  ruJitter(k, r * 0.07);
  del(g, k, husk("j-klippe", () => std("#a07a55", 0.95, { flatShading: true })), [0, -0.9 - r * 0.9, 0]);
  const n = Math.max(1, Math.round(r / 2.2));
  for (let i = 0; i < n; i++) { const a = tilf(0, 6.28), d = tilf(0, r * 0.55); palme(g, Math.cos(a) * d, 0.25, Math.sin(a) * d, tilf(3, 4.4), tilf(0.2, 0.5), tilf(0, 6.28)); }
  const busk = husk("j-busk", () => [std("#3f9c35", 0.9), std("#4fb03d", 0.9), std("#2f8a2c", 0.9)]);
  for (let i = 0; i < r * 1.4; i++) {
    const a = tilf(0, 6.28), d = tilf(r * 0.35, r * 0.85), s = tilf(0.45, 0.95);
    del(g, kGlav, vælg(busk), [Math.cos(a) * d, 0.3 + s * 0.3, Math.sin(a) * d], [s * 1.2, s * 0.85, s * 1.2]);
  }
  return g;
}

function småø(f, x, y, z, s) {
  del(f, kGlav, husk("j-sand", () => std("#f3df9f", 0.9)), [x, y - s * 0.1, z], [s, s * 0.22, s * 0.8]);
  const lav = new THREE.Mesh(new THREE.CircleGeometry(s * 1.6, 40), husk("j-lavt", () => std("#7ff0e2", 0.3, { transparent: true, opacity: 0.6 })));
  lav.rotation.x = -Math.PI / 2; lav.scale.set(1, 0.8, 1); lav.position.set(x, y + 0.05, z); f.add(lav);
  del(f, kGlav, husk("j-bakke", () => std("#4fa63f", 0.9)), [x + s * 0.15, y + s * 0.05, z], [s * 0.55, s * 0.35, s * 0.45]);
  palme(f, x - s * 0.35, y + s * 0.1, z + s * 0.15, s * 0.5, 0.4, tilf(0, 6));
}

let M = null;
function mats() {
  if (M) return M;
  const træSide = std("#ffffff", 0.8, { map: plankeTex("#c4813f") });
  const græsTop = std("#ffffff", 0.5, { map: ternet("#a3e04e", "#7cc834") });
  M = {
    græs: { top: græsTop, side: træSide, bund: std("#7a4d26", 0.9), skala: 2 },
    ø: { top: græsTop, side: std("#8a5f3a", 0.9), skala: 2 },
    træ: { top: std("#ffffff", 0.75, { map: brætTex() }), side: std("#9a6232", 0.8), bund: std("#6b4423", 0.9), lokal: true, skala: 2, sideSkala: 2, r: 0.08 },
    flåde: { top: std("#ffffff", 0.8, { map: flådeTex() }), side: std("#8a5a30", 0.85), lokal: true, skala: 3, r: 0.12 },
    top: { top: std("#ffffff", 0.55, { map: ternet("#ffd166", "#ffbf3c", "rgba(120,70,0,0.2)") }), side: std("#9a8a78", 0.9, { flatShading: true }), skala: 2 },
  };
  return M;
}

export const jungle = {
  id: "jungle", navn: "Jungleøen", farve: "#ff9f1c", dyrNavn: "Aben", emoji: "🐵",
  dyr: abe,
  kugle: { tone: "#eaf7ff", søm: "#38a3ff" },
  lys: { farve: "#fff1d6", styrke: 3.1, himmel: "#d6edff", jord: "#5a8a46", hs: 0.75 },
  musik: "jungle",
  get kantMat() { return mats().kant ||= std("#a86b3a", 0.7); },

  opsæt(scene, renderer) {
    himmel(scene, H);
    scene.environment = miljø(renderer, H);
    scene.fog = new THREE.Fog(H.horisont, 70, 430);
    scene.background = new THREE.Color(H.horisont);
  },
  materialer(stil, d, rund) {
    const m = mats();
    if (m[stil]) return m[stil];
    return rund ? m.ø : m.græs;
  },
  underlag: stil => stil === "træ" || stil === "flåde" ? "træ" : "græs",

  // Klippe under de runde øer
  pynt(d) {
    if (d.t !== "rund" || d.led) return;
    const k = new THREE.ConeGeometry(d.r * 0.92, d.r * 1.5, 10, 4); k.rotateX(Math.PI);
    ruJitter(k, d.r * 0.06);
    del(d.gruppe, k, mats().rock ||= std("#a07a55", 0.95, { flatShading: true }), [d.p[0], d.top - (d.h ?? 0.6) - d.r * 0.75 + 0.02, d.p[2]]);
  },

  bumper() {
    const g = new THREE.Group();
    const tex = tekstur(64, 256, (c, w, h) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#ffffff" : "#ff3b3b"; c.fillRect(0, i * h / 6, w, h / 6); } }, { nøgle: "bumperJ" });
    del(g, new THREE.CylinderGeometry(0.44, 0.5, 0.75, 32), blank("#ffffff", { map: tex }), [0, 0.375, 0]);
    del(g, new THREE.SphereGeometry(0.44, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), blank("#ffe14d"), [0, 0.75, 0]);
    return g;
  },

  // Målport: stribet bue med skilt, målbånd og balloner
  mål() {
    const g = new THREE.Group(), r = 1.5;
    const tex = striber(["#ffffff", "#ff5a3c"], 256, 64, 0); tex.repeat.set(5, 1);
    del(g, new THREE.TorusGeometry(r, 0.13, 16, 64, Math.PI), blank("#ffffff", { map: tex }));
    for (const sx of [-r, r]) del(g, new THREE.CylinderGeometry(0.24, 0.3, 0.16, 24), blank("#2f6fd6"), [sx, 0.08, 0]);
    skilt(g, "MÅL", "#ff5a3c", 2.0, 0.66, [0, r + 0.22, 0]);
    målbånd(g, 2 * r - 0.1, 0.7);
    const balloner = new THREE.Group(); g.add(balloner);
    ballon(balloner, [-1.9, 3.1, -0.1], "#ff4f8b", [-1.5, 0.2, 0]);
    ballon(balloner, [-1.3, 3.6, 0.2], "#ffd23f", [-1.5, 0.2, 0]);
    ballon(balloner, [1.9, 3.3, 0.1], "#3fb6ff", [1.5, 0.2, 0]);
    ballon(balloner, [1.3, 3.8, -0.2], "#7ed957", [1.5, 0.2, 0]);
    return { gruppe: g, anim: t => { balloner.position.y = Math.sin(t * 1.6) * 0.06; balloner.rotation.z = Math.sin(t * 1.1) * 0.02; } };
  },

  // Et flag: her starter man igen, hvis man falder
  flag() {
    const g = new THREE.Group();
    pind(g, [0, 0, 0], [0, 2.4, 0], 0.05, blank("#ffffff"));
    del(g, kGlav, blank("#ffd23f"), [0, 2.45, 0], 0.09);
    del(g, new THREE.CylinderGeometry(0.22, 0.26, 0.12, 20), blank("#7a4d26"), [0, 0.06, 0]);
    const form = new THREE.Shape(); form.moveTo(0, 0); form.lineTo(0.9, -0.28); form.lineTo(0, -0.56); form.closePath();
    const mat = blank("#ff9f1c", { side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(form), mat);
    flag.position.set(0.04, 1.6, 0); flag.castShadow = true;
    g.add(flag);
    let mål = 1.6;
    return {
      gruppe: g,
      nå() { mål = 2.35; mat.color.set("#4cd964"); },
      anim(t, dt) { flag.position.y += (mål - flag.position.y) * Math.min(1, dt * 4); flag.rotation.y = Math.sin(t * 3) * 0.25; },
    };
  },

  ting(i) {
    const g = new THREE.Group();
    const b = i % 5 === 4 ? bananKlase() : banan();
    if (i % 5 === 4) b.scale.setScalar(1.3); else b.rotation.z = 0.5;
    g.add(b);
    return g;
  },
  ikon: () => { const b = banan(); b.rotation.z = 0.5; return b; },

  // Et grønt bjerg under målet på Bjergtoppen
  særlig(def, res) {
    if (!def.bjerg) return;
    const [x, z, y] = def.bjerg;
    const k = new THREE.CylinderGeometry(3.3, 6.2, 11, 14, 5); k.translate(0, -5.5, 0);
    ruJitter(k, 0.25);
    del(res.stille, k, std("#9a8a78", 0.95, { flatShading: true }), [x, y - 1.1, z]);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, r = tilf(4.2, 5.4); del(res.stille, kGlav, std(vælg(["#3f9c35", "#4fb03d", "#2f8a2c"]), 0.9), [x + Math.cos(a) * r, y - tilf(5, 9), z + Math.sin(a) * r], tilf(0.7, 1.2)); }
  },

  // Svævende øer, skyer og havet langt nede
  omgivelser(scene, res) {
    const g = new THREE.Group();
    const c = res.grænse.getCenter(new THREE.Vector3()), str = res.grænse.getSize(new THREE.Vector3());
    const rad = Math.max(str.x, str.z) / 2 + 10, y0 = res.minY;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + tilf(0, 0.6), d = rad + tilf(4, 22);
      flydeø(g, c.x + Math.cos(a) * d, y0 - tilf(3, 12), c.z + Math.sin(a) * d, tilf(3.5, 7));
    }
    for (let i = 0; i < 10; i++) {
      const a = tilf(0, 6.28), d = rad + tilf(-4, 30);
      sky(g, c.x + Math.cos(a) * d, y0 - tilf(6, 18), c.z + Math.sin(a) * d, tilf(1.4, 3));
    }
    for (let i = 0; i < 6; i++) { const a = tilf(0, 6.28), d = tilf(140, 260); sky(g, c.x + Math.cos(a) * d, y0 + tilf(15, 40), c.z + Math.sin(a) * d, tilf(5, 8)); }
    const hav = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), std("#16b0c6", 0.15, { envMapIntensity: 1.3 }));
    hav.rotation.x = -Math.PI / 2; hav.position.set(c.x, y0 - 45, c.z); hav.receiveShadow = false;
    g.add(hav);
    for (let i = 0; i < 6; i++) { const a = tilf(0, 6.28), d = tilf(80, 260); småø(g, c.x + Math.cos(a) * d, y0 - 45, c.z + Math.sin(a) * d, tilf(9, 18)); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    scene.add(bag(g));
  },
};
