// Tastatur og store touchknapper giver præcis den samme styring.
export function styring() {
  const taster = new Set(), fingre = new Map();
  const kendte = ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift", "w", "a", "s", "d"];
  window.addEventListener("keydown", (e) => {
    const tast = e.key.toLowerCase();
    if (kendte.includes(tast)) {
      e.preventDefault();
      taster.add(tast);
    }
  });
  window.addEventListener("keyup", (e) => taster.delete(e.key.toLowerCase()));
  const ryd = () => {
    taster.clear();
    fingre.clear();
    document.querySelectorAll("[data-styr]").forEach((b) => b.classList.remove("trykket"));
  };
  window.addEventListener("blur", ryd);
  for (const knap of document.querySelectorAll("[data-styr]")) {
    knap.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      knap.setPointerCapture(e.pointerId);
      fingre.set(e.pointerId, knap.dataset.styr);
      knap.classList.add("trykket");
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      knap.addEventListener(type, (e) => {
        fingre.delete(e.pointerId);
        knap.classList.remove("trykket");
      });
    }
  }
  const aktiv = (navn, ...keys) => [...fingre.values()].includes(navn) || keys.some((k) => taster.has(k));
  return {
    ryd,
    hent: () => ({
      gas: Number(aktiv("gas", "w", "arrowup")) - Number(aktiv("bak", "s", "arrowdown")),
      drej: Number(aktiv("højre", "d", "arrowright")) - Number(aktiv("venstre", "a", "arrowleft")),
      bremse: aktiv("brems", " "),
      nitro: aktiv("nitro", "shift"),
    }),
  };
}
