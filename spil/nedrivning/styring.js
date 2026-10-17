// ===== Kameraet og fingrene/musen =====
// Én finger (eller venstre museknap) drejer rundt om pladsen, to fingre zoomer og flytter, og musehjulet zoomer.
// Et kort tryk uden at trække er et "tryk" — det bruges til at sætte sprængstof.
// Tastatur: WASD/piletaster flytter, Q/E drejer, + og − zoomer.

import * as THREE from "../3d-faelles/three.module.js";

export class Kamera {
  constructor(kamera, lærred, { vedTryk, vedHover } = {}) {
    this.k = kamera; this.lærred = lærred; this.vedTryk = vedTryk; this.vedHover = vedHover;
    this.mål = new THREE.Vector3(0, 4, 0); this.yaw = 0.7; this.pitch = 0.42; this.afstand = 42;
    this.vis = { mål: this.mål.clone(), yaw: this.yaw, pitch: this.pitch, afstand: this.afstand };
    this.fingre = new Map(); this.taster = new Set(); this.grænse = 70; this.aktiv = true;
    const e = lærred;
    e.addEventListener("pointerdown", ev => this.ned(ev));
    e.addEventListener("pointermove", ev => this.flyt(ev));
    e.addEventListener("pointerup", ev => this.op(ev));
    e.addEventListener("pointercancel", ev => this.op(ev, true));
    e.addEventListener("contextmenu", ev => ev.preventDefault());
    e.addEventListener("wheel", ev => { ev.preventDefault(); this.zoom(Math.exp(ev.deltaY * 0.0012)); }, { passive: false });
    addEventListener("keydown", ev => { if (!ev.target.closest?.("input,textarea")) this.taster.add(ev.key.toLowerCase()); });
    addEventListener("keyup", ev => this.taster.delete(ev.key.toLowerCase()));
    addEventListener("blur", () => this.taster.clear());
  }
  sæt({ mål, yaw, pitch, afstand }, glat = false) {
    if (mål) this.mål.set(...mål);
    if (yaw !== undefined) this.yaw = yaw;
    if (pitch !== undefined) this.pitch = pitch;
    if (afstand !== undefined) this.afstand = afstand;
    if (!glat) this.vis = { mål: this.mål.clone(), yaw: this.yaw, pitch: this.pitch, afstand: this.afstand };
  }
  zoom(f) { this.afstand = Math.max(5, Math.min(150, this.afstand * f)); }
  // Flyt målet langs jorden (dx, dz i skærmens retning)
  panorer(dx, dz) {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    this.mål.x += (dx * c + dz * s); this.mål.z += (-dx * s + dz * c);
    this.mål.x = Math.max(-this.grænse, Math.min(this.grænse, this.mål.x));
    this.mål.z = Math.max(-this.grænse, Math.min(this.grænse, this.mål.z));
  }

  ned(ev) {
    if (!this.aktiv) return;
    this.lærred.setPointerCapture?.(ev.pointerId);
    this.fingre.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: performance.now(), knap: ev.button, skift: ev.shiftKey });
    if (this.fingre.size === 2) { const [a, b] = [...this.fingre.values()]; this.knib = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
  }
  flyt(ev) {
    const f = this.fingre.get(ev.pointerId);
    if (!f) { if (ev.pointerType === "mouse") this.vedHover?.(ev.clientX, ev.clientY); return; }
    const dx = ev.clientX - f.x, dy = ev.clientY - f.y;
    f.x = ev.clientX; f.y = ev.clientY;
    if (this.fingre.size === 2 && this.knib) {
      const [a, b] = [...this.fingre.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (d > 0 && this.knib.d > 0) this.zoom(this.knib.d / d);
      const k = this.afstand * 0.0018;
      this.panorer(-(mx - this.knib.mx) * k, -(my - this.knib.my) * k);
      this.knib = { d, mx, my };
      return;
    }
    if (Math.hypot(f.x - f.x0, f.y - f.y0) < 7 && performance.now() - f.t0 < 450) return;     // endnu et tryk
    f.trukket = true;
    if (f.knap === 2 || f.knap === 1 || f.skift) { const k = this.afstand * 0.0018; this.panorer(-dx * k, -dy * k); return; }
    this.yaw -= dx * 0.006;
    this.pitch = Math.max(0.06, Math.min(1.45, this.pitch + dy * 0.004));
    if (ev.pointerType === "mouse") this.vedHover?.(ev.clientX, ev.clientY);
  }
  op(ev, afbrudt = false) {
    const f = this.fingre.get(ev.pointerId);
    this.fingre.delete(ev.pointerId);
    if (this.fingre.size < 2) this.knib = null;
    if (!f || afbrudt || f.trukket || this.fingre.size > 0) return;
    if (Math.hypot(ev.clientX - f.x0, ev.clientY - f.y0) < 9 && performance.now() - f.t0 < 600 && f.knap === 0) this.vedTryk?.(ev.clientX, ev.clientY);
  }

  // Hvert billede: tastatur, blød bevægelse og rysten fra sprængningerne
  opdater(dt, ryst = 0) {
    const t = this.taster, fart = this.afstand * 0.9 * dt;
    if (t.has("w") || t.has("arrowup")) this.panorer(0, -fart);
    if (t.has("s") || t.has("arrowdown")) this.panorer(0, fart);
    if (t.has("a") || t.has("arrowleft")) this.panorer(-fart, 0);
    if (t.has("d") || t.has("arrowright")) this.panorer(fart, 0);
    if (t.has("q")) this.yaw += dt * 1.2;
    if (t.has("e")) this.yaw -= dt * 1.2;
    if (t.has("+") || t.has("=")) this.zoom(Math.exp(-dt * 1.5));
    if (t.has("-")) this.zoom(Math.exp(dt * 1.5));
    const k = 1 - Math.exp(-dt * 8), v = this.vis;
    v.mål.lerp(this.mål, k); v.yaw += (this.yaw - v.yaw) * k; v.pitch += (this.pitch - v.pitch) * k; v.afstand += (this.afstand - v.afstand) * k;
    const cp = Math.cos(v.pitch);
    this.k.position.set(v.mål.x + Math.sin(v.yaw) * cp * v.afstand, v.mål.y + Math.sin(v.pitch) * v.afstand, v.mål.z + Math.cos(v.yaw) * cp * v.afstand);
    if (this.k.position.y < 1.2) this.k.position.y = 1.2;
    this.k.lookAt(v.mål);
    if (ryst > 0.002) {
      const a = ryst * 0.35, tid = performance.now() / 1000;
      this.k.position.x += Math.sin(tid * 53) * a; this.k.position.y += Math.sin(tid * 71 + 1) * a * 0.8; this.k.position.z += Math.sin(tid * 61 + 2) * a;
      this.k.rotateZ(Math.sin(tid * 47) * ryst * 0.012);
    }
  }
  // En stråle fra kameraet gennem et punkt på skærmen
  stråle(x, y) {
    const r = this.lærred.getBoundingClientRect();
    const v = new THREE.Vector3(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1, 0.5).unproject(this.k);
    return { fra: this.k.position.clone(), retning: v.sub(this.k.position).normalize() };
  }
}
