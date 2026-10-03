// ===== Gem Støvbyen til Blender: kør  node eksporter_bane.mjs  (her i blender-mappen) =====
// Banen bygges med præcis samme kode som i spillet (bane.js), og firkanterne gemmes i ud/bane.json.
// lav_lys.py bager lyset på dem, og spillet sætter lysbilledet på de samme hjørner i samme rækkefølge.

import { register } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
register("./krog.mjs", import.meta.url);

const { lavBane, LAMPER, LAMPE_Y } = await import("../bane.js");
const { Kasseverden } = await import("../verden.js");
const { Scene } = { Scene: class { constructor() { this.children = []; } add(...b) { this.children.push(...b); } } };

const scene = new Scene(), verden = new Kasseverden();
lavBane(scene, verden, {});

// Er et punkt inde i en af kollisionskasserne? (så er fladen skjult — fx to huse, der står op ad hinanden)
const inde = (x, y, z) => verden.kasser.some(k => x > k.min[0] && x < k.max[0] && y > k.min[1] && y < k.max[1] && z > k.min[2] && z < k.max[2]);
const MIN = -58, MAX = 58;

const masker = [];
let areal = 0;
for (const m of scene.children) {
  const g = m.geometry;
  if (!g?.attributes?.color) continue;                                // kun Byggerens flader (ikke tønder og palmer)
  const p = g.attributes.position.array, n = g.attributes.normal.array, antal = p.length / 12;
  const skjult = [];
  for (let q = 0; q < antal; q++) {                                   // hver firkant: prøv punkter for hver halve meter, 2 cm ude foran fladen
    const h = k => [p[q * 12 + k * 3], p[q * 12 + k * 3 + 1], p[q * 12 + k * 3 + 2]];
    const [a, b, c, d] = [h(0), h(1), h(2), h(3)], nx = n[q * 12], ny = n[q * 12 + 1], nz = n[q * 12 + 2];
    const su = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.5)), sv = Math.max(2, Math.ceil(Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) / 0.5));
    let set = false;
    for (let i = 0; i <= su && !set; i++) for (let j = 0; j <= sv && !set; j++) {
      const u = (i + 0.5) / (su + 1), v = (j + 0.5) / (sv + 1), pkt = [0, 1, 2].map(e => (a[e] * (1 - u) + b[e] * u) * (1 - v) + (d[e] * (1 - u) + c[e] * u) * v);
      const x = pkt[0] + nx * 0.02, y = pkt[1] + ny * 0.02, z = pkt[2] + nz * 0.02;
      if (!(x < MIN || x > MAX || z < MIN || z > MAX || y < -0.01) && !inde(x, y, z)) set = true;
    }
    if (ny > 0.9 && a[1] > 5.5) set = false;                       // tagene kan ingen se (øjnene er højst 5 m oppe, husene er mindst 6,5 m)
    skjult.push(set ? 0 : 1);
    if (set) areal += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
  }
  let sum = 0; for (let i = 0; i < p.length; i++) sum += p[i] * ((i % 7) + 1);
  masker.push({ mat: m.name, hjørner: p.length / 3, sum: Math.round(sum), pos: Array.from(p, v => Math.round(v * 1000) / 1000), nor: Array.from(n), skjult });
}

const kasser = verden.kasser.map(k => ({ min: k.min, max: k.max, mat: k.mat }));
mkdirSync(new URL("./ud/", import.meta.url), { recursive: true });
writeFileSync(new URL("./ud/bane.json", import.meta.url), JSON.stringify({ masker, kasser, lamper: LAMPER.map(([x, z]) => [x, LAMPE_Y - 0.06, z]) }));
console.log(`synligt areal: ${Math.round(areal)} m²`);
console.log(masker.map(m => `${m.mat}: ${m.hjørner} hjørner, ${m.skjult.filter(s => !s).length}/${m.skjult.length} synlige`).join("\n"));
