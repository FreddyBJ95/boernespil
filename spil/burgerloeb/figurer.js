// ===== Figurer til Burgerløbet: burgerens lag, den lille løbende burger og kæmpen for enden =====
import * as THREE from "./three.js";

// Lagene: h = hvor tykt laget er · emoji = billedet på portene
export const LAG = {
  bund:  { h: 0.34 },
  top:   { h: 0.52 },
  boef:  { h: 0.22, emoji: "🥩" },
  ost:   { h: 0.06, emoji: "🧀" },
  salat: { h: 0.09, emoji: "🥬" },
  tomat: { h: 0.1,  emoji: "🍅" },
  loeg:  { h: 0.08, emoji: "🧅" },
  agurk: { h: 0.06, emoji: "🥒" },
  bacon: { h: 0.08, emoji: "🥓" },
  aeg:   { h: 0.13, emoji: "🥚" },
};

// ---------- Små hjælpere ----------
const gemt = {};
const engang = (navn, lav) => gemt[navn] || (gemt[navn] = lav());
export const mat = (farve, ekstra = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.7, metalness: 0, ...ekstra });
const M = navn => engang("mat-" + navn, () => ({
  bolle: mat("#e39a45"), snit: mat("#f6dcaa"), sesam: mat("#fff6df"), boef: mat("#6b3a1c", { roughness: 1 }),
  ost: mat("#ffc928", { side: THREE.DoubleSide }), salat: mat("#5fc23a", { side: THREE.DoubleSide }),
  tomat: mat("#e0301e"), tomatInde: mat("#ff8a70"), loeg: mat("#f2e6ff"), agurk: mat("#3f8a2f"), agurkInde: mat("#c3e59a"),
  bacon: mat("#b8392a", { side: THREE.DoubleSide }), fedt: mat("#f7c3b0", { side: THREE.DoubleSide }), hvid: mat("#ffffff"), blomme: mat("#ffb000"),
  sko: mat("#ff3b5c"), sål: mat("#ffffff"), ben: mat("#f2b08a"),
}[navn]));
const lathe = pts => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 36);
function mesh(geo, materiale, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, materiale); m.position.set(x, y, z); return m; }
// Buler i kanten, så bøffen og ægget ikke ser helt runde ud
function knoldet(geo, styrke) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
    if (r < 0.01) continue;
    const f = 1 + styrke * (Math.sin(a * 7) + 0.6 * Math.sin(a * 13 + 1));
    p.setX(i, x * f); p.setZ(i, z * f);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------- Ét lag af burgeren. Bunden af laget er i y = 0 ----------
export function lavLag(type) {
  const g = new THREE.Group();
  switch (type) {
    case "bund":
      g.add(mesh(engang("bund", () => lathe([[0, 0], [0.6, 0], [0.66, 0.06], [0.68, 0.18], [0.64, 0.3], [0.56, 0.34], [0, 0.34]])), M("bolle")));
      g.add(mesh(engang("snit", () => new THREE.CylinderGeometry(0.57, 0.57, 0.02, 32)), M("snit"), 0, 0.335));
      break;
    case "top": {
      g.add(mesh(engang("top", () => lathe([[0, 0], [0.6, 0], [0.68, 0.06], [0.7, 0.16], [0.64, 0.3], [0.52, 0.42], [0.32, 0.5], [0, 0.53]])), M("bolle")));
      const frø = engang("frø", () => new THREE.SphereGeometry(0.035, 8, 6));
      for (let i = 0; i < 18; i++) {                            // sesamfrø på toppen
        const a = i * 2.39996, rr = 0.12 + (i % 6) * 0.08, y = 0.53 * Math.sqrt(Math.max(0, 1 - Math.pow(rr / 0.72, 2)));
        const s = mesh(frø, M("sesam"), Math.cos(a) * rr, y, Math.sin(a) * rr);
        s.scale.set(1.7, 0.6, 1); s.rotation.y = a;
        g.add(s);
      }
      break;
    }
    case "boef":
      g.add(mesh(engang("boef", () => knoldet(new THREE.CylinderGeometry(0.66, 0.64, 0.22, 36, 2), 0.035)), M("boef"), 0, 0.11));
      break;
    case "ost":
      g.add(mesh(engang("ost", () => {                        // firkantet skive med hængende hjørner
        const geo = new THREE.PlaneGeometry(1.3, 1.3, 12, 12);
        geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 4);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const d = Math.hypot(p.getX(i), p.getZ(i)); p.setY(i, -1.3 * Math.pow(Math.max(0, d - 0.6), 2)); }
        geo.computeVertexNormals();
        return geo;
      }), M("ost"), 0, 0.05));
      break;
    case "salat":
      g.add(mesh(engang("salat", () => {                      // rund og kruset i kanten
        const geo = new THREE.CircleGeometry(0.8, 72);
        geo.rotateX(-Math.PI / 2);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
          p.setY(i, 0.06 * Math.sin(a * 11) * Math.pow(r / 0.8, 2));
        }
        geo.computeVertexNormals();
        return geo;
      }), M("salat"), 0, 0.05));
      break;
    case "tomat":
      for (const x of [-0.3, 0.3]) {
        g.add(mesh(engang("tomat", () => new THREE.CylinderGeometry(0.36, 0.36, 0.09, 24)), M("tomat"), x, 0.045, 0));
        const inde = mesh(engang("tomatInde", () => new THREE.CircleGeometry(0.28, 20)), M("tomatInde"), x, 0.092, 0);
        inde.rotation.x = -Math.PI / 2; g.add(inde);
      }
      break;
    case "loeg":
      for (const [x, z] of [[-0.35, 0.1], [0.3, 0.18], [0, -0.3]]) {
        const ring = mesh(engang("loeg", () => new THREE.TorusGeometry(0.22, 0.045, 8, 24)), M("loeg"), x, 0.045, z);
        ring.rotation.x = Math.PI / 2; g.add(ring);
      }
      break;
    case "agurk":
      for (const [x, z] of [[-0.35, 0], [0.1, 0.3], [0.3, -0.25], [-0.05, -0.2]]) {
        g.add(mesh(engang("agurk", () => new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18)), M("agurk"), x, 0.025, z));
        const inde = mesh(engang("agurkInde", () => new THREE.CircleGeometry(0.16, 16)), M("agurkInde"), x, 0.052, z);
        inde.rotation.x = -Math.PI / 2; g.add(inde);
      }
      break;
    case "bacon":
      for (const z of [-0.17, 0.17]) {
        const strimmel = mesh(engang("bacon", () => {
          const geo = new THREE.PlaneGeometry(1.45, 0.28, 30, 1);
          geo.rotateX(-Math.PI / 2);
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) p.setY(i, 0.035 * Math.sin(p.getX(i) * 9));
          geo.computeVertexNormals();
          return geo;
        }), M("bacon"), 0, 0.04, z);
        g.add(strimmel);
        const fedt = mesh(engang("fedt", () => {
          const geo = new THREE.PlaneGeometry(1.45, 0.07, 30, 1);
          geo.rotateX(-Math.PI / 2);
          const p = geo.attributes.position;
          for (let i = 0; i < p.count; i++) p.setY(i, 0.035 * Math.sin(p.getX(i) * 9) + 0.004);
          return geo;
        }), M("fedt"), 0, 0.04, z);
        g.add(fedt);
      }
      break;
    case "aeg":
      g.add(mesh(engang("aeg", () => knoldet(new THREE.CylinderGeometry(0.62, 0.64, 0.05, 32), 0.05)), M("hvid"), 0, 0.025));
      g.add(mesh(engang("blomme", () => new THREE.SphereGeometry(0.24, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), M("blomme"), 0.08, 0.05, 0.05));
      break;
  }
  g.userData.h = LAG[type].h;
  g.userData.type = type;
  return g;
}

// ---------- Løberen: en bundbolle med to små ben og røde sko ----------
export function lavLøber() {
  const g = new THREE.Group();
  const bund = lavLag("bund");
  bund.position.y = 0.42;
  g.add(bund);
  const ben = [];
  for (const s of [-1, 1]) {
    const hofte = new THREE.Group();
    hofte.position.set(s * 0.26, 0.44, 0);
    hofte.add(mesh(engang("ben", () => new THREE.CylinderGeometry(0.045, 0.045, 0.34, 8)), M("ben"), 0, -0.17, 0));
    const sko = mesh(engang("sko", () => new THREE.SphereGeometry(0.13, 14, 10)), M("sko"), 0, -0.36, -0.06);
    sko.scale.set(1, 0.65, 1.55);
    const sål = mesh(engang("sål", () => new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14)), M("sål"), 0, -0.42, -0.06);
    sål.scale.set(1, 1, 1.6);
    hofte.add(sko, sål);
    g.add(hofte);
    ben.push(hofte);
  }
  const stak = new THREE.Group();                            // her lægges lagene oven på bunden
  stak.position.y = 0.42 + LAG.bund.h;
  g.add(stak);
  // en blød skygge under løberen
  const skygge = mesh(engang("skygge", () => new THREE.CircleGeometry(0.75, 24)),
    engang("skyggeMat", () => new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })), 0, 0.02, 0);
  skygge.rotation.x = -Math.PI / 2;
  g.add(skygge);
  return { gruppe: g, ben, stak, bund, skygge };
}

// ---------- Tekstur tegnet på et lærred ----------
export function lærredTekstur(b, h, tegn) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  tegn(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- Stjerner, trampoliner og power-ups på banen ----------
export function lavStjerne() {
  const geo = engang("stjerne", () => {
    const form = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.19 : 0.45, a = Math.PI / 2 + i * Math.PI / 5;
      i ? form.lineTo(Math.cos(a) * r, Math.sin(a) * r) : form.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(form, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
    g.center();
    return g;
  });
  return new THREE.Mesh(geo, engang("mat-stjerne", () => mat("#ffd23f", { emissive: "#b37400", emissiveIntensity: 0.45, metalness: 0.3, roughness: 0.3 })));
}
// En trampolin: en blå ring med rød dug. Løb hen over den, så flyver burgeren højt op.
export function lavTrampolin() {
  const g = new THREE.Group();
  const ring = mesh(engang("tramp-ring", () => new THREE.TorusGeometry(0.95, 0.13, 10, 32)), engang("mat-tramp", () => mat("#3a86ff")), 0, 0.3, 0);
  ring.rotation.x = Math.PI / 2; g.add(ring);
  const dug = mesh(engang("tramp-dug", () => new THREE.CylinderGeometry(0.9, 0.9, 0.05, 32)), engang("mat-dug", () => mat("#ffffff", { map: lærredTekstur(128, 128, (c, b) => {
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#ffd23f" : "#ff4d6d"; c.beginPath(); c.moveTo(b / 2, b / 2); c.arc(b / 2, b / 2, b / 2, i * Math.PI / 4, (i + 1) * Math.PI / 4); c.fill(); }
  }) })), 0, 0.3, 0);
  g.add(dug);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    g.add(mesh(engang("tramp-ben", () => new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8)), engang("mat-tramp", () => mat("#3a86ff")), Math.cos(a) * 0.85, 0.15, Math.sin(a) * 0.85));
  }
  g.userData.dug = dug;
  return g;
}
// Et emoji tegnet på et lærred, til skilte og ikoner over burgeren
export function emojiSprite(emoji, str = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: lærredTekstur(128, 128, (c, b) => {
    c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "100px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; c.fillText(emoji, b / 2, b / 2 + 6);
  }), transparent: true, depthWrite: false }));
  s.scale.set(str, str, 1);
  return s;
}
// En power-up: en sæbeboble med et ikon indeni (🧲 magnet eller 🛡️ skjold)
export function lavPowerup(emoji) {
  const g = new THREE.Group();
  g.add(emojiSprite(emoji, 0.85));
  g.add(new THREE.Mesh(engang("boble", () => new THREE.SphereGeometry(0.62, 24, 18)),
    engang("mat-boble", () => new THREE.MeshStandardMaterial({ color: "#bff0ff", transparent: true, opacity: 0.32, roughness: 0.05, depthWrite: false }))));
  return g;
}
// Skjoldet: en gennemsigtig boble rundt om burgeren
export function lavSkjold() {
  return new THREE.Mesh(engang("skjold", () => new THREE.SphereGeometry(1, 32, 24)),
    engang("mat-skjold", () => new THREE.MeshStandardMaterial({ color: "#9fe8ff", transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })));
}

// ---------- Hatte til burgeren. De låses op med stjerner ----------
export const HATTE = [
  { id: "ingen",    emoji: "🍔", stjerner: 0 },
  { id: "kokkehue", emoji: "🧑‍🍳", stjerner: 0 },
  { id: "fest",     emoji: "🎉", stjerner: 15 },
  { id: "krone",    emoji: "👑", stjerner: 35 },
  { id: "cowboy",   emoji: "🤠", stjerner: 60 },
  { id: "propel",   emoji: "🚁", stjerner: 90 },
  { id: "viking",   emoji: "🪖", stjerner: 130 },
];
export function lavHat(id) {
  const g = new THREE.Group();
  if (id === "kokkehue") {
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.45, 24), mat("#ffffff"), 0, 0.22, 0));
    const puf = new THREE.SphereGeometry(0.32, 16, 12);
    for (let i = 0; i < 5; i++) g.add(mesh(puf, mat("#ffffff"), Math.cos(i * 1.26) * 0.24, 0.6, Math.sin(i * 1.26) * 0.24));
    g.add(mesh(new THREE.SphereGeometry(0.36, 16, 12), mat("#ffffff"), 0, 0.75, 0));
  } else if (id === "fest") {
    const kegle = mesh(new THREE.ConeGeometry(0.38, 1.0, 24), mat("#ffffff", { map: lærredTekstur(64, 64, (c, b, h) => {
      ["#ff4d8d", "#ffd23f", "#2ec4f1", "#7ee08a"].forEach((f, i) => { c.fillStyle = f; c.fillRect(i * 16, 0, 16, h); });
    }) }), 0, 0.5, 0);
    g.add(kegle, mesh(new THREE.SphereGeometry(0.13, 12, 10), mat("#ffd23f"), 0, 1.02, 0));
    g.rotation.z = 0.15;
  } else if (id === "krone") {
    const guld = mat("#ffc928", { metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide });
    g.add(mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 28, 1, true), guld, 0, 0.15, 0));
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      g.add(mesh(new THREE.ConeGeometry(0.09, 0.3, 8), guld, Math.cos(a) * 0.44, 0.44, Math.sin(a) * 0.44));
      g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(i % 2 ? "#e8463a" : "#3a86ff"), Math.cos(a + 0.5) * 0.45, 0.15, Math.sin(a + 0.5) * 0.45));
    }
  } else if (id === "cowboy") {
    const brun = mat("#9c6232");
    g.add(mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.05, 32), brun, 0, 0.03, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.48, 24), brun, 0, 0.28, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 24), mat("#3a2414"), 0, 0.1, 0));
  } else if (id === "propel") {
    ["#e8463a", "#ffd23f", "#34c77b", "#3a86ff"].forEach((f, i) =>
      g.add(mesh(new THREE.SphereGeometry(0.46, 16, 10, i * Math.PI / 2, Math.PI / 2, 0, Math.PI / 2), mat(f))));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8), mat("#555555"), 0, 0.55, 0));
    const propel = new THREE.Group(); propel.position.y = 0.68;
    propel.add(mesh(new THREE.BoxGeometry(1.0, 0.03, 0.14), mat("#ff4d8d")), mesh(new THREE.BoxGeometry(0.14, 0.03, 1.0), mat("#2ec4f1")));
    g.add(propel); g.userData.propel = propel;
  } else if (id === "viking") {
    const metal = mat("#b8c0cc", { metalness: 0.6, roughness: 0.35 });
    g.add(mesh(new THREE.SphereGeometry(0.47, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal));
    g.add(mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.1, 24), mat("#8a5a2b"), 0, 0.04, 0));
    for (const s of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(0.11, 0.65, 12), mat("#fff2c8"), s * 0.52, 0.42, 0);
      horn.rotation.z = -s * 0.7; g.add(horn);
    }
  }
  return g;
}

// ---------- Et skilt til portene: et stort billede og tallet, fx 🧀 +3 ----------
export function lavSkilt(emoji, antal, farve) {
  return lærredTekstur(256, 128, (c, b, h) => {
    c.fillStyle = farve; c.beginPath(); c.roundRect ? c.roundRect(4, 4, b - 8, h - 8, 26) : c.rect(4, 4, b - 8, h - 8); c.fill();
    c.lineWidth = 8; c.strokeStyle = "#ffffff"; c.stroke();
    c.textAlign = "center"; c.textBaseline = "middle";
    c.font = "72px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; c.fillText(emoji, b * 0.33, h * 0.54);
    c.font = "900 64px ui-rounded, system-ui, sans-serif"; c.fillStyle = "#ffffff";
    c.lineWidth = 10; c.strokeStyle = "rgba(0,0,0,.25)"; c.strokeText("+" + antal, b * 0.72, h * 0.55); c.fillText("+" + antal, b * 0.72, h * 0.55);
  });
}
