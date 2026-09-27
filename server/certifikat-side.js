// Vejledningen "Gør tabletten klar til mikrofon" (http://computer:8080/certifikat).
// En voksen følger den én gang pr. tablet. Billederne er små tegninger af iPad-skærmene (SVG),
// med en orange ring og en finger dér, hvor man skal trykke. Siden tjekker selv, om tabletten er klar.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- Tegninger af skærmene ----------
const B = 520, H = 340;
const skærm = (indhold, bund = "#ffffff") => `<svg class="billede" viewBox="0 0 ${B} ${H}" role="img" aria-hidden="true">
<rect width="${B}" height="${H}" rx="26" fill="#2b3036"/><rect x="14" y="14" width="${B - 28}" height="${H - 28}" rx="12" fill="${bund}"/>
<g clip-path="inset(0 round 12px)">${indhold}</g></svg>`;
const tekst = (x, y, t, { s = 13, f = "#1c1c1e", v = 400, a = "middle" } = {}) =>
  `<text x="${x}" y="${y}" font-size="${s}" fill="${f}" font-weight="${v}" text-anchor="${a}">${esc(t)}</text>`;
// Orange ring der pulserer + en finger, der peger
const peg = (x, y, r = 22) => `<circle class="ring" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#ff8a00" stroke-width="4"/>
<text class="finger" x="${x + r * 0.55}" y="${y + r + 30}" font-size="34">👆</text>`;
const safari = vært => `<rect x="14" y="14" width="${B - 28}" height="38" fill="#f6f6f6"/>
<rect x="150" y="22" width="220" height="22" rx="8" fill="#e4e4e9"/>${tekst(260, 38, `🔒 ${vært}`, { s: 12, f: "#555" })}
${[70, 92, 114, 150, 172, 194, 230, 252].map((y, i) => `<rect x="${60 + (i % 3) * 20}" y="${y}" width="${340 - (i % 4) * 50}" height="10" rx="5" fill="#e9ecef"/>`).join("")}`;
const dæmp = `<rect x="14" y="14" width="${B - 28}" height="${H - 28}" fill="rgba(0,0,0,.28)"/>`;
// iOS-agtig dialog med to knapper (eller én) — svarer midten af den knap, der skal trykkes på
function dialog(linjer, knapper, valgt) {
  const b = 290, x = (B - b) / 2, h = 70 + linjer.length * 18, y = (H - h) / 2 - 8, ky = y + h - 44;
  let s = `<rect x="${x}" y="${y}" width="${b}" height="${h}" rx="16" fill="#f2f2f7"/>`;
  linjer.forEach((l, i) => { s += tekst(B / 2, y + 30 + i * 18, l.replace(/^\*/, ""), { s: 13, v: l.startsWith("*") ? 700 : 400 }); });
  s += `<line x1="${x}" y1="${ky}" x2="${x + b}" y2="${ky}" stroke="#c6c6c8"/>`;
  const w = b / knapper.length;
  knapper.forEach((k, i) => {
    if (i) s += `<line x1="${x + i * w}" y1="${ky}" x2="${x + i * w}" y2="${ky + 44}" stroke="#c6c6c8"/>`;
    s += tekst(x + w * i + w / 2, ky + 28, k, { s: 15, f: "#0a7aff", v: i === valgt ? 700 : 400 });
  });
  return s + peg(x + w * valgt + w / 2, ky + 22, 26);
}
const række = (x, y, b, ikon, farve, t, { ekstra = "", pil = true } = {}) => `<rect x="${x}" y="${y}" width="${b}" height="34" fill="#fff"/>
${ikon ? `<rect x="${x + 10}" y="${y + 6}" width="22" height="22" rx="6" fill="${farve}"/>${tekst(x + 21, y + 22, ikon, { s: 12, f: "#fff" })}` : ""}
${tekst(x + (ikon ? 42 : 14), y + 22, t, { s: 13, a: "start" })}${ekstra}${pil ? tekst(x + b - 14, y + 22, "›", { s: 16, f: "#c4c4c7" }) : ""}
<line x1="${x + (ikon ? 42 : 14)}" y1="${y + 34}" x2="${x + b}" y2="${y + 34}" stroke="#e5e5ea"/>`;
const sidebjælke = (valgt) => `<rect x="14" y="14" width="196" height="${H - 28}" fill="#f2f2f7"/>
${tekst(28, 46, "Indstillinger", { s: 20, v: 800, a: "start" })}<rect x="26" y="56" width="172" height="22" rx="8" fill="#e4e4e9"/>${tekst(40, 71, "🔍 Søg", { s: 11, f: "#8e8e93", a: "start" })}
${valgt}`;

const BILLEDER = {
  tillad: vært => skærm(safari(vært) + dæmp + dialog(["*Dette websted forsøger at hente en", "*konfigurationsprofil.", "Vil du tillade dette?"], ["Ignorer", "Tillad"], 1)),
  hentet: vært => skærm(safari(vært) + dæmp + dialog(["*Profil hentet", "Gennemgå profilen i appen Indstillinger,", "hvis du vil installere den."], ["Luk"], 0)),
  indstillinger: () => skærm(sidebjælke(`
    <rect x="26" y="88" width="172" height="50" rx="10" fill="#fff"/><circle cx="50" cy="113" r="16" fill="#c7c7cc"/>${tekst(50, 118, "🙂", { s: 14 })}
    ${tekst(74, 110, "Dit navn", { s: 13, v: 700, a: "start" })}${tekst(74, 126, "Apple-konto, iCloud …", { s: 10, f: "#8e8e93", a: "start" })}
    <rect x="26" y="146" width="172" height="36" rx="10" fill="#fff"/>${tekst(40, 169, "Profil hentet", { s: 13, v: 600, a: "start" })}
    <circle cx="170" cy="164" r="9" fill="#ff3b30"/>${tekst(170, 168, "1", { s: 10, f: "#fff", v: 700 })}${tekst(188, 169, "›", { s: 15, f: "#c4c4c7" })}
    <rect x="26" y="192" width="172" height="102" rx="10" fill="#fff"/>
    ${[["✈", "#ff9500", "Flytilstand"], ["≋", "#0a7aff", "Wi-Fi"], ["ᛒ", "#0a7aff", "Bluetooth"]].map(([i, f, t], n) =>
      `<rect x="36" y="${200 + n * 32}" width="20" height="20" rx="5" fill="${f}"/>${tekst(46, 214 + n * 32, i, { s: 11, f: "#fff" })}${tekst(66, 215 + n * 32, t, { s: 12, a: "start" })}`).join("")}
    ${peg(110, 164, 30)}`) + `<rect x="210" y="14" width="${B - 224}" height="${H - 28}" fill="#f2f2f7"/>${tekst(358, 176, "Tryk på “Profil hentet” til venstre", { s: 12, f: "#8e8e93" })}`, "#f2f2f7"),
  installer: () => skærm(`<rect x="14" y="14" width="${B - 28}" height="${H - 28}" fill="#e5e5ea"/>` + dæmp + `
    <rect x="95" y="34" width="330" height="272" rx="16" fill="#f2f2f7"/>
    ${tekst(118, 64, "Annuller", { s: 13, f: "#0a7aff", a: "start" })}${tekst(260, 64, "Installer profil", { s: 14, v: 700 })}${tekst(402, 64, "Installer", { s: 13, f: "#0a7aff", v: 700, a: "end" })}
    <rect x="115" y="86" width="290" height="126" rx="12" fill="#fff"/><rect x="129" y="100" width="44" height="44" rx="10" fill="#8e8e93"/>${tekst(151, 130, "⚙", { s: 24, f: "#fff" })}
    ${tekst(185, 118, "Broekraft Server hjemme", { s: 14, v: 700, a: "start" })}${tekst(185, 136, "Broekraft Server hjemme", { s: 11, f: "#8e8e93", a: "start" })}
    ${tekst(129, 168, "Underskrevet af", { s: 11, f: "#8e8e93", a: "start" })}${tekst(230, 168, "Ikke bekræftet", { s: 11, f: "#ff3b30", a: "start" })}
    ${tekst(129, 188, "Indeholder", { s: 11, f: "#8e8e93", a: "start" })}${tekst(230, 188, "Certifikat", { s: 11, a: "start" })}
    ${tekst(129, 238, "Flere oplysninger", { s: 12, f: "#0a7aff", a: "start" })}
    ${peg(378, 60, 30)}`),
  om: () => skærm(sidebjælke(`<rect x="26" y="90" width="172" height="34" rx="9" fill="#0a7aff"/>${tekst(40, 112, "⚙  Generelt", { s: 13, f: "#fff", v: 600, a: "start" })}`) + `
    <rect x="210" y="14" width="${B - 224}" height="${H - 28}" fill="#f2f2f7"/>${tekst(230, 46, "‹ Generelt", { s: 12, f: "#0a7aff", a: "start" })}${tekst(358, 46, "Om", { s: 15, v: 700 })}
    <rect x="226" y="62" width="264" height="${5 * 34}" rx="10" fill="#fff"/>
    ${["Navn", "iPadOS-version", "Modelnavn", "…", "Certifikattillid"].map((t, n) => række(226, 62 + n * 34, 264, "", "", t, { pil: n !== 3 })).join("")}
    ${tekst(358, 262, "Rul helt ned — punktet står nederst", { s: 11, f: "#8e8e93" })}
    ${peg(300, 62 + 4 * 34 + 17, 26)}`, "#f2f2f7"),
  tillid: () => skærm(sidebjælke(`<rect x="26" y="90" width="172" height="34" rx="9" fill="#0a7aff"/>${tekst(40, 112, "⚙  Generelt", { s: 13, f: "#fff", v: 600, a: "start" })}`) + `
    <rect x="210" y="14" width="${B - 224}" height="${H - 28}" fill="#f2f2f7"/>${tekst(230, 46, "‹ Om", { s: 12, f: "#0a7aff", a: "start" })}${tekst(358, 46, "Certifikattillid", { s: 15, v: 700 })}
    ${tekst(230, 84, "Version af tillidslager: …", { s: 10, f: "#8e8e93", a: "start" })}
    ${tekst(230, 124, "SLÅ FULD TILLID TIL RODCERTIFIKATER TIL", { s: 10, f: "#8e8e93", a: "start" })}
    <rect x="226" y="132" width="264" height="40" rx="10" fill="#fff"/>${tekst(240, 157, "Broekraft Server hjemme", { s: 13, a: "start" })}
    <rect x="428" y="140" width="48" height="26" rx="13" fill="#34c759"/><circle cx="463" cy="153" r="11" fill="#fff"/>
    ${peg(452, 153, 30)}`, "#f2f2f7"),
  fortsæt: () => skærm(`<rect x="14" y="14" width="${B - 28}" height="${H - 28}" fill="#f2f2f7"/>` + dæmp + dialog(["*Rodcertifikat", "Hvis du slår dette certifikat til for", "websteder, kan tredjeparter …"], ["Annuller", "Fortsæt"], 1)),
  mikrofon: vært => skærm(`<rect x="14" y="14" width="${B - 28}" height="170" fill="#8ec9ff"/><rect x="14" y="184" width="${B - 28}" height="142" fill="#5fb33a"/>
    ${[40, 120, 330, 420].map((x, i) => `<rect x="${x}" y="${150 - i % 2 * 34}" width="34" height="34" fill="#8b5a2b"/><rect x="${x}" y="${116 - i % 2 * 34}" width="34" height="34" fill="#3f9b35"/>`).join("")}` + dæmp +
    dialog([`*“${vært}” vil gerne bruge`, "*mikrofonen"], ["Tillad ikke", "Tillad"], 1)),
};

// ---------- Selve siden ----------
export function certifikatSide({ spilUrl, aftryk, navn, vært }) {
  const trin = (nr, titel, tekstHtml, billede = "") => `<li class="trin"><div class="nr">${nr}</div><div class="indhold"><h3>${titel}</h3>${tekstHtml}${billede}</div></li>`;
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gør tabletten klar til mikrofon · Broekraft</title><link rel="icon" href="/icon-192.png">
<style>
  :root { --græs: #5fb33a; --jord: #8b5a2b; --tekst: #1f2a30; --svag: #5d6b72; --kant: #d7e2e8; --blå: #0a7aff; --orange: #ff8a00;
    font: 18px/1.5 ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--tekst); background: #eef4f7; }
  * { box-sizing: border-box; } body { margin: 0; }
  header { background: linear-gradient(180deg, #4a9df5, #cde8ff); border-bottom: 12px solid var(--græs); box-shadow: 0 8px 0 var(--jord); padding: 22px 18px 18px; margin-bottom: 30px; }
  header .indre, main { max-width: 820px; margin: auto; }
  h1 { margin: 0; font-size: clamp(26px, 5vw, 38px); font-weight: 900; color: #fff; text-shadow: 2px 3px 0 #2b2b2b; }
  header p { margin: 6px 0 0; font-weight: 700; color: #123; }
  main { padding: 0 16px 60px; }
  .kort { background: #fff; border: 1px solid var(--kant); border-radius: 18px; padding: 20px 22px; margin: 0 0 22px; box-shadow: 0 6px 18px rgba(20,40,60,.06); }
  h2 { margin: 0 0 12px; font-size: 24px; } h3 { margin: 2px 0 6px; font-size: 21px; }
  .status { display: flex; gap: 14px; align-items: center; font-weight: 800; font-size: 20px; }
  .status .ikon { font-size: 40px; line-height: 1; }
  .status.venter { background: #fff7d6; border-color: #f0d77a; } .status.klar { background: #e7f8df; border-color: #8fd46b; }
  .knap { display: inline-block; margin: 10px 0 4px; padding: 16px 26px; border-radius: 14px; background: var(--græs); color: #fff; font-weight: 900; font-size: 21px;
    text-decoration: none; border: 0; box-shadow: 0 5px 0 #3f8a25; font-family: inherit; cursor: pointer; }
  .knap:active { transform: translateY(3px); box-shadow: 0 2px 0 #3f8a25; } .knap.blå { background: var(--blå); box-shadow: 0 5px 0 #0656b0; }
  .knap.lille { font-size: 16px; padding: 10px 16px; }
  .faner { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .faner button { font: inherit; font-weight: 800; font-size: 16px; padding: 10px 16px; border-radius: 12px; border: 2px solid var(--kant); background: #fff; cursor: pointer; }
  .faner button[aria-selected="true"] { background: var(--blå); border-color: var(--blå); color: #fff; }
  .vejledning[hidden] { display: none; }
  ol.trinliste { list-style: none; padding: 0; margin: 0; }
  .trin { display: flex; gap: 14px; padding: 18px 0; border-top: 1px solid var(--kant); } .trin:first-child { border-top: 0; }
  .nr { flex: 0 0 44px; height: 44px; border-radius: 50%; background: var(--orange); color: #fff; font-weight: 900; font-size: 22px; display: grid; place-items: center; }
  .indhold { flex: 1; min-width: 0; } .indhold p { margin: 6px 0; } .indhold ul { margin: 6px 0; padding-left: 22px; }
  .billede { display: block; width: 100%; max-width: 520px; height: auto; margin: 12px 0 4px; border-radius: 26px; box-shadow: 0 8px 20px rgba(0,0,0,.15); font-family: -apple-system, system-ui, sans-serif; }
  .ring { animation: puls 1.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  .finger { animation: tryk 1.1s ease-in-out infinite; }
  @keyframes puls { 50% { transform: scale(1.18); opacity: .55; } }
  @keyframes tryk { 50% { transform: translateY(-6px); } }
  .sti { display: inline-block; background: #f1f4f6; border-radius: 8px; padding: 2px 8px; font-weight: 800; }
  .advarsel { background: #ffe9e6; border: 2px solid #ff8a7a; border-radius: 14px; padding: 14px 16px; margin: 0 0 16px; font-weight: 700; }
  .advarsel[hidden] { display: none; }
  .advarsel input { width: 100%; font: inherit; font-size: 16px; padding: 10px; margin: 8px 0; border: 2px solid var(--kant); border-radius: 10px; }
  .tip { background: #eef6ff; border-radius: 12px; padding: 10px 14px; margin: 10px 0; font-size: 16px; }
  details { border-top: 1px solid var(--kant); padding: 12px 0; } details:first-of-type { border-top: 0; }
  summary { font-weight: 800; cursor: pointer; font-size: 18px; } details p, details ul { font-size: 16px; color: #333; }
  .aftryk { font-family: ui-monospace, Menlo, monospace; font-size: 13px; overflow-wrap: anywhere; background: #f1f4f6; padding: 8px 10px; border-radius: 8px; }
  .svag { color: var(--svag); font-size: 16px; }
</style></head>
<body>
<header><div class="indre"><h1>🎤 Gør tabletten klar til walkie-talkie</h1>
<p>Det tager ca. 2 minutter og skal kun gøres én gang på hver tablet. En voksen følger trinene i rækkefølge.</p></div></header>
<main>

<section class="kort status venter" id="status" aria-live="polite"><span class="ikon" id="statusIkon">⏳</span>
<div><div id="statusTekst">Tjekker, om tabletten allerede er klar …</div><div id="statusKnap"></div></div></section>

<section class="kort">
  <h2>Hvorfor skal det gøres?</h2>
  <p>iPads og andre tablets giver kun hjemmesider lov til at bruge mikrofonen, hvis forbindelsen er <b>sikker</b>.
  Familiens computer laver sin egen sikre forbindelse, men tabletten skal først have at vide, at den må stole på den.
  Det er det, I gør her. Intet sendes ud på internettet, og der optages eller gemmes ingen lyd.</p>
</section>

<section class="kort">
  <div class="faner" role="tablist">
    <button role="tab" data-fane="ipad" aria-selected="true">📱 iPad / iPhone</button>
    <button role="tab" data-fane="android" aria-selected="false">🤖 Android-tablet</button>
    <button role="tab" data-fane="computer" aria-selected="false">💻 Computer</button>
  </div>

  <div class="vejledning" data-vejledning="ipad">
    <div class="advarsel" id="ikkeSafari" hidden>⚠️ <b>Du er ikke i Safari.</b> Profilen kan kun installeres fra Safari — ikke fra Chrome og ikke fra
      Børnespil-ikonet på hjemmeskærmen. Kopiér adressen herunder, åbn <b>Safari</b>, og indsæt den i adresselinjen:
      <input id="adresse" readonly value=""><button class="knap lille blå" id="kopiér" type="button">📋 Kopiér adressen</button></div>
    <ol class="trinliste">
      ${trin(1, "Hent profilen", `<p>Tryk på den grønne knap. iPad'en spørger, om hjemmesiden må hente en profil — tryk <b>Tillad</b>.</p>
        <a class="knap" href="/certifikat/broekraft.mobileconfig">⬇️ Hent profilen</a>`, BILLEDER.tillad(vært))}
      ${trin(2, "Luk beskeden", `<p>Der står nu <b>“Profil hentet”</b>. Tryk <b>Luk</b>. Profilen ligger nu og venter i Indstillinger.</p>
        <div class="tip">⏱️ Installér den inden for <b>8 minutter</b> — ellers forsvinder den, og du skal trykke “Hent profilen” igen.</div>`, BILLEDER.hentet(vært))}
      ${trin(3, "Åbn Indstillinger → Profil hentet", `<p>Gå ud af Safari, og åbn appen <b>Indstillinger</b> ⚙️. Øverst, lige under dit navn, står <b>Profil hentet</b>. Tryk på den.</p>
        <div class="tip">Kan du ikke se den? Gå til <span class="sti">Generelt</span> → <span class="sti">VPN og enhedsadministration</span> → tryk på <b>Broekraft Server hjemme</b> under “Hentet profil”.</div>`, BILLEDER.indstillinger())}
      ${trin(4, "Installer profilen", `<ul><li>Tryk <b>Installer</b> øverst til højre.</li><li>Skriv tablettens <b>adgangskode</b> (den, du låser iPad'en op med).</li>
        <li>Der kommer en advarsel — tryk <b>Installer</b> øverst til højre igen, og bekræft med <b>Installer</b>.</li><li>Tryk til sidst <b>Udført</b>.</li></ul>
        <p class="svag">“Ikke bekræftet” er helt normalt: certifikatet er lavet af jeres egen computer og ikke af et firma.</p>`, BILLEDER.installer())}
      ${trin(5, "Find Certifikattillid", `<p>Gå til <span class="sti">Indstillinger</span> → <span class="sti">Generelt</span> → <span class="sti">Om</span>, og rul <b>helt ned i bunden</b>.
        Tryk på <b>Certifikattillid</b> (hedder på nogle iPads “Indstillinger for certifikattillid”).</p>`, BILLEDER.om())}
      ${trin(6, "Slå tillid til", `<p>Slå kontakten ved <b>Broekraft Server hjemme</b> til, så den bliver grøn.</p>`, BILLEDER.tillid())}
      ${trin(7, "Bekræft med Fortsæt", `<p>iPad'en viser en advarsel om rodcertifikater. Tryk <b>Fortsæt</b>. Det er sikkert, fordi certifikatet kommer fra jeres egen computer.</p>`, BILLEDER.fortsæt())}
      ${trin(8, "Tjek og åbn Broekraft", `<p>Gå tilbage til Safari og denne side. Boksen øverst bliver <b>grøn ✅</b>, når alt er i orden. Tryk så på <b>Åbn Broekraft</b>.</p>
        <p><b>Læg Broekraft på hjemmeskærmen:</b> tryk på Del-knappen <b>⬆️</b> i Safari → <b>Føj til hjemmeskærm</b>.
        Har I et gammelt Broekraft-ikon fra før, så slet det og brug det nye — kun det nye kan bruge mikrofonen.</p>`)}
      ${trin(9, "Første gang barnet trykker på 🎤", `<p>I spillet spørger iPad'en én gang, om Broekraft må bruge mikrofonen. Tryk <b>Tillad</b>.</p>
        <p class="svag">Husk også: en voksen skal sætte flueben i <b>🎤 Må tale sammen</b> ved verdenen i kontrolpanelet på computeren.</p>`, BILLEDER.mikrofon(vært))}
    </ol>
  </div>

  <div class="vejledning" data-vejledning="android" hidden>
    <ol class="trinliste">
      ${trin(1, "Hent certifikatet", `<p>Tryk på knappen. Filen <b>Broekraft-hjemme.crt</b> gemmes i Overførsler.</p><a class="knap" href="/certifikat/broekraft.crt">⬇️ Hent certifikatet</a>`)}
      ${trin(2, "Installer det som CA-certifikat", `<p>Åbn <b>Indstillinger</b>, og søg efter <b>certifikat</b> 🔍. Vælg <b>Installer certifikater</b> (eller “Installer fra enhedslager”) → <b>CA-certifikat</b> → <b>Installer alligevel</b>, og vælg filen <b>Broekraft-hjemme.crt</b>.</p>
        <div class="tip">Menuerne hedder lidt forskelligt fra mærke til mærke. Typisk: <span class="sti">Sikkerhed og privatliv</span> → <span class="sti">Flere sikkerhedsindstillinger</span> → <span class="sti">Kryptering og loginoplysninger</span> → <span class="sti">Installer et certifikat</span>. Tabletten kan bede om sin PIN-kode.</div>`)}
      ${trin(3, "Tjek og åbn Broekraft", `<p>Kom tilbage til denne side i <b>Chrome</b>. Boksen øverst bliver grøn ✅, når alt er i orden.</p>`)}
    </ol>
  </div>

  <div class="vejledning" data-vejledning="computer" hidden>
    <ol class="trinliste">
      ${trin(1, "Hent certifikatet", `<a class="knap" href="/certifikat/broekraft.crt">⬇️ Hent certifikatet</a>`)}
      ${trin(2, "Windows", `<p>Åbn filen → <b>Installer certifikat</b> → <b>Aktuel bruger</b> → <b>Placér alle certifikater i følgende lager</b> → <b>Gennemse</b> → <b>Rodnøglecentre, der er tillid til</b> → Næste → Udfør → Ja. Genstart browseren.</p>`)}
      ${trin(3, "Mac", `<p>Dobbeltklik på filen, så den åbner i <b>Nøglering</b>. Dobbeltklik på <b>Broekraft Server hjemme</b> → <b>Tillid</b> → sæt “Ved brug af dette certifikat” til <b>Altid godkend</b>. Luk vinduet og skriv din adgangskode.</p>`)}
    </ol>
  </div>
</section>

<section class="kort">
  <h2>🛟 Hvis det driller</h2>
  <details><summary>Der sker ikke noget, når jeg trykker “Hent profilen”</summary>
    <p>Siden skal være åbnet i <b>Safari</b>. I Chrome, i en QR-app eller fra Børnespil-ikonet på hjemmeskærmen kan profilen ikke hentes. Åbn Safari og skriv adressen: <b>http://${esc(vært)}:8080/certifikat</b></p></details>
  <details><summary>“Profil hentet” er væk fra Indstillinger</summary>
    <p>En hentet profil forsvinder efter ca. 8 minutter. Tryk “Hent profilen” igen, og installer den med det samme.</p></details>
  <details><summary>Jeg kan ikke finde “Certifikattillid”</summary>
    <p>Punktet dukker først op, når profilen er installeret (trin 4). Det står <b>helt nederst</b> i Generelt → Om.</p></details>
  <details><summary>Safari siger stadig “Forbindelsen er ikke privat”</summary>
    <ul><li>Tjek, at kontakten i trin 6 er grøn.</li><li>Luk Safari helt (stryg den væk) og åbn den igen.</li>
    <li>Har computeren fået ny adresse (fx efter genstart af routeren)? Genstart Broekraft Server og scan QR-koden igen — tabletten skal ikke gøres klar igen.</li></ul></details>
  <details><summary>Mikrofonknappen 🎤 vises ikke i spillet</summary>
    <ul><li>En voksen skal sætte flueben i <b>🎤 Må tale sammen</b> ved verdenen i kontrolpanelet.</li>
    <li>Adressen i Safari skal begynde med <b>https://</b> og slutte med <b>:8443</b>. Brug knappen “Åbn Broekraft” her eller den nye QR-kode.</li></ul></details>
  <details><summary>iPad'en spurgte ikke om mikrofonen, eller jeg trykkede “Tillad ikke”</summary>
    <p>Tryk på <b>aA</b> i Safaris adresselinje → <b>Indstillinger for websted</b> → <b>Mikrofon</b> → <b>Tillad</b>.</p></details>
  <details><summary>Sådan fjerner man det igen</summary>
    <p>Indstillinger → Generelt → VPN og enhedsadministration → <b>Broekraft Server hjemme</b> → <b>Fjern profil</b>.</p></details>
</section>

<section class="kort">
  <h2>🔐 Er det jeres eget certifikat?</h2>
  <p class="svag">Et certifikat, man stoler på, kan godkende sikre forbindelser på tabletten. Installér derfor kun det, der kommer fra jeres egen computer.
  Vil du være helt sikker, så sammenlign dette aftryk med det, der står i kontrolpanelet på computeren:</p>
  <div class="aftryk">${esc(aftryk)}</div>
</section>
</main>

<script>
(() => {
  const spil = ${JSON.stringify(spilUrl)}, side = location.href.split("#")[0];
  const $ = id => document.getElementById(id);
  // Vis den vejledning, der passer til enheden (man kan selv skifte med fanerne)
  const ua = navigator.userAgent, ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  function visFane(navn) {
    document.querySelectorAll("[data-fane]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.fane === navn)));
    document.querySelectorAll("[data-vejledning]").forEach(v => { v.hidden = v.dataset.vejledning !== navn; });
  }
  document.querySelectorAll("[data-fane]").forEach(b => b.addEventListener("click", () => visFane(b.dataset.fane)));
  visFane(ios ? "ipad" : android ? "android" : "computer");
  // Advarsel, hvis siden ikke er åbnet i Safari på iPad/iPhone
  if (ios && (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\\//.test(ua) || navigator.standalone === true)) $("ikkeSafari").hidden = false;
  $("adresse").value = side;
  $("kopiér").addEventListener("click", () => {
    const f = $("adresse"); f.focus(); f.select(); f.setSelectionRange(0, 999);
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
    $("kopiér").textContent = ok ? "✅ Kopieret — åbn Safari og indsæt" : "Markér adressen og kopiér den";
  });
  // Er tabletten klar? En sikker forbindelse til spillet lykkes kun, når certifikatet er godkendt.
  let klar = false;
  async function tjek() {
    try { await fetch(spil + "?tjek=" + Date.now(), { mode: "no-cors", cache: "no-store" }); vis(true); }
    catch (_) { vis(false); }
    if (!klar) setTimeout(tjek, 3000);
  }
  function vis(ok) {
    klar = ok;
    $("status").className = "kort status " + (ok ? "klar" : "venter");
    $("statusIkon").textContent = ok ? "✅" : "⏳";
    $("statusTekst").textContent = ok ? "Tabletten er klar til walkie-talkie!" : "Tabletten er ikke klar endnu. Følg trinene herunder — boksen bliver grøn af sig selv.";
    $("statusKnap").innerHTML = ok ? '<a class="knap" href="' + spil + '">▶ Åbn Broekraft</a>' : "";
  }
  tjek();
})();
</script>
</body></html>`;
}
