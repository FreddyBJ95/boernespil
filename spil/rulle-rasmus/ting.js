// ===== Tingene på banen =====
// Stjerner man samler, frugt der gør Rasmus større, flag man genstarter fra, trampoliner,
// fartfelter med pile, bløde puder man hopper af, og målbuen af balloner med konfetti og fyrværkeri.

import * as THREE from "./three.js";
import { stjerneGeo } from "./verden.js";
import * as T from "./teksturer.js";

// En stribe, der ligger oven på banen og følger dens form (målstreg, fartfelter)
function strimmel(bane, i0, i1, hb, løft, M = 8) {
  const P = bane.P, pos = [], uv = [], idx = [], s0 = P[i0].s, L = Math.max(0.01, P[i1].s - s0);
  for (let i = i0; i <= i1; i++) {
    const p = P[i];
    for (let k = 0; k <= M; k++) {
      const u = (k / M - 0.5) * 2 * hb, e = Math.min(1, Math.abs(u) / (p.w / 2)) ** 2;
      pos.push(p.x + p.rx * u, p.y + p.rende * e + løft, p.z + p.rz * u);
      uv.push(k / M, (p.s - s0) / L);
    }
  }
  for (let i = 0; i < i1 - i0; i++) for (let k = 0; k < M; k++) {
    const q = i * (M + 1) + k;
    idx.push(q, q + 1, q + M + 1, q + 1, q + M + 2, q + M + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- Frugt ----------
const std = (f, x = {}) => new THREE.MeshStandardMaterial({ color: f, roughness: 0.35, ...x });
function lavFrugt(slags) {
  const g = new THREE.Group(), blad = std("#3fa535", { roughness: 0.6, side: THREE.DoubleSide }), stilk = std("#6b4a2a", { roughness: 0.8 });
  if (slags === "æble") {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#e8192f", roughness: 0.25, clearcoat: 1 }));
    k.scale.set(1, 0.92, 1); g.add(k);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.16, 6), stilk); s.position.y = 0.3; g.add(s);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), blad); b.scale.set(1, 0.15, 0.5); b.position.set(0.09, 0.33, 0); b.rotation.z = 0.5; g.add(b);
  } else if (slags === "jordbær") {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshPhysicalMaterial({ color: "#ff2446", roughness: 0.35, clearcoat: 0.8 }));
    const p = k.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), f = y < 0 ? 1 + y * 1.6 : 1; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
    k.geometry.computeVertexNormals(); g.add(k);
    const frø = std("#ffe14d");
    for (let i = 0; i < 24; i++) {
      const a = i * 2.4, y = 0.15 - (i / 24) * 0.4, rr = y < 0 ? 0.3 * (1 + y * 1.6) : 0.3 * Math.sqrt(1 - (y / 0.3) ** 2);
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), frø); f.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); g.add(f);
    }
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), blad); b.scale.set(1, 0.15, 0.4); b.position.set(Math.cos(i) * 0.1, 0.27, Math.sin(i) * 0.1); b.rotation.y = -i; b.rotation.z = 0.3; g.add(b); }
  } else if (slags === "appelsin") {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), std("#ff8c1a", { roughness: 0.55 }));
    g.add(k);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 6), blad); b.scale.set(1, 0.15, 0.5); b.position.set(0.06, 0.3, 0); b.rotation.z = 0.4; g.add(b);
  } else {                                                // vindruer
    const m = new THREE.MeshPhysicalMaterial({ color: "#8a3cc8", roughness: 0.2, clearcoat: 1 });
    for (let i = 0; i < 12; i++) {
      const y = 0.18 - Math.floor(i / 4) * 0.12, a = i * 1.7, rr = 0.12 - Math.floor(i / 4) * 0.03;
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), m); d.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); g.add(d);
    }
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), stilk); s.position.y = 0.3; g.add(s);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const FRUGTER = ["æble", "jordbær", "appelsin", "druer"];

// ---------- Alle tingene ----------
// fx: partikelsystemer fra spil.js { glød, prikker, konfetti }
export function byggTing(gruppe, bane, tema, fx) {
  const P = bane.P, opd = [];

  // --- stjerner (alle på én gang, så det går hurtigt) ---
  const sGeo = stjerneGeo(0.3, 0.1);
  const sMat = new THREE.MeshStandardMaterial({ color: "#ffcf2e", metalness: 0.85, roughness: 0.22, emissive: "#ffaa00", emissiveIntensity: 0.45 });
  const N = bane.stjerner.length;
  const stjerner = new THREE.InstancedMesh(sGeo, sMat, Math.max(1, N));
  stjerner.frustumCulled = false; stjerner.castShadow = true;
  gruppe.add(stjerner);
  const taget = new Uint8Array(N);
  const glødPos = new Float32Array(N * 3), glødStr = new Float32Array(N).fill(1);
  bane.stjerner.forEach((s, i) => glødPos.set([s.x, s.y, s.z], i * 3));
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.BufferAttribute(glødPos, 3));
  gg.setAttribute("aStr", new THREE.BufferAttribute(glødStr, 1));
  const glødMat = new THREE.ShaderMaterial({
    uniforms: { uTekstur: { value: T.glød() }, uSkala: { value: 600 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aStr; uniform float uSkala;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aStr * 1.05 * uSkala / max(0.2, -mv.z); }`,
    fragmentShader: `uniform sampler2D uTekstur;
      void main() {
        vec4 t = texture2D(uTekstur, gl_PointCoord);
        gl_FragColor = vec4(vec3(1.0, 0.8, 0.3) * t.rgb, t.a * 0.55);
        #include <colorspace_fragment>
      }`,
  });
  const glødPunkter = new THREE.Points(gg, glødMat);
  glødPunkter.frustumCulled = false;
  gruppe.add(glødPunkter);
  const flyvende = [];                                   // stjerner, der lige er taget, flyver op og forsvinder
  const d = new THREE.Object3D();
  opd.push((t, dt) => {
    for (let i = 0; i < N; i++) {
      const s = bane.stjerner[i];
      d.position.set(s.x, s.y + Math.sin(t * 2.2 + i * 0.7) * 0.08, s.z);
      d.rotation.set(0, t * 2.4 + i * 0.5, 0);
      d.scale.setScalar(taget[i] ? 0 : 1);
      d.updateMatrix();
      stjerner.setMatrixAt(i, d.matrix);
    }
    stjerner.instanceMatrix.needsUpdate = true;
    for (let k = flyvende.length - 1; k >= 0; k--) {
      const f = flyvende[k];
      f.t += dt;
      const e = f.t / 0.55;
      f.m.position.y += dt * (3.5 - e * 3);
      f.m.rotation.y += dt * 14;
      f.m.scale.setScalar(Math.max(0.01, (1 + e * 0.8) * (1 - e * e)));
      if (e >= 1) { gruppe.remove(f.m); flyvende.splice(k, 1); }
    }
  });

  // --- frugt ---
  const frugter = bane.frugter.map((f, i) => {
    const m = lavFrugt(FRUGTER[i % FRUGTER.length]);
    m.position.set(f.x, f.y, f.z);
    m.userData = { y: f.y, taget: false, slags: FRUGTER[i % FRUGTER.length] };
    gruppe.add(m);
    return m;
  });
  opd.push(t => frugter.forEach((m, i) => { m.position.y = m.userData.y + Math.sin(t * 2 + i) * 0.1; m.rotation.y = t * 1.5; }));

  // --- flag (genstartssteder) ---
  const stang = new THREE.MeshStandardMaterial({ color: "#f4f4f8", metalness: 0.6, roughness: 0.3 });
  const flag = bane.flag.slice(1).map(i => {
    const p = P[i], u = p.w / 2 - 0.1, g = new THREE.Group();
    g.position.set(p.x + p.rx * u, p.y + p.rende, p.z + p.rz * u);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 10), stang); s.position.y = 1.3; s.castShadow = true;
    const kugle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: "#ffd24a", metalness: 1, roughness: 0.2 })); kugle.position.y = 2.65;
    const klæde = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7, 12, 4).translate(-0.55, 0, 0),
      new THREE.MeshStandardMaterial({ color: "#ff3b4e", roughness: 0.7, side: THREE.DoubleSide }));
    klæde.position.y = 2.2; klæde.castShadow = true;
    g.add(s, kugle, klæde);
    g.rotation.y = Math.atan2(p.fx, p.fz);
    // en lysende streg på tværs af banen
    const streg = new THREE.Mesh(strimmel(bane, Math.max(0, i - 1), Math.min(P.length - 1, i + 1), p.w / 2, 0.03, 10),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    gruppe.add(g, streg);
    const basis = klæde.geometry.attributes.position.array.slice();
    return { g, klæde, streg, basis, nået: false, i, blæs: 0 };
  });
  opd.push((t, dt) => {
    for (const f of flag) {
      const pos = f.klæde.geometry.attributes.position, b = f.basis;
      f.blæs = Math.max(0, f.blæs - dt);
      for (let k = 0; k < pos.count; k++) {
        const x = b[k * 3], bølge = Math.sin(x * 5 + t * (6 + f.blæs * 8)) * 0.12 * (-x / 1.1);
        pos.setZ(k, bølge);
      }
      pos.needsUpdate = true;
      f.klæde.geometry.computeVertexNormals();
      if (f.nået) f.streg.material.opacity = Math.max(0, f.streg.material.opacity - dt * 0.5);
    }
  });

  // --- trampoliner ---
  // en blå dug hele vejen på tværs med en rød, blank ramme og gule prikker
  const dugTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#1d3fa8"; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "rgba(255,255,255,.18)"; x.lineWidth = 2;
    for (let i = 0; i <= 128; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.moveTo(0, i); x.lineTo(128, i); x.stroke(); }
    x.fillStyle = "#ffe14d"; x.beginPath(); x.arc(64, 64, 22, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const rammeMat = new THREE.MeshPhysicalMaterial({ color: "#ff2d55", roughness: 0.3, clearcoat: 1 });
  const trampoliner = bane.trampoliner.map(tr => {
    const g = new THREE.Group(), a = P[tr.i0], b = P[tr.i1], hb = Math.min(a.w, b.w) / 2 - 0.2;
    const dugMat = new THREE.MeshStandardMaterial({ map: dugTex, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });
    dugMat.map.repeat.set(Math.round(hb), 1);
    const dug = new THREE.Mesh(strimmel(bane, tr.i0, tr.i1, hb, 0.04, 12), dugMat);
    dug.receiveShadow = true;
    const hjørne = [bane.punktPå(tr.i0, -hb, 0.1), bane.punktPå(tr.i0, hb, 0.1), bane.punktPå(tr.i1, hb, 0.1), bane.punktPå(tr.i1, -hb, 0.1)].map(q => new THREE.Vector3(q.x, q.y, q.z));
    for (let k = 0; k < 4; k++) {
      const s = hjørne[k], e = hjørne[(k + 1) % 4], l = s.distanceTo(e);
      const rør = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, l + 0.22, 12), rammeMat);
      rør.position.copy(s).lerp(e, 0.5);
      rør.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.clone().sub(s).normalize());
      rør.castShadow = true;
      g.add(rør);
    }
    g.add(dug);
    gruppe.add(g);
    return { dug, t: 1 };
  });
  opd.push((t, dt) => trampoliner.forEach(tr => {
    tr.t += dt;
    tr.dug.position.y = tr.t < 0.5 ? -Math.sin(Math.min(1, tr.t / 0.12) * Math.PI) * 0.12 - Math.sin(tr.t * 30) * Math.exp(-tr.t * 8) * 0.04 : 0;
  }));

  // --- fartfelter med pile, der løber fremad ---
  const pileTex = T.pile();
  pileTex.repeat.set(1, 1.2);
  const pileMat = new THREE.MeshBasicMaterial({ map: pileTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false });
  for (const [a, b] of bane.fartfelter) gruppe.add(new THREE.Mesh(strimmel(bane, a, b, 1.2, 0.03, 6), pileMat));
  opd.push((t, dt) => { pileTex.offset.y -= dt * 1.6; });

  // --- puder: bløde ting midt på banen, man hopper af ---
  const puder = bane.puder.map(pu => {
    const m = tema.pude();
    m.position.set(pu.x, pu.y, pu.z);
    m.rotation.y = Math.random() * 6;
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    gruppe.add(m);
    return { m, t: 1 };
  });
  opd.push((t, dt) => puder.forEach(pu => {
    pu.t += dt;
    const s = Math.sin(pu.t * 22) * Math.exp(-pu.t * 5) * 0.3;
    pu.m.scale.set(1 + s, 1 - s, 1 + s);
  }));

  // --- målet: en bue af balloner og en ternet målstreg ---
  const mi = bane.målI, mp = P[mi];
  const målstreg = new THREE.Mesh(strimmel(bane, mi, Math.min(P.length - 1, mi + 4), mp.w / 2, 0.025, 12),
    new THREE.MeshStandardMaterial({ map: T.ternet(), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
  målstreg.material.map.repeat.set(mp.w / 4, 0.25);
  målstreg.receiveShadow = true;
  gruppe.add(målstreg);
  const antalB = 46, balGeo = new THREE.SphereGeometry(0.34, 20, 14);
  const bp = balGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); if (y < 0) { const k = 1 + y * 0.6; bp.setX(i, bp.getX(i) * k); bp.setZ(i, bp.getZ(i) * k); } bp.setY(i, y * 1.15); }
  balGeo.computeVertexNormals();
  const balloner = new THREE.InstancedMesh(balGeo, new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }), antalB);
  const bue = new THREE.Group();
  bue.position.set(mp.x, mp.y + mp.rende, mp.z);
  bue.rotation.y = Math.atan2(mp.fx, mp.fz);
  const halv = mp.w / 2 + 0.2, høj = 3.2;
  for (let i = 0; i < antalB; i++) {
    const t = i / (antalB - 1);
    // op ad venstre side, over toppen og ned ad højre side
    const L1 = høj, L2 = Math.PI * halv, samlet = 2 * L1 + L2, s = t * samlet;
    let x, y;
    if (s < L1) { x = -halv; y = s; } else if (s < L1 + L2) { const a = Math.PI - (s - L1) / halv; x = Math.cos(a) * halv; y = høj + Math.sin(a) * halv * 0.55; } else { x = halv; y = samlet - s; }
    d.position.set(x + (i % 2 ? 0.12 : -0.12), y + 0.3, (i % 3 - 1) * 0.15);
    d.rotation.set((i % 5) * 0.2, 0, (i % 4 - 1.5) * 0.25);
    d.scale.setScalar(1);
    d.updateMatrix();
    balloner.setMatrixAt(i, d.matrix);
    balloner.setColorAt(i, new THREE.Color(tema.balloner[i % tema.balloner.length]));
  }
  balloner.castShadow = true;
  bue.add(balloner);
  gruppe.add(bue);
  opd.push(t => { bue.scale.setScalar(1 + Math.sin(t * 3) * 0.012); });

  // ---------- Det, spillet spørger om ----------
  return {
    opdater(t, dt) { for (const f of opd) f(t, dt); },
    skala(v) { glødMat.uniforms.uSkala.value = v; },

    // Tager de stjerner, Rasmus rører. Giver antallet tilbage.
    samlStjerner(pos, r) {
      let n = 0;
      for (let i = 0; i < N; i++) {
        if (taget[i]) continue;
        const s = bane.stjerner[i], dx = s.x - pos.x, dy = s.y - pos.y, dz = s.z - pos.z;
        if (dx * dx + dy * dy + dz * dz < (r + 0.45) ** 2) {
          taget[i] = 1; n++;
          glødStr[i] = 0; gg.attributes.aStr.needsUpdate = true;
          const m = new THREE.Mesh(sGeo, sMat);
          m.position.set(s.x, s.y, s.z);
          gruppe.add(m);
          flyvende.push({ m, t: 0 });
          for (let k = 0; k < 10; k++) {
            const a = k / 10 * 6.28;
            fx.glød.udsend({ x: s.x, y: s.y, z: s.z, vx: Math.cos(a) * 2.5, vy: 1 + Math.random() * 2, vz: Math.sin(a) * 2.5, liv: 0.6, str: 0.3, strSlut: 0.02, farve: "#fff3a0", farve2: "#ffae00", modstand: 3 });
          }
        }
      }
      return n;
    },
    antalStjerner: N,

    samlFrugt(pos, r) {
      for (const m of frugter) {
        if (m.userData.taget) continue;
        if (m.position.distanceTo(pos) < r + 0.45) {
          m.userData.taget = true; m.visible = false;
          const farve = { æble: "#ff2a3a", jordbær: "#ff2446", appelsin: "#ff8c1a", druer: "#8a3cc8" }[m.userData.slags];
          for (let k = 0; k < 16; k++) fx.prikker.udsend({ x: m.position.x, y: m.position.y, z: m.position.z, vx: (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, liv: 0.8, str: 0.12, strSlut: 0.02, farve, tyngde: 10 });
          return m.userData.slags;
        }
      }
      return null;
    },

    nåFlag(i) {
      const f = flag.find(f => f.i === i);
      if (!f || f.nået) return false;
      f.nået = true; f.blæs = 2;
      f.klæde.material.color.set("#2fd24a");
      const p = f.g.position;
      for (let k = 0; k < 24; k++) fx.glød.udsend({ x: p.x, y: p.y + 2.2, z: p.z, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 5, liv: 1, str: 0.3, strSlut: 0.02, farve: ["#ffffff", "#7dff8a", "#ffe07a"][k % 3], tyngde: 3, modstand: 1.5 });
      return true;
    },

    hop(k) { if (trampoliner[k]) trampoliner[k].t = 0; },
    stød(k) { if (puder[k]) puder[k].t = 0; },

    // Målfesten: konfetti fra buen og fyrværkeri på himlen
    fejr(lyd) {
      const top = new THREE.Vector3(0, høj + halv * 0.55 + 0.3, 0).applyMatrix4(bue.matrixWorld);
      for (let k = 0; k < 160; k++) {
        const a = Math.random() * 6.28, v = 2 + Math.random() * 5;
        fx.konfetti.udsend({ x: top.x, y: top.y, z: top.z, vx: Math.cos(a) * v, vy: 2 + Math.random() * 6, vz: Math.sin(a) * v, liv: 4, str: 0.12,
          farve: ["#ff477e", "#ffd23f", "#06d6a0", "#3a86ff", "#b15bff", "#ff8c42"][k % 6], tyngde: 5, modstand: 1.4, spin: 16, gulv: mp.y + 0.03 });
      }
      for (let n = 0; n < 7; n++) setTimeout(() => {
        const c = new THREE.Vector3((Math.random() - 0.5) * 16, 9 + Math.random() * 6, -6 - Math.random() * 8).applyMatrix4(bue.matrixWorld);
        const f = ["#ff477e", "#ffd23f", "#06d6a0", "#3a86ff", "#b15bff", "#ffffff"][n % 6], f2 = ["#ffd23f", "#ffffff", "#3a86ff"][n % 3];
        for (let k = 0; k < 70; k++) {
          const u = Math.random() * 2 - 1, a = Math.random() * 6.28, s = Math.sqrt(1 - u * u), v = 6 + Math.random() * 1.5;
          fx.glød.udsend({ x: c.x, y: c.y, z: c.z, vx: s * Math.cos(a) * v, vy: u * v, vz: s * Math.sin(a) * v, liv: 1.6, str: 0.45, strSlut: 0.05, farve: f, farve2: f2, tyngde: 3, modstand: 1.8 });
        }
        lyd?.();
      }, 300 + n * 420);
    },
  };
}
