// ===== Verdenerne i Broekraft =====
// Tilføj en ny verden: kopiér en blok i VERDENER og skriv en ny opskrift (generer).
//  himmel:  [farve foroven, farve ved horisonten] · tåge: [start, slut] i blokke · hav: farve eller null
//  sol:     farve på den firkantede sol/måne (null = ingen) · solStr: størrelse · stjerner: true/false
//  jordklode: true viser Jorden på himlen · skyer: farve eller null
//  lys:     [himmellys, jordlys, styrke, sollys-styrke] (bruges på dyrene)
//  stemning: musikken — "rolig" | "uhyggelig" | "glad" | "rum" · tyngde: 28 er normalt (lavere = hop højere)
//  dyr:     hvilke dyr der bor der · antal: hvor mange · genfød: nye dyr dukker op når nogle forsvinder
//  hotbar:  blokkene man starter med (navne fra blokke.js) · vis: tre blokke der vises på verdens-kortet
//  generer: opskriften på terrænet — får værktøjer fra verden.js (terræn, pynt, sæt, hent, R, støj …)

export const VERDENER = [
  {
    id: "græsø", navn: "Græsøen", ikon: "🌳", tekst: "Den grønne ø med træer, blomster og mærkelige dyr.",
    himmel: ["#4a9df5", "#cde8ff"], tåge: [30, 72], hav: "#3f8fe0", sol: "#fff6b0", skyer: "#ffffff",
    lys: ["#ffffff", "#7a9a5a", 2.2, 1.4], stemning: "rolig", tyngde: 28,
    dyr: ["ko", "gris", "faar", "hone", "fro", "and", "snegl"], antal: 10,
    hotbar: ["Græs", "Planker", "Sten", "Glas", "Rød uld", "Gul uld", "Blå uld", "Regnbue", "æg:?"],
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
      for (let n = 0; n < 28; n++) {
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
      a.pynt(70, () => (R() < 0.5 ? ID["Rød blomst"] : ID["Gul blomst"]), [ID["Græs"]]);
    },
  },

  {
    id: "zombie", navn: "Zombieverdenen", ikon: "🧟", tekst: "Skumringsland med fjollede zombier og spøgelser. Tryk på dem — PUF!",
    himmel: ["#2a1b4d", "#8a5a9c"], tåge: [20, 58], hav: "#3a2a5a", sol: "#f2f0e0", solStr: 44, stjerner: true, skyer: "#6a5a7a",
    lys: ["#c8b0ff", "#40305a", 1.7, 0.9], stemning: "uhyggelig", tyngde: 28,
    dyr: ["zombie", "zombie", "zombiehone", "spogelse"], antal: 9, genfød: true,
    hotbar: ["Mørkt græs", "Gravsten", "Græskar", "Lygtemand", "Død stamme", "Spindelvæv", "Lilla uld", "Lampe", "æg:zombie"],
    vis: ["Mørkt græs", "Gravsten", "Lygtemand"],
    hent: ["Graver gravsten ned…", "Tænder lygtemænd…", "Vækker zombierne… uuuh!"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a;
      a.terræn((x, z) => Math.round(9 + støj(x / 16, z / 16) * 6 + støj(x / 6 + 30, z / 6) * 2 - 3),
        (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? ID.Jord : ID["Mørkt græs"]));
      // små kirkegårde
      for (let g = 0; g < 5; g++) {
        const cx = 4 + Math.floor(R() * (BX - 12)), cz = 4 + Math.floor(R() * (BZ - 12));
        if (a.nærStart(cx + 2, cz + 2, 7)) continue;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const x = cx + i * 2, z = cz + j * 2;
          if (R() < 0.8 && a.hent(x, top[x + z * BX], z) === ID["Mørkt græs"]) a.sæt(x, top[x + z * BX] + 1, z, ID.Gravsten);
        }
      }
      // døde træer med spindelvæv
      for (let n = 0; n < 22; n++) {
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
      a.pynt(40, () => (R() < 0.5 ? ID.Græskar : ID.Lygtemand), [ID["Mørkt græs"]]);
      a.pynt(30, ID["Lille svamp"], [ID["Mørkt græs"]]);
    },
  },

  {
    id: "svampe", navn: "Svampeverdenen", ikon: "🍄", tekst: "Kæmpe svampe du kan hoppe på! Boing!",
    himmel: ["#b58cff", "#ffd6f2"], tåge: [28, 70], hav: "#8a6fe0", sol: "#fff0a0", skyer: "#ffe0f5",
    lys: ["#fff0ff", "#9a7ab0", 2.2, 1.2], stemning: "glad", tyngde: 28,
    dyr: ["svampeko", "hoppesvamp", "hoppesvamp", "fro", "snegl"], antal: 10,
    hotbar: ["Svampejord", "Rød svamp", "Blå svamp", "Svampestok", "Lille svamp", "Glødesvamp", "Lyserød uld", "Regnbue", "æg:hoppesvamp"],
    vis: ["Rød svamp", "Svampestok", "Blå svamp"],
    hent: ["Gror kæmpe svampe…", "Pumper trampoliner op…", "Boing boing…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a;
      a.terræn((x, z) => Math.round(10 + støj(x / 20, z / 20) * 6 + støj(x / 8 + 10, z / 8) * 2 - 4),
        (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 3 ? ID.Sten : y < h ? ID.Jord : ID.Svampejord));
      for (let n = 0; n < 24; n++) {
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
      a.pynt(70, () => (R() < 0.7 ? ID["Lille svamp"] : ID.Glødesvamp), [ID.Svampejord]);
      a.pynt(14, () => (R() < 0.5 ? ID["Rød svamp"] : ID["Blå svamp"]), [ID.Svampejord]);
    },
  },

  {
    id: "maane", navn: "Ostemånen", ikon: "🧀", tekst: "Månen er lavet af ost! Her kan man hoppe SUPER højt.",
    himmel: ["#05051a", "#1c1c44"], tåge: [45, 110], hav: null, sol: "#ffffff", solStr: 26, stjerner: true, jordklode: true, skyer: null,
    lys: ["#ffffff", "#6a6a9a", 2.0, 1.6], stemning: "rum", tyngde: 9,
    dyr: ["rumvaesen", "rumvaesen", "ostemus", "ostemus"], antal: 10,
    hotbar: ["Ost", "Månesten", "Stjerneblok", "Krystal", "Hvid uld", "Rød uld", "Glas", "Lampe", "æg:rumvaesen"],
    vis: ["Ost", "Stjerneblok", "Månesten"],
    hent: ["Smelter osten…", "Tænder stjernerne…", "Lander raketten…"],
    generer(a) {
      const { R, støj, ID, BX, BZ, top } = a;
      a.terræn((x, z) => Math.round(9 + støj(x / 22, z / 22) * 3 + støj(x / 9, z / 9) * 1.5 - 1),
        (x, z, y, h) => (y === 0 ? ID.Bundsten : y < h - 4 ? ID.Månesten : ID.Ost));
      // kratere
      for (let n = 0; n < 11; n++) {
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
      a.pynt(34, ID.Krystal, [ID.Ost, ID.Månesten]);
      a.pynt(10, ID.Stjerneblok, [ID.Ost]);
      // en raket ved siden af startstedet
      const rx = BX / 2 + 4, rz = BZ / 2 + 2, rh = top[rx + rz * BX];
      for (let y = 1; y <= 5; y++) a.sæt(rx, rh + y, rz, y === 3 ? ID.Glas : ID["Hvid uld"]);
      a.sæt(rx, rh + 6, rz, ID["Rød uld"]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { a.sæt(rx + dx, rh + 1, rz + dz, ID["Rød uld"]); a.sæt(rx + dx, rh + 2, rz + dz, ID["Rød uld"]); }
    },
  },
];
