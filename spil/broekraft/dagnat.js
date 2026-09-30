// ===== Dag, nat og vejr i Den uendelige verden =====
// Et døgn varer 8 minutter: lang dag, solnedgang, en kort nat med stjerner og ildfluer, og solopgang.
// Vejret følger stedet: i vinterlandet sner det altid, andre steder kommer der af og til en regnbyge
// med lidt stille torden — og bagefter en regnbue.
// Om natten bliver himlen, tågen og blokkene mørkere; lamper og krystaller lyser stadig (verden.js: laget "lys").

import * as THREE from "./three.js";

const DØGN = 480;                                    // sekunder pr. døgn
// Døgnets faser (0–1): dag, solnedgang, nat, solopgang
const SOLNED = 0.62, NAT = 0.7, SOLOP = 0.92;
const glat = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

const F = {
  horisontDag: new THREE.Color("#d6ecff"), horisontNat: new THREE.Color("#141c40"), horisontSol: new THREE.Color("#f4a070"),
  himmelDag: new THREE.Color("#ffffff"), himmelNat: new THREE.Color("#1c2658"), himmelSol: new THREE.Color("#ffb08a"),
  blokDag: new THREE.Color("#ffffff"), blokNat: new THREE.Color("#5a6490"), blokSol: new THREE.Color("#ffd2b0"),
  regn: new THREE.Color("#9aa6b4"),
};

// En firkantet sol eller måne, der følger kameraet (ligesom de andre verdeners sol)
function himmelFirkant(farve, str, kratere) {
  const c = document.createElement("canvas"); c.width = c.height = 16;
  const g = c.getContext("2d");
  g.fillStyle = farve; g.fillRect(0, 0, 16, 16);
  if (kratere) { g.fillStyle = "rgba(0,0,0,0.12)"; for (const [x, y, s] of [[3, 4, 3], [9, 2, 2], [10, 9, 4], [4, 11, 2]]) g.fillRect(x, y, s, s); }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(str, str), new THREE.MeshBasicMaterial({ map: t, fog: false, transparent: true, depthWrite: false }));
  m.renderOrder = -1;
  return m;
}
function prik(farve = "255,255,255") {
  const c = document.createElement("canvas"); c.width = c.height = 16;
  const k = c.getContext("2d"), grad = k.createRadialGradient(8, 8, 0, 8, 8, 8);
  grad.addColorStop(0, `rgba(${farve},1)`); grad.addColorStop(1, `rgba(${farve},0)`); k.fillStyle = grad; k.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(c);
}

export class DagNat {
  // s: { scene, kamera, himmel, horisont (Color), blokMat, dæmpMat: [materialer, der bliver mørke], lys: [HemisphereLight, DirectionalLight],
  //      skyMat, årstid: () => "vinter" | …, lyd: { regn(styrke), torden() }, tid: 0–1 (hvor i døgnet man starter) }
  constructor(s) {
    this.s = s;
    this.tid = Number.isFinite(s.tid) ? s.tid : 0.12;
    this.lysniveau = 1; this.solglød = 0;
    this.grundLys = s.lys.map(l => l.intensity);
    this.dæmpFarver = s.dæmpMat.map(m => m.color.clone());
    this.sol = himmelFirkant("#fff6b0", 36); this.måne = himmelFirkant("#eef2ff", 22, true);
    s.scene.add(this.sol, this.måne);
    this.lavStjerner(); this.lavIldfluer(); this.lavNedbør(); this.lavRegnbue();
    this.regnTid = 0; this.næsteByge = 90 + Math.random() * 120; this.regnStyrke = 0; this.sneStyrke = 0;
    this.tordenTid = 0; this.glimt = 0; this.regnbueTid = 0;
  }

  get nat() { return this.lysniveau < 0.3; }
  get dag() { return this.lysniveau > 0.7; }

  lavStjerner() {
    const pos = [];
    for (let i = 0; i < 900; i++) {
      const y = Math.random() * 1.1 - 0.1, r = Math.sqrt(Math.max(0, 1 - y * y)), a = Math.random() * Math.PI * 2;
      pos.push(Math.cos(a) * r * 240, y * 240, Math.sin(a) * r * 240);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.stjerner = new THREE.Points(g, new THREE.PointsMaterial({ color: "#ffffff", size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false }));
    this.stjerner.renderOrder = -1;
    this.s.scene.add(this.stjerner);
  }
  lavIldfluer() {                                     // små gul-grønne lys, der svæver om natten
    const N = 70, pos = new Float32Array(N * 3);
    this.fluer = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 40, y: 0.5 + Math.random() * 3, z: (Math.random() - 0.5) * 40, f: Math.random() * 10 }));
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.ildfluer = new THREE.Points(g, new THREE.PointsMaterial({ map: prik("220,255,120"), size: 0.35, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.ildfluer.frustumCulled = false;
    this.s.scene.add(this.ildfluer);
  }
  lavNedbør() {                                       // sne (prikker) og regn (streger) i en kasse omkring kameraet
    const N = 1200, sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 60; sp[i * 3 + 1] = Math.random() * 30; sp[i * 3 + 2] = (Math.random() - 0.5) * 60; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    this.sne = new THREE.Points(sg, new THREE.PointsMaterial({ map: prik(), size: 0.17, transparent: true, opacity: 0, depthWrite: false }));
    this.sne.frustumCulled = false;
    const M = 700, rp = new Float32Array(M * 6);
    for (let i = 0; i < M; i++) {
      const x = (Math.random() - 0.5) * 50, y = Math.random() * 26, z = (Math.random() - 0.5) * 50;
      rp.set([x, y, z, x, y - 0.7, z], i * 6);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
    this.regn = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: "#e4f0ff", transparent: true, opacity: 0, depthWrite: false }));
    this.regn.frustumCulled = false;
    this.s.scene.add(this.sne, this.regn);
  }
  lavRegnbue() {                                      // en regnbue efter regnen
    const bue = new THREE.TorusGeometry(120, 6, 8, 64, Math.PI), p = bue.attributes.position, f = [], c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const k = Math.max(0, Math.min(1, (Math.hypot(p.getX(i), p.getY(i)) - 114) / 12));
      c.setHSL((1 - k) * 0.78, 0.9, 0.62); f.push(c.r, c.g, c.b);
    }
    bue.setAttribute("color", new THREE.Float32BufferAttribute(f, 3));
    this.regnbue = new THREE.Mesh(bue, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.regnbue.scale.z = 0.1; this.regnbue.renderOrder = -0.5; this.regnbue.visible = false;
    this.s.scene.add(this.regnbue);
  }

  // Hvor lyst er det lige nu (0 = nat, 1 = dag), og hvor meget solnedgang/solopgang er der i himlen?
  beregnLys() {
    const t = this.tid;
    if (t < SOLNED) this.lysniveau = 1;
    else if (t < NAT) this.lysniveau = 1 - glat(SOLNED, NAT, t);
    else if (t < SOLOP) this.lysniveau = 0;
    else this.lysniveau = glat(SOLOP, 1, t);
    const midt = (a, b) => Math.max(0, 1 - Math.abs(t - (a + b) / 2) / ((b - a) / 2 + 0.03));
    this.solglød = Math.max(midt(SOLNED, NAT), midt(SOLOP, 1), t < 0.03 ? 1 - t / 0.03 : 0);
  }

  opdater(dt, tNu) {
    const s = this.s, k = s.kamera.position;
    this.tid = (this.tid + dt / DØGN) % 1;
    this.beregnLys();
    const regn = this.regnStyrke, lys = this.lysniveau * (1 - regn * 0.25), glød = this.solglød * (1 - regn);

    // farver: himmel, horisont/tåge og blokke
    const mix = (dag, nat, sol, ud) => ud.copy(nat).lerp(dag, lys).lerp(sol, glød * 0.55).lerp(F.regn, regn * 0.35 * this.lysniveau);
    mix(F.horisontDag, F.horisontNat, F.horisontSol, s.horisont);
    s.scene.fog.color.copy(s.horisont);
    mix(F.himmelDag, F.himmelNat, F.himmelSol, s.himmel.material.color);
    const blok = mix(F.blokDag, F.blokNat, F.blokSol, new THREE.Color());
    s.dæmpMat.forEach((m, i) => m.color.copy(this.dæmpFarver[i]).multiply(blok));
    if (this.glimt > 0) {                                // lynglimt
      this.glimt = Math.max(0, this.glimt - dt * 3);
      s.horisont.lerp(F.himmelDag, this.glimt * 0.6); s.himmel.material.color.lerp(F.himmelDag, this.glimt * 0.6);
    }
    s.lys.forEach((l, i) => { l.intensity = this.grundLys[i] * (0.3 + 0.7 * lys); });
    if (s.skyMat) s.skyMat.color.copy(blok).lerp(F.regn, regn * 0.6);

    // sol og måne går over himlen (solen står op i øst og går ned i vest)
    const solVej = new THREE.Vector3();
    const dagDel = this.tid < SOLNED + 0.06 ? Math.min(1, this.tid / (SOLNED + 0.06)) : null;
    if (dagDel !== null) solVej.set(Math.cos(dagDel * Math.PI), Math.sin(dagDel * Math.PI) * 0.9 + 0.02, -0.35);
    else solVej.set(0, -1, 0);
    this.sol.position.copy(k).addScaledVector(solVej.normalize(), 250); this.sol.lookAt(k);
    this.sol.visible = dagDel !== null && regn < 0.7;
    const natDel = this.tid > NAT - 0.04 ? (this.tid - (NAT - 0.04)) / (1 - NAT + 0.04) : null;
    if (natDel !== null) {
      const v = new THREE.Vector3(Math.cos(natDel * Math.PI), Math.sin(natDel * Math.PI) * 0.8 + 0.05, -0.3).normalize();
      this.måne.position.copy(k).addScaledVector(v, 240); this.måne.lookAt(k);
    }
    this.måne.visible = natDel !== null;

    // stjerner og ildfluer om natten
    this.stjerner.position.copy(k);
    this.stjerner.material.opacity = Math.max(0, 1 - this.lysniveau * 1.4) * (1 - regn);
    this.stjerner.visible = this.stjerner.material.opacity > 0.01;
    const vinter = s.årstid() === "vinter";
    const fluer = this.ildfluer.geometry.attributes.position.array;
    this.ildfluer.material.opacity = vinter ? 0 : Math.max(0, 1 - this.lysniveau * 2) * (1 - regn);
    this.ildfluer.visible = this.ildfluer.material.opacity > 0.01;
    if (this.ildfluer.visible) this.fluer.forEach((f, i) => {
      f.x += Math.sin(tNu * 0.7 + f.f) * dt * 0.6; f.z += Math.cos(tNu * 0.5 + f.f * 1.3) * dt * 0.6;
      if (f.x - k.x > 20) f.x -= 40; if (f.x - k.x < -20) f.x += 40; if (f.z - k.z > 20) f.z -= 40; if (f.z - k.z < -20) f.z += 40;
      fluer.set([f.x, k.y - 1 + f.y + Math.sin(tNu * 1.3 + f.f) * 0.3, f.z], i * 3);
    });
    this.ildfluer.geometry.attributes.position.needsUpdate = true;

    this.vejr(dt, vinter, k);
  }

  vejr(dt, vinter, k) {
    // sne i vinterlandet — den kommer blødt, når man går ind i vinteren
    this.sneStyrke += ((vinter ? 1 : 0) - this.sneStyrke) * Math.min(1, dt * 0.8);
    this.sne.material.opacity = this.sneStyrke * 0.9;
    this.sne.visible = this.sneStyrke > 0.02;
    if (this.sne.visible) {
      const p = this.sne.geometry.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= (1.2 + (i % 7) * 0.12) * dt; p[i] += Math.sin(i + p[i + 1]) * 0.25 * dt;
        if (p[i + 1] < k.y - 12) p[i + 1] += 30; if (p[i + 1] > k.y + 18) p[i + 1] -= 30;
        if (p[i] < k.x - 30) p[i] += 60; if (p[i] > k.x + 30) p[i] -= 60;
        if (p[i + 2] < k.z - 30) p[i + 2] += 60; if (p[i + 2] > k.z + 30) p[i + 2] -= 60;
      }
      this.sne.geometry.attributes.position.needsUpdate = true;
    }
    // regnbyger (ikke i vinterlandet): kommer af og til, varer lidt, og så kommer regnbuen
    if (this.regnTid > 0) this.regnTid -= dt;
    else if ((this.næsteByge -= dt) <= 0) { this.regnTid = 35 + Math.random() * 30; this.næsteByge = 150 + Math.random() * 150; }
    const regner = this.regnTid > 0 && !vinter;
    const før = this.regnStyrke;
    this.regnStyrke += ((regner ? 1 : 0) - this.regnStyrke) * Math.min(1, dt * 0.4);
    if (før > 0.5 && this.regnStyrke <= 0.5 && !regner && !vinter && this.dag) this.regnbueTid = 40;   // regnen holder op: regnbue!
    this.regn.material.opacity = this.regnStyrke * 0.8;
    this.regn.visible = this.regnStyrke > 0.02;
    if (this.regn.visible) {
      const p = this.regn.geometry.attributes.position.array;
      for (let i = 0; i < p.length; i += 6) {
        let y = p[i + 1] - 22 * dt, x = p[i], z = p[i + 2];
        if (y < k.y - 10) y += 26; if (y > k.y + 16) y -= 26;
        if (x < k.x - 25) x += 50; if (x > k.x + 25) x -= 50;
        if (z < k.z - 25) z += 50; if (z > k.z + 25) z -= 50;
        p[i] = p[i + 3] = x; p[i + 2] = p[i + 5] = z; p[i + 1] = y; p[i + 4] = y - 0.7;
      }
      this.regn.geometry.attributes.position.needsUpdate = true;
    }
    this.s.lyd.regn?.(this.regnStyrke);
    if (regner && this.regnStyrke > 0.8 && (this.tordenTid -= dt) <= 0) {   // stille torden langt væk
      this.tordenTid = 12 + Math.random() * 16; this.glimt = 1; this.s.lyd.torden?.();
    }
    // regnbuen står på himlen modsat solen
    this.regnbueTid = Math.max(0, this.regnbueTid - dt);
    const vis = Math.min(1, this.regnbueTid / 6, (40 - this.regnbueTid) / 4);
    this.regnbue.visible = this.regnbueTid > 0;
    if (this.regnbue.visible) {
      this.regnbue.material.opacity = Math.max(0, vis) * 0.45;
      this.regnbue.position.set(k.x + 40, k.y - 30, k.z - 260);
    }
  }
}
