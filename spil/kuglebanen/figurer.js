// ===== Dyrene der sidder inde i kuglerne (og en stor bamse til børneværelset) =====
// Hver figur er en gruppe med fødderne nederst i kuglen. arm = den arm, der kan vinke.
import * as THREE from "./three.js";
import { del, pind, kG, kap, std, blank, pels, øje, smil } from "./pynt.js";

const kind = () => std("#ff8f9a", 0.7, { transparent: true, opacity: 0.6 });

// En arm der kan dreje fra skulderen
function skulder(f, x, y, z) {
  const s = new THREE.Group(); s.position.set(x, y, z); f.add(s);
  return s;
}

// Aben: brun pels, lyst ansigt og en krøllet hale
export function abe() {
  const f = new THREE.Group();
  const brun = pels("#8a5430"), lys = pels("#f4d4ad");
  del(f, kG, brun, [0, -0.2, 0], [0.18, 0.2, 0.16]);
  del(f, kG, lys, [0, -0.22, 0.075], [0.125, 0.15, 0.1]);
  del(f, kap(0.045, 0.1), brun, [-0.085, -0.34, 0.02], 1, [0.2, 0, 0.15]);
  del(f, kap(0.045, 0.1), brun, [0.085, -0.34, 0.02], 1, [0.2, 0, -0.15]);
  del(f, kG, lys, [-0.1, -0.425, 0.06], [0.065, 0.04, 0.095]);
  del(f, kG, lys, [0.1, -0.425, 0.06], [0.065, 0.04, 0.095]);
  del(f, kap(0.042, 0.17), brun, [-0.2, -0.23, 0.04], 1, [0.1, 0, -0.42]);
  del(f, kG, lys, [-0.25, -0.33, 0.06], 0.052);
  const arm = skulder(f, 0.15, -0.1, 0.02);
  del(arm, kap(0.042, 0.17), brun, [0.07, 0.1, 0], 1, [0, 0, -0.6]);
  del(arm, kG, lys, [0.16, 0.23, 0.01], 0.055);
  const hale = new THREE.CatmullRomCurve3([[0, -0.28, -0.13], [0.05, -0.31, -0.25], [0.13, -0.22, -0.33], [0.17, -0.07, -0.3], [0.12, 0.0, -0.24], [0.07, -0.05, -0.2]].map(p => new THREE.Vector3(...p)));
  del(f, new THREE.TubeGeometry(hale, 32, 0.022, 8), brun);
  del(f, kG, brun, [0, 0.13, 0], 0.23);
  del(f, kG, lys, [-0.068, 0.17, 0.17], [0.095, 0.1, 0.06]);
  del(f, kG, lys, [0.068, 0.17, 0.17], [0.095, 0.1, 0.06]);
  del(f, kG, lys, [0, 0.075, 0.17], [0.13, 0.09, 0.09]);
  øje(f, -0.068, 0.175, 0.225, 0.038);
  øje(f, 0.068, 0.175, 0.225, 0.038);
  del(f, kG, std("#3a2216", 0.5), [-0.022, 0.1, 0.255], 0.011);
  del(f, kG, std("#3a2216", 0.5), [0.022, 0.1, 0.255], 0.011);
  smil(f, 0, 0.072, 0.252, 0.045, 0.009);
  del(f, kG, kind(), [-0.13, 0.09, 0.19], [0.04, 0.025, 0.02], [0, -0.5, 0]);
  del(f, kG, kind(), [0.13, 0.09, 0.19], [0.04, 0.025, 0.02], [0, 0.5, 0]);
  for (const s of [-1, 1]) {
    del(f, kG, brun, [s * 0.235, 0.15, 0], [0.085, 0.085, 0.035], [0, s * 0.3, 0]);
    del(f, kG, lys, [s * 0.24, 0.15, 0.02], [0.058, 0.058, 0.03], [0, s * 0.3, 0]);
  }
  del(f, kG, brun, [0, 0.36, 0.02], [0.045, 0.07, 0.045], [0.3, 0, 0.35]);
  del(f, kG, brun, [0.04, 0.35, 0.0], [0.035, 0.055, 0.035], [0.2, 0, -0.4]);
  f.position.y = -0.07;
  return { gruppe: f, arm };
}

// Hamsteren: en rund, gylden klump med kinder og et jordbær i poterne
export function hamster() {
  const f = new THREE.Group();
  const guld = pels("#e8a050"), creme = pels("#fff0da"), rosa = std("#ff9fb2", 0.5);
  del(f, kG, guld, [0, -0.12, -0.02], [0.3, 0.27, 0.29]);
  del(f, kG, creme, [0, -0.18, 0.12], [0.22, 0.19, 0.18]);
  del(f, kG, guld, [0, 0.06, 0.08], [0.22, 0.19, 0.2]);
  del(f, kG, creme, [-0.1, 0.0, 0.2], [0.1, 0.085, 0.08]);
  del(f, kG, creme, [0.1, 0.0, 0.2], [0.1, 0.085, 0.08]);
  del(f, kG, creme, [0, 0.03, 0.24], [0.075, 0.06, 0.05]);
  øje(f, -0.095, 0.1, 0.255, 0.036);
  øje(f, 0.095, 0.1, 0.255, 0.036);
  del(f, kG, blank("#ff7f99"), [0, 0.058, 0.288], [0.024, 0.017, 0.016]);
  smil(f, 0, 0.035, 0.285, 0.024, 0.006, "#7a3a2a", -0.4);
  del(f, kG, kind(), [-0.16, 0.02, 0.2], [0.04, 0.025, 0.02], [0, -0.6, 0]);
  del(f, kG, kind(), [0.16, 0.02, 0.2], [0.04, 0.025, 0.02], [0, 0.6, 0]);
  for (const s of [-1, 1]) {
    del(f, kG, guld, [s * 0.14, 0.22, 0.04], [0.065, 0.065, 0.03], [0, s * 0.3, 0]);
    del(f, kG, rosa, [s * 0.14, 0.22, 0.056], [0.044, 0.044, 0.02], [0, s * 0.3, 0]);
    del(f, kG, rosa, [s * 0.12, -0.375, 0.13], [0.05, 0.028, 0.07]);
    for (const v of [-0.12, 0.08]) pind(f, [s * 0.07, 0.035, 0.27], [s * 0.2, 0.035 + v * 0.35, 0.25], 0.0028, std("#ffffff", 0.5), 4);
  }
  const arm = skulder(f, 0, -0.1, 0.3);
  del(arm, kG, rosa, [-0.06, 0, 0], 0.03);
  del(arm, kG, rosa, [0.06, 0, 0], 0.03);
  const jb = new THREE.Group(); jb.position.set(0, -0.02, 0.03); jb.scale.setScalar(0.38); arm.add(jb);
  const prof = [[0, -0.22], [0.11, -0.14], [0.17, 0.03], [0.11, 0.13], [0, 0.15]].map(([r, y]) => new THREE.Vector2(r, y));
  del(jb, new THREE.LatheGeometry(prof, 16), blank("#ff2b45"));
  del(jb, kG, std("#3fae3a", 0.6), [0, 0.15, 0], [0.13, 0.03, 0.13]);
  f.position.y = -0.1;
  return { gruppe: f, arm, hamster: true };
}

// Pandaen: sort og hvid, med en slikkepind i vejret
export function panda() {
  const f = new THREE.Group();
  const hvid = pels("#f7f4ee"), sort = pels("#2a2630");
  del(f, kG, hvid, [0, -0.2, 0], [0.19, 0.21, 0.17]);
  del(f, kap(0.06, 0.08), sort, [-0.09, -0.35, 0.03], 1, [0.2, 0, 0.1]);
  del(f, kap(0.06, 0.08), sort, [0.09, -0.35, 0.03], 1, [0.2, 0, -0.1]);
  del(f, kG, sort, [-0.1, -0.43, 0.07], [0.07, 0.045, 0.09]);
  del(f, kG, sort, [0.1, -0.43, 0.07], [0.07, 0.045, 0.09]);
  del(f, kap(0.052, 0.14), sort, [-0.2, -0.23, 0.05], 1, [0.1, 0, -0.42]);
  del(f, kG, sort, [0, -0.08, -0.02], [0.2, 0.07, 0.16]);
  del(f, kG, sort, [-0.25, -0.32, 0.06], 0.055);
  const arm = skulder(f, 0.15, -0.1, 0.02);
  del(arm, kap(0.052, 0.14), sort, [0.07, 0.09, 0], 1, [0, 0, -0.6]);
  del(arm, kG, sort, [0.15, 0.22, 0.01], 0.058);
  pind(arm, [0.15, 0.22, 0.04], [0.16, 0.36, 0.05], 0.011, std("#ffffff", 0.4), 6);
  const sv = new THREE.CanvasTexture((() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d");
    const fv = ["#ff4f9a", "#ffffff", "#4fc3ff", "#ffffff", "#ffd23f", "#ffffff"];
    for (let i = 0; i < 36; i++) { g.fillStyle = fv[i % 6]; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 64, i / 36 * 6.283, (i + 1) / 36 * 6.283 + 0.02); g.fill(); }
    return cv;
  })());
  sv.colorSpace = THREE.SRGBColorSpace;
  const skive = blank("#ffffff", { map: sv });
  del(arm, new THREE.CylinderGeometry(0.075, 0.075, 0.025, 28), [blank("#ff4f9a"), skive, skive], [0.16, 0.41, 0.05], 1, [Math.PI / 2, 0, 0.3]);
  del(f, kG, hvid, [0, 0.12, 0], [0.235, 0.21, 0.22]);
  del(f, kG, sort, [-0.165, 0.3, -0.02], [0.075, 0.075, 0.045]);
  del(f, kG, sort, [0.165, 0.3, -0.02], [0.075, 0.075, 0.045]);
  del(f, kG, sort, [-0.08, 0.14, 0.18], [0.058, 0.076, 0.04], [0, 0, -0.5]);
  del(f, kG, sort, [0.08, 0.14, 0.18], [0.058, 0.076, 0.04], [0, 0, 0.5]);
  øje(f, -0.078, 0.152, 0.213, 0.029);
  øje(f, 0.078, 0.152, 0.213, 0.029);
  del(f, kG, hvid, [0, 0.065, 0.165], [0.085, 0.06, 0.07]);
  del(f, kG, blank("#1d1a20"), [0, 0.09, 0.232], [0.03, 0.02, 0.016]);
  smil(f, 0, 0.062, 0.231, 0.03, 0.007, "#1d1a20");
  del(f, kG, kind(), [-0.15, 0.07, 0.17], [0.04, 0.025, 0.02], [0, -0.6, 0]);
  del(f, kG, kind(), [0.15, 0.07, 0.17], [0.04, 0.025, 0.02], [0, 0.6, 0]);
  f.position.y = -0.07;
  return { gruppe: f, arm };
}

// En stor bamse der sidder på gulvet i børneværelset
export function bamse() {
  const f = new THREE.Group();
  const brun = pels("#b07440"), lys = pels("#f0d0a4"), knap = blank("#24150e", { roughness: 0.1 });
  del(f, kG, brun, [0, 0.47, 0], [0.42, 0.48, 0.38]);
  del(f, kG, lys, [0, 0.43, 0.2], [0.28, 0.32, 0.2]);
  del(f, kG, brun, [0, 1.15, 0.02], [0.36, 0.33, 0.33]);
  for (const s of [-1, 1]) {
    del(f, kG, brun, [s * 0.27, 1.4, 0], [0.13, 0.13, 0.08]);
    del(f, kG, lys, [s * 0.27, 1.4, 0.04], [0.08, 0.08, 0.05]);
    del(f, kap(0.13, 0.3), brun, [s * 0.24, 0.14, 0.3], 1, [Math.PI / 2, 0, 0]);
    del(f, kG, lys, [s * 0.24, 0.14, 0.53], [0.12, 0.12, 0.04]);
    del(f, kap(0.11, 0.32), brun, [s * 0.44, 0.55, 0.12], 1, [0.4, 0, s * 0.5]);
    del(f, kG, knap, [s * 0.13, 1.23, 0.3], 0.045);
  }
  del(f, kG, lys, [0, 1.07, 0.28], [0.15, 0.11, 0.1]);
  del(f, kG, knap, [0, 1.12, 0.375], [0.06, 0.04, 0.035]);
  smil(f, 0, 1.05, 0.37, 0.05, 0.01, "#24150e");
  const rød = blank("#e8404f");
  del(f, new THREE.ConeGeometry(0.1, 0.18, 14), rød, [-0.09, 0.86, 0.33], 1, [0, 0, -Math.PI / 2]);
  del(f, new THREE.ConeGeometry(0.1, 0.18, 14), rød, [0.09, 0.86, 0.33], 1, [0, 0, Math.PI / 2]);
  del(f, kG, rød, [0, 0.86, 0.34], 0.05);
  return f;
}
