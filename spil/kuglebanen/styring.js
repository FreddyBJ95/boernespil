// ===== Styring: vip iPad'en, træk med fingeren eller brug piletasterne =====
// Alt bliver til ét lille "pind"-tal { x, y } fra -1 til 1 i skærmens retninger (y = fremad).
// Fingeren virker som et joystick: man sætter fingeren hvor som helst og trækker.

const DØD_VIP = 0.03, FULD_VIP = 0.3;      // vip: ~2° gør ingenting, ~18° er fuld fart
const FINGER_R = 72;                        // så langt skal fingeren trækkes for fuld fart (px)

export function lavStyring(canvas, pind) {
  const s = {
    vip: { har: false, x: 0, y: 0, x0: 0, y0: 0, kalibrer: true },
    finger: null, taster: new Set(),
    ud: { x: 0, y: 0 }, kilde: "ingen",
    brugVip: true,
  };

  // ---------- Vip ----------
  const skærmVinkel = () => {
    const a = screen.orientation && typeof screen.orientation.angle === "number" ? screen.orientation.angle
      : typeof window.orientation === "number" ? window.orientation : 0;
    return ((a % 360) + 360) % 360;
  };
  // Tyngdekraften i skærmens retninger (som i Rulle Rasmus), så det virker både på langs og på højkant
  addEventListener("deviceorientation", e => {
    if (e.beta == null || e.gamma == null) return;
    const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
    const gx = Math.sin(g) * Math.cos(b), gy = -Math.sin(b), a = skærmVinkel() * Math.PI / 180;
    const v = s.vip;
    v.x = Math.cos(a) * gx - Math.sin(a) * gy;
    v.y = Math.sin(a) * gx + Math.cos(a) * gy;
    if (!v.har || v.kalibrer) { v.x0 = v.x; v.y0 = v.y; v.kalibrer = false; }
    v.har = true;
  });
  s.kalibrer = () => { s.vip.kalibrer = true; };
  s.bedOmVip = async () => {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function")
        return (await DeviceOrientationEvent.requestPermission()) === "granted";
    } catch (_) { return false; }
    return true;
  };

  // ---------- Finger-joystick ----------
  const ring = pind?.querySelector(".ring"), knop = pind?.querySelector(".knop");
  const visPind = () => {
    if (!pind) return;
    const f = s.finger;
    pind.classList.toggle("vis", !!f);
    if (!f) return;
    pind.style.transform = `translate(${f.sx}px, ${f.sy}px)`;
    const dx = f.x - f.sx, dy = f.y - f.sy, l = Math.hypot(dx, dy), k = l > FINGER_R ? FINGER_R / l : 1;
    knop.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  };
  canvas.addEventListener("pointerdown", e => {
    if (s.finger) return;
    s.finger = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    s.påTryk?.();
    visPind();
  });
  canvas.addEventListener("pointermove", e => {
    const f = s.finger;
    if (!f || f.id !== e.pointerId) return;
    f.x = e.clientX; f.y = e.clientY;
    // trækker man langt væk, følger midten med, så man aldrig "løber tør"
    const dx = f.x - f.sx, dy = f.y - f.sy, l = Math.hypot(dx, dy);
    if (l > FINGER_R * 1.6) { const k = (l - FINGER_R * 1.6) / l; f.sx += dx * k; f.sy += dy * k; }
    visPind();
  });
  const slip = e => { if (s.finger && s.finger.id === e.pointerId) { s.finger = null; visPind(); } };
  canvas.addEventListener("pointerup", slip);
  canvas.addEventListener("pointercancel", slip);

  // ---------- Taster ----------
  const TAST = { ArrowUp: "op", w: "op", W: "op", ArrowDown: "ned", s: "ned", S: "ned", ArrowLeft: "v", a: "v", A: "v", ArrowRight: "h", d: "h", D: "h" };
  addEventListener("keydown", e => { if (TAST[e.key]) { s.taster.add(TAST[e.key]); e.preventDefault(); s.påTryk?.(); } });
  addEventListener("keyup", e => s.taster.delete(TAST[e.key]));
  addEventListener("blur", () => { s.taster.clear(); s.finger = null; visPind(); });

  // Blød kurve: små bevægelser giver fin styring, store giver fuld fart
  const kurve = (x, y, død) => {
    const l = Math.hypot(x, y);
    if (l <= død) return [0, 0];
    const m = Math.min(1, (l - død) / (1 - død)), k = Math.pow(m, 1.35) / l;
    return [x * k, y * k];
  };
  let tx = 0, ty = 0;

  // Læs styringen (kaldes hver billede)
  s.læs = dt => {
    let x = 0, y = 0;
    if (s.finger) {
      const f = s.finger;
      [x, y] = kurve((f.x - f.sx) / FINGER_R, -(f.y - f.sy) / FINGER_R, 0.08);
      s.kilde = "finger";
    } else if (s.taster.size) {
      const mx = (s.taster.has("h") ? 1 : 0) - (s.taster.has("v") ? 1 : 0), my = (s.taster.has("op") ? 1 : 0) - (s.taster.has("ned") ? 1 : 0);
      const a = 1 - Math.exp(-dt / 0.12);             // tasterne glider op til fuld fart
      tx += (mx - tx) * a; ty += (my - ty) * a;
      x = tx; y = ty;
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      s.kilde = "taster";
    } else if (s.brugVip && s.vip.har) {
      const v = s.vip;
      [x, y] = kurve((v.x - v.x0) / FULD_VIP, (v.y - v.y0) / FULD_VIP, DØD_VIP / FULD_VIP);
      s.kilde = "vip";
    } else s.kilde = "ingen";
    if (!s.taster.size) { tx = 0; ty = 0; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    const a = 1 - Math.exp(-dt / 0.05);               // en lille smule udglatning mod rystelser
    s.ud.x += (x - s.ud.x) * a; s.ud.y += (y - s.ud.y) * a;
    return s.ud;
  };
  return s;
}
