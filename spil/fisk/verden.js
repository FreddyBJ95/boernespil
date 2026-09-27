// ===== Verdenen: sø, brygge, himmel, træer, åkander, siv og en and =====

import * as THREE from "./three.js";

const SØ = new THREE.Vector3(0, 0, -25);              // søens midte
const std = (farve, x = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: 0.8, ...x });
const rnd = (a, b) => a + Math.random() * (b - a);

// Vandets højde et givet sted — bruges også til flåd, and og åkander
export function bølge(x, z, t) {
  return Math.sin(x * 0.35 + t * 1.1) * 0.07 + Math.sin(z * 0.42 + t * 1.4) * 0.055 + Math.sin((x - z) * 0.9 + t * 2.2) * 0.025;
}

function glød(farve) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.25, farve); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function byggVerden(scene, renderer) {
  const opd = [], dummy = new THREE.Object3D(), c = new THREE.Color();

  // ---------- himmel, tåge og lys ----------
  const HORISONT = new THREE.Color("#d4f0ff");
  scene.background = HORISONT.clone();
  scene.fog = new THREE.Fog(HORISONT, 80, 430);
  const himmelGeo = new THREE.SphereGeometry(520, 32, 20), hp = himmelGeo.attributes.position, hf = [];
  const top = new THREE.Color("#3b97f5"), hor = new THREE.Color("#d4f0ff"), bundF = new THREE.Color("#a8d8c8");
  for (let i = 0; i < hp.count; i++) {
    const y = hp.getY(i) / 520;
    if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.55)); else c.copy(hor).lerp(bundF, Math.min(1, -y * 5));
    hf.push(c.r, c.g, c.b);
  }
  himmelGeo.setAttribute("color", new THREE.Float32BufferAttribute(hf, 3));
  const himmelMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const himmel = new THREE.Mesh(himmelGeo, himmelMat);
  himmel.renderOrder = -1;
  scene.add(himmel);

  const solRetning = new THREE.Vector3(-120, 110, -300).normalize();
  // Omgivelser til spejlinger i vand, guld og disko
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(himmelGeo, himmelMat));
  const solKugle = new THREE.Mesh(new THREE.SphereGeometry(45, 16, 12), new THREE.MeshBasicMaterial({ color: "#fffbe0" }));
  solKugle.position.copy(solRetning).multiplyScalar(400);
  envScene.add(solKugle);
  const envJord = new THREE.Mesh(new THREE.CircleGeometry(500, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#5f9e4a" }));
  envJord.position.y = -30;
  envScene.add(envJord);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.03, 0.1, 1200).texture;
  pmrem.dispose();

  const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: glød("#fff3b0"), fog: false, depthWrite: false, transparent: true }));
  sol.position.copy(solRetning).multiplyScalar(480);
  sol.scale.setScalar(110);
  scene.add(sol);

  scene.add(new THREE.HemisphereLight("#e3f4ff", "#5d8a4a", 0.9));
  const sollys = new THREE.DirectionalLight("#fff2d6", 2.2);
  sollys.position.set(-20, 40, 30);
  scene.add(sollys);

  // ---------- vand med bølger ----------
  const vandGeo = new THREE.PlaneGeometry(240, 240, 96, 96).rotateX(-Math.PI / 2);
  const vand = new THREE.Mesh(vandGeo, new THREE.MeshStandardMaterial({
    color: "#1d8fc7", roughness: 0.12, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.88,
  }));
  vand.position.copy(SØ);
  vand.frustumCulled = false;
  scene.add(vand);
  const vp = vandGeo.attributes.position;
  opd.push(t => {
    for (let i = 0; i < vp.count; i++) vp.setY(i, bølge(vp.getX(i) + SØ.x, vp.getZ(i) + SØ.z, t));
    vp.needsUpdate = true;
  });
  const bund = new THREE.Mesh(new THREE.PlaneGeometry(240, 240).rotateX(-Math.PI / 2), std("#2f5d46"));
  bund.position.set(SØ.x, -2.5, SØ.z);
  scene.add(bund);

  // ---------- land, strand, bakker og bjerge ----------
  const land = new THREE.Mesh(new THREE.RingGeometry(84, 700, 80, 4).rotateX(-Math.PI / 2), std("#6cbf4a", { flatShading: true }));
  land.position.set(SØ.x, 0.4, SØ.z);
  scene.add(land);
  const strand = new THREE.Mesh(new THREE.RingGeometry(79, 86, 80, 1).rotateX(-Math.PI / 2), std("#efd9a1"));
  strand.position.set(SØ.x, 0.22, SØ.z);
  scene.add(strand);

  const bakkeGeo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 9; i++) {
    const a = rnd(3.4, 6.0), r = rnd(150, 220);
    const m = new THREE.Mesh(bakkeGeo, std(["#5aa845", "#6fb84f", "#4f9a3f"][i % 3], { flatShading: true }));
    m.position.set(SØ.x + Math.cos(a) * r, -4, SØ.z + Math.sin(a) * r);
    m.scale.set(rnd(40, 70), rnd(16, 30), rnd(30, 50));
    m.rotation.y = rnd(0, 3);
    scene.add(m);
  }
  for (let i = 0; i < 6; i++) {
    const a = 3.5 + i * 0.48 + rnd(-0.12, 0.12), r = rnd(300, 360), h = rnd(90, 140);
    const x = SØ.x + Math.cos(a) * r, z = SØ.z + Math.sin(a) * r;
    const bjerg = new THREE.Mesh(new THREE.ConeGeometry(h * 0.7, h, 6), std("#8fa9c4", { flatShading: true }));
    bjerg.position.set(x, h / 2 - 5, z);
    scene.add(bjerg);
    const sne = new THREE.Mesh(new THREE.ConeGeometry(h * 0.225, h * 0.3, 6), std("#ffffff", { flatShading: true }));
    sne.position.set(x, h - 5 - h * 0.15 + 0.3, z);
    scene.add(sne);
  }

  // ---------- træer rundt om søen ----------
  const granGeo = new THREE.ConeGeometry(1, 1, 7); granGeo.translate(0, 0.5, 0);
  const kroneGeo = new THREE.IcosahedronGeometry(1, 0);
  const stammeGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 6); stammeGeo.translate(0, 0.5, 0);
  const træMat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });
  const N = 140;
  const graner = new THREE.InstancedMesh(granGeo, træMat, N * 2);
  const kroner = new THREE.InstancedMesh(kroneGeo, træMat, N);
  const stammer = new THREE.InstancedMesh(stammeGeo, std("#6b4a2b"), N);
  const grøn = ["#2f7d3a", "#3b8f40", "#276b34", "#4f9d3a"], løv = ["#5bb04a", "#77c24d", "#4aa048", "#8fcf52"];
  let ng = 0, nk = 0;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd(-0.02, 0.02), r = rnd(90, 135), h = rnd(7, 15);
    const x = SØ.x + Math.cos(a) * r, z = SØ.z + Math.sin(a) * r;
    dummy.position.set(x, 0.4, z); dummy.rotation.set(0, rnd(0, 6), 0); dummy.scale.set(1.2, h * 0.3, 1.2);
    dummy.updateMatrix(); stammer.setMatrixAt(i, dummy.matrix);
    if (Math.random() < 0.6) {
      for (let j = 0; j < 2; j++) {
        dummy.position.set(x, 0.4 + h * (0.2 + j * 0.3), z);
        dummy.scale.set(h * (0.32 - j * 0.08), h * 0.55, h * (0.32 - j * 0.08));
        dummy.updateMatrix(); graner.setMatrixAt(ng, dummy.matrix); graner.setColorAt(ng++, c.set(grøn[(i + j) % 4]));
      }
    } else {
      dummy.position.set(x, 0.4 + h * 0.62, z); dummy.scale.set(h * 0.33, h * 0.3, h * 0.33);
      dummy.updateMatrix(); kroner.setMatrixAt(nk, dummy.matrix); kroner.setColorAt(nk++, c.set(løv[i % 4]));
    }
  }
  graner.count = ng; kroner.count = nk;
  for (const m of [graner, kroner, stammer]) { m.frustumCulled = false; scene.add(m); }

  // ---------- skyer ----------
  const skyMat = new THREE.MeshStandardMaterial({ color: "#ffffff", flatShading: true, emissive: "#ffffff", emissiveIntensity: 0.45, roughness: 1, fog: false });
  const skyer = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Group();
    for (let j = 0; j < 6; j++) {
      const k = new THREE.Mesh(bakkeGeo, skyMat);
      k.position.set(rnd(-14, 14), rnd(-2, 4), rnd(-6, 6));
      k.scale.setScalar(rnd(6, 11));
      s.add(k);
    }
    s.position.set(rnd(-300, 300), rnd(55, 95), rnd(-330, -120));
    scene.add(s); skyer.push(s);
  }
  opd.push((t, dt) => { for (const s of skyer) { s.position.x += dt * 2.5; if (s.position.x > 320) s.position.x = -320; } });

  // ---------- åkander ----------
  const åkGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.05, 20, 1, false, 0.4, Math.PI * 2 - 0.8);
  const åkMat = std("#3fa34d", { roughness: 0.6 }), blomMat = std("#ff8fc8", { roughness: 0.5 }), midtMat = std("#ffd23f");
  const bladGeo = new THREE.ConeGeometry(0.1, 0.28, 5); bladGeo.translate(0, 0.14, 0);
  const åer = [];
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, å = new THREE.Group();
    å.add(new THREE.Mesh(åkGeo, åkMat));
    if (Math.random() < 0.5) {
      for (let j = 0; j < 7; j++) {
        const a = j / 7 * Math.PI * 2, b = new THREE.Mesh(bladGeo, blomMat);
        b.position.set(Math.cos(a) * 0.05, 0.03, Math.sin(a) * 0.05);
        b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        å.add(b);
      }
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), midtMat); m.position.y = 0.08; å.add(m);
    }
    å.position.set(side * rnd(3.5, 22), 0, rnd(-32, 0));
    å.rotation.y = rnd(0, 6);
    å.scale.setScalar(rnd(0.7, 1.3));
    scene.add(å); åer.push(å);
  }
  opd.push(t => { for (const å of åer) å.position.y = bølge(å.position.x, å.position.z, t) + 0.03; });

  // ---------- siv ----------
  const sivGeo = new THREE.ConeGeometry(0.05, 1, 4); sivGeo.translate(0, 0.5, 0);
  const NS = 160, siv = new THREE.InstancedMesh(sivGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), NS);
  const kolber = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 6), std("#6b3f1f"), NS);
  const klynger = [[-4.5, 0.5], [-6.5, -3], [5, 1], [7.5, -2.5], [-12, -8], [13, -10], [-20, -16], [22, -18]];
  let nkol = 0;
  for (let i = 0; i < NS; i++) {
    const [cx, cz] = klynger[i % klynger.length], x = cx + rnd(-1.4, 1.4), z = cz + rnd(-1.4, 1.4), h = rnd(1.2, 2.4);
    dummy.position.set(x, -0.3, z); dummy.rotation.set(rnd(-0.12, 0.12), 0, rnd(-0.12, 0.12)); dummy.scale.set(1, h, 1);
    dummy.updateMatrix(); siv.setMatrixAt(i, dummy.matrix); siv.setColorAt(i, c.setHSL(0.27 + rnd(-0.03, 0.03), 0.55, rnd(0.3, 0.45)));
    if (Math.random() < 0.3) {
      dummy.position.set(x, -0.3 + h * 0.8, z); dummy.scale.set(1, 1, 1);
      dummy.updateMatrix(); kolber.setMatrixAt(nkol++, dummy.matrix);
    }
  }
  kolber.count = nkol;
  for (const m of [siv, kolber]) { m.frustumCulled = false; scene.add(m); }

  // ---------- brygge ----------
  const plankeGeo = new THREE.BoxGeometry(2.6, 0.08, 0.3);
  const træFarver = ["#a47148", "#b5835a", "#9a6840", "#ad7a50"].map(f => std(f, { roughness: 0.85 }));
  for (let i = 0, z = 1.66; z < 16; z += 0.33, i++) {
    const p = new THREE.Mesh(plankeGeo, træFarver[i % 4]);
    p.position.set(rnd(-0.03, 0.03), 0.6, z);
    p.rotation.y = rnd(-0.012, 0.012);
    scene.add(p);
  }
  for (const x of [-1.05, 1.05]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 14.5), træFarver[2]);
    b.position.set(x, 0.46, 8.8);
    scene.add(b);
  }
  const pælGeo = new THREE.CylinderGeometry(0.12, 0.13, 3.4, 8), pælMat = std("#7a5433", { roughness: 0.9 });
  for (const z of [1.62, 5, 8.5, 12]) for (const x of [-1.25, 1.25]) {
    const p = new THREE.Mesh(pælGeo, pælMat); p.position.set(x, -0.75, z); scene.add(p);
  }

  // spand til fangsten og en grejkasse
  const spand = new THREE.Group();
  const rød = std("#e63946", { roughness: 0.4, side: THREE.DoubleSide });
  spand.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.23, 0.42, 24, 1, true), rød));
  const spandBund = new THREE.Mesh(new THREE.CircleGeometry(0.23, 24).rotateX(-Math.PI / 2), rød);
  spandBund.position.y = -0.21; spand.add(spandBund);
  const kant = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 28), std("#ffffff"));
  kant.rotation.x = Math.PI / 2; kant.position.y = 0.21; spand.add(kant);
  const spandVand = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24).rotateX(-Math.PI / 2), std("#4cc3f0", { roughness: 0.1 }));
  spandVand.position.y = 0.12; spand.add(spandVand);
  const hank = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 20, Math.PI), std("#9aa3ad", { metalness: 0.7, roughness: 0.3 }));
  hank.position.y = 0.21; hank.rotation.set(-0.5, 0.4, 0); spand.add(hank);
  spand.position.set(-0.95, 0.81, 2.3);
  spand.scale.setScalar(0.8);
  scene.add(spand);
  const spandPos = new THREE.Vector3(-0.95, 0.98, 2.3);
  const iSpanden = [];
  function spandFisk(farve) {          // en lille hale stikker op af spanden for hver fangst
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), std(farve, { roughness: 0.4 }));
    h.position.set(rnd(-0.14, 0.14), 0.2, rnd(-0.14, 0.14));
    h.rotation.set(rnd(-0.4, 0.4), rnd(0, 3), rnd(-0.4, 0.4));
    spand.add(h); iSpanden.push(h);
    if (iSpanden.length > 7) spand.remove(iSpanden.shift());
  }
  const kasse = new THREE.Group();
  kasse.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 0.32), std("#2a9d8f", { roughness: 0.5 })));
  const låg = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.05, 0.34), std("#23867a", { roughness: 0.5 })); låg.position.y = 0.15; kasse.add(låg);
  const greb = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 12, Math.PI), std("#26262e")); greb.position.y = 0.17; kasse.add(greb);
  kasse.position.set(0.85, 0.77, 2.6); kasse.rotation.y = 0.3;
  scene.add(kasse);

  // ---------- and der svømmer rundt (tryk på den!) ----------
  const and = new THREE.Group();
  const gul = std("#ffd23f", { roughness: 0.4 }), orange = std("#ff8c1a", { roughness: 0.4 }), sort = std("#111111");
  const krop = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 14), gul); krop.scale.set(1.3, 0.85, 1); krop.position.y = 0.12; and.add(krop);
  const hale = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 8), gul); hale.position.set(-0.42, 0.28, 0); hale.rotation.z = 0.9; and.add(hale);
  const hoved = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), gul); hoved.position.set(0.3, 0.46, 0); and.add(hoved);
  const næb = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), orange); næb.scale.set(0.16, 0.05, 0.11); næb.position.set(0.5, 0.42, 0); and.add(næb);
  for (const s of [1, -1]) { const ø = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), sort); ø.position.set(0.42, 0.52, s * 0.13); and.add(ø); }
  and.scale.setScalar(1.4);
  and.userData.hop = 0;
  scene.add(and);
  opd.push((t, dt) => {
    const a = t * 0.1, x = 6 + Math.cos(a) * 3.5, z = -10 + Math.sin(a) * 3.5;
    and.userData.hop = Math.max(0, and.userData.hop - dt * 1.6);
    and.position.set(x, bølge(x, z, t) + Math.sin(and.userData.hop * Math.PI) * 0.8, z);
    and.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), Math.sin(t * 1.3) * 0.06);
  });

  // ---------- vanddråber og ringe i vandet ----------
  const MAKS = 240;
  const dråbeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: "#eaf8ff" }), MAKS);
  dråbeMesh.frustumCulled = false;
  scene.add(dråbeMesh);
  const dr = Array.from({ length: MAKS }, () => ({ liv: 0 }));
  let næste = 0;
  function dråber(pos, n, fart = 3) {
    for (let i = 0; i < n; i++) {
      const d = dr[næste]; næste = (næste + 1) % MAKS;
      const a = Math.random() * Math.PI * 2, v = fart * rnd(0.2, 0.7);
      Object.assign(d, { x: pos.x, y: pos.y, z: pos.z, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vy: fart * rnd(0.6, 1.3), liv: 2, s: rnd(0.6, 1.6) });
    }
  }
  opd.push((t, dt) => {
    for (let i = 0; i < MAKS; i++) {
      const d = dr[i];
      if (d.liv > 0) {
        d.liv -= dt; d.vy -= 9.8 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
        if (d.vy < 0 && d.y < bølge(d.x, d.z, t) - 0.05) d.liv = 0;
      }
      dummy.position.set(d.x || 0, d.y || 0, d.z || 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(d.liv > 0 ? d.s : 0);
      dummy.updateMatrix(); dråbeMesh.setMatrixAt(i, dummy.matrix);
    }
    dråbeMesh.instanceMatrix.needsUpdate = true;
  });

  const ringGeo = new THREE.RingGeometry(0.8, 1, 36).rotateX(-Math.PI / 2);
  const ringe = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; scene.add(m); ringe.push({ m, liv: 0 });
  }
  function ring(pos, str = 1, forsink = 0) {
    const r = ringe.reduce((a, b) => (b.liv < a.liv ? b : a));
    Object.assign(r, { x: pos.x, z: pos.z, str, liv: 1.3 + forsink });
  }
  opd.push((t, dt) => {
    for (const r of ringe) {
      r.liv -= dt;
      r.m.visible = r.liv > 0 && r.liv <= 1.3;
      if (!r.m.visible) continue;
      const s = 1 - r.liv / 1.3;
      r.m.position.set(r.x, bølge(r.x, r.z, t) + 0.04, r.z);
      r.m.scale.setScalar((0.15 + s * 1.6) * r.str);
      r.m.material.opacity = 0.75 * (1 - s);
    }
  });

  function plask(pos, str = 1) {
    const p = new THREE.Vector3(pos.x, bølge(pos.x, pos.z, 0) + 0.05, pos.z);
    dråber(p, Math.round(14 * str), 2.5 + str * 1.2);
    ring(p, str); ring(p, str * 0.7, 0.25);
  }

  return {
    opdater(t, dt) { for (const f of opd) f(t, dt); },
    plask, dråber, ring, and, spandPos, spandFisk,
    omgivelser: () => envScene,
  };
}
