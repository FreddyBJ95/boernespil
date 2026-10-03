import { gulv } from './verden-data.js';

// En stille depotbil kører mellem værkstederne. Geometri og materialer deles med spillerens bil.
export function skabLiv(THREE, scene, model) {
  const bil = model.clone(true), hjul = [], mål = new THREE.Vector3();
  bil.scale.setScalar(.72);
  bil.traverse(o => {
    if (o.name.startsWith('hjul_')) hjul.push(o);
    if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; }
  });
  scene.add(bil);
  const vej = [[-325,-140],[-170,-130],[-20,-190],[-70,-265],[-245,-230],[-325,-140]];
  let kant = 0, langs = 34, rul = 0, venter = false, klar = false;
  function opdater(dt, spiller, aktiv) {
    venter = klar && Math.hypot(spiller.x - bil.position.x, spiller.z - bil.position.z) < 20 && Math.abs(spiller.y - bil.position.y - .8) < 6;
    const fart = aktiv && !venter ? 6 : 0;
    langs += fart * dt; rul += fart * dt / .46;
    let a = vej[kant], b = vej[kant + 1], dx = b[0] - a[0], dz = b[1] - a[1], længde = Math.hypot(dx, dz);
    while (langs >= længde) {
      langs -= længde; kant = (kant + 1) % (vej.length - 1);
      a = vej[kant]; b = vej[kant + 1]; dx = b[0] - a[0]; dz = b[1] - a[1]; længde = Math.hypot(dx, dz);
    }
    const x = a[0] + dx * langs / længde - dz / længde * 4.4;
    const z = a[1] + dz * langs / længde + dx / længde * 4.4;
    mål.set(x, gulv(x, z, .8).y, z);
    let forskel = Math.atan2(dx, dz) - bil.rotation.y;
    while (forskel > Math.PI) forskel -= Math.PI * 2;
    while (forskel < -Math.PI) forskel += Math.PI * 2;
    if (!klar) { bil.position.copy(mål); bil.rotation.y += forskel; klar = true; }
    else if (aktiv && !venter) {
      const afstandTil = bil.position.distanceTo(mål);
      bil.position.lerp(mål, Math.min(1 - Math.exp(-dt * 12), 8 * dt / Math.max(.001, afstandTil)));
      bil.rotation.y += forskel * (1 - Math.exp(-dt * 5));
    }
    hjul.forEach(h => h.rotation.x = rul);
    // En blød kontakt svarer til bygningernes sikre afvisning, uden skade eller straf.
    const afstand = Math.hypot(spiller.x - bil.position.x, spiller.z - bil.position.z);
    if (aktiv && afstand < 3.3 && Math.abs(spiller.y - bil.position.y - .8) < 3) {
      const nx = afstand > .01 ? (spiller.x - bil.position.x) / afstand : -dz / længde;
      const nz = afstand > .01 ? (spiller.z - bil.position.z) / afstand : dx / længde;
      spiller.x = bil.position.x + nx * 3.4; spiller.z = bil.position.z + nz * 3.4;
      spiller.fart *= .55; spiller.sidelæns = 0; spiller.slag = .15;
    }
  }
  opdater(0, { x: -275, y: .8, z: 220 }, false);
  return { opdater, get venter() { return venter; } };
}
