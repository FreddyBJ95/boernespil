import { BILER, MISSIONER, OPGRADERINGER } from './verden-data.js';
import { egenskaber } from './fysik.js';

// Dialogerne samler hjælp, opgaver og værksted. Bilen standser, og fokus bliver i dialogen.
export function brugerflade(api) {
  const el = id => document.getElementById(id), dialog = el('dialog');
  let åbnede;
  const fokuserbare = () => [...dialog.querySelectorAll('button:not(:disabled),a[href],select,input')].filter(e => e.offsetParent !== null);
  function vis(html) {
    if (dialog.classList.contains('skjult')) åbnede = document.activeElement;
    api.pause(true);
    dialog.innerHTML = `<section class="menu-kort">${html}</section>`;
    dialog.querySelector('h2')?.setAttribute('id', 'dialog-titel');
    dialog.classList.remove('skjult');
    dialog.querySelectorAll('[data-luk]').forEach(e => e.onclick = luk);
    requestAnimationFrame(() => fokuserbare()[0]?.focus());
  }
  function luk() {
    dialog.classList.add('skjult'); api.pause(false);
    if (åbnede?.isConnected && åbnede.offsetParent !== null) åbnede.focus();
    else if (api.startet()) el('verden').focus({ preventScroll: true });
  }
  dialog.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const alle = fokuserbare(), første = alle[0], sidste = alle.at(-1);
    if (!første) { e.preventDefault(); return; }
    if (e.shiftKey && document.activeElement === første) { e.preventDefault(); sidste.focus(); }
    else if (!e.shiftKey && document.activeElement === sidste) { e.preventDefault(); første.focus(); }
  });
  const knapper = html => `<div class="dialog-knapper">${html}</div>`;
  const tilbage = () => `<button data-luk class="primær">${api.startet() ? 'Kør videre' : 'Tilbage'}</button>`;
  function pause() {
    const gemt = api.gem();
    vis(`<div class="overlinje">TAG EN PAUSE</div><h2>Ørkenen venter.</h2><p class="gem-status">${gemt ? 'Din fremgang og bilens placering er gemt på denne enhed.' : 'Denne browser kan ikke gemme. Du kan køre videre her, men rejsen bevares ikke, når siden lukkes.'}</p>${knapper(`${tilbage()}<button id="pause-garage">Garagen</button><button id="pause-kort">Kort og opgave</button><button id="pause-valg">Indstillinger</button><button id="pause-hjælp">Hjælp</button><button id="nulstil">Nyt eventyr</button><a class="menulink" href="../../index.html">← Til spilkassen</a>`)}`);
    el('pause-garage').onclick = garage; el('pause-kort').onclick = kort; el('pause-valg').onclick = valg; el('pause-hjælp').onclick = hjælp;
    el('nulstil').onclick = () => {
      vis(`<div class="overlinje">NYT EVENTYR</div><h2>Begynd forfra?</h2><p>Opgaver, skrot og opgraderinger bliver nulstillet. Dine indstillinger beholdes.</p>${knapper('<button data-luk>Behold min bil</button><button id="bekræft-reset" class="primær">Ja, begynd forfra</button>')}`);
      el('bekræft-reset').onclick = () => { api.nulstil(); luk(); };
    };
  }
  function garage() {
    const f = api.fremgang(), hjemme = api.hjemme(), e = egenskaber(f);
    const manglerSkrot = o => {
      const pris = o.priser[f[o.id]];
      return hjemme && pris > f.skrot ? ' · mangler ' + (pris - f.skrot) + ' skrot' : '';
    };
    const næsteBelønning = MISSIONER[f.mission]?.belønning;
    const fordele = o => {
      if (f[o.id] >= 3) return 'Fuldt opgraderet';
      const efter = egenskaber({ ...f, [o.id]: f[o.id] + 1 });
      return o.id === 'motor' ? `Topfart ${Math.round(e.topfart * 3.6)} → ${Math.round(efter.topfart * 3.6)} km/t · trækkraft +2,1` : o.id === 'hjul' ? `Sandfart ${Math.round(e.sand * 100)} → ${Math.round(efter.sand * 100)} % · bedre greb` : `Boost ${e.nitroTid.toFixed(1)} → ${efter.nitroTid.toFixed(1)} sekunder`;
    };
    vis(`<div class="overlinje">DEN BLÅ GARAGE · ${f.skrot} SKROT</div><h2>Din bil. Dine veje.</h2><p class="lille">${hjemme ? 'Vælg karrosseri og forbedringer. Motor, terrænhjul og nitro følger med mellem bilerne.' + (næsteBelønning ? ' Næste opgave giver ' + næsteBelønning + ' skrot.' : '') : 'Kør hjem eller hent bilen gratis til garagen for at bygge videre.'}</p><div class="biler">${BILER.map(b => `<button class="bilvalg ${f.bil === b.id ? 'valgt' : ''}" data-bil="${b.id}" ${hjemme ? '' : 'disabled'} aria-pressed="${f.bil === b.id}">${b.navn}<small>${b.tekst}</small><span class="biltal">${Math.round((b.fart + f.motor * 4) * 3.6)} km/t · greb ${Math.round((b.greb + f.hjul * .14) * 100)}%</span></button>`).join('')}</div><div class="bil-statistik"><span><b>${Math.round(e.topfart * 3.6)}</b> km/t på vej</span><span><b>${Math.round(e.sand * 100)}%</b> fart i sand</span><span><b>${e.nitroTid.toFixed(1)} s</b> nitro</span></div>${OPGRADERINGER.map(o => `<div class="opgradering"><div class="forklaring"><strong>${o.navn} <span class="niveau">${'●'.repeat(f[o.id])}${'○'.repeat(3 - f[o.id])}</span></strong><small>${o.tekst}</small><small class="gevinst">${fordele(o)}${manglerSkrot(o)}</small></div><button data-opgrader="${o.id}" ${!hjemme || f[o.id] >= 3 || f.skrot < o.priser[f[o.id]] ? 'disabled' : ''}>${f[o.id] >= 3 ? 'Færdig' : `${o.priser[f[o.id]]} ⚙`}</button></div>`).join('')}${knapper(`${tilbage()}${hjemme ? '' : '<button id="hjem-garage">Hent bilen til garagen</button>'}<button id="garage-valg">Indstillinger</button>`)}`);
    dialog.querySelectorAll('[data-bil]').forEach(b => b.onclick = () => { api.bil(b.dataset.bil); garage(); });
    dialog.querySelectorAll('[data-opgrader]').forEach(b => b.onclick = () => { if (api.opgrader(b.dataset.opgrader)) garage(); });
    if (el('hjem-garage')) el('hjem-garage').onclick = () => { api.redning(true); garage(); };
    el('garage-valg').onclick = valg;
  }
  function valg() {
    const v = api.valg();
    const liste = (id, navn, muligheder) => `<label class="valg-række"><span>${navn}</span><select id="valg-${id}">${muligheder.map(([værdi, tekst]) => `<option value="${værdi}" ${v[id] === værdi ? 'selected' : ''}>${tekst}</option>`).join('')}</select></label>`;
    vis(`<div class="overlinje">DIN TUR GENNEM DALEN</div><h2>Gør bilen til din.</h2>${liste('kamera', 'Kamera', [['følg', 'Følg bilen'], ['udsigt', 'Bred udsigt'], ['motorhjelm', 'Fra motorhjelmen']])}${liste('grafik', 'Detaljer', [['auto', 'Automatisk'], ['let', 'Let · bedst på telefon'], ['flot', 'Flot · skygger']])}${liste('styring', 'Touchstyring', [['pile', 'To store styrepile'], ['rat', 'Træk på rattet']])}<label class="valg-række"><span>Styringens følsomhed <b id="værdi-følsomhed">${v.følsomhed.toFixed(1)}</b></span><input id="valg-følsomhed" type="range" min=".5" max="1.5" step=".1" value="${v.følsomhed}"></label><label class="valg-række"><span>Lydstyrke <b id="værdi-lydstyrke">${Math.round(v.lydstyrke * 100)}%</b></span><input id="valg-lydstyrke" type="range" min="0" max="1" step=".05" value="${v.lydstyrke}"></label><label class="valg-række"><span>Blå vejvisere på vejen</span><input id="valg-gps" type="checkbox" ${v.gps ? 'checked' : ''}></label><p class="lille">Valgene gemmes på denne enhed. Dine otte opgaver og bilens forbedringer bevares.</p>${knapper(`${tilbage()}<button id="vis-intro">Vis køreskolen igen</button>`)}`);
    for (const id of ['kamera', 'grafik', 'styring', 'følsomhed', 'lydstyrke', 'gps']) {
      el(`valg-${id}`).onchange = e => {
        v[id] = id === 'gps' ? e.target.checked : ['følsomhed', 'lydstyrke'].includes(id) ? Number(e.target.value) : e.target.value;
        const gemt = api.gemValg(v); api.anvendValg();
        if (!gemt) dialog.querySelector('.lille').textContent = 'Denne browser kan ikke gemme dine valg. De virker, så længe siden er åben.';
        if (id === 'følsomhed') el('værdi-følsomhed').textContent = v.følsomhed.toFixed(1);
        if (id === 'lydstyrke') el('værdi-lydstyrke').textContent = `${Math.round(v.lydstyrke * 100)}%`;
      };
    }
    el('vis-intro').onclick = intro;
  }
  function intro() {
    vis(`<div class="overlinje">VELKOMMEN TIL DEN BLÅ GARAGE</div><h2>En lille køreskole.</h2><div class="intro-trin"><b>1</b><span><strong>Giv gas og styr</strong>WASD / pile på computer. På touch: hold GAS og en styrepil samtidig. Slip gas inden et sving.</span></div><div class="intro-trin"><b>2</b><span><strong>Følg de blå vejvisere</strong>Kortet viser en sammenhængende rute til dit næste mål. Tryk på kortet for et stort overblik.</span></div><div class="intro-trin"><b>3</b><span><strong>Byg din egen skrotbil</strong>Otte opgaver giver skrot. Garagen forbedrer fart, greb og nitro. Du kan altid hente bilen hjem gratis.</span></div><p class="lille">Vælg rat, kamera, lyd og grafik i pausemenuens indstillinger. Køreskolen kan åbnes igen dér.</p>${knapper('<button data-luk class="primær">Klar · lad os køre</button><button id="intro-valg">Tilpas styringen</button>')}`);
    const v = api.valg(); v.vistStart = true; api.gemValg(v); el('intro-valg').onclick = valg;
  }
  function hjælp() {
    vis(`<div class="overlinje">SÅDAN KØRER DU</div><h2>Dit eget ørkeneventyr.</h2><div class="hjælp-række"><b>Computer</b><span>W / ↑ giver gas. S / ↓ bremser og bakker. A / D eller ← / → styrer. Mellemrum: håndbremse. Shift: nitro. R: redning. Escape: pause.</span></div><div class="hjælp-række"><b>Touch</b><span>Hold GAS sammen med styrepile eller træk på rattet. BAK, ■ brems og ⚡ nitro kan bruges samtidig. Alle menuer standser bilen.</span></div><div class="hjælp-række"><b>Find vej</b><span>Følg vejens blå pile og den farvede rute på kortet. GPS tager opkørslen til bjergene. Tryk på kortet for at læse opgaven.</span></div><div class="hjælp-række"><b>Store rampe</b><span>Opgave 5: GPS viser først tilløbet vest for rampen. Kør mod øst med mindst 55 km/t, brug nitro og hold rattet lige. Land for at klare opgaven.</span></div><div class="hjælp-række"><b>Sidder fast?</b><span>Gensæt bil finder en sikker vej i samme højde. Garage-menuen kan hente bilen helt hjem. Det koster intet.</span></div><p class="lille">Fremgang gemmes på enheden, når browseren tillader det. Ingen konti eller betaling.</p>${knapper(`${tilbage()}<button id="hjælp-intro">Køreskole</button><button id="hjælp-valg">Indstillinger</button>`)}`);
    el('hjælp-intro').onclick = intro; el('hjælp-valg').onclick = valg;
  }
  function kort() {
    const f = api.fremgang(), m = MISSIONER[f.mission];
    vis(`<div class="overlinje">DALENS VEJE · NORD ↑</div><h2>${m?.navn || 'Dalen lyser igen'}</h2><p>${m?.tekst || 'Alle otte opgaver er klaret. Udforsk frit, prøv bilerne og byg videre i garagen.'}</p><canvas id="stort-kort" width="660" height="660" aria-label="Hele dalen med din orange bil og blå rute"></canvas><p class="kort-forklaring"><span>▲ Din bil</span><span>● Næste mål</span><span>G Garage · F Fabrik<br>S Solstation · T Tårn</span></p>${knapper(`${tilbage()}<button id="kort-garage">Garagen</button>`)}`);
    api.tegnKort(el('stort-kort').getContext('2d'), 660); el('kort-garage').onclick = garage;
  }
  function klaret(mission) {
    const f = api.fremgang(), næste = MISSIONER[f.mission];
    vis(`<div class="overlinje">${f.mission} / 8 OPGAVER KLARET</div><h2>${næste ? 'Godt kørt.' : 'Du tændte dalen.'}</h2><div class="belønning">+${mission.belønning} <span>skrot</span></div><p>${næste ? `<strong>${mission.navn}</strong> er klaret.<br>Næste: ${næste.tekst}` : 'Stormlygten lyser over bjergpasset. Fabrikken, garagen og solstationen er forbundet igen. Du kan køre frit og bygge videre.'}</p>${knapper(`<button data-luk class="primær">${næste ? 'Kør til næste opgave' : 'Kør frit videre'}</button><button id="klaret-garage">Brug skrot i garagen</button>`)}`);
    el('klaret-garage').onclick = garage;
  }
  return { pause, garage, valg, hjælp, intro, kort, klaret, luk };
}
