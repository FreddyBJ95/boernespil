import * as THREE from "../3d-faelles/three.module.js";

const NAVNE = Object.freeze({ krystal: "fundkrystal", kobber: "fundkobber", eliksir: "fundeliksir", segl: "fundsegl" });
const MAX_FUND = 8, MAX_GENSTANDE = 4, ÅBNET = 1.15;
const begræns = (n, a, b) => Math.max(a, Math.min(b, n));
const blød = (n) => {
  n = begræns(n, 0, 1);
  return n * n * (3 - 2 * n);
};

// Én genstand pr. slags viser det faktiske fund; kortets antal fortæller resten uden hundredvis af mønter.
function genstande(fund) {
  const liste = fund.type === "kiste" ? [] : [{ type: fund.type, antal: 1 }];
  for (const g of Array.isArray(fund.genstande) ? fund.genstande : []) {
    if (!g || !Object.prototype.hasOwnProperty.call(NAVNE, g.type) || !Number.isFinite(g.antal) || g.antal <= 0) {
      continue;
    }
    if (!liste.some((s) => s.type === g.type)) liste.push({ type: g.type, antal: g.antal });
    if (liste.length >= MAX_GENSTANDE) break;
  }
  return liste;
}

// Manageren ejer effekterne og den tagne kiste. Blenderbibliotekets masker og materialer forbliver delte.
export function opretFundfigur(scene, modeller) {
  for (const navn of [...Object.values(NAVNE), "skattekiste"]) {
    if (!modeller[navn]?.isObject3D) throw new Error("Fundfiguren mangler Blender-modellen " + navn);
  }
  if (!modeller.skattekiste.getObjectByName("kistelåg")) throw new Error("Skattekisten mangler sit låghængsel");
  const fund = [], ejedeKister = new Map();
  let næsteId = 1;

  function egneMaterialer(effekt, obj) {
    obj.traverse((del) => {
      if (!del.isMesh) return;
      const oprindelig = del.material;
      const kopier = (Array.isArray(oprindelig) ? oprindelig : [oprindelig]).map((mat) => {
        if (!effekt.materialer.has(mat)) {
          const kopi = mat.clone();
          kopi.transparent = true;
          effekt.materialer.set(mat, kopi);
        }
        return effekt.materialer.get(mat);
      });
      del.material = Array.isArray(oprindelig) ? kopier : kopier[0];
      effekt.udskiftninger.push({ del, oprindelig });
    });
  }

  function glimt(effekt) {
    const antal = 10, data = new Float32Array(antal * 3), geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data, 3));
    const mat = new THREE.PointsMaterial({
      color: effekt.type === "segl" ? 0xffd998 : 0xb2f8e4,
      size: .07,
      transparent: true,
      opacity: .78,
      depthWrite: false,
    });
    const obj = new THREE.Points(geo, mat);
    obj.name = "fundGlimt";
    obj.frustumCulled = false;
    effekt.rod.add(obj);
    effekt.glimt = { obj, geo, mat, data };
  }

  function fjern(effekt) {
    if (effekt.kiste) {
      effekt.kiste.removeFromParent();
      ejedeKister.delete(effekt.kiste);
    }
    effekt.rod.removeFromParent();
    for (const { del, oprindelig } of effekt.udskiftninger) del.material = oprindelig;
    for (const mat of effekt.materialer.values()) mat.dispose();
    if (effekt.glimt) {
      effekt.glimt.geo.dispose();
      effekt.glimt.mat.dispose();
    }
  }

  function positur(effekt, rolig) {
    const t = effekt.tid;
    if (effekt.låg) effekt.låg.rotation.x = ÅBNET * blød(t / .6);
    const svind = 1 - blød((t - (effekt.varighed - .75)) / .75);
    for (const [kilde, mat] of effekt.materialer) {
      mat.opacity = kilde.opacity * svind;
      mat.depthWrite = kilde.depthWrite && svind > .98;
    }
    for (const del of effekt.genstande) {
      const alder = t - del.forsinkelse;
      del.obj.visible = alder >= 0;
      if (alder < 0) continue;
      const løft = blød(alder / .85), hop = Math.sin(begræns(alder / .85, 0, 1) * Math.PI) * .2;
      del.obj.position.copy(del.fra).addScaledVector(del.retning, løft);
      del.obj.position.y += løft * (effekt.type === "kiste" ? 1.2 : 1.45) + hop;
      del.obj.scale.setScalar(del.skala * (.23 + .77 * blød(alder / .33)));
      if (!rolig) del.obj.rotation.y = del.vinkel;
    }
    if (effekt.glimt) {
      const g = effekt.glimt;
      g.obj.visible = !rolig && t > effekt.glimtStart && t < effekt.glimtStart + 1.1;
      const a = begræns((t - effekt.glimtStart) / 1.1, 0, 1);
      g.mat.opacity = .72 * Math.sin(a * Math.PI);
      if (g.obj.visible) {
        for (let i = 0; i < g.data.length / 3; i++) {
          const v = i * 2.399963 + effekt.id * .71;
          const radius = .23 + a * (.55 + i % 3 * .09);
          g.data[i * 3] = Math.cos(v) * radius;
          g.data[i * 3 + 1] = effektHøjde(effekt) + a * 1.2 + Math.sin(v * 2) * .15;
          g.data[i * 3 + 2] = Math.sin(v) * radius;
        }
      }
      g.geo.attributes.position.needsUpdate = g.obj.visible;
    }
  }
  function effektHøjde(effekt) {
    return effekt.kiste ? effekt.kiste.position.y + .9 : .6;
  }

  function vis(beskrivelse, { x = 0, z = 0, kiste = null, rolig = false } = {}) {
    if (!beskrivelse || !["krystal", "kiste", "segl"].includes(beskrivelse.type)) return false;
    if (kiste && (!kiste.isObject3D || !kiste.getObjectByName("kistelåg"))) return false;
    if (kiste && ejedeKister.has(kiste)) return false;
    while (fund.length >= MAX_FUND) fjern(fund.shift());
    const rod = new THREE.Group();
    rod.name = "fundForløb";
    rod.position.set(Number.isFinite(x) ? x : 0, 0, Number.isFinite(z) ? z : 0);
    rod.userData.fundtype = beskrivelse.type;
    scene.add(rod);
    const effekt = {
      rod,
      type: beskrivelse.type,
      id: næsteId++,
      tid: 0,
      varighed: beskrivelse.type === "kiste" ? 4.2 : beskrivelse.type === "segl" ? 3.4 : 3.1,
      materialer: new Map(),
      udskiftninger: [],
      genstande: [],
      glimt: null,
      glimtStart: beskrivelse.type === "kiste" ? .5 : .08,
      kiste: null,
      låg: null,
    };
    if (beskrivelse.type === "kiste") {
      effekt.kiste = kiste || modeller.skattekiste.clone(true);
      if (!kiste) effekt.kiste.position.copy(rod.position);
      // attach bevarer også rotation og skala, når kisten stod under områdets egen rod.
      scene.attach(effekt.kiste);
      effekt.låg = effekt.kiste.getObjectByName("kistelåg");
      if (effekt.låg) effekt.låg.rotation.x = 0;
      egneMaterialer(effekt, effekt.kiste);
      ejedeKister.set(effekt.kiste, effekt);
    }
    const liste = genstande(beskrivelse);
    for (let i = 0; i < liste.length; i++) {
      const g = liste[i], obj = modeller[NAVNE[g.type]].clone(true);
      obj.name = "fundGenstand_" + g.type;
      obj.userData.fundtype = g.type;
      obj.userData.antal = g.antal;
      rod.add(obj);
      egneMaterialer(effekt, obj);
      const side = (i - (liste.length - 1) / 2) * .49;
      const fra = new THREE.Vector3(side, .2, 0), retning = new THREE.Vector3(side * .25, 0, -.16);
      if (effekt.kiste) {
        effekt.kiste.updateWorldMatrix(true, false);
        rod.updateWorldMatrix(true, false);
        fra.copy(rod.worldToLocal(effekt.kiste.localToWorld(new THREE.Vector3(side, .68, -.08))));
        const frem = new THREE.Vector3(0, 0, -1).transformDirection(effekt.kiste.matrixWorld);
        retning.copy(frem).multiplyScalar(.25);
      }
      effekt.genstande.push({
        obj,
        fra,
        retning,
        skala: g.type === "kobber" ? 1.05 : .85,
        forsinkelse: effekt.kiste ? .38 + i * .075 : i * .06,
        vinkel: i * .18,
      });
    }
    if (!rolig) glimt(effekt);
    positur(effekt, rolig);
    fund.push(effekt);
    return true;
  }

  function opdatér(dt, { rolig = false } = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = fund.length - 1; i >= 0; i--) {
      const effekt = fund[i];
      effekt.tid += dt;
      if (effekt.tid >= effekt.varighed) {
        fjern(effekt);
        fund.splice(i, 1);
        continue;
      }
      if (!rolig) { for (const del of effekt.genstande) del.vinkel += dt * .48; }
      positur(effekt, rolig);
    }
  }
  function ryd() {
    for (const effekt of fund) fjern(effekt);
    fund.length = 0;
    ejedeKister.clear();
  }
  return { vis, opdatér, ryd };
}
