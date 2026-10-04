# Overdragelse til Codex: spådamens stemme i Broekraft (opgave G)

Skrevet af Claude den 3. oktober 2026.

Arbejd på en ny gren **`codex/tale`** fra `main`, og lad ejeren flette. Push aldrig direkte til `main`.

## Hvad ejeren ønsker
> "jeg vil gerne bruge codex til at lave stemmerne i broekraft … så bruger vi lige spådamen til test"

I dag læser spådamen op med tablettens indbyggede stemme (`speechSynthesis` i `spil/broekraft/eventyr.js`).
Den lyder som en robot og er forskellig fra tablet til tablet. Spådamen skal i stedet have sin egen, rigtige
stemme: færdige lydfiler, som ligger i spillet og virker uden net.

Spådamen er **prøven**. Lyder hun godt, får de andre figurer stemmer på samme måde bagefter.
Det gælder fx købmanden og fortælleren ved stenene og føniksen.

## Arbejdsdeling
- **Codex:**
  - manuskriptet som data (`manus.json`)
  - et lille script, der laver lydfilerne
  - selve lydfilerne
  - kontrol af lyden
- **Claude:** afspilningen i spillet bagefter.
  - `sig()` i `eventyr.js` afspiller klippene efter hinanden.
  - Mangler en fil, eller fejler den, bruges tablettens stemme som før.
  - Lyden stopper, når panelet lukkes.
  - Claude lægger også filerne i `sw.js`.
- Codex må **ikke** ændre `eventyr.js`, `sten.js`, `spil.js`, `lyd.js` eller `sw.js`.

## Trin 1: tre prøvestemmer (ejeren vælger)
Før hele manuskriptet laves, laver du de tre klip `hej`, `opgave-snemand` og `guld-10` (se listen nedenfor)
med **tre forskellige stemmer eller stemmeinstruktioner**.

- Læg dem i `tale-proever/` i roden, fx `tale-proever/a-hej.mp3`. Commit dem ikke.
- Skriv kort til ejeren, hvad A, B og C er.
- Vent på, at ejeren vælger, før du går videre.

Vælg selv værktøjet. Et godt bud er OpenAI's tekst-til-tale med stemmeinstruktion (fx `gpt-4o-mini-tts`).
Hvis dansk lyder for udenlandsk, så foreslå et alternativ med en dansk neural stemme. Lad ejeren beslutte.

- API-nøglen læses fra en miljøvariabel. Den må **aldrig** ligge i repoet, i en fil eller i en commit.
- Opret ikke konti, og køb ikke noget uden at spørge ejeren først.

## Stemmen: sådan skal hun lyde
- En varm, venlig og lidt hemmelighedsfuld spåkone, som en sød bedstemor i et eventyr.
- Hun taler tydeligt rigsdansk, roligt og lidt langsomt, til børn på 3–6 år. Hun smiler i stemmen.
- Spørgsmål ("Kan du …?") lyder nysgerrige og indbydende, som en lille udfordring.
- "Godt klaret!" er glad og stolt, men ikke skrigende.
- **Aldrig uhyggelig:** ingen hæs heksestemme, ingen ekko- eller rumklang og ingen overdreven teaterstemme.
- Små pauser ved punktum og tankestreg.

## Trin 2: hele manuskriptet (41 klip)
Teksten skal siges **præcis** som skrevet, for børnene ser den samme tekst i spillets panel.
Nogle klip spilles efter hinanden. Fx siger hun `hej` og derefter `opgave-blomst`, og så skal det lyde
som én sætning.

### Når hun giver en opgave
| fil | hun siger |
|---|---|
| `hej` | Hej med dig! Jeg har en opgave til dig. |
| `i-gang` | Du er i gang med en opgave. |

### Opgaverne (spilles efter `hej` eller `i-gang`)
| fil | hun siger |
|---|---|
| `opgave-blomst` | Kan du plukke tre blomster til mig? Slå dem med hammeren. |
| `opgave-klap-faar` | Kan du give tre får et klap? Tryk på dem. De bor i forårslandet. |
| `opgave-rid-hest` | Kan du ride en tur på en hest? Tryk på en hest for at sætte dig op. |
| `opgave-taarn` | Kan du bygge et tårn, der er fem blokke højt? |
| `opgave-snemand` | Kan du bygge en snemand? To sneblokke og et græskar øverst! |
| `opgave-pingvin` | Kan du finde en pingvin? De bor i vinterlandet mod nord. |
| `opgave-bjerg` | Kan du klatre op på et højt bjerg — helt op, hvor sneen ligger? |
| `opgave-kiste` | Kan du finde en skattekiste? Der er en i hvert kæmpetræ og i krystalgrotterne i bjergene. |
| `opgave-tog` | Kan du køre en tur med toget? Trappen op til stationen er lige ved pladsen. |
| `opgave-ballon` | Kan du flyve en tur i luftballonen? Den står ved pladsen. |
| `opgave-landsby` | Kan du finde en landsby? Kig på kortet, når du går på opdagelse. |
| `opgave-graeskar` | Kan du finde tre græskar i efterårslandet mod øst? Slå dem med hammeren. |
| `opgave-dino` | Kan du finde en dinosaur? De bor i junglen langt mod syd. Pas på de hurtige! |
| `opgave-fyrvaerkeri` | Kan du tænde et fyrværkeri? Jeg har givet dig en fyrværkeri-kasse. Sæt den på jorden, og slå på den med hammeren! |
| `opgave-jordbaer` | Kan du plukke tre jordbær? De gror i sommerlandet mod syd. Slå dem med hammeren. |
| `opgave-is` | Kan du finde en isbod og hente en is? Isboderne står ved strandene i sommerlandet mod syd. Slå på isen med hammeren. |
| `opgave-pindsvin` | Kan du finde et pindsvin? Det tripper rundt i efterårsskoven mod øst. |
| `opgave-egern` | Kan du finde et egern? Det hopper rundt mellem de røde og gule træer mod øst. |

### De magiske sten (to klip efter hinanden: først hvor mange, så hvor den næste ligger)
| fil | hun siger |
|---|---|
| `sten-fundet-0` | Der findes seks magiske sten. |
| `sten-fundet-1` | Du har fundet én af de seks magiske sten! |
| `sten-fundet-2` | Du har fundet to af de seks magiske sten! |
| `sten-fundet-3` | Du har fundet tre af de seks magiske sten! |
| `sten-fundet-4` | Du har fundet fire af de seks magiske sten! |
| `sten-fundet-5` | Du har fundet fem af de seks magiske sten! |
| `sten-ild` | Ildstenen ligger i Underverdenen — ved lavaen. Vil du rejse derhen og finde den? |
| `sten-dino` | Dinostenen ligger i Dinodalen — ved vulkanen. Vil du rejse derhen og finde den? |
| `sten-stjerne` | Stjernestenen ligger i Fyrværkeri-verdenen — oppe ved tårnuret. Vil du rejse derhen og finde den? |
| `sten-atom` | Atomstenen ligger i NUKE-banen — ved den røde knap i bunkeren. Vil du rejse derhen og finde den? |
| `sten-hav` | Havstenen ligger i Havbunden — ved det sunkne skib. Vil du rejse derhen og finde den? |
| `sten-sky` | Skystenen ligger i Skyøerne — på den højeste ø. Vil du rejse derhen og finde den? |

### Når hun giver guld
| fil | hun siger |
|---|---|
| `guld-5` | Godt klaret! Du får fem guldmønter! |
| `guld-6` | Godt klaret! Du får seks guldmønter! |
| `guld-8` | Godt klaret! Du får otte guldmønter! |
| `guld-10` | Godt klaret! Du får ti guldmønter! |
| `guld-12` | Godt klaret! Du får tolv guldmønter! |
| `guld-15` | Godt klaret! Du får femten guldmønter! |

### Når opgaven er klaret, og barnet er langt væk
Barnet hører det, uanset hvor det er, som om hun ser det i sin krystalkugle.
Teksten er ny; Claude retter den i spillet ved integrationen.

| fil | hun siger |
|---|---|
| `klaret` | Godt klaret! Det kunne jeg se i min krystalkugle. Kom tilbage til mig, så får du dit guld. |

### I guldslottet (hun tager imod i slotsgården)
| fil | hun siger |
|---|---|
| `guldslot-foerste` | Velkommen til guldslottet! Du fandt alle seks sten. Du er helten fra den uendelige verden! Her er din krone! |
| `guldslot-igen` | Velkommen tilbage til guldslottet, helt! |

## Udtale, der skal tjekkes
Ord, som tekst-til-tale ofte siger forkert:
- græskar, jordbær, pindsvin, egern, kæmpetræ, krystalgrotterne
- fyrværkeri-kasse, Ildstenen, Dinodalen, tårnuret, Skyøerne, guldslottet, guldmønter
- **NUKE-banen** udtales "njuk-banen".

Siger stemmen et ord forkert, så skriv en lydret stavning i feltet `udtale` i `manus.json`.
Det er kun til stemmen. `tekst` forbliver den rigtige tekst.

## Filer og format
- **Placering:**
  - lydfilerne: `spil/broekraft/tale/spaadame/<fil>.mp3`
  - manuskriptet: `spil/broekraft/tale/spaadame/manus.json`
    ```json
    [{ "id": "hej", "tekst": "Hej med dig! …" }, { "id": "sten-atom", "tekst": "…", "udtale": "… njuk-banen …" }]
    ```
  - scriptet: `vaerktoej/lav-tale.mjs` i roden. Det laver klippene ud fra `manus.json` og skal kunne lave
    ét enkelt klip om (fx `--kun sten-atom`), så det ikke er nødvendigt at lave alt forfra.
  - Skriv øverst i scriptet en kort dansk vejledning: hvordan det køres, hvilken stemme og instruktion der
    bruges, og hvilken miljøvariabel nøglen ligger i.
- **Filnavne:** kun små bogstaver a–z, tal og bindestreg. Ingen æ/ø/å i filnavne.
  Det er en bevidst forskel fra koden, så adresserne virker overalt.
- **Lyd:**
  - MP3, mono, 64–96 kbit/s. Det skal kunne spilles i Safari på iPad.
  - Højst 0,15 sekund stilhed før og efter hvert klip, så klippene kan sættes sammen uden huller.
  - Alle klip skal være lige høje: normalisér til ca. −16 LUFS, med toppe under −1 dBFS og ingen
    forvrængning. Brug fx `ffmpeg loudnorm`.
  - Alle 41 klip tilsammen må fylde højst ca. 2 MB.
- Spillet henter aldrig noget fra nettet for at tale. Filerne er færdige og ligger i repoet.

## Kontrol
- Alle 41 filer findes, og navnene passer præcis til tabellerne og `manus.json`.
- Hvert klip skal køres tilbage gennem tale-til-tekst og sammenlignes med `tekst`.
  Ved afvigelser skal du rette udtalen og lave klippet om.
- Ved hvert klip skal du måle længde, lydstyrke og stilhed i starten og slutningen.
- Afspil `hej` + `opgave-blomst` og `sten-fundet-2` + `sten-ild` lige efter hinanden.
  Det skal lyde som én sammenhængende tale.

## Færdig når
- Ejeren har valgt stemme i trin 1, og alle 41 klip ligger på `codex/tale`.
- `manus.json` og `vaerktoej/lav-tale.mjs` er committet. Prøverne og nøglen er ikke.
- Du har skrevet noter nederst i denne fil til Claude:
  - stemme og instruktion
  - ord der fik ny udtale
  - eventuelle klip, der stadig lyder lidt skævt


## Noter fra Codex, 3. oktober 2026

Trin 1 er forberedt på grenen `codex/tale` i `C:/Users/Frede/.codex/worktrees/tale/boernespil`.

- `manus.json` indeholder præcis de 41 id/tekst-par fra tabellerne. `sten-atom` har særskilt udtale med `njuk-banen`.
- A er `coral` som varm bedstemor, B er `marin` som blød eventyrfortæller, C er `sage` som diskret hemmelighedsfuld bedstemor. De faktiske stemmer er endnu ikke hørt eller godkendt.
- `vaerktoej/lav-tale.mjs --proever --plan` planlægger ni klip: hej, opgave-snemand og guld-10 med hver stemme. Planen foretager ingen API-kald.
- Lydværktøj, normalisering, kanttrimning og tekstkontrol er implementeret. Otte lokale tests består; FFmpeg-prøven bevarer pauser inde i klippet og giver ca. -16 LUFS samt 0,04 s kantstilhed.
- API-nøgle er ikke tilgængelig i miljøet. Der er ikke foretaget API-kald, oprettet konto eller købt kredit. Ejeren er spurgt om nøgle og forbrug til de ni prøver.
- Neural lyd, tilbageskrivning af de faktiske replikker og Safari-afspilning er derfor endnu ikke afprøvet. Der findes endnu ingen af de ni stemmeprøver eller de 41 færdige MP3-filer.
- Prøver og rå lyd er Git-ignoreret. Intet er committet eller pushet i denne opgave endnu, og Claudes afspilningsfiler er ikke ændret.
- Hele manuskriptet må først indspilles, når ejeren har valgt blandt A/B/C. Se `vaerktoej/TALE.md` for kørsel og versionsnoter.
