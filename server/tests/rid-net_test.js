import { strict as assert } from "node:assert";
import { runInNewContext } from "node:vm";

const kilde = (await Deno.readTextFile(new URL("../../spil/broekraft/net.js", import.meta.url)))
  .replace(/^export (?=(?:async )?function)/gm, "");

// Den rigtige netklient får en lille socket og et ur, så 100 ms og genforbindelse kan prøves præcist.
function opsæt() {
  let nu = 0, næsteTimer = 1;
  const timere = new Map(), sockets = [];
  const ur = {
    setTimeout(funktion, forsinkelse = 0) {
      const id = næsteTimer++;
      timere.set(id, { funktion, tid: nu + forsinkelse });
      return id;
    },
    clearTimeout(id) { timere.delete(id); },
    gå(ms) {
      const slut = nu + ms;
      while (true) {
        const næste = [...timere.entries()].filter(([, t]) => t.tid <= slut).sort((a, b) => a[1].tid - b[1].tid)[0];
        if (!næste) break;
        const [id, timer] = næste;
        nu = timer.tid; timere.delete(id); timer.funktion();
      }
      nu = slut;
    },
  };
  class TestSocket {
    constructor() {
      this.readyState = 0; this.sendt = []; sockets.push(this);
      ur.setTimeout(() => { this.readyState = 1; this.onopen(); }, 0);
    }
    send(data) { this.sendt.push({ tid: nu, besked: JSON.parse(data) }); }
    lever(data) { this.onmessage({ data: JSON.stringify(data) }); }
    close() { this.readyState = 3; this.onclose?.(); }
  }
  const forbind = runInNewContext(`${kilde}\nforbind;`, {
    EventTarget, CustomEvent, WebSocket: TestSocket, performance: { now: () => nu },
    setTimeout: ur.setTimeout, clearTimeout: ur.clearTimeout,
  });
  return { ur, sockets, forbind };
}

function velkomst(socket, id = "barn") {
  socket.lever({ t: "velkommen", dig: id,
    verden: { id: "eng", bredde: 128, dybde: 128, højde: 64 }, spillere: [{ id }] });
}

// En velkomst gør klienten klar på samme måde som ved et rigtigt verdensvalg.
async function vælgEng(test) {
  const åbning = test.forbind("ws://127.0.0.1/ws");
  test.ur.gå(0);
  const net = await åbning, socket = test.sockets[0];
  const valg = net.vælg("eng");
  velkomst(socket); await valg;
  socket.sendt.length = 0;
  return { net, socket };
}

Deno.test("Rid net: almindelig bevægelse samles efter 100 ms og udelader null", async () => {
  const test = opsæt(), { net, socket } = await vælgEng(test);
  try {
    net.pos(10, 20, 30, 0, 0);
    test.ur.gå(20); net.pos(11, 20, 30, 0.1, 0, null);
    test.ur.gå(30); net.pos(12, 21, 31, 0.2, 0.3);
    test.ur.gå(49);
    assert.equal(socket.sendt.length, 1);
    test.ur.gå(1);
    assert.deepEqual(socket.sendt, [
      { tid: 0, besked: { t: "pos", x: 10, y: 20, z: 30, yaw: 0, pitch: 0 } },
      { tid: 100, besked: { t: "pos", x: 12, y: 21, z: 31, yaw: 0.2, pitch: 0.3 } },
    ]);
  } finally { net.luk(); }
});

Deno.test("Rid net: påstigning, nyt dyr og afstigning sendes straks og rydder den gamle timer", async () => {
  const test = opsæt(), { net, socket } = await vælgEng(test);
  try {
    net.pos(10, 20, 30, 0, 0);
    test.ur.gå(10); net.pos(11, 20, 30, 0, 0, "rosaenhjorning");
    assert.equal(socket.sendt.length, 2);
    assert.equal(socket.sendt.at(-1).besked.rid, "rosaenhjorning");
    test.ur.gå(10); net.pos(12, 20, 30, 0, 0, "rosaenhjorning");
    assert.equal(socket.sendt.length, 2);
    test.ur.gå(5); net.pos(13, 20, 30, 0, 0, "pegasus");
    assert.deepEqual(socket.sendt.at(-1), { tid: 25, besked: { t: "pos", x: 13, y: 20, z: 30, yaw: 0, pitch: 0, rid: "pegasus" } });
    test.ur.gå(5); net.pos(14, 20, 30, 0, 0);
    assert.deepEqual(socket.sendt.at(-1), { tid: 30, besked: { t: "pos", x: 14, y: 20, z: 30, yaw: 0, pitch: 0 } });
    test.ur.gå(81);
    assert.equal(socket.sendt.length, 4, "Den tidligere timer må ikke sende positionen igen");
    net.pos(15, 20, 30, 0, 0, null);
    test.ur.gå(18); assert.equal(socket.sendt.length, 4);
    test.ur.gå(1);
    assert.equal(socket.sendt.at(-1).tid, 130);
    assert.equal(socket.sendt.at(-1).besked.x, 15);
  } finally { net.luk(); }
});

Deno.test("Rid net: automatisk genforbindelse gendanner det seneste dyr og afstigning", async () => {
  const test = opsæt(), { net, socket } = await vælgEng(test);
  try {
    net.pos(10, 20, 30, 0, 0, "pegasus");
    socket.close();
    test.ur.gå(100);
    net.pos(11, 21, 31, 0.1, 0.2, "pegasus");
    assert.equal(socket.sendt.length, 1, "En lukket socket må ikke modtage bevægelse");
    test.ur.gå(399); assert.equal(test.sockets.length, 1);
    test.ur.gå(1);
    const igen = test.sockets[1];
    assert.deepEqual(igen.sendt.map(s => s.besked.t), ["hej", "vælg"]);
    velkomst(igen, "nyt-barn");
    assert.deepEqual(igen.sendt.at(-1).besked, { t: "pos", x: 11, y: 21, z: 31, yaw: 0.1, pitch: 0.2, rid: "pegasus" });
    igen.close();
    net.pos(12, 21, 31, 0.1, 0.2, null);
    test.ur.gå(500);
    const efterAfstigning = test.sockets[2];
    velkomst(efterAfstigning, "barn-igen");
    assert.deepEqual(efterAfstigning.sendt.at(-1).besked, { t: "pos", x: 12, y: 21, z: 31, yaw: 0.1, pitch: 0.2 });
  } finally { net.luk(); }
});
