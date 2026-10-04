// ===== Vejret: dag, nat eller storm (vælges i menuen) =====
//  · Dag:   som banen er bygget
//  · Nat:   mørk himmel med stjerner og måne, gadelamper (lyset er bagt i Blender til natten) og lommelygter —
//           både din (tast F) og botternes, så man kan se dem komme i mørket
//  · Storm: hver bane har sin egen: sandstorm (Støvbyen), regn med lyn og torden (Havnen og Museet) eller snestorm
//           (Fjeldbyen). Tåge, vind og partikler, der blæser forbi kameraet — og man kan ikke se så langt
// Botterne kan heller ikke se så langt i mørke og storm.

import * as THREE from "./three.js";

// Indstillingerne for hver slags vejr
const OPSÆTNING = {
  nat: { tåge: [0x080c18, 22, 150], himmel: [0x01030a, 0x060c1c, 0x0c1424], sol: [-0.35, 0.62, -0.5], solFarve: 0x8aa4d8, solStyrke: 0.32, omgivelse: 0.05, syn: 45 },
  sand: { tåge: [0xc89c68, 5, 62], himmel: [0xb08a5a, 0xc8a070, 0xd8b484], solFarve: 0xffd8a0, solStyrke: 1.3, omgivelse: 0.32, lys: 0.72, syn: 38, vind: [9, 0, 2], partikel: 0xc89a62, antal: 4500, størrelse: 0.07 },
  regn: { tåge: [0x56606c, 14, 115], himmel: [0x3a4450, 0x5a646e, 0x6a7480], solFarve: 0xc8d4e8, solStyrke: 0.7, omgivelse: 0.26, lys: 0.58, syn: 65, lyn: true },
  sne: { tåge: [0xd8e0e8, 7, 55], himmel: [0xa8b4c4, 0xc8d2de, 0xe0e6ee], solFarve: 0xf0f4ff, solStyrke: 1.0, omgivelse: 0.3, lys: 0.8, syn: 42, vind: [7, -2.5, 3], partikel: 0xffffff, antal: 5000, størrelse: 0.1 },
};

// Sæt vejret på scenen. k: { scene, sol, solRet, himmel, omgivelse (lyset overalt), masker (banens flader med bagt lys) }
export function lavVejr(type, storm, k) {
  const navn = type === "nat" ? "nat" : type === "storm" ? storm : null, o = OPSÆTNING[navn];
  const tom = { opdater() {}, synsvidde: 90, nat: false, lyd: null, lygte: null, håndLys: 1 };
  if (!o) return tom;
  const { scene, sol, solRet, himmel } = k;
  scene.fog.color.set(o.tåge[0]); scene.fog.near = o.tåge[1]; scene.fog.far = o.tåge[2];
  ["top", "midt", "bund"].forEach((n, i) => himmel.material.uniforms[n].value.set(o.himmel[i]));
  if (o.sol) { solRet.set(...o.sol).normalize(); sol.position.copy(solRet).multiplyScalar(120); }
  sol.color.set(o.solFarve); sol.intensity = o.solStyrke;
  if (k.omgivelse) k.omgivelse.intensity = o.omgivelse;
  if (o.lys) for (const m of k.masker) if (m.material.lightMap) m.material.lightMapIntensity *= o.lys;   // overskyet: det bagte lys dæmpes
  // ting langt væk uden tåge (fjeldene om Fjeldbyen): mørke om natten — og væk i stormen
  scene.traverse(x => { if (x.isMesh && x.material?.fog === false && x.material.emissive) { if (navn === "nat") { x.material.emissive.multiplyScalar(0.08); x.material.color.multiplyScalar(0.25); } else x.visible = false; } });
  const v = { ...tom, synsvidde: o.syn, nat: navn === "nat", lyd: navn === "regn" ? "regn" : navn === "nat" ? null : "vind", håndLys: navn === "nat" ? 0.22 : 0.7 };
  himmel.material.uniforms.glød.value = navn === "nat" ? 0.12 : 0.35;      // (solens skær på himlen: svagt i storm, næsten væk om natten)
  const dele = [];                                                 // ting, der skal opdateres hvert billede

  if (navn === "nat") {
    // stjernerne og månen (himlen følger kameraet)
    const n = 1600, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); p.set([Math.cos(a) * r * 420, Math.abs(u) * 420 + 10, Math.sin(a) * r * 420], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const stjerner = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    const måne = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe8ecf4, fog: false }));
    scene.add(stjerner, måne);
    dele.push((dt, kam) => { stjerner.position.copy(kam.position); måne.position.copy(kam.position).addScaledVector(solRet, 400); });
    // din lommelygte (tast F) og botternes
    v.lygte = lygte(scene, 3.2);
    const lygter = new Map();
    dele.push((dt, kam, folk, tændt) => {
      kam.updateMatrixWorld();
      const frem = new THREE.Vector3(0, 0, -1).applyQuaternion(kam.quaternion);
      v.lygte.visible = tændt; v.lygte.position.copy(kam.position).addScaledVector(frem, 0.3).add(new THREE.Vector3(0.15, -0.18, 0));
      v.lygte.target.position.copy(kam.position).addScaledVector(frem, 10);
      for (const f of folk) {
        if (f.erSpiller) continue;
        let l = lygter.get(f); if (!l) { l = lygte(scene, 2.2); lygter.set(f, l); }
        l.visible = !f.død && f.model.visible;
        if (!l.visible) continue;
        const a = f.a, c = Math.cos(a.pitch), r = new THREE.Vector3(-Math.sin(a.yaw) * c, Math.sin(a.pitch), -Math.cos(a.yaw) * c);
        l.position.set(a.pos.x, a.pos.y + 1.35 - 0.4 * a.duk, a.pos.z).addScaledVector(r, 0.45);
        l.target.position.copy(l.position).addScaledVector(r, 10);
      }
    });
  } else {
    // vind og nedbør: partikler i en kasse rundt om kameraet (regn er streger, sne og sand er prikker)
    const regn = navn === "regn", B = regn ? 40 : 28, H = regn ? 22 : 16, N = regn ? 2200 : o.antal, basis = new Float32Array(N * 3);   // (en tæt kasse, så stormen føles tæt)
    for (let i = 0; i < N * 3; i++) basis[i] = Math.random() * (i % 3 === 1 ? H : B);
    const pos = new Float32Array(N * 3 * (regn ? 2 : 1)), g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const objekt = regn ? new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.45 }))
      : new THREE.Points(g, new THREE.PointsMaterial({ color: o.partikel, size: o.størrelse, map: rundPrik(), transparent: true, opacity: navn === "sand" ? 0.5 : 0.85, depthWrite: false }));
    objekt.frustumCulled = false; scene.add(objekt);
    const vind = regn ? [2, -17, 0.8] : o.vind, mod = (a, n) => ((a % n) + n) % n;
    let tid = 0;
    dele.push((dt, kam) => {
      tid += dt;
      for (let i = 0; i < N; i++) {
        const j = i * 3, svaj = regn ? 0 : Math.sin(tid * 2 + i) * 0.6;
        const x = kam.position.x - B / 2 + mod(basis[j] + vind[0] * tid + svaj - kam.position.x, B);
        const y = kam.position.y - H * 0.35 + mod(basis[j + 1] + vind[1] * tid - kam.position.y, H);
        const z = kam.position.z - B / 2 + mod(basis[j + 2] + vind[2] * tid - kam.position.z, B);
        if (regn) pos.set([x, y, z, x - 0.05, y + 0.55, z - 0.02], i * 6); else pos.set([x, y, z], j);
      }
      g.attributes.position.needsUpdate = true;
    });
    // lyn og torden (i regnvejr): et hvidt blink og et brag lidt efter
    if (o.lyn) {
      let næste = 6 + Math.random() * 10, blink = 0;
      const grund = o.omgivelse, farver = o.himmel.map(f => new THREE.Color(f));
      dele.push(dt => {
        if ((næste -= dt) <= 0) { næste = 8 + Math.random() * 14; blink = 0.35; v.torden?.(0.3 + Math.random() * 1.5); }
        blink = Math.max(0, blink - dt);
        const f = blink > 0.22 || (blink > 0.05 && blink < 0.12) ? 1 : 0;
        if (k.omgivelse) k.omgivelse.intensity = grund + f * 2.2;
        ["top", "midt", "bund"].forEach((n, i) => himmel.material.uniforms[n].value.copy(farver[i]).lerp(new THREE.Color(0xdde4ff), f * 0.7));
      });
    }
  }
  v.opdater = (dt, kam, folk, lygteTændt) => { for (const d of dele) d(dt, kam, folk, lygteTændt); };
  return v;
}

// En blød, rund prik (til sne og sand — ellers er partiklerne firkanter)
function rundPrik() {
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.5, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
// En lommelygte: et lys, der lyser i en kegle frem
function lygte(scene, styrke) {
  const l = new THREE.SpotLight(0xfff0d8, styrke, 45, 0.4, 0.6, 0.75);   // (blødt fald: ikke hvidt helt tæt på, men når stadig langt)
  scene.add(l, l.target);
  return l;
}
