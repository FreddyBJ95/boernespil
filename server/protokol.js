// Binære klumper: alle heltal med flere bytes bruger little endian.
export function pakKlump(data, cx, cz, højde) {
  const ud = new Uint8Array(11 + data.length * 2), header = new DataView(ud.buffer);
  ud[0] = 1;
  header.setInt32(1, cx, true);
  header.setInt32(5, cz, true);
  header.setUint16(9, højde, true);
  let pos = 11;
  for (let i = 0; i < data.length;) {
    const id = data[i];
    let antal = 1;
    while (antal < 255 && i + antal < data.length && data[i + antal] === id) antal++;
    ud[pos++] = antal; ud[pos++] = id; i += antal;
  }
  return ud.slice(0, pos);
}

export const FIGURER = ["gris", "ko", "faar", "hone", "fro", "and", "snegl", "zombie"];
export const EMOJIER = ["❤️", "😂", "👍", "🎉", "😮", "👋"];

export function læsBesked(data) {
  if (typeof data !== "string" || new TextEncoder().encode(data).length > 4096) throw new Error("Beskeden er for stor eller ikke tekst");
  const besked = JSON.parse(data);
  if (!besked || Array.isArray(besked) || typeof besked.t !== "string") throw new Error("Ugyldig besked");
  return besked;
}

export function send(spiller, besked) {
  if (spiller.socket.readyState !== 1) return;
  if (spiller.socket.bufferedAmount > 4 * 1024 * 1024) { spiller.socket.close(1013, "Forbind igen"); return; }
  spiller.socket.send(besked instanceof Uint8Array ? besked : JSON.stringify(besked));
}
