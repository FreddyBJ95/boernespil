// ===== Ruderne: vinduer i bygningerne, der knuses af trykbølgen =====
// Hvert vindue er en tynd plade med ramme og sprosser (tegnet på et lærred) og mørkt glas, der spejler himlen.
// Ruden sidder på en del af muren. Rykker delen sig, eller når trykbølgen frem, går ruden i stykker.

import * as THREE from "../3d-faelles/three.module.js";

function vinduesTekstur() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  // glasset: mørkt med et svagt skær af himmel foroven og lidt snavs
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#5d6a74"); gr.addColorStop(0.45, "#2a333b"); gr.addColorStop(1, "#1a2026");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,110,95,${Math.random() * 0.06})`; g.beginPath(); g.arc(Math.random() * 256, 150 + Math.random() * 106, 10 + Math.random() * 40, 0, 6.3); g.fill(); }
  // gardin i nogle vinduer gøres med farven pr. rude; her: rammen og sprossen
  g.strokeStyle = "#e9e6de"; g.lineWidth = 16; g.strokeRect(8, 8, 240, 240);
  g.lineWidth = 9; g.beginPath(); g.moveTo(128, 8); g.lineTo(128, 248); g.moveTo(8, 92); g.lineTo(248, 92); g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2; g.strokeRect(17, 17, 222, 222);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);

export class Ruder {
  constructor(scene, n = 1500) {
    const mat = new THREE.MeshStandardMaterial({ map: vinduesTekstur(), roughness: 0.12, metalness: 0.15, envMapIntensity: 1.6 });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, n);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.receiveShadow = true;
    this.mesh.setColorAt(0, new THREE.Color(1, 1, 1));
    scene.add(this.mesh);
    this.n = n; this.alle = new Set(); this.ledige = []; this.vedKnus = null; this.venter = [];
  }
  tøm() { this.mesh.count = 0; this.alle.clear(); this.ledige.length = 0; this.venter.length = 0; this.mesh.instanceMatrix.needsUpdate = true; }
  // En rude på delen: lok = midten i delens eget rum, b × h i meter, yaw = hvilken vej ruden vender (i delens rum)
  lav(del, lok, b, h, yaw) {
    const i = this.ledige.length ? this.ledige.pop() : this.mesh.count < this.n ? this.mesh.count++ : -1;
    if (i < 0) return null;
    const p = lok.clone().applyQuaternion(del.oprQ).add(del.oprPos);
    const q = del.oprQ.clone().multiply(tmpQ.setFromAxisAngle(Y, yaw));
    tmpM.compose(p, q, tmpS.set(b, h, 1)); this.mesh.setMatrixAt(i, tmpM);
    const l = 0.75 + Math.random() * 0.35;
    this.mesh.setColorAt(i, new THREE.Color(l, l, l * (0.95 + Math.random() * 0.1)));
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
    const v = { i, del, p, normal: new THREE.Vector3(0, 0, 1).applyQuaternion(q), b, h, hel: true };
    del.vinduer.push(v); this.alle.add(v);
    return v;
  }
  knus(v, fra = null) {
    if (!v.hel) return;
    v.hel = false; this.alle.delete(v);
    this.mesh.setMatrixAt(v.i, tmpM.makeScale(0, 0, 0)); this.mesh.instanceMatrix.needsUpdate = true;
    this.ledige.push(v.i);
    this.vedKnus?.(v, fra);
  }
  // Trykbølgen: ruder inden for radius knuses, når bølgen når frem (lyden går 343 m i sekundet)
  trykbølge(p, radius) {
    for (const v of this.alle) {
      const a = v.p.distanceTo(p);
      if (a < radius * (0.7 + Math.random() * 0.5)) this.venter.push({ v, t: a / 343 + Math.random() * 0.04, fra: p.clone() });
    }
  }
  opdater(dt) {
    if (!this.venter.length) return;
    this.venter = this.venter.filter(x => { x.t -= dt; if (x.t <= 0) { this.knus(x.v, x.fra); return false; } return true; });
  }
}
