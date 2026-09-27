// Certifikater laves lokalt med node-forge; nøglemateriale sendes aldrig til en tjeneste.
import { join } from "node:path";
import { certifikatSide } from "./certifikat-side.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const forge = require("./vendor/node-forge/lib/forge.js");
require("./vendor/node-forge/lib/pki.js");
require("./vendor/node-forge/lib/sha256.js");

const DAG = 86400000;
const NAVN = "Broekraft Server hjemme";
const pem = (navn, data) => `-----BEGIN ${navn}-----\n${btoa(String.fromCharCode(...new Uint8Array(data))).match(/.{1,64}/g).join("\n")}\n-----END ${navn}-----\n`;
const xml = s => String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

// Operativsystemets kryptografiske tilfældighed og WebCrypto laver RSA-nøglerne.
async function nøgler() {
  const par = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const privat = pem("PRIVATE KEY", await crypto.subtle.exportKey("pkcs8", par.privateKey));
  const offentlig = pem("PUBLIC KEY", await crypto.subtle.exportKey("spki", par.publicKey));
  return { privat, nøgle: forge.pki.privateKeyFromPem(privat), offentlig: forge.pki.publicKeyFromPem(offentlig) };
}

function certifikat(offentlig, dage, nu) {
  const c = forge.pki.createCertificate();
  const tilfældige = crypto.getRandomValues(new Uint8Array(20)); tilfældige[0] = 1;
  c.serialNumber = Array.from(tilfældige, b => b.toString(16).padStart(2, "0")).join("");
  c.publicKey = offentlig;
  c.validity.notBefore = new Date(nu - 5 * 60000);
  c.validity.notAfter = new Date(+c.validity.notBefore + dage * DAG);
  return c;
}

async function læs(fil) {
  try { return JSON.parse(await Deno.readTextFile(fil)); }
  catch (fejl) { if (fejl instanceof Deno.errors.NotFound) return null; throw fejl; }
}

async function skriv(fil, data) {
  await Deno.writeTextFile(fil + ".ny", JSON.stringify(data), { mode: 0o600 });
  await Deno.rename(fil + ".ny", fil);
}

// Et eksisterende tillidsanker udskiftes aldrig stiltiende ved en fejl eller adresseændring.
export async function hentCertifikater(mappe, adresser, nu = Date.now()) {
  await Deno.mkdir(mappe, { recursive: true, mode: 0o700 });
  const caFil = join(mappe, "ca.json"), serverFil = join(mappe, "server.json");
  let ca = await læs(caFil);
  if (!ca) {
    const par = await nøgler(), c = certifikat(par.offentlig, 3650, nu);
    const navn = [{ name: "commonName", value: NAVN }];
    c.setSubject(navn); c.setIssuer(navn);
    c.setExtensions([
      { name: "basicConstraints", cA: true, pathLenConstraint: 0, critical: true },
      { name: "keyUsage", keyCertSign: true, cRLSign: true, critical: true },
      { name: "subjectKeyIdentifier" },
    ]);
    c.sign(par.nøgle, forge.md.sha256.create());
    ca = { cert: forge.pki.certificateToPem(c), key: par.privat, profilId: crypto.randomUUID(), certId: crypto.randomUUID() };
    await skriv(caFil, ca);
  }
  const rod = forge.pki.certificateFromPem(ca.cert), rodNøgle = forge.pki.privateKeyFromPem(ca.key);
  if (!rod.verify(rod) || !rod.publicKey.n.equals(rodNøgle.n) || +rod.validity.notAfter < nu + 366 * DAG || +rod.validity.notBefore > nu) {
    throw new Error("Hjemmecertifikatet er ugyldigt eller skal fornyes. Bevar certifikatmappen og kontakt den voksne, der satte serveren op.");
  }
  const ips = [...new Set(["127.0.0.1", ...adresser])].sort();
  let server = await læs(serverFil), forny = true;
  if (server) {
    const c = forge.pki.certificateFromPem(server.cert), k = forge.pki.privateKeyFromPem(server.key);
    const san = c.getExtension("subjectAltName")?.altNames || [];
    forny = !rod.verify(c) || !c.publicKey.n.equals(k.n) || +c.validity.notAfter < nu + 30 * DAG || +c.validity.notBefore > nu ||
      +c.validity.notAfter - +c.validity.notBefore > 825 * DAG ||
      JSON.stringify(san.filter(a => a.type === 7).map(a => a.ip).sort()) !== JSON.stringify(ips) ||
      !san.some(a => a.type === 2 && a.value === "localhost");
  }
  if (forny) {
    const par = await nøgler(), c = certifikat(par.offentlig, 365, nu);
    c.setSubject([{ name: "commonName", value: "Broekraft Server" }]); c.setIssuer(rod.subject.attributes);
    c.setExtensions([
      { name: "basicConstraints", cA: false, critical: true },
      { name: "keyUsage", digitalSignature: true, keyEncipherment: true, critical: true },
      { name: "extKeyUsage", serverAuth: true },
      { name: "subjectAltName", altNames: [{ type: 2, value: "localhost" }, ...ips.map(ip => ({ type: 7, ip }))] },
      { name: "subjectKeyIdentifier" },
      { name: "authorityKeyIdentifier", keyIdentifier: rod.generateSubjectKeyIdentifier().getBytes() },
    ]);
    c.sign(rodNøgle, forge.md.sha256.create());
    server = { cert: forge.pki.certificateToPem(c), key: par.privat };
    await skriv(serverFil, server);
  }
  const der = Uint8Array.from(forge.asn1.toDer(forge.pki.certificateToAsn1(rod)).getBytes(), c => c.charCodeAt(0));
  const aftryk = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", der)), b => b.toString(16).padStart(2, "0")).join(":").toUpperCase();
  return { cert: server.cert, key: server.key, ca: ca.cert, der, aftryk, profil: profil(ca, der) };
}

// Profilen indeholder kun det offentlige rod-certifikat, ingen administrations- eller wifi-indstillinger.
function profil(ca, der) {
  const navn = xml(NAVN), base = `dk.broekraft.hjemme.${ca.profilId}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>PayloadType</key><string>Configuration</string><key>PayloadVersion</key><integer>1</integer>
<key>PayloadIdentifier</key><string>${base}</string><key>PayloadUUID</key><string>${ca.profilId}</string>
<key>PayloadDisplayName</key><string>${navn}</string><key>PayloadRemovalDisallowed</key><false/>
<key>PayloadDescription</key><string>Giver denne tablet mulighed for at bruge familiens Broekraft Server med mikrofon. Installer kun fra jeres egen computer.</string>
<key>PayloadContent</key><array><dict>
<key>PayloadType</key><string>com.apple.security.root</string><key>PayloadVersion</key><integer>1</integer>
<key>PayloadIdentifier</key><string>${base}.certifikat</string><key>PayloadUUID</key><string>${ca.certId}</string>
<key>PayloadDisplayName</key><string>${navn}</string><key>PayloadCertificateFileName</key><string>Broekraft-hjemme.crt</string>
<key>PayloadContent</key><data>${btoa(String.fromCharCode(...der))}</data>
</dict></array></dict></plist>`;
}

export function certifikatSvar(sti, cert, spilUrl) {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (sti === "/certifikat/broekraft.mobileconfig") return new Response(cert.profil, { headers: { ...headers, "content-type": "application/x-apple-aspen-config", "content-disposition": 'attachment; filename="Broekraft-hjemme.mobileconfig"' } });
  if (sti === "/certifikat/broekraft.crt") return new Response(cert.der, { headers: { ...headers, "content-type": "application/x-x509-ca-cert", "content-disposition": 'attachment; filename="Broekraft-hjemme.crt"' } });
  if (sti !== "/certifikat" && sti !== "/certifikat/") return new Response("Ikke fundet", { status: 404 });
  const vært = new URL(spilUrl).hostname;
  return new Response(certifikatSide({ spilUrl, aftryk: cert.aftryk, navn: NAVN, vært }), { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
}
