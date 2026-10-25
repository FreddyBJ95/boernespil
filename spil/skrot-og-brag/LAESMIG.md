# Skrot & Brag

Byg en legetøjsbil i værkstedet, og kør den direkte ind i et hus, et klodsbjerg, et regnbuetårn,
et slot eller et højhus efter et stort hop. Spillet er lavet til børn på 3–6 år: alle valg er tegninger,
og ingen tekst skal kunne læses for at spille.

Codex lavede den første udgave (bilbygning, Rapier-fysik og kædereaktioner). Claude har bagefter
tegnet hele spillet om efter ejerens ønske: solskin og legetøjsfarver i stedet for den mørke by,
store billedknapper, et dyr bag rattet og nye mål uden dominoer.

## Sådan spiller man

- **Værkstedet:** seks faner med tegninger: hjul, motor, front, last, fører og farve. Et tryk skifter delen
  på bilen med det samme. Under lasten vælges også 1, 2 eller 3 tønder.
- **Banerne:** fem små billeder viser målet og de stjerner, man har fået. Den store grønne knap kører.
- **Kørsel:** hold den grønne ▶ nede for at køre (→ eller D), ◀ bakker (← eller A), 🚀 giver raketfart
  (mellemrum), og 📯 dytter (H). Ringen om raketten viser, hvor meget raketfart der er tilbage.
- Måleren øverst fyldes, efterhånden som målet vælter, og tre stjerner tændes undervejs med en klokke.
- Resultatet kommer, når alt er faldet til ro: 🔁 prøv igen, ▶ næste bane og 🔧 værkstedet.
- ⏸ / P / Escape holder pause. Skjult fane og mistet fokus pauser automatisk.
- 🐢 slår rolige effekter til (ingen rystelser, færre puffer). Enhedens valg af reduceret bevægelse respekteres.
- 🔊 slår lyden fra. Bilen, banen og stjernerne gemmes lokalt under `skrot-og-brag-v2`.
  En bil fra den første udgave (`skrot-og-brag-v1`) bliver hentet med over.

## Banerne

| Bane | Mål | Stjerner ved |
| --- | --- | --- |
| Det lille hus | Et gult hus med to etager, tag og en ildtønde i stuen | 30 / 60 / 85 % |
| Klodsbjerget | En pyramide af 21 løse legeklodser med en grøn tønde på toppen | 30 / 60 / 85 % |
| Regnbuetårnet | Tolv etager i regnbuens farver med tønder på hver tredje etage | 25 / 50 / 80 % |
| Slottet | To tårne med kegletage og flag og en mur af løse sten | 25 / 50 / 75 % |
| Det store hop | En rampe, et højhus og et lille hus bagved | 25 / 50 / 80 % |

Procenten måler, hvor mange bygningsdele der faktisk er flyttet eller drejet, ikke antallet af brag.

## Last

Lasten springer ved et hårdt sammenstød eller en direkte trykbølge. Hver tønde springer kun én gang.

- Ildtønder: ild og røg, langsom antændelse af naboer.
- Grøn sky: en voksende sky, der kan antænde andre tønder.
- Dynamit: det kraftigste slag mod fundamentet.
- Blå bølge: en bred trykring, der kaster delene udad.
- Lilla hvirvel: suger ind og slynger derefter ud.

## Fysik

Rapier 0.21.0 fra `../brudpunkt/rapier/` med licens og proveniens. Alt bevæger sig i køreplanet.

- **Drejning kun om z-aksen:** Rapiers låste drejeakser løber løbsk sammen med faste fuger
  (fx bilens front og lastens beslag). Derfor er drejningerne ikke låst. I stedet retter `iPlanet()`
  hver krop efter hvert trin, så den kun drejer om z-aksen.
- **Skrå dele** (tag, rampe, skovl) er trekanter med kroppen i tyngdepunktet og en lige kasses inerti.
  En skæv inerti fik før skovlen til at eksplodere, mens bilen holdt stille.
- **Motoren** trækker ved hjulene, så bilen ikke stejler. Bilen retter sig selv op, hvis den tipper mere end 30°.
- Huse er etager af to vægge og et gulv med brudbare fuger. Klodser og slotssten ligger løst.
- Faste 60 Hz-trin, højst fem indhentningstrin pr. billede. Hver nulstilling frigiver den gamle verden.

## Grafik og lyd

Alle modeller bygges i koden (`modeller.mjs`) af bløde, afrundede former. Hver fysikdel bliver til én
geometri med farverne lagt i hjørnerne, så en tablet kun tegner én ting pr. del. Geometrierne genbruges
mellem forsøg. Himlen og græssets mønster kommer fra `../3d-faelles/pynt.js`, og Three r160 importeres
lokalt fra `../3d-faelles/`. Tønderne har et tegn malet på et lærred i koden. Ingen billedfiler hentes
undtagen forsidebilledet, som er et skærmbillede fra spillet.

Braget er tegnet som tegneserie: runde røgpuffer, der vokser og skrumper væk, konfetti, en farvet
trykring og en BAM!/BOM!-boble ved sammenstødet. Højst 240 effektdele ad gangen.

Lyden blander de otte CC0-klip fra `../brudpunkt/lyde/` (kilder i `../brudpunkt/LYD-KILDER.md`)
med syntetisk motor, horn, stjerneklokker og en lille fanfare. Lyd åbnes ved første tryk, som Safari kræver.

## Prøver

```
node --test spil/skrot-og-brag/fysik.test.mjs
```

Otte prøver med rigtig Rapier: alle baner hviler, en tur ind i huset vælter det, en bil uden last kan skubbe
klodsbjerget ned, alle hjul og fronter kører roligt frem og over rampen, pulsens rækkevidde, lilla efterslag,
bildelenes fysik og stjernegrænserne.

```
NODE_PATH=<sti til playwright>/node_modules node --test spil/skrot-og-brag/browser.test.cjs
```

Browserprøven starter selv en lille server og bruger installeret Edge (`BROWSER_CHANNEL=chrome` vælger Chrome).
Den dækker valg af dele og bane, kørsel, stjerner, lydhentning og AudioContext-pause, pause og forfra,
fokus-tab, gemning, en hel tur til resultatet, telefonlayout og to fingre på gas og raket samtidig.

Lokal visning: `node spil/skrot-og-brag/proeve-server.mjs` og åbn `http://127.0.0.1:18124/spil/skrot-og-brag/`.

Afprøvet i Edge på Windows med rigtig WebGL i iPad- og telefonstørrelse.
Fysisk iPad/Safari er ikke afprøvet, og lyden er ikke lyttet igennem på en tablet.
Offline-cachen er v83 og indeholder alle spillets filer.
