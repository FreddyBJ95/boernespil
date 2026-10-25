// ===== Ikonerne: små billeder af de rigtige 3D-modeller, så man kan vælge uden at kunne læse =====
// Delene og lasten tegnes i et lille fotostudie i spillets eget lys og spejlinger, ligesom
// Nedrivningsfirmaets ikoner. Farverne og banerne er enkle tegninger.
import * as THREE from '../3d-faelles/three.module.js';

export class Ikoner {
  constructor(renderer, miljø) {
    this.r = renderer;
    this.str = 160;
    this.mål = new THREE.WebGLRenderTarget(this.str, this.str, { samples: 4 });
    this.studie = new THREE.Scene();
    this.studie.environment = miljø;
    this.studie.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.5));
    const sol = new THREE.DirectionalLight(0xffffff, 3);
    sol.position.set(2, 4, 3);
    this.studie.add(sol);
    this.kamera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    this.cache = new Map();
  }

  // Tegn en model og giv den tilbage som et billede (data-adresse)
  // størrelse: tegn i en fast målestok (fx alle hjul ens), ellers fylder modellen billedet
  tegn(nøgle, lav, retning = [1.35, 0.9, 1.6], størrelse = 0) {
    if (this.cache.has(nøgle)) return this.cache.get(nøgle);
    const m = lav(), r = this.r, str = this.str;
    const box = new THREE.Box3().setFromObject(m), s = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const skala = 1 / (størrelse || Math.max(s.x, s.y, s.z));
    const holder = new THREE.Group();
    holder.add(m);
    m.position.copy(mid).multiplyScalar(-1);
    holder.scale.setScalar(skala);
    this.studie.add(holder);
    this.kamera.position.set(...retning).normalize().multiplyScalar(2.15);
    this.kamera.lookAt(0, 0, 0);
    const før = r.getClearColor(new THREE.Color()), førA = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.mål); r.clear(); r.render(this.studie, this.kamera);
    const px = new Uint8Array(str * str * 4);
    r.readRenderTargetPixels(this.mål, 0, 0, str, str, px);
    r.setRenderTarget(null); r.setClearColor(før, førA);
    this.studie.remove(holder);
    // Pixlerne vendes, og lyset gøres om til skærmens farver
    const c = document.createElement('canvas'); c.width = c.height = str;
    const g = c.getContext('2d'), billede = g.createImageData(str, str);
    for (let y = 0; y < str; y++) for (let x = 0; x < str; x++) {
      const i = ((str - 1 - y) * str + x) * 4, j = (y * str + x) * 4, a = px[j + 3] / 255;
      for (let k = 0; k < 3; k++) { const v = px[j + k] / 255 / Math.max(a, 1e-3); billede.data[i + k] = Math.min(255, Math.pow(v / (1 + v * 0.3), 1 / 2.2) * 285); }
      billede.data[i + 3] = px[j + 3];
    }
    g.putImageData(billede, 0, 0);
    const url = c.toDataURL();
    this.cache.set(nøgle, url);
    return url;
  }
}

export const billedeHtml = url => `<img src="${url}" alt="" draggable="false">`;
const svg = (indhold, boks = '0 0 64 64') => `<svg viewBox="${boks}" aria-hidden="true" focusable="false">${indhold}</svg>`;

export function farveIkon(farve) {
  const hex = '#' + farve.toString(16).padStart(6, '0');
  return svg(`<defs><radialGradient id="g${hex.slice(1)}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="${hex}"/><stop offset="1" stop-color="${hex}" stop-opacity=".85"/></radialGradient></defs>
    <circle cx="32" cy="32" r="25" fill="url(#g${hex.slice(1)})" stroke="rgba(0,0,0,.35)" stroke-width="2"/>`);
}

export const TOMIKON = svg('<circle cx="32" cy="32" r="21" fill="none" stroke="#8a9096" stroke-width="6"/><path d="M18 46L46 18" stroke="#8a9096" stroke-width="6" stroke-linecap="round"/>');
export const FARVEFANE = svg('<path d="M32 8C18 8 6 18 6 31c0 10 8 14 14 12 5-2 8 1 7 6-1 6 3 9 9 9 14 0 22-12 22-26S46 8 32 8z" fill="#d8d2c4"/><circle cx="20" cy="26" r="5" fill="#b3241e"/><circle cx="32" cy="18" r="5" fill="#e8a90c"/><circle cx="45" cy="24" r="5" fill="#2f7d34"/><circle cx="47" cy="38" r="5" fill="#1f4fa8"/>');

// Banerne: et foto af bygningen fra spillet selv (taget med prøveværktøjet, se LAESMIG)
const FIL = { vandtårn: 'vandtaarn' };
export const banefoto = id => `<img src="../skrot-og-brag/baner/${FIL[id] || id}.jpg" alt="" draggable="false">`;
