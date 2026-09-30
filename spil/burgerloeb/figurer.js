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

// ---------- Kæmpen for enden af banen ----------
// Et stort, venligt hoved med overskæg, en stribet mave, og kniv og gaffel i hænderne.
export function lavKæmpe() {
  const g = new THREE.Group();
  const hud = mat("#f5c19c"), brun = mat("#6b3f1d", { roughness: 0.9 }), hvid = mat("#ffffff"), sort = mat("#1d140c", { roughness: 0.3 });
  const skjorte = mat("#ffffff", { map: lærredTekstur(128, 128, (c, b, h) => {
    c.fillStyle = "#3d8bd9"; c.fillRect(0, 0, b, h);
    c.fillStyle = "#8cc0f0"; for (let x = 0; x < b; x += 32) c.fillRect(x, 0, 12, h);
  }) });
  // maven (bliver større, når han har spist meget)
  const mave = mesh(new THREE.SphereGeometry(5.4, 40, 30), skjorte, 0, 0.6, -2.4);
  g.add(mave);
  // serviet med tern under hagen
  const serviet = mesh(new THREE.PlaneGeometry(4.4, 3.2), mat("#ffffff", { side: THREE.DoubleSide, map: lærredTekstur(128, 96, (c, b, h) => {
    c.fillStyle = "#fff"; c.fillRect(0, 0, b, h);
    c.fillStyle = "#e8463a"; for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 16; x < b; x += 32) c.fillRect(x, y, 16, 16);
  }) }), 0, 1.0, 2.95);
  serviet.rotation.x = -0.35;
  g.add(serviet);
  // hovedet
  const hoved = new THREE.Group();
  hoved.position.set(0, 4.6, 0);
  g.add(hoved);
  hoved.add(mesh(new THREE.SphereGeometry(4, 48, 36), hud));
  for (const s of [-1, 1]) {
    const øre = mesh(new THREE.SphereGeometry(0.9, 16, 12), hud, s * 3.95, 0.1, -0.2); øre.scale.set(0.55, 1, 0.9); hoved.add(øre);
  }
  for (let i = 0; i < 11; i++) {                              // krøller
    const a = Math.PI * (0.12 + i * 0.076);
    hoved.add(mesh(engang("krølle", () => new THREE.SphereGeometry(1.05, 14, 10)), brun, Math.cos(a) * 3.55, Math.sin(a) * 3.55 + 0.2, -0.6 + Math.sin(i * 1.7) * 0.5));
  }
  const kinder = [];
  for (const s of [-1, 1]) {
    const k = mesh(new THREE.SphereGeometry(0.95, 16, 12), mat("#ff9e9e"), s * 2.35, -0.8, 2.85); kinder.push(k); hoved.add(k);
  }
  // øjne der følger den lille burger
  const øjne = [];
  for (const s of [-1, 1]) {
    const øje = new THREE.Group(); øje.position.set(s * 1.45, 0.9, 3.35);
    const hvide = mesh(new THREE.SphereGeometry(0.85, 24, 18), hvid); øje.add(hvide);
    const pupil = mesh(new THREE.SphereGeometry(0.42, 18, 14), sort); øje.add(pupil);
    const glimt = mesh(new THREE.SphereGeometry(0.12, 10, 8), hvid); pupil.add(glimt); glimt.position.set(-0.15, 0.18, 0.36);
    const bryn = mesh(new THREE.CapsuleGeometry(0.17, 1.1, 6, 10), brun, 0, 1.1, -0.1); bryn.rotation.z = Math.PI / 2 - s * 0.18; øje.add(bryn);
    hoved.add(øje);
    øjne.push({ øje, hvide, pupil, bryn, s });
  }
  hoved.add(mesh(new THREE.SphereGeometry(0.85, 20, 16), mat("#ee9d7e"), 0, -0.3, 4.0));   // næse
  for (const s of [-1, 1]) {                                  // overskæg
    const skæg = mesh(new THREE.SphereGeometry(1, 20, 14), brun, s * 0.95, -1.15, 3.75);
    skæg.scale.set(1.35, 0.48, 0.6); skæg.rotation.z = s * 0.28; hoved.add(skæg);
  }
  // munden: en mørk åbning med tænder og tunge, der kan åbne sig
  const mund = new THREE.Group(); mund.position.set(0, -2.05, 3.5); hoved.add(mund);
  const hul = mesh(new THREE.SphereGeometry(1, 28, 20), mat("#4a0d14", { roughness: 0.9 })); mund.add(hul);
  const tænder = mesh(new THREE.BoxGeometry(1.9, 0.3, 0.5), hvid); mund.add(tænder);
  const tunge = mesh(new THREE.SphereGeometry(1, 20, 14), mat("#ff7d8e")); mund.add(tunge);
  const smil = mesh(new THREE.TorusGeometry(1.05, 0.13, 10, 28, Math.PI), mat("#7a1c22"), 0, 0.5, 0.35);
  smil.rotation.z = Math.PI; mund.add(smil);
  // hænder med gaffel og kniv
  const hænder = [];
  const metal = mat("#c9d1dc", { metalness: 0.6, roughness: 0.3 });
  for (const s of [-1, 1]) {
    const hånd = new THREE.Group(); hånd.position.set(s * 6.2, 1.6, 1.5);
    hånd.add(mesh(new THREE.SphereGeometry(1.1, 18, 14), hud));
    hånd.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 12), metal, 0, 2.6, 0));
    if (s < 0) for (let i = -1.5; i <= 1.5; i++) hånd.add(mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), metal, i * 0.22, 5.6, 0));   // gaffel
    else { const blad = mesh(new THREE.BoxGeometry(0.75, 2.8, 0.1), metal, 0.2, 5.8, 0); hånd.add(blad); }                         // kniv
    g.add(hånd); hænder.push(hånd);
  }

  const tilstand = { åben: 0, tyg: 0, glad: 0, hop: 0 };
  // Opdatér ansigtet: munden åbner sig, øjnene kigger på målet, kinderne puster sig op
  function opdater(t, kig) {
    const å = tilstand.tyg > 0 ? 0.15 + Math.abs(Math.sin(t * 9)) * 0.35 : tilstand.åben;
    hul.scale.set(1.45 + å * 0.25, 0.06 + å * 1.25, 0.55);
    tænder.position.set(0, hul.scale.y * 0.78, 0.25); tænder.visible = å > 0.12;
    tunge.scale.set(0.95, 0.3, 0.45); tunge.position.set(0, -hul.scale.y * 0.62, 0.18); tunge.visible = å > 0.2;
    hul.visible = å > 0.04; smil.visible = !hul.visible;
    const puf = tilstand.tyg > 0 ? 1.3 + Math.sin(t * 9) * 0.08 : 1;
    kinder.forEach(k => k.scale.setScalar(puf));
    hoved.position.y = 4.6 + Math.abs(Math.sin(t * 8)) * 0.35 * tilstand.hop;
    hænder.forEach((h, i) => { h.position.y = 1.6 + Math.abs(Math.sin(t * 8 + i)) * 0.8 * Math.max(tilstand.hop, tilstand.glad * 0.5); });
    for (const ø of øjne) {
      const p = ø.øje.getWorldPosition(new THREE.Vector3()), d = kig.clone().sub(p).normalize();
      ø.pupil.position.set(d.x * 0.55, d.y * 0.55, 0.5 + Math.max(0, d.z) * 0.1);
      const blink = (t % 4.2) < 0.12 ? 0.12 : 1;
      ø.hvide.scale.set(1, blink, 1); ø.pupil.visible = blink > 0.5;
      ø.bryn.position.y = 1.1 + å * 0.35;
    }
  }
  const mundPos = () => mund.getWorldPosition(new THREE.Vector3());
  return { gruppe: g, tilstand, opdater, mundPos, mave };
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
