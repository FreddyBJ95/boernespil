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
import { bygØ, frit, STEDER } from "./verden.js";
import { opdatérFlyvere } from "./projektiler.js";

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
    opdatérFlyvere(skud, .02, { erFrit: () => frit, afbryd: () => false, fjern: () => fjernet++, ramning: () => ramt++ });
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
