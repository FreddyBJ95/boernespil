// ===== Sprængstoffet: ladninger på bygningerne og ting, der kan starte en kædereaktion =====
// Ladninger (dynamit, C4, skæreladning) sættes fast på en søjle eller en mur. TNT-kasser, benzintønder og
// gasflasker stilles på jorden. Når der trykkes på tændingsboksen, går ladningerne af — hver med sin egen
// forsinkelse. Tønder og gasflasker går ikke af ved tændingen, men når ild eller en trykbølge når dem:
// tønden bliver til en ildkugle, og gasflasken kan blive slået læk og flyve af sted som en raket.

import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { RAPIER, fysik, stråle } from "./fysik.js";
import { MATERIALER, mindre } from "./materialer.js";
import { mobil } from "./enhed.js";

// W: hvor kraftig (kg TNT) · fast: sættes på en del · art: hvordan ilden ser ud · krop: form i fysikken
export const SPRÆNGSTOF = {
  dynamit: { navn: "Dynamit", W: 0.7, pris: 200, fast: true, model: "dynamit", art: "høj", tekst: "Til mursten og træ" },
  c4:      { navn: "C4", W: 2, pris: 600, fast: true, model: "c4", art: "høj", tekst: "Kraftig — knuser beton" },
  skær:    { navn: "Skæreladning", W: 0.35, pris: 900, fast: true, model: "skaereladning", art: "høj", skærer: true, tekst: "Skærer stål over" },
  tnt:     { navn: "TNT-kasse", W: 7, pris: 1500, fast: false, model: "tntkasse", art: "høj", krop: "kasse", str: [0.6, 0.4, 0.4], masse: 35, tænder: true, tekst: "Stor sprængning" },
  tønde:   { navn: "Benzintønde", W: 3, pris: 150, fast: false, model: "tonde", art: "benzin", krop: "cylinder", str: [0.58, 0.88, 0.58], masse: 190, tekst: "Ildkugle — starter kæden" },
  gas:     { navn: "Gasflaske", W: 1.4, pris: 250, fast: false, model: "gasflaske", art: "gas", krop: "cylinder", str: [0.3, 0.58, 0.3], masse: 24, raket: true, tekst: "Kan flyve af sted" },
  gastank: { navn: "Gastank", W: 30, pris: 0, fast: false, model: "gastank", art: "gas", krop: "kasse", str: [6, 2.6, 1.9], masse: 9000, tekst: "Kæmpe ildkugle" },
  termit:  { navn: "Termit", W: 0, pris: 700, fast: true, model: "termit", art: "termit", termit: true, tekst: "Brænder sig gennem stål" },
  bjerg:   { navn: "Bjergladning", W: 14, pris: 3000, fast: true, model: "bjergladning", art: "høj", tekst: "Kæmpestor — til klipper og sne" },
  fyrværkeri: { navn: "Fyrværkeri", W: 0.5, pris: 300, fast: false, model: "fyrvaerkeri", art: "høj", krop: "kasse", str: [0.6, 0.45, 0.45], masse: 18, tænder: true, fyrværkeri: true, tekst: "Raketter, der tænder alt" },
  lunte:   { navn: "Lunte", pris: 25, lunte: true, model: "lunte", tekst: "Træk den hen over jorden" },
};
const FARVER = [[1, 0.22, 0.18], [0.3, 1, 0.35], [0.35, 0.55, 1], [1, 0.82, 0.25], [1, 0.35, 1], [1, 1, 1], [0.3, 1, 1]];

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
const r = (a, b) => a + Math.random() * (b - a);

// ---------- Modellerne: fra Blender (tønde, gasflaske, gastank, trækasse) — de små ladninger laves her ----------
const BLENDER = new Set(["tonde", "gasflaske", "gastank", "tntkasse"]);
function lille(navn) {
  const g = new THREE.Group(), m = (farve, ru = 0.6, met = 0, ekstra = {}) => new THREE.MeshStandardMaterial({ color: farve, roughness: ru, metalness: met, ...ekstra });
  const tilføj = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const ledning = (farve, punkter) => tilføj(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punkter.map(p => new THREE.Vector3(...p))), 16, 0.0025, 5), m(farve, 0.5));
  if (navn === "dynamit") {
    const papir = m(0xa8261c, 0.75), tape = m(0x111111, 0.4);
    for (const [y, z] of [[0.016, -0.031], [0.016, 0.031], [0.042, 0]]) tilføj(new THREE.CylinderGeometry(0.0155, 0.0155, 0.2, 14), papir, 0, y, z, 0, 0, Math.PI / 2);
    for (const x of [-0.055, 0.055]) tilføj(new THREE.CylinderGeometry(0.0335, 0.0335, 0.022, 18), tape, x, 0.026, 0, 0, 0, Math.PI / 2).scale.set(1, 1, 0.82);
    tilføj(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8), m(0x9a9a9a, 0.3, 0.9), 0.112, 0.042, 0, 0, 0, Math.PI / 2);
    ledning(0xc81e1e, [[0.125, 0.042, 0], [0.16, 0.05, 0.01], [0.2, 0.03, 0.03]]);
    ledning(0xe8c21c, [[0.125, 0.042, 0.003], [0.165, 0.045, -0.012], [0.21, 0.025, -0.02]]);
  } else if (navn === "c4") {
    tilføj(new THREE.BoxGeometry(0.28, 0.05, 0.08), m(0x6b6a55, 0.55, 0, { envMapIntensity: 1.3 }), 0, 0.025);
    tilføj(new THREE.BoxGeometry(0.16, 0.002, 0.06), m(0xcfc49a, 0.8), -0.03, 0.051);
    tilføj(new THREE.BoxGeometry(0.035, 0.016, 0.022), m(0x151515, 0.4), 0.09, 0.058);
    tilføj(new THREE.SphereGeometry(0.004, 8, 6), m(0xff2010, 0.3, 0, { emissive: 0xff2010, emissiveIntensity: 4 }), 0.1, 0.067, 0.005);
    ledning(0xc81e1e, [[0.105, 0.058, -0.005], [0.15, 0.06, -0.02], [0.2, 0.03, -0.04]]);
    ledning(0x222222, [[0.105, 0.058, 0.005], [0.15, 0.062, 0.02], [0.19, 0.035, 0.05]]);
  } else if (navn === "skaereladning") {
    const profil = new THREE.Shape([new THREE.Vector2(-0.02, 0), new THREE.Vector2(0.02, 0), new THREE.Vector2(0, 0.028)]);
    const geo = new THREE.ExtrudeGeometry(profil, { depth: 0.5, bevelEnabled: false }); geo.translate(0, 0, -0.25);
    tilføj(geo, m(0xb87333, 0.35, 0.9), 0, 0, 0, 0, Math.PI / 2, 0);
    tilføj(new THREE.BoxGeometry(0.035, 0.022, 0.03), m(0x151515, 0.4), 0.27, 0.011);
    ledning(0xc81e1e, [[0.29, 0.015, 0], [0.33, 0.02, 0.02], [0.38, 0.01, 0.03]]);
  } else if (navn === "termit") {
    tilføj(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 16), m(0x8c9096, 0.4, 0.8), 0, 0.08);
    tilføj(new THREE.CylinderGeometry(0.052, 0.052, 0.05, 16), m(0xc23a1a, 0.6), 0, 0.09);
    tilføj(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), m(0x222222, 0.5), 0, 0.185);
    ledning(0xe8c21c, [[0, 0.21, 0], [0.04, 0.24, 0.02], [0.09, 0.22, 0.05]]);
  } else if (navn === "bjergladning") {
    tilføj(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 16), m(0xe0701c, 0.55), 0, 0.06, 0, 0, 0, Math.PI / 2);
    for (const x of [-0.2, 0.2]) tilføj(new THREE.CylinderGeometry(0.063, 0.063, 0.04, 16), m(0x2a2a2a, 0.5), x, 0.06, 0, 0, 0, Math.PI / 2);
    ledning(0xf0d020, [[0.28, 0.06, 0], [0.34, 0.08, 0.04], [0.42, 0.03, 0.08], [0.5, 0.02, 0.06]]);
  } else if (navn === "fyrvaerkeri") {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128;
    const gc = c.getContext("2d");
    gc.fillStyle = "#1b2a6b"; gc.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 26; i++) { gc.fillStyle = ["#ffd23a", "#ff4a6a", "#5ad2ff", "#8aff6a"][i % 4]; gc.beginPath(); const x = (i * 53) % 256, y = (i * 37) % 128, s = 4 + (i % 4) * 3; for (let k = 0; k < 10; k++) { const v = k * Math.PI / 5, rr = k % 2 ? s / 2 : s; gc.lineTo(x + Math.cos(v) * rr, y + Math.sin(v) * rr); } gc.fill(); }
    gc.fillStyle = "#ffd23a"; gc.font = "bold 30px sans-serif"; gc.fillText("RAKETTER", 46, 74);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    tilføj(new THREE.BoxGeometry(0.6, 0.45, 0.45), m(0xffffff, 0.7, 0, { map: t }), 0, 0.225);
    for (let i = 0; i < 9; i++) tilføj(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 10), m([0xd8341f, 0xffd23a, 0x2a8ad8][i % 3], 0.5), -0.18 + (i % 3) * 0.18, 0.49, -0.13 + Math.floor(i / 3) * 0.13);
  } else if (navn === "lunte") {
    const pkt = []; for (let i = 0; i <= 60; i++) { const v = i * 0.42, rr = 0.05 + i * 0.0018; pkt.push(new THREE.Vector3(Math.cos(v) * rr, 0.012 + (i % 12 === 0 ? 0.002 : 0), Math.sin(v) * rr)); }
    tilføj(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pkt), 120, 0.009, 5), m(0x3b2c1e, 0.85));
    tilføj(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), m(0xd06a1a, 0.5), Math.cos(25.2) * 0.158, 0.02, Math.sin(25.2) * 0.158);
  } else {
    // reserve, hvis en model fra Blender ikke kan hentes
    if (navn === "tonde") tilføj(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 28), m(0x9a2418, 0.5, 0.4), 0, 0.44);
    else if (navn === "gasflaske") tilføj(new THREE.CapsuleGeometry(0.15, 0.28, 6, 20), m(0x8a8f96, 0.45, 0.6), 0, 0.29);
    else if (navn === "tntkasse") tilføj(new THREE.BoxGeometry(0.6, 0.4, 0.4), m(0x8a5a32, 0.9), 0, 0.2);
    else if (navn === "gastank") tilføj(new THREE.CapsuleGeometry(0.9, 4.2, 8, 24), m(0xe8e8e2, 0.5, 0.2), 0, 1.6, 0, 0, 0, Math.PI / 2);
  }
  return g;
}

export async function hentModeller() {
  const loader = new GLTFLoader(), ud = {};
  await Promise.all(Object.values(SPRÆNGSTOF).map(async def => {
    if (!BLENDER.has(def.model)) { ud[def.model] = lille(def.model); return; }
    try {
      const g = await loader.loadAsync(`modeller/${def.model}.glb`);
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = true;
        if (mobil) for (const k of ["map", "metalnessMap", "roughnessMap", "normalMap"]) if (o.material[k]) mindre(o.material[k], 256);
        if (o.material.transparent) { o.material.transparent = false; o.material.alphaTest = 0.5; o.material.depthWrite = true; o.material.side = THREE.FrontSide; o.castShadow = false; }   // mærkaterne
      });
      ud[def.model] = g.scene;
    } catch (_) { ud[def.model] = lille(def.model); }
  }));
  return ud;
}

// ===== Alt sprængstof i banen =====
export class Sprængstof {
  constructor(ctx, modeller) {
    this.ctx = ctx; this.modeller = modeller;
    this.alle = []; this.venter = []; this.raketter = []; this.termitter = []; this.fyr = []; this.skud = [];
    this.kæde = 0; this.sprængninger = 0; this.forbrug = 0; this.sidsteBrag = -99;
  }
  tøm() {
    for (const l of this.alle) this.fjernVisning(l);
    this.alle = []; this.venter = []; this.raketter = []; this.termitter = []; this.fyr = []; this.skud = []; this.kæde = 0; this.sprængninger = 0; this.forbrug = 0;
  }
  model(def) {
    const m = this.modeller[def.model].clone(true);
    this.ctx.scene.add(m);
    return m;
  }

  // ---------- Sæt en ladning fast på en del (træf: punkt og normal fra strålen) ----------
  sætFast(type, del, punkt, normal, forsinkelse = 0) {
    const def = SPRÆNGSTOF[type];
    const n = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
    const { p, q } = this.ctx.dele.sted(del, new THREE.Vector3(), new THREE.Quaternion());
    const qi = q.clone().invert();
    const l = {
      type, def, del, forsinkelse, tændt: false, væk: false, spiller: true,
      lokP: new THREE.Vector3(punkt.x, punkt.y, punkt.z).sub(p).applyQuaternion(qi),
      lokQ: qi.clone().multiply(new THREE.Quaternion().setFromUnitVectors(Y, n)).multiply(tmpQ.setFromAxisAngle(Y, Math.random() * 6.28)),
    };
    l.mesh = this.model(def);
    l.flyt = () => this.flytFast(l);
    del.ladninger.push(l);
    this.flytFast(l);
    this.alle.push(l); this.forbrug += def.pris;
    return l;
  }
  flytFast(l) {
    if (!l.mesh || !l.del || l.del.væk) return;                  // sprunget eller faldet af
    const { p, q } = this.ctx.dele.sted(l.del, tmp, tmpQ);
    l.mesh.position.copy(l.lokP).applyQuaternion(q).add(p);
    l.mesh.quaternion.copy(q).multiply(l.lokQ);
  }
  // ---------- Stil en ting (tønde, gasflaske, TNT, gastank) på jorden eller en flade ----------
  stil(type, punkt, { spiller = true, yaw = Math.random() * 6.28, forsinkelse = 0, liggende = false } = {}) {
    const def = SPRÆNGSTOF[type], [sx, sy, sz] = def.str;
    const q = new THREE.Quaternion().setFromAxisAngle(Y, yaw);
    if (liggende) q.multiply(tmpQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    const op = liggende ? sz / 2 : sy / 2;
    const krop = fysik.verden.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(punkt.x, punkt.y + op + 0.01, punkt.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setAngularDamping(0.3));
    const cd = def.krop === "cylinder" ? RAPIER.ColliderDesc.cylinder(sy / 2, sx / 2) : RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2);
    cd.setMass(def.masse).setFriction(0.7).setRestitution(0.1).setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(def.masse * 9.81 * 25);
    const kol = fysik.verden.createCollider(cd, krop);
    const l = { type, def, krop, kol, forsinkelse, tændt: false, væk: false, spiller, ting: true, halv: sy / 2 };
    fysik.ejere.set(kol.handle, l);
    l.mesh = this.model(def);
    this.flytTing(l);
    this.alle.push(l); if (spiller) this.forbrug += def.pris;
    return l;
  }
  flytTing(l) {
    const t = l.krop.translation(), q = l.krop.rotation();
    l.mesh.quaternion.set(q.x, q.y, q.z, q.w);
    l.mesh.position.set(t.x, t.y, t.z).add(tmp.set(0, -l.halv, 0).applyQuaternion(l.mesh.quaternion));
  }
  fjern(l) {
    this.fjernVisning(l);
    this.alle = this.alle.filter(x => x !== l);
    if (l.del) l.del.ladninger = l.del.ladninger.filter(x => x !== l);
    if (l.spiller) this.forbrug -= l.def.pris;
  }
  fjernVisning(l) {
    if (l.mesh) { this.ctx.scene.remove(l.mesh); l.mesh = null; }
    if (l.krop) { fysik.ejere.delete(l.kol.handle); fysik.verden.removeRigidBody(l.krop); l.krop = null; }
  }
  stedFor(l, ud = new THREE.Vector3()) {
    if (l.krop) { const t = l.krop.translation(); return ud.set(t.x, t.y, t.z); }
    if (l.mesh) return ud.copy(l.mesh.position);
    return ud.set(0, 0, 0);
  }

  // ---------- Tændingen ----------
  tænd() {
    let n = 0;
    for (const l of this.alle) if (l.spiller && (l.def.fast || l.def.tænder) && !l.tændt) { this.planlæg(l, l.forsinkelse, false); n++; }
    n += this.ctx.lunter?.tændAlle() ?? 0;
    return n;
  }
  planlæg(l, om, kæde) {
    if (l.tændt || l.væk) return;
    l.tændt = true; l.kæde = kæde;
    this.venter.push({ l, t: om });
  }
  // Gasflasken slås læk: den suser af sted i et par sekunder og springer så
  punktér(l) {
    if (l.tændt || l.væk || !l.krop) return;
    l.tændt = true; l.kæde = true;
    l.raket = { tid: r(1.4, 2.8), retning: new THREE.Vector3(r(-0.3, 0.3), -1, r(-0.3, 0.3)).normalize(), slingre: new THREE.Vector3(r(-1, 1), r(-1, 1), r(-1, 1)) };
    this.raketter.push(l);
  }

  // ---------- En ladning går af ----------
  brag(l) {
    if (l.væk) return;
    if (l.def.termit) { this.startTermit(l); return; }
    if (l.def.fyrværkeri && !l.affyret) { l.affyret = true; this.fyr.push({ l, tilbage: mobil ? 9 : 14, t: 0.4 }); this.sidsteBrag = performance.now(); if (l.kæde) this.kæde++; return; }
    l.væk = true;
    const { dele, effekter, lyd, ruder, kamera } = this.ctx, def = l.def;
    const p = this.stedFor(l, new THREE.Vector3());
    const W = def.W, S = Math.cbrt(W);
    // er ladningen faldet af sin del (delen blev knust), mister den det meste af sin virkning på bygningen
    const del = l.del && !l.del.væk ? l.del : null;
    this.fjernVisning(l);
    if (l.del) { l.del.ladninger = l.del.ladninger.filter(x => x !== l); l.del = null; }   // delen skal ikke længere flytte ladningen
    this.sprængninger++; if (l.kæde && !l.affyret) this.kæde++;
    this.sidsteBrag = performance.now();
    this.ctx.lunter?.nærPunkt(p, 1.2 * S + 0.8);
    // ildkuglen, lyden og trykbølgen
    effekter.eksplosion(p, W, def.art, { kamera, jord: p.y < 1.5 });
    lyd.eksplosion(p, W, def.art);
    ruder.trykbølge(p, 9 + 9 * S);
    if (def.art === "benzin") effekter.ild(tmp.copy(p).setY(0.05), 1.1, r(14, 24), true);
    if (def.model === "gastank") { effekter.ild(tmp.copy(p).setY(0.3), 2.4, r(18, 30), false); effekter.ild(tmp.copy(p).add(tmp2.set(2, 0.3, 0)), 1.6, r(12, 20), false); }
    // bygningerne
    this.ramDele(p, W, del, def);
    dele.sværtNær(p, 2.2 * S + 0.6);
    // andre ladninger og ting i nærheden
    for (const x of this.alle) {
      if (x === l || x.væk) continue;
      const a = this.stedFor(x, tmp).distanceTo(p);
      if (x.krop) {                                        // skub tingen væk
        const v = tmp2.copy(this.stedFor(x, tmp)).sub(p); v.y = Math.abs(v.y) + 0.6 * v.length(); v.normalize();
        const fart = Math.min(28, 22 * S / (1 + a * a * 0.35));
        x.krop.applyImpulse({ x: v.x * fart * x.def.masse, y: v.y * fart * x.def.masse, z: v.z * fart * x.def.masse }, true);
        x.krop.applyTorqueImpulse({ x: r(-1, 1) * x.def.masse * 0.3, y: r(-1, 1) * x.def.masse * 0.3, z: r(-1, 1) * x.def.masse * 0.3 }, true);
      }
      if (x.tændt) continue;
      if (x.type === "tønde" && a < 3.2 * S) this.planlæg(x, r(0.08, 0.3) + a / 60, true);
      else if (x.type === "gas" && a < 1.6 * S) this.planlæg(x, r(0.03, 0.12), true);
      else if (x.type === "gas" && a < 5.5 * S) this.punktér(x);
      else if (x.type === "gastank" && a < 3 * S) this.planlæg(x, r(0.4, 0.9), true);
      else if ((x.type === "tnt" || x.def.fast) && a < 0.9 * S) this.planlæg(x, r(0.02, 0.08), true);
      else if (x.type === "fyrværkeri" && a < 2.5 * S + 0.5) this.planlæg(x, r(0.1, 0.4), true);
    }
    return p;
  }
  // Hvad sker der med bygningsdelene omkring sprængningen?
  ramDele(p, W, kildeDel, def) {
    const { dele } = this.ctx, S = Math.cbrt(W), maks = 7 * S + 3;
    const ramt = [];
    for (const d of dele.alle) {
      if (d.væk) continue;
      const { p: c, q } = dele.sted(d, tmp, tmpQ);
      if (c.distanceTo(p) > maks + d.str.length() / 2) continue;
      // afstanden fra sprængningen til delens overflade
      const lok = tmp2.copy(p).sub(c).applyQuaternion(tmpQ.copy(q).invert());
      const h = d.str;
      const dx = Math.max(0, Math.abs(lok.x) - h.x / 2), dy = Math.max(0, Math.abs(lok.y) - h.y / 2), dz = Math.max(0, Math.abs(lok.z) - h.z / 2);
      const afstand = d === kildeDel ? 0 : Math.hypot(dx, dy, dz);
      ramt.push([d, afstand]);
    }
    for (const [d, afstand] of ramt) {
      if (d.væk) continue;
      const m = MATERIALER[d.mat];
      const rb = m.brud * S * 0.85, rl = rb * 1.8 + 0.1, rs = 7 * S;
      if (d === kildeDel && def.skærer) { this.skær(d, p); continue; }
      if (m.sejt && !(d === kildeDel && W >= 1.5) && afstand < rl) {                    // stål bøjer: det rives kun løs af en kraftig ladning tæt på
        if (afstand < rb * 0.6 && W > 3) dele.løsn([d]);
        if (!d.fast) dele.skub(d, p, 9 * S / (1 + afstand));
        continue;
      }
      if (afstand < rb) dele.knus(d, p, Math.min(26, 13 * S / (1 + afstand * 1.5)));
      else if (afstand < rl) { dele.løsn([d]); dele.skub(d, p, Math.min(16, 7 * S / (1 + afstand))); }
      else if (afstand < rs && d.fast && d.masse < 300) { dele.løsn([d]); dele.skub(d, p, Math.min(6, 4 * S / (1 + afstand * afstand * 0.15))); }   // lette brædder rystes løs
      else if (afstand < rs && !d.fast) dele.skub(d, p, Math.min(9, 5 * S / (1 + afstand * afstand * 0.2)));
    }
  }
  // Skæreladningen: delen deles i to, hvor ladningen sidder, med en smal spalte
  skær(d, p) {
    const { dele, effekter } = this.ctx;
    if (d.form !== "kasse") { dele.knus(d, p, 4); return; }
    const { p: c, q } = dele.sted(d, new THREE.Vector3(), new THREE.Quaternion());
    const s = d.str, akse = s.y >= s.x && s.y >= s.z ? "y" : s.x >= s.z ? "x" : "z";
    const lok = p.clone().sub(c).applyQuaternion(q.clone().invert());
    const L = s[akse], spalte = 0.06, k = Math.max(-L / 2 + 0.15, Math.min(L / 2 - 0.15, lok[akse]));
    const stykker = [[-L / 2, k - spalte / 2], [k + spalte / 2, L / 2]];
    const v0 = dele.fart(d, new THREE.Vector3());
    const spec = { mat: d.mat, bygning: d.bygning, tone: undefined };
    dele.fjernDel(d, false);
    for (const [a, b] of stykker) {
      const str = [s.x, s.y, s.z], i = { x: 0, y: 1, z: 2 }[akse];
      str[i] = b - a;
      const mid = new THREE.Vector3(); mid[akse] = (a + b) / 2; mid.applyQuaternion(q).add(c);
      const n = dele.lav({ ...spec, str, pos: [mid.x, mid.y, mid.z], kvat: q });
      if (!n) continue;
      n.farve.copy(d.farve); n.parti.farve(n.i, n.farve); n.krop.setLinvel(v0, true);
      n.krop.applyImpulse({ x: r(-1, 1) * n.masse * 0.4, y: 0, z: r(-1, 1) * n.masse * 0.4 }, true);
    }
    for (let i = 0; i < 70; i++) effekter.gnister.nyt(p, new THREE.Vector3(r(-1, 1), r(-0.5, 1), r(-1, 1)).normalize().multiplyScalar(r(6, 22)), r(0.3, 1.2), r(1, 1.8), 1, r(8, 16));
  }

  // Termitten: brænder med et blændende hvidt lys og regn af gnister i nogle sekunder — og så er stålet skåret over
  startTermit(l) {
    l.væk = true; l.tændt = true;
    const p = this.stedFor(l, new THREE.Vector3());
    this.termitter.push({ l, p, tid: 2.8, t: 0 });
    this.ctx.lyd.termit(p);
    this.sprængninger++; if (l.kæde) this.kæde++;
    this.sidsteBrag = performance.now();
  }
  // Noget tændes, hvor en lunte, en raket eller en termit når hen
  antændNær(p, radius) {
    for (const x of this.alle) {
      if (x.væk || x.tændt) continue;
      if (this.stedFor(x, tmp2).distanceTo(p) > radius + (x.def.str ? x.def.str[0] * 0.5 : 0)) continue;
      if (x.type === "tønde") this.planlæg(x, r(0.05, 0.2), true);
      else if (x.type === "gas") this.punktér(x);
      else if (x.type === "gastank") this.planlæg(x, r(0.3, 0.6), true);
      else this.planlæg(x, 0.02, true);
    }
  }
  opdaterTermit(dt) {
    const { effekter, dele } = this.ctx;
    for (const t of this.termitter) {
      t.tid -= dt; t.t -= dt;
      if (t.l.mesh) t.p.copy(t.l.mesh.position);
      for (let i = 0; i < (mobil ? 3 : 7); i++) effekter.gnister.nyt(t.p, new THREE.Vector3(r(-1, 1), r(-0.3, 1.2), r(-1, 1)).normalize().multiplyScalar(r(2, 7)), r(0.4, 1.4), r(1, 1.8), 1, r(10, 20), [1, 0.92, 0.75]);
      if (t.t <= 0) {
        t.t = 0.09;
        effekter.lysBlink(t.p, 260, 0.14, 0.6).l.color.setRGB(1, 0.95, 0.85);
        effekter.pust.nyt({ p: t.p, v: new THREE.Vector3(r(-0.3, 0.3), 1.5, r(-0.3, 0.3)), str: 0.3, slut: 1.6, vækst: 1.5, liv: r(2, 3.5), varme: 0.6, køl: 0.15, tæt: 0.5, farve: [0.85, 0.85, 0.85], vind: 1, løft: 1.5, bremse: 1, glød: 1 });
      }
      if (t.tid <= 0) {
        const del = t.l.del && !t.l.del.væk ? t.l.del : null;
        this.fjernVisning(t.l);
        if (t.l.del) { t.l.del.ladninger = t.l.del.ladninger.filter(x => x !== t.l); t.l.del = null; }
        if (del) this.skær(del, t.p);
        this.antændNær(t.p, 1.2); this.ctx.lunter?.nærPunkt(t.p, 1.2);
        dele.sværtNær(t.p, 0.8);
      }
    }
    this.termitter = this.termitter.filter(t => t.tid > 0);
  }
  // Fyrværkeriet: kassen skyder sine raketter af én ad gangen. Nogle flyver lavt ud til siden og tænder det, de lander ved.
  opdaterFyrværkeri(dt) {
    const { effekter, lyd, terræn } = this.ctx;
    for (const f of this.fyr) {
      f.t -= dt;
      if (f.t > 0) continue;
      if (f.l.væk || !f.l.krop) { f.tilbage = 0; continue; }
      f.t = r(0.15, 0.32); f.tilbage--;
      const p = this.stedFor(f.l, new THREE.Vector3()); p.y += 0.35;
      const lav = Math.random() < 0.3, vinkel = Math.random() * Math.PI * 2;
      const op = lav ? r(0.35, 0.6) : r(1.8, 4);                          // forholdet mellem op og ud
      const v = new THREE.Vector3(Math.cos(vinkel), op, Math.sin(vinkel)).normalize().multiplyScalar(lav ? r(14, 20) : r(24, 32));
      this.skud.push({ p, v, tid: lav ? r(1.6, 2.6) : r(1.1, 1.8), farve: FARVER[Math.floor(Math.random() * FARVER.length)] });
      lyd.raket(p);
      effekter.pust.nyt({ p, v: new THREE.Vector3(0, 2, 0), str: 0.4, slut: 1.8, vækst: 2, liv: r(2, 3), varme: 0.5, køl: 0.12, tæt: 0.6, farve: [0.7, 0.7, 0.72], vind: 1, løft: 0.8, bremse: 1.5 });
      if (f.tilbage <= 0) this.brag(f.l);
    }
    this.fyr = this.fyr.filter(f => f.tilbage > 0 && !f.l.væk);
    for (const s of this.skud) {
      s.tid -= dt;
      s.v.y -= 9.8 * dt * 0.55; s.v.multiplyScalar(Math.exp(-0.15 * dt));
      // rammer raketten et tag, en mur eller en tønde på vejen, springer den dér
      const l = s.v.length() * dt, træf = l > 0 ? stråle(s.p, tmp2.copy(s.v).divideScalar(s.v.length()), l) : null;
      if (træf && !træf.jord) { s.p.set(træf.punkt.x, træf.punkt.y, træf.punkt.z); s.ramt = true; }
      else s.p.addScaledVector(s.v, dt);
      effekter.gnister.nyt(s.p, s.v.clone().multiplyScalar(-0.08).add(tmp.set(r(-0.5, 0.5), r(-0.5, 0.5), r(-0.5, 0.5))), r(0.25, 0.5), 1.4, 1, 9);
      const bund = terræn ? terræn.højde(s.p.x, s.p.z) : 0;
      if (s.ramt || s.p.y < bund + 0.25 || s.tid <= 0) {
        const nede = s.ramt || s.p.y < bund + 4;
        effekter.fyrværkeri(s.p, s.farve, nede ? 0.6 : 1);
        lyd.fyrværkeriBrag(s.p);
        if (nede) { this.antændNær(s.p, 1.6); this.ctx.lunter?.nærPunkt(s.p, 1.2); }
        s.tid = -1;
      }
    }
    this.skud = this.skud.filter(s => s.tid > 0);
  }

  // ---------- Hvert billede ----------
  opdater(dt) {
    if (this.termitter.length) this.opdaterTermit(dt);
    if (this.fyr.length || this.skud.length) this.opdaterFyrværkeri(dt);
    // ladninger, der venter på deres tur
    if (this.venter.length) {
      const klar = [];
      this.venter = this.venter.filter(v => { v.t -= dt; if (v.t <= 0) { klar.push(v.l); return false; } return true; });
      for (const l of klar) this.brag(l);
    }
    // gasflasker, der flyver
    for (const l of this.raketter) {
      if (l.væk || !l.krop) continue;
      const rk = l.raket; rk.tid -= dt;
      const q = l.krop.rotation(); tmpQ.set(q.x, q.y, q.z, q.w);
      const kraft = tmp.copy(rk.retning).applyQuaternion(tmpQ).multiplyScalar(-l.def.masse * 95);
      l.krop.addForce({ x: kraft.x, y: kraft.y, z: kraft.z }, true);
      l.krop.applyTorqueImpulse({ x: rk.slingre.x * dt * 6, y: rk.slingre.y * dt * 6, z: rk.slingre.z * dt * 6 }, true);
      rk.slingre.x += r(-1, 1) * dt * 8; rk.slingre.z += r(-1, 1) * dt * 8;
      // flammen og dampen ud af ventilen
      const ventil = this.stedFor(l, tmp2).add(tmp.set(0, l.halv, 0).applyQuaternion(tmpQ));
      const ud = tmp.set(0, 1, 0).applyQuaternion(tmpQ).multiplyScalar(r(6, 10));
      this.ctx.effekter.pust.nyt({ p: ventil, v: ud, str: 0.25, slut: 1.2, vækst: 4, liv: r(0.8, 1.6), varme: r(0.9, 1.1), køl: 0.12, løft: 2, bremse: 3, tæt: 0.8, farve: [0.75, 0.75, 0.75], vind: 1, glød: 0.6 });
      if (rk.tid <= 0) this.brag(l);
    }
    this.raketter = this.raketter.filter(l => !l.væk && l.krop);
    for (const l of this.alle) if (l.krop && !l.væk) this.flytTing(l);
  }
  // Et hårdt stød på en tønde, gasflaske eller TNT-kasse (fra fysikken)
  stød(l, kraft) {
    if (l.væk || l.tændt) return;
    if (l.raket) { this.brag(l); return; }
    if (kraft > l.def.masse * 9.81 * 60 && (l.type === "gas" || l.type === "tønde") && Math.random() < 0.3) this.planlæg(l, r(0.05, 0.2), true);
  }
  // Ild nær en tønde eller gasflaske antænder den efter et stykke tid
  varme(ilde, dt) {
    for (const l of this.alle) {
      if (!l.krop || l.tændt || l.væk || l.type === "tnt" || l.type === "gastank") continue;
      const p = this.stedFor(l, tmp);
      let tæt = false;
      for (const f of ilde) if (f.p.distanceTo(p) < 1.4 * f.styrke + 0.4) { tæt = true; break; }
      l.opvarmet = tæt ? (l.opvarmet || 0) + dt : Math.max(0, (l.opvarmet || 0) - dt);
      if (l.opvarmet > (l.type === "gas" ? 2.5 : 4)) l.type === "gas" ? this.punktér(l) : this.planlæg(l, 0, true);
    }
    for (const f of ilde) this.ctx.lunter?.nærPunkt(f.p, 1.2 * f.styrke + 0.3);
  }
  aktiv() { return this.venter.length > 0 || this.raketter.length > 0 || this.termitter.length > 0 || this.fyr.length > 0 || this.skud.length > 0 || !!this.ctx.lunter?.aktiv(); }
  gasStyrke() { return this.raketter.length ? this.stedFor(this.raketter[0]) : null; }
}
