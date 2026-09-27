import { serveradresse } from "./adresse.js";
const $ = id => document.getElementById(id);
const GEM = "broekraft-serveradresse";
let strøm, timer, session = 0;
const lærred = document.createElement("canvas"), pen = lærred.getContext("2d", { willReadFrequently: true });

// Gem kun adressen; kameraets billeder forlader aldrig tabletten.
function husk(adresse) { try { localStorage.setItem(GEM, adresse); } catch { /* Privat browsing må stadig fungere. */ } }
function visAdresse(adresse) {
  stop();
  $("fundet-adresse").textContent = adresse;
  $("åbn").href = adresse;
  $("åbn").onclick = () => husk(adresse);
  $("fundet").hidden = false;
  $("besked").textContent = "Tryk nedenfor for at åbne serveren på computeren.";
  $("åbn").focus();
}

// Afbryd også en endnu ubesvaret kameraanmodning, når siden forlades.
function stop() {
  session++;
  clearTimeout(timer);
  strøm?.getTracks().forEach(t => t.stop());
  strøm = null;
  $("video").srcObject = null;
  $("kamera").hidden = true;
  $("scan").disabled = false;
}

function læsKamera(nr) {
  if (nr !== session || !strøm) return;
  const video = $("video");
  try {
    if (video.readyState >= 2 && video.videoWidth) {
      const skala = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      lærred.width = Math.round(video.videoWidth * skala); lærred.height = Math.round(video.videoHeight * skala);
      pen.drawImage(video, 0, 0, lærred.width, lærred.height);
      const billede = pen.getImageData(0, 0, lærred.width, lærred.height);
      const kode = globalThis.jsQR(billede.data, billede.width, billede.height, { inversionAttempts: "dontInvert" });
      if (kode) {
        try { visAdresse(serveradresse(kode.data)); return; }
        catch { $("besked").textContent = "Det er ikke en Broekraft-serveradresse. Scan koden i computerens kontrolpanel."; }
      }
    }
    timer = setTimeout(() => læsKamera(nr), 200);
  } catch {
    stop(); $("besked").textContent = "Kameraet kunne ikke læse billedet. Prøv igen, eller brug tablettens app Kamera.";
  }
}

$("scan").onclick = async () => {
  stop(); $("fundet").hidden = true;
  if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    $("besked").textContent = "Brug tablettens app Kamera til at scanne QR-koden. Du kan også åbne den almindelige Børnespil-hjemmeside i Safari eller skrive adressen nedenfor.";
    return;
  }
  if (!pen || typeof globalThis.jsQR !== "function") { $("besked").textContent = "Scanneren er ikke indlæst. Genindlæs siden, eller brug appen Kamera."; return; }
  const nr = session;
  $("scan").disabled = true; $("kamera").hidden = false;
  $("besked").textContent = "Tillad kameraet, og ret det mod QR-koden på computeren.";
  try {
    const ny = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    if (nr !== session) { ny.getTracks().forEach(t => t.stop()); return; }
    strøm = ny; $("video").srcObject = ny;
    await $("video").play();
    if (nr === session) læsKamera(nr);
  } catch (fejl) {
    if (nr !== session) return;
    stop();
    $("besked").textContent = fejl.name === "NotAllowedError" ? "Kameraet blev ikke tilladt. Brug appen Kamera, eller skriv serveradressen nedenfor." : "Kameraet kunne ikke åbnes. Luk andre kamera-apps og prøv igen, eller skriv adressen nedenfor.";
  }
};
$("stop").onclick = () => { stop(); $("besked").textContent = "Kameraet er lukket."; $("scan").focus(); };
$("manuel").onsubmit = e => {
  e.preventDefault(); $("adresse-fejl").textContent = "";
  try { visAdresse(serveradresse($("adresse").value)); }
  catch (fejl) { $("adresse-fejl").textContent = fejl.message; $("fundet").hidden = true; }
};
document.addEventListener("visibilitychange", () => { if (document.hidden) { stop(); $("besked").textContent = "Kameraet er lukket. Tryk Scan QR-kode for at starte igen."; } });
globalThis.addEventListener("pagehide", stop);
try {
  const gemt = localStorage.getItem(GEM);
  if (gemt) {
    const adresse = serveradresse(gemt);
    $("seneste-link").href = adresse; $("seneste-link").textContent = `Åbn ${adresse}`; $("seneste").hidden = false;
  }
} catch { /* En gammel eller utilgængelig adresse må ikke stoppe opsætningen. */ }
