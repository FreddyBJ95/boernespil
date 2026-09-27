// Fælles validering: kun lyd og lokale host-kandidater, aldrig STUN/TURN-adresser.
export function lokalKandidat(tekst) {
  if (typeof tekst !== "string" || tekst.length > 1024) return false;
  if (tekst === "") return true;
  const felter = tekst.trim().split(/\s+/);
  return /^candidate:[\w+/.-]+$/.test(felter[0]) && ["udp", "tcp"].includes(felter[2]?.toLowerCase()) &&
    felter[6] === "typ" && felter[7] === "host" && lokalAdresse(felter[4]);
}

function lokalAdresse(adresse) {
  if (typeof adresse !== "string") return false;
  if (/^[a-z0-9-]{1,100}\.local$/i.test(adresse) || adresse === "::1" || /^(fc|fd|fe[89ab])[0-9a-f:]+$/i.test(adresse)) return true;
  const d = adresse.split(".").map(Number);
  return /^\d+\.\d+\.\d+\.\d+$/.test(adresse) && d.every(n => n >= 0 && n <= 255) &&
    (d[0] === 10 || d[0] === 127 || (d[0] === 172 && d[1] >= 16 && d[1] <= 31) || (d[0] === 192 && d[1] === 168));
}

export function rensBeskrivelse(b) {
  if (!b || !["offer", "answer"].includes(b.type) || typeof b.sdp !== "string" || b.sdp.length > 24000) return null;
  const linjer = b.sdp.split(/\r?\n/), medier = linjer.filter(l => l.startsWith("m="));
  if (medier.length !== 1 || !medier[0].startsWith("m=audio ") || !linjer.includes("a=rtcp-mux")) return null;
  if (linjer.some(l => l.startsWith("a=remote-candidates:"))) return null;
  if (linjer.some(l => l.startsWith("c=") && !["0.0.0.0", "::"].includes(l.split(" ")[2]) && !lokalAdresse(l.split(" ")[2]))) return null;
  // Ikke-lokale host-adresser fra fx offentlige IPv6-netkort fjernes fra vores egne beskrivelser.
  return { type: b.type, sdp: linjer.filter(l => !l.startsWith("a=candidate:") || lokalKandidat(l.slice(2))).join("\r\n") };
}

export function rensSignal(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  if (typeof data.runde !== "string" || !/^[a-z0-9-]{1,64}$/i.test(data.runde)) return null;
  if (data.klar === true) return { klar: true, runde: data.runde };
  if (typeof data.modrunde !== "string" || !/^[a-z0-9-]{1,64}$/i.test(data.modrunde)) return null;
  const runder = { runde: data.runde, modrunde: data.modrunde };
  if (data.beskrivelse) {
    const b = rensBeskrivelse(data.beskrivelse);
    return b ? { ...runder, beskrivelse: b } : null;
  }
  const k = data.kandidat;
  if (!k || !lokalKandidat(k.candidate) || (k.sdpMid != null && (typeof k.sdpMid !== "string" || k.sdpMid.length > 64)) ||
    (k.sdpMLineIndex != null && (!Number.isInteger(k.sdpMLineIndex) || k.sdpMLineIndex !== 0)) ||
    (k.usernameFragment != null && (typeof k.usernameFragment !== "string" || k.usernameFragment.length > 256))) return null;
  return { ...runder, kandidat: { candidate: k.candidate, sdpMid: k.sdpMid ?? null, sdpMLineIndex: k.sdpMLineIndex ?? null, ...(k.usernameFragment ? { usernameFragment: k.usernameFragment } : {}) } };
}
