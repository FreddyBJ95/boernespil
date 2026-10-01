// ===== Kæmperne for enden af banen: manden, dinoen og monsteret =====
// De har alle det samme: en mund, der kan åbne sig og tygge, øjne, der følger burgeren,
// hænder med kniv og gaffel, og en mave, der bliver større, når de har spist meget.
import * as THREE from "./three.js";
import { mat, lærredTekstur } from "./figurer.js";

const kugle = (r, seg = 24) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
function mesh(geo, materiale, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, materiale); m.position.set(x, y, z); return m; }
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();

// Hvilken kæmpe der venter for enden af hver bane
export const KÆMPER = ["mand", "dino", "monster"];
export const KÆMPE_EMOJI = { mand: "🧔", dino: "🦖", monster: "👾" };

// ---------- Fælles dele ----------
// Et øje med en pupil, der kigger efter burgeren
function lavØje(forælder, x, y, z, r) {
  const øje = new THREE.Group(); øje.position.set(x, y, z);
  const hvide = mesh(kugle(r), mat("#ffffff")); øje.add(hvide);
  const pupil = mesh(kugle(r * 0.5), mat("#1d140c", { roughness: 0.3 })); øje.add(pupil);
  const glimt = mesh(kugle(r * 0.14, 10), mat("#ffffff")); glimt.position.set(-r * 0.18, r * 0.2, r * 0.42); pupil.add(glimt);
  forælder.add(øje);
  return { øje, hvide, pupil, r };
}
function kigOgBlink(ø, kig, t, fase) {
  const p = ø.øje.getWorldPosition(v1), d = v2.copy(kig).sub(p).normalize();
  ø.pupil.position.set(d.x * ø.r * 0.62, d.y * ø.r * 0.62, ø.r * 0.62);
  const blink = ((t + fase) % 4.2) < 0.12;
  ø.hvide.scale.set(1, blink ? 0.12 : 1, 1); ø.pupil.visible = !blink;
}
// Munden: en mørk åbning med tunge og tænder. b = hvor bred den er.
// slags: "mand" (en række tænder), "dino" (spidse tænder foroven og forneden), "monster" (to hugtænder)
function lavMund(forælder, x, y, z, b, slags) {
  const mund = new THREE.Group(); mund.position.set(x, y, z); forælder.add(mund);
  const hul = mesh(kugle(1, 28), mat("#4a0d14", { roughness: 0.9 })); mund.add(hul);
  const tunge = mesh(kugle(1, 20), mat("#ff7d8e")); mund.add(tunge);
  const over = new THREE.Group(), under = new THREE.Group(); mund.add(over, under);
  const hvid = mat("#fffdf2");
  if (slags === "mand") over.add(mesh(new THREE.BoxGeometry(1.3 * b, 0.3, 0.5), hvid));
  else if (slags === "dino") {
    const tand = new THREE.ConeGeometry(0.15, 0.45, 8);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.34 * b;
      const t = mesh(tand, hvid, x, -0.16, 0); t.rotation.x = Math.PI; over.add(t);
      if (i < 6) under.add(mesh(tand, hvid, x + 0.17 * b, 0.16, 0));
    }
  } else {
    for (const s of [-1, 1]) { const t = mesh(new THREE.ConeGeometry(0.28, 0.95, 12), hvid, s * 0.8 * b, -0.4, 0.05); t.rotation.x = Math.PI; over.add(t); }
  }
  const smil = mesh(new THREE.TorusGeometry(0.75 * b, 0.13, 10, 28, Math.PI), mat("#7a1c22"), 0, 0.5, 0.35);
  smil.rotation.z = Math.PI; mund.add(smil);
  function sæt(å) {
    hul.scale.set(b * (1 + å * 0.17), 0.06 + å * 1.25, 0.55);
    over.position.set(0, hul.scale.y * 0.8, 0.22); under.position.set(0, -hul.scale.y * 0.8, 0.22);
    over.visible = under.visible = å > 0.12;
    tunge.scale.set(0.65 * b, 0.3, 0.45); tunge.position.set(0, -hul.scale.y * 0.62, 0.18); tunge.visible = å > 0.2;
    hul.visible = å > 0.04; smil.visible = !hul.visible;
  }
  return { mund, sæt };
}
// To hænder med gaffel (venstre) og kniv (højre)
function lavHænder(g, hud, afstand, y, z, str = 1) {
  const metal = mat("#c9d1dc", { metalness: 0.6, roughness: 0.3 }), hænder = [];
  for (const s of [-1, 1]) {
    const hånd = new THREE.Group(); hånd.position.set(s * afstand, y, z); hånd.scale.setScalar(str);
    hånd.add(mesh(kugle(1.1, 18), hud));
    hånd.add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 12), metal, 0, 2.6, 0));
    if (s < 0) for (let i = -1.5; i <= 1.5; i++) hånd.add(mesh(new THREE.BoxGeometry(0.12, 1.5, 0.12), metal, i * 0.22, 5.6, 0));
    else hånd.add(mesh(new THREE.BoxGeometry(0.75, 2.8, 0.1), metal, 0.2, 5.8, 0));
    hånd.userData.x = s * afstand; hånd.userData.y = y; hånd.userData.s = s;
    g.add(hånd); hænder.push(hånd);
  }
  return hænder;
}
// Det, alle kæmper deler: tilstanden og opdateringen af mund, øjne, hoved og hænder
function samlKæmpe(g, { hoved, hovedY, mund, øjne, hænder, mave, maveY, kinder = [], ekstra }) {
  const tilstand = { åben: 0, tyg: 0, glad: 0, hop: 0 };
  let fedme = 0;
  function opdater(t, kig) {
    const å = tilstand.tyg > 0 ? 0.15 + Math.abs(Math.sin(t * 9)) * 0.35 : tilstand.åben;
    mund.sæt(å);
    const puf = tilstand.tyg > 0 ? 1.3 + Math.sin(t * 9) * 0.08 : 1;
    kinder.forEach(k => k.scale.setScalar(puf));
    hoved.position.y = hovedY + Math.abs(Math.sin(t * 8)) * 0.35 * tilstand.hop;
    hænder.forEach((h, i) => {
      h.position.x = h.userData.x + h.userData.s * fedme * 3.5;
      h.position.y = h.userData.y + Math.abs(Math.sin(t * 8 + i)) * 0.8 * Math.max(tilstand.hop, tilstand.glad * 0.5);
    });
    øjne.forEach((ø, i) => kigOgBlink(ø, kig, t, i * 0.05));
    if (ekstra) ekstra(t, å);
  }
  // Maven vokser ud til siderne og lidt nedad — aldrig op over hovedet
  function fedt(gr) {
    fedme = gr;
    mave.scale.set(1 + gr, 1 + gr * 0.25, 1 + gr * 0.35);
    mave.position.y = maveY - gr * 2.2;
  }
  const mundPos = () => mund.mund.getWorldPosition(new THREE.Vector3());
  return { gruppe: g, tilstand, opdater, mundPos, fedt };
}

// ---------- Manden med overskæg og ternet serviet ----------
function lavMand() {
  const g = new THREE.Group();
  const hud = mat("#f5c19c"), brun = mat("#6b3f1d", { roughness: 0.9 });
  const skjorte = mat("#ffffff", { map: lærredTekstur(128, 128, (c, b, h) => {
    c.fillStyle = "#3d8bd9"; c.fillRect(0, 0, b, h);
    c.fillStyle = "#8cc0f0"; for (let x = 0; x < b; x += 32) c.fillRect(x, 0, 12, h);
  }) });
  const mave = mesh(kugle(5.4, 40), skjorte, 0, 0.6, -2.4);
  g.add(mave);
  const serviet = mesh(new THREE.PlaneGeometry(4.4, 3.2), mat("#ffffff", { side: THREE.DoubleSide, map: lærredTekstur(128, 96, (c, b, h) => {
    c.fillStyle = "#fff"; c.fillRect(0, 0, b, h);
    c.fillStyle = "#e8463a"; for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 16; x < b; x += 32) c.fillRect(x, y, 16, 16);
  }) }), 0, 0.4, 5.35);
  serviet.rotation.x = -0.35;
  mave.add(serviet);                                             // servietten sidder på maven og følger med, når den vokser
  const hoved = new THREE.Group(); hoved.position.set(0, 4.6, 0); g.add(hoved);
  hoved.add(mesh(kugle(4, 48), hud));
  for (const s of [-1, 1]) { const øre = mesh(kugle(0.9, 16), hud, s * 3.95, 0.1, -0.2); øre.scale.set(0.55, 1, 0.9); hoved.add(øre); }
  const krølle = kugle(1.05, 14);
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.12 + i * 0.076);
    hoved.add(mesh(krølle, brun, Math.cos(a) * 3.55, Math.sin(a) * 3.55 + 0.2, -0.6 + Math.sin(i * 1.7) * 0.5));
  }
  const kinder = [-1, 1].map(s => { const k = mesh(kugle(0.95, 16), mat("#ff9e9e"), s * 2.35, -0.8, 2.85); hoved.add(k); return k; });
  const øjne = [-1, 1].map(s => {
    const ø = lavØje(hoved, s * 1.45, 0.9, 3.35, 0.85);
    const bryn = mesh(new THREE.CapsuleGeometry(0.17, 1.1, 6, 10), brun, 0, 1.1, -0.1); bryn.rotation.z = Math.PI / 2 - s * 0.18; ø.øje.add(bryn);
    ø.bryn = bryn;
    return ø;
  });
  hoved.add(mesh(kugle(0.85, 20), mat("#ee9d7e"), 0, -0.3, 4.0));   // næse
  for (const s of [-1, 1]) { const skæg = mesh(kugle(1, 20), brun, s * 0.95, -1.15, 3.75); skæg.scale.set(1.35, 0.48, 0.6); skæg.rotation.z = s * 0.28; hoved.add(skæg); }
  const mund = lavMund(hoved, 0, -2.05, 3.5, 1.45, "mand");
  const hænder = lavHænder(g, hud, 6.2, 1.6, 1.5);
  return samlKæmpe(g, { hoved, hovedY: 4.6, mund, øjne, hænder, mave, maveY: 0.6, kinder,
    ekstra: (t, å) => øjne.forEach(ø => { ø.bryn.position.y = 1.1 + å * 0.35; }) });
}

// ---------- Dinoen: grøn, med pigge på ryggen, spidse tænder og bittesmå arme ----------
function lavDino() {
  const g = new THREE.Group();
  const grøn = mat("#5cbf4a"), lys = mat("#d9f2a0"), orange = mat("#ff9f1c"), mørk = mat("#2e6b25");
  const mave = mesh(kugle(5.2, 40), grøn, 0, 0.2, -2.6);
  g.add(mave);
  const maveplet = mesh(kugle(4.2, 32), lys, 0, -0.3, 3.5); maveplet.scale.set(0.8, 1, 0.45); mave.add(maveplet);
  const pig = new THREE.ConeGeometry(0.7, 1.8, 10);
  for (let i = 0; i < 5; i++) {                                  // pigge ned ad ryggen
    const a = -0.5 + i * 0.32, p = mesh(pig, orange, 0, Math.cos(a) * 5.2, -Math.sin(a) * 5.2 - 0.6);
    p.rotation.x = -a; mave.add(p);
  }
  const hoved = new THREE.Group(); hoved.position.set(0, 5.2, 0.3); g.add(hoved);
  const kranie = mesh(kugle(3.4, 40), grøn); kranie.scale.set(1.05, 0.9, 1.05); hoved.add(kranie);
  const snude = mesh(kugle(2.2, 32), grøn, 0, -1.2, 2.5); snude.scale.set(1.3, 0.78, 1); hoved.add(snude);
  for (const s of [-1, 1]) hoved.add(mesh(kugle(0.22, 10), mørk, s * 0.65, -0.55, 4.55));    // næsebor
  for (let i = 0; i < 4; i++) { const p = mesh(pig, orange, 0, 3.0 - i * 0.15, 1.2 - i * 1.2); p.scale.setScalar(0.7 - i * 0.08); p.rotation.x = -0.3 - i * 0.3; hoved.add(p); }
  const øjne = [-1, 1].map(s => {
    const ø = lavØje(hoved, s * 1.65, 1.35, 2.45, 0.95);
    const bryn = mesh(new THREE.CapsuleGeometry(0.22, 1.0, 6, 10), mørk, 0, 0.95, 0.1); bryn.rotation.z = Math.PI / 2 - s * 0.2; ø.øje.add(bryn);
    return ø;
  });
  const mund = lavMund(hoved, 0, -1.8, 4.1, 1.35, "dino");
  const hænder = lavHænder(g, grøn, 2.9, 2.6, 3.2, 0.55);       // bittesmå T-rex-arme
  return samlKæmpe(g, { hoved, hovedY: 5.2, mund, øjne, hænder, mave, maveY: 0.2 });
}

// ---------- Monsteret: lilla og plettet, med ét stort øje, horn og to hugtænder ----------
function lavMonster() {
  const g = new THREE.Group();
  const lilla = mat("#9b5de5", { roughness: 0.95 }), plet = mat("#c39bff", { roughness: 0.95 }), horn = mat("#fff2c8");
  const mave = mesh(kugle(5.6, 40), lilla, 0, 0.4, -2.2);
  g.add(mave);
  for (let i = 0; i < 10; i++) {                                 // pletter på maven
    const a = i * 2.4, b = 0.3 + (i % 4) * 0.25, p = mesh(kugle(0.7, 12), plet, Math.cos(a) * 5.4 * Math.cos(b), Math.sin(b) * 5.4 - 1, Math.sin(a) * 5.4 * Math.cos(b));
    p.scale.set(1, 1, 0.35); p.lookAt(0, 0, 0); mave.add(p);
  }
  const hoved = new THREE.Group(); hoved.position.set(0, 4.8, 0); g.add(hoved);
  hoved.add(mesh(kugle(4.2, 48), lilla));
  for (let i = 0; i < 8; i++) {                                  // pletter i hovedet
    const a = 0.6 + i * 0.75, b = -0.3 + (i % 3) * 0.45, x = Math.sin(a) * Math.cos(b) * 4.15, y = Math.sin(b) * 4.15, z = Math.cos(a) * Math.cos(b) * 4.15;
    if (z > 2.2 && Math.abs(x) < 2) continue;                    // ikke midt i ansigtet
    const p = mesh(kugle(0.6, 12), plet, x, y, z); p.scale.set(1, 1, 0.35); p.lookAt(0, 0, 0); hoved.add(p);
  }
  for (const s of [-1, 1]) {                                     // horn
    const h = mesh(new THREE.ConeGeometry(0.6, 2.4, 14), horn, s * 2.3, 3.7, 0); h.rotation.z = -s * 0.55; hoved.add(h);
  }
  const øje = lavØje(hoved, 0, 1.2, 3.15, 1.45);
  const mund = lavMund(hoved, 0, -1.65, 3.6, 1.8, "monster");
  const hænder = lavHænder(g, lilla, 6.6, 1.6, 1.5);
  return samlKæmpe(g, { hoved, hovedY: 4.8, mund, øjne: [øje], hænder, mave, maveY: 0.4 });
}

export function lavKæmpe(slags) {
  return slags === "dino" ? lavDino() : slags === "monster" ? lavMonster() : lavMand();
}
