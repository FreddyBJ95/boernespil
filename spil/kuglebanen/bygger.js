// ===== Bygger en bane =====
// Læser banens dele (baner.js) og laver både fysik-former (fysik.js) og det man ser (via verdenens tema).
import * as THREE from "./three.js";
import { rundKasse, bag } from "./former.js";
import { R, kasse, cylinder, ring as ringForm, sejl, drej as drejForm } from "./fysik.js";
import { planarUV, sætFrø, std, blank, tekstur, del, kGlav } from "./pynt.js";

const OP = new THREE.Vector3(0, 1, 0);
export const frem = ψ => new THREE.Vector3(Math.sin(ψ), 0, -Math.cos(ψ));
const V = a => new THREE.Vector3(...a);
const RETNINGS_STILE = new Set(["lineal", "blyant", "træ", "bilbane", "flåde"]);

// En kasse langs en linje: toppen (eller midten) går fra A til B
function kasseLangs(A, B, b, h, top = true) {
  const d = B.clone().sub(A), L = d.length(), vand = Math.hypot(d.x, d.z);
  const ψ = Math.atan2(d.x, -d.z), φ = Math.atan2(d.y, vand);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(φ, -ψ, 0, "YXZ"));
  const pos = A.clone().add(B).multiplyScalar(0.5);
  if (top) pos.addScaledVector(OP.clone().applyQuaternion(q), -h / 2);
  return { pos, q, halv: new THREE.Vector3(b / 2, h / 2, L / 2), ψ };
}

// ---------- Veje (sti) bliver til ramper, runde hjørner, kanter og bumpere ----------
const kryds = (a, b) => a.x * b.z - a.z * b.x;
function skæring(p1, d1, p2, d2) {
  const k = kryds(d1, d2);
  if (Math.abs(k) < 1e-6) return null;
  const t = kryds(p2.clone().sub(p1), d2) / k;
  return p1.clone().addScaledVector(d1, t);
}
function udfoldSti(s) {
  const P = s.punkter.map(V), ud = [], b = s.b, off = b / 2 - 0.09;
  // runde hjørner. Ligger et hjørne øverst på en rampe, sænkes det lidt, så det ikke stikker op som et trin
  P.forEach((p, i) => {
    let sænk = 0;
    for (const j of [i - 1, i + 1]) {
      const q = P[j];
      if (!q) continue;
      const hæld = (p.y - q.y) / (Math.hypot(p.x - q.x, p.z - q.z) || 1);
      if (hæld > 0) sænk = Math.max(sænk, hæld * b / 2 + 0.01);
    }
    ud.push({ t: "rund", p: [p.x, p.y - sænk, p.z], r: b / 2, stil: s.stil, h: s.h, led: true });
  });
  const seg = [];
  for (let i = 0; i < P.length - 1; i++) {
    const A = P[i], B = P[i + 1], d = new THREE.Vector3(B.x - A.x, 0, B.z - A.z).normalize();
    seg.push({ A, B, d, r: new THREE.Vector3(-d.z, 0, d.x) });
    ud.push({ t: "rampe", fra: A.toArray(), til: B.toArray(), b, stil: s.stil, h: s.h });
  }
  if (s.kant) {
    for (let i = 0; i < seg.length; i++) {
      const { A, B, d, r } = seg[i];
      for (const side of [-1, 1]) {
        let a = A.clone().addScaledVector(r, side * off), e = B.clone().addScaledVector(r, side * off);
        if (i > 0) {
          const f = seg[i - 1], k = kryds(f.d, d);
          if (Math.abs(k) > 0.05 && Math.sign(k) === side) {
            const x = skæring(f.A.clone().addScaledVector(f.r, side * off), f.d, a, d);
            if (x) { x.y = A.y; a = x; }
          }
        }
        if (i < seg.length - 1) {
          const n = seg[i + 1], k = kryds(d, n.d);
          if (Math.abs(k) > 0.05 && Math.sign(k) === side) {
            const x = skæring(a, d, n.A.clone().addScaledVector(n.r, side * off), n.d);
            if (x) { x.y = B.y; e = x; }
          }
        }
        ud.push({ t: "kant", A: a, B: e });
      }
    }
    // ydersiden af hvert sving får en buet kant
    for (let j = 1; j < seg.length; j++) {
      const f = seg[j - 1], n = seg[j], k = kryds(f.d, n.d);
      if (Math.abs(k) < 0.05) continue;
      const side = -Math.sign(k), J = P[j];
      const θ1 = Math.atan2(side * f.r.z, side * f.r.x);
      let Δ = Math.atan2(side * n.r.z, side * n.r.x) - θ1;
      while (Δ > Math.PI) Δ -= 2 * Math.PI;
      while (Δ < -Math.PI) Δ += 2 * Math.PI;
      const antal = Math.max(1, Math.ceil(Math.abs(Δ) * off / 0.4));
      for (let m = 0; m < antal; m++) {
        const a1 = θ1 + Δ * m / antal, a2 = θ1 + Δ * (m + 1) / antal;
        ud.push({ t: "kant", A: new THREE.Vector3(J.x + Math.cos(a1) * off, J.y, J.z + Math.sin(a1) * off), B: new THREE.Vector3(J.x + Math.cos(a2) * off, J.y, J.z + Math.sin(a2) * off), ekstra: 0.06 });
      }
    }
  }
  if (s.bumpere) {
    for (let j = 1; j < seg.length; j++) {
      const ydre = seg[j - 1].d.clone().sub(seg[j].d);
      if (ydre.lengthSq() < 0.01) continue;
      ydre.normalize();
      const p = P[j].clone().addScaledVector(ydre, b / 2 - 0.05);
      ud.push({ t: "bumper", p: [p.x, P[j].y, p.z] });
    }
  }
  return ud;
}

// Lange ting med retning (lineal, blyant, planker) skal altid ligge langs z i deres egen ramme
function retPlade(d) {
  if (d.t === "plade" && RETNINGS_STILE.has(d.stil) && d.b > d.d && !d.ry) return { ...d, b: d.d, d: d.b, ry: Math.PI / 2 };
  if (d.t === "flyt" && d.form === "kasse" && RETNINGS_STILE.has(d.stil) && d.b > d.d) return { ...d, b: d.d, d: d.b, ry: Math.PI / 2 };
  return d;
}

function udfold(dele) {
  const ud = [];
  for (const d of dele) {
    if (d.t === "sti") ud.push(...udfoldSti(d));
    else ud.push(retPlade(d));
    if ((d.t === "plade" || d.t === "rampe") && d.kant) ud.push(...kanterPåPlade(retPlade(d)));
  }
  return ud;
}

// Kanter langs siderne af en plade ("n", "s", "ø", "v") eller begge sider af en rampe (kant: true)
function kanterPåPlade(d) {
  const ud = [];
  if (d.t === "rampe") {
    const A = V(d.fra), B = V(d.til), r = new THREE.Vector3(-(B.z - A.z), 0, B.x - A.x).normalize(), off = d.b / 2 - 0.09;
    for (const s of [-1, 1]) ud.push({ t: "kant", A: A.clone().addScaledVector(r, s * off), B: B.clone().addScaledVector(r, s * off) });
    return ud;
  }
  const q = new THREE.Quaternion().setFromAxisAngle(OP, d.ry || 0), c = V(d.p);
  const hb = d.b / 2 - 0.09, hd = d.d / 2 - 0.09;
  const lokal = { n: [[-d.b / 2, -hd], [d.b / 2, -hd]], s: [[-d.b / 2, hd], [d.b / 2, hd]], "ø": [[hb, -d.d / 2], [hb, d.d / 2]], v: [[-hb, -d.d / 2], [-hb, d.d / 2]] };
  for (const bogstav of d.kant) {
    const l = lokal[bogstav];
    if (!l) continue;
    const [a, b] = l.map(([x, z]) => new THREE.Vector3(x, 0, z).applyQuaternion(q).add(c));
    ud.push({ t: "kant", A: a, B: b });
  }
  return ud;
}

// ---------- Det man ser ----------
function kasseMesh(halv, mats, q, pos) {
  const geo = rundKasse(halv.x * 2, halv.y * 2, halv.z * 2, mats.r ?? Math.min(0.14, halv.y * 0.6), 3);
  if (mats.lokal) planarUV(geo, mats.skala ?? 1, mats.sideSkala ?? mats.skala ?? 1);
  geo.applyQuaternion(q);
  if (pos) geo.translate(pos.x, pos.y, pos.z);
  if (!mats.lokal && !mats.native) planarUV(geo, mats.skala ?? 2, mats.sideSkala ?? mats.skala ?? 2);
  const m = new THREE.Mesh(geo, [mats.side, mats.side, mats.top, mats.bund || mats.side, mats.side, mats.side]);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function rundMesh(r, h, mats, pos) {
  const geo = new THREE.CylinderGeometry(r, r, h, Math.max(24, Math.round(r * 22)), 1);
  if (pos) geo.translate(pos.x, pos.y, pos.z);
  if (!mats.nativeRund) planarUV(geo, mats.skala ?? 2, mats.sideSkala ?? mats.skala ?? 2);
  const m = new THREE.Mesh(geo, [mats.side, mats.top, mats.bund || mats.side]);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Fartpil: gule pile på vejen
let _pilTex;
function pilMesh() {
  _pilTex ||= tekstur(256, 256, (g, w, h) => {
    g.fillStyle = "rgba(255,210,40,0.92)"; g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 40); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 26; g.lineCap = "round"; g.lineJoin = "round";
    for (const y of [70, 150]) { g.beginPath(); g.moveTo(60, y + 50); g.lineTo(w / 2, y - 10); g.lineTo(w - 60, y + 50); g.stroke(); }
  }, { gentag: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), std("#ffffff", 0.4, { map: _pilTex, transparent: true, emissive: "#ffb400", emissiveIntensity: 0.35, emissiveMap: _pilTex, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  return g;
}

// Standard-udseender, hvis temaet ikke har sit eget
const standard = {
  bumper() { const g = new THREE.Group(); del(g, new THREE.CylinderGeometry(0.45, 0.5, 0.8, 28), blank("#ff3b3b"), [0, 0.4, 0]); return g; },
  ring() { const g = new THREE.Group(); del(g, new THREE.TorusGeometry(1.3, 0.42, 20, 56), blank("#ff7eb6")); return g; },
  stang(l) { const g = new THREE.Group(); del(g, rundKasse(l, 0.32, 0.32, 0.12, 2), blank("#ffd23f")); return g; },
  søjle(r, h) { const g = new THREE.Group(); del(g, new THREE.CylinderGeometry(r, r, h, 28), blank("#4fc3ff"), [0, h / 2, 0]); return g; },
};

function hashTekst(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 2147483647; return h || 1; }

// ---------- Selve byggeriet ----------
export function bygBane(def, tema, fys) {
  sætFrø(hashTekst(def.id));
  const stille = new THREE.Group();        // alt der står stille (bages sammen bagefter)
  const aktive = new THREE.Group();        // ting der bevæger sig eller skifter udseende
  const res = {
    def, stille, aktive, ting: [], flag: [], pads: [], ringe: [], levende: [], mål: null,
    start: { p: V(def.start), ψ: def.ψ || 0 }, minY: Infinity, grænse: new THREE.Box3(), gulvY: null, efter: [],
  };
  const udvid = (p, r = 2) => { res.grænse.expandByPoint(p.clone().addScalar(r)); res.grænse.expandByPoint(p.clone().addScalar(-r)); };
  const top = y => { res.minY = Math.min(res.minY, y); };
  const dele = udfold(def.dele);
  const pads = [];

  for (const d of dele) {
    const stil = d.stil;
    if (d.t === "plade") {
      const h = d.h ?? 0.6, q = new THREE.Quaternion().setFromAxisAngle(OP, d.ry || 0);
      const pos = new THREE.Vector3(d.p[0], d.p[1] - h / 2, d.p[2]), halv = new THREE.Vector3(d.b / 2, h / 2, d.d / 2);
      const f = fys.tilføj(kasse({ pos, halv, rot: q, stil }));
      const mats = tema.materialer(stil, d);
      const m = kasseMesh(halv, mats, q, pos);
      stille.add(m);
      tema.pynt?.({ ...d, form: f, mesh: m, pos, halv, q, gruppe: stille, res, top: d.p[1] });
      top(d.p[1]); udvid(V(d.p), Math.max(d.b, d.d) / 2);
    } else if (d.t === "rund") {
      const h = d.h ?? 0.6, pos = new THREE.Vector3(d.p[0], d.p[1] - h / 2, d.p[2]);
      const f = fys.tilføj(cylinder({ pos, r: d.r, hh: h / 2, stil }));
      const mats = tema.materialer(stil, d, true);
      const m = rundMesh(d.r, h, mats, pos);
      stille.add(m);
      tema.pynt?.({ ...d, form: f, mesh: m, pos, gruppe: stille, res, top: d.p[1] });
      top(d.p[1]); udvid(V(d.p), d.r);
    } else if (d.t === "rampe") {
      const h = d.h ?? 0.6, k = kasseLangs(V(d.fra), V(d.til), d.b, h, true);
      const f = fys.tilføj(kasse({ pos: k.pos, halv: k.halv, rot: k.q, stil }));
      f.ψ = k.ψ;
      const mats = tema.materialer(stil, d);
      const m = kasseMesh(k.halv, mats, k.q, k.pos);
      stille.add(m);
      tema.pynt?.({ ...d, form: f, mesh: m, pos: k.pos, halv: k.halv, q: k.q, gruppe: stille, res, top: Math.min(d.fra[1], d.til[1]), rampe: true });
      top(Math.min(d.fra[1], d.til[1])); udvid(V(d.fra)); udvid(V(d.til));
    } else if (d.t === "kant") {
      const A = d.A.clone(), B = d.B.clone(), ext = d.ekstra || 0;
      if (ext) { const r = B.clone().sub(A).normalize().multiplyScalar(ext); A.sub(r); B.add(r); }
      A.y += 0.22; B.y += 0.22;
      const k = kasseLangs(A, B, 0.18, 0.44, false);
      fys.tilføj(kasse({ pos: k.pos, halv: k.halv, rot: k.q, art: "væg", hop: 0.15 }));
      const m = new THREE.Mesh(rundKasse(0.18, 0.44, k.halv.z * 2, 0.07, 2), tema.kantMat);
      m.geometry.applyQuaternion(k.q); m.geometry.translate(k.pos.x, k.pos.y, k.pos.z);
      m.castShadow = m.receiveShadow = true;
      stille.add(m);
    } else if (d.t === "bumper") {
      const f = fys.tilføj(cylinder({ pos: new THREE.Vector3(d.p[0], d.p[1] + 0.3, d.p[2]), r: 0.48, hh: 0.55, art: "væg", hop: 0.85, slag: 3 }));
      const o = (tema.bumper || standard.bumper)();
      o.position.set(...d.p);
      f.obj = o;
      aktive.add(o);
    } else if (d.t === "ring") {
      const rr = 1.3, r = 0.42, c = new THREE.Vector3(d.p[0], d.p[1] + rr - r - 0.03, d.p[2]), akse = frem(d.ψ);
      fys.tilføj(ringForm({ pos: c, akse, rr, r, art: "væg", hop: 0.25 }));
      const o = (tema.ring || standard.ring)();
      o.position.copy(c); o.rotation.y = -d.ψ;
      stille.add(o);
      res.ringe.push({ c, akse, rr: rr - r, side: 0 });
    } else if (d.t === "flyt") {
      const h = d.h ?? 0.5, q = new THREE.Quaternion().setFromAxisAngle(OP, d.ry || 0);
      const fra = [d.fra[0], d.fra[1] - h / 2, d.fra[2]], til = [d.til[0], d.til[1] - h / 2, d.til[2]];
      let f, obj;
      if (d.form === "rund") {
        f = cylinder({ pos: V(fra), r: d.r, hh: h / 2, stil });
        obj = rundMesh(d.r, h, tema.materialer(stil, d, true));
      } else {
        f = kasse({ pos: V(fra), halv: new THREE.Vector3(d.b / 2, h / 2, d.d / 2), rot: q, stil });
        obj = kasseMesh(f.halv, tema.materialer(stil, d), q);
      }
      sejl(f, fra, til, d.tid, d.fase || 0);
      fys.tilføj(f);
      const g = new THREE.Group(); g.add(obj);
      tema.pyntFlyt?.(g, d);
      aktive.add(g);
      res.levende.push({ form: f, obj: g });
      top(Math.min(d.fra[1], d.til[1])); udvid(V(d.fra)); udvid(V(d.til));
    } else if (d.t === "drej") {
      const pos = new THREE.Vector3(d.p[0], d.p[1] + 0.36, d.p[2]);
      const f = drejForm(kasse({ pos, halv: new THREE.Vector3(d.l / 2, 0.16, 0.16), art: "væg", hop: 0.2 }), d.fart);
      fys.tilføj(f);
      fys.tilføj(cylinder({ pos: new THREE.Vector3(d.p[0], d.p[1] + 0.45, d.p[2]), r: 0.3, hh: 0.45, art: "væg" }));
      const g = new THREE.Group(); g.position.copy(pos);
      g.add((tema.stang || standard.stang)(d.l));
      aktive.add(g);
      const nav = (tema.nav || (() => { const n = new THREE.Group(); del(n, new THREE.CylinderGeometry(0.3, 0.34, 0.9, 20), blank("#ff5a5f"), [0, 0.45, 0]); return n; }))();
      nav.position.set(...d.p);
      stille.add(nav);
      res.levende.push({ form: f, obj: g, drej: true });
    } else if (d.t === "søjle") {
      fys.tilføj(cylinder({ pos: new THREE.Vector3(d.p[0], d.p[1] + d.h / 2, d.p[2]), r: d.r, hh: d.h / 2, art: "væg", hop: 0.2 }));
      const o = (tema.søjle || standard.søjle)(d.r, d.h);
      o.position.set(...d.p);
      stille.add(o);
    } else if (d.t === "fart") {
      pads.push(d);
    } else if (d.t === "flag") {
      const o = tema.flag();
      o.gruppe.position.set(...d.p); o.gruppe.rotation.y = -d.ψ;
      aktive.add(o.gruppe);
      res.flag.push({ p: V(d.p), ψ: d.ψ, nået: false, ...o });
    } else if (d.t === "mål") {
      const o = tema.mål();
      o.gruppe.position.set(...d.p); o.gruppe.rotation.y = -d.ψ;
      aktive.add(o.gruppe);
      res.mål = { p: V(d.p), ψ: d.ψ, ...o };
    }
  }

  // Fartpile lægges oven på det, de ligger på
  for (const d of pads) {
    const b = fys.bundUnder(d.p[0], d.p[1] + 1, d.p[2], 3);
    const o = pilMesh();
    const y = b ? b.y : d.p[1];
    o.position.set(d.p[0], y + 0.025, d.p[2]);
    const grund = b && b.form.form === "kasse" ? b.form.rot.clone() : new THREE.Quaternion();
    const gψ = b && b.form.ψ != null ? b.form.ψ : 0;
    o.quaternion.copy(grund).multiply(new THREE.Quaternion().setFromAxisAngle(OP, -(d.ψ - gψ)));
    stille.add(o);
    res.pads.push({ p: new THREE.Vector3(d.p[0], y, d.p[2]), dir: frem(d.ψ), obj: o });
  }

  // Ting man samler
  def.ting.forEach((t, i) => {
    const o = tema.ting(i);
    const p = new THREE.Vector3(t[0], t[1] + 0.62, t[2]);
    o.position.copy(p);
    aktive.add(o);
    res.ting.push({ obj: o, p, taget: false, fase: i * 0.7 });
  });

  // Gulvet i værelset (man lander på det, når man falder ned)
  if (tema.gulvUnder != null) {
    res.gulvY = res.minY - tema.gulvUnder;
    const c = res.grænse.getCenter(new THREE.Vector3());
    fys.tilføj(kasse({ pos: new THREE.Vector3(c.x, res.gulvY - 0.5, c.z), halv: new THREE.Vector3(200, 0.5, 200), art: "gulv" }));
  }
  res.grænse.expandByPoint(res.start.p);
  for (const f of res.efter) f();          // pynt der skal vide, hvor gulvet er (søjler under pladerne)
  tema.særlig?.(def, res);
  res.antal = res.ting.length;
  return res;
}

// Bag den stille del sammen til få meshes (meget hurtigere på iPad)
export const bagBane = res => bag(res.stille);
