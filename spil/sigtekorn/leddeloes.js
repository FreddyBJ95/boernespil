// ===== De leddeløse soldater: krop, hoved, arme og ben svæver hver for sig — og kan skydes af =====
// Delene er lavet i Blender (blender/lav_leddeloes.py). Her sættes de på plads hvert billede: benene går med
// rigtige knæ (de "rækker" efter et sted på jorden, IK), armene holder våbnet, og hovedet kigger, hvor
// soldaten sigter. Mangler et ben, kravler soldaten. Mangler en arm, holder den pistolen i den anden hånd.
//   træf(o, r, maks)   hvilken del rammer et skud?          skydAf(lem, skud)  en arm, et ben eller hovedet flyver af
//   falder(skud)       soldaten falder fra hinanden         nulstil()         hel igen (når den starter forfra)

import * as THREE from "./three.js";
import { sætSkin as skinPå } from "./skins.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { ramKasse } from "./verden.js";
import { løsDel } from "./dele.js";
import { VÅBEN } from "./vaaben.js";

let proto = null;
export function hentLeddeløs() {
  return new Promise(klar => new GLTFLoader().load("modeller/leddeloes.glb", g => {
    proto = {}; g.scene.traverse(o => { if (o.name && !proto[o.name]) proto[o.name] = o; }); klar(true);
  }, undefined, e => { console.warn("Ingen leddeløs soldat", e); klar(false); }));
}
export const harLeddeløs = () => !!proto;

const HOLDFARVER = {
  ræve: { uniform: 0xb89b6e, vest: 0x7e6644, kasket: 0xc8b08a, tørklæde: 0x9a3a2a, vis: ["kasket", "tørklæde"] },
  slanger: { uniform: 0x5b6a3e, vest: 0x363d26, hjelm: 0x4a5530, vis: ["hjelm", "briller"] },
};
const HUDFARVER = [0xd9a877, 0xb9805a, 0x8a5a3a, 0xe8c09a];
// materialerne deles af alle på samme hold (og hver hudfarve), så der ikke laves nye for hver soldat
const matLager = new Map();
function holdMat(hold, m, hud) {
  const nøgle = `${hold}:${m.name}:${m.name === "hud" ? hud : ""}`;
  if (!matLager.has(nøgle)) {
    const ny = m.clone(), f = HOLDFARVER[hold][m.name];
    if (f !== undefined) ny.color.set(f);
    if (m.name === "hud") ny.color.set(HUDFARVER[hud]);
    matLager.set(nøgle, ny);
  }
  return matLager.get(nøgle);
}

// Leddenes længder (meter) — som i Blender
const OVERARM = 0.30, UNDERARM = 0.27, LÅR = 0.42, SKINNEBEN = 0.40, ANKEL = 0.08;
const LEMMER = { armR: ["overarmR", "underarmR"], armL: ["overarmL", "underarmL"], benR: ["lårR", "skinnebenR"], benL: ["lårL", "skinnebenL"], hoved: ["hoved"] };
const DEL_LEM = { overarmR: "armR", underarmR: "armR", overarmL: "armL", underarmL: "armL", lårR: "benR", skinnebenR: "benR", lårL: "benL", skinnebenL: "benL" };
// hvor venstre hånd tager fat foran på de enkle geværer (i våbnets koordinater)
const FORGREB = { gevær: new THREE.Vector3(0, 0.07, -0.35), snig: new THREE.Vector3(0, 0.045, -0.26) };
// De rigtige våben fra Blender (de samme som i hånden): hentes, når en soldat første gang skal bruge dem.
// Punkterne "greb" og "forgreb" i filen siger, hvor hænderne skal sidde. Indtil da bruges de enkle modeller
const KLASSEFIL = { gevær: "gevaer", mp: "gevaer", hagl: "gevaer", tung: "gevaer", special: "gevaer", snig: "snig", pistol: "pistol" };
const tpLager = new Map();
function hentTP(id) {
  const d = VÅBEN[id];
  if (!d?.model || d.nærkamp || d.granat) return Promise.resolve(null);
  const hent = fil => {
    if (!tpLager.has(fil)) tpLager.set(fil, new GLTFLoader().loadAsync(fil).then(g => {
      const s = g.scene, obj = s.children.find(o => (o.isMesh || o.children.length) && !["hænder", "roterer"].includes(o.name));
      return { obj, roterer: s.getObjectByName("roterer"), greb: s.getObjectByName("greb")?.position.clone() || new THREE.Vector3(), forgreb: s.getObjectByName("forgreb")?.position.clone() || null };
    }));
    return tpLager.get(fil);
  };
  return hent(`modeller/${d.model}.glb`).catch(() => hent(`modeller/${KLASSEFIL[d.klasse] || "gevaer"}.glb`)).catch(() => null);
}
const enkel = id => { const k = VÅBEN[id]?.klasse; return !k || k === "kniv" ? null : k === "snig" ? "snig" : k === "pistol" ? "pistol" : "gevær"; };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _eu = new THREE.Euler();
const OP = new THREE.Vector3(0, 1, 0), FREM = new THREE.Vector3(0, 0, -1), NED = new THREE.Vector3(0, -1, 0);

export class Figur {
  constructor(hold) {
    this.hold = hold; this.model = new THREE.Group(); this.d = {};
    const f = HOLDFARVER[hold], hud = Math.floor(Math.random() * HUDFARVER.length);
    const kopi = n => { const o = proto[n].clone(); o.position.set(0, 0, 0); o.quaternion.identity();
      o.traverse(m => { if (m.isMesh) { m.material = holdMat(hold, m.material, hud); m.castShadow = true; m.frustumCulled = false; } }); return o; };
    for (const n of ["krop", "overarmR", "underarmR", "overarmL", "underarmL", "lårR", "skinnebenR", "lårL", "skinnebenL", "gevær", "snig", "pistol"]) { this.d[n] = kopi(n); this.model.add(this.d[n]); }
    // hovedet er en gruppe: selve hovedet og holdets hovedbeklædning
    const h = this.d.hoved = new THREE.Group(); this.model.add(h);
    this.hovedtøj = [];
    for (const n of ["hoved", "hjelm", "briller", "kasket", "tørklæde"]) {
      const o = kopi(n); o.name = n; h.add(o);
      if (n !== "hoved") { o.visible = f.vis.includes(n); if (o.visible) this.hovedtøj.push(o); }
    }
    // kasserne, skuddene rammes imod (i hver dels egne koordinater)
    this.kasser = [];
    for (const n of ["krop", "hoved", "overarmR", "underarmR", "overarmL", "underarmL", "lårR", "skinnebenR", "lårL", "skinnebenL"]) {
      const o = this.d[n], k = new THREE.Box3();
      o.updateMatrixWorld(true);
      const inv = o.matrixWorld.clone().invert();
      o.traverse(m => { if (m.isMesh && m.visible) { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); k.union(m.geometry.boundingBox.clone().applyMatrix4(_m.multiplyMatrices(inv, m.matrixWorld))); } });
      this.kasser.push({ n, o, k: { min: k.min.toArray(), max: k.max.toArray() }, inv: new THREE.Matrix4() });
    }
    this.fase = Math.random() * 6; this.kick = 0; this.kb = 0;
    this.våbenModeller = {}; this.henter = new Set(); this.holdt = null;
    this.nulstil();
  }
  // Hel igen: alle dele kommer tilbage
  nulstil() {
    this.mangler = { armR: false, armL: false, benR: false, benL: false, hoved: false };
    for (const n of Object.keys(this.d)) this.d[n].visible = true;
    for (const o of this.hovedtøj) o.visible = true;
    this.kb = 0; this.væk = false;
  }
  harArm() { return !this.mangler.armR || !this.mangler.armL; }
  manglerBen() { return this.mangler.benR || this.mangler.benL; }
  skyd() { this.kick = 1; }

  // ---------- Sæt delene på plads. t = { fart, vx, vz (fart set fra soldaten), duk 0..1, pitch, kravl, våben ("gevær"/"snig"/"pistol"/null), dt } ----------
  poser(t) {
    if (this.væk) return;
    const dt = t.dt, M = this.mangler;
    this.kb += ((t.kravl ? 1 : 0) - this.kb) * Math.min(1, dt * 6);
    this.kick *= Math.exp(-dt * 12);
    const kb = this.kb, duk = t.duk * (1 - kb), fart = t.fart;
    this.fase += fart * dt / (kb > 0.5 ? 0.7 : 1.5) * Math.PI * 2;
    const ψ = this.fase, bob = Math.abs(Math.sin(ψ)) * Math.min(0.035, fart * 0.008) * (1 - kb);
    // kroppen: lidt foroverbøjet (mere, når den dukker sig eller løber) — og vandret, når den kravler
    const lean = lerp(0.07 + 0.25 * duk + Math.min(0.12, fart * 0.02), 1.42, kb);
    const hofte = _a.set(0, lerp(0.93 - 0.36 * duk - bob, 0.24, kb), lerp(0.04 * duk, 0.3, kb));
    const kropQ = new THREE.Quaternion().setFromEuler(_eu.set(-lean, 0, Math.sin(ψ) * 0.04 * Math.min(1, fart / 3) * (1 - kb)));
    this.sæt("krop", hofte, kropQ);
    const iKrop = v => v.applyQuaternion(kropQ).add(hofte);
    const hals = iKrop(new THREE.Vector3(0, 0.62, 0.01)), bryst = iKrop(new THREE.Vector3(0, 0.42, 0));
    // hovedet kigger derhen, soldaten sigter
    this.sæt("hoved", hals, _q.setFromEuler(_eu.set(t.pitch * 0.6, 0, 0)));
    // ---- våbnet og armene ----
    const sigteQ = new THREE.Quaternion().setFromEuler(_eu.set(t.pitch + this.kick * 0.12, 0, 0));
    const skR = iKrop(new THREE.Vector3(0.31, 0.47, 0)), skL = iKrop(new THREE.Vector3(-0.31, 0.47, 0));
    const vid = t.våben && this.harArm() ? t.våben : null, id = enkel(vid), vm = vid ? this.våbenTil(vid) : null;
    const vis = vm ? vm.obj : id ? this.d[id] : null;
    for (const n of ["gevær", "snig", "pistol"]) this.d[n].visible = this.d[n] === vis;
    for (const m of Object.values(this.våbenModeller)) m.obj.visible = m.obj === vis;
    this.holdt = vis;
    if (vm?.roterer) vm.roterer.rotation.z += (t.dt || 0) * 45 * (t.spin || 0);
    let håndR = null, håndL = null;
    if (id) {
      const iSigte = (x, y, z) => new THREE.Vector3(x, y, z + this.kick * 0.04).applyQuaternion(sigteQ);
      let greb;
      if (id !== "pistol") greb = iSigte(0.12, -0.04, -0.3).add(bryst);
      else if (!M.armR && !M.armL) greb = iSigte(0.03, 0.05, -0.48).add(bryst);
      else if (!M.armR) greb = iSigte(-0.07, 0.02, -0.5).add(skR);
      else greb = iSigte(0.07, 0.02, -0.5).add(skL);
      // våbnet placeres, så dets greb sidder i hånden — og venstre hånd tager fat i forgrebet
      const midt = vm ? greb.clone().sub(vm.greb.clone().applyQuaternion(sigteQ)) : greb;
      const forgreb = vm ? (vm.forgreb && midt.clone().add(vm.forgreb.clone().applyQuaternion(sigteQ))) : FORGREB[id] && FORGREB[id].clone().applyQuaternion(sigteQ).add(greb);
      if (id !== "pistol") { håndR = greb; håndL = forgreb || iSigte(-0.04, -0.03, 0.03).add(greb); }
      else if (!M.armR && !M.armL) { håndR = greb; håndL = iSigte(-0.04, -0.03, 0.03).add(greb); }
      else if (!M.armR) håndR = greb; else håndL = greb;
      vis.position.copy(midt); vis.quaternion.copy(sigteQ);
    }
    // arme uden våben: hænger ned (eller skubber fra, når den kravler)
    const fri = (sk, side) => kb > 0.5 ? new THREE.Vector3(side * 0.28, 0.05, hofte.z - 0.8 - Math.cos(ψ + (side > 0 ? 0 : Math.PI)) * 0.15)
      : sk.clone().add(new THREE.Vector3(side * 0.06, -0.55, 0.02 + Math.sin(ψ + (side > 0 ? Math.PI : 0)) * 0.12 * Math.min(1, fart / 3)));
    if (!M.armR) this.arm("overarmR", "underarmR", skR, håndR || fri(skR, 1), new THREE.Vector3(0.6, -1, 0.5).applyQuaternion(sigteQ), sigteQ);
    if (!M.armL) this.arm("overarmL", "underarmL", skL, håndL || fri(skL, -1), new THREE.Vector3(-0.7, -1, 0.3).applyQuaternion(sigteQ), sigteQ);
    // ---- benene: fødderne sættes et sted på jorden (gang), og knæene bøjer selv ----
    const l = Math.hypot(t.vx, t.vz) || 1, dx = t.vx / l, dz = t.vz / l;
    const ampl = lerp(Math.min(0.32, fart * 0.065), Math.min(0.12, fart * 0.2), kb), løft = Math.min(0.16, fart * 0.04) * (1 - kb);
    for (const [side, fase, lår, skin, mangler] of [[1, 0, "lårR", "skinnebenR", M.benR], [-1, Math.PI, "lårL", "skinnebenL", M.benL]]) {
      if (mangler) continue;
      const c = Math.cos(ψ + fase), s = Math.sin(ψ + fase);
      const led = new THREE.Vector3(side * 0.11, hofte.y - 0.05 * (1 - kb), hofte.z + 0.05 * kb);
      const stå = new THREE.Vector3(side * 0.12 + dx * ampl * c, ANKEL + Math.max(0, -s) * løft, -0.06 * duk + dz * ampl * c);
      const kravl = new THREE.Vector3(side * 0.15, 0.09, hofte.z + 0.78 + c * ampl);
      const fod = stå.lerp(kravl, kb), pol = new THREE.Vector3(side * 0.15, 0, -1).lerp(NED, kb);
      const knæ = ik(led, fod, LÅR, SKINNEBEN, pol);
      this.ret(lår, led, knæ, FREM); this.ret(skin, knæ, fod, _b.copy(FREM).lerp(NED, kb).normalize());
    }
    this.model.updateMatrixWorld(true);
    for (const k of this.kasser) k.inv.copy(k.o.matrixWorld).invert();
  }
  // En arm: skulder → hånd, albuen bøjer ud mod "pol"
  arm(over, under, sk, hånd, pol, sigteQ) {
    const albue = ik(sk, hånd, OVERARM, UNDERARM, pol), frem = _c.copy(FREM).applyQuaternion(sigteQ);
    this.ret(over, sk, albue, frem); this.ret(under, albue, hånd, frem);
  }
  sæt(n, p, q) { const o = this.d[n]; o.position.copy(p); o.quaternion.copy(q); }
  // Læg en del fra a mod b (delen peger nedad i sine egne koordinater) med forsiden mod "frem"
  ret(n, a, b, frem) {
    const o = this.d[n], y = _d.subVectors(a, b).normalize(), z = _e.copy(frem).negate();
    z.addScaledVector(y, -z.dot(y));
    if (z.lengthSq() < 1e-6) z.set(0, 0, 1).addScaledVector(y, -y.z);
    z.normalize();
    _m.makeBasis(_b.crossVectors(y, z), y, z);
    o.position.copy(a); o.quaternion.setFromRotationMatrix(_m);
  }

  // ---------- Hvilken del rammer strålen (o, r)? Svarer med { t, del, lem } ----------
  træf(o, r, maks) {
    if (this.væk) return null;
    let bedst = null;
    for (const k of this.kasser) {
      if (!k.o.visible) continue;
      const lo = _a.copy(o).applyMatrix4(k.inv), lr = _b.copy(r).transformDirection(k.inv);
      const h = ramKasse(lo, lr, k.k, bedst ? bedst.t : maks);
      if (!h) continue;
      let del = "krop", lem = DEL_LEM[k.n] || null;
      if (k.n === "hoved") { del = "hoved"; lem = "hoved"; }
      else if (lem) del = lem.startsWith("arm") ? "arm" : "ben";
      else if (lo.y + lr.y * h.t < 0.24) del = "mave";
      bedst = { t: h.t, del, lem };
    }
    return bedst;
  }
  // ---------- En arm, et ben eller hovedet flyver af ----------
  skydAf(lem, skud, scene, verden, grundfart, lyd) {
    if (this.mangler[lem]) return;
    this.mangler[lem] = true;
    const r = skud?.r || FREM, kraft = (skud?.kraft ?? 3) * 1.3;
    if (lem === "hoved") for (const o of this.hovedtøj) if (o.visible)              // hjelmen flyver lidt for sig selv
      løsDel(o, scene, verden, grundfart.clone().addScaledVector(r, kraft * 1.2).add(new THREE.Vector3(0, 3.2, 0)), tilfældigSpin(9), lyd);
    for (const n of LEMMER[lem]) {
      const o = this.d[n]; if (!o.visible) continue;
      løsDel(o, scene, verden, grundfart.clone().addScaledVector(r, kraft).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.8 + Math.random(), (Math.random() - 0.5) * 1.5)), tilfældigSpin(7), lyd);
    }
  }
  // Den rigtige model til et våben (hentes første gang; indtil den er klar, svarer den null)
  våbenTil(id) {
    if (this.våbenModeller[id]) return this.våbenModeller[id];
    if (!this.henter.has(id)) {
      this.henter.add(id);
      hentTP(id).then(m => {
        if (!m?.obj) return;
        const obj = m.obj.clone(true); obj.position.set(0, 0, 0); obj.quaternion.identity(); obj.visible = false;
        const roterer = m.roterer?.clone(true); if (roterer) obj.add(roterer);          // minigunnens løb, der drejer rundt
        obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
        this.model.add(obj);
        if (this.skin && this.skin !== "standard") skinPå(obj, this.skin);     // et skin på våbnet (se skins.js)
        this.våbenModeller[id] = { obj, roterer, greb: m.greb, forgreb: m.forgreb };
        this.d[`våben_${id}`] = obj;
      });
    }
    return null;
  }
  // Våbnet i hånden falder til jorden
  tabVåben(_, scene, verden, grundfart, lyd) {
    const o = this.holdt; if (!o?.visible) return;
    løsDel(o, scene, verden, grundfart.clone().add(new THREE.Vector3((Math.random() - 0.5), 1, (Math.random() - 0.5))), tilfældigSpin(3), lyd);
  }
  // ---------- Død: soldaten falder fra hinanden — den ramte del flyver, resten falder sammen ----------
  falder(skud, scene, verden, grundfart, lyd) {
    if (skud?.lem && !this.mangler[skud.lem]) this.skydAf(skud.lem, skud, scene, verden, grundfart, lyd);
    const r = skud?.r || FREM, kraft = skud?.kraft ?? 3;
    this.model.updateMatrixWorld(true);
    const midt = new THREE.Vector3(0, 0.9, 0).applyMatrix4(this.model.matrixWorld);
    for (const n of Object.keys(this.d)) {
      const o = this.d[n]; if (!o.visible) continue;
      const p = o.getWorldPosition(new THREE.Vector3()), ud = p.sub(midt).setY(0).multiplyScalar(1.5);
      const fart = grundfart.clone().add(ud).addScaledVector(r, n === "krop" ? kraft * 0.6 : kraft * 0.25).add(new THREE.Vector3(0, 0.6 + Math.random() * 0.8, 0));
      løsDel(o, scene, verden, fart, tilfældigSpin(n === "krop" ? 3 : 6), lyd);
    }
    this.væk = true;
  }
}

// To-leds IK: hvor skal albuen/knæet være, når skulderen/hoften er i a, og hånden/foden skal nå b?
// (kan b ikke nås, flyttes b hen, hvor armen/benet rækker til). pol = den vej, leddet bøjer ud
function ik(a, b, l1, l2, pol) {
  const d = new THREE.Vector3().subVectors(b, a), ønsket = d.length();
  if (ønsket < 1e-6) d.set(0, -1, 0); else d.divideScalar(ønsket);
  const l = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.002, ønsket));
  if (l !== ønsket) b.copy(a).addScaledVector(d, l);
  const x = (l1 * l1 - l2 * l2 + l * l) / (2 * l), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const v = pol.clone().addScaledVector(d, -pol.dot(d));
  if (v.lengthSq() < 1e-8) v.set(0, 0, -1).addScaledVector(d, -d.z);
  v.normalize();
  return a.clone().addScaledVector(d, x).addScaledVector(v, h);
}
const lerp = (a, b, t) => a + (b - a) * t;
const tilfældigSpin = s => new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
