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
//  generer: opskriften på terrænet — får værktøjer fra verden.js (terræn, pynt, sæt, hent, R, støj …)

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
];
