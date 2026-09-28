// ===== Verdenerne i Broekraft =====
// Tilføj en ny verden: kopiér en blok i VERDENER og skriv en ny opskrift (generer).
//  himmel:  [farve foroven, farve ved horisonten] · tåge: [start, slut] i blokke · hav: farve eller null
//  sol:     farve på den firkantede sol/måne (null = ingen) · solStr: størrelse · stjerner: true/false
//  jordklode: true viser Jorden på himlen · skyer: farve eller null
//  lys:     [himmellys, jordlys, styrke, sollys-styrke] (bruges på dyrene)
//  stemning: musikken — "rolig" | "uhyggelig" | "glad" | "rum" · tyngde: 28 er normalt (lavere = hop højere)
//  dyr:     hvilke dyr der bor der · antal: hvor mange · genfød: nye dyr dukker op når nogle forsvinder
//  størrelse: [bredde, højde, dybde], når man spiller alene (højden skal gå op i 16) — ellers 64 × 32 × 64
//  hotbar:  det man starter med: bloknavne fra blokke.js, "v:gevær" = værktøj (vaerktoej.js), "æg:ko" = dyre-æg
//  vis:     tre blokke der vises på verdens-kortet · skyd: balloner, kampvogne og point · fyrværkeri: nytårsnat
//  sne:     true = sne der falder · "gløder" = gnister der stiger op · lavahav: havet er lava (man hopper ud af det)
//  brand:   huse, der af og til brænder (brand.js) · point: vis ⭐-tælleren
//  undervand: hele verdenen er under vandet — man svømmer overalt, og overfladen er langt oppe
//  vand:    "chokolade" = floderne og havet er af chokolade
//  vulkan:  (BX, BZ) => [x, z] — hvor vulkanen står (den ryger og går af og til i udbrud i spil.js)
//  generer: opskriften på terrænet — får værktøjer fra verden.js (terræn, pynt, sæt, hent, R, støj …)

// Hvor vulkanen i Dinodalen står (bruges både af opskriften og af spil.js)
const dinoVulkan = (BX, BZ) => [Math.min(BX - 22, BX / 2 + 30), Math.max(22, BZ / 2 - 28)];

export const VERDENER = [
  {
    id: "græsø", navn: "Græsøen", ikon: "🌳", tekst: "Den grønne ø med træer, blomster og mærkelige dyr.",
    himmel: ["#4a9df5", "#cde8ff"], tåge: [30, 72], hav: "#3f8fe0", sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#7a9a5a", 2.2, 1.4], stemning: "rolig", tyngde: 28,
    dyr: ["ko", "gris", "faar", "hone", "fro", "and", "snegl"], antal: 10,
    hotbar: ["Græs", "Planker", "Sten", "Glas", "Rød uld", "v:vand", "v:tænder", "TNT", "æg:?"],
    vis: ["Græs", "Træstamme", "Blade"],
    hent: ["Planter træer…", "Sår blomster…", "Vækker dyrene…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a;
      a.terræn((x, z) => {
        const midt = Math.min(1, Math.hypot(x - BX / 2, z - BZ / 2) / 14);
        return Math.round(10 + (støj(x / 18, z / 18) * 7 + støj(x / 7 + 50, z / 7 + 20) * 2.5 - 4.5) * (0.35 + 0.65 * midt));
      }, (x, z, y, h) => {
        const sand = støj(x / 11 + 200, z / 11 + 100) > 0.7;
        return y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? (sand ? ID.Sand : ID.Jord) : (sand ? ID.Sand : ID["Græs"]);
      });
      for (let n = 0; n < a.antal(28); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = top[x + z * BX];
        if (a.hent(x, h, z) !== ID["Græs"] || a.nærStart(x, z, 5)) continue;
        const hs = 4 + Math.floor(R() * 2);
        for (let y = 1; y <= hs; y++) a.sæt(x, h + y, z, ID.Træstamme);
        for (let dy = -2; dy <= 1; dy++) {
          const r = dy >= 0 ? 1 : 2;
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && R() < 0.7) continue;
            if (dy === 1 && Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
            if (a.hent(x + dx, h + hs + dy, z + dz) === 0) a.sæt(x + dx, h + hs + dy, z + dz, ID.Blade);
          }
        }
      }
      a.pynt(a.antal(70), () => (R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]), [ID["Græs"]]);
    },
  },

  {
    id: "zombie", navn: "Zombieverdenen", ikon: "🧟", tekst: "Skumringsland med fjollede zombier og spøgelser. Tryk på dem, så bliver de til konfetti.",
    himmel: ["#2a1b4d", "#8a5a9c"], tåge: [20, 58], hav: "#3a2a5a", sol: "#f2f0e0", solStr: 44, stjerner: true, skyer: "#6a5a7a",
    lys: ["#c8b0ff", "#40305a", 1.7, 0.9], stemning: "uhyggelig", tyngde: 28,
    dyr: ["zombie", "zombie", "zombiehone", "spogelse"], antal: 9, genfød: true,
    hotbar: ["Mørkt græs", "Gravsten", "Græskar", "Lygtemand", "Død stamme", "v:vand", "v:tænder", "TNT", "æg:zombie"],
    vis: ["Mørkt græs", "Gravsten", "Lygtemand"],
    hent: ["Graver gravsten ned…", "Tænder lygtemænd…", "Vækker zombierne… uuuh!"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a;
      a.terræn((x, z) => Math.round(9 + støj(x / 16, z / 16) * 6 + støj(x / 6 + 30, z / 6) * 2 - 3),
        (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? ID.Jord : ID["Mørkt græs"]));
      // små kirkegårde
      for (let g = 0; g < a.antal(5); g++) {
        const cx = 4 + Math.floor(R() * (BX - 12)), cz = 4 + Math.floor(R() * (BZ - 12));
        if (a.nærStart(cx + 2, cz + 2, 7)) continue;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const x = cx + i * 2, z = cz + j * 2;
          if (R() < 0.8 && a.hent(x, top[x + z * BX], z) === ID["Mørkt græs"]) a.sæt(x, top[x + z * BX] + 1, z, ID.Gravsten);
        }
      }
      // døde træer med spindelvæv
      for (let n = 0; n < a.antal(22); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = top[x + z * BX];
        if (a.hent(x, h, z) !== ID["Mørkt græs"] || a.hent(x, h + 1, z) !== 0 || a.nærStart(x, z, 5)) continue;
        const hs = 4 + Math.floor(R() * 3);
        for (let y = 1; y <= hs; y++) a.sæt(x, h + y, z, ID["Død stamme"]);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (R() < 0.45) {
            const yy = h + hs - 1 - Math.floor(R() * 2), l = 1 + Math.floor(R() * 2);
            for (let k = 1; k <= l; k++) a.sæt(x + dx * k, yy + (k > 1 ? 1 : 0), z + dz * k, ID["Død stamme"]);
          } else if (R() < 0.35) a.sæt(x + dx, h + 1 + Math.floor(R() * 3), z + dz, ID.Spindelvæv);
        }
      }
      a.pynt(a.antal(40), () => (R() < 0.5 ? ID.Græskar : ID.Lygtemand), [ID["Mørkt græs"]]);
      a.pynt(a.antal(30), ID["Lille svamp"], [ID["Mørkt græs"]]);
    },
  },

  {
    id: "svampe", navn: "Svampeverdenen", ikon: "🍄", tekst: "Kæmpe svampe du kan hoppe på! Boing!",
    himmel: ["#b58cff", "#ffd6f2"], tåge: [28, 70], hav: "#8a6fe0", sol: "#fff0a0", skyer: "#ffe0f5",
    lys: ["#fff0ff", "#9a7ab0", 2.2, 1.2], stemning: "glad", tyngde: 28,
    dyr: ["svampeko", "hoppesvamp", "hoppesvamp", "fro", "snegl"], antal: 10,
    hotbar: ["Svampejord", "Rød svamp", "Blå svamp", "Svampestok", "Lille svamp", "v:vand", "v:tænder", "TNT", "æg:hoppesvamp"],
    vis: ["Rød svamp", "Svampestok", "Blå svamp"],
    hent: ["Gror kæmpe svampe…", "Pumper trampoliner op…", "Boing boing…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a;
      a.terræn((x, z) => Math.round(10 + støj(x / 20, z / 20) * 6 + støj(x / 8 + 10, z / 8) * 2 - 4),
        (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? ID.Jord : ID.Svampejord));
      for (let n = 0; n < a.antal(24); n++) {
        const x = 4 + Math.floor(R() * (BX - 8)), z = 4 + Math.floor(R() * (BZ - 8)), h = top[x + z * BX];
        if (a.hent(x, h, z) !== ID.Svampejord || a.hent(x, h + 1, z) !== 0 || a.nærStart(x, z, 5)) continue;
        const hs = 3 + Math.floor(R() * 5), hat = R() < 0.5 ? ID["Rød svamp"] : ID["Blå svamp"], r = 2 + (R() < 0.45 ? 1 : 0);
        for (let y = 1; y <= hs; y++) a.sæt(x, h + y, z, ID.Svampestok);
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          const d = dx * dx + dz * dz;
          if (d <= r * r + 1) a.sæt(x + dx, h + hs + 1, z + dz, hat);                  // hatten
          if (d > r * r - 2 && d <= r * r + 1) a.sæt(x + dx, h + hs, z + dz, hat);      // kanten der hænger ned
        }
      }
      a.pynt(a.antal(70), () => (R() < 0.7 ? ID["Lille svamp"] : ID.Glødesvamp), [ID.Svampejord]);
      a.pynt(a.antal(14), () => (R() < 0.5 ? ID["Rød svamp"] : ID["Blå svamp"]), [ID.Svampejord]);
    },
  },

  {
    id: "maane", navn: "Ostemånen", ikon: "🧀", tekst: "Månen er lavet af ost! Her kan man hoppe SUPER højt.",
    himmel: ["#05051a", "#1c1c44"], tåge: [45, 110], hav: null, sol: "#ffffff", solStr: 26, stjerner: true, jordklode: true, skyer: null,
    lys: ["#ffffff", "#6a6a9a", 2.0, 1.6], stemning: "rum", tyngde: 9,
    dyr: ["rumvaesen", "rumvaesen", "ostemus", "ostemus"], antal: 10,
    hotbar: ["Ost", "Månesten", "Stjerneblok", "Krystal", "Hvid uld", "v:vand", "v:tænder", "TNT", "æg:rumvaesen"],
    vis: ["Ost", "Stjerneblok", "Månesten"],
    hent: ["Smelter osten…", "Tænder stjernerne…", "Lander raketten…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a;
      a.terræn((x, z) => Math.round(9 + støj(x / 22, z / 22) * 3 + støj(x / 9, z / 9) * 1.5 - 1),
        (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 4 ? ID.Månesten : ID.Ost));
      // kratere
      for (let n = 0; n < a.antal(11); n++) {
        const cx = Math.floor(R() * BX), cz = Math.floor(R() * BZ), r = 2 + R() * 3.5;
        if (a.nærStart(cx, cz, r + 5)) continue;
        for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) for (let z = Math.floor(cz - r - 2); z <= cz + r + 2; z++) {
          if (x < 0 || z < 0 || x >= BX || z >= BZ) continue;
          const d = Math.hypot(x - cx, z - cz), i = x + z * BX;
          if (d < r) {
            const dyb = Math.round(Math.sqrt(r * r - d * d) * 0.6);
            for (let k = 0; k < dyb && top[i] > 2; k++) a.sæt(x, top[i]--, z, 0);
            a.sæt(x, top[i], z, ID.Månesten);
          } else if (d < r + 1.2) a.sæt(x, ++top[i], z, ID.Ost);                       // kraterkant
        }
      }
      a.pynt(a.antal(34), ID.Krystal, [ID.Ost, ID.Månesten]);
      a.pynt(a.antal(10), ID.Stjerneblok, [ID.Ost]);
      // en raket ved siden af startstedet
      const rx = BX / 2 + 4, rz = BZ / 2 + 2, rh = top[rx + rz * BX];
      for (let y = 1; y <= 5; y++) a.sæt(rx, rh + y, rz, y === 3 ? ID.Glas : ID["Hvid uld"]);
      a.sæt(rx, rh + 6, rz, ID["Rød uld"]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { a.sæt(rx + dx, rh + 1, rz + dz, ID["Rød uld"]); a.sæt(rx + dx, rh + 2, rz + dz, ID["Rød uld"]); }
    },
  },

  {
    id: "skydebane", navn: "Skydebanen", ikon: "🎯", tekst: "Skyd på skydeskiver, balloner, robotter og turbo-dinoer — og kør kampvogn!",
    himmel: ["#5fa8f0", "#e0f0ff"], tåge: [40, 100], hav: "#3f8fe0", sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#9a8a5a", 2.2, 1.4], stemning: "glad", tyngde: 28,
    størrelse: [160, 48, 160],                                   // større end de andre øer (bredde, højde, dybde)
    dyr: ["robot", "robot", "dino"], antal: 12, genfød: true,
    skyd: true,                                                  // balloner, kampvogne og point (skyd.js)
    hotbar: ["v:gevær", "v:bazooka", "v:maling", "Skydeskive", "Sandsæk", "Trækasse", "Camouflage", "TNT", "æg:robot"],
    vis: ["Skydeskive", "Sandsæk", "Camouflage"],
    hent: ["Stiller skydeskiver op…", "Bygger kasernerne…", "Puster balloner op…", "Tanker kampvognene…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      const inde = (x, z) => x > 1 && z > 1 && x < BX - 2 && z < BZ - 2;
      // En flad slette omkring startstedet og bløde bakker længere ude, så kampvognene kan køre rundt
      a.terræn((x, z) => {
        const ud = Math.min(1, Math.max(0, (Math.hypot(x - cx, z - cz) - 24) / 34));
        return Math.round(9 + (støj(x / 22, z / 22) * 7 + støj(x / 8 + 40, z / 8) * 2 - 4.5) * ud);
      }, (x, z, y, h) => {
        const sand = støj(x / 13 + 300, z / 13) > 0.6;
        return y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? (sand ? ID.Sand : ID.Jord) : (sand ? ID.Sand : ID["Græs"]);
      });
      // Pladser, der allerede er brugt (så bygninger og bunkere ikke står oven i hinanden)
      const optaget = [];
      const fri = (x0, z0, b, d) => inde(x0, z0) && inde(x0 + b, z0 + d) && !optaget.some(([x, z, bb, dd]) => x0 < x + bb + 2 && x0 + b + 2 > x && z0 < z + dd + 2 && z0 + d + 2 > z);
      // Jævn grunden til en bygning og svar gulvets højde
      const grund = (x0, z0, b, d) => {
        let sum = 0, n = 0;
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) { sum += h0(x, z); n++; }
        const h = Math.round(sum / n);
        for (let x = x0 - 1; x <= x0 + b; x++) for (let z = z0 - 1; z <= z0 + d; z++) {
          const i = x + z * BX;
          for (let y = top[i] + 1; y <= h; y++) a.sæt(x, y, z, y === h ? ID["Græs"] : ID.Jord);
          for (let y = h + 1; y <= top[i]; y++) a.sæt(x, y, z, 0);
          top[i] = h;
        }
        optaget.push([x0, z0, b, d]);
        return h;
      };
      const kasse = (x0, z0, b, d, y0, y1, blok) => { for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };

      // Skydelinjen foran startstedet (mod nord) og tre rækker skydeskiver på stolper
      optaget.push([cx - 12, cz - 30, 24, 28]);
      for (let x = cx - 10; x <= cx + 10; x++) if ((x - cx) % 4 !== 0) a.sæt(x, h0(x, cz - 4) + 1, cz - 4, ID.Sandsæk);
      for (const [dz, n, højde] of [[-13, 5, 1], [-20, 6, 2], [-28, 7, 3]]) for (let i = 0; i < n; i++) {
        const x = Math.round(cx - (n - 1) * 1.6 + i * 3.2), z = cz + dz, h = h0(x, z);
        for (let y = 1; y <= højde; y++) a.sæt(x, h + y, z, ID.Planker);
        a.sæt(x, h + højde + 1, z, ID.Skydeskive);
      }

      // Hangaren bag startstedet — de grønne kampvogne holder foran den
      { const x0 = cx - 7, z0 = cz + 10, b = 15, d = 9, h = grund(x0, z0, b, d);
        kasse(x0, z0, b, d, h, h, ID.Sten);
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) {
          const væg = x === x0 || x === x0 + b - 1 || z === z0 + d - 1;
          for (let y = 1; y <= 5; y++) a.sæt(x, h + y, z, væg ? ID.Sten : 0);
          a.sæt(x, h + 6, z, ID.Camouflage);
        }
        a.sæt(cx - 4, h + 5, z0 + d - 2, ID.Lampe); a.sæt(cx + 4, h + 5, z0 + d - 2, ID.Lampe);
        kasse(x0 + 1, z0 + d - 2, 2, 1, h + 1, h + 2, ID.Trækasse); kasse(x0 + b - 3, z0 + d - 2, 2, 1, h + 1, h + 1, ID.Trækasse);
      }

      // Vagttårne i fire hjørner — man kan flyve op og kigge ud over banen
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x0 = Math.round(cx + dx * Math.min(38, BX / 2 - 12)) - 2, z0 = Math.round(cz + dz * Math.min(38, BZ / 2 - 12)) - 2;
        if (!fri(x0, z0, 5, 5)) continue;
        const h = grund(x0, z0, 5, 5);
        for (const [px, pz] of [[0, 0], [4, 0], [0, 4], [4, 4]]) kasse(x0 + px, z0 + pz, 1, 1, h + 1, h + 7, ID.Træstamme);
        kasse(x0, z0, 5, 5, h + 8, h + 8, ID.Planker);
        for (let i = 0; i < 5; i++) for (const [x, z] of [[x0 + i, z0], [x0 + i, z0 + 4], [x0, z0 + i], [x0 + 4, z0 + i]]) a.sæt(x, h + 9, z, ID.Sandsæk);
        a.sæt(x0 + 2, h + 9, z0 + 2, ID.Lampe);
        a.sæt(x0 + 2, h + 6, z0 - (dz < 0 ? 0 : -4), ID.Skydeskive);
      }

      // Kaserner af mursten med vinduer, dør og sandsække på taget
      for (const [x0, z0] of [[cx + 22, cz - 2], [cx - 34, cz - 8]]) {
        const b = 11, d = 7;
        if (!fri(x0, z0, b, d)) continue;
        const h = grund(x0, z0, b, d);
        kasse(x0, z0, b, d, h, h, ID.Planker);
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) {
          const væg = x === x0 || x === x0 + b - 1 || z === z0 || z === z0 + d - 1;
          for (let y = 1; y <= 4; y++) {
            const vindue = y === 2 && væg && ((x - x0) % 3 === 1 || (z - z0) % 3 === 1) && !(x === x0 || x === x0 + b - 1) !== !(z === z0 || z === z0 + d - 1);
            a.sæt(x, h + y, z, !væg ? 0 : vindue ? ID.Glas : ID.Mursten);
          }
          a.sæt(x, h + 5, z, ID.Planker);
          if (væg) a.sæt(x, h + 6, z, ID.Sandsæk);
        }
        const dør = x0 + Math.floor(b / 2);
        a.sæt(dør, h + 1, z0, 0); a.sæt(dør, h + 2, z0, 0);
        a.sæt(dør, h + 4, z0 + 1, ID.Lampe);
        kasse(x0 + 1, z0 + d - 2, 3, 1, h + 1, h + 1, ID.Trækasse);
      }

      // Tivoli-skydetelt med røde og hvide striber og skiver indenfor
      { const x0 = cx + 15, z0 = cz - 20, b = 5, d = 7;
        if (fri(x0, z0, b, d)) {
          const h = grund(x0, z0, b, d);
          for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) {
            const stribe = (z - z0) % 2 ? ID["Hvid uld"] : ID["Rød uld"];
            const væg = x === x0 + b - 1 || z === z0 || z === z0 + d - 1;
            for (let y = 1; y <= 3; y++) a.sæt(x, h + y, z, væg ? stribe : 0);
            a.sæt(x, h + 4, z, stribe);
          }
          for (let z = z0 + 1; z < z0 + d - 1; z++) { a.sæt(x0, h + 1, z, ID.Planker); a.sæt(x0 + b - 2, h + 2, z, ID.Skydeskive); }
          a.sæt(x0, h + 5, z0, ID.Lampe); a.sæt(x0, h + 5, z0 + d - 1, ID.Lampe);
        }
      }

      // Legetøjsbyen: små farvede huse rundt om en plads (her kører legetøjskampvognene gerne rundt)
      { const bx = Math.round(cx - Math.min(40, BX / 2 - 18)), bz = Math.round(cz - Math.min(40, BZ / 2 - 18));
        const FARVER = ["Rød uld", "Gul uld", "Blå uld", "Grøn uld", "Lilla uld", "Orange uld"];
        [[-9, -9], [0, -10], [9, -9], [-10, 1], [10, 1], [0, 10]].forEach(([dx, dz], i) => {
          const x0 = bx + dx - 2, z0 = bz + dz - 2;
          if (!fri(x0, z0, 5, 5)) return;
          const h = grund(x0, z0, 5, 5), mur = ID[FARVER[i % FARVER.length]], tag = ID[FARVER[(i + 2) % FARVER.length]];
          for (let x = x0; x < x0 + 5; x++) for (let z = z0; z < z0 + 5; z++) {
            const væg = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4;
            for (let y = 1; y <= 3; y++) a.sæt(x, h + y, z, !væg ? 0 : y === 2 && (x === x0 + 2 || z === z0 + 2) ? ID.Glas : mur);
            a.sæt(x, h + 4, z, tag);
          }
          a.sæt(x0 + 2, h + 5, z0 + 2, tag);
          a.sæt(x0 + 2, h + 1, z0 + (dz > 0 ? 0 : 4), 0);                   // dør ud mod pladsen
          a.sæt(x0 + 2, h + 1, z0 + 2, ID.Lampe);
        });
      }

      // Bunkere af sandsække, stakke af trækasser og camouflage-telte ude i landskabet
      for (let n = 0; n < a.antal(16); n++) {
        const x = 5 + Math.floor(R() * (BX - 10)), z = 5 + Math.floor(R() * (BZ - 10)), h = h0(x, z);
        if (a.nærStart(x, z, 30) || !fri(x - 3, z - 3, 6, 6)) continue;
        optaget.push([x - 3, z - 3, 6, 6]);
        const valg = R();
        if (valg < 0.4) {
          for (let i = -2; i <= 2; i++) for (let y = 1; y <= 2; y++) {
            a.sæt(x + i, h + y, z - 2, ID.Sandsæk);
            if (Math.abs(i) === 2) for (let j = -1; j <= 1; j++) a.sæt(x + i, h + y, z + j, ID.Sandsæk);
          }
        } else if (valg < 0.75) for (let i = 0; i < 5; i++) {
          const dx = Math.floor(R() * 3) - 1, dz = Math.floor(R() * 3) - 1;
          let y = h + 1; while (y < h + 4 && a.hent(x + dx, y, z + dz)) y++;
          a.sæt(x + dx, y, z + dz, ID.Trækasse);
        } else for (let dx = -3; dx <= 3; dx++) for (let dz = -2; dz <= 2; dz++) a.sæt(x + dx, h + 4 - Math.abs(dx), z + dz, ID.Camouflage);
      }
      // Træer i udkanten
      for (let n = 0; n < a.antal(12); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID["Græs"] || a.nærStart(x, z, 32) || !fri(x - 1, z - 1, 2, 2)) continue;
        for (let y = 1; y <= 4; y++) a.sæt(x, h + y, z, ID.Træstamme);
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let y = 4; y <= 5; y++) if (a.hent(x + dx, h + y, z + dz) === 0) a.sæt(x + dx, h + y, z + dz, ID.Blade);
        a.sæt(x, h + 6, z, ID.Blade);
      }
    },
  },

  {
    id: "fyrvaerkeri", navn: "Fyrværkeri", ikon: "🎆", tekst: "Nytårsnat med sne, nordlys, juletræ og is. Send raketter, fontæner og ønskelygter op!",
    himmel: ["#070b24", "#1e2a5a"], tåge: [44, 110], hav: "#1a2a50", sol: "#f5f3e0", solStr: 30, stjerner: true, skyer: null,
    lys: ["#b8c8ff", "#303a60", 1.6, 0.8], stemning: "rolig", tyngde: 28,
    størrelse: [160, 48, 160],
    dyr: ["pingvin", "pingvin", "rensdyr", "hone", "and"], antal: 12,
    fyrværkeri: true, sne: true, nordlys: true,                // sne der falder og nordlys på himlen (spil.js)
    hotbar: ["v:raket", "v:romerlys", "v:lygte", "v:konfetti", "Show-kasse", "Fontæne", "Fyrværkeri", "v:tænder", "v:stjernekaster"],
    vis: ["Show-kasse", "Lyskæde", "Is"],
    hent: ["Pakker raketterne ud…", "Lader det sne…", "Pynter juletræet…", "Fryser søen til is…", "Tænder nordlyset…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      const inde = (x, z) => x > 1 && z > 1 && x < BX - 2 && z < BZ - 2;
      const bakke = [cx, Math.round(cz - Math.min(45, BZ / 2 - 18))], sø = [Math.round(cx + Math.min(42, BX / 2 - 20)), cz];
      a.terræn((x, z) => {
        const ud = Math.min(1, Math.max(0, (Math.hypot(x - cx, z - cz) - 16) / 26));
        const kælk = Math.max(0, 1 - Math.hypot(x - bakke[0], z - bakke[1]) / 15) * 13;      // kælkebakken
        return Math.round(10 + (støj(x / 18, z / 18) * 6 + støj(x / 6 + 70, z / 6) * 2 - 4) * ud + kælk);
      }, (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? ID.Jord : ID.Sne));
      const optaget = [];
      const fri = (x0, z0, b, d) => inde(x0, z0) && inde(x0 + b, z0 + d) && !optaget.some(([x, z, bb, dd]) => x0 < x + bb + 2 && x0 + b + 2 > x && z0 < z + dd + 2 && z0 + d + 2 > z);
      const grund = (x0, z0, b, d, blok = ID.Sne) => {                // jævn en grund ud og svar højden
        let sum = 0, n = 0;
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) { sum += h0(x, z); n++; }
        const h = Math.round(sum / n);
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) {
          const i = x + z * BX;
          for (let y = top[i] + 1; y <= h; y++) a.sæt(x, y, z, ID.Jord);
          for (let y = h + 1; y <= top[i]; y++) a.sæt(x, y, z, 0);
          a.sæt(x, h, z, blok); top[i] = h;
        }
        optaget.push([x0, z0, b, d]);
        return h;
      };
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };

      // Torvet midt i byen
      const hT = grund(cx - 12, cz - 12, 25, 25, ID.Sten);
      // Juletræet med lyskæder, en stjerne på toppen og gaver nedenunder
      { const tx = cx, tz = cz - 6;
        søjle(tx, tz, hT + 1, hT + 3, ID.Træstamme);
        for (let lag = 0; lag < 9; lag++) {
          const y = hT + 3 + lag, r = Math.max(0, Math.round((9 - lag) * 0.55));
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (dx * dx + dz * dz > r * r + 0.5) continue;
            const kant = dx * dx + dz * dz > (r - 1) * (r - 1);
            a.sæt(tx + dx, y, tz + dz, kant && (dx + dz + lag) % 3 === 0 ? ID.Lyskæde : ID.Blade);
          }
        }
        a.sæt(tx, hT + 12, tz, ID.Stjerneblok);
        for (const [dx, dz] of [[-2, 2], [2, 2], [-3, 0], [3, -1], [0, 3], [1, -3]]) a.sæt(tx + dx, hT + 1, tz + dz, ID.Gave);
      }
      // Scenen med show-kasser, fontæner og fyrværkeri
      { const x0 = cx - 5, z0 = cz + 6;
        for (let x = x0; x < x0 + 11; x++) for (let z = z0; z < z0 + 4; z++) a.sæt(x, hT + 1, z, ID.Planker);
        [[1, ID["Show-kasse"]], [3, ID.Fontæne], [5, ID["Show-kasse"]], [7, ID.Fontæne], [9, ID["Show-kasse"]]].forEach(([dx, blok]) => a.sæt(x0 + dx, hT + 2, z0 + 1, blok));
        for (const dx of [2, 4, 6, 8]) a.sæt(x0 + dx, hT + 2, z0 + 2, ID.Fyrværkeri);
      }
      // Lygtepæle i hjørnerne og lyskæder langs torvets kanter
      for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12], [0, -12], [0, 12], [-12, 0], [12, 0]]) {
        søjle(cx + dx, cz + dz, hT + 1, hT + 3, ID.Planker); a.sæt(cx + dx, hT + 4, cz + dz, ID.Lampe);
      }
      for (let i = -11; i <= 11; i++) if (i !== 0) for (const [x, z] of [[cx + i, cz - 12], [cx + i, cz + 12], [cx - 12, cz + i], [cx + 12, cz + i]]) a.sæt(x, hT + 4, z, ID.Lyskæde);

      // Den frosne sø med glat is
      { const [sx, sz] = sø, rx = 16, rz = 11;
        let lav = 99; for (let x = sx - rx; x <= sx + rx; x++) for (let z = sz - rz; z <= sz + rz; z++) if (inde(x, z) && ((x - sx) / rx) ** 2 + ((z - sz) / rz) ** 2 < 1) lav = Math.min(lav, h0(x, z));
        for (let x = sx - rx - 1; x <= sx + rx + 1; x++) for (let z = sz - rz - 1; z <= sz + rz + 1; z++) {
          if (!inde(x, z)) continue;
          const d = ((x - sx) / rx) ** 2 + ((z - sz) / rz) ** 2, i = x + z * BX;
          if (d >= 1) continue;
          for (let y = lav; y <= top[i]; y++) a.sæt(x, y, z, 0);
          a.sæt(x, lav - 1, z, ID.Is); top[i] = lav - 1;
        }
        optaget.push([sx - rx, sz - rz, rx * 2, rz * 2]);
        for (const [dx, dz] of [[-rx - 2, 0], [rx + 2, 0], [0, -rz - 2], [0, rz + 2]]) if (inde(sx + dx, sz + dz)) { const h = h0(sx + dx, sz + dz); søjle(sx + dx, sz + dz, h + 1, h + 2, ID.Planker); a.sæt(sx + dx, h + 3, sz + dz, ID.Lampe); }
      }
      // Kælkebakken med en isbane ned ad siden
      { const [bx, bz] = bakke;
        optaget.push([bx - 15, bz - 15, 30, 30]);
        for (let z = bz; z <= bz + 15; z++) for (let x = bx - 1; x <= bx + 1; x++) if (inde(x, z)) a.sæt(x, h0(x, z), z, ID.Is);
        a.sæt(bx, h0(bx, bz) + 1, bz, ID.Lampe);
      }
      // Stier fra torvet til søen og bakken, med lamper
      for (let x = cx + 13; x < sø[0] - 16; x++) { a.sæt(x, h0(x, cz), cz, ID.Sten); a.sæt(x, h0(x, cz + 1), cz + 1, ID.Sten); if (x % 8 === 0) { const h = h0(x, cz + 2); søjle(x, cz + 2, h + 1, h + 2, ID.Planker); a.sæt(x, h + 3, cz + 2, ID.Lampe); } }
      for (let z = cz - 13; z > bakke[1] + 15; z--) { a.sæt(cx, h0(cx, z), z, ID.Sten); a.sæt(cx + 1, h0(cx + 1, z), z, ID.Sten); }

      // Huse med lys i vinduerne og lyskæder langs tagkanten
      const MURE = [ID.Planker, ID.Planker, ID["Rød uld"], ID["Blå uld"], ID["Gul uld"], ID.Mursten];
      for (let n = 0; n < a.antal(14); n++) {
        const v = R() * Math.PI * 2, afst = 18 + R() * Math.min(40, BX / 2 - 26);
        const x0 = Math.round(cx + Math.cos(v) * afst) - 3, z0 = Math.round(cz + Math.sin(v) * afst) - 3;
        if (!fri(x0, z0, 7, 7)) continue;
        const h = grund(x0, z0, 7, 7, ID.Planker), mur = MURE[Math.floor(R() * MURE.length)];
        for (let x = x0; x < x0 + 7; x++) for (let z = z0; z < z0 + 7; z++) {
          const væg = x === x0 || x === x0 + 6 || z === z0 || z === z0 + 6;
          for (let y = 1; y <= 4; y++) a.sæt(x, h + y, z, !væg ? 0 : y === 2 && (x === x0 + 3 || z === z0 + 3) ? ID.Glas : y === 4 ? ID.Lyskæde : mur);
          a.sæt(x, h + 5, z, ID["Rød uld"]);
          if (x > x0 && x < x0 + 6 && z > z0 && z < z0 + 6) a.sæt(x, h + 6, z, ID["Rød uld"]);
        }
        a.sæt(x0 + 3, h + 1, z0, 0); a.sæt(x0 + 3, h + 2, z0, 0);
        a.sæt(x0 + 3, h + 1, z0 + 3, ID.Lampe);
        if (R() < 0.5) a.sæt(x0 + 1, h + 1, z0 + 5, ID.Gave);
      }
      // Snemænd
      for (let n = 0; n < a.antal(8); n++) {
        const x = 4 + Math.floor(R() * (BX - 8)), z = 4 + Math.floor(R() * (BZ - 8)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID.Sne || !fri(x - 1, z - 1, 2, 2)) continue;
        søjle(x, z, h + 1, h + 3, ID.Sne);
        a.sæt(x, h + 3, z + 1, ID["Orange uld"]);                      // gulerodsnæse
        a.sæt(x, h + 4, z, ID.Obsidian);                               // hat
      }
      // Grantræer med sne på toppen
      for (let n = 0; n < a.antal(34); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID.Sne || a.nærStart(x, z, 14) || !fri(x - 2, z - 2, 4, 4)) continue;
        const hs = 5 + Math.floor(R() * 3);
        søjle(x, z, h + 1, h + hs, ID.Træstamme);
        for (let y = 2; y <= hs + 1; y++) {
          const r = Math.round((hs + 1 - y) / 2.2);
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r && a.hent(x + dx, h + y, z + dz) === 0) a.sæt(x + dx, h + y, z + dz, ID.Blade);
        }
        a.sæt(x, h + hs + 2, z, ID.Sne);
      }
      a.pynt(a.antal(8), ID.Gave, [ID.Sne]);
    },
  },

  {
    id: "underverden", navn: "Underverdenen", ikon: "🔥", tekst: "Den varme verden med lavasøer, glødesten og hoppende lavaklumper. Portalen står klar ved startstedet!",
    himmel: ["#1a0303", "#6a1a0a"], tåge: [22, 68], hav: "#ff5a1a", sol: null, skyer: null,
    lys: ["#ffb080", "#5a1a10", 1.9, 0.7], stemning: "uhyggelig", tyngde: 28,
    størrelse: [128, 48, 128],
    dyr: ["lavaklump", "lavaklump", "guldgris", "guldgris", "spogelse"], antal: 11,
    sne: "gløder", lavahav: true,                                // gnister der stiger op, og havet er lava
    hotbar: ["Rødsten", "Glødesten", "Borgsten", "Basalt", "Obsidian", "v:lava", "v:tænder", "TNT", "æg:lavaklump"],
    vis: ["Rødsten", "Glødesten", "Borgsten"],
    hent: ["Varmer lavaen op…", "Tænder glødestenene…", "Bygger borgen…", "Åbner portalen…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      const biom = (x, z) => støj(x / 38 + 500, z / 38 + 500);   // lav: sjæledal · høj: basaltland · midt: den røde skov
      a.terræn((x, z) => {
        const kant = Math.min(1, Math.min(x, z, BX - 1 - x, BZ - 1 - z) / 12);        // ud mod kanten: ned i lavahavet
        const midt = Math.max(0, 1 - Math.hypot(x - cx, z - cz) / 11);                  // fladt omkring startstedet
        const h = 12 + (støj(x / 20, z / 20) * 10 + støj(x / 7 + 40, z / 7) * 3 - 6.5) * (1 - midt);
        return Math.round(5 + (h - 5) * kant);
      }, (x, z, y, h) => {
        if (y === 0) return ID.Bundsten;
        const b = biom(x, z);
        if (y === h) return b < 0.36 ? ID.Sjælesand : b > 0.64 ? ID.Basalt : ID["Rødt mos"];
        if (y > h - 3 && b < 0.36) return ID.Sjælesand;
        return y > h - 3 && b > 0.64 ? ID.Basalt : ID.Rødsten;
      });
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };

      // Pladsen ved startstedet med glødesten i hjørnerne og en tændt portal
      const hP = h0(cx, cz);
      for (let x = cx - 5; x <= cx + 5; x++) for (let z = cz - 5; z <= cz + 5; z++) {
        for (let y = hP + 1; y <= hP + 6; y++) a.sæt(x, y, z, 0);
        a.sæt(x, hP, z, Math.abs(x - cx) === 5 && Math.abs(z - cz) === 5 ? ID.Glødesten : ID.Borgsten);
        top[x + z * BX] = hP;
      }
      for (let dx = -1; dx <= 2; dx++) for (let dy = 1; dy <= 5; dy++) {
        const kant = dx === -1 || dx === 2 || dy === 1 || dy === 5;
        a.sæt(cx + dx, hP + dy, cz - 5, kant ? ID.Obsidian : ID.Portal);
      }

      // Små lavasøer (rigtig lava, som gløder og bobler)
      for (let n = 0; n < a.antal(5); n++) {
        const sx = 8 + Math.floor(R() * (BX - 16)), sz = 8 + Math.floor(R() * (BZ - 16)), r = 2 + R() * 2.5;
        if (a.nærStart(sx, sz, 14)) continue;
        let lav = 99;
        for (let x = Math.floor(sx - r); x <= sx + r; x++) for (let z = Math.floor(sz - r); z <= sz + r; z++) if (Math.hypot(x - sx, z - sz) <= r) lav = Math.min(lav, h0(x, z));
        for (let x = Math.floor(sx - r); x <= sx + r; x++) for (let z = Math.floor(sz - r); z <= sz + r; z++) {
          const d = Math.hypot(x - sx, z - sz);
          if (d > r + 1.5) continue;
          const i = x + z * BX;
          if (d <= r) { for (let y = lav; y <= h0(x, z); y++) a.sæt(x, y, z, 0); a.sæt(x, lav - 1, z, ID.Lava); a.sæt(x, lav - 2, z, ID.Rødsten); top[i] = lav - 2; }
          else if (h0(x, z) >= lav) a.sæt(x, lav - 1, z, ID.Basalt);                      // en kant rundt om søen
        }
      }

      // Den røde skov: kæmpesvampe med rød stilk, vortesvamp-hat og glødesten under hatten
      for (let n = 0; n < a.antal(26); n++) {
        const x = 4 + Math.floor(R() * (BX - 8)), z = 4 + Math.floor(R() * (BZ - 8)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID["Rødt mos"] || a.hent(x, h + 1, z) !== 0 || a.nærStart(x, z, 8)) continue;
        const hs = 4 + Math.floor(R() * 5), r = 2 + (R() < 0.4 ? 1 : 0);
        søjle(x, z, h + 1, h + hs, ID.Rødstilk);
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          const d = dx * dx + dz * dz;
          if (d <= r * r + 1) a.sæt(x + dx, h + hs + 1, z + dz, ID.Vortesvamp);
          if (d > r * r - 2 && d <= r * r + 1) { a.sæt(x + dx, h + hs, z + dz, ID.Vortesvamp); if (R() < 0.3) a.sæt(x + dx, h + hs - 1, z + dz, ID.Vortesvamp); }
        }
        a.sæt(x + 1, h + hs, z, ID.Glødesten); a.sæt(x - 1, h + hs, z + 1, ID.Glødesten);
      }
      // Basaltsøjler og spir af rødsten med glødesten på toppen
      for (let n = 0; n < a.antal(30); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h + 1, z) !== 0 || a.nærStart(x, z, 9)) continue;
        const basalt = a.hent(x, h, z) === ID.Basalt, hs = 2 + Math.floor(R() * (basalt ? 6 : 9));
        søjle(x, z, h + 1, h + hs, basalt ? ID.Basalt : ID.Rødsten);
        if (!basalt) { a.sæt(x, h + hs + 1, z, ID.Glødesten); if (hs > 5) { a.sæt(x + 1, h + 1, z, ID.Rødsten); a.sæt(x, h + 1, z - 1, ID.Rødsten); } }
      }

      // Borgen: en bro af borgsten fra pladsen ud til et tårn med glødesten og guld
      { const længde = Math.min(26, BX / 2 - 12), bx = cx + 6 + længde, hB = hP + 2;
        for (let x = cx + 6; x < bx; x++) for (let dz = -1; dz <= 1; dz++) {
          a.sæt(x, hB, cz + dz, ID.Borgsten);
          for (let y = hB + 1; y <= hB + 3; y++) a.sæt(x, y, cz + dz, 0);
          if (dz !== 0) a.sæt(x, hB + 1, cz + dz, (x - cx) % 4 === 0 ? ID.Glødesten : ID.Borgsten);
          if ((x - cx) % 6 === 0) søjle(x, cz + dz, Math.max(1, h0(x, cz + dz) + 1), hB - 1, ID.Borgsten);   // bropiller
        }
        for (let x = cx + 5; x <= cx + 6; x++) for (let y = hP + 1; y < hB; y++) a.sæt(x, y, cz, ID.Borgsten);   // trappe op
        a.sæt(cx + 5, hP + 1, cz, ID.Borgsten);
        const hT = Math.max(hB, h0(bx + 3, cz));
        for (let x = bx; x < bx + 7; x++) for (let z = cz - 3; z <= cz + 3; z++) {
          søjle(x, z, Math.max(1, h0(x, z) + 1), hB - 1, ID.Borgsten);
          const væg = x === bx || x === bx + 6 || z === cz - 3 || z === cz + 3;
          a.sæt(x, hB, z, ID.Borgsten);
          for (let y = hB + 1; y <= hB + 7; y++) a.sæt(x, y, z, væg && !(x === bx && Math.abs(z - cz) <= 1 && y <= hB + 3) ? (y === hB + 3 && (x + z) % 2 ? ID.Glødesten : ID.Borgsten) : 0);
          a.sæt(x, hB + 8, z, væg && (x + z) % 2 ? ID.Borgsten : væg ? 0 : ID.Borgsten);
        }
        for (const [dx, dz] of [[2, -1], [4, 1], [3, 0]]) a.sæt(bx + dx, hB + 1, cz + dz, ID.Guld);
        a.sæt(bx + 3, hB + 7, cz, ID.Glødesten);
        void hT;
      }
      a.pynt(a.antal(40), () => (R() < 0.6 ? ID.Glødesvamp : ID["Lille svamp"]), [ID["Rødt mos"], ID.Sjælesand]);
      a.pynt(a.antal(16), ID.Glødesten, [ID.Basalt, ID.Rødsten]);
    },
  },

  {
    id: "brandby", navn: "Brandmandsbyen", ikon: "🚒", tekst: "En by med veje, huse og en brandstation. Når det brænder, følger du røgen og slukker ilden med brandslangen!",
    himmel: ["#5fa8f0", "#dff0ff"], tåge: [36, 92], hav: "#3f8fe0", sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#8a8a7a", 2.2, 1.4], stemning: "glad", tyngde: 28,
    størrelse: [128, 48, 128],
    dyr: ["dalmatiner", "dalmatiner", "kat", "kat", "and"], antal: 10,
    brand: true, point: true,                                    // huse der brænder, og ⭐ når man redder dem
    hotbar: ["v:brandslange", "Mursten", "Tagsten", "Gul puds", "Asfalt", "Glas", "v:tænder", "Brandhane", "æg:dalmatiner"],
    vis: ["Tagsten", "Brandhane", "Garageport"],
    hent: ["Bygger husene…", "Asfalterer vejene…", "Pudser brandbilen…", "Ruller brandslangen ud…"],
    generer(a) {
      const { R, støj, ID, BX, BZ } = a, cx = BX / 2, cz = BZ / 2, H = 10, GAB = 22;
      const rest = v => ((v % GAB) + GAB) % GAB;
      const kantAf = (x, z) => Math.min(x, z, BX - 1 - x, BZ - 1 - z);
      const iBy = (x, z) => kantAf(x, z) >= 10;
      const vej = (x, z) => { const u = rest(x - cx), w = rest(z - cz); return u <= 2 || u >= GAB - 2 || w <= 2 || w >= GAB - 2; };
      const fortov = (x, z) => { const u = rest(x - cx), w = rest(z - cz); return u === 3 || u === GAB - 3 || w === 3 || w === GAB - 3; };
      const stribe = (x, z) => {                                  // stiplet midterstribe, men ikke i krydsene
        const u = rest(x - cx), w = rest(z - cz);
        return (u === 0 && w > 3 && w < GAB - 3 && rest(z) % 4 < 2) || (w === 0 && u > 3 && u < GAB - 3 && rest(x) % 4 < 2);
      };
      a.terræn((x, z) => { const k = kantAf(x, z); return k >= 10 ? H : Math.round(H + støj(x / 9, z / 9) * 5 * (1 - k / 10)); },
        (x, z, y, h) => {
          if (y === 0) return ID.Bundsten;
          if (y < h - 3) return ID.Sten;
          if (y < h) return ID.Jord;
          if (!iBy(x, z)) return ID["Græs"];
          return vej(x, z) ? (stribe(x, z) ? ID.Vejstribe : ID.Asfalt) : fortov(x, z) ? ID.Fliser : ID["Græs"];
        });
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };
      const MURE = [ID.Mursten, ID["Gul puds"], ID["Hvid puds"], ID["Blå puds"], ID.Mursten, ID.Fliser];

      // Et hus med vinduer, dør, skorsten og et tag af tagsten (det er taget, der kan brænde)
      const hus = (x0, z0) => {
        const b = 7 + Math.floor(R() * 3), d = 7 + Math.floor(R() * 3), mur = MURE[Math.floor(R() * MURE.length)];
        const hx = x0 + Math.floor((15 - b) / 2), hz = z0 + 2;
        for (let x = hx; x < hx + b; x++) for (let z = hz; z < hz + d; z++) {
          const langsX = z === hz || z === hz + d - 1, langsZ = x === hx || x === hx + b - 1;
          a.sæt(x, H, z, ID.Planker);
          for (let y = 1; y <= 4; y++) {
            const vindue = !(langsX && langsZ) && (y === 2 || y === 3) && (langsX ? (x - hx) % 3 === 1 : (z - hz) % 3 === 1);
            a.sæt(x, H + y, z, !(langsX || langsZ) ? 0 : vindue ? ID.Glas : mur);
          }
        }
        const dør = hx + Math.floor(b / 2);
        a.sæt(dør, H + 1, hz, 0); a.sæt(dør, H + 2, hz, 0);
        for (let z = z0; z < hz; z++) a.sæt(dør, H, z, ID.Fliser);                    // en sti hen til døren
        a.sæt(hx + 1, H + 1, hz + d - 2, ID.Lampe);
        for (let k = 0; ; k++) {                                                      // taget: lag på lag, som en pyramide
          const x1 = hx - 1 + k, x2 = hx + b - k, z1 = hz - 1 + k, z2 = hz + d - k;
          if (x1 > x2 || z1 > z2) break;
          for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) a.sæt(x, H + 5 + k, z, ID.Tagsten);
        }
        søjle(hx + 1, hz + d - 2, H + 5, H + 8, ID.Mursten);                          // skorsten
        for (let n = 0; n < 4; n++) { const x = x0 + Math.floor(R() * 15), z = z0 + 12 + Math.floor(R() * 3); if (a.hent(x, H, z) === ID["Græs"] && !a.hent(x, H + 1, z)) a.sæt(x, H + 1, z, R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]); }
      };
      // En park med træer, en lille sø og bænke
      const park = (x0, z0) => {
        for (let x = x0 + 5; x < x0 + 10; x++) for (let z = z0 + 5; z < z0 + 9; z++) { a.sæt(x, H, z, ID.Vand); a.sæt(x, H - 1, z, ID.Sand); }
        for (const [dx, dz] of [[1, 1], [12, 2], [2, 12], [12, 12]]) {
          const x = x0 + dx, z = z0 + dz;
          søjle(x, z, H + 1, H + 4, ID.Træstamme);
          for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) for (let y = 4; y <= 5; y++) if (!a.hent(x + ix, H + y, z + iz)) a.sæt(x + ix, H + y, z + iz, ID.Blade);
          a.sæt(x, H + 6, z, ID.Blade);
        }
        for (let x = x0 + 6; x <= x0 + 8; x++) a.sæt(x, H + 1, z0 + 11, ID.Planker);   // bænk
        for (let n = 0; n < 8; n++) { const x = x0 + Math.floor(R() * 15), z = z0 + Math.floor(R() * 15); if (a.hent(x, H, z) === ID["Græs"] && !a.hent(x, H + 1, z)) a.sæt(x, H + 1, z, R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]); }
      };
      // Brandstationen lige ved startstedet — med to porte, et tårn og brandbilen
      const station = (x0, z0) => {
        const b = 13, d = 11, sx = x0 + 1, sz = z0 + 1;
        for (let x = sx; x < sx + b; x++) for (let z = sz; z < sz + d; z++) {
          const væg = x === sx || x === sx + b - 1 || z === sz || z === sz + d - 1;
          a.sæt(x, H, z, ID.Fliser);
          for (let y = 1; y <= 5; y++) a.sæt(x, H + y, z, væg ? (y === 3 && (x + z) % 3 === 0 && z !== sz ? ID.Glas : ID.Mursten) : 0);
          a.sæt(x, H + 6, z, væg ? ID.Mursten : ID.Sten);
        }
        for (const px of [sx + 2, sx + 7]) for (let x = px; x < px + 4; x++) {
          for (let y = 1; y <= 3; y++) a.sæt(x, H + y, sz, 0);
          a.sæt(x, H + 4, sz, ID.Garageport);
          for (let z = z0; z < sz; z++) a.sæt(x, H, z, ID.Fliser);
        }
        for (let y = 7; y <= 11; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) a.sæt(sx + b - 2 + dx, H + y, sz + d - 2 + dz, ID.Mursten);
        a.sæt(sx + b - 2, H + 12, sz + d - 2, ID.Lampe);
        for (const x of [sx + 1, sx + 6, sx + 11]) a.sæt(x, H + 5, sz + 1, ID.Lampe);
        // brandbilen i den første port: røde sider, hvid stribe, forrude, stige og blink på taget
        const fx = sx + 2, fz = sz + 1;
        for (let x = fx; x <= fx + 2; x++) for (let z = fz; z <= fz + 6; z++) {
          a.sæt(x, H + 2, z, (x !== fx + 1 && z >= fz + 2) ? ID["Hvid uld"] : ID["Rød uld"]);
          a.sæt(x, H + 3, z, z === fz ? ID.Glas : ID["Rød uld"]);
        }
        for (const x of [fx, fx + 2]) for (const z of [fz + 1, fz + 5]) a.sæt(x, H + 1, z, ID.Obsidian);
        for (let z = fz + 2; z <= fz + 6; z++) a.sæt(fx + 1, H + 4, z, ID.Planker);
        a.sæt(fx + 1, H + 4, fz, ID.Lampe);
        // i den anden port: slanger på væggen og brandhaner
        for (const x of [sx + 7, sx + 10]) a.sæt(x, H + 1, sz + d - 2, ID.Brandhane);
        for (let x = sx + 7; x <= sx + 10; x++) a.sæt(x, H + 1, sz + 5, ID.Trækasse);
      };

      // Byen: grunde mellem vejene — brandstationen ved startstedet, ellers huse og parker
      const n = Math.ceil(Math.max(BX, BZ) / GAB);
      for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
        const x0 = cx + i * GAB + 4, z0 = cz + j * GAB + 4;
        if (!iBy(x0, z0) || !iBy(x0 + 14, z0 + 14)) continue;
        if (i === 0 && j === 0) station(x0, z0); else if (R() < 0.75) hus(x0, z0); else park(x0, z0);
        søjle(x0 - 1, z0 - 1, H + 1, H + 3, ID.Sten); a.sæt(x0 - 1, H + 4, z0 - 1, ID.Lampe);     // gadelygte på hjørnet
        if (R() < 0.6) a.sæt(x0 - 1, H + 1, z0 + 7, ID.Brandhane);
      }
      // Træer uden for byen
      for (let k = 0; k < a.antal(26); k++) {
        const x = 2 + Math.floor(R() * (BX - 4)), z = 2 + Math.floor(R() * (BZ - 4)), h = a.top[x + z * BX];
        if (iBy(x, z) || kantAf(x, z) < 2 || a.hent(x, h, z) !== ID["Græs"] || a.hent(x, h + 1, z)) continue;
        søjle(x, z, h + 1, h + 4, ID.Træstamme);
        for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) for (let y = 4; y <= 5; y++) if (!a.hent(x + ix, h + y, z + iz)) a.sæt(x + ix, h + y, z + iz, ID.Blade);
        a.sæt(x, h + 6, z, ID.Blade);
      }
      a.pynt(a.antal(30), () => (R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]), [ID["Græs"]]);
    },
  },

  {
    id: "pirat", navn: "Piratøen", ikon: "🏴‍☠️", tekst: "En ø med palmer, papegøjer og et piratskib med kanoner. Find de røde krydser, og grav skatten op med hammeren!",
    himmel: ["#2f94ee", "#c4ecff"], tåge: [38, 96], hav: "#1fb0c8", sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#c8b070", 2.3, 1.5], stemning: "glad", tyngde: 28,
    størrelse: [144, 48, 144],
    dyr: ["papegoje", "papegoje", "krabbe", "krabbe", "krabbe"], antal: 11,
    point: true,                                                 // ⭐ for hver skat
    hotbar: ["Sand", "Palmestamme", "Palmeblade", "Skibsplanker", "Sejl", "Kanon", "Skattekiste", "TNT", "æg:papegoje"],
    vis: ["Skattekiste", "Piratflag", "Kanon"],
    hent: ["Begraver skattene…", "Hejser piratflaget…", "Lader kanonerne…", "Lærer papegøjerne at snakke…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      const RØ = Math.min(BX, BZ) / 2 - 22;                        // øens størrelse
      const land = (x, z) => 1 - Math.hypot(x - cx, (z - cz) * 1.1) / RØ + (støj(x / 26, z / 26) - 0.5) * 0.35;
      a.terræn((x, z) => {
        const m = land(x, z);
        if (m < 0) return Math.max(2, Math.round(5 + m * 12));                        // havbunden
        if (m < 0.12) return 7;                                                        // stranden
        return Math.round(8 + støj(x / 14 + 7, z / 14) * 5 * Math.min(1, (m - 0.12) * 4));
      }, (x, z, y, h) => {
        if (y === 0) return ID.Bundsten;
        const m = land(x, z), strand = m < 0.16 || støj(x / 9 + 80, z / 9) > 0.72;
        if (y < h - 3) return ID.Sten;
        return strand || m < 0 ? ID.Sand : y === h ? ID["Græs"] : ID.Jord;
      });
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };

      // Palmer med skrå stammer og store blade
      const palme = (x, z) => {
        const h = h0(x, z), hs = 5 + Math.floor(R() * 3), dx = R() < 0.5 ? 1 : -1, dz = R() < 0.5 ? 1 : 0;
        let px = x, pz = z;
        for (let y = 1; y <= hs; y++) { if (y === 3 || y === 5) { px += dx; pz += dz; } a.sæt(px, h + y, pz, ID.Palmestamme); }
        const ty = h + hs + 1;
        a.sæt(px, ty, pz, ID.Palmeblade);
        for (const [ix, iz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          a.sæt(px + ix, ty, pz + iz, ID.Palmeblade); a.sæt(px + ix * 2, ty, pz + iz * 2, ID.Palmeblade);
          a.sæt(px + ix * 3, ty - 1, pz + iz * 3, ID.Palmeblade);
        }
        for (const [ix, iz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) a.sæt(px + ix, ty - 1, pz + iz, ID.Palmeblade);
      };
      for (let n = 0; n < a.antal(34); n++) {
        const x = 4 + Math.floor(R() * (BX - 8)), z = 4 + Math.floor(R() * (BZ - 8)), h = h0(x, z);
        if (h < 7 || a.hent(x, h + 1, z) || a.nærStart(x, z, 6)) continue;
        palme(x, z);
      }

      // Piratskibet ligger ude i vandet syd for øen, med en bro ind til stranden
      const sx = cx, sz = Math.min(BZ - 8, Math.round(cz + RØ * 0.95 + 10)), dæk = 8;
      const bred = x => (x > 6 ? Math.max(1, Math.round(4 - (x - 6) * 0.6)) : 4);   // stævnen bliver smal
      for (let lx = -12; lx <= 12; lx++) {
        const w = bred(lx), x = sx + lx;
        for (let lz = -w; lz <= w; lz++) {
          const z = sz + lz, side = Math.abs(lz) === w || lx === -12 || lx === 12;
          for (let y = 3; y < dæk; y++) a.sæt(x, y, z, side || y === 3 ? ID.Skibsplanker : 0);   // skroget, hult indeni
          a.sæt(x, dæk, z, side ? ID.Skibsplanker : ID.Planker);
          if (side) a.sæt(x, dæk + 1, z, ID.Skibsplanker);                               // rælingen
          top[x + z * BX] = dæk;
        }
      }
      for (const lx of [-2, 2, 5]) for (const s of [-1, 1]) a.sæt(sx + lx, dæk + 1, sz + s * bred(lx), ID.Kanon);   // kanoner i siderne
      for (let lx = 13; lx <= 16; lx++) a.sæt(sx + lx, dæk + 1 + Math.floor((lx - 13) / 2), sz, ID.Træstamme);          // bovsprydet
      // Kahytten agterude med vinduer og en skattekiste
      for (let lx = -12; lx <= -8; lx++) for (let lz = -3; lz <= 3; lz++) {
        const væg = lx === -12 || lx === -8 || Math.abs(lz) === 3;
        for (let y = dæk + 1; y <= dæk + 3; y++) a.sæt(sx + lx, y, sz + lz, væg ? (y === dæk + 2 && (lz === 0 || lx === -10) ? ID.Glas : ID.Skibsplanker) : 0);
        a.sæt(sx + lx, dæk + 4, sz + lz, ID.Skibsplanker);
        if (væg && (lx + lz) % 2) a.sæt(sx + lx, dæk + 5, sz + lz, ID.Skibsplanker);
      }
      a.sæt(sx - 8, dæk + 1, sz, 0); a.sæt(sx - 8, dæk + 2, sz, 0);                    // døren
      a.sæt(sx - 11, dæk + 1, sz - 2, ID.Skattekiste); a.sæt(sx - 11, dæk + 1, sz + 2, ID.Lampe);
      // Master, sejl, udkigstønde og piratflaget på toppen
      for (const [lx, højde] of [[-3, 13], [4, 15]]) {
        søjle(sx + lx, sz, dæk + 1, dæk + højde, ID.Træstamme);
        for (let y = dæk + 5; y <= dæk + højde - 2; y++) for (let lz = -3; lz <= 3; lz++) if (lz) a.sæt(sx + lx + 1, y, sz + lz, ID.Sejl);
        for (const [ix, iz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) a.sæt(sx + lx + ix, dæk + højde - 1, sz + iz, ID.Skibsplanker);
        for (let fx = 1; fx <= 3; fx++) for (let fy = 0; fy <= 1; fy++) a.sæt(sx + lx - fx, dæk + højde - fy, sz, ID.Piratflag);
      }
      // Broen fra stranden ud til skibet
      { let z = sz - bred(0) - 1;
        while (z > 2 && h0(sx + 7, z) < 7) {
          for (let x = sx + 6; x <= sx + 8; x++) a.sæt(x, dæk, z, ID.Planker);
          if (z % 4 === 0) for (const x of [sx + 6, sx + 8]) søjle(x, z, Math.max(1, h0(x, z) + 1), dæk - 1, ID.Træstamme);
          z--;
        }
        for (let zz = sz - bred(0) - 1; zz < sz - 3; zz++) a.sæt(sx + 7, dæk + 1, zz, 0);
      }

      // Piratlejren på øen: et telt af sejl, en tønde og en kiste til at starte med
      { const lx = cx + 7, lz = cz - 5, h = h0(lx, lz);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) a.sæt(lx + dx, h + 3 - Math.abs(dx), lz + dz, ID.Sejl);
        a.sæt(lx, h + 1, lz + 3, ID.Skattekiste);
        a.sæt(lx - 4, h0(lx - 4, lz) + 1, lz, ID.Kanon);
      }

      // De begravede skatte: et rødt kryds i sandet — og kisten ligger to blokke nede
      for (let n = 0; n < a.antal(7); n++) {
        const x = 4 + Math.floor(R() * (BX - 8)), z = 4 + Math.floor(R() * (BZ - 8)), h = h0(x, z);
        if (h < 7 || a.nærStart(x, z, 8) || a.hent(x, h + 1, z) || ![ID.Sand, ID["Græs"]].includes(a.hent(x, h, z))) continue;
        a.sæt(x, h, z, ID.Skattekryds); a.sæt(x, h - 1, z, ID.Sand); a.sæt(x, h - 2, z, ID.Skattekiste);
      }
      a.pynt(a.antal(30), () => (R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]), [ID["Græs"]]);
    },
  },

  {
    id: "hav", navn: "Havbunden", ikon: "🐠", tekst: "Svøm rundt mellem koralrev, tangskove, et sunket skib og gamle ruiner. Her bor fisk, skildpadder og en stor hval!",
    himmel: ["#0a3d70", "#1f78b8"], tåge: [12, 50], hav: null, sol: "#dff6ff", solStr: 18, skyer: null,
    lys: ["#bfe8ff", "#1a4a6a", 2.1, 1.0], stemning: "rum", tyngde: 28,
    størrelse: [128, 48, 128],
    dyr: ["klovnfisk", "klovnfisk", "blaafisk", "blaafisk", "skildpadde", "blaeksprutte", "hval"], antal: 14,
    undervand: true, sne: "bobler", point: true,                // man svømmer overalt, bobler stiger op, ⭐ for skatte
    hotbar: ["Sand", "Koralblok", "Prismarin", "Havlygte", "Tang", "Rød koral", "Gul koral", "Skattekiste", "æg:klovnfisk"],
    vis: ["Koralblok", "Prismarin", "Havlygte"],
    hent: ["Fylder havet med vand…", "Planter koraller…", "Gemmer skattene…", "Vækker hvalen…"],
    generer(a) {
      const { R, støj, ID, BX, BY, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      const maks = Math.max(6, BY - 16);                               // der skal være masser af vand at svømme i
      const rev = (x, z) => støj(x / 16 + 300, z / 16 + 300), skov = (x, z) => støj(x / 13 + 900, z / 13 + 100);
      a.terræn((x, z) => {
        const midt = Math.max(0, Math.min(1, 1.6 - Math.hypot(x - cx, z - cz) / 12));   // fladt sand omkring startstedet
        let h = 8 + støj(x / 18, z / 18) * 5 + støj(x / 6 + 20, z / 6) * 1.5 - 2;
        const grøft = støj(x / 30 + 50, z / 30 + 70);
        if (grøft < 0.28) h -= (0.28 - grøft) * 20;                     // en dyb grøft
        if (rev(x, z) > 0.62) h += (rev(x, z) - 0.62) * 14;             // klipper, hvor koralrevene gror
        return Math.max(2, Math.min(maks, Math.round(h * (1 - midt) + 8 * midt)));
      }, (x, z, y, h) => {
        if (y === 0) return ID.Bundsten;
        if (rev(x, z) > 0.62 && !a.nærStart(x, z, 12)) return y === h ? (støj(x / 3, z / 3) > 0.45 ? ID.Koralblok : ID.Sten) : ID.Sten;
        return y > h - 3 ? ID.Sand : ID.Sten;
      });
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };
      const KORALLER = [ID["Rød koral"], ID["Gul koral"], ID["Lilla koral"]];

      // Koralrev: koraller og koralblokke oven på klipperne
      for (let n = 0; n < a.antal(150); n++) {
        const x = 1 + Math.floor(R() * (BX - 2)), z = 1 + Math.floor(R() * (BZ - 2)), h = h0(x, z);
        if (rev(x, z) < 0.55 || a.hent(x, h + 1, z) || a.nærStart(x, z, 5)) continue;
        if (R() < 0.25) { søjle(x, z, h + 1, h + 1 + Math.floor(R() * 3), ID.Koralblok); a.sæt(x, h + 4, z, KORALLER[Math.floor(R() * 3)]); }
        else a.sæt(x, h + 1, z, KORALLER[Math.floor(R() * 3)]);
      }
      // Tangskove: høje, grønne tangplanter
      for (let n = 0; n < a.antal(170); n++) {
        const x = 1 + Math.floor(R() * (BX - 2)), z = 1 + Math.floor(R() * (BZ - 2)), h = h0(x, z);
        if (skov(x, z) < 0.6 || a.hent(x, h, z) !== ID.Sand || a.hent(x, h + 1, z) || a.nærStart(x, z, 5)) continue;
        søjle(x, z, h + 1, Math.min(maks + 8, h + 3 + Math.floor(R() * 10)), ID.Tang);
      }
      // Det sunkne skib: skæv skrog, knækket mast, iturevet sejl og en kiste
      { const sx = Math.min(BX - 12, cx + 20), sz = Math.min(BZ - 8, cz + 14), h = h0(sx, sz);
        for (let lx = -8; lx <= 8; lx++) {
          const w = lx > 4 ? Math.max(1, 3 - (lx - 4)) : 3, x = sx + lx, hæld = Math.floor((lx + 8) / 6);
          for (let lz = -w; lz <= w; lz++) {
            const z = sz + lz, side = Math.abs(lz) === w || lx === -8;
            for (let y = h - 1 + hæld; y <= h + 3 + hæld; y++) a.sæt(x, y, z, side || y === h - 1 + hæld ? ((x + y) % 7 === 0 ? 0 : ID.Skibsplanker) : 0);
          }
        }
        for (let i = 0; i < 8; i++) a.sæt(sx - 2 + i, h + 1, sz + 5 + (i > 4 ? 1 : 0), ID.Træstamme);   // masten ligger ned
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 3) a.sæt(sx + i, h + 1 + j, sz + 7, ID.Sejl);
        a.sæt(sx - 5, h + 1, sz, ID.Skattekiste); a.sæt(sx - 5, h + 2, sz + 1, ID.Havlygte);
      }
      // Ruinerne af en gammel havby: søjler, buer og lysende havlygter
      { const rx = Math.max(10, cx - 24), rz = Math.max(10, cz - 18), h = h0(rx, rz);
        for (let x = rx - 7; x <= rx + 7; x++) for (let z = rz - 7; z <= rz + 7; z++) { a.sæt(x, h, z, ID.Prismarin); for (let y = h + 1; y <= h + 9; y++) a.sæt(x, y, z, 0); }
        for (const [dx, dz] of [[-6, -6], [-6, 0], [-6, 6], [6, -6], [6, 0], [6, 6], [0, -6], [0, 6]]) {
          const hs = 3 + Math.floor(R() * 6);
          søjle(rx + dx, rz + dz, h + 1, h + hs, ID.Prismarin);
          if (hs > 6) a.sæt(rx + dx, h + hs + 1, rz + dz, ID.Havlygte);
        }
        for (let x = rx - 6; x <= rx + 6; x++) if (x % 3) a.sæt(x, h + 7, rz - 6, ID.Prismarin);   // en bue
        søjle(rx, rz, h + 1, h + 2, ID.Prismarin); a.sæt(rx, h + 3, rz, ID.Havlygte);
        a.sæt(rx + 2, h + 1, rz + 2, ID.Skattekiste);
      }
      // Skattekister, der ligger halvt begravet rundt omkring
      for (let n = 0; n < a.antal(4); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID.Sand || a.hent(x, h + 1, z) || a.nærStart(x, z, 8)) continue;
        a.sæt(x, h, z, ID.Skattekiste);
      }
      // Havlygter hist og her, så man kan finde vej
      a.pynt(a.antal(10), ID.Havlygte, [ID.Sand, ID.Sten]);
      a.pynt(a.antal(40), () => (R() < 0.6 ? ID.Tang : KORALLER[Math.floor(R() * 3)]), [ID.Sand]);
    },
  },

  {
    id: "slik", navn: "Slikland", ikon: "🍭", tekst: "Bakker af glasur, en chokoladeflod, honningkagehuse og skumfiduser, man kan hoppe på. Og det regner med slik!",
    himmel: ["#ff9ad0", "#ffe6f5"], tåge: [34, 88], hav: "#6a3a18", sol: "#fff6b0", skyer: "#ffd6ee",
    lys: ["#fff0f8", "#b07aa0", 2.3, 1.3], stemning: "glad", tyngde: 28,
    størrelse: [128, 48, 128],
    dyr: ["gummibjorn", "gummibjorngron", "gummibjorn", "enhjorning", "enhjorning"], antal: 10,
    sne: "slik", vand: "chokolade",                              // slikregn, og floden er af chokolade
    hotbar: ["Glasur", "Chokolade", "Slikstok", "Slikkepind", "Skumfidus", "Honningkage", "Vingummi", "Kage", "æg:enhjorning"],
    vis: ["Slikkepind", "Slikstok", "Skumfidus"],
    hent: ["Bager kagen…", "Smelter chokoladen…", "Drysser krymmel…", "Puster skumfiduserne op…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      const flodZ = x => cz + 18 + Math.sin(x / 14) * 6 + Math.sin(x / 5.3) * 1.5;   // chokoladefloden bugter sig på tværs
      a.terræn((x, z) => {
        const kant = Math.min(1, Math.min(x, z, BX - 1 - x, BZ - 1 - z) / 8);
        const midt = Math.max(0, 1 - Math.hypot(x - cx, z - cz) / 10);
        let h = 11 + (støj(x / 16, z / 16) * 7 + støj(x / 6 + 30, z / 6) * 1.5 - 4) * (1 - midt);
        const d = Math.abs(z - flodZ(x));
        if (d < 5 && kant >= 1) h = Math.max(9, Math.min(h, 9 + (d - 2.6) * 1.5));      // flodbredden
        return Math.round(5 + (h - 5) * kant);
      }, (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 4 ? ID.Chokolade : y < h ? ID.Kagebund : ID.Glasur));
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };

      // Chokoladefloden (rigtigt vand, bare af chokolade) med broer af honningkage
      for (let x = 9; x < BX - 9; x++) {
        const fz = flodZ(x);
        for (let z = Math.floor(fz - 3); z <= fz + 3; z++) {
          if (Math.abs(z - fz) >= 2.6) continue;
          for (let y = 7; y <= h0(x, z) + 1; y++) a.sæt(x, y, z, 0);
          a.sæt(x, 6, z, ID.Chokolade); a.sæt(x, 7, z, ID.Vand); a.sæt(x, 8, z, ID.Vand);
          top[x + z * BX] = 6;
        }
        if (x % 28 === 14) for (let z = Math.floor(fz - 4); z <= fz + 4; z++) for (let dx = 0; dx < 3; dx++) a.sæt(x + dx, 9, z, ID.Honningkage);
      }
      // Den store lagkage med lys på toppen
      { const kx = cx + 9, kz = cz - 8, h = h0(kx, kz);
        for (const [r, y0, y1] of [[3, 1, 3], [2, 4, 6], [1, 7, 8]]) for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) søjle(kx + x, kz + z, h + y0, h + y1, ID.Kage);
        for (const [dx, dz] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) a.sæt(kx + dx, h + 9, kz + dz, ID.Lampe);
        a.sæt(kx, h + 9, kz, ID["Rød uld"]);
      }
      // Honningkagehuse med vingummivinduer, tag af skumfidus og slikstokke ved døren
      for (let n = 0; n < a.antal(6); n++) {
        const x0 = 8 + Math.floor(R() * (BX - 20)), z0 = 8 + Math.floor(R() * (BZ - 20));
        if (a.nærStart(x0 + 3, z0 + 3, 9) || Math.abs(z0 + 3 - flodZ(x0 + 3)) < 9) continue;
        let h = 0; for (let x = x0; x < x0 + 7; x++) for (let z = z0; z < z0 + 7; z++) h = Math.max(h, h0(x, z));
        for (let x = x0; x < x0 + 7; x++) for (let z = z0; z < z0 + 7; z++) {
          søjle(x, z, h0(x, z) + 1, h, ID.Kagebund);
          const væg = x === x0 || x === x0 + 6 || z === z0 || z === z0 + 6;
          for (let y = 1; y <= 4; y++) a.sæt(x, h + y, z, !væg ? 0 : y === 2 && (x === x0 + 3 || z === z0 + 3) ? ID.Vingummi : ID.Honningkage);
        }
        for (let k = 0; k < 4; k++) for (let x = x0 - 1 + k; x <= x0 + 7 - k; x++) for (let z = z0 - 1 + k; z <= z0 + 7 - k; z++) a.sæt(x, h + 5 + k, z, ID.Skumfidus);
        a.sæt(x0 + 3, h + 1, z0, 0); a.sæt(x0 + 3, h + 2, z0, 0);
        søjle(x0 + 2, z0 - 1, h + 1, h + 3, ID.Slikstok); søjle(x0 + 4, z0 - 1, h + 1, h + 3, ID.Slikstok);
        a.sæt(x0 + 1, h + 1, z0 + 5, ID.Lampe);
      }
      // Slikkepinde-træer og kæmpe slikstokke
      for (let n = 0; n < a.antal(26); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID.Glasur || a.hent(x, h + 1, z) || a.nærStart(x, z, 5)) continue;
        if (R() < 0.6) {
          const hs = 3 + Math.floor(R() * 3), langsX = R() < 0.5;
          søjle(x, z, h + 1, h + hs, ID["Hvid uld"]);
          for (let i = -1; i <= 1; i++) for (let j = 0; j <= 2; j++) a.sæt(x + (langsX ? i : 0), h + hs + j, z + (langsX ? 0 : i), ID.Slikkepind);
        } else {
          const hs = 4 + Math.floor(R() * 3), dx = R() < 0.5 ? 1 : -1;
          søjle(x, z, h + 1, h + hs, ID.Slikstok);
          a.sæt(x + dx, h + hs + 1, z, ID.Slikstok); a.sæt(x + 2 * dx, h + hs, z, ID.Slikstok); a.sæt(x, h + hs + 1, z, ID.Slikstok);
        }
      }
      // Skumfidusbakker, man kan hoppe på, og bunker af vingummi
      for (let n = 0; n < a.antal(4); n++) {
        const bx = 8 + Math.floor(R() * (BX - 16)), bz = 8 + Math.floor(R() * (BZ - 16)), r = 2 + Math.floor(R() * 2);
        if (a.nærStart(bx, bz, 8) || Math.abs(bz - flodZ(bx)) < 7) continue;
        for (let x = bx - r; x <= bx + r; x++) for (let z = bz - r; z <= bz + r; z++) {
          const hh = Math.round(Math.sqrt(Math.max(0, r * r - (x - bx) ** 2 - (z - bz) ** 2)));
          søjle(x, z, h0(x, z) + 1, h0(x, z) + hh, ID.Skumfidus);
        }
      }
      for (let n = 0; n < a.antal(10); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h, z) === ID.Glasur && !a.hent(x, h + 1, z) && !a.nærStart(x, z, 5)) { a.sæt(x, h + 1, z, ID.Vingummi); if (R() < 0.5) a.sæt(x, h + 2, z, ID.Vingummi); }
      }
      a.pynt(a.antal(60), ID.Slikblomst, [ID.Glasur]);
    },
  },

  {
    id: "sky", navn: "Skyøerne", ikon: "☁️", tekst: "Svævende øer højt oppe i himlen med regnbuebroer, trampoliner og skyer, man kan hoppe på. Pas på kanten!",
    himmel: ["#4aa8ff", "#e8f6ff"], tåge: [44, 110], hav: null, sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#9ab0d0", 2.3, 1.4], stemning: "glad", tyngde: 20,
    størrelse: [128, 48, 128],
    dyr: ["skyfaar", "skyfaar", "drage", "drage", "gris"], antal: 10,
    hotbar: ["Græs", "Sky", "Regnbue", "Trampolin", "Himmelsten", "Hvid puds", "Guld", "Glas", "æg:drage"],
    vis: ["Sky", "Regnbue", "Trampolin"],
    hent: ["Puster skyerne op…", "Maler regnbuerne…", "Sender øerne til vejrs…", "Fylder luftballonerne…"],
    generer(a) {
      const { R, støj, ID, BX, BY, BZ, top } = a, cx = BX / 2, cz = BZ / 2;
      const H = Math.round(BY * 0.42);                                  // hovedøens højde
      a.terræn(() => 2, (x, z, y) => (y === 0 ? ID.Bundsten : ID.Sky));   // et blødt skyhav langt nede
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };
      // En svævende ø: græs ovenpå, jord og himmelsten nedenunder, der bliver spidsere nedad
      const ø = (ox, oz, r, h) => {
        for (let x = Math.floor(ox - r - 1); x <= ox + r + 1; x++) for (let z = Math.floor(oz - r - 1); z <= oz + r + 1; z++) {
          if (x < 1 || z < 1 || x >= BX - 1 || z >= BZ - 1) continue;
          const d = Math.hypot(x - ox, z - oz) / r + (støj(x / 5 + ox, z / 5 + oz) - 0.5) * 0.3;
          if (d > 1) continue;
          const dyb = Math.round((1 - d) * r * 0.9) + 1, th = h + Math.round((1 - d) * 1.4);
          for (let y = th - dyb; y <= th; y++) a.sæt(x, y, z, y === th ? ID["Græs"] : y > th - 2 ? ID.Jord : ID.Himmelsten);
          top[x + z * BX] = Math.max(top[x + z * BX], th);
        }
      };
      ø(cx, cz, 10, H);
      const øer = [[cx, cz, 10, H]];
      for (let n = 0; n < a.antal(13); n++) {
        const r = 4 + Math.floor(R() * 5), ox = r + 3 + Math.floor(R() * (BX - 2 * r - 6)), oz = r + 3 + Math.floor(R() * (BZ - 2 * r - 6));
        const h = Math.max(6, Math.min(BY - 10, H + Math.round((R() - 0.5) * 16)));
        if (øer.some(([x, z, rr]) => Math.hypot(x - ox, z - oz) < r + rr + 6)) continue;
        ø(ox, oz, r, h); øer.push([ox, oz, r, h]);
      }
      // Regnbuebroer fra hovedøen ud til de nærmeste øer
      const nære = øer.slice(1).map(ø2 => [ø2, Math.hypot(ø2[0] - cx, ø2[1] - cz)]).sort((p, q) => p[1] - q[1]).slice(0, 5);
      for (const [[ox, oz, r, h]] of nære) {
        const l = Math.hypot(ox - cx, oz - cz), ux = (ox - cx) / l, uz = (oz - cz) / l;
        for (let t = 8; t <= l - r + 1; t += 0.5) {
          const x = Math.round(cx + ux * t), z = Math.round(cz + uz * t), y = Math.round(H + 1 + (h - H) * Math.max(0, (t - 8) / Math.max(1, l - r - 7)));
          for (const s of [0, 1]) {
            const bx = x + Math.round(-uz * s), bz = z + Math.round(ux * s);
            if (!a.hent(bx, y, bz) || a.hent(bx, y, bz) === ID.Sky) a.sæt(bx, y, bz, ID.Regnbue);
            for (let k = 1; k <= 2; k++) if (a.hent(bx, y + k, bz) === ID.Blade) a.sæt(bx, y + k, bz, 0);
          }
        }
      }
      // Slottet i skyerne på hovedøen: hvide mure, tårne med guld og et regnbueflag
      { const sx = cx - 3, sz = cz - 9, h = top[cx + (cz - 6) * BX];
        for (let x = sx; x < sx + 7; x++) for (let z = sz; z < sz + 6; z++) {
          const væg = x === sx || x === sx + 6 || z === sz || z === sz + 5;
          søjle(x, z, h, h, ID["Hvid puds"]);
          for (let y = 1; y <= 4; y++) a.sæt(x, h + y, z, væg ? (y === 2 && (x === sx + 3 || z === sz + 2) ? ID.Glas : ID["Hvid puds"]) : 0);
          if (væg && (x + z) % 2 === 0) a.sæt(x, h + 5, z, ID["Hvid puds"]);
        }
        for (const [tx, tz] of [[sx, sz], [sx + 6, sz], [sx, sz + 5], [sx + 6, sz + 5]]) { søjle(tx, tz, h + 1, h + 7, ID["Hvid puds"]); a.sæt(tx, h + 8, tz, ID.Guld); }
        a.sæt(sx + 3, h + 1, sz + 5, 0); a.sæt(sx + 3, h + 2, sz + 5, 0);
        søjle(sx + 3, sz + 2, h + 5, h + 9, ID["Hvid puds"]); a.sæt(sx + 4, h + 9, sz + 2, ID.Regnbue); a.sæt(sx + 5, h + 9, sz + 2, ID.Regnbue);
        a.sæt(sx + 1, h + 1, sz + 1, ID.Lampe);
      }
      // Træer, blomster og en trampolin på hver ø
      for (let n = 0; n < a.antal(40); n++) {
        const x = 2 + Math.floor(R() * (BX - 4)), z = 2 + Math.floor(R() * (BZ - 4)), h = top[x + z * BX];
        if (a.hent(x, h, z) !== ID["Græs"] || a.hent(x, h + 1, z) || a.nærStart(x, z, 5)) continue;
        søjle(x, z, h + 1, h + 4, ID.Træstamme);
        for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) for (let y = 4; y <= 5; y++) if (!a.hent(x + ix, h + y, z + iz)) a.sæt(x + ix, h + y, z + iz, ID.Blade);
        a.sæt(x, h + 6, z, ID.Blade);
      }
      for (const [ox, oz, r] of øer) { const x = Math.round(ox + r * 0.5), z = Math.round(oz); if (a.hent(x, top[x + z * BX], z) === ID["Græs"] && !a.hent(x, top[x + z * BX] + 1, z)) a.sæt(x, top[x + z * BX], z, ID.Trampolin); }
      // Trampoliner nede i skyhavet under hovedøen, så man kan hoppe op igen
      for (let v = 0; v < 16; v++) { const x = Math.round(cx + Math.cos(v / 16 * Math.PI * 2) * 12), z = Math.round(cz + Math.sin(v / 16 * Math.PI * 2) * 12); a.sæt(x, 2, z, ID.Trampolin); }
      // Skyer, der svæver rundt, og luftballoner i stribede farver
      for (let n = 0; n < a.antal(22); n++) {
        const x = 4 + Math.floor(R() * (BX - 8)), z = 4 + Math.floor(R() * (BZ - 8)), y = Math.max(8, Math.min(BY - 4, H - 6 + Math.floor(R() * 16)));
        if (øer.some(([ox, oz, r]) => Math.hypot(ox - x, oz - z) < r + 4)) continue;
        for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) if (R() < 0.8) a.sæt(x + i, y, z + j, ID.Sky);
        a.sæt(x, y + 1, z, ID.Sky); a.sæt(x + 1, y + 1, z, ID.Sky);
      }
      for (let n = 0; n < a.antal(3); n++) {
        const x = 6 + Math.floor(R() * (BX - 12)), z = 6 + Math.floor(R() * (BZ - 12)), y = Math.min(BY - 5, H + 6 + Math.floor(R() * 6));
        if (Math.hypot(x - cx, z - cz) < 16) continue;
        const F = [ID["Rød uld"], ID["Gul uld"], ID["Blå uld"], ID["Lilla uld"]][Math.floor(R() * 4)];
        for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let k = -3; k <= 3; k++) {
          const d = Math.hypot(i, j * 0.8, k); if (d <= 3.2 && d > 2.2) a.sæt(x + i, y + j, z + k, (i + 3) % 3 === 0 ? ID["Hvid uld"] : F);
        }
        for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) a.sæt(x + i, y - 6, z + k, ID.Planker);
        for (const [i, k] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) søjle(x + i, z + k, y - 5, y - 3, ID.Træstamme);
      }
      a.pynt(a.antal(50), () => (R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]), [ID["Græs"]]);
    },
  },

  {
    id: "bondegaard", navn: "Bondegården", ikon: "🚜", tekst: "Marker, en rød lade, en vindmølle og en traktor. Plant spirer, se dem gro — og høst dem med hammeren!",
    himmel: ["#5aa8f0", "#e0f2ff"], tåge: [36, 92], hav: "#3f8fe0", sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#8a9a5a", 2.2, 1.4], stemning: "rolig", tyngde: 28,
    størrelse: [128, 48, 128],
    dyr: ["ko", "hone", "hone", "hest", "kanin", "kanin", "faar", "gris"], antal: 13,
    point: true,                                                 // ⭐ når man høster
    hotbar: ["Spire", "Muld", "Høballe", "Hegn", "Ladetræ", "Planker", "v:vand", "Græskar", "æg:hest"],
    vis: ["Hvede", "Høballe", "Ladetræ"],
    hent: ["Pløjer markerne…", "Sår frø…", "Maler laden rød…", "Fylder brændstof på traktoren…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a, cx = BX / 2, cz = BZ / 2, H = 10;
      a.terræn((x, z) => {
        const ud = Math.min(1, Math.max(0, (Math.hypot(x - cx, z - cz) - 40) / 16));
        const kant = Math.min(1, Math.min(x, z, BX - 1 - x, BZ - 1 - z) / 8);
        return Math.round(6 + (H - 6 + (støj(x / 18, z / 18) * 8 - 3) * ud) * kant);
      }, (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? ID.Jord : ID["Græs"]));
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };
      const kasse = (x0, z0, b, d, y0, y1, blok) => { for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) søjle(x, z, y0, y1, blok); };
      const tag = (x0, z0, b, d, y0, blok) => { for (let k = 0; ; k++) { const x1 = x0 - 1 + k, x2 = x0 + b - k, z1 = z0 - 1 + k, z2 = z0 + d - k; if (x1 > x2 || z1 > z2) break; kasse(x1, z1, x2 - x1 + 1, z2 - z1 + 1, y0 + k, y0 + k, blok); } };

      // Gårdspladsen: grusstier i et kors
      for (let i = -30; i <= 30; i++) for (let j = -1; j <= 1; j++) { a.sæt(cx + i, H, cz + j, ID.Sand); a.sæt(cx + j, H, cz + i, ID.Sand); }
      // Stuehuset: hvide mure, røde tagsten og en skorsten
      { const x0 = cx - 17, z0 = cz - 14, b = 9, d = 7;
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) {
          const væg = x === x0 || x === x0 + b - 1 || z === z0 || z === z0 + d - 1;
          a.sæt(x, H, z, ID.Planker);
          for (let y = 1; y <= 4; y++) a.sæt(x, H + y, z, !væg ? 0 : y === 2 && ((x - x0) % 3 === 1 || (z - z0) % 3 === 1) && !(x === x0 && z === z0) ? ID.Glas : ID["Hvid puds"]);
        }
        tag(x0, z0, b, d, H + 5, ID.Tagsten);
        a.sæt(x0 + 4, H + 1, z0 + d - 1, 0); a.sæt(x0 + 4, H + 2, z0 + d - 1, 0);
        søjle(x0 + 1, z0 + 1, H + 5, H + 8, ID.Mursten); a.sæt(x0 + 2, H + 1, z0 + 1, ID.Lampe);
      }
      // Den røde lade med høballer indenfor og en silo ved siden af
      { const x0 = cx + 5, z0 = cz - 19, b = 11, d = 9;
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) {
          const væg = x === x0 || x === x0 + b - 1 || z === z0 || z === z0 + d - 1;
          a.sæt(x, H, z, ID.Planker);
          for (let y = 1; y <= 6; y++) a.sæt(x, H + y, z, væg ? ((x === x0 || x === x0 + b - 1 || z === z0 + d - 1) && (y === 1 || y === 6) ? ID["Hvid puds"] : ID.Ladetræ) : 0);
        }
        for (let k = 0; k <= Math.floor(b / 2); k++) for (let z = z0 - 1; z <= z0 + d; z++) { a.sæt(x0 + k, H + 7 + k, z, ID.Tagsten); a.sæt(x0 + b - 1 - k, H + 7 + k, z, ID.Tagsten); }
        for (let x = x0 + 1; x < x0 + b - 1; x++) for (let k = 0; k < Math.min(x - x0, x0 + b - 1 - x); k++) { a.sæt(x, H + 7 + k, z0, ID.Ladetræ); a.sæt(x, H + 7 + k, z0 + d - 1, ID.Ladetræ); }
        for (let x = x0 + 4; x <= x0 + 6; x++) for (let y = 1; y <= 4; y++) a.sæt(x, H + y, z0 + d - 1, 0);                     // den store port
        for (const [dx, dz, hh] of [[1, 1, 3], [2, 1, 2], [1, 2, 2], [8, 1, 2], [9, 1, 3], [9, 2, 1]]) søjle(x0 + dx, z0 + dz, H + 1, H + hh, ID.Høballe);
        a.sæt(x0 + 5, H + 5, z0 + 1, ID.Lampe);
        const sx = x0 + b + 3, sz = z0 + 3;                                                                               // siloen
        for (let x = sx - 2; x <= sx + 2; x++) for (let z = sz - 2; z <= sz + 2; z++) {
          const d2 = (x - sx) ** 2 + (z - sz) ** 2;
          if (d2 <= 5) søjle(x, z, H + 1, H + 11, d2 >= 4 ? ID.Himmelsten : 0);
          if (d2 <= 5) a.sæt(x, H + 12, z, ID["Blå puds"]);
        }
        a.sæt(sx, H + 13, sz, ID["Blå puds"]);
      }
      // Markerne: rækker af muld med hvede, gulerødder og solsikker — og vandrender imellem
      const AFGRØDE = [ID.Hvede, ID.Gulerod, ID.Solsikke, ID.Hvede];
      [[-26, 6], [-12, 6], [2, 6], [-26, 20]].forEach(([dx, dz], i) => {
        const x0 = cx + dx, z0 = cz + dz;
        for (let x = x0; x < x0 + 11; x++) for (let z = z0; z < z0 + 11; z++) {
          if ((x - x0) % 4 === 3) { a.sæt(x, H, z, ID.Vand); a.sæt(x, H - 1, z, ID.Jord); continue; }        // vandrende
          a.sæt(x, H, z, ID.Muld);
          a.sæt(x, H + 1, z, R() < 0.12 ? ID.Spire : i === 3 && R() < 0.2 ? ID.Græskar : AFGRØDE[i]);
        }
        for (let x = x0 - 1; x <= x0 + 11; x++) for (const z of [z0 - 1, z0 + 11]) if (a.hent(x, H, z) === ID["Græs"]) a.sæt(x, H + 1, z, ID.Hegn);
        for (let z = z0; z <= z0 + 10; z++) for (const x of [x0 - 1, x0 + 11]) if (a.hent(x, H, z) === ID["Græs"] && z !== z0 + 5) a.sæt(x, H + 1, z, ID.Hegn);
      });
      // Folden til dyrene med hegn rundt om og en låge
      { const x0 = cx + 8, z0 = cz + 20, b = 18, d = 14;
        for (let x = x0; x <= x0 + b; x++) for (let z = z0; z <= z0 + d; z++) {
          const kant = x === x0 || x === x0 + b || z === z0 || z === z0 + d;
          if (kant && !(z === z0 && x >= x0 + 8 && x <= x0 + 9)) a.sæt(x, H + 1, z, ID.Hegn);
        }
        søjle(x0 + 3, z0 + 3, H + 1, H + 1, ID.Høballe); søjle(x0 + 4, z0 + 3, H + 1, H + 2, ID.Høballe);
      }
      // Vindmøllen med vinger af planker
      { const mx = cx + 24, mz = cz + 4;
        kasse(mx - 1, mz - 1, 3, 3, H + 1, H + 12, ID["Hvid puds"]);
        tag(mx - 1, mz - 1, 3, 3, H + 13, ID.Tagsten);
        a.sæt(mx, H + 1, mz + 1, 0); a.sæt(mx, H + 2, mz + 1, 0);
        for (let i = 1; i <= 5; i++) { a.sæt(mx, H + 10 + i, mz + 2, ID.Planker); a.sæt(mx, H + 10 - i, mz + 2, ID.Planker); a.sæt(mx + i, H + 10, mz + 2, ID.Planker); a.sæt(mx - i, H + 10, mz + 2, ID.Planker); }
        a.sæt(mx, H + 10, mz + 2, ID.Træstamme);
      }
      // Traktoren holder på gårdspladsen
      { const x0 = cx + 3, z0 = cz + 3;
        for (const x of [x0, x0 + 2]) { søjle(x, z0, H + 1, H + 2, ID.Obsidian); a.sæt(x, H + 1, z0 + 3, ID.Obsidian); }
        for (let z = z0; z <= z0 + 3; z++) søjle(x0 + 1, z, H + 1, H + 2, ID["Grøn uld"]);
        for (let x = x0; x <= x0 + 2; x++) { a.sæt(x, H + 2, z0 + 2, ID["Grøn uld"]); a.sæt(x, H + 2, z0 + 3, ID["Grøn uld"]); a.sæt(x, H + 3, z0, ID.Glas); a.sæt(x, H + 3, z0 + 1, ID.Glas); a.sæt(x, H + 4, z0, ID["Grøn uld"]); a.sæt(x, H + 4, z0 + 1, ID["Grøn uld"]); }
        søjle(x0 + 1, z0 + 3, H + 3, H + 4, ID.Sten); a.sæt(x0 + 1, H + 2, z0 + 4, ID.Lampe);
      }
      // Andedammen
      { const px = cx - 20, pz = cz + 38 > BZ - 12 ? cz - 30 : cz + 38;
        for (let x = px - 5; x <= px + 5; x++) for (let z = pz - 4; z <= pz + 4; z++) {
          const d = ((x - px) / 5) ** 2 + ((z - pz) / 4) ** 2;
          if (d < 1) { a.sæt(x, H, z, ID.Vand); a.sæt(x, H - 1, z, d < 0.5 ? ID.Vand : ID.Sand); a.sæt(x, H - 2, z, ID.Sand); }
          else if (d < 1.4) a.sæt(x, H, z, ID.Sand);
        }
      }
      // Træer uden for gården og blomster i græsset
      for (let n = 0; n < a.antal(26); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = top[x + z * BX];
        if (Math.hypot(x - cx, z - cz) < 34 || a.hent(x, h, z) !== ID["Græs"] || a.hent(x, h + 1, z)) continue;
        søjle(x, z, h + 1, h + 4, ID.Træstamme);
        for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) for (let y = 4; y <= 5; y++) if (!a.hent(x + ix, h + y, z + iz)) a.sæt(x + ix, h + y, z + iz, ID.Blade);
        a.sæt(x, h + 6, z, ID.Blade);
      }
      a.pynt(a.antal(50), () => (R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]), [ID["Græs"]]);
    },
  },

  {
    id: "dino", navn: "Dinodalen", ikon: "🦕", tekst: "En jungle med kæmpe træer, en vulkan og venlige dinosaurer. Find dino-æggene, og slå på dem med hammeren!",
    himmel: ["#6ab0e0", "#e8f4d8"], tåge: [30, 84], hav: "#3a9ab8", sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#5a8a3a", 2.1, 1.3], stemning: "rolig", tyngde: 28,
    størrelse: [144, 48, 144],
    dyr: ["langhals", "triceratops", "triceratops", "dinounge", "dinounge", "flyveogle", "flyveogle"], antal: 12,
    point: true, vulkan: dinoVulkan,
    hotbar: ["Græs", "Junglestamme", "Jungleblade", "Bregne", "Vulkansten", "Dinoæg", "Rede", "v:vand", "æg:dinounge"],
    vis: ["Dinoæg", "Bregne", "Vulkansten"],
    hent: ["Lader junglen gro…", "Varmer vulkanen op…", "Lægger dino-æg…", "Vækker langhalsen…"],
    generer(a) {
      const { R, støj, ID, BX, BY, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      const [vx, vz] = dinoVulkan(BX, BZ), VR = 17, VH = 24, rand = 10 + (1 - 3.5 / VR) * VH;
      a.terræn((x, z) => {
        const kant = Math.min(1, Math.min(x, z, BX - 1 - x, BZ - 1 - z) / 10);
        const midt = Math.max(0, 1 - Math.hypot(x - cx, z - cz) / 10);
        let h = 10 + (støj(x / 18, z / 18) * 8 + støj(x / 6 + 60, z / 6) * 2 - 5) * (1 - midt);
        const dv = Math.hypot(x - vx, z - vz);
        if (dv < VR) h = Math.max(h, 10 + (1 - dv / VR) * VH);                          // vulkanen
        if (dv < 3.5) h = rand - 3;                                                      // krateret
        return Math.round(6 + (h - 6) * kant);
      }, (x, z, y, h) => {
        if (y === 0) return ID.Bundsten;
        if (Math.hypot(x - vx, z - vz) < VR * 0.8) return ID.Vulkansten;
        return y < h - 3 ? ID.Sten : y < h ? ID.Jord : ID["Græs"];
      });
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };
      // Lava i krateret
      for (let x = Math.floor(vx - 3); x <= vx + 3; x++) for (let z = Math.floor(vz - 3); z <= vz + 3; z++) {
        if (Math.hypot(x - vx, z - vz) >= 3.2) continue;
        for (let y = h0(x, z) + 1; y < Math.min(BY - 6, Math.round(rand)); y++) a.sæt(x, y, z, ID.Lava);
      }
      const iVulkan = (x, z, ekstra = 0) => Math.hypot(x - vx, z - vz) < VR + ekstra;
      // Kæmpe junglertræer med tyk stamme, en stor krone og lianer, der hænger ned
      for (let n = 0; n < a.antal(22); n++) {
        const x = 4 + Math.floor(R() * (BX - 9)), z = 4 + Math.floor(R() * (BZ - 9)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID["Græs"] || a.hent(x, h + 1, z) || a.nærStart(x, z, 9) || iVulkan(x, z, 4)) continue;
        const hs = 8 + Math.floor(R() * 6), ty = h + hs;
        for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) søjle(x + dx, z + dz, h0(x + dx, z + dz) + 1, ty, ID.Junglestamme);
        const r = 3 + Math.floor(R() * 2);
        for (let ix = -r; ix <= r + 1; ix++) for (let iz = -r; iz <= r + 1; iz++) for (let dy = 0; dy <= 2; dy++) {
          const d = Math.hypot(ix - 0.5, iz - 0.5) + dy * 0.9;
          if (d <= r + 0.3 && !a.hent(x + ix, ty + dy, z + iz)) a.sæt(x + ix, ty + dy, z + iz, ID.Jungleblade);
        }
        for (let k = 0; k < 7; k++) {                                                   // lianer
          const v = R() * Math.PI * 2, lx = Math.round(x + 0.5 + Math.cos(v) * r), lz = Math.round(z + 0.5 + Math.sin(v) * r), l = 2 + Math.floor(R() * 4);
          if (a.hent(lx, ty, lz) !== ID.Jungleblade) continue;
          for (let y = ty - 1; y >= ty - l && !a.hent(lx, y, lz); y--) a.sæt(lx, y, lz, ID.Lian);
        }
      }
      // Små buske
      for (let n = 0; n < a.antal(40); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h, z) !== ID["Græs"] || a.hent(x, h + 1, z) || a.nærStart(x, z, 6) || iVulkan(x, z)) continue;
        a.sæt(x, h + 1, z, ID.Junglestamme);
        for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) if (!a.hent(x + ix, h + 2, z + iz)) a.sæt(x + ix, h + 2, z + iz, ID.Jungleblade);
        a.sæt(x, h + 3, z, ID.Jungleblade);
      }
      // Dino-reder med æg — én lige ved startstedet
      const rede = (x, z) => {
        const h = h0(x, z);
        for (let ix = -1; ix <= 1; ix++) for (let iz = -1; iz <= 1; iz++) { a.sæt(x + ix, h, z + iz, ID.Rede); for (let y = h + 1; y <= h + 2; y++) if (a.hent(x + ix, y, z + iz) !== ID.Junglestamme) a.sæt(x + ix, y, z + iz, 0); }
        a.sæt(x, h + 1, z, ID.Dinoæg);
        if (R() < 0.7) a.sæt(x + 1, h + 1, z, ID.Dinoæg);
        if (R() < 0.5) a.sæt(x, h + 1, z + 1, ID.Dinoæg);
      };
      rede(cx + 5, cz + 4);
      for (let n = 0; n < a.antal(5); n++) {
        const x = 6 + Math.floor(R() * (BX - 12)), z = 6 + Math.floor(R() * (BZ - 12));
        if (!a.nærStart(x, z, 12) && !iVulkan(x, z, 3) && a.hent(x, h0(x, z), z) === ID["Græs"]) rede(x, z);
      }
      a.pynt(a.antal(140), ID.Bregne, [ID["Græs"]]);
      a.pynt(a.antal(20), () => (R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]), [ID["Græs"]]);
    },
  },

  {
    id: "atom", navn: "NUKE-banen", ikon: "☢️", tekst: "Et ødeland med ruiner og lysende grønt slim. Tænd atombomberne, og løb væk — og pas på de lysende zombier!",
    himmel: ["#1f2a14", "#9ab04a"], tåge: [26, 82], hav: "#5ad02a", sol: "#f0ffb0", solStr: 30, skyer: "#8a9a6a",
    lys: ["#e0ffb0", "#3a4a2a", 1.9, 1.0], stemning: "uhyggelig", tyngde: 28,
    størrelse: [144, 48, 144],
    dyr: ["atomzombie", "atomzombie", "atomzombie", "atomfro"], antal: 12, genfød: true,
    sne: "atom",                                                 // små, grønne gnister i luften
    hotbar: ["Atombombe", "Atomtønde", "TNT", "Beton", "Aske", "Atomslim", "v:tænder", "v:brandslange", "æg:atomzombie"],
    vis: ["Atombombe", "Atomtønde", "Atomslim"],
    hent: ["Bygger bunkeren…", "Fylder tønderne med slim…", "Vækker de lysende zombier…", "Tæller ned: 3… 2… 1…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a, cx = BX / 2, cz = BZ / 2, h0 = (x, z) => top[x + z * BX];
      a.terræn((x, z) => {
        const kant = Math.min(1, Math.min(x, z, BX - 1 - x, BZ - 1 - z) / 10);
        const midt = Math.max(0, 1 - Math.hypot(x - cx, z - cz) / 12);
        const h = 10 + (støj(x / 22, z / 22) * 5 + støj(x / 7 + 11, z / 7) * 1.5 - 3) * (1 - midt);
        return Math.round(5 + (h - 5) * kant);
      }, (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? ID.Jord : støj(x / 8 + 40, z / 8) > 0.58 ? ID["Mørkt græs"] : ID.Aske));
      const søjle = (x, z, y0, y1, blok) => { for (let y = y0; y <= y1; y++) a.sæt(x, y, z, blok); };

      // Gamle kratere med lysende slim i bunden
      for (let n = 0; n < a.antal(8); n++) {
        const kx = 8 + Math.floor(R() * (BX - 16)), kz = 8 + Math.floor(R() * (BZ - 16)), r = 3 + R() * 2.5;
        if (a.nærStart(kx, kz, 20)) continue;
        for (let x = Math.floor(kx - r); x <= kx + r; x++) for (let z = Math.floor(kz - r); z <= kz + r; z++) {
          const d = Math.hypot(x - kx, z - kz);
          if (d > r) continue;
          const i = x + z * BX, dyb = Math.round((1 - d / r) * r * 0.6);
          for (let k = 0; k < dyb; k++) a.sæt(x, top[i]--, z, 0);
          a.sæt(x, top[i], z, d < r * 0.45 ? ID.Atomslim : ID.Aske);
        }
      }
      // Ruinbyen: betonhuse med huller i murene og uden tag, og bunker af murbrokker
      for (let n = 0; n < a.antal(16); n++) {
        const b = 5 + Math.floor(R() * 5), d = 5 + Math.floor(R() * 5), x0 = 4 + Math.floor(R() * (BX - b - 8)), z0 = 4 + Math.floor(R() * (BZ - d - 8));
        if (a.nærStart(x0 + b / 2, z0 + d / 2, 18)) continue;
        const h = h0(x0, z0), hs = 4 + Math.floor(R() * 8);
        for (let x = x0; x < x0 + b; x++) for (let z = z0; z < z0 + d; z++) {
          const væg = x === x0 || x === x0 + b - 1 || z === z0 || z === z0 + d - 1;
          søjle(x, z, Math.min(h, h0(x, z)), h, ID.Beton);
          if (!væg) { for (let y = h + 1; y <= h + hs + 1; y++) a.sæt(x, y, z, (y - h) % 4 === 0 && R() < 0.6 ? ID.Beton : 0); continue; }
          const højde = hs - Math.floor(R() * 4);
          for (let y = h + 1; y <= h + højde; y++) a.sæt(x, y, z, R() < 0.16 ? 0 : (y - h) % 4 === 2 && R() < 0.3 ? ID.Glas : ID.Beton);
        }
        for (let k = 0; k < 6; k++) { const x = x0 - 1 + Math.floor(R() * (b + 2)), z = z0 - 1 + Math.floor(R() * (d + 2)); if (!a.hent(x, h0(x, z) + 1, z)) a.sæt(x, h0(x, z) + 1, z, R() < 0.5 ? ID.Beton : ID.Sten); }
      }
      // Bilvrag i mange farver
      const BILER = [ID["Rød uld"], ID["Blå uld"], ID["Gul uld"], ID["Grøn uld"], ID["Hvid uld"]];
      for (let n = 0; n < a.antal(10); n++) {
        const x = 5 + Math.floor(R() * (BX - 10)), z = 5 + Math.floor(R() * (BZ - 10)), h = h0(x, z), f = BILER[Math.floor(R() * BILER.length)];
        if (a.nærStart(x, z, 14) || a.hent(x, h + 1, z)) continue;
        for (let dz = 0; dz < 4; dz++) for (let dx = 0; dx < 2; dx++) { a.sæt(x + dx, h + 1, z + dz, (dz === 0 || dz === 3) ? ID.Obsidian : f); if (dz === 1 || dz === 2) a.sæt(x + dx, h + 2, z + dz, dz === 1 ? ID.Glas : f); }
      }
      // Døde træer og atomtønder rundt omkring
      for (let n = 0; n < a.antal(12); n++) {
        const x = 3 + Math.floor(R() * (BX - 6)), z = 3 + Math.floor(R() * (BZ - 6)), h = h0(x, z);
        if (a.hent(x, h + 1, z) || a.nærStart(x, z, 10)) continue;
        const hs = 3 + Math.floor(R() * 3);
        søjle(x, z, h + 1, h + hs, ID["Død stamme"]);
        if (R() < 0.6) a.sæt(x + 1, h + hs - 1, z, ID["Død stamme"]);
      }
      a.pynt(a.antal(22), ID.Atomtønde, [ID.Aske, ID["Mørkt græs"]]);

      // Bunkeren ved startstedet: en betonplads, sandsække, lamper og et stativ med atombomber
      const hB = h0(cx, cz);
      for (let x = cx - 6; x <= cx + 6; x++) for (let z = cz - 6; z <= cz + 6; z++) {
        søjle(x, z, Math.min(hB, h0(x, z)), hB, ID.Beton);
        for (let y = hB + 1; y <= hB + 6; y++) a.sæt(x, y, z, 0);
        top[x + z * BX] = hB;
        const kant = Math.abs(x - cx) === 6 || Math.abs(z - cz) === 6;
        if (kant && Math.abs(x - cx) > 1 && Math.abs(z - cz) > 1) a.sæt(x, hB + 1, z, ID.Sandsæk);
      }
      for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) { søjle(cx + dx, cz + dz, hB + 1, hB + 2, ID.Beton); a.sæt(cx + dx, hB + 3, cz + dz, ID.Lampe); }
      for (let x = cx - 3; x <= cx + 3; x++) { a.sæt(x, hB + 1, cz - 4, ID.Planker); a.sæt(x, hB + 2, cz - 4, x === cx ? ID.Atomtønde : ID.Atombombe); }
      // Missilet i siloen: tænd bomben i bunden, så går det af
      { const sx = Math.min(BX - 8, cx + 16), sz = Math.max(8, cz - 14), h = h0(sx, sz);
        for (let x = sx - 3; x <= sx + 3; x++) for (let z = sz - 3; z <= sz + 3; z++) {
          const d = Math.hypot(x - sx, z - sz);
          if (d > 3.4) continue;
          søjle(x, z, h - 1, h - 1, ID.Beton);
          for (let y = h; y <= h + 3; y++) a.sæt(x, y, z, d > 2.5 ? ID.Beton : 0);
        }
        a.sæt(sx, h, sz, ID.Atombombe);
        søjle(sx, sz, h + 1, h + 8, ID["Hvid puds"]);
        søjle(sx, sz, h + 9, h + 10, ID["Rød uld"]);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) søjle(sx + dx, sz + dz, h + 1, h + 2, ID["Rød uld"]);
        a.sæt(sx, h + 5, sz + 1, ID.Atombombe);
      }
      a.pynt(a.antal(18), ID.Atomslim, [ID.Aske]);
    },
  },
];
