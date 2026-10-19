// ===== Materialerne: fotos af rigtig beton, mursten, træ og stål =====
// Fotoene (Poly Haven, CC0) ligger i Sigtekorns mappe og deles med den; murstenene er lavet i Blender.
// Billedet lægges på hver del i delens egne meter ("triplanar"): det følger med, når delen vælter og
// flyver, og en lang søjle får lige så store sten som en kort. Hver del får sin egen forskydning og
// nuance, så to ens mure ikke ligner hinanden.

import * as THREE from "../3d-faelles/three.module.js";
import { mobil } from "./enhed.js";

const FOTO = "../sigtekorn/teksturer/", EGNE = "teksturer/";

// Alle byggematerialer: foto, farvetone, hvor meget fotoets farve skal fjernes (afmæt), og fysikken:
// vægt (kg/m³), hvor let det knuses af en sprængning (brud: 1 = mursten) og hvor stort et stykke
// brokkerne bliver (brok, meter). lyd: hvilken slags lyd det giver, når det rammer noget.
export const MATERIALER = {
  beton:   { foto: "beton",   tone: 0xd4d0c8, afmæt: 0.35, kontrast: 0.55, vægt: 2400, brud: 0.62, brok: 0.55, lyd: "beton", ru: 1.0 },
  råbeton: { foto: "beton",   tone: 0xa8a49c, afmæt: 0.2,  kontrast: 0.7, vægt: 2400, brud: 0.55, brok: 0.6,  lyd: "beton", ru: 1.0 },
  mursten: { foto: "mursten", tone: 0xffffff, afmæt: 0,    vægt: 1800, brud: 1.0,  brok: 0.45, lyd: "beton", ru: 1.0, egen: true, reserve: "puds", reserveTone: 0xa04a32 },
  puds:    { foto: "puds",    tone: 0xf2eee6, afmæt: 0.75, vægt: 1800, brud: 0.95, brok: 0.4,  lyd: "beton", ru: 1.0 },
  træ:     { foto: "planker", tone: 0xb08a68, afmæt: 0.2,  vægt: 650,  brud: 1.6,  brok: 0.7,  lyd: "træ",   ru: 1.0, splint: true },
  rødtræ:  { foto: "panel",   tone: 0x9c3a26, afmæt: 0,    drej: true,    vægt: 550,  brud: 1.7,  brok: 0.7,  lyd: "træ",   ru: 1.0, splint: true },
  stål:    { foto: "metal",   tone: 0x8c9096, afmæt: 1,    vægt: 1500, brud: 0.3,  brok: 0,    lyd: "metal", ru: 0.9, metal: 0.75, sejt: true },
  rødstål: { foto: "metal",   tone: 0xa8402c, afmæt: 1,    vægt: 1500, brud: 0.3,  brok: 0,    lyd: "metal", ru: 0.9, metal: 0.55, sejt: true },
  blik:    { foto: "blik",    tone: 0xd8dcde, afmæt: 0,    vægt: 260,  brud: 0.9,  brok: 0,    lyd: "metal", ru: 1.0, metal: 0.25, sejt: true },
  tag:     { foto: "blik",    tone: 0x8a8f96, afmæt: 0,    vægt: 260,  brud: 0.9,  brok: 0,    lyd: "metal", ru: 1.0, metal: 0.3, sejt: true },
  klippe:  { foto: "klippe",  tone: 0xb0aaa0, afmæt: 0.2,  vægt: 2600, brud: 0.5,  brok: 0.7,  lyd: "beton", ru: 1.0 },
};

// ---------- Hent fotoene ----------
// På en tablet gøres billederne mindre (farven højst 768 punkter, buler og ruhed 512): det fylder en
// sjettedel så meget i hukommelsen, og på en tabletskærm kan man næsten ikke se forskel.
const formindsket = new WeakMap();                            // samme billede brugt flere steder gøres kun mindre én gang
export function mindre(t, maks) {
  const im = t.image;
  if (!im || Math.max(im.width, im.height) <= maks) return t;
  let c = formindsket.get(im);
  if (!c) {
    const k = maks / Math.max(im.width, im.height);
    c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    formindsket.set(im, c);
  }
  t.image = c; t.needsUpdate = true;
  return t;
}
async function hentFoto(loader, mappe, navn) {
  const hent = (fil, farve) => loader.loadAsync(mappe + fil).then(t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (farve) t.colorSpace = THREE.SRGBColorSpace;
    return mobil ? mindre(t, farve ? 768 : 512) : t;
  });
  const [farve, normal, arm] = await Promise.all([hent(`${navn}_farve.webp`, true), hent(`${navn}_normal.webp`), hent(`${navn}_arm.webp`)]);
  return { farve, normal, arm };
}

export async function hentFotos(renderer) {
  const loader = new THREE.TextureLoader(), maks = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const info = await fetch(FOTO + "teksturer.json").then(s => s.json());
  let egne = {};
  try { egne = { mursten: await fetch(EGNE + "mursten.json").then(s => s.json()) }; } catch (_) { /* murstenene er ikke lavet endnu */ }
  const navne = new Set(Object.entries(MATERIALER).filter(([n]) => n !== "klippe").flatMap(([, m]) => [m.foto, !egne[m.foto] && m.reserve]).filter(Boolean));
  navne.add("sand");
  const fotos = {};
  await Promise.all([...navne].map(async navn => {
    const egen = navn in egne;
    if (!egen && !info[navn]) return;
    try {
      fotos[navn] = { ...(await hentFoto(loader, egen ? EGNE : FOTO, navn)), meter: (egen ? egne[navn] : info[navn]).meter };
      for (const t of [fotos[navn].farve, fotos[navn].normal, fotos[navn].arm]) t.anisotropy = maks;
    } catch (_) { /* uden foto bruges reserven */ }
  }));
  return fotos;
}

// ---------- Materialet med fotoet lagt på i delens egne meter ----------
const VERTEX_FØR = `
varying vec3 vLok;
varying vec3 vLokN;
varying vec3 vTX;
varying vec3 vTY;
varying vec3 vTZ;`;
const VERTEX_EFTER = `
  vec3 dSkala = vec3(1.0);
  mat3 dRot = mat3(1.0);
  float dId = 0.0;
  #ifdef USE_INSTANCING
    dSkala = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    dRot = mat3(instanceMatrix[0].xyz / dSkala.x, instanceMatrix[1].xyz / dSkala.y, instanceMatrix[2].xyz / dSkala.z);
    dId = float(gl_InstanceID);
  #endif
  vLok = position * dSkala + vec3(fract(dId * 0.6180) * 7.0, fract(dId * 0.3771) * 5.0, fract(dId * 0.2113) * 9.0);
  vLokN = normalize(normal / dSkala);
  mat3 dTilView = normalMatrix * dRot;
  vTX = dTilView[0]; vTY = dTilView[1]; vTZ = dTilView[2];`;

const FRAG_FØR = `
uniform sampler2D tFarve;
uniform sampler2D tNormal;
uniform sampler2D tArm;
uniform float uSkala;
uniform float uAfmaet;
uniform float uMetalKort;
uniform float uNormalStyrke;
uniform float uKontrast;
uniform float uDrej;
varying vec3 vLok;
varying vec3 vLokN;
varying vec3 vTX;
varying vec3 vTY;
varying vec3 vTZ;`;
// Farven og ruheden: tre projektioner (en for hver akse), blandet efter hvilken vej fladen vender
const FRAG_FARVE = `
  vec3 dN = normalize(vLokN);
  vec3 dW = pow(abs(dN), vec3(4.0)); dW /= (dW.x + dW.y + dW.z);
  vec3 dP = vLok * uSkala;
  vec2 dUvX = dP.zy, dUvY = dP.xz, dUvZ = dP.xy;
  if (uDrej > 0.5) { dUvX = dUvX.yx; dUvZ = dUvZ.yx; }       // brædderne står lodret
  vec4 dFarve = texture2D(tFarve, dUvX) * dW.x + texture2D(tFarve, dUvY) * dW.y + texture2D(tFarve, dUvZ) * dW.z;
  dFarve.rgb = mix(textureLod(tFarve, vec2(0.5), 12.0).rgb, dFarve.rgb, uKontrast);
  float dLum = dot(dFarve.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb *= mix(dFarve.rgb, vec3(dLum), uAfmaet);
  vec4 dArm = texture2D(tArm, dUvX) * dW.x + texture2D(tArm, dUvY) * dW.y + texture2D(tArm, dUvZ) * dW.z;`;
// De små buler (normal) i delens eget rum, drejet med delen ("whiteout"-blanding)
const FRAG_NORMAL = `
  vec3 dTX = texture2D(tNormal, dUvX).xyz * 2.0 - 1.0;
  vec3 dTY = texture2D(tNormal, dUvY).xyz * 2.0 - 1.0;
  vec3 dTZ = texture2D(tNormal, dUvZ).xyz * 2.0 - 1.0;
  if (uDrej > 0.5) { dTX.xy = dTX.yx; dTZ.xy = dTZ.yx; }
  dTX.xy *= uNormalStyrke; dTY.xy *= uNormalStyrke; dTZ.xy *= uNormalStyrke;
  vec3 dNX = vec3(dTX.xy + dN.zy, abs(dTX.z) * dN.x);
  vec3 dNY = vec3(dTY.xy + dN.xz, abs(dTY.z) * dN.y);
  vec3 dNZ = vec3(dTZ.xy + dN.xy, abs(dTZ.z) * dN.z);
  vec3 dNLok = normalize(dNX.zyx * dW.x + dNY.xzy * dW.y + dNZ.xyz * dW.z);
  normal = normalize(mat3(vTX, vTY, vTZ) * dNLok);`;
const FRAG_AO = `
  float dAo = mix(1.0, dArm.r, 0.85);
  reflectedLight.indirectDiffuse *= dAo;
  reflectedLight.indirectSpecular *= mix(1.0, dAo, 0.7);`;

export function lavMateriale(navn, fotos) {
  const def = MATERIALER[navn];
  const reserve = !fotos[def.foto] && def.reserve;
  const f = fotos[def.foto] || fotos[def.reserve] || fotos.beton;
  const m = new THREE.MeshStandardMaterial({
    color: reserve ? def.reserveTone : def.tone, roughness: def.ru ?? 1, metalness: def.metal ?? 0, envMapIntensity: 0.7,
  });
  m.name = navn;
  const u = {
    tFarve: { value: f.farve }, tNormal: { value: f.normal }, tArm: { value: f.arm },
    uSkala: { value: 1 / f.meter }, uAfmaet: { value: reserve ? 0.85 : def.afmæt ?? 0 },
    uMetalKort: { value: def.metal ? 1 : 0 }, uKontrast: { value: def.kontrast ?? 1 }, uDrej: { value: def.drej ? 1 : 0 }, uNormalStyrke: { value: navn === "blik" || navn === "tag" ? 1.6 : 1.0 },
  };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>" + VERTEX_FØR)
      .replace("#include <begin_vertex>", "#include <begin_vertex>" + VERTEX_EFTER);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>" + FRAG_FØR)
      .replace("#include <map_fragment>", FRAG_FARVE)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor *= dArm.g;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n  metalnessFactor *= mix(1.0, dArm.b, uMetalKort);")
      .replace("#include <normal_fragment_maps>", FRAG_NORMAL)
      .replace("#include <aomap_fragment>", FRAG_AO);
  };
  m.customProgramCacheKey = () => "nedrivning-tri";
  m.userData.uniforms = u;
  return m;
}

// Jorden på byggepladsen: grus med pletter af jord, gentaget i verdens-meter (almindelige UV'er)
export function jordMateriale(fotos, størrelse) {
  const f = fotos.sand;
  const m = new THREE.MeshStandardMaterial({ color: 0x9c9890, roughness: 1 });
  if (f) {
    for (const t of [f.farve, f.normal, f.arm]) { t.repeat.set(størrelse / f.meter, størrelse / f.meter); }
    m.map = f.farve; m.normalMap = f.normal; m.roughnessMap = f.arm; m.aoMap = f.arm; m.aoMapIntensity = 0.7;
  }
  return m;
}
