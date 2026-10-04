// ===== Byg som i Fortnite: vægge, gulve og trapper af træ =====
// Tryk G for at bygge (og G igen for at få våbnet frem). 1 er en væg, 2 et gulv og 3 en trappe — venstre klik bygger,
// og holder man knappen inde, bygger man videre, så hurtigt man løber (fx trappe på trappe op i luften).
// Alt bygges på et gitter af felter på 4 × 4 meter og 3 meter i højden. Hver del koster træ og kan skydes,
// hugges eller sprænges i stykker — og mister en del alt det, den hviler på, styrter den sammen.
// Træ får man, når man hugger i noget med kniven eller hakken, og når man vinder en dyst.

import * as THREE from "./three.js";

export const FELT = 4, HØJ = 3, PRIS = 10, DELE = ["væg", "gulv", "trappe"];
const LIV = { væg: 150, gulv: 140, trappe: 140 }, TRIN = 15, TYK = 0.2, RØR = 0.06;

// Træet: vandrette brædder med årer, en mørkere ramme og søm i hjørnerne (tegnes én gang)
function træTekstur() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  for (let i = 0; i < 6; i++) {                                    // seks brædder, hver sin nuance
    const l = 46 + Math.random() * 10;
    g.fillStyle = `hsl(29, 62%, ${l}%)`; g.fillRect(0, i * 256 / 6, 256, 256 / 6);
    for (let j = 0; j < 14; j++) {                                  // årer
      g.strokeStyle = `hsla(26, 60%, ${l - 14}%, 0.35)`; g.lineWidth = 1;
      const y = i * 256 / 6 + Math.random() * 256 / 6;
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + Math.random() * 6 - 3, 170, y + Math.random() * 6 - 3, 256, y); g.stroke();
    }
    g.fillStyle = "rgba(40, 22, 10, 0.55)"; g.fillRect(0, i * 256 / 6, 256, 2);   // fugen mellem brædderne
  }
  g.strokeStyle = "#74401a"; g.lineWidth = 16; g.strokeRect(8, 8, 240, 240);       // rammen
  g.strokeStyle = "rgba(255, 220, 160, 0.18)"; g.lineWidth = 2; g.strokeRect(17, 17, 222, 222);
  g.fillStyle = "#2a2a2a";
  for (const [x, y] of [[8, 8], [248, 8], [8, 248], [248, 248], [128, 8], [128, 248]]) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Overlapper to kasser [x0, y0, z0, x1, y1, z1]? (luft: hvor tæt de må komme på hinanden)
const overlap = (a, b, luft = 0) => a[0] < b[3] + luft && a[3] > b[0] - luft && a[1] < b[4] + luft && a[4] > b[1] - luft && a[2] < b[5] + luft && a[5] > b[2] - luft;
const somListe = k => [...k.min, ...k.max];
// Støtter to kasser hinanden? De skal røre hinanden langs en kant (ikke kun i et hjørne)
const rører = (a, b) => overlap(a, b, RØR) && Math.max(...[0, 1, 2].map(i => Math.min(a[i + 3], b[i + 3]) - Math.max(a[i], b[i]))) >= 0.5;
const NED = new THREE.Vector3(0, -1, 0);

export class Byggeri {
  // k: { scene, verden, kampfolk(), effekter, lyd }
  constructor(k) {
    this.k = k; this.dele = new Map(); this.træ = 0; this.valgt = "væg"; this.aktiv = false; this.vokser = []; this.vent = 0; this.sidst = null;
    this.mat = new THREE.MeshStandardMaterial({ map: træTekstur(), roughness: 0.85, metalness: 0 });
    this.geo = { væg: new THREE.BoxGeometry(FELT, HØJ, TYK), gulv: new THREE.BoxGeometry(FELT, TYK, FELT), trappe: new THREE.BoxGeometry(FELT, TYK, Math.hypot(FELT, HØJ)) };
    // forhåndsvisningen: blå, hvor man kan bygge — rød, hvor man ikke kan
    this.spøgMat = new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0.3, depthWrite: false });
    this.kantMat = new THREE.LineBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.9 });
    this.spøgelse = {};
    for (const t of DELE) {
      const m = new THREE.Mesh(this.geo[t], this.spøgMat); m.add(new THREE.LineSegments(new THREE.EdgesGeometry(this.geo[t]), this.kantMat));
      m.visible = false; m.renderOrder = 5; k.scene.add(m); this.spøgelse[t] = m;
    }
  }

  // ---------- Hvor kommer delen? ----------
  // Ud fra hvor man står, og hvilken vej man kigger: væggen på kanten af ens eget felt, gulvet og trappen i feltet foran
  mål(a, t = this.valgt) {
    const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw), y = a.pos.y, langsX = Math.abs(fx) > Math.abs(fz);
    const felt = d => [Math.floor((a.pos.x + fx * d) / FELT), Math.floor((a.pos.z + fz * d) / FELT)];
    if (t === "væg") {                                              // (den nærmeste gitterlinje mindst en halv meter foran)
      const [cx, cz] = felt(0), niv = Math.floor((y + 0.2) / HØJ) + (a.pitch > 0.75 ? 1 : 0);
      const kant = (p, f) => f > 0 ? Math.ceil((p + 0.6) / FELT) : Math.floor((p - 0.6) / FELT);
      return langsX ? { t, ret: "x", e: kant(a.pos.x, fx), c: cz, niv } : { t, ret: "z", e: kant(a.pos.z, fz), c: cx, niv };
    }
    if (t === "gulv") {                                             // (kigger man lige ned, kommer gulvet under en — og op: et tag)
      const [cx, cz] = felt(a.pitch < -0.85 ? 0 : 2.6);
      return { t, cx, cz, niv: Math.round(y / HØJ) + (a.pitch > 0.6 ? 1 : 0) };
    }
    // trappen: op ad, i den retning man kigger (kigger man ned, i ens eget felt) — og står man på en trappe,
    // der går samme vej, fortsætter den fra toppen
    const [cx, cz] = felt(a.pitch < -0.5 ? 0.3 : 2.4), dx = langsX ? Math.sign(fx) : 0, dz = langsX ? 0 : Math.sign(fz), under = this.under(a);
    const fortsæt = under?.m.t === "trappe" && under.m.dx === dx && under.m.dz === dz && (under.m.cx !== cx || under.m.cz !== cz);
    return { t, cx, cz, niv: fortsæt ? under.m.niv + 1 : Math.floor((y + 0.2) / HØJ), dx, dz };
  }
  // Den byggede del, man står på (eller null)
  under(a) {
    const h = this.k.verden.stråle(new THREE.Vector3(a.pos.x, a.pos.y + 0.1, a.pos.z), NED, 0.6);
    return h?.kasse.byg || null;
  }
  nøgle(m) { return m.t === "væg" ? `v${m.ret}:${m.e}:${m.c}:${m.niv}` : `${m.t}:${m.cx}:${m.cz}:${m.niv}`; }
  // Kollisionen: én kasse for en væg og et gulv — og en række trin for en trappe (så man kan gå op ad den)
  kasser(m) {
    const y = m.niv * HØJ;
    if (m.t === "væg") {
      const a = m.e * FELT, b = m.c * FELT;
      return [m.ret === "x" ? [a - TYK / 2, y, b, a + TYK / 2, y + HØJ, b + FELT] : [b, y, a - TYK / 2, b + FELT, y + HØJ, a + TYK / 2]];
    }
    const x = m.cx * FELT, z = m.cz * FELT;
    if (m.t === "gulv") return [[x, y - TYK, z, x + FELT, y, z + FELT]];
    const ud = [];
    for (let i = 0; i < TRIN; i++) {
      const s0 = i * FELT / TRIN, s1 = (i + 1) * FELT / TRIN, top = y + (i + 1) * HØJ / TRIN;
      if (m.dx) { const x0 = m.dx > 0 ? x : x + FELT, a = x0 + m.dx * s0, b = x0 + m.dx * s1; ud.push([Math.min(a, b), top - 0.3, z, Math.max(a, b), top, z + FELT]); }
      else { const z0 = m.dz > 0 ? z : z + FELT, a = z0 + m.dz * s0, b = z0 + m.dz * s1; ud.push([x, top - 0.3, Math.min(a, b), x + FELT, top, Math.max(a, b)]); }
    }
    return ud;
  }
  // Delens model på sin plads (trappen hælder, så dens overflade følger trinene)
  placér(mesh, m) {
    const y = m.niv * HØJ;
    mesh.rotation.set(0, 0, 0);
    if (m.t === "væg") {
      if (m.ret === "x") { mesh.position.set(m.e * FELT, y + HØJ / 2, m.c * FELT + FELT / 2); mesh.rotation.y = Math.PI / 2; }
      else mesh.position.set(m.c * FELT + FELT / 2, y + HØJ / 2, m.e * FELT);
    } else if (m.t === "gulv") mesh.position.set(m.cx * FELT + FELT / 2, y - TYK / 2, m.cz * FELT + FELT / 2);
    else {
      const hæld = Math.atan2(HØJ, FELT);
      mesh.position.set(m.cx * FELT + FELT / 2, y + HØJ / 2 + 0.1 - TYK / 2 / Math.cos(hæld), m.cz * FELT + FELT / 2);
      mesh.rotation.set(hæld, Math.atan2(-m.dx, -m.dz), 0, "YXZ");
    }
  }

  // ---------- Kan der bygges her? ----------
  // Der skal være træ nok og plads (ingen andre dele, ingen kæmpere og ikke midt i banen) — og delen skal hvile på noget
  // (den, der bygger, må gerne stå, hvor trappen kommer — så bliver man løftet op på den, hvis der er plads)
  kanBygge(m, bygger = null) {
    if (this.træ < PRIS || this.dele.has(this.nøgle(m))) return false;
    const ks = this.kasser(m), { verden } = this.k;
    for (const f of this.k.kampfolk()) {
      if (f.død) continue;
      const p = f.a.pos, krop = [p.x - f.a.b, p.y, p.z - f.a.b, p.x + f.a.b, p.y + f.a.h, p.z + f.a.b], ram = ks.filter(k => overlap(k, krop));
      if (!ram.length) continue;
      if (f.a !== bygger || m.t !== "trappe" || !verden.fri(p.x, Math.max(...ram.map(k => k[4])) + 0.001, p.z, f.a.b, f.a.h)) return false;
    }
    for (const k of ks) {                                            // (lidt overlap med banen er i orden)
      const s = k.map((v, i) => { const mål = k[i % 3 + 3] - k[i % 3], ind = Math.min(0.15, mål * 0.45); return i < 3 ? v + ind : v - ind; });
      for (const b of verden.nær(s[0], s[2], s[3], s[5])) if (!b.byg && overlap(s, somListe(b))) return false;
    }
    if (m.t === "gulv" && verden.gulv(m.cx * FELT + FELT / 2, m.niv * HØJ + 0.5, m.cz * FELT + FELT / 2) >= m.niv * HØJ - 0.05) return false;   // (ikke et gulv nede i jorden)
    return this.påJorden(ks) || this.naboer(ks).size > 0;
  }
  // Rører delen jorden eller banen?
  påJorden(ks) {
    const { verden } = this.k;
    return ks.some(k => k[1] <= 0.05 || verden.nær(k[0] - RØR, k[2] - RØR, k[3] + RØR, k[5] + RØR).some(b => !b.byg && rører(k, somListe(b))));
  }
  // De andre dele, som kasserne rører
  naboer(ks, uden = null) {
    const ud = new Set();
    for (const k of ks) for (const b of this.k.verden.nær(k[0] - RØR, k[2] - RØR, k[3] + RØR, k[5] + RØR)) if (b.byg && b.byg !== uden && rører(k, somListe(b))) ud.add(b.byg);
    return ud;
  }

  // ---------- Byg ----------
  // Prøv at bygge der, man kigger (holder man knappen inde, bygges der igen, når målet flytter sig)
  prøvByg(a, nu) {
    const m = this.mål(a), n = this.nøgle(m);
    if (nu < this.vent || n === this.sidst || !this.kanBygge(m, a)) return false;
    this.byg(m); this.sidst = n; this.vent = nu + 0.12;
    const krop = [a.pos.x - a.b, a.pos.y, a.pos.z - a.b, a.pos.x + a.b, a.pos.y + a.h, a.pos.z + a.b];   // står man på trinene: op på dem
    const top = Math.max(...this.kasser(m).filter(k => overlap(k, krop)).map(k => k[4]), -Infinity);
    if (top > a.pos.y) { a.pos.y = top + 0.001; a.forrige.y = a.pos.y; }
    return true;
  }
  slip() { this.sidst = null; }
  byg(m) {
    const { verden, scene } = this.k, ks = this.kasser(m);
    const del = { m, nøgle: this.nøgle(m), liv: LIV[m.t], maks: LIV[m.t], nab: new Set(), jord: this.påJorden(ks), bund: Math.min(...ks.map(k => k[1])) };
    for (const nabo of this.naboer(ks)) { del.nab.add(nabo); nabo.nab.add(del); }
    del.kasser = ks.map(k => Object.assign(verden.tilføj(...k, "træ"), { byg: del, ingenHul: true }));
    del.mesh = new THREE.Mesh(this.geo[m.t], this.mat.clone()); del.mesh.castShadow = del.mesh.receiveShadow = true;
    this.placér(del.mesh, m); scene.add(del.mesh);
    del.midt = del.mesh.position.clone();
    del.mesh.scale.setScalar(0.25); this.vokser.push({ del, t: 0 });  // (delen vokser frem på et øjeblik)
    this.dele.set(del.nøgle, del); this.træ -= PRIS;
    this.k.lyd.byg?.(del.midt);
    return del;
  }

  // ---------- Skade ----------
  // En del tager skade (den bliver mørkere og mørkere) — og knuses, når den ikke kan mere
  skad(del, n) {
    if (!del || del.væk || n <= 0) return;
    del.liv -= n;
    const f = Math.max(0, del.liv / del.maks); del.mesh.material.color.setRGB(0.45 + 0.55 * f, 0.4 + 0.6 * f, 0.36 + 0.64 * f);
    if (del.liv <= 0) this.knus(del);
  }
  // En eksplosion: alle dele tæt på tager meget skade
  eksplosion(pos, maks, radius) {
    for (const del of [...this.dele.values()]) {
      const d = del.midt.distanceTo(pos);
      if (d < radius + 2) this.skad(del, maks * 1.6 * Math.max(0.3, 1 - d / (radius + 2)));
    }
  }
  knus(del, støtte = true, effekt = true) {
    if (del.væk) return;
    del.væk = true; this.dele.delete(del.nøgle);
    for (const k of del.kasser) this.k.verden.fjern(k);
    for (const nabo of del.nab) nabo.nab.delete(del);
    this.k.scene.remove(del.mesh); del.mesh.material.dispose();
    if (!effekt) return;
    const op = new THREE.Vector3(0, 1, 0);                            // splinter og et knæk
    for (let i = 0; i < 3; i++) this.k.effekter.nedslag(del.midt.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2.5)), op, "træ", 2);
    this.k.lyd.knæk?.(del.midt);
    if (støtte) this.styrt();
  }
  // Det, der ikke længere hviler på jorden (gennem andre dele), styrter sammen
  styrt() {
    const holdt = new Set(), kø = [...this.dele.values()].filter(d => d.jord);
    for (const d of kø) holdt.add(d);
    while (kø.length) for (const n of kø.pop().nab) if (!holdt.has(n)) { holdt.add(n); kø.push(n); }
    for (const d of [...this.dele.values()]) if (!holdt.has(d)) this.knus(d, false);
  }
  ryd() { for (const d of [...this.dele.values()]) this.knus(d, false, false); this.vokser = []; this.aktiv = false; this.sidst = null; }

  // ---------- Til botterne ----------
  // Står der en bygget del lige foran (der hvor man prøver at gå hen)?
  foran(a) {
    const o = new THREE.Vector3(a.pos.x, a.pos.y + 1.0, a.pos.z), r = new THREE.Vector3(-Math.sin(a.yaw), 0, -Math.cos(a.yaw));
    return this.k.verden.stråle(o, r, 1.5)?.kasse.byg || null;
  }
  // Hvor langt er der fra en krop (fødderne i pos) hen til delen?
  afstand(del, pos) {
    let bd = Infinity;
    for (const k of del.kasser) {
      const dx = Math.max(k.min[0] - pos.x, 0, pos.x - k.max[0]), dy = Math.max(k.min[1] - pos.y - 1, 0, pos.y + 1 - k.max[1]), dz = Math.max(k.min[2] - pos.z, 0, pos.z - k.max[2]);
      bd = Math.min(bd, Math.hypot(dx, dy, dz));
    }
    return bd;
  }
  // Den nærmeste del, man kan nå op til (fx under en spiller, der har bygget sig et tårn)
  nærmeste(pos, maks, når = 1.8) {
    let bedst = null, bd = maks;
    for (const del of this.dele.values()) { if (del.bund > pos.y + når) continue; const d = this.afstand(del, pos); if (d < bd) { bd = d; bedst = del; } }
    return bedst;
  }

  // ---------- Hvert billede ----------
  // Delene vokser frem — og forhåndsvisningen står, hvor man kigger (blå eller rød)
  tegn(dt, a) {
    for (let i = this.vokser.length - 1; i >= 0; i--) {
      const v = this.vokser[i]; v.t = Math.min(1, v.t + dt / 0.16);
      v.del.mesh.scale.setScalar(0.25 + 0.75 * (1 - (1 - v.t) ** 3));
      if (v.t >= 1) this.vokser.splice(i, 1);
    }
    for (const t of DELE) this.spøgelse[t].visible = false;
    if (!this.aktiv || !a) return;
    const m = this.mål(a), s = this.spøgelse[m.t], ok = this.kanBygge(m, a);
    this.placér(s, m); s.visible = true;
    this.spøgMat.color.setHex(ok ? 0x4aa8ff : 0xff5a4a); this.kantMat.color.setHex(ok ? 0xbfe4ff : 0xffc0b0);
  }
}
