// Egne facetter gør fundene genkendelige både over øen og i rejsetasken.
const IKONER = {
  krystal: '<path fill="#a9fbf4" d="M32 3 51 19 46 46 32 61 15 45 11 21Z"/><path fill="#775ccb" d="m32 3 1 25-18 17 17 16 14-15 5-27Z"/><path fill="#49ddd5" d="m11 21 22 7-18 17Z"/><path fill="#d1ffff" d="M32 3 11 21l22 7Z"/><path fill="#a78aec" d="m33 28 18-9-5 27Z"/><path fill="#38acae" d="m33 28-1 33-17-16Z"/><path fill="#e3fdfa" d="m22 16 5-4-2 9-7 3Z"/><path fill="none" stroke="#f0ffff" stroke-opacity=".45" d="m32 3 1 25-1 33m1-33 18-9m-18 9-18 17"/>',
  kobber: '<ellipse cx="25" cy="45" rx="20" ry="11" fill="#8e561f"/><ellipse cx="25" cy="41" rx="20" ry="11" fill="#ffd785"/><ellipse cx="25" cy="40" rx="14" ry="7" fill="#dba446"/><ellipse cx="42" cy="32" rx="17" ry="11" fill="#a5692d"/><ellipse cx="42" cy="27" rx="17" ry="11" fill="#ffe4a0"/><ellipse cx="42" cy="26" rx="12" ry="7" fill="#eabd61"/><path fill="#fff2c9" d="m41 19 3 5 6 2-6 2-3 5-2-5-6-2 6-2Zm-20 15 3 4 5 2-5 2-3 4-2-4-5-2 5-2Z"/>',
  eliksir: '<path fill="#745bb8" d="M25 6h14v15l13 14v17l-10 9H22l-10-9V35l13-14Z"/><path fill="#caf8f2" d="M25 14h14v8l11 13v16l-9 8H23l-9-8V35l11-13Z"/><path fill="#7680c8" d="M15 35h34v15l-9 8H24l-9-8Z"/><path fill="#a3a0ec" d="m15 35 9 8h16l9-8Zm9 8v15l-9-8Z"/><path fill="#50489a" d="m40 43 9-8v15l-9 8Z"/><path fill="#bd9065" d="M23 5h18v10H23Z"/><path fill="#ecc69a" d="M23 5h18v4H23Z"/><path fill="#f0fffb" d="m22 29 4-5v11l-4 4Z"/><path fill="#efdfb8" d="m32 40 3 5 5 2-5 2-3 5-3-5-5-2 5-2Z"/>',
  segl: '<path fill="#cda255" d="m32 3 11 7 13 13v19L43 55l-11 6-11-6L8 42V23L21 10Z"/><path fill="#ffe0a0" d="M32 3v11L18 27 8 23l13-13Z"/><path fill="#946437" d="m8 42 10-5 14 14v10l-11-6Z"/><path fill="#8ca89c" d="m32 13 16 14v11L32 52 17 38V27Z"/><path fill="#243e55" d="m32 18 12 11v8L32 47 22 37v-8Z"/><path fill="#bcf9e5" d="m32 21 3 10 8 3-8 3-3 9-3-9-8-3 8-3Z"/><path fill="none" stroke="#ffe8b0" stroke-width="2" d="m32 8 19 17v15L32 56 13 40V25Z"/>',
  kiste: '<path fill="#694653" d="m7 29 25-9 25 9v22l-25 10L7 51Z"/><path fill="#b68b61" d="m7 29 25 9 25-9v9l-25 10L7 38Z"/><path fill="#e3c48a" d="m7 29 25 9v23L7 51Z"/><path fill="#806b5b" d="m32 38 25-9v22L32 61Z"/><path fill="#dfa750" d="M15 31v23l5 2V33Zm29 3v22l5-2V32Z"/><path fill="#f9d489" d="M27 40h10v11H27Z"/><path fill="#302934" d="M31 43h3v5h-3Z"/><path fill="#ffd896" d="m8 17 24-9 24 9-24 9Z"/><path fill="#987856" d="M8 17v11l24 9V26Zm24 9v11l24-9V17Z"/><path fill="#b8f9eb" d="m30 0 2 5 4 2-4 2-2 5-2-5-4-2 4-2Z"/>',
  erfaring: '<path fill="#9378cd" d="m32 5 8 17 19 3-14 14 4 20-17-10-18 10 4-20L4 25l20-3Z"/><path fill="#c9b4fa" d="m32 5 1 27-15 7L4 25l20-3Z"/><path fill="#e8e1ff" d="m32 17 4 11 12 1-9 8 2 12-9-6-10 6 2-12-8-8 12-1Z"/>',
  energi: '<path fill="#7665ba" d="m35 3-22 32h15l-5 26 28-35H36l8-23Z"/><path fill="#c2b0ff" d="M35 3 13 35h15l9-23Z"/><path fill="#e3dfff" d="M36 26h15L23 61l13-25Z"/>',
};
const NAVNE = { krystal: 'Lyskrystal', kobber: 'Kobber', eliksir: 'Eliksir', segl: 'Segl', erfaring: 'Erfaring', energi: 'Energi' };
const tekst = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const tal = v => Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
const antalTekst = v => String(Math.round(v * 10) / 10).replace('.', ',');
const ikon = type => `<svg class="fund-ikon fund-ikon-${type}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${IKONER[type] || IKONER.erfaring}</svg>`;

// Kun faktiske, positive belønninger vises. Kalders data ændres aldrig af køen.
function kopiFund(fund) {
  if (!fund || !['krystal', 'kiste', 'segl'].includes(fund.type) || !Array.isArray(fund.genstande)) return null;
  const genstande = fund.genstande.filter(g => g && Object.prototype.hasOwnProperty.call(NAVNE, g.type) && Number.isFinite(g.antal) && g.antal > 0)
    .map(g => ({ type: g.type, navn: String(g.navn || NAVNE[g.type]), antal: g.antal }));
  if (!genstande.length) return null;
  return { type: fund.type, titel: String(fund.titel || 'Fundet på rejsen'), genstande, note: String(fund.note || ''), fund: 1 };
}

// En fuld kø samler belønninger i et ventende kort i stedet for at miste en kiste eller et segl.
function sammenlæg(a, b) {
  const noter = new Set([a.note, b.note].filter(Boolean));
  for (const g of b.genstande) {
    const gammel = a.genstande.find(v => v.type === g.type && v.navn === g.navn);
    if (gammel) gammel.antal += g.antal;
    else a.genstande.push({ ...g });
  }
  a.fund += b.fund;
  if (a.type !== b.type) a.type = b.type === 'segl' || a.type === 'segl' ? 'segl' : 'kiste';
  a.titel = a.type === 'krystal' ? `${a.fund} lyskrystaller fundet` : `${a.fund} fund på rejsen`;
  a.note = [...noter].join(' ');
}

// Fire eller seks sekunder tælles kun af spillets aktive ticker, aldrig af væguret.
export function opretFundkort(element = document.getElementById('fundkort')) {
  const kø = [];
  let aktiv = null, tilbage = 0, procent = -1, roligNu = null;
  const hud = element?.closest?.('#hud');
  const status = element?.parentElement?.querySelector('[data-fund-status]');
  function roligeEffekter(rolig) {
    if (roligNu === rolig || !element) return;
    element.classList.toggle('fund-rolig', rolig);
    roligNu = rolig;
  }
  function næste() {
    aktiv = kø.shift() || null;
    procent = -1;
    if (!element) return;
    element.classList.toggle('skjult', !aktiv);
    hud?.classList.toggle('har-fund', !!aktiv);
    if (!aktiv) {
      element.innerHTML = '';
      return;
    }
    tilbage = aktiv.type === 'krystal' ? 4 : 6;
    element.dataset.fund = aktiv.type;
    const mærke = aktiv.type === 'segl' ? 'ET GAMMELT SEGL' : aktiv.type === 'kiste' ? 'SKAT FRA ØEN' : 'ET LILLE LYS';
    const rækker = aktiv.genstande.map(g => `<li data-genstand="${g.type}">${ikon(g.type)}<span><b>+${antalTekst(g.antal)}</b> ${tekst(g.navn)}</span></li>`).join('');
    const oplæsning = `${aktiv.titel}. ${aktiv.genstande.map(g => `${antalTekst(g.antal)} ${g.navn}`).join(', ')}.${aktiv.note ? ' ' + aktiv.note : ''}`;
    // Den skjulte oplæsning erstattes én gang ved et nyt kort; måleren læses aldrig op.
    element.innerHTML = `${status ? '' : `<span class="fund-oplæsning" role="status" aria-live="polite" aria-atomic="true">${tekst(oplæsning)}</span>`}<div class="fund-kort" aria-hidden="true"><div class="fund-skat">${ikon(aktiv.type)}<i class="fund-glimt"></i></div><div class="fund-indhold"><small class="fund-mærke">${mærke}</small><h2>${tekst(aktiv.titel)}</h2><ul class="fund-gevinster">${rækker}</ul>${aktiv.note ? `<p class="fund-note">${tekst(aktiv.note)}</p>` : ''}</div><span class="fund-tid"><i></i></span></div>`;
    if (status) status.textContent = oplæsning;
  }
  function vis(fund, { rolig = false } = {}) {
    const kopi = kopiFund(fund);
    if (!kopi || !element) return;
    roligeEffekter(!!rolig);
    const samlet = kopi.type === 'krystal' ? kø.find(v => v.type === 'krystal') : null;
    if (samlet) sammenlæg(samlet, kopi);
    else if (kø.length < 8) kø.push(kopi);
    else sammenlæg(kø.find(v => v.type === kopi.type) || kø[kø.length - 1], kopi);
    if (!aktiv) næste();
  }
  function opdatér(dt, { rolig = false } = {}) {
    roligeEffekter(!!rolig);
    if (!aktiv || !Number.isFinite(dt) || dt <= 0) return;
    tilbage -= Math.min(dt, .25);
    if (tilbage <= 0) næste();
    if (!aktiv) return;
    const nu = Math.max(0, Math.round(tilbage / (aktiv.type === 'krystal' ? 4 : 6) * 100));
    if (nu === procent) return;
    const måler = element.querySelector('.fund-tid i');
    if (måler) måler.style.transform = `scaleX(${nu / 100})`;
    procent = nu;
  }
  function skjul() {
    kø.length = 0;
    aktiv = null;
    tilbage = 0;
    if (element) {
      element.innerHTML = '';
      element.classList.add('skjult');
    }
    hud?.classList.remove('har-fund');
  }
  return { vis, opdatér, skjul };
}

// Krystaller er opgavefremgang; kun kobber og eliksirer er en beholdning, og seglene er varige fund.
export function fundTaske(s = {}) {
  const opgaver = s.opgaver || {};
  const segl = [0, 1, 2].filter(i => tal(opgaver[`boss${i}`]) > 0).length;
  const ting = [
    ['kobber', 'Kobber', tal(s.mønter), 'Til udstyr og eliksirer'],
    ['eliksir', 'Eliksirer', tal(s.eliksirer), 'I rejsetasken'],
    ['segl', 'Gamle segl', `${segl} / 3`, 'Til Stjerneporten'],
  ];
  return `<div class="fund-taske">${ting.map(([type, navn, antal, note]) => `<div class="fund-beholdning">${ikon(type)}<div><span>${navn}</span><b>${antal}</b><small>${note}</small></div></div>`).join('')}</div><p class="fund-opgave">${ikon('krystal')}<span>Lyskrystaller: <b>${Math.min(tal(opgaver.krystal), 8)} / 8</b> til opgaven</span></p>`;
}
