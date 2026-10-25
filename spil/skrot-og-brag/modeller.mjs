// ===== Skrot & Brag: alle modeller bygges i koden af bløde, runde legetøjsformer =====
// Hver fysikdel bliver til én geometri med farverne lagt i hjørnerne,
// så en tablet kun skal tegne én ting pr. del, også når hele huset styrter sammen.
import * as T from '../3d-faelles/three.module.js';
import { mergeGeometries, mergeVertices } from '../3d-faelles/BufferGeometryUtils.js';

// ---------- Grundformer, der deles af alle modeller ----------
const grund = new Map();
function gem(nøgle, lav) {
  if (!grund.has(nøgle)) grund.set(nøgle, lav());
  return grund.get(nøgle);
}

// Skarpe kanter beholder deres egne normaler; kun position og normal lægges sammen.
function fladt(g) {
  if (g.attributes.uv) g.deleteAttribute('uv');
  return mergeVertices(g, 1e-4);
}

// Bløde former får fælles normaler, så de ser runde ud.
function glat(g) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

const kasse = () => gem('kasse', () => fladt(new T.BoxGeometry(1, 1, 1)));
const cylinder = (seg = 18) => gem(`cyl${seg}`, () => fladt(new T.CylinderGeometry(1, 1, 1, seg)));
const kugle = () => gem('kugle', () => fladt(new T.SphereGeometry(1, 16, 12)));
const kegle = () => gem('kegle', () => fladt(new T.ConeGeometry(1, 1, 18)));

// En kasse med afrundede kanter, som en træklods.
function rundKasse(b, h, d, r) {
  return gem(`rk${b.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`, () => {
    r = Math.max(.002, Math.min(r, b / 2 - .002, h / 2 - .002, d / 2 - .002));
    const s = new T.Shape(), e = .00001, rr = r - e;
    s.absarc(e, e, e, -Math.PI / 2, -Math.PI, true);
    s.absarc(e, h - rr * 2, e, Math.PI, Math.PI / 2, true);
    s.absarc(b - rr * 2, h - rr * 2, e, Math.PI / 2, 0, true);
    s.absarc(b - rr * 2, e, e, 0, -Math.PI / 2, true);
    const g = new T.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: rr, bevelThickness: r, curveSegments: 2 });
    g.center();
    return glat(g);
  });
}

// Et trekantet prisme i køreplanet (tag, skovl og rampe) med en lille afrunding på kanterne.
function prisme(punkter, dybde, kant = .05) {
  return gem(`pr${punkter.flat().map(v => v.toFixed(3)).join(',')}|${dybde}|${kant}`, () => {
    const s = new T.Shape(punkter.map(([x, y]) => new T.Vector2(x, y)));
    const g = new T.ExtrudeGeometry(s, { depth: dybde - kant * 2, bevelEnabled: kant > 0, bevelSegments: 1, bevelSize: kant, bevelThickness: kant, curveSegments: 1 });
    g.translate(0, 0, -(dybde - kant * 2) / 2);
    g.deleteAttribute('normal');
    g.computeVertexNormals();
    return fladt(g);
  });
}

// En rund profil drejet om sin akse: dæk og tønder.
function drejet(nøgle, punkter, seg = 22) {
  return gem(nøgle, () => {
    const g = new T.LatheGeometry(punkter.map(([x, y]) => new T.Vector2(x, y)), seg);
    g.deleteAttribute('uv');
    return g;
  });
}

// ---------- Samling af mange småformer til én geometri ----------
const midlertidig = new T.Matrix4(), q = new T.Quaternion(), euler = new T.Euler();
export class Form {
  constructor() { this.dele = []; }

  // Lægger en grundform ind med farve, placering, drejning og skalering.
  læg(geo, farve, p = [0, 0, 0], drej = [0, 0, 0], skala = [1, 1, 1]) {
    const g = geo.clone();
    midlertidig.compose(new T.Vector3(...p), q.setFromEuler(euler.set(...drej)), new T.Vector3(...skala));
    g.applyMatrix4(midlertidig);
    const c = new T.Color(farve), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    this.dele.push(g);
    return this;
  }

  kasse(farve, p, [b, h, d], r = 0, drej) {
    return r > 0 ? this.læg(rundKasse(b, h, d, r), farve, p, drej) : this.læg(kasse(), farve, p, drej, [b, h, d]);
  }

  cylinder(farve, p, radius, højde, drej, seg = 18) {
    return this.læg(cylinder(seg), farve, p, drej, [radius, højde, radius]);
  }

  kugle(farve, p, s, drej) {
    return this.læg(kugle(), farve, p, drej, Array.isArray(s) ? s : [s, s, s]);
  }

  kegle(farve, p, radius, højde, drej) {
    return this.læg(kegle(), farve, p, drej, [radius, højde, radius]);
  }

  // Lægger en anden samling ind, flyttet og drejet som én helhed.
  indsæt(anden, p = [0, 0, 0], drej = [0, 0, 0]) {
    midlertidig.compose(new T.Vector3(...p), q.setFromEuler(euler.set(...drej)), new T.Vector3(1, 1, 1));
    for (const g of anden.dele) this.dele.push(g.applyMatrix4(midlertidig));
    anden.dele = [];
    return this;
  }

  færdig() {
    const g = mergeGeometries(this.dele, false);
    for (const d of this.dele) d.dispose();
    this.dele = [];
    g.computeBoundingSphere();
    return g;
  }
}

const hvid = '#ffffff', sort = '#262a33', mørkegrå = '#3b4252', stål = '#c9d1dc';
export function blandFarve(farve, mod, mængde) {
  return '#' + new T.Color(farve).lerp(new T.Color(mod), mængde).getHexString();
}

// ---------- Føreren: et lille dyr bag rattet ----------
function øjne(f, x, y, z, r = .055) {
  for (const s of [-1, 1]) {
    f.kugle(sort, [s * x, y, z], r);
    f.kugle(hvid, [s * x + .02, y + .025, z + r * .8], r * .35);
  }
}

export function fører(id) {
  const f = new Form();
  if (id === 'gris') {
    const hud = '#ffa9bd', mørk = '#ff8aa6';
    f.kugle(hud, [0, 0, 0], [.4, .38, .38]);
    for (const s of [-1, 1]) f.kugle(mørk, [s * .25, .32, -.02], [.12, .16, .05], [0, 0, -s * .5]);
    f.cylinder(mørk, [0, -.07, .36], .15, .14, [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) f.kugle('#c9566f', [s * .055, -.07, .435], .035);
    øjne(f, .14, .1, .32);
    for (const s of [-1, 1]) f.kugle('#ff7f9b', [s * .24, -.08, .27], [.07, .05, .04]);
  } else if (id === 'frø') {
    const hud = '#5fd068';
    f.kugle(hud, [0, 0, 0], [.42, .33, .38]);
    for (const s of [-1, 1]) {
      f.kugle(hud, [s * .18, .26, .1], .15);
      f.kugle(hvid, [s * .18, .28, .2], .11);
      f.kugle(sort, [s * .18, .28, .29], .055);
      f.kugle(hvid, [s * .16, .31, .33], .02);
      f.kugle('#ff8fa3', [s * .27, -.06, .27], [.07, .045, .04]);
    }
    f.kugle('#b8324b', [0, -.11, .33], [.2, .04, .05]);
  } else if (id === 'kat') {
    const pels = '#ffab4c', lys = '#fff3e0';
    f.kugle(pels, [0, 0, 0], [.4, .37, .37]);
    for (const s of [-1, 1]) {
      f.kegle(pels, [s * .23, .35, 0], .14, .28, [0, 0, -s * .35]);
      f.kegle('#ffb3c1', [s * .22, .34, .045], .08, .18, [0, 0, -s * .35]);
    }
    f.kugle(lys, [0, -.11, .31], [.17, .11, .1]);
    f.kugle('#ff7f9b', [0, -.05, .4], .04);
    for (const s of [-1, 1]) for (const v of [-.12, 0, .12]) f.kasse('#5a4a42', [s * .3, -.1 + v * .3, .33], [.22, .012, .012], 0, [0, 0, s * v]);
    øjne(f, .14, .08, .32);
    for (let i = -1; i <= 1; i++) f.kasse('#e98f2e', [i * .1, .3, .24], [.04, .12, .03], 0, [0, 0, i * .3]);
  } else {
    const pels = '#b5794a', lys = '#ecc59c';
    f.kugle(pels, [0, 0, 0], [.4, .38, .38]);
    for (const s of [-1, 1]) {
      f.kugle(pels, [s * .27, .3, -.02], .14);
      f.kugle('#e7a97d', [s * .27, .3, .06], [.08, .08, .05]);
    }
    f.kugle(lys, [0, -.09, .31], [.2, .15, .13]);
    f.kugle(sort, [0, -.03, .43], [.07, .05, .04]);
    øjne(f, .14, .1, .33);
  }
  return f;
}

// ---------- Bilen ----------
// Bilens krop følger fysikkens chassis: 5,6 lang, med ladet bagtil og førerhuset foran.
export function bilKrop(bil) {
  const f = new Form(), lak = bil.farve, mørk = blandFarve(lak, '#000000', .28), lys = blandFarve(lak, '#ffffff', .35);
  f.kasse(mørkegrå, [-.1, -.3, 0], [5.0, .34, 1.7], .1);
  f.kasse(lak, [0, .02, 0], [5.8, .78, 2.5], .24);
  f.kasse(hvid, [-.5, .1, 1.255], [3.8, .13, .02]);
  f.kasse(hvid, [-.5, .1, -1.255], [3.8, .13, .02]);
  // Kofanger, baglygter, forlygter og grill
  f.kasse(sort, [-2.93, -.2, 0], [.24, .3, 2.36], .1);
  for (const z of [-.92, .92]) {
    f.kasse('#ff3b3b', [-2.92, .2, z], [.08, .2, .34], .03);
    f.cylinder('#fff3b0', [2.91, .18, z], .17, .08, [0, 0, Math.PI / 2]);
    f.cylinder(stål, [2.89, .18, z], .21, .05, [0, 0, Math.PI / 2]);
  }
  f.kasse(mørkegrå, [2.92, -.06, 0], [.05, .28, .9], .02);
  // Førerhuset: dør, stolper, tag og forrude. Sidevinduet er åbent, så man ser føreren.
  const fx = 1.55;
  f.kasse(lak, [fx, .72, 0], [1.55, .72, 2.46], .16);
  f.kasse(lys, [fx, 1.98, 0], [1.8, .26, 2.56], .12);
  f.kasse(lak, [fx + .7, 1.42, 0], [.18, 1.0, 2.36], .06);
  f.kasse('#bfe9ff', [fx + .76, 1.42, 0], [.05, .8, 2.0]);
  f.kasse(lak, [fx - .72, 1.42, 0], [.14, 1.0, 2.36], .05);
  f.kasse(hvid, [fx - .3, .88, 1.235], [.32, .07, .04], .02);
  f.cylinder(sort, [fx + .38, 1.18, .32], .2, .05, [0, 0, Math.PI / 2 + .55], 16);
  // Føreren og en lille trøje
  f.kasse(['#3a86ff', '#ff595e', '#8ac926', '#ffca3a'][['bjørn', 'gris', 'frø', 'kat'].indexOf(bil.fører)] || '#3a86ff', [fx - .05, 1.05, .3], [.6, .55, .62], .2);
  f.indsæt(fører(bil.fører), [fx - .02, 1.44, .3], [0, .5, 0]);
  // Ladets kanter
  for (const z of [-1.12, 1.12]) f.kasse(mørk, [-1.05, .5, z], [3.5, .26, .18], .08);
  f.kasse(mørk, [-2.76, .5, 0], [.18, .26, 2.42], .08);
  // Motoren kan ses på bilen
  if (bil.motor === 'racer') {
    f.kasse(stål, [2.58, .52, 0], [.42, .22, .8], .08);
    for (const z of [-1.3, 1.3]) f.cylinder(stål, [-1.2, -.28, z], .09, 1.8, [0, 0, Math.PI / 2], 12);
    const lyn = [[0, .26, -.4], [-.12, 0, .5], [-.24, -.26, -.4]];
    for (const [x, y, v] of lyn) f.kasse('#ffd23f', [fx - .2 + x, .7 + y * .6, 1.24], [.1, .34, .03], 0, [0, 0, v]);
  } else if (bil.motor === 'raket') {
    f.cylinder('#f4f6fa', [-3.3, .08, 0], .33, 1.1, [0, 0, Math.PI / 2]);
    f.cylinder('#ff4d4d', [-3.1, .08, 0], .345, .16, [0, 0, Math.PI / 2]);
    f.kegle(mørkegrå, [-3.98, .08, 0], .27, .34, [0, 0, Math.PI / 2]);
    for (const [y, z, v] of [[.42, 0, 0], [-.26, 0, Math.PI]]) f.kasse('#ff4d4d', [-3.55, .08 + y * .9, z], [.5, .28, .06], .02, [0, 0, v]);
  } else {
    f.cylinder(stål, [fx - .5, 2.1, -.95], .12, 1.7, undefined, 14);
    f.cylinder(mørkegrå, [fx - .5, 2.97, -.95], .16, .08, undefined, 14);
    f.kasse(stål, [2.93, -.02, 0], [.07, .42, 1.35], .03);
  }
  return f.færdig();
}

// Dækket er en drejet, rund profil; to dæk sidder på samme aksel.
export function hjul(radius, slags, farve) {
  const f = new Form();
  const bred = slags === 'monster' ? .78 : slags === 'hop' ? .66 : .5;
  const afrund = Math.min(bred * .45, radius * .32), punkter = [[radius * .52, -bred / 2]];
  for (let i = 0; i <= 6; i++) {
    const v = -Math.PI / 2 + i / 6 * Math.PI;
    punkter.push([radius - afrund + Math.cos(v) * afrund, Math.sin(v) * bred / 2]);
  }
  punkter.push([radius * .52, bred / 2]);
  const dæk = drejet(`dæk${radius}|${bred}`, punkter);
  const dækFarve = slags === 'hop' ? '#36cfc9' : '#2a2f3a';
  const fælg = slags === 'hop' ? hvid : slags === 'monster' ? '#ffd23f' : stål;
  for (const z of [-1.35, 1.35]) {
    f.læg(dæk, dækFarve, [0, 0, z], [Math.PI / 2, 0, 0]);
    f.cylinder(fælg, [0, 0, z], radius * .56, bred + .04, [Math.PI / 2, 0, 0], 20);
    f.kugle(farve, [0, 0, z + Math.sign(z) * (bred / 2 + .02)], [radius * .26, radius * .26, .1]);
    for (let i = 0; i < 5; i++) {
      const v = i / 5 * Math.PI * 2;
      f.kugle(mørkegrå, [Math.cos(v) * radius * .38, Math.sin(v) * radius * .38, z + Math.sign(z) * (bred / 2 + .03)], .045);
    }
    if (slags === 'monster') for (let i = 0; i < 14; i++) {
      const v = i / 14 * Math.PI * 2;
      f.kasse('#1e222b', [Math.cos(v) * (radius - .02), Math.sin(v) * (radius - .02), z], [.2, .16, bred * .92], .04, [0, 0, v]);
    }
    if (slags === 'hop') for (const dz of [-.18, .18]) f.cylinder(hvid, [0, 0, z + dz], radius + .005, .05, [Math.PI / 2, 0, 0], 24);
  }
  f.cylinder(mørkegrå, [0, 0, 0], .12, 2.4, [Math.PI / 2, 0, 0], 10);
  return f.færdig();
}

// Fronten er sin egen fysikdel, som kan knække af.
export function front(d) {
  const f = new Form();
  if (d.slags === 'plov') {
    f.læg(prisme(d.trekant, 2.6, .06), '#ff9f1c');
    const [, , spids] = d.trekant;
    for (let i = -2; i <= 2; i++) f.kegle(stål, [spids[0] - .05, spids[1] + .06, i * .5], .09, .3, [0, 0, -Math.PI / 2]);
    f.kasse(mørkegrå, [d.trekant[0][0] + .06, 0, 0], [.12, d.h * .9, 2.4], .04);
  } else if (d.slags === 'let') {
    f.kasse(sort, [0, 0, 0], [d.b, d.h, 2.4], .2);
    f.kasse(stål, [.28, 0, 0], [.5, .1, 2.46], .04);
  } else {
    f.kasse('#ffd23f', [0, 0, 0], [d.b, d.h, 2.3], .14);
    for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) f.kasse(sort, [i * .3, 0, s * 1.155], [.13, .8, .02], 0, [0, 0, .6]);
    f.kasse(stål, [d.b / 2 + .04, 0, 0], [.1, d.h * .82, 2.1], .04);
    for (const y of [-.3, .3]) for (const z of [-.8, 0, .8]) f.kugle(mørkegrå, [d.b / 2 + .1, y, z], .06);
  }
  return f.færdig();
}

// ---------- Lasten ----------
export const LASTFARVER = { benzin: '#ff8a1f', gas: '#3ccf4e', tnt: '#ef3b3b', blaa: '#2f9bff', lilla: '#a45cff' };

export function celle(slags) {
  const f = new Form(), farve = LASTFARVER[slags];
  if (slags === 'tnt') {
    // Et bundt dynamitstænger med tape og en lunte.
    for (const [x, z] of [[-.22, .1], [0, .2], [.22, .1], [-.11, -.15], [.11, -.15]]) {
      f.cylinder(farve, [x, -.05, z], .16, 1.25, undefined, 14);
      f.cylinder('#ffe066', [x, .6, z], .165, .06, undefined, 14);
    }
    for (const y of [-.35, .3]) f.kasse(mørkegrå, [0, y, .04], [.82, .14, .66], .06);
    f.cylinder('#6b4f3a', [0, .78, .2], .03, .3, [.3, 0, 0], 6);
    return f.færdig();
  }
  const tønde = drejet('tønde', [[0, -.7], [.38, -.7], [.43, -.62], [.46, -.3], [.47, 0], [.46, .3], [.43, .62], [.38, .7], [0, .7]], 20);
  f.læg(tønde, farve);
  for (const y of [-.4, .4]) f.cylinder(blandFarve(farve, '#ffffff', .55), [0, y, 0], .475, .1, undefined, 20);
  f.cylinder(blandFarve(farve, '#000000', .25), [0, .7, 0], .3, .04, undefined, 14);
  return f.færdig();
}

// Et tydeligt tegn på tønden, så selv de mindste kan se forskel på lasten.
const mærker = new Map();
export function mærke(slags) {
  if (mærker.has(slags)) return mærker.get(slags);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), farve = LASTFARVER[slags];
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.fillStyle = farve; g.strokeStyle = farve; g.lineWidth = 13; g.lineCap = 'round';
  if (slags === 'benzin') {
    g.beginPath(); g.moveTo(64, 14); g.bezierCurveTo(98, 50, 102, 74, 92, 92); g.bezierCurveTo(80, 116, 48, 116, 36, 92);
    g.bezierCurveTo(28, 74, 38, 58, 48, 50); g.bezierCurveTo(48, 64, 54, 70, 60, 70); g.bezierCurveTo(52, 50, 56, 32, 64, 14); g.fill();
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(64, 90, 14, 0, Math.PI * 2); g.fill();
  } else if (slags === 'gas') {
    for (const [x, y, r] of [[44, 74, 20], [66, 60, 26], [88, 76, 19], [64, 84, 20]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  } else if (slags === 'blaa') {
    for (const r of [16, 32, 48]) { g.beginPath(); g.arc(64, 64, r, -Math.PI * .8, -Math.PI * .2); g.stroke(); g.beginPath(); g.arc(64, 64, r, Math.PI * .2, Math.PI * .8); g.stroke(); }
  } else {
    g.beginPath();
    for (let i = 0; i < 70; i++) { const v = i / 70 * Math.PI * 4.2, r = 4 + i * .68; g.lineTo(64 + Math.cos(v) * r, 64 + Math.sin(v) * r); }
    g.stroke();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  mærker.set(slags, t);
  return t;
}

// ---------- Bygningerne ----------
const REGNBUE = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
const HUSE = [
  { facade: '#ffcf56', indre: '#fff1c4', tag: '#ef4d4d', dør: '#3a86ff' },
  { facade: '#7fd1f5', indre: '#e2f6ff', tag: '#ff9f1c', dør: '#ff595e' },
];
const STEN = '#c3bfe0', STENMØRK = '#a7a2cf';

function palet(d) {
  if (d.udseende === 'slot') return { facade: STEN, indre: '#e8e5f5', tag: d.husnr ? '#9b5de5' : '#4d6bff', dør: '#9b6b43', søjle: STEN, gulv: STENMØRK };
  if (d.udseende === 'regnbue') return { facade: REGNBUE[d.etage % REGNBUE.length], indre: '#fff8ef', tag: '#ff70a6', dør: '#ffffff', søjle: hvid, gulv: '#fff4e0' };
  return { ...HUSE[(d.husnr || 0) % HUSE.length], søjle: hvid, gulv: '#fff4e0' };
}

// En hjørnesøjle mellem to etager.
export function mur(d) {
  const f = new Form(), p = palet(d);
  f.kasse(p.søjle, [0, 0, 0], [d.b, d.h, 3.4], .08);
  if (d.udseende === 'slot') for (const y of [-.4, .35]) f.kasse(STENMØRK, [0, y, 1.71], [d.b * .9, .05, .02]);
  return f.færdig();
}

// Et gulv bærer også facaden på etagen under sig: vægge med åbne vinduer, så man kan se ind.
export function bjælke(d) {
  const f = new Form(), p = palet(d), B = d.b, W = B - 1.24;
  f.kasse(p.gulv, [0, 0, 0], [B, .22, 3.6], .06);
  const bund = -1.62, top = -.11, z = 1.58;
  f.kasse(p.indre, [0, (bund + top) / 2, -1.55], [W + .1, top - bund, .12]);
  const antal = Math.max(1, Math.round(W / 2.2)), slot = d.udseende === 'slot';
  const vb = slot ? .42 : Math.min(1.25, W / antal - .55), vh = slot ? .78 : .72, vy = -.84;
  // Facaden lægges i bånd omkring vinduerne.
  f.kasse(p.facade, [0, (bund + vy - vh / 2) / 2, z], [W, vy - vh / 2 - bund, .16]);
  f.kasse(p.facade, [0, (vy + vh / 2 + top) / 2, z], [W, top - vy - vh / 2, .16]);
  const midter = Array.from({ length: antal }, (_, i) => -W / 2 + W / antal * (i + .5));
  let fra = -W / 2;
  for (const mx of midter) {
    f.kasse(p.facade, [(fra + mx - vb / 2) / 2, vy, z], [mx - vb / 2 - fra, vh, .16]);
    fra = mx + vb / 2;
  }
  f.kasse(p.facade, [(fra + W / 2) / 2, vy, z], [W / 2 - fra, vh, .16]);
  for (const [i, mx] of midter.entries()) {
    if (d.etage === 0 && i === midter.length - 1 && !slot) {
      // Hoveddøren i stueetagen
      f.kasse(p.dør, [mx, -1.02, z + .1], [Math.min(.95, vb), 1.12, .08], .05);
      f.kugle('#ffd23f', [mx + .3, -1.0, z + .17], .06);
      continue;
    }
    if (slot) {
      f.kasse(STENMØRK, [mx, vy, z + .09], [vb + .14, vh + .14, .04]);
      continue;
    }
    // Hvid vinduesramme, sprosse og en blomsterkasse
    for (const s of [-1, 1]) {
      f.kasse(hvid, [mx + s * (vb / 2 + .04), vy, z + .1], [.09, vh + .16, .06]);
      f.kasse(hvid, [mx, vy + s * (vh / 2 + .04), z + .1], [vb + .16, .09, .06]);
    }
    f.kasse(hvid, [mx, vy, z - .02], [.05, vh, .04]);
    if ((d.etage + i) % 2 === 0) {
      f.kasse('#8d5a3b', [mx, vy - vh / 2 - .14, z + .2], [vb * .85, .16, .2], .04);
      for (let k = -1; k <= 1; k++) f.kugle(['#ff595e', '#ffca3a', '#ff70a6'][(k + 3 + i) % 3], [mx + k * vb * .28, vy - vh / 2 - .02, z + .22], .09);
    }
  }
  if (slot) for (let i = 0; i < 3; i++) f.kasse(STENMØRK, [-W / 2 + W * (i + .5) / 3, -.45, z + .085], [.03, .3, .02]);
  return f.færdig();
}

// Taget: et rødt sadeltag med gavl og skorsten, et lyserødt spir eller et blåt kegletag på slottet.
export function tag(d) {
  const f = new Form(), p = palet(d), [v, h, t] = d.trekant, H = d.h;
  if (d.udseende === 'slot') {
    f.cylinder(STENMØRK, [0, v[1] + .12, 0], d.b / 2 - .15, .24, undefined, 20);
    f.kegle(p.tag, [0, v[1] + H / 2 + .1, 0], d.b / 2 - .25, H, undefined);
    flag(f, [t[0], t[1] + .1, 0], d.husnr ? '#ffd23f' : '#ff4d4d');
    return f.færdig();
  }
  f.læg(prisme(d.trekant, 3.9, .07), p.tag);
  const midt = [0, v[1] + (t[1] - v[1]) * .36];
  const gavl = [v, h, t].map(([x, y]) => [(x - midt[0]) * .72 + midt[0], (y - midt[1]) * .72 + midt[1]]);
  f.læg(prisme(gavl, 3.98, 0), d.udseende === 'regnbue' ? '#fff4e0' : p.facade);
  f.cylinder(hvid, [0, midt[1] - .05, 2.02], .3, .06, [Math.PI / 2, 0, 0], 20);
  f.cylinder('#bfe9ff', [0, midt[1] - .05, 2.05], .22, .04, [Math.PI / 2, 0, 0], 20);
  if (d.udseende === 'regnbue') flag(f, [t[0], t[1] + .05, 0], '#ffd23f');
  else {
    const sx = h[0] * .45, sy = t[1] - (sx / h[0]) * (t[1] - h[1]);
    f.kasse('#c0504d', [sx, sy + .3, -.7], [.5, 1.1, .55], .04);
    f.kasse(mørkegrå, [sx, sy + .88, -.7], [.62, .12, .66], .03);
  }
  return f.færdig();
}

function flag(f, [x, y, z], farve) {
  f.cylinder(stål, [x, y + .7, z], .05, 1.4, undefined, 8);
  f.kugle('#ffd23f', [x, y + 1.42, z], .09);
  f.læg(prisme([[0, 0], [0, .55], [.85, .27]], .04, 0), farve, [x + .04, y + .78, z]);
}

// Legeklodser med et tegn på forsiden, og sten til slotsmuren.
const KLODSFARVER = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#ff924c'];
export function klods(d) {
  const f = new Form();
  if (d.udseende === 'sten') {
    const tone = [STEN, '#cbc7e6', '#b8b3d9'][d.id % 3];
    f.kasse(tone, [0, 0, 0], [d.b - .04, d.h - .04, 3.0], .1);
    return f.færdig();
  }
  const farve = KLODSFARVER[d.farvenr % KLODSFARVER.length], s = d.b;
  f.kasse(farve, [0, 0, 0], [s, s, s], .16);
  const lys = blandFarve(farve, '#ffffff', .3), z = s / 2;
  f.kasse(lys, [0, 0, z], [s * .72, s * .72, .06], .04);
  const tegn = d.farvenr % 4;
  if (tegn === 0) f.cylinder(hvid, [0, 0, z + .04], .3, .05, [Math.PI / 2, 0, 0], 20);
  else if (tegn === 1) f.læg(prisme([[-.32, -.26], [.32, -.26], [0, .32]], .05, 0), hvid, [0, 0, z + .04]);
  else if (tegn === 2) f.kasse(hvid, [0, 0, z + .04], [.5, .5, .05], 0, [0, 0, Math.PI / 4]);
  else {
    f.kasse(hvid, [0, 0, z + .04], [.56, .17, .05]);
    f.kasse(hvid, [0, 0, z + .04], [.17, .56, .05]);
  }
  return f.færdig();
}

// Rampen er en orange kile med hvide pile, der viser vejen op.
export function rampe(d) {
  const f = new Form(), [a, , c] = d.trekant;
  f.læg(prisme(d.trekant, 4, .06), '#ff9f1c');
  const vinkel = Math.atan2(c[1] - a[1], c[0] - a[0]);
  for (const t of [.25, .5, .75]) {
    const x = a[0] + (c[0] - a[0]) * t, y = a[1] + (c[1] - a[1]) * t;
    f.kasse(hvid, [x - Math.sin(vinkel) * .03, y + Math.cos(vinkel) * .03, 0], [.4, .06, 3.2], 0, [0, 0, vinkel]);
  }
  f.kasse('#d9792a', [c[0] - .1, (a[1] + c[1]) / 2, 0], [.18, c[1] - a[1], 3.6]);
  return f.færdig();
}
