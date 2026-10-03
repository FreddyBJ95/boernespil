import * as THREE from "../3d-faelles/three.module.js";
import { GLTFLoader } from "../3d-faelles/GLTFLoader.js";
import { kanGå, tilfældig } from "./eventyr.js";

export const STEDER = [
  { id: "mira", navn: "Mira · værkstedet", x: 2, z: 0, type: "mira" },
  { id: "grotte0", navn: "Mosgrotten", x: -43, z: 8, type: "grotte", grotte: 0 },
  { id: "grotte1", navn: "Spejlgrotten", x: 35, z: -32, type: "grotte", grotte: 1 },
  { id: "grotte2", navn: "Kobberdybet", x: -5, z: -45, type: "grotte", grotte: 2 },
  { id: "portal", navn: "Stjerneporten", x: 0, z: -58, type: "portal" },
];

// Biblioteket består alene af vores modeller, der er bygget og eksporteret i Blender.
export async function hentModeller() {
  const gltf = await new GLTFLoader().loadAsync("./modeller/eventyr.glb");
  const modeller = {};
  for (const obj of gltf.scene.children) modeller[obj.name] = obj;
  return modeller;
}

// Statiske gentagelser deler geometri og tegnes i ganske få kald.
export function instanser(rod, modeller, navn, steder) {
  if (!steder.length || !modeller[navn]) return;
  const kilde = modeller[navn];
  kilde.updateMatrixWorld(true);
  const m = new THREE.Matrix4(), basis = new THREE.Matrix4(), q = new THREE.Quaternion();
  kilde.traverse((del) => {
    if (!del.isMesh) return;
    const samlet = new THREE.InstancedMesh(del.geometry, del.material, steder.length);
    steder.forEach((s, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.drej || 0);
      const skala = s.skala || 1;
      basis.compose(new THREE.Vector3(s.x, s.y || 0, s.z), q, new THREE.Vector3(skala, skala, skala));
      m.multiplyMatrices(basis, del.matrixWorld);
      samlet.setMatrixAt(i, m);
    });
    samlet.castShadow = true;
    samlet.receiveShadow = true;
    rod.add(samlet);
  });
}

export function kopi(modeller, navn, x = 0, z = 0, skala = 1) {
  const obj = modeller[navn].clone(true);
  obj.position.set(x, 0, z);
  obj.scale.setScalar(skala);
  obj.traverse((del) => {
    if (del.isMesh) {
      del.castShadow = true;
      del.receiveShadow = true;
    }
  });
  return obj;
}

// Terrænets farvede øer og stier gør skov, landsby og ruiner lette at kende.
function plet(rod, x, z, r, farve, y = .01) {
  const geo = new THREE.CircleGeometry(r, 32);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: farve, roughness: 1 }));
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  rod.add(mesh);
}
function sti(rod, a, b, bredde = 2.6) {
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(bredde, d),
    new THREE.MeshStandardMaterial({ color: 0x8a866b, roughness: 1 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = Math.atan2(b.x - a.x, b.z - a.z);
  mesh.position.set((a.x + b.x) / 2, .025, (a.z + b.z) / 2);
  mesh.receiveShadow = true;
  rod.add(mesh);
}

export function bygØ(modeller, frø) {
  const rod = new THREE.Group(), rnd = tilfældig(frø), blokering = [], fjender = [], ting = [];
  const bund = new THREE.Mesh(
    new THREE.CylinderGeometry(72, 64, 7, 64),
    new THREE.MeshStandardMaterial({ color: 0x567e6c, roughness: 1 }),
  );
  bund.position.y = -3.5;
  bund.receiveShadow = true;
  rod.add(bund);
  const hav = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: 0x244759, roughness: .38, metalness: .25 }),
  );
  hav.rotation.x = -Math.PI / 2;
  hav.position.y = -5;
  rod.add(hav);
  plet(rod, 0, 0, 15, 0x899782);
  plet(rod, -36, 10, 22, 0x355f56);
  plet(rod, 34, 0, 22, 0x647e77);
  plet(rod, 10, -43, 22, 0x546377);
  for (const s of STEDER.slice(1)) sti(rod, { x: 0, z: 0 }, s);
  const huse = [{ x: -7, z: -6, drej: .1 }, { x: 9, z: 6, drej: Math.PI }, { x: -8, z: 6, drej: .4 }, {
    x: 8,
    z: -7,
    drej: -.15,
  }];
  instanser(rod, modeller, "hus", huse);
  huse.forEach((s) => blokering.push({ ...s, r: 2.6 }));
  instanser(rod, modeller, "tårn", [{ x: -12, z: -9, skala: 1.3 }]);
  blokering.push({ x: -12, z: -9, r: 1.8 });
  instanser(rod, modeller, "brønd", [{ x: 0, z: 0 }]);
  blokering.push({ x: 0, z: 0, r: 1.1 });
  instanser(rod, modeller, "portal", [{ x: 0, z: -58, skala: 1.7 }, { x: -43, z: 8, drej: 1.3 }, { x: 35, z: -32, drej: -.4 }, {
    x: -5,
    z: -45,
    drej: .2,
  }]);
  const træer = [], birke = [], klipper = [], krystaller = [], terræn = [];
  for (let i = 0; i < 180; i++) {
    const x = (rnd() - .5) * 132, z = (rnd() - .5) * 132;
    if (Math.hypot(x, z) > 67 || Math.hypot(x, z) < 17 || STEDER.some((s) => Math.hypot(x - s.x, z - s.z) < 5)) continue;
    const s = { x, z, skala: .8 + rnd() * .65, drej: rnd() * 6 };
    if (x < -15 || z > 20) træer.push(s);
    else birke.push(s);
    if (i % 3 === 0) blokering.push({ x, z, r: .5 });
  }
  for (let i = 0; i < 44; i++) {
    const x = (rnd() - .5) * 132, z = (rnd() - .5) * 132;
    if (Math.hypot(x, z) > 66 || Math.hypot(x, z) < 17 || STEDER.some((s) => Math.hypot(x - s.x, z - s.z) < 5)) continue;
    klipper.push({ x, z, skala: .6 + rnd() * 1.1, drej: rnd() * 6 });
  }
  for (let i = 0; i < 24; i++) {
    const vinkel = rnd() * Math.PI * 2, r = 20 + rnd() * 40;
    const x = Math.sin(vinkel) * r, z = Math.cos(vinkel) * r;
    krystaller.push({ x, z, skala: .75 + rnd() * .6, drej: rnd() * 6 });
    ting.push({ id: `ø-krystal-${i}`, type: "krystal", x: x + 1.4, z: z + 1.4 });
  }
  for (let i = 0; i < 14; i++) {
    terræn.push({
      x: Math.cos(i / 14 * Math.PI * 2) * 67,
      z: Math.sin(i / 14 * Math.PI * 2) * 67,
      y: -.5,
      skala: 1 + rnd() * .6,
    });
  }
  instanser(rod, modeller, "træ", træer);
  instanser(rod, modeller, "birk", birke);
  instanser(rod, modeller, "klippe", klipper);
  instanser(rod, modeller, "krystal", krystaller);
  instanser(rod, modeller, "terrænmodul", terræn);
  instanser(rod, modeller, "søjle", [{ x: 27, z: -7 }, { x: 33, z: -7 }, { x: 39, z: -7 }, { x: 27, z: 7 }, { x: 33, z: 7 }, {
    x: 39,
    z: 7,
  }]);
  instanser(rod, modeller, "ruinbue", [{ x: 33, z: -10, skala: 1.7 }, { x: 41, z: 3, drej: 1.2 }, { x: -31, z: 16, drej: .4 }]);
  for (
    const [i, s] of [{ x: -30, z: 24 }, { x: -50, z: -8 }, { x: 34, z: 5 }, { x: 43, z: 18 }, { x: 13, z: -36 }, {
      x: -20,
      z: -26,
    }].entries()
  ) ting.push({ ...s, type: "kiste", id: `ø-kiste-${i}` });
  for (
    const [i, s] of [
      { x: 28, z: 1 },
      { x: 36, z: 11 },
      { x: 43, z: -9 },
      { x: 24, z: -12 },
      { x: -34, z: 16 },
      { x: -48, z: 0 },
      { x: -30, z: -10 },
      { x: 18, z: -31 },
      { x: 31, z: -39 },
      { x: -17, z: -40 },
      { x: 5, z: 34 },
      { x: -16, z: 39 },
    ].entries()
  ) fjender.push({ ...s, id: `ø-fjende-${i}`, art: i < 4 ? "stenvogter" : i % 2 ? "slim" : "krystaldyr", boss: false });
  return { rod, blokering, fjender, ting, steder: STEDER, grotte: null };
}

// Ydervægge udelades ved forbindelserne, så alle genererede kamre kan nås.
export function bygGrotte(modeller, grotte) {
  const rod = new THREE.Group(), gulve = [], vægge = [], krystaller = [];
  const kendt = new Set(grotte.rum.map((r) => `${r.x},${r.z}`));
  for (const r of grotte.rum) {
    const x = r.x * 8, z = r.z * 8;
    gulve.push({ x, z });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!kendt.has(`${r.x + dx},${r.z + dz}`)) vægge.push({ x: x + dx * 4, z: z + dz * 4, drej: dx ? Math.PI / 2 : 0 });
    }
    if ((r.x + r.z) % 3 === 0) krystaller.push({ x: x - 2.5, z: z - 2.5, skala: .5 });
  }
  instanser(rod, modeller, "gulvmodul", gulve);
  instanser(rod, modeller, "vægmodul", vægge);
  instanser(rod, modeller, "krystal", krystaller);
  const forstavelse = `g${grotte.id}-${grotte.frø}-${grotte.dybde}-`;
  const ting = grotte.ting.filter((t) => t.type !== "fjende").map((t) => ({ ...t, id: forstavelse + t.id }));
  const fjender = grotte.ting.filter((t) => t.type === "fjende").map((t) => ({ ...t, id: forstavelse + t.id, boss: false }));
  const steder = [{ id: "udgang", navn: "Tilbage til Lysvig", type: "udgang", x: 0, z: 1 }];
  const x = grotte.slut.x * 8, z = grotte.slut.z * 8;
  if (grotte.dybde === 1) {
    steder.push({ id: "trappe", navn: "Ned til dybde 2", type: "trappe", x, z });
    instanser(rod, modeller, "portal", [{ x, z, skala: .8 }]);
  } else {fjender.push({
      id: `boss-${grotte.id}`,
      x,
      z,
      art: ["slim", "krystaldyr", "stenvogter"][grotte.id],
      boss: true,
      grotte: grotte.id,
    });}
  instanser(rod, modeller, "ruinbue", [{ x: 0, z: 2, skala: .6 }]);
  return { rod, blokering: [], fjender, ting, steder, grotte };
}

export function frit(verden, x, z) {
  if (verden.grotte) return kanGå(verden.grotte, x, z, .42);
  return Math.hypot(x, z) < 68 && !verden.blokering.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + .42);
}

// Figurerne får en tydelig gårytme i stedet for at glide over gulvet.
export function animer(obj, tid, fart = 1, art = "eventyrer") {
  obj.traverse((del) => {
    if (del.name.startsWith("benVenstre")) del.rotation.x = Math.sin(tid * 9) * .38 * fart;
    if (del.name.startsWith("benHøjre")) del.rotation.x = -Math.sin(tid * 9) * .38 * fart;
    if (del.name.startsWith("armVenstre")) del.rotation.x = -Math.sin(tid * 9) * .22 * fart;
    if (del.name.startsWith("armHøjre")) del.rotation.x = Math.sin(tid * 9) * .22 * fart;
    if (art === "krystaldyr" && del.name.startsWith("ben")) {
      del.rotation.x = Math.sin(tid * 8 + del.position.x * 3 + del.position.z * 3) * .28 * fart;
    }
    if (art === "krystaldyr" && del.name.startsWith("hoved")) del.rotation.x = Math.sin(tid * 3) * .1;
  });
  if (art === "slim") obj.scale.y = obj.userData.skala * (1 + Math.sin(tid * 5) * .09);
}
