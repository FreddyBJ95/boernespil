import * as THREE from "../3d-faelles/three.module.js";

const MAKS = 1000;
const LOFT = { let: 250, auto: 600, flot: 1000 };
const klip = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const gyldigtPunkt = (p) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const VERTEX = `
  attribute float aSynlig;
  varying vec2 vUv;
  varying vec3 vFarve;
  varying float vSynlig;
  varying vec3 vPunkt;
  void main() {
    vUv=uv; vFarve=instanceColor; vSynlig=aSynlig; vPunkt=position;
    gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);
  }
`;
const FRAGMENT = `
  uniform sampler2D kort;
  varying vec2 vUv;
  varying vec3 vFarve;
  varying float vSynlig;
  void main() {
    float a=texture2D(kort,vUv).a*vSynlig;
    if(a<0.004) discard;
    gl_FragColor=vec4(vFarve,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// De to små teksturer er vores egne: flerlaget støj til støv og et blødt lys til gnister og ringe.
function lavKort(støv) {
  const side = 96, data = new Uint8Array(side * side * 4);
  const støj = (x, y) => {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const glatStøj = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(støj(ix, iy), støj(ix + 1, iy), sx),
      THREE.MathUtils.lerp(støj(ix, iy + 1), støj(ix + 1, iy + 1), sx),
      sy,
    );
  };
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const u = x / (side - 1), v = y / (side - 1), r = Math.hypot(u * 2 - 1, v * 2 - 1);
      const n = glatStøj(u * 5, v * 5) * .55 + glatStøj(u * 13, v * 13) * .3 + glatStøj(u * 29, v * 29) * .15;
      const a = støv ? klip((1 - r) * 2) ** 1.6 * (.24 + n * .76) : Math.exp(-r * r * 4.5) * klip((1 - r) * 8);
      const i = (x + y * side) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.floor(klip(a) * 255);
    }
  }
  const tekstur = new THREE.DataTexture(data, side, side);
  tekstur.minFilter = tekstur.magFilter = THREE.LinearFilter;
  tekstur.needsUpdate = true;
  return tekstur;
}

export class BrudEffekter {
  constructor(scene, camera, { canvas, blink, rolig = false, kvalitet = "auto", vedSkade = () => {} } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.blink = blink;
    this.vedSkade = vedSkade;
    this.ctx = canvas?.getContext?.("2d") || null;
    this.rolig = Boolean(rolig);
    this.afsluttet = false;
    this.kvalitet = Object.hasOwn(LOFT, kvalitet) ? kvalitet : "auto";
    this.loft = LOFT[this.kvalitet];
    this.rod = new THREE.Group();
    this.rod.name = "Brudpunkts egne puls- og støveffekter";
    scene.add(this.rod);
    this.kort = [lavKort(true), lavKort(false)];
    this.sæt = {};
    this.dummy = new THREE.Object3D();
    this.farve = new THREE.Color();
    this.punkt = new THREE.Vector3();
    this.partikler = Array.from({ length: MAKS }, () => ({ aktiv: false, r: 0, g: 0, b: 0 }));
    this.antal = 0;
    this.næste = 0;
    this.tid = 0;
    this.sidsteBlink = -100;
    this.flash = 0;
    this.ryst = 0;
    this.støv = 0;
    this.revner = [];
    this.skadet = false;
    this.tegnIgen = true;
    this.bredde = this.højde = 1;
    this.dpr = 1;
    this.lavSæt("støv", new THREE.PlaneGeometry(1, 1), false);
    this.lavSæt("glød", new THREE.PlaneGeometry(1, 1), true);
    this.lavSæt("gnist", new THREE.PlaneGeometry(1, 1), true);
    this.lavSæt("ring", new THREE.RingGeometry(.945, 1, 64), true);
    this.lavSæt("kerne", new THREE.SphereGeometry(1, 12, 8), true);
    this.lavSæt("splint", new THREE.TetrahedronGeometry(1), false, true);
    this.resize(canvas?.clientWidth || canvas?.width || 1, canvas?.clientHeight || canvas?.height || 1, 1);
  }

  // Seks faste tegnelag: ingen nye GPU-materialer eller geometrier under en kædereaktion.
  lavSæt(navn, geometri, lys, fast = false) {
    const synlig = new THREE.InstancedBufferAttribute(new Float32Array(MAKS), 1);
    synlig.setUsage(THREE.DynamicDrawUsage);
    geometri.setAttribute("aSynlig", synlig);
    const materiale = fast
      ? new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .25, roughness: .48 })
      : new THREE.ShaderMaterial({
        uniforms: { kort: { value: this.kort[navn === "støv" ? 0 : 1] } },
        vertexShader: VERTEX,
        fragmentShader: navn === "ring"
          ? FRAGMENT.replace("float a=texture2D(kort,vUv).a*vSynlig;", "float a=vSynlig;")
          : navn === "kerne"
          ? FRAGMENT.replace(
            "float a=texture2D(kort,vUv).a*vSynlig;",
            `
          float n=sin(vUv.x*34.0)*sin(vUv.y*23.0);
          float a=(0.76+n*0.2)*vSynlig;
        `,
          )
          : FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: lys ? THREE.AdditiveBlending : THREE.NormalBlending,
        side: THREE.DoubleSide,
        forceSinglePass: true,
        toneMapped: !lys,
      });
    const mesh = new THREE.InstancedMesh(geometri, materiale, MAKS);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAKS * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.renderOrder = lys ? 4 : navn === "støv" ? 3 : 0;
    this.sæt[navn] = { mesh, synlig, antal: 0 };
    this.rod.add(mesh);
  }

  // Den fælles pulje har et hårdt loft; gamle småpartikler viger for en ny vigtig hændelse.
  ny(slags, x, y, z, størrelse, levetid, farve, kraft = 1) {
    if (this.afsluttet) return null;
    let p;
    for (let i = 0; i < MAKS; i++) {
      const kandidat = this.partikler[this.næste++ % MAKS];
      if (!kandidat.aktiv) {
        p = kandidat;
        break;
      }
    }
    if (this.antal >= this.loft || !p) {
      p = this.partikler.find((v) => v.aktiv && (v.slags === "gnist" || v.slags === "splint")) ||
        this.partikler.find((v) => v.aktiv && v.slags === "støv");
      if (!p) return null;
    } else this.antal++;
    this.farve.setHex(farve);
    Object.assign(p, {
      aktiv: true,
      slags,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      alder: 0,
      levetid,
      størrelse,
      vækst: 0,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * 8,
      r: this.farve.r,
      g: this.farve.g,
      b: this.farve.b,
      kraft,
    });
    return p;
  }

  haendelse(h) {
    if (this.afsluttet || !gyldigtPunkt(h?.position) || !Number.isFinite(h.styrke)) return;
    const type = h.type === "pulsen" ? "puls" : h.type;
    if (!["puls", "brud", "kontakt"].includes(type)) return;
    const [x, y, z] = h.position, styrke = klip(h.styrke);
    if (styrke <= 0) return;
    if (type === "puls") {
      this.puls(x, y, z, styrke);
      this.kameraStød(h.position, styrke);
      return;
    }
    const materiale = h.materiale || h.mat || "beton";
    const farve = { glas: 0xbee9ec, metal: 0x8e9ea2, trae: 0xaa7346, beton: 0x9d9786 }[materiale] || 0x9d9786;
    const antal = Math.ceil((type === "brud" ? 6 : 2) * styrke * (this.kvalitet === "let" ? .6 : 1));
    for (let i = 0; i < antal; i++) {
      const p = this.ny("splint", x, y, z, .035 + Math.random() * .1, 1.2 + Math.random() * 1.4, farve);
      if (!p) break;
      const vinkel = Math.random() * Math.PI * 2;
      p.vx = Math.cos(vinkel) * (1 + styrke * 3);
      p.vz = Math.sin(vinkel) * (1 + styrke * 3);
      p.vy = 1 + Math.random() * 3 * styrke;
    }
    if (type === "brud" || styrke > .65) {
      const p = this.ny(
        "støv",
        x,
        Math.max(.12, y),
        z,
        .45 + styrke,
        1.8 + styrke * 1.4,
        materiale === "glas" ? 0xc2d6d3 : 0xa89c83,
        .24,
      );
      if (p) {
        p.vy = .25;
        p.vækst = .8;
        p.vx = (Math.random() - .5) * .6;
      }
    }
  }

  // Hver rigtig puls får en kort kerne, en jordnær trykring og støv, som løfter sig bagefter.
  puls(x, y, z, styrke) {
    const radius = 3.5 + styrke * 7.5;
    const ring = this.ny("ring", x, .055, z, radius * 1.65, .65 + styrke * .3, 0xf1bd75, .65);
    if (ring) ring.vækst = 1;
    for (let i = 0; i < 5; i++) {
      const p = this.ny(
        "kerne",
        x + (Math.random() - .5) * .6,
        y + i * .16,
        z + (Math.random() - .5) * .6,
        (.35 + styrke * 1.15) * (1 - i * .1),
        .25 + i * .07,
        i === 0 ? 0xffedb4 : 0xff8b38,
        .7,
      );
      if (p) {
        p.vy = .9 + i * .5;
        p.vækst = 2.6;
      }
    }
    for (let i = 0; i < 8; i++) {
      const p = this.ny(
        "glød",
        x,
        y + .3,
        z,
        1.2 + styrke * 2.5,
        .35 + Math.random() * .4,
        i < 3 ? 0xffbd53 : 0xf4772b,
        .8,
      );
      if (p) {
        p.vx = (Math.random() - .5) * 6;
        p.vz = (Math.random() - .5) * 6;
        p.vy = Math.random() * 3;
        p.vækst = 1;
      }
    }
    const antal = Math.floor((18 + styrke * 26) * (this.kvalitet === "let" ? .5 : this.kvalitet === "flot" ? 1.4 : 1));
    for (let i = 0; i < antal; i++) {
      const a = Math.random() * Math.PI * 2, fart = (2 + Math.random() * 5) * (.5 + styrke);
      const lav = i % 3 !== 0;
      const p = this.ny(
        "støv",
        x + Math.cos(a) * .3,
        lav ? .18 : y,
        z + Math.sin(a) * .3,
        .6 + Math.random() * 1.2,
        2.3 + Math.random() * 2,
        lav ? 0xb9a98d : 0x79746b,
        lav ? .34 : .46,
      );
      if (p) {
        p.vx = Math.cos(a) * fart;
        p.vz = Math.sin(a) * fart;
        p.vy = lav ? .12 : .6 + Math.random() * 1.4;
        p.vækst = .75;
      }
    }
    for (let i = 0; i < antal * .55; i++) {
      const a = Math.random() * Math.PI * 2;
      const p = this.ny("gnist", x, y, z, .04 + Math.random() * .045, .4 + Math.random() * .9, 0xffd196, .9);
      if (p) {
        p.vx = Math.cos(a) * (3 + Math.random() * 8);
        p.vz = Math.sin(a) * (3 + Math.random() * 8);
        p.vy = 2 + Math.random() * 7;
      }
    }
  }

  kameraStød(position, styrke) {
    const afstand = this.camera.position.distanceTo(this.punkt.fromArray(position));
    const tryk = klip(1 - afstand / (8 + styrke * 8)) * styrke;
    if (tryk < .025) return;
    this.støv = Math.max(this.støv, tryk * .3);
    if (!this.rolig) this.ryst = Math.max(this.ryst, tryk * .2);
    if (this.tid - this.sidsteBlink >= .8) {
      this.flash = Math.max(this.flash, tryk * (this.rolig ? .025 : .22));
      this.sidsteBlink = this.tid;
    }
    if (tryk > .09 && this.revner.length < 4) {
      this.punkt.fromArray(position).project(this.camera);
      this.lavRevne(
        Number.isFinite(this.punkt.x) ? klip(this.punkt.x * .5 + .5, .14, .86) : .53,
        Number.isFinite(this.punkt.y) ? klip(.5 - this.punkt.y * .5, .15, .85) : .47,
        tryk,
      );
      if (!this.skadet) {
        this.skadet = true;
        this.vedSkade(true);
      }
    }
    this.tegnIgen = true;
  }

  // Revnegeometrien gemmes som relative punkter, så den overlever rotation og størrelsesskift.
  lavRevne(x, y, tryk) {
    const stråler = [], antal = 13 + Math.floor(tryk * 5), start = Math.random() * 6;
    for (let i = 0; i < antal; i++) {
      const vinkel = start + i / antal * Math.PI * 2;
      const længde = .18 + Math.random() * .65, punkter = [[x, y]], grene = [];
      for (let j = 1; j <= 7; j++) {
        const afstand = længde * (j / 7), skæv = (Math.random() - .5) * .035;
        const p = [x + Math.cos(vinkel) * afstand + skæv, y + Math.sin(vinkel) * afstand + skæv];
        punkter.push(p);
        if (j === 3 || j === 5) {
          const a = vinkel + (Math.random() > .5 ? 1 : -1) * (.3 + Math.random() * .55);
          grene.push([p, [p[0] + Math.cos(a) * .08, p[1] + Math.sin(a) * .08], [
            p[0] + Math.cos(a + .12) * .15,
            p[1] + Math.sin(a + .12) * .15,
          ]]);
        }
      }
      stråler.push({ punkter, grene });
    }
    this.revner.push({ x, y, stråler });
  }

  tick(dt, virkeligDt = dt) {
    if (this.afsluttet) return [0, 0, 0];
    dt = Number.isFinite(dt) ? klip(dt, 0, .1) : 0;
    virkeligDt = Number.isFinite(virkeligDt) ? klip(virkeligDt, 0, .1) : 0;
    this.tid += virkeligDt;
    for (const sæt of Object.values(this.sæt)) sæt.antal = 0;
    for (const p of this.partikler) {
      if (!p.aktiv) continue;
      p.alder += dt;
      if (p.alder >= p.levetid) {
        p.aktiv = false;
        this.antal--;
        continue;
      }
      const u = p.alder / p.levetid;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.slags === "gnist" || p.slags === "splint") {
        p.vy -= 9.8 * dt;
        if (p.y < .06) {
          p.y = .06;
          p.vy = Math.abs(p.vy) * .3;
          p.vx *= .65;
          p.vz *= .65;
        }
      } else if (p.slags === "støv") {
        const bremse = Math.exp(-dt * 1.4);
        p.vx *= bremse;
        p.vz *= bremse;
        p.vy += dt * .14;
      }
      const sæt = this.sæt[p.slags], i = sæt.antal++;
      let størrelse = p.størrelse * (1 + p.alder * p.vækst), alpha = p.kraft * (1 - u) ** 1.1;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.quaternion.copy(this.camera.quaternion);
      this.dummy.scale.setScalar(størrelse);
      if (p.slags === "ring") {
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.setScalar(p.størrelse * (.04 + 1 - (1 - u) ** 2));
      } else if (p.slags === "splint") {
        this.dummy.rotation.set(p.rotation + p.alder * p.spin, p.rotation * .7 + p.alder * 2, p.alder * 3);
        this.dummy.scale.set(størrelse, størrelse * .55, størrelse * .4);
        if (u > .8) this.dummy.scale.multiplyScalar((1 - u) * 5);
      } else {
        this.dummy.rotateZ(p.rotation + p.alder * p.spin * .08);
        if (p.slags === "gnist") this.dummy.scale.set(størrelse * .5, størrelse * 3.2, størrelse);
        if (p.slags === "støv") alpha *= klip(u * 12);
      }
      this.dummy.updateMatrix();
      sæt.mesh.setMatrixAt(i, this.dummy.matrix);
      this.farve.setRGB(p.r, p.g, p.b);
      sæt.mesh.setColorAt(i, this.farve);
      sæt.synlig.setX(i, alpha);
    }
    for (const sæt of Object.values(this.sæt)) {
      sæt.mesh.count = sæt.antal;
      if (!sæt.antal) continue;
      sæt.mesh.instanceMatrix.needsUpdate = true;
      sæt.mesh.instanceColor.needsUpdate = true;
      sæt.synlig.needsUpdate = true;
    }
    this.flash *= Math.exp(-virkeligDt * 18);
    this.ryst *= Math.exp(-virkeligDt * 6);
    this.støv *= Math.exp(-virkeligDt * 1.8);
    if (this.blink?.style) this.blink.style.opacity = this.flash < .001 ? "0" : String(this.flash);
    if (this.tegnIgen || this.støv > .002) this.tegnObjektiv();
    const r = this.rolig ? 0 : this.ryst;
    return [Math.sin(this.tid * 61) * r, Math.sin(this.tid * 49 + 1) * r * .6, Math.sin(this.tid * 71) * r * .4];
  }

  tegnObjektiv() {
    const c = this.ctx;
    if (!c) return;
    const w = this.bredde, h = this.højde;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    this.tegnIgen = false;
    if (this.revner.length) {
      const gradient = c.createRadialGradient(w * .5, h * .5, h * .15, w * .5, h * .5, Math.hypot(w, h) * .6);
      gradient.addColorStop(0, "rgba(9,24,28,0)");
      gradient.addColorStop(1, this.rolig ? "rgba(9,24,28,.09)" : "rgba(9,24,28,.2)");
      c.fillStyle = gradient;
      c.fillRect(0, 0, w, h);
    }
    const streg = (punkter, farve, bredde, forskyd = 0) => {
      c.beginPath();
      punkter.forEach((p, i) =>
        i === 0 ? c.moveTo(p[0] * w + forskyd, p[1] * h + forskyd) : c.lineTo(p[0] * w + forskyd, p[1] * h + forskyd)
      );
      c.strokeStyle = farve;
      c.lineWidth = bredde;
      c.stroke();
    };
    const alpha = this.rolig ? .52 : 1;
    c.globalAlpha = alpha;
    c.lineJoin = "round";
    for (const revne of this.revner) {
      for (let i = 0; i < revne.stråler.length; i++) {
        const stråle = revne.stråler[i], nabo = revne.stråler[(i + 1) % revne.stråler.length];
        if (i % 3 === 0) {
          c.beginPath();
          c.moveTo(revne.x * w, revne.y * h);
          c.lineTo(stråle.punkter[5][0] * w, stråle.punkter[5][1] * h);
          c.lineTo(nabo.punkter[4][0] * w, nabo.punkter[4][1] * h);
          c.closePath();
          c.fillStyle = i % 2 ? "rgba(148,209,219,.055)" : "rgba(243,239,211,.085)";
          c.fill();
        }
        streg(stråle.punkter, "rgba(12,25,29,.7)", 2.7);
        streg(stråle.punkter, "rgba(235,255,255,.86)", .85, -.75);
        for (const gren of stråle.grene) {
          streg(gren, "rgba(16,35,38,.42)", 1.8);
          streg(gren, "rgba(242,255,255,.66)", .65, -.6);
        }
        if (i % 2 === 0) {
          const web = [stråle.punkter[2], nabo.punkter[3]];
          streg(web, "rgba(223,249,250,.5)", .6);
        }
      }
    }
    c.globalAlpha = 1;
    if (this.støv > .002) {
      c.fillStyle = `rgba(202,181,137,${this.støv * .25})`;
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 23; i++) {
        c.beginPath();
        c.ellipse(((i * .381966) % 1) * w, ((i * .618034) % 1) * h, 4 + i % 8, 2 + i % 5, i, 0, Math.PI * 2);
        c.fillStyle = `rgba(118,108,86,${this.støv * .32})`;
        c.fill();
      }
      this.tegnIgen = true;
    }
  }

  resize(bredde, højde, dpr = 1) {
    if (![bredde, højde, dpr].every(Number.isFinite) || bredde <= 0 || højde <= 0) return;
    this.bredde = Math.min(8192, bredde);
    this.højde = Math.min(8192, højde);
    this.dpr = klip(dpr, .5, 2);
    this.dpr = Math.min(this.dpr, Math.sqrt(8000000 / (this.bredde * this.højde)));
    if (this.canvas) {
      this.canvas.width = Math.round(this.bredde * this.dpr);
      this.canvas.height = Math.round(this.højde * this.dpr);
    }
    this.tegnIgen = true;
    this.tegnObjektiv();
  }

  saetRolig(rolig) {
    this.rolig = Boolean(rolig);
    if (this.rolig) {
      this.ryst = 0;
      this.flash = Math.min(this.flash, .025);
    }
    this.tegnIgen = true;
  }

  saetKvalitet(kvalitet) {
    if (!Object.hasOwn(LOFT, kvalitet)) return;
    this.kvalitet = kvalitet;
    this.loft = LOFT[kvalitet];
    for (const p of this.partikler) {
      if (this.antal <= this.loft) break;
      if (p.aktiv) {
        p.aktiv = false;
        this.antal--;
      }
    }
  }

  nulstilObjektiv() {
    this.revner.length = 0;
    if (this.skadet) {
      this.skadet = false;
      this.vedSkade(false);
    }
    this.tegnIgen = true;
    this.tegnObjektiv();
  }

  nulstil() {
    for (const p of this.partikler) p.aktiv = false;
    this.antal = 0;
    for (const sæt of Object.values(this.sæt)) sæt.mesh.count = 0;
    this.flash = this.ryst = this.støv = 0;
    this.sidsteBlink = -100;
    if (this.blink?.style) this.blink.style.opacity = "0";
    this.nulstilObjektiv();
  }

  frigiv() {
    if (this.afsluttet) return;
    this.nulstil();
    this.afsluttet = true;
    this.scene.remove(this.rod);
    for (const sæt of Object.values(this.sæt)) {
      sæt.mesh.dispose?.();
      sæt.mesh.geometry.dispose();
      sæt.mesh.material.dispose();
    }
    for (const kort of this.kort) kort.dispose();
    this.rod.clear();
  }
}
