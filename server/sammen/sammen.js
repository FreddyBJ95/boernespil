// "Spil sammen": listen over de verdener, der kører på familiens computer.
// Opdateres hvert 3. sekund, så man kan se, når en ven kommer ind, eller en ny verden bliver startet.
import { VERDENER } from "/spil/broekraft/verdener.js";

const $ = id => document.getElementById(id);
let sidste = "";

function kort(v) {
  const type = VERDENER.find(t => t.id === v.type) || VERDENER[0];
  const fuld = v.spillere >= v.maks;
  const k = document.createElement("div");
  k.className = "kort";
  k.style.background = `linear-gradient(165deg, ${type.himmel[0]}, ${type.himmel[1]})`;
  const ikon = document.createElement("div"); ikon.className = "ikon"; ikon.textContent = type.ikon;
  const navn = document.createElement("div"); navn.className = "navn"; navn.textContent = v.navn;
  const info = document.createElement("div"); info.className = "type";
  info.textContent = `${type.navn} · ${v.bredde} × ${v.dybde}`;
  // en firkant pr. plads — grønne er optaget
  const pladser = document.createElement("div"); pladser.className = "pladser";
  pladser.setAttribute("aria-label", `${v.spillere} af ${v.maks} spillere`);
  for (let i = 0; i < v.maks; i++) {
    const p = document.createElement("span"); p.className = "plads" + (i < v.spillere ? " fyldt" : "");
    pladser.appendChild(p);
  }
  const knap = document.createElement("a");
  knap.className = "mc" + (fuld ? " fuld" : "");
  knap.textContent = fuld ? "😕 Fuld" : v.spillere ? "▶ Spil med" : "▶ Spil";
  knap.href = `/spil/broekraft/?server=1&verden=${encodeURIComponent(v.id)}`;
  k.append(ikon, navn, info, pladser, knap);
  return k;
}

async function opdater() {
  try {
    const svar = await fetch("/verdensliste", { cache: "no-store" });
    if (!svar.ok) throw new Error("Computeren svarer ikke.");
    const liste = await svar.json(), nøgle = JSON.stringify(liste);
    $("fejl").hidden = true;
    if (nøgle !== sidste) {                       // tegn kun om, når noget har ændret sig
      sidste = nøgle;
      $("verdener").replaceChildren(...liste.map(kort));
      $("tom").hidden = liste.length > 0;
    }
  } catch (fejl) {
    $("fejlTekst").textContent = `${fejl.message} Er den tændt, og er I på samme wifi?`;
    $("fejl").hidden = false; $("tom").hidden = true;
  }
  setTimeout(opdater, 3000);
}
opdater();
