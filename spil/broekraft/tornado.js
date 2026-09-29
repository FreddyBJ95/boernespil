// ===== Ildtornadoerne: tornadoer, der drøner rundt, suger en op og snurrer en rundt =====
// Grå tornadoer bliver til ildtornadoer, når de kører hen over ild, lava eller magma — eller tændes med 🔥.
// Ildtornadoer sætter ild i tørt græs og buske på deres vej (græsset gror igen lidt efter).
// Brandslangen slukker dem, så de giver ⭐ — og vand under dem slukker dem også.
// 🌪️ Tornadomageren laver en ny tornado, der hvor man trykker (også i de andre verdener).
// Går man ind i en tornado, bliver man suget op, snurret rundt og kastet blødt ud igen. Ingen kommer til skade.

import * as THREE from "./three.js";
import { BLOKKE, ID } from "./blokke.js";

const RINGE = 14, SEGMENTER = 18, HØJDE = 17, MAKS = 6;
const KASSE = new THREE.BoxGeometry(1, 1, 1), GLØDGEO = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const farver = liste => liste.map(f => new THREE.Color(f));
const GNIST = farver(["#ff8c1a", "#ffd23f", "#ff4d2e"]), STØV = farver(["#8a6a3a", "#a8987e", "#6a5a48"]), DAMP = new THREE.Color("#f2f2f2");
const SKYGRÅ = new THREE.Color("#9a948c"), SKYILD = new THREE.Color("#4a3a34");
const KLODSILD = farver(["#ff4a10", "#ff8a1a", "#ffc02a", "#ffe27a", "#5a2a1a"]), KLODSSTØV = farver(["#8a7a64", "#a8987e", "#c8bca4", "#6a5a48", "#e0d6c4"]);
const dummy = new THREE.Object3D();
const hex = f => [parseInt(f.slice(1, 3), 16), parseInt(f.slice(3, 5), 16), parseInt(f.slice(5, 7), 16)];
const tmp = new THREE.Vector3();

// ---------- Teksturer (tegnes én gang) ----------
// Skrå striber hele vejen rundt om tragten — de glider opad og rundt, så tornadoen ser ud til at snurre
function stribeTekstur(liste) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), bil = g.createImageData(64, 64), rgb = liste.map(hex);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const bånd = Math.sin((x + y) / 64 * Math.PI * 10) * 0.5 + 0.5, fnug = Math.sin((x * 3 + y * 2) / 64 * Math.PI * 2) * 0.5 + 0.5;
    const f = rgb[Math.min(rgb.length - 1, Math.floor(bånd * rgb.length))], a = Math.max(0, Math.min(1, bånd * 0.85 + fnug * 0.35 - 0.3));
    bil.data.set([f[0], f[1], f[2], Math.round(a * 255)], (y * 64 + x) * 4);
  }
  g.putImageData(bil, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// En blød, rund plet (gløden på jorden under en ildtornado)
function rundTekstur(indre, ydre) {
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, indre); grad.addColorStop(1, ydre);
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
// Tragten: ringe oven på hinanden — de flyttes hvert billede, så tornadoen bøjer og svajer
function lavTragt() {
  const n = (RINGE + 1) * (SEGMENTER + 1), uv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i <= RINGE; i++) for (let j = 0; j <= SEGMENTER; j++) {
    const k = i * (SEGMENTER + 1) + j;
    uv[k * 2] = j / SEGMENTER * 2; uv[k * 2 + 1] = i / RINGE * 1.5;
    if (i < RINGE && j < SEGMENTER) idx.push(k, k + SEGMENTER + 1, k + 1, k + SEGMENTER + 1, k + SEGMENTER + 2, k + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

export class Tornadoer {
  // spil: { scene, verden, sp, dyr, partikel(x,y,z,farve,vx,vy,vz,liv,g,str), lyd, sæt(x,y,z,id), point(n), besked(tekst,ms),
  //         fest(pos), slør(til, ild), stopFlyv(), kører(), online, natur (tornadoer kommer af sig selv), B, HØJ }
  constructor(spil) {
    this.s = spil;
    this.liste = []; this.gror = [];
    this.fanget = null; this.pause = 0; this.tid = 0; this.spawnT = 1.5; this.første = true; this.lydT = 0;
    this.tex = null;
  }
  teksturer() {                                                  // først når den første tornado kommer
    if (this.tex) return this.tex;
    const ild = stribeTekstur(["#7a1606", "#d8380e", "#ff6a14", "#ffa628"]), støv = stribeTekstur(["#6a5a48", "#a8987e", "#d0c4ac", "#efe6d6"]);
    this.tex = { ild: [ild, ild.clone(), ild.clone()], støv: [støv, støv.clone(), støv.clone()],
      glød: rundTekstur("rgba(255,170,60,1)", "rgba(255,80,20,0)") };
    return this.tex;
  }

  // ---------- Form: højde, bredde og bøjning ----------
  højde(t) { return HØJDE * (0.25 + 0.75 * t.str); }
  radius(t, h) { return (0.7 + 4.2 * Math.pow(Math.max(0, h), 1.6)) * (0.35 + 0.65 * t.str); }
  bøj(t, h) { return [Math.sin(t.fase + h * 2.4) * 1.2 * h, Math.cos(t.fase * 0.8 + h * 2) * 1.2 * h]; }
  // Er punktet (x, y, z) inde i tornadoen? (luft = lidt ekstra plads rundt om)
  inde(t, x, y, z, luft = 0) {
    const H = this.højde(t), h = (y - t.pos.y) / H;
    if (h < -0.1 || h > 1) return false;
    const [bx, bz] = this.bøj(t, Math.max(0, h));
    return Math.hypot(x - t.pos.x - bx, z - t.pos.z - bz) < this.radius(t, Math.max(0, h)) + luft;
  }

  // ---------- En ny tornado ----------
  ny(x, z, { ild = false, egen = false } = {}) {
    const { scene, verden } = this.s, tex = this.teksturer();
    const t = {
      pos: new THREE.Vector3(x, verden.topY(Math.floor(x), Math.floor(z)) + 1, z), retning: Math.random() * Math.PI * 2, fart: egen ? 0.8 : 2 + Math.random() * 1.5,
      str: 0, maks: 1, ild: ild ? 1 : 0, mål: ild ? 1 : 0, liv: egen ? 90 : ild ? 90 + Math.random() * 60 : 60 + Math.random() * 50,
      egen, fase: Math.random() * 10, døende: false, fangne: new Set(), tjekT: 0, sporT: 0, støvT: 0, farveIld: null,
    };
    t.g = new THREE.Group(); scene.add(t.g);
    t.geo = lavTragt();
    t.lag = [0.55, 0.8, 1].map((s, i) => {                      // tre lag: ild (lyser) og støv (grå)
      const ildM = new THREE.Mesh(t.geo, new THREE.MeshBasicMaterial({ map: tex.ild[i], transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      const støvM = new THREE.Mesh(t.geo, new THREE.MeshBasicMaterial({ map: tex.støv[i], transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      ildM.scale.set(s, 1, s); støvM.scale.set(s * 1.04, 1, s * 1.04);
      for (const m of [ildM, støvM]) { m.frustumCulled = false; m.renderOrder = 3; }
      t.g.add(støvM, ildM);
      return { ild: ildM, støv: støvM };
    });
    t.glød = new THREE.Mesh(GLØDGEO, new THREE.MeshBasicMaterial({ map: tex.glød, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    t.glød.position.y = 0.06; t.g.add(t.glød);
    t.skyMat = new THREE.MeshLambertMaterial({ color: SKYGRÅ, transparent: true, opacity: 0, depthWrite: false });   // en lille sky af røg i toppen
    t.sky = Array.from({ length: 14 }, (_, i) => {
      const k = new THREE.Mesh(KASSE, t.skyMat); k.renderOrder = 4; t.g.add(k);
      return { k, v: i / 14 * Math.PI * 2 + Math.random() * 0.3, r: 2.5 + Math.random() * 3.5, s: 1.6 + Math.random() * 1.8, dy: Math.random() * 1.6 - 0.4 };
    });
    const N = 120;                                               // små klodser af ild eller støv, der snurrer rundt og op
    t.klodser = new THREE.InstancedMesh(KASSE, new THREE.MeshBasicMaterial({ transparent: true }), N);
    t.klodser.frustumCulled = false; t.g.add(t.klodser);
    t.kl = Array.from({ length: N }, () => ({ h: Math.random(), v: Math.random() * Math.PI * 2, r: 0.7 + Math.random() * 0.5, s: 0.2 + Math.random() * 0.32, fart: 2.5 + Math.random() * 3, rot: Math.random() * 6 }));
    this.liste.push(t);
    return t;
  }
  fjern(t) {
    for (const d of t.fangne) d.holdt = null;
    if (this.fanget?.t === t) this.slip(true);
    this.s.scene.remove(t.g);
    t.geo.dispose(); t.klodser.material.dispose(); t.klodser.dispose(); t.glød.material.dispose(); t.skyMat.dispose();
    for (const l of t.lag) { l.ild.material.dispose(); l.støv.material.dispose(); }
    this.liste.splice(this.liste.indexOf(t), 1);
  }

  // ---------- Hvert billede ----------
  opdater(dt) {
    this.tid += dt;
    if (this.tex) this.tex.ild.forEach((x, i) => {              // striberne glider rundt og op
      x.offset.x += dt * [0.9, 0.6, 0.4][i]; x.offset.y -= dt * [1.3, 0.9, 0.6][i];
      this.tex.støv[i].offset.x += dt * [0.7, 0.5, 0.35][i]; this.tex.støv[i].offset.y -= dt * [0.9, 0.6, 0.45][i];
    });
    this.nyeAfSigSelv(dt);
    for (const t of [...this.liste]) {
      this.opdaterTornado(t, dt);
      if (t.døende && t.str <= 0) this.fjern(t);
    }
    this.opdaterGræs(dt);
    this.opdaterLyd();
  }
  opdaterTornado(t, dt) {
    const { verden, sp, partikel } = this.s;
    t.fase += dt * 0.9;
    t.str = t.døende ? Math.max(0, t.str - dt / 3) : t.str + (Math.min(t.maks, 1) - t.str) * Math.min(1, dt / 1.2);
    t.ild += (t.mål - t.ild) * Math.min(1, dt * 2.5);
    if (!t.døende && (t.liv -= dt) <= 0) t.døende = true;
    // vandrer rundt, holder sig inde i verdenen og kommer tit forbi barnet
    t.retning += (Math.random() - 0.5) * dt * 1.4;
    const afst = Math.hypot(sp.pos.x - t.pos.x, sp.pos.z - t.pos.z), K = 14;
    if (t.pos.x < K || t.pos.z < K || t.pos.x > verden.BX - K || t.pos.z > verden.BZ - K) this.drej(t, Math.atan2(verden.BZ / 2 - t.pos.z, verden.BX / 2 - t.pos.x), dt * 1.5);
    else if (!t.egen && afst > 22 && afst < 75) this.drej(t, Math.atan2(sp.pos.z - t.pos.z, sp.pos.x - t.pos.x), dt * 0.25);
    t.pos.x += Math.cos(t.retning) * t.fart * dt; t.pos.z += Math.sin(t.retning) * t.fart * dt;
    const bx = Math.floor(t.pos.x), bz = Math.floor(t.pos.z);
    if (verden.hentet(bx, bz)) t.pos.y += (verden.topY(bx, bz) + 1 - t.pos.y) * Math.min(1, dt * 2);
    t.g.position.copy(t.pos);
    this.tegn(t, dt);
    // støv og gnister, der hvirvler op fra jorden
    if ((t.støvT -= dt) <= 0 && afst < 50 && t.str > 0.2) {
      t.støvT = 0.05;
      const v = Math.random() * Math.PI * 2, r = 1 + Math.random() * 1.6 * t.str, gnist = t.ild > 0.5 && Math.random() < 0.6;
      partikel(t.pos.x + Math.cos(v) * r, t.pos.y + 0.2, t.pos.z + Math.sin(v) * r, (gnist ? GNIST : STØV)[Math.floor(Math.random() * 3)],
        -Math.sin(v) * 5 + Math.cos(v) * 1.5, 1 + Math.random() * 2.5, Math.cos(v) * 5 + Math.sin(v) * 1.5, 0.8 + Math.random() * 0.5, gnist ? -0.1 : 0.15, 1.4);
    }
    // ild, lava eller magma under den tænder den — vand slukker den
    if ((t.tjekT -= dt) <= 0) {
      t.tjekT = 0.25;
      let varm = false, våd = false;
      const y0 = Math.floor(t.pos.y);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (const y of [y0 - 1, y0]) {
        const id = verden.hent(bx + dx, y, bz + dz);
        if (id === ID.Magma || BLOKKE[id]?.ild || verden.væske[id] === "lava") varm = true;
        if (verden.væske[id] === "vand") våd = true;
      }
      if (varm && t.mål < 1 && !t.døende && this.tid > (t.fri || 0)) this.tænd(t);   // (ikke lige efter, den er blevet slukket)
      if (våd && t.mål > 0) this.vand(t, 0.12, t.pos.x, t.pos.y + 0.5, t.pos.z, false);
    }
    // en ildtornado sætter ild i det tørre græs, den kører hen over (alene — sammen styrer serveren ilden)
    if (!this.s.online && t.ild > 0.6 && t.str > 0.6 && (t.sporT -= dt) <= 0) { t.sporT = 0.3; this.brænd(t); }
    this.fangDyr(t, dt);
  }
  drej(t, mål, k) {
    const d = ((mål - t.retning) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    t.retning += d * Math.min(1, k);
  }
  // Tragten, gløden, skyen og prikkerne
  tegn(t, dt) {
    const H = this.højde(t), I = t.ild, S = Math.min(1, t.str * 1.5), p = t.geo.attributes.position.array;
    for (let i = 0; i <= RINGE; i++) {
      const h = i / RINGE, r = this.radius(t, h), [bx, bz] = this.bøj(t, h);
      for (let j = 0; j <= SEGMENTER; j++) {
        const v = j / SEGMENTER * Math.PI * 2, k = (i * (SEGMENTER + 1) + j) * 3;
        p[k] = bx + Math.cos(v) * r; p[k + 1] = h * H; p[k + 2] = bz + Math.sin(v) * r;
      }
    }
    t.geo.attributes.position.needsUpdate = true;
    t.lag.forEach(({ ild, støv }, i) => {
      ild.material.opacity = I * S * [0.8, 0.55, 0.4][i]; ild.visible = ild.material.opacity > 0.01;
      støv.material.opacity = (1 - I * 0.8) * S * [0.8, 0.6, 0.45][i];
    });
    t.glød.material.opacity = I * S * 0.75; t.glød.scale.setScalar(2.5 + 2.5 * t.str);
    t.skyMat.color.copy(SKYGRÅ).lerp(SKYILD, I); t.skyMat.opacity = 0.75 * S;
    const [tx, tz] = this.bøj(t, 1);
    for (const s of t.sky) {
      s.v += dt * 0.8;
      const r = s.r * (0.4 + 0.6 * t.str);
      const k = s.s * (0.4 + 0.6 * t.str);
      s.k.position.set(tx + Math.cos(s.v) * r, H + s.dy, tz + Math.sin(s.v) * r); s.k.scale.set(k, k * 0.7, k);
      s.k.rotation.set(s.v * 0.5, s.v, 0);
    }
    const ild = I > 0.5;
    t.kl.forEach((q, i) => {                                     // klodserne snurrer rundt og op — og bliver små helt oppe
      q.h += dt * q.fart / H; if (q.h > 1) q.h -= 1;
      q.v += dt * (5 - q.h * 3);
      const r = this.radius(t, q.h) * q.r, [bx, bz] = this.bøj(t, q.h), s = q.s * (0.6 + q.h * 1.3) * S;
      dummy.position.set(bx + Math.cos(q.v) * r, q.h * H, bz + Math.sin(q.v) * r);
      dummy.rotation.set(q.rot + q.v, q.v, 0);
      dummy.scale.setScalar(q.h > 0.9 ? s * (1 - q.h) * 10 : s);
      dummy.updateMatrix(); t.klodser.setMatrixAt(i, dummy.matrix);
    });
    t.klodser.instanceMatrix.needsUpdate = true;
    if (t.farveIld !== ild) {                                    // farverne skifter kun, når tornadoen tændes eller slukkes
      t.farveIld = ild;
      t.kl.forEach((q, i) => t.klodser.setColorAt(i, (ild ? KLODSILD : KLODSSTØV)[i % 5]));
      t.klodser.instanceColor.needsUpdate = true;
    }
    t.klodser.material.opacity = S;
  }

  // ---------- Ild og vand ----------
  tænd(t) {
    t.mål = 1; t.liv = Math.max(t.liv, 45);
    const { sp, partikel } = this.s, H = this.højde(t);
    this.s.lyd.tornadoTænd(Math.hypot(t.pos.x - sp.pos.x, t.pos.z - sp.pos.z));
    for (let i = 0; i < 40; i++) {
      const h = Math.random(), v = Math.random() * Math.PI * 2, r = this.radius(t, h);
      partikel(t.pos.x + Math.cos(v) * r, t.pos.y + h * H, t.pos.z + Math.sin(v) * r, GNIST[i % 3], Math.cos(v) * 3, 1 + Math.random() * 2, Math.sin(v) * 3, 0.8, -0.1, 1.6);
    }
  }
  // Brandslangen: gå hen ad vandstrålen og se, om den rammer en tornado (vandet går igennem den)
  sprøjt(fra, r, maks = 11, mængde = 0.07) {
    for (const t of this.liste) {
      if (t.døende) continue;
      for (let s = 1; s <= maks; s += 0.5) {
        const x = fra.x + r.x * s, y = fra.y + r.y * s - 0.012 * s * s, z = fra.z + r.z * s;
        if (!this.inde(t, x, y, z, 0.6)) continue;
        this.vand(t, mængde, x, y, z);
        break;
      }
    }
  }
  // Vand på tornadoen: ildtornadoen bliver mindre og mindre brændende — en grå tornado skrumper
  // (barn = brandslangen: så giver det ⭐ · ellers var det en flod eller et bassin, den kørte hen over)
  vand(t, mængde, x, y, z, barn = true) {
    const { partikel } = this.s;
    for (let i = 0; i < 4; i++) partikel(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), DAMP, (Math.random() - 0.5) * 1.5, 1.5 + Math.random(), (Math.random() - 0.5) * 1.5, 1.1, -0.08, 2.4);
    if (t.mål > 0) {
      t.mål = Math.max(0, t.mål - mængde); t.ild = Math.min(t.ild, t.mål + 0.2);
      if (t.mål <= 0) this.slukket(t, barn);
    } else if (barn && (t.maks -= mængde * 0.8) < 0.3) this.væk(t, 1);
  }
  slukket(t, barn) {
    const { sp, partikel } = this.s, H = this.højde(t), afst = Math.hypot(t.pos.x - sp.pos.x, t.pos.z - sp.pos.z);
    t.mål = 0; t.liv = Math.min(t.liv, 12); t.fri = this.tid + 10;
    for (let i = 0; i < 50; i++) {                               // en stor sky af damp
      const h = Math.random(), v = Math.random() * Math.PI * 2, r = this.radius(t, h) * Math.random();
      partikel(t.pos.x + Math.cos(v) * r, t.pos.y + h * H, t.pos.z + Math.sin(v) * r, DAMP, Math.cos(v) * 2, 1 + Math.random() * 2, Math.sin(v) * 2, 1.6 + Math.random(), -0.06, 3.5);
    }
    if (!barn) { this.s.lyd.tss(afst); return; }
    this.s.lyd.tornadoSlukket(afst);
    this.s.point(3); this.s.fest(tmp.set(t.pos.x, t.pos.y + H * 0.5, t.pos.z));
    if (!this.tipSlukket) { this.tipSlukket = true; this.s.besked("💨 Du slukkede ildtornadoen! ⭐", 3000); }
  }
  væk(t, point) {
    if (t.døende) return;
    t.døende = true; this.s.point(point);
    for (let i = 0; i < 16; i++) this.s.partikel(t.pos.x + (Math.random() - 0.5) * 2, t.pos.y + Math.random() * 3, t.pos.z + (Math.random() - 0.5) * 2, DAMP, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 1.2, -0.06, 2.6);
    this.s.lyd.slynget();
  }
  brænd(t) {
    const { verden, sæt } = this.s;
    const v = Math.random() * Math.PI * 2, r = Math.random() * 1.8, x = Math.floor(t.pos.x + Math.cos(v) * r), z = Math.floor(t.pos.z + Math.sin(v) * r);
    if (!verden.inde(x, 0, z)) return;
    const y = verden.topY(x, z), id = verden.hent(x, y, z), over = verden.hent(x, y + 1, z);
    if (over && BLOKKE[over]?.kryds && BLOKKE[over].lyd === "græs") sæt(x, y + 1, z, ID.Ild);        // busken eller blomsten brænder op
    else if (!over && id === ID["Tørt græs"]) {
      sæt(x, y, z, ID["Brændt jord"]); this.gror.push({ x, y, z, t: 40 + Math.random() * 40 });
      if (Math.random() < 0.4) sæt(x, y + 1, z, ID.Ild);
    } else if (!over && (id === ID.Blade || id === ID["Træstamme"]) && Math.random() < 0.3) sæt(x, y + 1, z, ID.Ild);
  }
  // Det brændte græs gror igen
  opdaterGræs(dt) {
    const { verden, sæt, partikel } = this.s;
    for (let i = this.gror.length - 1; i >= 0; i--) {
      const g = this.gror[i];
      if ((g.t -= dt) > 0) continue;
      this.gror.splice(i, 1);
      if (verden.hent(g.x, g.y, g.z) !== ID["Brændt jord"] || verden.fast[verden.hent(g.x, g.y + 1, g.z)]) continue;
      sæt(g.x, g.y, g.z, ID["Tørt græs"]);
      for (let k = 0; k < 3; k++) partikel(g.x + Math.random(), g.y + 1.1, g.z + Math.random(), STØV[1], 0, 1.2, 0, 0.6, 0.5, 0.8);
    }
  }

  // ---------- Barnet og dyrene bliver suget op ----------
  // Svarer true, mens tornadoen styrer barnet (så går og hopper man ikke selv imens)
  styrSpiller(dt) {
    const { sp, verden } = this.s;
    this.pause = Math.max(0, this.pause - dt);
    if (!this.fanget) {
      if (this.pause > 0 || this.s.kører()) return false;
      for (const t of this.liste) {
        if (t.str < 0.55 || t.døende || !this.inde(t, sp.pos.x, sp.pos.y + 0.5, sp.pos.z, 1.1)) continue;
        const [bx, bz] = this.bøj(t, 0), dx = sp.pos.x - t.pos.x - bx, dz = sp.pos.z - t.pos.z - bz;
        this.fanget = { t, v: Math.atan2(dz, dx), r: Math.max(1, Math.hypot(dx, dz)), h: Math.max(0.3, sp.pos.y - t.pos.y), tid: 0 };
        if (sp.flyver) this.s.stopFlyv();
        this.s.lyd.suget(); this.s.slør(true, t.ild);
        if (!this.tipSuget) { this.tipSuget = true; this.s.besked("🌪️ Du snurrer rundt i tornadoen!", 2500); }
        break;
      }
      if (!this.fanget) return false;
    }
    const f = this.fanget, t = f.t, H = this.højde(t), ω = 3 + f.tid * 0.9;
    f.tid += dt; f.v += ω * dt;
    f.h = Math.min(H * 0.62, f.h + (2.8 + f.tid * 1.2) * dt);
    f.r += (1.6 + f.h * 0.12 - f.r) * Math.min(1, dt * 2);
    const [bx, bz] = this.bøj(t, f.h / H);
    tmp.set(t.pos.x + bx + Math.cos(f.v) * f.r, t.pos.y + f.h, t.pos.z + bz + Math.sin(f.v) * f.r).sub(sp.pos);
    const mål = tmp.clone().add(sp.pos);
    verden.bevæg(sp.pos, tmp, this.s.B, this.s.HØJ);
    sp.vel.set(0, 0, 0); sp.jord = false;
    sp.yaw -= ω * dt * 0.45;                                     // verden drejer lidt rundt om én
    this.s.slør(true, t.ild);
    if (f.tid > 3.4 || t.døende || sp.pos.distanceTo(mål) > 3) this.slip(true);   // (en klippe er i vejen: så slipper den)
    return true;
  }
  slip(kast = false) {
    const f = this.fanget;
    if (!f) return;
    this.fanget = null; this.pause = 4; this.s.slør(false);
    if (!kast) return;
    const { sp } = this.s;
    sp.vel.set(-Math.sin(f.v) * 7 + Math.cos(f.v) * 6, 8, Math.cos(f.v) * 7 + Math.sin(f.v) * 6);   // blødt ud til siden
    this.s.lyd.slynget();
  }
  fangDyr(t, dt) {
    const { dyr, verden } = this.s, H = this.højde(t);
    if (t.str > 0.55 && !t.døende && t.fangne.size < 4) for (const d of dyr) {
      if (d.holdt || d.def.evne === "svømmer" || (d.friT || 0) > this.tid || !this.inde(t, d.pos.x, d.pos.y + 0.3, d.pos.z, 0.4)) continue;
      const [bx, bz] = this.bøj(t, 0), dx = d.pos.x - t.pos.x - bx, dz = d.pos.z - t.pos.z - bz;
      d.holdt = { v: Math.atan2(dz, dx), r: Math.max(1, Math.hypot(dx, dz)), h: Math.max(0.3, d.pos.y - t.pos.y), tid: 0 };
      t.fangne.add(d);
      if (t.fangne.size >= 4) break;
    }
    for (const d of t.fangne) {
      const f = d.holdt;
      if (!f || !dyr.includes(d)) { t.fangne.delete(d); continue; }
      f.tid += dt; f.v += (3.5 + f.tid) * dt;
      f.h = Math.min(H * 0.55, f.h + 3 * dt);
      f.r += (1.4 + f.h * 0.15 - f.r) * Math.min(1, dt * 2);
      const [bx, bz] = this.bøj(t, f.h / H);
      tmp.set(t.pos.x + bx + Math.cos(f.v) * f.r, t.pos.y + f.h, t.pos.z + bz + Math.sin(f.v) * f.r).sub(d.pos);
      verden.bevæg(d.pos, tmp, d.b, d.h);
      if (f.tid > 2.6 || t.døende) {                             // kastes ud og lander blødt
        d.holdt = null; t.fangne.delete(d); d.friT = this.tid + 3; d.jord = false;
        d.vel.set(0, 7, 0); d.skub.set(-Math.sin(f.v) * 6 + Math.cos(f.v) * 4, 0, Math.cos(f.v) * 6 + Math.sin(f.v) * 4);
      }
    }
  }

  // ---------- Tryk: tænd en tornado med 🔥, eller lav en ny med 🌪️ ----------
  ramt(stråle, maks = 32) {
    for (let s = 0.5; s <= maks; s += 0.5) {
      tmp.copy(stråle.origin).addScaledVector(stråle.direction, s);
      const t = this.liste.find(t => !t.døende && this.inde(t, tmp.x, tmp.y, tmp.z, 0.8));
      if (t) return t;
    }
    return null;
  }
  tændVed(stråle) {
    const t = this.ramt(stråle);
    if (!t) return false;
    if (t.mål < 1) this.tænd(t);
    return true;
  }
  lav(hit, stråle) {
    const { sp, verden, partikel } = this.s;
    let x = hit ? hit.x + 0.5 : stråle.origin.x + stråle.direction.x * 8, z = hit ? hit.z + 0.5 : stråle.origin.z + stråle.direction.z * 8;
    const l = Math.hypot(x - sp.pos.x, z - sp.pos.z);
    if (l < 3) { const fx = -Math.sin(sp.yaw), fz = -Math.cos(sp.yaw); x = sp.pos.x + fx * 4; z = sp.pos.z + fz * 4; }   // ikke lige oven i sig selv
    x = Math.max(3, Math.min(verden.BX - 3, x)); z = Math.max(3, Math.min(verden.BZ - 3, z));
    const levende = this.liste.filter(t => !t.døende);
    if (levende.length >= MAKS) (levende.find(t => t.egen) || levende[0]).døende = true;   // den ældste forsvinder
    const under = verden.hent(Math.floor(x), verden.topY(Math.floor(x), Math.floor(z)), Math.floor(z));
    const t = this.ny(x, z, { ild: under === ID.Magma || verden.væske[under] === "lava", egen: true });
    t.retning = Math.atan2(z - sp.pos.z, x - sp.pos.x) + (Math.random() - 0.5) * 2.5;   // den kører stille og roligt væk fra barnet
    this.s.lyd.slynget();
    for (let i = 0; i < 20; i++) { const v = Math.random() * Math.PI * 2; partikel(x, t.pos.y + 0.3, z, STØV[i % 3], Math.cos(v) * 4, 1 + Math.random() * 2, Math.sin(v) * 4, 0.9, 0.2, 1.4); }
  }

  // ---------- Ildtornadoerne: der kommer hele tiden nye tornadoer (højst tre ad gangen, mindst én med ild) ----------
  nyeAfSigSelv(dt) {
    const { sp, verden } = this.s;
    if (!this.s.natur || (this.spawnT -= dt) > 0) return;
    this.spawnT = 5;
    const naturlige = this.liste.filter(t => !t.egen && !t.døende);
    if (naturlige.length >= 3) return;
    const ild = !naturlige.some(t => t.mål > 0) || Math.random() < 0.5;
    for (let f = 0; f < 12; f++) {
      const v = Math.random() * Math.PI * 2, r = this.første ? 24 + Math.random() * 10 : 32 + Math.random() * 26;
      const x = sp.pos.x + Math.cos(v) * r, z = sp.pos.z + Math.sin(v) * r;
      if (x < 10 || z < 10 || x > verden.BX - 10 || z > verden.BZ - 10 || !verden.hentet(Math.floor(x), Math.floor(z))) continue;
      const t = this.ny(x, z, { ild });
      t.retning = Math.atan2(sp.pos.z - z, sp.pos.x - x) + (Math.random() - 0.5) * 1.2;   // på vej hen mod barnet
      if (this.første) { this.første = false; this.spawnT = 2; }
      return;
    }
  }
  // Tornadoens susen: jo tættere på, jo højere — og ildtornadoer knitrer
  opdaterLyd() {
    const { sp } = this.s;
    let styrke = this.fanget ? 1 : 0, nærIld = Infinity;
    for (const t of this.liste) {
      const a = Math.hypot(t.pos.x - sp.pos.x, t.pos.z - sp.pos.z);
      styrke = Math.max(styrke, t.str * Math.max(0, 1 - a / 45));
      if (t.ild > 0.5) nærIld = Math.min(nærIld, a);
    }
    this.s.lyd.vindLyd(styrke); this.stum = false;
    if (nærIld < 25 && Math.random() < 0.04) this.s.lyd.knitre(nærIld);
  }
  stille() { if (!this.stum) { this.stum = true; this.s.lyd.vindLyd(0); } }   // når spillet holder pause
}
