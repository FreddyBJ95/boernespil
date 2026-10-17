// ===== Bygningerne: hver bygning er sat sammen af rigtige dele, ligesom i virkeligheden =====
// Betonblokken har søjler, dæk (gulvene) og facadeelementer med vinduer. Skorstenen er murstensringe,
// vandtårnet står på fire ben, lagerhallen er et stålskelet med blikvægge, og huset er af mursten med
// trægulve og tegltag. Alle mål er i meter. x, z: hvor bygningen står · yaw: hvordan den er drejet.

import * as THREE from "../3d-faelles/three.module.js";

const Y = new THREE.Vector3(0, 1, 0);

// En ny, tom bygning
function ny(navn, x, z, yaw, ekstra = {}) {
  return { navn, dele: [], x, z, yaw, båndHøjde: 3, tårn: false, ændret: false, ...ekstra };
}
// Læg en del i bygningens eget rum (lx, ly, lz) og drej den med bygningen
function del(dele, b, spec) {
  const [lx, ly, lz] = spec.pos;
  const p = new THREE.Vector3(lx, ly, lz).applyAxisAngle(Y, b.yaw).add(new THREE.Vector3(b.x, 0, b.z));
  const kvat = spec.kvat ? new THREE.Quaternion().setFromAxisAngle(Y, b.yaw).multiply(spec.kvat) : null;
  return dele.lav({ ...spec, pos: [p.x, p.y, p.z], yaw: (spec.yaw || 0) + b.yaw, kvat, fast: true, bygning: b });
}
function færdig(dele, b) {
  dele.bygStatik(b); dele.bygninger.push(b);
  b.ringAreal = [];
  for (const d of b.dele) if (d.bærer) b.ringAreal[d.ring] = (b.ringAreal[d.ring] || 0) + d.str.x * d.str.z;
  const box = new THREE.Box3();
  for (const d of b.dele) box.union(dele.aabb(d));
  b.kasse = box; b.højde = box.max.y; b.startAntal = b.dele.length;
  b.startVolumen = b.dele.reduce((s, d) => s + d.vol, 0);
  return b;
}

// ---------- Betonblokken (og højhuset): søjler, dæk, facader og skillevægge ----------
export function betonblok(dele, ruder, { x = 0, z = 0, yaw = 0, etager = 4, fagX = 4, fagZ = 2, fag = 3.6, etageH = 2.8, navn = "Betonblokken", vinduer = true, tone = null } = {}) {
  const b = ny(navn, x, z, yaw, { båndHøjde: etageH });
  const W = fagX * fag, D = fagZ * fag, t = 0.22, c = 0.36, h = etageH - t;
  const facadeTone = tone ?? 0xe4e0d8;
  for (let f = 0; f < etager; f++) {
    const y0 = f * etageH;
    // søjlerne
    for (let i = 0; i <= fagX; i++) for (let j = 0; j <= fagZ; j++)
      del(dele, b, { mat: "råbeton", str: [c, h, c], pos: [i * fag - W / 2, y0 + h / 2, j * fag - D / 2], krav: 0.3 });
    // dækkene (et for hvert fag, så de kan knække hver for sig)
    for (let i = 0; i < fagX; i++) for (let j = 0; j < fagZ; j++)
      del(dele, b, { mat: "beton", str: [fag - 0.004, t, fag - 0.004], pos: [(i + 0.5) * fag - W / 2, y0 + h + t / 2, (j + 0.5) * fag - D / 2], spænd: true, krav: 0.55 });
    // facadeelementerne med vinduer (de bærer også dækket ovenover)
    const facade = (lx, lz, yawF, dør) => {
      const d = del(dele, b, { mat: "beton", str: [fag - c - 0.012, h - 0.002, 0.2], pos: [lx, y0 + h / 2, lz], yaw: yawF, spænd: true, krav: 0.4, tone: facadeTone });
      if (d && vinduer) {
        if (dør) ruder.lav(d, new THREE.Vector3(0, -h / 2 + 1.06, 0.101), 1.1, 2.1, 0);
        else ruder.lav(d, new THREE.Vector3(0, 0.15, 0.101), Math.min(1.8, fag - 1.6), 1.3, 0);
      }
    };
    for (let i = 0; i < fagX; i++) {
      const lx = (i + 0.5) * fag - W / 2;
      facade(lx, -D / 2, Math.PI, f === 0 && i === Math.floor(fagX / 2));
      facade(lx, D / 2, 0, false);
    }
    for (let j = 0; j < fagZ; j++) {
      const lz = (j + 0.5) * fag - D / 2;
      facade(-W / 2, lz, -Math.PI / 2, false);
      facade(W / 2, lz, Math.PI / 2, false);
    }
    // skillevæggene inde i blokken (bærende, uden vinduer)
    for (let j = 1; j < fagZ; j++) for (let i = 0; i < fagX; i++)
      del(dele, b, { mat: "råbeton", str: [fag - c - 0.012, h - 0.002, 0.16], pos: [(i + 0.5) * fag - W / 2, y0 + h / 2, j * fag - D / 2], spænd: true, krav: 0.4 });
  }
  // en lille kant rundt om taget
  for (const [lx, lz, l, yawK] of [[0, -D / 2, W, 0], [0, D / 2, W, 0], [-W / 2, 0, D, Math.PI / 2], [W / 2, 0, D, Math.PI / 2]])
    del(dele, b, { mat: "beton", str: [l + (yawK ? -0.3 : 0.3), 0.45, 0.15], pos: [lx, etager * etageH + 0.225, lz], yaw: yawK, spænd: true, tone: facadeTone });
  return færdig(dele, b);
}

// ---------- Fabriksskorstenen: ringe af mursten, der bliver smallere opad ----------
export function skorsten(dele, ruder, { x = 0, z = 0, højde = 30, r0 = 1.75, r1 = 1.0, lag = 1.2, n = 12, navn = "Skorstenen" } = {}) {
  const b = ny(navn, x, z, 0, { tårn: true, båndHøjde: 4.8 });
  const ringe = Math.round(højde / lag);
  for (let ring = 0; ring < ringe; ring++) {
    const r = r0 + (r1 - r0) * (ring / ringe), t = 0.32 * r, korde = 2 * r * Math.sin(Math.PI / n);
    for (let k = 0; k < n; k++) {
      const θ = (k + (ring % 2) * 0.5) * 2 * Math.PI / n;      // hvert andet lag forskudt, som murværk
      del(dele, b, { form: "kile", mat: "mursten", str: [korde, lag - 0.003, t], pos: [Math.sin(θ) * (r - t / 2), ring * lag + lag / 2, Math.cos(θ) * (r - t / 2)], yaw: θ, ring, bærer: true, spænd: true, krav: 0.25, tone: ring > ringe - 3 ? 0x6a5a52 : undefined });
    }
  }
  return færdig(dele, b);
}

// ---------- Vandtårnet: fire ben af beton, ringbjælker og en stor ståltank ----------
export function vandtårn(dele, ruder, { x = 0, z = 0, navn = "Vandtårnet" } = {}) {
  const b = ny(navn, x, z, 0, { tårn: true, båndHøjde: 6 });
  const a = 2.6, ben = 0.7, stk = 6, antal = 3;
  for (let s = 0; s < antal; s++) {
    const y0 = s * stk;
    for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
      del(dele, b, { mat: "råbeton", str: [ben, stk - 0.5, ben], pos: [i * a, y0 + (stk - 0.5) / 2, j * a], ring: s, bærer: true, krav: 0.3 });
    // ringbjælkerne mellem benene
    const yb = y0 + stk - 0.25;
    for (const [lx, lz, yawB] of [[0, -a, 0], [0, a, 0], [-a, 0, Math.PI / 2], [a, 0, Math.PI / 2]])
      del(dele, b, { mat: "råbeton", str: [2 * a - ben - 0.01, 0.5, 0.45], pos: [lx, yb, lz], yaw: yawB, ring: s, spænd: true, krav: 0.3 });
    // hjørnerne over benene (så bjælkerne og næste ben har noget at stå på)
    for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
      del(dele, b, { mat: "råbeton", str: [ben, 0.5, ben], pos: [i * a, yb, j * a], ring: s, krav: 0.3 });
  }
  const top = antal * stk;
  del(dele, b, { mat: "beton", str: [2 * a + 1.4, 0.4, 2 * a + 1.4], pos: [0, top + 0.2, 0], ring: antal, krav: 0.2 });
  del(dele, b, { form: "cylinder", mat: "stål", str: [7.2, 5.2, 7.2], pos: [0, top + 0.4 + 2.6, 0], ring: antal + 1, krav: 0.2, tone: 0xb8bcc2 });
  del(dele, b, { form: "cylinder", mat: "tag", str: [6.4, 0.6, 6.4], pos: [0, top + 0.4 + 5.2 + 0.3, 0], ring: antal + 2, krav: 0.2 });
  return færdig(dele, b);
}

// ---------- Lagerhallen: stålskelet, blikvægge og tag ----------
export function lagerhal(dele, ruder, { x = 0, z = 0, yaw = 0, fagX = 4, fag = 5, D = 12, H = 6, navn = "Lagerhallen" } = {}) {
  const b = ny(navn, x, z, yaw, { båndHøjde: H });
  const W = fagX * fag, s = 0.32;
  for (let i = 0; i <= fagX; i++) {
    const lx = i * fag - W / 2;
    for (const lz of [-D / 2, D / 2]) del(dele, b, { mat: "rødstål", str: [s, H, s], pos: [lx, H / 2, lz], krav: 0.3 });
    del(dele, b, { mat: "rødstål", str: [0.3, 0.6, D + s], pos: [lx, H + 0.3, 0], krav: 0.3, spænd: true });          // tagbjælken
  }
  // tagpladerne ligger på bjælkerne
  for (let i = 0; i < fagX; i++) for (const lz of [-D / 4, D / 4])
    del(dele, b, { mat: "tag", str: [fag - 0.01, 0.08, D / 2 + 0.15], pos: [(i + 0.5) * fag - W / 2, H + 0.64, lz], krav: 0.3, spænd: true });
  // væggene af blik mellem søjlerne
  for (let i = 0; i < fagX; i++) {
    const lx = (i + 0.5) * fag - W / 2;
    for (const [lz, yawV] of [[-D / 2, Math.PI], [D / 2, 0]]) {
      const d = del(dele, b, { mat: "blik", str: [fag - s - 0.01, H - 0.01, 0.07], pos: [lx, (H - 0.01) / 2, lz], yaw: yawV, spænd: true, krav: 0.3 });
      if (d && i % 2 === 1) ruder.lav(d, new THREE.Vector3(0, 1.6, 0.04), 2.6, 0.9, 0);
    }
  }
  for (const [lx, yawG] of [[-W / 2, -Math.PI / 2], [W / 2, Math.PI / 2]]) {
    const n = 3;
    for (let j = 0; j < n; j++) {
      const lz = (j + 0.5) * (D / n) - D / 2;
      if (lx > 0 && j === 1) continue;                                         // porten i den ene gavl
      del(dele, b, { mat: "blik", str: [D / n - 0.01, H - 0.01, 0.07], pos: [lx, (H - 0.01) / 2, lz], yaw: yawG, spænd: true, krav: 0.3 });
    }
  }
  return færdig(dele, b);
}

// ---------- Murstenshuset: mure af mursten, trægulve og et tag ----------
export function murstenshus(dele, ruder, { x = 0, z = 0, yaw = 0, W = 9, D = 7, etager = 2, etageH = 2.8, navn = "Murstenshuset" } = {}) {
  const b = ny(navn, x, z, yaw, { båndHøjde: etageH });
  const t = 0.36, løft = etageH / 2;
  const mur = (lx0, lz0, lx1, lz1, f, vend) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), n = Math.max(2, Math.round(L / 1.15)), dl = L / n;
    const yawM = Math.atan2(lx1 - lx0, lz1 - lz0) - Math.PI / 2;
    for (let k = 0; k < n; k++) for (let l = 0; l < 2; l++) {
      const s = (k + 0.5) / n, y = f * etageH + l * løft + løft / 2;
      const d = del(dele, b, { mat: "mursten", str: [dl - 0.004, løft - 0.003, t], pos: [lx0 + (lx1 - lx0) * s, y, lz0 + (lz1 - lz0) * s], yaw: yawM + vend, spænd: true, krav: 0.35 });
      if (d && l === 1 && k % 2 === 1 && k < n - 1) ruder.lav(d, new THREE.Vector3(0, -0.2, t / 2 + 0.003), Math.min(1.0, dl - 0.25), 0.95, 0);
      if (d && l === 0 && k % 2 === 1 && k < n - 1 && f > 0) ruder.lav(d, new THREE.Vector3(0, 0.35, t / 2 + 0.003), Math.min(1.0, dl - 0.25), 0.55, 0);
    }
  };
  for (let f = 0; f < etager; f++) {
    // de lange mure foran og bagved, gavlene mellem dem
    mur(-W / 2, -D / 2 + t / 2, W / 2, -D / 2 + t / 2, f, 0);
    mur(W / 2, D / 2 - t / 2, -W / 2, D / 2 - t / 2, f, 0);
    mur(-W / 2 + t / 2, D / 2 - t, -W / 2 + t / 2, -D / 2 + t, f, 0);
    mur(W / 2 - t / 2, -D / 2 + t, W / 2 - t / 2, D / 2 - t, f, 0);
    // gulvet: brædder på bjælker, der ligger fra mur til mur
    const yG = (f + 1) * etageH;
    const n = Math.round((W - 2 * t) / 1.5);
    for (let k = 0; k < n; k++) {
      const lx = -W / 2 + t + (k + 0.5) * (W - 2 * t) / n;
      if (f < etager - 1) del(dele, b, { mat: "træ", str: [(W - 2 * t) / n - 0.004, 0.2, D - 2 * t - 0.006], pos: [lx, yG - 0.1, 0], spænd: true, krav: 0.3 });
    }
  }
  // taget: to skrå flader i tre stykker hver, lagt på murene
  const yT = etager * etageH, hæld = 0.62, halv = D / 2 + 0.35, hyp = halv / Math.cos(hæld);
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const kvat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), side * hæld);
    const lx = -W / 2 - 0.3 + (k + 0.5) * (W + 0.6) / 3;
    del(dele, b, { mat: "tag", str: [(W + 0.6) / 3 - 0.01, 0.12, hyp], kvat, pos: [lx, yT + Math.tan(hæld) * halv / 2 + 0.06, side * halv / 2 - side * 0.02], spænd: true, krav: 0.2, tone: 0x7a3a2a });
  }
  // gavltrekanterne (trappet med mursten)
  for (const gx of [-W / 2 + t / 2, W / 2 - t / 2]) for (let k = 0; k < 4; k++) {
    const h = Math.tan(hæld) * halv / 4, bred = (D - 0.2) * (1 - (k + 0.5) / 4.2);
    del(dele, b, { mat: "mursten", str: [t, h - 0.003, bred], pos: [gx, yT + k * h + h / 2, 0], spænd: true, krav: 0.3 });
  }
  // skorstenen på taget
  del(dele, b, { mat: "mursten", str: [0.55, 1.6, 0.55], pos: [W / 4, yT + 1.6, 0.6], krav: 0.2 });
  return færdig(dele, b);
}

// ---------- Træskuret: stolper, brædder og et tag af brædder ----------
export function træskur(dele, ruder, { x = 0, z = 0, yaw = 0, W = 4.2, D = 3, H = 2.4, navn = "Træskuret" } = {}) {
  const b = ny(navn, x, z, yaw, { båndHøjde: H });
  const p = 0.12, bræt = 0.05;
  for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) del(dele, b, { mat: "træ", str: [p, H, p], pos: [i * (W / 2 - p / 2), H / 2, j * (D / 2 - p / 2)], krav: 0.3 });
  // brædderne på væggene
  const væg = (lx0, lz0, lx1, lz1, yawV, vindue) => {
    const L = Math.hypot(lx1 - lx0, lz1 - lz0), n = Math.round(L / 0.55);
    for (let k = 0; k < n; k++) {
      const s = (k + 0.5) / n;
      const d = del(dele, b, { mat: "rødtræ", str: [L / n - 0.008, H - 0.05, bræt], pos: [lx0 + (lx1 - lx0) * s, (H - 0.05) / 2, lz0 + (lz1 - lz0) * s], yaw: yawV, spænd: true, krav: 0.3 });
      if (d && vindue && k === Math.floor(n / 2)) ruder.lav(d, new THREE.Vector3(0, 0.25, bræt / 2 + 0.003), 0.45, 0.55, 0);
    }
  };
  væg(-W / 2 + p, -D / 2 + bræt / 2, W / 2 - p, -D / 2 + bræt / 2, Math.PI, true);
  væg(-W / 2 + p, D / 2 - bræt / 2, W / 2 - p, D / 2 - bræt / 2, 0, false);
  væg(-W / 2 + bræt / 2, -D / 2 + p, -W / 2 + bræt / 2, D / 2 - p, -Math.PI / 2, false);
  væg(W / 2 - bræt / 2, -D / 2 + p, W / 2 - bræt / 2, D / 2 - p, Math.PI / 2, false);
  // taget: brædder på tværs, lidt skråt
  const n = 9, hæld = 0.12;
  for (let k = 0; k < n; k++) {
    const kvat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), hæld);
    del(dele, b, { mat: "træ", str: [W + 0.5, 0.06, (D + 0.4) / n - 0.01], kvat, pos: [0, H + 0.05 + 0.03, -D / 2 - 0.2 + (k + 0.5) * (D + 0.4) / n], spænd: true, krav: 0.2, tone: 0xa89888 });
  }
  return færdig(dele, b);
}

export const BYGNINGER = { betonblok, skorsten, vandtårn, lagerhal, murstenshus, træskur };
