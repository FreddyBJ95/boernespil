// ===== Banen i Burgerløbet: et langt bord med ternet dug, ting at samle, kagerruller og porte =====
import * as THREE from "./three.js";
import { lavLag, LAG, lavSkilt, lærredTekstur, mat, lavKæmpe } from "./figurer.js";

export const BREDDE = 3.2;                        // vejen går fra -BREDDE til +BREDDE
const SPOR = [-2.1, 0, 2.1];                      // de tre spor, tingene ligger i

// Farverne skifter fra bane til bane
export const TEMAER = [
  { dug: "#e8463a", himmel: "#8fd3ff", græs: "#7cc35a" },
  { dug: "#3a86ff", himmel: "#ffc9a8", græs: "#8ac926" },
  { dug: "#34c77b", himmel: "#cdb8ff", græs: "#5fbf6a" },
  { dug: "#ff7eb6", himmel: "#a8ecff", græs: "#7fd18b" },
  { dug: "#ff9f1c", himmel: "#ffe0f0", græs: "#9bd35a" },
];

// Tilfældige tal, der er ens hver gang samme bane bygges
function rng(frø) { let s = frø % 2147483646 + 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }

// Hvilke ting ligger på banen (bøf og ost oftest)
const VÆGT = [["boef", 25], ["ost", 20], ["salat", 15], ["tomat", 12], ["bacon", 8], ["loeg", 8], ["agurk", 7], ["aeg", 5]];
function vælgType(r) {
  let x = r() * 100;
  for (const [t, v] of VÆGT) { if ((x -= v) < 0) return t; }
  return "boef";
}

export function byggBane(scene, niveau) {
  const tema = TEMAER[(niveau - 1) % TEMAER.length];
  const L = Math.min(460, 200 + niveau * 30);
  const r = rng(niveau * 7919 + 13);
  const gruppe = new THREE.Group();
  scene.add(gruppe);
  scene.background = new THREE.Color(tema.himmel);
  scene.fog = new THREE.Fog(tema.himmel, 45, 150);

  // ---------- Bordet med den ternede dug ----------
  const dug = lærredTekstur(128, 128, (c, b, h) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, b, h);
    c.fillStyle = tema.dug; c.globalAlpha = 0.9; c.fillRect(0, 0, b / 2, h / 2); c.fillRect(b / 2, h / 2, b / 2, h / 2);
    c.globalAlpha = 0.45; c.fillRect(b / 2, 0, b / 2, h / 2); c.fillRect(0, h / 2, b / 2, h / 2);
  });
  dug.wrapS = dug.wrapT = THREE.RepeatWrapping;
  dug.repeat.set(BREDDE, (L + 40) / 2);
  const bord = new THREE.Mesh(new THREE.BoxGeometry(BREDDE * 2 + 0.6, 0.5, L + 40), mat("#ffffff", { map: dug }));
  bord.position.set(0, -0.25, -L / 2 + 10);
  gruppe.add(bord);
  const kant = mat(tema.dug);
  for (const s of [-1, 1]) {                                  // dugen hænger ned over kanten
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, L + 40), kant);
    flap.position.set(s * (BREDDE + 0.34), -0.6, -L / 2 + 10);
    gruppe.add(flap);
  }
  const træ = mat("#a0662f");
  for (let z = 6; z > -L - 10; z -= 18) for (const s of [-1, 1]) {   // bordben ned til græsset
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 3, 10), træ);
    b.position.set(s * (BREDDE - 0.3), -2, z);
    gruppe.add(b);
  }
  const græs = new THREE.Mesh(new THREE.PlaneGeometry(420, L + 360), mat(tema.græs, { roughness: 1 }));
  græs.rotation.x = -Math.PI / 2; græs.position.set(0, -3.5, -L / 2);
  gruppe.add(græs);

  // ---------- Pynt i siderne: træer, flasker, pommes frites og slikkepinde ----------
  for (let z = 0; z > -L - 40; z -= 7) for (const s of [-1, 1]) {
    if (r() < 0.35) continue;
    const x = s * (7 + r() * 16), valg = r();
    gruppe.add(valg < 0.4 ? lavTræ(x, z, r) : valg < 0.6 ? lavFlaske(x, z, r) : valg < 0.8 ? lavPommes(x, z) : lavSlikkepind(x, z, r));
  }
  for (let i = 0; i < 26; i++) gruppe.add(lavSky((r() - 0.5) * 120, 14 + r() * 14, -r() * (L + 80), r));

  // ---------- Startportal ----------
  gruppe.add(lavPortal(-3, "#ffffff", "#1f1d2b"));

  // ---------- Ting at samle, kagerruller og porte ----------
  const ting = [], ruller = [], porte = [];
  const nyTing = (type, x, z) => {
    const m = lavLag(type);
    m.position.set(x, 0.9, z);
    m.scale.setScalar(1.15);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.02, z);
    gruppe.add(m, ring);
    ting.push({ type, x, z, m, ring, taget: false });
  };
  let z = -16, nr = 0;
  while (z > -L + 20) {
    nr++;
    const valg = r();
    if (nr % 8 === 0) {                                       // to porte: vælg venstre eller højre
      const a = vælgType(r); let b = vælgType(r); if (b === a) b = a === "ost" ? "boef" : "ost";
      for (const [s, type] of [[-1, a], [1, b]]) {
        const antal = 2 + Math.floor(r() * 3), port = lavPort(type, antal, s);
        port.position.set(s * 1.62, 0, z);
        gruppe.add(port);
        porte.push({ x: s, z, type, antal, m: port, taget: false });
      }
      z -= 12;
    } else if (valg < Math.min(0.42, 0.16 + niveau * 0.04) && nr > 2) {   // kagerulle på tværs af et eller to spor
      const to = r() < 0.4, bredde = to ? 4.4 : 2.4, x = to ? (r() < 0.5 ? -1.05 : 1.05) : SPOR[Math.floor(r() * 3)];
      const rulle = lavRulle(bredde);
      rulle.position.set(x, 0.34, z);
      gruppe.add(rulle);
      const bevæger = niveau >= 3 && !to && r() < 0.5;
      ruller.push({ m: rulle, x, z, bredde, bevæger, fase: r() * 6, fart: 0.8 + r() * 0.6 });
      z -= 10;
    } else if (valg < 0.72) {                                 // en række af samme slags i ét spor — måske på skrå
      const type = vælgType(r), n = 3 + Math.floor(r() * 3), start = Math.floor(r() * 3), skrå = r() < 0.4 ? (start === 0 ? 1 : -1) : 0;
      for (let i = 0; i < n; i++) nyTing(type, SPOR[Math.max(0, Math.min(2, start + (skrå ? Math.round(i * skrå * 0.5) : 0)))], z - i * 2.2);
      z -= n * 2.2 + 5;
    } else {                                                  // to eller tre ting side om side
      const huller = r() < 0.5 ? [0, 1, 2] : [Math.floor(r() * 3), Math.floor(r() * 3)];
      for (const i of new Set(huller)) nyTing(vælgType(r), SPOR[i], z);
      z -= 7;
    }
  }

  // ---------- Kæmpen for enden, og en lille rampe op mod munden ----------
  const kæmpe = lavKæmpe();
  kæmpe.gruppe.position.set(0, -0.2, -L - 7.2);
  kæmpe.gruppe.scale.setScalar(0.8);
  gruppe.add(kæmpe.gruppe);

  return { L, tema, gruppe, ting, ruller, porte, kæmpe };
}

// ---------- Byggeklodserne ----------
function lavRulle(bredde) {                     // en kagerulle af træ med håndtag
  const g = new THREE.Group(), træ = mat("#d9a466"), mørk = mat("#9c6a36");
  const krop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, bredde - 0.8, 20), træ);
  krop.rotation.z = Math.PI / 2; g.add(krop);
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 10), mørk);
    h.rotation.z = Math.PI / 2; h.position.x = s * (bredde / 2 - 0.22); g.add(h);
    const knop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mørk);
    knop.position.x = s * (bredde / 2); g.add(knop);
  }
  g.userData.krop = krop;
  return g;
}
function lavPort(type, antal, s) {               // en bue med et skilt, fx 🧀 +3
  const g = new THREE.Group(), farve = s < 0 ? "#2ec4f1" : "#b15bff";
  const stolpe = mat(farve);
  for (const x of [-1.45, 1.45]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 10), stolpe);
    p.position.set(x, 1.3, 0); g.add(p);
  }
  const skilt = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: lavSkilt(LAG[type].emoji, antal, farve), transparent: true, side: THREE.DoubleSide }));
  skilt.position.set(0, 2.7, 0); g.add(skilt);
  const gulv = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.2), new THREE.MeshBasicMaterial({ color: farve, transparent: true, opacity: 0.35, depthWrite: false }));
  gulv.rotation.x = -Math.PI / 2; gulv.position.y = 0.02; g.add(gulv);
  return g;
}
function lavPortal(z, farve1, farve2) {          // ternet banner over vejen (start og mål)
  const g = new THREE.Group();
  const tern = lærredTekstur(256, 64, (c, b, h) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? farve1 : farve2; c.fillRect(x * 32, y * 32, 32, 32); }
  });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.2, 10), mat("#ffffff"));
    p.position.set(s * (BREDDE + 0.2), 2.1, z); g.add(p);
  }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(BREDDE * 2 + 0.4, 0.9), new THREE.MeshBasicMaterial({ map: tern, side: THREE.DoubleSide }));
  banner.position.set(0, 3.9, z); g.add(banner);
  return g;
}
function lavTræ(x, z, r) {
  const g = new THREE.Group(), h = 3 + r() * 3;
  const stamme = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, h, 8), mat("#8a5a2b"));
  stamme.position.y = h / 2; g.add(stamme);
  const krone = mat(["#3fae4f", "#5cc26a", "#2e9a58"][Math.floor(r() * 3)]);
  for (let i = 0; i < 3; i++) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(1.4 + r() * 0.8, 12, 10), krone);
    k.position.set((r() - 0.5) * 1.4, h + (r() - 0.3) * 1.2, (r() - 0.5) * 1.4); g.add(k);
  }
  g.position.set(x, -3.5, z);
  return g;
}
function lavFlaske(x, z, r) {                    // kæmpe ketchup- og sennepsflasker
  const g = new THREE.Group(), farve = r() < 0.5 ? "#e0281f" : "#f2b705";
  const krop = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, 4.5, 16), mat(farve, { roughness: 0.35 }));
  krop.position.y = 2.25; g.add(krop);
  const låg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.05, 1.1, 16), mat("#ffffff"));
  låg.position.y = 5.05; g.add(låg);
  const tud = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 12), mat("#ffffff"));
  tud.position.y = 6; g.add(tud);
  g.position.set(x, -3.5, z); g.rotation.y = r() * 6;
  return g;
}
function lavPommes(x, z) {                        // en rød æske med pommes frites
  const g = new THREE.Group();
  const æske = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.1, 3, 4), mat("#e8463a"));
  æske.position.y = 1.5; æske.rotation.y = Math.PI / 4; g.add(æske);
  const gul = mat("#ffd23f");
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.28), gul);
    f.position.set(Math.cos(i * 2.1) * 0.7 * (i % 3) / 2, 3.4 + (i % 3) * 0.3, Math.sin(i * 2.1) * 0.7 * (i % 3) / 2);
    f.rotation.set((i % 3 - 1) * 0.15, 0, (i % 2 - 0.5) * 0.3); g.add(f);
  }
  g.position.set(x, -3.5, z);
  return g;
}
function lavSlikkepind(x, z, r) {
  const g = new THREE.Group(), h = 4 + r() * 2;
  const pind = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, h, 8), mat("#ffffff"));
  pind.position.y = h / 2; g.add(pind);
  const slik = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.4, 24), mat("#ffffff", { map: lærredTekstur(128, 128, (c, b) => {
    const farver = ["#ff4d8d", "#ffd23f", "#34c77b", "#2ec4f1"];
    for (let i = 0; i < 12; i++) { c.fillStyle = farver[i % 4]; c.beginPath(); c.moveTo(b / 2, b / 2); c.arc(b / 2, b / 2, b / 2, i * Math.PI / 6, (i + 1) * Math.PI / 6); c.fill(); }
  }) }));
  slik.rotation.x = Math.PI / 2; slik.position.y = h + 1.2; g.add(slik);
  g.position.set(x, -3.5, z);
  return g;
}
function lavSky(x, y, z, r) {
  const g = new THREE.Group(), hvid = mat("#ffffff", { roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(1.5 + r() * 1.5, 10, 8), hvid);
    k.position.set(i * 1.8 - 2.7, (r() - 0.5) * 0.8, (r() - 0.5) * 1.2); g.add(k);
  }
  g.position.set(x, y, z);
  return g;
}
