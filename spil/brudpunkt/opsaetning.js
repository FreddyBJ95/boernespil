// Gem kun spillerens opstilling; flyvende brokker hører til det enkelte forsøg.
export const GRAENSER = Object.freeze({ objekter: 18, celler: 8, dele: 420, felt: 36 });
const TYPER = new Set(["bil", "hus", "taarn", "celle"]);
const tal = (værdi, standard, min, max) => {
  const n = værdi === undefined ? standard : værdi;
  if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max) throw new Error("Opstillingen indeholder et ugyldigt tal.");
  return n;
};

// Afvis forkerte gemte data, frem for at flytte ting eller ændre styrken i stilhed.
export function normaliserObjekt(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !TYPER.has(data.type)) throw new Error("Vælg en bil, et hus, et tårn eller en energicelle.");
  if (typeof data.id !== "string" || !/^[a-zA-Z0-9_-]{1,48}$/.test(data.id)) throw new Error("Objektet mangler et gyldigt navn.");
  return {
    id: data.id, type: data.type,
    x: tal(data.x, 0, -GRAENSER.felt, GRAENSER.felt), y: tal(data.y, 0, 0, 18),
    z: tal(data.z, 0, -GRAENSER.felt, GRAENSER.felt),
    vinkel: tal(data.vinkel, 0, -Math.PI * 100, Math.PI * 100) % (Math.PI * 2),
    styrke: tal(data.styrke, 3, 1, 5), forsinkelse: tal(data.forsinkelse, 0, 0, 10)
  };
}

// En lille versionsmarkør gør senere ændringer i formatet tydelige.
export function pakOpstilling(objekter) {
  return JSON.stringify({ version: 1, objekter: validerOpstilling(objekter) });
}

export function læsOpstilling(tekst) {
  if (typeof tekst !== "string" || tekst.length > 20000) throw new Error("Den gemte opstilling er for stor.");
  let data;
  try { data = JSON.parse(tekst); } catch { throw new Error("Den gemte opstilling kunne ikke læses."); }
  if (data?.version !== 1) throw new Error("Den gemte opstilling har et ukendt format.");
  return validerOpstilling(data.objekter);
}

export function validerOpstilling(objekter) {
  if (!Array.isArray(objekter) || objekter.length > GRAENSER.objekter) throw new Error(`Der er plads til ${GRAENSER.objekter} objekter på banen.`);
  const sete = new Set();
  const liste = objekter.map(normaliserObjekt);
  for (const objekt of liste) {
    if (sete.has(objekt.id)) throw new Error("To objekter har samme navn.");
    sete.add(objekt.id);
  }
  if (liste.filter(o => o.type === "celle").length > GRAENSER.celler) throw new Error(`Der er plads til ${GRAENSER.celler} energiceller.`);
  return liste;
}
