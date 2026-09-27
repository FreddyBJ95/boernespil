// Panelet bruger textContent til verdensnavne og viser aldrig indtastninger som HTML.
const $ = s => document.querySelector(s);
let token, sidsteAdresser = "", sidsteVerdener = "";
const figurer = { gris: "🐷", ko: "🐮", faar: "🐑", hone: "🐔", fro: "🐸", and: "🦆", snegl: "🐌", zombie: "🧟" };
const tekst = (tag, indhold) => { const e = document.createElement(tag); e.textContent = indhold; return e; };

async function handling(navn, data) {
  const svar = await fetch(`/api/${navn}`, { method: "POST", headers: { "content-type": "application/json", "x-broekraft-token": token }, body: JSON.stringify(data) });
  const b = await svar.json();
  if (!svar.ok) throw new Error(b.fejl || "Handlingen mislykkedes");
  return b;
}

function knap(navn, opgave) {
  const e = tekst("button", navn);
  e.onclick = async () => {
    e.disabled = true;
    try { await opgave(); await opdater(); }
    catch (fejl) { $("#besked").textContent = fejl.message; }
    finally { e.disabled = false; }
  };
  return e;
}

function visVerdener(liste) {
  const nøgle = JSON.stringify(liste);
  if (nøgle === sidsteVerdener) return;
  sidsteVerdener = nøgle; $("#verdener").replaceChildren();
  for (const v of liste) {
    const e = document.createElement("article");
    e.append(tekst("h3", v.navn), tekst("p", `${v.bredde} × ${v.dybde} · ${v.spillere}/${v.maksSpillere} spillere · ${v.startet ? "Startet" : "Stoppet"}`));
    e.append(knap(v.startet ? "Stop" : "Start", () => handling(v.startet ? "stop" : "start", { id: v.id })));
    e.append(knap("Backup", async () => { const b = await handling("backup", { id: v.id }); $("#besked").textContent = `Backup gemt i:\n${b.mappe}`; }));
    e.append(knap("Slet", async () => {
      if (!confirm(`Vil du slette ${v.navn}?`)) return;
      if (prompt("Sletningen kan ikke fortrydes. Skriv SLET for at bekræfte igen.") !== "SLET") return;
      await handling("slet", { id: v.id, bekræft: v.id, bekræftIgen: "SLET" });
    }));
    $("#verdener").append(e);
  }
  if (!liste.length) $("#verdener").append(tekst("p", "Opret den første verden ovenfor."));
}

async function opdater() {
  const svar = await fetch("/api/status"), b = await svar.json();
  if (!svar.ok) throw new Error(b.fejl || "Kan ikke hente status");
  token = b.token;
  $("#lagring").textContent = `Verdener gemmes i: ${b.datamappe}`;
  if (JSON.stringify(b.adresser) !== sidsteAdresser) {
    sidsteAdresser = JSON.stringify(b.adresser); $("#adresser").replaceChildren();
    for (const adresse of b.adresser) {
      const e = document.createElement("div"), a = tekst("a", adresse); a.href = adresse;
      const qr = globalThis.qrcode(0, "M"); qr.addData(adresse); qr.make();
      // SVG kommer alene fra den medfølgende QR-generator og en serveradresse.
      const billede = document.createElement("div"); billede.innerHTML = qr.createSvgTag({ scalable: true, margin: 4 });
      e.append(billede, a); $("#adresser").append(e);
    }
    if (!b.adresser.length) $("#adresser").append(tekst("p", "Intet privat netværk fundet. Tilslut wifi og genstart serveren."));
  }
  visVerdener(b.verdener);
  $("#spillere").replaceChildren(...b.spillere.map(s => tekst("li", `${figurer[s.figur]} · ${s.verden}`)));
  $("#job").replaceChildren(...b.job.map(j => {
    const e = tekst("p", `${j.navn}: ${j.status === "fejl" ? j.fejl : j.status === "færdig" ? "Klar" : `${j.procent}%`}`);
    if (j.status === "arbejder") { const p = document.createElement("progress"); p.max = 100; p.value = j.procent; e.append(p); }
    return e;
  }));
  const arbejder = b.job.some(j => j.status === "arbejder");
  $("#opret button").disabled = arbejder;
  // Når verdenen er klar, forsvinder "bliver oprettet…" igen (listen ovenfor viser "Klar")
  if (!arbejder && $("#besked").textContent === OPRETTER) $("#besked").textContent = "";
}

const OPRETTER = "Verdenen bliver oprettet…";
$("#opret").onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  $("#opret button").disabled = true;
  try {
    await handling("opret", { navn: f.get("navn"), type: f.get("type"), bredde: Number(f.get("bredde")), maksSpillere: Number(f.get("maksSpillere")), frø: f.get("frø"), ildBreder: f.has("ildBreder") });
    $("#besked").textContent = OPRETTER; await opdater();
  } catch (fejl) { $("#besked").textContent = fejl.message; $("#opret button").disabled = false; }
};

// Vent på hvert svar før næste forespørgsel, også på en langsom computer.
async function følg() {
  try { await opdater(); } catch (fejl) { $("#besked").textContent = `Kontakt til serveren afbrudt: ${fejl.message}`; }
  setTimeout(følg, 1500);
}
følg();
