// Tastatur, pile og et roligt touchrat deler samme input og kan bruges med flere fingre.
export function styring() {
  const taster = new Set(), fingre = new Map();
  let aktivStyring = false, tastaturMenu = false, ratFinger, rat = 0;
  const kendte = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'w', 'a', 's', 'd'];
  const ryd = () => {
    taster.clear(); fingre.clear(); rat = 0; ratFinger = undefined;
    document.querySelectorAll('[data-styr]').forEach(b => b.classList.remove('trykket'));
    document.getElementById('rat-skive').style.transform = '';
  };
  window.addEventListener('keydown', e => {
    if (e.key === 'Tab') { tastaturMenu = true; return; }
    const tast = e.key.toLowerCase();
    // Mellemrum skal stadig kunne aktivere en fokuseret menuknap med tastaturet.
    if (tast === ' ' && tastaturMenu && document.activeElement?.closest('button,a,input,select')) return;
    if (aktivStyring && kendte.includes(tast)) {
      e.preventDefault();
      tastaturMenu = false;
      document.getElementById('verden').focus({ preventScroll: true });
      // En tast holdt under en menu skal slippes og trykkes igen, før bilen kører.
      if (!e.repeat || taster.has(tast)) taster.add(tast);
    }
  });
  window.addEventListener('keyup', e => taster.delete(e.key.toLowerCase()));
  window.addEventListener('pointerdown', () => { tastaturMenu = false; });
  window.addEventListener('blur', ryd);
  for (const knap of document.querySelectorAll('[data-styr]')) {
    knap.addEventListener('pointerdown', e => {
      if (!aktivStyring) return;
      e.preventDefault(); knap.setPointerCapture(e.pointerId);
      fingre.set(e.pointerId, knap.dataset.styr); knap.classList.add('trykket');
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) knap.addEventListener(type, e => {
      fingre.delete(e.pointerId);
      if (![...fingre.values()].includes(knap.dataset.styr)) knap.classList.remove('trykket');
    });
  }
  const ratEl = document.getElementById('touch-rat');
  const drejRat = e => {
    const r = ratEl.getBoundingClientRect();
    rat = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * .38)));
    document.getElementById('rat-skive').style.transform = `rotate(${rat * 58}deg)`;
  };
  ratEl.addEventListener('pointerdown', e => {
    if (!aktivStyring || ratFinger !== undefined) return;
    e.preventDefault(); ratFinger = e.pointerId; ratEl.setPointerCapture(e.pointerId); drejRat(e);
  });
  ratEl.addEventListener('pointermove', e => { if (e.pointerId === ratFinger) { e.preventDefault(); drejRat(e); } });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) ratEl.addEventListener(type, e => {
    if (e.pointerId === ratFinger) { ratFinger = undefined; rat = 0; document.getElementById('rat-skive').style.transform = ''; }
  });
  const aktiv = (navn, ...keys) => [...fingre.values()].includes(navn) || keys.some(k => taster.has(k));
  return {
    ryd,
    sætAktiv(værdi) { aktivStyring = værdi; ryd(); },
    hent: () => ({
      gas: Number(aktiv('gas', 'w', 'arrowup')) - Number(aktiv('bak', 's', 'arrowdown')),
      drej: Math.max(-1, Math.min(1, rat + Number(aktiv('højre', 'd', 'arrowright')) - Number(aktiv('venstre', 'a', 'arrowleft')))),
      bremse: aktiv('brems', ' '), nitro: aktiv('nitro', 'shift'),
    }),
  };
}
