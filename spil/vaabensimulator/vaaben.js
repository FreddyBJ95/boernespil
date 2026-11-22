// ===== Våbnene: pistol, revolver, haglgevær, stormgevær og snigskyttegevær =====
// Hvert våben bygges i sine rigtige mål (meter) af profiler og drejede dele, med de dele der bevæger
// sig som egne led: slæden, hanen, tromlen, pumpen, bundstykket og magasinet.
// x = fremad mod mundingen, y = op, z = venstre side (højre side, hvor hylstrene ryger ud, er −z).
// Hvert våben har en "pose"-funktion, der stiller delene ud fra hvor langt skuddet eller ladningen er.

import * as THREE from "../3d-faelles/three.module.js";
import { side, langs, drejet, rør, kasse, rilleCirkel, del, led, række } from "./former.js";
// Våbnene bruger deres eget sæt materialer (de tegnes med eget lys); patroner ude i verden bruger verdens
import { våbenMat as mat, mat as verdensMat } from "./materialer.js";

// ---------- Små hjælpere til bevægelser ----------
const klem = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const fase = (t, a, b) => klem((t - a) / (b - a));                 // 0 før a, 1 efter b
const blød = x => x * x * (3 - 2 * x);                              // blød start og slut
const ud = x => 1 - (1 - x) * (1 - x);                               // hurtig start, blød slut
const frem = (t, a, b, c, d) => blød(fase(t, a, b)) - blød(fase(t, c, d));   // op mellem a-b, ned mellem c-d

// En flad skive (fx mundingens mørke hul), der vender langs +x eller −x
function skive(r, matr, x, y, z, bagud = false) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), matr);
  m.position.set(x, y, z); m.rotation.y = bagud ? -Math.PI / 2 : Math.PI / 2;
  return m;
}
// En lille skrue eller stift på siden af våbnet (begge sider)
function stifter(r, matr, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, z * 2 + 0.0006, 16); g.rotateX(Math.PI / 2);
  return del(g, matr, x, y, 0);
}

// ---------- Patroner og hylstre ----------
// profil = [x, radius] fra bunden af hylsteret. Tomme hylstre er hule i munden.
function hylsterProfil({ L, rB, rand, rille = true, skulder = null, rHals = null }) {
  const p = [[0, 0], [0, rand], [0.0011, rand]];
  if (rille) p.push([0.0014, rB * 0.8], [0.0026, rB * 0.8], [0.0032, rB]);
  else p.push([0.0013, rB]);
  if (skulder) {
    p.push([skulder[0], rB * 0.97], [skulder[1], rHals], [L, rHals], [L, rHals - 0.0003], [skulder[1] + 0.001, rHals - 0.0003], [skulder[1] + 0.001, 0]);
  } else {
    p.push([L, rB * 0.97], [L, rB * 0.97 - 0.0004], [L * 0.55, rB * 0.97 - 0.0004], [L * 0.55, 0]);
  }
  return p;
}
function kugleProfil(x0, r, længde, flad = 0.12) {
  const p = [[x0 - 0.002, r * 0.98]];
  for (let i = 0; i <= 10; i++) { const t = i / 10; p.push([x0 + t * længde, r * Math.pow(1 - Math.pow(t, 1.9), 0.55) * (1 - flad) + r * flad * (1 - t * t)]); }
  p.push([x0 + længde, 0]);
  return p;
}
const PATRONER = {
  "9mm": { L: 0.0192, rB: 0.00495, rand: 0.00495, kugle: [0.0045, 0.0106, 0.25] },
  "357": { L: 0.033, rB: 0.0048, rand: 0.0056, rille: false, kugle: [0.0045, 0.008, 0.45] },
  "556": { L: 0.0447, rB: 0.0048, rand: 0.0048, skulder: [0.0362, 0.0385], rHals: 0.0032, kugle: [0.0028, 0.0128, 0.08] },
  "308": { L: 0.0512, rB: 0.006, rand: 0.006, skulder: [0.0398, 0.0428], rHals: 0.0043, kugle: [0.0039, 0.0200, 0.08] },
};
const patronGeo = new Map();
// Et hylster eller en hel patron (med kugle), der ligger langs x med bunden i 0
export function patron(slags, medKugle = false, m = verdensMat) {
  const g = new THREE.Group();
  if (slags === "hagl") {
    if (!patronGeo.has("hagl")) patronGeo.set("hagl", {
      hoved: drejet([[0, 0], [0, 0.0118], [0.0016, 0.0118], [0.0018, 0.0108], [0.012, 0.0108], [0.012, 0.0001]], 24),
      hylster: drejet([[0.0118, 0.0001], [0.0118, 0.0104], [0.066, 0.0104], [0.0700, 0.0095], [0.0702, 0.004], [0.0700, 0.0001]], 24),
    });
    const geo = patronGeo.get("hagl"), hoved = del(geo.hoved, m.messing), hylster = del(geo.hylster, m.rødPlast);
    g.add(hoved, hylster);
    return g;
  }
  const s = PATRONER[slags], nøgle = slags + medKugle;
  if (!patronGeo.has(nøgle)) {
    const hyl = drejet(medKugle ? hylsterProfil({ ...s }).filter(([x, r]) => !(r === 0 && x > 0.001)).concat([[s.L, 0]]) : hylsterProfil(s), 20);
    patronGeo.set(nøgle, { hyl, kugle: medKugle ? drejet(kugleProfil(s.L, s.kugle[0], s.kugle[1], s.kugle[2]), 18) : null });
  }
  const geo = patronGeo.get(nøgle);
  g.add(del(geo.hyl, m.messing));
  if (geo.kugle) g.add(del(geo.kugle, m.kobber));
  return g;
}

// Det krumme magasin (30 skud): forkant og bagkant bøjer fremad nedad
function magasinKurve() {
  const bez = (a, k, b, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * k[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * k[1] + t * t * b[1]];
  const p = [[-0.008, -0.012], [0.053, -0.012]];
  for (let i = 1; i <= 10; i++) p.push(bez([0.053, -0.012], [0.054, -0.115], [0.090, -0.186], i / 10));
  for (let i = 0; i <= 10; i++) p.push(bez([0.024, -0.193], [-0.002, -0.118], [-0.008, -0.012], i / 10));
  p.pop();
  return p;
}

// ---------- Fælles: munding, udkast og løbets hul ----------
function mærke(x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); return o; }

// =====================================================================
// PISTOL — polymerpistol i 9 mm (186 mm lang, 17 skud)
// =====================================================================
function lavPistol() {
  const våben = new THREE.Group();
  const SB = 0.0127, ST = 0.0175, SU = -0.012;           // slædens halve bredde, top og bund
  const fuld = [[-SB, SU, 0.0008], [SB, SU, 0.0008], [SB, 0.0135, 0], [0.0095, ST, 0.0012], [-0.0095, ST, 0.0012], [-SB, 0.0135, 0]];
  const port = [[-SB, SU, 0.0008], [SB, SU, 0.0008], [SB, 0.0015, 0], [-0.006, 0.0015, 0], [-0.006, ST, 0], [-0.0095, ST, 0.0012], [-SB, 0.0135, 0]];
  const mørk = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.85 });

  // Slæden: bagstykke, udkaststykke (med hul ind til løbet) og forstykke
  const slæde = led(0, 0, 0,
    del(langs(fuld, -0.072, 0.006), mat.nitrid),
    del(langs(port, 0.006, 0.048), mat.nitrid),
    del(langs(fuld, 0.048, 0.114), mat.nitrid),
  );
  // Riller bagerst og forrest på slæden (til at gribe om)
  const rilleGeo = new THREE.BoxGeometry(0.0012, 0.0185, 0.0005), rilleMat = new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.9, metalness: 0.4 });
  for (const zs of [-1, 1]) {
    slæde.add(række(rilleGeo, rilleMat, 7, { x: -0.0675, y: 0.0005, z: zs * (SB + 0.00012) }, { x: 0.0027, y: 0, z: 0 }));
    slæde.add(række(rilleGeo, rilleMat, 5, { x: 0.086, y: 0.0005, z: zs * (SB + 0.00012) }, { x: 0.0027, y: 0, z: 0 }));
  }
  // Sigtemidler med tritium (lyser grønt i mørke)
  slæde.add(del(kasse(0.099, ST - 0.001, 0.106, ST + 0.0058, 0.0032, 0.0006, 0.0004), mat.mørkStål));
  slæde.add(del(new THREE.CylinderGeometry(0.0011, 0.0011, 0.0006, 12).rotateZ(Math.PI / 2), mat.tritium, 0.0988, ST + 0.0036, 0));
  const bagsigte = kasse(-0.066, ST - 0.001, -0.056, ST + 0.0072, 0.0042, 0.0008, 0.0005);
  slæde.add(del(bagsigte, mat.mørkStål, 0, 0, 0.0039), del(bagsigte, mat.mørkStål, 0, 0, -0.0039));
  slæde.add(del(kasse(-0.066, ST - 0.001, -0.056, ST + 0.003, 0.0118, 0.0006, 0.0004), mat.mørkStål));
  for (const zs of [-1, 1]) slæde.add(del(new THREE.CylinderGeometry(0.001, 0.001, 0.0006, 12).rotateZ(Math.PI / 2), mat.tritium, -0.0663, ST + 0.0045, zs * 0.0039));
  // Udtrækkeren (lille klo ved udkastet)
  slæde.add(del(kasse(-0.002, 0.003, 0.012, 0.0068, 0.0012), mat.mørkStål, 0, 0, -SB - 0.0001));
  våben.add(slæde);

  // Løbet: synligt i udkastet og forrest, med mørkt hul
  const løb = led(0, 0, 0,
    del(kasse(0.006, 0.0015, 0.048, 0.0158, 0.0145, 0.0006, 0.0005), mat.blank, 0, 0, -0.0008),
    del(rør(0.0072, 0.0072, 0.004, 24), mat.blank, 0.1123, 0, 0),
    skive(0.0045, mat.hul, 0.1146, 0, 0),
    del(rør(0.0023, 0.0023, 0.004), mat.mørkStål, 0.1122, -0.0088, 0),
  );
  løb.add(del(new THREE.BoxGeometry(0.15, 0.022, 0.017), mørk, 0.02, 0.004, -0.0005));   // mørket inde i slæden
  våben.add(løb);

  // Rammen (polymer) under slæden, med skinne til lygte
  våben.add(del(side([[-0.068, -0.0115], [0.108, -0.0115], [0.1085, -0.0225, 0.002], [0.090, -0.0236, 0.001], [0.040, -0.0236, 0.001], [0.036, -0.0212, 0.002], [-0.008, -0.0205], [-0.010, -0.016], [-0.068, -0.016]], 0.0236, { fas: 0.0016 }), mat.polymer));
  for (const zs of [-1, 1]) våben.add(del(new THREE.BoxGeometry(0.064, 0.0011, 0.0004), mørk, 0.075, -0.0188, zs * 0.0119));
  våben.add(del(new THREE.BoxGeometry(0.0055, 0.0024, 0.0242), mørk, 0.066, -0.0225, 0));
  // Greb med prikker og fingerriller
  const grebPkt = [[-0.010, -0.0135, 0], [-0.011, -0.021, 0.002], [-0.01758, -0.0354, 0.003], [-0.01925, -0.0458, 0.004], [-0.02533, -0.0554, 0.003], [-0.027, -0.0658, 0.004],
    [-0.03308, -0.0754, 0.003], [-0.03475, -0.0858, 0.004], [-0.043, -0.101, 0.002], [-0.0445, -0.1045, 0.0015], [-0.088, -0.1015, 0.002], [-0.089, -0.097, 0.003],
    [-0.067, -0.040, 0.008], [-0.071, -0.028, 0.004], [-0.081, -0.0205, 0.004], [-0.077, -0.0135, 0.002]];
  våben.add(del(side(grebPkt, 0.0298, { fas: 0.0055, uv: 30 }), mat.polymerGreb));
  // Aftrækkerbøjle og aftrækker
  våben.add(del(side([[0.040, -0.0225], [0.0415, -0.0472, 0.004], [-0.004, -0.0505, 0.006], [-0.0115, -0.040, 0.004], [-0.0095, -0.024]], 0.0095,
    { fas: 0.0016, huller: [[[0.0345, -0.0245, 0.002], [0.035, -0.0435, 0.004], [-0.002, -0.0458, 0.005], [-0.0058, -0.036, 0.003], [-0.0042, -0.0245, 0.002]]] }), mat.polymer));
  const aftrækker = led(0.0205, -0.0205, 0,
    del(side([[0.001, 0], [0.002, -0.009, 0.004], [-0.001, -0.0195, 0.002], [-0.004, -0.0198, 0.001], [-0.003, -0.010, 0.004], [-0.004, 0]], 0.0062, { fas: 0.0012 }), mat.polymer),
    del(new THREE.BoxGeometry(0.0016, 0.012, 0.0014), mat.mørkStål, -0.0008, -0.009, 0));
  våben.add(aftrækker);
  // Små detaljer: adskillelsesgreb og stifter
  våben.add(del(kasse(0.022, -0.016, 0.032, -0.0128, 0.0262, 0.0008), mat.mørkStål));
  våben.add(stifter(0.0013, mat.mørkStål, 0.012, -0.018, 0.0119), stifter(0.0013, mat.mørkStål, -0.010, -0.0175, 0.0119));

  // Magasinet: sidder i grebet, med bundplade og en patron øverst
  const RET = new THREE.Vector2(-0.361, -0.932);        // grebets hældning (magasinet glider ud langs den)
  const magasin = led(0, 0, 0,
    del(side([[-0.0155, -0.020], [-0.046, -0.099], [-0.084, -0.099], [-0.0535, -0.020]], 0.0225, { fas: 0.001 }), mat.polymer),
    del(side([[-0.0425, -0.1005, 0.001], [-0.0442, -0.1068, 0.002], [-0.0905, -0.1048, 0.002], [-0.0885, -0.0995, 0.001]], 0.031, { fas: 0.0015 }), mat.polymer),
  );
  const top = patron("9mm", true, mat); top.position.set(-0.044, -0.0215, 0.002); top.rotation.y = 0; top.rotation.z = -0.05; magasin.add(top);
  våben.add(magasin);

  return {
    gruppe: våben, munding: mærke(0.118, 0, 0), udkast: mærke(0.026, 0.012, -0.006),
    pose(st) {
      const t = st.sidenSkud;
      // Slæden farer 24 mm tilbage og tilbage igen (bliver stående bagi, når magasinet er tomt)
      let s = t < 0.075 ? Math.sin(Math.min(1, t / 0.075) * Math.PI) * (t < 0.025 ? 1 : 1) : 0;
      if (t < 0.025) s = t / 0.025; else if (t < 0.075) s = 1 - blød((t - 0.025) / 0.05);
      if (st.tom && t >= 0.025 && !st.lader) s = 1;
      if (st.lader) s = st.tom ? 1 - blød(fase(st.ladT, 1.12, 1.2)) : 0;
      slæde.position.x = -0.024 * s;
      løb.position.y = -0.0012 * s; løb.rotation.z = 0.02 * s;
      aftrækker.rotation.z = t < 0.06 ? -0.22 * (1 - t / 0.06) : 0;
      // Magasinet: ud (0,15-0,45 s), nyt ind (0,6-0,95 s)
      let m = 0;
      if (st.lader) { const lt = st.ladT; m = lt < 0.5 ? blød(fase(lt, 0.15, 0.45)) * 1.4 : 1.4 * (1 - blød(fase(lt, 0.55, 0.95))); }
      magasin.position.set(RET.x * m * 0.1, RET.y * m * 0.1, 0);
      return { rul: frem(st.ladT ?? -1, 0, 0.18, 1.05, 1.3) * 0.35, løft: frem(st.ladT ?? -1, 0, 0.2, 1.05, 1.3) * 0.15 };
    },
    magasinDel: magasin,
  };
}

// =====================================================================
// REVOLVER — .357 Magnum, 6" løb i rustfrit stål og greb af valnød (6 skud)
// =====================================================================
function lavRevolver() {
  const våben = new THREE.Group();
  const AKSE = -0.0145;          // tromlens akse ligger under løbet

  // Rammen med vindue til tromlen
  våben.add(del(side([[-0.040, 0.0125, 0.003], [0.042, 0.0125, 0.001], [0.042, -0.012], [0.040, -0.0405, 0.003], [0.022, -0.041], [-0.020, -0.041],
    [-0.030, -0.046, 0.004], [-0.046, -0.044, 0.004], [-0.051, -0.020, 0.006], [-0.046, 0.004, 0.006]], 0.031,
  { fas: 0.0022, huller: [[[-0.0225, -0.0368, 0.002], [0.0225, -0.0368, 0.002], [0.0225, 0.0078, 0.002], [-0.0225, 0.0078, 0.002]]] }), mat.rustfri));
  // Løbet med fuld underlug og ventileret skinne
  våben.add(del(side([[0.040, 0.0124], [0.195, 0.0121, 0.001], [0.1965, -0.010, 0.002], [0.195, -0.029, 0.007], [0.050, -0.029, 0.002], [0.040, -0.029]], 0.019, { fas: 0.0026 }), mat.rustfri));
  våben.add(del(kasse(0.046, 0.0118, 0.192, 0.0146, 0.0085, 0.0008, 0.0006), mat.rustfri));
  const ventil = new THREE.BoxGeometry(0.009, 0.0016, 0.0088);
  våben.add(række(ventil, new THREE.MeshStandardMaterial({ color: 0x222326, roughness: 0.6, metalness: 0.5 }), 9, { x: 0.058, y: 0.0131, z: 0 }, { x: 0.0155, y: 0, z: 0 }));
  våben.add(del(drejet([[0.1955, 0.0072], [0.1966, 0.0068], [0.1966, 0.0046]], 24), mat.blank), skive(0.0046, mat.hul, 0.1962, 0, 0));
  // Korn med rød indsats og justerbart bagsigte
  våben.add(del(side([[0.168, 0.0144], [0.192, 0.0144], [0.1915, 0.0232, 0.001], [0.1865, 0.0236, 0.001]], 0.0032, { fas: 0.0005 }), mat.rustfri));
  våben.add(del(kasse(0.1872, 0.0195, 0.1905, 0.0232, 0.0034, 0.0004, 0.0003), new THREE.MeshStandardMaterial({ color: 0xff2a1a, roughness: 0.35, emissive: 0x551008 })));
  våben.add(del(kasse(-0.040, 0.0122, -0.020, 0.0172, 0.010, 0.001, 0.0006), mat.mørkStål));
  våben.add(del(kasse(-0.041, 0.0150, -0.036, 0.0192, 0.0036, 0.0005, 0.0004), mat.mørkStål, 0, 0, 0.0034), del(kasse(-0.041, 0.0150, -0.036, 0.0192, 0.0036, 0.0005, 0.0004), mat.mørkStål, 0, 0, -0.0034));

  // Tromlen med seks kamre og riller — drejer 60° pr. skud og svinger ud til venstre ved ladning
  const tromle = led(0, AKSE, 0);
  tromle.add(del(langs(rilleCirkel(0.0205, 6, 0.0034, 0.3, Math.PI / 6), -0.021, 0.021, { fas: 0.0016 }), mat.rustfri));
  const rande = [];
  for (let k = 0; k < 6; k++) {
    const v = k / 6 * Math.PI * 2, y = Math.cos(v) * 0.0145, z = Math.sin(v) * 0.0145;
    tromle.add(skive(0.0047, mat.hul, 0.0211, y, z));
    const rand = new THREE.Group();
    rand.add(del(new THREE.CylinderGeometry(0.0056, 0.0056, 0.0012, 20).rotateZ(Math.PI / 2), mat.messing, -0.0004, 0, 0));
    rand.add(del(new THREE.CylinderGeometry(0.0021, 0.0021, 0.0008, 14).rotateZ(Math.PI / 2), mat.blank, -0.0010, 0, 0));
    rand.position.set(-0.0211, y, z); tromle.add(rand); rande.push(rand);
  }
  tromle.add(del(rør(0.0034, 0.0034, 0.04), mat.blank, 0.040, 0, 0));      // udstøderstangen (skjult i underlug)
  const kran = led(0, -0.034, 0.010, tromle); tromle.position.set(0, AKSE + 0.034, -0.010);
  våben.add(kran);

  // Hanen med riflet spore
  const hane = led(-0.041, -0.006, 0,
    del(side([[0.004, -0.004], [0.0065, 0.010, 0.002], [0.0025, 0.0185, 0.001], [-0.004, 0.0245, 0.003], [-0.0165, 0.0262, 0.004], [-0.0165, 0.0205, 0.003], [-0.008, 0.0165, 0.003], [-0.006, 0.002, 0.003], [-0.002, -0.006]], 0.0068, { fas: 0.0012 }), mat.mørkStål),
    del(kasse(-0.0165, 0.0232, -0.006, 0.0264, 0.0072, 0.001, 0.0005), mat.knurl));
  våben.add(hane);
  // Aftrækker og bøjle
  const aftrækker = led(0.006, -0.040, 0,
    del(side([[0.004, 0.001], [0.0055, -0.010, 0.005], [0.0012, -0.0205, 0.003], [-0.0028, -0.0208, 0.002], [-0.0005, -0.0112, 0.005], [-0.0022, 0.001]], 0.0082, { fas: 0.0015 }), mat.blank));
  våben.add(aftrækker);
  våben.add(del(side([[0.024, -0.040], [0.026, -0.058, 0.010], [-0.006, -0.066, 0.010], [-0.016, -0.052, 0.006], [-0.014, -0.041]], 0.0078,
    { fas: 0.0015, huller: [[[0.0195, -0.0425, 0.002], [0.0205, -0.0545, 0.008], [-0.003, -0.0605, 0.007], [-0.0105, -0.0505, 0.004], [-0.009, -0.0425, 0.001]]] }), mat.rustfri));
  // Greb af riflet valnød med skrue
  våben.add(del(side([[-0.0135, -0.040], [-0.020, -0.058, 0.006], [-0.030, -0.100, 0.010], [-0.044, -0.112, 0.012], [-0.062, -0.104, 0.010], [-0.058, -0.060, 0.012], [-0.053, -0.030, 0.008], [-0.046, -0.022, 0.004]], 0.0345, { fas: 0.0075, uv: 12 }), mat.valnødRiflet));
  våben.add(stifter(0.0032, mat.rustfri, -0.043, -0.072, 0.0174));
  våben.add(stifter(0.0016, mat.mørkStål, 0.030, -0.030, 0.0157), stifter(0.0016, mat.mørkStål, -0.032, -0.030, 0.0157));

  let vinkel = 0, mål = 0;
  return {
    gruppe: våben, munding: mærke(0.2, 0, 0), udkast: mærke(-0.021, AKSE, 0),
    rande,
    pose(st, dt) {
      const t = st.sidenSkud;
      // Hanen falder ved skuddet og spændes igen bagefter, mens tromlen drejer videre
      const spændt = t < 0.03 ? 1 - t / 0.03 : blød(fase(t, 0.12, 0.26));
      hane.rotation.z = 0.62 * (st.lader ? 0 : spændt);
      aftrækker.rotation.z = -0.32 * (t < 0.03 ? 1 : 1 - blød(fase(t, 0.12, 0.26))) * (t < 0.3 ? 1 : 0) - (st.lader ? 0 : 0);
      if (st.nytSkud) { mål += Math.PI / 3; st.nytSkud = false; }
      vinkel += (mål - vinkel) * (1 - Math.exp(-dt * (t > 0.12 ? 28 : 0)));
      tromle.rotation.x = vinkel;
      // Ladning: tromlen svinger ud (venstre), hylstrene skubbes ud, nye patroner ind og tromlen lukkes
      let sving = 0, skub = 0;
      if (st.lader) {
        const lt = st.ladT;
        sving = blød(fase(lt, 0.2, 0.38)) - blød(fase(lt, 1.35, 1.48));
        skub = frem(lt, 0.45, 0.58, 0.62, 0.75);
        for (const r of rande) { r.visible = lt < 0.55 || lt > 0.95; r.position.x = -0.0211 - skub * 0.03; }
      } else for (const r of rande) { r.visible = true; r.position.x = -0.0211; }
      kran.rotation.x = sving * 1.25;
      const lt = st.ladT ?? -1;
      return { rul: -frem(lt, 0, 0.2, 1.55, 1.85) * 1.0, løft: frem(lt, 0, 0.2, 1.55, 1.85) * 0.35 + frem(lt, 0.4, 0.5, 0.75, 0.9) * 0.6 };
    },
  };
}

// =====================================================================
// HAGLGEVÆR — pumpgevær i kaliber 12 med blånet stål og valnød (6 patroner)
// =====================================================================
function lavHagl() {
  const våben = new THREE.Group();
  const B = 0.0152, T = 0.020, U = -0.028;
  const fuld = [[-B, U, 0.002], [B, U, 0.002], [B, T - 0.009, 0], [B - 0.004, T, 0.006], [-B + 0.004, T, 0.006], [-B, T - 0.009, 0]];
  const portSnit = [[-B, U, 0.002], [B, U, 0.002], [B, -0.008], [0.0045, -0.008], [0.0045, 0.0125], [B, 0.0125], [B, T - 0.009, 0], [B - 0.004, T, 0.006], [-B + 0.004, T, 0.006], [-B, T - 0.009, 0]];
  // Mekanismehuset med udkastport
  våben.add(del(langs(fuld, -0.085, 0.012, { uv: 14 }), mat.blånet), del(langs(portSnit, 0.012, 0.080, { uv: 14 }), mat.blånet), del(langs(fuld, 0.080, 0.122, { uv: 14 }), mat.blånet));
  // Bundstykket (blankt), der ses i porten og går tilbage, når man pumper
  const bolt = led(0, 0, 0, del(kasse(0.013, -0.0075, 0.077, 0.0115, 0.0074, 0.0012, 0.0006), mat.blank, 0, 0, -0.0083));
  bolt.add(del(new THREE.BoxGeometry(0.06, 0.018, 0.002), new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.8 }), 0.046, 0.002, -0.0042));
  våben.add(bolt);
  // Løb med perlekorn, magasinrør, klampe og rørprop
  våben.add(del(rør(0.0119, 0.0117, 0.44, 32), mat.blånet, 0.342, 0, 0));
  våben.add(del(new THREE.SphereGeometry(0.0019, 12, 8), mat.messing, 0.556, 0.0124, 0));
  våben.add(del(drejet([[0.5595, 0.0117], [0.5605, 0.0112], [0.5605, 0.0094]], 32), mat.blank), skive(0.0094, mat.hul, 0.5603, 0, 0));
  våben.add(del(rør(0.0110, 0.0110, 0.38, 28), mat.blånet, 0.300, -0.0256, 0));
  våben.add(del(side([[0.462, 0.006, 0.002], [0.478, 0.006, 0.002], [0.478, -0.034, 0.004], [0.462, -0.034, 0.004]], 0.02, { fas: 0.002 }), mat.blånet));
  våben.add(del(drejet([[0.488, 0.0118], [0.503, 0.0118], [0.506, 0.009], [0.507, 0.0001]], 28), mat.knurl, 0, -0.0256, 0));
  // Pumpen (forskæftet) af valnød med riller på langs — glider 8 cm tilbage
  const rilleSnit = [];
  for (let i = 0; i < 72; i++) {
    const v = i / 72 * Math.PI * 2, rx = 0.0215, ry = 0.0195;
    let rr = 1; for (let k = 0; k < 9; k++) { const d = Math.abs(((v - (k + 0.5) / 9 * Math.PI * 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < 0.1) rr = Math.min(rr, 1 - 0.07 * Math.sqrt(1 - (d / 0.1) ** 2)); }
    rilleSnit.push([Math.cos(v) * rx * rr, -0.0265 + Math.sin(v) * ry * rr]);
  }
  const pumpe = led(0, 0, 0,
    del(langs(rilleSnit, 0.205, 0.390, { fas: 0.004, uv: 7 }), mat.valnød),
    del(new THREE.BoxGeometry(0.11, 0.003, 0.002), mat.blank, 0.155, -0.017, 0.0122),
    del(new THREE.BoxGeometry(0.11, 0.003, 0.002), mat.blank, 0.155, -0.017, -0.0122));
  våben.add(pumpe);
  // Aftrækkergruppe, sikring og stifter
  våben.add(del(side([[0.020, -0.027], [0.018, -0.046, 0.008], [-0.030, -0.048, 0.008], [-0.045, -0.036, 0.004], [-0.046, -0.027]], 0.012,
    { fas: 0.0018, huller: [[[0.013, -0.030, 0.002], [0.012, -0.042, 0.006], [-0.022, -0.0435, 0.006], [-0.034, -0.033, 0.003], [-0.033, -0.030]]] }), mat.mørkStål));
  const aftrækker = led(0.002, -0.029, 0, del(side([[0.002, 0], [0.003, -0.008, 0.004], [-0.001, -0.0145, 0.002], [-0.0035, -0.0145], [-0.0015, -0.008, 0.004], [-0.002, 0]], 0.006, { fas: 0.001 }), mat.blank));
  våben.add(aftrækker);
  våben.add(stifter(0.0019, mat.blank, -0.030, -0.020, 0.0153), stifter(0.0019, mat.blank, 0.050, -0.020, 0.0153));
  // Kolben af valnød med riflet hals og rekylpude af gummi
  const kolbePkt = [[-0.084, 0.014, 0.002], [-0.160, 0.008, 0.02], [-0.395, -0.004, 0.02], [-0.430, -0.020, 0.006], [-0.428, -0.152, 0.006], [-0.400, -0.150, 0.03],
    [-0.250, -0.090, 0.05], [-0.170, -0.062, 0.03], [-0.125, -0.052, 0.02], [-0.095, -0.036, 0.008], [-0.084, -0.028]];
  våben.add(del(side(kolbePkt, 0.041, { fas: 0.0095, uv: 6 }), mat.valnød));
  våben.add(del(side([[-0.098, 0.006, 0.01], [-0.150, 0.000, 0.01], [-0.150, -0.050, 0.02], [-0.110, -0.040, 0.01]], 0.0415, { fas: 0.008, uv: 12 }), mat.valnødRiflet));
  våben.add(del(side([[-0.430, -0.019, 0.004], [-0.452, -0.022, 0.006], [-0.450, -0.156, 0.006], [-0.428, -0.153, 0.004]], 0.043, { fas: 0.008 }), mat.gummi));
  for (let i = 0; i < 5; i++) våben.add(del(new THREE.BoxGeometry(0.0015, 0.0008, 0.044), mat.hul, -0.4405 + 0.0004 * i, -0.04 - i * 0.022, 0));

  // En patron i porten (ses, når bundstykket er tilbage)
  const iPort = patron("hagl", false, mat); iPort.position.set(0.012, -0.002, -0.001); iPort.scale.setScalar(0.98); iPort.visible = false;
  våben.add(iPort);

  return {
    gruppe: våben, munding: mærke(0.565, 0, 0), udkast: mærke(0.045, 0.004, -0.012),
    pose(st) {
      const t = st.sidenSkud;
      // Pumpen: tilbage efter skuddet (0,18-0,30 s) og frem igen (0,32-0,44 s)
      let p = st.harPumpet ? 0 : frem(t, 0.18, 0.29, 0.33, 0.44);
      let ladRul = 0, ladLøft = 0;
      if (st.lader) {
        const lt = st.ladT, n = st.ladAntal, slut = 0.35 + n * 0.3;
        ladRul = frem(lt, 0, 0.3, slut, slut + 0.3) * 0.7;
        iPort.visible = lt > 0.3 && lt < slut && ((lt - 0.35) % 0.3) < 0.18;
        iPort.position.set(0.02 - ((lt - 0.35) % 0.3) / 0.18 * 0.0, -0.045 + Math.min(1, ((lt - 0.35) % 0.3) / 0.18) * 0.03, 0);
        if (st.tom) p = Math.max(p, frem(lt, slut + 0.3, slut + 0.42, slut + 0.47, slut + 0.6));
      } else iPort.visible = false;
      pumpe.position.x = -0.08 * p; bolt.position.x = -0.068 * p;
      aftrækker.rotation.z = t < 0.07 ? -0.25 : 0;
      return { rul: ladRul, løft: ladLøft };
    },
  };
}

// =====================================================================
// STORMGEVÆR — AR-type i 5,56 mm med rødpunktsigte og 30 skuds magasin
// =====================================================================
function lavStormgevær() {
  const våben = new THREE.Group();
  const B = 0.0111, T = 0.027, U = -0.006;
  const øvre = [[-B, U], [B, U], [B, T - 0.004, 0.001], [B - 0.003, T, 0.001], [-B + 0.003, T, 0.001], [-B, T - 0.004, 0.001]];
  const øvrePort = [[-B, U], [B, U], [B, 0.0005], [0.0035, 0.0005], [0.0035, 0.0165], [B, 0.0165], [B, T - 0.004, 0.001], [B - 0.003, T, 0.001], [-B + 0.003, T, 0.001], [-B, T - 0.004, 0.001]];
  const mørk = new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.85 });
  // Øvre mekanismehus med udkastport, knap til at skubbe bundstykket i og skinne ovenpå
  våben.add(del(langs(øvre, -0.100, -0.042, { uv: 14 }), mat.aluminium), del(langs(øvrePort, -0.042, 0.010, { uv: 14 }), mat.aluminium), del(langs(øvre, 0.010, 0.075, { uv: 14 }), mat.aluminium));
  const bolt = led(0, 0, 0, del(kasse(-0.043, 0.001, 0.009, 0.0158, 0.0072, 0.0015, 0.0006), mat.mørkStål, 0, 0, -0.0072));
  bolt.add(del(new THREE.CylinderGeometry(0.0022, 0.0022, 0.004, 12).rotateX(Math.PI / 2), mat.blank, 0.002, 0.0085, -0.0108));
  våben.add(bolt, del(new THREE.BoxGeometry(0.056, 0.015, 0.006), mørk, -0.016, 0.008, -0.0005));
  våben.add(del(kasse(-0.040, -0.0045, 0.008, -0.0012, 0.0016, 0.0004, 0.0003), mat.aluminium, 0, -0.006, -B - 0.004));   // støvdækslet (åbent)
  const assist = new THREE.Group(); assist.position.set(-0.060, 0.012, -B);
  assist.add(del(new THREE.CylinderGeometry(0.0055, 0.0055, 0.016, 18).rotateX(Math.PI / 2), mat.aluminium, 0, 0, -0.006));
  assist.add(del(new THREE.CylinderGeometry(0.0058, 0.0058, 0.006, 18).rotateX(Math.PI / 2), mat.knurl, 0, 0, -0.0145));
  assist.rotation.y = -0.6; våben.add(assist);
  våben.add(del(kasse(-0.050, 0.010, -0.040, 0.022, 0.006, 0.002), mat.aluminium, 0, 0, -B - 0.002));   // hylsterafviser
  // Picatinny-skinne hele vejen (hus + forskæfte) med tænder for hver 10 mm
  const skinne = [[-0.0105, 0], [0.0105, 0], [0.0105, 0.0012], [0.0078, 0.0028], [0.0105, 0.0044], [-0.0105, 0.0044], [-0.0078, 0.0028], [-0.0105, 0.0012]];
  const skinneMesh = del(langs(skinne, -0.098, 0.328), mat.aluminium); skinneMesh.position.y = T; våben.add(skinneMesh);
  våben.add(række(new THREE.BoxGeometry(0.0048, 0.0032, 0.021), mat.aluminium, 42, { x: -0.093, y: T + 0.006, z: 0 }, { x: 0.01, y: 0, z: 0 }));
  // Ladehåndtaget (T-formet) bagerst — trækkes tilbage ved ladning
  const ladegreb = led(0, 0, 0,
    del(kasse(-0.112, 0.019, -0.096, 0.025, 0.012, 0.001), mat.aluminium),
    del(kasse(-0.114, 0.0185, -0.104, 0.0255, 0.036, 0.002), mat.aluminium));
  våben.add(ladegreb);
  // Nedre mekanismehus med magasinbrønd, stifter og magasinudløser
  våben.add(del(side([[-0.100, -0.006], [0.060, -0.006], [0.062, -0.012, 0.002], [0.056, -0.016], [0.0555, -0.053, 0.003], [-0.0115, -0.053, 0.003], [-0.012, -0.024], [-0.058, -0.024, 0.003],
    [-0.072, -0.022], [-0.090, -0.020, 0.004], [-0.101, -0.012, 0.003]], 0.024, { fas: 0.0016, uv: 14 }), mat.aluminium));
  våben.add(stifter(0.0022, mat.mørkStål, 0.050, -0.010, 0.0122), stifter(0.0022, mat.mørkStål, -0.082, -0.010, 0.0122));
  våben.add(stifter(0.0016, mat.mørkStål, -0.030, -0.017, 0.0122), stifter(0.0016, mat.mørkStål, -0.045, -0.017, 0.0122));
  våben.add(del(new THREE.CylinderGeometry(0.0042, 0.0042, 0.006, 16).rotateX(Math.PI / 2), mat.aluminium, -0.006, -0.020, -0.013));
  våben.add(del(side([[-0.013, -0.024], [-0.0135, -0.044, 0.004], [-0.058, -0.044, 0.004], [-0.060, -0.024]], 0.0105, { fas: 0.0012, huller: [[[-0.017, -0.0255], [-0.0175, -0.0405, 0.003], [-0.055, -0.0405, 0.003], [-0.0565, -0.0255]]] }), mat.aluminium));
  const aftrækker = led(-0.030, -0.024, 0, del(side([[0.002, 0], [0.003, -0.008, 0.004], [-0.001, -0.0135, 0.002], [-0.0035, -0.0135], [-0.0015, -0.008, 0.004], [-0.002, 0]], 0.0055, { fas: 0.001 }), mat.blank));
  våben.add(aftrækker);
  // Pistolgreb (hældende, med prikker)
  våben.add(del(side([[-0.058, -0.020], [-0.061, -0.040, 0.004], [-0.068, -0.062, 0.006], [-0.070, -0.075, 0.004], [-0.083, -0.108, 0.004], [-0.104, -0.106, 0.006], [-0.094, -0.060, 0.012], [-0.086, -0.024, 0.004], [-0.080, -0.018]], 0.031, { fas: 0.006, uv: 30 }), mat.polymerGreb));
  // Bufferrør og den skydelige kolbe
  våben.add(del(rør(0.0145, 0.0145, 0.19, 28), mat.aluminium, -0.195, 0.009, 0));
  våben.add(del(drejet([[-0.106, 0.0175], [-0.099, 0.0175]], 28), mat.knurl, 0, 0.009, 0));
  våben.add(del(side([[-0.205, 0.027, 0.004], [-0.332, 0.029, 0.004], [-0.338, 0.026, 0.002], [-0.341, -0.094, 0.006], [-0.326, -0.101, 0.006], [-0.300, -0.090, 0.01], [-0.230, -0.012, 0.012], [-0.205, -0.007, 0.004]], 0.040,
    { fas: 0.0065, huller: [[[-0.300, -0.062, 0.006], [-0.252, -0.012, 0.004], [-0.318, -0.012, 0.004], [-0.322, -0.062, 0.004]]] }), mat.polymer));
  våben.add(del(side([[-0.338, 0.027, 0.003], [-0.347, 0.027, 0.003], [-0.349, -0.097, 0.004], [-0.341, -0.100, 0.003]], 0.042, { fas: 0.005 }), mat.gummi));
  // Forskæftet (M-LOK) med huller i siderne
  const forSnit = [[-0.0200, -0.010], [-0.0130, -0.0205], [0.0130, -0.0205], [0.0200, -0.010], [0.0200, 0.0160], [0.0140, 0.0262], [-0.0140, 0.0262], [-0.0200, 0.0160]];
  våben.add(del(langs(forSnit, 0.076, 0.330, { uv: 14 }), mat.aluminium));
  const slids = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.0068, 0.0006), mørk);
  for (let i = 0; i < 5; i++) for (const zs of [-1, 1]) { const s = slids.clone(); s.position.set(0.105 + i * 0.045, 0.003, zs * 0.02035); våben.add(s); }
  for (let i = 0; i < 5; i++) for (const zs of [-1, 1]) {
    const s = slids.clone(); s.scale.set(1, 0.8, 1); s.position.set(0.105 + i * 0.045, -0.0152, zs * 0.01665); s.rotation.x = zs * 0.96; våben.add(s);
  }
  // Løb, flammedæmper med slidser og det mørke hul
  våben.add(del(rør(0.0092, 0.0092, 0.045, 24), mat.mørkStål, 0.352, 0, 0));
  våben.add(del(drejet([[0.372, 0.0105], [0.374, 0.0112], [0.414, 0.0112], [0.416, 0.0104], [0.416, 0.0062]], 28), mat.mørkStål), skive(0.0062, mat.hul, 0.4158, 0, 0));
  for (let k = 0; k < 5; k++) {
    const v = k / 5 * Math.PI * 2 + Math.PI / 2, s = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0026, 0.004), mørk);
    s.position.set(0.400, Math.cos(v) * 0.0105, Math.sin(v) * 0.0105); s.rotation.x = -v; våben.add(s);
  }
  // Foldede reservesigter
  våben.add(del(kasse(0.300, T + 0.0044, 0.322, T + 0.012, 0.016, 0.002), mat.polymer));
  våben.add(del(kasse(-0.090, T + 0.0044, -0.068, T + 0.012, 0.018, 0.002), mat.polymer));
  // Rødpunktsigte: rør på et beslag med linser og et lysende rødt punkt
  const RS = T + 0.0044;
  våben.add(del(kasse(-0.002, RS, 0.044, RS + 0.016, 0.022, 0.002), mat.aluminium));
  våben.add(del(drejet([[-0.012, 0.0145], [-0.010, 0.0172], [0.006, 0.0172], [0.008, 0.0158], [0.044, 0.0158], [0.046, 0.0172], [0.060, 0.0172], [0.062, 0.0148]], 32), mat.aluminium, 0, RS + 0.034, 0));
  våben.add(del(new THREE.CylinderGeometry(0.0062, 0.0062, 0.010, 20).rotateX(Math.PI / 2), mat.knurl, 0.026, RS + 0.034, -0.018));
  våben.add(skive(0.0142, mat.linse, 0.0615, RS + 0.034, 0), skive(0.0142, mat.linse, -0.0115, RS + 0.034, 0, true));
  våben.add(skive(0.0011, mat.rødPunkt, -0.0119, RS + 0.034, 0, true));

  // Magasinet: krumt, 30 skud, i tan polymer med patroner foroven
  const magasin = led(0, 0, 0,
    del(side(magasinKurve(), 0.0225, { fas: 0.002, uv: 20 }), mat.tan),
    del(side([[0.020, -0.190, 0.003], [0.093, -0.181, 0.003], [0.095, -0.193, 0.003], [0.022, -0.202, 0.003]], 0.026, { fas: 0.002 }), mat.tan));
  for (let i = 0; i < 4; i++) magasin.add(del(new THREE.BoxGeometry(0.06, 0.0025, 0.0232), mat.tan, 0.054 + i * 0.0045, -0.150 - i * 0.008, 0).rotateZ(0.13));
  for (let i = 0; i < 2; i++) { const p = patron("556", true, mat); p.position.set(-0.004, -0.0105 - i * 0.004, (i ? -1 : 1) * 0.0035); magasin.add(p); }
  våben.add(magasin);

  return {
    gruppe: våben, munding: mærke(0.42, 0, 0), udkast: mærke(-0.018, 0.008, -0.010), magasinDel: magasin,
    pose(st) {
      const t = st.sidenSkud;
      let b = t < 0.022 ? t / 0.022 : 1 - blød(fase(t, 0.022, 0.06));
      if (st.tom && !st.lader && t > 0.022) b = 1;
      let lg = 0, m = 0, ladRul = 0, ladLøft = 0;
      if (st.lader) {
        const lt = st.ladT;
        m = lt < 0.6 ? blød(fase(lt, 0.15, 0.45)) * 1.5 : 1.5 * (1 - blød(fase(lt, 0.65, 1.0)));
        lg = st.tom ? frem(lt, 1.25, 1.42, 1.48, 1.55) : 0;
        b = st.tom ? Math.max(lg, lt < 1.48 ? 1 : 0) : 0;
        ladRul = frem(lt, 0, 0.2, 1.6, 1.9) * 0.45; ladLøft = frem(lt, 0, 0.2, 1.6, 1.9) * 0.12;
      }
      bolt.position.x = -0.034 * b;
      ladegreb.position.x = -0.065 * lg;
      magasin.position.set(0.12 * m * 0.12, -m * 0.12, 0);
      aftrækker.rotation.z = st.holder ? -0.22 : 0;
      return { rul: ladRul, løft: ladLøft };
    },
  };
}

// =====================================================================
// SNIGSKYTTEGEVÆR — repetergevær i .308 med kikkert og tobensstøtte (5 skud)
// =====================================================================
function lavSnig() {
  const våben = new THREE.Group();
  const mørk = new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.85 });
  // Mekanismen (rund) med udkastport til højre
  const R = 0.0170, cirkel = (r, fra = 0, til = Math.PI * 2, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const v = fra + (til - fra) * i / n; return [Math.cos(v) * r, Math.sin(v) * r]; });
  const portSnit = [...cirkel(R, Math.PI * 0.55, Math.PI * 2.05, 40), [0.008, -0.0032], [0.008, 0.0145]];
  våben.add(del(langs(cirkel(R).slice(0, -1), -0.110, -0.030, { uv: 14 }), mat.mørkStål), del(langs(portSnit, -0.030, 0.048, { uv: 14 }), mat.mørkStål), del(langs(cirkel(R).slice(0, -1), 0.048, 0.106, { uv: 14 }), mat.mørkStål));
  våben.add(del(new THREE.BoxGeometry(0.078, 0.02, 0.012), mørk, 0.009, 0.002, 0.004));
  // Skinne til kikkerten
  const sk = del(langs([[-0.0095, 0], [0.0095, 0], [0.0095, 0.004], [0.0075, 0.0055], [-0.0075, 0.0055], [-0.0095, 0.004]], -0.105, 0.100), mat.mørkStål); sk.position.y = R - 0.0015; våben.add(sk);
  // Bundstykket med håndtag og knop — løftes, trækkes tilbage, skubbes frem og trykkes ned
  const bundstykke = led(0, 0, 0);
  const krop = del(rør(0.0092, 0.0092, 0.150, 24), mat.blank, -0.035, 0, 0);
  const håndtag = led(-0.088, 0, 0);
  const arm = new THREE.CylinderGeometry(0.0034, 0.0042, 0.050, 14); arm.translate(0, -0.025, 0);
  const armM = del(arm, mat.blank); armM.rotation.x = -1.22; håndtag.add(armM);
  const knop = del(new THREE.SphereGeometry(0.0105, 24, 16), mat.mørkStål); knop.scale.set(1.15, 1, 1); knop.position.set(0, -0.016, -0.050); håndtag.add(knop);
  const kappe = del(drejet([[-0.150, 0.004], [-0.147, 0.0118], [-0.126, 0.0128], [-0.112, 0.0128]], 24), mat.mørkStål);
  bundstykke.add(krop, håndtag, kappe);
  våben.add(bundstykke);
  // Svært riflet løb med mundingsbremse
  våben.add(del(rør(0.0148, 0.0130, 0.075, 32), mat.mørkStål, 0.143, 0, 0));
  våben.add(del(langs(rilleCirkel(0.0128, 6, 0.0024, 0.2, 0), 0.180, 0.560, { uv: 6 }), mat.mørkStål));
  våben.add(del(rør(0.0122, 0.0112, 0.082, 28), mat.mørkStål, 0.600, 0, 0));
  const bremseSnit = [[-0.012, -0.0115, 0.003], [0.012, -0.0115, 0.003], [0.012, 0.0115, 0.003], [-0.012, 0.0115, 0.003]];
  våben.add(del(langs(bremseSnit, 0.640, 0.705, { fas: 0.0015 }), mat.mørkStål), skive(0.0045, mat.hul, 0.7053, 0, 0));
  for (let i = 0; i < 3; i++) for (const zs of [-1, 1]) våben.add(del(new THREE.BoxGeometry(0.010, 0.016, 0.0006), mørk, 0.656 + i * 0.016, 0, zs * 0.01205));
  // Skæfte i olivengrøn komposit: forskæfte, magasinbrønd, lodret greb og kolbe med kindstøtte
  våben.add(del(side([[0.330, -0.014, 0.008], [0.332, -0.050, 0.012], [0.090, -0.054, 0.006], [0.052, -0.060, 0.004], [-0.022, -0.060, 0.004], [-0.048, -0.062, 0.01], [-0.060, -0.128, 0.008],
    [-0.098, -0.133, 0.008], [-0.092, -0.080, 0.014], [-0.132, -0.064, 0.02], [-0.300, -0.088, 0.03], [-0.418, -0.122, 0.006], [-0.432, -0.118, 0.004], [-0.432, -0.004, 0.006],
    [-0.395, 0.000, 0.01], [-0.170, -0.006, 0.02], [-0.118, -0.014, 0.01], [-0.110, -0.016]], 0.048, { fas: 0.008, uv: 12 }), mat.oliven));
  våben.add(del(side([[-0.335, 0.000, 0.004], [-0.190, 0.000, 0.004], [-0.200, 0.020, 0.008], [-0.330, 0.022, 0.008]], 0.040, { fas: 0.007 }), mat.oliven));
  for (const x of [-0.300, -0.225]) våben.add(del(rør(0.0035, 0.0035, 0.008), mat.blank, x, -0.002, 0).rotateZ(Math.PI / 2));
  våben.add(del(side([[-0.432, -0.002, 0.004], [-0.452, -0.002, 0.006], [-0.452, -0.120, 0.006], [-0.432, -0.120, 0.004]], 0.05, { fas: 0.008 }), mat.gummi));
  // Aftrækkerbøjle, aftrækker og magasin
  våben.add(del(side([[0.000, -0.058], [-0.002, -0.080, 0.008], [-0.040, -0.082, 0.008], [-0.048, -0.064, 0.004], [-0.046, -0.058]], 0.011,
    { fas: 0.0016, huller: [[[-0.005, -0.061], [-0.007, -0.076, 0.006], [-0.036, -0.077, 0.006], [-0.042, -0.064, 0.003], [-0.041, -0.061]]] }), mat.polymer));
  const aftrækker = led(-0.020, -0.059, 0, del(side([[0.002, 0], [0.003, -0.008, 0.004], [-0.001, -0.0135, 0.002], [-0.0035, -0.0135], [-0.0015, -0.008, 0.004], [-0.002, 0]], 0.0058, { fas: 0.001 }), mat.blank));
  våben.add(aftrækker);
  const magasin = led(0, 0, 0, del(kasse(0.004, -0.086, 0.050, -0.040, 0.026, 0.002, 0.0015), mat.mørkStål), del(kasse(0.002, -0.090, 0.052, -0.084, 0.030, 0.002, 0.0015), mat.polymer));
  const mp = patron("308", true, mat); mp.position.set(-0.002, -0.042, 0); mp.scale.setScalar(0.95); magasin.add(mp);
  våben.add(magasin);
  // Tobensstøtte, foldet frem under forskæftet
  våben.add(del(kasse(0.292, -0.062, 0.322, -0.049, 0.03, 0.003), mat.mørkStål));
  for (const zs of [-1, 1]) {
    våben.add(del(rør(0.0048, 0.0042, 0.17), mat.mørkStål, 0.40, -0.066, zs * 0.011));
    våben.add(del(new THREE.SphereGeometry(0.0062, 14, 10), mat.gummi, 0.488, -0.066, zs * 0.011));
  }
  // Kikkerten: okular, rør med drejeknapper, objektiv og ringe
  const K = 0.064;
  const kik = led(0, K, 0,
    del(drejet([[-0.168, 0.0185], [-0.166, 0.0212], [-0.140, 0.0212], [-0.120, 0.0178], [-0.104, 0.0152], [0.160, 0.0152], [0.168, 0.0175], [0.205, 0.0262], [0.250, 0.0272], [0.256, 0.0262]], 40), mat.mørkStål),
    del(drejet([[-0.104, 0.0172], [-0.092, 0.0172]], 32), mat.knurl),
    del(drejet([[0.010, 0.0172], [0.010, 0.0196], [0.068, 0.0196], [0.068, 0.0172]], 32), mat.mørkStål),
    skive(0.0172, mat.linse, -0.1675, 0, 0, true), skive(0.0252, mat.linse, 0.2555, 0, 0),
  );
  const tårn = new THREE.CylinderGeometry(0.0118, 0.0118, 0.018, 28);
  kik.add(del(tårn, mat.knurl, 0.039, 0.028, 0));
  const sideTårn = del(tårn, mat.knurl, 0.039, 0, -0.027); sideTårn.rotation.x = Math.PI / 2; kik.add(sideTårn);
  const venstreTårn = del(new THREE.CylinderGeometry(0.0105, 0.0105, 0.012, 24), mat.knurl, 0.039, 0, 0.024); venstreTårn.rotation.x = Math.PI / 2; kik.add(venstreTårn);
  for (let i = 0; i < 12; i++) { const v = i / 12 * Math.PI * 2; const s = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.0016, 0.004), mat.hvidMaling); s.position.set(0.039 + Math.cos(v) * 0.0119, Math.sin(v) * 0.0119, -0.035); s.rotation.z = v; kik.add(s); }
  våben.add(kik);
  for (const x of [-0.064, 0.090]) {
    våben.add(del(drejet([[x - 0.009, 0.0178], [x + 0.009, 0.0178]], 32), mat.mørkStål, 0, K, 0));
    våben.add(del(kasse(x - 0.009, R + 0.003, x + 0.009, K - 0.014, 0.024, 0.002), mat.mørkStål));
  }

  return {
    gruppe: våben, munding: mærke(0.71, 0, 0), udkast: mærke(0.010, 0.006, -0.012), magasinDel: magasin,
    pose(st) {
      const t = st.sidenSkud;
      // Repetering efter skuddet: løft, tilbage, frem og ned (starter 0,4 s efter skuddet)
      const c = st.harRepeteret ? -1 : t - 0.4;
      let løft = 0, tilbage = 0, ladRul = 0;
      if (c >= 0) { løft = frem(c, 0, 0.08, 0.36, 0.44); tilbage = frem(c, 0.09, 0.2, 0.24, 0.35); }
      let m = 0;
      if (st.lader) {
        const lt = st.ladT;
        m = lt < 0.6 ? blød(fase(lt, 0.15, 0.45)) * 1.4 : 1.4 * (1 - blød(fase(lt, 0.65, 1.0)));
        ladRul = frem(lt, 0, 0.2, 1.6, 1.9) * 0.4;
        if (st.tom) { løft = Math.max(løft, frem(lt, 1.05, 1.13, 1.41, 1.49)); tilbage = Math.max(tilbage, frem(lt, 1.14, 1.25, 1.29, 1.4)); }
      }
      håndtag.rotation.x = løft * 1.3;
      bundstykke.position.x = -0.095 * tilbage;
      magasin.position.y = -m * 0.08;
      aftrækker.rotation.z = t < 0.08 ? -0.25 : 0;
      return { rul: ladRul, løft: 0 };
    },
  };
}

// ---------- Våbenlisten ----------
// plads = hvor våbnet holdes foran kameraet (x, y, z i kameraets rum). Løbet peger altid præcis mod målet;
// kant = hvor meget våbnet vippes om løbets akse (så siden ses) · vedØjet = hvor geværet sidder, når man
// kigger gennem kikkerten (okularet lige foran kameraet) · ikonVip = hvor skråt det står på knappen ·
// rekyl = hvor meget det sparker
export const VÅBEN = [
  {
    id: "pistol", navn: "Pistol", lav: lavPistol, patron: "9mm", magasin: 17, kadence: 0.1, auto: false,
    plads: [-0.1, -0.08, -0.3], kant: 0.2, skala: 1, rekyl: { løft: 0.22, tilbage: 0.03, rul: 0.04 }, lyd: "pistol", ladTid: 1.35,
    hændelser: [[0.12, "magUd"], [0.42, "magFald"], [0.9, "magInd"], [1.15, "slædeFrem"]],
  },
  {
    id: "revolver", navn: "Revolver", lav: lavRevolver, patron: "357", magasin: 6, kadence: 0.3, auto: false,
    plads: [-0.1, -0.085, -0.34], kant: 0.2, skala: 1, rekyl: { løft: 0.5, tilbage: 0.035, rul: 0.06 }, lyd: "revolver", ladTid: 1.9,
    hændelser: [[0.24, "tromleUd"], [0.55, "hylstreUd"], [0.95, "patronerInd"], [1.42, "tromleInd"]],
  },
  {
    id: "hagl", navn: "Haglgevær", lav: lavHagl, patron: "hagl", magasin: 6, kadence: 0.62, auto: false, hagl: 9, spredning: 0.045,
    plads: [-0.12, -0.1, -0.33], kant: 0.3, ikonVip: 0.3, skala: 1, rekyl: { løft: 0.42, tilbage: 0.07, rul: 0.05 }, lyd: "hagl", ladTid: null,
    hændelser: [],
  },
  {
    id: "stormgevær", navn: "Stormgevær", lav: lavStormgevær, patron: "556", magasin: 30, kadence: 0.075, auto: true, spredning: 0.006,
    plads: [-0.12, -0.098, -0.33], kant: 0.28, ikonVip: 0.26, skala: 1, rekyl: { løft: 0.07, tilbage: 0.018, rul: 0.012 }, lyd: "stormgevær", ladTid: 1.9,
    hændelser: [[0.15, "magUd"], [0.45, "magFald"], [0.98, "magInd"], [1.3, "ladegreb"], [1.5, "ladegrebSlip"]],
  },
  {
    id: "snig", navn: "Snigskyttegevær", lav: lavSnig, patron: "308", magasin: 5, kadence: 1.25, auto: false, kikkert: true,
    plads: [-0.115, -0.105, -0.38], kant: 0.24, ikonVip: 0.3, vedØjet: [0, -0.064, -0.25], skala: 1, rekyl: { løft: 0.3, tilbage: 0.06, rul: 0.03 }, lyd: "snig", ladTid: 1.9,
    hændelser: [[0.15, "magUd"], [0.45, "magFald"], [0.98, "magInd"], [1.08, "boltOp"], [1.2, "boltTilbage"], [1.33, "boltFrem"], [1.45, "boltNed"]],
  },
];
