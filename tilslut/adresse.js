// QR-koder må kun føre til familiens lokale server, aldrig til vilkårlige hjemmesider.
export function serveradresse(tekst) {
  const rå = String(tekst ?? "").trim();
  const mønster = /^(?:http:\/\/)?((?:\d{1,3}\.){3}\d{1,3})(?::(\d{1,5}))?(?:\/(?:sammen\/?)?)?$/i;
  const match = rå.match(mønster);
  if (!match) throw new Error("Brug serveradressen under QR-koden, fx 192.168.0.123:8080.");
  const dele = match[1].split("."), tal = dele.map(Number);
  if (dele.some((d, i) => String(tal[i]) !== d) || tal.some(n => n > 255)) throw new Error("Adressen er ikke en gyldig wifi-adresse.");
  const privat = tal[0] === 10 || (tal[0] === 172 && tal[1] >= 16 && tal[1] <= 31) || (tal[0] === 192 && tal[1] === 168);
  if (!privat) throw new Error("Koden skal være fra Broekraft Server på familiens wifi.");
  const port = match[2] == null ? (/^http:/i.test(rå) ? 80 : 8080) : Number(match[2]);
  if (port < 1 || port > 65535) throw new Error("Portnummeret i adressen er ugyldigt. Se under QR-koden.");
  return `http://${tal.join(".")}${port === 80 ? "" : `:${port}`}/`;
}
