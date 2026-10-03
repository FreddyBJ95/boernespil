// Et selvstændigt lag virker også, når spillets egne knapper aldrig nåede at starte.
export function visStartfejl(grund = "start", { dokument = document, vindue = window } = {}) {
  const eksisterende = dokument.getElementById("spil-3d-startfejl");
  if (eksisterende) return eksisterende;
  vindue.dispatchEvent(new vindue.Event("blur"));

  const lag = dokument.createElement("div");
  lag.id = "spil-3d-startfejl";
  const rod = lag.attachShadow({ mode: "open" });
  const stil = dokument.createElement("style");
  stil.textContent = `
    :host { all:initial; position:fixed; inset:0; z-index:2147483647; display:block; overflow:auto; background:#142b35; color:#f3edda; font-family:system-ui,-apple-system,sans-serif; }
    * { box-sizing:border-box; }
    .ramme { min-height:100vh; min-height:100dvh; display:flex; justify-content:center; flex-direction:column; align-items:center; padding:24px; }
    section { width:100%; max-width:460px; padding:28px; border:1px solid #a5b8af66; border-radius:12px; background:#1c3740; }
    .mærke { color:#eac78b; font-size:12px; letter-spacing:.14em; margin:0 0 14px; }
    h1 { font:normal clamp(25px,5vw,34px)/1.2 Georgia,serif; margin:0 0 18px; }
    p { font-size:16px; line-height:1.6; margin:0 0 22px; }
    nav { display:flex; flex-wrap:wrap; gap:10px; }
    button,a { flex:1; min-width:140px; min-height:48px; display:flex; align-items:center; justify-content:center; border:1px solid #d5c6a477; border-radius:7px; padding:12px 16px; font:600 15px/1.4 system-ui,sans-serif; cursor:pointer; text-decoration:none; text-align:center; }
    button { color:#142b35; background:#eac78b; }
    a { color:#f3edda; background:transparent; }
    button:focus-visible,a:focus-visible { outline:3px solid #97e2db; outline-offset:4px; }
    @media(max-width:380px) { section { padding:23px; } button,a { min-width:100%; } }
  `;
  const ramme = dokument.createElement("div");
  ramme.className = "ramme";
  const kort = dokument.createElement("section");
  kort.setAttribute("role", "alertdialog");
  kort.setAttribute("aria-modal", "true");
  kort.setAttribute("aria-labelledby", "fejl-titel");
  kort.setAttribute("aria-describedby", "fejl-tekst");
  const mærke = dokument.createElement("p");
  mærke.className = "mærke";
  mærke.textContent = "ET ØJEBLIKS RO";
  const titel = dokument.createElement("h1");
  titel.id = "fejl-titel";
  titel.textContent = grund === "kontekst" ? "Spillet holder en pause." : "Spillet kunne ikke åbnes.";
  const tekst = dokument.createElement("p");
  tekst.id = "fejl-tekst";
  tekst.textContent = grund === "kontekst"
    ? "Spillets billede blev afbrudt. Prøv at åbne spillet igen, eller gå tilbage til spilkassen."
    : "Prøv at åbne spillet igen, eller vælg et andet spil i spilkassen.";
  const knapper = dokument.createElement("nav");
  knapper.setAttribute("aria-label", "Kom videre");
  const igen = dokument.createElement("button");
  igen.type = "button";
  igen.textContent = "Prøv igen";
  igen.addEventListener("click", () => vindue.location.reload());
  const hjem = dokument.createElement("a");
  hjem.textContent = "Til spilkassen";
  hjem.href = new URL("../../index.html", dokument.baseURI).href;
  knapper.append(igen, hjem);
  kort.append(mærke, titel, tekst, knapper);
  ramme.append(kort);
  rod.append(stil, ramme);
  dokument.body.append(lag);
  // Ingen bagvedliggende dialog eller holdt styring skal kunne tage tastaturfokus.
  for (const barn of dokument.body.children) if (barn !== lag) barn.inert = true;
  lag.addEventListener("keydown", e => {
    e.stopPropagation();
    if (e.key !== "Tab") return;
    if (e.shiftKey && rod.activeElement === igen) { e.preventDefault(); hjem.focus(); }
    else if (!e.shiftKey && rod.activeElement === hjem) { e.preventDefault(); igen.focus(); }
  });
  igen.focus({ preventScroll: true });
  return lag;
}

// Data-attributten er statisk HTML. Spillet beholder al init, voksenlås og gemning selv.
export async function startSpil(script, { importer = sti => import(sti), dokument = document, vindue = window } = {}) {
  const visFejl = grund => visStartfejl(grund, { dokument, vindue });
  const mistet = e => { if (e.target?.tagName === "CANVAS") visFejl("kontekst"); };
  const fatal = () => visFejl("start");
  dokument.addEventListener("webglcontextlost", mistet, { capture: true });
  vindue.addEventListener("spil-3d-fejl", fatal);
  const stop = () => {
    dokument.removeEventListener("webglcontextlost", mistet, { capture: true });
    vindue.removeEventListener("spil-3d-fejl", fatal);
  };
  try {
    if (!script?.dataset.spil) throw new Error("Spilmodul mangler");
    await importer(new URL(script.dataset.spil, dokument.baseURI).href);
    return { klar: !dokument.getElementById("spil-3d-startfejl"), stop };
  } catch {
    visFejl("start");
    return { klar: false, stop };
  }
}

// ES-moduler har ikke document.currentScript; find kun det script, der bruger netop denne fil.
if (typeof document !== "undefined") {
  const script = [...document.querySelectorAll('script[type="module"][data-spil]')]
    .find(e => e.src === import.meta.url);
  if (script) void startSpil(script);
}
