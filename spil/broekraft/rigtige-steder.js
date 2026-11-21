// ===== Fælles for verdenerne bygget efter rigtige kort (Morellgården, Herøya) =====
// Kortdataene ligger som (antal, værdi)-par i base64 (se kortdata/*/bygdata.py). Her pakkes de ud igen.

// Pak (antal, værdi)-par ud til n tal
export function pakUd(tekst, n) {
  const s = atob(tekst), ud = new Uint8Array(n);
  for (let k = 0, i = 0; k < s.length; k += 2) { const antal = s.charCodeAt(k); ud.fill(s.charCodeAt(k + 1), i, i + antal); i += antal; }
  return ud;
}

// Højderne er gemt som forskel til feltet til venstre — læg dem sammen række for række. Giver også den højeste.
export function pakHøjderUd(tekst, N) {
  const forskel = pakUd(tekst, N * N), højde = new Uint8Array(N * N);
  let maks = 0;
  for (let z = 0; z < N; z++) {
    let h = 0;
    for (let x = 0; x < N; x++) { h = (h + forskel[x + z * N]) & 255; højde[x + z * N] = h; if (h > maks) maks = h; }
  }
  return { højde, maks };
}
