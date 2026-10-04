import * as THREE from "../3d-faelles/three.module.js";

const NED = new THREE.Vector3(0, -1, 0), OP = new THREE.Vector3(0, 1, 0);
const SLIP = { sværd: .35, bue: .55, magi: .4 };
const begræns = (n, a, b) => Math.max(a, Math.min(b, n));
const blød = (n) => {
  n = begræns(n, 0, 1);
  return n * n * (3 - 2 * n);
};
const vektor = (p) => new THREE.Vector3(...p);
const bland = (a, b, t) => vektor(a).lerp(vektor(b), blød(t));

// Hvert sværdslag har sit eget tilløb og tværsnit. Våbenet følger håndens bevægelse.
const SVÆRDSLAG = [
  [
    [0, [.39, .725, 0], [.1, .96, -.25]],
    [.2, [.58, 1.27, .08], [.45, .82, .28]],
    [.35, [.18, 1.15, -.46], [-.55, .18, -.82]],
    [.58, [.05, 1.02, -.36], [-.78, -.18, -.6]],
    [1, [.39, .725, 0], [.1, .96, -.25]],
  ],
  [
    [0, [.39, .725, 0], [.1, .96, -.25]],
    [.2, [.10, 1.28, -.25], [-.43, .86, .25]],
    [.35, [.64, 1.12, -.36], [.62, .16, -.78]],
    [.58, [.72, 1.0, -.12], [.75, -.2, -.63]],
    [1, [.39, .725, 0], [.1, .96, -.25]],
  ],
];

function sværdpunkt(p, slag) {
  const punkter = SVÆRDSLAG[slag === 2 ? 1 : 0];
  for (let i = 1; i < punkter.length; i++) {
    const a = punkter[i - 1], b = punkter[i];
    if (p <= b[0]) {
      const t = (p - a[0]) / (b[0] - a[0]);
      return { hånd: bland(a[1], b[1], t), retning: bland(a[2], b[2], t).normalize() };
    }
  }
  const sidste = punkter[punkter.length - 1];
  return { hånd: vektor(sidste[1]), retning: vektor(sidste[2]).normalize() };
}

// Den oprindelige arm deles i to genbrugte masker og drejer om den rigtige skulder.
function armled(helt, navn, side) {
  const arm = helt.getObjectByName(navn);
  if (!arm?.isMesh) throw new Error("Kampfiguren mangler " + navn);
  const før = {
    parent: arm.parent,
    position: arm.position.clone(),
    quaternion: arm.quaternion.clone(),
    scale: arm.scale.clone(),
  };
  const skulder = new THREE.Group(), albue = new THREE.Group(), hånd = new THREE.Group();
  skulder.name = side > 0 ? "kampSkulderHøjre" : "kampSkulderVenstre";
  albue.name = side > 0 ? "kampAlbueHøjre" : "kampAlbueVenstre";
  hånd.name = side > 0 ? "kampHåndHøjre" : "kampHåndVenstre";
  skulder.position.set(før.position.x, før.position.y + før.scale.y / 2, før.position.z);
  const underarm = arm.clone(false);
  underarm.name = side > 0 ? "kampUnderarmHøjre" : "kampUnderarmVenstre";
  skulder.add(arm, albue);
  albue.add(underarm, hånd);
  helt.add(skulder);
  const længde = før.scale.y / 2, start = skulder.position.clone();
  const pole = new THREE.Vector3(side * .85, -.25, .35);

  function sæt(mål, hånddrej = new THREE.Quaternion()) {
    const linje = mål.clone().sub(start), ønsket = linje.length();
    if (ønsket < .001) linje.copy(NED);
    else linje.divideScalar(ønsket);
    // En ganske lille strækning giver plads til buen uden løse hænder eller spring i leddene.
    const stræk = begræns(ønsket / (længde * 2 - .006), 1, 1.18);
    const l = længde * stræk, afstand = begræns(ønsket, .005, l * 2 - .001);
    const bøj = pole.clone().addScaledVector(linje, -pole.dot(linje));
    if (bøj.lengthSq() < .0001) bøj.set(0, 0, 1).addScaledVector(linje, -linje.z);
    bøj.normalize();
    const midte = start.clone().addScaledVector(linje, afstand / 2)
      .addScaledVector(bøj, Math.sqrt(Math.max(0, l * l - afstand * afstand / 4)));
    const slut = start.clone().addScaledVector(linje, afstand);
    const øvre = midte.clone().sub(start).normalize(), nedre = slut.clone().sub(midte).normalize();
    const øvreQ = new THREE.Quaternion().setFromUnitVectors(NED, øvre);
    const nedreQ = new THREE.Quaternion().setFromUnitVectors(NED, nedre);
    skulder.quaternion.copy(øvreQ);
    albue.position.set(0, -l, 0);
    albue.quaternion.copy(øvreQ).invert().multiply(nedreQ);
    hånd.position.set(0, -l, 0);
    hånd.quaternion.copy(nedreQ).invert().multiply(hånddrej);
    for (const del of [arm, underarm]) {
      del.position.set(0, -l / 2, 0);
      del.quaternion.identity();
      del.scale.copy(før.scale);
      del.scale.y = l;
    }
    return slut;
  }
  function ryd() {
    skulder.remove(arm);
    før.parent.add(arm);
    arm.position.copy(før.position);
    arm.quaternion.copy(før.quaternion);
    arm.scale.copy(før.scale);
    helt.remove(skulder);
  }
  return { skulder, albue, hånd, sæt, ryd };
}

// Våbenmaskerne deles med Blenderbiblioteket; kun den bevægelige streng ejes af riggen.
export function opretKampfigur(helt, modeller) {
  for (const navn of ["armHøjre", "armVenstre"]) {
    if (!helt.getObjectByName(navn)?.isMesh) throw new Error("Kampfiguren mangler " + navn);
  }
  for (const navn of ["kampsværd", "kampbue", "kampstav", "kamppil"]) {
    if (!modeller[navn]?.isObject3D) throw new Error("Kampfiguren mangler Blender-modellen " + navn);
  }
  const højre = armled(helt, "armHøjre", 1), venstre = armled(helt, "armVenstre", -1);
  const ben = ["benVenstre", "benHøjre"].map((navn) => {
    const obj = helt.getObjectByName(navn);
    return { obj, quaternion: obj?.quaternion.clone() };
  });
  // Originalens øjne og bælte er på +Z. For- og bagdetaljer spejles lokalt til spillets -Z.
  const forside = helt.children.filter((obj) => Math.abs(obj.position.z) > .001)
    .map((obj) => ({ obj, z: obj.position.z }));
  for (const { obj, z } of forside) obj.position.z = -z;
  const våben = {};
  for (const [type, navn] of [["sværd", "kampsværd"], ["bue", "kampbue"], ["magi", "kampstav"]]) {
    if (!modeller[navn]) throw new Error("Kampfiguren mangler Blender-våbenet " + navn);
    const obj = modeller[navn].clone(true);
    obj.position.set(0, 0, 0);
    obj.quaternion.identity();
    obj.scale.setScalar(1);
    obj.userData.våben = true;
    (type === "bue" ? venstre : højre).hånd.add(obj);
    våben[type] = obj;
  }
  if (!modeller.kamppil) throw new Error("Kampfiguren mangler Blender-pilen kamppil");
  const pil = modeller.kamppil.clone(true);
  pil.name = "kampNokketPil";
  pil.scale.setScalar(1);
  pil.quaternion.identity();
  våben.bue.add(pil);
  const strengGeo = new THREE.BufferGeometry();
  strengGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  const strengMat = new THREE.LineBasicMaterial({ color: 0xe6f6e9, transparent: true, opacity: .95 });
  const streng = new THREE.LineSegments(strengGeo, strengMat);
  streng.name = "kampBuestreng";
  streng.frustumCulled = false;
  våben.bue.add(streng);
  let valgt = "sværd", fjernet = false;

  function sætStreng(nok) {
    const p = strengGeo.attributes.position;
    p.setXYZ(0, 0, .68, .13);
    p.setXYZ(1, nok.x, nok.y, nok.z);
    p.setXYZ(2, nok.x, nok.y, nok.z);
    p.setXYZ(3, 0, -.68, .13);
    p.needsUpdate = true;
    pil.position.copy(nok);
  }
  function skiftVåben(type) {
    valgt = Object.prototype.hasOwnProperty.call(våben, type) ? type : "sværd";
    for (const [navn, obj] of Object.entries(våben)) obj.visible = navn === valgt;
    pil.visible = false;
  }
  function lokal(obj, p) {
    helt.updateMatrixWorld(true);
    return helt.worldToLocal(obj.localToWorld(p.clone()));
  }

  // Alle transformationer skrives fra en frisk grundpose, så gang og gentagne slag ikke driver.
  function pose({ våben: type = valgt, tid = 0, fart = 0, fremskridt = null, slag = 1 } = {}) {
    if (fjernet) return;
    if (type !== valgt) skiftVåben(type);
    tid = Number.isFinite(tid) ? tid : 0;
    fart = Number.isFinite(fart) ? begræns(Math.abs(fart), 0, 1.2) : 0;
    const p = Number.isFinite(fremskridt) ? begræns(fremskridt, 0, 1) : null;
    const gang = Math.sin(tid * 9) * .22 * fart;
    const højreHvile = new THREE.Vector3(.39, .725 + Math.abs(gang) * .05, gang * .45);
    const venstreHvile = new THREE.Vector3(-.39, .725 + Math.abs(gang) * .05, -gang * .45);
    const sværdDrej = new THREE.Quaternion().setFromUnitVectors(OP, vektor([.1, .96, -.25]).normalize());
    for (let i = 0; i < ben.length; i++) {
      if (ben[i].obj) {
        ben[i].obj.quaternion.copy(ben[i].quaternion);
        ben[i].obj.rotateX(Math.sin(tid * 9) * .38 * fart * (i ? -1 : 1));
      }
    }
    pil.visible = false;
    sætStreng(new THREE.Vector3(0, 0, .13));
    if (p === null || p >= 1) {
      højre.sæt(højreHvile, valgt === "sværd" ? sværdDrej : new THREE.Quaternion());
      venstre.sæt(venstreHvile, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.08));
    } else if (valgt === "sværd") {
      const s = sværdpunkt(p, slag), støtte = Math.sin(Math.PI * p);
      højre.sæt(s.hånd, new THREE.Quaternion().setFromUnitVectors(OP, s.retning));
      venstre.sæt(venstreHvile.clone().lerp(new THREE.Vector3(-.43, 1.04, -.25), støtte));
    } else if (valgt === "bue") {
      const løft = blød(p / .18) * (1 - blød((p - .82) / .18));
      const spænd = blød(p / SLIP.bue);
      const træk = p <= SLIP.bue ? spænd : Math.max(0, 1 - (p - SLIP.bue) / .055);
      const nok = new THREE.Vector3(0, 0, .13 + træk * .27);
      // Pilen ligger foran venstre kind og over brystet; venstre hånd presser buen frem under trækket.
      const greb = new THREE.Vector3(-.12, 1.34, -.45).lerp(new THREE.Vector3(-.22, 1.34, -.60), spænd);
      venstre.sæt(venstreHvile.clone().lerp(greb, løft));
      sætStreng(nok);
      // Et langsomt billede kan krydse slippet efter .55: den skjulte pil beholder sit slipsted,
      // mens den synlige streng allerede slår tilbage. Den flyvende pil springer derfor ikke bagud.
      if (p >= SLIP.bue) pil.position.set(0, 0, .40);
      const stringHånd = lokal(våben.bue, nok);
      const hånd = højreHvile.clone().lerp(stringHånd, løft);
      if (p > SLIP.bue) hånd.lerp(new THREE.Vector3(.38, 1.21, .18), blød((p - SLIP.bue) / .13));
      if (p > .82) hånd.lerp(højreHvile, blød((p - .82) / .18));
      højre.sæt(hånd);
      pil.visible = p >= .14 && p < SLIP.bue;
    } else {
      const løft = p <= SLIP.magi ? blød(p / SLIP.magi) : 1 - blød((p - SLIP.magi) / .6);
      højre.sæt(
        højreHvile.clone().lerp(new THREE.Vector3(.32, 1.43, -.34), løft),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -.68 * løft),
      );
      venstre.sæt(venstreHvile.clone().lerp(new THREE.Vector3(-.32, 1.05, -.22), løft));
    }
    helt.updateMatrixWorld(true);
  }

  // Pilens nok bevares ved slippet; den flyvende model starter præcis samme sted. Staven bruger krystallen.
  function munding(retning = null) {
    helt.updateMatrixWorld(true);
    const obj = valgt === "bue" ? pil : våben[valgt];
    const punkt = valgt === "bue"
      ? new THREE.Vector3(0, 0, 0)
      : valgt === "magi"
      ? new THREE.Vector3(0, 1.12, 0)
      : new THREE.Vector3(0, 1.25, 0);
    const ud = obj.localToWorld(punkt);
    if (valgt !== "bue" && retning && Number.isFinite(retning.x) && Number.isFinite(retning.z)) {
      const afstand = Math.hypot(retning.x, retning.z);
      if (afstand > .001) ud.add(new THREE.Vector3(retning.x / afstand, 0, retning.z / afstand).multiplyScalar(.04));
    }
    return ud;
  }
  function nulstil() {
    pose({ våben: valgt, tid: 0, fart: 0, fremskridt: null });
  }
  function ryd() {
    if (fjernet) return;
    fjernet = true;
    højre.ryd();
    venstre.ryd();
    for (const { obj, z } of forside) obj.position.z = z;
    for (const b of ben) if (b.obj) b.obj.quaternion.copy(b.quaternion);
    strengGeo.dispose();
    strengMat.dispose();
  }
  skiftVåben(valgt);
  nulstil();
  return { skiftVåben, pose, munding, nulstil, ryd };
}
