// En lille, rolig status følger angrebets faktiske tid; den ændrer aldrig spillets regler.
const VÅBENSTATUS = {
  sværd: { handling: 'Slå', frigivelse: .35, varighed: .55, før: 'Sving', efter: 'Svinger færdigt' },
  bue: { handling: 'Skyd', frigivelse: .55, varighed: .7, før: 'Spænder buen', efter: 'Pilen er afsted' },
  magi: { handling: 'Kast lys', frigivelse: .4, varighed: 1, før: 'Samler lys', efter: 'Lyset er afsted' },
};
let flade;

// Tekst og ARIA ændres kun ved nye tilstande; måleren har ingen animation eller live-oplæsning.
export function opdatérKampstatus({ våben = 'sværd', fremskridt = null, slag = 1, energi = 100, pause = 0, varighed } = {}) {
  const v = VÅBENSTATUS[våben] || VÅBENSTATUS.sværd;
  const aktiv = Number.isFinite(fremskridt);
  const tid = Number.isFinite(pause) ? Math.max(0, pause) : 0;
  const længde = Number.isFinite(varighed) && varighed > 0 ? varighed : v.varighed;
  const manglerEnergi = våben === 'magi' && Number.isFinite(energi) && energi < 14;
  let tekst = 'Klar', tilstand = 'klar', andel = 1;
  if (aktiv) {
    andel = Math.max(0, Math.min(1, fremskridt));
    tekst = andel < v.frigivelse ? våben === 'sværd' ? `Sving ${slag === 2 ? 2 : 1}` : v.før : v.efter;
    tilstand = 'aktiv';
  } else if (tid > 0) {
    andel = Math.max(0, Math.min(1, 1 - tid / længde));
    tekst = 'Klar om lidt';
    tilstand = 'venter';
  } else if (manglerEnergi) {
    andel = 0;
    tekst = 'Mangler energi';
    tilstand = 'energi';
  }
  if (!flade || !flade.knap.isConnected) {
    const el = id => document.getElementById(id);
    const knap = el('angrib'), handling = el('angreb-handling'), status = el('angreb-status'), fremgang = el('angreb-fremgang');
    if (!knap || !handling || !status || !fremgang) return;
    flade = { knap, handling, status, fremgang, procent: -1 };
  }
  if (flade.handling.textContent !== v.handling) flade.handling.textContent = v.handling;
  if (flade.status.textContent !== tekst) flade.status.textContent = tekst;
  if (flade.knap.dataset.kamp !== tilstand) flade.knap.dataset.kamp = tilstand;
  const aria = `${v.handling} · ${tekst}. Hold for gentagne angreb.`;
  if (flade.knap.getAttribute('aria-label') !== aria) flade.knap.setAttribute('aria-label', aria);
  const procent = Math.round(andel * 100);
  if (procent !== flade.procent) {
    flade.fremgang.style.transform = `scaleX(${procent / 100})`;
    flade.procent = procent;
  }
}
