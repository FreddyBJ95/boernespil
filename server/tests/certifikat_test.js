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
    client = Deno.createHttpClient({ caCerts: [cert.ca] });

    // Rigtig HTTP/HTTPS fanger Deno's automatiske HEAD-længde; UTF-8 måles i bytes, ikke tegn.
    const filer = [
      ["/certifikat", "text/html; charset=utf-8", null],
      ["/certifikat/broekraft.mobileconfig", "application/x-apple-aspen-config", 'attachment; filename="Broekraft-hjemme.mobileconfig"'],
      ["/certifikat/broekraft.crt", "application/x-x509-ca-cert", 'attachment; filename="Broekraft-hjemme.crt"'],
    ];
    for (const [adresse, tillid] of [[base, undefined], [`https://127.0.0.1:${https.addr.port}`, client]]) {
      for (const [sti, mime, disposition] of filer) {
        const muligheder = { headers: { "accept-encoding": "identity" }, client: tillid };
        const get = await fetch(adresse + sti, muligheder), bytes = new Uint8Array(await get.arrayBuffer());
        assert.equal(get.status, 200, `${adresse}${sti}: GET`);
        assert.equal(get.headers.get("content-type"), mime, sti);
        assert.equal(get.headers.get("content-disposition"), disposition, sti);
        assert.equal(get.headers.get("cache-control"), "no-store", sti);
        assert.equal(get.headers.get("x-content-type-options"), "nosniff", sti);
        assert.equal(get.headers.get("content-length"), String(bytes.byteLength), `${sti}: GET-længden skal være byteantal`);
        assert.ok(!get.headers.get("content-encoding") || get.headers.get("content-encoding") === "identity", sti);
        if (sti.endsWith(".crt")) assert.deepEqual(bytes, cert.der);
        else {
          const tekst = new TextDecoder().decode(bytes);
          assert.equal(new TextEncoder().encode(tekst).byteLength, bytes.byteLength, `${sti}: UTF-8-længde`);
          if (sti.endsWith(".mobileconfig")) assert.equal(tekst, cert.profil);
          else {
            assert.ok(tekst.includes(cert.aftryk));
            assert.ok(bytes.byteLength > tekst.length, "Den danske side skal afprøve flerbyte-tegn");
          }
        }
        const head = await fetch(adresse + sti, { ...muligheder, method: "HEAD" });
        assert.equal(head.status, 200, `${adresse}${sti}: HEAD`);
        for (const navn of ["content-type", "content-disposition", "cache-control", "x-content-type-options", "content-length"]) {
          assert.equal(head.headers.get(navn), get.headers.get(navn), `${sti}: HEAD bevarer ${navn}`);
        }
        assert.ok(!head.headers.get("content-encoding") || head.headers.get("content-encoding") === "identity", sti);
        assert.equal((await head.arrayBuffer()).byteLength, 0, `${sti}: HEAD skal være uden filkrop`);
      }
    }
    const sikker = await fetch(`https://127.0.0.1:${https.addr.port}/`, { client });
    assert.equal(sikker.status, 200); assert.ok((await sikker.text()).includes("Spil sammen"));
    assert.equal(certifikatSvar("/certifikat/ca.json", cert, "https://localhost/").status, 404);
  } finally {
    client?.close(); await http?.shutdown(); await https?.shutdown(); await Deno.remove(mappe, { recursive: true });
  }
});
