import * as THREE from "../3d-faelles/three.module.js";

const klip = (n, a, b) => Math.max(a, Math.min(b, n));

// Ét greb flytter en valgt ting; tomrummet drejer kameraet. To fingre har altid kameraet.
export class BaneKamera {
  constructor(
    canvas,
    kamera,
    { tryk = () => {}, grib = () => false, flyt = () => {}, slip = () => {} } =
      {},
  ) {
    Object.assign(this, { canvas, kamera, tryk, grib, flyt, slip });
    this.maal = new THREE.Vector3(0, 2, 0);
    this.yaw = .68;
    this.pitch = .77;
    this.afstand = 40;
    this.pege = new Map();
    this.greb = false;
    this.flyttet = false;
    this.aktiv = true;
    this.lyttere = [];
    this.lyt("pointerdown", (e) => this.ned(e));
    this.lyt("pointermove", (e) => this.bevaeg(e));
    this.lyt("pointerup", (e) => this.op(e));
    this.lyt("pointercancel", (e) => this.op(e, true));
    this.lyt("lostpointercapture", (e) => {
      if (this.pege.has(e.pointerId)) this.op(e, true);
    });
    this.lyt("contextmenu", (e) => e.preventDefault());
    this.lyt("wheel", (e) => {
      e.preventDefault();
      if (this.aktiv) {
        this.afstand = klip(this.afstand * Math.exp(e.deltaY * .001), 3, 90);
      }
    }, { passive: false });
    this.blur = () => this.annuller();
    window.addEventListener("blur", this.blur);
  }

  lyt(type, fn, options) {
    this.canvas.addEventListener(type, fn, options);
    this.lyttere.push([type, fn, options]);
  }

  // Gem kun skærmkoordinater; kamera og objekt deler ingen skjult pegetilstand.
  ned(e) {
    if (!this.aktiv || (e.pointerType === "mouse" && e.button > 2)) return;
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.pege.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
    });
    if (this.pege.size === 1) {
      this.flyttet = false;
      this.greb = e.button === 0 && !e.shiftKey && !!this.grib(e);
    } else {
      if (this.greb) this.slip(true);
      this.greb = false;
      this.flyttet = true;
    }
    this.forrige = this.gestus();
  }

  gestus() {
    const p = [...this.pege.values()];
    if (p.length < 2) return null;
    return {
      x: (p[0].x + p[1].x) / 2,
      y: (p[0].y + p[1].y) / 2,
      afstand: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
    };
  }

  bevaeg(e) {
    const p = this.pege.get(e.pointerId);
    if (!p || !this.aktiv) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.startX, p.y - p.startY) > 5) this.flyttet = true;
    if (this.pege.size > 1) {
      const g = this.gestus(), f = this.forrige;
      if (f && g) {
        this.afstand = klip(
          this.afstand * f.afstand / Math.max(8, g.afstand),
          3,
          90,
        );
        this.yaw -= (g.x - f.x) * .005;
        this.pitch = klip(this.pitch + (g.y - f.y) * .0035, .1, 1.48);
      }
      this.forrige = g;
    } else if (this.greb && this.flyttet) this.flyt(e);
    else if (this.flyttet) {
      if (e.shiftKey || e.buttons === 2 || e.buttons === 4) {
        this.panorer(dx, dy);
      } else {
        this.yaw -= dx * .005;
        this.pitch = klip(this.pitch + dy * .004, .1, 1.48);
      }
    }
  }

  op(e, annulleret = false) {
    if (!this.pege.has(e.pointerId)) return;
    const enkelt = this.pege.size === 1;
    this.pege.delete(e.pointerId);
    if (enkelt && this.greb) this.slip(annulleret);
    if (enkelt && !this.flyttet && !annulleret) this.tryk(e);
    this.greb = false;
    if (this.pege.size) this.flyttet = true;
    this.forrige = this.gestus();
  }

  panorer(dx, dy) {
    const s = this.afstand * .0015;
    this.maal.x = klip(
      this.maal.x - (Math.cos(this.yaw) * dx + Math.sin(this.yaw) * dy) * s,
      -35,
      35,
    );
    this.maal.z = klip(
      this.maal.z + (Math.sin(this.yaw) * dx - Math.cos(this.yaw) * dy) * s,
      -35,
      35,
    );
  }

  annuller() {
    if (this.greb) this.slip(true);
    this.greb = false;
    this.pege.clear();
    this.forrige = null;
    this.flyttet = false;
  }

  overblik() {
    this.maal.set(0, 2, 0);
    this.yaw = .68;
    this.pitch = .77;
    this.afstand = 40;
  }

  // Kameraets grundstilling genskabes hver frame, så rystelser aldrig hober sig op.
  opdater() {
    const vandret = Math.cos(this.pitch) * this.afstand;
    this.kamera.position.set(
      this.maal.x + Math.sin(this.yaw) * vandret,
      this.maal.y + Math.sin(this.pitch) * this.afstand,
      this.maal.z + Math.cos(this.yaw) * vandret,
    );
    this.kamera.lookAt(this.maal);
    this.kamera.updateMatrixWorld();
  }

  frigiv() {
    this.annuller();
    for (const [type, fn, options] of this.lyttere) {
      this.canvas.removeEventListener(type, fn, options);
    }
    window.removeEventListener("blur", this.blur);
  }
}
