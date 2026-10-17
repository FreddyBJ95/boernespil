# Brudpunkt – selvstændigt Codex-spil til Spilkassen

17. oktober 2026 · gren `codex/brudpunkt`.

Ejeren bad udtrykkeligt om Codex' eget spil. Brudpunkt har egen spilverden, originale Blender-modeller,
egen brugerflade og eget destruktionssystem. De 27 CC0-lydklip er genbrugt med verificerede kilder i
`spil/brudpunkt/LYD-KILDER.md`. Rapier er et almindeligt tredjepartsbibliotek fra den officielle npm-pakke;
dens originale bytes, version og Apache-2.0-licens er medtaget under `rapier/`.

## Første spilbare version

- Ét industrielt prøvefelt med værksted, kran, containere, hegn og klippekanter.
- Servicebil, værkstedshus, vandtårn og fiktive energiceller. Modellerne har 80 selvstændige fysikdele,
  53.183 trekanter og indbygget geometri. GLB-filen fylder cirka 3 MB. Blender-kilde og byggescript følger med.
- Placering, finger-/musedrag, drejning, højde, kopiering, sletning og automatisk gemt opstilling.
- Støttegrupper kan frigives som hele legemer, vælte og derefter brydes ved nedslag.
  En tung del kan ramme et andet objekt eller udløse en energicelle uden for den oprindelige puls.
- Kun første celle starter af sig selv. De andre skal nås fysisk eller af en puls og bruger egen forsinkelse.
- Materialelyd, afstandsdæmpning, rumklang, støv, gnister, splinter og synlige trykringe.
- Et tæt kamera får kosmetiske glasrevner, støv og rystelse. **Nyt objektiv** reparerer glasset.
  Rolige kameraeffekter kan vælges under hjælp, også via mobilens værktøjspanel.
- Slowmotion, overblik, objektfølge, nærkamera, resultater med sammenligning mod sidste forsøg samt replay.
- Nulstilling genskaber hele opstillingen. Skjult fane og hjælp pauser forsøget/replay.

Spillet ligger i voksenrummet og anvender den eksisterende voksenlås. Ingen App Store/Google Play,
konti, køb eller eksterne grafiktjenester er nødvendige.

## Filer og aftaler

`spil.js` ejer spilforløb og Three-scenen; `kamera.js` ejer touch og kameragreb; `simulering.js`
ejer Rapier, støttegrap og hændelser. `effekter.js` og `lyd.js` følger de samme faktiske hændelser.
`opsaetning.js` validerer gemninger. Alle opskrifter ligger i `modeller/opskrifter.json`.

Hver modeldel har navnet `TYPE__ID`, og dens centrum matcher fysikopskriften i Three-koordinater.
Delnavne og opskrifter skal derfor ændres sammen. Fysikken bruger fiktive spiltal og effektstyrke 1–5.
Der er højst 18 objekter, otte celler og 420 fysikdele. Hændelseskø, kontaktcache, partikler,
samtidige lyde og replay er begrænset. Den detaljerede geometri deles mellem kloner.

Gemninger hedder `brudpunkt-opstilling-v1` og `brudpunkt-valg-v1`. De indeholder kun egne opstillinger
og komfortvalg på enheden. Voksenlåsen og Brøkrafts verdener har deres eksisterende formater.

Forsiden har ét nyt kort. Offline-cache v75 indeholder alle runtimefiler. Familieserverens `.mjs`-MIME
er tilføjet, så den indbyggede fysikmotor kan leveres. Pakke- og byggeprøver inkluderer nu Brudpunkt.
Serverens planlagte udgave er fortsat 0.6.0; tagget oprettes først efter ejerens fletning og godkendelse.

## Afprøvning og begrænsninger

Automatiske prøver bruger faktisk Rapier-WASM, Three og de originale GLB-modeller. Integrationstesten
`server/tests/brudpunkt-ui_test.js` kører faktisk `spil.js` med isolerede test-erstatninger for GPU,
adgangslås og lydsideeffekter. Den bruger ingen rigtig browserlagring eller voksenkode.

Browserens særskilte komponentvisning har vist en fysisk kæde med tre pulser, 82 løsrevne dele,
revnet objektiv og efterfølgende nulstilling uden grafikfejl. Geometritallet forblev 286 efter nulstilling.
Dette er en desktopprøve, ikke en måling på en fysisk tablet.

Den normale spilmenu er endnu ikke manuelt gennemspillet i browseren. Den lokale prøveside beder om
at oprette en voksenkode; ejeren er bedt om selv at gøre det. Ingen eksisterende kode er læst,
ændret eller omgået. Fysisk iPad/Android og Mac er ikke afprøvet.

Kør `deno run --allow-read --allow-write --allow-env --allow-net server/tests/brudpunkt-browser.js`
fra repoets rod for en særskilt lokal testserver. Spillet er på `http://127.0.0.1:18123/spil/brudpunkt/`;
`/proeve-brudpunkt` er kun en teknisk komponentvisning med egne testknapper. Den rute findes ikke på produktionsserveren.

De videre faser fra projektbeskrivelsen – flere miljøer, challenge/karriere og videoeksport – er fremtidige udvidelser.
