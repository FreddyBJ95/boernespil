import { strict as assert } from "node:assert";
import { X509Certificate } from "node:crypto";
import { hentCertifikater, certifikatSvar } from "../certifikat.js";
import { BroekraftServer } from "../main.js";

Deno.test("Certifikat: SAN, 365 dage, SHA-256, rod og profil uden private nøgler", async () => {
  const mappe = await Deno.makeTempDir({ prefix: "broekraft-cert-" });
  try {
    const c = await hentCertifikater(mappe, ["192.168.1.23", "10.0.0.4"]);
    const rod = new X509Certificate(c.ca), server = new X509Certificate(c.cert);
    assert.ok(rod.ca); assert.ok(rod.verify(rod.publicKey)); assert.ok(server.verify(rod.publicKey));
    for (const ip of ["127.0.0.1", "192.168.1.23", "10.0.0.4"]) assert.equal(server.checkIP(ip), ip);
    assert.equal(server.checkHost("localhost"), "localhost");
    assert.equal(server.checkIP("192.168.1.24"), undefined);
    assert.ok(new Date(server.validTo) - new Date(server.validFrom) <= 825 * 86400000);
    assert.equal(new Date(server.validTo) - new Date(server.validFrom), 365 * 86400000);
    assert.equal(rod.fingerprint256, c.aftryk);
    assert.ok(c.profil.includes("com.apple.security.root")); assert.ok(!c.profil.includes("PRIVATE KEY"));
    const data = c.profil.match(/<data>([^<]+)<\/data>/)[1];
    assert.deepEqual(Uint8Array.from(atob(data), c => c.charCodeAt(0)), c.der);
    const igen = await hentCertifikater(mappe, ["10.0.0.4", "192.168.1.23"]);
    assert.equal(igen.cert, c.cert); assert.equal(igen.ca, c.ca); assert.equal(igen.profil, c.profil);
    const ny = await hentCertifikater(mappe, ["192.168.1.24"]);
    assert.equal(ny.ca, c.ca); assert.notEqual(ny.cert, c.cert);
    assert.equal(new X509Certificate(ny.cert).checkIP("192.168.1.24"), "192.168.1.24");
    const fornyet = await hentCertifikater(mappe, ["192.168.1.24"], Date.now() + 340 * 86400000);
    assert.equal(fornyet.ca, c.ca); assert.notEqual(fornyet.cert, ny.cert);
  } finally { await Deno.remove(mappe, { recursive: true }); }
});

Deno.test("HTTPS virker med egen rod; HTTP-certifikat og omdirigering behøver ingen installeret tillid", async () => {
  const mappe = await Deno.makeTempDir({ prefix: "broekraft-https-" });
  let http, https, client;
  try {
    const cert = await hentCertifikater(mappe, []), app = new BroekraftServer();
    app.certifikater = cert;
    https = Deno.serve({ hostname: "127.0.0.1", port: 0, cert: cert.cert, key: cert.key, onListen() {} }, (req, info) => app.håndter(req, info));
    app.httpsPort = https.addr.port;
    http = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req, info) => app.håndter(req, info));
    const base = `http://127.0.0.1:${http.addr.port}`;
    const redirect = await fetch(base, { redirect: "manual" }); await redirect.body?.cancel();
    assert.equal(redirect.status, 307); assert.equal(redirect.headers.get("location"), `https://127.0.0.1:${https.addr.port}/`);
    const side = await fetch(base + "/certifikat"); assert.equal(side.status, 200);
    assert.ok((await side.text()).includes(cert.aftryk));
    const profil = await fetch(base + "/certifikat/broekraft.mobileconfig");
    assert.equal(profil.headers.get("content-type"), "application/x-apple-aspen-config"); assert.equal(await profil.text(), cert.profil);
    const crt = await fetch(base + "/certifikat/broekraft.crt"); assert.deepEqual(new Uint8Array(await crt.arrayBuffer()), cert.der);
    client = Deno.createHttpClient({ caCerts: [cert.ca] });
    const sikker = await fetch(`https://127.0.0.1:${https.addr.port}/`, { client });
    assert.equal(sikker.status, 200); assert.ok((await sikker.text()).includes("Spil sammen"));
    assert.equal(certifikatSvar("/certifikat/ca.json", cert, "https://localhost/").status, 404);
  } finally {
    client?.close(); await http?.shutdown(); await https?.shutdown(); await Deno.remove(mappe, { recursive: true });
  }
});
