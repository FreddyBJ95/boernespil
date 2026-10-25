# Skrot & Brag

Et selvstændigt bilbygge- og nedrivningsspil, bygget efter ejerens bestilling den 25. oktober 2026.
Arbejdsgang: vælg hjul, motor, front og last i garagen, kør mod dominoer og højhuse, og byg om efter forsøget.
Der er fire baner med 9–18 etager, to baner med tvillingetårne og én rampebane.

## Styring

- Hold KØR / højrepil / D nede for at køre; BAK / venstrepil / A bakker.
- Hold BOOST / mellemrum nede for at bruge den begrænsede raketkraft. Raketmotoren giver stærkere boost.
- Nyt forsøg / R nulstiller banen og lasten. Byg om vender tilbage til garagen.
- Pause / P / Escape fryser også lyd og kædereaktioner. Skjult fane og mistet fokus pauser automatisk.
- Overblik viser højhusene. Ellers følger kameraet bilen og derefter de seneste brag.
- Rolige effekter fjerner kamerarystelser og reducerer gnister. Enhedens valg af reduceret bevægelse respekteres fra start.
- Lyden kan slås fra. Bilen og banerekorder gemmes lokalt under `skrot-og-brag-v1`.

## Last og kæder

Lasten sidder på bilen med brudbare beslag og antændes ved et hårdt anslag mod mål eller ved direkte fysisk påvirkning.
En rampe i sig selv udløser ikke chassisets last. En løs tønde kan stadig eksplodere, når den lander hårdt.

- Benzin: orange ild og røg, langsommere antændelse af naboceller.
- Gas: grøn ildsky med voksende rækkevidde, der kan antænde andre celler.
- TNT: den kraftigste direkte impuls mod fundament og fuger.
- Blå puls: bred trykring, som slynger vragdele udad.
- Lilla hvirvel: indadrettet impuls efterfulgt af et udadrettet efterslag.

Der bruges kun fiktive spiltal. Ingen celle springer alene på grund af banens alder. Hver celle kan kun springe én gang.
Dominoer og bygningsdele har egne fysiske legemer; etager hænger sammen med brudbare fuger.
Fuger reagerer på bevægelige sammenstød, ikke på husets almindelige statiske vægt.
Vælteprocenten måler faktisk forskydning eller drejning af bygningsdele, ikke bare antallet af eksplosioner.

## Grafik, lyd og afhængigheder

Originale, kodebyggede lavpolygonmodeller; ingen nye Blender- eller billedtjenesteafhængigheder.
Three importeres lokalt fra `../3d-faelles/three.module.js`; MIT-licensen ligger ved biblioteket.
Fysikken bruger repoets originale Rapier 0.21.0 under `../brudpunkt/rapier/`, inklusive Apache-2.0-licens og proveniens.
Bilens hjul er kollisionsformer på samme stive aksel: radius, greb og restitution påvirker kørslen;
den synlige hjulrotation følger tilbagelagt afstand. Der er ikke en separat affjedringssimulering.

De otte eksisterende CC0-klip `stor`, `tnt`, `gas`, `metal`, `beton`, `brokker`, `glas` og `trae_knaek`
læses fra `../brudpunkt/lyde/`. Kilder og licenser følger `../brudpunkt/LYD-KILDER.md`.
En egen Web Audio-motor blander dem med motorlyd, lavfrekvent slag, farvede energitoner, filtreret støj,
afstand, stereo og et kort dæmpet ekko. En fælles kompressor begrænser samtidige brag.
Lyd åbnes ved brugertryk for Safari. Manglende lydfiler stopper ikke spillet; syntetiske effekter virker stadig.

Højst 260 effektobjekter og 22 kortvarige lydstemmer. Fysik bruger faste 60 Hz-trin og højst fem indhentningstrin.
Partikelmaterialer afkobles efter brug, og hver nulstilling frigiver den tidligere Rapier-verden.
Spillet deler kun biblioteker og lydfiler med eksisterende spil; deres spilkode ændres ikke.

## Prøver

`node --test spil/skrot-og-brag/fysik.test.mjs`

Seks prøver med rigtig Rapier-WASM: hvilende højhuse og last på alle fire baner, en kørt kædereaktion,
fysisk dominooverførsel, pulsens rækkevidde, lilla efterslag og variation mellem bilkonstruktioner.

Start lokal visning: `node spil/skrot-og-brag/proeve-server.mjs`

Åbn `http://127.0.0.1:18124/spil/skrot-og-brag/`.
Med Playwright installeret (eventuelt gennem NODE_PATH): `node --test spil/skrot-og-brag/browser.test.cjs`.
Prøven bruger installeret Edge; `BROWSER_CHANNEL=chrome` kan vælge Chrome.
Browserprøverne dækker kørsel, lastvalg, plov, gemning, lydhentning og AudioContext-pause,
genstart, fokus-tab, telefonlayout og to samtidige fingre på gas og boost.

Afprøvet i rigtig Edge med WebGL på denne Windows-maskine og i emuleret telefonvisning.
Fysisk iPad/Safari er ikke afprøvet. De optagede lydfiler er hentet i browserprøven;
lydmixet er ikke lyttet igennem på en fysisk tablet.

Forsiden har ét nyt kort. Offline-cache v82 inkluderer alle nye runtimefiler;
de delte biblioteker og lydklip er allerede i cachen. Intet er udgivet eller pushet til main.
