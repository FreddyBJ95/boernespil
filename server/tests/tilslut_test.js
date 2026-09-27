import { strict as assert } from "node:assert";
import { runInNewContext } from "node:vm";
import { serveradresse } from "../../tilslut/adresse.js";

Deno.test("Tablet: lokale serveradresser med og uden http", () => {
  assert.equal(serveradresse(" 192.168.0.123:8080 "), "http://192.168.0.123:8080/");
  assert.equal(serveradresse("10.0.0.5"), "http://10.0.0.5:8080/");
  assert.equal(serveradresse("http://172.16.1.3:8085/sammen/"), "http://172.16.1.3:8085/");
  assert.equal(serveradresse("http://192.168.0.5/"), "http://192.168.0.5/");
  assert.equal(serveradresse("172.31.255.254:65535"), "http://172.31.255.254:65535/");
});

Deno.test("Tablet: fremmede koder, credentials og skjulte adresser afvises", () => {
  for (const rå of ["javascript:alert(1)", "https://example.com", "http://8.8.8.8/", "http://127.0.0.1:8080/", "172.32.0.1", "192.168.999.1", "192.168.01.1", "192.168.1.1:0", "192.168.1.1:65536", "http://192.168.1.1@example.com/", "http://example.com@192.168.1.1/", "http://0xc0a80101/", "http://192.168.1.1/kontrol", "http://192.168.1.1/?videre=https://example.com", "http://192.168.1.1/#andet", "", null]) assert.throws(() => serveradresse(rå), Error, String(rå));
});

Deno.test("Tablet: jsQR læser den samme QR-kode som kontrolpanelet laver", async () => {
  const generator = { module: { exports: {} }, exports: {} };
  runInNewContext(await Deno.readTextFile(new URL("../vendor/qrcode.js", import.meta.url)), generator);
  const læser = { module: { exports: {} }, exports: {} };
  runInNewContext(await Deno.readTextFile(new URL("../../tilslut/vendor/jsQR.js", import.meta.url)), læser);
  for (const adresse of ["http://192.168.0.123:8080/", "http://10.0.0.5:8087/"]) {
    const qr = generator.module.exports(0, "M"); qr.addData(adresse); qr.make();
    const felter = qr.getModuleCount(), kant = 4, pixel = 6, side = (felter + kant * 2) * pixel;
    const billede = new Uint8ClampedArray(side * side * 4); billede.fill(255);
    for (let y = 0; y < felter; y++) for (let x = 0; x < felter; x++) if (qr.isDark(y, x)) {
      for (let dy = 0; dy < pixel; dy++) for (let dx = 0; dx < pixel; dx++) {
        const i = ((y + kant) * pixel + dy) * side * 4 + ((x + kant) * pixel + dx) * 4;
        billede[i] = billede[i + 1] = billede[i + 2] = 0;
      }
    }
    const kode = læser.module.exports(billede, side, side);
    assert.ok(kode); assert.equal(serveradresse(kode.data), adresse);
  }
});

// Kontroller kameraets livscyklus uden at aktivere udviklerens fysiske kamera.
Deno.test("Tablet: annulleret og skjult kamera stopper også en sen tilladelse", async () => {
  const felter = new Map(), lyttere = new Map();
  const felt = id => {
    if (!felter.has(id)) felter.set(id, { hidden: true, textContent: "", disabled: false, focus() {}, play: () => Promise.resolve() });
    return felter.get(id);
  };
  let tillad, stoppet = 0, valg;
  const dokument = { hidden: false, getElementById: felt, createElement: () => ({ getContext: () => ({}) }), addEventListener: (t, f) => lyttere.set(t, f) };
  const kontekst = {
    document: dokument, serveradresse, isSecureContext: true, jsQR() {}, setTimeout, clearTimeout,
    navigator: { mediaDevices: { getUserMedia(v) { valg = v; return new Promise(r => { tillad = r; }); } } },
    localStorage: { getItem: () => null }, addEventListener: (t, f) => lyttere.set(t, f),
  };
  const kilde = (await Deno.readTextFile(new URL("../../tilslut/tilslut.js", import.meta.url))).replace('import { serveradresse } from "./adresse.js";', "");
  runInNewContext(kilde, kontekst);
  const ventende = felt("scan").onclick();
  assert.equal(valg.audio, false); assert.equal(valg.video.facingMode.ideal, "environment");
  felt("stop").onclick();
  tillad({ getTracks: () => [{ stop() { stoppet++; } }] });
  await ventende;
  assert.equal(stoppet, 1); assert.equal(felt("video").srcObject, null); assert.equal(felt("kamera").hidden, true);
  const ny = felt("scan").onclick();
  dokument.hidden = true; lyttere.get("visibilitychange")();
  tillad({ getTracks: () => [{ stop() { stoppet++; } }] }); await ny;
  assert.equal(stoppet, 2); assert.equal(felt("scan").disabled, false);
});
