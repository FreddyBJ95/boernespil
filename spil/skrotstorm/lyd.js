// Spillets små lyde skabes her. Ingen kopierede lydfiler eller høj musik.
export function lyd() {
  let kontekst, motor, lydstyrke, vind, volumen = .65, dæmpet = false;
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
      const buffer = kontekst.createBuffer(1, kontekst.sampleRate * 2, kontekst.sampleRate);
      const data = buffer.getChannelData(0); let sidste = 0;
      for (let i = 0; i < data.length; i++) { sidste = (sidste + (Math.random() * 2 - 1) * .025) / 1.025; data[i] = sidste * 2; }
      const sus = kontekst.createBufferSource(); sus.buffer = buffer; sus.loop = true;
      vind = kontekst.createGain(); vind.gain.value = 0; sus.connect(vind); vind.connect(kontekst.destination); sus.start();
    }
    kontekst.resume().catch(() => {});
  };
  return {
    start,
    volumen(værdi) { volumen = værdi; },
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
      lydstyrke.gain.setTargetAtTime(!dæmpet && kører ? (.022 + Math.abs(fart) * .0006) * volumen : 0, kontekst.currentTime, .1);
      vind.gain.setTargetAtTime(!dæmpet && kører ? (.012 + Math.abs(fart) * .001) * volumen : 0, kontekst.currentTime, .2);
    },
    klang(sejr = false) {
      if (!kontekst || dæmpet || volumen <= 0) return;
      [0, 1, 2].forEach((n) => {
        const o = kontekst.createOscillator(), g = kontekst.createGain(), tid = kontekst.currentTime + n * .11;
        o.type = "sine";
        o.frequency.value = (sejr ? 440 : 350) * [1, 1.25, 1.5][n];
        g.gain.setValueAtTime(0, tid);
        g.gain.linearRampToValueAtTime(.065 * volumen + .00001, tid + .015);
        g.gain.exponentialRampToValueAtTime(.001, tid + .32);
        o.connect(g);
        g.connect(kontekst.destination);
        o.start(tid);
        o.stop(tid + .35);
      });
    },
  };
}
