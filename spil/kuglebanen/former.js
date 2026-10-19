// ===== Geometri-hjælpere til Kuglebanen =====
// rundKasse: en kasse med bløde kanter, ligesom legetøj.
// bag: smelter mange små dele med samme materiale sammen, så iPad'en tegner dem på én gang.
import * as THREE from "./three.js";

// ---------- Kasse med runde kanter ----------
// Bygget på BoxGeometry, så hver side stadig har sin egen gruppe (top, sider, bund kan få hvert sit materiale)
export function rundKasse(b, h, d, r = 0.1, k = 3) {
  r = Math.max(0.001, Math.min(r, b / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const n = 2 * k + 1;
  const geo = new THREE.BoxGeometry(1, 1, 1, n, n, n);
  const p = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
  const indre = [b / 2 - r, h / 2 - r, d / 2 - r];
  const a = [0, 0, 0], c = [0, 0, 0];
  for (let i = 0; i < p.count; i++) {
    const fx = nrm.getX(i), fy = nrm.getY(i), fz = nrm.getZ(i);   // hvilken side punktet hører til
    const u = [p.getX(i), p.getY(i), p.getZ(i)];
    for (let ax = 0; ax < 3; ax++) {
      const idx = Math.round((u[ax] + 0.5) * n);
      if (idx <= k) { a[ax] = -(k - idx) / k; c[ax] = -indre[ax]; }
      else { a[ax] = (idx - k - 1) / k; c[ax] = indre[ax]; }
    }
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    const nx = a[0] / l, ny = a[1] / l, nz = a[2] / l;
    const x = c[0] + nx * r, y = c[1] + ny * r, z = c[2] + nz * r;
    p.setXYZ(i, x, y, z);
    nrm.setXYZ(i, nx, ny, nz);
    // billedet på hver side strækkes over hele siden (også de runde kanter), ligesom på en almindelig kasse
    if (fx > 0.5) uv.setXY(i, 0.5 - z / d, 0.5 + y / h);
    else if (fx < -0.5) uv.setXY(i, 0.5 + z / d, 0.5 + y / h);
    else if (fy > 0.5) uv.setXY(i, 0.5 + x / b, 0.5 - z / d);
    else if (fy < -0.5) uv.setXY(i, 0.5 + x / b, 0.5 + z / d);
    else if (fz > 0.5) uv.setXY(i, 0.5 + x / b, 0.5 + y / h);
    else uv.setXY(i, 0.5 - x / b, 0.5 + y / h);
  }
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// ---------- Smelt geometrier sammen ----------
// Alle får position, normal og uv (og farve, hvis bare én af dem har det)
export function smelt(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) {
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const farve = geos.some(g => g.attributes.color);
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const col = farve ? new Float32Array(nv * 3).fill(1) : null;
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0, oi = 0;
  for (const g of geos) {
    const P = g.attributes.position, N = g.attributes.normal, T = g.attributes.uv, C = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      const o = (ov + i) * 3;
      pos[o] = P.getX(i); pos[o + 1] = P.getY(i); pos[o + 2] = P.getZ(i);
      if (N) { nor[o] = N.getX(i); nor[o + 1] = N.getY(i); nor[o + 2] = N.getZ(i); }
      if (T) { uv[(ov + i) * 2] = T.getX(i); uv[(ov + i) * 2 + 1] = T.getY(i); }
      if (C && col) { col[o] = C.getX(i); col[o + 1] = C.getY(i); col[o + 2] = C.getZ(i); }
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[oi++] = g.index.getX(i) + ov;
    else for (let i = 0; i < P.count; i++) idx[oi++] = ov + i;
    ov += P.count;
  }
  const ud = new THREE.BufferGeometry();
  ud.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  ud.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  ud.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (col) ud.setAttribute("color", new THREE.BufferAttribute(col, 3));
  ud.setIndex(new THREE.BufferAttribute(idx, 1));
  ud.computeBoundingSphere();
  return ud;
}

// Kun de trekanter, der hører til én gruppe (én side af en kasse), med deres egne hjørner
function delAf(geo, start, antal) {
  const idx = geo.index, P = geo.attributes.position, N = geo.attributes.normal, T = geo.attributes.uv, C = geo.attributes.color;
  const nyt = new Map(), liste = [];
  const ind = [];
  for (let i = start; i < start + antal; i++) {
    const v = idx ? idx.getX(i) : i;
    if (!nyt.has(v)) { nyt.set(v, liste.length); liste.push(v); }
    ind.push(nyt.get(v));
  }
  const g = new THREE.BufferGeometry();
  const kopi = (A, n) => { if (!A) return null; const a = new Float32Array(liste.length * n); liste.forEach((v, i) => { for (let k = 0; k < n; k++) a[i * n + k] = A.array[v * A.itemSize + k]; }); return new THREE.BufferAttribute(a, n); };
  g.setAttribute("position", kopi(P, 3));
  if (N) g.setAttribute("normal", kopi(N, 3));
  if (T) g.setAttribute("uv", kopi(T, 2));
  if (C) g.setAttribute("color", kopi(C, 3));
  g.setIndex(ind);
  return g;
}

// ---------- Bag stille pynt sammen ----------
// Dele med samme materiale (og samme skygge-indstilling) bliver til ét mesh — også de enkelte sider
// af kasser med flere materialer. Dele mærket userData.levende bliver stående for sig selv.
export function bag(rod) {
  rod.updateMatrixWorld(true);
  const grupper = new Map(), enkelte = [];
  const læg = (mat, o, g) => {
    const nøgle = `${mat.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}`;
    if (!grupper.has(nøgle)) grupper.set(nøgle, { mat, kast: o.castShadow, modtag: o.receiveShadow, geos: [] });
    g.applyMatrix4(o.matrixWorld);
    grupper.get(nøgle).geos.push(g);
  };
  rod.traverse(o => {
    if (!o.isMesh) return;
    if (o.userData.levende || o.geometry.attributes.position.array.length !== o.geometry.attributes.position.count * 3) { enkelte.push(o); return; }
    if (Array.isArray(o.material)) {
      const grp = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count, materialIndex: 0 }];
      for (const gr of grp) { const m = o.material[gr.materialIndex]; if (m && gr.count) læg(m, o, delAf(o.geometry, gr.start, gr.count)); }
    } else læg(o.material, o, o.geometry.clone());
  });
  const ud = new THREE.Group();
  for (const { mat, kast, modtag, geos } of grupper.values()) {
    const m = new THREE.Mesh(smelt(geos), mat);
    m.castShadow = kast; m.receiveShadow = modtag;
    ud.add(m);
    geos.forEach(g => g.dispose());
  }
  for (const o of enkelte) {
    const kopi = new THREE.Mesh(o.geometry, o.material);
    o.matrixWorld.decompose(kopi.position, kopi.quaternion, kopi.scale);
    kopi.castShadow = o.castShadow; kopi.receiveShadow = o.receiveShadow;
    kopi.userData = o.userData;
    ud.add(kopi);
  }
  return ud;
}
