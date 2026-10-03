import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  alleSegl,
  bossSpor,
  danGrotte,
  drik,
  fremskridt,
  givEliksirer,
  kanGå,
  kopiRejse,
  læsRejse,
  maxLiv,
  niveau,
  nyRejse,
  næsteOpgave,
  OPGAVER,
  opgradér,
  skade,
  startGrotte,
  sværdRammer,
} from "./eventyr.js";
import { bygGrotte, bygØ, frit, STEDER } from "./verden.js";
import { opdatérFlyvere } from "./projektiler.js";
import { fortsætSpor, friLinje, rumRute, ruteLængde, vælgMål, øRute } from "./navigation.js";
import { forsøgGem } from "./lagring.js";
import { guideEfterSkridt, tastFokus, trykTast } from "./styring.js";

test("200 frø: begge dybder har sammenhængende rum og et tilgængeligt mål", () => {
  for (let frø = 0; frø < 200; frø++) {
    for (let id = 0; id < 3; id++) {
      for (let dybde = 1; dybde <= 2; dybde++) {
        const g = danGrotte(frø, id, dybde), besøgt = new Set(["0,0"]), kø = [[0, 0]];
        for (let i = 0; i < kø.length; i++) {
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const [x, z] = kø[i], n = `${x + dx},${z + dz}`;
            if (besøgt.has(n) || !g.rum.some((r) => r.x === x + dx && r.z === z + dz)) continue;
            assert.ok(kanGå(g, x * 8 + dx * 4, z * 8 + dz * 4), "forbindelsen mellem to kamre er åben");
            besøgt.add(n);
            kø.push([x + dx, z + dz]);
          }
        }
        assert.equal(besøgt.size, g.rum.length);
        assert.ok(g.slut.afstand >= 2);
        assert.ok(kanGå(g, g.slut.x * 8, g.slut.z * 8));
        for (const t of g.ting) assert.ok(kanGå(g, t.x, t.z));
        assert.equal(new Set(g.rum.map((r) => `${r.x},${r.z}`)).size, g.rum.length);
      }
    }
  }
});
test("frø og besøg giver reproducerbare, forskellige grotter", () => {
  assert.deepEqual(danGrotte(123, 1, 2), danGrotte(123, 1, 2));
  assert.notDeepEqual(danGrotte(123, 1, 1).rum, danGrotte(124, 1, 1).rum);
  const s = nyRejse(42), a = startGrotte(s, 0), første = s.grotte.frø, b = startGrotte(s, 0);
  assert.notEqual(første, s.grotte.frø);
  assert.notDeepEqual(a.rum, b.rum);
  assert.deepEqual(b, danGrotte(s.grotte.frø, 0, 1));
  s.hentet = ["ø-kiste-0", "g0-ældretur-rum1", "g1-andentur-rum1"];
  s.beroliget = ["boss-0", "ø-fjende-1", "g0-ældretur-rum2"];
  startGrotte(s, 0);
  assert.deepEqual(s.hentet, ["ø-kiste-0", "g1-andentur-rum1"]);
  assert.deepEqual(s.beroliget, ["boss-0", "ø-fjende-1"]);
});
test("gemt fremgang genskaber nøjagtigt det igangværende grottebesøg", () => {
  const s = nyRejse(789);
  fremskridt(s, "mira");
  fremskridt(s, "krystal", 8);
  startGrotte(s, 2);
  s.grotte.dybde = 2;
  s.våben = "magi";
  s.hentet = ["ø-kiste-0"];
  const t = læsRejse(JSON.stringify(s));
  assert.deepEqual(t, s);
  assert.deepEqual(danGrotte(t.grotte.frø, t.grotte.id, t.grotte.dybde), danGrotte(s.grotte.frø, 2, 2));
  t.mønter = 999;
  assert.notEqual(s.mønter, 999);
});
test("ødelagte eller farlige gemninger afvises; position uden gulv repareres", () => {
  assert.equal(læsRejse("ikke json"), null);
  assert.equal(læsRejse("{}"), null);
  for (
    const ændring of [
      { frø: -1 },
      { hp: Infinity },
      { mana: 101 },
      { våben: "laser" },
      { udstyr: 4 },
      { besøg: [0] },
      { opgaver: { hack: 1 } },
      { hentet: ["a", "a"] },
      { grotte: { id: 9, dybde: 1, frø: 1 } },
    ]
  ) assert.equal(læsRejse({ ...nyRejse(1), ...ændring }), null);
  const s = nyRejse(1);
  startGrotte(s, 1);
  s.x = 190;
  s.z = 190;
  assert.equal(læsRejse(s).x, 0);
});
test("alle otte opgaver kan fuldføres én gang og porten kræver de tre segl", () => {
  const s = nyRejse(1);
  assert.equal(alleSegl(s), false);
  for (const o of OPGAVER) {
    assert.equal(næsteOpgave(s).id, o.id);
    const før = s.xp;
    assert.equal(fremskridt(s, o.id, o.mål)?.id, o.id);
    assert.equal(s.xp, før + o.xp);
    assert.equal(fremskridt(s, o.id, 100), null);
  }
  assert.equal(næsteOpgave(s), null);
  assert.ok(alleSegl(s));
  assert.ok(niveau(s) >= 4);
});
test("våben har forskellige svagheder; sværdets område er tæt og foran", () => {
  const s = nyRejse(1);
  s.våben = "sværd";
  const slim = skade(s, "slim"), sten = skade(s, "stenvogter");
  assert.ok(slim > sten);
  s.våben = "magi";
  assert.ok(skade(s, "stenvogter") > skade(s, "slim"));
  s.våben = "bue";
  assert.ok(skade(s, "krystaldyr") > skade(s, "slim"));
  assert.ok(sværdRammer({ x: 0, z: 0 }, { x: 0, z: -2 }, { x: 0, z: -1 }));
  assert.equal(sværdRammer({ x: 0, z: 0 }, { x: 0, z: 2 }, { x: 0, z: -1 }), false);
  assert.equal(sværdRammer({ x: 0, z: 0 }, { x: 0, z: -4 }, { x: 0, z: -1 }), false);
});
test("udstyr, eliksirer og niveau giver meningsfuld fremgang uden negative værdier", () => {
  const s = nyRejse(1);
  assert.equal(opgradér(s), false);
  s.mønter = 400;
  assert.ok(opgradér(s));
  assert.equal(s.mønter, 340);
  assert.equal(maxLiv(s), 110);
  s.hp = 1;
  s.mana = 0;
  assert.ok(drik(s));
  assert.equal(s.hp, 76);
  assert.equal(s.mana, 100);
  assert.equal(s.eliksirer, 2);
  s.xp = 360;
  assert.equal(niveau(s), 3);
  assert.equal(maxLiv(s), 138);
});
test("20 forskellige øer: landsby, alle grotteindgange, port og skatte er tilgængelige", () => {
  for (let frø = 0; frø < 20; frø++) {
    const v = bygØ({}, frø), kø = [[0, 5]], set = new Set(["0,5"]);
    for (let i = 0; i < kø.length; i++) {
      const [x, z] = kø[i];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = x + dx, b = z + dz, n = `${a},${b}`;
        if (set.has(n) || !frit(v, a, b) || !frit(v, (x + a) / 2, (z + b) / 2)) continue;
        set.add(n);
        kø.push([a, b]);
      }
    }
    for (const t of [...STEDER, ...v.ting]) {
      assert.ok(kø.some(([x, z]) => Math.hypot(t.x - x, t.z - z) < 2.5), `${t.id} kan bruges i ø med frø ${frø}`);
    }
    assert.ok(kø.length > 10000, "øen har et stort sammenhængende spilleområde");
    v.rod.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
});
test("Blenderbiblioteket indeholder alle spillemodeller uden eksterne filer", () => {
  const b = fs.readFileSync(new URL("./modeller/eventyr.glb", import.meta.url));
  assert.equal(b.subarray(0, 4).toString(), "glTF");
  assert.equal(b.readUInt32LE(4), 2);
  const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
  const navne = j.scenes[0].nodes.map((i) => j.nodes[i].name);
  for (
    const n of [
      "eventyrer",
      "følgesvend",
      "stenvogter",
      "slim",
      "krystaldyr",
      "sværd",
      "bue",
      "stav",
      "hus",
      "portal",
      "kiste",
      "gulvmodul",
      "vægmodul",
      "terrænmodul",
    ]
  ) assert.ok(navne.includes(n), n + " findes i GLB");
  assert.equal(navne.length, 22);
  assert.ok(j.buffers.every((b) => !b.uri));
  assert.ok(!j.images?.some((i) => i.uri));
  const helt = j.nodes.find((n) => n.name === "eventyrer");
  assert.ok(helt.children.some((i) => j.nodes[i].name === "benVenstre"));
  assert.ok(helt.children.some((i) => j.nodes[i].name === "armHøjre"));
});
test("to fjendeprojektiler: dødelig skade/områdeskift stopper iterationen uden gamle objekter", () => {
  const p = () => ({ obj: { position: { x: 0, z: 0 } }, dx: 1, dz: 0, liv: 2 });
  const skud = [p(), p()];
  let paused = false, ramt = 0;
  opdatérFlyvere(skud, .02, {
    erFrit: () => true,
    afbryd: () => paused,
    fjern: () => {},
    ramning: () => {
      ramt++;
      skud.length = 0;
      paused = true;
    },
  });
  assert.equal(ramt, 1);
  assert.equal(skud.length, 0);
  const igen = [p(), p()];
  ramt = 0;
  opdatérFlyvere(igen, .02, {
    erFrit: () => true,
    afbryd: () => false,
    fjern: () => {},
    ramning: () => {
      ramt++;
      igen.length = 0;
    },
  });
  assert.equal(ramt, 1, "listen må også erstattes uden pauseflag");
});
test("et projektil i en væg eller uden levetid kan aldrig skade i samme trin", () => {
  const p = (liv) => ({ obj: { position: { x: 0, z: 0 } }, dx: 1, dz: 0, liv });
  for (const [liv, frit] of [[2, false], [.01, true]]) {
    const skud = [p(liv)];
    let ramt = 0, fjernet = 0;
    opdatérFlyvere(skud, .02, {
      erFrit: () => frit,
      afbryd: () => false,
      fjern: () => fjernet++,
      ramning: () => ramt++,
    });
    assert.equal(ramt, 0);
    assert.equal(fjernet, 1);
    assert.equal(skud.length, 0);
  }
});
test("eliksirbelønning og køb ved grænsen bevarer en gyldig gemning", () => {
  const s = nyRejse(1);
  s.eliksirer = 98;
  assert.equal(givEliksirer(s, 2), 1);
  assert.equal(s.eliksirer, 99);
  assert.equal(givEliksirer(s, 1), 0);
  assert.ok(læsRejse(JSON.stringify(s)));
  s.eliksirer = 97;
  assert.equal(givEliksirer(s, 2), 2);
  assert.equal(s.eliksirer, 99);
});
test("bossspor ignorerer døde og forkerte bosser og leder til trappe eller udgang", () => {
  const s = nyRejse(1);
  s.grotte = { id: 0, dybde: 2, frø: 1 };
  const ud = { id: "udgang", type: "udgang", x: 0, z: 0 },
    bossud = { id: "bossudgang", type: "udgang", x: 8, z: 8 },
    trappe = { id: "trappe", type: "trappe", x: 9, z: 9 };
  const død = { boss: true, hp: 0, grotte: 0, obj: { position: { x: 99, z: 99 } } },
    forkert = { boss: true, hp: 50, grotte: 1, obj: { position: { x: 50, z: 50 } } },
    levende = { boss: true, hp: 50, grotte: 0, obj: { position: { x: 10, z: 10 } } };
  assert.equal(bossSpor(s, 0, [død, forkert, levende], [ud, bossud]), levende.obj.position);
  assert.equal(bossSpor(s, 0, [død, forkert], [ud, bossud]), bossud);
  assert.equal(bossSpor(s, 1, [død, forkert], [ud, bossud]), bossud);
  s.grotte.dybde = 1;
  assert.equal(bossSpor(s, 0, [], [ud, trappe]), trappe);
  assert.equal(bossSpor(s, 2, [], [ud, trappe]), ud);
});
test("gentagne grotter: højt niveau kan heles og gemmes over 300 liv", () => {
  const s = nyRejse(19600);
  s.xp = 19600;
  s.udstyr = 2;
  s.hp = maxLiv(s);
  assert.equal(s.hp, 316);
  startGrotte(s, 1);
  s.grotte.dybde = 2;
  const gemning = JSON.stringify(s), fortsæt = læsRejse(gemning);
  assert.ok(fortsæt);
  assert.equal(fortsæt.hp, 316);
  assert.equal(fortsæt.xp, 19600);
  assert.equal(fortsæt.udstyr, 2);
  assert.deepEqual(fortsæt.grotte, s.grotte);
  fortsæt.udstyr = 3;
  fortsæt.hp = maxLiv(fortsæt);
  assert.equal(læsRejse(JSON.stringify(fortsæt)).hp, 326);
  fortsæt.xp = 100000;
  fortsæt.udstyr = 3;
  fortsæt.hp = maxLiv(fortsæt);
  assert.equal(læsRejse(JSON.stringify(fortsæt)).hp, maxLiv(fortsæt));
  const ældre = { ...nyRejse(1), hp: 150 };
  assert.equal(læsRejse(ældre).hp, 100, "rimeligt ældre liv repareres til det aktuelle niveau");
  assert.equal(læsRejse({ ...s, hp: 10000 }), null, "urimeligt liv afvises stadig");
});
test("gamle v1-rejser migreres uden tab af loot, segl, grotte eller udstyr", () => {
  const gammel = nyRejse(991);
  delete gammel.valg;
  delete gammel.vejledning;
  gammel.hentet = ["ø-krystal-0", "ø-kiste-1"];
  gammel.beroliget = ["ø-fjende-0", "boss-0"];
  gammel.opgaver = { mira: 1, krystal: 5, kiste: 2, boss0: 1 };
  gammel.xp = 700;
  gammel.udstyr = 2;
  startGrotte(gammel, 1);
  gammel.grotte.dybde = 2;
  const t = læsRejse(JSON.stringify(gammel));
  assert.ok(t);
  for (const k of ["hentet", "beroliget", "opgaver", "grotte", "xp", "udstyr", "frø"]) {
    assert.deepEqual(t[k], gammel[k]);
  }
  assert.deepEqual(t.valg, { autosigte: true, roligeEffekter: false, vejviser: true, kamera: 1 });
  assert.equal(t.vejledning, 4);
  t.valg = { autosigte: false, roligeEffekter: true, vejviser: false, kamera: 1.5 };
  t.vejledning = 2;
  assert.deepEqual(læsRejse(JSON.stringify(t)).valg, t.valg);
  const dårlige = læsRejse({
    ...t,
    valg: { autosigte: "ja", roligeEffekter: 1, vejviser: null, kamera: 900 },
    vejledning: 999,
  });
  assert.equal(dårlige.valg.autosigte, true);
  assert.equal(dårlige.valg.kamera, 1.8);
  assert.equal(dårlige.vejledning, 4);
});
test("Safari uden structuredClone kan gemme og fortsætte en gammel v1-rejse uden tab", () => {
  const oprindelig = globalThis.structuredClone;
  try {
    globalThis.structuredClone = undefined;
    const gammel = nyRejse(991);
    delete gammel.valg;
    delete gammel.vejledning;
    gammel.opgaver = { mira: 1, krystal: 8, kiste: 3, boss0: 1 };
    gammel.hentet = ["ø-krystal-2", "ø-kiste-0"];
    gammel.beroliget = ["boss-0"];
    gammel.udstyr = 2;
    gammel.xp = 19600;
    gammel.hp = maxLiv(gammel);
    startGrotte(gammel, 2);
    gammel.grotte.dybde = 2;
    let tekst;
    assert.equal(forsøgGem((værdi) => tekst = værdi, gammel).gemt, true);
    const fortsæt = læsRejse(tekst), kopi = kopiRejse(fortsæt);
    assert.ok(fortsæt);
    for (const k of ["opgaver", "hentet", "beroliget", "udstyr", "xp", "hp", "grotte", "frø"]) {
      assert.deepEqual(fortsæt[k], gammel[k]);
    }
    kopi.hentet.push("ny-skat");
    kopi.valg.autosigte = false;
    assert.deepEqual(fortsæt.hentet, gammel.hentet);
    assert.equal(fortsæt.valg.autosigte, true, "Fortsæt og gemt snapshot deler ingen mutable valg");
  } finally {
    globalThis.structuredClone = oprindelig;
  }
});

test("autosigte ignorerer døde og skjulte fjender og skifter roligt mellem synlige mål", () => {
  const f = (x, z, hp = 10) => ({ hp, obj: { position: { x, z } } }),
    bagVæg = f(0, 2),
    synlig = f(3, 0),
    død = f(1, 0, 0);
  const frit = (x, z) => !(Math.abs(x) < .5 && z > .8 && z < 1.2);
  assert.equal(vælgMål({ x: 0, z: 0 }, [bagVæg, synlig, død], 10, frit), synlig);
  assert.equal(vælgMål({ x: 0, z: 0 }, [bagVæg, død], 10, frit), null);
  const næsten = f(2.5, 0);
  assert.equal(vælgMål({ x: 0, z: 0 }, [næsten, synlig], 10, frit, synlig), synlig);
  assert.equal(vælgMål({ x: 0, z: 0 }, [synlig], 2, frit), null);
});
test("200 grotter: vejviseren følger kun åbne forbindelser helt frem til målet", () => {
  for (let frø = 0; frø < 200; frø++) {
    const g = danGrotte(frø, frø % 3, 2),
      til = { x: g.slut.x * 8, z: g.slut.z * 8 },
      rute = rumRute(g, { x: 0, z: 0 }, til);
    assert.ok(rute.length > 1);
    assert.deepEqual(rute.at(-1), til);
    assert.ok(ruteLængde(rute) > 8);
    for (let i = 1; i < rute.length; i++) assert.ok(friLinje(rute[i - 1], rute[i], (x, z) => kanGå(g, x, z, .42), .2));
  }
});
test("øens gyldne spor går rundt om brønden og husene", () => {
  const v = bygØ({}, 991), erFrit = (x, z) => frit(v, x, z);
  for (const [fra, til] of [[{ x: 0, z: 5 }, { x: 0, z: -5 }], [{ x: -3, z: -6 }, { x: -11, z: -6 }]]) {
    const r = øRute(fra, til, erFrit);
    assert.ok(r.length > 2);
    for (let i = 1; i < r.length; i++) assert.ok(friLinje(r[i - 1], r[i], erFrit, .15));
  }
});
test("hurtige projektiler kan ikke springe over en tynd væg", () => {
  const skud = [{ obj: { position: { x: 0, z: 0 } }, dx: 100, dz: 0, liv: 2 }];
  let ramt = 0;
  opdatérFlyvere(skud, .05, {
    erFrit: (x) => !(x > 2 && x < 3),
    afbryd: () => false,
    fjern: () => {},
    ramning: () => ramt++,
  });
  assert.equal(ramt, 0);
  assert.equal(skud.length, 0);
});
test("gemt-status følger lageret, og en vedvarende fejl giver kun én advarsel", () => {
  const s = nyRejse(991),
    fejl = () => {
      throw Error("Privat lager");
    };
  const første = forsøgGem(fejl, s, true);
  assert.deepEqual(første, { gemt: false, visAdvarsel: true });
  assert.deepEqual(forsøgGem(fejl, s, første.gemt), { gemt: false, visAdvarsel: false });
  let tekst;
  assert.deepEqual(forsøgGem((t) => tekst = t, s, false), { gemt: true, visAdvarsel: false });
  assert.deepEqual(læsRejse(tekst), s);
});

test("ø-ruter kontrollerer også tynde forhindringer langs første, sidste og alle gridkanter", () => {
  const eksempler = [[0, { x: 35, z: -32 }, { x: -31.964341160838472, z: 39.95526222938173 }], [1, { x: 35, z: -32 }, {
    x: 51.749225370748256,
    z: -11.893022059559435,
  }]];
  for (const [frø, fra, til] of eksempler) {
    const v = bygØ({}, frø), erFrit = (x, z) => frit(v, x, z), rute = øRute(fra, til, erFrit);
    assert.ok(rute.length > 2, `rute for reprofrø ${frø}`);
    assert.deepEqual(rute[0], fra);
    assert.deepEqual(rute.at(-1), til);
    for (let i = 1; i < rute.length; i++) {
      assert.ok(friLinje(rute[i - 1], rute[i], erFrit, .025), `hele delstræk ${i} er åbent`);
    }
  }
  for (let frø = 0; frø < 5; frø++) {
    const v = bygØ({}, frø), erFrit = (x, z) => frit(v, x, z);
    for (const fra of STEDER.filter((p) => erFrit(p.x, p.z))) {
      for (const til of v.ting.filter((p) => erFrit(p.x, p.z))) {
        const rute = øRute(fra, til, erFrit);
        assert.ok(rute.length, `vej til ${til.id}, frø ${frø}`);
        for (let i = 1; i < rute.length; i++) {
          assert.ok(friLinje(rute[i - 1], rute[i], erFrit, .1));
        }
      }
    }
  }
});

test("detaljebiblioteket har alle originale Blenderlandmærker og indlejret geometri", () => {
  const data = fs.readFileSync(new URL("./modeller/detaljer.glb", import.meta.url));
  assert.equal(data.readUInt32LE(0), 0x46546c67);
  assert.equal(data.readUInt32LE(4), 2);
  const g = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString("utf8"));
  const navne = g.scenes[0].nodes.map((i) => g.nodes[i].name);
  for (
    const n of [
      "lanterne",
      "vejviser",
      "bænk",
      "markedsvogn",
      "lejr",
      "svampe",
      "blomster",
      "faldetstamme",
      "ruintavle",
      "statue",
      "grottepille",
      "lyssøjle",
      "havn",
    ]
  ) assert.ok(navne.includes(n), n);
  assert.ok(g.meshes.length >= 13);
  assert.ok(g.buffers.every((b) => !b.uri));
});

test("øens lokale kollisionsfelter giver præcis samme plads som alle forhindringerne", () => {
  for (let frø = 0; frø < 8; frø++) {
    const v = bygØ({}, frø);
    for (let i = 0; i < 5000; i++) {
      const x = Math.sin(i * 7919.31) * 70, z = Math.cos(i * 3571.27) * 70;
      const forventet = Math.hypot(x, z) < 68 && !v.blokering.some((b) => Math.hypot(x - b.x, z - b.z) < b.r + .42);
      assert.equal(frit(v, x, z), forventet, `${frø}: ${x},${z}`);
    }
  }
});

test("en nået gridvejviser peger fremad, og afstanden følger spilleren inden celleskift", () => {
  const gemt = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 2 }];
  const fra = { x: 2.3, z: 0 }, frit = (x, z) => !(z > .4 && x < 3.8);
  const spor = fortsætSpor(fra, gemt, frit);
  assert.deepEqual(spor, [fra, { x: 4, z: 0 }, { x: 4, z: 2 }]);
  assert.equal(Math.round(ruteLængde(spor) * 10), 37);
  assert.equal(ruteLængde(gemt), 6, "cachen ændres ikke af spillerens små skridt");
  for (let i = 1; i < spor.length; i++) assert.ok(friLinje(spor[i - 1], spor[i], frit, .025));
  assert.deepEqual(fortsætSpor(fra, [], frit), []);
});

test("tilfældigt træ kan ikke låse en opgavevogter fast; gamle skatte får et frit tilgangspunkt", () => {
  for (let frø = 0; frø < 100; frø++) {
    const v = bygØ({}, frø);
    assert.equal(v.fjender.filter((f) => f.art === "stenvogter").length, 4);
    for (const f of v.fjender) assert.ok(frit(v, f.x, f.z), `frit spawn for ${f.id}, frø ${frø}`);
  }
  const v = bygØ({}, 4), kiste = v.ting.find((t) => t.id === "ø-kiste-2"), erFrit = (x, z) => frit(v, x, z);
  assert.deepEqual({ x: kiste.x, z: kiste.z }, { x: 34, z: 5 }, "gammel loot flyttes ikke");
  assert.equal(erFrit(kiste.x, kiste.z), false, "konkret kiste i træcirklen");
  const rute = øRute({ x: 0, z: 5 }, kiste, erFrit), slut = rute.at(-1);
  assert.ok(slut && erFrit(slut.x, slut.z));
  assert.ok(Math.hypot(slut.x - kiste.x, slut.z - kiste.z) < 2.8);
  for (let i = 1; i < rute.length; i++) assert.ok(friLinje(rute[i - 1], rute[i], erFrit, .05));
});

test("Fortsæt efter en bossejr genskaber en tydelig udgang og beholder seglet", () => {
  const s = nyRejse(12);
  startGrotte(s, 1);
  s.grotte.dybde = 2;
  fremskridt(s, "boss1");
  const fortsæt = læsRejse(JSON.stringify(s));
  const g = danGrotte(fortsæt.grotte.frø, 1, 2);
  const v = bygGrotte({}, g, fortsæt.opgaver.boss1 >= 1);
  const ud = v.steder.find((p) => p.id === "bossudgang");
  assert.ok(ud);
  assert.ok(frit(v, ud.x, ud.z));
  assert.equal(v.fjender.some((f) => f.boss), false);
  assert.equal(fortsæt.opgaver.boss1, 1);
  assert.equal(bossSpor(fortsæt, 1, [], v.steder), ud);
  const ny = bygGrotte({}, g, false);
  assert.ok(ny.fjender.some((f) => f.boss));
});

test("holdt W og Space genstarter ikke sig selv efter en dialog, før de trykkes på ny", () => {
  for (const tast of ["w", " "]) {
    const taster = new Set();
    assert.ok(trykTast(taster, tast, false));
    assert.ok(trykTast(taster, tast, true));
    taster.clear();
    assert.equal(trykTast(taster, tast, true), false);
    assert.equal(taster.size, 0);
    assert.ok(trykTast(taster, tast, false));
    assert.ok(taster.has(tast));
  }
});

test("faktisk tastatur: Pause/Fortsæt og våbenklik bevarer angreb, mens Tab og formularer er native", () => {
  // De faktiske handlers prøves uden renderer, voksenlås eller gemt spil.
  const kilde = fs.readFileSync(new URL("./spil.js", import.meta.url), "utf8");
  const luk = kilde.slice(kilde.indexOf("function lukDialog()"), kilde.indexOf("function bekræftNy()"));
  const input = kilde.slice(kilde.indexOf("// Kun en rigtig Tab-navigation"), kilde.indexOf('window.addEventListener("blur"'));
  assert.ok(luk && input.includes("tastFokus"));
  const hændelser = new Map(), dokument = { activeElement: null };
  const felt = (navn, tag = "button") => ({
    id: navn, isConnected: true,
    classList: { add() {} },
    closest: (valg) => valg.split(",").includes(tag) ? {} : null,
    querySelectorAll: () => [],
    focus() { dokument.activeElement = this; },
  });
  const felter = {
    verden: felt("verden", "canvas"), pause: felt("pause"), fortsæt: felt("fortsæt"),
    våben: felt("våben"), dialog: felt("dialog"), formular: felt("formular", "input"),
    valg: felt("valg", "select"), tekst: felt("tekst", "textarea"), angrib: felt("angrib"),
  };
  const vindue = { addEventListener: (type, fn) => hændelser.set(type, fn) };
  const prøve = new Function("window", "document", "$", "tastFokus", "trykTast", `
    let kører = true, paused = true, angrebHold = 1, angreb = 0;
    const taster = new Set(["w", " "]), fokusTilbage = $("pause");
    const angrib = () => { angreb++; }, pausemenu = () => { paused = true; taster.clear(); };
    const brug = () => {}, eliksir = () => {}, inventar = () => {}, rejsekort = () => {}, skiftVåben = () => {};
    ${luk}
    ${input}
    return { lukDialog, taster, antal: () => angreb, erPaused: () => paused, hold: () => angrebHold };
  `)(vindue, dokument, (id) => felter[id], tastFokus, trykTast);
  const send = (key, target = dokument.activeElement, repeat = false) => {
    let forhindret = false;
    hændelser.get("keydown")({ key, target, repeat, preventDefault: () => { forhindret = true; } });
    return forhindret;
  };
  const slip = (key) => hændelser.get("keyup")({ key });
  felter.fortsæt.focus();
  prøve.lukDialog();
  assert.equal(dokument.activeElement, felter.pause, "dialogen returnerer fokus til sin åbnende knap");
  assert.equal(prøve.erPaused(), false);
  assert.equal(prøve.hold(), null);
  assert.equal(prøve.taster.size, 0, "holdte taster fra pausen er ryddet");
  send("w", felter.pause, true);
  assert.equal(prøve.taster.has("w"), false, "browserens gamle gentagelse tager ikke styringen");
  send("w");
  assert.ok(prøve.taster.has("w"));
  assert.equal(dokument.activeElement, felter.verden);
  assert.equal(send(" "), true, "Mellemrum stopper browserens pauseknap-klik");
  assert.equal(prøve.antal(), 1);
  assert.ok(prøve.taster.has(" "), "holdt Mellemrum kan fortsat angribe i spillets loop");
  slip(" ");
  hændelser.get("pointerdown")();
  felter.våben.focus();
  assert.equal(send(" "), true, "våben valgt med mus/finger stjæler ikke næste angreb");
  assert.equal(prøve.antal(), 2);
  slip(" ");
  send("Tab");
  felter.våben.focus();
  assert.equal(send(" "), false, "en faktisk Tab-valgt våbenknap aktiveres af browseren");
  assert.equal(prøve.antal(), 2);
  assert.equal(prøve.taster.has(" "), false);
  felter.angrib.focus();
  assert.equal(send(" "), false, "Tab-valgt Angrib bruger også sit almindelige knaptryk");
  assert.equal(send("ArrowUp"), true, "nye skridt forlader menufokus");
  assert.equal(dokument.activeElement, felter.verden);
  assert.equal(send(" "), true);
  assert.equal(prøve.antal(), 3);
  slip(" ");
  for (const formular of [felter.formular, felter.valg, felter.tekst]) {
    hændelser.get("pointerdown")();
    formular.focus();
    for (const key of ["w", "ArrowDown", " ", "Enter"]) assert.equal(send(key), false);
    assert.equal(dokument.activeElement, formular, "formularens eget fokus bevares");
  }
  felter.våben.focus();
  assert.equal(send("Enter"), false, "Enter beholder almindelig knapaktivering også efter museklik");
  assert.equal(prøve.antal(), 3);
});

test("genåbnet første guide venter på en ny spillerhandling, også efter Mira og Fortsæt", () => {
  const s = nyRejse(12);
  fremskridt(s, "mira");
  s.x = 34;
  s.z = -20;
  s.vejledning = 0;
  const fortsæt = læsRejse(JSON.stringify(s)), start = { x: fortsæt.x, z: fortsæt.z };
  assert.equal(guideEfterSkridt(fortsæt.vejledning, start, fortsæt), 0);
  assert.equal(guideEfterSkridt(0, start, { x: 34.5, z: -20 }), 0);
  assert.equal(guideEfterSkridt(0, start, { x: 36, z: -20 }), 1);
  assert.equal(guideEfterSkridt(2, start, { x: 36, z: -20 }), 2);
});

test("den viste målrings fjende og næste angreb beholder samme mål, når nærheden bytter", () => {
  const fra = { x: 0, z: 0 },
    a = { hp: 30, obj: { position: { x: 5, z: 0 } } },
    b = { hp: 30, obj: { position: { x: 6, z: 0 } } };
  const frit = () => true;
  const hud = vælgMål(fra, [a, b], 24, frit);
  assert.equal(hud, a);
  b.obj.position.x = 4.8;
  const angreb = vælgMål(fra, [a, b], 24, frit, hud);
  assert.equal(angreb, hud);
  a.hp = 0;
  assert.equal(vælgMål(fra, [a, b], 24, frit, hud), b, "et beroliget mål overføres til næste levende fjende");
});
