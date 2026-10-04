import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { mergeGeometries } from "../3d-faelles/BufferGeometryUtils.js";
import { aktivOpgave, terrænHøjde } from "./logik.js";
import { lavHimmel, lavMiljø, detaljerEfterNavn } from "../3d-faelles/pynt.js";

// Himlens farver i skumringen og om natten (blandes efter tilstand.nat)
const DAG = { top: "#24578a", horisont: "#d6aa7c", bund: "#6f7f7d", sky: "#ecc9a8", tåge: "#8e918c" };
const NAT = { top: "#050e1f", horisont: "#1b3043", bund: "#0c1923", sky: "#2a3a4c", tåge: "#182c3b" };

export const STEDER = {
  havn: { navn: "Den stille havn", x: -25, z: 73, ikon: "⚓" },
  værksted: { navn: "Fyrmesterens værksted", x: 7, z: 29, ikon: "⌂" },
  skov: { navn: "Ravskoven", x: -46, z: -31, ikon: "♧" },
  ruin: { navn: "Kompasruinen", x: -12, z: -62, ikon: "◈" },
  fyr: { navn: "Det gamle fyr", x: 32, z: -38, ikon: "☼" },
  grotte: { navn: "Havgrotten", x: -66, z: 46, ikon: "◇" },
};
export const RAVTRÆER = [{ x: -46, z: -31 }, { x: -54, z: -20 }, { x: -35, z: -37 }];

// Markør, afstand og kort følger altid den samme endnu manglende genstand.
export function næsteMål(tilstand) {
  const opgave = aktivOpgave(tilstand);
  if (!opgave) return null;
  if (opgave.id !== "harpiks") return STEDER[opgave.sted];
  return RAVTRÆER.filter((_, i) => !tilstand.rav.includes(i)).sort((a, b) =>
    Math.hypot(a.x - tilstand.position.x, a.z - tilstand.position.z) -
    Math.hypot(b.x - tilstand.position.x, b.z - tilstand.position.z))[0] || STEDER.skov;
}
const HUSE = [
  [-8, 25, 3.8, 3.8],
  [-30, 55, 4.6, 4.6],
  [-40, 61, 4.3, 6.5],
  [17, 36, 4.4, 4.4],
  [-3, 8, 4, 4],
  [50, -34, 4.5, 4.1],
  [38, -44, 4.9, 4.9],
];

// Stjernerne holder sig inden for enhedskuglens højde, så alle koordinater er endelige.
export function stjernePositioner(antal = 260) {
  const punkter = [];
  for (let i = 0; i < antal; i++) {
    const a = i * 2.399, y = .12 + (i % 47) / 55, r = Math.sqrt(1 - y * y);
    punkter.push(Math.cos(a) * r * 480, y * 480, Math.sin(a) * r * 480);
  }
  return punkter;
}

// Små lys mellem træerne flytter sig langs endelige, rolige baner.
export function skovLysPositioner(tid = 0) {
  const punkter = [];
  for (let i=0;i<28;i++) {
    const x=-48+Math.sin(i*2.399+tid*.10)*(7+i%4),z=-22+Math.cos(i*1.73+tid*.07)*(10+i%7);
    punkter.push(x,terrænHøjde(x,z)+1.2+Math.sin(tid*.7+i)*.5,z);
  }
  return punkter;
}

// Stenene står langs én sammenhængende kyststi og deles af kort og lysinstanser.
export function sporPositioner() {
  const ender = [[-12, -62], [-25, -50], [-37, -31], [-47, -8], [-55, 14], [-62, 31], [-66, 46]];
  const punkter = [];
  for (let k = 0; k < ender.length - 1; k++) {
    const [ax, az] = ender[k], [bx, bz] = ender[k + 1];
    const antal = Math.ceil(Math.hypot(bx - ax, bz - az) / 3.8);
    for (let i = 0; i < antal; i++) {
      const x = ax + (bx - ax) * i / antal, z = az + (bz - az) * i / antal;
      punkter.push({ x, y: terrænHøjde(x, z) + .30, z });
    }
  }
  return punkter;
}

// Højde og kollisionsgrænser beskytter spilleren mod bygninger og det dybe hav.
export function gangHøjde(x, z) {
  if (x > 2 && x < 12 && z > 18.5 && z < 27.5) return terrænHøjde(7, 23) + .26;
  if ((x > -29 && x < -21 && z > 64 && z < 86) || (x > -40 && x < -24 && z > 76 && z < 84)) {
    return Math.max(2.05, terrænHøjde(x, z));
  }
  return terrænHøjde(x, z);
}

// Mure og sten, man ikke kan gå igennem: ruinens to mure og søjler, grottens bagvæg (kasser: minX, maxX, minZ, maxZ)
// samt grottealteret (cirkler: x, z, radius). Det lave kompasfundament kan man stå på, for stien begynder dér. Tallene følger blender/tre-verdener/det-sidste-lys/byg_o.py.
const MURE = [[-19.15, -17.85, -68, -56], [-6.15, -4.85, -68, -56], [-16.6, -15.4, -67.6, -66.4], [-8.6, -7.4, -67.6, -66.4], [-71, -61, 37.1, 38.9]];
const STENE = [[-66, 44, 2]];

export function kanGå(x, z) {
  if (Math.hypot(x / 82, z / 102) > 1.015 || gangHøjde(x, z) < .55) return false;
  if (MURE.some(([a, b, c, d]) => x > a - .4 && x < b + .4 && z > c - .4 && z < d + .4)) return false;
  if (STENE.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + .4)) return false;
  const iHus = x > 1.5 && x < 12.5 && z > 18 && z < 28;
  if (
    iHus &&
    (Math.abs(x - 2) < .5 || Math.abs(x - 12) < .5 || Math.abs(z - 18.5) < .5 ||
      (Math.abs(z - 27.5) < .5 && Math.abs(x - 7) > .65))
  ) return false;
  return !HUSE.some(([hx, hz, bx, bz]) => Math.abs(x - hx) < bx + .48 && Math.abs(z - hz) < bz + .48);
}

// Let grafik bruger to nære lanternelys; de lysende Blender-materialer bevares overalt.
export function sætLanterneBudget(lanterner, position, letGrafik) {
  let første = -1, anden = -1, nærmest = Infinity, næstnærmest = Infinity;
  if (letGrafik) {
    lanterner.forEach((lys, i) => {
      const afstand = (lys.position.x - position.x) ** 2 + (lys.position.z - position.z) ** 2;
      if (afstand < nærmest) {
        anden = første; næstnærmest = nærmest; første = i; nærmest = afstand;
      } else if (afstand < næstnærmest) { anden = i; næstnærmest = afstand; }
    });
  }
  lanterner.forEach((lys, i) => { lys.visible = !letGrafik || i === første || i === anden; });
}

// Statiske Blender-dele samles efter materiale, mens rav og prisme bevares enkeltvis.
function samlModel(model) {
  model.updateMatrixWorld(true);
  const grupper = new Map();
  const bevægelige = [];
  const båd = new THREE.Group();
  båd.position.set(-32, 0, 87);
  const rod = new THREE.Group();
  model.traverse((del) => {
    if (!del.isMesh) return;
    const geometri = del.geometry.clone().applyMatrix4(del.matrixWorld);
    if (!geometri.index) geometri.setIndex(Array.from({ length: geometri.attributes.position.count }, (_, i) => i));
    if (del.matrixWorld.determinant() < 0) {
      const indeks = geometri.index.array;
      for (let i = 0; i < indeks.length; i += 3) [indeks[i + 1], indeks[i + 2]] = [indeks[i + 2], indeks[i + 1]];
    }
    geometri.deleteAttribute("uv");
    geometri.deleteAttribute("color");
    geometri.computeVertexNormals();
    const materiale = del.material;
    if (del.name.startsWith("Flydebaad_")) {
      geometri.translate(32, 0, -87);
      båd.add(new THREE.Mesh(geometri, materiale));
    } else if (/Gammelt_rav|Den_gamle_linse|Havgrotten_prisme|Lanternens_lys|Prismens_spejl/.test(del.name)) {
      let centrum = null;
      if (del.name.startsWith("Prismens_spejl")) {
        geometri.computeBoundingBox();centrum=geometri.boundingBox.getCenter(new THREE.Vector3());
        geometri.translate(-centrum.x,-centrum.y,-centrum.z);
      }
      const o = new THREE.Mesh(geometri, materiale);
      if (centrum) o.position.copy(centrum);
      o.name = del.name;
      rod.add(o);
      bevægelige.push(o);
    } else {
      const gruppe = grupper.get(materiale.uuid) || { materiale, geometrier: [] };
      gruppe.geometrier.push(geometri);
      grupper.set(materiale.uuid, gruppe);
    }
  });
  for (const { materiale, geometrier } of grupper.values()) {
    const samlet = mergeGeometries(geometrier, false);
    const o = new THREE.Mesh(samlet, materiale);
    o.receiveShadow = true;
    o.castShadow = true;
    o.name = materiale.name;
    rod.add(o);
    geometrier.forEach((g) => g.dispose());
  }
  rod.add(båd);
  return { rod, bevægelige, båd };
}

export class ØVerden {
  constructor(rod, status) {
    this.mobil = matchMedia("(pointer: coarse)").matches || innerWidth < 800;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#526b76");
    this.scene.fog = new THREE.FogExp2(DAG.tåge, .0045);
    this.kamera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, .1, 900);
    this.kamera.rotation.order = "YXZ";
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.mobil,
      powerPreference: this.mobil ? "low-power" : "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.mobil ? 1.3 : 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !this.mobil;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Den tredimensionelle ø. Træk for at se dig omkring.");
    rod.append(this.renderer.domElement);
    this.status = status;
    this.nat = 0;
    this.tid = 0;
    this.#himmel();
    this.#hav();
    this.#lys();
    this.#spor();
    this.#skovLys();
    this.markør = this.#markør();
    window.addEventListener("resize", () => this.tilpas());
  }

  // Kun lokalt gemte originale Blender-modeller indlæses.
  async indlæs() {
    const model = await new GLTFLoader().loadAsync("./oe.glb", (e) => {
      this.status(e.total ? Math.min(95, Math.round(e.loaded / e.total * 90)) : 50);
    });
    const { rod, bevægelige, båd } = samlModel(model.scene);
    this.båd = båd;
    this.model = rod;
    this.genstande = bevægelige;
    this.scene.add(rod);
    // Spejlinger fra himlen og fine mønstre i græs, sand, sten og træ (spil/3d-faelles/pynt.js)
    this.scene.environment = lavMiljø(this.renderer, this.himmel, "#4a5a50");
    // Græsfelterne havde hver sin grøntone og lignede et skakbræt: de får nu næsten samme farve,
    // og mønstret på grafikkortet giver i stedet bløde, naturlige pletter.
    const græs = new THREE.Color("#5f7a4c");
    rod.traverse(o => { if (o.isMesh && /^Marehalm/.test(o.material.name)) o.material.color.lerp(græs, 0.75); });
    // Spejlingerne er lavet af dagshimlen, så de dæmpes om natten (se opdater)
    this.spejlMaterialer = new Set();
    rod.traverse(o => { if (o.isMesh && o.material.isMeshStandardMaterial) this.spejlMaterialer.add(o.material); });
    detaljerEfterNavn(rod, [["marehalm", "græs", { styrke: 0.28, bump: 0.7 }], ["strandsand", "sand", { styrke: 0.2, bump: 0.6, skala: 2 }],
      ["skaller", "sten", { styrke: 0.3, bump: 0.6, skala: 2 }], ["kyststen", "klippe", { styrke: 0.3, bump: 1 }],
      ["honningtræ", "træ", { styrke: 0.3, bump: 0.5 }], ["drivtømmer", "træ", { styrke: 0.35, bump: 0.6 }], ["mørk eg", "træ", { styrke: 0.3, bump: 0.5 }],
      ["skifer", "sten", { styrke: 0.22, bump: 0.4, skala: 3 }], ["kalk", "sten", { styrke: 0.12, bump: 0.25, skala: 2 }]], { fin: !this.mobil });
    this.vind = { value: 0 };
    this.model.traverse(o=>{
      if (!o.isMesh || !/^Fyrregrøn|Gylden strandsennep|Salvie/.test(o.material.name)) return;
      o.material.onBeforeCompile = shader=>{
        shader.uniforms.vindTid=this.vind;
        shader.vertexShader='uniform float vindTid;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(position.z*.19+position.x*.16+vindTid)*.055; transformed.z += cos(position.x*.18+vindTid*.8)*.045;');
      };
      o.material.customProgramCacheKey=()=>"lyso-vind-v1";
    });
    this.rav = bevægelige.filter((o) => o.name.startsWith("Gammelt_rav"));
    this.linse = bevægelige.find((o) => o.name.startsWith("Den_gamle_linse"));
    this.prisme = bevægelige.find((o) => o.name.startsWith("Havgrotten_prisme"));
    this.lanterne = bevægelige.find((o) => o.name.startsWith("Lanternens_lys"));
    if (this.lanterne) this.lanterne.material = this.lanterne.material.clone();   // eget materiale: vinduerne skal ikke lyse med
    this.spejle = bevægelige.filter(o => o.name.startsWith("Prismens_spejl"));
    await this.#måger();
    this.status(100);
  }

  // Få kloner af en Blender-måge giver bevægelse over kysten uden mange tegnekald.
  async #måger() {
    const model = await new GLTFLoader().loadAsync("./maage.glb");
    const prototype = model.scene;
    prototype.traverse(o => {
      if (o.isMesh) { o.material.side = THREE.DoubleSide; o.castShadow = false; }
    });
    this.måger = [];
    for (let i = 0; i < (this.mobil ? 3 : 5); i++) {
      const rod = new THREE.Group(), fugl = prototype.clone(true);
      const vinger = [new THREE.Group(), new THREE.Group()];
      for (const del of [...fugl.children]) {
        const side = del.name.includes("venstre") ? 0 : del.name.includes("hoejre") ? 1 : -1;
        if (side >= 0) vinger[side].add(del);
      }
      fugl.add(...vinger);rod.add(fugl);rod.scale.setScalar(.8 + i*.07);this.scene.add(rod);
      this.måger.push({ rod, vinger, fase: i*1.65 });
    }
  }

  anvendIndstillinger(valg) {
    const letGrafik = valg.kvalitet === "let" || (valg.kvalitet === "auto" && this.mobil);
    this.letGrafik = letGrafik;
    this.spot.visible = !letGrafik;
    sætLanterneBudget(this.lanterner, this.kamera.position, letGrafik);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, letGrafik ? 1.1 : this.mobil ? 1.3 : 1.75));
    const skygger = !letGrafik && !this.mobil;
    if (this.renderer.shadowMap.enabled !== skygger) {
      this.renderer.shadowMap.enabled = skygger;
      this.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    }
    this.renderer.toneMappingExposure = 1.1;
    this.rolig = valg.rolig;
    this.tilpas();
  }

  #himmel() {
    // Himlen med sol, skyer og stjerner (spil/3d-faelles/pynt.js). Solen står samme sted som den gamle solkugle.
    this.himmel = lavHimmel({ top: DAG.top, horisont: DAG.horisont, bund: DAG.bund, sol: [-160, 55, -245], solFarve: "#ffcf96", solStyrke: 1.1, dis: 0.45, skyer: 0.3, skyFarve: DAG.sky });
    this.scene.add(this.himmel);
    this.himmelFarver = { top: new THREE.Color(), horisont: new THREE.Color(), bund: new THREE.Color(), sky: new THREE.Color() };
    const geometri = new THREE.SphereGeometry(550, 24, 12);
    this.himmelMateriale = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { nat: { value: 0 } },
      vertexShader: "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        `varying vec3 p;uniform float nat;void main(){float h=clamp(normalize(p).y,0.,1.);vec3 dag=mix(vec3(.64,.64,.53),vec3(.19,.35,.46),pow(h,.6));vec3 aften=mix(vec3(.15,.24,.29),vec3(.025,.055,.11),pow(h,.45));gl_FragColor=vec4(mix(dag,aften,nat),1.);}`,
    });
    // (den gamle farvekugle beholdes kun som reserve og tegnes ikke)
    const stjernePos = stjernePositioner();
    const data = new THREE.BufferGeometry();
    data.setAttribute("position", new THREE.Float32BufferAttribute(stjernePos, 3));
    this.stjerner = new THREE.Points(
      data,
      new THREE.PointsMaterial({ color: "#c6e1e1", size: 1.2, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    );
    this.stjerner.visible = false;                            // stjernerne tegnes nu af himlen selv
    this.scene.add(this.stjerner);
    this.sol = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: "#f8d6a0", fog: false }));
    this.sol.position.set(-160, 55, -245);
    this.sol.visible = false;                                 // solskiven tegnes nu af himlen
    this.måne = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({ color: "#c8e3e4", fog: false }),
    );
    this.måne.position.set(150, 160, -260);
    this.måne.visible = false;
    this.scene.add(this.måne);
  }

  #hav() {
    this.havMateriale = new THREE.ShaderMaterial({
      transparent: false,
      uniforms: { tid: { value: 0 }, nat: { value: 0 }, kamera: { value: new THREE.Vector3() },
        himmelTop: { value: new THREE.Color(DAG.top) }, horisont: { value: new THREE.Color(DAG.horisont) },
        solRetning: { value: new THREE.Vector3(-160, 55, -245).normalize() } },
      vertexShader:
        `varying vec3 p;uniform float tid;void main(){vec3 q=position;q.y+=sin(q.x*.06+tid*.6)*.19+cos(q.z*.075-tid*.43)*.16;p=q;gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.);}`,
      fragmentShader: `
varying vec3 p;
uniform float tid, nat;
uniform vec3 kamera, himmelTop, horisont, solRetning;
vec2 boelge(vec2 q, vec2 r, float f, float a, float hast) { float k = dot(q, r) * f + tid * hast; return r * cos(k) * f * a; }
void main() {
  // smaa boelger giver vandet en normal, saa det kan spejle himlen og glimte i solen
  vec2 g = boelge(p.xz, normalize(vec2(1.0, 0.4)), 0.48, 0.05, -1.8) + boelge(p.xz, normalize(vec2(-0.3, 1.0)), 0.9, 0.025, 1.3)
         + boelge(p.xz, normalize(vec2(0.7, -0.7)), 1.7, 0.012, 2.1) + boelge(p.xz, normalize(vec2(-0.9, -0.2)), 3.1, 0.006, -2.6);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 v = normalize(kamera - p);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  vec3 spejl = mix(horisont, himmelTop, clamp(r.y * 1.8, 0.0, 1.0));
  float e = length(vec2(p.x / 82.0, p.z / 102.0));             // 1 = oeens kyst
  vec3 dyb = mix(vec3(0.012, 0.07, 0.085), vec3(0.03, 0.16, 0.16), smoothstep(1.35, 1.0, e));
  vec3 c = mix(dyb, spejl, fres);
  float glimt = pow(max(dot(r, normalize(solRetning)), 0.0), 220.0) * (1.0 - nat);
  c += vec3(1.0, 0.85, 0.6) * glimt * 2.5;
  float skum = smoothstep(1.075, 1.0, e) * (0.55 + 0.45 * sin(e * 140.0 - tid * 1.7 + sin(p.x * 0.3) * 2.0));
  c = mix(c, vec3(0.75, 0.78, 0.72) * (1.0 - nat * 0.75), clamp(skum, 0.0, 1.0) * 0.65);
  float d = clamp(length(p.xz - kamera.xz) / 470.0, 0.0, 1.0);
  c = mix(c, horisont, pow(d, 1.6));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    });
    const data = new THREE.PlaneGeometry(1800, 1800, 100, 100);
    data.rotateX(-Math.PI / 2);
    this.hav = new THREE.Mesh(data, this.havMateriale);
    this.hav.position.y = .02;
    this.scene.add(this.hav);
    const skumData = new THREE.BufferGeometry();
    const pos = [];
    for (let i = 0; i < 260; i++) {
      const a = i / 260 * Math.PI * 2;
      pos.push(Math.cos(a) * 81, .3, Math.sin(a) * 101);
    }
    skumData.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.skum = new THREE.Points(
      skumData,
      new THREE.PointsMaterial({ color: "#acbfaf", size: 1.4, transparent: true, opacity: .45, depthWrite: false }),
    );
    this.scene.add(this.skum);
  }

  #lys() {
    this.halvlys = new THREE.HemisphereLight("#b9d6e0", "#86755c", 2.3);
    this.scene.add(this.halvlys);
    this.sollys = new THREE.DirectionalLight("#ffdab1", 3.2);
    this.sollys.position.set(-80, 100, 60);
    this.scene.add(this.sollys);
    this.sollys.castShadow = !this.mobil;
    this.sollys.shadow.mapSize.set(1536, 1536);
    Object.assign(this.sollys.shadow.camera, { left: -100, right: 100, top: 120, bottom: -110, near: 1, far: 280 });
    this.sollys.shadow.bias = -.0004;
    const fyry = terrænHøjde(38, -44) + 23;
    this.fyrlys = new THREE.PointLight("#ffc779", 150, 60, 2);
    this.fyrlys.position.set(38, fyry, -44);
    this.scene.add(this.fyrlys);
    this.stråleRod = new THREE.Group();
    this.stråleRod.position.set(38, fyry, -44);
    this.scene.add(this.stråleRod);
    const stråleData = new THREE.ConeGeometry(20, 190, 24, 1, true);
    stråleData.translate(0, -95, 0);
    stråleData.rotateX(Math.PI / 2);
    this.stråleMat = new THREE.MeshBasicMaterial({
      color: "#ffdf91",
      transparent: true,
      opacity: .08,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stråle = new THREE.Mesh(stråleData, this.stråleMat);
    this.stråleRod.add(this.stråle);
    this.spot = new THREE.SpotLight("#ffe0a2", 1400, 200, .14, 1, 1);
    this.spot.position.copy(this.stråleRod.position);
    this.scene.add(this.spot);
    this.scene.add(this.spot.target);
    this.håndlys = new THREE.PointLight("#ffdaa3", 15, 13, 2);
    this.scene.add(this.håndlys);
    const lanterner = [[-25, 66], [7, 32], [7, 23], [-20, 40], [18, 10], [31, -24], [34, -38], [-39, -9]];
    this.lanterner = lanterner.map(([x, z]) => {
      const l = new THREE.PointLight("#ffbc6b", 25, 14, 2);
      l.position.set(x, terrænHøjde(x, z) + 3.2, z);
      this.scene.add(l);
      return l;
    });
  }

  #spor() {
    const punkter = sporPositioner();
    const geometri = new THREE.IcosahedronGeometry(.28, 0);
    this.sporMat = new THREE.MeshStandardMaterial({ color: "#7cdfda", emissive: "#46c5d5", emissiveIntensity: 2, roughness: .3 });
    this.spor = new THREE.InstancedMesh(geometri, this.sporMat, punkter.length);
    const matrix = new THREE.Matrix4();
    punkter.forEach((p, i) => this.spor.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z)));
    this.spor.computeBoundingSphere();
    this.scene.add(this.spor);
    this.spor.visible = false;
  }

  #markør() {
    const g = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(.48, .035, 5, 28),
      new THREE.MeshBasicMaterial({ color: "#ffd58d", transparent: true, opacity: .8, depthTest: false }),
    );
    g.add(torus);
    this.scene.add(g);
    return g;
  }

  #skovLys() {
    const data = new THREE.BufferGeometry();
    data.setAttribute("position",new THREE.Float32BufferAttribute(skovLysPositioner(),3));
    this.skovLys = new THREE.Points(data,new THREE.PointsMaterial({color:"#f8d484",size:.13,transparent:true,opacity:0,depthWrite:false}));
    this.skovLys.frustumCulled=false;this.scene.add(this.skovLys);
  }

  sætMål(sted) {
    this.mål = sted;
    this.markør.visible = !!sted;
  }

  opdater(tid, delta, tilstand, film = false) {
    this.tid = tid;
    sætLanterneBudget(this.lanterner, this.kamera.position, this.letGrafik);
    if(this.vind)this.vind.value=this.rolig?0:tid*.75;
    this.skovLys.material.opacity=this.nat*.7;
    if (!this.rolig) {
      this.skovLys.geometry.attributes.position.array.set(skovLysPositioner(tid));
      this.skovLys.geometry.attributes.position.needsUpdate=true;
    }
    if (this.båd) {
      this.båd.position.y = this.rolig ? 0 : Math.sin(tid*.8)*.07;
      this.båd.rotation.z = this.rolig ? 0 : Math.sin(tid*.58)*.018;
    }
    for (const m of this.måger || []) {
      const a = tid*.075 + m.fase;
      m.rod.position.set(-28 + Math.cos(a)*43, 22 + Math.sin(a*1.4)*3, 39 + Math.sin(a)*42);
      m.rod.rotation.y = Math.PI - a;
      m.vinger[0].rotation.z = Math.sin(tid*4 + m.fase)*.20;
      m.vinger[1].rotation.z = -Math.sin(tid*4 + m.fase)*.20;
    }
    this.spejle?.forEach((o,i)=>{o.rotation.y=(tilstand.gåder?.spejle?.[i] || 0)*Math.PI/2;});
    this.nat = THREE.MathUtils.damp(this.nat, tilstand.nat ? 1 : 0, 1.2, delta);
    const n = this.nat;
    this.himmelMateriale.uniforms.nat.value = n;
    this.havMateriale.uniforms.nat.value = n;
    const u = this.himmel.userData.uniforms, f = this.himmelFarver;
    for (const nøgle of ["top", "horisont", "bund", "sky"]) f[nøgle].set(DAG[nøgle]).lerp(new THREE.Color(NAT[nøgle]), n);
    u.uTop.value.copy(f.top); u.uHorisont.value.copy(f.horisont); u.uBund.value.copy(f.bund); u.uSkyFarve.value.copy(f.sky);
    u.uSolStyrke.value = 1.1 * (1 - n); u.uStjerner.value = n * 0.9;
    for (const m of this.spejlMaterialer || []) m.envMapIntensity = 1 - n * 0.85;
    this.havMateriale.uniforms.himmelTop.value.copy(f.top); this.havMateriale.uniforms.horisont.value.copy(f.horisont);
    this.havMateriale.uniforms.tid.value = tid;
    this.havMateriale.uniforms.kamera.value.copy(this.kamera.position);
    this.scene.fog.color.set(DAG.tåge).lerp(new THREE.Color(NAT.tåge), n);
    this.scene.fog.density = .0045 + n * .002;
    this.halvlys.intensity = 1.35 - n * 0.65;                  // himlens spejlinger giver resten af lyset
    this.sollys.intensity = 3.2 - n * 2.8;
    this.sollys.color.set("#ffdab1").lerp(new THREE.Color("#a9c3e5"), n);
    this.stjerner.material.opacity = n * .8;
    this.måne.visible = n > .35;
    this.fyrlys.intensity = tilstand.færdige.includes("strøm") ? 90 + n * 110 : 15;
    this.lanterner.forEach((l) => l.intensity = 8 + n * 24);
    this.håndlys.position.copy(this.kamera.position);
    this.håndlys.intensity = film ? 0 : 3 + n * 18;
    const strøm = tilstand.færdige.includes("strøm");
    this.stråleRod.visible = strøm && n > .1;
    this.spot.intensity = strøm ? n * 1400 : 0;
    const færdig = tilstand.færdige.includes("lys");
    if (!færdig && tilstand.retning === 3) {
      // Vestens prøve retter både kegle og spotlight præcist mod kompaslinsen.
      const mål = new THREE.Vector3(-12, terrænHøjde(-12, -62) + 1.85, -62);
      const retning = mål.sub(this.stråleRod.position).normalize();
      this.stråleRod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), retning);
    } else this.stråleRod.rotation.set(0, færdig ? -tid * .16 : -tilstand.retning * Math.PI / 2, 0);
    this.stråleMat.opacity = .025 + n * (færdig ? .13 : .055);
    const retning = new THREE.Vector3(0, 0, -190).applyQuaternion(this.stråleRod.quaternion);
    this.spot.target.position.copy(this.stråleRod.position).add(retning);
    this.spor.visible = tilstand.færdige.includes("spor") && n > .5;
    this.sporMat.emissiveIntensity = 1.6 + Math.sin(tid * 1.2) * .35;
    if (this.rav) {
      this.rav.forEach((o, i) => o.visible = !tilstand.rav.includes(i));
      if (this.linse) this.linse.visible = !tilstand.færdige.includes("linse");
      if (this.prisme) this.prisme.visible = !tilstand.færdige.includes("prisme");
      if (this.lanterne) this.lanterne.material.emissiveIntensity = strøm ? 2.5 : .25;
    }
    if (this.mål && !film) {
      const { x, z } = this.mål;
      this.markør.position.set(x, gangHøjde(x, z) + 2.9 + Math.sin(tid * 1.8) * .12, z);
      this.markør.lookAt(this.kamera.position);
      this.markør.visible = this.kamera.position.distanceTo(this.markør.position) < 75;
    } else this.markør.visible = false;
    this.renderer.render(this.scene, this.kamera);
  }

  tilpas() {
    this.kamera.aspect = innerWidth / innerHeight;
    this.kamera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
}
