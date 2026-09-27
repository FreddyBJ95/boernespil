// Claude giver siden sit endelige design sammen med online-tilstanden.
async function opdater() {
  try {
    const svar = await fetch("/verdensliste");
    if (!svar.ok) throw new Error("Serveren svarer ikke");
    const liste = await svar.json(), felt = document.querySelector("#verdener");
    felt.replaceChildren();
    for (const v of liste) {
      const p = document.createElement("p"), a = document.createElement("a");
      a.textContent = `Spil: ${v.navn} · ${v.spillere}/${v.maks}`;
      a.href = `/spil/broekraft/?server=1&verden=${encodeURIComponent(v.id)}`;
      p.append(a); felt.append(p);
    }
    document.querySelector("#besked").textContent = liste.length ? "" : "Bed en voksen om at starte en verden på computeren.";
  } catch (fejl) { document.querySelector("#besked").textContent = fejl.message; }
  setTimeout(opdater, 3000);
}
opdater();
