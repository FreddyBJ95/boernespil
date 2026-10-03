// ===== En lille læser til 3D-modellerne fra Blender (.glb) =====
// Modellerne er lavet med blender/tegnestue.py: punkter, en farve i hvert punkt (med skygger bagt ind),
// trekanter, materialer (ru, blank eller metal) og led med navne, som spillet kan bevæge.
// Normalerne regnes ud her i stedet for at ligge i filen, så filerne bliver mindre.
// Den læser kun det, vores egne modeller bruger — ikke billeder, knogler eller animationer.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const TYPER = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const ANTAL = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

// Hent en model én gang — beder flere om den samme, får de det samme svar
const hentet = new Map();
export function hentGLB(url) {
  const nøgle = String(url);
  if (!hentet.has(nøgle)) {
    hentet.set(nøgle, fetch(url)
      .then(svar => { if (!svar.ok) throw new Error("kunne ikke hente " + nøgle); return svar.arrayBuffer(); })
      .then(læsGLB));
  }
  return hentet.get(nøgle);
}

// Læs filen: først et JSON-afsnit (beskrivelsen), så et binært afsnit (tallene)
export function læsGLB(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error("ikke en GLB-fil");
  let j = null, bin = null;
  for (let o = 12; o + 8 <= buf.byteLength;) {
    const længde = dv.getUint32(o, true), type = dv.getUint32(o + 4, true);
    if (type === 0x4E4F534A) j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o + 8, længde)));
    else if (type === 0x004E4942) bin = buf.slice(o + 8, o + 8 + længde);
    o += 8 + længde;
  }
  return byg(j, bin);
}

// Byg three.js-objekter ud fra beskrivelsen
function byg(j, bin) {
  // en liste af tal (punkter, farver eller trekanter)
  function attribut(i) {
    const a = j.accessors[i], bv = j.bufferViews[a.bufferView], T = TYPER[a.componentType], n = ANTAL[a.type];
    const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
    return new THREE.BufferAttribute(new T(bin.slice(start, start + a.count * n * T.BYTES_PER_ELEMENT)), n, !!a.normalized);
  }
  // materialerne: farven kommer fra punkterne, så her er kun ruhed, metal og glans
  const mater = (j.materials || []).map(m => {
    const p = m.pbrMetallicRoughness || {}, glans = m.extensions && m.extensions.KHR_materials_clearcoat;
    return new THREE.MeshStandardMaterial({
      name: m.name || "", vertexColors: true,
      color: p.baseColorFactor ? new THREE.Color().fromArray(p.baseColorFactor) : 0xffffff,
      roughness: (p.roughnessFactor !== undefined ? p.roughnessFactor : 1) * (glans ? 0.6 : 1),
      metalness: p.metallicFactor !== undefined ? p.metallicFactor : 1,
      side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });
  });
  const standard = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  // formerne (en form kan have flere dele med hvert sit materiale)
  const former = (j.meshes || []).map(m => m.primitives.map(p => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", attribut(p.attributes.POSITION));
    if (p.attributes.COLOR_0 !== undefined) geo.setAttribute("color", attribut(p.attributes.COLOR_0));
    if (p.indices !== undefined) geo.setIndex(attribut(p.indices));
    geo.computeVertexNormals();
    return { geo, mat: p.material !== undefined ? mater[p.material] : standard };
  }));
  // leddene: hvert led har et navn, en plads, en drejning og en størrelse
  const led = j.nodes.map(n => {
    let o;
    if (n.mesh !== undefined) {
      const dele = former[n.mesh];
      if (dele.length === 1) o = new THREE.Mesh(dele[0].geo, dele[0].mat);
      else { o = new THREE.Group(); for (const d of dele) o.add(new THREE.Mesh(d.geo, d.mat)); }
    } else o = new THREE.Group();
    o.name = n.name || "";
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    return o;
  });
  j.nodes.forEach((n, i) => (n.children || []).forEach(b => led[i].add(led[b])));
  const rod = new THREE.Group();
  const sc = j.scenes ? j.scenes[j.scene || 0] : { nodes: led.map((_, i) => i).filter(i => !led[i].parent) };
  for (const i of sc.nodes) rod.add(led[i]);
  return rod;
}

// ---------- Smelt små dele sammen, så iPad'en skal tegne færre ting ----------
// Alle løse dele i et led med samme materiale bliver til én form. Led med børn (fx øjne og hænder,
// som spillet bevæger) får lov at være i fred, og det samme gør dele, hvor behold(navn) siger ja.
export function smelt(rod, behold = () => false) {
  rod.updateMatrixWorld(true);
  (function gå(led) {
    const løse = led.children.filter(b => b.isMesh && !b.children.length && !behold(b.name));
    for (const b of led.children) if (!løse.includes(b)) gå(b);
    if (løse.length < 2) return;
    const ind = new THREE.Matrix4().copy(led.matrixWorld).invert(), efterMat = new Map();
    for (const m of løse) {
      if (!efterMat.has(m.material)) efterMat.set(m.material, []);
      efterMat.get(m.material).push(m);
      led.remove(m);
    }
    for (const [materiale, dele] of efterMat) led.add(new THREE.Mesh(sammen(dele, ind), materiale));
  })(rod);
  return rod;
}
// Læg formerne efter hinanden i én stor form (punkter, normaler, farver og trekanter)
function sammen(dele, ind) {
  const antal = dele.reduce((s, m) => s + m.geometry.attributes.position.count, 0);
  const trek = dele.reduce((s, m) => s + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count), 0);
  const første = dele[0].geometry.attributes.color;
  const pos = new Float32Array(antal * 3), nor = new Float32Array(antal * 3);
  const farve = første ? new første.array.constructor(antal * 4) : null, fuld = første && første.normalized ? (første.array.constructor === Uint8Array ? 255 : 65535) : 1;
  const idx = antal > 65535 ? new Uint32Array(trek) : new Uint16Array(trek);
  const v = new THREE.Vector3(), m4 = new THREE.Matrix4(), m3 = new THREE.Matrix3();
  let p0 = 0, i0 = 0;
  for (const m of dele) {
    const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, F = g.attributes.color;
    m4.multiplyMatrices(ind, m.matrixWorld); m3.getNormalMatrix(m4);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m4); v.toArray(pos, (p0 + i) * 3);
      v.fromBufferAttribute(N, i).applyMatrix3(m3).normalize(); v.toArray(nor, (p0 + i) * 3);
      if (farve) for (let k = 0; k < 4; k++) farve[(p0 + i) * 4 + k] = F ? (F.itemSize === 4 || k < 3 ? F.array[i * F.itemSize + k] : fuld) : fuld;
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[i0 + i] = g.index.array[i] + p0;
    else for (let i = 0; i < P.count; i++) idx[i0 + i] = p0 + i;
    p0 += P.count; i0 += g.index ? g.index.count : P.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  if (farve) geo.setAttribute("color", new THREE.BufferAttribute(farve, 4, første.normalized));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}
