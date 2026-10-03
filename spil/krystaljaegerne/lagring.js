// Lagerfejl ændrer ikke eventyret og varsles kun, når gemning netop bliver utilgængelig.
export function forsøgGem(skriv, data, virkedeFør = true) {
  try {
    skriv(JSON.stringify(data));
    return { gemt: true, visAdvarsel: false };
  } catch {
    return { gemt: false, visAdvarsel: virkedeFør };
  }
}
