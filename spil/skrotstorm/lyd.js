// Spillets små lyde skabes her. Ingen kopierede lydfiler eller høj musik.
export function lyd() {
  let kontekst, motor, lydstyrke, dæmpet = false;
  try {
    dæmpet = localStorage.getItem("skrotstorm-lyd") === "fra";
  } catch { /* Privat browser. */ }
  const start = () => {
    if (!kontekst) {
      const LydKontekst = window.AudioContext || window.webkitAudioContext;
      if (!LydKontekst) return;
      kontekst = new LydKontekst();
      motor = kontekst.createOscillator();
      lydstyrke = kontekst.createGain();
      motor.type = "triangle";
      motor.frequency.value = 35;
      lydstyrke.gain.value = 0;
      motor.connect(lydstyrke);
      lydstyrke.connect(kontekst.destination);
      motor.start();
    }
    kontekst.resume().catch(() => {});
  };
  return {
    start,
    get dæmpet() {
      return dæmpet;
    },
    skift() {
      dæmpet = !dæmpet;
      try {
        localStorage.setItem("skrotstorm-lyd", dæmpet ? "fra" : "til");
      } catch {}
      return dæmpet;
    },
    opdater(fart, kører) {
      if (!kontekst) return;
      motor.frequency.setTargetAtTime(34 + Math.abs(fart) * 2.2, kontekst.currentTime, .1);
      lydstyrke.gain.setTargetAtTime(!dæmpet && kører ? .022 + Math.abs(fart) * .0006 : 0, kontekst.currentTime, .1);
    },
    klang(sejr = false) {
      if (!kontekst || dæmpet) return;
      [0, 1, 2].forEach((n) => {
        const o = kontekst.createOscillator(), g = kontekst.createGain(), tid = kontekst.currentTime + n * .11;
        o.type = "sine";
        o.frequency.value = (sejr ? 440 : 350) * [1, 1.25, 1.5][n];
        g.gain.setValueAtTime(0, tid);
        g.gain.linearRampToValueAtTime(.065, tid + .015);
        g.gain.exponentialRampToValueAtTime(.001, tid + .32);
        o.connect(g);
        g.connect(kontekst.destination);
        o.start(tid);
        o.stop(tid + .35);
      });
    },
  };
}
