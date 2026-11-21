// ===== Former: små værktøjer til at bygge våbnene af profiler, rør og drejede dele =====
// Våbnene bygges som på en tegning: x = fremad (mod mundingen), y = op, z = venstre side.
// Højre side (hvor hylstrene kastes ud) er altså −z. Alle mål er i meter, som det rigtige våben.

import * as THREE from "../3d-faelles/three.module.js";

// En lukket form af punkter [x, y, r] — r runder hjørnet af (0 = skarpt hjørne)
export function form(punkter, huller = []) {
  const s = new THREE.Shape();
  tegnRundet(s, punkter);
  for (const h of huller) { const p = new THREE.Path(); tegnRundet(p, h); s.holes.push(p); }
  return s;
}
function tegnRundet(sti, pkt) {
  const n = pkt.length;
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = pkt[i];
    if (!r) { if (i === 0) sti.moveTo(x, y); else sti.lineTo(x, y); continue; }
    const [px, py] = pkt[(i - 1 + n) % n], [nx, ny] = pkt[(i + 1) % n];
    const d1 = Math.hypot(px - x, py - y) || 1, d2 = Math.hypot(nx - x, ny - y) || 1;
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const ax = x + (px - x) / d1 * rr, ay = y + (py - y) / d1 * rr;
    const bx = x + (nx - x) / d2 * rr, by = y + (ny - y) / d2 * rr;
    if (i === 0) sti.moveTo(ax, ay); else sti.lineTo(ax, ay);
    sti.quadraticCurveTo(x, y, bx, by);
  }
  sti.closePath();
}

// Gang teksturkoordinaterne op (profilerne får koordinater i meter, som er for små til teksturerne)
function uvSkala(g, s) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  return g;
}

// En profil set fra siden, skåret ud i en vis tykkelse (z), med afrundede kanter (fas)
export function side(punkter, tykkelse, { fas = 0.0012, huller = [], kurve = 8, uv = 10 } = {}) {
  const f = Math.min(fas, tykkelse * 0.45);
  const dybde = Math.max(0.00005, tykkelse - 2 * f);
  const g = new THREE.ExtrudeGeometry(form(punkter, huller), {
    depth: dybde, bevelEnabled: f > 0, bevelThickness: f, bevelSize: f, bevelOffset: -f, bevelSegments: 3, curveSegments: kurve,
  });
  g.translate(0, 0, -dybde / 2);
  return uvSkala(g, uv);
}

// Et tværsnit (set forfra: x = højre, y = op) trukket langs x fra x0 til x1 — til slæder, skinner og rør med kanter
export function langs(punkter, x0, x1, { huller = [], kurve = 8, uv = 10, fas = 0 } = {}) {
  const g = new THREE.ExtrudeGeometry(form(punkter, huller), {
    depth: x1 - x0 - 2 * fas, bevelEnabled: fas > 0, bevelThickness: fas, bevelSize: fas, bevelOffset: -fas, bevelSegments: 2, curveSegments: kurve,
  });
  g.rotateY(Math.PI / 2);     // formens x → våbnets højre side (−z), trækket → fremad (x)
  g.translate(x0 + fas, 0, 0);
  return uvSkala(g, uv);
}

// Drejet om x-aksen som på en drejebænk: profil = [[x, radius], ...] fra bag til for
export function drejet(profil, seg = 28) {
  const g = new THREE.LatheGeometry(profil.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.00001), x)), seg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

// Et rør langs x (radius for og bag), med midten i (x, y, z)
export function rør(rBag, rFor, længde, seg = 24, åben = false) {
  const g = new THREE.CylinderGeometry(rFor, rBag, længde, seg, 1, åben);
  g.rotateZ(-Math.PI / 2);
  return g;
}

// En kasse med afrundede kanter set fra siden (x0..x1, y0..y1) i tykkelsen t
export function kasse(x0, y0, x1, y1, t, r = 0.001, fas = 0.0008) {
  return side([[x0, y0, r], [x1, y0, r], [x1, y1, r], [x0, y1, r]], t, { fas });
}

// Et tandhjul af tværsnit: cirkel med riller (tromlens kanaler)
export function rilleCirkel(R, antal, dybde, bredde, start = 0, n = 180) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const v = i / n * Math.PI * 2;
    let r = R;
    for (let k = 0; k < antal; k++) {
      let d = Math.abs(((v - start - k / antal * Math.PI * 2) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (d < bredde) r = Math.min(r, R - dybde * Math.sqrt(1 - (d / bredde) ** 2));
    }
    p.push([Math.cos(v) * r, Math.sin(v) * r]);
  }
  return p;
}

// Byg en del: mesh med skygge, placeret og drejet
export function del(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// En gruppe, der kan flyttes og drejes som én bevægelig del (fx slæden), med drejepunkt i (x, y, z)
export function led(x = 0, y = 0, z = 0, ...børn) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  for (const b of børn) g.add(b);
  return g;
}

// Gentag en lille del langs en linje (skinnens tænder, riller i slæden)
export function række(geo, mat, antal, fra, skridt) {
  const im = new THREE.InstancedMesh(geo, mat, antal), m = new THREE.Matrix4();
  for (let i = 0; i < antal; i++) { m.makeTranslation(fra.x + skridt.x * i, fra.y + skridt.y * i, fra.z + skridt.z * i); im.setMatrixAt(i, m); }
  im.castShadow = true; im.receiveShadow = true;
  return im;
}
